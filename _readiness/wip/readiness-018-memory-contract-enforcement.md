# Readiness Assessment: PRD-018 — Closed-Loop Memory Contract and Enforcement

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-018-memory-contract-enforcement.md` |
| Score                  | 8.43/10 |
| Verdict                | PASS |
| Iteration              | 2 |
| Model Tier (Execution) | high |
| Model Tier (Audit)     | high |
| Scored by              | independent agent (gpt-5.6, different model family from the PRD author), via owner |
| Self-scored            | no |
| Date                   | 2026-07-25 |
| PRD Lint               | passed — `node packages/provegate/dist/cli.js check PRD-018` exit 0 |
| State Record           | pending — run `gate status` after save |
| Dependency             | PRD-017 must be Ship Verified before Phase 4 |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | high | The implementation combines immutable git blobs, lease state, root-control-artifact activation, and repo-wide lint behavior. The two FR-6 watch items need deliberate runner and fixture design, not a mechanical content edit. |
| Phase 6 (Audit)     | high | Audit must prove a pre-introduction worktree refuses then succeeds after rebase, and attack the grandfather boundary with malformed, future, and causally ambiguous timestamps. |

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

FR-6's policy statement is more precise than iteration 1, but its lease `startedAt`
versus merge-commit boundary is time-based rather than causal. Git commit timestamps are
not a trustworthy ordering source, and the PRD does not name the canonical persisted
merge SHA/timestamp or the validation target that compares it. See W6.

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
- **W4 is resolved as policy.** FR-6 now explicitly grandfatheres a lease opened before
  this PRD's merge and forbids a permanent exemption list. Its implementation proof
  remains incomplete because the ordering evidence is underspecified (W6).
- The current root has neither `workflow.config.json` nor `gates.manifest.json`, so this
  PRD is correctly specifying an introduction rather than pretending the files exist.
  The worktree snapshot code supports refusal after that introduction, but FR-6 does not
  name the existing worktree fixture file or a command that executes the claimed
  pre-introduction/rebase sequence. See W5.

### 3. Maintainability & DX

- The grammar is deliberately centralized across the template, lint, runner, and review.
  The per-file FR-3 table makes the intended content testable instead of relying on a
  directory-level assertion.
- The root-control introduction is cohesive with this PRD, not PRD-021: the opening
  snapshot behavior treats the files as a pair, while a later single-key edit is a
  narrower follow-up. The scope is acceptable provided its transition fixture is named
  and run (W5).
- The existing `content-prompts.test.ts` census currently proves file existence only; the
  proposed per-file assertions are clearly within FR-3's stated target and scope.

### 4. Migration & Rollback

- Rollback remains a flag plus root Phase 7 wiring removal; no remote state or data rewrite
  is needed. Fresh installs get a Phase-7-only manifest, while existing adopter artifacts
  remain byte-unchanged.
- Root activation last and the PRD-017 Ship Verified precondition are appropriate
  deployment ordering. The present lock record for PRD-017 contains a valid `startedAt`,
  confirming one side of the new boundary exists in live state.
- The other side is not “already recorded”: PRD-018 is not merged and the repository has
  no persisted PRD-018 merge identifier. FR-6 must define a causally reliable persisted
  merge boundary and prove behavior around it (W6).

---

## Scorecard

Class `infra` weights, per `prompts/phase-2-readiness-scorer.md`.

| #         | Dimension                | Weight | Score       | Notes |
| --------- | ------------------------ | ------ | ----------- | ----- |
| 1         | Clarity                  | 15%    | 8.5/10      | W2 and W3 now specify the refusal/remedy and every prompt obligation. Docked because FR-6's preflight and introduction-transition proof lack a concrete runner/test target. |
| 2         | Completeness             | 20%    | 8.5/10      | Stories, disabled compatibility, exact prompt obligations, and in-flight policy are covered. The root-introduction transition and its temporal boundary still need executable details. |
| 3         | Technical Depth          | 20%    | 8.5/10      | Blob provenance, deep-merge semantics, and paired control snapshots match the code. A timestamp comparison is not causal merge proof without a canonical persisted boundary. |
| 4         | Multi-Tenancy & Security | 10%    | 8.5/10      | No tenant route/query surface. Command safety, human-only push, and owner acceptance remain in the design; no security hard cap applies. |
| 5         | Scope & Testability      | 15%    | 8.0/10      | FR-6's expanded root ownership is cohesive, but its claimed before/after transition fixture is absent from Targets and Verification Commands. |
| 6         | Migration & Rollback     | 20%    | 8.5/10      | Activation-last, fresh/adopter separation, rollback, and W4 policy are explicit. Docked for W6's non-deterministic temporal boundary. |
| **Total** | **Weighted**             |        | **8.43/10** | **PASS** |

Weighted sum:
`0.15×8.5 + 0.20×8.5 + 0.20×8.5 + 0.10×8.5 + 0.15×8.0 + 0.20×8.5`
`= 1.275 + 1.70 + 1.70 + 0.85 + 1.20 + 1.70 = 8.425 → 8.43`.

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
5. **W5 — name and run the root-control introduction transition fixture.** Add
   `packages/provegate/test/worktree.test.ts` (or an equally concrete test path) to FR-6
   Targets and a runnable FR-6 verification row that proves a pre-file lease refuses on
   reuse, then succeeds after base merge/rebase. Also target the Phase 4 preflight code
   that re-checks `_state/locks`.
6. **W6 — make grandfathering causally deterministic.** Persist and identify the PRD-018
   activation merge SHA/boundary, compare ancestry or a trusted merge event rather than
   mutable git commit timestamps, and add boundary tests for leases immediately before,
   immediately after, malformed, and future `startedAt` values.

---

## Iteration History

| # | Date       | Score | Verdict | Key Changes |
| - | ---------- | ----- | ------- | ----------- |
| 1 | 2026-07-25 | 8.15  | PASS    | First independent scoring of the split contract/enforcement scope. Measured three PRD claims against the live repo: manifest deep-merge behavior confirmed, egress scanner confirmed fail-closed but cache-stale, base-ref baseline guaranteed only for worktree flows |
| 2 | 2026-07-25 | 8.43 | PASS | Independent re-score: W1 cache guard re-confirmed; W2 refusal/remedy, W3 per-file table, and W4 in-flight policy resolved. Added W5 executable introduction-transition proof and W6 causal grandfather-boundary specification |

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
- [ ] W5 names and runs the root-control introduction/rebase fixture.
- [ ] W6 persists and tests a causal activation boundary.
- [ ] PRD-017 Ship Verified before Phase 4 entry.

---

## Verdict

**PASS — 8.43/10.** Scored independently by a different model family from the PRD author.
`node packages/provegate/dist/cli.js check PRD-018` exits 0, and no hard cap applies.

W2, W3, and W4 are genuinely resolved by the revised PRD and live repository
measurements. The new root-control introduction scope belongs with PRD-018 because it
changes the paired worktree provenance contract, while PRD-021 can own the later
single-key edit. Phase 3 may proceed, but its tasks must bind W5 and W6; Phase 4 still
waits on PRD-017 Ship Verified.
