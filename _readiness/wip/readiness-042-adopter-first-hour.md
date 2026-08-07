# Readiness Assessment: PRD-042 — The Adopter's First Hour

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-042-adopter-first-hour.md` |
| Score                  | 7.9/10 |
| Verdict                | ITERATE |
| Iteration              | 5 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | Codex (gpt-5), fresh independent scorer |
| Self-scored            | no |
| Date                   | 2026-08-07 |
| PRD Lint               | passed — read-only execution with only the state-snapshot write suppressed returned `[check] ok — PRD-042 passes the readiness lint`; the unmodified wrapper stopped on the sandbox’s `_state/prds.json` write |
| State Record           | pending — read-only sandbox |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | Do not assign — fix PRD first | The authoritative-id, argument-grammar, refusal-test, and artifact-substitution changes claimed for iteration 5 are still absent from the live requirements. |
| Phase 6 (Audit)     | — | Re-score after the live FR and verification table contain those contracts. |

---

## Analysis

### 1. Technical Depth & Architecture

The main iteration-5 claim did not land in the operative PRD. FR-1 still says the id resolves to “exactly one PRD”; it does not restrict lookup to `config.dirs.stateRoles.wip`, does not make the parsed artifact basename authoritative for number and slug, and does not say that edited H1 or Slug metadata is ignored. The only occurrence of that correction is the Changelog.

That omission matters against the current code. `new.ts` demonstrates that lifecycle directories and prefixes are configuration, while `cli.ts::runNew` currently takes the first positional argument and ignores additional positionals. An implementer still has to invent the three-production argument grammar and the identifier-resolution authority.

The artifact-content contract also remains absent. FR-1 specifies destination names but not the substitutions required inside the task and review templates. The iteration-4 evidence remains applicable: task artifacts contain PRD/readiness references, dates, and a review-ledger path, while review artifacts contain an H1 and PRD metadata. `review.ts` requires a concrete configured review path and validates the review’s PRD metadata against the expected id. FR-1 must enumerate how those sites become concrete and consumable.

FR-2 is closed. The seven-token table is explicitly the complete additional-pass set, with sources, precedence, empty-value behavior, and unknown-token reporting. A token outside the table—or one with no usable configured value—stays unresolved and is reported; the implementer has no authority to expand the set.

FR-3 is closed against both readers:

- `prd-ready.ts::lintPrd` invokes `lintMemoryContract` only when `config.memory.enabled` is true.
- `chain.ts::buildGateChain` constructs the Memory Inputs/Outputs close gates only while the contract is enabled. If the base enables memory and the branch disables it, the chain fails closed instead of treating the sections as optional.
- The always-on Durable Artifacts gate is separate and does not require Memory Inputs or Memory Outputs.

FR-4 is closed. `chain.ts::buildGateChain`, not `review.ts`, owns the current no-task stop. `review.ts` confirms the requested row shape: an `independent-review` ledger row, `passed` result, configured review path, and valid review metadata.

FR-5 is closed. It specifies a two-member alternation—literal `{{ID_PREFIX}}` or the exactly escaped configured prefix—and explicitly rejects foreign, malformed, absent, and competing anchors. A rendered template is therefore admitted by a closed rule, not by an open-ended intention or wildcard heading search.

FR-6 now contains the discoverability behavior: both quickstart placements, both help flags, a named `cli.test.ts` assertion, structural ordering, and the runnable parity command. The current code confirms the intended delta: `usage()` still advertises only positional PRD creation, both quickstarts still prescribe manual task/review creation, and the current parity verifier compares eight commands without checking section order.

A new consistency error was introduced: `packages/provegate/src/cli.ts::usage` was placed on FR-1’s Targets line even though help advertising is owned by FR-6. FR-6’s own Targets line omits both `cli.ts::usage` and `cli.test.ts`.

### 2. Edge Cases & Failure Modes

The promised eight-refusal table is not present. The live §11 table still has one aggregate row covering only both modes together and zero/two PRD matches, with no exact `new.test.ts` titles. FR-1 itself names only mutual exclusion and zero/multiple matches.

The live requirements therefore do not bind the mixed forms the Changelog claims were added:

- an artifact mode plus an extra positional;
- `--class` in artifact mode;
- `--template` in artifact mode;
- a repeated artifact flag;
- an artifact flag without its id.

The missing grammar also leaves the legacy bare-command refusal and exact positional cardinality implicit. This is consequential because current `runNew` selects the first positional value rather than rejecting extras.

The existing-destination contract is closed: both artifact writes must use `wx`, report the existing destination, and preserve its bytes. Destination naming is otherwise sufficiently tied to configured directories, roles, prefixes, and id width; the remaining ambiguity is how the source PRD is selected and how its authoritative slug is obtained.

FR-5 retains the necessary drift protections. An exact configured-prefix heading can pass, as intended for a rendered or supported forked template; no arbitrary prefix or wildcard heading can pass. The required competing-anchor refusal prevents a raw and rendered anchor from coexisting unnoticed.

FR-6 correctly requires both parity-checked documents to move together and names `pnpm verify:quickstart-parity`. The command currently passes, comparing eight commands, which confirms both the present parity and why the new structural-order assertion is required.

### 3. Maintainability & DX

The mechanical Clarity checklist passes: all six FRs have a Targets line, every FR maps to a runnable §11 command, DO NOT exists, Open Questions is empty, and no live decision placeholder appears. Clarity remains 7 because the target ownership is inconsistent and FR-1 still leaves argument parsing, id authority, and generated artifact contents to implementer judgment.

The value arithmetic was recomputed:

`0.25×3 + 0.25×5 + 0.20×2 + 0.15×5 + 0.15×4 = 3.75`.

The historical `3.75 (3/5/2/5/4)` header was arithmetically correct but substantively overstated:

- MF 3 is reasonable: this improves the method’s delivery without changing its governing semantics.
- UI 5 is reasonable: every new adopter traverses these surfaces.
- TL 2 is reasonable: the work fixes a bounded onboarding path rather than unlocking broad architecture.
- AR 5 is now defensible because help and both first-touch quickstarts are expressly included, subject to correcting FR-6’s Targets line.
- RM 4 is not credible for CLI grammar, multiple artifact writers, anchor strictness, lint-sensitive document removal, phase-chain diagnostics, public documentation, and a root verifier.

The live replacement, `3.45 (3/5/2/5/2)`, also recomputes correctly, and RM 2 is the credible maintenance score.

No method-content provenance cap is triggered:

- FR-4 changes a runtime diagnostic, not a prompt, template, or schema.
- FR-6 changes QUICKSTART and practices documentation, outside critical rule 4’s prompt/template/schema classes.
- FR-1 consumes existing shipped templates but does not authorize changing their source bytes.

### 4. Migration & Rollback

The migration and rollback section remains sound. Legacy `gate new <slug>` retains its output and behavior except for explicitly additive mixed-mode refusals. Reverting removes the new convenience commands without deleting artifacts they already created; the unchanged phase-6 consumer continues reading those artifacts.

The memory migration is also correct: a PRD created without Memory sections remains valid while memory is genuinely disabled and becomes invalid if the repository later enables the contract.

The rollback detector is correctly stated: an FR-5 deny test failing means an invalid anchor was admitted and triggers reversion. Both quickstart copies are required in the same release.

The compatibility claim cannot yet be executed exactly because it refers to FR-1 mixed-mode refusals that are still absent from the live FR and verification table.

### 5. Memory Inputs

Each declared disposition was challenged:

- `quickstart-is-a-fixture`: relevant and correctly bound to both watched quickstart files and the proposed structural verifier.
- `derive-the-requirement-from-the-consumer`: relevant; FR-2 now supplies a closed seven-row set rather than letting implementation discover or expand it.
- `shipped-content-needs-a-delivery-gate`: relevant; instantiated artifacts and `pnpm smoke:adopter` exercise delivered behavior.
- `metadata-declares-what-it-cannot-provide`: relevant; the memory-off/on pair prevents configuration from promising an unenforced contract.
- `assert-absent-needs-an-independent-cause`: relevant; the source template retains the sections while configuration independently causes omission.
- `evidence-pattern-satisfied-by-the-template`: correctly bound to the exact real-chain failure test for a freshly instantiated task artifact.
- `strictness-added-during-extraction-is-a-behavior-change`: relevant; FR-5’s closed positive alternation and four deny shapes constrain the loosened detector.
- `a-rule-corrected-survives-where-it-is-restated`: not successfully applied. The Changelog claims the wip/basename rule and named refusal table exist, but FR-1 and §11 do not contain them. The help target was also attached to the wrong FR.
- `docs-are-a-wiring-surface`: relevant to the asserted NEXT_STEPS correction.
- `fixture-must-reach-production-shape`: relevant; the intended tests enter through the CLI argument surface.
- `surface-set-without-its-predicate`: reasonably reviewed; no `core/gates/**` file is a declared FR Target.
- `narrow-the-grammar-not-the-parser`: relevant to FR-3’s column-zero section grammar.
- `gate-run-resume-after-archive`: relevant through `core/run/**`; the PRD changes neither archive nor resume behavior.

No newly missing active record was found whose `watch` overlaps a declared FR Target. Direct overlaps remain covered for the quickstarts, `core/run/**`, `cli.ts`, `practices/**`, test files, and the PRD itself.

---

## Scorecard

| #         | Dimension                | Weight | Score | Notes |
| --------- | ------------------------ | ------ | ----- | ----- |
| 1         | Clarity                  | 15% | 7/10 | Formal checklist passes, but the grammar, id authority, artifact substitutions, and FR-6 target ownership remain unclear. |
| 2         | Completeness             | 20% | 7/10 | Discoverability is specified; the central iteration-5 FR-1 closures remain Changelog-only. |
| 3         | Technical Depth          | 25% | 8/10 | Strong token, memory, anchor, consumer, parity, and rollback treatment; artifact instantiation remains underspecified. |
| 4         | Multi-Tenancy & Security | 20% | 9/10 | No protected, tenant, auth, network, or permission surface; writes are contained and exclusive. |
| 5         | Scope & Testability      | 10% | 8/10 | Help and documentation assertions are named, but the promised refusal-title table is absent. |
| 6         | Migration & Rollback     | 10% | 8/10 | Reversion and ordering are sound; compatibility still relies on unstated mixed-mode refusals. |
| **Total** | **Weighted**             | | **7.9/10** | **ITERATE** |

Hard caps checked:

- Security cap: not tripped — no protected route, endpoint, query, auth, permission, or tenant surface is touched.
- Contract cap: not tripped — no client→server payload is introduced.
- Lint cap: not tripped — the readiness lint returned PASS under a read-only state-write shim.
- Method-content cap: not tripped — no prompt, template, or schema source byte is changed.

---

## Missing Pieces (to reach 10/10)

1. **Iteration-1 MP-1 — OPEN.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-1 and §11: add the three-production grammar to the live FR; restrict artifact-mode resolution to `<prd.dir>/<stateRoles.wip>`; state that a parsed PRD artifact basename is authoritative for number and slug and that heading/metadata edits do not affect identity. Add the promised eight-row `packages/provegate/test/new.test.ts` table with exact titles for both flags, extra positional input, `--class`, `--template`, repeated artifact flag, missing id, zero wip matches, and multiple wip matches. Enumerate the task/review template sites that must receive the id, slug, dates, PRD/readiness references, PRD metadata, and concrete review-ledger path.

2. **Iteration-1 MP-2 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-2 and §11: no change required. The current seven-row table is closed and explicitly separate from existing anchored substitutions.

3. **Iteration-1 MP-3 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-3 and §11: no change required. `prd-ready.ts` and `chain.ts` accept missing Memory sections only while the contract is genuinely off and fail closed when it remains in force.

4. **Iteration-1 MP-4 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-4 and §11: no change required. `chain.ts::buildGateChain` is the correct diagnostic owner, and the required consumer columns are specified.

5. **Iteration-1 MP-5 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-5 and §7: no change required. The two admitted anchors and four denied shapes form a closed alternation.

6. **Iteration-1 MP-6 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-6, §7, and §11: no change required for parity. Both files, ordering, and `pnpm verify:quickstart-parity` are named.

7. **Iteration-1 MP-7 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §6, Memory Inputs, and §11: no change required. The real-chain test title is exact and requires failure of an unedited instantiated task artifact.

8. **Iteration-1 MP-8 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, Value header and value-history comment: no change required. Current 3.45 is correct; historical 3.75 was arithmetically correct but RM 4 was not credible.

9. **Iteration-2 MP-9 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §7 Migration & Rollback: no change required. The older writer and unchanged phase-6 consumer are correctly distinguished, and a deny-test failure is the rollback trigger.

10. **Iteration-3 MP-10 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-6 and §11: no change required. The NEXT_STEPS file, command, and exact sequential-heading test title are present.

11. **Iteration-4 MP-11 — CLOSED.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-6, §6, §8, Conflict Surface, and §11: the live requirement now advertises both artifact modes in help, teaches both commands in both quickstarts, and names the failing `cli.test.ts` assertion.

12. **New iteration-5 gap — OPEN.** `_prds/wip/prd-042-adopter-first-hour.md`, §4 FR-1 and FR-6 Targets: remove `packages/provegate/src/cli.ts::usage` from FR-1’s Targets line and add it to FR-6’s Targets line alongside `packages/provegate/test/cli.test.ts`, so the requirement that owns help discoverability names the production symbol and regression that implement it.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-08-07 | 6.1 | ITERATE | Found open file/token/anchor contracts, wrong FR-4 ownership, weak parity proof, and overstated maintenance safety. |
| 2   | 2026-08-07 | 7.7 | ITERATE | Closed paths, resolver sources, memory behavior, FR-4 ownership, anchor strictness, parity order, and value scoring; requested grammar, regression, and rollback closure. |
| 3   | 2026-08-07 | 7.7 | ITERATE | Found the claimed grammar absent, token rule conflicting with existing anchors, stale regression provenance, and inverted rollback trigger. |
| 4   | 2026-08-07 | 7.9 | ITERATE | Closed additional-pass boundaries, regression provenance, rollback wording, and NEXT_STEPS assertion; FR-1 and discoverability remained incomplete. |
| 5   | 2026-08-07 | 7.9 | ITERATE | Discoverability behavior is now specified, but the wip/basename rule and eight named refusals remain Changelog-only; the help symbol was attached to the wrong FR. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

| Check | Outcome |
| ----- | ------- |
| No push code path in CLI or CI | Satisfied; no push behavior is proposed. |
| Zero runtime dependencies in `packages/provegate` | Satisfied; Dependencies is `none`. |
| No telemetry or network calls | Satisfied by scope. |
| Method content traceable to source snapshot | Satisfied; runtime diagnostics, QUICKSTART, and practices prose are outside the prompt/template/schema source-byte rule, and existing templates are only consumed. |
| ADRs remain binding | Satisfied; FR-2 remains an enumerated substitution rather than a template language, consistent with ADR-0002. |
| Canonical `statusVocab` values only | No vocabulary change is proposed. |
| Memory contract behavior | Satisfied; readiness and Phase-7 readers accept absence only when memory is genuinely off, while base-enabled policy fails closed. |
| Value arithmetic | Current 3.45 and historical 3.75 both recompute; AR 5 is defensible with discoverability, while RM 4 was not. |
| Security hard cap | Not tripped. |
| Contract hard cap | Not tripped. |
| Lint hard cap | Not tripped. |
| Method-content hard cap | Not tripped. |

---

## Verdict

ITERATE — PRD-042 remains at 7.9/10. The discoverability finding is closed, but the central iteration-5 changes exist only in the Changelog: FR-1 still lacks the configured-wip/basename identity rule, the executable argument grammar, the named refusal table, and the substitutions needed to produce task and review artifacts accepted by Phase 6. The help-symbol target also landed under the wrong FR.
