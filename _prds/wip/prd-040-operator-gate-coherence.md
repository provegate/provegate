# PRD-040: The Operator Gate Must See Every Shape Its Own Documents Permit

> **Status**: Draft
>
> **Created**: 2026-08-07
> **Updated**: 2026-08-07
> **Author**: owner
> **Audience**: Implementing Agent
> **Slug**: `operator-gate-coherence`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Class Rationale**: n/a — feature class.
> **Autonomous Close**: eligible
> **Value**: 3.70 (MF/UI/TL/AR/RM: 5/5/3/2/2)

<!-- 0.25*5 + 0.25*5 + 0.20*3 + 0.15*2 + 0.15*2
     = 1.25 + 1.25 + 0.60 + 0.30 + 0.30 = 3.70 -->

<!-- Value history: born 4.00 (RM 4) → iteration 1 ruled RM down to 2: this changes
the count that gates EVERY close, and the consumer keys on the count alone, so the
blast radius is every task artifact in every repository. RM 2 accepted rather than
re-argued; the item clears the 3.40 cutoff either way, so advocacy here would buy
nothing but a second round. -->

---

## 1. Introduction / Overview

The first run of the CLI outside this repository (`pnpm smoke:adopter`, 2026-08-07) closed a
PRD that declared `Autonomous Close: operator-gated`, carried an `## Operator Handoff` section
and a Verification Ledger row whose `Result` was `operator`. The runner printed
`operator rows: 0` and merged. No acceptance was demanded, and nothing reported that the
declaration had no effect.

`countOperatorHandoff` (`core/state/markdown.ts:129`) is the whole of the detection. It reads
only sections headed `Operator Handoff` and counts, inside them, lines beginning `|` (minus a
separator row and a `| Task |` header) plus lines matching a checkbox marker. Measured against
the four shapes an author can reasonably write, all four executed against the shipped 0.3.0
build:

| shape under `## Operator Handoff`         | counted | correct |
| ----------------------------------------- | ------- | ------- |
| `- Owner confirms the rendered card.`     | 0       | 1       |
| `- [ ] Owner confirms the rendered card.` | 1       | 1       |
| one data row under a header row           | 2       | 1       |
| ledger row with `Result: operator`        | 0       | 1       |

Two defects in opposite directions. The prose bullet is the dangerous one: an operator-gated
PRD merges with no acceptance and the run reports success. The header over-count is the mirror
— it demands an acceptance nobody owes, which fails closed but teaches authors that the count
is arbitrary. And `operator` is a documented allowed `Result` in the ledger template this
package ships, yet the gate that exists to serve it never reads that column.

This is the recorded `operator-row-must-be-a-table-row` trap, still live and now measured from
outside: 39 self-hosted PRDs never exposed it because their authors learned the one shape that
works.

**What the first readiness round changed.** Iteration 1 (Codex, 5.7 ITERATE) established the
fact that makes this more than a parser repair: `core/run/acceptance.ts::operatorGateOk` keys
on `operatorHandoffCount > 0` alone. `Autonomous Close` appears only in the refusal message.
Widening the count therefore re-evaluates **every** task artifact in every repository,
including items declared `eligible`. Any version of this work that does not say what happens to
those items is not a fix, it is an outage with a rationale. §7 now carries that story, FR-5
carries the refusal that keeps a contradiction from reaching the merge gate, and the grammar
below is closed rather than descriptive — "a plain list item" was an invitation for the
implementer to decide what a row is.

---

## 2. Goals

### Primary Goals

- [ ] Every shape the closed grammar admits is counted; everything else is excluded by name.
- [ ] A malformed operator table or ledger is refused, never silently counted as zero.
- [ ] A declaration that contradicts the count is refused before Phase 4, naming both.
- [ ] The behaviour change to existing artifacts is measured before it ships.

### Success Metrics

| Metric                                | Current | Target | Measurement                          |
| ------------------------------------- | ------- | ------ | ------------------------------------ |
| Handoff shapes counted correctly      | 1 of 4  | 4 of 4 | `pnpm smoke:adopter` known-red count |
| Malformed input counted as zero       | always  | never  | FR-4 refusal fixtures                |
| Declaration with no effect detectable | no      | yes    | FR-5 refusal, integration test       |
| Corpus items whose count changes      | unknown | listed | FR-7 audit output in the PRD record  |

---

## 3. User Stories

#### User Story 1

```
As an adopter closing work that a human must verify,
I want the runner to stop until that verification is recorded,
so that "operator-gated" is a gate and not a label.
```

**Acceptance Criteria:**

- [ ] A PRD declaring `operator-gated` with a prose handoff bullet does not merge without an
      acceptance entry.
- [ ] A one-row handoff table demands exactly one acceptance, not two.

#### User Story 2

```
As a maintainer upgrading an existing repository,
I want to know which of my closed and open items the new count reads differently,
so that the upgrade is a decision instead of a surprise at the next merge.
```

**Acceptance Criteria:**

- [ ] The audit lists every artifact whose count changes, by path and by old→new count.
- [ ] The changeset tells adopters the same thing in one sentence.

---

## 4. Functional Requirements

1. **FR-1**: Under a section headed `Operator Handoff`, a **row** is a list item at column zero
   whose marker is `-`, `*`, `+`, or an ordered marker (`1.`/`1)`), and whose text after the
   marker (and after an optional `[ ]`/`[x]` checkbox) is non-empty. A checkbox item is one row,
   never two. `- none` and `- (none)`, in any case, are zero rows.
   Excluded by name, each with its own fixture: an indented (nested) list item, a line inside a
   blockquote, a line inside a fenced code block, a line inside an HTML comment, a wrapped
   continuation line of a previous row, and any paragraph that is not a list item.
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::countOperatorHandoff`
2. **FR-2**: A table under that heading is read structurally: the first row is the header, the
   second must be a separator in any alignment spelling, and only the rows after it are data
   rows. The header is never counted, whatever its first cell says — today only `| Task |` is
   excluded, so every other header spelling counts itself.
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::countOperatorHandoff`
3. **FR-3**: A Verification Ledger row whose `Result` cell is `operator` or `blocked`
   (case-insensitive, trimmed) counts as an operator row. The column is located by its
   normalized header name, never by position. Every ledger section in the document is summed.
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::countOperatorHandoff`
4. **FR-4**: Malformed input is refused, not counted. The counter returns a count **and** a
   problem, and the callers surface the problem instead of proceeding on a number: a table with
   a header and no separator row, a ledger with no `Result` column, a ledger with two `Result`
   columns, and a data row with fewer cells than its header each produce a named refusal. A
   silent zero here is the same failure as the one this PRD exists to fix.
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::countOperatorHandoff`,
     `packages/provegate/src/core/run/acceptance.ts::operatorGateOk`
5. **FR-5**: A PRD whose task file yields one or more operator rows while its
   `Autonomous Close` is `eligible` is refused at the Phase 3→4 boundary of `gate run`, naming
   the declaration, the count, and the file. The template already states the rule ("Any PRD
   that produces operator-owned task rows MUST be operator-gated"); nothing enforced it, and
   with FR-1..FR-3 widening the count that contradiction stops being theoretical.
   - **Targets:** `packages/provegate/src/core/run/chain.ts`,
     `packages/provegate/src/core/run/acceptance.ts::operatorGateOk`
6. **FR-6**: `gate check PRD-NNN` reports the same contradiction as a WARNING when the task
   file exists, and says nothing when it does not. At Phase 2 the task file legitimately does
   not exist yet — refusing there would refuse every correctly-ordered item.
   - **Targets:** `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`
7. **FR-7**: A one-shot audit reports every task artifact in this repository whose count
   changes under the new grammar, as `path: old → new`. Its output is pasted into this PRD's
   Changelog before Phase 6, and the changeset for the release names the behaviour change and
   the remedy (flip the declaration, or clear the rows).
   - **Targets:** `scripts/audit-operator-rows.mjs`, `.changeset/`
8. **FR-8**: The three known-red entries this work closes are deleted from the adopter smoke in
   the same change; the harness fails on a known-red assertion that passes, so they cannot
   outlive the defect.
   - **Targets:** `scripts/adopter-smoke.sh`

---

## 5. Non-Goals (Out of Scope)

- Writing acceptance entries from the CLI (`gate accept`) — a separate item, and an agent must
  never originate an acceptance.
- Changing what an acceptance entry contains or who may author it (PRD-033 settled that).
- **Documenting the counted shapes in the shipped tasks template.** That template is method
  content, and method content moves only from the source snapshot; adding new wording needs an
  owner-approved addendum first (the PRD-031 precedent). FR-4's and FR-5's refusal messages
  teach the shape at the moment it matters instead, which is where a reader actually is.
- The terminal-status write and the dirty tree the same run exposed — PRD-041 owns those.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a task file whose `## Operator Handoff` holds one prose bullet, **When** the merge
  gate runs for an `operator-gated` PRD with no acceptance entry, **Then** the run refuses and
  names the row.
- **Given** a handoff table with a header row and one data row, **When** the count runs,
  **Then** it is 1.
- **Given** a ledger row with `Result: operator`, **When** the count runs, **Then** it is 1.
- **Given** a handoff section holding a nested bullet, a blockquote line, a fenced block and a
  wrapped continuation line, **When** the count runs, **Then** none of them is a row.
- **Given** a ledger with no `Result` column, **When** the count runs, **Then** the gate refuses
  and names the ledger — it does not proceed on zero.
- **Given** a PRD declaring `eligible` whose task file yields two operator rows, **When**
  `gate run` reaches the Phase 3→4 boundary, **Then** it refuses and names the declaration and
  the count.
- **Given** the same PRD at Phase 2 with no task file yet, **When** `gate check` runs, **Then**
  it passes and says nothing about operator rows.

---

## 7. Technical Considerations

### Architecture

The counter is one function over Markdown; the fix widens what it reads, narrows what it
mistakes for a row, and changes its return shape from a number to a count plus an optional
problem. Both directions need their own fixtures — a corpus that only proves the new shapes
count would not catch the header regression, and the reverse.

The grammar is closed by enumeration (FR-1), not by describing the intent and leaving the
implementer to bound it. The excluded shapes are the ones a Markdown reader is normally wrong
about: nesting, blockquotes, fences, comments, and continuation lines. That is the
`narrow-the-grammar-not-the-parser` rule — this reader will never reach renderer parity, so it
restricts what the document may contain instead.

The ledger read locates the `Result` column by normalized header name and then reads that cell,
the same shape `parseVerificationTable` uses for the Command column (PRD-024). Never a
whole-row regex.

### Migration & Compatibility

`operatorGateOk` keys on the count alone. After FR-1..FR-3 the count rises for any artifact
whose handoff was written as prose or whose ledger carries an `operator` result, so:

- **Blast radius:** every task artifact, in this repository and in every adopter repository.
  An item mid-flight whose handoff is prose will, after upgrading, demand an acceptance it did
  not demand yesterday.
- **Measurement before ship (FR-7):** the audit lists every changed artifact here, old → new.
  If the list is empty in this repository, that is evidence about this corpus only, and the
  changeset still carries the adopter warning.
- **Remedy for an adopter:** either flip `Autonomous Close` to `operator-gated` and record the
  acceptance (the honest path when the row is real work), or delete the row (the honest path
  when it is not). FR-5's refusal message names both.
- **Rollback trigger and plan:** if the audit shows items whose count changes for reasons the
  grammar did not intend — a row that is prose, not work — revert the commit; the counter is
  pure and has no persisted state, so a revert restores the previous behaviour exactly. Nothing
  is migrated on disk, so there is nothing to un-migrate.
- **Release:** a minor version with the changeset above. The behaviour change is a bug fix in
  intent and a compatibility break in effect, and the changelog says so in that order.

### Dependencies

- none

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/state/markdown.ts`
- [ ] `packages/provegate/src/core/run/acceptance.ts`
- [ ] `packages/provegate/src/core/run/chain.ts`
- [ ] `packages/provegate/src/core/gates/prd-ready.ts`
- [ ] `packages/provegate/test/markdown.test.ts`, `packages/provegate/test/acceptance.test.ts`,
      `packages/provegate/test/chain.test.ts`, `packages/provegate/test/lint-parsers.test.ts`
- [ ] `scripts/audit-operator-rows.mjs`, `scripts/adopter-smoke.sh`, `.changeset/`

---

## 9. Open Questions

- (none)

---

## 10. References

- `scripts/adopter-smoke.sh` — the run that measured the four shapes
- `_readiness/wip/readiness-040-operator-gate-coherence.md` — iteration 1, 5.7 ITERATE
- `_brain/learnings/operator-row-must-be-a-table-row.md`
- `_brain/learnings/notes-column-runs-commands.md`

---

## Memory Inputs

- applied: `operator-row-must-be-a-table-row` — the record this work closes at the source; it
  documents the checkbox-bullet miss, and the measurement adds the prose and header cases it
  could not have seen from one instance.
- applied: `notes-column-runs-commands` — FR-3 reads the Result column by header name for
  exactly the reason that record gives: a parser that reads the whole row reads cells that mean
  something else.
- applied: `narrow-the-grammar-not-the-parser` — FR-1 is that rule applied: the excluded shapes
  are enumerated so the reader never has to approximate a renderer, and FR-4 refuses what the
  grammar does not cover instead of guessing.
- applied: `metadata-declares-what-it-cannot-provide` — FR-5 and FR-6 are that rule for
  `Autonomous Close`. Iteration 1 forced the split: refusing an absent task file at Phase 2
  would refuse every correctly-ordered item, so the refusal binds at the Phase 3→4 boundary
  where the artifact must exist, and Phase 2 only warns when it already does.
- applied: `assert-absent-needs-an-independent-cause` — the header-row fixture must fail from
  its own cause, not because the surrounding table also stopped parsing; likewise each excluded
  shape in FR-1 gets its own fixture rather than one document holding all of them.
- applied: `known-red-ledger-must-expire` — FR-8: the three entries are deleted by the change
  that fixes them, and the harness fails on a known-red assertion that passes, so the ledger
  cannot become a bypass.
- applied: `strictness-added-during-extraction-is-a-behavior-change` — the whole of §7's
  Migration section exists because of this record. FR-1..FR-3 relocate a decision every
  existing artifact already made: prose handoffs merged before and refuse after. FR-7 measures
  the set before it ships, §7 names the remedy and the rollback trigger, and §6 pins both arms.
- reviewed: `gate-run-resume-after-archive` — `core/run/**` watch; FR-5's refusal binds at the
  Phase 3→4 boundary, so a `--from-phase=6` resume neither re-runs nor bypasses it, and the
  archived-path hazard that record describes is untouched.
- reviewed: `surface-set-without-its-predicate` — `core/gates/**` watch; FR-6 adds a predicate
  to an existing lint surface rather than an input set, so the record's failure mode does not
  apply here.
- reviewed: `exemption-marker-needs-no-prose` — `core/gates/prd-ready.ts` watch; FR-6 adds no
  exemption syntax, so there is no author-typed field to close.
- reviewed: `evidence-pattern-satisfied-by-the-template` — `templates/**` watch; the template
  edit that would have tripped this record is now a Non-Goal, and no gate reads template prose
  as evidence.
- reviewed: `a-rule-corrected-survives-where-it-is-restated` — `_prds/**` watch; the shape
  table in §1 is restated in §4 and §6, and the blast radius in §1, §2, §5 and §7, so any
  correction sweeps every restatement.

## Memory Outputs

- learning: `_brain/learnings/count-every-shape-the-grammar-permits.md` — a counter over a
  document its own templates author must be measured against every shape those templates
  permit; one instance teaches one shape, the untested shapes fail silent in the permissive
  direction, and the consumer that keys on the number alone turns the repair into a
  compatibility break.

---

## Conflict Surface

- `packages/provegate/src/core/state/markdown.ts`
- `packages/provegate/src/core/run/acceptance.ts`
- `packages/provegate/src/core/run/chain.ts`
- `packages/provegate/src/core/gates/prd-ready.ts`
- `packages/provegate/test/markdown.test.ts`
- `packages/provegate/test/acceptance.test.ts`
- `packages/provegate/test/chain.test.ts`
- `packages/provegate/test/lint-parsers.test.ts`
- `scripts/audit-operator-rows.mjs`
- `scripts/adopter-smoke.sh`

---

## Durable Artifacts

- `_brain/learnings/count-every-shape-the-grammar-permits.md` — every Memory Output above
  repeats here; the two lists are one contract and Phase 7 refuses when they disagree
- ADR: `none`

---

## 11. Verification Commands

| FR   | Command / Check                | Scope                | Notes                                        |
| ---- | ------------------------------ | -------------------- | -------------------------------------------- |
| FR-1 | `pnpm test --filter provegate` | markdown.test.ts     | each admitted marker counts, each excluded shape has its own fixture |
| FR-2 | `pnpm test --filter provegate` | markdown.test.ts     | header excluded whatever its first cell says |
| FR-3 | `pnpm test --filter provegate` | markdown.test.ts     | Result column by header name, sections summed |
| FR-4 | `pnpm test --filter provegate` | acceptance.test.ts   | four malformed inputs refuse by name, none returns zero |
| FR-5 | `pnpm test --filter provegate` | chain.test.ts        | eligible + counted rows refuses at the 3→4 boundary |
| FR-6 | `pnpm test --filter provegate` | lint-parsers.test.ts | warns with a task file, silent without one   |
| FR-7 | `node scripts/audit-operator-rows.mjs` | repo corpus  | prints every changed artifact, old → new     |
| FR-8 | `pnpm smoke:adopter`           | adopter fixture      | three known-red entries gone, run green      |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build

Before Phase 2 PASS, run: `gate check PRD-040`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT count a row by its position in the table; read the column by its header name.
- DO NOT return zero for input the grammar does not cover; refuse and name it.
- DO NOT edit the shipped tasks template — method content needs an owner-approved addendum.
- DO NOT let the harness keep a known-red entry for a defect this work fixes.
- DO NOT add a suppression flag that lets an author declare `eligible` and keep operator rows.

---

## Changelog

| Date       | Author | Changes                                                                                                                                                                                                     |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-07 | owner  | Initial draft — from the first external adopter run, shapes measured                                                                                                                                        |
| 2026-08-07 | owner  | Iteration 1 rework (Codex 5.7 ITERATE): closed row grammar with named exclusions; structural table read; malformed input refuses instead of counting zero; declaration/count contradiction refused at the 3→4 boundary while Phase 2 only warns; §7 Migration written around `operatorGateOk` keying on the count alone; corpus audit added as FR-7; template edit moved to Non-Goals as method content; two memory inputs added; RM 4→2 accepted, total 4.00→3.70 |
