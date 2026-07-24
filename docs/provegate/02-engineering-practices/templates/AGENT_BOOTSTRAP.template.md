<!--
Generic agent bootstrap entrypoint — practice 05.
Place at docs/ai-context/AGENT_BOOTSTRAP.md (or repo root).
Every per-tool config (CLAUDE.md, AGENTS.md, .cursor/rules) points here as its FIRST line.
Configs are thin pointers; durable knowledge lives here and in the knowledge base.
-->

> **Read this before any AI agent (Claude Code, Codex, Cursor, …) starts work.**

## Who / What
<One-line product framing.> Vision: `<link to vision doc>`.

## The gated workflow in brief
This project uses a **gated PRD workflow**. Phases: 1 Draft → 2 Readiness → 3 Task-gen →
4 Implement → 5 Test → 6 Audit → 7 Learning. Non-negotiables:
- A gate is **machine-checkable**; it passes only when its check returns 0 **or** an
  independent reviewer says `pass`. You may **not** self-declare a gate green.
- Phases 1–3 are human-approved; 4–7 run autonomously; **push is always the human's call.**
- Trigger phrase: `<"run this through the gated workflow">`.

## Knowledge map
```
docs/ai-context/
  AGENT_BOOTSTRAP.md   ← you are here
  WORKFLOW.md          ← the full gated workflow      <author this — not shipped>
  BEST_PRACTICES.md    ← coding standards / patterns  <author this — not shipped>
  runbooks/            ← operational how-tos           <optional>
  patterns/            ← reusable code patterns        <optional>
  decisions/           ← ADRs   (or _brain/adr/)
_brain/
  INDEX.md             ← memory index (always load this)
  PROTOCOL.md          ← the memory protocol (canonical rules)
  learnings/           ← non-derivable knowledge
_state/                ← machine state (generated SSOT), if adopted
STATUS.md              ← who is working on what (derived board)
AGENTS.md              ← cross-agent contract
```

## Reading strategy (do NOT read every file)
- **Level 1 — quick start:** this file + `_brain/INDEX.md`.
- **Level 2 — doing work:** + `WORKFLOW.md` + the matched `_brain` detail files.
- **Level 3 — deep change:** + `BEST_PRACTICES.md` + relevant ADRs.
- **Level 4 — onboarding:** the full knowledge base.

## Critical rules (all agents)
1. <import / SSOT rules>
2. Commit format: Conventional Commits, lowercase subject (see `commitlint.config.js`).
3. Never read/print/commit secrets; use status/logs, not variable-dump.
4. Don't violate an ADR without a superseding ADR.
5. <add project-specific hard rules>

## Cross-agent coordination
Claim work on `STATUS.md` (add a row when you start, remove when done). The machine state
file is SSOT and wins on conflict. See practice 06.

## Configs are pointers
| Agent | Config file | Role |
|-------|-------------|------|
| Claude Code | `CLAUDE.md` | pointer → this file |
| Codex | `AGENTS.md` | pointer → this file |
| Cursor | `.cursor/rules/*.mdc` | pointer → this file |

**Principle:** per-tool config files are pointers only. Knowledge lives here and in the
knowledge base — never duplicated per agent (it drifts).

## Memory update rules (event → update)
| Event | Update |
|-------|--------|
| Work item completed | run the `_brain` capture protocol; update the memory INDEX |
| New architectural decision | add an ADR in `_brain/adr/` |
| Pattern used 3+ times | add it to `BEST_PRACTICES.md` |
| Non-obvious bug fixed | add a troubleshooting note / `_brain` learning |
