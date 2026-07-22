# Readiness Assessment: PRD-XXX — [Feature Name]

## Quick Meta

| Field                  | Value                                        |
| ---------------------- | -------------------------------------------- |
| PRD                    | `_prds/wip/prd-XXX-{name}.md`                |
| Score                  | X.X/10                                       |
| Verdict                | PASS / ITERATE / REJECT                      |
| Iteration              | 1                                            |
| Model Tier (Execution) | high / medium / fast                         |
| Model Tier (Audit)     | high / medium                                |
| Scored by              | [agent/model]                                |
| Self-scored            | yes / no (PRD'yi yazan oturum mu skorluyor?) |
| Date                   | YYYY-MM-DD                                   |
| PRD Lint               | pending / passed / waived                    |
| State Record           | pending / updated                            |

---

## Model Tier Recommendation

| Phase               | Tier                 | Rationale                                                                     |
| ------------------- | -------------------- | ----------------------------------------------------------------------------- |
| Phase 3 (Execution) | high / medium / fast | [Why this tier — based on score, RBAC/schema complexity, cross-cutting scope] |
| Phase 4 (Audit)     | high / medium        | [Why this tier]                                                               |

> **Tier guide:**
>
> - **high** = Opus 4.6, GPT-5.4 — PRD with RBAC changes, schema migrations, cross-module impact, or score < 9
> - **medium** = Sonnet 4.6, Composer 2 — Well-scoped PRD, clear acceptance criteria, single-module scope
> - **fast** = Composer 2 Fast, quick models — Trivial or repetitive tasks within a scored PRD
>
> This is a recommendation, not a constraint. Override freely based on task-level complexity.

---

## Analysis

### 1. Technical Depth & Architecture

[Findings — scalability, data consistency, performance, pattern compliance]

### 2. Edge Cases & Failure Modes

[Findings — failure modes, input validation, concurrent access, side effects, data migration]

### 3. Maintainability & DX

[Findings — observability, type safety, self-documentation, pattern consistency]

### 4. Migration & Rollback

[Findings — backward compatibility, deployment order, undo plan]

---

## Scorecard

| #         | Dimension                | Weight | Score      | Notes                       |
| --------- | ------------------------ | ------ | ---------- | --------------------------- |
| 1         | Clarity                  | 15%    | X/10       | ...                         |
| 2         | Completeness             | 20%    | X/10       | ...                         |
| 3         | Technical Depth          | 25%    | X/10       | ...                         |
| 4         | Multi-Tenancy & Security | 20%    | X/10       | ...                         |
| 5         | Scope & Testability      | 10%    | X/10       | ...                         |
| 6         | Migration & Rollback     | 10%    | X/10       | ...                         |
| **Total** | **Weighted**             |        | **X.X/10** | **PASS / ITERATE / REJECT** |

---

## Missing Pieces (to reach 10/10)

1. [Specific gap and recommended fix]
2. [Specific gap and recommended fix]
3. ...

---

## Iteration History

| #   | Date       | Score | Verdict        | Key Changes        |
| --- | ---------- | ----- | -------------- | ------------------ |
| 1   | YYYY-MM-DD | X.X   | ITERATE / PASS | Initial assessment |

> When re-scoring: update Quick Meta with latest score/verdict, append a new row here, keep previous analysis sections for reference (mark superseded sections with ~~strikethrough~~).

---

## Emofy-Specific Checklist

> Only fill categories relevant to this PRD's scope. Mark entire category as N/A if not applicable.

### Always (every PRD)

- [ ] Ghost roles `"owner"` / `"workspaceAdmin"` are NOT referenced
- [ ] All DB queries use `OrgScopedRepository` or explicit `orgId` filter
- [ ] No `any` types — `unknown` with narrowing only

### Database & Schema (if new/modified tables)

- [ ] New entity IDs use `generateId('entity')` with prefix in `PREFIX_MAP`
- [ ] Table is in the correct DB (identity → Auth DB, business logic → Core DB)
- [ ] No cross-DB joins (Auth DB ↔ Core DB)
- [ ] Correct client import (`createAuthDatabase` vs `createCoreDatabase`)
- [ ] `deletedAt` column present on new entities (soft delete)
- [ ] No hard delete (except test cleanup)

### Permissions & Roles (if new resources/actions)

- [ ] New permissions added to `PERMISSION_MATRIX` in `@emofy/types`
- [ ] All 9 roles accounted for in the matrix update
- [ ] Union-of-permissions (multi-role) considered
- [ ] Backend: `@Permissions()` or `@Roles()` decorators on endpoints
- [ ] Frontend: `<Can>` component or `usePermission` hook on UI elements
- [ ] Correct import source (web: `@emofy/ramarkable/permissions`, EMA: `@emofy/ramarkable/ema/hooks`)

### Backend (if new/modified modules)

- [ ] Controller → Service → Repository pattern followed
- [ ] Request pipeline: `JwtAuthGuard → OrgScopeInterceptor → OrgGuard → PermissionGuard → RolesGuard`
- [ ] `@Public()` or `@SkipOrgValidation()` usage justified
- [ ] API Key auth: `@ApiKeyAuth()` + `ApiKeyGuard` if needed
- [ ] CQRS: commands/ and queries/ directories for new domain logic
- [ ] Cache keys via `CacheService` (`{domain}:{resource}:{id}`)
- [ ] Queue names via `QueueFactory` (`{group}:{module}:{action}`)

### Domain Events & Notifications (if new events)

- [ ] New domain event added to `EVENT_CLASS_TO_DOT` map (webhook dispatch)
- [ ] Notifications via `NotificationDispatcher.dispatch()` — not direct repository

### Frontend (if UI changes)

- [ ] Components from `@emofy/ramarkable` only — `@emofy/ui` is DEPRECATED
- [ ] API calls via `TanStack Query` + `apiClient` — no raw fetch
- [ ] Feature code in `apps/web/src/features/{feature}/`
- [ ] New components: `data-slot`, `forwardRef`, `displayName`, CVA + `cn()`
- [ ] CSS tokens: `--rds-*` (not legacy `--background` etc.)
- [ ] Logical Tailwind: `ms-`/`me-` (not `ml-`/`mr-`)

### Real-time (if Convex integration)

- [ ] Real-time features use `@emofy/convex` package
- [ ] Convex mutations/queries defined in the package, not in apps

### Environment & Config (if new env vars)

- [ ] New env var added to `@emofy/env` Zod schema (correct export: server/web/native/backend)
- [ ] Added to `turbo.json` `globalEnv` if needed
- [ ] App-specific scope documented (which apps need it)

---

## Verdict

[PASS — proceed to Phase 2b task generation / ITERATE — fix gaps listed above, re-score / REJECT — return to Phase 1 for redesign]

If verdict is PASS, record evidence that `pnpm verify:prd-ready -- _prds/wip/prd-XXX-{name}.md` passed or was explicitly waived with rationale.
