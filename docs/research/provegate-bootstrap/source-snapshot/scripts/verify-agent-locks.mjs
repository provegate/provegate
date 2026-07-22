#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { locksDir } from "./prd-locks.mjs";
import { fail, ok, readText, validateOwnedPaths } from "./prd-state-utils.mjs";

const LOCK_DIR = locksDir();

function readLocks() {
  if (!existsSync(LOCK_DIR)) return [];
  return readdirSync(LOCK_DIR)
    .filter((entry) => entry.endsWith(".json"))
    .sort()
    .map((entry) => {
      const path = resolve(LOCK_DIR, entry);
      return { path, entry, data: JSON.parse(readText(path)) };
    });
}

const now = Date.now();
const locks = readLocks();
const issues = [];

for (const lock of locks) {
  const data = lock.data;
  for (const field of ["schemaVersion", "lockId", "agent", "prd", "phase", "startedAt", "expiresAt", "touchedFiles"]) {
    if (data[field] === undefined) issues.push(`${lock.entry}: missing ${field}`);
  }
  if (!Array.isArray(data.touchedFiles) || data.touchedFiles.length === 0) {
    issues.push(`${lock.entry}: touchedFiles must be a non-empty array`);
  }
  if (data.schemaVersion !== undefined && data.schemaVersion !== 1 && data.schemaVersion !== 2) {
    issues.push(`${lock.entry}: schemaVersion must be 1 or 2 (got ${data.schemaVersion})`);
  }
  if (data.worktree !== undefined) {
    if (typeof data.worktree !== "string" || data.worktree.length === 0) {
      issues.push(`${lock.entry}: worktree must be a non-empty string when set`);
    } else if (!data.worktree.startsWith(".worktrees/")) {
      issues.push(`${lock.entry}: worktree must live under .worktrees/ (got ${data.worktree})`);
    }
  }
  if (data.branch !== undefined && (typeof data.branch !== "string" || data.branch.length === 0)) {
    issues.push(`${lock.entry}: branch must be a non-empty string when set`);
  }
  // PRD-312 FR-1b — ownedPaths is the path-conflict surface; the real shape gate
  // (no ajv loads the schema). Malformed surfaces fail here, not in the overlap gate.
  for (const issue of validateOwnedPaths(data)) {
    issues.push(`${lock.entry}: ${issue}`);
  }
  const expiresAt = Date.parse(data.expiresAt);
  if (!Number.isFinite(expiresAt)) {
    issues.push(`${lock.entry}: expiresAt is not a valid date-time`);
  } else if (expiresAt < now) {
    const ageMinutes = Math.round((now - expiresAt) / 60_000);
    issues.push(`${lock.entry}: stale lock expired ${ageMinutes} minute(s) ago; remove or renew it`);
  }
}

const active = locks.filter((lock) => Date.parse(lock.data.expiresAt) >= now);
for (let i = 0; i < active.length; i += 1) {
  for (let j = i + 1; j < active.length; j += 1) {
    const a = active[i];
    const b = active[j];
    const aFiles = new Set(a.data.touchedFiles ?? []);
    const overlap = (b.data.touchedFiles ?? []).filter((file) => aFiles.has(file));
    if (overlap.length > 0) {
      issues.push(`${a.entry} conflicts with ${b.entry}: ${overlap.join(", ")}`);
    }
  }
}

if (issues.length > 0) {
  fail("[verify:agent-locks] lock issues detected", issues);
}

ok(`[verify:agent-locks] ok - ${locks.length} lock file(s) checked`);
