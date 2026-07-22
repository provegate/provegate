# Phase 4 — Implementation start (copy-paste template)

> **When to use:** Readiness score ≥ 8, `tasks-XXX-{name}.md` is saved under `_tasks/wip/`, and you are **starting implementation** (Phase 4 of 7).
> **SSOT for behavior:** `docs/ai-context/prompts/phase-4-implementation.md` (legacy filename — content is Phase 4) — this file only names artifacts and gives one message to paste.

---

## TL;DR — Correct Phase 4 Start

1. Ask the current agent to prepare Phase 4 for `PRD-XXX`.
2. The current agent runs the [Promote Preflight](#promote-preflight-before-producing-the-paste-prompt), promotes metadata if needed, refreshes state, and then outputs the copy-paste prompt.
3. Open a **new agent session**, paste the produced prompt, and start execution there.

> If you only `@`-mention the PRD, the agent falls back to Phase 1/2 behavior. See [Why file order matters](#why-file-order-matters-rule-glob-loading).

---

## How to Start Execution for a New PRD

1. **Prerequisites**
   - `_readiness/wip/readiness-XXX-....md` has score **>= 8** and PASS.
   - `_tasks/wip/tasks-XXX-....md` exists and contains sub-tasks.
   - `pnpm verify:prd-ready -- _prds/wip/prd-XXX-....md` has passed or the readiness report includes a waiver.
   - `_state/prds.json` is current (`pnpm state:sync`) and queried with `pnpm state:prd -- PRD-XXX` rather than read in full.
   - PRD: `_prds/wip/prd-XXX-....md` — the **same** `XXX` and kebab-case `{short-name}` are used across all three files.
   - PRD metadata must be consistent:
     - `Status: Approved` or `In Progress` (NOT `Proposed`/`Draft`)
     - `Cycle Phase: 4 (Implementation)` (NOT `1 (PRD Generation)`)
     - Hard dependencies (`Depends on: PRD-XYZ`) are resolved/signed off

2. **Promote metadata if needed**
   The prompt-preparation agent must run the preflight below before giving you the paste prompt. Humans should not need to edit metadata manually.

3. **Prepare the template**
   Find the **"Paste this..."** block below. Replace `XXX` and `{short-name}` with the real artifact names (same hyphenated slug, e.g. `feature-requests-ema`).

4. **Send it to the execution agent in the IDE**
   - Open a new message in Cursor / Claude Code.
   - **`@`-mention the task file first**, then readiness, then PRD (order matters; see [Why](#why-file-order-matters-rule-glob-loading)).
   - Paste the edited message.

5. **After sending**
   The agent follows the `phase-4-implementation.md` loop (`_state` lock, `_STATUS.md`, verification, task updates, Verification Ledger, commit mode). You only need to step in for undefined PRD/task decisions, blockers, or operator-owned verification.
   When agent-finishable work is complete, proceed to **Phase 5–7** via `orchestration-runner.md` (or `pnpm prd:autorun` for mechanical gates): `phase-5-testing.md` → `phase-6-final-auditing.md` (Phase 6) → `phase-7-learning.md`.

---

## Promote Preflight Before Producing The Paste Prompt

When the user asks "prepare the Phase 4 prompt for PRD-XXX" or equivalent, the current agent must do this first and **must not start implementation in the same session**:

1. Run `pnpm state:prd -- PRD-XXX` to resolve artifact paths and current lifecycle state.
2. Run `pnpm verify:prd-ready -- _prds/wip/prd-XXX-{short-name}.md`.
3. If readiness fails and the readiness report has no explicit waiver, stop and report the lint findings; do not produce the execution prompt.
4. If the PRD header is not already Phase 4-ready, update only PRD metadata:
   - `Status: Approved`
   - `Cycle Phase: 4 (Implementation)`
   - `Updated: YYYY-MM-DD`
5. Run `pnpm state:sync`.
6. Run `pnpm state:prd -- PRD-XXX` and confirm:
   - `status` is `Approved` or `In Progress`
   - `cyclePhase` is `4 (Implementation)`
   - readiness verdict is `PASS`
   - task status is `Not Started` or `In Progress`
7. Output the filled copy-paste prompt from [Paste this](#paste-this-to-start-phase-4-fill-xxx-and-short-name). Do not acquire a Phase 4 implementation lock during prompt preparation; the execution agent will do that after the paste prompt is sent.

If the user explicitly asks the same agent to begin execution after preflight, confirm that they want to proceed in this session. The default handoff is: current agent prepares prompt, new agent session executes.

---

## Artifact map (same `XXX` and `{short-name}` everywhere)

| Artifact        | Path (while active)                               |
| --------------- | ------------------------------------------------- |
| PRD             | `_prds/wip/prd-XXX-{short-name}.md`               |
| Readiness       | `_readiness/wip/readiness-XXX-{short-name}.md`    |
| Task list       | `_tasks/wip/tasks-XXX-{short-name}.md`            |
| Summary (after) | `_docs/wip/summary-XXX-{short-name}.md` (Phase 7) |

After Phase 7 sign-off, move the above (and the summary) from `wip/` to `completed/` per `phase-7-learning.md`.

---

## Paste this to start Phase 4 (fill `XXX` and `{short-name}`)

> **IMPORTANT:** Before sending, resolve the first three `@`-mentions to real files through the IDE file picker. When Cursor sees the task file, it loads `prd-process-tasks.mdc` (Phase 4). If you only attach the PRD, Phase 1/2 rules load and the agent may propose a plan instead of executing.

```markdown
@\_tasks/wip/tasks-XXX-{short-name}.md
@\_readiness/wip/readiness-XXX-{short-name}.md
@\_prds/wip/prd-XXX-{short-name}.md

**Phase 4 — Implementation**

Follow the full protocol in `docs/ai-context/prompts/phase-4-implementation.md`.

**Artifacts for this PRD:**

- PRD: `_prds/wip/prd-XXX-{short-name}.md`
- Readiness: `_readiness/wip/readiness-XXX-{short-name}.md` (use model tier from here)
- Tasks: `_tasks/wip/tasks-XXX-{short-name}.md`

**Instructions:**

1. Run `pnpm state:prd -- PRD-XXX` and read `_STATUS.md`; claim the PRD with `pnpm prd:start PRD-XXX --agent <name>` (creates worktree + lock + status row — do all work inside the worktree); run `pnpm verify:agent-locks`. Hand-written locks only if the wrapper cannot run (WORKFLOW.md → Manual fallback).
2. Execute the next unchecked sub-task in the task file; after each sub-task: verify (`pnpm check-types && pnpm lint`), update the task file (`[x]` only for completed-as-written work, Relevant Files, Verification Ledger, Progress Log / Deferrals & Decisions), and commit only if this agent mode allows commits. Run `pnpm state:sync` at parent-task completion. If a sub-task touched guards, permissions, org-scoping, auth, or user-controlled filters, write its integration test inside the same parent task.
3. Work through all agent-finishable sub-tasks autonomously. **Stop and ask** only if the PRD/tasks omit a necessary design decision or you hit a hard blocker. If a `verify:*` gate fails for reasons unrelated to your change, STOP and report — do not bypass it or hand-edit its expected format.
4. When agent-finishable tasks are complete and remaining work, if any, is captured in `Operator Handoff`, run `pnpm prd:stop PRD-XXX`, then proceed to Phases 5–7 per `docs/ai-context/prompts/orchestration-runner.md` (`phase-5-testing.md` → `phase-6-final-auditing.md` → `phase-7-learning.md`), or run mechanical gates with `pnpm prd:autorun PRD-XXX --dry-run` first.

**Task-file edit contract (strict):**

- Only flip `[ ]` → `[x]` when the task is completed as written. **Never modify, append to, or rewrite the text of a sub-task line** — no inline "Deferred — ...", no "covered by ...", no carry-forwards, no implementation summaries next to the checkbox.
- All implementation decisions / scope cuts go in the **Deferrals & Decisions** bullet section at the bottom of the file (one short line per entry).
- Operator-owned runtime/manual/staging work goes in **Operator Handoff** and its checkbox remains unchecked until resolved or accepted in Phase 4.
- Multi-line runtime context goes in **Progress Log**. Verification attempts go in **Verification Ledger**. Hard blockers go in **Blockers / Open Questions**.

Do not propose phases, do not re-plan, do not ask for clarifying questions
unless the PRD/tasks genuinely omit a required design decision. Begin with the
first unchecked sub-task now.
```

### Example — PRD-123 (archived paths; use `wip/` for new PRDs)

```markdown
@\_tasks/completed/tasks-123-feature-requests-ema.md
@\_readiness/completed/readiness-123-feature-requests-ema.md
@\_prds/completed/prd-123-feature-requests-ema.md

**Phase 4 — Implementation**

Follow the full protocol in `docs/ai-context/prompts/phase-4-implementation.md`.

**Artifacts for this PRD:**

- PRD: `_prds/completed/prd-123-feature-requests-ema.md`
- Readiness: `_readiness/completed/readiness-123-feature-requests-ema.md` (use model tier from here)
- Tasks: `_tasks/completed/tasks-123-feature-requests-ema.md`

**Instructions:**

1. Run `pnpm state:prd -- PRD-XXX` and read `_STATUS.md`; claim with `pnpm prd:start PRD-XXX --agent <name>`; run `pnpm verify:agent-locks`; then begin.
2. Execute the next unchecked sub-task in the task file; after each sub-task: verify (`pnpm check-types && pnpm lint`), update the task file (`[x]` only for completed-as-written work, Relevant Files, Verification Ledger, Progress Log), run `pnpm state:sync`, and commit only if this agent mode allows commits.
3. Work through all agent-finishable sub-tasks autonomously. **Stop and ask** only if the PRD/tasks omit a necessary design decision or you hit a hard blocker.
4. When agent-finishable tasks are complete and remaining work, if any, is captured in `Operator Handoff`, remove the lock and proceed to Phases 5–7 per `docs/ai-context/prompts/orchestration-runner.md`.
```

---

## Why file order matters (rule-glob loading)

Cursor loads `.cursor/rules/*.mdc` files by **glob matching** the paths of `@`-mentioned files in the message. Phase triggers:

| Rule                        | Globs                                                                    | Phase         |
| --------------------------- | ------------------------------------------------------------------------ | ------------- |
| `prd-create.mdc`            | `_prds/**/*.md`                                                          | **Phase 1**   |
| `prd-readiness-scoring.mdc` | `_prds/**/*.md`, `_readiness/**/*.md`                                    | **Phase 2**   |
| `prd-generate-tasks.mdc`    | `_tasks/**/*.md`                                                         | **Phase 3**   |
| `prd-process-tasks.mdc`     | `_tasks/**/*.md`, `_docs/**/*.md`                                        | **Phase 4–7** |
| `prd-workflow.mdc`          | `_prds/**/*.md`, `_readiness/**/*.md`, `_tasks/**/*.md`, `_docs/**/*.md` | Overview      |

Result:

- **Only `@_prds/...` attached** → Phase 1 + Phase 2 rules load → the agent enters "working with a PRD" mode → it may ask clarifying questions or propose readiness scoring, but it **does not execute**.
- **`@_tasks/...` attached** → Phase 4 (`prd-process-tasks.mdc`) loads → the agent enters the implementation loop.
- Attaching all three **does not conflict**. Phase 1/2 rules describe PRD-writing behavior, but the pasted message explicitly says "Phase 4 — Implementation," so that instruction takes priority. If the task file is missing, the model may fall back to PRD-reading behavior.

---

## Common pitfalls

| Symptom                                                                                                                     | Cause                                                                         | Fix                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent proposes phases and does not execute                                                                                  | Only the PRD was `@`-mentioned; Phase 4 rule did not load                     | Attach the task file too (the first line of the template)                                                                                                               |
| Agent says the PRD is not approved or dependencies are pending                                                              | PRD metadata is `Status: Proposed` or `Cycle Phase: 1`                        | Update the PRD header: `Status: Approved` / `In Progress`, `Cycle Phase: 4 (Implementation)`                                                                            |
| Agent asks clarifying questions                                                                                             | Phase 1 rule loaded and the PRD has a real gap, or the pasted message is weak | Use the paste template exactly; do not remove the "Do not propose phases..." line                                                                                       |
| Agent waits for approval after every sub-task                                                                               | `phase-4-implementation.md` may not have been read                            | The message must include `Follow the full protocol in docs/ai-context/prompts/phase-4-implementation.md` (already in the template)                                      |
| Agent chooses the wrong model tier                                                                                          | Readiness file was not `@`-mentioned                                          | Add `@_readiness/...` on the second line                                                                                                                                |
| Agent searches `completed/` instead of `wip/`, or the reverse                                                               | Path mismatch                                                                 | Ensure all three paths in the paste template point to the same artifact state                                                                                           |
| Agent does not update the task file                                                                                         | Task file was not `@`-mentioned, so Phase 4 rule did not load                 | Attach the task file                                                                                                                                                    |
| Agent adds inline notes beside sub-task lines (e.g. "Deferred — covered by 7.5 E2E", carry-forward, implementation summary) | Task-file edit contract was ignored; deferral sections are missing            | Keep the "Task-file edit contract" block; ensure the task file has **Deferrals & Decisions** and **Operator Handoff** sections; clean inline notes during Phase 6 audit |

---

## Quick Checklist (Before Sending)

- [ ] PRD `Status` = `Approved` or `In Progress` (NOT `Proposed`/`Draft`)
- [ ] PRD `Cycle Phase` = `4 (Implementation)`
- [ ] All hard dependencies are resolved (`Depends on:` line)
- [ ] Readiness score >= 8 and `_readiness/wip/readiness-XXX-...md` exists
- [ ] `pnpm verify:prd-ready -- _prds/wip/prd-XXX-...md` passed or readiness waiver exists
- [ ] `pnpm state:sync` has refreshed `_state/prds.json`
- [ ] `pnpm verify:status-sync` is green (Aktif Agent'lar table ↔ locks)
- [ ] No conflicting active lock exists under `_state/locks/`
- [ ] `_tasks/wip/tasks-XXX-...md` exists and sub-tasks are written
- [ ] All three files use the same `XXX` and `{short-name}`
- [ ] All three files are in `wip/` (or all in `completed/`) — no mixed states
- [ ] The message's **first line** is `@_tasks/wip/...` (NOT the PRD)
- [ ] Paste template `XXX` and `{short-name}` placeholders are replaced with real values
- [ ] The paste template's **"Task-file edit contract"** block is intact
- [ ] The task file has **Deferrals & Decisions** and **Operator Handoff** sections

---

## Related Cursor rule

When editing `_tasks/**/*.md` or `_docs/**/*.md`, agents may load `.cursor/rules/prd-process-tasks.mdc` — it defers to `phase-4-implementation.md` (Phase 4) and this bootstrap for the exact loop.
