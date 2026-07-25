# Readiness Assessment: PRD-018 — Closed-Loop Memory Contract and Enforcement

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-018-memory-contract-enforcement.md` |
| Score                  | 8.33/10 |
| Verdict                | PASS |
| Iteration              | 6 |
| Model Tier (Execution) | high |
| Model Tier (Audit)     | high |
| Scored by              | independent agent (gpt-5.6, different model family from the PRD author), via owner |
| Self-scored            | no |
| Date                   | 2026-07-25 |
| PRD Lint               | passed — `node packages/provegate/dist/cli.js check PRD-018` exit 0 |
| State Record           | pending — read-only re-score did not update state |
| Dependency             | PRD-017 must be Ship Verified before Phase 4 |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | high | The barrier is concurrency-sensitive and activation-wide; implementation must preserve the stated single-bypass limit while using the existing mutex correctly. |
| Phase 6 (Audit)     | high | Audit must inject a foreign lease, stale mutex marker, direct merge, and existing-worktree continuation; it must also confirm PRD-022 becomes a real scoped follow-on. |

---

## Analysis

### 1. Technical Depth & Architecture

The two load-bearing existing mechanisms match the PRD:

- `defaultManifest()` supplies Phase 4 in the stated order:
  `checkTypes`, `lint`, `build`, `test`. Therefore a root manifest can safely repeat
  those four commands and append `verify:workflow` then `check-egress`; `build` precedes
  its built-output consumer.
- `open.ts` snapshots `workflow.config.json` and `gates.manifest.json` for worktree
  claims whenever either exists locally or on the base. Reuse compares these snapshots
  to both the base and checkout, and refuses on a mismatch. The proposed introduction
  transition belongs here: it changes the provenance contract that `gate open --worktree`
  already enforces.
- The immutable-base comparison for output weakening remains the correct model: a working
  PRD cannot rewrite the evidence against which it is compared.

FR-6 correctly removes the unsound grandfather boundary rather than trying to repair it.
The live PRD-017 lease demonstrates the rule is practical: it is active but TTL-bounded,
so a compliant activation waits instead of carrying an exemption state. Using
`withWorkspaceMutex(claimMutexPath(...))` is coherent: `gate open` claims and `gate
release` already use that critical section, so the proposed land-time lock read cannot
race a new claim. W9 is resolved in specification.

The mutex intentionally fails closed on a stale marker: after 30 seconds with a dead PID,
it requires explicit manual removal rather than breaking the lock automatically. Recording
this as operator handoff is the correct trade: automatic breaking would reintroduce the
race the mutex prevents. W11 is resolved as an accepted operational constraint.

### 2. Edge Cases & Failure Modes

Measured rather than accepted:

- **W1 remains resolved.** `pnpm verify:turbo-inputs` exits 0 and checks six cached
  tasks, so the cache-key guard reported in iteration 1 is still active.
- **W2 is resolved.** FR-5 now gives the absent-base-blob refusal and actionable remedy,
  and names a `chain.test.ts` fixture for the non-worktree path. The current worktree
  implementation independently confirms why that path needs specification: it fails
  closed when required artifacts are absent or uncommitted on base.
- **W3 is resolved.** The prompt directory contains exactly the seven phase prompts plus
  `knowledge-ingest.md`, `knowledge-lint.md`, and `orchestration-runner.md` named in the
  FR-3 table. The table assigns exactly one distinct obligation to every one. Those
  obligations are not in the live prompt files yet—that is expected Phase 4 work, not a
  false current-state claim.
- **W4 is resolved by removal.** There is no grandfather policy or permanent exemption
  list to maintain; activation waits for the active-lease set to clear.
- The current root has neither `workflow.config.json` nor `gates.manifest.json`, so this
  PRD is correctly specifying an introduction rather than pretending the files exist.
  FR-6 now names `test/open.test.ts` and a runnable command. That file exists and already
  contains a real-git-worktree lease test, making it a plausible fixture home. `merge.ts`
  and `merge.test.ts` now target the activation refusal, but that occurs at `gate land`,
  not the separately stated Phase 4 preflight immediately before committing root files.
  W5 remains partly open.

### 3. Maintainability & DX

- The grammar is deliberately centralized across the template, lint, runner, and review.
  The per-file FR-3 table makes the intended content testable instead of relying on a
  directory-level assertion.
- The root-control introduction is cohesive with this PRD, not PRD-021: the opening
  snapshot behavior treats the files as a pair, while a later single-key edit is narrower.
- W6–W11 are resolved in this PRD: the impossible boundary is removed, the land barrier
  shares the claim mutex, the direct-merge limit is explicit, and stale-mutex recovery is
  a named operator responsibility.
- `open.ts` alone revalidates control-artifact snapshots. `chain.ts` builds/runs phases
  without that check, while `merge.ts` checks branch/base cleanliness only. FR-6 now states
  this fact rather than claiming convergence, and correctly bounds the residual to a
  bypassed activation with no recorded exemption state.
- PRD-022 is cited as the follow-on for lifecycle revalidation, but it is currently an
  unfilled template: it has placeholder FRs, targets, and scope. The residual is named,
  but not yet actionable ownership. See W13.
- The existing `content-prompts.test.ts` census currently proves file existence only; the
  proposed per-file assertions are clearly within FR-3's stated target and scope.

### 4. Migration & Rollback

- Rollback remains a flag plus root Phase 7 wiring removal; no remote state or data rewrite
  is needed. Fresh installs get a Phase-7-only manifest, while existing adopter artifacts
  remain byte-unchanged.
- Root activation last and the PRD-017 Ship Verified precondition are appropriate
  deployment ordering. The current PRD-017 lease is exactly the situation governed: it
  makes a compliant `gate land PRD-018` wait until release, TTL expiry, or stale-mutex
  manual recovery.
- “No exemption state” is true in data modeling and the revised FR no longer claims
  convergence. A bypass can still let a pre-existing worktree complete once without the
  new contract; that is a stated residual, not a permanent recorded exemption.

---

## Scorecard

Class `infra` weights, per `prompts/phase-2-readiness-scorer.md`.

| #         | Dimension                | Weight | Score       | Notes |
| --------- | ------------------------ | ------ | ----------- | ----- |
| 1         | Clarity                  | 15%    | 8.5/10      | The mutex, scoped land-only guarantee, Gherkin, DO NOT rules, and operator recovery are concrete. Docked because the cited follow-on is still an empty template. |
| 2         | Completeness             | 20%    | 8.0/10      | The direct-merge and existing-worktree residual is accurately stated and bounded, but PRD-022 does not yet provide actionable ownership. |
| 3         | Technical Depth          | 20%    | 8.5/10      | The mutex is the correct critical section; accurate scope replaces the false convergence mechanism. |
| 4         | Multi-Tenancy & Security | 10%    | 8.5/10      | No tenant route/query surface. Command safety, human-only push, and owner acceptance remain in the design; no security hard cap applies. |
| 5         | Scope & Testability      | 15%    | 8.0/10      | Tests name the introduction and land barrier. W5's preflight timing and W13's empty follow-on remain Phase 3 binding tasks. |
| 6         | Migration & Rollback     | 20%    | 8.5/10      | The PRD-017 wait and operator stale-mutex recovery are workable; the one-bypass residual is explicitly accepted and has a named follow-on. |
| **Total** | **Weighted**             |        | **8.33/10** | **PASS** |

Weighted sum:
`0.15×8.5 + 0.20×8.0 + 0.20×8.5 + 0.10×8.5 + 0.15×8.0 + 0.20×8.5`
`= 1.275 + 1.60 + 1.70 + 0.85 + 1.20 + 1.70 = 8.325 → 8.33`.

Hard caps — none triggered:

- **Security cap:** not triggered. No protected route, endpoint, or query path.
- **Contract cap:** not triggered. No client→server payload or external schema.
- **Lint cap:** not triggered — `node packages/provegate/dist/cli.js check PRD-018` exits 0.
- **ProveGate method caps:** no runtime dependency, no push path, and every method byte
  traces to the PRD-017 addendum.

---

## Missing Pieces (watch items)

1. **W1 — the sixth floor gate must not scan stale bytes. — RESOLVED 2026-07-25, outside
   this PRD.** `web#build` hashed exactly one file (`package.json`), leaving
   `apps/web/app/**` outside the turbo cache key, so `check-egress` would have scanned a
   replayed `.next`. Landed as its own fix rather than inside this PRD: `build` and
   `generate-tokens` no longer declare `inputs` (a second incomplete enumeration was found
   in the same pass — `generate-tokens` omitted `scripts/emit.ts`, which the generator
   imports), and `verify:turbo-inputs` now refuses any narrowed cache key on a cached task,
   with a reasoned exceptions file. `web#build` now hashes 14 files including `app/**`.
   `pnpm verify:turbo-inputs` passed in this re-score; FR-6 may wire `check-egress`.
2. **W2 — name the non-worktree baseline path. — RESOLVED 2026-07-25.** FR-5 now states
   the exact missing-base refusal and tells the operator to commit the PRD to base or
   reclaim with `--worktree`; its `chain.test.ts` target covers the text.
3. **W3 — per-prompt obligations. — RESOLVED 2026-07-25.** FR-3's table names exactly
   one obligation for each of the seven phase, two knowledge, and orchestration prompts;
   the current directory census matches those ten files.
4. **W4 — activation blast radius. — RESOLVED 2026-07-25.** FR-6 states an activation-last,
   lease-`startedAt`/merge boundary, explicitly grandfathering leases already in flight and
   expiring that status with the leases.
5. **W5 — introduction/preflight wiring. — PARTIALLY RESOLVED 2026-07-25.** FR-6 now
   names `open.test.ts`, `merge.ts`, and `merge.test.ts`; the fixture homes are plausible.
   The PRD still says Phase 4 preflight re-checks locks immediately before committing root
   files, while the new target checks at `gate land`. Name and test the actual preflight,
   or replace that requirement with the land-time rule.
6. **W6 — causally deterministic grandfathering. — RESOLVED 2026-07-25.** The PRD
   deletes grandfathering rather than persisting activation metadata; no ancestry boundary
   remains to compute.
7. **W7 — persist the lease base SHA. — RESOLVED 2026-07-25.** The activation policy no
   longer depends on a lease base SHA.
8. **W8 — self-referential activation SHA. — RESOLVED 2026-07-25.** The activation SHA
   mechanism is removed; no merge commit must name itself.
9. **W9 — make the lease barrier atomic. — RESOLVED 2026-07-25.** FR-6 now requires
   `gate land` to read locks inside the same workspace mutex used by claim/release, so a
   new claim cannot appear between its check and merge.
10. **W10 — direct-merge scope. — RESOLVED 2026-07-25.** FR-6 now accurately scopes the
    barrier to `gate land`, admits direct merge bypass, and makes no prevention or
    convergence claim.
11. **W11 — stale-mutex activation recovery. — RESOLVED 2026-07-25.** FR-6 names the
    fail-closed manual owner recovery as operator handoff; this is the correct mutex trade.
12. **W12 — continued-worktree revalidation. — DEFERRED TO PRD-022 2026-07-25.** FR-6
    precisely states that `gate run`/`gate land` do not revalidate artifacts and accepts
    one bypassed activation without recording an exemption. PRD-022 owns the prevention.
13. **W13 — make PRD-022 actionable before Phase 3.** The cited
    `_prds/wip/prd-022-control-artifact-revalidation.md` is still a template stub with
    placeholder FRs, targets, scope, and verification commands. Draft and approve its
    concrete revalidation contract before treating W12 as owned follow-on work.

---

## Iteration History

| # | Date       | Score | Verdict | Key Changes |
| - | ---------- | ----- | ------- | ----------- |
| 1 | 2026-07-25 | 8.15  | PASS    | First independent scoring of the split contract/enforcement scope. Measured three PRD claims against the live repo: manifest deep-merge behavior confirmed, egress scanner confirmed fail-closed but cache-stale, base-ref baseline guaranteed only for worktree flows |
| 2 | 2026-07-25 | 8.43 | PASS | Independent re-score: W1 cache guard re-confirmed; W2 refusal/remedy, W3 per-file table, and W4 in-flight policy resolved. Added W5 executable introduction-transition proof and W6 causal grandfather-boundary specification |
| 3 | 2026-07-25 | 8.05 | PASS | W5 now names a plausible `open.test.ts` fixture but misses preflight wiring. W6 ancestry intent has no persisted lease base and proposes a circular merge-SHA record; added W7–W8 |
| 4 | 2026-07-25 | 7.93 | ITERATE | W6–W8 resolved by deleting grandfathering; W5 remains timing-misaligned. Measured `merge.ts` as lock-free and direct merge as hook-exempt; added W9 atomicity and W10 bypass controls |
| 5 | 2026-07-25 | 7.65 | ITERATE | W9 resolved by reusing the claim mutex; W10 scope is honest but convergence fails for continued existing worktrees. Added W11 stale-mutex recovery and W12 lifecycle revalidation |
| 6 | 2026-07-25 | 8.33 | PASS | W10–W11 resolved by accurate scope and operator handoff; W12 deferred to PRD-022. The cited follow-on is a template stub, so W13 binds Phase 3 to make ownership actionable |

---

## Project-Specific Checklist

- [x] Zero runtime dependencies; no telemetry, network, or push path.
- [x] Method content traces to the PRD-017 owner-approved addendum.
- [x] Existing adopter config, manifests, and entrypoints remain never-overwrite.
- [x] Human-only push and owner-only acceptance unchanged.
- [x] Memory-disabled repositories retain current behavior.
- [x] Output grammar is mutually exclusive and enforced by test, not prose.
- [x] W1 cache-key guard passed during this re-score.
- [x] W2 refusal/remedy, W3 per-prompt obligations, and W4 in-flight policy measured as resolved.
- [ ] W5 aligns the stated Phase 4 preflight with its implementation/test target.
- [x] W6–W8 resolved by removing grandfathering and its impossible metadata requirements.
- [x] W9 uses the claim mutex for the activation barrier.
- [x] W10 accurately scopes direct-merge bypass without claiming convergence.
- [x] W11 records stale-mutex manual recovery as operator handoff.
- [x] W12 is accurately deferred to PRD-022 without a false convergence claim.
- [ ] W13 turns PRD-022 from a template into an actionable follow-on.
- [ ] PRD-017 Ship Verified before Phase 4 entry.

---

## Verdict

**PASS — 8.33/10.** Scored independently by a different model family from the PRD author.
`node packages/provegate/dist/cli.js check PRD-018` exits 0, and no hard cap applies.

PRD-018 is internally honest and implementable: W6–W11 are resolved, and W12 is an
accurately bounded follow-on rather than a hidden claim. The remaining Phase 3 bindings
are W5's preflight/land timing decision and W13: PRD-022 must become a concrete approved
PRD before its revalidation work can count as owned. Phase 4 still waits on PRD-017 Ship
Verified.
