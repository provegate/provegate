# Readiness Assessment: PRD-043 — An Unreadable Task Artifact Refuses, It Never Counts Zero

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-043-unreadable-artifact-refuses.md` |
| Score                  | 7.8/10 |
| Verdict                | ITERATE |
| Iteration              | 5 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — direct `lintPrd` returned `{ ok: true, issues: [] }`; supplied measured `gate check PRD-043` also passes |
| State Record           | pending — read-only assessment |

---

## Model Tier Recommendation

| Phase               | Tier                          | Rationale |
| ------------------- | ----------------------------- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | FR-1 still assigns opposite outcomes to the same boundaryless table, §1 contradicts the measured counter output, and PRD-040’s claimed split sweep was not applied to several restatements. |
| Phase 6 (Audit)     | —                             | Re-score after the parser controls, measured baseline, and predecessor restatements agree. |

---

## Analysis

### 1. Technical Depth & Architecture

The intended architecture is sound and stays within Addendum A3 Clause 5:

- Current `countOperatorHandoff` reduces `operatorRowsIn` to a bare number, while `splitTableCells` rejects lines without both boundary pipes.
- `scanDocument().unreliable` reports unclosed fences and HTML comments. The fail-closed precedent at `packages/provegate/src/core/memory/artifacts.ts:641` turns that signal into a diagnostic instead of continuing with parsed data.
- The proposed `readOperatorHandoff` result gives `buildState`, `operatorGateOk`, and `lintPrd` one diagnostic authority.
- FR-3 correctly places the merge refusal before acceptance lookup.
- FR-4 correctly separates present, absent, and unavailable task state.

The central boundaryless contract is still contradictory. FR-1 declares a matching boundaryless header/separator pair a problem, then its positive-controls paragraph calls a well-formed boundaryless table legal and pairs the mismatched-count form as the refusal. Section 6 correctly says the matching form refuses and the nonmatching neighbour is the positive control. The owning FR therefore still disagrees with its acceptance criteria.

Section 1 also contradicts the supplied and PRD-040 measurements. It says the missing-separator table and narrow row each return zero today; the shipped counter measures both as two. After PRD-040 lands, those outcomes become zero and one respectively, so “each returns 0” is wrong under both the current and sequenced baselines.

### 2. Edge Cases & Failure Modes

The detailed refusal set otherwise covers the important failure modes:

- Piped header followed by data without a separator.
- Data/header width mismatch with both widths named.
- Missing or duplicate ledger `Result` columns.
- Unterminated fences and other scanner unreliability.
- Multiple problems aggregated in document order.
- Fatal merge/check behavior versus the non-fatal Phase-2 contradiction warning.
- Missing task artifact versus a present zero-row artifact.
- Stale three-field versus matching four-field audit acknowledgements.

The two-part boundaryless predicate is narrow enough to leave an ordinary `|`-bearing sentence alone when its neighbour is not an equal-width separator. It intentionally refuses the matching GFM boundaryless form because the supported reader requires boundary pipes. That outcome is coherent in §6 but not in FR-1’s positive-controls paragraph.

Sequencing is a hard precondition, not a note. FR-5 says Phase 3/4 does not start unless PRD-040 is merged, its fixtures exist, and `scripts/audit-operator-rows.mjs` exposes `--assert-acknowledged`. The script is absent in the current checkout, so work is correctly blocked until PRD-040 supplies it.

### 3. Maintainability & DX

The public compatibility story is now complete enough:

- `countOperatorHandoff` is exported through `core/state/index.ts`, `core/index.ts`, and the package root.
- `scripts/adopter-smoke.sh` imports it from an installed package.
- The current internal production caller is `buildState`; unknown adopters may also use the public export.
- The PRD explicitly identifies the new exception as a runtime compatibility break despite the unchanged TypeScript signature.
- The changeset must name the breaking behavior and direct callers to `readOperatorHandoff`.
- FR-2 and §11 now require both `readOperatorHandoff` and `OperatorHandoffUnreadableError` to import from the installed package root, while the wrapper throw and stable code are also asserted.

The Phase-2 warning belongs in PRD-043 because it requires the same task diagnostic, `lintPrd` parameter, report shape, and `runCheck` plumbing as the fatal problem. PRD-040 correctly retains the declaration invariant at the early-chain and merge gates.

The current PRD-040 file, however, still contains several restatements that assign refusal/audit/lint behavior to the wrong FR or item despite its Changelog claiming they were swept.

### 4. Migration & Rollback

The optional `StateRecord.task.operatorHandoffProblem` permits older state snapshots to load. The reader is pure, no repository data is migrated, and reverting the implementation restores the old behavior.

FR-5 correctly grows the audit acknowledgement from three to four fields. A PRD-040 acknowledgement cannot silently authorize the refusal population introduced here.

The public wrapper’s new throw is the dominant maintenance risk. A minor release is appropriate for the pre-1.0 package, but the behavior is still breaking for callers that previously received a number.

The value prompt is stale relative to the current file. The current header is:

`3.45 (MF/UI/TL/AR/RM: 5/4/3/2/2)`

`0.25×5 + 0.25×4 + 0.20×3 + 0.15×2 + 0.15×2 = 3.45`.

- MF 5 is justified: A3 Clause 5 is an owner-approved method requirement that remains unimplemented, not merely an ordinary parser bug.
- UI 4 is justified by preventing silent autonomous closes.
- TL 3 and AR 2 are proportionate.
- RM 2 is correct because a public numeric API begins throwing and central close consumers acquire new refusal paths. RM 3 would understate the risk.

### 5. Memory Inputs

Each declared disposition was challenged:

- The scope and state-model records remain directly relevant to the PRD-040/043 split.
- The independent-cause and production-shape records correctly require isolated fixtures and `runCheck`-level evidence.
- The strictness and resume records are addressed by the audit, compatibility statement, and refusal inside `operatorGateOk`.
- The surface/predicate record supports the explicit `present` discriminator.
- The operator-row record correctly remains owned by PRD-040.
- The exemption and two-parser records are reasonably reviewed as non-applicable to new syntax or a second implementation.
- The grammar record is relevant, but its intended narrowing has not been applied consistently because FR-1 still reverses its boundaryless predicate in the positive controls.
- `a-rule-corrected-survives-where-it-is-restated` precisely describes the current failure: both PRDs’ Changelogs claim sweeps that their live sections do not reflect.

No active record whose `watch` overlaps a declared FR Target is missing. The applicable `_prds/**`, `_prds/wip/**`, `packages/provegate/test/**`, `core/run/**`, `core/gates/**`, `prd-ready.ts`, and `cli.ts` watches all have dispositions.

Memory Outputs is not a reasoned `none` in the current file. It declares `_brain/learnings/unreadable-input-needs-a-diagnostic-result.md`, distinct from PRD-040’s counting learning, and repeats it under Durable Artifacts. This is substantive rather than ceremonial.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15%    | 6.0/10 | FR-1 still gives one boundaryless shape two outcomes, and §1 misstates the measured baseline. |
| 2         | Completeness             | 20%    | 7.0/10 | Installed exports and audit compatibility are specified, but the predecessor sweep remains incomplete. |
| 3         | Technical Depth          | 25%    | 8.0/10 | Strong diagnostic/state architecture and consumer routing; the central parser control remains contradictory. |
| 4         | Multi-Tenancy & Security | 20%    | 9.5/10 | No route, endpoint, query, tenant, auth, permission, secret, telemetry, or network surface. |
| 5         | Scope & Testability      | 10%    | 7.0/10 | Hard sequencing and runnable checks are present, but PRD-040 still crosses the split in several restatements. |
| 6         | Migration & Rollback     | 10%    | 9.0/10 | Public break, package delivery, changeset, audit growth, preflight, release, and revert path are explicit. |
| **Total** | **Weighted**             |        | **7.8/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, or query path is touched.
- Contract cap: not tripped — no client-to-server payload is introduced.
- Lint cap: not tripped — direct non-writing lint returned `{ ok: true, issues: [] }`; the supplied full CLI measurement passes.
- Method-content cap: not tripped — the behavior traces to owner-approved Addendum A3 Clause 5.
- Runtime-dependency cap: not tripped — no runtime dependency is proposed.
- Push cap: not tripped — no remote-push path is proposed.

---

## Missing Pieces (to reach 10/10)

1. **OPEN — iteration-4 Missing Piece 1.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-1 predicate and Positive Controls, against §6 and `packages/provegate/src/core/state/markdown.ts::splitTableCells`. The predicate and §6 refuse an equal-width boundaryless header/separator pair, but FR-1 still calls a well-formed boundaryless table legal and treats the mismatched pair as the refusal. Exact change: in §4 FR-1, replace “a well-formed boundaryless table (legal GFM) beside the mismatched-count one” with a well-formed **piped** table control and a `|`-bearing sentence whose neighbour does not match; state that the unequal-cell boundaryless pair is the no-problem control.

2. **CLOSED — iteration-3 Missing Piece 2.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-3/FR-4; `packages/provegate/src/core/state/build.ts::StateRecord`; `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`; `packages/provegate/src/cli.ts::runCheck`. The optional state diagnostic, discriminated presence union, and production construction point are explicit. Exact change: none.

3. **CLOSED — iteration-4 Missing Piece 3.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-2 and §11; `packages/provegate/src/core/state/index.ts`; `packages/provegate/src/core/index.ts`; `packages/provegate/src/index.ts`; `scripts/adopter-smoke.sh`. Section 11 now requires both migration symbols to import from the installed package root as well as checking the wrapper throw and stable code. Exact change: none.

4. **CLOSED — iteration-3 Missing Piece 4.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-5 and §11. A three-field acknowledgement must report STALE and a matching four-field acknowledgement must pass. The missing audit script is explicitly a blocking preflight supplied by PRD-040. Exact change: none.

5. **CLOSED — iteration-3 Missing Piece 5.** Evidence checked: PRD-043 Memory Inputs against the active records’ `watch` fields and every declared FR Target. No overlapping active record is omitted. Exact change: none.

6. **CLOSED — iteration-3 Missing Piece 6.** Evidence checked: PRD-043 Memory Outputs and Durable Artifacts. The item declares its own diagnostic-result learning rather than deferring to PRD-040 or using ceremonial `none`. Exact change: none.

7. **CLOSED — iteration-3 Missing Piece 7.** Evidence checked: PRD-043 header and value arithmetic. The current file correctly uses RM 2 and total 3.45; the requested-review prompt’s 3.60/RM-3 header is stale. Exact change: none.

8. **OPEN — iteration-4 split-coherence finding.** Evidence checked: `_prds/wip/prd-040-operator-gate-coherence.md`, §5, §7 Migration, Memory Inputs, §11, §12, and Changelog, against PRD-043 §§4–7. The §7 audit reference is now correctly FR-7, but the rest of the claimed sweep is not present. Exact change in PRD-040:

   - In §5, change the METHOD reference from FR-9 to FR-8.
   - In §7 Migration, delete the `refusal` audit classification and its default-stop rule; FR-7 defines only count changes and zero-row acceptance changes.
   - In §7 Rollback, delete the unreadable-input refusal aside and leave only this item’s unintended-count-change trigger.
   - In Memory Inputs, change known-red cleanup FR-8→FR-9, resume enforcement FR-6→FR-5, and the declaration state-model reference FR-5/FR-6→FR-4/FR-5.
   - Rewrite the `surface-set-without-its-predicate` disposition: FR-6 is the audit acknowledgement script and adds no lint predicate.
   - Replace the `narrow-the-grammar-not-the-parser` claim that FR-4 states parser interim behavior with the actual owner, §7/FR-2–FR-3.

9. **OPEN — new measured-baseline contradiction.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §1 and §2 Success Metrics, against the supplied fourteen-shape measurement and PRD-040 §7. Exact change: replace §1’s “Each of those returns `0`” with the measured current outcomes—missing `Result` 0, no-separator table 2, narrow row 2, unterminated fence 0—and explain that after PRD-040 they still produce unjustified numeric outcomes rather than refusals. Change §2’s metric from “Unreadable artifacts counted as zero” to “Unreadable artifacts treated as usable numeric results.”

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.4   | ITERATE | Parser, public API, presence, sequencing, audit, memory, and value contracts were incomplete. |
| 2   | 2026-08-07 | 7.2   | ITERATE | Diagnostic identity, hard dependency, durable learning, and value closures verified; parser/state contradictions, packaging, fingerprint, and split issues remained. |
| 3   | 2026-08-07 | 7.7   | ITERATE | Position-based blocks, discriminated presence, installed-smoke scope, and four-field fingerprint improved the item; four findings remained. |
| 4   | 2026-08-07 | 7.9   | ITERATE | Audit compatibility and package-root requirements improved; boundaryless controls, installed-reader verification, and PRD-040 restatements remained. |
| 5   | 2026-08-07 | 7.8   | ITERATE | Installed package-root export verification closed. The claimed boundaryless and PRD-040 sweeps are absent from the live sections, and §1 contradicts the measured counter baseline. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- No push code path: compliant; none is proposed.
- Zero runtime dependencies: compliant; none is proposed.
- No telemetry or network calls: compliant.
- Method-content traceability: compliant; Addendum A3 Clause 5 authorizes unreadable-artifact refusal.
- Addendum boundary: compliant; no template default, acceptance authorship, or acceptance schema change is proposed.
- ADR compliance: no conflict identified.
- Canonical status vocabulary: unaffected.
- Public API compatibility: the breaking throw, affected callers, installed migration exports, changeset, release, and rollback are stated.
- Dependency ordering: hard-gated; PRD-040, its fixtures, and its compatible audit interface must exist before Phase 3/4 starts.
- Split ownership: warning placement in PRD-043 is correct; PRD-040 still contains stale refusal, rollback, lint, and FR-number restatements.
- Memory Outputs: substantive learning declared and repeated under Durable Artifacts.
- Value score: `3.45 (5/4/3/2/2)` is arithmetically and substantively correct.

---

## Verdict

ITERATE — no hard cap is tripped, but the score remains below 8.0. FR-1 still assigns acceptance and refusal to the same matching boundaryless table, the overview contradicts measured counter behavior, and PRD-040’s live sections retain several split violations that its Changelog incorrectly claims were removed.
