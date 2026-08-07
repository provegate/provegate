# Readiness Assessment: PRD-042 — The Adopter's First Hour

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-042-adopter-first-hour.md` |
| Score                  | 8.1/10 |
| Verdict                | PASS |
| Iteration              | 6 |
| Model Tier (Execution) | high |
| Model Tier (Audit)     | high |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — `[check] ok — PRD-042 passes the readiness lint`; the normal wrapper first stopped on the read-only `_state/prds.json` write, then the same check passed with only that state write suppressed |
| State Record           | pending — read-only sandbox |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | high | The CLI grammar, template transformation, local file writes, phase-chain behavior, and parity-checked documentation span several contracts. |
| Phase 6 (Audit)     | high | Audit must verify parser symmetry, concrete task/review artifact wiring, anchor strictness, memory-off behavior, and both documentation copies. |

---

## Analysis

### 1. Technical Depth & Architecture

FR-1’s claimed iteration-6 changes are now present in the operative requirement, not merely the Changelog:

- The live FR contains exactly three productions.
- Artifact resolution is restricted to the configured wip role.
- The parsed artifact basename, not the editable heading, is authoritative for number and slug.
- The live FR contains eight refusal categories with exact `new.test.ts` titles.

This closes the principal iteration-5 grammar and identity finding. It is materially stronger than the current `runNew`, which selects the first positional argument and ignores additional positionals.

The existing-destination behavior is also specified: task and review destinations derive from configuration, writes are contained and `wx`-exclusive, and an existing destination remains byte-identical.

One part of iteration-5 MP-1 remains open. “Instantiate the shipped template” does not enumerate the concrete fields the task and review artifacts receive. The current templates contain PRD/readiness links, dates, review-ledger paths, review H1 identity, and review PRD metadata. A conforming implementation could copy those templates, perform only FR-2’s seven configuration substitutions, and leave `XXX`/`{short-name}` identity sites unresolved. The fresh-task Phase-6 negative test would still pass because that artifact is expected to fail, while the generated task would not name the generated review artifact. The PRD must distinguish author-fill placeholders from CLI-owned identity and path substitutions.

FR-2 is closed. The seven-token table is explicitly complete, gives sources and precedence, defines empty values, and states that unrecognized or unresolvable tokens remain in the artifact and appear once in the sorted unresolved-token report. The implementer cannot silently expand the set.

FR-3 is closed against every relevant reader:

- `prd-ready.ts::lintPrd` calls `lintMemoryContract` only when `config.memory.enabled` is true.
- `chain.ts::buildGateChain` builds Memory Inputs/Outputs close gates only when memory is enabled, while also failing closed if the base policy remains enabled and the branch attempts to disable it.
- The always-on Durable Artifacts gate is separate and remains valid without Memory Inputs or Memory Outputs.

FR-4 is closed. The current message is owned by `chain.ts::buildGateChain`. `review.ts` confirms the consumer requires an `independent-review` task row naming a configured review path and a review artifact whose PRD metadata matches the expected id.

FR-5 remains a closed relaxation, not an intention. Exactly two id-heading forms may pass: the literal token form and the exactly escaped configured prefix. The only newly admitted document is therefore a rendered template carrying the repository’s configured prefix. Foreign, malformed, absent, and competing anchors remain explicit refusals; wildcard heading matching remains forbidden.

FR-6 names both quickstart copies, their required ordering, and the runnable parity check. `pnpm verify:quickstart-parity` currently passes and reports eight equal commands, while its current implementation confirms why the new structural assertion is needed: it compares command sequences but does not inspect the manifest/close heading order.

The iteration-5 target-ownership finding remains. `cli.ts::usage` is still attached to FR-1 even though FR-6 owns help discoverability, and FR-6’s Targets omit both that production symbol and its named `cli.test.ts` regression.

### 2. Edge Cases & Failure Modes

The three-production grammar and eight-row refusal table now bind the major malformed inputs:

- both artifact flags;
- positional input beside artifact mode;
- legacy-only options beside artifact mode;
- repeated artifact flags;
- missing artifact id;
- bare `gate new`;
- zero wip matches;
- multiple wip matches.

The production grammar also makes exact positional cardinality normative even though not every symmetric spelling has its own named test. Phase 3 should ensure the test bodies exercise both artifact modes where the refusal is mode-independent.

A stale restatement was created by this round’s fix. §6 still names only both flags, zero matches, and two matches; §11 still describes “three refusals.” Those lines no longer describe FR-1’s eight-refusal contract. The production requirement is unambiguous, so this does not reverse the closure, but the verification ledger must be synchronized before implementation.

FR-2 covers empty configured values and unknown tokens without converting author work into a failed command. FR-3 includes both directions of the memory policy test. FR-5 retains four deny shapes. FR-6 correctly requires both documentation copies to move together.

The local write surface is appropriately bounded: no overwrite, workspace containment, configured directories, and configured wip role. There is no network, tenant, permission, or remote-state behavior.

### 3. Maintainability & DX

The mechanical Clarity gate passes:

- all six FRs have Targets;
- each FR has a runnable §11 command;
- DO NOT exists;
- Open Questions is empty;
- no live decision placeholder appears.

Clarity is below bulletproof because artifact-internal substitutions remain implicit and FR-6 does not own all of its implementation/test targets.

The value arithmetic was recomputed. The historical header requested for review is correct arithmetically:

`0.25×3 + 0.25×5 + 0.20×2 + 0.15×5 + 0.15×4 = 3.75`.

Its axes are not all credible:

- MF 3: reasonable; this improves delivery of the method without changing its governing semantics.
- UI 5: reasonable; the defects occur on the primary first-use path.
- TL 2: reasonable; this is bounded adopter-path work rather than a broad architectural unlock.
- AR 5: defensible now that CLI help and both first-touch quickstarts are included.
- RM 4: overstated for new CLI grammar, multiple artifact writers, a loosened drift detector, lint-sensitive section removal, phase-chain diagnostics, public docs, and a root verifier.

The live header, `3.45 (3/5/2/5/2)`, also recomputes correctly and uses the more credible RM 2.

Critical rule 4 is satisfied:

- FR-4 changes a runtime diagnostic, not a prompt, template, or schema.
- FR-6 changes QUICKSTART and practices documentation, not governed method-source bytes.
- FR-1 consumes existing shipped templates and does not authorize editing their source bytes.

### 4. Migration & Rollback

Legacy `gate new <slug>` retains its output contract; the new artifact modes are additive. The explicit grammar now makes mixed-mode compatibility executable rather than implied.

Reverting removes the convenience writers but leaves already-created artifacts intact. The unchanged phase-6 consumer continues reading those files. A PRD created without Memory sections remains valid while memory is disabled and fails if the repository later enables the contract.

Both quickstart copies are required in the same release, and FR-5 correctly defines a deny-test failure as the rollback trigger.

The remaining migration watch item is artifact coherence: task links, review metadata, and the ledger’s review path need an explicit substitution table so an artifact produced before a revert remains usable by the unchanged consumer.

### 5. Memory Inputs

Each declared disposition was challenged:

- `quickstart-is-a-fixture`: relevant and correctly applied to both watched quickstarts and the structural verifier.
- `derive-the-requirement-from-the-consumer`: relevant; FR-2 uses a closed, sourced set rather than leaving token discovery to implementation.
- `shipped-content-needs-a-delivery-gate`: relevant; instantiated outputs and `pnpm smoke:adopter` measure delivered behavior.
- `metadata-declares-what-it-cannot-provide`: relevant; the memory-off/on pair prevents configuration from declaring a contract it does not enforce.
- `assert-absent-needs-an-independent-cause`: relevant; the source template retains Memory sections while configuration independently causes their omission.
- `evidence-pattern-satisfied-by-the-template`: relevant; the exact real-chain test requires an unedited generated task artifact to fail.
- `strictness-added-during-extraction-is-a-behavior-change`: relevant; FR-5 pins both the closed positive alternation and the shapes that must continue to refuse.
- `a-rule-corrected-survives-where-it-is-restated`: relevant but incompletely applied this round. FR-1 was corrected, while §6 and §11 retained the three-refusal description.
- `docs-are-a-wiring-surface`: relevant to the practices document; no check registration is added or removed.
- `fixture-must-reach-production-shape`: relevant; tests must enter through `runNew` using actual CLI argument shapes.
- `surface-set-without-its-predicate`: correctly reviewed; no `core/gates/**` production target changes.
- `narrow-the-grammar-not-the-parser`: relevant to FR-3’s deliberately restricted column-zero heading grammar.
- `gate-run-resume-after-archive`: relevant through `core/run/**`; no archive or resume behavior changes.

No active indexed record with a `watch` overlapping a current declared FR Target is missing. Direct overlaps remain covered for both quickstarts, `_prds/**`, `core/run/**`, `cli.ts`, and `practices/**`.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15% | 8/10 | Grammar and identity are now executable; artifact-internal substitutions and FR-6 target ownership remain implicit. |
| 2         | Completeness             | 20% | 7/10 | Core behaviors are covered, but generated task/review identity sites are not enumerated and two restatements remain stale. |
| 3         | Technical Depth          | 25% | 8/10 | Strong treatment of configuration, memory policy, drift detection, consumer behavior, and rollback. |
| 4         | Multi-Tenancy & Security | 20% | 9/10 | No tenant/auth/network surface; local writes are contained and exclusive. |
| 5         | Scope & Testability      | 10% | 9/10 | Eight refusal titles and cross-surface tests are named; §6/§11 need synchronization. |
| 6         | Migration & Rollback     | 10% | 8/10 | Compatibility and rollback are sound; generated artifact coherence should be made explicit. |
| **Total** | **Weighted**             | | **8.1/10** | **PASS** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, query, auth, permission, or tenant surface is touched.
- Contract cap: not tripped — no client→server payload is introduced.
- Lint cap: not tripped — `gate check PRD-042` returned PASS with only the read-only state-snapshot write suppressed.
- Method-content cap: not tripped — no prompt, template, or schema source byte is changed.

---

## Missing Pieces (to reach 10/10)

1. **Iteration-1 MP-1 — OPEN, partially closed.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-1, §6, and §11: the three-production grammar, configured-wip/basename identity rule, and eight named refusals are now present and verified. Add a closed artifact-substitution table stating which task/review template sites receive the id, slug, dates, PRD/readiness references, review PRD metadata, and concrete review-ledger path, and which author-fill placeholders intentionally remain.

2. **Iteration-1 MP-2 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-2 and §11: exact change required: none. The seven-row additional-pass set, precedence, empty-value rule, and unknown-token behavior are closed.

3. **Iteration-1 MP-3 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-3 and §11: exact change required: none. `prd-ready.ts` and `chain.ts` accept absence only while memory is genuinely disabled.

4. **Iteration-1 MP-4 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-4 and §11: exact change required: none. `chain.ts::buildGateChain` is the correct owner and the consumer row shape is specified.

5. **Iteration-1 MP-5 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-5 and §7: exact change required: none. The admitted anchors form a closed two-member alternation with four deny shapes.

6. **Iteration-1 MP-6 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-6, §7, and §11: exact change required: none for parity behavior. Both copies, the ordering requirement, and `pnpm verify:quickstart-parity` are named.

7. **Iteration-1 MP-7 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §6, Memory Inputs, and §11: exact change required: none. The real-chain test requires failure of an unedited generated task artifact.

8. **Iteration-1 MP-8 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, Value header and value-history comment: exact change required: none. Current 3.45 is correct; historical 3.75 is arithmetically correct but RM 4 is not credible.

9. **Iteration-2 MP-9 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §7 Migration & Rollback: exact change required: none. The older writer and unchanged phase-6 consumer are correctly distinguished, and deny-test failure is the rollback trigger.

10. **Iteration-3 MP-10 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-6 and §11: exact change required: none. The NEXT_STEPS file and exact sequential-heading test are present.

11. **Iteration-4 MP-11 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-6, §6, §8, Conflict Surface, and §11: exact change required: none. Help and both first-touch quickstarts now own discoverability behavior and a named content assertion.

12. **Iteration-5 MP-12 — OPEN.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-1 and FR-6 Targets: remove `packages/provegate/src/cli.ts::usage` from FR-1 and add `packages/provegate/src/cli.ts::usage` plus `packages/provegate/test/cli.test.ts` to FR-6, so the requirement owning discoverability names its implementation and regression.

13. **New iteration-6 MP-13 — OPEN.** `_prds/wip/prd-042-adopter-first-hour.md`, §6 Acceptance Criteria and §11 Verification Commands: replace the three-refusal restatements with all eight FR-1 refusal categories and their exact `new.test.ts` titles, keeping the corrected FR, acceptance criteria, and executable ledger synchronized.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.1 | ITERATE | Found open file/token/anchor contracts, wrong FR-4 ownership, weak parity proof, and overstated maintenance safety. |
| 2   | 2026-08-07 | 7.7 | ITERATE | Closed paths, resolver sources, memory behavior, FR-4 ownership, anchor strictness, parity order, and value scoring; requested grammar, regression, and rollback closure. |
| 3   | 2026-08-07 | 7.7 | ITERATE | Found the claimed grammar absent, token rule conflicting with existing anchors, stale regression provenance, and inverted rollback trigger. |
| 4   | 2026-08-07 | 7.9 | ITERATE | Closed additional-pass boundaries, regression provenance, rollback wording, and NEXT_STEPS assertion; FR-1 and discoverability remained incomplete. |
| 5   | 2026-08-07 | 7.9 | ITERATE | Discoverability behavior was specified, but the live FR still lacked the claimed grammar, identity rule, and refusal table. |
| 6   | 2026-08-07 | 8.1 | PASS | Verified the grammar, basename authority, configured-wip lookup, and eight refusal titles in the live FR; retained artifact-substitution and target-ownership watch items and found stale three-refusal restatements in §6/§11. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

| Check | Outcome |
| ----- | ------- |
| No push code path in CLI or CI | Satisfied; no push behavior is proposed. |
| Zero runtime dependencies in `packages/provegate` | Satisfied; Dependencies is `none`. |
| No telemetry or network calls | Satisfied by scope. |
| Method content traceable to source snapshot | Satisfied; runtime diagnostics and documentation are outside the prompt/template/schema byte rule, and existing templates are consumed without modification. |
| ADRs remain binding | Satisfied; FR-2 remains an enumerated substitution pass rather than a template language. |
| Canonical `statusVocab` values only | No vocabulary change is proposed. |
| Memory contract behavior | Satisfied; readiness and Phase 7 accept absence only when memory is disabled and fail closed when base policy remains enabled. |
| Value arithmetic | Current 3.45 and historical 3.75 recompute correctly; AR 5 is defensible, RM 4 is not. |
| Security hard cap | Not tripped. |
| Contract hard cap | Not tripped. |
| Lint hard cap | Not tripped. |
| Method-content hard cap | Not tripped. |

---

## Verdict

PASS — PRD-042 scores 8.1/10 with no hard cap tripped. The iteration-5 central finding is genuinely closed in the live FR: the grammar, configured-wip/basename identity rule, and eight named refusals are present. Proceed to Phase 3 with MP-1’s artifact-substitution table, MP-12’s FR-6 target correction, and MP-13’s §6/§11 synchronization treated as binding watch items.
