# Summary: PRD-037 — Case Study, Part Two: the Tool's Own Ledger

> **PRD**: [prd-037-case-study-self-hosting.md](../../_prds/wip/prd-037-case-study-self-hosting.md)
> **Status**: Ship Verified — landed on local main via gate run; push stays the owner call
> **Class**: feature · **Autonomous Close**: operator-gated
> **Branch**: `prd-037-case-study-self-hosting` (four commits: 9a7c672, 136c830, d00b977 + close-out)
> **Date**: 2026-07-29

## What shipped

- **The section**: `case-study.mdx` gains "Part two: the tool's own ledger"
  (`[#self-hosting-ledger]`) — the Faz E meta-story as recomputable evidence. The
  origin intro names the two evidence classes (externally sourced vs locally
  recomputable).
- **The tool**: `scripts/derive-self-hosting-figures.mjs` — figures from
  `_state/prds.json` alone (shipVerified; closeModes in fixed order; sorted
  `unclassified {count, ids}` as success); one canonical invocation matrix
  (default = usage/exit 2 reading nothing; `--print`; `--write` region-only
  mutation; `--check` first-differing-line); sentinel validation identical in all
  three flagged modes; heading guard anchored to a real H2 line outside ``` and
  ~~~ fences.
- **The gate**: `verify:doc-claims` runs `--check` plus the H2-span no-digit
  predicate and the heading-token assertion, scoped to feature-bearing roots.
- **The harness**: `scripts/verify/derive-figures.test-cases.mjs` — ~38 assertions,
  written red-first, including the reviewer's fenced-token and tilde-fence forgery
  probes.

## Deviations, recorded

- Sentinels use the MDX comment form (`{/* */}`): fumadocs REJECTS HTML comments at
  build (measured; task-file Deferrals).
- The doc-claims block is scoped: both files absent = no claim (fixture roots);
  exactly one = loud failure.

## Verification

Red-first harness; mutation probe (folding unknown close modes failed 2 named
cases); drift probe (hand-edited figure failed naming line 18, restored); floor
green (1273 package tests, docs 30/30); independent review two rounds — round 1
GATE: FAIL (1 [P1]: a count smuggled as a word; 3 [P2]) → all closed → round 2
GATE: PASS, tilde residue closed same session. `Critical: 0`, Quorum `1/1 pass`.

## Durable artifacts

- `_docs/reviews/review-037-case-study-self-hosting.md` — the independent review
- Memory Outputs: `none` (verified honest — the MDX-comment constraint is recorded
  in the task file and the review; nothing non-derivable beyond what those carry)
