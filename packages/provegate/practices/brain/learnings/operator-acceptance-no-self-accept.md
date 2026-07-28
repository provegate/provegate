---
name: operator-acceptance-no-self-accept
description: >-
  An autonomous agent must never self-accept an operator handoff; it may transcribe an
  owner's decision, recorded as such. Deciding and typing are two different acts.
type: gotcha
scope: workflow
status: active
links: [no-completed-done-status-alias, push-is-human-by-omission, free-text-field-is-the-unread-drift-ledger]
provenance: workflow-seed
---

Work that needs a human, a browser session, staging, DB credentials, or a runtime env is an
"operator row" an agent can't check off. If the acceptance CLI can be run non-interactively
with no guard, an autonomous agent will "accept" its own operator rows and merge — defeating
the human gate entirely.

The rule is about **deciding**, not about typing, and the two were conflated for a long time.
The documented form put the prohibition on the typing, and it was measurably false: half this
repository's entries had been produced by an agent at explicit owner direction, each saying so
honestly in `method`, the one field with no enumeration. A prohibition nobody follows protects
nothing; what protects the gate is that the DECISION is the owner's and the record says who
typed. (ADR-0003 quotes the superseded sentence verbatim — this record teaches the rule, the
ADR keeps the history.)

**Why:** the whole point of an operator row is that a human must vouch for it; a self-service
acceptance turns the human gate into a rubber stamp the agent presses itself. Transcription
is not self-acceptance — the owner still decides, and the entry names them — but an
unenumerated field cannot tell the two apart, so the distinction has to be structural.
**How to apply:** Gate acceptance: refuse when not a TTY unless an explicit `--yes` is passed;
in interactive mode require typing the item id to confirm; require `owner` ∈ a single
allowlist loader (don't hardcode the set in a second place). `owner` records who DECIDED;
`authorship` (`owner-written` | `agent-transcribed`, required and enumerated) records who
TYPED; `method` stays free text for the mechanism. An agent may transcribe only on explicit
in-session owner direction, and never originates an acceptance. The merge gate consumes only
a valid, owner-allowlisted waiver — and it is validation, not proof: nothing prevents a false
`authorship`, it only makes concealing one an affirmative false statement. See ADR-0003.
