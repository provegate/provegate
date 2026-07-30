---
name: one-checkout-one-session
description: >-
  Two agent sessions sharing one working tree interleave git state: a checkout in one
  session silently moves the other's HEAD, and a commit lands on whichever branch is
  current — possibly the other session's. Concurrent sessions need separate worktrees.
type: gotcha
scope: workflow
status: active
links: [fresh-worktree-env-gap]
provenance: incident-2026-07-30
---

Observed live (2026-07-30, favicon polish work): session A created `feat/site-favicons`;
session B, running concurrently in the same checkout, switched to its own branch and later
to `main`. Session B's commit (`chore(docs): 308 the empty subdomain root…`) landed on
**session A's branch** because that was HEAD at commit time; session B's own branch stayed
empty and its `git merge` into main was a silent no-op. The stray commit reached `main`
through session A's merge — content survived by luck, and the graph misattributes the work.
A also misread the HEAD flip as "the test suite switches branches."

**Why:** git branch state (HEAD, the index) is per-working-tree, not per-process. Two
sessions in one tree share HEAD, so every `checkout`/`switch`/`commit` in one is a mutation
of the other's context, with no warning from git.

**How to apply:** Never run two agent sessions in the same checkout. Give each concurrent
session its own `git worktree` (the coordination board row should say which). If a branch
you created mysteriously changes, or `git branch --show-current` disagrees with what you
did, suspect a concurrent session first — check `git reflog` (checkouts you never ran are
the fingerprint) before blaming tests or hooks; then verify your commits sit on the branch
you intended.
