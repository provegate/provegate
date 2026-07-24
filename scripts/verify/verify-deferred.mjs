#!/usr/bin/env node
// verify:deferred — STATUS.md deferral policy (practice 06): every row has an owner and
// a due date; overdue fails; a row renews at most once; combined cap 15, warn at 12.
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { targetRoot, section, read, makeReporter } from './lib.mjs';

const CAP = 15;
const WARN_AT = 12;

const root = targetRoot();
const r = makeReporter('verify:deferred');
const statusPath = join(root, 'STATUS.md');

if (!existsSync(statusPath)) {
  r.fail('STATUS.md missing');
  r.done();
}

const body = section(read(statusPath), 'Deferrals');
if (body === null) {
  r.fail('STATUS.md: no ## Deferrals section');
  r.done();
}

const rows = body
  .split('\n')
  .filter((l) => /^\s*\|/.test(l) && !/^\s*\|[\s:-]*\|/.test(l)) // data rows only
  .map((l) =>
    l
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim()),
  )
  .filter((cells) => cells.length >= 5 && cells[0] !== 'Topic');

const today = new Date().toISOString().slice(0, 10);

for (const [topic, item, owner, due, renewals] of rows) {
  const label = `deferral '${topic}' (${item})`;
  if (!owner || /^<.*>$/.test(owner)) r.fail(`${label}: missing owner`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) {
    r.fail(`${label}: due date '${due}' is not YYYY-MM-DD`);
  } else if (due < today) {
    r.fail(`${label}: overdue since ${due} — convert to a work item or renew (once)`);
  }
  if (!/^\d+$/.test(renewals)) {
    r.fail(`${label}: renewals '${renewals}' is not an integer`);
  } else if (Number(renewals) > 1) {
    r.fail(`${label}: renewed ${renewals}× — a row renews ONCE, then becomes a work item`);
  }
}

if (rows.length > CAP) r.fail(`${rows.length} deferral rows exceed the cap of ${CAP}`);
else if (rows.length >= WARN_AT)
  r.note(`${rows.length}/${CAP} deferral rows — approaching the cap`);

console.log(`verify:deferred: ${rows.length} row(s) checked`);
r.done();
