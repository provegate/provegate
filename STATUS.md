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
| Next candidates | operator-row parser hardening (see Deferrals); pack-vs-repo drift check |

## Deferrals

> Cap: 15 rows, warning at 12 (gate-enforced in wave 2). Every deferral has an owner and
> a due date. A row may be renewed ONCE; the second renewal must become a real work item
> and the row deleted. At the cap, convert the oldest-due row first — never skip
> recording. A `.skip`/disabled stub in code with no matching row here is a gate
> violation.

| Topic | Item | Owner | Due (YYYY-MM-DD) | Renewals | Note |
|-------|------|-------|------------------|----------|------|
| operator gate | `countOperatorHandoff` counts only table rows, so a checkbox-bullet operator row reports 0 rows and the merge gate passes without consuming the acceptance — harden the parser or add a verify check that a tasks file with an `operator-gated` header has at least one countable row | owner | 2026-08-08 | 0 | found while closing PRD-016; interim guard is the table-row convention + `_brain/learnings/operator-row-must-be-a-table-row.md` |
| pack drift | no check that `packages/provegate/practices/**` still matches this repo's live layer — the pack can silently rot | owner | 2026-08-22 | 0 | accepted at PRD-016 v1 (readiness §3); recorded so it cannot become "never" |

## Recent activity

- 2026-07-25 — PRD-016 practices-pack **Ship Verified**: owner acceptance recorded, `gate land` merged to local main (unpushed). Close found the operator gate reporting 0 rows because the row was a checkbox bullet — fixed, captured as a `_brain` learning, parser hardening deferred
- 2026-07-25 — both tooling deferrals resolved (guard/scanner hardenings upstreamed; verify gates wired into CI for `gate check --wiring`); PRD-016 quorum 3/3 pass, awaiting operator acceptance
- 2026-07-24 — practices handoff complete: waves 3–4 imported (lifecycle docs + tiers, stop-and-ask, orchestration spec as docs-only), 7 high dep advisories fixed, handoff scaffolding deleted
- 2026-07-24 — practices handoff wave 2 imported (verify:* library, known-red ledger, CI hygiene job)
- 2026-07-24 — practices handoff wave 1 imported (`_brain`, governance + coordination practices)
