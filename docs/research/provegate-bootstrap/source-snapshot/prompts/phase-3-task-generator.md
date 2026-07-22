# Phase 3: Task List Generator Protocol

> **Cycle Phase:** 3 of 7 (Task Generation; was Phase 2b in the old 4-step model — renumbered by PRD-248)
> **Role:** Technical Lead
> **Goal:** Transform a scored PRD (>= 8/10) into an atomic, step-by-step implementation plan that an **implementing agent** can execute without ambiguity — every sub-task references the PRD's Targets, Verification Commands, and DO NOT lists.

---

## Agent Constraints

1. **Pre-Condition:** The PRD must have a Readiness Score of 8/10 or higher, with a saved readiness report at `_readiness/wip/readiness-XXX-{name}.md`. If the report does not exist, warn the user and recommend returning to Phase 2.
2. **No Implementation:** This phase produces a task document only — zero code changes.
3. **Agent-Executable:** Every sub-task must include the exact file path it touches (carry over from the PRD's `FR-N → Targets` lines). Sub-tasks without a path fail the gate — return to Phase 1 to fill in Targets.
4. **Test-Driven:** Every logical task group must include a corresponding test sub-task.
5. **Strict Typing:** Include notes in tasks that forbid `any` and mandate branded types.
6. **Verification Wired:** The QA parent task must run every command from the PRD's Verification Commands section — no ad-hoc additions, no omissions.
7. **Outcome Semantics:** Generate task files where `[x]` means completed as written. Do not instruct future agents to check off operator-owned, blocked, or deferred verification work.

---

## Process

### Phase A: Parent Tasks (Skeleton)

1. Read the PRD, `docs/ai-context/MEMORY.md`, and `docs/ai-context/BEST_PRACTICES.md`.
2. Read the PRD's `PRD Class` field (default `feature`). Pick the matching parent-task skeleton below.

#### Class: `feature` — full 7-category skeleton

Create ~5-7 parent tasks following this recommended order:

| Order | Parent Task Category          | Covers                                                              |
| ----- | ----------------------------- | ------------------------------------------------------------------- |
| 1     | **Database & Infrastructure** | Drizzle schema, prefixed IDs, migrations, branded types             |
| 2     | **Backend Core Logic**        | NestJS module, service, repository, CQRS commands/queries           |
| 3     | **API & Validation**          | Controllers, DTOs (class-validator), Zod schemas, guards            |
| 4     | **Events & Integration**      | Domain events, queue jobs, cache, webhooks, audit logging           |
| 5     | **Frontend Implementation**   | Next.js pages/components, TanStack Query hooks, UI                  |
| 6     | **Permissions & Security**    | PERMISSION_MATRIX updates, @Permissions decorators, <Can> rendering |
| 7     | **Phase 5 — Testing**         | Run every PRD §11 command; update Verification Ledger with evidence |
| 8     | **Phase 6 — Final Auditing**  | Independent adversarial review; `pnpm verify:workflow`; spec audit  |
| 9     | **Phase 7 — Learning**        | Wiki ingest; `verify:durable-artifacts`; summary; `ship:pre`        |

#### Class: `test-hardening` — diagnostic-first skeleton

Single-test or test-infra fix. The feature 7-category skeleton overfits; use this instead.

| Order | Parent Task Category         | Covers                                                                                                      |
| ----- | ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 0     | **Pre-flight**               | `pnpm prd:start`, lock acquisition, baseline reproduction of the failure                                    |
| 1     | **Diagnostic**               | Read sources, run `--detectOpenHandles` / `--verbose`, identify root cause; **must complete before Step 2** |
| 2     | **Fix**                      | Minimum-blast-radius change. Strategy depends on diagnostic. Stub-shape contracts go here.                  |
| 3     | **Audit**                    | Workaround grep (no `testPathIgnorePatterns` flags leaked), CI workflow check                               |
| 4     | **Doc**                      | TODOS.md promotion (if applicable), inline comment recording root cause + fix for future contributors       |
| 5     | **Quality gate**             | Run every command from PRD §11 Verification Commands; re-read PRD §12 DO NOT and confirm none introduced    |
| 6     | **Phase 6 — Final Auditing** | Independent review + `pnpm verify:workflow` + summary draft                                                 |
| 7     | **Phase 7 — Learning**       | Wiki ingest, `verify:durable-artifacts`, `ship:pre`, `pnpm prd:stop`                                        |

#### Class: `hotfix` — repro → fix → verify

Production bug fix with bounded blast radius. Similar to test-hardening but oriented around the user-visible failure.

| Order | Parent Task Category         | Covers                                                                                        |
| ----- | ---------------------------- | --------------------------------------------------------------------------------------------- |
| 0     | **Pre-flight**               | Lock, baseline repro (matching the production failure trace as closely as possible)           |
| 1     | **Repro**                    | Stable local reproduction with the same failure signal as prod; capture trace in Deferrals    |
| 2     | **Fix**                      | Minimum diff that resolves the repro; explicit non-goals if scope creep is tempting           |
| 3     | **Verify**                   | Confirm fix on the repro + run the affected test suite + regression check on related surfaces |
| 4     | **Doc**                      | Incident note (if applicable), inline comment recording the bug + fix                         |
| 5     | **Quality gate + Phase 6/7** | check-types/lint/test + independent review + `ship:pre` + `/review` + `/ship`                 |

#### Class: `infra` — workflow / tooling / CI / deploy change

Use the feature 7-category skeleton but add **Migration & Rollback Plan** as an explicit parent task between Implementation and Phase 5 Testing. Migration weight at Phase 2 is 20% for this class — the parent task must mirror that emphasis.

3. Present parent tasks to user with:

   > "High-level implementation plan ready. Type **Go** to generate detailed sub-tasks with file paths."

4. **STOP** — Do not continue until the user says "Go". Exception: in autonomous-execution mode (single-session test runs, agent-led sweeps), document the skipped approval gate in the task file's **Deferrals & Decisions** before proceeding.

### Phase B: Sub-Tasks & Relevant Files

After user approval:

1. Break each parent into atomic sub-tasks with explicit instructions.
2. Include specific file paths based on the monorepo structure.
3. Add a "Relevant Files" section listing all files that will be created or modified.
4. Place risk-class integration tests (guards, permissions/roles, org-scoping, auth flows, user-controlled filters) as sub-tasks **inside the implementation parent that introduces the behavior**, not in the Phase 5 Testing parent — the test is written while the behavior is built, and Phase 6 cannot accept `skipped` for this gate.

---

## Task Numbering

- Parent tasks: `1.0`, `2.0`, `3.0` ...
- Sub-tasks: `1.1`, `1.2`, `1.3` ... / `2.1`, `2.2` ...

---

## Output Format

```markdown
# Tasks: [Feature Name]

> **PRD**: [prd-XXX-{name}.md](../../_prds/wip/prd-XXX-{name}.md)
> **Readiness**: [readiness-XXX-{name}.md](../../_readiness/wip/readiness-XXX-{name}.md)
> **Status**: Not Started
> **Readiness Score**: [X.X/10]
> **Model Tier (Execution)**: [high / medium / fast — from readiness report]
> **Created**: [YYYY-MM-DD]

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- A PRD may be `Code Complete` with operator handoff items, but it is not `Ship Verified` until required handoff items are resolved or explicitly accepted.

## Technical Standards Reference

- **ID Strategy:** Prefix: `xxx_` | Generator: `generateId('entity')`
- **Validation:** class-validator (DTOs) + Zod (shared schemas)
- **Multi-Tenancy:** OrgScopedRepository (auto orgId + deletedAt filter)
- **Cache:** CacheService key: `{group}:{module}:{entity}:{id}`
- **Queue:** QueueFactory name: `{group}:{module}:{action}`

## Relevant Files

- `packages/db/src/schema/core/{domain}/{entity}.ts` — Drizzle schema
- `packages/db/src/utils/id.ts` — Add prefix to PREFIX_MAP
- `packages/types/src/permissions.ts` — Add to PERMISSION_MATRIX
- `apps/backend/src/modules/{module}/{module}.service.ts` — Business logic
- `apps/backend/src/modules/{module}/{module}.controller.ts` — REST endpoints
- `apps/backend/src/modules/{module}/dto/index.ts` — DTOs
- `apps/backend/src/modules/{module}/commands/` — CQRS commands
- `apps/backend/src/modules/{module}/queries/` — CQRS queries
- `apps/consumer/src/features/{feature}/` — Frontend components
- `apps/consumer/src/features/{feature}/hooks/` — TanStack Query hooks

## Tasks

- [ ] 1.0 Database & Infrastructure
  - [ ] 1.1 Add `xxx` prefix to `PREFIX_MAP` in `packages/db/src/utils/id.ts`
  - [ ] 1.2 Create Drizzle schema in `packages/db/src/schema/core/{domain}/{entity}.ts`
  - [ ] 1.3 Add branded type `XxxId` in `packages/types/src/ids.ts`
  - [ ] 1.4 Run `pnpm db:push` to sync schema
- [ ] 2.0 Backend Core Logic
  - [ ] 2.1 Create NestJS module at `apps/backend/src/modules/{name}/`
  - [ ] 2.2 Implement repository extending `OrgScopedRepository`
  - [ ] 2.3 Implement service with business logic
  - [ ] 2.4 Add CQRS commands and handlers
- [ ] 3.0 API & Validation
  - [ ] 3.1 Create DTOs with class-validator decorators
  - [ ] 3.2 Create controller with `@OrgId()`, `@UserId()` decorators
  - [ ] 3.3 Add Swagger documentation with `@ApiStandardResponses()`
- [ ] 4.0 Events & Integration
  - [ ] 4.1 Define domain events
  - [ ] 4.2 Add audit logging integration
  - [ ] 4.3 Add webhook registry integration
  - [ ] 4.4 Configure cache with CacheService
- [ ] 5.0 Frontend Implementation
  - [ ] 5.1 Create TanStack Query hooks
  - [ ] 5.2 Build UI components
  - [ ] 5.3 Add page route and navigation entry
- [ ] 6.0 Permissions & Security
  - [ ] 6.1 Add entries to PERMISSION_MATRIX in `@emofy/types`
  - [ ] 6.2 Build and verify: `pnpm --filter @emofy/types build`
  - [ ] 6.3 Add `@Permissions()` decorators to controller
  - [ ] 6.4 Add `<Can>` wrappers in frontend
- [ ] 7.0 Phase 5 — Testing — run **every** command from PRD §11 Verification Commands
  - [ ] 7.1 Run `pnpm check-types` — fix all errors
  - [ ] 7.2 Run `pnpm lint` — fix all warnings
  - [ ] 7.3 Run `pnpm build` — verify clean build
  - [ ] 7.4 Run feature-specific commands from PRD §11 (list each one as its own checkbox)
  - [ ] 7.5 Manual test scenarios from acceptance criteria
  - [ ] 7.6 Re-read PRD §12 DO NOT — confirm no anti-patterns introduced (grep for `any`, ghost roles, raw `db.select` on tenant tables, etc.)
- [ ] 8.0 Phase 6 — Final Auditing
  - [ ] 8.1 Independent adversarial review (ledger row `independent-review`)
  - [ ] 8.2 Run `pnpm verify:workflow`
  - [ ] 8.3 Create summary at `_docs/wip/summary-XXX-{name}.md`
- [ ] 9.0 Phase 7 — Learning
  - [ ] 9.1 Wiki ingest per `wiki-ingest.md`
  - [ ] 9.2 Run `pnpm verify:durable-artifacts -- _prds/wip/prd-XXX-{name}.md`
  - [ ] 9.3 Run `pnpm ship:pre` and update `_STATUS.md`

## Verification Ledger

| Gate  | Command / Check    | Scope             | Result  | Evidence | Notes |
| ----- | ------------------ | ----------------- | ------- | -------- | ----- |
| types | `pnpm check-types` | monorepo          | pending |          |       |
| lint  | `pnpm lint`        | monorepo          | pending |          |       |
| build | `pnpm build`       | affected packages | pending |          |       |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

## Deferrals & Decisions

> Short, single-line entries written **during Phase 4 execution** when a non-obvious implementation decision, scope cut, or accepted design deviation is taken. Format: `- <task#> — <decision>; <≤1 sentence rationale>`. Do **NOT** put these notes inline next to the sub-task checkbox — sub-task lines stay byte-identical to what this generator wrote. Operator-owned verification belongs in **Operator Handoff**, not here.

- (none yet)

## Progress Log

> Multi-line runtime context, deviations, or implementation notes that don't fit on one line. Use this for things like "had to extend X service to support Y because Z".

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

## Blockers / Open Questions

- (none)

## Operator Handoff

> Human/runtime/staging checks that cannot be completed by the agent. Keep the corresponding task checkbox unchecked until this is resolved or explicitly accepted in Phase 4.
> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`} — what kind of operator action unblocks it.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
|      |          |       |                |        |       |
```

---

## File Management

- **File Name:** `tasks-XXX-{short-name}.md`
- **Number:** Same XXX as the corresponding PRD
- **Location:** `_tasks/wip/`

---

## Project Path Reference

| Scope                  | Path                                    |
| ---------------------- | --------------------------------------- |
| Auth DB schemas        | `packages/db/src/schema/auth/`          |
| Core DB schemas        | `packages/db/src/schema/core/{domain}/` |
| ID generation          | `packages/db/src/utils/id.ts`           |
| Shared types / RBAC    | `packages/types/src/`                   |
| Backend modules        | `apps/backend/src/modules/`             |
| Backend infrastructure | `apps/backend/src/infrastructure/`      |
| Backend common         | `apps/backend/src/common/`              |
| Consumer app features  | `apps/consumer/src/features/`           |
| Consumer app pages     | `apps/consumer/src/app/w/[orgId]/`      |
| Admin app pages        | `apps/admin/src/app/(protected)/`       |
| UI components          | `packages/ui/src/components/`           |
