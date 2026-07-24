# 04 — Autonomous Close + lifecycle state machine (wave 3)

Two halves that together define *how far an agent may go on its own* and *what states a
work-item moves through*:

- **A — the Autonomous Close boundary** (`A-autonomous-close/`): the human-in-the-loop cut.
  Phases 1–3 are human-approved; phases 4–7 plus the **local** integration-branch merge run
  autonomously behind machine-checkable gates; **push to remote is always the human's
  decision.** Plus the operator-acceptance waiver (the auditable human override) and the
  universal stop-and-ask checkpoints.
- **B — the lifecycle state machine** (`B-lifecycle/`): a work-item's path from draft to
  shipped/archived/deferred — the folder-tier model, the status enum + exit criteria, the
  transition scripts, the deferral discipline, and the generated-SSOT + staleness rule.

Grounded against Emofy's `docs/ai-context/WORKFLOW.md`, `scripts/prd-autorun.mjs`,
`scripts/prd-accept.mjs` / `verify-acceptances.mjs`, `scripts/prd-state-utils.mjs`,
`scripts/verify-prd-state.mjs`, `scripts/prd-defer.mjs`. Genericized here.

## Read in order
1. `A-autonomous-close/SPEC.md` — the cut, the operator gate, the merge flow, stop-and-ask.
2. `B-lifecycle/SPEC.md` — folder tiers, status enum, transition scripts, deferral, SSOT.

## Depends on
- Wave 1 `_brain`; wave 2 `03` (the gates each phase runs, and the durable-artifacts/review
  checks the close consumes); `02` practices 02 (protected-branch), 06 (status board), 08
  (triage → what "Approved"/"Ready" means).
- Wave 4 `05` (orchestration) serializes the merge flow specified here.

## New seed learnings emitted
In `../01-brain-memory-protocol/seed-learnings/`:
- `no-completed-done-status-alias` — writing "Completed"/"Done" self-declares the terminal
  state and inverts the gate order; the canonical status must be explicit.
- `operator-acceptance-no-self-accept` — an autonomous agent must never self-accept an
  operator handoff; acceptance is a deliberate human action, owner-allowlisted.
- `cleanup-after-verified-merge` — learning lands *before* the merge; teardown happens
  *after* the merge is verified, so a failed merge never destroys the work.
- `push-is-human-by-omission` — keep "push is human" safe by giving the autonomous runner no
  push code path at all — enforce by omission, not a block a later edit can weaken.
