# Readiness Assessment: PRD-043 — An Unreadable Task Artifact Refuses, It Never Counts Zero

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-043-unreadable-artifact-refuses.md` |
| Score                  | 7.9/10 |
| Verdict                | ITERATE |
| Iteration              | 8 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — direct `lintPrd` returned `{"ok":true,"issues":[]}`; full CLI reached the read-only sandbox boundary while refreshing `_state/prds.json` |
| State Record           | pending — read-only assessment |

---

## Model Tier Recommendation

| Phase               | Tier                          | Rationale |
| ------------------- | ----------------------------- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | The previous consumer and regression-test omissions are substantially repaired, but the new compact-record contract presents an unresolved public representation choice, and PRD-040 still contains split survivors. |
| Phase 6 (Audit)     | —                             | Re-score after the public compact/queue shape and the remaining cross-item restatements are made exact. |

---

## Analysis

### 1. Technical Depth & Architecture

FR-1 remains technically coherent with the current parser and Addendum A3 Clause 5:

- `splitTableCells` currently accepts only lines with leading and trailing pipes.
- The boundaryless-table refusal requires both a separator-shaped following line and equal cell counts. Ordinary prose containing `|` does not refuse from that character alone.
- The measured separator-less piped table and unequal-width row are separately classified as problems.
- Positive controls isolate the rejected property.
- `scanDocument().unreliable` exposes unclosed fences and HTML comments, while `artifacts.ts:641` demonstrates the cited diagnostic-result precedent.

FR-2’s public numeric-export story remains complete for `countOperatorHandoff` itself. The function is exported through `core/state/index.ts` and the package root; `buildState` is its current production caller, and `scripts/adopter-smoke.sh` imports it from an installed package. The PRD explicitly calls the new throw a runtime compatibility break, provides stable error identity, requires package-root migration exports, and assigns it to the changeset.

FR-3 now names the previously omitted readers:

- `operatorGateOk`
- `lintPrd` through FR-4
- `formatCompactRecord`
- `runRun`’s plan line
- `runRun`’s final handoff-card call

That closes the inventory portion of iteration-7 finding 11, but not the contract. `CompactRecord` is itself a package-root-exported public type and feeds `gate queue --json`. FR-3 says it may carry the problem “alongside or … in place of the count,” leaving the implementer to choose between incompatible JSON and TypeScript shapes. It also calls `cli.ts:1470` a “JSON summary”; the code actually passes the numeric value to the final human handoff card. That card is reached only after the gate chain succeeds, so the correct problem behavior is likely “unreachable on an unreadable artifact,” not “print the problem instead of the number.” The current wording does not settle that distinction.

The previous fix also left stale cardinality in PRD-043 itself: §2 still measures “0 of 2 → 2 of 2,” and §7 still says “two consumers,” despite FR-3 now enumerating five read sites.

### 2. Edge Cases & Failure Modes

The parsing matrix is strong: missing or duplicate ledger `Result` columns, separator-less tables, unequal row widths, boundaryless tables, scanner unreliability, independently caused failures, multiple ordered diagnostics, and absent task artifacts are covered.

Sequencing passes. FR-5 makes PRD-040, its grammar fixtures, and `scripts/audit-operator-rows.mjs --assert-acknowledged` hard Phase-3/Phase-4 preconditions. The script is currently absent because PRD-040 has not landed; if it ships without the promised interface, PRD-043 stops before implementation rather than skipping the audit.

The fingerprint growth is also explicit: PRD-040’s three-field acknowledgement becomes stale, and matching four-field evidence is required.

The PRD-040 split sweep is not fully closed:

- §5 now states the measured interim outcomes correctly and says none refuses.
- §7 now names the four count-change sources plus zero-row acceptance changes.
- Rollback is correctly reduced to unintended count changes.
- The state-model, surface-predicate, and narrow-grammar dispositions are corrected.
- However, §7 immediately reintroduces an “unreadable-artifact population,” says it is “recorded here,” and globally says “this item performs no refusals,” despite FR-7 defining only two audit populations and FR-4/FR-5 performing declaration refusals.
- The `gate-run-resume-after-archive` disposition still says “FR-6 therefore evaluates it a second time inside `operatorGateOk`.” FR-6 is the audit acknowledgement; FR-5 owns the second invariant evaluation.

Thus the changelog’s measured-sweep claim is still refuted by the live file.

### 3. Maintainability & DX

Iteration-7 finding 12 is closed. `prd-ready.test.ts` contains the six exact `{ ok: true, issues: [] }` expectations identified by the previous report, and FR-4 now requires them to become deep-equality assertions against the new `warnings: []` shape rather than weakening the matcher.

The Phase-2 warning remains correctly placed in PRD-043. It depends on this item’s diagnostic, `lintPrd` parameter, report shape, and `runCheck` plumbing. PRD-040 correctly retains the chain and merge enforcement.

The unresolved compact-record representation is a maintainability and migration issue, not a naming detail. `CompactRecord` is exported and serialized by `gate queue --json`. Supplying both an unusable number and a problem permits external consumers to continue reading the number; replacing or nulling the number changes the public contract. The PRD must choose one result shape and state its release treatment.

### 4. Migration & Rollback

The optional `StateRecord.task.operatorHandoffProblem` keeps older state snapshots structurally loadable. The reader is pure, and no disk data is migrated, so reverting the implementation restores prior behavior.

Rollback, corpus measurement, and the minor release are proportionate. The public numeric throw is covered, but the newly affected `CompactRecord`/queue JSON contract is not yet included in the compatibility story.

The prompt’s quoted `3.60 (5/4/3/2/3)` header is no longer current. The live header is:

`3.45 (MF/UI/TL/AR/RM: 5/4/3/2/2)`

Its arithmetic is correct:

`0.25×5 + 0.25×4 + 0.20×3 + 0.15×2 + 0.15×2 = 3.45`.

- MF 5 is justified: owner-approved A3 Clause 5 is unimplemented method behavior, not merely an ordinary parser defect.
- UI 4 is justified by preventing silent closes and unjustified acceptance demands.
- TL 3 and AR 2 remain proportionate.
- RM 2 is more accurate than RM 3 because a public function begins throwing and a public compact/JSON representation must change or become discriminated.

### 5. Memory Inputs

Each declared disposition was challenged:

- `scope-out-the-layer-the-rounds-keep-hitting` and `state-model-before-mechanism` substantively support the split.
- `assert-absent-needs-an-independent-cause` and `fixture-must-reach-production-shape` require isolated failures and production-shaped CLI coverage.
- `metadata-declares-what-it-cannot-provide` directly supports refusing an unjustified count.
- `gate-run-resume-after-archive` and `strictness-added-during-extraction-is-a-behavior-change` correctly inform resumed refusal and compatibility treatment.
- `surface-set-without-its-predicate` supports the explicit presence discriminator.
- `operator-row-must-be-a-table-row`, `exemption-marker-needs-no-prose`, and `two-parsers-wrong-together` are appropriately reviewed.
- `narrow-the-grammar-not-the-parser` supports the closed predicates and positive controls.
- `a-rule-corrected-survives-where-it-is-restated` remains highly relevant and is still violated by both PRDs’ surviving restatements.

No active indexed record with a `watch` overlapping a declared PRD-043 FR Target is missing.

Memory Outputs is not ceremonial. PRD-043 now declares `_brain/learnings/unreadable-input-needs-a-diagnostic-result.md` and repeats it under Durable Artifacts. The diagnostic-result fact is not deferred to PRD-040 and correctly belongs to this item.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15%    | 7.0/10 | FR-3 leaves alternative public representations open and misidentifies the final handoff-card call as JSON. |
| 2         | Completeness             | 20%    | 7.0/10 | The reader inventory is named, but its public output/migration contract and two PRD-040 survivors remain incomplete. |
| 3         | Technical Depth          | 25%    | 8.0/10 | Parser, scanner, state, refusal, and audit design are strong; the compact/queue consumer needs one exact state model. |
| 4         | Multi-Tenancy & Security | 20%    | 9.5/10 | No route, endpoint, query, tenant, auth, secret, telemetry, or network surface is introduced. |
| 5         | Scope & Testability      | 10%    | 7.5/10 | Refusal controls and lint regression tests are strong; the final-card behavior and stale consumer counts need executable correction. |
| 6         | Migration & Rollback     | 10%    | 7.5/10 | Numeric-export compatibility is covered; exported `CompactRecord` and queue JSON compatibility are not. |
| **Total** | **Weighted**             |        | **7.9/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, or query path is touched.
- Contract cap: not tripped — no client-to-server payload is introduced.
- Lint cap: not tripped — direct `lintPrd` returned `{"ok":true,"issues":[]}`.
- Method-content cap: not tripped — the behavior traces to owner-approved Addendum A3 Clause 5.
- Runtime-dependency cap: not tripped — no runtime dependency is proposed.
- Push cap: not tripped — no remote-push path is proposed.

---

## Missing Pieces (to reach 10/10)

1. **CLOSED — iteration-4 Missing Piece 1.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-1 and §6, against `packages/provegate/src/core/state/markdown.ts::splitTableCells`. The boundaryless predicate requires both matching separator shape and cell count, while ordinary `|` prose is a positive control. Exact change: none.

2. **CLOSED — iteration-3 Missing Piece 2.** Evidence checked: PRD-043 §4 FR-3/FR-4 against `build.ts::StateRecord`, `buildState`, `prd-ready.ts::lintPrd`, and `cli.ts::runCheck`. The optional state diagnostic and discriminated artifact-presence input remain explicit. Exact change: none.

3. **CLOSED — iteration-4 Missing Piece 3.** Evidence checked: PRD-043 §4 FR-2 and §11 against `core/state/index.ts`, package-root wildcard exports, and `scripts/adopter-smoke.sh`. The reader, error class, stable code, and installed-package throw are all required. Exact change: none.

4. **CLOSED — iteration-3 Missing Piece 4.** Evidence checked: PRD-043 §4 FR-5 and §11. PRD-040’s script interface is a hard precondition, three-field evidence becomes stale, and matching four-field evidence passes. Exact change: none.

5. **CLOSED — iteration-3 Missing Piece 5.** Evidence checked: PRD-043 Memory Inputs against the named active records and their watches. No overlapping active record is omitted. Exact change: none.

6. **CLOSED — iteration-3 Missing Piece 6.** Evidence checked: PRD-043 Memory Outputs and Durable Artifacts. The diagnostic-result learning is substantive and is not deferred to PRD-040. Exact change: none.

7. **CLOSED — iteration-3 Missing Piece 7.** Evidence checked: PRD-043 header and value comment. The live value is correctly `3.45 (5/4/3/2/2)`; MF 5 is justified and RM 2 correctly reflects public compatibility risk. Exact change: none.

8. **OPEN — iteration-4 split-coherence finding.** Evidence checked: `_prds/wip/prd-040-operator-gate-coherence.md`, §7 Migration/Rollback and Memory Inputs, against §4 FR-4–FR-7. Most claimed closures landed, but two live survivors remain. Exact changes:

   - In PRD-040 §7 Migration, delete the unreadable-artifact population/“recorded here” passage and replace the global “this item performs no refusals” statement with: “PRD-043’s unreadable-artifact population is not audited here; this item’s rollback trigger is only an unintended count change.”
   - In PRD-040 Memory Inputs, `gate-run-resume-after-archive`, change “FR-6 therefore evaluates it a second time inside `operatorGateOk`” to “FR-5 therefore evaluates it a second time inside `operatorGateOk`.”
   - In PRD-040 §5, either remove “the refusal messages teach the shape” or bind it to a specified PRD-040 diagnostic; FR-4 currently promises only declaration, count, and file.

9. **CLOSED — iteration-5 measured-baseline contradiction.** Evidence checked: PRD-043 §1–§2 against PRD-040 §7 and the fourteen-shape measurement. The live text reports 0/2/2/0 and correctly describes the defect as an unjustified number rather than only zero. Exact change: none.

10. **CLOSED — iteration-6 escape-parity contradiction.** Evidence checked: PRD-040 §6 and §11 against FR-2. Odd `\|` and even `\\|` source forms are now distinct in both places. Exact change: none.

11. **OPEN — iteration-7 unusable-count consumer finding is only partially closed.** Evidence checked: PRD-043 §4 FR-3, §7, §8, Conflict Surface, and §11 against `query.ts::CompactRecord`, `formatCompactRecord`, `buildQueue`, `cli.ts::runQueue`, and `cli.ts::runRun`. All current readers are named, but their contract remains an alternative and the public compatibility effect is omitted. Exact changes in `_prds/wip/prd-043-unreadable-artifact-refuses.md`:

   - In FR-3, choose one exact `CompactRecord`/queue JSON representation. For example, require `operatorHandoffs: number | null` plus `operatorHandoffProblem: string | null`, with the number necessarily `null` when a problem exists; remove “alongside or … in place.”
   - State in §7 Migration that `CompactRecord` is package-root exported and `gate queue --json` exposes it, and require the changeset to name that representation change.
   - Correct `cli.ts:1470` from “JSON summary” to “final handoff-card call.” Specify that an unreadable artifact must refuse before this call, so the test asserts no success handoff card is emitted; only the dry-run/plan line prints the diagnostic in place of the count.
   - In §11, add an exact `gate queue --json` assertion for the chosen discriminated representation and a production `gate run` assertion that the problem path emits no final handoff card.

12. **CLOSED — iteration-7 `PrdReadyReport.warnings` regression surface.** Evidence checked: PRD-043 §4 FR-4, §8, Conflict Surface, and §11 against `packages/provegate/test/prd-ready.test.ts`. The six exact expectations are named and must be updated through deep equality, with the test file present in every required scope section. Exact change: none.

13. **OPEN — previous-round inventory fix left stale restatements in PRD-043.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §2 Success Metrics and §7 Architecture, against FR-3’s current inventory. Exact change: replace “0 of 2 → 2 of 2” and “two consumers” with the enumerated five read sites and their distinct behaviors, or use “all enumerated sites” to avoid another stale cardinality.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.4   | ITERATE | Parser, public API, presence, sequencing, audit, memory, and value contracts were incomplete. |
| 2   | 2026-08-07 | 7.2   | ITERATE | Diagnostic identity, hard dependency, durable learning, and value closures verified; parser/state contradictions, packaging, fingerprint, and split issues remained. |
| 3   | 2026-08-07 | 7.7   | ITERATE | Position-based blocks, discriminated presence, installed-smoke scope, and four-field fingerprint improved the item; four findings remained. |
| 4   | 2026-08-07 | 7.9   | ITERATE | Audit compatibility improved; boundaryless controls, installed-reader verification, and PRD-040 restatements remained. |
| 5   | 2026-08-07 | 7.8   | ITERATE | Installed exports closed. The claimed boundaryless and PRD-040 sweeps were absent, and §1 contradicted measured behavior. |
| 6   | 2026-08-07 | 7.9   | ITERATE | FR-1’s one-outcome rule closed; PRD-043’s baseline, PRD-040’s split sweep, and PRD-040’s parity fixture remained open. |
| 7   | 2026-08-07 | 7.8   | ITERATE | Measured baseline and parity closed; predecessor restatements and count-consumer/test surfaces remained. |
| 8   | 2026-08-07 | 7.9   | ITERATE | Warning regression surface closed and readers were inventoried. The inventory fix left an unresolved public compact/JSON shape, stale consumer counts, and two PRD-040 split survivors. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- No push code path: compliant; none is proposed.
- Zero runtime dependencies: compliant; none is proposed.
- No telemetry or network calls: compliant.
- Method-content traceability: compliant; Addendum A3 Clause 5 authorizes the refusal.
- Addendum boundary: compliant; no template default, acceptance authorship, or acceptance schema change is proposed.
- ADR compliance: no conflict identified.
- Canonical status vocabulary: unaffected.
- Public numeric API compatibility: complete for `countOperatorHandoff`.
- Public compact/JSON compatibility: incomplete; `CompactRecord` representation remains an implementation choice.
- Dependency ordering: hard-gated; PRD-040, its fixtures, and its compatible audit script must exist before Phase 3/4 begins.
- Split ownership: warning placement is correct, but PRD-040 §7 and its resume disposition retain survivors.
- Memory Outputs: substantive learning declared and repeated under Durable Artifacts.
- Value score: live `3.45 (5/4/3/2/2)` is arithmetically and substantively correct.

---

## Verdict

ITERATE — no hard cap is tripped, and iteration-7’s warning-test omission is genuinely closed. The score remains below 8 because the consumer-inventory repair introduced an unresolved public `CompactRecord`/queue JSON contract, misclassified the final handoff-card call, left stale “two consumer” restatements in PRD-043, and did not actually remove two claimed PRD-040 sweep survivors.
