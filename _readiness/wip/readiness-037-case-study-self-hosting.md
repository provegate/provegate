# Readiness Assessment: PRD-037 — Case Study, Part Two: the Tool's Own Ledger

**ITERATE — 6.28/10.** The delivery architecture is now substantially decided, but the narrowed figure set still cannot be derived under its own contract: 11 of 29 Ship Verified readiness artifacts have no Iteration History table, and the surviving tables do not share the stated row grammar.

## Quick Meta

| Field | Value |
| --- | --- |
| Score | 6.28/10 |
| Verdict | ITERATE |
| Iteration | 2 |
| PRD Class | feature |
| Scored by | GPT-5 via codex-cli — fresh independent session |
| Self-scored | no |
| Date | 2026-07-28 |
| PRD Lint | waived/green — `node packages/provegate/dist/cli.js check PRD-037` hit the documented sandbox `EPERM` opening `_state/prds.json.9047.tmp`; the read-only `lintPrd` equivalent returned `{"ok":true,"issues":[]}`; relying on the orchestrating session's out-of-sandbox green run on 2026-07-28 |
| State Record | unchanged — analysis-only rescore; `_state/prds.json` still records iteration 1 at 5.30 ITERATE |
| Repository Changes | none |

## Iteration 2 — Rework Review

| Rework piece | Status | Verification |
| --- | --- | --- |
| Per-figure contract table | **PARTIAL** | The PRD now names `shipVerified`, `closeModes`, and `readinessIterations` with sources and failure behavior: “a file whose table cannot be parsed is a named failure, never a zero” (`_prds/wip/prd-037-case-study-self-hosting.md:103-107`). The first two derive cleanly; the third makes the current repository fail. |
| Underivable figures cut | **PARTIAL** | FR-1 correctly says scorer sessions, review aggregates, and resumed stops are “cut, not approximated” (`:109-115`). The introduction still promises “independent-scorer counts,” “review rounds,” “criticals found-and-closed,” and resumed closes as numbers the reader can reproduce (`:35-39`). |
| Committed sentinel-region mechanism | **PARTIAL** | The architectural choice is made: unique sentinels, `--print`, `--check`, byte comparison, and first-differing-line failure (`:121-136`). The regeneration instruction merely says to rerun `--print`; no mode or exact operation replaces the committed region, and missing/duplicate sentinel behavior is not specified. |
| Stored-projection correction | **CLOSED** | FR-1 now states that “the committed doc region in FR-2 is a PROJECTION” and explicitly retracts the earlier “no stored figure” overclaim (`:116-119`). |
| Digits outside the generated table | **OPEN — NEW CONTRADICTION** | FR-2 requires “no digit outside the sentinels” (`:128-130`), while FR-4 requires the published section to state that failed rounds include “the 5.1s” (`:138-141`). The acceptance criterion also forbids a digit absent from FR-1 output (`:168-169`), and FR-1 does not output readiness scores. |
| Verifier hosting | **CLOSED for feasibility; OPEN for test coverage** | `scripts/verify/verify-doc-claims.mjs` is a synchronous top-level script with a resolved repository root and reporter, so it can host a child invocation of the derivation script. Its baseline passed: `6 document(s) scanned, 0 allowed`. However, its fixture copies only the verifier, helper, package file, and six governance documents (`packages/provegate/test/doc-claims-script.test.ts:31-80`); it does not provide the new script, state, readiness corpus, or case study. The test is absent from Targets and Conflict Surface. |

### Derivability Probe

| Figure | Result | Evidence |
| --- | --- | --- |
| `shipVerified` | **DERIVABLE** | Exact predicate `status === "Ship Verified"` yields **29** records. |
| `closeModes` | **DERIVABLE** | Over those 29 records, `autonomousClose` yields **27 operator-gated** and **2 eligible**, with no unknown or missing values in the current snapshot. |
| `readinessIterations` | **NOT DERIVABLE UNDER THE CONTRACT** | Only 18 of the 29 Ship Verified readiness artifacts contain an `## Iteration History` table. The other 11 are PRD-005 through PRD-011, PRD-013 through PRD-016. PRD-008 is especially dispositive: Quick Meta says iteration 2, but no history table exists (`_readiness/completed/readiness-008-lease-commands.md:3-15,97-123`). Strict implementation must therefore fail on the current repository. |

The stated grammar is also false about the corpus. Technical Considerations calls it “the `| date | iteration | score | verdict |` row shape the completed corpus actually uses” (`_prds/wip/prd-037-case-study-self-hosting.md:185-188`). Most tables instead use `| # | Date | Score | Verdict | Key Changes |`, for example PRD-001 (`_readiness/completed/readiness-001-config-state-locks.md:120-124`). PRD-035 uses the different `| Date | Iteration | Score | Verdict | Notes |` order (`_readiness/completed/readiness-035-adr-section-anchor.md:128-133`).

The ambiguity changes the result:

- Counting only data rows in the 18 existing history tables gives 72.
- Summing Quick Meta iteration ordinals across all 29 Ship Verified items gives 83.
- Combining history rows with Quick Meta fallback for the 11 missing tables gives 84, because PRD-024 includes a distinct `9b` row while Quick Meta reports iteration 9.

Thus “row count” is mechanically countable only after deciding whether a concurring `9b` assessment is an iteration and how table-less historical items participate. Those semantics remain unwritten.

The Superseded exclusion does work: PRD-023 is explicitly `status: "Superseded"` with a completed readiness artifact, so selecting Ship Verified state records first excludes it. The absent-artifact rule is also clear. Neither repairs the current missing-table case.

### Promise and Contradiction Sweep

Three stale promise classes survive:

1. The introduction still says the repository has run “30+” PRDs and that one script reproduces independent-scorer counts, review rounds, criticals, and resumed closes (`_prds/wip/prd-037-case-study-self-hosting.md:30-39`). The approximate `30+` is itself a typed self-hosting figure, while the other promised aggregates were expressly cut later.

2. FR-4's mandatory “5.1s” wording cannot coexist with FR-2's no-digit rule or §6's rule that every prose digit must occur in FR-1 output (`:128-141,168-169`).

3. The historical checker description remains wrong: the introduction still calls the current surface “PRD-004's figure-tracing lint” (`:41-45`). `verify-doc-claims.mjs` presently checks wired scripts described as future work (`scripts/verify/verify-doc-claims.mjs:2-35,130-186`); PRD-004's origin-figure assertions live in `packages/provegate/test/content-launch.test.ts`.

The sequencing text also remains stale. It describes PRD-026 among “all in-flight items” (`_prds/wip/prd-037-case-study-self-hosting.md:195-198`), while `_state/prds.json` records PRD-026 Ship Verified and `STATUS.md` names it as shipped.

### Testability and Operational Lifecycle

The direct checker architecture is feasible, but the verification contract remains incomplete:

- `packages/provegate/test/doc-claims-script.test.ts` and `packages/provegate/test/content-launch.test.ts` remain outside Targets, Implementation Scope, and Conflict Surface.
- No required fixture covers missing or duplicate sentinels, a stale byte, first-differing-line diagnostics, missing history tables, either historical table shape, `9b`, Superseded exclusion, unknown close modes, or a missing readiness artifact.
- `pnpm --filter docs build` proves that the MDX builds, not that the promised heading id remains exact.
- The cross-cutting floor says “added tests pass” (`_prds/wip/prd-037-case-study-self-hosting.md:281-286`) without specifying any added test file.
- `--print` emits content but does not update the committed projection. The regeneration rule needs either a write mode or an exact replacement procedure whose output is then checked.

No runtime dependency, push path, network call, telemetry, method-content change, tenant surface, schema migration, or repository hard cap is introduced. Plain revert remains credible once the actual test and regeneration surface is declared.

## Scorecard

| Dimension | Weight | Score | Weighted | Notes |
| --- | ---: | ---: | ---: | --- |
| Clarity | 15% | 6.8/10 | 1.020 | Figure table and MDX choice improve clarity, but the authoritative iteration grammar contradicts the corpus and the output rules contradict FR-4 |
| Completeness | 20% | 5.8/10 | 11 shipped artifacts cannot satisfy the required table source; stale promises, tests, and regeneration behavior remain |
| Technical Depth | 25% | 5.8/10 | State predicates and sentinel architecture are sound, but the historical parser model and iteration semantics are not implementable as written |
| Multi-Tenancy & Security | 20% | 6.4/10 | Repository critical rules are respected; public figure honesty still fails on the central readiness metric and surviving numeric claims |
| Scope & Testability | 10% | 5.7/10 | Small production surface, but required test surfaces and discriminating deny fixtures are omitted |
| Migration & Rollback | 10% | 8.0/10 | No state/schema migration; committed projection is revertible, though refresh and test-file ownership must be added |
| **Total** | **100%** |  | **6.280/10** | **ITERATE** |

Hard caps: none.

Clarity cap: **7.0 applies** because the authoritative source grammar for a required figure is unresolved and contradicts the current corpus.

## Missing Pieces

1. Cut `readinessIterations`, migrate all 29 Ship Verified artifacts to one canonical history-table grammar, or define a truthful alternative source. If Quick Meta is chosen, specify its integer-prefix grammar and decide explicitly whether concurring rows such as `9b` count.

2. Sweep the retracted figures through the introduction and historical-lint description. Remove `30+`, scorer counts, review aggregates, critical counts, and resumed-stop promises unless they are generated under a contract.

3. Resolve the direct no-digit contradiction: remove “the 5.1s” from required published prose, or derive and place that claim inside the generated region under an added figure contract.

4. Complete the generated-region lifecycle: define default versus `--print` output, require exactly one ordered sentinel pair, state missing/duplicate behavior, and provide an exact write/replacement procedure.

5. Add `packages/provegate/test/doc-claims-script.test.ts` and `packages/provegate/test/content-launch.test.ts` to Targets and Conflict Surface. Require fixtures for both table shapes, missing tables/artifacts, Superseded exclusion, `9b`, unknown close modes, stale bytes, missing/duplicate regions, first-line diagnostics, and preservation of the existing future-claim behavior.

6. Replace the docs-build-only heading check with an assertion for the exact heading id, and refresh the PRD-026 sequencing statement.

## Iteration History

| Date | Iteration | Score | Verdict | Notes |
| --- | ---: | ---: | --- | --- |
| 2026-07-28 | 1 | 5.30/10 | ITERATE | Independent adversarial review found underivable scorer/review/stop figures, an incorrect account of the existing lint, and an unresolved MDX embedding architecture |
| 2026-07-28 | 2 | 6.28/10 | ITERATE | Sentinel architecture and stored-projection correction verified; full-corpus probe found 11 Ship Verified artifacts without history tables, incompatible table grammars, surviving cut-figure promises, and a new `5.1s` versus no-digit contradiction |

## Verdict

**ITERATE — 6.28/10.**

The rework made real progress: two figures derive exactly, the Superseded exclusion is sound, the stored projection is acknowledged, and the sentinel-based checker architecture is feasible. It still cannot meet its central fresh-clone acceptance criterion because the required readiness-iteration derivation fails against the repository it is meant to describe. Return to Phase 1 to cut or redefine that figure, sweep the retracted promises, resolve the digit contradiction, and bind the mechanism to executable tests.
```


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 2 transcribed
> verbatim from a fresh independent Codex session; 5.30 → 6.28. Its probe found the
> history-table grammar varies across the 29 Ship Verified artifacts (concurring rows
> like `9b` included), so the rework CUTS `readinessIterations` rather than migrating
> 29 artifacts — the derivable pair remains, unassailable. Lint EPERM is the documented
> sandbox artifact; out-of-sandbox green the same day.
