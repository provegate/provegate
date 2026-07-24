<!--
Auxiliary spec sections that gates key on — wave 2, part A.
These three sections are read by verify checks:
  • Conflict Surface  → verify:path-conflicts (mirrors into the lock's ownedPaths)
  • Durable Artifacts → verify:durable-artifacts (declared paths must appear in the merge diff)
  • DO NOT            → verify:prd-ready (some entries are mechanically required)
Never leave them blank — write `- none` if empty, so "empty" is a deliberate declaration.
-->

## Conflict Surface

The source path globs this spec will exclusively write. Mirrored into the work-item lock's
`ownedPaths`; `verify:path-conflicts` fails if two active items claim overlapping paths.
Write `- none` if this item writes no source (docs-only). Do NOT list shared append-only
manifests here.

- `src/feature-x/**`
- `packages/thing/src/**`
<!-- or: - none -->

## Durable Artifacts

Where this item's durable knowledge lands. `verify:durable-artifacts` fails close if a
declared (non-`none`) path is not touched in the merge diff — knowledge must land in the
same change as the code. (See `02` practice 07.)

Rules the checker keys on: a placeholder is ignored ONLY if it contains `{`, `}`, or `*` —
an angle-bracket placeholder counts as a real declared path, so use brace style until you
fill it in. To skip a line, replace the WHOLE line with `- none` — a line that still
carries any backticked path declares that path.

- Learning: `_brain/learnings/{slug}.md`
- ADR: `_brain/adr/ADR-{NNNN}-{slug}.md`
- Pattern: `docs/BEST_PRACTICES.md#{anchor}`
<!-- or, per line: - none -->

## 12. DO NOT (Anti-Patterns)

Forbidden moves for this item. Keep the universal ones; add project-specific ones. Some
entries can be mechanically checked by `verify:prd-ready`.

- Do NOT use `any` — use `unknown` + a narrowing guard.
- Do NOT <project-specific anti-pattern>.
