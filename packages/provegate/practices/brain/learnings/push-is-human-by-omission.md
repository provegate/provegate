---
name: push-is-human-by-omission
description: >-
  Keep "push to remote is always human" safe by giving the autonomous runner no push code
  path at all — enforce by omission, not by a block that a later edit can weaken.
type: convention
scope: workflow
status: active
links: [cleanup-after-verified-merge, operator-acceptance-no-self-accept]
provenance: workflow-seed
---

The autonomous runner may go all the way through a local integration-branch merge, but push
to remote (which triggers CI/deploy) must stay a human decision. The robust way to guarantee
that is not a guard clause that says "don't push" — it's to give the autonomous path **no
ability to push in the first place**.

**Why:** a guard can be weakened, mis-scoped, or bypassed by a later edit; the absence of any
`git push` call cannot be "accidentally enabled." Enforcement by capability-omission is
stronger than enforcement by rule.
**How to apply:** The runner's terminal steps are: release the lock, then print a handoff
card that ends with "ready to push — run `git push` yourself." No `git push` appears anywhere
in the autonomous path. Document it redundantly so no future change adds one.
