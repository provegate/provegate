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
| Next candidates | PRD-017 substrate — readiness PASS 8.425 (independent, iteration 3); awaiting owner Go for Phase 3. PRD-018/019 drafted, ordered behind it |

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

- 2026-07-25 — closed-loop memory program entered the pipeline as PRD-017/018/019 (substrate → contract+enforcement → adoption CLI). The original single 10-FR/72-task PRD was split after an independent review found a self-contradictory Memory Outputs grammar and a silent manifest-floor ambiguity; effectiveness metrics deferred. PRD-017 readiness **PASS 8.425** on an independent iteration-3 re-score (W10–W13 bind Phase 3), awaiting owner Go
- 2026-07-25 — pack-drift gate landed (`8c95bc8`): `verify:pack-drift` reconciles the shipped practices pack against the live layer by hash ledger (49 pairs); one-sided edits now fail the bundle. Deferral board is EMPTY
- 2026-07-25 — test-sandbox fix landed (`43eb33e`): the NO_COLOR spawns ran with no cwd and rewrote the live `_state/prds.json`; they now run in a fixture repo with a slug guard, deferral closed
- 2026-07-25 — operator-row count fix landed (`ddceaa4`): `countOperatorHandoff` now counts checkbox rows, so a mis-formatted operator row arms the gate instead of disarming it; mutation-checked regression cover, deferral closed
- 2026-07-25 — PRD-016 practices-pack **Ship Verified**: owner acceptance recorded, `gate land` merged to local main (unpushed). Close found the operator gate reporting 0 rows because the row was a checkbox bullet — fixed, captured as a `_brain` learning, parser hardening deferred
- 2026-07-25 — both tooling deferrals resolved (guard/scanner hardenings upstreamed; verify gates wired into CI for `gate check --wiring`); PRD-016 quorum 3/3 pass, awaiting operator acceptance
- 2026-07-24 — practices handoff complete: waves 3–4 imported (lifecycle docs + tiers, stop-and-ask, orchestration spec as docs-only), 7 high dep advisories fixed, handoff scaffolding deleted
- 2026-07-24 — practices handoff wave 2 imported (verify:* library, known-red ledger, CI hygiene job)
- 2026-07-24 — practices handoff wave 1 imported (`_brain`, governance + coordination practices)
