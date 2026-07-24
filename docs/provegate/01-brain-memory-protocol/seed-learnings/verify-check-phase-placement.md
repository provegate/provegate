---
name: verify-check-phase-placement
description: >-
  An invariant check registered in the wrong workflow phase fires too late (e.g. only at
  final close), so violations surface after work is done instead of at the gate that owns them.
type: gotcha
scope: workflow
status: active
links: [durable-artifact-must-commit]
provenance: workflow-seed
---

A `verify:*` check must run in the phase whose gate is responsible for the invariant it
protects. If a boundary/consistency check is wired only into the final close gate, a
violation introduced in an early phase isn't caught until the very end — expensive to
unwind, and it reads as a late surprise rather than an early stop.

**Why:** gates are phase-scoped; a check only guards what runs it. Registering it in the
wrong phase leaves the intended phase unguarded and overloads a later one.
**How to apply:** For each invariant, identify the earliest phase that can violate it and
register the check in *that* phase's gate. When adding a new `verify:*`, ask "which gate
should have caught this?" and wire it there, not just into the omnibus final check.
