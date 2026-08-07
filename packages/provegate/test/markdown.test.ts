import { describe, expect, it } from 'vitest';
import {
  countOperatorHandoff,
  countTaskChecks,
  declaredGlobs,
  findMarkdownTable,
  getMetaValue,
  getTableValue,
  isRootRelativeFilename,
  parseConflictSurface,
  sectionAfter,
  stripMarkdown,
  writeTableValue,
} from '../src/core/state/markdown.js';

describe('stripMarkdown', () => {
  it('drops bold, backticks, and <br>', () => {
    expect(stripMarkdown('**Ship `Verified`**<br/>x')).toBe('Ship Verified x');
  });
});

describe('getMetaValue', () => {
  it('reads blockquote bold metadata', () => {
    expect(getMetaValue('> **Status**: Draft\n', 'Status')).toBe('Draft');
  });

  it('reads colon-inside-bold variant', () => {
    expect(getMetaValue('> **Status:** Draft\n', 'Status')).toBe('Draft');
  });

  it('reads bare key lines and escapes regex metacharacters in keys', () => {
    expect(getMetaValue('Cycle Phase: 1 (PRD Generation)\n', 'Cycle Phase')).toBe(
      '1 (PRD Generation)',
    );
  });

  it('returns null when absent', () => {
    expect(getMetaValue('nothing here', 'Status')).toBeNull();
  });
});

describe('getTableValue', () => {
  it('reads a label row value cell', () => {
    expect(getTableValue('| Score | 8.7/10 |\n', 'Score')).toBe('8.7/10');
  });
});

describe('sectionAfter', () => {
  const doc = '## Alpha\n\na-body\n\n## Beta\n\nb-body\n';
  it('returns section body up to the next heading', () => {
    expect(sectionAfter(doc, 'Alpha')).toContain('a-body');
    expect(sectionAfter(doc, 'Alpha')).not.toContain('b-body');
  });
  it('returns tail for the last section and empty for missing', () => {
    expect(sectionAfter(doc, 'Beta')).toContain('b-body');
    expect(sectionAfter(doc, 'Gamma')).toBe('');
  });
});

describe('countTaskChecks / countOperatorHandoff', () => {
  it('counts checked and unchecked boxes', () => {
    const content = '- [x] a\n  - [X] b\n- [ ] c\n';
    expect(countTaskChecks(content)).toEqual({ checkedCount: 2, uncheckedCount: 1 });
  });

  it('counts operator handoff data rows, skipping header and separator', () => {
    const content = [
      '## Operator Handoff',
      '',
      '| Task | Category | Owner | Required Check | Status | Notes |',
      '| ---- | -------- | ----- | -------------- | ------ | ----- |',
      '| 9.1 | external | owner | review | pending | |',
      '| 10.4 | manual-qa | owner | push | pending | |',
      '',
    ].join('\n');
    expect(countOperatorHandoff(content)).toBe(2);
  });

  // Fail-closed direction: this count IS the merge gate's precondition, so a row
  // the parser cannot read as a table row must still arm the gate. PRD-016 wrote
  // its operator row as a checkbox bullet and the close reported `operator rows: 0`.
  it('counts a checkbox-bullet operator row', () => {
    const content = [
      '## Operator Handoff',
      '',
      '> Autonomous Close is operator-gated — the rows below need a human.',
      '',
      '- [ ] 9.0 Operator acceptance of autonomous close: owner signs off',
      '- [x] 9.1 Staging smoke run',
      '',
    ].join('\n');
    expect(countOperatorHandoff(content)).toBe(2);
  });

  it('sums table rows and checkbox rows in a mixed section', () => {
    const content = [
      '## Operator Handoff',
      '',
      '| Task | Category | Owner | Required Check | Status | Notes |',
      '| ---- | -------- | ----- | -------------- | ------ | ----- |',
      '| 9.1 | external | owner | review | pending | |',
      '',
      '- [ ] 9.2 owner signs off',
      '',
    ].join('\n');
    expect(countOperatorHandoff(content)).toBe(2);
  });

  it('counts an explicitly empty section as zero rows', () => {
    // Three legitimate spellings of "no operator work": the `- (none)` bullet
    // (a bullet, not a checkbox), the template's all-empty table row, and a
    // section with prose only. None may fabricate an operator row.
    const none = ['## Operator Handoff', '', '> None — every gate is machine-checkable.', ''];
    expect(countOperatorHandoff([...none, '- (none)', ''].join('\n'))).toBe(0);
    expect(
      countOperatorHandoff(
        [
          ...none,
          '| Task | Category | Owner | Required Check | Status | Notes |',
          '| ---- | -------- | ----- | -------------- | ------ | ----- |',
          '|      |          |       |                |        |       |',
          '',
        ].join('\n'),
      ),
    ).toBe(0);
    expect(countOperatorHandoff(none.join('\n'))).toBe(0);
  });

  it('ignores task checkboxes outside the Operator Handoff section', () => {
    const content = [
      '## Tasks',
      '',
      '- [ ] 1.1 implement',
      '- [x] 1.2 test',
      '',
      '## Operator Handoff',
      '',
      '- (none)',
      '',
      '## Progress Log',
      '',
      '- [ ] not an operator row either',
      '',
    ].join('\n');
    expect(countOperatorHandoff(content)).toBe(0);
  });
});

describe('findMarkdownTable', () => {
  it('finds a table regardless of column padding (formatter tolerance)', () => {
    const padded = '| Gate  |   Result |\n| ----- | -------- |\n| lint  | passed   |\n';
    const bounds = findMarkdownTable(padded, ['Gate', 'Result']);
    expect(bounds).not.toBeNull();
    expect(padded.slice(bounds!.afterSep, bounds!.rowsEnd)).toContain('lint');
  });

  it('rejects a header without a separator line', () => {
    expect(findMarkdownTable('| A | B |\n| x | y |\n', ['A', 'B'])).toBeNull();
  });
});

describe('writeTableValue', () => {
  it('replaces only the value cell, leaving siblings untouched', () => {
    const table = '| Implemented | 3 |\n| Latest | PRD-002 |\n';
    const next = writeTableValue(table, 'Implemented', '4');
    expect(next).toBe('| Implemented | 4 |\n| Latest | PRD-002 |\n');
  });

  it('returns content unchanged when the label row is absent', () => {
    const table = '| Other | 1 |\n';
    expect(writeTableValue(table, 'Missing', 'x')).toBe(table);
  });
});

describe('declaredGlobs', () => {
  it('extracts backticked globs, dropping none and template tokens', () => {
    const content = [
      '## Conflict Surface',
      '',
      '- `packages/provegate/src/**`',
      '- `path/to/{placeholder}/x`',
      '- `workflow.config.json`',
      '- none',
      '- `none`',
      '- `packages/provegate/src/**`',
      '',
      '## Next',
    ].join('\n');
    // A ROOT-LEVEL entry is a claim. This used to require a `/`, which silently
    // discarded `workflow.config.json` and `gates.manifest.json` — the entries
    // this repository's own PRDs write — so two agents could claim the same
    // control file with no conflict reported. Template tokens and `none` are
    // still excluded; a backticked token in a real bullet is taken at its word,
    // and over-claiming only ever detects MORE conflicts.
    expect(declaredGlobs(content)).toEqual(['packages/provegate/src/**', 'workflow.config.json']);
  });

  it('returns empty when the section is missing', () => {
    expect(declaredGlobs('# nothing')).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRD-021 FR-13 — root-relative claims, and rejections that are visible
// ─────────────────────────────────────────────────────────────────────────────

describe('isRootRelativeFilename (FR-13a)', () => {
  it('accepts the shapes a repo root actually holds', () => {
    for (const token of [
      'workflow.config.json',
      'gates.manifest.json',
      'STATUS.md',
      'AGENT_BOOTSTRAP.md',
      'pnpm-lock.yaml',
      '.gitignore',
      '.npmrc',
      '.env.example',
    ]) {
      expect(isRootRelativeFilename(token), token).toBe(true);
    }
  });

  it('rejects prose abbreviations, which is the point of the literal shapes', () => {
    // `e.g.` and `etc.` end with a dot; `README` has no extension. All three
    // appear in Conflict Surface prose, and the previous predicate — any token
    // without whitespace — accepted the first two as claimed paths.
    for (const token of ['e.g.', 'i.e.', 'etc.', 'README', '', '.', '..']) {
      expect(isRootRelativeFilename(token), token).toBe(false);
    }
  });
});

describe('parseConflictSurface (FR-13b)', () => {
  const surface = (...lines: string[]): string =>
    ['## Conflict Surface', '', ...lines.map((l) => `- \`${l}\``), ''].join('\n');

  it('claims real paths and reports every refusal with a reason', () => {
    const parsed = parseConflictSurface(
      surface('src/**', 'STATUS.md', '.gitignore', '../outside.ts', '/etc/passwd', 'e.g.'),
    );
    expect(parsed.globs).toEqual(['src/**', 'STATUS.md', '.gitignore']);
    expect(parsed.rejected).toEqual([
      { token: '../outside.ts', reason: 'contains a `..` segment' },
      { token: '/etc/passwd', reason: 'absolute — Conflict Surface paths are repo-relative' },
      { token: 'e.g.', reason: 'ends with a dot — prose, not a path' },
    ]);
  });

  it('a template token is skipped SILENTLY — it is not a mistake', () => {
    // The shipped template carries `{{...}}` placeholders and a `none` line.
    // Reporting them would train an author to ignore this list, which is the
    // only way it stops working.
    const parsed = parseConflictSurface(surface('{{PATH}}', 'none'));
    expect(parsed.globs).toEqual([]);
    expect(parsed.rejected).toEqual([]);
  });

  it('declaredGlobs still returns string[] and agrees with the parse', () => {
    // The signature is unchanged so no caller breaks; the rejections live in
    // the richer function for the two consumers that should report them.
    const doc = surface('src/**', 'e.g.');
    expect(declaredGlobs(doc)).toEqual(parseConflictSurface(doc).globs);
    expect(declaredGlobs(doc)).toEqual(['src/**']);
  });
});
