import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import type { GatesManifest } from '../src/core/gates/manifest.js';
import { validateLock } from '../src/core/locks/index.js';
import {
  baseWorktreeReady,
  claimPrd,
  createPrd,
  createWorktree,
  ensureCheckoutClean,
  initWorkspace,
  mergeToLocalBase,
  removeWorktree,
} from '../src/core/run/index.js';

const run = promisify(execFile);
const cfg = DEFAULT_CONFIG;
const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

/** Real git repo with one commit — worktrees need a HEAD to branch from. */
async function gitRoot(): Promise<string> {
  const root = mkdtempSync(join(tmpdir(), 'provegate-wt-'));
  roots.push(root);
  await run('git', ['init', '-b', 'main'], { cwd: root });
  await run('git', ['-C', root, 'config', 'user.email', 'test@example.com']);
  await run('git', ['-C', root, 'config', 'user.name', 'Test']);
  writeFileSync(join(root, 'seed.txt'), 'seed\n');
  await run('git', ['-C', root, 'add', 'seed.txt']);
  await run('git', ['-C', root, 'commit', '-m', 'seed']);
  initWorkspace(cfg, root);
  return root;
}

/** `gate open --worktree` provisions FROM the base ref, so the artifacts it
 * claims must be committed there first (codex r15) — the real flow, and what
 * these tests exercise unless they assert the refusal itself. */
async function commitArtifacts(root: string): Promise<void> {
  await run('git', ['-C', root, 'add', '-A']);
  await run('git', ['-C', root, 'commit', '-m', 'workflow artifacts']);
}

/** PRD with a declared Conflict Surface (open.test.ts recipe). */
function prdWithSurface(root: string, slug: string, globs: string[]): string {
  const { id, path } = createPrd(cfg, root, { slug });
  const content = readFileSync(path, 'utf8');
  const replaced = content.replace(
    /## Conflict Surface\n[\s\S]*?(?=\n## |$)/,
    `## Conflict Surface\n\n${globs.map((g) => `- \`${g}\``).join('\n')}\n\n`,
  );
  if (replaced === content) throw new Error('template Conflict Surface section not found');
  writeFileSync(path, replaced);
  return id;
}

const EMPTY_MANIFEST: GatesManifest = {
  phases: {},
  classDefaults: {},
  hardCaps: [],
  postMerge: [],
  wiringExceptions: {},
} as unknown as GatesManifest;

describe('createWorktree / removeWorktree (FR-1, W4)', () => {
  it('round-trip: branch + worktree created from main HEAD, then removed cleanly', async () => {
    const root = await gitRoot();
    const made = createWorktree(cfg, root, { id: 'PRD-001', slug: 'round-trip' });
    expect(made.relPath).toBe('.worktrees/prd-001-round-trip');
    expect(made.branch).toBe('feat/prd-001-round-trip');
    expect(existsSync(join(made.path, 'seed.txt'))).toBe(true);
    const branches = (await run('git', ['-C', root, 'branch'], {})).stdout;
    expect(branches).toContain('feat/prd-001-round-trip');

    const removal = removeWorktree(cfg, root, {
      worktree: made.relPath,
      branch: made.branch,
    });
    expect(removal.removed).toBe(true);
    expect(removal.branchDeleted).toBe(true);
    expect(removal.warnings).toEqual([]);
    expect(existsSync(made.path)).toBe(false);
    expect((await run('git', ['-C', root, 'branch'], {})).stdout).not.toContain(
      'feat/prd-001-round-trip',
    );
  });

  it('containment: a worktree.dir escaping the main checkout refuses before any git call', async () => {
    const root = await gitRoot();
    const escaping = { ...cfg, worktree: { dir: '../outside' } };
    expect(() => createWorktree(escaping, root, { id: 'PRD-001', slug: 'escapee' })).toThrow(
      /escap/,
    );
    expect(existsSync(join(root, '..', 'outside'))).toBe(false);
  });

  it('collisions refuse: existing branch, existing path — and no half-state is left', async () => {
    const root = await gitRoot();
    await run('git', ['-C', root, 'branch', 'feat/prd-001-taken']);
    expect(() => createWorktree(cfg, root, { id: 'PRD-001', slug: 'taken' })).toThrow(
      /branch feat\/prd-001-taken already exists/,
    );
    expect(existsSync(join(root, '.worktrees/prd-001-taken'))).toBe(false);

    const made = createWorktree(cfg, root, { id: 'PRD-002', slug: 'path-clash' });
    expect(() => createWorktree(cfg, root, { id: 'PRD-002', slug: 'path-clash' })).toThrow(
      /already exists/,
    );
    expect(existsSync(made.path)).toBe(true);
  });

  it('dirty worktree: removal degrades to a warning, branch survives (W3)', async () => {
    const root = await gitRoot();
    const made = createWorktree(cfg, root, { id: 'PRD-001', slug: 'dirty' });
    writeFileSync(join(made.path, 'uncommitted.txt'), 'work in progress\n');
    const removal = removeWorktree(cfg, root, {
      worktree: made.relPath,
      branch: made.branch,
    });
    expect(removal.removed).toBe(false);
    expect(removal.branchDeleted).toBe(false);
    expect(removal.warnings.join(' ')).toContain(made.relPath);
    expect(existsSync(join(made.path, 'uncommitted.txt'))).toBe(true);
  });

  it('tampered lease path: removal refuses outside worktree.dir, nothing deleted', async () => {
    const root = await gitRoot();
    const removal = removeWorktree(cfg, root, {
      worktree: '_prds/wip',
      branch: 'feat/prd-001-evil',
    });
    expect(removal.removed).toBe(false);
    expect(removal.warnings.join(' ')).toContain('outside');
    expect(existsSync(join(root, '_prds/wip'))).toBe(true);
  });
});

describe('codex r1 regressions', () => {
  it('branches from the CONFIGURED base, not a diverged main-checkout HEAD (P1)', async () => {
    const root = await gitRoot();
    const mainTip = (await run('git', ['-C', root, 'rev-parse', 'main'], {})).stdout.trim();
    await run('git', ['-C', root, 'checkout', '-b', 'parked']);
    writeFileSync(join(root, 'diverged.txt'), 'not for the worktree\n');
    await run('git', ['-C', root, 'add', 'diverged.txt']);
    await run('git', ['-C', root, 'commit', '-m', 'diverged']);

    const made = createWorktree(cfg, root, { id: 'PRD-001', slug: 'based' });
    const wtTip = (await run('git', ['-C', made.path, 'rev-parse', 'HEAD'], {})).stdout.trim();
    expect(wtTip).toBe(mainTip);
    expect(existsSync(join(made.path, 'diverged.txt'))).toBe(false);
  });

  it('missing base branch refuses provisioning', async () => {
    const root = await gitRoot();
    const noBase = { ...cfg, branches: { ...cfg.branches, base: 'trunk' } };
    expect(() => createWorktree(noBase, root, { id: 'PRD-001', slug: 'no-base' })).toThrow(
      /base branch 'trunk' not found/,
    );
  });

  it('tracked modifications under worktree.dir REFUSE the merge, never reset (P1)', async () => {
    const root = await gitRoot();
    const trackedDir = { ...cfg, worktree: { dir: 'trackedwt' } };
    writeFileSync(join(root, 'trackedwt-seed.txt'), 'x\n');
    await run('git', ['-C', root, 'add', '.'], {});
    await run('git', ['-C', root, 'commit', '-m', 'seed2'], {});
    // A TRACKED file inside the configured worktree dir:
    const { mkdirSync: mkdir } = await import('node:fs');
    mkdir(join(root, 'trackedwt'), { recursive: true });
    writeFileSync(join(root, 'trackedwt/source.ts'), 'original\n');
    await run('git', ['-C', root, 'add', 'trackedwt/source.ts']);
    await run('git', ['-C', root, 'commit', '-m', 'tracked under wt dir']);
    writeFileSync(join(root, 'trackedwt/source.ts'), 'MODIFIED\n');

    const result = ensureCheckoutClean(trackedDir, root);
    expect(result.ok).toBe(false);
    expect(result.why).toContain('trackedwt/source.ts');
    expect(readFileSync(join(root, 'trackedwt/source.ts'), 'utf8')).toBe('MODIFIED\n');
  });

  it('untracked worktree dir stays tolerated and untouched', async () => {
    const root = await gitRoot();
    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'workspace']);
    createWorktree(cfg, root, { id: 'PRD-001', slug: 'noise' });
    const result = ensureCheckoutClean(cfg, root);
    expect(result.ok).toBe(true);
    expect(existsSync(join(root, '.worktrees/prd-001-noise'))).toBe(true);
  });

  it('baseWorktreeReady: refuses when no checkout holds base or base is dirty (P1)', async () => {
    const root = await gitRoot();
    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'workspace']);
    const made = createWorktree(cfg, root, { id: 'PRD-001', slug: 'ready' });

    expect(baseWorktreeReady(cfg, made.path).ok).toBe(true);

    writeFileSync(join(root, 'seed.txt'), 'dirty source change\n');
    const dirty = baseWorktreeReady(cfg, made.path);
    expect(dirty.ok).toBe(false);
    expect(dirty.why).toContain('base checkout');
    await run('git', ['-C', root, 'checkout', '--', 'seed.txt']);

    await run('git', ['-C', root, 'checkout', '-b', 'elsewhere']);
    const parked = baseWorktreeReady(cfg, made.path);
    expect(parked.ok).toBe(false);
    expect(parked.why).toContain("no checkout holds 'main'");
  });

  it('a manually managed checkout at the deterministic path is refused, never adopted (P2)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'squat', ['src/squat/**']);
    await commitArtifacts(root);
    const stem = `${id.toLowerCase()}-squat`;
    await run('git', ['-C', root, 'branch', `feat/${stem}`]);
    const { mkdirSync: mkdir } = await import('node:fs');
    mkdir(join(root, '.worktrees'), { recursive: true });
    await run('git', ['-C', root, 'worktree', 'add', join(root, `.worktrees/${stem}`), `feat/${stem}`]);

    const result = claimPrd(cfg, root, id, { worktree: true });
    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain('claim rolled back');
    expect(existsSync(join(root, '_state/locks', `${stem}.json`))).toBe(false);
    // The manually managed checkout survives untouched.
    expect(existsSync(join(root, `.worktrees/${stem}`))).toBe(true);
  });
});

describe('codex r2 regressions', () => {
  it('honors branches.featurePattern for the provisioned branch (P2)', async () => {
    const root = await gitRoot();
    const patterned = {
      ...cfg,
      branches: { ...cfg.branches, featurePattern: 'work/{id}/{slug}' },
    };
    const made = createWorktree(patterned, root, { id: 'PRD-001', slug: 'shaped' });
    expect(made.branch).toBe('work/prd-001/shaped');
    expect((await run('git', ['-C', root, 'branch'], {})).stdout).toContain('work/prd-001/shaped');
  });

  it('tampered stamp escaping worktree.dir refuses cleanup even inside the repo (P2)', async () => {
    const root = await gitRoot();
    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'workspace']);
    // A real registered worktree OUTSIDE worktree.dir — the tampered stamp's target.
    await run('git', ['-C', root, 'branch', 'feat/elsewhere']);
    await run('git', ['-C', root, 'worktree', 'add', join(root, 'other-tree'), 'feat/elsewhere']);

    const removal = removeWorktree(cfg, root, {
      worktree: '.worktrees/../other-tree',
      branch: 'feat/elsewhere',
    });
    expect(removal.removed).toBe(false);
    expect(removal.warnings.join(' ')).toContain('outside');
    expect(existsSync(join(root, 'other-tree'))).toBe(true);
  });

  it('cleanup refuses a path occupied by a DIFFERENT branch (P2)', async () => {
    const root = await gitRoot();
    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'workspace']);
    const made = createWorktree(cfg, root, { id: 'PRD-001', slug: 'moved' });
    // Simulate: claimed tree moved away, an unrelated checkout now occupies the path.
    await run('git', ['-C', root, 'worktree', 'move', made.path, join(root, '.worktrees/parked')]);
    await run('git', ['-C', root, 'branch', 'feat/intruder']);
    await run('git', ['-C', root, 'worktree', 'add', made.path, 'feat/intruder']);

    const removal = removeWorktree(cfg, root, {
      worktree: made.relPath,
      branch: made.branch,
    });
    expect(removal.removed).toBe(false);
    expect(removal.warnings.join(' ')).toContain('feat/intruder');
    expect(existsSync(made.path)).toBe(true);
  });
});

describe('codex r3 regressions', () => {
  it('a symlinked stamp resolving outside worktree.dir refuses cleanup (P2)', async () => {
    const root = await gitRoot();
    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'workspace']);
    await run('git', ['-C', root, 'branch', 'feat/outside']);
    await run('git', ['-C', root, 'worktree', 'add', join(root, 'outside-tree'), 'feat/outside']);
    const { mkdirSync: mkdir, symlinkSync } = await import('node:fs');
    mkdir(join(root, '.worktrees'), { recursive: true });
    symlinkSync(join(root, 'outside-tree'), join(root, '.worktrees/prd-001-link'));

    const removal = removeWorktree(cfg, root, {
      worktree: '.worktrees/prd-001-link',
      branch: 'feat/outside',
    });
    expect(removal.removed).toBe(false);
    expect(removal.warnings.join(' ')).toContain('resolves outside');
    expect(existsSync(join(root, 'outside-tree', 'seed.txt'))).toBe(true);
  });

  it('failed worktree add (post-checkout hook) cleans only OUR debris, loudly (r2 P1 + r3 P2)', async () => {
    const root = await gitRoot();
    const { mkdirSync: mkdir, writeFileSync: write, chmodSync } = await import('node:fs');
    mkdir(join(root, '.git/hooks'), { recursive: true });
    write(join(root, '.git/hooks/post-checkout'), '#!/bin/sh\nexit 1\n');
    chmodSync(join(root, '.git/hooks/post-checkout'), 0o755);

    expect(() => createWorktree(cfg, root, { id: 'PRD-001', slug: 'hooked' })).toThrow(
      /worktree add failed/,
    );
    // Our debris was removed and our branch deleted — retry-able, no silent leftovers.
    expect(existsSync(join(root, '.worktrees/prd-001-hooked'))).toBe(false);
    expect((await run('git', ['-C', root, 'branch'], {})).stdout).not.toContain(
      'feat/prd-001-hooked',
    );
  });
});

describe('codex r4 regressions', () => {
  it('rollback preserves a lease REPLACED mid-provisioning by an external writer (P1)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'swapped', ['src/swapped/**']);
    await commitArtifacts(root);
    const leaseFile = join(root, '_state/locks', `${id.toLowerCase()}-swapped.json`);
    const { mkdirSync: mkdir, chmodSync } = await import('node:fs');
    mkdir(join(root, '.git/hooks'), { recursive: true });
    // The hook fires INSIDE `git worktree add`: it replaces the just-installed
    // lease (external writer) and then fails the checkout (provisioning error).
    writeFileSync(
      join(root, '.git/hooks/post-checkout'),
      `#!/bin/sh\nprintf '{"rival":true}' > "${leaseFile}"\nexit 1\n`,
    );
    chmodSync(join(root, '.git/hooks/post-checkout'), 0o755);

    const result = claimPrd(cfg, root, id, { worktree: true });
    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain('rollback INCOMPLETE');
    // The replacement lease survives — either restored in place or preserved
    // in quarantine, never unlinked blind.
    const preserved =
      (existsSync(leaseFile) && readFileSync(leaseFile, 'utf8').includes('rival')) ||
      result.issues.join(' ').includes('preserved at');
    expect(preserved).toBe(true);
  });
});

describe('codex r5 regressions', () => {
  it('a MOVED worktree is not reported as cleaned up (P2)', async () => {
    const root = await gitRoot();
    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'workspace']);
    const made = createWorktree(cfg, root, { id: 'PRD-001', slug: 'roamer' });
    await run('git', ['-C', root, 'worktree', 'move', made.path, join(root, '.worktrees/parked')]);

    const removal = removeWorktree(cfg, root, { worktree: made.relPath, branch: made.branch });
    expect(removal.removed).toBe(false);
    expect(removal.branchDeleted).toBe(false);
    expect(removal.warnings.join(' ')).toContain('moved to');
    expect(existsSync(join(root, '.worktrees/parked'))).toBe(true);
  });

  it('branch deletes after a green close even when the primary checkout is parked (P2)', async () => {
    const root = await gitRoot();
    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'workspace']);
    const made = createWorktree(cfg, root, { id: 'PRD-001', slug: 'parked-base' });
    writeFileSync(join(made.path, 'feature.txt'), 'work\n');
    await run('git', ['-C', made.path, 'add', 'feature.txt']);
    await run('git', ['-C', made.path, 'commit', '-m', 'feat: work']);

    // Layout: primary parked on another branch; base 'main' held by a linked worktree.
    await run('git', ['-C', root, 'checkout', '-b', 'parked']);
    await run('git', ['-C', root, 'worktree', 'add', join(root, 'base-holder'), 'main']);
    await run('git', ['-C', join(root, 'base-holder'), 'merge', '--no-ff', made.branch, '-m', 'land']);

    const removal = removeWorktree(cfg, root, { worktree: made.relPath, branch: made.branch });
    expect(removal.removed).toBe(true);
    expect(removal.branchDeleted).toBe(true);
    expect(removal.warnings).toEqual([]);
  });

  it('an UNREADABLE replacement lease is preserved and reported (P2)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'masked', ['src/masked/**']);
    await commitArtifacts(root);
    const leaseFile = join(root, '_state/locks', `${id.toLowerCase()}-masked.json`);
    const { mkdirSync: mkdir, chmodSync } = await import('node:fs');
    mkdir(join(root, '.git/hooks'), { recursive: true });
    writeFileSync(
      join(root, '.git/hooks/post-checkout'),
      `#!/bin/sh\nprintf '{"rival":true}' > "${leaseFile}"\nchmod 000 "${leaseFile}"\nexit 1\n`,
    );
    chmodSync(join(root, '.git/hooks/post-checkout'), 0o755);

    const result = claimPrd(cfg, root, id, { worktree: true });
    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain('rollback INCOMPLETE');
    // Restored to the pathname (or reported at quarantine) — never invisible.
    const visible =
      existsSync(leaseFile) || result.issues.join(' ').includes('preserved at');
    expect(visible).toBe(true);
    chmodSync(leaseFile, 0o644);
  });
});

describe('codex r6 regressions', () => {
  it('metrics from a worktree run land on the MAIN checkout (P1)', async () => {
    const root = await gitRoot();
    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'workspace']);
    const made = createWorktree(cfg, root, { id: 'PRD-001', slug: 'measured' });
    const { appendMetric } = await import('../src/core/run/index.js');
    const ok = appendMetric(cfg, made.path, {
      prd: 'PRD-001',
      phase: '5 Testing',
      gate: 'unit',
      result: 'passed',
    });
    expect(ok).toBe(true);
    expect(existsSync(join(root, '_state/prd-metrics.jsonl'))).toBe(true);
    expect(existsSync(join(made.path, '_state/prd-metrics.jsonl'))).toBe(false);
  });

  it('refuses deleting a branch NOT merged into base, even if the parked primary contains it (P2)', async () => {
    const root = await gitRoot();
    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'workspace']);
    const made = createWorktree(cfg, root, { id: 'PRD-001', slug: 'unlanded' });
    writeFileSync(join(made.path, 'feature.txt'), 'work\n');
    await run('git', ['-C', made.path, 'add', 'feature.txt']);
    await run('git', ['-C', made.path, 'commit', '-m', 'feat: work']);
    await run('git', ['-C', root, 'worktree', 'remove', made.path]);
    // Primary parks on a branch that MERGED the feature; base did not.
    await run('git', ['-C', root, 'checkout', '-b', 'parked']);
    await run('git', ['-C', root, 'merge', '--no-ff', made.branch, '-m', 'side-merge']);

    const removal = removeWorktree(cfg, root, { worktree: made.relPath, branch: made.branch });
    expect(removal.removed).toBe(true);
    expect(removal.branchDeleted).toBe(false);
    expect(removal.warnings.join(' ')).toContain('not merged into main');
  });

  it('a stale prunable registration is pruned, not reported as moved (P2)', async () => {
    const root = await gitRoot();
    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'workspace']);
    const made = createWorktree(cfg, root, { id: 'PRD-001', slug: 'stale' });
    rmSync(made.path, { recursive: true, force: true });

    const removal = removeWorktree(cfg, root, { worktree: made.relPath, branch: made.branch });
    expect(removal.removed).toBe(true);
    expect(removal.branchDeleted).toBe(true);
    expect(removal.warnings.join(' ')).not.toContain('moved to');
  });

  it('failed provision deletes its branch even from a parked primary missing the base tip (P2)', async () => {
    const root = await gitRoot();
    const seedSha = (await run('git', ['-C', root, 'rev-parse', 'HEAD'], {})).stdout.trim();
    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'workspace']);
    // Park BEFORE the workspace commit: parked HEAD does not contain main's tip.
    await run('git', ['-C', root, 'checkout', '-b', 'parked', seedSha]);
    const { mkdirSync: mkdir, writeFileSync: write, chmodSync } = await import('node:fs');
    mkdir(join(root, '.git/hooks'), { recursive: true });
    write(join(root, '.git/hooks/post-checkout'), '#!/bin/sh\nexit 1\n');
    chmodSync(join(root, '.git/hooks/post-checkout'), 0o755);

    expect(() => createWorktree(cfg, root, { id: 'PRD-001', slug: 'parked-fail' })).toThrow(
      /worktree add failed/,
    );
    expect((await run('git', ['-C', root, 'branch'], {})).stdout).not.toContain(
      'feat/prd-001-parked-fail',
    );
  });
});

describe('codex r8 regressions', () => {
  it('teardown refuses protected and option-like stamped branches (P1/P2)', async () => {
    const root = await gitRoot();
    for (const branch of ['staging', '-m']) {
      const removal = removeWorktree(cfg, root, {
        worktree: '.worktrees/prd-001-x',
        branch,
      });
      expect(removal.removed, branch).toBe(false);
      expect(removal.branchDeleted, branch).toBe(false);
      expect(removal.warnings.join(' '), branch).toContain('cleanup refused');
    }
    expect((await run('git', ['-C', root, 'branch'], {})).stdout).not.toContain('staging ');
  });

  it('provisioning refuses option-like and protected featurePattern expansions (P1/P2)', async () => {
    const root = await gitRoot();
    const dashed = { ...cfg, branches: { ...cfg.branches, featurePattern: '-m-{slug}' } };
    expect(() => createWorktree(dashed, root, { id: 'PRD-001', slug: 'x' })).toThrow(
      /option-like/,
    );
    const prot = { ...cfg, branches: { ...cfg.branches, featurePattern: 'staging' } };
    expect(() => createWorktree(prot, root, { id: 'PRD-001', slug: 'x' })).toThrow(/protected/);
  });

  it('a noncanonical worktree.dir spelling still closes cleanly (P2)', async () => {
    const root = await gitRoot();
    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'workspace']);
    const dotted = { ...cfg, worktree: { dir: './.worktrees/' } };
    const made = createWorktree(dotted, root, { id: 'PRD-001', slug: 'dotted' });
    expect(made.relPath).toBe('.worktrees/prd-001-dotted');
    expect(ensureCheckoutClean(dotted, root).ok).toBe(true);
    const removal = removeWorktree(dotted, root, {
      worktree: made.relPath,
      branch: made.branch,
    });
    expect(removal.removed).toBe(true);
    expect(removal.branchDeleted).toBe(true);
  });
});

describe('codex r9 regressions', () => {
  it('the configured base branch is protected even when not in branches.protected (P1)', async () => {
    const root = await gitRoot();
    const bareProtect = { ...cfg, branches: { ...cfg.branches, protected: [] as string[] } };
    const removal = removeWorktree(bareProtect, root, {
      worktree: '.worktrees/prd-001-x',
      branch: 'main',
    });
    expect(removal.removed).toBe(false);
    expect(removal.warnings.join(' ')).toContain('cleanup refused');
    expect((await run('git', ['-C', root, 'branch'], {})).stdout).toContain('main');
  });

  it('a noncanonical worktree.dir still produces a SCHEMA-VALID lease (P2)', async () => {
    const root = await gitRoot();
    const dotted = { ...cfg, worktree: { dir: './.worktrees/' } };
    const id = prdWithSurface(root, 'canonical', ['src/canonical/**']);
    await commitArtifacts(root);
    const result = claimPrd(dotted, root, id, { worktree: true });
    expect(result.ok).toBe(true);
    const lease = JSON.parse(readFileSync(result.leasePath!, 'utf8')) as Record<string, unknown>;
    expect(validateLock(dotted, lease)).toEqual([]);
    expect(lease['worktree']).toBe(`.worktrees/${id.toLowerCase()}-canonical`);
  });

  it('a hostile slug through the public API cannot escape worktree.dir (P2)', async () => {
    const root = await gitRoot();
    const flat = { ...cfg, branches: { ...cfg.branches, featurePattern: 'feat/static-{id}' } };
    expect(() =>
      createWorktree(flat, root, { id: 'PRD-001', slug: '../../../escaped' }),
    ).toThrow(/escapes \.worktrees/);
    expect(existsSync(join(root, 'escaped'))).toBe(false);
  });

  it('stamps survive a plain refresh after the PRD slug is renamed (P2)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'old-name', ['src/renamed/**']);
    await commitArtifacts(root);
    const first = claimPrd(cfg, root, id, { worktree: true });
    expect(first.ok).toBe(true);
    const { renameSync } = await import('node:fs');
    renameSync(
      join(root, '_prds/wip', `prd-${id.slice(4).toLowerCase()}-old-name.md`),
      join(root, '_prds/wip', `prd-${id.slice(4).toLowerCase()}-new-name.md`),
    );
    const refreshed = claimPrd(cfg, root, id);
    expect(refreshed.ok).toBe(true);
    const lease = JSON.parse(readFileSync(refreshed.leasePath!, 'utf8')) as Record<
      string,
      unknown
    >;
    expect(lease['worktree']).toBe(first.worktree!.relPath);
    expect(lease['branch']).toBe(first.worktree!.branch);
  });
});

describe('codex r10 regressions', () => {
  it('--worktree refresh after a PRD rename REUSES the stamped checkout (P2)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'first-name', ['src/reuse/**']);
    await commitArtifacts(root);
    const first = claimPrd(cfg, root, id, { worktree: true });
    expect(first.ok).toBe(true);
    const { renameSync } = await import('node:fs');
    renameSync(
      join(root, '_prds/wip', `prd-${id.slice(4).toLowerCase()}-first-name.md`),
      join(root, '_prds/wip', `prd-${id.slice(4).toLowerCase()}-second-name.md`),
    );
    await commitArtifacts(root);
    // The stamped checkout must carry the renamed PRD too, or reuse refuses
    // on staleness (r17) — merge the moved base into the feature branch.
    await run('git', ['-C', first.worktree!.path, 'merge', '--no-ff', 'main', '-m', 'sync base']);
    const again = claimPrd(cfg, root, id, { worktree: true });
    expect(again.ok, again.issues.join(' ')).toBe(true);
    expect(again.worktree?.relPath).toBe(first.worktree!.relPath);
    // No second tree provisioned under the new name.
    expect(existsSync(join(root, `.worktrees/${id.toLowerCase()}-second-name`))).toBe(false);
  });

  it('a stamped legacy self lease outranks an unstamped destination lease (P2)', async () => {
    const root = await gitRoot();
    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'workspace']);
    const id = prdWithSurface(root, 'legacy', ['src/legacy/**']);
    await commitArtifacts(root);
    const plain = claimPrd(cfg, root, id);
    expect(plain.ok).toBe(true);
    // Legacy-era second self lease carrying the only stamps.
    const made = createWorktree(cfg, root, { id, slug: 'legacy' });
    writeFileSync(
      join(root, '_state/locks', `${id.toLowerCase()}-legacy-old.json`),
      `${JSON.stringify({
        schemaVersion: 2,
        lockId: `${id.toLowerCase()}-legacy-old`,
        agent: 'owner',
        prd: id,
        phase: 'Phase 4',
        startedAt: new Date(Date.now() - 3_600_000).toISOString(),
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        touchedFiles: ['src/legacy/**'],
        ownedPaths: ['src/legacy/**'],
        worktree: made.relPath,
        branch: made.branch,
      })}\n`,
    );
    const refreshed = claimPrd(cfg, root, id);
    expect(refreshed.ok).toBe(true);
    const lease = JSON.parse(readFileSync(refreshed.leasePath!, 'utf8')) as Record<
      string,
      unknown
    >;
    expect(lease['worktree']).toBe(made.relPath);
    expect(lease['branch']).toBe(made.branch);
  });

  it('normalizedWorktreeDir is POSIX-separated and canonical (P2)', async () => {
    const { normalizedWorktreeDir } = await import('../src/core/config/index.js');
    expect(normalizedWorktreeDir({ ...cfg, worktree: { dir: './.worktrees/' } })).toBe(
      '.worktrees',
    );
    expect(normalizedWorktreeDir({ ...cfg, worktree: { dir: 'tools/worktrees' } })).toBe(
      'tools/worktrees',
    );
  });
});

describe('codex r11 regressions', () => {
  it('branch delete uses a base-pinned context when no checkout holds base (P1)', async () => {
    const root = await gitRoot();
    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'workspace']);
    const made = createWorktree(cfg, root, { id: 'PRD-001', slug: 'pinned' });
    await run('git', ['-C', root, 'worktree', 'remove', made.path]);
    // Primary parks elsewhere; NOTHING holds main. Branch is at the base tip.
    await run('git', ['-C', root, 'checkout', '-b', 'parked']);

    const removal = removeWorktree(cfg, root, { worktree: made.relPath, branch: made.branch });
    expect(removal.removed).toBe(true);
    expect(removal.branchDeleted).toBe(true);
    expect((await run('git', ['-C', root, 'branch'], {})).stdout).not.toContain(made.branch);
  });

  it('fallback provisioning after stamp-target removal recreates the STAMPED names (P2)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'origin-name', ['src/refab/**']);
    await commitArtifacts(root);
    const first = claimPrd(cfg, root, id, { worktree: true });
    expect(first.ok).toBe(true);
    // Checkout and branch vanish; PRD gets renamed.
    await run('git', ['-C', root, 'worktree', 'remove', first.worktree!.path]);
    await run('git', ['-C', root, 'branch', '-d', first.worktree!.branch]);
    const { renameSync } = await import('node:fs');
    renameSync(
      join(root, '_prds/wip', `prd-${id.slice(4).toLowerCase()}-origin-name.md`),
      join(root, '_prds/wip', `prd-${id.slice(4).toLowerCase()}-fresh-name.md`),
    );
    await commitArtifacts(root);

    const again = claimPrd(cfg, root, id, { worktree: true });
    expect(again.ok).toBe(true);
    // Recreated under the ORIGINAL stamped names — lease and checkout agree.
    expect(again.worktree?.relPath).toBe(first.worktree!.relPath);
    expect(existsSync(again.worktree!.path)).toBe(true);
    const lease = JSON.parse(readFileSync(again.leasePath!, 'utf8')) as Record<string, unknown>;
    expect(lease['worktree']).toBe(first.worktree!.relPath);
    expect(existsSync(join(root, `.worktrees/${id.toLowerCase()}-fresh-name`))).toBe(false);
  });

  it('windows-style config spelling canonicalizes on posix too (P2)', async () => {
    const { normalizedWorktreeDir } = await import('../src/core/config/index.js');
    expect(normalizedWorktreeDir({ ...cfg, worktree: { dir: '.\\.worktrees\\' } })).toBe(
      '.worktrees',
    );
  });
});

describe('codex r12 regressions', () => {
  it('reprovision REATTACHES the surviving stamped branch, tip preserved (P2)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'attach', ['src/attach/**']);
    await commitArtifacts(root);
    const first = claimPrd(cfg, root, id, { worktree: true });
    expect(first.ok).toBe(true);
    // Work committed on the branch, then the tree removed the NORMAL way —
    // git leaves the branch behind.
    writeFileSync(join(first.worktree!.path, 'progress.txt'), 'wip\n');
    await run('git', ['-C', first.worktree!.path, 'add', 'progress.txt']);
    await run('git', ['-C', first.worktree!.path, 'commit', '-m', 'wip']);
    const tip = (await run('git', ['-C', root, 'rev-parse', first.worktree!.branch], {})).stdout;
    await run('git', ['-C', root, 'worktree', 'remove', first.worktree!.path]);

    const again = claimPrd(cfg, root, id, { worktree: true });
    expect(again.ok).toBe(true);
    expect(again.worktree?.relPath).toBe(first.worktree!.relPath);
    // Same branch, same tip — the committed work is in the reattached tree.
    const tipAfter = (await run('git', ['-C', root, 'rev-parse', first.worktree!.branch], {}))
      .stdout;
    expect(tipAfter).toBe(tip);
    expect(existsSync(join(again.worktree!.path, 'progress.txt'))).toBe(true);
  });

  it('a repository-root worktree.dir refuses provisioning and cleanup (P2)', async () => {
    const root = await gitRoot();
    const rooted = { ...cfg, worktree: { dir: './' } };
    expect(() => createWorktree(rooted, root, { id: 'PRD-001', slug: 'rooty' })).toThrow(
      /repository root/,
    );
    const removal = removeWorktree(rooted, root, { worktree: 'prd-001-rooty', branch: 'feat/x' });
    expect(removal.removed).toBe(false);
    expect(removal.warnings.join(' ')).toContain('repository root');
  });
});

describe('codex r13 regressions', () => {
  it('a symlink alias resolving to the repository root refuses provisioning and cleanup (P2)', async () => {
    const root = await gitRoot();
    const { symlinkSync } = await import('node:fs');
    symlinkSync('.', join(root, 'alias'));
    const aliased = { ...cfg, worktree: { dir: 'alias' } };
    expect(() => createWorktree(aliased, root, { id: 'PRD-001', slug: 'sneaky' })).toThrow(
      /repository root/,
    );
    expect(existsSync(join(root, 'prd-001-sneaky'))).toBe(false);
    const removal = removeWorktree(aliased, root, {
      worktree: 'alias/prd-001-sneaky',
      branch: 'feat/prd-001-sneaky',
    });
    expect(removal.removed).toBe(false);
    expect(removal.warnings.join(' ')).toContain('repository root');
  });
});

describe('codex r14 regressions', () => {
  it('a hook that replaces the lease during a SUCCESSFUL add aborts and tears our checkout down (P1)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'hijacked', ['src/hijacked/**']);
    await commitArtifacts(root);
    const leaseFile = join(root, '_state/locks', `${id.toLowerCase()}-hijacked.json`);
    const { mkdirSync: mkdir, chmodSync } = await import('node:fs');
    mkdir(join(root, '.git/hooks'), { recursive: true });
    // Hook SUCCEEDS (exit 0) but swaps the lease out from under us.
    writeFileSync(
      join(root, '.git/hooks/post-checkout'),
      `#!/bin/sh\nprintf '{"rival":true}' > "${leaseFile}"\nexit 0\n`,
    );
    chmodSync(join(root, '.git/hooks/post-checkout'), 0o755);

    const result = claimPrd(cfg, root, id, { worktree: true });
    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain('replaced or removed while the checkout');
    // Our checkout is gone; the rival's lease bytes survive untouched.
    expect(existsSync(join(root, `.worktrees/${id.toLowerCase()}-hijacked`))).toBe(false);
    expect(readFileSync(leaseFile, 'utf8')).toContain('rival');
  });

  it('a stale claim mutex throws — the close path must catch it, not crash (P1)', async () => {
    // Codex's scenario: a killed process left the mutex behind. Acquisition
    // fails CLOSED (by design), which is exactly why post-merge teardown
    // wraps it — the landed merge must still produce a handoff card.
    const root = await gitRoot();
    const { claimMutexPath, withWorkspaceMutex } = await import('../src/core/run/index.js');
    const { mkdirSync: mkdir, utimesSync } = await import('node:fs');
    mkdir(join(root, '_state/locks'), { recursive: true });
    const mutex = claimMutexPath(cfg, root);
    writeFileSync(mutex, '999999999:1:2020-01-01T00:00:00Z\n');
    const old = new Date(Date.now() - 120_000);
    utimesSync(mutex, old, old);

    let warning = '';
    try {
      withWorkspaceMutex(mutex, () => undefined);
    } catch (error) {
      warning = error instanceof Error ? error.message : String(error);
    }
    expect(warning).toContain('stale workspace mutex');
  });
});

describe('codex r15 regressions', () => {
  it('refuses --worktree while the claimed PRD is uncommitted, then succeeds once committed (P1)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'uncommitted', ['src/uncommitted/**']);
    // Quickstart order: init → new → open --worktree, nothing committed yet.
    const refused = claimPrd(cfg, root, id, { worktree: true });
    expect(refused.ok).toBe(false);
    expect(refused.issues.join(' ')).toContain('missing or uncommitted');
    expect(refused.issues.join(' ')).toContain('_prds/wip');
    expect(existsSync(join(root, '_state/locks', `${id.toLowerCase()}-uncommitted.json`))).toBe(
      false,
    );

    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'artifacts']);
    const claimed = claimPrd(cfg, root, id, { worktree: true });
    expect(claimed.ok, claimed.issues.join(' ')).toBe(true);
    // The provisioned checkout CONTAINS the PRD it claims.
    expect(
      existsSync(
        join(claimed.worktree!.path, '_prds/wip', `prd-${id.slice(4).toLowerCase()}-uncommitted.md`),
      ),
    ).toBe(true);
  });

  it('refuses when a committed artifact has UNCOMMITTED edits (r16 P1)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'edited', ['src/edited/**']);
    await commitArtifacts(root);
    // Surface edited after the commit: the lease would protect the new globs
    // while the checkout received the old blob.
    const prdPath = join(root, '_prds/wip', `prd-${id.slice(4).toLowerCase()}-edited.md`);
    writeFileSync(prdPath, `${readFileSync(prdPath, 'utf8')}\n<!-- later edit -->\n`);

    const refused = claimPrd(cfg, root, id, { worktree: true });
    expect(refused.ok).toBe(false);
    expect(refused.issues.join(' ')).toContain('missing or uncommitted');
  });

  it('refuses when gates.manifest.json is present but uncommitted (r16 P1)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'manifested', ['src/manifested/**']);
    await commitArtifacts(root);
    writeFileSync(
      join(root, 'gates.manifest.json'),
      `${JSON.stringify({ phases: {}, postMerge: [] }, null, 2)}\n`,
    );

    const refused = claimPrd(cfg, root, id, { worktree: true });
    expect(refused.ok).toBe(false);
    expect(refused.issues.join(' ')).toContain('gates.manifest.json');
  });

  it('reuse refuses when the stamped checkout carries stale artifacts (r17 P1)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'drifted', ['src/drifted/**']);
    await commitArtifacts(root);
    const first = claimPrd(cfg, root, id, { worktree: true });
    expect(first.ok).toBe(true);
    // Base advances: the PRD's surface changes, the checkout keeps the old one.
    const prdPath = join(root, '_prds/wip', `prd-${id.slice(4).toLowerCase()}-drifted.md`);
    writeFileSync(prdPath, readFileSync(prdPath, 'utf8').replace('src/drifted/**', 'src/moved/**'));
    await commitArtifacts(root);

    const again = claimPrd(cfg, root, id, { worktree: true });
    expect(again.ok).toBe(false);
    expect(again.issues.join(' ')).toContain('differing from');
    expect(again.issues.join(' ')).toContain('merge or rebase');
    // The checkout survives untouched — this is a refusal, not a teardown.
    expect(existsSync(first.worktree!.path)).toBe(true);
  });

  it('a deleted-but-committed control file is treated as a mismatch (r17 P1)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'dropped-config', ['src/dropped/**']);
    writeFileSync(
      join(root, 'workflow.config.json'),
      `${JSON.stringify({ branches: { base: 'main' } }, null, 2)}\n`,
    );
    await commitArtifacts(root);
    rmSync(join(root, 'workflow.config.json'));

    const refused = claimPrd(cfg, root, id, { worktree: true });
    expect(refused.ok).toBe(false);
    expect(refused.issues.join(' ')).toContain('workflow.config.json');
  });

  it('a checkout hook editing the PRD in the FRESH tree aborts the claim (r18 P1)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'hooked-edit', ['src/hooked-edit/**']);
    await commitArtifacts(root);
    const prdRel = `_prds/wip/prd-${id.slice(4).toLowerCase()}-hooked-edit.md`;
    const { mkdirSync: mkdir, chmodSync } = await import('node:fs');
    mkdir(join(root, '.git/hooks'), { recursive: true });
    // Hook succeeds but rewrites the PRD inside the new worktree.
    writeFileSync(
      join(root, '.git/hooks/post-checkout'),
      `#!/bin/sh\nprintf '# tampered\\n' >> "${prdRel}"\nexit 0\n`,
    );
    chmodSync(join(root, '.git/hooks/post-checkout'), 0o755);

    const result = claimPrd(cfg, root, id, { worktree: true });
    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain('modified during setup');
    expect(existsSync(join(root, '_state/locks', `${id.toLowerCase()}-hooked-edit.json`))).toBe(
      false,
    );
  });

  it('reattachment validates caller artifacts too (r19 P1)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'reattach-caller', ['src/rc/**']);
    await commitArtifacts(root);
    const first = claimPrd(cfg, root, id, { worktree: true });
    expect(first.ok).toBe(true);
    // Tree removed the normal way (branch survives) → next claim reattaches.
    await run('git', ['-C', root, 'worktree', 'remove', first.worktree!.path]);
    // Caller now has an uncommitted control-file edit.
    writeFileSync(
      join(root, 'workflow.config.json'),
      `${JSON.stringify({ branches: { base: 'main' } }, null, 2)}\n`,
    );

    const again = claimPrd(cfg, root, id, { worktree: true });
    expect(again.ok).toBe(false);
    expect(again.issues.join(' ')).toContain('workflow.config.json');
  });

  it('provisioning pins ONE base revision for every comparison (r19 P1)', async () => {
    const root = await gitRoot();
    const { resolveRef } = await import('../src/core/run/index.js');
    const pinned = resolveRef(root, 'refs/heads/main');
    expect(pinned).toMatch(/^[0-9a-f]{40}$/);
    // A moved base does not retroactively change the pinned revision.
    writeFileSync(join(root, 'later.txt'), 'later\n');
    await run('git', ['-C', root, 'add', 'later.txt']);
    await run('git', ['-C', root, 'commit', '-m', 'base moves']);
    expect(resolveRef(root, 'refs/heads/main')).not.toBe(pinned);
    expect(resolveRef(root, pinned!)).toBe(pinned);
  });

  it('a PRD restored to HEAD after parse cannot slip a lease owning other bytes (r20 P1)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'snapshotted', ['src/committed/**']);
    await commitArtifacts(root);
    const prdPath = join(root, '_prds/wip', `prd-${id.slice(4).toLowerCase()}-snapshotted.md`);
    const committed = readFileSync(prdPath, 'utf8');
    // Parse-time bytes declare surface A (uncommitted); the race window then
    // restores the committed bytes, so a working-tree re-read would match base
    // while the lease was built from A.
    writeFileSync(prdPath, committed.replace('src/committed/**', 'src/parsed-only/**'));

    const result = claimPrd(cfg, root, id, {
      worktree: true,
      raceWindow: () => writeFileSync(prdPath, committed),
    });
    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain('missing or uncommitted');
  });

  it('a base that moves mid-delete blocks the branch deletion (r20 P1)', async () => {
    const root = await gitRoot();
    await commitArtifacts(root);
    const made = createWorktree(cfg, root, { id: 'PRD-001', slug: 'moving-base' });
    await run('git', ['-C', root, 'worktree', 'remove', made.path]);
    // Base rewinds to a commit that does NOT contain the feature branch tip.
    const seed = (await run('git', ['-C', root, 'rev-parse', 'HEAD~1'], {})).stdout.trim();
    await run('git', ['-C', root, 'reset', '--hard', seed]);

    const removal = removeWorktree(cfg, root, { worktree: made.relPath, branch: made.branch });
    expect(removal.branchDeleted).toBe(false);
    expect(removal.warnings.join(' ')).toContain('not merged into main');
    expect((await run('git', ['-C', root, 'branch'], {})).stdout).toContain(made.branch);
  });

  it('a hook that COMMITS on the fresh branch is caught even with clean artifacts (r21 P2)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'hook-commits', ['src/hc/**']);
    await commitArtifacts(root);
    const { mkdirSync: mkdir, chmodSync } = await import('node:fs');
    mkdir(join(root, '.git/hooks'), { recursive: true });
    // Succeeds, leaves every required artifact byte-identical, but moves the
    // branch off the pinned base.
    writeFileSync(
      join(root, '.git/hooks/post-checkout'),
      '#!/bin/sh\nprintf "x\\n" > unrelated.txt\ngit add unrelated.txt\ngit -c user.email=h@x -c user.name=h commit -q -m "hook commit"\nexit 0\n',
    );
    chmodSync(join(root, '.git/hooks/post-checkout'), 0o755);

    const result = claimPrd(cfg, root, id, { worktree: true });
    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain('no longer points at the pinned base');
  });

  it('a hook that DETACHES the fresh checkout is caught (r22 P1)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'detached-head', ['src/dh/**']);
    await commitArtifacts(root);
    const { mkdirSync: mkdir, chmodSync } = await import('node:fs');
    mkdir(join(root, '.git/hooks'), { recursive: true });
    // Same commit, same blobs — only HEAD's attachment changes. The sentinel
    // keeps the nested checkout from re-entering this hook forever.
    writeFileSync(
      join(root, '.git/hooks/post-checkout'),
      `#!/bin/sh\n[ -f "${join(root, '.git/detach-done')}" ] && exit 0\ntouch "${join(root, '.git/detach-done')}"\ngit checkout -q --detach HEAD\nexit 0\n`,
    );
    chmodSync(join(root, '.git/hooks/post-checkout'), 0o755);

    const result = claimPrd(cfg, root, id, { worktree: true });
    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain('detached HEAD');
  });

  it('CRLF-filtered artifacts still claim cleanly (r22 P1)', async () => {
    const root = await gitRoot();
    writeFileSync(join(root, '.gitattributes'), '*.md text eol=crlf\n');
    const id = prdWithSurface(root, 'crlf', ['src/crlf/**']);
    await commitArtifacts(root);
    // Re-normalize so the working tree carries the filtered (CRLF) bytes
    // while the index keeps LF — the split the hash must reconcile.
    await run('git', ['-C', root, 'rm', '--cached', '-r', '-q', '--', '.']);
    await run('git', ['-C', root, 'reset', '-q', '--hard', 'HEAD']);

    const result = claimPrd(cfg, root, id, { worktree: true });
    expect(result.ok, result.issues.join(' ')).toBe(true);
  });

  it('cleanup identity tracks the NEWEST lease, not the first filename (r22 P1)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'newest', ['src/newest/**']);
    await commitArtifacts(root);
    const live = claimPrd(cfg, root, id, { worktree: true });
    expect(live.ok).toBe(true);
    // A superseded self lease that an earlier cleanup could not delete, whose
    // filename sorts BEFORE the canonical one.
    writeFileSync(
      join(root, '_state/locks', `aaa-${id.toLowerCase()}-old.json`),
      `${JSON.stringify({
        schemaVersion: 2,
        lockId: `${id.toLowerCase()}-old`,
        agent: 'owner',
        prd: id,
        phase: 'Phase 4',
        startedAt: new Date(Date.now() - 7_200_000).toISOString(),
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        touchedFiles: ['src/newest/**'],
        ownedPaths: ['src/newest/**'],
        worktree: '.worktrees/stale-path',
        branch: 'feat/stale-branch',
      })}\n`,
    );

    const { listLockFiles } = await import('../src/core/locks/index.js');
    const forPrd = listLockFiles(cfg, root).filter((l) => l.data && l.data['prd'] === id);
    expect(forPrd.length).toBeGreaterThan(1);
    // The live claim's stamps must win over the older, first-sorting file.
    const newest = forPrd
      .map((l) => l.data!)
      .sort((a, b) => Date.parse(String(b['startedAt'])) - Date.parse(String(a['startedAt'])))[0]!;
    expect(newest['branch']).toBe(live.worktree!.branch);
  });

  it('createWorktree refuses a detached HEAD even with no artifact snapshots (r23 P2)', async () => {
    const root = await gitRoot();
    const { mkdirSync: mkdir, chmodSync } = await import('node:fs');
    mkdir(join(root, '.git/hooks'), { recursive: true });
    writeFileSync(
      join(root, '.git/hooks/post-checkout'),
      `#!/bin/sh\n[ -f "${join(root, '.git/detached-once')}" ] && exit 0\ntouch "${join(root, '.git/detached-once')}"\ngit checkout -q --detach HEAD\nexit 0\n`,
    );
    chmodSync(join(root, '.git/hooks/post-checkout'), 0o755);

    // Default requireOnBase = [] — attachment must still be proven.
    expect(() => createWorktree(cfg, root, { id: 'PRD-001', slug: 'bare-detach' })).toThrow(
      /detached HEAD/,
    );
  });

  it('stamp carry prefers the NEWEST self lease, not the first file (r23 P1)', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'freshest', ['src/freshest/**']);
    await commitArtifacts(root);
    const live = claimPrd(cfg, root, id, { worktree: true });
    expect(live.ok).toBe(true);
    // Superseded self lease naming a stale checkout, sorting first by name.
    writeFileSync(
      join(root, '_state/locks', `aaa-${id.toLowerCase()}-stale.json`),
      `${JSON.stringify({
        schemaVersion: 2,
        lockId: `${id.toLowerCase()}-stale`,
        agent: 'owner',
        prd: id,
        phase: 'Phase 4',
        startedAt: new Date(Date.now() - 7_200_000).toISOString(),
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        touchedFiles: ['src/freshest/**'],
        ownedPaths: ['src/freshest/**'],
        worktree: '.worktrees/ghost-path',
        branch: 'feat/ghost-branch',
      })}\n`,
    );

    const again = claimPrd(cfg, root, id, { worktree: true });
    expect(again.ok, again.issues.join(' ')).toBe(true);
    // The live checkout is kept; the ghost stamps never resurrect.
    expect(again.worktree?.relPath).toBe(live.worktree!.relPath);
    expect(existsSync(join(root, '.worktrees/ghost-path'))).toBe(false);
  });

  it('a plain claim (no --worktree) is unaffected by uncommitted artifacts', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'plain-uncommitted', ['src/plain-unc/**']);
    expect(claimPrd(cfg, root, id).ok).toBe(true);
  });
});

describe('claimPrd --worktree (FR-2, W2)', () => {
  it('claim + provision: lease carries schema-valid worktree/branch stamps', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'stamped', ['src/stamped/**']);
    await commitArtifacts(root);
    const result = claimPrd(cfg, root, id, { worktree: true });
    expect(result.ok).toBe(true);
    expect(result.worktree?.relPath).toBe(`.worktrees/${id.toLowerCase()}-stamped`);
    expect(existsSync(result.worktree!.path)).toBe(true);
    const lease = JSON.parse(readFileSync(result.leasePath!, 'utf8')) as Record<string, unknown>;
    expect(validateLock(cfg, lease)).toEqual([]);
    expect(lease['worktree']).toBe(result.worktree!.relPath);
    expect(lease['branch']).toBe(result.worktree!.branch);
  });

  it('W2 rollback: colliding branch → no lease, no worktree, rival branch intact', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'rolled', ['src/rolled/**']);
    await commitArtifacts(root);
    await run('git', ['-C', root, 'branch', `feat/${id.toLowerCase()}-rolled`]);
    const result = claimPrd(cfg, root, id, { worktree: true });
    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain('claim rolled back');
    expect(existsSync(join(root, '_state/locks', `${id.toLowerCase()}-rolled.json`))).toBe(false);
    expect(existsSync(join(root, `.worktrees/${id.toLowerCase()}-rolled`))).toBe(false);
    expect((await run('git', ['-C', root, 'branch'], {})).stdout).toContain(
      `feat/${id.toLowerCase()}-rolled`,
    );
  });

  it('refresh with --worktree is idempotent; refresh WITHOUT it keeps the stamps', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'again', ['src/again/**']);
    await commitArtifacts(root);
    const first = claimPrd(cfg, root, id, { worktree: true });
    expect(first.ok).toBe(true);
    const second = claimPrd(cfg, root, id, { worktree: true });
    expect(second.ok).toBe(true);
    expect(second.refreshed).toBe(true);
    expect(second.worktree?.path).toBe(first.worktree?.path);

    const plain = claimPrd(cfg, root, id);
    expect(plain.ok).toBe(true);
    const lease = JSON.parse(readFileSync(plain.leasePath!, 'utf8')) as Record<string, unknown>;
    expect(lease['worktree']).toBe(first.worktree!.relPath);
    expect(lease['branch']).toBe(first.worktree!.branch);
  });

  it('without --worktree behavior is unchanged: no stamps, no worktree', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'plain', ['src/plain/**']);
    await commitArtifacts(root);
    const result = claimPrd(cfg, root, id);
    expect(result.ok).toBe(true);
    expect(result.worktree).toBeUndefined();
    const lease = JSON.parse(readFileSync(result.leasePath!, 'utf8')) as Record<string, unknown>;
    expect(lease['worktree']).toBeUndefined();
    expect(lease['branch']).toBeUndefined();
    expect(existsSync(join(root, '.worktrees'))).toBe(false);
  });
});

describe('merge from a claimed worktree + cleanup (FR-3, W1, W3)', () => {
  it('mergeToLocalBase relocates to the main checkout; cleanup removes tree + branch', async () => {
    const root = await gitRoot();
    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'workspace']);
    const id = prdWithSurface(root, 'landing', ['src/landing/**']);
    await commitArtifacts(root);

    const claim = claimPrd(cfg, root, id, { worktree: true });
    expect(claim.ok).toBe(true);
    const wt = claim.worktree!;

    writeFileSync(join(wt.path, 'feature.txt'), 'the work\n');
    await run('git', ['-C', wt.path, 'add', 'feature.txt']);
    await run('git', ['-C', wt.path, 'commit', '-m', 'feat: the work']);

    // Runner perspective: cwd is the WORKTREE; base lives in the main checkout.
    const merge = mergeToLocalBase({ config: cfg, manifest: EMPTY_MANIFEST, root: wt.path, id });
    expect(merge.ok, merge.why).toBe(true);
    expect(realpathSync(merge.baseDir!)).toBe(realpathSync(root));
    const log = (await run('git', ['-C', root, 'log', '--oneline', '-2'], {})).stdout;
    expect(log).toContain(`land ${id} via gate run`);
    expect(existsSync(join(root, 'feature.txt'))).toBe(true);

    const removal = removeWorktree(cfg, root, { worktree: wt.relPath, branch: wt.branch });
    expect(removal.removed).toBe(true);
    expect(removal.branchDeleted).toBe(true);
    expect(existsSync(wt.path)).toBe(false);
  });
});
