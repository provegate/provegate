# Readiness Assessment: PRD-042 — The Adopter's First Hour

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-042-adopter-first-hour.md` |
| Score                  | 6.1/10 |
| Verdict                | ITERATE |
| Iteration              | 1 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — supplied `node packages/provegate/dist/cli.js check PRD-042` result; scorer rerun was blocked before lint by read-only `EPERM` while refreshing `_state/prds.json` |
| State Record           | pending — read-only sandbox |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | Score is below 8; several requirements leave contract-defining choices to the implementer. |
| Phase 6 (Audit)     | — | Re-score after the PRD closes its path, token, anchor, and test contracts. |

---

## Analysis

### 1. Technical Depth & Architecture

The measured adopter failures are credible, and the PRD correctly identifies `gate new` as the convergence point. The proposed implementation contract is not yet closed enough:

- `substituteAnchor` currently accepts only the literal `# {{ID_PREFIX}}-XXX: ` anchor. FR-5 says to accept “the substituted form” but does not define the exact second alternative. A permissive implementation could accept a foreign prefix, malformed identifier, or unrelated `*-XXX` heading and thereby weaken the drift detector.
- FR-1 does not specify the configured artifact mapping. State discovery requires `<tasks-prefix>-<NNN>-<slug>.md` under the configured tasks directory and lifecycle state; review extraction expects `review-<NNN>-<slug>.md` under `config.dirs.reviewsDir`. “Named as the runner expects” leaves this contract to code archaeology.
- Existing-file refusal is stated, but atomicity is not. The new writers should use contained, exclusive creation equivalent to `writeFileSync(..., { flag: "wx" })`; a check-then-write sequence would reintroduce an overwrite race.
- FR-2 does not define its resolver. `config.commands` supplies four values, `config.memory.root` supplies one, while `DOCS_ROOT` and `CMD_TEST_SCOPED` can exist under `prompts.values`. The PRD neither enumerates the mapping nor defines precedence, empty-value handling, token syntax, output ordering, or exit behavior when tokens remain.
- FR-3’s compatibility claim is correct for readiness: `lintPrd` enters `lintMemoryContract` only when `config.memory.enabled` is true, so absent Memory Inputs/Outputs are accepted when it is false. Phase-7 memory gates are likewise conditional; if memory remains enabled on the base and is disabled on the branch, the chain deliberately refuses the policy change. The universal Durable Artifacts gate remains active but does not require Memory Inputs/Outputs.
- FR-4 targets the wrong implementation file. The exact `no tasks file — independent-review ledger missing` message is emitted in `packages/provegate/src/core/run/chain.ts::buildGateChain`, not `core/gates/review.ts`.
- Scale and performance are negligible for these local artifacts. Consistency and path containment are the material architectural risks.

### 2. Edge Cases & Failure Modes

Unspecified cases include:

- Both `--tasks` and `--review` supplied, an option combined with the legacy slug/class form, malformed IDs, multiple artifacts sharing a number, and a PRD found outside `wip`.
- A missing configured template, missing destination parent, symlinked destination, invalid configured prefix, or one successful write followed by another failure.
- Duplicate tokens, tokens in comments, empty configured values, and unknown tokens. The PRD says unknown tokens are reported but does not say whether the file is still created, whether exit status is zero, or whether reporting goes to stdout or stderr.
- Memory sections appearing more than once or appearing inside fenced/commented examples. Section removal needs the same executable-heading semantics as the consumers or a deliberately closed template-only grammar.
- For FR-5, wrong rendered prefixes, malformed rendered headings, raw and rendered anchors both present, and a broad regex that silently accepts drift.
- The QUICKSTART verifier compares command sequences only inside `qs:scenario`; it does not compare prose or prove that the manifest explanation precedes Close. Both prose copies could remain differently ordered while the named check passes.

### 3. Maintainability & DX

The scope is understandable, but several maintenance claims overreach:

- FR-4’s wrong target would send implementation to a validator that does not own the diagnostic.
- `chain.test.ts` is named by FR-4 verification but is absent from Implementation Scope and Conflict Surface.
- The PRD describes seven initial unresolved tokens, while FR-2 enumerates only six derived values. `CMD_TEST_SCOPED` is the unexplained survivor. This directly contradicts the claimed application of `a-rule-corrected-survives-where-it-is-restated`.
- No runtime dependency, telemetry, network, push, schema, or status-vocabulary change is proposed.
- Critical rule 4 does not trip. FR-4 changes a runtime diagnostic, not a prompt/template/schema byte. FR-6 changes shipped documentation, not method content as defined by the rule. FR-1 consumes existing templates but does not propose editing their source bytes. Any later template-byte edit would require source-snapshot provenance and a revised scope.
- The declared value arithmetic is correct: `3.75`. MF 3, UI 5, and TL 2 are defensible. AR 5 is plausible because `gate new` and QUICKSTART are universal adopter surfaces, though the PRD supplies impact rather than reach evidence. RM 4 is not credible: this changes CLI parsing, three artifact paths, token rendering, conditional document structure, a drift detector, and parity-managed docs. RM 2 is more defensible, yielding `3.45` with the other axes unchanged.

### 4. Migration & Rollback

The QUICKSTART same-commit ordering constraint is stated, and `pnpm verify:quickstart-parity` is runnable and named. Its assertion is narrower than the requirement.

The PRD has no explicit rollback plan. A code revert is technically available, but rollback consequences are not described:

- PRDs created without memory sections remain valid only while memory is disabled.
- Already-created task/review files must not be removed automatically.
- Reverting token substitution restores the first-hour failure for newly generated artifacts but does not affect existing artifacts.
- The overloaded `gate new` argument grammar must remain backward compatible with `gate new <slug> [--class=X] [--template=path]`.
- Package and docs copies must ship together; otherwise adopters and hosted documentation teach different orderings.

### 5. Memory Inputs

No active indexed record with a `watch` overlapping a declared FR target is missing; the supplied passing readiness lint corroborates the formal watch-set result. The quality of several dispositions is weaker than their labels claim:

- `quickstart-is-a-fixture`: relevant and applied; FR-6 touches both watched files. The current parity check cannot prove the prose-order claim.
- `derive-the-requirement-from-the-consumer`: relevant but not yet applied. The record requires a closed `consumed ∩ declared` derivation; FR-2 leaves the consumed/config-resolvable set ambiguous.
- `shipped-content-needs-a-delivery-gate`: relevant. `pnpm smoke:adopter` is named, but FR-2’s row should explicitly require testing the delivered package artifact.
- `metadata-declares-what-it-cannot-provide`: relevant analogy for FR-3; the code confirms the disabled contract accepts absence.
- `assert-absent-needs-an-independent-cause`: relevant but overclaimed. No acceptance criterion requires a source template containing the sections, a memory-off cause, and a mutation/control proving the test fails without removal.
- `evidence-pattern-satisfied-by-the-template`: relevant to generated artifacts, but the verification text does not explicitly run readiness/review consumers against instantiated templates.
- `docs-are-a-wiring-surface`: directly triggered by `practices/NEXT_STEPS.md`. Its rationale covers the heading edit but does not evaluate the manifest instructions being reordered in QUICKSTART.
- `fixture-must-reach-production-shape`: directly triggered by `cli.ts` and appropriately requires live CLI argument shapes.
- `strictness-added-during-extraction-is-a-behavior-change`: directly triggered by `core/run/**`, but its rationale discusses only FR-5; FR-1 through FR-3 also change behavior in that watched surface.
- `surface-set-without-its-predicate`: formally triggered by the declared `review.ts` target, but that target is wrong. The diagnostic actually lives in `chain.ts`.
- `gate-run-resume-after-archive`: directly triggered and reasonably reviewed as non-applicable to pre-run artifact creation.
- `narrow-the-grammar-not-the-parser`: conceptually relevant, but FR-3 does not define the grammar used to remove sections.
- `a-rule-corrected-survives-where-it-is-restated`: not successfully applied. The seven-token evidence, six-value FR, success metric, references, and verification prose are not reconciled.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15% | 6/10 | Mechanical Clarity checklist is present, but FR-1, FR-2, and FR-5 are open contracts and FR-4 names the wrong owner. |
| 2         | Completeness             | 20% | 6/10 | Strong measured problem statement; missing option grammar, exact mappings, failure behavior, and consumer coverage. |
| 3         | Technical Depth          | 25% | 5/10 | Correct convergence point and memory-off observation, but insufficient design for atomic writers, section removal, and anchor strictness. |
| 4         | Multi-Tenancy & Security | 20% | 8/10 | No auth, tenant, route, query, or network surface; local path containment and symlink behavior remain unstated. |
| 5         | Scope & Testability      | 10% | 7/10 | Clear non-goals and runnable commands, but missing deny cases and inconsistent test/scope files. |
| 6         | Migration & Rollback     | 10% | 4/10 | Same-commit docs constraint exists; backward-compatible CLI grammar and rollback consequences are absent. |
| **Total** | **Weighted**             | | **6.1/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, or query path is touched.
- Contract cap: not tripped — no client→server payload is introduced.
- Lint cap: not tripped — supplied `gate check PRD-042` result passes. The scorer’s read-only rerun failed during state-file refresh before lint execution, not because of a PRD lint finding.
- Method-content cap: not tripped — no prompt/template/schema byte change is declared.

---

## Missing Pieces (to reach 10/10)

1. `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-1, §6, §7, and §11: define the exact mappings as configured tasks path `<tasks.dir>/<wip-role>/<tasks.prefix>-NNN-<PRD-slug>.md` and review path `<reviewsDir>/review-NNN-<PRD-slug>.md`; require unique exact-ID resolution, mutually exclusive modes, contained paths, atomic `wx` creation, and explicit tests for missing PRD and existing destination.

2. `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-2 and every token restatement in §1, §2, §10, and §11: add a closed token-to-source table and precedence rule. Include the four `config.commands` values, `config.memory.root`, and relevant `config.prompts.values` entries such as `DOCS_ROOT` and `CMD_TEST_SCOPED`; specify treatment of empty values, sorted unique unknown-token reporting, retained unknown tokens, output channel, and command exit status.

3. `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-3, §7, and §11: specify the section-removal grammar and add tests in `packages/provegate/test/prd-ready.test.ts` and `packages/provegate/test/chain.test.ts` proving absence passes when memory is off, fails when on, and cannot disable a base-enabled contract. Add those test files to Implementation Scope and Conflict Surface.

4. `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-4, §8, Conflict Surface, and §11: replace the implementation target with `packages/provegate/src/core/run/chain.ts::buildGateChain`; add `chain.ts` and `packages/provegate/test/chain.test.ts` to scope; state the literal diagnostic fields—configured expected task path and the required `independent-review` ledger row columns.

5. `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-5, §6, §7, and §11: define a closed two-member anchor alternation—literal `{{ID_PREFIX}}` or exactly `escapeRegExp(config.idPattern.prefix)`—and require deny tests for foreign prefixes, malformed headings, absent anchors, and duplicate competing anchors. Explicitly forbid wildcard prefix matching.

6. `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-6 and §11, plus `scripts/verify/verify-quickstart-parity.mjs`: state that the manifest heading and recipe must precede `## 5. Close` in each copy, add the verifier to Targets/Scope/Conflict Surface, and extend it with a structural order assertion; command-sequence equality alone does not prove the prose-order requirement.

7. `_prds/wip/prd-042-adopter-first-hour.md`, Memory Inputs: revise `derive-the-requirement-from-the-consumer`, `assert-absent-needs-an-independent-cause`, `evidence-pattern-satisfied-by-the-template`, `strictness-added-during-extraction-is-a-behavior-change`, and `a-rule-corrected-survives-where-it-is-restated` so their claimed applications become binding acceptance/tests. Reconcile the seven-token observation with FR-2’s six listed sources.

8. `_prds/wip/prd-042-adopter-first-hour.md`, Value header: change RM from 4 to 2 and recompute the header to `3.45 (MF/UI/TL/AR/RM: 3/5/2/5/2)`. RM 4 understates the regression surface; retain AR 5 only with the rationale that every adopter traverses both `gate new` and QUICKSTART.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.1 | ITERATE | Initial independent assessment; found open file/token/anchor contracts, wrong FR-4 target, insufficient parity proof, and overstated maintenance safety. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

| Check | Outcome |
| ----- | ------- |
| No push code path in CLI or CI | Satisfied by declared scope; no push behavior proposed. |
| Zero runtime dependencies in `packages/provegate` | Satisfied; dependencies explicitly `none`. |
| No telemetry or network calls | Satisfied by declared scope. |
| Method content traceable to source snapshot | Satisfied for current scope; FR-4 is runtime code and FR-6 is documentation, while no template/schema byte edit is declared. |
| ADRs remain binding | No ADR conflict identified. |
| Canonical `statusVocab` values only | No status-vocabulary change proposed. |
| Memory contract behavior | Code confirms absent Memory Inputs/Outputs are accepted when memory is disabled; base-enabled policy cannot be silently disabled. |
| Value arithmetic | Declared `3.75` arithmetic is correct; RM 4 is not substantively justified. |

---

## Verdict

ITERATE — fix the closed-contract gaps and re-score. The PRD has strong measured evidence and a coherent adopter problem, but an implementing agent would still have to invent the artifact naming algorithm, token resolver, rendered-anchor grammar, FR-4 ownership, and prose-order verification.
