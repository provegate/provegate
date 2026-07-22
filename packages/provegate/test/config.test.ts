import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';

describe('DEFAULT_CONFIG covers every chokepoint parameter', () => {
  it('has the four artifact kinds with dirs and prefixes', () => {
    expect(DEFAULT_CONFIG.dirs.artifacts.prd).toEqual({ dir: '_prds', prefix: 'prd' });
    expect(DEFAULT_CONFIG.dirs.artifacts.readiness).toEqual({
      dir: '_readiness',
      prefix: 'readiness',
    });
    expect(DEFAULT_CONFIG.dirs.artifacts.tasks).toEqual({ dir: '_tasks', prefix: 'tasks' });
    expect(DEFAULT_CONFIG.dirs.artifacts.summary).toEqual({ dir: '_docs', prefix: 'summary' });
  });

  it('has lifecycle states, state file, and locks dir', () => {
    expect(DEFAULT_CONFIG.dirs.states).toEqual(['wip', 'completed', 'deferred']);
    expect(DEFAULT_CONFIG.dirs.stateFile).toBe('_state/prds.json');
    expect(DEFAULT_CONFIG.dirs.locksDir).toBe('_state/locks');
  });

  it('has the id pattern', () => {
    expect(DEFAULT_CONFIG.idPattern).toEqual({ prefix: 'PRD', width: 3 });
  });

  it('has the status vocabulary with alias map and role sets', () => {
    const vocab = DEFAULT_CONFIG.statusVocab;
    expect(vocab.canonical).toContain('Ship Verified');
    expect(vocab.aliases['done']).toBe('Ship Verified');
    expect(vocab.aliases['proposed']).toBe('Draft');
    expect(vocab.active).toContain('In Progress');
    expect(vocab.implemented).toContain('Code Complete');
    expect(vocab.ready).toEqual(['Approved']);
    expect(vocab.blocked).toEqual(['Blocked']);
    expect(vocab.reviewing).toEqual(['Code Complete', 'Operator Verification']);
    for (const set of [
      vocab.active,
      vocab.implemented,
      vocab.ready,
      vocab.blocked,
      vocab.reviewing,
    ]) {
      for (const status of set) expect(vocab.canonical).toContain(status);
    }
  });

  it('has the branch policy (base-branch-policy port)', () => {
    expect(DEFAULT_CONFIG.branches.base).toBe('main');
    expect(DEFAULT_CONFIG.branches.protected).toEqual(['main', 'master', 'staging']);
    expect(DEFAULT_CONFIG.branches.featurePattern).toContain('{id}');
    expect(DEFAULT_CONFIG.branches.featurePattern).toContain('{slug}');
    expect(DEFAULT_CONFIG.branches.allowedDirectPrefixes).toContain('_prds/');
    expect(DEFAULT_CONFIG.branches.allowedDirectFiles).toContain('README.md');
  });

  it('has commands, owners, worktree, execution phases, shared append-only', () => {
    expect(DEFAULT_CONFIG.commands.checkTypes.length).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.owners).toEqual(['owner', 'operator']);
    expect(DEFAULT_CONFIG.worktree.dir).toBe('.worktrees');
    expect(DEFAULT_CONFIG.executionPhases).toContain('Phase 4');
    expect(DEFAULT_CONFIG.sharedAppendOnly).toContain('package.json');
  });

  it('contains no personal names and no non-ASCII (Turkish) strings', () => {
    const flat = JSON.stringify(DEFAULT_CONFIG);
    expect(flat.toLowerCase()).not.toContain('rayvaz');
    expect(flat.toLowerCase()).not.toContain('emofy');
    // eslint-disable-next-line no-control-regex
    expect(/^[\x00-\x7F]*$/.test(flat)).toBe(true);
  });
});
