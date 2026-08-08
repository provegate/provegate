# Independent Review: PRD-042 — Adopter First Hour

> **PRD:** PRD-042
> **Verdict:** fail
> **Reviewer:** codex (gpt-5), read-only sandbox
> **Base SHA:** `5552a11233e661048808d5d1bb6a2f7378f27095`
> **Critical:** 0
> **High:** 0
> **Medium:** 2
> **Quorum:** 0/1 pass

## Summary

Round 15 reviewed `5552a11233e661048808d5d1bb6a2f7378f27095...feat/prd-042-adopter-first-hour`. Both round-14 findings are closed: identity anchors retain first-match cardinality while configured tokens remain global, and Phase 7 is checked with fourteen rounds recorded. Two introduced contract/artifact defects remain. The targeted anchor, token, section-removal, containment, atomicity, ID-width, CLI grammar, Phase-6 path, quickstart-order, changed-test, memory-output, and `branches.base: development` checks otherwise hold. The entity rejection remains upheld. The unfilled-PRD lint gap is a pre-existing readiness-lint property this diff makes reachable and belongs only to its recorded follow-up item.

## Findings

| # | Sev | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | MEDIUM | `packages/provegate/src/core/run/new.ts:733-751,770-773`: **Introduced by this diff.** `createCompanion` exceeds FR-1’s closed substitution table: the tasks branch resolves the Verification Ledger’s review-path placeholder, and the review branch replaces `[Feature Name]` with the slug. FR-1 permits only the listed task identity/link/date/token substitutions and only the review ID substitutions; it explicitly says anything absent stays an author-filled placeholder. Leave those two placeholders untouched, or obtain an owner amendment to the closed table and add exact-output regressions. | open |
| 2 | MEDIUM | `_tasks/wip/tasks-042-adopter-first-hour.md:228`: **Introduced by this diff.** The Verification Ledger still says the committed review artifact is round 13, while that artifact and the summary record round 14. This contradicts the claim that the task artifact is current and leaves Phase-6 evidence describing the wrong review run. Update the row to round 14 and its current evidence before replacing it with this round’s verdict. | open |

## Post-fix verification

Orchestrator-provided evidence reports PASS for `pnpm check-types`, `pnpm lint`, `pnpm test` (8/8 tasks, 1447 package tests), `pnpm build`, `pnpm verify:workflow`, `pnpm verify:quickstart-parity` including its mutation probe, `pnpm smoke:adopter`, `gate check PRD-042`, and every `gate run PRD-042` gate through Phase 5. Read-only inspection confirmed the round-14 cardinality regressions and Phase-7 artifact corrections. No round-15 fixes were applied.
