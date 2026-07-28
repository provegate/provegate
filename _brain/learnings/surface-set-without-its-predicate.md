---
name: surface-set-without-its-predicate
description: >-
  Porting a check's inputs without the predicate that reads them registers nothing, and
  replacing an unsafe predicate with an open-ended one is the same defect in a stricter
  costume.
type: gotcha
scope: workflow
status: active
links: [narrow-the-grammar-not-the-parser, scope-out-the-layer-the-rounds-keep-hitting]
provenance: PRD-025
watch: [packages/provegate/src/core/gates/**]
---

A check is a surface set plus a predicate that reads it. Port one without the other and
you have shipped nothing that runs: `auditWiring` was handed the hook and bundle
surfaces while its only matcher stayed a package-manager command resolver
(`packageScriptOf` — first token `pnpm|npm|yarn|bun` or null), so appending the new
surface text registered **zero** new wiring. The audit read more and concluded the same.

**Why:** the surface set is visible in a diff and the predicate is not. A reviewer sees
"hooks are now read" and checks the reading; whether anything downstream can *match*
what was read is a property of a function that did not change, so nobody looks at it.
Measured twice in one wave on the same function: PRD-023 ported the missing audit
direction without the missing surface kinds, then ported the surface kinds with a
matcher that could not read them.

**The trap has a second door.** The obvious repair — "specify the predicate" — produced
an open-ended one ("an executing interpreter: node, bun, tsx, …"), which an independent
round correctly called unfalsifiable, and four successive closed-but-growing grammars
each hid the next defect one level deeper. An approximation of a specification is wrong
in a direction nobody can predict; an open-ended predicate is the surface-set mistake
wearing a stricter costume.

**How to apply:** when porting or extending any check, name BOTH halves in the FR — the
surfaces read and the predicate that decides — and require a deny fixture whose failure
can only come from the predicate (paired with a positive control on the same shape). If
the predicate cannot be written closed, narrow what the surface may contain until it
can, which is `narrow-the-grammar-not-the-parser`; if the predicate keeps growing under
review, the layer itself is the scope error —
`scope-out-the-layer-the-rounds-keep-hitting`.
