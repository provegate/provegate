#!/usr/bin/env node
// verify:durable-artifacts — practice 07 / pattern P5 (declared-and-checked).
// Lint mode (default): every wip PRD declares a Durable Artifacts section (paths or
// `- none`). Close mode (--close): every declared real path must appear in the merge
// diff (merge-base vs HEAD) or the working/staged set.
// Placeholder rule (the Durable Artifacts declaration contract): a path containing { } or *
// is an unfilled placeholder and is ignored; `- none` skips the line.
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { targetRoot, section, mdFiles, read, makeReporter } from './lib.mjs';

const root = targetRoot();
const close = process.argv.includes('--close');
const r = makeReporter('verify:durable-artifacts');

const wip = mdFiles(join(root, '_prds', 'wip')).filter((f) => /prd-\d+/.test(f));
const declared = [];

for (const f of wip) {
  const body = section(read(f), 'Durable Artifacts');
  if (body === null) {
    r.fail(`${f}: missing '## Durable Artifacts' section (declare paths or '- none')`);
    continue;
  }
  const bullets = body.split('\n').filter((l) => /^\s*-\s/.test(l));
  if (bullets.length === 0) {
    r.fail(`${f}: Durable Artifacts section has no entries (write '- none' if empty)`);
    continue;
  }
  for (const line of bullets) {
    if (/^\s*-\s*none\b/i.test(line)) continue;
    const path = /`([^`]+)`/.exec(line)?.[1];
    if (!path) {
      r.fail(`${f}: entry is neither '- none' nor a backticked path: '${line.trim()}'`);
    } else if (!/[{}*]/.test(path)) {
      declared.push({ prd: f, path });
    }
  }
}

if (close && declared.length) {
  const sh = (cmd) => execSync(cmd, { encoding: 'utf8', cwd: root }).trim();
  const changed = new Set(
    [
      ...sh(
        'git diff --name-only $(git merge-base main HEAD 2>/dev/null || echo HEAD)..HEAD || true',
      ).split('\n'),
      ...sh('git diff --name-only').split('\n'),
      ...sh('git diff --cached --name-only').split('\n'),
    ].filter(Boolean),
  );
  for (const { prd, path } of declared) {
    if (!changed.has(path)) r.fail(`${prd}: declared durable artifact '${path}' not in the diff`);
  }
}

console.log(
  `verify:durable-artifacts: ${wip.length} wip PRD(s), ${declared.length} concrete path(s)${close ? ' [close mode]' : ''}`,
);
r.done();
