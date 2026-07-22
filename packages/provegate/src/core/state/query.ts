import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { WorkflowConfig } from '../config/index.js';
import { formatId } from './artifacts.js';
import { declaredGlobs } from './markdown.js';
import type { StateRecord } from './build.js';

/**
 * Queue/active/next semantics ported from the parent. Every status the logic
 * branches on comes from `config.statusVocab` — the source hardcoded these
 * sets, and re-hardcoding them was flagged as the likeliest port drift (W1).
 */

export function isImplemented(config: WorkflowConfig, record: StateRecord): boolean {
  if (config.statusVocab.implemented.includes(record.status)) return true;
  if (record.artifactStates.prd === 'completed') return true;
  if (record.artifactStates.summary && record.artifactStates.summary !== 'missing') return true;
  return false;
}

/** Highest implemented number, or null. Display-only — never a queue filter
 * (a serial high-water-mark masks out-of-order ready items). */
export function latestImplemented(config: WorkflowConfig, records: StateRecord[]): number | null {
  const numbers = records.filter((r) => isImplemented(config, r)).map((r) => r.number);
  return numbers.length > 0 ? Math.max(...numbers) : null;
}

/** Highest-numbered record with exactly `status`, formatted, or null. */
export function latestByStatus(
  config: WorkflowConfig,
  records: StateRecord[],
  status: string,
): string | null {
  const numbers = records.filter((r) => r.status === status).map((r) => r.number);
  return numbers.length > 0 ? formatId(config.idPattern, Math.max(...numbers)) : null;
}

/** The machine-derivable status panel cells: implemented count + latest
 * implemented id. Pinned formats — the panel gate and generator share this. */
export function statusPanelMetrics(
  config: WorkflowConfig,
  records: StateRecord[],
): Record<string, string> {
  const latest = latestImplemented(config, records);
  return {
    Implemented: String(records.filter((r) => isImplemented(config, r)).length),
    'Latest implemented': latest === null ? '—' : formatId(config.idPattern, latest),
  };
}

/**
 * Active = in-flight, not-yet-done work. Per-record done-check: a record
 * leaves the active set only when IT is implemented or deferred — never
 * because a higher number landed first.
 */
export function getActiveRecords(config: WorkflowConfig, records: StateRecord[]): StateRecord[] {
  return records.filter((record) => {
    if (isImplemented(config, record)) return false;
    if (record.artifactStates.prd === 'deferred') return false;
    if (record.status !== 'Unknown' && !config.statusVocab.active.includes(record.status)) {
      return false;
    }
    return Object.values(record.artifactStates).some((state) => state === config.dirs.states[0]);
  });
}

/** Ready-to-assign = ready-status or PASS verdict, unlocked, not implemented. */
export function getReadyRecords(
  config: WorkflowConfig,
  active: StateRecord[],
  lockedIds: Set<string> = new Set(),
): StateRecord[] {
  return active
    .filter(
      (record) =>
        config.statusVocab.ready.includes(record.status) || record.readiness.verdict === 'PASS',
    )
    .filter((record) => !lockedIds.has(record.prd))
    .filter((record) => !isImplemented(config, record))
    .sort((a, b) => (b.readiness.score ?? 0) - (a.readiness.score ?? 0) || a.number - b.number);
}

export function isResumable(record: StateRecord): boolean {
  return record.artifactStates.tasks !== 'missing' && record.task.uncheckedCount > 0;
}

export interface CompactRecord {
  prd: string;
  slug: string;
  status: string;
  cyclePhase: string | null;
  readinessVerdict: string | null;
  readinessScore: number | null;
  taskStatus: string;
  uncheckedTasks: number;
  operatorHandoffs: number;
  prdPath: string;
  taskPath: string;
}

export function formatCompactRecord(record: StateRecord): CompactRecord {
  return {
    prd: record.prd,
    slug: record.slug,
    status: record.status,
    cyclePhase: record.cyclePhase,
    readinessVerdict: record.readiness.verdict,
    readinessScore: record.readiness.score,
    taskStatus: record.task.status,
    uncheckedTasks: record.task.uncheckedCount,
    operatorHandoffs: record.task.operatorHandoffCount,
    prdPath: record.artifacts.prd,
    taskPath: record.artifacts.tasks,
  };
}

export interface QueueLockInfo {
  prd: string;
  agent: string;
  phase: string;
  worktree: string | null;
  expiresAt: string;
}

export interface QueueOverlapWarning {
  a: string;
  b: string;
  shared: string[];
}

export interface Queue {
  generatedAt: string | null;
  ready: (CompactRecord & { resume: boolean })[];
  readyOverlaps: QueueOverlapWarning[];
  inFlight: (Omit<QueueLockInfo, 'expiresAt'> & { stale: boolean })[];
  blocked: CompactRecord[];
  inReview: CompactRecord[];
}

/** READY candidates whose declared Conflict Surfaces overlap — do not schedule
 * together. Best-effort: skips records whose PRD file cannot be read. */
export function readyOverlaps(root: string, readyRecords: StateRecord[]): QueueOverlapWarning[] {
  const surfaces = readyRecords
    .map((record) => {
      try {
        return {
          prd: record.prd,
          paths: declaredGlobs(readFileSync(resolve(root, record.artifacts.prd), 'utf8')),
        };
      } catch {
        return { prd: record.prd, paths: [] as string[] };
      }
    })
    .filter((surface) => surface.paths.length > 0);
  const warnings: QueueOverlapWarning[] = [];
  for (let i = 0; i < surfaces.length; i += 1) {
    for (let j = i + 1; j < surfaces.length; j += 1) {
      const shared = surfaces[i]!.paths.filter((path) => surfaces[j]!.paths.includes(path));
      if (shared.length > 0) {
        warnings.push({ a: surfaces[i]!.prd, b: surfaces[j]!.prd, shared });
      }
    }
  }
  return warnings;
}

export function buildQueue(
  config: WorkflowConfig,
  root: string,
  records: StateRecord[],
  locks: QueueLockInfo[],
  { now = Date.now(), generatedAt = null }: { now?: number; generatedAt?: string | null } = {},
): Queue {
  const lockById = new Map(locks.map((lock) => [lock.prd, lock]));
  const lockedIds = new Set(lockById.keys());

  const active = getActiveRecords(config, records);
  const readyRecords = getReadyRecords(config, active, lockedIds);
  const ready = readyRecords.map((record) => ({
    ...formatCompactRecord(record),
    resume: isResumable(record),
  }));

  const inFlight = [...lockById.values()].map((lock) => ({
    prd: lock.prd,
    agent: lock.agent,
    phase: lock.phase,
    worktree: lock.worktree,
    stale: Date.parse(lock.expiresAt) < now,
  }));

  const blocked = active
    .filter(
      (record) =>
        config.statusVocab.blocked.includes(record.status) ||
        ['ITERATE', 'REJECT'].includes(record.readiness.verdict ?? '') ||
        record.artifactStates.tasks === 'missing',
    )
    .filter((record) => !lockedIds.has(record.prd))
    .map(formatCompactRecord);

  const inReview = records
    .filter((record) => config.statusVocab.reviewing.includes(record.status))
    .map(formatCompactRecord);

  return {
    generatedAt,
    ready,
    readyOverlaps: readyOverlaps(root, readyRecords),
    inFlight,
    blocked,
    inReview,
  };
}
