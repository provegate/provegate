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

1. **FR-1**: At the archive step the runner writes the **terminal status** into both the PRD and
   the task artifact, and that write is part of the archive commit. Terminal means the canonical
   value the `complete` alias resolves to — `normalizeStatus(config.statusVocab, 'complete')`
   (`core/state/status.ts:28`), which is `Ship Verified` under the shipped vocabulary. There is
   no `statusVocab.complete` field; the normalizer is the only config-driven source, and a
   literal is forbidden.
   Both artifacts are **prevalidated before either is mutated**: each must contain exactly one
   status line matching the reader the state builder uses. Zero lines or more than one is a
   refusal that names the file and the count, and nothing is written — a partial write across
   two artifacts is worse than no write.
   The archive commit carries three things, in this order: the status writes, the regenerated
   `_state/prds.json`, and whatever a repository's **configured post-state hook** wrote from it.
   The hook is a NEW manifest key, `postState`, defaulting to `[]` — it is neither a replay nor a
   relocation of `manifest.phases['7']`, whose commands keep their existing meaning and their
   existing place in the chain, because changing when an adopter's phase-7 gates run would be a
   silent behaviour change nobody asked for. An absent or empty `postState` is a no-op, not a
   warning; most adopters publish nothing derived from state.
   **Failure is atomic:** a `postState` command that exits non-zero aborts the archive — the
   artifacts return to their pre-archive paths and bytes, the index returns to its pre-archive
   staging, no commit is created, and the run stops naming the command and its output. A close
   that committed a half-regenerated projection would publish a number nobody derived.
   **Output discovery:** whatever the hook wrote is found by `git status --porcelain` scoped to
   the workspace root after it runs, and those paths join the same commit; the runner never
   guesses which files a repository's projection touches.
   In THIS repository `postState` is `["node scripts/derive-self-hosting-figures.mjs --write"]`,
   added to `gates.manifest.json`. Config over hardcode: a fresh adopter must never inherit a
   command named after this repository's case study.
   - **Targets:** `packages/provegate/src/core/run/archive.ts::archivePrdArtifacts`,
     `packages/provegate/src/core/gates/manifest.ts`, `packages/provegate/src/cli.ts::runRun`,
     `gates.manifest.json`, `_state/prds.json`,
     `apps/docs/content/docs/case-study.mdx`
2. **FR-2**: The write is idempotent. An artifact whose status is already the terminal value is
   an explicit **no-op** — not a refusal — because that is what a `--from-phase=7` resume looks
   like after a previous run wrote it (`gate-run-resume-after-archive`). A status that is
   neither terminal nor readable is the refusal case in FR-1. The two are distinguished by the
   value, never by whether the file changed.
   - **Targets:** `packages/provegate/src/core/run/archive.ts::archivePrdArtifacts`
3. **FR-3**: The runner commits the lease deletion its own cleanup performs, so a close leaves
   the tree exactly as clean as it found it. Placement: on the base checkout
   (`merge.baseDir`), **after** the post-merge gates pass and **before** the handoff card,
   under the same claim mutex the cleanup already holds. The commit is path-scoped to the lease
   file with a conventional message (`chore(state): release PRD-NNN lease`). `_state/` is a
   coordination path, so the base-branch guard permits it (`scripts/base-branch-guard.mjs`,
   `ALLOWED_DIR_PREFIXES`).
   Cases, each with its own behaviour: the file is **tracked** → commit the deletion; **untracked
   or ignored** → nothing to commit, and the run says so; **absent** → no-op; **recreated by a
   parallel claim between cleanup and commit** → leave it alone and warn, never delete another
   claimant's lease; **commit hook fails** → print the hook's output verbatim, leave the
   tree as it is (the deletion stays staged), and exit **1** with the exact retry in the
   message: `git commit -m "chore(state): release PRD-NNN lease" -- <lease path>`, run from the
   base checkout once the hook passes. `gate release` is NOT the retry — it drops a lease, and
   the lease is already gone; naming it would be a recovery path that cannot recover. A close that hides a hook failure is the
   defect this repository already refuses elsewhere.
   - **Targets:** `packages/provegate/src/cli.ts::runRun`,
     `packages/provegate/src/core/run/release.ts`
4. **FR-4**: The configured status becomes the **sole** `isImplemented` predicate. Both
   fallbacks are removed: `record.artifactStates.prd === completed` (archiving is a location)
   and `record.artifactStates.summary !== 'missing'` (a summary is a document, not a verdict).
   A record is implemented when `config.statusVocab.implemented` contains its status, and not
   otherwise.
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

- **Given** a PRD that passes every gate, **When** `gate run` archives it, **Then** the PRD and
  the task artifact both carry `normalizeStatus(config.statusVocab, 'complete')` in the archive
  commit, and `_state/prds.json` in that commit agrees.
- **Given** an artifact carrying two status lines, or none, **When** archive runs, **Then** it
  refuses naming the file and the count, and **neither** artifact is modified.
- **Given** an artifact whose status is already terminal, **When** a `--from-phase=7` resume
  reaches archive, **Then** the write is a no-op and the run continues.
- **Given** a close whose post-merge gates pass and whose lease file is tracked, **When** the
  run ends, **Then** a `chore(state): release PRD-NNN lease` commit exists on the base and
  `git status --short` is empty.
- **Given** a lease file recreated by another claim between cleanup and commit, **When** the
  commit step runs, **Then** it warns and leaves the file, and no other claimant's lease is
  deleted.
- **Given** an archived PRD whose status is `Superseded`, **When** `gate status` runs, **Then**
  it is not counted as implemented — measured: the board's implemented count moves 39 → 38.
- **Given** a record with a completed-location PRD and a present summary but a non-implemented
  status, **When** `isImplemented` runs, **Then** it is false.

**State transitions the close must honour** (artifact paths, statuses, lease, and the exact
retry):

| Point | PRD/tasks status | artifact location | lease | on failure, retry with |
| ----- | ---------------- | ----------------- | ----- | ---------------------- |
| gates green, pre-archive | unchanged | `wip` | held | `gate run --from-phase=N PRD-NNN` |
| archive commit written | terminal | `completed` | held | un-archive the moved artifacts (`git mv` them back to `wip`, or revert the archive commit), then `gate run --from-phase=7 PRD-NNN` — the recorded recipe in `gate-run-resume-after-archive`, stated here as the exact steps rather than by reference |
| merge fails — feature ref | terminal | `completed` | held | un-archive: `git mv` the artifacts back to `wip` **and commit the moves**, then `gate run --from-phase=7 PRD-NNN` |
| merge fails — base ref | unchanged (the base never received the commit) | `wip` on base | held | same |
| post-merge gate fails → auto-revert, feature ref | terminal; the archive commit stands, only the merge is reverted | `completed` | held | same un-archive-and-commit sequence, then `--from-phase=7` |
| post-merge gate fails → auto-revert, base ref | back to its prior status | back to `wip` on base | held | same |

`--from-phase=merge` is **not** a retry for any archived state: `chain.ts::shouldSkipGate` keeps
the memory gates in the chain, and they read the artifacts at their `wip` paths, so a resume over
archived artifacts fails on paths that moved. That is the recorded
`gate-run-resume-after-archive` trap, and the un-archive moves must be COMMITTED — an uncommitted
`git mv` leaves the gate reading a tree the commit-based checks cannot see.
| post-merge green | terminal | `completed` | released, deletion committed | — |

---

## 7. Technical Considerations

### Architecture

The status write belongs at archive, not at merge: archive is the last step that owns the
artifact bytes, and its commit already stages the wip→completed moves. Writing at merge would
put the change in a commit whose auto-revert would silently undo the status too — which is also
why the transition table in §6 records that an auto-revert reverts the MERGE and leaves the
archive commit standing.

The status line is matched by the same reader the state builder uses, so one grammar governs
both the read and the write — a second regex here is how the two would drift. The terminal
value comes from `normalizeStatus`, never from a literal.

**Measured, not asserted.** FR-4 changes what the board counts. Executed against
`_state/prds.json` on 2026-08-07:

```
Ship Verified 37 · Superseded 1 · Archived 1 · Draft 4
status-implemented (statusVocab.implemented): 38
prd artifact in completed location:           39
```

So at the moment of measurement the board's implemented count moves **39 → 38**: `PRD-023` is
`Superseded` and sits in the completed location, which is exactly the defect.

**The absolutes are a dated baseline, not an invariant.** This item's own close adds one
`Ship Verified` record, so after PRD-041 archives the same two numbers read 39 implemented and 38
`Ship Verified`. Pinning either absolute in a test would go stale on the next close — the
`enumerate-don't-pin` failure this repository has already paid for twice. §11 therefore asserts
the PREDICATE: every record whose status is in `statusVocab.implemented` is implemented, no
record outside it is, and `PRD-023` — `Superseded`, in the completed location, **summary
missing** (measured: `artifactStates` = prd/readiness `completed`, tasks/summary `missing`) — is
false on the location fallback alone, which is the fallback FR-4 removes. `verify:doc-claims` keeps checking the published figure separately, and it moves too: this
item's own close makes the `Ship Verified` figure **38**, not 37. The projection is regenerated
inside the close rather than by hand — see the lifecycle below.

**Projection lifecycle (every automatic terminal write, not only this one).** After the status
write and the state regeneration, and before the archive commit is created, the runner executes
`manifest.postState` and includes whatever it wrote in that commit. The order matters and is
asserted: state first (a projection reads it), hook second, commit third. An empty or absent
`postState` is a legal no-op — most adopters publish no figures at all — and a failing command
aborts the archive rather than committing part of it.

In THIS repository the hook is `node scripts/derive-self-hosting-figures.mjs --write`, which
rewrites the sentinel region in `apps/docs/content/docs/case-study.mdx`; adding it to
`gates.manifest.json` is part of this item. A close that wrote the status and left the published
figure stale would recreate the live `verify:doc-claims` red this repository already hit on
2026-07-29 — and a shipped runner that hardcoded that script would ship this repository's
private problem to every adopter.

### Migration & Rollback

- **Commit ordering:** archive commit (status + regenerated state) → merge → post-merge gates →
  lease-deletion commit → handoff. Each step is separately revertible and none rewrites an
  earlier one.
- **Closes begun with the previous CLI:** an artifact left at `Draft` in the completed location
  by an older run keeps that status; nothing back-fills history. It stops counting as
  implemented under FR-4, which is the correct reading of what it says, and the remedy is to
  write the terminal status by hand once.
- **Recovery from an archived state:** un-archive by `git mv`-ing the artifacts back to `wip`
  and **committing the moves**, then `gate run --from-phase=7 PRD-NNN`. `--from-phase=merge`
  cannot recover an archived item — the memory gates are not skippable and read the `wip` paths.
- **Recovery:** to undo a status write, revert the archive commit; the artifacts return to
  `wip` with their previous status. To undo the lease-deletion commit, revert it — the lease
  file returns, and `gate release` drops it cleanly. Never recreate a lease file by hand: a
  hand-written lease that another session then steals is worse than a missing one.
- **Projection transaction:** the archive commit is status writes + regenerated state + hook
  outputs, created once. A hook failure restores pre-archive paths, bytes and index staging and
  creates nothing, so there is no partial state to clean up by hand.
- **Rollback trigger:** if the archive commit's prevalidation refuses on existing artifacts in
  a real corpus, stop — that means the status grammar this PRD assumes does not match what the
  repository actually contains, and the grammar is the finding.

### Dependencies

- none

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/run/archive.ts`
- [ ] `packages/provegate/src/core/run/release.ts`
- [ ] `packages/provegate/src/cli.ts`
- [ ] `packages/provegate/src/core/state/query.ts`
- [ ] `packages/provegate/test/chain.test.ts`, `packages/provegate/test/cli.test.ts`,
      `packages/provegate/test/cli-state.test.ts`
- [ ] `scripts/check-implemented-predicate.mjs` (repo-class, run directly and uncached)
- [ ] `gates.manifest.json` (this repository's `postState` entry; the CLI stays repo-agnostic)
- [ ] `packages/provegate/src/core/gates/manifest.ts` (the new `postState` key and its default)
- [ ] `_state/prds.json` (regenerated inside the archive commit)
- [ ] `apps/docs/content/docs/case-study.mdx` (regenerated, never hand-edited)
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

- applied: `no-completed-done-status-alias` — FR-1 writes the value `normalizeStatus(config.statusVocab, 'complete')` returns
  and never a literal, for the reason that record gives: the vocabulary is the contract, and a
  hardcoded terminal value is how an alias re-enters.
- applied: `surface-set-without-its-predicate` — `core/gates/**` watch via the new `postState`
  key: the key and the predicate that reads it land together (default `[]`, absent is legal,
  non-zero exit aborts the archive), so no input set is introduced without the rule that
  consumes it.
- applied: `recompute-beats-recorded-state` — the published projection is REGENERATED inside the
  close and compared against a fresh regeneration in the floor, never checked against a stored
  number; that is this record's rule, and it is why the floor line changed from "does not move"
  to "matches a fresh regeneration".
- applied: `state-model-before-mechanism` — §6's transition table is the state model and it is
  written before the mechanism: every point in the close names artifact status, location, lease
  state and the exact retry, including the archive-abort path FR-1 adds.
- reviewed: `locks-on-main-not-worktree` — FR-3 commits the lease deletion on `merge.baseDir`,
  the main checkout, never in an ephemeral worktree; that is the placement this record requires,
  and the teardown it warns about orphaning is the one FR-3 records.
- applied: `cleanup-after-verified-merge` — FR-3 places the lease-deletion commit AFTER the
  post-merge gates pass, which is exactly this record's rule: the teardown lands only once the
  merge is verified, so a failed post-merge leaves the claim intact for the retry.
- applied: `known-red-ledger-must-expire` — FR-5 deletes the two known-red entries in the change
  that fixes them; the harness fails on a known-red assertion that passes, so neither entry can
  outlive its defect.
- applied: `turbo-cache-masks-out-of-input-reads` — the corpus predicate check reads
  `_state/prds.json`, which is not an input of any package task, so running it as a turbo test
  would replay a stale green after the corpus moves. FR-4's §11 row runs it directly, uncached,
  as a repo-class script; the fixture-based half stays a normal test because it reads nothing
  outside the package.
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
- `packages/provegate/src/core/run/release.ts`
- `packages/provegate/src/core/state/query.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/test/chain.test.ts`
- `packages/provegate/test/cli.test.ts`
- `packages/provegate/test/cli-state.test.ts`
- `scripts/adopter-smoke.sh`
- `scripts/check-implemented-predicate.mjs`
- `apps/docs/content/docs/case-study.mdx`
- `gates.manifest.json`
- `packages/provegate/src/core/gates/manifest.ts`
- `_state/prds.json`
- `STATUS.md`
- `_brain/learnings/the-close-must-record-what-it-changed.md`

---

## Durable Artifacts

- `_brain/learnings/the-close-must-record-what-it-changed.md` — every Memory Output above
  repeats here; the two lists are one contract and Phase 7 refuses when they disagree
- ADR: `none`

---

## 11. Verification Commands

| FR   | Command / Check                | Scope              | Notes                                             |
| ---- | ------------------------------ | ------------------ | ------------------------------------------------- |
| FR-1 | `pnpm test --filter provegate` | chain.test.ts      | both artifacts carry the normalized terminal value; the archive commit carries the regenerated state |
| FR-1 | `pnpm test --filter provegate` | chain.test.ts      | two status lines, and zero, each refuse with neither file modified |
| FR-2 | `pnpm test --filter provegate` | chain.test.ts      | already-terminal is a no-op and the run continues  |
| FR-3 | `pnpm test --filter provegate` | cli.test.ts        | tracked lease deletion committed on the base; tree clean afterwards |
| FR-3 | `pnpm test --filter provegate` | cli.test.ts        | untracked, absent, and recreated-by-another-claim each behave as §4 states |
| FR-3 | `pnpm test --filter provegate` | cli.test.ts        | a failing commit hook exits 1, prints the hook output verbatim, and names the path-scoped `git commit` retry; a follow-up run of that exact command lands the deletion |
| FR-4 | `node scripts/check-implemented-predicate.mjs` | repo corpus | runs UNCACHED and outside turbo (it reads `_state/prds.json`, which is not a package input — `turbo-cache-masks-out-of-input-reads`): asserts the predicate over every record and that `PRD-023` is false; prints the counts without pinning them |
| FR-4 | `pnpm test --filter provegate` | cli-state.test.ts | fixture record with completed location, present summary and a non-implemented status is NOT implemented |
| FR-4 | `pnpm verify:doc-claims`       | published figures  | the published figure matches the regenerated projection after the close (38 once this item lands) |
| FR-1 | `pnpm test --filter provegate` | chain.test.ts      | the archive commit contains the status writes, the regenerated state, then whatever `postState` wrote, in that order |
| FR-1 | `pnpm test --filter provegate` | chain.test.ts      | an absent and an empty `postState` are both no-ops (the adopter case), and `phases['7']` commands keep their existing timing |
| FR-1 | `pnpm test --filter provegate` | chain.test.ts      | a failing `postState` command aborts the archive: pre-archive paths, bytes and staging restored, no commit, command and output named |
| FR-5 | `pnpm verify:deferred`         | board              | the closed row is gone, cap arithmetic holds       |
| FR-5 | `pnpm smoke:adopter`           | adopter fixture    | both known-red entries gone, run green             |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm verify:doc-claims` — the committed projection matches a fresh regeneration

Before Phase 2 PASS, run: `gate check PRD-041`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT hardcode `Ship Verified`; call `normalizeStatus(config.statusVocab, 'complete')` — there is no `statusVocab.complete` field to read.
- DO NOT write the status at merge time, where an auto-revert would silently undo it.
- DO NOT add a second status-line regex; use the reader the state builder already uses.
- DO NOT add a code path that pushes to a git remote, in the CLI or in CI.
- DO NOT add a runtime dependency to `packages/provegate`, or any telemetry or network call.
- DO NOT bypass a hook with `--no-verify`, and never swallow a hook's output.
- DO NOT introduce method content that does not trace to the source snapshot or an addendum.

---

## Changelog

| Date       | Author | Changes                                                          |
| ---------- | ------ | ---------------------------------------------------------------- |
| 2026-08-07 | owner  | Initial draft — from the first external adopter run, both defects measured |
| 2026-08-07 | owner  | Iteration 1 rework (Codex 6.2 ITERATE): `statusVocab.complete` does not exist — the terminal value now comes from `normalizeStatus(config.statusVocab, 'complete')` (`state/status.ts:28`), with both artifacts prevalidated before either is written and already-terminal an explicit no-op rather than a refusal; §6 gained the archive/merge/post-merge transition table with lease state and the exact retry command; FR-3 pinned to `merge.baseDir` after post-merge and before handoff, under the claim mutex, with five cases incl. a lease recreated by another claim; FR-4 removes BOTH fallbacks (location and summary presence); §7 carries the measured counts (39→38 implemented, Ship Verified 37 unmoved) and §11 asserts the predicate itself, not only the published figure; Migration & Rollback added; scope, surface, test paths and the project-wide DO NOTs corrected |
| 2026-08-07 | owner  | Iteration 2 sweep (Codex 7.8 ITERATE; 6.2→7.8, four items closed): the `statusVocab.complete` correction had not swept into Memory Inputs or §12 — same restatement failure the record warns about, now fixed in all three places; §6's merge-failure and auto-revert rows split into feature-ref and base-ref states and the resume recipe spelled out instead of cited; FR-3's commit-hook case now names exit 1, the verbatim hook output and `gate release` as the retry, with its own §11 row; §11's `gate queue --json` row replaced by a named corpus test that calls `isImplemented` and pins 38 with PRD-023 proven false |
| 2026-08-07 | owner  | Iteration 3 (Codex 7.6, down from 7.8 — the regression was the author's): last round's hook retry named `gate release`, which DROPS a lease and cannot commit a deletion of a lease already gone; replaced by the exact path-scoped `git commit -- <lease path>`, with a §11 row proving the retry lands. Every archived-state retry corrected to un-archive-AND-COMMIT then `--from-phase=7`, with the reason named (`shouldSkipGate` keeps the memory gates, which read `wip` paths). The absolute counts became a dated baseline: this item's own close makes them 39/38, so §11 asserts the PREDICATE and `PRD-023` being false instead of pinning a number, via a direct uncached repo-class script that reads `_state/prds.json` outside turbo |
| 2026-08-07 | owner  | Iteration 4 (Codex 7.9, one tenth under PASS; five of eight items closed): `PRD-023`'s summary is MISSING, not present — measured from `artifactStates` — so it is false on the location fallback alone; the published `Ship Verified` figure moves to 38 with this item's own close, so the projection is regenerated INSIDE the close (`derive-self-hosting-figures.mjs --write` → `case-study.mdx`) in a stated order (state → projection → commit) and both files joined Targets, Scope and the Conflict Surface; the lifecycle is stated for every later automatic terminal write, not only this one; `cleanup-after-verified-merge` and `known-red-ledger-must-expire` dispositioned |
| 2026-08-07 | owner  | Iteration 5 (Codex 7.9, flat): the scorer refused the projection design and was right — the previous round put `derive-self-hosting-figures.mjs`, a command named after THIS repository's case study, inside the lifecycle of a CLI whose motivating scenario is a fresh adopter. Replaced by the configured `manifest.phases['7']` hook, run after the state regeneration and before the commit, with an empty list a legal no-op; this repository's hook moves into `gates.manifest.json`, which joins the Conflict Surface, and the shipped runner stays repo-agnostic |
| 2026-08-07 | owner  | Iteration 6 (Codex 7.8; the hardcode and empty-list findings CLOSED): the hook is now a NEW `manifest.postState` key rather than a replay or relocation of `phases['7']` — an adopter's existing phase-7 gates keep their meaning and timing, which a replay would have silently changed. Failure is atomic (pre-archive paths, bytes and index staging restored, no commit, command and output named) and output discovery is `git status --porcelain` after the hook, so the runner never guesses which files a projection touches. `_state/prds.json`, `manifest.ts`, `cli.ts::runRun` and the projection file joined Targets, Scope and Conflict Surface; the floor line became "the committed projection matches a fresh regeneration" (`recompute-beats-recorded-state`); four dispositions added — `surface-set-without-its-predicate`, `recompute-beats-recorded-state`, `state-model-before-mechanism`, `locks-on-main-not-worktree` |

