# Readiness Assessment: PRD-041 — A Close That Writes the State It Claims

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-041-close-writes-its-own-state.md` |
| Score                  | 7.6/10 |
| Verdict                | ITERATE |
| Iteration              | 3 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — supplied `node packages/provegate/dist/cli.js check PRD-041` result |
| State Record           | pending — read-only sandbox |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | The self-closing count transition, archived retry, and failed-hook recovery are internally inconsistent. |
| Phase 6 (Audit)     | — | Re-score after the open state-machine and verification gaps are corrected. |

---

## Analysis

### 1. Technical Depth & Architecture

Archive remains the correct write point. `archivePrdArtifacts` owns the wip→completed moves and commits both old and new artifact paths plus `_state/prds.json`. Writing the terminal bytes before the path-scoped archive commit can therefore carry them in that commit. The configured terminal source is also now consistent everywhere: `defaults.ts` has `statusVocab.aliases.complete`, not `statusVocab.complete`, and the PRD uniformly requires `normalizeStatus(config.statusVocab, 'complete')`.

The split feature/base failure states are accurate. `merge.ts` resets the base checkout to `preMergeSha` after a failed post-merge gate while leaving the feature archive commit intact.

The corpus claim is not accurate across this PRD’s own close. Current measured state is:

- `Ship Verified`: 37
- status-based implemented: 38
- completed-location PRDs: 39
- `PRD-023`: `Superseded`, completed location, correctly false under the proposed predicate

When PRD-041 archives itself, FR-1 changes its status from `Draft` to `Ship Verified` and moves it to completed. The resulting figures are therefore 38, 39, and 40 respectively—not “Ship Verified stays 37” and not a permanently pinned implemented count of 38. `verify:doc-claims` derives its published figure from `_state/prds.json`, so the archive would make the committed case-study projection stale and a post-merge check would fail.

The new corpus test is materially better than `gate queue --json` because it calls the real predicate, but its absolute pin becomes false as soon as this PRD closes. It also reads `_state/prds.json` outside the package tree while `turbo.json` does not declare `_state/prds.json` as a test input.

### 2. Edge Cases & Failure Modes

FR-2 now specifies the terminal-status no-op tightly enough for the archive function itself. Zero and duplicate status lines refuse before either artifact changes.

The recovery sequence is still not executable:

- The §6 recipe says to `git mv` archived artifacts back to `wip` and then run `--from-phase=7`, but omits committing those moves. `mergePreconditions` refuses the resulting dirty checkout.
- The merge-failure and auto-revert rows still prescribe `gate run --from-phase=merge`. `chain.ts::shouldSkipGate` explicitly keeps memory gates non-skippable for `merge`; an archived feature artifact therefore fails before reaching merge. This is the exact failure recorded by `gate-run-resume-after-archive`.

FR-3 correctly names the base checkout, timing, mutex, path-scoped message, tracked/untracked/ignored/absent behavior, and identity revalidation. The protected-base claim is correct: `base-branch-guard.mjs` permits `_state/` paths and checks deletions.

The failed-hook retry is not idempotent. After the runner deletes a tracked lease and its commit hook fails, the file is absent but the tracked deletion remains uncommitted. Current `gate release PRD-NNN` finds no lease and exits 0 without committing anything. Thus the specified retry cannot finish the operation and conflicts with FR-3’s “absent → no-op” rule.

### 3. Maintainability & DX

The vocabulary sweep is complete: FR-1, Memory Inputs, §6, §7, §11, and §12 consistently use the normalizer. The prior stale `statusVocab.complete` finding is closed.

The new exact-count test introduces two maintenance hazards:

- Its expected value changes during this PRD’s own archive.
- A test reading `_state/prds.json` through Turbo needs that path declared as an input, or a dedicated uncached/direct command.

The Memory Input selection is incomplete even though no undeclared active record has a `watch` glob overlapping an FR Target. Three active records are directly relevant and should be dispositioned:

- `known-red-ledger-must-expire` — FR-5 removes two KNOWN_RED entries.
- `cleanup-after-verified-merge` — FR-3 places cleanup after verified merge.
- `turbo-cache-masks-out-of-input-reads` — the new corpus test reads root state outside the package.

Value arithmetic is correct:

`4×.25 + 5×.25 + 3×.20 + 2×.15 + 3×.15 = 3.60`.

Axis judgment:

- MF 4: justified; durable state is brought into line with the gated close.
- UI 5: justified by the reproduced adopter failure and dirty-tree refusal.
- TL 3: justified for a localized but central close-state correction.
- AR 2: justified; reliability improves without materially expanding reach.
- RM 3: not yet justified. The failed-hook retry and self-updating published figure create standing maintenance risk; RM is presently 2 unless those mechanisms are closed.

### 4. Migration & Rollback

Commit ordering and ref-specific auto-revert state are now documented correctly. Previous-CLI artifacts and archive/lease reversal are also covered.

Rollback and retry remain incomplete because the documented commands cannot cross the archived-memory-gate boundary. Every retry from an archived feature ref must either unarchive and commit the moves before `--from-phase=7`, or name a recovery path that completes the merge without re-entering `gate run`.

The PRD also lacks a migration plan for the published self-hosting projection. Once closes begin writing `Ship Verified` automatically, every successful close changes the figure consumed by `verify:doc-claims`; this is recurring behavior, not a one-time PRD-041 adjustment.

### 5. Memory Inputs

- `no-completed-done-status-alias`: relevant and now consistently applied. The implementation derives a canonical output; it does not accept the alias as an author-written terminal status.
- `metadata-declares-what-it-cannot-provide`: relevant and applied through committed artifact/state coherence.
- `gate-run-resume-after-archive`: directly relevant but still not fully applied. The recipe omits committing `git mv`, and other rows retain the non-working `--from-phase=merge` retry.
- `assert-absent-needs-an-independent-cause`: relevant and adequately reflected by explicit zero-line, duplicate-line, refusal, and neither-file-mutated assertions.
- `strictness-added-during-extraction-is-a-behavior-change`: relevant and adequately reviewed; the new refusal behavior is explicit.
- `fixture-must-reach-production-shape`: relevant and applied by requiring tests through the real `runRun` cleanup path.
- `free-text-field-is-the-unread-drift-ledger`: peripheral but reasonably reviewed; no lease-schema field is introduced.
- `docs-outlive-the-gate-they-promise`: relevant to deleting the resolved STATUS deferral.
- `a-rule-corrected-survives-where-it-is-restated`: the vocabulary sweep is closed, but the newly written recovery/count rules now contradict their other restatements.
- Missing relevant inputs: `known-red-ledger-must-expire`, `cleanup-after-verified-merge`, and `turbo-cache-masks-out-of-input-reads`.
- Missing active watch-overlap input: none. All active records whose `watch` overlaps an FR Target are named.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15% | 7/10 | The structural Clarity gate passes, but two retry commands and the corpus totals are not executable as written. |
| 2         | Completeness             | 20% | 7/10 | Vocabulary and ref-state closures pass; self-close projection and hook-retry completion are absent. |
| 3         | Technical Depth          | 25% | 7/10 | Archive and predicate design are strong, but the spec overlooks its own status/count transition and non-skippable memory gates. |
| 4         | Multi-Tenancy & Security | 20% | 10/10 | Repository-local state only; no tenant, auth, route, endpoint, permission, or protected-data surface. |
| 5         | Scope & Testability      | 10% | 7/10 | The replacement test calls the correct predicate, but its absolute pin cannot survive the close and its external input is undeclared. |
| 6         | Migration & Rollback     | 10% | 7/10 | Ref states are correct; recovery commands and recurring published-figure migration are not. |
| **Total** | **Weighted**             |        | **7.6/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, query, authorization, or permission surface is touched.
- Contract cap: not tripped — no client→server payload or schema contract is introduced.
- Lint cap: not tripped — supplied `gate check PRD-041` evidence passes.
- Runtime-dependency cap: not tripped — Dependencies is `none`.
- Push cap: not tripped — no remote-push path is introduced.
- Method-content cap: not tripped — no prompt, template, schema, or other method content changes are proposed.

---

## Missing Pieces (to reach 10/10)

### Iteration-2 Closure Audit

| Iteration-2 item | State | Evidence checked and exact change |
| ---------------- | ----- | --------------------------------- |
| 1. Terminal source, atomic prevalidation, and no-op semantics | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1, FR-2, Memory Inputs, §11, and §12 now consistently use `normalizeStatus(config.statusVocab, 'complete')`; zero/duplicate lines refuse before either artifact changes. Exact change: none. |
| 2. Archive/merge/post-merge transition and resume model | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — §6 and §7: require `git mv` back to `wip` **and commit those moves** before `gate run --from-phase=7 PRD-NNN`. Replace every feature-archive retry using `--from-phase=merge` with that sequence, because `packages/provegate/src/core/run/chain.ts::shouldSkipGate` keeps memory gates non-skippable. |
| 3. Atomic lease-deletion commit | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-3 and §11: make the failed-hook retry capable of committing the already-absent tracked deletion. Either specify that `gate release PRD-NNN` detects and commits that pending deletion, with a `packages/provegate/test/cli.test.ts` retry test, or replace the retry with the exact path-scoped `git commit` command and lease path. |
| 4. Remove both `isImplemented` fallbacks | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-4 removes completed-location and summary-presence fallbacks and names the combined negative case. Exact change: none. |
| 5. Correct corpus counts and assert the predicate | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — §7 and §11: replace the invariant `38`/`37` claims with the actual lifecycle: before archive `38` implemented and `37` Ship Verified; after PRD-041 archives, `39` implemented and `38` Ship Verified. Keep `PRD-023` explicitly false. Define a post-status/pre-commit projection step that regenerates the case-study figure so `verify:doc-claims` remains green. |
| 6. Regenerate and commit `_state/prds.json` | **CLOSED** | `_prds/wip/prd-041-close-writes-its-own-state.md` — FR-1, §6, §7, and §11 require regeneration after the artifact changes and inclusion in the archive commit. Existing archive pathspec supports committing those bytes. Exact change: none. |
| 7. Align scope, tests, Conflict Surface, and DO NOT rules | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — §8, Conflict Surface, §11, and Memory Inputs: add the selected self-hosting projection mechanism and its files. If retaining a Turbo-executed test over `_state/prds.json`, add `turbo.json` and `$TURBO_ROOT$/_state/prds.json`; otherwise name a direct uncached command. Add dispositions for `known-red-ledger-must-expire`, `cleanup-after-verified-merge`, and `turbo-cache-masks-out-of-input-reads`. |
| 8. Migration and rollback | **OPEN** | `_prds/wip/prd-041-close-writes-its-own-state.md` — §7 Migration & Rollback: replace the non-working archived `--from-phase=merge` recovery, state that unarchive moves must be committed, and document how every future automatic `Ship Verified` write regenerates the published self-hosting projection before post-merge verification. |

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.2 | ITERATE | Archive ownership confirmed; post-merge failure/resume, lease transaction, corpus effect, state regeneration, and scope consistency were unresolved. |
| 2   | 2026-08-07 | 7.8 | ITERATE | Normalizer, prevalidation, no-op semantics, fallback removal, measured counts, state regeneration, scope, and rollback improved; four closures remained open. |
| 3   | 2026-08-07 | 7.6 | ITERATE | Vocabulary and branch-state fixes pass. Independent verification found that the hook retry cannot commit the deletion, archived retries still re-enter non-skippable memory gates, and PRD-041’s own terminal write changes both pinned corpus figures. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- No push code path: PASS — no push behavior is proposed.
- Zero `packages/provegate` runtime dependencies: PASS — Dependencies is `none`.
- No telemetry or network calls: PASS — none are in scope.
- Method content traceability: N/A — no prompt, template, or schema content changes.
- ADR compliance: PASS — no active ADR is contradicted.
- Canonical status vocabulary: PASS — every operative section now uses the normalizer and forbids a literal.
- Protected-base legality: PASS — `_state/` deletions are permitted and deletions are inspected by the guard.
- Known-red targets: PASS — `terminal-status` and `clean-tree` are the two PRD-041 entries in `scripts/adopter-smoke.sh`.
- FR-4 current corpus: PASS — 38 status-based versus 39 location-based; `PRD-023` is the false completed-location case.
- FR-4 post-close corpus claim: ITERATE — PRD-041’s own close changes the values to 39 and 40.
- Published-doc claim: ITERATE — Ship Verified changes 37→38 when PRD-041 closes; no regeneration mechanism is scoped.
- Value header: arithmetic PASS at 3.60; MF/UI/TL/AR are justified, while RM 3 requires the open failure semantics to be closed.

---

## Verdict

ITERATE — the stated iteration-2 fixes are present, and the vocabulary and ref-state corrections pass. Phase 3 is still blocked because the new hook retry cannot commit the deletion it is meant to recover, archived retries still fail the non-skippable memory gates, and the proposed absolute corpus figures become false when PRD-041 writes its own terminal status.
