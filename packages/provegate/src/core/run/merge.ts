import { execFileSync, execSync } from 'node:child_process';
import type { WorkflowConfig } from '../config/index.js';
import type { GatesManifest } from '../gates/manifest.js';
import { isSafeCommand } from '../gates/safety.js';
import { normalizedWorktreeDir } from '../config/index.js';
import { listLockFiles } from '../locks/index.js';
import { RUN_ACTIVE_ENV } from './chain.js';
import { withWorkspaceMutex } from './mutex.js';
import { claimMutexPath } from './open.js';

/**
 * Local no-ff merge with post-merge verification and auto-revert. Two
 * substrates: a worktree with the base checked out (source parity), or the
 * single-checkout fallback (base is a local branch here) — single-checkout
 * repos are first-class. NO code path here or anywhere pushes to a remote.
 */

export interface MergeOutcome {
  ok: boolean;
  why?: string;
  baseDir?: string;
  branch?: string;
  diffstat?: string;
  postMergeResults?: [string, 'passed' | 'FAILED'][];
}

function git(dir: string, args: string[]): string {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
}

function isCoordinationPath(config: WorkflowConfig, p: string): boolean {
  if (config.branches.allowedDirectFiles.includes(p)) return true;
  return config.branches.allowedDirectPrefixes.some((prefix) => p.startsWith(prefix));
}

/** The linked-worktree dir living inside the main checkout is coordination
 * machinery — but ONLY as an untracked entry. A tracked file under a
 * (mis)configured worktree.dir is source, and its modifications must refuse
 * the merge, never be silently reset (codex r1 P1). */
function isUntrackedWorktreeEntry(config: WorkflowConfig, p: string, untracked: boolean): boolean {
  if (!untracked) return false;
  // Compare in the canonical spelling: `./.worktrees` in config vs
  // `.worktrees/` from `git status` must still match (codex r8 P2).
  const dir = normalizedWorktreeDir(config);
  return p === `${dir}/` || p.startsWith(`${dir}/`);
}

interface DirtyEntry {
  path: string;
  untracked: boolean;
}

function dirtyPaths(dir: string): DirtyEntry[] {
  return git(dir, ['status', '--porcelain'])
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const untracked = line.startsWith('??') || line.startsWith('!!');
      const rest = line.replace(/^(?:[ MADRCU?!]{1,2})\s+/, '');
      return { path: rest.split(' -> ')[0]!.trim(), untracked };
    });
}

/** Reset coordination-only dirt so the merge can proceed; refuse on source dirt. */
export function ensureCheckoutClean(
  config: WorkflowConfig,
  dir: string,
): { ok: boolean; why?: string } {
  const entries = dirtyPaths(dir);
  if (entries.length === 0) return { ok: true };
  const tolerated = (e: DirtyEntry): boolean =>
    isCoordinationPath(config, e.path) || isUntrackedWorktreeEntry(config, e.path, e.untracked);
  if (!entries.every(tolerated)) {
    const offenders = entries.filter((e) => !tolerated(e)).map((e) => e.path);
    return {
      ok: false,
      why: `checkout is dirty with non-coordination files (${offenders.slice(0, 5).join(', ')}) — commit or stash before merge`,
    };
  }
  for (const e of entries) {
    if (!isCoordinationPath(config, e.path)) continue; // untracked worktree entries stay put
    try {
      execFileSync('git', ['checkout', 'HEAD', '--', e.path], { cwd: dir, stdio: 'ignore' });
    } catch {
      // untracked coordination file — leave it, merge tolerates it
    }
  }
  return { ok: true };
}

/**
 * Invariants a worktree-stamped close needs from the BASE checkout, checked
 * BEFORE any artifact mutation: some other checkout must hold the base branch
 * (otherwise the single-checkout fallback would merge inside the feature
 * worktree), and that checkout must be clean of source dirt (codex r1 P1 —
 * archive commits must not land before an inevitable merge refusal).
 */
export function baseWorktreeReady(
  config: WorkflowConfig,
  root: string,
): { ok: boolean; why?: string; baseDir?: string } {
  const base = config.branches.base;
  const dir = findBaseWorktree(root, base);
  if (dir === null) {
    return {
      ok: false,
      why: `no checkout holds '${base}' — check the main checkout out on ${base} before closing a worktree claim`,
    };
  }
  // A registration whose directory was deleted still lists — probing it would
  // throw ENOENT out of this promised-refusal path (codex r26 P2).
  let clean: { ok: boolean; why?: string };
  try {
    clean = ensureCheckoutClean(config, dir);
  } catch (error) {
    return {
      ok: false,
      why: `the checkout registered for '${base}' at ${dir} is unusable (${error instanceof Error ? error.message.split('\n')[0] : String(error)}) — run \`git worktree prune\` and re-run`,
    };
  }
  if (!clean.ok) return { ok: false, why: `base checkout: ${clean.why}` };
  return { ok: true, baseDir: dir };
}

/** Directory of a linked worktree with `base` checked out, or null. */
export function findBaseWorktree(root: string, base: string): string | null {
  const worktrees = git(root, ['worktree', 'list', '--porcelain']);
  for (const block of worktrees.split('\n\n')) {
    const dir = block.match(/^worktree (.+)$/m)?.[1];
    const br = block.match(/^branch refs\/heads\/(.+)$/m)?.[1];
    if (br === base && dir) return dir;
  }
  return null;
}

export function mergeMessage(id: string): string {
  return `chore(workflow): land ${id} via gate run`;
}

function runPostMerge(
  config: WorkflowConfig,
  manifest: GatesManifest,
  dir: string,
): { results: [string, 'passed' | 'FAILED'][]; failed: string | null } {
  const results: [string, 'passed' | 'FAILED'][] = [];
  for (const cmd of manifest.postMerge) {
    if (!isSafeCommand(config, cmd)) {
      results.push([`post-merge: ${cmd}`, 'FAILED']);
      return { results, failed: cmd };
    }
    try {
      execSync(cmd, { cwd: dir, stdio: 'inherit', env: { ...process.env, [RUN_ACTIVE_ENV]: '1' } });
      results.push([`post-merge: ${cmd}`, 'passed']);
    } catch {
      results.push([`post-merge: ${cmd}`, 'FAILED']);
      return { results, failed: cmd };
    }
  }
  return { results, failed: null };
}

/** Preconditions shared by the CLI (checked BEFORE any archive mutation) and
 * the merge itself: on a real feature branch, checkout clean. */
export function mergePreconditions(
  config: WorkflowConfig,
  root: string,
): { ok: boolean; why?: string; branch?: string } {
  const base = config.branches.base;
  const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch === 'HEAD') {
    return { ok: false, why: 'detached HEAD — check out the feature branch first' };
  }
  if (branch === base) {
    return {
      ok: false,
      why: `current branch is '${base}' — run from the feature branch, not the base checkout`,
    };
  }
  const clean = ensureCheckoutClean(config, root);
  if (!clean.ok) return { ok: false, why: clean.why };
  return { ok: true, branch };
}

/**
 * Unexpired leases belonging to some OTHER work item, by lock filename.
 *
 * A lock that will not parse counts as a blocker. It cannot be shown to be
 * expired or to belong to this item, and "unreadable" is not "absent" — the one
 * direction a barrier may never guess in is the permissive one.
 */
export function foreignActiveLeases(
  config: WorkflowConfig,
  root: string,
  id: string,
  { now = Date.now() }: { now?: number } = {},
): string[] {
  const mine = `${id.toLowerCase()}-`;
  const blockers: string[] = [];
  for (const entry of listLockFiles(config, root)) {
    if (entry.name.startsWith(mine)) continue;
    if (entry.error !== undefined || entry.data === undefined) {
      blockers.push(`${entry.name} (unreadable: ${entry.error ?? 'no data'})`);
      continue;
    }
    const expiresAt = Date.parse(String(entry.data['expiresAt']));
    // An unparseable expiry is not an expired one.
    if (Number.isFinite(expiresAt) && expiresAt < now) continue;
    const holder = typeof entry.data['agent'] === 'string' ? entry.data['agent'] : 'unknown agent';
    blockers.push(`${entry.name} (${holder})`);
  }
  return blockers;
}

/**
 * Merge the current feature branch into the local base branch, verify, and
 * auto-revert on failure. Preconditions: not on base, not detached; feature
 * checkout clean of non-coordination dirt.
 *
 * In a memory-enabled repository the merge additionally runs inside the claim
 * mutex and refuses while a foreign lease is active (FR-6). Reading the lock
 * table outside that mutex would be a check-then-merge race, not a barrier: a
 * claim could install itself in the window. The scope is honest and narrow —
 * this is a `gate land` precondition, NOT a git-level invariant. A direct
 * `git merge` bypasses it exactly as it bypasses every other gate here, and a
 * worktree that survives the merge does not re-check control artifacts, because
 * only a new claim revalidates them (PRD-022's scope, stated rather than
 * claimed away).
 */
export function mergeToLocalBase(options: {
  config: WorkflowConfig;
  manifest: GatesManifest;
  root: string;
  id: string;
  /** The exact commit the caller verified (archive tip). Merging THIS rather
   * than re-resolving the branch name closes the check-to-use window in which
   * a rival could commit or reset the branch (codex r25 P1). */
  sourceSha?: string;
}): MergeOutcome {
  const { config, manifest, root, id, sourceSha } = options;
  const base = config.branches.base;
  const pre = mergePreconditions(config, root);
  if (!pre.ok) return { ok: false, why: pre.why };
  const branch = pre.branch!;
  const source = sourceSha ?? branch;

  const merge = (): MergeOutcome => {
    const worktreeDir = findBaseWorktree(root, base);
    if (worktreeDir !== null && worktreeDir !== root) {
      return mergeInWorktree({ config, manifest, baseDir: worktreeDir, base, branch, source, id });
    }
    try {
      git(root, ['rev-parse', '--verify', base]);
    } catch {
      return { ok: false, why: `no local branch '${base}' to merge into` };
    }
    return mergeSingleCheckout({ config, manifest, root, base, branch, source, id });
  };

  // The barrier belongs to the ACTIVATION transition, not to every merge that
  // happens after it. It refused any memory-enabled PRD while any unrelated
  // lease was active, and told each one "this merge changes gate policy" — false
  // for an ordinary PRD, and a refusal that names something that is not
  // happening. Activation is the merge that turns memory ON: enabled here and
  // not yet enabled on the base.
  if (!config.memory.enabled || !activatesMemory(root, base)) return merge();

  return withWorkspaceMutex(claimMutexPath(config, root), (): MergeOutcome => {
    const blockers = foreignActiveLeases(config, root, id);
    if (blockers.length > 0) {
      return {
        ok: false,
        why:
          `a foreign lease is active — ${blockers.join(', ')}; this merge ACTIVATES the memory ` +
          `contract and so changes gate policy, so it refuses rather than land under another ` +
          `agent's feet. Wait for the lease to expire or have its holder release it, then re-run`,
      };
    }
    return merge();
  });
}

/**
 * Does this merge turn the memory contract ON?
 *
 * True when the working configuration enables it and the base's committed
 * configuration does not — including the case where the base has no
 * configuration file at all, which is the first-adoption shape. Unreadable base
 * config counts as activation: the barrier is cheap and guessing "already on"
 * would skip it exactly when the state is unclear.
 */
function activatesMemory(root: string, base: string): boolean {
  let committed: string;
  try {
    committed = execFileSync('git', ['show', `${base}:workflow.config.json`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return true;
  }
  try {
    const parsed = JSON.parse(committed) as { memory?: { enabled?: unknown } };
    return parsed.memory?.enabled !== true;
  } catch {
    return true;
  }
}

function mergeInWorktree(options: {
  config: WorkflowConfig;
  manifest: GatesManifest;
  baseDir: string;
  base: string;
  branch: string;
  source: string;
  id: string;
}): MergeOutcome {
  const { config, manifest, baseDir, base, branch, source, id } = options;
  const clean = ensureCheckoutClean(config, baseDir);
  if (!clean.ok) return { ok: false, why: `base checkout: ${clean.why}` };

  // Captured BEFORE the merge: the revert target. `HEAD~1` after post-merge
  // commands is not guaranteed to be the pre-merge tip (codex P1 finding).
  const preMergeSha = git(baseDir, ['rev-parse', 'HEAD']);
  try {
    git(baseDir, ['merge', '--no-ff', source, '-m', mergeMessage(id)]);
  } catch (error) {
    try {
      execFileSync('git', ['merge', '--abort'], { cwd: baseDir, stdio: 'ignore' });
    } catch {
      /* no merge in progress */
    }
    return {
      ok: false,
      why: `merge failed in base worktree (${error instanceof Error ? error.message.split('\n')[0] : 'conflict'}) — aborted, base intact`,
    };
  }
  const { results, failed } = runPostMerge(config, manifest, baseDir);
  if (failed) {
    git(baseDir, ['reset', '--hard', preMergeSha]);
    return {
      ok: false,
      postMergeResults: results,
      why: `post-merge ${failed} failed — merge reverted to ${preMergeSha.slice(0, 7)}; feature branch intact`,
    };
  }
  return {
    ok: true,
    baseDir,
    branch,
    postMergeResults: results,
    diffstat: git(baseDir, ['diff', '--shortstat', preMergeSha, base]),
  };
}

function mergeSingleCheckout(options: {
  config: WorkflowConfig;
  manifest: GatesManifest;
  root: string;
  base: string;
  branch: string;
  source: string;
  id: string;
}): MergeOutcome {
  const { config, manifest, root, base, branch, source, id } = options;
  git(root, ['checkout', base]);
  const preMergeSha = git(root, ['rev-parse', 'HEAD']);
  try {
    git(root, ['merge', '--no-ff', source, '-m', mergeMessage(id)]);
  } catch (error) {
    try {
      execFileSync('git', ['merge', '--abort'], { cwd: root, stdio: 'ignore' });
    } catch {
      /* no merge in progress */
    }
    git(root, ['checkout', branch]);
    return {
      ok: false,
      why: `merge failed (${error instanceof Error ? error.message.split('\n')[0] : 'conflict'}) — aborted, back on ${branch}`,
    };
  }
  const { results, failed } = runPostMerge(config, manifest, root);
  if (failed) {
    git(root, ['reset', '--hard', preMergeSha]);
    git(root, ['checkout', branch]);
    return {
      ok: false,
      postMergeResults: results,
      why: `post-merge ${failed} failed — merge reverted to ${preMergeSha.slice(0, 7)}; back on ${branch}, feature branch intact`,
    };
  }
  return {
    ok: true,
    baseDir: root,
    branch,
    postMergeResults: results,
    diffstat: git(root, ['diff', '--shortstat', preMergeSha, base]),
  };
}
