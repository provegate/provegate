---
name: false-green-on-missing-file
description: >-
  A per-FR gate check that greps or tests a file must exit non-zero when the file is
  absent, else an unimplemented requirement passes the gate as a false green.
type: gotcha
scope: workflow
status: active
links: [grep-token-anchors-real-impl, absence-must-be-asserted]
provenance: workflow-seed
---

When a per-requirement verification command targets a specific file (grep a symbol, run a
named test file), a missing target is the dangerous case: a naive `grep … file || true`
or a test runner that reports "no tests found" as success lets an *unimplemented*
requirement pass the gate.

**Why:** "no match" and "file absent" are different failures, but shells and test runners
often collapse both into exit 0. The gate then certifies work that does not exist.
**How to apply:** Make target-absence an explicit failure. Check the file exists first
(`test -f` / stat) and exit non-zero if not; never mask the check with `|| true`. When a
gate batches many per-FR checks, run the failing one alone to see whether it's a real miss
or a missing file.
