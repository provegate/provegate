# Transferable assets — Emofy → provegate (prioritized)

The 7-phase gated PRD workflow is the core provegate already extracts. Around it, Emofy
built a set of reusable process/tooling assets. Ranked by leverage for an OSS,
agent-agnostic project. Each row says whether it ships in **this** handoff.

| # | Asset | What it is | Why it transfers | Wave |
|---|-------|-----------|------------------|------|
| 1 | **`_brain` memory protocol** | Agent-agnostic, in-repo store of non-derivable knowledge (learnings, gotchas, ADRs) with typed frontmatter + always-loaded INDEX | Turns every phase's Learning output into durable, cross-agent memory. The substrate all other practices deposit into. | **THIS (wave 1)** |
| 2 | **`§11` per-FR machine-checkable gates** | Each functional requirement carries an executable command (grep / test / absence-assert). Gate passes only when the command exits 0. | This is what makes "gated" real vs. a vanilla PRD template. The single biggest differentiator. | wave 2 |
| 3 | **`verify:*` invariant script library** | Executable architecture/policy checks (domain boundaries, state consistency, path conflicts, PRD readiness) run in CI/gates | Each locks a class of regression. OSS gold — ships as runnable scripts, not prose. | wave 2 |
| 4 | **Durable Artifacts** | Review records, ADRs, locked state committed alongside the change | Audit trail = OSS trust. A `verify` check enforces artifacts exist before close. | wave 2 (partly seeded in `_brain/adr`) |
| 5 | **Autonomous Close boundary** | Phases 1–3 human-approved; 4–7 run autonomously; **push is always the human's call** | Governance model maintainers trust. Clear human-in-the-loop line. | wave 3 |
| 6 | **Cross-agent instruction dual** | Same rules mirrored to every agent entrypoint (CLAUDE.md / AGENTS.md / cursor rules) as thin pointers | Contributors use different agents; one source of truth, many shims. | seeded in wave 1 (`_brain` shims) |
| 7 | **PRD lifecycle state machine** | `drafts → wip → completed`, plus a `deferred/` tier; state query command | Queue + triage discipline. provegate already mirrors the folders. | wave 3 |
| 8 | **Parallel-agent orchestration** | Merge train, ready-queue, per-PRD "conflict surface", worktree isolation, ff-only merges | Powerful but advanced; land after the core is stable. | wave 4 |

> **All specified.** Rows 2–4 (§11 per-FR gates, verify:* library, Durable Artifacts) →
> `03-gate-and-verify/` (wave 2). Rows 5, 7 (Autonomous Close, lifecycle state machine) →
> `04-autonomous-close-lifecycle/` (wave 3). Row 8 (parallel orchestration) →
> `05-parallel-orchestration/` (wave 4). Nothing remains mapped-but-unspecified.

## Cross-cutting practices (`02-engineering-practices/`)

Beyond the workflow machinery above, eight cross-cutting practices are fully specified in
`02/` and can land in **wave 1** (none depend on the gate/verify tooling existing first):

- **Governance:** independent-reviewer gate · protected-branch commit flow · Conventional
  Commits + commitlint · secrets/env discipline.
- **Coordination:** agent bootstrap entrypoint · cross-agent status board · retro→learning
  ritual · PRD triage / value scoring.

They deepen the rows above: independent-reviewer + retro deepen **Durable Artifacts (#4)**;
status board deepens **cross-agent (#6)**; triage deepens **PRD lifecycle (#7)**. See
`02-engineering-practices/README.md`.

## Sequencing rationale

- **`_brain` first (wave 1).** It is the deposit target for every learning the gate,
  verify, and orchestration work will generate. Building it first means no learning is
  lost while the rest is stood up.
- **Gate + verify next (wave 2).** They make the workflow enforceable. Their operational
  traps are already pre-seeded into `_brain` (see `seed-learnings/`) so provegate's agent
  hits fewer of the potholes Emofy did.
- **Autonomous-Close boundary + lifecycle + orchestration (waves 3–4).** Depend on the
  above being stable. (Distinct from the wave-1 governance *practices* in `02/` — this row
  is the close/merge governance machinery.)

## The one meta-asset

Beyond any single tool, the transferable discipline is: **"a phase learning becomes a
durable, agent-consumable record with a relevance hook, and only if it is NOT derivable
from the code."** That discipline is fully specified in wave 1 — it is the point of
`_brain`.
