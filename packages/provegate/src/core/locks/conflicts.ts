import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import type { WorkflowConfig } from '../config/index.js';
import { mainRepoRoot } from '../state/io.js';
import { declaredGlobs } from '../state/markdown.js';
import { globToRegExp } from './glob.js';

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
}

export interface PathConflict {
  a: string;
  b: string;
  shared: string[];
}

/** Tracked files in the repo, for glob materialization. Empty when git fails. */
export function trackedFiles(cwd: string): string[] {
  try {
    return execFileSync('git', ['ls-files'], { cwd, encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function materialize(config: WorkflowConfig, globs: string[], files: string[]): Set<string> {
  const shared = new Set(config.sharedAppendOnly);
  const regexes = globs.map(globToRegExp);
  const out = new Set<string>();
  for (const file of files) {
    if (shared.has(file)) continue;
    if (regexes.some((re) => re.test(file))) out.add(file);
  }
  return out;
}

function normalizeGlob(glob: string): string {
  return glob.replace(/\/\*\*$/, '').replace(/\/$/, '');
}

/** Structural overlap for globs that materialize to zero files yet (new
 * dirs): identical or prefix-nested normalized globs. The residual
 * sibling-glob case is a documented false-negative. */
export function structuralOverlap(aGlobs: string[], bGlobs: string[]): string[] {
  const out: string[] = [];
  for (const ag of aGlobs) {
    for (const bg of bGlobs) {
      const a = normalizeGlob(ag);
      const b = normalizeGlob(bg);
      if (a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)) out.push(`${ag} ~ ${bg}`);
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
      globs: lock.ownedPaths!,
      mat: materialize(config, lock.ownedPaths!, files),
    }));

  const conflicts: PathConflict[] = [];
  for (let i = 0; i < surfaced.length; i += 1) {
    for (let j = i + 1; j < surfaced.length; j += 1) {
      const a = surfaced[i]!;
      const b = surfaced[j]!;
      if (a.lock.prd === b.lock.prd) continue;
      const shared = [...a.mat].filter((file) => b.mat.has(file));
      const structural =
        a.mat.size === 0 || b.mat.size === 0 ? structuralOverlap(a.globs, b.globs) : [];
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
    new RegExp(`^${config.idPattern.prefix.toUpperCase()}-(\\d{${config.idPattern.width}})$`),
  );
  if (!match) {
    throw new Error(
      `malformed id "${id}" (expected ${config.idPattern.prefix}-${'N'.repeat(config.idPattern.width)})`,
    );
  }
  const num = match[1]!;
  const prdKind = config.dirs.artifacts.prd;
  const fileRe = new RegExp(`^${prdKind.prefix}-${num}-.+\\.md$`);
  const mainRoot = mainRepoRoot(root);
  const found: string[] = [];
  const wipState = config.dirs.states[0] ?? 'wip';
  for (const state of ['drafts', wipState]) {
    const dir = resolve(mainRoot, prdKind.dir, state);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (fileRe.test(name)) found.push(resolve(dir, name));
    }
  }
  if (found.length === 0) {
    throw new Error(`no PRD file for ${normalized} in ${prdKind.dir}/{drafts,${wipState}}`);
  }
  if (found.length > 1) {
    throw new Error(
      `multiple PRD files for ${normalized}: ${found.map((p) => relative(mainRoot, p)).join(', ')}`,
    );
  }
  const globs = declaredGlobs(readFileSync(found[0]!, 'utf8'));
  if (globs.length === 0) return null;
  const executionPhase = config.executionPhases.at(-2) ?? config.executionPhases[0] ?? 'Phase 4';
  return { prd: normalized, phase: executionPhase, ownedPaths: globs };
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
