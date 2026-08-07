# Readiness Assessment: PRD-040 — Operator Gate Coherence

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-040-operator-gate-coherence.md` |
| Score                  | 7.6/10 |
| Verdict                | ITERATE |
| Iteration              | 7 |
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
| Phase 4 (Execution) | Do not assign — fix PRD first | The warning contract has moved coherently to PRD-043, but PRD-040 still contains mutually exclusive interim behaviors, inaccurate compatibility claims and an audit acknowledgement that does not prove the owner’s go/narrow/stop decision. |
| Phase 6 (Audit)     | — | Re-score after the grammar fixtures, scope-restatement sweep and migration continuation gate are corrected. |

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

FR-1 is close to a bounded grammar over the actual `sectionsMatching` view. `sectionsMatching` retains only `text` lines and blanks the other scanner kinds; comments remain as `COMMENT_MASK`; same-line code spans survive. Marker characters, ordered-marker digit range, required whitespace, checkbox spellings, nesting, placeholders and principal non-row forms are decided.

Three gaps remain in the claimed exhaustive grammar:

- `- - -` and `* * *` satisfy FR-1’s lexical marker-and-text rule but render as thematic breaks, not list items. Addendum A3 authorizes list items, so these admitted shapes are ambiguous.
- The scanner kinds are `fence`, `in-fence`, `html`, `in-html` and `indented-code`. §11 promises only one “blanked fence” fixture rather than one fixture for both `fence` and `in-fence`.
- The odd/even escape fixtures are textually identical in §6 and §11: both operands are ``a\|b``. The required two-backslash case is absent.

FR-2’s intended structural table reader is implementable, but its compatibility claims are false against the current reader. Direct execution of the shipped build produced:

| Input under `Operator Handoff` | Current count |
| ------------------------------ | ------------- |
| Generic header + data row, no separator | 2 |
| `Task` header + data row, no separator | 1 |
| Two leading-pipe-only rows | 2 |
| Two trailing-pipe-only rows | 0 |

Therefore “anything without both pipes is not counted, exactly as now” and “malformed input keeps today’s behaviour” are incorrect. Requiring both pipes and a separator is a legitimate recorded change, but it must be measured as one.

The PRD-040/PRD-043 boundary is architecturally sound. PRD-043 owns:

- `readOperatorHandoff`;
- the throwing numeric wrapper;
- `StateRecord.task.operatorHandoffProblem`;
- refusal inside `operatorGateOk`;
- the sixth `lintPrd` parameter;
- `runCheck` passing the task read;
- fatal `issues` versus non-fatal `warnings`; and
- CLI-shaped tests for both output paths.

Both diagnostic consumers are therefore specified in PRD-043, and the warning no longer needs a caller contract in PRD-040. PRD-040 nevertheless still claims in §7 Migration that the diagnostic reader is additive and `StateRecord.task` gains the optional field. Those are PRD-043 changes.

The lifecycle enforcement points are real. `buildGateChain` currently starts with the `'4 Implementation'` entry, providing the exact insertion point for the early `declaration coherence` gate. The final chain entry invokes `operatorGateOk`, and `shouldSkipGate` never skips a `merge gate`; consequently `--from-phase=merge` and every other resume path re-evaluate the invariant.

### 2. Edge Cases & Failure Modes

FR-4 closes the two declared states:

- `operator-gated` requires a valid acceptance at every count.
- `eligible` with positive operator rows refuses and names the declaration, count and file.

FR-5 binds that rule before implementation and at merge. This matches Addendum A3 Clauses 1, 2 and 4 and is precise enough to implement without choosing another lifecycle boundary.

The Phase-2 warning has moved whole to PRD-043. Its Targets, Implementation Scope, Conflict Surface and §11 test rows are absent from PRD-040. This closes the caller-seam finding from iteration 6.

The interim malformed-input rule is not consistent across PRD-040:

- §7 says a no-separator table contributes zero.
- §7 says an unequal-width data row contributes one.
- §7 says a missing `Result` column contributes zero.
- §7 says an unterminated fence is read as far as the scanner can read it.
- §5 says all four contribute zero.
- §12 says input outside the grammar must refuse, while the next bullets prohibit implementing that refusal here.
- §1 says malformed input keeps today’s behavior, which is false for no-separator and leading-only tables.

The structural-reader tests also omit explicit cases for:

- thematic-break/list-marker ambiguity;
- `fence` and `in-fence` separately;
- leading-only table rows;
- no-separator tables;
- unequal-width rows;
- both `operator` and `blocked`, including case and surrounding whitespace; and
- actual odd-versus-even backslash parity.

### 3. Maintainability & DX

The proposed implementation remains deterministic, local and linear in document size. It adds no runtime dependency, network call, telemetry, tenant surface, protected endpoint or client/server payload.

The public numeric signature remains unchanged in PRD-040, which protects the installed-package consumer in `scripts/adopter-smoke.sh`. PRD-043 separately specifies when that API will begin throwing.

The document still reproduces `a-rule-corrected-survives-where-it-is-restated` after claiming to have swept it:

- §1 retains the earlier diagnostic plumbing and `scan.unreliable` refusal.
- §5 gives a blanket-zero rule that contradicts §7.
- §7 retains the diagnostic reader and `StateRecord` field.
- §7 retains a `refusal` audit classification belonging to PRD-043.
- §12 orders unreadable input to refuse and simultaneously prohibits adding that path.
- Several Memory Inputs retain the old FR numbering and removed warning/refusal scope.

These are implementation-facing statements, not harmless Changelog history. An agent following §7 or §12 would cross the declared Conflict Surface into PRD-043.

The three PRD-040 known-red entries are present in `scripts/adopter-smoke.sh`, and the harness treats a newly passing known-red assertion as stale failure. FR-9 correctly requires removing `handoff-prose`, `handoff-table` and `ledger-operator` together with the fix.

### 4. Migration & Rollback

The migration section correctly identifies two top-level populations:

1. artifacts whose count changes; and
2. zero-row `operator-gated` items whose acceptance obligation changes without a count diff.

It also names adopter remedies, a minor release, a changeset and a valid revert-based rollback. The counter is pure, so no persisted-data migration or reverse transformation is required.

The audit’s count-change classification is incomplete. FR-7 closes its source vocabulary at:

- `prose-handoff`;
- `nested-item`;
- `ledger-operator`; and
- `header-overcount`.

FR-2 also changes counts for at least no-separator tables and leading-pipe-only rows. Neither can be classified by that vocabulary. The audit therefore cannot satisfy “every artifact whose count changes, with a source” for all behavior PRD-040 introduces.

FR-6’s fingerprint improves stale-evidence detection, but the audit is not yet a complete continuation gate:

- The fingerprint proves that someone copied current counts; it does not record the owner’s go/narrow/stop decision.
- Nothing requires the matching Changelog row to be owner-authored.
- No decision token is included in what `--assert-acknowledged` validates.
- A `stop` or `narrow` decision has no mechanically stated effect.
- The script is not targeted from `buildGateChain` or another executing surface; its Phase-4 ordering depends on the future task list faithfully calling it before implementation.

The `refusal` classification retained in §7 belongs to PRD-043’s later diagnostic audit and is not produced by FR-7’s declared PRD-040 output.

### 5. Memory Inputs

- `known-red-ledger-must-expire` is substantively applied: all three owned entries are deleted with the fix, and stale known-red entries fail the smoke. Its FR reference must change from FR-8 to FR-9.
- `narrow-the-grammar-not-the-parser` is not accurately dispositioned. It claims FR-4 refuses unpartitioned input and `scan.unreliable`; current FR-4 is the declaration invariant, while unreadable-input refusal belongs to PRD-043.
- `a-rule-that-exempts-itself` is relevant through Addendum A3, but the declaration rule is FR-4 and the lifecycle placement is FR-5.
- `metadata-declares-what-it-cannot-provide` is relevant, but its current disposition still describes the removed Phase-2 warning and misattributes both declaration directions to FR-5.
- `gate-run-resume-after-archive` should cite FR-5, not FR-6.
- `fixture-must-reach-production-shape` incorrectly says the `cli.ts` warning surface remains in this item. Its applicable requirement is the production-shaped `buildGateChain` test.
- `surface-set-without-its-predicate` incorrectly says FR-6 adds a lint predicate. No `core/gates/**` target remains.
- `a-rule-corrected-survives-where-it-is-restated` is relevant but was not successfully applied, as §1, §5, §7, §12 and the Memory Inputs disagree with the revised FRs.

All active indexed records whose `watch` overlaps a declared FR Target are dispositioned. No overlapping active record is missing.

The value arithmetic is exact:

`5×0.25 + 5×0.25 + 3×0.20 + 2×0.15 + 2×0.15 = 3.70`.

MF 5 and UI 5 remain defensible: this repairs a central method gate under owner-approved semantics. TL 3 and AR 2 fit the localized implementation and documentation reach. RM 2 remains appropriate because every task artifact, the public counter and both declaration populations are exposed to the compatibility change; the incomplete audit does not justify raising it.

---

## Scorecard

| # | Dimension | Weight | Score | Notes |
| - | --------- | ------ | ----- | ----- |
| 1 | Clarity | 15% | 7/10 | Mechanical Clarity checks pass, but §1, §5, §7, §12 and the Memory Inputs give incompatible interim and scope instructions. |
| 2 | Completeness | 20% | 7/10 | The central grammar and lifecycle are strong; thematic breaks, scanner-kind coverage and several structural transition cases remain unclosed. |
| 3 | Technical Depth | 25% | 8/10 | The scanner model, declaration invariant, real chain boundary and PRD-043 caller contracts are well understood; compatibility claims do not match the shipped reader. |
| 4 | Multi-Tenancy & Security | 20% | 9/10 | No tenant, authorization, endpoint or payload surface is introduced; owner acceptance remains fail-closed. |
| 5 | Scope & Testability | 10% | 7/10 | Scope files mostly reflect the split, but fixtures omit material shapes and two escape-parity operands are identical. |
| 6 | Migration & Rollback | 10% | 6/10 | Populations, remedies, release and revert are present; the audit cannot classify every count change and its fingerprint does not prove or enforce the owner decision. |
| **Total** | **Weighted** |  | **7.6/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint or query path changes.
- Contract cap: not tripped — no client→server payload is introduced.
- Lint cap: not tripped — the orchestrator reports `gate check PRD-040` passed.
- Method-content cap: not tripped — Addendum A3 is owner-approved and registered; `METHOD.md` is limited to Clauses 1–3, and the template edit is a Non-Goal.

---

## Missing Pieces (to reach 10/10)

1. **OPEN — the counted grammar is not yet exhaustive over the reader’s reachable shapes.** In `_prds/wip/prd-040-operator-gate-coherence.md`, §4 FR-1/FR-2, §6 and §11:

   - classify CommonMark thematic-break forms such as `- - -` and `* * *` as non-rows or move them to PRD-043 as named refusals;
   - name `fence` and `in-fence` separately and require a fixture for each scanner kind;
   - replace the duplicated ``a\|b`` operands with actual odd/even cases, including a literal two-backslash case;
   - add explicit fixtures for leading-only rows, no-separator tables and unequal-width data rows; and
   - require both `operator` and `blocked`, with trimming and case-insensitivity, in FR-3’s fixtures.

2. **OPEN — PRD-043 correctly owns both diagnostic callers, but PRD-040 still restates that removed scope and contradicts its interim behavior.** In the same file:

   - §1: remove the present-tense claims that this item refuses `scan.unreliable` and plumbs a diagnostic through `buildState`;
   - §5: replace “each contributes zero” with the exact §7 outcomes—no separator `0`, unequal-width row `1`, missing `Result` `0`, and unterminated documents counted only from scanner-visible rows;
   - §7 Public API: remove the additive diagnostic reader and optional `StateRecord.task` field;
   - §7 Migration: remove the PRD-043 `refusal` classification;
   - §12: remove “DO NOT return zero … refuse and name it,” because refusal is expressly out of scope; and
   - replace “keeps today’s behavior” with “temporary PRD-040 behavior,” explicitly noting that current no-separator and leading-only inputs can count positive.

   PRD-043 itself needs no boundary move: it specifies both callers and the fatal-versus-warning split.

3. **CLOSED — the lifecycle boundary and resume coverage are implementable.** FR-4 owns both declaration directions. FR-5 names the new gate immediately before the existing `'4 Implementation'` entry and repeats the invariant inside `operatorGateOk`. The existing merge gate is never skipped by `shouldSkipGate`, including `--from-phase=merge`. The Phase-2 warning is wholly and coherently deferred to PRD-043.

4. **OPEN — the migration audit is executable but does not yet bind the complete decision.** In §4 FR-6/FR-7, §7 Migration, §11 and the Changelog contract:

   - extend the count-change source vocabulary to cover every FR-2 transition, including no-separator and leading-only table rows;
   - require an owner-authored Changelog row containing the current fingerprint and an explicit `go`, `narrow` or `stop`;
   - make `--assert-acknowledged` verify the configured owner and decision as well as the fingerprint;
   - define `stop` as exit 1 and define the exact narrowed scope required before `narrow` can pass;
   - state that empty populations may continue only under an explicit rule; and
   - bind the assertion to the first Phase-4 task before any implementation task can start.

5. **CLOSED — method-content provenance and scope.** Addendum A3 is approved and appears in both `source-snapshot/MANIFEST.md` and `DECISIONS.md`. FR-8 limits `METHOD.md` to Clauses 1–3. The shipped task-template edit is a Non-Goal, and no other prompt, template or schema is targeted.

6. **OPEN — no watch-overlapping record is missing, but several dispositions still describe the removed design.** In `## Memory Inputs`:

   - rewrite `narrow-the-grammar-not-the-parser` so PRD-040 owns the positive grammar and PRD-043 owns refusal;
   - change `known-red-ledger-must-expire` from FR-8 to FR-9;
   - change `gate-run-resume-after-archive` from FR-6 to FR-5;
   - remove the `cli.ts` warning claim from `fixture-must-reach-production-shape`;
   - remove the lint-predicate claim from `surface-set-without-its-predicate`;
   - update `a-rule-that-exempts-itself`, `metadata-declares-what-it-cannot-provide` and `state-model-before-mechanism` to current FR numbering; and
   - mark `a-rule-corrected-survives-where-it-is-restated` applied only after §1, §5, §7 and §12 agree.

7. **CLOSED — value header.** `3.70` is the exact weighted result for `5/5/3/2/2`. The axes remain credible: high method fidelity and user impact, moderate leverage, limited reach and elevated compatibility/maintenance risk.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| - | ---- | ----- | ------- | ----------- |
| 1 | 2026-08-07 | 5.7 | ITERATE | Verified all four measured counts; identified grammar, malformed-input, lifecycle, consumer-blast-radius, method-content, memory and value gaps. |
| 2 | 2026-08-07 | 6.6 | ITERATE | Added structural parsing and migration prose; diagnostic plumbing, warning output, lifecycle binding, exhaustive grammar and load-bearing migration remained open. |
| 3 | 2026-08-07 | 7.3 | ITERATE | Closed lifecycle placement, template scope and value arithmetic; scanner precision, caller behavior, zero-row migration and owner provenance remained. |
| 4 | 2026-08-07 | 7.7 | ITERATE | Added A3 provenance, scanner terminology, zero-row population and `METHOD.md` authority; grammar/caller contracts and binding audit remained open. |
| 5 | 2026-08-07 | 7.7 | ITERATE | Closed additional grammar and caller details, but the same grammar/diagnostic layers remained open; score stayed flat. |
| 6 | 2026-08-07 | 7.6 | ITERATE | Moved diagnostic refusal to PRD-043 and strengthened per-shape fixtures. The move left PRD-040’s warning without its caller contract and left stale diagnostic, nesting and audit statements. |
| 7 | 2026-08-07 | 7.6 | ITERATE | The warning and its caller contract now live wholly in PRD-043, and FR-6 adds a stale-fingerprint check. The sweep missed contradictory interim outcomes, diagnostic/refusal residue, incomplete structural-change classifications and the missing owner-decision predicate. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- [x] No push code path is introduced.
- [x] `packages/provegate` retains zero runtime dependencies, no telemetry and no network calls.
- [x] Addendum A3 is approved and listed in both provenance ledgers.
- [x] No shipped prompt, template or schema byte is moved without provenance.
- [x] `METHOD.md` is limited to A3 Clauses 1–3.
- [x] No ADR violation is declared or evident.
- [x] No non-canonical status vocabulary is introduced.
- [x] The four original measurements agree with the shipped source.
- [x] Nested reachable list items are explicitly counted under A3 Clause 3.
- [x] The shipped all-empty placeholder is specified as zero.
- [x] Every resume path reaches `operatorGateOk`.
- [x] Both declaration directions have explicit enforcing outcomes.
- [x] The Phase-2 warning and both diagnostic caller contracts are wholly assigned to PRD-043.
- [x] The three PRD-040 known-red entries are required to be removed.
- [ ] Thematic breaks are distinguished from list items.
- [ ] Every unreachable scanner kind has its own fixture.
- [ ] Odd/even escape-parity fixtures contain different source strings.
- [ ] §1, §5, §7 and §12 state the same interim malformed-input behavior.
- [ ] Compatibility claims match the current counts for no-separator and leading-only rows.
- [ ] The audit classifies every FR-2 count transition.
- [ ] The audit verifies an owner-authored go/narrow/stop decision, not only a copied fingerprint.
- [ ] Memory dispositions use current FR numbering and current scope.

---

## Verdict

ITERATE — PRD-043 is the correct boundary for unreadable-artifact refusal, both diagnostic callers and the Phase-2 warning, and the Phase 3→4 plus merge-gate lifecycle is now closed. PRD-040 still does not pass: its own sections disagree about malformed input, it describes current table behavior inaccurately, the escape and scanner-kind fixture set is incomplete, and FR-6 validates fresh audit data without validating the owner decision that data is supposed to control. No hard cap is tripped.
