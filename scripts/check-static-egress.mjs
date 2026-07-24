#!/usr/bin/env node
/**
 * check-static-egress — fail if a built web app would FETCH a resource from a
 * third-party origin. "No telemetry" is a product principle, so provegate.dev
 * must make zero external requests. Zero dependencies.
 *
 * It detects the SHAPES that actually fetch — not merely the presence of a URL,
 * because framework bundles legitimately contain doc-URL strings (nextjs.org,
 * react.dev, spec links) in error messages that never fetch anything. Flagging
 * every external host would false-positive on those; flagging only a denylist
 * would miss a real `<script src>` / `fetch()` (the FR-7 gap that failed review).
 * So we flag external-origin references in these fetch contexts:
 *   - HTML: <script src>, <link href> (link elements fetch), <img/iframe/source/
 *     audio/video/embed/track/object src|data>
 *   - CSS:  url(...), @import ...
 *   - JS:   fetch()/sendBeacon()/EventSource()/WebSocket()/importScripts()/
 *           XMLHttpRequest.open() and .src=/.href= assignments to a URL literal,
 *           plus any embedded HTML fetch-shape (RSC payloads inline HTML)
 *
 * "External origin" = an absolute `<scheme>://<host>` (any scheme — http(s),
 * ws(s), …) whose host is not our own, or a protocol-relative `//<host>`. Our own
 * origin and plain `<a href>` navigation are NOT fetches and are allowed.
 *
 * Blind spot (stated): a URL assembled at RUNTIME from fragments cannot be seen.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOTS = ['apps/web/.next', 'apps/docs/.next'].filter((d) => existsSync(d));
const OWN_HOSTS = new Set(['provegate.dev', 'www.provegate.dev', 'localhost']);

/** True if `url` (an absolute or protocol-relative URL) is off our origin. */
function isExternal(url) {
  const m = /^(?:[a-z][a-z0-9+.-]*:)?\/\/([a-z0-9.-]+)/i.exec(url);
  if (!m) return false;
  return !OWN_HOSTS.has(m[1].toLowerCase());
}

/** A URL literal (`<scheme>://host`, e.g. https/wss, or protocol-relative `//host`). */
const URL_RE = String.raw`((?:[a-z][a-z0-9+.-]*:)?\/\/[a-z0-9.-]+[^\s"'\`)]*)`;

function scanHtml(text) {
  const hits = [];
  // fetch-shaped element attributes: <script src>, <link href>, media src/data
  const patterns = [
    new RegExp(`<script[^>]*\\ssrc=["']${URL_RE}`, 'gi'),
    new RegExp(`<link[^>]*\\shref=["']${URL_RE}`, 'gi'),
    new RegExp(`<(?:img|iframe|source|audio|video|embed|track|object)[^>]*\\s(?:src|data)=["']${URL_RE}`, 'gi'),
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) if (isExternal(m[1])) hits.push(m[1]);
  }
  return hits;
}

function scanCss(text) {
  const hits = [];
  for (const m of text.matchAll(new RegExp(`url\\(\\s*["']?${URL_RE}`, 'gi'))) {
    if (isExternal(m[1])) hits.push(m[1]);
  }
  for (const m of text.matchAll(new RegExp(`@import\\s+(?:url\\()?["']?${URL_RE}`, 'gi'))) {
    if (isExternal(m[1])) hits.push(m[1]);
  }
  return hits;
}

function scanJs(text) {
  const hits = [];
  const api = String.raw`(?:fetch|sendBeacon|importScripts|EventSource|WebSocket|open)\s*\(\s*(?:["'\`][A-Z]+["'\`]\s*,\s*)?["'\`]`;
  const patterns = [
    new RegExp(`${api}${URL_RE}`, 'gi'),
    new RegExp(`\\.(?:src|href)\\s*=\\s*["'\\\`]${URL_RE}`, 'gi'),
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) if (isExternal(m[1])) hits.push(m[1]);
  }
  // RSC/SSR payloads inline HTML as strings — catch embedded fetch-shapes too.
  return hits.concat(scanHtml(text));
}

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
    if (!['.css', '.js', '.mjs', '.html', '.json'].includes(ext)) continue;
    const text = readFileSync(file, 'utf8');
    const hits =
      ext === '.css' ? scanCss(text) : ext === '.html' ? scanHtml(text) : scanJs(text);
    for (const h of hits) violations.push(`${file}: third-party fetch → ${h}`);
  }
}

if (ROOTS.length === 0) {
  console.error('[egress] no built output found — run `pnpm build` first');
  process.exit(1);
}
if (violations.length > 0) {
  console.error('[egress] third-party fetches found in the build output:');
  for (const v of [...new Set(violations)]) console.error(`  ✗ ${v}`);
  process.exit(1);
}
console.log(`[egress] clean — no third-party fetch shape in ${ROOTS.join(', ')}`);
