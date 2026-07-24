<!--
Generic cross-agent status board — practice 06.
This board is a DERIVED, LOSSY view. If a machine state file exists, it is SSOT and wins
on conflict. Keep this short: long changelogs live in per-item summary files, not here.
-->

# Status

> Add a row to **Active Agents** when you start; remove it when you're done.
> This board is not the source of truth — the machine state file wins on conflict.

## Active Agents

| Agent | Work item | Phase | Started |
|-------|-----------|-------|---------|
| <id>  | <item-id> | <1–7> | <YYYY-MM-DD> |

## Current state

| Metric | Value |
|--------|-------|
| Last shipped | <item-id / date> |
| Active branch | <branch> |
| Next candidates | <short list> |

## Deferrals

> Combined cap: <N> rows, warning at 80% (gate-enforced). Every deferral has an owner + a
> due date. A row may be renewed ONCE; the second renewal must become a real work item and
> the row deleted. At the cap, convert the oldest-due row first — never skip recording.
> A `.skip`/disabled stub in code with no matching row here is a gate violation.

| Topic | Item | Owner | Due (YYYY-MM-DD) | Renewals | Note |
|-------|------|-------|------------------|----------|------|
| <topic> | <item-id> | <owner> | <date> | 0 | <why deferred> |

## Recent activity

- <YYYY-MM-DD> — <one line>
