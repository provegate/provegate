# Addendum A2 — Autonomy Mode and the Phase 4–7 Proceed Rule

> **Status:** approved by the owner, 2026-07-28 (in-session direction: "ok 031 için onay"; drafted by the implementing agent, approval is the owner's recorded act).
> **Scope:** method content for PRD-031 (the configured Phase 3 autonomy exception and
> the Phase 4–7 proceed rule).
> **Relationship to the snapshot:** the frozen snapshot under `../` is unchanged and stays
> unchanged. This file is an *addendum*: method content the source project never had, which
> the owner approved as a canonical extension of the workflow. Written in English because
> shipped package content is English-only (MANIFEST §4).

## 1. Why this file exists

The snapshot's Phase 3 protocol states its autonomy exception **unconditionally**
(`../prompts/phase-3-task-generator.md:80`): "in autonomous-execution mode, document the
skipped approval gate…". Nothing in the snapshot says who decides that the session is in
autonomous-execution mode — so in practice the agent decides, and an agent that has just
been asked to produce a task plan has every reason to conclude it is autonomous. The gate
is real and its exception is self-issued. Conditioning the exception is therefore an
**extension** of the snapshot's rule, not an implementation of it, and under the addenda
rule (`../MANIFEST.md` §addenda) an extension requires this owner-approved record.

## 2. The two authorized clauses

**Clause 1 — the Phase 3 exception is a configured value, never a self-assessment.**
Whether a repository runs Phase 3 human-gated or autonomous is a decision the human
records in configuration (the `AUTONOMY_MODE` prompt value, set in
`workflow.config.json` under `prompts.values`), with exactly two legal values:

- `human-gated` — the STOP rule has no exception: the agent stops at the Phase 3
  approval gate and waits for the human's "Go", every time. The rendered protocol says
  so and carries no self-assessment instruction.
- `autonomous` — the snapshot's exception text applies, reproduced unchanged including
  its parenthetical `(single-session test runs, agent-led sweeps)`: the agent documents
  the skipped approval gate in the task file's Deferrals & Decisions before proceeding.

The rendered protocol never asks the agent to decide which mode the session is in; the
mode is whatever the configuration says. A repository that has not set the value renders
nothing silently — the store render fails closed on the unresolved value, which is the
delivery mechanism's existing rule.

**Clause 2 — the entrypoint states the proceed rule beside the stop rules.**
The agent entrypoint (`AGENT_BOOTSTRAP.md`, and the shipped template that installs it)
carries, next to its stop-and-ask checkpoints, the counterweight the method always
intended: **during Phases 4–7 the only legitimate stops are the enumerated stop-and-ask
checkpoints and a failed gate; every other decision is the agent's to take and to record
in the task file's Deferrals & Decisions, not to escalate.** The orchestration protocol
(`orchestration-runner.md`) states the same rule for the phases it drives. The stop
list itself is unchanged: the asymmetry is fixed by adding the proceed rule, never by
subtracting stops.

## 3. What this addendum does not authorize

No new stop rules, no removal or rewording of the existing ten checkpoints, no
machine-checkable "Go" gate (recording the human's approval as state is its own future
work item), and no change to any other snapshot rule. The snapshot's exception text
itself is not edited — it moves intact into the `autonomous` rendering.
