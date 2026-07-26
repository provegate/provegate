# Tasks: Control-Artifact Revalidation Beyond the Claim

> **PRD**: [prd-022-control-artifact-revalidation.md](../../_prds/wip/prd-022-control-artifact-revalidation.md)
> **Readiness**: [readiness-022-control-artifact-revalidation.md](../../_readiness/wip/readiness-022-control-artifact-revalidation.md)
> **Status**: Not Started
> **Readiness Score**: 9.10/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-25
> **Updated**: 2026-07-25

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- Phase 4 agents hold a valid PRD-022 lock lease before editing implementation files or
  this ledger.
- Autonomous Close is **operator-gated**: the merge gate refuses until an owner-signed
  acceptance entry exists (this PRD adds a refusal an in-flight agent can hit).
- No sub-task may introduce `any`, a lint bypass, a swallowed failure, a runtime
  dependency, a network call, or a push code path.

---

## Memory Context

Records to open and confirm still accurate before the dependent task starts (task 0.4).

- `turbo-cache-masks-out-of-input-reads` — binds directly: FR-5's assertion reads
  `apps/docs/content/docs/method.mdx` from inside the provegate package's test task,
  which is exactly the out-of-input read that record describes. See task 5.4.
- `absence-must-be-asserted` — the whole fixture is negative evidence ("no marker file",
  "no merge commit"). Each needs an explicit assert-absent, not a passing grep.
- `locks-on-main-not-worktree` — leases live on the main checkout; the seam runs from
  inside the worktree and must resolve the main root to read them.
- `fresh-worktree-env-gap` — a linked worktree does not inherit the root `.env*`; the
  fixture runs the built CLI inside one.
- `durable-artifact-must-commit` — the review artifact must be tracked, not left
  untracked, or the close gate fails.
- `operator-acceptance-no-self-accept` — the agent never signs its own acceptance row.

---

## Relevant Files

### The primitive and its exposure

- `packages/provegate/src/core/run/worktree.ts` — `revalidateControlArtifacts`, built
  from the derivation currently inlined in `open.ts` plus the two existing comparators
  (`snapshotsNotMatchingRef`, `snapshotsMissingFrom`) already in this file.
- `packages/provegate/src/core/run/index.ts` — the barrel re-export. `cli.ts` imports
  from here only; without this line the call site cannot reach the primitive.

### The two call sites

- `packages/provegate/src/core/run/open.ts` — the claim path, lines ~305–340
  (`requiredArtifacts` construction) and ~770–790 (the reduce + refusal). Becomes a
  caller; its refusal bytes must not move.
- `packages/provegate/src/cli.ts` — `runRun()`, the single new call site, between
  `worktreeStamps()`'s malformed refusal (~line 676) and `runChain()` (~line 692).
  Covers `gate run` and `gate land` at once, because `land` is
  `runRun(rest, { mergeOnly: true })` (~line 937).

### Proof

- `packages/provegate/test/revalidate.test.ts` — **new**. Real git repo, real linked
  worktree, the built `dist/cli.js` driven as a subprocess. Every FR proof lands here.
- `packages/provegate/test/open.test.ts` — **read, not written**. FR-3's authority is
  that its existing claim-path expectations still pass unchanged.

### Documentation

- `apps/docs/content/docs/method.mdx` — the three stated exclusions. Shared with
  PRD-018's Conflict Surface, which is why task 0.2 is a hard stop.

### Notes

- `packages/provegate/src/core/run/chain.ts` and `merge.ts` are **not** touched. If a
  sub-task starts editing either, the seam has been misplaced — re-read PRD §7.
- The fixture drives `dist/cli.js`, so a stale build produces a confusing red. Build
  before running the scoped FR rows; `pnpm test` gets it free through turbo.

---

## Tasks

- [x] 0.0 Pre-flight and ownership
  - [x] 0.1 Claimed with `gate open PRD-022 --worktree` — 6 surface globs; branch
        `feat/prd-022-control-artifact-revalidation`, worktree
        `.worktrees/prd-022-control-artifact-revalidation`. The checkout needed
        `pnpm install` before anything ran: a linked worktree inherits no `node_modules`,
        which is `fresh-worktree-env-gap` one step further than that record states.
  - [x] 0.2 **Hard stop** cleared: PRD-018 and PRD-019 both read `Ship Verified` and
        neither holds a lease — the only lock present is this PRD's own. Original text: — confirm `_state/prds.json` records **both PRD-018 and PRD-019**
        as `Ship Verified` and that neither holds an active lease. PRD-018 shares
        `apps/docs/content/docs/method.mdx`; PRD-019 shares
        `packages/provegate/src/cli.ts` (it adds `gate doctor`). The claim in 0.1 will be
        refused while either is active, and that refusal is the intended behavior, not an
        obstacle to work around.
  - [x] 0.2.1 `gate queue` reports one overlap for this item, `PRD-022 <-> PRD-023` on
        `cli.ts`, which this plan does name. PRD-019's collision is gone: it landed.
        Original text: and read the overlap block before claiming. If it reports
        an overlap this plan does not name, stop and re-check the Conflict Surface — the
        PRD-019 collision was found this way, after four readiness rounds missed it.
  - [x] 0.3 Both control artifacts exist at the repo root, introduced by PRD-018's
        activation. Original text: at the repo root
        (`workflow.config.json`, `gates.manifest.json`). PRD-018 introduces them; without
        them this PRD's drift cases are unreachable in the live repo, though the fixture
        creates its own.
  - [x] 0.4 All six read; all six still accurate and `status: active`. **This found a real
        inconsistency I introduced**: the PRD's `## Memory Inputs` section was written
        during the activation sweep from a `gate memory find` pass over the Conflict
        Surface, WITHOUT reading this plan's Memory Context — so it named four records and
        the plan named six, overlapping in one. The plan's list was the better-informed
        one, because it was written knowing the tasks. The PRD now declares the union with
        real dispositions, since the PRD is what the gate parses. Recorded in
        **Deferrals & Decisions**.
  - [x] 0.5 All three re-measured and unchanged: `gate land` dispatches to
        `runRun(rest, { mergeOnly: true })` (`cli.ts:1203`); `loadConfig`/`loadManifest`
        run at `cli.ts:847-848`, BEFORE `worktreeStamps` at `896`; and `loadManifest`
        returns `defaultManifest(config)` when the file is absent
        (`gates/manifest.ts:291-295`). FR-2 stands as planned. Original text: the plan rests on and record them, because
        every one of them moved during readiness: `gate land` dispatches to
        `runRun(rest, { mergeOnly: true })`; `loadConfig`/`loadManifest` run before
        `worktreeStamps()`; `loadManifest()` returns `defaultManifest(config)` when the
        manifest file is absent. A different answer to any of these re-opens FR-2 before
        code is written.
  - [x] 0.6 Baseline green: `pnpm test` 899, `verify:workflow` PASS, `check --wiring` ok.
        Original text: for `pnpm test`, `pnpm verify:workflow`, and
        `node packages/provegate/dist/cli.js check --wiring`; a pre-existing red is
        ledgered, never normalized silently.

- [x] 1.0 FR-1 — the `revalidateControlArtifacts` primitive
  - [x] 1.1 Added at `worktree.ts:275-380` with the PRD §4 signature, explicit `RevalidateInput`/`RevalidateResult` interfaces, no `any`, `ArtifactSnapshot` unwidened.
        Original: Add `revalidateControlArtifacts` to `packages/provegate/src/core/run/worktree.ts` with the PRD §4 FR-1 signature: `{ root, config, relPath, branch, baseRef?, extra? }` → `{ drifted: string[]; refusal: string | null }`. Explicit types on every field; no `any`, no widening `ArtifactSnapshot`.

  - [x] 1.2 `CONTROL_ARTIFACTS = [CONFIG_FILENAME, MANIFEST_FILENAME]`, each included on `existsSync(local) || existsOnRef(base)`. Unit-covered in both directions: deleted-locally and added-on-base.
        Original: Move the derivation in from `open.ts` unchanged: for each of `CONFIG_FILENAME` and `MANIFEST_FILENAME`, include the artifact when it exists in the checkout **or** on the base ref (`existsSync` OR `existsOnRef`) — the OR is what makes a local deletion drift instead of an omission.

  - [x] 1.3 `configSourceFor`/`manifestSourceFor` → `blobShaOfBuffer`, else `blobShaOfFile`. Nothing is loaded inside the primitive — see the 1.6 finding below, which is where that rule earned its comment.
        Original: Hash the bytes the loaders parsed, not a later re-read: `configSourceFor` / `manifestSourceFor` → `blobShaOfBuffer`, falling back to `blobShaOfFile` when the source is null. Copy `open.ts`'s existing conditional exactly; a re-read reopens the edit-between-parse-and-hash window that comment block was written to close.

  - [x] 1.4 `input.baseRef ?? resolveRef(mainRepoRoot(root), 'refs/heads/<base>') ?? '<name>'` — resolved once, at the top, and reused by every comparison. The claim path passes its own pinned `baseRefName`.
        Original: Pin one base revision per invocation: `mainRepoRoot(root)` + `resolveRef(...)` when `baseRef` is absent; use the caller's `baseRef` when given. Never resolve twice inside one call.

  - [x] 1.5 `extra`, then CONFIG, then MANIFEST; `[...notMatchingRef, ...missingFrom].filter(first-occurrence)`. Mutation-checked: adding `.sort()` fails the order test and nothing else.
        Original: **Order is contractual** (PRD §4 FR-1). Build the set as `extra` first, then `CONFIG_FILENAME`, then `MANIFEST_FILENAME`. Reduce as `[...snapshotsNotMatchingRef(...), ...snapshotsMissingFrom(...)]` deduplicated by first occurrence with `.filter((rel, i, all) => all.indexOf(rel) === i)`. A `Set`, a sort, or last-wins dedup each change the refusal bytes task 2.3 must preserve.

  - [x] 1.6 Fails closed on the ONE case the comparators read as agreement — present but unhashable, with nothing on base to disagree with (`null === null` on both sides). See the finding below: the broader version of this rule was a real behavior change.
        Original: Fail closed on an unreadable or unparseable control file — return a refusal, never an empty `drifted` list. Unknowable policy is not "no drift".

  - [x] 1.7 Core formatted exactly as `open.ts` emitted it; `null` when nothing drifted. Asserted as a whole string, not `toContain`, in the order test.
        Original: Format the refusal core exactly as `open.ts` emits it today: `` the checkout at <relPath> carries workflow artifacts differing from '<base>' (<list>) — merge or rebase <base> into <branch> first ``, list joined with `', '`. Return `null` when nothing drifted, so callers branch on the value rather than on an empty string.

  - [x] 1.8 Re-exported from `core/run/index.ts` with its two types; `grep 'core/run/worktree' src/cli.ts` is empty, so the barrel is still the only path.
        Original: Re-export it from `packages/provegate/src/core/run/index.ts`. Verify by reading `cli.ts`'s import block that the barrel is still the only `core/run` import path in that file.

  - [x] 1.9 Six unit tests in `test/revalidate.test.ts`: match, edited, deleted-locally, added-on-base, unhashable, and the exact three-element drifted ORDER (which also proves first-occurrence dedup, since every entry mismatches on both sides).
        Original: Unit-cover the primitive in `packages/provegate/test/revalidate.test.ts`: matching artifacts → `refusal === null`; edited file, deleted-locally-but-on-base, and added-on-base each → drifted; unreadable → refuses. Assert the exact drifted **order** for a two-artifact case, not just membership — 1.5 is otherwise untested.


- [x] 2.0 FR-3 — claim-path extraction with unchanged bytes
  - [x] 2.1 Captured from a real drift-on-reuse run through `claimPrd` BEFORE any edit, into the scratchpad: `claim rolled back: the checkout at .worktrees/prd-001-baseline carries workflow artifacts differing from 'main' (gates.manifest.json) — merge or rebase main into feat/prd-001-baseline first`.
        Original: Before editing, capture the current claim refusal string from a real drift-on-reuse run and paste it into **Progress Log**. This is the baseline task 2.3 compares against; reconstructing it after the edit proves nothing.

  - [x] 2.2 `open.ts:771-793` now calls the primitive with `extra: prdArtifacts` and `baseRef: baseRefName`. `requiredArtifacts` is still built (provisioning needs the full set) but is no longer the reduce input; the PRD entry was split out into `prdArtifacts` so the primitive re-derives the control files in its own order.
        Original: Replace the inlined reduce in `open.ts` (~lines 770–790) with a call to the primitive, passing the PRD blob as `extra` and the already-pinned `baseRefName` as `baseRef` — the claim must not resolve a second revision.

  - [x] 2.3 Prefix and `rollbackInstalledLease()` notes kept; the issue is now `` `claim rolled back: ${reuse.refusal}` ``. Re-ran the 2.1 scenario after the edit and compared with `cmp`: identical bytes.
        Original: Keep `open.ts`'s `claim rolled back: ` prefix and its `rollbackInstalledLease()` notes at the call site. Diff the emitted string against the 2.1 baseline character for character.

  - [x] 2.4 `createWorktree()`'s provisioning message is untouched — `git diff` on `worktree.ts` shows additions only above `branchAtWorktree`, nothing inside `createWorktree`.
        Original: Leave `createWorktree()`'s provisioning message (`these workflow artifacts are missing or uncommitted …`) alone. It describes fresh provisioning, not reuse; unifying it is a PRD §12 DO NOT.

  - [x] 2.5 `test/open.test.ts` + `test/worktree.test.ts`: 94 passed, both files unmodified (`git diff --stat -- test/` empty). This rule caught a REAL behavior change on the first attempt — see the finding below.
        Original: Run `pnpm --filter provegate test test/open.test.ts` and confirm every existing claim-path expectation passes **unmodified**. If a test needs editing to pass, the extraction changed behavior — revert and redo, do not adjust the test.


- [x] 3.0 FR-2 — the shared `runRun()` seam
  - [x] 3.1 Inserted at `cli.ts:911-941`, after the `leaseState.malformed` refusal (897-907) and after `const stamps = leaseState.stamps` (909), before `runChain` (947). Guarded on `stamps !== null`.
        Original: Insert the call in `packages/provegate/src/cli.ts::runRun`, after the `leaseState.malformed` refusal and after `const stamps = leaseState.stamps`, and before `runChain(...)`. Guard on `stamps !== null`; a lease with no worktree stamps is out of scope.

  - [x] 3.2 `relPath: stamps.worktree`, `branch: stamps.branch`, no `extra` — the PRD blob is deliberately absent, and `test/revalidate.test.ts` proves a worktree that has only edited its own PRD still runs.
        Original: Pass `stamps.worktree` as `relPath` and `stamps.branch` as `branch`, and pass **no** `extra` — the PRD blob is deliberately excluded, or every worktree would refuse the moment it edits its own PRD (PRD §12 DO NOT).

  - [x] 3.3 Prints through the existing `stopCard({ id, phase: 'merge', ... })` and returns 1 — the same shape as its neighbours at 897 and 1024. No new card, no bare `console.error`.
        Original: On drift, print through the existing `stopCard` shape with `phase: 'merge'`-style framing consistent with its neighbours, and `return 1`. Do not invent a new card or a bare `console.error`.

  - [x] 3.4 Read, not assumed: seam at 926; `runChain` (which owns every `appendMetric` call — `chain.ts:764,775,808,817`) at 947; `mergePreconditions` 973; `archivePrdArtifacts` 1022; `mergeToLocalBase` 1071. Every one is below.
        Original: Confirm by reading, not by assuming, that the insertion point precedes every phase command, every chain metric write, `mergePreconditions`, the archive, and `mergeToLocalBase`. Record the line numbers in **Progress Log**.

  - [x] 3.5 Unchanged: `loadConfig`/`loadManifest` throw at 848-849 and the malformed-lease refusal is at 897. Both proven still first by the two precedence tests.
        Original: Change neither refusal above it: the loader throw at `loadConfig`/ `loadManifest` and the malformed-lease refusal keep their current precedence. The drift check is third.

  - [x] 3.6 `--dry-run` returns at 886-890, above the seam. Untouched, and asserted: `run --dry-run` exits 0 under drift.
        Original: Leave the `--dry-run` early return untouched. A plan executes nothing, so it does not check — this is a documented boundary (FR-5), not an oversight.

  - [x] 3.7 `git diff --name-only` lists neither `chain.ts` nor `merge.ts`.
        Original: Verify `chain.ts` and `merge.ts` are untouched: `git diff --name-only` must not list either. Two insertions would be two behaviors (PRD §12 DO NOT).


- [x] 4.0 FR-4 — prove it at the CLI, in a real git worktree
  - [x] 4.1 `test/revalidate.test.ts` uses `mkdtempSync` + real `git init` + a real commit, and drives `dist/cli.js` through `execFileSync`, capturing `{ code, stdout, stderr }`.
        Original: Create `packages/provegate/test/revalidate.test.ts` with the harness shape `cli-state.test.ts` uses — `mkdtempSync`, spawn `dist/cli.js` via `execFile`, capture `{ code, stdout, stderr }` — plus `git init` and a real initial commit.

  - [x] 4.2 The fixture seeds through the PRODUCTION path — `gate init` then `gate new drift-case` — then patches the PRD to Approved with a real surface. A hand-written PRD would be a fixture shape production never produces (`fixture-must-reach-production-shape`).
        Original: Seed the base branch: commit `workflow.config.json`, `gates.manifest.json`, and a PRD/readiness/tasks trio so `findRecord` resolves the PRD and the lease can be claimed.

  - [x] 4.3 Phase 4 is `node -e "require('fs').writeFileSync('ran.txt','1')"`. `node ` being allowlisted is ASSERTED against `DEFAULT_CONFIG.commands.allowedPrefixes`, not assumed.
        Original: Set the manifest's phase command to an observable no-op — `node -e "require('fs').writeFileSync('ran.txt','1')"`. Confirm `node ` is still in `commands.allowedPrefixes` (`core/config/defaults.ts`) rather than assuming it; the marker file is what turns "no phase command ran" into a file assertion.

  - [x] 4.4 Claimed through the built CLI with `gate open PRD-001 --worktree`; the lease carries real stamps written by `worktreeStamps()`. No lock file is hand-written anywhere in the fixture.
        Original: Claim through the built CLI with `gate open --worktree` so the lease carries real stamps. Do not hand-write a lock file — a synthetic lease would not exercise `worktreeStamps()`, which is the guard the seam sits behind.

  - [x] 4.5 Base advances with a second commit editing `gates.manifest.json`; the checkout is untouched.
        Original: Advance the base with a second commit editing `gates.manifest.json`. This is the drift; the worktree is untouched and unaware.

  - [x] 4.6 `gate run` exits 1, names `gates.manifest.json` and the remedy, and BOTH negatives are assert-absent: no `ran.txt`, no `_state/prd-metrics.jsonl`. The recovery test then asserts both APPEAR, which is what stops the absence from being vacuous.
        Original: **Drift / run**: `gate run` exits non-zero, names `gates.manifest.json`, and the remedy text appears. Assert `ran.txt` does **not** exist and no chain metric row was written — explicit assert-absent on both (`absence-must-be-asserted`).

  - [x] 4.7 `gate land` exits 1; base `rev-parse main` is unchanged, the branch log has no archive commit, and `_prds/completed/…` does not exist. Independent of stdout.
        Original: **Drift / land**: `gate land` exits non-zero; assert via `git log` that base has no merge commit and the branch has no archive commit. Independent evidence, not stdout parsing.

  - [x] 4.8 Covered, and it is the case that most needed a real CLI: with the manifest deleted locally, the run without this check proceeds on `defaultManifest(config)`.
        Original: **Deletion**: remove `gates.manifest.json` from the checkout while it stays committed on base → refused. Without this case the run would silently execute against `defaultManifest(config)`, which is the quietest form of the bug.

  - [x] 4.9 Both: a malformed lease is named and the drift text is absent; an unparseable local manifest surfaces `is not valid JSON` and the drift text is absent.
        Original: **Precedence**: with the checkout drifted *and* a malformed lease present, the malformed-lease message wins. With the checkout drifted *and* a local manifest that is present but unparseable, the loader error wins.

  - [x] 4.10 Merging base into the branch clears it: `gate run` then writes `ran.txt` and the metric row, and `gate land` then archives and MERGES (base moves, the tip names PRD-001).
        Original: **Recovery**: merge base into the branch, re-run both commands, and assert they proceed — `ran.txt` appears for `gate run`, and `gate land` reaches its merge. A check that never lets you through is not a check.

  - [x] 4.11 All five: `check`, `status`, `queue`, `run --dry-run` each exit 0 with no refusal text under the same drift, and a lease with no worktree stamps runs its chain (asserted by `ran.txt` in the main root).
        Original: **Unaffected, under the same drift**: `gate check`, `gate status`, and `gate queue` each exit 0 and print no refusal text; `gate run --dry-run` prints its plan and exits 0; a lease with no worktree stamps runs its chain normally. Five assertions — this is what keeps Q2's narrow scope from widening by accident.

  - [x] 4.12 The fixture creates its own repo, config, manifest and PRD in a temp dir and reads no `.env*`. Confirmed by running it with the repo's own env absent — it passes from a bare `vitest run`.
        Original: Confirm the fixture does not depend on the repo's root `.env*` (`fresh-worktree-env-gap`): it runs in a temp dir and inside a linked worktree, so anything it needs it must create.


- [x] 5.0 FR-5 — the stated boundary, and an assertion that opens the page
  - [x] 5.1 Added as `### Control-artifact revalidation, and what it does not cover` in `apps/docs/content/docs/method.mdx`, naming all three: a direct `git merge`, the read-only commands, and `--dry-run`.
        Original: Document the three exclusions in `apps/docs/content/docs/method.mdx`: a direct `git merge` bypasses the runner entirely; `check`, `status`, and `queue` do not check by design; `--dry-run` plans without checking.

  - [x] 5.2 Written as a limit — the bullets say what it does NOT cover and why each exclusion is deliberate, not what the feature achieves.
        Original: Write the paragraph as a limit, not a feature announcement. PRD-018's residual exists because a claim was written wider than its mechanism; this is the PRD that says so, and it must not repeat the shape.

  - [x] 5.3 Asserted by reading `apps/docs/content/docs/method.mdx` directly from `test/revalidate.test.ts`, slicing from the first `revalidat` and requiring all three exclusions inside that slice. `content-launch.test.ts` is untouched.
        Original: Assert it in `revalidate.test.ts` by **reading the file directly**. Do not route through `content-launch.test.ts`; it never opens `method.mdx`, so an assertion added there would be a green that proves nothing.

  - [x] 5.4 Recorded below, and MEASURED rather than assumed: `touch apps/docs/content/docs/method.mdx` then root `pnpm test` → `provegate:test: cache hit`.
        Original: `turbo-cache-masks-out-of-input-reads` — record in **Deferrals & Decisions** that this assertion reads a path outside the provegate package's turbo inputs, so the root `pnpm test` can replay a stale green after `method.mdx` changes alone. The FR-5 §11 row (`pnpm --filter provegate test …`) bypasses turbo and is the uncached authority. The repo-wide fix (turbo `inputs`/`globalDependencies`) is **out of this PRD's Conflict Surface** — raise it, do not silently widen scope.


- [x] 6.0 Migration & Rollback
  - [x] 6.1 Recorded below: no data, cache, or artifact migration.
        Original: State the migration in one line in **Deferrals & Decisions**: there is no data, cache, or artifact migration. What changes is that an existing worktree can now be refused where it previously ran.

  - [x] 6.2 Checked `_state/locks` on main at implementation time: one lease, PRD-022's own, claimed 2026-07-26 — after the last control-artifact change (03a1500, 2026-07-25). Its own checkout is byte-identical to base for both artifacts, so this PRD does not refuse itself. Listed in Operator Handoff.
        Original: Enumerate who that refusal can hit on the day this lands: any lease claimed before the last change to a root control artifact. Check `_state/locks` at merge time and list them in **Operator Handoff** rather than discovering them live.

  - [x] 6.3 Proven, not asserted: task 4.10 performs the exact remedy the refusal prints and both commands then proceed.
        Original: Confirm the remedy the refusal prints actually resolves it: in the fixture, merging base into the branch clears the refusal (task 4.10 is the proof). An instruction that does not work is worse than no instruction.

  - [x] 6.4 Recorded below.
        Original: Write the rollback in **Deferrals & Decisions**: revert the `cli.ts` call site only. FR-1's extraction and the barrel export stay, because they are behavior-preserving — a rollback that also reverts the refactor re-inlines a decision two call sites now share.

  - [x] 6.5 No changeset: this changes runner behavior, not the published config or manifest schema. Nothing in `schemas/` or the config types moved.
        Original: Confirm no changeset is required: this changes runner behavior, not the published config schema. If that reading is wrong, add one before Phase 5.


- [x] 7.0 Phase 5 — Testing
  - [x] 7.1 `pnpm build` first, and again after every mutation-check — the CLI fixture drives `dist/cli.js`.
        Original: `pnpm build` first — the fixture drives `dist/cli.js`, and a stale build produces a red that looks like a logic failure.

  - [x] 7.2 All five FR rows run and ledgered with evidence.
        Original: Run every §11 FR row and fill the Verification Ledger with evidence: FR-1, FR-2, FR-4, FR-5 (`test/revalidate.test.ts`) and FR-3 (`test/open.test.ts`).

  - [x] 7.3 `pnpm check-types` 0, `pnpm lint` 0, `pnpm test` 7/7 tasks, `pnpm build` clean, `pnpm verify:workflow` PASS.
        Original: Run the cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm verify:workflow`.

  - [x] 7.4 `check PRD-022` ok; `check --wiring` ok.
        Original: Run `node packages/provegate/dist/cli.js check PRD-022` and `node packages/provegate/dist/cli.js check --wiring`.

  - [x] 7.5 Re-read §12. The four plausible ones, each with a line: PRD blob excluded from the seam (`cli.ts:926-931` passes no `extra`); drifted order preserved (`worktree.ts` first-occurrence filter, mutation-checked); no second definition of drift in `cli.ts` (it calls the primitive, `grep` finds no comparator there); scope not widened (the five unaffected-command assertions).
        Original: Re-read PRD §12 and confirm none of the fourteen DO NOTs was introduced. Give the four that this implementation could plausibly violate a named line: PRD blob in the revalidation set, reordered drifted list, a second definition of drift in `cli.ts`, and a widened scope to the read-only commands.

  - [x] 7.6 Every ledger row carries its evidence.
        Original: Record every result in the ledger with evidence. A row marked `passed` with no evidence is a `pending` row that lies.


- [ ] 8.0 Phase 6 — Final Auditing
  - [ ] 8.1 Independent adversarial review by a different model; write
        `_docs/reviews/review-022-control-artifact-revalidation.md`.
  - [ ] 8.2 Point the review at the two things the tests cannot self-check: that the
        claim refusal bytes are genuinely unchanged (not that a test was adjusted to
        match), and that the fixture's negative assertions are assert-absent rather than
        greps that pass on empty input.
  - [ ] 8.3 Spec-vs-code audit: every FR target file in PRD §4 appears in the diff, and
        every file in the diff appears in the Conflict Surface.
  - [ ] 8.4 `git add` the review artifact — an untracked durable artifact fails the close
        gate (`durable-artifact-must-commit`).

- [ ] 9.0 Phase 7 — Learning
  - [ ] 9.1 Run the `_brain` capture protocol (`_brain/PROTOCOL.md` §7). The likely
        candidate: a check inserted at a shared dispatch point covers two commands, and
        finding that seam is worth more than the check itself — but only write it if it
        is not derivable from the code.
  - [ ] 9.2 `pnpm verify:brain` and `pnpm verify:durable-artifacts`.
  - [ ] 9.3 Update `STATUS.md` and `_state/prds.json`.
  - [ ] 9.4 Leave the Operator Handoff acceptance row for the owner to sign
        (`operator-acceptance-no-self-accept`); the merge gate refuses until it exists.

---

## Verification Ledger

| Gate               | Command / Check                                             | Scope | Result  | Evidence | Notes |
| ------------------ | ------------------------------------------------------------- | ----- | ------- | -------- | ----- |
| FR-1 | `pnpm --filter provegate test test/revalidate.test.ts` | pkg | passed | `pnpm --filter provegate test test/revalidate.test.ts` — 16 passed. Order test asserts the exact 3-element list and the whole refusal string; mutation `.sort()` fails it. | derivation: deleted-locally, added-on-base, unreadable fails closed, drifted order |
| FR-2 | `pnpm --filter provegate test test/revalidate.test.ts` | pkg | passed | Same file — seam tests. Mutation (`if (false && …)` at cli.ts:932, rebuilt) fails exactly `gate run`, `gate land`, and the deletion test. | run and land both refuse at the shared seam, before any command or merge |
| FR-3 | `pnpm --filter provegate test test/open.test.ts` | pkg | passed | `pnpm --filter provegate test test/open.test.ts` — with `test/worktree.test.ts`, 94 passed, both files UNMODIFIED (`git diff --stat -- test/` empty). Refusal bytes `cmp`-identical to the 2.1 baseline. | claim-path refusal bytes unchanged; tests pass **unmodified** |
| FR-4 | `pnpm --filter provegate test test/revalidate.test.ts` | pkg | passed | Same file — drift/run, drift/land, deletion, 2 precedence, recovery, 5 unaffected assertions, unstamped lease. Built CLI, real git worktree. | drift, deletion, precedence, recovery, and the unaffected set |
| FR-5 | `pnpm --filter provegate test test/revalidate.test.ts` | pkg | passed | Same file — `method.mdx` read directly; `git merge`, check/status/queue, and `--dry-run` all present. Turbo caveat in Deferrals. | method.mdx read directly; all three exclusions present |
| types | `pnpm check-types` | root | passed | `pnpm check-types` — 0 errors. | zero errors |
| lint | `pnpm lint` | root | passed | `pnpm lint` — 0 warnings. | zero warnings |
| test | `pnpm test` | root | passed | `pnpm test` — 7/7 tasks; package-level uncached: 42 files, **915 passed** (baseline 899 + 16). | full suite |
| build | `pnpm build` | root | passed | `pnpm build` — clean; rebuilt before each FR row and after each mutation. | clean build; must precede the FR rows |
| workflow | `pnpm verify:workflow` | repo | passed | `pnpm verify:workflow` — PASS (incl. verify:turbo-inputs, verify:pack-drift). | verify bundle |
| gate-check | `node packages/provegate/dist/cli.js check PRD-022` | repo | passed | `[check] ok — PRD-022 passes the readiness lint` | readiness lint |
| gate-wiring | `node packages/provegate/dist/cli.js check --wiring` | repo | passed | `[check --wiring] ok — every gate is wired or excepted` | wire-or-delete |
| independent-review | `_docs/reviews/review-022-control-artifact-revalidation.md`   | repo  | pending |          | verdict pass, Critical: 0 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Readiness Watch Coverage

Iteration 4 closed every watch item, so this table records where each resolved one is
held in the plan — a resolution that no task carries is a resolution that can be undone
by the implementer without anything noticing.

| Watch (resolved at readiness) | Binding tasks |
| ----------------------------- | ------------- |
| W1 — revalidation provenance contract | 1.2, 1.3, 1.4, 1.6, 1.9 |
| W2 — the real `cli.ts::runRun` seam, proven by CLI | 0.5, 3.1, 3.4, 4.4, 4.6, 4.7 |
| W3 — canonical refusal, unchanged claim bytes | 1.7, 2.1, 2.3, 2.4, 2.5 |
| W4 — a constructible built-CLI fixture | 4.1–4.5, 4.12 |
| W5 — PRD-018 ownership of `method.mdx` | 0.2, 0.2.1, 5.1 |
| W6 — barrel export, ordered union, first-occurrence dedup | 1.5, 1.8, 1.9 |
| W7 — the ordering promise, honestly scoped | 3.4, 4.6 |
| W8 — loader → malformed lease → drift precedence | 0.5, 3.5, 4.8, 4.9 |

---

## Deferrals & Decisions

- **1.6 finding — "fail closed" added during an extraction is a behavior change.** My first
  implementation of the primitive loaded a control file when nothing in the process had
  parsed it yet, so an unparseable file refused with its own message. That reads as
  strictly safer, and it broke `open.test.ts`'s control-artifact-introduction case: the
  claim path deliberately treats a present-but-unparsed control file as **drift**, with the
  merge remedy, and the loaders upstream of both call sites are what fail closed on
  parseability. Task 2.5's rule — *if a test needs editing to pass, the extraction changed
  behavior; revert, do not adjust the test* — is the only reason this was caught rather than
  ratified. The primitive now loads nothing. What survives is the narrow case the
  comparators genuinely misread: a file present but unhashable with nothing on base to
  disagree with, where both comparators see `null === null` and report agreement.

- **Mutation-check finding — an assert-absent can pass for the same reason the mutation
  does.** The deleted-manifest test asserted exit 1, the filename, and no marker file. With
  the seam disabled it still passed: removing the manifest also removes the phase-4 command
  that writes the marker, so the run stopped elsewhere, mentioned the same filename in a
  different sentence, and produced no marker. `absence-must-be-asserted` was satisfied and
  still proved nothing. The test now pins the drift sentence itself. **The generalisation:
  a negative assertion is only evidence when the absence has an independent cause from the
  mutation under test.**

- **5.4 — the FR-5 docs assertion is outside this package's turbo cache key, measured.**
  `test/revalidate.test.ts` reads `apps/docs/content/docs/method.mdx`, which lives in
  another package; `provegate#test` hashes only its own tracked files. Measured:
  `touch apps/docs/content/docs/method.mdx && pnpm test` → `provegate:test: cache hit`. So
  a root `pnpm test` can replay a stale green after `method.mdx` changes alone. The §11 row
  (`pnpm --filter provegate test test/revalidate.test.ts`) runs the package script directly,
  bypasses turbo, and is the uncached authority. The repo-wide fix — a `globalDependencies`
  entry or a docs dependency on the test task — is **outside this PRD's Conflict Surface**
  and is raised here rather than taken silently. Note the repo already forbids narrowing
  `inputs` (`verify:turbo-inputs`); this is the opposite gap, a cross-package read no
  default key covers.

- **8.3 finding — the Phase 7 capture edits files no PRD declares and no lease covers.**
  Every FR target in PRD §4 appears in the diff and every code/docs file in the diff appears
  in the Conflict Surface. The remainder of the diff is workflow artifacts, and they split
  in two: `_prds/`, `_tasks/`, `_state/` are coordination prefixes
  (`branches.allowedDirectPrefixes`), while **`STATUS.md` and `_brain/**` are neither
  coordination paths nor declared surface** — and the capture protocol requires editing
  `_brain/INDEX.md` on every close. Two PRDs closing concurrently would collide there with
  no lease to detect it, and an uncommitted `_brain` edit reads as non-coordination dirt to
  the merge precondition. No impact here (single lease, everything committed), and the fix
  — adding `_brain/` and `STATUS.md` to the coordination allowlist, or declaring them —
  touches `core/config`, outside this Conflict Surface. Raised, not taken.

- **Migration (6.1).** None. No data, cache, or artifact migration. What changes is that an
  existing worktree can now be refused where it previously ran.

- **Rollback (6.4).** Revert the `cli.ts` call site only (`cli.ts:911-941`). FR-1's
  extraction and the barrel export stay: they are behavior-preserving, and reverting them
  would re-inline a decision two call sites now share.

- **Divergence from the PRD's parameter comment.** PRD §4 annotates `relPath` as "worktree
  path, for the refusal text". It is also the checkout under comparison: the primitive
  resolves `containedPath(mainRepoRoot(root), relPath)` and passes that to
  `snapshotsMissingFrom`, exactly as `open.ts` passed `expected`. Deriving snapshots from
  `root` and comparing them against `root` would make the checkout-side comparator
  tautological for the claim path, whose `root` is the MAIN checkout while the checkout
  under validation is the worktree. The signature is unchanged; the comment understated it.


- **0.4 finding — a PRD's Memory Inputs written without reading its task plan.** The
  activation sweep added `## Memory Inputs` to this PRD from a `gate memory find` pass over
  its Conflict Surface. The task plan's Memory Context, written at Phase 3 with knowledge of
  the actual tasks, named six records; the sweep named four, and only one overlapped. Both
  lists were right about different things — the sweep found watch-overlap records the plan
  missed, the plan named records the sweep could not infer (FR-5 reading `method.mdx` is a
  turbo-input problem no glob reveals). The PRD now declares the union, because the PRD is
  what the gate parses and a partial declaration is a quiet one. **The generalisable point:
  `gate memory find` is a starting point for a contract declaration, not the declaration.**


- Phase 3 decision — `infra` skeleton: **Migration & Rollback is its own parent** (task
  6.0) because migration carries 20% of this class's readiness weight. There is no data
  migration here, but there is a behavioral one: leases that ran yesterday can be refused
  today, and 6.2 makes that population explicit instead of discovered.
- Phase 3 decision — no **Data & Infrastructure**, **API & Validation**, **Events**,
  **Frontend**, or **Permissions** parent. This PRD adds one function, one call site, and
  one paragraph of docs; inventing those parents to match the `feature` skeleton would
  produce empty ceremony.
- Phase 3 decision — the FR-3 proof (task 2.5) is that `open.test.ts` passes
  **unmodified**. It is listed under Relevant Files as read-not-written, and editing it
  to make the extraction pass inverts the gate.
- Phase 3 finding — the owner's "phase-3 geçebiliriz" is recorded as the Phase A approval
  gate; the parent skeleton was not presented separately.
- (none deferred yet)

---

## Progress Log

| Date       | Task    | Notes |
| ---------- | ------- | ----- |
| 2026-07-25 | Phase 3 | Plan generated from PRD-022 (Approved), readiness iteration 4 PASS 9.10, no open watch items. 10 parents, 63 sub-tasks (73 rows). No implementation started. |
| 2026-07-26 | 0.0 | Pre-flight cleared. Hard stop satisfied (018 and 019 both Ship Verified, no leases). Baseline green: `pnpm test` 899, `verify:workflow` PASS, `check --wiring` ok. 0.4 found that this PRD's `## Memory Inputs` had been written from a `gate memory find` sweep without reading the plan's Memory Context — reconciled to the union. |
| 2026-07-26 | 2.1 | Baseline claim refusal captured BEFORE any edit, from a real drift-on-reuse `claimPrd` run: `claim rolled back: the checkout at .worktrees/prd-001-baseline carries workflow artifacts differing from 'main' (gates.manifest.json) — merge or rebase main into feat/prd-001-baseline first`. Re-captured after the extraction and compared with `cmp`: identical. |
| 2026-07-26 | 1.0-3.0 | Primitive added, claim path extracted onto it, seam inserted at `cli.ts:926`. First attempt at 1.6 added a loader call inside the primitive and broke `open.test.ts`'s introduction case — reverted per 2.5 rather than adjusting the test. |
| 2026-07-26 | 4.0-5.0 | `test/revalidate.test.ts`: 16 tests (6 unit, 9 CLI, 1 docs). Seam line numbers recorded in 3.4. FR-5 paragraph added to `method.mdx`. |
| 2026-07-26 | 7.0 | Three mutation checks, each rebuilt: seam disabled → exactly the three CLI refusal tests fail; `.sort()` on the drifted list → only the order test fails; presence union reduced to checkout-only → only the deleted-locally test fails. The first mutation exposed a test passing for the wrong reason (see Deferrals) — hardened, then re-run. |

---

## Blockers / Open Questions

- **PRD-018 and PRD-019 must both be Ship Verified before Phase 4** (task 0.2). PRD-018
  shares `apps/docs/content/docs/method.mdx`; PRD-019 shares `packages/provegate/src/cli.ts`,
  which it edits to add `gate doctor`. This PRD claims both exclusively on purpose, so the
  lock gate will refuse the claim in task 0.1 while either lease is active. That refusal
  is the mechanism working, not a blocker to route around. The PRD-019 collision was
  found by `gate queue` at Phase 3, after four readiness rounds had asserted there was
  only one overlap — which is the argument for task 0.2.1 running the queue again rather
  than trusting this list.
- **Out of scope, raised rather than fixed** (task 5.4): the FR-5 assertion reads
  `apps/docs/content/docs/method.mdx` from inside the provegate package's turbo test task,
  so the root `pnpm test` can replay a stale green after that file changes alone. The §11
  FR-5 row bypasses turbo and stays authoritative. The repo-wide remedy touches
  `turbo.json`, which is not in this PRD's Conflict Surface. `review-quorum.test.ts` has
  the same shape today, so this is a pre-existing class, not a regression this PRD
  introduces.

---

## Operator Handoff

> Human/runtime/staging checks the agent cannot complete. Keep the corresponding task
> checkbox unchecked until resolved or explicitly accepted.
> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`}.

| Task | Category  | Owner | Required Check | Status | Notes |
| ---- | --------- | ----- | -------------- | ------ | ----- |
| 6.2  | manual-qa | owner | Accept that any lease claimed before the last root control-artifact change can be refused on its next `gate run` or `gate land`, with merge-or-rebase as the remedy | pending | **Enumerated at implementation time: one active lease, PRD-022's own** (claimed 2026-07-26, after the last control-artifact change `03a1500` on 2026-07-25), and its checkout is byte-identical to base for both artifacts — so nothing in flight is refused by this merge. Re-check `_state/locks` at land time; the list is only as current as the moment it was taken |
| 9.4  | manual-qa | owner | Sign the close acceptance — Autonomous Close is operator-gated for this PRD | pending | The merge gate refuses until the acceptance row exists; the agent never signs its own |
