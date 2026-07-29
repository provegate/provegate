#!/usr/bin/env node
// verify:doc-claims — a governance document must not describe a SHIPPED check as
// future work.
//
// The failure this exists for is specific and was measured: `AGENT_BOOTSTRAP.md`
// and `_brain/PROTOCOL.md` carried "wave 2" next to script names that had
// already landed and were already running in CI. A reader — human or agent —
// then plans around a gap that does not exist, or trusts an absence that is not
// there. A documented rule with no implementation is a lie; so is an
// implemented rule the documentation calls unbuilt.
//
// The grammar is explicit rather than intentional, because "detect stale
// claims" is not a specification. A line fails when it carries BOTH:
//
//   1. a script token — `verify:<name>` or `verify-<name>.mjs` — that is
//      actually wired as a `verify:*` key in the root `package.json`, and
//   2. a declared-future marker from the closed list below.
//
// Both halves matter. Without (1) a sentence about genuinely future work fails.
// Without (2) every mention of a script fails. The wiring lookup is what makes
// "shipped" mean something checkable rather than something the checker guesses.
//
// Excluded from the scan, deliberately:
//   - fenced code blocks — a snippet quoting a future plan is an example, and a
//     command line inside a fence is not a claim about the world;
//   - `STATUS.md`'s "Recent activity" section — it is a dated historical record,
//     and a log entry that said "wave 2" on the day it was written stays true as
//     history. Rewriting history to satisfy a linter is the wrong direction.
//
// `doc-claims-allowlist.json` carries genuinely-future claims as
// `{file, claim, reason, reviewBy}`. It is SHRINK-ONLY: an entry that matches no
// line, or whose `reviewBy` has passed, fails. That rule is the
// known-red-ledger lesson — an allowlist nobody is forced to revisit becomes a
// permanent bypass, and the entries that matter most are the ones everyone has
// stopped seeing.
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { targetRoot, read, makeReporter } from './lib.mjs';

const root = targetRoot();
const r = makeReporter('verify:doc-claims');

// PRD-037: the case study's self-hosting region is a byte-checked projection of
// `derive-self-hosting-figures.mjs` — a drifted figure fails here, naming the
// first differing line; and the H2 span carries no digit outside the region.
{
  const script = join(root, 'scripts', 'derive-self-hosting-figures.mjs');
  const doc = join(root, 'apps', 'docs', 'content', 'docs', 'case-study.mdx');
  // Scoped to roots that HAVE the feature: a fixture or adopter root with neither
  // file carries no self-hosting claim, so there is nothing to fail. Exactly one
  // of the pair present IS a broken contract and fails loudly.
  if (!existsSync(script) && !existsSync(doc)) {
    // no claim in this root
  } else if (!existsSync(script) || !existsSync(doc)) {
    r.fail('self-hosting figures: script and case-study.mdx must exist together — the region contract is broken');
  } else {
    try {
      execFileSync(process.execPath, [script, '--check'], { stdio: 'pipe' });
    } catch (error) {
      r.fail(`self-hosting figures drifted: ${String(error.stderr ?? error.message).trim()}`);
    }
    const mod = await import(script);
    const docText = read(doc);
    if (!mod.hasHeadingToken(docText)) {
      r.fail('self-hosting figures: the [#self-hosting-ledger] heading token is missing from the MDX source');
    }
    for (const v of mod.spanDigitViolations(docText)) {
      r.fail(`self-hosting section: ${v}`);
    }
  }
}

/** The governance set: the documents that describe how this repository works,
 * plus the practices copies an adopter receives. A claim is only misleading
 * where someone reads it as instruction. */
const SCANNED = [
  'AGENT_BOOTSTRAP.md',
  'STATUS.md',
  '_brain/PROTOCOL.md',
  'packages/provegate/practices/brain/PROTOCOL.md',
  'packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md',
  'packages/provegate/practices/templates/STATUS.template.md',
];

/** Closed list. Adding to it is a deliberate act, not a regex that grows to
 * catch whatever the last false negative looked like. */
const FUTURE_MARKERS = [
  'wave 2',
  'wave-2',
  'lands in',
  'will land',
  'future work',
  'stub now',
  'specify later',
  'not yet',
];

const pkgPath = join(root, 'package.json');
if (!existsSync(pkgPath)) {
  r.fail('package.json missing — cannot tell a shipped script from a planned one');
  r.done();
}
/** Every `verify:*` script the repository actually runs. This is what makes
 * "shipped" checkable: a token naming a key that exists here is a claim about
 * something that already works. */
const wired = new Set(
  Object.keys(JSON.parse(read(pkgPath)).scripts ?? {}).filter((k) => k.startsWith('verify:')),
);

/** Script tokens on a line, normalised to the `verify:<name>` form so
 * `verify-brain.mjs` and `verify:brain` are recognised as the same claim. */
function scriptTokens(line) {
  const tokens = new Set();
  for (const m of line.matchAll(/verify:([a-z0-9-]+)/g)) tokens.add(`verify:${m[1]}`);
  for (const m of line.matchAll(/verify-([a-z0-9-]+)\.mjs/g)) tokens.add(`verify:${m[1]}`);
  return [...tokens];
}

/** Lines to judge: outside fenced blocks, and outside STATUS.md's dated log. */
function judgeableLines(rel, content) {
  const out = [];
  let fenced = false;
  let inHistory = false;
  content.split('\n').forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    if (rel === 'STATUS.md' || rel.endsWith('STATUS.template.md')) {
      // The log runs to the end of the file, so entering it ends the scan.
      if (/^##\s+Recent activity/i.test(line)) inHistory = true;
      else if (/^##\s+/.test(line)) inHistory = false;
      if (inHistory) return;
    }
    out.push({ line, number: i + 1 });
  });
  return out;
}

const allowPath = join(root, 'scripts', 'verify', 'doc-claims-allowlist.json');
let allowlist = [];
if (existsSync(allowPath)) {
  try {
    allowlist = JSON.parse(read(allowPath));
  } catch (error) {
    r.fail(`doc-claims-allowlist.json is not valid JSON: ${error.message}`);
    r.done();
  }
}
if (!Array.isArray(allowlist)) {
  r.fail('doc-claims-allowlist.json must be an array of {file, claim, reason, reviewBy}');
  r.done();
}

const today = new Date().toISOString().slice(0, 10);
const matchedEntries = new Set();
let scanned = 0;

for (const rel of SCANNED) {
  const path = join(root, rel);
  // A named file that is absent is a finding, not a skip: the scanned set is
  // this checker's own claim about what it covers.
  if (!existsSync(path)) {
    r.fail(`${rel}: listed in the scanned set but missing`);
    continue;
  }
  scanned++;
  for (const { line, number } of judgeableLines(rel, read(path))) {
    const marker = FUTURE_MARKERS.find((m) => line.toLowerCase().includes(m));
    if (marker === undefined) continue;
    const shipped = scriptTokens(line).filter((t) => wired.has(t));
    if (shipped.length === 0) continue;

    const entry = allowlist.findIndex(
      (e) => e && e.file === rel && typeof e.claim === 'string' && line.includes(e.claim),
    );
    if (entry !== -1) {
      matchedEntries.add(entry);
      continue;
    }
    r.fail(
      `${rel}:${number} calls ${shipped.join(', ')} "${marker}" — it is wired and running. ` +
        `Correct the sentence, or add an allowlist entry with a reason and a reviewBy`,
    );
  }
}

// Shrink-only, both ways.
allowlist.forEach((entry, i) => {
  const label = `doc-claims-allowlist[${i}]`;
  if (!entry || typeof entry.file !== 'string' || typeof entry.claim !== 'string') {
    r.fail(`${label}: needs a file and a claim`);
    return;
  }
  if (typeof entry.reason !== 'string' || entry.reason.trim().length === 0) {
    r.fail(`${label} (${entry.file}): needs a reason`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.reviewBy ?? '')) {
    r.fail(`${label} (${entry.file}): needs a reviewBy date (YYYY-MM-DD)`);
    return;
  }
  if (entry.reviewBy < today) {
    r.fail(
      `${label} (${entry.file}): reviewBy ${entry.reviewBy} has passed — re-decide it rather than letting it stand`,
    );
  }
  if (!matchedEntries.has(i)) {
    r.fail(
      `${label} (${entry.file}): matches no line any more — remove it. An allowlist that only grows is a permanent bypass`,
    );
  }
});

console.log(`verify:doc-claims: ${scanned} document(s) scanned, ${allowlist.length} allowed`);
r.done();
