---
name: operator-acceptance-no-self-accept
description: >-
  An autonomous agent must never self-accept an operator handoff; acceptance is a deliberate,
  owner-allowlisted human action (TTY-confirm or explicit flag).
type: gotcha
scope: workflow
status: active
links: [no-completed-done-status-alias, push-is-human-by-omission]
provenance: workflow-seed
---

Work that needs a human, a browser session, staging, DB credentials, or a runtime env is an
"operator row" an agent can't check off. If the acceptance CLI can be run non-interactively
with no guard, an autonomous agent will "accept" its own operator rows and merge — defeating
the human gate entirely.

**Why:** the whole point of an operator row is that a human must vouch for it; a self-service
acceptance turns the human gate into a rubber stamp the agent presses itself.
**How to apply:** Gate acceptance: refuse when not a TTY unless an explicit `--yes` is passed;
in interactive mode require typing the item id to confirm; require `owner` ∈ a single
allowlist loader (don't hardcode the set in a second place). Record the method
(`interactive`/`--yes`). The merge gate consumes only a valid, owner-allowlisted waiver.
