# `_brain` — durable, agent-agnostic memory

In-repo store of **non-derivable knowledge**: traps the code can't reveal, decisions and
their why, cross-cutting conventions, external pointers. Any agent (Claude Code, Codex,
Cursor, …) and any human reads and writes it. Full rules: [`PROTOCOL.md`](PROTOCOL.md).

**The filter:** store only what cannot be derived from the code, git history, or existing
docs. If the repo already answers it, it does not belong here.

## Add a learning (under a minute)

1. Copy `_templates/learning.md` to `learnings/<kebab-slug>.md`.
2. Fill the frontmatter (`name` == filename slug; `description` is ONE self-contained
   line) and the body — for `gotcha`/`decision`/`convention`, include **Why** and
   **How to apply**.
3. Add a one-line pointer to [`INDEX.md`](INDEX.md) under the right section.
4. Before creating, check for an existing record that covers it — update that instead.

Architecture decisions go in `adr/ADR-NNNN-<slug>.md` (`_templates/adr.md`), also indexed.

## Recall

Read `INDEX.md` first, open only the detail files whose hook matches your task. A record
reflects what was true when written — verify any file/flag/command it names still exists.
