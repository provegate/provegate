import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { releaseLease } from '../src/core/run/release.js';

// Far-future expiry so leases are valid (not stale) by default.
const lockFor = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  schemaVersion: 2,
  lockId: 'prd-001-test',
  agent: 'owner',
  prd: 'PRD-001',
  phase: 'Phase 4',
  startedAt: '2026-07-24T10:00:00.000Z',
  expiresAt: '2099-01-01T00:00:00.000Z',
  touchedFiles: ['_prds/wip/prd-001-test.md'],
  ownedPaths: ['src/x/**'],
  ...overrides,
});

const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

function workspace(): { root: string; locks: string } {
  const root = mkdtempSync(join(tmpdir(), 'provegate-release-'));
  roots.push(root);
  const locks = resolve(root, '_state/locks');
  mkdirSync(locks, { recursive: true });
  return { root, locks };
}

function writeLock(locks: string, name: string, data: unknown): string {
  const path = resolve(locks, name);
  writeFileSync(path, typeof data === 'string' ? data : JSON.stringify(data));
  return path;
}

describe('releaseLease', () => {
  it('releases the caller\'s own lease and unlinks the file', () => {
    const { root, locks } = workspace();
    const path = writeLock(locks, 'prd-001-test.json', lockFor());
    const result = releaseLease(DEFAULT_CONFIG, root, 'PRD-001'); // default agent = owner
    expect(result.ok).toBe(true);
    expect(result.released).toHaveLength(1);
    expect(result.released[0]).toMatchObject({ prd: 'PRD-001', agent: 'owner', foreign: false });
    expect(existsSync(path)).toBe(false);
  });

  it('refuses a foreign lease without --force, naming the holder, no unlink', () => {
    const { root, locks } = workspace();
    const path = writeLock(locks, 'prd-001-test.json', lockFor({ agent: 'agent-b' }));
    const result = releaseLease(DEFAULT_CONFIG, root, 'PRD-001'); // acting = owner ≠ agent-b
    expect(result.ok).toBe(false);
    expect(result.released).toHaveLength(0);
    expect(result.issues.join('\n')).toContain('agent-b');
    expect(result.issues.join('\n')).toContain('--force');
    expect(existsSync(path)).toBe(true); // preserved
  });

  it('releases a foreign lease with --force and reports the victim', () => {
    const { root, locks } = workspace();
    const path = writeLock(locks, 'prd-001-test.json', lockFor({ agent: 'agent-b' }));
    const result = releaseLease(DEFAULT_CONFIG, root, 'PRD-001', { force: true });
    expect(result.ok).toBe(true);
    expect(result.released[0]).toMatchObject({ agent: 'agent-b', foreign: true });
    expect(existsSync(path)).toBe(false);
  });

  it('is idempotent: no lease for the id → ok, nothing released (exit 0)', () => {
    const { root } = workspace();
    const result = releaseLease(DEFAULT_CONFIG, root, 'PRD-042');
    expect(result.ok).toBe(true);
    expect(result.released).toHaveLength(0);
    expect(result.issues.join('\n')).toContain('nothing to release');
  });

  it('fails closed on a malformed lease for the id (no unlink)', () => {
    const { root, locks } = workspace();
    const path = writeLock(locks, 'prd-001-test.json', '{ not json');
    const result = releaseLease(DEFAULT_CONFIG, root, 'PRD-001');
    expect(result.ok).toBe(false);
    expect(result.released).toHaveLength(0);
    expect(result.issues.join('\n')).toContain('malformed');
    expect(existsSync(path)).toBe(true); // never unlinked while unknowable
  });

  it('does not touch a well-formed lease belonging to a DIFFERENT id', () => {
    const { root, locks } = workspace();
    const other = writeLock(locks, 'prd-002-other.json', lockFor({ prd: 'PRD-002', lockId: 'prd-002-other' }));
    const mine = writeLock(locks, 'prd-001-test.json', lockFor());
    const result = releaseLease(DEFAULT_CONFIG, root, 'PRD-001');
    expect(result.ok).toBe(true);
    expect(existsSync(mine)).toBe(false); // released
    expect(existsSync(other)).toBe(true); // untouched
  });

  it('W1 — aborts the unlink when the lease is refreshed in the race window', () => {
    const { root, locks } = workspace();
    const path = writeLock(locks, 'prd-001-test.json', lockFor());
    // Simulate a rival `gate renew` between parse and unlink: rewrite the lease
    // with a changed expiresAt (an identity field), so the re-read mismatches.
    const result = releaseLease(DEFAULT_CONFIG, root, 'PRD-001', {
      raceWindow: () => {
        writeFileSync(path, JSON.stringify(lockFor({ expiresAt: '2100-06-01T00:00:00.000Z' })));
      },
    });
    expect(result.released).toHaveLength(0);
    expect(result.issues.join('\n')).toContain('changed since it was read');
    expect(existsSync(path)).toBe(true); // the refreshed lease survives
  });
});
