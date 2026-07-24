// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import * as DS from '../src/react/index.js';

// FR-2/5/8/9 — every component resolves from the barrel and renders under its
// documented props (the .d.ts.txt contracts). jsdom-scoped; the node-env token
// tests keep their environment (per-file docblocks).

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the nine components resolve from @provegate/design/react', () => {
  it('all nine named exports exist', () => {
    for (const name of [
      'Icon',
      'Button',
      'VerdictBadge',
      'Admonition',
      'CodeBlock',
      'GateLine',
      'HandoffCard',
      'EvidenceTable',
      'PhasePipeline',
    ] as const) {
      expect(typeof DS[name], name).toBe('function');
    }
  });
});

describe('each component renders under its contract props', () => {
  it('Icon renders an svg for a named glyph', () => {
    const { container } = render(<DS.Icon name="gate" title="gate" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('Button renders its children (primary neutral, not green)', () => {
    const { getByText } = render(<DS.Button variant="primary">Read the spec</DS.Button>);
    expect(getByText('Read the spec')).toBeTruthy();
  });

  it('VerdictBadge renders the verdict word + glyph', () => {
    const { container } = render(<DS.VerdictBadge verdict="operator" code={0} />);
    expect(container.textContent).toContain('operator');
    expect(container.textContent).toContain('→');
  });

  it('Admonition renders its title + body', () => {
    const { getByText } = render(
      <DS.Admonition type="pass" title="Green is earned">
        body
      </DS.Admonition>,
    );
    expect(getByText('Green is earned')).toBeTruthy();
    expect(getByText('body')).toBeTruthy();
  });

  it('CodeBlock renders a terminal block with a prompt', () => {
    const { container } = render(
      <DS.CodeBlock filename="gate" prompt copyable>
        gate init
      </DS.CodeBlock>,
    );
    expect(container.textContent).toContain('gate init');
    expect(container.querySelector('pre')).not.toBeNull();
  });

  it('GateLine renders the glyph + name + status', () => {
    const { container } = render(<DS.GateLine status="passed" name="phase 5" command="pnpm test" code={0} />);
    expect(container.textContent).toContain('phase 5');
    expect(container.textContent).toContain('passed');
    expect(container.textContent).toContain('✓');
  });

  it('HandoffCard renders the box, a gate row, and the arrow line', () => {
    const { container } = render(
      <DS.HandoffCard
        variant="handoff"
        title="HANDOFF CARD"
        lines={[
          { gate: 'passed', text: 'phase 4' },
          { blank: true },
          { arrow: true, text: 'READY TO PUSH' },
        ]}
      />,
    );
    const t = container.textContent ?? '';
    expect(t).toContain('┌─ HANDOFF CARD');
    expect(t).toContain('✓ phase 4');
    expect(t).toContain('→ READY TO PUSH');
    expect(t).toContain('└');
  });

  it('EvidenceTable renders one row per entry', () => {
    const { container } = render(
      <DS.EvidenceTable
        rows={[
          { check: 'types', command: 'tsc', verdict: 'passed', code: 0 },
          { check: 'test', command: 'vitest', verdict: 'failed', code: 1 },
        ]}
      />,
    );
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.textContent).toContain('types');
  });

  it('PhasePipeline renders explicit phases + the push boundary', () => {
    const { container } = render(
      <DS.PhasePipeline
        phases={[
          { n: 1, label: 'PRD', authority: 'human' },
          { n: 4, label: 'Implement', authority: 'machine' },
        ]}
        active={1}
        showPush
      />,
    );
    expect(container.textContent).toContain('PRD');
    expect(container.textContent).toContain('Implement');
    expect(container.textContent).toContain('Push');
  });

  it('PhasePipeline highlights the push node when active="push" (Phase-6 M1)', () => {
    const phases = [{ n: 1, label: 'PRD', authority: 'human' as const }];
    const { container } = render(<DS.PhasePipeline phases={phases} active="push" showPush />);
    const current = container.querySelectorAll('[aria-current="step"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toContain('Push');
  });
});
