import { readdirSync, unlinkSync, writeFileSync } from 'node:fs';
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
  type PathConflict,
  type SurfacedLock,
} from '../locks/index.js';

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

function parseLocks(config: WorkflowConfig, root: string, now: Date): ParsedLock[] {
  const parsed: ParsedLock[] = [];
  for (const entry of listLockFiles(config, root)) {
    if (!entry.data) continue; // corrupt leases fail loud in gate check, not here
    const d = entry.data;
    const expiresAt = String(d['expiresAt'] ?? '');
    const expiry = Date.parse(expiresAt);
    const globs = Array.isArray(d['ownedPaths'])
      ? (d['ownedPaths'] as string[])
      : Array.isArray(d['touchedFiles'])
        ? (d['touchedFiles'] as string[])
        : [];
    parsed.push({
      file: entry.path,
      prd: String(d['prd'] ?? ''),
      agent: String(d['agent'] ?? 'unknown'),
      phase: String(d['phase'] ?? ''),
      expiresAt,
      stale: !Number.isFinite(expiry) || expiry < now.getTime(),
      surfaced: {
        prd: String(d['prd'] ?? ''),
        phase: String(d['phase'] ?? ''),
        ownedPaths: globs,
      },
    });
  }
  return parsed;
}

export function claimPrd(
  config: WorkflowConfig,
  root: string,
  id: string,
  { steal = false, agent = 'cli', leaseHours = DEFAULT_LEASE_HOURS, now = new Date() }: ClaimOptions = {},
): ClaimResult {
  const normalized = id.toUpperCase();
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

  const locks = parseLocks(config, root, now);
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

  // Clear (or stealing stale blockers): write/refresh the lease.
  const stolen: StolenLease[] = [];
  if (steal) {
    for (const l of staleBlockers) {
      unlinkSync(l.file);
      stolen.push(asStolen(l));
    }
  }

  const slug = slugOf(config, root, normalized);
  ensureLocksDir(locksDir(config, root));
  const leasePath = lockPathFor(config, root, normalized, slug);
  const lease = {
    schemaVersion: 2,
    lockId: `${normalized.toLowerCase()}-${slug}`,
    agent,
    prd: normalized,
    phase: candidate.phase,
    startedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + leaseHours * 3_600_000).toISOString(),
    touchedFiles: globs,
    ownedPaths: globs,
  };
  const refreshed = self.length > 0;
  writeFileSync(leasePath, `${JSON.stringify(lease, null, 2)}\n`);
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
