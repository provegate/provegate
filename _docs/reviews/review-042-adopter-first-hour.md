# Independent Review: PRD-042 — Adopter First Hour

> **PRD:** PRD-042
> **Verdict:** fail
> **Reviewer:** codex (gpt-5), read-only sandbox
> **Base SHA:** `5552a11233e661048808d5d1bb6a2f7378f27095`
> **Critical:** 0
> **High:** 3
> **Medium:** 1
> **Quorum:** 0/1 pass

## Summary

Round 8 reviewed `5552a11233e661048808d5d1bb6a2f7378f27095...feat/prd-042-adopter-first-hour`. The four round-7 regression cases themselves close, configured-token substitution is now unconditional across tables, Notes, links, and Changelog rows, `dropSection` handles a final section and fenced headings, the Phase-6 path agrees with its consumer, and both changed tests strengthen the new contract rather than loosen prior assertions. Three newly written paths remain defective, while the FR-5 finding is pre-existing permissive behavior that the changed guard explicitly promises—but fails—to close; it is therefore verdict-scoped rather than an unrelated follow-up.

## Findings

| # | Sev | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | HIGH | `packages/provegate/src/core/run/new.ts:731`: **introduced by the round-7 change.** The configured review path is inserted with a string replacement, so valid `reviewsDir: "audits/$&"` expands `$&` to the matched template text and produces a ledger path such as ``audits/`_docs/reviews/review-001-slug.md`/review-001-slug.md`` while `--review` writes `audits/$&/review-001-slug.md`. Later `replaceAll` calls can likewise rescan placeholder text introduced through configuration. Use callback replacements and construct the ledger path in one pass; regress with replacement metacharacters. | open |
| 2 | HIGH | `packages/provegate/src/core/run/new.ts:228`: **pre-existing acceptance left unclosed by changed FR-5 code.** `shaped` recognizes only a literal `-XXX:`. A template containing the canonical anchor plus `# RFC&#45;XXX: foreign` or `# PRD&#45;XXX: duplicate` renders a foreign or duplicate identifier heading, but neither regex sees it and instantiation proceeds. Enforce that the canonical anchor is the only unfenced ATX H1, avoiding another incomplete inline-Markdown parser. | open |
| 3 | HIGH | `scripts/verify/verify-quickstart-parity.mjs:162`: **introduced by this change.** The ATX regex wrongly treats hashes without preceding whitespace as a closing sequence and does not normalize rendered inline text. A rendered Close written as `## 5. Close (the runne&#114;)` can precede the recipe while `## 5. Close (the runner)##` follows it; the verifier misses the first, misclassifies the second as the target, and passes. Require whitespace before closing hashes and normalize or reject inline markup/entities in order-anchor headings. | open |
| 4 | MEDIUM | `packages/provegate/src/cli.ts:315`: **introduced by the artifact parser.** `gate new --tasks=PRD-001` and `--review=PRD-001` write artifacts although FR-1 declares exactly `--tasks <ID>` and `--review <ID>`. Match artifact flags as exact tokens and refuse the equals forms; assert that no file is written. | open |

## Post-fix verification

Orchestrator-provided evidence reports PASS for `pnpm check-types`, `pnpm lint`, `pnpm test` (8/8 tasks), `pnpm build`, `pnpm verify:workflow`, `pnpm verify:quickstart-parity` including its supplied mutation probe, and `pnpm smoke:adopter` (0 failing, 0 stale known-red). Read-only probes confirmed the `$&` ledger corruption, entity-encoded anchor bypass, and alternate-heading order false green. No round-8 fixes were applied.
