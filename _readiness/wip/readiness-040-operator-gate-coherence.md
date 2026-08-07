# Readiness Assessment: PRD-040 — Operator Gate Coherence

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-040-operator-gate-coherence.md` |
| Score                  | 7.3/10 |
| Verdict                | ITERATE |
| Iteration              | 3 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — orchestrator-provided out-of-sandbox `gate check PRD-040` result |
| State Record           | pending — read-only scoring session |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | The scanner grammar, public numeric-wrapper behavior, readiness diagnostic path, and migration audit still require binding decisions. |
| Phase 6 (Audit)     | — | Re-score after malformed input has an exact contract at every caller and the audit covers the new zero-row policy. |

---

## Analysis

### 1. Technical Depth & Architecture

The original measurements remain correct against `packages/provegate/src/core/state/markdown.ts`:

| Shape | Current result | Required result |
| ----- | -------------- | --------------- |
| Plain prose bullet | 0 | 1 |
| Checkbox bullet | 1 | 1 |
| One-row table with `Item` header | 2 | 1 |
| Verification Ledger `Result: operator` | 0 | 1 |

The operation remains linear in document size and introduces no material scalability, concurrency, tenant-isolation, network, or persistence concern.

FR-2 and FR-3 now specify the central parser behavior correctly: handoff tables have structural headers and separators, data rows alone count, multiple blocks sum, and ledger `Result` is located by normalized header name rather than position or whole-row matching.

FR-1 is still not accurate over the actual scanner view. `sectionsMatching` consumes `scanDocument(content).lines` and blanks every non-`text` line. The scanner therefore makes fenced blocks, raw HTML blocks, and indented code unreachable. FR-1 omits raw HTML and indented code, while claiming code spans are masked and unreachable. `scanDocument` deliberately preserves same-line code spans; only carried multiline-span interiors are masked. HTML comments remain `text` lines containing `COMMENT_MASK`, so an item “empty after masking” requires an explicit rule for removing that sentinel.

The admitted list grammar also leaves marker syntax undecided: it does not state the required whitespace after a marker or whether ordered markers use the scanner’s actual one-to-nine-digit range. FR-2’s “unescaped pipes” rule has no fixture defining escape-parity behavior.

FR-4 is no longer a dead return type. It specifies that `buildState` calls `readOperatorHandoff`, stores `operatorHandoffCount` and `operatorHandoffProblem`, and lets `operatorGateOk` consume both. It also preserves the exported numeric `countOperatorHandoff` signature.

Two caller decisions remain:

- The numeric wrapper “delegates,” but the PRD does not say what it returns or throws when `problem` is non-null. Ignoring the problem conflicts with “unsupported input is refused”; throwing is a new public behavioral break not covered by the compatibility claim.
- `runCheck` already has the rebuilt `found.record`, but currently passes only PRD content, root, and number to `lintPrd`. The PRD does not bind whether `runCheck` passes the task diagnostic into `lintPrd`, whether `lintPrd` rebuilds state, or whether it rereads the task file. It also does not explicitly say that a malformed task is a fatal `issue`, distinct from FR-7’s non-fatal declaration warning.

The lifecycle binding is now real. `buildGateChain` begins with the `'4 Implementation'` entry at `chain.ts:515-516`, so a `declaration coherence` gate can be placed immediately before it. The merge gate at `chain.ts:750-754` always calls `operatorGateOk`, and `shouldSkipGate` explicitly never skips a `merge gate`, including for `--from-phase=merge`. Re-evaluating the invariant there reaches every resume mode.

FR-5’s new policy—`operator-gated` requires acceptance even at zero rows—is defensible as making the declaration and QUICKSTART’s conservative default effective. It is nevertheless a larger contract change than the counter repair. It agrees with the shipped PRD template’s description but conflicts with the shipped `METHOD.md` merge table and source workflow statement that zero rows are sufficient. The PRD changes no method-content byte, so no provenance cap is tripped, but the migration must acknowledge and reconcile that observable documentation conflict.

The value arithmetic is exact: `1.25 + 1.25 + 0.60 + 0.30 + 0.30 = 3.70`.

### 2. Edge Cases & Failure Modes

FR-1 names column-zero bullets, ordered markers, checkbox variants, `none`, nested items, blockquotes, paragraphs, headings, and masked-empty items. FR-4 adds malformed-table, ledger-header, cell-width, and unreliable-document refusals.

The grammar fixture obligation is inconsistent. FR-1 and §11 require an individual fixture for each permitted non-row, while §6 combines the nested bullet, blockquote, paragraph, and masked-empty item into one scenario. No operator-reader fixture is required for raw HTML or indented-code masking, and the code-span claim is factually wrong. Escaped-pipe behavior also lacks a named fixture.

FR-4 correctly refuses short and wide rows, missing or duplicate `Result`, missing separators, and non-null `scan.unreliable`. It does not yet define whether the compatibility wrapper propagates or suppresses those refusals.

The lifecycle split is otherwise complete:

- `eligible` with positive rows is refused before Phase 4 on a normal run.
- The same contradiction is re-evaluated inside the unskippable merge gate before acceptance lookup.
- `operator-gated` requires an acceptance regardless of count.
- Phase 2 stays silent while no task artifact exists and warns, rather than fails, once an eligible/row contradiction becomes observable.

The three current KNOWN_RED entries are correctly identified as `handoff-prose`, `handoff-table`, and `ledger-operator`. The harness already fails when a known-red assertion turns green, so deleting them in FR-9 closes that bypass.

### 3. Maintainability & DX

The work stays in strict TypeScript, adds no runtime dependency, telemetry, network path, protected endpoint, or client/server contract.

The implementation and conflict surfaces now include `build.ts`, `cli.ts`, `.changeset/**`, the PRD Changelog, and the relevant state, acceptance, chain, lint, and CLI tests.

Production-shaped coverage has improved:

- FR-4 requires both production consumers to surface parser problems.
- FR-6 covers the early gate and a `--from-phase=merge` resume.
- FR-7 drives the warning through `runCheck` and preserves the exit code.
- FR-9 exercises the installed package through adopter smoke.

The remaining DX ambiguity is concentrated at the compatibility seam: a public numeric API cannot expose `{count, problem}` without a specified throw, fallback, or best-effort rule. The lint path likewise needs an explicit argument/data-flow contract so its test cannot invoke `lintPrd` with cleaner inputs than `runCheck` supplies.

The shipped tasks-template edit remains an explicit Non-Goal. No FR target moves a prompt, template, or schema byte without snapshot provenance.

### 4. Migration & Rollback

The migration section now names the broad repository and adopter blast radius, preserves the public TypeScript signature, distinguishes handoff and ledger remedies, specifies a minor release, and gives an exact revert trigger for unintended grammar changes. This is materially stronger than iteration 2.

The audit is still not fully load-bearing. FR-8 reports only task artifacts whose count changes. The larger FR-5 behavior change affects every `operator-gated` PRD with zero rows even though its count remains `0 → 0`, so that population cannot appear under any of the four required classifications. This contradicts §7’s claim that the audit reports the two populations separately.

The recorded decision is also incomplete. A `refusal` classification stops by default, but for the other classifications the PRD says the owner chooses go/narrow/stop without defining a required decision record or machine outcome. Pasting raw output into the Changelog proves observation, not authorization to proceed.

The changeset requirement names only “flip the declaration” and “clear the rows.” It omits the remedies an adopter meets first under FR-5: record an owner acceptance or change a zero-row `operator-gated` declaration to `eligible`. It also leaves the shipped `METHOD.md` zero-row predicate inconsistent with the new behavior.

Rollback itself is sound: the counter is pure, no artifact migration occurs, and reverting the code restores the previous behavior.

### 5. Memory Inputs

- `known-red-ledger-must-expire`: substantively applied. FR-9 removes all three owned mappings, and the existing stale-known-red failure prevents them from surviving the repair. Its rationale incorrectly calls this FR-8, but the mechanism is clear.
- `narrow-the-grammar-not-the-parser`: not yet substantively applied. The disposition claims code spans are masked and exposed constructs are exhaustively partitioned; the scanner preserves same-line code spans, masks additional omitted constructs, and leaves marker and escape behavior undefined.
- `operator-row-must-be-a-table-row`: relevant and applied to the measured false-green source.
- `notes-column-runs-commands`: relevant and applied through header-named `Result` lookup.
- `metadata-declares-what-it-cannot-provide`: substantively applied through both declaration directions.
- `assert-absent-needs-an-independent-cause`: relevant, although §6’s combined negative scenario should be reconciled with FR-1 and §11’s individual-fixture obligation.
- `strictness-added-during-extraction-is-a-behavior-change`: relevant and substantially applied through the migration section, but its larger zero-row population is missing from the audit.
- `gate-run-resume-after-archive`: substantively applied. Every resume reaches the merge gate, where the invariant is recomputed.
- `state-model-before-mechanism`: relevant and applied through the two declarations, two evaluation points, and refusal ordering.
- `scope-out-the-layer-the-rounds-keep-hitting`, `fixture-must-reach-production-shape`, `surface-set-without-its-predicate`, `exemption-marker-needs-no-prose`, `evidence-pattern-satisfied-by-the-template`, and `a-rule-corrected-survives-where-it-is-restated`: their reviewed dispositions are relevant.

No active indexed record with a `watch` overlapping a declared FR Target is missing. The watches covering `packages/provegate/test/**`, `core/run/**`, `core/gates/**`, `prd-ready.ts`, `cli.ts`, and `_prds/**` are all dispositioned.

---

## Scorecard

| # | Dimension | Weight | Score | Notes |
| - | --------- | ------ | ----- | ----- |
| 1 | Clarity | 15% | 7/10 | Targets and commands pass the mechanical gate, but scanner facts, wrapper behavior, and lint diagnostic flow remain ambiguous. |
| 2 | Completeness | 20% | 7/10 | Structural parsing and lifecycle directions are covered; unreachable shapes, public malformed-input behavior, and the zero-row migration population are not. |
| 3 | Technical Depth | 25% | 7/10 | State plumbing and resume enforcement are substantially designed, but the compatibility seam and scanner-view partition remain incomplete. |
| 4 | Multi-Tenancy & Security | 20% | 9/10 | No tenant, route, query, network, or client/server surface; acceptance validation remains owner-gated and fail-closed. |
| 5 | Scope & Testability | 10% | 7/10 | Strong target and test coverage overall, but fixture obligations conflict and the audit decision lacks a mechanical outcome. |
| 6 | Migration & Rollback | 10% | 6/10 | Blast radius, remedies, release, and revert are present; the audit omits the largest new behavior and shipped method documentation remains inconsistent. |
| **Total** | **Weighted** |  | **7.3/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, or query path is added or changed.
- Contract cap: not tripped — no client→server payload is introduced.
- Lint cap: not tripped — the orchestrator reports `gate check PRD-040` passed.
- Method-content cap: not tripped — no prompt, template, or schema byte is targeted without provenance.

---

## Missing Pieces (to reach 10/10)

1. **OPEN — iteration-1 grammar finding remains partially closed.** In `_prds/wip/prd-040-operator-gate-coherence.md`, §4 FR-1/FR-2, §6, §7 Architecture, and §11, correct the grammar to the actual scanner view: raw HTML blocks and indented code are unreachable; same-line code spans are preserved; HTML comments leave `COMMENT_MASK`. Define marker whitespace, ordered-marker digit range, masked-empty detection, and escaped-pipe behavior. Require a separate `packages/provegate/test/markdown.test.ts` fixture for every admitted, permitted-zero, unreachable-masked, and refused shape.

2. **OPEN — structural parsing is closed, but the caller contract is still incomplete.** In the same PRD, §4 FR-4/FR-7, §6, §7 Architecture and Migration, and §11, specify what exported `countOperatorHandoff(content): number` does when `readOperatorHandoff` returns a problem. Specify the exact production path by which `runCheck` passes `StateRecord.task.operatorHandoffProblem` to `lintPrd`, and state that malformed task input enters fatal `issues`, while only the declaration/count contradiction enters non-fatal `warnings`. Add CLI and merge-gate tests using those exact production arguments.

3. **CLOSED — lifecycle enforcement and eligible-with-rows contradiction.** FR-6 names a real insertion point before `chain.ts:515` and repeats the invariant in `operatorGateOk` before acceptance lookup. The merge gate is never skipped by `shouldSkipGate`, so `--from-phase=4|5|6|7|merge` cannot bypass the late refusal. FR-5 covers both `eligible` with rows and `operator-gated` without rows.

4. **OPEN — migration measurement does not cover the behavior adopters meet first.** In the same PRD, §4 FR-8, §7 Migration & Compatibility, §11, and the changeset requirement, make the audit report both count changes and `operator-gated` zero-row items whose required acceptance changes despite a `0 → 0` count. Define a machine outcome or required owner-authored decision record for every classification, add the zero-row remedies, and reconcile the new predicate with `packages/provegate/METHOD.md` using named source-snapshot provenance or an owner-approved addendum.

5. **CLOSED — method-content provenance and scope.** The tasks-template edit remains a Non-Goal, and no FR target moves a shipped prompt, template, or schema byte without provenance.

6. **OPEN — memory coverage is complete, but one disposition remains inaccurate.** In `## Memory Inputs`, revise `narrow-the-grammar-not-the-parser` after FR-1/FR-2 accurately partition the scanner’s real outputs and refuse every remaining unsupported construct. `known-red-ledger-must-expire`, `metadata-declares-what-it-cannot-provide`, and `gate-run-resume-after-archive` are substantively applied. No overlapping active record is missing.

7. **CLOSED — value header.** `3.70` recomputes exactly from `5/5/3/2/2`. MF 5 and UI 5 remain defensible for repairing a central method gate; TL 3 and AR 2 fit the localized surface; RM should remain 2 because the migration story exists but still omits the larger zero-row population and documentation reconciliation.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| - | ---- | ----- | ------- | ----------- |
| 1 | 2026-08-07 | 5.7 | ITERATE | Verified all four measured counts; identified grammar, malformed-input, lifecycle, consumer-blast-radius, method-content, memory, and value gaps. |
| 2 | 2026-08-07 | 6.6 | ITERATE | Closed method-content and value findings; added structural parsing and migration prose, but diagnostic plumbing, warning output, lifecycle binding, exhaustive grammar, and load-bearing migration remained open. |
| 3 | 2026-08-07 | 7.3 | ITERATE | Closed the lifecycle binding and most state plumbing; preserved the numeric API and added warning/audit contracts, but scanner claims remain inaccurate, malformed-input behavior is incomplete at two compatibility seams, and the audit omits the new zero-row policy. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- [x] No push code path is introduced.
- [x] `packages/provegate` retains zero runtime dependencies, no telemetry, and no network calls.
- [x] No shipped method-content byte is moved without source provenance.
- [x] No ADR violation is declared or evident from the assessed scope.
- [x] No non-canonical status vocabulary is introduced.
- [x] The four §1 measurements agree with the shipped 0.3.0 source.
- [x] The declaration/count invariant is re-evaluated on every resume path.
- [x] Both declaration directions have an explicit merge-gate outcome.
- [ ] FR-1 describes the actual `scanDocument` view and assigns every shape a fixture-backed outcome.
- [ ] The numeric compatibility wrapper defines its behavior when the diagnostic reader refuses.
- [ ] The malformed-input diagnostic has an exact production path and fatal/non-fatal classification at readiness.
- [ ] The migration audit covers `operator-gated` zero-row items and records a binding decision.
- [ ] The new zero-row acceptance predicate is reconciled with shipped method documentation.
- [ ] `narrow-the-grammar-not-the-parser` is applied to the scanner’s real output rather than the PRD’s claimed one.

---

## Verdict

ITERATE — the lifecycle binding is now implementable and non-skippable, the public signature is preserved, both declaration directions are specified, and the migration section has real remedies and rollback criteria. The PRD still cannot pass readiness because FR-1 misstates the scanner’s observable view, the numeric compatibility wrapper and readiness caller lack exact malformed-input contracts, and FR-8 does not measure the larger `operator-gated` zero-row behavior introduced by FR-5.
