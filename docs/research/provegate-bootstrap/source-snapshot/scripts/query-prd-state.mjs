#!/usr/bin/env node
import { resolve } from "node:path";
import { listLockFiles } from "./prd-locks.mjs";
import {
  REPO_ROOT,
  declaredGlobs,
  fail,
  isImplemented,
  latestImplemented,
  ok,
  readCurrentState,
  readText,
} from "./prd-state-utils.mjs";

const ACTIVE_STATUSES = new Set(["Draft", "In Review", "Approved", "In Progress", "Blocked"]);

function usage() {
  return [
    "Usage:",
    "  pnpm state:prd -- PRD-176",
    "  pnpm state:index",
    "  pnpm state:active",
    "  pnpm state:next",
    "  pnpm state:queue [--json]   (alias: prd:queue)",
  ].join("\n");
}

/**
 * Active = not-yet-done in-flight PRDs. PRD-312 FR-2 replaced the serial
 * high-water-mark (`number <= latestImplemented`, which masked a ready
 * lower-numbered PRD when a higher one landed out of order) with a PER-RECORD
 * done-check: a PRD leaves the active set only when IT is implemented or
 * deferred. The wip-liveness + ACTIVE_STATUSES guards are preserved.
 */
export function getActiveRecords(records) {
  return records.filter((record) => {
    if (isImplemented(record)) return false;
    if (record.artifactStates.prd === "deferred") return false;
    if (record.status !== "Unknown" && !ACTIVE_STATUSES.has(record.status)) return false;
    return Object.values(record.artifactStates).some((state) => state === "wip");
  });
}

/**
 * Ready-to-assign = Approved/PASS, unlocked, not implemented. Runs on the
 * deferred-excluded active set (so a Deferred PRD never leaks in). The resume
 * flag (has unchecked wip tasks) is reported by the queue, not gated here — it
 * distinguishes pre-task PRDs from mid-execution ones (PRD-312 FR-2c).
 */
export function getReadyRecords(active, lockedPrds = new Set()) {
  return active
    .filter((record) => record.status === "Approved" || record.readiness.verdict === "PASS")
    .filter((record) => !lockedPrds.has(record.prd))
    .filter((record) => !isImplemented(record))
    .sort((a, b) => (b.readiness.score ?? 0) - (a.readiness.score ?? 0) || a.number - b.number);
}

function isResumable(record) {
  return record.artifactStates.tasks !== "missing" && record.task.uncheckedCount > 0;
}

function formatRecord(record) {
  return {
    prd: record.prd,
    number: record.number,
    slug: record.slug,
    status: record.status,
    cyclePhase: record.cyclePhase,
    artifacts: record.artifacts,
    artifactStates: record.artifactStates,
    readiness: record.readiness,
    task: record.task,
    summary: record.summary,
    lastUpdated: record.lastUpdated,
  };
}

function formatCompactRecord(record) {
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

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

/** READY candidates whose declared `## Conflict Surface` globs overlap — the
 * orchestrator should not schedule these together. Best-effort: skips PRDs whose
 * file can't be read. */
function readyOverlaps(readyRecords) {
  const surfaces = readyRecords
    .map((record) => {
      try {
        return { prd: record.prd, paths: declaredGlobs(readText(resolve(REPO_ROOT, record.artifacts.prd))) };
      } catch {
        return { prd: record.prd, paths: [] };
      }
    })
    .filter((surface) => surface.paths.length > 0);
  const warnings = [];
  for (let i = 0; i < surfaces.length; i += 1) {
    for (let j = i + 1; j < surfaces.length; j += 1) {
      const shared = surfaces[i].paths.filter((path) => surfaces[j].paths.includes(path));
      if (shared.length > 0) {
        warnings.push({ a: surfaces[i].prd, b: surfaces[j].prd, shared });
      }
    }
  }
  return warnings;
}

function buildQueue(records) {
  const now = Date.now();
  const locks = listLockFiles().filter((lock) => lock.data);
  const lockByPrd = new Map(locks.map((lock) => [lock.data.prd, lock.data]));
  const lockedPrds = new Set(lockByPrd.keys());

  const active = getActiveRecords(records);
  const readyRecords = getReadyRecords(active, lockedPrds);
  const ready = readyRecords.map((record) => ({
    ...formatCompactRecord(record),
    resume: isResumable(record),
  }));

  const inFlight = [...lockByPrd.entries()].map(([prd, lock]) => ({
    prd,
    agent: lock.agent,
    phase: lock.phase,
    worktree: lock.worktree ?? null,
    stale: Date.parse(lock.expiresAt) < now,
  }));

  const blocked = active
    .filter(
      (record) =>
        record.status === "Blocked" ||
        ["ITERATE", "REJECT"].includes(record.readiness.verdict) ||
        record.artifactStates.tasks === "missing",
    )
    .filter((record) => !lockedPrds.has(record.prd))
    .map(formatCompactRecord);

  const inReview = records
    .filter((record) => ["Code Complete", "Operator Verification"].includes(record.status))
    .map(formatCompactRecord);

  return {
    generatedAt: readCurrentState()?.generatedAt ?? null,
    ready,
    readyOverlaps: readyOverlaps(readyRecords),
    inFlight,
    blocked,
    inReview,
  };
}

function renderQueue(queue) {
  const lines = [];
  const push = (title, rows, fmt) => {
    lines.push(`\n${title} (${rows.length})`);
    for (const row of rows) lines.push(`  ${fmt(row)}`);
  };
  push("READY", queue.ready, (r) => `${r.prd}  ${r.status}/${r.readinessVerdict ?? "-"} score=${r.readinessScore ?? "-"} tasks=${r.uncheckedTasks}${r.resume ? " [resume]" : ""}  ${r.slug}`);
  if (queue.readyOverlaps.length > 0) {
    lines.push("  ⚠ overlap (do not run together):");
    for (const w of queue.readyOverlaps) lines.push(`    ${w.a} ↔ ${w.b}: ${w.shared.join(", ")}`);
  }
  push("IN-FLIGHT", queue.inFlight, (r) => `${r.prd}  agent=${r.agent} ${r.phase}${r.stale ? " [STALE]" : ""}${r.worktree ? ` ${r.worktree}` : ""}`);
  push("BLOCKED", queue.blocked, (r) => `${r.prd}  ${r.status}/${r.readinessVerdict ?? "-"}  ${r.slug}`);
  push("IN-REVIEW", queue.inReview, (r) => `${r.prd}  ${r.status}  ${r.slug}`);
  return lines.join("\n");
}

function main() {
  const state = readCurrentState();
  if (!state) {
    fail("[state:query] missing _state/prds.json", ["Run `pnpm state:sync` first."]);
  }

  const args = process.argv.slice(2).filter((value) => value !== "--");
  const [command = "help", arg] = args;
  const records = state.records;
  const implemented = records.filter(isImplemented);
  const latest = latestImplemented(records);
  const active = getActiveRecords(records);

  if (command === "prd") {
    if (!arg) fail("[state:prd] missing PRD id or number", [usage()]);
    const normalized = arg.toUpperCase().startsWith("PRD-")
      ? arg.toUpperCase()
      : `PRD-${String(Number.parseInt(arg, 10)).padStart(3, "0")}`;
    const record = records.find((candidate) => candidate.prd === normalized);
    if (!record) fail(`[state:prd] ${normalized} not found`);
    printJson(formatRecord(record));
  } else if (command === "index") {
    printJson({
      schemaVersion: state.schemaVersion,
      generatedAt: state.generatedAt,
      totalRecords: records.length,
      implementedCount: implemented.length,
      latestImplemented: latest === null ? null : `PRD-${String(latest).padStart(3, "0")}`,
      activeCount: active.length,
      active: active.map(formatCompactRecord),
    });
  } else if (command === "active") {
    printJson(active.map(formatCompactRecord));
  } else if (command === "next") {
    const lockedPrds = new Set(listLockFiles().map((lock) => lock.data?.prd).filter(Boolean));
    printJson(getReadyRecords(active, lockedPrds).map(formatCompactRecord));
  } else if (command === "queue") {
    const queue = buildQueue(records);
    if (args.includes("--json")) printJson(queue);
    else ok(renderQueue(queue));
  } else if (command === "help" || command === "--help" || command === "-h") {
    ok(usage());
  } else {
    fail(`[state:query] unknown command: ${command}`, [usage()]);
  }
}

if (process.argv[1]?.endsWith("query-prd-state.mjs")) main();
