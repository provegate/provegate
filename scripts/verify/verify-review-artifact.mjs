#!/usr/bin/env node
// verify:review-artifact — independent-review records are schema-valid (practice 01).
// Hard rule: Verdict pass REQUIRES Critical: 0. Verdict is strictly pass|fail.
import { basename, join } from 'node:path';
import { targetRoot, parseBlockquoteMeta, mdFiles, read, makeReporter } from './lib.mjs';

const root = targetRoot();
const r = makeReporter('verify:review-artifact');

const files = mdFiles(join(root, '_docs', 'reviews')).filter(
  (f) => basename(f).startsWith('review-') && !basename(f).includes('.template.'),
);

for (const f of files) {
  const meta = parseBlockquoteMeta(read(f));
  const item = meta['PRD'] ?? meta['Item'];
  if (!item) r.fail(`${f}: missing PRD/Item key`);
  if (!meta['Verdict']) {
    r.fail(`${f}: missing Verdict`);
  } else if (!/^(pass|fail)$/.test(meta['Verdict'])) {
    r.fail(`${f}: Verdict '${meta['Verdict']}' must be exactly pass|fail`);
  }
  if (!meta['Reviewer']) r.fail(`${f}: missing Reviewer`);
  if (!meta['Base SHA']) r.fail(`${f}: missing Base SHA`);
  const critical = meta['Critical'];
  if (critical === undefined || !/^\d+$/.test(critical)) {
    r.fail(`${f}: Critical must be a plain integer (got '${critical ?? 'missing'}')`);
  } else if (meta['Verdict'] === 'pass' && Number(critical) !== 0) {
    r.fail(`${f}: Verdict pass with Critical ${critical} — pass requires Critical: 0`);
  }
}

console.log(`verify:review-artifact: ${files.length} artifact(s) checked`);
r.done();
