#!/usr/bin/env node
// verify:brain — _brain records are schema-valid and fully indexed (_brain/PROTOCOL.md §9).
import { basename, join } from 'node:path';
import { existsSync } from 'node:fs';
import { targetRoot, parseFrontmatter, mdFiles, read, makeReporter } from './lib.mjs';

const root = targetRoot();
const r = makeReporter('verify:brain');
const brain = join(root, '_brain');

const LEARNING_TYPES = new Set(['gotcha', 'convention', 'reference', 'decision']);
const SCOPES = new Set(['workflow', 'project']);
const LEARNING_STATUS = new Set(['active', 'superseded']);
const ADR_STATUS = new Set(['proposed', 'accepted', 'superseded']);
const SLUG = /^[a-z0-9-]+$/;
const ADR_NAME = /^ADR-\d{4}-[a-z0-9-]+$/;

const learnings = mdFiles(join(brain, 'learnings'));
const adrs = mdFiles(join(brain, 'adr'));
const allNames = new Set();
const referenced = new Set();

function checkRecord(file, isAdr) {
  const slug = basename(file, '.md');
  const content = read(file);
  const fm = parseFrontmatter(content);
  if (!fm) return r.fail(`${file}: missing frontmatter`);
  for (const key of ['name', 'description', 'type', 'scope', 'status']) {
    if (!fm[key] || fm[key].length === 0) r.fail(`${file}: missing frontmatter key '${key}'`);
  }
  if (fm.name !== slug) r.fail(`${file}: name '${fm.name}' != filename slug '${slug}'`);
  if (allNames.has(fm.name)) r.fail(`${file}: duplicate name '${fm.name}'`);
  allNames.add(fm.name);
  if (isAdr) {
    if (!ADR_NAME.test(slug)) r.fail(`${file}: ADR name must match ADR-NNNN-<slug>`);
    if (!ADR_STATUS.has(fm.status))
      r.fail(`${file}: ADR status '${fm.status}' not in proposed|accepted|superseded`);
  } else {
    if (!SLUG.test(slug)) r.fail(`${file}: slug must be kebab-case`);
    if (!LEARNING_TYPES.has(fm.type)) r.fail(`${file}: type '${fm.type}' invalid`);
    if (!LEARNING_STATUS.has(fm.status))
      r.fail(`${file}: status '${fm.status}' not in active|superseded`);
  }
  if (!SCOPES.has(fm.scope)) r.fail(`${file}: scope '${fm.scope}' not in workflow|project`);
  if (fm.status === 'superseded' && !fm['superseded-by'])
    r.fail(`${file}: status superseded requires superseded-by`);
  for (const l of fm.links ?? []) referenced.add(l);
  if (fm['superseded-by']) referenced.add(fm['superseded-by']);
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
