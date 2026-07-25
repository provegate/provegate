#!/usr/bin/env node
// verify:gates-wired — the wire-or-delete meta-gate, both directions:
//  1. every registered verify:* script in package.json is reachable from at least one
//     executing surface (CI workflows, git hooks, the verify:workflow bundle, or another
//     package.json script);
//  2. every scripts/verify/verify-*.mjs on disk is registered in package.json.
// Acknowledged exceptions live in gates-wired-exceptions.json — shrink-only.
import { join, basename } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';
import { targetRoot, read, makeReporter } from './lib.mjs';

const root = targetRoot();
const r = makeReporter('verify:gates-wired');

// A practices-pack install may land in a repo with no package.json yet — that is
// "nothing registered", not a crash; direction 2 then leans on the exceptions list
// until the adopter wires scripts per NEXT_STEPS.md.
const pkgPath = join(root, 'package.json');
const pkg = existsSync(pkgPath) ? JSON.parse(read(pkgPath)) : {};
const scripts = pkg.scripts ?? {};
const registered = Object.keys(scripts).filter((k) => k.startsWith('verify:'));

const exceptionsPath = join(root, 'scripts', 'verify', 'gates-wired-exceptions.json');
const exceptions = existsSync(exceptionsPath) ? JSON.parse(read(exceptionsPath)) : [];

// Executing surfaces: CI workflow run-steps, git hooks, the bundle's check list, and
// every OTHER package.json script body (e.g. ship:pre chaining verify:workflow).
const surfaces = [];
const wfDir = join(root, '.github', 'workflows');
if (existsSync(wfDir)) {
  for (const f of readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f))) {
    surfaces.push(
      read(join(wfDir, f))
        .split('\n')
        .filter((l) => !/^\s*#/.test(l))
        .join('\n'),
    );
  }
}
const hooksDir = join(root, '.githooks');
if (existsSync(hooksDir)) {
  for (const f of readdirSync(hooksDir)) surfaces.push(read(join(hooksDir, f)));
}
const bundlePath = join(root, 'scripts', 'verify', 'verify-workflow.mjs');
if (existsSync(bundlePath)) surfaces.push(read(bundlePath));
for (const [name, body] of Object.entries(scripts)) {
  if (!name.startsWith('verify:')) surfaces.push(body);
}
const surfaceText = surfaces.join('\n');

// Direction 1: registered → wired. A check counts as wired when its script name or its
// file basename appears in a surface.
for (const name of registered) {
  if (exceptions.includes(name)) continue;
  const file = basename((scripts[name].match(/scripts\/verify\/\S+\.mjs/) ?? [''])[0]);
  const wired = surfaceText.includes(name) || (file && surfaceText.includes(file));
  if (!wired)
    r.fail(
      `registered check '${name}' is not wired into any executing surface (CI, hooks, bundle, ship:pre) — wire it or delete it`,
    );
}

// Direction 2: on disk → registered.
const verifyDir = join(root, 'scripts', 'verify');
const onDisk = existsSync(verifyDir)
  ? readdirSync(verifyDir).filter((f) => /^verify-.*\.mjs$/.test(f))
  : [];
const registeredBodies = Object.values(scripts).join('\n');
for (const f of onDisk) {
  if (exceptions.includes(f)) continue;
  if (!registeredBodies.includes(f))
    r.fail(
      `script on disk '${f}' is not registered as a package.json gate — register it or delete it`,
    );
}

if (exceptions.length) r.note(`${exceptions.length} acknowledged exception(s) — shrink-only list`);
console.log(`verify:gates-wired: ${registered.length} registered, ${onDisk.length} on disk`);
r.done();
