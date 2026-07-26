import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { defaultManifest } from '../src/core/gates/manifest.js';
import { lintPrd } from '../src/core/gates/prd-ready.js';
import { validateReviewArtifact, validateTasksReviewRow } from '../src/core/gates/review.js';
import { parseVerificationCommands } from '../src/core/gates/safety.js';
import {
  changelogApproves,
  loadMemoryStore,
  memoryCloseIssues,
  normalizeTarget,
  outputPlacementIssues,
  outputsMissingFromDurable,
  parseMemoryDeclarations,
  watchMatches,
} from '../src/core/memory/artifacts.js';
import { buildState } from '../src/core/state/build.js';
import { statusPanelMetrics } from '../src/core/state/query.js';
import { declaredArtifacts, declaredArtifactsStrict } from '../src/core/run/durable.js';

/**
 * FR-6 + W1: templates round-trip through the engine that consumes adopters'
 * artifacts. The FILL map below is the documented placeholder substitution —
 * every command value must be allowlist-safe.
 */

const pkgRoot = fileURLToPath(new URL('..', import.meta.url));
const template = (name: string): string => readFileSync(join(pkgRoot, 'templates', name), 'utf8');

const cfg = DEFAULT_CONFIG;
const manifest = defaultManifest(cfg);

/** W1 — the documented fill map (allowlist-safe commands only). */
const FILL: Record<string, string> = {
  '{{ID_PREFIX}}': 'PRD',
  '{{PROJECT_NAME}}': 'sample-project',
  '{{BASE_BRANCH}}': 'main',
  '{{CMD_CHECK_TYPES}}': 'pnpm check-types',
  '{{CMD_LINT}}': 'pnpm lint',
  '{{CMD_TEST}}': 'pnpm test',
  '{{CMD_TEST_SCOPED}}': 'pnpm test test/sample.test.ts',
  '{{CMD_BUILD}}': 'pnpm build',
  '{{DOCS_ROOT}}': 'docs/knowledge',
  '{{MEMORY_ROOT}}': '_brain',
  '{{DOMAIN_CHECKS}}': '- [ ] sample domain check',
  '{{TECH_STANDARDS}}': '- sample stack rule',
};

function fill(content: string): string {
  let out = content;
  for (const [token, value] of Object.entries(FILL)) {
    out = out.split(token).join(value);
  }
  return out;
}

const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('W1 fill map', () => {
  it('command substitutions are allowlist-safe', () => {
    for (const [token, value] of Object.entries(FILL)) {
      if (!token.includes('CMD')) continue;
      expect(
        cfg.commands.allowedPrefixes.some((p) => value.startsWith(p)),
        `${token} → ${value}`,
      ).toBe(true);
    }
  });
});

describe('prd-template round-trip (lintPrd)', () => {
  it('a minimally-filled PRD template passes the structural lint', () => {
    let content = fill(template('prd-template.md'));
    // minimal authoring pass: resolve the remaining bracketed authoring slots
    content = content
      .replace('# PRD-XXX: [Feature Name]', '# PRD-004: Sample Feature')
      .replace(
        '1. **FR-1**: [Requirement with clear pass/fail criteria]',
        '1. **FR-1**: does the sample thing.',
      )
      .replace(
        '- [ ] [Must be empty — or every entry explicitly deferred with a link — before Phase 2 PASS]',
        '- (none)',
      );
    const report = lintPrd(cfg, manifest, content);
    expect(report.issues).toEqual([]);
  });

  it('the raw template still parses §11 rows (commands become visible)', () => {
    const cmds = parseVerificationCommands(cfg, fill(template('prd-template.md')));
    expect(cmds.length).toBeGreaterThanOrEqual(1);
    expect(cmds[0]!.safe).toBe(true);
  });
});

describe('review-template round-trip (validateReviewArtifact)', () => {
  const filled = (verdict: string, critical: string) =>
    fill(template('review-template.md'))
      .replace('> **PRD:** PRD-XXX', '> **PRD:** PRD-004')
      .replace('> **Verdict:** pass | fail', `> **Verdict:** ${verdict}`)
      .replace(
        '> **Reviewer:** [tool/model — must not be the implementing agent]',
        '> **Reviewer:** sample-reviewer',
      )
      .replace('> **Base SHA:** `[git merge-base or base tip]`', '> **Base SHA:** `abc1234def`')
      .replace('> **Critical:** 0', `> **Critical:** ${critical}`);

  it('validates when filled with sample values', () => {
    const check = validateReviewArtifact(filled('pass', '0'), { expectedId: 'PRD-004' });
    expect(check.issues).toEqual([]);
  });

  it('flips invalid on a verdict/critical contradiction', () => {
    const check = validateReviewArtifact(filled('pass', '2'));
    expect(check.ok).toBe(false);
  });
});

describe('tasks-template round-trip (validateTasksReviewRow)', () => {
  it('the shipped independent-review row shape satisfies the runner parser', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-content-'));
    roots.push(root);
    mkdirSync(join(root, '_docs/reviews'), { recursive: true });
    // a schema-complete artifact at the path the template names (XXX → 004)
    writeFileSync(
      join(root, '_docs/reviews/review-004-sample.md'),
      [
        '> **PRD:** PRD-004',
        '> **Verdict:** pass',
        '> **Reviewer:** sample-reviewer',
        '> **Base SHA:** `abc1234def`',
        '> **Critical:** 0',
        '> **Quorum:** 3/5 pass',
      ].join('\n'),
    );
    const tasks = fill(template('tasks-template.md'))
      .replace('review-XXX-{short-name}.md', 'review-004-sample.md')
      .split('\n')
      .map((line) => (/independent-review/.test(line) ? line.replace('pending', 'passed') : line))
      .join('\n');
    const check = validateTasksReviewRow(cfg, root, tasks, 4);
    expect(check.ok).toBe(true);
    expect(check.artifact).toBe('_docs/reviews/review-004-sample.md');
  });
});

describe('readiness + summary + board round-trips (buildState / panel labels)', () => {
  it('a filled readiness + summary parse through the state builder', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-content-'));
    roots.push(root);
    mkdirSync(join(root, '_prds/wip'), { recursive: true });
    mkdirSync(join(root, '_readiness/wip'), { recursive: true });
    mkdirSync(join(root, '_docs/completed'), { recursive: true });

    writeFileSync(
      join(root, '_prds/wip/prd-004-sample.md'),
      '> **Status**: Approved\n> **Updated**: 2026-07-22\n',
    );
    const readiness = fill(template('readiness-template.md'))
      .replace('| Score                  | X.X/10', '| Score                  | 8.9/10')
      .replace('| Verdict                | PASS', '| Verdict                | PASS');
    writeFileSync(join(root, '_readiness/wip/readiness-004-sample.md'), readiness);
    const summary = fill(template('summary-template.md')).replace(
      /## Ship Readiness\n\n\[[^\]]+\]/,
      '## Ship Readiness\n\nOperator Verification — sample rationale.',
    );
    writeFileSync(join(root, '_docs/completed/summary-004-sample.md'), summary);

    const state = buildState(cfg, root, { generatedAt: 'g' });
    const record = state.records.find((r) => r.number === 4)!;
    expect(record.readiness.score).toBe(8.9);
    expect(record.readiness.verdict).toBe('PASS');
    expect(record.readiness.modelTierExecution).toBe('high');
    expect(record.summary.shipReadiness).toBe('Operator Verification');
  });

  it('the status-board template uses the panel metric labels', () => {
    const board = template('status-board-template.md');
    const labels = Object.keys(statusPanelMetrics(cfg, []));
    for (const label of labels) {
      expect(board, label).toContain(`| ${label}`);
    }
  });
});

describe('FR-1 memory contract grammar (addendum A1 §5)', () => {
  const section = (heading: string, lines: string[]): string =>
    `## ${heading}\n\n${lines.join('\n')}\n\n---\n`;

  it('the shipped template declares one valid input and one valid output', () => {
    const decl = parseMemoryDeclarations(fill(template('prd-template.md')));
    expect(decl.issues).toEqual([]);
    expect(decl.inputs.present).toBe(true);
    expect(decl.outputs.present).toBe(true);
    expect(decl.inputs.none).toBe(false);
    expect(decl.outputs.none).toBe(false);
    expect(decl.inputs.entries).toEqual([
      {
        disposition: 'applied',
        slug: '[record-slug]',
        rationale: '[how the record changed this work item]',
      },
    ]);
    expect(decl.outputs.entries).toEqual([
      {
        type: 'learning',
        path: '_brain/learnings/[slug].md',
        rationale: '[the durable fact expected]',
      },
    ]);
  });

  it('an ADR output beside `none` fails the mutually-exclusive grammar', () => {
    const decl = parseMemoryDeclarations(
      section('Memory Outputs', [
        '- adr: `_brain/adr/ADR-0001-x.md` — the decision this work item records.',
        '- none — nothing durable is expected.',
      ]),
    );
    expect(decl.outputs.entries).toHaveLength(1);
    expect(decl.outputs.none).toBe(true);
    expect(decl.issues).toEqual([
      'Memory Outputs: `none` cannot appear beside 1 entry — the two forms are mutually exclusive',
    ]);
  });

  it('the same exclusion holds for inputs', () => {
    const decl = parseMemoryDeclarations(
      section('Memory Inputs', [
        '- applied: `some-record` — it changed the shape.',
        '- none — no active record is relevant.',
      ]),
    );
    expect(decl.issues).toEqual([
      'Memory Inputs: `none` cannot appear beside 1 entry — the two forms are mutually exclusive',
    ]);
  });

  it('an unreasoned `none` is refused in both sections', () => {
    expect(parseMemoryDeclarations(section('Memory Inputs', ['- none'])).issues).toEqual([
      "Memory Inputs: `none` requires a rationale after ' — '",
    ]);
    expect(parseMemoryDeclarations(section('Memory Outputs', ['- none'])).issues).toEqual([
      "Memory Outputs: `none` requires a rationale after ' — '",
    ]);
  });

  it('an entry without a rationale is refused', () => {
    const decl = parseMemoryDeclarations(
      section('Memory Inputs', ['- reviewed: `some-record`']),
    );
    expect(decl.inputs.entries).toEqual([]);
    expect(decl.issues).toEqual(["Memory Inputs: 'some-record' requires a rationale after ' — '"]);
  });

  it('an unknown disposition names the closed vocabulary', () => {
    const decl = parseMemoryDeclarations(
      section('Memory Inputs', ['- considered: `some-record` — sounds close enough.']),
    );
    expect(decl.issues).toEqual([
      "Memory Inputs: 'considered' is not one of applied|reviewed|not-applicable|none",
    ]);
  });

  it('an output that is not an exact repo-relative file is refused, one reason each', () => {
    const cases: Array<[string, string]> = [
      ['_brain/learnings/**', 'is a pattern, not an exact path'],
      ['_brain/learnings/?.md', 'is a pattern, not an exact path'],
      ['{{MEMORY_ROOT}}/learnings/x.md', 'is an unsubstituted template token, not a path'],
      ['_brain/learnings/', 'is a directory, not a file'],
      ['_brain/learnings', 'is not a `.md` record path'],
      ['_brain/adr/ADR-0001-x.txt', 'is not a `.md` record path'],
      ['/etc/passwd', 'is not repo-relative'],
      ['../outside/x.md', 'escapes the workspace'],
      ['~/notes.md', 'is home-relative'],
      ['learnings.md', 'is not a repo-relative path'],
    ];
    for (const [path, reason] of cases) {
      const decl = parseMemoryDeclarations(
        section('Memory Outputs', [`- learning: \`${path}\` — a durable fact.`]),
      );
      expect(decl.issues, path).toEqual([`Memory Outputs: '${path}' ${reason}`]);
    }
  });

  it('a section present but empty declares neither form', () => {
    const decl = parseMemoryDeclarations('## Memory Inputs\n\nprose only, no bullets.\n');
    expect(decl.issues).toEqual([
      'Memory Inputs: declares neither an entry nor a reasoned `none`',
    ]);
  });

  it('an absent section is reported as absent, not as a grammar issue', () => {
    const decl = parseMemoryDeclarations('# PRD-999\n\nnothing here.\n');
    expect(decl.issues).toEqual([]);
    expect(decl.inputs.present).toBe(false);
    expect(decl.outputs.present).toBe(false);
  });

  it('a rationale wrapped across lines folds into one entry', () => {
    const decl = parseMemoryDeclarations(
      section('Memory Outputs', [
        '- adr: `_brain/adr/ADR-0001-closed-loop-agent-memory.md` — explicit PRD memory inputs,',
        '  watched review triggers, base-ref weakening proof, and Phase 7 capture are the',
        '  canonical closed-loop architecture.',
      ]),
    );
    expect(decl.issues).toEqual([]);
    expect(decl.outputs.entries).toHaveLength(1);
    expect(decl.outputs.entries[0]!.rationale).toBe(
      'explicit PRD memory inputs, watched review triggers, base-ref weakening proof, and ' +
        'Phase 7 capture are the canonical closed-loop architecture.',
    );
  });

  it('target matching strips `::SymbolName` before the glob applies', () => {
    expect(normalizeTarget('packages/provegate/src/core/run/chain.ts::runPhase')).toBe(
      'packages/provegate/src/core/run/chain.ts',
    );
    expect(normalizeTarget('packages/provegate/src/core/run/chain.ts')).toBe(
      'packages/provegate/src/core/run/chain.ts',
    );
    expect(
      watchMatches(
        ['packages/provegate/src/core/run/**'],
        ['packages/provegate/src/core/run/chain.ts::runPhase'],
      ),
    ).toEqual(['packages/provegate/src/core/run/chain.ts']);
    // the false negative this normalization exists to prevent
    expect(
      watchMatches(['packages/provegate/src/core/run/*.ts'], ['docs/method.mdx']),
    ).toEqual([]);
  });

  it('every declared output must also be a Durable Artifact', () => {
    const outputs = [
      { type: 'adr' as const, path: '_brain/adr/ADR-0001-x.md', rationale: 'why' },
      { type: 'learning' as const, path: '_brain/learnings/y.md', rationale: 'why' },
    ];
    expect(outputsMissingFromDurable(outputs, ['_brain/adr/ADR-0001-x.md'])).toEqual([
      '_brain/learnings/y.md',
    ]);
    expect(
      outputsMissingFromDurable(outputs, [
        '_brain/adr/ADR-0001-x.md',
        '_brain/learnings/y.md',
      ]),
    ).toEqual([]);
  });

  it("the shipped template satisfies its own pairing rule", () => {
    // The template is the first thing an adopter copies, so a template that
    // violates the contract it teaches would fail on their first close.
    const filled = fill(template('prd-template.md'));
    const decl = parseMemoryDeclarations(filled);
    expect(decl.outputs.entries.map((o) => o.path)).toEqual(['_brain/learnings/[slug].md']);
    expect(outputsMissingFromDurable(decl.outputs.entries, declaredArtifacts(filled))).toEqual(
      [],
    );
  });
});

describe('lifecycle vocabulary alignment (codex review)', () => {
  it('prd-template and METHOD.md carry every config-canonical status', () => {
    const prd = template('prd-template.md');
    const method = readFileSync(join(pkgRoot, 'METHOD.md'), 'utf8');
    for (const status of cfg.statusVocab.canonical) {
      expect(prd, `template: ${status}`).toContain(status);
      expect(method, `METHOD: ${status}`).toContain(status);
    }
  });

  it('review template + phase-6 carry the doctrinal quorum, not a weakened one', () => {
    expect(template('review-template.md')).toContain('**Quorum:** 3/5 pass');
    const phase6 = readFileSync(join(pkgRoot, 'prompts/phase-6-final-auditing.md'), 'utf8');
    expect(phase6).not.toContain('For high-risk diffs');
    expect(phase6).toContain('>=3/5 pass quorum');
  });
});

describe('phase 6 round 3 self-attack (before the independent round returned)', () => {
  const outputs = (path: string): string =>
    `## Memory Outputs\n\n- learning: \`${path}\` — a durable fact.\n\n---\n`;

  it('a configured root spelled `./_brain` or `_brain/` names the same directory', () => {
    // Raw string compare said otherwise, so a repo whose config wrote `./_brain`
    // would have had every correctly-placed output rejected.
    const entries = parseMemoryDeclarations(outputs('_brain/learnings/x.md')).outputs.entries;
    for (const root of ['_brain', '_brain/', './_brain', './_brain/']) {
      expect(
        outputPlacementIssues(entries, { ...cfg.memory, root }),
        `root: ${root}`,
      ).toEqual([]);
    }
  });

  it('a sibling directory sharing a prefix is not the store', () => {
    const entries = parseMemoryDeclarations(outputs('_brainstorm/learnings/x.md')).outputs.entries;
    expect(outputPlacementIssues(entries, { ...cfg.memory, root: '_brain' })).toEqual([
      "Memory Outputs: '_brainstorm/learnings/x.md' is declared 'learning', so it must live " +
        "under '_brain/learnings/'",
    ]);
  });

  it('a record nested below the store directory is refused', () => {
    const entries = parseMemoryDeclarations(outputs('_brain/learnings/sub/x.md')).outputs.entries;
    expect(outputPlacementIssues(entries, cfg.memory)).toEqual([
      "Memory Outputs: '_brain/learnings/sub/x.md' is nested below '_brain/learnings/'",
    ]);
  });

  it('an unclosed fence hides the rest of the document — and that fails CLOSED', () => {
    // withoutFences blanks everything after an unterminated fence. The section
    // then reads as ABSENT, which the gates refuse; the dangerous direction
    // would be reading a shadowed section as valid.
    const decl = parseMemoryDeclarations(
      ['# PRD', '', '```', 'an example that was never closed', '', outputs('_brain/learnings/x.md')].join(
        '\n',
      ),
    );
    expect(decl.outputs.present).toBe(false);
  });

  it('a section declared twice is an ambiguity, not a duplicate', () => {
    const twice = [outputs('_brain/learnings/x.md'), outputs('_brain/learnings/y.md')].join('\n');
    expect(parseMemoryDeclarations(twice).issues).toEqual([
      'Memory Outputs: declared 2 times — exactly one section is parseable',
    ]);
  });
});

describe('phase 6 round 4 regressions', () => {
  it('[R4-P1-2] a non-breaking-space heading cannot be selected as the real section', () => {
    // Counted with `[ \t]`, sliced with `\s` — and `\s` matches NBSP. The
    // forgery was not counted (so no ambiguity was reported) and was then
    // selected as the body. One predicate now does both.
    const nbsp = ' ';
    const doc = [
      '# PRD',
      '',
      `##${nbsp}Memory Outputs`,
      '',
      '- none — forged, and not a heading.',
      '',
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/x.md` — the real declaration.',
      '',
    ].join('\n');
    const decl = parseMemoryDeclarations(doc);
    expect(decl.issues).toEqual([]);
    expect(decl.outputs.none).toBe(false);
    expect(decl.outputs.entries.map((o) => o.path)).toEqual(['_brain/learnings/x.md']);
  });

  it('[R4-P1-4] a commented-out section is not a section', () => {
    const doc = [
      '# PRD',
      '',
      '<!--',
      '## Memory Outputs',
      '',
      '- none — commented out, so it declares nothing.',
      '-->',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).outputs.present).toBe(false);
  });

  it('[R4-P1-4] a commented-out Changelog cannot approve a weakening', () => {
    const doc = [
      '# PRD',
      '',
      '<!--',
      '## Changelog',
      '',
      '| Date | Author | Changes |',
      '| ---- | ------ | ------- |',
      '| 2026-07-25 | owner | dropped `_brain/adr/ADR-0001-x.md` |',
      '-->',
      '',
    ].join('\n');
    expect(changelogApproves(doc, cfg.owners, '_brain/adr/ADR-0001-x.md')).toBe(false);
  });

  it('[R4-P1-3] a fenced Durable Artifacts example is not the declaration', () => {
    const doc = [
      '# PRD',
      '',
      '```markdown',
      '## Durable Artifacts',
      '',
      '- `_brain/learnings/forged.md` — quoted, not declared',
      '```',
      '',
      '## Durable Artifacts',
      '',
      '- `_brain/learnings/real.md` — the actual declaration',
      '',
    ].join('\n');
    // The STRICT reader — the one the memory contract uses — reads the live
    // section. The legacy reader keeps its old answer on purpose: it is the
    // Phase 7 gate for every repository, including memory-disabled ones, whose
    // behavior this PRD promises not to change. The split is a recorded
    // deferral, not an oversight.
    expect(declaredArtifactsStrict(doc).paths).toEqual(['_brain/learnings/real.md']);
    expect(declaredArtifactsStrict(doc).ambiguous).toBe(false);
    expect(declaredArtifacts(doc)).toEqual(['_brain/learnings/forged.md']);
  });

  it('[R5-P1-2] the strict reader also refuses a forged split heading', () => {
    const doc = [
      '# PRD',
      '',
      '##',
      'Durable Artifacts',
      '',
      '- `_brain/learnings/forged.md` — not a heading at all',
      '',
      '## Durable Artifacts',
      '',
      '- `_brain/learnings/real.md` — the actual declaration',
      '',
    ].join('\n');
    expect(declaredArtifactsStrict(doc).paths).toEqual(['_brain/learnings/real.md']);
  });

  it('[R5-P1-3] a bare `##` ends a section', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/real.md` — declared.',
      '',
      '##',
      '',
      '- learning: `_brain/learnings/smuggled.md` — under a different section.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).outputs.entries.map((o) => o.path)).toEqual([
      '_brain/learnings/real.md',
    ]);
  });

  it('[R4-P1-1] a nested index resolves records against the index directory', () => {
    // `<root>/<pointer>` mapped a record loaded from `_brain/catalog/learnings/x.md`
    // onto `_brain/learnings/x.md`, so an arbitrary file at the outer path
    // satisfied capture. The check now derives the path the loader used.
    const root = mkdtempSync(join(tmpdir(), 'provegate-nested-'));
    roots.push(root);
    mkdirSync(join(root, '_brain/catalog/learnings'), { recursive: true });
    writeFileSync(
      join(root, '_brain/catalog/learnings/x.md'),
      [
        '---',
        'name: x',
        'description: a record under a nested index',
        'type: gotcha',
        'scope: workflow',
        'status: active',
        '---',
        '',
        'Body.',
        '',
        '**Why:** real.',
        '',
        '**How to apply:** safe.',
        '',
      ].join('\n'),
    );
    writeFileSync(
      join(root, '_brain/catalog/INDEX.md'),
      '# index\n\n- [x](learnings/x.md) — hook\n',
    );
    const memory = { ...cfg.memory, enabled: true, index: '_brain/catalog/INDEX.md' };
    const store = loadMemoryStore(root, memory);
    expect(store.records.map((r) => r.slug)).toEqual(['x']);
    expect(store.issues).toEqual([]);

    // The close path is where the changed map lives, so that is what this must
    // assert — loading the record was already correct before the fix, which is
    // why the first version of this test could not fail.
    const nested = '_brain/catalog/learnings/x.md';
    const content = [
      '## Memory Inputs',
      '',
      '- none — nothing applied.',
      '',
      '## Memory Outputs',
      '',
      `- learning: \`${nested}\` — the durable fact.`,
      '',
      '## Durable Artifacts',
      '',
      `- \`${nested}\` — the durable fact`,
      '',
    ].join('\n');
    expect(
      memoryCloseIssues({
        content,
        changedFiles: [nested],
        capturedFiles: [nested],
        exists: () => true,
        store,
        durable: [nested],
        memory,
      }),
    ).toEqual([]);

    // and the OUTER path the old `<root>/<pointer>` join produced is refused
    const forged = content.split(nested).join('_brain/learnings/x.md');
    expect(
      memoryCloseIssues({
        content: forged,
        changedFiles: ['_brain/learnings/x.md'],
        capturedFiles: ['_brain/learnings/x.md'],
        exists: () => true,
        store,
        durable: ['_brain/learnings/x.md'],
        memory,
      }).join('; '),
    ).toContain('must live under');
  });
});

describe('phase 6 round 6 regressions', () => {
  it('[R6-P1-2] a comment opener inside a fence cannot eat the fence closer', () => {
    const doc = [
      '# PRD',
      '',
      '```markdown',
      '<!-- an example of a commented section',
      '## Changelog',
      '```',
      '',
      '## Changelog',
      '',
      '| Date | Author | Changes |',
      '| ---- | ------ | ------- |',
      '| 2026-07-25 | agent | no approval here |',
      '',
    ].join('\n');
    // The real Changelog has no owner row, so nothing is approved. Before the
    // single scanner, the comment swallowed the fence closer and the body
    // handed back was somebody else's.
    expect(changelogApproves(doc, cfg.owners, '_brain/adr/ADR-0001-x.md')).toBe(false);
  });

  it('[R6-P1-2] a backticked comment opener is prose, and backticks survive', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/x.md` — a rationale mentioning `<!--` inline.',
      '',
    ].join('\n');
    const decl = parseMemoryDeclarations(doc);
    expect(decl.issues).toEqual([]);
    expect(decl.outputs.entries.map((o) => o.path)).toEqual(['_brain/learnings/x.md']);
  });

  it('[R6-P1-3] an ambiguous underline is refused, not interpreted', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/real.md` — declared.',
      '',
      'Other',
      '-----',
      '',
      '- learning: `_brain/learnings/smuggled.md` — under a rendered H2.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toContainEqual(
      expect.stringContaining('a setext underline'),
    );
  });

  it('[R6-P1-4] a fenced INDEX example is not a pointer', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-index-'));
    roots.push(root);
    mkdirSync(join(root, '_brain/learnings'), { recursive: true });
    writeFileSync(
      join(root, '_brain/INDEX.md'),
      [
        '# index',
        '',
        'The pointer form looks like this:',
        '',
        '```markdown',
        '- [example](learnings/not-real.md) — hook',
        '```',
        '',
      ].join('\n'),
    );
    const store = loadMemoryStore(root, { ...cfg.memory, enabled: true });
    expect(store.records).toEqual([]);
    expect(store.issues).toEqual([]);
  });

  it('[R6-P2-6] an index that is a directory reports, never throws', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-index-'));
    roots.push(root);
    mkdirSync(join(root, '_brain/INDEX.md'), { recursive: true });
    const store = loadMemoryStore(root, { ...cfg.memory, enabled: true });
    expect(store.issues).toEqual(["memory index '_brain/INDEX.md' is not a regular file"]);
  });

  it('[R6-P2-5] a backslash-separated index resolves like the validator reads it', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-index-'));
    roots.push(root);
    mkdirSync(join(root, '_brain/learnings'), { recursive: true });
    writeFileSync(join(root, '_brain/INDEX.md'), '# index\n');
    const store = loadMemoryStore(root, { ...cfg.memory, enabled: true, index: '_brain\\INDEX.md' });
    expect(store.issues).toEqual([]);
  });
});

describe('phase 6 round 7 self-attack (before the independent round returned)', () => {
  it('a rule directly under a bullet is ambiguous, so it is refused', () => {
    // The setext stop must not fire on a thematic break. A section whose last
    // bullet is followed by `---` is an ordinary PRD shape, and cutting it there
    // would drop a real declaration — fail-closed, but still wrong.
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/first.md` — declared.',
      '- learning: `_brain/learnings/last.md` — also declared.',
      '---',
      '',
      '## Conflict Surface',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues.join('; ')).toMatch(
      /a setext underline|contains a code fence|a raw HTML block/,
    );
  });

  it('a table separator does not read as a heading underline', () => {
    const doc = [
      '## Changelog',
      '',
      '| Date | Author | Changes |',
      '| ---- | ------ | ------- |',
      '| 2026-07-25 | owner | dropped `_brain/adr/ADR-0001-x.md` |',
      '',
    ].join('\n');
    expect(changelogApproves(doc, cfg.owners, '_brain/adr/ADR-0001-x.md')).toBe(true);
  });

  it('and so is a setext heading written inside a section', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/real.md` — declared.',
      '',
      'Other',
      '-----',
      '',
      '- learning: `_brain/learnings/smuggled.md` — under a rendered H2.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues.join('; ')).toMatch(
      /a setext underline|contains a code fence|a raw HTML block/,
    );
  });
});

describe('phase 6 round 7 regressions', () => {
  it('[R7-P1-1] ambiguity is a flag, not a path a repo could create', () => {
    const doc = [
      '## Durable Artifacts',
      '',
      '- `_brain/learnings/a.md` — one',
      '',
      '## Durable Artifacts',
      '',
      '- `_brain/learnings/b.md` — two',
      '',
    ].join('\n');
    const strict = declaredArtifactsStrict(doc);
    expect(strict.ambiguous).toBe(true);
    expect(strict.paths).toEqual([]);
  });

  it('[R7-P1-2] a double-backtick span does not open a comment', () => {
    const doc = [
      '## Durable Artifacts',
      '',
      '- `_brain/learnings/output.md` — the record',
      '``<!--``',
      '- `docs/must-change.md` — a promise that must not vanish',
      '',
    ].join('\n');
    expect(declaredArtifactsStrict(doc).paths).toEqual([
      '_brain/learnings/output.md',
      'docs/must-change.md',
    ]);
  });

  it('[R7-P1-3] removing a comment does not splice a heading into existence', () => {
    // `##<!-- --> Changelog` is a paragraph: `##` is not followed by whitespace.
    const doc = [
      '# PRD',
      '',
      '##<!-- --> Changelog',
      '',
      '| Date | Author | Changes |',
      '| ---- | ------ | ------- |',
      '| 2026-07-25 | owner | dropped `_brain/adr/ADR-0001-x.md` |',
      '',
    ].join('\n');
    expect(changelogApproves(doc, cfg.owners, '_brain/adr/ADR-0001-x.md')).toBe(false);
  });

  it('[R7-P1-4] `#Other` over dashes is refused rather than interpreted', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/real.md` — declared.',
      '',
      '#Other',
      '-----',
      '',
      '- learning: `_brain/learnings/smuggled.md` — under a rendered H2.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues.join('; ')).toMatch(
      /a setext underline|contains a code fence|a raw HTML block/,
    );
  });

  it('[R7-P1-4] and a heading line over dashes is refused too', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/first.md` — declared.',
      '',
      '### A subsection',
      '-----',
      '',
      '- learning: `_brain/learnings/second.md` — still this section.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues.join('; ')).toMatch(
      /a setext underline|contains a code fence|a raw HTML block/,
    );
  });
});

describe('phase 6 round 8 self-attack (before the independent round returned)', () => {
  const outputs = (...lines: string[]): string =>
    ['## Memory Outputs', '', ...lines, ''].join('\n');

  it('an unclosed code span does not swallow the declaration', () => {
    const decl = parseMemoryDeclarations(
      outputs('- learning: `_brain/learnings/x.md` — a rationale with a stray ` backtick'),
    );
    expect(decl.outputs.entries.map((o) => o.path)).toEqual(['_brain/learnings/x.md']);
  });

  it('a stray `-->` with no opener is inert', () => {
    const decl = parseMemoryDeclarations(
      outputs('- learning: `_brain/learnings/x.md` — ends with --> for no reason.'),
    );
    expect(decl.issues).toEqual([]);
    expect(decl.outputs.entries).toHaveLength(1);
  });

  it('an UNMATCHED backtick is literal, so a following fence is still a fence', () => {
    // Round 8: letting an unmatched run open a span across blocks was a
    // fail-open — the fence became span content and a path quoted inside the
    // example counted as declared. CommonMark renders an unmatched run
    // literally, and so does this scanner now.
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/x.md` — a rationale with an ` unmatched run',
      '```markdown',
      '- learning: `_brain/learnings/quoted.md` — inside an example, not declared.',
      '```',
      '',
      '- learning: `_brain/learnings/y.md` — declared.',
      '',
    ].join('\n');
    // The property that matters is the outcome, not which rule produces it: the
    // document is REFUSED and the quoted path is never declared. Which refusal
    // fires has moved twice as the scanner learned CommonMark — round 10's
    // container rule, then round 13's multiline spans, under which this run does
    // open a span (its closer is a single backtick on a later line of the same
    // paragraph, exactly as a renderer reads it).
    const decl = parseMemoryDeclarations(doc);
    expect(decl.issues.length).toBeGreaterThan(0);
    expect(decl.outputs.entries.map((o) => o.path)).not.toContain('_brain/learnings/quoted.md');
  });

  it('a MATCHED span still shields its contents', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/x.md` — a rationale quoting `<!--` inline.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toEqual([]);
  });

  it('an unclosed FENCE makes the document unreadable, and the gate says so', () => {
    const doc = ['# PRD', '', '```', '## Memory Outputs', '', '- none — fenced off.'].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toEqual([
      'the document ends with an unclosed code fence, so its contract sections cannot be read reliably',
    ]);
  });

  it('the comment placeholder appears in no shipped artifact, so it changes no parse', () => {
    const pkg = fileURLToPath(new URL('..', import.meta.url));
    for (const name of ['prd-template.md', 'tasks-template.md', 'readiness-template.md']) {
      expect(readFileSync(join(pkg, 'templates', name), 'utf8')).not.toContain('␀');
    }
  });

  it('a comment spanning several lines masks all of them and nothing else', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/x.md` — declared.',
      '',
      '<!-- a note',
      'that runs on',
      'for a while -->',
      '',
      '- learning: `_brain/learnings/y.md` — also declared.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).outputs.entries.map((o) => o.path)).toEqual([
      '_brain/learnings/x.md',
      '_brain/learnings/y.md',
    ]);
  });
});

describe('phase 6 round 9 regressions', () => {
  it('[R9-P1-1] a pipe-bearing line over dashes is refused', () => {
    // A GFM table needs a DELIMITER row, and a delimiter row carries pipes — so
    // it can never be the dashes-only line the setext pattern requires. The `|`
    // exclusion was pure loss: it kept bullets below a real heading inside the
    // section above it.
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/real.md` — declared.',
      '',
      '| not | a table',
      '---',
      '',
      '- learning: `_brain/learnings/smuggled.md` — below another H2.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues.join('; ')).toMatch(
      /a setext underline|contains a code fence|a raw HTML block/,
    );
  });

  it('[R9-P1-1] and a real table is still a table', () => {
    const doc = [
      '## Changelog',
      '',
      '| Date | Author | Changes |',
      '| ---- | ------ | ------- |',
      '| 2026-07-25 | owner | dropped `_brain/adr/ADR-0001-x.md` |',
      '',
    ].join('\n');
    expect(changelogApproves(doc, cfg.owners, '_brain/adr/ADR-0001-x.md')).toBe(true);
  });

  it('[R9-P1-2] an unreadable INDEX is a store issue, not an empty store', () => {
    // An unclosed comment at the top erased every pointer: readiness and close
    // then accepted `none` while the standalone validator still saw them all.
    const root = mkdtempSync(join(tmpdir(), 'provegate-index-'));
    roots.push(root);
    mkdirSync(join(root, '_brain/learnings'), { recursive: true });
    writeFileSync(
      join(root, '_brain/INDEX.md'),
      ['<!-- a note nobody closed', '', '- [x](learnings/x.md) — hook', ''].join('\n'),
    );
    const store = loadMemoryStore(root, { ...cfg.memory, enabled: true });
    expect(store.records).toEqual([]);
    expect(store.issues[0]).toContain('unclosed HTML comment');
  });
});

describe('phase 6 round 10 regressions', () => {
  it('[R10-P1-1] a comment over a rule is refused, never silently truncating', () => {
    // The `␀` placeholder is not whitespace, so `<!-- note -->` over `---`
    // looked like a setext heading: the section was cut short and a declaration
    // contradicting the reasoned `none` disappeared.
    const doc = [
      '## Memory Outputs',
      '',
      '- none — nothing durable expected.',
      '',
      '<!-- separator note -->',
      '---',
      '',
      '- learning: `_brain/learnings/hidden.md` — actual output.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues.join('; ')).toMatch(
      /a setext underline|contains a code fence|a raw HTML block/,
    );
  });

  it('[R10-P1-2] a fence nested in a list item cannot smuggle a declaration', () => {
    const doc = [
      '## Memory Inputs',
      '',
      '10. ```markdown',
      '    - none — forged inside list-item code.',
      '    ```',
      '',
    ].join('\n');
    // The declaration inside it is not a column-zero bullet, so nothing is read
    // from it — the section declares neither form and says so.
    expect(parseMemoryDeclarations(doc).issues.join('; ')).toMatch(
      /contains a code fence|an ordered list|declares neither/,
    );
  });

  it('[R10-P2-5] `none` takes no value, and only one of them', () => {
    const valued = ['## Memory Inputs', '', '- none: `not-a-disposition` — reason.', ''].join('\n');
    expect(parseMemoryDeclarations(valued).issues).toContainEqual(
      expect.stringContaining('`none` takes no value'),
    );

    const twice = [
      '## Memory Outputs',
      '',
      '- none — one reason.',
      '- none — another reason.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(twice).issues).toContainEqual(
      expect.stringContaining('appears more than once'),
    );
  });

  it('[R10-P2] the `|` case refuses too', () => {
    // Round 10: the "a real table is still a table" assertion stays green if the
    // removed exclusion is restored, so this is the one that must fail.
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/real.md` — declared.',
      '',
      '| not | a table',
      '---',
      '',
      '- learning: `_brain/learnings/smuggled.md` — below another H2.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues.join('; ')).toMatch(
      /a setext underline|contains a code fence|a raw HTML block/,
    );
  });
});

describe('phase 6 round 11 regressions — every one was fail-open', () => {
  it('[R11-P1-1] a bullet inside indented code is not a declaration', () => {
    const doc = ['## Memory Outputs', '', '    - none — indented code.', ''].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toContainEqual(
      expect.stringContaining('an indented code block'),
    );
  });

  it('[R11-P1-1] a bullet inside a raw HTML block is not a declaration', () => {
    const doc = ['## Memory Outputs', '', '<div>', '- none — raw HTML.', '</div>', ''].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toContainEqual(
      expect.stringContaining('a raw HTML block'),
    );
  });

  it('[R11-P1-1] a NESTED bullet is not a top-level declaration', () => {
    const doc = ['## Memory Outputs', '', '-', '  - none — nested list.', ''].join('\n');
    const decl = parseMemoryDeclarations(doc);
    expect(decl.outputs.none).toBe(false);
    expect(decl.outputs.entries).toEqual([]);
  });

  it('[R11-P1-2] a ONE-hyphen underline is refused', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/real.md` — declared.',
      '',
      'Other',
      '-',
      '',
      '- none — forged below another rendered H2.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues.join('; ')).toMatch(
      /a setext underline|contains a code fence|a raw HTML block/,
    );
  });

  it('[R11-P1-3] a rationale hidden in a comment is no rationale', () => {
    const doc = ['## Memory Outputs', '', '- none — <!-- rationale hidden -->', ''].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toContainEqual(
      expect.stringContaining('requires a rationale'),
    );
  });

  it('[R11-P1-4] `none` takes no value, quoted OR unquoted', () => {
    for (const bullet of ['- none: arbitrary-text — reason.', '- none: `quoted` — reason.']) {
      const doc = ['## Memory Inputs', '', bullet, ''].join('\n');
      expect(parseMemoryDeclarations(doc).issues, bullet).toContainEqual(
        expect.stringContaining('`none` takes no value'),
      );
    }
  });

  it('and an ordinary declaration still parses after all of it', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/x.md` — a rationale that wraps',
      '  onto a second line.',
      '',
    ].join('\n');
    const decl = parseMemoryDeclarations(doc);
    expect(decl.issues).toEqual([]);
    expect(decl.outputs.entries[0]!.rationale).toBe('a rationale that wraps onto a second line.');
  });
});

describe('phase 6 round 12 regressions — fail-open, every one', () => {
  it('[R12-P1-1] a `<? … ?>` processing instruction hides no declaration', () => {
    const doc = ['## Memory Outputs', '', '<?probe', '- none — forged.', '?>', ''].join('\n');
    const decl = parseMemoryDeclarations(doc);
    expect(decl.outputs.none).toBe(false);
    expect(decl.issues).toContainEqual(expect.stringContaining('a raw HTML block'));
  });

  it('[R12-P1-2] a comment closing into text above a rule is refused', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- none — baseline.',
      '',
      '<!-- -->Other',
      '-',
      '',
      '- learning: `_brain/learnings/x.md` — contradiction.',
      '',
    ].join('\n');
    // The contradiction must be VISIBLE to the gate, not sliced away by a
    // forged setext heading — so the mutual-exclusion rule fires.
    expect(parseMemoryDeclarations(doc).issues.join('; ')).toMatch(
      /a setext underline|contains a code fence|a raw HTML block/,
    );
  });

  it('[R12-P1-3] an INDEX pointer inside raw HTML is not a pointer', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-index-'));
    roots.push(root);
    mkdirSync(join(root, '_brain/learnings'), { recursive: true });
    writeFileSync(
      join(root, '_brain/INDEX.md'),
      ['# index', '', '<?index', '- [x](learnings/x.md) — hook', '?>', ''].join('\n'),
    );
    const store = loadMemoryStore(root, { ...cfg.memory, enabled: true });
    expect(store.records).toEqual([]);
  });

  it('[R12-P1-4] a rationale that renders as nothing is refused', () => {
    for (const rationale of ['&#32;', '&nbsp;']) {
      const doc = ['## Memory Outputs', '', `- none — ${rationale}`, ''].join('\n');
      expect(parseMemoryDeclarations(doc).issues, rationale).toContainEqual(
        expect.stringContaining('requires a rationale'),
      );
    }
    // Raw inline HTML is refused BY NAME instead — whether `<span hidden>x</span>`
    // or `<br>` displays anything is a DOM question, and round 17 established
    // that guessing at it is the inference the narrowed grammar exists to avoid.
    for (const rationale of ['<br>', '<span></span>', '<span hidden>x</span>']) {
      const doc = ['## Memory Outputs', '', `- none — ${rationale}`, ''].join('\n');
      expect(parseMemoryDeclarations(doc).issues, rationale).toContainEqual(
        expect.stringContaining('raw inline HTML'),
      );
    }
  });

  it('[R12-P2] an autolink on a wrapped rationale line is not a raw HTML block', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- none — See',
      '  <https://example.com> for the rationale.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toEqual([]);
  });
});

describe('phase 6 round 13 regressions (leads the round named before it was cut off)', () => {
  it('[R13-1] a multiline span cannot reach across a rendered list item', () => {
    // A span whose closer is on a later line of the same paragraph is legal —
    // but a column-zero bullet INTERRUPTS the paragraph, so the renderer shows
    // that line as a list item and the reader must too. Round 13 masked it as
    // span interior; round 14 measured the renderer and corrected the rule.
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/real.md` — declared.',
      '',
      'Prose with an open span `foo',
      '- none — inside a multiline code span',
      'bar` and the span closes here.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toContainEqual(
      expect.stringContaining('mutually exclusive'),
    );
  });

  it('[R13-2] a link reference definition over dashes is not a setext heading', () => {
    // A link reference definition is not a paragraph, so dashes under it are a
    // thematic break. Reading them as a heading truncated the section and hid a
    // declaration that contradicted a reasoned `none` — accepted with zero
    // issues, which is the shape that matters.
    const doc = [
      '## Memory Outputs',
      '',
      '- none — baseline.',
      '',
      '[foo]: /url',
      '---',
      '',
      '- learning: `_brain/learnings/x.md` — contradiction.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues.join('; ')).toMatch(
      /a setext underline|contains a code fence|a raw HTML block/,
    );
  });
});

describe('phase 6 round 13 (reframed) regressions', () => {
  it('[R13b-P1-1] a raw HTML block with a blank line inside it stays raw', () => {
    // The block was ended at the blank line, so a declaration below it was read.
    // The section refuses the block outright now, which is what the narrowed
    // grammar buys: the reader does not have to model HTML block lifetimes.
    const doc = [
      '## Memory Outputs',
      '',
      '<script>',
      '',
      '- none — forged.',
      '</script>',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toContainEqual(
      expect.stringContaining('a raw HTML block'),
    );
  });

  it('[R13b-P1-2] a code span cannot carry across a heading', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/real.md` — declared.',
      '',
      'An opener `foo',
      '## Other',
      'bar` closes here.',
      '',
      '- none — under Other, not under Memory Outputs.',
      '',
    ].join('\n');
    const decl = parseMemoryDeclarations(doc);
    expect(decl.outputs.none).toBe(false);
    expect(decl.outputs.entries.map((o) => o.path)).toEqual(['_brain/learnings/real.md']);
  });

  it('[R13b-P1-3] an H1 ends an H2 section', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- learning: `_brain/learnings/real.md` — declared.',
      '',
      '# Other',
      '',
      '- none — under a rank-1 heading.',
      '',
    ].join('\n');
    const decl = parseMemoryDeclarations(doc);
    expect(decl.outputs.none).toBe(false);
    expect(decl.outputs.entries.map((o) => o.path)).toEqual(['_brain/learnings/real.md']);
  });

  it('[R13b-P1-5] an inline tag with a quoted `>` is found, not mis-scanned', () => {
    const doc = ['## Memory Outputs', '', '- none — <span title=">"></span>', ''].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toContainEqual(
      expect.stringContaining('raw inline HTML'),
    );
  });

  it('[R13b-P2] an entity inside a code span is visible text', () => {
    const doc = ['## Memory Outputs', '', '- none — the literal `&#32;` entity.', ''].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toEqual([]);
  });

  it('[R13b-P2] an ordinary ATX heading form is recognized', () => {
    const doc = ['   ## Memory Outputs ##', '', '- none — reasoned.', ''].join('\n');
    const decl = parseMemoryDeclarations(doc);
    expect(decl.outputs.present).toBe(true);
    expect(decl.outputs.none).toBe(true);
  });
});

describe('phase 6 round 14 regressions', () => {
  it('[R14-P1-2] a `<script>` block runs to its closing tag, blank lines included', () => {
    const doc = [
      '<script>',
      '',
      '## Memory Outputs',
      '',
      '- none — hidden inside a script block.',
      '</script>',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).outputs.present).toBe(false);
  });

  it('[R14-P1-3] an HTML block that interrupts a paragraph still refuses', () => {
    const doc = [
      '## Memory Outputs',
      '',
      'Contract note',
      '<div>',
      '- none — hidden.',
      '</div>',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toContainEqual(
      expect.stringContaining('a raw HTML block'),
    );
  });

  it('[R14-P1-4] closing hashes need whitespace before them', () => {
    expect(parseMemoryDeclarations('## Memory Outputs###\n\n- none — x.\n').outputs.present).toBe(
      false,
    );
    expect(parseMemoryDeclarations('## Memory Outputs ###\n\n- none — x.\n').outputs.present).toBe(
      true,
    );
  });

  it('[R14-P2-5] a second paragraph inside a declaration is not indented code', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- none — no durable output is expected.',
      '',
      '    Additional rationale, indented under the item.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toEqual([]);
  });

  it('[R14-P2-6] backticks inside a rationale are not a fence', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- none — examples are irrelevant;',
      '  ```markdown``` is only mentioned as syntax.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toEqual([]);
  });

  it('[R14-P2-7] an email autolink is an autolink', () => {
    const doc = ['## Memory Outputs', '', '- none — ask <owner@example.com>.', ''].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toEqual([]);
  });
});

describe('phase 6 round 15 regressions', () => {
  it('[R15-P1-1] an HTML block ends where the renderer ends it, not at EOF', () => {
    const doc = [
      '<div>',
      'maintainer note',
      '',
      '## Memory Outputs',
      '',
      '- none — no durable output is expected.',
      '',
    ].join('\n');
    // The block ends at the blank line, so the heading and the list are visible.
    const decl = parseMemoryDeclarations(doc);
    expect(decl.outputs.present).toBe(true);
    expect(decl.outputs.none).toBe(true);
    expect(decl.issues).toEqual([]);
  });

  it('[R15-P1-2] a type-6 block tag interrupts a paragraph', () => {
    const doc = [
      '## Memory Outputs',
      '',
      'Introductory prose',
      '<div>',
      '- none — hidden in raw HTML.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toContainEqual(
      expect.stringContaining('a raw HTML block'),
    );
  });

  it('[R15-P2-3] a wrapped inline tag is not a BLOCK, though the rationale refuses it', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '- none — No durable output is expected.',
      '  <br>',
      '  The behavior is fully derivable from tests.',
      '',
    ].join('\n');
    // Not "a raw HTML block" — the section is still a plain bullet list, and a
    // `<br>` on a wrapped continuation line cannot open one. Round 18 moved the
    // refusal up to the section, so the construct named is "raw inline HTML".
    const issues = parseMemoryDeclarations(doc).issues;
    expect(issues).toContainEqual(expect.stringContaining('raw inline HTML'));
    expect(issues.join('; ')).not.toContain('a raw HTML block');
  });

  it('[R15-P2-4] an autolink and a decoded entity are visible rationale', () => {
    for (const rationale of ['<https://example.com/issues/123>', '&#65;', '<owner@example.com>']) {
      const doc = ['## Memory Outputs', '', `- none — ${rationale}`, ''].join('\n');
      expect(parseMemoryDeclarations(doc).issues, rationale).toEqual([]);
    }
  });

  it('[R15-P2-4] but a whitespace entity still renders as nothing', () => {
    const doc = ['## Memory Outputs', '', '- none — &#32;&nbsp;', ''].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toContainEqual(
      expect.stringContaining('requires a rationale'),
    );
  });
});

describe('phase 6 round 16 regressions', () => {
  it('[R16-P1-1] a type-7 tag WITH attributes opens a raw HTML block', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '<x-note class="warning">',
      '- none — hidden.',
      '</x-note>',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toContainEqual(
      expect.stringContaining('a raw HTML block'),
    );
  });

  it('[R16-P1-1] a heading closes a paragraph, so a type-7 tag may open after it', () => {
    const doc = ['## Memory Outputs', '', '### Note', '<x-note>', '- none — hidden.', ''].join(
      '\n',
    );
    expect(parseMemoryDeclarations(doc).issues).toContainEqual(
      expect.stringContaining('a raw HTML block'),
    );
  });

  it('[R16-P1-2] rationale visibility survives NBSP and empty code', () => {
    for (const rationale of ['&#160;', '` `']) {
      const doc = ['## Memory Outputs', '', `- none — ${rationale}`, ''].join('\n');
      expect(parseMemoryDeclarations(doc).issues, rationale).toContainEqual(
        expect.stringContaining('requires a rationale'),
      );
    }
    const tagged = ['## Memory Outputs', '', '- none — <span class="n" title=">"></span>', ''].join(
      '\n',
    );
    expect(parseMemoryDeclarations(tagged).issues).toContainEqual(
      expect.stringContaining('raw inline HTML'),
    );
  });

  it('[R16-P1-2] and real content inside a code span still counts', () => {
    const doc = ['## Memory Outputs', '', '- none — the flag is `--dry-run`.', ''].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toEqual([]);
  });

  it('[R16-P2-3] a CRLF blank line terminates an HTML block', () => {
    const doc = [
      '<div>',
      'note',
      '',
      '## Memory Outputs',
      '',
      '- none — no durable output is expected.',
      '',
    ].join('\r\n');
    const decl = parseMemoryDeclarations(doc);
    expect(decl.outputs.present).toBe(true);
    expect(decl.outputs.none).toBe(true);
  });

  it('[R16-P2-4] `<style-guide>` is a custom element, not a `<style>` block', () => {
    const doc = [
      '<style-guide>',
      '',
      '## Memory Outputs',
      '',
      '- none — no durable output is expected.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).outputs.present).toBe(true);
  });
});

describe('phase 6 round 17 regressions (the confirming round)', () => {
  it('[R17-1] a completed comment closes no paragraph, so the next tag opens a block', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '<!-- note -->',
      '<x-note>',
      '- none — hidden.',
      '</x-note>',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toContainEqual(
      expect.stringContaining('a raw HTML block'),
    );
  });

  it('[R17-1] a blockquote and an ordered list are refused, not approximated', () => {
    const quoted = ['## Memory Outputs', '', '> - none — inside a quote.', ''].join('\n');
    expect(parseMemoryDeclarations(quoted).issues).toContainEqual(
      expect.stringContaining('a block quote'),
    );
    const ordered = ['## Memory Outputs', '', '1. none — inside an ordered list.', ''].join('\n');
    expect(parseMemoryDeclarations(ordered).issues).toContainEqual(
      expect.stringContaining('an ordered list'),
    );
  });

  it('[R17-2] a named whitespace entity is not a rationale', () => {
    for (const entity of ['&Tab;', '&NewLine;', '&ZeroWidthSpace;']) {
      const doc = ['## Memory Outputs', '', `- none — ${entity}`, ''].join('\n');
      expect(parseMemoryDeclarations(doc).issues, entity).toContainEqual(
        expect.stringContaining('requires a rationale'),
      );
    }
  });

  it('[R17-2] and a known visible entity still is one', () => {
    const doc = ['## Memory Outputs', '', '- none — nothing here &mdash; truly nothing.', ''].join(
      '\n',
    );
    expect(parseMemoryDeclarations(doc).issues).toEqual([]);
  });

  it('[R17-3] an out-of-range numeric reference renders literally', () => {
    const doc = ['## Memory Outputs', '', '- none — &#99999999;', ''].join('\n');
    // It is not a character reference, so a renderer shows the text — which is
    // a rationale, however odd. The point is that it does not throw.
    expect(parseMemoryDeclarations(doc).issues).toEqual([]);
  });

  it('[R17-3] `<3>` is visible text, not a tag', () => {
    const doc = ['## Memory Outputs', '', '- none — the team said <3>.', ''].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toEqual([]);
  });
});

describe('phase 6 round 18 regressions', () => {
  const NBSP = '\u00a0';
  const LINE_SEPARATOR = '\u2028';
  const ZERO_WIDTH_SPACE = '\u200b';
  const VERTICAL_TAB = '\u000b';

  it('[R18-1] a code-span lookahead cannot reach across a fence or an HTML block', () => {
    // A lone backtick in prose found its "closer" on the FENCE line, so the
    // scanner masked the fence opener as span content and never opened the
    // fence — leaving an entire forged contract to be read out of rendered code.
    for (const interrupt of ['~~~ `', '<div> `']) {
      const doc = ['Prose `open', interrupt, '## Memory Outputs', '- none — forged.', ''].join('\n');
      const decl = parseMemoryDeclarations(doc);
      expect(decl.outputs.none, interrupt).toBe(false);
      expect(decl.outputs.entries, interrupt).toEqual([]);
    }
    // A backtick fence reaches the same stop, one line further down: its own
    // info string may hold no backtick, so the closer the lookahead would have
    // found sits below the fence rather than on it.
    const backtickFence = [
      'Prose `open',
      '```',
      'code `',
      '## Memory Outputs',
      '- none — forged.',
      '',
    ].join('\n');
    const fenced = parseMemoryDeclarations(backtickFence);
    expect(fenced.outputs.none).toBe(false);
    expect(fenced.outputs.entries).toEqual([]);
    // But the stop must use the scanner's own fence predicate: ` ```` ` ` is NOT
    // a fence, because a backtick fence's info string may not contain a
    // backtick, so the span closes there and the heading below it is real.
    const notAFence = ['Prose `open', '```` `', '## Memory Outputs', '', '- none — shown.', ''].join(
      '\n',
    );
    expect(parseMemoryDeclarations(notAFence).outputs.none).toBe(true);
  });

  it('[R18-2] only spaces and tabs may follow a closing fence', () => {
    // `.trim()` removes every Unicode blank, so a trailing NBSP closed the fence
    // here and left it open in the renderer.
    const doc = ['```', '```' + NBSP, '## Memory Outputs', '- none — forged.', ''].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toContainEqual(
      expect.stringContaining('an unclosed code fence'),
    );
    // A closing fence followed by ordinary trailing spaces still closes.
    const closed = ['```', '```  ', '## Memory Outputs', '', '- none — reasoned.', ''].join('\n');
    expect(parseMemoryDeclarations(closed).issues).toEqual([]);
  });

  it('[R18-3] the scanner and the heading matcher share one line model', () => {
    // The scanner split on LF while every `/m` regex also broke on a bare CR, so
    // a CR document had a fence the scanner never saw and a heading the matcher
    // did.
    const bareCr = '```\r## Memory Outputs\r- none — forged.\r';
    expect(parseMemoryDeclarations(bareCr).issues).toContainEqual(
      expect.stringContaining('an unclosed code fence'),
    );
    // CRLF is the same line model and must still parse.
    const crlf = ['## Memory Outputs', '', '- none — reasoned.', ''].join('\r\n');
    expect(parseMemoryDeclarations(crlf).issues).toEqual([]);
    expect(parseMemoryDeclarations(crlf).outputs.none).toBe(true);
  });

  it('[R18-4] a U+2028 does not end a line, so the heading after one is not a heading', () => {
    // Round 18 refused any document containing one, because `/m` anchored a
    // heading where CommonMark shows none. Round 19 showed the refusal was too
    // wide — a separator inside a fenced example refused a good contract — so
    // the section slicer walks scanned LINES instead and the regex is gone.
    const doc = 'intro' + LINE_SEPARATOR + '## Memory Outputs\n- none — forged.\n';
    const decl = parseMemoryDeclarations(doc);
    expect(decl.outputs.present).toBe(false);
    expect(decl.outputs.none).toBe(false);
    // And one inside displayed code refuses nothing at all.
    const fenced = [
      '```',
      'ordinary' + LINE_SEPARATOR + 'text',
      '```',
      '',
      '## Memory Outputs',
      '',
      '- none — reasoned.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(fenced).issues).toEqual([]);
    expect(parseMemoryDeclarations(fenced).outputs.none).toBe(true);
  });

  it('[R18-5] raw inline HTML anywhere in a section is refused, not only in a rationale', () => {
    // A renderer's HTML parser closes the paragraph at the `<div>` and swallows
    // the list after it, so the declaration is in the source and not on the page.
    const doc = ['## Memory Outputs', '', 'note <div hidden>', '- none — forged.', ''].join('\n');
    const decl = parseMemoryDeclarations(doc);
    expect(decl.issues).toContainEqual(expect.stringContaining('raw inline HTML'));
    expect(decl.outputs.none).toBe(false);
  });

  it('[R18-6] a zero-width character is not a rationale', () => {
    for (const rationale of ['&#8203;', '&#8288;', '&shy;', ZERO_WIDTH_SPACE, '&#xFEFF;']) {
      const doc = ['## Memory Outputs', '', `- none — ${rationale}`, ''].join('\n');
      expect(parseMemoryDeclarations(doc).issues, JSON.stringify(rationale)).toContainEqual(
        expect.stringContaining('requires a rationale'),
      );
    }
  });

  it('[R18-7] only the KNOWN-invisible names are invisible; everything else is ink', () => {
    // Three rounds moved this rule. Counting an unknown name invisible let
    // `&Tab;` stand in for a rationale AND refused `&AElig;`; refusing unknown
    // names by name then invented a character reference out of `&bogus;`, which
    // a renderer displays literally. Enumerating the small invisible set and
    // treating everything else as ink is honest in both directions.
    for (const rationale of ['&AElig;', '&bogus;', '\\&AElig;']) {
      const doc = ['## Memory Outputs', '', `- none — ${rationale}`, ''].join('\n');
      expect(parseMemoryDeclarations(doc).issues, rationale).toEqual([]);
    }
    // A known-invisible name keeps its round 17 behavior.
    const tab = ['## Memory Outputs', '', '- none — &Tab;', ''].join('\n');
    expect(parseMemoryDeclarations(tab).issues).toContainEqual(
      expect.stringContaining('requires a rationale'),
    );
    // A known-visible one is still a rationale, and one inside a code span is
    // literal text rather than a reference at all.
    const visible = ['## Memory Outputs', '', '- none — nothing &mdash; truly nothing.', ''].join(
      '\n',
    );
    expect(parseMemoryDeclarations(visible).issues).toEqual([]);
    const spanned = ['## Memory Outputs', '', '- none — the literal `&AElig;` entity.', ''].join(
      '\n',
    );
    expect(parseMemoryDeclarations(spanned).issues).toEqual([]);
  });

  it('[R18-8] a tag needs tag whitespace, so a vertical tab inside one is visible text', () => {
    // Refusing this named a construct the page does not contain — the same
    // defect as reading a declaration that is not there, pointed the other way.
    const doc = [
      '## Memory Outputs',
      '',
      '<x' + VERTICAL_TAB + 'class=y>',
      '- none — shown.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toEqual([]);
    expect(parseMemoryDeclarations(doc).outputs.none).toBe(true);
  });

  it('[R18-9] a setext contract heading is named, not reported missing', () => {
    const doc = ['Memory Outputs', '--------------', '', '- none — shown.', ''].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toContainEqual(
      expect.stringContaining('setext heading'),
    );
  });

  it('[R18-10] a tab opens an indented code block, like four spaces', () => {
    const doc = ['## Memory Outputs', '', '\t- none — code.', ''].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toContainEqual(
      expect.stringContaining('an indented code block'),
    );
  });
});

describe('phase 6 round 19 regressions — one scan, one authority', () => {
  const SEPARATOR = '\u2028';

  it('[R19-1] a commented-out heading cannot cut the section short', () => {
    // The scanner masked the comment and the container check re-sliced the RAW
    // document, so the raw section ended at `## Other` and the inline-HTML
    // defense never saw the rest of it. Both now read the same scanned lines.
    const doc = [
      '## Memory Outputs',
      '',
      '<!--',
      '## Other',
      '-->',
      'note <div hidden>',
      '- none — forged.',
      '',
    ].join('\n');
    const decl = parseMemoryDeclarations(doc);
    expect(decl.issues).toContainEqual(expect.stringContaining('raw inline HTML'));
    expect(decl.outputs.none).toBe(false);
  });

  it('[R19-2] the code-span lookahead stops at an HTML comment too', () => {
    // Comments are block type 2 and live in the scanner's own state rather than
    // in `htmlBlockEnd`, so the round 18 fix missed them — the same exploit with
    // `<!--` substituted for `<div>`.
    const doc = [
      'Prose `open',
      '<!-- `',
      '## Memory Outputs',
      '- none — forged.',
      '-->',
      '',
    ].join('\n');
    const decl = parseMemoryDeclarations(doc);
    expect(decl.outputs.present).toBe(false);
    expect(decl.outputs.none).toBe(false);
  });

  it('[R19-3] indented code closes no paragraph, so a type-7 tag under it opens a block', () => {
    const doc = ['    code', '<x-note>', '## Memory Outputs', '- none — forged.', ''].join('\n');
    const decl = parseMemoryDeclarations(doc);
    expect(decl.outputs.present).toBe(false);
    expect(decl.outputs.none).toBe(false);
  });

  it('[R19-4] an unterminated inline comment is literal text, and a heading interrupts it', () => {
    // `Prose <!-- open` has no closer before the paragraph ends, so a renderer
    // shows the opener and the heading below it. Comment state used to run
    // across the heading and lose a declaration the page displays.
    const doc = ['Prose <!-- open', '## Memory Outputs', '- none — shown.', '-->', ''].join('\n');
    const decl = parseMemoryDeclarations(doc);
    expect(decl.outputs.none).toBe(true);
    expect(decl.issues).toEqual([]);
    // A comment that OPENS a line is an HTML block and still runs to its closer.
    const block = ['<!-- open', '## Memory Outputs', '- none — hidden.', '-->', ''].join('\n');
    expect(parseMemoryDeclarations(block).outputs.present).toBe(false);
  });

  it('[R19-5] a comment opener inside indented code is literal text', () => {
    const doc = ['    <!--', '## Memory Outputs', '- none — shown.', '-->', ''].join('\n');
    const decl = parseMemoryDeclarations(doc);
    expect(decl.outputs.none).toBe(true);
    expect(decl.issues).toEqual([]);
  });

  it('[R19-6] a block marker written inside a comment is not a block', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '<!--',
      '> not a quote',
      '-->',
      '- none — shown.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toEqual([]);
    expect(parseMemoryDeclarations(doc).outputs.none).toBe(true);
  });

  it('[R19-7] `<!-->` and `<!--->` are complete comments', () => {
    for (const short of ['<!-->', '<!--->']) {
      const doc = [short, '## Memory Outputs', '', '- none — shown.', ''].join('\n');
      expect(parseMemoryDeclarations(doc).issues, short).toEqual([]);
      expect(parseMemoryDeclarations(doc).outputs.none, short).toBe(true);
    }
  });

  it('[R19-8] a backslash escapes the character after it', () => {
    const doc = ['## Memory Outputs', '', '- none — write \\<span> literally.', ''].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toEqual([]);
    // The escape does not smuggle a real tag past the refusal.
    const real = ['## Memory Outputs', '', '- none — <span hidden>x</span>', ''].join('\n');
    expect(parseMemoryDeclarations(real).issues).toContainEqual(
      expect.stringContaining('raw inline HTML'),
    );
  });

  it('[R19-10] a setext heading written inside a fence is code, not a heading', () => {
    const doc = ['```', 'Memory Outputs', '--------------', '```', ''].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toEqual([]);
    // The real setext form is still named.
    const setext = ['Memory Outputs', '--------------', '', '- none — shown.', ''].join('\n');
    expect(parseMemoryDeclarations(setext).issues).toContainEqual(
      expect.stringContaining('setext heading'),
    );
  });

  it('[R19-11] a separator inside displayed code refuses nothing', () => {
    const doc = [
      '```',
      'ordinary' + SEPARATOR + 'text',
      '```',
      '',
      '## Memory Outputs',
      '',
      '- none — reasoned.',
      '',
    ].join('\n');
    expect(parseMemoryDeclarations(doc).issues).toEqual([]);
  });

  it('[R19-12] a `+` list is named, and its indented line is not called code', () => {
    const doc = [
      '## Memory Outputs',
      '',
      '+ item',
      '',
      '\tcontinuation',
      '',
      '- none — rationale.',
      '',
    ].join('\n');
    const issues = parseMemoryDeclarations(doc).issues;
    expect(issues).toContainEqual(expect.stringContaining('`+` or `*` bullet list'));
    expect(issues.join('; ')).not.toContain('an indented code block');
  });
});
