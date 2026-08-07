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

Round 4 reviewed `5552a11233e661048808d5d1bb6a2f7378f27095...feat/prd-042-adopter-first-hour` and verified every round-3 closure against code. NBSP closer rejection, `..` link normalization, unconditional token substitution, documentation corrections, and both changed tests hold; the tests were strengthened for the new contract, not loosened. Importing the built package creates no new CI or packaging failure: registered verification surfaces already build `provegate` first, `dist` is shipped, and no runtime dependency was added. However, the anchor-shape guard and shared fence scanner still admit crafted templates, while the order assertion retains a separate recipe-fence parser that can pass with the real recipe after Close.

## Findings

| # | Sev | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | HIGH | `packages/provegate/src/core/run/new.ts:190`: the alternation in `idAnchor` is closed, but its competing-heading guard is not. `shaped` requires a literal space after the colon, so a valid anchor beside `# RFC-XXX:` or `# PRD-XXX:\tduplicate` is accepted even though the heading’s first token ends in `-XXX:`. A direct `instantiateTemplate` probe with the former returned `ACCEPTED_FOREIGN`. Match the completed first token independently of whether it is followed by space, tab, or end-of-line, and add all three suffix forms as deny regressions. | open |
| 2 | HIGH | `packages/provegate/src/core/run/new.ts:129`: `fencedLines` does not recognize any CRLF fence line because callers split only on `\n`, leaving `\r`, while the non-multiline fence regex requires the run’s line to end before that character. `assertSingleIdAnchor` passes those raw lines, so a CRLF template whose only id anchor is inside a valid fence instantiates; a direct probe returned `ACCEPTED_FENCED`. Strip one terminal CR inside the shared scanner so both raw callers receive CommonMark behavior; the existing CRLF test misses this because its real anchor precedes every fence. | open |
| 3 | HIGH | `scripts/verify/verify-quickstart-parity.mjs:183`: only heading detection uses the shared scanner. Recipe discovery still implements a second fence parser, ignores the `fenced` map, recognizes only unindented triple-backtick JSON openers, and accepts a triple-backtick recipe nested inside another fence. A decoy recipe inside a pre-Close `~~~~` fence plus the real recipe in a valid two-space-indented JSON fence after Close yields one recognized pre-Close recipe and passes. Use one scanner-derived fence structure for both heading and recipe identity and mutation-test this construction. | open |
| 4 | MEDIUM | `packages/provegate/src/core/run/new.ts:307`: the CRLF closure removes the sections but not “and nothing beyond it”: all surviving lines are CR-stripped and rejoined with `\n`, converting the entire forked template from CRLF to LF. Preserve the original line bytes while using normalized copies only for comparisons and fence classification. | open |
| 5 | MEDIUM | `packages/provegate/src/core/run/new.ts:312`: `dropSection` removes only the first matching section because it uses `findIndex` once. With two unfenced `## Memory Inputs` sections, memory-disabled instantiation leaves the second section in the artifact; a direct probe reported one surviving heading. Remove every matching section or refuse duplicate contract headings as template drift. | open |
| 6 | MEDIUM | `packages/provegate/src/core/run/new.ts:540`: `findWipPrd` considers every directory entry by name and never confirms it is a file. A directory named `prd-001-ghost.md` satisfies the basename regex, bypasses the “no wip PRD” refusal, and lets `createCompanion` write tasks or review artifacts for a PRD the state builder does not recognize. Read directory entries with types and require a regular artifact file. | open |

## Post-fix verification

The orchestrator reports PASS for `pnpm check-types`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm verify:workflow`, `pnpm verify:quickstart-parity`, and `pnpm smoke:adopter`. Read-only counterexample probes reproduced the foreign-heading acceptance, CRLF fenced-anchor acceptance, and surviving duplicate Memory Inputs section described above.
