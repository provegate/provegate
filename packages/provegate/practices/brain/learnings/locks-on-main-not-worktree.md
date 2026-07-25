---
name: locks-on-main-not-worktree
description: >-
  Work-item lock files must live on the main checkout, not inside the per-item worktree, or
  tearing down the worktree orphans the claim.
type: gotcha
scope: workflow
status: active
links: [append-only-manifest-union-driver]
provenance: workflow-seed
---

When each work-item runs in its own git worktree and its claim/lock is written _inside that
worktree_, removing the worktree at release (or crash) deletes the lock too — but other
agents read locks to decide what's contended. An orphaned or vanished lock corrupts the
coordination state.

**Why:** the worktree is ephemeral, per-item state; the lock is shared, cross-item
coordination state. Storing shared state in an ephemeral container loses it on teardown.
**How to apply:** Write locks to the **main checkout's** lock directory (git-ignored — they
are runtime coordination state, not source), so worktree teardown never touches them.
Release deletes the lock explicitly. TTL expiry unblocks _rivals_ (the overlap engine
excludes expired locks) but nothing reaps the stale file automatically — it still blocks
re-claiming the item until the lock gate flags it and a human (or a doctor command)
removes it.
