# Readiness Assessment: PRD-007 — Worktree Lifecycle

## Quick Meta

| Field                  | Value                                         |
| ---------------------- | --------------------------------------------- |
| PRD                    | `_prds/wip/prd-007-worktree-lifecycle.md`     |
| Score                  | 8.4/10                                        |
| Verdict                | PASS                                          |
| Iteration              | 1                                             |
| Model Tier (Execution) | high                                          |
| Model Tier (Audit)     | high                                          |
| Scored by              | Claude (Fable 5) — same session as PRD author |
| Self-scored            | yes (watch items are binding Phase 3 tasks)   |
| Date                   | 2026-07-23                                    |
| PRD Lint               | passed — `gate check PRD-007` exit 0          |
| State Record           | updated                                       |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale                                                                                    |
| ------------------- | ---- | -------------------------------------------------------------------------------------------- |
| Phase 4 (Execution) | high | Merge-phase relocation touches the runner's most dangerous path; git state machines are subtle. |
| Phase 6 (Audit)     | high | Reviewer attacks rollback atomicity, dirty-tree handling, and base-checkout invariants.        |

---

## Analysis

### 1. Technical Depth & Architecture

- Correctly leans on existing halves: lease schema fields, `migrateWorktreeLocks`,
  `mainRepoRoot`, claim mutex — no new lock concepts, no schema change.
- The §7 merge-relocation analysis is the PRD's core insight: a worktree cannot
  check out the base branch, so every base operation must run `git -C <mainRoot>`.
  Naming this in the PRD (instead of discovering it mid-implementation) is what
  makes the scope honest.
- Provisioning inside the mutex hold keeps claim+checkout atomic without a second
  synchronization concept.

### 2. Edge Cases & Failure Modes

- **Rollback window (W2)**: branch created, worktree add fails → rollback must
  remove BOTH the lease and the just-created branch, or the next attempt hits the
  "branch exists" refusal it itself caused. Bound as task.
- **Base checkout state (W1)**: merge relocation assumes the main checkout is on
  the base branch and clean. Dirty main checkout or wrong branch → refusal with
  named state, never a stash or forced checkout. Bound as task.
- **Dirty worktree at cleanup (W3)**: `git worktree remove` refuses; the close is
  already landed, so the refusal degrades to a warning on the card — the merge is
  never rolled back for a cleanup failure.
- **Guard inversion (W1)**: the existing "run from the feature branch" guard must
  flip semantics in worktree mode without weakening the non-worktree path — both
  modes tested byte-identical where they claim to be.

### 3. Maintainability & DX

- One new module; `open.ts` gains a flag, not a second code path through claim
  internals.
- The manual worktree path stays supported — external managers keep working,
  which keeps the lock layer platform-agnostic (roadmap risk table).

### 4. Migration & Rollback

- Purely additive; no state or schema changes; revert = git revert. Leases
  without stamps behave exactly as today (asserted in FR-5).

---

## Scorecard (feature weights)

| Dimension                | Weight | Score | Notes                                                  |
| ------------------------ | ------ | ----- | ------------------------------------------------------ |
| Clarity                  | 15%    | 8.5   | FRs precise; cleanup ordering nailed in stories        |
| Completeness             | 20%    | 8.0   | Rollback + base-state edges found in scoring, bound    |
| Technical Depth          | 25%    | 8.5   | Merge relocation analyzed up front; mutex reuse        |
| Multi-Tenancy & Security | 20%    | 8.0   | Local fs+git only; containment + no-force discipline   |
| Scope & Testability      | 10%    | 8.5   | Real-git tests have precedent (r8 recipe); heavier setup |
| Migration & Rollback     | 10%    | 9.0   | Additive; schema untouched                             |

**Weighted: 8.4 — PASS.** Hard caps: security N/A (no protected route/endpoint;
refusal paths enumerated as named tests), contract N/A (no client→server payload),
lint passed.

---

## Watch Items (binding on Phase 3)

- **W1 — merge relocation audit**: enumerate every `merge.ts`/`chain.ts` git call
  that assumes in-place checkout; each gets a `git -C <mainRoot>` route + a test;
  the branch guard inverts in worktree mode and both modes are tested.
- **W2 — full rollback**: provisioning failure removes lease AND branch AND any
  partial worktree, inside the mutex hold; test plants each failure point.
- **W3 — cleanup degrades, never reverts**: post-merge cleanup failures are card
  warnings; the landed merge is immutable; dirty-tree test asserts the warning.
- **W4 — containment first**: worktree path containment-checked before the first
  git invocation; escape attempt test (`worktree.dir` pointing outside).

---

## Verdict

**PASS** — proceed to Phase 3 task generation on the owner's Go. Recommend
implementing BEFORE PRD-008 (both touch `open.ts`/`cli.ts`; 007 is the larger
rebase burden) and claiming surfaces sequentially.
