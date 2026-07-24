// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import * as S from '../app/sections/index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the landing narrative (FR-2/FR-9)', () => {
  it('all narrative sections are exported', () => {
    for (const name of [
      'Nav',
      'Hero',
      'Problem',
      'CoreRule',
      'Method',
      'RunWalkthrough',
      'Refusal',
      'EvidenceLedger',
      'Proof',
      'Positioning',
      'CommandRef',
      'Footer',
    ] as const) {
      expect(typeof S[name], name).toBe('function');
    }
  });

  it('the page composes the sections in the handoff order', () => {
    const src = readFileSync(resolve(__dirname, '../app/page.tsx'), 'utf8');
    const order = [
      'Nav',
      'Hero',
      'Problem',
      'CoreRule',
      'Method',
      'RunWalkthrough',
      'Refusal',
      'EvidenceLedger',
      'Proof',
      'Positioning',
      'CommandRef',
      'Footer',
    ];
    const positions = order.map((n) => src.indexOf(`<${n} `));
    // every section is mounted, and strictly increasing → in order
    expect(positions.every((p) => p >= 0)).toBe(true);
    for (let i = 1; i < positions.length; i += 1) {
      expect(positions[i]!, order[i]).toBeGreaterThan(positions[i - 1]!);
    }
  });

  it('Hero renders the thesis and a real install command', () => {
    const { container } = render(<S.Hero />);
    expect(container.textContent).toContain('is not evidence');
    expect(container.textContent).toContain('npm install -D provegate');
  });

  it('Problem renders the three approved proof stats', () => {
    const { container } = render(<S.Problem />);
    const t = container.textContent ?? '';
    expect(t).toContain('22.58%');
    expect(t).toContain('80+ agents');
    expect(t).toContain('19% slower');
  });

  it('Proof puts the honest limits adjacent to the evidence', () => {
    const { container } = render(<S.Proof />);
    const t = container.textContent ?? '';
    expect(t).toContain('critical post-ship findings'); // the proof
    expect(t).toContain('limits we state out loud'); // the limits, same section
    expect(t).toContain('observational and single-project');
  });

  it('Refusal renders the real refusal, exact text', () => {
    const { container } = render(<S.Refusal />);
    expect(container.textContent).toContain('gate push');
    expect(container.textContent).toContain('No. Push is yours.');
  });

  it('CommandRef renders the real ten commands and NO fictional surface (FR-3/FR-4)', () => {
    const { container } = render(<S.CommandRef />);
    const t = container.textContent ?? '';
    for (const cmd of ['gate init', 'gate open', 'gate run', 'gate release', 'gate land', 'gate push']) {
      expect(t, cmd).toContain(cmd);
    }
    // the prototype's fiction must never reach the rendered page
    expect(t).not.toContain('gate.toml');
    expect(t).not.toContain('gate ledger');
  });
});
