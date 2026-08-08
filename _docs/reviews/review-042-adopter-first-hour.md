# Independent Review: PRD-042 — Adopter First Hour

> **PRD:** PRD-042
> **Verdict:** fail
> **Reviewer:** codex (gpt-5), read-only sandbox
> **Base SHA:** `5552a11233e661048808d5d1bb6a2f7378f27095`
> **Critical:** 0
> **High:** 2
> **Medium:** 0
> **Quorum:** 0/1 pass

## Summary

Round 12 reviewed `5552a11233e661048808d5d1bb6a2f7378f27095...feat/prd-042-adopter-first-hour`. The round-11 path-depth and Setext fixes work, but the claimed single sweep was applied only to PRD body lines: companion-task identity substitutions still rescan configured output, while configured tokens on the PRD anchor line are skipped. The quickstart verifier can still miss a rendered Close heading containing inline Markdown. Both findings are introduced by this diff, not pre-existing properties made reachable. `idAnchor`, `dropSection`, companion containment/atomicity and ID width, CLI grammar, the Phase-6 task path, unconditional placeholder substitution, and both changed tests otherwise satisfy the reviewed contract. The changed tests assert the new behavior rather than loosen old expectations. The `development` base is consistently consumed by the runtime and regenerated prompt store. The upheld entity rejection remains closed and carries no debt.

## Findings

| # | Sev | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | HIGH | `packages/provegate/src/core/run/new.ts:456-473,712-765`: **Introduced by this diff.** The implementation is not one sweep over every identity and configured-token occurrence. `createCompanion(..., "tasks")` substitutes configured tokens first, then later `replaceAll("prd-XXX-{short-name}.md", …)` and the review-path replacement reinterpret configured command bytes; for example, a configured command containing `prd-XXX-{short-name}.md` is silently rewritten to the current PRD filename. Conversely, `instantiateTemplate` handles the ID-anchor line separately, so a resolvable token in that line’s title remains unresolved. Put the ID anchor, task identities, and configured-token table into one replacement over each template’s original bytes. | open |
| 2 | HIGH | `scripts/verify/verify-quickstart-parity.mjs:171-205,260`: **Introduced by this diff.** “Heading text” is still raw Markdown text. A rendered heading such as `## **5. Close (the runner)**` before the recipe is ignored; retaining an unformatted `## 5. Close (the runner)` after the recipe gives exactly one recognized hit and passes, although a linear reader met Close first. Normalize supported inline heading content or fail closed on additional Close-shaped rendered headings. | open |

## Post-fix verification

Orchestrator-provided evidence reports PASS for `pnpm check-types`, `pnpm lint`, `pnpm test` (8/8 tasks), `pnpm build`, `pnpm verify:workflow`, `pnpm verify:quickstart-parity` with its existing mutation probe, and `pnpm smoke:adopter` (0 failing, 0 stale known-red). Findings 1 and 2 follow from the cited replacement and heading-comparison paths; the existing tests do not exercise either counterexample. No round-12 fixes were applied.
