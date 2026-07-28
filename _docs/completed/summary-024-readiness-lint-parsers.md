# Development Summary: §11 Command Extraction — Read the Command Column, Report the Rest

> **PRD**: [prd-024-readiness-lint-parsers.md](../../_prds/completed/prd-024-readiness-lint-parsers.md)
> **Tasks**: [tasks-024-readiness-lint-parsers.md](../../_tasks/completed/tasks-024-readiness-lint-parsers.md)
> **Ship Readiness**: Operator Verification
> **Completed**: 2026-07-28
> **Author**: Claude Fable 5 (implementation), Codex (independent review)

---

## Overview

The §11 verification-table readers were scoped to the span their claims are about. One
shared extraction (`parseVerificationTable`) now feeds both `lintPrd` and
`buildGateChain`: commands come from the Command cell only, a malformed row is reported
under an exact prefix instead of being silently dropped, a duplicate verification
section makes the chain refuse, and a missing one keeps its existing required-empty
failure. A corpus test runs the five-argument production lint over the configured wip
directory and asserts the five-predicate §11-parser-class, with a coverage assertion
binding the turbo cache glob to the configured artifact root.

---

## Key Features

- **Command-cell scoping**: a backticked token in Scope/Notes is never a gate command —
  the defect PRD-021 FR-8 proved live is now structurally unreachable.
- **Malformed-row channel**: `{commands, issues, rows}` internal parser; the exported
  `parseVerificationCommands` keeps its array signature (zero consumer edits).
- **§11 cardinality**: heading identified by equality (optional ordinal stripped); zero
  sections → lint-only; two or more → lint issue and chain refusal.
- **Exact issue prefixes**: `§11 row is malformed`, `§11 verification section is
  missing`, `§11 verification section is declared more than once` — FR-2's class
  predicates match on this text, byte-for-byte (W1/W6).
- **Corpus pass + classification pair**: ten wip files, zero class issues; positive
  control (unsafe Command-cell command, in class) proven non-vacuous by mutation;
  negative control (same token in Notes) yields zero issues on a lint-green fixture (W7).
- **Cache binding**: `test` task inputs `$TURBO_DEFAULT$`, `$TURBO_ROOT$/_prds/**`,
  plus — from the review finding — `workflow.config.json` and `gates.manifest.json`;
  a rename of the artifact root fails a named assertion.

---

## Technical Implementation

Strictness went where it was asked for and nowhere else
(`strictness-added-during-extraction-is-a-behavior-change`): the chain's refusal guard
is new deliberate behavior bound by the rule that no existing test needed editing —
verified, 1125 tests green with zero edits to existing files. The executed-command
delta across all ten wip PRDs was measured (dist-vs-old-behavior diff): zero commands
gained or lost.

Independent review (Codex, two rounds) found one critical: the corpus test's own root
config reads (`workflow.config.json`, `gates.manifest.json` via `loadConfig`/
`loadManifest`) were outside the declared cache inputs — the record's own defect class
arriving through its fix, one file over. Fixed in `1f745a9`, re-verified clean.

## Files Created/Modified

| File | Type | Description |
| ---- | ---- | ----------- |
| `packages/provegate/src/core/gates/safety.ts` | modified | shared cell extractor, internal parser, cardinality, exact prefixes |
| `packages/provegate/src/core/gates/prd-ready.ts` | modified | consumes the extractor; Command-cell `hasRunnable`; surfaces parser issues |
| `packages/provegate/src/core/run/chain.ts` | modified | refusal guard on malformed row / duplicate section |
| `packages/provegate/test/lint-parsers.test.ts` | new | grammar fixtures, corpus pass, classification pair, coverage assertion |
| `packages/provegate/test/chain.test.ts` | modified | refusal proofs + zero-section compatibility fixture |
| `turbo.json` | modified | test-task inputs (corpus + root configs) |
| `scripts/verify/turbo-inputs-exceptions.json` | modified | reasoned `test` entry |
| `_brain/learnings/notes-column-runs-commands.md` (+ packed twin) | modified | interim guidance retired |
| `_brain/learnings/lint-must-name-the-span-it-judges.md` | new | the declared Memory Output, five instances recorded |
| `_docs/reviews/review-024-readiness-lint-parsers.md` | new | Codex review, 1/1 pass, Critical: 0 |

---

## Verification

Full ledger in the tasks file: all §11 rows passed, floor green (`check-types`, `lint`,
`test` 51 files / 1125 tests, `build`, `verify:workflow` including `verify:turbo-inputs`
and `verify:brain`), independent review passed. Operator handoff: `git push` remains the
owner's; the close is operator-gated.
