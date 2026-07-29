---
name: recompute-beats-recorded-state
description: >-
  When an artifact is a pure function of known inputs, a reconciliation check recomputes
  it and compares bytes — recorded state (hash, receipt) only adds a second thing to go
  stale; the banner VERSION does the one job recomputation cannot.
type: convention
scope: workflow
status: active
links: [two-parsers-wrong-together, false-green-on-missing-file, known-red-ledger-must-expire]
provenance: PRD-034
watch: [packages/provegate/src/core/run/prompts.ts]
---

PRD-034's reconciliation check keeps **no stored hash and no receipt** (the state model's
T7 decision). `reconcilePrompts` recomputes the generated set from the installed package
and the current config — `generatedPaths()`, the same pure function the installer uses —
and compares bytes on disk. Detection is entirely recomputation: a receipt would answer
"which paths did this tool generate?" with a record that a second write must keep true,
and the record's own staleness becomes a new failure mode nothing checks.

The **only recorded provenance is the banner's version string**, and it earns its place
by doing the one job recomputation cannot: splitting a package-caused difference
(`stale` — banner names an older version than the installed package) from a
same-version one (`modified` — a hand edit or a config-value change, indistinguishable
from each other by design). Detection never reads the version; bytes decide that a path
diverged, the banner only attributes why. Files without a parseable banner stay fully
detectable — they classify `unattributable`, losing only the stale-versus-modified
split.

**Why:** recorded state about a derivable artifact is a cache, and a cache of a pure
function is a liability with no asset: every consulted record is a place where the
truth and the claim can part ways silently. Recomputing makes the check's answer
correct by construction on every run. This is the earlier design's failure — PRD-029/030
spent seven readiness rounds on a receipt/ledger mechanism whose defects were all of the
form "the record disagrees with the world"; deleting the record deleted the defect
class.

**How to apply:** when a checked artifact is a pure function of inputs the check can
read (package bytes + config), derive the expected value fresh inside the check and
compare against reality; store nothing. Add recorded state only for what recomputation
provably cannot answer — attribution across versions, scope across absence — and give
each such record exactly one narrowly named job (here: the banner version, written by
the same action that writes the file, so it cannot go stale relative to its own
content).
