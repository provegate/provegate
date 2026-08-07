# Readiness Assessment: PRD-042 — The Adopter's First Hour

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-042-adopter-first-hour.md` |
| Score                  | 7.9/10 |
| Verdict                | ITERATE |
| Iteration              | 4 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — direct read-only `lintPrd` invocation returned `{"ok":true,"issues":[]}`; the CLI wrapper could not update `_state/prds.json` in the read-only sandbox |
| State Record           | pending — read-only sandbox |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | FR-1 still omits the claimed argument grammar and the substitutions required to make task/review artifacts consumable. |
| Phase 6 (Audit)     | — | Re-score after the remaining FR-1 and discoverability contracts are closed. |

---

## Analysis

### 1. Technical Depth & Architecture

The iteration-4 FR-2 change passes. Its seven rows are explicitly scoped to an additional pass after existing anchored substitutions. `{{ID_PREFIX}}`, the other legacy anchors, and their drift refusals remain outside the closed seven-token set. Sources, precedence, empty-value handling, unknown-token behavior, sorting, deduplication, and exit status are specified. A token outside the table stays unresolved rather than being left to implementer discretion.

FR-3 passes against the code. `prd-ready.ts::lintPrd` calls `lintMemoryContract` only when `config.memory.enabled` is true. In `chain.ts`, Memory Inputs/Outputs close gates are likewise conditional, while a base-enabled/branch-disabled configuration fails closed. The always-on Durable Artifacts gate is a separate contract and does not require the removed Memory sections. Absence is therefore accepted when memory is genuinely off and rejected when it is in force.

FR-4, FR-5, and FR-6 remain technically sound:

- FR-4 correctly targets `core/run/chain.ts::buildGateChain`, while `review.ts` confirms the consumer requires an `independent-review` row marked `passed` and naming a valid review artifact.
- FR-5 admits only the raw `{{ID_PREFIX}}` anchor or the escaped configured prefix. Foreign, malformed, absent, and competing anchors remain explicit refusals. The closed alternation does not permit an arbitrary rendered heading.
- FR-6 names both parity-checked documents, requires the manifest recipe to precede Close, and names the root parity command. The current verifier was run and passes its existing eight-command comparison; inspection confirms the new structural-order assertion is still necessary.

FR-1 remains incomplete despite the changelog claiming otherwise. The current FR contains no three-production grammar block. It states only that `--tasks` and `--review` are mutually exclusive. Section 11 still names only three refusals: both artifact modes, zero matches, and two matches. It has no coverage for the other advertised cases.

More importantly, the artifact-content contract from iteration 3 is still absent. The current templates contain sites the Phase-6 consumer cannot accept unchanged:

- `tasks-template.md` contains PRD/readiness links with `XXX-{short-name}`, date fields, and `_docs/reviews/review-XXX-{short-name}.md`.
- `review-template.md` contains `{{ID_PREFIX}}-XXX` in its heading and PRD metadata.
- `review.ts` cannot extract `review-XXX-{short-name}.md` as a concrete review path and cannot validate placeholder PRD metadata.

FR-2 preserves existing PRD-template anchors, but those anchors do not define how the new task and review modes fill these different template shapes. An implementing agent must still invent that contract.

The destination naming itself is mostly precise: it uses the configured task directory, configured wip role, configured prefix, configured id width, and configured review directory; `wx` refusal on an existing destination is explicit. What remains unspecified is whether artifact-basename identity or possibly inconsistent PRD metadata supplies the slug, and whether completed/deferred PRDs are eligible.

### 2. Edge Cases & Failure Modes

The following now pass plainly:

- FR-2’s additional-pass boundary.
- The template-evidence regression reference and exact test title.
- The corrected rollback signal.
- The NEXT_STEPS numbered-heading assertion.
- Existing-destination refusal and byte preservation.
- Zero/multiple PRD match refusals.
- Memory-off success and memory-on failure.
- All four FR-5 deny shapes.

The six claimed FR-1 refusals are not present in the live requirement. The current document does not refuse, with a named test apiece:

- both artifact flags together;
- a slug or extra positional beside an artifact flag;
- `--class` beside an artifact flag;
- `--template` beside an artifact flag;
- a repeated artifact flag;
- an artifact flag without an id;
- neither a slug nor an artifact flag.

The changelog is not evidence of those rules. Current `cli.ts::runNew` selects the first positional argument and silently ignores extras, making the absent grammar consequential.

The new modes are also undiscoverable as specified. `cli.ts::usage` advertises only `gate new <slug> [--class=X] [--template=path]`. Both quickstarts still tell adopters to create the task through the Phase-3 prompt and the review from the template; neither teaches `gate new --tasks` or `gate new --review`. That leaves the “first hour” user following the old manual path after the convenience ships.

### 3. Maintainability & DX

The mechanical Clarity checklist passes: every FR has concrete Targets, each FR maps to a runnable command, DO NOT exists, Open Questions is empty, and no live decision placeholders occur. Clarity cannot exceed 7 because FR-1’s actual grammar and artifact substitutions remain unspecified.

The requested historical value header, `3.75 (MF/UI/TL/AR/RM: 3/5/2/5/4)`, is arithmetically correct:

`0.25×3 + 0.25×5 + 0.20×2 + 0.15×5 + 0.15×4 = 3.75`.

It is not the current header. The current file declares `3.45 (3/5/2/5/2)`, which also recomputes correctly. RM 4 was not credible for changes spanning CLI parsing, multiple artifact writers, drift detection, lint-sensitive document structure, Phase-6 diagnostics, a root verifier, and public documentation; current RM 2 is credible. MF 3, UI 5, and TL 2 are reasonable. AR 5 is only defensible if the new modes are exposed on first-touch surfaces; without the help/quickstart update, maximum reach is overstated.

No method-content provenance cap is triggered:

- FR-4 changes a runtime diagnostic, not a prompt, template, or schema.
- FR-6 changes QUICKSTART and practices documentation, outside critical rule 4’s prompt/template/schema classes.
- FR-1 consumes existing templates but does not authorize changing their source bytes.

The enumerated-token approach remains consistent with ADR-0002.

### 4. Migration & Rollback

The iteration-4 rollback corrections pass. The current text now distinguishes the older `gate new`, which ignores already-created artifacts, from the unchanged Phase-6 chain, which continues consuming them. It correctly defines a deny test failing as the rollback trigger. Both quickstart copies are required to ship together.

Legacy positional mode is stated to retain its arguments, output path, and exit codes. The intended artifact-mode refusals are additive, but those refusals still need to appear in FR-1 itself before that compatibility claim is executable.

### 5. Memory Inputs

Each declared disposition was challenged:

- `quickstart-is-a-fixture`: relevant and bound to the two-copy structural assertion.
- `derive-the-requirement-from-the-consumer`: relevant; FR-2 now provides an enumerated, source-specific set rather than leaving discovery to the implementer.
- `shipped-content-needs-a-delivery-gate`: relevant; instantiated-output tests and adopter smoke cover delivered behavior.
- `metadata-declares-what-it-cannot-provide`: relevant; the memory-off/on pair closes the capability-to-policy loop.
- `assert-absent-needs-an-independent-cause`: relevant; the source template retains the sections while configuration independently causes their removal.
- `evidence-pattern-satisfied-by-the-template`: now correctly points to the FR-1 row and exact real-chain test title. CLOSED.
- `strictness-added-during-extraction-is-a-behavior-change`: relevant and bound by the four FR-5 deny cases.
- `a-rule-corrected-survives-where-it-is-restated`: not successfully applied. The changelog says the grammar block and six refusals exist, while FR-1, §6, and §11 do not contain them.
- `docs-are-a-wiring-surface`: relevant to NEXT_STEPS; the named heading test now binds the correction.
- `fixture-must-reach-production-shape`: relevant; tests must enter through the CLI argument surface.
- `surface-set-without-its-predicate`: reasonably reviewed; no `core/gates/**` file is a declared FR Target.
- `narrow-the-grammar-not-the-parser`: relevant; FR-3 uses the existing column-zero heading grammar.
- `gate-run-resume-after-archive`: relevant watch overlap with `core/run/**`; no resume/archive behavior changes.

No active indexed record whose `watch` overlaps a declared FR Target is missing. Direct overlaps are covered by `quickstart-is-a-fixture`, `docs-are-a-wiring-surface`, `fixture-must-reach-production-shape`, `strictness-added-during-extraction-is-a-behavior-change`, and `gate-run-resume-after-archive`.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15% | 7/10 | Formal gate passes, but the claimed argument grammar is absent and task/review substitutions remain undefined. |
| 2         | Completeness             | 20% | 7/10 | Most prior gaps closed; lifecycle identity, template contents, six refusals, and user discovery remain incomplete. |
| 3         | Technical Depth          | 25% | 8/10 | Strong token, memory, anchor, parity, and rollback treatment; FR-1 still stops at destination paths rather than consumable artifacts. |
| 4         | Multi-Tenancy & Security | 20% | 9/10 | No protected/network surface; local writes are contained, exclusive, and refusal-oriented. |
| 5         | Scope & Testability      | 10% | 8/10 | Runnable surfaces exist, but the six advertised refusal tests and discoverability assertions are absent. |
| 6         | Migration & Rollback     | 10% | 8/10 | Revert consumer behavior, same-release docs, and deny-test trigger are now correct; the compatibility claim still references missing FR-1 refusals. |
| **Total** | **Weighted**             | | **7.9/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, query path, auth, permission, or tenant surface is touched.
- Contract cap: not tripped — no client→server payload is introduced.
- Lint cap: not tripped — the current PRD returned `ok: true` from the exported readiness lint.
- Method-content cap: not tripped — no prompt, template, or schema source byte is changed.

---

## Missing Pieces (to reach 10/10)

1. **Iteration-1 MP-1 — OPEN.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-1, §6, §7 Migration & Rollback, and §11: add the actual three-production grammar block; enumerate all six refusal categories in the live FR; give each a named `packages/provegate/test/new.test.ts` test. State that the parsed PRD artifact basename is authoritative for number and slug, restrict resolution to the configured wip role or explicitly justify other lifecycle states, and enumerate the task/review title, link, date, PRD-metadata, and review-ledger-path substitutions required to produce artifacts the Phase-6 consumer accepts.

2. **Iteration-1 MP-2 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-2, §6, §7, and §11: no further change required. The live text scopes the closed seven-token table to an additional pass and explicitly preserves `{{ID_PREFIX}}` and every existing anchored substitution.

3. **Iteration-1 MP-3 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-3, §6, §7, and §11: no further change required. `prd-ready.ts` and `chain.ts` accept absent Memory sections only when the contract is off and fail closed when it is enabled or inherited from base.

4. **Iteration-1 MP-4 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-4, §6, Conflict Surface, and §11: no further change required. The diagnostic owner, configured task path, required ledger columns, and chain-test surface are correctly named.

5. **Iteration-1 MP-5 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-5, §6, §7, and §11: no further change required. The two admitted anchors and four denied shapes form a closed contract.

6. **Iteration-1 MP-6 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-6, §7, §8, and §11: no further quickstart-parity change required. Both copies, structural ordering, root verifier, and runnable command are specified.

7. **Iteration-1 MP-7 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §6, Memory Inputs, and §11: no further change required. The disposition now names the actual FR-1 row and exact test title, `"an unedited instantiated tasks template fails the Phase-6 gate"`.

8. **Iteration-1 MP-8 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, Value header and value-history comment: no arithmetic change required. Current 3.45 with RM 2 is correct; historical 3.75 with RM 4 was arithmetically correct but substantively overstated.

9. **Iteration-2 MP-9 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §7 Migration & Rollback: no further change required. The older `gate new` and Phase-6 consumer are correctly distinguished, and a deny test failing is correctly defined as the rollback trigger.

10. **Iteration-3 MP-10 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-6 and §11: no further change required. The file, runnable command, and exact test title for sequential NEXT_STEPS headings are present.

11. **New iteration-4 gap — OPEN.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-1/FR-6, §6, §8, Conflict Surface, and §11: add `packages/provegate/src/cli.ts::usage` as a target and require its `new` help line to advertise `--tasks` and `--review`; update both quickstarts to teach the new task/review creation commands at the points that currently prescribe manual template use; add a help/content assertion so the modes cannot ship undiscoverable. This closure is also required to sustain AR 5.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.1 | ITERATE | Initial assessment found open file/token/anchor contracts, the wrong FR-4 target, insufficient parity proof, and overstated maintenance safety. |
| 2   | 2026-08-07 | 7.7 | ITERATE | Closed atomic paths, resolver sources, memory behavior, FR-4 ownership, anchor strictness, parity order, and value scoring; requested grammar, regression, and rollback closure. |
| 3   | 2026-08-07 | 7.7 | ITERATE | Verified the resolver and migration additions; found the claimed grammar absent, the token rule conflicting with existing anchors, stale regression provenance, and an inverted rollback trigger. |
| 4   | 2026-08-07 | 7.9 | ITERATE | Closed the additional-pass boundary, regression provenance, rollback wording, and NEXT_STEPS assertion; the claimed FR-1 grammar is still changelog-only, artifact substitutions remain undefined, and the new modes are not exposed in help or quickstart. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

| Check | Outcome |
| ----- | ------- |
| No push code path in CLI or CI | Satisfied; no push behavior is proposed. |
| Zero runtime dependencies in `packages/provegate` | Satisfied; Dependencies is `none`. |
| No telemetry or network calls | Satisfied by scope. |
| Method content traceable to source snapshot | Satisfied; no prompt/template/schema source byte is modified. FR-4 runtime text and FR-6 documentation are outside critical rule 4’s method-content classes. |
| ADRs remain binding | Satisfied; enumerated substitutions align with ADR-0002, and memory-off behavior aligns with ADR-0001. |
| Canonical `statusVocab` values only | No vocabulary change is proposed. |
| Memory contract behavior | Verified: readiness and Phase-7 memory readers accept absence only when the contract is genuinely off; base-enabled policy fails closed. |
| Value arithmetic | Current 3.45 is correct. RM 2 is credible; historical RM 4 is not. AR 5 requires the missing discoverability work. |
| Security hard cap | Not tripped. |
| Contract hard cap | Not tripped. |
| Lint hard cap | Not tripped. |
| Method-content hard cap | Not tripped. |

---

## Verdict

ITERATE — iteration 4 closes four prior findings, but the central FR-1 closure is not in the current requirement: the grammar exists only in the changelog, its six refusals lack tests, and the task/review template substitutions needed by Phase 6 remain unspecified. The new modes must also be exposed in CLI help and first-touch documentation before this adopter-first feature is ready for Phase 3.
