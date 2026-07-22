import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import type { WorkflowConfig } from '../config/index.js';
import { mainRepoRoot } from '../state/io.js';

/**
 * Agent lock leases. Lock files live on the MAIN checkout so worktree cleanup
 * does not orphan active claims or hide them from verification on the base.
 */

export function locksDir(config: WorkflowConfig, root: string): string {
  return resolve(mainRepoRoot(root), config.dirs.locksDir);
}

export function localLocksDir(config: WorkflowConfig, root: string): string {
  return resolve(root, config.dirs.locksDir);
}

export function ensureLocksDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function lockPathFor(
  config: WorkflowConfig,
  root: string,
  id: string,
  slug: string,
): string {
  return resolve(locksDir(config, root), `${id.toLowerCase()}-${slug}.json`);
}

/** Move worktree-local lock JSON files into the main checkout (by filename). */
export function migrateWorktreeLocks(config: WorkflowConfig, root: string): number {
  const central = locksDir(config, root);
  const local = localLocksDir(config, root);
  if (local === central || !existsSync(local)) return 0;
  ensureLocksDir(central);
  let moved = 0;
  for (const name of readdirSync(local).filter((n) => n.endsWith('.json'))) {
    const src = resolve(local, name);
    const dst = resolve(central, name);
    if (existsSync(dst)) {
      try {
        unlinkSync(src);
      } catch {
        /* ignore */
      }
      continue;
    }
    try {
      renameSync(src, dst);
      moved += 1;
    } catch {
      const body = readFileSync(src, 'utf8');
      writeFileSync(dst, body);
      try {
        unlinkSync(src);
      } catch {
        /* ignore */
      }
      moved += 1;
    }
  }
  return moved;
}

export interface LockFileEntry {
  path: string;
  name: string;
  data?: Record<string, unknown>;
  error?: string;
}

/** List lock files, migrating worktree-local ones first. Parse errors are
 * carried as entries, never thrown — a corrupt lease must fail loud downstream,
 * not crash the listing. */
export function listLockFiles(config: WorkflowConfig, root: string): LockFileEntry[] {
  migrateWorktreeLocks(config, root);
  const dir = locksDir(config, root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const path = resolve(dir, name);
      try {
        const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
        // Valid JSON that is not an object (null, number, string, array) is
        // just as malformed as a syntax error — carry it as an error entry so
        // consumers never dereference a non-object lock.
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          return {
            path,
            name,
            error: `lock file is not a JSON object (got ${JSON.stringify(parsed)?.slice(0, 40) ?? 'undefined'})`,
          };
        }
        return { path, name, data: parsed as Record<string, unknown> };
      } catch (error) {
        return { path, name, error: error instanceof Error ? error.message : String(error) };
      }
    });
}

/** Validate an optional `ownedPaths` conflict surface. Empty array = no surface (opt-in). */
export function validateOwnedPaths(lock: Record<string, unknown>): string[] {
  const issues: string[] = [];
  const value = lock['ownedPaths'];
  if (value === undefined) return issues;
  if (!Array.isArray(value)) {
    issues.push('ownedPaths must be an array of glob strings when set');
    return issues;
  }
  value.forEach((glob, index) => {
    if (typeof glob !== 'string' || glob.length === 0) {
      issues.push(`ownedPaths[${index}] must be a non-empty string`);
    }
  });
  return issues;
}

const REQUIRED_FIELDS = [
  'schemaVersion',
  'lockId',
  'agent',
  'prd',
  'phase',
  'startedAt',
  'expiresAt',
  'touchedFiles',
] as const;

/**
 * Shape-validate a lock lease. Returns one issue string per defect (empty =
 * valid). This is the REAL gate for the lock shape — no schema validator
 * library loads the JSON schema; a malformed surface fails here, loud.
 */
export function validateLock(
  config: WorkflowConfig,
  data: Record<string, unknown>,
  { now = Date.now() }: { now?: number } = {},
): string[] {
  const issues: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined) issues.push(`missing ${field}`);
  }
  const touched = data['touchedFiles'];
  if (!Array.isArray(touched) || touched.length === 0) {
    issues.push('touchedFiles must be a non-empty array');
  }
  const schemaVersion = data['schemaVersion'];
  if (schemaVersion !== undefined && schemaVersion !== 1 && schemaVersion !== 2) {
    issues.push(`schemaVersion must be 1 or 2 (got ${String(schemaVersion)})`);
  }
  const worktree = data['worktree'];
  if (worktree !== undefined) {
    if (typeof worktree !== 'string' || worktree.length === 0) {
      issues.push('worktree must be a non-empty string when set');
    } else if (!worktree.startsWith(`${config.worktree.dir}/`)) {
      issues.push(`worktree must live under ${config.worktree.dir}/ (got ${worktree})`);
    }
  }
  const branch = data['branch'];
  if (branch !== undefined && (typeof branch !== 'string' || branch.length === 0)) {
    issues.push('branch must be a non-empty string when set');
  }
  issues.push(...validateOwnedPaths(data));
  const expiresAt = Date.parse(String(data['expiresAt']));
  if (!Number.isFinite(expiresAt)) {
    issues.push('expiresAt is not a valid date-time');
  } else if (expiresAt < now) {
    const ageMinutes = Math.round((now - expiresAt) / 60_000);
    issues.push(`stale lock expired ${ageMinutes} minute(s) ago; remove or renew it`);
  }
  return issues;
}

export interface LeaseConflict {
  a: string;
  b: string;
  shared: string[];
}

/** Pairwise `touchedFiles` overlap between unexpired locks. */
export function findLeaseConflicts(
  locks: { name: string; data: Record<string, unknown> }[],
  { now = Date.now() }: { now?: number } = {},
): LeaseConflict[] {
  const active = locks.filter((lock) => Date.parse(String(lock.data['expiresAt'])) >= now);
  const conflicts: LeaseConflict[] = [];
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i]!;
      const b = active[j]!;
      const aFiles = new Set(
        Array.isArray(a.data['touchedFiles']) ? (a.data['touchedFiles'] as unknown[]) : [],
      );
      const bFiles = Array.isArray(b.data['touchedFiles'])
        ? (b.data['touchedFiles'] as unknown[])
        : [];
      const overlap = bFiles.filter((file) => aFiles.has(file)).map(String);
      if (overlap.length > 0) {
        conflicts.push({ a: a.name, b: b.name, shared: overlap });
      }
    }
  }
  return conflicts;
}
