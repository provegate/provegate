---
name: a-rule-that-exempts-itself
description: >-
  A gate whose exception the gated party evaluates is not a gate — the exception reads
  as a considered caveat in review, and the fix is moving the predicate to whoever owns
  the decision, never strengthening the wording.
type: gotcha
scope: workflow
status: active
links: [operator-acceptance-no-self-accept, narrow-the-grammar-not-the-parser]
provenance: PRD-031
---

The shipped Phase 3 protocol said: STOP until the human says "Go" — *exception: in
autonomous-execution mode, proceed and document*. Who decides the session is in
autonomous-execution mode? Nothing did. The agent assessed itself, and an agent that
was just asked for a task plan has every reason to conclude it is autonomous. The gate
was real; its exception was self-issued — and the entrypoint's ten stop rules with no
proceed rule produced the mirror defect, agents manufacturing human gates mid-Phase-4.

**Why:** it survives review because the exception reads as a thoughtful caveat, not a bypass.
"In autonomous mode", "where appropriate", "unless the session is unattended" all look
like nuance; each hands the gated party its own exemption predicate.

**How to apply:** move the predicate to whoever owns the decision, expressed where they
record decisions — here, a configured value (`AUTONOMY_MODE`, two enumerated legal
values, fragments shipped in the package, the config carrying only the key) so the
human sets the mode once and no rendering ever asks the agent which mode it is in. Fix
the asymmetry the same way: state the proceed rule beside the stop rules, in the
always-loaded context. Strengthening the exception's wording is the move that does NOT
work — five successive wordings of a §9 exemption produced five holes the same week
(see PRD-028's history); ownership moves, wording never suffices.
