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
