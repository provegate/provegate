# {{PROJECT_NAME}} — Cross-Agent Status

> **Last updated:** [YYYY-MM-DD] | SSOT: the state snapshot (`gate status`).
> **Rule:** add your row to "Active Agents" when starting; remove it when done. Long
> summaries live **only** in the summary artifacts — one short line each here.

---

## Active Agents

| Agent | Item | Phase | Started |
| ----- | ---- | ----- | ------- |

---

## Current State

> Hand-synchronized convenience view; the machine SSOT is `gate status` /
> the state snapshot. When they disagree, the machine wins.

| Metric             | Value                   |
| ------------------ | ----------------------- |
| Implemented        | [N]                     |
| Latest implemented | [{{ID_PREFIX}}-XXX]     |
| Active claims      | — (queue: `gate queue`) |

---

## Recent Activity

> Newest first; one line per event; link the summary artifact for detail.

- **[YYYY-MM-DD]** [agent] {{ID_PREFIX}}-XXX **Ship Verified** — [one-line note]; `summary-XXX-*.md`.

---

## Deferred / Follow-ups

> Deferral governance (METHOD.md → Deferrals): every row carries Owner + Due +
> Renewals; a renewal cap breach or overdue row is a gate failure. Cap the table
> (default 15 rows) — when full, convert the oldest row into a work item, then add.

| Item | Owner | Due (YYYY-MM-DD) | Renewals | Note |
| ---- | ----- | ---------------- | -------- | ---- |
