# Independent Review: PRD-042 — Adopter First Hour

> **PRD:** PRD-042
> **Verdict:** fail
> **Reviewer:** codex (gpt-5), read-only sandbox
> **Base SHA:** `5552a11233e661048808d5d1bb6a2f7378f27095`
> **Critical:** 0
> **High:** 2
> **Medium:** 1
> **Quorum:** 0/1 pass

## Summary

Round 5 reviewed `5552a11233e661048808d5d1bb6a2f7378f27095...feat/prd-042-adopter-first-hour` and verified the round-4 closures against code. The competing-heading, CRLF fence, CRLF preservation, repeated-section, and directory-candidate fixes hold. Recipe discovery now consults the shared fence map, but inferring an opener from its predecessor creates another false green. The argument grammar, companion containment and atomic writes, Phase-6 task path, and both changed tests conform; `prompts-integrity.test.ts` and `quickstart-e2e.test.ts` were strengthened for the new contract, not loosened. Two additional FR-2/FR-5 defects remain.

## Findings

| # | Sev | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | HIGH | `packages/provegate/src/core/run/new.ts:365`: `assertSingleIdAnchor` correctly ignores fenced anchors, but `substituteAnchor` then performs an independent global replacement and edits the first textual anchor. When a fenced `# PRD-XXX:` precedes the one real heading, instantiation succeeds with the example changed to `PRD-042` while the real heading remains `PRD-XXX`. Use the unfenced line identified by the guard for substitution and add a regression with the fenced example before the real anchor. | open |
| 2 | HIGH | `scripts/verify/verify-quickstart-parity.mjs:189`: `fenced[i] && !fenced[i-1]` is not an opener predicate because a closer is also marked fenced. A JSON fence immediately following another fence’s closer is therefore invisible. A pre-Close recipe plus a post-Close recipe adjacent to a preceding fence yields one discovered recipe and passes the order assertion. Return opener/closer roles or fence ranges from the shared scanner and mutation-test adjacent fences around the post-Close recipe. | open |
| 3 | MEDIUM | `packages/provegate/src/core/run/new.ts:244`: `promptValue` converts an explicitly empty `CMD_TEST_SCOPED` or `DOCS_ROOT` value to `undefined`, causing `configuredTokens` to apply the fallback. FR-2 says an empty source is not a substitution and the token must remain unresolved; a probe with both prompt values set to `""` instead produced `pnpm test` and `_docs`. Distinguish an absent prompt key from a present empty value and add regressions for both precedence tokens. | open |

## Post-fix verification

Orchestrator-provided evidence reports PASS for `pnpm check-types`, `pnpm lint`, `pnpm test` (8/8 tasks), `pnpm build`, `pnpm verify:workflow`, `pnpm verify:quickstart-parity`, and `pnpm smoke:adopter` (0 failing, 0 stale known-red). Read-only probes reproduced the fenced-first anchor mis-substitution, the adjacent-fence order false green, and both empty prompt values resolving through their fallbacks.
