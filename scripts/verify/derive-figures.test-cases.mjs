#!/usr/bin/env node
// Fixture harness for scripts/derive-self-hosting-figures.mjs (PRD-037 FR-1/FR-2/FR-4).
// Runs the script as a CHILD for mode/exit behavior (production shape) and imports its
// pure helpers for span/region predicates — one implementation, tested both ways.
// Red-first: this file was written before the script and failed on import.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, '..', 'derive-self-hosting-figures.mjs');
const { extractRegion, spanDigitViolations, hasHeadingToken, deriveFigures } =
  await import(SCRIPT);

let failures = 0;
const ok = (cond, name, detail = '') => {
  if (cond) console.log(`ok — ${name}`);
  else { failures++; console.error(`FAIL — ${name}${detail ? `: ${detail}` : ''}`); }
};

const tmp = mkdtempSync(join(tmpdir(), 'derive-figures-'));
const stateAt = (obj) => {
  const p = join(tmp, `state-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(p, JSON.stringify(obj));
  return p;
};
const mdxAt = (content) => {
  const p = join(tmp, `doc-${Math.random().toString(36).slice(2)}.mdx`);
  writeFileSync(p, content);
  return p;
};
const run = (args, env = {}) =>
  spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });

const REGION = (inner) =>
  `# Case study\n\nintro prose\n\n## Part two: the tool's own ledger [#self-hosting-ledger]\n\nprose without numerals\n\n{/* self-hosting-figures:start */}\n${inner}{/* self-hosting-figures:end */}\n\nclosing prose\n\n## Next heading\n\nafter 123\n`;

// ---------- figure derivation (pure) ----------
const GOOD_STATE = {
  records: [
    { prd: 'PRD-001', status: 'Ship Verified', autonomousClose: 'operator-gated' },
    { prd: 'PRD-002', status: 'Ship Verified', autonomousClose: 'eligible' },
    { prd: 'PRD-003', status: 'Superseded', autonomousClose: 'operator-gated' },
    { prd: 'PRD-004', status: 'Draft', autonomousClose: 'operator-gated' },
    { prd: 'PRD-005', status: 'Ship Verified', autonomousClose: 'weird-mode' },
    { prd: 'PRD-006', status: 'Ship Verified' },
  ],
};
{
  const f = deriveFigures(GOOD_STATE);
  ok(f.shipVerified === 4, 'shipVerified counts only Ship Verified (Superseded/Draft excluded)');
  ok(f.closeModes['operator-gated'] === 1 && f.closeModes.eligible === 1,
    'closeModes counts known values over Ship Verified records');
  ok(Object.keys(f.closeModes)[0] === 'operator-gated' && Object.keys(f.closeModes)[1] === 'eligible',
    'closeModes emits known values in fixed order');
  ok(f.unclassified.count === 2 &&
     JSON.stringify(f.unclassified.ids) === JSON.stringify(['PRD-005', 'PRD-006']),
    'unknown and missing autonomousClose aggregate as unclassified {count, ids} sorted — success, never folded');
}
{
  let threw = null;
  try { deriveFigures({ records: 'nope' }); } catch (e) { threw = e; }
  ok(threw && /records/.test(String(threw)), 'root without a records array fails naming the field');
  threw = null;
  try {
    deriveFigures({ records: [
      { prd: 'PRD-001', status: 'Ship Verified' },
      { prd: 'PRD-002' },
      { status: 'Draft' },
    ] });
  } catch (e) { threw = e; }
  ok(threw && /index 1/.test(String(threw)) && /status/.test(String(threw)),
    'first violation by array index names index and field', String(threw));
}

// ---------- invocation matrix (child) ----------
{
  const r = run([]);
  ok(r.status === 2 && r.stderr.includes('usage') && r.stdout === '',
    'no flag: usage to stderr, exit 2, nothing printed');
  const r2 = run(['--print', '--check']);
  ok(r2.status === 2 && r2.stderr.includes('usage'), 'combined flags: usage, exit 2');
  const r3 = run(['--frobnicate']);
  ok(r3.status === 2, 'invalid flag: exit 2');
  // nothing read: no flag with a nonexistent state path still exits 2 (not a state error)
  const r4 = run([], { DERIVE_FIGURES_STATE: join(tmp, 'absent.json') });
  ok(r4.status === 2, 'default mode reads nothing (absent state still exits 2)');
}
{
  const r = run(['--print'], {
    DERIVE_FIGURES_STATE: join(tmp, 'absent.json'),
    DERIVE_FIGURES_DOC: mdxAt(REGION('x\n')),
  });
  ok(r.status === 1 && r.stderr.includes('absent.json'),
    'absent state file: exit 1 naming the path');
}

// ---------- sentinels, all three flagged modes ----------
const goodState = stateAt(GOOD_STATE);
for (const mode of ['--print', '--write', '--check']) {
  const missing = run([mode], { DERIVE_FIGURES_STATE: goodState, DERIVE_FIGURES_DOC: mdxAt('# no region\n') });
  ok(missing.status === 1 && /sentinel/.test(missing.stderr), `${mode}: missing sentinel exits 1 naming the rule`);
  const dup = run([mode], {
    DERIVE_FIGURES_STATE: goodState,
    DERIVE_FIGURES_DOC: mdxAt(REGION('x\n') + '\n{/* self-hosting-figures:start */}\n'),
  });
  ok(dup.status === 1 && /duplicate/.test(dup.stderr), `${mode}: duplicate sentinel exits 1`);
  const inv = run([mode], {
    DERIVE_FIGURES_STATE: goodState,
    DERIVE_FIGURES_DOC: mdxAt('{/* self-hosting-figures:end */}\nx\n{/* self-hosting-figures:start */}\n'),
  });
  ok(inv.status === 1 && /invert|order/.test(inv.stderr), `${mode}: inverted sentinels exit 1`);
}

// ---------- print / write / check ----------
{
  const doc = mdxAt(REGION('stale\n'));
  const p = run(['--print'], { DERIVE_FIGURES_STATE: goodState, DERIVE_FIGURES_DOC: doc });
  ok(p.status === 0 && !p.stdout.includes('self-hosting-figures'),
    '--print exits 0, sentinels excluded from output');
  ok(p.stdout.includes('"shipVerified": 4'), '--print carries the derived JSON');

  const before = readFileSync(doc, 'utf8');
  const c1 = run(['--check'], { DERIVE_FIGURES_STATE: goodState, DERIVE_FIGURES_DOC: doc });
  ok(c1.status === 1 && /line/.test(c1.stderr), '--check on stale region exits 1 naming the first differing line');
  ok(readFileSync(doc, 'utf8') === before, '--check mutates nothing');

  const w = run(['--write'], { DERIVE_FIGURES_STATE: goodState, DERIVE_FIGURES_DOC: doc });
  ok(w.status === 0, '--write exits 0');
  const after = readFileSync(doc, 'utf8');
  ok(after.startsWith('# Case study\n\nintro prose\n') && after.includes('closing prose') && after.includes('after 123'),
    '--write preserves every byte outside the pair');
  const c2 = run(['--check'], { DERIVE_FIGURES_STATE: goodState, DERIVE_FIGURES_DOC: doc });
  ok(c2.status === 0, '--check green immediately after --write');
}

// ---------- span digit predicate + heading token (pure) ----------
{
  const clean = REGION('inner 42\n');
  ok(spanDigitViolations(clean).length === 0,
    'digits inside the pair are legal; prose outside the span (after 123) is legal');
  const dirty = clean.replace('prose without numerals', 'prose with 7 numerals');
  const v = spanDigitViolations(dirty);
  ok(v.length === 1 && /7/.test(v[0]), 'a digit in the H2 span outside the pair fails the predicate');
  ok(hasHeadingToken(clean) === true, 'the [#self-hosting-ledger] source token is asserted');
  ok(hasHeadingToken(clean.replace(' [#self-hosting-ledger]', '')) === false,
    'a missing heading token is detected');
  const fencedOnly = clean
    .replace("## Part two: the tool's own ledger [#self-hosting-ledger]", '## Part two renamed')
    .replace('closing prose', "closing prose\n\n```md\n## Part two: the tool's own ledger [#self-hosting-ledger]\n```");
  ok(hasHeadingToken(fencedOnly) === false,
    'a token that exists only inside a fenced block is NOT a heading (review round 1 P2)');
}

rmSync(tmp, { recursive: true, force: true });
if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('derive-figures test cases: PASS');
