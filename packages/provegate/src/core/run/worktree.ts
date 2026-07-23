import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkflowConfig } from '../config/index.js';
import { mainRepoRoot } from '../state/io.js';
import { containedPath } from './init.js';

/**
 * Worktree provisioning and teardown for `gate open --worktree` and the
 * runner's post-merge cleanup. All git runs against the MAIN checkout — a
 * linked worktree can never check out the base branch the main checkout
 * holds, so base-side operations must not assume an in-place cwd.
 *
 * Teardown is deliberately weaker than provisioning: `removeWorktree` never
 * throws and never forces. A dirty tree or an unmerged branch refuses inside
 * git, and that refusal is the safety mechanism — it degrades to a warning on
 * the caller's card, it does not roll anything back (W3).
 */

export interface WorktreeProvision {
  /** Absolute worktree path. */
  path: string;
  /** Path relative to the main checkout — what the lease stores (schema rule:
   * must start with `worktree.dir + '/'`). */
  relPath: string;
  branch: string;
}

export interface WorktreeRemoval {
  removed: boolean;
  branchDeleted: boolean;
  warnings: string[];
}

function git(dir: string, args: string[]): string {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
}

function branchExists(mainRoot: string, branch: string): boolean {
  try {
    git(mainRoot, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]);
    return true;
  } catch {
    return false;
  }
}

/** The registered worktree directory holding `branch`, or null. */
export function worktreeForBranch(mainRoot: string, branch: string): string | null {
  let listing: string;
  try {
    listing = git(mainRoot, ['worktree', 'list', '--porcelain']);
  } catch {
    return null;
  }
  for (const block of listing.split('\n\n')) {
    const dir = block.match(/^worktree (.+)$/m)?.[1];
    const br = block.match(/^branch refs\/heads\/(.+)$/m)?.[1];
    if (br === branch && dir) return dir;
  }
  return null;
}

export function worktreeNamesFor(
  config: WorkflowConfig,
  id: string,
  slug: string,
): { relPath: string; branch: string } {
  const stem = `${id.toLowerCase()}-${slug}`;
  return { relPath: `${config.worktree.dir}/${stem}`, branch: `feat/${stem}` };
}

/**
 * Create the feature branch (from the main checkout's current HEAD) and a
 * linked worktree for it. Containment is checked BEFORE the first git call
 * (W4). Collisions (existing branch or existing path) throw — there is no
 * force variant. A worktree-add failure deletes the branch this call just
 * created, so a failed provision leaves no half-state of its own; the CALLER
 * owns rolling back the lease (W2).
 */
export function createWorktree(
  config: WorkflowConfig,
  root: string,
  { id, slug }: { id: string; slug: string },
): WorktreeProvision {
  const mainRoot = mainRepoRoot(root);
  const { relPath, branch } = worktreeNamesFor(config, id, slug);
  const path = containedPath(mainRoot, relPath);

  if (branchExists(mainRoot, branch)) {
    throw new Error(`branch ${branch} already exists — remove it or claim without --worktree`);
  }
  if (existsSync(path)) {
    throw new Error(`worktree path ${relPath} already exists — remove it or claim without --worktree`);
  }

  // Local-only ignore (never a tracked-file mutation): the worktree dir lives
  // inside the main checkout — without this, `git status` reports it as
  // untracked dirt forever. info/exclude is per-clone, additive, idempotent.
  try {
    const excludePath = join(mainRoot, '.git', 'info', 'exclude');
    const entry = `/${config.worktree.dir}/`;
    const current = existsSync(excludePath) ? readFileSync(excludePath, 'utf8') : '';
    if (!current.split('\n').includes(entry)) {
      mkdirSync(join(mainRoot, '.git', 'info'), { recursive: true });
      appendFileSync(excludePath, `${current.endsWith('\n') || current === '' ? '' : '\n'}${entry}\n`);
    }
  } catch {
    /* best-effort — the merge-side coordination rule covers the dirt check */
  }

  git(mainRoot, ['branch', branch]);
  try {
    git(mainRoot, ['worktree', 'add', path, branch]);
  } catch (err) {
    try {
      git(mainRoot, ['branch', '-d', branch]);
    } catch {
      /* branch already gone or busy — the thrown error names the real failure */
    }
    throw new Error(
      `worktree add failed for ${relPath}: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`,
      { cause: err },
    );
  }
  return { path, relPath, branch };
}

/**
 * Post-merge teardown: remove the worktree, then delete the merged branch.
 * Never throws, never forces — every failure becomes a warning (W3). The
 * lease-supplied relPath is containment-checked before use: a tampered lease
 * must not aim the removal outside the worktree dir.
 */
export function removeWorktree(
  config: WorkflowConfig,
  root: string,
  { worktree, branch }: { worktree: string; branch: string },
): WorktreeRemoval {
  const warnings: string[] = [];
  const mainRoot = mainRepoRoot(root);
  let removed = false;
  let branchDeleted = false;

  let path: string;
  try {
    if (!worktree.startsWith(`${config.worktree.dir}/`)) {
      throw new Error(`lease worktree ${worktree} is outside ${config.worktree.dir}/`);
    }
    path = containedPath(mainRoot, worktree);
  } catch (err) {
    warnings.push(
      `worktree not removed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { removed, branchDeleted, warnings };
  }

  if (existsSync(path)) {
    try {
      git(mainRoot, ['worktree', 'remove', path]);
      removed = true;
    } catch {
      warnings.push(`worktree left at ${worktree} (dirty or busy) — remove manually`);
    }
  } else {
    try {
      git(mainRoot, ['worktree', 'prune']);
    } catch {
      /* prune is best-effort */
    }
    removed = true;
  }

  if (removed) {
    try {
      git(mainRoot, ['branch', '-d', branch]);
      branchDeleted = true;
    } catch {
      warnings.push(`branch ${branch} not deleted (unmerged or absent) — delete manually`);
    }
  }
  return { removed, branchDeleted, warnings };
}
