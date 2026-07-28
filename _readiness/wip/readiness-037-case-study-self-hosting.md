# Readiness Assessment: PRD-037 — Case Study, Part Two: the Tool's Own Ledger

**ITERATE — 7.10/10.** The surviving figure pair is derivable and the architecture is feasible, but six of the eight claimed closures remain incomplete or contradicted elsewhere in the normative PRD. An implementing agent would still have to invent parts of the CLI, state-validation, and output contracts.

## Quick Meta

| Field | Value |
| --- | --- |
| Score | 7.10/10 |
| Verdict | ITERATE |
| Iteration | 4 |
| PRD Class | feature |
| Scored by | Codex — fresh independent session |
| Self-scored | no |
| Date | 2026-07-28 |
| PRD Lint | waived/green — `node packages/provegate/dist/cli.js check PRD-037` failed with the documented sandbox `EPERM` opening `_state/prds.json.76504.tmp`; the read-only `lintPrd` equivalent returned `{"ok":true,"issues":[]}`; relying on the orchestrating session’s out-of-sandbox green run on 2026-07-28 |
| State Record | unchanged — analysis-only rescore; `_state/prds.json` records 6.28 ITERATE from iteration 2 |
| Prior Artifact State | the readiness file on disk contains iterations 1–2 only; iteration 3 at 6.40 is corroborated by the PRD changelog, `STATUS.md`, and the scoring brief |
| Repository Changes | none |

## Iteration 4 — Closure Review

| Rework piece | Status | Verification |
| --- | --- | --- |
| 1. `_state/prds.json` alone | **OPEN** | The introduction correctly says the script computes from “`_state/prds.json` — its only input” (`:43-45`), but §7 still says “readiness artifacts carry iteration histories as tables the script parses” (`:205-208`). The latter is the deleted parser contract the changelog claims was removed. Additionally, sentinel validation requires reading the MDX document, so “only input” must be narrowed to “only figure source” rather than describing all operational reads. |
| 2. De-number §12 and reconcile changelog | **OPEN** | §12 still requires “The ledger includes the 5.1s” (`:319-320`), while the changelog says “§12’s surviving ‘the 5.1s’ de-numbered” (`:331`). The normative text and history directly disagree. |
| 3. Complete mode matrix | **PARTIAL / NOT EXECUTABLE** | FR-2 calls default, `--print`, and `--write` “Three modes” (`:135-139`), while FR-3 separately introduces `--check` and the harness calls these “all four modes” (`:127,149-151`). “Failure in every mode” (`:135-136`) includes default, contradicting the intended default behavior of reading nothing. Exact exit 1 behavior for `--print`, `--write`, and `--check` sentinel failures is absent; invalid or combined flags are also undecided. |
| 4. Narrow “read-only” | **OPEN** | The generic script remains described as “read-only” in FR-1 (`:119`), Success Metrics (`:68`), and Implementation Scope (`:232`), even though `--write` deliberately mutates the MDX file. Only the `--print` uses at `:178-179` and `:297` are correctly narrowed. |
| 5. Complete `closeModes` and malformed-state contract | **OPEN** | The table says “count per value; unknown values listed” and missing values are “listed by id” (`:108`), whereas the harness expects a single deterministic `unclassified` output (`:125-127`). The PRD never normatively states `{count, ids}`, sorted IDs, success status, output channel/placement, or “never folded.” “Parseable-but-malformed state” occurs only in a fixture list; the malformed element grammar and first-offending-element diagnostic are not defined. |
| 6. Fixture harness and full cases | **CLOSED as requested; scope residue remains** | The harness is in FR-1 Targets with the claimed cases (`:123-130`) and has a runnable §11 row (`:298`). It is nevertheless absent from Implementation Scope and Conflict Surface, despite being a new file. |
| 7. Explicit heading id asserted from source | **PARTIAL** | FR-2 and §6 correctly require `self-hosting-ledger` to be asserted against MDX source, “never inferred from a docs build” (`:143-146,190-191`). But §11 still claims `pnpm --filter docs build` proves “the heading id is stable” (`:299`). The exact MDX source syntax to assert is also not specified. |
| 8. Date the sequencing statement | **CLOSED** | §7 explicitly says the lease statement is “at drafting time” and “dated, not standing,” with a fresh `gate queue` before Phase 3 (`:215-219`). |

### Derivability Probe

The current `_state/prds.json` parses successfully and contains 39 records. Applying the PRD’s exact predicate produced:

| Figure | Current result | Assessment |
| --- | --- | --- |
| `shipVerified` | **30** records with `status === "Ship Verified"` | Derivable |
| `closeModes.operator-gated` | **28** | Derivable |
| `closeModes.eligible` | **2** (`PRD-015`, `PRD-035`) | Derivable |
| Unknown/missing close modes among selected records | **0** | Current state is clean; fixture behavior still needs a normative contract |

This confirms the narrowed figure set is sound and automatically reflects newly closed work. The earlier 29 / 27 / 2 result was a previous snapshot, not a defect.

### Final Adversarial Sweep

The cut scorer-session, review-round, critical-count, resumed-stop, and readiness-iteration figures are no longer promised as generated numbers in the introduction or FR output. Their unnumbered narrative use is consistent.

The remaining residue is contractual:

- §7 resurrects readiness artifacts as parser inputs after readiness iterations were cut.
- §12 retains `5.1`, directly violating the no-digit rule.
- The no-digit acceptance criterion is weaker than FR-2: §6 permits a prose digit if it also occurs in FR-1 output (`:188-189`), while FR-2 permits no digit outside the sentinels (`:141-142`). Those rules accept different documents.
- The span and grammar of the no-digit check are undefined: the PRD should identify the new H2-bounded section and the digit predicate, while excluding the externally sourced origin section.
- “Three modes,” “all four modes,” and “every mode” encode incompatible dispatch and validation models.
- The changelog asserts deletion and de-numbering that did not occur, demonstrating that the declared `a-rule-corrected-survives-where-it-is-restated` Memory Input was not successfully applied.
- The generic “read-only” promise contradicts the deliberate `--write` mutation.
- The build row retains an assertion the source-level heading fixture was meant to replace.
- The new harness is outside Implementation Scope and Conflict Surface.

No runtime dependency, network call, telemetry, push path, package method-content change, tenant surface, schema migration, or protected route is introduced.

## Scorecard

| Dimension | Weight | Score | Weighted | Notes |
| --- | ---: | ---: | ---: | --- |
| Clarity | 15% | 6.6/10 | 0.990 | Concrete files and commands exist, but the authoritative input, mode, malformed-state, and close-mode contracts contradict their restatements |
| Completeness | 20% | 6.3/10 | The fixture catalogue is strong; exact validation grammar, exit behavior, invalid flags, deterministic output shape, and digit-span rules remain missing |
| Technical Depth | 25% | 6.4/10 | State-derived figures, byte preservation, and first-line drift detection are sound choices, but their executable state and CLI models remain partly unwritten |
| Multi-Tenancy & Security | 20% | 8.4/10 | No tenant, auth, secret, network, dependency, telemetry, or push surface; public-claim integrity has a good mechanism once its contract is reconciled |
| Scope & Testability | 10% | 7.2/10 | Narrow scope and an adversarial fixture list, reduced by the harness’s absence from scope/conflict declarations and contradictory expected behavior |
| Migration & Rollback | 10% | 8.5/10 | Plain revert is credible; `--write` is bounded to one region, though its exact failure contract must be pinned |
| **Total** | **100%** |  | **7.100/10** | **ITERATE** |

Hard caps: none.

Clarity cap: the mechanical ≤7 condition does not independently fire—every FR has Targets, §11 maps all FRs, DO NOT exists, and Open Questions is empty. The assigned 6.6 reflects substantive ambiguity rather than the formal cap.

## Missing Pieces

1. Replace §7’s readiness-table parser paragraph with the state-only figure contract. Describe `_state/prds.json` as the only **figure source**, while acknowledging that real modes read the MDX target for sentinel validation or comparison.

2. Write one canonical invocation matrix covering default, `--print`, `--write`, and `--check`: accepted flag cardinality, reads, stdout/stderr, mutation, success status, sentinel-failure status and diagnostic, and invalid/combined flags. Default must read nothing; only the three flagged modes validate sentinels.

3. Define the consumed state schema and deterministic output: root/record validation, which element is “first,” exit 1 diagnostics, operator-gated/eligible ordering, and unknown or missing `autonomousClose` aggregated as successful `unclassified {count, ids}` with sorted IDs and no folding.

4. Perform the promised consistency sweep: remove `5.1s`; correct the changelog; narrow all generic “read-only” claims; replace the build row’s heading-id assertion; reconcile the two no-digit rules; and specify the exact H2 span, digit predicate, and MDX heading source syntax.

5. Add `scripts/verify/derive-figures.test-cases.mjs` to Implementation Scope and Conflict Surface.

## Iteration History

| Date | Iteration | Score | Verdict | Notes |
| --- | ---: | ---: | --- | --- |
| 2026-07-28 | 1 | 5.30/10 | ITERATE | Underivable scorer/review/stop figures, incorrect existing-lint account, and unresolved MDX embedding architecture |
| 2026-07-28 | 2 | 6.28/10 | ITERATE | Sentinel projection improved; corpus probe cut readiness iterations and exposed stale promises, digit conflict, missing lifecycle behavior, and fixture gaps |
| 2026-07-28 | 3 | 6.40/10 | ITERATE | Eight residual closures requested: state-only inputs, de-numbering, complete modes, narrowed read-only language, close-mode diagnostics, fixture harness, source heading assertion, and dated sequencing |
| 2026-07-28 | 4 | 7.10/10 | ITERATE | Figure pair re-derived successfully; fixture and sequencing closures hold, but stale normative text leaves the input, mode, mutation, close-mode, digit, and heading contracts contradictory |

## Verdict

**ITERATE — 7.10/10.**

The core design is now viable and the remaining figure pair is unassailable under the current state. This is not being held below PASS for cosmetic residue: the PRD currently gives incompatible instructions about what the script reads, how many modes exist, whether default validates sentinels, what malformed state means, and how unknown close modes are rendered. Those decisions directly change implementation and fixture expectations.

One disciplined consistency revision should be sufficient: make the intended contracts normative in FR-1/FR-2, then sweep §1, §6, §7, §8, §11, §12, Conflict Surface, and the changelog against them.


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 4 transcribed
> verbatim from a fresh independent Codex session; 6.40 → 7.10. Five pieces — residual
> restatements the author's sweeps kept missing plus the invocation-matrix and
> state-schema precision — applied the same day, this time grep-first. Lint EPERM is
> the documented sandbox artifact; out-of-sandbox green the same day.
