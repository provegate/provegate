---
name: operator-row-must-be-a-table-row
description: >-
  An operator-handoff row written as a checkbox bullet counts as zero operator rows, so the
  merge gate passes without ever consuming the owner acceptance.
type: gotcha
scope: workflow
status: active
links: [operator-acceptance-no-self-accept, false-green-on-missing-file, no-completed-done-status-alias]
provenance: prd-016-close
---

The state builder counts operator rows by scanning the tasks file's `## Operator Handoff`
section for `|`-delimited **table** rows. A row written as a `- [ ]` checkbox bullet is not
counted: `operatorHandoffCount` stays 0, and the merge gate short-circuits to pass before it
ever looks for an acceptance entry. PRD-016 shipped with exactly that shape — its close
printed `operator rows: 0` while both the tasks file and the status board said an owner
signature was still pending.

**Why:** the gate's precondition is a *count*, not the prose around it. Prose ("the rows
below need a human") reads as a gate to every human and to no parser. An `operator-gated`
header, an unchecked checkbox, and a board row all look like the gate is armed while the
machine state says nothing is pending — and machine state is what merges.

**How to apply:** Write every operator row as a table row (`| Task | Category | Owner |
Required Check | Status | Notes |`), never a checkbox bullet — a section with zero table rows
means zero operator rows, which is a legitimate state and therefore indistinguishable from a
mis-formatted one. Before trusting an operator gate, run the close in dry-run and read the
`operator rows: N` line: N must match the rows you believe are pending. Same class as
[[false-green-on-missing-file]] — the check ran, found nothing to check, and reported green.
