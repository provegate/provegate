import { linkSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
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
  /** Test-only injection point: runs after the lock-dir parse, before any
   * mutation — lets a test change leases inside the race window. */
  raceWindow?: () => void;
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
  /** Raw parsed fields, for identity revalidation before a steal. */
  snapshot: Record<string, unknown>;
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
      snapshot: d,
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
  {
    steal = false,
    agent,
    leaseHours = DEFAULT_LEASE_HOURS,
    now = new Date(),
    raceWindow,
  }: ClaimOptions = {},
): ClaimResult {
  const normalized = id.toUpperCase();
  // Empty/whitespace agent is treated as absent — a lease with an empty agent
  // would violate the lock schema while the command reports success.
  const trimmedAgent = agent?.trim();
  const leaseAgent = trimmedAgent !== undefined && trimmedAgent !== '' ? trimmedAgent : (config.owners[0] ?? 'operator');
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
  raceWindow?.();
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

  // Preconditions BEFORE any mutation: slug + containment + destination
  // resolution happen while every victim still sits untouched on disk — an
  // exception past this point can no longer follow destroyed leases.
  const slug = slugOf(config, root, normalized);
  containedPath(mainRepoRoot(root), config.dirs.locksDir);
  ensureLocksDir(locksDir(config, root));
  const leasePath = lockPathFor(config, root, normalized, slug);

  // Steal = QUARANTINE, not delete. Every move is a NO-REPLACE two-step
  // (linkSync fails on an existing destination, then the source is unlinked):
  // quarantining can never clobber a crash artifact, and rollback can never
  // clobber a rival that re-occupied the original path — in that case the
  // quarantine file stays on disk and is reported by name. The QUARANTINED
  // object is what gets identity-validated; victims are deleted only after
  // the new lease is installed.
  const IDENTITY_FIELDS = ['lockId', 'prd', 'agent', 'startedAt', 'expiresAt'] as const;
  const quarantined: { from: string; to: string; victim: StolenLease }[] = [];
  let quarantineSeq = 0;
  const moveNoReplace = (from: string, to: string): void => {
    linkSync(from, to); // fails EEXIST — never replaces
    unlinkSync(from);
  };
  const rollback = (): string[] => {
    const stranded: string[] = [];
    for (const q of quarantined.splice(0)) {
      try {
        moveNoReplace(q.to, q.from);
      } catch {
        // Original path re-occupied by a rival: leave BOTH intact and say so.
        stranded.push(`victim of ${q.victim.prd} preserved at ${q.to} (original path re-occupied)`);
      }
    }
    return stranded;
  };
  const stolen: StolenLease[] = [];
  try {
    if (steal) {
      for (const l of staleBlockers) {
        quarantineSeq += 1;
        const to = `${l.file}.stolen-${process.pid}-${now.getTime()}-${quarantineSeq}`;
        let mismatch = 'unreadable or vanished';
        try {
          moveNoReplace(l.file, to);
          quarantined.push({ from: l.file, to, victim: asStolen(l) });
          const fresh = JSON.parse(readFileSync(to, 'utf8')) as Record<string, unknown>;
          const identical = IDENTITY_FIELDS.every(
            (f) => String(fresh[f] ?? '') === String(l.snapshot[f] ?? ''),
          );
          const stillExpired = Date.parse(String(fresh['expiresAt'] ?? '')) < now.getTime();
          if (identical && stillExpired) mismatch = '';
          else if (!identical) mismatch = 'replaced by a different lease';
          else mismatch = 'refreshed (no longer stale)';
        } catch {
          /* mismatch already set */
        }
        if (mismatch !== '') {
          const stranded = rollback();
          return {
            ...base,
            globs,
            ok: false,
            issues: [
              `steal aborted, victims restored: lease of ${l.prd} ${mismatch}`,
              ...stranded,
            ],
          };
        }
      }
    }

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
    const leaseBody = `${JSON.stringify(lease, null, 2)}\n`;
    const selfAtDestination = self.find((l) => l.file === leasePath);
    // Uniform install protocol — refresh and fresh claim take the SAME path:
    //  1. the full lease body is STAGED to a private file (writeFileSync
    //     completes short writes internally; a failure here has touched
    //     nothing at the destination);
    //  2. a self lease at the destination is QUARANTINED (no-replace move)
    //     and its quarantined content identity-validated like any victim;
    //  3. the staged file is installed at the canonical path via linkSync —
    //     hard-link semantics are O_EXCL: an existing entry (rival, symlink,
    //     anything) fails EEXIST without following or replacing it;
    //  4. only after installation do quarantines become deletions.
    // A descriptor-based in-place rewrite cannot pin the PATHNAME to the
    // inode it validated; link-into-place makes the pathname itself the
    // atomic commit.
    const staged = `${leasePath}.staged-${process.pid}-${now.getTime()}`;
    writeFileSync(staged, leaseBody, { flag: 'wx' });
    let installIssue: string | null = null;
    try {
      if (selfAtDestination) {
        quarantineSeq += 1;
        const selfQuarantine = `${leasePath}.stolen-${process.pid}-${now.getTime()}-${quarantineSeq}`;
        let selfOk = false;
        try {
          moveNoReplace(leasePath, selfQuarantine);
          quarantined.push({
            from: leasePath,
            to: selfQuarantine,
            victim: asStolen(selfAtDestination),
          });
          const current = JSON.parse(readFileSync(selfQuarantine, 'utf8')) as Record<
            string,
            unknown
          >;
          selfOk = IDENTITY_FIELDS.every(
            (f) => String(current[f] ?? '') === String(selfAtDestination.snapshot[f] ?? ''),
          );
        } catch {
          /* vanished or unmovable — selfOk stays false */
        }
        if (!selfOk) {
          installIssue = `${leasePath} no longer carries our lease (replaced or vanished mid-claim)`;
        }
      }
      if (installIssue === null) {
        try {
          linkSync(staged, leasePath);
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
          installIssue = `${leasePath} changed on disk during the claim (unseen rival)`;
        }
      }
    } finally {
      try {
        unlinkSync(staged);
      } catch {
        /* staged already gone */
      }
    }
    if (installIssue !== null) {
      const stranded = rollback();
      return {
        ...base,
        globs,
        ok: false,
        issues: [`claim aborted, victims restored: ${installIssue} — re-run gate open`, ...stranded],
      };
    }

    // COMMIT POINT — the new lease is linked into place. Everything after
    // here is cleanup and must never throw the claim into a half-rolled-back
    // state: failures are collected and REPORTED on the successful result.
    const warnings: string[] = [];
    for (const q of quarantined.splice(0)) {
      try {
        unlinkSync(q.to);
      } catch {
        warnings.push(`stale victim copy left at ${q.to} — delete manually`);
      }
      if (q.victim.prd !== normalized) stolen.push(q.victim);
    }
    // Self leases under a different filename (hand-written era) are superseded.
    for (const l of self) {
      if (l.file === leasePath) continue;
      try {
        unlinkSync(l.file);
      } catch {
        warnings.push(`superseded self lease left at ${l.file} — delete manually`);
      }
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
      issues: warnings,
    };
  } catch (err) {
    // Exception path: stranded-rollback messages must not vanish with the
    // stack — they name real files needing manual attention.
    const stranded = rollback();
    if (stranded.length > 0) {
      throw new Error(
        `${err instanceof Error ? err.message : String(err)} — additionally: ${stranded.join('; ')}`,
        { cause: err },
      );
    }
    throw err;
  }
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
