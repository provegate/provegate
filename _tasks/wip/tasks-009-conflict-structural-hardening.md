# Tasks: Conflict Detection Hardening

> **PRD**: [prd-009-conflict-structural-hardening.md](../../_prds/wip/prd-009-conflict-structural-hardening.md)
> **Readiness**: [readiness-009-conflict-structural-hardening.md](../../_readiness/wip/readiness-009-conflict-structural-hardening.md)
> **Status**: Code Complete
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

- [x] 0.0 Pre-flight
  - [x] 0.1 Claim the work item (`gate open PRD-009`); hold a valid lease before
        editing.
  - [x] 0.2 Baseline repro: the pre-existing `conflicts.test.ts` assertion
        encoded the miss (`structuralOverlap(['a/x/**'],['a/y/**'])===[]` named
        "documented false-negative"); confirmed the two sibling pairs were NOT
        caught by today's prefix-only check before the fix (see Deferrals). (FR-3)

- [x] 1.0 Diagnostic (must complete before Fix)
  - [x] 1.1 Root cause confirmed: `structuralOverlap` (`conflicts.ts:64-73`) only
        caught identical or prefix-nested normalized globs (`normalizeGlob` +
        `startsWith`); sibling wildcards miss.
  - [x] 1.2 Grammar `globToRegExp` compiles enumerated (`**`, `*`, `?`, literals;
        no braces/char-class/negation) and recorded in the `glob.ts` header. (FR-1)

- [x] 2.0 Fix
  - [x] 2.1 Added `globsMayIntersect(a, b)` to `core/locks/glob.ts`: two-pointer
        token walk, memoized on `(i, j)`, monotone `i+j` (DAG, no cycles), zero
        deps. Exact over the grammar (no false negatives AND no false positives);
        unrecognized token → conservative `true`. Header documents the rules. (FR-1)
  - [x] 2.2 Rewrote `structuralOverlap` to call `globsMayIntersect`; kept the
        `${ag} ~ ${bg}` shape and the zero-materialization trigger. Added a
        `shared` param so append-only manifests are dropped from BOTH sides first
        — the structural analog of `materialize`'s subtraction (see Deferrals). (FR-2)
  - [x] 2.3 Expanded `test/glob.test.ts` with the intersect matrix (14 intersect
        + 7 disjoint pairs, both directions, plus concrete-path witnesses). (FR-3)
  - [x] 2.4 `test/conflicts.test.ts`: end-to-end greenfield sibling refusal names
        `a ~ b`; disjoint greenfield pair claims in parallel. (FR-3)

- [x] 3.0 Audit
  - [x] 3.1 No new glob syntax — `tokenizeGlob` handles only `**`/`*`/`?`/literal.
  - [x] 3.2 Full prior suite passes (447/447); the one edited assertion tested the
        OLD false-negative and now asserts the fix (sibling caught, true-disjoint
        control unchanged).
  - [x] 3.3 Materialized overlap + its precedence untouched (`materialize`, the
        `mat.size===0` trigger, and the shared-file subtraction all unchanged).
  - [x] 3.4 The predicate walks the PATTERNS (`tokenizeGlob`), never the compiled
        regex.

- [x] 4.0 Doc
  - [x] 4.1 Deleted the `documented false-negative` comment in `conflicts.ts`;
        the `glob.ts` header decision rules replace it. (FR-4)
  - [x] 4.2 `apps/docs/content/docs/cli.mdx`: structural-overlap guarantee +
        conservative-refusal bias + shared-manifest exemption documented. (FR-4)

- [x] 5.0 Quality gate
  - [x] 5.1 Ran every §11 command; evidence in the Verification Ledger.
  - [x] 5.2 Re-read §12 DO NOT — none introduced. Floor: check-types, lint,
        test (447/447), build (incl. docs), `gate check PRD-009`, never-push
        (exit 1), hygiene — all green.

- [x] 6.0 Phase 6 — Final Auditing
  - [x] 6.1 Independent adversarial review (Sonnet 5, cross-model, fresh context)
        → `_docs/reviews/review-009-conflict-structural-hardening.md`. **Verdict:
        pass** (Critical 0, High 0, Medium 1). Soundness held: 0 false negatives
        across ~115k randomized pairs vs brute-force ground truth + boundary
        matrix; memo + `i+j`-monotone confirmed; shared-exclusion correct. The one
        Medium (unbounded recursion depth → RangeError on ~6.2k-char globs) was
        FIXED in-session: `walk` rewritten iterative over an explicit stack + 1M
        state budget; regression test added. Re-ran gates green (448 tests).

- [ ] 7.0 Phase 7 — Learning
  - [ ] 7.1 Confirm the declared Durable Artifact
        (`apps/docs/content/docs/cli.mdx`) is in the merge diff.
  - [ ] 7.2 Knowledge ingest: the intersection-decision rules and the
        conservative-bias invariant (not derivable from the code alone).

---

## Verification Ledger

| Gate               | Command / Check                                                                       | Scope     | Result  | Evidence | Notes                          |
| ------------------ | ------------------------------------------------------------------------------------- | --------- | ------- | -------- | ------------------------------ |
| FR-1               | `pnpm --filter provegate test test/glob.test.ts`                                     | provegate | passed  | 3 files, intersect matrix green | sound walk, symmetric |
| FR-2               | `pnpm --filter provegate test test/conflicts.test.ts`                                | provegate | passed  | greenfield sibling refusal + disjoint control green | |
| FR-3               | `pnpm --filter provegate test test/glob.test.ts test/conflicts.test.ts`              | provegate | passed  | 29 passed (2 files)             | grouped rerun         |
| FR-4               | `grep -c "documented false-negative" packages/provegate/src/core/locks/conflicts.ts` | provegate | passed  | 0 (grep exit 1 = comment gone)  | + cli.mdx echo added  |
| types              | `pnpm check-types`                                                                    | root      | passed  | 3 total, 0 errors               |                       |
| lint               | `pnpm lint`                                                                           | root      | passed  | 0 warnings                      |                       |
| test               | `pnpm --filter provegate test`                                                        | provegate | passed  | 35 files, 447 tests             | priors unchanged      |
| build              | `pnpm build`                                                                          | root      | passed  | 3 tasks (incl. docs)            | clean                 |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-009`                                   | repo      | passed  | exit 0                          |                       |
| never-push         | `node packages/provegate/dist/cli.js push; test $? -eq 1`                             | repo      | passed  | "No. Push is yours." exit 1     |                       |
| hygiene            | `grep -ri -l -e emofy -e rayvaz packages/provegate/src && exit 1 \|\| true`           | provegate | passed  | clean                           | no personal names     |
| independent-review | `_docs/reviews/review-009-conflict-structural-hardening.md`                           | repo      | passed  | Sonnet 5, verdict pass, Critical 0, High 0, Medium 1 (fixed) | cross-model, fuzzed ~115k pairs |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

- 2.2 — structuralOverlap gained a `shared` param; append-only manifests
  (`config.sharedAppendOnly`) are dropped from both glob sides before intersecting.
  Rationale: sound intersection made `** ~ package.json` a real hit, but
  package.json is union-merged and `materialize()` already subtracts it on the
  tracked-file path — the structural path needed the same exemption or it would
  false-conflict a broad `**` against a manifest-only surface.
- 0.2 — no separate "failing baseline commit": the pre-existing
  `conflicts.test.ts` assertion already pinned the false-negative; it was rewritten
  in place to assert the fix, and the two sibling pairs were confirmed uncaught by
  the old prefix check before the rewrite.
- 2.1 — the walk is EXACT over the grammar (no false positives either), stronger
  than the PRD's "no false negatives, rare false positives OK" requirement; the
  conservative `true` fallback fires only on an unrecognized token, which
  `globToRegExp` never emits.
- 6.1 — Phase-6 Medium (unbounded recursion depth) fixed in-session rather than
  deferred: `walk` is now iterative over an explicit heap stack (no call-stack to
  overflow) with a 1M-state budget returning conservative may-intersect for
  pathological glob sizes. In scope (glob.ts); the alternative (length cap in
  `validateOwnedPaths`) would have reached outside the conflict surface.

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
