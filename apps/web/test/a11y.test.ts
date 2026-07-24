import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// FR-6 — the machine-checkable half of a11y. The design tokens' WCAG contrast is
// already proven in @provegate/design (its contrast test). Here we assert the
// page's motion is reduced-motion-gated and the reveal degrades to visible.
// The rest — visible focus rings, no horizontal scroll at 375px, real-browser
// contrast — are operator rows (a real browser), never `skipped`.

const globals = readFileSync(resolve(__dirname, '../app/globals.css'), 'utf8');

describe('motion respects prefers-reduced-motion', () => {
  it('reveal transitions are gated behind prefers-reduced-motion: no-preference', () => {
    expect(globals).toMatch(/@media\s*\(prefers-reduced-motion:\s*no-preference\)/);
    // and an explicit reduce branch forces the finished state
    expect(globals).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it('the reduce branch removes opacity/transform (renders the finished state)', () => {
    const reduce = globals.slice(globals.indexOf('prefers-reduced-motion: reduce'));
    expect(reduce).toContain('opacity: 1');
    expect(reduce).toContain('transform: none');
    expect(reduce).toContain('transition: none');
  });

  it('the body never scrolls horizontally (wide blocks scroll in-container)', () => {
    expect(globals).toMatch(/overflow-x:\s*hidden/);
  });

  it('a visible focus ring is wired to the human-authority token', () => {
    expect(globals).toMatch(/:focus-visible/);
    expect(globals).toContain('--pg-ring');
  });
});
