---
name: no-completed-done-status-alias
description: >-
  Writing "Completed"/"Done" as a work-item status self-declares the terminal shipped state
  and inverts the gate order; require the canonical status written explicitly.
type: gotcha
scope: workflow
status: active
links: [operator-acceptance-no-self-accept]
provenance: workflow-seed
---

A workflow with a fine-grained status enum (Draft → … → Ship Verified) breaks if authors can
write vague terminal words like `Completed` or `Done`. A normalizer that maps them to the
terminal state (for legacy files) means a new item labelled `Status: Completed` silently
claims "shipped + verified" *before any gate ran* — inverting the gate order the whole
workflow depends on.

**Why:** the terminal status must be the *output* of the gates, never a self-declared input;
an alias that resolves to it lets an author skip the gates by wording.
**How to apply:** Treat `complete/completed/done` (and similar) as an illegal alias in a new
item — a state violation that fails the state gate with "write the canonical status
explicitly." Keep any benign synonym map (e.g. `proposed→Draft`) tiny and non-terminal.
