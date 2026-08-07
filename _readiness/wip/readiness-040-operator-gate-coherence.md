# Readiness Assessment: PRD-040 — Operator Gate Coherence

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-040-operator-gate-coherence.md` |
| Score                  | 5.7/10 |
| Verdict                | ITERATE |
| Iteration              | 1 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — relied on the orchestrator-provided out-of-sandbox `gate check PRD-040` result |
| State Record           | pending — read-only scoring session |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | Parser boundaries, malformed-ledger behavior, and Phase 3→4 enforcement remain design decisions. |
| Phase 6 (Audit)     | — | Re-score after the requirements are executable without interpretation. |

---

## Analysis

### 1. Technical Depth & Architecture

The §1 measured shape table is correct against the shipped source:

| Shape | PRD claim | Source verification |
| ----- | --------- | ------------------- |
| Plain prose bullet | 0 | Correct: `operatorRowsIn` recognizes tables and checkbox rows, not plain list items. |
| Checkbox bullet | 1 | Correct: the checkbox expression recognizes `-`, `*`, `+`, and ordered markers. |
| One-row table | 2 | Correct for the measured `Item` header: only headers whose first cell is `Task` are excluded, so the header and data row both count. |
| Verification Ledger `Result: operator` | 0 | Correct: `countOperatorHandoff` reads only `Operator Handoff` sections and never examines `Verification Ledger`. |

The operation remains linear in document size and introduces no database, concurrency, tenant-isolation, or material performance concern.

The critical architectural omission is at the consumer. `operatorGateOk` does not condition acceptance on `record.autonomousClose`; zero rows pass immediately, while any positive count demands acceptance regardless of whether the PRD is `eligible` or `operator-gated`. Consequently FR-1 through FR-3 change close behavior for every artifact containing a newly recognized row, not merely the `operator-gated` artifacts described by the PRD.

FR-1 does not define a defensible row boundary. It leaves an implementer to decide whether a checkbox is also a plain list item, whether `- (none)` remains excluded, whether nested bullets count, and whether instructional or continuation bullets are rows. The current implementation trims indentation before classifying rows, so a naïve extension would make nested bullets indistinguishable from top-level handoff rows.

FR-3 likewise requires a second design decision. “Read the Result column by header name” does not define:

- Missing or duplicated `Result` headers.
- Header normalization and case handling.
- Rows shorter than the header.
- Multiple ledger tables or sections.
- Exact versus case-insensitive result values.
- Whether malformed ledgers are ignored or refused.

The stated goal says unsupported shapes should be refused, but `countOperatorHandoff` returns only a number and has no diagnostic channel for malformed ledger structures.

The value arithmetic is correct: `1.25 + 1.25 + 0.60 + 0.30 + 0.60 = 4.00`. MF 5 and UI 5 are defensible because the work repairs a core gated-method invariant and prevents a silent adopter merge. TL 3 is defensible for a localized parser/gate repair, and AR 2 is reasonable because it improves reliability rather than discovery or reach. RM 4 is not defensible: this changes a close gate governing every artifact, broadens a hand-rolled Markdown grammar, and currently lacks compatibility and malformed-input policy. The present evidence supports RM 2, producing a value score of 3.70.

### 2. Edge Cases & Failure Modes

FR-1 must distinguish countable rows from prose authors did not mean as separate acceptance demands. At minimum, section introductions, blockquotes, nested explanatory bullets, wrapped continuations, empty bullets, and the existing `- (none)` marker need explicit outcomes. Checkbox rows must count exactly once.

FR-2 correctly requires structural header exclusion, but it does not say how a pipe-row block without a valid separator is classified. The implementation should identify a header through table structure, not merely exclude selected first-cell labels.

FR-3 has no fail-closed policy for malformed ledgers. Silently selecting the first duplicated `Result` column or treating a short row as empty would recreate the same permissive ambiguity this PRD is intended to remove.

FR-4 explicitly permits a missing task file to degrade silently. That is normal during Phase 2, before Phase 3 creates the task artifact, but the PRD names no mandatory check after generation. Therefore it does not establish its own goal that an empty operator-gated task file is refused before Phase 4. Its `metadata-declares-what-it-cannot-provide` disposition also says an absent asset must be refused, directly contradicting FR-4’s absent-file behavior.

The smoke harness confirms the three KNOWN_RED entries owned by this PRD are exactly `handoff-prose`, `handoff-table`, and `ledger-operator`.

### 3. Maintainability & DX

The implementation stays within strict TypeScript and declares no dependency, network, or telemetry change. The proposed unit and adopter-smoke layers are appropriate.

The executable scope is internally inconsistent. FR-5’s verification names `packages/provegate/test/content-templates.test.ts`, but that file is absent from both Implementation Scope and Conflict Surface. An implementing agent would have to violate the declared scope or stop for approval.

Verification rows are runnable and every FR has a row, so the mechanical Clarity gate passes. Nevertheless, the tests are described only by file-level intent and do not pin the disputed grammar cases or malformed-ledger policy.

FR-5 changes shipped method content without identifying its source-snapshot provenance. Referencing the current tasks template proves where the edit lands, not that the new method wording is licensed by the source snapshot.

### 4. Migration & Rollback

The blast radius is materially understated. Existing adopter and self-hosted task artifacts will be re-evaluated under a broader counter, and the consumer requires acceptance for any positive row count regardless of `Autonomous Close`.

There is no corpus-audit command, compatibility note, or migration guidance for artifacts that merged previously but will refuse after upgrade. The claim that self-hosted authors learned the working shape does not establish that all existing artifacts are unaffected.

No persistent data migration or deployment ordering is required. A code rollback should be a normal revert, but the PRD does not state the rollback trigger or how an adopter blocked by the stricter parser recovers.

### 5. Memory Inputs

- `operator-row-must-be-a-table-row`: strongly applicable and correctly selected.
- `notes-column-runs-commands`: applicable to FR-3’s column-scoped read.
- `metadata-declares-what-it-cannot-provide`: relevant, but not actually applied because FR-4 deliberately permits the absent asset to degrade silently.
- `assert-absent-needs-an-independent-cause`: relevant to an independently failing header fixture.
- `surface-set-without-its-predicate`: the reviewed disposition is reasonable; FR-4 adds a predicate rather than registering an input set.
- `exemption-marker-needs-no-prose`: correctly reviewed as non-applicable because no exemption grammar is added.
- `gate-run-resume-after-archive`: weakly relevant and effectively ceremonial; no resume path is targeted or changed.
- `strictness-added-during-extraction-is-a-behavior-change`: highly relevant, but the disposition understates the change by discussing prose only for operator-gated PRDs. The consumer makes the effect global.
- `evidence-pattern-satisfied-by-the-template`: correctly reviewed for FR-5.
- `a-rule-corrected-survives-where-it-is-restated`: relevant, though the required sweep should also cover compatibility and tests.

The provided passing lint establishes no mechanically enforced missing watch-overlap record. Independently, two active indexed records are materially relevant but undispositioned:

- `known-red-ledger-must-expire` directly governs FR-6’s KNOWN_RED deletion.
- `narrow-the-grammar-not-the-parser` directly challenges FR-1 and FR-3’s expansion of a hand-written Markdown reader without a closed grammar.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1 | Clarity | 15% | 6/10 | Mechanical Clarity gate passes, but FR-1, FR-3, and FR-4 still require design choices; FR-5’s test lies outside declared scope. |
| 2 | Completeness | 20% | 5/10 | Missing malformed-ledger rules, list-row boundaries, lifecycle enforcement, and global consumer policy. |
| 3 | Technical Depth | 25% | 5/10 | Correct root-cause evidence, but insufficient treatment of parser structure and downstream behavior. |
| 4 | Multi-Tenancy & Security | 20% | 8/10 | No tenant, route, query, network, or client/server surface; the operator-authorization invariant still needs broader regression coverage. |
| 5 | Scope & Testability | 10% | 6/10 | Runnable commands and useful smoke coverage, but incomplete negative fixtures and inconsistent test scope. |
| 6 | Migration & Rollback | 10% | 3/10 | Global behavior change has no artifact audit, adopter migration guidance, or explicit rollback trigger. |
| **Total** | **Weighted** |  | **5.7/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, or query path is added or changed.
- Contract cap: not tripped — no client→server payload is introduced.
- Lint cap: not tripped — the orchestrator reports `gate check PRD-040` passed.
- Repository method-content rule: unsatisfied — FR-5 changes a shipped template without source-snapshot traceability.

---

## Missing Pieces (to reach 10/10)

1. In `_prds/wip/prd-040-operator-gate-coherence.md`, §4 FR-1 and §6, replace “plain list item” with a closed row grammar: define top-level, non-empty list rows; state that checkbox rows count once; preserve `- (none)` as zero; and explicitly exclude blockquotes, nested bullets, wrapped continuations, fenced/commented content, and instructional prose. Require corresponding positive and negative cases in `packages/provegate/test/markdown.test.ts`.

2. In the same PRD, §4 FR-2/FR-3 and §7 Architecture, specify structural table parsing and malformed-ledger behavior. Require a unique normalized `Result` header; define missing/duplicate headers, short rows, multiple ledgers, and value casing; and state how malformed input is refused rather than silently counted as zero. Add each case to `packages/provegate/test/markdown.test.ts`.

3. In the same PRD, §4 FR-4 and §6, define the lifecycle invariant precisely: absence may be tolerated only during Phase 2, while the mandatory Phase 3→4 transition must refuse an `operator-gated` item whose generated task file is missing or has zero rows. Name the enforcing transition target and add an integration test proving the check runs after task generation without a manual rerun.

4. In the same PRD, §7 Migration & Compatibility, document that `packages/provegate/src/core/run/acceptance.ts::operatorGateOk` gates every positive count regardless of `Autonomous Close`. State whether that is intentional, add eligible and operator-gated regression cases, require an audit of existing task artifacts, provide adopter remediation, and define revert criteria.

5. In the same PRD, §8 Implementation Scope, Conflict Surface, and FR-5 Targets, add `packages/provegate/test/content-templates.test.ts`. In §10 References, add the exact `docs/research/provegate-bootstrap/source-snapshot/MANIFEST.md` entry and source artifact authorizing FR-5’s shipped wording.

6. In the same PRD, Memory Inputs, add dispositions for `known-red-ledger-must-expire` and `narrow-the-grammar-not-the-parser`. Rewrite the `metadata-declares-what-it-cannot-provide` disposition to match the chosen absent-task policy, and expand the strictness disposition to cover every artifact affected by `operatorGateOk`.

7. In the PRD header, revise the RM axis from 4 to 2 and the total from 4.00 to 3.70 unless the completed compatibility, grammar, and migration work supplies evidence for a safer rating.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| - | ---- | ----- | ------- | ----------- |
| 1 | 2026-08-07 | 5.7 | ITERATE | Initial independent assessment; verified all four measured counts and identified grammar, lifecycle, consumer-blast-radius, method-traceability, and migration gaps. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- [x] No push code path is introduced.
- [x] `packages/provegate` retains zero runtime dependencies, no telemetry, and no network calls.
- [ ] Method content is traceable to the source snapshot — FR-5 lacks an exact trace.
- [x] No ADR violation is declared or evident from the assessed scope.
- [x] No non-canonical status vocabulary is introduced.
- [x] The four §1 measurements agree with the shipped 0.3.0 source.
- [ ] The global acceptance-gate blast radius is specified and tested.
- [ ] Memory dispositions cover the active records governing grammar expansion and KNOWN_RED expiry.

---

## Verdict

ITERATE — fix the listed gaps and re-score. The PRD correctly diagnoses the shipped counts, but it does not yet define which Markdown rows are authoritative, how malformed ledgers fail, when the absent Phase-2 task artifact becomes mandatory, or how the global merge-gate behavior is migrated. The 5.7 score is below PASS, and FR-5 also lacks required method-content provenance.
