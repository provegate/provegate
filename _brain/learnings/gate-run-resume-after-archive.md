---
name: gate-run-resume-after-archive
description: >-
  Resuming `gate run` after its archive step re-evaluates the memory gates against the
  archived paths and fails "no committed copy on main" — un-archive in the worktree and
  resume from phase 7, or fix whatever stopped the merge without re-entering the gates.
type: gotcha
scope: workflow
status: active
links: [durable-artifact-must-commit]
watch: [packages/provegate/src/core/run/**]
---

Observed closing PRD-035 (2026-07-28). The first `gate run` executes in this order:
memory gates → merge gate → **archive wip→completed** → merge. When the merge step
stops (a dirty base checkout, then a `_state/prds.json` conflict), the retry
`gate run --from-phase=merge` re-evaluates the memory gates — but the archive has
already moved the PRD to `_prds/completed/`, so the no-weakening gate looks for
`main:_prds/completed/prd-<n>-….md`, finds nothing (main still holds the wip copy),
and fails closed with *"PRD has no committed copy on `main`"* even though every
declaration is intact.

A second, smaller consequence: the archive also moves the readiness artifact, which
can newly trip `_readiness/**` watches (here `score-band-prescribes-the-action`)
that the pre-archive run never saw, demanding dispositions mid-close.

**Why:** the resume re-runs gates whose inputs the first run's archive step already
mutated; gate evaluation is not idempotent across the archive boundary.
**How to apply:** if a close stops after "[run] archived N artifact(s)", either fix
the stopping cause and complete the merge without re-entering the gates, or
`git mv` the four artifacts back to their `wip/` paths in the feature worktree,
commit, and resume with `--from-phase=7` so the run follows first-run ordering (it
re-archives itself). The durable fix belongs in the runner: evaluate memory gates
against the PRD's path as of the merge BASE, or archive only after the merge
succeeds.
