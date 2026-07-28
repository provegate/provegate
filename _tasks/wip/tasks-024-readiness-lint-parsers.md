# Tasks: §11 Command Extraction — Read the Command Column, Report the Rest

> **PRD**: [prd-024-readiness-lint-parsers.md](../../_prds/wip/prd-024-readiness-lint-parsers.md)
> **Readiness**: [readiness-024-readiness-lint-parsers.md](../../_readiness/wip/readiness-024-readiness-lint-parsers.md)
> **Status**: Ship Verified (pending merge + operator acceptance)
> **Readiness Score**: 8.35/10 PASS (quorum 2/2 — concurring independent 8.18)
> **Model Tier (Execution)**: high
> **Created**: 2026-07-28
> **Updated**: 2026-07-28

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- A PRD may be `Code Complete` with operator handoff items, but it is not
  `Ship Verified` until required handoff items are resolved or explicitly accepted.
- Phase 4 agents hold a valid lock lease (METHOD.md → Locks) before editing
  implementation files or this task file.

---

## Memory Context

The slugs the PRD selected as Memory Inputs, carried here so implementation does not
re-derive them. Each one gets a re-open task below (0.1), bound to the work that depends
on it: a record is evidence only while it is true.

- `notes-column-runs-commands` — FR-1 is the parser fix its interim guidance stood in
  for; task 6.1 retires that guidance in the same change.
- `unparseable-command-must-fail-loudly` — the cell split creates a new malformed-row
  case; tasks 1.4 and 3.1 report it at the lint and refuse it at the chain, never drop it.
- `false-green-on-missing-file` — every deny fixture asserts the failure, not just the
  pass (tasks 1.5, 2.3, 3.2).
- `assert-absent-needs-an-independent-cause` — every "this token is NOT a command"
  assertion pairs with a positive control on the same input (tasks 1.5, 4.4); the
  classification fixtures are lint-green apart from the planted cell (W7).
- `fixture-must-reach-production-shape` — the corpus test calls the lint with all five
  production arguments per `cli.ts:795` (task 4.2); re-read the call site, not the PRD,
  if the signature has moved.
- `turbo-cache-masks-out-of-input-reads` — the corpus test reads repo-root PRDs, so the
  artifact root becomes a declared turbo input plus a reasoned exceptions entry (5.1–5.3).
- `known-red-ledger-must-expire` — no allowlisting an expected corpus failure, ever
  (task 4.3's assertion admits no per-file exception).
- `two-parsers-wrong-together` — one shared extractor for both readers (1.1); one
  root-to-glob assertion here, the general census is PRD-036's (4.5).
- `strictness-added-during-extraction-is-a-behavior-change` — the chain guard is new
  deliberate strictness; the bind is that **no existing test may need editing** to
  accommodate it (task 3.3). If one does, revert and narrow — do not edit the test.

---

## Relevant Files

- `packages/provegate/src/core/gates/safety.ts` — shared cell extractor, internal row
  parser (`{commands, issues}`), §11 cardinality, the three new issue prefixes;
  exported `parseVerificationCommands` signature preserved
- `packages/provegate/src/core/gates/prd-ready.ts` — `lintPrd` consumes the shared
  extractor; `hasRunnable` reads the Command cell only; surfaces parser issues
- `packages/provegate/src/core/run/chain.ts` — `buildGateChain` refuses on parser
  issues (malformed row, duplicate section); zero-section path unchanged
- `packages/provegate/test/lint-parsers.test.ts` — **new**: unit fixtures, the corpus
  pass, the classification pair, the turbo coverage assertion
- `packages/provegate/test/chain.test.ts` — refusal proofs (malformed + duplicate) and
  the new zero-section compatibility fixture
- `packages/provegate/test/safety.test.ts`, `packages/provegate/test/content-templates.test.ts`
  — existing consumers of the preserved export; must pass unedited
- `turbo.json` — `test` task gains `"inputs": ["$TURBO_DEFAULT$", "$TURBO_ROOT$/_prds/**"]`
- `scripts/verify/turbo-inputs-exceptions.json` — the reasoned `"test"` entry
- `_brain/learnings/notes-column-runs-commands.md` — interim guidance retired (edited,
  never deleted)
- `_brain/learnings/lint-must-name-the-span-it-judges.md` — **new** at Phase 7 (the
  declared Memory Output) + its one-line `_brain/INDEX.md` pointer
- `_docs/reviews/review-024-readiness-lint-parsers.md` — Phase 6 review artifact
  (Quorum row required — `core/gates/review.ts:60` refuses without it)

### Notes

- All implementation inside `packages/provegate`; tests in `packages/provegate/test/`.
- `packages/provegate` takes **zero runtime dependencies** — hard rule.
- Conflict Surface contention: `prd-ready.ts` is also claimed by PRD-026 and PRD-028
  (W3: PRD-036 extends the same turbo `inputs` array and serializes behind this PRD).
  Re-run `gate queue` at claim time.

---

## Tasks

- [x] 0.0 Pre-flight
  - [x] 0.1 Open each Memory Context record above and confirm the paths and commands it
        names still exist; record any stale finding in **Deferrals & Decisions**.
  - [x] 0.2 Claim the work item: add the STATUS.md Active Agents row, take the lock
        lease (METHOD.md → Locks), and re-run `gate queue` — stop if any active claim
        overlaps `prd-ready.ts`, `chain.ts`, `safety.ts`, `turbo.json`, or the
        exceptions file (W3).
  - [x] 0.3 Baseline: `pnpm check-types && pnpm lint && pnpm test && pnpm build` green
        before any edit; then re-run the corpus class sweep (`gate check` per wip PRD)
        and confirm **zero §11-parser-class issues** (W4). A new red matching a class
        predicate is a stop-and-report, never an allowlist.
- [x] 1.0 Shared row extractor + internal parser (`safety.ts`)
  - [x] 1.1 Extract the one cell-splitting function both readers will use: split on
        `|`, drop the empty leading/trailing components, trim each cell; well-formed =
        **≥ 2 cells**; command = cell 2; cells 3–4 optional; a fifth or later cell
        accepted and ignored.
  - [x] 1.2 Add the **internal** row parser returning commands and issues together; the
        exported `parseVerificationCommands` keeps its exact signature and array return
        (it may keep silently dropping malformed rows — status quo for programmatic
        callers, stated in the PRD).
  - [x] 1.3 §11 cardinality: select the section with `sectionsMatching` and require the
        heading to **equal** the canonical name after stripping an optional leading
        ordinal; zero sections → `§11 verification section is missing`; two or more →
        `§11 verification section is declared more than once`.
  - [x] 1.4 Emit `§11 row is malformed` for a row under two cells. **String identity is
        the contract (W1/W6):** the three new prefixes byte-exact as FR-1's table
        states them; detail may follow *only* those three; the two existing member
        strings (`FR-N: §11 row has no runnable command`, `unsafe §11 command …`) must
        not gain detail.
  - [x] 1.5 Unit fixtures in `lint-parsers.test.ts`: Notes-cell token deny **paired
        with** the same row's Command-cell positive control; two-column compatibility
        (command parsed exactly as today); five-cell ignore; malformed-row report;
        heading-variant (e.g. `## Resolved Verification Commands`) refused as not the
        section.
- [x] 2.0 Readiness lint consumes the extractor (`prd-ready.ts::lintPrd`)
  - [x] 2.1 `hasRunnable` reads the **Command cell only**: a row whose Command cell is
        prose fails as carrying no runnable command even when Notes holds an
        allowlisted token.
  - [x] 2.2 Surface the internal parser's issues as readiness issues; every existing
        issue string stays byte-identical (W1).
  - [x] 2.3 Fixtures: the prose-Command/allowlisted-Notes deny row; each of the three
        new issues asserted **under its exact prefix** (FR-2's class predicate matches
        on that text).
- [x] 3.0 Chain refusal guard (`chain.ts::buildGateChain`)
  - [x] 3.1 Refuse when the internal parser reports any issue — malformed row or
        duplicate section — before executing the readable rows. **Zero sections does
        not fire this guard**: the existing required-empty Phase-5 failure stands
        unchanged.
  - [x] 3.2 `chain.test.ts`: malformed-row refusal; duplicate-section refusal (FR-1's
        other parser-issue rule, proved at the chain, not only the lint); a **new**
        zero-section fixture proving the required-empty path unchanged (the existing
        `:173` fixture declares the section with no rows — a different case); a
        conforming table behaving exactly as today.
  - [x] 3.3 Strictness bind: run the full existing suite — **no existing test may need
        editing** to accommodate the guard. If one does, the guard reached an
        unintended case: revert and narrow (Memory Context, last entry).
- [x] 4.0 Corpus pass + classification pair + coverage assertion (`lint-parsers.test.ts`)
  - [x] 4.1 Enumerate every PRD in the **configured** wip directory
        (`dirs.artifacts.prd.dir` + the wip state role) — no hardcoded path, no pinned
        file or row count.
  - [x] 4.2 Call `lintPrd` with all **five** production arguments — config, manifest,
        content, repository root, PRD number — per `cli.ts:795`; re-read the call site
        first.
  - [x] 4.3 Assert per file: **no reported issue matches any of FR-2's five class
        predicates** — membership decided by that table and nothing else; a file red on
        an out-of-class rule does not fail the sweep; a new in-class red is reported by
        name and stops the work.
  - [x] 4.4 Classification pair (W7): two corpus-shaped fixtures, lint-green apart from
        the planted cell — conforming `Value` header or PRD number below `enforceFrom`,
        chosen deliberately. Positive: unsafe command in the **Command** cell reported
        **in class** via predicate 5. Negative: same token in the **Notes** cell → **no
        issue at all**.
  - [x] 4.5 Coverage assertion: read `turbo.json`'s `test` task `inputs`, resolve the
        configured artifact root from the same config object the sweep uses, assert at
        least one declared glob sits **at or above** that root (`$TURBO_ROOT$/` = repo
        root) — a rename fails by name.
- [x] 5.0 Turbo input + exceptions entry — one change, one commit (W2)
  - [x] 5.1 `turbo.json` `test` task: `"inputs": ["$TURBO_DEFAULT$", "$TURBO_ROOT$/_prds/**"]`
        — all three parts load-bearing (package-relative inputs; `inputs` replaces the
        default hash set; the gate refuses undeclared narrowing).
  - [x] 5.2 `scripts/verify/turbo-inputs-exceptions.json`: `"test"` entry whose written
        reason states the narrowing — the test task reads repository-root PRDs the
        package-default hash set cannot see.
  - [x] 5.3 Immediately re-run `pnpm verify:turbo-inputs` and `pnpm verify:workflow`
        (W2); both halves revert together and in order (§7 Rollback — the verifier
        refuses each half alone, `verify-turbo-inputs.mjs:60-77`).
- [x] 6.0 Memory record retire
  - [x] 6.1 Edit `_brain/learnings/notes-column-runs-commands.md` — interim guidance
        (keep backticks out of Notes) retired, the parser fix recorded, trap and
        resolution kept together. **Edit, never delete.**
- [x] 7.0 Migration & Rollback verification (infra-class parent)
  - [x] 7.1 Confirm the two-way revert order is documented and true against
        `verify-turbo-inputs.mjs:60-77` (inputs without entry refused; stale entry
        without inputs refused).
  - [x] 7.2 Re-measure the executed-command delta at implementation time: no wip PRD
        gains or loses a Phase-5 command from the scoping (the PRD's 2026-07-28
        measurement says zero — re-verify, don't inherit).
  - [x] 7.3 Export surface: `parseVerificationCommands` signature unchanged;
        `safety.test.ts:62,73,94,112` and `content-templates.test.ts:104` pass
        **unedited**.
- [x] 8.0 Phase 5 — Testing
  - [x] 8.1 Run every §11 command; record each result in the Verification Ledger with
        evidence. No ad-hoc additions, no omissions.
  - [x] 8.2 Cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`,
        `pnpm build`, `pnpm verify:workflow` — all green.
- [x] 9.0 Phase 6 — Final Auditing
  - [x] 9.1 Independent adversarial review (different model or session — never this
        implementation's author): artifact at
        `_docs/reviews/review-024-readiness-lint-parsers.md`, Quorum row present,
        verdict `pass` with `Critical: 0`.
  - [x] 9.2 W1 check: FR-1's prefix table, FR-2's predicate table, and the shipped
        strings agree byte-for-byte.
  - [x] 9.3 W5 vacuity check: temporarily mutate the implementation (e.g. widen the
        parser back to whole-row), watch the classification positive control go red,
        revert. A deny sweep that cannot fail is not evidence.
  - [x] 9.4 Confirm W6/W7 are honored in code: predicate 4 matched full-match against
        an unmodified string; fixtures lint-green apart from the planted cell.
- [x] 10.0 Phase 7 — Learning & close
  - [x] 10.1 Write `_brain/learnings/lint-must-name-the-span-it-judges.md` (the
        declared Memory Output) and append its one-line pointer to `_brain/INDEX.md`
        (capture protocol §7 — a learning without its pointer is not captured).
  - [x] 10.2 Confirm both durable learnings and the review artifact are in the merge
        diff (`verify:durable-artifacts` runs in the bundle; Memory Outputs are
        compared against the PRD as committed on `main`).
  - [ ] 10.3 Write the summary artifact to the configured summary directory and move
        the PRD/readiness/tasks artifacts to `completed/` per the close flow.
  - [ ] 10.4 Board: remove the Active Agents row, update Current state, re-run
        `gate status`. Push stays with the owner.

---

## Verification Ledger

One row per PRD §11 command (pre-populated by Phase 3, all `pending`), plus the
cross-cutting floor and the review row. `gate run` reads the `independent-review` row:
it must be `passed` and name the review artifact path.

| Gate               | Command / Check                                            | Scope | Result  | Evidence | Notes                      |
| ------------------ | ---------------------------------------------------------- | ----- | ------- | -------- | -------------------------- |
| FR-1               | `pnpm --filter provegate test test/lint-parsers.test.ts`   | pkg   | passed  | 12/12 tests, 2026-07-28 | row grammar + column scoping fixtures |
| FR-1               | `pnpm --filter provegate test test/lint-parsers.test.ts`   | pkg   | passed  | same run — exact-prefix + cardinality fixtures | lint issues under exact prefixes; cardinality |
| FR-1               | `pnpm --filter provegate test test/chain.test.ts`          | pkg   | passed  | 4 new refusal/compat tests green, 2026-07-28 | refusals: malformed + duplicate; zero-section unchanged |
| FR-1               | `pnpm --filter provegate test test/safety.test.ts`         | pkg   | passed  | unedited, green | exported parser unchanged |
| FR-2               | `pnpm --filter provegate test test/lint-parsers.test.ts`   | pkg   | passed  | 10 wip files, zero class issues | corpus pass, five args, class predicates |
| FR-2               | `pnpm --filter provegate test test/lint-parsers.test.ts`   | pkg   | passed  | positive in-class ×1, negative zero issues, glob covers root | classification pair + coverage assertion |
| FR-2               | `pnpm --filter provegate test`                             | pkg   | passed  | 1122 tests, 51 files, zero existing edits | whole package suite green |
| types              | `pnpm check-types`                                         | repo  | passed  | 2026-07-28 |                            |
| lint               | `pnpm lint`                                                | repo  | passed  | 2026-07-28 |                            |
| test               | `pnpm test`                                                | repo  | passed  | 7/7 turbo tasks | |
| build              | `pnpm build`                                               | repo  | passed  | clean | |
| workflow           | `pnpm verify:workflow`                                     | repo  | passed  | PASS after pack-drift reconcile | includes verify:turbo-inputs |
| independent-review | `_docs/reviews/review-024-readiness-lint-parsers.md`       | repo  | passed  | Codex, 2 rounds: 1 critical found→fixed (`1f745a9`)→re-verified clean | verdict pass, critical = 0 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

> Short single-line entries written **during Phase 4** when a non-obvious decision,
> scope cut, or accepted deviation is taken. Format: `- <task#> — <decision>; <≤1
> sentence rationale>`. Never inline on sub-task lines.

- Phase 3 — the Phase A→B approval gate was collapsed into the owner's single "go"
  (2026-07-28): parent tasks and sub-tasks generated in one pass per the protocol's
  autonomous-execution clause, recorded here as that clause requires.
- 6.1 — the edited record has a PACKED TWIN (`packages/provegate/practices/brain/learnings/notes-column-runs-commands.md`) outside the PRD's Conflict Surface; `verify:pack-drift` mechanically requires the port when the repo side changes, so the twin was edited (adopter-neutral voice) and reconciled (`scripts/verify/pack-drift-ledger.json` updated by the tool). A gate-forced one-file consequence of the in-scope record edit, not scope creep — the surface omission is a readiness gap nine rounds missed; flagged for the Phase 6 reviewer.
- 4.4 — the positive control's Command cell carries a safe runnable command beside the unsafe token; the planted token alone would also trip the no-runnable predicate and the control would assert two class issues instead of the one it names.
- 7.2 — executed-command delta re-measured at implementation time with a dist-vs-old-behavior diff across all ten wip files: zero commands gained or lost.
- 9.1 — Codex round-1 [P1]: the corpus test's root config reads (workflow.config.json, gates.manifest.json via the five-argument call) were outside the declared turbo inputs — the record's own defect arriving through its fix, one file over. Fixed in `1f745a9` (both files joined `inputs`, exception reason updated); Codex round 2 verified closed, no new findings. FR-2's two-glob input list was extended rather than contradicted; the learning's input-set clause now records the class.
- 9.3 — W5 vacuity check executed: parser temporarily widened back to whole-row locally, classification positive control went red, reverted; not committed.

---

## Progress Log

> Multi-line runtime context or deviations that don't fit one line.

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

---

## Blockers / Open Questions

- (none)

---

## Operator Handoff

> Human/runtime/staging checks the agent cannot complete. Keep the corresponding task
> checkbox unchecked until resolved or explicitly accepted.
> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`}.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
| 10.4 | manual-qa | owner | `git push` — the runner has no push path; the close is operator-gated (PRD header), so the owner records the acceptance | pending | push is always the human's call |
