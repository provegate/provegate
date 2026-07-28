# Readiness Assessment: PRD-034 — Prompt Store Reconciliation

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-034-prompt-store-reconciliation.md` |
| Score                  | 5.1/10 |
| Verdict                | ITERATE |
| Iteration              | 1 |
| Model Tier (Execution) | none |
| Model Tier (Audit)     | none |
| Scored by              | GPT-5 via codex-cli — fresh independent session |
| Self-scored            | no |
| Date                   | 2026-07-28 |
| State Record           | pending |
| PRD Lint               | PASS with written waiver. The requested CLI failed only because the read-only sandbox refused `_state/prds.json.<pid>.tmp` with `EPERM`. Direct invocation of the built `lintPrd` against the same resolved config, manifest, PRD contents, and PRD number returned `{ "ok": true, "issues": [] }`. The orchestrating session’s out-of-sandbox green run dated 2026-07-28 is relied upon as command-level evidence. |

## Model Tier Recommendation

None while the verdict is ITERATE. The implementation should not be assigned until the T5/T6 derivation, classification taxonomy, package export surface, existing-adopter migration, CI build ordering, and rollback contract are corrected. These are architectural uncertainties, not execution details that a higher-tier implementer should decide ad hoc.

## Analysis

### Technical Depth & Architecture

**[FINDING — Technical Depth]** The scan design contradicts T5 and misstates recorded limit 5. T5 says an abandoned old store after a directory rename is discoverable only by a content search (`_docs/design/prompt-store-state-model.md:195-218`). FR-1 searches only the *current* `config.prompts.dir` plus the two fixed adapter roots (`_prds/wip/prd-034-prompt-store-reconciliation.md:121-125`). An old store renamed away from the current directory is therefore outside every declared scan root. Recorded limit 5 is actually “after config removal there is no durable pointer; a content search still works” (`_docs/design/prompt-store-state-model.md:282-289`), not “a renamed-away tree cannot be found.”

**[FINDING — Technical Depth]** FR-3 incorrectly maps an enabled-but-absent directory to T6 (`_prds/wip/prd-034-prompt-store-reconciliation.md:157-161`). T6 is removal of the `prompts` config block: the merged default becomes disabled, generated files remain, and banner-based content search remains possible (`_docs/design/prompt-store-state-model.md:220-247`). FR-3 instead exits 0 immediately when disabled, with no search or findings. This is derivation drift from an explicitly owner-accepted transition.

**[FINDING — Technical Depth]** The classification is not total for the approved banner-stripped case. `stale` requires a banner version different from the installed version, while `modified` requires equality (`_prds/wip/prd-034-prompt-store-reconciliation.md:114-130`). A planned file with no parseable banner satisfies neither predicate. FR-6 promises that exact case but does not define the expected class (`_prds/wip/prd-034-prompt-store-reconciliation.md:186-195`).

**[FINDING — Completeness]** The approved model and PRD both overlook another unbannered generated path. `renderPrompts` copies `prompts/PLACEHOLDERS.md` verbatim without adding a banner (`packages/provegate/src/core/run/prompts.ts:653-661`), while `generatedPaths` includes it in the generated set (`packages/provegate/src/core/run/prompts.ts:837-848`). Thus the codex snippet is not the sole generated path lacking provenance. Because the approved model calls codex the unique banner gap (`_docs/design/prompt-store-state-model.md:46-52,259-264`), correcting this requires a superseding model revision before deriving revised FRs.

**[FINDING — Completeness]** FR-2’s targets cannot implement the declared config field. `PromptsConfig` must gain the type in `packages/provegate/src/core/config/types.ts:130-149`, and structural validation must teach `CONFIG_SPEC` an array-of-record shape in `packages/provegate/src/core/config/validate.ts:44-99`. FR-2 targets only `defaults.ts` and `load.ts` (`_prds/wip/prd-034-prompt-store-reconciliation.md:134-149`). Under the current validator, `prompts.exceptions` is an unknown key.

**[FINDING — Technical Depth]** FR-5 cannot import the new primitive from `provegate` within its declared scope. The package root reaches an explicit export list in `packages/provegate/src/core/run/index.ts:39-62`; adding a function to `prompts.ts` does not export it automatically. Neither FR-1 nor FR-5 targets that index. Current self-resolution confirms existing primitives are importable, but the proposed one will not be until this export surface changes.

**Derivation Fidelity**

- FR-1 correctly preserves T2’s recomputation from installed package plus current config, byte comparison, T3’s no-write boundary, and T7’s no-receipt decision. It drifts on T5/T6 discovery and lacks a total answer for banner removal.
- FR-2 is a legitimate answer to the one question T3 explicitly handed to PRD-034. Suppression-only behavior respects T3, and keeping authorship in adopter-owned config respects constraint 1. Its implementation surface and date/path semantics are incomplete.
- FR-3 correctly leaves deletion and reinstall to the adopter under T2 and constraint 2. Its T6 attribution is wrong, and its disabled short-circuit prevents the content search T6 says remains available.
- FR-4 is wiring rather than a lifecycle transition and does not relax T3, T7, or constraint 1. Its CI ordering is not executable as written.
- FR-5 correctly seeks one shared primitive and adds no receipt or repair authority. It omits the required package export and does not account for additive-only upgrades of previously installed pack files.
- FR-6 captures byte-based same-version detection and the intended exception outcomes, but it omits the actual T5 rename and T6 config-removal scenarios and cannot resolve the undefined banner-stripped class.

Against the six limits: limit 1 is respected but not plainly restated; limit 2 is partially represented by `missing`; limit 3 is intentionally answered through the model’s handed question; limit 4 is restated through `orphaned` plus human-only deletion; limit 5 is misstated; and limit 6 is only partially restated and is factually incomplete against the shipped unbannered `PLACEHOLDERS.md`. The critical no-write/no-receipt boundaries themselves remain intact.

### Edge Cases & Failure Modes

**[FINDING — Completeness]** The exception contract leaves operational semantics undecided: whether `expires` is inclusive, which timezone controls expiration, whether `reason` and `owner` must be non-empty, how duplicate paths behave, and what canonical repo-relative path spelling is accepted. “Exact path” is insufficient across separators, normalization, and case-insensitive filesystems (`_prds/wip/prd-034-prompt-store-reconciliation.md:134-147`).

**[FINDING — Scope & Testability]** The fixture matrix does not exercise the transitions most endangered by the scan design. It has an adapter-removal orphan but no store-directory rename, no removal of the config block with bannered files left behind, and no removed/unbannered codex case (`_prds/wip/prd-034-prompt-store-reconciliation.md:186-195`). Those omissions allow the T5/T6 derivation errors to remain green.

**[FINDING — Clarity]** Acceptance criteria conflict with the command contract. FR-3 prints only non-`current` paths (`_prds/wip/prd-034-prompt-store-reconciliation.md:150-152`), while the first criterion says every current path “reports `current`” (`_prds/wip/prd-034-prompt-store-reconciliation.md:212-215`). A test cannot satisfy both interpretations without deciding which requirement to ignore.

**[FINDING — Technical Depth]** Recursive content discovery has no declared filesystem boundary behavior: symlinks, unreadable directories, `.git`, dependency trees, worktrees, and scan-cost limits are unspecified. This matters if T5/T6 are corrected to search beyond the current configured directory. The existing installer is careful about containment and symlinked parents (`packages/provegate/src/core/run/init.ts:222-265`); the new read path needs an equally explicit contract.

### Maintainability & Developer Experience

**[FINDING — Maintainability]** Most memory dispositions are honest, including `shipped-content-needs-a-delivery-gate`, `gate-wire-or-delete`, `false-green-on-missing-file`, `fixture-must-reach-production-shape`, and the reviewed runner records. The `derive-the-requirement-from-the-consumer` rationale, however, says a directory walk is a prohibited wider-than-consumed domain (`_prds/wip/prd-034-prompt-store-reconciliation.md:306-309`) while FR-1 necessarily adds a banner-search walk. It should distinguish the planned domain derived from `generatedPaths()` from the separate orphan-discovery search.

**[FINDING — Maintainability]** `known-red-ledger-must-expire` requires stale, unknown, and malformed entries to fail; its text does not prescribe calendar expiry (`_brain/learnings/known-red-ledger-must-expire.md:13-22`). A required `expires` field can be a sound PRD-owned design choice, but attributing that exact mechanism “per” the record overstates the record. State it as an analogy plus a new decision.

**[FINDING — Completeness]** FR-5 says “both new pack-drift ledger pairs” (`_prds/wip/prd-034-prompt-store-reconciliation.md:174-185`). The pack map would create one new pair for `verify-prompts.mjs`; `verify-workflow.mjs` is an existing pair already recorded at `scripts/verify/pack-drift-ledger.json:140-145`. The requirement should call for one new pair and reconciliation of the changed existing pair.

**[FINDING — Multi-Tenancy & Security]** This infra PRD is judged against repository critical rules, not tenant boilerplate. It explicitly forbids runtime dependencies, remote/push paths, network behavior, adopter-file deletion, and method-content edits (`_prds/wip/prd-034-prompt-store-reconciliation.md:200-208,247-253,424-438`). `packages/provegate/package.json:60-67` currently has only development dependencies, and no method-content target is declared. No security hard cap is triggered.

### Migration & Rollback

**[FINDING — Migration & Rollback]** “Dormant here and live in the pack” is false for existing adopters. `PACK_MAP` is installed through additive-only `wx` writes (`packages/provegate/src/core/run/init.ts:146-186,267-349`). On upgrade, the new `verify-prompts.mjs` can be created, but an adopter’s existing `scripts/verify/verify-workflow.mjs` and `NEXT_STEPS.md` are skipped and therefore never gain the new member or wiring instruction. The PRD supplies no migration for repositories that installed PRD-029-era practices, even though those are precisely the repositories with prompt stores.

**[FINDING — Migration & Rollback]** FR-4 places a built-CLI check in `verify:workflow`, then requires it in the CI hygiene job (`_prds/wip/prd-034-prompt-store-reconciliation.md:163-173`). That job installs but does not build (`.github/workflows/ci.yml:48-64`); the workflow explicitly records that built-CLI checks belong after the build in the other job (`.github/workflows/ci.yml:40-46`). A clean CI checkout would therefore fail on missing/stale `dist`.

**[FINDING — Migration & Rollback]** There is no implementation rollback section. A package downgrade after adding `prompts.exceptions` makes the old validator reject the adopter’s config as containing an unknown key. A previously wired packed check will also import a primitive absent from the downgraded package. Because pack installation never overwrites or deletes, downgrading the package does not unwind installed scripts or bundle edits. These ordering and cleanup steps must be explicit for an infra PRD weighted heavily on migration.

## Scorecard

| Dimension | Weight | Score | Weighted |
| --- | ---: | ---: | ---: |
| Clarity | 15% | 7.0 | 1.05 |
| Completeness | 20% | 5.0 | 1.00 |
| Technical Depth | 20% | 4.0 | 0.80 |
| Multi-Tenancy & Security | 10% | 9.5 | 0.95 |
| Scope & Testability | 15% | 6.0 | 0.90 |
| Migration & Rollback | 20% | 2.0 | 0.40 |
| **Total** | **100%** |  | **5.10** |

## Missing Pieces

1. Supersede `_docs/design/prompt-store-state-model.md` before changing the FRs to record that `prompts/PLACEHOLDERS.md`, not only the codex snippet, is emitted without a banner. Enumerate the resulting T4/T5/T6 and limit-6 consequences.

2. Rewrite FR-1’s classification precedence so every planned path receives exactly one class. Explicitly state the class for a planned banner-bearing file whose banner is absent or malformed, and separately define the treatment of intentionally unbannered generated paths.

3. Replace FR-1/FR-3’s T5/T6 text with the approved answers: define a bounded repository content-search algorithm capable of finding an abandoned old store and surviving config removal, including exclusions, symlink policy, unreadable-path behavior, and cost limits. If this capability is intentionally deferred, remove the T5/T6 coverage claims and restate the limits honestly.

4. Add T5 directory-rename, T6 config-removal-with-files-left, removed codex, unbannered `PLACEHOLDERS.md`, malformed banner, duplicate exception, expiry-boundary, and path-normalization cases to FR-6 and its acceptance criteria.

5. Add `packages/provegate/src/core/config/types.ts`, `packages/provegate/src/core/config/validate.ts`, and the appropriate config-validation tests to FR-2’s targets and commands. Specify non-empty fields, date timezone/inclusivity, duplicate behavior, and canonical repo-relative exception paths.

6. Add `packages/provegate/src/core/run/index.ts` to FR-1/FR-5 targets, require an API-export assertion, and specify whether the shared primitive returns a final failing verdict or whether a second shared formatter/evaluator prevents CLI and packed-script interpretation from drifting.

7. Amend FR-4 so the hygiene job builds `packages/provegate` before any aggregate member invokes `dist/`, or relocate the aggregate execution to a post-build job while preserving explicit wiring evidence. Add a clean-checkout CI-order test or equivalent verification.

8. Add an existing-adopter migration section. The exact scenario must begin with the pre-034 packed `verify-workflow.mjs` and `NEXT_STEPS.md`, run the additive installer, and prove the adopter receives an explicit manual wiring instruction without any existing file being overwritten.

9. Add rollback and ordering instructions: upgrade the package before accepting `prompts.exceptions`; remove exception entries before package downgrade; remove the packed check and workflow member before downgrading to a version without the exported primitive; and state how repository CI/root wiring is reverted.

10. Correct the memory and drift wording: distinguish `generatedPaths()` as the planned domain from content search as orphan discovery; describe calendar expiry as a PRD-owned extension of the known-red lesson; and change “both new pairs” to “one new pair plus the changed existing workflow pair.”

11. Resolve the output contradiction by choosing either silent-current output or one line per path, then align FR-3, the first acceptance criterion, and command tests.

## Iteration History

| Date | Iteration | Score | Verdict |
| --- | ---: | ---: | --- |
| 2026-07-28 | 1 | 5.1 | ITERATE |

## Verdict

ITERATE. The PRD preserves the critical no-write, no-receipt, no-delete, zero-runtime-dependency, no-network, no-push, and no-method-content-change boundaries. It nevertheless fails its primary derivation-fidelity axis: T5 cannot work under the declared scan roots, T6 is misidentified and bypassed, banner removal has no total classification, and the shipped package contains another unbannered generated file that the approved model does not record. The packed wiring is also not live for existing adopters, the CI ordering lacks a build, and no rollback path exists. These are implementation-directing gaps below the 8.0 readiness threshold.

VERDICT: ITERATE 5.1

---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 1 transcribed
> verbatim from a fresh independent Codex session (codex-cli 0.145.0, read-only sandbox,
> ~1.54M tokens). The scorer did not author the FRs (derived earlier today by the
> orchestrating session from the owner-approved state model). Its central factual finding
> was re-verified by the transcriber before landing this file: `renderPrompts` copies
> `prompts/PLACEHOLDERS.md` verbatim with NO banner (`prompts.ts` `verbatim` disposition —
> deliberate, the registry documents the tokens substitution would consume) while
> `generatedPaths()` includes it in the generated set, so the approved model's claim that
> the codex snippet is the unique unbannered path is wrong and **the model needs a
> superseding revision (owner approval) before the FRs are re-derived** — Missing Piece 1
> is the gate for the other ten. The lint EPERM is the documented sandbox artifact; the
> out-of-sandbox `gate check PRD-034` was green the same day. Score band 4-5.9 prescribes
> "return to Phase 1", and that is the action taken: FR rework, not a wording round.
