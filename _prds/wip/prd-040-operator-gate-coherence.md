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

**What the second readiness round changed.** Iteration 2 (6.6, ITERATE) closed the
method-content and value findings and left four open, each of which moved a design decision
rather than a sentence: the grammar is now written over `scanDocument`'s masked view (so a
fenced or commented construct is unreachable, not "excluded", and a document that ends inside a
fence is refused on the scanner's own `unreliable` signal); the diagnostic result is plumbed
through `buildState` to both consumers while the exported numeric `countOperatorHandoff` keeps
its signature, because the adopter smoke imports it from the installed package and it is public
API; the lifecycle invariant is bound to a named chain entry AND re-evaluated inside the merge
gate, so no `--from-phase` resume can skip it; and the audit now runs first and decides, rather
than being pasted in before review.

That round also forced the reverse contradiction into the open. `operator-gated` with zero rows
merges silently today, which makes QUICKSTART's own advice — keep `operator-gated` until you
trust the gates — inert. FR-5 makes the declaration the demand.

---

## 2. Goals

### Primary Goals

- [ ] Every shape the closed grammar admits is counted; every permitted non-row is named.
- [ ] Unsupported input is refused at both consumers, never counted as zero.
- [ ] `Autonomous Close` is enforced in both directions, and no resume path can skip it.
- [ ] The behaviour change to existing artifacts is measured, and the measurement decides.

### Success Metrics

| Metric                                   | Current | Target | Measurement                          |
| ---------------------------------------- | ------- | ------ | ------------------------------------ |
| Handoff shapes counted correctly         | 1 of 4  | 4 of 4 | `pnpm smoke:adopter` known-red count |
| Unsupported input counted as zero        | always  | never  | FR-4 refusal fixtures, both consumers |
| Declaration enforced in both directions  | neither | both   | FR-5/FR-6 tests, incl. a resume path |
| Corpus items whose count changes         | unknown | listed | FR-8 audit, before implementation     |

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

1. **FR-1**: The row grammar is closed over the view the reader actually has —
   `scanDocument(content).lines` — and the partition is stated in the scanner's own terms
   (`core/memory/scan.ts`): **unreachable** (the scanner removes them from view: fenced blocks
   are blanked, and `indented-code`, `html` and `in-html` lines carry their own kind);
   **masked** (an HTML comment is replaced by `COMMENT_MASK` (`␀`) and never spliced out, so a
   line whose remaining text is only mask characters and whitespace is empty); **preserved** (a
   same-line code span survives intact, so a row whose text is a code span is a row).
   Over that view, under a section headed `Operator Handoff`, a **row** is a list item at
   column zero whose marker is `-`, `*`, `+`, or an ordered marker of one to nine digits
   followed by `.` or `)`, separated from its text by at least one space or tab, optionally
   followed by a `[ ]`, `[x]` or `[X]` checkbox, and whose remaining text is non-empty after
   masking. A checkbox item is one row, never two. `- none` and `- (none)`, in any case, are
   zero rows. **Permitted non-rows** — present, legal, counted as zero, each with its own
   fixture: an indented or nested list item, a blockquote line, a paragraph, a heading, a
   marker with no separating whitespace, and an item whose text is only mask characters.
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::countOperatorHandoff`
2. **FR-2**: A table under that heading is read structurally: the first row is the header, the
   second must be a separator in any alignment spelling, and only the rows after it are data
   rows. The header is never counted, whatever its first cell says — today only `| Task |` is
   excluded, so every other header spelling counts itself. Multiple table blocks in one section
   are parsed independently and summed. Cells split on unescaped pipes: a `\|` is literal text,
   not a separator. A pipe inside a code span still separates cells, exactly as
   `splitTableCells` reads it today; that is stated so the boundary is a decision and not an
   omission (Non-Goals).
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::countOperatorHandoff`
3. **FR-3**: A Verification Ledger row whose `Result` cell is `operator` or `blocked`
   (case-insensitive, trimmed) counts as an operator row. The column is located by its
   normalized header name, never by position. Every ledger section in the document is summed.
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::countOperatorHandoff`
4. **FR-4**: Unsupported input is **refused**, never counted as zero, and the refusal reaches
   both production consumers. A new diagnostic reader `readOperatorHandoff(content)` returns
   `{ count, problem }`; the exported `countOperatorHandoff(content): number` keeps its
   signature and delegates (it is public API — `packages/provegate/src/core/state/index.ts`
   re-exports it and `scripts/adopter-smoke.sh` imports it from the installed package), so no
   importer breaks. `buildState` stores both on `StateRecord.task` (`operatorHandoffCount` plus
   a new optional `operatorHandoffProblem`), and `operatorGateOk` and `lintPrd` each surface the
   problem instead of proceeding on a number. Refused: a table with a header and no separator
   row, a ledger with no `Result` column, a ledger with two `Result` columns, a data row with
   fewer or more cells than its header, and a document whose `scanDocument` returns a non-null
   `unreliable` (it ends inside a fence or comment, so its sections cannot be read reliably —
   `core/memory/artifacts.ts:641` already refuses on exactly this signal).
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::readOperatorHandoff`,
     `packages/provegate/src/core/state/build.ts::buildState`,
     `packages/provegate/src/core/run/acceptance.ts::operatorGateOk`
5. **FR-5**: `Autonomous Close` becomes the gate it claims to be, in both directions. The
   predicate is method content and traces to **Addendum A3**
   (`docs/research/provegate-bootstrap/source-snapshot/addenda/operator-acceptance-predicate-2026-08-07.md`,
   owner-approved 2026-08-07, Clauses 1–2), listed in `MANIFEST.md` and `DECISIONS.md`:
   (a) `operator-gated` requires a valid owner acceptance **regardless of row count** — the
   declaration is the demand, the rows are only evidence of what is being accepted. Today an
   `operator-gated` PRD with zero rows merges silently, which makes QUICKSTART's advice ("keep
   `operator-gated` until you trust the gates") inert.
   (b) `eligible` whose task file yields one or more operator rows is a contradiction and is
   refused, naming the declaration, the count and the file.
   - **Targets:** `packages/provegate/src/core/run/acceptance.ts::operatorGateOk`
6. **FR-6**: The contradiction is caught early and cannot be skipped late. Early: a new
   `ChainGate` inserted **before** the `'4 Implementation'` entry in `buildGateChain`
   (`core/run/chain.ts:515`), labelled `declaration coherence`. Late: the same invariant is
   evaluated inside `operatorGateOk` before the acceptance lookup, so a `--from-phase=6` or
   `--from-phase=merge` resume that skips the chain's phase-4 entries still meets it. Neither
   path is reachable without the other agreeing.
   - **Targets:** `packages/provegate/src/core/run/chain.ts::buildGateChain`,
     `packages/provegate/src/core/run/acceptance.ts::operatorGateOk`
7. **FR-7**: `gate check PRD-NNN` reports the same contradiction as a non-fatal **warning** when
   the task file exists, and says nothing when it does not — at Phase 2 the task file
   legitimately does not exist yet, and refusing there would refuse every correctly-ordered
   item. `PrdReadyReport` gains `warnings: string[]`, and `runCheck` prints them without
   changing its exit code.
   - **Targets:** `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`,
     `packages/provegate/src/cli.ts::runCheck`
8. **FR-8**: The audit decides, it does not decorate. `scripts/audit-operator-rows.mjs` reports
   every task artifact whose count changes under the new grammar as
   `path: old → new (source: prose-handoff | ledger-operator | header-overcount | refusal)`,
   and it runs as the FIRST task of Phase 4, before any behaviour change is written. Its output
   is pasted into this PRD's Changelog at that moment and the owner decides go / narrow / stop
   from it; a `refusal` classification on an existing artifact is a stop by default. The
   changeset names the behaviour change and the two remedies (flip the declaration, or clear
   the rows).
   - **Targets:** `scripts/audit-operator-rows.mjs`, `.changeset/`,
     `_prds/wip/prd-040-operator-gate-coherence.md`
9. **FR-9**: `METHOD.md`'s operator-acceptance section states Clauses 1–3 of Addendum A3, so
   the rule reaches adopters in the document they read rather than only in the refusal they
   hit. Every added sentence traces to a named clause; nothing else in the file moves.
   - **Targets:** `packages/provegate/METHOD.md`
10. **FR-10**: The three known-red entries this work closes are deleted from the adopter smoke in
   the same change; the harness fails on a known-red assertion that passes, so they cannot
   outlive the defect.
   - **Targets:** `scripts/adopter-smoke.sh`

---

## 5. Non-Goals (Out of Scope)

- Writing acceptance entries from the CLI (`gate accept`) — a separate item, and an agent must
  never originate an acceptance.
- Changing what an acceptance entry contains or who may author it (PRD-033 settled that).
- **Documenting the counted shapes in the shipped tasks template.** Addendum A3 authorizes the
  predicate and its statement in `METHOD.md` (FR-9); it does not authorize new template prose,
  and §3 of the addendum says so. The refusal messages teach the shape at the moment it
  matters, which is where a reader actually is.
- Teaching the table reader that a pipe inside a code span is not a cell separator. That is
  how `splitTableCells` reads every table in this repository today; changing it here would
  change §11 parsing too, which is a different blast radius and a different item.
- The terminal-status write and the dirty tree the same run exposed — PRD-041 owns those.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a task file whose `## Operator Handoff` holds one prose bullet, **When** the merge
  gate runs for an `operator-gated` PRD with no acceptance entry, **Then** the run refuses and
  names the row.
- **Given** a handoff table with a header row and one data row, **When** the count runs,
  **Then** it is 1.
- **Given** a ledger row with `Result: operator`, **When** the count runs, **Then** it is 1.
- **Given** a handoff section holding a nested bullet, a blockquote line, a paragraph and an
  item whose text is empty after masking, **When** the count runs, **Then** none of them is a
  row and the read carries no problem.
- **Given** a ledger with no `Result` column, or a row wider than its header, or a document that
  ends inside a fence, **When** the read runs, **Then** it returns a problem and both
  `operatorGateOk` and `lintPrd` surface it — neither proceeds on zero.
- **Given** an `operator-gated` PRD with zero operator rows and no acceptance entry, **When**
  the merge gate runs, **Then** it refuses: the declaration itself is the demand.
- **Given** a PRD declaring `eligible` whose task file yields two operator rows, **When**
  `gate run` builds the chain, **Then** the `declaration coherence` gate refuses before the
  phase-4 commands run.
- **Given** the same PRD resumed with `--from-phase=merge`, **When** the merge gate runs,
  **Then** it refuses on the same invariant — the early gate is skippable, the invariant is not.
- **Given** the same PRD at Phase 2 with no task file yet, **When** `gate check` runs, **Then**
  it passes silently; **Given** the task file exists, **Then** it passes with a warning.

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

`operatorGateOk` keys on the count alone. FR-1..FR-3 raise the count for any artifact whose
handoff was written as prose or whose ledger carries an `operator` result, and FR-5 adds a
second, larger change: an `operator-gated` PRD now needs an acceptance even with zero rows.

- **Blast radius:** every task artifact and every `operator-gated` PRD, here and in every
  adopter repository. Two distinct populations, and the audit reports them separately, because
  their remedies differ.
- **Public API:** `countOperatorHandoff` is re-exported from the package root and the adopter
  smoke imports it from an installed copy. Its signature does not change; the diagnostic reader
  is additive, and `StateRecord.task` gains an optional field, so a generated `_state/prds.json`
  from an older version still loads.
- **Measurement decides (FR-8):** the audit runs as the first task of Phase 4, before any
  behaviour change is written. It reports two populations, because they change for different
  reasons: artifacts whose COUNT changes, and `operator-gated` items whose required acceptance
  changes while the count stays `0 → 0` — the second is invisible to a count diff and is the
  one Clause 1 creates. Its classification is the decision input: a `refusal` classification on
  an existing artifact stops the work by default, because it means the new grammar cannot read
  something the corpus already contains.
- **Remedy, per population:** a handoff row that is real work → flip `Autonomous Close` to
  `operator-gated` and record the acceptance; a row that is not work → delete it. A ledger row
  sitting at `operator` → run the check and update the `Result`, or accept it explicitly. An
  `operator-gated` PRD with no rows → record the acceptance the declaration always implied, or
  declare `eligible`.
- **Rollback trigger and plan:** revert the commit if the audit shows artifacts whose count
  changes for reasons the grammar did not intend, or if a repository's existing closes begin
  refusing on input the grammar cannot read. The counter is pure and nothing is migrated on
  disk, so a revert restores previous behaviour exactly.
- **Release:** a minor version. The changeset names the behaviour change first and the bug fix
  second, in that order, because that is the order an upgrading adopter meets them.

### Dependencies

- none

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/state/markdown.ts`, `packages/provegate/src/core/state/build.ts`
- [ ] `packages/provegate/src/core/run/acceptance.ts`, `packages/provegate/src/core/run/chain.ts`
- [ ] `packages/provegate/src/core/gates/prd-ready.ts`, `packages/provegate/src/cli.ts`
- [ ] `packages/provegate/test/markdown.test.ts`, `packages/provegate/test/acceptance.test.ts`,
      `packages/provegate/test/chain.test.ts`, `packages/provegate/test/lint-parsers.test.ts`,
      `packages/provegate/test/cli-state.test.ts`
- [ ] `packages/provegate/METHOD.md` (FR-9, traceable to Addendum A3)
- [ ] `scripts/audit-operator-rows.mjs`, `scripts/adopter-smoke.sh`, `.changeset/`

---

## 9. Open Questions

- (none)

---

## 10. References

- `scripts/adopter-smoke.sh` — the run that measured the four shapes
- `_readiness/wip/readiness-040-operator-gate-coherence.md` — iteration 1, 5.7 ITERATE
- Addendum A3 — `docs/research/provegate-bootstrap/source-snapshot/addenda/operator-acceptance-predicate-2026-08-07.md`
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
- applied: `narrow-the-grammar-not-the-parser` — the record's rule is that this reader will
  never reach renderer parity, so the document's permitted content is restricted instead. FR-1
  now partitions the scanner's REAL outputs — unreachable (blanked fences, `indented-code`,
  `html`/`in-html`), masked (`COMMENT_MASK`), preserved (same-line code spans) — rather than
  describing an idealized Markdown; FR-2 states the one construct it deliberately still reads
  wrong (a pipe inside a code span) as a Non-Goal instead of leaving it unstated; and FR-4
  refuses everything outside that partition, including the scanner's own `unreliable` signal.
- applied: `a-rule-that-exempts-itself` — the predicate FR-5 enforces was the author's to
  invent and is not; it moved to the owner as Addendum A3 before any method byte moved (the
  PRD-031 ordering), because a gated party writing its own exemption is not gated.
- applied: `metadata-declares-what-it-cannot-provide` — FR-5 is that rule in both directions.
  `operator-gated` declares a human signature and provides none when the row count is zero;
  `eligible` beside operator rows declares the opposite of what the artifact holds. Iteration 1
  forced the timing split (Phase 2 cannot refuse an artifact Phase 3 has not written yet, so it
  warns and the chain refuses), iteration 2 forced the second direction.
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
- applied: `gate-run-resume-after-archive` — `core/run/**` watch, and the record's own subject
  is what FR-6 answers: a resume enters the chain past the early gate, so an invariant that
  lives only there is skippable by design. FR-6 therefore evaluates it a second time inside
  `operatorGateOk`, which every `--from-phase` path reaches, and the resume-after-archive case
  the record describes is one of the paths the test matrix must cover.
- applied: `state-model-before-mechanism` — iteration 2's open findings were all one thing: the
  mechanism was specified and the state model was not. FR-5 and FR-6 write it — which
  declaration demands what, at which two points it is evaluated, and what each contradiction is
  called — before any parser detail is settled.
- reviewed: `scope-out-the-layer-the-rounds-keep-hitting` — both rounds' findings clustered in
  the CONSUMER layer (who reads the count, when, and what they do with a problem), not in the
  counter. That is why FR-4..FR-7 grew and the parser FRs barely moved; the scope was widened
  to the layer the rounds kept hitting rather than resampled at the layer under attack.
- reviewed: `fixture-must-reach-production-shape` — `cli.ts` watch; FR-7's warning test drives
  `runCheck` with the arguments a user types, not `lintPrd` directly — a report shape asserted
  one call below the production path proves nothing about what the command prints.
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
- `packages/provegate/src/core/state/build.ts`
- `packages/provegate/src/core/run/acceptance.ts`
- `packages/provegate/src/core/run/chain.ts`
- `packages/provegate/src/core/gates/prd-ready.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/test/markdown.test.ts`
- `packages/provegate/test/acceptance.test.ts`
- `packages/provegate/test/chain.test.ts`
- `packages/provegate/test/lint-parsers.test.ts`
- `packages/provegate/test/cli-state.test.ts`
- `scripts/audit-operator-rows.mjs`
- `scripts/adopter-smoke.sh`
- `packages/provegate/METHOD.md`
- `packages/provegate/test/content-canon.test.ts`
- `.changeset/**`
- `_prds/wip/prd-040-operator-gate-coherence.md`

---

## Durable Artifacts

- `_brain/learnings/count-every-shape-the-grammar-permits.md` — every Memory Output above
  repeats here; the two lists are one contract and Phase 7 refuses when they disagree
- ADR: `none`

---

## 11. Verification Commands

| FR   | Command / Check                        | Scope                | Notes                                        |
| ---- | -------------------------------------- | -------------------- | -------------------------------------------- |
| FR-1 | `pnpm test --filter provegate`         | markdown.test.ts     | each admitted marker counts; each permitted non-row has its own fixture |
| FR-2 | `pnpm test --filter provegate`         | markdown.test.ts     | header excluded whatever its first cell says; blocks summed |
| FR-3 | `pnpm test --filter provegate`         | markdown.test.ts     | Result column by header name, sections summed |
| FR-4 | `pnpm test --filter provegate`         | acceptance.test.ts   | five unsupported inputs refuse by name at BOTH consumers |
| FR-5 | `pnpm test --filter provegate`         | acceptance.test.ts   | operator-gated with zero rows refuses; eligible with rows refuses |
| FR-6 | `pnpm test --filter provegate`         | chain.test.ts        | early gate refuses; a --from-phase=merge resume refuses on the same invariant |
| FR-7 | `pnpm test --filter provegate`         | lint-parsers.test.ts | warns with a task file, silent without one, exit code unchanged |
| FR-8 | `node scripts/audit-operator-rows.mjs` | repo corpus          | prints path, old → new, and the classification |
| FR-9 | `pnpm test --filter provegate`         | content-canon.test.ts | METHOD.md states A3 clauses 1-3, each traceable |
| FR-10 | `pnpm smoke:adopter`                  | adopter fixture      | three known-red entries gone, run green      |

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
- DO NOT change the exported `countOperatorHandoff` signature; add the diagnostic reader beside it.
- DO NOT enforce the invariant in only one place — an early gate alone is skippable by a resume.

---

## Changelog

| Date       | Author | Changes                                                                                                                                                                                                     |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-07 | owner  | Initial draft — from the first external adopter run, shapes measured                                                                                                                                        |
| 2026-08-07 | owner  | Iteration 1 rework (Codex 5.7 ITERATE): closed row grammar with named exclusions; structural table read; malformed input refuses instead of counting zero; declaration/count contradiction refused at the 3→4 boundary while Phase 2 only warns; §7 Migration written around `operatorGateOk` keying on the count alone; corpus audit added as FR-7; template edit moved to Non-Goals as method content; two memory inputs added; RM 4→2 accepted, total 4.00→3.70 |
| 2026-08-07 | owner  | Iteration 2 rework (Codex 6.6 ITERATE; 5.7→6.6): grammar rewritten over `scanDocument`'s masked view with unreachable/permitted/refused separated and `unreliable` propagated; diagnostic reader added beside the unchanged public `countOperatorHandoff`, plumbed through `buildState` to both consumers; `Autonomous Close` enforced in both directions with the invariant bound to a named chain entry AND re-evaluated in the merge gate so no resume skips it; `PrdReadyReport.warnings` added for the Phase-2 warning; audit moved to first task of Phase 4 with a classification and a default stop; three memory dispositions rewritten; RM held at 2 |
| 2026-08-07 | owner  | Iteration 3 partial rework (Codex 7.3 ITERATE; 6.6→7.3, lifecycle + method-content + value CLOSED): FR-1 partition restated in the scanner's own terms (unreachable / masked `COMMENT_MASK` / preserved code spans), marker whitespace and ordered-digit range pinned, escaped-pipe rule stated and the pipe-in-code-span boundary moved to Non-Goals; FR-4 caller routes specified per consumer with fatal-vs-warning split and the legacy numeric export's documented behaviour; `narrow-the-grammar-not-the-parser` disposition rewritten against the real partition. **Iteration-3 finding 4 is an OWNER GATE** — FR-5(a) (an `operator-gated` PRD requires an acceptance even at zero rows) is a method predicate that `METHOD.md` does not carry, so it needs an owner-approved source-snapshot addendum (PRD-031 precedent) or FR-5(a) is cut. Not decided by the author; the item waits here.
| 2026-08-07 | owner  | Owner gate resolved: FR-5(a) KEPT, authorized by **Addendum A3** (`source-snapshot/addenda/operator-acceptance-predicate-2026-08-07.md`, approved in-session 2026-08-07), listed in `MANIFEST.md` and `DECISIONS.md` — whose addenda table was also missing the A2 row and now carries both. FR-9 added: `METHOD.md` states A3 clauses 1–3 so the rule reaches adopters in the document they read; FR-8's audit now reports the zero-row `operator-gated` population separately, since Clause 1 changes those items with no count diff to show for it |

