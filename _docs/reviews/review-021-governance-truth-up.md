# Independent Review: PRD-021 — Governance Truth-Up

> **PRD:** PRD-021
> **Verdict:** pass
> **Reviewer:** codex CLI session (independent of the implementing agent)
> **Tool/Model:** OpenAI Codex CLI, read-only sandbox — a different model family from the implementer (Claude Opus 5)
> **Base SHA:** a993345ac2ecc5ecd81a438e4305982b5f92fd15
> **Diff range:** a993345..HEAD
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single cross-model reviewer, two rounds)
> **Rounds:** 2 — both returned DO NOT CLOSE; every finding remediated
> **Date:** 2026-07-27

**The severity counts are OUTSTANDING findings.** Twelve were raised across two rounds and
all twelve are fixed. Two more were found by the implementer's own checks — one before the
confirming round ran, one by the Phase 6 spec-vs-code audit — and are recorded here with
the rest, because their provenance does not change what they were.

## Method

Two read-only rounds by a different model family, each scoped to the diff.

**The brief mattered more than usual, and it was chosen from evidence.** This item's
specification absorbed fifteen readiness iterations, and the last five share one shape:
each round found exactly one defect, and **every one was created by the fix for the round
before it** — a rule corrected in the section that owned it while the old version survived
elsewhere. So round 1 was briefed as a **consistency sweep across named surfaces** rather
than a defect hunt: for each of seven rules, does every place that states it say the same
thing — the code, its doc comment, the tests, the PRD, the changeset, `AGENT_BOOTSTRAP.md`,
the practices template, and the plan.

That framing produced ten findings, two of them "states it two ways" and one a production
defect the entire test suite had missed. A defect hunt would have found the third and
plausibly none of the rest.

## Round 1 — ten findings

| # | Finding | Likelihood | Resolution |
| - | ------- | ---------- | ---------- |
| 1 | **A bare integer total was accepted.** `Value: 4 (…)` parsed as 4.00 and failed as a **mismatch** against 4.10, sending the author to re-derive numbers that were never wrong. FR-2 requires malformed | routine | Grammar tightened; the missing reject fixture added |
| 2 | **The `enforceFrom` validation message said the opposite of the rule.** It reused the `countOrZero` spec, whose text is "0 disables it"; for a cutoff, 0 means *enforce from the very first item* | routine | A dedicated `cutoff` spec. `memory.retroAfterCompleted` keeps `countOrZero` and its correct wording |
| 3 | **An all-rejected Conflict Surface read as "declares no Conflict Surface."** `candidateFromPrd` returned null when no glob survived, so an author whose every token was malformed was told they had declared nothing — the one message that hides the reason | routine | The candidate now carries its rejections; `open.ts` refuses naming each |
| 4 | **A test that could not fail.** The "declaring axes drops a default `enforceFrom`" case supplied its own `enforceFrom`, and the shipped default has none — merge and replacement both produced 4 | routine | Rebuilt around the weights, where the two behaviours actually differ |
| 5 | **A test asserting against a copy of its own parser.** The changeset quote-style case duplicated the front-matter regex locally, so breaking the real `entries()` would not have failed it | routine | Drives the real parser over a temp directory |
| 6 | **`AGENT_BOOTSTRAP.md` still said the recompute "lands in wave 2"** — the governance truth-up leaving intact the false claim about **itself**. `verify:doc-claims` passed it because the sentence carries no `verify:*` token | routine | Corrected, with the configurable axes, the presence-triggered default and this repo's opt-in now documented |
| 7 | **A comment stating a falsehood about the thing this PRD measures.** `validate.ts` claimed the shipped weights sum to `0.9999999999999999`; they sum to exactly 1 | routine | Replaced with a set that genuinely exhibits the hazard |
| 8-10 | **Three edited files outside the Conflict Surface** — `core/run/open.ts`, `core/state/index.ts`, `test/cli-state.test.ts` — and `open.ts` was declared "read-only, no behavior change" while FR-13(c) edits it | routine | All three claimed; the superseded note corrected |

## Round 2 — two findings, both inside the remediation

| # | Finding | Likelihood | Resolution |
| - | ------- | ---------- | ---------- |
| 11 | **"The notes reach every refusal path" was false.** The insertion reached 4 of 12 refusal sites; ordinary overlap refusal and gate-policy failure dropped them. A claim exceeding its mechanism, in the work item about claims exceeding their mechanisms | routine | All 12 carry them. It matters most where they were missing: an author refused for an overlap is already re-reading their surface |
| 12 | **Two stale restatements of the total grammar, one edit from the fix that created them.** The doc comment still said "one or two decimal places, **or none**" after a bare integer had been made malformed, and the diagnostic said "at most two decimal places" — which reads as though none were fine, the case it rejects | routine | Both corrected; the message now says what the accepted form IS |

Round 2 also independently found the exponent hole below; its snapshot predated the fix and
it said so.

## Found by the implementer's own checks

| # | Finding | How |
| - | ------- | --- |
| 13 | **Exponent notation passed.** Tightening the bare-integer case left the total captured as a *number shape*, so `4.1e0` matched as `4.1`, scored 4.10 and passed — through the same paragraph of FR-2 the fix was answering. A numeric capture silently truncates, making "malformed" mean the prefix a regex liked rather than what the author wrote | Self-check before the confirming round; the capture now takes the whole token |
| 14 | **`STATUS.md` said the deferral cap was "gate-enforced in wave 2"** while `verify:deferred` runs. The practices template — the ADOPTER's copy — already said "gate-enforced by verify:deferred". The correct version was preserved on the side nobody reads | Phase 6 spec-vs-code audit (task 14.4) |

## Intentional non-edits, recorded rather than silent

FR-10 names `practices/brain/PROTOCOL.md` and `practices/templates/STATUS.template.md` as
targets; neither is in the diff. Both were opened and both were already correct **for an
adopter**: the pack's PROTOCOL says enforcement "ships with the `verify:*` library", which
is true of a repository that receives the script and wires it, where ours says it is wired
here. The pack-drift ledger was reconciled after reviewing all 49 pairs rather than the
divergence being propagated.

## Verdict

**pass.** Fourteen findings, zero outstanding. 1024 tests across 49 files; types, lint,
build, `verify:workflow`, `check --wiring` and `check --value-score` all green.

**What this review is really evidence about.** Nine of the fourteen are the same defect: a
rule corrected in one place and left standing in another. It appeared in prose sections
during readiness, then in a code comment, an error message, a regex capture group, a
validation spec borrowed from a neighbour, and a claim in the task plan. The `_brain`
record this PRD produced was written after five instances and named only prose; it has been
extended, because the four that followed were code.

The cheapest instruction in this whole cycle was five words in the review brief — *sweep
for stale copies instead* — and it is now task 14.2 of the plan rather than something the
next round has to rediscover.
