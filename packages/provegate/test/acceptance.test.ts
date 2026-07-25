import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge } from '../src/core/config/index.js';
import {
  loadAcceptance,
  operatorGateOk,
  validAcceptance,
  type AcceptanceEntry,
} from '../src/core/run/acceptance.js';
import { buildState, type StateRecord } from '../src/core/state/build.js';

const cfg = DEFAULT_CONFIG;
const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

const ENTRY: AcceptanceEntry = {
  prd: 'PRD-002',
  owner: 'owner',
  items: ['9.1 review authorization'],
  reason: 'reviewed and accepted for autonomous close',
  date: '2026-07-22',
  method: 'interactive',
};

function repoWithAcceptances(entries: AcceptanceEntry[]): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-accept-'));
  roots.push(root);
  mkdirSync(resolve(root, '_state'), { recursive: true });
  writeFileSync(
    resolve(root, '_state/acceptances.json'),
    JSON.stringify({ schemaVersion: 1, acceptances: entries }),
  );
  return root;
}

function record(operatorHandoffCount: number): StateRecord {
  return {
    prd: 'PRD-002',
    number: 2,
    slug: 'x',
    status: 'Code Complete',
    cyclePhase: null,
    operatorAcceptance: null,
    autonomousClose: 'operator-gated',
    artifacts: { prd: '', readiness: '', tasks: '', summary: '' },
    artifactStates: { prd: 'wip', readiness: 'missing', tasks: 'wip', summary: 'missing' },
    readiness: { score: null, verdict: null, modelTierExecution: null, modelTierAudit: null },
    task: { status: 'Unknown', checkedCount: 0, uncheckedCount: 0, operatorHandoffCount },
    summary: { shipReadiness: 'Unknown' },
    lastUpdated: null,
  };
}

describe('validAcceptance', () => {
  it('accepts an owner-signed complete entry (case-insensitive owner)', () => {
    expect(validAcceptance(cfg, ENTRY)).toBe(true);
    expect(validAcceptance(cfg, { ...ENTRY, owner: 'Operator' })).toBe(true);
  });

  it('rejects non-owner signers, empty items, short reasons', () => {
    expect(validAcceptance(cfg, { ...ENTRY, owner: 'somebody' })).toBe(false);
    expect(validAcceptance(cfg, { ...ENTRY, items: [] })).toBe(false);
    expect(validAcceptance(cfg, { ...ENTRY, reason: 'ok' })).toBe(false);
    expect(validAcceptance(cfg, null)).toBe(false);
  });

  it('honors custom config owners', () => {
    const custom = deepMerge(cfg, { owners: ['maintainer'] });
    expect(validAcceptance(custom, ENTRY)).toBe(false);
    expect(validAcceptance(custom, { ...ENTRY, owner: 'maintainer' })).toBe(true);
  });
});

describe('loadAcceptance / operatorGateOk', () => {
  it('zero operator rows pass without any acceptance file', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-accept-'));
    roots.push(root);
    expect(operatorGateOk(cfg, root, record(0)).ok).toBe(true);
  });

  it('operator rows without acceptance fail with a pointing message', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-accept-'));
    roots.push(root);
    const result = operatorGateOk(cfg, root, record(3));
    expect(result.ok).toBe(false);
    expect(result.why).toContain('3 operator-owned row(s)');
    expect(result.why).toContain('acceptances.json');
  });

  it('a valid entry waives the rows and names the signer', () => {
    const root = repoWithAcceptances([ENTRY]);
    const result = operatorGateOk(cfg, root, record(2));
    expect(result).toEqual({
      ok: true,
      waived: true,
      why: '2 operator row(s) waived via acceptances.json (owner)',
    });
  });

  it('malformed acceptances file degrades to null, not a crash', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-accept-'));
    roots.push(root);
    mkdirSync(resolve(root, '_state'), { recursive: true });
    writeFileSync(resolve(root, '_state/acceptances.json'), '{ nope');
    expect(loadAcceptance(cfg, root, 'PRD-002')).toBeNull();
    expect(operatorGateOk(cfg, root, record(1)).ok).toBe(false);
  });
});

/**
 * End-to-end regression: the record the gate reads comes from the tasks FILE, so
 * the parser and the gate must be exercised together. PRD-016 shipped its
 * operator row as a checkbox bullet; the parser counted zero and the gate — fed
 * a synthetic zero in every unit test above — passed without an acceptance while
 * the file itself still said a human owed a signature.
 */
describe('operatorGateOk over a real tasks file', () => {
  function repoWithTasks(handoffSection: string[]): string {
    const root = mkdtempSync(join(tmpdir(), 'provegate-accept-e2e-'));
    roots.push(root);
    const write = (rel: string, lines: string[]): void => {
      mkdirSync(resolve(root, rel, '..'), { recursive: true });
      writeFileSync(resolve(root, rel), lines.join('\n'));
    };
    write('_prds/wip/prd-002-x.md', [
      '# PRD-002: X',
      '',
      '> **Status**: Code Complete',
      '> **Autonomous Close**: operator-gated',
    ]);
    write('_tasks/wip/tasks-002-x.md', [
      '# Tasks',
      '',
      '> **Status**: Operator Verification',
      '',
      '- [x] 1.1 implement',
      '',
      '## Operator Handoff',
      '',
      ...handoffSection,
      '',
    ]);
    return root;
  }

  const stateRecord = (root: string): StateRecord => {
    const built = buildState(cfg, root).records.find((r) => r.prd === 'PRD-002');
    expect(built).toBeDefined();
    return built!;
  };

  it('refuses the merge when the operator row is a checkbox bullet and no acceptance exists', () => {
    const root = repoWithTasks(['- [ ] 9.0 owner signs off on the autonomous close']);
    const built = stateRecord(root);
    expect(built.task.operatorHandoffCount).toBe(1);
    expect(operatorGateOk(cfg, root, built).ok).toBe(false);
  });

  it('waives the same checkbox row once the owner acceptance is present', () => {
    const root = repoWithTasks(['- [ ] 9.0 owner signs off on the autonomous close']);
    mkdirSync(resolve(root, '_state'), { recursive: true });
    writeFileSync(
      resolve(root, '_state/acceptances.json'),
      JSON.stringify({ schemaVersion: 1, acceptances: [{ ...ENTRY, prd: 'PRD-002' }] }),
    );
    expect(operatorGateOk(cfg, root, stateRecord(root))).toMatchObject({ ok: true, waived: true });
  });

  it('still merges freely when the section explicitly holds no rows', () => {
    const root = repoWithTasks(['> None — every gate is machine-checkable.', '', '- (none)']);
    const built = stateRecord(root);
    expect(built.task.operatorHandoffCount).toBe(0);
    expect(operatorGateOk(cfg, root, built)).toEqual({ ok: true });
  });
});
