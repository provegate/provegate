# Readiness Assessment: PRD-040 — Operator Gate Coherence

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-040-operator-gate-coherence.md` |
| Score                  | 7.7/10 |
| Verdict                | ITERATE |
| Iteration              | 4 |
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
| Phase 4 (Execution) | Do not assign — fix PRD first | The diagnostic caller contract, complete table grammar, and binding migration decision remain underspecified. |
| Phase 6 (Audit)     | — | Re-score after every supported or refused shape has an exact fixture and the audit mechanically gates continuation. |

---

## Analysis

### 1. Technical Depth & Architecture

The iteration-1 measurements remain correct against `packages/provegate/src/core/state/markdown.ts`:

| Shape | Current result | Required result |
| ----- | -------------- | --------------- |
| Plain prose bullet | 0 | 1 |
| Checkbox bullet | 1 | 1 |
| One-row table with `Item` header | 2 | 1 |
| Verification Ledger `Result: operator` | 0 | 1 |

FR-1 now accurately describes the scanner layer. `sectionsMatching` reads `scanDocument(content).lines`, exposes only `text` lines, blanks fenced, raw-HTML, and `indented-code` lines, preserves same-line code spans, and retains HTML comments as `COMMENT_MASK`. Marker whitespace and the one-to-nine-digit ordered-marker range now match the scanner conventions.

The grammar is nevertheless not closed yet:

- The shipped `packages/provegate/templates/tasks-template.md` contains an all-empty table data row. FR-2 says rows after the separator are data rows but never says that an all-empty placeholder is zero. A literal implementation therefore recreates the header-overcount defect one row lower.
- `splitTableCells` accepts only rows with leading and trailing pipes, while FR-2 says “a table” without making that boundary-pipe grammar explicit or refusing table-like rows outside it.
- `\|` is named, but escape parity is not pinned: the treatment of `\\|` and `\\\|` remains an implementation decision.
- Addendum A3 Clause 3 says an operator-owned row may be “a list item” or “a table data row,” while FR-1 permits only column-zero list items and deliberately excludes nested or indented ones. The PRD must either implement the approved clause as written or obtain an owner-approved clarification narrowing those terms.

The fixture contract still does not cover the full partition. FR-1 and §11 require individual fixtures for admitted markers and permitted non-rows, but no individual obligation covers fenced blocks, raw HTML, indented code, preserved code spans, all-empty table rows, or escaped-pipe parity. The combined §6 scenario also does not independently prove the four permitted-zero causes.

FR-2 and FR-3 otherwise close the original structural defects: headers and separators are not data, multiple table blocks and ledger sections sum, and the ledger `Result` column is found by normalized header name.

FR-4 correctly introduces `readOperatorHandoff(content): {count, problem}` and carries both fields through `buildState`. It still leaves two production contracts undecided:

- The public numeric `countOperatorHandoff(content): number` cannot “delegate” a problem without choosing whether it throws or returns a best-effort count. “Unsupported input is refused, never counted as zero” points toward throwing, but the PRD never says so.
- The current `runCheck` already receives `found.record` from `buildState`, but calls `lintPrd(config, manifest, content, root, number)` without task state. The PRD does not specify the new parameter or other exact route by which `operatorHandoffProblem` and the declaration/count pair reach `lintPrd`.

The lifecycle binding is real. `buildGateChain` currently begins at the `'4 Implementation'` entry, so the new gate has a precise insertion point. The merge gate always calls `operatorGateOk`, and `shouldSkipGate` never skips a `merge gate`; therefore every `--from-phase=4|5|6|7|merge` invocation reaches the late predicate.

Addendum A3 is approved and is listed in both `source-snapshot/MANIFEST.md` and `DECISIONS.md`. FR-5 stays within Clauses 1–2, and FR-6 is supported by Clause 4. FR-9 limits its `METHOD.md` change to Clauses 1–3, matching A3 §3’s boundary.

The value arithmetic is exact:

`5×0.25 + 5×0.25 + 3×0.20 + 2×0.15 + 2×0.15 = 3.70`.

### 2. Edge Cases & Failure Modes

FR-4 names the important fatal cases: missing separator, absent or duplicate ledger `Result`, short or wide rows, and a non-null scanner `unreliable` result. Both the merge gate and readiness lint are required to surface the diagnostic.

The fatal/non-fatal split is conceptually correct but not wired precisely enough:

- An unreadable task must enter `PrdReadyReport.issues` and make `gate check` fail.
- Only an otherwise readable eligible/positive-row contradiction belongs in `PrdReadyReport.warnings`.
- FR-7’s test scope covers the warning through `lint-parsers.test.ts`, while FR-4 assigns “both consumers” to `acceptance.test.ts`; no listed production-shaped CLI test proves that `runCheck` supplies the diagnostic or prints it.

FR-5 closes both declaration directions:

- `operator-gated` always requires owner acceptance, including at zero rows.
- `eligible` with one or more operator-owned rows refuses before Phase 4 and again at the unskippable merge gate.
- The approved addendum makes the new zero-row rule method-authorized rather than author-invented.

The three current adopter-smoke known-red mappings are exactly `handoff-prose`, `handoff-table`, and `ledger-operator`. FR-10 removes all three, and the existing stale-known-red behavior makes their survival fail the smoke run.

### 3. Maintainability & DX

The work remains local, deterministic, and linear in document size. It adds no runtime dependency, network call, telemetry, tenant surface, protected endpoint, or client/server payload.

The state shape is sensible: an additive optional `operatorHandoffProblem` preserves older generated state compatibility, while the numeric public export remains source-compatible for valid input.

The remaining DX problems are at caller boundaries:

- A public number-returning wrapper needs named malformed-input behavior.
- `lintPrd` needs a concrete production argument carrying the task diagnostic and count.
- FR-4’s Targets omit `prd-ready.ts` and `cli.ts` even though those files are required to fulfill “both consumers.”
- The verification matrix lacks a CLI-level malformed-task test using the same arguments `runCheck` supplies.

The shipped tasks-template edit remains an explicit Non-Goal. FR-9 is the only shipped method-content edit, and `content-canon.test.ts` is named to bind it to A3.

### 4. Migration & Rollback

The migration narrative now identifies both affected populations:

1. artifacts whose operator-row count changes; and
2. zero-row `operator-gated` items whose acceptance obligation changes despite a `0 → 0` count.

It also supplies population-specific remedies, calls for a minor release, names a rollback trigger, and correctly notes that no on-disk migration is needed.

The audit is still not load-bearing:

- FR-8’s normative output schema only describes count changes as `path: old → new (...)`. The zero-row population appears only in §7 prose and has no required output fields, classification, verification note, or §11 assertion.
- The audit output is pasted into the Changelog, but a pasted measurement is not a decision.
- Only `refusal` has a default stop. The other classifications and the zero-row population can be followed by implementation without an owner-authored go/narrow/stop record or a machine check requiring one.
- FR-8’s changeset requirement still names only “flip the declaration” and “clear the rows”; it omits the zero-row remedies “record acceptance” and “declare eligible.”

Rollback itself is sound: the reader is pure, state is derived, and reverting the implementation restores the former behavior.

### 5. Memory Inputs

- `known-red-ledger-must-expire`: substantively applied. FR-10 deletes all three owned mappings, and the harness fails if a known-red assertion turns green. Its disposition incorrectly cites FR-8, but the enforcement is real.
- `narrow-the-grammar-not-the-parser`: not yet substantively closed. The disposition claims FR-4 refuses everything outside an exhaustive partition, but FR-4 does not resolve the empty placeholder row, boundary-pipe table grammar, escape parity, or A3’s broader list-item wording.
- `metadata-declares-what-it-cannot-provide`: substantively applied through both declaration directions and the early/late enforcement split.
- `gate-run-resume-after-archive`: substantively applied. Every resumed invocation reaches the merge-gate predicate.
- `a-rule-that-exempts-itself`: substantively applied by moving the predicate decision to owner-approved Addendum A3.
- The remaining declared dispositions are relevant to their targets and tests.

No active indexed record with a `watch` overlapping a declared FR Target is missing. The watches covering `packages/provegate/test/**`, `core/run/**`, `core/gates/**`, `prd-ready.ts`, `cli.ts`, and `_prds/**` are all dispositioned.

---

## Scorecard

| # | Dimension | Weight | Score | Notes |
| - | --------- | ------ | ----- | ----- |
| 1 | Clarity | 15% | 7/10 | Targets and commands pass the mechanical gate, but the numeric wrapper, lint argument path, and parts of the table grammar still require implementation decisions. |
| 2 | Completeness | 20% | 7/10 | Lifecycle and zero-row migration populations are present; the shipped empty table row, escape parity, caller tests, and binding audit decision are not fully covered. |
| 3 | Technical Depth | 25% | 8/10 | Scanner terminology, state plumbing, owner provenance, and resume enforcement are strong; compatibility and grammar seams remain. |
| 4 | Multi-Tenancy & Security | 20% | 9/10 | No tenant, route, query, network, or client/server surface; owner acceptance remains fail-closed. |
| 5 | Scope & Testability | 10% | 7/10 | Scope is controlled, but fixture obligations do not cover every admitted/refused shape and the migration audit does not gate continuation. |
| 6 | Migration & Rollback | 10% | 7/10 | Both populations, remedies, release, and rollback are described; FR-8 and the changeset do not normatively carry the second population or its decision. |
| **Total** | **Weighted** |  | **7.7/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, or query path is changed.
- Contract cap: not tripped — no client→server payload is introduced.
- Lint cap: not tripped — the orchestrator reports `gate check PRD-040` passed.
- Method-content cap: not tripped — A3 is approved and registered; FR-9 limits `METHOD.md` to its authorized clauses.

---

## Missing Pieces (to reach 10/10)

1. **OPEN — scanner facts are corrected, but the grammar and fixture partition are not closed.** In `_prds/wip/prd-040-operator-gate-coherence.md`, §4 FR-1/FR-2/FR-4, §6, §7 Architecture, and §11:

   - state that the shipped all-empty handoff-table placeholder is zero;
   - require leading and trailing pipes or explicitly support the alternative table form, refusing the other;
   - define odd/even backslash parity around escaped pipes;
   - reconcile A3 Clause 3’s “list item” with the column-zero and nested-item exclusions through an owner-approved clarification or by supporting those list items;
   - add individual `markdown.test.ts` fixtures for every unreachable kind, masked-empty row, preserved code-span row, permitted non-row, empty table row, escape-parity case, and refused table shape.

2. **OPEN — structural parsing is specified, but both caller contracts are not.** In the same PRD, §4 FR-4/FR-7, §6, §7 Architecture and Migration, §8, and §11:

   - state that `countOperatorHandoff(content): number` throws a named diagnostic error when `readOperatorHandoff` returns `problem`;
   - add `prd-ready.ts` and `cli.ts` to FR-4’s Targets;
   - specify the exact `lintPrd` task-state parameter and require `runCheck` to pass `found.record.task`;
   - route `operatorHandoffProblem` to fatal `issues`, the declaration/count contradiction to non-fatal `warnings`, and print warnings without changing the exit code;
   - add merge-gate and CLI tests using the production argument shapes.

3. **CLOSED — lifecycle enforcement and eligible-with-rows contradiction.** A3 authorizes both directions. The early gate has a real insertion point before `'4 Implementation'`, and the late `operatorGateOk` predicate runs in the merge gate, which `shouldSkipGate` never skips. Every resume path therefore reaches the invariant.

4. **OPEN — migration population is named, but the audit remains non-binding.** In the same PRD, §4 FR-8, §7 Migration & Compatibility, §11, and the changeset requirement:

   - add a normative output schema and verification assertion for zero-row `operator-gated` items;
   - require an owner-authored Changelog decision recording go/narrow/stop for both reported populations;
   - make subsequent Phase-4 tasks refuse until that decision exists;
   - require the changeset to name both zero-row remedies—record acceptance or declare `eligible`—as well as the count-change remedies.

5. **CLOSED — method-content provenance and scope.** Addendum A3 is approved and registered in both provenance ledgers. FR-5 and FR-9 stay within its clauses, and the tasks-template edit remains a Non-Goal.

6. **OPEN — memory coverage is complete, but one disposition still overclaims application.** In `## Memory Inputs`, rewrite `narrow-the-grammar-not-the-parser` after Missing Piece 1 closes, naming the final admitted/refused partition and its independent fixtures. Correct `known-red-ledger-must-expire` from FR-8 to FR-10. No watch-overlapping active record is missing.

7. **CLOSED — value header.** `3.70` is the exact weighted result for `5/5/3/2/2`. MF 5 and UI 5 hold for repairing and documenting a central owner gate; TL 3 and AR 2 fit the localized leverage and adoption surface; RM 2 remains appropriate because the broad compatibility change and hand-written parser still carry significant regression risk despite the improved migration narrative.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| - | ---- | ----- | ------- | ----------- |
| 1 | 2026-08-07 | 5.7 | ITERATE | Verified all four measured counts; identified grammar, malformed-input, lifecycle, consumer-blast-radius, method-content, memory, and value gaps. |
| 2 | 2026-08-07 | 6.6 | ITERATE | Added structural parsing and migration prose; diagnostic plumbing, warning output, lifecycle binding, exhaustive grammar, and load-bearing migration remained open. |
| 3 | 2026-08-07 | 7.3 | ITERATE | Closed lifecycle binding, method-template scope, and value arithmetic; scanner precision, caller behavior, zero-row migration coverage, and one memory disposition remained open. |
| 4 | 2026-08-07 | 7.7 | ITERATE | Verified A3 provenance, accurate scanner terminology, the zero-row population, and `METHOD.md` authority. The public-wrapper/lint contracts remain undecided, the grammar omits the shipped empty table row and several fixtures, and FR-8 still does not make the audit decision binding. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- [x] No push code path is introduced.
- [x] `packages/provegate` retains zero runtime dependencies, no telemetry, and no network calls.
- [x] Addendum A3 is approved and listed in `MANIFEST.md` and `DECISIONS.md`.
- [x] No shipped prompt, template, or schema byte is moved without provenance.
- [x] `METHOD.md` is limited to A3 Clauses 1–3.
- [x] No ADR violation is declared or evident.
- [x] No non-canonical status vocabulary is introduced.
- [x] The four original measurements agree with the shipped source.
- [x] Every resume path reaches the late declaration-coherence predicate.
- [x] Both declaration directions have explicit refusal/acceptance outcomes.
- [ ] The table grammar handles the shipped all-empty placeholder and pins pipe boundaries and escape parity.
- [ ] Every admitted, permitted-zero, unreachable, and refused shape has its own fixture.
- [ ] The numeric wrapper defines malformed-input behavior.
- [ ] `runCheck` passes the task diagnostic to `lintPrd`, with fatal issues separated from warnings.
- [ ] FR-8 normatively reports the zero-row population and blocks continuation pending a recorded owner decision.
- [ ] The changeset carries remedies for both migration populations.
- [ ] `narrow-the-grammar-not-the-parser` describes the final grammar rather than claiming an incomplete partition is exhaustive.

---

## Verdict

ITERATE — A3 closes the owner gate, the lifecycle binding is real and non-skippable, the scanner description is now materially accurate, and the migration section finally recognizes the zero-row population. The PRD remains below readiness because the closed grammar omits a shipped empty-table shape and several fixture obligations, the numeric wrapper and readiness caller still lack exact malformed-input contracts, and FR-8’s audit output does not mechanically control whether implementation may continue.
