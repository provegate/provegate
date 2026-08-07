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
const section = (body, heading, replacement) => {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`## ${escaped}\\n\\n[\\s\\S]*?\\n\\n---`);
  if (!pattern.test(body)) {
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
prd = section(prd, 'Durable Artifacts', '- none');
prd = section(prd, 'Memory Inputs', '- none — memory is not enabled in this repository.');
prd = section(prd, 'Memory Outputs', '- none — no non-derivable fact is expected here.');

// The §11 rows and the floor bullets ship as placeholders `gate check` refuses.
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
