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

  it('the typing caret stops animating under reduced motion', () => {
    expect(globals).toContain('.pg-caret');
    const reduceBlocks = globals.split('prefers-reduced-motion: reduce').slice(1).join('\n');
    expect(reduceBlocks).toMatch(/\.pg-caret\s*\{\s*animation:\s*none/);
  });
});

// The interactive sections added with the prototype parity pass are keyboard-
// and screen-reader-wired in the components themselves (role=tablist/tab +
// aria-selected, aria-expanded/aria-controls, aria-pressed). Here we assert the
// LAYOUT half: every multi-column grid has a single-column breakpoint, so no
// section can force the body to scroll sideways on a phone.
describe('responsive layout', () => {
  const GRIDS = [
    'pg-hero',
    'pg-how-grid',
    'pg-install-grid',
    'pg-play-grid',
    'pg-cmp-grid',
    'pg-faq-grid',
    'pg-proof-grid',
    'pg-problem-grid',
    'pg-footer-grid',
    'pg-phasedetail',
  ];

  it('every multi-column grid collapses at a breakpoint', () => {
    const responsive = globals.slice(globals.indexOf('@media (max-width: 900px)'));
    for (const cls of GRIDS) {
      expect(responsive, cls).toContain(`.${cls}`);
    }
  });

  it('the primary nav becomes a drawer below 900px', () => {
    const responsive = globals.slice(globals.indexOf('@media (max-width: 900px)'));
    expect(responsive).toContain('.pg-navlinks');
    expect(responsive).toContain('.pg-navtoggle');
  });

  it('a visually-hidden helper exists for controls named only by chrome', () => {
    expect(globals).toContain('.pg-visually-hidden');
  });
});
