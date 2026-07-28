# Readiness Assessment: PRD-034 — Prompt Store Reconciliation

**ITERATE — 7.3/10.** Revision 2 is valid and most iteration-1 defects are closed, but new implementation-directing scope, derivation, migration, and rollback defects keep the PRD below the 8.0 gate.

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-034-prompt-store-reconciliation.md` |
| Score | 7.3/10 |
| Verdict | ITERATE |
| Iteration | 2 |
| Model Tier (Execution) | none |
| Model Tier (Audit) | none |
| Scored by | GPT-5 via Codex — fresh independent Phase 2 re-score |
| Self-scored | no |
| Date | 2026-07-28 |
| State Record | pending |
| PRD Lint | PASS with written waiver. `node packages/provegate/dist/cli.js check PRD-034` reached only the known read-only-sandbox failure: `EPERM: operation not permitted, open '_state/prds.json.<pid>.tmp'`. The read-only equivalent invoked the built `lintPrd` with the resolved config, manifest, full PRD contents, repository root, and PRD number 34 and returned `{ "ok": true, "issues": [] }`. This assessment relies on the orchestrating session’s out-of-sandbox green run dated 2026-07-28 for command-level evidence. |

## Model Tier Recommendation

Do not assign an implementation tier while the verdict is ITERATE. The remaining work changes the authorized scope and fixes derivation and migration contracts, so it belongs in the PRD rather than being delegated to an implementer.

If the revised PRD reaches the 8.0–8.9 PASS band, use **high** for both implementation and audit.

## Iteration 2 — Re-derivation Review

### Revision 2 ground truth

Revision 2 is owner-approved by the second PRD-030 entry in `_state/acceptances.json`, which names:

> “two unbannered generated paths (the codex snippet and prompts/PLACEHOLDERS.md …); the detection/attribution split for unbannered planned paths”

Its factual claims hold against the shipped code:

- `prompts/PLACEHOLDERS.md` has the deliberate `verbatim` disposition at `core/run/prompts.ts:120-123`; `renderPrompts` copies its source without a banner or substitution at lines 656-661.
- The codex adapter emits only `## Phase protocols` and its table at `core/run/prompts.ts:819-828`, with no generated banner.
- `generatedPaths()` includes every `result.files` member and every rendered adapter at `core/run/prompts.ts:837-850`, so both unbannered paths remain planned and byte-comparable.
- Claude and Cursor adapters include the versioned banner at `core/run/prompts.ts:773-817`.
- `initWorkspace` uses `writeFileSync(..., { flag: 'wx' })` and treats `EEXIST` as skipped at `core/run/init.ts:330-345`; `planPrompts` performs no overwrite or deletion.
- `core/run/index.ts:39-62` is an explicit named export list, confirming that new reconciliation symbols must be added deliberately.
- `PromptsConfig`, `CONFIG_SPEC`, semantic validation, and defaults are split across `types.ts`, `validate.ts`, `load.ts`, and `defaults.ts` exactly as the revised FR-2 assumes.
- The current hygiene job installs and immediately runs `pnpm verify:workflow` without building at `.github/workflows/ci.yml:48-64`.
- The packed and repository `verify-workflow.mjs` files maintain separate `CHECKS` lists, and the drift ledger already contains the changed workflow pair at `scripts/verify/pack-drift-ledger.json:140-145`.

### Eleven iteration-1 missing pieces

1. **CLOSED — the model was superseded before re-derivation.**

   The PRD states:

   > “The functional requirements are derived from `_docs/design/prompt-store-state-model.md` at Revision 2”

   and:

   > “two unbannered generated paths; the detection/attribution split”

   Revision 2 explicitly enumerates the five superseded statements, preserves constraints 1–4 and T3/T7, and has the required owner acceptance.

2. **CLOSED — planned-path classification is total, including banner loss.**

   FR-1 assigns every planned path exactly one of:

   > “`missing` … `current` … `stale` … `modified` … `unattributable`”

   The new arm is faithful to Revision 2:

   > “bytes differ and no banner is parseable … detection still works … only the stale-versus-modified split is lost”

   `orphaned` is separately limited to unplanned, bannered files inside the declared roots. Planned paths therefore have a complete and non-overlapping precedence.

3. **CLOSED — T5/T6 discovery is honestly bounded rather than overclaimed.**

   FR-1 now says:

   > “a tree renamed outside the scan roots is not discovered”

   and:

   > “unbannered or stripped files that are unplanned are invisible to content discovery”

   FR-3 also states that a disabled configuration does not exercise T6’s remaining capability:

   > “prompts disabled; reconciliation and the bannered-orphan search not run”

   This matches model limits 5 and 6: no durable lookup survives config removal, a content search remains possible only where run, and unbannered/stripped unplanned files remain undiscoverable.

4. **PARTIAL — the requested fixture names are present, but the T5 transition proof is incomplete.**

   FR-6 now names rename, config removal, codex removal, `PLACEHOLDERS.md`, stripped banners, duplicate paths, expiry boundaries, malformed dates, non-normalized paths, and stale exceptions.

   However, its T5 assertion is only:

   > “the new store reports and the renamed-away tree does not”

   Revision 2’s underlying T5 answer also requires the existing adapters to be detected as divergent because they still embed the old directory:

   > “re-rendering the adapters for the current config and comparing against disk shows the mismatch immediately”

   The fixture can pass without proving that load-bearing half of T5.

5. **PARTIAL — FR-2 has the correct files and most semantics, but its path contract contradicts itself and the shipped validator.**

   The targets now correctly include:

   > “`types.ts`, `validate.ts`, `load.ts`, `defaults.ts`”

   It also defines non-empty fields, duplicates, UTC dates, inclusive expiry, unknown-field refusal, and suppression scope.

   The remaining contradiction is:

   > “path is repo-relative with forward slashes; backslashes are normalized before comparison”

   while the acceptance matrix requires:

   > “non-normalized path refused”

   A backslash spelling is either accepted and normalized or refused as non-canonical; both cannot be true. FR-2 also says `.` segments are refused by the “existing lexical-containment rule,” but `unsafeRelPath` at `core/config/validate.ts:467-481` refuses `..` and does not refuse `.`. The implementer still lacks one canonical path rule.

6. **CLOSED — the package export and drift-preventing evaluator are specified.**

   FR-1 targets `core/run/index.ts` and requires:

   > “an API-export test asserts `import { reconcilePrompts } from 'provegate'` resolves”

   FR-5 adds:

   > “`evaluatePromptReconciliation(findings)` returning the verdict and the report lines”

   and requires both CLI and packed script to consume the same primitive and evaluator. The §11 API-export and packed-module tests bind both claims.

7. **PARTIAL — build-before-aggregate is specified, but the mechanical assertion is not scoped tightly enough.**

   FR-4 correctly requires:

   > “the hygiene job gains `pnpm --filter provegate build` before the aggregate step”

   and adds `--assert-ci-order`.

   But its mechanical rule is only:

   > “fails unless the build step’s index precedes the aggregate’s”

   A global text-index comparison can pass when the build is in another job. The assertion must isolate the `workflow-hygiene` job and prove both commands occur there in order.

8. **PARTIAL — additive migration behavior is understood, but the adopter instruction omits the command that installs the new file.**

   The PRD correctly says existing `verify-workflow.mjs` and `NEXT_STEPS.md` remain untouched and requires a pre-034 migration fixture.

   It also says:

   > “an upgrade delivers the NEW packed `verify-prompts.mjs`”

   That is false against shipped behavior. A package upgrade updates `node_modules`; repository files are installed only when the adopter runs `gate init --practices`. The changeset is required to tell them only to add a CHECKS member, not to rerun the additive installer first. Following the documented migration can therefore wire a file that does not exist.

9. **PARTIAL — ordering and rollback exist, but two instructions are not operationally exact.**

   Positive closure includes upgrade-before-config, un-wire-before-downgrade, human cleanup, and local CI/ledger rollback.

   The downgrade instruction says:

   > “removing `prompts.exceptions` entries”

   An old validator rejects the `exceptions` key itself, including `exceptions: []`; the key must be removed entirely. Fresh adopters may also register `verify:prompts` in `package.json` from the new `NEXT_STEPS.md`, but rollback names only the CHECKS member and packed file.

   Finally:

   > “reverting the implementation commit … one commit”

   assumes an atomic commit shape the PRD does not require. Rollback must name the full implementation commit set or explicitly require one atomic implementation commit.

10. **PARTIAL — the requested ledger wording is corrected, but the declared memory output contradicts T7.**

    The planned-domain/orphan-search split is now explicit, calendar expiry is correctly called a PRD-owned decision, and the ledger says:

    > “one new pair … plus reconciliation of the changed existing workflow pair”

    However, the Memory Output and Durable Artifacts still say:

    > “the stored hash is then free to do … attribution”

    and:

    > “let the hash do the attribution job instead”

    The approved model has no stored hash or receipt. Attribution comes from the per-file banner version. This durable learning would encode a state mechanism the FRs explicitly reject.

11. **CLOSED — the output contract is consistent.**

    FR-3 chooses:

    > “one line per finding that is not `current`, plus exactly one summary line”

    The first acceptance criterion now agrees:

    > “the summary line reports every planned path as `current`, no per-path line is printed”

    The command verification row checks summary counts and findings-only per-path output.

## Derivation Fidelity

The load-bearing boundaries remain intact:

- **T3 no-write boundary:** FR-1 says the primitive “writes nothing”; FR-2 says no exception “ever authorizes a write.”
- **T7 no-receipt decision:** FR-1 reads no stored state and introduces no receipt.
- **Constraint 1:** exceptions live in adopter-owned configuration, but the tool only reads them; no FR edits `workflow.config.json`.
- **Constraint 2:** FR-3 prints deletion/reinstall instructions but performs neither, and the DO NOT section prohibits adopter-file deletion.

The `unattributable` arm matches Revision 2 exactly: it is reached only after byte divergence when a parseable banner is absent, so unbannered planned files remain detectable and lose only stale-versus-modified attribution. It is correctly not exceptable because suppressing it could conceal an undelivered upgrade.

The T5/T6 limit restatements do not weaken limits 5 or 6 and do not claim a search the PRD declines to implement. The remaining derivation defect is test coverage, not the classification itself: T5’s detectable stale adapters are not bound to the rename fixture. T6’s two adopter-facing consequences are also absent from the PRD’s guidance: clearing a `templates.prd` path that points into the removed store, and understanding that config removal leaves generated files active until a human deletes them.

The bounded orphan search still needs a traversal contract. `config.prompts.dir` can legally be `.` under the current lexical validator, and nested symlinks can escape an otherwise contained root. Declaring three starting roots does not by itself define symlink following, unreadable-entry behavior, exclusions, or a cost bound.

## Analysis

### Technical Depth & Architecture

The re-derivation is substantially stronger: it uses `generatedPaths()` as the planned domain, separates byte detection from banner attribution, gives every planned path one class, shares interpretation across CLI and pack, and targets the real config/export surfaces.

The principal remaining architecture gaps are the unspecified traversal policy, the contradictory exception canonicalization, and the missing T5 adapter assertion. These are implementation choices with correctness and containment consequences, not cosmetic wording.

### Edge Cases & Failure Modes

The exception matrix is broad and correctly includes expiry boundaries, duplicates, malformed dates, stale entries, and independent-cause suppression tests. It does not yet define one canonical spelling for backslashes, dot segments, repeated separators, and trailing separators.

The CI-order check can false-green across jobs unless it extracts the hygiene-job span. The renamed-store fixture can likewise false-green while failing to compare the adapters that still point at the abandoned tree.

### Maintainability & Developer Experience

The explicit tarball manifest is a shipped invariant:

> “any add/remove/rename in the packed set is a conscious, reviewed diff”

at `packages/provegate/test/pack.test.ts:12-16`, and the equality test rejects every extra packed file at lines 39-45. FR-5 adds `packages/provegate/practices/verify/verify-prompts.mjs`, but `packages/provegate/test/pack-manifest.json` is absent from FR targets, Implementation Scope, Conflict Surface, and §11. The full `pnpm test` floor must therefore fail until the implementer edits an out-of-scope file, which repository rules require them to stop and escalate.

The memory-input dispositions are otherwise accurate and non-ceremonial. The planned-domain/orphan-domain correction is particularly good. The proposed durable learning must replace “stored hash” with the actual banner provenance mechanism before it can be captured honestly.

### Migration & Rollback

This remains the weakest dimension. The PRD correctly understands `wx` and correctly refuses to promise updates to existing bundle files, but it skips the command that makes the new additive file appear. Its rollback wording leaves an empty-but-still-unknown config key possible and omits fresh-adopter package-script cleanup.

The “one implementation commit” rollback claim is also not guaranteed by any scope or verification rule. The rollback should be expressed against the landed commit set unless atomic implementation is itself made a requirement.

## Hard Caps and Clarity Gate

No readiness hard cap is triggered:

- No protected route, endpoint, query path, tenant data, auth surface, or client→server payload is introduced.
- No runtime dependency is added to `packages/provegate`.
- No network or push path is introduced.
- No method-content file under `packages/provegate/prompts/`, `templates/`, or `schemas/` is targeted.
- The lint failure is waived narrowly for the documented sandbox `EPERM`; the read-only equivalent is green.

The mechanical Clarity-cap checklist is present: every FR has targets, every FR has a runnable §11 row, the DO NOT section exists, Open Questions is empty, and there are no undecided markers. Clarity is nevertheless scored 7.0 because the target set is incomplete and the scan, path, migration, and rollback instructions still require implementation-time decisions.

## Scorecard

| Dimension | Weight | Score | Weighted |
| --- | ---: | ---: | ---: |
| Clarity | 15% | 7.0 | 1.05 |
| Completeness | 20% | 7.5 | 1.50 |
| Technical Depth | 20% | 7.5 | 1.50 |
| MT&S — repository critical rules | 10% | 9.5 | 0.95 |
| Scope & Testability | 15% | 7.0 | 1.05 |
| Migration & Rollback | 20% | 6.0 | 1.20 |
| **Total** | **100%** |  | **7.25 → 7.3** |

## Missing Pieces

1. Complete the T5/T6 derivation proof: the rename fixture must assert that existing Claude/Cursor adapters are divergent because they still embed the old store path; adopter guidance must preserve T6’s `templates.prd` and files-remain-active consequences.

2. Define the bounded orphan-walk contract: do not follow directory symlinks, remain inside canonical repository containment, specify unreadable-entry failure behavior, and make the cost policy valid even when `prompts.dir` is `.`.

3. Choose one exception-path contract and test it exhaustively. Either reject backslashes or canonicalize them; do not claim both. Define dot segments, repeated/trailing separators, duplicate comparison, and case behavior without attributing `.` refusal to the existing validator.

4. Add `packages/provegate/test/pack-manifest.json` to FR-5 targets, Implementation Scope, Conflict Surface, and verification. The new packed script must be consciously added to that exact-file manifest.

5. Make migration executable: the changeset must tell existing adopters to upgrade the package, run `gate init --practices` to create the new script, then add its CHECKS member. The migration fixture and release-note assertion must prove all three steps.

6. Tighten rollback and governance wording: remove the entire `prompts.exceptions` key before downgrade; remove any fresh-adopter `verify:prompts` package script as well as the packed file and CHECKS member; avoid assuming one implementation commit; scope the CI-order assertion to the `workflow-hygiene` job; and rewrite the Memory Output/Durable Artifact from nonexistent stored-hash attribution to banner-version attribution.

## Iteration History

| Date | Iteration | Score | Verdict |
| --- | ---: | ---: | --- |
| 2026-07-28 | 1 | 5.1 | ITERATE |
| 2026-07-28 | 2 | 7.3 | ITERATE |

## Verdict

ITERATE. Revision 2 is factually sound, owner-approved, and faithfully reflected in the total `unattributable` classification and the honest T5/T6 limit restatements. The no-write, no-receipt, no-config-write, no-delete, zero-runtime-dependency, no-network, and no-push boundaries all survive.

The PRD is not yet autonomous to implement. Its new packed file necessarily breaks an explicit manifest outside the declared scope; the T5 fixture omits the transition’s detectable stale adapters; scan and exception-path semantics remain underdetermined; existing-adopter instructions omit the installer invocation that creates the new file; and rollback can leave an unknown config key and registered scripts behind. Those are implementation-directing defects, so the binary gate remains ITERATE.


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 2 transcribed
> verbatim from a fresh independent Codex session (codex-cli 0.145.0, read-only sandbox)
> that scored neither iteration 1 nor authored either derivation. Trajectory 5.1 → 7.3:
> the model supersession, total classification, honest T5/T6 limits, export surface,
> shared evaluator and output contract all confirmed closed; six partial pieces remain,
> every one precision-level. The lint EPERM is the documented sandbox artifact;
> out-of-sandbox `gate check PRD-034` green the same day. Remediation by the non-scorer
> session; one more iteration expected.
