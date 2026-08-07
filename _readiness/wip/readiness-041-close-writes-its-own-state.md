# Readiness Assessment: PRD-041 — A Close That Writes the State It Claims

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-041-close-writes-its-own-state.md` |
| Score                  | 7.9/10 |
| Verdict                | ITERATE |
| Iteration              | 5 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — supplied `node packages/provegate/dist/cli.js check PRD-041` evidence; independent rerun reached only the read-only sandbox’s `EPERM` while refreshing `_state/prds.json` |
| State Record           | pending — read-only sandbox |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | The projection fix introduces an unspecified self-host-only command into a CLI that must also close arbitrary adopter repositories. |
| Phase 6 (Audit)     | — | Re-score after the projection lifecycle has an explicit portable opt-in mechanism and the remaining declarations agree. |

---

## Analysis

### 1. Technical Depth & Architecture

Archive remains the correct write point. `archivePrdArtifacts` owns the final artifact bytes, and its path-scoped commit includes both old and completed artifact paths. Status edits made before that commit can therefore travel with the renames. It also stages `config.dirs.stateFile`, so a regenerated `_state/prds.json` can be included.

The terminal value is correctly sourced. `defaults.ts` defines `statusVocab.aliases.complete: 'Ship Verified'`; there is no `statusVocab.complete` property. The PRD consistently requires `normalizeStatus(config.statusVocab, 'complete')` rather than a literal.

The auto-revert description matches `merge.ts`: after a failed post-merge command, the base resets to `preMergeSha`, while the archive commit remains on the feature branch. The status write is therefore inside what survives on the feature ref and outside what the base auto-revert removes.

The iteration-4 projection fix creates a new architecture gap. `packages/provegate` is the shipped CLI used by arbitrary repositories, but §7 now says its Phase-7 runner executes the provegate repository’s own `scripts/derive-self-hosting-figures.mjs` and writes `apps/docs/content/docs/case-study.mdx` on every automatic terminal write. Neither path exists in the fresh adopter repository whose failure motivates this PRD. The PRD specifies no configuration field, manifest hook, capability check, or absent-path behavior that distinguishes self-hosting from an adopter close. Implementing the requirement literally would make the corrected adopter close fail during archive.

The current archive path also demonstrates why the integration must be explicit: its commit pathspec contains moved artifacts and `_state/prds.json`, but no general derived-output list. The PRD requires the case-study bytes in that commit without defining a portable mechanism for registering that output.

### 2. Edge Cases & Failure Modes

FR-2 is sufficiently explicit for `--from-phase=7`: after the required unarchive-and-commit recovery, terminal status is a write no-op, while archive may move and commit the artifacts again. Zero or duplicate status lines refuse before either artifact is changed.

FR-3 now covers the important cleanup states:

- The deletion commit is on `merge.baseDir`, after successful post-merge gates and before the handoff card.
- The message and path-scoped retry are exact.
- A tracked lease produces a deletion commit.
- An untracked, ignored, or never-committed lease produces no Git commit.
- A recreated lease is preserved.
- Hook failure exits 1 and leaves a recoverable staged deletion.

`scripts/base-branch-guard.mjs` confirms `_state/` is allowed on `main`, and its NUL-delimited status parser includes deletions.

The missing projection case is not covered: a normal adopter has neither the self-hosting script nor the case-study document. `pnpm smoke:adopter` must prove that their absence does not fail archive, while a self-hosting test must prove that an explicitly configured projection does run and enters the archive commit.

The corpus claims now match `_state/prds.json`: `PRD-023` is `Superseded`, its PRD is completed, and its summary is missing. It is therefore a location-fallback case, not a summary-fallback case.

### 3. Maintainability & DX

The direct, uncached `node scripts/check-implemented-predicate.mjs` command is the correct runnable form for a corpus check reading `_state/prds.json`. The specified predicate avoids pinning counts that will change on later closes.

The published figure is currently 37; PRD-041’s own terminal write makes it 38. The new lifecycle states the correct order—state, projection, commit—but §11 still ends with:

`pnpm verify:doc-claims` — the published figure does not move

That contradicts both the FR-4 verification row and §7, which correctly say it moves to 38. This is precisely the restatement failure described by `a-rule-corrected-survives-where-it-is-restated`.

The new output declarations are also incomplete. FR-1’s only Target is `archivePrdArtifacts`; `_state/prds.json` is absent from Implementation Scope and Conflict Surface, while the projection script is absent from Conflict Surface and neither generated output appears on FR-1’s Targets line. The changelog’s claim that both files joined all three sections is not borne out by the current file.

Value arithmetic is correct:

`4×.25 + 5×.25 + 3×.20 + 2×.15 + 3×.15 = 3.60`.

Axis judgment:

- MF 4: justified; recording gate-produced state strengthens method fidelity.
- UI 5: justified by the reproduced misleading status and dirty-tree adopter failures.
- TL 3: justified for correcting the central close and status-query paths.
- AR 2: justified; reliability improves, but reach does not materially expand.
- RM 3: not yet justified. An unspecified repository-specific command in the shipped close path creates cross-repository regression risk; RM is effectively 2 until the lifecycle is portable.

### 4. Migration & Rollback

Archive, merge, auto-revert, unarchive-and-commit recovery, and lease-deletion rollback are now specified coherently. A failed post-merge gate leaves the feature archive commit available, while the base returns to its earlier state.

The projection migration remains incomplete. §7’s lifecycle says the projection joins the archive commit, but Migration & Rollback still describes that commit as only “status + regenerated state.” It does not state what happens when the projection capability is absent, partially installed, or fails after state generation but before commit.

The necessary atomic boundary is clear: status write → state regeneration → configured projection(s) → one path-scoped archive commit. Any failure before the commit must leave no partial artifact, state, or projection mutation. That portable lifecycle is not yet specified.

### 5. Memory Inputs

- `no-completed-done-status-alias`: relevant and applied; output is derived through the configured normalizer rather than a literal.
- `cleanup-after-verified-merge`: relevant and applied; cleanup and its deletion commit occur only after post-merge verification.
- `known-red-ledger-must-expire`: relevant and applied; FR-5 removes both PRD-041 entries when their assertions become green.
- `turbo-cache-masks-out-of-input-reads`: relevant and applied; the corpus predicate check is direct and uncached.
- `metadata-declares-what-it-cannot-provide`: relevant and applied to handoff/status coherence.
- `gate-run-resume-after-archive`: directly relevant and applied through committed unarchive moves followed by phase 7.
- `assert-absent-needs-an-independent-cause`: relevant; the refusal fixtures preserve a distinct status-line failure.
- `strictness-added-during-extraction-is-a-behavior-change`: relevant and reasonably reviewed; the new refusal behavior is explicit.
- `fixture-must-reach-production-shape`: relevant; FR-3 requires exercising the production `runRun` path.
- `free-text-field-is-the-unread-drift-ledger`: peripheral but adequately reviewed; no lease-schema field is added.
- `docs-outlive-the-gate-they-promise`: relevant and applied to removing the resolved STATUS deferral.
- `a-rule-corrected-survives-where-it-is-restated`: relevant but not successfully applied; §11 still says the figure does not move, and the file declarations do not match the changelog.

No active record with a `watch` overlapping the currently declared FR Targets is missing.

Two active records are nevertheless materially relevant and undispositioned:

- `locks-on-main-not-worktree` directly governs where FR-3’s lease deletion exists and why the base checkout owns it.
- `recompute-beats-recorded-state` directly governs the newly added generated projection and its `--check` reconciliation model.

The Memory Output is appropriate and repeated under Durable Artifacts.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15% | 7/10 | Structural gate fields exist, but the projection mechanism is not executable in adopters and its outputs are not fully declared. |
| 2         | Completeness             | 20% | 7/10 | Core status, predicate, retry, and cleanup cases are covered; absent projection capability and atomic projection failure are not. |
| 3         | Technical Depth          | 25% | 8/10 | Archive, auto-revert, idempotency, predicate, and lease state models are strong; the new self-host-specific package coupling remains unresolved. |
| 4         | Multi-Tenancy & Security | 20% | 10/10 | Repository-local workflow state only; no tenant, auth, endpoint, permission, or protected-data surface. |
| 5         | Scope & Testability      | 10% | 7/10 | Corpus and cleanup checks are strong, but Targets/Scope/Conflict Surface disagree and no adopter-without-projection test is named. |
| 6         | Migration & Rollback     | 10% | 7/10 | Archive and lease recovery are precise; projection absence, partial failure, and rollback are unspecified. |
| **Total** | **Weighted**             |        | **7.9/10** | **ITERATE** |

Weighted total: 7.85, reported as 7.9.

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, authorization, permission, or tenant query is touched; a deny-path test is not applicable.
- Contract cap: not tripped — no client→server payload or schema contract is introduced.
- Lint cap: not tripped — supplied `gate check PRD-041` evidence passes; the independent rerun failed only because the read-only sandbox prohibited `_state/prds.json` refresh.
- Runtime-dependency cap: not tripped — Dependencies is `none`.
- Push cap: not tripped — no remote-push path is introduced.
- Method-content cap: not tripped — no prompt, template, schema, or other method content is changed.

---

## Missing Pieces (to reach 10/10)

### Iteration-4 Report Missing Piece Closure Audit

| Iteration-4 item | State | Evidence checked and exact change |
| ---------------- | ----- | --------------------------------- |
| 1. Terminal source, atomic prevalidation, and no-op semantics | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1, FR-2, §6, §7, Memory Inputs, and §12 consistently use `normalizeStatus(config.statusVocab, 'complete')`; zero/duplicate validation precedes mutation and terminal status is a no-op. Exact change: none. |
| 2. Archive/merge/post-merge transition and resume model | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — §6 and §7 retain committed unarchive moves followed by `gate run --from-phase=7`, and correctly reject `--from-phase=merge`. Exact change: none. |
| 3. Atomic lease-deletion commit | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-3 and §11 specify base checkout, post-merge timing, mutex, message, path-scoped retry, hook failure, and tracked/untracked/absent/recreated cases. Exact change: none. |
| 4. Remove both `isImplemented` fallbacks | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-4 removes completed-location and summary-presence fallbacks and retains a separate present-summary fixture. Exact change: none. |
| 5. Correct corpus counts and assert the predicate | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — §7 and §11 now describe `PRD-023` as summary-missing, identify the post-close figure as 38, assert the predicate rather than an absolute corpus count, and state a post-state/pre-commit projection step. Exact change: none for the iteration-4 finding; the portability defect below was introduced by this fix. |
| 6. Regenerate and commit `_state/prds.json` | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1 and §11 require regeneration before the archive commit; `packages/provegate/src/core/run/archive.ts` already provides a state-file pathspec seam. Exact change: none. |
| 7. Align scope, tests, Conflict Surface, and Memory Inputs | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1 Targets, §8, and Conflict Surface: add `_state/prds.json` and `apps/docs/content/docs/case-study.mdx` everywhere they are written; add the selected projection-hook configuration/code targets; include `scripts/derive-self-hosting-figures.mjs` in the Conflict Surface only if implementation modifies it. The two requested memory dispositions are now closed. |
| 8. Migration and rollback | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — §7 now states the state → projection → commit lifecycle for every automatic terminal write, not only PRD-041. Exact change: none for the iteration-4 wording request; the new portability and failure-state gaps are separate findings below. |

### Iteration-5 Findings

1. `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1, §7 Architecture, §8, and §11: replace the unconditional provegate-repository script invocation with an explicit repository opt-in mechanism usable by the shipped CLI. Name its concrete config/manifest file and symbol, define absent/partial/failing capability behavior, and add a `packages/provegate/test/chain.test.ts` or `packages/provegate/test/cli.test.ts` case proving a fresh adopter without the script or document still closes successfully.

2. `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1 Targets, §8 Implementation Scope, and Conflict Surface: declare every written path, including `_state/prds.json`, `apps/docs/content/docs/case-study.mdx`, and the concrete hook/configuration target selected for the portable lifecycle. The current changelog claim that both outputs joined all three sections is false.

3. `_prds/wip/prd-041-close-writes-its-own-state.md` — §7 Migration & Rollback and §11 Cross-cutting floor: change the archive ordering to “status + regenerated state + regenerated projection,” specify atomic rollback when projection generation fails before commit, and replace “the published figure does not move” with “the committed projection matches regenerated state; PRD-041 moves it from 37 to 38.”

4. `_prds/wip/prd-041-close-writes-its-own-state.md` — Memory Inputs: add reasoned dispositions for `locks-on-main-not-worktree` and `recompute-beats-recorded-state`; then reapply `a-rule-corrected-survives-where-it-is-restated` by sweeping FR-1, §6, §7, §8, Conflict Surface, §11, §12, and Changelog after the portability design is chosen.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.2 | ITERATE | Archive ownership confirmed; post-merge recovery, lease transaction, corpus effects, state regeneration, and scope were unresolved. |
| 2   | 2026-08-07 | 7.8 | ITERATE | Normalizer, prevalidation, fallback removal, measured counts, state regeneration, and rollback improved; four closures remained open. |
| 3   | 2026-08-07 | 7.6 | ITERATE | Vocabulary and branch states passed; the new `gate release` retry, archived retries, and absolute corpus pins regressed. |
| 4   | 2026-08-07 | 7.9 | ITERATE | Exact lease retry and archived-state recovery passed; projection regeneration, corpus description, and two memory dispositions remained. |
| 5   | 2026-08-07 | 7.9 | ITERATE | Corpus description, count 38, projection order, and memory dispositions were corrected. The projection fix introduced an unspecified self-host-only command into the shipped CLI, and its Targets/scope/restatements remain inconsistent. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- No push code path: PASS — no push behavior is proposed.
- Zero `packages/provegate` runtime dependencies: PASS — Dependencies is `none`.
- No telemetry or network calls: PASS — none are in scope.
- Method content traceability: N/A — no prompt, template, or schema change is proposed.
- ADR compliance: PASS — no active ADR is contradicted.
- Canonical status vocabulary: PASS — the normalizer resolves `aliases.complete`; no literal terminal value is used.
- Archive write point: PASS — it owns and commits the final artifact bytes.
- Auto-revert model: PASS — base merge is reverted while the feature archive commit remains.
- Protected-base legality: PASS — `_state/` deletions are permitted and inspected by `base-branch-guard.mjs`.
- Lease cleanup: PASS — branch, message, timing, path scoping, missing-file behavior, and failed-hook retry are specified.
- Known-red targets: PASS — `terminal-status` and `clean-tree` are the two PRD-041 entries.
- Current corpus: PASS — 37 Ship Verified, 38 status-implemented, 39 completed-location.
- `PRD-023`: PASS — `Superseded`, completed PRD, summary missing.
- Post-close figure: PASS in §7 and the FR-4 verification row — 38 Ship Verified.
- Published projection portability: ITERATE — the shipped CLI cannot assume provegate’s repository-specific script and docs path exist.
- Scope consistency: ITERATE — generated state and projection paths are not consistently declared.
- Value header: arithmetic PASS at 3.60; MF/UI/TL/AR are justified, while RM 3 remains unsupported until the cross-repository projection lifecycle is safe.

---

## Verdict

ITERATE — the iteration-4 factual corrections are genuine, and earlier closed findings do not remain as debt. The new projection fix, however, places a provegate-repository-specific command inside the lifecycle of a CLI whose motivating scenario is a fresh adopter repository where that command and document do not exist. The PRD must define a portable, explicitly opted-in projection hook, cover its absence and failure states, and sweep the resulting targets and stale §11 assertion before Phase 3.
