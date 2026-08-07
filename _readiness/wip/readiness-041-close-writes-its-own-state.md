# Readiness Assessment: PRD-041 — A Close That Writes the State It Claims

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-041-close-writes-its-own-state.md` |
| Score                  | 7.8/10 |
| Verdict                | ITERATE |
| Iteration              | 6 |
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
| Phase 4 (Execution) | Do not assign — fix PRD first | The repository-specific hardcode is gone, but replay and rollback semantics for `manifest.phases['7']` remain underspecified. |
| Phase 6 (Audit)     | — | Re-score after the post-state hook transaction, output path capture, scope, and stale restatements are resolved. |

---

## Analysis

### 1. Technical Depth & Architecture

Archive remains the correct status-write point. `archivePrdArtifacts` owns the final artifact bytes, and its path-scoped commit includes both the old and completed artifact paths. A status edit made after prevalidation and before that commit therefore travels with the renames. The current implementation also stages `config.dirs.stateFile` when present, although it does not yet regenerate it.

The terminal source is correct. `defaults.ts` has `statusVocab.aliases.complete`, not `statusVocab.complete`; FR-1 consistently requires `normalizeStatus(config.statusVocab, 'complete')` rather than a literal.

The auto-revert model remains correct. The archive commit exists on the feature ref before merge. A failed post-merge gate reverts the base merge; it does not erase the feature archive commit. Section 6 states both feature-ref and base-ref outcomes and gives the committed unarchive followed by `--from-phase=7` recovery.

The iteration-5 portability objection is closed: the shipped runner no longer names `derive-self-hosting-figures.mjs`, and a repository with no phase-7 commands has a legal no-op.

The replacement creates a different contract gap. `buildGateChain` already executes `manifest.phases['7']` before archive. The revised PRD requires those same commands after status/state regeneration and before the archive commit, but never says whether they are:

- replayed a second time, changing the existing manifest contract; or
- moved out of the normal Phase-7 chain, which requires an undeclared `chain.ts` change.

A replay is not backward-compatible by default. Existing adopters may have Phase-7 validators that expect wip paths, run only once, or are not idempotent. Calling them again after the artifacts move can fail an otherwise valid close.

The current archive commit is explicitly path-scoped to moved artifacts and the state file. “Include whatever the hook wrote” therefore needs an output-discovery and staging rule. The PRD does not define handling for created, modified, deleted, untracked, ignored, or concurrently changed paths.

### 2. Edge Cases & Failure Modes

FR-2 is tight enough for the repository’s recorded resume path: after committed unarchive moves, `--from-phase=7` reaches terminal artifacts, treats the terminal value as a no-op, and archives them again. Missing and duplicate status lines refuse before either artifact is mutated.

FR-3 is now precise:

- Base checkout: `merge.baseDir`.
- Timing: after green post-merge gates and before the handoff card.
- Commit: `chore(state): release PRD-NNN lease`.
- Tracked lease: commit the deletion.
- Untracked, ignored, or absent lease: no commit, with an explicit result.
- Recreated lease: preserve and warn.
- Hook failure: exit 1, preserve the staged deletion, print hook output, and provide the exact path-scoped retry.

`scripts/base-branch-guard.mjs` confirms `_state/` is allowed on `main`, and its staged-path parser includes deletions.

The post-state hook failure is not specified. If a command fails after artifact moves, status edits, and `_state/prds.json` regeneration, the current archive path will throw before committing and leave those mutations behind. FR-1’s atomic prevalidation protects only malformed status headers; it does not define rollback for a failed hook or partial hook output.

The adopter smoke contains exactly the two PRD-041 known-red entries, `terminal-status` and `clean-tree`, and its manifest has no phase-7 list. It is therefore a useful empty-list adopter regression once those entries are removed.

### 3. Maintainability & DX

The corpus evidence is accurate:

- 37 `Ship Verified`
- 38 statuses accepted by `statusVocab.implemented`
- 39 PRDs in the completed location
- `PRD-023` is `Superseded`, has a completed PRD, and has no summary

FR-4 correctly removes both location and summary fallbacks. After PRD-041 closes, the status-implemented count becomes 39 and the `Ship Verified` projection becomes 38.

`node scripts/check-implemented-predicate.mjs` is correctly specified as a direct, uncached repository command. `pnpm verify:doc-claims` is runnable and currently passes; its implementation runs the projection’s `--check` mode.

One stale restatement remains:

`pnpm verify:doc-claims` — the published figure does not move

That contradicts §7 and the FR-4 row, which correctly say PRD-041 moves the figure from 37 to 38.

The declaration sweep is incomplete. `gates.manifest.json` and `apps/docs/content/docs/case-study.mdx` now appear in Implementation Scope and Conflict Surface, but `_state/prds.json` still does not. FR-1’s Targets line names only `archivePrdArtifacts`, despite requiring `runRun` to supply or relocate the manifest execution and requiring multiple generated paths to enter the commit.

Value arithmetic is correct:

`4×.25 + 5×.25 + 3×.20 + 2×.15 + 3×.15 = 3.60`.

Axis judgment:

- MF 4: justified; close-generated state becomes durable and gate-derived.
- UI 5: justified by the reproduced misleading status and dirty-tree adopter failures.
- TL 3: justified; this corrects central close and state-query paths.
- AR 2: justified; reliability improves, but reach does not materially expand.
- RM 3: still optimistic. Replaying an existing phase command list under new path and timing semantics, without rollback, creates compatibility and recovery risk. RM is effectively 2 until that contract is closed.

### 4. Migration & Rollback

Status, merge, auto-revert, archived-state recovery, and lease-deletion rollback are coherent.

The post-state lifecycle is not. Migration & Rollback still describes the archive commit as “status + regenerated state,” omitting hook outputs. It also does not address repositories that already have non-idempotent or wip-dependent Phase-7 commands.

The required atomic boundary is status edits → moves → state regeneration → configured post-state work → one archive commit. A failure before the commit needs an explicit outcome for every mutation and staged path. That outcome is absent.

### 5. Memory Inputs

- `no-completed-done-status-alias`: relevant and applied appropriately to a runner-owned output; the written value is normalized rather than literal.
- `cleanup-after-verified-merge`: relevant and applied; lease teardown follows verified merge.
- `known-red-ledger-must-expire`: relevant and applied; FR-5 removes both owned entries.
- `turbo-cache-masks-out-of-input-reads`: relevant and applied; the corpus script runs directly and uncached.
- `metadata-declares-what-it-cannot-provide`: relevant and applied to handoff/status coherence.
- `gate-run-resume-after-archive`: directly relevant and applied through committed unarchive moves and phase-7 resume.
- `assert-absent-needs-an-independent-cause`: relevant; the intended fixtures are described, though the final test must preserve the independent cause.
- `strictness-added-during-extraction-is-a-behavior-change`: relevant and reviewed; the new refusal behavior is intentional and pinned.
- `fixture-must-reach-production-shape`: relevant and applied through `runRun`-level cleanup testing.
- `free-text-field-is-the-unread-drift-ledger`: peripheral but adequately reviewed.
- `docs-outlive-the-gate-they-promise`: relevant and applied to the STATUS deferral deletion.
- `a-rule-corrected-survives-where-it-is-restated`: relevant but not applied successfully; §11 and Migration still carry stale lifecycle descriptions.

No undispositioned active record has a `watch` overlapping the current declared FR Targets.

Materially relevant records remain missing:

- `locks-on-main-not-worktree` governs FR-3’s base-owned lease and cleanup placement.
- `recompute-beats-recorded-state` governs the generated projection’s recompute/write/check model.
- `state-model-before-mechanism` is relevant to the six-round flat trajectory and watches the modified `_prds/wip/**` path.

The Memory Output is appropriate and repeated under Durable Artifacts.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15% | 7/10 | The structural Clarity gate passes, but Phase-7 replay versus relocation and hook output capture remain ambiguous. |
| 2         | Completeness             | 20% | 7/10 | Core status, predicate, resume, and lease cases are covered; hook failure and output-path cases are not. |
| 3         | Technical Depth          | 25% | 8/10 | The main state models are strong, but the existing Phase-7 gate list is overloaded as a post-state mutation hook without a compatibility contract. |
| 4         | Multi-Tenancy & Security | 20% | 10/10 | Repository-local workflow state only; no tenant, auth, endpoint, permission, or protected-data surface. |
| 5         | Scope & Testability      | 10% | 7/10 | Empty-list and ordering tests are named, but written paths and call-graph targets remain incomplete. |
| 6         | Migration & Rollback     | 10% | 6/10 | Archive and lease recovery are precise; existing Phase-7 configurations and failed post-state commands have no safe migration or rollback rule. |
| **Total** | **Weighted**             |        | **7.8/10** | **ITERATE** |

Weighted total: 7.75, reported as 7.8.

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, authorization, permission, or tenant-query surface is touched.
- Contract cap: not tripped — no client→server payload or schema contract is introduced.
- Lint cap: not tripped — supplied `gate check PRD-041` evidence passes; the independent rerun failed only on the sandbox’s prohibited `_state/prds.json` write.
- Runtime-dependency cap: not tripped — Dependencies is `none`.
- Push cap: not tripped — no remote-push path is introduced.
- Method-content cap: not tripped — no prompt, template, schema, or source-snapshot-controlled method content changes.

---

## Missing Pieces (to reach 10/10)

### Iteration-5 Missing Piece Closure Audit

| Iteration-5 item | State | Evidence checked and exact change |
| ---------------- | ----- | --------------------------------- |
| 1. Portable projection opt-in, absence, failure, and adopter test | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1, §7 Architecture, §7 Migration & Rollback, and §11. The repository-specific hardcode and empty-list case are **CLOSED**. Exact remaining change: state whether `manifest.phases['7']` is replayed or relocated; specify compatibility for existing commands; define command-failure rollback and output discovery; name a regression for a failing hook as well as the empty-list adopter. |
| 2. Align every written path across Targets, Scope, and Conflict Surface | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1 Targets, §8, and Conflict Surface. `gates.manifest.json` and `apps/docs/content/docs/case-study.mdx` are now declared. Exact remaining change: add `_state/prds.json` to §8 and Conflict Surface; add `packages/provegate/src/cli.ts::runRun`, `gates.manifest.json::phases.7`, `_state/prds.json`, and the generated case-study region to FR-1 Targets; add `packages/provegate/src/core/run/chain.ts` if existing Phase-7 execution moves. |
| 3. Projection transaction, rollback, and published-figure restatement | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — §7 Migration & Rollback and §11 Cross-cutting floor. Exact change: describe the archive commit as status + regenerated state + hook outputs; require restoration of pre-archive paths, bytes, and staging on hook failure; replace “the published figure does not move” with “the committed projection matches regenerated state; PRD-041 moves it from 37 to 38.” |
| 4. Missing memory dispositions and consistency sweep | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — Memory Inputs, §7, §8, §11, §12, and Changelog. Exact change: add reasoned dispositions for `locks-on-main-not-worktree`, `recompute-beats-recorded-state`, and `state-model-before-mechanism`; then reconcile every post-state-hook restatement, removing claims that the lifecycle or declaration sweep is already complete. |

### Iteration-6 Finding

1. `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1, §7 Architecture, §7 Migration & Rollback, and §11: define the semantic relationship between the existing pre-archive execution of `manifest.phases['7']` and the proposed post-state execution. Either introduce a separately named, explicitly opted-in post-state hook with declared outputs, or specify that Phase-7 commands run twice and require them to be idempotent and valid after artifact moves. Add tests for a wip-dependent existing validator, a failing command, and modified/created/deleted output capture.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.2 | ITERATE | Archive ownership confirmed; post-merge recovery, lease transaction, corpus effects, state regeneration, and scope were unresolved. |
| 2   | 2026-08-07 | 7.8 | ITERATE | Normalizer, prevalidation, fallback removal, measured counts, state regeneration, and rollback improved; four closures remained open. |
| 3   | 2026-08-07 | 7.6 | ITERATE | Vocabulary and branch states passed; the new `gate release` retry, archived retries, and absolute corpus pins regressed. |
| 4   | 2026-08-07 | 7.9 | ITERATE | Exact lease retry and archived-state recovery passed; projection regeneration, corpus description, and two memory dispositions remained. |
| 5   | 2026-08-07 | 7.9 | ITERATE | Corpus and projection arithmetic were corrected; the projection fix introduced a self-host-only command into the shipped CLI. |
| 6   | 2026-08-07 | 7.8 | ITERATE | Repository-specific hardcoding was removed and empty-list portability added; the replacement overloads the existing Phase-7 gate list without replay, output-capture, failure, or migration semantics. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- No push code path: PASS — no push behavior is proposed.
- Zero `packages/provegate` runtime dependencies: PASS — Dependencies is `none`.
- No telemetry or network calls: PASS.
- Method content traceability: N/A — no prompt, template, or schema changes.
- ADR compliance: PASS — no active ADR is contradicted.
- Canonical status vocabulary: PASS — terminal output is resolved through `normalizeStatus`.
- Archive write point: PASS — archive owns and commits the final artifact bytes.
- Auto-revert model: PASS — base merge is reverted while the feature archive commit remains.
- Protected-base legality: PASS — `_state/` deletions are allowed and inspected by `base-branch-guard.mjs`.
- Lease cleanup: PASS — branch, message, timing, missing-file behavior, path scoping, and hook retry are specified.
- Known-red targets: PASS — `terminal-status` and `clean-tree` are the two PRD-041 entries.
- Current corpus: PASS — 37 Ship Verified, 38 status-implemented, 39 completed-location.
- `PRD-023`: PASS — `Superseded`, completed PRD, summary missing.
- Post-close figure: PASS in §7 and FR-4 — 38 Ship Verified.
- Published projection portability: PARTIAL — repository hardcoding is gone and empty lists work, but existing Phase-7 command compatibility is unspecified.
- Projection transaction: ITERATE — hook output discovery and failure rollback are absent.
- Scope consistency: ITERATE — `_state/prds.json` and call-graph targets remain incomplete.
- Value header: arithmetic PASS at 3.60; MF/UI/TL/AR are justified, while RM 3 remains unsupported.

---

## Verdict

ITERATE — the original portability objection is genuinely closed: the shipped runner no longer knows this repository’s projection script, and an empty phase-7 list is legal. The replacement is not yet implementation-ready, however. The same command list already runs before archive, while the PRD neither declares replay nor relocation, does not define how arbitrary hook outputs enter the path-scoped commit, and provides no rollback for a failed post-state command. The stale §11 figure claim, incomplete path declarations, and missing memory dispositions also remain open.
