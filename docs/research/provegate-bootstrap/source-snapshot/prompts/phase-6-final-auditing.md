# Phase 6: Final Auditing

> **Cycle Phase:** 6 of 7 (was Phase 4 in the old 4-step model — renumbered by PRD-248)
> **Role:** Quality Assurance Lead
> **Goal:** Verify the implementation matches the PRD, run the independent adversarial review, and provide a sign-off report.
>
> **PRD-248 split:** Testing moved out to **Phase 5** (`phase-5-testing.md`) — by the time you reach Phase 6, every §11 command has already been executed. Memory/wiki sync moved out to **Phase 7** (`phase-7-learning.md`), which runs _after_ this audit and _before_ the merge. This phase now focuses on the **independent adversarial review** (reviewer panel, different model family) and spec-vs-code audit. The reviewer panel uses 5 lenses (correctness / security / cross-tenant / contract / perf) with a ≥3/5 `pass` quorum; if quorum can't be reached, the gate is `fail` (STOP).

---

## Agent Constraints

1. **No New Features:** This phase is verification and documentation only. Do not add features or refactor code.
2. **Thorough:** Check every constraint from the PRD against the actual implementation.
3. **Update Memory:** The project's shared memory (`MEMORY.md`/wiki, `_STATUS.md`) must reflect any architectural changes.
4. **Ship Gate:** Decide whether the PRD is `Ship Verified` or remains in `Operator Verification`. Do not archive PRDs with unresolved required operator checks. Shipping with accepted-but-not-run operator checks requires explicit `> **Operator Acceptance**:` meta on the PRD (owner decision).
5. **State Gate:** Run `pnpm state:sync`, `pnpm state:wiki-log`, `pnpm verify:prd-state`, `pnpm verify:deferred`, `pnpm verify:memory-drift`, and `pnpm verify:doc-bloat`. Do not declare `Ship Verified` while any state, drift, deferral, or doc-bloat check fails.
6. **Review Gate:** `Ship Verified` requires an independent adversarial review of the diff by an agent that did not write the code (default: gstack `/codex` review; see Step 1.6). The implementing agent's own audit is necessary but not sufficient.

---

## Step 1: Verification Audit (Spec vs. Code)

### 1.1 Constraint Matching

Cross-reference the final code against the original PRD:

- [ ] Every Functional Requirement (FR-1, FR-2, ...) is implemented
- [ ] Every User Story has a corresponding code path
- [ ] Every Acceptance Criterion can be verified
- [ ] Non-Goals are respected — nothing out-of-scope was added

### 1.2 Code Hygiene

- [ ] No `console.log` statements left in production code
- [ ] No `FIXME` / `TODO` / `HACK` comments from development
- [ ] No commented-out code blocks
- [ ] No `any` type annotations or `as any` casts
- [ ] No hardcoded values that should be configuration

### 1.3 Build Verification

Run the full verification suite:

```bash
pnpm build          # Full monorepo build
pnpm check-types    # TypeScript strict mode
pnpm lint           # ESLint
pnpm test --filter=<affected-packages>  # Tests for affected packages
```

All four must pass cleanly with zero errors. Skip `pnpm test` for packages without test infrastructure.

### 1.3b Verification Evidence

Read the task file's `Verification Ledger` and confirm every required gate has evidence:

- [ ] `passed` rows include the command/check, scope, and concrete evidence
- [ ] `partial` rows explain the narrower scope and why full scope could not run
- [ ] `skipped` rows are truly not applicable
- [ ] `operator` rows are copied into the summary's `Operator Handoff`
- [ ] `blocked` rows include a resumption condition

If any required gate is `operator` or `blocked`, mark the PRD `Operator Verification` instead of `Ship Verified`.

### 1.3c Execute the PRD's Verification Commands

Run every command in the PRD's **Verification Commands** sections and paste the command + trimmed output into the ledger/summary as evidence. A listed-but-not-run command is `operator` or `blocked` — never `passed`.

### 1.3d Risk-Class Test Gate

If the diff touches guards, permissions/roles, org-scoping, auth flows, or user-controlled query/search filters: confirm at least one integration test exercises the new behavior. This gate may only be `passed` or `failed` — `skipped` is not acceptable; `operator` requires `Operator Acceptance` meta on the PRD.

### 1.6 Independent Adversarial Review (blocking)

Run an independent review of the full diff vs base by a reviewer that did **not** write the code:

1. Default: gstack `/codex` review mode (different model family, pass/fail gate). Fallback: a fresh agent session with no implementation context, prompted to refute the diff.
2. Triage every finding: fix it, or waive it with a one-line justification.
3. Save the raw review output (findings + verdict) to `_docs/reviews/review-XXX-{short-name}.md` using `_docs/reviews/_TEMPLATE.md` metadata (PRD≥249). Run `pnpm verify:review-artifact -- <path> PRD-XXX` before recording the ledger row.
4. Record a ledger row `independent-review` with the tool, diff range, verdict (`passed` / `failed`), and the saved review path.

### 1.4 Multi-Tenancy Audit

- [ ] All new DB queries include `orgId` filter (via `OrgScopedRepository` or explicit WHERE)
- [ ] No cross-tenant data leakage paths
- [ ] New endpoints are protected by `OrgGuard` (or explicitly marked `@SkipOrgValidation()` with justification)
- [ ] New entities use `generateId('entity')` with correct prefix

### 1.5 Permission Audit

- [ ] New resources/actions added to `PERMISSION_MATRIX` in `@emofy/types`
- [ ] Backend endpoints protected with `@Permissions()` or `@Roles()` decorators
- [ ] Frontend elements gated with `<Can>` component or `usePermission` hook
- [ ] Ghost roles `"owner"` / `"workspaceAdmin"` are NOT referenced anywhere

---

## Step 2: Memory & Architecture Sync

### 2.1 Run Wiki Ingest

Run `docs/ai-context/prompts/wiki-ingest.md` for completed PRDs. Update the relevant wiki pages instead of writing long-form status into `_STATUS.md`:

| Change                       | Wiki Page to Update                     |
| ---------------------------- | --------------------------------------- |
| New database tables          | `docs/ai-context/wiki/database.md`      |
| New entity ID prefixes       | `docs/ai-context/wiki/entity-ids.md`    |
| New packages or apps         | `docs/ai-context/wiki/architecture.md`  |
| New permissions/resources    | `docs/ai-context/wiki/permissions.md`   |
| Architecture pattern changes | `docs/ai-context/wiki/architecture.md`  |
| PRD status changed           | `docs/ai-context/wiki/current-state.md` |

### 2.2 Update `_STATUS.md`

1. Add one short row to **Son aktiviteler** (link to `_docs/completed/summary-*.md` for detail; keep each line under ~200 chars).
2. Update PRD status as `Code Complete`, `Operator Verification`, or `Ship Verified`.
3. Remove yourself from **Aktif Agent'lar** when done.
4. Keep long PRD prose out of `_STATUS.md` — use summary files + `wiki/current-state.md`.
5. Any deferred/follow-up item this PRD leaves behind gets a row in "Bekleyen follow-ups" or "Deferred" with **Sahip** + **Vade** (`YYYY-MM-DD`) + **Yenileme** (`0`) — `pnpm verify:deferred` fails on missing/overdue rows and on `Yenileme > 1` (see WORKFLOW.md → Deferral Policy). If the 15-row cap is full: convert the oldest row to a PRD and delete it, then add yours. Never skip recording a deferral because the cap is full.

### 2.2b Update Workflow State

1. Remove any `_state/locks/*.json` lock owned by the finishing agent.
2. Run `pnpm state:sync`.
3. Run `pnpm state:wiki-log` (appends the ship-log line; commit `wiki/log.md` if it changed).
4. Run `pnpm verify:agent-locks`.
5. Run `pnpm verify:prd-state`.
6. Run `pnpm verify:deferred`.
7. Run `pnpm verify:memory-drift`.
8. Run `pnpm verify:doc-bloat`.

If any check is `blocked` or failing because of operator-owned work, mark the PRD `Operator Verification`.

### 2.3 Self-Improvement (Pattern Capture)

If this implementation introduces patterns that future agents must follow, update the AI Brain:

| Signal                                   | Update Target                                 |
| ---------------------------------------- | --------------------------------------------- |
| New DB table or schema domain            | `wiki/database.md`                            |
| New entity ID prefix                     | `wiki/entity-ids.md`                          |
| New permission resource/action           | `wiki/permissions.md`                         |
| New reusable code pattern (3+ files)     | `BEST_PRACTICES.md` → relevant section        |
| New base class, guard, or interceptor    | `BEST_PRACTICES.md` → relevant section        |
| Multi-tenancy edge case or bypass        | `BEST_PRACTICES.md` → Security section        |
| New infrastructure pattern (queue/cache) | `BEST_PRACTICES.md` → Queue & Cache section   |
| Workflow step changed                    | `WORKFLOW.md` → relevant phase                |
| Cursor-specific enforcement needed       | `.cursor/rules/` → new or updated `.mdc` file |

Full self-improvement protocol: `.cursor/rules/self-improve.mdc`

### 2.4 Memory Pruning

Check for stale information across memory systems:

- [ ] Claude Code memory (`~/.claude/projects/.../memory/`): Remove or update any notes that reference completed PRDs as "active", resolved issues, or outdated patterns
- [ ] Serena memory (`project/current-state`): Update PRD counts to match `_STATUS.md`
- [ ] Wiki stale check: If this PRD introduced new DB tables, entity prefixes, or permissions, verify the counts in `wiki/database.md`, `wiki/entity-ids.md`, `wiki/permissions.md` still match reality
- [ ] `_STATUS.md` deferred items: Remove any strikethrough items (already resolved)
- [ ] `_state/prds.json`: refreshed with `pnpm state:sync`
- [ ] Workflow state checks: `pnpm verify:prd-state`, `pnpm verify:memory-drift`, and `pnpm verify:doc-bloat` pass

### 2.5 Wiki Lint (if structural changes)

If this PRD introduced any of the following, run the wiki-lint protocol (`prompts/wiki-lint.md`):

- New DB tables or schema domains
- New entity ID prefixes
- New permission resources or actions
- New apps or packages
- New architectural patterns

For minor PRDs (UI-only, bug fixes), skip this step.

---

## Step 3: Documentation & Archiving

### 3.1 Create Summary Document

Create at `_docs/wip/summary-XXX-{name}.md`:

```markdown
# Development Summary: [Feature Name]

## Overview

[Brief description of what was implemented]

## Key Features

- Feature 1
- Feature 2

## Technical Implementation

[Architecture decisions, patterns used, notable choices]

## Files Created/Modified

### Database

- `packages/db/src/schema/core/{domain}/{file}.ts` — Description

### Backend

- `apps/backend/src/modules/{module}/{file}.ts` — Description

### Frontend

- `apps/consumer/src/features/{feature}/{file}.tsx` — Description

### Types & Shared

- `packages/types/src/{file}.ts` — Description

## Testing

[Test approach, coverage, manual verification results]

## Verification Evidence

| Gate | Scope | Result | Evidence | Notes |
| ---- | ----- | ------ | -------- | ----- |

## Operator Handoff

> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`} — what kind of operator action unblocks the row.

| Task | Category | Required Check | Owner | Status | Notes |
| ---- | -------- | -------------- | ----- | ------ | ----- |

## Ship Readiness

[Ship Verified / Operator Verification, with rationale]

## Breaking Changes

[List or "None"]

## Deferred Items

[Anything punted to a future PRD]

## References

- PRD: `_prds/wip/prd-XXX-{name}.md`
- Tasks: `_tasks/wip/tasks-XXX-{name}.md`
```

### 3.2 Notify User

If `Ship Verified`, notify:

> "All required tasks completed and verified. Summary created at `_docs/wip/summary-XXX-{name}.md`. The following files are ready to be moved from `wip/` to `completed/`:
>
> - `_prds/wip/prd-XXX-{name}.md`
> - `_readiness/wip/readiness-XXX-{name}.md`
> - `_tasks/wip/tasks-XXX-{name}.md`
> - `_docs/wip/summary-XXX-{name}.md`"

If `Operator Verification`, notify:

> "Code complete, but required operator verification remains. Summary created at `_docs/wip/summary-XXX-{name}.md`; keep artifacts in `wip/` until the Operator Handoff rows are resolved or explicitly accepted."

---

## Step 4: Final Sign-off Report

Provide a concise summary to the user:

```markdown
## Sign-off: PRD-XXX

### Core Changes

[What was the most critical part of this implementation?]

### Architectural Impact

[How does this change the project's state or future development?]

### Memory Updates

- [x] Wiki pages updated: [what changed]
- [x] \_STATUS.md updated: [PRD status, short activity, active agent removed]
- [x] \_state/prds.json refreshed and workflow state verified
- [ ] BEST_PRACTICES.md: [updated / no changes needed]

### Residual Technical Debt

[Minor optimizations or "nice-to-haves" deferred to a future PRD, or "None"]

### Verification

- [x] `pnpm build` — PASS / PARTIAL / OPERATOR / BLOCKED
- [x] `pnpm check-types` — PASS / PARTIAL / OPERATOR / BLOCKED
- [x] `pnpm lint` — PASS / PARTIAL / OPERATOR / BLOCKED
- [x] `pnpm verify:prd-state` — PASS / BLOCKED
- [x] `pnpm verify:deferred` — PASS / BLOCKED
- [x] `pnpm verify:memory-drift` — PASS / BLOCKED
- [x] `pnpm verify:doc-bloat` — PASS / BLOCKED
- [x] Multi-tenancy audit — PASS
- [x] Permission audit — PASS
- [x] Risk-class test gate — PASS / N/A (diff doesn't touch guards/permissions/auth/filters)
- [x] Independent adversarial review (`/codex`) — PASS / WAIVED (justification)
- [x] PRD Verification Commands executed with output evidence — PASS
```
