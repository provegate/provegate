# PRD-024: Readiness Lint Parsers — Read the Span the Claim Lives In

> **Status**: Draft
>
> **Created**: 2026-07-27
> **Updated**: 2026-07-27
> **Author**: Claude Opus 5, for owner review
> **Audience**: Implementing Agent
> **Slug**: `readiness-lint-parsers`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: Three defects in the readiness lint's own document readers. No new
> flag, config key, or CLI command, and the exported programmatic signatures are preserved
> (FR-1). Two things do move besides verdicts, stated rather than glossed: the **commands
> executed in Phase 5**, since `buildGateChain` runs the parser's output directly, and the
> **set of documents that pass**, since all three lints get stricter. Not `test-hardening`
> because production parser code changes, not only tests.
> **Autonomous Close**: operator-gated
> **Value**: 3.75 (MF/UI/TL/AR/RM: 5/4/3/2/4)

<!-- 0.25*5 + 0.25*4 + 0.20*3 + 0.15*2 + 0.15*4
     = 1.25 + 1.00 + 0.60 + 0.30 + 0.60 = 3.75 -->

---

## 1. Introduction / Overview

Split from PRD-023 on owner direction, 2026-07-27, after four independent readiness rounds
scored that PRD in the high sixes and low sevens without converging on the 8.0 threshold. **Only the
independent rounds are counted anywhere in this document**; the self-scored ones are
recorded in that PRD's readiness artifact and are not evidence. The diagnosis
recorded there was size: three unrelated engineering problems held together by a thesis
rather than a shared surface, in a document where two live defects hid through five
adversarial reviews.

This PRD is the first of the three pieces and the only one with no dependency on the other
two. **It is not dependency-free.** FR-4's corpus pass cannot go green until PRD-021's §9
is remediated by its author — see FR-4, where that is a stated Phase-4 prerequisite.

**Three defects, one shape: each lint reads the wrong span of the document and reports a
confident answer about the span it did not read.** All three were found by inspection
during PRD-023's drafting and remediation rounds, and all three are measured:

| # | Lint | Reads | Should read | Symptom |
| - | ---- | ----- | ----------- | ------- |
| a | §11 verification commands (`safety.ts::parseVerificationCommands`) | every backticked span on an `\| FR-N` row | the **Command** column only | a backticked word in Scope or Notes becomes a gate command — allowlisted, it silently joins the gate; non-allowlisted, it fails the lint for prose |
| b | §9 Open Questions exemption (`prd-ready.ts::lintPrd`) | `/\(none\b\|deferred/i` anywhere in the bullet | an actual deferral target | a genuine unresolved question is invisible whenever it merely *mentions* the word |
| c | §9 Open Questions selection (`prd-ready.ts:149-153`) | lines matching `^\s*-\s+\S` | the section's whole claim | a section written as prose paragraphs reports **zero unresolved items whatever it contains** |

Defect (b) was measured on PRD-023's own draft: it listed three questions and the lint
reported two, because one named `verify-deferred`. Defect (c) was measured empirically by
the iteration-5 reviewer, who injected a bold, unresolved `**Q5 open …**` paragraph into
PRD-023 and watched `lintPrd` return `{ ok: true, issues: [] }`. Defect (a) is predicted
in full by `_brain/learnings/notes-column-runs-commands.md`, whose interim guidance ends
with "fix it in the parser".

**Why these three belong together and nothing else does.** They share a failure mode, a
fix discipline, and a blast radius. Each turns a silent pass into a failure, so each needs
the same corpus pass over live PRDs before it lands. None touches the practices pack, the
wiring audit, `init.ts`, CI, or the published CLI surface. That is the whole scope.

---

## 2. Goals

### Primary Goals

- [ ] Make each of the three lints read the span its claim is about.
- [ ] Fix the grammar rather than teach the parser more Markdown, per
      `narrow-the-grammar-not-the-parser`.
- [ ] Land each fix with a corpus pass over live wip PRDs, run by a command that actually
      executes the lint — not a bundle that never calls it.
- [ ] Retire `notes-column-runs-commands`'s interim guidance in the same change that
      removes its hazard, so the record does not outlive its fix.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Lints reading a wrong span of the document | 3 | 0 | the FR fixtures |
| Backticked tokens outside the Command column that reach the gate | every one on an FR row **except** inert file paths, which `safety.ts:51-58` already excludes | 0 | FR-1 fixture |
| Unresolved questions hidden by the word "deferred" | 1 measured (PRD-023 draft: 3 listed, 2 reported) | 0 | FR-2 fixture |
| Unresolved questions hidden by paragraph form | unbounded — a paragraph §9 reports 0 whatever it holds | 0 | FR-3 fixture, seeded from the reviewer's injected-Q5 case |
| Corpus commands that do not execute the rule they verify | 1 (`verify:workflow` for the readiness lint) | 0 | §11 rows name a command that calls `lintPrd` |

---

## 3. User Stories

#### User Story 1

```
As an author running `gate check` on a PRD,
I want the readiness lint to count the questions my §9 actually contains,
so that a green verdict means the section is resolved rather than mis-read.
```

**Acceptance Criteria:**

- [ ] An unresolved question fails the lint regardless of whether it is a bullet or a
      paragraph, and regardless of whether its text happens to contain "deferred".
- [ ] A legitimately deferred entry with a deferral target still passes.

#### User Story 2

```
As an implementing agent whose PRD's §11 Notes column explains a command,
I want prose in Notes to stay prose,
so that the runner executes the commands I declared and nothing else.
```

**Acceptance Criteria:**

- [ ] A backticked token in the Scope or Notes cell is neither executed nor linted as a
      command.
- [ ] Every backticked command in the Command column is still parsed exactly as today.

#### User Story 3

```
As a maintainer landing a stricter lint,
I want the corpus pass to run the lint I changed,
so that "the corpus is green" is evidence rather than an assertion.
```

**Acceptance Criteria:**

- [ ] The corpus command invokes `lintPrd` over every wip PRD and asserts per-file
      outcomes.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1 — Scope §11 command extraction to the Command column.**
   `parseVerificationCommands` iterates every backtick span on an `| FR-N` row, so a
   backticked word in the Scope or Notes cell becomes a gate command. Extract from the
   **second cell** only.

   **Splitting the row on `|` is safe by contract, and the contract already exists.** The
   PRD template forbids a pipe character inside a backticked command in this table, so the
   constraint that makes the fix sound is one every conforming artifact already carries.

   **The row grammar is exact, and it accepts two-column tables.** Split on `|`, drop the
   empty leading and trailing components a fenced row produces, and trim each remaining
   cell. A row is **well-formed when it yields at least two cells**; the command comes from
   **cell 2**. Scope and Notes are cells 3 and 4 and are optional. Fewer than two cells is
   malformed.

   **Extra cells are accepted and ignored.** Only cells 2, 3 and 4 are read; a fifth or
   later cell is neither an error nor a command. The measured corpus supports this: fifteen
   literal FR rows across five test files break down as ten two-cell, four three-cell and
   one four-cell, with the template round-trip adding two more four-cell rows. Nothing
   declares five, and refusing them would be a rule with no occupant and a nonzero chance of
   surprising an adopter.

   Two is the threshold, not three, and the difference is load-bearing: three existing test
   fixtures declare `| FR | Command |` tables with exactly two columns
   (`safety.test.ts:89`, `prd-ready.test.ts:25`, `chain.test.ts:48`). A three-cell minimum
   would make every one of them malformed, change `lintPrd`'s verdict on them, and trip the
   new chain refusal — breaking this FR's own binding rule that no existing test may need
   editing to accommodate the guard. An earlier revision said "at least three cells" in two
   places and would have done exactly that.
   **The malformed-row report needs a channel, and today there is none.**
   `parseVerificationCommands` returns `SafetyCheckedCommand[]` (`safety.ts:31-44`), and the
   executor consumes that array directly (`chain.ts:491`), so "report it" has nowhere to go.

   **Do not widen that function's return type.** It is exported from the package's
   programmatic API (`gates/index.ts:16`) and two existing tests consume it as an array
   (`safety.test.ts:62, 73, 94, 112`; `content-templates.test.ts:104`), so changing its
   shape is a breaking change to a published surface — which this PRD is not otherwise
   making and does not want to make. Add an **internal** `parseVerificationRows` returning
   `{ commands, issues }`; `parseVerificationCommands` stays exactly as it is and returns
   `rows.commands`. The exported function therefore keeps dropping malformed rows silently,
   which is the status quo for a programmatic caller and is stated here rather than
   discovered.

   **Both gate paths take the internal function.** `lintPrd` surfaces `issues` as readiness
   failures, so a malformed row is caught at Phase 2. `buildGateChain` **refuses** when
   `issues` is non-empty rather than running the commands it did parse: a table with one
   unreadable row is a table whose gate coverage is unknown, and running the readable
   remainder would report success over an unknown gap —
   `unparseable-command-must-fail-loudly`.

   **This FR therefore edits three source files and two existing tests, and all five are
   declared below.** An earlier revision required changes in `chain.ts` and `prd-ready.ts`
   while naming neither, which its own DO NOT list forbids.

   **There are two readers of this table, not one, and scoping only the executor's leaves
   the hole open.** `lintPrd` independently decides whether a row carries a runnable command
   by running `row.matchAll(...)` across the **entire row** (`prd-ready.ts:127-142`). After
   scoping `parseVerificationCommands` alone, a Command cell holding no runnable command
   still passes readiness whenever the Notes cell contains an allowlisted token such as
   `pnpm test` — and the executor then receives nothing from that row
   (`chain.ts:491-495`). A row that passes the gate and executes nothing is the exact false
   green this PRD is about, arriving through the reader nobody scoped. **This is a fourth
   instance of this PRD's own defect class, found inside it.**

   Both readers take their cells from **one shared extraction function**, and neither
   re-splits the row for itself. Deny fixture: a row whose Command cell is prose and whose
   Notes cell holds an allowlisted command must fail readiness, paired with the control that
   the same row with a real Command cell passes.

   **The interim guidance retires in the same change.**
   `_brain/learnings/notes-column-runs-commands.md` predicted this defect exactly and its
   "how to apply" tells authors to keep backticks out of Notes. That workaround is
   obsolete the moment the parser is scoped. Edit the record — do not delete it — so the
   trap and its resolution stay discoverable together.
   - **Targets:** `packages/provegate/src/core/gates/safety.ts::parseVerificationCommands`,
     `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`,
     `packages/provegate/src/core/run/chain.ts::buildGateChain`,
     `packages/provegate/test/safety.test.ts`,
     `packages/provegate/test/content-templates.test.ts`,
     `packages/provegate/test/prd-ready.test.ts`,
     `packages/provegate/test/chain.test.ts`,
     `_brain/learnings/notes-column-runs-commands.md`,
     `packages/provegate/test/lint-parsers.test.ts` (new)
2. **FR-2 — The Open Questions exemption needs a deferral target, not a substring.**
   `lintPrd` filters `/\(none\b|deferred/i` over each bullet, so any bullet that mentions
   the word is exempt. Require what the template already states — "every entry explicitly
   deferred **with a link**" — but as a **closed form**, not a co-occurrence test.
   "Contains the word and contains a link" is still substring-satisfiable: *"Why was this
   deferred? See [background](…)"* passes it while remaining an open question. The exemption
   is a bullet whose entire content is one of exactly three forms:

   - `(none)`
   - `Deferred to <work-item-id>`, the identifier matching the configured id pattern
   - `Deferred: <markdown-link>`

   **End-anchored, with nothing after** — and **rationale has nowhere to go inside the
   section**, which is the fourth level of this hole and the last one. The progression is
   worth recording because each fix created the next: an opens-with rule let
   `- (none) — why is auth still undecided?` pass; refusing continuations left the same-line
   form; end-anchoring it pushed rationale into an HTML comment, and a comment holds
   `<!-- Who owns the authorization decision? -->` just as well. Comments are therefore
   **not** a permitted line form inside this section (FR-3), and the exempt bullet carries
   no prose at all. A `(none)` section needs no rationale: it asserts the section is empty,
   and anything worth saying about why belongs in the Decision Record or §10.

   **The matcher is defined, not left to the implementer.** Comparison is
   case-insensitive, matching today's behavior (`prd-ready.ts:153`); internal runs of
   whitespace collapse to one space and leading/trailing whitespace is trimmed, so
   `- Deferred to   PRD-123` is the same token sequence as `- Deferred to PRD-123`; the
   identifier must match the configured id pattern in full; and `<markdown-link>` means
   exactly `[text](target)` with a non-empty target. Nothing else is accepted.

   Deny fixtures: both same-line cases above; a comment carrying a question; an unresolved
   bullet containing the word and an unrelated link; and a `Deferred:` whose target is
   empty.

   **Do not fix this by deleting the `deferred` exemption.** The template promises a
   deferral-with-a-link escape and removing it outright would break PRDs that legitimately
   use it. The `(none` exemption is unchanged: it marks an empty section, not a deferred
   entry.
   - **Targets:** `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`,
     `packages/provegate/test/lint-parsers.test.ts`
3. **FR-3 — The Open Questions section must be a bullet list, so prose cannot hide in it.**
   The filter keeps only lines matching `^\s*-\s+\S`, so a §9 written as bold paragraphs —
   PRD-023's was, and PRD-021's still is — reports zero unresolved items whatever it
   contains. Per `narrow-the-grammar-not-the-parser`, restrict what the document may contain rather
   than teaching the filter to read paragraphs. **The accepted line forms are enumerated,
   because "other than a leading explanatory line" is itself an exemption a question can
   hide in** — nothing syntactically distinguishes an explanation from an unresolved
   question, so exactly one paragraph-form question would survive. Inside the section, a
   **There must be exactly one Open Questions section, identified by its heading and not by
   a substring.** `sectionMatching` returns the **first** match and `''` when there is none
   (`markdown.ts:90`), and the lint uses it (`prd-ready.ts:149`). So a document with two
   `## 9. Open Questions` headings has its second — and every question in it — invisible, and
   a document with **no** such heading reports zero rather than failing. Use
   `sectionsMatching` (`markdown.ts:65`) and require exactly one: zero fails as missing, two
   or more fails as ambiguous.

   **Counting matches of `.*Open Questions.*` is not enough**, because that pattern is
   case-insensitive and substring-based (`markdown.ts:74`): a document whose only heading is
   `## Resolved Open Questions` has exactly one match and would pass — the precise trap this
   FR warns authors about. The heading must, after stripping an optional leading ordinal
   (`9.`), equal `Open Questions` case-insensitively and nothing more. Measured 2026-07-27:
   all six PRDs in the wip directory already use `## 9. Open Questions`, so this narrowing
   costs nothing today and closes the variant that would otherwise pass.

   **The same first-match hole exists in two other readers and is closed with it.** §11 is
   selected by `sectionMatching` in both `safety.ts:45` and `prd-ready.ts:127`, and the FR
   block by `frBlocks` at `prd-ready.ts:28`. A malformed or unsafe row in a **second**
   `## 11. Verification Commands` section is invisible today, which would make FR-1's "the
   chain refuses when any row is malformed" false as written. Require exactly one of each,
   by the same heading rule. Deny fixtures: zero and duplicate, for each of the three
   sections.

   Inside the Open Questions section, a line must be blank, a bullet start matching
   `^\s*-\s+\S`, or an **indented continuation** of the preceding bullet matching
   `^\s+\S`. **HTML comments are not permitted here** — see FR-2: a comment is where the
   rationale went once the exempt form was end-anchored, and a comment holds a question as
   easily as prose does. Anything else fails, and there is **no** leading-prose allowance. A continuation line is part of its
   bullet, not a separate entry.

   **An exempt bullet must be a single line, and that asymmetry is the point.** Continuations
   are what let the hiding place move one level down: FR-2 exempts a bullet by how it
   **opens**, so `- (none)` followed by an indented unresolved question satisfies both rules
   at once and hides exactly what this FR removes. Nothing syntactic separates a rationale
   from a question, so per `narrow-the-grammar-not-the-parser` the grammar refuses the
   construction rather than trying to read it: **a bullet claiming an exemption — `(none)`
   or the FR-2 deferral form — may not carry continuation lines.** A genuine unresolved
   question may be as long as it needs; the thing being exempted must fit on one line, where
   a reader sees all of it. Deny fixtures: `(none)` with a continuation, and a deferred
   bullet with a continuation.

   **This PRD's own §9 is rewritten to comply**, from a wrapped bullet to a single line. A
   PRD proposing the rule must not be written in the shape it forbids — the same reason its
   §9 is a bullet list at all.

   **The destination for resolved history is named here, because the obvious one is a
   trap.** Authors moving resolved decisions out of §9 will reach for a heading like
   "Resolved Open Questions". `lintPrd` selects the section by the regex
   `.*Open Questions.*` over headings (`prd-ready.ts:149`), so that heading would be read
   as the live section and rebuild the defect under a new name. PRD-023 already
   demonstrates the working shape: a `## Decision Record` section, whose heading contains
   none of the selector's words. Say so in the failure message, so an author hitting this
   lint is told where the content goes.
   - **Targets:** `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`,
     `packages/provegate/test/lint-parsers.test.ts`
4. **FR-4 — A corpus pass that runs the lint it verifies.** All three fixes turn a silent
   pass into a failure, so each needs a corpus pass over live artifacts before it lands.
   PRD-023 named `pnpm verify:workflow` for this and that command never calls `lintPrd` —
   the bundle executes only the scripts in its `CHECKS` array
   (`scripts/verify/verify-workflow.mjs:15-24, 62-64`), so it would have reported green
   over a corpus it never read. No corpus sweep flag exists for the readiness lint and
   this PRD does not add one.

   The runnable form is a package test: iterate every PRD under the **configured wip
   directory** and call `lintPrd` with the caller's real argument shape —
   `lintPrd(config, manifest, content, root)`, four arguments, as `cli.ts:654-655` passes
   them. **The root is not optional here.** `lintPrd` takes it fourth
   (`prd-ready.ts:108-113`) and, with memory enabled, omitting it fails with the unrelated
   error *"memory is enabled but the readiness lint received no repository root"*
   (`prd-ready.ts:169-173`); this repository enables memory. Measured: this PRD passes with
   `root` and fails without it, for a reason that has nothing to do with the rules under
   test. A three-argument call is `fixture-must-reach-production-shape` violated in the FR
   that cites it.

   Read the directory from config rather than hardcoding `_prds/wip`, so the test follows a
   repository that renames it.

   **The corpus test reads outside its package, so its inputs are declared.** It reads PRDs
   at the repository root while `turbo.json:15-17` declares no additional inputs for the
   test task, so a change under the wip directory replays a stale green —
   `turbo-cache-masks-out-of-input-reads`, exactly. **The strategy is chosen here rather
   than left as an either/or:** add the configured wip directory to the `test` task's
   `inputs` in `turbo.json`. A separate uncached command was the alternative and is
   rejected — it needs a new package script, a new manifest entry, and a second place for a
   check to be forgotten, which is what PRD-025 and PRD-026 exist to reduce. `turbo.json` is
   the only added file.

   **Scope to wip deliberately.** Completed PRDs are historical artifacts and are never
   rewritten to manufacture compliance. **Report, never edit:** a wip PRD that newly fails
   is a finding for its author.

   **The corpus blockers are five, not one, and they are named.** An earlier revision
   called PRD-021 "the" blocker; the end-anchored exemption of FR-2 has a wider blast radius
   than that, and it was not measured when it was written. Measured 2026-07-27 across the
   configured wip directory:

   | PRD | Why it fails today |
   | --- | ------------------ |
   | PRD-021 | §9 is paragraph-form, so FR-3 rejects it |
   | PRD-023 | `- (none)` followed by trailing prose and a continuation |
   | PRD-025 | same |
   | PRD-026 | same |
   | PRD-027 | `- [ ] none.` — a checkbox form, which is not one of FR-2's three exempt forms |

   Only PRD-024 conforms, and it conforms because it was rewritten to. **Each fix is one
   line** — move the prose out of the bullet — and four of the five are in this same wave
   and under active revision anyway, so the coordination cost is real but small. They are
   Phase-4 prerequisites: this PRD reports, never edits, and **allowlisting a known failure
   is forbidden**, so the corpus cannot go green until their authors act.

   The corpus itself is whatever the configured wip directory holds **when the test runs** —
   deliberately not a number, because that count changed twice during this PRD's own
   readiness rounds. This PRD cannot reach a green corpus until PRD-021's §9 is remediated by its own
   author. **Allowlisting an expected failure in the corpus test is forbidden** — a sweep
   with a known-red exemption is the ledger-shaped bypass `known-red-ledger-must-expire`
   warns about, arriving in a test instead of a ledger. Stop and hand back.
   - **Targets:** `packages/provegate/test/lint-parsers.test.ts`, `turbo.json`

---

## 5. Non-Goals (Out of Scope)

- **Any other PRD's §9.** FR-4 reports; it never edits. PRD-021 is the case that will fail,
  and it is a **Phase-4 prerequisite** rather than a curiosity: this PRD cannot reach a
  green corpus until its author remediates it, and allowlisting the failure is forbidden.
- **A `gate check --prds` corpus sweep flag.** PRD-026 adds sweep flags for the review and
  durable-artifact sections; a readiness-lint sweep is a plausible follow-on and is not
  needed to prove these three fixes.
- **The wiring audit, the practices pack, `init.ts`, CI, or the manifest.** Those are
  PRD-025 and PRD-026. This PRD's blast radius is the surface declared in Implementation
  Scope — three source files, three test files, one memory record and `turbo.json` — and
  nothing beyond it. An earlier revision said "two parser functions and one test file",
  which stopped being true when FR-1 grew its caller edits.
- **Rewriting completed PRDs to satisfy the stricter lints.** Historical artifacts stand.
- **Teaching either parser more Markdown.** The fix for (c) is a grammar restriction. A
  hand-rolled Markdown reader never reaches renderer parity, which is the whole point of
  `narrow-the-grammar-not-the-parser`.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** an `| FR-N |` row whose Notes cell holds a backticked word, **When** the §11
  parser runs, **Then** that word is not returned as a command — and **given** the same
  row's Command cell, **Then** its command is returned exactly as today.
- **Given** an `| FR-N |` row that yields fewer than **two** cells, **When** the parser
  runs, **Then** it reports the row as malformed rather than skipping it — and **given** a
  two-column `| FR | Command |` row, **Then** its command is returned exactly as today.
- **Given** a document with two Open Questions sections, or none, or whose only matching
  heading is `## Resolved Open Questions`, **Then** the lint fails in each case; and
  likewise for two or zero Verification Commands sections.
- **Given** an exempt bullet followed by an HTML comment containing a question, **Then**
  the lint fails — comments are not a permitted line form inside that section.
- **Given** an Open Questions bullet that is genuinely unresolved and happens to contain
  the word "deferred", **When** the lint runs, **Then** it is counted as unresolved.
- **Given** an Open Questions bullet explicitly deferred **with** a link or a `PRD-NNN`
  identifier, **When** the lint runs, **Then** it is exempt.
- **Given** an Open Questions section written as bold paragraphs containing an unresolved
  question, **When** the lint runs, **Then** it fails — this is the reviewer's injected-Q5
  case, which returns clean today.
- **Given** an Open Questions section that is a bullet list holding `(none)`, **When** the
  lint runs, **Then** it passes.
- **Given** a section whose heading is "Resolved Open Questions", **When** the lint selects
  the Open Questions section, **Then** the failure message names the trap — the selector
  matches that heading, so it is not a valid destination for resolved history.
- **Given** every PRD in the configured wip directory, **When** the corpus test runs,
  **Then** each file's outcome matches its expectation, and a newly failing file is
  reported by name rather than edited.

---

## 7. Technical Considerations

### Architecture

- **One shape, three instances.** Every defect here is a reader whose span is wider or
  narrower than the claim it reports on. The fix in each case is to name the span: the
  Command column, a deferral target, a bullet list. Nothing here needs new machinery.
- **Grammar over parser.** (c) is the sharp case and the temptation is to teach the filter
  to recognize bold paragraphs. That is the road to renderer parity. Restrict what §9 may
  contain and say where the rest goes.
- **Fail loudly on malformed input.** (a)'s cell split introduces a new way for a row to be
  wrong. A parser that cannot classify a row must report it, never drop it —
  `unparseable-command-must-fail-loudly`, and the reason `false-green-on-missing-file`
  exists.

### Dependencies

- **None on PRD-025 or PRD-026.** This is the piece of PRD-023 that neither of the other
  two blocks, which is why it is first. It is **not** unordered: PRD-021's §9 remediation is
  a Phase-4 prerequisite (FR-4).
- **`prd-ready.ts` overlap, measured 2026-07-27:** PRD-021 claims it, and PRD-026 claims
  `lintPrd` for its Durable Artifacts declaration lint. Re-run `gate queue` before
  claiming — this PRD's own overlap list is not evidence, as three stale counts in the
  PRD-023 wave demonstrated.
- No new runtime dependencies; `packages/provegate` stays at zero.

### Rollback

Revert the shared cell extractor and the internal `parseVerificationRows`, the `lintPrd`
changes, and **the `buildGateChain` refusal guard**; delete the new test file and the
`turbo.json` input. The exported `parseVerificationCommands` signature never changed, so
nothing published moves in either direction. Any edit made to `safety.test.ts` or
`content-templates.test.ts` reverts with them — though per the Memory Input below, needing
such an edit at all is a signal to narrow the guard rather than to proceed. The
`notes-column-runs-commands` edit reverts with them — its interim guidance is only obsolete
while the parser is scoped.

**FR-1 changes executed commands, not only verdicts, and the rollback must say so.**
`buildGateChain` runs `parseVerificationCommands`' output directly (`chain.ts:491-495`), so
scoping the parser removes any command an existing PRD was accidentally getting from its
Notes cell. Forward, that is the fix. Backward, a revert restores those accidental
commands. Neither direction is a silent no-op, and any PRD relying on Notes-cell execution
is a finding to report before this lands, not after.

No state, artifact, config, or published-surface migration exists: no flag, config key, or
pack file changes.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/gates/safety.ts::parseVerificationCommands` — column scoping
- [ ] `packages/provegate/src/core/gates/prd-ready.ts::lintPrd` — the two §9 fixes, plus
      consuming the internal row parser (FR-1)
- [ ] `packages/provegate/src/core/run/chain.ts::buildGateChain` — refuse on parser issues
- [ ] `packages/provegate/test/safety.test.ts`, `test/content-templates.test.ts` — existing
      consumers of the preserved export, asserted unchanged
- [ ] `packages/provegate/test/prd-ready.test.ts` — its `(none — resolved)` fixture no
      longer conforms to FR-2 and must be updated; a declared, deliberate lint change
- [ ] `packages/provegate/test/chain.test.ts` — the refusal proof for FR-1's guard
- [ ] `turbo.json` — declare the wip directory as an input for the test task (FR-4)
- [ ] `packages/provegate/test/lint-parsers.test.ts` (new) — fixtures + the wip corpus pass
- [ ] `_brain/learnings/notes-column-runs-commands.md` — retire the interim guidance

---

## 9. Open Questions

- (none)

---

## 10. References

- `_brain/learnings/notes-column-runs-commands.md` — predicts FR-1 exactly; retired by it
- `_brain/learnings/narrow-the-grammar-not-the-parser.md` — governs FR-3
- `_brain/learnings/unparseable-command-must-fail-loudly.md` — governs FR-1's malformed-row
  case
- `_brain/learnings/false-green-on-missing-file.md` — the class all three defects belong to
- PRD-023 §4 FR-7 and `_readiness/wip/readiness-023-gate-self-hosting.md` §9 finding R —
  where these three were found and where the `verify:workflow` corpus-command defect was
  measured

---

## Memory Inputs

- applied: `narrow-the-grammar-not-the-parser` — FR-3 is this record's direct application:
  the §9 reader is a hand-rolled Markdown scanner, so the fix restricts what the section
  may contain instead of teaching it to read paragraphs.
- applied: `notes-column-runs-commands` — FR-1 implements the fix this record's interim
  guidance was standing in for, and retires that guidance in the same change.
- applied: `unparseable-command-must-fail-loudly` — FR-1's cell split creates a new
  malformed-row case, and the parser must report it rather than drop it.
- applied: `false-green-on-missing-file` — all three defects are false greens produced by a
  reader that answers about a span it did not read; the fixtures assert the failure, not
  just the pass.
- applied: `assert-absent-needs-an-independent-cause` — every "this token is NOT a command"
  and "this section does NOT pass" assertion here needs a cause independent of the
  scenario. Each deny fixture is paired with a positive control on the same input: the
  Command column still yields its command, and a conforming §9 still passes.
- applied: `fixture-must-reach-production-shape` — moved from `reviewed` to `applied` after
  an independent round measured the gap: the fixtures must call
  `lintPrd(config, manifest, content, root)` with all four arguments, because a
  three-argument call fails on an unrelated memory error in this repository and would have
  reported as coverage.
- applied: `turbo-cache-masks-out-of-input-reads` — FR-4's corpus test reads PRDs at the
  repository root while the test task declares no additional inputs, so a change under the
  wip directory would replay a stale green. Either the directory becomes a declared input or
  the sweep gets its own uncached command; `turbo.json` is a target either way.
- applied: `strictness-added-during-extraction-is-a-behavior-change` — FR-1 is exactly this
  record's shape and the risk is real, not ceremonial: it extracts a shared cell reader and
  then adds a **fail-closed guard in `buildGateChain`** that the original never had, which
  is a decision the caller already owned. The strictness is deliberate here and is the
  requirement. The record's test binds it anyway: **no existing test may need editing to
  accommodate the refusal.** If one does, the guard reached a case this PRD did not intend —
  revert it and narrow, rather than updating the test to match. The preserved export
  signature (FR-1) is the same discipline applied to the API.

  **This binds the extraction guard, not the lints.** FR-2 and FR-3 make the readiness lint
  deliberately stricter, so existing fixtures written against the old rules *will* change —
  `prd-ready.test.ts:23` uses `- (none — resolved)`, which FR-2 rejects, and it is declared
  in scope for exactly that reason. The distinction is the record's own: a lint whose rule
  the PRD changed on purpose is a behavior change with a corpus pass behind it; a guard that
  appears inside newly shared code and reaches a caller nobody warned is the defect. Only
  the second is forbidden.
- applied: `known-red-ledger-must-expire` — FR-4 forbids allowlisting an expected corpus
  failure. A sweep with a known-red exemption is this record's bypass arriving in a test
  rather than a ledger, and PRD-021's §9 is the case that would tempt it.

---

## Memory Outputs

- learning: `_brain/learnings/lint-must-name-the-span-it-judges.md` — that a
  section-scoped lint reporting a confident zero is the signature of a reader whose span is
  narrower than its claim, and that three independent instances shipped in one codebase
  before any was noticed.

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
- `packages/provegate/test/prd-ready.test.ts`
- `packages/provegate/test/chain.test.ts`
- `_brain/learnings/notes-column-runs-commands.md`
- `_brain/learnings/lint-must-name-the-span-it-judges.md`
- `turbo.json`

**Contested, measured with `gate queue` on 2026-07-27:**
`packages/provegate/src/core/gates/prd-ready.ts` is claimed by PRD-021 and by PRD-026.
Serialize; do not run this concurrently with either. Re-run `gate queue` before claiming
rather than trusting this paragraph.

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
- Decision: `none` — no architectural decision is taken here; three readers are scoped to
  the spans they already claimed to read

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                            | Scope | Notes |
| ---- | ---------------------------------------------------------- | ----- | ----- |
| FR-1 | `pnpm --filter provegate test test/lint-parsers.test.ts`    | pkg   | a Notes-cell backtick is not a command, the Command cell still is, a two-column row still yields its command, and a row with fewer than two cells is reported rather than skipped |
| FR-1 | `pnpm --filter provegate test test/chain.test.ts`           | pkg   | the chain refuses when any row is malformed, before executing the readable ones; a table with no malformed row behaves exactly as today; a PRD with no section 11 keeps its existing required-empty failure |
| FR-3 | `pnpm --filter provegate test test/lint-parsers.test.ts`    | pkg   | zero matching sections fails as missing and two or more fails as ambiguous; the exempt forms are end-anchored, so a question trailing the marker on the same line fails |
| FR-2 | `pnpm --filter provegate test test/lint-parsers.test.ts`    | pkg   | an unresolved question mentioning the word is counted; one deferred with a link or a work-item id is exempt |
| FR-3 | `pnpm --filter provegate test test/lint-parsers.test.ts`    | pkg   | the injected paragraph-form question fails, a bullet list holding none passes, and the failure message names the heading trap |
| FR-4 | `pnpm --filter provegate test test/lint-parsers.test.ts`    | pkg   | the corpus pass: every PRD in the configured wip directory run through the readiness lint, expected outcome asserted per file |
| FR-4 | `pnpm --filter provegate test`                              | pkg   | the whole package suite stays green — no existing readiness fixture changed meaning |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm verify:workflow` — the repo bundle stays green

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/lint-parsers.test.ts` — each of the three lints must
  **fail** on its defect input. A fixture that only passes on good input is not evidence.
- Contract test: n/a — no client→server payload ships.

Before Phase 2 PASS, run: `gate check PRD-024`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT teach either parser to read paragraphs, bold runs, or nested structures. The fix
  for FR-3 is a grammar restriction. A hand-rolled Markdown reader never reaches renderer
  parity.
- DO NOT delete the `deferred` exemption to fix FR-2. The template promises a
  deferral-with-a-link escape; removing it breaks PRDs that legitimately use it.
- DO NOT silently skip a §11 row that fails to split into cells. An unclassifiable row is
  reported or the change is a new false green replacing an old one.
- DO NOT edit another PRD to make FR-4's corpus pass green. A newly failing wip PRD is a
  finding for its author; report it and stop. PRD-021 is the known case.
- DO NOT extend FR-4 to completed PRDs. Historical artifacts are never rewritten to
  manufacture compliance.
- DO NOT name `pnpm verify:workflow` as the corpus command. That bundle runs its `CHECKS`
  array and never calls `lintPrd`; PRD-023 made exactly this mistake and it survived five
  independent review rounds.
- DO NOT delete `notes-column-runs-commands.md` when its hazard is fixed. Edit it, so the
  trap and its resolution stay discoverable together.
- DO NOT write this PRD's own §9 as paragraphs. FR-3 makes that a failure and a PRD
  proposing the rule must not be written in the shape it forbids.
- DO NOT scope only `parseVerificationCommands`. `lintPrd` has its own whole-row scan; both
  readers take their cells from one shared extractor or the hole stays open in the reader
  nobody touched.
- DO NOT call `lintPrd` with three arguments anywhere in the fixtures. The fourth is the
  repository root and omitting it fails for a reason unrelated to the rules under test.
- DO NOT let the corpus test run inside a cached task without declaring what it reads. A
  stale green over a corpus the task never re-read is the failure this PRD is about, in a
  build tool instead of a parser.
- DO NOT allowlist a known-failing PRD to make the corpus green. Report it and stop.
- DO NOT change the return type of `parseVerificationCommands`. It is exported and two
  existing tests consume it as an array; widening it is a breaking change to a published
  surface this PRD is not otherwise touching. Add an internal parser and keep the export.
- DO NOT let an exempt bullet carry continuation lines. That is where the hiding place
  moves once FR-3 lands: `(none)` plus an indented question satisfies FR-2's opens-with
  exemption and FR-3's continuation rule at the same time.
- DO NOT edit `chain.ts`, `prd-ready.ts`, or the two existing test files without them being
  in the Conflict Surface. They are, now; an earlier revision required the edits and named
  none of them.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-27 | Claude Opus 5, via owner | **Iteration-4 remediation (Codex, seven [P1]s, two [P2]s). The round that falsified this PRD's working assumption**: iteration 3 added no new requirements and the score still fell 0.45, because closing a hole is not the same as measuring what the closure breaks. Every fix below carries its measurement. **(K, fourth and final level)** end-anchoring the exemption pushed rationale into an HTML comment, and a comment holds a question as well as prose does — the fix created the hiding place it moved into. Comments are now **not** a permitted line form inside §9, the exempt bullet carries no prose at all, and this PRD's own §9 is a bare `- (none)` with its explanation deleted rather than relocated. The matcher is also fully defined: case-insensitive, whitespace-collapsing, id-pattern-complete, and `[text](target)` with a non-empty target. **(X)** heading identity: counting `.*Open Questions.*` matches is substring and case-insensitive (`markdown.ts:74`), so `## Resolved Open Questions` alone passed — the very trap the FR warns about. The heading must equal `Open Questions` after an optional ordinal. Measured: all six wip PRDs already use the canonical form, so the narrowing costs nothing. **(Y)** the same first-match hole exists in §11 (`safety.ts:45`, `prd-ready.ts:127`) and the FR block (`prd-ready.ts:28`), which would have made FR-1's "refuses when any row is malformed" false; exactly-one is now required for all three. **(Z)** the two-versus-three contradiction survived in the **Gherkin criterion** — fixed — and extra cells beyond four are now explicitly accepted and ignored, with the fifteen-row fixture measurement behind it. **(AA)** the exact exemption rejects `- (none — resolved)`, which `prd-ready.test.ts:23` uses; that file and `chain.test.ts` are now declared, and the Memory Input distinguishes a **deliberate lint change with a corpus pass** from the **extraction guard** the record actually forbids. **(AB)** the corpus blockers are **five, not one**, and they are named in a table: PRD-021 (paragraph §9), PRD-023, PRD-025 and PRD-026 (trailing prose), PRD-027 (checkbox form). Only this PRD conforms, and only because it was rewritten to. Each fix is one line and four are in-wave. **(AC)** the Turbo strategy is chosen rather than offered: declare the wip directory as a `test` input, rejecting the separate-uncached-command alternative for needing a script, a manifest entry, and a second place to forget a check. P2s: the deferral grammar's case, whitespace and link syntax are defined above; the round count is now four everywhere |
| 2026-07-27 | Claude Opus 5, via owner | **Iteration-3 remediation (Codex, three [P1]s, two [P2]s). Score rose 6.83 → 7.40 on the previous round; these close the remainder.** **(K, third level) the exemption grammar is now end-anchored.** Refusing continuations was not enough: with the exemption keyed to how a bullet *opens*, `- (none) — why is auth still undecided?` still carried the question. The exempt forms are now exactly `(none)`, `Deferred to <id>`, `Deferred: <link>` with no trailing prose, and rationale moves into an HTML comment — which FR-3's own line grammar permits. **This PRD's §9 is rewritten to a bare `- (none)` to comply**, the third time it has been reshaped by its own rule. **(V) exactly one Open Questions section is now required.** `sectionMatching` returns the first match and `''` when there is none (`markdown.ts:90`), so a second `## 9. Open Questions` heading hid every question in it and a document with no heading reported zero. FR-3 uses `sectionsMatching` and fails on zero or on more than one, with deny fixtures both ways. **(W) the row grammar is exact, and the threshold is two cells, not three.** Three existing fixtures declare two-column `| FR | Command |` tables (`safety.test.ts:89`, `prd-ready.test.ts:25`, `chain.test.ts:48`); a three-cell minimum would have made all of them malformed, changed `lintPrd`'s verdict and tripped the new chain guard — breaking this FR's own rule that no existing test may need editing. The command is cell 2; Scope and Notes are optional cells 3 and 4. `chain.test.ts` gains a verification row covering refusal on malformed rows, unchanged behavior without them, and the existing no-section-11 failure. P2s: the Non-Goals blast radius now matches the declared scope instead of claiming two files; the rollback names the `buildGateChain` guard and the existing-test edits; Technical Considerations no longer calls this PRD unordered while FR-4 declares a prerequisite; the round count is stated once with no bare number; and FR-4's corpus is defined as whatever the configured wip directory holds when the test runs, since that count changed again mid-round when PRD-027 appeared |
| 2026-07-27 | Claude Opus 5, via owner | **Iteration-2 remediation (Codex, three [P1]s plus three [P2]s), all six closed.** Two of the three [P1]s were defects the iteration-1 remediation introduced. **(J) the public API break is withdrawn.** `parseVerificationCommands` is exported at `gates/index.ts:16` and consumed as an array by `safety.test.ts` and `content-templates.test.ts`, so widening its return was a breaking change to a published surface this PRD is not otherwise touching. An **internal** `parseVerificationRows` returns `{commands, issues}`; the export keeps its signature and returns `rows.commands`, and the residual — a programmatic caller still silently drops malformed rows — is stated rather than discovered. No changeset needed, because no surface moves. **(K) the hiding place moved one level down and is now closed.** FR-2 exempts a bullet by how it opens and FR-3 permits indented continuations, so `- (none)` followed by an indented unresolved question satisfied both. Since nothing syntactic separates a rationale from a question, the grammar refuses the construction: **an exempt bullet may not carry continuations**, while a genuine open question may be as long as it needs. This PRD's own §9 is rewritten to a single line to comply. **(L) FR-1 now declares the surface it needs.** It requires edits to `chain.ts` and `prd-ready.ts` and touches two existing test files; all five are in Targets, Implementation Scope and the Conflict Surface, where an earlier revision named none of them and its own DO NOT list forbade the edits. P2s: the PRD-021 prerequisite is propagated to the introduction and Non-Goals rather than living only in FR-4; the class rationale no longer claims only verdicts move, and names the two things that do — Phase-5 executed commands and the set of passing documents; and the round count is stated once, as four independent rounds, where the previous fix had produced a fresh contradiction two lines from the original |
| 2026-07-27 | Claude Opus 5, via owner | **Iteration-1 remediation (Codex, six [P1]s).** **(A) FR-1 now scopes both readers.** `lintPrd` carries its own whole-row backtick scan independent of `parseVerificationCommands` (`prd-ready.ts:127-142`), so scoping one left a row whose Command cell is prose passing readiness on a Notes-cell token while the executor received nothing — a fourth instance of this PRD's own defect class, inside it. Both readers now take cells from one shared extractor, with a deny fixture. **(B) the malformed-row report gains a channel**: `parseVerificationCommands` returns `SafetyCheckedCommand[]` and the executor consumes it directly, so "report it" had nowhere to go. The return widens to `{commands, issues}`, `lintPrd` surfaces them, and `buildGateChain` refuses rather than running the readable remainder over an unknown gap. **(C) FR-2's exemption is a closed form**, opening with `Deferred to <id>` or `Deferred: <link>` — the same opens-with discipline `durable.ts` uses — because "contains the word and contains a link" is still satisfied by an open question that merely cites something. **(D) FR-3 enumerates the accepted line forms** and drops the leading-explanatory-line allowance, which was itself a slot a paragraph question could occupy; indented continuations are named, which this PRD's own wrapped `(none)` bullet requires. **(E) the corpus fixture takes all four arguments.** Measured by the reviewer: a three-argument `lintPrd` fails with an unrelated memory error in this repository, so the fixture could not have failed for its stated reason — `fixture-must-reach-production-shape` moves from reviewed to applied. **(F) the corpus test is un-cached or declares its inputs**, with `turbo.json` claimed: it reads the wip directory at the repository root while the test task declares no additional inputs, which is `turbo-cache-masks-out-of-input-reads` exactly, now a declared Memory Input. **(G) PRD-021 is a stated Phase-4 prerequisite**, not a known case, and allowlisting its expected failure is forbidden. P2s: the metric no longer claims *every* outside-column backtick reaches the gate, since inert file paths are already excluded; the rollback states that FR-1 changes executed commands in both directions; and the round count distinguishes the four independent rounds from the six total |
| 2026-07-27 | Claude Opus 5, on owner direction | **Split from PRD-023 (owner decision, 2026-07-27), carrying its FR-7 a/b/c plus the corpus-command defect iteration 6 found in it.** PRD-023 sat between 6.65 and 7.19 across four independent rounds without converging; the recorded diagnosis was size, and the evidence was two live defects hiding through five adversarial reviews. This is the piece with no dependency on the other two. Nothing is newly invented here: FR-1 is PRD-023 FR-7(a) with its malformed-row case named, FR-2 is FR-7(b), FR-3 is FR-7(c) with the heading trap moved into the failure message, and FR-4 replaces the `pnpm verify:workflow` corpus row that PRD-023 iteration 6 proved never calls `lintPrd`. Created with `gate new` |
