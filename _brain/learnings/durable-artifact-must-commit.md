---
name: durable-artifact-must-commit
description: >-
  Review records and ADRs the workflow produces must be committed with the change; left
  untracked, they fail the close/state gate even though the code is correct.
type: gotcha
scope: workflow
status: active
links: [verify-check-phase-placement]
provenance: workflow-seed
---

A gated workflow treats its review artifacts and decision records as *durable* — proof the
gate ran. If those files are generated but left untracked (never `git add`ed), the state
verification at close finds a dangling/expected-but-missing artifact and blocks, or worse,
the audit trail silently has a hole.

**Why:** the artifact is the evidence the phase happened; the gate checks for its presence
in the commit, not on disk. Uncommitted evidence is no evidence.
**How to apply:** Commit review/ADR/state artifacts in the same change that produced them.
If a close gate complains about artifact state while the code is clean, check `git status`
for an untracked review record before anything else.
