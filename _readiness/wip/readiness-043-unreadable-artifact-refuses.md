# Readiness Assessment: PRD-043 — An Unreadable Task Artifact Refuses, It Never Counts Zero

## Quick Meta

| Field                  | Value                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| PRD                    | `_prds/wip/prd-043-unreadable-artifact-refuses.md`                                          |
| Score                  | 6.4/10                                                                                      |
| Verdict                | ITERATE                                                                                     |
| Iteration              | 1                                                                                           |
| Model Tier (Execution) | Do not assign — fix PRD first                                                               |
| Model Tier (Audit)     | —                                                                                           |
| Scored by              | Codex (gpt-5), fresh independent scorer                                                     |
| Self-scored            | no                                                                                          |
| Date                   | 2026-08-07                                                                                  |
| PRD Lint               | passed — supplied measured result; sandbox rerun stopped before lint on read-only state write |
| State Record           | pending — read-only assessment                                                              |

---

## Model Tier Recommendation

| Phase               | Tier                          | Rationale                                                                 |
| ------------------- | ----------------------------- | ------------------------------------------------------------------------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | Public-API compatibility, parser predicates, task-presence state, and sequencing remain underspecified. |
| Phase 6 (Audit)     | —                             | Re-score after the contract is completed.                                 |

---

## Analysis

### 1. Technical Depth & Architecture

The PRD identifies the correct defect and remains within Addendum A3. FR-1 through FR-3 implement Clause 5; FR-4’s contradiction warning derives from Clauses 2 and 4. It adds no unauthorized template prose and does not alter acceptance authorship.

The split is conceptually coherent:

- PRD-040 owns the accepted row grammar and enforces the declaration invariant at the chain and merge gate.
- PRD-043 owns unreadable-input diagnostics, propagation through state, the legacy numeric wrapper, and the Phase-2 reporting plumbing.
- The warning is reasonably located here because it requires the same new `lintPrd` input and `runCheck` output channel. PRD-040 can still enforce its invariant correctly without that advisory warning.

The executable contract is nevertheless incomplete.

FR-1 never defines “header-row candidate” or “separator-row candidate.” The intended two-line condition protects a lone prose line containing `|`, but it does not tell the implementer how many cells constitute a candidate, how boundary pipes affect classification, whether separator width must equal header width, or how adjacent prose/table blocks terminate. The measured header-without-separator and narrow-row cases are named, but the predicate that distinguishes them from prose remains open-ended.

`readOperatorHandoff` also returns only one `problem`, without specifying precedence or aggregation when a document has multiple malformed sections. The meaning of `count` when `problem` is non-null is similarly unspecified, even though that value is stored in state.

FR-4 has a state-model contradiction. It says `lintPrd` receives `{ count, problem }`, `runCheck` passes `found.record.task`, and no warning is emitted when the task artifact is absent. `StateRecord.task` always exists with zero-valued defaults, so that argument cannot distinguish “no task artifact” from “present, readable task with zero rows.” Production cannot implement the stated absence rule without an explicit presence signal or conditional omission by `runCheck`.

### 2. Edge Cases & Failure Modes

The desired outcomes for the measured shapes are directionally sound:

- A leading/trailing-pipe header with no separator should refuse.
- A row narrower than its header should refuse.
- A boundaryless header followed by a valid separator should refuse as an unsupported table form.
- A lone prose line containing `|` should remain ordinary prose.

The missing candidate grammar means those distinctions are not yet testable as a closed contract.

Other unclosed cases include:

- Which diagnostic wins when malformed handoff and ledger tables coexist.
- Whether duplicate tables or duplicate ledger sections return one problem or an aggregate.
- Whether width validation covers separator, header, and every data row consistently.
- What diagnostic identity direct API consumers can reliably catch.
- How Phase-2 lint distinguishes absent tasks from present zero-row tasks.

FR-5 is also underspecified. PRD-040’s audit is defined around count changes and acceptance changes, not PRD-043’s newly refusing population. PRD-043 does not state how the script is extended, whether its fingerprint changes, where acknowledgement is recorded, or who may override the default stop.

### 3. Maintainability & DX

Using `scanDocument().unreliable` follows the existing `artifacts.ts:641` fail-closed precedent. An optional `StateRecord.task.operatorHandoffProblem` preserves loading of older generated state.

The public compatibility story is not complete. `countOperatorHandoff` is exported from `core/state/index.ts`, used internally by `buildState`, and imported from an installed package by `scripts/adopter-smoke.sh`. Unknown external consumers must also be assumed because it is a public export. Keeping the TypeScript signature does not preserve runtime compatibility when inputs that returned a number now throw.

“Named diagnostic error” does not define whether this means `Error.name`, a concrete exported class, an error code, or a message prefix. Without a stable identity, adopters cannot safely distinguish malformed input from unrelated failures. The proposed minor changeset names artifact refusals and remedies, but does not explicitly promise to disclose the direct public-API throw or how callers migrate.

The source-only FR-2 unit test is insufficient for an installed public API already guarded by the adopter smoke.

### 4. Migration & Rollback

The pure-reader rollback is credible: reverting restores behavior and no on-disk migration is required. The optional state field is also backward-readable.

Deployment ordering is not adequately gated. “PRD-040 lands first” is currently a note, not a hard start condition. Both items modify `markdown.ts`, `acceptance.ts`, tests, the audit script, and changeset material. Starting PRD-043 against the old grammar risks implementing and testing a different reader contract.

FR-5 assumes PRD-040 delivers `scripts/audit-operator-rows.mjs`, but gives no preflight or fallback if the script or expected interface is absent. It also does not reconcile PRD-043’s new refusal population with PRD-040’s acknowledgement fingerprint.

The declared minor release is questionable until the public throw is specified and classified. This is a source-compatible but behavior-breaking change for direct callers.

The value arithmetic is correct:

`0.25×5 + 0.25×4 + 0.20×3 + 0.15×2 + 0.15×3 = 3.60`.

MF 5 is justified: Clause 5 is owner-approved canonical method content, so its missing enforcement is a method-fidelity gap rather than merely an ordinary parser bug. UI 4, TL 3, and AR 2 are defensible. RM 3 is not: a public numeric API begins throwing, a hand-rolled Markdown predicate expands, and four production modules change. RM should be 2, producing a corrected value of 3.45.

### 5. Memory Inputs

- `scope-out-the-layer-the-rounds-keep-hitting`: relevant and genuinely applied; the split follows the record’s demonstrated remedy.
- `assert-absent-needs-an-independent-cause`: only partially applicable. Independent refusal causes are valuable, but the planned assertions are primarily positive diagnostic assertions rather than assert-absent tests.
- `fixture-must-reach-production-shape`: strongly relevant. The CLI-level requirement is correct, but FR-4 still fails to model the production task-presence distinction.
- `metadata-declares-what-it-cannot-provide`: a useful analogy, though not a direct metadata case.
- `gate-run-resume-after-archive`: relevant through the `core/run/**` watch; placing the fatal check inside `operatorGateOk` covers resumed merge paths.
- `strictness-added-during-extraction-is-a-behavior-change`: central and not fully honored. The PRD acknowledges artifact refusals but understates the public exported function’s runtime break.
- `surface-set-without-its-predicate`: directly relevant through `core/gates/**`; its disposition is premature because the boundaryless-table candidate predicate remains undefined.
- `exemption-marker-needs-no-prose`: correctly reviewed; no exemption surface is introduced.
- `narrow-the-grammar-not-the-parser`: relevant in principle, but the PRD adds a new boundaryless-table recognition heuristic without closing its grammar.
- `a-rule-corrected-survives-where-it-is-restated`: relevant; the split is mostly consistent across PRD-040 and PRD-043.
- `state-model-before-mechanism`: not fully applied because absent-task and present-zero-task states remain indistinguishable at FR-4’s proposed interface.
- `two-parsers-wrong-together`: relevant; one reader avoids duplicated implementations, but behavioral fixtures still need to bind the undefined predicate to A3’s required outcomes.

The supplied passing lint indicates no active record with a `watch` overlapping a declared FR Target is mechanically missing. However, active record `operator-row-must-be-a-table-row` is substantively relevant and omitted: its central observation is that zero currently cannot distinguish empty from malformed, exactly the distinction PRD-043 changes.

Memory Outputs `none` is not adequately reasoned. PRD-040’s proposed learning concerns counting every permitted shape and the compatibility consequences of changing a count. PRD-043 introduces a distinct durable rule: an unreadable artifact needs a diagnostic result propagated through every consumer, while a legacy numeric API must refuse rather than invent a number. The deferred PRD-040 learning does not yet exist and its declared text does not capture that consumer contract. The current `none` is ceremonial.

---

## Scorecard

| #         | Dimension                | Weight | Score    | Notes |
| --------- | ------------------------ | ------ | -------- | ----- |
| 1         | Clarity                  | 15%    | 6/10     | Concrete targets and commands, but candidate grammar, diagnostic identity, task presence, and sequencing are unresolved. |
| 2         | Completeness             | 20%    | 5.5/10   | Public API migration, audit evolution, multi-problem behavior, and durable learning are incomplete. |
| 3         | Technical Depth          | 25%    | 6/10     | Correct architecture and scanner precedent; result invariants and parser boundaries remain open. |
| 4         | Multi-Tenancy & Security | 20%    | 9/10     | Local pure parsing/state change; no tenant, auth, network, route, or query surface. |
| 5         | Scope & Testability      | 10%    | 7/10     | The split is coherent, but several tests cannot be implemented deterministically from the stated contract. |
| 6         | Migration & Rollback     | 10%    | 4/10     | Rollback is sound; public throw, semver, hard ordering, and audit-script migration are not. |
| **Total** | **Weighted**             |        | **6.4/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, or query path is touched.
- Contract cap: not tripped — no new client-to-server payload is introduced.
- Lint cap: not tripped — supplied evidence records `gate check PRD-043` passing. The scorer’s rerun stopped before lint evaluation because the read-only sandbox denied `_state/prds.json` temporary-file creation.

---

## Missing Pieces (to reach 10/10)

1. In `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-1 and §6, define the exact header-candidate, separator-candidate, block-boundary, cell-splitting, and width-equality predicates for both boundary-piped and boundaryless lines. State diagnostic ordering or aggregation for multiple malformed sections and define whether `count` is zero, partial, or explicitly unusable when `problem` is non-null. Add matching cases to §11.

2. In `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-3/FR-4, make task presence part of the contract. Either add an explicit `present` field to the task-read input or require `runCheck` to pass `undefined` when `found.record.artifacts.tasks` is empty. Add `packages/provegate/src/core/state/build.ts::StateRecord` to FR-3’s Targets and state the exact sixth-parameter type.

3. In `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-2, §7 Migration & Compatibility, §8 Implementation Scope, Conflict Surface, and §11, define a stable public diagnostic identity—exported error class or documented error code—and explicitly state that unchanged source signature does not mean runtime compatibility. Require the changeset to name direct `countOperatorHandoff` callers and their migration, add `scripts/adopter-smoke.sh` to scope, and test the throw through the installed package export.

4. In `_prds/wip/prd-043-unreadable-artifact-refuses.md`, §4 FR-5 and §7 Dependencies, convert “PRD-040 lands first” into a hard Phase-3/Phase-4 precondition: PRD-040 must be merged and its grammar fixtures and `scripts/audit-operator-rows.mjs` interface must exist before work starts. Define the audit’s new refusal population, fingerprint/acknowledgement behavior, where the decision is recorded, and the authorized go/narrow/stop actor. State that a missing or incompatible script fails the preflight.

5. In `_prds/wip/prd-043-unreadable-artifact-refuses.md`, Memory Inputs, add at least a reviewed disposition for `operator-row-must-be-a-table-row`; revise the `surface-set-without-its-predicate`, `narrow-the-grammar-not-the-parser`, and `state-model-before-mechanism` dispositions after closing the predicate and presence-state gaps.

6. In `_prds/wip/prd-043-unreadable-artifact-refuses.md`, Memory Outputs, Durable Artifacts, and Conflict Surface, replace `none` with a learning such as `_brain/learnings/unreadable-input-needs-a-diagnostic-result.md`, covering diagnostic-result propagation, consumer refusal, and the legacy numeric wrapper’s compatibility consequence. Alternatively, explicitly declare and repeat an update to PRD-040’s learning after it exists.

7. In `_prds/wip/prd-043-unreadable-artifact-refuses.md`, the Value header and arithmetic comment, change RM from 3 to 2 and the total from 3.60 to 3.45 to reflect the public runtime throw and cross-module parser/gate blast radius.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.4   | ITERATE | Initial independent assessment; split judged coherent, but parser, public API, sequencing, audit, and memory contracts remain incomplete. |

---

## Project-Specific Checklist

- No push code path: compliant; the PRD adds none.
- Zero runtime dependencies: compliant; no dependency is proposed.
- No telemetry or network calls: compliant.
- Method-content traceability: compliant; behavior traces to owner-approved Addendum A3 Clauses 2, 4, and 5.
- Addendum boundary: compliant; no acceptance-authorship or template-default change is proposed.
- ADR compliance: no conflict identified.
- Canonical status vocabulary: unaffected.
- Public API compatibility: incomplete; runtime throwing behavior and adopter migration are underspecified.
- Value score: arithmetic passes as written, but RM is overrated and should be corrected to 2.

---

## Verdict

ITERATE — the split leaves PRD-040 and PRD-043 conceptually coherent, and no hard cap is tripped, but PRD-043 is below the 8.0 readiness threshold. Its boundaryless-table predicate, task-presence state, public exported throw, hard sequencing, audit evolution, and durable memory output must be specified before Phase 3.
