# PRD-024: §11 Command Extraction — Read the Command Column, Report the Rest

> **Status**: Draft
>
> **Created**: 2026-07-27
> **Updated**: 2026-07-28
> **Author**: Claude Opus 5, for owner review
> **Audience**: Implementing Agent
> **Slug**: `readiness-lint-parsers`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: One defect in the readiness lint's §11 reader, plus the reporting
> channel it needs. No new flag, config key, or CLI command, and the exported programmatic
> signature is preserved (FR-1). Two things move besides verdicts, stated rather than
> glossed: the **commands executed in Phase 5**, since `buildGateChain` runs the parser's
> output directly, and the **set of documents that pass**. Not `test-hardening` because
> production parser code changes, not only tests.
> **Autonomous Close**: operator-gated
> **Value**: 3.50 (MF/UI/TL/AR/RM: 5/3/3/2/4)

<!-- 0.25*5 + 0.25*3 + 0.20*3 + 0.15*2 + 0.15*4
     = 1.25 + 0.75 + 0.60 + 0.30 + 0.60 = 3.50 -->

---

## 1. Introduction / Overview

Split from PRD-023 on owner direction, 2026-07-27, and **narrowed again on 2026-07-27**
after four independent readiness rounds scored the wider version between 6.75 and 7.40
without converging on 8.0.

That narrowing is the important part of this history, so it is recorded rather than
smoothed over. The wider PRD carried three defects: this one, plus two in the §9 Open
Questions reader. Across four rounds the §9 work produced **every unresolved** blocking finding — the
exemption grammar moved to a new hiding place four consecutive times, each move created by
the previous fix. This defect drew [P1]s of its own in rounds one and two, and they were
**closed**: the second whole-row reader, the malformed-row channel, the public-API break and
the undeclared surface are all resolved below. The accurate claim is that the §11 objections
were answered and stayed answered, not that they never existed. The §9 work moves
to PRD-028, which is a fair description of what the evidence says: two unrelated problems
were sharing a document, and the smaller one was being held hostage.

**The defect.** `parseVerificationCommands` iterates every backtick span on an `| FR-N` row
(`safety.ts`), so a backticked token in the **Scope** or **Notes** cell becomes a gate
command. Allowlisted, it silently joins the Phase-5 gate; non-allowlisted, it fails the
readiness lint for prose.

**The hazard is measured, and the measurement is dated because it moves.** Re-run
2026-07-28 by grepping every `| FR-N` row in the wip corpus and cell-splitting it:

| PRD | Row | Token | Effect | State of this row |
| --- | --- | ----- | ------ | ----------------- |
| PRD-021 | FR-8 | `pnpm build` | **allowlisted — it silently joined the Phase-5 gate**, declared by nobody | **archived** 2026-07-27 to `_prds/completed/`; the row survives at `prd-021-governance-truth-up.md:1278` |
| PRD-026 | FR-5 | `pack-manifest.json` | inert, excluded as a file path (`safety.ts:51-58`) | live in wip |
| PRD-027 | FR-7 | `sections/content.ts` | inert, same | gone — that Notes cell is prose now |

**Read the two numbers separately, because only one of them is the case for this work.**

- **Live count in the wip corpus today: zero.** PRD-021's instance archived with its PRD and
  PRD-027's was edited away, leaving only PRD-026's inert file path. Claiming a live hazard
  would be false, so it is not claimed.
- **Proven instances of the class: one, dated and still readable.** PRD-021 FR-8 is the
  existence proof — a real command, in a real PRD, silently executing at Phase 5 because a
  Notes cell explained it. That row was written by an author who did not know they were
  declaring a gate command, and nothing about the parser has changed since.

The class is what this PRD fixes, and a reader who wants the current live count should re-run
the grep rather than trust this paragraph. The defect's cost is not the size of today's
sample: the parser is unchanged, so the next author who backticks a command in a Notes cell
reproduces PRD-021 FR-8 exactly, and the one inert token still in the corpus sits a single
edit away from being that author.

`_brain/learnings/notes-column-runs-commands.md` predicted this exactly, and its "how to
apply" ends with *fix it in the parser*. Its interim guidance — keep backticks out of Notes
— retires with the fix.

---

## 2. Goals

### Primary Goals

- [ ] Make the §11 reader read the Command column, which is the span its claim is about.
- [ ] Give a malformed row somewhere to be reported, so an unreadable table cannot report
      success over an unknown gap.
- [ ] Preserve the exported signature and every existing consumer, so nothing published
      moves.
- [ ] Land it with a corpus pass over live wip PRDs, run by a command that actually executes
      the lint — not a bundle that never calls it — asserting the §11 issue class this PRD
      owns, enumerated as an exact set of issue-string predicates (FR-2), rather than a
      whole-lint green the corpus does not carry.
- [ ] Bind that corpus pass to the configured artifact root, so a rename of the root fails a
      named test instead of quietly moving the reads outside the turbo cache key.
- [ ] Retire `notes-column-runs-commands`'s interim guidance in the same change that removes
      its hazard, so the record does not outlive its fix.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Backticked tokens outside the Command column that reach the gate | 0 in the wip corpus on 2026-07-28 — one such token is present, PRD-026 FR-5's `pack-manifest.json`, and `safety.ts:51-58` excludes it as an inert path before it can become a command; 1 reached the gate on 2026-07-27, allowlisted, in PRD-021 FR-8 | 0, and structurally rather than by sample | FR-1 fixtures plus the FR-2 corpus pass |
| Backticked tokens merely present outside the Command column | 1 on 2026-07-28 (inert); 3 on 2026-07-27 | 0 required, since none can reach the gate after FR-1 | the same cell-split census |
| Commands executing at Phase 5 that no author declared | 0 live on 2026-07-28; 1 proven, in the now-archived PRD-021 FR-8 | 0, unreachable rather than absent | the same |
| Reporting channels for a malformed §11 row | 0 — the parser returns a bare array | 1, surfaced at readiness and refused at run | FR-1 fixtures |
| §11 sections a document may declare | unbounded; only the first is read | exactly 1 | FR-1 fixture |
| Corpus commands that do not execute the rule they verify | 1 — the repo bundle never calls the readiness lint | 0 | FR-2's row names a command that calls it |

---

## 3. User Stories

#### User Story 1

```
As an implementing agent whose §11 Notes column explains a command,
I want prose in Notes to stay prose,
so that the runner executes the commands I declared and nothing else.
```

**Acceptance Criteria:**

- [ ] A backticked token in the Scope or Notes cell is neither executed nor linted as a
      command.
- [ ] Every backticked command in the Command column is still parsed exactly as today,
      including in a two-column table.

#### User Story 2

```
As an owner reading a green gate report,
I want an unreadable §11 row to stop the run,
so that "all commands passed" cannot mean "the commands I could read passed".
```

**Acceptance Criteria:**

- [ ] A malformed row fails the readiness lint.
- [ ] The chain refuses rather than executing the rows it could read.

#### User Story 3

```
As a maintainer landing a stricter lint,
I want the corpus pass to run the lint I changed and to assert the rule I changed,
so that its verdict is evidence about my change rather than about everyone else's.
```

**Acceptance Criteria:**

- [ ] The corpus command invokes the readiness lint over every wip PRD and asserts, per file,
      that no §11-parser-class issue is reported — the class this change owns, rather than the
      whole verdict, which turns on rules this change never reads.
- [ ] That class is an enumerated set of issue-string predicates (FR-2's table), not a prose
      description, so two implementers reading it write the same test.
- [ ] A classification fixture pair proves the predicate discriminates: an unsafe command in
      the Command cell is reported in-class, and the same token in the Notes cell produces no
      issue at all.
- [ ] The same test asserts that a declared turbo input glob covers the configured artifact
      root, so the corpus it reads and the corpus turbo hashes cannot drift apart.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1 — Scope §11 command extraction to the Command column, and give malformed rows a
   channel.**

   **The row grammar is exact, and it accepts two-column tables.** Split the row on `|`,
   drop the empty leading and trailing components a fenced row produces, and trim each
   remaining cell. A row is **well-formed when it yields at least two cells**; the command
   comes from **cell 2**. Scope and Notes are cells 3 and 4 and are optional. A fifth or
   later cell is accepted and ignored — nothing declares one, and refusing it would be a
   rule with no occupant. Fewer than two cells is malformed.

   Two is the threshold, not three, and the difference is load-bearing: **four** existing test
   fixtures declare two-column tables (`safety.test.ts:89`, `prd-ready.test.ts:25`,
   `chain.test.ts:48`, and `single-package.test.ts:100-119`, which passes one through
   `buildGateChain`). A three-cell minimum would make every one of them malformed, change
   the lint's verdict on them and trip the new chain refusal — breaking this FR's own
   binding rule that no existing test may need editing to accommodate the guard. Re-measured
   2026-07-28 across the whole fixture corpus by cell-splitting every literal `| FR-N` row in
   `packages/provegate/test/`: **sixteen literal FR rows in six files — ten two-cell, four
   three-cell, two four-cell** — plus two four-cell rows from the template round-trip
   (`templates/prd-template.md:205-206`). The ten two-cell rows are exactly the four files
   named above; the two four-cell literals are `example-manifests.test.ts:60` and
   `value-score.test.ts:235`. An earlier revision of this paragraph said fifteen rows in five
   files with one four-cell, which undercounted `value-score.test.ts` — the aggregate was
   wrong while the load-bearing part, the ten two-cell rows, was right, and it is corrected
   here rather than left as an approximately-true number.

   **Splitting on the pipe is safe by contract, and the contract already exists.** The PRD
   template forbids a pipe character inside a backticked command in this table, so the
   constraint that makes the fix sound is one every conforming artifact already carries.

   **There are two readers of this table, not one, and scoping only the executor's leaves
   the hole open.** `lintPrd` independently decides whether a row carries a runnable command
   by scanning the **entire row** (`prd-ready.ts:133-148`). After scoping
   `parseVerificationCommands` alone, a Command cell holding no runnable command still
   passes readiness whenever the Notes cell contains an allowlisted token — and the executor
   then receives nothing from that row (`chain.ts:491`). Both readers take their cells from
   **one shared extraction function**, and neither re-splits the row for itself.

   **The malformed-row report needs a channel, and today there is none.**
   `parseVerificationCommands` returns `SafetyCheckedCommand[]` (`safety.ts:31-44`) and the
   executor consumes that array directly, so "report it" has nowhere to go.

   **Do not widen that function's return type.** It is exported from the package's
   programmatic API (`gates/index.ts:16`) and two existing tests consume it as an array
   (`safety.test.ts:62, 73, 94, 112`; `content-templates.test.ts:104`), so changing its
   shape is a breaking change to a published surface this PRD is not otherwise making. Add
   an **internal** row parser returning commands and issues together; the exported function
   stays as it is and returns the commands. It therefore keeps dropping malformed rows
   silently, which is the status quo for a programmatic caller and is stated here rather
   than discovered.

   **Both gate paths take the internal function.** `lintPrd` surfaces the issues as
   readiness failures, so a malformed row is caught at Phase 2. `buildGateChain` **refuses**
   when any issue is present rather than running the commands it did parse: a table with one
   unreadable row is a table whose gate coverage is unknown, and running the readable
   remainder would report success over an unknown gap —
   `unparseable-command-must-fail-loudly`.

   **Zero sections is not a parser issue, and the distinction is load-bearing.** A missing
   §11 already fails today, through the required-but-empty Phase-5 gate
   (`chain.ts:787-790`). **The existing test does not bind the zero-section case, and saying
   so is the point of citing it precisely:** `chain.test.ts:173-183` feeds the chain
   `'## 11. Verification Commands\n\nnothing\n'` — a document that **has** the section, whose
   body is the word `nothing`, and which therefore yields no runnable rows. It binds *one
   section, no rows*, which is a third case. So the zero-section proof is a **new** fixture,
   which the `chain.test.ts` row in §11 already requires, and the existing assertion is the
   compatibility control beside it rather than the evidence for it. Routing it through the new issue
   channel would replace that path with a different refusal and break the compatibility this
   PRD promises. So: **zero sections is a readiness-lint failure only** — `lintPrd` reports
   it, `buildGateChain`'s issue guard does not fire on it, and the existing empty-gate
   failure stands unchanged. Two or more sections **is** a parser issue and the chain refuses,
   because in that case the commands the parser returned are a subset of the ones declared
   and its coverage is genuinely unknown. An earlier revision made both cases parser issues
   and contradicted its own acceptance criteria.

   **Exactly one §11 section, because otherwise "any malformed row" is false.** §11 is
   selected by `sectionMatching` in both `safety.ts:45` and `prd-ready.ts:133`, which
   returns the **first** match and an empty string when there is none (`markdown.ts:90`). A
   malformed or unsafe row in a **second** verification section is invisible today. Use
   `sectionsMatching` (`markdown.ts:65`) and require exactly one: zero fails as missing, two
   or more fails as ambiguous. **Identify the section by its heading, not by a substring** —
   `sectionsMatching` is case-insensitive and substring-based (`markdown.ts:74`), so the
   heading must equal the canonical name after stripping an optional leading ordinal, and
   nothing more. Re-measured 2026-07-28: all ten PRDs in the wip directory declare exactly
   one, in the canonical form, so this narrowing costs nothing today.

   **Name the three new issue strings here, because FR-2's class predicate matches on them.**
   `lintPrd` reports `issues: string[]` with no diagnostic codes or structured kinds
   (`prd-ready.ts:98-101`), so an issue's identity **is** its text and a corpus test can match
   it only by prefix. Leaving the wording to the implementer would leave FR-2's assertion
   unwritable, so FR-1 fixes the prefixes:

   | Case | Exact issue prefix | Raised by |
   | ---- | ------------------ | --------- |
   | a row yielding fewer than two cells | `§11 row is malformed` | `lintPrd`, and the chain refuses |
   | no verification section | `§11 verification section is missing` | `lintPrd` only — the chain's issue guard does not fire on it, per the zero-section paragraph above; the existing required-empty Phase-5 failure stands |
   | two or more verification sections | `§11 verification section is declared more than once` | `lintPrd`, and the chain refuses |

   Detail may follow **these three** prefixes — the offending row, the section count — and
   the prefix is the part FR-2 matches, so appending detail never breaks predicates 1–3.
   **That sentence is deliberately scoped to the three new prefixes and not to the class's
   two existing members** (readiness W6): FR-2 matches the no-runnable-command issue
   full-match as it is emitted today, so that string — and the unsafe-command string —
   must not gain detail in this change. An implementation that wants provenance detail
   there is changing FR-2's predicate table, which is a different PRD. The wording is the
   file's own vocabulary rather than a new one: `lintPrd` already reports a duplicated section
   as `` `## Durable Artifacts` is declared more than once `` (`prd-ready.ts:192-193`).

   **The interim guidance retires in the same change.**
   `_brain/learnings/notes-column-runs-commands.md` predicted this defect exactly and its
   "how to apply" tells authors to keep backticks out of Notes. That workaround is obsolete
   the moment the parser is scoped. Edit the record — do not delete it — so the trap and its
   resolution stay discoverable together.
   - **Targets:** `packages/provegate/src/core/gates/safety.ts::parseVerificationCommands`,
     `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`,
     `packages/provegate/src/core/run/chain.ts::buildGateChain`,
     `packages/provegate/test/safety.test.ts`,
     `packages/provegate/test/content-templates.test.ts`,
     `packages/provegate/test/chain.test.ts`,
     `_brain/learnings/notes-column-runs-commands.md`,
     `packages/provegate/test/lint-parsers.test.ts` (new)
2. **FR-2 — A corpus pass that runs the lint it verifies.** FR-1 turns a silent pass into a
   failure, so it needs a corpus pass over live artifacts before it lands. PRD-023 named the
   repo bundle for this and that command never calls the readiness lint — the bundle
   executes only the scripts in its own list
   (`scripts/verify/verify-workflow.mjs:15-24, 62-64`), so it would have reported green over
   a corpus it never read. No corpus sweep flag exists for the readiness lint and this PRD
   does not add one.

   The runnable form is a package test: iterate every PRD under the **configured wip
   directory** and call the lint with the caller's real argument shape — config, manifest,
   content, **the repository root, and the PRD's own number**. That is **five** arguments,
   and it is what the sole production caller passes: `cli.ts:795` reads
   `lintPrd(config, manifest, content, root, found.record.number)`. Both trailing arguments
   are optional in the signature (`prd-ready.ts:109-119`) and both change the outcome here,
   so the fixture takes both:

   - **The root is not optional in practice.** `lintPrd` takes it fourth and, with memory
     enabled, omitting it fails with an unrelated missing-root error
     (`prd-ready.ts:181-185`); this repository enables memory. Measured: this PRD passes with
     the root and fails without it, for a reason that has nothing to do with the rule under
     test.
   - **The PRD number is not decoration either.** It reaches `valueScoreIssue`
     (`prd-ready.ts:178`, `value-score.ts:184-201`), which enforces the value header only
     from the configured `enforceFrom` id — `17` in this repository's `workflow.config.json`.
     Omit it and the id becomes undecidable, so a wip PRD missing its header passes the test
     while failing the real `gate check`. That is the same false green as the missing root,
     one parameter further along, and it was found by reading the caller rather than the
     signature.

   A call short of that shape is `fixture-must-reach-production-shape` violated in the FR that
   cites it. This is stated at five rather than four because the fifth parameter landed with
   PRD-021 after this FR was first written; re-read the call site rather than this sentence if
   the signature moves again.

   Read the directory from config rather than hardcoding it, so the test follows a
   repository that renames it.

   **What the corpus test asserts is the §11 issue class, not a green lint — and the
   difference is measured, not stylistic.** Method: `gate check` run per file over the
   configured wip directory as `node packages/provegate/dist/cli.js check PRD-NNN`, plus a
   cell-split census of every `| FR-N` row inside each file's verification section. Re-run
   2026-07-28 after PRD-036's creation, across the ten PRDs then in the wip directory:

   - **The whole lint is red in three of ten files, for reasons this PRD does not touch.**
     PRD-026 fails on three missing memory-input dispositions, PRD-031 on two, and PRD-034
     because its `## 4. Functional Requirements` heading carries **zero numbered `**FR-N**`
     entries** — the heading is present, so the diagnostic is `no functional requirements
     found` (`prd-ready.ts:123-125`) rather than a missing section. None of the three is a
     §11 parser outcome, and none of them is anything FR-1 changes in either direction.
   - **The §11 substance is clean across all ten.** **60 FR rows, zero malformed**, and
     **exactly one verification section each**, in the canonical heading form. The one
     backticked token outside a Command cell is PRD-026 FR-5's `pack-manifest.json`, which
     `safety.ts:51-58` excludes as an inert path before it can become a command.

   So a per-file assertion of *whole-lint green* is unwritable today, and writing it would
   force exactly the move the "report, never edit" paragraph below forbids. It is scoped to
   the class of issue FR-1 owns: **for every PRD in the configured wip directory, the lint
   reports no §11-parser-class issue.**

   **The class is an exact issue-identity set, not a description.** `lintPrd` returns
   `issues: string[]` (`prd-ready.ts:98-101`) — no codes, no kinds — so a class defined in
   prose is a class an implementer can satisfy three different ways. It is therefore
   enumerated, and membership is decided by matching an issue string against exactly these
   five predicates:

   | # | Predicate over an issue string | Origin |
   | - | ------------------------------ | ------ |
   | 1 | starts with `§11 row is malformed` | new in FR-1 |
   | 2 | starts with `§11 verification section is missing` | new in FR-1 |
   | 3 | starts with `§11 verification section is declared more than once` | new in FR-1 |
   | 4 | matches `^FR-\d+: §11 row has no runnable command$` | existing, `prd-ready.ts:148` |
   | 5 | starts with `unsafe §11 command` | existing, `prd-ready.ts:169-171` |

   Members 1–3 are the prefixes FR-1 fixes, quoted from its table rather than re-described.
   Predicate 4 is anchored full-match on purpose and predicate 5 is a prefix — the
   asymmetry mirrors the emitted strings: the no-runnable issue is a closed sentence
   today while the unsafe issue carries the command after its prefix. Neither existing
   string may gain detail in this change (FR-1 states the same rule from its side —
   readiness W6). The two existing members are **included deliberately, each for a stated
   reason**:

   - **4 is in because FR-1 changes the predicate that produces it.** Today `hasRunnable`
     scans the whole row (`prd-ready.ts:145-148`); after FR-1 it reads the Command cell only,
     so this issue's meaning moves even though its text does not. Measured 2026-07-28 across
     all ten wip PRDs: **zero rows trip it**, so including it adds no failure today while
     putting the changed predicate under the assertion. Inclusion costs nothing and silence
     would have cost the coverage.
   - **5 is in because after FR-1 every unsafe issue is a Command-cell issue by
     construction.** The parser reads only Command cells, so no cell-provenance qualifier is
     needed — and none is available: the emitted string is `unsafe §11 command (would be
     refused at run time): <cmd>` and carries no cell of origin. The earlier wording, "no
     unsafe-command issue raised from a cell other than the Command column", is **deleted as
     unimplementable** — it asked the test to read a fact the result does not contain.
     Measured the same day: zero unsafe-command issues across the corpus.

   **`FR-N: no §11 verification row` (`prd-ready.ts:142`) is deliberately OUT.** Its predicate
   is whether an FR has a row at all, keyed on the `| FR-N` line prefix, which FR-1 does not
   touch; a document with no §11 section at all is already caught by member 2. Including it
   would make the class fire on a §4-to-§11 authoring mismatch this PRD never reads.

   Every other issue the lint may report is that file's own business and the test neither
   asserts on it nor is made green by it.

   **A classification fixture pair proves the predicate discriminates, not just that it
   passes.** Two corpus-shaped fixtures, differing in one cell — and **lint-green apart
   from the planted cell** (readiness W7): each fixture either carries a conforming
   `Value` header or takes a PRD number below the configured `enforceFrom`, chosen
   deliberately rather than defaulted, and satisfies every other lint rule, so the
   negative control's "no issue at all" assertion can fail only on the rule under test —
   `assert-absent-needs-an-independent-cause` applied to the fixture's own conformance:

   - **Positive control** — a fixture whose **Command** cell holds an unsafe command must be
     reported, and reported **in-class** by predicate 5. A classifier that returns "no §11
     issue" for everything passes the corpus sweep vacuously; this fixture is the independent
     cause that `assert-absent-needs-an-independent-cause` requires.
   - **Negative control** — the same fixture with that unsafe token moved to the **Notes**
     cell must produce **no issue at all**: not out-of-class, not reclassified, absent. That
     is FR-1's whole behavior change, asserted through the same predicate the sweep uses.

   PRD-034 is the case that makes the scoping concrete rather than convenient: it has one
   canonical verification section and zero FR rows, so it carries **no** §11-parser-class
   issue and passes this assertion, while failing the whole lint on a §4 rule FR-1 never
   reads. A whole-lint assertion would have made PRD-034 a blocker for a parser fix that
   cannot affect it.

   The count is deliberately not fixed as a number, and 2026-07-28 is the evidence rather than
   the exception: the corpus moved **three times that single day** — PRD-035 arriving, PRD-030
   archiving to nine files, then PRD-036's creation returning it to ten files and sixty rows,
   the last of those landing after the nine-file measurement above was written and before it
   was scored. A pinned count is stale within hours here, so the test enumerates the directory
   rather than a list, and every number in this FR carries the date it was taken.

   FR-1 therefore introduces **no new failure anywhere in the live corpus**, and what it does
   change is a **relaxation** — a Notes or Scope cell is no longer read at all, so the tokens
   in §1 never reach the parser to be classified, which is the defect being fixed. **With the
   assertion scoped this way this PRD has no corpus prerequisite**, and that is now a measured
   statement rather than an inherited one: a prerequisite would exist only if some wip PRD
   carried a §11-parser-class issue that had to be remediated before the test could pass, and
   zero of the ten do. The three red files block nothing here because the test never asks them
   the question they fail.

   **Report, never edit — scoped to the same class.** If a wip PRD newly carries a
   §11-parser-class issue when the test is written, that is a finding for its author.
   **Allowlisting an expected §11-class failure is forbidden** — a sweep with a known-red
   exemption is the ledger-shaped bypass `known-red-ledger-must-expire` warns about, arriving
   in a test instead of a ledger. Stop and hand back. The scoping above is not that bypass
   wearing a different name: an allowlist names *files* and expires only when someone
   remembers it, while this scoping names the *rule* under test and admits no per-file
   exception at all. Completed PRDs are historical artifacts and are outside the sweep; they
   are never rewritten to manufacture compliance.

   **The corpus test reads outside its package, so its inputs are declared.** It reads PRDs
   at the repository root while `turbo.json:15-17` declares no additional inputs for the
   test task, so a change under the wip directory replays a stale green —
   `turbo-cache-masks-out-of-input-reads`, exactly. **The strategy is chosen rather than left
   as an either/or, and it is written in the one form this repository's own gate accepts:**
   set `"inputs": ["$TURBO_DEFAULT$", "$TURBO_ROOT$/_prds/**"]` on the `test` task in
   `turbo.json`, **and** add an entry keyed `"test"` to
   `scripts/verify/turbo-inputs-exceptions.json` carrying a written reason. All three parts
   are load-bearing, each verified against source on 2026-07-28:

   - `$TURBO_ROOT$/` is required because task `inputs` are **package-relative**. A bare
     `_prds/**` resolves under `packages/provegate/`, which holds no PRDs, so the glob would
     match nothing and the stale green would survive the fix written to remove it. Turbo
     2.10.5 is the pinned version and its binary carries the `$TURBO_ROOT$` and
     `$TURBO_DEFAULT$` microsyntax.
   - `$TURBO_DEFAULT$` is required because declaring `inputs` **replaces** the default hash
     set rather than adding to it (`node_modules/turbo/schema.json:585-590`). Omitting it
     drops the package's own `src/` and `test/` out of the cache key — a wider stale green
     than the one being fixed.
   - The exceptions entry is required because `scripts/verify/verify-turbo-inputs.mjs:60-68`
     **refuses any cached task that declares `inputs` at all** unless the task is named in
     `scripts/verify/turbo-inputs-exceptions.json` with a non-empty string reason. That file
     is `{}` today, and the check is the tenth member of the `verify:workflow` bundle
     (`scripts/verify/verify-workflow.mjs:15-24`) — the same bundle this PRD's own
     cross-cutting floor requires green. Without the entry FR-2 fails its own verification
     before it fails anything else. This is the path the verifier's header names for a task
     that genuinely needs `inputs`: an exceptions entry with a reason, a deliberate and
     reviewable act rather than a silent narrowing. The reason written there states what the
     narrowing is for — the test task reads repository-root PRDs that the package-default
     hash set cannot see — so the entry is falsifiable when the corpus test is removed.

   **The accepted cost, stated rather than discovered.** `turbo.json` declares **one generic
   `test` task** and every workspace inherits it, so this input applies to all of them: any
   change under `_prds/**` invalidates the test cache for `provegate`, `@provegate/design`
   and `web` alike, not only the package that reads PRDs. Narrowing it to one workspace
   would need a package-level `turbo.json` or a `//#`-scoped task, both new surface this PRD
   does not add. The trade is deliberate and it is the cheaper side: re-running two unrelated
   suites on a PRD edit costs build minutes, while an undeclared input costs a false green on
   the corpus sweep — which is the failure this whole PRD exists to remove.

   A separate uncached command was the other alternative and is rejected — it needs a new
   package script, a new manifest entry, and a second place for a check to be forgotten.

   **The glob is deliberately broader than the configured directory, because the two cannot
   track each other.** The test resolves the wip directory from config so a rename is
   followed; turbo `inputs` is a static list of glob patterns
   (`node_modules/turbo/schema.json:585-590`) and cannot read that config. Naming the exact
   configured path would mean that after a rename the test reads the new directory while the
   cache still watches the old one — a stale green produced by the very mechanism meant to
   prevent one. `$TURBO_ROOT$/_prds/**` covers every state directory the artifact root can
   hold, so it survives a rename of any subdirectory. **The invariant, stated so a later
   editor does not narrow it back:** this glob must remain at or above the artifact root,
   never at the configured wip path.

   **That invariant is asserted, not merely written down — a rename of the configured root
   breaks it silently otherwise.** The two halves are different kinds of thing: the test
   resolves its directory from `dirs.artifacts.prd.dir` (`config/types.ts:7`, default `_prds`
   at `config/defaults.ts:9`), while the declared input is the literal string
   `$TURBO_ROOT$/_prds/**`, and nothing connects them today. `verify:turbo-inputs` does not —
   it checks only that a task declaring `inputs` is named in the exceptions file with a
   non-empty reason (`scripts/verify/verify-turbo-inputs.mjs:59-69`), never what the globs
   cover. So a rename of the artifact root leaves the test reading the new directory while
   turbo hashes the old glob: the stale green this declaration exists to remove, re-created by
   the rename. The corpus test therefore carries a **coverage assertion** beside the sweep:

   - read `turbo.json` and take the `test` task's declared `inputs`;
   - resolve the configured artifact root from the same config object the sweep uses;
   - assert **at least one declared input glob sits at or above that resolved root**, reading
     `$TURBO_ROOT$/` as the repository root. A rename then fails this test **by name**, in the
     package suite, rather than silently reading outside the cache key.

   It is an assertion about this PRD's own declaration and nobody else's: one task, one root,
   both of which the corpus test already depends on.

   **Coordination with PRD-036, stated so the two do not collide.** PRD-036's FR-2 generalizes
   this into a census — every out-of-package read path in `packages/provegate/test/**`
   asserted against the `test` task's input globs — and that PRD **serializes behind this
   one** by its own Dependencies section, because its FR-1 extends the `inputs` array and the
   exceptions entry FR-2 creates. This PRD ships only the narrow self-coverage assertion
   above and does **not** enumerate any other test's reads; PRD-036 subsumes it when it lands.
   Shipping two versions of the census would be `two-parsers-wrong-together`, which is why the
   division is written here rather than discovered there.
   - **Targets:** `packages/provegate/test/lint-parsers.test.ts`, `turbo.json`,
     `scripts/verify/turbo-inputs-exceptions.json`

---

## 5. Non-Goals (Out of Scope)

- **The §9 Open Questions reader.** Both defects there — the substring-satisfiable deferral
  exemption and the bullets-only section filter — move to **PRD-028** with the four levels of
  hiding place four independent rounds uncovered. They are a separate problem that was
  sharing a document with this one, and the evidence for separating them is that every
  **unresolved** blocking finding across those four rounds came from that half. The §11 half
  drew [P1]s of its own in rounds one and two; they were closed and stayed closed, which is
  the opposite of what happened on the §9 side.
- **Section cardinality for §9 and the FR block.** `frBlocks` has the same first-match-only
  behavior (`prd-ready.ts:28`) and §9 the same again. Both go to PRD-028. Only §11's
  cardinality is here, because FR-1's own claim — the chain refuses when *any* row is
  malformed — is false without it.
- **A corpus sweep flag on the CLI.** PRD-026 adds sweep flags for the review and
  durable-artifact sections; a readiness-lint sweep is a plausible follow-on and is not
  needed to prove this fix.
- **The wiring audit, the practices pack, the installer, CI, or the manifest.** Those are
  PRD-025 and PRD-026. This PRD's blast radius is the surface declared in Implementation
  Scope and nothing beyond it.
- **Rewriting completed PRDs** to satisfy the stricter lint. Historical artifacts stand.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** an FR row whose Notes cell holds a backticked word, **When** the §11 parser
  runs, **Then** that word is not returned as a command — and **given** the same row's
  Command cell, **Then** its command is returned exactly as today.
- **Given** a row whose Command cell is prose and whose Notes cell holds an allowlisted
  command, **When** the readiness lint runs, **Then** the row fails as carrying no runnable
  command; **given** the same row with a real Command cell, **Then** it passes.
- **Given** a two-column row, **Then** its command is returned exactly as today; **given** a
  row yielding fewer than two cells, **Then** it is reported as malformed rather than
  skipped; **given** a row with five cells, **Then** the extras are ignored.
- **Given** a §11 table containing one malformed row and several valid ones, **When** the
  chain is built, **Then** it refuses before executing any of them.
- **Given** a document declaring two verification sections, **When** the chain is built,
  **Then** it refuses as well — the commands the parser returned are a subset of the ones
  declared, so coverage is unknown. The lint test alone does not bind this.
- **Given** a PRD with no verification section at all, **Then** its existing required-empty
  Phase-5 failure is unchanged — proved on a **new** fixture, because the existing
  `chain.test.ts:173-183` declares the section with no runnable rows, which is a different
  input.
- **Given** a document with two verification sections, or none, or whose only matching
  heading is a longer variant, **Then** the lint fails in each case.
- **Given** every PRD in the configured wip directory, **When** the corpus test runs,
  **Then** each file reports no §11-parser-class issue — membership decided by FR-2's five
  issue-string predicates and nothing else — **and given** a file that fails the lint for a
  rule outside that class, **Then** the corpus test still passes; **and given** a file that
  newly carries a §11-parser-class issue, **Then** it is reported by name rather than edited
  or allowlisted.
- **Given** a corpus-shaped fixture whose **Command** cell holds an unsafe command, **Then**
  the classifier reports it and reports it **in class**; **given** the same fixture with that
  token moved to the **Notes** cell, **Then** no issue is reported at all — neither in class
  nor out of it.
- **Given** the `test` task's declared `inputs` in `turbo.json` and the artifact root resolved
  from config, **When** the corpus test runs, **Then** it asserts that some declared glob sits
  at or above that resolved root; **and given** a rename of the configured root that the glob
  no longer covers, **Then** this assertion fails by name rather than the corpus reads moving
  silently outside the cache key.
- **Given** a caller of the exported parser, **Then** it still receives an array and the two
  existing consuming tests pass unchanged.

---

## 7. Technical Considerations

### Architecture

- **Read the span the claim is about.** The whole defect is a reader whose span is wider
  than the claim it reports on. The fix names the span: the Command column.
- **One extractor, two readers.** `lintPrd` and `buildGateChain` are genuinely separate
  consumers of this table. They share the extraction, or the hole stays open in whichever
  one nobody touched.
- **Fail loudly on malformed input.** The cell split introduces a new way for a row to be
  wrong. A parser that cannot classify a row must report it, never drop it —
  `unparseable-command-must-fail-loudly`, and the reason `false-green-on-missing-file`
  exists.
- **Preserve the published surface.** The internal-versus-exported split is the same
  discipline the Memory Input below applies to the chain guard: strictness goes where it was
  asked for, and nowhere else.
- **A class the test must match is a set, not a sentence.** `lintPrd` reports bare strings
  (`prd-ready.ts:98-101`), so "the §11-parser-class" is only as testable as the enumeration
  behind it. FR-2 lists the five predicates and FR-1 fixes the three new prefixes they match;
  a prose class over an untyped `string[]` is the same span-versus-claim mismatch this PRD
  exists to fix, one layer up in the test.
- **Assert the binding, not the intention.** The corpus directory is config and the cache key
  is a literal, so the only thing keeping them together is an assertion that reads both.

### Dependencies

- **None.** With FR-2's assertion scoped to the §11 issue class, and re-measured 2026-07-28
  after PRD-036's creation — zero of the ten wip PRDs carries an issue matching any of the
  five predicates, while three are red on rules this change never reads — this PRD has no
  corpus prerequisite and no ordering constraint against PRD-025, PRD-026 or PRD-028. It
  shares `prd-ready.ts` with PRD-021, PRD-026 and PRD-028, so those serialize on that file.
  Re-run `gate queue` before claiming rather than trusting this paragraph.
- **PRD-036 depends on this PRD, not the reverse.** Its FR-1 extends the `inputs` array and
  the exceptions entry FR-2 creates, and its own Dependencies section says so. Nothing here
  waits on it: FR-2's coverage assertion is deliberately narrow enough to ship first and be
  subsumed by PRD-036's census later.
- No new runtime dependencies; `packages/provegate` stays at zero.

### Rollback

Revert the shared cell extractor and the internal row parser, the `lintPrd` changes, the
§11 cardinality check, and **the `buildGateChain` refusal guard**; delete the new test file.
The turbo input and its exceptions entry revert **together and in that order** — removing the
`inputs` key while leaving the `"test"` entry in `scripts/verify/turbo-inputs-exceptions.json`
fails `verify:turbo-inputs` from the other direction, since the verifier also refuses an
exception naming a task that no longer declares `inputs`
(`scripts/verify/verify-turbo-inputs.mjs:74-77`). The exported signature never changed, so
nothing published moves in either direction. Any edit made to `safety.test.ts`,
`content-templates.test.ts` or `chain.test.ts` reverts with them.

**FR-1 changes executed commands, not only verdicts.** `buildGateChain` runs the parser's
output directly, so scoping the parser removes any command an existing PRD was accidentally
getting from its Notes cell. Measured 2026-07-28, no wip PRD is getting one today — PRD-021,
the one proven instance, archived on 2026-07-27 — so the executed set does not move for any
document currently in the pipeline. Forward that is the fix; backward a revert restores the
reachability. Neither direction is a silent no-op, and the reason to state it is that the
next PRD to write a backticked command in Notes gets it silently until this lands.

No state, artifact, config, or published-surface migration exists.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/gates/safety.ts` — column scoping, the row grammar, the
      internal row parser, §11 cardinality
- [ ] `packages/provegate/src/core/gates/prd-ready.ts::lintPrd` — consume the shared
      extractor and surface its issues
- [ ] `packages/provegate/src/core/run/chain.ts::buildGateChain` — refuse on parser issues
- [ ] `packages/provegate/test/lint-parsers.test.ts` (new) — fixtures plus the wip corpus
      pass
- [ ] `packages/provegate/test/safety.test.ts`, `test/content-templates.test.ts` — existing
      consumers of the preserved export, asserted unchanged
- [ ] `packages/provegate/test/chain.test.ts` — the refusal proofs for FR-1's guard: the
      malformed row **and** the duplicate section, plus the new zero-section compatibility
      fixture
- [ ] `turbo.json` — declare the artifact root as an input on the test task, as
      `["$TURBO_DEFAULT$", "$TURBO_ROOT$/_prds/**"]` (FR-2)
- [ ] `scripts/verify/turbo-inputs-exceptions.json` — the `test` entry with its written
      reason, without which `verify:turbo-inputs` refuses the line above and takes
      `verify:workflow` red (FR-2)
- [ ] `_brain/learnings/notes-column-runs-commands.md` — retire the interim guidance

---

## 9. Open Questions

- (none) — the defect is measured on the live corpus, the row grammar and cardinality rule are stated, and nothing here awaits an owner decision.

---

## 10. References

- `_brain/learnings/notes-column-runs-commands.md` — predicts this defect exactly; retired
  by FR-1
- `_brain/learnings/unparseable-command-must-fail-loudly.md` — governs the malformed-row
  channel
- `_brain/learnings/false-green-on-missing-file.md` — the class this defect belongs to
- `_readiness/wip/readiness-024-readiness-lint-parsers.md` — the full round history. Across
  the four rounds on the combined document, every **unresolved** blocking finding came from
  the §9 half now in PRD-028; the §11 [P1]s from rounds one and two were closed there
- PRD-023 §4 — where this defect was first written down

---

## Memory Inputs

- applied: `notes-column-runs-commands` — FR-1 implements the fix this record's interim
  guidance was standing in for, and retires that guidance in the same change.
- applied: `unparseable-command-must-fail-loudly` — the cell split creates a new
  malformed-row case, and both the lint and the chain must report it rather than drop it.
- applied: `false-green-on-missing-file` — this defect is a false green produced by a reader
  answering about a span it did not read; the fixtures assert the failure, not just the pass.
- applied: `assert-absent-needs-an-independent-cause` — every "this token is NOT a command"
  assertion needs a cause independent of the scenario. Each deny fixture is paired with a
  positive control on the same input: the Command column still yields its command, and a
  conforming table still passes.
- applied: `fixture-must-reach-production-shape` — the corpus test must call the lint with all
  five arguments the production caller passes (`cli.ts:795`). A short call fails on an
  unrelated memory error, or skips only missing-header enforcement from `enforceFrom` while
  the arithmetic and malformed-header checks still run (`value-score.ts:189-201`) — and either
  would have reported as coverage. The shape was re-read from the call site on 2026-07-28
  rather than carried from this FR's first draft, which said four.
- applied: `turbo-cache-masks-out-of-input-reads` — FR-2's corpus test reads PRDs at the
  repository root while the test task declares no additional inputs, so the artifact root
  becomes a declared input. That takes two files, and both are targets: `turbo.json` for the
  `$TURBO_DEFAULT$` + `$TURBO_ROOT$/_prds/**` list, and
  `scripts/verify/turbo-inputs-exceptions.json` for the entry without which this repository's
  own `verify:turbo-inputs` gate refuses the declaration.
- applied: `known-red-ledger-must-expire` — FR-2 forbids allowlisting an expected corpus
  failure. A sweep with a known-red exemption is this record's bypass arriving in a test
  rather than a ledger.
- applied: `two-parsers-wrong-together` — two reasons, both in FR-2. It is why the
  input-coverage census stays single: this PRD asserts only its own root-to-glob binding and
  PRD-036's FR-2 owns the general census, rather than two implementations of one claim
  agreeing on a wrong answer. And it is why the class predicate is bound to behavior — the
  classification fixture pair makes the deny case fail on the field it names, so a classifier
  that reports nothing cannot pass by agreeing with a corpus that asks it nothing.
- applied: `strictness-added-during-extraction-is-a-behavior-change` — FR-1 is exactly this
  record's shape: it extracts a shared cell reader and then adds a **fail-closed guard in
  `buildGateChain`** that the original never had, which is a decision the caller already
  owned. The strictness is deliberate and is the requirement, so the record's test binds it:
  **no existing test may need editing to accommodate the refusal.** If one does, the guard
  reached a case this PRD did not intend — revert and narrow, rather than updating the test.
  The preserved export signature is the same discipline applied to the API.

---

## Memory Outputs

- learning: `_brain/learnings/lint-must-name-the-span-it-judges.md` — that a section-scoped
  lint reporting a confident answer is the signature of a reader whose span does not match
  its claim, and that the same codebase shipped several independent instances before any was
  noticed.

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `packages/provegate/src/core/gates/safety.ts`
- `packages/provegate/src/core/gates/prd-ready.ts`
- `packages/provegate/src/core/run/chain.ts`
- `packages/provegate/test/lint-parsers.test.ts`
- `packages/provegate/test/safety.test.ts`
- `packages/provegate/test/content-templates.test.ts`
- `packages/provegate/test/chain.test.ts`
- `turbo.json`
- `scripts/verify/turbo-inputs-exceptions.json`
- `_brain/learnings/notes-column-runs-commands.md`
- `_brain/learnings/lint-must-name-the-span-it-judges.md`

**Contested, measured with `gate queue` on 2026-07-27:**
`packages/provegate/src/core/gates/prd-ready.ts` is claimed by PRD-021, PRD-026 and PRD-028.
Serialize; do not run this concurrently with any of them. Re-run `gate queue` before
claiming rather than trusting this paragraph.

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Review artifact: `_docs/reviews/review-024-readiness-lint-parsers.md`
- Learning: `_brain/learnings/lint-must-name-the-span-it-judges.md` — the Memory Output
  above, repeated here because the two lists are one contract
- Learning: `_brain/learnings/notes-column-runs-commands.md` — FR-1 retires this record's
  interim guidance; the record is edited, not deleted, so the trap and its resolution stay
  discoverable together
- Decision: `none` — no architectural decision is taken here; one reader is scoped to the
  span it already claimed to read

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                            | Scope | Notes |
| ---- | ---------------------------------------------------------- | ----- | ----- |
| FR-1 | `pnpm --filter provegate test test/lint-parsers.test.ts`    | pkg   | a Notes-cell backtick is not a command, the Command cell still is, a two-column row still yields its command, extra cells are ignored, and a row with fewer than two cells is reported rather than skipped |
| FR-1 | `pnpm --filter provegate test test/lint-parsers.test.ts`    | pkg   | a row whose Command cell is prose fails readiness even when Notes carries an allowlisted token; zero or duplicate verification sections each fail; a heading variant is not the section; and each of the three new issues is asserted under the exact prefix FR-1 names, since FR-2's class predicate matches on that text |
| FR-1 | `pnpm --filter provegate test test/chain.test.ts`           | pkg   | the chain refuses when any row is malformed, before executing the readable ones; it refuses again on a document declaring two verification sections, which is FR-1's other parser-issue rule and is proved here rather than only in the lint test; a table with no malformed row behaves exactly as today; a PRD with no verification section at all keeps its existing required-empty failure, on a new fixture — the one at line 173 declares the section with no runnable rows, which is a third case |
| FR-1 | `pnpm --filter provegate test test/safety.test.ts`          | pkg   | the exported parser still returns an array and every existing assertion passes unchanged |
| FR-2 | `pnpm --filter provegate test test/lint-parsers.test.ts`    | pkg   | the corpus pass: every PRD in the configured wip directory run through the readiness lint with all five production arguments, asserting per file that no §11-parser-class issue is reported — class membership decided by the five issue-string predicates FR-2 enumerates and by nothing else, and a file red on a rule outside that class does not fail the sweep |
| FR-2 | `pnpm --filter provegate test test/lint-parsers.test.ts`    | pkg   | the classification fixture pair: an unsafe command in the Command cell is reported in class, the same token in the Notes cell yields no issue at all; plus the cache-coverage assertion — a declared input glob of the test task sits at or above the artifact root resolved from config, so a rename of that root fails here by name instead of moving the corpus reads outside the cache key |
| FR-2 | `pnpm --filter provegate test`                              | pkg   | the whole package suite stays green — no existing fixture changed meaning |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm verify:workflow` — the repo bundle stays green

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/lint-parsers.test.ts` — the Notes-cell token, the
  prose-Command row, the malformed row, and the duplicate section must each **fail** the
  lint; `packages/provegate/test/chain.test.ts` — the malformed row and the duplicate section
  must each make `buildGateChain` **refuse**, since a rule proved only at the lint is a rule
  the executor can contradict. A fixture that only passes on good input is not evidence.
- Contract test: n/a — no client-to-server payload ships.

Before Phase 2 PASS, run: `gate check PRD-024`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` plus narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT scope only `parseVerificationCommands`. `lintPrd` has its own whole-row scan; both
  readers take their cells from one shared extractor or the hole stays open in the reader
  nobody touched.
- DO NOT change the return type of the exported parser. It is exported and two existing
  tests consume it as an array; widening it is a breaking change to a published surface this
  PRD is not otherwise touching. Add an internal parser and keep the export.
- DO NOT set the well-formed threshold at three cells. **Four** existing test files declare
  two-column tables, carrying ten rows between them; a three-cell minimum would make every
  one of those rows malformed and trip the new guard.
- DO NOT silently skip a §11 row that fails to split. An unclassifiable row is reported, or
  the change is a new false green replacing an old one.
- DO NOT let the chain run the rows it could read when another row is malformed, or when the
  document declares a second verification section. Partial coverage reported as success is
  the failure this FR exists to prevent, and both cases produce it.
- DO NOT prove the duplicate-section rule at the lint only. FR-1 states that the chain
  refuses on it; a rule with no chain-level proof is one an implementation can pass every
  named test while contradicting.
- DO NOT edit `chain.ts`, `prd-ready.ts`, or the existing test files without them being in
  the Conflict Surface. They are.
- DO NOT call the readiness lint short of its five production arguments anywhere in the
  fixtures. The fourth is the repository root, whose absence fails for a reason unrelated to
  the rule under test; the fifth is the PRD number, whose absence skips only
  missing-header enforcement from `enforceFrom` — the arithmetic and malformed-header checks
  still run (`value-score.ts:189-201`) — and so passes a header-less file the real
  `gate check` refuses.
- DO NOT let the corpus test run inside a cached task without declaring what it reads. A
  stale green over a corpus the task never re-read is this defect's own shape, in a build
  tool instead of a parser.
- DO NOT declare that input without `$TURBO_DEFAULT$`, without the `$TURBO_ROOT$/` prefix, or
  without the exceptions entry. Dropping the default empties the package's own files from the
  cache key; dropping the prefix resolves the glob inside the package, where no PRD lives; and
  dropping the entry makes `verify:turbo-inputs` refuse the change outright, taking
  `verify:workflow` — this PRD's own floor — red.
- DO NOT delete the exceptions entry while leaving the `inputs` key, or the reverse. The
  verifier refuses both halves of that pair separately.
- DO NOT allowlist a PRD that carries a §11-parser-class issue to make the corpus green.
  Report it and stop. Scoping the assertion to that issue class is not the same move: it
  names the rule under test and admits no per-file exception, where an allowlist names files
  and expires only when someone remembers it.
- DO NOT widen the corpus assertion to whole-lint green. Three of ten wip PRDs are red today
  on rules FR-1 never reads, so that assertion is unwritable without the allowlist the line
  above forbids.
- DO NOT re-express the §11-parser class as a description in the test. It is the five
  predicates FR-2 enumerates, matched against `lintPrd`'s issue strings. A regex like
  `/§11/`, "every unsafe string", and "no unsafe string" all satisfy a prose class and are
  three different tests — which is the whole reason the set is written out.
- DO NOT drop the two existing members from the class. The no-runnable-command issue is in
  because FR-1 changes the predicate that produces it, and the unsafe-command issue is in
  because after FR-1 every such issue is a Command-cell issue. Both measure zero across the
  corpus today, so neither can be dropped for costing something.
- DO NOT ask the test to read a cell of origin off an unsafe-command issue. The emitted
  string carries none (`prd-ready.ts:169-171`); the provenance comes from FR-1 restricting
  what the parser reads, not from the diagnostic.
- DO NOT ship the turbo input without the assertion that binds it to the configured artifact
  root. `verify:turbo-inputs` checks only that the exception reason is non-empty
  (`scripts/verify/verify-turbo-inputs.mjs:59-69`), so a rename of the root would otherwise
  move the corpus reads outside the cache key in silence — this defect's own shape, arriving
  through the fix for it.
- DO NOT grow that assertion into PRD-036's census. It covers this test's one root and one
  task; enumerating every out-of-package read is PRD-036's FR-2, which serializes behind this
  PRD, and two implementations of the same census is `two-parsers-wrong-together`.
- DO NOT pull any §9 Open Questions work back into this PRD. It is PRD-028's, and the reason
  is on the record: across four independent rounds every **unresolved** blocking finding came
  from that half, while this half's round-one and round-two [P1]s were closed and drew no
  successor.
- DO NOT delete `notes-column-runs-commands.md` when its hazard is fixed. Edit it, so the
  trap and its resolution stay discoverable together.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-28 | Claude Fable 5 (concurring scorer session), on owner Go | **Post-PASS precision edits: readiness watch items W6 and W7 applied, following the PRD-035 precedent of bounded watch-item edits recorded here rather than re-scored.** W6 — FR-1's "detail may follow a prefix" sentence was true of predicates 1–3 and silently false of predicate 4's `$`-anchored full-match; the sentence is now scoped to the three new prefixes in FR-1, and FR-2 states the asymmetry (4 full-match because the emitted string is a closed sentence, 5 prefix because the command follows it) with the rule that neither existing string may gain detail in this change. W7 — the classification fixture pair's negative control asserted "no issue at all" while the fixture's own conformance was unpinned; FR-2 now requires each fixture lint-green apart from the planted cell, with a conforming Value header or a PRD number below `enforceFrom` chosen deliberately, so the assertion can fail only on the rule under test. No FR renumbered, no predicate changed, no Value header change; `gate check PRD-024` re-run green after the edits |
| 2026-07-28 | Claude Fable 5 remediation session (round 2), on scorer handoff | **Closed readiness iteration 8's two [P1]s and its four P2s; every claim re-measured against live source before it was written, and the corpus had moved again by the time it was.** **(1) The §11-parser class is now an exact issue-identity set rather than a description.** `lintPrd` returns `issues: string[]` with no codes or kinds (`prd-ready.ts:98-101`), so a prose class is one an implementer can satisfy three different ways. FR-1 fixes the three new issue prefixes — `§11 row is malformed`, `§11 verification section is missing`, `§11 verification section is declared more than once`, in the file's own vocabulary (`prd-ready.ts:192-193`) and with the chain-versus-lint split marked per row — and FR-2 enumerates the class as **five predicates**: those three plus two existing issues, each included for a stated reason. The no-runnable-command issue (`prd-ready.ts:148`) is in because **FR-1 changes the predicate that produces it**, Command-cell-only reading moving its meaning while its text stays put; the unsafe-command issue (`prd-ready.ts:169-171`) is in because after FR-1 every unsafe issue is a Command-cell issue by construction. Both measure **zero across the corpus today**, so inclusion costs nothing and silence would have cost the coverage. The old qualifier "raised from a cell other than the Command column" is **deleted as unimplementable** — the emitted string carries no cell of origin, so no test can read it. `FR-N: no §11 verification row` (`:142`) is explicitly OUT with its reason. A **classification fixture pair** is now required: an unsafe command in the Command cell reported **in class** (the positive control `assert-absent-needs-an-independent-cause` demands, without which the sweep passes vacuously), and the same token in the Notes cell producing **no issue at all**. **(2) The turbo input is bound to the configured artifact root.** The corpus test resolves `dirs.artifacts.prd.dir` (`config/types.ts:7`, default `_prds` at `config/defaults.ts:9`) while the declared input is the literal `$TURBO_ROOT$/_prds/**`, and nothing connected them: `verify:turbo-inputs` checks only that the exception reason is a non-empty string (`scripts/verify/verify-turbo-inputs.mjs:59-69`), never what the globs cover — so a rename of the root would leave the test reading the new directory while turbo hashed the old one, this defect's shape arriving through its own fix. FR-2 now requires a coverage assertion inside the corpus test: read `turbo.json`, resolve the configured root, assert some declared `test`-task glob sits at or above it, so a rename fails **by name**. Coordination stated in both directions: **PRD-036's FR-2 generalizes this to every out-of-package read and serializes behind this PRD** by its own Dependencies section, so this PRD ships only the narrow self-coverage assertion and PRD-036 subsumes it — two censuses would be `two-parsers-wrong-together`. **(3) P2 sweep, all four verified before editing.** The success metric labeled "reach the gate" counted PRD-026 FR-5's `pack-manifest.json`, which `safety.ts:51-58` excludes as an inert path and which therefore never reaches the gate: the value is **0**, and a second row now carries the "merely present" count separately so neither number has to mean both. The fifth argument was overstated in two places — Memory Inputs and §12 said omission "skips/disables the value header check" where `value-score.ts:189-201` runs `scoreValueHeader` first and gates **only** the `absent` branch on the id: corrected to "skips only missing-header enforcement from `enforceFrom`; arithmetic and malformed-header checks still run". The PRD-034 example said it "declares no §4 FR section at all" where the file **has** the literal `## 4. Functional Requirements` heading at line 97 with zero numbered `**FR-N**` entries under it (`prd-ready.ts:123-125`); corrected in FR-2 and in the 2026-07-28 Changelog row's restatement, in place and bracketed, because this document uses Changelog claims as evidence. The 2026-07-27 row now opens with its superseded marker rather than being rewritten. **(4) Corpus re-measured, third same-day move.** PRD-036's conversion returned the wip corpus to **ten files and sixty rows** hours after the nine-file measurement was written — verified in git as the third change on 2026-07-28 alone (PRD-035 created, PRD-030 archived, PRD-036 created), which is now stated as the evidence for enumerating the directory rather than pinning a count. Independently re-run this round: ten files, **60 FR rows, zero malformed, exactly one canonical section each**, three red on rules FR-1 never reads (PRD-026 three memory dispositions, PRD-031 two, PRD-034 the FR-entry diagnostic), and **zero issues matching any of the five class predicates**. Nine→ten swept through FR-1's cardinality measurement, FR-2, §7 Dependencies and §12. No FR renumbered, no Value header change |
| 2026-07-28 | Claude Fable 5 remediation session, on scorer handoff | **Closed readiness iteration 7's four work items; every finding re-verified against live source before it was written, and two of them came back changed.** **(1) FR-2's turbo strategy now survives this repository's own gate.** It was specified as a bare `_prds/**` on the test task, which `scripts/verify/verify-turbo-inputs.mjs:60-68` refuses outright for any cached task — the exceptions file is `{}` and the check is the tenth member of the `verify:workflow` bundle this PRD's floor requires green, so FR-2 failed its own verification. Rewritten to `"inputs": ["$TURBO_DEFAULT$", "$TURBO_ROOT$/_prds/**"]` plus a reasoned `"test"` entry in `scripts/verify/turbo-inputs-exceptions.json`, with each of the three parts justified separately: the prefix because task inputs are package-relative and a bare glob resolves where no PRD lives, the default because `inputs` replaces rather than extends the hash set, the entry because the gate demands it. `$TURBO_ROOT$`/`$TURBO_DEFAULT$` confirmed present in the pinned turbo 2.10.5 binary. The accepted cost is now stated rather than left to be discovered: one generic `test` task serves every workspace, so a PRD edit re-runs `provegate`, `@provegate/design` and `web` alike — deliberate, against stale-green. Exceptions file added to Targets, Implementation Scope and Conflict Surface, and the two-way revert order added to Rollback. **(2) FR-2's corpus expectation model is scoped to the §11 issue class.** Measured 2026-07-28 by `gate check` per file: three of the nine wip PRDs are red — PRD-026 on three missing memory-input dispositions, PRD-031 on two, PRD-034 on no §4 FR section **[corrected 2026-07-28: PRD-034 HAS the literal `## 4. Functional Requirements` heading and carries zero numbered `**FR-N**` entries under it; the diagnostic is `no functional requirements found` at `prd-ready.ts:123-125`, not a missing section]** — while the §11 substance is clean at **57 FR rows, zero malformed, exactly one canonical section each**. So the old "the corpus is green today" was false at the whole-lint level and true at the §11 level. The test now asserts per file that no §11-parser-class issue is reported, PRD-034 named as the case that makes the scoping concrete rather than convenient, and the distinction from an allowlist argued explicitly: this names the rule, an allowlist names files. "No corpus prerequisite" survives, re-derived from the measurement instead of inherited from the narrowing. **(3) The duplicate-section chain refusal has a named proof.** FR-1 states the chain refuses on two or more sections and no chain test held it; added to the `chain.test.ts` §11 row, the Gherkin criteria, Implementation Scope, the hard-cap deny list and DO NOT. Evidence precision alongside it: `chain.test.ts:173-183` feeds the chain a document that **has** its §11 section with the body `nothing`, so it binds one-section-no-rows, and the zero-section case needs the new fixture the row already required. **(4) Stale-claim sweep, plus two the handoff did not name.** §1's table re-anchored — PRD-021's `pnpm build` instance archived 2026-07-27 and PRD-027's token was edited away, so the live count is **zero** and the class proof is the dated archived row at `prd-021-governance-truth-up.md:1278`; success metrics and Rollback follow. "Three existing fixtures" corrected to four everywhere. The narrowing-history claim aligned in Non-Goals, References and DO NOT to the introduction's corrected "every **unresolved** blocking finding". Line anchors refreshed after PRD-021's fifth parameter: `prd-ready.ts:127-142` → `:133-148`, `:169-173` → `:181-185`, `:127` → `:133`. **Found while verifying, not in the handoff:** `cli.ts:654-655` no longer holds the caller — it is `cli.ts:795` and it passes **five** arguments, not four, the fifth being the PRD number that gates the value header from `enforceFrom: 17`; omitting it lets a header-less PRD pass the fixture while the real `gate check` refuses it, which is the same `fixture-must-reach-production-shape` failure one parameter further along. FR-2, the §11 table, DO NOT and the Memory Input updated to five. Also: the fixture census said fifteen rows in five files with one four-cell and undercounted `value-score.test.ts` — re-measured to **sixteen rows in six files, ten two-cell, four three-cell, two four-cell**; the load-bearing ten two-cell rows were right. No FR renumbered, no Value header change — scope is unchanged and the arithmetic still holds |
| 2026-07-27 | Claude Opus 5, on owner direction | **[Superseded where it conflicts with the 2026-07-28 correction row: the fixture census is sixteen rows in six files, the §11 [P1]s were closed after round two, and the three-live-token measurement is historical.]** **Narrowed to the §11 reader; the §9 Open Questions work moves to PRD-028 (owner decision after readiness iteration 4).** Four independent rounds scored the wider PRD 6.75, 6.83, 7.40, 6.95 without converging, and the evidence was unambiguous: **every blocking finding across those rounds came from the §9 half**, where the exemption grammar moved to a new hiding place four consecutive times, each move created by the previous fix. This defect drew no objection after round two. Two unrelated problems were sharing a document and the smaller one was being held hostage. What survives here is FR-1 in full — column scoping, the exact two-cell row grammar with its fifteen-row fixture measurement, the internal-versus-exported parser split that preserves the published signature, the shared extractor both readers use, and the chain refusal — plus §11 cardinality, which stays because FR-1's own claim that the chain refuses when any row is malformed is false without it, and the corpus pass. **The defect is now measured on the live corpus rather than argued**: three Notes-cell tokens reach the parser today and one of them, in PRD-021 FR-8, is allowlisted and therefore silently executing at Phase 5. **Every corpus prerequisite disappeared with the narrowing** — zero malformed rows and exactly one canonical verification section across all six wip PRDs — so this PRD now has no ordering constraint at all, where the wider version had five. Value re-scored 3.75 to 3.50 for the reduced scope |
| 2026-07-27 | Claude Opus 5, on owner direction | **Split from PRD-023**, carrying its FR-7 a/b/c plus the corpus-command defect iteration 6 found in it. Four readiness rounds and their remediations are recorded in `_readiness/wip/readiness-024-readiness-lint-parsers.md`; the findings that belonged to the §9 half travel with it to PRD-028. Created with `gate new` |
