import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge } from '../src/core/config/index.js';
import { findLeaseConflicts, listLockFiles, validateLock } from '../src/core/locks/lease.js';

const NOW = Date.parse('2026-07-22T12:00:00.000Z');

const VALID_LOCK: Record<string, unknown> = {
  schemaVersion: 2,
  lockId: 'prd-001-test.agent.1',
  agent: 'agent-a',
  prd: 'PRD-001',
  phase: 'Phase 4',
  startedAt: '2026-07-22T10:00:00.000Z',
  expiresAt: '2026-07-22T22:00:00.000Z',
  touchedFiles: ['_prds/wip/prd-001-test.md'],
};

const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('validateLock', () => {
  it('accepts a well-formed lock', () => {
    expect(validateLock(DEFAULT_CONFIG, VALID_LOCK, { now: NOW })).toEqual([]);
  });

  it('reports each missing required field as a distinct issue', () => {
    const issues = validateLock(DEFAULT_CONFIG, {}, { now: NOW });
    for (const field of [
      'schemaVersion',
      'lockId',
      'agent',
      'prd',
      'phase',
      'startedAt',
      'expiresAt',
      'touchedFiles',
    ]) {
      expect(issues).toContain(`missing ${field}`);
    }
  });

  it('rejects bad schemaVersion, empty touchedFiles, malformed ownedPaths', () => {
    const issues = validateLock(
      DEFAULT_CONFIG,
      { ...VALID_LOCK, schemaVersion: 3, touchedFiles: [], ownedPaths: ['', 42] },
      { now: NOW },
    );
    expect(issues).toContain('schemaVersion must be 1 or 2 (got 3)');
    expect(issues).toContain('touchedFiles must be a non-empty array');
    expect(issues).toContain('ownedPaths[0] must be a non-empty string');
    expect(issues).toContain('ownedPaths[1] must be a non-empty string');
  });

  it('reports stale locks with their age in minutes', () => {
    const issues = validateLock(
      DEFAULT_CONFIG,
      { ...VALID_LOCK, expiresAt: '2026-07-22T11:00:00.000Z' },
      { now: NOW },
    );
    expect(issues).toContain('stale lock expired 60 minute(s) ago; remove or renew it');
  });

  it('checks the worktree prefix against the configured dir', () => {
    const bad = validateLock(
      DEFAULT_CONFIG,
      { ...VALID_LOCK, worktree: 'elsewhere/x' },
      { now: NOW },
    );
    expect(bad.some((i) => i.includes('.worktrees/'))).toBe(true);

    const custom = deepMerge(DEFAULT_CONFIG, { worktree: { dir: '.wt' } });
    expect(validateLock(custom, { ...VALID_LOCK, worktree: '.wt/x' }, { now: NOW })).toEqual([]);
  });

  it('accepts schemaVersion 1 (back-compat with existing lease files)', () => {
    expect(validateLock(DEFAULT_CONFIG, { ...VALID_LOCK, schemaVersion: 1 }, { now: NOW })).toEqual(
      [],
    );
  });

  it('validates the hand-authored pre-flight lease shape (frozen PRD-001 fixture)', () => {
    // Frozen copy of the real PRD-001 lease — the live file is deleted at PRD
    // close, so the shape is pinned here instead of read from disk.
    const lease: Record<string, unknown> = {
      schemaVersion: 2,
      lockId: 'prd-001-config-state-locks.claude-fable-5.20260722',
      agent: 'claude-fable-5',
      prd: 'PRD-001',
      phase: 'Phase 4',
      startedAt: '2026-07-22T13:30:00.000Z',
      expiresAt: '2026-07-23T13:30:00.000Z',
      branch: 'feat/prd-001-config-state-locks',
      touchedFiles: [
        '_prds/wip/prd-001-config-state-locks.md',
        '_tasks/wip/tasks-001-config-state-locks.md',
      ],
      ownedPaths: [
        'packages/provegate/src/**',
        'packages/provegate/test/**',
        'packages/provegate/schemas/**',
      ],
    };
    const issues = validateLock(DEFAULT_CONFIG, lease, {
      now: Date.parse(String(lease['startedAt'])),
    });
    expect(issues).toEqual([]);
  });
});

describe('listLockFiles', () => {
  it('tolerates parse errors as entries instead of throwing', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-locks-'));
    roots.push(root);
    mkdirSync(resolve(root, '_state/locks'), { recursive: true });
    writeFileSync(resolve(root, '_state/locks/good.json'), JSON.stringify(VALID_LOCK));
    writeFileSync(resolve(root, '_state/locks/bad.json'), '{ nope');

    const locks = listLockFiles(DEFAULT_CONFIG, root);
    expect(locks).toHaveLength(2);
    const bad = locks.find((l) => l.name === 'bad.json')!;
    expect(bad.error).toBeDefined();
    expect(bad.data).toBeUndefined();
    const good = locks.find((l) => l.name === 'good.json')!;
    expect(good.data?.['prd']).toBe('PRD-001');
  });
});

describe('findLeaseConflicts', () => {
  it('reports touchedFiles overlap between unexpired locks only', () => {
    const a = { name: 'a.json', data: { ...VALID_LOCK, touchedFiles: ['x.md', 'y.md'] } };
    const b = { name: 'b.json', data: { ...VALID_LOCK, prd: 'PRD-002', touchedFiles: ['y.md'] } };
    const expired = {
      name: 'c.json',
      data: {
        ...VALID_LOCK,
        prd: 'PRD-003',
        touchedFiles: ['x.md'],
        expiresAt: '2026-07-22T11:00:00.000Z',
      },
    };
    const conflicts = findLeaseConflicts([a, b, expired], { now: NOW });
    expect(conflicts).toEqual([{ a: 'a.json', b: 'b.json', shared: ['y.md'] }]);
  });
});

describe('codex review regressions', () => {
  it('valid-JSON non-object lock files become error entries, never data', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-locks-'));
    roots.push(root);
    mkdirSync(resolve(root, '_state/locks'), { recursive: true });
    writeFileSync(resolve(root, '_state/locks/null.json'), 'null');
    writeFileSync(resolve(root, '_state/locks/num.json'), '42');
    writeFileSync(resolve(root, '_state/locks/arr.json'), '[]');

    const locks = listLockFiles(DEFAULT_CONFIG, root);
    expect(locks).toHaveLength(3);
    for (const lock of locks) {
      expect(lock.data, lock.name).toBeUndefined();
      expect(lock.error, lock.name).toContain('not a JSON object');
    }
  });
});
