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
  // Deletion ALWAYS runs in an immutable context WE own: a throwaway
  // `--no-checkout` detached scratch tree pinned at the base tip. Any live
  // checkout — even one that held the base a moment ago — can have its HEAD
  // switched by another process between lookup and delete, letting `-d`
  // judge an advanced feature ref against the wrong tip (codex r11+r12 P1).
  // In the scratch context `-d`'s own mergedness and checked-out-branch
  // guards re-evaluate at delete time against a HEAD nobody else can move.
  const scratch = join(mainRoot, normalizedWorktreeDir(config), `.gate-branch-del-${process.pid}`);
  try {
    // --no-checkout: no files, no checkout hooks.
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
      // --force is legitimate HERE ONLY: the scratch tree is internal, just
      // created, never populated — an unpopulated checkout reads as "dirty"
      // to plain remove. User trees are never force-removed.
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

/**
 * Repo-relative paths whose committed state on `ref` does NOT match the
 * working tree — absent, or present with uncommitted edits. Existence alone
 * is not enough: a provisioned checkout receiving the OLD blob while the
 * lease was built from the edited file means the agent works against a
 * different PRD than the one protected (codex r16 P1).
 */
/** Resolve `ref` to an immutable SHA, or null when it does not exist. Every
 * artifact comparison, branch creation, and post-add validation in one
 * provisioning operation must name the SAME revision: a base branch that
 * advances mid-flight would otherwise let the lease and the checkout describe
 * different PRDs (codex r19 P1). */
export function resolveRef(mainRoot: string, ref: string): string | null {
  try {
    return git(mainRoot, ['rev-parse', '--verify', `${ref}^{commit}`]);
  } catch {
    return null;
  }
}

/** Whether `rel` is reachable from `ref`. */
export function existsOnRef(mainRoot: string, ref: string, rel: string): boolean {
  try {
    git(mainRoot, ['cat-file', '-e', `${ref}:${rel}`]);
    return true;
  } catch {
    return false;
  }
}

export function pathsNotMatchingRef(mainRoot: string, ref: string, relPaths: string[]): string[] {
  const stale: string[] = [];
  for (const rel of relPaths) {
    try {
      git(mainRoot, ['cat-file', '-e', `${ref}:${rel}`]);
    } catch {
      stale.push(rel);
      continue;
    }
    try {
      // Ref vs WORKING TREE for this path; nonzero exit = differs.
      git(mainRoot, ['diff', '--quiet', ref, '--', rel]);
    } catch {
      stale.push(rel);
    }
  }
  return stale;
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
  {
    id,
    slug,
    names,
    reattachOwned = false,
    requireOnBase = [],
    baseSha,
  }: {
    id: string;
    slug: string;
    names?: { relPath: string; branch: string };
    /** The pinned base revision this whole claim reasons about; resolved
     * internally when the caller does not supply one. */
    baseSha?: string;
    /** ONLY when prior lease stamps establish ownership of `names.branch` —
     * a bare name match is NOT ownership (a rival's branch must refuse). */
    reattachOwned?: boolean;
    /** Repo-relative artifacts the provisioned checkout MUST contain; a
     * branch cut from the base ref cannot see uncommitted files. */
    requireOnBase?: string[];
  },
): WorktreeProvision {
  const mainRoot = mainRepoRoot(root);
  // Explicit names let a claim RE-provision the checkout its lease stamps
  // already name (prior stamps after the tree was removed) — deriving fresh
  // names there would leave the lease pointing at a nonexistent path (codex
  // r11 P2). All guards below apply to explicit names identically.
  const { relPath, branch } = names ?? worktreeNamesFor(config, id, slug);
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
  // The repository root as worktree.dir would make EVERY repo path pass the
  // containment prefix and every provisioned tree read as root-level source
  // dirt — reject the configuration outright (codex r12 P2).
  const wtDir = normalizedWorktreeDir(config);
  if (wtDir === '.' || wtDir === '') {
    throw new Error(`worktree.dir must name a subdirectory, not the repository root — refused`);
  }
  // A symlink alias (`alias -> .`) spells like a subdirectory but RESOLVES to
  // the repository root — provisioning through it would land checkouts at the
  // root, outside every ignore/dirt prefix (codex r13 P2).
  try {
    const wtRootProbe = resolve(mainRoot, wtDir);
    if (existsSync(wtRootProbe) && realpathSync(wtRootProbe) === realpathSync(mainRoot)) {
      throw new Error(`worktree.dir resolves to the repository root — refused`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('repository root')) throw err;
    /* realpath probe failure falls through to containment below */
  }
  const path = containedPath(mainRoot, relPath);
  // Public-API guard: a non-interpolating pattern plus a hostile slug could
  // normalize the path outside worktree.dir — the stamp would then be
  // uncleanable (codex r9 P2). Strict child of the canonical dir, always.
  const wtRoot = resolve(mainRoot, wtDir);
  if (!path.startsWith(`${wtRoot}${sep}`)) {
    throw new Error(`worktree path ${relPath} escapes ${wtDir}/ — refused`);
  }

  // With explicit (stamped) names an existing branch is OURS to reattach: a
  // normal `git worktree remove` leaves the branch behind, and a reprovision
  // must check it out again rather than refuse its own leftovers (codex r12
  // P2). Derived names keep the hard collision refusal.
  const branchAlready = branchExists(mainRoot, branch);
  const reattach = branchAlready && reattachOwned;
  if (branchAlready && !reattach) {
    throw new Error(`branch ${branch} already exists — remove it or claim without --worktree`);
  }
  if (reattach && worktreeForBranch(mainRoot, branch) !== null) {
    throw new Error(`branch ${branch} is checked out in another worktree — resolve it first`);
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
  // commits into the provisioned worktree (codex r1 P1). A reattach keeps
  // the existing branch tip untouched.
  const base = config.branches.base;
  if (!branchExists(mainRoot, base)) {
    throw new Error(`base branch '${base}' not found in the main checkout — cannot provision`);
  }
  const baseRef = baseSha ?? resolveRef(mainRoot, `refs/heads/${base}`);
  if (baseRef === null) {
    throw new Error(`base branch '${base}' could not be resolved — cannot provision`);
  }
  // A branch cut from the base ref cannot see UNCOMMITTED artifacts: the
  // quickstart order (`gate new` → `gate open --worktree`) would otherwise
  // hand back a checkout missing the very PRD it claims, and every subsequent
  // `gate check/run` there would fail (codex r15 P1). BOTH the main checkout
  // and the CALLER's checkout are compared: a claim launched from a linked
  // worktree loads its config/PRD from there, so validating only the primary
  // would admit an edited caller (codex r18/r19 P1). Reattachment is checked
  // too — its lease is built from the same caller state.
  const callerRoot = resolve(root);
  const stale = pathsNotMatchingRef(mainRoot, baseRef, requireOnBase);
  for (const rel of pathsNotMatchingRef(callerRoot, baseRef, requireOnBase)) {
    if (!stale.includes(rel)) stale.push(rel);
  }
  if (stale.length > 0) {
    throw new Error(
      `these workflow artifacts are missing or uncommitted on '${base}' (${stale.join(', ')}) — commit them first, or claim without --worktree`,
    );
  }
  if (!reattach) {
    git(mainRoot, ['branch', branch, baseRef]);
  }
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
    // A REATTACHED branch predates this call and is not ours to delete.
    if (!reattach) {
      const del = deleteBranchSafely(config, mainRoot, branch);
      if (!del.deleted) debris.push(`branch ${branch}${del.why ? ` (${del.why})` : ''}`);
    }
    const detail = err instanceof Error ? err.message.split('\n')[0] : String(err);
    throw new Error(
      `worktree add failed for ${relPath}: ${detail}${debris.length > 0 ? ` — provisioning debris left: ${debris.join(', ')}; remove manually` : ''}`,
      { cause: err },
    );
  }
  // The checkout that now exists must MATCH the base for every required
  // artifact. A reattached branch may predate a base move; a freshly cut one
  // is current by construction but `worktree add` runs arbitrary checkout
  // hooks that can edit it (codex r17+r18 P1) — so prove it either way. Our
  // worktree is removed on mismatch; a pre-existing branch is left alone, and
  // debris that survives removal is NAMED, never silently pruned (r18 P2).
  if (requireOnBase.length > 0) {
    const stale = pathsNotMatchingRef(path, baseRef, requireOnBase);
    if (stale.length > 0) {
      const debris: string[] = [];
      try {
        git(mainRoot, ['worktree', 'remove', path]);
      } catch {
        try {
          git(mainRoot, ['worktree', 'prune']);
        } catch {
          /* best-effort */
        }
        if (existsSync(path)) debris.push(`the checkout at ${relPath} could NOT be removed`);
      }
      if (!reattach && debris.length === 0) {
        const del = deleteBranchSafely(config, mainRoot, branch);
        if (!del.deleted) debris.push(`branch ${branch}${del.why ? ` (${del.why})` : ''}`);
      }
      const why = reattach
        ? `the existing branch ${branch} carries workflow artifacts differing from '${base}' (${stale.join(', ')}) — merge or rebase ${base} into it first`
        : `the provisioned checkout was modified during setup and no longer matches '${base}' (${stale.join(', ')}) — inspect your checkout hooks`;
      throw new Error(
        `${why}${debris.length > 0 ? ` — provisioning debris left: ${debris.join(', ')}; clean up manually` : ''}`,
      );
    }
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
  const wtDirGuard = normalizedWorktreeDir(config);
  if (wtDirGuard === '.' || wtDirGuard === '') {
    warnings.push('cleanup refused: worktree.dir is the repository root — fix the config');
    return { removed, branchDeleted, warnings };
  }
  try {
    const wtRootProbe = resolve(mainRoot, wtDirGuard);
    if (existsSync(wtRootProbe) && realpathSync(wtRootProbe) === realpathSync(mainRoot)) {
      warnings.push('cleanup refused: worktree.dir resolves to the repository root — fix the config');
      return { removed, branchDeleted, warnings };
    }
  } catch {
    /* probe failure — the containment checks below still gate the removal */
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
