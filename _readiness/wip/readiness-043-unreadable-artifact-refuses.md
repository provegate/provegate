# Readiness Assessment: PRD-043 — An Unreadable Task Artifact Refuses, It Never Counts Zero

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-043-unreadable-artifact-refuses.md` |
| Score                  | 7.8/10 |
| Verdict                | ITERATE |
| Iteration              | 9 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — direct `lintPrd` returned `{"ok":true,"issues":[]}`; the full CLI reached the read-only sandbox boundary while refreshing `_state/prds.json` |
| State Record           | pending — read-only assessment |

---

## Model Tier Recommendation

| Phase               | Tier                          | Rationale |
| ------------------- | ----------------------------- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | The compact representation is now exact, but the successful-handoff-card behavior contradicts the mandatory refusal path and requires an undeclared design-package change. |
| Phase 6 (Audit)     | —                             | Re-score after the handoff behavior, queue JSON contract test, and surviving PRD-040 split statements are corrected. |

---

## Analysis

### 1. Technical Depth & Architecture

FR-1 remains coherent with the current implementation:

- `splitTableCells` accepts only lines with leading and trailing pipes.
- A boundaryless table refuses only when the following line has separator shape and the split cell counts match. Ordinary prose containing `|` does not refuse merely because the character exists.
- The predicate covers the measured boundaryless table while keeping a mismatched prose neighbor as a positive control.
- Separator-less piped tables and unequal-width rows have independent diagnostics.
- `scanDocument().unreliable` exposes dangling fences and comments, and `artifacts.ts:641` is a valid diagnostic-result precedent.

FR-2’s public compatibility treatment is complete. `countOperatorHandoff` is exported through `core/state/index.ts`, `core/index.ts`, and the package root; `buildState` is its current production caller, and `scripts/adopter-smoke.sh` imports it from an installed package. The PRD explicitly states that returning an exception instead of a number is a runtime compatibility break, requires a stable exported error identity, provides an additive diagnostic reader, and requires the changeset to name the migration.

FR-3 now chooses one compact representation:

- `operatorHandoffs: number | null`
- `operatorHandoffProblem: string | null`
- the count must be `null` when a problem exists

This correctly covers the package-root-exported `CompactRecord` and the `gate queue --json` surface.

The handoff-card requirement is not executable as written. `operatorGateOk` must refuse before acceptance lookup when `operatorHandoffProblem` exists, and `runRun` returns on a stopped chain before reaching the final handoff card. Therefore an unreadable artifact cannot both refuse and print its problem “at the end of a successful close.”

There is a second scope contradiction: the shared `handoffCard` accepts `operatorRows: number` in `packages/design/src/cli/cards.ts`, with byte-exact tests in `packages/design/test/cards.test.ts`. Printing a problem in that slot requires changing both files, yet neither appears in PRD-043’s Targets, Implementation Scope, Conflict Surface, or verification table. The correct behavior is to emit the stop card and never emit the success handoff card.

### 2. Edge Cases & Failure Modes

The parsing matrix is otherwise strong: missing or duplicate ledger `Result` columns, separator-less tables, unequal widths, matching boundaryless tables, scanner unreliability, multiple ordered diagnostics, positive controls, and independently caused failures are specified.

Sequencing is genuinely hard-gated. FR-5 says PRD-040 must be merged, its fixtures must exist, and `scripts/audit-operator-rows.mjs --assert-acknowledged` must be compatible before Phase 3/4 work begins. The script is currently absent, as expected before PRD-040 lands. If PRD-040 ships without it, PRD-043 stops rather than silently skipping the audit.

The three-field-to-four-field audit fingerprint transition is explicit and correctly makes PRD-040 evidence stale.

The PRD-040 split is still not coherent despite its sixth-sweep changelog row:

- §7 first says PRD-043’s unreadable-artifact population is “not audited here,” but continues by defining “refusal,” saying that population is “recorded here as information,” and claiming “this item performs no refusals.”
- FR-7 defines only count changes and zero-row acceptance changes; there is no unreadable-artifact population in this audit.
- “This item performs no refusals” contradicts FR-4 and FR-5, both of which explicitly refuse declaration-invariant violations.
- §5 still says “the refusal messages teach the shape,” although the PRD specifies no parser-shape diagnostic; FR-4 promises only declaration, count, and file.
- The resume attribution is now correctly FR-5, and the rollback trigger is correctly limited to unintended count changes.

The predecessor changelog therefore overstates the closure.

### 3. Maintainability & DX

The five-site inventory and the stale “two consumer” restatements are fixed. The metric now says `0 of 5 → 5 of 5`, and §7 enumerates each behavior.

The Phase-2 warning belongs in PRD-043 because it depends on this item’s task diagnostic, `lintPrd` parameter, report shape, and `runCheck` plumbing. PRD-040 correctly retains the chain and merge enforcement.

The public compact representation is now specified and included in the changeset story. Its executable verification remains incomplete: §11 mentions `formatCompactRecord`, but does not assert the exact `gate queue --json` representation adopters receive.

The live value header is not the `3.60 (5/4/3/2/3)` quoted in the prompt. The current file says:

`3.45 (MF/UI/TL/AR/RM: 5/4/3/2/2)`

Both calculations are arithmetically correct for their axes:

- `5/4/3/2/3 = 3.60`
- `5/4/3/2/2 = 3.45`

MF 5 is justified: Addendum A3 Clause 5 is owner-approved method content that has no implementation, rather than merely an ordinary parser preference. RM 3 is not justified because one package-root API begins throwing and another package-root/JSON field changes from `number` to `number | null`. The live RM 2 and total 3.45 are more accurate.

### 4. Migration & Rollback

The optional `StateRecord.task.operatorHandoffProblem` keeps older snapshots structurally loadable. The reader is pure and no persisted data is migrated, so reverting the implementation restores previous behavior.

The changeset obligations now cover both public effects:

- `countOperatorHandoff` begins throwing.
- `CompactRecord.operatorHandoffs` becomes nullable and queue JSON gains a problem field.

A minor pre-1.0 release and explicit migration note are proportionate. The missing exact queue JSON test and impossible handoff-card substitution prevent the migration contract from being fully executable.

### 5. Memory Inputs

Each declared input was challenged:

- `scope-out-the-layer-the-rounds-keep-hitting` and `state-model-before-mechanism` substantively support the split.
- `assert-absent-needs-an-independent-cause` and `fixture-must-reach-production-shape` require isolated refusal causes and production-shaped CLI tests.
- `metadata-declares-what-it-cannot-provide` directly supports refusing an unjustified count.
- `gate-run-resume-after-archive` and `strictness-added-during-extraction-is-a-behavior-change` correctly inform the late refusal and compatibility treatment.
- `surface-set-without-its-predicate` supports the explicit artifact-presence discriminator.
- `operator-row-must-be-a-table-row`, `exemption-marker-needs-no-prose`, `narrow-the-grammar-not-the-parser`, and `two-parsers-wrong-together` are relevant and correctly dispositioned.
- `a-rule-corrected-survives-where-it-is-restated` remains applicable and is violated by PRD-040’s surviving §5/§7 statements.

No active indexed record with a `watch` overlapping a declared PRD-043 target is omitted; the direct lint confirms the memory contract passes.

The prompt’s Memory Outputs challenge describes an older version. The live PRD does not declare a ceremonial `none`; it declares `_brain/learnings/unreadable-input-needs-a-diagnostic-result.md` and repeats it under Durable Artifacts. That output records a non-derivable diagnostic-result principle and honestly belongs to PRD-043 rather than PRD-040.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15%    | 6.5/10 | The handoff-card behavior contradicts the refusal path and requires undeclared design-package changes. |
| 2         | Completeness             | 20%    | 7.0/10 | Compact shape is exact, but queue JSON lacks an exact contract test and PRD-040 retains split survivors. |
| 3         | Technical Depth          | 25%    | 8.0/10 | Parser, diagnostic state, public throw, sequencing, and audit design are strong. |
| 4         | Multi-Tenancy & Security | 20%    | 9.5/10 | No route, endpoint, query, tenant, auth, secret, telemetry, or network surface is introduced. |
| 5         | Scope & Testability      | 10%    | 7.0/10 | Strong refusal fixtures, but the final-card test promises an unreachable outcome and misses required files. |
| 6         | Migration & Rollback     | 10%    | 8.0/10 | Both public compatibility changes are named; exact queue output verification remains absent. |
| **Total** | **Weighted**             |        | **7.8/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, or query path is touched.
- Contract cap: not tripped — no client-to-server payload is introduced. The queue JSON issue affects scoring but is not this cap’s payload class.
- Lint cap: not tripped — direct `lintPrd` returned `{"ok":true,"issues":[]}`.
- Method-content cap: not tripped — the behavior traces to owner-approved Addendum A3 Clauses 2 and 5.
- Runtime-dependency cap: not tripped — no runtime dependency is proposed.
- Push cap: not tripped — no remote-push path is proposed.

---

## Missing Pieces (to reach 10/10)

1. **CLOSED — iteration-4 Missing Piece 1.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md` §4 FR-1 and §6 against `packages/provegate/src/core/state/markdown.ts::splitTableCells`. Separator shape plus equal cell count distinguishes the boundaryless-table refusal from ordinary pipe prose. Exact change: none.

2. **CLOSED — iteration-3 Missing Piece 2.** Evidence checked: PRD-043 §4 FR-3/FR-4 against `build.ts::StateRecord`, `buildState`, `prd-ready.ts::lintPrd`, and `cli.ts::runCheck`. The diagnostic and three-state artifact-presence contract remain explicit. Exact change: none.

3. **CLOSED — iteration-4 Missing Piece 3.** Evidence checked: PRD-043 §4 FR-2 and §11 against `core/state/index.ts`, the package-root wildcard exports, and `scripts/adopter-smoke.sh`. The public reader, error identity, stable code, installed imports, and runtime break are covered. Exact change: none.

4. **CLOSED — iteration-3 Missing Piece 4.** Evidence checked: PRD-043 §4 FR-5 and §11. PRD-040 and its audit interface are hard preconditions; three-field evidence becomes stale and four-field evidence is required. Exact change: none.

5. **CLOSED — iteration-3 Missing Piece 5.** Evidence checked: PRD-043 Memory Inputs against the active records and direct lint. No active overlapping `watch` is omitted. Exact change: none.

6. **CLOSED — iteration-3 Missing Piece 6.** Evidence checked: PRD-043 Memory Outputs and Durable Artifacts. The diagnostic-result learning is substantive and is not deferred to PRD-040. Exact change: none.

7. **CLOSED — iteration-3 Missing Piece 7.** Evidence checked: PRD-043 header and value arithmetic. The live `3.45 (5/4/3/2/2)` is correct; MF 5 is justified and RM 2 correctly reflects the two public compatibility changes. Exact change: none.

8. **OPEN — iteration-4 split-coherence finding.** Evidence checked: `_prds/wip/prd-040-operator-gate-coherence.md` §5, §7 Migration, Memory Inputs, and §4 FR-4–FR-7. The resume attribution and rollback trigger are closed, but the unreadable-population and global-refusal survivors remain. Exact changes:

   - In PRD-040 §7 Migration, end the FR-7 classification paragraph after “the four counting sources plus the zero-row acceptance changes — nothing else.” Delete the remaining unreadable-population/“recorded here” passage and “This item performs no refusals.”
   - In PRD-040 §5, replace “The refusal messages teach the shape” with a statement bound to FR-8, such as: “FR-8’s `METHOD.md` text states the authorized list/table/ledger shapes; no task-template prose is added.”

9. **CLOSED — iteration-5 measured-baseline contradiction.** Evidence checked: PRD-043 §1–§2 against PRD-040 §7 and the fourteen-document measurement. The live text correctly distinguishes 0, 2, 2, and 0 and defines the defect as any unjustified number. Exact change: none.

10. **CLOSED — iteration-6 escape-parity contradiction.** Evidence checked: PRD-040 §6 and §11 against FR-2. Odd `\|` and even `\\|` source forms remain distinct. Exact change: none.

11. **OPEN — iteration-7 unusable-count consumer finding remains partially closed.** Evidence checked: PRD-043 §4 FR-3, §7, §8, Conflict Surface, and §11 against `query.ts::CompactRecord`, `formatCompactRecord`, `cli.ts::runRun`, `core/run/chain.ts`, and `packages/design/src/cli/cards.ts`. The compact representation, export story, and handoff-site classification are closed. The new handoff behavior is impossible and the public queue representation is not directly tested. Exact changes in `_prds/wip/prd-043-unreadable-artifact-refuses.md`:

   - In §4 FR-3 and §7 Architecture, replace the final handoff-card “same substitution” requirement with: “An unreadable artifact stops at `operatorGateOk`; no successful handoff card or `READY TO PUSH` line is emitted.”
   - In §11 FR-3, replace “both `runRun` printers report the problem” with a production `gate run` assertion that the stop path names the problem and emits no final handoff card.
   - In §11 FR-3, add an exact `gate queue --json` assertion for `operatorHandoffs: null` and the corresponding `operatorHandoffProblem`.
   - Do not expand scope into `packages/design/src/cli/cards.ts`; that renderer accepts a number because the success card must be unreachable on this problem path.

12. **CLOSED — iteration-7 `PrdReadyReport.warnings` regression surface.** Evidence checked: PRD-043 §4 FR-4, §8, Conflict Surface, and §11 against the six exact expectations in `packages/provegate/test/prd-ready.test.ts`. Exact change: none.

13. **CLOSED — iteration-8 stale consumer restatements.** Evidence checked: PRD-043 §2 and §7 against FR-3. The metric is now `0 of 5 → 5 of 5`, and §7 enumerates the same five read sites with distinct behaviors. Exact change: none.

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
| 8   | 2026-08-07 | 7.9   | ITERATE | Warning regression surface closed and readers were inventoried; compact shape, stale cardinality, and PRD-040 survivors remained. |
| 9   | 2026-08-07 | 7.8   | ITERATE | Compact shape and five-site restatements closed. The handoff fix introduced an unreachable/out-of-scope behavior, queue JSON lacks an exact test, and PRD-040’s sixth sweep still has survivors. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- No push code path: compliant; none is proposed.
- Zero runtime dependencies: compliant; none is proposed.
- No telemetry or network calls: compliant.
- Method-content traceability: compliant; Addendum A3 Clauses 2 and 5 authorize the warning and refusal.
- Addendum boundary: compliant; no template default, acceptance authorship, or acceptance-schema change is proposed.
- ADR compliance: no conflict identified.
- Canonical status vocabulary: unaffected.
- Public numeric API compatibility: complete for `countOperatorHandoff`.
- Public compact/JSON compatibility: representation and changeset obligation are complete; exact queue JSON verification is incomplete.
- Dependency ordering: hard-gated; PRD-040, its fixtures, and its compatible audit script must exist before implementation begins.
- Split ownership: warning placement is correct; PRD-040 §5/§7 still retain retracted claims.
- Memory Outputs: substantive learning declared and repeated under Durable Artifacts.
- Value score: live `3.45 (5/4/3/2/2)` is arithmetically and substantively correct.

---

## Verdict

ITERATE — the compact representation, public migration statement, handoff-site classification, and five-site restatements are genuinely closed. The item still cannot pass because its new successful-handoff-card requirement contradicts the mandatory refusal path and requires undeclared design-package changes, the queue JSON contract lacks an exact test, and PRD-040’s claimed sixth sweep left live split contradictions in §5 and §7.
