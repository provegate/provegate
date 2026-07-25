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

- [ ] 0.0 Pre-flight and ownership
  - [ ] 0.1 Run `gate open PRD-022 --worktree` from the base checkout; confirm the lease
        covers the PRD Conflict Surface and record branch/worktree in the Progress Log.
  - [ ] 0.2 **Hard stop** — confirm `_state/prds.json` records **both PRD-018 and PRD-019**
        as `Ship Verified` and that neither holds an active lease. PRD-018 shares
        `apps/docs/content/docs/method.mdx`; PRD-019 shares
        `packages/provegate/src/cli.ts` (it adds `gate doctor`). The claim in 0.1 will be
        refused while either is active, and that refusal is the intended behavior, not an
        obstacle to work around.
  - [ ] 0.2.1 Run `gate queue` and read the overlap block before claiming. If it reports
        an overlap this plan does not name, stop and re-check the Conflict Surface — the
        PRD-019 collision was found this way, after four readiness rounds missed it.
  - [ ] 0.3 Confirm the two control artifacts exist at the repo root
        (`workflow.config.json`, `gates.manifest.json`). PRD-018 introduces them; without
        them this PRD's drift cases are unreachable in the live repo, though the fixture
        creates its own.
  - [ ] 0.4 Open the six Memory Context records; confirm the paths and commands each one
        names still exist and note any stale finding in **Deferrals & Decisions**.
  - [ ] 0.5 Re-measure the three code facts the plan rests on and record them, because
        every one of them moved during readiness: `gate land` dispatches to
        `runRun(rest, { mergeOnly: true })`; `loadConfig`/`loadManifest` run before
        `worktreeStamps()`; `loadManifest()` returns `defaultManifest(config)` when the
        manifest file is absent. A different answer to any of these re-opens FR-2 before
        code is written.
  - [ ] 0.6 Capture the green baseline for `pnpm test`, `pnpm verify:workflow`, and
        `node packages/provegate/dist/cli.js check --wiring`; a pre-existing red is
        ledgered, never normalized silently.

- [ ] 1.0 FR-1 — the `revalidateControlArtifacts` primitive
  - [ ] 1.1 Add `revalidateControlArtifacts` to
        `packages/provegate/src/core/run/worktree.ts` with the PRD §4 FR-1 signature:
        `{ root, config, relPath, branch, baseRef?, extra? }` →
        `{ drifted: string[]; refusal: string | null }`. Explicit types on every field;
        no `any`, no widening `ArtifactSnapshot`.
  - [ ] 1.2 Move the derivation in from `open.ts` unchanged: for each of
        `CONFIG_FILENAME` and `MANIFEST_FILENAME`, include the artifact when it exists in
        the checkout **or** on the base ref (`existsSync` OR `existsOnRef`) — the OR is
        what makes a local deletion drift instead of an omission.
  - [ ] 1.3 Hash the bytes the loaders parsed, not a later re-read: `configSourceFor` /
        `manifestSourceFor` → `blobShaOfBuffer`, falling back to `blobShaOfFile` when the
        source is null. Copy `open.ts`'s existing conditional exactly; a re-read reopens
        the edit-between-parse-and-hash window that comment block was written to close.
  - [ ] 1.4 Pin one base revision per invocation: `mainRepoRoot(root)` +
        `resolveRef(...)` when `baseRef` is absent; use the caller's `baseRef` when given.
        Never resolve twice inside one call.
  - [ ] 1.5 **Order is contractual** (PRD §4 FR-1). Build the set as `extra` first, then
        `CONFIG_FILENAME`, then `MANIFEST_FILENAME`. Reduce as
        `[...snapshotsNotMatchingRef(...), ...snapshotsMissingFrom(...)]` deduplicated by
        first occurrence with `.filter((rel, i, all) => all.indexOf(rel) === i)`. A `Set`,
        a sort, or last-wins dedup each change the refusal bytes task 2.3 must preserve.
  - [ ] 1.6 Fail closed on an unreadable or unparseable control file — return a refusal,
        never an empty `drifted` list. Unknowable policy is not "no drift".
  - [ ] 1.7 Format the refusal core exactly as `open.ts` emits it today: `` the checkout
        at <relPath> carries workflow artifacts differing from '<base>' (<list>) — merge
        or rebase <base> into <branch> first ``, list joined with `', '`. Return `null`
        when nothing drifted, so callers branch on the value rather than on an empty
        string.
  - [ ] 1.8 Re-export it from `packages/provegate/src/core/run/index.ts`. Verify by
        reading `cli.ts`'s import block that the barrel is still the only `core/run`
        import path in that file.
  - [ ] 1.9 Unit-cover the primitive in `packages/provegate/test/revalidate.test.ts`:
        matching artifacts → `refusal === null`; edited file, deleted-locally-but-on-base,
        and added-on-base each → drifted; unreadable → refuses. Assert the exact drifted
        **order** for a two-artifact case, not just membership — 1.5 is otherwise
        untested.

- [ ] 2.0 FR-3 — claim-path extraction with unchanged bytes
  - [ ] 2.1 Before editing, capture the current claim refusal string from a real
        drift-on-reuse run and paste it into **Progress Log**. This is the baseline task
        2.3 compares against; reconstructing it after the edit proves nothing.
  - [ ] 2.2 Replace the inlined reduce in `open.ts` (~lines 770–790) with a call to the
        primitive, passing the PRD blob as `extra` and the already-pinned `baseRefName`
        as `baseRef` — the claim must not resolve a second revision.
  - [ ] 2.3 Keep `open.ts`'s `claim rolled back: ` prefix and its `rollbackInstalledLease()`
        notes at the call site. Diff the emitted string against the 2.1 baseline
        character for character.
  - [ ] 2.4 Leave `createWorktree()`'s provisioning message (`these workflow artifacts are
        missing or uncommitted …`) alone. It describes fresh provisioning, not reuse;
        unifying it is a PRD §12 DO NOT.
  - [ ] 2.5 Run `pnpm --filter provegate test test/open.test.ts` and confirm every
        existing claim-path expectation passes **unmodified**. If a test needs editing to
        pass, the extraction changed behavior — revert and redo, do not adjust the test.

- [ ] 3.0 FR-2 — the shared `runRun()` seam
  - [ ] 3.1 Insert the call in `packages/provegate/src/cli.ts::runRun`, after the
        `leaseState.malformed` refusal and after `const stamps = leaseState.stamps`, and
        before `runChain(...)`. Guard on `stamps !== null`; a lease with no worktree
        stamps is out of scope.
  - [ ] 3.2 Pass `stamps.worktree` as `relPath` and `stamps.branch` as `branch`, and pass
        **no** `extra` — the PRD blob is deliberately excluded, or every worktree would
        refuse the moment it edits its own PRD (PRD §12 DO NOT).
  - [ ] 3.3 On drift, print through the existing `stopCard` shape with
        `phase: 'merge'`-style framing consistent with its neighbours, and `return 1`.
        Do not invent a new card or a bare `console.error`.
  - [ ] 3.4 Confirm by reading, not by assuming, that the insertion point precedes every
        phase command, every chain metric write, `mergePreconditions`, the archive, and
        `mergeToLocalBase`. Record the line numbers in **Progress Log**.
  - [ ] 3.5 Change neither refusal above it: the loader throw at `loadConfig`/
        `loadManifest` and the malformed-lease refusal keep their current precedence. The
        drift check is third.
  - [ ] 3.6 Leave the `--dry-run` early return untouched. A plan executes nothing, so it
        does not check — this is a documented boundary (FR-5), not an oversight.
  - [ ] 3.7 Verify `chain.ts` and `merge.ts` are untouched: `git diff --name-only` must
        not list either. Two insertions would be two behaviors (PRD §12 DO NOT).

- [ ] 4.0 FR-4 — prove it at the CLI, in a real git worktree
  - [ ] 4.1 Create `packages/provegate/test/revalidate.test.ts` with the harness shape
        `cli-state.test.ts` uses — `mkdtempSync`, spawn `dist/cli.js` via `execFile`,
        capture `{ code, stdout, stderr }` — plus `git init` and a real initial commit.
  - [ ] 4.2 Seed the base branch: commit `workflow.config.json`, `gates.manifest.json`,
        and a PRD/readiness/tasks trio so `findRecord` resolves the PRD and the lease can
        be claimed.
  - [ ] 4.3 Set the manifest's phase command to an observable no-op —
        `node -e "require('fs').writeFileSync('ran.txt','1')"`. Confirm `node ` is still
        in `commands.allowedPrefixes` (`core/config/defaults.ts`) rather than assuming
        it; the marker file is what turns "no phase command ran" into a file assertion.
  - [ ] 4.4 Claim through the built CLI with `gate open --worktree` so the lease carries
        real stamps. Do not hand-write a lock file — a synthetic lease would not exercise
        `worktreeStamps()`, which is the guard the seam sits behind.
  - [ ] 4.5 Advance the base with a second commit editing `gates.manifest.json`. This is
        the drift; the worktree is untouched and unaware.
  - [ ] 4.6 **Drift / run**: `gate run` exits non-zero, names `gates.manifest.json`, and
        the remedy text appears. Assert `ran.txt` does **not** exist and no chain metric
        row was written — explicit assert-absent on both (`absence-must-be-asserted`).
  - [ ] 4.7 **Drift / land**: `gate land` exits non-zero; assert via `git log` that base
        has no merge commit and the branch has no archive commit. Independent evidence,
        not stdout parsing.
  - [ ] 4.8 **Deletion**: remove `gates.manifest.json` from the checkout while it stays
        committed on base → refused. Without this case the run would silently execute
        against `defaultManifest(config)`, which is the quietest form of the bug.
  - [ ] 4.9 **Precedence**: with the checkout drifted *and* a malformed lease present,
        the malformed-lease message wins. With the checkout drifted *and* a local
        manifest that is present but unparseable, the loader error wins.
  - [ ] 4.10 **Recovery**: merge base into the branch, re-run both commands, and assert
        they proceed — `ran.txt` appears for `gate run`, and `gate land` reaches its
        merge. A check that never lets you through is not a check.
  - [ ] 4.11 **Unaffected, under the same drift**: `gate check`, `gate status`, and
        `gate queue` each exit 0 and print no refusal text; `gate run --dry-run` prints
        its plan and exits 0; a lease with no worktree stamps runs its chain normally.
        Five assertions — this is what keeps Q2's narrow scope from widening by accident.
  - [ ] 4.12 Confirm the fixture does not depend on the repo's root `.env*`
        (`fresh-worktree-env-gap`): it runs in a temp dir and inside a linked worktree,
        so anything it needs it must create.

- [ ] 5.0 FR-5 — the stated boundary, and an assertion that opens the page
  - [ ] 5.1 Document the three exclusions in `apps/docs/content/docs/method.mdx`: a
        direct `git merge` bypasses the runner entirely; `check`, `status`, and `queue`
        do not check by design; `--dry-run` plans without checking.
  - [ ] 5.2 Write the paragraph as a limit, not a feature announcement. PRD-018's
        residual exists because a claim was written wider than its mechanism; this is the
        PRD that says so, and it must not repeat the shape.
  - [ ] 5.3 Assert it in `revalidate.test.ts` by **reading the file directly**. Do not
        route through `content-launch.test.ts`; it never opens `method.mdx`, so an
        assertion added there would be a green that proves nothing.
  - [ ] 5.4 `turbo-cache-masks-out-of-input-reads` — record in **Deferrals & Decisions**
        that this assertion reads a path outside the provegate package's turbo inputs, so
        the root `pnpm test` can replay a stale green after `method.mdx` changes alone.
        The FR-5 §11 row (`pnpm --filter provegate test …`) bypasses turbo and is the
        uncached authority. The repo-wide fix (turbo `inputs`/`globalDependencies`) is
        **out of this PRD's Conflict Surface** — raise it, do not silently widen scope.

- [ ] 6.0 Migration & Rollback
  - [ ] 6.1 State the migration in one line in **Deferrals & Decisions**: there is no
        data, cache, or artifact migration. What changes is that an existing worktree can
        now be refused where it previously ran.
  - [ ] 6.2 Enumerate who that refusal can hit on the day this lands: any lease claimed
        before the last change to a root control artifact. Check `_state/locks` at merge
        time and list them in **Operator Handoff** rather than discovering them live.
  - [ ] 6.3 Confirm the remedy the refusal prints actually resolves it: in the fixture,
        merging base into the branch clears the refusal (task 4.10 is the proof). An
        instruction that does not work is worse than no instruction.
  - [ ] 6.4 Write the rollback in **Deferrals & Decisions**: revert the `cli.ts` call
        site only. FR-1's extraction and the barrel export stay, because they are
        behavior-preserving — a rollback that also reverts the refactor re-inlines a
        decision two call sites now share.
  - [ ] 6.5 Confirm no changeset is required: this changes runner behavior, not the
        published config schema. If that reading is wrong, add one before Phase 5.

- [ ] 7.0 Phase 5 — Testing
  - [ ] 7.1 `pnpm build` first — the fixture drives `dist/cli.js`, and a stale build
        produces a red that looks like a logic failure.
  - [ ] 7.2 Run every §11 FR row and fill the Verification Ledger with evidence:
        FR-1, FR-2, FR-4, FR-5 (`test/revalidate.test.ts`) and FR-3 (`test/open.test.ts`).
  - [ ] 7.3 Run the cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`,
        `pnpm build`, `pnpm verify:workflow`.
  - [ ] 7.4 Run `node packages/provegate/dist/cli.js check PRD-022` and
        `node packages/provegate/dist/cli.js check --wiring`.
  - [ ] 7.5 Re-read PRD §12 and confirm none of the fourteen DO NOTs was introduced.
        Give the four that this implementation could plausibly violate a named line:
        PRD blob in the revalidation set, reordered drifted list, a second definition of
        drift in `cli.ts`, and a widened scope to the read-only commands.
  - [ ] 7.6 Record every result in the ledger with evidence. A row marked `passed` with
        no evidence is a `pending` row that lies.

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
| FR-1               | `pnpm --filter provegate test test/revalidate.test.ts`        | pkg   | pending |          | derivation: deleted-locally, added-on-base, unreadable fails closed, drifted order |
| FR-2               | `pnpm --filter provegate test test/revalidate.test.ts`        | pkg   | pending |          | run and land both refuse at the shared seam, before any command or merge |
| FR-3               | `pnpm --filter provegate test test/open.test.ts`              | pkg   | pending |          | claim-path refusal bytes unchanged; tests pass **unmodified** |
| FR-4               | `pnpm --filter provegate test test/revalidate.test.ts`        | pkg   | pending |          | drift, deletion, precedence, recovery, and the unaffected set |
| FR-5               | `pnpm --filter provegate test test/revalidate.test.ts`        | pkg   | pending |          | method.mdx read directly; all three exclusions present |
| types              | `pnpm check-types`                                            | root  | pending |          | zero errors |
| lint               | `pnpm lint`                                                   | root  | pending |          | zero warnings |
| test               | `pnpm test`                                                   | root  | pending |          | full suite |
| build              | `pnpm build`                                                  | root  | pending |          | clean build; must precede the FR rows |
| workflow           | `pnpm verify:workflow`                                        | repo  | pending |          | verify bundle |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-022`           | repo  | pending |          | readiness lint |
| gate-wiring        | `node packages/provegate/dist/cli.js check --wiring`          | repo  | pending |          | wire-or-delete |
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
| 6.2  | manual-qa | owner | Accept that any lease claimed before the last root control-artifact change can be refused on its next `gate run` or `gate land`, with merge-or-rebase as the remedy | pending | The agent can list the affected leases; deciding to land a change that stops in-flight work is an owner call |
| 9.4  | manual-qa | owner | Sign the close acceptance — Autonomous Close is operator-gated for this PRD | pending | The merge gate refuses until the acceptance row exists; the agent never signs its own |
