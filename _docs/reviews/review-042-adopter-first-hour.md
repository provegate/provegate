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

Round 13 reviewed `5552a11233e661048808d5d1bb6a2f7378f27095...feat/prd-042-adopter-first-hour`. Both round-12 fixes hold, but the PRD ID-heading special case still bypasses the single substitution sweep and can leave a resolvable configured token untouched. Phase-7 artifacts also describe superseded review, test, gate-run, and base-branch state. Both findings are introduced by this diff, not pre-existing properties merely made reachable. The `development` base is coherent with the runtime and regenerated prompt store; `idAnchor`, unconditional configured-token handling elsewhere, `dropSection`, companion containment/atomicity and exact-width ID parsing, CLI grammar, Phase-6 path, quickstart ordering, and both changed tests otherwise satisfy the reviewed contract. The upheld entity rejection and tracked unfilled-PRD follow-up remain outside this verdict.

## Findings

| # | Sev | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | HIGH | `packages/provegate/src/core/run/new.ts:443-446`: **Introduced by this diff.** `instantiateTemplate` sends every non-anchor line through `applyOnce`, but handles the ID-anchor line with `line.replace(anchor, …)` alone. A supported custom template headed `# {{ID_PREFIX}}-XXX: {{CMD_LINT}}` therefore produces `# PRD-001: {{CMD_LINT}}` despite a non-empty configured lint command, violating FR-2’s every-token and one-sweep requirements. Include the anchor identity rule and configured-token rule in one sweep over that original line and add this exact regression. | open |
| 2 | MEDIUM | `_tasks/wip/tasks-042-adopter-first-hour.md:204-226,281-286` and `_docs/wip/summary-042-adopter-first-hour.md:86-101,113-130`: **Introduced by this diff.** The close artifacts remain on round 11/1443 tests, say `gate run` was not executed, and claim `workflow.config.json` lacks a `branches` block even though round 12, 1445 tests, the supplied gate run, and `branches.base: "development"` are current. Refresh the ledger, Phase-7 task state, verification counts, and ship-readiness narrative after the final review. | open |

## Post-fix verification

Orchestrator-provided evidence reports PASS for `pnpm check-types`, `pnpm lint`, `pnpm test` (8/8 tasks, 1445 package tests), `pnpm build`, `pnpm verify:workflow`, `pnpm verify:quickstart-parity`, `pnpm smoke:adopter`, and `gate check PRD-042`. A read-only direct probe of `instantiateTemplate` produced `# PRD-001: {{CMD_LINT}}`, confirming finding 1. No round-13 fixes were applied.
