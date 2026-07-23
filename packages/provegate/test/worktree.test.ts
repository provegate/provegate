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

describe('claimPrd --worktree (FR-2, W2)', () => {
  it('claim + provision: lease carries schema-valid worktree/branch stamps', async () => {
    const root = await gitRoot();
    const id = prdWithSurface(root, 'stamped', ['src/stamped/**']);
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
    await run('git', ['-C', root, 'add', '-A']);
    await run('git', ['-C', root, 'commit', '-m', 'prd']);

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
