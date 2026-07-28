---
name: state-model-before-mechanism
description: >-
  A flat readiness trajectory means the item is being asked to specify something whose ground
  truth is unwritten — cut the scope, or write the state model, before remediating again.
type: gotcha
scope: workflow
status: active
links: [scope-out-the-layer-the-rounds-keep-hitting, a-rule-corrected-survives-where-it-is-restated]
provenance: PRD-030
watch: [_docs/design/**, _prds/wip/**]
---

When a specification describes a mechanism whose **ground truth is unwritten** — the complete set
of state transitions and the actor performing each — every remediation round repairs the
counterexample it was handed and creates the next one. The rounds are not converging on a design;
they are sampling an unwritten one.

The tell is a **flat trajectory across rounds**, not a low score. PRD-029 scored 4.48, 5.73, 5.90,
5.63, 4.53 over five rounds before anything moved.

**What actually ended it, recorded exactly because the tempting summary is wrong:** the turn came
at iteration 6 with a **scope cut** — the reconciliation layer was split out — and what moved the
score afterwards (6.03 → 7.48 → 8.35 PASS) was sweeping the retracted rule everywhere it was
restated. Not a state model. The split-out item then scored 4.50 on its own first round, in a
document that had to declare its own requirements a non-binding sketch to stay honest, and *that*
is where writing the state model first was adopted as the remedy.

**Why:** a remediation round is scoped to the counterexample it was given. Every fix is locally
correct and globally uninformed, because what would make it informed is exactly what nobody wrote.
Reviewers reward the local correctness, so the process reports progress while producing none.

**How to apply:** when the second round produces a new defect of the same class rather than a
narrower instance of the old one, stop remediating and ask which of the two causes you have.
**Scope too wide** — the item promises a layer it could stop promising; cut it, and then sweep the
retracted design out of every section that restates it (see
[[scope-out-the-layer-the-rounds-keep-hitting]] and
[[a-rule-corrected-survives-where-it-is-restated]]; this is the one with demonstrated evidence
behind it). **Ground truth unwritten** — make the state model itself the work item: enumerate
every transition, name the actor, and for each say what is read, what is written, and what an
interrupt leaves behind. Two forms of completeness count equally: an answered transition, and a
**recorded limit** whose impossibility is argued from a named constraint — and check that
argument, because a limit that is merely asserted reads identically to one that is derived.

**Status of the second remedy:** adopted on PRD-030, not yet demonstrated. It earns a claim here
when PRD-034 — the item written against the model — closes without a flat stretch of its own. If
it does not, this record is wrong and should say so.
