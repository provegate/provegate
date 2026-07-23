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
  claimPrd,
  createPrd,
  createWorktree,
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
