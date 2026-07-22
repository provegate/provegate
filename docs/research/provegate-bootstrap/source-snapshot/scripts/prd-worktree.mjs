#!/usr/bin/env node
/**
 * PRD worktree + lock + status manager.
 *
 *   pnpm prd:start  PRD-157 [--phase "Phase 3"] [--agent name] [--base development] [--no-worktree] [--no-install]
 *   pnpm prd:stop   PRD-157 [--force] [--keep-branch]
 *   pnpm prd:status
 *   pnpm prd:doctor [PRD-157] [--fix]
 *
 * Side effects per `start`:
 *   1. Creates a git worktree at .worktrees/prd-XXX-{slug} on branch feat/prd-XXX-{slug}.
 *   2. Writes a lock file on the **main checkout** at _state/locks/prd-XXX-{slug}.json (schemaVersion 2).
 *   3. Appends a row to **main checkout** _STATUS.md "Aktif Agent'lar" table.
 *   4. Hydrates the worktree: symlinks root .env/.env.local (existence-only, never
 *      reads values) and runs `pnpm install` so it builds/tests out of the box.
 *
 * `stop` reverses 1-3, refusing to remove a dirty worktree unless --force.
 * `doctor` asserts the live cwd IS the PRD's worktree and that env/deps are
 * hydrated; `--fix` repairs env symlinks + dependencies.
 */
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import { migrateWorktreeMetrics } from "./prd-metrics.mjs";
import { ensureLocksDir, listLockFiles, lockPathFor, locksDir, migrateWorktreeLocks } from "./prd-locks.mjs";

import { EXECUTION_PHASES, declaredGlobs, findMarkdownTable, mainRepoRoot, readCurrentState, readText } from "./prd-state-utils.mjs";
import { candidateConflicts, candidateFromPrd, loadActiveLocks } from "./verify-path-conflicts.mjs";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");
const STATUS_PATH = () => resolve(mainRepoRoot(), "_STATUS.md");
const WORKTREE_ROOT = resolve(REPO_ROOT, ".worktrees");
const DEFAULT_LOCK_TTL_HOURS = 24;
const STATUS_TABLE_CELLS = ["Agent", "PRD", "Phase", "Started"];

const ALLOWED_PHASES = new Set(["Phase 1", "Phase 2", "Phase 2b", "Phase 3", "Phase 4", "Maintenance"]);

// EXECUTION_PHASES (phases that write code MUST run in an isolated worktree;
// doc-only Phase 1/2 keep the --no-worktree escape hatch) is imported from
// prd-state-utils — single source of truth (PRD-312 FR-1f).
const PROTECTED_BASES = new Set(["development", "main", "master", "staging"]);

function die(message, details = []) {
  process.stderr.write(`[prd-worktree] ${message}\n`);
  for (const detail of details) process.stderr.write(`  - ${detail}\n`);
  process.exit(1);
}

function ok(message) {
  process.stdout.write(`[prd-worktree] ${message}\n`);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  let i = 0;
  while (i < argv.length) {
    const tok = argv[i];
    if (tok === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (tok.startsWith("--")) {
      const key = tok.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        flags[key] = true;
        i += 1;
      } else {
        flags[key] = next;
        i += 2;
      }
    } else {
      positional.push(tok);
      i += 1;
    }
  }
  return { positional, flags };
}

function normalizePrd(value) {
  if (!value) die("PRD id required (e.g. PRD-157 or 157)");
  const upper = value.toString().toUpperCase();
  if (upper.startsWith("PRD-")) {
    if (!/^PRD-\d{3}$/.test(upper)) die(`PRD id malformed: ${value}`);
    return upper;
  }
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num)) die(`PRD id malformed: ${value}`);
  return `PRD-${String(num).padStart(3, "0")}`;
}

function resolveRecord(prdId) {
  const state = readCurrentState();
  if (!state) die("missing _state/prds.json", ["Run `pnpm state:sync` first."]);
  const record = state.records.find((r) => r.prd === prdId);
  if (!record) die(`${prdId} not found in _state/prds.json`);
  return record;
}

function lockFileFor(prdId, slug) {
  return lockPathFor(prdId, slug);
}

function worktreePathFor(prdId, slug) {
  return resolve(WORKTREE_ROOT, `${prdId.toLowerCase()}-${slug}`);
}

function branchNameFor(prdId, slug) {
  return `feat/${prdId.toLowerCase()}-${slug}`;
}

function listLocks() {
  return listLockFiles();
}

function git(args, opts = {}) {
  const result = execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
  return typeof result === "string" ? result.trim() : "";
}

function gitInWorktree(worktreePath, args) {
  return execFileSync("git", args, { cwd: worktreePath, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function lexists(pathname) {
  try {
    lstatSync(pathname);
    return true;
  } catch {
    return false;
  }
}

// Resolve the MAIN checkout root from any worktree via the shared .git common dir.
function mainRoot() {
  return mainRepoRoot();
}

function readLocksFrom(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const path = resolve(dir, name);
      try {
        return { path, name, data: JSON.parse(readFileSync(path, "utf8")) };
      } catch (error) {
        return { path, name, error: error.message };
      }
    });
}

// Symlink a single root file into the worktree (relative link; existence-only,
// never reads content — env values must never be read or logged).
function linkOne(src, dst) {
  try {
    symlinkSync(relative(dirname(dst), src), dst);
    return true;
  } catch (error) {
    process.stderr.write(`[prd-worktree] warn: could not symlink ${relative(REPO_ROOT, dst)}: ${error.message}\n`);
    return false;
  }
}

// Symlink root .env/.env.local into the worktree (skip if already present).
function linkEnvFiles(worktreeAbs) {
  const linked = [];
  for (const name of [".env", ".env.local"]) {
    const src = resolve(REPO_ROOT, name);
    if (!existsSync(src)) continue; // nothing to hydrate
    const dst = resolve(worktreeAbs, name);
    if (lexists(dst)) continue; // already there — never clobber
    if (linkOne(src, dst)) linked.push(name);
  }
  return linked;
}

// Native deps (notably sharp, whose platform binary ships as an optional
// dependency) are the fragile part of a fresh-worktree install: git worktrees
// never share node_modules, so every start materializes the @img/sharp-*
// binary anew. `--prefer-offline` is a known footgun there — a partial/evicted
// store entry yields a half-linked optional dep that "installs" fine but throws
// `Could not load the sharp module` at runtime. So we install with a full
// resolution first, then assert sharp actually loads before declaring success.
function installDeps(worktreeAbs) {
  try {
    // SHARP_IGNORE_GLOBAL_LIBVIPS: a Homebrew-installed libvips flips sharp's
    // installer into build-from-source, which dies on missing node-addon-api.
    // The prebuilt @img/sharp-darwin-* binary is what we want everywhere.
    execFileSync("pnpm", ["install"], {
      cwd: worktreeAbs,
      stdio: "inherit",
      env: { ...process.env, SHARP_IGNORE_GLOBAL_LIBVIPS: "1" },
    });
  } catch (error) {
    process.stderr.write(
      `[prd-worktree] ERROR: pnpm install in worktree failed (${error.message}); run \`pnpm install\` there manually\n`,
    );
    return false;
  }
  return verifySharp(worktreeAbs);
}

// sharp is a dependency of apps/backend and is NOT hoisted to the root
// node_modules (publicHoistPattern only lifts tailwind), so the load-check must
// run with cwd at the consumer — requiring it from the worktree root would
// false-fail even on a correct install.
const SHARP_CONSUMER = "apps/backend";

function sharpDir(worktreeAbs) {
  return resolve(worktreeAbs, SHARP_CONSUMER);
}

// Load-check sharp from its consumer so a missing/half-linked native binary
// fails loud here instead of surfacing later as a cryptic runtime crash. On
// failure, repair once with a clean install that forces optional-dep linking.
function verifySharp(worktreeAbs) {
  const consumer = sharpDir(worktreeAbs);
  if (!existsSync(consumer)) return true; // no backend in this worktree — nothing to check
  const canLoad = () => {
    try {
      execFileSync("node", ["-e", "require('sharp')"], { cwd: consumer, stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  };
  if (canLoad()) return true;
  process.stderr.write(`[prd-worktree] warn: sharp failed to load after install; repairing native binary…\n`);
  try {
    execFileSync("pnpm", ["install", "--force", "--config.confirmModulesPurge=false"], {
      cwd: worktreeAbs,
      stdio: "inherit",
    });
  } catch (error) {
    process.stderr.write(`[prd-worktree] ERROR: sharp repair install failed (${error.message})\n`);
    return false;
  }
  if (canLoad()) return true;
  process.stderr.write(
    "[prd-worktree] ERROR: sharp still not loadable — run `pnpm install --force` in the worktree and check the @img/sharp-* optional dep for your platform\n",
  );
  return false;
}

function branchExists(branch) {
  try {
    git(["show-ref", "--verify", `refs/heads/${branch}`]);
    return true;
  } catch {
    return false;
  }
}

function worktreeRegistered(path) {
  const list = git(["worktree", "list", "--porcelain"]);
  return list.split("\n\n").some((block) => block.split("\n").some((line) => line === `worktree ${path}`));
}

function readStatus() {
  return readFileSync(STATUS_PATH(), "utf8");
}

function writeStatus(content) {
  writeFileSync(STATUS_PATH(), content);
}

function statusTableBounds(content) {
  const table = findMarkdownTable(content, STATUS_TABLE_CELLS);
  if (!table) {
    die("could not find Aktif Agent'lar table in _STATUS.md", [
      `expected header cells: ${STATUS_TABLE_CELLS.join(" | ")}`,
    ]);
  }
  return table;
}

function parseStatusRows(content) {
  const { afterSep, rowsEnd } = statusTableBounds(content);
  const block = content.slice(afterSep, rowsEnd);
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

function rebuildStatusBlock(content, rows) {
  const { afterSep, rowsEnd } = statusTableBounds(content);
  const lines = rows.map((r) => `| ${r.agent} | ${r.prd} | ${r.phase} | ${r.started} |`);
  const block = lines.length === 0 ? "\n" : `\n${lines.join("\n")}\n`;
  return content.slice(0, afterSep) + block + content.slice(rowsEnd);
}

function addStatusRow(prd, agent, phase) {
  const content = readStatus();
  const rows = parseStatusRows(content);
  if (rows.some((r) => r.prd === prd)) die(`_STATUS.md already lists ${prd} as active; stop it first`);
  rows.push({
    agent,
    prd,
    phase,
    started: new Date().toISOString().replace("T", " ").slice(0, 16),
  });
  writeStatus(rebuildStatusBlock(content, rows));
}

function removeStatusRow(prd) {
  const content = readStatus();
  const rows = parseStatusRows(content).filter((r) => r.prd !== prd);
  writeStatus(rebuildStatusBlock(content, rows));
}

function startUsage() {
  return (
    [
      "Usage:",
      "  pnpm prd:start PRD-XXX [--phase \"Phase 3\"] [--agent name] [--base development] [--no-worktree] [--no-install] [--ttl-hours 24] [--owned-paths a,b]",
      "",
      "Pre-flight conflict check (PRD-392 FR-2): before the worktree and lock are",
      "created, the PRD's `## Conflict Surface` globs are checked against every",
      "ACTIVE execution-phase lock's ownedPaths. On overlap, start refuses (exit 1)",
      "and creates NOTHING — the surfaces must be serialized, not run in parallel.",
      "The check always evaluates the PRD's OWN declared surface; --owned-paths",
      "mirrors a surface into the lock but cannot bypass the pre-check.",
    ].join("\n") + "\n"
  );
}

// PRD-392 FR-2 — refuse a claim whose `## Conflict Surface` overlaps an ACTIVE
// execution-phase lock, BEFORE any worktree/lock is created. Evaluates the PRD's
// own declaredGlobs (via candidateFromPrd), independent of any --owned-paths
// override, so a caller cannot dodge the check by mirroring a false surface.
function assertNoConflict(prdId) {
  let candidate;
  try {
    candidate = candidateFromPrd(prdId);
  } catch (error) {
    process.stderr.write(
      `[prd-worktree] warn: conflict pre-check skipped — ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return;
  }
  if (!candidate) return; // no declared surface = nothing to check
  const conflicts = candidateConflicts(candidate, loadActiveLocks());
  if (conflicts.length > 0) {
    die(
      `${prdId} Conflict Surface overlaps an ACTIVE PRD — serialize, do not run in parallel`,
      conflicts.map((conflict) => `${conflict.a} ↔ ${conflict.b}: ${conflict.shared.join(", ")}`),
    );
  }
}

function commandStart(positional, flags) {
  if (flags.help === true || flags.h === true) {
    process.stdout.write(startUsage());
    return;
  }
  const prdId = normalizePrd(positional[0]);
  const record = resolveRecord(prdId);
  if (!record.slug) die(`${prdId} has no slug in state; PRD artifact missing?`);
  const slug = record.slug;

  const phase = flags.phase ?? "Phase 3";
  if (!ALLOWED_PHASES.has(phase)) die(`phase must be one of: ${[...ALLOWED_PHASES].join(", ")}`);
  const agent = flags.agent ?? process.env.PRD_AGENT ?? process.env.USER ?? "claude-code";
  const base = flags.base ?? "development";
  const skipWorktree = flags["no-worktree"] === true;
  if (skipWorktree && EXECUTION_PHASES.has(phase)) {
    die(`--no-worktree is not allowed for ${phase} (execution writes code)`, [
      "Execution and review phases must run in an isolated feat worktree.",
      "Drop --no-worktree, or use --phase \"Phase 1\"/\"Phase 2\" for doc-only work.",
    ]);
  }
  if (skipWorktree && PROTECTED_BASES.has(base)) {
    die(`refusing a --no-worktree claim based on protected branch "${base}"`, [
      "Pick a feat branch base or drop --no-worktree so a feat/prd-* branch is created.",
    ]);
  }
  const ttlHours = Number.parseFloat(flags["ttl-hours"] ?? DEFAULT_LOCK_TTL_HOURS);
  if (!Number.isFinite(ttlHours) || ttlHours <= 0) die("ttl-hours must be a positive number");

  const lockPath = lockFileFor(prdId, slug);
  migrateWorktreeLocks();
  if (existsSync(lockPath)) {
    die(`lock already exists at ${relative(mainRepoRoot(), lockPath)}`, ["Run `pnpm prd:stop` first or pass a different PRD."]);
  }
  ensureLocksDir();

  assertNoConflict(prdId); // PRD-392 FR-2 — stops before worktree/lock creation on overlap

  const branch = branchNameFor(prdId, slug);
  const worktreePath = worktreePathFor(prdId, slug);
  const worktreeRel = relative(REPO_ROOT, worktreePath);

  if (!skipWorktree) {
    if (!existsSync(WORKTREE_ROOT)) mkdirSync(WORKTREE_ROOT, { recursive: true });
    if (worktreeRegistered(worktreePath)) {
      die(`worktree already registered at ${worktreeRel}`, ["Remove it with `git worktree remove`."]);
    }
    if (existsSync(worktreePath)) {
      die(`path exists but is not a registered worktree: ${worktreeRel}`);
    }
    const args = ["worktree", "add", worktreePath];
    if (branchExists(branch)) {
      args.push(branch);
    } else {
      args.push("-b", branch, base);
    }
    try {
      git(args, { stdio: "inherit" });
    } catch (error) {
      die(`git worktree add failed: ${error.message}`);
    }
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours * 3600 * 1000);
  // PRD-312 FR-1c — mirror the PRD's `## Conflict Surface` globs into the lock so
  // verify:path-conflicts can detect cross-PRD source overlap. `--owned-paths`
  // overrides; absent section → no surface (opt-in, back-compat).
  let ownedPaths = [];
  if (flags["owned-paths"]) {
    ownedPaths = String(flags["owned-paths"]).split(",").map((value) => value.trim()).filter(Boolean);
  } else if (record.artifacts?.prd) {
    try {
      ownedPaths = declaredGlobs(readText(resolve(mainRepoRoot(), record.artifacts.prd)));
    } catch {
      /* no PRD content / no Conflict Surface → no declared surface */
    }
  }
  const lockBody = {
    schemaVersion: 2,
    lockId: `${prdId.toLowerCase()}-${slug}-${randomUUID().slice(0, 8)}`,
    agent,
    prd: prdId,
    phase,
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    touchedFiles: [record.artifacts?.prd || `_prds/wip/prd-${prdId.slice(4).toLowerCase()}-${slug}.md`],
    branch,
    ...(skipWorktree ? {} : { worktree: worktreeRel.split("/").join("/") }),
    ...(ownedPaths.length ? { ownedPaths } : {}),
  };
  writeFileSync(lockPath, `${JSON.stringify(lockBody, null, 2)}\n`);

  addStatusRow(prdId, agent, phase);

  ok(`${prdId} claimed by ${agent} (${phase})`);
  if (!skipWorktree) ok(`  worktree: ${worktreeRel} (branch ${branch})`);
  ok(`  lock:     ${relative(mainRepoRoot(), lockPath)}`);
  ok(`  status:   appended row to _STATUS.md`);
  if (!skipWorktree) {
    const linked = linkEnvFiles(worktreePath);
    ok(`  env:      ${linked.length ? `symlinked ${linked.join(", ")}` : "no root .env/.env.local to link"}`);
    if (flags["no-install"] === true) {
      ok(`  deps:     skipped (--no-install) — run \`pnpm install\` in the worktree`);
    } else {
      ok(`  deps:     pnpm install in worktree (--no-install to skip)…`);
      const depsOk = installDeps(worktreePath);
      ok(`  deps:     ${depsOk ? "installed + sharp loads" : "FAILED — run `pnpm install --force` in the worktree"}`);
    }
  }
  ok(`  next:     cd ${worktreeRel} && claude  # or open in Cursor`);
}

function commandStop(positional, flags) {
  const prdId = normalizePrd(positional[0]);
  const locks = listLocks().filter((l) => l.data?.prd === prdId);
  if (locks.length === 0) {
    die(`no active lock for ${prdId}`, ["Run `pnpm prd:status` to see what's claimed."]);
  }
  if (locks.length > 1) {
    die(`multiple locks for ${prdId} — clean up manually`, locks.map((l) => l.name));
  }
  const [lock] = locks;
  const force = flags.force === true;
  const keepBranch = flags["keep-branch"] === true;

  const migratedMetrics = migrateWorktreeMetrics();
  if (migratedMetrics > 0) {
    ok(`  metrics: migrated ${migratedMetrics} line(s) to main checkout`);
  }
  const migratedLocks = migrateWorktreeLocks();
  if (migratedLocks > 0) {
    ok(`  locks: migrated ${migratedLocks} lock file(s) to main checkout`);
  }

  if (lock.data.worktree) {
    const worktreePath = resolve(REPO_ROOT, lock.data.worktree);
    if (existsSync(worktreePath)) {
      try {
        const dirty = gitInWorktree(worktreePath, ["status", "--porcelain"]);
        if (dirty && !force) {
          die(`worktree has uncommitted changes: ${lock.data.worktree}`, ["Commit/stash first or pass --force"]);
        }
      } catch (error) {
        if (!force) die(`could not check worktree status: ${error.message}`, ["Pass --force to override."]);
      }
      try {
        const args = ["worktree", "remove", worktreePath];
        if (force) args.push("--force");
        git(args, { stdio: "inherit" });
      } catch (error) {
        die(`git worktree remove failed: ${error.message}`);
      }
    } else {
      try {
        git(["worktree", "prune"]);
      } catch {
        // best-effort
      }
    }
    if (!keepBranch && lock.data.branch) {
      try {
        git(["branch", "-d", lock.data.branch]);
      } catch {
        // branch may still have unmerged work; leave it for the user
      }
    }
  }

  unlinkSync(lock.path);
  removeStatusRow(prdId);
  ok(`${prdId} released (lock removed, status row removed)`);
}

function commandStatus() {
  const locks = listLocks();
  const status = readStatus();
  const rows = parseStatusRows(status);
  const lockByPrd = new Map(locks.map((l) => [l.data?.prd, l]));
  const rowByPrd = new Map(rows.map((r) => [r.prd, r]));

  const prds = new Set([...lockByPrd.keys(), ...rowByPrd.keys()].filter(Boolean));
  if (prds.size === 0) {
    ok("no active PRD claims");
    return;
  }
  for (const prd of [...prds].sort()) {
    const lock = lockByPrd.get(prd);
    const row = rowByPrd.get(prd);
    const agent = lock?.data?.agent ?? row?.agent ?? "?";
    const phase = lock?.data?.phase ?? row?.phase ?? "?";
    const wt = lock?.data?.worktree ?? "—";
    const drift = lock && !row ? " [DRIFT: missing _STATUS row]" : !lock && row ? " [DRIFT: missing lock]" : "";
    const stale = lock?.data?.expiresAt && Date.parse(lock.data.expiresAt) < Date.now() ? " [STALE]" : "";
    ok(`${prd}  agent=${agent}  phase=${phase}  worktree=${wt}${drift}${stale}`);
  }
}

// Worktree health check: assert the live cwd IS the PRD's worktree (equality,
// not a `.worktrees/` substring) and that env/deps are hydrated. Usable as a
// start gate (exits non-zero on any failure); `--fix` repairs env/deps.
function commandDoctor(positional, flags) {
  const fix = flags.fix === true;
  const root = mainRoot();
  const lockDir = locksDir();
  const toplevel = git(["rev-parse", "--show-toplevel"]);
  const here = toplevel ? resolve(toplevel) : "";
  const locks = readLocksFrom(lockDir).filter((l) => l.data?.worktree);

  let lock;
  if (positional[0]) {
    const prdId = normalizePrd(positional[0]);
    lock = locks.find((l) => l.data.prd === prdId);
    if (!lock) die(`no active worktree lock for ${prdId}`, [`looked in ${relative(root, lockDir)}/`]);
  } else {
    lock = locks.find((l) => resolve(root, l.data.worktree) === here);
    if (!lock && locks.length === 1) lock = locks[0];
    if (!lock) {
      die("could not infer the PRD for this worktree", [
        "Run from inside the worktree, or pass `pnpm prd:doctor PRD-XXX`.",
        locks.length
          ? `Active worktree locks: ${locks.map((l) => l.data.prd).join(", ")}`
          : "No active worktree locks found.",
      ]);
    }
  }

  const worktreeAbs = resolve(root, lock.data.worktree);
  const results = [];

  const cwdOk = here === worktreeAbs;
  results.push(["cwd is the PRD worktree", cwdOk, cwdOk ? worktreeAbs : `here=${here || "?"}, expected=${worktreeAbs}`]);

  for (const name of [".env", ".env.local"]) {
    const src = resolve(root, name);
    if (!existsSync(src)) continue; // nothing to hydrate
    const dst = resolve(worktreeAbs, name);
    if (!lexists(dst) && fix) linkOne(src, dst);
    const present = lexists(dst);
    results.push([`${name} hydrated`, present, present ? "symlink present" : "missing — run with --fix"]);
  }

  const nm = resolve(worktreeAbs, "node_modules");
  if (!existsSync(nm) && fix) installDeps(worktreeAbs);
  const nmOk = existsSync(nm);
  results.push(["node_modules present", nmOk, nmOk ? "ok" : "missing — run with --fix or `pnpm install`"]);

  // node_modules can exist while the sharp native binary is missing/half-linked
  // (the recurring fresh-worktree failure). Load-check it explicitly from its
  // consumer; --fix repairs via verifySharp's force path.
  if (nmOk && existsSync(sharpDir(worktreeAbs))) {
    let sharpOk;
    try {
      execFileSync("node", ["-e", "require('sharp')"], { cwd: sharpDir(worktreeAbs), stdio: "ignore" });
      sharpOk = true;
    } catch {
      sharpOk = false;
    }
    if (!sharpOk && fix) sharpOk = verifySharp(worktreeAbs);
    results.push(["sharp loadable", sharpOk, sharpOk ? "ok" : "native binary missing — run with --fix or `pnpm install --force`"]);
  }

  for (const [label, pass, detail] of results) {
    ok(`  ${pass ? "PASS" : "FAIL"}  ${label} — ${detail}`);
  }
  const failed = results.filter(([, pass]) => !pass);
  if (failed.length > 0) {
    die(`${lock.data.prd} worktree unhealthy (${failed.length} check(s) failed)`, fix ? [] : ["Re-run with --fix to repair env/deps."]);
  }
  ok(`${lock.data.prd} worktree healthy (${results.length} checks)`);
}

const [, , subcommand, ...rest] = process.argv;
const { positional, flags } = parseArgs(rest);

switch (subcommand) {
  case "start":
    commandStart(positional, flags);
    break;
  case "stop":
    commandStop(positional, flags);
    break;
  case "status":
    commandStatus();
    break;
  case "doctor":
    commandDoctor(positional, flags);
    break;
  case "--help":
  case "-h":
  case "help":
  case undefined:
    process.stdout.write(
      [
        "Usage:",
        "  pnpm prd:start  PRD-XXX [--phase \"Phase 3\"] [--agent name] [--base development] [--no-worktree] [--no-install] [--ttl-hours 24]",
        "  pnpm prd:stop   PRD-XXX [--force] [--keep-branch]",
        "  pnpm prd:status",
        "  pnpm prd:doctor [PRD-XXX] [--fix]   # assert cwd==worktree + env/deps hydrated",
        "",
        "prd:start runs a Conflict Surface pre-check (PRD-392 FR-2): overlap with an",
        "ACTIVE lock refuses the claim (exit 1) before any worktree/lock is created.",
        "See `pnpm prd:start --help` for detail.",
      ].join("\n") + "\n",
    );
    break;
  default:
    die(`unknown subcommand: ${subcommand}`);
}
