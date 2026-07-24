// @vitest-environment jsdom
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Button, VerdictBadge, GateLine, EvidenceTable, type Verdict } from '../src/react/index.js';

const VERDICTS: Verdict[] = ['passed', 'failed', 'partial', 'skipped', 'operator', 'blocked'];
const GLYPHS: Record<Verdict, string> = {
  passed: '✓',
  failed: '✗',
  partial: '⚠',
  skipped: '=',
  operator: '→',
  blocked: '!',
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('colour law (FR-3/FR-4/FR-7)', () => {
  it('Button never renders a green variant', () => {
    for (const variant of ['primary', 'secondary', 'ghost'] as const) {
      const { container } = render(<Button variant={variant}>x</Button>);
      const el = container.firstElementChild as HTMLElement;
      // No green token appears in the button's inline style, any variant.
      expect(el.getAttribute('style') ?? '', variant).not.toMatch(/--pg-(pass|green|accent)/);
    }
  });

  it('VerdictBadge is green ONLY for passed', () => {
    for (const v of VERDICTS) {
      const { container } = render(<VerdictBadge verdict={v} />);
      const style = (container.firstElementChild as HTMLElement).getAttribute('style') ?? '';
      const green = /--pg-pass/.test(style);
      expect(green, `${v} green=${green}`).toBe(v === 'passed');
    }
  });

  it('EvidenceTable turns the exit cell red ONLY on failed', () => {
    const { container } = render(
      <EvidenceTable
        rows={[
          { check: 'a', verdict: 'passed', code: 0 },
          { check: 'b', verdict: 'failed', code: 1 },
          { check: 'c', verdict: 'blocked', code: 2 },
        ]}
      />,
    );
    const exitCells = [...container.querySelectorAll('tbody tr')].map(
      (tr) => (tr.children[3] as HTMLElement).getAttribute('style') ?? '',
    );
    expect(/--pg-fail/.test(exitCells[0]!)).toBe(false); // passed
    expect(/--pg-fail/.test(exitCells[1]!)).toBe(true); // failed
    expect(/--pg-fail/.test(exitCells[2]!)).toBe(false); // blocked (not a failure)
  });
});

describe('the closed verdict grammar (FR-4)', () => {
  it('every verdict renders its exact glyph, in GateLine and VerdictBadge', () => {
    for (const v of VERDICTS) {
      const gl = render(<GateLine status={v} name="x" />);
      expect(gl.container.textContent, `GateLine ${v}`).toContain(GLYPHS[v]);
      gl.unmount();
      const vb = render(<VerdictBadge verdict={v} />);
      expect(vb.container.textContent, `VerdictBadge ${v}`).toContain(GLYPHS[v]);
      expect(vb.container.textContent).toContain(v);
      vb.unmount();
    }
  });
});

describe('token-only styling (FR-10)', () => {
  it('no component authors a raw hex or a font stack — all via --pg-*', () => {
    const dir = resolve(__dirname, '../src/react');
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.tsx'))) {
      const src = readFileSync(resolve(dir, file), 'utf8');
      expect(src, `${file} hex`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      // fontFamily must always be a --pg-font-* token, never a literal stack
      for (const m of src.matchAll(/fontFamily:\s*(['"`])(.*?)\1/g)) {
        expect(m[2], `${file} fontFamily`).toContain('--pg-font');
      }
    }
  });
});
