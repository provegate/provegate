import { readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { WorkflowConfig } from '../config/index.js';
import {
  candidateConflicts,
  candidateFromPrd,
  ensureLocksDir,
  listLockFiles,
  lockPathFor,
  locksDir,
  trackedFiles,
  validateLock,
  type PathConflict,
  type SurfacedLock,
} from '../locks/index.js';
import { mainRepoRoot } from '../state/io.js';
import { containedPath } from './init.js';
import { withWorkspaceMutex } from './mutex.js';

/**
 * `gate open PRD-XXX` — claim a work item's declared conflict surface. The
 * whole point is WHEN it fails: overlap is refused at claim time, not merge
 * time. No lease is ever written while a conflict exists (atomic claim).
 *
 * Lease-state matrix (W3):
 *   self   × valid  -> refresh, "already held"
 *   self   × stale  -> refresh
 *   foreign × valid -> refuse, name the overlap (--steal does NOT override)
 *   foreign × stale -> refuse, advertise --steal; with --steal: replace,
 *                      loudly naming the victim
 */

export const DEFAULT_LEASE_HOURS = 12;

export interface ClaimOptions {
  steal?: boolean;
  agent?: string;
  leaseHours?: number;
  now?: Date;
}

export interface StolenLease {
  prd: string;
  agent: string;
  expiredAt: string;
  file: string;
}

export interface ClaimResult {
  ok: boolean;
  id: string;
  refreshed: boolean;
  leasePath?: string;
  globs: string[];
  conflicts: PathConflict[];
  /** Foreign stale leases blocking the claim (steal candidates). */
  staleBlockers: StolenLease[];
  stolen: StolenLease[];
  issues: string[];
}

interface ParsedLock {
  file: string;
  prd: string;
  agent: string;
  phase: string;
  expiresAt: string;
  stale: boolean;
  surfaced: SurfacedLock;
}

interface LockParse {
  locks: ParsedLock[];
  /** Fail CLOSED: any lease we cannot fully reason about blocks claiming. */
  malformed: string[];
}

function parseLocks(config: WorkflowConfig, root: string, now: Date): LockParse {
  const locks: ParsedLock[] = [];
  const malformed: string[] = [];
  for (const entry of listLockFiles(config, root)) {
    if (!entry.data) {
      malformed.push(`${entry.name}: ${entry.error ?? 'unreadable'}`);
      continue;
    }
    const d = entry.data;
    // Shape-validate with expiry neutralized (now: 0): a well-formed but
    // EXPIRED lease is stale, not malformed; an unparseable expiresAt or any
    // other shape defect makes ownership unknowable -> malformed, fail closed.
    const shapeIssues = validateLock(config, d, { now: 0 });
    if (shapeIssues.length > 0) {
      malformed.push(`${entry.name}: ${shapeIssues.join('; ')}`);
      continue;
    }
    const expiresAt = String(d['expiresAt']);
    const expiry = Date.parse(expiresAt);
    const globs = Array.isArray(d['ownedPaths'])
      ? (d['ownedPaths'] as string[])
      : (d['touchedFiles'] as string[]);
    locks.push({
      file: entry.path,
      prd: String(d['prd']),
      agent: String(d['agent']),
      phase: String(d['phase']),
      expiresAt,
      stale: expiry < now.getTime(),
      surfaced: {
        prd: String(d['prd']),
        phase: String(d['phase']),
        ownedPaths: globs,
      },
    });
  }
  return { locks, malformed };
}

export function claimPrd(
  config: WorkflowConfig,
  root: string,
  id: string,
  options: ClaimOptions = {},
): ClaimResult {
  // Check -> steal -> write must be one atomic step per workspace: without the
  // mutex, two non-conflicting snapshots let two OVERLAPPING claims both land,
  // and a stale-steal could unlink a lease refreshed after our parse. Locks
  // live on the MAIN checkout (worktree claimants share one lock domain), and
  // the configured locksDir must be contained there — lexically and through
  // its existing symlink ancestors — before anything is created under it.
  const lockRoot = containedPath(mainRepoRoot(root), config.dirs.locksDir);
  return withWorkspaceMutex(resolve(lockRoot, '.gate-open.mutex'), () =>
    claimPrdLocked(config, root, id, options),
  );
}

function claimPrdLocked(
  config: WorkflowConfig,
  root: string,
  id: string,
  { steal = false, agent, leaseHours = DEFAULT_LEASE_HOURS, now = new Date() }: ClaimOptions = {},
): ClaimResult {
  const normalized = id.toUpperCase();
  const leaseAgent = agent ?? config.owners[0] ?? 'operator';
  const base: Omit<ClaimResult, 'ok' | 'issues'> = {
    id: normalized,
    refreshed: false,
    globs: [],
    conflicts: [],
    staleBlockers: [],
    stolen: [],
  };

  // candidateFromPrd throws on malformed/missing/duplicated PRD; a null return
  // means the PRD exists but declares no surface — refusal with guidance.
  const candidate = candidateFromPrd(config, normalized, root);
  if (candidate === null) {
    return {
      ...base,
      ok: false,
      issues: [
        `${normalized} declares no Conflict Surface — a claim over nothing protects nothing; fill the \`## Conflict Surface\` section first`,
      ],
    };
  }
  const globs = candidate.ownedPaths ?? [];

  const { locks, malformed } = parseLocks(config, root, now);
  if (malformed.length > 0) {
    return {
      ...base,
      ok: false,
      issues: [
        ...malformed.map((m) => `malformed lease (fail closed): ${m}`),
        'ownership is unknowable while malformed leases exist — repair or delete them explicitly, then re-run',
      ],
    };
  }
  const self = locks.filter((l) => l.prd === normalized);
  const foreign = locks.filter((l) => l.prd !== normalized);

  const files = trackedFiles(root);
  const conflicts = candidateConflicts(
    config,
    candidate,
    foreign.map((l) => l.surfaced),
    files,
  );

  const conflictingPrds = new Set(conflicts.flatMap((c) => [c.a, c.b]));
  conflictingPrds.delete(normalized);
  const blockers = foreign.filter((l) => conflictingPrds.has(l.prd));
  const validBlockers = blockers.filter((l) => !l.stale);
  const staleBlockers = blockers.filter((l) => l.stale);
  const asStolen = (l: ParsedLock): StolenLease => ({
    prd: l.prd,
    agent: l.agent,
    expiredAt: l.expiresAt,
    file: l.file,
  });

  if (validBlockers.length > 0) {
    return {
      ...base,
      globs,
      conflicts,
      staleBlockers: staleBlockers.map(asStolen),
      ok: false,
      issues: conflicts.map(
        (c) =>
          `surface overlap with ${c.a === normalized ? c.b : c.a}: ${c.shared.slice(0, 5).join(', ')}${c.shared.length > 5 ? ', …' : ''}`,
      ),
    };
  }
  if (staleBlockers.length > 0 && !steal) {
    return {
      ...base,
      globs,
      conflicts,
      staleBlockers: staleBlockers.map(asStolen),
      ok: false,
      issues: [
        ...conflicts.map(
          (c) =>
            `surface overlap with STALE lease ${c.a === normalized ? c.b : c.a}: ${c.shared.slice(0, 5).join(', ')}${c.shared.length > 5 ? ', …' : ''}`,
        ),
        're-run with --steal to take over the stale lease (the takeover is logged, never silent)',
      ],
    };
  }

  // Clear (or stealing stale blockers): write/refresh the lease. All under
  // the workspace mutex — but each victim is REVALIDATED from disk right
  // before the unlink anyway (belt for mutex-less writers): a lease refreshed
  // since our parse is no longer stale and aborts the steal.
  const stolen: StolenLease[] = [];
  if (steal) {
    for (const l of staleBlockers) {
      let expiry = Number.NaN;
      try {
        const fresh = JSON.parse(readFileSync(l.file, 'utf8')) as Record<string, unknown>;
        expiry = Date.parse(String(fresh['expiresAt'] ?? ''));
      } catch {
        // vanished or unreadable now -> not ours to reason about
      }
      if (!(expiry < now.getTime())) {
        return {
          ...base,
          globs,
          ok: false,
          issues: [
            `steal aborted: lease of ${l.prd} changed on disk since inspection (refreshed or unreadable)`,
          ],
        };
      }
      unlinkSync(l.file);
      stolen.push(asStolen(l));
    }
  }

  const slug = slugOf(config, root, normalized);
  // Containment (incl. symlink-ancestor walk) before any mkdir/write: the
  // lease path is config-derived like every other write target.
  containedPath(mainRepoRoot(root), config.dirs.locksDir);
  ensureLocksDir(locksDir(config, root));
  const leasePath = lockPathFor(config, root, normalized, slug);
  const lease = {
    schemaVersion: 2,
    lockId: `${normalized.toLowerCase()}-${slug}`,
    agent: leaseAgent,
    prd: normalized,
    phase: candidate.phase,
    startedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + leaseHours * 3_600_000).toISOString(),
    touchedFiles: globs,
    ownedPaths: globs,
  };
  const refreshed = self.length > 0;
  // wx for a NEW claim (never clobber an unseen rival); refresh overwrites
  // our own lease deliberately.
  writeFileSync(leasePath, `${JSON.stringify(lease, null, 2)}\n`, {
    flag: refreshed ? 'w' : 'wx',
  });
  // Self leases under a different filename (hand-written era) are superseded.
  for (const l of self) {
    if (l.file !== leasePath) unlinkSync(l.file);
  }

  return {
    ...base,
    ok: true,
    refreshed,
    leasePath,
    globs,
    conflicts: [],
    staleBlockers: [],
    stolen,
    issues: [],
  };
}

/** Slug from the unique PRD filename for this id. */
function slugOf(config: WorkflowConfig, root: string, id: string): string {
  const prdKind = config.dirs.artifacts.prd;
  const num = id.slice(config.idPattern.prefix.length + 1);
  const re = new RegExp(`^${prdKind.prefix}-${num}-(.+)\\.md$`);
  for (const state of config.dirs.states) {
    const dir = resolve(root, prdKind.dir, state);
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      const m = re.exec(name);
      if (m) return m[1]!;
    }
  }
  throw new Error(`no PRD file found for ${id} while deriving slug`);
}
