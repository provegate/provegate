# Phase 1: PRD Generator Protocol

> **Cycle Phase:** 1 of 7
> **Role:** Product Architect
> **Goal:** Transform a user's feature request into a production-grade PRD that an **implementing agent** can execute autonomously — surfacing only structural blockers, not clarifications. Every FR carries the file paths, types, and verification commands the agent needs so Phase 4 never re-discovers context.

---

## Agent Constraints

1. **Stop & Ask:** When a user says "feature", do NOT start writing a PRD immediately. Ask clarifying questions first. Prefer deriving answers from `docs/ai-context/MEMORY.md` and the codebase; only ask the user for what genuinely cannot be derived (product intent, business rules, scope boundaries).
2. **No Code Yet:** PRD phase produces zero implementation code. Only schemas, type definitions, and architectural specs.
3. **Strict Typing:** Never use `any` or ambiguous types in the PRD. Specify exact types, branded IDs, and Zod schemas.
4. **Reference Memory:** Always read `docs/ai-context/MEMORY.md` before writing. Verify ID prefixes, role names, and existing patterns.
5. **Agent-Executable:** Every FR must carry concrete file paths + symbol names so the implementing agent can navigate without grep guesswork. PRDs without target paths fail Phase 2 Clarity.

---

## Step 0: PRD Class Selection (Mandatory)

Before Discovery, pick the **PRD Class** that matches the work. The
class determines (a) which Discovery sections below are mandatory vs
skippable, (b) the Phase 2 scoring formula, (c) the Phase 3 parent
task skeleton, (d) the `verify:prd-ready` boilerplate requirements.
Promoted to a first-class header field in 2026-05-24 — see
`docs/ai-context/GSTACK_INTEGRATION.md` §Lessons.

| Class            | When                                                                             |
| ---------------- | -------------------------------------------------------------------------------- |
| `feature`        | New user-facing capability, schema change, RBAC update, cross-module integration |
| `test-hardening` | Single-test or test-infra fix; no production code changes                        |
| `hotfix`         | Production bug fix with bounded blast radius                                     |
| `infra`          | Workflow / tooling / CI / deploy change                                          |

Record the chosen class in the PRD header (`> **PRD Class**: <class>`).
When the class is anything other than `feature`, add one justification
line directly below it (`> **Class Rationale**: <why this class, why not
feature>`) — class choice changes scoring weights and lint strictness,
so it must be visible and reviewable, not implicit.
If unsure, default to `feature` — the workflow over-engineers gracefully
but under-engineers dangerously.

---

## Step 1: Discovery & Clarification

Skip Discovery sections marked **(feature-only)** when the PRD Class is
`test-hardening` or `hotfix` — they don't apply. `infra` PRDs follow
`feature` discovery but emphasise deploy/rollback over data-model
questions.

### Business Logic (all classes)

- "What is the core problem this feature solves? What are the exact acceptance criteria?"

### Multi-Tenancy & Auth (feature-only)

- "Is this feature tenant-scoped (orgId) or global? Does it need new permissions or roles in `@emofy/types`?"

### Data Model & IDs (feature-only)

- "Which new entities are needed? What prefix should we use? (Check `packages/db/src/utils/id.ts` for existing prefixes)"

### Integration Points (feature-only)

- "How does this flow between PostgreSQL (auth/core), Redis, Convex, and any external services?"

### Edge Cases (all classes)

- "What happens on invalid authorization, data conflicts, missing input, or concurrent access?"

### Reproduction / Diagnostic (test-hardening + hotfix only)

- For `test-hardening`: "Which test command produces the failure? What's the failure signal (timeout, assertion mismatch, hang)? Have we eliminated environmental causes (cache, node_modules state, fresh clone)?"
- For `hotfix`: "What's the user-visible failure? Have we reproduced it locally with the same trace as prod? What's the smallest viable fix that resolves the repro without expanding scope?"

---

## Step 2: PRD Document Structure

After all answers are collected, create the PRD following this structure:

```markdown
# PRD-XXX: [Feature Name]

> **Status**: Draft
> **Created**: [YYYY-MM-DD]
> **Cycle Phase**: 1 (PRD Generation)
> **Autonomous Close**: eligible | operator-gated
> **Audience**: Implementing Agent (Claude Code / Cursor / Codex)

## 1. Overview & Goals

[Problem being solved. "Why are we building this?"]
[Success metrics table]

## 2. User Stories

- As a [Role], I want to [Action], so that [Value].
  [Include acceptance criteria per story]

## 3. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch.

- **FR-1:** [Detailed requirement with clear pass/fail criteria]
  - **Targets:** `path/to/file.ts::SymbolName`, `path/to/other.ts`
- **FR-2:** ...
  - **Targets:** ...

## 4. Technical Specifications

- **ID Strategy:** Use NanoID with prefix `xxx_` (add to `PREFIX_MAP` in `packages/db/src/utils/id.ts`)
- **Database:** [Tables to create/modify — Drizzle schema in `packages/db/src/schema/core/{domain}/`]
- **Auth & Permissions:** [BetterAuth integration, new entries for `PERMISSION_MATRIX` in `@emofy/types`]
- **Backend:** [NestJS modules, CQRS commands/queries, guards, decorators]
- **Frontend:** [Next.js pages/components, TanStack Query hooks]
- **Cache/Queue:** [CacheService keys: `{group}:{module}:{entity}:{id}`, QueueFactory queues]
- **Types:** [Branded types: `type XxxId = ...`, Zod schemas]

## 5. Multi-Tenancy & Security

- [How is tenant isolation enforced? OrgScopedRepository usage?]
- [Data-leakage prevention measures]
- [Permission checks: which roles can perform which actions?]

## 6. Acceptance Criteria (Gherkin Style)

- **Given** [Context], **When** [Action], **Then** [Expected Result].

## 7. Non-Goals (Out of Scope)

- [What this PRD explicitly does NOT cover]

## 8. Durable Artifacts

Wiki pages, ADRs, or patterns this PRD must update on completion. Use `none` if nothing durable.

- `docs/ai-context/wiki/scripts.md` — when adding/changing root scripts
- [Other paths, or `none`]

## 9. Open Questions

- [Unresolved items — must be empty before Phase 2 PASS]

## 10. References

- [Related PRDs, docs, external links]
- [Changelog table]

## 11. Verification Commands

Commands the implementing agent runs in **Phase 5 (Testing)**. Each FR should map to at least one runnable check.

- `pnpm check-types` — zero errors
- `pnpm lint --filter <scope>` — zero warnings on touched packages
- `pnpm test --filter <scope>` — added tests pass; existing tests unchanged
- `pnpm build --filter <scope>` — clean build
- [Feature-specific: e.g., `pnpm --filter @emofy/db db:migrate`, `pnpm verify:ema-manifest`, curl probe with expected status]

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise rationalize.

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT bypass `OrgScopedRepository` (no raw `db.select()` on tenant tables).
- DO NOT reference ghost roles `"owner"` / `"workspaceAdmin"`.
- DO NOT add new permission strings outside `PERMISSION_MATRIX`.
- [Feature-specific anti-patterns]
```

---

## Step 3: File Management

- **Location:** `_prds/wip/`
- **Naming:** `prd-XXX-{short-name}.md`
- **Numbering:** Find the highest XXX across `_prds/wip/` and `_prds/completed/`, then +1.
- **Format:** 3-digit zero-padded number + kebab-case name.

---

## Step 4: Handover

After saving, prompt the user:

> "PRD saved to `_prds/wip/prd-XXX-{name}.md`. The next step is **Phase 2: Readiness Scoring** — shall I perform a Senior Staff Engineer stress test on this plan before we proceed?"

---

## Project-Specific References

| What                      | Where                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| Existing ID prefixes      | `packages/db/src/utils/id.ts` → `PREFIX_MAP`                                                      |
| Permission matrix         | `packages/types/src/permissions.ts` → `PERMISSION_MATRIX`                                         |
| 9 organization roles      | `workspaceManager`, `admin`, `teacher`, `staff`, `member`, `student`, `parent`, `viewer`, `guest` |
| PRD template              | `_prds/_TEMPLATE.md`                                                                              |
| Tech stack & architecture | `docs/ai-context/MEMORY.md`                                                                       |
| Coding standards          | `docs/ai-context/BEST_PRACTICES.md`                                                               |
| Backend module structure  | `apps/backend/src/modules/`                                                                       |
| Database schemas          | `packages/db/src/schema/auth/` and `packages/db/src/schema/core/`                                 |
