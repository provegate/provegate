#!/usr/bin/env node
// derive-self-hosting-figures — the case study's self-hosting figures, derived
// from `_state/prds.json` (the ONLY figure source) and projected into the doc's
// sentinel-delimited generated region (PRD-037).
//
// Canonical invocation matrix (PRD-037 FR-2): exactly one mode flag.
//   (none)/invalid/combined -> usage to stderr, exit 2, NOTHING read
//   --print  -> generated content (sentinels excluded) to stdout, exit 0
//   --write  -> replaces the bytes strictly between the sentinel pair, exit 0
//   --check  -> byte-compares the committed region, exit 1 naming the first
//               differing line
// Sentinel validation is identical in the three flagged modes: a missing
// sentinel, a duplicate of either, or an inverted order exits 1 naming the rule.
// Figures recompute on every invocation — no stored number exists to go stale;
// the committed region is a byte-checked PROJECTION of this output.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATE_PATH =
  process.env.DERIVE_FIGURES_STATE ?? join(ROOT, '_state', 'prds.json');
const DOC_PATH =
  process.env.DERIVE_FIGURES_DOC ??
  join(ROOT, 'apps', 'docs', 'content', 'docs', 'case-study.mdx');

const START = '{/* self-hosting-figures:start */}';
const END = '{/* self-hosting-figures:end */}';
const HEADING_TOKEN = "## Part two: the tool's own ledger [#self-hosting-ledger]";
// Known close modes, emitted in this fixed order; everything else aggregates
// under `unclassified` as a SUCCESS diagnostic — never folded into a known mode.
const KNOWN_MODES = ['operator-gated', 'eligible'];

/** Consumed-state schema: root object with a records array; each record needs
 * string `prd` and `status`. The first violation BY ARRAY INDEX is the error. */
export function deriveFigures(state) {
  if (state === null || typeof state !== 'object' || !Array.isArray(state.records)) {
    throw new Error('state: root must be an object whose `records` is an array');
  }
  state.records.forEach((r, i) => {
    if (r === null || typeof r !== 'object' || typeof r.prd !== 'string') {
      throw new Error(`state: record at index ${i} lacks a string \`prd\``);
    }
    if (typeof r.status !== 'string') {
      throw new Error(`state: record at index ${i} lacks a string \`status\``);
    }
  });
  const shipVerified = state.records.filter((r) => r.status === 'Ship Verified');
  const closeModes = {};
  for (const m of KNOWN_MODES) closeModes[m] = 0;
  const unclassifiedIds = [];
  for (const r of shipVerified) {
    const m = r.autonomousClose;
    if (typeof m === 'string' && KNOWN_MODES.includes(m)) closeModes[m]++;
    else unclassifiedIds.push(r.prd);
  }
  unclassifiedIds.sort();
  return {
    shipVerified: shipVerified.length,
    closeModes,
    unclassified: { count: unclassifiedIds.length, ids: unclassifiedIds },
  };
}

/** The generated region content — sentinels excluded; they belong to the doc. */
export function renderRegion(figures) {
  const lines = [
    '',
    '```json',
    JSON.stringify(figures, null, 2),
    '```',
    '',
    '| Figure | Value |',
    '| ------ | ----- |',
    `| PRDs Ship Verified | ${figures.shipVerified} |`,
    ...KNOWN_MODES.map((m) => `| Closes: ${m} | ${figures.closeModes[m]} |`),
    `| Closes: unclassified (listed) | ${figures.unclassified.count}${
      figures.unclassified.count ? ` — ${figures.unclassified.ids.join(', ')}` : ''
    } |`,
    '',
  ];
  return lines.join('\n');
}

/** Locate the single ordered sentinel pair, or throw naming the broken rule. */
export function extractRegion(doc) {
  const starts = [...doc.matchAll(new RegExp(START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))];
  const ends = [...doc.matchAll(new RegExp(END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))];
  if (starts.length === 0 || ends.length === 0) {
    throw new Error('sentinel: missing — the doc must carry exactly one start and one end marker');
  }
  if (starts.length > 1 || ends.length > 1) {
    throw new Error('sentinel: duplicate — exactly one of each marker is allowed');
  }
  const s = starts[0].index + START.length;
  const e = ends[0].index;
  if (e < s) throw new Error('sentinel: inverted order — start must precede end');
  return { before: doc.slice(0, s), content: doc.slice(s, e), after: doc.slice(e) };
}

/** The heading source token, asserted against MDX source — never a build. */
export function hasHeadingToken(doc) {
  return doc.includes(HEADING_TOKEN);
}

/** FR-2's one no-digit predicate: within the `self-hosting-ledger` H2 span
 * (heading to next `## ` or EOF), any `[0-9]` OUTSIDE the sentinel pair fails. */
export function spanDigitViolations(doc) {
  const h = doc.indexOf(HEADING_TOKEN);
  if (h < 0) return [];
  const afterHeading = h + HEADING_TOKEN.length;
  const next = doc.indexOf('\n## ', afterHeading);
  const span = doc.slice(afterHeading, next < 0 ? doc.length : next);
  const rs = span.indexOf(START);
  const re = span.indexOf(END);
  const outside =
    rs >= 0 && re > rs ? span.slice(0, rs) + span.slice(re + END.length) : span;
  return outside
    .split('\n')
    .filter((line) => /[0-9]/.test(line))
    .map((line) => `digit outside the sentinel pair: "${line.trim()}"`);
}

function firstDifferingLine(a, b) {
  const as = a.split('\n');
  const bs = b.split('\n');
  const n = Math.max(as.length, bs.length);
  for (let i = 0; i < n; i++) {
    if (as[i] !== bs[i]) {
      return `line ${i + 1}: committed ${JSON.stringify(as[i] ?? '<absent>')} != fresh ${JSON.stringify(bs[i] ?? '<absent>')}`;
    }
  }
  return null;
}

function main() {
  const args = process.argv.slice(2);
  const MODES = ['--print', '--write', '--check'];
  const picked = args.filter((a) => MODES.includes(a));
  const unknown = args.filter((a) => !MODES.includes(a));
  if (picked.length !== 1 || unknown.length > 0) {
    process.stderr.write(
      'usage: derive-self-hosting-figures.mjs --print | --write | --check\n' +
        '  exactly one mode flag; default reads nothing and exits 2\n',
    );
    process.exit(2);
  }
  const mode = picked[0];

  if (!existsSync(STATE_PATH)) {
    process.stderr.write(`state file absent: ${STATE_PATH}\n`);
    process.exit(1);
  }
  let state;
  try {
    state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch (e) {
    process.stderr.write(`state file unparseable: ${STATE_PATH}: ${e.message}\n`);
    process.exit(1);
  }
  let figures;
  try {
    figures = deriveFigures(state);
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
  const fresh = renderRegion(figures);

  let doc;
  try {
    doc = readFileSync(DOC_PATH, 'utf8');
  } catch (e) {
    process.stderr.write(`doc unreadable: ${DOC_PATH}: ${e.message}\n`);
    process.exit(1);
  }
  let region;
  try {
    region = extractRegion(doc);
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }

  if (mode === '--print') {
    process.stdout.write(fresh);
    process.exit(0);
  }
  if (mode === '--write') {
    writeFileSync(DOC_PATH, region.before + fresh + region.after);
    process.exit(0);
  }
  // --check
  const diff = firstDifferingLine(region.content, fresh);
  if (diff !== null) {
    process.stderr.write(`region drift — ${diff}\n`);
    process.exit(1);
  }
  process.exit(0);
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) main();
