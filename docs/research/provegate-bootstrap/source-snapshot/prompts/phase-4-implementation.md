# Phase 4: Production-Grade Execution Protocol

> **Cycle Phase:** 4 of 7 (was Phase 3 in the old 4-step model — renumbered by PRD-248)
> **Role:** Senior Implementation Engineer
> **Goal:** Implement every task with zero technical debt, maximum type safety, and continuous verification.
>
> **PRD-248 split:** This phase still runs the inline `check-types` + `lint` loop after each sub-task, and still writes risk-class integration tests next to the behavior they cover. But the **full test gate** — executing every PRD §11 Verification Command against a real environment — is now its own **Phase 5** (`phase-5-testing.md`). Implementation is "done" when the code is written and the inline gates pass; proving it via §11 is Phase 5's job.

---

## Agent Constraints

1. **Persistence:** Work autonomously until every agent-finishable task is completed, blocked, or handed off to the operator with evidence. Do not stop mid-way.
2. **Atomic Progress:** Update the task file (`_tasks/wip/tasks-XXX-{name}.md`) immediately after each sub-task.
3. **Minimalism:** No conversational filler. No unnecessary comments. Code must be clean and self-explanatory.
4. **No Over-Engineering:** Do not add verbose JSDoc or comments unless the logic is genuinely complex.
5. **Scope Locking:** Do not modify files or refactor code outside the current PRD's scope unless strictly necessary.
6. **Model Tier Awareness:** Check the readiness report (`_readiness/wip/readiness-XXX-{name}.md`) for the recommended model tier. For complex sub-tasks (RBAC, schema, cross-module) escalate to a higher tier; for repetitive or trivial sub-tasks, a lower tier is acceptable.
7. **Worktree-Isolated Lock Required:** Claim the PRD with `pnpm prd:start PRD-XXX [--agent name]` — one command creates the worktree, the lock, and the `_STATUS.md` row. **Then `cd` into the printed `.worktrees/prd-XXX-…` path and do _every_ edit, build, and commit there.** Release with `pnpm prd:stop PRD-XXX` when complete, blocked, or handed off. Never open the source branch in the main checkout — `git checkout -b` / `git switch -c` / `pnpm wip --branch` on a base branch for Phase 4 work is **forbidden**; `prd:start` is the only sanctioned entry. Hand-written lock files are a fallback **only** when the wrapper genuinely cannot run (follow WORKFLOW.md → Manual fallback, then `pnpm verify:status-sync`).
8. **Symbol-first navigation (Serena):** Before `Read` on any TypeScript file estimated >200 lines, run `get_symbols_overview` on its directory, then `find_symbol` with shallow bodies first. See `docs/ai-context/patterns/serena-symbol-navigation.md`.
9. **Guard failures are STOP signals:** If a `verify:*` gate fails for a reason unrelated to your change (table formatting, another PRD's rows, stale state), stop and report it — do **not** bypass the gate, hand-edit whatever format it expects, or modify the guard script. Guards are part of the workflow contract; changing one is an `infra`-class PRD of its own.

---

## Execution Loop

For each uncompleted task:

```
0. LOCK   → pnpm state:prd -- PRD-XXX, then pnpm prd:start PRD-XXX (worktree + lock + status row)
          → cd .worktrees/prd-XXX-…  (the path prd:start prints — all later steps run HERE)
          → pnpm verify:agent-locks && pnpm verify:branch-isolation && pnpm prd:doctor   (start gate — must pass)
1. READ   → Identify the next uncompleted sub-task
2. EXECUTE → Write the code changes
3. VERIFY  → Run pnpm check-types && pnpm lint
4. TEST    → Run pnpm test --filter=<affected-packages> (skip if no test infra exists for package)
           → Risk-class gate: if this sub-task touched guards, permissions/roles, org-scoping,
             auth flows, or user-controlled query/search filters, write the integration test NOW,
             inside the same parent task — Phase 4 cannot accept `skipped` for this gate.
5. UPDATE  → Mark only completed-as-written items [x], update Relevant Files and Verification Ledger
6. SYNC    → Run pnpm state:sync at parent-task completion (not per sub-task: _state/prds.json is
             committed, and per-sub-task syncs create merge conflicts between parallel agents)
7. COMMIT  → Commit with Conventional Commits format when the agent mode allows commits
8. REPEAT  → Next sub-task (continue autonomously; stop only for PRD/task gaps or blockers — see Error & Blocker Management)
```

---

## Technical Quality Standards

### TypeScript

- **No `any`**. No `unknown` without narrowing. Leverage the project's type system.
- Use branded types from `@emofy/types` for all entity IDs.
- Use `interface` over `type` alias for object shapes.
- Explicit return types on all functions.

### Backend (NestJS)

- Follow `Controller → Service → Repository` pattern.
- Use `OrgScopedRepository` for all tenant-scoped entities.
- Validate all inputs with `class-validator` DTOs.
- Protect endpoints with `@Permissions()` or `@Roles()` decorators.
- Use `@OrgId()` and `@UserId()` to extract context from request.
- Register new modules in the appropriate NestJS module.

### Frontend (Next.js)

- Use TanStack Query for all API calls (no raw `fetch` in components).
- Permission-gate UI elements with `<Can>` from `@emofy/ramarkable/permissions`.
- Place feature code in `apps/consumer/src/features/{feature}/`.
- Use `apiClient` from `@/lib/api/client` — never hardcode API URLs.

### Database

- Schemas go in `packages/db/src/schema/core/{domain}/`.
- Use `generateId('entity')` for all ID defaults.
- Soft delete via `deletedAt` column — never hard delete tenant data.
- Run `pnpm db:push` after schema changes in development.

### Infrastructure

- Queue names: `QueueFactory.createQueue(group, module, action)`.
- Cache keys: `CacheService.get/set(group, module, entity, id)`.
- Never use raw `new Queue()` or raw Redis commands.

---

## Verification Commands

Run after **every** sub-task:

```bash
pnpm check-types    # TypeScript compilation — must pass
pnpm lint            # ESLint — must pass
pnpm test --filter=<affected-packages>  # Tests — must pass (skip if no test infra)
```

Run after **every** parent task:

```bash
pnpm build           # Full build — must pass
```

If any command fails, fix the issue before moving to the next task. Never leave broken state.

Record every verification attempt in the task file's `Verification Ledger` with one of these results: `passed`, `failed`, `partial`, `skipped`, `operator`, or `blocked`. Use `operator` for checks requiring a human, browser session, staging environment, DB credentials, production-like services, or seeded runtime data.

---

## Commit Protocol

After each logical unit of work (typically 1-3 sub-tasks), when the current agent mode allows commits:

```
<type>(<scope>): <description>

Types: feat, fix, refactor, chore, docs, test
Scopes: web, backend, db, types, auth, ui, admin, etc.
```

Rules: lowercase, no period, max 72 chars, imperative mood.

Cursor Composer exception: do not commit unless the user explicitly asked for commits. Record `changes uncommitted` in the Progress Log or Verification Ledger instead.

---

## Error & Blocker Management

- **Type errors:** Fix immediately. Do not proceed with broken types.
- **Design questions not covered in PRD:** Stop and ask the user for clarification.
- **Unexpected complexity:** Log it as a note in the task file's "Blockers" section and continue if possible.

---

## Status Updates

### During Execution

`pnpm prd:start` already added your row to the `_STATUS.md` "Aktif Agent'lar" table and wrote the lock — do not hand-edit either.

- Log significant completions in "Son Aktiviteler" as you go.
- Release with `pnpm prd:stop PRD-XXX` at final handoff (removes the lock + the status row); rerun `pnpm verify:agent-locks` to confirm.

### Task File Updates

After each sub-task:

1. Mark `[ ]` → `[x]` only when the task is completed as written
2. Leave operator-owned, environment-dependent, or blocked tasks unchecked and add them to `Operator Handoff`
3. When all required sub-tasks of a parent are `[x]`, mark the parent `[x]` too
4. Add new/modified files to "Relevant Files" section
5. Note any deviations or decisions in "Progress Log" (or "Deferrals & Decisions" if present)
6. Update `Verification Ledger` after every verification attempt

**STRICT — Sub-task line edits:**

- **NEVER modify the text of a sub-task line.** Only flip `[ ]` → `[x]`. The original wording, file paths, and bracketed labels must stay byte-identical.
- **NEVER append inline notes, justifications, "Deferred — ...", "covered by ...", carry-forwards, follow-ups, or implementation summaries to a sub-task line.** A completed sub-task line must read exactly as the Phase 3 generator wrote it, with the box checked.
- All annotations (deferrals, deviations, carry-forwards, decisions, follow-ups, blockers) go in **dedicated sections** at the bottom of the file:
  - Short single-line decisions / deferrals → **Deferrals & Decisions** (bullet list).
  - Multi-line context / runtime issues → **Progress Log** (table).
  - Hard blockers / open questions → **Blockers / Open Questions**.
- If a sub-task is not done because it requires operator/runtime/staging work, leave it unchecked and add ONE row under **Operator Handoff**. If a scope cut is intentionally accepted, document the decision in **Deferrals & Decisions** and keep any required verification task unchecked until Phase 4 triage.
- Rationale: the task file is the implementation contract. Inline commentary turns it into a changelog and makes diffs / Phase 4 audit unreadable. Decisions belong in the decision log.

---

## Coding Standards Reference

| Standard                | Location                                   |
| ----------------------- | ------------------------------------------ |
| Full coding standards   | `docs/ai-context/BEST_PRACTICES.md`        |
| Project architecture    | `docs/ai-context/MEMORY.md`                |
| API conventions         | `.cursor/rules/api-conventions.mdc`        |
| Role & permission rules | `.cursor/rules/role-permission-system.mdc` |
| Commit message format   | `.cursor/rules/commit-messages.mdc`        |
| Backend module guide    | `docs/guides/BACKEND_NEW_MODULE_GUIDE.md`  |
