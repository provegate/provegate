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
  // Only the documented bullet form counts as a pointer. A prose mention like
  // `see [record](learnings/foo.md)` used to satisfy the orphan check while the
  // hook loop below ignored it — so a record could be "indexed" by a line that
  // carries no hook and was never held to the length limit.
  const pointers = [...indexText.matchAll(/^- \[[^\]]*\]\(((?:learnings|adr)\/[^)]+\.md)\)/gm)].map(
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
  // Scanned over EVERY local link, not over `counts`: that map only holds paths
  // already filtered to `learnings/` or `adr/`, so a direct `private/secret.md`
  // link could never appear in it and the check could never fire.
  // Every way Markdown can name a target, not just the inline one: a reference
  // definition (`[s]: private/secret.md`), an angle-wrapped target, and a
  // percent-encoded segment all reach the same file, so a check that reads only
  // `](...)` is a privacy boundary with a documented way around it.
  const linkTargets = [
    ...[...indexText.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]),
    ...[...indexText.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gm)].map((m) => m[1]),
  ];
  for (const raw of linkTargets) {
    let target = raw.trim().replace(/^<|>$/g, '').split(/\s+/)[0];
    // CommonMark decodes character references in a link destination, so
    // `&#112;rivate/secret.md` and `private&sol;secret.md` both name the same
    // file. Numeric references decode generally; the named ones that matter
    // here are the path punctuation, since those are what rebuild a segment.
    const NAMED = {
      sol: '/',
      bsol: '\\',
      period: '.',
      lowbar: '_',
      hyphen: '-',
      dash: '-',
      amp: '&',
      lpar: '(',
      rpar: ')',
    };
    target = target
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
      .replace(/&([a-z]+);/gi, (whole, name) => NAMED[name.toLowerCase()] ?? whole);
    try {
      target = decodeURIComponent(target);
    } catch {
      /* a malformed escape stays as written — still worth checking */
    }
    // `file:` resolves LOCALLY, so skipping it as an "external scheme" was a
    // documented way to publish a private record from the always-loaded index.
    if (/^file:/i.test(target)) target = target.replace(/^file:(\/\/)?/i, '');
    else if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue; // external / anchor
    // Case-insensitive: the default macOS and Windows filesystems resolve
    // `PRIVATE/` to the same directory, so an exact-case check is a boundary
    // that holds on the CI host and not on the developer's laptop.
    // Segment-aware on BOTH the decoded target and the raw text: a spelling this
    // decoder does not know still fails if the segment survives in the source,
    // while `docs/private-api.md` stays legal — the protocol forbids a `private/`
    // directory, not the word.
    const isPrivate = (value) =>
      value.split(/[/\\]/).some((seg) => seg.toLowerCase() === 'private');
    if (isPrivate(target) || isPrivate(raw)) {
      r.fail(`INDEX.md: link '${raw}' resolves under private/ — the public index must not list it`);
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
