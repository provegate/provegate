# Readiness Assessment: PRD-037 — Case Study, Part Two: the Tool's Own Ledger

**ITERATE — 5.30/10.** The central evidence contract is not currently implementable without choosing undocumented data semantics and an MDX-generation architecture. Several required figures are not reliably derivable from the declared committed sources.

## Quick Meta

| Field | Value |
| --- | --- |
| Score | 5.30/10 |
| Verdict | ITERATE |
| Iteration | 1 |
| Model Tiers | Execution: high; Audit: high |
| Scored by | GPT-5 via codex-cli — fresh independent session |
| Self-scored | no |
| Date | 2026-07-28 |
| PRD Lint | waived/green — exact CLI invocation hit the documented read-only `EPERM` while opening `_state/prds.json.80508.tmp`; the built read-only `lintPrd` equivalent returned `{"ok":true,"issues":[]}`; relying on the orchestrating session’s out-of-sandbox green run on 2026-07-28 |
| State Record | pending |

## Model Tier Recommendation

| Phase | Tier | Rationale |
| --- | --- | --- |
| Phase 4 — Execution | high | The code volume is small, but the work defines a public evidence contract over heterogeneous historical artifacts. Silent miscounting is the primary failure mode. |
| Phase 6 — Audit | high | Audit must independently rederive every published value, mutation-test the drift gate, and verify that unsupported history was omitted rather than inferred. |

## Analysis

### 1. Technical Depth & Architecture

**[FINDING — Technical Depth; executed] FR-1 mixes clean state fields with figures that have no normalized source or defined derivation.** `_state/prds.json` records status, close mode, final readiness score/verdict, and artifact paths, but no readiness-round count, scorer-session identity, review-round count, historical critical count, stop identifier, or resume relationship (`_state/prds.json:5-40`). The probe over the current snapshot produced 29 `Ship Verified` records, split 27 operator-gated and 2 eligible. Those figures are directly derivable. The remaining claims are not uniformly so.

| Claimed figure | Derivability judgment | Evidence |
| --- | --- | --- |
| PRDs Ship Verified | Reliable | Exact `status === "Ship Verified"` predicate exists in state (`_state/prds.json:9-12`). |
| Operator-gated versus eligible closes | Reliable if restricted to Ship Verified | `autonomousClose` is structured beside status (`_state/prds.json:9-12`). |
| Readiness iterations total and maximum | Ambiguous | Summing Quick Meta ordinals over Ship Verified records gives 83 with maximum 10; summing all 30 completed readiness files gives 89 because superseded PRD-023 contributes six rounds (`_state/prds.json:820-841`). FR-1 never chooses the corpus. |
| ITERATE→PASS trajectories | Partial only | PRD-012 carries a complete three-row history (`_readiness/completed/readiness-012-web-design-adoption.md:105-111`), while PRD-008 reports iteration 2 but has only a later amendment, not two scored history rows (`_readiness/completed/readiness-008-lease-commands.md:8-17,97-123`). |
| Distinct independent scorer sessions | Not reliably derivable | Early artifacts identify a self-scoring session (`readiness-008-lease-commands.md:13-14`); PRD-017 says only “independent agent” without stable identity (`readiness-017-agent-memory-substrate.md:13-14`); only later artifacts sometimes record session IDs. Labels cannot be deduplicated into distinct sessions. |
| Review rounds total | Not reliably derivable | PRD-001 encodes three rounds in quorum prose and narrative (`_docs/reviews/review-001-config-state-locks.md:10-21`); PRD-008 has no round field (`review-008-lease-commands.md:3-10`); PRD-016 combines four Codex rounds with two independent sessions and their own re-verifications (`review-016-practices-pack.md:5-12,34-49`). No closed counting rule resolves these shapes. |
| Criticals closed | Not reliably derivable as an aggregate | Review headers record outstanding `Critical: 0`, while narrative records historical findings—for example four criticals in PRD-001 (`review-001-config-state-locks.md:7,17-21`). Other artifacts use P1/High/blocker taxonomies. FR-1 does not define equivalence or deduplication. |
| Gate-chain stops resumed | Not derivable from the declared committed sources | Local `_state/prd-metrics.jsonl` contains apparent stop/pass sequences (`:20-22`, `:72-75`, `:228-246`), and a probe found 32 stopped events followed by later same-phase passes. However, `git ls-files --error-unmatch _state/prd-metrics.jsonl` failed: the file is untracked and absent from a fresh clone. It also lacks run IDs or an explicit `resumedFrom` relation. |

This conflicts with FR-1’s mandatory figure list (`_prds/wip/prd-037-case-study-self-hosting.md:100-109`). The later instruction to omit unsupported figures (`:166-169`) does not resolve the conflict; it gives the implementer discretion to violate FR-1.

**[FINDING — Technical Depth; executed] FR-3 does not extend an existing figure-tracing mechanism.** The current `verify-doc-claims.mjs` scans six governance documents (`scripts/verify/verify-doc-claims.mjs:43-53`) and rejects lines that combine a wired script token with a future marker (`:130-157`). It neither scans the case study nor evaluates figures nor invokes another script. The executed baseline reported “6 document(s) scanned” and passed.

The actual existing figure discipline is in `packages/provegate/test/content-launch.test.ts`: evidence-page percentages are traced to the research source (`:75-110`), and four origin figures are asserted across the case study and whitepaper (`:126-142`). Calling `verify:doc-claims` “PRD-004’s figure-tracing lint” at PRD lines 43-45 and 118 is factually wrong and conceals a new checker architecture.

**[FINDING — Clarity] “The doc embeds the script’s output” leaves a blocking design decision unresolved.** The case study is a static MDX file with no import or generated region (`apps/docs/content/docs/case-study.mdx:1-67`). The docs build is only `next build`; there is no generation hook (`apps/docs/package.json:7-13`). The declared implementation scope names only the script, MDX file, and existing verifier (`_prds/wip/prd-037-case-study-self-hosting.md:185-191`).

An implementer must choose among materially different designs:

- a committed generated block with sentinels;
- a build-time generated include;
- an MDX component importing derived data;
- or a verifier comparing manually pasted output.

Those choices change targets, tests, build behavior, maintenance, and rollback. They also expose a contradiction: FR-1 says no stored figure exists anywhere (`:107-109`), while FR-2 requires rendered figures in a committed document (`:111-117`).

### 2. Edge Cases & Failure Modes

**[FINDING — Completeness] Corpus membership and missing-history behavior are undefined.** A completed readiness artifact can belong to a superseded rather than shipped item (`_state/prds.json:820-841`). Some shipped records have incomplete task or summary state, and historical readiness formats vary. FR-1 must say whether each metric is computed over Ship Verified items, every completed readiness artifact, or every record, and whether malformed or missing metadata fails the whole derivation or excludes one metric.

**[FINDING — Completeness] Review counts lack a closed grammar and can double-count narrative restatements.** PRD-001 repeats its historical critical count in summary and finding rows (`review-001-config-state-locks.md:17-34`). PRD-016 describes Codex rounds, Sonnet rounds, and closure re-verification in overlapping prose (`review-016-practices-pack.md:16-49`). A regex over “Round” or “critical” will count headings, summaries, and restatements rather than events. No source-precedence rule, required metadata field, or deny fixture is specified.

**[FINDING — Scope & Testability] FR-3 omits the existing checker tests from its Targets.** `doc-claims-script.test.ts` executes the verifier in a fixture repository and provides exactly the six files in its current scanned set (`packages/provegate/test/doc-claims-script.test.ts:31-80`). Extending the script to require state, readiness, reviews, a case-study document, or the derivation script changes that fixture contract. Yet FR-3 targets only `verify-doc-claims.mjs` (`_prds/wip/prd-037-case-study-self-hosting.md:118-122`). No test is required for a stale value, missing figure, duplicated generated region, extra digit, malformed artifact, or derivation failure.

**[FINDING — Scope & Testability] Several §11 commands do not prove their claimed outcomes.** A docs build does not assert the expected heading ID, and `pnpm verify:doc-claims` currently cannot prove either figure equality or “no unsourced digit outside the table” (`_prds/wip/prd-037-case-study-self-hosting.md:250-257`). The source needs explicit assertions or a checker mode whose exit status covers those predicates.

**[FINDING — Scope & Testability; executed] The conflict conclusion currently holds, but its supporting prose is stale.** The active PRD-027 lease owns web/design/announcement paths and does not overlap this PRD (`_state/locks/prd-027-landing-adoption-polish.json:9-39`). The board-active PRD-031 surface is also disjoint (`_prds/wip/prd-031-autonomy-mode-method-policy.md:522-544`). However, PRD-037 describes PRD-026 as in flight (`_prds/wip/prd-037-case-study-self-hosting.md:173-176`) while state records it Ship Verified (`_state/prds.json:931-934`). This is not a current overlap blocker, but the sequencing statement must be refreshed.

### 3. Maintainability & Developer Experience

**[FINDING — Maintainability] The “cannot go stale” claim reverses the actual maintenance contract.** If the MDX contains a committed projection, every later Ship Verified transition changes at least the shipped-count and close-mode figures. `verify:doc-claims` will then intentionally make unrelated future work red until the case study is regenerated. That can be a valid design, but the PRD supplies neither an update command nor ownership/order for that recurring operation. If figures are instead generated only at build time, the required build integration and deployment inputs are absent from scope.

**[FINDING — Clarity] The formal PRD shape passes, but the executable semantics do not.** Every FR has Targets, §11 contains runnable command tokens, the DO NOT section exists, Open Questions is explicitly empty, and no TBD marker exists (`_prds/wip/prd-037-case-study-self-hosting.md:195-197,250-279`). Therefore no formal Clarity cap or lint cap applies. The score remains below 7 because the core source predicates and embedding mechanism are undecided.

**[FINDING — Multi-Tenancy & Security] No repository hard cap fires, but figure honesty is below readiness.** The work adds no runtime dependency to `packages/provegate`, push path, network call, telemetry, protected tenant surface, or method content (`_prds/wip/prd-037-case-study-self-hosting.md:270-279`). Nevertheless, the feature’s public trust claim depends on figures that the declared inputs cannot reproduce. Publishing heuristic counts as “recomputed evidence” would violate the PRD’s own honesty boundary even though conventional security surfaces are untouched.

The existing case study models better discipline: it labels evidence provenance up front (`apps/docs/content/docs/case-study.mdx:6-11`), places caveats beside claims (`:20-21,36-37,44-45`), and closes with explicit non-claims (`:62-67`). FR-4 preserves that intent, but FR-1 does not yet provide equally defensible data.

### 4. Migration & Rollback

**[FINDING — Migration & Rollback] Plain revert is plausible only after the delivery architecture is chosen.** Reverting three files is sufficient for a committed static block, but not for a build-generated include or MDX component, which would require additional build/config/component targets. Conversely, a committed projection needs an atomic update and rollback contract covering the derived block, verifier mapping, and tests. The one-line rollback at PRD line 171 assumes away the unresolved architecture.

No stored schema or remote migration exists, so data rollback risk is low. The missing piece is operational migration: how later Ship Verified transitions refresh the published projection without producing persistent red gates or undocumented manual edits.

## Scorecard

| Dimension | Weight | Score | Weighted | Notes |
| --- | ---: | ---: | ---: | --- |
| Clarity | 15% | 6.5/10 | 0.975 | Strong document shape and explicit targets, but undefined corpus predicates and embedding architecture |
| Completeness | 20% | 4.5/10 | 0.900 | Several mandatory figures lack reliable committed sources; tests and recurring update workflow omitted |
| Technical Depth | 25% | 4.5/10 | 1.125 | No normalized metric model, source precedence, shared derivation boundary, or concrete MDX binding |
| Multi-Tenancy & Security | 20% | 5.0/10 | 1.000 | Critical repository rules respected; central figure-honesty guarantee is not supportable |
| Scope & Testability | 10% | 6.0/10 | 0.600 | Narrow file surface and runnable commands, but commands do not discriminate several claimed outcomes |
| Migration & Rollback | 10% | 7.0/10 | 0.700 | No state/schema migration; revert is easy once architecture and regeneration lifecycle are specified |
| **Total** | **100%** |  | **5.300/10** | **ITERATE** |

Hard caps: none. The verdict follows the weighted score and the unresolved evidence architecture, not a hard cap.

## Missing Pieces

1. Replace FR-1’s prose list with a per-figure contract table naming the JSON key, label, exact corpus predicate, authoritative source, parser grammar, computation, exclusions, and missing/malformed-input behavior.

2. Keep only presently reliable figures—Ship Verified count and Ship Verified close-mode split—unless normalization work is added. For readiness totals, explicitly choose Ship Verified artifacts or all completed readiness artifacts and state how superseded PRDs are treated.

3. Remove “distinct independent scorer sessions” or add a normalized, stable session identifier to readiness artifacts plus an explicit historical migration. Free-text `Scored by` labels are not deduplicable evidence.

4. Remove aggregate review rounds and criticals-closed figures or introduce normalized review metadata with event identity, round count, historical severity counts, taxonomy, and deduplication rules. Do not infer these from narrative prose.

5. Remove gate-chain stops resumed from this PRD unless a committed event ledger is added to scope. Such a ledger needs run/attempt identity, stop event identity, explicit resume linkage, coverage start, schema validation, and fresh-clone availability. The current local metrics JSONL is untracked and insufficient.

6. Choose the MDX delivery mechanism in the PRD. Recommended: a committed canonical generated region delimited by unique sentinels, with one command that prints the region and a check mode that compares it byte-for-byte. Revise “no stored figure exists” to acknowledge the committed projection and document when it must be regenerated. If build-time generation is chosen instead, add every component/config/build target and fresh-build test.

7. Specify a single shared derivation implementation used by both the CLI-facing script and the drift verifier. Do not duplicate metric logic or parse the human-formatted Markdown output when stable JSON is available.

8. Rewrite FR-3 against the current checker reality: preserve the existing future-claim predicate, add the case study as a separate explicitly named claim surface, define generated-region parsing and exact equality, and state how derivation failures propagate.

9. Add `packages/provegate/test/doc-claims-script.test.ts` and `packages/provegate/test/content-launch.test.ts` to Targets and Conflict Surface. Require fixtures for correct output, one changed value, missing/duplicate region, extra digit outside the region, malformed state, missing readiness/review input, and preservation of the existing future-claim behavior.

10. Add §11 rows that actually assert the stable heading ID and run the targeted checker tests. A successful docs build alone is not an ID assertion.

11. Correct the historical claim: PRD-004’s origin-figure tracing lives in `content-launch.test.ts`; `verify-doc-claims.mjs` came later and currently checks wired scripts described as future work.

12. Refresh sequencing: PRD-026 is Ship Verified; the current active PRD-027 lease and board-active PRD-031 surfaces are disjoint. Retain the required pre-Phase-3 queue/lease recheck.

13. Expand rollback to cover the selected generated-region/build mechanism, shared derivation module, verifier changes, and tests atomically. Document how future state changes refresh or intentionally invalidate the published projection.

## Iteration History

| Date | Iteration | Score | Verdict | Notes |
| --- | ---: | ---: | --- | --- |
| 2026-07-28 | 1 | 5.30/10 | ITERATE | Independent adversarial review found underivable scorer/review/stop figures, an incorrect account of the existing lint, and an unresolved MDX embedding architecture |

## Verdict

**ITERATE — 5.30/10.**

The narrative goal is strong and the existing case study provides an appropriate honesty model, but the proposed “evidence by execution” cannot yet reproduce its own required figure set from a fresh clone. Phase 1 must first narrow the figures to supported data or add normalized committed evidence, then specify one concrete MDX projection mechanism and mutation-tested binding.


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 1 transcribed
> verbatim from a fresh independent Codex session. The scorer ran its own derivation
> probe over the committed artifacts and established which promised figures are NOT
> reliably derivable (scorer-session dedup, review-round/critical aggregates, resumed
> stops) — the draft's figure list overreached its own "omit, never estimate" rule.
> Score band 4-5.9 = Phase 1 rework: the figure set narrows to what the artifacts
> support, and the MDX delivery mechanism gets decided (committed sentinel region).
> Lint EPERM is the documented sandbox artifact; out-of-sandbox green the same day.
