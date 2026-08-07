#!/usr/bin/env node
// verify:quickstart-parity — the two quickstart documents carry ONE canonical
// command sequence (PRD-038 FR-3). Two independently-edited sequences are two
// implementations of one promise (`two-parsers-wrong-together`, applied to
// prose); this verifier extracts each doc's tagged `qs:scenario` region — the
// package doc uses HTML-comment markers (plain Markdown), the docs twin uses
// MDX-comment markers (fumadocs rejects HTML comments, measured in PRD-037) —
// excludes `qs:skip` fences identically to the e2e harness, and asserts
// command-sequence equality.
//
// A ROOT script on purpose: the docs file sits outside the provegate package's
// turbo inputs, and a package test reading it would replay cached green while
// the doc drifted (`turbo-cache-masks-out-of-input-reads`).
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { targetRoot, read, makeReporter } from './lib.mjs';

// One fence grammar, shared with the CLI. Imported from the BUILT package so
// the two can never drift; a missing build is reported as what it is rather
// than silently degrading to an approximation.
let fencedLines;
let fenceSpans;
try {
  ({ fencedLines, fenceSpans } = await import('../../packages/provegate/dist/index.js'));
} catch (error) {
  console.error(
    'verify:quickstart-parity: FAIL — packages/provegate/dist is missing; ' +
      'build the CLI first (this check shares its fence scanner)',
  );
  console.error(String(error?.message ?? error));
  process.exit(1);
}

const root = targetRoot();
const r = makeReporter('verify:quickstart-parity');

const DOCS = [
  {
    path: 'packages/provegate/QUICKSTART.md',
    start: '<!-- qs:scenario -->',
    end: '<!-- /qs:scenario -->',
    skip: '<!-- qs:skip -->',
  },
  {
    path: 'apps/docs/content/docs/quickstart.mdx',
    start: '{/* qs:scenario */}',
    end: '{/* /qs:scenario */}',
    skip: '{/* qs:skip */}',
  },
];

/** Same grammar as the e2e harness: sh fences executable, text/json fences
 * illustration, qs:skip binds to exactly the next sh fence, per-line commands
 * with backslash joins and comment/blank skips. */
function extract(doc, { start, end, skip }, label) {
  const lines = doc.split('\n');
  const starts = lines.flatMap((l, i) => (l.trim() === start ? [i] : []));
  const ends = lines.flatMap((l, i) => (l.trim() === end ? [i] : []));
  if (starts.length !== 1 || ends.length !== 1) {
    throw new Error(`${label}: exactly one qs:scenario region required (${starts.length} start, ${ends.length} end)`);
  }
  if (ends[0] < starts[0]) throw new Error(`${label}: region end precedes start`);
  const commands = [];
  let pendingSkip = false;
  let i = starts[0] + 1;
  while (i < ends[0]) {
    const line = lines[i];
    if (line.trim() === skip) {
      if (pendingSkip) throw new Error(`${label}: two qs:skip markers before one fence (line ${i + 1})`);
      let j = i + 1;
      while (j < ends[0] && (lines[j] ?? '').trim() === '') j++;
      if (!/^```sh\s*$/.test(lines[j] ?? '')) {
        throw new Error(`${label}: qs:skip must be immediately followed by a \`\`\`sh fence (line ${i + 1})`);
      }
      pendingSkip = true;
      i++;
      continue;
    }
    const fence = /^```(\S*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1];
      const close = lines.indexOf('```', i + 1);
      if (close < 0 || close >= ends[0]) throw new Error(`${label}: unclosed fence at line ${i + 1}`);
      if (lang === 'sh') {
        if (pendingSkip) {
          pendingSkip = false;
        } else {
          let joined = '';
          for (let j = i + 1; j < close; j++) {
            const t = lines[j].trim();
            if (t === '' || t.startsWith('#')) continue;
            if (t.endsWith('\\')) { joined += t.slice(0, -1) + ' '; continue; }
            commands.push((joined + t).trim());
            joined = '';
          }
          if (joined !== '') {
            throw new Error(`${label}: unterminated backslash continuation in the fence closing at line ${close + 1}`);
          }
        }
      } else if (lang !== 'text' && lang !== 'json') {
        throw new Error(`${label}: untagged fence inside the region at line ${i + 1}`);
      }
      i = close + 1;
      continue;
    }
    i++;
  }
  if (pendingSkip) throw new Error(`${label}: dangling qs:skip at region end`);
  return commands;
}

const sequences = [];
for (const spec of DOCS) {
  const abs = join(root, spec.path);
  if (!existsSync(abs)) {
    r.fail(`${spec.path}: missing — both quickstart documents must exist`);
    continue;
  }
  try {
    sequences.push({ path: spec.path, commands: extract(read(abs), spec, spec.path) });
  } catch (error) {
    r.fail(String(error.message ?? error));
  }
}

if (sequences.length === 2) {
  const [a, b] = sequences;
  const max = Math.max(a.commands.length, b.commands.length);
  for (let i = 0; i < max; i++) {
    if (a.commands[i] !== b.commands[i]) {
      r.fail(
        `sequence divergence at command ${i + 1}: ` +
          `${a.path} has ${JSON.stringify(a.commands[i] ?? '<absent>')}, ` +
          `${b.path} has ${JSON.stringify(b.commands[i] ?? '<absent>')}`,
      );
      break;
    }
  }
  r.note(`${a.commands.length} canonical commands compared across both documents`);
}

// PRD-042 FR-6: a STRUCTURAL order assertion. Command-sequence equality cannot
// see prose order, and the order is the point: `gate init` writes an EMPTY
// manifest, so a reader who meets the close section before the manifest recipe
// runs the chain with nothing wired. That is exactly what the first external
// adopter did.
const ORDER = { before: '## Single-package repos', after: '## 5. Close (the runner)' };
for (const spec of DOCS) {
  const abs = join(root, spec.path);
  if (!existsSync(abs)) continue;
  const lines = read(abs).split('\n');
  // The SAME fence scanner the CLI uses, imported from the built package
  // (phase-6 round 3, High): this file carried an approximation — unlimited
  // indentation opened a fence and any same-marker run closed it — so an
  // indented `~~~` pair could hide the real Close heading. Two parsers over one
  // grammar is how they agree while both are wrong; there is one now.
  const fenced = fencedLines(lines);
  const findUnique = (heading) => {
    const hits = lines.map((l, i) => (!fenced[i] && l === heading ? i : -1)).filter((i) => i >= 0);
    return hits;
  };
  const beforeHits = findUnique(ORDER.before);
  const afterHits = findUnique(ORDER.after);
  if (beforeHits.length !== 1 || afterHits.length !== 1) {
    r.fail(
      `${spec.path}: expected exactly one unfenced "${ORDER.before}" and "${ORDER.after}" ` +
        `heading (found ${beforeHits.length} and ${afterHits.length}) — the order assertion ` +
        'cannot judge a document whose sections it cannot identify',
    );
    continue;
  }
  const [before] = beforeHits;
  const [after] = afterHits;
  // The heading is not the recipe. Round 1 of PRD-042's review showed the
  // heading could stay put while the JSON fence moved past the close — the
  // assertion has to end where the RECIPE ends, so find the manifest fence
  // inside the section and require its CLOSING line to precede the close.
  // A recipe is identified STRUCTURALLY and must be UNIQUE in the document
  // (phase-6 round 2, High): "any fence mentioning phases" let a decoy fence
  // before Close satisfy the gate while the real floor recipe sat after it.
  // The recipe is a ```json fence whose parsed object has a `phases` key whose
  // value names at least one command — an empty decoy fails that test.
  // Recipe discovery uses the SAME `fenced` map (phase-6 round 4, High): a
  // second parser here recognized only unindented triple-backtick openers and
  // accepted a fence nested inside another fence. A fence OPENER is a fenced
  // line whose predecessor is not fenced; its closer is the last fenced line of
  // that run.
  // Fence SPANS, not a derived opener predicate (phase-6 round 5, High): a
  // closer is fenced too, so a JSON fence opening immediately after another
  // fence's closer was invisible to `fenced[i] && !fenced[i-1]`.
  const recipes = [];
  for (const [i, close] of fenceSpans(lines)) {
    if (!/^ {0,3}(```|~~~)+json\s*$/.test(lines[i])) continue;
    let parsed;
    try {
      parsed = JSON.parse(lines.slice(i + 1, close).join('\n'));
    } catch {
      continue;
    }
    const phases = parsed && typeof parsed === 'object' ? parsed.phases : undefined;
    const commands = phases && typeof phases === 'object' ? Object.values(phases).flat() : [];
    if (commands.length > 0) recipes.push({ start: i, end: close });
  }
  if (recipes.length !== 1) {
    r.fail(
      `${spec.path}: expected exactly one manifest recipe (a \`\`\`json fence whose ` +
        `\`phases\` names at least one command); found ${recipes.length}. A second ` +
        'recipe-shaped fence makes the order assertion judge whichever it met first',
    );
    continue;
  }
  const fenceEnd = recipes[0].end;
  if (recipes[0].start < before) {
    r.fail(
      `${spec.path}: the manifest recipe (line ${recipes[0].start + 1}) sits outside ` +
        `"${ORDER.before}" (line ${before + 1}) — the section and its recipe belong together`,
    );
    continue;
  }
  if (before > after || fenceEnd > after) {
    r.fail(
      `${spec.path}: the manifest recipe (heading line ${before + 1}, fence ends line ` +
        `${fenceEnd + 1}) does not finish before "${ORDER.after}" (line ${after + 1}) — ` +
        'the recipe must precede the close that executes it',
    );
  }
}
r.note('manifest recipe fence closes before the close section in both documents');

r.done();
