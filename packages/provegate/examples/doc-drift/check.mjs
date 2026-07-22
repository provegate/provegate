#!/usr/bin/env node
// doc-drift — example domain gate (zero dependencies).
//
// Pattern: when watched source paths change, their declared documentation must
// change in the same diff — docs land with the code or the gate fails.
//
// Usage: node examples/doc-drift/check.mjs [rootDir] [baseRef]
//   Reads the WATCH map below; compares the merge-range diff (baseRef...HEAD).
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const baseRef = process.argv[3] ?? 'main';

// ── Adapt to your project: source prefix → doc that must move with it ───────
const WATCH = [
  { source: 'src/api/', doc: 'docs/api.md' },
  { source: 'src/schema/', doc: 'docs/data-model.md' },
];
// ────────────────────────────────────────────────────────────────────────────

function diffFiles() {
  // Fail CLOSED: a gate that cannot resolve its diff must error, never pass.
  let mergeBase;
  try {
    mergeBase = execFileSync('git', ['merge-base', 'HEAD', baseRef], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  } catch {
    console.error(
      `[doc-drift] cannot resolve merge-base vs '${baseRef}' in ${root} — not a repo or bad base ref`,
    );
    process.exit(2);
  }
  return execFileSync('git', ['diff', '--name-only', `${mergeBase}...HEAD`], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
}

const changed = diffFiles();
const drifted = WATCH.filter(
  ({ source, doc }) => changed.some((f) => f.startsWith(source)) && !changed.includes(doc),
);

if (drifted.length > 0) {
  console.error('[doc-drift] watched paths changed without their docs:');
  for (const { source, doc } of drifted) console.error(`  - ${source} changed; ${doc} untouched`);
  process.exit(1);
}
console.log(`[doc-drift] ok - ${changed.length} changed file(s), no doc drift`);
