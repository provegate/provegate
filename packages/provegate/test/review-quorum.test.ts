import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateReviewArtifact } from '../src/core/gates/review.js';

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
});

describe('historical review artifacts remain valid (no retro-breakage)', () => {
  const reviewsDir = fileURLToPath(new URL('../../../_docs/reviews', import.meta.url));

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
