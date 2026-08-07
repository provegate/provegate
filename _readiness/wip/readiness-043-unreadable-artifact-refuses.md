# Readiness Assessment: PRD-043 — An Unreadable Task Artifact Refuses, It Never Counts Zero

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-043-unreadable-artifact-refuses.md` |
| Score                  | 7.7/10 |
| Verdict                | ITERATE |
| Iteration              | 3 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — supplied measured `node packages/provegate/dist/cli.js check PRD-043`; local rerun reached the state write and was blocked by read-only `EPERM` |
| State Record           | pending — read-only assessment |

---

## Model Tier Recommendation

| Phase               | Tier                          | Rationale |
| ------------------- | ----------------------------- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | The boundaryless-table predicate still rejects ordinary prose, the installed migration export is not executable, fingerprint staleness lacks verification, and PRD-040 still contradicts the split. |
| Phase 6 (Audit)     | —                             | Re-score after the remaining parser, packaging, audit, and cross-item contracts are corrected. |

---

## Analysis

### 1. Technical Depth & Architecture

The core architecture is sound and stays within Addendum A3 Clause 5:

- `scanDocument().unreliable` is the correct fail-closed source, matching the precedent at `packages/provegate/src/core/memory/artifacts.ts:641`.
- One diagnostic reader feeding `buildState`, `operatorGateOk`, and `lintPrd` avoids parser disagreement.
- Refusal before acceptance lookup is correctly specified.
- Aggregated document-order diagnostics and an unusable count prevent partial results from becoming authorization.
- The discriminated `lintPrd` input now distinguishes present, absent, and unavailable state without pretending `StateRecord.task` carries `present`.

The position-based table-block correction closes the prior “every data row is also a header” defect. A valid header/separator/data block is now structurally consumable.

The boundaryless predicate remains open. FR-1 says `A | B` becomes a problem whenever its next line is a separator line “ignoring boundary pipes.” The defined separator predicate requires only separator characters and one dash; it does not require the same cell count. Therefore:

```markdown
A | B
---
```

meets the literal rule and refuses ordinary prose. The prose-positive test in §11 does not include the following `---`, so it cannot catch this defect.

### 2. Edge Cases & Failure Modes

The following cases are now clear:

- Valid boundary-piped header/separator/data block: structurally recognized.
- Boundary-piped run with no second-line separator: refuses.
- Unequal-width data row: refuses and names both widths.
- Missing or duplicate ledger `Result` column: refuses.
- Unterminated fence/comment: refuses through `scanDocument().unreliable`.
- Multiple problems: aggregated in document order.
- No task artifact: distinct from a present artifact with zero rows.

The required positive controls remain incomplete. §11 needs both a valid table producing no problem and `A | B` followed by `---` remaining prose. Without them, the boundaryless false positive can ship while every listed refusal fixture passes.

Sequencing is no longer merely advisory. FR-5 explicitly makes merged PRD-040, its fixtures, and its `--assert-acknowledged` audit interface Phase-3/Phase-4 preconditions. The current repository has no `scripts/audit-operator-rows.mjs`, so work must stop before Phase 3 or Phase 4 until PRD-040 supplies it.

### 3. Maintainability & DX

The public-API compatibility story is mostly honest:

- Current internal production use is `buildState`.
- `countOperatorHandoff` is re-exported through `core/state/index.ts`.
- `scripts/adopter-smoke.sh` imports it from an installed package.
- The PRD explicitly says malformed input changes from a numeric return to an exception.
- The changeset must name the throw and a migration.

Adding `scripts/adopter-smoke.sh` to Targets, Scope, Conflict Surface, and §11 closes the missing execution-path finding.

The migration itself remains incompletely wired. The PRD tells adopters to call `readOperatorHandoff`, but it never explicitly requires that reader and a named result type to be exported from the package root. The installed smoke assertion checks only the legacy wrapper’s throw and code. An implementation could satisfy §11 while leaving the proposed migration unimportable.

The fingerprint design is now correct: three fields grow to four, so an acknowledgement that never measured refusals becomes stale. However, §11 runs only the reporting mode. It does not exercise `--assert-acknowledged` against a legacy three-field line or a stale refusal population.

### 4. Migration & Rollback

Rollback remains credible: the reader is pure, the state field is additive, and no persistent data migration occurs. Reverting the release restores the previous numeric behavior.

The split is still not coherent from both sides. PRD-040 correctly states in its Non-Goals and Migration section that diagnostic results, `StateRecord` changes, and refusals belong to PRD-043, but stale present-tense obligations survive elsewhere:

- PRD-040 Memory Inputs says FR-4 refuses `scanDocument().unreliable`; its actual FR-4 is the declaration invariant.
- PRD-040’s DO NOT section still commands, “DO NOT return zero for input the grammar does not cover; refuse and name it,” contradicting its explicit interim zero behavior and PRD-043 ownership.
- PRD-040 §7 still describes a `refusal` classification in its two-population audit, although refusals are PRD-043’s third population.
- Related FR references remain stale: the audit is called FR-8 where it is FR-7, METHOD is called FR-9 where it is FR-8, and resume/known-red dispositions point at outdated FR numbers.

Thus PRD-040 still claims behavior that only PRD-043 may deliver.

The current value header is `3.45 (MF/UI/TL/AR/RM: 5/4/3/2/2)`, not the earlier `3.60`/RM-3 proposal:

`0.25×5 + 0.25×4 + 0.20×3 + 0.15×2 + 0.15×2 = 3.45`.

- MF 5: justified. Clause 5 is owner-approved method content whose required behavior is absent, so this is a method-fidelity gap rather than merely an ordinary parser bug.
- UI 4: justified; it prevents silent autonomous closes and produces actionable diagnostics.
- TL 3: justified; it strengthens a central gate but does not broadly unlock unrelated work.
- AR 2: justified; the impact is adopter-facing but not primarily an adoption-surface improvement.
- RM 2: justified; a public numeric API starts throwing and parsing behavior changes across core consumers.

### 5. Memory Inputs

Each declared input was challenged:

- `scope-out-the-layer-the-rounds-keep-hitting`: correctly applied through the PRD-040/043 split, although the predecessor sweep remains incomplete.
- `assert-absent-needs-an-independent-cause`: relevant to independent refusal fixtures.
- `fixture-must-reach-production-shape`: correctly drives testing through `runCheck`.
- `metadata-declares-what-it-cannot-provide`: relevant to refusing an unjustified numeric result.
- `gate-run-resume-after-archive`: relevant; refusal inside `operatorGateOk` covers resumed merge paths.
- `strictness-added-during-extraction-is-a-behavior-change`: correctly reflected in the audit, release note, rollback, and public throw.
- `surface-set-without-its-predicate`: relevant; artifact presence now has a closed predicate.
- `operator-row-must-be-a-table-row`: correctly reviewed as PRD-040’s counting concern.
- `exemption-marker-needs-no-prose`: correctly reviewed; no exemption syntax is introduced.
- `narrow-the-grammar-not-the-parser`: directionally applied, but the boundaryless predicate is not yet closed.
- `a-rule-corrected-survives-where-it-is-restated`: not successfully applied across PRD-040.
- `state-model-before-mechanism`: correctly applied through the discriminated presence model.
- `two-parsers-wrong-together`: correctly applied through one reader serving both consumers.

No active record with a `watch` overlapping the declared FR Targets is missing. The applicable `_prds/**`, `_prds/wip/**`, test, CLI, `core/run/**`, and `core/gates/**` watches all have dispositions.

Memory Outputs is not a ceremonial `none` in the current file. It declares `_brain/learnings/unreadable-input-needs-a-diagnostic-result.md`, repeats it under Durable Artifacts, and captures a non-derivable cross-consumer design rule distinct from PRD-040’s counting learning.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15%    | 7.5/10 | Concrete targets and commands; boundaryless matching, migration exports, and predecessor restatements remain unclear. |
| 2         | Completeness             | 20%    | 7/10 | Major closures landed, but positive parser controls and acknowledgement-staleness verification are missing. |
| 3         | Technical Depth          | 25%    | 7.5/10 | Strong diagnostic and state architecture; literal boundaryless behavior still has a false-positive path. |
| 4         | Multi-Tenancy & Security | 20%    | 9/10 | No route, endpoint, query, tenant, auth, telemetry, network, or secret surface. |
| 5         | Scope & Testability      | 10%    | 7.5/10 | PRD-043’s scope is sensible, but PRD-040 still claims part of it and two contracts lack executable assertions. |
| 6         | Migration & Rollback     | 10%    | 7.5/10 | Breaking behavior and rollback are honest; the migration export and expanded-audit compatibility test remain incomplete. |
| **Total** | **Weighted**             |        | **7.7/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, or query surface is touched.
- Contract cap: not tripped — no client-to-server payload is introduced.
- Lint cap: not tripped — the supplied measured `gate check PRD-043` result passes; the local retry was blocked only because `findRecord` writes `_state/prds.json` in a read-only sandbox.
- Project method cap: not tripped — behavior traces to owner-approved Addendum A3 Clause 5.
- Runtime-dependency/push caps: not tripped — neither is proposed.

---

## Missing Pieces (to reach 10/10)

1. **OPEN — iteration-2 Missing Piece 1, partially closed.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-1, §6, and §11; `packages/provegate/src/core/state/markdown.ts::operatorRowsIn`; measured separatorless-table behavior. Position-based block detection closes the data-row/header defect, but boundaryless cell-count matching and positive controls are absent. Exact change: in §4 FR-1 require the normalized boundaryless separator to have the same cell count as the candidate line, and in §11 add fixtures proving a valid header/separator/data table has no problem and `A | B` followed by `---` remains prose.

2. **CLOSED — iteration-2 Missing Piece 2.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-3/FR-4 and §8; `packages/provegate/src/core/state/build.ts::StateRecord`; `packages/provegate/src/cli.ts::runCheck`. The sixth parameter is now a discriminated union, `runCheck` owns construction of `present`, and absence-with-state is distinct from callers with no state. Exact change: none.

3. **OPEN — iteration-2 Missing Piece 3, partially closed.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-2, §8, Conflict Surface, and §11; `packages/provegate/src/core/state/index.ts`; `scripts/adopter-smoke.sh`. The installed throw assertion is now executable, but the documented migration reader is not explicitly a package-root contract. Exact change: in §4 FR-2 name and require package-root exports for `readOperatorHandoff`, `OperatorHandoffUnreadableError`, and a named result type; extend the §11 installed-package assertion to import the reader and verify its `{count, problem}` result.

4. **OPEN — iteration-2 Missing Piece 4, partially closed.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-5, §7 Dependencies, and §11; current absence of `scripts/audit-operator-rows.mjs`. The four-field fingerprint is correctly defined, but its compatibility behavior is not verified. Exact change: add an FR-5 §11 command/check using `--assert-acknowledged` that proves a PRD-040 three-field line fails and that changing only the refusal population stales a previously valid four-field acknowledgement.

5. **CLOSED — iteration-2 Missing Piece 5.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, Memory Inputs, against the active record headers and their `watch` fields. All overlapping watches are dispositioned; `operator-row-must-be-a-table-row` remains explicitly reviewed. Exact change: none.

6. **CLOSED — iteration-2 Missing Piece 6.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, Memory Outputs and Durable Artifacts. The current file declares its own substantive diagnostic-result learning rather than deferring the durable fact to PRD-040 or using ceremonial `none`. Exact change: none.

7. **CLOSED — iteration-2 Missing Piece 7.** Evidence checked: `_prds/wip/prd-043-unreadable-artifact-refuses.md`, Value header and arithmetic comment, against the configured weights. The current RM 2 and total 3.45 are arithmetically and substantively correct. Exact change: none.

8. **OPEN — iteration-2 split-coherence finding.** Evidence checked: `_prds/wip/prd-040-operator-gate-coherence.md`, §5, §7 Migration, Memory Inputs, §11, and §12 DO NOT, from both PRD-040’s and PRD-043’s ownership boundaries. Exact change: remove the PRD-040 Memory Input claim that FR-4 refuses `scanDocument().unreliable`; replace the DO NOT refusal command with a PRD-043 cross-reference; remove the two-population audit’s `refusal` classification; and correct stale FR references so audit=`FR-7`, METHOD=`FR-8`, adopter known-red cleanup=`FR-9`, and declaration-resume enforcement=`FR-5`.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.4   | ITERATE | Parser, public API, presence, sequencing, audit, memory, and value contracts were incomplete. |
| 2   | 2026-08-07 | 7.2   | ITERATE | Diagnostic identity, hard dependency, durable learning, and value closures verified; parser/state contradictions, packaging, fingerprint, and split issues remained. |
| 3   | 2026-08-07 | 7.7   | ITERATE | Position-based blocks, discriminated presence, installed-smoke scope, and four-field fingerprint materially improve the item; boundaryless prose, migration export, audit verification, and stale PRD-040 claims remain open. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- No push code path: compliant; none is proposed.
- Zero runtime dependencies: compliant; none is proposed.
- No telemetry or network calls: compliant.
- Method-content traceability: compliant; Addendum A3 Clause 5 authorizes refusal, with the Phase-2 warning derived from Clauses 2 and 4.
- Addendum boundary: compliant; no template default, acceptance authorship, or acceptance schema change is proposed.
- ADR compliance: no conflict identified.
- Canonical status vocabulary: unaffected.
- Public API compatibility: the breaking throw is honestly described; the migration reader still needs an explicit installed export contract.
- Dependency ordering: hard-gated, not advisory; the missing audit script prevents Phase 3/4 from starting.
- Value score: current `3.45 (5/4/3/2/2)` is correct; RM 3/3.60 would understate the public-API and gate-parser risk.

---

## Verdict

ITERATE — no hard cap is tripped, and four iteration-2 findings are closed or materially improved. The item remains below PASS because its literal boundaryless predicate can refuse ordinary prose, the installed migration path is not fully exported and tested, the expanded fingerprint lacks an acknowledgement-staleness regression, and PRD-040 still contains present-tense refusal obligations and stale cross-references that leave the split incoherent.
