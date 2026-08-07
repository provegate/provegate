# Readiness Assessment: PRD-043 — An Unreadable Task Artifact Refuses, It Never Counts Zero

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-043-unreadable-artifact-refuses.md` |
| Score                  | 7.9/10 |
| Verdict                | ITERATE |
| Iteration              | 4 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — measured `node packages/provegate/dist/cli.js check PRD-043` |
| State Record           | pending — read-only assessment |

---

## Model Tier Recommendation

| Phase               | Tier                          | Rationale |
| ------------------- | ----------------------------- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | FR-1 now contradicts itself about the exact boundaryless shape, the installed migration assertion remains narrower than FR-2, and stale PRD-040 restatements still cross the split. |
| Phase 6 (Audit)     | —                             | Re-score after the parser, installed-export, and predecessor-restatement contracts agree. |

---

## Analysis

### 1. Technical Depth & Architecture

The diagnostic architecture remains strong and authorized by Addendum A3 Clause 5:

- `scanDocument(content).unreliable` is the appropriate source for dangling-construct refusals, consistent with the fail-closed precedent in `packages/provegate/src/core/memory/artifacts.ts`.
- `readOperatorHandoff` supplies one diagnostic result to `buildState`, `operatorGateOk`, and `lintPrd`.
- `operatorGateOk` refuses before acceptance lookup.
- `lintPrd` distinguishes present, absent, and unavailable task state.
- Problems aggregate in document order, and consumers may not use a partial count.

The separatorless piped-table rule reaches the measured shape that counts two today. Width comparison reaches a narrow data row after a valid header/separator pair. Ordinary boundaryless prose containing `|` is protected unless both the next-line separator shape and equal cell count match.

The new positive-control text, however, reverses that predicate. FR-1 says a boundaryless candidate followed by a matching separator is a `problem`, while the immediately following control calls the same well-formed boundaryless GFM table legal and requires no problem. It pairs the mismatch as the refused case even though the preceding sentence classifies a different cell count as prose. Section 6 repeats the no-problem interpretation. The implementing agent cannot determine which branch is normative.

### 2. Edge Cases & Failure Modes

The following cases are now adequately specified:

- Piped header followed by data without a separator: refuses instead of preserving today’s count of two.
- Valid piped header/separator/data block: no problem.
- Data-row/header width mismatch: refuses with both widths.
- Missing or duplicate ledger `Result` column: refuses by section.
- Closed versus unterminated fence: positive and negative paths are paired.
- Multiple failures: aggregate in document order.
- No task artifact versus a present zero-row artifact: distinct.
- Legacy three-field audit acknowledgement versus matching four-field acknowledgement: stale and pass paths are both required.

The boundaryless pair remains internally impossible to implement. The two-part predicate is sufficiently narrow to avoid `A | B` followed by `---`, but the PRD assigns both refusal and acceptance to the matching two-part case.

PRD-040 is a hard dependency rather than a note. FR-5 says merged PRD-040, its fixtures, and a compatible `scripts/audit-operator-rows.mjs` are preconditions, and work does not start when they are missing. The script is absent in the current checkout, so Phase 3/4 must remain blocked until PRD-040 supplies it; that is expected dependency state, not an unstated implementation choice.

### 3. Maintainability & DX

The public compatibility story is substantially complete:

- `countOperatorHandoff` is currently exported through `core/state/index.ts` and the package root.
- `scripts/adopter-smoke.sh` imports it from an installed package.
- The current internal production caller is `buildState`.
- Unknown adopters may also consume the public export.
- The PRD explicitly acknowledges that malformed inputs change from a number to an exception.
- The changeset must name the breaking runtime behavior and direct adopters to `readOperatorHandoff`.

FR-2 now explicitly makes both `readOperatorHandoff` and `OperatorHandoffUnreadableError` package-root exports and requires installed-package verification. That closes the migration-design gap.

The verification restatement is narrower: the FR-2 `pnpm smoke:adopter` row mentions only the legacy wrapper’s throw and `code`. It does not require importing and executing `readOperatorHandoff` from the installed package. Thus the migration symbol can still be omitted from the delivered package while the described §11 check passes.

The warning belongs in PRD-043. It needs the same task diagnostic, `lintPrd` parameter, `PrdReadyReport.warnings`, and `runCheck` plumbing as the fatal problem. PRD-040 correctly retains the declaration invariant at the chain and merge gates.

### 4. Migration & Rollback

The additive optional state field permits older `_state/prds.json` data to load. The reader is pure, no repository data is migrated, and reverting the implementation restores the prior behavior. A minor release is appropriate for the current pre-1.0 package when accompanied by the required changeset.

FR-5 now specifies the audit fingerprint’s compatibility behavior in both directions. A PRD-040 three-field acknowledgement cannot authorize the newly measured refusal population.

The split is still not coherent in every PRD-040 restatement:

- Its §7 Migration section labels the audit “FR-8” although the audit is FR-7.
- The same section says PRD-040’s two-population audit can emit a `refusal` classification, despite refusals being PRD-043’s third population.
- Its rollback trigger still mentions repositories refusing on unreadable input, behavior PRD-040 explicitly does not deliver.
- Its §5 METHOD reference says FR-9 instead of FR-8.
- Memory Inputs still call known-red cleanup FR-8 instead of FR-9 and resume enforcement FR-6 instead of FR-5.
- The `surface-set-without-its-predicate` disposition says FR-6 adds a predicate to a lint surface, but FR-6 is the audit acknowledgement script and the lint surface moved to PRD-043.

The corrected `narrow-the-grammar-not-the-parser` disposition and §12 DO NOT entries are genuine closures, but the remaining text still assigns refusal or lint behavior to the wrong item.

The current value header is `3.45 (MF/UI/TL/AR/RM: 5/4/3/2/2)`, not `3.60 (5/4/3/2/3)`:

`0.25×5 + 0.25×4 + 0.20×3 + 0.15×2 + 0.15×2 = 3.45`.

- MF 5 is justified: owner-approved A3 Clause 5 defines required method behavior that is not implemented, so this is a method-fidelity gap rather than an ordinary parser bug.
- UI 4 is justified by preventing silent autonomous closes and providing actionable diagnostics.
- TL 3 and AR 2 are proportionate.
- RM 2 is correct. A public numeric API begins throwing, the central close parser changes, and multiple consumers acquire new refusal paths. RM 3 would understate that risk.

### 5. Memory Inputs

Each disposition was challenged:

- The scope, state-model, and score-trajectory records justify the PRD-040/043 split.
- The independent-cause and production-shape records correctly require paired controls and `runCheck`-level assertions.
- The strictness record is honestly reflected in the audit, changeset, and rollback strategy.
- The gate-resume record is correctly addressed by refusing inside `operatorGateOk`.
- The surface/predicate and grammar records are relevant, but FR-1’s new restatement contradiction means their intended lesson has not yet been applied successfully.
- `a-rule-corrected-survives-where-it-is-restated` directly predicts both the new FR-1 contradiction and the remaining PRD-040 residue.
- The operator-row and exemption records are appropriately reviewed without reassigning their ownership.

No active record with a `watch` overlapping the declared FR Targets is missing. The applicable `_prds/**`, `_prds/wip/**`, test, CLI, `core/run/**`, and `core/gates/**` watches have dispositions.

Memory Outputs is substantive rather than ceremonial. `_brain/learnings/unreadable-input-needs-a-diagnostic-result.md` records a cross-consumer design consequence—diagnostic result, refusal before action, and legacy-wrapper compatibility—that is distinct from PRD-040’s row-counting learning and is repeated under Durable Artifacts.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15%    | 6.5/10 | Concrete targets and commands, but FR-1 assigns opposite outcomes to the same boundaryless table. |
| 2         | Completeness             | 20%    | 7.5/10 | Audit compatibility and export requirements improved; the installed migration assertion and predecessor sweep remain incomplete. |
| 3         | Technical Depth          | 25%    | 7.5/10 | Sound diagnostic/state architecture, undermined by a contradictory central parser predicate. |
| 4         | Multi-Tenancy & Security | 20%    | 9.5/10 | No route, endpoint, query, tenant, auth, permission, secret, telemetry, or network surface. |
| 5         | Scope & Testability      | 10%    | 7.5/10 | Ownership is conceptually correct, but PRD-040 still restates behavior assigned to PRD-043. |
| 6         | Migration & Rollback     | 10%    | 8.5/10 | Breaking behavior, dependency, audit growth, changeset, and rollback are explicit; delivered-reader verification remains narrower than the migration contract. |
| **Total** | **Weighted**             |        | **7.9/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, or query path is touched.
- Contract cap: not tripped — no client-to-server payload is introduced.
- Lint cap: not tripped — measured `gate check PRD-043` passes.
- Method-content cap: not tripped — the behavior traces to owner-approved Addendum A3 Clause 5.
- Runtime-dependency cap: not tripped — no runtime dependency is proposed.
- Push cap: not tripped — no remote-push path is proposed.

---

## Missing Pieces (to reach 10/10)

1. **OPEN — iteration-3 Missing Piece 1; the attempted fix introduced a contradiction.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-1 lines 98–108 and §6 lines 202–203; `_prds/wip/prd-040-operator-gate-coherence.md`, §4 FR-2 and §7 measured boundaryless behavior; `packages/provegate/src/core/state/markdown.ts::splitTableCells`. Exact change: keep one outcome for a matching boundaryless header/separator pair across §4 and §6. Consistent with PRD-040’s leading-and-trailing-pipe grammar, state that the matching boundaryless table is the refused unsupported shape; make the unequal-cell separator pair the prose/no-problem control, and replace “well-formed boundaryless table … NO problem” with an equivalent well-formed piped-table control.

2. **CLOSED — iteration-3 Missing Piece 2.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-3/FR-4; `packages/provegate/src/core/state/build.ts::StateRecord`; `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`; `packages/provegate/src/cli.ts::runCheck`. The discriminated present/absent/undefined contract and production construction point are explicit. Exact change: none.

3. **OPEN — iteration-3 Missing Piece 3, mostly closed.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-2, §8, Conflict Surface, and §11; `packages/provegate/src/core/state/index.ts`; `packages/provegate/src/index.ts`; `scripts/adopter-smoke.sh`. The reader and error class are now required package-root exports, but §11 still verifies only the wrapper throw and `code`. Exact change: update the FR-2 `pnpm smoke:adopter` row in §11 to require importing `countOperatorHandoff`, `readOperatorHandoff`, and `OperatorHandoffUnreadableError` from the installed package; assert the reader returns `{ count, problem }` and the wrapper throws an instance carrying `OPERATOR_HANDOFF_UNREADABLE`.

4. **CLOSED — iteration-3 Missing Piece 4.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-5 and §11. The three-field acknowledgement must report STALE and a matching four-field acknowledgement must pass. The missing script is explicitly a hard preflight supplied by PRD-040. Exact change: none.

5. **CLOSED — iteration-3 Missing Piece 5.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, Memory Inputs, against the active records and their `watch` fields. No overlapping active record is omitted. Exact change: none.

6. **CLOSED — iteration-3 Missing Piece 6.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, Memory Outputs and Durable Artifacts. The item declares its own reasoned diagnostic-result learning; it neither defers the fact to PRD-040 nor uses ceremonial `none`. Exact change: none.

7. **CLOSED — iteration-3 Missing Piece 7.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, header and value arithmetic. The current file correctly uses RM 2 and `3.45`; the prompt’s `3.60`/RM-3 value is stale. Exact change: none.

8. **OPEN — iteration-3 split-coherence finding, partially closed.** Evidence checked: `_prds/wip/prd-040-operator-gate-coherence.md`, §5, §7 Migration, Memory Inputs, §11, and §12, against PRD-043 §4–§7. Exact change: in PRD-040, change §5’s METHOD reference from FR-9 to FR-8; change §7’s audit reference from FR-8 to FR-7; delete the two-population audit’s `refusal` classification and unreadable-input rollback trigger or move them explicitly to PRD-043; change the known-red disposition from FR-8 to FR-9 and the resume disposition from FR-6 to FR-5; rewrite the `surface-set-without-its-predicate` disposition so it no longer claims FR-6 adds a lint predicate. Keep the corrected §12 PRD-043 ownership language.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.4   | ITERATE | Parser, public API, presence, sequencing, audit, memory, and value contracts were incomplete. |
| 2   | 2026-08-07 | 7.2   | ITERATE | Diagnostic identity, hard dependency, durable learning, and value closures verified; parser/state contradictions, packaging, fingerprint, and split issues remained. |
| 3   | 2026-08-07 | 7.7   | ITERATE | Position-based blocks, discriminated presence, installed-smoke scope, and four-field fingerprint improved the item; four findings remained. |
| 4   | 2026-08-07 | 7.9   | ITERATE | Audit compatibility and package-root requirements improved; the boundaryless positive control now contradicts its predicate, installed-reader verification remains unstated in §11, and PRD-040 still carries stale split restatements. |

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
- Public API compatibility: the breaking throw, affected callers, changeset, migration, and rollback are stated; the installed reader assertion remains incomplete.
- Dependency ordering: hard-gated; PRD-040 and its audit interface must exist before Phase 3/4 starts.
- Split ownership: warning placement in PRD-043 is correct; stale PRD-040 restatements remain.
- Value score: `3.45 (5/4/3/2/2)` is arithmetically and substantively correct.

---

## Verdict

ITERATE — the item remains below 8.0 with no hard cap tripped. The boundaryless-table fix assigns both refusal and acceptance to the same matching GFM shape, §11 does not yet prove that the documented migration reader ships from the installed package, and PRD-040 still contains refusal, rollback, lint, and FR-number restatements that cross the declared split.
