---
name: absence-must-be-asserted
description: >-
  A "this must NOT exist" requirement needs an explicit assert-absent step; a negative or
  `!`-prefixed grep passes silently on absence and proves nothing.
type: gotcha
scope: workflow
status: active
links: [false-green-on-missing-file]
provenance: workflow-seed
---

Some requirements are negative: a deprecated call must be gone, a forbidden import must
not appear. A negated grep (`! grep pattern`) fails twice over: (a) in an
allowlist-filtered gate runner, `! ` matches no runnable prefix, so the command is
**silently dropped** — it never runs, is never counted as coverage, and the phase passes
without the check executing; (b) even where it does run, it also "passes" when the grep is
misspelled, points at the wrong path, or the file moved — absence and mis-targeting
produce the same empty result.

**Why:** negation is inexpressible in a prefix-allowlisted command row, and a bare
negative grep can be green for the wrong reason either way.
**How to apply:** Point the requirement at a dedicated assert-absent script that (1)
confirms the search scope exists and is non-empty, then (2) fails if the forbidden
pattern appears. Assert the haystack exists before asserting the needle doesn't.
Exception: _file_ absence is expressible in-row as `test ! -f path` (the `test ` prefix is
allowlisted); only content-absence greps need the script. See
[[unparseable-command-must-fail-loudly]] for the runner-side fix.
