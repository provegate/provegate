import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { normalizedWorktreeDir, type WorkflowConfig } from '../config/index.js';
import { mainRepoRoot } from '../state/io.js';
import { containedPath } from './init.js';

export { normalizedWorktreeDir };

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

/**
 * Delete a feature branch only when PROVABLY merged into the configured base.
 * `branch -d` judges mergedness against the CURRENT checkout's HEAD — a
 * primary checkout parked on an unrelated branch makes that check both too
 * strict (refuses genuinely merged branches, codex r6 P2) and too loose
 * (deletes branches merged only into the parked branch, codex r6 P2). The
 * explicit ancestry check against `refs/heads/<base>` decides; after that
 * proof a refused `-d` may escalate to `-D`, because the proof IS `-d`'s own
 * safety condition evaluated against the right ref.
 */
function deleteBranchSafely(
  config: WorkflowConfig,
  mainRoot: string,
  branch: string,
): { deleted: boolean; why?: string } {
  if (branch.startsWith('-')) {
    return { deleted: false, why: 'option-like branch name refused' };
  }
  // Configured protected branches are NEVER teardown targets, whatever a
  // (tamperable) lease stamp claims (codex r8 P1) — and the base is
  // protected UNCONDITIONALLY, whether or not the config lists it: it is
  // trivially an ancestor of itself, so nothing downstream would refuse
  // (codex r9 P1).
  if (branch === config.branches.base || config.branches.protected.includes(branch)) {
    return { deleted: false, why: 'protected branch' };
  }
  if (!branchExists(mainRoot, branch)) return { deleted: true };
  const base = config.branches.base;
  try {
    git(mainRoot, ['merge-base', '--is-ancestor', `refs/heads/${branch}`, `refs/heads/${base}`]);
  } catch {
    return { deleted: false, why: `not merged into ${base}` };
  }
  const baseDir = worktreeForBranch(mainRoot, base);
  const dir = baseDir !== null && existsSync(baseDir) ? baseDir : mainRoot;
  try {
    git(dir, ['branch', '-d', branch]);
    return { deleted: true };
  } catch {
    // `-d` refused against a parked HEAD. Escalate WITHOUT dropping any git
    // guard: a throwaway detached checkout at the base tip makes `-d`'s own
    // mergedness check evaluate against the right ref, while its
    // checked-out-branch protection stays intact — an advanced tip or a
    // checkout that appeared mid-flight refuses at delete time (codex r7+r8
    // P1; update-ref was rejected because it skips the checked-out guard).
    const scratch = join(
      mainRoot,
      normalizedWorktreeDir(config),
      `.gate-branch-del-${process.pid}`,
    );
    try {
      // --no-checkout: no files, no checkout hooks — the scratch tree exists
      // only to give `-d` a HEAD at the base tip to judge mergedness against.
      git(mainRoot, ['worktree', 'add', '--detach', '--no-checkout', scratch, `refs/heads/${base}`]);
    } catch {
      return { deleted: false, why: 'delete refused (no clean context to judge mergedness)' };
    }
    try {
      git(scratch, ['branch', '-d', branch]);
      return { deleted: true };
    } catch {
      return { deleted: false, why: 'branch advanced mid-delete or checked out elsewhere' };
    } finally {
      try {
        // --force is legitimate HERE ONLY: the scratch tree is internal,
        // just created, never populated — an unpopulated checkout reads as
        // "dirty" to plain remove. User trees are never force-removed.
        git(mainRoot, ['worktree', 'remove', '--force', scratch]);
      } catch {
        try {
          git(mainRoot, ['worktree', 'prune']);
        } catch {
          /* best-effort */
        }
      }
    }
  }
}

export function worktreeNamesFor(
  config: WorkflowConfig,
  id: string,
  slug: string,
): { relPath: string; branch: string } {
  const stem = `${id.toLowerCase()}-${slug}`;
  // Branch policy is CONFIG, not convention: honor branches.featurePattern's
  // documented `{id}`/`{slug}` interpolation (codex r2 P2).
  const branch = config.branches.featurePattern
    .replaceAll('{id}', id.toLowerCase())
    .replaceAll('{slug}', slug);
  return { relPath: `${normalizedWorktreeDir(config)}/${stem}`, branch };
}

/** The branch currently registered at `path` (realpath-compared), or null. */
function branchAtWorktree(mainRoot: string, path: string): string | null {
  let target: string;
  try {
    target = realpathSync(path);
  } catch {
    return null;
  }
  let listing: string;
  try {
    listing = git(mainRoot, ['worktree', 'list', '--porcelain']);
  } catch {
    return null;
  }
  for (const block of listing.split('\n\n')) {
    const dir = block.match(/^worktree (.+)$/m)?.[1];
    const br = block.match(/^branch refs\/heads\/(.+)$/m)?.[1];
    if (!dir || !br) continue;
    try {
      if (realpathSync(dir) === target) return br;
    } catch {
      /* registered dir vanished — not our path */
    }
  }
  return null;
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
  // An expanded featurePattern is DATA, never argv: an option-like value
  // (`-m…`) would mutate git state before any rollback exists (codex r8 P2);
  // a configured protected branch is never a provisioning target either.
  if (branch.startsWith('-')) {
    throw new Error(
      `branches.featurePattern expands to option-like branch "${branch}" — fix the pattern`,
    );
  }
  if (branch === config.branches.base || config.branches.protected.includes(branch)) {
    throw new Error(`branches.featurePattern expands to protected branch "${branch}" — refused`);
  }
  const path = containedPath(mainRoot, relPath);
  // Public-API guard: a non-interpolating pattern plus a hostile slug could
  // normalize the path outside worktree.dir — the stamp would then be
  // uncleanable (codex r9 P2). Strict child of the canonical dir, always.
  const wtRoot = resolve(mainRoot, normalizedWorktreeDir(config));
  if (!path.startsWith(`${wtRoot}${sep}`)) {
    throw new Error(`worktree path ${relPath} escapes ${normalizedWorktreeDir(config)}/ — refused`);
  }

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
    const entry = `/${normalizedWorktreeDir(config)}/`;
    const current = existsSync(excludePath) ? readFileSync(excludePath, 'utf8') : '';
    if (!current.split('\n').includes(entry)) {
      mkdirSync(join(mainRoot, '.git', 'info'), { recursive: true });
      appendFileSync(excludePath, `${current.endsWith('\n') || current === '' ? '' : '\n'}${entry}\n`);
    }
  } catch {
    /* best-effort — the merge-side coordination rule covers the dirt check */
  }

  // Branch from the CONFIGURED base ref, never the main checkout's current
  // HEAD — a main checkout parked on a diverged branch must not leak its
  // commits into the provisioned worktree (codex r1 P1).
  const base = config.branches.base;
  if (!branchExists(mainRoot, base)) {
    throw new Error(`base branch '${base}' not found in the main checkout — cannot provision`);
  }
  git(mainRoot, ['branch', branch, `refs/heads/${base}`]);
  try {
    git(mainRoot, ['worktree', 'add', path, branch]);
  } catch (err) {
    // A nonzero `worktree add` (e.g. failing post-checkout hook) can still
    // leave the worktree REGISTERED with the branch checked out — remove the
    // debris tree FIRST or `branch -d` fails silently; anything that survives
    // is named in the error so no retry collides blind (codex r2 P1).
    const debris: string[] = [];
    // Only OUR debris is removable: an external manager may have won the race
    // between the existsSync pre-check and the add — a path now occupied by a
    // foreign branch is someone else's checkout, not debris (codex r3 P2).
    const occupant = branchAtWorktree(mainRoot, path);
    if (occupant === branch) {
      try {
        git(mainRoot, ['worktree', 'remove', path]);
      } catch {
        try {
          git(mainRoot, ['worktree', 'prune']);
        } catch {
          /* best-effort */
        }
      }
    } else if (occupant === null) {
      try {
        git(mainRoot, ['worktree', 'prune']);
      } catch {
        /* best-effort */
      }
    }
    // Occupant checks gate REMOVAL, never reporting: any surviving path that
    // is ours or unregistered is debris the retry will collide with — only a
    // foreign occupant's live checkout is not ours to name as debris
    // (codex r4 P2).
    if (existsSync(path)) {
      const after = branchAtWorktree(mainRoot, path);
      if (after === branch) debris.push(`worktree debris at ${relPath}`);
      else if (after === null) debris.push(`unregistered debris directory at ${relPath}`);
    }
    // The just-created branch sits AT the base tip — the ancestry-proving
    // delete succeeds even when the primary checkout is parked elsewhere,
    // so a failed provision never leaves a colliding branch (codex r6 P2).
    const del = deleteBranchSafely(config, mainRoot, branch);
    if (!del.deleted) debris.push(`branch ${branch}${del.why ? ` (${del.why})` : ''}`);
    const detail = err instanceof Error ? err.message.split('\n')[0] : String(err);
    throw new Error(
      `worktree add failed for ${relPath}: ${detail}${debris.length > 0 ? ` — provisioning debris left: ${debris.join(', ')}; remove manually` : ''}`,
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

  // Stamp values are DATA: option-like or protected branch names refuse the
  // whole teardown before any git call (codex r8 P1/P2).
  if (
    branch.startsWith('-') ||
    branch === config.branches.base ||
    config.branches.protected.includes(branch)
  ) {
    warnings.push(
      `cleanup refused: stamped branch ${branch} is ${branch.startsWith('-') ? 'option-like' : 'protected'} — clean up manually if intended`,
    );
    return { removed, branchDeleted, warnings };
  }

  let path: string;
  try {
    // Containment base is the WORKTREE DIR, not the repo root: a tampered
    // stamp like `.worktrees/../other-tree` normalizes outside worktree.dir
    // and must refuse — repo-root containment alone would admit it (codex r2
    // P2).
    path = containedPath(mainRoot, worktree);
    const wtRoot = resolve(mainRoot, normalizedWorktreeDir(config));
    if (path !== wtRoot && !path.startsWith(`${wtRoot}${sep}`)) {
      throw new Error(`lease worktree ${worktree} is outside ${config.worktree.dir}/`);
    }
  } catch (err) {
    warnings.push(
      `worktree not removed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { removed, branchDeleted, warnings };
  }

  if (existsSync(path)) {
    // The stamped entry may itself be a symlink whose TARGET lives outside
    // worktree.dir — `git worktree remove` follows it, so containment must
    // hold for the RESOLVED path too, not just the lexical one (codex r3 P2).
    try {
      const real = realpathSync(path);
      const wtRootReal = realpathSync(resolve(mainRoot, normalizedWorktreeDir(config)));
      if (real !== wtRootReal && !real.startsWith(`${wtRootReal}${sep}`)) {
        warnings.push(
          `worktree not removed: ${worktree} resolves outside ${config.worktree.dir}/ — remove manually`,
        );
        return { removed, branchDeleted, warnings };
      }
    } catch {
      warnings.push(`worktree not removed: ${worktree} could not be resolved — remove manually`);
      return { removed, branchDeleted, warnings };
    }
    // The path must still hold the STAMPED branch: if the claimed tree was
    // moved and an unrelated checkout now occupies the old path, removing it
    // would destroy someone else's work (codex r2 P2).
    const occupant = branchAtWorktree(mainRoot, path);
    if (occupant !== branch) {
      warnings.push(
        `worktree at ${worktree} holds ${occupant ?? 'no registered branch'}, not ${branch} — not removed`,
      );
      return { removed, branchDeleted, warnings };
    }
    try {
      git(mainRoot, ['worktree', 'remove', path]);
      removed = true;
    } catch {
      warnings.push(`worktree left at ${worktree} (dirty or busy) — remove manually`);
    }
  } else {
    // Absent stamped path is only "already removed" when the branch has no
    // LIVE registered worktree anywhere: a `git worktree move`d checkout
    // survives elsewhere (codex r5 P2), but a stale registration whose
    // directory is gone is prunable leftovers, not a move (codex r6 P2).
    const elsewhere = worktreeForBranch(mainRoot, branch);
    if (elsewhere !== null && existsSync(elsewhere)) {
      warnings.push(
        `worktree for ${branch} moved to ${elsewhere} — not removed; clean up manually`,
      );
      return { removed, branchDeleted, warnings };
    }
    try {
      git(mainRoot, ['worktree', 'prune']);
    } catch {
      /* prune is best-effort */
    }
    removed = true;
  }

  if (removed) {
    const del = deleteBranchSafely(config, mainRoot, branch);
    if (del.deleted) {
      branchDeleted = true;
    } else {
      warnings.push(
        `branch ${branch} not deleted${del.why ? ` (${del.why})` : ''} — delete manually`,
      );
    }
  }
  return { removed, branchDeleted, warnings };
}
