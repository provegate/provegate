---
name: cleanup-after-verified-merge
description: >-
  Learning artifacts land before the merge; worktree/branch teardown happens only after the
  merge is verified, so a failed merge never destroys the work.
type: gotcha
scope: workflow
status: active
links: [durable-artifact-must-commit]
provenance: workflow-seed
---

Ordering of the close matters. Two invariants:

- **Learning before merge** — durable docs (memory learnings, ADRs, the review artifact) must
  land in the _same_ merge as the code, so knowledge and code are never out of sync.
- **Cleanup after a verified merge** — teardown of the worktree/branch happens only once the
  merge is checked (post-merge type-check + build). If cleanup ran first and the merge then
  failed, the isolated work would be gone.

**Why:** a merge can fail its post-merge gate and be auto-reverted; if the worktree was
already removed, there's nothing to retry from and the work is lost.
**How to apply:** Sequence the close as: capture learning → land it in the merge → merge
`--no-ff` to local integration → post-merge verify (revert on failure, worktree intact) →
only then release the lock and remove the worktree. Never push (see
[[push-is-human-by-omission]]).
