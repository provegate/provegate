# Orchestration Runner — Agent-Phase Driver (PRD-248)

> **Role:** Deterministic orchestrator for Phases 4–7 + local merge.
> **Pairs with:** `scripts/prd-autorun.mjs` (the gate + merge + handoff half).

---

## The substrate split (why two halves)

A pure Node script can run **gates** (`verify:*`, `git merge`, `check-types`) deterministically, but it cannot run the **stochastic agent phases** (writing code, writing adversarial tests, running a reviewer panel). Conflating the two was readiness finding WI-1. So the orchestration is two cooperating halves:

| Half                                | What it does                                                                        | Where                        |
| ----------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------- |
| **Agent driver** (this doc)         | Runs the stochastic phases: implement, test-author, reviewer panel                  | Workflow tool / parent agent |
| **Gate runner** (`prd-autorun.mjs`) | Verifies machine-checkable artifacts, merges to local `development`, prints handoff | Pure Node                    |

The driver does the work; the runner refuses to advance unless the work's artifacts pass. Neither half pushes — push is always the human's call.

---

## Loop (per PRD, after Phase 3 "Go")

```
Phase 4  Implementation → agent writes code; runner gate: check-types + lint + build + verify:affected-tests + class-default gates
Phase 5  Testing        → agent authors deny/contract tests; runner gate: every §11 cmd exits 0
Phase 6  Final Auditing → reviewer PANEL (below); agent saves structured review artifact + ledger row; runner gate: schema + verify:workflow
Phase 7  Learning       → agent updates declared Durable Artifacts; runner gate: PRD-scoped `verify:durable-artifacts`
archive  → runner: wip→completed moves + summary stub + `state:sync` + wiki log (commit on feat branch)
merge    → runner: operator rows (or prd:accept waiver), merge feat→LOCAL development, post-merge check-types+build, prd:stop
handoff  → runner prints card + metrics path; HUMAN runs git push
```

Resume after a gate failure: `pnpm prd:autorun PRD-XXX --from-phase=N` (4–7) or `--from-phase=merge` when gates already passed and only archive/merge failed.

`pnpm prd:autorun -- --dry-run PRD-XXX` only prints the plan — it is **not** how gates run. The driver runs the actual phase work, then the runner's real (non-dry-run) pass executes the gates in order and STOPs at the first failure, handing back to the driver/human with the worktree intact.

---

## Reviewer panel (Phase 6)

Spawn independent reviewers of the full diff vs base, each with a distinct lens. Prefer a different model family (gstack `/codex`); fall back to fresh agent sessions.

| Lens         | Asks                                                                       |
| ------------ | -------------------------------------------------------------------------- |
| correctness  | Does the code do what the FRs say? Off-by-one, wrong branch, missing case? |
| security     | Auth/permission bypass, secret leak, injection?                            |
| cross-tenant | Can tenant A reach tenant B's data? Is every query org-scoped?             |
| contract     | Does every FE→BE payload round-trip against the real schema?               |
| perf         | N+1, unbounded result set, missing index, hot-path allocation?             |

**Quorum: ≥3 of 5 `pass` → gate pass.** Fewer than 5 reviewers responded (e.g. codex usage-limit) and quorum cannot be reached → gate `fail` (STOP) — never treat an absent reviewer as a pass. Save the panel verdict + findings to `_docs/reviews/review-XXX-*.md` using `_docs/reviews/_TEMPLATE.md` metadata (PRD≥249: `Verdict`, `Critical`, `Base SHA`, `Quorum` required; `pass` ⇒ `Critical: 0`). Record the `independent-review` ledger row; `prd-autorun.mjs` validates ledger + schema.

---

## Invariants

- **Learning before merge** — durable docs land in the same merge as the code.
- **Cleanup after verified merge** — a failed merge must never destroy the worktree.
- **Never push** — the runner stops at the handoff card; the human decides.
- **Operator rows** — autonomous merge refuses when operator-owned task rows exist unless `_state/acceptances.json` has a valid `pnpm prd:accept` entry.
