# Readiness Assessment: PRD-041 — A Close That Writes the State It Claims

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-041-close-writes-its-own-state.md` |
| Score                  | 6.2/10 |
| Verdict                | ITERATE |
| Iteration              | 1 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed per supplied measured run; local rerun was blocked before lint by read-only-sandbox `EPERM` while refreshing `_state/prds.json` |
| State Record           | pending — read-only sandbox |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | The write point, failed-post-merge state, resume path, and lease-deletion commit transaction remain underspecified. |
| Phase 6 (Audit)     | — | Re-score after the PRD defines those state transitions and their tests. |

---

## Analysis

### 1. Technical Depth & Architecture

`archivePrdArtifacts` is the existing owner of the artifact move and archive commit. Its pathspec includes both destination and former paths, so a status mutation performed before its `git commit` can carry the resulting artifact bytes. The PRD is correct that the archive commit can own those bytes.

The chosen timing is not yet safe. Archive runs before the local merge and before post-merge gates. If a post-merge gate fails, `merge.ts` resets the base checkout to its pre-merge SHA but deliberately leaves the feature branch intact. The feature branch therefore retains completed-path artifacts saying `Ship Verified` even though the close failed. The PRD says only that a merge-time write would be reverted; it does not specify the actual feature/base states, lease state, or recovery command after this failure.

FR-1 also names a configuration member that does not exist. `StatusVocabConfig` has no `statusVocab.complete`; the shipped value is `config.statusVocab.aliases.complete`, currently `Ship Verified`. The PRD must either name that existing path and require that its value is canonical, or explicitly introduce a dedicated terminal-status configuration field.

FR-4 is incomplete against its target. Current `isImplemented` has three success arms: configured implemented status, completed PRD location, and presence of a summary artifact. “Instead of the artifact’s location” does not unambiguously require removal of both non-status fallbacks.

The corpus claim is false:

- The current snapshot has 43 records.
- Existing `isImplemented` counts 39.
- A status-only `statusVocab.implemented` predicate counts 38.
- `PRD-023` is `Superseded` in `completed/`, so the board count necessarily falls from 39 to 38.
- The published self-hosting figure is separately derived from exact `Ship Verified` statuses and is currently 37. `pnpm verify:doc-claims` is runnable and passed, but it does not exercise `isImplemented`; it can remain green regardless of the FR-4 regression.

The archive also stages `_state/prds.json` as built before archive/status mutation. The PRD does not say whether the close must regenerate and commit the terminal status and completed paths into that snapshot.

### 2. Edge Cases & Failure Modes

FR-2 is internally inconsistent: it says the write “refuses” when already terminal, while §6 says that case is a no-op and the run continues. It also leaves “terminal” undefined—exactly `aliases.complete`, any member of `implemented`, or another terminal lifecycle status.

Status-level idempotency does not make `--from-phase=7` resumable. The declared `gate-run-resume-after-archive` record says the resumed chain re-evaluates memory gates against archived paths and can fail because `main` still contains the wip path. The PRD neither changes that behavior nor specifies automatic unarchive/recovery.

The status mutation needs a preflight transaction: both artifacts should be validated before either is edited or moved. Otherwise a missing or malformed second status line can leave the first artifact mutated and the archive partially staged. Duplicate status lines and mismatched PRD/task states are also unspecified.

FR-3 covers only the measured committed-lease case. It does not define:

- No lease found.
- Lease existed but was untracked or ignored, so deletion produces nothing commit-worthy.
- The exact protected-base branch and working directory used in worktree mode.
- Commit message and pathspec.
- Commit-hook failure after the source merge has already landed.
- A new claimant recreating the lease between mutex-protected deletion and an unprotected commit.

The last case is material: `releaseLease` releases its mutex before returning to `runRun`, so a commit added only in `cli.ts` can race a new claim and record the wrong bytes. Worktree cleanup already occurs inside the mutex, but the plain-close path does not expose an equivalent atomic delete-and-stage operation.

### 3. Maintainability & DX

Using the existing status reader is directionally correct, but `getMetaValue` returns only a value, not the exact source span to replace. “Do not add a second regex” therefore needs a named writer/parser extension and explicit behavior for every accepted metadata-line form.

The verification table points FR-3 at `cli.test.ts`, while Implementation Scope and Conflict Surface name `chain.test.ts` and `cli-state.test.ts`, not `cli.test.ts`. `STATUS.md` is an FR-5 target and Implementation Scope entry but is absent from Conflict Surface. The declared learning output is also outside Conflict Surface. Combined with “DO NOT touch paths outside the Conflict Surface,” the PRD currently forbids required work.

The value arithmetic is correct:

`4×.25 + 5×.25 + 3×.20 + 2×.15 + 3×.15 = 3.60`.

Axis judgment:

- MF 4: reasonable intent, but terminal-before-post-merge semantics prevent a higher score.
- UI 5: justified by the measured adopter failure and blocked next claim.
- TL 3: reasonable for localized close-state reliability.
- AR 2: conservative but defensible; this improves adopter DX without adding documentation or examples.
- RM 3: not yet supported because the design adds git commits around mutex, hook, resume, and auto-revert boundaries. On the present specification RM is closer to 2, which would yield 3.45.

### 4. Migration & Rollback

The protected-base claim is correct: `scripts/base-branch-guard.mjs` explicitly permits `_state/`, including deletions, on `main`.

The PRD does not specify the cleanup commit’s branch, timing, message, or failure policy. It also lacks a rollback plan for a close that may now produce an archive commit, merge commit, terminal-state commit, and lease-deletion commit.

A simple “git revert the implementation” does not repair already-closed artifacts or restore a deleted active lease. Deployment ordering and compatibility with close attempts started on the previous CLI are likewise absent.

### 5. Memory Inputs

- `no-completed-done-status-alias`: relevant to canonical output, but the rationale conflates writing the configured canonical value with accepting a terminal alias as author input. The exact configuration path is misstated.
- `metadata-declares-what-it-cannot-provide`: conceptually relevant, though it has no matching watch. It should result in a read-back/coherence assertion, not only prose.
- `gate-run-resume-after-archive`: directly relevant and watch-matched, but not actually applied. The record says status idempotency alone cannot make the archived-path resume work.
- `assert-absent-needs-an-independent-cause`: relevant to the missing-status regression. The PRD does not require the stated mutation check or paired positive creator.
- `strictness-added-during-extraction-is-a-behavior-change`: watch-matched and relevant, but the compatibility surface and existing-status corpus are not pinned.
- `fixture-must-reach-production-shape`: watch-matched and crucial. FR-3 does not yet require both tracked and untracked lease shapes or the real mutex/cleanup sequence.
- `free-text-field-is-the-unread-drift-ledger`: its `_state/**` watch does not overlap a declared FR Target. The disposition is peripheral, while the more direct stale `_state/prds.json` issue is omitted.
- `docs-outlive-the-gate-they-promise`: watch-matched through `STATUS.md`, but deleting a resolved deferral is only loosely related to the record’s shipped-check/future-prose failure mode.
- `a-rule-corrected-survives-where-it-is-restated`: useful consistency guidance, but its `_prds/**` watch is not a declared implementation target. The FR-2 contradiction and test-path mismatch show the promised sweep has not yet held.

Deterministic watch matching over all five declared FR target paths found four active overlaps: `docs-outlive-the-gate-they-promise`, `fixture-must-reach-production-shape`, `gate-run-resume-after-archive`, and `strictness-added-during-extraction-is-a-behavior-change`. All four are declared; no active watch-overlapping record is missing.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15% | 6/10 | Clarity gate is capped at 7: DO NOT omits project-wide prohibitions; configuration member, FR-2 behavior, FR-3 transaction, and scope/test paths conflict. |
| 2         | Completeness             | 20% | 5/10 | Failed post-merge state, archived resume, status-write atomicity, lease variants, snapshot regeneration, and rollback are missing. |
| 3         | Technical Depth          | 25% | 5/10 | Correctly identifies archive ownership, but misses the auto-revert branch state, mutex/commit race, second `isImplemented` fallback, and actual corpus delta. |
| 4         | Multi-Tenancy & Security | 20% | 10/10 | Local repository state only; no tenant, auth, permission, endpoint, or data-leakage surface is introduced. |
| 5         | Scope & Testability      | 10% | 6/10 | Useful adopter smoke coverage, but scope files disagree and key failure/concurrency cases lack named tests. |
| 6         | Migration & Rollback     | 10% | 4/10 | Base-path legality is verified, but multi-commit ordering, hook failure, backward compatibility, and undo behavior are unspecified. |
| **Total** | **Weighted**             |        | **6.2/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — `core/state/query.ts` is a local state predicate, not a protected auth/query surface; no deny-path test is required.
- Contract cap: not tripped — no client→server payload or schema contract is introduced.
- Lint cap: not tripped — the supplied measured `node packages/provegate/dist/cli.js check PRD-041` passed. The scorer’s rerun was blocked before lint by sandbox `EPERM` when the CLI attempted its normal `_state/prds.json` refresh; this is the written read-only-environment waiver.
- Runtime-dependency cap: not tripped — Dependencies declares none.
- Push cap: not tripped — no push path is requested.
- Method-content cap: not tripped — no prompt, template, or schema content is changed.

---

## Missing Pieces (to reach 10/10)

1. `_prds/wip/prd-041-close-writes-its-own-state.md` — §4 FR-1/FR-2, §6, and §7: replace nonexistent `statusVocab.complete` with the exact existing configuration source, define “terminal” precisely, prevalidate both artifact headers before any mutation, specify duplicate/malformed handling, and make already-complete an explicit no-op rather than a “refusal.”

2. `_prds/wip/prd-041-close-writes-its-own-state.md` — §6 and §7 Architecture: add a transition table for archive success, merge failure, and post-merge-gate failure, naming feature/base artifact paths and statuses, lease state, and the exact retry command. Specify a recovery that makes `--from-phase=7` work without the manual unarchive procedure documented by `gate-run-resume-after-archive`.

3. `_prds/wip/prd-041-close-writes-its-own-state.md` — §4 FR-3 and §6: require the deletion commit on `merge.baseDir` after successful post-merge gates and before the handoff, under the claim mutex, with a path-scoped conventional message; define tracked, untracked/ignored, absent, recreated, and commit-hook-failure cases. Add `packages/provegate/src/core/run/release.ts` and, if worktree cleanup changes, `packages/provegate/src/core/run/worktree.ts` to Targets and Conflict Surface.

4. `_prds/wip/prd-041-close-writes-its-own-state.md` — §4 FR-4, §6, and §7: state that configured status is the sole `isImplemented` predicate and both completed-location and summary-presence fallbacks are removed. Add a fixture with both a completed PRD and present summary carrying a non-implemented status.

5. `_prds/wip/prd-041-close-writes-its-own-state.md` — §7 and §11: replace “the number must not move” with the measured expectation: board implemented count changes 39→38 because `PRD-023` is `Superseded`; the independently derived exact-`Ship Verified` figure remains 37. Keep `pnpm verify:doc-claims`, but add a runnable state-query or CLI assertion that actually exercises `isImplemented`.

6. `_prds/wip/prd-041-close-writes-its-own-state.md` — §4 FR-1, §6, and §11: specify regeneration and inclusion of `_state/prds.json` after status/path mutation, then verify a subsequent `gate status` leaves the tree clean and reports the committed terminal state.

7. `_prds/wip/prd-041-close-writes-its-own-state.md` — §8, Conflict Surface, §11, and §12: align the test path (`cli.test.ts` versus the currently declared test files), add `STATUS.md` and the declared learning output to Conflict Surface, and add the project-wide DO NOT rules for push, runtime dependencies, telemetry/network calls, hook bypass, and untraceable method content.

8. `_prds/wip/prd-041-close-writes-its-own-state.md` — add a Migration & Rollback subsection: name commit ordering, behavior for closes begun with the previous CLI, and exact recovery/revert steps for the archive/status commit and lease-deletion commit without recreating or deleting another claimant’s lease.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.2 | ITERATE | Initial independent assessment; archive ownership confirmed, but post-merge failure/resume, lease commit transaction, FR-4 corpus effect, and scope consistency remain unresolved. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- No push code path: PASS — no push behavior is requested.
- Zero `packages/provegate` runtime dependencies: PASS — Dependencies is `none`.
- No telemetry or network calls: PASS — no such behavior is in scope.
- Method content traceability: N/A — no prompts, templates, or schemas change.
- ADR compliance: PASS — no ADR change or contradiction is declared.
- Canonical status vocabulary: ITERATE — the intended configured value is correct in principle, but the PRD names a nonexistent property and does not require canonical-value validation.
- Protected-base legality: PASS — `_state/` deletions are explicitly allowed by `scripts/base-branch-guard.mjs`.
- Known-red retirement: PASS in scope — `terminal-status` and `clean-tree` are the two PRD-041 entries in `scripts/adopter-smoke.sh`; deletion must remain conditional on their assertions becoming green.
- Value header: arithmetic PASS at 3.60; RM 3 is not substantiated until the git/mutex/resume risks are closed.

---

## Verdict

ITERATE — fix the state-transition and recovery contract before Phase 3. The PRD identifies real, measured defects and chooses plausible components, but it currently permits a failed close to leave terminal artifacts on the feature branch, does not make the documented archived resume executable, under-specifies a concurrency-sensitive protected-base deletion commit, and asserts a corpus count that demonstrably moves.
