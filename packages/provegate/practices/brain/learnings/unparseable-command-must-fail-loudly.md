---
name: unparseable-command-must-fail-loudly
description: >-
  An allowlist-filtered gate runner must fail loudly on a command it cannot classify as
  runnable — silently skipping it passes the phase without the check ever running.
type: gotcha
scope: workflow
status: active
links: [absence-must-be-asserted, false-green-on-missing-file]
provenance: workflow-seed
---

A gate runner that extracts commands through a runnable-prefix allowlist has three
possible outcomes per extracted span: run it, refuse it loudly, or drop it silently. The
third is the dangerous one: a span that fails the allowlist (a `! `-negated command, an
unrecognized tool, a typo like an upper-cased runner name) simply never enters the command
set — the phase then passes with that check never having executed, and no one is told.

**Why:** "not classified as runnable" and "does not need to run" are different things, but
a filter that discards non-matching spans collapses them. The gate certifies a phase whose
declared checks partially never ran.
**How to apply:** In the parser, count every backtick span on a requirement row; any span
that is neither classified runnable nor explicitly annotated as non-command must fail the
readiness lint (or at minimum be reported per-row). The runner's "zero commands parsed"
guard catches the fully-empty case; this closes the partially-dropped case.
