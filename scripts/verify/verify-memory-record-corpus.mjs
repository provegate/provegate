#!/usr/bin/env node
// verify:memory-corpus — the REPOSITORY validator executes the shared conformance
// corpus (PRD-035 FR-5). The package test runs the typed parser and the SHIPPED
// practices copy; this repository's own copy is only hash-reconciled with the
// shipped one (`verify:pack-drift`), so without this runner nothing ever executes
// it against the cases. Contract per case: expected validity plus bare-field
// containment — the same claim the package test's first assertion makes. The
// entry-keyed `field#entry` form is the package test's cross-implementation
// parity contract; the fixture declares no expected entry keys, so it is not
// used here.
//
// The runner also carries the formatter smoke: prettier writes exactly one blank
// line after each heading, which the pre-PRD-035 anchor read as an empty section.
// The corpus's blank-line case, formatted by the repository's own prettier, must
// still validate — proving prettier's BODY formatting legal without touching the
// live ADR store. That claim is deliberately body-scoped: prettier ALSO reflows a
// frontmatter inline list past its print width into an indented block form the
// documented subset rejects, so a `pnpm format` sweep over `_brain/adr/**` is
// STILL unsafe with the anchor fixed. The second smoke below pins that recorded
// limitation as the current behavior — a future fix must flip the assertion
// consciously, not discover it by surprise.
//
// A root script on purpose: `provegate#test` is turbo-cached over package inputs,
// and a package test reading a repository path replays stale green
// (`turbo-cache-masks-out-of-input-reads`). Root `verify:*` scripts run outside
// turbo by construction.
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { targetRoot, validateMemoryRecord, read, makeReporter } from './lib.mjs';

const root = targetRoot();
const r = makeReporter('verify:memory-corpus');

const FIXTURE = join(
  root,
  'packages/provegate/test/fixtures/memory-record-cases.json',
);
const SMOKE_CASE = 'adr-blank-line-after-every-heading-valid';

// Fail-closed on the fixture itself: a missing or unreadable corpus must be a
// named failure, never zero cases iterated into a PASS (`false-green-on-missing-file`).
if (!existsSync(FIXTURE)) {
  console.error(`verify:memory-corpus: FAIL — fixture missing: ${FIXTURE}`);
  process.exit(1);
}
let corpus;
try {
  corpus = JSON.parse(read(FIXTURE));
} catch (e) {
  console.error(
    `verify:memory-corpus: FAIL — fixture unparseable: ${FIXTURE}: ${e.message}`,
  );
  process.exit(1);
}
if (!Array.isArray(corpus.cases) || corpus.cases.length === 0) {
  console.error(
    `verify:memory-corpus: FAIL — fixture has no cases[]: ${FIXTURE}`,
  );
  process.exit(1);
}

for (const c of corpus.cases) {
  const fields = [
    ...new Set(
      validateMemoryRecord(c.content, { slug: c.slug, isAdr: c.isAdr }).issues.map(
        (i) => i.field,
      ),
    ),
  ];
  if (c.valid) {
    if (fields.length > 0) {
      r.fail(`${c.id}: expected valid, got issues in [${fields.join(', ')}]`);
    }
  } else {
    for (const field of c.fields ?? []) {
      if (!fields.includes(field)) {
        r.fail(
          `${c.id}: expected an issue in '${field}', got [${fields.join(', ')}]`,
        );
      }
    }
  }
}

// Formatter smoke on the blank-line case — prettier's own output must validate.
const smoke = corpus.cases.find((c) => c.id === SMOKE_CASE);
if (!smoke) {
  r.fail(`smoke case '${SMOKE_CASE}' is not in the fixture`);
} else {
  const { default: prettier } = await import('prettier');
  const formatted = await prettier.format(smoke.content, { parser: 'markdown' });
  const issues = validateMemoryRecord(formatted, {
    slug: smoke.slug,
    isAdr: smoke.isAdr,
  }).issues;
  if (issues.length > 0) {
    r.fail(
      `formatter smoke: prettier output failed validation: ${issues
        .map((i) => `${i.field} — ${i.message}`)
        .join('; ')}`,
    );
  }

  // Pinned limitation (PRD-035 phase 6 round 1): prettier reflows a frontmatter
  // inline list past its print width into an indented block form the subset
  // rejects, so formatting a links-bearing record still breaks validation.
  // Assert the refusal on prettier's own output so the limitation is a named,
  // executing fact rather than a silent one.
  const linkedSrc = smoke.content.replace(
    'type: decision',
    'links: [two-parsers-wrong-together, adr-section-blank-line-reads-empty, false-green-on-missing-file]\ntype: decision',
  );
  const linkedFormatted = await prettier.format(linkedSrc, { parser: 'markdown' });
  const reflowedIssues = validateMemoryRecord(linkedFormatted, {
    slug: smoke.slug,
    isAdr: smoke.isAdr,
  }).issues;
  if (!reflowedIssues.some((i) => i.field === 'links' || i.field === 'structure')) {
    r.fail(
      'pinned limitation moved: prettier-formatted long frontmatter links now ' +
        'validate — if the subset or prettier config changed deliberately, retire ' +
        'this pin together with the format-sweep warning in ' +
        'adr-section-blank-line-reads-empty',
    );
  }
}

r.note(`${corpus.cases.length} cases executed against scripts/verify/lib.mjs`);
r.done();
