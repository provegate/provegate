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

Round 9 adjudicated and reviewed `5552a11233e661048808d5d1bb6a2f7378f27095...feat/prd-042-adopter-first-hour`. The round-8 entity rejection is **upheld**: “rendered template” means prompt-token rendering, while `gate new`, state construction, lint, review validation, and parity verification consume source bytes. Entity-decoded Markdown is outside that closed grammar; decoding only selected readers would create the divergence the guard avoids. Literal foreign and duplicate anchors now refuse correctly, so the rejected entity finding carries no verdict debt. The changed tests assert the new contract rather than loosen it, and the previously reported placeholder-line, final/fenced section, argument-form, ATX-closing-hash, and `$&` review-directory cases close. Two further literal-substitution defects and one impossible Phase-6 remedy remain.

## Findings

| # | Sev | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | HIGH | `packages/provegate/src/core/run/new.ts:426,428,719-767`: valid configured identity bytes are still used as replacement strings. With `idPattern.prefix: "$&"`, a rendered template passes `idAnchor`, but substitution expands `$&` to the matched heading and writes `# # $&-XXX: -001: …`; companion headings and metadata have the same exposure through `canonicalId` and basename-derived `slug`. Use callback replacements wherever configured or basename-derived identity enters `replace`/`replaceAll`. | open |
| 2 | HIGH | `packages/provegate/src/core/run/new.ts:739`: round 8 made the first review-path replacement literal, but the following `replaceAll("review-XXX-{short-name}.md", …)` rescans its output. Valid `reviewsDir: "audits/review-XXX-{short-name}.md"` produces a ledger path `audits/review-001-probe.md/review-001-probe.md`, while `--review` writes under the literal configured directory. Remove the second broad rescan or construct all review-path substitutions in one callback pass. | open |
| 3 | MEDIUM | `packages/provegate/src/core/run/chain.ts:540`: an accepted `tasks.prefix` containing `/` makes the Phase-6 message name a path the state reader cannot index and recommend `gate new --tasks`, which `createCompanion` always refuses via `assertFilenamePrefix`. Reject path-bearing artifact prefixes during config loading, or apply the same validation before emitting the purported expected path and remedy. | open |

## Post-fix verification

Orchestrator-provided evidence reports PASS for `pnpm check-types`, `pnpm lint`, `pnpm test` (8/8 tasks), `pnpm build`, `pnpm verify:workflow`, `pnpm verify:quickstart-parity` including its mutation probe, and `pnpm smoke:adopter` (0 failing, 0 stale known-red). Read-only probes reproduced the malformed `$&` identifier and the review-directory placeholder rescan. No round-9 fixes were applied.
