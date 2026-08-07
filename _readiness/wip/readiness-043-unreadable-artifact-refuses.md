# Readiness Assessment: PRD-043 — An Unreadable Task Artifact Refuses, It Never Counts Zero

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-043-unreadable-artifact-refuses.md` |
| Score                  | 7.9/10 |
| Verdict                | ITERATE |
| Iteration              | 6 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — direct `lintPrd` returned `{"ok":true,"issues":[]}`; supplied full `gate check PRD-043` passes. A local CLI rerun reached the read-only sandbox boundary while refreshing `_state/prds.json`, not a lint failure |
| State Record           | pending — read-only assessment |

---

## Model Tier Recommendation

| Phase               | Tier                          | Rationale |
| ------------------- | ----------------------------- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | FR-1 is now coherent, but PRD-043’s overview still contradicts the measured baseline and PRD-040’s claimed split sweep again did not land in the live sections. |
| Phase 6 (Audit)     | —                             | Re-score after the remaining baseline and predecessor contradictions are corrected. |

---

## Analysis

### 1. Technical Depth & Architecture

FR-1’s central contradiction is closed. The current text now gives a matching boundaryless header/separator pair exactly one outcome: `problem`. Its positive control is a `|`-bearing sentence whose neighbour is not a matching separator. This agrees with §6 and with the current `splitTableCells`, which requires both boundary pipes.

The two-part boundaryless predicate is appropriately narrow:

- A lone ordinary sentence containing `|` is not rejected.
- A sentence above a separator with a different cell count is not rejected.
- A matching equal-width boundaryless pair is treated as an unreadable table rather than silently contributing zero.
- The measured separator-less piped table and unequal-width row are independently covered.

The remaining architecture is sound and inside Addendum A3 Clause 5:

- `scanDocument().unreliable` reports unclosed fences/comments.
- `artifacts.ts:641` demonstrates the diagnostic-result precedent.
- `buildState` is the correct point to store the count and problem together.
- `operatorGateOk` correctly refuses before acceptance lookup.
- `lintPrd` and `runCheck` correctly separate fatal problems from the non-fatal declaration warning.

PRD-040 remains materially inconsistent despite its third-sweep Changelog row. Its live §5 and Memory Inputs still carry off-by-one FR references, §7 still discusses an audit `refusal` classification, and its escape-parity acceptance fixture presents the same input twice while assigning it opposite outcomes.

### 2. Edge Cases & Failure Modes

PRD-043 covers the significant failure modes: missing or duplicate ledger `Result` columns, missing separators, width mismatches, boundaryless tables, scanner unreliability, multiple ordered diagnostics, absent task artifacts, stale audit acknowledgements, and fatal-versus-warning consumer behavior.

Sequencing is a hard precondition. FR-5 says Phase 3/4 cannot start unless PRD-040 is merged, its fixtures exist, and `scripts/audit-operator-rows.mjs` exposes `--assert-acknowledged`. The script is currently absent, so the present checkout correctly cannot start PRD-043 implementation.

The audit-script dependency is therefore complete: if PRD-040 ships without the script or compatible interface, PRD-043 stops at preflight rather than inventing or bypassing the dependency.

The unresolved measured-baseline statement remains consequential. PRD-043 §1 says four unreadable shapes each return zero. The measured current results are instead 0, 2, 2, and 0. Its success metric likewise says unreadable artifacts are “always” counted as zero. These statements misdescribe both the current implementation and the PRD-040-then-PRD-043 deployment sequence.

### 3. Maintainability & DX

The public compatibility story is complete:

- `countOperatorHandoff` is exported through `core/state/index.ts`, `core/index.ts`, and the package root.
- `buildState` is its current internal production caller.
- `scripts/adopter-smoke.sh` imports it from an installed package, demonstrating adopter exposure.
- FR-2 explicitly states that the new throw is a runtime compatibility break despite the unchanged TypeScript signature.
- The changeset must name the break and direct callers to `readOperatorHandoff`.
- Both the reader and `OperatorHandoffUnreadableError` must be importable from the installed package root.
- The stable error code and wrapper throw are tested through the installed package.

The Phase-2 warning belongs in PRD-043. It depends on this item’s diagnostic result, `lintPrd` parameter, warning report shape, and `runCheck` plumbing. PRD-040 correctly owns the declaration invariant enforced at the chain and merge gates.

The split is nevertheless not ready while PRD-040’s live text still assigns audit/refusal concepts and incorrect FR identities across that boundary.

### 4. Migration & Rollback

The optional `StateRecord.task.operatorHandoffProblem` supports old state snapshots. The reader is pure and performs no disk migration, so reverting the implementation restores the previous behavior.

The audit fingerprint grows from three fields to four. A PRD-040 acknowledgement therefore becomes stale rather than silently authorizing the newly measured refusal population.

A minor pre-1.0 release is reasonable, but the public numeric API beginning to throw remains the item’s dominant compatibility risk. RM 2 is more accurate than RM 3.

The current value header is not the `3.60 (.../3)` stated in the review prompt. The live file declares:

`3.45 (MF/UI/TL/AR/RM: 5/4/3/2/2)`

The arithmetic is correct:

`0.25×5 + 0.25×4 + 0.20×3 + 0.15×2 + 0.15×2 = 3.45`.

- MF 5 is justified: owner-approved A3 Clause 5 is unimplemented method content, not an ordinary parser bug.
- UI 4 is justified by preventing silent autonomous closes.
- TL 3 and AR 2 are proportionate.
- RM 2 correctly reflects the public throw and new refusal paths.

### 5. Memory Inputs

Each disposition remains substantively examined:

- `scope-out-the-layer-the-rounds-keep-hitting` and `state-model-before-mechanism` justify the PRD-040/043 split.
- `assert-absent-needs-an-independent-cause` and `fixture-must-reach-production-shape` justify isolated fixtures and `runCheck`-level tests.
- `metadata-declares-what-it-cannot-provide`, `strictness-added-during-extraction-is-a-behavior-change`, and `gate-run-resume-after-archive` support the diagnostic result, compatibility treatment, and late refusal.
- `surface-set-without-its-predicate` supports the explicit `present` discriminator.
- `operator-row-must-be-a-table-row` remains correctly owned at the counting layer by PRD-040.
- `exemption-marker-needs-no-prose` and `two-parsers-wrong-together` are reasonably reviewed as non-applicable to new exemption syntax or a second implementation.
- `narrow-the-grammar-not-the-parser` now aligns with FR-1’s matching-boundaryless refusal.
- `a-rule-corrected-survives-where-it-is-restated` remains highly relevant: PRD-040’s live sections again refute the Changelog’s sweep claim.

No active record whose `watch` overlaps a declared PRD-043 target is missing. The direct readiness lint also validated the active/indexed/watch contract.

Memory Outputs is not a ceremonial `none`. PRD-043 declares its own diagnostic-result learning, `_brain/learnings/unreadable-input-needs-a-diagnostic-result.md`, and repeats it under Durable Artifacts. Deferring that fact to PRD-040 would be wrong; the current declaration is substantive.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15%    | 6.5/10 | FR-1 is now coherent, but §1’s baseline is false and PRD-040 still contains incorrect FR references and an impossible escape-parity fixture. |
| 2         | Completeness             | 20%    | 7.0/10 | Public migration, sequencing, audit compatibility, and memory contracts are complete; the predecessor side of the split remains unswept. |
| 3         | Technical Depth          | 25%    | 8.0/10 | Strong diagnostic/state/consumer architecture and a discriminating boundaryless predicate; cross-item restatements remain contradictory. |
| 4         | Multi-Tenancy & Security | 20%    | 9.5/10 | No route, endpoint, query, tenant, auth, permission, secret, telemetry, or network surface is introduced. |
| 5         | Scope & Testability      | 10%    | 7.5/10 | FR-1 controls and hard preflight are strong; PRD-040 still crosses the split and specifies one parity test with identical inputs. |
| 6         | Migration & Rollback     | 10%    | 9.0/10 | Public break, installed migration exports, changeset, audit growth, release, rollback, and state compatibility are explicit. |
| **Total** | **Weighted**             |        | **7.9/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, or query path is touched.
- Contract cap: not tripped — no client-to-server payload is introduced.
- Lint cap: not tripped — direct lint returned `{"ok":true,"issues":[]}` and the supplied full CLI measurement passes.
- Method-content cap: not tripped — the behavior traces directly to owner-approved Addendum A3 Clause 5.
- Runtime-dependency cap: not tripped — no runtime dependency is proposed.
- Push cap: not tripped — no remote-push path is proposed.

---

## Missing Pieces (to reach 10/10)

1. **CLOSED — iteration-4 Missing Piece 1.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-1 “One outcome per shape” and Positive Controls, against §6 and `packages/provegate/src/core/state/markdown.ts::splitTableCells`. A matching boundaryless table is now only a `problem`; its positive control is a `|`-bearing sentence whose neighbour does not match. Exact change: none.

2. **CLOSED — iteration-3 Missing Piece 2.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-3/FR-4; `packages/provegate/src/core/state/build.ts::StateRecord`; `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`; `packages/provegate/src/cli.ts::runCheck`. The optional state diagnostic, discriminated presence union, and construction point are explicit. Exact change: none.

3. **CLOSED — iteration-4 Missing Piece 3.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-2 and §11; `packages/provegate/src/core/state/index.ts`; package-root wildcard exports; `scripts/adopter-smoke.sh`. Both migration symbols must import from the installed package root, and the stable throw is asserted there. Exact change: none.

4. **CLOSED — iteration-3 Missing Piece 4.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-5 and §11. Three-field acknowledgements become STALE, matching four-field acknowledgements pass, and the missing PRD-040 audit interface blocks implementation. Exact change: none.

5. **CLOSED — iteration-3 Missing Piece 5.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, Memory Inputs, against the active records’ `watch` fields and every FR Target. No overlapping active record is omitted. Exact change: none.

6. **CLOSED — iteration-3 Missing Piece 6.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, Memory Outputs and Durable Artifacts. The item declares its own diagnostic-result learning rather than a ceremonial `none` or an improper deferral to PRD-040. Exact change: none.

7. **CLOSED — iteration-3 Missing Piece 7.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, header and value comment. The live header correctly uses RM 2 and total 3.45. Exact change: none.

8. **OPEN — iteration-4 split-coherence finding.** Evidence checked: `_prds/wip/prd-040-operator-gate-coherence.md`, §5, §7 Migration/Rollback, Memory Inputs, §11 and Changelog, against PRD-043 §§4–7. The third-sweep claim did not land completely. Exact changes in `_prds/wip/prd-040-operator-gate-coherence.md`:

   - In §5, change the METHOD reference from FR-9 to FR-8.
   - In §5, replace “under this item each contributes zero rows” with the measured interim outcomes: no-separator table `2→0`, narrow row `2→1`, missing `Result` column `0`, and unterminated fence read as far as the scanner permits; state that none refuses.
   - In §7 Migration, delete the `refusal` classification/default-stop passage. FR-7 has only count changes and zero-row acceptance changes.
   - In §7 Rollback, delete the unreadable-input-refusal aside and retain only unintended count-change rollback.
   - In Memory Inputs, change known-red cleanup FR-8→FR-9, resume enforcement FR-6→FR-5, and state-model references FR-5/FR-6→FR-4/FR-5.
   - Rewrite `surface-set-without-its-predicate`: FR-6 is the audit acknowledgement script and introduces no lint predicate.
   - Replace `narrow-the-grammar-not-the-parser`’s FR-4 interim-behavior reference with §7/FR-2–FR-3.

9. **OPEN — iteration-5 measured-baseline contradiction.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §1 and §2 Success Metrics, against PRD-040 §7 and the supplied fourteen-shape measurement. Exact change: in §1, replace “Each of those returns `0`” with the current results—missing `Result` 0, no-separator table 2, narrow row 2, unterminated fence 0—and state that PRD-040 changes some numeric values without producing the Clause-5 refusal. In §2, replace “Unreadable artifacts counted as zero / always” with “Unreadable artifacts treated as usable numeric results / always.”

10. **OPEN — new split-coherence fixture contradiction.** Evidence checked: `_prds/wip/prd-040-operator-gate-coherence.md`, §6 escape-parity acceptance criterion and §11 FR-2 verification row, against §4 FR-2. Both examples currently contain the identical source `a\|b` while claiming one is one cell and the other two. Exact change: in both §6 and §11, use distinct parity examples—`a\|b` for an odd preceding-backslash count that keeps the pipe escaped, and `a\\|b` for an even count that makes the pipe a separator—and state the corresponding cell counts in that order.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.4   | ITERATE | Parser, public API, presence, sequencing, audit, memory, and value contracts were incomplete. |
| 2   | 2026-08-07 | 7.2   | ITERATE | Diagnostic identity, hard dependency, durable learning, and value closures verified; parser/state contradictions, packaging, fingerprint, and split issues remained. |
| 3   | 2026-08-07 | 7.7   | ITERATE | Position-based blocks, discriminated presence, installed-smoke scope, and four-field fingerprint improved the item; four findings remained. |
| 4   | 2026-08-07 | 7.9   | ITERATE | Audit compatibility improved; boundaryless controls, installed-reader verification, and PRD-040 restatements remained. |
| 5   | 2026-08-07 | 7.8   | ITERATE | Installed exports closed. The claimed boundaryless and PRD-040 sweeps were absent, and §1 contradicted measured behavior. |
| 6   | 2026-08-07 | 7.9   | ITERATE | FR-1’s one-outcome rule is now genuinely closed. PRD-040’s claimed sweep again failed to land, PRD-043’s measured baseline remains false, and PRD-040’s parity fixture assigns opposite outcomes to identical inputs. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- No push code path: compliant; none is proposed.
- Zero runtime dependencies: compliant; `packages/provegate/package.json` has no runtime `dependencies`.
- No telemetry or network calls: compliant.
- Method-content traceability: compliant; Addendum A3 Clause 5 authorizes unreadable-artifact refusal.
- Addendum boundary: compliant; no template default, acceptance authorship, or acceptance schema change is proposed.
- ADR compliance: no conflict identified.
- Canonical status vocabulary: unaffected.
- Public API compatibility: the breaking throw, visible callers, installed migration exports, changeset, release, and rollback are stated.
- Dependency ordering: hard-gated; PRD-040, its fixtures, and its compatible audit interface must exist before Phase 3/4.
- Split ownership: warning placement in PRD-043 is correct; PRD-040 still contains stale refusal and FR-number restatements.
- Memory Outputs: substantive learning declared and repeated under Durable Artifacts.
- Value score: `3.45 (5/4/3/2/2)` is arithmetically and substantively correct.

---

## Verdict

ITERATE — FR-1’s boundaryless-table contradiction is genuinely closed, and no hard cap is tripped. The item remains below 8.0 because PRD-043 still misstates the measured baseline, while PRD-040’s claimed split sweep again failed to land in its live sections and now exposes an additional escape-parity fixture contradiction.
