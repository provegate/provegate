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
  normalizeTarget,
  outputsMissingFromDurable,
  parseMemoryDeclarations,
  watchMatches,
} from '../src/core/memory/artifacts.js';
import { buildState } from '../src/core/state/build.js';
import { statusPanelMetrics } from '../src/core/state/query.js';
import { declaredArtifacts } from '../src/core/run/durable.js';

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
