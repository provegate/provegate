---
name: scope-out-the-layer-the-rounds-keep-hitting
description: >-
  When successive reviews put every defect in one layer while measuring the rest exact, they
  are locating a scope error and reporting it as a run of design errors.
type: gotcha
scope: workflow
status: active
links: [score-band-prescribes-the-action, a-rule-corrected-survives-where-it-is-restated]
provenance: PRD-029
watch: [_readiness/**, _prds/**]
---

A per-round review can only produce a defect list. That is the shape of the instrument, not
a judgement about the work. So when four consecutive rounds put **every mechanism defect in
one layer of an item** while re-measuring the layers beneath it as exact and calling them
strong, the reviews are not describing four design failures — they are locating a **scope
error** and reporting it in the only vocabulary they have.

Measured on PRD-029. Rounds 2–5 scored 5.73, 5.90, 5.63, 4.53, and every blocking finding
was in the store-lifecycle layer: an upgrade path that could not terminate, an exception that
permanently blocked `init`, a receipt whose own preflight status broke under either reading,
an activation predicate the config loader erased. The dispositions, the token grammar and the
derived value set beneath them were measured exact in the same rounds. Three remediations
each closed the named counterexample and produced a new one in the same layer.

Removing the layer scored 6.03 and then 8.35, and **nothing new was designed after the cut** —
the remaining work was sweeping one rule everywhere it is restated.

**Why:** a remediation is written by whoever received the findings, and findings arrive as
items. Answering them item by item keeps the layer and repairs it; the option of not having
the layer never appears on a defect list, because no reviewer's job is to propose deleting
scope.

**How to apply:** at every re-score, plot where the findings landed, not only what they said.
If two rounds cluster in one layer while the rest measures clean, ask what the item promises
that it could stop promising. A promise not made is not a gap; a broken promise is. And read
the band's prescribed action — see [[score-band-prescribes-the-action]], which is the
mechanical version of the same signal.
