# Codex Phase 4 Starter

> **When to use:** You want to start Phase 4 execution in a fresh Codex terminal/session
> by giving only a work-item number.
> **Input:** `{{ID_PREFIX}}-XXX`
> **Output:** A copy-paste-ready Codex execution prompt with resolved artifact paths.
> **Do not implement in this starter session.** This protocol only performs preflight
> and prepares the handoff prompt.

---

## Goal

Given a work-item number, prepare a safe **Phase 4** handoff for Codex:

1. Resolve the PRD, readiness, and task artifact paths from workflow state.
2. Run the required Phase 4 preflight checks.
3. Confirm the item's metadata is ready for Phase 4.
4. Output one markdown prompt that can be pasted into a new Codex terminal/session.

This file is the Codex-friendly counterpart to `adapters/cursor-bootstrap.md`. It avoids
editor-specific file-reference ordering and uses explicit paths instead.

---

## Usage Prompt

Paste this into any current agent session:

```markdown
Prepare a Codex Phase 4 execution prompt for {{ID_PREFIX}}-XXX.

Follow prompts/adapters/codex-starter.md.
Do the preflight only. Do not create a lock lease and do not start coding.
Return only the copy-paste-ready prompt for the new Codex session, plus any blocking
preflight failure if one occurs.
```

---

## Preflight Protocol

### 1. Resolve State

```bash
gate status
gate queue
```

Use the state snapshot's record for the item as the source of truth for: PRD path,
readiness path, task path, current status, readiness score/verdict, task
checked/unchecked counts.

### 2. Preflight Gates

- Readiness verdict is PASS with score >= 8, and the task file exists with unchecked
  work — otherwise STOP and report which earlier phase is missing.
- Lifecycle sanity: STOP if the item's status is `Blocked`, `Ship Verified`,
  `Archived`, or `Deferred` — a blocked or already-closed item must never receive an
  execution prompt, regardless of readiness. Artifact states must be consistent (all
  three artifacts in the wip state).
- `gate check {{ID_PREFIX}}-XXX` is clean.
- `gate queue` shows no overlapping active claim on this item's Conflict Surface.

### 3. Produce the Handoff Prompt

The generated prompt for the fresh Codex session must include:

- The three artifact paths (PRD, readiness, tasks) as explicit file references.
- The instruction to follow `prompts/phase-4-implementation.md` — claim procedure
  first (feature branch + lock lease per METHOD.md), then the execution loop.
- The PRD's §12 DO NOT list, inlined.
- The reminder: inline gates ({{CMD_CHECK_TYPES}} + {{CMD_LINT}}) after every sub-task;
  **Phase 4 is done when the code is written and inline gates pass — the full §11 gate
  is Phase 5, executed by `gate run`.**
- The never-push line: the runner merges locally at most; `git push` is the human's.
