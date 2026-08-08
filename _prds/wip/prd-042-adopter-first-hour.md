# PRD-042: The Adopter's First Hour

> **Status**: Draft
>
> **Created**: 2026-08-07
> **Updated**: 2026-08-07
> **Author**: owner
> **Audience**: Implementing Agent
> **Slug**: `adopter-first-hour`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Class Rationale**: n/a — feature class.
> **Autonomous Close**: eligible
> **Value**: 3.45 (MF/UI/TL/AR/RM: 3/5/2/5/2)

<!-- 0.25*3 + 0.25*5 + 0.20*2 + 0.15*5 + 0.15*2
     = 0.75 + 1.25 + 0.40 + 0.75 + 0.30 = 3.45 -->

<!-- Value history: born 3.75 (RM 4) → iteration 1 ruled RM 2: this touches `gate new`, the
readiness lint's view of a document, a drift detector's anchor, and a parity check, and every
adopter traverses both `gate new` and QUICKSTART — which is also why AR stays 5. -->

---

## 1. Introduction / Overview

The first external adopter run (`pnpm smoke:adopter`, 2026-08-07) reached a merged close, and
everything that cost time between `npm install` and that close was hand-work the tool could
have done:

- `gate new` writes the PRD and nothing else. Phase 6 then stops with
  `no tasks file — independent-review ledger missing`, naming neither the path the runner
  expects nor the row it will read. The adopter has to find
  `node_modules/provegate/templates/tasks-template.md`, copy it, and guess the file name.
- The instantiated PRD ships `{{CMD_TEST_SCOPED}}`, `{{CMD_CHECK_TYPES}}`, `{{CMD_LINT}}`,
  `{{CMD_TEST}}`, `{{CMD_BUILD}}`, `{{MEMORY_ROOT}}` and `{{DOCS_ROOT}}` unsubstituted. The
  readiness lint refuses only the §11 ones — as an unsafe command, not as an unfilled token —
  and the others survive into the closed artifact.
- The PRD carries the full Memory Inputs and Memory Outputs contract prose into a repository
  where `memory.enabled` is false, with no signal that the sections are inert.
- QUICKSTART puts the manifest recipe under "Single-package repos", *after* the close section,
  while `gate init` deliberately writes an empty manifest. A linear reader reaches `gate run`
  with zero gates wired.

One more, from this repository rather than the fixture: `gate new` cannot instantiate a
RENDERED template. Its anchor is `/^# \{\{ID_PREFIX\}\}-XXX: /m`, and `gate init --prompts`
substitutes that token away, so in any repository that dogfoods its own prompt store — this one
— `gate new` exits 1 and every PRD is created by hand. The defect was recorded during PRD-034
and parked because the deferral board was at its cap.

None of this is a gate failure. It is the difference between a tool that works and a tool
someone else can pick up.

---

## 2. Goals

### Primary Goals

- [ ] Every artifact the gate chain reads can be created by the CLI that reads it.
- [ ] A token the configuration can resolve is never handed to the author to resolve.
- [ ] A stop names the path and the shape it wants.

### Success Metrics

| Metric                                     | Current | Target | Measurement                    |
| ------------------------------------------ | ------- | ------ | ------------------------------ |
| Artifacts the CLI can instantiate          | 1 of 3  | 3 of 3 | FR-1 tests                     |
| Resolvable tokens with a non-empty configured source left unsubstituted | 7 | 0 | FR-2 test, adopter smoke fill |
| Templates `gate new` can read              | plain   | both   | FR-5 test against the rendered store |

---

## 3. User Stories

#### User Story 1

```
As someone adopting the workflow on a Tuesday afternoon,
I want the CLI to hand me the artifacts its own gates demand,
so that my first close fails on my code and not on my paperwork.
```

**Acceptance Criteria:**

- [ ] `gate new --tasks PRD-001` writes the task file the phase-6 gate reads, named as the
      runner expects.
- [ ] A PRD created by `gate new` carries no token the configuration could have resolved.

---

## 4. Functional Requirements

1. **FR-1**: `gate new --tasks <ID>` and `gate new --review <ID>` instantiate the shipped tasks
   and review templates for an existing PRD. The destination paths are derived from config, not
   guessed:
   `<dirs.artifacts.tasks.dir>/<dirs.stateRoles.wip>/<dirs.artifacts.tasks.prefix>-NNN-<slug>.md`
   and `<dirs.reviewsDir>/review-NNN-<slug>.md`, where `NNN` is the id at
   `idPattern.width` and `<slug>` is the PRD's own slug — the same shapes the phase-6 gate
   reads. Every write is `wx`-atomic and containment-checked against the workspace root, exactly
   as `gate init` writes; an existing destination is reported and left byte-untouched.

   `gate new` has exactly three productions, mutually exclusive:

   ```
   gate new <slug> [--class=<class>] [--template=<path>]
   gate new --tasks <ID>
   gate new --review <ID>
   ```

   **Identity:** the id is matched against PRD artifacts in the configured **wip** role only — a
   completed item is not a target for new artifacts — and the artifact's **basename is
   authoritative** for both the number and the slug (`prd-NNN-<slug>.md`), never the heading
   text, which an author may edit freely.

   Each refusal is named and gets its own test in `packages/provegate/test/new.test.ts`:

   | refusal | test name |
   | ------- | --------- |
   | both artifact flags | `"--tasks with --review refuses"` |
   | slug or extra positional beside an artifact flag | `"a positional argument beside --tasks refuses"` |
   | `--class`/`--template` beside an artifact flag | `"--class beside --review refuses"` |
   | repeated artifact flag | `"a repeated --tasks refuses"` |
   | artifact flag with no id | `"--tasks without an id refuses"` |
   | neither slug nor artifact flag | `"a bare gate new refuses"` |
   | id matching zero wip PRDs | `"an id with no wip PRD refuses"` |
   | id matching two wip PRDs | `"an ambiguous id names both candidates"` |

   A command that guesses which production was meant writes the wrong file into the wrong place.

   **What each artifact receives** (closed; anything absent from this table stays a placeholder
   the author fills):

   | Template | Substituted by `gate new` | Left to the author |
   | -------- | ------------------------- | ------------------ |
   | tasks | the PRD's id and slug in the heading and the `> **PRD**:` link, `> **Status**: Not Started`, `> **Created**` / `> **Updated**` dates, and the FR-2 token pass | task text, the Verification Ledger's rows, Relevant Files |
   | review | the PRD's id in the heading and the `> **PRD:**` metadata line, `> **Base SHA:**` left EMPTY (the reviewer fills it — a pre-filled SHA is a claim about a diff nobody read) | verdict, reviewer, the four count fields, findings |

   The review template's `Quorum` line is NOT pre-filled: the review gate refuses an artifact
   without it, and a value the tool supplied would be a quorum nobody convened.
   - **Targets:** `packages/provegate/src/core/run/new.ts`, `packages/provegate/src/cli.ts::runNew`
2. **FR-2**: `gate new` substitutes every template token whose value the configuration can
   supply, from this closed table, in this precedence order:

   | Token | Source | Precedence |
   | ----- | ------ | ---------- |
   | `{{CMD_CHECK_TYPES}}` | `config.commands.checkTypes` | config only |
   | `{{CMD_LINT}}` | `config.commands.lint` | config only |
   | `{{CMD_TEST}}` | `config.commands.test` | config only |
   | `{{CMD_BUILD}}` | `config.commands.build` | config only |
   | `{{CMD_TEST_SCOPED}}` | `config.prompts.values.CMD_TEST_SCOPED`, else `config.commands.test` | prompts value wins |
   | `{{MEMORY_ROOT}}` | `config.memory.root` | config only |
   | `{{DOCS_ROOT}}` | `config.prompts.values.DOCS_ROOT`, else `config.dirs.artifacts.summary.dir` | prompts value wins |

   The token substitution and the existing anchored substitutions happen in ONE sweep over the
   template's bytes, so neither can read the other's output in either direction — the arrangement
   phase-6 rounds 10 and 11 forced, after ordering the passes merely moved which one read which.
   The id, class, status, slug and date anchors keep their current behaviour and their drift
   refusals, which are still checked before anything is written. Within this new pass the seven rows are the CLOSED set: a token
   outside the table is never substituted, however plausible its name, and adding a row is a
   change to this requirement rather than an implementation detail. It is also exactly the set
   the adopter run found unsubstituted. A source whose
   value is absent or an empty string is **not** a substitution: the token stays, and it joins
   the unknown list. Unknown tokens are reported once each, sorted, deduplicated, on stdout as
   a single `[new] unresolved tokens: …` line; the command still exits 0, because an unresolved
   token is work for the author, not a failure of the command.
   - **Targets:** `packages/provegate/src/core/run/new.ts`
3. **FR-3**: When `memory.enabled` is false, `gate new` omits the `## Memory Inputs` and
   `## Memory Outputs` sections — heading line through the last line before the next
   `## ` heading at column zero, inclusive of the trailing `---` separator that belongs to the
   removed section and nothing beyond it. The lint must agree that absence is legal when the
   contract is off and fatal when it is on; a PRD created this way in a memory-enabled
   repository must still fail `gate check`, so the omission can never be used to escape a
   contract the repository has enabled.
   - **Targets:** `packages/provegate/src/core/run/new.ts`
4. **FR-4**: The phase-6 stop names the artifact path it expected and the ledger row it reads.
   The message is built in `buildGateChain` (`core/run/chain.ts`, the
   `no tasks file — independent-review ledger missing` arm), and it must carry the configured
   expected task path and the required `independent-review` row's columns (`Gate`,
   `Command / Check` naming the review artifact path, `Result` = `passed`).
   - **Targets:** `packages/provegate/src/core/run/chain.ts::buildGateChain`
5. **FR-5**: `gate new` instantiates a RENDERED template. The id anchor becomes a closed
   two-member alternation: the literal `{{ID_PREFIX}}` form, or exactly
   `escapeRegExp(config.idPattern.prefix)` — nothing else. A foreign prefix, a malformed
   heading, an absent anchor, and two competing anchors in one template each stay a
   template-drift refusal, with a deny test apiece. Wildcard prefix matching is forbidden: it
   would turn drift detection into a heading search.
   - **Targets:** `packages/provegate/src/core/run/new.ts::substituteAnchor`
6. **FR-6**: In both quickstart copies, the manifest heading and its recipe precede the close
   section (`## 5. Close` in `QUICKSTART.md` and its twin heading in the docs copy), so a linear
   reader wires the floor before running the command that executes it. `verify:quickstart-parity`
   gains a structural order assertion — command-sequence equality alone cannot see prose order,
   and an unasserted ordering claim is the kind of documentation this repository already refuses.
   The `new` line in `gate --help` advertises both artifact modes, and both quickstart copies
   teach `gate new --tasks` / `gate new --review` exactly where they currently tell a reader to
   copy a template by hand — a feature the help text does not mention is a feature an adopter
   does not find. A content assertion in `packages/provegate/test/cli.test.ts` named
   `"the new help line advertises --tasks and --review"` fails while either is absent.
   The practices `NEXT_STEPS.md` duplicate `## 7` heading is corrected in the same pass, and the
   correction is asserted rather than assumed: a test in
   `packages/provegate/test/content-hygiene.test.ts` named
   `"NEXT_STEPS numbered headings are unique and sequential"` fails while a duplicate exists and
   passes once the second `## 7` becomes `## 8`.
   - **Targets:** `packages/provegate/QUICKSTART.md`, `apps/docs/content/docs/quickstart.mdx`,
     `scripts/verify/verify-quickstart-parity.mjs`, `packages/provegate/practices/NEXT_STEPS.md`,
     `packages/provegate/src/cli.ts::usage`, `packages/provegate/test/cli.test.ts`

---

## 5. Non-Goals (Out of Scope)

- `gate accept` — a writer for `_state/acceptances.json`. An agent may never originate an
  acceptance, so that command needs its own design.
- Generating PRD *content* (that is Phase 1's prompt, not the CLI).
- A `gate init --preset` that wires a language-specific floor: worth doing, needs its own item
  so the preset set can be argued on its own merits.
- The operator-count and terminal-status defects from the same run — PRD-040 and PRD-041.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** `gate --help`, **When** it prints the `new` line, **Then** that line names `--tasks`
  and `--review`.
- **Given** an existing PRD, **When** `gate new --tasks PRD-001` runs, **Then** the file appears
  at `<tasks.dir>/wip/tasks-001-<slug>.md` and the phase-6 gate finds it; re-running reports the
  existing file and leaves it byte-identical.
- **Given** each of the eight refusal categories in FR-1 — both artifact flags; a positional
  argument beside an artifact flag; `--class` or `--template` beside one; a repeated artifact
  flag; an artifact flag with no id; neither slug nor artifact flag; an id matching zero wip
  PRDs; an id matching two — **When** `gate new` runs, **Then** each refuses with its own
  message naming what was ambiguous, under the test titles FR-1 lists.
- **Given** a repository whose `config.commands.lint` is an empty string, **When** `gate new`
  runs, **Then** `{{CMD_LINT}}` stays in the file and appears once in the sorted unresolved-token
  line, and the command exits 0.
- **Given** a repository with `memory.enabled: false`, **When** `gate new` runs, **Then** the new
  PRD has no Memory Inputs or Memory Outputs section and `gate check` passes it.
- **Given** the same PRD copied into a repository with `memory.enabled: true`, **When**
  `gate check` runs, **Then** it fails for the missing sections.
- **Given** a repository whose configured template is rendered, **When** `gate new` runs, **Then**
  the item is created; **Given** a template carrying a foreign prefix, a malformed heading, no
  anchor, or two competing anchors, **Then** each refuses as template drift.
- **Given** a close with no tasks file, **When** phase 6 stops, **Then** the message names the
  configured expected path and the `independent-review` row's required columns.
- **Given** a task artifact freshly instantiated by `gate new --tasks` and otherwise unedited,
  **When** the real Phase-6 chain runs against it, **Then** it FAILS — the template's placeholder
  `independent-review` material must never satisfy the gate, or the convenience this item adds
  would hand an author a pre-passed review row.
- **Given** either quickstart copy, **When** `verify:quickstart-parity` runs, **Then** it fails
  when the manifest recipe follows the close section in that copy.

---

## 7. Technical Considerations

### Architecture

`gate new` already owns anchored substitution (`substituteAnchor`) and refuses on drift. FR-1
and FR-2 extend that same mechanism to two more templates and to a token set drawn from config
— no template language, no second renderer. FR-5 widens one anchor's alternation, and the
drift error stays the failure mode for everything else.

FR-3 removes sections from a document the readiness lint then parses, so the lint's memory-
contract arm must agree that an absent section is legal when the contract is off — the two
already agree on this for hand-written PRDs; the test pins it.

The QUICKSTART edit moves prose between two copies that a parity check compares. Move both in
the same commit or the check fails, which is the point of it.

### Migration & Rollback

- **Legacy `gate new <slug>` is unchanged.** The positional mode keeps its arguments, its output
  path and its exit codes; the two new flags are additive, and the mixed-mode refusals in FR-1
  are the only new failure on the old path.
- **Both QUICKSTART copies ship in the same release.** They are compared by
  `verify:quickstart-parity`, so a release carrying one and not the other is red before it
  reaches an adopter.
- **Revert:** reverting this work leaves any file already created by `--tasks`/`--review` in
  place. The older `gate new` cannot create them and ignores them; the Phase-6 chain, which is
  unchanged by the revert, keeps CONSUMING them exactly as it does a hand-written task file —
  so a revert removes the convenience, never the artifacts or their effect. A PRD created without its memory sections in a memory-disabled repository stays
  valid there; if that repository later enables the contract, `gate check` fails it, which is the
  correct reading and the same thing that happens to any hand-written PRD.
- **Rollback trigger:** if any of FR-5's four deny tests FAILS — that is, an invalid anchor is
  admitted — revert rather than widen. A deny test failing is the detector firing, not a test to
  be updated.

### Dependencies

- none

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/run/new.ts`
- [ ] `packages/provegate/src/cli.ts`
- [ ] `packages/provegate/src/core/run/chain.ts`
- [ ] `packages/provegate/QUICKSTART.md`, `apps/docs/content/docs/quickstart.mdx`
- [ ] `scripts/verify/verify-quickstart-parity.mjs`
- [ ] `packages/provegate/practices/NEXT_STEPS.md`
- [ ] `packages/provegate/test/cli.test.ts`
- [ ] `packages/provegate/test/new.test.ts`, `packages/provegate/test/prd-ready.test.ts`,
      `packages/provegate/test/chain.test.ts`, `packages/provegate/test/content-hygiene.test.ts`

---

## 9. Open Questions

- (none)

---

## 10. References

- `scripts/adopter-smoke.sh` and `scripts/adopter-smoke-fill.mjs` — the substitutions in the
  fill script are the list FR-2 removes
- `_tasks/completed/tasks-034-prompt-store-reconciliation.md` — where the rendered-template
  defect was recorded

---

## Memory Inputs

- applied: `quickstart-is-a-fixture` — binding, not cited: FR-6 moves prose inside the document
  the parity check executes, so both copies move in one commit AND the check gains the order
  assertion that makes the claim testable. The §11 row for FR-6 is that assertion.
- applied: `derive-the-requirement-from-the-consumer` — FR-2's token table IS the record's rule
  applied: the set is taken from what the configuration can answer, each row naming its source
  and its precedence, and a token nothing can resolve is reported rather than demanded. The
  binding test is the empty-value row in §11.
- applied: `shipped-content-needs-a-delivery-gate` — the item exists because packaging proved
  nothing about delivery. Binding form: FR-2's assertions run against the INSTANTIATED artifact,
  never against the template source, and `pnpm smoke:adopter` stays in the floor so the
  delivered CLI is what gets measured.
- applied: `metadata-declares-what-it-cannot-provide` — FR-3 removes a contract a repository
  cannot enforce. Binding form: the §11 pair that proves absence passes with memory off and
  FAILS with memory on — the second half is what stops the omission becoming an escape hatch.
- applied: `assert-absent-needs-an-independent-cause` — FR-3's absence test uses a template that
  HAS the sections and a config that disables memory, so absence can only come from the
  omission; a fixture whose template lacked them would prove nothing.
- applied: `evidence-pattern-satisfied-by-the-template` — FR-1 instantiates templates whose
  placeholder lines must not satisfy any gate. Binding form: the FR-1 row in §11 named
  `chain.test.ts` → `"an unedited instantiated tasks template fails the Phase-6 gate"`, which
  runs the real chain against a file `gate new --tasks` just wrote and requires a FAILURE, so a
  template placeholder can never stand in for a recorded review.
- applied: `strictness-added-during-extraction-is-a-behavior-change` — FR-5 LOOSENS a drift
  detector, which is the same class in the opposite direction. Binding form: the four deny tests
  (foreign prefix, malformed heading, absent anchor, competing anchors) pin what must still
  refuse after the alternation widens.
- applied: `a-rule-corrected-survives-where-it-is-restated` — the seven-token set is restated in
  §1, §2's metric, §4's table and §11. FR-2's table is the single source; a correction sweeps all
  four, and the §11 count row is what catches a stale restatement.
- not-applicable: `the-first-hour-is-a-surface` — this item's OWN Memory Output, watching the
  diff that creates it. It cannot have shaped work that produced it; the disposition exists
  because the watch fires on any closing diff that touches `new.ts` or `QUICKSTART.md`, which is
  every diff this item makes.
- not-applicable: `one-sweep-not-two-passes` — likewise newborn here, appended during Phase 6.
  Its content is the conclusion of this work, not an input to it.
- reviewed: `docs-are-a-wiring-surface` — `practices/**` watch; FR-6 corrects heading numbering
  in NEXT_STEPS and registers or deregisters nothing.
- reviewed: `fixture-must-reach-production-shape` — `cli.ts` watch; FR-1's tests drive the CLI
  entry point with the argument shapes a user types, not the helper beneath it.
- reviewed: `surface-set-without-its-predicate` — `core/gates/**` is no longer a target (FR-4
  moved to `chain.ts`), and no input set changes hands.
- reviewed: `narrow-the-grammar-not-the-parser` — FR-3 removes sections by the heading grammar
  the reader already uses; no new Markdown reading is introduced.
- reviewed: `gate-run-resume-after-archive` — `core/run/**` watch via `new.ts` and `chain.ts`;
  this item instantiates artifacts and rewrites one message, and changes nothing about resuming.

## Memory Outputs

- learning: `_brain/learnings/the-first-hour-is-a-surface.md` — the steps between install and
  first close are a product surface with no gate over it; self-hosting cannot see them because
  the maintainers performed each one so often they stopped noticing they were performing it.
- learning: `_brain/learnings/one-sweep-not-two-passes.md` — APPENDED during implementation,
  which the contract allows with a rationale. Phase 6 spent three rounds on one composition
  defect: two substitution passes over a document always let one read the other's output, and
  ordering them only chooses the direction. The fact is not derivable from the diff — the diff
  shows the final single sweep, not the two orderings that failed — and it generalizes past this
  module.

---

## Conflict Surface

- `packages/provegate/src/core/run/new.ts`
- `packages/provegate/src/core/run/chain.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/QUICKSTART.md`
- `apps/docs/content/docs/quickstart.mdx`
- `scripts/verify/verify-quickstart-parity.mjs`
- `packages/provegate/practices/NEXT_STEPS.md`
- `packages/provegate/test/new.test.ts`
- `packages/provegate/test/prd-ready.test.ts`
- `packages/provegate/test/chain.test.ts`
- `packages/provegate/test/content-hygiene.test.ts`
- `packages/provegate/test/cli.test.ts`
- `scripts/adopter-smoke.sh`
- `scripts/adopter-smoke-fill.mjs`

---

## Durable Artifacts

- `_brain/learnings/the-first-hour-is-a-surface.md` — every Memory Output above repeats here;
  the two lists are one contract and Phase 7 refuses when they disagree
- `_brain/learnings/one-sweep-not-two-passes.md` — the appended output, repeated here
- ADR: `none`

---

## 11. Verification Commands

| FR   | Command / Check                 | Scope                  | Notes                                                     |
| ---- | ------------------------------- | ---------------------- | --------------------------------------------------------- |
| FR-1 | `pnpm test --filter provegate`  | new.test.ts            | both modes write the configured paths; re-run reports and leaves bytes |
| FR-1 | `pnpm test --filter provegate`  | new.test.ts            | all eight refusals by their FR-1 titles: `"--tasks with --review refuses"`, `"a positional argument beside --tasks refuses"`, `"--class beside --review refuses"`, `"a repeated --tasks refuses"`, `"--tasks without an id refuses"`, `"a bare gate new refuses"`, `"an id with no wip PRD refuses"`, `"an ambiguous id names both candidates"` |
| FR-2 | `pnpm test --filter provegate`  | new.test.ts            | all seven tokens substituted from the §4 table; empty value keeps the token |
| FR-2 | `pnpm test --filter provegate`  | new.test.ts            | unresolved tokens reported once, sorted, exit code 0       |
| FR-3 | `pnpm test --filter provegate`  | new.test.ts            | memory sections absent when the contract is off            |
| FR-3 | `pnpm test --filter provegate`  | prd-ready.test.ts      | absence passes with memory off, fails with memory on       |
| FR-4 | `pnpm test --filter provegate`  | chain.test.ts          | the stop names the configured path and the ledger row columns |
| FR-1 | `pnpm test --filter provegate`  | chain.test.ts          | test `"an unedited instantiated tasks template fails the Phase-6 gate"` — real chain, freshly instantiated file, failure required |
| FR-5 | `pnpm test --filter provegate`  | new.test.ts            | rendered template instantiates; four drift shapes each refuse |
| FR-6 | `pnpm verify:quickstart-parity` | both quickstart copies | order assertion fails when the recipe follows the close section |
| FR-6 | `pnpm test --filter provegate`  | content-hygiene.test.ts | test `"NEXT_STEPS numbered headings are unique and sequential"` |
| FR-6 | `pnpm test --filter provegate`  | cli.test.ts             | test `"the new help line advertises --tasks and --review"` |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm smoke:adopter` — the delivered CLI still closes a PRD end to end

Before Phase 2 PASS, run: `gate check PRD-042`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT overwrite an artifact that already exists; refuse, as `gate init` does.
- DO NOT invent a template language — anchored substitution and enumerated tokens only.
- DO NOT move QUICKSTART prose in one copy without the other.

---

## Changelog

| Date       | Author | Changes                                                      |
| ---------- | ------ | ------------------------------------------------------------ |
| 2026-08-07 | owner  | Initial draft — the hand-work measured in the first adopter run |
| 2026-08-07 | owner  | Iteration 1 rework (Codex 6.1 ITERATE): FR-1 destination paths derived from `dirs.artifacts.tasks` / `dirs.reviewsDir` with exact-id resolution, mutually exclusive modes, `wx`-atomic contained writes and three refusals; FR-2 replaced by a closed seven-row token→source table with precedence, empty-value behaviour, sorted unique reporting and exit 0; FR-3 states the removal grammar and the memory-on failure that stops it becoming an escape hatch; FR-4 retargeted to `chain.ts::buildGateChain` (the message lives there, not in `review.ts`) and names the required ledger columns; FR-5 closed to a two-member anchor alternation with four deny tests and wildcards forbidden; FR-6 adds the structural order assertion to the parity verifier; every memory input rewritten to name the test that binds it; RM 4→2, value 3.75→3.45 |
| 2026-08-07 | owner  | Iteration 2 (Codex 7.7 ITERATE; 6.1→7.7, five items closed): FR-1 states the three-mode argument grammar with every mixed form refused by name; §2's metric reworded to resolvable-with-non-empty-source; `{{DOCS_ROOT}}`'s fallback named as `config.dirs.artifacts.summary.dir`; the seven rows declared the CLOSED set; a chain.test.ts regression added proving an unedited instantiated tasks template FAILS Phase 6, so the convenience cannot hand an author a pre-passed review row; §7 gained Migration & Rollback (legacy mode unchanged, both quickstart copies in one release, revert leaves created artifacts, deny tests as the rollback trigger) |
| 2026-08-07 | owner  | Iteration 3 (Codex 7.7, flat; five items CLOSED and holding): the three productions written out as a grammar block with six enumerated refusals, each with a test; FR-2 scoped as an ADDITIONAL pass that leaves every existing anchor substitution — `{{ID_PREFIX}}` included — and its drift refusals untouched; the `evidence-pattern-satisfied-by-the-template` disposition repointed from a row that did not exist to the FR-1 row, with the exact test title named; the revert story now distinguishes the older `gate new` (ignores the artifacts) from the Phase-6 chain (keeps consuming them); rollback trigger reworded to a deny test FAILING; the NEXT_STEPS heading fix given a runnable assertion instead of a promise |
| 2026-08-07 | owner  | Iteration 4 (Codex 7.9, one tenth under PASS): id resolution restricted to the configured wip role with the artifact BASENAME authoritative for number and slug (a heading an author edits is not an identifier); the eight refusals given a table of named `new.test.ts` test titles; `cli.ts::usage` added as a target so `gate --help` advertises both artifact modes, both quickstart copies teach them where they currently prescribe copying a template by hand, and a `cli.test.ts` content assertion fails while either is unadvertised — a feature the help text does not mention is a feature an adopter does not find |
| 2026-08-07 | owner  | **Correction.** The iteration-3 and iteration-4 rows above claimed an FR-1 production grammar, identity rule and refusal table that were never written to this file — the edits silently no-opped (`python str.replace` on a prettier-formatted artifact, the trap this repository has recorded twice). The scorer caught it both times as MP-1 OPEN and the changelog kept saying otherwise. The content is now present and was verified by reading the file back, not by trusting the edit |
| 2026-08-07 | owner  | Phase 4, task 1.0 — the three readiness watch items closed in the PRD before any code. W1: the artifact-substitution table is now closed, and it deliberately leaves `Base SHA` and `Quorum` EMPTY in the review artifact (a pre-filled SHA claims a diff nobody read; a supplied quorum is a panel nobody convened). W2: `cli.ts::usage` and `cli.test.ts` moved from FR-1 to FR-6, so the requirement owning discoverability owns its targets. W3: §6 and §11 now carry all eight refusal categories and their exact test titles, counted rather than read |
| 2026-08-07 | owner  | Phase 4 scope expansion, declared: `scripts/adopter-smoke.sh` and `scripts/adopter-smoke-fill.mjs` join the Conflict Surface. FR-3 breaks both by construction — the fill script fills the memory sections `gate new` now omits, and the smoke asserts a lint refusal FR-2 removes — so leaving them untouched would have landed a change that knowingly reddens the only check watching an install. Recorded rather than taken silently, at phase-6 round 2's request |

