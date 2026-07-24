---
name: known-red-ledger-must-expire
description: >-
  An allowlist of acknowledged-failing checks must itself fail on stale or unknown entries,
  or it silently becomes a permanent gate bypass.
type: gotcha
scope: workflow
status: active
links: [gate-wire-or-delete]
provenance: workflow-seed
---

Teams need a pressure valve: a manifest of checks allowed to fail *for now*, with a reason,
so one red doesn't block all work. But an unpoliced allowlist is a backdoor — entries stay
after the check is fixed, and the gate quietly stops enforcing.

**Why:** the whole point of a gate is that green means green; a permanent "known red" entry
inverts that without anyone noticing.
**How to apply:** Police the ledger itself. When the aggregate runner applies the known-red
manifest, a **stale** entry (the check now passes), an **unknown** entry (names a check that
doesn't exist), or a malformed one must **fail the run** — forcing entries to be removed once
the underlying check is fixed. The valve stays temporary by construction.
