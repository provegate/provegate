---
name: memory-index-vs-detail
description: >-
  Memory works only with an always-loaded one-line INDEX plus detail-in-files, and only if
  it stores what the code can't already tell you — otherwise recall is expensive and noisy.
type: convention
scope: workflow
status: active
links: []
provenance: workflow-seed
---

The memory discipline that makes `_brain` pay off, distilled from running it at scale:

- **Index vs. detail.** `INDEX.md` holds one-line pointers only and is always loaded;
  bodies live in per-record files read on demand. Inlining detail into the index makes
  every recall pay for every record.
- **Non-derivable only.** Store what cannot be recovered from code, git history, or docs.
  Code structure, API shapes, and past fixes are already in the repo — duplicating them
  bloats memory and goes stale.
- **Relevance hook per record.** Each record's one-line `description` is what an agent
  scans to decide relevance; if it can't be understood without the body, rewrite it.
- **Dedupe over fork.** Update the existing record instead of creating a near-duplicate.

**Why:** agent-agnostic memory has no harness auto-injecting the right fact; recall is a
scan of the index, so the index must be small and every line must earn its place.
**How to apply:** Keep INDEX terse and grouped; push all substance into files; reject any
candidate record that the repo already answers.
