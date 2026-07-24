# provegate — agent entry

**Read [`AGENT_BOOTSTRAP.md`](AGENT_BOOTSTRAP.md) before any work.** It holds the
workflow contract, the critical rules (push/deps/commits/method-content), the knowledge
map, and the coordination protocol. This file is a thin pointer — rule content lives
there, never here.

Verify with: `pnpm check-types && pnpm lint && pnpm test && pnpm build`.

## Memory — `_brain`

Before any non-trivial work, read [`_brain/INDEX.md`](_brain/INDEX.md) and open the
detail files whose one-line hook matches the task. Records reflect what was true when
written — if one names a file, flag, command, or path, confirm it still exists before
acting on it.

At phase/PRD close, run the capture protocol (`_brain/PROTOCOL.md` §7): if you hit something
not derivable from the code, write a `_brain/learnings/<slug>.md` and add its INDEX
pointer. Store only non-derivable knowledge — never what the repo already records.
