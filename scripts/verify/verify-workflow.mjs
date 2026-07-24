#!/usr/bin/env node
// verify:workflow — the aggregate local gate bundle (wiring surface #1) with the
// known-red ledger, pattern P4: an acknowledged red is downgraded to a report; a ledger
// entry that is stale (check now passes), unknown, or malformed FAILS the run — the
// pressure valve stays temporary by construction.
// Canonical check list. dependency-audit is CI-only (registry access), not listed here.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { targetRoot, read } from './lib.mjs';

const SELF_DIR = dirname(fileURLToPath(import.meta.url));

const CHECKS = [
  'verify-brain.mjs',
  'verify-review-artifact.mjs',
  'verify-durable-artifacts.mjs',
  'verify-deferred.mjs',
  'verify-test-task-coverage.mjs',
  'verify-gates-wired.mjs',
];

const root = targetRoot();
const ledgerPath = join(root, '_state', 'known-red-verifies.json');

// Validate the ledger BEFORE running checks — a malformed valve is itself a failure.
let ledger = [];
if (existsSync(ledgerPath)) {
  let parsed;
  try {
    parsed = JSON.parse(read(ledgerPath));
  } catch {
    console.error('verify:workflow: FAIL — known-red ledger is not valid JSON');
    process.exit(1);
  }
  ledger = parsed.entries ?? null;
  if (!Array.isArray(ledger)) {
    console.error('verify:workflow: FAIL — ledger must have an entries[] array');
    process.exit(1);
  }
  for (const e of ledger) {
    if (!e.check || !e.reason || !/^\d{4}-\d{2}-\d{2}$/.test(e.added ?? '')) {
      console.error(
        `verify:workflow: FAIL — malformed ledger entry ${JSON.stringify(e)} (need check, reason, added YYYY-MM-DD)`,
      );
      process.exit(1);
    }
    if (!CHECKS.includes(e.check)) {
      console.error(`verify:workflow: FAIL — ledger names unknown check '${e.check}'`);
      process.exit(1);
    }
  }
}

const acknowledged = new Set(ledger.map((e) => e.check));
let hardFailures = 0;
let staleEntries = 0;

for (const check of CHECKS) {
  const res = spawnSync('node', [join(SELF_DIR, check), root], {
    stdio: 'inherit',
  });
  const failed = res.status !== 0;
  if (failed && acknowledged.has(check)) {
    console.log(`verify:workflow: '${check}' RED but acknowledged in the ledger (temporary)`);
  } else if (failed) {
    hardFailures++;
  } else if (acknowledged.has(check)) {
    console.error(
      `verify:workflow: FAIL — ledger entry for '${check}' is STALE (the check passes) — remove it`,
    );
    staleEntries++;
  }
}

if (hardFailures || staleEntries) {
  console.error(
    `verify:workflow: FAIL — ${hardFailures} check failure(s), ${staleEntries} stale ledger entry(ies)`,
  );
  process.exit(1);
}
console.log('verify:workflow: PASS');
