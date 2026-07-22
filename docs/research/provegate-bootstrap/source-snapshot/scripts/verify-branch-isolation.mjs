#!/usr/bin/env node
/**
 * verify:branch-isolation — execution phases must run in an isolated worktree.
 *
 * The sanctioned flow is `pnpm prd:start PRD-XXX`, which creates a git worktree
 * at .worktrees/prd-XXX-{slug} on branch feat/prd-XXX-{slug}. Execution and
 * review phases (where code is written) MUST stay on that isolated branch so
 * that parallel agents — including a second session driving Claude Desktop —
 * never share one base-branch working tree and step on each other.
 *
 * This gate fails when an ACTIVE lock for an execution phase either:
 *   - has no `worktree` field (a hand-written / `--no-worktree` lock), or
 *   - points `branch` at a protected base branch instead of feat/prd-*.
 *
 * Pre-existing in-flight locks created before this guard landed are
 * grandfathered via GRANDFATHERED below; remove the entry once that PRD ships.
 */
import { listLockFiles } from "./prd-locks.mjs";
import { EXECUTION_PHASES, fail, ok } from "./prd-state-utils.mjs";

// EXECUTION_PHASES (phases that write code; Phase 1/2 are doc-only) is the shared
// source of truth in prd-state-utils — imported here, in prd-worktree, and in
// verify-path-conflicts so the set never drifts (PRD-312 FR-1f).

const PROTECTED_BRANCHES = new Set(["development", "main", "master", "staging"]);

// Locks that predate this guard and are allowed to finish as-is. Each entry is
// a lockId. Drop the entry when the PRD lands (the lock is removed on prd:stop
// / archival anyway). Do NOT add new entries — fix the lock with prd:start.
const GRANDFATHERED = new Set([
  // PRD-244 school-types SSOT — manual lock, in-flight on development when the
  // isolation guard landed (2026-06-16). Finishes on development; remove on ship.
  "prd-244-school-types-ssot-manual",
]);

function readLocks() {
  return listLockFiles()
    .filter((lock) => lock.data)
    .map((lock) => ({ entry: lock.name, data: lock.data }));
}

const now = Date.now();
const issues = [];

for (const lock of readLocks()) {
  const data = lock.data;
  const expiresAt = Date.parse(data.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt < now) continue; // stale — verify:agent-locks owns that
  if (!EXECUTION_PHASES.has(data.phase)) continue;
  if (GRANDFATHERED.has(data.lockId)) continue;

  if (!data.worktree) {
    issues.push(
      `${lock.entry}: ${data.prd} is in ${data.phase} but has no worktree — start it with \`pnpm prd:start ${data.prd}\` instead of a hand-written lock`,
    );
    continue;
  }
  if (typeof data.branch === "string" && PROTECTED_BRANCHES.has(data.branch)) {
    issues.push(
      `${lock.entry}: ${data.prd} (${data.phase}) is pinned to base branch "${data.branch}" — execution must run on feat/${data.prd.toLowerCase()}-*`,
    );
  } else if (typeof data.branch === "string" && !data.branch.startsWith("feat/")) {
    issues.push(
      `${lock.entry}: ${data.prd} (${data.phase}) branch "${data.branch}" is not a feat/prd-* branch`,
    );
  }
}

if (issues.length > 0) {
  fail("[verify:branch-isolation] execution phase not isolated to a feat worktree", issues);
}

ok("[verify:branch-isolation] ok - all active execution-phase locks run in an isolated feat worktree");
