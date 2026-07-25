<!-- Cross-agent status board — practice 06. This board is a DERIVED, LOSSY view.
The machine state file _state/prds.json is SSOT and wins on conflict. Keep this short:
long changelogs live in per-PRD summary files (_docs/), not here. -->

# Status

> Add a row to **Active Agents** when you start; remove it when you're done.
> This board is not the source of truth — `_state/prds.json` wins on conflict.

## Active Agents

| Agent | Work item | Phase | Started |
|-------|-----------|-------|---------|

## Current state

| Metric | Value |
|--------|-------|
| Last shipped | PRD-016 practices-pack (2026-07-25) |
| Active branch | main (unpushed; push is the owner's call) |
| Next candidates | PRD-017 substrate — **Phase 4 in flight** (lease held, 0/58). Wave order is now fixed: 017 → 018 (PASS 8.43) → 019 (PASS 8.58) → 021 (PASS 8.43, 0/82) → 020 (PASS 8.5, 0/58). PRD-021 gained a PRD-018 dependency because PRD-018 creates the root `workflow.config.json`; PRD-020 still waits on PRD-019 Ship Verified |

## Deferrals

> Cap: 15 rows, warning at 12 (gate-enforced in wave 2). Every deferral has an owner and
> a due date. A row may be renewed ONCE; the second renewal must become a real work item
> and the row deleted. At the cap, convert the oldest-due row first — never skip
> recording. A `.skip`/disabled stub in code with no matching row here is a gate
> violation.

| Topic | Item | Owner | Due (YYYY-MM-DD) | Renewals | Note |
|-------|------|-------|------------------|----------|------|
| Memory effectiveness metrics | Candidate after 5 completed memory-contract PRDs | owner | 2026-09-01 | 0 | Former PRD-017 FR-9; review earlier if the evidence threshold is reached |

## Recent activity

- 2026-07-25 — next-wave audit found a defect the board could not show: `declaredGlobs` silently drops every Conflict Surface claim containing no `/`, so PRD-018's `workflow.config.json` + `gates.manifest.json` and PRD-021's `workflow.config.json` + `AGENT_BOOTSTRAP.md` + `STATUS.md` claims never reached a lease. Both PRDs create the same root config file and neither `gate queue` nor the lock gate could see the collision. Owner folded the fix into PRD-021 as FR-13 and gave root-config creation to PRD-018, so PRD-021's FR-4 becomes an add-a-key step behind a new dependency. Independent scoring then caught that the parser fix alone would not have worked — `findConflicts` only falls back to structural overlap when a whole surface materializes to zero tracked files, so the untracked file still would not collide; FR-13 now carries that change too
- 2026-07-25 — PRD-018 (8.15 → **8.43**), PRD-019 (8.425 → **8.58**) and PRD-021 (8.43 → 7.60 → 7.78 → **8.43**) re-scored independently after their PRDs were revised. PRD-018 resolved W2/W3/W4 (FR-3 now carries a per-file obligation table for all ten prompts; the grandfather boundary is git ancestry against an activation SHA, not a mutable timestamp). PRD-019 resolved W1/W3/W4 and corrected a false claim introduced during revision: `practices/NEXT_STEPS.md` and the shims are ledger `packOnly` entries, not hash pairs, so registration is the obligation and `--reconcile` would be ceremony
- 2026-07-25 — Phase 3 plans generated for PRD-020 (58 tasks) and PRD-021 (73 tasks); every readiness watch item is mapped to binding sub-tasks in each file's Watch Coverage table. PRD-020's task 0.2 hard-blocks Phase 4 until `_state/prds.json` records PRD-019 as Ship Verified, and PRD-021's task 0.2/9.5 bracket the merge with a `_state/locks` check because its new root `workflow.config.json` becomes a worktree control artifact
- 2026-07-25 — PRD-020 and PRD-021 reached **PASS** (8.5 / 8.43) at readiness iteration 3, both recommended high-tier for execution and audit. Two watch items stay binding on Phase 3: PRD-020 W8 (run the copied `verify:route-guards` script from a temp adopter-shaped repo, not just assert the copy instruction) and PRD-021 W9 (one semantic changeset-entry assertion instead of two quote-sensitive greps). Three iterations of independent review changed the design substantially — the class-default example described subtraction the runner cannot do, a cookbook command pointed inside our own checkout, and the two-decimal weight rule would have rejected 0.29
- 2026-07-25 — PRD-020 and PRD-021 scored independently (gpt-5.6, not the authoring model): both **ITERATE**, 6.075 and 4.43, no hard cap, lint green. Two premises were wrong and the review caught them — PRD-019 claims `cli.mdx` and the package `QUICKSTART.md` but not the docs-site `quickstart.mdx`, and the value-score gate would fail on contact because only 6 of 21 PRDs carry a `Value:` header. W1–W6 (020) and W1–W7 (021) bind the revision
- 2026-07-25 — the vision gap analysis was triaged into the pipeline: its P0 memory items were already PRD-017/018/019 and its README drift was already closed by release prep, so only two candidates were new — **PRD-020** adopter enablement (manifest cookbook, brownfield playbook, `--practices` first-class in the published docs, which name the flag on zero pages today) and **PRD-021** governance truth-up (the value-score recompute gate that never shipped, plus three "lands in wave 2" claims about gates that already run). Both Draft; PRD-020 overlaps PRD-019 on `apps/docs` CLI pages and should follow it
- 2026-07-25 — release prep landed for the first npm publish: the package README now documents the shipped lifecycle commands (it still called `init`/`new`/`open` unimplemented stubs, eleven items after they shipped) and is gated against that drift from the CLI's own help screen; the surface since PRD-005 is versioned as **0.2.0** (0.1.0 was an internal milestone, never published). Publish remains the owner's: repo public + `NPM_TOKEN` (provenance needs a public repo), the push, and the red `verify:dependency-audit` advisory
- 2026-07-25 — turbo cache-key fix landed: `build` and `generate-tokens` no longer narrow their `inputs`, so no gate can read a stale cached artifact (`web#build` hashed ONE file; `apps/web/app/**` was outside the key, and `check-egress` reads build output). New `verify:turbo-inputs` keeps the policy enforced — closes PRD-018 readiness W1
- 2026-07-25 — closed-loop memory program entered the pipeline as PRD-017/018/019 (substrate → contract+enforcement → adoption CLI). The original single 10-FR/72-task PRD was split after an independent review found a self-contradictory Memory Outputs grammar and a silent manifest-floor ambiguity; effectiveness metrics deferred. PRD-017 readiness **PASS 8.425** on an independent iteration-3 re-score (W10–W13 bind Phase 3), awaiting owner Go
- 2026-07-25 — pack-drift gate landed (`8c95bc8`): `verify:pack-drift` reconciles the shipped practices pack against the live layer by hash ledger (49 pairs); one-sided edits now fail the bundle. Deferral board is EMPTY
- 2026-07-25 — test-sandbox fix landed (`43eb33e`): the NO_COLOR spawns ran with no cwd and rewrote the live `_state/prds.json`; they now run in a fixture repo with a slug guard, deferral closed
- 2026-07-25 — operator-row count fix landed (`ddceaa4`): `countOperatorHandoff` now counts checkbox rows, so a mis-formatted operator row arms the gate instead of disarming it; mutation-checked regression cover, deferral closed
- 2026-07-25 — PRD-016 practices-pack **Ship Verified**: owner acceptance recorded, `gate land` merged to local main (unpushed). Close found the operator gate reporting 0 rows because the row was a checkbox bullet — fixed, captured as a `_brain` learning, parser hardening deferred
- 2026-07-25 — both tooling deferrals resolved (guard/scanner hardenings upstreamed; verify gates wired into CI for `gate check --wiring`); PRD-016 quorum 3/3 pass, awaiting operator acceptance
- 2026-07-24 — practices handoff complete: waves 3–4 imported (lifecycle docs + tiers, stop-and-ask, orchestration spec as docs-only), 7 high dep advisories fixed, handoff scaffolding deleted
- 2026-07-24 — practices handoff wave 2 imported (verify:* library, known-red ledger, CI hygiene job)
- 2026-07-24 — practices handoff wave 1 imported (`_brain`, governance + coordination practices)
