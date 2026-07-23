# Readiness Assessment: PRD-006 — Kill the Stubs (`gate new` + `gate open`)

## Quick Meta

| Field                  | Value                                         |
| ---------------------- | --------------------------------------------- |
| PRD                    | `_prds/wip/prd-006-new-open.md`               |
| Score                  | 8.5/10                                        |
| Verdict                | PASS                                          |
| Iteration              | 1                                             |
| Model Tier (Execution) | high                                          |
| Model Tier (Audit)     | high                                          |
| Scored by              | Claude (Fable 5) — same session as PRD author |
| Self-scored            | yes (watch items are binding Phase 3 tasks)   |
| Date                   | 2026-07-23                                    |
| PRD Lint               | passed — `gate check PRD-006` exit 0          |
| State Record           | updated                                       |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale                                                                                       |
| ------------------- | ---- | ------------------------------------------------------------------------------------------------ |
| Phase 4 (Execution) | high | Filesystem-writing commands with containment discipline; lock semantics are correctness-critical. |
| Phase 6 (Audit)     | high | Reviewer attacks id-allocation races, steal semantics, and template-substitution fidelity.        |

---

## Analysis

### 1. Technical Depth & Architecture

- Correctly thin: both commands compose existing engine modules (state build,
  idPattern, glob overlap, lease validation); new logic is id allocation + template
  substitution only. The PRD resists inventing a second lock model.
- Template resolved module-relative from dist with config override — installed
  package self-sufficient, forked templates supported.
- `wx`/containment discipline inherited from the PRD-004 review is named as the write
  standard — the reviewer's prior findings became doctrine.

### 2. Edge Cases & Failure Modes

- **ID allocation race (W1)**: two concurrent `gate new` calls compute the same next
  ID. Same slug → second `wx` write refuses (safe). Different slugs → two files with
  the same ID, both writes succeed. Mitigation bound as task: post-write re-scan; if
  the ID now appears twice, delete own file, retry with next ID (bounded retries),
  loud report. Single-operator repos never hit this; parallel-agent repos are exactly
  this product's pitch — it must not corrupt the ID space.
- **Uninitialized repo (W2)**: `gate new` before `gate init` — the wip dir may not
  exist. Decision bound as task: create the missing parent via the containment-checked
  mkdir (init discipline, additive-only), do NOT refuse — friction at the front door
  is adoption death; but print that the full tree comes from `gate init`.
- **Stale lease semantics (W3)**: existing lease validation treats expired leases as
  issues. `open` must distinguish: foreign valid → refuse; foreign stale → refuse but
  say `--steal` is available; self any-state → refresh idempotently. `--steal` prints
  the victim (PRD, owner, age) — never silent.
- **Template drift (W4)**: substitution must anchor on the template's actual metadata
  lines (`> **Status**:` etc.), and the test must assert against the SHIPPED template
  file, not a copy — template edits then break the test, which is the point.
- Empty Conflict Surface refusal closes the "claim nothing, block nothing, pretend
  safety" hole.

### 3. Maintainability & DX

- STUBS table deletion removes an entire code path class; usage text single-sourced.
- QUICKSTART shrinks (cp + hand-edit → one command) — the doc gets simpler as the
  tool gets more real, which is the right direction.

### 4. Migration & Rollback

- Purely additive commands; no state format changes; revert = git revert. Existing
  hand-written leases remain valid (schema untouched).

---

## Scorecard (feature weights)

| Dimension                | Weight | Score | Notes                                                |
| ------------------------ | ------ | ----- | ---------------------------------------------------- |
| Clarity                  | 15%    | 8.5   | FRs precise; steal/stale table nailed in W3           |
| Completeness             | 20%    | 8.5   | Race + uninit edges found in scoring, bound as tasks  |
| Technical Depth          | 25%    | 8.5   | Thin composition, correct reuse, containment named    |
| Multi-Tenancy & Security | 20%    | 8.0   | Local FS only; containment + wx discipline; no net    |
| Scope & Testability      | 10%    | 9.0   | Worktrees explicitly deferred; refusal paths enumerated |
| Migration & Rollback     | 10%    | 9.0   | Additive; schema frozen                               |

**Weighted: 8.5 — PASS.** Hard caps: security N/A (no protected route/endpoint —
refusal paths are enumerated as named tests in FR-4), contract N/A (no client→server
payload), lint passed.

---

## Watch Items (binding on Phase 3)

- **W1 — id race**: post-write re-scan + bounded retry; test simulates the collision.
- **W2 — uninit repo**: containment-checked mkdir of missing parents + `gate init`
  pointer; test covers bare-dir `gate new`.
- **W3 — stale/steal matrix**: four-state behavior table (self/foreign × valid/stale)
  implemented and tested exactly; `--steal` output names the victim.
- **W4 — substitution anchors**: test asserts against the shipped template file
  in-place; unknown-anchor = test failure, not silent skip.

---

## Verdict

**PASS** — proceed to Phase 3 task generation on the owner's Go. Recommend running
after PRD-005 lands (no surface overlap, but sequential keeps review clean).
