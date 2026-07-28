---
name: state-model-before-mechanism
description: >-
  A design whose state transitions are unwritten produces one new counterexample per remediation
  round; the tell is a flat score trajectory, and the fix is to make the model the work item.
type: gotcha
scope: workflow
status: active
links: [scope-out-the-layer-the-rounds-keep-hitting, a-rule-corrected-survives-where-it-is-restated]
provenance: PRD-030
watch: [_docs/design/**, _prds/wip/**]
---

When a specification describes a mechanism whose **state transitions have never been enumerated**,
each remediation round repairs the counterexample it was handed and creates the next one. The
rounds are not converging on a design; they are sampling an unwritten one.

The tell is measurable and it is **not** a low score — it is a **flat trajectory across rounds**.
PRD-029 scored 4.48, 5.73, 5.90, 5.63, 4.53 over five independent readiness rounds; the layer split
out of it scored 4.50 on its own first round, in a document that had to declare its own
requirements a non-binding sketch to stay honest. Six rounds, no trend, one cause.

**Why:** a remediation round is scoped to the counterexample it was given. Every fix is locally
correct and globally uninformed, because the thing that would make it informed — the complete set
of transitions and the actor performing each — is exactly what nobody wrote. Reviewers reward the
local correctness, so the process reports progress while producing none.

**How to apply:** when the second round produces a new defect of the same class rather than a
narrower instance of the old one, stop remediating. Make the state model itself the work item:
enumerate every transition, name the actor, and for each say what is read, what is written, and
what an interrupt leaves behind — then let the mechanism be specified against it. Two forms of
completeness count equally: an answered transition and a **recorded limit** whose impossibility is
argued from a named constraint. Score the limit, not the mechanism it declined to invent — see
[[scope-out-the-layer-the-rounds-keep-hitting]] for the sibling diagnosis at the layer level, and
[[a-rule-corrected-survives-where-it-is-restated]] for what happens to the retracted design if it
is annotated instead of deleted.
