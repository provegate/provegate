#!/usr/bin/env node
// verify:prompts-mutation — the reconciliation's BITE, executed (PRD-032 FR-3).
// `verify:prompts` proving the committed store equals a fresh render is the
// agreement half; this probe proves the check actually REFUSES a drifted
// store: plant one byte on a BANNERED planned path, run the shipped
// reconciliation, assert a non-zero exit whose report names exactly that path
// as `modified` (bannered + same installed version IS the modified arm — the
// two unbannered members would classify `unattributable`, the wrong target),
// restore in a `finally` on every path, and assert the tree clean again.
//
// A Phase-5 evidence probe, not a standing invariant: it stays OUT of the
// verify:workflow CHECKS bundle and is carried by a justified shrink-only
// wiringExceptions entry in gates.manifest.json (PRD-032 FR-9). NOT a package
// test: the store sits outside the package's turbo inputs, and a cached green
// would replay while the store drifts (turbo-cache-masks-out-of-input-reads).
// Repo-class per ADR-0004: reads and temporarily perturbs repo state, never
// ships. The plant-and-restore is the PRD's sanctioned exception to the
// no-hand-edit rule — restoration is unconditional.
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { targetRoot, makeReporter } from './lib.mjs';

const root = targetRoot();
const r = makeReporter('verify:prompts-mutation');

const TARGET = '.provegate/prompts/phase-3-task-generator.md';

const gitStatus = () =>
  execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();

const reconcile = () => {
  try {
    const stdout = execFileSync('node', ['scripts/verify/verify-prompts.mjs', root], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output: stdout };
  } catch (error) {
    const e = /** @type {{ status?: number, stdout?: string, stderr?: string }} */ (error);
    return { status: e.status ?? 1, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

if (gitStatus() !== '') {
  r.fail('refusing on a dirty tree — the probe plants and restores a byte and must prove the tree clean after');
  r.done();
}

const path = join(root, TARGET);
const before = readFileSync(path);
let planted = false;
try {
  appendFileSync(path, '\n');
  planted = true;
  const { status, output } = reconcile();
  if (status === 0)
    r.fail('the reconciliation exited 0 over a planted edit — the check has no bite');
  // the TARGET's own finding line must say `modified` — a summary line's
  // "0 modified" or a stale/unattributable classification must NOT pass
  // (review round-1 High)
  const targetLines = output.split('\n').filter((l) => l.includes(TARGET));
  const asModified = targetLines.some((l) => l.includes('modified'));
  const asOtherKind = targetLines.some((l) => /stale|unattributable|missing/.test(l));
  if (targetLines.length === 0 || !asModified || asOtherKind)
    r.fail(
      `the failing report does not classify ${TARGET} as modified on its own finding line — target lines: ${JSON.stringify(targetLines).slice(0, 300)}`,
    );
} finally {
  if (planted) writeFileSync(path, before);
}
if (gitStatus() !== '') r.fail('the tree is not clean after restoration');
else console.log('verify:prompts-mutation: planted byte named modified, restored, tree clean');
r.done();
