---
name: narrow-the-grammar-not-the-parser
description: >-
  A hand-rolled Markdown reader never reaches renderer parity; narrow what the document
  may contain instead, so the reader has less to understand.
type: convention
scope: workflow
status: active
links: [two-parsers-wrong-together, false-green-on-missing-file]
watch: [packages/provegate/src/core/memory/artifacts.ts, packages/provegate/src/core/run/durable.ts]
---
A gate that reads a hand-written Markdown document has to agree with whatever renders it,
or the author sees one thing and the gate records another. Sixteen independent review
rounds against one such reader found roughly five disagreements each: fences, HTML blocks
of five kinds, code spans across lines, setext underlines, entities, autolinks, nested
lists, CRLF. Every fix was correct. None of them converged, because the target is an
entire specification and the package may take no runtime dependency to defer to.

What converged was changing the question. Rather than teaching the reader more Markdown,
the contract section was given a shape it declares for itself — column-zero bullets,
their wrapped continuations, prose, blank lines — and everything else refuses with a
message naming the construct. A whole class of disagreement disappeared at once: a fence
cannot hide a declaration in a section where a fence is not allowed.

Two rules make the narrowing safe rather than merely strict. Refuse the AMBIGUOUS shape,
not just the dangerous one: a line of dashes under text might be a heading, a thematic
break, or a table separator, and declining to guess retires the whole question. And
measure the corpus before narrowing — every rule here was checked against all 23 PRDs, 52
sections, and 312 bullets first, so each one cost nothing that was already written.

**Why:** an approximation of a specification is wrong in a direction nobody can predict,
and the permissive direction is a hole. Restricting the input removes cases instead of
handling them, and a rule an author can see beats a parser an author must model.
**How to apply:** when a gate parses hand-written text, define the accepted shape and
refuse the rest, with the refusal naming what it saw. Measure the existing corpus against
the rule before shipping it. Prefer refusing an ambiguous construct to interpreting it —
and never let "the reader could not tell" resolve as "accepted". See
[[two-parsers-wrong-together]] for why a shared corpus does not settle this on its own.
