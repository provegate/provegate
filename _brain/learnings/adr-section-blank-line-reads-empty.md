---
name: adr-section-blank-line-reads-empty
description: >-
  Retired trap, general lesson kept: `$` under `/m` is end-of-LINE, not end-of-input —
  and a conformance corpus that asserts agreement cannot catch implementations that are
  wrong together. The ADR anchor itself was fixed by PRD-035 in all three copies.
type: gotcha
scope: workflow
status: active
links: [two-parsers-wrong-together, durable-artifact-must-commit]
watch: [_brain/adr/**, _brain/_templates/adr.md]
---

**The defect this record reported is fixed** (PRD-035, 2026-07-28): the ADR section
capture now ends at `(?=^## |(?![\s\S]))` in all three implementations — the typed
parser (`core/memory/parse.ts`), the repository validator (`scripts/verify/lib.mjs`),
and the shipped copy (`practices/verify/lib.mjs`) — held by a corpus case that asserts
a blank-line-after-every-heading ADR is **valid**, and by `verify:memory-corpus`, which
executes the repository copy the package corpus never runs. `pnpm format` over
`_brain/adr/**` is safe since that change. The record stays because both lessons under
it are general.

**Lesson one — the anchor.** Under the `m` flag, `$` matches at the end of **every**
line, including the zero-length position on a blank line right after a heading. A lazy
capture stopping at `(?=^## |$)` therefore truncates at the first line boundary — the
rule the code actually implements is "the line immediately after the heading must be
non-empty", which nobody wrote and normal Markdown violates. JavaScript has no `\z`;
end-of-input is `(?![\s\S])`.

**Lesson two — the corpus.** Three implementations shared the wrong anchor, and 78
conformance cases proved they agree — agreement was the only claim the cases made. A
corpus can only catch all-wrong-together when a case pins what the right answer IS
(see [[two-parsers-wrong-together]]): assert the document is valid, never that the
implementations match.

**Why:** an end-of-line anchor in a multiline capture and an agreement-only corpus are
each invisible on their own; together they ship the same wrong verdict to every copy
and every adopter while the whole test suite stays green.
**How to apply:** in any `/m` regex that must run to end-of-input, write `(?![\s\S])`,
never `$`. When one format has multiple implementations, every corpus case asserts the
expected verdict, and each implementation must be **executed** against the corpus — a
hash reconciliation (`verify:pack-drift`) proves two copies were compared, not that
either is right.
