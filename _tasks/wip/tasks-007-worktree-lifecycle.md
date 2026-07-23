# Tasks: Worktree Lifecycle — Claim to Checkout in One Step

> **PRD**: [prd-007-worktree-lifecycle.md](../../_prds/wip/prd-007-worktree-lifecycle.md)
> **Readiness**: [readiness-007-worktree-lifecycle.md](../../_readiness/wip/readiness-007-worktree-lifecycle.md)
> **Status**: Phase 5 Complete — Testing Verified
> **Readiness Score**: 8.4/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-23
> **Updated**: 2026-07-23

## Task Outcome Rules

- `[x]` = completed as written; operator-owned stays unchecked; decisions →
  **Deferrals & Decisions**; operator work → **Operator Handoff**.

## Technical Standards Reference

- Engine: TS strict, no `any`, zero deps, no push paths, containment before any
  git call; git via `execFileSync` (io.ts pattern).
- W1: merge relocation — every in-place `git checkout`/merge assumption in
  `merge.ts`/`chain.ts` enumerated and routed `git -C <mainRoot>`; branch guard
  inverts in worktree mode; both modes tested.
- W2: full rollback — provisioning failure removes lease AND branch AND partial
  worktree, inside the same mutex hold.
- W3: cleanup degrades, never reverts — post-merge cleanup failures are card
  warnings; landed merge immutable.
- W4: containment first — worktree path checked before the first git invocation.
- Never `worktree remove --force`, never `branch -D`. Lease schema frozen.

## Relevant Files

- `packages/provegate/src/core/run/worktree.ts` (new) — create/remove
- `packages/provegate/src/core/run/open.ts` — `--worktree` claim mode
- `packages/provegate/src/core/run/merge.ts`, `cards.ts` — relocation + cleanup
- `packages/provegate/src/cli.ts`, `src/index.ts` — flag + exports
- `packages/provegate/test/worktree.test.ts` (new), `test/open.test.ts`
- `packages/provegate/QUICKSTART.md`, `apps/docs/content/docs/cli.mdx`

## Tasks

- [x] 1.0 Pre-flight
  - [x] 1.1 Branch `feat/prd-007-worktree-lifecycle`; lease via `gate open PRD-007`;
        baseline green
- [x] 2.0 `worktree.ts` (FR-1, W4)
  - [x] 2.1 `createWorktree`: path under `worktree.dir` on `mainRepoRoot`,
        containment-checked BEFORE git; `git branch <name> <base>` +
        `git worktree add <path> <name>`; collision (branch or path) → typed refusal
  - [x] 2.2 `removeWorktree`: `git worktree remove` (never `--force`) +
        `git branch -d` (never `-D`); failures returned as warnings, not throws
- [x] 3.0 `open.ts` `--worktree` (FR-2, W2)
  - [x] 3.1 `ClaimOptions.worktree`; provisioning AFTER the lease commit point,
        INSIDE the mutex hold; lease body gains `worktree`/`branch` stamps
        (validateLock prefix rule green)
  - [x] 3.2 W2 rollback: any provisioning failure → unlink installed lease, delete
        created branch, remove partial worktree; refusal names the git error;
        without `--worktree` byte-identical behavior (test-pinned)
- [x] 4.0 Merge relocation + cleanup (FR-3, W1, W3)
  - [x] 4.1 W1 audit: enumerate in-place git assumptions in `merge.ts`/`chain.ts`;
        worktree-stamped lease → base ops via `git -C <mainRoot>`; branch guard
        verifies lease.branch == worktree HEAD (non-worktree guard unchanged)
  - [x] 4.2 W3 cleanup: after post-merge gates pass → remove worktree + `branch -d`;
        dirty tree → card warning naming the path; failure pre-merge leaves
        everything intact (existing card)
- [x] 5.0 CLI + exports (FR-4)
  - [x] 5.1 `gate open PRD-XXX [--steal] [--worktree]`; usage row; `createWorktree`,
        `removeWorktree` exported from index.ts
- [x] 6.0 Tests (FR-5)
  - [x] 6.1 `worktree.test.ts` (real git repos, r8 recipe): create/remove round-trip,
        containment escape refusal, collision refusals, dirty-remove warning,
        merge-from-worktree lands on main, cleanup after green close
  - [x] 6.2 `open.test.ts` additions: stamp validation via `validateLock`, W2
        rollback matrix (branch-exists, worktree-add-fails), no-worktree
        byte-identical pin
- [x] 7.0 Docs (FR-6)
  - [x] 7.1 cli.mdx open/run rows; QUICKSTART parallel-agent recipe
- [x] 8.0 Phase 5 — §11 sweep, ledger evidence
- [ ] 9.0 Phase 6 — codex review (brief: rollback atomicity, dirty-tree handling,
        base-checkout invariants, guard inversion)
- [ ] 10.0 Phase 7 — summary; owner acceptance; close via `gate run PRD-007`

## Verification Ledger

| Gate               | Command / Check                                              | Scope     | Result  | Evidence | Notes                      |
| ------------------ | ------------------------------------------------------------ | --------- | ------- | -------- | -------------------------- |
| FR-1               | `pnpm --filter provegate test test/worktree.test.ts`         | provegate | passed  | 10/10    | create/remove, containment |
| FR-2               | `pnpm --filter provegate test test/open.test.ts`             | provegate | passed  | 15/15    | rollback, stamps           |
| FR-3               | `pnpm --filter provegate test test/worktree.test.ts`         | provegate | passed  | 10/10    | merge relocation, cleanup  |
| FR-4               | `grep -c "\-\-worktree" packages/provegate/src/cli.ts`       | provegate | passed  | 5        | usage advertises flag      |
| FR-5               | `pnpm --filter provegate test`                               | provegate | passed  | 381/381  | full suite                 |
| FR-6               | `grep -c "\-\-worktree" packages/provegate/QUICKSTART.md`    | provegate | passed  | 2        | recipe documented          |
| types              | `pnpm check-types`                                           | repo      | passed  | 0 errors |                            |
| lint               | `pnpm lint`                                                  | repo      | passed  | 0 warn   |                            |
| build              | `pnpm build`                                                 | repo      | passed  | clean    |                            |
| independent-review | `_docs/reviews/review-007-worktree-lifecycle.md`             | repo      | pending |          | verdict pass, critical = 0 |

## Deferrals & Decisions

- W1 audit result: `merge.ts` ALREADY relocates via `findBaseWorktree` →
  `mergeInWorktree` (source parity); relocation needed no rewrite. Two real bugs
  found by the tests instead: (1) git prints realpaths (macOS `/var` →
  `/private/var`) — the idempotent-refresh comparison now realpaths both sides;
  (2) the worktree dir itself made the base checkout "dirty" — `worktree.dir` is
  now a coordination path in `ensureCheckoutClean`, and `createWorktree`
  additionally writes a local-only `.git/info/exclude` entry (never a tracked
  file).
- Guard inversion implemented in the CLI (`worktreeStamps` + branch pin before
  merge), not in `mergePreconditions` — the engine guard stays mode-agnostic.
- Refresh without `--worktree` carries existing stamps forward (a plain re-open
  must not strip cleanup metadata).
- Cleanup runs LAST in `runRun` (it may delete the process cwd); handoff card
  gained an optional warnings block.
- 6.2 coverage consolidated into `test/worktree.test.ts` (rollback matrix, stamp
  validation, no-worktree pin live beside the module they test); `open.test.ts`
  itself is untouched — its 15 passing tests are the byte-identical regression
  evidence for FR-2.

## Operator Handoff

| Task | Category  | Owner | Required Check                                       | Status  | Notes               |
| ---- | --------- | ----- | ---------------------------------------------------- | ------- | ------------------- |
| 9.0  | external  | owner | Authorize codex review session                       | pending | per precedent       |
| 10.0 | manual-qa | owner | Acceptance; trigger `gate run PRD-007`; push (human) | pending | runner never pushes |

## Progress Log

| Date       | Task    | Notes                                                             |
| ---------- | ------- | ----------------------------------------------------------------- |
| 2026-07-23 | —       | Tasks generated (Go)                                              |
| 2026-07-23 | 2.0–7.0 | worktree.ts + --worktree claim + relocation audit + 10 tests + docs |
| 2026-07-23 | 8.0     | §11 sweep green: 381 tests, types/lint/build clean, hygiene clean |

## Blockers / Open Questions

- (none)
