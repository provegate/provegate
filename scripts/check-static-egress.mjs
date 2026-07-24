#!/usr/bin/env node
/**
 * check-static-egress — fail if a built web app would FETCH from a third-party
 * origin. "No telemetry" is a product principle, so provegate.dev must make zero
 * external requests. Zero dependencies.
 *
 * What it flags (a real fetch, not a link):
 *   - a CSS `url(http…)` or `@import` pointing off-origin (fonts, images)
 *   - any reference to a known font-CDN or analytics host, anywhere in the build
 *
 * What it does NOT flag: `<a href>` links or metadata URLs to our own origin or
 * to github.com — those are navigation, not resource fetches.
 *
 * Blind spot (stated, not implied complete): a URL assembled at RUNTIME (string
 * concatenation) cannot be seen by a static scan.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOTS = ['apps/web/.next', 'apps/docs/.next'].filter((d) => existsSync(d));

// Hosts that are always a third-party fetch if they appear at all.
const DENY_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'google-analytics.com',
  'googletagmanager.com',
  'www.google-analytics.com',
  'plausible.io',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === 'cache') continue; // build cache is not shipped
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const violations = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const ext = extname(file);
    if (!['.css', '.js', '.html', '.json'].includes(ext)) continue;
    const text = readFileSync(file, 'utf8');

    // 1. Any denylisted host anywhere is a fetch (font CDN / analytics).
    for (const host of DENY_HOSTS) {
      if (text.includes(host)) violations.push(`${file}: references ${host}`);
    }

    // 2. CSS fetches: a url(http…) or an @import with http in a shipped stylesheet.
    if (ext === '.css') {
      for (const m of text.matchAll(/url\(\s*['"]?(https?:\/\/[^)'"]+)/gi)) {
        violations.push(`${file}: CSS url() fetches ${m[1]}`);
      }
      for (const m of text.matchAll(/@import\s+(?:url\()?['"]?(https?:\/\/[^)'";]+)/gi)) {
        violations.push(`${file}: CSS @import fetches ${m[1]}`);
      }
    }
  }
}

if (ROOTS.length === 0) {
  console.error('[egress] no built output found — run `pnpm build` first');
  process.exit(1);
}
if (violations.length > 0) {
  console.error('[egress] third-party fetches found in the build output:');
  for (const v of violations) console.error(`  ✗ ${v}`);
  process.exit(1);
}
console.log(`[egress] clean — no third-party fetch in ${ROOTS.join(', ')}`);
