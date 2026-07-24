# 02 — Engineering practices (Emofy → provegate)

Eight cross-cutting practices that surround the gated workflow. Each is written as a
**tool-agnostic invariant** first, then a generic mechanism, then a provegate
implementation checklist, then de-emofy notes. Product/infra specifics from Emofy are
stripped — only the durable principle travels.

Grounded against the Emofy repo (real files, real rules), then genericized.

## Governance (git + gate quality)

| # | Practice | One-line invariant |
|---|----------|--------------------|
| 01 | [Independent-reviewer gate](governance/01-independent-reviewer-gate.md) | The author of a change can never be the authority that passes its review gate. |
| 02 | [Protected-branch commit flow](governance/02-protected-branch-commit-flow.md) | Shared base branches are merge-only for source; a commit-time guard enforces it; push is always human. |
| 03 | [Conventional Commits + commitlint](governance/03-conventional-commits-commitlint.md) | Commits follow Conventional Commits, enforced at commit time; type errors, scope only warns. |
| 04 | [Secrets & env discipline](governance/04-secrets-env-discipline.md) | Agents never read/print/commit secrets; destructive ops are guarded by target identity, not NODE_ENV. |

## Coordination (knowledge + queue)

| # | Practice | One-line invariant |
|---|----------|--------------------|
| 05 | [Agent bootstrap entrypoint](coordination/05-agent-bootstrap-entrypoint.md) | One canonical doc is the mandatory first read for any agent; per-tool configs are thin pointers. |
| 06 | [Cross-agent status board](coordination/06-cross-agent-status-board.md) | A short human board tracks who works on what; a machine state file is SSOT and wins on conflict. |
| 07 | [Retro → learning ritual](coordination/07-retro-learning-ritual.md) | Learning is a gated phase: each item declares where its durable knowledge lands, a check enforces it. |
| 08 | [PRD triage / value scoring](coordination/08-prd-triage-value-scoring.md) | Two orthogonal gates — value triage + readiness quality — both mechanically re-derivable from sub-scores. |

## Drop-in templates

`templates/` holds generic, ready-to-adapt artifacts:
- `commitlint.config.js` — practice 03
- `review-artifact.md` — practice 01
- `AGENT_BOOTSTRAP.template.md` — practice 05
- `STATUS.template.md` — practice 06

## New seed learnings emitted

These practices surfaced two more `_brain` seeds (in `../01-brain-memory-protocol/seed-learnings/`):
- `score-must-equal-weighted-sum` — a declared score must equal Σ(dims×weights), machine-checked, or agents round up to clear thresholds.
- `guard-destructive-by-target-host` — gate destructive data ops by the target host/identity, not by NODE_ENV.

## Relationship to `00-transferable-assets.md`

`00` maps the **workflow machinery** in waves (gate/verify/orchestration). This `02` bundle
is the **cross-cutting practices** that make that machinery safe and legible. Practices 01
and 07 deepen `00`'s "Durable Artifacts" row; 06 deepens the "cross-agent" row; 08 deepens
the "PRD lifecycle" row. They can land in wave 1 alongside `_brain` — none depend on the
gate/verify tooling existing first.
