# Readiness Assessment: PRD-043 — An Unreadable Task Artifact Refuses, It Never Counts Zero

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-043-unreadable-artifact-refuses.md` |
| Score                  | 7.8/10 |
| Verdict                | ITERATE |
| Iteration              | 7 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — direct `lintPrd` returned `{"ok":true,"issues":[]}`; the full CLI rerun reached the read-only sandbox boundary while refreshing `_state/prds.json`, and the supplied `gate check PRD-043` result passes |
| State Record           | pending — read-only assessment |

---

## Model Tier Recommendation

| Phase               | Tier                          | Rationale |
| ------------------- | ----------------------------- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | PRD-043’s measured baseline is corrected, but PRD-040’s live sections still contradict the split, and two existing consumers of the newly unusable count remain outside the contract. |
| Phase 6 (Audit)     | —                             | Re-score after the live predecessor text and complete consumer/test surface are specified. |

---

## Analysis

### 1. Technical Depth & Architecture

PRD-043’s iteration-6 baseline finding is closed. Its §1 now states the measured results accurately: missing `Result` column 0, separator-less table 2, narrow row 2, and unterminated fence 0. It also correctly distinguishes PRD-040’s numeric changes from PRD-043’s refusal behavior. The §2 metric now asks whether unreadable artifacts are answered with a number, which matches the actual defect.

FR-1’s boundaryless-table predicate remains coherent with the current implementation and A3 Clause 5:

- Current `splitTableCells` requires leading and trailing pipes.
- An ordinary line containing `|` is not refused by itself.
- The line must be followed by an equal-width separator candidate, making the pair a boundaryless table rather than isolated prose.
- The separator-less piped table and unequal-width data row are separately refused.
- Positive controls differ in the refused property.

The diagnostic architecture is otherwise appropriate:

- `scanDocument().unreliable` identifies unclosed fences and HTML comments.
- `artifacts.ts:641` provides the cited diagnostic-result precedent.
- `buildState` is the correct place to persist both count and problem.
- `operatorGateOk` is the correct close-blocking consumer.
- `lintPrd` plus `runCheck` is the correct fatal-problem/non-fatal-warning boundary.

However, the declared “no consumer may use the unjustified count” invariant is incomplete against the current code. `packages/provegate/src/core/state/query.ts::formatCompactRecord` copies `operatorHandoffCount` into the exported compact record, and `packages/provegate/src/cli.ts::runGate` prints it in the plan before any gate runs. Both can surface an explicitly unusable count without consulting `operatorHandoffProblem`. The PRD currently models only `operatorGateOk` and `lintPrd` as consumers.

PRD-040’s claimed full split cleanup also did not land in its live sections. Its changelog describes edits that the current §5, §7, and Memory Inputs do not contain.

### 2. Edge Cases & Failure Modes

The important parsing failures are covered: missing or duplicate ledger `Result` columns, missing table separators, width mismatches, boundaryless tables, scanner unreliability, multiple ordered diagnostics, and absent task artifacts.

Sequencing is a genuine hard precondition. FR-5 states that Phase 3/4 cannot begin until PRD-040 is merged, its grammar fixtures exist, and `scripts/audit-operator-rows.mjs` exposes `--assert-acknowledged`. The script is currently absent, so implementation correctly cannot start from this checkout. If PRD-040 ships without that interface, preflight fails instead of silently omitting the audit.

The fingerprint migration is also sound: PRD-040’s three-field acknowledgement becomes stale when PRD-043 adds the refusal field, and both stale and matching cases are verification obligations.

The split itself remains incoherent in the current PRD-040:

- §5 still says all four unreadable shapes contribute zero under PRD-040, contradicting its own measurement and §7.
- §7 still includes a `refusal` audit classification that PRD-040 does not implement.
- §7’s rollback still discusses PRD-043 refusals.
- Memory Inputs still assign resume behavior to FR-6 instead of FR-5 and the state model to FR-5/FR-6 instead of FR-4/FR-5.
- The `surface-set-without-its-predicate` disposition still claims FR-6 adds a lint predicate, although the lint surface moved wholly to PRD-043.
- The `narrow-the-grammar-not-the-parser` disposition still assigns interim behavior to FR-4 rather than §7/FR-2–FR-3.

The METHOD reference, known-red reference, audit’s zero-row acceptance population, and escape-parity examples are now corrected.

### 3. Maintainability & DX

The public numeric API compatibility story is complete:

- `countOperatorHandoff` is exported through `core/state/index.ts`, `core/index.ts`, and the package root.
- `buildState` is its current internal production caller.
- `scripts/adopter-smoke.sh` imports it from an installed package.
- FR-2 explicitly calls the new throw a runtime compatibility break.
- The changeset must name the break and the migration.
- `readOperatorHandoff` and `OperatorHandoffUnreadableError` must be package-root exports.
- The installed-package assertion verifies the error class and stable code.

The `PrdReadyReport.warnings` change has an unlisted regression surface. `packages/provegate/test/prd-ready.test.ts` contains six exact expectations of `{ ok: true, issues: [] }`. Adding a required `warnings: string[]` changes that object shape and will fail those tests, yet the file is absent from FR-4 Targets, Implementation Scope, Conflict Surface, and §11.

The Phase-2 warning itself remains correctly owned by PRD-043 because it depends on this item’s task diagnostic, `lintPrd` parameter, report shape, and `runCheck` plumbing. PRD-040 correctly owns enforcement at the chain and merge gates.

### 4. Migration & Rollback

The optional `StateRecord.task.operatorHandoffProblem` supports previously generated state snapshots. The reader is pure and performs no disk migration, so reverting the implementation restores earlier behavior.

The release and changeset treatment is proportionate for a pre-1.0 package, but the public throw is still the dominant compatibility risk. RM 2 remains more accurate than RM 3.

The live value header is:

`3.45 (MF/UI/TL/AR/RM: 5/4/3/2/2)`

The arithmetic is correct:

`0.25×5 + 0.25×4 + 0.20×3 + 0.15×2 + 0.15×2 = 3.45`.

- MF 5 is justified: owner-approved A3 Clause 5 is unimplemented method behavior, not merely an ordinary parser bug.
- UI 4 is justified by preventing silent or spurious close decisions.
- TL 3 and AR 2 are proportionate.
- RM 2 correctly reflects a public function beginning to throw and the additional refusal paths.

### 5. Memory Inputs

Every declared disposition was challenged:

- `scope-out-the-layer-the-rounds-keep-hitting` and `state-model-before-mechanism` substantively justify the PRD-040/043 split.
- `assert-absent-needs-an-independent-cause` and `fixture-must-reach-production-shape` correctly require isolated failures and production-level `runCheck` coverage.
- `metadata-declares-what-it-cannot-provide` directly supports refusing an unjustified numeric result.
- `gate-run-resume-after-archive` and `strictness-added-during-extraction-is-a-behavior-change` correctly inform late refusal and compatibility treatment.
- `surface-set-without-its-predicate` correctly motivates the `present` discriminator in PRD-043.
- `operator-row-must-be-a-table-row` is correctly reviewed rather than re-applied; PRD-040 owns row counting.
- `exemption-marker-needs-no-prose` is reasonably non-applicable because no exemption syntax is introduced.
- `narrow-the-grammar-not-the-parser` supports the closed refusal predicates and positive controls.
- `a-rule-corrected-survives-where-it-is-restated` is highly relevant and currently violated by PRD-040’s live restatements.
- `two-parsers-wrong-together` is correctly reviewed because one reader serves both decision consumers.

No active indexed record with a `watch` overlapping a declared PRD-043 FR Target is missing.

Memory Outputs is substantive, not a ceremonial `none`. PRD-043 declares `_brain/learnings/unreadable-input-needs-a-diagnostic-result.md` and repeats it under Durable Artifacts. Deferring that diagnostic-result fact to PRD-040 would be dishonest; the current declaration correctly keeps it with PRD-043.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15%    | 7.0/10 | The main state model and sequencing are explicit, but the live predecessor text and full consumer surface are not coherent. |
| 2         | Completeness             | 20%    | 7.0/10 | Public migration and audit growth are strong; compact-record/plan consumers and an impacted test file are omitted. |
| 3         | Technical Depth          | 25%    | 7.5/10 | Strong parser and diagnostic design, but the “unusable count” invariant is not carried through every current consumer. |
| 4         | Multi-Tenancy & Security | 20%    | 9.5/10 | No protected route, endpoint, query, tenant, auth, secret, telemetry, or network surface is introduced. |
| 5         | Scope & Testability      | 10%    | 7.0/10 | Refusal controls and preflight are strong; current exact-shape lint tests are outside the declared scope. |
| 6         | Migration & Rollback     | 10%    | 8.5/10 | Public throw, package-root migration exports, state compatibility, changeset, release, audit growth, and revert are stated. |
| **Total** | **Weighted**             |        | **7.8/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, or query path is touched.
- Contract cap: not tripped — no client-to-server payload is introduced.
- Lint cap: not tripped — direct lint returned `{"ok":true,"issues":[]}`; the full CLI attempt failed only on the read-only `_state/prds.json` refresh, and the supplied full check passes.
- Method-content cap: not tripped — behavior traces directly to owner-approved Addendum A3 Clause 5.
- Runtime-dependency cap: not tripped — no runtime dependency is proposed.
- Push cap: not tripped — no remote-push path is proposed.

---

## Missing Pieces (to reach 10/10)

1. **CLOSED — iteration-4 Missing Piece 1.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-1 “One outcome per shape” and Positive Controls, against §6 and `packages/provegate/src/core/state/markdown.ts::splitTableCells`. A matching boundaryless table has only the `problem` outcome; ordinary `|` prose requires the matching-separator second half before refusal. Exact change: none.

2. **CLOSED — iteration-3 Missing Piece 2.** Evidence checked: PRD-043 §4 FR-3/FR-4 against `build.ts::StateRecord`, `buildState`, `prd-ready.ts::lintPrd`, and `cli.ts::runCheck`. The optional state diagnostic, discriminated presence union, and construction point remain explicit. Exact change: none.

3. **CLOSED — iteration-4 Missing Piece 3.** Evidence checked: PRD-043 §4 FR-2 and §11 against `core/state/index.ts`, the package-root wildcard exports, and `scripts/adopter-smoke.sh`. The migration symbols and stable error identity are asserted from the installed package. Exact change: none.

4. **CLOSED — iteration-3 Missing Piece 4.** Evidence checked: PRD-043 §4 FR-5 and §11. Three-field acknowledgements become stale, matching four-field acknowledgements pass, and an absent PRD-040 audit interface blocks implementation. Exact change: none.

5. **CLOSED — iteration-3 Missing Piece 5.** Evidence checked: PRD-043 Memory Inputs against each named active record and its `watch`. No overlapping active record is omitted. Exact change: none.

6. **CLOSED — iteration-3 Missing Piece 6.** Evidence checked: PRD-043 Memory Outputs and Durable Artifacts. The diagnostic-result learning is substantive and belongs to this item. Exact change: none.

7. **CLOSED — iteration-3 Missing Piece 7.** Evidence checked: PRD-043 header and value comment. `3.45 (5/4/3/2/2)` is arithmetically correct, MF 5 is justified, and RM 2 properly reflects the public throw. Exact change: none.

8. **OPEN — iteration-4 split-coherence finding.** Evidence checked: `_prds/wip/prd-040-operator-gate-coherence.md`, §5, §7 Migration/Rollback, Memory Inputs, §11, and Changelog, against PRD-043 §§4–7. The METHOD reference, known-red reference, zero-row audit population, and parity fixture are corrected; the remaining claimed edits are absent. Exact changes in `_prds/wip/prd-040-operator-gate-coherence.md`:

   - In §5, replace “under this item each contributes zero rows” with: separator-less table `2→0`, narrow row `2→1`, missing `Result` column `0`, and unterminated fence read as far as the scanner permits; state that none refuses.
   - In §7 Migration, remove the `refusal` classification/default-stop passage. FR-7 has count changes and zero-row acceptance changes only.
   - In §7 Rollback, remove the unreadable-refusal aside and retain only unintended count-change rollback.
   - In Memory Inputs, change resume enforcement FR-6→FR-5 and state-model references FR-5/FR-6→FR-4/FR-5.
   - Rewrite the `surface-set-without-its-predicate` disposition: the lint surface left PRD-040, and FR-6 is the audit acknowledgement predicate.
   - Replace `narrow-the-grammar-not-the-parser`’s FR-4 interim-behavior reference with §7/FR-2–FR-3.

9. **CLOSED — iteration-5 measured-baseline contradiction.** Evidence checked: PRD-043 §1 and §2 against PRD-040 §7 and the supplied fourteen-shape measurement. §1 now reports 0/2/2/0 and PRD-040’s 0/1 interim changes without claiming refusal; §2 now measures whether unreadable input is answered with a number. Exact change: none.

10. **CLOSED — iteration-6 escape-parity fixture contradiction.** Evidence checked: PRD-040 §6 and §11 against §4 FR-2. Both places now distinguish `a\|b` as odd/escaped/one cell from `a\\|b` as even/separating/two cells. Exact change: none.

11. **OPEN — incomplete unusable-count consumer inventory.** Evidence checked: PRD-043 §2 and §4 FR-1/FR-3 against `packages/provegate/src/core/state/query.ts::formatCompactRecord` and `packages/provegate/src/cli.ts::runGate`. Both currently read or print `operatorHandoffCount` without a problem check. Exact change: in `_prds/wip/prd-043-unreadable-artifact-refuses.md`, expand FR-3, §8, Conflict Surface, and §11 to name these consumers and define their problem behavior—for example, compact/queue output exposes an unreadable diagnostic instead of a numeric count, and the run plan prints the problem rather than `operator rows: N`. Add `packages/provegate/test/state-query.test.ts` and the appropriate CLI production-path test.

12. **OPEN — `PrdReadyReport.warnings` regression surface omitted.** Evidence checked: PRD-043 §4 FR-4, §8, Conflict Surface, and §11 against `packages/provegate/test/prd-ready.test.ts`. That file has six exact `{ ok: true, issues: [] }` expectations that will fail when `warnings: string[]` is added. Exact change: add `packages/provegate/test/prd-ready.test.ts` to FR-4 Targets, Implementation Scope, Conflict Surface, and the FR-4 verification row; require its exact report-shape expectations to include `warnings: []` and add a focused warning/no-warning assertion.

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
| 7   | 2026-08-07 | 7.8   | ITERATE | PRD-043’s measured baseline and PRD-040’s parity fixture closed. PRD-040’s claimed live-section sweep remains incomplete, and current count consumers/test surfaces are omitted. |

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
- Public API compatibility: the breaking throw, visible installed caller, migration exports, changeset, release, and rollback are stated.
- Dependency ordering: hard-gated; PRD-040, its fixtures, and its compatible audit script must exist before implementation.
- Split ownership: warning placement in PRD-043 is correct; PRD-040’s live §5, §7, and Memory Inputs remain stale.
- Memory Outputs: substantive learning declared and repeated under Durable Artifacts.
- Value score: `3.45 (5/4/3/2/2)` is arithmetically and substantively correct.

---

## Verdict

ITERATE — the iteration-6 measured-baseline and escape-parity findings are genuinely closed, and no hard cap is tripped. The item remains below 8.0 because PRD-040’s live split restatements still contradict its changelog, while PRD-043’s “unusable count” contract omits existing compact-record and run-plan consumers and the `PrdReadyReport.warnings` change omits a directly affected test file.
