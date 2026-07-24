# \_prds/

PRDs for this repo's own development — ProveGate runs its own gated workflow on itself.
`wip/` holds active PRDs; `completed/` holds landed ones.

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
declaration. `verify:durable-artifacts` lints the section on wip PRDs and, in `--close`
mode, fails the close if a declared path is not in the merge diff. Placeholder paths
containing `{`, `}`, or `*` are ignored until filled in.
