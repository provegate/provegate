# PRD-021: Governance Truth-Up — Stale Wave-2 Claims and the Value-Score Recompute Gate

> **Status**: Draft
>
> **Created**: 2026-07-25
> **Updated**: 2026-07-25
> **Author**: Cursor, for owner review
> **Audience**: Implementing Agent
> **Slug**: `governance-truth-up`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: This corrects governance documents and adds one workflow verify
> gate; no product surface or runtime behavior changes.
> **Autonomous Close**: operator-gated
> **Value**: 3.55 (MF/UI/TL/AR/RM: 5/2/3/3/5)

<!-- 0.25*5 + 0.25*2 + 0.20*3 + 0.15*3 + 0.15*5 = 3.55. -->

---

## 1. Introduction / Overview

The governance documents promise three mechanical checks "in wave 2". Two of them
shipped and the docs never caught up; one never shipped and the docs imply it exists as
future-certain work:

- `AGENT_BOOTSTRAP.md:128` says the `verify:durable-artifacts` check "lands in wave 2" —
  `scripts/verify/verify-durable-artifacts.mjs` is wired in `package.json` today.
- `STATUS.md:25` says the deferral cap is "gate-enforced in wave 2" —
  `scripts/verify/verify-deferred.mjs` enforces cap 15 / warn 12 today.
- `_brain/PROTOCOL.md:182,204` still calls `verify:brain` optional wave-2 tooling and a
  stub — it is a wired gate.
- `AGENT_BOOTSTRAP.md:144` says the value-score recompute "lands in wave 2" — nothing
  under `scripts/verify/` recomputes a declared `Value:` header. This is the one real
  hole, and `_brain/learnings/score-must-equal-weighted-sum.md` already records the
  failure mode: without a machine check, authors round up to clear the threshold.

Separately, the research pack (`docs/research/provegate-bootstrap/`) reads as the live
plan while `apps/docs` carries the v1.0 canon — the roadmap's phase checkboxes look
unstarted although PRD-001–016 are Ship Verified. Two canons, no marked winner.

This PRD makes the documents describe the system that exists, ships the missing
recompute gate, and adds a small drift check so the "lands in wave 2" class of lie
cannot silently return.

---

## 2. Goals

### Primary Goals

- [ ] Ship the value-score recompute gate promised by the triage rules.
- [ ] Correct every stale wave-2 claim in the governance docs, on both the live side and
      the shipped practices copy.
- [ ] Mark the research pack as the frozen bootstrap record and name `apps/docs` as the
      live canon.
- [ ] Make a re-drift of these claims a gate failure, not a reading-comprehension task.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| PRDs whose declared value equals the weighted sum | unverified | all, machine-checked | `pnpm verify:value-score` |
| Stale "wave 2" claims about shipped gates | 4 | 0 | drift check |
| Pack/live pairs left one-sided | n/a | 0 | `pnpm verify:pack-drift` |
| Research pack canon status stated | no | yes | banner on the pack README |
| Runtime dependencies added | 0 | 0 | zero-dep policy |

---

## 3. User Stories

#### User Story 1

```
As a reviewer scoring a PRD candidate,
I want the declared Value header recomputed mechanically,
so that a rounded-up score cannot carry a below-threshold candidate into the queue.
```

**Acceptance Criteria:**

- [ ] A PRD declaring `Value: 4.05 (MF/UI/TL/AR/RM: 5/3/5/3/4)` passes; changing one
      dimension without changing the total fails with both numbers reported.
- [ ] A PRD with no `Value:` header is reported as such, not silently skipped — a
      missing header must not be a pass (per the false-green-on-missing-file learning).

#### User Story 2

```
As an agent reading AGENT_BOOTSTRAP before starting work,
I want the document to describe gates that actually exist,
so that I don't skip a check believing a human enforces it by inspection.
```

**Acceptance Criteria:**

- [ ] No governance doc describes a wired `verify:*` script as future work.
- [ ] The practices-pack copies move with the live files and the pack-drift ledger is
      reconciled in the same change.

#### User Story 3

```
As a newcomer reading docs/research/provegate-bootstrap,
I want to know it is the frozen bootstrap record, not the live plan,
so that I don't act on a roadmap whose phases already shipped.
```

**Acceptance Criteria:**

- [ ] The pack README carries a banner naming `apps/docs` as the live canon and the
      extraction as complete through PRD-016.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1**: Add `scripts/verify/verify-value-score.mjs`: for every PRD under
   `_prds/wip/` and `_prds/completed/`, parse the `Value:` header, recompute
   Σ(dimension × weight), and fail on mismatch beyond a stated rounding tolerance.
   Weights are read from configuration/one declared constant table, never scattered
   literals (config-over-hardcode). A PRD with a malformed or absent header is reported
   as a failure, not skipped.
   - **Targets:** `scripts/verify/verify-value-score.mjs` (new),
     `scripts/verify/lib.mjs` (reuse the existing reporter)
2. **FR-2**: Wire the gate: a `verify:value-score` script in `package.json`, membership
   in the `verify:workflow` bundle, and the CI hygiene job — so `gate check --wiring`
   sees a registered check on an executing surface (the wire-or-delete meta-gate).
   - **Targets:** `package.json` (`scripts`), `scripts/verify/verify-workflow.mjs`,
     `.github/workflows/` (hygiene job)
3. **FR-3**: Correct the stale governance claims: `AGENT_BOOTSTRAP.md` durable-artifacts
   (line ~128) and value-score (line ~144) sentences, the `STATUS.md` deferral-cap note
   (line ~25), and the `_brain/PROTOCOL.md` optional-tooling sections (~182, ~204). Each
   sentence states the shipped script name and the surface that runs it.
   - **Targets:** `AGENT_BOOTSTRAP.md`, `STATUS.md`, `_brain/PROTOCOL.md`
4. **FR-4**: Port the same corrections to the shipped practices copies and reconcile the
   hash ledger in the same change — `brain/PROTOCOL.md`, `templates/AGENT_BOOTSTRAP.template.md`,
   and `templates/STATUS.template.md` are all pack-drift pairs, so a one-sided edit fails
   the bundle.
   - **Targets:** `packages/provegate/practices/brain/PROTOCOL.md`,
     `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`,
     `packages/provegate/practices/templates/STATUS.template.md`,
     `scripts/verify/pack-drift-ledger.json`
5. **FR-5**: Add a status banner to `docs/research/provegate-bootstrap/README.md`:
   frozen bootstrap record, extraction complete through PRD-016, live canon is
   `apps/docs`. Mark the roadmap's shipped phases and point the draft whitepaper at the
   published v1.0.
   - **Targets:** `docs/research/provegate-bootstrap/README.md`,
     `docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md`,
     `docs/research/provegate-bootstrap/whitepaper-gated-autonomy-2026-07-22.md`
6. **FR-6**: Add a drift check that fails when a governance doc describes a `verify:*`
   script as future work while a script of that name is wired in `package.json`. Scope
   it to the governance file set; keep it a plain scan with a named allowlist for
   genuinely unshipped work.
   - **Targets:** `scripts/verify/verify-value-score.mjs` or a sibling check registered
     the same way (implementer's call, recorded in the task plan)

---

## 5. Non-Goals (Out of Scope)

- Changing the weights, thresholds, or the expand-don't-delete triage rule — this gate
  enforces the declared arithmetic, it does not re-tune the model.
- Retro-scoring or rewriting completed PRDs whose headers are already correct.
- Memory effectiveness metrics (`gate memory stats`) — a dated deferral, owner-held.
- Panel-vs-single-reviewer machine rule — needs an ADR before any PRD.
- Any marketing or landscape claim re-verification.
- Rewriting the research pack's content; this PRD only marks its status.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a PRD whose declared total does not equal the weighted sum, **When**
  `pnpm verify:value-score` runs, **Then** it exits non-zero naming the PRD, the declared
  total, and the recomputed total.
- **Given** a PRD file with no `Value:` header, **When** the check runs, **Then** it
  fails rather than passing by absence.
- **Given** the corrected `AGENT_BOOTSTRAP.md` without the paired practices template
  edit, **When** `pnpm verify:pack-drift` runs, **Then** it fails until the counterpart
  is ported and the ledger reconciled.
- **Given** the full corrected set, **When** `pnpm verify:workflow` runs, **Then** it
  exits 0 with the new check included.

---

## 7. Technical Considerations

### Architecture

- **One more member of the existing verify library.** The new check follows the shipped
  shape: zero dependencies, target-root argument, shared reporter from `lib.mjs`,
  registered in the bundle and in CI. Nothing new is invented.
- **Absence is a failure, not a skip.** Two `_brain` learnings bind this implementation
  directly — a grep-a-file check must exit 1 when the file is absent, and a declared
  score must be machine-compared or authors round up. The parser must therefore treat a
  missing/malformed `Value:` header as a reported failure.
- **The pack ledger is the trap.** `_brain/PROTOCOL.md`, `AGENT_BOOTSTRAP.template.md`,
  and `STATUS.template.md` are among the 49 reconciled pairs; the two sides are
  genericized copies, so the fix is "port what belongs there, then re-run with
  `--reconcile`", never a byte copy.
- **Phase placement.** Register the new check in the phase where its failure should
  surface (the verify-check-phase-placement learning) — it is a Phase 1/2 triage
  invariant, so it belongs on the pre-merge hygiene surface, not late in Phase 4.

### Dependencies

- none (existing verify library + shipped scripts)

---

## 8. Implementation Scope

### In Scope

- [ ] `scripts/verify/verify-value-score.mjs` (new) + bundle/CI registration
- [ ] `AGENT_BOOTSTRAP.md`, `STATUS.md`, `_brain/PROTOCOL.md`
- [ ] `packages/provegate/practices/` counterparts + `pack-drift-ledger.json`
- [ ] `docs/research/provegate-bootstrap/` status banner + roadmap/whitepaper pointers

---

## 9. Open Questions

- [ ] Rounding tolerance for the recompute: exact two-decimal equality, or ±0.005?
      (Exact is stricter and the declared headers are all two-decimal today.)
- [ ] Does FR-6's drift check ship here, or is it over-fitting a one-time cleanup?
      (Owner decision before Phase 2 PASS; dropping it lowers the value score.)
- [ ] Should the weights live in `workflow.config.json` so adopters can retune them, or
      stay a script-local constant table until an adopter asks?

---

## 10. References

- Gap analysis: P0 item 3 (doc drift remainder) + P2 item 7 (value-score recompute)
- `_brain/learnings/score-must-equal-weighted-sum.md`
- `_brain/learnings/false-green-on-missing-file.md`
- `_brain/learnings/gate-wire-or-delete.md`
- `_brain/learnings/verify-check-phase-placement.md`
- `scripts/verify/pack-drift-ledger.json` (`_readme` describes the reconcile contract)
- Already closed by release prep (2026-07-25): the package README's "not implemented"
  claims — not in this PRD's scope

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `scripts/verify/verify-value-score.mjs`
- `scripts/verify/verify-workflow.mjs`
- `scripts/verify/pack-drift-ledger.json`
- `AGENT_BOOTSTRAP.md`
- `STATUS.md`
- `_brain/PROTOCOL.md`
- `packages/provegate/practices/brain/PROTOCOL.md`
- `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`
- `packages/provegate/practices/templates/STATUS.template.md`
- `docs/research/provegate-bootstrap/**`

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Review artifact: `_docs/reviews/review-021-governance-truth-up.md`
- Learning: `_brain/learnings/docs-outlive-the-gate-they-promise.md` — the promise-vs-shipped
  gap is the recurring shape here (three of four wave-2 claims were already true); record
  it if the close confirms the pattern, otherwise downgrade this entry to `none` before
  Phase 4.

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                                     | Scope | Notes                                        |
| ---- | ------------------------------------------------------------------- | ----- | -------------------------------------------- |
| FR-1 | `node scripts/verify/verify-value-score.mjs`                         | repo  | every PRD header recomputed                  |
| FR-2 | `pnpm verify:value-score`                                            | repo  | script registered in package.json            |
| FR-2 | `grep -c value-score scripts/verify/verify-workflow.mjs`             | repo  | member of the verify bundle                  |
| FR-3 | `pnpm verify:workflow`                                               | repo  | governance docs pass the full bundle         |
| FR-4 | `pnpm verify:pack-drift`                                             | repo  | pack/live pairs reconciled, ledger updated   |
| FR-5 | `grep -c "frozen" docs/research/provegate-bootstrap/README.md`       | docs  | status banner present                        |
| FR-6 | `node scripts/verify/verify-value-score.mjs`                         | repo  | drift scan reports zero stale wave-2 claims  |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build

Hard caps (when your gates manifest configures them):

- Deny test: `scripts/verify/` gains a check — a fixture proving a wrong score FAILS is
  required; a check that only passes on good input is not evidence.
- Contract test: n/a — no client→server payload ships

Before Phase 2 PASS, run: `gate check PRD-021`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT let a missing or malformed `Value:` header pass as green.
- DO NOT edit a live governance file without porting the practices counterpart and
  reconciling the ledger in the same change.
- DO NOT silence the new check by adding a known-red ledger entry instead of fixing a
  wrong header.
- DO NOT rewrite research-pack content while adding its status banner.
- DO NOT change the scoring weights or thresholds under cover of this cleanup.

---

## Changelog

| Date       | Author | Changes                                                   |
| ---------- | ------ | ---------------------------------------------------------- |
| 2026-07-25 | Cursor | Initial draft from the vision gap analysis (P0-3 and P2-7) |
