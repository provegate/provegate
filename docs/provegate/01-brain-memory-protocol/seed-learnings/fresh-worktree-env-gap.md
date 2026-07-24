---
name: fresh-worktree-env-gap
description: >-
  A fresh git worktree or clean checkout does not inherit the root's untracked .env files;
  copy them before running any gate that needs environment config.
type: gotcha
scope: workflow
status: active
links: [new-package-postmerge-install]
provenance: workflow-seed
---

Workflows that isolate work in a fresh git worktree (or a clean CI checkout) start without
the developer's untracked `.env` / `.env.local`. Any gate, build, or test that reads env
config then fails or behaves differently than it did in the primary working tree —
confusingly, because the *code* is identical.

**Why:** `.env*` files are gitignored, so they exist only in the tree where they were
created; a new worktree/checkout is a different tree.
**How to apply:** Before running env-dependent gates in an isolated tree, copy the needed
`.env*` from the primary tree (never commit them). If a gate mysteriously fails only in
the worktree, suspect a missing env file before suspecting the code.
