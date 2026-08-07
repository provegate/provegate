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
> **Value**: 3.60 (MF/UI/TL/AR/RM: 5/4/3/2/3)

<!-- 0.25*5 + 0.25*4 + 0.20*3 + 0.15*2 + 0.15*3
     = 1.25 + 1.00 + 0.60 + 0.30 + 0.45 = 3.60 -->

---

## 1. Introduction / Overview

Addendum A3 Clause 5, owner-approved 2026-08-07, says a task artifact the gate cannot read must
refuse and name what it could not read, because "a silent zero is the permissive answer to a
question nobody could answer". Nothing implements it. `countOperatorHandoff` returns a number
for every input it is handed: a ledger with no `Result` column, a table with a header and no
separator, a row with fewer cells than its header, a document that ends inside a fence. Each of
those returns `0`, and a zero count is exactly what lets a close through.

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
| Unreadable artifacts counted as zero    | always  | never  | FR-1 refusal fixtures             |
| Consumers surfacing the problem         | 0 of 2  | 2 of 2 | FR-3/FR-4 tests, production shapes |

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

1. **FR-1**: `readOperatorHandoff(content)` returns `{ count, problem }`. `problem` is non-null
   for: a table with a header row and no separator row; a pipe table written without leading
   and trailing pipes (the predicate is a header-row candidate followed by a separator-row
   candidate, so ordinary prose containing `|` is never mistaken for a table); a ledger section
   with no `Result` column; a ledger with two `Result` columns; a data row whose cell count
   differs from its header's; and a document whose `scanDocument` returns a non-null
   `unreliable` — the same signal `core/memory/artifacts.ts:641` already refuses on.
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::readOperatorHandoff`
2. **FR-2**: The exported `countOperatorHandoff(content): number` keeps its signature and
   throws a named diagnostic error when `readOperatorHandoff` reports a problem. It is public
   API — `core/state/index.ts` re-exports it and `scripts/adopter-smoke.sh` imports it from an
   installed copy — so the signature may not change; returning a zero it cannot justify is the
   defect this item closes, and throwing is the honest alternative.
   - **Targets:** `packages/provegate/src/core/state/markdown.ts::countOperatorHandoff`
3. **FR-3**: `buildState` stores both results on `StateRecord.task` (`operatorHandoffCount` and
   a new optional `operatorHandoffProblem`), and `operatorGateOk` refuses on
   `record.task.operatorHandoffProblem` **before** the acceptance lookup — an unreadable
   artifact is not a close that merely lacks a signature.
   - **Targets:** `packages/provegate/src/core/state/build.ts::buildState`,
     `packages/provegate/src/core/run/acceptance.ts::operatorGateOk`
4. **FR-4**: `lintPrd` gains a sixth parameter carrying the task read (`{ count, problem }`),
   and `runCheck` passes `found.record.task` at `cli.ts:920`. `PrdReadyReport` gains
   `warnings: string[]`, which `runCheck` prints without changing its exit code. A `problem` is
   a **fatal** `issues` entry. The declaration/count contradiction PRD-040 enforces at the chain
   and the merge gate is reported here as a non-fatal `warnings` entry when the task file
   exists, and nothing is said when it does not — at Phase 2 the task file legitimately does not
   exist yet. That warning lives here rather than in PRD-040 because it needs this parameter and
   this plumbing; splitting one contract across two items half-specifies both. Both are asserted through the CLI with the arguments a user types, not
   against `lintPrd` called one level below the production path.
   - **Targets:** `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`,
     `packages/provegate/src/cli.ts::runCheck`
5. **FR-5**: The audit from PRD-040 is re-run before this item ships and reports every existing
   artifact that would newly REFUSE. A refusal on a historical artifact stops the work by
   default: it means the corpus contains something the reader cannot parse, and that is a
   finding about the reader, not about the corpus.
   - **Targets:** `scripts/audit-operator-rows.mjs`, `.changeset/`

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
  called, **Then** it throws the named diagnostic error rather than returning zero.

---

## 7. Technical Considerations

### Architecture

One reader, one result type, two consumers that must each say what they do with a problem. The
diagnostic reader is additive; the numeric export keeps its shape because an installed copy is
imported by the adopter smoke, which is the only external consumer this repository can see and
therefore the only one it may assume.

### Migration & Compatibility

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
- [ ] `packages/provegate/test/markdown.test.ts`, `packages/provegate/test/acceptance.test.ts`,
      `packages/provegate/test/lint-parsers.test.ts`, `packages/provegate/test/cli-state.test.ts`
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
- reviewed: `surface-set-without-its-predicate` — `core/gates/**` watch; FR-4 adds a parameter
  and a predicate together, not an input set without one.
- reviewed: `exemption-marker-needs-no-prose` — `core/gates/prd-ready.ts` watch; no exemption
  syntax is added, so there is no author-typed field to close.
- reviewed: `narrow-the-grammar-not-the-parser` — the refusals ARE the narrowing: what the
  reader cannot parse is refused rather than approximated.
- reviewed: `a-rule-corrected-survives-where-it-is-restated` — `_prds/**` watch; the refusal
  list is restated in §4, §6 and §7, so a correction sweeps all three.
- reviewed: `state-model-before-mechanism` — `_prds/wip/**` watch; the state model here is one
  sentence and it is written before the mechanism: a read is either usable or it names why not,
  and no consumer may act on the first field without checking the second.
- reviewed: `two-parsers-wrong-together` — one reader serves both consumers; no second
  implementation is introduced that could agree with the first while both are wrong.

## Memory Outputs

- none — the durable fact belongs to PRD-040's learning
  (`count-every-shape-the-grammar-permits`), which this item extends rather than restates; a
  second record saying "and refuse what you cannot read" would be the same lesson filed twice.

---

## Conflict Surface

- `packages/provegate/src/core/state/markdown.ts`
- `packages/provegate/src/core/state/build.ts`
- `packages/provegate/src/core/run/acceptance.ts`
- `packages/provegate/src/core/gates/prd-ready.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/test/markdown.test.ts`
- `packages/provegate/test/acceptance.test.ts`
- `packages/provegate/test/lint-parsers.test.ts`
- `packages/provegate/test/cli-state.test.ts`
- `scripts/audit-operator-rows.mjs`
- `.changeset/**`

---

## Durable Artifacts

- none

---

## 11. Verification Commands

| FR   | Command / Check                        | Scope                | Notes                                                     |
| ---- | -------------------------------------- | -------------------- | --------------------------------------------------------- |
| FR-1 | `pnpm test --filter provegate`         | markdown.test.ts     | one fixture per refusal cause, each failing independently  |
| FR-1 | `pnpm test --filter provegate`         | markdown.test.ts     | a paragraph containing `\|` produces no problem            |
| FR-2 | `pnpm test --filter provegate`         | markdown.test.ts     | legacy numeric export throws the named diagnostic          |
| FR-3 | `pnpm test --filter provegate`         | acceptance.test.ts   | merge gate refuses before the acceptance lookup            |
| FR-4 | `pnpm test --filter provegate`         | cli-state.test.ts    | problem is fatal, contradiction is a warning, via runCheck |
| FR-4 | `pnpm test --filter provegate`         | lint-parsers.test.ts | warning only when the task file exists; exit code unchanged |
| FR-5 | `node scripts/audit-operator-rows.mjs` | repo corpus          | every artifact that would newly refuse is listed           |

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

