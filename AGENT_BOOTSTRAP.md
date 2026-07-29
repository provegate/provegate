<!-- Canonical agent entrypoint — practice 05. Every per-tool config (CLAUDE.md,
AGENTS.md, .cursor/rules) points here as its first line. Configs are thin pointers;
durable rules live here and in the knowledge base, never duplicated per tool. -->

> **Read this before any AI agent (Claude Code, Codex, Cursor, …) starts work.**

## Who / What

ProveGate — an OSS monorepo extracting the **Gated Autonomy** workflow: a CLI
(`packages/provegate`), design system (`packages/design`), landing page (`apps/web`), and
docs (`apps/docs`). Locked constraints: `docs/research/provegate-bootstrap/DECISIONS.md`
(treat as law; confirm PENDING items with the owner). Program plan:
`docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md`.

## The gated workflow in brief

This repo runs its own development through the **7-phase gated PRD workflow**:
1 PRD Generation → 2 Readiness → 3 Task-gen → 4 Implement → 5 Test → 6 Audit → 7 Learning.
Non-negotiables:

- A gate is **machine-checkable**; it passes only when its check returns 0 **or** an
  independent reviewer (different model or human, never the author) says `pass` with
  `Critical: 0`. You may **not** self-declare a gate green.
- Phases 1–3 are human-approved; 4–7 run autonomously; **push is always the human's
  call** — no script, hook, or agent path pushes to a remote.
- Work items are `PRD-NNN`; artifacts flow through `_prds/` → `_readiness/` → `_tasks/`
  → `_docs/` (each with `wip/` and `completed/`).

## Critical rules (all agents)

1. Never add a code path that pushes to a git remote (CLI or CI; only the human-triggered
   release workflow publishes).
2. `packages/provegate`: zero runtime dependencies, no telemetry, no network calls.
3. Conventional Commits, subject must not start upper-case; scopes listed in
   `commitlint.config.mjs` (unknown scope warns — add new scopes there).
4. Method content (prompts/templates/schemas) comes from the source snapshot
   (`docs/research/provegate-bootstrap/source-snapshot/MANIFEST.md`) — never fabricate.
   Its usage rules bind all extraction work: config over hardcode, no personal names,
   English-only package content.
5. Never read, print, or commit secrets; inspect infra via redacted status/log commands,
   never a variables-dump. Real `.env*` files are gitignored and stay untracked.
6. `main` is merge-only for source (pre-commit guard enforces; docs/coordination paths
   commit in place; `ALLOW_BASE_COMMIT=1` is the deliberate one-off escape hatch).
7. Don't violate an ADR (`_brain/adr/`) without a superseding ADR.
8. Verify with: `pnpm check-types && pnpm lint && pnpm test && pnpm build`.

## Universal stop-and-ask checkpoints

An autonomous agent must STOP and ask the human before any of:

- **Destructive git** — force-push, `reset --hard`, branch deletion.
- **Deploy / publish** — any deploy, release, npm publish, or CI-triggering command
  (only the human-triggered release workflow publishes).
- **Bypassing hooks** — `--no-verify` or otherwise skipping pre-commit/commit-msg gates.
- **Lowering security posture** — weakening encryption, privacy, auth, or a permission check.
- **New dependency** — adding any dependency not named in the spec (and `packages/provegate`
  takes zero runtime dependencies, ever).
- **Out-of-scope files** — touching files outside the spec's documented scope / Conflict Surface.
- **Secrets / env** — modifying secrets or `.env.*` beyond what the spec specifies.
- **Operator acceptance** — an agent writes `_state/acceptances.json` only on explicit
  in-session owner direction, and only with `authorship: "agent-transcribed"`; absent that
  direction, stop and ask. `owner` names who DECIDED, never who typed. An agent never
  originates an acceptance and never accepts its own work (the merge gate validates the
  entry mechanically).
- **Method content** — anything in `packages/provegate` prompts/templates/schemas not
  traceable to the source snapshot.
- **Unspecified design question** — a design decision the spec doesn't answer.

Plus, always STOP if the current branch is a protected base (`main`) and the change is
source-class, or the status board already names this work-item under another agent.

On a blocker, surface the error verbatim — never paper over it with an `any` cast, an
`eslint-disable`, or a `|| true`. Push to remote is never an agent action: the runner has
no push code path (enforced by omission), and `gate push` refuses by design.

## The proceed rule (Phases 4–7)

During Phases 4–7 the only legitimate stops are the enumerated stop-and-ask checkpoints
and a failed gate. Every other decision is the agent's to take and to record in the task
file's **Deferrals & Decisions**, never to escalate: asking permission for in-scope,
reversible work is not caution, it is a manufactured gate — the mirror image of skipping
a real one.


## Knowledge map

```
AGENT_BOOTSTRAP.md     ← you are here (canonical entrypoint)
STATUS.md              ← who works on what (derived board; machine state wins)
_brain/
  INDEX.md             ← memory index (always load this)
  PROTOCOL.md          ← the memory protocol (canonical rules)
  learnings/  adr/     ← non-derivable knowledge + decisions
_state/                ← machine state; _state/prds.json is the generated SSOT
.provegate/            ← the generated prompt store (phase protocols + templates; `gate check --prompts` guards it)
_prds/ _readiness/ _tasks/ _docs/   ← per-PRD workflow artifacts (wip/completed)
_docs/reviews/         ← independent-review artifacts (one per gated change)
_docs/retros/          ← periodic retrospective notes
docs/research/         ← bootstrap decisions + roadmap + source snapshot (law)
```

## Reading strategy (do NOT read every file)

- **Level 1 — quick start:** this file + `_brain/INDEX.md`.
- **Level 2 — doing work:** + the matched `_brain` detail files + the active PRD's
  artifacts in `_prds/` / `_tasks/` + the phase protocol for your phase in
  `.provegate/prompts/`.
- **Level 3 — deep change:** + `docs/research/provegate-bootstrap/DECISIONS.md` +
  relevant ADRs.
- **Level 4 — onboarding:** the full knowledge base.

## Cross-agent coordination

Claim work on `STATUS.md` (add a row to Active Agents when you start, remove it when
done). The machine state file `_state/prds.json` is SSOT and wins on conflict. Deferrals
go on the board with an owner and a due date — never only as a `.skip` in code.

## Configs are pointers

| Agent | Config file | Role |
|-------|-------------|------|
| Claude Code | `CLAUDE.md` | pointer → this file + `_brain` shim |
| Codex | `AGENTS.md` (symlink → `CLAUDE.md`) | pointer → this file + `_brain` shim |
| Cursor | `.cursor/rules/brain.mdc` | pointer → this file + `_brain` shim |

**Principle:** per-tool config files are pointers only. Knowledge lives here and in the
knowledge base — never duplicated per agent (it drifts).

## Memory update rules (event → update)

| Event | Update |
|-------|--------|
| PRD completed (Phase 7) | run the `_brain` capture protocol (`_brain/PROTOCOL.md` §7); update `_brain/INDEX.md` |
| New architectural decision | add an ADR in `_brain/adr/` + INDEX pointer |
| Non-obvious trap hit (any phase) | add `_brain/learnings/<slug>.md` immediately — don't wait for close |
| Pattern used 3+ times | promote to a `type: convention` record |
| Cross-PRD theme observed | note it in the next `_docs/retros/` entry |

**Durable Artifacts rule (gated):** each PRD declares up front which durable paths its
close must touch (a `_brain` learning or `Learning: none`, the review artifact, any ADR).
The close is invalid if a declared path is absent from the merge diff, and that is
enforced mechanically: the close chain checks the merge diff, `gate check PRD-NNN`
lints the declaration at readiness, and `gate check --durable-artifacts` sweeps the wip
corpus (a manifest phase-4 entry and a CI step). The Phase 6 review is a second reader,
not the only one.

## Memory contract

Two sections in every PRD, parsed rather than read. `gate check` enforces them at Phase 2
and the gate chain enforces them at Phase 7.

- `## Memory Inputs` — `applied` / `reviewed` / `not-applicable`: `` `<record-slug>` `` —
  rationale; or exactly one reasoned `none`. A rationale is required in every form. Each
  slug must name an **active, indexed** record: a superseded one, an unindexed file, or a
  record that fails `verify:brain` is refused by name.
- `## Memory Outputs` — `learning` / `adr`: `` `<exact repo-relative path>` `` — the
  durable fact expected; or exactly one reasoned `none`. A non-empty output set may not
  contain `none`, and every non-`none` output repeats in Durable Artifacts.

An active record's `watch` glob overlapping a declared FR Target — or a file in the
closing diff — requires an input disposition naming that record. A watch is a **review
trigger, not a staleness verdict**: say what you did about the record; do not edit it to
make the gate quiet. Target matching strips an optional `::SymbolName` suffix first, so a
symbol-scoped target still matches a path-scoped watch.

At Phase 7 the declared outputs are compared against the PRD **as committed on `main`** —
the one version an agent editing its own PRD cannot rewrite. Appending an output
discovered during implementation is always allowed, with a rationale. Removing one,
changing its type or path, or replacing it with `none` is weakening: refused outright for
an `eligible` PRD, and for an `operator-gated` one it needs both a Changelog row authored
by an owner naming the exact path **in backticks** and an acceptance entry whose `items`
name that same path. A PRD whose copy on `main` is missing, malformed, or has no
`## Memory Outputs` section fails closed and names the remedy.

Enabled by `memory.enabled` in `workflow.config.json`. Historical PRDs are outside the
contract and are never rewritten to manufacture compliance.

## PRD triage — value scoring

Before a candidate enters the pipeline, score it on five weighted dimensions (1–5 each):

| Dim | Meaning | Weight |
|-----|---------|--------|
| MF — Method Fidelity | strengthens the gated method / stays true to the source snapshot | 0.25 |
| UI — User Impact | value to adopters of the CLI/method | 0.25 |
| TL — Technical Leverage | unlocks or de-risks later roadmap work | 0.20 |
| AR — Adoption & Reach | improves OSS adoption surface (docs, DX, examples) | 0.15 |
| RM — Risk & Maintenance | low regression risk / low standing maintenance (5 = safest) | 0.15 |

Notation in the PRD header: `Value: 3.55 (MF/UI/TL/AR/RM: 4/5/2/3/3)`. The declared total
must equal the weighted sum, and that is **enforced mechanically**: `gate check PRD-NNN`
recomputes it from the weights above and refuses a header whose arithmetic does not hold,
while `gate check --value-score` sweeps the whole corpus — which is what catches a score
edited after its item passed readiness.

The axes, their weights, and the cutoff are **configuration**, not constants: they live in
`workflow.config.json` under `valueScoring`, and the table above is a projection of the
shipped defaults, pinned to them by a test. The shipped default omits `enforceFrom`
entirely, which means presence-triggered — an item with no header passes. **This repository
opts in at PRD-017**, so from that id a missing header is a failure here.

Changing the axes is a corpus migration rather than a config edit: run
`gate check --value-score` first to see which items would break, then land the axis change
and the header rewrites in one commit.

- **Thresholds** (provisional — recalibrate after the first ~10 scored candidates):
  ≥ 3.40 stays a candidate; ≥ 4.00 is top tier (front of queue).
- **Expand-don't-delete:** below threshold → broaden the candidate to absorb adjacent
  problems and re-score; cut only after two failed expansions, with recorded rationale.

**Readiness gate (existing, unchanged):** the readiness assessment produces a score and a
**binary PASS/ITERATE verdict** (recorded in `_state/prds.json`). Hard caps force ITERATE
regardless of the score: a change to `packages/provegate` that adds a runtime dependency;
any code path that could push to a remote; method content not traceable to the source
snapshot.
