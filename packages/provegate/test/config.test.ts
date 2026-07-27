import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ConfigError,
  DEFAULT_CONFIG,
  resolveConfig,
  validateConfig,
} from '../src/core/config/index.js';

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

// --- PRD-029 FR-1: the prompts config surface -------------------------------

const promptRoots: string[] = [];

function tempRepo(config: unknown): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-prompts-cfg-'));
  promptRoots.push(root);
  writeFileSync(join(root, 'workflow.config.json'), `${JSON.stringify(config, null, 2)}\n`);
  return root;
}

afterEach(() => {
  while (promptRoots.length > 0) rmSync(promptRoots.pop()!, { recursive: true, force: true });
});

describe('prompts config surface (PRD-029 FR-1)', () => {
  it('ships disabled, and PRESENCE is never the predicate', () => {
    // `mergeConfig` deep-merges DEFAULT_CONFIG, so `prompts` exists in every
    // repository. A presence test would be true everywhere and could gate
    // nothing; `enabled` is the predicate. This is the defaults.ts:95-101
    // reasoning for `memory`, applied here rather than rediscovered.
    expect(DEFAULT_CONFIG.prompts.enabled).toBe(false);
    const root = tempRepo({ idPattern: { prefix: 'PRD', width: 3 } });
    const resolved = resolveConfig(root);
    expect(resolved.prompts).toBeDefined();
    expect(resolved.prompts.enabled).toBe(false);
    expect(resolved.prompts.dir).toBe('.provegate');
    expect(resolved.prompts.adapters).toEqual(['claude-code', 'cursor', 'codex']);
  });

  it('accepts null and the empty string as values, which stringRecord would refuse', () => {
    // The two shapes FR-4 declares legal: `null` is unset, `''` is legal for the
    // tokens the registry marks. `stringRecord` rejects a non-string AND an
    // empty string (validate.ts), which is why `stringOrNullRecord` exists.
    expect(
      validateConfig({ prompts: { values: { ARCHITECTURE_DOC: null, DOMAIN_CHECKS: '' } } }),
    ).toEqual([]);
    expect(validateConfig({ prompts: { values: { ARCHITECTURE_DOC: 3 } } })).not.toEqual([]);
  });

  it('does not reject an unknown values key — that is a render diagnostic', () => {
    // The legal key set is the token set of the rendered corpus, which is
    // package Markdown this layer must not read. FR-3's `unused` owns it.
    expect(validateConfig({ prompts: { values: { NOT_A_TOKEN: 'x' } } })).toEqual([]);
  });

  it('rejects an unknown key inside the prompts block itself', () => {
    const issues = validateConfig({ prompts: { enabledd: true } });
    expect(issues.length).toBeGreaterThan(0);
  });

  it('accepts a prompts.dir that does not exist yet', () => {
    // First install: `.provegate` has not been created. A literal
    // realpath-both-sides containment refuses every fresh repository; the
    // shared primitive walks the longest existing prefix instead.
    const root = tempRepo({ prompts: { enabled: true } });
    expect(() => resolveConfig(root)).not.toThrow();
  });

  it('accepts a repository root that is itself behind a symlink', () => {
    const real = mkdtempSync(join(tmpdir(), 'provegate-prompts-real-'));
    promptRoots.push(real);
    writeFileSync(
      join(real, 'workflow.config.json'),
      `${JSON.stringify({ prompts: { enabled: true } }, null, 2)}\n`,
    );
    mkdirSync(join(real, '.provegate'));
    const linkDir = mkdtempSync(join(tmpdir(), 'provegate-prompts-link-'));
    promptRoots.push(linkDir);
    const link = join(linkDir, 'repo');
    symlinkSync(real, link, 'dir');
    // macOS `/var -> /private/var` is the everyday case. The root is realpath'd
    // on both sides of the comparison, so this must NOT be refused.
    expect(() => resolveConfig(link)).not.toThrow();
  });

  it('DENY: refuses a prompts.dir that escapes the workspace through a symlink', () => {
    const outside = mkdtempSync(join(tmpdir(), 'provegate-prompts-outside-'));
    promptRoots.push(outside);
    const root = tempRepo({ prompts: { enabled: true, dir: 'store' } });
    symlinkSync(outside, join(root, 'store'), 'dir');
    expect(() => resolveConfig(root)).toThrow(ConfigError);
  });

  it('DENY: a disabled block is not filesystem-checked, so a stale link cannot break a load', () => {
    // The memory guard's reasoning, applied: a repository that never opted in
    // must not fail every config load over a filesystem it did not choose.
    const outside = mkdtempSync(join(tmpdir(), 'provegate-prompts-outside2-'));
    promptRoots.push(outside);
    const root = tempRepo({ prompts: { enabled: false, dir: 'store' } });
    symlinkSync(outside, join(root, 'store'), 'dir');
    expect(() => resolveConfig(root)).not.toThrow();
  });
});
