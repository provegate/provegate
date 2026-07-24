# Readiness Assessment: PRD-015 — Single-Package (Non-Monorepo) Support

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-015-single-package-support.md`  |
| Score                  | 8.2/10                                         |
| Verdict                | PASS                                           |
| Iteration              | 1                                              |
| Model Tier (Execution) | medium                                         |
| Model Tier (Audit)     | low                                            |
| Scored by              | Claude (Opus 4.8) — same session as PRD author |
| Self-scored            | yes (watch items are binding Phase 3 tasks)    |
| Date                   | 2026-07-24                                     |
| PRD Lint               | passed — `gate check PRD-015` exit 0           |
| State Record           | updated                                        |

---

## Model Tier Recommendation

| Phase               | Tier   | Rationale                                                                     |
| ------------------- | ------ | ----------------------------------------------------------------------------- |
| Phase 4 (Execution) | medium | Capability mostly exists; work is a lifecycle fixture + a docs recipe, not subtle new logic. |
| Phase 6 (Audit)     | low    | Small surface; reviewer checks additive-only, zero-dep, the fixture is a REAL repo not a mock. |

---

## Analysis

### 1. Technical Depth & Architecture

- The verify-first framing is the right call: a monorepo-assumption audit already
  shows the capability is largely present (`gate init` scaffolds the workflow tree
  only; `commands` is string-config; wiring understands `--filter` and plain
  scripts; "workspace" = repo root). So the load-bearing deliverable is the FR-1
  fixture that PROVES the whole lifecycle in a plain single-package repo, and FR-5
  fixes only what that fixture breaks on — scoped by evidence, not speculation.
- Low architectural risk; the main risk is a fixture that under-tests (mocks
  instead of driving a real temp git repo) and thus "passes" without proving
  anything.

### 2. Edge Cases & Failure Modes

- **W1 — fixture must be REAL:** drive an actual temp git repo through
  `init → new → open → check → run` (as the worktree/lease tests do), not a mock.
  A green mock proves nothing.
- **W2 — FR-5 is evidence-scoped:** fix a monorepo assumption ONLY if FR-1
  surfaces one; do not pre-emptively refactor. If none, record the no-op.
- **W3 — the recipe must be RUN, not just written:** the fixture should exercise
  a non-pnpm `commands` mapping so tool-agnosticism is proven, not asserted.
- **W4 — additive only:** monorepo support and the default pnpm `commands` are
  untouched; no repo-shape auto-detect (owner Q2).

### 3. Maintainability & DX

- A single-package fixture becomes a permanent regression guard against a future
  monorepo assumption creeping in. `QUICKSTART.md` gains the durable recipe —
  non-derivable adoption knowledge.

### 4. Migration & Rollback

- Purely additive (a test, a docs recipe, at most a config-over-hardcode fix).
  Reversible via git revert; no data, no schema, no runtime dependency.

---

## Scorecard (feature weights)

| Dimension                | Weight | Score | Notes                                                     |
| ------------------------ | ------ | ----- | --------------------------------------------------------- |
| Clarity                  | 15%    | 8.5   | 5 FRs, verify-first, all owner decisions resolved          |
| Completeness             | 20%    | 8.0   | Grounded by the audit; FR-5 evidence-scoped                |
| Technical Depth          | 25%    | 7.5   | Modest — mostly proving an existing capability + docs      |
| Multi-Tenancy & Security | 20%    | 8.5   | No auth/tenancy; zero-dep, no network; init path-contained |
| Scope & Testability      | 10%    | 9.0   | Very testable — a fixture drives the lifecycle; small surface |
| Migration & Rollback     | 10%    | 9.0   | Additive; revert-clean                                     |

**Weighted: 8.2 — PASS.** Hard caps: security N/A (no auth/tenancy/route), contract
N/A (no client→server payload), lint passed (`gate check PRD-015` exit 0).

---

## Watch Items (binding on Phase 3)

- **W1 — real fixture:** the single-package proof drives a temp git repo through
  the full lifecycle, not a mock.
- **W2 — FR-5 evidence-scoped:** fix only a monorepo assumption the fixture
  surfaces; record a no-op otherwise.
- **W3 — run the recipe:** exercise a non-pnpm `commands` mapping in the fixture.
- **W4 — additive only:** monorepo support + default pnpm config untouched; no
  auto-detect; `packages/provegate` stays zero-dependency, no network.

---

## Verdict

**PASS** — proceed to Phase 3. Smallest-risk PRD of the current wave: the
capability is largely present, so the value is proof + adoption path, and every
check is machine-settleable (autonomous-close eligible).
