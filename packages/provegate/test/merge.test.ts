import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge, type WorkflowConfig } from '../src/core/config/index.js';
import { defaultManifest, type GatesManifest } from '../src/core/gates/manifest.js';
import { archiveCommitMessage } from '../src/core/run/archive.js';
import { ensureCheckoutClean, mergeToLocalBase, mergeMessage } from '../src/core/run/merge.js';

const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

function git(dir: string, args: string[]): string {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
}

/** Single-checkout fixture: main + feat branch with one committed change. */
function fixtureRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-merge-'));
  roots.push(root);
  git(root, ['init', '-q', '-b', 'main']);
  git(root, ['config', 'user.email', 'test@example.invalid']);
  git(root, ['config', 'user.name', 'Test']);
  git(root, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(resolve(root, 'base.txt'), 'base\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-q', '-m', 'chore: init']);
  git(root, ['checkout', '-q', '-b', 'feat/x']);
  writeFileSync(resolve(root, 'feature.txt'), 'feature\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-q', '-m', 'feat: change']);
  return root;
}

// node is not in allowedDirectPrefixes-land; use node -e as post-merge command
const okManifest = (cfg: WorkflowConfig): GatesManifest => ({
  ...defaultManifest(cfg),
  postMerge: ['node -e "process.exit(0)"'],
});
const failManifest = (cfg: WorkflowConfig): GatesManifest => ({
  ...defaultManifest(cfg),
  postMerge: ['node -e "process.exit(0)"', 'node -e "process.exit(1)"'],
});

const cfg = DEFAULT_CONFIG;

describe('mergeToLocalBase — single-checkout fallback', () => {
  it('merges no-ff, runs post-merge gates, stays on base with a diffstat', () => {
    const root = fixtureRepo();
    const result = mergeToLocalBase({
      config: cfg,
      manifest: okManifest(cfg),
      root,
      id: 'PRD-002',
    });
    expect(result.ok).toBe(true);
    expect(git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('main');
    expect(git(root, ['log', '-1', '--format=%s'])).toBe(mergeMessage('PRD-002'));
    expect(git(root, ['log', '-1', '--format=%p']).split(' ')).toHaveLength(2);
    expect(readFileSync(resolve(root, 'feature.txt'), 'utf8')).toBe('feature\n');
    expect(result.diffstat).toContain('1 file');
  });

  it('auto-reverts on post-merge failure and returns to the feature branch (W2 card)', () => {
    const root = fixtureRepo();
    const before = git(root, ['rev-parse', 'main']);
    const result = mergeToLocalBase({
      config: cfg,
      manifest: failManifest(cfg),
      root,
      id: 'PRD-002',
    });
    expect(result.ok).toBe(false);
    expect(result.why).toContain('merge reverted');
    expect(git(root, ['rev-parse', 'main'])).toBe(before);
    expect(git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('feat/x');
    expect(result.postMergeResults).toContainEqual([
      'post-merge: node -e "process.exit(1)"',
      'FAILED',
    ]);
  });

  it('refuses when already on the base branch (W2 precondition)', () => {
    const root = fixtureRepo();
    git(root, ['checkout', '-q', 'main']);
    const result = mergeToLocalBase({
      config: cfg,
      manifest: okManifest(cfg),
      root,
      id: 'PRD-002',
    });
    expect(result.ok).toBe(false);
    expect(result.why).toContain("current branch is 'main'");
  });

  it('refuses a dirty feature checkout with non-coordination files (W2 precondition)', () => {
    const root = fixtureRepo();
    writeFileSync(resolve(root, 'feature.txt'), 'uncommitted edit\n');
    const result = mergeToLocalBase({
      config: cfg,
      manifest: okManifest(cfg),
      root,
      id: 'PRD-002',
    });
    expect(result.ok).toBe(false);
    expect(result.why).toContain('non-coordination files');
  });

  it('resets tracked coordination-only dirt and proceeds', () => {
    const root = fixtureRepo();
    // tracked coordination file, then dirtied
    writeFileSync(resolve(root, 'README.md'), 'readme\n');
    git(root, ['add', 'README.md']);
    git(root, ['commit', '-q', '-m', 'docs: readme']);
    writeFileSync(resolve(root, 'README.md'), 'dirty\n');
    const result = mergeToLocalBase({
      config: cfg,
      manifest: okManifest(cfg),
      root,
      id: 'PRD-002',
    });
    expect(result.ok).toBe(true);
    expect(readFileSync(resolve(root, 'README.md'), 'utf8')).toBe('readme\n');
  });

  it('aborts cleanly on merge conflict and returns to the feature branch', () => {
    const root = fixtureRepo();
    git(root, ['checkout', '-q', 'main']);
    writeFileSync(resolve(root, 'feature.txt'), 'conflicting\n');
    git(root, ['add', '.']);
    git(root, ['commit', '-q', '-m', 'chore: conflict seed']);
    git(root, ['checkout', '-q', 'feat/x']);
    const result = mergeToLocalBase({
      config: cfg,
      manifest: okManifest(cfg),
      root,
      id: 'PRD-002',
    });
    expect(result.ok).toBe(false);
    expect(result.why).toContain('merge failed');
    expect(git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('feat/x');
  });
});

describe('ensureCheckoutClean', () => {
  it('honors custom coordination prefixes from config', () => {
    const root = fixtureRepo();
    const custom = deepMerge(cfg, { branches: { allowedDirectPrefixes: ['notes/'] } });
    writeFileSync(resolve(root, 'stray.ts'), 'x\n');
    const result = ensureCheckoutClean(custom, root);
    expect(result.ok).toBe(false);
    expect(result.why).toContain('stray.ts');
  });
});

describe('commit message shapes (W3)', () => {
  it('archive and merge messages are conventional with lower-case subjects', () => {
    for (const msg of [archiveCommitMessage('PRD-002'), mergeMessage('PRD-002')]) {
      expect(msg).toMatch(/^[a-z]+\([a-z-]+\): [a-z]/);
    }
  });
});
