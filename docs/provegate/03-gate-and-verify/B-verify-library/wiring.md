# Gate wiring — how checks register into phases + CI

A check only guards what runs it (seed `verify-check-phase-placement`). The wiring model has
four surfaces plus a meta-gate that enforces no check is orphaned.

## The four surfaces

1. **Local bundle registry** — one script (`verify:workflow`) holds the canonical list of
   checks and runs them all, applying the known-red ledger (P4). This is the primary
   registry; a developer runs it locally before shipping. Nuance: registration here (for
   wire-or-delete purposes) is distinct from execution — a check that needs per-item
   context may be registered as a syntax-check stub in the bundle and *really* execute in
   the orchestration runner's phases.
2. **Orchestration runner** — the per-phase gate map (Emofy `prd:autorun`): Phase 4 base
   (type-check + lint + build + affected-tests + class gates), Phase 5 = the §11 FR commands,
   Phase 6 = review ledger + `verify:workflow`, Phase 7 = `durable-artifacts`, → merge =
   operator-gate. Each phase STOPs and hands back on failure, worktree intact.
3. **Pre-ship** — `ship:pre`: base-branch guard + state-sync + `verify:workflow`. The last
   thing before a human pushes.
4. **CI** — per-gate steps + a heartbeat workflow running `verify:workflow`, `verify:gates-wired`,
   and `status-sync --ci`. CI is the backstop that doesn't depend on anyone running the local
   bundle. Add a **ci-freshness meta-monitor** on top (see CATALOG): a cron that fails loud
   when the default branch has no recent green CI run — the only check that catches CI
   itself silently dying.

## Hooks (commit-time, not push-time)

- **pre-commit:** secret scanner → base-branch guard → lint-staged. (see `02` practices 04, 02)
- **commit-msg:** commitlint. (see `02` practice 03)
- **No pre-push hook** — push is human-only; gates run in CI and the orchestration runner, not
  on push. (see `02` practice 02)

## Class-default gates (scale the gate set to the work's shape)

Not every work-item needs every gate. A **work-item class**, declared in the spec header
(e.g. `feature | test-hardening | hotfix | infra`), drives three things mechanically:

1. **Default gate set** — the orchestration runner's Phase-4 base gates are extended per
   class (an `infra` change runs the wiring/meta gates; a `feature` runs the domain suites),
   and the affected-test selection can be class-aware. Keep the class → gate map as one
   table in project config; drop-in gate picks are project-specific, the mechanism is not.
2. **Readiness weighting** — the readiness rubric redistributes dimension weights per class
   (a `test-hardening` item isn't scored on migration depth).
3. **Review-skip allowance** — only review-optional classes (e.g. pure `test-hardening`)
   may skip the independent review, and only with a recorded ledger justification
   (practice 01).

## The meta-gate (wire-or-delete)

`verify:gates-wired` (P3) closes the loop: every check must appear in at least one surface
above, and every check script on disk must be a registered gate. This is what stops the
library from rotting into dead scripts and phantom references. **Port this early** — it's
cheap and it keeps every later check honest.

## Phase-placement rule

When adding a check, register it in the **earliest phase that can violate its invariant**,
not just the omnibus final bundle (seed `verify-check-phase-placement`). Readiness checks →
Phase 2; implementation invariants → Phase 4; artifact/review checks → Phase 6/7; coordination
checks → item-start + the local bundle + CI.

## Provegate minimal viable wiring

A single-agent OSS project can start with far less than Emofy's four surfaces:
1. `verify:workflow` local bundle (a short check list to begin).
2. `ship:pre` calling it before push.
3. CI running the bundle + `verify:gates-wired`.
4. pre-commit (secrets + base-guard) and commit-msg (commitlint) hooks.

Add the orchestration runner + coordination checks (`status-sync`, `path-conflicts`,
`agent-locks`, `branch-isolation`) only when/if provegate goes multi-agent (wave 4).
