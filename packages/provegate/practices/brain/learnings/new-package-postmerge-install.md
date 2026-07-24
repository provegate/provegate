---
name: new-package-postmerge-install
description: >-
  A throwaway baseline checkout used for gate comparison does not run a dependency install,
  so a newly added package reads as a missing-module error, not a real failure.
type: gotcha
scope: workflow
status: active
links: [fresh-worktree-env-gap]
provenance: workflow-seed
---

Gates that compare against a baseline (checking out the base branch to diff behavior)
often skip `install` on that throwaway checkout for speed. If the change under test adds a
new dependency, the baseline lacks it and type-check/build fails with a missing-module
error that looks like a code defect but is a tooling artifact.

**Why:** the baseline tree's lockfile/node_modules predate the new package; without an
install step the module simply isn't there.
**How to apply:** Run the install on the _real_ checkout (the one that will actually merge),
not the throwaway baseline — the lockfile diff stays minimal and the module resolves.
When a gate reports an unresolved import for a package you just added, check whether the
failing tree ever ran install before treating it as a code bug.
