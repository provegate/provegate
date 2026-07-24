# 06 — Cross-agent status board

**Invariant.** A single human-readable board tracks who is actively working on what
(agent / work-item / phase / start-time), plus expiring deferrals with an explicit owner +
due-date + renewal-count. The board is a **derived, lossy view** — a machine-readable state
file is SSOT and **wins on conflict**. The board is kept short (details live in per-item
summaries) and is validated against the authoritative locks by a check. A companion
`AGENTS.md` holds the durable cross-agent contract and points every agent to the bootstrap.

**Why it matters.** Multiple agents (or contributors) working in parallel collide without a
shared claim board. But a hand-edited board also rots — so it must be *derived* from a
machine SSOT, with the machine winning any disagreement. The deferral table stops "we'll do
it later" from silently becoming "never": every deferral has an owner and an expiry.

**Mechanism (generic).** See `templates/STATUS.template.md`.
- `_STATUS.md` (or `STATUS.md`) — a short board, explicitly *not* the SSOT. Rule at the
  top: "add a row to Active Agents when you start; remove it when done." Sections:
  - **Active Agents** — columns `Agent | Work item | Phase | Started`.
  - **Current state** — a few metrics (last shipped, active branch) + a short activity log.
  - **Deferrals** — columns `Topic | Item | Owner | Due (YYYY-MM-DD) | Renewals | Note`.
    Policy (gate-enforced): overdue rows fail; **a row may be renewed once** — the second
    renewal must be converted into a real work item and the row deleted; a hard cap on
    total rows (e.g. 15) with a warning at 80%, and at the cap the *oldest-due* row is
    converted first — never skip recording a deferral because the table is full. One more
    rule closes the board's biggest bypass: **a `.skip`/disabled stub in code without a
    matching board row is itself a gate violation** — deferring in code only is invisible
    deferral.
  - Rule: long changelogs live in per-item summary files, not on the board.
- A machine state file (JSON) is SSOT; a `status-sync` check validates the board's Active
  Agents against the real locks and fails on drift.
- `AGENTS.md` — the terse cross-agent contract: stack snapshot, a numbered "critical rules"
  list (only the tool-agnostic ones travel), and a pointers table. First line points to the
  bootstrap doc.

**Provegate implementation.**
1. Add `STATUS.md` from the template (start with Active Agents + Deferrals).
2. Add `AGENTS.md` as the cross-agent contract (thin — points to bootstrap).
3. If/when the orchestration wave lands a machine state file, add a `status-sync` check;
   until then, the board is manually maintained and that's fine for a single agent.

**De-emofy notes.** Translate Turkish headers (Aktif Agent'lar → Active Agents;
Sahip/Vade/Yenileme → Owner/Due/Renewals; Bekleyen follow-ups → Pending follow-ups). Drop
`_state/prds.json`, `state:index`, `verify:status-sync` names — keep the concept "board is
derived from a machine SSOT, machine wins." Generalize "PRD" → "work item / issue" if
provegate isn't PRD-based. Keep only tool-agnostic AGENTS.md rules (isolation, workflow,
Conventional Commits, infra-CLI-only); drop Emofy import/roles/scope-plane rules.

**Related.** deepens `00`'s cross-agent row · practice 05 (bootstrap) · practice 08
(deferral cap ties to triage).
