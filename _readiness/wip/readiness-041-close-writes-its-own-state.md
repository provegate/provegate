# Readiness Assessment: PRD-041 — A Close That Writes the State It Claims

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-041-close-writes-its-own-state.md` |
| Score                  | 7.8/10 |
| Verdict                | ITERATE |
| Iteration              | 2 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed per supplied `node packages/provegate/dist/cli.js check PRD-041`; local rerun reached the read-only-sandbox `EPERM` while refreshing `_state/prds.json` |
| State Record           | pending — read-only sandbox |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | Branch-specific failure state, archived resume, cleanup-hook behavior, and the corpus assertion remain ambiguous or ineffective. |
| Phase 6 (Audit)     | — | Re-score after the four open closures are corrected. |

---

## Analysis

### 1. Technical Depth & Architecture

Archive is the correct owner of the artifact-byte mutation. `archivePrdArtifacts` stages both old and completed artifact paths plus `_state/prds.json`; writing before `git mv`, or restaging the completed paths after writing, can therefore carry the terminal bytes in the archive commit. The configured value is correctly available through `normalizeStatus(config.statusVocab, 'complete')`; `statusVocab.complete` does not exist.

The auto-revert model is still stated inaccurately. `merge.ts` resets the base checkout to `preMergeSha` after a post-merge failure while leaving the feature branch intact. Consequently:

- Feature branch: completed artifacts, terminal status, archive commit retained.
- Base branch: pre-merge wip artifacts and their prior status.

The §6 table reports only terminal/completed and says the archive commit “is not reverted.” That is true only of the feature ref; the archive commit is removed from the base ref by the hard reset. The table does not name both states as iteration 1 required.

FR-4’s design is now correct. Current `isImplemented` has three arms, and the PRD explicitly removes both location and summary fallbacks. The measured corpus also holds: 43 records, `Ship Verified 37`, `Superseded 1`, `Archived 1`, `Draft 4`; status-based implemented is 38 versus completed-location 39.

The §11 corpus command is not an assertion. `gate queue --json` always exits successfully after printing the queue, and its JSON contains `ready`, `inFlight`, `blocked`, and `inReview`—not the `Implemented` status-panel metric. It neither exposes nor verifies the claimed count of 38.

### 2. Edge Cases & Failure Modes

FR-2 now distinguishes an already-terminal no-op from malformed-header refusal, closing the direct idempotency contradiction.

It does not make an already-archived close resumable by itself. Phase-7 memory gates are `nonSkippable`, including under `--from-phase=7` and `--from-phase=merge`, and they run before archive. An archived working tree can therefore fail before the new no-op is reached. The transition table acknowledges this only as “on an un-archived tree,” without specifying the unarchive operation. The claimed resume behavior remains dependent on the manual recovery recorded in `gate-run-resume-after-archive`.

FR-3 now specifies `merge.baseDir`, post-merge timing, pre-handoff placement, mutex ownership, a conventional path-scoped commit, and tracked/untracked/ignored/absent/recreated cases. The never-committed lease case is adequately covered: deleting an untracked or ignored lease produces no commit-worthy diff.

The commit-hook failure remains underdefined. The current runner deliberately degrades post-merge cleanup failures to handoff warnings because the source merge has landed. The PRD instead says to surface the hook output and leave the tree unchanged, but does not say whether the runner returns nonzero, emits the handoff card, records a warning, or what exact retry completes cleanup. No §11 row tests this fifth case.

There is also tension between “cleanup and commit are under the same claim mutex” and “another claim recreates the lease between cleanup and commit”: a conforming claim cannot enter that interval. Reappearance can still be defended against, but the PRD should describe it as an identity/reappearance check rather than a normal claim race.

### 3. Maintainability & DX

The main FR, acceptance criteria, architecture, and changelog now use the normalizer, but two stale restatements created by the rework remain:

- Memory Inputs says FR-1 writes `statusVocab.complete`.
- §12 instructs implementers to read `statusVocab.complete`.

These directly contradict FR-1 and the actual configuration types. The declared `a-rule-corrected-survives-where-it-is-restated` input was therefore not successfully applied.

Prevalidation can reuse the existing reader without extending scope: split the document into lines, use `getMetaValue(line, 'Status')` to identify accepted lines, require exactly one, and replace that line. The PRD’s ban on a second status regex is executable.

Scope, Conflict Surface, test paths, durable output, and project-wide DO NOT categories are otherwise aligned.

The value arithmetic is correct:

`4×.25 + 5×.25 + 3×.20 + 2×.15 + 3×.15 = 3.60`.

Axis judgment:

- MF 4: justified; it closes a gap between verified execution and durable workflow state, though failed-close state remains imprecise.
- UI 5: justified by the measured adopter failure and dirty-tree refusal.
- TL 3: justified for a localized close/state correction.
- AR 2: defensible; adopter reliability improves without broadening the adoption surface.
- RM 3: defensible only after the remaining branch, resume, and hook semantics are pinned; it is not conservative enough for a higher score.

### 4. Migration & Rollback

The new subsection materially improves the PRD. It names commit ordering, previous-CLI behavior, archive rollback, lease rollback, and a refusal trigger. The protected-base claim is correct: `scripts/base-branch-guard.mjs` permits `_state/` paths and checks deletions.

Rollback remains dependent on understanding which ref contains the archive commit after merge or post-merge failure. Correcting §6’s branch-specific state table will make the existing rollback directions executable without changing the overall design.

### 5. Memory Inputs

- `no-completed-done-status-alias`: relevant, but its disposition still names nonexistent `statusVocab.complete` and fails to explain why using the `complete` alias internally to derive a canonical output is distinct from accepting it as author input.
- `metadata-declares-what-it-cannot-provide`: relevant and now applied through archive-commit and regenerated-state coherence requirements.
- `gate-run-resume-after-archive`: directly relevant but only partially applied; status idempotency does not bypass the non-skippable memory gates that fail on an already-archived tree.
- `assert-absent-needs-an-independent-cause`: relevant to malformed-header tests. The zero/two-line fixtures are named, but §11 still does not require the record’s mutation check proving removal of prevalidation makes the test fail.
- `strictness-added-during-extraction-is-a-behavior-change`: relevant and adequately reviewed; the new refusal is explicitly identified as new behavior and its accepted/refused cases are pinned.
- `fixture-must-reach-production-shape`: relevant and improved by targeting the real `runRun` cleanup sequence and tracked/untracked lease shapes.
- `free-text-field-is-the-unread-drift-ledger`: peripheral; its `_state/**` watch does not overlap a declared FR Target, and the rationale correctly records that no lease-schema field is added.
- `docs-outlive-the-gate-they-promise`: relevant to removing the resolved `STATUS.md` deferral.
- `a-rule-corrected-survives-where-it-is-restated`: highly relevant and not successfully applied; stale `statusVocab.complete` instructions survived in Memory Inputs and §12.

Active watch overlaps are unchanged and all are declared: `gate-run-resume-after-archive`, `strictness-added-during-extraction-is-a-behavior-change`, `fixture-must-reach-production-shape`, and `docs-outlive-the-gate-they-promise`. No active watch-overlapping record is missing.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15% | 7/10 | Structural Clarity-gate requirements pass, but stale vocabulary instructions, branch-conflated transitions, and unspecified hook outcome prevent autonomous execution. |
| 2         | Completeness             | 20% | 7/10 | Most cases are now covered; archived resume, hook failure, and the ineffective corpus check remain open. |
| 3         | Technical Depth          | 25% | 7/10 | Good archive, mutex, and predicate design, but the rework misstates auto-revert ref state and mistakes queue output for an implemented-count assertion. |
| 4         | Multi-Tenancy & Security | 20% | 10/10 | Local repository-state operations only; no tenant, auth, endpoint, permission, or protected data surface is introduced. |
| 5         | Scope & Testability      | 10% | 8/10 | Scope and test files now agree; the hook case lacks a test and `queue --json` cannot verify the stated count. |
| 6         | Migration & Rollback     | 10% | 8/10 | Ordering, old-CLI compatibility, and rollback are present; ref-specific recovery still needs correction. |
| **Total** | **Weighted**             |        | **7.8/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, authorization, or server query surface is touched; no deny-path test is required.
- Contract cap: not tripped — no client→server payload or schema contract is introduced.
- Lint cap: not tripped — the supplied measured `gate check PRD-041` passed. Local verification was blocked only by read-only-sandbox `EPERM` while the CLI attempted `_state/prds.json.58890.tmp`.
- Runtime-dependency cap: not tripped — Dependencies remains `none`.
- Push cap: not tripped — no push path is introduced.
- Method-content cap: not tripped — no prompt, template, or schema content is changed.

---

## Missing Pieces (to reach 10/10)

### Iteration-1 Closure Audit

| Iteration-1 item | State | Evidence checked and exact remaining change |
| ---------------- | ----- | ------------------------------------------- |
| 1. Terminal source, atomic prevalidation, and no-op semantics | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1/FR-2 are corrected, but Memory Inputs and §12 still say `statusVocab.complete`. Replace both with `normalizeStatus(config.statusVocab, 'complete')`; in §11 also require the zero-line refusal test to fail when prevalidation is mutation-disabled. |
| 2. Archive/merge/post-merge transition and resume model | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — §6: split merge-failure and auto-revert rows into feature-ref and base-ref states. State that base returns to wip/prior status while the feature retains completed/terminal artifacts. Replace “on an un-archived tree” with the exact unarchive-and-commit recovery steps before `gate run --from-phase=7 PRD-NNN`, or scope a runner change that makes the archived form resumable directly. |
| 3. Atomic lease-deletion commit | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-3, §6, and §11: retain the now-correct branch/message/timing/mutex cases, but specify whether commit-hook failure returns 1 or produces a warning/handoff, name the exact retry command, and add a `packages/provegate/test/cli.test.ts` row exercising the failing hook. Reword the recreated case as reappearance/identity revalidation inside the mutex. |
| 4. Remove both `isImplemented` fallbacks | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-4 and §6 explicitly remove completed-location and summary-presence fallbacks and name a combined negative fixture. No further change. |
| 5. Correct corpus counts and assert the predicate | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — §7’s counts are correct, but §11’s `gate queue --json` command cannot expose or assert `Implemented: 38`. Replace that row with a named `packages/provegate/test/cli-state.test.ts` corpus test that calls the status metric/`isImplemented`, asserts 38, and proves completed `Superseded` is false. |
| 6. Regenerate and commit `_state/prds.json` | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1, §6, §7, and §11 now require regenerated state in the archive commit and a clean subsequent status run. Existing archive pathspec already permits those bytes. No further change. |
| 7. Align scope, tests, Conflict Surface, and DO NOT rules | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — §8, Conflict Surface, and test paths are aligned, and project-wide prohibitions are present. Correct the remaining §12 `statusVocab.complete` instruction to the normalizer call; the present DO NOT directs implementation toward a nonexistent property. |
| 8. Migration and rollback | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — §7 Migration & Rollback now covers ordering, previous-CLI artifacts, archive/lease reversal, and rollback trigger. No further standalone subsection change beyond the ref-state correction in item 2. |

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.2 | ITERATE | Archive ownership confirmed; post-merge failure/resume, lease transaction, FR-4 corpus effect, state regeneration, and scope consistency were unresolved. |
| 2   | 2026-08-07 | 7.8 | ITERATE | Normalizer, prevalidation, no-op semantics, both FR-4 fallback removals, measured counts, state regeneration, scope, and rollback improved. Remaining defects are stale `statusVocab.complete` restatements, branch-conflated auto-revert state, incomplete archived resume/hook behavior, and a queue command that cannot assert the implemented count. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- No push code path: PASS — no push behavior is requested.
- Zero `packages/provegate` runtime dependencies: PASS — Dependencies is `none`.
- No telemetry or network calls: PASS — none are in scope.
- Method content traceability: N/A — no prompt, template, or schema content changes.
- ADR compliance: PASS — no active ADR is contradicted.
- Canonical status vocabulary: ITERATE — FR-1 is correct, but Memory Inputs and §12 still direct use of nonexistent `statusVocab.complete`.
- Protected-base legality: PASS — `_state/` deletions are explicitly permitted, including on `main`.
- Known-red retirement: PASS in scope — `terminal-status` and `clean-tree` are exactly the two PRD-041 entries in `scripts/adopter-smoke.sh`.
- FR-4 measured corpus: PASS — 39 location-based versus 38 status-based; exact `Ship Verified` remains 37.
- Published-doc check: PASS — `pnpm verify:doc-claims` completed with six documents scanned and zero violations.
- Value header: arithmetic PASS at 3.60; MF/UI/TL/AR/RM dispositions are reasonable, with RM contingent on closing the remaining failure semantics.

---

## Verdict

ITERATE — the rework closes most of iteration 1, but not enough for Phase 3. Correct the two stale vocabulary instructions, state auto-revert separately for base and feature refs, make archived resume and commit-hook failure executable, and replace `queue --json` with a check that can actually fail when the implemented predicate or count is wrong.
