// Traversal-attack and content fixture strings whose VALUES legitimately carry
// multi-parent path segments — the second boundary-scan exemption (PRD-036).
// Zero imports, zero calls, exactly these four named constants; the
// verify:test-inputs gate validates that shape. Values are byte-identical to
// the sites they moved from; the tests import them, the assertions unchanged.

/** single-package: a selector the containment check must refuse. */
export const TRAVERSAL_SELECTOR = 'packages/../../x';

/** wiring: a verify command whose path escapes the scripts dir. */
export const TRAVERSAL_COMMAND = 'node scripts/verify/../../outside/verify-foo.mjs';

/** worktree: a hostile slug createWorktree must throw on. */
export const TRAVERSAL_SLUG = '../../../escaped';

/** quickstart-e2e: the seeded tasks-file body (its PRD link is a relative
 * markdown path). */
export const QUICKSTART_TASKS_FIXTURE = `# Tasks: Fix Login Timeout

> **PRD**: [prd-001-fix-login-timeout.md](../../_prds/wip/prd-001-fix-login-timeout.md)
> **Status**: Code Complete

## Tasks

- [x] 1.0 Fix
  - [x] 1.1 the fix

## Verification Ledger

| Gate | Command / Check | Scope | Result | Evidence | Notes |
| ---- | --------------- | ----- | ------ | -------- | ----- |
| test | \`node -e "process.exit(0)"\` | repo | passed | exit 0 | |
| independent-review | \`_docs/reviews/review-001-fix-login-timeout.md\` | review | passed | Critical: 0 | |
`;
