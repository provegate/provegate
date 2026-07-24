#!/usr/bin/env node
// verify:test-task-coverage — a buildable workspace package with no REAL test task is
// silently skipped by `pnpm test` (green while never tested). Closes the
// --passWithNoTests / `|| true` / echo-stub escape hatches too.
// Allowlist (test-task-allowlist.json) is shrink-only: current offenders may stay
// listed, no new package may be added without removing an older entry's cause.
import { join } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';
import { targetRoot, read, makeReporter } from './lib.mjs';

const root = targetRoot();
const r = makeReporter('verify:test-task-coverage');

const allowlistPath = join(root, 'scripts', 'verify', 'test-task-allowlist.json');
const allowlist = existsSync(allowlistPath) ? JSON.parse(read(allowlistPath)) : [];

const FAKE = /--passWithNoTests|\|\|\s*true|^echo\b|^true$|^:\s*$/;

// Workspace globs are `packages/*` and `apps/*` (pnpm-workspace.yaml).
const dirs = ['packages', 'apps']
  .filter((d) => existsSync(join(root, d)))
  .flatMap((d) => readdirSync(join(root, d)).map((p) => `${d}/${p}`))
  .filter((p) => existsSync(join(root, p, 'package.json')));

let checked = 0;
for (const dir of dirs) {
  const pkg = JSON.parse(read(join(root, dir, 'package.json')));
  if (!pkg.scripts?.build) continue; // not buildable — out of scope
  checked++;
  if (allowlist.includes(dir)) {
    r.note(`${dir}: allowlisted without a test task (shrink-only debt)`);
    continue;
  }
  const test = pkg.scripts?.test;
  if (!test)
    r.fail(`${dir}: buildable package declares no test task — pnpm test silently skips it`);
  else if (FAKE.test(test)) r.fail(`${dir}: test task '${test}' is a no-op escape hatch`);
}

console.log(`verify:test-task-coverage: ${checked} buildable package(s) checked`);
r.done();
