---
name: notes-column-runs-commands
description: >-
  A per-FR gate parser that extracts backtick commands from the whole table row will run a
  command placed in the Notes/Scope column too — scope it to the Command column.
type: gotcha
scope: workflow
status: active
links: [false-green-on-missing-file, grep-token-anchors-real-impl]
provenance: workflow-seed
---

If the §11 parser matches every backtick span on an `| FR-N` row (not just the Command
column), a runnable-prefixed command placed in the Scope or Notes column **also executes as
a gate command**. An author writing `` `npm run foo` `` as an _example_ in Notes silently
adds it to the gate.

**Why:** the parser keys on "backtick span anywhere in the row" for simplicity, but a
markdown table row has multiple cells and only one is the command.
**How to apply:** Scope command extraction to the designated Command column (e.g. the 2nd
cell), not the whole row. Until then, never put a backticked runnable command in the
Notes/Scope column of an FR row. The originating implementation left this hazard
unguarded — fix it in the parser.
