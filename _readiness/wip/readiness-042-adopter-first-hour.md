# Readiness Assessment: PRD-042 — The Adopter's First Hour

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-042-adopter-first-hour.md` |
| Score                  | 7.7/10 |
| Verdict                | ITERATE |
| Iteration              | 3 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — supplied current `node packages/provegate/dist/cli.js check PRD-042` result |
| State Record           | pending — read-only sandbox |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | The current document still leaves the CLI mode grammar and artifact-identity substitutions contradictory or unspecified. |
| Phase 6 (Audit)     | — | Re-score after the remaining contract inconsistencies are corrected. |

---

## Analysis

### 1. Technical Depth & Architecture

Several iteration-2 requirements are now genuinely closed:

- FR-2 uses the exact metric “resolvable tokens with a non-empty configured source,” names `config.dirs.artifacts.summary.dir`, and declares the seven rows closed.
- FR-3 agrees with the current readers. `prd-ready.ts::lintPrd` calls `lintMemoryContract` only when `config.memory.enabled` is true. `chain.ts` always reads Durable Artifacts but adds the Memory Inputs/Outputs gates only when memory is enabled; if the base policy is enabled and the branch disables it, a separate fail-closed gate is added. Absence is therefore accepted when memory is genuinely off and refused when it is in force.
- FR-4 targets the actual diagnostic owner, `core/run/chain.ts::buildGateChain`. `review.ts` confirms the required consumer shape: an `independent-review` ledger row, `passed`, naming a review artifact under `dirs.reviewsDir`.
- FR-5 is written as a closed raw-token/configured-prefix alternation. It explicitly retains refusals for foreign, malformed, absent, and competing anchors. A rendered configured prefix is the only newly admitted shape.
- FR-6 names the two documents, the root parity verifier, a structural order assertion, and the runnable `pnpm verify:quickstart-parity` command. The current verifier was run and passes its existing eight-command comparison; inspection confirms that it does not yet check prose order, so the required extension is real.

The claimed FR-1 grammar closure is not present in the current FR. FR-1 refuses only `--tasks` together with `--review`; it does not define the advertised three mutually exclusive productions or refuse:

- a slug with `--tasks` or `--review`;
- `--class` or `--template` in an artifact mode;
- extra positional arguments;
- repeated artifact flags or multiple IDs.

The existing `cli.ts::runNew` makes this consequential: it accepts only `--class` and `--template`, selects the first positional argument, and silently ignores extra positional arguments.

The artifact-content contract is also missing. The tasks template contains PRD/readiness links and `_docs/reviews/review-XXX-{short-name}.md`; the review template contains `{{ID_PREFIX}}-XXX` in its H1 and PRD metadata. `review.ts` cannot resolve the placeholder review path, and its schema cannot validate placeholder PRD metadata. FR-1 does not enumerate which identity/date/title sites the two new modes replace.

FR-2’s new CLOSED wording worsens that omission. It says a token outside its seven-row table is never substituted, but the existing positional path substitutes `{{ID_PREFIX}}`, and FR-5 depends on that behavior. Applied literally, FR-2 breaks the legacy behavior that §7 promises unchanged and leaves the new review artifact invalid. The seven-row set must be scoped to the additional configuration-value pass, not to all existing anchor and artifact-identity substitutions.

### 2. Edge Cases & Failure Modes

The following failure cases are adequately specified: zero or duplicate PRD matches, `--tasks` plus `--review`, contained `wx` writes, existing destinations left byte-identical, empty token sources, unknown-token reporting, memory-off/on behavior, and the four FR-5 deny shapes.

The remaining edge cases are material:

- “Existing PRD” still does not say whether only a PRD in `dirs.stateRoles.wip` is eligible. Creating a wip task for a completed or deferred PRD can create an orphaned lifecycle combination.
- “The PRD’s own slug” does not choose the parsed artifact basename over possibly inconsistent `Slug` metadata. The phase-6 lookup and review naming need one authoritative identity.
- The three-mode grammar is asserted only by the changelog and §7’s reference to “mixed-mode refusals in FR-1”; it is absent from FR-1, §6, and §11.
- The instantiated-template regression is now required in §6 and §11, and the current task template’s `pending` review row confirms the negative control is meaningful. However, its Memory Input points to an “FR-4 §11 row”; the actual row is labelled FR-1 and names no exact test title.
- FR-6 also requires correcting the duplicate `## 7` in `practices/NEXT_STEPS.md`, but its only verification command checks the quickstart pair. The current file demonstrably contains two `## 7` headings, and no specified assertion covers that requirement.

FR-5 does not leave the loosened anchor as an intention: the alternation and four refusals are closed. The implementation will nevertheless need to change the current `substituteAnchor`, which only tests for one match and replaces the first, so that competing matches are counted and refused as specified.

### 3. Maintainability & DX

The mechanical Clarity checklist passes: every FR has concrete Targets, every FR maps to a runnable command, DO NOT is present, Open Questions is empty, and no live decision placeholder appears. Clarity remains 7 because those formal surfaces contradict one another on substitutions and omit the actual three-mode grammar.

The value header in the current file is `3.45 (MF/UI/TL/AR/RM: 3/5/2/5/2)`, not the historical `3.75 (3/5/2/5/4)`:

`0.25×3 + 0.25×5 + 0.20×2 + 0.15×5 + 0.15×2 = 3.45`.

The historical RM 4 form also computes correctly to 3.75, but RM 4 is not credible. This change spans CLI parsing, multiple writers, anchored rendering, lint-sensitive document structure, a Phase-6 diagnostic, a root parity verifier, and two public documents. RM 2 is the defensible current score. AR 5 is defensible because the work changes the principal creation command and both first-touch documentation surfaces, although an adopter normally reads one quickstart copy rather than both. MF 3, UI 5, and TL 2 remain reasonable.

No method-content hard cap is triggered:

- FR-4 changes a runtime diagnostic, not a prompt, template, or schema byte.
- FR-6 changes QUICKSTART and practices documentation, not the source-snapshot-governed prompt/template/schema corpus.
- FR-1 consumes existing shipped templates but does not propose editing their source bytes.

### 4. Migration & Rollback

The new subsection closes most of the missing migration structure: it preserves legacy positional mode, requires both quickstart copies to land together, and says reverting does not remove already-created artifacts.

Two statements are incorrect:

- “The older CLI neither reads nor rejects” created task/review artifacts is false as written. The current Phase-6 chain reads the task ledger and `review.ts` validates its referenced review artifact. Only the older `gate new` command ignores those files.
- “If one [deny test] goes green after a change, revert” inverts the rollback signal. A correctly written deny test is green while the invalid template is refused and turns red when the anchor admits it.

The compatibility claim also cites “mixed-mode refusals in FR-1,” but those refusals are absent from FR-1. Rollback is therefore documented but not yet reliable enough to execute literally.

### 5. Memory Inputs

Each declared disposition was challenged:

- `quickstart-is-a-fixture`: relevant and bound by the two-copy structural assertion.
- `derive-the-requirement-from-the-consumer`: still open. The consuming code already reads `{{ID_PREFIX}}`, while the Phase-6 consumer also requires a concrete review path. FR-2’s seven-row CLOSED rule excludes both concerns.
- `shipped-content-needs-a-delivery-gate`: relevant; instantiated-artifact tests and `pnpm smoke:adopter` bind delivery rather than template-source inspection.
- `metadata-declares-what-it-cannot-provide`: relevant; memory-off success and memory-on failure are both specified.
- `assert-absent-needs-an-independent-cause`: relevant; the source template retains the sections while configuration independently disables memory.
- `evidence-pattern-satisfied-by-the-template`: substantively relevant, but its claimed “FR-4 §11 row” does not exist. The regression is labelled FR-1 and no exact test name is supplied.
- `strictness-added-during-extraction-is-a-behavior-change`: relevant and bound by the four FR-5 deny cases.
- `a-rule-corrected-survives-where-it-is-restated`: not successfully applied. The changelog and §7 claim a three-mode grammar absent from FR-1, and the CLOSED token wording conflicts with existing `{{ID_PREFIX}}` substitution.
- `docs-are-a-wiring-surface`: reasonable reviewed disposition for `practices/NEXT_STEPS.md`, but the heading fix lacks its own assertion.
- `fixture-must-reach-production-shape`: relevant; FR-1 is targeted through `cli.ts`.
- `surface-set-without-its-predicate`: reasonable; no `core/gates/**` file is an FR Target.
- `narrow-the-grammar-not-the-parser`: reasonable; FR-3 uses the existing column-zero heading boundary.
- `gate-run-resume-after-archive`: relevant watch overlap with `core/run/**`; no resume or archive behavior changes.

No active indexed record with a `watch` overlapping an FR Target is missing. The direct overlaps are covered by `quickstart-is-a-fixture`, `docs-are-a-wiring-surface`, `fixture-must-reach-production-shape`, `strictness-added-during-extraction-is-a-behavior-change`, `gate-run-resume-after-archive`, and `a-rule-corrected-survives-where-it-is-restated`.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15% | 7/10 | Formal Clarity gate passes, but the claimed three-mode grammar is absent and FR-1/FR-2 conflict on identity substitutions. |
| 2         | Completeness             | 20% | 7/10 | Major failure paths are covered; artifact-content identity, lifecycle eligibility, and the NEXT_STEPS assertion remain incomplete. |
| 3         | Technical Depth          | 25% | 8/10 | Strong write, memory, anchor, and parity treatment, offset by a resolver contract that contradicts current consumers. |
| 4         | Multi-Tenancy & Security | 20% | 9/10 | No protected or network surface; writes are local, contained, exclusive, and deny-tested. |
| 5         | Scope & Testability      | 10% | 8/10 | Most requirements have runnable checks; the instantiated-ledger reference is stale and NEXT_STEPS numbering is unverified. |
| 6         | Migration & Rollback     | 10% | 6/10 | Compatibility and artifact retention are present, but the older-CLI statement and rollback trigger are wrong. |
| **Total** | **Weighted**             | | **7.7/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, query path, auth, permission, or tenant surface is touched.
- Contract cap: not tripped — no client→server payload is introduced.
- Lint cap: not tripped — the supplied current `gate check PRD-042` result passes.
- Method-content cap: not tripped — no prompt, template, or schema source byte is changed.

---

## Missing Pieces (to reach 10/10)

1. **Iteration-1 MP-1 — OPEN.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-1, §6, §7 Migration & Rollback, and §11: add the three exact productions `gate new <slug> [--class=<class>] [--template=<path>]`, `gate new --tasks <ID>`, and `gate new --review <ID>`; state they are mutually exclusive; name refusals for a slug/extra positional argument, `--class`, `--template`, repeated artifact flags, multiple IDs, and mixed artifact flags. Limit resolution to the configured wip PRD role or explicitly justify another lifecycle policy. Make the parsed PRD artifact basename authoritative for number and slug. Enumerate the task/review template identity, link, date, and review-path sites each artifact mode substitutes.

2. **Iteration-1 MP-2 — OPEN.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-2, §6, §7 Architecture/Migration, and §11: retain the corrected metric, exact `DOCS_ROOT` fallback, empty-value behavior, and unknown reporting, but scope the seven-row CLOSED set to the additional configuration-value substitution pass. Explicitly preserve the existing PRD anchor substitutions, including `{{ID_PREFIX}}`, and state how FR-1 substitutes identity into the review template without violating the closed set.

3. **Iteration-1 MP-3 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-3, §6, §7, and §11: exact change required: none. Code inspection confirms absent Memory Inputs/Outputs are accepted when memory is disabled, rejected when enabled, and cannot bypass a base-enabled policy.

4. **Iteration-1 MP-4 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-4, §6, Conflict Surface, and §11: exact change required: none. The diagnostic owner, configured task path, ledger columns, and chain test surface are correctly named.

5. **Iteration-1 MP-5 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-5, §6, §7, and §11: exact change required: none. The two admitted anchors and four refused shapes form a closed contract, including competing-anchor refusal.

6. **Iteration-1 MP-6 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-6, §7, §8, and §11: exact change required for quickstart parity: none. Both copies, structural order, root verifier, and runnable parity command are specified.

7. **Iteration-1 MP-7 — OPEN.** `_prds/wip/prd-042-adopter-first-hour.md`, §6, Memory Inputs, and §11: retain the real-chain negative regression, but change the `evidence-pattern-satisfied-by-the-template` disposition from the nonexistent “FR-4 §11 row” to the actual FR-1 row and name the exact `chain.test.ts` test title that instantiates the unedited task template and expects Phase 6 to fail.

8. **Iteration-1 MP-8 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, Value header and value-history comment: exact change required: none. The current 3.45 arithmetic and RM 2 assessment are correct; the historical RM 4 was not credible.

9. **Iteration-2 MP-9 — OPEN.** `_prds/wip/prd-042-adopter-first-hour.md`, §7 Migration & Rollback: change “the older CLI neither reads nor rejects them” to distinguish the older `gate new`, which ignores the artifacts, from the existing Phase-6 chain, which continues to consume them. Change the rollback trigger to “if any deny test turns red/fails because an invalid anchor is admitted, revert.” Remove the reference to FR-1 mixed-mode refusals until those refusals are actually specified there.

10. **New iteration-3 gap — OPEN.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-6 and §11: add a runnable assertion, with file and test/check name, that fails while `packages/provegate/practices/NEXT_STEPS.md` contains duplicate numbered headings and passes after the second `## 7` becomes `## 8`.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.1 | ITERATE | Initial assessment found open file/token/anchor contracts, the wrong FR-4 target, insufficient parity proof, and overstated maintenance safety. |
| 2   | 2026-08-07 | 7.7 | ITERATE | Closed atomic paths, resolver sources, memory behavior, FR-4 ownership, anchor strictness, parity order, and value scoring; requested grammar, regression, and rollback closure. |
| 3   | 2026-08-07 | 7.7 | ITERATE | Verified the metric, fallback, real-chain regression requirement, and migration subsection; found the claimed grammar absent, the CLOSED token rule conflicting with `ID_PREFIX`, stale regression provenance, and an inverted rollback trigger. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

| Check | Outcome |
| ----- | ------- |
| No push code path in CLI or CI | Satisfied; no push behavior is proposed. |
| Zero runtime dependencies in `packages/provegate` | Satisfied; Dependencies is `none`. |
| No telemetry or network calls | Satisfied by scope. |
| Method content traceable to source snapshot | Satisfied; no prompt/template/schema source byte is modified. Runtime diagnostics and quickstart/practices prose are outside critical rule 4’s method-content classes. |
| ADRs remain binding | No ADR conflict identified; the intended enumerated-token approach is consistent with ADR-0002 once the seven-row set is scoped correctly. |
| Canonical `statusVocab` values only | No status-vocabulary change is proposed. |
| Memory contract behavior | Verified: readiness and close memory readers accept absence only when the contract is genuinely off; base-enabled policy fails closed. |
| Value arithmetic | Current 3.45 is correct. AR 5 is defensible; historical RM 4 is not, and current RM 2 is appropriate. |
| Security hard cap | Not tripped. |
| Contract hard cap | Not tripped. |
| Lint hard cap | Not tripped based on the supplied passing result. |
| Method-content hard cap | Not tripped. |

---

## Verdict

ITERATE — the item does not yet pass Phase 2. The current file does not contain the three-mode grammar claimed by its changelog, and the new seven-token CLOSED rule conflicts with existing `{{ID_PREFIX}}` rendering and the identity substitutions required by the new task/review modes. Correct those contracts, repair the stale regression reference and rollback wording, and add coverage for the NEXT_STEPS numbering requirement before re-scoring.
