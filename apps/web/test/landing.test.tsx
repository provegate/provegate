// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import * as S from '../app/sections/index';
import { planFor, validateManifest } from '../app/sections/playground';
import * as C from '../app/sections/content';

afterEach(() => {
  document.body.innerHTML = '';
});

/** The full narrative, in the handoff's PG_ORDER. */
const ORDER = [
  'Nav',
  'Hero',
  'TrustStrip',
  'Problem',
  'CoreRule',
  'RunWalkthrough',
  'Playground',
  'Method',
  'PhaseDetail',
  'OperatorFlow',
  'Refusal',
  'EvidenceLedger',
  'Proof',
  'Anatomy',
  'Comparison',
  'Positioning',
  'Features',
  'InstallTabs',
  'CommandRef',
  'CIIntegration',
  'FaqAndQuickstart',
  'Install',
  'Footer',
] as const;

describe('the landing narrative (FR-2/FR-9)', () => {
  it('all narrative sections are exported', () => {
    for (const name of ORDER) {
      expect(typeof S[name], name).toBe('function');
    }
  });

  it('the page composes the sections in the handoff order', () => {
    const src = readFileSync(resolve(__dirname, '../app/page.tsx'), 'utf8');
    const positions = ORDER.map((n) => src.indexOf(`<${n} `));
    // every section is mounted, and strictly increasing → in order
    expect(positions.every((p) => p >= 0)).toBe(true);
    for (let i = 1; i < positions.length; i += 1) {
      expect(positions[i]!, ORDER[i]).toBeGreaterThan(positions[i - 1]!);
    }
  });

  it('Hero renders the thesis and a real install command', () => {
    const { container } = render(<S.Hero />);
    expect(container.textContent).toContain('is not evidence');
    expect(container.textContent).toContain('npm install -D provegate');
  });

  it('TrustStrip renders the three invariants', () => {
    const { container } = render(<S.TrustStrip />);
    const t = container.textContent ?? '';
    expect(t).toContain('listed but not run is never passed');
    expect(t).toContain('push is always yours');
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

  it('CommandRef renders the real command surface and NO fictional surface (FR-3/FR-4)', () => {
    const { container } = render(<S.CommandRef />);
    const t = container.textContent ?? '';
    for (const cmd of [
      'gate init',
      'gate open',
      'gate doctor',
      'gate memory',
      'gate run',
      'gate release',
      'gate land',
      'gate push',
    ]) {
      expect(t, cmd).toContain(cmd);
    }
    // the prototype's fiction must never reach the rendered page
    expect(t).not.toContain('gate.toml');
    expect(t).not.toContain('gate ledger');
  });

  it('PhaseDetail names all seven phases plus the human push', () => {
    const { container } = render(<S.PhaseDetail />);
    const t = container.textContent ?? '';
    for (const label of [
      'PRD',
      'Readiness',
      'Tasks',
      'Implement',
      'Test',
      'Audit',
      'Learn',
      'Push',
    ]) {
      expect(t, label).toContain(label);
    }
  });

  it('Anatomy takes apart the shipped status-line grammar', () => {
    const { container } = render(<S.Anatomy />);
    const t = container.textContent ?? '';
    for (const seg of ['glyph', 'phase', 'name', 'detail', 'verdict']) {
      expect(t, seg).toContain(seg);
    }
  });

  it('InstallTabs offers only package managers the tool actually ships through', () => {
    const { container } = render(<S.InstallTabs />);
    const t = container.textContent ?? '';
    expect(t).toContain('npm install -D provegate');
    expect(t).not.toContain('brew install');
    expect(t).not.toContain('install.sh');
  });

  it('CIIntegration claims no flag the CLI does not have', () => {
    const { container } = render(<S.CIIntegration />);
    const t = container.textContent ?? '';
    expect(t).toContain('Exit codes travel');
    expect(t).not.toContain('--ci');
  });

  it('FaqAndQuickstart is truthful about the local merge and the refusal to push', () => {
    const { container } = render(<S.FaqAndQuickstart />);
    const t = container.textContent ?? '';
    expect(t).toContain('Will it push or merge for me?');
    expect(t).toContain('It never pushes');
  });

  it('OperatorFlow states that an agent never self-accepts', () => {
    const { container } = render(<S.OperatorFlow />);
    expect(container.textContent).toContain('never writes an acceptance for itself');
  });

  it('every section renders without throwing', () => {
    for (const name of ORDER) {
      const Section = S[name];
      expect(() => render(<Section />), name).not.toThrow();
      document.body.innerHTML = '';
    }
  });
});

describe('the playground plans, it never runs (FR-3)', () => {
  it('the seed manifest is the real gates.manifest.json shape', () => {
    const parsed = JSON.parse(C.MANIFEST_SEED) as { phases: Record<string, string[]> };
    expect(Object.keys(parsed)).toEqual(['phases']);
    expect(parsed.phases['4']).toContain('pnpm check-types');
    expect(validateManifest(parsed)).toEqual([]);
  });

  it('rejects a phase key the runner does not execute, with the shipped message', () => {
    const issues = validateManifest({ phases: { '5': ['pnpm test'] } });
    expect(issues).toEqual([
      { path: 'phases.5', message: 'unknown phase key (runner executes 4, 6, 7)' },
    ]);
  });

  it('rejects an unknown top-level key and a non-command array', () => {
    expect(validateManifest({ gates: {} })).toContainEqual({
      path: 'gates',
      message: 'unknown key',
    });
    expect(validateManifest({ phases: { '4': [''] } })).toContainEqual({
      path: 'phases.4',
      message: 'must be an array of non-empty commands',
    });
  });

  it('surfaces invalid JSON instead of planning anything', () => {
    const plan = planFor('{ not json');
    expect(plan.lines).toHaveLength(0);
    expect(plan.issues).toHaveLength(1);
    expect(plan.issues[0]!.path).toBe('gates.manifest.json');
  });

  it('plans the built-in gates the manifest cannot remove', () => {
    const plan = planFor('{"phases":{"4":["pnpm test"]}}');
    const text = plan.lines.map((l) => l.text).join('\n');
    expect(text).toContain('── Phase 4 Implementation');
    expect(text).toContain('     • pnpm test');
    expect(text).toContain('── Phase 5 Testing');
    expect(text).toContain(C.BUILTIN_GATES['6']);
    expect(text).toContain(C.BUILTIN_GATES['7']);
  });

  it('gives every plan line a unique key even when the TEXT repeats', () => {
    // The chain repeats `── Phase 7 Learning` (built-in gate, then the
    // manifest's own phase-7 block) and a manifest may declare the same command
    // twice — both produce duplicate line text, which is legal output but an
    // illegal React key. The id must stay unique regardless.
    const plan = planFor(
      '{"phases":{"4":["pnpm test","pnpm test"],"6":["pnpm audit"],"7":["pnpm verify:brain"]}}',
    );
    const texts = plan.lines.map((l) => l.text);
    const ids = plan.lines.map((l) => l.id);
    expect(new Set(texts).size).toBeLessThan(texts.length); // text really does repeat
    expect(new Set(ids).size).toBe(ids.length); // ids do not
    expect(texts.filter((t) => t === '── Phase 7 Learning')).toHaveLength(2);
  });

  it('never plans a push, and says so', () => {
    const plan = planFor(C.MANIFEST_SEED);
    const text = plan.lines.map((l) => l.text).join('\n');
    expect(text).toContain('LOCAL main (no-ff)');
    expect(text).toContain('the runner never pushes');
    expect(C.PLAN_FOOTER).toContain('this is a plan');
  });

  it('renders no verdict — a plan earns no green', () => {
    const { container } = render(<S.Playground />);
    const t = container.textContent ?? '';
    expect(t).toContain('gate run --dry-run');
    expect(t).toContain('nothing executed, nothing merged, nothing pushed');
    expect(t).not.toContain('exit 0');
    expect(t).not.toContain('passed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRD-027 additions — FR-2/4/5/6/9. Appended, never weakening what precedes.
// ─────────────────────────────────────────────────────────────────────────────

import Page from '../app/page';
import { CopyableCodeBlock } from '@provegate/design/react/client';

describe('FR-2 — the hero copy control', () => {
  it('renders a copy control whose payload is the real install constant', () => {
    const { getByLabelText } = render(<S.Hero />);
    const btn = getByLabelText(/copy/i);
    expect(btn.tagName).toBe('BUTTON');
    // payload wiring: the handler reads C.HERO.install — assert the source
    // binds the constant, not a second literal
    const src = readFileSync(resolve(__dirname, '../app/sections/hero-terminal.tsx'), 'utf8');
    expect(src).toContain('writeText(C.HERO.install)');
    expect(src.match(/npm install -D provegate/g) ?? []).toHaveLength(0);
  });

  it('is operable with no clipboard (jsdom) — click throws nothing', () => {
    const { getByLabelText } = render(<S.Hero />);
    expect(() => (getByLabelText(/copy install/i) as HTMLButtonElement).click()).not.toThrow();
  });

  it('is present in the reduced-motion finished state', () => {
    // jsdom has no matchMedia → prefersReducedMotion() answers TRUE → the
    // finished state renders immediately, and the control is in the chrome.
    const { getByLabelText, container } = render(<S.Hero />);
    expect(getByLabelText(/copy install/i)).toBeTruthy();
    expect(container.textContent).toContain(C.HERO_TERMINAL.earned);
  });
});

describe('FR-4 — anchor closure over the real composition', () => {
  it('every rendered href="#…" resolves to a rendered id — nav and footer included', () => {
    const { container } = render(<Page />);
    const hrefs = Array.from(container.querySelectorAll('a[href^="#"]')).map((a) =>
      (a.getAttribute('href') ?? '').slice(1),
    );
    expect(hrefs.length).toBeGreaterThanOrEqual(12); // the pre-change floor
    const ids = new Set(Array.from(container.querySelectorAll('[id]')).map((el) => el.id));
    ids.add('top'); // the wordmark's #top targets the document top by convention
    const orphans = hrefs.filter((h) => h !== '' && !ids.has(h));
    expect(orphans, `orphaned anchors: ${orphans.join(', ')}`).toEqual([]);
  });

  it('the three trust-strip claims are focusable anchors to their proof sections', () => {
    const { container } = render(<S.TrustStrip />);
    const anchors = Array.from(container.querySelectorAll('a[href^="#"]'));
    expect(anchors).toHaveLength(3);
    expect(anchors.map((a) => a.getAttribute('href'))).toEqual(['#ledger', '#proof', '#refusal']);
  });

  it('Refusal is addressable', () => {
    const { container } = render(<S.Refusal />);
    expect(container.querySelector('#refusal')).not.toBeNull();
  });
});

describe('FR-5 — the retained-ratio scrollspy', () => {
  type IOCallback = (entries: Array<{ target: { id: string }; intersectionRatio: number }>) => void;

  function withMockIO(run: (fire: IOCallback) => void): void {
    let cb: IOCallback = () => {};
    class MockIO {
      constructor(callback: IOCallback) {
        cb = callback;
      }
      observe(): void {}
      disconnect(): void {}
    }
    // Nav's effect queries these ids from the document
    for (const [, href] of C.NAV_LINKS) {
      const el = document.createElement('section');
      el.id = href.slice(1);
      document.body.appendChild(el);
    }
    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver =
      MockIO as unknown as typeof IntersectionObserver;
    try {
      run((entries) => cb(entries));
    } finally {
      delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
    }
  }

  it('a later small ratio does not displace a retained large one — sequential callbacks', async () => {
    const { act } = await import('@testing-library/react');
    withMockIO((fire) => {
      const { container } = render(<S.Nav />);
      act(() => fire([{ target: { id: 'how' }, intersectionRatio: 0.8 }]));
      // a DELTA callback reporting only the newcomer at 0.1 — 'how' still holds 0.8
      act(() => fire([{ target: { id: 'method' }, intersectionRatio: 0.1 }]));
      const current = container.querySelector('[aria-current="location"]');
      expect(current?.getAttribute('href')).toBe('#how');
      // 'how' exits; 'method' is now the maximum
      act(() => fire([{ target: { id: 'how' }, intersectionRatio: 0 }]));
      expect(container.querySelector('[aria-current="location"]')?.getAttribute('href')).toBe(
        '#method',
      );
      // everything at 0 → the previous active stays, no flicker to none
      act(() => fire([{ target: { id: 'method' }, intersectionRatio: 0 }]));
      expect(container.querySelector('[aria-current="location"]')?.getAttribute('href')).toBe(
        '#method',
      );
    });
  });

  it('exactly one aria-current across the whole Nav, with the drawer open', async () => {
    const { act, fireEvent } = await import('@testing-library/react');
    withMockIO((fire) => {
      const { container, getByLabelText } = render(<S.Nav />);
      act(() => fire([{ target: { id: 'ledger' }, intersectionRatio: 0.9 }]));
      fireEvent.click(getByLabelText('Open menu'));
      const marked = container.querySelectorAll('[aria-current]');
      expect(marked).toHaveLength(1);
      expect(marked[0]?.closest('.pg-navlinks')).not.toBeNull(); // the desktop strip owns it
    });
  });

  it('renders inert without IntersectionObserver — no active link, no throw', () => {
    expect('IntersectionObserver' in globalThis).toBe(false); // jsdom baseline
    const { container } = render(<S.Nav />);
    expect(container.querySelector('[aria-current]')).toBeNull();
  });
});

describe('FR-6 — the mobile hero drops the HandoffCard', () => {
  it('exactly one HandoffCard in the document, inside the wrapper class', () => {
    const { container } = render(<Page />);
    // one occurrence of the card title anywhere in the page — no second DOM copy
    const occurrences = (container.textContent ?? '').split('HANDOFF CARD').length - 1;
    expect(occurrences).toBe(1);
    // and it sits inside the FR-6 wrapper the stylesheet half hides
    const wrapper = container.querySelector(`.${C.HERO_HANDOFF_CLASS}`);
    expect(wrapper).not.toBeNull();
    expect(wrapper?.textContent).toContain('HANDOFF CARD');
  });

  it('the terminal closing lines that carry the beat for mobile are load-bearing', () => {
    expect(C.HERO_TERMINAL.earned).toContain('merged into LOCAL main');
    expect(C.HERO_TERMINAL.human).toContain('git push');
  });
});

describe('FR-9 — every advertised copy control is real', () => {
  it('CopyableCodeBlock renders a real button whose payload is its children', () => {
    const { getByLabelText } = render(
      <CopyableCodeBlock filename="terminal">{C.HERO.install}</CopyableCodeBlock>,
    );
    const btn = getByLabelText(/copy/i) as HTMLButtonElement;
    expect(btn.tagName).toBe('BUTTON');
    expect(() => btn.click()).not.toThrow(); // clipboard absent in jsdom → no-op
  });

  it('the four call sites import from the client subpath — none from the barrel', () => {
    for (const f of ['index.tsx', 'tabs.tsx']) {
      const src = readFileSync(resolve(__dirname, `../app/sections/${f}`), 'utf8');
      expect(src).toContain("from '@provegate/design/react/client'");
      expect(src).not.toMatch(/\bcopyable\b/);
    }
    const idx = readFileSync(resolve(__dirname, '../app/sections/index.tsx'), 'utf8');
    const tabs = readFileSync(resolve(__dirname, '../app/sections/tabs.tsx'), 'utf8');
    const count = (s: string): number => (s.match(/<CopyableCodeBlock/g) ?? []).length;
    expect(count(idx) + count(tabs)).toBe(4);
  });

  it('all four production controls write their exact payloads — clicked, with a clipboard mock', async () => {
    const { vi } = await import('vitest');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const controls = (el: HTMLElement): HTMLButtonElement[] =>
      Array.from(el.querySelectorAll('button[aria-label="Copy command"]'));
    try {
      // InstallTabs (npm tab active by default) → INSTALLERS[0].code
      const tabs = render(<S.InstallTabs />);
      const tabButtons = controls(tabs.container);
      expect(tabButtons).toHaveLength(1);
      tabButtons[0]!.click();
      expect(writeText).toHaveBeenLastCalledWith(C.INSTALLERS[0].code);
      // CIIntegration (first snippet active) → CI_SNIPPETS[0].code
      const ci = render(<S.CIIntegration />);
      const ciButtons = controls(ci.container);
      expect(ciButtons).toHaveLength(1);
      ciButtons[0]!.click();
      expect(writeText).toHaveBeenLastCalledWith(C.CI_SNIPPETS[0].code);
      // Install section carries the two remaining blocks → HERO.install, MANIFEST_SEED
      const install = render(<S.Install />);
      const installButtons = controls(install.container);
      expect(installButtons).toHaveLength(2);
      installButtons[0]!.click();
      expect(writeText).toHaveBeenLastCalledWith(C.HERO.install);
      installButtons[1]!.click();
      expect(writeText).toHaveBeenLastCalledWith(C.MANIFEST_SEED);
    } finally {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });
});
