# Tasks: Case Study, Part Two — the Tool's Own Ledger

> **PRD**: [prd-037-case-study-self-hosting.md](../../_prds/wip/prd-037-case-study-self-hosting.md)
> **Readiness**: [readiness-037-case-study-self-hosting.md](../../_readiness/wip/readiness-037-case-study-self-hosting.md)
> **Status**: Not Started
> **Readiness Score**: 8.40/10 (iteration 5, PASS — fifth independent scorer)
> **Model Tier (Execution)**: high
> **Model Tier (Audit)**: high
> **PRD Class**: feature
> **Autonomous Close**: operator-gated
> **Created**: 2026-07-28

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned or blocked tasks unchecked; decisions in
  **Deferrals & Decisions**, human work in **Operator Handoff**.
- The close is **operator-gated**: the merge gate refuses without an owner-signed
  acceptance entry; the agent transcribes only on explicit in-session direction.
- Phase 4 agents hold a valid lock lease before editing implementation files or this
  task file.
- The PRD changelog is HISTORY, not a normative source. Implement from
  §4/§6/§7/§11 — five readiness iterations moved this document; the FRs as they
  stand are the contract.
- No `any`, no `eslint-disable`, no `|| true`. Every edit batch that claims a sweep
  is verified by grep BEFORE the changelog row claims it (this PRD's own cycle
  caught two silent lost-write incidents).

---

## Memory Context

- `false-green-on-missing-file` — the script and the harness fail loudly on absent
  or malformed inputs; an empty figure table can never render as success. Binds 1.0.
- `a-rule-corrected-survives-where-it-is-restated` — the no-digit rule exists in ONE
  place (FR-2's `[0-9]`-in-H2-span predicate) and everywhere else repeats it
  verbatim; the sweep discipline applies to every doc edit here. Binds 2.0, 4.0.
- `docs-outlive-the-gate-they-promise` — every figure is bound to a live check
  (FR-3); the section cannot outlive its evidence. Binds 3.0.
- `evidence-pattern-satisfied-by-the-template` — the drift gate compares VALUES
  byte-for-byte, never the presence of a table shape. Binds 3.0.
- (principle, record pending) recompute-figures-from-state: the substance of
  PRD-034's declared `recompute-beats-recorded-state` output — not yet an indexed
  record, stated as FR-1's own rule; append it as an input if 034 lands first.

---

## Relevant Files

- `scripts/derive-self-hosting-figures.mjs` — NEW: derivation + region tool
  (`--print`/`--write`/`--check`; default = usage/exit 2)
- `scripts/verify/derive-figures.test-cases.mjs` — NEW: the fixture harness
- `apps/docs/content/docs/case-study.mdx` — the section, region, framing line
- `scripts/verify/verify-doc-claims.mjs` — the `--check` invocation row
- `_docs/reviews/review-037-case-study-self-hosting.md` — Phase 6 artifact
- `_docs/wip/summary-037-case-study-self-hosting.md` — Phase 7 summary

---

## Tasks

- [ ] 0.0 Pre-flight
  - [ ] 0.1 `gate queue`, then `node packages/provegate/dist/cli.js open PRD-037` —
        four-path surface, expected disjoint from every active lease.
  - [ ] 0.2 Board row in `STATUS.md`; worktree
        (`git worktree add -b prd-037-case-study-self-hosting ../provegate-prd-037 main`
        + `pnpm install --frozen-lockfile`).
  - [ ] 0.3 Baseline: record in the Progress Log the CURRENT `_state/prds.json`
        derivable pair values (a quick node probe — the numbers the first `--write`
        will embed).
- [ ] 1.0 FR-1 — the derivation script (red-first)
  - [ ] 1.1 Write `scripts/verify/derive-figures.test-cases.mjs` FIRST with the full
        case list and watch it fail: shipVerified count; closeModes fixed-order
        known values; `unclassified {count, ids}` (ids sorted) as SUCCESS for
        unknown/missing `autonomousClose`; consumed-state schema violations failing
        by lowest array index naming index and field; absent/unreadable state naming
        the path; the invocation-matrix classes (zero flags, combined flags, each
        flagged mode); sentinel failures (missing/duplicate/inverted) in all three
        flagged modes; stale region bytes → first-differing-line; outside-byte
        preservation under `--write`; the `[0-9]`-in-H2-span predicate; the
        `[#self-hosting-ledger]` source token.
  - [ ] 1.2 Implement `scripts/derive-self-hosting-figures.mjs` to the canonical
        invocation matrix: exactly one mode flag; default/invalid/combined → usage
        to stderr, exit 2, nothing read; `--print` → content (sentinels excluded)
        to stdout; `--write` → bytes strictly between the pair only; `--check` →
        first differing line to stderr, exit 1. Figure source: `_state/prds.json`
        alone; flagged modes read the MDX only for sentinel work.
  - [ ] 1.3 Harness green; mutation sanity: break one contract (fold an unknown
        close mode into `eligible`), watch the harness fail by name, revert.
- [ ] 2.0 FR-2 — the section and the region
  - [ ] 2.1 `apps/docs/content/docs/case-study.mdx`: add
        `## Part two: the tool's own ledger [#self-hosting-ledger]`, the sentinel
        pair, the regeneration rule beside the region, interpretation prose with
        ZERO digits outside the pair (grep-verified before commit), the unnumbered
        honesty texture (failing rounds, reverted claims), and the origin section's
        two-evidence-classes framing line.
  - [ ] 2.2 First `--write` populates the region; `--check` green immediately after.
- [ ] 3.0 FR-3 — the drift gate
  - [ ] 3.1 `scripts/verify/verify-doc-claims.mjs` invokes
        `node scripts/derive-self-hosting-figures.mjs --check`; a planted stale byte
        fails the lint naming the first differing line (probe run-and-reverted,
        Progress Log).
- [ ] 4.0 FR-4 — honesty boundaries
  - [ ] 4.1 Verify by grep: the H2 span carries no digit outside the pair; the
        origin ~390 keeps its externally-sourced label; no competitor mention.
- [ ] 5.0 Phase 5 — Testing: every §11 row, then the floor
  - [ ] 5.1 `node scripts/derive-self-hosting-figures.mjs --print`
  - [ ] 5.2 `node scripts/verify/derive-figures.test-cases.mjs`
  - [ ] 5.3 `pnpm verify:doc-claims` (×2 claims: drift + span rule)
  - [ ] 5.4 Floor: `pnpm check-types` && `pnpm lint` && `pnpm test` && `pnpm build`
  - [ ] 5.5 Re-read PRD §12 DO NOT — no typed figure, no estimated count, no hidden
        failed rounds, no `apps/web` touch, no competitor claim.
- [ ] 6.0 Phase 6 — Final Auditing
  - [ ] 6.1 Independent adversarial review (different model/session; `Critical: 0`;
        `Quorum: 1/1 pass`; real Base SHA) →
        `_docs/reviews/review-037-case-study-self-hosting.md`. Reviewer explicitly
        re-verifies the three iteration-5 watch items stayed consistent.
  - [ ] 6.2 `pnpm verify:workflow` green after any fix; draft
        `_docs/wip/summary-037-case-study-self-hosting.md`.
- [ ] 7.0 Phase 7 — Learning and close (operator-gated)
  - [ ] 7.1 Memory Outputs `none` verified honest: if implementation surfaced a
        non-derivable trap, append the output with a rationale instead.
  - [ ] 7.2 `pnpm verify:durable-artifacts` — the review artifact in the merge diff.
  - [ ] 7.3 Owner acceptance transcribed on explicit direction.
  - [ ] 7.4 `node packages/provegate/dist/cli.js run PRD-037` — **from the primary
        checkout, never from inside the worktree** (`gate-run-resume-after-archive`,
        incl. the PRD-031 variant: a worktree-run close cannot check out main); on a
        stop after "archived", un-archive and resume `--from-phase=7`.
  - [ ] 7.5 `release PRD-037`, drop the board row, remove the worktree.

---

## Verification Ledger

| Gate | Command / Check | Scope | Result | Evidence | Notes |
| ---- | --------------- | ----- | ------ | -------- | ----- |
| FR-1 | `node scripts/derive-self-hosting-figures.mjs --print` | repo | pending | | matrix + sentinel rules |
| FR-1 | `node scripts/verify/derive-figures.test-cases.mjs` | repo | pending | | full case list red-first |
| FR-2/3 | `pnpm verify:doc-claims` | repo | pending | | region byte-equality via `--check` |
| FR-4 | `pnpm verify:doc-claims` | repo | pending | | H2-span digit rule |
| types/lint/test/build | the floor | monorepo | pending | | |
| independent-review | `Critical: 0`, Quorum `1/1 pass` | review | pending | | watch-item consistency re-verified |
| durable | `pnpm verify:durable-artifacts` | repo | pending | | |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

## Deferrals & Decisions

- (none yet)

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

## Blockers / Open Questions

- (none)

## Operator Handoff

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
| 7.3 | manual-qa | owner | owner-signed acceptance covering the close (section read, figures spot-checked against one `--print` run) | pending | agent transcribes only on explicit direction |
