# PRD-043: An Unreadable Task Artifact Refuses, It Never Counts Zero

> **Status**: Draft
>
> **Created**: 2026-08-07
> **Updated**: 2026-08-07
> **Author**: owner
> **Audience**: Implementing Agent
> **Slug**: `unreadable-artifact-refuses`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Class Rationale**: n/a — feature class.
> **Autonomous Close**: eligible
> **Value**: 3.45 (MF/UI/TL/AR/RM: 5/4/3/2/2)

<!-- 0.25*5 + 0.25*4 + 0.20*3 + 0.15*2 + 0.15*2
     = 1.25 + 1.00 + 0.60 + 0.30 + 0.30 = 3.45 -->

<!-- Value history: born 3.60 (RM 3) → iteration 1 ruled RM 2: a public export changes its
runtime behaviour (it throws where it returned), and the parser it changes is read by the gate
that authorizes every close. Accepted rather than argued. -->

---

## 1. Introduction / Overview

Addendum A3 Clause 5, owner-approved 2026-08-07, says a task artifact the gate cannot read must
refuse and name what it could not read, because "a silent zero is the permissive answer to a
question nobody could answer". Nothing implements it. `countOperatorHandoff` returns a number
for every input it is handed, and the numbers are not all zero — measured against the shipped
build on 2026-08-07: a ledger with no `Result` column returns **0**, a table with a header and no
separator returns **2**, a row narrower than its header returns **2**, a document ending inside a
fence returns **0**. PRD-040 changes some of those values (the separator-less table to 0, the
narrow row to 1) without making any of them REFUSE. A number the reader could not justify is the
defect whether it is zero or two: zero lets a close through, and two demands an acceptance nobody
owes.

This item exists because PRD-040 tried to carry it. Two readiness rounds there (7.7, then 7.7
again) landed on this same plumbing — a diagnostic result, two caller contracts, a
boundaryless-table predicate, a fatal-versus-warning split — while the shapes PRD-040 actually
measured sat finished. A flat trajectory in one band means the wrong action is being applied,
so the layer the rounds kept hitting became its own item rather than a longer paragraph in
someone else's.

**Sequencing:** PRD-040 lands first. It establishes what a row is; this item establishes what
happens when the reader cannot tell.

---

## 2. Goals

### Primary Goals

- [ ] A task artifact the reader cannot parse refuses, at every consumer, naming what failed.
- [ ] No consumer proceeds on a number the reader could not justify.
- [ ] The refusal is fatal where it blocks a close and non-fatal where it only informs.

### Success Metrics

| Metric                                  | Current | Target | Measurement                       |
| --------------------------------------- | ------- | ------ | --------------------------------- |
| Unreadable artifacts answered with a number | always | never | FR-1 refusal fixtures             |
| Read sites that surface the problem     | 0 of 5  | 5 of 5 | FR-3/FR-4 tests at each site      |

---

## 3. User Stories

#### User Story 1

```
As someone whose task file has a typo in its ledger header,
I want the close to stop and tell me,
so that a formatting mistake cannot silently drop my operator gate.
```

**Acceptance Criteria:**

- [ ] A ledger whose `Result` header is misspelled refuses by name at the merge gate.
- [ ] The refusal names the file and what could not be read.

---

## 4. Functional Requirements

1. **FR-1**: `readOperatorHandoff(content)` returns `{ count, problem }`, where a non-null
   `problem` makes `count` **unusable** — not zero, not partial: no consumer may read the first
   field without checking the second, and the tests assert that contract at each consumer
   rather than asserting a number.
   The predicates, closed:
   - a **piped line** begins and ends with an unescaped `|` and holds at least one non-empty
     cell. A **separator line** contains only `|`, `-`, `:` and whitespace and holds at least one
     `-`. Neither predicate is "header": a header is a POSITION, not a shape, which is why the
     first draft's header predicate also matched every data row.
   - a **table block** starts at a piped line whose NEXT line is a separator line with the same
     cell count; that first line is the header, and the block runs to the first line that is not
     a piped line. Every piped line inside a block that is neither the header nor the separator
     is a data row.
   - a piped line that starts a run of piped lines with **no** separator line as its second line
     is a `problem` (`table at line N has no separator row`) — that shape counts 2 today, per §7
     of PRD-040.
   - a **boundaryless** line has at least one unescaped `|` but no leading-and-trailing pair. It
     is a `problem` only when the line after it is a separator line ignoring boundary pipes AND
     the two lines split to the same cell count — the same two-part test the piped case uses.
     Either half alone is prose: a sentence containing `|` above an unrelated dashed line is not
     a table, and neither is a `|`-bearing sentence above a differently-shaped one.
   **One outcome per shape.** A boundaryless table that DOES match — separator shape and equal
   cell count — is a `problem`, and it is nothing else: `splitTableCells` requires boundary
   pipes, so the reader cannot read its cells, and PRD-040 measured that shape contributing 0
   today. Refusing it is this item's whole point, so it may never also serve as a positive
   control.
   **Positive controls.** Every refusal fixture is paired with a legal one that differs in
   exactly the refused property and must produce NO problem: a `|`-bearing sentence whose
   neighbour is not a matching separator, beside the matching boundaryless table; a well-formed
   piped table beside the separator-less one; a ledger with one `Result` column beside the
   two-column case; a document whose fence closes beside the unterminated one. A refusal set
   without positive controls cannot show that the predicate discriminates rather than rejects.
   - **cells** split on unescaped pipes by backslash parity; a data row whose cell count differs
     from its block header's is a `problem` naming the line and both counts.
   - a ledger section with no `Result` column, or with two, is a `problem` naming the section.
   - `scanDocument(content).unreliable !== null` is a `problem` naming the dangling construct.
   Multiple problems are **aggregated**, reported in document order, and the first is the one a
   refusal message leads with.
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::readOperatorHandoff`
2. **FR-2**: The exported `countOperatorHandoff(content): number` keeps its signature and throws
   a **stable, exported** diagnostic identity — `OperatorHandoffUnreadableError` with a
   `code: 'OPERATOR_HANDOFF_UNREADABLE'` — when `readOperatorHandoff` reports a problem. An
   unchanged source signature is NOT runtime compatibility: a caller that received `0` now
   receives an exception, and the changeset says so, names the export, and gives the migration
   (call `readOperatorHandoff` and branch on `problem`). For that migration to be available, the
   reader and the error class are themselves **package-root exports** — re-exported through
   `core/state/index.ts` and the package root, and asserted from the installed package, not only
   from source. A migration that names a symbol an adopter cannot import is not a migration. The
   throw is tested the same way `scripts/adopter-smoke.sh` imports it, never through a
   source-relative path.
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::countOperatorHandoff`,
     `packages/provegate/src/core/state/index.ts`, `scripts/adopter-smoke.sh`
3. **FR-3**: `buildState` stores both results on `StateRecord.task`: `operatorHandoffCount` and
   a new optional `operatorHandoffProblem: string | null`. `operatorGateOk` refuses on the
   problem **before** the acceptance lookup — an unreadable artifact is not a close that merely
   lacks a signature.
   **Every reader of the count is a consumer of the contract**, and the inventory is closed:
   `operatorGateOk` (refuses), `lintPrd` via FR-4 (fatal issue),
   and three read sites that print or publish the number:
   - `core/state/query.ts::formatCompactRecord` (`query.ts:117`) — ONE representation, chosen
     here rather than left to the implementer: `CompactRecord.operatorHandoffs` becomes
     `number | null` and gains `operatorHandoffProblem: string | null`, with the number
     **necessarily `null` when a problem exists**. Not "alongside or instead" — one shape.
   - `cli.ts::runRun`'s plan line (`cli.ts:1152`, the `[run] plan …` header block) — prints the
     problem in place of `operator rows: N`.
   - `cli.ts::runRun`'s **handoff card** argument (`cli.ts:1470`, `operatorRows:` passed to
     `handoffCard`) — the same substitution at the end of a successful close, which is the one
     place a wrong number is most likely to be believed.
   A consumer that reads `count` without reading `problem` is the defect this item exists to
   remove, wherever it sits.
   - **Targets:** `packages/provegate/src/core/state/build.ts::buildState`,
     `packages/provegate/src/core/state/build.ts::StateRecord`,
     `packages/provegate/src/core/run/acceptance.ts::operatorGateOk`,
     `packages/provegate/src/core/state/query.ts::formatCompactRecord`,
     `packages/provegate/src/cli.ts::runRun`
4. **FR-4**: Adding `warnings: string[]` to `PrdReadyReport` is a **shape change with a known
   regression surface**: `packages/provegate/test/prd-ready.test.ts` holds six exact
   `{ ok: true, issues: [] }` expectations that fail the moment the field exists. They are
   updated in this change, not discovered by it, and the update is deep-equality against the new
   shape rather than a loosened matcher — a matcher relaxed to make a shape change pass stops
   testing the shape.
   `lintPrd` gains a sixth parameter
   `task: { present: true; count: number; problem: string | null } | { present: false } | undefined`
   — a discriminated union, so a caller cannot read `count` on an absent artifact and the
   compiler says so. `runCheck` builds it from `found.record`: `{ present: true, … }` when the
   record has a task artifact (`found.record.task` supplies the count and the problem;
   `StateRecord.task` carries no `present` field of its own and this parameter is where the
   distinction is made), `{ present: false }` when it does not, and `undefined` only from callers
   with no state at all — **presence is part of the contract**, because "no task file" and "a task
   file with zero rows" are different facts and a lint that cannot tell them apart cannot warn
   correctly. `PrdReadyReport` gains `warnings: string[]`, printed by `runCheck` without
   changing the exit code. A `problem` is a fatal `issues` entry; the declaration/count
   contradiction PRD-040 enforces is reported here as a non-fatal warning, and only when
   `present` is true.
   - **Targets:** `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`,
     `packages/provegate/src/cli.ts::runCheck`, `packages/provegate/test/prd-ready.test.ts`
5. **FR-5**: **Preflight, before any implementation:** PRD-040 must be merged, its grammar
   fixtures present, and `scripts/audit-operator-rows.mjs` must exist and expose the
   `--assert-acknowledged` interface PRD-040 defines. A missing or incompatible script fails the
   preflight and the work does not start — this is a Phase-3/Phase-4 precondition, not a note.
   The audit then gains a third population: artifacts that would newly **REFUSE** under FR-1.
   The fingerprint line GROWS a field rather than changing meaning: PRD-040 ships
   `audit: <count-changes>/<acceptance-changes>/<sha>` and this item extends it to
   `audit: <count-changes>/<acceptance-changes>/<refusals>/<sha>`. A three-field line is
   therefore stale under the four-field reader, which is the correct outcome — a PRD-040
   acknowledgement cannot silently authorize a population it never measured. The decision is
   recorded in this PRD's Changelog and the authorized actor is the owner. A
   refusal on a historical artifact stops the work by default: it means the corpus contains
   something the reader cannot parse, which is a finding about the reader.
   The field growth is itself verified: a three-field acknowledgement line must be reported as
   STALE by the four-field reader, and a four-field line matching the corpus must pass. Both are
   §11 checks, because a fingerprint whose compatibility behaviour is unasserted is a string, not
   a gate.
   - **Targets:** `scripts/audit-operator-rows.mjs`, `.changeset/`,
     `_prds/wip/prd-043-unreadable-artifact-refuses.md`

---

## 5. Non-Goals (Out of Scope)

- What a row is, and the declaration invariant itself — PRD-040 owns both, and lands first.
  This item reports the contradiction at Phase 2; PRD-040 enforces it at the chain and the
  merge gate.
- Teaching the table reader that a pipe inside a code span is not a cell separator; that
  changes §11 parsing too and is a different blast radius.
- Any new prose in a shipped template.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a ledger with no `Result` column, **When** the read runs, **Then** it returns a
  problem naming the section, and the count it also returns is never used by a consumer.
- **Given** a table with a header and no separator row, or a row whose cell count differs from
  its header's, **When** the read runs, **Then** each returns its own named problem.
- **Given** a paragraph containing a `|` character, **When** the read runs, **Then** it is not
  mistaken for a table and produces no problem.
- **Given** a document that ends inside a fence, **When** the read runs, **Then** it refuses on
  `scanDocument`'s `unreliable` signal.
- **Given** any of the above, **When** the merge gate runs, **Then** it refuses before looking
  for an acceptance; **When** `gate check` runs, **Then** the problem is a fatal issue.
- **Given** a PRD declaring `eligible` whose task file yields operator rows, **When**
  `gate check` runs, **Then** it prints a warning and its exit code is unchanged; **Given** no
  task file, **Then** it says nothing about operator rows.
- **Given** an unreadable document, **When** the legacy numeric `countOperatorHandoff` is
  called from the INSTALLED package export, **Then** it throws the named diagnostic error, whose
  class and `code` are importable from the same root.
- **Given** a boundaryless table whose second line matches as a separator with equal cell count,
  **When** the read runs, **Then** it is a problem — the reader cannot read cells without
  boundary pipes, and today it silently counts zero.
- **Given** a well-formed piped table, a `|`-bearing sentence whose neighbour does not match, a
  one-`Result`-column ledger and a document whose fence closes, **When** the read runs, **Then**
  none produces a problem.
- **Given** an acknowledgement line carrying PRD-040's three fields, **When**
  `--assert-acknowledged` runs under this item's four-field reader, **Then** it reports STALE.

---

## 7. Technical Considerations

### Architecture

One reader, one result type, and FIVE read sites that must each say what they do with a
problem: `operatorGateOk` refuses, `lintPrd` records a fatal issue, `formatCompactRecord`
publishes `null` plus the problem, and `runRun`'s plan line and handoff card print the problem
in place of a count. Naming two of them, as an earlier draft did, is the same defect one level
up — an inventory that misses a reader leaves that reader believing a number. The
diagnostic reader is additive; the numeric export keeps its shape because an installed copy is
imported by the adopter smoke, which is the only external consumer this repository can see and
therefore the only one it may assume.

### Migration & Compatibility

- **`CompactRecord` is a public shape.** It is package-root exported and `gate queue --json`
  publishes it, so `operatorHandoffs: number` becoming `number | null` plus a new
  `operatorHandoffProblem` is a consumer-visible change. The changeset names that representation
  explicitly, beside the thrown-error migration — a JSON field that silently changes type is how
  a downstream reader learns about it in production.
- **Blast radius:** any repository whose task artifacts contain a shape the reader cannot
  parse. Unlike PRD-040's change, this one cannot be measured by a count diff — an artifact
  that counted 0 before will refuse now, and both look like "no operator rows" from the
  outside. FR-5's audit is therefore the only measurement, and it runs first.
- **`StateRecord` shape:** the new field is optional, so a `_state/prds.json` generated by an
  older version still loads.
- **Rollback:** revert the commit. The reader is pure, nothing is migrated on disk.
- **Release:** a minor version whose changeset names the new refusals and the remedy (fix the
  artifact the message names).

### Dependencies

- PRD-040 lands first; this item's tests assume its grammar.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/state/markdown.ts`, `packages/provegate/src/core/state/build.ts`
- [ ] `packages/provegate/src/core/run/acceptance.ts`
- [ ] `packages/provegate/src/core/gates/prd-ready.ts`, `packages/provegate/src/cli.ts`
- [ ] `packages/provegate/src/core/state/query.ts` (`formatCompactRecord`)
- [ ] `packages/provegate/test/prd-ready.test.ts` (six exact report-shape expectations)
- [ ] `packages/provegate/test/markdown.test.ts`, `packages/provegate/test/acceptance.test.ts`,
      `packages/provegate/test/lint-parsers.test.ts`, `packages/provegate/test/cli-state.test.ts`
- [ ] `scripts/adopter-smoke.sh` (the installed-export assertion)
- [ ] `scripts/audit-operator-rows.mjs`, `.changeset/`

---

## 9. Open Questions

- (none)

---

## 10. References

- Addendum A3 Clause 5 — `docs/research/provegate-bootstrap/source-snapshot/addenda/operator-acceptance-predicate-2026-08-07.md`
- `_readiness/wip/readiness-040-operator-gate-coherence.md` — the two flat rounds that produced this split
- `_prds/wip/prd-040-operator-gate-coherence.md` — the item this one was cut from

---

## Memory Inputs

- applied: `scope-out-the-layer-the-rounds-keep-hitting` — this item IS that record's action:
  PRD-040's rounds 4 and 5 both landed on this plumbing, so the layer became an item instead of
  a longer paragraph.
- applied: `assert-absent-needs-an-independent-cause` — each refusal fixture must fail from its
  own cause; a document that is both fence-unterminated and missing a `Result` column proves
  neither refusal.
- applied: `fixture-must-reach-production-shape` — `cli.ts` watch; FR-4's assertions run through
  `runCheck` with the arguments a user types, because a report shape asserted one call below the
  production path proves nothing about what the command prints.
- applied: `metadata-declares-what-it-cannot-provide` — a count returned about a document the
  reader could not parse is a declared capability with no asset; FR-1 and FR-2 remove both ways
  of providing it.
- reviewed: `gate-run-resume-after-archive` — `core/run/**` watch; FR-3 refuses inside
  `operatorGateOk`, which every `--from-phase` path reaches, so a resumed close cannot slip past
  the refusal the way it could past an early-chain gate.
- reviewed: `strictness-added-during-extraction-is-a-behavior-change` — `core/run/**` watch, and
  the honest label for this item: artifacts that passed silently will refuse. §7 states the
  blast radius, FR-5 measures it before the change ships, and a historical refusal is a default
  stop.
- applied: `surface-set-without-its-predicate` — `core/gates/**` watch, and the record's exact
  failure mode was in this item's first draft: FR-4 added an input (the task read) without the
  predicate that says when it is absent. `present` closes it — the parameter and the predicate
  that reads it now land together.
- reviewed: `operator-row-must-be-a-table-row` — the record that started this family; PRD-040
  closes it at the counting level and this item covers what happens when the shape cannot be
  read at all. Nothing here re-decides what a row is.
- reviewed: `exemption-marker-needs-no-prose` — `core/gates/prd-ready.ts` watch; no exemption
  syntax is added, so there is no author-typed field to close.
- applied: `narrow-the-grammar-not-the-parser` — the refusals ARE the narrowing, and FR-1 now
  states the predicates that draw the line (header candidate, separator candidate, block
  boundary, cell parity, width equality) instead of describing the intention and leaving the
  implementer to bound it.
- reviewed: `a-rule-corrected-survives-where-it-is-restated` — `_prds/**` watch; the refusal
  list is restated in §4, §6 and §7, so a correction sweeps all three.
- applied: `state-model-before-mechanism` — `_prds/wip/**` watch. The state model is written
  first and it has three states, not two: a read is usable, or it names why not, or the artifact
  is absent — and FR-4's `present` field exists because the third state was missing from the
  first draft, which is precisely what this record warns about.
- reviewed: `two-parsers-wrong-together` — one reader serves both consumers; no second
  implementation is introduced that could agree with the first while both are wrong.

## Memory Outputs

- learning: `_brain/learnings/unreadable-input-needs-a-diagnostic-result.md` — a reader that
  answers a question it could not read hands its consumers a number they cannot audit; the
  durable shape is a result carrying its own problem, every consumer refusing on it before
  acting, and the legacy numeric wrapper's compatibility consequence (an unchanged signature is
  not unchanged runtime behaviour).

---

## Conflict Surface

- `packages/provegate/src/core/state/markdown.ts`
- `packages/provegate/src/core/state/build.ts`
- `packages/provegate/src/core/run/acceptance.ts`
- `packages/provegate/src/core/gates/prd-ready.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/src/core/state/query.ts`
- `packages/provegate/test/prd-ready.test.ts`
- `packages/provegate/test/markdown.test.ts`
- `packages/provegate/test/acceptance.test.ts`
- `packages/provegate/test/lint-parsers.test.ts`
- `packages/provegate/test/cli-state.test.ts`
- `scripts/adopter-smoke.sh`
- `scripts/audit-operator-rows.mjs`
- `.changeset/**`

---

## Durable Artifacts

- `_brain/learnings/unreadable-input-needs-a-diagnostic-result.md` — every Memory Output above
  repeats here; the two lists are one contract and Phase 7 refuses when they disagree
- ADR: `none`

---

## 11. Verification Commands

| FR   | Command / Check                        | Scope                | Notes                                                     |
| ---- | -------------------------------------- | -------------------- | --------------------------------------------------------- |
| FR-1 | `pnpm test --filter provegate`         | markdown.test.ts     | one fixture per refusal cause, each failing independently  |
| FR-1 | `pnpm test --filter provegate`         | markdown.test.ts     | a paragraph containing `\|` produces no problem            |
| FR-2 | `pnpm test --filter provegate`         | markdown.test.ts     | legacy numeric export throws the named diagnostic          |
| FR-2 | `pnpm smoke:adopter`                   | adopter fixture      | from the INSTALLED package root: `readOperatorHandoff` and the error class both import, the wrapper throws, and the thrown value's `code` is `OPERATOR_HANDOFF_UNREADABLE` |
| FR-3 | `pnpm test --filter provegate`         | acceptance.test.ts   | merge gate refuses before the acceptance lookup            |
| FR-3 | `pnpm test --filter provegate`         | cli-state.test.ts    | `formatCompactRecord` and both `runRun` printers report the problem, never a bare count |
| FR-4 | `pnpm test --filter provegate`         | cli-state.test.ts    | problem is fatal, contradiction is a warning, via runCheck |
| FR-4 | `pnpm test --filter provegate`         | prd-ready.test.ts    | the six report-shape expectations assert the new shape by deep equality, not a loosened matcher |
| FR-4 | `pnpm test --filter provegate`         | lint-parsers.test.ts | warning only when the task file exists; exit code unchanged |
| FR-5 | `node scripts/audit-operator-rows.mjs` | repo corpus          | every artifact that would newly refuse is listed           |
| FR-5 | `node scripts/audit-operator-rows.mjs --assert-acknowledged` | repo corpus | a three-field PRD-040 acknowledgement reports STALE; a matching four-field line passes |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm smoke:adopter` — the delivered CLI still closes a PRD end to end

Before Phase 2 PASS, run: `gate check PRD-043`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT change the exported `countOperatorHandoff` signature.
- DO NOT let any consumer read `count` without reading `problem`.
- DO NOT re-specify what a row is; PRD-040 owns that and lands first.

---

## Changelog

| Date       | Author | Changes                                                                                   |
| ---------- | ------ | ----------------------------------------------------------------------------------------- |
| 2026-08-07 | owner  | Initial draft — split out of PRD-040 after two flat readiness rounds landed on this layer |
| 2026-08-07 | owner  | Absorbed PRD-040's Phase-2 contradiction warning: it needs this item's `lintPrd` parameter and `runCheck` plumbing, and one contract split across two items half-specifies both. `PrdReadyReport.warnings` and the print-without-exit-change rule are stated here |
| 2026-08-07 | owner  | Iteration 1 rework (Codex 6.4 ITERATE): FR-1 states the five predicates as a closed set (header candidate, separator candidate, block boundary, cell parity by backslash, width equality), aggregates problems in document order, and declares `count` UNUSABLE rather than zero when a problem exists; FR-2 gains a stable exported diagnostic identity (`OperatorHandoffUnreadableError` / `OPERATOR_HANDOFF_UNREADABLE`), states that an unchanged signature is not runtime compatibility, and is tested through the installed export; FR-3 adds `StateRecord` to Targets; FR-4 makes artifact PRESENCE part of the contract (`present` flag, `undefined` when absent) — the missing third state the first draft had; FR-5 converts the PRD-040 dependency into a hard preflight with the new refusal population and the owner as the authorized actor; Memory Outputs `none` replaced by a real learning; RM 3→2, value 3.60→3.45 |
| 2026-08-07 | owner  | Iteration 2 (Codex 7.2 ITERATE; 6.4→7.2, three items closed): FR-1's "header candidate" predicate matched every data row — corrected to position-based block detection (a piped line whose NEXT line is a matching separator line starts a block; header is a position, not a shape), with "separator line" defined for boundaryless lines too; FR-4's sixth parameter is now a discriminated union (`{present: true, count, problem} | {present: false}`) so a caller cannot read a count on an absent artifact, and where the distinction is built is named; `scripts/adopter-smoke.sh` added to FR-2's Targets, Scope, Conflict Surface and §11 so the installed-export assertion is executable; FR-5 defines the fingerprint's field GROWTH (three fields → four), which correctly stales a PRD-040 acknowledgement that never measured refusals |
| 2026-08-07 | owner  | Iteration 3 (Codex 7.2→7.7; three more items closed): the boundaryless predicate gained its second half — separator shape AND equal cell count, either alone being prose — and every refusal fixture is now paired with a POSITIVE control differing in exactly the refused property, so the predicate is shown to discriminate rather than to reject; FR-2 makes the reader and the error class package-root exports, because a migration naming a symbol an adopter cannot import is not a migration; FR-5's fingerprint growth is verified in both directions (a three-field acknowledgement reports STALE, a matching four-field line passes) instead of being asserted in prose |
| 2026-08-07 | owner  | Iteration 4 (Codex 7.9, one tenth under PASS; the previous round's fix had introduced a contradiction): a MATCHING boundaryless table now has ONE outcome — a problem, because `splitTableCells` needs boundary pipes and PRD-040 measured that shape counting 0 — and the positive control for that predicate became a `|`-bearing sentence whose neighbour does not match, not the "legal boundaryless table" that contradicted the refusal; FR-2's §11 row now asserts that the reader AND the error class import from the installed package root, not only that the wrapper throws |
| 2026-08-07 | owner  | **Correction.** The iteration-3 row's "one outcome per shape" paragraph never landed — the same silent `str.replace` no-op — so the file kept assigning both refusal and positive-control duty to a matching boundaryless table, exactly as iteration 4 reported. Written now via an exact-match edit and verified by reading it back |
| 2026-08-07 | owner  | Iteration 6 (Codex 7.9; three findings, two of them about PRD-040): §1 said every unreadable shape "returns 0" — the measurement says otherwise (missing `Result` 0, separator-less table 2, narrow row 2, unterminated fence 0), and PRD-040 changes two of those values without making any of them refuse. Restated from the measurement, and the metric reworded from "counted as zero" to "answered with a number", because a number the reader could not justify is the defect at any value |
| 2026-08-07 | owner  | Iteration 7 (Codex 7.8; the measured-baseline and escape-parity findings CLOSED): the unusable-count contract had an open consumer inventory — `query.ts::formatCompactRecord` (`:117`) and `cli.ts::runRun`'s two printers (`:1152`, `:1470`) read the count with no problem check, so the contract said "no consumer may read `count` without `problem`" while three consumers did exactly that. Inventory closed and each named in FR-3, Scope, Conflict Surface and §11. FR-4 now states its regression surface up front: `prd-ready.test.ts` holds six exact `{ok: true, issues: []}` expectations that the `warnings` field breaks, updated by deep equality rather than a loosened matcher |
| 2026-08-07 | owner  | Iteration 8 (Codex 7.9): the previous round's inventory fix had left its own restatements behind — §2's metric and §7 still said "two consumers" where FR-3 now names five, which is the inventory defect one level up. FR-3 also offered `CompactRecord` an ALTERNATIVE ("alongside or in place"); one representation is chosen now: `operatorHandoffs: number | null` plus `operatorHandoffProblem: string | null`, the number necessarily `null` when a problem exists. The `cli.ts:1470` site was misdescribed as a JSON summary — it is the HANDOFF CARD argument, the one place a wrong number is most likely to be believed. §7 records that `CompactRecord` is package-root exported and published by `gate queue --json`, so the changeset must name the representation change |

