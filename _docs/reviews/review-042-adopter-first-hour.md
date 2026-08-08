# Independent Review: PRD-042 — Adopter First Hour

> **PRD:** PRD-042
> **Verdict:** fail
> **Reviewer:** codex (gpt-5), read-only sandbox
> **Base SHA:** `5552a11233e661048808d5d1bb6a2f7378f27095`
> **Critical:** 0
> **High:** 1
> **Medium:** 1
> **Quorum:** 0/1 pass

## Summary

Round 14 reviewed `5552a11233e661048808d5d1bb6a2f7378f27095...feat/prd-042-adopter-first-hour`. The round-13 anchor-line correction works, but the unified sweep changes the established behavior of every other anchored substitution by rewriting all matching lines, including fenced examples. One Phase-7 task record also remains stale despite the prior artifact correction. Both findings are introduced by this diff. Companion containment, atomic writes, exact-width IDs, CLI grammar, unconditional configured-token handling, memory-section removal, Phase-6 path diagnostics, quickstart ordering, strengthened existing tests, and `branches.base: development` otherwise satisfy the reviewed contract. The upheld entity rejection and tracked unfilled-PRD follow-up remain outside this verdict.

## Findings

| # | Sev | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | HIGH | `packages/provegate/src/core/run/new.ts:430-452`: **Introduced by this diff.** The base implementation replaced only the first occurrence of each Created, Updated, Slug, Class, and Changelog anchor, but `applyOnce` now applies those rules globally to every matching line. A supported forked template containing its real Created line followed by a fenced `> **Created**: [YYYY-MM-DD]` example therefore rewrites both lines; a read-only probe produced two dated lines and removed the example placeholder. This violates FR-2’s requirement that existing anchored substitutions keep their behavior and silently edits content outside the supported metadata site. Resolve each existing anchor to its original line before the sweep, enable its identity arm only on that line while keeping configured-token substitution unconditional, and add a fenced-duplicate regression. | open |
| 2 | MEDIUM | `_tasks/wip/tasks-042-adopter-first-hour.md:200,303`: **Introduced by this diff.** Phase 7 is marked complete and the summary exists, but task 11.3 remains unchecked, while the Progress Log still says “Eleven review rounds; 40+ findings” after round 13 and 45+ findings. The round-13 stale-artifact correction therefore did not update every restatement it claimed to close. Refresh the checkbox and progress entry with the final round/count. | open |

## Post-fix verification

Orchestrator-provided evidence reports PASS for `pnpm check-types`, `pnpm lint`, `pnpm test` (8/8 tasks, 1445 package tests), `pnpm build`, `pnpm verify:workflow`, `pnpm verify:quickstart-parity`, `pnpm smoke:adopter`, and `gate check PRD-042`; `gate run PRD-042` passed through Phase 5 and stopped at the committed Phase-6 failure. A read-only direct probe confirmed finding 1 by showing that both the real and fenced duplicate Created anchors were substituted. No round-14 fixes were applied.
