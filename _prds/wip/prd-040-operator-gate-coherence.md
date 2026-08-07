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

**What the fifth round changed — a scope move, not another rework.** Iterations 4 and 5 both
scored 7.7 and both landed on the same two layers: Markdown grammar minutiae, and the plumbing
that would carry a diagnostic refusal to two callers. A flat trajectory inside one band means
the wrong action is being applied (`score-band-prescribes-the-action`), and defects clustering
in one layer are a scope error reported as design errors
(`scope-out-the-layer-the-rounds-keep-hitting`). Both records are inputs to this PRD, and both
were describing it.

So the refusal path left: **PRD-043** owns "an unreadable task artifact must refuse instead of
counting zero" — the diagnostic reader, both caller contracts, the boundaryless-table
predicate, and the fatal-versus-warning split. What remains here is what the adopter run
actually measured (four shapes, one of them counted correctly) plus the declaration invariant
Addendum A3 authorizes. Malformed input keeps today's behaviour under this item, stated as a
Non-Goal with its successor named rather than left as an implication.

**What the second readiness round changed.** Iteration 2 (6.6, ITERATE) closed the
method-content and value findings and left four open, each of which moved a design decision
rather than a sentence: the grammar is now written over `scanDocument`'s masked view (so a
fenced or commented construct is unreachable, not "excluded", and a document that ends inside a
fence is refused on the scanner's own `unreliable` signal — that refusal has SINCE MOVED to
PRD-043, and with it the diagnostic result, both caller contracts and the Phase-2 warning, so
nothing in this item changes `countOperatorHandoff`'s return shape or `StateRecord`); the
lifecycle invariant is bound to a named chain entry AND re-evaluated inside the merge
gate, so no `--from-phase` resume can skip it; and the audit now runs first and decides, rather
than being pasted in before review.

That round also forced the reverse contradiction into the open. `operator-gated` with zero rows
merges silently today, which makes QUICKSTART's own advice — keep `operator-gated` until you
trust the gates — inert. FR-5 makes the declaration the demand.

---

## 2. Goals

### Primary Goals

- [ ] Every shape the closed grammar admits is counted; every permitted non-row is named.
- [ ] `Autonomous Close` is enforced in both directions, and no resume path can skip it.
- [ ] The behaviour change to existing artifacts is measured, and the measurement decides.

### Success Metrics

| Metric                                   | Current | Target | Measurement                          |
| ---------------------------------------- | ------- | ------ | ------------------------------------ |
| Handoff shapes counted correctly         | 1 of 4  | 4 of 4 | `pnpm smoke:adopter` known-red count |
| Declaration enforced in both directions  | neither | both   | FR-4/FR-5 tests, incl. a resume path |
| Corpus items whose acceptance changes    | unknown | listed | FR-7 audit, two populations, before implementation |

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

1. **FR-1**: The row grammar is closed over the view the reader has —
   `scanDocument(content).lines` — stated in the scanner's own terms
   (`core/memory/scan.ts`): **unreachable** (fenced blocks are blanked; `indented-code`, `html`
   and `in-html` lines carry their own kind), **masked** (an HTML comment becomes
   `COMMENT_MASK` (`␀`), never spliced, so a line whose remaining text is only mask characters
   and whitespace is empty), **preserved** (a same-line code span survives, so a row whose text
   is a code span is a row).
   Over that view, under a section headed `Operator Handoff`, a **row** is a list item —
   **at any indentation**, which is Addendum A3 Clause 3 read literally — whose marker is `-`,
   `*`, `+`, or one to nine digits followed by `.` or `)`, separated from its text by at least
   one space or tab, optionally followed by a `[ ]`, `[x]` or `[X]` checkbox, and whose
   remaining text is non-empty after masking. A checkbox item is one row, never two. `- none`
   and `- (none)`, in any case, are zero rows. Counting a nested item costs nothing the gate
   reads — the acceptance demand is boolean — and it removes a judgement call the implementer
   would otherwise make about what "under" means.
   **Permitted non-rows**, each with its own fixture: a blockquote line, a paragraph, a heading,
   a marker with no separating whitespace, and an item whose text is only mask characters.
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::countOperatorHandoff`
2. **FR-2**: A table under that heading is read structurally: the first row is the header, the
   second must be a separator in any alignment spelling, and only the rows after it are data
   rows. The header is never counted, whatever its first cell says — today only `| Task |` is
   excluded, so every other header spelling counts itself. Multiple table blocks in one section
   are parsed independently and summed. A row is read only when it carries both a leading and a
   trailing pipe, which is what `splitTableCells` requires today, and only inside a block whose
   header is followed by a separator row. Measured consequences (§7): a table written without a
   separator counts 2 today and 0 after this change; a header-plus-separator table with no data
   rows counts 1 today and 0 after. Cells split on unescaped pipes by backslash parity:
   an even number of preceding backslashes separates, an odd number escapes. A data row whose
   cells are all empty is not a row — the shipped placeholder table is that shape and counts
   zero.
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::countOperatorHandoff`
3. **FR-3**: A Verification Ledger row whose `Result` cell is `operator` or `blocked`
   (case-insensitive, trimmed) counts as an operator row — Addendum A3 Clause 3. The column is
   located by its normalized header name, never by position. Every ledger section in the
   document is summed. A ledger with no `Result` column contributes zero rows and no error;
   refusing it is PRD-043's subject, not this item's.
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::countOperatorHandoff`
4. **FR-4**: `Autonomous Close` becomes the gate it claims to be, in both directions, as
   authorized by **Addendum A3**
   (`docs/research/provegate-bootstrap/source-snapshot/addenda/operator-acceptance-predicate-2026-08-07.md`,
   owner-approved 2026-08-07, Clauses 1–2), listed in `MANIFEST.md` and `DECISIONS.md`:
   (a) `operator-gated` requires a valid owner acceptance **regardless of row count** — the
   declaration is the demand, the rows are evidence of what is accepted. Today an
   `operator-gated` PRD with zero rows merges silently, which makes QUICKSTART's advice ("keep
   `operator-gated` until you trust the gates") inert.
   (b) `eligible` whose task file yields one or more operator rows is a contradiction and is
   refused, naming the declaration, the count and the file.
   - **Targets:** `packages/provegate/src/core/run/acceptance.ts::operatorGateOk`
5. **FR-5**: The invariant is caught early and cannot be skipped late (A3 Clause 4). Early: a
   new `ChainGate` inserted before the `'4 Implementation'` entry in `buildGateChain`
   (`core/run/chain.ts:515`), labelled `declaration coherence`. Late: the same invariant is
   evaluated inside `operatorGateOk` before the acceptance lookup, so a `--from-phase=6` or
   `--from-phase=merge` resume that skips the chain's phase-4 entries still meets it.
   - **Targets:** `packages/provegate/src/core/run/chain.ts::buildGateChain`,
     `packages/provegate/src/core/run/acceptance.ts::operatorGateOk`
6. **FR-6**: `scripts/audit-operator-rows.mjs` carries its own continuation gate. Run with
   `--assert-acknowledged` it recomputes the two populations, derives a one-line fingerprint
   (`audit: <count-changes>/<acceptance-changes>/<sha>`), and exits 1 unless this PRD's
   Changelog carries that exact line — so a stale acknowledgement fails the same way a missing
   one does. Phase 4 may not proceed past its first task without it.
   - **Targets:** `scripts/audit-operator-rows.mjs`
7. **FR-7**: The audit measures both populations. `scripts/audit-operator-rows.mjs` reports
   two populations — artifacts whose COUNT changes
   (`path: old → new (source: prose-handoff | nested-item | ledger-operator | header-overcount)`)
   and `operator-gated` items whose required acceptance changes while the count stays `0 → 0`,
   which no count diff can show. It runs as the FIRST task of Phase 4, before any behaviour
   change is written; its output is pasted into this PRD's Changelog at that moment and the
   owner decides go / narrow / stop from it.
   - **Targets:** `scripts/audit-operator-rows.mjs`, `.changeset/`,
     `_prds/wip/prd-040-operator-gate-coherence.md`
8. **FR-8**: `METHOD.md`'s operator-acceptance section states Clauses 1–3 of Addendum A3, so
   the rule reaches adopters in the document they read rather than only in the refusal they
   hit. Every added sentence traces to a named clause; nothing else in the file moves.
   - **Targets:** `packages/provegate/METHOD.md`
9. **FR-9**: The three known-red entries this work closes are deleted from the adopter smoke in
   the same change; the harness fails on a known-red assertion that passes, so they cannot
   outlive the defect.
   - **Targets:** `scripts/adopter-smoke.sh`

---

## 5. Non-Goals (Out of Scope)

- Writing acceptance entries from the CLI (`gate accept`) — a separate item, and an agent must
  never originate an acceptance.
- Changing what an acceptance entry contains or who may author it (PRD-033 settled that).
- **Documenting the counted shapes in the shipped tasks template.** Addendum A3 authorizes the
  predicate and its statement in `METHOD.md` (FR-8); it does not authorize new template prose,
  and §3 of the addendum says so. FR-8's `METHOD.md` text states the authorized list, table and
  ledger shapes, so an adopter meets them in the document they read; no task-template prose is
  added here.
- **Refusing an unreadable task artifact**, and the Phase-2 warning that would report the
  declaration contradiction through the lint. A ledger with no `Result` column, a table with no
  separator row, a row whose width differs from its header's, a document ending inside a fence:
  under this item their MEASURED outcomes are what §7 records — the separator-less table goes
  `2 → 0`, the narrow row `2 → 1`, a ledger with no `Result` column stays `0`, and a document
  ending inside a fence is read as far as the scanner permits. None of them refuses. Addendum A3
  Clause 5 says they must, and PRD-043 does it — with the
  diagnostic reader, both caller contracts, and the fatal-versus-warning split that come with
  it. Two rounds of this item's readiness were spent specifying that plumbing in prose; it is
  its own work item, not a paragraph in this one. The warning goes with it: it needs the same
  `lintPrd` parameter and the same `runCheck` plumbing, and splitting one contract across two
  items is how both end up half-specified.
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
- **Given** a handoff section holding a nested bullet, **When** the count runs, **Then** it is
  counted — A3 Clause 3 read literally, and the demand is boolean either way.
- **Given** a blockquote line, a paragraph, a heading, a marker with no separating whitespace
  and an item whose text is only mask characters, **When** the count runs, **Then** none is a
  row.
- **Given** the shipped placeholder handoff table, whose data cells are all empty, **When** the
  count runs, **Then** it is zero.
- **Given** a row whose text is `| a\|b |` — one backslash before the pipe, an ODD count, so the
  pipe is escaped — **When** cells are split, **Then** it is one cell; **Given** `| a\\|b |` —
  two backslashes, an EVEN count, so the backslash is literal and the pipe separates — **Then**
  it is two cells.
- **Given** an `operator-gated` PRD with zero operator rows and no acceptance entry, **When**
  the merge gate runs, **Then** it refuses: the declaration itself is the demand.
- **Given** a PRD declaring `eligible` whose task file yields two operator rows, **When**
  `gate run` builds the chain, **Then** the `declaration coherence` gate refuses before the
  phase-4 commands run.
- **Given** the same PRD resumed with `--from-phase=merge`, **When** the merge gate runs,
  **Then** it refuses on the same invariant — the early gate is skippable, the invariant is not.
- **Given** an audit acknowledgement line that no longer matches the corpus, **When**
  `--assert-acknowledged` runs, **Then** it exits 1 — a stale acknowledgement fails like a
  missing one.

---

## 7. Technical Considerations

### Architecture

The counter stays one function returning one number. It widens what it reads and narrows what
it mistakes for a row; its signature does not change, and neither does any caller's. Both
directions need their own fixtures — a corpus that only proves the new shapes count would not
catch the header regression, and the reverse.

The grammar is closed by enumeration (FR-1). Every reachable list item counts, at any
indentation, which is Addendum A3 Clause 3 read literally; the permitted non-rows are
blockquote lines, paragraphs, headings, markers without separating whitespace, and items whose
text is only mask characters. Fences, HTML comments and html blocks are not "excluded" at all —
`scanDocument` has already removed them from the view. That is the
`narrow-the-grammar-not-the-parser` rule: this reader will never reach renderer parity, so it
restricts what it may be asked to read instead.

**Measured, not asserted.** Every claim below about today's reader is the output of executing
the shipped `countOperatorHandoff` against each shape on 2026-08-07 (probe:
`node -e` over `packages/provegate/dist/index.js`, one document per row):

```
 0  prose bullet
 0  nested bullet under a row
 1  checkbox
 2  table, header + 1 data row
 1  table, header + separator only
 2  table, header, NO separator
 2  row narrower than header
 1  all-empty placeholder row          (the 1 is the header; the empty row is 0)
 0  no leading/trailing pipes
 0  prose containing a pipe
 0  blockquote line
 0  ledger Result: operator
 0  ledger with no Result column
 0  unterminated fence
```

Two of this PRD's earlier drafts described that behaviour from reading the code and got it
wrong in both directions, which is why the measurement is here rather than a paragraph.

**What this item changes, per shape:** prose bullet 0→1, nested bullet 0→1, ledger
`Result: operator` 0→1, header + 1 data row 2→1, header + separator only 1→0, all-empty
placeholder 1→0.

**Interim behaviour this item does NOT change** — each is a silent zero or an over-count, each
is wrong, and each is PRD-043's subject: a table with no separator row counts 2 today and 0
after FR-2 (it is not a table, so nothing in it is read — the change is stated here because it
is a change, not a preserved behaviour); a row narrower than its header counts as one data row
plus the header today and one data row after FR-2, with its width still unread; a ledger with
no `Result` column contributes 0; a document ending inside a fence is read as far as the
scanner reads it. None of them refuses, and refusing is exactly what A3 Clause 5 requires and
PRD-043 delivers.

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
  smoke imports it from an installed copy. This item changes WHAT IT COUNTS and nothing else —
  same signature, same return type, same absence of a thrown error. The diagnostic result and
  the `StateRecord` field belong to PRD-043; a reader of this PRD should find no promise of
  either here.
- **Measurement decides (FR-7):** the audit runs as the first task of Phase 4, before any
  behaviour change is written. It reports two populations, because they change for different
  reasons: artifacts whose COUNT changes, and `operator-gated` items whose required acceptance
  changes while the count stays `0 → 0` — the second is invisible to a count diff and is the
  one Clause 1 creates. Its classification is the decision input, and the classifications are
  the four counting sources plus the zero-row acceptance changes — nothing else.
- **Remedy, per population:** a handoff row that is real work → flip `Autonomous Close` to
  `operator-gated` and record the acceptance; a row that is not work → delete it. A ledger row
  sitting at `operator` → run the check and update the `Result`, or accept it explicitly. An
  `operator-gated` PRD with no rows → record the acceptance the declaration always implied, or
  declare `eligible`.
- **Rollback trigger and plan:** revert the commit if the audit shows artifacts whose count
  changes for reasons the grammar did not intend. An unintended count change is this item's
  only rollback trigger. The counter is pure and nothing is migrated on
  disk, so a revert restores previous behaviour exactly.
- **Release:** a minor version. The changeset names the behaviour change first and the bug fix
  second, in that order, because that is the order an upgrading adopter meets them.

### Dependencies

- none

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/state/markdown.ts`
- [ ] `packages/provegate/src/core/run/acceptance.ts`, `packages/provegate/src/core/run/chain.ts`
- [ ] `packages/provegate/test/markdown.test.ts`, `packages/provegate/test/acceptance.test.ts`,
      `packages/provegate/test/chain.test.ts`
- [ ] `packages/provegate/METHOD.md` (FR-8, traceable to Addendum A3),
      `packages/provegate/test/content-canon.test.ts`
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
  wrong (a pipe inside a code span) as a Non-Goal instead of leaving it unstated; and §7 records
  the interim behaviour for everything FR-2 and FR-3 leave outside that partition rather than
  refusing it — the refusals, including the scanner's own `unreliable` signal, belong to
  PRD-043.
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
- applied: `known-red-ledger-must-expire` — FR-9: the three entries are deleted by the change
  that fixes them, and the harness fails on a known-red assertion that passes, so the ledger
  cannot become a bypass.
- applied: `strictness-added-during-extraction-is-a-behavior-change` — the whole of §7's
  Migration section exists because of this record. FR-1..FR-3 relocate a decision every
  existing artifact already made: prose handoffs merged before and refuse after. FR-7 measures
  the set before it ships, §7 names the remedy and the rollback trigger, and §6 pins both arms.
- applied: `gate-run-resume-after-archive` — `core/run/**` watch, and the record's own subject
  is what FR-5 answers: a resume enters the chain past the early gate, so an invariant that
  lives only there is skippable by design. FR-5 therefore evaluates it a second time inside
  `operatorGateOk`, which every `--from-phase` path reaches, and the resume-after-archive case
  the record describes is one of the paths the test matrix must cover.
- applied: `state-model-before-mechanism` — iteration 2's open findings were all one thing: the
  mechanism was specified and the state model was not. FR-4 and FR-5 write it — which
  declaration demands what, at which two points it is evaluated, and what each contradiction is
  called — before any parser detail is settled.
- applied: `scope-out-the-layer-the-rounds-keep-hitting` — applied as an action, not a
  citation. Rounds 4 and 5 both scored 7.7 and both landed on the same two layers: grammar
  minutiae and diagnostic plumbing. The record says that is a scope error wearing design-error
  clothes, so the refusal path was SCOPED OUT to PRD-043 instead of being specified more
  precisely for a third time.
- applied: `score-band-prescribes-the-action` — the trajectory went 5.7 → 6.6 → 7.3 → 7.7 →
  7.7. The band's action for a flat round is not another rework at the same scope; this round
  cut scope, and the readiness file records that as the reason rather than as a result.
- reviewed: `fixture-must-reach-production-shape` — the `cli.ts` surface left with the warning,
  and the record still binds FR-5: the chain test must build the real `buildGateChain` and run
  it, not call the gate function it inserts.
- reviewed: `surface-set-without-its-predicate` — the lint surface left this item with the
  Phase-2 warning (PRD-043 owns it now), and FR-6 is an audit acknowledgement predicate over a
  fingerprint the script recomputes: no input set is introduced here without the rule that
  reads it.
- reviewed: `exemption-marker-needs-no-prose` — `core/gates/prd-ready.ts` no longer appears in
  this item's targets (the lint warning moved to PRD-043 with the contract it needs), and the
  acknowledgement line FR-6 checks is machine-derived: a fingerprint the script recomputes, with
  no author-typed field to hide in.
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
- `packages/provegate/test/markdown.test.ts`
- `packages/provegate/test/acceptance.test.ts`
- `packages/provegate/test/chain.test.ts`
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

| FR   | Command / Check                        | Scope                 | Notes                                                                                     |
| ---- | -------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| FR-1 | `pnpm test --filter provegate`         | markdown.test.ts      | one fixture each: `-`/`*`/`+`/`1.`/`1)` marker, checkbox in all three spellings, nested item, blockquote, paragraph, heading, marker without whitespace, mask-only text, code-span text, `- none`, `- (none)` |
| FR-1 | `pnpm test --filter provegate`         | markdown.test.ts      | one fixture per unreachable kind: blanked fence, `indented-code`, `html`, `in-html`         |
| FR-2 | `pnpm test --filter provegate`         | markdown.test.ts      | header excluded whatever its first cell; two blocks summed; all-empty placeholder row zero; escape parity: `\|` (odd) is one cell, `\\|` (even) is two |
| FR-3 | `pnpm test --filter provegate`         | markdown.test.ts      | Result column by header name; two ledger sections summed; no Result column contributes zero |
| FR-4 | `pnpm test --filter provegate`         | acceptance.test.ts    | operator-gated with zero rows refuses; eligible with rows refuses; both name the file        |
| FR-5 | `pnpm test --filter provegate`         | chain.test.ts         | early gate refuses before phase-4 commands; a `--from-phase=merge` resume refuses identically |
| FR-6 | `node scripts/audit-operator-rows.mjs --assert-acknowledged` | repo corpus | exits 1 on a missing or stale acknowledgement line |
| FR-7 | `node scripts/audit-operator-rows.mjs` | repo corpus           | both populations printed: count changes with a source, and zero-row acceptance changes       |
| FR-8 | `pnpm test --filter provegate`         | content-canon.test.ts | METHOD.md states A3 clauses 1-3, each traceable to its clause                                 |
| FR-9 | `pnpm smoke:adopter`                   | adopter fixture       | three known-red entries gone, run green                                                      |

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
- DO NOT add a refusal for input the grammar does not cover — the interim zeros are recorded in
  §7 and PRD-043 turns them into refusals; adding one here re-merges the split.
- DO NOT edit the shipped tasks template — method content needs an owner-approved addendum.
- DO NOT let the harness keep a known-red entry for a defect this work fixes.
- DO NOT add a suppression flag that lets an author declare `eligible` and keep operator rows.
- DO NOT widen this item back into the refusal path, the diagnostic result, the `StateRecord`
  field or the lint warning; PRD-043 owns all four, and no FR here may promise them.
- DO NOT treat the interim zeros in §7 as correct behaviour; they are recorded, not endorsed.
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
| 2026-08-07 | owner  | Iteration 4 rework (Codex 7.7 ITERATE; 7.3→7.7): all-empty placeholder table pinned at zero; leading/trailing pipe requirement stated with the alternative form refused; escaped-pipe backslash parity defined; nested items reconciled with A3 Clause 3 as a reading (detail about a row, not a second row) rather than an exception; per-shape fixture obligation enumerated; the legacy numeric export now THROWS a named diagnostic instead of returning an unjustifiable zero; `lintPrd`'s sixth parameter and `runCheck`'s `found.record.task` argument named at `cli.ts:920`, with fatal-vs-warning routing stated |
| 2026-08-07 | owner  | Iteration 5 SCOPE MOVE (Codex 7.7, flat after 7.7): rounds 4 and 5 both landed on grammar minutiae and diagnostic plumbing, which `score-band-prescribes-the-action` and `scope-out-the-layer-the-rounds-keep-hitting` both name as a scope error. The refusal path left for **PRD-043** (diagnostic reader, both caller contracts, boundaryless-table predicate, fatal-vs-warning split); malformed input keeps today's behaviour here, as a stated Non-Goal. Nested list items are now COUNTED — A3 Clause 3 read literally — which removes the owner clarification the scorer asked for, since the acceptance demand is boolean either way. §11 enumerates a fixture per shape |
| 2026-08-07 | owner  | Iteration 6 sweep (Codex 7.6): the scope move left restatements, which is `a-rule-corrected-survives-where-it-is-restated` verbatim — §7 still claimed a `{count, problem}` return shape and listed nesting as excluded. Swept: the counter keeps its signature, every reachable list item counts, and §7 now states the INTERIM behaviour for each input this item does not refuse (no-separator table, unequal-width row, missing Result column, unterminated fence) as a recorded decision rather than an implication. The Phase-2 lint warning moved WHOLE to PRD-043 with the `lintPrd`/`runCheck` contract it needs — splitting one contract across two items half-specifies both — so `prd-ready.ts`, `cli.ts` and `lint-parsers.test.ts` left this item's scope. FR-6 is now the audit's executable continuation gate: `--assert-acknowledged` recomputes a fingerprint and exits 1 on a missing or stale acknowledgement |
| 2026-08-07 | owner  | Iteration 7 (Codex 7.6, flat after 7.6): stopped arguing about today's behaviour and MEASURED it — the shipped counter executed against fourteen shapes, verbatim output pasted into §7 with the per-shape delta this item makes. Two earlier drafts had described that behaviour from reading the code and were wrong in both directions (an all-empty placeholder row does count 0; the 1 was the header, and a separator-less table counts 2, not 0). FR-2's "exactly as now" claim corrected to the measured deltas |
| 2026-08-07 | owner  | Cross-item sweep (found while scoring PRD-043, iteration 2): this file still carried present-tense claims that IT plumbs the diagnostic result through `buildState` and that `StateRecord.task` gains a field — both left PRD-040 with the split. §1's history paragraph now marks them as moved, the Migration bullet states that this item changes only WHAT IS COUNTED, and the DO NOT names all four moved surfaces. Third instance of a correction surviving where it was restated |
| 2026-08-07 | owner  | Second cross-item sweep (found while scoring PRD-043, iteration 3): the `narrow-the-grammar-not-the-parser` disposition still claimed FR-4 refuses `scanDocument().unreliable`, and §12 still ordered a refusal this item no longer performs. Both now point at PRD-043. Fourth instance of the restatement trap in this file — the pattern is that a scope change must sweep dispositions and DO NOTs, not only the FRs |
| 2026-08-07 | owner  | Third cross-item sweep (found while scoring PRD-043, iteration 4): §5 cited FR-9 for the METHOD.md statement and §7 cited FR-8 for the audit — both off by one after the renumbering; the audit's `refusal` classification and the unreadable-input rollback trigger were PRD-043's and are gone, leaving this item's four counting sources as the only classifications and no refusal it could roll back. Fifth restatement instance in this file |
| 2026-08-07 | owner  | Fourth cross-item sweep (found while scoring PRD-043, iteration 6): §5's METHOD reference and the `known-red`/resume/state-model dispositions were still on the pre-renumbering FR ids; §5's interim claim said "each contributes zero rows" where the MEASUREMENT says the separator-less table goes 2→0 and the narrow row 2→1; the audit classifications omitted the zero-row acceptance population; the rollback aside still mentioned refusals this item does not perform; `surface-set-without-its-predicate` still described a lint surface that left with the Phase-2 warning. And the escape-parity example in §6 and §11 showed the SAME source string for both arms — `a\|b` twice — while claiming one cell and two; the odd/even pair is now written out. Sixth restatement instance in this file |
| 2026-08-07 | owner  | Fifth cross-item sweep (PRD-043 iteration 7). The fourth sweep had reported success while leaving every twin in place: `str.replace(..., 1)` fixes the FIRST occurrence, and this file restates each rule two or three times. Measured this round instead of assumed — occurrence counts checked before and after every edit. Closed: §5's interim outcomes (measured, none refuses), §7's `refusal` classification and the rollback aside that named refusals this item does not perform, the resume (FR-6→FR-5) and state-model (FR-5/FR-6→FR-4/FR-5) dispositions, `surface-set-without-its-predicate` rewritten around FR-6's acknowledgement predicate, and `narrow-the-grammar`'s interim reference repointed from FR-4 to §7/FR-2–FR-3 |
| 2026-08-07 | owner  | Sixth cross-item sweep (PRD-043 iteration 8): two live survivors of the fifth sweep — §7 Migration still recorded PRD-043's unreadable-artifact population as if this item audited it, and `gate-run-resume-after-archive` still credited FR-6 for the second evaluation FR-5 performs. Both closed, occurrence-counted |
| 2026-08-07 | owner  | Seventh cross-item sweep (PRD-043 iteration 9): §7's classification paragraph still trailed a clause about PRD-043's refusal population "recorded here as information only" and a global "this item performs no refusals" — both deleted, the paragraph now ends at its classification list. §5's Non-Goal was bound to FR-8 (`METHOD.md` states the authorized shapes) instead of gesturing at refusal messages |

