---
name: score-must-equal-weighted-sum
description: >-
  A declared triage/readiness score must be machine-checked to equal Σ(dimensions×weights),
  or authors round the total up to clear the threshold.
type: gotcha
scope: workflow
status: active
links: [false-green-on-missing-file]
provenance: workflow-seed
---

When a workflow gates on a numeric score composed from sub-scores (value triage, readiness
rubric), and the total is hand-written by the author, the total drifts _upward_ toward the
passing threshold. An audit of one such rubric found 19 of 55 declared totals mismatched
their sub-scores — every single one inflated upward (threshold-survival bias).

**Why:** the author is incentivized to pass, and a hand-computed weighted sum is easy to
"round" in their favor; nobody re-derives it, so the inflated number becomes the gate input.
**How to apply:** Make the score mechanically re-derivable. A check recomputes the total
from the declared per-dimension sub-scores and their fixed weights, and **refuses** a
declared total that doesn't re-derive (small float tolerance allowed) — the author must
fix the line; the gate never silently substitutes its own number.
