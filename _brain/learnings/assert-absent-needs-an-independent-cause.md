---
name: assert-absent-needs-an-independent-cause
description: >-
  An assert-absent is only evidence when the absence has a different cause than the defect
  under test; verify it by removing the fix and checking the test actually fails.
type: gotcha
scope: workflow
status: active
links: [absence-must-be-asserted, fixture-must-reach-production-shape]
provenance: PRD-022
watch: [packages/provegate/test/**]
---

[[absence-must-be-asserted]] says a negative requirement needs an explicit assert-absent
step rather than a negated grep. Satisfying that is not sufficient. The next failure mode
is subtler: **the absence and the defect can share a cause**, and then the assertion is
green either way.

Measured case. A test asserted that a refused `gate run` produced no marker file, where
the marker is written by the phase-4 command configured in `gates.manifest.json`. The
scenario deleted that manifest. Remove the refusal being tested and the run proceeds — but
manifest load falls back to built-in defaults, phase 4 has no marker command, and the
marker is still absent. The test passed with the feature removed, while also asserting a
non-zero exit and a filename that appeared in an unrelated sentence. Every individual
assertion was true and the test proved nothing.

**Why:** an assert-absent is evidence only about the mechanism that *would* have produced
the artifact. When the scenario itself removes that mechanism, the assertion degenerates
into a tautology, and it does so silently — nothing about the test reads as weak.

**How to apply:** for every assert-absent, answer *what would have created this, and does
that creator survive the mutation?* If not, the assertion needs a different anchor —
usually the refusal's own distinguishing text, or a paired positive assertion elsewhere
showing the artifact DOES appear when the path is clear. Then prove it: revert the fix,
rebuild, and confirm the test fails. A mutation check that leaves a test green has found a
defect in the test, not evidence for the fix.
