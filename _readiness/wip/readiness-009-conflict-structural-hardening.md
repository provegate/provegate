# Readiness Assessment: PRD-009 — Conflict Detection Hardening

## Quick Meta

| Field                  | Value                                                  |
| ---------------------- | ------------------------------------------------------ |
| PRD                    | `_prds/wip/prd-009-conflict-structural-hardening.md`   |
| Score                  | 8.6/10                                                 |
| Verdict                | PASS                                                   |
| Iteration              | 1                                                      |
| Model Tier (Execution) | high                                                   |
| Model Tier (Audit)     | high                                                   |
| Scored by              | Claude (Fable 5) — same session as PRD author          |
| Self-scored            | yes (watch items are binding Phase 3 tasks)            |
| Date                   | 2026-07-23                                             |
| PRD Lint               | passed — `gate check PRD-009` exit 0                   |
| State Record           | updated                                                |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale                                                                          |
| ------------------- | ---- | ----------------------------------------------------------------------------------- |
| Phase 4 (Execution) | high | Soundness proof obligations; a subtle walk bug reintroduces the silent double-claim. |
| Phase 6 (Audit)     | high | Reviewer attacks the matrix for missing pair shapes and `**` boundary semantics.     |

---

## Analysis

### 1. Technical Depth & Architecture

- The intersection-of-regular-languages framing is correct for this grammar
  (`**`, `*`, `?`, literals), and the segment-wise memoized walk is the standard
  bounded construction — no library, ~60 lines, consistent with the zero-dep
  constraint.
- Scope discipline is the strength: only the structural predicate changes;
  materialized overlap, call sites, refusal formats, and the trigger condition
  (a side materializes to zero) are all frozen.
- Conservative bias (uncertain → may-intersect) is stated as a design choice with
  its cost asymmetry argued: refused claim = recoverable; missed collision =
  silent corruption. That is the right default for this product.

### 2. Edge Cases & Failure Modes

- **`**` byte-semantics parity (W1)**: `globToRegExp` collapses `**/` specially;
  the walk must mirror those exact semantics or the structural and materialized
  checks disagree — the matrix must include pairs that only diverge under the
  collapse rule.
- **Sibling shapes**: the two documented misses (literal-vs-star,
  star-crossing-segments) are in the matrix by name; `?` pairs included.
- **Disjoint controls (W3)**: hardening that eats parallelism is a regression —
  disjoint pairs are asserted claimable, weighted equally with the misses.
- **Blowup (W4)**: `**`-vs-`**` walks branch; memoization on index pairs bounds
  it quadratically. A pathological-pattern test pins the bound.

### 3. Maintainability & DX

- Deleting the "documented false-negative" comment is an FR with a grep check —
  the doc cannot drift from the guarantee.
- The decision rules live in the module header next to the code that implements
  them.

### 4. Migration & Rollback

- N/A — class waived (behavior-tightening only; a revert restores the documented
  false-negative, nothing else).

---

## Scorecard (test-hardening weights)

| Dimension                | Weight | Score | Notes                                                |
| ------------------------ | ------ | ----- | ---------------------------------------------------- |
| Clarity                  | 25%    | 8.5   | Grammar frozen; verdict matrix is the spec           |
| Completeness             | 30%    | 8.5   | Both documented misses + controls + boundary pairs   |
| Technical Depth          | 33%    | 8.5   | Correct decidability framing; parity risk named      |
| Multi-Tenancy & Security | N/A    | N/A   | N/A — class waived                                   |
| Scope & Testability      | 12%    | 9.0   | Single predicate swap; grep-checked doc truth        |
| Migration & Rollback     | N/A    | N/A   | N/A — class waived                                   |

**Weighted: 8.6 — PASS.** Hard caps: security N/A (no protected surface), contract
N/A (no payload), lint passed.

---

## Watch Items (binding on Phase 3)

- **W1 — collapse parity**: walk semantics for `**`/`**/` mirror `globToRegExp`
  byte-for-byte; matrix includes pairs that diverge only under the collapse rule.
- **W2 — bias direction test**: at least one pair the walk cannot decide cheaply
  is asserted may-intersect (the conservative default is executable, not prose).
- **W3 — parallelism controls**: disjoint pairs (`src/a/**` vs `src/b/**`,
  `*.md` vs `*.ts`) asserted claimable end-to-end, not just at predicate level.
- **W4 — bounded walk**: memoization asserted (pathological `**` pair completes;
  test uses a size that would hang an exponential walk).

---

## Verdict

**PASS** — proceed to Phase 3 task generation on the owner's Go. No surface
overlap with PRD-007/008 — claimable in parallel with either.
