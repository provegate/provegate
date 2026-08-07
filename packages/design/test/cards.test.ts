import { describe, expect, it } from 'vitest';
import { handoffCard, stopCard } from '../src/cli/cards.js';
import { statusLine } from '../src/cli/status-line.js';

// FR-11 — the card text must reproduce packages/provegate/src/core/run/cards.ts
// byte-for-byte. These fixtures pin the exact lines; PRD-011 wires the provegate
// CLI to consume THIS builder, so the two surfaces cannot drift.

const BAR56 = '────────────────────────────────────────────────────────'; // 56 dashes

describe('handoffCard (byte-exact)', () => {
  const card = handoffCard({
    id: 'PRD-001',
    slug: 'fix-login-timeout',
    branch: 'feat/prd-001-fix-login-timeout',
    base: 'main',
    diffstat: '6 files changed, 214 insertions(+), 12 deletions(-)',
    results: [
      ['phase 4: typecheck + lint + build', 'passed'],
      ['phase 5: §11 verification commands', 'passed'],
    ],
    operatorRows: 0,
    autonomousClose: 'operator-gated',
    metricsHint: '_state/metrics.jsonl (local JSONL, yours)',
  });
  const lines = card.split('\n');

  it('opens with the HANDOFF CARD header and closes with the 56-char rule', () => {
    expect(lines[0]).toBe(`┌─ HANDOFF CARD ${BAR56.slice(15)}`);
    expect(lines.at(-1)).toBe(`└${BAR56}`);
  });

  it('renders passed rows with ✓ under the │ gutter', () => {
    expect(card).toContain('│   ✓ phase 4: typecheck + lint + build');
    expect(card).toContain('│   ✓ phase 5: §11 verification commands');
  });

  it('carries the load-bearing final line verbatim', () => {
    expect(card).toContain('│ → READY TO PUSH — run `git push` yourself (the runner never pushes)');
    expect(card).toContain('│ operator rows: 0 | Autonomous Close: operator-gated');
  });
});

describe('stopCard (byte-exact)', () => {
  const card = stopCard({
    id: 'PRD-001',
    phase: '5 Testing',
    why: 'command failed: pnpm test',
    results: [
      ['phase 4: typecheck', 'passed'],
      ['phase 5: §11', 'FAILED'],
    ],
  });

  it('renders a failed row with ✗ and the stop guidance', () => {
    expect(card).toContain('│   ✓ phase 4: typecheck');
    expect(card).toContain('│   ✗ phase 5: §11');
    expect(card).toContain(
      '│ worktree left intact — fix and re-run with --from-phase=N, or hand back to a human',
    );
    expect(card.split('\n').at(-1)).toBe(`└${BAR56}`);
  });
});

describe('statusLine', () => {
  it('renders the glyph · phase · name · detail · verdict grammar', () => {
    expect(
      statusLine({ phase: '4', name: 'implementation', detail: 'exit 0', verdict: 'passed' }),
    ).toBe('✓ phase 4 · implementation · exit 0 · passed');
    expect(statusLine({ phase: '5', name: 'testing', verdict: 'failed' })).toBe(
      '✗ phase 5 · testing · failed',
    );
  });
});
