import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateReviewArtifact } from '../src/core/gates/review.js';
import { repoPath } from './helpers/repo-reads.js';

/** FR-1 / W3: quorum arithmetic — integer math, N*5 >= M*3 for a pass verdict. */

const artifact = (verdict: string, quorum: string): string =>
  [
    '> **PRD:** PRD-004',
    `> **Verdict:** ${verdict}`,
    '> **Reviewer:** sample-reviewer',
    '> **Base SHA:** `abc1234def`',
    '> **Critical:** 0',
    `> **Quorum:** ${quorum}`,
  ].join('\n');

describe('quorum arithmetic (W3 boundaries)', () => {
  const passCases = ['3/5 pass', '1/1 pass', '5/5 pass', '2/3 pass', '4/5 pass'];
  const failCases = ['2/5 pass', '1/2 pass', '0/5 pass', '2/4 pass'];

  for (const q of passCases) {
    it(`pass verdict with ${q} validates (ratio >= 3/5)`, () => {
      expect(validateReviewArtifact(artifact('pass', q)).issues).toEqual([]);
    });
  }

  for (const q of failCases) {
    it(`pass verdict with ${q} fails the panel gate`, () => {
      expect(validateReviewArtifact(artifact('pass', q)).issues).toContainEqual(
        expect.stringContaining('below the 3/5 panel gate'),
      );
    });
  }

  it('fail verdicts are not ratio-gated (a failing panel may report any quorum)', () => {
    expect(validateReviewArtifact(artifact('fail', '1/5 pass')).issues).toEqual([]);
  });

  it('malformed and invalid forms are issues regardless of verdict', () => {
    for (const q of ['5/3 pass', '0/0 pass', 'x/y pass', '3/5', 'three of five pass']) {
      const issues = validateReviewArtifact(artifact('fail', q)).issues;
      expect(issues.length, q).toBeGreaterThan(0);
      expect(issues.join(' '), q).toMatch(/malformed|invalid/);
    }
  });

  it('contradictory or freeform tails after `pass` are malformed (no `\\b` smuggling)', () => {
    for (const q of ['3/5 pass/2/5 fail', '3/5 passX', '3/5 pass but actually fail', '3/5 pass.']) {
      const issues = validateReviewArtifact(artifact('pass', q)).issues;
      expect(issues.join(' '), q).toMatch(/malformed/);
    }
  });

  it('a ` (`-opened annotation is legal, closed or line-truncated', () => {
    for (const q of ['3/5 pass (one abstention)', '1/1 pass (single cross-model reviewer over']) {
      expect(validateReviewArtifact(artifact('pass', q)).issues, q).toEqual([]);
    }
  });

  it('counts above 3 digits are malformed — unbounded digits could break safe-integer math', () => {
    const huge = '5404319552844595/9007199254740993 pass';
    const issues = validateReviewArtifact(artifact('pass', huge)).issues;
    expect(issues.join(' ')).toMatch(/malformed/);
  });
});

describe('historical review artifacts remain valid (no retro-breakage)', () => {
  const reviewsDir = repoPath('_docs/reviews');

  it('every archived review artifact still validates under the new arithmetic', () => {
    const files = readdirSync(reviewsDir).filter((f) => f.endsWith('.md'));
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const file of files) {
      const content = readFileSync(join(reviewsDir, file), 'utf8');
      const check = validateReviewArtifact(content);
      expect(check.issues, file).toEqual([]);
    }
  });
});
