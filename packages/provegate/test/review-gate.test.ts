import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import {
  extractReviewArtifactPath,
  validateReviewArtifact,
  validateTasksReviewRow,
} from '../src/core/gates/review.js';

const cfg = DEFAULT_CONFIG;

const VALID_META = [
  '> **PRD:** PRD-002',
  '> **Verdict:** pass',
  '> **Reviewer:** codex (gpt-x)',
  '> **Base SHA:** `abc1234def`',
  '> **Critical:** 0',
  '> **Quorum:** 1/1 pass',
].join('\n');

const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('validateReviewArtifact', () => {
  it('accepts a complete metadata block', () => {
    const check = validateReviewArtifact(VALID_META, { expectedId: 'PRD-002' });
    expect(check.ok).toBe(true);
    expect(check.meta?.critical).toBe(0);
  });

  it('reports each missing field distinctly', () => {
    const check = validateReviewArtifact('# empty');
    expect(check.ok).toBe(false);
    expect(check.issues.length).toBe(6);
  });

  it('rejects pass-with-critical contradiction', () => {
    const content = VALID_META.replace('> **Critical:** 0', '> **Critical:** 2');
    const check = validateReviewArtifact(content);
    expect(check.issues).toContainEqual(expect.stringContaining('Verdict is pass but Critical=2'));
  });

  it('rejects id mismatch', () => {
    const check = validateReviewArtifact(VALID_META, { expectedId: 'PRD-009' });
    expect(check.issues).toContainEqual(expect.stringContaining('does not match expected PRD-009'));
  });
});

describe('extractReviewArtifactPath / validateTasksReviewRow', () => {
  const LEDGER_ROW = (result: string, artifact = '_docs/reviews/review-002-x.md') =>
    [
      '| Gate | Command | Result |',
      '| ---- | ------- | ------ |',
      `| independent-review | ${artifact} | ${result} |`,
    ].join('\n');

  it('extracts the artifact path from the ledger row (config-driven pattern)', () => {
    expect(extractReviewArtifactPath(cfg, LEDGER_ROW('passed'))).toBe(
      '_docs/reviews/review-002-x.md',
    );
  });

  it('fails on missing row, failed verdict, missing artifact, bad schema', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-review-'));
    roots.push(root);

    expect(validateTasksReviewRow(cfg, root, 'no rows here', 2).ok).toBe(false);
    expect(validateTasksReviewRow(cfg, root, LEDGER_ROW('failed'), 2).ok).toBe(false);
    expect(
      validateTasksReviewRow(cfg, root, '| independent-review | nothing | passed |', 2).ok,
    ).toBe(false);
    // artifact named but absent on disk
    expect(validateTasksReviewRow(cfg, root, LEDGER_ROW('passed'), 2).issues).toContainEqual(
      expect.stringContaining('not found'),
    );
    // artifact present but schema-poor
    mkdirSync(resolve(root, '_docs/reviews'), { recursive: true });
    writeFileSync(resolve(root, '_docs/reviews/review-002-x.md'), '# no metadata');
    expect(validateTasksReviewRow(cfg, root, LEDGER_ROW('passed'), 2).ok).toBe(false);
  });

  it('passes with a schema-complete artifact matching the PRD id', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-review-'));
    roots.push(root);
    mkdirSync(resolve(root, '_docs/reviews'), { recursive: true });
    writeFileSync(resolve(root, '_docs/reviews/review-002-x.md'), VALID_META);
    const check = validateTasksReviewRow(cfg, root, LEDGER_ROW('passed'), 2);
    expect(check.ok).toBe(true);
    expect(check.artifact).toBe('_docs/reviews/review-002-x.md');
  });
});

describe('codex review regressions (round 1)', () => {
  it('negative or forged Critical values never satisfy the contract', () => {
    const neg = VALID_META.replace('> **Critical:** 0', '> **Critical:** -1');
    expect(validateReviewArtifact(neg).issues).toContainEqual(
      expect.stringContaining('missing numeric'),
    );
    const forged = VALID_META.replace('> **Critical:** 0', '> **Critical:** 0 forged');
    expect(validateReviewArtifact(forged).issues).toContainEqual(
      expect.stringContaining('missing numeric'),
    );
  });

  it('id matching is exact-token: PRD-0020 is not evidence for PRD-002', () => {
    const other = VALID_META.replace('> **PRD:** PRD-002', '> **PRD:** PRD-0020');
    expect(validateReviewArtifact(other, { expectedId: 'PRD-002' }).issues).toContainEqual(
      expect.stringContaining('does not match expected PRD-002'),
    );
  });
});
