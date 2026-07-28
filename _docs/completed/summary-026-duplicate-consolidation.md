# Summary: PRD-026 — Duplicate Consolidation

> **PRD**: [prd-026-duplicate-consolidation.md](../../_prds/wip/prd-026-duplicate-consolidation.md)
> **Tasks**: [tasks-026-duplicate-consolidation.md](../../_tasks/wip/tasks-026-duplicate-consolidation.md)
> **Review**: [review-026-duplicate-consolidation.md](../reviews/review-026-duplicate-consolidation.md)
> **Ship Readiness**: Operator Verification
> **Date**: 2026-07-28

## What shipped

The three method rules implemented three times each are implemented ONCE. `gate check`
gains three corpus sweeps — `--review-artifacts` (select-then-bind, the expected id
derived from the filename at the configured width), `--durable-artifacts` (the
declaration lint, also enforced per-PRD at readiness), and the landed `--wiring` now on
executing surfaces (alias + manifest + CI). The deletion commit removed both halves in
one change: the repo trio with its exceptions file, entries and bundle rows (root
CHECKS 11 → 9, the class ledger joining), the packed twins with their four `PACK_MAP`
entries and drift-ledger pairs, the packed bundle 6 → 3, the pack manifest −4. The class
ledger (`verify:script-classes`) enforces schema, coverage, expiry and the ADR-0004
diff — born agreeing: the deleted trio is in neither store, observed red-then-green
across the two commits. Six live documents name only the surviving surface, held by a
boundary check with enumerated, asserted exclusions and vacuity controls on both the
tree and the board. The minor release carries the five-step manual migration whose step
order can no longer lose the exceptions data.

## Evidence

1216 package tests (baseline 1183 + 33); floor, nine-member bundle, pack-drift (45
pairs), script-classes (11/11), and the three live sweeps all green. Phase 6: four
independent Codex rounds — 3 critical + 8 advisory findings, all closed with
reconstruction; Critical: 0 in rounds two through four. The sharpest finding was round 1
catching the wave violating its own rule: deleting the old wiring step had left the
wiring audit itself with no executing surface. Mutation checks kill exactly their paired
fixtures, and one vacuous fixture was caught by its own mutation check and rebound.

## Deliberately not done

`gate init` still deletes nothing on upgrade (the additive-only invariant is
load-bearing); the migration is manual, published, and step-ordered. Stale-pack
detection for never-migrating adopters stays a named follow-on. The two Durable
Artifacts section READERS keep their recorded deferral; this PRD unified the token
extraction only.

## Close state

Operator-gated: awaiting the owner's acceptance entry for task 11.5, then
`gate run PRD-026`. Push is the owner's.
