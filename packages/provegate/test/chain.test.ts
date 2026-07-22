import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { defaultManifest } from '../src/core/gates/manifest.js';
import {
  buildGateChain,
  parseFromPhase,
  planChain,
  runChain,
  shouldSkipGate,
} from '../src/core/run/chain.js';
import type { StateRecord } from '../src/core/state/build.js';

const cfg = DEFAULT_CONFIG;
const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

function record(overrides: Partial<StateRecord> = {}): StateRecord {
  return {
    prd: 'PRD-002',
    number: 2,
    slug: 'x',
    status: 'Code Complete',
    cyclePhase: null,
    operatorAcceptance: null,
    autonomousClose: 'operator-gated',
    artifacts: { prd: '_prds/wip/p.md', readiness: '', tasks: '_tasks/wip/t.md', summary: '' },
    artifactStates: { prd: 'wip', readiness: 'missing', tasks: 'wip', summary: 'missing' },
    readiness: { score: null, verdict: null, modelTierExecution: null, modelTierAudit: null },
    task: { status: 'Unknown', checkedCount: 0, uncheckedCount: 0, operatorHandoffCount: 0 },
    summary: { shipReadiness: 'Unknown' },
    lastUpdated: null,
    ...overrides,
  };
}

const PRD_WITH_11 = [
  '## Durable Artifacts',
  '',
  '- none',
  '',
  '## 11. Verification Commands',
  '',
  '| FR   | Command |',
  '| ---- | ------- |',
  '| FR-1 | `node -e "process.exit(0)"` |',
].join('\n');

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-chain-'));
  roots.push(root);
  return root;
}

describe('buildGateChain / planChain', () => {
  it('assembles phases 4-7 + merge gate in order', () => {
    const chain = buildGateChain({
      config: cfg,
      manifest: defaultManifest(cfg),
      root: tempRoot(),
      record: record(),
      prdContent: PRD_WITH_11,
      tasksContent: '| independent-review | x | passed |',
      changedFiles: [],
      prdClass: 'infra',
    });
    expect(chain.map((g) => g.phase)).toEqual([
      '4 Implementation',
      '5 Testing',
      '6 Final Auditing',
      '7 Learning',
      'merge gate',
    ]);
    const plan = planChain(chain, null);
    expect(plan.join('\n')).toContain('pnpm check-types');
    expect(plan.join('\n')).toContain('node -e');
  });

  it('marks unsafe §11 commands in the plan', () => {
    const chain = buildGateChain({
      config: cfg,
      manifest: defaultManifest(cfg),
      root: tempRoot(),
      record: record(),
      prdContent: PRD_WITH_11.replace('`node -e "process.exit(0)"`', '`pnpm run $(evil)`'),
      tasksContent: '',
      changedFiles: [],
      prdClass: 'infra',
    });
    expect(planChain(chain, null).join('\n')).toContain('UNSAFE');
  });
});

describe('from-phase handling', () => {
  it('parses 4-7 and merge; rejects junk', () => {
    expect(parseFromPhase('5')).toBe(5);
    expect(parseFromPhase('merge')).toBe('merge');
    expect(parseFromPhase(null)).toBeNull();
    expect(() => parseFromPhase('9')).toThrow(/invalid --from-phase/);
  });

  it('skips earlier phases; merge skips everything', () => {
    const gate4 = { phase: '4 Implementation' };
    const gate6 = { phase: '6 Final Auditing' };
    const mergeGate = { phase: 'merge gate' };
    expect(shouldSkipGate(gate4, 5)).toBe(true);
    expect(shouldSkipGate(gate6, 5)).toBe(false);
    expect(shouldSkipGate(gate4, 'merge')).toBe(true);
    expect(shouldSkipGate(mergeGate, 'merge')).toBe(true);
  });
});

describe('runChain', () => {
  const manifest = { ...defaultManifest(cfg), phases: { '4': [] as string[] } };

  function chainFor(root: string, prdContent: string, operatorRows = 0) {
    return buildGateChain({
      config: cfg,
      manifest,
      root,
      record: record({
        task: {
          status: 'Unknown',
          checkedCount: 0,
          uncheckedCount: 0,
          operatorHandoffCount: operatorRows,
        },
      }),
      prdContent,
      tasksContent: '',
      changedFiles: [],
      prdClass: 'infra',
    });
  }

  it('executes safe §11 commands and stops at the failing review gate with results so far', () => {
    const root = tempRoot();
    const outcome = runChain({
      config: cfg,
      root,
      id: 'PRD-002',
      chain: chainFor(root, PRD_WITH_11),
      fromPhase: null,
    });
    expect(outcome.results).toContainEqual(['5 Testing: node -e "process.exit(0)"', 'passed']);
    expect(outcome.stopped?.phase).toBe('6 Final Auditing');
  });

  it('stops with "PRD gap" when §11 has no runnable rows', () => {
    const root = tempRoot();
    const outcome = runChain({
      config: cfg,
      root,
      id: 'PRD-002',
      chain: chainFor(root, '## 11. Verification Commands\n\nnothing\n'),
      fromPhase: null,
    });
    expect(outcome.stopped?.why).toContain('PRD gap');
  });

  it('refuses unsafe commands instead of executing them', () => {
    const root = tempRoot();
    const outcome = runChain({
      config: cfg,
      root,
      id: 'PRD-002',
      chain: chainFor(
        root,
        PRD_WITH_11.replace('`node -e "process.exit(0)"`', '`pnpm run $(evil)`'),
      ),
      fromPhase: null,
    });
    expect(outcome.stopped?.why).toContain('unsafe §11 command refused');
  });

  it('a failing command stops the chain with a FAILED row', () => {
    const root = tempRoot();
    const outcome = runChain({
      config: cfg,
      root,
      id: 'PRD-002',
      chain: chainFor(root, PRD_WITH_11.replace('process.exit(0)', 'process.exit(1)')),
      fromPhase: null,
    });
    expect(outcome.stopped?.why).toContain('command failed');
    expect(outcome.results).toContainEqual(['5 Testing: node -e "process.exit(1)"', 'FAILED']);
  });
});
