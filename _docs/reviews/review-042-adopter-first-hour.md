# Independent Review: PRD-042 — Adopter First Hour

> **PRD:** PRD-042
> **Verdict:** fail
> **Reviewer:** codex (gpt-5), read-only sandbox
> **Base SHA:** `5552a11233e661048808d5d1bb6a2f7378f27095`
> **Critical:** 0
> **High:** 2
> **Medium:** 2
> **Quorum:** 0/1 pass

## Summary

Round 11 reviewed `5552a11233e661048808d5d1bb6a2f7378f27095...feat/prd-042-adopter-first-hour`. The round-10 identity-to-token rescan closes, but the inverse rescan remains: later identity passes still reinterpret configured-token output. The backslash-depth fix is correct on Windows but emits a broken link on POSIX. The placeholder-line heuristic is gone, `idAnchor`, `dropSection`, companion containment/atomicity, CLI grammar, Phase-6 path, and the two changed tests otherwise satisfy their contracts. The upheld entity rejection remains closed and carries no debt. Four findings are introduced by this diff; none is a pre-existing surrounding-code property merely made reachable.

## Findings

| # | Sev | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | HIGH | `packages/provegate/src/core/run/new.ts:439-475,719-774`: **Introduced by this diff.** Moving `substituteConfiguredTokens` first prevents it from reading identity output, but later identity substitutions still read configured output. A read-only probe with `DOCS_ROOT: "{{ID_PREFIX}}/docs"` produced `PRD/docs/[page].md`, not the configured literal `{{ID_PREFIX}}/docs/[page].md`; the tasks path likewise rewrites configured values containing `prd-XXX-{short-name}.md` or `review-XXX-{short-name}.md`. Make all substitutions operate only on occurrences originating in the template. | open |
| 2 | HIGH | `scripts/verify/verify-quickstart-parity.mjs:161-176,240`: **Introduced by this diff.** The order assertion recognizes only ATX headings. A Setext `5. Close (the runner)` heading can precede the manifest recipe while the required ATX close remains after it; the verifier sees one ATX close after the recipe and passes a document whose rendered close already occurred. Recognize Setext H2 headings or explicitly refuse them in the judged region. | open |
| 3 | MEDIUM | `packages/provegate/src/core/run/new.ts:738-748`: **Introduced by this diff.** Splitting on both separators unconditionally fixes Windows but breaks POSIX, where `workflow\\tasks` is one literal directory. The file lands at `<root>/workflow\\tasks/wip/...`, requiring `../../_prds/...`, while the implementation emits `../../../_prds/...`. Derive the link with platform path primitives from the actual contained destinations, then convert its separators to `/`. | open |
| 4 | MEDIUM | `_prds/wip/prd-042-adopter-first-hour.md:155-158`, `_tasks/wip/tasks-042-adopter-first-hour.md:125-128`, `packages/provegate/src/core/run/new.ts:324-325`: **Introduced by this diff.** The round-10 implementation now runs the token pass first, but the binding FR, checked task, and function documentation still require it to run after anchored substitutions. The reviewer briefing and commit message do not update the governing artifacts. Amend every restatement to the deliberate first-pass contract and its literal-output invariant. | open |

## Post-fix verification

Orchestrator-provided evidence reports PASS for `pnpm check-types`, `pnpm lint`, `pnpm test` (8/8 tasks), `pnpm build`, `pnpm verify:workflow`, `pnpm verify:quickstart-parity` including its mutation probe, and `pnpm smoke:adopter` (0 failing, 0 stale known-red). A read-only probe reproduced finding 1, and Node’s platform path resolution confirmed finding 3. Findings 2 and 4 follow directly from the cited parser and governing text. No round-11 fixes were applied.
