# PRD-041: A Close That Writes the State It Claims

> **Status**: Draft
>
> **Created**: 2026-08-07
> **Updated**: 2026-08-07
> **Author**: owner
> **Audience**: Implementing Agent
> **Slug**: `close-writes-its-own-state`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Class Rationale**: n/a — feature class.
> **Autonomous Close**: eligible
> **Value**: 3.60 (MF/UI/TL/AR/RM: 4/5/3/2/3)

<!-- 0.25*4 + 0.25*5 + 0.20*3 + 0.15*2 + 0.15*3
     = 1.00 + 1.25 + 0.60 + 0.30 + 0.45 = 3.60 -->

---

## 1. Introduction / Overview

In the first external adopter run (`pnpm smoke:adopter`, 2026-08-07) a PRD passed every gate,
archived, merged, and ended on the handoff card. Its committed artifact still reads
`> **Status**: Draft`, and `gate status` prints `PRD-001 Draft` on the line above
`Implemented: 1`.

Nothing writes the terminal status. `grep -rn "Ship Verified" packages/provegate/src` returns
the config vocabulary and nothing else; the phase-6 prompt asks the agent to *decide* the
status and no prompt or code writes it. In this repository agents have flipped the header by
hand at every close, which is why 39 self-hosted items never exposed it — the manual step was
invisible from inside.

The same run left the working tree dirty: the adopter committed `_state/locks/prd-001-*.json`
(a plain `git add -A` picks it up), the runner's cleanup deleted it *after* the land commit,
and the close ended with an uncommitted deletion. The next `gate open --worktree` refuses on a
dirty tree — a close that makes the next claim refuse.

Both defects have the same shape: the runner performs a state change and does not record it.

A third symptom belongs to the same knot. `core/state/query.ts::isImplemented` returns true
when the PRD artifact sits in the completed state, with no reference to its status — so
archiving is read as shipping. That is how `Implemented: 1` and `Draft` print together, and it
is a standing deferral on the board.

---

## 2. Goals

### Primary Goals

- [ ] A closed item's committed artifact carries the configured terminal status.
- [ ] A close leaves no uncommitted change it made itself.
- [ ] Implementation is read from what the artifact says, not from where it sits.

### Success Metrics

| Metric                          | Current | Target        | Measurement                    |
| ------------------------------- | ------- | ------------- | ------------------------------ |
| Status of a closed PRD          | `Draft` | terminal      | `pnpm smoke:adopter` known-red |
| Uncommitted paths after a close | 1       | 0             | `pnpm smoke:adopter` known-red |
| Board deferral rows             | 15      | 14            | `pnpm verify:deferred`         |

---

## 3. User Stories

#### User Story 1

```
As an adopter reading my board a week after a close,
I want the artifact to say what happened to it,
so that I do not have to reconstruct it from git history.
```

**Acceptance Criteria:**

- [ ] After `gate run PRD-001`, the archived PRD reads the configured terminal status.
- [ ] After `gate run PRD-001`, `git status --short` is empty.

---

## 4. Functional Requirements

1. **FR-1**: At the archive step, the runner writes the configured terminal status
   (`statusVocab.complete`, never a literal) into the PRD and task artifacts, and that write is
   part of the archive commit. A close that reaches archive has passed every gate the status
   asserts.
   - **Targets:** `packages/provegate/src/core/run/archive.ts::archivePrdArtifacts`
2. **FR-2**: The status write refuses rather than guesses when the artifact's status line is
   absent or already terminal: absent is template drift, already-terminal is a resumed close,
   and neither is a silent overwrite.
   - **Targets:** `packages/provegate/src/core/run/archive.ts::archivePrdArtifacts`
3. **FR-3**: The runner commits the lease deletion its own cleanup performs, so a close leaves
   the tree exactly as clean as it found it. `_state/` is a coordination path, so the commit is
   legal on a protected base by the existing guard.
   - **Targets:** `packages/provegate/src/cli.ts::runRun`
4. **FR-4**: `isImplemented` reads the record's status against `statusVocab.implemented`
   instead of the artifact's location. Archiving is where a thing sits; shipping is what it
   says.
   - **Targets:** `packages/provegate/src/core/state/query.ts::isImplemented`
5. **FR-5**: The board's `isImplemented reads location as achievement` deferral row is deleted
   in the same change that closes it, and the two known-red entries this work fixes are removed
   from the adopter smoke.
   - **Targets:** `STATUS.md`, `scripts/adopter-smoke.sh`

---

## 5. Non-Goals (Out of Scope)

- Writing `Operator Verification` or any non-terminal status transition mid-flight; only the
  close writes, and only once.
- Teaching `gate init` to add entries to an adopter's existing `.gitignore` — init is
  additive-only and never edits a file it did not write.
- The operator-row counting defects the same run exposed — PRD-040 owns those.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a PRD that passes every gate, **When** `gate run` archives it, **Then** the
  committed artifact carries the configured terminal status.
- **Given** an artifact whose status is already terminal, **When** a resumed close reaches
  archive, **Then** the write is a no-op and the run continues.
- **Given** a close that released a committed lease, **When** the run ends, **Then**
  `git status --short` is empty.
- **Given** an archived PRD whose status is not in `statusVocab.implemented`, **When**
  `gate status` runs, **Then** it is not counted as implemented.

---

## 7. Technical Considerations

### Architecture

The status write belongs at archive, not at merge: archive is the last step that owns the
artifact bytes, and its commit already stages the wip→completed moves. Writing at merge would
put the change in a commit whose auto-revert would silently undo the status too.

The status line is matched by the same reader the state builder uses, so one grammar governs
both the read and the write — a second regex here is how the two would drift.

FR-4 changes a count this repository publishes (`verify:doc-claims` reads the shipped figure),
so run that check before and after: every historical item carries a terminal status, so the
number must not move. If it does, an artifact is lying and that is the finding.

### Dependencies

- none

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/run/archive.ts`
- [ ] `packages/provegate/src/cli.ts`
- [ ] `packages/provegate/src/core/state/query.ts`
- [ ] `packages/provegate/test/chain.test.ts`, `packages/provegate/test/cli-state.test.ts`
- [ ] `STATUS.md`, `scripts/adopter-smoke.sh`

---

## 9. Open Questions

- (none)

---

## 10. References

- `scripts/adopter-smoke.sh` — the run that measured both defects
- `_brain/learnings/no-completed-done-status-alias.md`
- STATUS.md deferral: `isImplemented reads location as achievement`

---

## Memory Inputs

- applied: `no-completed-done-status-alias` — FR-1 writes `statusVocab.complete` from config
  and never a literal, for the reason that record gives: the vocabulary is the contract, and a
  hardcoded terminal value is how an alias re-enters.
- applied: `metadata-declares-what-it-cannot-provide` — the defect in one line: the close
  declares a terminal state in its handoff card and provides no artifact carrying it.
- applied: `gate-run-resume-after-archive` — FR-2's already-terminal case is exactly the
  resumed-close path that record documents; the write must be idempotent or a resume from
  phase 7 fails on its own previous success.
- applied: `assert-absent-needs-an-independent-cause` — FR-2's refusal fixtures need an
  independent cause: an artifact with no status line must fail because the line is missing,
  not because the fixture also removed the section that contains it.
- reviewed: `strictness-added-during-extraction-is-a-behavior-change` — `core/run/**` watch.
  FR-2 adds a refusal where the code previously did nothing at all; it is new behaviour on a
  path that had none, not a relocated decision, and §6 pins both arms.
- reviewed: `fixture-must-reach-production-shape` — `cli.ts` watch; FR-3's test must drive the
  real `runRun` cleanup path, since a helper called directly would commit a deletion the
  production sequence never performs.
- reviewed: `free-text-field-is-the-unread-drift-ledger` — `_state/**` watch; FR-3 commits a
  lease deletion and adds no field to the lease schema.
- reviewed: `docs-outlive-the-gate-they-promise` — `STATUS.md` watch; FR-5 deletes a deferral
  row as its defect closes, which is the inverse of the drift that record describes.
- reviewed: `a-rule-corrected-survives-where-it-is-restated` — `_prds/**` watch; the two
  defects are restated in §1, §2, §4 and §6, so a correction sweeps all four.

## Memory Outputs

- learning: `_brain/learnings/the-close-must-record-what-it-changed.md` — a runner that
  performs a state change without recording it produces artifacts that disagree with the run
  that made them; the gap survives self-hosting because the humans running it patch the state
  by hand without noticing they are the mechanism.

---

## Conflict Surface

- `packages/provegate/src/core/run/archive.ts`
- `packages/provegate/src/core/state/query.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/test/chain.test.ts`
- `packages/provegate/test/cli-state.test.ts`
- `scripts/adopter-smoke.sh`

---

## Durable Artifacts

- `_brain/learnings/the-close-must-record-what-it-changed.md` — every Memory Output above
  repeats here; the two lists are one contract and Phase 7 refuses when they disagree
- ADR: `none`

---

## 11. Verification Commands

| FR   | Command / Check                | Scope              | Notes                                    |
| ---- | ------------------------------ | ------------------ | ---------------------------------------- |
| FR-1 | `pnpm test --filter provegate` | chain.test.ts      | archived artifact carries statusVocab.complete |
| FR-2 | `pnpm test --filter provegate` | chain.test.ts      | absent line refuses, terminal line no-ops |
| FR-3 | `pnpm test --filter provegate` | cli.test.ts        | tree clean after a close that released a lease |
| FR-4 | `pnpm test --filter provegate` | cli-state.test.ts  | archived non-terminal item is not implemented |
| FR-5 | `pnpm verify:deferred`         | board              | the closed row is gone, cap arithmetic holds |
| FR-5 | `pnpm smoke:adopter`           | adopter fixture    | both known-red entries gone, run green    |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm verify:doc-claims` — the published figure does not move

Before Phase 2 PASS, run: `gate check PRD-041`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT hardcode `Ship Verified`; read `statusVocab.complete`.
- DO NOT write the status at merge time, where an auto-revert would silently undo it.
- DO NOT add a second status-line regex; use the reader the state builder already uses.

---

## Changelog

| Date       | Author | Changes                                                          |
| ---------- | ------ | ---------------------------------------------------------------- |
| 2026-08-07 | owner  | Initial draft — from the first external adopter run, both defects measured |
