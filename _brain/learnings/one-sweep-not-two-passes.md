---
name: one-sweep-not-two-passes
description: >-
  Two substitution passes over one document always let one read the other's output; ordering
  them only chooses the direction. One sweep with a callback is the arrangement where neither
  can — `String.replace` scans the original and never revisits a replacement.
type: gotcha
scope: workflow
links: [narrow-the-grammar-not-the-parser, recompute-beats-recorded-state]
status: active
watch: [packages/provegate/src/core/run/new.ts]
---

A document with two kinds of substitution — identity values and configured tokens — cannot be
made safe by ordering the passes. Tokens last: the pass reads the id, slug and dates identity
just wrote, so a prefix of `{{CMD_LINT}}` comes back as `pnpm lint`. Tokens first: identity
reads the token pass's output, so a `DOCS_ROOT` of `{{ID_PREFIX}}/docs` comes back as
`PRD/docs`. Both were found by review, one round apart, as the same defect wearing the other
face.

Apply every rule in ONE `String.replace` with a global alternation and a callback: the scan
runs over the ORIGINAL string and never revisits what a callback returned, so no rule can read
another's output in either direction.

Two corollaries, both paid for:

- **A replacement STRING is a pattern.** `$&`, `$1`, `` $` `` are interpreted, so any byte that
  came from configuration — a prefix, a path, a command — re-enters the text as syntax. Three
  separate review rounds found the same `$&` defect in three functions. Callback replacements
  everywhere configured bytes are involved, without exception.
- **The guard a two-pass design needs disappears with the second pass.** A prefix that spells a
  token had to be refused while two passes existed; with one sweep the question does not arise,
  and the refusal was deleted rather than kept as a rule nobody could explain.

**Why:** each pass is correct in isolation; the defect lives in their composition, which is
exactly the place a test of either one cannot see.

**How to apply:** when a second substitution pass appears over a document the first already
touched, collapse them instead of ordering them. If they genuinely cannot be collapsed, the
document is doing two jobs and the right move is to split the document, not to sequence the
passes ([[narrow-the-grammar-not-the-parser]]).
