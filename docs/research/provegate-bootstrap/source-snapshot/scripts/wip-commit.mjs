#!/usr/bin/env node
/**
 * `pnpm wip "<conventional commit message>"` — friction-free commit that respects
 * the base-branch guard (see `scripts/guard-base-branch-commit.mjs`).
 *
 * The guard keeps base branches (main/staging) merge-only for SOURCE code:
 * feature work must land via a `feat/*` branch. (`development` is exempt — it is
 * the day-to-day working branch and accepts direct source commits.) That is
 * correct for the shared-checkout / multi-agent setup, but doing the
 * "stash → branch → commit"
 * dance by hand on every change is the friction. This helper automates it:
 *
 *   - On a base branch with staged SOURCE files → auto-create `feat/<slug>` from
 *     the commit message and commit there (the sanctioned path), then tell you.
 *   - On a base branch with only coordination/docs files → commit in place (the
 *     guard already allows these).
 *   - On any non-base branch → just commit.
 *
 * All the normal hooks (secret scan, lint-staged, commitlint) still run — this
 * only removes the manual branch dance, never the quality gates.
 *
 * Usage:
 *   git add -p && pnpm wip "feat(admin): add support sidebar"
 *   pnpm wip "fix(backend): guard null org" --branch feat/my-explicit-name
 */
import { execFileSync } from "node:child_process";

import { PROTECTED, isAllowed } from "./lib/base-branch-policy.mjs";

function git(args, { capture = true } = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
}

function gitQuiet(args) {
  try {
    return git(args).trim();
  } catch {
    return "";
  }
}

function fail(msg) {
  process.stderr.write(`[wip] ${msg}\n`);
  process.exit(1);
}

/** Derive a branch slug from a conventional commit subject. */
function slugFromMessage(msg) {
  // Strip a leading `type(scope): ` / `type: ` prefix, then kebab the rest.
  const subject = msg.split("\n")[0];
  const afterPrefix = subject.replace(/^\w+(\([^)]*\))?!?:\s*/, "");
  const slug = afterPrefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 6)
    .join("-");
  return slug || "wip";
}

function uniqueBranch(base) {
  let name = base;
  let n = 2;
  while (gitQuiet(["rev-parse", "--verify", "--quiet", name])) {
    name = `${base}-${n++}`;
  }
  return name;
}

// --- args -----------------------------------------------------------------
const argv = process.argv.slice(2);
let explicitBranch = null;
const msgParts = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--branch" || argv[i] === "-b") {
    explicitBranch = argv[++i];
  } else {
    msgParts.push(argv[i]);
  }
}
const message = msgParts.join(" ").trim();
if (!message) {
  fail('Commit message required.  e.g.  pnpm wip "fix(backend): guard null org"');
}

// --- preconditions --------------------------------------------------------
const staged = gitQuiet(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])
  .split("\n")
  .map((f) => f.trim())
  .filter(Boolean);

if (staged.length === 0) {
  fail("Nothing staged. Stage your changes first (git add -p / git add <files>).");
}

const branch = gitQuiet(["symbolic-ref", "--quiet", "--short", "HEAD"]);
const onProtected = PROTECTED.has(branch);
const hasSource = staged.some((f) => !isAllowed(f));

// --- decide target branch -------------------------------------------------
let targetCreated = null;
if (onProtected && hasSource) {
  const target = explicitBranch ?? uniqueBranch(`feat/${slugFromMessage(message)}`);
  // `git checkout -b` carries the staged index over to the new branch.
  git(["checkout", "-b", target], { capture: false });
  targetCreated = target;
  process.stderr.write(
    `[wip] base branch "${branch}" is merge-only for source — moved staged work onto "${target}".\n`,
  );
} else if (explicitBranch && explicitBranch !== branch) {
  git(["checkout", "-b", explicitBranch], { capture: false });
  targetCreated = explicitBranch;
}

// --- commit (hooks run as usual) -----------------------------------------
git(["commit", "-m", message], { capture: false });

if (targetCreated) {
  process.stderr.write(
    `[wip] committed on "${targetCreated}". Push + open a PR when ready:\n` +
      `        git push -u origin ${targetCreated}\n`,
  );
}
