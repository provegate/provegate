---
name: metadata-declares-what-it-cannot-provide
description: >-
  A declared capability with nothing behind it degrades silently — no build error, no
  test, no warning; assert the coherence between every declaration and its asset, and
  treat reviewers reading declarations as evidence as part of the failure mode.
type: gotcha
scope: workflow
status: active
links: [false-green-on-missing-file, gate-wire-or-delete, lint-must-name-the-span-it-judges]
provenance: PRD-027
---

`twitter.card: 'summary_large_image'` shipped with no image behind it: X and Slack
render no card, and nothing fails — not the build, not a lint, not a test. The page
made a promise no machine ever checked. PRD-027 measured three more instances of the
same shape on one page: an `aria-hidden` "copy" affordance with no handler, trust-strip
claims pointing at a section with no `id`, and a `copyable` prop whose component
comment delegated wiring to a consumer it gave no wiring point.

**Why:** a declaration and its asset live in different layers (metadata vs route file,
prop vs handler, href vs id), and no framework closes the loop — each layer renders
fine alone, so the gap is invisible everywhere except in the consumer that trusted it.

**How to apply:** when a declaration names a richer form, write the coherence assertion
— the card type asserts the image route exists AND the built HTML emits it; the copy
affordance cannot render without its payload (delete the prop, don't default it); every
`href="#…"` asserts a rendered `id` (closure over the whole page, not the new links).
Two corollaries, both measured here: **reviewers read declarations as evidence** — this
PRD's own earlier revision cited the inert `copyable` prop as proof the capability
existed; and a PUBLIC extension slot re-opens the hole one layer up — the fix's first
two versions let a caller pass a handlerless control, caught only by adversarial rounds
(keep the slot internal, hard-drop it after the public spread).
