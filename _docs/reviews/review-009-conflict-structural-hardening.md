# Independent Review: PRD-009 — Conflict Structural Hardening

> **PRD:** PRD-009
> **Verdict:** pass
> **Reviewer:** Sonnet 5 (independent Phase 6 session)
> **Base SHA:** `649f2a63c72cb459ab62e3ad79ef9b719886bc2f`
> **Critical:** 0
> **High:** 0
> **Medium:** 1
> **Quorum:** 1/1 pass (single independent reviewer)

## Summary

Reviewed `git diff 649f2a6..4d2374e` (feature tip `4d2374e52ea99ebe7add151a56877aaae585aafb`):
`globsMayIntersect` (new, `glob.ts`), the `structuralOverlap` rewrite plus the
`sharedAppendOnly` exclusion (`conflicts.ts`), and the two updated test files. The
adversarial goal was to find a concrete path that matches both of two globs where
`globsMayIntersect` returns `false` (a false negative — the silent-double-claim bug
this PRD exists to kill). None was found. I did not rely on reasoning alone: I ran the
real `globToRegExp`/`globsMayIntersect` from `src/core/locks/glob.ts` (via
`node --experimental-strip-types`, no build/dist workaround needed) against ~115,000
randomized adversarial glob pairs (dense `**`/`*`/`?` token mixes, up to 10 tokens per
pattern, multi-char alphabet including `.` and `/`) with an independent brute-force
ground truth (exhaustive concrete-path search up to length 7-8, checked against the
real compiled regexes) — zero false negatives. I also hand-built and ran a matrix
targeting every boundary case called out in the review brief (`**` swallowing a
trailing `/`, `**` in the middle vs. at the boundary, `*` crossing `/` illegally, `?`
vs. differing lengths, sibling-directory disjointness, diamond-shaped DP states). All
matched ground truth.

The memoization (`seen`-set, mark-then-recurse, return `false` on re-entry) looked
suspicious at first — it caches "visited," not the computed value, which is a classic
incorrect-memoization shape. I worked through why it is actually sound for this
specific case: `i+j` strictly increases on every transition (no cycles, confirmed by
inspection of `nullable`/`consumesOne`), the recursion is a monotone reachability
search with immediate short-circuit-on-`true`, and the base case (`i===a.length &&
j===b.length`) returns `true` unconditionally *before* the memo check, so it is never
suppressed. Given that, any state with a true reachable-to-sink answer propagates
`true` up its discovery call chain to the root the first time it is visited, regardless
of what a later, memo-blocked revisit of the same state would have returned — so the
"wrong" answer a stale revisit produces can never change the root's verdict. This
matches the ~115k-pair empirical result finding zero counterexamples.

The `shared` (append-only) exclusion in `structuralOverlap` uses exact-string match
against `config.sharedAppendOnly`, mirroring `materialize`'s pre-existing exact-match
`shared.has(file)` semantics (`conflicts.ts:51`) for tracked files. A glob that merely
*matches* a shared file without being an exact match (e.g. `package.*`) is **not**
excluded and is still compared normally — correctly, since such a glob can also match
non-shared files (e.g. `package-lock.json`) and a conservative flag is not a smuggled
false conflict. No real-conflict case was found to be hidden by this exclusion.

Regression check: no test assertion was weakened (diffed old vs. new
`conflicts.test.ts` line by line — every previously-passing assertion, including the
disjoint-sibling case, survives verbatim in the renamed/split tests). `findConflicts`'s
materialized-overlap-precedence-over-structural logic is byte-for-byte unchanged except
for threading the new `shared` set into the `structuralOverlap` call. Full suite (447
tests), `check-types`, `lint`, and `build` are all green. FR-4's grep gate
(`documented false-negative` must be absent) passes (exit 1, 0 matches).

One real defect: `globsMayIntersect` recurses one stack frame per matched token pair
with no depth cap, and neither `validateOwnedPaths` nor the PRD conflict-surface parser
enforce any length bound on an individual glob string. A sufficiently long glob pair
overflows the JS call stack. See Finding 1.

## Findings

| #   | Sev    | Finding | Resolution |
| --- | ------ | ------- | ---------- |
| 1   | MEDIUM | `globsMayIntersect` has no recursion-depth bound and nothing upstream caps glob string length, so a long enough glob pair throws an uncaught `RangeError: Maximum call stack size exceeded` instead of returning a verdict. Repro: `globsMayIntersect('a'.repeat(6300), 'a'.repeat(6300))` throws; binary search puts the crash threshold at 6,210–6,250 characters *per side* (~12,400–12,500 combined) for two identical long-literal patterns, which force a purely sequential literal-match recursion (no wildcard token lets the DP collapse). Shorter patterns (5,000/side) and patterns that mismatch early (e.g. one long literal vs. a short, non-matching rival) return normally without deep recursion, so the trigger specifically needs two patterns that stay mutually satisfiable for thousands of consecutive tokens — most plausible via a large accidental paste into a PRD's `## Conflict Surface` bullet list (`declaredGlobs` has no length cap) or a malformed `ownedPaths` entry in a lock file (`validateOwnedPaths`, `lease.ts:126`, only checks non-empty, not max length). This is a crash, not a silent miss — it fails loud — but it would abort `findConflicts`/`structuralOverlap`/`candidateConflicts` for **every** PRD pair being compared that cycle, not just the one with the oversized glob, since `findConflicts` iterates the full active-lock cross-product. The PRD's FR-1 assumes boundedness ("patterns are config-scale... not user-input-scale") but nothing in this diff enforces that assumption. | **fixed** — `walk` rewritten as an iterative reachability walk over an explicit heap stack (no call-stack depth to overflow), plus a 1M-state budget that returns the conservative may-intersect verdict for pathological sizes; regression test added (`glob.test.ts`, 50k-char pair no longer throws). See Post-fix verification. |

No CRITICAL or HIGH findings. The core soundness claim (no false negatives over the
supported grammar) held under everything I could throw at it, including targeted
attacks on every boundary the review brief called out.

## Post-fix verification

**Finding 1 (Medium) fixed in the implementing session after this review** rather than
deferred: `globsMayIntersect`'s recursive `walk` was replaced with an iterative
reachability walk over an explicit heap stack (state `(i,j)` encoded as `i*stride+j`,
`visited` set for dedup, `i+j` strictly increasing → DAG), so no glob length can
overflow the call stack; a 1,000,000-state budget returns the conservative
may-intersect verdict for pathological sizes. Added a regression test asserting a
50,000-char pair returns instead of throwing. Verdict and soundness conclusion are
unchanged (Critical: 0). Post-fix gates:

- `pnpm --filter provegate test` — 35 files / 448 tests passed (was 447; +1 regression test)
- `pnpm check-types`, `pnpm lint`, `pnpm build` (incl. docs) — clean
- `test/glob.test.ts` + `test/conflicts.test.ts` — 30 passed

Commands actually run during the original review:

- `pnpm --filter provegate build` — clean (used briefly to confirm the package's public
  index does *not* re-export `globsMayIntersect`; per PRD FR-1/API-Changes this is
  intentional — "test-visible... default no" — so review scripts imported directly from
  `src/core/locks/glob.ts` via `node --experimental-strip-types` instead)
- `pnpm --filter provegate test` — 35 files / 447 tests passed
- `pnpm --filter provegate lint` — clean
- `pnpm check-types` — clean (all 3 packages)
- `grep -c "documented false-negative" packages/provegate/src/core/locks/conflicts.ts` — 0 matches (exit 1), per FR-4
- Custom empirical soundness fuzzers (temporary, deleted before finishing): brute-force
  ground truth vs. `globsMayIntersect` over ~115,000 unique random glob pairs plus a
  ~45-pair hand-built adversarial matrix covering every boundary case in the review
  brief — 0 false negatives
- Stack-depth probe (temporary, deleted before finishing): binary search confirming the
  `RangeError` threshold reported in Finding 1

`git status` at the end of this review shows only this review artifact as new/changed
(all temporary scripts lived under the session scratchpad outside the repo, and were
deleted regardless).
