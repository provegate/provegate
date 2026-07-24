---
name: gate-wire-or-delete
description: >-
  A meta-gate must enforce both directions: every registered check is wired into an
  executing gate/CI surface, and every check script on disk is registered — no orphans.
type: convention
scope: workflow
status: active
links: [known-red-ledger-must-expire]
provenance: workflow-seed
---

A growing gate library rots two ways: registered checks that no executing gate/CI surface
ever runs (dead weight that reads as coverage), and check scripts on disk that were never
registered as gates at all (orphans nobody will ever wire). Neither is visible without a
check that checks the checks. (A CI step referencing a *deleted* check fails at CI runtime
on its own — that direction doesn't need the meta-gate.)

**Why:** nobody audits the wiring by hand; a check only guards what actually runs it, so an
unwired check protects nothing while looking like coverage.
**How to apply:** Add a meta-gate that asserts, both directions: every check in the package
manifest is reachable from at least one executing gate/CI surface, AND every check script on
disk is a registered gate. Acknowledged exceptions go in a shrink-only allowlist. Port this
early — it's cheap and it keeps every later check honest.
