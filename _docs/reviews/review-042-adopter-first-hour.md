# Independent Review: PRD-042 — Adopter First Hour

> **PRD:** PRD-042
> **Verdict:** fail
> **Reviewer:** codex (gpt-5), read-only sandbox
> **Base SHA:** `5552a11233e661048808d5d1bb6a2f7378f27095`
> **Critical:** 0
> **High:** 3
> **Medium:** 3
> **Quorum:** 0/1 pass

## Summary

Round 3 reviewed `5552a11233e661048808d5d1bb6a2f7378f27095...feat/prd-042-adopter-first-hour` and verified the round-2 closures against code. Literal token replacement, repeated-option refusal, terminal-section coverage, smoke-script scope declaration, and both changed tests hold. Three high-severity false-accept paths remain in foreign-anchor and fence recognition and in quickstart ordering. No runtime dependency, network, telemetry, or push path was introduced.

## Findings

| # | Sev | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | HIGH | `packages/provegate/src/core/run/new.ts:L182`: `shaped` is not “ANY id-shaped heading”; it requires an ASCII letter followed by ASCII word characters. Configuration accepts any non-empty prefix, so one valid anchor plus `# 2FA-XXX: foreign`, `# _RFC-XXX: foreign`, or `# RFC-ALT-XXX: foreign` yields one canonical and zero foreign matches and instantiates with the competing heading intact. Define the foreign-prefix grammar broadly enough to cover every possible configured identifier and add crafted-prefix regressions. | open |
| 2 | HIGH | `packages/provegate/src/core/run/new.ts:L144`: `tail.trim() === ''` accepts Unicode/control whitespace that CommonMark does not permit after a closing fence. Inside an open fence, a line consisting of three backticks plus NBSP is treated as a closer; a following `# PRD-XXX:` is then substituted even though Markdown still places it inside the fence. Accept only spaces/tabs plus an optional CR line terminator and add a regression. | open |
| 3 | HIGH | `scripts/verify/verify-quickstart-parity.mjs:L141`: the order check retains the old approximate fence parser: unlimited indentation opens a fence and any same-marker run closes it regardless of length. A four-space-indented `~~~` pair can hide the real Close heading, while `~~~~` followed by the too-short `~~~` exposes a fake Close heading that Markdown keeps fenced. The unique parsed recipe can then follow the real close but precede the fake heading, and verification passes. Use the real fence grammar for heading identity and mutation-test this counterexample. | open |
| 4 | MEDIUM | `packages/provegate/src/core/run/new.ts:L587`: the claimed normalization removes `.` but leaves `..`. With `tasks.dir = "workflow/tasks/../plans"`, the file writes under `workflow/plans/wip`, but the link calculates five parent hops instead of three and resolves outside the repository. Compute the link with normalized path-relative operations and add an internal-`..` regression. | open |
| 5 | MEDIUM | `packages/provegate/src/core/run/new.ts:L301`: `dropSection` compares headings after `split('\n')` without removing CR, so a supported forked template using CRLF retains both Memory sections when memory is disabled; the regex-based anchor substitutions still succeed. Normalize lines for comparison while preserving output bytes and test a CRLF template. | open |
| 6 | MEDIUM | `.changeset/adopter-first-hour.md:L14` still states the inverse of FR-2 and the implementation: it says a line containing an author placeholder is left whole, while substitution is now unconditional. `_tasks/wip/tasks-042-adopter-first-hour.md:L209` also retains the opaque “placeholder-line rule” evidence label. Correct the shipped release note and make the ledger explicitly name unconditional substitution. | open |

## Post-fix verification

The orchestrator reports PASS for `pnpm check-types`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm verify:workflow`, `pnpm verify:quickstart-parity`, and `pnpm smoke:adopter`. Those runs do not cover the foreign-prefix, non-CommonMark whitespace, crafted-order-fence, internal-`..`, or CRLF counterexamples above.
