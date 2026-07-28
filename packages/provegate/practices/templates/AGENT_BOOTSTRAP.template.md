<!-- Canonical agent entrypoint. Every per-tool config (CLAUDE.md, AGENTS.md,
.cursor/rules) points here as its first line — see practices/shims/. Configs are thin
pointers; durable rules live here, never duplicated per tool (duplication drifts).
Fill every {{PLACEHOLDER}} and delete this comment. -->

> **Read this before any AI agent (Claude Code, Codex, Cursor, …) starts work.**

## Who / What

{{ONE_LINE_PRODUCT_FRAMING}}. Vision / locked constraints: {{LINK_TO_VISION_DOC}}.

## The gated workflow in brief

This repo runs the **gated workflow**: 1 Spec → 2 Readiness → 3 Task-gen →
4 Implement → 5 Test → 6 Audit → 7 Learning. Non-negotiables:

- A gate is **machine-checkable**; it passes only when its check returns 0 **or** an
  independent reviewer (different model or human, never the author) says `pass` with
  `Critical: 0`. You may **not** self-declare a gate green.
- Phases 1–3 are human-approved; 4–7 run autonomously; **push is always the human's
  call** — no script, hook, or agent path pushes to a remote.

## Critical rules (all agents)

1. Conventional Commits, lowercase subject; scopes listed in `commitlint.config.mjs`
   (unknown scope warns — add new scopes there).
2. Never read, print, or commit secrets; inspect infra via redacted status/log commands,
   never a variables-dump. Real `.env*` files are gitignored and stay untracked.
3. The base branch is merge-only for source (pre-commit guard enforces;
   docs/coordination paths commit in place; `ALLOW_BASE_COMMIT=1` is the deliberate
   one-off escape hatch).
4. Don't violate an ADR (`_brain/adr/`) without a superseding ADR.
5. {{PROJECT_SPECIFIC_HARD_RULES}}

## Universal stop-and-ask checkpoints

An autonomous agent must STOP and ask the human before any of:

- **Destructive git** — force-push, `reset --hard`, branch deletion.
- **Deploy / publish** — any deploy, release, publish, or CI-triggering command.
- **Bypassing hooks** — `--no-verify` or otherwise skipping pre-commit/commit-msg gates.
- **Lowering security posture** — weakening encryption, privacy, auth, or a permission check.
- **New dependency** — adding any dependency not named in the spec.
- **Out-of-scope files** — touching files outside the spec's documented scope / Conflict Surface.
- **Secrets / env** — modifying secrets or `.env.*` beyond what the spec specifies.
- **Operator acceptance** — an agent writes the acceptance store only on explicit
  in-session owner direction, and only with `authorship: "agent-transcribed"`; absent that
  direction, stop and ask. `owner` names who DECIDED, never who typed. An agent never
  originates an acceptance and never accepts its own work.
- **Unspecified design question** — a design decision the spec doesn't answer.

On a blocker, surface the error verbatim — never paper over it with an `any` cast, an
`eslint-disable`, or a `|| true`. Push to remote is never an agent action.

## Knowledge map

```
AGENT_BOOTSTRAP.md     ← you are here (canonical entrypoint)
STATUS.md              ← who works on what (derived board; machine state wins)
_brain/
  INDEX.md             ← memory index (always load this)
  PROTOCOL.md          ← the memory protocol (canonical rules)
  learnings/  adr/     ← non-derivable knowledge + decisions
_state/                ← machine state (generated SSOT)
_prds/ _readiness/ _tasks/ _docs/   ← per-item workflow artifacts (wip/completed/deferred)
_docs/reviews/         ← independent-review artifacts (one per gated change)
_docs/retros/          ← periodic retrospective notes
```

## Reading strategy (do NOT read every file)

- **Level 1 — quick start:** this file + `_brain/INDEX.md`.
- **Level 2 — doing work:** + the matched `_brain` detail files + the active item's
  artifacts in `_prds/` / `_tasks/`.
- **Level 3 — deep change:** + {{VISION_OR_DECISIONS_DOC}} + relevant ADRs.
- **Level 4 — onboarding:** the full knowledge base.

## Cross-agent coordination

Claim work on `STATUS.md` (add a row to Active Agents when you start, remove it when
done). The machine state file is SSOT and wins on conflict. Deferrals go on the board
with an owner and a due date — never only as a `.skip` in code.

## Configs are pointers

| Agent       | Config file               | Role                                |
| ----------- | ------------------------- | ----------------------------------- |
| Claude Code | `CLAUDE.md`               | pointer → this file + `_brain` shim |
| Codex       | `AGENTS.md`               | pointer → this file + `_brain` shim |
| Cursor      | `.cursor/rules/brain.mdc` | pointer → this file + `_brain` shim |

**Principle:** per-tool config files are pointers only. Knowledge lives here and in the
knowledge base — never duplicated per agent (it drifts).

## Memory update rules (event → update)

| Event                            | Update                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| Work item completed (Phase 7)    | run the `_brain` capture protocol (`_brain/PROTOCOL.md` §7); update `_brain/INDEX.md` |
| New architectural decision       | add an ADR in `_brain/adr/` + INDEX pointer                                           |
| Non-obvious trap hit (any phase) | add `_brain/learnings/<slug>.md` immediately — don't wait for close                   |
| Pattern used 3+ times            | promote to a `type: convention` record                                                |
| Cross-item theme observed        | note it in the next `_docs/retros/` entry                                             |

**Durable Artifacts rule (gated):** each work item declares up front which durable paths
its close must touch (a `_brain` learning or `Learning: none`, the review artifact, any
ADR). The close is invalid if a declared path is absent from the merge diff
(`verify:durable-artifacts`).

## Memory contract (memory-enabled repositories)

Two sections in every work item, parsed rather than read:

- `## Memory Inputs` — `applied` / `reviewed` / `not-applicable`: `` `<record-slug>` `` —
  rationale; or exactly one reasoned `none`. A rationale is required in every form,
  including `none`.
- `## Memory Outputs` — `learning` / `adr`: `` `<exact repo-relative path>` `` — the
  durable fact expected; or exactly one reasoned `none`. A non-empty output set may not
  contain `none`, and every non-`none` output repeats in Durable Artifacts.

An active record's `watch` glob overlapping a declared target requires an input
disposition naming that record. A watch is a **review trigger, not a staleness verdict**:
the obligation is to say what you did about the record, never to edit it.

At close, declared outputs are compared against the work item **as committed on the base
branch** — the one version an agent editing its own artifact cannot rewrite. Appending an
output discovered during implementation is always allowed. Removing one, changing its type
or path, or replacing it with `none` is **weakening**, and what happens then depends on
the work item's close mode:

- **Eligible for autonomous close** → refused outright. No acceptance can waive it; restore
  the output or re-open the item under operator gating.
- **Operator-gated** → allowed only with BOTH a changelog row authored by a configured
  owner that names the exact path, AND an owner acceptance entry whose items name that
  same path.

A missing, malformed, or uncommitted baseline fails closed and names the remedy: commit the
work item to the base branch.

Enabled by `memory.enabled` in `workflow.config.json`. A repository that has not opted in
behaves exactly as it did before.

## Triage — value scoring

Before a candidate enters the pipeline, score it on five weighted dimensions (1–5 each);
define your own axes and keep the declared total mechanically re-derivable from the
sub-scores. Suggested starting thresholds (recalibrate after your first ~10 candidates):
≥ 3.40 stays a candidate; ≥ 4.00 is top tier. Below threshold → broaden the candidate
and re-score; cut only after two failed expansions, with recorded rationale.

The axes and their weights come from `workflow.config.json` under `valueScoring`. The
shipped defaults are below; **if you change `valueScoring.axes` or `valueScoring.weights`,
edit this table to match** — nothing substitutes it for you, and a table that disagrees
with the config is the kind of stale claim the gate exists to catch.

| Dim | Meaning | Weight |
|-----|---------|--------|
| MF — Method Fidelity | strengthens the gated method / stays true to the source snapshot | 0.25 |
| UI — User Impact | value to adopters of the CLI/method | 0.25 |
| TL — Technical Leverage | unlocks or de-risks later roadmap work | 0.20 |
| AR — Adoption & Reach | improves OSS adoption surface (docs, DX, examples) | 0.15 |
| RM — Risk & Maintenance | low regression risk / low standing maintenance (5 = safest) | 0.15 |

Notation in the work-item header: `Value: 3.55 (MF/UI/TL/AR/RM: 4/5/2/3/3)`. The declared
total must equal the weighted sum, and that is **enforced mechanically**:
`gate check PRD-NNN` recomputes it from the weights above and refuses a header whose
arithmetic does not hold, while `gate check --value-score` sweeps the whole corpus — which
is what catches a score edited after its item passed readiness.

The shipped default omits `enforceFrom`, which means **presence-triggered**: an item with
no header passes, and only an item that declares one has its arithmetic checked. Set
`valueScoring.enforceFrom` to the first id you want the header required from — your older
items keep passing without one.

Changing the axes is a corpus migration rather than a config edit: run
`gate check --value-score` first to see which items would break, then land the axis change
and the header rewrites in one commit.
