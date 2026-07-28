---
name: adr-section-blank-line-reads-empty
description: >-
  Anchor defect fixed by PRD-035; two lessons and one live hazard remain: `$` under `/m`
  is end-of-LINE, not end-of-input; a corpus only catches what a case exercises; and a
  `pnpm format` sweep over `_brain/adr/**` is STILL unsafe — prettier reflows long
  frontmatter inline lists into a block form the subset rejects.
type: gotcha
scope: workflow
status: active
links: [two-parsers-wrong-together, durable-artifact-must-commit]
watch: [_brain/adr/**, _brain/_templates/adr.md]
---

**The anchor defect this record originally reported is fixed** (PRD-035, 2026-07-28):
the ADR section capture now ends at `(?=^## |(?![\s\S]))` in all three implementations —
the typed parser (`core/memory/parse.ts`), the repository validator
(`scripts/verify/lib.mjs`), and the shipped copy (`practices/verify/lib.mjs`) — held by
a corpus case asserting a blank-line-after-every-heading ADR is **valid**, and by
`verify:memory-corpus`, which executes the repository copy the package corpus never
runs. A prettier-formatted section **body** validates since that change.

**Lesson one — the anchor.** Under the `m` flag, `$` matches at the end of **every**
line, including the zero-length position on a blank line right after a heading. A lazy
capture stopping at `(?=^## |$)` therefore truncates at the first line boundary — the
rule the code actually implemented was "the line immediately after the heading must be
non-empty", which nobody wrote and normal Markdown violates. JavaScript has no `\z`;
end-of-input is `(?![\s\S])`.

**Lesson two — the coverage hole.** The conformance corpus asserted each case's
expected verdict — correctness, not merely agreement — but no case exercised a blank
line after a heading, so the assertion never ran against the defect. All three
implementations shared the same wrong anchor, which means the typed-versus-shipped
parity check could not surface a disagreement either, and the repository copy was not
executed against the corpus at all until `verify:memory-corpus` (see
[[two-parsers-wrong-together]]). A corpus catches exactly what its cases exercise: when
a formatter's output is the input you must accept, a formatted document belongs in the
corpus.

**The live hazard — a format sweep still breaks ADRs.** prettier also formats YAML
frontmatter: an inline `links: [a, b, …]` list crossing the print width is reflowed
into an indented block form, and the documented frontmatter subset rejects block lists
by design. Formatting a real ADR therefore still produces `structure`/`links` failures
— from the frontmatter now, not the body. `verify:memory-corpus` pins this as a named
limitation: its second smoke asserts prettier's reflowed output is refused, so a future
subset or prettier-config change must retire the pin and this warning together.

**Why:** an end-of-line anchor in a multiline capture, a corpus case set missing the
formatter's shape, and three copies sharing one mistake each hid the others; and fixing
the body anchor does not make the formatter safe while the frontmatter subset and
prettier disagree about list layout.
**How to apply:** in any `/m` regex that must run to end-of-input, write `(?![\s\S])`,
never `$`. Put the formatter's own output into the corpus of any format you validate.
Execute every implementation against the corpus — a hash reconciliation
(`verify:pack-drift`) proves two copies were compared, not that either is right. And do
not run `pnpm format` over `_brain/adr/**` while the frontmatter pin stands.
