# Readiness Assessment: PRD-043 — An Unreadable Task Artifact Refuses, It Never Counts Zero

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-043-unreadable-artifact-refuses.md` |
| Score                  | 7.2/10 |
| Verdict                | ITERATE |
| Iteration              | 2 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — measured `node packages/provegate/dist/cli.js check PRD-043` result supplied |
| State Record           | pending — read-only assessment |

---

## Model Tier Recommendation

| Phase               | Tier                          | Rationale |
| ------------------- | ----------------------------- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | FR-1 can classify valid data rows as separatorless headers, FR-4’s direct argument is not type-compatible with `StateRecord.task`, and PRD-040 retains contradictory refusal obligations. |
| Phase 6 (Audit)     | —                             | Re-score after the executable contracts and split are reconciled. |

---

## Analysis

### 1. Technical Depth & Architecture

The central architecture is sound and remains within Addendum A3 Clause 5:

- `scanDocument().unreliable` is the correct fail-closed source, matching the precedent at `packages/provegate/src/core/memory/artifacts.ts:641`.
- A diagnostic reader feeding `buildState`, `operatorGateOk`, and `lintPrd` avoids independent parsers.
- `OperatorHandoffUnreadableError` and `OPERATOR_HANDOFF_UNREADABLE` provide a stable public diagnostic identity.
- Refusal before acceptance lookup is the correct consumer order.
- Aggregating diagnostics in document order and declaring `count` unusable closes the former partial/zero ambiguity.

FR-1’s revised predicates nevertheless contain a new contradiction. A header candidate is defined as any non-empty boundary-piped line. Every ordinary data row in a valid table satisfies that definition. The unconditional rule that a header candidate not followed by a separator is a problem therefore makes the final data row of a valid table a separatorless-header problem unless candidates are evaluated only outside an already-consumed table block. The PRD never states that contextual restriction.

The boundaryless branch uses the undefined term “separator-shaped line,” rather than the defined separator-candidate predicate. Because the latter is defined relative to a boundary-piped header candidate, it cannot automatically govern boundaryless input. It remains unclear whether equal width, a minimum of two cells, or a pipe in the separator is required. That matters for ordinary prose such as `A | B` followed by a thematic break or setext underline.

FR-4 also still has an inconsistent state representation. Its sixth parameter requires `{ present, count, problem } | undefined`, while `runCheck` is told to pass `found.record.task` directly. The current `StateRecord.task` has no `present` property, and FR-3 only adds `operatorHandoffProblem`. As written, the required direct call cannot type-check. Moreover, allowing both `undefined` and `{ present: false, ... }` creates two encodings for absence rather than one closed three-state model.

### 2. Edge Cases & Failure Modes

Against the measured population:

- Boundary-piped header without separator: now explicitly refuses.
- Unequal-width data row: now explicitly refuses and names both widths.
- Boundaryless table header followed by a separator: intended to refuse, but the separator predicate remains incomplete.
- Lone prose containing `|`: remains ignored.
- Unterminated fence: refuses through `scanDocument().unreliable`.
- Ledger with no or duplicate `Result` column: refuses by section.
- Multiple problems: aggregate in document order; `count` is unusable.

The positive-control side is insufficient. Section 11 requires one fixture per refusal cause but does not require a valid header/separator/data table to produce no problem under the new reader. That missing control would catch the newly introduced “data row is also a header candidate” defect.

The PRD-040 audit dependency is now a real preflight. The current repository has no `scripts/audit-operator-rows.mjs`, so the specified outcome today is correctly “do not start.” However, PRD-043 adds a third audit population without defining how PRD-040’s two-population fingerprint changes. “Works exactly as PRD-040 specifies” leaves unresolved whether the refusal count becomes a fourth fingerprint field or is included only in the hash.

### 3. Maintainability & DX

The public compatibility story is materially improved. The PRD now says plainly that keeping `(content: string) => number` does not preserve runtime behavior when malformed input starts throwing, names an exported class and code, and supplies a migration to the diagnostic reader.

The installed-export verification is not actually wired into scope. The requirement says the throw is tested through the installed package export “the way `scripts/adopter-smoke.sh` imports it,” but:

- `scripts/adopter-smoke.sh` is absent from FR-2 Targets.
- It is absent from Implementation Scope and Conflict Surface.
- Section 11 maps FR-2 to `markdown.test.ts`, not to the installed-package smoke.
- The migration tells adopters to call `readOperatorHandoff`, but the PRD does not explicitly require that reader and its result type to be re-exported through the package root.

Current code confirms why this matters: `countOperatorHandoff` is re-exported through `core/state/index.ts`, and `scripts/adopter-smoke.sh` imports it from an installed `provegate` package. A source-relative unit test cannot prove the new diagnostic exports are packaged.

The memory output is now substantive. `_brain/learnings/unreadable-input-needs-a-diagnostic-result.md` captures the non-derivable design rule and is repeated in Durable Artifacts.

### 4. Migration & Rollback

The rollback remains credible: the reader is pure, the state addition is optional, and reverting the implementation restores previous behavior without data migration.

The sequencing closure is strong:

- PRD-040 must be merged before Phase 3 or Phase 4 begins.
- Its grammar fixtures and `--assert-acknowledged` audit interface must exist.
- Missing or incompatible prerequisites stop the work.
- Newly refusing historical artifacts stop by default.
- The owner is the decision actor.

The split itself is not coherent yet because PRD-040 retains obligations assigned to PRD-043:

- PRD-040 §7 says its diagnostic reader is additive and `StateRecord.task` gains an optional field, although neither belongs to its requirements or scope.
- PRD-040 Memory Inputs says its FR-4 refuses `scanDocument().unreliable`; FR-4 actually governs declaration coherence, while PRD-043 owns scanner refusal.
- PRD-040’s DO NOT section says not to return zero for unreadable input, while its Non-Goals and §7 explicitly preserve zero/non-refusal until PRD-043.
- PRD-040 §7 refers to the audit as FR-8 although the audit is FR-7, and describes a refusal classification its two-population audit does not specify.

Thus an implementing agent for the prerequisite item cannot satisfy both its Non-Goals and its DO NOT contract. PRD-043 correctly waits for PRD-040, but currently waits for an internally contradictory predecessor.

The value score is correct:

`0.25×5 + 0.25×4 + 0.20×3 + 0.15×2 + 0.15×2 = 3.45`.

- MF 5: justified; Addendum A3 Clause 5 is approved method behavior that remains unenforced.
- UI 4: justified; the fix prevents silent autonomous closes and supplies actionable diagnostics.
- TL 3: justified; it improves a central gate without broadly unlocking unrelated roadmap work.
- AR 2: justified; adopter impact is meaningful but not primarily an adoption-surface improvement.
- RM 2: justified; a public numeric API starts throwing and the gate’s Markdown grammar changes across several consumers.

### 5. Memory Inputs

- `scope-out-the-layer-the-rounds-keep-hitting`: applied appropriately; the diagnostic layer is now separate.
- `assert-absent-needs-an-independent-cause`: relevant to independent refusal fixtures, though the PRD should add positive controls as well.
- `fixture-must-reach-production-shape`: relevant and correctly drives the `runCheck` test, but FR-4’s proposed production argument still does not match the declared type.
- `metadata-declares-what-it-cannot-provide`: a defensible analogy for an unjustified numeric answer.
- `gate-run-resume-after-archive`: relevant; placing refusal inside `operatorGateOk` covers resume paths.
- `strictness-added-during-extraction-is-a-behavior-change`: now substantially honored through the audit, explicit public throw, migration, and rollback.
- `surface-set-without-its-predicate`: not fully applied because “separator-shaped” remains undefined and FR-4’s presence input lacks one executable representation.
- `operator-row-must-be-a-table-row`: now explicitly reviewed; closure recorded.
- `exemption-marker-needs-no-prose`: correctly reviewed; no exemption syntax is introduced.
- `narrow-the-grammar-not-the-parser`: directionally applied, but the candidate grammar still needs contextual closure.
- `a-rule-corrected-survives-where-it-is-restated`: not successfully applied across PRD-040; stale refusal and state-field claims remain.
- `state-model-before-mechanism`: partially applied; the intended three states are named, but `undefined` plus unrestricted `present: boolean` leaves duplicate absence representations.
- `two-parsers-wrong-together`: correctly applied by retaining one reader and binding consumers to its result.

No additional active record with a `watch` overlapping PRD-043’s declared FR Targets is missing; the supplied passing readiness lint corroborates the watch-declaration check.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15%    | 6.5/10 | Concrete targets and commands, but table-candidate context, boundaryless separators, presence representation, and audit fingerprint remain ambiguous. |
| 2         | Completeness             | 20%    | 6.5/10 | Most iteration-1 gaps were addressed; installed-export wiring, positive controls, and the predecessor sweep remain incomplete. |
| 3         | Technical Depth          | 25%    | 7/10 | Strong diagnostic architecture and failure ordering, weakened by contradictory parser and state predicates. |
| 4         | Multi-Tenancy & Security | 20%    | 9/10 | Local parsing and state change; no tenant, auth, route, endpoint, query, telemetry, or network surface. |
| 5         | Scope & Testability      | 10%    | 6.5/10 | Intended split is sensible, but PRD-040 still claims both sides and FR-2’s installed test has no scoped execution path. |
| 6         | Migration & Rollback     | 10%    | 7/10 | Public throw and rollback are honest; package-export migration and three-population audit evolution are incomplete. |
| **Total** | **Weighted**             |        | **7.2/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, or query surface is touched.
- Contract cap: not tripped — no client-to-server payload is introduced.
- Lint cap: not tripped — measured `gate check PRD-043` evidence passes.

---

## Missing Pieces (to reach 10/10)

1. **OPEN — iteration-1 Missing Piece 1.** In `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-1 and §11, the five predicates and aggregation were added, but the new header predicate also matches valid data rows and “separator-shaped” is undefined for boundaryless lines. Exact change: state that header candidates are evaluated only outside a table block already consumed through its first non-boundary-piped line; define a boundaryless separator candidate including cell-count equality and minimum cell/pipe requirements; add positive fixtures for a valid one-row table and ordinary `A | B` prose followed by `---`.

2. **OPEN — iteration-1 Missing Piece 2.** In `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-3/FR-4 and §8, `StateRecord` was added to Targets and absence was named, but `found.record.task` still lacks the required `present` property. Exact change: make the sixth parameter `{ present: true; count: number; problem: string | null } | undefined`, and require `runCheck` to construct that object only when `record.artifacts.tasks` is non-empty; otherwise pass `undefined`. Do not allow `{ present: false, ... }`.

3. **OPEN — iteration-1 Missing Piece 3.** In `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-2, §8, Conflict Surface, and §11, the stable identity and runtime-compatibility warning are closed, but the installed-export test remains outside executable scope. Exact change: add `scripts/adopter-smoke.sh` to FR-2 Targets, Implementation Scope, and Conflict Surface; add an FR-2 smoke assertion that malformed content imported from installed `provegate` throws `OperatorHandoffUnreadableError` with code `OPERATOR_HANDOFF_UNREADABLE`; explicitly require package-root exports for `readOperatorHandoff`, its result type, and the error class.

4. **OPEN — iteration-1 Missing Piece 4.** In `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-5, §7 Dependencies, and §11, the hard preflight, missing-script failure, new population, default stop, and owner actor are closed. The fingerprint evolution is not. Exact change: define the new fingerprint byte shape—preferably `audit: <count-changes>/<acceptance-changes>/<refusals>/<sha>`—and state that the hash covers all three sorted populations; add a stale-refusal acknowledgement case to FR-5 verification.

5. **CLOSED — iteration-1 Missing Piece 5.** `_prds/wip/prd-043-unreadable-artifact-refuses.md`, Memory Inputs, now includes `operator-row-must-be-a-table-row` and revises the predicate and state-model dispositions. Exact change: none for the missing-input finding; the accuracy issues above are tracked separately.

6. **CLOSED — iteration-1 Missing Piece 6.** `_prds/wip/prd-043-unreadable-artifact-refuses.md`, Memory Outputs and Durable Artifacts, now declare `_brain/learnings/unreadable-input-needs-a-diagnostic-result.md` consistently. Exact change: none.

7. **CLOSED — iteration-1 Missing Piece 7.** `_prds/wip/prd-043-unreadable-artifact-refuses.md`, Value header and arithmetic comment, now use RM 2 and total 3.45. Exact change: none.

8. **OPEN — new split-coherence finding.** In `_prds/wip/prd-040-operator-gate-coherence.md`, §7 Migration & Compatibility, Memory Inputs, DO NOT, and related historical restatements, remove present-tense claims that PRD-040 adds the diagnostic reader, `StateRecord.task` problem field, or unreadable-input refusal. Replace the DO NOT rule requiring PRD-040 to refuse unreadable input with a cross-reference to PRD-043, correct the audit reference from FR-8 to FR-7, and ensure every retained statement describes only PRD-040’s counting/declaration invariant and two-population audit.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.4   | ITERATE | Split judged conceptually coherent; parser, public API, presence, sequencing, audit, memory, and value contracts incomplete. |
| 2   | 2026-08-07 | 7.2   | ITERATE | Diagnostic identity, hard dependency, durable learning, and value closures verified; new predicate/state contradictions and stale PRD-040 split claims remain. |

---

## Project-Specific Checklist

- No push code path: compliant; none is proposed.
- Zero runtime dependencies: compliant; none is proposed.
- No telemetry or network calls: compliant.
- Method-content traceability: compliant; behavior is authorized by Addendum A3 Clause 5, with the Phase-2 warning derived from Clauses 2 and 4.
- Addendum boundary: compliant; no template default, acceptance authorship, or acceptance schema change is proposed.
- ADR compliance: no conflict identified.
- Canonical status vocabulary: unaffected.
- Public API compatibility: honestly identified as behavior-breaking, but installed packaging verification remains incomplete.
- Dependency ordering: correctly hard-gated; the currently missing audit script means Phase 3/4 must not start.
- Value score: 3.45 is arithmetically and substantively correct.

---

## Verdict

ITERATE — no hard cap is tripped, and most iteration-1 findings were materially addressed. The item remains below the PASS threshold because FR-1’s literal predicate can reject valid table data, FR-4’s production argument cannot satisfy its declared type, the installed public-export test is not scoped, the three-population fingerprint is undefined, and PRD-040 still contradicts the split by retaining unreadable-input refusal obligations.
