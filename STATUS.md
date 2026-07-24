<!-- Cross-agent status board — practice 06. This board is a DERIVED, LOSSY view.
The machine state file _state/prds.json is SSOT and wins on conflict. Keep this short:
long changelogs live in per-PRD summary files (_docs/), not here. -->

# Status

> Add a row to **Active Agents** when you start; remove it when you're done.
> This board is not the source of truth — `_state/prds.json` wins on conflict.

## Active Agents

| Agent | Work item | Phase | Started |
|-------|-----------|-------|---------|
| claude-code | PRD-016 | 7 (awaiting operator acceptance) | 2026-07-24 |

## Current state

| Metric | Value |
|--------|-------|
| Last shipped | PRD-015 single-package-support (2026-07-24) |
| Active branch | main (unpushed; push is the owner's call) |
| Next candidates | practices handoff waves 2–4 (gate/verify, autonomous close, orchestration docs) |

## Deferrals

> Cap: 15 rows, warning at 12 (gate-enforced in wave 2). Every deferral has an owner and
> a due date. A row may be renewed ONCE; the second renewal must become a real work item
> and the row deleted. At the cap, convert the oldest-due row first — never skip
> recording. A `.skip`/disabled stub in code with no matching row here is a gate
> violation.

| Topic | Item | Owner | Due (YYYY-MM-DD) | Renewals | Note |
|-------|------|-------|------------------|----------|------|
| wire wave-2 verify scripts into `gate check --wiring` surfaces | repo tooling | owner | 2026-08-07 | 0 | five verify:* scripts run only via the bundle; the CLI audit doesn't count it — wire in CI/manifest or add justified wiringExceptions |
| upstream pack security fixes into this repo's own guard/scanner copies | repo tooling | owner | 2026-08-07 | 0 | scripts/secret-scan.mjs + base-branch-guard.mjs carry the pre-R1 bugs (execSync filename, no D-filter, `:path` stage collision); pack copies fixed in PRD-016 |

## Recent activity

- 2026-07-24 — practices handoff complete: waves 3–4 imported (lifecycle docs + tiers, stop-and-ask, orchestration spec as docs-only), 7 high dep advisories fixed, handoff scaffolding deleted
- 2026-07-24 — practices handoff wave 2 imported (verify:* library, known-red ledger, CI hygiene job)
- 2026-07-24 — practices handoff wave 1 imported (`_brain`, governance + coordination practices)
