#!/usr/bin/env node
// route-guard-coverage — example domain gate (zero dependencies).
//
// Pattern: every route/controller file must have a matching guard test that
// exercises the DENY path. The gate fails naming each unguarded route file.
//
// Usage: node examples/route-guard-coverage/check.mjs [rootDir]
//   Configure the two patterns below for your layout, wire the command into
//   gates.manifest.json (see README.md next to this file).
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '.');

// ── Adapt these two to your project ─────────────────────────────────────────
const ROUTES_DIR = 'src/routes'; // where route/controller files live
const routeFile = (name) => /\.(route|controller)\.(ts|js|mjs)$/.test(name);
const guardTestFor = (routePath) =>
  routePath.replace(/\.(route|controller)\.(ts|js|mjs)$/, '.guard.test.$2');
// ────────────────────────────────────────────────────────────────────────────

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (routeFile(entry)) out.push(full);
  }
  return out;
}

const routes = walk(join(root, ROUTES_DIR));
const unguarded = routes.filter((route) => !existsSync(guardTestFor(route)));

if (unguarded.length > 0) {
  console.error('[route-guard-coverage] routes without a deny-path guard test:');
  for (const route of unguarded) console.error(`  - ${route}`);
  process.exit(1);
}
console.log(`[route-guard-coverage] ok - ${routes.length} route file(s), all guarded`);
