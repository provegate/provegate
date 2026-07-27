---
name: docs-outlive-the-gate-they-promise
description: >-
  A document that describes a check as future work keeps describing it that way after the
  check ships; the stale direction is promise-still-standing, not promise-unkept.
type: gotcha
scope: workflow
status: active
links: [known-red-ledger-must-expire, a-rule-corrected-survives-where-it-is-restated]
watch: [AGENT_BOOTSTRAP.md, _brain/PROTOCOL.md, STATUS.md]
provenance: PRD-021
---

Governance documents describe tooling in the future tense while it is being planned: *"a
`verify:brain` script can require…"*, *"the mechanical check lands in wave 2"*. When the
tooling lands, the sentence is not revisited, because nothing about shipping a script sends
anyone back to the paragraph that predicted it. The document keeps promising what the
repository already enforces.

**The direction is the counter-intuitive part, and it was measured.** The expectation
before writing the checker was that documents would over-claim — describing gates that do
not exist. They did not. Of four "wave 2" claims in this repository's governance set, three
were already true and one was about genuinely future work; the two that mattered were the
inverse defect, calling a **wired, CI-running** script future work. So the rule that catches
real staleness is *"a shipped thing described as unshipped"*, and a checker written for the
intuitive direction would have found nothing.

The cost of the inverse defect is specific: a reader — human or agent — plans around a gap
that does not exist. They write the guard by hand, or they treat an absence as permission.
Someone reading *"until then the Phase 6 review enforces it by inspection"* concludes the
mechanical check is not there, and does the inspection instead of trusting the gate.

**Why:** the claim and its subject live in different files with no link between them, and
the moment that would prompt the correction — the check going green in CI for the first
time — happens in a place where nobody is reading prose.

**How to apply:** make the check's own existence the trigger. A line fails when it carries
**both** a script token that is wired *right now* (read the package manifest; do not guess)
and a future-tense marker from a closed list. Both halves are load-bearing: without the
wiring lookup every honest sentence about future work fails, and without the marker every
mention of a script does. Exclude fenced examples and dated history — a log entry that said
"wave 2" the day it was written stays true as history, and rewriting history to satisfy a
linter is the wrong direction.
