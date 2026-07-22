#!/usr/bin/env node
/**
 * verify:path-conflicts — fail when two ACTIVE execution-phase locks declare
 * overlapping source paths (PRD-312 FR-1).
 *
 * Locks are PRD-scoped and `touchedFiles` is auto-seeded with only the PRD doc,
 * so the existing verify:agent-locks exact-path check is inert for source. This
 * gate materializes each lock's declared `ownedPaths` globs against `git ls-files`,
 * subtracts the SHARED_APPEND_ONLY manifests (post-materialization — so a broad
 * `**` cannot false-conflict on package.json / verify-workflow.mjs), and fails on
 * a non-empty intersection between any two ACTIVE PRDs. A locked PRD with no
 * ownedPaths declares no surface and never trips the gate (opt-in, back-compat).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { listLockFiles } from "./prd-locks.mjs";
import {
  EXECUTION_PHASES,
  SHARED_APPEND_ONLY,
  declaredGlobs,
  fail,
  globToRegExp,
  mainRepoRoot,
  ok,
} from "./prd-state-utils.mjs";

// lockIds that predate this gate and may finish as-is. Drop on ship. Do NOT add
// new entries — a missing `ownedPaths` already declares no surface and passes,
// so this is belt-and-suspenders for an in-flight lock that DID declare one.
const GRANDFATHERED = new Set([]);

/** Tracked files in the repo, for glob materialization (git ls-files). */
export function trackedFiles(cwd = mainRepoRoot()) {
  try {
    return execFileSync("git", ["ls-files"], { cwd, encoding: "utf8" }).split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/** Expand globs against the tracked file set, minus SHARED_APPEND_ONLY (the
 * post-materialization subtraction). */
function materialize(globs, files) {
  const regexes = globs.map(globToRegExp);
  const out = new Set();
  for (const file of files) {
    if (SHARED_APPEND_ONLY.has(file)) continue;
    if (regexes.some((re) => re.test(file))) out.add(file);
  }
  return out;
}

function normalizeGlob(glob) {
  return glob.replace(/\/\*\*$/, "").replace(/\/$/, "");
}

/** Structural overlap for globs that materialize to zero files yet (new dirs):
 * identical or prefix-nested normalized globs. The residual sibling-glob case is
 * a documented Non-Goal false-negative. */
function structuralOverlap(aGlobs, bGlobs) {
  const out = [];
  for (const ag of aGlobs) {
    for (const bg of bGlobs) {
      const a = normalizeGlob(ag);
      const b = normalizeGlob(bg);
      if (a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)) out.push(`${ag} ~ ${bg}`);
    }
  }
  return out;
}

/**
 * Pure overlap detector — importable for tests. Each lock is
 * `{ lockId, prd, phase, ownedPaths }`. Returns `[{ a, b, shared:[...] }]`.
 * @param {Array<{lockId?:string,prd:string,phase:string,ownedPaths?:string[]}>} activeLocks
 * @param {string[]} [files] tracked files (defaults to git ls-files)
 */
export function findConflicts(activeLocks, files = trackedFiles()) {
  const surfaced = activeLocks
    .filter((lock) => EXECUTION_PHASES.has(lock.phase))
    .filter((lock) => Array.isArray(lock.ownedPaths) && lock.ownedPaths.length > 0)
    .filter((lock) => !GRANDFATHERED.has(lock.lockId))
    .map((lock) => ({ lock, globs: lock.ownedPaths, mat: materialize(lock.ownedPaths, files) }));

  const conflicts = [];
  for (let i = 0; i < surfaced.length; i += 1) {
    for (let j = i + 1; j < surfaced.length; j += 1) {
      const a = surfaced[i];
      const b = surfaced[j];
      if (a.lock.prd === b.lock.prd) continue;
      const shared = [...a.mat].filter((file) => b.mat.has(file));
      const structural = a.mat.size === 0 || b.mat.size === 0 ? structuralOverlap(a.globs, b.globs) : [];
      if (shared.length > 0 || structural.length > 0) {
        conflicts.push({ a: a.lock.prd, b: b.lock.prd, shared: shared.length ? shared : structural });
      }
    }
  }
  return conflicts;
}

/** Active execution-phase locks in `findConflicts` shape (unexpired only).
 * @param {number} [now]
 * @returns {Array<{lockId?:string,prd:string,phase:string,ownedPaths?:string[]}>} */
export function loadActiveLocks(now = Date.now()) {
  return listLockFiles()
    .filter((lock) => lock.data && Date.parse(lock.data.expiresAt) >= now)
    .map((lock) => ({
      lockId: lock.data.lockId,
      prd: lock.data.prd,
      phase: lock.data.phase,
      ownedPaths: lock.data.ownedPaths,
    }));
}

/**
 * Synthesize a candidate PRD entry from its `## Conflict Surface` for
 * `findConflicts`. Shared by the `--prd` mode AND the prd:start pre-check so a
 * single parser (`declaredGlobs`) can never drift (PRD-392 FR-1/FR-2). The
 * candidate is stamped as an execution-phase entry ("Phase 4") — otherwise
 * `findConflicts`'s EXECUTION_PHASES filter would silently exempt it. Returns
 * `null` when no surface is declared (mirrors the opt-in lock `ownedPaths`
 * semantics: no surface = nothing to check).
 * @param {string} prdId  e.g. "PRD-392"
 * @param {string} [root]  main checkout root (defaults to mainRepoRoot)
 * @returns {{prd:string,phase:string,ownedPaths:string[]}|null}
 */
export function candidateFromPrd(prdId, root = mainRepoRoot()) {
  const normalized = String(prdId ?? "").toUpperCase();
  const match = normalized.match(/^PRD-(\d{3})$/);
  if (!match) throw new Error(`--prd: malformed PRD id "${prdId}" (expected PRD-XXX)`);
  const num = match[1];
  const fileRe = new RegExp(`^prd-${num}-.+\\.md$`);
  const found = [];
  for (const state of ["drafts", "wip"]) {
    const dir = resolve(root, "_prds", state);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (fileRe.test(name)) found.push(resolve(dir, name));
    }
  }
  if (found.length === 0) throw new Error(`--prd: no PRD file for ${normalized} in _prds/{drafts,wip}`);
  if (found.length > 1) {
    throw new Error(`--prd: multiple PRD files for ${normalized}: ${found.map((p) => relative(root, p)).join(", ")}`);
  }
  const globs = declaredGlobs(readFileSync(found[0], "utf8"));
  if (globs.length === 0) return null; // no `## Conflict Surface` (or empty) = no declared surface
  return { prd: normalized, phase: "Phase 4", ownedPaths: globs };
}

/** Conflicts between a candidate PRD and the ACTIVE locks — the subset of
 * `findConflicts` pairs that involve the candidate. Reuses the pure detector so
 * materialization semantics stay identical to the chain scan.
 * @param {{prd:string,phase:string,ownedPaths:string[]}|null} candidate
 * @param {Array<{lockId?:string,prd:string,phase:string,ownedPaths?:string[]}>} activeLocks
 * @param {string[]} [files]
 * @returns {Array<{a:string,b:string,shared:string[]}>} */
export function candidateConflicts(candidate, activeLocks, files = trackedFiles()) {
  if (!candidate) return [];
  // Exclude the candidate's own active lock (same PRD): it is the surface being
  // (re)claimed, not a rival. Dropping it also avoids a phantom duplicate when
  // `--prd` is run against an already-locked PRD.
  const rivals = activeLocks.filter((lock) => lock.prd !== candidate.prd);
  return findConflicts([candidate, ...rivals], files).filter(
    (conflict) => conflict.a === candidate.prd || conflict.b === candidate.prd,
  );
}

function main() {
  const active = loadActiveLocks();
  const conflicts = findConflicts(active);
  if (conflicts.length > 0) {
    fail(
      "[verify:path-conflicts] overlapping owned paths between ACTIVE PRDs",
      conflicts.map((conflict) => `${conflict.a} ↔ ${conflict.b}: ${conflict.shared.join(", ")}`),
    );
  }
  ok(`[verify:path-conflicts] ok - ${active.length} active lock(s), no source-path overlap`);
}

/** `--prd PRD-XXX`: candidate PRD Conflict Surface vs ACTIVE locks (PRD-392 FR-1).
 * @param {string|undefined} prdArg */
function runPrdMode(prdArg) {
  if (!prdArg || prdArg.startsWith("--")) {
    fail("[verify:path-conflicts] --prd requires a PRD id (e.g. --prd PRD-392)");
  }
  let candidate;
  try {
    candidate = candidateFromPrd(prdArg);
  } catch (error) {
    fail(`[verify:path-conflicts] ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  const normalized = String(prdArg).toUpperCase();
  if (!candidate) {
    ok(`[verify:path-conflicts] ok - ${normalized} declares no Conflict Surface (nothing to check)`);
    return;
  }
  const active = loadActiveLocks();
  const conflicts = candidateConflicts(candidate, active);
  if (conflicts.length > 0) {
    fail(
      `[verify:path-conflicts] ${normalized} Conflict Surface overlaps ACTIVE PRD(s) — serialize, do not run in parallel`,
      conflicts.map((conflict) => `${conflict.a} ↔ ${conflict.b}: ${conflict.shared.join(", ")}`),
    );
  }
  ok(`[verify:path-conflicts] ok - ${normalized} vs ${active.length} active lock(s), no source-path overlap`);
}

/** In-memory fixtures for the two exit paths §11 FR-1 requires (no disk / no
 * real locks). Exits 1 on any failed assertion, 0 when all pass. */
function runSelfTest() {
  const files = ["scripts/verify-foo.mjs", "scripts/verify-bar.mjs", "packages/x/index.ts"];
  const conflictingLock = [{ lockId: "l1", prd: "PRD-900", phase: "Phase 4", ownedPaths: ["scripts/verify-foo.mjs"] }];
  const disjointLock = [{ lockId: "l2", prd: "PRD-901", phase: "Phase 4", ownedPaths: ["packages/x/**"] }];
  const foo = { prd: "PRD-999", phase: "Phase 4", ownedPaths: ["scripts/verify-foo.mjs"] };
  const bar = { prd: "PRD-999", phase: "Phase 4", ownedPaths: ["scripts/verify-bar.mjs"] };

  const cases = [
    ["conflicting candidate + active lock reports overlap (exit 1 path)", candidateConflicts(foo, conflictingLock, files).length > 0],
    ["clean candidate has no overlap (exit 0 path)", candidateConflicts(bar, disjointLock, files).length === 0],
    ["surfaceless candidate (null) has no overlap (exit 0 path)", candidateConflicts(null, conflictingLock, files).length === 0],
    ["no active locks yields no overlap (exit 0 path)", candidateConflicts(foo, [], files).length === 0],
  ];
  for (const [label, pass] of cases) ok(`  ${pass ? "PASS" : "FAIL"}  ${label}`);
  const failed = cases.filter(([, pass]) => !pass);
  if (failed.length > 0) fail(`[verify:path-conflicts] --self-test: ${failed.length}/${cases.length} case(s) failed`);
  ok(`[verify:path-conflicts] --self-test ok - ${cases.length} case(s) passed`);
}

function printHelp() {
  ok(
    [
      "verify:path-conflicts — overlapping owned-path detector.",
      "",
      "Usage:",
      "  node scripts/verify-path-conflicts.mjs            scan ACTIVE locks pairwise (chain mode, default)",
      "  node scripts/verify-path-conflicts.mjs --prd PRD-XXX   candidate PRD Conflict Surface vs ACTIVE locks",
      "  node scripts/verify-path-conflicts.mjs --self-test     in-memory fixtures (no disk / no real locks)",
      "  node scripts/verify-path-conflicts.mjs --help",
      "",
      "--prd exits 1 on overlap (serialize the surfaces); no override/force flag exists.",
    ].join("\n"),
  );
}

function cli() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) return printHelp();
  if (args.includes("--self-test")) return runSelfTest();
  const prdIdx = args.indexOf("--prd");
  if (prdIdx !== -1) return runPrdMode(args[prdIdx + 1]);
  return main(); // no flags → argument-free behavior is byte-identical (PRD-392 DO NOT #5)
}

if (process.argv[1]?.endsWith("verify-path-conflicts.mjs")) cli();
