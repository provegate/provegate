# Development Summary: [Feature Name]

> **PRD**: [prd-XXX-{short-name}.md](../_prds/completed/prd-XXX-{short-name}.md)
> **Tasks**: [tasks-XXX-{short-name}.md](../_tasks/completed/tasks-XXX-{short-name}.md)
> **Ship Readiness**: Ship Verified | Operator Verification
> **Completed**: [YYYY-MM-DD]
> **Author**: [Name]

---

## Overview

[Brief description of the implemented feature - 2-3 sentences]

---

## Key Features

- Feature 1: [Description]
- Feature 2: [Description]
- Feature 3: [Description]

---

## Technical Implementation

### Architecture Decisions

[Architecture approach and patterns used]

### Key Technologies

- [Technology 1] - [Why it was used]
- [Technology 2] - [Why it was used]

### Database Schema

```sql
-- Added tables or schema changes
```

### API Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST   | /api/... | ...         |
| GET    | /api/... | ...         |

---

## Files Created/Modified

### Backend (`packages/`)

| File                   | Type             | Description |
| ---------------------- | ---------------- | ----------- |
| `packages/api/src/...` | Created/Modified | ...         |
| `packages/db/src/...`  | Created/Modified | ...         |

### Frontend - Web (`apps/web/`)

| File               | Type             | Description |
| ------------------ | ---------------- | ----------- |
| `apps/web/src/...` | Created/Modified | ...         |

### Frontend - Native (`apps/native/`)

| File                  | Type             | Description |
| --------------------- | ---------------- | ----------- |
| `apps/native/src/...` | Created/Modified | ...         |

---

## Testing

### Test Coverage

| Layer  | Test Type   | Status         |
| ------ | ----------- | -------------- |
| API    | Unit        | [Done/Pending] |
| Web    | Integration | [Done/Pending] |
| Native | E2E         | [Done/Pending] |

### Test Files

- `path/to/test1.test.ts`
- `path/to/test2.test.tsx`

---

## Verification Evidence

| Gate  | Scope                 | Result                   | Evidence                 | Notes |
| ----- | --------------------- | ------------------------ | ------------------------ | ----- |
| types | [monorepo / affected] | [passed/partial/blocked] | [command output summary] |       |
| lint  | [monorepo / targeted] | [passed/partial/blocked] | [command output summary] |       |
| build | [monorepo / affected] | [passed/partial/blocked] | [command output summary] |       |
| tests | [affected packages]   | [passed/skipped/blocked] | [command output summary] |       |

Allowed results: `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Operator Handoff

| Task      | Required Check                 | Owner            | Status                  | Notes   |
| --------- | ------------------------------ | ---------------- | ----------------------- | ------- |
| [Task ID] | [Runtime/manual/staging check] | [Operator/Agent] | [pending/done/accepted] | [Notes] |

If no operator-owned work remains, write `None`.

---

## Ship Readiness

[Ship Verified / Operator Verification with concise rationale. If `Operator Verification`, artifacts should remain in `wip/` until required handoff rows are resolved or explicitly accepted.]

---

## Breaking Changes

[Breaking changes and migration notes, if any]

---

## Known Issues / Limitations

- [Issue 1]
- [Issue 2]

---

## Next Steps / Future Improvements

- [ ] [Improvement 1]
- [ ] [Improvement 2]
- [ ] [Improvement 3]

---

## Lessons Learned

### What Worked Well

- [What worked well 1]
- [What worked well 2]

### What Could Be Improved

- [Improvement opportunity 1]
- [Improvement opportunity 2]

---

## References

- PRD: [`_prds/completed/prd-XXX-{short-name}.md`](../_prds/completed/prd-XXX-{short-name}.md)
- Task List: [`_tasks/completed/tasks-XXX-{short-name}.md`](../_tasks/completed/tasks-XXX-{short-name}.md)
- [Other relevant links]
