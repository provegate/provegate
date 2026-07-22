import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge, type WorkflowConfig } from '../src/core/config/index.js';
import { defaultManifest, type GatesManifest } from '../src/core/gates/manifest.js';
import { archiveCommitMessage, archivePrdArtifacts } from '../src/core/run/archive.js';
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

describe('codex review regressions (round 1)', () => {
  it('refuses detached HEAD instead of self-merging the base tip', () => {
    const root = fixtureRepo();
    git(root, ['checkout', '-q', '--detach']);
    const result = mergeToLocalBase({
      config: cfg,
      manifest: okManifest(cfg),
      root,
      id: 'PRD-002',
    });
    expect(result.ok).toBe(false);
    expect(result.why).toContain('detached HEAD');
  });

  it('auto-revert restores the CAPTURED pre-merge sha even when a post-merge command commits', () => {
    const root = fixtureRepo();
    const before = git(root, ['rev-parse', 'main']);
    const committing =
      "node -e \"require('node:child_process').execFileSync('git',['commit','--allow-empty','-m','chore: post-merge side commit'])\"";
    const manifest = {
      ...defaultManifest(cfg),
      postMerge: [committing, 'node -e "process.exit(1)"'],
    };
    const result = mergeToLocalBase({ config: cfg, manifest, root, id: 'PRD-002' });
    expect(result.ok).toBe(false);
    expect(git(root, ['rev-parse', 'main'])).toBe(before);
    expect(git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('feat/x');
  });

  it('worktree-path merge conflict aborts cleanly (no MERGE_HEAD left behind)', () => {
    const root = fixtureRepo();
    // conflict seed on main
    git(root, ['checkout', '-q', 'main']);
    writeFileSync(resolve(root, 'feature.txt'), 'conflicting\n');
    git(root, ['add', '.']);
    git(root, ['commit', '-q', '-m', 'chore: conflict seed']);
    git(root, ['checkout', '-q', 'feat/x']);
    // base checked out in a linked worktree OUTSIDE the repo (an in-repo
    // worktree dir would itself be non-coordination dirt)
    const wtDir = mkdtempSync(join(tmpdir(), 'provegate-wt-'));
    roots.push(wtDir);
    git(root, ['worktree', 'add', '-q', '-f', wtDir, 'main']);
    const result = mergeToLocalBase({
      config: cfg,
      manifest: okManifest(cfg),
      root,
      id: 'PRD-002',
    });
    expect(result.ok).toBe(false);
    expect(result.why).toContain('merge failed in base worktree');
    // absent MERGE_HEAD => rev-parse exits non-zero => throws => clean abort
    expect(() => git(wtDir, ['rev-parse', '--verify', '--quiet', 'MERGE_HEAD'])).toThrow();
    expect(git(wtDir, ['status', '--porcelain'])).toBe('');
  });

  it('worktree-path post-merge failure reverts the base worktree to the captured sha', () => {
    const root = fixtureRepo();
    const wtDir = mkdtempSync(join(tmpdir(), 'provegate-wt-'));
    roots.push(wtDir);
    git(root, ['worktree', 'add', '-q', '-f', wtDir, 'main']);
    const before = git(root, ['rev-parse', 'main']);
    const result = mergeToLocalBase({
      config: cfg,
      manifest: failManifest(cfg),
      root,
      id: 'PRD-002',
    });
    expect(result.ok).toBe(false);
    expect(git(root, ['rev-parse', 'main'])).toBe(before);
  });
});

describe('archive commit scoping (codex round 1)', () => {
  it('a staged unrelated file is NOT swept into the archive commit', () => {
    const root = fixtureRepo();
    // build a wip artifact + state file on the feature branch
    mkdirSync(resolve(root, '_prds/wip'), { recursive: true });
    mkdirSync(resolve(root, '_prds/completed'), { recursive: true });
    mkdirSync(resolve(root, '_state'), { recursive: true });
    writeFileSync(resolve(root, '_prds/wip/prd-005-thing.md'), '> **Status**: Code Complete\n');
    writeFileSync(resolve(root, '_state/prds.json'), '{}\n');
    git(root, ['add', '.']);
    git(root, ['commit', '-q', '-m', 'chore: artifacts']);
    // stage an unrelated source edit
    writeFileSync(resolve(root, 'stray.ts'), 'export {};\n');
    git(root, ['add', 'stray.ts']);

    const rec = {
      prd: 'PRD-005',
      number: 5,
      slug: 'thing',
      status: 'Code Complete',
      cyclePhase: null,
      operatorAcceptance: null,
      autonomousClose: null,
      artifacts: { prd: '_prds/wip/prd-005-thing.md', readiness: '', tasks: '', summary: '' },
      artifactStates: {
        prd: 'wip',
        readiness: 'missing',
        tasks: 'missing',
        summary: 'missing',
      },
      readiness: { score: null, verdict: null, modelTierExecution: null, modelTierAudit: null },
      task: { status: 'Unknown', checkedCount: 0, uncheckedCount: 0, operatorHandoffCount: 0 },
      summary: { shipReadiness: 'Unknown' },
      lastUpdated: null,
    } as const;
    const result = archivePrdArtifacts(cfg, root, rec);
    expect(result.committed).toBe(true);
    const committedFiles = git(root, ['show', '--name-only', '--format=', 'HEAD']);
    expect(committedFiles).toContain('_prds/completed/prd-005-thing.md');
    expect(committedFiles).not.toContain('stray.ts');
    // stray stays staged, untouched
    expect(git(root, ['diff', '--cached', '--name-only'])).toContain('stray.ts');
  });
});

describe('codex round-2 test adequacy', () => {
  it('worktree revert also survives an intervening post-merge commit', () => {
    const root = fixtureRepo();
    const wtDir = mkdtempSync(join(tmpdir(), 'provegate-wt-'));
    roots.push(wtDir);
    git(root, ['worktree', 'add', '-q', '-f', wtDir, 'main']);
    const before = git(root, ['rev-parse', 'main']);
    const committing =
      "node -e \"require('node:child_process').execFileSync('git',['commit','--allow-empty','-m','chore: side commit'])\"";
    const manifest = {
      ...defaultManifest(cfg),
      postMerge: [committing, 'node -e "process.exit(1)"'],
    };
    const result = mergeToLocalBase({ config: cfg, manifest, root, id: 'PRD-002' });
    expect(result.ok).toBe(false);
    expect(git(root, ['rev-parse', 'main'])).toBe(before);
  });
});
