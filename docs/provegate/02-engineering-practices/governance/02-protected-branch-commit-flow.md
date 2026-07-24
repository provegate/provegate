# 02 — Protected-branch commit flow

**Invariant.** Shared, long-lived base branches are **merge-only for source**. A
commit-time guard (a hook, not just CI) blocks direct source commits there and offers to
auto-create a feature branch carrying the staged work; low-risk coordination/doc paths may
commit in place. One working branch is exempt for daily commits, one explicit env-var
escape hatch exists for deliberate one-offs, and merge commits are exempt. **Pushing to a
remote is never automated — always a human action.**

**Why it matters.** It keeps base-branch history clean and reviewable without relying on
server-side branch protection alone, and it removes the friction that pushes people to
commit source straight to `main`. The guard is at commit time so the mistake is caught
before it happens, not in CI after.

**Mechanism (generic).**
- A **policy SSOT** module lists: `PROTECTED = {main, master, staging}`, an allowlist of
  path prefixes that may commit in place (docs + coordination files), and an allowlist of
  root files (`README.md`, the status board, the agent-contract file). `isAllowed(path)`
  = docs/coordination → in place; everything else (`src/`, `packages/`, build config, CI)
  = source → must land via a feature branch + merge.
- A **pre-commit hook** runs the guard: on a protected branch it inspects
  `git diff --cached --diff-filter=ACMR`; if any staged file fails `isAllowed`, it exits
  non-zero with remediation text. Exemptions: merge commits (`MERGE_HEAD` present) and
  `ALLOW_BASE_COMMIT=1` (prints a warning, exits 0).
- A **helper command** (`wip "<conventional msg>"`): if on a protected branch with staged
  source, derive a slug from the commit subject (strip the `type(scope):` prefix, kebab,
  first ~6 words), `git checkout -b feat/<slug>` carrying the staged index, commit there;
  if docs-only or on the exempt branch, commit in place. All hooks still run.
- **One exempt working branch** (Emofy: `development`) accepts direct source commits — the
  daily integration branch.

**Provegate implementation.**
1. Create a `base-branch-policy` module (protected set + allowlists) as the single source.
2. Add a `pre-commit` hook (husky or native) calling a guard script that reads the policy.
3. Provide the `wip` helper (or document `git checkout -b feat/… ` as the manual path).
4. Pick the exempt working branch; document `ALLOW_BASE_COMMIT=1` as the escape hatch.
5. State "push is always human" in the bootstrap doc — no hook or script pushes.

**De-emofy notes.** Emofy's guard has a **second block** for multi-agent worktree
isolation (`feat/prd-XXX-*` branches must be committed from inside the worktree its lock
pins) coupled to `_state/locks/*.json`. **Drop that block for a single-agent project** —
it is multi-agent infra; the parallel-orchestration wave (`05`) re-adopts it as the
runtime complement to its branch-isolation check (lock-JSON checks never see the live
checkout). Genericize the doc allowlist to the project's own doc/coordination paths.
`pnpm wip` → any git helper.

**Related.** seed `fresh-worktree-env-gap` · practice 03 (the helper takes a Conventional
Commit message) · practice 06 (allowlisted coordination files).
