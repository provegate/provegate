# Cursor Phase 4 Bootstrap

> **When to use:** Starting Phase 4 execution inside Cursor (Composer/agent mode) for an
> already-scored work item.
> **Input:** `{{ID_PREFIX}}-XXX`
> **Principle:** Same method, editor-shaped delivery — Cursor gets its context via
> attached files; the protocol and gates are identical to `phase-4-implementation.md`.

---

## Session setup

Attach (or have the agent open) in this order:

1. `_prds/wip/prd-XXX-{slug}.md` — the contract
2. `_readiness/wip/readiness-XXX-{slug}.md` — score, tier, watch items
3. `_tasks/wip/tasks-XXX-{slug}.md` — the execution plan (this file is the working
   surface; every sub-task completion updates it)
4. {{ARCHITECTURE_DOC}} and {{BEST_PRACTICES_DOC}}
5. `prompts/phase-4-implementation.md` — the protocol to follow

---

## Bootstrap prompt

```markdown
You are the Phase 4 implementing agent for {{ID_PREFIX}}-XXX.

Protocol: follow the attached phase-4-implementation prompt exactly — claim procedure
(feature branch + lock lease per METHOD.md; verify no overlapping claim via
`gate queue`), then the execution loop: read next sub-task → implement → run
{{CMD_CHECK_TYPES}} && {{CMD_LINT}} → scoped tests → update the task file → repeat.

Hard rules:

- Only flip checkboxes in the task file; never edit sub-task text; annotations go in
  the dedicated bottom sections.
- Risk-class sub-tasks (auth/permissions/tenancy/filters) get their deny-path
  integration test in the same parent task.
- The PRD's §12 DO NOT list binds every edit. The Conflict Surface is the write
  boundary.
- Stop and ask on design questions the PRD does not answer; report gate failures you
  did not cause instead of working around them.
- Commit convention: conventional commits, lowercase subject. If this mode does not
  allow commits, record "changes uncommitted" in the Progress Log instead.
- Phase 4 ends when all agent-finishable tasks are checked and inline gates pass.
  The full §11 verification is Phase 5 (`gate run` executes it); never mark §11 rows
  passed from this session.
```

---

## Handoff out of Cursor

When Phase 4 completes, the closing sequence is tool-agnostic: Phase 5 (§11 execution),
Phase 6 (independent review — a different model family than the implementing session),
Phase 7 (knowledge), then `gate run {{ID_PREFIX}}-XXX` for the mechanical close. Push
belongs to the human, always.
