# provegate handoff — Emofy good practices → provegate

**What this is.** A self-contained package of practices proven on the Emofy Platform,
de-emofy'd (product/domain specifics stripped) so provegate's coding agent can apply
them directly. Built in the Emofy repo first, then moved wholesale into provegate.

**How to consume (provegate agent, read in order):**

1. `00-transferable-assets.md` — the full map of what's worth porting, prioritized by
   leverage. Marks what's in THIS handoff vs. what lands in later waves.
2. `01-brain-memory-protocol/SPEC.md` — the first deliverable: `_brain`, an
   agent-agnostic, in-repo memory system. Implement this before anything else — it is
   where every later practice deposits its learnings.
3. `02-engineering-practices/` — eight cross-cutting practices (governance + coordination)
   that surround the gated workflow: independent-reviewer gate, protected-branch commit
   flow, Conventional Commits, secrets/env discipline, agent bootstrap, status board,
   retro→learning ritual, PRD triage scoring. Each is a tool-agnostic invariant + a
   generic mechanism + drop-in templates. None depend on the gate/verify tooling existing
   first, so they can land in wave 1 alongside `_brain`.
4. `03-gate-and-verify/` (wave 2) — the workflow machinery: the §11 per-FR
   machine-checkable gate (parser + safety filter + runner) and the verify:* invariant
   library (six reusable patterns + a catalog of universal checks + the wiring model).
   This is what makes "gated" enforceable. Depends on wave 1; its failure modes are
   already pre-seeded as `_brain` learnings.
5. `04-autonomous-close-lifecycle/` (wave 3) — the human-in-the-loop cut (phases 1–3 human,
   4–7 + local merge autonomous, push always human), the operator-acceptance waiver, the
   stop-and-ask checkpoints, and the work-item lifecycle state machine (folder tiers +
   status enum + transition scripts + deferral + generated-SSOT).
6. `05-parallel-orchestration/` (wave 4) — multi-agent orchestration: worktree-per-item +
   lock, Conflict-Surface → ownedPaths mirroring with pre-start refusal, the overlap engine,
   the single serialized merge channel, and CI enforcement. Adopt only if provegate goes
   multi-agent.

**Scope of this handoff (waves 1–4 — complete).** Fully specified: the memory protocol
(`_brain`, `01`), eight cross-cutting engineering practices (`02`), the gate/verify machinery
(`03`), the Autonomous-Close boundary + lifecycle state machine (`04`), and parallel-agent
orchestration (`05`). `_brain` (wave 1) is built first so every later practice has somewhere
to deposit its learnings; `05` (multi-agent) is adopted last and only if needed.

**Language.** English throughout — provegate is OSS and agent-agnostic. Emofy's own
memory is Turkish; that does not travel.

**De-emofy contract.** Nothing here references Emofy products, tenants, infra names,
real domains, secrets, or internal PRD numbers. Seed content captures *tool-agnostic
invariants* (true for anyone running a gated-PRD workflow), never Emofy business logic.
If the provegate agent finds an Emofy-specific leak, treat it as a bug and genericize it.

**After moving to provegate.** Drop `01-brain-memory-protocol/` contents into the
provegate repo per SPEC (§ "Layout"), wire the agent shims, then delete this `_handoff/`
folder from provegate — it is scaffolding, not runtime.
