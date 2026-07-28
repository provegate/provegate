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
      <DS.CodeBlock filename="gate" prompt>
        gate init
      </DS.CodeBlock>,
    );
    expect(container.textContent).toContain('gate init');
    expect(container.querySelector('pre')).not.toBeNull();
    // PRD-027 FR-9: the server renderer carries NO copy affordance — the old
    // aria-hidden "copy" span is gone and no button exists here.
    expect(container.querySelector('button')).toBeNull();
    expect(container.textContent).not.toContain('copy');
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

// ─────────────────────────────────────────────────────────────────────────────
// PRD-027 FR-9 — the split renderer. The server barrel carries no copy
// affordance; the client entry carries the real one, and delivery is asserted
// where it exists: built output, types, and import paths — a jsdom render
// cannot see an RSC boundary.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { vi } from 'vitest';
import { CopyableCodeBlock } from '../src/react/client';

describe('CopyableCodeBlock (FR-9)', () => {
  it('renders a real button with an accessible copy name', () => {
    const { getByLabelText } = render(
      <CopyableCodeBlock filename="terminal">npm install -D provegate</CopyableCodeBlock>,
    );
    const btn = getByLabelText(/copy/i) as HTMLButtonElement;
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('type')).toBe('button');
  });

  it('activation writes the payload — children when they are a plain string', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    try {
      const { getByLabelText } = render(
        <CopyableCodeBlock filename="terminal">gate init</CopyableCodeBlock>,
      );
      (getByLabelText(/copy/i) as HTMLButtonElement).click();
      expect(writeText).toHaveBeenCalledWith('gate init');
    } finally {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });

  it('copyText overrides non-string children', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    try {
      const { getByLabelText } = render(
        <CopyableCodeBlock filename="x" copyText="the real payload">
          <em>styled</em>
        </CopyableCodeBlock>,
      );
      (getByLabelText(/copy/i) as HTMLButtonElement).click();
      expect(writeText).toHaveBeenCalledWith('the real payload');
    } finally {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });

  it('a missing clipboard does not throw', () => {
    const { getByLabelText } = render(
      <CopyableCodeBlock filename="x">gate run</CopyableCodeBlock>,
    );
    expect(() => (getByLabelText(/copy/i) as HTMLButtonElement).click()).not.toThrow();
  });

  it('non-string children with no copyText renders NO control — an affordance with no payload is the defect', () => {
    const { container } = render(
      <CopyableCodeBlock filename="x">
        <em>not a string</em>
      </CopyableCodeBlock>,
    );
    expect(container.querySelector('button')).toBeNull();
  });

  it('the server barrel type carries no copyable prop', () => {
    // @ts-expect-error — `copyable` was removed from CodeBlockProps (PRD-027
    // FR-9); passing it through the barrel is a compile error, which is the
    // test that rejects server-context imports through the wrong subpath.
    const bad = <DS.CodeBlock copyable>x</DS.CodeBlock>;
    expect(bad).toBeTruthy(); // the assertion is the @ts-expect-error above
  });

  it('the public surface carries no headerControl slot either — Codex round-1 [P1]', () => {
    // @ts-expect-error — the slot is internal to the client wrapper; a public
    // slot would let any caller render a handlerless copy affordance.
    const bad = <DS.CodeBlock headerControl={<span>copy</span>}>x</DS.CodeBlock>;
    expect(bad).toBeTruthy();
    // and the barrel does not export the internal base
    expect('CodeBlockBase' in DS).toBe(false);
  });
});

describe('FR-9 delivery — built output and coexistence', () => {
  const dist = resolve(__dirname, '../dist');

  it('dist/react/client.js opens with the use client directive', () => {
    const p = resolve(dist, 'react/client.js');
    expect(existsSync(p), 'run pnpm --filter @provegate/design build first').toBe(true);
    expect(readFileSync(p, 'utf8').trimStart().startsWith('"use client";')).toBe(true);
  });

  it('one clean build leaves all five outputs coexisting', () => {
    for (const f of [
      'tokens.js',
      'tokens.d.ts',
      'cli/index.js',
      'cli/index.d.ts',
      'react/index.js',
      'react/index.d.ts',
      'react/client.js',
      'react/client.d.ts',
    ]) {
      expect(existsSync(resolve(dist, f)), f).toBe(true);
    }
  });

  it('the server barrel emits no use client directive', () => {
    const src = readFileSync(resolve(dist, 'react/index.js'), 'utf8');
    expect(src.trimStart().startsWith('"use client"')).toBe(false);
  });
});
