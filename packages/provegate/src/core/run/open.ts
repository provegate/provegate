import {
  existsSync,
  linkSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type { WorkflowConfig } from '../config/index.js';
import {
  candidateConflicts,
  candidateFromPrd,
  ensureLocksDir,
  listLockFiles,
  lockPathFor,
  locksDir,
  migrateWorktreeLocks,
  trackedFiles,
  validateLock,
  type PathConflict,
  type SurfacedLock,
} from '../locks/index.js';
import { mainRepoRoot } from '../state/io.js';
import { escapeRegExp } from '../state/markdown.js';
import { containedPath } from './init.js';
import { withWorkspaceMutex } from './mutex.js';
import {
  createWorktree,
  worktreeForBranch,
  worktreeNamesFor,
  type WorktreeProvision,
} from './worktree.js';

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
  /** Provision a feature branch + linked worktree with the claim (atomic:
   * provisioning failure rolls the installed lease back). */
  worktree?: boolean;
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
  /** Set when `--worktree` provisioned (or reused) a checkout. */
  worktree?: WorktreeProvision;
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
  // Public-API guard, BEFORE any mutation: a zero/negative/NaN duration would
  // install a lease that is already expired while the claim reports success.
  const leaseHours = options.leaseHours ?? DEFAULT_LEASE_HOURS;
  if (typeof leaseHours !== 'number' || !Number.isFinite(leaseHours) || leaseHours <= 0) {
    throw new Error(
      `invalid leaseHours ${String(leaseHours)} — the lease duration must be a positive, finite number of hours`,
    );
  }
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
    worktree = false,
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

  // Worktree-local leases migrate HERE, inside the claim mutex. Listing is
  // read-only, so no unlocked reader (`gate queue` in a linked worktree) can
  // move an overlapping lease into the central dir between our parse and the
  // install below.
  migrateWorktreeLocks(config, root);

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

  // Steal = QUARANTINE, not delete. Moving a victim aside is a SINGLE ATOMIC
  // renameSync into a freshly created private quarantine directory (unique
  // per claim, so the destination never pre-exists): there is no
  // link-then-unlink window in which a rival's replacement of the source
  // could be deleted while we validate the old inode. A rival that replaces
  // the source BEFORE the rename gets moved and identity-MISMATCHES
  // (rollback restores it); one that lands AFTER keeps the path and the
  // install EEXISTs. Restoration is a no-replace link move: rollback never
  // clobbers a re-occupied path — the quarantine copy stays and is reported.
  // Victims are deleted only after the new lease is installed.
  const IDENTITY_FIELDS = ['lockId', 'prd', 'agent', 'startedAt', 'expiresAt'] as const;
  const quarantined: { from: string; to: string; victim: StolenLease }[] = [];
  let quarantineSeq = 0;
  const quarantineDir = join(
    locksDir(config, root),
    `.quarantine-${process.pid}-${now.getTime()}`,
  );
  let quarantineDirMade = false;
  const moveAside = (from: string): string => {
    if (!quarantineDirMade) {
      mkdirSync(quarantineDir); // unique per claim — collision = hard error
      quarantineDirMade = true;
    }
    quarantineSeq += 1;
    const to = join(quarantineDir, `${basename(from)}.${quarantineSeq}`);
    renameSync(from, to); // atomic; destination cannot pre-exist
    return to;
  };
  const moveNoReplace = (from: string, to: string): void => {
    linkSync(from, to); // fails EEXIST — never replaces
    unlinkSync(from);
  };
  const dropQuarantineDir = (): void => {
    if (!quarantineDirMade) return;
    try {
      rmdirSync(quarantineDir);
    } catch {
      /* not empty (stranded copies) or already gone — reported elsewhere */
    }
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
        let mismatch = 'unreadable or vanished';
        try {
          const to = moveAside(l.file);
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
          dropQuarantineDir();
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

    const selfAtDestination = self.find((l) => l.file === leasePath);
    // Worktree stamps are decided BEFORE install so the lease body carries
    // them from birth. A refresh WITHOUT --worktree must not strip stamps an
    // earlier --worktree claim wrote — cleanup after merge depends on them.
    // Stamps carry from ANY self lease, not only one at the destination
    // pathname: a PRD renamed to a new slug derives a new leasePath, and the
    // old stamped lease will be superseded below (codex r9 P2).
    const wtNames = worktree ? worktreeNamesFor(config, normalized, slug) : null;
    const stampSource =
      selfAtDestination ??
      self.find(
        (l) =>
          typeof l.snapshot['worktree'] === 'string' && typeof l.snapshot['branch'] === 'string',
      );
    const priorWt = stampSource?.snapshot['worktree'];
    const priorBranch = stampSource?.snapshot['branch'];
    const carried =
      wtNames === null && typeof priorWt === 'string' && typeof priorBranch === 'string'
        ? { worktree: priorWt, branch: priorBranch }
        : null;
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
      ...(wtNames ? { worktree: wtNames.relPath, branch: wtNames.branch } : {}),
      ...(carried ?? {}),
    };
    const refreshed = self.length > 0;
    const leaseBody = `${JSON.stringify(lease, null, 2)}\n`;
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
    let installIssue: string | null = null;
    // Sweep ONLY what we own: wx-EEXIST means a RIVAL owns that pathname and
    // we created nothing — deleting it would destroy someone else's staging.
    let stagedOwned = false;
    try {
      try {
        writeFileSync(staged, leaseBody, { flag: 'wx' });
        stagedOwned = true;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
          // Creation may have happened before the failure (e.g. ENOSPC mid
          // write) — that partial file is OURS to sweep.
          stagedOwned = true;
        }
        throw new Error(`could not stage the lease at ${staged}`, { cause: err });
      }
      if (selfAtDestination) {
        let selfOk = false;
        try {
          const selfQuarantine = moveAside(leasePath);
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
    } catch (err) {
      let swept = true;
      if (stagedOwned) {
        try {
          unlinkSync(staged);
        } catch {
          swept = false;
        }
      }
      throw swept
        ? err
        : new Error(
            `${err instanceof Error ? err.message : String(err)} — staged file left at ${staged}, delete manually`,
            { cause: err },
          );
    }
    if (stagedOwned) {
      try {
        unlinkSync(staged);
      } catch {
        /* staged already consumed or gone */
      }
    }
    if (installIssue !== null) {
      const stranded = rollback();
      dropQuarantineDir();
      return {
        ...base,
        globs,
        ok: false,
        issues: [`claim aborted, victims restored: ${installIssue} — re-run gate open`, ...stranded],
      };
    }

    // COMMIT POINT — the new lease is linked into place. Worktree provisioning
    // runs NOW, while every quarantined victim is still on disk: a provisioning
    // failure unlinks the fresh lease and restores the victims — claim and
    // checkout are one atomic outcome (W2). Only after provisioning do
    // quarantines become deletions.
    let provisioned: WorktreeProvision | undefined;
    if (wtNames !== null) {
      const mainRoot = mainRepoRoot(root);
      const registered = worktreeForBranch(mainRoot, wtNames.branch);
      let expected: string | null = null;
      try {
        expected = containedPath(mainRoot, wtNames.relPath);
      } catch {
        /* falls through to createWorktree, which throws the containment error */
      }
      // Realpath both sides: git reports canonical paths (macOS /var is a
      // symlink to /private/var) while config-derived paths may not be. The
      // probe itself must not throw past the rollback handler — a worktree
      // vanishing between existsSync and realpathSync would otherwise strand
      // the freshly installed lease (codex r2 P1): any probe failure means
      // "not reusable" and falls through to createWorktree's guarded path.
      let samePlace = false;
      try {
        samePlace =
          registered !== null &&
          expected !== null &&
          existsSync(expected) &&
          realpathSync(registered) === realpathSync(expected);
      } catch {
        samePlace = false;
      }
      // Reuse requires OUR OWN prior stamps, not just a matching layout: a
      // manually managed checkout that happens to sit at the deterministic
      // path must hit the collision refusal, never be adopted — a later green
      // close would remove a worktree we never created (codex r1 P2).
      const ourStamps =
        priorWt === wtNames.relPath && priorBranch === wtNames.branch;
      if (samePlace && expected !== null && ourStamps) {
        // Idempotent refresh: our branch already lives in the expected worktree.
        provisioned = { path: expected, relPath: wtNames.relPath, branch: wtNames.branch };
      } else {
        try {
          provisioned = createWorktree(config, root, { id: normalized, slug });
        } catch (err) {
          // Rollback may only delete the lease THIS claim installed: an
          // external writer (checkout hook, rival tool) can replace the
          // pathname while `worktree add` runs, and unlinking blind would
          // destroy the replacement (codex r4 P1). Same protocol as steal:
          // atomic move-aside, identity-check the quarantined bytes, only
          // then delete. A failed unlink is an INCOMPLETE rollback — the
          // stamped lease stays live, and saying "rolled back" would be a
          // lie (codex r1 P2). ENOENT counts as removed.
          let leaseRemoved = false;
          let leaseNote: string | null = null;
          let q: string | null = null;
          try {
            q = moveAside(leasePath);
          } catch (qErr) {
            if ((qErr as NodeJS.ErrnoException).code === 'ENOENT') {
              leaseRemoved = true;
            } else {
              leaseNote = `the installed lease could not be removed; delete ${leasePath} manually before re-claiming`;
            }
          }
          if (q !== null) {
            // Every post-rename failure must keep the quarantined file VISIBLE
            // (restored to the pathname or reported at its quarantine path) —
            // an unreadable replacement silently parked in .quarantine-* is
            // invisible to lock listing and a later claim would proceed over
            // it (codex r5 P2).
            let quarantinedBody: string | null = null;
            try {
              quarantinedBody = readFileSync(q, 'utf8');
            } catch {
              quarantinedBody = null;
            }
            if (quarantinedBody === leaseBody) {
              try {
                unlinkSync(q);
                leaseRemoved = true;
              } catch {
                leaseNote = `our lease copy was preserved at ${q} — delete manually`;
              }
            } else {
              try {
                moveNoReplace(q, leasePath);
                leaseNote = `${leasePath} was replaced by another writer mid-claim and was left in place — inspect before re-claiming`;
              } catch {
                leaseNote = `a replacement lease was preserved at ${q} (original path re-occupied) — inspect before re-claiming`;
              }
            }
          }
          const stranded = rollback();
          dropQuarantineDir();
          const msg = err instanceof Error ? err.message : String(err);
          return {
            ...base,
            globs,
            ok: false,
            issues: [
              leaseRemoved
                ? `claim rolled back: ${msg}`
                : `claim rollback INCOMPLETE: ${msg} — ${leaseNote ?? 'state unknown'}`,
              ...stranded,
            ],
          };
        }
      }
    }

    // Everything after here is cleanup and must never throw the claim into a
    // half-rolled-back state: failures are collected and REPORTED on the
    // successful result.
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
    dropQuarantineDir();

    return {
      ...base,
      ok: true,
      refreshed,
      leasePath,
      globs,
      conflicts: [],
      staleBlockers: [],
      stolen,
      ...(provisioned ? { worktree: provisioned } : {}),
      issues: warnings,
    };
  } catch (err) {
    // Exception path: stranded-rollback messages must not vanish with the
    // stack — they name real files needing manual attention.
    const stranded = rollback();
    dropQuarantineDir();
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
  const re = new RegExp(`^${escapeRegExp(prdKind.prefix)}-${escapeRegExp(num)}-(.+)\\.md$`);
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
