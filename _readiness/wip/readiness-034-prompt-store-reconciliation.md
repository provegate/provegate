# Readiness Assessment: PRD-034 — Prompt Store Reconciliation

**ITERATE — 7.4/10.** The migration and rollback mechanics improved, and the no-write/no-delete design remains intact. However, four claimed closures are still open, one is only papered over, and the precision pass introduced a direct exception-path contradiction for legal `prompts.dir` values.

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-034-prompt-store-reconciliation.md` |
| PRD Class | `infra` |
| Score | 7.4/10 |
| Verdict | ITERATE |
| Iteration | 3 |
| Model Tier (Execution) | none |
| Model Tier (Audit) | none |
| Scored by | GPT-5 via Codex — fresh independent Phase 2 re-score |
| Self-scored | no |
| Date | 2026-07-28 |
| State Record | pending |
| PRD Lint | PASS with written waiver. `node packages/provegate/dist/cli.js check PRD-034` reached the documented read-only-sandbox failure: `EPERM: operation not permitted, open '/Users/rayvaz/Projects/provegate/_state/prds.json.<pid>.tmp'`. The read-only equivalent invoked the built `lintPrd` with the resolved config, loaded manifest, complete PRD contents, repository root, and PRD number 34; it returned `{ "ok": true, "issues": [] }`. Command-level evidence relies on the orchestrating session’s out-of-sandbox green run dated 2026-07-28. |

## Model Tier Recommendation

No implementation tier is assigned while the verdict is ITERATE. If the revised PRD reaches the 8.0–8.9 PASS band, use **high** for both implementation and audit.

## Iteration 3 — Precision Review

### 1. T5 rename proof and T6 adopter guidance — PAPERED OVER

The T5 fixture itself now carries all three requested assertions:

> “the new store reconciles, the renamed-away tree produces no finding … **and the existing Claude/Cursor adapters report as diverged because their content embeds the old store path**” (§4, lines 243–246)

That is faithful to Revision 2, whose T5 answer says re-rendering the adapters exposes the mismatch immediately.

The combined piece is not genuinely closed because the T6 consequences are attached only to an unnamed “adopter guidance” surface:

> “the adopter guidance repeats T6’s two consequences (clear `templates.prd` in the same change; the generated files remain on disk, readable by agents, until a human deletes them)” (§4, lines 247–251)

Neither FR-3’s production output contract nor §6 says where users receive that guidance. The corresponding acceptance criterion still says only:

> “it exits 0 with a note naming what was not exercised — reconciliation and the bannered-orphan search” (§6, lines 316–319)

The T5 acceptance criterion is stale too: it asserts the new tree and undiscovered old tree but omits the adapter consequence (§6, lines 303–306). Section 11 refers generically to “the two limit fixtures” without binding the T6 text to `NEXT_STEPS.md`, the CLI, or the changeset.

A test could therefore satisfy “adopter guidance” using fixture-local text without proving that any production-facing artifact contains it. T5 is closed in FR-6; T6 is papered over.

### 2. Bounded orphan walk — OPEN

The remediation adds the requested vocabulary:

> “directory symlinks are not followed, every visited path must stay inside the repository’s canonical containment … an unreadable entry is a named failure” (§4, lines 133–136)

But its cost bound is not an operational traversal rule:

> “the store root is walked only one level deep past its planned structure” (§4, lines 136–138)

“Planned structure” is undefined. `generatedPaths()` returns a map of file paths, not a directory tree or traversal frontier (`core/run/prompts.ts`, lines 837–848). The implementer still must decide which directories are “planned,” whether unplanned sibling directories are entered, how overlapping roots are deduplicated, and from which node the extra level is counted.

More importantly, FR-1 first promises:

> “every **unplanned** file carrying the generated banner inside the scan roots … is `orphaned`” (§4, lines 126–128)

When `prompts.dir` is `.`, that root is the repository. A one-level-past-some-undefined-structure walk cannot guarantee discovery of every nested bannered file while also refusing a repository-wide crawl. The universal classification and the claimed bound cannot both hold as written.

The current lexical validator permits `prompts.dir: "."` because `unsafeRelPath()` refuses `..` but not `.` (`core/config/validate.ts`, lines 467–481). This is therefore a reachable contradiction, not a hypothetical invalid configuration.

### 3. Exception-path contract — OPEN

The rejection-only rules are internally clear in isolation:

> “a backslash anywhere refuses the entry … `.` or `..` as any segment, empty segments … and a leading `./` are refused” (§4, lines 150–156)

and:

> “the entry must match the spelling `generatedPaths()` produces” (§4, lines 156–159)

Together with the shipped generator, these requirements contradict each other. `generatedPaths()` constructs store paths with raw interpolation:

> `out.set(\`${dir}/${storeRel}\`, body)` (`core/run/prompts.ts`, line 844)

For the legal configuration `prompts.dir: "."`, it therefore produces paths such as `./prompts/phase-1-prd-generator.md`. The exception validator must reject that exact leading-`./` spelling, while matching permits no transformation. No exception can match a modified store file in that configuration.

The same defect applies to other spellings the existing `prompts.dir` validator accepts, including a leading `./`, repeated or trailing separators, and backslashes: raw interpolation carries them into `generatedPaths()`, while the new exception contract refuses them. Fixing this requires a decision the PRD has not made:

- canonicalize generated path spellings;
- tighten `prompts.dir` and specify the resulting existing-adopter migration; or
- permit the exact noncanonical spelling produced by `generatedPaths()`.

This precision pass therefore introduced a new derivation and migration defect.

### 4. Exact-file pack manifest scope — OPEN

The repository evidence is conclusive: `packages/provegate/test/pack-manifest.json` exists, and `pack.test.ts` compares the dry-run tarball against it for exact equality, rejecting both extra and missing files (`pack.test.ts`, lines 35–45).

FR-5’s text and Targets now correctly name it:

> “the packed file also joins `packages/provegate/test/pack-manifest.json` — the exact-file manifest the pack test enforces” (§4, lines 223–224)

> “`packages/provegate/test/pack-manifest.json`” (§4, line 232)

But the claimed all-section closure did not occur. Implementation Scope still jumps from the packed bundle, `init.ts`, `NEXT_STEPS.md`, and ledger directly to the conformance test:

> “`packages/provegate/practices/verify/verify-prompts.mjs` + packed `verify-workflow.mjs` + `core/run/init.ts` PACK_MAP + `NEXT_STEPS.md` + the drift ledger” (§8, lines 411–412)

> “`packages/provegate/test/prompts-integrity.test.ts`” (§8, line 413)

Conflict Surface likewise omits the manifest from its enumerated paths (§10, lines 506–523). It is not listed in `workflow.config.json`’s `sharedAppendOnly`, so the PRD’s own rule does not exempt it from exclusive ownership.

The implementation would still require an out-of-scope edit to make the exact-file pack test pass.

### 5. Existing-adopter migration — GENUINELY CLOSED

Section 7 now gives the complete executable sequence:

> “(1) upgrade the package; (2) run `gate init --practices` — the additive installer is what CREATES the new `verify-prompts.mjs` …; (3) add `verify-prompts.mjs` to the CHECKS array” (§7, lines 356–360)

It also binds the release-note assertion to all three steps:

> “the changeset text asserted to contain all three steps” (§7, lines 361–363)

This matches shipped behavior. `planPractices()` installs from an explicit `PACK_MAP`, and `initWorkspace()` uses `writeFileSync(..., { flag: "wx" })`, preserving existing adopter files while allowing the new path to be created (`core/run/init.ts`, lines 146–186 and 331–345).

FR-6’s shorter phrase “manual wiring line” is weaker than §7 but does not contradict the full fixture contract stated there. This piece is closed.

### 6. Rollback, CI ordering, and T7 memory attribution — OPEN

Most rollback and ordering subparts are genuinely corrected:

> “removing the **entire `prompts.exceptions` key** — an empty array is still an unknown key” (§7, lines 374–377)

> “remove the CHECKS member, the packed file, and … the `verify:prompts` package-script entry” (§7, lines 378–383)

> “whether one commit or a small stack, the tree between adjacent commits never holds a registered check without its script or a script without registration” (§7, lines 384–389)

FR-4 also scopes the order assertion correctly:

> “isolates the **hygiene job’s own step list** … and fails unless that job runs the provegate build before its aggregate step” (§4, lines 202–205)

That matches the current workflow structure: `workflow-hygiene` is a distinct job whose present step list installs and then runs `pnpm verify:workflow` without building (`.github/workflows/ci.yml`, lines 48–64).

The combined piece remains open because the claimed T7 rewrite never occurred. Memory Outputs still says:

> “compare against a stored hash; the stored hash is then free to do … telling a package-caused difference from a human-caused one” (Memory Outputs, lines 488–492)

Durable Artifacts repeats:

> “recompute rather than trust a stored hash; let the hash do the attribution job instead” (lines 534–537)

Revision 2 says the opposite: there is no receipt, and the banner is the only durable per-file provenance (`prompt-store-state-model.md`, lines 275–295). The changelog claims this wording was changed to banner-version attribution, but the remediation commit did not edit either section.

## Derivation Fidelity

The load-bearing implementation boundaries remain intact:

- **T3 no-write:** FR-1 says the primitive “writes nothing” (§4, line 141), and FR-2 says no exception authorizes a write (§4, line 172).
- **T7 no-receipt:** FR-1 recomputes from installed package plus current config and reads no stored state (§4, lines 109–113).
- **Constraint 1 — never write adopter config:** exceptions are adopter-owned configuration read by the tool; no FR gives the tool an edit path for `workflow.config.json`.
- **Constraint 2 — never delete adopter files:** FR-3 only prints the deletion/reinstall remedy (§4, lines 185–187), and the DO NOT section explicitly forbids deletion (§12, line 582).

The exception-path contradiction does not relax these boundaries, but it prevents the T3 representation chosen by PRD-034 from functioning for legal generated-path spellings. The stale Memory Output does not create implementation write authority, but it would capture a durable learning that contradicts T7.

The packed bundle and ledger assumptions otherwise match the repository: live and packed `verify-workflow.mjs` files have separate CHECKS lists, `PACK_MAP` installs the packed bundle explicitly, and the drift ledger already carries the existing workflow pair at lines 140–145.

## Hard Caps and Clarity Gate

No readiness hard cap is triggered:

- No runtime dependency is added to `packages/provegate`.
- No network or remote-push path is introduced.
- No method-content file under `packages/provegate/prompts/`, `templates/`, or `schemas/` is targeted.
- No protected route, authorization surface, tenant boundary, or client/server payload is introduced.
- The read-only lint equivalent is green; the CLI failure is narrowly waived for the documented sandbox `EPERM`.

Clarity is capped at 7.0. The orphan traversal still requires implementation-time interpretation, the exception spelling contract contradicts reachable generated output, and the exact-file manifest remains absent from two scope authorities.

## Scorecard

| Dimension | Weight | Score | Weighted |
| --- | ---: | ---: | ---: |
| Clarity | 15% | 7.0 | 1.05 |
| Completeness | 20% | 7.5 | 1.50 |
| Technical Depth | 20% | 7.0 | 1.40 |
| MT&S — repository critical rules | 10% | 9.5 | 0.95 |
| Scope & Testability | 15% | 6.0 | 0.90 |
| Migration & Rollback | 20% | 8.0 | 1.60 |
| **Total** | **100%** |  | **7.40 → 7.4** |

## Missing Pieces

1. Bind the T6 consequences to a named production-facing artifact and test that exact artifact; repeat the T5 adapter consequence and T6 guidance in §6/§11 where their acceptance is restated.

2. Replace “one level deep past its planned structure” with an exact traversal domain and depth algorithm. Reconcile that domain with FR-1’s promise to classify every bannered unplanned file inside the roots, including when `prompts.dir` is `.`.

3. Resolve the generated-path/exception-path contradiction for every legal `prompts.dir` spelling. The chosen solution must address `.` and existing noncanonical directory spellings without silently creating an adopter migration.

4. Add `packages/provegate/test/pack-manifest.json` to Implementation Scope and Conflict Surface, and bind its exact-file update to verification.

5. Rewrite Memory Outputs and Durable Artifacts to attribute stale-versus-modified differences to the parseable banner version, never to a nonexistent stored hash or receipt.

## Iteration History

| Date | Iteration | Score | Verdict |
| --- | ---: | ---: | --- |
| 2026-07-28 | 1 | 5.1 | ITERATE |
| 2026-07-28 | 2 | 7.3 | ITERATE |
| 2026-07-28 | 3 | 7.4 | ITERATE |

## Verdict

ITERATE. Migration and rollback are now operationally credible, and the fundamental no-write, no-receipt, no-config-write, and no-delete boundaries survive. The document cannot pass while a legal generated path is impossible to except, the orphan search has mutually incompatible coverage and cost promises, the exact-file manifest remains outside two scope authorities, T6 guidance lacks an owned delivery surface, and the durable learning still encodes the stored-hash mechanism Revision 2 rejects.


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 3 transcribed
> verbatim from a fresh independent Codex session. Two of the six iteration-2 closures
> the remediation CLAIMED were never actually applied — the remediating session's
> all-or-nothing edit script died on a mismatch and the retry dropped two chunks (the
> Memory Output T7 rewrite; the pack-manifest Scope/Surface sweep) while the changelog
> still claimed them: the scorer caught the false claim, which is
> `a-rule-corrected-survives-where-it-is-restated` operating on the remediation itself.
> The new [P1]-grade find is real: the iteration-2 rejection-only exception contract
> contradicts `generatedPaths()`'s raw interpolation for legal `prompts.dir` spellings
> (`.` produces `./…` paths the contract refuses). Lint EPERM is the documented sandbox
> artifact; out-of-sandbox `gate check PRD-034` green the same day.
