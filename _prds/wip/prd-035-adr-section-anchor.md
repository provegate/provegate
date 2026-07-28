# PRD-035: ADR Section Anchor — the Formatter Must Not Break Every ADR

> **Status**: Draft
>
> **Created**: 2026-07-28
> **Updated**: 2026-07-28
> **Author**: owner
> **Audience**: Implementing Agent
> **Slug**: `adr-section-anchor`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: hotfix
> **Class Rationale**: a reproduced defect in shipped code with a bounded blast radius — one regex anchor, three copies, one corpus. Not `feature` (no capability), not `test-hardening` (`core/memory/parse.ts` is production code).
> **Value**: 3.65 (MF/UI/TL/AR/RM: 4/4/3/3/4)
> **Autonomous Close**: eligible

<!-- Value rationale. MF 4: the method's own ADR validator disagrees with the method's own
formatter, so the repository cannot run `pnpm format` without breaking its own governance
records. UI 4: adopters receive the same broken parser in `practices/verify/lib.mjs`, and
they hit it on their FIRST ADR. TL 3: unblocks no roadmap item, but every ADR written from
here on is hand-guarded against the formatter today, which is a standing tax. AR 3: an
adopter whose first ADR fails validation because they formatted it is a bad first
impression. RM 4: a one-token anchor change in three copies, held by a corpus that already
executes every case against all three. -->

<!-- Autonomous Close: `eligible` — every verification is machine-checkable and this PRD
produces no operator-owned rows. -->

---

## 1. Introduction / Overview

The ADR section check captures a section body with

```
^## ${heading}${suffix}[ \t]*\r?\n([\s\S]*?)(?=^## |$)
```

under the `m` flag. `^## ` is the correct stop for the next heading. `$` is not a
correct stop for end-of-document: under `/m` it matches at the end of **every**
line, including a zero-length position at the start of an empty one. So a blank
line immediately after `## Context` ends the lazy capture at offset zero, and the
section reads as empty.

`prettier` writes exactly that blank line. The repository's own formatter and its
own ADR validator therefore disagree, and `pnpm format` breaks every ADR in the
store.

Reproduced against `_brain/adr/ADR-0003-acceptance-authorship.md` on 2026-07-28:
inserting one blank line after `## Context` turns `verify:brain: PASS` into

```
verify:brain: FAIL — _brain/adr/ADR-0003-acceptance-authorship.md: body — the '## Context' section is empty
```

Removing the line restores PASS. The defect is live, and every ADR in this
repository is hand-guarded against the formatter today.

Carried from the `ADR section regex` deferral (raised writing ADR-0001 during
PRD-018 — the repository's first ADR, so nothing had exercised the path).
Converted to a work item on 2026-07-28 under the deferral cap rule.

## 2. Goals

### Primary Goals

1. Make the section capture end at end-of-input rather than end-of-line.
2. Make all three implementations agree **and be right** — the corpus currently
   proves only the first.
3. Make `pnpm format` safe to run on `_brain/adr/**`.

### Success Metrics

- A record with a blank line after every section heading validates in all three
  implementations.
- `pnpm format` followed by `pnpm verify:brain` is green from a clean tree.
- Mutation: restoring the `$` anchor fails the new corpus case, and only it.

---

## 3. User Stories

#### User Story 1

**As** an adopter writing my first ADR, **I want** the validator to accept the
document my formatter produced, **so that** I do not have to discover by
bisection that a blank line is illegal.

#### User Story 2

**As** a maintainer of this repository, **I want** to run `pnpm format` without
inspecting every ADR afterwards, **so that** formatting stops being a manual
review step.

---

## 4. Functional Requirements

1. **FR-1**: The section capture ends at end-of-input, not end-of-line. Replace
   the `$` alternative in the lookahead with an end-of-input assertion —
   `(?=^## |(?![\s\S]))` — keeping the `^## ` stop and the `m` flag, so a
   following heading with no blank line before it still ends the section. The
   comment above the expression states why `$` was wrong, in terms of `/m`.
   - **Targets:** `packages/provegate/src/core/memory/parse.ts`,
     `scripts/verify/lib.mjs`, `packages/provegate/practices/verify/lib.mjs`
2. **FR-2**: The shared corpus carries the case, asserted as **valid**. A record
   whose every section heading is followed by a blank line is a legal ADR. The
   corpus executes every case against all three implementations, so one case
   binds all three — but it must assert correctness rather than agreement, which
   is what the present 78 cases could not do here: all three agreed, and all
   three were wrong.
   - **Targets:** `packages/provegate/test/fixtures/memory-record-cases.json`,
     `packages/provegate/test/memory.test.ts`
3. **FR-3**: The three copies stay reconciled. `scripts/verify/lib.mjs` and
   `packages/provegate/practices/verify/lib.mjs` differ today in ways unrelated to
   this fix; the pack drift ledger records the intended divergence, and this
   change must not widen it.
   - **Targets:** `scripts/verify/pack-drift-ledger.json`
4. **FR-4**: The memory record is retired to what remains true. The anchor bug is
   fixed, so `adr-section-blank-line-reads-empty` no longer describes live
   behaviour; it is edited to record the general lesson (`$` under `/m` is not
   end-of-input) rather than deleted, so the trap stays discoverable. Its packed
   twin and both INDEX hooks follow.
   - **Targets:** `_brain/learnings/adr-section-blank-line-reads-empty.md`,
     `packages/provegate/practices/brain/learnings/adr-section-blank-line-reads-empty.md`,
     `packages/provegate/practices/brain/INDEX.md`

---

## 5. Non-Goals (Out of Scope)

- **Rewriting the section parser.** The `^## ` stop is correct and was chosen
  deliberately; only the end-of-input alternative is wrong.
- **Reformatting the existing ADRs.** They are legal today and stay legal after.
  Whether to run `pnpm format` over `_brain/` is a separate call.
- **Merging the two `lib.mjs` copies.** They differ for reasons this PRD does not
  own; see FR-3.
- **The other multiline-parser deferrals** (`Multiline code spans`,
  `Brain validator INDEX parsing`). Same neighbourhood, different defects.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** an ADR with a blank line after every section heading, **When**
  `verify:brain` runs, **Then** it passes.
- **Given** the same ADR, **When** the package parser validates it, **Then** it
  reports no issue — and likewise the shipped practices copy.
- **Given** a clean tree, **When** `pnpm format` then `pnpm verify:brain` run,
  **Then** both are green.
- **Given** the `$` anchor restored in any one copy, **When** the corpus runs,
  **Then** the new case fails for that copy and no other case changes.
- **Given** an ADR whose next heading follows with no blank line, **When** it is
  validated, **Then** the section still ends at that heading and does not swallow
  the next body.

---

## 7. Technical Considerations

### Reproduction

`perl -0pi -e 's/## Context\n(?!\n)/## Context\n\n/' <an ADR>` then
`pnpm verify:brain`. Reproduced 2026-07-28 on ADR-0003; message quoted in §1.

### Architecture

**Three implementations, one contract.** The TypeScript parser and the stdlib
validator cannot import each other — the validator runs in repositories where the
package is not installed — and `memory-record-cases.json` is their entire
contract, executed against both plus the shipped practices copy. That makes the
corpus the right vehicle and also the reason this defect survived: 78 cases proved
the three agree, and they agreed on the wrong answer.
`two-parsers-wrong-together` names this exactly, which is why FR-2 requires the
case to assert a **behavioural** claim (this document is legal) rather than a
parity claim.

**Why not `\z`.** JavaScript has no `\z`. `(?![\s\S])` is the idiomatic
end-of-input assertion and composes inside the existing lookahead without
dropping the `m` flag that `^## ` needs.

### Migration & Rollback

None. No stored data changes shape; the fix widens what validates and narrows
nothing. Rollback is a plain revert of the commit — no artifact is left in a state
the previous code refuses, because every document legal before stays legal after.

---

## 8. Implementation Scope

### In Scope

The anchor in three copies, one corpus case, the drift ledger reconciliation, and
the record edit with its twin and hooks.

### Out of Scope

Everything in §5.

---

## 9. Open Questions

None.

---

## 10. References

- `_brain/learnings/adr-section-blank-line-reads-empty.md` — the record this retires
- `_brain/learnings/two-parsers-wrong-together.md` — why the corpus missed it
- `STATUS.md` — the `ADR section regex` deferral this converts
- `packages/provegate/test/fixtures/memory-record-cases.json` — the shared contract

---

## Memory Inputs

- applied: `adr-section-blank-line-reads-empty` — the record that describes this
  defect. FR-1 is its stated fix and FR-4 retires it to the general lesson.
- applied: `two-parsers-wrong-together` — the reason FR-2 asserts a behavioural
  claim rather than a parity one. Three implementations agreed here and were all
  wrong, which is precisely what a conformance corpus cannot catch unless a case
  pins what the right answer IS.
- reviewed: `narrow-the-grammar-not-the-parser` — the tempting fix is a smarter
  Markdown reader. This is the opposite and stays so: one anchor token, no new
  grammar, the `^## ` stop untouched.
- reviewed: `strictness-added-during-extraction-is-a-behavior-change` — this moves
  the other way, widening what validates. Recorded because the reverse direction
  deserves the same scrutiny: FR-1 must not make an empty section legal, which is
  the acceptance criterion about a heading following with no blank line.
- applied: `assert-absent-needs-an-independent-cause` — its watch covers the
  corpus and its runner. The mutation check in §2 is where it bites: restoring the
  `$` anchor must fail the new case *because the anchor is wrong*, not because the
  case was removed alongside it. The check therefore restores the anchor only and
  leaves the corpus untouched, so the failure has a cause independent of the
  scenario that produces it.
- not-applicable: `false-green-on-missing-file` — its watch covers the verify
  scripts this PRD edits. No check here greps a file whose absence could pass; the
  corpus supplies its own content.

## Memory Outputs

- learning: `_brain/learnings/adr-section-blank-line-reads-empty.md` — edited, not
  created: retired from a live-defect report to the general lesson that `$` under
  `/m` is end-of-line, not end-of-input, and that a conformance corpus proving
  three implementations agree proves nothing about whether they are right.

---

## Conflict Surface

- `packages/provegate/src/core/memory/parse.ts`
- `scripts/verify/lib.mjs`
- `packages/provegate/practices/verify/lib.mjs`
- `packages/provegate/test/fixtures/memory-record-cases.json`
- `packages/provegate/test/memory.test.ts`
- `_brain/learnings/adr-section-blank-line-reads-empty.md`
- `packages/provegate/practices/brain/learnings/adr-section-blank-line-reads-empty.md`
- `packages/provegate/practices/brain/INDEX.md`
- `scripts/verify/pack-drift-ledger.json`

---

## Durable Artifacts

- `_brain/learnings/adr-section-blank-line-reads-empty.md` — retired to the general lesson; the Memory Output above, repeated here
- `_brain/INDEX.md` — the hook line updated to match the retired record
- `_docs/reviews/review-035-adr-section-anchor.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).

| FR   | Command / Check                                          | Scope | Notes                                                                                              |
| ---- | -------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| FR-1 | `pnpm --filter provegate test test/memory.test.ts`       | pkg   | a blank line after each heading validates; a heading with no blank line before it still ends the section |
| FR-1 | `pnpm verify:brain`                                      | repo  | the live store, including three ADRs, still validates                                              |
| FR-2 | `pnpm --filter provegate test test/memory.test.ts`       | pkg   | the new case runs against all three implementations and asserts valid, not merely equal            |
| FR-3 | `pnpm verify:pack-drift`                                 | repo  | the packed validator and record reconcile; the intended divergence is not widened                  |
| FR-4 | `pnpm verify:brain`                                      | repo  | the retired record parses and both INDEX hooks resolve                                             |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added cases pass; existing cases unchanged
- `pnpm build` — clean build

Hard caps (when your gates manifest configures them):

- Not applicable — this PRD adds no protected surface and no client→server payload.

---

## 12. DO NOT (Anti-Patterns)

- **Do not drop the `m` flag.** `^## ` needs it. Only the `$` alternative is wrong.
- **Do not replace `^## ` with `\n## `.** The existing comment records why: a
  heading that follows with no blank line must still end the section, or an empty
  one swallows the next body and reads as full.
- **Do not fix one copy.** Three implementations share one contract, and a
  one-sided fix ships the defect to adopters while the repository looks green.
- **Do not add a corpus case that only asserts the three agree.** They agree today
  and are wrong today. The case must assert that the document IS valid.
- **Do not make an empty section legal.** Widening the capture must not turn a
  genuinely empty `## Context` into a pass; the acceptance criteria pin both
  directions.
- **Do not delete `adr-section-blank-line-reads-empty`.** It is edited, so the trap
  stays discoverable after the code stops exhibiting it.
- **Do not reformat the existing ADRs as part of this change.** They are legal
  before and after; mixing a formatting sweep into the fix hides which one moved
  the gate.

---

## Changelog

| Date       | Change                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-28 | PRD created (Phase 1). Converted from the `ADR section regex` deferral under the cap rule; defect re-reproduced first. |
