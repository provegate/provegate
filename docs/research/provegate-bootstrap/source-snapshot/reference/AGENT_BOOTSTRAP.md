# Agent Bootstrap — Universal Entry Point

> **Read this file before any AI agent (Cursor, Claude Code, Paperclip, Codex, etc.) starts work on the project.**
> All agents must use this file as the entry point.

---

## Who Are You?

Welcome to this project's **Second Brain**. Emofy is a child development and education ecosystem platform. Full vision: `docs/000_PRODUCT_VISION_AND_ROADMAP.md`.

## Development Process — 7-Phase Gated PRD Workflow

This project's canonical methodology is the **7-Phase Gated PRD Workflow** (full
protocol: `docs/ai-context/WORKFLOW.md`). Use this exact name everywhere — do not
coin synonyms. The defining rules, non-negotiable:

- Every non-trivial change is anchored to a **PRD** and advances phase-by-phase
  (1 PRD Drafting → 2 Readiness → 3 Task Generation → 4 Implementation →
  5 Testing → 6 Final Auditing → 7 Learning).
- A phase boundary is a **machine-checkable gate**: it passes only when its
  `verify:*` returns `0` or an independent reviewer says `pass`. You may **not**
  self-declare a gate green.
- **Phases 1–3 are human-approved** (PRD approval + "Go"). **Phases 4–7 + the local
  `development` merge run autonomously** via `pnpm prd:autorun`. **Push to remote is
  always the human's decision** — no agent or script pushes.
- The PRD is an executable spec — the **Gate Contract** (`Autonomous Close`,
  per-FR §11 Verification Commands, `Durable Artifacts`) is enforced by
  `verify:prd-ready` (PRDs ≥ 248).

Trigger phrase an agent should recognize: _"run this through the gated PRD workflow."_

## Second Brain Map

```
docs/ai-context/                    ← Second Brain root
├── AGENT_BOOTSTRAP.md              ← THIS FILE — entry point for all agents
├── MEMORY.md                       ← Wiki Index — page catalog + reading guide
├── BEST_PRACTICES.md               ← Coding standards, DB rules, security, API conventions
├── WORKFLOW.md                      ← 7-phase gated PRD workflow (full protocol)
├── wiki/                            ← LLM Wiki — atomic knowledge pages (Karpathy pattern)
│   ├── vision.md                   ← Core product vision
│   ├── tech-stack.md               ← Technologies & versions
│   ├── architecture.md             ← System architecture map
│   ├── database.md                 ← Dual PostgreSQL structure
│   ├── entity-ids.md               ← Prefixed nanoid glossary
│   ├── permissions.md              ← Role & permission system
│   ├── current-state.md            ← Project progress snapshot
│   ├── rules.md                    ← Agent rules (UI, EMA, notifications, etc.)
│   ├── scripts.md                  ← CLI commands reference
│   └── log.md                      ← Chronological wiki operations log
├── decisions/                       ← Architecture Decision Records (ADR)
│   ├── README.md                   ← ADR index — SSOT (tam liste + numara eşlemeleri burada)
│   └── adr-001 … adr-035           ← dual-db, RS256, EMA-first, messaging SSOT, API keys,
│                                      outbox, env/secret SSOT, Railway/OpenTofu/Infisical,
│                                      legals SSOT (032), docs-drift (033), internal authZ
│                                      platform (034), authZ leaf packages (035) …
├── patterns/                        ← Reusable code patterns
│   ├── README.md                   ← Pattern index
│   ├── backend-crud-module.md      ← NestJS CRUD module structure
│   ├── frontend-feature-module.md  ← Next.js feature module structure
│   ├── permission-gated-feature.md ← E2E permission flow
│   ├── db-entity.md                ← New DB entity pattern
│   └── serena-symbol-navigation.md ← Serena LSP navigation (token-efficient)
├── runbooks/                        ← Step-by-step operational guides
│   ├── README.md                   ← Runbook index
│   ├── add-backend-module.md       ← Add a new NestJS module
│   ├── add-db-entity.md            ← Add a new DB table
│   ├── add-ema.md                  ← Add a new EMA
│   ├── add-permission.md           ← Add a new permission
│   └── troubleshooting.md          ← Known issues and fixes
├── prompts/                         ← Phase-specific agent prompts (7-phase cycle)
│   ├── phase-1-prd-generator.md
│   ├── phase-2-readiness-scorer.md
│   ├── phase-3-task-generator.md
│   ├── phase-4-implementation.md
│   ├── phase-4-implementation-bootstrap.md
│   ├── phase-5-testing.md
│   ├── phase-6-final-auditing.md
│   ├── phase-7-learning.md
│   ├── orchestration-runner.md     ← Agent driver for Phases 4–7 + prd:autorun
│   ├── wiki-ingest.md              ← Source → Wiki integration protocol
│   └── wiki-lint.md                ← Wiki health check protocol
└── reports/                         ← Generated reports

_state/                              ← Workflow state control plane
├── prds.json                         ← Generated PRD lifecycle SSOT
├── acceptances.json                  ← Operator acceptance store (PRD ≥ 248)
├── schema/                           ← PRD state + agent lock schemas
└── locks/                            ← Runtime agent locks (JSON ignored)
```

## Reading Strategy

**Do not read every file.** Pick a level based on the task:

### Level 1: Quick Start (before every task)

1. This file (`AGENT_BOOTSTRAP.md`)
2. `MEMORY.md` → select task-relevant pages from the Wiki Index
3. `wiki/rules.md` (skim)

### Level 2: New Feature Development

1. Level 1 +
2. `wiki/rules.md` (full read)
3. Relevant wiki pages (architecture, database, permissions, etc.)
4. Relevant pattern (`patterns/`) + runbook (`runbooks/`)
5. Relevant ADR (`decisions/`) — understand decisions and do not violate them

### Level 3: Architecture Change

1. Level 2 +
2. All wiki pages
3. All ADRs (`decisions/`)
4. `WORKFLOW.md` (PRD cycle required)

### Level 4: New Agent Onboarding

1. Level 3 +
2. `docs/ai-context/wiki/architecture.md`
3. `docs/003_DATABASE_ARCHITECTURE.md`

## Serena memories (optional, token-light)

Use Serena’s **on-demand** memories instead of re-reading large wiki pages when you only need a map. Full detail stays in `docs/ai-context/wiki/` and `MEMORY.md`.

| Memory key                             | Purpose                                                       |
| -------------------------------------- | ------------------------------------------------------------- |
| `project/vision`                       | Vision — EMA-first, app stores, parent digital footprint      |
| `architecture/overview`                | Apps, entry points, multi-tenancy, where guards live          |
| `architecture/database`                | Dual DB, domains, `OrgScopedRepository`                       |
| `architecture/entity-prefixes`         | Prefixed ID table                                             |
| `architecture/roles-permissions`       | Roles + permission vocabulary                                 |
| `architecture/web-routes`              | Consumer route / feature-module map                           |
| `auth/internal-authorization-platform` | Permit.io-inspired authZ blueprint (PRD-271→279, ADR-034/035) |
| `backend/patterns`                     | Nest guards, CQRS, queue/cache naming                         |
| `ui/ramarkable-components`             | High-level components + import paths (domain-based homes)     |
| `project/current-state`                | Latest PRD pointer + summary links (not prose)                |

Full memory map (load on demand): `pnpm` not required — list via Serena. Additional gotcha/domain memories exist (e.g. `auth/better-auth-flow`, `realtime/convex-patterns`, `testing/e2e-patterns`, `ui/icon-system`, `emas/ema-architecture`).

## Critical Rules (All Agents)

1. **UI imports**: `@emofy/rds` (primitives) + `@emofy/ramarkable` (high-level) — `@emofy/ui` was removed
2. **No `any`** — use `unknown`
3. **Roles/permissions SSOT**: only `@emofy/types` — never duplicate locally
4. **Ghost roles**: never use `"owner"` / `"workspaceAdmin"`
5. **Scope planes (ADR-037)**: choose the base by scope key — `OrgScopedRepository` (tenant), `PersonalScopedRepository` (personal/`userId`), `PlatformRepository` (global); one query = one plane, `@Plane(...)` declares non-tenant controllers (absent ⇒ tenant, fail-closed). Rolling out via PRD-292+
6. **Prefixed IDs**: `generateId("entity")` → `pfx_nanoid12`
7. **Commit format**: `<type>(<scope>): <description>`
8. **Do not violate ADRs**: update the ADR before changing an architectural decision

## Cross-Agent Coordination

`_state/prds.json` is the generated PRD lifecycle SSOT for scripts, not a file agents should read in full during normal work. Use `pnpm state:index`, `pnpm state:active`, `pnpm state:next`, or `pnpm state:prd -- PRD-XXX` for token-light state lookup. `_STATUS.md` is a short coordination board for humans; do not store long PRD history or detailed changelogs there. Completed-work details belong in the relevant `_docs/*/summary-*.md` files and `docs/ai-context/wiki/current-state.md`.

1. Run `pnpm state:index` or `pnpm state:prd -- PRD-XXX`, then `pnpm prd:status` to see active claims — do not read full `_state/prds.json` unless debugging the state generator
2. For Phase 4–6 work, claim the PRD with one command: `pnpm prd:start PRD-XXX --agent <your-name> [--phase "Phase 4"]`. This creates `.worktrees/prd-XXX-<slug>` on branch `feat/prd-XXX-<slug>`, writes the lock, and adds a row to `_STATUS.md`. Do all subsequent edits inside the worktree. Run `pnpm verify:agent-locks && pnpm verify:branch-isolation` before editing.
3. Run `pnpm verify:status-sync`; if another active lock or `_STATUS.md` row already names this PRD or files you need, **STOP** and notify the user
4. Check `_tasks/wip/` to avoid shared-state conflicts
5. On completion or handoff: `pnpm prd:stop PRD-XXX` (removes worktree, lock, `_STATUS` row), then `pnpm state:sync`
6. Phases 4–7 mechanical gates: `pnpm prd:autorun PRD-XXX --dry-run` (plan) then non-dry-run when ready — never pushes; see `prompts/orchestration-runner.md`
7. Manual fallback if the wrapper can't be used: create the lock + status row by hand following the same schema, then re-run `pnpm verify:status-sync` before any edits

## Agent-Specific Config Files

| Agent                   | Config                       | How It Connects                  |
| ----------------------- | ---------------------------- | -------------------------------- |
| Claude Code             | `CLAUDE.md` (root)           | → Points to this file            |
| Cursor                  | `.cursor/rules/ai-brain.mdc` | → Points to this file            |
| Paperclip               | Agent system prompt          | → Add this file to system prompt |
| Codex / Windsurf / etc. | Own config                   | → Read this file                 |

**Principle:** Agent-specific config files should only be **pointers**. The knowledge itself lives here (`docs/ai-context/`). No agent should maintain independent project knowledge in its own config.

## Second Brain Update Rules

### When to Update

| Event                          | Update                                             |
| ------------------------------ | -------------------------------------------------- |
| PRD completed (Phase 7)        | Run `prompts/wiki-ingest.md` → relevant wiki pages |
| New architectural decision     | `decisions/` → new ADR + relevant wiki page        |
| New repeated pattern (3+ uses) | `patterns/` → new pattern                          |
| New operational procedure      | `runbooks/` → new runbook                          |
| Known issue fixed / discovered | `runbooks/troubleshooting.md`                      |
| Tech stack change              | `wiki/tech-stack.md`                               |
| Coding standard change         | `BEST_PRACTICES.md`                                |
| Periodic maintenance (weekly)  | Run `prompts/wiki-lint.md`                         |

### Who Updates?

Every agent must run the wiki-ingest protocol during Phase 7 (Learning). Details: `prompts/wiki-ingest.md` and `WORKFLOW.md` → Phase 7. Phase 6 must pass independent adversarial review + `pnpm verify:workflow`; Phase 7 must pass `pnpm verify:durable-artifacts` and `pnpm ship:pre` before declaring `Ship Verified`.

### Update Quality

- **Short and concise** — optimized for fast agent scanning
- **Include code examples** — prefer concrete examples over abstract descriptions
- **Explain why** — include decision rationale, not only what changed
- **Include date** — when it was added/changed
