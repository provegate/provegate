#!/usr/bin/env node
// Fills the PRD that `gate new` instantiated inside the adopter-smoke fixture,
// standing in for the Phase 1 author. Separate from the harness because the
// substitutions ARE the finding: every `{{TOKEN}}` replaced below is one the
// adopter has to replace by hand today (scripts/adopter-smoke.sh).
//
// Not a gate. It edits a throwaway fixture under the harness's temp dir and is
// never pointed at this repository's own artifacts.
import { readFileSync, writeFileSync } from 'node:fs';

const target = process.argv[2];
if (!target) {
  console.error('usage: adopter-smoke-fill.mjs <prd-path>');
  process.exit(2);
}

// The heading arrives as the literal text it has in the document; escaping it
// here keeps the replacement free of regex syntax (a leaked `\.` writes an
// unreadable heading back into the file, and §4 then parses as zero FRs).
const section = (body, heading, replacement, { optional = false } = {}) => {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`## ${escaped}\\n\\n[\\s\\S]*?\\n\\n---`);
  if (!pattern.test(body)) {
    if (optional) return body;
    console.error(`adopter-smoke-fill: no '## ${heading}' section to fill — the template moved`);
    process.exit(1);
  }
  return body.replace(pattern, `## ${heading}\n\n${replacement}\n\n---`);
};

let prd = readFileSync(target, 'utf8');

prd = prd
  .replace('# PRD-001: [Feature Name]', '# PRD-001: slugify drops accented letters')
  .replace('**Author**: [role identity, e.g. owner]', '**Author**: owner')
  .replace(
    '**Class Rationale**: [required when class ≠ feature — why this class, why not feature; one line]',
    '**Class Rationale**: one function plus its test; no API surface change.',
  )
  .replace('**Autonomous Close**: operator-gated', '**Autonomous Close**: eligible');

prd = section(
  prd,
  '4. Functional Requirements',
  [
    '1. **FR-1**: `slugify` folds accented Latin letters instead of dropping them.',
    '   - **Targets:** `src/slug.ts::slugify`',
    '2. **FR-2**: A regression test pins the accented case.',
    '   - **Targets:** `test/slug.test.js`',
  ].join('\n'),
);
prd = section(prd, 'Conflict Surface', '- `src/**`\n- `test/**`');
// Declared explicitly: PRD-042's token pass resolves `{{DOCS_ROOT}}` and
// `{{MEMORY_ROOT}}` inside this section's scaffolding, so an unfilled section
// now declares paths that do not exist and Phase 7 refuses it BY NAME. That is
// correct — a PRD that never declared its durable knowledge is not ready to
// close — and `none` is what a hotfix with no durable output says.
prd = section(prd, 'Durable Artifacts', '- none');
// The memory sections are ABSENT by design in a memory-disabled repository —
// PRD-042 FR-3 omits them at `gate new` time — so these two are optional and
// say so. `optional: true` is scoped to exactly these headings and nothing
// else: a blanket "skip what you cannot find" is how a fill script silently
// stops filling.
prd = section(prd, 'Memory Inputs', '- none — memory is not enabled in this repository.', {
  optional: true,
});
prd = section(prd, 'Memory Outputs', '- none — no non-derivable fact is expected here.', {
  optional: true,
});

// The §11 rows: PRD-042 FR-2 resolves `{{CMD_*}}` at creation, so in a repository
// with configured commands these arrive resolved and the replacements below are
// no-ops. Both spellings are handled — the fixture must work against an older
// installed CLI too (`--from-npm`).
prd = prd.replace(
  /\| FR-1 \| `\{\{CMD_TEST_SCOPED\}\}` \|.*\n\| FR-2 \| `\{\{CMD_TEST_SCOPED\}\}` \|.*\n/,
  '| FR-1 | `npm run build` | compile | fold runs before the filter |\n' +
    '| FR-2 | `npm run test` | regression | accented case pinned |\n',
);
for (const [token, command] of [
  ['{{CMD_CHECK_TYPES}}', 'npm run check-types'],
  ['{{CMD_LINT}}', 'npm run lint'],
  ['{{CMD_TEST}}', 'npm run test'],
  ['{{CMD_BUILD}}', 'npm run build'],
]) {
  prd = prd.replaceAll(token, command);
}

writeFileSync(target, prd);
