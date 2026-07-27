---
name: score-band-prescribes-the-action
description: >-
  A readiness score's band names the required action; a trajectory flat inside one band means
  the wrong band's action is being applied, not that the document is nearly there.
type: gotcha
scope: workflow
status: active
links: [a-rule-corrected-survives-where-it-is-restated, scope-out-the-layer-the-rounds-keep-hitting]
provenance: PRD-029
watch: [_readiness/**]
---

`prompts/phase-2-readiness-scorer.md` maps every score to a **required action**, not only to
a verdict: 6–7.9 is "iterate on identified gaps, re-score after improvements", and 4–5.9 is
"Major rework needed. **Return to Phase 1**". The verdict is `ITERATE` in both bands and the
action is not the same. Read the band, not the verdict.

Measured on PRD-029: five consecutive independent rounds scored 4.48, 5.73, 5.90, 5.63 and
4.53 — **every one inside 4–5.9, not one ever in 6–7.9** — and every one was answered with
the 6–7.9 action. The sixth round was the first to read the table, and taking the band's own
action (cut the scope, return to Phase 1) moved the next score to 6.03 and the one after to
8.35. The five rounds before it moved a total of 0.05.

**Why:** a score that stays flat while defects keep being fixed is diagnostic. Each round's
findings were real and each remediation closed them, so the flatness cannot mean the work is
bad — it means the work is aimed at the wrong level. Iterating repairs a document; the lower
band exists because some documents are not repairable by iteration, and the table already
knows which.

The corollary is how to read a review's output. Across four rounds every mechanism defect
landed in one layer of the item while the layers beneath it were re-measured exact and
called strong. **The reviews were locating a scope error and reporting it as a sequence of
design errors**, because a defect list is the only shape a per-round review has. Nobody was
wrong; the instrument reports position, and reading the position across rounds is a separate
act from remediating the findings.

**How to apply:** at every re-score, look up the band's action before reading the findings.
If two consecutive rounds land in the same band, stop remediating and ask what the band
prescribes — and if the findings across those rounds cluster in one layer while the rest
measures clean, treat that as a scope signal rather than a defect run. See
[[scope-out-the-layer-the-rounds-keep-hitting]] for what to do with it.
