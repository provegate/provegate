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
| Next candidates | pack-vs-repo drift check; test-hygiene fix (see Deferrals) |

## Deferrals

> Cap: 15 rows, warning at 12 (gate-enforced in wave 2). Every deferral has an owner and
> a due date. A row may be renewed ONCE; the second renewal must become a real work item
> and the row deleted. At the cap, convert the oldest-due row first — never skip
> recording. A `.skip`/disabled stub in code with no matching row here is a gate
> violation.

| Topic | Item | Owner | Due (YYYY-MM-DD) | Renewals | Note |
|-------|------|-------|------------------|----------|------|
| test hygiene | the provegate suite writes the repo's real `_state/prds.json` when run in full (parallel) — a fixture's root discovery escapes to the developer's checkout; reproduces only in the full run, never file-by-file | owner | 2026-08-15 | 0 | found while landing the operator-row fix; harmless today (a `generatedAt` bump) but it means a fixture can reach the live tree |
| pack drift | no check that `packages/provegate/practices/**` still matches this repo's live layer — the pack can silently rot | owner | 2026-08-22 | 0 | accepted at PRD-016 v1 (readiness §3); recorded so it cannot become "never" |

## Recent activity

- 2026-07-25 — operator-row count fix landed (`ddceaa4`): `countOperatorHandoff` now counts checkbox rows, so a mis-formatted operator row arms the gate instead of disarming it; mutation-checked regression cover, deferral closed
- 2026-07-25 — PRD-016 practices-pack **Ship Verified**: owner acceptance recorded, `gate land` merged to local main (unpushed). Close found the operator gate reporting 0 rows because the row was a checkbox bullet — fixed, captured as a `_brain` learning, parser hardening deferred
- 2026-07-25 — both tooling deferrals resolved (guard/scanner hardenings upstreamed; verify gates wired into CI for `gate check --wiring`); PRD-016 quorum 3/3 pass, awaiting operator acceptance
- 2026-07-24 — practices handoff complete: waves 3–4 imported (lifecycle docs + tiers, stop-and-ask, orchestration spec as docs-only), 7 high dep advisories fixed, handoff scaffolding deleted
- 2026-07-24 — practices handoff wave 2 imported (verify:* library, known-red ledger, CI hygiene job)
- 2026-07-24 — practices handoff wave 1 imported (`_brain`, governance + coordination practices)
