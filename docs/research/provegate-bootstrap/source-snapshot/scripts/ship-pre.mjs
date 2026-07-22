#!/usr/bin/env node
/**
 * Phase 4 ship-pre gate.
 *
 *   pnpm ship:pre [--base main] [--allow-main]
 *
 * Runs the mechanical pre-ship chain (state:sync + verify:workflow) and prints
 * a handoff card so the agent can immediately invoke `/review` (and then
 * `/ship`) with the right context. Refuses to run on the base branch unless
 * --allow-main is passed (running ship:pre on main is meaningless).
 *
 * Exits non-zero if any check fails. The agent should NOT proceed to `/review`
 * or `/ship` until this exits 0.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (!tok.startsWith("--")) continue;
    const key = tok.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i += 1;
    }
  }
  return flags;
}

function git(args) {
  const result = execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return typeof result === "string" ? result.trim() : "";
}

function tryGit(args, fallback = "") {
  try {
    return git(args);
  } catch {
    return fallback;
  }
}

function runStep(label, command, args) {
  process.stdout.write(`\n▶ ${label}\n`);
  const result = spawnSync(command, args, { cwd: REPO_ROOT, stdio: "inherit" });
  if (result.status !== 0) {
    process.stderr.write(`\n[ship:pre] FAILED at: ${label}\n`);
    process.stderr.write(`[ship:pre] fix the failure above and re-run \`pnpm ship:pre\`.\n`);
    process.exit(result.status ?? 1);
  }
}

function detectPrd(branch) {
  const match = branch.match(/(?:^|\/)prd-(\d{3})\b/i);
  return match ? `PRD-${match[1]}` : null;
}

const flags = parseArgs(process.argv.slice(2));
const base = typeof flags.base === "string" ? flags.base : "main";
const allowMain = flags["allow-main"] === true;

const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
if (!allowMain && (branch === base || branch === "main" || branch === "master")) {
  process.stderr.write(`[ship:pre] refusing to run on ${branch} (pass --allow-main to override).\n`);
  process.exit(1);
}

const dirty = git(["status", "--porcelain"]);
if (dirty) {
  process.stderr.write(`[ship:pre] working tree has uncommitted changes:\n${dirty}\n`);
  process.stderr.write(`[ship:pre] commit or stash before shipping.\n`);
  process.exit(1);
}

runStep("pnpm state:sync", "pnpm", ["state:sync"]);
runStep("pnpm state:wiki-log", "pnpm", ["state:wiki-log"]);
runStep("pnpm verify:workflow", "pnpm", ["verify:workflow"]);

const baseRef = tryGit(["rev-parse", "--verify", `origin/${base}`]) ? `origin/${base}` : base;
const mergeBase = tryGit(["merge-base", baseRef, "HEAD"]);
const range = mergeBase ? `${mergeBase}..HEAD` : `${baseRef}...HEAD`;
const aheadBehind = tryGit(["rev-list", "--left-right", "--count", `${baseRef}...HEAD`]) || "?\t?";
const [behind = "?", ahead = "?"] = aheadBehind.split("\t");
const diffShort = tryGit(["diff", "--shortstat", range]);
const filesChanged = tryGit(["diff", "--name-only", range]);
const commits = tryGit(["log", "--oneline", range]);
const prdId = detectPrd(branch);

const card = [
  "",
  "================ ship:pre handoff card ================",
  `Branch:      ${branch}`,
  `Base:        ${baseRef}  (behind ${behind}, ahead ${ahead})`,
  `Diff:        ${diffShort || "(no diff vs base)"}`,
  prdId ? `PRD:         ${prdId}` : "PRD:         (none detected from branch name)",
  "",
  "Commits ahead of base:",
  ...(commits ? commits.split("\n").map((line) => `  ${line}`) : ["  (none)"]),
  "",
  "Files changed:",
  ...(filesChanged ? filesChanged.split("\n").slice(0, 25).map((line) => `  ${line}`) : ["  (none)"]),
  filesChanged && filesChanged.split("\n").length > 25 ? `  … (+${filesChanged.split("\n").length - 25} more)` : "",
  "",
  "Next steps:",
  "  1. /review                          # gstack pre-landing review against base",
  prdId
    ? `  2. /ship                            # hand off PRD ${prdId} (writes summary + updates _STATUS.md)`
    : "  2. /ship                            # hand off (no PRD detected; supply manually)",
  "=======================================================",
  "",
].filter(Boolean).join("\n");

process.stdout.write(card);
