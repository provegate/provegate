import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import type { WorkflowConfig } from '../config/index.js';
import { mainRepoRoot } from '../state/io.js';
import { escapeRegExp, parseConflictSurface, type RejectedClaim } from '../state/markdown.js';
import { globToRegExp, globsMayIntersect } from './glob.js';

/**
 * Path-conflict detection: fail when two ACTIVE execution-phase locks declare
 * overlapping source paths. Globs materialize against `git ls-files`, minus
 * the shared append-only manifests (post-materialization — so a broad `**`
 * cannot false-conflict on them). A lock with no `ownedPaths` declares no
 * surface and never trips the gate (opt-in).
 *
 * The parent's GRANDFATHERED escape hatch is deliberately not ported — a fresh
 * project has no pre-gate locks to grandfather.
 */

export interface SurfacedLock {
  lockId?: string;
  prd: string;
  phase: string;
  ownedPaths?: string[];
  /** Set by `candidateFromPrd`: the PRD file read, and the exact buffer whose
   * `## Conflict Surface` produced `ownedPaths`. */
  sourcePath?: string;
  sourceContent?: string;
  /** Tokens in that section that are NOT claimable paths, with a reason each.
   * Reported by the claim rather than discarded: an author who wrote a path the
   * lease never received believes a file is protected that is not. */
  rejected?: RejectedClaim[];
}

export interface PathConflict {
  a: string;
  b: string;
  shared: string[];
}

/** Tracked files in the repo, for glob materialization. Empty when git fails. */
/** One spelling for one path, so two claims on the same tree collide. Mirrors
 * `canonicalPath` in the memory reader; both exist because a glob and a target
 * must be compared after the same normalization, never before it. */
export function canonicalGlob(glob: string): string {
  const slashed = glob.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  const parts: string[] = [];
  for (const part of slashed.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join('/');
}

export function trackedFiles(cwd: string): string[] {
  try {
    return execFileSync('git', ['ls-files'], { cwd, encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function materialize(config: WorkflowConfig, globs: string[], files: string[]): Set<string> {
  const shared = new Set(config.sharedAppendOnly.map(canonicalGlob));
  const regexes = globs.map(globToRegExp);
  const out = new Set<string>();
  for (const file of files) {
    if (shared.has(file)) continue;
    if (regexes.some((re) => re.test(file))) out.add(file);
  }
  return out;
}

/** Structural overlap for globs that materialize to zero files yet (new dirs):
 * two surfaces collide when their patterns can match a common future path.
 * Decided by `globsMayIntersect` — sound over the supported grammar, so
 * sibling wildcards (`src/api/*.ts` ~ `src/api/users.ts`) are caught, not just
 * identical or prefix-nested globs. The bias is conservative by design: an
 * uncertain pair refuses (recoverable by editing a surface) rather than
 * silently double-claiming (silent corruption at merge).
 *
 * `shared` (append-only manifests) are excluded from BOTH sides first — the
 * structural analog of `materialize`'s post-materialization subtraction: a glob
 * that is exactly a union-merged manifest declares no exclusive surface, so it
 * can never structurally conflict (mirrors the tracked-file path, which already
 * drops these before comparing). */
export function structuralOverlap(
  aGlobs: string[],
  bGlobs: string[],
  shared: ReadonlySet<string> = new Set(),
): string[] {
  const out: string[] = [];
  for (const ag of aGlobs) {
    if (shared.has(ag)) continue;
    for (const bg of bGlobs) {
      if (shared.has(bg)) continue;
      if (globsMayIntersect(ag, bg)) out.push(`${ag} ~ ${bg}`);
    }
  }
  return out;
}

/** Pure overlap detector over active locks. */
export function findConflicts(
  config: WorkflowConfig,
  activeLocks: SurfacedLock[],
  files: string[],
): PathConflict[] {
  const surfaced = activeLocks
    .filter((lock) => config.executionPhases.includes(lock.phase))
    .filter((lock) => Array.isArray(lock.ownedPaths) && lock.ownedPaths.length > 0)
    .map((lock) => ({
      lock,
      // Canonicalized FIRST. `globToRegExp` compiles a backslash as a literal,
      // so `src\\api\\**` and `src/api/**` named the same tree and intersected
      // nowhere — two maintainers claiming one directory, both leases installed.
      globs: lock.ownedPaths!.map(canonicalGlob),
      mat: materialize(config, lock.ownedPaths!.map(canonicalGlob), files),
    }));

  const conflicts: PathConflict[] = [];
  for (let i = 0; i < surfaced.length; i += 1) {
    for (let j = i + 1; j < surfaced.length; j += 1) {
      const a = surfaced[i]!;
      const b = surfaced[j]!;
      if (a.lock.prd === b.lock.prd) continue;
      const shared = [...a.mat].filter((file) => b.mat.has(file));
      // Structural overlap is checked ALWAYS, not only when a whole surface
      // materializes to nothing. Two claims of `['src/a.ts','src/new/**']` and
      // `['src/b.ts','src/new/**']` in a tree where only `a.ts` and `b.ts` exist
      // share no existing FILE, so the file check found nothing and the
      // structural check never ran — and both agents installed, each owning
      // every future path under `src/new/`. The conflict is in the claims, and
      // whether some sibling pattern happens to match a tracked file today says
      // nothing about it.
      // The shared set is canonicalized too — comparing canonical globs against raw
      // spellings made an append-only file exempt under one spelling and exclusive
      // under another.
      const structural = structuralOverlap(
        a.globs,
        b.globs,
        new Set(config.sharedAppendOnly.map(canonicalGlob)),
      );
      if (shared.length > 0 || structural.length > 0) {
        conflicts.push({
          a: a.lock.prd,
          b: b.lock.prd,
          shared: shared.length > 0 ? shared : structural,
        });
      }
    }
  }
  return conflicts;
}

/**
 * Synthesize a candidate entry from a work item's `## Conflict Surface` so the
 * same detector can pre-check a claim before any lock exists. The candidate is
 * stamped as an execution-phase entry — otherwise the phase filter would
 * silently exempt it. Returns null when no surface is declared (no surface =
 * nothing to check).
 */
export function candidateFromPrd(
  config: WorkflowConfig,
  id: string,
  root: string,
): SurfacedLock | null {
  const normalized = String(id ?? '').toUpperCase();
  const match = normalized.match(
    new RegExp(
      `^${escapeRegExp(config.idPattern.prefix.toUpperCase())}-(\\d{${config.idPattern.width}})$`,
    ),
  );
  if (!match) {
    throw new Error(
      `malformed id "${id}" (expected ${config.idPattern.prefix}-${'N'.repeat(config.idPattern.width)})`,
    );
  }
  const num = match[1]!;
  const prdKind = config.dirs.artifacts.prd;
  const fileRe = new RegExp(`^${escapeRegExp(prdKind.prefix)}-${num}-.+\\.md$`);
  const mainRoot = mainRepoRoot(root);
  const found: string[] = [];
  // Candidates are pre-execution: search every configured lifecycle state (a
  // completed match still resolves, harmlessly) in configured order.
  for (const state of config.dirs.states) {
    const dir = resolve(mainRoot, prdKind.dir, state);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (fileRe.test(name)) found.push(resolve(dir, name));
    }
  }
  if (found.length === 0) {
    throw new Error(
      `no PRD file for ${normalized} in ${prdKind.dir}/{${config.dirs.states.join(',')}}`,
    );
  }
  if (found.length > 1) {
    throw new Error(
      `multiple PRD files for ${normalized}: ${found.map((p) => relative(mainRoot, p)).join(', ')}`,
    );
  }
  // The BYTES parsed here are the candidate's provenance: callers that must
  // prove "the checkout carries exactly what this lease describes" have to
  // hash this buffer, not a later re-read of the path (codex prd-007 r21).
  const source = readFileSync(found[0]!, 'utf8');
  const { globs, rejected } = parseConflictSurface(source);
  // An entirely-rejected surface is NOT "declares no Conflict Surface". The
  // author wrote paths; every one was refused. Returning null there collapses
  // two different situations into one message and throws away the only
  // information that could fix it, so the candidate is returned with an empty
  // glob list and the reasons attached, and the caller decides.
  if (globs.length === 0 && rejected.length === 0) return null;
  // Stamp as an execution-phase entry — validated non-empty at config load.
  const executionPhase = config.executionPhases[0];
  if (executionPhase === undefined) {
    throw new Error('executionPhases must not be empty');
  }
  return {
    prd: normalized,
    phase: executionPhase,
    ownedPaths: globs,
    // Carried, not swallowed. This is the ENFORCING path: a token the author
    // wrote and the lease never received is a file they believe is protected
    // and the lock engine has never heard of. The caller prints them.
    rejected,
    sourcePath: found[0]!,
    sourceContent: source,
  };
}

/** Conflicts between a candidate and the ACTIVE locks — the candidate's own
 * lock (same id) is excluded: it is the surface being (re)claimed, not a rival. */
export function candidateConflicts(
  config: WorkflowConfig,
  candidate: SurfacedLock | null,
  activeLocks: SurfacedLock[],
  files: string[],
): PathConflict[] {
  if (!candidate) return [];
  const rivals = activeLocks.filter((lock) => lock.prd !== candidate.prd);
  return findConflicts(config, [candidate, ...rivals], files).filter(
    (conflict) => conflict.a === candidate.prd || conflict.b === candidate.prd,
  );
}
