---
name: docs-are-a-wiring-surface
description: >-
  A shipped document instructing an adopter to register a check is a wiring surface
  subject to wire-or-delete; six such documents survived five adversarial reviews of the
  deletion that invalidates them.
type: gotcha
scope: workflow
status: active
links: [gate-wire-or-delete, evidence-pattern-satisfied-by-the-template]
provenance: PRD-026
watch: [packages/provegate/practices/**]
---

A wiring surface is anything that makes a check run. Code review treats CI files, hooks
and manifests as wiring — and treats documentation as commentary. But a shipped
`NEXT_STEPS.md` that says "register these three scripts in package.json and wire two of
them in CI" is not commentary: it is the instruction that CREATES the wiring at every
adopter, and when the scripts it names are deleted it keeps creating them from the grave.

Measured on PRD-026: six live documents named checks the consolidation deleted — three of
them SHIPPED in the package, one of them the very instruction that had propagated the
duplication to every adopter — and five adversarial review rounds of the predecessor PRD
never raised one of them, because documents were not on anyone's wiring inventory.

**Why:** reviewers walk the executing surfaces a wiring audit walks. A document is not
executable, so it is nobody's inventory item — while being the only surface an ADOPTER
executes, by hand, exactly once, at install time.

**How to apply:** when a check is added, renamed or deleted, sweep the DOCUMENTS with the
same wire-or-delete discipline as the manifests: every live page that instructs someone
to run the old surface is part of the change. Define the sweep's scan set by enumerated,
asserted exclusions (a boundary that silently excludes its own target is the same defect
one level up), and keep one deliberate carve-out: release notes MUST name the deleted
checks, because the migration is where the old names belong.
