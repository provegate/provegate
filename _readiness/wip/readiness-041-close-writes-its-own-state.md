# Readiness Assessment: PRD-041 — A Close That Writes the State It Claims

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-041-close-writes-its-own-state.md` |
| Score                  | 7.9/10 |
| Verdict                | ITERATE |
| Iteration              | 7 |
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
| Phase 4 (Execution) | Do not assign — fix PRD first | The replay/relocation defect is closed, but the new manifest command surface lacks its complete safety predicate, transactional output boundary, and resume-idempotency contract. |
| Phase 6 (Audit)     | — | Re-score after the `postState` execution and rollback contract is closed. |

---

## Analysis

### 1. Technical Depth & Architecture

Archive remains the correct write point. `archivePrdArtifacts` owns the wip→completed moves, path-scopes the archive commit to old and new artifact paths, and includes the configured state file when staged. A terminal-status edit made before the move therefore travels with the final artifact bytes.

The terminal-value source is correct: `defaults.ts` defines `statusVocab.aliases.complete`, not `statusVocab.complete`, and FR-1 requires `normalizeStatus(config.statusVocab, 'complete')`.

The auto-revert model is now explicit and correct. The terminal write belongs to the feature archive commit. A failed post-merge gate reverts the merge on the base while leaving the feature archive commit intact; §6 distinguishes both refs and provides the committed-unarchive recovery.

The iteration-6 replay/relocation finding is closed. `manifest.postState` is a separate key, while `manifest.phases['7']` retains its existing timing and meaning.

The new key nevertheless creates an incomplete command-execution contract. Current `manifest.ts`:

- rejects unknown keys;
- validates each command-array shape;
- applies `assertCommandsSafe` through `manifestCommands`;
- documents `manifestCommands` as every command the manifest can execute.

FR-1 does not require `postState` to join `manifestCommands` or the safety check, and §11 has no unsafe-command refusal paired with a positive control. An implementation can therefore add a valid-looking execution path that bypasses the manifest’s existing runnable-command predicate. This also means the declared application of `surface-set-without-its-predicate` is not yet true.

Output discovery also needs a closed boundary. Plain `git status --porcelain` after the hook does not specify:

- a pre-hook baseline or how runner-owned archive changes are separated from hook outputs;
- NUL-safe parsing for renamed paths or filenames containing control characters;
- whether ignored outputs are forbidden, since ordinary porcelain omits them;
- whether hooks may modify HEAD, refs, or the index;
- restoration of created, modified, deleted, and renamed hook outputs after failure.

The repository projection is benign, but `postState` is a shipped adopter-facing command surface. The contract must constrain arbitrary configured hooks, not only describe this repository’s script.

### 2. Edge Cases & Failure Modes

FR-2 is idempotent only at the status-line level. The recorded recovery path unarchives and commits the moves, then re-enters with `--from-phase=7`; that reruns the entire archive transaction, including `postState`. Nothing requires a configured hook to be deterministic or idempotent, and nothing defines whether a hook whose projection is already current must run again. A status no-op alone is therefore insufficient for the resume case highlighted by `gate-run-resume-after-archive`.

The failure-atomicity statement covers artifact paths and bytes plus index staging, but not the complete hook-written workspace delta. A failing hook can create one file, delete another, alter an ignored output, or mutate the index before exiting. The failing-hook test row does not explicitly exercise created/modified/deleted outputs or pre-existing staging.

The §6 state table does not contain the archive-abort transition that the `state-model-before-mechanism` disposition claims it contains. It also places the `post-merge green` pipe row after intervening prose, so Markdown no longer renders it as part of the table. The state model therefore omits the new failure state introduced this round.

FR-3 is otherwise precise:

- branch: `merge.baseDir`;
- timing: after green post-merge gates and before the handoff card;
- message: `chore(state): release PRD-NNN lease`;
- tracked deletion: committed;
- untracked, ignored, or absent lease: no commit;
- recreated lease: preserved under the claim mutex;
- hook failure: exit 1, preserve the staged deletion, print output, and name the base-checkout path-scoped retry.

`scripts/base-branch-guard.mjs` confirms `_state/` is allowed on `main`, including deletions.

### 3. Maintainability & DX

The current corpus supports the revised FR-4 explanation:

- 37 `Ship Verified`;
- 38 records accepted by `statusVocab.implemented`;
- 39 PRDs in the completed location;
- `PRD-023` is `Superseded`, has a completed PRD, and has no summary.

Removing the fallbacks changes the pre-close implemented result from 39 to 38. Closing PRD-041 then adds one terminal record, returning the implemented count to 39 while moving the published `Ship Verified` figure from 37 to 38. The PRD now says this consistently.

`pnpm verify:doc-claims` is runnable: the root script invokes `scripts/verify/verify-doc-claims.mjs`, which executes the projection’s `--check` mode. The cross-cutting floor now correctly requires the committed projection to match fresh regeneration.

FR Targets, §8, and the Conflict Surface now align on `_state/prds.json`, `manifest.ts`, `cli.ts`, `gates.manifest.json`, and the case-study projection file. That previous scope finding is closed.

Value arithmetic is correct:

`4×.25 + 5×.25 + 3×.20 + 2×.15 + 3×.15 = 3.60`.

Axis judgment:

- MF 4: justified; close-generated state becomes a gate-owned durable result.
- UI 5: justified by the reproduced false status and dirty-tree adopter failures.
- TL 3: justified; the change repairs central archive and state-query paths.
- AR 2: justified; reliability improves without materially expanding reach.
- RM 3: not justified yet. A generic mutating command surface, path discovery, index preservation, rollback, and a second base commit create above-moderate regression risk. RM is effectively 2 until those contracts are pinned.

### 4. Migration & Rollback

Archive/merge/auto-revert recovery and lease-deletion recovery are well specified.

The new post-state lifecycle is not yet backward-safe for retries. A repository can configure a command that is safe and successful once but non-idempotent on the committed-unarchive `--from-phase=7` path. The PRD must either constrain `postState` to deterministic, rerunnable projections or define a runner rule that avoids replay without leaving state-derived outputs stale.

Rollback also needs to cover the entire hook delta and forbid or detect repository-control mutations. Restoring only artifact paths, artifact bytes, and index staging does not restore an arbitrary hook-created or hook-deleted workspace path.

### 5. Memory Inputs

- `no-completed-done-status-alias`: relevant and applied; the runner writes a gate-derived canonical output, not a self-declared terminal input.
- `surface-set-without-its-predicate`: relevant but **not successfully applied**; the new surface lacks an explicit `manifestCommands`/`assertCommandsSafe` requirement and paired deny fixture.
- `recompute-beats-recorded-state`: relevant and applied; the projection is regenerated and byte-checked rather than compared to a stored receipt.
- `state-model-before-mechanism`: relevant but **not successfully applied**; §6 omits the archive-abort transition and the final row is outside the table.
- `locks-on-main-not-worktree`: relevant and reviewed; cleanup and any deletion commit are placed on `merge.baseDir`, while ignored/untracked leases remain no-commit runtime state.
- `cleanup-after-verified-merge`: relevant and applied; lease teardown follows verified merge.
- `known-red-ledger-must-expire`: relevant and applied; FR-5 removes exactly `terminal-status` and `clean-tree`.
- `turbo-cache-masks-out-of-input-reads`: relevant and applied; the corpus predicate runs directly and uncached.
- `metadata-declares-what-it-cannot-provide`: relevant and applied to the handoff/artifact mismatch.
- `gate-run-resume-after-archive`: directly relevant but only partially applied; artifact status is idempotent, while the new hook transaction is not.
- `assert-absent-needs-an-independent-cause`: relevant; the missing-status fixture retains an independently testable refusal cause.
- `strictness-added-during-extraction-is-a-behavior-change`: relevant and reviewed; existing Phase-7 semantics remain unchanged.
- `fixture-must-reach-production-shape`: relevant and applied through the real `runRun` cleanup path.
- `free-text-field-is-the-unread-drift-ledger`: peripheral but adequately reviewed; no lease schema field is added.
- `docs-outlive-the-gate-they-promise`: relevant and applied to the STATUS deferral deletion.
- `a-rule-corrected-survives-where-it-is-restated`: relevant but not successfully applied; the Memory Input claims an archive-abort table row that §6 does not contain.

No undispositioned active record has a `watch` overlapping the declared FR Targets. The issue is unsuccessful application of declared records, not a missing watched record.

The Memory Output is appropriate and repeated under Durable Artifacts.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15% | 7/10 | The structural Clarity gate passes, but hook safety, allowed mutations, output-delta handling, and resume semantics require implementation-time design decisions. |
| 2         | Completeness             | 20% | 8/10 | Previous scope and lifecycle gaps are mostly closed; the generic hook’s safety and full rollback cases remain. |
| 3         | Technical Depth          | 25% | 8/10 | Write point and branch-state reasoning are strong; the new command and git-transaction boundary is not closed. |
| 4         | Multi-Tenancy & Security | 20% | 8/10 | No tenant/auth surface, but the new executable manifest key is not explicitly bound to the existing command-safety predicate. |
| 5         | Scope & Testability      | 10% | 8/10 | Scope alignment is fixed; deny-path, output-shape, and resume-replay tests are missing. |
| 6         | Migration & Rollback     | 10% | 8/10 | Archive and lease rollback are strong; arbitrary hook-output rollback and retry idempotency remain underspecified. |
| **Total** | **Weighted**             |        | **7.9/10** | **ITERATE** |

Weighted total: 7.85, reported as 7.9.

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, query, authorization, or tenant surface is touched. The manifest command-safety gap remains a readiness finding.
- Contract cap: not tripped — no client→server payload or schema contract is introduced.
- Lint cap: not tripped — supplied `gate check PRD-041` evidence passes; the independent rerun failed only because the sandbox prohibited refreshing `_state/prds.json`.
- Runtime-dependency cap: not tripped — Dependencies is `none`.
- Push cap: not tripped — no remote-push path is introduced.
- Method-content cap: not tripped — no prompt, template, schema, or source-snapshot-controlled content changes.

---

## Missing Pieces (to reach 10/10)

### Iteration-6 Missing Piece Closure Audit

| Iteration-6 report item | State | Evidence checked and exact change |
| ----------------------- | ----- | --------------------------------- |
| 1. Portable hook relationship, failure, output discovery, and adopter test | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1, §7 Architecture, §7 Migration & Rollback, and §11 now define a separate `manifest.postState`, preserve `phases['7']`, make absent/empty legal, state atomic failure, name status-based discovery, and add ordering/empty/failure rows. New contract defects are recorded separately below rather than preserving the old finding as debt. |
| 2. Align every written path across Targets, Scope, and Conflict Surface | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1 Targets, §8, and Conflict Surface all name `manifest.ts`, `cli.ts::runRun`, `gates.manifest.json`, `_state/prds.json`, and `apps/docs/content/docs/case-study.mdx`. No `chain.ts` relocation is proposed. |
| 3. Projection transaction, rollback, and published-figure restatement | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — §7 Migration & Rollback now describes status + state + hook outputs, failure restoration, and a single commit; §11 requires the committed projection to match fresh regeneration and correctly states the figure becomes 38. |
| 4. Missing memory dispositions and consistency sweep | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — Memory Inputs and §6. The four dispositions were added, but `surface-set-without-its-predicate` lacks the existing command-safety predicate and deny fixture, while `state-model-before-mechanism` falsely claims §6 includes an archive-abort row. Exact change: correct both dispositions only after adding the requirements and state-table row described below. |
| 5. Define replay versus relocation of `manifest.phases['7']` | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1 and §7 explicitly introduce `manifest.postState` and state that `phases['7']` retains its existing timing and meaning. |

### Iteration-7 Findings

1. `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1, §7 Architecture, Memory Inputs, and §11: require `postState` to be validated as a command array and included in `manifestCommands`/`assertCommandsSafe`. Add a named test that an unsafe `postState` command is refused before archive mutation, paired with a safe-command positive control.

2. `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1, §7 Projection Lifecycle, §7 Migration & Rollback, and §11: define the exact output transaction. Require a pre-hook baseline, NUL-safe `git status --porcelain=v1 -z --untracked-files=all` delta parsing, explicit treatment of ignored outputs, and rejection or restoration of HEAD/ref/index mutations. Add created, modified, deleted, renamed, and failing-partial-output cases that prove every hook-written byte and the prior index are restored.

3. `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-2, §6, §7 Migration & Rollback, and §11: make the entire archive transaction idempotent, not only the status edit. Either require `postState` commands to be deterministic rerunnable projections or define when the runner suppresses replay. Add a committed-unarchive → `--from-phase=7` regression proving the hook can run again without duplication or failure.

4. `_prds/wip/prd-041-close-writes-its-own-state.md` — §6 state-transition table and the `state-model-before-mechanism` disposition: add an in-table `postState exits non-zero` row naming restored status, wip paths, held lease, unchanged HEAD/index, and the exact retry. Move `post-merge green` above the explanatory prose so it renders inside the table.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.2 | ITERATE | Archive ownership confirmed; post-merge recovery, lease transaction, corpus effects, state regeneration, and scope were unresolved. |
| 2   | 2026-08-07 | 7.8 | ITERATE | Normalizer, prevalidation, fallback removal, measured counts, state regeneration, and rollback improved; four closures remained open. |
| 3   | 2026-08-07 | 7.6 | ITERATE | Vocabulary and branch states passed; the new `gate release` retry, archived retries, and absolute corpus pins regressed. |
| 4   | 2026-08-07 | 7.9 | ITERATE | Exact lease retry and archived-state recovery passed; projection regeneration, corpus description, and two memory dispositions remained. |
| 5   | 2026-08-07 | 7.9 | ITERATE | Corpus and projection arithmetic were corrected; the projection fix introduced a self-host-only command into the shipped CLI. |
| 6   | 2026-08-07 | 7.8 | ITERATE | Repository hardcoding was removed, but the replacement overloaded the existing Phase-7 command list without replay, output-capture, failure, or migration semantics. |
| 7   | 2026-08-07 | 7.9 | ITERATE | The separate hook, path declarations, projection restatements, and stated atomicity close the prior findings; the new hook still lacks command safety, full git-delta rollback, whole-transaction idempotency, and its claimed abort-state row. |

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
- Auto-revert model: PASS — the base merge is reverted while the feature archive commit remains.
- Protected-base legality: PASS — `_state/` deletions are permitted and inspected by `base-branch-guard.mjs`.
- Lease cleanup: PASS — branch, message, timing, tracked/untracked behavior, recreated-file behavior, and hook retry are specified.
- Known-red targets: PASS — `terminal-status` and `clean-tree` are the two PRD-041 entries.
- Current corpus: PASS — 37 Ship Verified, 38 status-implemented, 39 completed-location.
- `PRD-023`: PASS — `Superseded`, completed PRD, summary missing.
- Post-close figure: PASS — the projection moves from 37 to 38 Ship Verified.
- `verify:doc-claims`: PASS — runnable root script invoking the projection’s `--check` mode.
- Published projection portability: PASS — repository wiring is in `gates.manifest.json`; adopters default to no hook.
- Existing Phase-7 compatibility: PASS — no replay or relocation.
- Manifest command safety: ITERATE — `postState` is not explicitly included in the existing safe-command predicate or its deny tests.
- Projection transaction: ITERATE — discovery and rollback do not close created/deleted/renamed/ignored or git-control mutations.
- Resume idempotency: ITERATE — the status write is idempotent, but the newly added hook transaction is not.
- Scope consistency: PASS — FR Targets, §8, and Conflict Surface align.
- Value header: arithmetic PASS at 3.60; MF/UI/TL/AR are justified, while RM 3 remains unsupported.

---

## Verdict

ITERATE — the iteration-6 findings about phase-7 replay, portability, path declarations, stale projection wording, and stated atomic failure are genuinely closed. The separate `postState` key is the right direction.

The new key is not yet implementation-ready, however. It introduces a generic executable manifest surface without explicitly joining the existing command-safety predicate, discovers outputs without a closed git-delta contract, and reruns on the repository’s required `--from-phase=7` recovery without an idempotency rule. The Memory Inputs also claim an archive-abort transition that §6 does not contain.
