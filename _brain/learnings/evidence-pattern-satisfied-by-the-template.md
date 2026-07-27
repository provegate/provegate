---
name: evidence-pattern-satisfied-by-the-template
description: >-
  A gate that requires an evidence line can be satisfied by the placeholder in the artifact
  template the same tool ships — test the pattern against the template, not just against
  hand-written good and bad cases.
type: gotcha
scope: workflow
status: active
links: [absence-must-be-asserted, assert-absent-needs-an-independent-cause, notes-column-runs-commands]
provenance: PRD-020
watch: [packages/provegate/templates/**, packages/provegate/examples/**]
---

Some gates require the artifact to *say* something: name a deny test, declare a rollback,
cite a source. The gate is a pattern searched against the document. It is normally tested
the obvious way — a document without the line fails, a document with it passes — and both
of those tests pass while the gate is inert.

The inert case is the **template**. A generator that scaffolds artifacts from a template
usually puts a reminder where the required line belongs:

```
- Deny test: `path/to/x.test.ts` — [required when Targets touch protected surfaces]
```

A pattern of `` Deny test: `[^`]+` `` matches that reminder. So every artifact the
generator produces already satisfies the gate, and the gate fires only for an author who
happened to delete a line nobody told them to delete. Measured in a scratch adopter repo:
a fresh work item with targets on the protected path passed the readiness lint with no
deny test anywhere in it.

**Why:** the hand-written negative case is a document the author *wrote to fail*, and it
never resembles the document the tool actually produces. Nothing in the gate's own tests
ever sees a generated artifact.

**How to apply:** for every evidence pattern, add one assertion that reads the shipped
template and requires the pattern **not** to match it. Then make the pattern demand
something a placeholder cannot carry — usually the thing the gate's own error message
already asks for. Here the message said *name a runnable deny-path test line*, and the fix
was to require a runner prefix (`pnpm|npm|npx|node|…`), which a `path/to/x.test.ts`
placeholder does not have. Keep the assertion pointed at the template file, so a template
edit that reintroduces the collision fails loudly instead of silently disarming the gate.

The same test is worth writing for any pattern-based gate whose subject is generated —
required headings, declared-artifact lines, acceptance rows.
