# Tasks: Conflict Detection Hardening

> **PRD**: [prd-009-conflict-structural-hardening.md](../../_prds/wip/prd-009-conflict-structural-hardening.md)
> **Readiness**: [readiness-009-conflict-structural-hardening.md](../../_readiness/wip/readiness-009-conflict-structural-hardening.md)
> **Status**: Not Started
> **Readiness Score**: 8.6/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-24
> **Updated**: 2026-07-24

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

## Relevant Files

- `packages/provegate/src/core/locks/glob.ts` — add `globsMayIntersect`; home of `globToRegExp`
- `packages/provegate/src/core/locks/conflicts.ts` — rewrite `structuralOverlap`; delete false-negative comment
- `packages/provegate/test/glob.test.ts` — intersect matrix (pairs × verdict)
- `packages/provegate/test/conflicts.test.ts` — end-to-end sibling refusal + disjoint control
- `apps/docs/content/docs/cli.mdx` — structural-overlap guarantee described

### Notes

- `test-hardening` class: diagnostic completes before the fix; the fix is
  minimum-blast-radius. Materialized (tracked-file) overlap is untouched.
- Code surface (`locks/**`) is disjoint from every other in-flight PRD; the only
  shared path is `cli.mdx` with PRD-008 — sequence the doc edit.
- Reference: `conflicts.ts:63` (comment), `:64-73` (structuralOverlap), `:99`
  (zero-materialization trigger), `glob.ts:5` (`globToRegExp`).

---

## Tasks

- [ ] 0.0 Pre-flight
  - [ ] 0.1 Claim the work item (`gate open PRD-009`); hold a valid lease before
        editing.
  - [ ] 0.2 Baseline repro: add FAILING cases to `test/glob.test.ts` for the two
        documented misses — `src/api/*.ts` ~ `src/api/users.ts` and
        `src/*/handlers/**` ~ `src/auth/handlers/**` — asserting they SHOULD
        intersect. Confirm they fail against today's code before any fix. (FR-3)

- [ ] 1.0 Diagnostic (must complete before Fix)
  - [ ] 1.1 Read `core/locks/glob.ts` + `conflicts.ts`; confirm root cause: today's
        `structuralOverlap` (`conflicts.ts:64-73`) only catches identical or
        prefix-nested normalized globs (`normalizeGlob` + `startsWith`), so
        sibling patterns miss.
  - [ ] 1.2 Enumerate the supported grammar `globToRegExp` compiles (`**`, `*`,
        `?`, literals — no braces, no char classes, no negation); record it in the
        module header comment planned for 2.1. This grammar is the ONLY input
        space `globsMayIntersect` must be sound over. (FR-1)

- [ ] 2.0 Fix
  - [ ] 2.1 Add `globsMayIntersect(a, b)` to `core/locks/glob.ts`: segment-wise
        simultaneous walk (literal↔literal by equality; `*`/`?` unify within a
        segment; `**` unifies across segments), memoized on `(indexA, indexB)`,
        bounded; zero dependencies. Sound: returns `true` whenever any concrete
        path matches both. Document the decision rules + conservative bias in the
        module header. (FR-1)
  - [ ] 2.2 Rewrite `structuralOverlap` (`conflicts.ts`) to call
        `globsMayIntersect` instead of the normalize+prefix check; keep the
        `${ag} ~ ${bg}` reporting shape and the "only when a side materializes to
        zero files" trigger (`conflicts.ts:99`) unchanged. (FR-2)
  - [ ] 2.3 Expand `test/glob.test.ts` into the full intersect matrix: the two
        baseline misses (now passing), literal-vs-wildcard, star-crossing
        (`src/*/x/**` ~ `src/a/x/**`), `?`-vs-literal, `**` boundary cases, and
        disjoint controls (`src/a/**` ~ `src/b/**`, `*.md` ~ `*.ts`). Every pair
        carries its expected verdict. (FR-3)
  - [ ] 2.4 `test/conflicts.test.ts`: end-to-end — `gate open` refuses a sibling
        pair with ZERO tracked files (names `a ~ b`); a disjoint pair claims in
        parallel. (FR-3)

- [ ] 3.0 Audit
  - [ ] 3.1 Grammar-stability check: no new glob syntax introduced (grep the diff
        for brace/char-class/negation handling — none). (§12)
  - [ ] 3.2 No-weakening check: the full prior suite passes unchanged; no existing
        passing pair was edited to make the matrix green. (§12)
  - [ ] 3.3 Confirm materialized overlap and its precedence over the structural
        check are untouched. (§12)
  - [ ] 3.4 Confirm the predicate walks the PATTERNS, not the compiled regexes
        (the compiled form erases segment structure). (§12)

- [ ] 4.0 Doc
  - [ ] 4.1 Delete the `documented false-negative` comment in `conflicts.ts`
        (it stops being true); the module-header decision rules from 2.1 replace
        it. (FR-4)
  - [ ] 4.2 `apps/docs/content/docs/cli.mdx`: describe the structural-overlap
        guarantee and its conservative-refusal bias. (FR-4)

- [ ] 5.0 Quality gate
  - [ ] 5.1 Run every PRD §11 command; paste evidence into the Verification Ledger.
  - [ ] 5.2 Re-read §12 DO NOT; confirm none introduced. Cross-cutting floor:
        `pnpm check-types`, `pnpm lint`, `pnpm --filter provegate test`,
        `pnpm build`, `gate check PRD-009`, never-push, hygiene grep.

- [ ] 6.0 Phase 6 — Final Auditing
  - [ ] 6.1 Independent adversarial review of the diff → verdict artifact at
        `_docs/reviews/review-009-conflict-structural-hardening.md`. `Verdict: pass`
        requires `Critical: 0`. Reviewer attacks: soundness (any concrete path
        that matches both but returns false?), `**`-across-segment handling, the
        memoization bound.

- [ ] 7.0 Phase 7 — Learning
  - [ ] 7.1 Confirm the declared Durable Artifact
        (`apps/docs/content/docs/cli.mdx`) is in the merge diff.
  - [ ] 7.2 Knowledge ingest: the intersection-decision rules and the
        conservative-bias invariant (not derivable from the code alone).

---

## Verification Ledger

| Gate               | Command / Check                                                                       | Scope     | Result  | Evidence | Notes                          |
| ------------------ | ------------------------------------------------------------------------------------- | --------- | ------- | -------- | ------------------------------ |
| FR-1               | `pnpm --filter provegate test test/glob.test.ts`                                     | provegate | pending |          | intersect matrix, memoized walk |
| FR-2               | `pnpm --filter provegate test test/conflicts.test.ts`                                | provegate | pending |          | e2e refusal + disjoint control  |
| FR-3               | `pnpm --filter provegate test test/glob.test.ts test/conflicts.test.ts`              | provegate | pending |          | grouped rerun                   |
| FR-4               | `grep -c "documented false-negative" packages/provegate/src/core/locks/conflicts.ts` | provegate | pending |          | expect 0 (grep exits 1)         |
| types              | `pnpm check-types`                                                                    | root      | pending |          | zero errors                     |
| lint               | `pnpm lint`                                                                           | root      | pending |          | zero warnings                   |
| test               | `pnpm --filter provegate test`                                                        | provegate | pending |          | full suite; priors unchanged    |
| build              | `pnpm build`                                                                          | root      | pending |          | clean, both apps too            |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-009`                                   | repo      | pending |          | PRD passes its own gate         |
| never-push         | `node packages/provegate/dist/cli.js push; test $? -eq 1`                             | repo      | pending |          | refusal exit 1                  |
| hygiene            | `grep -ri -l -e emofy -e rayvaz packages/provegate/src && exit 1 \|\| true`           | provegate | pending |          | no personal names               |
| independent-review | `_docs/reviews/review-009-conflict-structural-hardening.md`                           | repo      | pending |          | verdict pass, critical = 0      |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

- (none yet)

---

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

---

## Blockers / Open Questions

- (none — `cli.mdx` shared with PRD-008; sequence the doc edit if both are active)

---

## Operator Handoff

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
| —    | —        | —     | none — every gate is machine-checkable | — | pure engine + test change; Autonomous Close candidate at close |
