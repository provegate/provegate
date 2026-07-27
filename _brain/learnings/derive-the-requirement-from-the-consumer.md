---
name: derive-the-requirement-from-the-consumer
description: >-
  A required-input set derived from the catalogue rather than from what the consumer reads
  demands answers that cannot change the output, and the mistake looks like diligence.
type: gotcha
scope: workflow
status: active
links: [shipped-content-needs-a-delivery-gate, evidence-pattern-satisfied-by-the-template]
provenance: PRD-029
watch: [packages/provegate/prompts/PLACEHOLDERS.md, packages/provegate/src/core/run/prompts.ts]
---

When a mechanism needs inputs, derive the required set from **what the consumer actually
reads**, never from the registry that catalogues them. A catalogue is a superset by
construction: it covers everything anyone might use, and the consumer uses a subset.

Measured on PRD-029. `prompts/PLACEHOLDERS.md` declares **20** tokens and covers
`prompts/`, `templates/` **and** `practices/templates/`. The protocol store renders only the
first two. Seven tokens resolve from config, so the honest requirement is **nine** — and four
rows (`{{LINK_TO_VISION_DOC}}`, `{{ONE_LINE_PRODUCT_FRAMING}}`,
`{{PROJECT_SPECIFIC_HARD_RULES}}`, `{{VISION_OR_DECISIONS_DOC}}`) occur in **zero** rendered
files. A specification that required all thirteen non-config rows would make every adopter
answer four questions that cannot change one byte of the output, and then refuse to install
until they did.

**Why:** the error presents as rigour, which is why it survives review. "Every declared token must be
supplied" reads like completeness, and the refusal it produces reads like a safety property.
Two independent review rounds passed over it; the third caught it only by measuring which
files actually contain each token. Nothing about the catalogue's shape signals that it is
wider than the consumer.

**The same shape, generalised:** any check whose input set comes from a declaration rather
than from a use. A required-field list from a schema when the code reads three fields; a
required-env list from a template when the service reads two.

**How to apply:** write the derivation as `consumed ∩ declared`, compute `consumed` by
scanning what the consumer reads, and assert the count in a test so it moves when the corpus
moves. If you catch yourself writing the required set as a literal list, that is the tell —
the list is a snapshot of a derivation nobody performed.
