---
name: strictness-added-during-extraction-is-a-behavior-change
description: >-
  Extracting shared logic invites adding a "safer" guard the original lacked; treat the
  callers' existing tests as the spec and revert rather than adjust them.
type: gotcha
scope: workflow
status: active
links: [two-parsers-wrong-together, fixture-must-reach-production-shape]
provenance: PRD-022
watch: [packages/provegate/src/core/run/**]
---

Pulling a decision out of one caller so a second can share it is where added strictness
looks free. The extracted function is new code; a fail-closed guard reads as obviously
correct in isolation; and the requirement being satisfied ("unknowable input must refuse")
is usually written down somewhere, which makes adding it feel like compliance rather than
change.

Measured case. A drift check extracted from a claim path gained a loader call so a control
file nobody had parsed yet would refuse with a specific error instead of being compared by
hash. That is strictly safer in the abstract. It was also wrong: the original deliberately
treated a present-but-unparsed control file as **drift**, with a merge remedy, and the
callers' own loaders — running upstream of both call sites — were what failed closed on
parseability. The regression surfaced as one existing test asserting a refusal it no longer
got. The fix was to delete the guard, not to update the test.

**Why:** "fail closed" is a principle, not a location. Applying it inside a newly shared
function relocates a decision that already had an owner, and the new refusal is reachable
from a caller that never asked for it.

**How to apply:** write the rule into the extraction task before starting — *if an
existing test must be edited to pass, the extraction changed behavior; revert and redo.*
Then honour it under pressure, when the change looks like an improvement. Keep whatever
narrow guard covers a case the original genuinely misread (here: comparators reading
`null === null` as agreement), and state in the code why that one is different.
