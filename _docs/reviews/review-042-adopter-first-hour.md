# Independent Review: PRD-042 — Adopter First Hour

> **PRD:** PRD-042
> **Verdict:** fail
> **Reviewer:** codex (gpt-5), read-only sandbox
> **Base SHA:** `5552a11233e661048808d5d1bb6a2f7378f27095`
> **Critical:** 0
> **High:** 4
> **Medium:** 0
> **Quorum:** 0/1 pass

## Summary

Round 7 reviewed `5552a11233e661048808d5d1bb6a2f7378f27095...feat/prd-042-adopter-first-hour`. Each stated round-6 closure holds for its regression: spaced prefixes refuse, path-bearing artifact prefixes refuse, four-character fences and empty commands no longer fool recipe discovery, and unrelated blank runs remain byte-identical. The path-prefix limitation is a pre-existing incompatibility in artifact discovery; this change now refuses it safely. The former placeholder-line heuristic is absent, and configured tokens resolve unconditionally in tables, Notes, links, and Changelog rows. Both changed tests assert the new contract rather than loosening it. None of the findings below appears newly created by the round-6 patch, but all four are defects in this change, so PRD-042 does not pass.

## Findings

| # | Sev | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | HIGH | `packages/provegate/src/core/run/new.ts:724`: a generated tasks ledger retains the hardcoded `_docs/reviews/` directory while `gate new --review` writes to `config.dirs.reviewsDir`. With any valid custom reviews directory, the two CLI commands create artifacts that Phase 6 cannot connect. Replace the complete review path with `${config.dirs.reviewsDir}/review-${number}-${slug}.md` and test the real Phase-6 gate under a custom directory. | open |
| 2 | HIGH | `packages/provegate/src/core/run/new.ts:225`: the foreign-anchor guard recognizes only column-zero headings beginning `# `, so valid ATX H1 forms such as `#\tRFC-XXX: foreign` or `   # RFC-XXX: foreign` survive beside the canonical anchor and instantiate. Parse the full ATX H1 shape or refuse every alternate H1 whose text begins with an `-XXX:` identifier. | open |
| 3 | HIGH | `packages/provegate/src/cli.ts:337`: artifact mode takes its ID from the first positional regardless of argument order. With a valid lowercase configured prefix, `gate new prd-001 --tasks` is both a valid slug-shaped positional and outside the declared `--tasks <ID>` production, yet it writes a tasks artifact instead of refusing the mixed form. Bind the ID to the token following the artifact flag and reject preceding positionals. | open |
| 4 | HIGH | `scripts/verify/verify-quickstart-parity.mjs:159`: order headings are matched by raw equality rather than ATX heading grammar. Prepending `## 5. Close (the runner) ##` before the manifest leaves the original exact Close heading after the recipe; the verifier sees one exact Close and passes even though a rendered Close precedes the recipe. Recognize or reject all equivalent ATX H2 forms when enforcing uniqueness and order. | open |

## Post-fix verification

Orchestrator-provided evidence reports PASS for `pnpm check-types`, `pnpm lint`, `pnpm test` (8/8 tasks), `pnpm build`, `pnpm verify:workflow`, `pnpm verify:quickstart-parity` including its supplied mutation probe, and `pnpm smoke:adopter` (0 failing, 0 stale known-red). A read-only probe confirmed that `#\tRFC-XXX:` bypasses `assertSingleIdAnchor`; an in-memory order probe confirmed the alternate-ATX Close false green. No round-7 fixes were applied in the read-only sandbox.
