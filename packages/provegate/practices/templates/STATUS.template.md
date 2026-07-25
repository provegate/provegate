<!-- Cross-agent status board. This board is a DERIVED, LOSSY view. If a machine state
file exists (e.g. _state/prds.json), it is SSOT and wins on conflict. Keep this short:
long changelogs live in per-item summary files, not here. -->

# Status

> Add a row to **Active Agents** when you start; remove it when you're done.
> This board is not the source of truth — the machine state file wins on conflict.

## Active Agents

| Agent | Work item | Phase | Started |
| ----- | --------- | ----- | ------- |

<!-- row shape: | agent-id | ITEM-001 | 4 | 2026-01-01 | -->

## Current state

| Metric          | Value |
| --------------- | ----- |
| Last shipped    | —     |
| Active branch   | —     |
| Next candidates | —     |

## Deferrals

> Cap: 15 rows, warning at 12 (gate-enforced by verify:deferred). Every deferral has an
> owner and a due date. A row may be renewed ONCE; the second renewal must become a real
> work item and the row deleted. At the cap, convert the oldest-due row first — never
> skip recording. A `.skip`/disabled stub in code with no matching row here is a gate
> violation.

| Topic | Item | Owner | Due (YYYY-MM-DD) | Renewals | Note |
| ----- | ---- | ----- | ---------------- | -------- | ---- |

## Recent activity

- (none yet)
