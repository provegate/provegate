---
name: adr-section-blank-line-reads-empty
description: >-
  The ADR section check captures only the line right after the heading, so a blank line
  there — what prettier writes — reports every section as empty.
type: gotcha
scope: workflow
status: active
links: [two-parsers-wrong-together, durable-artifact-must-commit]
watch: [_brain/adr/**, _brain/_templates/adr.md]
---

Writing the repository's first ADR fails `verify:brain` with four identical errors —
`the '## Context' section is empty` and the same for Decision, Consequences, and
Alternatives — even when every section is full.

The section regex ends its lazy capture at `(?=^## |$)` with the `m` flag, and under `m`
the `$` matches at the end of **any** line. So the capture stops at the first line
boundary after the heading: with a blank line there it captures the empty string, and
with content there it captures only that first line. The rule the code actually
implements is "the line immediately after the heading must be non-empty", which nobody
wrote down and which normal Markdown violates.

Two things hide it. `_brain/_templates/adr.md` puts its placeholder on the line directly
under each heading, so the template is the one shape that passes. And the repository had
no ADR at all until now, so no fixture ever exercised the path — the shared conformance
corpus proves the typed parser and the standalone validator agree, and here they agree on
the same wrong answer (see [[two-parsers-wrong-together]]).

`prettier` formats `.md` and inserts a blank line after a heading, so `pnpm format` turns
a passing ADR into a failing one. `format:check` is not wired into any gate today, which
is the only reason the two have not collided already.

**Why:** `$` under the `m` flag is an end-of-LINE anchor, not end-of-input; a lazy
quantifier stopping at it truncates at the first newline instead of running to the next
section. The same regex shape is duplicated in the typed parser and in the standalone
validator, so both give the same wrong verdict and their shared corpus cannot expose it.
**How to apply:** Until the anchor is fixed to end-of-input (`$(?![\s\S])`) in every copy,
write ADR sections with the content on the line **immediately** after the heading, and do
not run `pnpm format` over `_brain/adr/`. When fixing it, fix all copies plus the corpus
in one change — a fix in one implementation alone re-creates the disagreement the corpus
exists to prevent.
