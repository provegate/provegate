#!/usr/bin/env node
// verify:script-classes — the class ledger (PRD-026 FR-8, ADR-0004).
//
// Every verify-*.mjs under scripts/verify/ carries a class in
// script-classes.json, and the ledger is diffed against ADR-0004's
// Classification table so a decision record nobody compares against cannot
// drift from the ledger a gate enforces. The state a NEW duplicate lands in —
// a method-class entry whose script still exists — is red by definition, and
// method-pending expires on its reviewBy date (known-red-ledger-must-expire).
//
// Runs through the shared targetRoot() so fixtures can point it at a fixture
// tree; the live invocation audits this repository.
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { targetRoot, read, section, makeReporter } from './lib.mjs';

const root = targetRoot();
const r = makeReporter('verify:script-classes');

const ledgerPath = join(root, 'scripts', 'verify', 'script-classes.json');
const adrPath = join(root, '_brain', 'adr', 'ADR-0004-method-rule-vs-repo-rule.md');
const scriptsDir = join(root, 'scripts', 'verify');

if (!existsSync(ledgerPath)) {
  r.fail('scripts/verify/script-classes.json is missing — every verify script needs a class');
  r.done();
}

let ledger;
try {
  ledger = JSON.parse(read(ledgerPath));
} catch (error) {
  r.fail(`script-classes.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  r.done();
}

const CLASSES = new Set(['repo', 'method', 'method-pending']);
const KEYS = new Set(['class', 'owner', 'reviewBy', 'supersededBy']);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Shape is not calendar: 2099-99-99 matches the regex and is not a date. */
const isRealDate = (v) => {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};
const today = new Date().toISOString().slice(0, 10);

// ── schema, per entry ──
for (const [name, entry] of Object.entries(ledger)) {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    r.fail(`${name}: entry must be an object`);
    continue;
  }
  for (const key of Object.keys(entry)) {
    if (!KEYS.has(key)) r.fail(`${name}: unknown key '${key}'`);
  }
  const cls = entry.class;
  if (!CLASSES.has(cls)) {
    r.fail(`${name}: class must be repo | method | method-pending, not '${cls}'`);
    continue;
  }
  if (cls === 'method-pending') {
    if (typeof entry.owner !== 'string' || entry.owner.trim() === '') {
      r.fail(`${name}: method-pending requires an owner`);
    }
    if (typeof entry.reviewBy !== 'string' || !DATE.test(entry.reviewBy) || !isRealDate(entry.reviewBy)) {
      r.fail(`${name}: method-pending requires reviewBy as a real YYYY-MM-DD date`);
    } else if (entry.reviewBy < today) {
      r.fail(`${name}: method-pending expired on ${entry.reviewBy} — resolve it or re-decide with a new date`);
    }
  } else {
    if ('owner' in entry || 'reviewBy' in entry) {
      r.fail(`${name}: owner/reviewBy belong to method-pending only`);
    }
  }
  if (cls === 'method') {
    if (typeof entry.supersededBy !== 'string' || entry.supersededBy.trim() === '') {
      r.fail(`${name}: method requires supersededBy naming the CLI surface`);
    }
    // The state a new duplicate lands in: superseded, and still on disk.
    if (existsSync(join(scriptsDir, name))) {
      r.fail(`${name}: method-class script still exists — delete it, its replacement is ${entry.supersededBy ?? 'shipped'}`);
    }
  } else if ('supersededBy' in entry) {
    r.fail(`${name}: supersededBy belongs to method only`);
  }
}

// ── coverage: on-disk ↔ ledger ──
const onDisk = existsSync(scriptsDir)
  ? readdirSync(scriptsDir).filter(
      (f) => /^verify-.*\.mjs$/.test(f) && lstatSync(join(scriptsDir, f)).isFile(),
    )
  : [];
for (const f of onDisk) {
  if (!(f in ledger)) r.fail(`${f}: unclassified — add it to script-classes.json`);
}
for (const name of Object.keys(ledger)) {
  // EVERY entry naming a missing script is stale — method included: once the
  // duplicate is deleted its row is REMOVED, so the ledger shrinks with the
  // work. A method row is therefore red in both worlds (exists -> delete it;
  // gone -> remove the row), which is the point: it names the state a new
  // duplicate lands in, never a resting place.
  if (!onDisk.includes(name)) {
    r.fail(`${name}: ledger entry is stale — the script no longer exists, remove the row`);
  }
}

// ── the mechanical half: diff against ADR-0004's Classification table ──
if (!existsSync(adrPath)) {
  r.fail('_brain/adr/ADR-0004-method-rule-vs-repo-rule.md is missing — the ledger has no decision record to agree with');
} else {
  const body = section(read(adrPath), 'Classification');
  if (body === null) {
    r.fail('ADR-0004: no ## Classification section');
  } else {
    const rows = new Map();
    let parseOk = true;
    for (const line of body.split('\n')) {
      if (!/^\s*\|/.test(line) || /^\s*\|[\s:-]*\|/.test(line)) continue;
      const cells = line.split('|').map((c) => c.trim()).filter((c, i, a) => !(c === '' && (i === 0 || i === a.length - 1)));
      if (cells.length !== 2) {
        parseOk = false;
        break;
      }
      if (cells[0] === 'Script' && cells[1] === 'Class') continue; // header
      if (rows.has(cells[0])) {
        r.fail(`ADR-0004: ${cells[0]} classified twice — the table is contradictory`);
      }
      rows.set(cells[0], cells[1]);
    }
    if (!parseOk) {
      r.fail('ADR-0004: Classification table is not two columns — unparseable, cannot compare');
    } else {
      for (const [script, cls] of rows) {
        if (!(script in ledger)) r.fail(`ADR-0004 lists ${script}; the ledger does not`);
        else if (ledger[script].class !== cls) {
          r.fail(`${script}: ledger says ${ledger[script].class}, ADR-0004 says ${cls}`);
        }
      }
      for (const script of Object.keys(ledger)) {
        if (!rows.has(script)) r.fail(`the ledger lists ${script}; ADR-0004's table does not`);
      }
    }
  }
}

console.log(`verify:script-classes: ${Object.keys(ledger).length} entr(ies), ${onDisk.length} script(s) on disk`);
r.done();
