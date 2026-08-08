# Development Summary: The Adopter's First Hour

> **PRD**: [prd-042-adopter-first-hour.md](../../_prds/wip/prd-042-adopter-first-hour.md)
> **Tasks**: [tasks-042-adopter-first-hour.md](../../_tasks/wip/tasks-042-adopter-first-hour.md)
> **Ship Readiness**: Code Complete — the close is blocked, see Ship Readiness below
> **Completed**: 2026-08-08
> **Author**: owner

---

## Overview

`gate new` now creates the artifacts the gate chain reads, resolves what the configuration
already knows, and works in a repository that renders its own prompt store. The Phase-6 stop
names the path it expects and the row it reads, and both quickstart copies teach the manifest
before the close that executes it.

The item came out of the first external adopter run: the CLI installed from a packed tarball
into a plain npm + tsc repository it had never seen, driven to a merged local close. Everything
here is friction that run measured, not friction anyone predicted.

---

## Key Features

- `gate new --tasks <ID>` / `--review <ID>` — instantiate the tasks and review templates at the
  configured paths, identity taken from the PRD artifact's basename and only from the wip state.
- Seven configured tokens resolved at creation; anything unresolved reported, never silent.
- Memory sections omitted where the contract is off — and the lint still fails those bytes where
  it is on, so the omission cannot be used to escape a policy a repository enabled.
- The id anchor accepts both the token and the rendered prefix, so a repository that installs
  its own prompt store can create work items again. This one could not: every PRD here had been
  hand-created since PRD-032.
- A review artifact that cannot pass the gate until a reviewer fills it.
- Eight named argument refusals; a command that guesses which production was meant writes the
  wrong file into the wrong place.

---

## Technical Implementation

**One sweep, not two passes.** Identity substitutions and the configured token table are applied
in a single `String.replace` with a global alternation and callbacks. Phase 6 spent three rounds
proving that ordering the passes only chooses which one reads the other's output; the scan runs
over the original bytes and never revisits a replacement, so neither can. Recorded as
`_brain/learnings/one-sweep-not-two-passes.md`.

**Every configured byte is literal.** A replacement string interprets `$&` and friends, so any
value that came from configuration re-enters the text as syntax. Three separate review rounds
found that same defect in three functions.

**One fence grammar.** `fenceSpans` is exported and the quickstart verifier imports it from the
built package, rather than carrying an approximation of its own — the verifier had one, and it
disagreed about indented fences, adjacent fences and info-string closers.

**Depth from the path layer.** The tasks→PRD link asks where the file actually lands instead of
parsing the configured directory string, which is the only reading correct on both POSIX and
Windows.

## Files Created/Modified

| File | Type | Description |
| ---- | ---- | ----------- |
| `packages/provegate/src/core/run/new.ts` | Modified | companion artifacts, the token table, section omission, the anchor alternation, the single sweep, fence spans |
| `packages/provegate/src/cli.ts` | Modified | the three productions and their refusals, the help line |
| `packages/provegate/src/core/run/chain.ts` | Modified | the Phase-6 stop names path and row; refuses a path-bearing prefix |
| `packages/provegate/QUICKSTART.md`, `apps/docs/content/docs/quickstart.mdx` | Modified | manifest before close; both artifact commands taught |
| `scripts/verify/verify-quickstart-parity.mjs` | Modified | structural order assertion over the recipe span, shared fence scanner, ATX + Setext headings |
| `packages/provegate/practices/NEXT_STEPS.md` | Modified | duplicate heading number |
| `scripts/adopter-smoke.sh`, `scripts/adopter-smoke-fill.mjs` | Modified | declared scope expansion — FR-3 breaks both by construction |
| `packages/provegate/test/*.ts` | Modified | 60+ regressions across new/chain/cli/prd-ready/content-hygiene |
| `_brain/learnings/the-first-hour-is-a-surface.md` | Created | declared Memory Output |
| `_brain/learnings/one-sweep-not-two-passes.md` | Created | appended Memory Output |
| `.changeset/adopter-first-hour.md` | Created | minor release note, behaviour change first |

---

## Testing

Every FR has its own regressions, and the risk-class tests live inside the parent that creates
the behaviour rather than in the Phase-5 parent: the unedited-template regression under
instantiation, the memory-on failure under the omission, the four drift refusals under the
anchor alternation. Two structural assertions are mutation-proven — moving the manifest recipe
past the close fails the verifier, and a competing recipe fence fails it too.

The adversarial rounds drove most of the coverage: 11 independent review rounds, 40+ findings,
each closed with a test that fails without the fix. Package suite: 1443 tests.

---

## Verification Evidence

| Gate | Scope | Result | Evidence | Notes |
| ---- | ----- | ------ | -------- | ----- |
| types | monorepo | passed | 5/5 turbo tasks | |
| lint | monorepo | passed | 0 errors | |
| build | monorepo | passed | 4/4 turbo tasks | |
| tests | monorepo | passed | 8/8 tasks, 1443 package tests | |
| workflow | repo | passed | `verify:workflow` PASS | includes brain, memory corpus, quickstart parity |
| smoke | adopter fixture | passed | 0 failing, 0 stale known-red | packs the CLI, installs it, closes a PRD |
| independent-review | repo | **failed** | `_docs/reviews/review-042-adopter-first-hour.md` — round 11, Critical 0, High 2, Medium 2, all since fixed | the artifact records the last round RUN, not the current tree |

Allowed results: `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Operator Handoff

None — PRD-042 is `Autonomous Close: eligible` and produced no operator-owned rows.

---

## Ship Readiness

**Code Complete.** Not `Ship Verified`, and the reason is mechanical rather than a judgement: the
committed review artifact carries round 11's `fail`, because round 11's findings were fixed after
it was written and no round has run against the current tree. The Phase-6 gate reads that
artifact and will refuse — correctly. Declaring otherwise would be exactly the self-declared
green this workflow exists to prevent.

Two things stand between here and a close, and both are the owner's:

1. **A review round against the current tree.** Rounds 8–11 each closed every finding of the one
   before; the last three were second-order effects of the fixes themselves, and both were closed
   as classes rather than as points.
2. **The base-branch mismatch.** `workflow.config.json` declares no `branches` block, so
   `branches.base` defaults to `main`, while this work and the twenty commits before it live on
   `development` under the repository's GitHub flow. `gate run`'s merge step would merge into a
   local `main` that lacks them. Whether `branches.base` should become `development` is a
   branch-policy decision, not an implementer's.

---

## Breaking Changes

- A freshly instantiated PRD now passes `gate check`. The refusal an adopter used to get fired on
  the unsubstituted placeholder command, not on the emptiness. Recorded as a board deferral and
  carried in the adopter smoke as a known-red so it cannot be forgotten.
- `--tasks=<ID>` is refused; FR-1 declares `--tasks <ID>`.
- An id prefix or artifact prefix carrying a path separator now refuses rather than writing a
  file the state reader cannot index.

---

## Deferred Items

- Restoring a signal for an unfilled PRD (board deferral, owner, due 2026-10-07) — it needs
  `core/gates/prd-ready.ts`, outside this item's Conflict Surface.
- The entity-encoded heading finding was REJECTED and the rejection was UPHELD by the reviewer:
  nothing in this toolchain renders, so an entity-encoded heading is invisible to every consumer
  equally and cannot make an artifact mean one thing to a gate and another to its reader.
