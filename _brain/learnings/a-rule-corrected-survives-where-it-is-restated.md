---
name: a-rule-corrected-survives-where-it-is-restated
description: >-
  Correcting a rule in the section that owns it leaves the old rule stated elsewhere; brief
  the next reviewer to sweep for stale copies rather than to hunt for defects.
type: gotcha
scope: workflow
status: active
links: [two-parsers-wrong-together, evidence-pattern-satisfied-by-the-template]
provenance: PRD-021
watch: [_prds/**, _readiness/**]
---

A long-lived work item states each of its rules several times: in the FR that owns it, in
Technical Considerations, in Implementation Scope, in DO NOT, in Migration, in the Gherkin
criteria, in the verification table, and again in the changeset. That is not redundancy to
be removed — each restatement serves a different reader. It is a maintenance obligation
nobody names.

Measured across five consecutive independent readiness rounds on one item: **every round
found exactly one defect, and every one was created by the fix for the round before it.**
Not a new design error, not a fresh oversight — a rule corrected in its owning FR while the
old version survived somewhere else. Concretely: making weights-only configs legal left two
sections still saying both keys were mandatory; moving a parameter to fifth left the
rollback note saying fourth; specifying that callers omit the argument left three sites
saying they pass `null`. The scores moved 6.70 → 7.77 → 7.95 → 7.98 → 7.99, hundredths at a
time, because each round paid for one survivor.

The round that finally cleared the bar was briefed differently. Instead of "hunt for
defects it introduced", it was told: *for each rule, check whether every place that states
it says the same thing*, with the likely sections named. That round moved the score 0.10
and returned the first clean sweep.

**Why:** an author who corrects a rule is reading the FR that owns it. Nothing in that
reading surfaces the five other places the rule appears, and no gate compares two prose
statements of the same rule for agreement. The defect is invisible from where the fix is
made and obvious from anywhere else.

**It is not only prose.** The same item's implementation reproduced the pattern three more
times, and twice the survivor was code: a regex capture group and a `totalToHundredths`
parser each encoded half of one grammar rule, so tightening the parser left the capture
truncating input the rule now forbade; and an error string kept describing the old
acceptance while the doc comment above it kept the old wording. A rule lives wherever it is
restated, and a comment, a diagnostic message and a validation regex are all restatements.

**How to apply:** when a revision changes a rule, list every section that restates it
BEFORE editing, and edit them together — including the code comment, the error message, and
any second place the rule is enforced. When briefing a review round on a revised
specification, ask for a consistency sweep across named sections rather than a defect hunt
— the finding rate is the same and the class is different. And treat "the score is moving
by hundredths across rounds" as the signal: it means each round is paying for one survivor,
not that the item is nearly done.
