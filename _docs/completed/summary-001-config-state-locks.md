# Development Summary: Config Core + State/Lock Extraction

> **PRD**: [prd-001-config-state-locks.md](../../_prds/completed/prd-001-config-state-locks.md)
> **Tasks**: [tasks-001-config-state-locks.md](../../_tasks/completed/tasks-001-config-state-locks.md)
> **Ship Readiness**: Ship Verified
> **Completed**: 2026-07-22
> **Author**: rayvaz (implementing agent: claude-fable-5; reviewer: codex)

---

## Overview

Roadmap Phase B landed: the parent workflow's two config chokepoints are now a typed,
validated `WorkflowConfig` surface, and the state SSOT (build/persist/query) plus the
agent-lock machinery (lease validation, zero-dep glob engine, path-conflict detection)
live in `packages/provegate/src/core/{config,state,locks}`. `gate status` and
`gate queue` are the first real CLI commands — and this repo is their first consumer.

---

## Key Features

- `WorkflowConfig`: dirs (+ explicit `stateRoles`), idPattern, statusVocab, branches,
  commands, owners, worktree, executionPhases, sharedAppendOnly — hand-rolled shape AND
  semantic validation, zero runtime dependencies.
- `core/state`: markdown/artifact parsers, vocab-driven status normalization
  (`UNKNOWN_STATUS` sentinel), atomic snapshot writes, active/ready/queue semantics with
  the per-record done-check (no high-water-mark).
- `core/locks`: lease validation with per-field issue lists, byte-parity glob engine,
  materialized + structural path-conflict detection, non-object lock tolerance.
- Generalized JSON schemas (agent-lock, prd-state, acceptances) under neutral `$id`s.

---

## Evidence

- Gates: check-types/lint/build 3/3 tasks; tests 120/120 across 12 files (§11 ledger in
  the tasks file has one row per FR, all `passed` with evidence).
- Independent cross-model review: 3 rounds, verdict **pass**, 7/7 findings fixed —
  [review-001-config-state-locks.md](../reviews/review-001-config-state-locks.md).
- Dogfood: `gate status` reports PRD-001; `gate queue` showed this PRD in-flight under
  its own hand-authored lease, which FR-7's validator accepts.

## Ship Readiness

Ship Verified — operator accepted 2026-07-22; no-ff merge `8fc251d` landed on `main` with
post-merge gates green (120/120 tests). Push remains the owner's keystroke.
