#!/usr/bin/env node
// verify:prompts — repo wiring for the prompt-store reconciliation (PRD-034 FR-4).
//
// This repository does not install its own package, so unlike the packed twin
// (which imports `provegate`) this script executes the BUILT CLI — which means
// it must run AFTER `pnpm --filter provegate build`. The hygiene job's order is
// asserted mechanically by the `--assert-ci-order` mode below, because the §11
// command grammar rightly refuses inline comparison operators. Runs outside
// turbo (turbo-cache-masks-out-of-input-reads): it reads generated files and
// ci.yml, none of which are package inputs.
//
// Until PRD-032 flips this repository's `prompts.enabled`, the check reports
// the disabled note and passes — dormant here, live at fresh installs.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { targetRoot } from './lib.mjs';

const root = targetRoot();

if (process.argv.includes('--assert-ci-order')) {
  const ciPath = join(root, '.github/workflows/ci.yml');
  if (!existsSync(ciPath)) {
    console.error('verify:prompts: FAIL — .github/workflows/ci.yml not found');
    process.exit(1);
  }
  const lines = readFileSync(ciPath, 'utf8').split('\n');
  // Isolate the hygiene JOB's own step list — from its job key to the next
  // job key at the same indent. Never a whole-file index search, which a
  // build step in a DIFFERENT job would satisfy.
  const start = lines.findIndex((l) => /^ {2}workflow-hygiene:\s*$/.test(l));
  if (start === -1) {
    console.error('verify:prompts: FAIL — no workflow-hygiene job in ci.yml');
    process.exit(1);
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^ {2}[A-Za-z0-9_-]+:\s*$/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const job = lines.slice(start, end);
  // EXACT step-level run lines, indentation included. Substring presence is
  // not execution (comments, echo-wrapped and compound forms must fail), and
  // trimming would also admit a literal `run: <cmd>` line INSIDE a `run: |`
  // block scalar — step runs sit at exactly 8 spaces in this workflow, block
  // content deeper. Anything else fails to match and the gate goes loud.
  const isStepRun = (l, cmd) => l === `        run: ${cmd}`;
  const buildAt = job.findIndex((l) => isStepRun(l, 'pnpm --filter provegate build'));
  const aggregateAt = job.findIndex((l) => isStepRun(l, 'pnpm verify:workflow'));
  if (aggregateAt === -1) {
    console.error('verify:prompts: FAIL — the hygiene job has no verify:workflow step');
    process.exit(1);
  }
  // STRICTLY earlier: equal indexes mean both commands share one run: line,
  // where line order proves nothing about execution order (`run: pnpm
  // verify:workflow; pnpm --filter provegate build` would pass a >= check
  // while running the aggregate first).
  if (buildAt === -1 || buildAt >= aggregateAt) {
    console.error(
      'verify:prompts: FAIL — the hygiene job must run `pnpm --filter provegate build` as its own step strictly before the verify:workflow aggregate step (this bundle executes the built CLI)',
    );
    process.exit(1);
  }
  console.log('verify:prompts: PASS — the hygiene job builds the CLI before its aggregate step');
  process.exit(0);
}

const cli = join(root, 'packages/provegate/dist/cli.js');
if (!existsSync(cli)) {
  console.error(
    'verify:prompts: FAIL — packages/provegate/dist/cli.js is missing; run `pnpm --filter provegate build` first',
  );
  process.exit(1);
}
const res = spawnSync('node', [cli, 'check', '--prompts'], { cwd: root, stdio: 'inherit' });
process.exit(res.status ?? 1);
