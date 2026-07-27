# PRD-024: §11 Command Extraction — Read the Command Column, Report the Rest

> **Status**: Draft
>
> **Created**: 2026-07-27
> **Updated**: 2026-07-27
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
Questions reader. Across four rounds **every** blocking finding came from the §9 work — the
exemption grammar moved to a new hiding place four consecutive times, each move created by
the previous fix — while this defect drew no objection after round two. The §9 work moves
to PRD-028, which is a fair description of what the evidence says: two unrelated problems
were sharing a document, and the smaller one was being held hostage.

**The defect.** `parseVerificationCommands` iterates every backtick span on an `| FR-N` row
(`safety.ts`), so a backticked token in the **Scope** or **Notes** cell becomes a gate
command. Allowlisted, it silently joins the Phase-5 gate; non-allowlisted, it fails the
readiness lint for prose.

**Measured on the live corpus, 2026-07-27.** Three Notes-cell tokens across the configured
wip directory reach the parser today:

| PRD | Row | Token | Effect today |
| --- | --- | ----- | ------------ |
| PRD-021 | FR-8 | `pnpm build` | **allowlisted — it silently joins the Phase-5 gate**, declared by nobody |
| PRD-026 | FR-5 | `pack-manifest.json` | inert, excluded as a file path (`safety.ts:51-58`) |
| PRD-027 | FR-7 | `sections/content.ts` | inert, same |

One live instance of the real hazard, in a PRD nobody wrote it into deliberately. That is
the whole case for this work, and it is one row rather than a hypothetical.

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
      the lint — not a bundle that never calls it.
- [ ] Retire `notes-column-runs-commands`'s interim guidance in the same change that removes
      its hazard, so the record does not outlive its fix.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Backticked tokens outside the Command column that reach the gate | 3 measured in the wip corpus, one of them an allowlisted command | 0 | FR-1 fixtures plus the FR-2 corpus pass |
| Commands executing at Phase 5 that no author declared | 1, in PRD-021 FR-8's Notes cell | 0 | the same |
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
I want the corpus pass to run the lint I changed,
so that "the corpus is green" is evidence rather than an assertion.
```

**Acceptance Criteria:**

- [ ] The corpus command invokes the readiness lint over every wip PRD and asserts per-file
      outcomes.

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

   Two is the threshold, not three, and the difference is load-bearing: three existing test
   fixtures declare two-column tables (`safety.test.ts:89`, `prd-ready.test.ts:25`,
   `chain.test.ts:48`). A three-cell minimum would make every one of them malformed, change
   the lint's verdict on them and trip the new chain refusal — breaking this FR's own
   binding rule that no existing test may need editing to accommodate the guard. Measured
   across the whole fixture corpus: fifteen literal FR rows in five files — ten two-cell,
   four three-cell, one four-cell — plus two four-cell rows from the template round-trip.

   **Splitting on the pipe is safe by contract, and the contract already exists.** The PRD
   template forbids a pipe character inside a backticked command in this table, so the
   constraint that makes the fix sound is one every conforming artifact already carries.

   **There are two readers of this table, not one, and scoping only the executor's leaves
   the hole open.** `lintPrd` independently decides whether a row carries a runnable command
   by scanning the **entire row** (`prd-ready.ts:127-142`). After scoping
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

   **Exactly one §11 section, because otherwise "any malformed row" is false.** §11 is
   selected by `sectionMatching` in both `safety.ts:45` and `prd-ready.ts:127`, which
   returns the **first** match and an empty string when there is none (`markdown.ts:90`). A
   malformed or unsafe row in a **second** verification section is invisible today. Use
   `sectionsMatching` (`markdown.ts:65`) and require exactly one: zero fails as missing, two
   or more fails as ambiguous. **Identify the section by its heading, not by a substring** —
   `sectionsMatching` is case-insensitive and substring-based (`markdown.ts:74`), so the
   heading must equal the canonical name after stripping an optional leading ordinal, and
   nothing more. Measured 2026-07-27: all six PRDs in the wip directory declare exactly one,
   in the canonical form, so this narrowing costs nothing today.

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
   content **and the repository root**, four arguments, as `cli.ts:654-655` passes them.
   **The root is not optional.** `lintPrd` takes it fourth (`prd-ready.ts:108-113`) and,
   with memory enabled, omitting it fails with an unrelated missing-root error
   (`prd-ready.ts:169-173`); this repository enables memory. Measured: this PRD passes with
   the root and fails without it, for a reason that has nothing to do with the rule under
   test. A three-argument call is `fixture-must-reach-production-shape` violated in the FR
   that cites it.

   Read the directory from config rather than hardcoding it, so the test follows a
   repository that renames it.

   **The corpus is green today, measured rather than hoped.** Across the six PRDs in the wip
   directory on 2026-07-27: **zero malformed rows**, and **exactly one verification section
   each**, in the canonical heading form. FR-1 therefore introduces no new failure anywhere
   in the live corpus. What it does change is a **relaxation** — the three Notes-cell tokens
   in §1 stop reaching the parser, which is the defect being fixed. **This PRD has no corpus
   prerequisite**, and that is a direct consequence of the 2026-07-27 narrowing: every
   prerequisite the wider version carried came from the §9 grammar, which is now PRD-028's.

   **Report, never edit.** If a wip PRD newly fails when the test is written, that is a
   finding for its author. **Allowlisting an expected failure is forbidden** — a sweep with a
   known-red exemption is the ledger-shaped bypass `known-red-ledger-must-expire` warns
   about, arriving in a test instead of a ledger. Stop and hand back. Completed PRDs are
   historical artifacts and are outside the sweep; they are never rewritten to manufacture
   compliance.

   **The corpus test reads outside its package, so its inputs are declared.** It reads PRDs
   at the repository root while `turbo.json:15-17` declares no additional inputs for the
   test task, so a change under the wip directory replays a stale green —
   `turbo-cache-masks-out-of-input-reads`, exactly. **The strategy is chosen rather than left
   as an either/or:** add the configured wip directory to the test task's declared inputs. A
   separate uncached command was the alternative and is rejected — it needs a new package
   script, a new manifest entry, and a second place for a check to be forgotten.
   - **Targets:** `packages/provegate/test/lint-parsers.test.ts`, `turbo.json`

---

## 5. Non-Goals (Out of Scope)

- **The §9 Open Questions reader.** Both defects there — the substring-satisfiable deferral
  exemption and the bullets-only section filter — move to **PRD-028** with the four levels of
  hiding place four independent rounds uncovered. They are a separate problem that was
  sharing a document with this one, and the evidence for separating them is that every
  blocking finding across those four rounds came from that half.
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
- **Given** a PRD with no verification section at all, **Then** its existing required-empty
  Phase-5 failure is unchanged (`chain.test.ts:173`).
- **Given** a document with two verification sections, or none, or whose only matching
  heading is a longer variant, **Then** the lint fails in each case.
- **Given** every PRD in the configured wip directory, **When** the corpus test runs,
  **Then** each file's outcome matches its expectation, and a newly failing file is reported
  by name rather than edited or allowlisted.
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

### Dependencies

- **None.** After the 2026-07-27 narrowing this PRD has no corpus prerequisite and no
  ordering constraint against PRD-025, PRD-026 or PRD-028. It shares `prd-ready.ts` with
  PRD-021, PRD-026 and PRD-028, so those serialize on that file. Re-run `gate queue` before
  claiming rather than trusting this paragraph.
- No new runtime dependencies; `packages/provegate` stays at zero.

### Rollback

Revert the shared cell extractor and the internal row parser, the `lintPrd` changes, the
§11 cardinality check, and **the `buildGateChain` refusal guard**; delete the new test file
and the turbo input. The exported signature never changed, so nothing published moves in
either direction. Any edit made to `safety.test.ts`, `content-templates.test.ts` or
`chain.test.ts` reverts with them.

**FR-1 changes executed commands, not only verdicts.** `buildGateChain` runs the parser's
output directly, so scoping the parser removes any command an existing PRD was accidentally
getting from its Notes cell — one, measured, in PRD-021. Forward that is the fix; backward a
revert restores it. Neither direction is a silent no-op.

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
- [ ] `packages/provegate/test/chain.test.ts` — the refusal proof for FR-1's guard
- [ ] `turbo.json` — declare the wip directory as an input for the test task (FR-2)
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
- `_readiness/wip/readiness-024-readiness-lint-parsers.md` — four independent rounds, every
  blocking finding of which came from the §9 half now in PRD-028
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
- applied: `fixture-must-reach-production-shape` — the corpus test must call the lint with
  all four arguments; a three-argument call fails on an unrelated memory error in this
  repository and would have reported as coverage.
- applied: `turbo-cache-masks-out-of-input-reads` — FR-2's corpus test reads PRDs at the
  repository root while the test task declares no additional inputs, so the wip directory
  becomes a declared input and `turbo.json` is a target.
- applied: `known-red-ledger-must-expire` — FR-2 forbids allowlisting an expected corpus
  failure. A sweep with a known-red exemption is this record's bypass arriving in a test
  rather than a ledger.
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
| FR-1 | `pnpm --filter provegate test test/lint-parsers.test.ts`    | pkg   | a row whose Command cell is prose fails readiness even when Notes carries an allowlisted token; zero or duplicate verification sections each fail; a heading variant is not the section |
| FR-1 | `pnpm --filter provegate test test/chain.test.ts`           | pkg   | the chain refuses when any row is malformed, before executing the readable ones; a table with no malformed row behaves exactly as today; a PRD with no verification section keeps its existing required-empty failure |
| FR-1 | `pnpm --filter provegate test test/safety.test.ts`          | pkg   | the exported parser still returns an array and every existing assertion passes unchanged |
| FR-2 | `pnpm --filter provegate test test/lint-parsers.test.ts`    | pkg   | the corpus pass: every PRD in the configured wip directory run through the readiness lint with all four arguments, expected outcome asserted per file |
| FR-2 | `pnpm --filter provegate test`                              | pkg   | the whole package suite stays green — no existing fixture changed meaning |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm verify:workflow` — the repo bundle stays green

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/lint-parsers.test.ts` — the Notes-cell token, the
  prose-Command row, the malformed row, and the duplicate section must each **fail**. A
  fixture that only passes on good input is not evidence.
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
- DO NOT set the well-formed threshold at three cells. Three existing fixtures declare
  two-column tables; three would make all of them malformed and trip the new guard.
- DO NOT silently skip a §11 row that fails to split. An unclassifiable row is reported, or
  the change is a new false green replacing an old one.
- DO NOT let the chain run the rows it could read when another row is malformed. Partial
  coverage reported as success is the failure this FR exists to prevent.
- DO NOT edit `chain.ts`, `prd-ready.ts`, or the existing test files without them being in
  the Conflict Surface. They are.
- DO NOT call the readiness lint with three arguments anywhere in the fixtures. The fourth
  is the repository root and omitting it fails for a reason unrelated to the rule under test.
- DO NOT let the corpus test run inside a cached task without declaring what it reads. A
  stale green over a corpus the task never re-read is this defect's own shape, in a build
  tool instead of a parser.
- DO NOT allowlist a known-failing PRD to make the corpus green. Report it and stop.
- DO NOT pull any §9 Open Questions work back into this PRD. It is PRD-028's, and the reason
  is on the record: across four independent rounds every blocking finding came from that
  half while this one drew none after round two.
- DO NOT delete `notes-column-runs-commands.md` when its hazard is fixed. Edit it, so the
  trap and its resolution stay discoverable together.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-27 | Claude Opus 5, on owner direction | **Narrowed to the §11 reader; the §9 Open Questions work moves to PRD-028 (owner decision after readiness iteration 4).** Four independent rounds scored the wider PRD 6.75, 6.83, 7.40, 6.95 without converging, and the evidence was unambiguous: **every blocking finding across those rounds came from the §9 half**, where the exemption grammar moved to a new hiding place four consecutive times, each move created by the previous fix. This defect drew no objection after round two. Two unrelated problems were sharing a document and the smaller one was being held hostage. What survives here is FR-1 in full — column scoping, the exact two-cell row grammar with its fifteen-row fixture measurement, the internal-versus-exported parser split that preserves the published signature, the shared extractor both readers use, and the chain refusal — plus §11 cardinality, which stays because FR-1's own claim that the chain refuses when any row is malformed is false without it, and the corpus pass. **The defect is now measured on the live corpus rather than argued**: three Notes-cell tokens reach the parser today and one of them, in PRD-021 FR-8, is allowlisted and therefore silently executing at Phase 5. **Every corpus prerequisite disappeared with the narrowing** — zero malformed rows and exactly one canonical verification section across all six wip PRDs — so this PRD now has no ordering constraint at all, where the wider version had five. Value re-scored 3.75 to 3.50 for the reduced scope |
| 2026-07-27 | Claude Opus 5, on owner direction | **Split from PRD-023**, carrying its FR-7 a/b/c plus the corpus-command defect iteration 6 found in it. Four readiness rounds and their remediations are recorded in `_readiness/wip/readiness-024-readiness-lint-parsers.md`; the findings that belonged to the §9 half travel with it to PRD-028. Created with `gate new` |
