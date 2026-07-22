#!/usr/bin/env node
/**
 * Verifies _STATUS.md "Aktif Agent'lar" table matches the lock files in _state/locks/.
 *
 * Rules:
 *   - Every active (non-expired) lock with a PRD must have a row in _STATUS.md.
 *   - Every row in _STATUS.md must have a matching lock file.
 *   - Agent + phase columns must match the lock's `agent` / `phase`.
 *
 * Locks themselves are gitignored, so this check is meaningful primarily on
 * developer machines and in CI runners that materialize locks before the check.
 * On a fresh checkout with no locks, the table must be empty too.
 *
 * --ci mode (PRD-200 FR-6): CI runners have no locks, so lock-matching is
 * skipped entirely. Instead two structural checks run:
 *   (a) no "Aktif Agent'lar" row may have a Started date older than 7 days
 *       (stale claims must be released with `pnpm prd:stop`);
 *   (b) on PRs whose base branch is main or staging the table must be
 *       empty — promotion PRs cannot carry active agent claims.
 *       GITHUB_BASE_REF is only populated on pull_request events; on
 *       push/cron runs check (b) is skipped gracefully.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { findMarkdownTable, mainRepoRoot } from "./prd-state-utils.mjs";
import { locksDir } from "./prd-locks.mjs";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");
const LOCK_DIR = locksDir();
const STATUS_PATH = resolve(mainRepoRoot(), "_STATUS.md");
const TABLE_CELLS = ["Agent", "PRD", "Phase", "Started"];

function fail(message, details = []) {
  process.stderr.write(`${message}\n`);
  for (const d of details) process.stderr.write(`  - ${d}\n`);
  process.exit(1);
}

function ok(message) {
  process.stdout.write(`${message}\n`);
}

function loadLocks() {
  if (!existsSync(LOCK_DIR)) return [];
  const now = Date.now();
  return readdirSync(LOCK_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const path = resolve(LOCK_DIR, name);
      try {
        const data = JSON.parse(readFileSync(path, "utf8"));
        return { name, path, data, stale: Date.parse(data.expiresAt) < now };
      } catch (error) {
        return { name, path, error: error.message };
      }
    });
}

function loadStatusRows() {
  if (!existsSync(STATUS_PATH)) fail("[verify:status-sync] _STATUS.md missing");
  const content = readFileSync(STATUS_PATH, "utf8");
  const table = findMarkdownTable(content, TABLE_CELLS);
  if (!table) {
    fail("[verify:status-sync] _STATUS.md missing Aktif Agent'lar table", [
      `expected header cells: ${TABLE_CELLS.join(" | ")}`,
    ]);
  }
  const block = content.slice(table.afterSep, table.rowsEnd);
  const rows = [];
  for (const raw of block.split("\n")) {
    const line = raw.trim();
    if (!line || !line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 4) continue;
    const [agent, prd, phase, started] = cells;
    rows.push({ agent, prd, phase, started, raw });
  }
  return rows;
}

const ciMode = process.argv.includes("--ci");

if (ciMode) {
  const rows = loadStatusRows();
  const issues = [];
  const STALE_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const row of rows) {
    // Tolerate markdown decoration around the date (review-200 P3:
    // `**2026-06-11**` must not read as unparseable).
    const started = Date.parse(row.started.replace(/[*_`]/g, "").trim());
    if (Number.isNaN(started)) {
      issues.push(`${row.prd}: Started cell "${row.started}" is not a parseable date`);
    } else if (now - started > STALE_MS) {
      issues.push(
        `${row.prd}: claim started ${row.started} is older than 7 days — release it (\`pnpm prd:stop ${row.prd}\`) or re-claim`,
      );
    }
  }

  const baseRef = process.env.GITHUB_BASE_REF ?? "";
  if (["main", "staging"].includes(baseRef) && rows.length > 0) {
    issues.push(
      `PRs into ${baseRef} must not carry active agent claims — _STATUS.md Aktif Agent'lar has ${rows.length} row(s)`,
    );
  }

  if (issues.length > 0) {
    fail("[verify:status-sync] --ci checks failed", issues);
  }
  ok(
    `[verify:status-sync] ok (--ci) - ${rows.length} row(s), none stale${baseRef ? `, base ${baseRef}` : ""}`,
  );
  process.exit(0);
}

const locks = loadLocks();
const rows = loadStatusRows();
const issues = [];

for (const lock of locks) {
  if (lock.error) {
    issues.push(`lock ${lock.name} unreadable: ${lock.error}`);
    continue;
  }
  if (lock.stale) continue;
  const prd = lock.data.prd;
  const row = rows.find((r) => r.prd === prd);
  if (!row) {
    issues.push(`lock ${lock.name} (${prd}) has no row in _STATUS.md Aktif Agent'lar`);
    continue;
  }
  if (row.agent !== lock.data.agent) {
    issues.push(`${prd}: _STATUS.md agent='${row.agent}' but lock agent='${lock.data.agent}'`);
  }
  if (row.phase !== lock.data.phase) {
    issues.push(`${prd}: _STATUS.md phase='${row.phase}' but lock phase='${lock.data.phase}'`);
  }
}

const activePrds = new Set(locks.filter((l) => !l.stale && !l.error).map((l) => l.data.prd));
for (const row of rows) {
  if (!activePrds.has(row.prd)) {
    issues.push(`_STATUS.md row ${row.prd} has no matching lock in _state/locks/ (run \`pnpm prd:stop ${row.prd}\` or claim it via \`pnpm prd:start\`)`);
  }
}

if (issues.length > 0) {
  fail("[verify:status-sync] drift between _STATUS.md Aktif Agent'lar and _state/locks/", issues);
}

ok(`[verify:status-sync] ok - ${rows.length} status row(s) match ${activePrds.size} active lock(s)`);
