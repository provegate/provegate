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
import { basename, join, relative, resolve, sep } from 'node:path';
import { CONFIG_FILENAME, configSourceFor, type WorkflowConfig } from '../config/index.js';
import { MANIFEST_FILENAME, loadManifest, manifestSourceFor } from '../gates/manifest.js';
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
  blobShaOfBuffer,
  blobShaOfFile,
  createWorktree,
  existsOnRef,
  removeWorktree,
  resolveRef,
  snapshotsMissingFrom,
  snapshotsNotMatchingRef,
  type ArtifactSnapshot,
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

/** The workspace-mutex path every lock-domain mutation serializes on —
 * exported so post-merge worktree cleanup can hold the SAME mutex and
 * revalidate the lease before deleting anything (codex r13 P1). */
export function claimMutexPath(config: WorkflowConfig, root: string): string {
  return resolve(containedPath(mainRepoRoot(root), config.dirs.locksDir), '.gate-open.mutex');
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
  return withWorkspaceMutex(claimMutexPath(config, root), () =>
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

  // Preconditions BEFORE any mutation: slug + containment + destination
  // resolution happen while every victim still sits untouched on disk — an
  // exception past this point can no longer follow destroyed leases.
  const found = prdFile(config, root, normalized);
  const { slug } = found;
  // Path and root come from the file candidateFromPrd ACTUALLY parsed when it
  // reported one — parsing one checkout's copy and validating another's is
  // the defect this closes (codex r21 P1).
  const prdRoot = candidate.sourcePath !== undefined ? mainRepoRoot(root) : found.dir;
  const prdRelPath =
    candidate.sourcePath !== undefined
      ? relative(mainRepoRoot(root), candidate.sourcePath).split(sep).join('/')
      : found.relPath;
  // Artifacts a provisioned checkout must carry: the PRD itself plus the
  // CONTROL files that decide what runs there — config drives layout, the
  // gates manifest decides policy (a missing manifest silently falls back to
  // built-in defaults, changing the gates the agent runs, codex r16 P1).
  // Presence is compared against the base too: a control file DELETED in the
  // working tree but still committed would otherwise drop out of the list,
  // and the provisioned checkout would silently restore policy the source
  // checkout no longer has (codex r17 P1).
  const mainForRefs = mainRepoRoot(root);
  // ONE pinned revision for every comparison in this claim: presence checks,
  // the checkout's contents, and branch creation must all name the same base
  // commit, or a concurrent base advance desynchronizes lease and tree
  // (codex r19 P1). Null (no git / no base) simply skips worktree work.
  const baseRefName = !worktree
    ? `refs/heads/${config.branches.base}`
    : (resolveRef(mainForRefs, `refs/heads/${config.branches.base}`) ??
      `refs/heads/${config.branches.base}`);
  // Snapshot the bytes this claim actually parses: validation compares THESE
  // against the base, so an edit between parse and check cannot slip through
  // (codex r20 P1). A control file absent locally but committed on base gets
  // a null snapshot — a deletion is a mismatch, not an omission (r17 P1).
  // The PRD entry hashes the EXACT buffer candidateFromPrd parsed, so the
  // lease's globs and the validated bytes can never come from different
  // reads — or different checkouts (codex r21 P1).
  // The manifest's parse-time bytes only exist once something loaded it —
  // and the `gate open` process never does. Load it HERE for worktree claims
  // so its provenance is real rather than a later re-read (codex r25 P1); a
  // manifest we cannot load makes gate policy unknowable, so fail closed.
  if (worktree) {
    try {
      loadManifest(config, root);
    } catch (error) {
      return {
        ...base,
        ok: false,
        issues: [
          `cannot verify gate policy for a worktree claim: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`,
        ],
      };
    }
  }
  // Provenance hashing is WORKTREE-ONLY work: `git hash-object --path` can
  // execute path-based clean filters, and a plain claim must stay free of
  // side effects it never needed (codex r27 P2).
  const requiredArtifacts: ArtifactSnapshot[] = !worktree
    ? []
    : [
        {
          rel: prdRelPath,
          sha:
            candidate.sourceContent !== undefined
              ? blobShaOfBuffer(prdRoot, prdRelPath, candidate.sourceContent)
              : blobShaOfFile(prdRoot, prdRelPath),
          content: candidate.sourceContent,
        },
      ];
  for (const control of worktree ? [CONFIG_FILENAME, MANIFEST_FILENAME] : []) {
    if (existsSync(resolve(root, control)) || existsOnRef(mainForRefs, baseRefName, control)) {
      // Control files get the same provenance binding as the PRD: hash the
      // bytes the loader actually parsed, so restoring a file after parsing
      // cannot validate committed content while the claim runs on an
      // uncommitted layout or gate policy (codex r22/r24 P1).
      const parsedSource =
        control === CONFIG_FILENAME ? configSourceFor(root) : manifestSourceFor(root);
      requiredArtifacts.push({
        rel: control,
        sha:
          parsedSource !== null
            ? blobShaOfBuffer(root, control, parsedSource)
            : blobShaOfFile(root, control),
        ...(parsedSource !== null ? { content: parsedSource } : {}),
      });
    }
  }

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
    // Stamps carry from ANY self lease, PREFERRING a stamped one: the
    // canonical-destination lease may be unstamped (legacy, superseded-era)
    // while another self lease holds the only cleanup metadata (codex r9+r10
    // P2). A PRD renamed to a new slug derives a new leasePath; the old
    // stamped lease is superseded below.
    // Among several self leases the NEWEST install is the live claim — file
    // order must not resurrect a superseded lease's stale worktree/branch and
    // rewrite the canonical lease to it (codex r23 P1, same rule cleanup uses).
    const newestSelf =
      self.length > 0
        ? [...self].sort(
            (a, b) =>
              (Date.parse(String(b.snapshot['startedAt'] ?? '')) || 0) -
              (Date.parse(String(a.snapshot['startedAt'] ?? '')) || 0),
          )[0]
        : undefined;
    const stampSource = newestSelf ?? selfAtDestination;
    const priorWt = stampSource?.snapshot['worktree'];
    const priorBranch = stampSource?.snapshot['branch'];
    // Stamps are a PAIR. A lease carrying only one of them has damaged
    // worktree metadata: silently refreshing it into a fully unstamped lease
    // would launder the damage past `gate run`'s malformed-stamp guard and
    // let a later close merge an unrelated branch (codex r28 P1).
    if ((typeof priorWt === 'string') !== (typeof priorBranch === 'string')) {
      // `--steal` may already have quarantined stale blockers: returning
      // without restoring them would refuse the claim while silently freeing
      // their surface for overlapping work (codex r29 P1).
      const stranded = rollback();
      dropQuarantineDir();
      return {
        ...base,
        globs,
        ok: false,
        issues: [
          `existing lease ${stampSource?.file ?? '(unknown)'} stamps only ${typeof priorWt === 'string' ? 'worktree' : 'branch'} — worktree metadata is incomplete; repair or delete it before re-claiming`,
          ...stranded,
        ],
      };
    }
    // `--worktree` on a PRD that ALREADY has a stamped checkout reuses that
    // checkout — deriving fresh names after a slug/pattern change would
    // provision a second tree and orphan the first with its work (codex r10
    // P2).
    const priorStamps =
      typeof priorWt === 'string' && typeof priorBranch === 'string'
        ? { relPath: priorWt, branch: priorBranch }
        : null;
    const wtNames = worktree
      ? (priorStamps ?? worktreeNamesFor(config, normalized, slug))
      : null;
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
    /**
     * Undo the lease THIS claim installed, then restore quarantined victims.
     * Only our own bytes may be deleted: an external writer (checkout hook,
     * rival tool) can replace the pathname while provisioning runs, and
     * unlinking blind would destroy the replacement (codex r4 P1). Same
     * protocol as steal — atomic move-aside, identity-check, then delete.
     * Every post-rename failure keeps the quarantined file VISIBLE (codex r5
     * P2), and an incomplete removal is REPORTED, never called a rollback
     * (codex r1 P2). Returns issue lines naming whatever remains.
     */
    const rollbackInstalledLease = (): string[] => {
      const notes: string[] = [];
      let q: string | null = null;
      try {
        q = moveAside(leasePath);
      } catch (qErr) {
        if ((qErr as NodeJS.ErrnoException).code !== 'ENOENT') {
          notes.push(
            `the installed lease could not be removed; delete ${leasePath} manually before re-claiming`,
          );
        }
      }
      if (q !== null) {
        let quarantinedBody: string | null;
        try {
          quarantinedBody = readFileSync(q, 'utf8');
        } catch {
          quarantinedBody = null;
        }
        if (quarantinedBody === leaseBody) {
          try {
            unlinkSync(q);
          } catch {
            notes.push(`our lease copy was preserved at ${q} — delete manually`);
          }
        } else {
          try {
            moveNoReplace(q, leasePath);
            notes.push(
              `${leasePath} was replaced by another writer mid-claim and was left in place — inspect before re-claiming`,
            );
          } catch {
            notes.push(
              `a replacement lease was preserved at ${q} (original path re-occupied) — inspect before re-claiming`,
            );
          }
        }
      }
      notes.push(...rollback());
      dropQuarantineDir();
      return notes;
    };

    let provisioned: WorktreeProvision | undefined;
    let weCreatedCheckout = false;
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
      const reusable = samePlace && expected !== null && ourStamps;
      // Reuse must also prove the checkout is CURRENT: base may have moved
      // since the first claim, and a refreshed lease protecting the new PRD
      // surface while the tree still holds the old PRD and gate policy is the
      // same defect as provisioning stale (codex r17 P1).
      // Reuse validates the CHECKOUT and the caller's own tree: a refresh
      // launched from a linked worktree with edited control files would
      // otherwise build the lease from the caller's config while returning a
      // checkout on base policy (codex r19 P1).
      const reuseStale = reusable
        ? [
            // The parsed bytes must be what base carries…
            ...snapshotsNotMatchingRef(mainRoot, baseRefName, requiredArtifacts),
            // …and what the reused checkout actually holds, text included
            // (blob equality alone is not proof, codex r24 P1).
            ...snapshotsMissingFrom(expected!, requiredArtifacts),
          ].filter((rel, i, all) => all.indexOf(rel) === i)
        : [];
      if (reusable && reuseStale.length > 0) {
        const notes = rollbackInstalledLease();
        return {
          ...base,
          globs,
          ok: false,
          issues: [
            `claim rolled back: the checkout at ${wtNames.relPath} carries workflow artifacts differing from '${config.branches.base}' (${reuseStale.join(', ')}) — merge or rebase ${config.branches.base} into ${wtNames.branch} first`,
            ...notes,
          ],
        };
      }
      if (reusable) {
        // Idempotent refresh: our branch already lives in the expected worktree.
        provisioned = { path: expected!, relPath: wtNames.relPath, branch: wtNames.branch };
      } else {
        weCreatedCheckout = true;
        try {
          // Provision under the SAME names the lease body carries — with
          // prior stamps this recreates the stamped checkout, never a
          // second one under a renamed slug (codex r11 P2). Prior stamps —
          // and ONLY prior stamps — also authorize reattaching a surviving
          // branch of that name (codex r12 P2).
          provisioned = createWorktree(config, root, {
            id: normalized,
            slug,
            names: wtNames,
            reattachOwned: priorStamps !== null,
            requireOnBase: requiredArtifacts,
            baseSha: baseRefName,
          });
        } catch (err) {
          const notes = rollbackInstalledLease();
          const msg = err instanceof Error ? err.message : String(err);
          return {
            ...base,
            globs,
            ok: false,
            issues: [
              notes.length === 0
                ? `claim rolled back: ${msg}`
                : `claim rollback INCOMPLETE: ${msg}`,
              ...notes,
            ],
          };
        }
      }
    }

    // Provisioning ran arbitrary user code (checkout hooks) while our lease
    // sat installed. Before committing, prove the lease at the destination is
    // STILL ours byte-for-byte: a hook that replaced or removed it would
    // leave the checkout unprotected and admit an overlapping claim (codex
    // r14 P1). Our own checkout is torn down; a reused one is left alone.
    if (provisioned !== undefined) {
      let stillOurs = false;
      try {
        stillOurs = readFileSync(leasePath, 'utf8') === leaseBody;
      } catch {
        stillOurs = false;
      }
      if (!stillOurs) {
        const issues = [
          `claim aborted: ${leasePath} was replaced or removed while the checkout was provisioned — inspect it before re-claiming`,
        ];
        if (weCreatedCheckout) {
          const undo = removeWorktree(config, root, {
            worktree: provisioned.relPath,
            branch: provisioned.branch,
          });
          issues.push(
            undo.removed
              ? `the checkout we created at ${provisioned.relPath} was removed`
              : `the checkout we created at ${provisioned.relPath} could NOT be removed — clean up manually`,
            ...undo.warnings,
          );
        }
        const stranded = rollback();
        dropQuarantineDir();
        return { ...base, globs, ok: false, issues: [...issues, ...stranded] };
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

/** The PRD's slug, repo-relative path, and the checkout it was found in.
 * Artifacts may live only on the main checkout while the claim runs from a
 * linked worktree — the same fallback `candidateFromPrd` uses. */
function prdFile(
  config: WorkflowConfig,
  root: string,
  id: string,
): { slug: string; relPath: string; dir: string } {
  const prdKind = config.dirs.artifacts.prd;
  const num = id.slice(config.idPattern.prefix.length + 1);
  const re = new RegExp(`^${escapeRegExp(prdKind.prefix)}-${escapeRegExp(num)}-(.+)\\.md$`);
  const searchRoots = [resolve(root)];
  const mainRoot = mainRepoRoot(root);
  if (!searchRoots.includes(mainRoot)) searchRoots.push(mainRoot);
  for (const searchRoot of searchRoots) {
    for (const state of config.dirs.states) {
      let names: string[];
      try {
        names = readdirSync(resolve(searchRoot, prdKind.dir, state));
      } catch {
        continue;
      }
      for (const name of names) {
        const m = re.exec(name);
        if (m) {
          return { slug: m[1]!, relPath: `${prdKind.dir}/${state}/${name}`, dir: searchRoot };
        }
      }
    }
  }
  throw new Error(`no PRD file found for ${id} while deriving slug`);
}
