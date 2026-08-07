# Readiness Assessment: PRD-041 — A Close That Writes the State It Claims

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-041-close-writes-its-own-state.md` |
| Score                  | 7.9/10 |
| Verdict                | ITERATE |
| Iteration              | 4 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — supplied `node packages/provegate/dist/cli.js check PRD-041` result; independent rerun was prevented by read-only `EPERM` while refreshing `_state/prds.json` |
| State Record           | pending — read-only sandbox |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | The retry regressions are closed, but the automatic terminal write still makes the committed case-study projection stale, and the PRD names no executable regeneration point. |
| Phase 6 (Audit)     | — | Re-score after the archive-time projection and corpus-evidence contradictions are corrected. |

---

## Analysis

### 1. Technical Depth & Architecture

Archive is the correct owner of FR-1. `archivePrdArtifacts` already stages both sides of each move and commits the old paths, completed paths, and `_state/prds.json`. If both status bytes and the regenerated state are written before its path-scoped commit, those bytes will be carried by that commit.

The terminal source is correct: `defaults.ts` defines `statusVocab.aliases.complete`, and the PRD consistently uses `normalizeStatus(config.statusVocab, 'complete')` rather than a nonexistent field or literal.

The auto-revert model is also correct. Both `mergeInWorktree` and `mergeSingleCheckout` reset the base checkout to `preMergeSha` after a failed post-merge command; the feature branch’s archive commit remains intact. The PRD accurately places the status write inside that feature commit and outside the reverted base merge.

FR-4 correctly removes both current fallbacks from `isImplemented`: completed PRD location and present summary. The direct uncached corpus script is an appropriate response to `_state/prds.json` not being a Turbo package input.

The remaining architecture failure is the published projection. Current measured values are:

- `Ship Verified`: 37
- status-based implemented: 38
- completed-location PRDs: 39
- `PRD-023`: `Superseded`, completed PRD, **summary missing**

PRD-041’s own archive makes status-based implemented 39 and `Ship Verified` 38. The case study currently publishes 37. `verify:doc-claims` passes before archive, but after FR-1 changes the state it will fail unless the generated region is rewritten after state regeneration and before the archive commit. The PRD claims Phase 7 performs that regeneration, but `gates.manifest.json` only runs `pnpm verify:brain` in phase 7, and no FR, target, command, or scoped file introduces such a write point.

### 2. Edge Cases & Failure Modes

The iteration-3 retry defects are closed:

- Every archived-state recovery now returns artifacts to `wip`, commits the moves, and resumes from phase 7.
- The PRD explicitly rejects `--from-phase=merge` because `shouldSkipGate` preserves the memory gates.
- FR-3 now names the exact path-scoped `git commit` retry instead of the non-recovering `gate release`.
- The FR-3 verification row requires that exact retry to land the pending deletion.

FR-2 is sufficiently explicit for a resumed close: an already-terminal status is a write no-op, while archive may still move and commit the artifacts again after the documented unarchive sequence. Zero and duplicate status lines refuse before either artifact is modified.

FR-3 specifies the base checkout, post-merge timing, mutex, message, path scoping, tracked/untracked/ignored/absent cases, and parallel-recreation guard. `base-branch-guard.mjs` permits `_state/` commits on `main` and inspects deletions, so the protected-base claim holds. A lease never committed in the first place is untracked or ignored; unlinking it leaves no Git deletion to commit, as specified.

The corpus evidence contains one false fixture description. `_state/prds.json` shows `PRD-023` has no summary, contrary to §6 and §7. It remains a valid location-fallback case, while the named fixture test covers the separate present-summary fallback.

### 3. Maintainability & DX

The direct `node scripts/check-implemented-predicate.mjs` command avoids the stale-Turbo-input defect and is runnable in form. The script does not exist yet, which is expected at readiness, but §11 clearly requires it to call the real predicate, compare every result with membership in `statusVocab.implemented`, and prove `PRD-023` false.

The stale projection is a recurring maintenance defect, not merely a baseline typo. Every future automatically terminal close changes the generated case-study figures. A generic archive-time projection hook, an earlier status transition, or another explicitly specified mechanism is required; prose claiming Phase 7 regenerates it is not wiring.

The two PRD-041 entries in `scripts/adopter-smoke.sh` are exactly `terminal-status` and `clean-tree`, and FR-5 correctly requires deleting them. Its stale-entry behavior reflects `known-red-ledger-must-expire`.

Value arithmetic is correct:

`4×.25 + 5×.25 + 3×.20 + 2×.15 + 3×.15 = 3.60`.

Axis judgment:

- MF 4: justified; the runner’s committed state is brought into agreement with its gate result.
- UI 5: justified by the reproduced adopter status and dirty-tree failures.
- TL 3: justified for a localized correction to the central close path.
- AR 2: justified; this improves adopter reliability without materially widening reach.
- RM 3: not yet justified. Automatically creating a stale committed case-study projection is standing maintenance risk; RM remains effectively 2 until the projection lifecycle is specified.

### 4. Migration & Rollback

The archived-state recovery is now executable: unarchive, commit the moves, and resume from phase 7. The feature/base states after merge failure and auto-revert match `merge.ts`.

Commit ordering and lease rollback are otherwise adequate: archive commit → merge → post-merge verification → lease-deletion commit → handoff. Reverting the archive returns the artifacts and prior status; reverting the cleanup commit restores the lease.

Migration remains incomplete for derived documentation. Previous-CLI artifacts are addressed, but every future close changes the case-study projection after the existing phase-4 `verify:workflow` check has already run. The PRD must define where that projection write executes and how its bytes enter the same archive commit.

### 5. Memory Inputs

- `no-completed-done-status-alias`: relevant and applied; the runner derives the configured terminal output rather than accepting an author-written terminal alias.
- `turbo-cache-masks-out-of-input-reads`: relevant and applied; the corpus check is direct and uncached.
- `metadata-declares-what-it-cannot-provide`: relevant and applied to artifact/state coherence.
- `gate-run-resume-after-archive`: directly relevant and now applied through committed unarchive moves followed by phase 7.
- `assert-absent-needs-an-independent-cause`: relevant; the zero/duplicate fixtures must preserve the independent archive mechanism.
- `strictness-added-during-extraction-is-a-behavior-change`: relevant and reasonably reviewed; the new refusal behavior is explicit.
- `fixture-must-reach-production-shape`: relevant; FR-3 requires testing through `runRun`.
- `free-text-field-is-the-unread-drift-ledger`: peripheral but defensibly reviewed; no lease-schema field is introduced.
- `docs-outlive-the-gate-they-promise`: relevant to removing the resolved STATUS deferral.
- `a-rule-corrected-survives-where-it-is-restated`: relevant but not successfully applied; §11 retains “stays 37,” while §7 correctly says PRD-041 makes it 38, and the `PRD-023` summary claim is also stale.
- Missing relevant dispositions: `known-red-ledger-must-expire` for FR-5 and `cleanup-after-verified-merge` for FR-3.
- Missing active watch-overlap input: none. Every active record whose `watch` overlaps a declared FR Target is named.
- Memory Output: appropriate and repeated in Durable Artifacts.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15% | 7/10 | Structural Clarity gate passes, but §7 and §11 disagree about the published figure and no executable projection write point is named. |
| 2         | Completeness             | 20% | 7/10 | Retry and lease recovery are complete; derived-document coherence and two relevant memory dispositions remain absent. |
| 3         | Technical Depth          | 25% | 8/10 | Archive, auto-revert, idempotency, predicate, and cleanup states are strong; the cross-gate projection transition remains unresolved. |
| 4         | Multi-Tenancy & Security | 20% | 10/10 | Repository-local workflow state only; no tenant, auth, endpoint, permission, or protected-data surface. |
| 5         | Scope & Testability      | 10% | 7/10 | Predicate testing is well shaped, but `PRD-023` is misdescribed and the required case-study write is outside the declared scope. |
| 6         | Migration & Rollback     | 10% | 7/10 | Archived retries are corrected; recurring projection migration has no specified mechanism. |
| **Total** | **Weighted**             |        | **7.9/10** | **ITERATE** |

Weighted total: 7.85, reported as 7.9.

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, authorization, permission, or tenant query is touched; deny-path test is not applicable.
- Contract cap: not tripped — no client→server payload or schema contract is introduced.
- Lint cap: not tripped — supplied `gate check PRD-041` evidence passes; the independent rerun reached only the sandbox’s prohibited state-refresh write.
- Runtime-dependency cap: not tripped — Dependencies is `none`.
- Push cap: not tripped — no remote-push path is introduced.
- Method-content cap: not tripped — no prompt, template, schema, or other method content is changed.

---

## Missing Pieces (to reach 10/10)

### Iteration-3 Missing Piece Closure Audit

| Iteration-3 item | State | Evidence checked and exact change |
| ---------------- | ----- | --------------------------------- |
| 1. Terminal source, atomic prevalidation, and no-op semantics | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1, FR-2, §6, §7, Memory Inputs, and §12 consistently use `normalizeStatus(config.statusVocab, 'complete')`; zero/duplicate validation precedes mutation and terminal status is a no-op. Exact change: none. |
| 2. Archive/merge/post-merge transition and resume model | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — §6 and §7 require unarchive, **commit the moves**, then `gate run --from-phase=7`; they explicitly reject `--from-phase=merge` because memory gates still read `wip`. Exact change: none. |
| 3. Atomic lease-deletion commit | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-3 and §11 replace `gate release` with `git commit -m "chore(state): release PRD-NNN lease" -- <lease path>` from the base checkout and require the retry to land the deletion. Exact change: none. |
| 4. Remove both `isImplemented` fallbacks | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-4 removes completed-location and summary-presence fallbacks; §11 includes a combined fixture. Exact change: none. |
| 5. Correct corpus counts and assert the predicate | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — §6, §7, and §11: correct `PRD-023` to “summary missing”; replace “the Ship Verified figure stays 37” with the actual post-close value 38; add a concrete post-status/pre-commit projection step that runs `scripts/derive-self-hosting-figures.mjs --write` after regenerated state exists. |
| 6. Regenerate and commit `_state/prds.json` | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1 and §11 require regeneration before the archive commit; `packages/provegate/src/core/run/archive.ts` already includes the state path in its commit pathspec. Exact change: none. |
| 7. Align scope, tests, Conflict Surface, and Memory Inputs | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR Targets, §8, Conflict Surface, §11, and Memory Inputs: add the chosen archive-time projection mechanism and every file it changes, including `apps/docs/content/docs/case-study.mdx`; add dispositions for `known-red-ledger-must-expire` and `cleanup-after-verified-merge`. |
| 8. Migration and rollback | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — §7 Migration & Rollback: retain the corrected unarchive-and-commit retry, and add the exact lifecycle for regenerating and committing the self-hosting projection on PRD-041 and every later automatic terminal write. |

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.2 | ITERATE | Archive ownership confirmed; post-merge recovery, lease transaction, corpus effects, state regeneration, and scope were unresolved. |
| 2   | 2026-08-07 | 7.8 | ITERATE | Normalizer, prevalidation, fallback removal, measured counts, state regeneration, and rollback improved; four closures remained open. |
| 3   | 2026-08-07 | 7.6 | ITERATE | Vocabulary and branch states passed; the new `gate release` retry, archived retries, and absolute corpus pins regressed. |
| 4   | 2026-08-07 | 7.9 | ITERATE | Exact lease retry and archived-state recovery now pass. The claimed Phase-7 projection regeneration is not wired or scoped, §11 still pins 37, and `PRD-023` is falsely described as having a summary. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- No push code path: PASS — no push behavior is proposed.
- Zero `packages/provegate` runtime dependencies: PASS — Dependencies is `none`.
- No telemetry or network calls: PASS — none are in scope.
- Method content traceability: N/A — no prompt, template, or schema changes.
- ADR compliance: PASS — no active ADR is contradicted.
- Canonical status vocabulary: PASS — operative sections use the normalizer and forbid a literal.
- Protected-base legality: PASS — `_state/` deletions are permitted and inspected by `base-branch-guard.mjs`.
- Lease retry: PASS — branch, message, timing, path scoping, and failed-hook retry are specified.
- Known-red targets: PASS — `terminal-status` and `clean-tree` are the two PRD-041 entries.
- Current corpus counts: PASS — 37 Ship Verified, 38 status-implemented, 39 completed-location.
- Post-close counts: PASS in §7 — 38 Ship Verified and 39 status-implemented.
- `PRD-023` predicate: PASS as a location-fallback case; its claimed present summary is false.
- Published projection: ITERATE — the committed case study remains 37 and no archive-time regeneration mechanism is defined.
- Value header: arithmetic PASS at 3.60; MF/UI/TL/AR are justified, while RM 3 depends on closing the projection lifecycle.

---

## Verdict

ITERATE — the iteration-3 retry regressions are genuinely closed. Phase 3 remains blocked because FR-1’s own terminal write changes the published figure after the existing verification phase, while the PRD only claims—without a target, command, scope entry, or executable hook—that Phase 7 regenerates it. The stale §11 value and false `PRD-023` summary description are direct evidence that the new correction did not survive all restatements.
