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
> **Value**: 4.00 (MF/UI/TL/AR/RM: 5/5/3/2/4)

<!-- 0.25*5 + 0.25*5 + 0.20*3 + 0.15*2 + 0.15*4
     = 1.25 + 1.25 + 0.60 + 0.30 + 0.60 = 4.00 -->

---

## 1. Introduction / Overview

The first run of the CLI outside this repository (`pnpm smoke:adopter`, 2026-08-07) closed a
PRD that declared `Autonomous Close: operator-gated`, carried an `## Operator Handoff` section
and a Verification Ledger row whose `Result` was `operator`. The runner printed
`operator rows: 0` and merged. No acceptance was demanded, and nothing reported that the
declaration had no effect.

`countOperatorHandoff` (`core/state/markdown.ts:129`) is the whole of the detection: it reads
only sections headed `Operator Handoff` and counts table rows and checkbox items inside them.
Measured against the four shapes an author can reasonably write:

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

---

## 2. Goals

### Primary Goals

- [ ] Every shape the shipped templates permit an author to write is counted, or refused with a
      message naming the shape.
- [ ] A header row is never counted as an operator row.
- [ ] An `operator-gated` PRD whose task file yields zero counted rows is refused before Phase 4,
      not merged silently at the gate.

### Success Metrics

| Metric                                | Current | Target | Measurement                          |
| ------------------------------------- | ------- | ------ | ------------------------------------ |
| Handoff shapes counted correctly      | 1 of 4  | 4 of 4 | `pnpm smoke:adopter` known-red count |
| Declaration with no effect detectable | no      | yes    | `gate check` refusal, FR-3 test      |

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

---

## 4. Functional Requirements

1. **FR-1**: `countOperatorHandoff` counts a plain list item under `## Operator Handoff` as one
   operator row, in every bullet marker the surrounding parser already recognizes (`-`, `*`,
   `+`, and ordered markers). A section that says the work exists in prose states the same fact
   as a checkbox.
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::countOperatorHandoff`
2. **FR-2**: A table's header row is never counted, regardless of its first cell's text. The
   current filter excludes only `| Task |`, so every other header spelling counts itself.
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::countOperatorHandoff`
3. **FR-3**: A Verification Ledger row whose `Result` cell is `operator` or `blocked` counts as
   an operator row, read from the Result column by name — never by row position, and never from
   any other column (`notes-column-runs-commands` is the same defect one column over).
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::countOperatorHandoff`
4. **FR-4**: `gate check PRD-NNN` refuses a PRD declaring `Autonomous Close: operator-gated`
   whose task file exists and yields zero counted operator rows, naming both the declaration and
   the empty count. A declaration whose asset is absent degrades silently otherwise.
   - **Targets:** `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`
5. **FR-5**: The shipped tasks template states which shapes the acceptance gate counts, next to
   the `Allowed results` line that introduces `operator`.
   - **Targets:** `packages/provegate/templates/tasks-template.md`
6. **FR-6**: The three known-red entries this work closes are deleted from the adopter smoke in
   the same change; the harness fails on a known-red assertion that passes, so they cannot
   outlive the defect.
   - **Targets:** `scripts/adopter-smoke.sh`

---

## 5. Non-Goals (Out of Scope)

- Writing acceptance entries from the CLI (`gate accept`) — a separate item, and an agent must
  never originate an acceptance.
- Changing what an acceptance entry contains or who may author it (PRD-033 settled that).
- The terminal-status write and the dirty tree the same run exposed — PRD-041 owns those.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a task file whose `## Operator Handoff` holds one prose bullet, **When** the merge
  gate runs for an `operator-gated` PRD with no acceptance entry, **Then** the run refuses and
  names the row.
- **Given** a handoff table with a header row and one data row, **When** the count runs,
  **Then** it is 1.
- **Given** a ledger row with `Result: operator`, **When** the count runs, **Then** it is 1.
- **Given** an `operator-gated` PRD whose task file has no countable operator row, **When**
  `gate check` runs, **Then** it refuses and names the declaration.

---

## 7. Technical Considerations

### Architecture

The counter is one function over Markdown; the fix is to widen what it reads and to narrow what
it mistakes for a row. Both directions need their own fixtures — a corpus that only proves the
new shapes count would not catch the header regression, and the reverse.

The ledger read is a column read by header name (the `parseVerificationTable` Command-cell
scoping from PRD-024 is the pattern: find the column, then read that cell). Never a whole-row
regex.

### Dependencies

- none

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/state/markdown.ts`
- [ ] `packages/provegate/src/core/gates/prd-ready.ts`
- [ ] `packages/provegate/templates/tasks-template.md`
- [ ] `packages/provegate/test/markdown.test.ts`, `packages/provegate/test/lint-parsers.test.ts`
- [ ] `scripts/adopter-smoke.sh`

---

## 9. Open Questions

- (none)

---

## 10. References

- `scripts/adopter-smoke.sh` — the run that measured the four shapes
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
- applied: `metadata-declares-what-it-cannot-provide` — FR-4 is that rule applied to
  `Autonomous Close`: a declared capability whose asset is absent must be refused, not
  degraded.
- applied: `assert-absent-needs-an-independent-cause` — the header-row fixture must fail from
  its own cause, not because the surrounding table also stopped parsing.
- reviewed: `surface-set-without-its-predicate` — `core/gates/**` watch; FR-4 adds a predicate
  to an existing lint surface rather than an input set, so the record's failure mode does not
  apply here.
- reviewed: `exemption-marker-needs-no-prose` — `core/gates/prd-ready.ts` watch; FR-4 adds no
  exemption syntax, so there is no author-typed field to close.
- reviewed: `gate-run-resume-after-archive` — `core/run/**` watch via the acceptance gate's
  caller; this work changes what the gate counts, not where the close resumes.
- reviewed: `strictness-added-during-extraction-is-a-behavior-change` — `core/run/**` watch.
  FR-1 to FR-3 DO relocate a decision: PRDs whose handoff was prose merged before and will
  refuse now. That is the defect being repaired, and §6 states it as the expected behaviour
  change rather than leaving it to be discovered.
- reviewed: `evidence-pattern-satisfied-by-the-template` — `templates/**` watch; FR-5 adds
  prose to the template, and no gate is allowed to accept that prose as evidence of anything.
- reviewed: `a-rule-corrected-survives-where-it-is-restated` — `_prds/**` watch; the shape
  table in §1 is restated in §4 and §6, so any correction to it sweeps all three.

## Memory Outputs

- learning: `_brain/learnings/count-every-shape-the-grammar-permits.md` — a counter over a
  document its own templates author must be measured against every shape those templates
  permit; one instance teaches one shape, and the untested shapes fail silent in the permissive
  direction.

---

## Conflict Surface

- `packages/provegate/src/core/state/markdown.ts`
- `packages/provegate/src/core/gates/prd-ready.ts`
- `packages/provegate/templates/tasks-template.md`
- `packages/provegate/test/markdown.test.ts`
- `packages/provegate/test/lint-parsers.test.ts`
- `scripts/adopter-smoke.sh`

---

## Durable Artifacts

- `_brain/learnings/count-every-shape-the-grammar-permits.md` — every Memory Output above
  repeats here; the two lists are one contract and Phase 7 refuses when they disagree
- ADR: `none`

---

## 11. Verification Commands

| FR   | Command / Check              | Scope             | Notes                                     |
| ---- | ---------------------------- | ----------------- | ----------------------------------------- |
| FR-1 | `pnpm test --filter provegate` | markdown.test.ts  | prose bullet in every marker counts 1      |
| FR-2 | `pnpm test --filter provegate` | markdown.test.ts  | header row excluded whatever its first cell |
| FR-3 | `pnpm test --filter provegate` | markdown.test.ts  | Result column read by header name          |
| FR-4 | `pnpm test --filter provegate` | lint-parsers.test.ts | operator-gated with zero rows refused    |
| FR-5 | `pnpm test --filter provegate` | content-templates.test.ts | template states the counted shapes  |
| FR-6 | `pnpm smoke:adopter`         | adopter fixture   | three known-red entries gone, run green    |

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
- DO NOT let the harness keep a known-red entry for a defect this work fixes.
- DO NOT add a suppression flag that lets an author declare `operator-gated` and skip FR-4.

---

## Changelog

| Date       | Author | Changes                                                             |
| ---------- | ------ | ------------------------------------------------------------------- |
| 2026-08-07 | owner  | Initial draft — from the first external adopter run, shapes measured |
