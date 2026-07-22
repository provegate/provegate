/**
 * Shared base-branch commit policy — the single source of truth for which
 * branches are merge-only for source and which paths may be committed directly
 * on them.
 *
 * Imported by scripts/guard-base-branch-commit.mjs (the pre-commit hook) and
 * scripts/wip-commit.mjs (the friction-free helper). These two used to
 * hand-duplicate the set behind a "keep in sync" comment; keep the policy here
 * so a third consumer (e.g. the worktree-cwd guard) can never drift from it.
 */

// Base branches that are merge-only for SOURCE code at COMMIT TIME. Feature work
// lands here only via a merge from a feat/* branch (see `pnpm prd:start`).
//
// `development` is intentionally NOT in this set: it is the day-to-day working
// branch where direct source commits are allowed. The multi-agent PRD worktree
// machinery still treats `development` as the merge target (see PROTECTED_BASES
// in prd-worktree.mjs and PROTECTED_BRANCHES in verify-branch-isolation.mjs) —
// this set governs only the commit-time guard + `pnpm wip` auto-branching, not
// that worktree flow.
export const PROTECTED = new Set(["main", "master", "staging"]);

// Path prefixes that may be committed directly on a base branch — the
// coordination / documentation artifacts that archival + ledger commits touch.
// Everything else (apps/, packages/, scripts/, infra/, .github/, …) is source
// and must arrive via a merge from a feat/prd-* branch.
export const ALLOWED_PREFIXES = [
  "_prds/",
  "_tasks/",
  "_readiness/",
  "_docs/",
  "_plans/",
  "_state/",
  "wiki/",
  "docs/",
];

export const ALLOWED_FILES = new Set(["_STATUS.md", "AGENTS.md", "CLAUDE.md", "README.md"]);

/** True when `file` may be committed directly on a base branch (coordination/docs). */
export function isAllowed(file) {
  if (ALLOWED_FILES.has(file)) return true;
  return ALLOWED_PREFIXES.some((prefix) => file.startsWith(prefix));
}
