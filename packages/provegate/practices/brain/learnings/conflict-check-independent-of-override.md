---
name: conflict-check-independent-of-override
description: >-
  A pre-start overlap check must read the item's own declared write-surface, never a
  caller-supplied override, or a caller dodges the check by declaring a false surface.
type: gotcha
scope: workflow
status: active
links: [locks-on-main-not-worktree]
provenance: workflow-seed
---

Parallel orchestration refuses to start a work-item whose write-surface overlaps an active
one. If the start command also accepts an `--owned-paths` override and the pre-start check
reads _that_ override, a caller can pass a narrow/false surface, pass the check, then mirror
the real (overlapping) surface into the lock — colliding anyway.

**Why:** the override is caller-controlled input; letting it feed the safety check makes the
check bypassable by the very party it constrains.
**How to apply:** Build the pre-start conflict candidate from the item's **own declared
Conflict Surface in the spec**, deliberately independent of any `--owned-paths` argument.
The override may set the lock's recorded surface, but the _gate_ reads the declaration. And
provide no `--force` on the overlap refusal — overlap means serialize, full stop.
