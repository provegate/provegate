# Summary: PRD-036 — Frozen-Snapshot Digest Gate

> **PRD**: [prd-036-frozen-snapshot-digest-gate.md](../../_prds/wip/prd-036-frozen-snapshot-digest-gate.md)
> **Status**: Ship Verified
> **Ship Readiness**: Ship Verified
> **Date**: 2026-07-29

## What shipped

The `provegate#test` turbo cache key now sees everything the package tests read.
Twelve machine-measured input globs joined the `test` task (the `**/*.md` superset,
the frozen source snapshot, `scripts/verify/**`, review artifacts, docs pages,
changesets, root manifests, `page.tsx`, workflows, githooks), every out-of-package
read routes through ONE audited door (`test/helpers/repo-reads.ts` — `repoPath`,
`pkgRoot`, and the `REPO_READ_GLOBS` ledger), the four traversal/content fixture
strings live byte-identical in `test/helpers/escape-fixtures.ts`, and the standing
census gate `scripts/verify/verify-test-inputs.mjs` enforces the boundary in both
directions (usage→ledger fail-closed, ledger→turbo coverage) plus helper AST-shape
validation and a failure-safe Turbo dry-run probe that proves the globs live in the
actual task hash. Wired per `gate-wire-or-delete`: root alias, `CHECKS` bundle
member, `script-classes.json` row, and the ADR-0004 Classification row — one atomic
commit, rollback prova at `HEAD~1`.

## The review

Six independent Codex rounds (Critical 1→1→3→1→1→0): the review's flagship find was
the sanctioned base accessor (`repoPath('.')`) bypassing the usage ledger — closed
with the B4 rule (base + named literal leaf in one read call fails by name) and five
live migrations it exposed; the following rounds tightened B4's predicate family
edge by edge (template literals, export kinds, shadowing, nearest-binding, separator
spans, dots-only parts), each closure planted in the harness — 25 cases, the
`a-rule-corrected-survives-where-it-is-restated` pattern measured on this PRD's own
review. Round 6 swept the predicate space with a 23-case matrix and passed clean.

## Numbers

1371 package tests (57 files); harness 25/25; census 59 sources / 0 violations / 33
ledgered usages / 16 ledger entries; the full floor and `verify:workflow` green;
warm cache FULL TURBO on a no-edit re-run; the probe's hash change/restore proven
live.

## Watch items discharged

W1 one-commit rollout (prova held), W2 census re-run at claim (baseline byte-exact,
no discovery), W3 aggregate green before implementation (the sentinel refresh
`5a2a64a` on the owner's in-session approval), W4 every §11 row + ten-plus deny
causes, W5 the review's no-behavior-change / helper-shape / ADR-append-only sweep.
