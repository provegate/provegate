# Tasks: [Feature Name]

> **PRD**: [prd-XXX-{short-name}.md](../../_prds/wip/prd-XXX-{short-name}.md)
> **Readiness**: [readiness-XXX-{short-name}.md](../../_readiness/wip/readiness-XXX-{short-name}.md)
> **Status**: Not Started
> **Readiness Score**: [X.X/10]
> **Model Tier (Execution)**: [high / medium / fast]
> **Created**: [YYYY-MM-DD]
> **Updated**: [YYYY-MM-DD]

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- A PRD may be `Code Complete` with operator handoff items, but it is not
  `Ship Verified` until required handoff items are resolved or explicitly accepted.
- Phase 4 agents hold a valid lock lease (METHOD.md → Locks) before editing
  implementation files or this task file.

---

## Memory Context

The slugs the PRD selected as Memory Inputs, carried here so implementation does not
re-derive them. Each one gets a re-open task below, bound to the work that depends on it:
a record is evidence only while it is true.

- `[record-slug]` — [what it constrains here]

---

## Relevant Files

- `path/to/file1.ts` — Description
- `path/to/file1.test.ts` — Unit tests for `file1.ts`

### Notes

- Tests live next to the behavior they cover when the package pattern supports it.
- [Your project's layout notes — apps/, packages/, services/ …]

---

## Tasks

- [ ] 0.0 Pre-flight
  - [ ] 0.1 Open each Memory Context record and confirm the paths and commands it names
        still exist; record any stale finding in **Deferrals & Decisions**.
- [ ] 1.0 [Parent Task Title]
  - [ ] 1.1 [Sub-task with explicit file path]
  - [ ] 1.2 [Sub-task with explicit file path]
- [ ] 2.0 [Parent Task Title]
  - [ ] 2.1 [Sub-task with explicit file path]

---

## Verification Ledger

One row per PRD §11 command (pre-populated by Phase 3, all `pending`), plus the
cross-cutting floor and the review row. `gate run` reads the `independent-review` row:
it must be `passed` and name the review artifact path.

| Gate               | Command / Check                            | Scope | Result  | Evidence | Notes                      |
| ------------------ | ------------------------------------------ | ----- | ------- | -------- | -------------------------- |
| FR-1               | `{{CMD_TEST_SCOPED}}`                      |       | pending |          |                            |
| types              | `{{CMD_CHECK_TYPES}}`                      |       | pending |          |                            |
| lint               | `{{CMD_LINT}}`                             |       | pending |          |                            |
| build              | `{{CMD_BUILD}}`                            |       | pending |          |                            |
| independent-review | `_docs/reviews/review-XXX-{short-name}.md` | repo  | pending |          | verdict pass, critical = 0 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

> Short single-line entries written **during Phase 4** when a non-obvious decision,
> scope cut, or accepted deviation is taken. Format: `- <task#> — <decision>; <≤1
sentence rationale>`. Never inline on sub-task lines.

- (none yet)

---

## Progress Log

> Multi-line runtime context or deviations that don't fit one line.

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

---

## Blockers / Open Questions

- (none)

---

## Operator Handoff

> Human/runtime/staging checks the agent cannot complete. Keep the corresponding task
> checkbox unchecked until resolved or explicitly accepted.
> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`}.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
|      |          |       |                |        |       |
