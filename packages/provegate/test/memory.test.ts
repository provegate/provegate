import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  deepMerge,
  validateConfig,
  validateResolvedConfig,
  type PartialWorkflowConfig,
} from '../src/core/config/index.js';

/**
 * PRD-017 FR-2: the memory configuration surface. Two properties carry the
 * whole safety argument of this PRD — memory is off unless someone turns it on,
 * and nothing infers enablement from a `_brain` directory existing — so they are
 * asserted rather than assumed.
 */

const resolved = (memory: Partial<typeof DEFAULT_CONFIG.memory>) =>
  validateResolvedConfig(
    deepMerge(DEFAULT_CONFIG, { memory } as PartialWorkflowConfig) as typeof DEFAULT_CONFIG,
  );

const paths = (issues: { path: string }[]) => issues.map((i) => i.path);

describe('memory configuration defaults (FR-2)', () => {
  it('ships disabled, with the conventional layout but no entrypoints claimed', () => {
    expect(DEFAULT_CONFIG.memory).toEqual({
      enabled: false,
      root: '_brain',
      index: '_brain/INDEX.md',
      entrypoints: [],
      verifyCommand: '',
      retroAfterCompleted: 0,
    });
  });

  it('a repository with no memory block resolves clean', () => {
    expect(validateResolvedConfig(DEFAULT_CONFIG)).toEqual([]);
  });
});

describe('memory shape validation (FR-2)', () => {
  it('rejects a non-boolean switch and a typo\u0027d key', () => {
    const issues = validateConfig({ memory: { enabled: 'yes', rooot: '_brain' } });
    expect(paths(issues)).toEqual(expect.arrayContaining(['memory.enabled', 'memory.rooot']));
    expect(issues.find((i) => i.path === 'memory.enabled')?.message).toContain('boolean');
    expect(issues.find((i) => i.path === 'memory.rooot')?.message).toBe('unknown key');
  });

  it('accepts 0 as a disabled cadence but refuses negative and fractional ones', () => {
    expect(validateConfig({ memory: { retroAfterCompleted: 0 } })).toEqual([]);
    expect(validateConfig({ memory: { retroAfterCompleted: 5 } })).toEqual([]);
    for (const bad of [-1, 1.5, true, '3']) {
      const issues = validateConfig({ memory: { retroAfterCompleted: bad } });
      expect(paths(issues), String(bad)).toContain('memory.retroAfterCompleted');
    }
  });

  it('allows an empty verifyCommand (the field is off, not missing)', () => {
    expect(validateConfig({ memory: { verifyCommand: '' } })).toEqual([]);
  });
});

describe('memory path containment (FR-2)', () => {
  it('refuses absolute, parent-escaping, home-relative, and drive-letter paths', () => {
    for (const bad of ['/etc/brain', '../outside', '~/brain', 'C:\\brain', '\\\\server\\share']) {
      const issues = resolved({ root: bad, index: `${bad}/INDEX.md` });
      expect(paths(issues), bad).toContain('memory.root');
    }
  });

  it('tags the offending entrypoint by index, not just the array', () => {
    const issues = resolved({ entrypoints: ['CLAUDE.md', '../elsewhere/AGENTS.md'] });
    expect(paths(issues)).toContain('memory.entrypoints[1]');
    expect(paths(issues)).not.toContain('memory.entrypoints[0]');
  });

  it('checks containment even while memory is disabled', () => {
    // A bad path parked in a disabled block is a trap that springs on the day
    // someone flips the switch — the point of catching it now.
    const issues = resolved({ enabled: false, root: '../elsewhere' });
    expect(paths(issues)).toContain('memory.root');
  });

  it('refuses an index that lives outside the store it indexes', () => {
    const issues = resolved({ root: '_brain', index: '_docs/INDEX.md' });
    expect(issues.find((i) => i.path === 'memory.index')?.message).toContain('must live under');
  });

  it('accepts a nested store and its index', () => {
    expect(resolved({ root: 'docs/_brain', index: 'docs/_brain/INDEX.md' })).toEqual([]);
  });
});

describe('memory verifyCommand safety (FR-2)', () => {
  it('runs the configured validator through the same allowlist as a gate command', () => {
    for (const unsafe of [
      'node scripts/verify/verify-brain.mjs && git push',
      'node x.mjs `whoami`',
      'node x.mjs; rm -rf /',
      'node x.mjs > /tmp/out',
      'verify-brain.mjs',
    ]) {
      const issues = resolved({ verifyCommand: unsafe });
      expect(paths(issues), unsafe).toContain('memory.verifyCommand');
    }
  });

  it('accepts an allowlisted validator invocation', () => {
    expect(resolved({ verifyCommand: 'node scripts/verify/verify-brain.mjs' })).toEqual([]);
    expect(resolved({ verifyCommand: 'pnpm verify:brain' })).toEqual([]);
  });
});

describe('memory enablement preconditions (FR-2)', () => {
  it('requires at least one entrypoint once enabled', () => {
    const issues = resolved({ enabled: true, entrypoints: [] });
    expect(issues.find((i) => i.path === 'memory.entrypoints')?.message).toContain('at least one');
  });

  it('accepts a complete enabled block', () => {
    expect(
      resolved({
        enabled: true,
        root: '_brain',
        index: '_brain/INDEX.md',
        entrypoints: ['CLAUDE.md', 'AGENTS.md'],
        verifyCommand: 'node scripts/verify/verify-brain.mjs',
        retroAfterCompleted: 5,
      }),
    ).toEqual([]);
  });

  it('an empty entrypoint list is legal while disabled', () => {
    expect(resolved({ enabled: false, entrypoints: [] })).toEqual([]);
  });
});
