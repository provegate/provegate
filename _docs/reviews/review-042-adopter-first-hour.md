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

Round 10 reviewed `5552a11233e661048808d5d1bb6a2f7378f27095...feat/prd-042-adopter-first-hour`. Round 9’s three findings close, and the round-8 entity rejection remains upheld and closed. The placeholder-line heuristic is no longer present; substitutions are unconditional across table rows, Notes cells, links, and the Changelog. The anchor alternation, section removal, argument refusals, Phase-6 path, quickstart ordering assertion, and two changed tests otherwise satisfy the stated contract. Two defects introduced by this diff remain; neither is a pre-existing surrounding-code property carried into this verdict.

## Findings

| # | Sev | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | HIGH | `packages/provegate/src/core/run/new.ts:433-469,725-751`: **Introduced by this diff.** `substituteConfiguredTokens` rescans bytes inserted by earlier callback replacements. With valid `idPattern.prefix: "{{CMD_LINT}}"`, a read-only probe produced `# pnpm lint-001` instead of the configured `# {{CMD_LINT}}-001`; with `reviewsDir: "{{DOCS_ROOT}}/reviews"`, `--tasks` records `_docs/reviews/...` while `--review` writes beneath the literal configured directory, so Phase 6 cannot connect them. Callback replacements close replacement-string interpretation, but not cross-pass rescanning. Substitute only token occurrences originating in the template, never assembled output. | open |
| 2 | MEDIUM | `packages/provegate/src/core/run/new.ts:714-724`: **Introduced by this diff.** Task-link depth normalization recognizes only `/`, although valid artifact directories resolve `\` as a separator on Windows. `tasks.dir: "workflow\\tasks"` writes three directories below the root but emits only `../../_prds/...`, producing a broken PRD link. Derive the relative link from the contained absolute destination and PRD paths using platform path primitives, then normalize the emitted link to `/`. | open |

## Post-fix verification

Orchestrator-provided evidence reports PASS for `pnpm check-types`, `pnpm lint`, `pnpm test` (8/8 tasks), `pnpm build`, `pnpm verify:workflow`, `pnpm verify:quickstart-parity` including its mutation probe, and `pnpm smoke:adopter` (0 failing, 0 stale known-red). A read-only in-memory probe reproduced finding 1. Finding 2 follows from the platform-dependent path semantics at the cited lines. No round-10 fixes were applied.
