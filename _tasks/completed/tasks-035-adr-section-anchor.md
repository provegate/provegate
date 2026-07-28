# Tasks: ADR Section Anchor — the Formatter Must Not Break Every ADR

> **PRD**: [prd-035-adr-section-anchor.md](../../_prds/wip/prd-035-adr-section-anchor.md)
> **Readiness**: [readiness-035-adr-section-anchor.md](../../_readiness/wip/readiness-035-adr-section-anchor.md)
> **Status**: Ship Verified
> **Readiness Score**: 8.20/10 (iteration 2, PASS)
> **Model Tier (Execution)**: high
> **Model Tier (Audit)**: high
> **PRD Class**: hotfix
> **Autonomous Close**: eligible
> **Created**: 2026-07-28

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
- No `any` casts, no `eslint-disable`, no `|| true` to quiet a blocker — surface
  the error verbatim instead.

---

## Memory Context

The slugs the PRD selected as Memory Inputs, carried here so implementation does not
re-derive them. Each binds to the parent whose work depends on it:

- `adr-section-blank-line-reads-empty` — the record this PRD retires. Its "how to
  apply" ends with *fix it in the parser*; 2.0 is that fix, 4.0 the retirement.
- `two-parsers-wrong-together` — all three copies shared one wrong anchor, so no
  parity check could surface it; the corpus asserted correct verdicts but had no
  case with the formatter's shape. The 1.0 case adds that coverage, asserting the
  document IS valid, never that implementations match. Binds 1.0.
- `narrow-the-grammar-not-the-parser` — reviewed: one anchor token changes; the
  `^## ` stop and everything else stays. Binds 2.0.
- `strictness-added-during-extraction-is-a-behavior-change` — reviewed: this widens
  what validates; the acceptance criteria pin that no valid document becomes invalid
  and no genuinely empty section becomes legal. Binds 2.0 and 5.0.
- `assert-absent-needs-an-independent-cause` — the mutation probes in 5.0 restore the
  anchor ONLY and leave the corpus untouched, so a failure's cause is the anchor, not
  a removed case. Watch covers `packages/provegate/test/**`; applied to the root
  runner voluntarily. Binds 1.0 and 5.0.
- `false-green-on-missing-file` — applied voluntarily (record declares no watch): the
  3.0 runner exits non-zero naming a missing/unparseable fixture; it never iterates
  zero cases into a pass. Binds 3.0.
- `turbo-cache-masks-out-of-input-reads` — why the runner is a root script outside
  turbo, never a package test reading repo paths. Binds 3.0.

---

## Relevant Files

- `packages/provegate/src/core/memory/parse.ts` — anchor fix, copy 1 (typed parser, ~line 581)
- `scripts/verify/lib.mjs` — anchor fix, copy 2 (repository validator, ~line 335)
- `packages/provegate/practices/verify/lib.mjs` — anchor fix, copy 3 (shipped validator, ~line 335)
- `packages/provegate/test/fixtures/memory-record-cases.json` — new valid case (FR-2)
- `packages/provegate/test/memory.test.ts` — corpus executes typed + shipped copies (unchanged unless the new case needs nothing; read-only reference)
- `scripts/verify/verify-memory-record-corpus.mjs` — NEW: FR-5 runner (repo copy execution + prettier smoke + fail-closed)
- `package.json` — NEW script key `verify:memory-corpus` (shared append-only; not in Conflict Surface)
- `scripts/verify/verify-workflow.mjs` — `CHECKS` gains the runner (FR-5 wiring)
- `scripts/verify/pack-drift-ledger.json` — BOTH pairs reconciled: `verify/lib.mjs` (anchor moved on both sides) and `verify/verify-workflow.mjs` (repository-only divergence + `note`)
- `_brain/learnings/adr-section-blank-line-reads-empty.md` — retired to the general lesson (FR-4)
- `_brain/INDEX.md` — hook line follows the retired record (shared append-only; not in Conflict Surface)
- `_docs/reviews/review-035-adr-section-anchor.md` — Phase 6 independent review artifact
- `_docs/wip/summary-035-adr-section-anchor.md` — Phase 7 summary

---

## Tasks

- [x] 0.0 Pre-flight
  - [x] 0.1 `node packages/provegate/dist/cli.js open PRD-035` — lease the Conflict
        Surface; refuse-on-overlap is the point (PRD-024/026/036 sessions may hold
        `turbo.json`/`safety.ts`; no overlap expected with this surface).
  - [x] 0.2 Add the Active Agents row to `STATUS.md` (PRD-035, Phase 4, date).
  - [x] 0.3 Baseline: `pnpm verify:brain` green on the untouched store.
  - [x] 0.4 Baseline repro on a COPY (never the live store): copy
        `_brain/adr/ADR-0003-acceptance-authorship.md` to the scratchpad, insert one
        blank line after `## Context`, run the repository validator against the copy,
        confirm the exact FAIL message the PRD §1 quotes. Record the trace in the
        Progress Log.
- [x] 1.0 Repro at corpus level (red-first)
  - [x] 1.1 Add the FR-2 case to
        `packages/provegate/test/fixtures/memory-record-cases.json`: an ADR whose
        EVERY section heading is followed by exactly one blank line, expected
        **valid** — a behavioural claim, not a parity claim. Follow the existing case
        schema (`id`, `content`, `slug`, `isAdr`, `valid`; bare `fields` only for
        invalid cases). Suggested id: `adr-blank-line-after-every-heading-valid`.
  - [x] 1.2 Run `pnpm --filter provegate test test/memory.test.ts` — the new case
        MUST fail on both executed implementations (typed parser and shipped copy)
        before any fix lands. Record the red output in the Progress Log.
- [x] 2.0 Fix — the anchor in three copies
  - [x] 2.1 `packages/provegate/src/core/memory/parse.ts`: replace the `$`
        alternative in the section-capture lookahead with `(?![\s\S])`, keeping
        `^## ` and the `m` flag: `(?=^## |(?![\s\S]))`. The comment above the
        expression states why `$` was wrong in terms of `/m` (matches at every
        line end, including a zero-length position on a blank line).
  - [x] 2.2 Same one-token change + comment in `scripts/verify/lib.mjs`.
  - [x] 2.3 Same one-token change + comment in
        `packages/provegate/practices/verify/lib.mjs`.
  - [x] 2.4 `pnpm --filter provegate test test/memory.test.ts` — the new case passes
        on both executed implementations; `adr-empty-section-adjacent` (heading
        immediately followed by heading) still fails as invalid; zero other case
        movement.
- [x] 3.0 FR-5 — the repository corpus runner and its wiring
  - [x] 3.1 Create `scripts/verify/verify-memory-record-corpus.mjs`: load every case
        from `packages/provegate/test/fixtures/memory-record-cases.json`, run
        `validateMemoryRecord` from `scripts/verify/lib.mjs` (relative import), and
        assert expected validity plus **bare-field containment** — the same contract
        `memory.test.ts`'s first assertion uses. Do NOT implement `field#entry`
        keying: that is the package test's cross-implementation parity contract and
        the fixture declares no expected entry keys (PRD FR-5; readiness iteration-2
        Missing Piece 2).
  - [x] 3.2 In the same runner, the formatter smoke: format the FR-2 case's content
        with the repository's installed prettier (`import prettier from 'prettier'`,
        markdown parser — root devDependency, NOT a `packages/provegate` dependency),
        re-validate the formatted output, assert it stays valid with every section
        body captured non-empty.
  - [x] 3.3 Fail-closed: a missing or unparseable fixture file exits non-zero naming
        the path — never zero cases iterated into a pass. Exit code 1 on any case
        failure; print one line per failing case (id + expected vs got).
  - [x] 3.4 Register `"verify:memory-corpus": "node scripts/verify/verify-memory-record-corpus.mjs"`
        in root `package.json` (append; shared append-only file).
  - [x] 3.5 Add `verify-memory-record-corpus.mjs` to the `CHECKS` array in
        `scripts/verify/verify-workflow.mjs` — the wire-or-delete audit's executing
        surface for the new check.
  - [x] 3.6 `pnpm verify:memory-corpus` green (79 cases + smoke); then mutation
        sanity: temporarily restore `$` in `scripts/verify/lib.mjs`, observe the new
        case fail BY NAME, revert. Record both outputs in the Progress Log.
- [x] 4.0 Reconcile and retire
  - [x] 4.1 Reconcile BOTH moved pack-drift pairs (per the ledger `_readme`
        procedure): `verify/lib.mjs` ↔ `scripts/verify/lib.mjs` (anchor moved on
        both sides), and `verify/verify-workflow.mjs` ↔
        `scripts/verify/verify-workflow.mjs` — the latter gains a ledger `note`
        recording the repository-only divergence: adopters receive neither the
        fixture nor the runner (PRD FR-3).
  - [x] 4.2 `pnpm verify:pack-drift` green.
  - [x] 4.3 Retire `_brain/learnings/adr-section-blank-line-reads-empty.md` to what
        remains true: the general lesson — `$` under `/m` is end-of-line, not
        end-of-input, and an agreement corpus proves nothing about correctness
        (three implementations were wrong together here). Keep the record's
        frontmatter valid; do not delete it. NO packed twin is created (PRD FR-4,
        §5 non-goal).
  - [x] 4.4 Update the record's hook line in `_brain/INDEX.md` to match the retired
        content.
  - [x] 4.5 `pnpm verify:brain` green.
- [x] 5.0 Phase 5 — Testing: every PRD §11 command, then the floor
  - [x] 5.1 `pnpm verify:memory-corpus` — FR-1 (formatter smoke) + FR-5 (repo copy
        executes all cases; loud on missing fixture)
  - [x] 5.2 `pnpm --filter provegate test test/memory.test.ts` — FR-1 + FR-2
  - [x] 5.3 `pnpm verify:pack-drift` — FR-3
  - [x] 5.4 `pnpm verify:brain` — FR-1 + FR-4
  - [x] 5.5 `pnpm verify:workflow` — FR-5 bundle membership (the direct command
        cannot prove CHECKS membership; this one does)
  - [x] 5.6 Mutation probes (verification only, reverted immediately, corpus
        untouched — `assert-absent-needs-an-independent-cause`): restore `$` in
        `parse.ts` → package corpus test fails the new case; restore in the shipped
        copy → same; restore in `scripts/verify/lib.mjs` → `verify:memory-corpus`
        fails the new case. Three probes, three reverts, evidence in the ledger.
  - [x] 5.7 Cross-cutting floor: `pnpm check-types` && `pnpm lint` && `pnpm test`
        && `pnpm build` — all green.
  - [x] 5.8 Re-read PRD §12 DO NOT — confirm none introduced (the `m` flag intact,
        `^## ` intact, no live-store reformat, no packed seed, no turbo-cached
        cross-boundary read).
- [x] 6.0 Phase 6 — Final Auditing
  - [x] 6.1 Independent adversarial review by a different model or session (never
        this author): verdict `pass` with `Critical: 0` required. Artifact at
        `_docs/reviews/review-035-adr-section-anchor.md` — include the `Quorum`
        field (`1/1 pass`): the shipped template calls it optional but
        `core/gates/review.ts` refuses an artifact without it (open deferral,
        "Review template contradicts the review gate").
  - [x] 6.2 `pnpm verify:workflow` green after any review-driven fix.
  - [x] 6.3 Draft `_docs/wip/summary-035-adr-section-anchor.md`.
- [x] 7.0 Phase 7 — Learning and close
  - [x] 7.1 Memory Outputs check: the declared output
        (`_brain/learnings/adr-section-blank-line-reads-empty.md`, edited) is in the
        closing diff; no output weakened vs the PRD as committed on `main`.
  - [x] 7.2 `pnpm verify:durable-artifacts` — every Durable Artifacts path present
        in the merge diff (learning, INDEX hook, review artifact).
  - [x] 7.3 `_brain` capture protocol (`_brain/PROTOCOL.md` §7): if implementation
        hit a non-derivable trap, write the learning now; else record
        `Learning: none beyond the declared output` in the summary.
  - [x] 7.4 `node packages/provegate/dist/cli.js run` — gated Phases 4-7 re-verified
        by the chain + local merge (close is `eligible`; NO operator acceptance row
        needed; push stays the owner's).
  - [x] 7.5 `node packages/provegate/dist/cli.js release PRD-035`, remove the
        STATUS.md Active Agents row, archive artifacts wip → completed per the
        chain's output.

---

## Verification Ledger

| Gate | Command / Check | Scope | Result | Evidence | Notes |
| ---- | --------------- | ----- | ------ | -------- | ----- |
| FR-1/FR-5 | `pnpm verify:memory-corpus` | repo | passed | 79 cases + smoke, PASS 2026-07-28 | 79 cases + formatter smoke + fail-closed |
| FR-1/FR-2 | `pnpm --filter provegate test test/memory.test.ts` | pkg | passed | 75/75; red-first proven before fix | new case valid on typed + shipped; adjacent-heading case still invalid |
| FR-3 | `pnpm verify:pack-drift` | repo | passed | 49 pairs, both moved pairs reconciled, note on workflow pair | both pairs reconciled; workflow pair carries the divergence note |
| FR-4 | `pnpm verify:brain` | repo | passed | PASS after hook shortened to <=120 chars | retired record parses; INDEX hook resolves |
| FR-5 | `pnpm verify:workflow` | repo | passed | bundle executes runner as CHECKS member, PASS | runner executes as CHECKS member |
| mutation | three anchor-restore probes, reverted | repo+pkg | passed | each failed the new case by name; see Progress Log | each fails the new case by name, nothing else |
| types | `pnpm check-types` | monorepo | passed | 4/4 tasks | |
| lint | `pnpm lint` | monorepo | passed | 4/4 tasks, zero warnings | |
| test | `pnpm test` | monorepo | passed | 7/7 tasks | |
| build | `pnpm build` | monorepo | passed | 4/4 tasks | |
| independent-review | different model/session, `Critical: 0`, Quorum `1/1 pass` | review | passed | 3 rounds, GATE FAIL->FAIL->PASS, Codex session 019fa837… | `_docs/reviews/review-035-adr-section-anchor.md` |
| durable | `pnpm verify:durable-artifacts` | repo | passed | gate chain: all declared paths in merge diff |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

## Deferrals & Decisions

- 6.1 — [P1] formatter claim narrowed to body scope; prettier's frontmatter list reflow pinned as an executing limitation in the runner; the learning keeps the live format-sweep warning instead of retiring fully.
- 6.1 — [P1] learning's history corrected: corpus asserted correctness but had a coverage hole and a never-executed repo copy; "agreement-only" claim removed.
- 6.1 — [P2] workflow ledger note restored to prior rationale + appended the new divergence, instead of overwriting.
- 6.1 round 2 — [P1] pin rebuilt on the repository prettier config (resolveConfig; printWidth 100) with three assertions: source valid, bytes changed, output refused — a default-width pin was a false green about `pnpm format`.
- 6.1 round 2 — [P1] stale "agreement-only" corpus history swept out of PRD goal 2, §7, FR-2, DO NOT, and this file's Memory Context; the durable learning was already correct.

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
| 2026-07-28 | 0.4 | repro on scratchpad copy of ADR-0003: blank line after `## Context` -> `body — the '## Context' section is empty`, exact PRD §1 message |
| 2026-07-28 | 1.2 | red-first: typed parser `expected [ 'body' ] to deeply equal []`; shipped copy flagged all four sections empty (direct node run) |
| 2026-07-28 | 5.6 | probes: repo copy -> verify:memory-corpus failed case by name + smoke; parse.ts -> package test failed case; shipped copy -> parity test "the two implementations disagree" on the case. All reverted, all suites green after |
| 2026-07-28 | 5.6 | incident: probe 2 was first reverted with `git checkout parse.ts`, which also dropped the uncommitted fix; caught by re-grep before commit, fix re-applied, later probes reverted by string-replace only |
| 2026-07-28 | 4.4 | verify:brain caught the rewritten INDEX hook at 144 chars (budget 120); hook shortened, PASS |

## Blockers / Open Questions

- (none)

## Operator Handoff

> Close is `eligible`: no operator-owned rows exist by design. If implementation
> discovers one, the PRD's Autonomous Close field must flip to `operator-gated`
> before the close — never checked off as done.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
|      |          |       |                |        |       |
