import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge } from '../src/core/config/index.js';
import { UNKNOWN_STATUS } from '../src/core/state/status.js';
import type { StateRecord } from '../src/core/state/build.js';
import {
  buildQueue,
  formatLeaseRemaining,
  getActiveRecords,
  getReadyRecords,
  isImplemented,
  latestImplemented,
  statusPanelMetrics,
} from '../src/core/state/query.js';

function record(overrides: Partial<StateRecord> & { number: number }): StateRecord {
  const base: StateRecord = {
    prd: `PRD-${String(overrides.number).padStart(3, '0')}`,
    number: overrides.number,
    slug: `item-${overrides.number}`,
    status: 'Draft',
    cyclePhase: null,
    operatorAcceptance: null,
    autonomousClose: null,
    artifacts: { prd: `_prds/wip/prd-x.md`, readiness: '', tasks: '', summary: '' },
    artifactStates: { prd: 'wip', readiness: 'missing', tasks: 'missing', summary: 'missing' },
    readiness: { score: null, verdict: null, modelTierExecution: null, modelTierAudit: null },
    task: { status: UNKNOWN_STATUS, checkedCount: 0, uncheckedCount: 0, operatorHandoffCount: 0 },
    summary: { shipReadiness: 'Unknown' },
    lastUpdated: null,
  };
  return { ...base, ...overrides };
}

const cfg = DEFAULT_CONFIG;

describe('isImplemented / latestImplemented', () => {
  it('implements via status, completed prd artifact, or summary presence', () => {
    expect(isImplemented(cfg, record({ number: 1, status: 'Ship Verified' }))).toBe(true);
    expect(
      isImplemented(
        cfg,
        record({
          number: 2,
          artifactStates: {
            prd: 'completed',
            readiness: 'missing',
            tasks: 'missing',
            summary: 'missing',
          },
        }),
      ),
    ).toBe(true);
    expect(
      isImplemented(
        cfg,
        record({
          number: 3,
          artifactStates: { prd: 'wip', readiness: 'missing', tasks: 'missing', summary: 'wip' },
        }),
      ),
    ).toBe(true);
    expect(isImplemented(cfg, record({ number: 4, status: 'In Progress' }))).toBe(false);
  });

  it('latestImplemented is display-only max, never a filter', () => {
    const records = [
      record({ number: 1, status: 'Ship Verified' }),
      record({ number: 5, status: 'Ship Verified' }),
      record({ number: 3, status: 'Approved' }),
    ];
    expect(latestImplemented(cfg, records)).toBe(5);
  });
});

describe('getActiveRecords (per-record done-check, no high-water-mark)', () => {
  it('keeps a lower-numbered ready item active when a higher number landed', () => {
    const records = [
      record({ number: 3, status: 'Approved' }),
      record({ number: 7, status: 'Ship Verified' }),
    ];
    const active = getActiveRecords(cfg, records);
    expect(active.map((r) => r.number)).toEqual([3]);
  });

  it('excludes deferred, implemented, and non-active statuses', () => {
    const records = [
      record({
        number: 1,
        artifactStates: {
          prd: 'deferred',
          readiness: 'missing',
          tasks: 'missing',
          summary: 'missing',
        },
      }),
      record({ number: 2, status: 'Superseded' }),
      record({ number: 3, status: 'In Review' }),
    ];
    expect(getActiveRecords(cfg, records).map((r) => r.number)).toEqual([3]);
  });

  it('requires at least one wip artifact', () => {
    const records = [
      record({
        number: 1,
        status: 'Draft',
        artifactStates: {
          prd: 'missing',
          readiness: 'missing',
          tasks: 'missing',
          summary: 'missing',
        },
      }),
    ];
    expect(getActiveRecords(cfg, records)).toEqual([]);
  });
});

describe('getReadyRecords', () => {
  it('ready = ready-status or PASS verdict, unlocked, sorted score then number', () => {
    const a = record({ number: 1, status: 'Approved' });
    const b = record({
      number: 2,
      status: 'Draft',
      readiness: { score: 9.1, verdict: 'PASS', modelTierExecution: null, modelTierAudit: null },
    });
    const c = record({ number: 3, status: 'Approved' });
    const locked = record({ number: 4, status: 'Approved' });
    const ready = getReadyRecords(cfg, [a, b, c, locked], new Set(['PRD-004']));
    expect(ready.map((r) => r.number)).toEqual([2, 1, 3]);
  });

  it('is vocab-driven: a custom ready set works (W1 regression)', () => {
    const custom = deepMerge(DEFAULT_CONFIG, {
      statusVocab: {
        canonical: ['Open', 'Greenlit', 'Shipped'],
        active: ['Open', 'Greenlit'],
        implemented: ['Shipped'],
        ready: ['Greenlit'],
        blocked: [],
        reviewing: [],
      },
    });
    const r = record({ number: 1, status: 'Greenlit' });
    expect(getReadyRecords(custom, [r]).map((x) => x.number)).toEqual([1]);
    expect(getReadyRecords(DEFAULT_CONFIG, [r])).toEqual([]);
  });
});

describe('buildQueue', () => {
  it('produces ready/inFlight/blocked/inReview with stale flags', () => {
    const records = [
      // tasks artifact present — a task-less item is (correctly) also "blocked"
      record({
        number: 1,
        status: 'Approved',
        artifactStates: { prd: 'wip', readiness: 'missing', tasks: 'wip', summary: 'missing' },
      }),
      record({ number: 2, status: 'Blocked' }),
      record({ number: 3, status: 'Code Complete' }),
    ];
    const now = Date.parse('2026-07-22T12:00:00.000Z');
    const queue = buildQueue(
      cfg,
      '/nonexistent-root',
      records,
      [
        {
          prd: 'PRD-009',
          agent: 'a1',
          phase: 'Phase 4',
          worktree: null,
          expiresAt: '2026-07-22T11:00:00.000Z',
        },
      ],
      { now },
    );

    expect(queue.ready.map((r) => r.prd)).toEqual(['PRD-001']);
    expect(queue.blocked.map((r) => r.prd)).toEqual(['PRD-002']);
    expect(queue.inReview.map((r) => r.prd)).toEqual(['PRD-003']);
    expect(queue.inFlight).toEqual([
      {
        prd: 'PRD-009',
        agent: 'a1',
        phase: 'Phase 4',
        worktree: null,
        stale: true,
        expiresInSeconds: -3600, // expired 1h ago
      },
    ]);
  });

  it('carries expiresInSeconds additively; unparseable expiry → null, not stale', () => {
    const records = [record({ number: 1, status: 'Approved' })];
    const now = Date.parse('2026-07-22T12:00:00.000Z');
    const queue = buildQueue(
      cfg,
      '/nonexistent-root',
      records,
      [
        {
          prd: 'PRD-100',
          agent: 'a',
          phase: 'Phase 4',
          worktree: null,
          expiresAt: '2026-07-22T14:00:00.000Z',
        },
        { prd: 'PRD-101', agent: 'a', phase: 'Phase 4', worktree: null, expiresAt: 'not-a-date' },
      ],
      { now },
    );
    const byId = Object.fromEntries(queue.inFlight.map((r) => [r.prd, r]));
    expect(byId['PRD-100']).toMatchObject({ stale: false, expiresInSeconds: 7200 }); // +2h
    expect(byId['PRD-101']).toMatchObject({ stale: false, expiresInSeconds: null }); // unparseable
  });

  it('a locked record is neither ready nor blocked', () => {
    const records = [record({ number: 1, status: 'Approved' })];
    const queue = buildQueue(cfg, '/nonexistent-root', records, [
      {
        prd: 'PRD-001',
        agent: 'a1',
        phase: 'Phase 4',
        worktree: null,
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
    ]);
    expect(queue.ready).toEqual([]);
    expect(queue.blocked).toEqual([]);
    expect(queue.inFlight[0]!.stale).toBe(false);
  });
});

describe('formatLeaseRemaining (queue countdown badge)', () => {
  it('formats future, past (STALE), sub-hour, and unparseable leases', () => {
    expect(formatLeaseRemaining(3 * 3600 + 12 * 60, false)).toBe('3h 12m left');
    expect(formatLeaseRemaining(-(1 * 3600 + 4 * 60), true)).toBe('STALE 1h 4m');
    expect(formatLeaseRemaining(45 * 60, false)).toBe('45m left');
    expect(formatLeaseRemaining(null, false)).toBe('?');
  });
});

describe('statusPanelMetrics', () => {
  it('reports implemented count and latest implemented id', () => {
    const records = [
      record({ number: 1, status: 'Ship Verified' }),
      record({ number: 2, status: 'Approved' }),
    ];
    expect(statusPanelMetrics(cfg, records)).toEqual({
      Implemented: '1',
      'Latest implemented': 'PRD-001',
    });
  });

  it('uses an em dash when nothing is implemented', () => {
    expect(statusPanelMetrics(cfg, [])).toEqual({ Implemented: '0', 'Latest implemented': '—' });
  });
});

describe('codex review regressions (custom lifecycle names)', () => {
  const custom = deepMerge(DEFAULT_CONFIG, {
    dirs: {
      states: ['active', 'done', 'parked'],
      stateRoles: { wip: 'active', completed: 'done', deferred: 'parked' },
    },
  });

  it('a "done" prd artifact counts as implemented (role-driven, not literal)', () => {
    const r = record({
      number: 1,
      artifactStates: { prd: 'done', readiness: 'missing', tasks: 'missing', summary: 'missing' },
    });
    expect(isImplemented(custom, r)).toBe(true);
  });

  it('a "parked" record is excluded from active; "active" artifacts satisfy the wip check', () => {
    const parked = record({
      number: 1,
      status: 'Draft',
      artifactStates: { prd: 'parked', readiness: 'missing', tasks: 'missing', summary: 'missing' },
    });
    const live = record({
      number: 2,
      status: 'Draft',
      artifactStates: { prd: 'active', readiness: 'missing', tasks: 'missing', summary: 'missing' },
    });
    expect(getActiveRecords(custom, [parked, live]).map((r) => r.number)).toEqual([2]);
  });

  it('UNKNOWN_STATUS sentinel keeps unparseable records visible by design', () => {
    const r = record({
      number: 1,
      status: UNKNOWN_STATUS,
      artifactStates: { prd: 'active', readiness: 'missing', tasks: 'missing', summary: 'missing' },
    });
    const emptyActive = deepMerge(custom, { statusVocab: { active: [] } });
    expect(getActiveRecords(emptyActive, [r]).map((x) => x.number)).toEqual([1]);
  });
});
