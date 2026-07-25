# Readiness Assessment: PRD-018 — Closed-Loop Memory Contract and Enforcement

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-018-memory-contract-enforcement.md` |
| Score                  | 8.15/10 |
| Verdict                | PASS |
| Iteration              | 1 |
| Model Tier (Execution) | high |
| Model Tier (Audit)     | high |
| Scored by              | independent agent (different model family from the PRD author), via owner |
| Self-scored            | no |
| Date                   | 2026-07-25 |
| PRD Lint               | passed — `gate check PRD-018` exit 0 |
| State Record           | updated — PRD-018 shows `PASS · 8.15` |
| Dependency             | PRD-017 must be Ship Verified before Phase 4 |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | high | Score band 8–8.9. The weakening check reads git blobs, the readiness gate rewrites a lint every future PRD passes through, and activation changes gate behavior repo-wide — three surfaces where a subtly wrong implementation still looks green. |
| Phase 6 (Audit)     | high | The audit must attack the enforcement, not the prose: can a declared output be removed while the gate stays green, does a watch overlap actually block, and does anything become reachable while memory is disabled. |

---

## Analysis

### 1. Technical Depth & Architecture

The design is deeper than the original combined draft it came from, and in the two places
that matter most it is right for reasons the PRD states explicitly:

- **Weakening is proved against the base-ref blob, not working state.** Comparing the PRD
  as committed on the base branch is the only version an agent editing its own PRD cannot
  rewrite. Append-only emergent output stays legal, which keeps Phase 7 capture honest
  without opening a deletion path.
- **The manifest design is deep-merge-aware.** A fresh practices manifest omits `phases.4`
  entirely so configured floor gates survive; this repo's dogfood manifest repeats the four
  floor commands explicitly before appending two. I verified the merge semantics directly:
  `deepMerge(defaults, {phases:{'7':[…]}})` preserves the four-command floor, while an
  explicit `phases.4: []` erases it. The PRD's rule matches the actual behavior, and §12
  forbids the erasing spelling by name.
- **Watch overlap is a review trigger, not a staleness verdict** — the distinction that
  keeps the gate from becoming a rewrite treadmill.
- **`::SymbolName` normalization before glob matching** closes the obvious false-negative
  in target matching.

### 2. Edge Cases & Failure Modes

Measured against the live repository rather than accepted as written:

| Claim under test | Method | Result |
| ---------------- | ------ | ------ |
| Wiring `check-egress` into Phase 4 yields a real sixth floor gate (FR-6) | ran the scanner with no build output, then inspected the turbo cache key for `web#build` | **partly** — the scanner is fail-closed on missing output (`[egress] no built output found` → exit 1, verified), but `web#build` hashes exactly **one** file, `package.json`; everything under `apps/web/app/**` is outside the cache key, so a page edit does not bust the build and the gate would scan a replayed `.next`. See W1 |
| A base-ref baseline always exists for FR-5 | read the worktree claim path | **for worktree flows only** — `gate open --worktree` already refuses while workflow artifacts are missing or uncommitted on the base (`worktree.ts:425`), so the blob is guaranteed there. A plain `gate open` carries no such guarantee. See W2 |
| Root Phase 4 becomes exactly six commands | `deepMerge` behavior on the real default manifest | **confirmed** — order is preserved, and `build` precedes `check-egress`, which the egress scanner requires |

Remaining failure modes the PRD does name: disabled repos keep current behavior, historical
PRDs are not rewritten, `eligible` PRDs refuse weakening outright, missing/malformed
baselines fail closed, and existing adopter config/manifest bytes are never edited.

### 3. Maintainability & DX

- The contract is one grammar used by the template, the lint, the runner, and the review —
  a single place to change, and §12 already forbids the ambiguous spelling that the
  retired draft shipped.
- FR-3 is the least specified requirement: `prompts/**` covers ten files behind a single
  verification row. Nothing in the PRD says which obligation each phase prompt gains, so
  the test can only prove the directory changed, not that Phase 4 opens records or Phase 6
  challenges a `none`. See W3.
- Activation is the widest-blast-radius step in the three-PRD program: once memory is on
  in this repo, every future PRD passes through the new lint. The PRD sequences it last
  but does not say what happens to a PRD already in flight. See W4.

### 4. Migration & Rollback

- Rollback is a flag plus removing the root Phase 7 wiring; Markdown records survive, no
  data or remote migration exists.
- Fresh-versus-existing semantics are explicit in both directions: fresh practices installs
  get memory-enabled config and a `phases.7`-only manifest; existing config, manifests, and
  entrypoints stay byte-unchanged.
- The dependency on PRD-017 is stated as a Phase 4 precondition, which is the correct
  boundary — Phase 3 planning can proceed in parallel.

---

## Scorecard

Class `infra` weights, per `prompts/phase-2-readiness-scorer.md`.

| #         | Dimension                | Weight | Score       | Notes |
| --------- | ------------------------ | ------ | ----------- | ----- |
| 1         | Clarity                  | 15%    | 8.0/10      | Seven FRs with concrete Targets and runnable rows; the DO NOT list is unusually specific (it names `phases.4: []` and the output/`none` collision by name). Docked for FR-3, where ten prompt files sit behind one verification row with no per-file obligation stated |
| 2         | Completeness             | 20%    | 7.5/10      | Stories, Gherkin, non-goals, disabled-compatibility, and the weakening matrix are all covered. Three gaps: the egress gate's staleness dependency is unowned (turbo.json is not in Targets), the non-worktree baseline path has no stated remediation, and FR-3's per-prompt contract is unspecified |
| 3         | Technical Depth          | 20%    | 8.5/10      | Base-ref immutability, append-only emergence, deep-merge-aware manifest rules, and watch normalization are each the right mechanism for the failure they address, and the merge claim verifies. Docked for inheriting a cache-staleness dependency it does not own |
| 4         | Multi-Tenancy & Security | 10%    | 8.5/10      | No tenant surface. This is where `memory.verifyCommand` actually executes, and it runs through the existing command-safety allowlist; owner acceptance and human-only push are preserved rather than routed around |
| 5         | Scope & Testability      | 15%    | 8.0/10      | Still the largest of the three PRDs: contract, prompts, runner, activation, and dogfood. Every FR has a test target and the non-goals name which PRD owns each exclusion. FR-3 and FR-7 remain separable if Phase 3 proves heavy |
| 6         | Migration & Rollback     | 20%    | 8.5/10      | Activation last, fresh-versus-existing semantics explicit both ways, rollback is a flag, dependency boundary correct. Docked because enabling the contract changes behavior for every future PRD and the in-flight case is unstated |
| **Total** | **Weighted**             |        | **8.15/10** | **PASS** |

Weighted sum:
`0.15×8.0 + 0.20×7.5 + 0.20×8.5 + 0.10×8.5 + 0.15×8.0 + 0.20×8.5`
`= 1.20 + 1.50 + 1.70 + 0.85 + 1.20 + 1.70 = 8.15`.

Hard caps — none triggered:

- **Security cap:** not triggered. No protected route, endpoint, or query path.
- **Contract cap:** not triggered. No client→server payload or external schema.
- **Lint cap:** not triggered — `gate check PRD-018` exits 0.
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
   FR-6 may wire `check-egress` into Phase 4 as written.
2. **W2 — name the non-worktree baseline path.** `gate open --worktree` guarantees the PRD
   blob exists on the base branch; a plain `gate open` does not. FR-5 must state the
   refusal message and its remediation ("commit the PRD to the base branch first"), so the
   first non-worktree close fails with an instruction rather than an opaque baseline error.
3. **W3 — per-prompt obligations.** FR-3 must enumerate, phase by phase, the exact memory
   obligation each prompt gains, so `content-prompts.test.ts` asserts per file instead of
   proving only that the directory changed.
4. **W4 — activation blast radius.** Phase 3 must sequence activation last *and* state what
   happens to a PRD already in flight when the contract turns on: grandfathered as
   pre-contract, or required to add the sections before its next gate run.

---

## Iteration History

| # | Date       | Score | Verdict | Key Changes |
| - | ---------- | ----- | ------- | ----------- |
| 1 | 2026-07-25 | 8.15  | PASS    | First independent scoring of the split contract/enforcement scope. Measured three PRD claims against the live repo: manifest deep-merge behavior confirmed, egress scanner confirmed fail-closed but cache-stale, base-ref baseline guaranteed only for worktree flows |

---

## Project-Specific Checklist

- [x] Zero runtime dependencies; no telemetry, network, or push path.
- [x] Method content traces to the PRD-017 owner-approved addendum.
- [x] Existing adopter config, manifests, and entrypoints remain never-overwrite.
- [x] Human-only push and owner-only acceptance unchanged.
- [x] Memory-disabled repositories retain current behavior.
- [x] Output grammar is mutually exclusive and enforced by test, not prose.
- [x] W1 resolved before FR-6 wires `check-egress` into Phase 4 (landed 2026-07-25 as `verify:turbo-inputs` plus the turbo cache-key fix).
- [ ] PRD-017 Ship Verified before Phase 4 entry.

---

## Verdict

**PASS — 8.15/10.** Scored independently: a different model family from the PRD author,
with no authoring involvement.

This is the load-bearing PRD of the three, and its two hardest mechanisms — immutable
base-ref comparison and deep-merge-aware manifest wiring — are correct for stated reasons
I was able to verify directly. The score is held down by one finding measurement produced:
FR-6 wires `check-egress` into the Phase 4 floor, but that command consumes build output
whose turbo cache key covers a single file, so the gate can pass on bytes it never scanned.
Wiring a gate is not the same as arming it (W1).

Phase 3 may begin now; Phase 4 waits on PRD-017 Ship Verified. W1 was resolved on
2026-07-25 outside this PRD — the turbo cache key now covers the app sources and
`verify:turbo-inputs` keeps it that way — so FR-6 may wire `check-egress` as written.
