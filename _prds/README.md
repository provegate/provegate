# \_prds/

PRDs for this repo's own development — ProveGate runs its own gated workflow on itself.

## Lifecycle tiers (folder = coarse state)

| Tier | Meaning |
|------|---------|
| `drafts/` | pre-approval backlog — deliberately OUTSIDE the state machine; invisible to the gates until promoted into `wip/` (PRDs only) |
| `wip/` | active — the live queue (state scanner reads this) |
| `completed/` | shipped (state scanner reads this) |
| `deferred/` | shelved mid-flight (state scanner reads this) |

Moving the file IS the coarse state transition. `_readiness/` and `_tasks/` mirror the
tracked tiers (`wip/`, `completed/`, `deferred/` — no `drafts/`).

**Defer recipe (manual):** move the PRD + readiness + tasks artifacts `wip/` → `deferred/`
and set `Status: Deferred` in each. No summary, no Ship Verified — a deferred item stays
tracked but goes quiet to the gates. **Re-open:** move the three artifacts back to `wip/`,
reset the status to its prior in-flight value, then `gate open`.

## Status states (declared, fine-grained)

The `Status:` line uses one of these CANONICAL values, written explicitly. The enum's
SSOT is the workflow config (`packages/provegate` `statusVocab` defaults / `gate.config`);
this table documents it — if they ever disagree, the config wins.

| Status | Meaning | Exit criterion (→ next) |
|--------|---------|-------------------------|
| `Draft` | idea being written | spec complete → review |
| `In Review` | spec under review | reviewer approves → `Approved` |
| `Approved` | ready to plan/execute | readiness PASS + "Go" → `In Progress` |
| `In Progress` | implementation underway | required code tasks complete + agent-run verification recorded → `Code Complete` |
| `Code Complete` | code + tests done; agent-checkable work finished | final-audit gates green; operator rows exist → `Operator Verification`; none → `Ship Verified` |
| `Operator Verification` | operator rows remain OPEN — human/runtime checks pending | rows executed by a human OR an acceptance waiver recorded → `Ship Verified` |
| `Ship Verified` | shipped + verified; requires the independent-review evidence (terminal) | archive records the archived cycle-phase |
| `Archived` | landed + summarized (cycle phase of an archived Ship Verified item) | — |
| `Blocked` | can't proceed | blocker cleared → prior state |
| `Deferred` | shelved mid-flight | re-open → `In Progress` |
| `Superseded` | replaced by another item | — |
| `Not Started` | queued, not begun | claimed → `In Progress` |

Rules:

- **Never write `Completed` or `Done`.** They self-declare the terminal state and invert
  the gate order. The config's alias map (`completed/done → Ship Verified`) exists for
  legacy files only — a NEW item using them is a state violation; write the canonical
  status. See `_brain/learnings/no-completed-done-status-alias.md`.
- **`Code Complete` ≠ shippable.** It means agent-checkable work is done. `Ship Verified`
  is the *output* of the final-audit gates plus resolved/waived operator rows — never a
  self-declared input.
- **`Operator Verification` is entered BECAUSE rows are open**, not after they're
  resolved. The acceptance waiver (`_state/acceptances.json`, owner-gated) is what lets
  the merge gate pass while rows stay unchecked.
- **Status is declared; tier is derived from the folder.** The state scanner cross-checks
  the two and rejects `Unknown`.

## Authoring §11 (Verification Commands) — constraints the gate enforces

The runner parses only table rows starting `| FR-N` and executes the backticked
commands on them through a safety filter. Know these before writing a row:

- The command must start with an allowlisted tool prefix (the workflow config's
  `commands.allowedPrefixes`). Anything else is refused loudly, never run.
- A single `|` inside a command is treated as a shell pipe — do NOT use `|` alternation
  inside a grep pattern. Use separate rows, or point at a dedicated assert script.
- Content-negation (`! grep …`) is inexpressible in a row — a "pattern must NOT appear"
  check must call a dedicated assert-absent script. FILE absence IS expressible in-row:
  `test ! -f path` (allowlisted prefix). See `_brain/learnings/absence-must-be-asserted.md`.
- Put runnable commands in the Command column ONLY. The current parser reads backtick
  spans from the whole row, so a runnable-prefixed example in Notes would also execute
  (`_brain/learnings/notes-column-runs-commands.md`) — until the parser is column-scoped,
  never backtick a runnable command in Scope/Notes.
- Masking (`\|\| true`) is blocked by the safety filter; a missing target file must exit
  non-zero (`_brain/learnings/false-green-on-missing-file.md`).

## Durable Artifacts (checked at close)

Every PRD declares a `## Durable Artifacts` section: the paths its durable knowledge
lands in (a `_brain` learning, an ADR, the review artifact), or `- none` as a deliberate
declaration. `gate check PRD-NNN` lints the section on wip PRDs
(`gate check --durable-artifacts` sweeps the corpus), and the close chain fails the
close if a declared path is not in the merge diff. Placeholder paths containing `{`,
`}`, or `*` are ignored until filled in.
