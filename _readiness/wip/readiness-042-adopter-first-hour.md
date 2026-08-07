# Readiness Assessment: PRD-042 — The Adopter's First Hour

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-042-adopter-first-hour.md` |
| Score                  | 7.7/10 |
| Verdict                | ITERATE |
| Iteration              | 2 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — supplied current `gate check PRD-042` result; scorer rerun reached read-only `_state/prds.json` refresh and failed with `EPERM` before lint execution |
| State Record           | pending — read-only sandbox |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | Score remains below 8 because the extended CLI grammar and one generated-template gate control are still underspecified. |
| Phase 6 (Audit)     | — | Re-score after the remaining contract and test gaps are closed. |

---

## Analysis

### 1. Technical Depth & Architecture

Most iteration-1 architecture findings are genuinely closed:

- FR-1 now derives the task destination from `dirs.artifacts.tasks` and the review destination from `dirs.reviewsDir`, requires unique ID resolution, contained `wx` creation, and byte-preserving refusal on an existing destination. These match the artifact conventions consumed by the state and review layers.
- FR-2 is now a seven-row closed resolver. Empty sources retain their token; unresolved tokens are retained, sorted, deduplicated, reported on stdout, and do not change exit code 0. A token the configuration knows nothing about therefore remains author work rather than becoming an implementation guess.
- `prd-ready.ts::lintPrd` invokes `lintMemoryContract` only when `config.memory.enabled` is true. In `chain.ts`, the universal Durable Artifacts gate does not parse Memory Inputs/Outputs, while the memory gates are conditional on the working or base policy. Absence is therefore legal when memory is genuinely off, and a branch cannot evade a base-enabled contract by switching it off.
- FR-4 now targets the actual diagnostic owner, `core/run/chain.ts::buildGateChain`. `review.ts` confirms that the consumer needs an `independent-review` row, a review path under `dirs.reviewsDir`, and a passed result.
- FR-5 is a closed alternation: raw `{{ID_PREFIX}}` or the escaped configured prefix. Foreign, malformed, absent, and competing anchors remain refusals, so rendered-template support is not specified as a wildcard heading search.
- FR-6 names both parity-managed documents, the root verifier, the order assertion, and the runnable `pnpm verify:quickstart-parity` command. The current verifier was run and passes its existing eight-command parity check; the PRD correctly requires extending it because the present implementation cannot detect prose order.

FR-1 still leaves a contract-defining choice open. It does not say whether the new artifact modes are exclusive with legacy creation, so forms such as `gate new slug --tasks PRD-001`, `--tasks` with `--class`, or extra positional arguments have no required outcome. It also says “existing PRD” without deciding whether a completed/deferred PRD may cause a new artifact under the wip task directory. Finally, “the PRD’s own slug” does not explicitly choose the parsed artifact basename—the identity used by artifact discovery—over possibly inconsistent header prose.

### 2. Edge Cases & Failure Modes

The principal write failures from iteration 1 are covered: zero and duplicate ID matches, conflicting artifact flags, existing destinations, containment, and exclusive creation all have specified outcomes.

Remaining cases are:

- Mixing either artifact flag with the legacy slug/class/template mode.
- Resolving an otherwise unique ID outside the configured wip lifecycle role.
- A PRD whose filename slug and `> **Slug**` metadata disagree.
- FR-2’s fallback “the summary artifact dir,” which is not stated as an exact configuration property.
- The unconditional success metric “Unsubstituted tokens in a new PRD: 0.” FR-2 deliberately retains a token when its source is empty or absent, so that metric is false for a supported success case. It should measure resolvable, non-empty-source tokens instead.
- An unchanged task template satisfying the independent-review ledger check. The Memory Input claims an instantiated-ledger regression, but the FR-4 verification row tests only the missing-task diagnostic. No binding test currently requires a freshly instantiated, unedited task template to fail Phase 6.

The local writer is containment-checked and exclusive, and no protected route, endpoint, query, authentication, tenant, or network surface is introduced.

### 3. Maintainability & DX

Targets, scope, conflict surface, and verification files now agree. The Clarity gate’s mechanical requirements all pass: every FR has concrete Targets, every FR maps to a runnable command, Open Questions is closed, DO NOT is present, and no live decision placeholder remains.

The Memory Input claims are not all equally bound:

- `quickstart-is-a-fixture`: relevant and adequately bound by the two-copy edit plus structural parity assertion.
- `derive-the-requirement-from-the-consumer`: improved substantially by the closed table, but the exact summary fallback remains unnamed and the empty-value success metric contradicts the resolver.
- `shipped-content-needs-a-delivery-gate`: relevant; instantiated-artifact assertions and `pnpm smoke:adopter` bind delivery rather than template-source inspection.
- `metadata-declares-what-it-cannot-provide`: relevant; memory-off success and memory-on failure are both specified.
- `assert-absent-needs-an-independent-cause`: relevant; the declared test starts with a template containing the sections and disables memory independently.
- `evidence-pattern-satisfied-by-the-template`: still open. The claimed instantiated-ledger regression is absent from §11.
- `strictness-added-during-extraction-is-a-behavior-change`: relevant and bound by the four FR-5 deny cases.
- `a-rule-corrected-survives-where-it-is-restated`: not fully applied because §2’s zero-token metric does not survive FR-2’s empty-value rule.
- `docs-are-a-wiring-surface`, `fixture-must-reach-production-shape`, `surface-set-without-its-predicate`, `narrow-the-grammar-not-the-parser`, and `gate-run-resume-after-archive`: their reviewed dispositions are reasonable.

No active indexed record with a `watch` overlapping an FR Target is missing. The direct overlaps are covered by `quickstart-is-a-fixture`, `docs-are-a-wiring-surface`, `fixture-must-reach-production-shape`, and `strictness-added-during-extraction-is-a-behavior-change`.

The value arithmetic is correct:

`0.25×3 + 0.25×5 + 0.20×2 + 0.15×5 + 0.15×2 = 3.45`.

MF 3, UI 5, and TL 2 remain credible. AR 5 is defensible for the CLI’s principal creation path and both first-touch documentation copies, although the comment’s claim that literally every adopter traverses both surfaces is stronger than the evidence. RM 2 is the correct correction for changes spanning CLI parsing, multiple artifact writers, token rendering, conditional structure, anchor validation, a runtime diagnostic, and parity-managed documentation.

### 4. Migration & Rollback

The same-change requirement for both QUICKSTART copies and their structural verifier is clear. Existing artifact refusal is non-destructive, and reverting the implementation would not rewrite already-created files.

The PRD still lacks an explicit rollback and compatibility contract. It should state that:

- Legacy `gate new <slug> [--class=X] [--template=path]` remains accepted byte-for-byte in behavior.
- Reverting the change leaves already-created task/review artifacts untouched.
- Reverting FR-3 does not retrofit Memory sections into existing PRDs.
- Package QUICKSTART and hosted docs must be released together.
- Mixed legacy/artifact-mode syntax is refused rather than silently reinterpreted.

### 5. Memory Inputs

No required watch-triggered record is missing. The code confirms the most important disposition: memory-disabled readiness and close paths accept absent Memory Inputs/Outputs, while a base-enabled contract cannot be escaped through a branch-local disable.

Two claimed applications remain unproven:

1. `evidence-pattern-satisfied-by-the-template` points to a Phase-6 assertion against an instantiated ledger, but §11 contains no such test.
2. `a-rule-corrected-survives-where-it-is-restated` claims the seven-token rule is consistent everywhere, while §2 still promises zero unresolved tokens in the supported empty-source case.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15% | 8/10 | Formal Clarity gate passes; mixed legacy/artifact syntax and PRD lifecycle eligibility remain undecided. |
| 2         | Completeness             | 20% | 7/10 | Major iteration-1 cases are covered, but the token metric conflicts with empty values and the instantiated-ledger negative control is absent. |
| 3         | Technical Depth          | 25% | 8/10 | Strong atomicity, containment, resolver, memory, anchor, and parity contracts; lifecycle and slug identity need closure. |
| 4         | Multi-Tenancy & Security | 20% | 9/10 | No protected or network surface; local writes are contained and exclusive, with deny coverage for loosened anchors. |
| 5         | Scope & Testability      | 10% | 8/10 | Scope and runnable checks now align, except for the claimed-but-missing template-placeholder control. |
| 6         | Migration & Rollback     | 10% | 5/10 | Same-change docs ordering is stated, but legacy compatibility and rollback consequences remain implicit. |
| **Total** | **Weighted**             | | **7.7/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, or query path is touched.
- Contract cap: not tripped — no client→server payload is introduced.
- Lint cap: not tripped — the supplied current `gate check PRD-042` result passes. The scorer’s rerun failed on read-only state refresh before lint execution.
- Method-content cap: not tripped — FR-4 changes a runtime diagnostic and FR-6 changes documentation. Neither moves a prompt, template, or schema byte; FR-1 consumes existing templates without modifying their source content.

---

## Missing Pieces (to reach 10/10)

1. **Iteration-1 MP-1 — OPEN.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-1, §6, and §11: retain the now-closed path, exact-ID, `wx`, containment, and existing-file requirements, and add the exact three-mode argument grammar. State that `gate new <slug> [--class=X] [--template=path]`, `gate new --tasks <ID>`, and `gate new --review <ID>` are mutually exclusive; refuse extra positional arguments and legacy-only flags in artifact modes. State whether only a PRD in `dirs.stateRoles.wip` is eligible, and require the destination slug to come from the resolved artifact basename. Replace the default-only Gherkin path with the configured expression or explicitly condition it on default config.

2. **Iteration-1 MP-2 — OPEN.** `_prds/wip/prd-042-adopter-first-hour.md`, §2 Success Metrics, §4 FR-2, §6, and §11: change the metric to “resolvable tokens with non-empty configured sources left unsubstituted: 0”; name the exact configuration property behind “the summary artifact dir”; and state that the seven table rows are the exclusive resolver set, while any other `{{TOKEN}}` remains unchanged, is reported once in the sorted unresolved line, and still exits 0.

3. **Iteration-1 MP-3 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-3, §6, §7, and §11: no further change required. The removal span is defined, the source-present/memory-off test supplies an independent cause, memory-on absence fails, and code inspection confirms disabled readiness and close paths accept absence while base-enabled policy fails closed.

4. **Iteration-1 MP-4 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-4, §8, Conflict Surface, and §11: no further change required. The target is now `core/run/chain.ts::buildGateChain`, `chain.test.ts` is scoped, and the expected path plus `Gate`, `Command / Check`, and `Result = passed` shape are named.

5. **Iteration-1 MP-5 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-5, §6, §7, and §11: no further change required. The raw/configured-prefix alternation is closed, regex escaping is explicit, wildcard matching is forbidden, and four deny shapes are required.

6. **Iteration-1 MP-6 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-6, §8, Conflict Surface, and §11: no further change required. The verifier is targeted and scoped, order is structural, and `pnpm verify:quickstart-parity` is runnable.

7. **Iteration-1 MP-7 — OPEN.** `_prds/wip/prd-042-adopter-first-hour.md`, §6, Memory Inputs, and §11: add a `packages/provegate/test/chain.test.ts` regression that passes the freshly instantiated, otherwise unedited tasks template into the real Phase-6 chain and proves its placeholder `independent-review` material cannot satisfy the ledger gate. Point `evidence-pattern-satisfied-by-the-template` to that exact test. Update the `a-rule-corrected-survives-where-it-is-restated` disposition after correcting §2’s empty-value metric.

8. **Iteration-1 MP-8 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, Value header and value-history comment: no further change required. The current `3.45 (MF/UI/TL/AR/RM: 3/5/2/5/2)` is arithmetically correct and RM 2 matches the regression surface.

9. **New iteration-2 gap — OPEN.** `_prds/wip/prd-042-adopter-first-hour.md`, §7 Technical Considerations and a new `### Migration & Rollback` subsection: state the legacy `gate new` compatibility guarantee, mixed-mode refusal, same-release requirement for both QUICKSTART copies, and exact revert behavior for already-created PRDs, task files, and review files.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.1 | ITERATE | Initial independent assessment; found open file/token/anchor contracts, wrong FR-4 target, insufficient parity proof, and overstated maintenance safety. |
| 2   | 2026-08-07 | 7.7 | ITERATE | Verified closures for atomic paths, seven-token resolution, memory-off/on behavior, FR-4 ownership, anchor strictness, parity order, and value scoring; mixed CLI modes, a stale token metric, missing instantiated-ledger control, and rollback remain open. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

| Check | Outcome |
| ----- | ------- |
| No push code path in CLI or CI | Satisfied; no push behavior is proposed. |
| Zero runtime dependencies in `packages/provegate` | Satisfied; Dependencies is `none`. |
| No telemetry or network calls | Satisfied by scope. |
| Method content traceable to source snapshot | Satisfied; no prompt/template/schema byte is modified. Runtime diagnostics and QUICKSTART prose are outside critical rule 4’s method-content classes. |
| ADRs remain binding | No ADR conflict identified. The closed token table is consistent with enumerated-token rendering. |
| Canonical `statusVocab` values only | No status-vocabulary change proposed. |
| Memory contract behavior | Verified in code: readiness and close memory readers are conditional; absent sections pass when memory is genuinely off, and base-enabled policy cannot be branch-disabled. |
| Value arithmetic | Correct at 3.45; AR 5 is defensible for the targeted first-touch surfaces and RM 2 is appropriate. |
| Security hard cap | Not tripped. |
| Contract hard cap | Not tripped. |
| Lint hard cap | Not tripped based on the supplied passing lint result. |

---

## Verdict

ITERATE — the major iteration-1 design defects are closed, but the PRD remains below the PASS threshold. Close the mixed CLI-mode/lifecycle contract, reconcile the empty-token metric, add the instantiated-task-template negative control, and state rollback compatibility before proceeding to Phase 3.
