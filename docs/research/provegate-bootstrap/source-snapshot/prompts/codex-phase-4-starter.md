# Codex Phase 4 Starter

> **When to use:** You want to start Phase 4 execution in a fresh Codex terminal/session by giving only a PRD number.
> **Input:** `PRD-XXX`
> **Output:** A copy-paste-ready Codex execution prompt with resolved artifact paths.
> **Do not implement in this starter session.** This protocol only performs preflight and prepares the handoff prompt.

---

## Goal

Given a PRD number, prepare a safe Phase 4 handoff for Codex:

1. Resolve the PRD, readiness, and task artifact paths from workflow state.
2. Run the required Phase 4 preflight checks.
3. Promote PRD metadata to Phase 4 when appropriate.
4. Output one markdown prompt that can be pasted into a new Codex terminal/session.

This file is the Codex-friendly counterpart to `phase-4-implementation-bootstrap.md`. It avoids Cursor-specific `@file` ordering and uses explicit file paths instead.

---

## Usage Prompt

Paste this into any current agent session:

```markdown
Prepare a Codex Phase 4 execution prompt for PRD-XXX.

Follow `docs/ai-context/prompts/codex-phase-4-starter.md`.
Do the preflight only. Do not create an implementation lock and do not start coding.
Return only the copy-paste-ready prompt for the new Codex session, plus any blocking preflight failure if one occurs.
```

Replace `PRD-XXX` with the real PRD id, for example `PRD-182`.

---

## Preflight Protocol

Run these steps before producing the copy-paste prompt.

### 1. Resolve State

```bash
pnpm state:sync
pnpm state:prd -- PRD-XXX
```

Use the `artifacts` object from `pnpm state:prd -- PRD-XXX` as the source of truth for:

- PRD path
- Readiness path
- Task path
- Summary path, if present
- Current status
- Current cycle phase
- Readiness score and verdict
- Task checked / unchecked counts

Do not guess the slug from filenames unless state lookup fails. If state lookup fails, stop and report that `pnpm state:sync` or artifact creation is required.

### 2. Validate Artifact State

Confirm:

- The PRD artifact exists.
- The readiness artifact exists.
- The task artifact exists.
- All three artifacts are in the same lifecycle area when possible (`wip/` for active work; `completed/` only for audits or historical continuation).
- Readiness verdict is `PASS`.
- Readiness score is `>= 8`.
- Task file has unchecked work unless the user explicitly asks to resume audit or inspect completed work.

If readiness score is below 8 or verdict is not `PASS`, stop. Do not produce an execution prompt.

### 3. Run PRD Readiness Verification

Run:

```bash
pnpm verify:prd-ready -- <resolved-prd-path>
```

If it fails:

- Check the resolved readiness report for an explicit waiver.
- If there is no waiver, stop and report the lint findings.
- If there is a waiver, mention the waiver in the generated prompt under `Known Preflight Notes`.

### 4. Promote Metadata If Needed

If the PRD is intended for Phase 4 but its header is not Phase 4-ready, update only these metadata fields in the PRD file:

- `Status: Approved`
- `Cycle Phase: 4 (Implementation)`
- `Updated: YYYY-MM-DD`

Do not edit product requirements, functional requirements, technical specs, task text, readiness content, or implementation notes.

After metadata changes, run:

```bash
pnpm state:sync
pnpm state:prd -- PRD-XXX
```

Confirm:

- `status` is `Approved` or `In Progress`.
- `cyclePhase` is `4 (Implementation)`.
- readiness verdict is `PASS`.
- task status is `Not Started` or `In Progress`, unless the user explicitly requested a special continuation.

If metadata promotion would conflict with an unresolved dependency, blocked status, or non-PASS readiness report, stop and report the blocker.

### 5. Check Coordination State

Inspect:

```bash
ls _state/locks
sed -n '1,120p' _STATUS.md
```

Do not claim a lock in the starter session. The new Codex execution session claims its own worktree + lock via `pnpm prd:start PRD-XXX`.

If an active lock clearly overlaps the target PRD or its expected files, stop and report the conflict instead of producing the prompt.

---

## Output Contract

If preflight passes, output:

1. A short `Preflight passed` line with PRD id, status, cycle phase, readiness score, and artifact paths.
2. A fenced markdown block containing the exact prompt to paste into a new Codex terminal/session.

Do not include implementation analysis. Do not start coding.

---

## Copy-Paste Prompt Template

Use this template after replacing all placeholders from state.

```markdown
Phase 4 Execution for PRD-XXX.

Artifacts:

- PRD: `<resolved-prd-path>`
- Readiness: `<resolved-readiness-path>`
- Tasks: `<resolved-task-path>`

Follow these repo protocols:

- `AGENTS.md`
- `docs/ai-context/MEMORY.md`
- `docs/ai-context/BEST_PRACTICES.md`
- `docs/ai-context/WORKFLOW.md`
- `docs/ai-context/prompts/phase-4-implementation.md`

Known Preflight Notes:

- Status: `<status-from-state>`
- Cycle Phase: `<cycle-phase-from-state>`
- Readiness: `<score> PASS`
- Recommended execution model tier: `<readiness.modelTierExecution if present>`
- Existing locks were checked by the starter session; re-check them before editing.

Instructions:

1. Run `pnpm state:prd -- PRD-XXX`, inspect `_state/locks/`, and read `_STATUS.md`.
2. Claim the PRD with `pnpm prd:start PRD-XXX --agent codex` — one command creates the `.worktrees/prd-XXX-…` worktree, the lock, and the `_STATUS.md` row. `cd` into the printed worktree path and do every edit/build/commit there. Hand-writing `_state/locks/*.json` is a fallback ONLY when `prd:start` genuinely cannot run.
3. From the worktree, run `pnpm verify:agent-locks && pnpm verify:branch-isolation` (start gate — must pass before editing).
4. Execute the next unchecked sub-task in the task file. Work autonomously through all agent-finishable tasks.
5. After each completed sub-task, update the task file:
   - Flip `[ ]` to `[x]` only when completed as written.
   - Never rewrite or append notes to sub-task lines.
   - Update `Relevant Files`, `Verification Ledger`, `Progress Log`, and `Deferrals & Decisions` / `Operator Handoff` as appropriate.
6. Run targeted verification for affected packages, then `pnpm check-types` and `pnpm lint` when the slice is meaningful.
7. Run `pnpm state:sync` after task status changes.
8. Do not commit unless explicitly asked in this session.
9. Stop only for a real blocker, a conflicting lock, or a missing product/design decision in the PRD or task file.
10. When agent-finishable work is complete, release with `pnpm prd:stop PRD-XXX` (removes the lock + the `_STATUS.md` row), then hand off to Phase 5 (Testing).

Task-file edit contract:

- Only checkbox state may change on task lines.
- Operator-owned runtime/manual/staging work stays unchecked and goes in `Operator Handoff`.
- Scope cuts, deferrals, and implementation decisions go in `Deferrals & Decisions`.
- Verification attempts go in `Verification Ledger` with `passed`, `failed`, `partial`, `skipped`, `operator`, or `blocked`.

Begin with the pre-edit coordination steps now. Do not re-plan the PRD unless the artifacts contain a hard blocker.
```

---

## Blocking Conditions

Do not produce the execution prompt if any of these are true:

- `pnpm state:prd -- PRD-XXX` cannot resolve artifacts.
- PRD, readiness, or task artifact is missing.
- Readiness score is below 8.
- Readiness verdict is not `PASS`.
- `pnpm verify:prd-ready -- <prd-path>` fails without an explicit waiver.
- PRD has unresolved hard dependencies.
- PRD status is `Blocked`, `Ship Verified`, or `Archived`, unless the user explicitly asked for historical continuation/audit.
- Existing lock conflicts with the target PRD or expected touched files.
- Task file has no unchecked work and the user asked for Phase 4 execution rather than Phase 6 audit.

---

## Notes For Agents

- This starter session is allowed to edit only PRD metadata when promotion to Phase 4 is safe.
- This starter session must not create `_state/locks/*.json`.
- This starter session must not edit task checkboxes.
- The execution session owns lock creation, implementation, verification, and task-file progress updates.
- Prefer state commands over direct JSON inspection.
