#!/usr/bin/env node
// verify:brain — _brain records are schema-valid and fully indexed (_brain/PROTOCOL.md §9).
// The record schema itself lives in lib.mjs, shared with the package parser through a
// conformance corpus: two implementations of one format must not drift.
import { basename, join } from 'node:path';
import { existsSync } from 'node:fs';
import {
  targetRoot,
  parseRecordFrontmatter,
  validateMemoryRecord,
  mdFiles,
  read,
  makeReporter,
} from './lib.mjs';

const root = targetRoot();
const r = makeReporter('verify:brain');
const brain = join(root, '_brain');

const SLUG = /^[a-z0-9-]+$/;
const ADR_NAME = /^ADR-\d{4}-[a-z0-9-]+$/;
/**
 * The human hook after the Markdown link, in characters. Forward-looking: at the
 * time this limit landed no pointer exceeded it (the longest was 102), so it
 * constrains what gets written next rather than demanding a migration. Link
 * markup is excluded — the budget is for the sentence a reader skims, not for
 * the path length that happens to sit in front of it.
 */
const HOOK_MAX = 120;

const learnings = mdFiles(join(brain, 'learnings'));
const adrs = mdFiles(join(brain, 'adr'));
const allNames = new Set();
const referenced = new Set();

function checkRecord(file, isAdr) {
  const slug = basename(file, '.md');
  const content = read(file);
  for (const issue of validateMemoryRecord(content, { slug, isAdr }).issues) {
    r.fail(`${file}: ${issue.field} — ${issue.message}`);
  }

  const { values } = parseRecordFrontmatter(content);
  const name = values.get('name');
  if (typeof name === 'string' && name.length > 0) {
    if (allNames.has(name)) r.fail(`${file}: duplicate name '${name}'`);
    allNames.add(name);
  }
  for (const l of values.get('links') ?? []) referenced.add(l);
  const supersededBy = values.get('superseded-by');
  if (typeof supersededBy === 'string' && supersededBy.length > 0) referenced.add(supersededBy);
  for (const m of content.matchAll(/\[\[([^\]]+)\]\]/g)) referenced.add(m[1]);
}

for (const f of learnings) checkRecord(f, false);
for (const f of adrs) checkRecord(f, true);

// INDEX: exactly one pointer per record — no orphans, no duplicates, no dangling.
const indexPath = join(brain, 'INDEX.md');
if (!existsSync(indexPath)) {
  r.fail('INDEX.md missing');
} else {
  // Strip HTML comments first — a commented-out pointer is not a pointer (it must
  // neither count as coverage nor be flagged as dangling).
  const indexText = read(indexPath).replace(/<!--[\s\S]*?-->/g, '');
  const pointers = [...indexText.matchAll(/\]\(((?:learnings|adr)\/[^)]+\.md)\)/g)].map(
    (m) => m[1],
  );
  const counts = new Map();
  for (const p of pointers) counts.set(p, (counts.get(p) ?? 0) + 1);
  for (const [p, n] of counts) {
    if (n > 1) r.fail(`INDEX.md: duplicate pointer to ${p}`);
    if (!existsSync(join(brain, p))) r.fail(`INDEX.md: dangling pointer to ${p}`);
  }
  for (const f of [...learnings, ...adrs]) {
    const rel = f.slice(brain.length + 1);
    if (!counts.has(rel)) r.fail(`INDEX.md: no pointer for ${rel} (orphan record)`);
  }
  // A public pointer into `private/` would publish what the store deliberately
  // gitignores — the one INDEX mistake with a consequence outside the repo.
  for (const p of counts.keys()) {
    if (p.split('/').includes('private')) {
      r.fail(
        `INDEX.md: pointer '${p}' resolves under private/ — the public index must not list it`,
      );
    }
  }
  for (const line of indexText.split('\n')) {
    const pointer = /^- \[[^\]]*\]\((?:learnings|adr)\/[^)]+\.md\)(.*)$/.exec(line);
    if (!pointer) continue;
    const hook = pointer[1].replace(/^\s*—?\s*/, '').trim();
    if (hook.length === 0) {
      r.fail(`INDEX.md: pointer has no hook: ${line.trim()}`);
    } else if (hook.length > HOOK_MAX) {
      r.fail(
        `INDEX.md: hook is ${hook.length} characters, over the ${HOOK_MAX} limit: ${line.trim()}`,
      );
    }
  }
}

// links / superseded-by / [[...]]: invalid slug fails; dangling-but-valid is a soft note.
for (const ref of referenced) {
  if (!SLUG.test(ref) && !ADR_NAME.test(ref)) {
    r.fail(`link target '${ref}' violates slug rules`);
  } else if (!allNames.has(ref)) {
    r.note(`link target '${ref}' not written yet (allowed — marks future work)`);
  }
}

r.done();
