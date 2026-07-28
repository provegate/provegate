---
name: lint-must-name-the-span-it-judges
description: >-
  A lint that reports confidently on a claim while reading a wider (or narrower) span
  than the claim covers ships false verdicts that look exact — name the span, then read
  exactly it.
type: gotcha
scope: workflow
status: active
links: [notes-column-runs-commands, turbo-cache-masks-out-of-input-reads, free-text-field-is-the-unread-drift-ledger]
provenance: PRD-024
---

A section-scoped check that answers about a span it did not actually read is the
signature defect of this codebase, and it shipped several independent instances before
any was noticed:

- the §11 command extractor read **every backtick span on the row** while its claim was
  about the Command column — a Notes-cell example silently joined the Phase-5 gate
  (PRD-021 FR-8, the proven instance);
- `lintPrd`'s `hasRunnable` made the same whole-row read independently, so scoping one
  reader left the other;
- the state builder's `getMetaValue` matched a bare `Updated …` prose line as a record
  date (`^Updated\s*:?\s*` with the colon optional) and recorded a sentence fragment as
  `lastUpdated` — while scoring the PRD that fixes this class;
- a readiness scorer's counting script matched each table's **header row** as an FR row
  (60 reported as 70), in the round that was scoring exactly this defect class;
- the corpus test's cache key named `_prds/**` while the test also read
  `workflow.config.json` and `gates.manifest.json` — the span of the cache was narrower
  than the span of the read, found by independent review in the fix for the class.

**Why:** the reader's span and the claim's span are defined in different places (a
regex here, a sentence there), so nothing forces them to agree — and a confident
verdict hides the mismatch precisely because it is confident.

**How to apply:** before trusting or writing any lint/check, state the exact span its
claim covers (a cell, a column, a section, an input set), then verify the code reads
exactly that span — no more, no less. When a check's result feeds a cache or a gate,
the input-set half applies: everything the check reads belongs in its cache key. A
plausible aggregate (a count, a green verdict) is not evidence the span was right;
re-derive one instance by hand.
