# provegate — agent entry

Read first: `docs/research/provegate-bootstrap/DECISIONS.md` (locked constraints — treat as
law; confirm PENDING items with the owner). Program plan:
`docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md`. Extraction source:
`docs/research/provegate-bootstrap/source-snapshot/MANIFEST.md` (its "Kullanım kuralları"
bind all extraction work: config over hardcode, no personal names, English-only package
content).

Hard constraints, always:

- never add a code path that pushes to a git remote (CLI or CI; only the human-triggered
  release workflow publishes)
- `packages/provegate`: zero runtime dependencies, no telemetry, no network calls
- conventional commits, subject must not start upper-case
- method content (prompts/templates/schemas) comes from the source snapshot — never fabricate

Verify with: `pnpm check-types && pnpm lint && pnpm test && pnpm build`.

## Memory — `_brain`

Before any non-trivial work, read [`_brain/INDEX.md`](_brain/INDEX.md) and open the
detail files whose one-line hook matches the task. Records reflect what was true when
written — if one names a file, flag, command, or path, confirm it still exists before
acting on it.

At phase/PRD close, run the capture protocol (`_brain/PROTOCOL.md` §7): if you hit something
not derivable from the code, write a `_brain/learnings/<slug>.md` and add its INDEX
pointer. Store only non-derivable knowledge — never what the repo already records.
