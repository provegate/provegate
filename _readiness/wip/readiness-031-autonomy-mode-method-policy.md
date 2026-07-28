# Readiness Assessment: PRD-031 — Autonomy-Mode Method Policy

> **Iteration 3 (Codex, independent) — 8.88/10, PASS. All four iteration-2 pieces
> closed against live source; the traceability cap is clear.** Same orchestration
> disclosure (rework author orchestrates, Codex owns every verdict). The migration
> surface verified complete by repository-wide search (no remaining builder or count
> the enumerated-aware rule misses); **the approval binding held the decisive test** —
> the scorer read `acceptance.ts:219-288` and confirmed no contract-compliant path
> reaches green without an owner act: the residual (the gate accepts any non-empty
> `items` and cannot semantically verify a path name) is an honestly bounded
> ADR-0003 limitation, filed as a [P3] watch item rather than a finding, because the
> PRD never claims the machinery checks more than it does. FR-2/FR-4 assertions owned;
> the §7 survivor corrected everywhere operative. Scorecard 8.5 / 8.75 / 8.75 / 9.5 /
> 9.0 / 9.0 → **8.88**; Value 3.55 exact; §9 conforms; tiers high/high. Four watch
> items bind Phases 3/6. Trajectory: 5.78 → 7.40 → 8.88.
>
> <details><summary>Iteration 2 (7.40 ITERATE, Codex)</summary>
>
> **Iteration 2 (Codex, independent) — 7.40/10, ITERATE; up 1.62, four of seven pieces
> fully closed — and the method-content cap re-trips on a sharper reading of FR-1.**
> Scored the rework (`eb4e929`); same orchestration disclosure (rework author
> orchestrates, Codex owns every verdict). **Closed with citations**: mutation-checked
> enumeration coverage (renderer contract confirmed at `prompts.ts:595-613`),
> serialization vs 026/032, the re-founded chain (verified against `_state/prds.json`),
> the honest bundle note and the three corrected dispositions, and Value 3.55 with a
> rollback the scorer verified down to the `[unused]`-diagnostic behavior
> (`prompts.ts:621-650`). **Still open, both real:** (1) the first-enumeration
> migration reaches sites the rework did not name — five more in
> `content-placeholders.test.ts` (`:164,173,185,206,217`), plus `prompts.test.ts:289-292`
> and `init.test.ts:315-325,383-395`, which synthesize illegal `v-AUTONOMY_MODE` values
> and hardcode nine keys, in files absent from Targets; (2) **FR-1's approval proof can
> be self-issued** — the package test verifies approval-shaped *text*, so an
> agent-authored addendum saying "approved by the owner" passes without any owner act;
> the remedy is structural: an operator-owned task row plus a committed owner
> acceptance naming the exact addendum path, with the package assertion demoted to
> shape-and-clauses. Two smaller: FR-2/FR-4's §11 rows expect assertions in a test
> neither FR targets; one "no TypeScript file" survivor in §7. Scorecard
> 7.0 / 6.5 / 7.5 / 9.5 / 6.0 / 8.5 → 7.40.
>
> </details>
>
> <details><summary>Iteration 1 (5.78 ITERATE, Codex)</summary>
>
> **Iteration 1 (Codex, independent) — 5.78/10, ITERATE; band 4–5.9, so the prescribed
> action is Phase-1 rework (`score-band-prescribes-the-action`) — and unlike PRD-032,
> the item survives triage: honest Value recomputes to 3.55, above the 3.40 threshold.**
> Orchestration disclosure: the orchestrating session added two watch-required
> dispositions before the round (neither was faulted), verified the load-bearing
> citations, and authored no verdicts; Codex is the scorer and did not write the PRD.
>
> **The blocker is a self-contradiction: the declared text-only scope is impossible.**
> The first enumerated token in the registry necessarily moves
> `content-placeholders.test.ts`'s hardcoded expectations (20 registry rows, zero
> enumerations, nine required values; the clean-render fixture feeds `x` to every
> token, which the renderer rejects for an enumeration — `prompts.ts:595`), while the
> PRD forbids TypeScript changes. Beside it: FR-6's claimed missing-fragment package
> test does not exist (the live corpus asserts zero enumerations); FR-1's addendum
> verification is a false green (`content-prompts.test.ts` deliberately excludes
> `addenda/**` from the digest and hardcodes only A1); the Conflict Surface collides
> undeclared with PRD-026 (template + root bootstrap) and PRD-032 (root bootstrap); the
> dependency narrative carries the same staleness class PRD-032 scored 4.00 for
> (mechanism attributed to shipped PRD-030; it is Draft PRD-034's); and three
> pre-existing Memory Input rationales are ceremonial. **What held:** the enumeration
> architecture is used correctly per ADR-0002, FR-3 is source-accurate against the
> snapshot, the addenda mechanism is legal under `MANIFEST.md:50`, §9 conforms to the
> closed grammar, all caps clear (traceability conditionally — the addendum must land
> first, and the ordering must be proven by the repaired FR-1 test).

> </details>

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-031-autonomy-mode-method-policy.md` |
| Score                  | 8.88/10                                        |
| Verdict                | **PASS** — migration surface complete by repository-wide search, the approval structurally bound (operator-owned row + committed acceptance naming the addendum path; the gate's item-text blindness an honestly bounded ADR-0003 limit, watch-itemed), FR-2/FR-4 assertions owned, every cap clear. Four watch items bind Phases 3/6 |
| Iteration              | 3                                              |
| Model Tier (Execution) | high                                           |
| Model Tier (Audit)     | high                                           |
| Scored by              | **Codex (gpt-5.x) via the `/codex` skill — independent, different model family, did not write the PRD; orchestrated by a session that authored no verdicts** |
| Self-scored            | no                                             |
| Date                   | 2026-07-28                                     |
| PRD Lint               | passed — Codex ran the five-argument production shape `lintPrd(config, manifest, content, root, 31)` → `{ok:true}`; the orchestrator's `gate check PRD-031` exit 0 after the disposition fix |
| State Record           | updated — `gate status` re-run after saving    |

<!-- Verdict values: PASS | ITERATE | REJECT. The Score row and Verdict row are parsed
by the state builder — keep the `| Score |` and `| Verdict |` labels intact. -->

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Execution (Phase 4) | do not assign | band 4–5.9 |
| Audit (Phase 6)     | — | assign on a PASS |

---

## Analysis

### Findings — iteration 1 (Codex, independent)

**[P1] A — the text-only scope cannot pass the shipped corpus tests.** The first
enumerated token moves `content-placeholders.test.ts:96,103,107` (20 rows, zero
enumerations, nine values) and breaks the clean-render fixture (`:158` feeds `x`
everywhere; `prompts.ts:595` rejects it for an enumeration) — while the PRD forbids
TypeScript edits (`prd-031:215,488`). Remedy: the test file joins Targets/Surface, the
prohibition goes, the fixture picks a legal enumerated value.

**[P1] B — FR-6's package test does not exist.** The claimed both-fail behavior
(`prd-031:193`) is真 only for the renderer (`prompts.ts:605`); the corpus test asserts
zero enumerations and only fragment terminality. Remedy: corpus assertions for both
legal values' fragments, illegal-key rejection, rendered both-modes, and a
missing-fragment mutation check.

**[P1] C — FR-1's provenance verification is a false green.** §11 points at
`content-prompts.test.ts` (`prd-031:446`), which excludes `MANIFEST.md` and `addenda/**`
from the digest (`content-prompts.test.ts:449,472`) and hardcodes A1 only (`:460`) — the
row is green today with no addendum. Remedy: the test joins FR-1's Targets with a named,
non-vacuous new-addendum assertion (existence, owner/date/status, scope, manifest row,
the two authorized clauses).

**[P1] D — the surface is not schedulable as declared.** `prd-031:415,417` claim the
bootstrap template and root bootstrap; PRD-026 claims both (`prd-026:889,904`), PRD-032
the root (`prd-032:351`); none are `sharedAppendOnly`; Dependencies names only PRD-029
and the addendum. Remedy: explicit serialization vs 026/032; `gate queue` at claim.

**[P2] E — the dependency narrative carries PRD-032's staleness class**: mechanism
attributed to shipped PRD-030 (`prd-031:275`) where PRD-030 hands it to Draft PRD-034
(`prd-030:145,377`); the repo has no prompt store enabled. Rewrite §7 against the
shipped chain.

**[P2] F — the `verify:workflow` §11 note overclaims** (bundle runs standalone scripts
only, never package tests — `verify-workflow.mjs:15,65`). Describe honestly.

**[P2] G — three pre-existing dispositions are ceremonial or mismatched**
(`a-rule-corrected…` marked applied while the stale narrative survives;
`docs-outlive…` and `evidence-pattern…` rationales describe different defect classes
than the records). Correct rationales; the two watch-required entries added today and
`assert-absent…` were judged sound.

**[P3] H — Value 3.95 arithmetic exact but UI 5 / AR 4 overstated** (no migration of
existing stores, one-way manual install). Defensible: **3.55 (5/4/2/3/3)** — above
threshold, so the item keeps its candidacy on re-score.

### What held up

Enumerated tokens and terminal fragments used exactly per ADR-0002; required-value
derivation from rendered consumers confirmed (`prompts.ts:467,493`); neither
`AUTONOMY_MODE` fragment exists and the PRD correctly creates both; FR-3 source-accurate
(snapshot `phase-3:80` vs package `phase-3:92`); the addenda mechanism legal
(`MANIFEST.md:50`); §9 exactly `- (none)`; §11 rows syntactically runnable with the
whole-suite row on turbo; five-argument lint green; no watch-required disposition
missing.

---

## Scorecard

Class `infra` weights.

| #         | Dimension                | Weight | Score  | Notes |
| --------- | ------------------------ | ------ | ------ | ----- |
| 1         | Clarity                  | 15%    | 5.5/10 | policy crisp; the implementation contract contradicts itself |
| 2         | Completeness             | 20%    | 5.0/10 | the enabling test changes are forbidden by the document that needs them |
| 3         | Technical Depth          | 20%    | 6.0/10 | correct architecture use; verification layer under-derived |
| 4         | Multi-Tenancy & Security | 10%    | 9.0/10 | no tenant/auth/data surface |
| 5         | Scope & Testability      | 15%    | 5.0/10 | key rows false-green or nonexistent |
| 6         | Migration & Rollback     | 20%    | 5.5/10 | no rollback statement for the first-enumeration change |
| **Total** | **Weighted**             |        | **5.78/10** | **ITERATE — Phase-1 band** |

Hard caps: security, contract, lint, runtime-dependency, push-path clear;
method-content traceability **conditionally clear** (the owner-approved addendum must
land first and the repaired FR-1 test must prove the ordering).

---

## Missing Pieces (binding on the Phase-1 rework)

1. `content-placeholders.test.ts` into Targets/Surface with specified expectation
   changes; the no-TypeScript rule removed.
2. Mutation-checked enumeration coverage (both legal fragments, illegal key, missing
   fragment, terminality, rendered output).
3. `content-prompts.test.ts` into FR-1's Targets with a non-vacuous addendum assertion.
4. Serialization declared against PRD-026 and PRD-032.
5. Dependency narrative rewritten against the shipped chain (029 shipped / 030 state
   model / 034 owns reconciliation / 032 owns activation, itself at 4.00).
6. The `verify:workflow` claim and the three ceremonial dispositions corrected.
7. Value re-scored (3.55 defensible) + a rollback/reinstall statement for the
   first-enumeration change.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 3   | 2026-07-28 | 8.88  | **PASS** | **First PASS: 5.78 → 7.40 → 8.88; every cap clear.** All four iteration-2 pieces CLOSED against live source: the enumerated-aware builder rule applied at every site (repo-wide search found no survivor — `prompts.test.ts:291`, `init.test.ts:324`, the three censuses); **FR-1's approval held the decisive test** — `operatorGateOk`/`acceptanceFrom` (`acceptance.ts:219-288`) admit no contract-compliant ownerless path; the item-text blindness is a bounded ADR-0003 limit filed as [P3] watch, never overclaimed by the PRD; FR-2/FR-4 own their named assertions; the §7 absolute corrected everywhere operative. Zero new [P1]/[P2]. Scorecard 8.5/8.75/8.75/9.5/9.0/9.0 → 8.88; Value 3.55 exact; tiers high/high. **Watch items:** Phase 3 materializes the operator approval row (≥1 operator row in task state); Phase 6 inspects the committed acceptance for the exact addendum path; FR-1 lands and is approved before any method byte moves; `gate queue` + 026/032 serialization at claim. |
| 2   | 2026-07-28 | 7.40  | ITERATE | **Scored the rework `eb4e929`; four of seven pieces CLOSED** (mutation-checked enumeration coverage — renderer contract confirmed `prompts.ts:595-613`; 026/032 serialization; the re-founded chain verified against `_state/prds.json`; honest bundle note + three corrected dispositions; Value 3.55 with rollback verified to the `[unused]` diagnostic at `prompts.ts:621-650`). **Piece 1 PARTIAL**: the four specified fixture moves are not the complete set — `content-placeholders.test.ts:164,173,185,206,217` plus `prompts.test.ts:289-292` and `init.test.ts:315-325,383-395` (illegal synthesized `v-AUTONOMY_MODE` values, hardcoded nine-key sets) sit in files outside Targets. **Piece 3 PARTIAL → [P1]**: the direct-read addendum assertion is non-vacuous against today's tree, but it proves approval-shaped TEXT — an agent can self-issue it; the cap re-trips until approval is an operator-owned row plus a committed owner acceptance naming the exact path. [P2]: FR-2/FR-4 §11 rows expect `content-prompts.test.ts` assertions neither FR targets. [P3]: one §7 no-TypeScript survivor. 7.0/6.5/7.5/9.5/6.0/8.5 → 7.40. |
| 1   | 2026-07-28 | 5.78  | ITERATE | First independent round. The decisive finding is a self-contradiction: the first enumerated token in the registry necessarily moves the corpus tests the PRD forbids touching. Beside it: a claimed package test that does not exist, an addendum verification green without the addendum, undeclared surface collisions with 026/032, the 030→034 staleness class, and three ceremonial dispositions. Architecture use, FR-3's snapshot accuracy, and the addenda mechanism's legality all held. Honest Value 3.55 — above threshold, candidacy keeps. |

---

## Verdict

**ITERATE — 5.78/10, iteration 1, scored independently by Codex.**

The policy is right and the architecture fit is right; the implementation contract is
impossible as written, and the verification layer would report green without doing the
work. Phase-1 rework: admit the corpus-test surface, build the enumeration coverage the
claims assume, make the addendum provable, declare the serializations, and re-found the
chain narrative on what actually shipped. Remediate in a session other than this
scorer's orchestration if practical; then one independent round.
