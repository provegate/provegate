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
    for (const label of ['PRD', 'Readiness', 'Tasks', 'Implement', 'Test', 'Audit', 'Learn', 'Push']) {
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
    expect(validateManifest({ gates: {} })).toContainEqual({ path: 'gates', message: 'unknown key' });
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
