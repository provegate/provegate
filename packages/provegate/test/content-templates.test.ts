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
import { buildState } from '../src/core/state/build.js';
import { statusPanelMetrics } from '../src/core/state/query.js';

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
      .replace('> **Critical:** 0', `> **Critical:** ${critical}`)
      .replace(
        '> **Quorum:** [N/M pass — e.g. 3/5 for a panel, 1/1 for a single cross-model reviewer]',
        '> **Quorum:** 1/1 pass',
      );

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
        '> **Quorum:** 1/1 pass',
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
