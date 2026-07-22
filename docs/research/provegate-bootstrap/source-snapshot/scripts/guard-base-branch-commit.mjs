#!/usr/bin/env node
/**
 * Pre-commit guard: keep PRD source on its isolated worktree.
 *
 * Two complementary blocks, both at commit time (the point where drift becomes
 * permanent), both bypassable with ALLOW_BASE_COMMIT=1 for deliberate one-offs:
 *
 *   1. base-branch — feature/source work must land on main|staging ONLY via a
 *      merge from a feat/prd-* branch (see `pnpm prd:start`). `development` is
 *      exempt: it is the working branch and accepts direct source commits.
 *      Committing source straight onto a protected base branch is the drift that
 *      bypasses worktree isolation when several agents share one checkout. Direct
 *      commits to a protected base branch are allowed only for coordination
 *      artifacts (PRD/task/readiness/summary state, _STATUS, wiki, docs).
 *
 *   2. worktree-cwd — on a feat/prd-XXX-* branch, this PRD's source must be
 *      committed from inside the worktree its lock pins it to. verify:branch-
 *      isolation only inspects the lock JSON; it never sees the live checkout,
 *      so an agent that ran prd:start (correct lock) but kept editing in the
 *      main checkout slips every existing gate. This block correlates the live
 *      working-tree root with the lock's `worktree` field (equality, not a
 *      `.worktrees/` substring) and refuses the mismatch.
 *
 * Exemptions: merge commits (MERGE_HEAD), non-guarded branches, ALLOW_BASE_COMMIT=1.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { PROTECTED, isAllowed } from "./lib/base-branch-policy.mjs";

function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

/**
 * For a feat/prd-XXX-* branch, returns a mismatch descriptor when the live
 * working tree is NOT the worktree the PRD's lock pins it to, or null when the
 * commit is fine (right worktree, no lock, or a --no-worktree lock).
 *
 * Resolves the lock via the shared `.git` common dir, so it reads the main
 * checkout's gitignored lock even when invoked from inside the worktree.
 */
function worktreeMismatch(lockSlug) {
  const toplevel = git(["rev-parse", "--show-toplevel"]);
  const commonDir = git(["rev-parse", "--git-common-dir"]);
  if (!toplevel || !commonDir) return null; // can't determine — never block blindly
  const mainRoot = dirname(resolve(toplevel, commonDir));
  const lockPath = resolve(mainRoot, "_state/locks", `${lockSlug}.json`);
  if (!existsSync(lockPath)) return null; // no lock → verify:branch-isolation owns missing-lock
  let lock;
  try {
    lock = JSON.parse(readFileSync(lockPath, "utf8"));
  } catch {
    return null; // unreadable lock → verify:agent-locks owns that
  }
  if (!lock.worktree) return null; // --no-worktree lock (Phase 1/2 doc work)
  const expectedAbs = resolve(mainRoot, lock.worktree);
  if (resolve(toplevel) === expectedAbs) return null; // committing from the right worktree
  return {
    expectedAbs,
    expectedRel: lock.worktree,
    currentRel: relative(mainRoot, toplevel) || "(main checkout)",
  };
}

const branch = git(["symbolic-ref", "--quiet", "--short", "HEAD"]);
const onProtected = Boolean(branch) && PROTECTED.has(branch);
const prdBranch = branch ? branch.match(/^feat\/(prd-\d{3}-[a-z0-9-]+)$/) : null;
// Only a base branch or a PRD feat branch is guarded; everything else is free.
if (!onProtected && !prdBranch) process.exit(0);

const gitDir = git(["rev-parse", "--git-dir"]) || ".git";
if (existsSync(resolve(gitDir, "MERGE_HEAD"))) process.exit(0); // merge — sanctioned

if (process.env.ALLOW_BASE_COMMIT === "1") {
  process.stderr.write(
    `[guard:base-branch] ALLOW_BASE_COMMIT=1 — permitting a direct commit on ${branch}.\n`,
  );
  process.exit(0);
}

const staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])
  .split("\n")
  .map((f) => f.trim())
  .filter(Boolean);

const sourceFiles = staged.filter((f) => !isAllowed(f));
if (sourceFiles.length === 0) process.exit(0); // only coordination/docs — always fine

const offending = [
  ...sourceFiles.slice(0, 20).map((f) => `    - ${f}`),
  ...(sourceFiles.length > 20 ? [`    … (+${sourceFiles.length - 20} more)`] : []),
];

if (onProtected) {
  process.stderr.write(
    [
      "",
      `[guard:base-branch] BLOCKED: source files staged for a direct commit on "${branch}".`,
      "",
      "  Base branches are merge-only for code. Move this work onto an isolated",
      "  feat worktree before committing:",
      "",
      "    pnpm prd:start PRD-XXX        # creates .worktrees/prd-XXX-* on feat/prd-XXX-*",
      "    cd .worktrees/prd-XXX-…       # then commit there; land via merge",
      "",
      "  Offending files:",
      ...offending,
      "",
      "  Deliberate one-off (e.g. finishing in-flight work, hotfix)?",
      "    ALLOW_BASE_COMMIT=1 git commit …",
      "",
    ].join("\n") + "\n",
  );
  process.exit(1);
}

// PRD feat branch: source must be committed from inside this PRD's worktree.
const mismatch = worktreeMismatch(prdBranch[1]);
if (mismatch) {
  process.stderr.write(
    [
      "",
      `[guard:worktree-cwd] BLOCKED: PRD source staged for "${branch}" outside its worktree.`,
      "",
      `  This PRD's lock pins work to:  ${mismatch.expectedRel}`,
      `  but you are committing from:   ${mismatch.currentRel}`,
      "",
      "  cd into the worktree and commit there:",
      `    cd ${mismatch.expectedAbs}`,
      "",
      "  Offending files:",
      ...offending,
      "",
      "  Deliberate one-off?  ALLOW_BASE_COMMIT=1 git commit …",
      "",
    ].join("\n") + "\n",
  );
  process.exit(1);
}

process.exit(0);
