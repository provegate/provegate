---
prd: PRD-XXX
slug: "[short-name]"
status: Not Started
phase: Phase 3
operatorHandoffCount: 0
lastVerifiedAt:
lockId:
---

# Tasks: [Feature Name]

> **PRD**: [prd-XXX-{short-name}.md](../../_prds/wip/prd-XXX-{short-name}.md)
> **Readiness**: [readiness-XXX-{short-name}.md](../../_readiness/wip/readiness-XXX-{short-name}.md)
> **Status**: Not Started | In Progress | Code Complete | Operator Verification | Ship Verified
> **Readiness Score**: [X.X/10]
> **Model Tier (Execution)**: [high / medium / fast]
> **Created**: [YYYY-MM-DD]
> **Updated**: [YYYY-MM-DD]
> **State Record**: `_state/prds.json`

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- A PRD may be `Code Complete` with operator handoff items, but it is not `Ship Verified` until required handoff items are resolved or explicitly accepted.
- Phase 3/4 agents must hold a valid `_state/locks/*.json` lock before editing implementation files or this task file.

---

## Relevant Files

- `path/to/file1.ts` — Description
- `path/to/file1.test.ts` — Unit tests for `file1.ts`
- `path/to/file2.tsx` — Description
- `path/to/file2.test.tsx` — Component tests for `file2.tsx`

### Notes

- Unit tests should live next to the file they test when the package pattern supports it.
- Backend: `apps/backend/`
- Consumer app: `apps/consumer/`
- Account app: `apps/account/`
- Admin app: `apps/admin/`
- Database: `packages/db/`
- Types/RBAC: `packages/types/`

---

## Tasks

- [ ] 1.0 [Parent Task Title]
  - [ ] 1.1 [Sub-task description]
  - [ ] 1.2 [Sub-task description]
  - [ ] 1.3 [Sub-task description]

- [ ] 2.0 [Parent Task Title]
  - [ ] 2.1 [Sub-task description]
  - [ ] 2.2 [Sub-task description]

- [ ] 3.0 [Parent Task Title]
  - [ ] 3.1 [Sub-task description]
  - [ ] 3.2 [Sub-task description]

- [ ] 4.0 [Parent Task Title]
  - [ ] 4.1 [Sub-task description]

- [ ] 5.0 [Parent Task Title]
  - [ ] 5.1 [Sub-task description]

---

## Verification Ledger

| Gate               | Command / Check                | Scope             | Result  | Evidence | Notes                                                                  |
| ------------------ | ------------------------------ | ----------------- | ------- | -------- | ---------------------------------------------------------------------- |
| types              | `pnpm check-types`             | monorepo          | pending |          |                                                                        |
| lint               | `pnpm lint`                    | monorepo          | pending |          |                                                                        |
| build              | `pnpm build`                   | affected packages | pending |          |                                                                        |
| independent-review | `/codex` review + saved output | full diff vs base | pending |          | `_docs/reviews/review-XXX-*.md`; Ship Verified bunsuz geçmez (PRD≥198) |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

> Short, single-line entries written during Phase 3 when a non-obvious implementation decision, scope cut, or accepted design deviation is taken. Operator-owned verification belongs in **Operator Handoff**, not here.

- (none yet)

---

## Progress Log

| Date         | Task      | Notes                  |
| ------------ | --------- | ---------------------- |
| [YYYY-MM-DD] | [Task ID] | [Implementation notes] |

---

## Blockers / Open Questions

- [ ] [Question or blocker 1]
- [ ] [Question or blocker 2]

---

## Operator Handoff

> Human/runtime/staging checks that cannot be completed by the agent. Keep the corresponding task checkbox unchecked until this is resolved or explicitly accepted in Phase 4.
> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`} — what kind of operator action unblocks it.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
|      |          |       |                |        |       |
