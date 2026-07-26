# PRD-022: Control-Artifact Revalidation Beyond the Claim

> **Status**: Approved
>
> **Created**: 2026-07-25
> **Updated**: 2026-07-25
> **Author**: Cursor, for owner review
> **Audience**: Implementing Agent
> **Slug**: `control-artifact-revalidation`
> **Cycle Phase**: 3 (Task Generation)
> **PRD Class**: infra
> **Class Rationale**: This changes when the runner validates gate policy in an existing
> worktree; it is workflow tooling, not application behavior.
> **Autonomous Close**: operator-gated
> **Value**: 3.60 (MF/UI/TL/AR/RM: 4/3/4/3/4)

<!-- 0.25*4 + 0.25*3 + 0.20*4 + 0.15*3 + 0.15*4 = 3.60. -->

---

## 1. Introduction / Overview

A worktree claim validates that the checkout carries the same control artifacts as the
base branch. `open.ts` computes `snapshotsNotMatchingRef` and `snapshotsMissingFrom` over
`requiredArtifacts` and refuses a reuse whose checkout has drifted, with a message
telling the operator to merge or rebase first.

That validation runs **only on the claim path**. Both `gate run` and `gate land` enter
through one function — `runRun()` in `packages/provegate/src/cli.ts`, where `land` is
`runRun(rest, { mergeOnly: true })` — and that function never repeats it. So a lease
taken before a control artifact changed can execute its whole lifecycle — every phase
gate, then the merge — against gate policy the base branch no longer has, and
nothing reports it. The lease is not stale in any way the system can see; it simply never
asks again.

This was found while scoping PRD-018, which introduces two root control artifacts
(`workflow.config.json`, `gates.manifest.json`). PRD-018 states the residual rather than
claiming to close it; closing it is this PRD.

The failure is quiet by construction, which is the argument for fixing it: a worktree
running the previous manifest passes gates the base would now fail, and the merge is
green.

---

## 2. Goals

### Primary Goals

- [ ] Revalidate control artifacts at every gate execution boundary, not only at claim.
- [ ] Refuse with the same message and the same remedy the claim path already uses.
- [ ] Change nothing for a worktree whose artifacts match the base — the common case
      stays silent and adds no measurable time.
- [ ] Leave non-worktree flows exactly as they are.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Command boundaries that revalidate control artifacts | 1 (claim) | 3 (claim, `run`, `land`) | CLI fixture per boundary |
| Drifted worktree reaching a green merge | possible | refused | drift fixture driving the built CLI |
| Added validation cost on a matching worktree | n/a | one `git` hash comparison per control artifact | the two artifacts are re-hashed once per invocation |
| Behavior change for non-worktree leases, dry runs, and read-only commands | n/a | none | unaffected-by-drift fixture |

---

## 3. User Stories

#### User Story 1

```
As an agent working in a long-lived worktree,
I want the runner to tell me when the base's gate policy has moved,
so that I cannot pass gates the base branch would fail.
```

**Acceptance Criteria:**

- [ ] `gate run` refuses when a control artifact in the checkout differs from the base,
      naming the artifact and the merge-or-rebase remedy.
- [ ] The refusal happens before any phase command executes, not after a partial run.

#### User Story 2

```
As an owner landing work,
I want the merge to re-check policy provenance,
so that a green chain recorded under old policy cannot become a merge.
```

**Acceptance Criteria:**

- [ ] `gate land` refuses on drift with the same message shape as the claim path.
- [ ] A worktree whose artifacts match the base is unaffected in behavior and output.

---

## 4. Functional Requirements

1. **FR-1 — One primitive that both derives the artifact set and decides drift.** The
   claim path inlines this decision across two places: `open.ts` builds `requiredArtifacts`
   locally (the PRD blob, plus `CONFIG_FILENAME` and `MANIFEST_FILENAME` when each is
   present in the checkout **or** on the pinned base ref, hashed from the bytes
   `configSourceFor`/`manifestSourceFor` actually parsed) and then reduces
   `snapshotsNotMatchingRef` + `snapshotsMissingFrom` over it. Those two helpers are
   snapshot comparators, **not** the decision — the derivation is the half that has no
   owner, and it is the half `gate run` needs, because **the lease persists no snapshot
   to read back**. Export one function that, given a checkout root and a base ref:
   - derives the control-artifact set the same way `open.ts` does — the union of present
     in the checkout and present on the base ref, so a **local deletion of a file still
     committed on base is drift, not an omission**, and a file **newly added on base** is
     drift even though the checkout never had it;
   - hashes the bytes the loaders parsed, not a later re-read, so an edit between parse
     and comparison cannot slip through;
   - pins **one** base revision per invocation via `mainRepoRoot(root)` +
     `resolveRef(...)`, so a concurrent base advance cannot desynchronize two comparisons
     inside the same check;
   - **fails closed** when a control file is unreadable or unparseable — unknowable
     policy refuses, exactly as the claim path does;
   - returns the deduplicated drifted list plus the formatted refusal core (FR-3).

   Name it `revalidateControlArtifacts` and give it this shape, so the two call sites
   cannot drift apart in their inputs either:

   ```
   revalidateControlArtifacts(input: {
     root: string;              // the checkout under validation
     config: WorkflowConfig;
     relPath: string;           // worktree path, for the refusal text
     branch: string;            // branch name, for the remedy
     baseRef?: string;          // an already-pinned revision; resolved internally if absent
     extra?: ArtifactSnapshot[];// claim path passes the PRD blob; run/land pass nothing
   }): { drifted: string[]; refusal: string | null }
   ```

   `cli.ts` imports from `./core/run/index.js` only, so the primitive MUST be re-exported
   there — a direct reach into `run/worktree.js` from the CLI would be the first such
   import in the file. The claim path passes its already-pinned `baseRefName` rather than
   letting the primitive resolve a second one, so one claim never compares against two
   revisions.

   **Order is part of the contract, because FR-3 promises byte-identical claim refusals**
   and the refusal is a `', '`-joined list. Reproduce today's order exactly: the artifact
   set is `extra` first (the claim's PRD blob), then `CONFIG_FILENAME`, then
   `MANIFEST_FILENAME`; the drifted list is `snapshotsNotMatchingRef(...)` followed by
   `snapshotsMissingFrom(...)`, deduplicated by **first occurrence**, exactly as
   `open.ts` does today with `.filter((rel, i, all) => all.indexOf(rel) === i)`. A set, a
   sort, or a last-wins dedup would all be defensible and all would change the bytes.

   The **PRD blob is an input, not a constant**: the claim path includes it, and the
   revalidation call sites MUST NOT, or every worktree would refuse the moment its own
   PRD is edited — which is the normal state of a worktree mid-phase. The caller passes
   the extra entries; the primitive never assumes them.
   - **Targets:** `packages/provegate/src/core/run/worktree.ts`,
     `packages/provegate/src/core/run/index.ts`,
     `packages/provegate/src/core/run/open.ts`,
     `packages/provegate/test/revalidate.test.ts`
2. **FR-2 — Revalidate at the one seam both commands share.** The check belongs in
   `runRun()` in `packages/provegate/src/cli.ts`, **after** `worktreeStamps()` returns and
   its malformed-lease refusal has run — so the fail-closed lease parse still comes first
   and `stamps` is known — and **before** `runChain()`. Run the check only when `stamps`
   is non-null. One insertion covers both commands, because `gate land` is the same
   function with `mergeOnly: true`; it precedes every phase command, every chain **metric**
   write, `mergePreconditions`, the archive, and `mergeToLocalBase`. On drift, print the
   refusal through the existing `stopCard` shape and return 1.

   **Precedence, measured rather than assumed.** Three refusals can fire in `runRun()`
   and the order is already fixed by code upstream of this PRD: (1) `loadConfig()` /
   `loadManifest()` throw on an unparseable control file in the checkout — line 627-628,
   before everything; (2) the malformed-lease refusal after `worktreeStamps()`; (3) this
   drift check. Insert at (3) and change neither of the first two. The consequence worth
   stating: in `runRun` the primitive's fail-closed branch is reachable for the
   **base-side** read, not the checkout-side one, because the loaders already covered
   that. The case the loaders do **not** cover is the interesting one — `loadManifest()`
   silently returns `defaultManifest(config)` when the file is merely **absent**, so a
   locally deleted manifest that is still committed on base yields no error at all today.
   That is precisely the drift this check exists to catch, and the fixture must include it.

   One thing does happen before the seam and stays there: `findRecord()` calls
   `buildState` + `writeState`, so `_state/prds.json` is rewritten earlier in `runRun()`.
   That is a **derived snapshot rebuilt from the artifacts on disk** — `gate status`
   writes the identical file — so it records no run and asserts no verdict. Moving the
   check above it would mean resolving the PRD without the state lookup that finds it.
   Accept it and scope the promise accordingly: **no phase command executes and no chain
   metric row is written.**
   - **Targets:** `packages/provegate/src/cli.ts`,
     `packages/provegate/test/revalidate.test.ts`
3. **FR-3 — One canonical refusal, and unchanged bytes where bytes are already promised.**
   The canonical text is the **reuse-path core** `open.ts` emits today: `the checkout at
   <relPath> carries workflow artifacts differing from '<base>' (<list>) — merge or rebase
   <base> into <branch> first`. The primitive formats that core; `open.ts` keeps its
   `claim rolled back: ` prefix and its rollback notes, so the claim refusal stays
   byte-identical. `createWorktree()`'s provisioning message (`these workflow artifacts
   are missing or uncommitted …`) is a **different situation** — fresh provisioning, not
   reuse — and is explicitly out of scope; do not unify it. Assert the claim-path bytes
   before and after the extraction.
   - **Targets:** `packages/provegate/src/core/run/worktree.ts`,
     `packages/provegate/test/revalidate.test.ts`
4. **FR-4 — Prove it at the CLI, not at the function.** The existing suites cannot prove
   this: `chain.test.ts` calls `runChain()` directly in non-git temp roots and
   `merge.test.ts` calls `mergeToLocalBase()` directly, so neither can show that the
   **command** stopped. A new fixture drives the **built CLI** (`dist/cli.js`, as
   `cli-state.test.ts` does) against a real git repo with a real linked worktree. The file
   is new, created by this PRD; its §11 rows go green when FR-1 and FR-2 land, which is
   the normal state of any test written alongside its feature. Construction, so it is
   buildable rather than merely described:
   - `mkdtempSync` + `git init`, commit `workflow.config.json`, `gates.manifest.json`, and
     a PRD/readiness/tasks trio on the base branch — the same seeding shape
     `cli-state.test.ts` uses, plus git;
   - set the manifest's phase command to an **observable no-op** rather than a real gate:
     `node -e "require('fs').writeFileSync('ran.txt','1')"`. `node ` is in
     `commands.allowedPrefixes`, and the marker file makes “no phase command executed” a
     file-existence assertion instead of an inference from stdout;
   - claim with `gate open --worktree` through the built CLI so the lease carries real
     stamps rather than hand-written ones;
   - advance the base with a second commit editing `gates.manifest.json`;
   - assert on independent evidence: the marker file, the metrics rows, `git log` on base
     for the merge commit, and `git log` on the branch for the archive commit.

   Assertions:
   - drift: base advances a control artifact → `gate run` exits non-zero, names the
     artifact, and leaves **no marker file and no chain metric row**;
     `gate land` exits non-zero and creates **neither an archive commit nor a merge
     commit**;
   - deletion: `gates.manifest.json` removed from the checkout while still committed on
     base → refused, not silently run against `defaultManifest()`;
   - precedence: a malformed lease still refuses with the malformed-lease message even
     when the checkout has also drifted, and an unparseable local manifest still refuses
     at the loader — the drift check preempts neither;
   - recovery: after merging base into the branch, both proceed;
   - unaffected, stated as concrete observables rather than a pre-PRD stdout baseline
     (which is not mechanically obtainable): under the same drift, `gate check`,
     `gate status`, and `gate queue` exit 0 and print no refusal text; `gate run
     --dry-run` still prints its plan and exits 0; a lease with no worktree stamps runs
     its chain normally.
   - **Targets:** `packages/provegate/test/revalidate.test.ts`
5. **FR-5 — Say when the check does not apply, and assert the words exist.** Document
   three exclusions in the method docs: a direct `git merge` bypasses the runner entirely;
   `check`, `status`, and `queue` do not check by design (§9 Q2); and `--dry-run` plans
   without checking. State all three rather than implying completeness — PRD-018's
   residual was created by a claim wider than the mechanism. Prove it with an assertion
   that **reads `apps/docs/content/docs/method.mdx` directly**; `content-launch.test.ts`
   never opens that page, so pointing at it would be a green that proves nothing.
   - **Targets:** `apps/docs/content/docs/method.mdx`,
     `packages/provegate/test/revalidate.test.ts`

---

## 5. Non-Goals (Out of Scope)

- Making the pre-commit hook cover merges, or any git-level enforcement.
- Adding new control artifacts, or changing which files are control artifacts.
- Auto-merging or auto-rebasing a drifted worktree on the agent's behalf.
- Any change to the memory contract, the value-score gate, or lease TTL semantics.
- Non-worktree `gate open` flows.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a worktree whose `gates.manifest.json` differs from the base, **When**
  `gate run` starts, **Then** it refuses before the first command, naming the artifact.
- **Given** the same worktree, **When** `gate land` runs, **Then** it refuses before any
  merge step.
- **Given** the base is merged into the branch, **When** either command runs again,
  **Then** it proceeds normally.
- **Given** a worktree whose artifacts match the base, **When** either command runs,
  **Then** it exits 0, prints no refusal, and performs its normal work.
- **Given** a lease with no worktree stamps, **When** either command runs, **Then**
  nothing changes.
- **Given** a drifted worktree, **When** `gate check`, `gate status`, or `gate queue`
  runs, **Then** each exits 0 and prints no refusal.
- **Given** a drifted worktree, **When** `gate run --dry-run` runs, **Then** it prints
  the plan and exits 0 — a plan executes nothing.

---

## 7. Technical Considerations

### Architecture

- One decision, two call sites — not three. `gate run` and `gate land` share `runRun()`,
  so the second boundary is one insertion, not two; `chain.ts` and `merge.ts` are never
  touched. That is why this PRD is small.
- The derivation, not the comparison, is the thing being extracted. `snapshotsNotMatchingRef`
  and `snapshotsMissingFrom` are already shared; what only `open.ts` knows is **which**
  artifacts to compare and **which bytes** count as their content.
- The check is a hash comparison against a pinned base ref: one `git` read per control
  artifact, no network, no cache, nothing persisted.
- Refusing before execution matters more than refusing accurately after: a partial chain
  run leaves recorded state that a later reader treats as evidence.
- The seam sits after the fail-closed lease parse, so an unreadable lease still refuses
  first — drift is a narrower problem than unknowable ownership and must not preempt it.

### Dependencies

- **PRD-018 must be Ship Verified before this PRD is claimed — a blocking prerequisite,
  not a preference.** Two reasons, and the second is the binding one. It introduces the
  root control artifacts that make this hole reachable at all; and it holds
  `apps/docs/content/docs/method.mdx` in its Conflict Surface, which this PRD also claims
  (see below). Sequencing is what keeps the two leases from ever being active together —
  there is no merge story for a concurrent claim, only a refusal.
- **PRD-019 must also be Ship Verified first**, for the same reason and no other: it
  claims `packages/provegate/src/cli.ts` to add `gate doctor`. There is no design
  coupling — that PRD adds a subcommand, this one adds a check inside `runRun()` — only
  a file both must write.
- No new runtime dependencies.

### Rollback

- Revert the two call sites; FR-1's extraction can stay because it is behavior-preserving.
  No state, cache, or artifact migration exists.

---

## 8. Implementation Scope

### In Scope

- [ ] `run/worktree.ts` — the extracted derive-and-decide primitive
- [ ] `run/index.ts` — re-export it; `cli.ts` imports from the barrel only
- [ ] `run/open.ts` — call the primitive; claim refusal stays byte-identical
- [ ] `cli.ts` — the single new call site in `runRun()`, covering `run` and `land`
- [ ] `test/revalidate.test.ts` — new: built-CLI drift, recovery, and unaffected fixtures
- [ ] `apps/docs/content/docs/method.mdx` — the three stated exclusions

### Explicitly not touched

- `run/chain.ts` and `run/merge.ts` — the shared seam is upstream of both.
- `test/{chain,merge,open,content-launch}.test.ts` — all new assertions land in the new
  file, which also keeps this PRD out of PRD-018's test surface.

---

## 9. Open Questions

(none) — both resolved by owner on 2026-07-25.

**Q1 resolved — `gate run` refuses.** A warning that lets the run continue produces a
recorded green chain under policy the base no longer has, which is the defect this PRD
exists to close, not a softer version of it. The cost is real — an agent mid-phase is
stopped — and it is paid deliberately: the remedy is one merge command and the refusal
states it.

**Q2 resolved — narrow.** Only the two commands that execute and merge check. Turning
`check`, `status`, and `queue` into refusing commands would block the operator at exactly
the moment they are trying to diagnose why something is broken, and a read-only command
that refuses is worse than one that reports. Read-only commands stay silent about drift;
FR-5 documents that as a stated boundary rather than an omission.

---

## 10. References

- PRD-018 FR-6 — states this residual and names this PRD as the closer
- `packages/provegate/src/core/run/open.ts` — the existing reuse-path validation
- PRD-018 readiness W12: `_readiness/wip/readiness-018-memory-contract-enforcement.md`

---

## Conflict Surface

- `packages/provegate/src/core/run/worktree.ts`
- `packages/provegate/src/core/run/index.ts`
- `packages/provegate/src/core/run/open.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/test/revalidate.test.ts`
- `apps/docs/content/docs/method.mdx`

**Two paths here overlap other PRDs, and both are claimed rather than excused.**
`gate queue` reports them:

- `apps/docs/content/docs/method.mdx` — also PRD-018's.
- `packages/provegate/src/cli.ts` — also PRD-019's, which adds the `gate doctor`
  subcommand. Different regions of the same file, but it is modify-in-place, not
  append-only, so it is not union-mergeable and the lock gate is right to refuse.

Declaring both exclusively is deliberate: it makes the lock gate refuse if any two of
these leases are ever active together, which is the outcome we want. This PRD is late in
the wave (017 → 018 → 019 → 021 → 020 → **022** → 023), so sequencing already resolves
both; the exclusive claim is what makes a mistake in that ordering visible instead of
quiet.

**That order is a valid serialization, not a required one.** `gate queue` on 2026-07-25
reports no intersection between PRD-020's Conflict Surface and this one, so once PRD-019 is
Ship Verified PRD-020 may run **concurrently with this PRD**. PRD-021 may not: it also
claims `packages/provegate/src/cli.ts`, so this PRD and PRD-021 stay serialized in either
order. (PRD-020 may also **not** run concurrently with PRD-023 after that PRD's scope
expansion — re-run the queue rather than carrying this sentence forward.)
An earlier draft listed `method.mdx` as “shared, so not claimed exclusively” — a
preference dressed as a mechanism, which suppressed the only signal that would have
caught it.

Everything else PRD-018 owns — `chain.ts`, `merge.ts`, `open.test.ts`, `merge.test.ts`,
`chain.test.ts` — is outside this PRD's scope entirely, after the seam moved to
`cli.ts`. PRD-020 and PRD-021 have no overlap with any path above.

---

## Memory Inputs

- applied: `locks-on-main-not-worktree` — revalidation reads control artifacts and leases
  from the MAIN checkout while running inside a worktree; resolving the wrong root is the
  defect this record names, and this PRD's seam is exactly where it would recur.
- applied: `absence-must-be-asserted` — the fixture is negative evidence throughout ("no
  marker file", "no merge commit"), and each needs an explicit assert-absent rather than a
  grep that passes because it found nothing.
- applied: `turbo-cache-masks-out-of-input-reads` — FR-5's assertion reads
  `apps/docs/content/docs/method.mdx` from inside the package test task, which is the
  out-of-input read this record describes; it must be a declared input or a cached green
  replays over it.
- applied: `fresh-worktree-env-gap` — the fixture runs the built CLI inside a linked
  worktree, which inherits no root `.env*` and (measured this session) no `node_modules`
  either.
- applied: `cleanup-after-verified-merge` — a revalidation that tears down on a stale
  reading would destroy work a failed merge should have preserved.
- applied: `fixture-must-reach-production-shape` — PRD-019's lease fix shipped broken
  because its tests called the function with cleaner arguments than the caller does. This
  PRD touches the same teardown path and the record watches `cli.ts`.
- applied: `durable-artifact-must-commit` — the review artifact must be tracked, or the
  close gate fails on work that is otherwise correct.
- applied: `assert-absent-needs-an-independent-cause` — written BY this PRD at Phase 7 and
  applied back to it: the fixture's assert-absent steps were re-anchored on the refusal's
  own text after a mutation check found one passing with the feature removed.
- applied: `strictness-added-during-extraction-is-a-behavior-change` — also written by this
  PRD, and applied to it: the fail-closed guard added inside the extracted primitive was
  reverted rather than having the caller's test adjusted around it.
- reviewed: `conflict-check-independent-of-override` — revalidation reads the declared
  surface, never a caller override, or a refreshed claim can widen itself.
- reviewed: `operator-acceptance-no-self-accept` — this PRD is operator-gated and the
  agent never signs its own row.

## Memory Outputs

- learning: `_brain/learnings/assert-absent-needs-an-independent-cause.md` — a negative
  assertion is evidence only when the absence has a different cause than the defect under
  test; the mutation check is what tells the two apart.
- learning: `_brain/learnings/strictness-added-during-extraction-is-a-behavior-change.md` —
  a fail-closed guard added while extracting shared logic relocates a decision the callers
  already owned; the callers' existing tests are the spec.

Appended during Phase 7 under the escape hatch this section opened at Phase 1 ("append an
exact learning path only if the drift cases expose a non-derivable trap"). Both were found
by measurement during implementation, not anticipated: the first by a mutation check that
left a test green, the second by an existing test refusing a change that looked safer.

---

## Durable Artifacts

- Method docs: `apps/docs/content/docs/method.mdx`
- Review: `_docs/reviews/review-022-control-artifact-revalidation.md`
- `_brain/learnings/assert-absent-needs-an-independent-cause.md` — every Memory Output
  repeats here; the two lists are proved against the same merge diff.
- `_brain/learnings/strictness-added-during-extraction-is-a-behavior-change.md`

---

## 11. Verification Commands

| FR   | Command / Check                                              | Scope | Notes |
| ---- | -------------------------------------------------------------- | ----- | ----- |
| FR-1 | `pnpm --filter provegate test test/revalidate.test.ts`         | pkg   | derivation covers deleted-locally and added-on-base; unreadable fails closed |
| FR-2 | `pnpm --filter provegate test test/revalidate.test.ts`         | pkg   | run and land both refuse at the shared seam, before any command or merge |
| FR-3 | `pnpm --filter provegate test test/open.test.ts`               | pkg   | claim-path refusal bytes unchanged by the extraction |
| FR-4 | `pnpm --filter provegate test test/revalidate.test.ts`         | pkg   | drift, recovery, and the unaffected set (read-only commands, dry run, unstamped lease) |
| FR-5 | `pnpm --filter provegate test test/revalidate.test.ts`         | pkg   | method.mdx is read directly and carries all three exclusions |

The FR rows drive the **built** CLI, so `pnpm build` must precede them; the root
`pnpm test` already depends on `build` through turbo, and the floor below runs both.
FR-3 reads `open.test.ts` without writing it — the assertion is that the existing
claim-path expectations still pass unchanged.

Cross-cutting floor:

- `pnpm check-types`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm verify:workflow`

Before Phase 2 PASS, run: `gate check PRD-022`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT let the call sites hold separate definitions of drift; one primitive derives the
  artifact set and decides.
- DO NOT include the PRD blob in the revalidation artifact set; a worktree edits its own
  PRD as normal work, and checking it would refuse every mid-phase run.
- DO NOT read a persisted snapshot at `run`/`land` time — the lease stores none. The
  set is re-derived at the moment of the check.
- DO NOT put the check in `chain.ts` or `merge.ts`; both commands share `runRun()`, and
  two insertions would be two behaviors.
- DO NOT change claim-path behavior while extracting it — FR-1 is a refactor.
- DO NOT refuse after executing part of a chain; the check precedes the first command.
- DO NOT auto-merge or auto-rebase a drifted worktree.
- DO NOT claim the runner now prevents policy drift; a direct `git merge` still bypasses
  it, and FR-5 exists to say so.
- DO NOT extend the check to `check`, `status`, or `queue`; the owner scoped it to the
  executing and merging commands, and a refusing diagnostic command is a worse failure
  than a silent one.
- DO NOT downgrade the `gate run` refusal to a warning; a continued run records a green
  chain under stale policy.
- DO NOT let the drift check preempt either refusal that already precedes it: the loader
  errors on an unparseable control file, then the malformed-lease refusal, then drift.
- DO NOT reorder or re-dedup the drifted list while extracting it; the claim refusal's
  bytes are a promise, and the list is joined into them.
- DO NOT unify `createWorktree()`'s provisioning message with the reuse refusal; they
  describe different situations.
- DO NOT claim PRD-022 while any PRD-018 lease is active — they share `method.mdx`, and
  PRD-018 must be Ship Verified first.

---

## Changelog

| Date       | Author | Changes |
| ---------- | ------ | ------- |
| 2026-07-25 | Claude Opus 5, on owner direction | Sequencing footnote only, no FR or Target change. PRD-023's scope expansion created a PRD-020 ↔ PRD-023 overlap on `packages/provegate/test/pack-manifest.json`, so the note here now says PRD-020 may run concurrently with **this** PRD but not with PRD-023 |
| 2026-07-25 | Claude Opus 5, via owner | Sequencing note only — no FR, Target, Conflict Surface entry, dependency, or verification command changed, and the readiness verdict is untouched. The wave-order sentence now records that the chain is a valid serialization rather than a required one: `gate queue` measures PRD-020 as overlapping PRD-019 alone, so PRD-020 may run concurrently with this PRD. PRD-021 may not — the shared `cli.ts` claim keeps that pair serialized in either order. The chain also gains its missing PRD-023 tail |
| 2026-07-25 | Cursor | Phase 3. `gate queue` surfaced a second Conflict Surface overlap the readiness rounds had all missed: PRD-019 also claims `packages/provegate/src/cli.ts`, for `gate doctor`. No design coupling, just a shared modify-in-place file — PRD-019 joins PRD-018 as a Ship-Verified prerequisite, and the “one overlap” claim is corrected |
| 2026-07-25 | Cursor | Readiness iteration 3 (7.55, ITERATE) resolved. W6: `extra` now has explicit ordered-union and first-occurrence dedup semantics — without them FR-3's byte-identical promise is unmeetable, since the drifted list is joined into the refusal text. W8: the precedence claim is corrected against the code — `loadConfig`/`loadManifest` already throw at cli.ts:627-628, above the lease parse, so this PRD inserts third and changes neither. That surfaced the sharpest case for the feature: `loadManifest()` falls back to `defaultManifest()` when the file is merely absent, so a locally deleted manifest still committed on base produces no error today. Added to the fixture |
| 2026-07-25 | Cursor | Readiness iteration 2 (7.43, ITERATE) resolved. W6: the primitive is named `revalidateControlArtifacts`, given a signature, and re-exported from `run/index.ts` — `cli.ts` imports from the barrel only, so without that the call site could not reach it. W7: the ordering promise is corrected — `findRecord()` rewrites `_state/prds.json` before the seam, so the guarantee is no phase command and no chain metric row, and the PRD says why moving the check above it is not possible. W4: the fixture is now constructible, with an observable no-op phase command (`node -e` writing a marker) so “nothing executed” is a file assertion rather than an inference |
| 2026-07-25 | Cursor | Readiness iteration 1 (6.33, ITERATE) resolved. W2 was the load-bearing one and it moved the whole design: both commands enter through `cli.ts::runRun`, so the named `chain.ts`/`merge.ts` seams were wrong and the fix is **one** insertion, not two. That shrank the Conflict Surface to a single real overlap with PRD-018 (`method.mdx`), now claimed exclusively instead of excused as shared. W1: FR-1 specifies the derivation — union of checkout and base presence, parsed bytes, one pinned ref, fail-closed — and states that the lease persists no snapshot and that the PRD blob is excluded. W3: the reuse-path core is canonical; `createWorktree()`'s message stays. W4: all proof moves to a new built-CLI fixture, `test/revalidate.test.ts`, because `chain.test.ts` and `merge.test.ts` call functions rather than commands, and `content-launch.test.ts` never opens `method.mdx`. W5: PRD-018 Ship Verified is now a blocking prerequisite |
| 2026-07-25 | owner  | Q1 and Q2 resolved: `gate run` refuses rather than warns, and the check stays narrow to the executing and merging commands. FR-4 gains an unaffected-by-drift assertion for the read-only commands so the narrow scope is tested, and FR-5 documents all three boundary conditions |
| 2026-07-25 | Cursor | Initial draft. Scoped out of PRD-018 by owner decision after readiness iteration 5 measured PRD-018's convergence claim as false: control artifacts are revalidated only on the claim path, so `gate run` and `gate land` in an existing worktree never re-check them |
