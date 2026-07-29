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

r.done();
