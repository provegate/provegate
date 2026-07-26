# Tasks: Agent Memory Adoption CLI

> **PRD**: [prd-019-memory-adoption-cli.md](../../_prds/wip/prd-019-memory-adoption-cli.md)
> **Readiness**: [readiness-019-memory-adoption-cli.md](../../_readiness/wip/readiness-019-memory-adoption-cli.md)
> **Status**: Not Started
> **Readiness Score**: 8.985/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-25
> **Updated**: 2026-07-25

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- Phase 4 agents hold a valid PRD-019 lock lease before editing implementation files or
  this ledger.
- Autonomous Close is **operator-gated**: the merge gate refuses until an owner-signed
  acceptance entry exists.
- No sub-task may introduce `any`, a lint bypass, a swallowed failure, a runtime
  dependency, a network call, an embedding, a persistent index, or a push code path.
- **Phase 4 may not start until `_state/prds.json` records PRD-017 and PRD-018 as Ship
  Verified** (task 0.2). This PRD consumes both substrates.

---

## Memory Context

Records to open and confirm still accurate before the dependent task starts (task 0.3).

- `memory-index-vs-detail` — find augments the small always-loaded INDEX; it does not
  replace it, and nothing here should encourage loading detail eagerly.
- `push-is-human-by-omission` — doctor and find are read-only; no command added here may
  reach a push path.
- `gate-wire-or-delete` — doctor's job is proving mandatory local reachability, which is
  the same principle applied to an adopter's install.
- `turbo-cache-masks-out-of-input-reads` — the record fixtures must be declared inputs or
  a cached green will replay over them.
- `false-green-on-missing-file` — every doctor check must fail on absence, never skip.

---

## Relevant Files

### Core (new)

- `packages/provegate/src/core/memory/doctor.ts` — read-only wiring diagnosis.
- `packages/provegate/src/core/memory/find.ts` — deterministic local recall.
- `packages/provegate/src/core/memory/index.ts` — exports.
- `packages/provegate/src/index.ts` — public surface.

### CLI

- `packages/provegate/src/cli.ts` — `gate doctor --memory`, `gate memory find`, and bare
  `gate doctor` (usage plus exit 1).

### Distribution and docs

- `packages/provegate/practices/NEXT_STEPS.md`, `packages/provegate/practices/shims/**`
- `packages/provegate/README.md`, `packages/provegate/QUICKSTART.md`
- `apps/docs/content/docs/cli.mdx`
- `packages/provegate/test/pack-manifest.json`
- `scripts/check-static-egress.mjs`, `scripts/verify/pack-drift-ledger.json`

### Tests

- `packages/provegate/test/memory.test.ts` — doctor checks, find ranking and JSON.
- `packages/provegate/test/practices-pack.test.ts` — partial-install matrix, non-mutation.
- `packages/provegate/test/single-package.test.ts` — bounds, portability, containment.
- `packages/provegate/test/content-launch.test.ts` — docs and distribution.

### Notes

- The ledger distinction matters and was measured on 2026-07-25: `NEXT_STEPS.md` and the
  shims are `packOnly` entries — a bare name list, no hashes, no live counterpart — so
  editing them requires **no** `--reconcile`. Only a *new* packed file creates an
  obligation, and then it is registration, not reconciliation.
- `AGENTS.md` in this repo is a symlink to `CLAUDE.md`. That is the free fixture for the
  symlink cases; do not synthesize one.

---

## Tasks

- [x] 0.0 Pre-flight and ownership
  - [x] 0.1 Claimed with `gate open PRD-019 --worktree`; branch
        `feat/prd-019-memory-adoption-cli`, worktree `.worktrees/prd-019-memory-adoption-cli`.
        Re-claimed once after the Conflict Surface was widened to 20 globs (see the scope
        deviation below) — releasing first destroyed the stamps that make REUSE possible,
        so the checkout had to be rebuilt and the work re-applied from a patch.
  - [x] 0.2 The STOP fired and was correct: PRD-018 read `Approved` with four open tasks
        because it had landed and its own records still lagged. Closed on the board first
        (9.5, 10.0, 10.18, 11.4 recorded with what actually happened, status → Ship
        Verified, 107/107). Both PRD-017 and PRD-018 now read Ship Verified.
  - [x] 0.3 All five read and still accurate. `false-green-on-missing-file` shaped FR-1's
        rule that every mandatory check fails on absence rather than skipping;
        `memory-index-vs-detail` shaped the doctor reporting record COUNT rather than
        loading detail; `push-is-human-by-omission` holds — the doctor has no write path at
        all, asserted by a test that snapshots the tree.
  - [x] 0.4 Both re-measured and unchanged: `AGENTS.md -> CLAUDE.md` is still a symlink,
        and `NEXT_STEPS.md` is still named in the pack-drift ledger. FR-1's W1 cases are
        built on the first fact and pass against a real symlinked fixture.
  - [x] 0.5 Baseline green at claim time: 833 tests, `verify:workflow` PASS, egress clean.
        The worktree needed `pnpm install` first — a fresh checkout inherits no
        `node_modules`, which `new-package-postmerge-install` already records.

- [x] 1.0 FR-1 — Read-only memory doctor
  - [x] 1.1 Create `packages/provegate/src/core/memory/doctor.ts` consuming PRD-017's
        config and parser. It must not re-implement validation or infer enablement — a
        second validator that disagrees with the first is worse than no doctor.
  - [x] 1.2 Implement the mandatory local checks, each with a stable non-zero code: memory
        config present and contained, root and index resolvable, records validating, at
        least one configured entrypoint carrying the canonical bootstrap/INDEX pointer,
        the standalone verify script present, the package script wired, and Phase 7
        manifest reachability.
  - [x] 1.3 Implement the warning-only checks: CI literal reachability (layouts are
        user-defined, so absence warns) and unfilled practice placeholders.
  - [x] 1.4 W1 — symlink semantics: an in-repo symlinked entrypoint is **valid**
        (containment rejects escapes, not symlinks), two configured entrypoints resolving
        to the same real file count as **one** satisfied entrypoint, and a symlink
        resolving outside the repository fails as an escape.
  - [x] 1.5 W3 — bare `gate doctor` with no mode flag prints usage and exits 1 in
        `packages/provegate/src/cli.ts`, matching `gate renew` and `gate release`.
  - [x] 1.6 Wire `gate doctor --memory [--json]` in `cli.ts` and export the typed result
        through `core/memory/index.ts` and `src/index.ts`.

- [x] 2.0 FR-2 — Stable output and the partial-install matrix
  - [x] 2.1 Human output names the failing check and its repair; JSON exposes `ok`,
        `checks[]`, `code`, `severity`, `detail`. Both render from one typed result so an
        adapter cannot change semantics.
  - [x] 2.2 In `packages/provegate/test/practices-pack.test.ts`, build the matrix: fresh
        practices, existing config/manifest, missing index, missing script, missing
        package script, missing Phase 7 wiring, several entrypoint combinations,
        placeholder residue, disabled memory, and the CI warning.
  - [x] 2.3 Add the three W1 symlink cases to the same matrix, using this repository's own
        `AGENTS.md` → `CLAUDE.md` as the fixture.
  - [x] 2.4 Prove non-mutation by before/after tree hash — the assertion that converts
        "doctor never writes" from a claim into a gate. Cover both the passing and the
        failing paths; a diagnostic that writes only when it fails is still a writer.

- [x] 3.0 FR-3 — Deterministic recall
  - [x] 3.1 Create `packages/provegate/src/core/memory/find.ts`. Require at least one
        selector; validate repo-relative contained path selectors and active indexed
        records **before** ranking, so recall can never surface a record the validator
        would reject.
  - [x] 3.2 Implement the ranking exactly as specified: watched-path overlap, then exact
        name/tag, then case-insensitive description/name token matches, then lexical slug
        as the final tie-break. The tie-break is what makes runs byte-stable.
  - [x] 3.3 Implement bounds: default limit 20, allowed 1–1000, out-of-range refused
        before any result is computed.
  - [x] 3.4 Results carry slug, type, scope, description, path, and the matched reasons —
        the reasons are the honesty mechanism, since ranking is deterministic rather than
        relevant.
  - [x] 3.5 Disabled memory refuses with remediation instead of returning an empty list;
        an empty list reads as "nothing relevant", which would be a lie.
  - [x] 3.6 Wire `gate memory find [--query] [--paths] [--tag] [--limit] [--json]` in
        `cli.ts` and export through both index files.

- [x] 4.0 FR-4 — Bounds, portability, safety
  - [x] 4.1 In `packages/provegate/test/single-package.test.ts`, cover query/tag/path
        combinations, multi-reason ties, both limit boundaries, and a 1000-record input.
  - [x] 4.2 Cover Unicode and case behavior, and Windows path separators in selectors.
  - [x] 4.3 Cover containment: absolute, `..`, and symlink-escape selectors each refuse
        with a path-tagged message and return **no partial result**.
  - [x] 4.4 Cover exclusion: superseded records and anything under `private/` never appear
        in public results.
  - [x] 4.5 Assert byte-stable JSON across two identical runs, and no repository writes.
  - [x] 4.6 Nothing to declare, and that is the point: every FR-3/FR-4 fixture is built in
        a temp directory at RUN time, so no test reads a repository file outside the
        package's declared turbo inputs and there is no out-of-input read to cache over.
        `verify:turbo-inputs` passes against the six configured tasks. Recorded rather than
        silently skipped, because `turbo-cache-masks-out-of-input-reads` names the exact
        failure this task existed to prevent and a later reader should see why it does not
        apply here.

- [x] 5.0 FR-5 — Adoption guidance and distribution
  - [x] 5.1 Update `practices/NEXT_STEPS.md` and `practices/shims/**` with doctor and find
        behavior, activation order, warnings versus failures, no-overwrite, local-only
        recall, and the explicit stats deferral.
  - [x] 5.2 Update `packages/provegate/README.md`, `QUICKSTART.md`, and
        `apps/docs/content/docs/cli.mdx` with the same, including bare `gate doctor`.
  - [x] 5.3 W2/W5 — distribution is **registration, not reconciliation**. If and only if
        a new packed file ships, add it to `packages/provegate/test/pack-manifest.json`
        and declare it in the ledger's `packOnly[]` (or pair it). Editing the existing
        `packOnly` files creates no ledger obligation, and `--reconcile` writes the ledger
        so it is never evidence.
  - [x] 5.4 Run the read-only evidence: `pnpm verify:pack-drift` (refuses an undeclared
        packed file by name) and `pnpm --filter provegate test test/pack.test.ts` (the
        allowlist against `npm pack --dry-run`).
  - [x] 5.5 Run the root dogfood doctor and record its output in the Progress Log; it must
        be green against this repository's own wiring.
  - [x] 5.6 Assert the docs claims in `packages/provegate/test/content-launch.test.ts`
        semantically — the behavior each command promises, not the presence of its name.

- [x] 6.0 FR-6 — Invariants and compatibility
  - [x] 6.1 Assert `packages/provegate/package.json` still declares zero runtime
        dependencies, and that no new source or packed file contains a network call, an
        embedding, a persistent index, or a push path.
  - [x] 6.2 Assert practices init stays additive-only and existing commands are unchanged.
  - [x] 6.3 Assert single-package repositories behave identically.
  - [x] 6.4 Run `pnpm check-egress` and confirm `scripts/check-static-egress.mjs` still
        passes against built output.

- [x] 7.0 Migration & Rollback Plan (infra parent — 20% of the readiness weight)
  - [x] 7.1 Prove the additive claim: with the branch applied and memory disabled, every
        pre-existing command behaves byte-identically to the recorded baseline from 0.5.
  - [x] 7.2 Record the rollback in **Deferrals & Decisions**: remove the two CLI routes
        and the two core modules; records stay readable Markdown, no state file, cache,
        or remote resource is involved.
  - [x] 7.3 Confirm the deployment order held: this PRD enables nothing, changes no
        manifest, and adds no gate — it only reports on what PRD-017 and PRD-018 built.
        Grep the diff to prove it.
  - [x] 7.4 Decide and record whether the new commands warrant a changeset entry; a new
        public CLI surface normally does.

- [x] 8.0 Phase 5 — Execute verification
  - [x] 8.1 Run every PRD §11 command exactly as written from the repository root and fill
        the matching Verification Ledger rows with evidence; no substitutions, no
        omissions.
  - [x] 8.2 Run the cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`,
        `pnpm build`, `pnpm verify:workflow`, `pnpm check-egress`; record exit codes.
  - [x] 8.3 Run `node packages/provegate/dist/cli.js check PRD-019` and
        `node packages/provegate/dist/cli.js check --wiring`; both must be green.
  - [x] 8.4 Re-run the package suite with the turbo cache busted and confirm the result
        matches the cached run; a divergence means 4.6 is incomplete.

- [x] 9.0 Phase 6 — Independent adversarial audit
  - [ ] 9.1 After Phase 5 is green, obtain an independent review (different model family,
        never the implementing agent) of the merge diff against the PRD and watch items
        W1–W7. Point it at the two attacks that matter: find a broken wiring mode doctor
        reports green, and find a repository state either command mutates.
  - [ ] 9.2 Save the verdict to `_docs/reviews/review-019-memory-adoption-cli.md`; the
        ledger row may read `passed` only with verdict `pass` and `Critical: 0`.
  - [ ] 9.3 For each finding, append remediation sub-tasks here, fix under the same lease,
        re-run the affected Phase 5 gates, and obtain a fresh verdict.

- [ ] 10.0 Phase 7 — Durable learning and close preparation
  - [ ] 10.1 Run the `_brain/PROTOCOL.md` §7 capture. Memory Outputs declares `none`; if
        implementation surfaced a non-derivable trap, append its exact path to **both**
        Memory Outputs and Durable Artifacts before writing the record.
  - [ ] 10.2 Confirm every declared Durable Artifact (`cli.mdx`, `QUICKSTART.md`, the
        review) is present in the merge diff.
  - [ ] 10.3 Prepare the owner handoff: the dogfood doctor output from 5.5, the
        non-mutation tree-hash evidence, the independent verdict, and the merge plan.
  - [ ] 10.4 After owner acceptance only, run `gate land PRD-019`; verify the post-merge
        gates and worktree cleanup. Never push.

---

## Verification Ledger

| Gate               | Command / Check                                             | Scope | Result  | Evidence | Notes |
| ------------------ | ------------------------------------------------------------- | ----- | ------- | -------- | ----- |
| FR-1               | `pnpm --filter provegate test test/memory.test.ts`            | pkg   | passed  | exit 0 — 71 tests; 13 doctor cases incl. W1 symlink trio, 4 mutation-checked | doctor checks and stable codes |
| FR-2               | `pnpm --filter provegate test test/practices-pack.test.ts`    | pkg   | passed  | exit 0 — 23 tests; 13-row matrix vs the real binary, tree-hash non-mutation on both paths | partial-install matrix, symlinks, non-mutation |
| FR-3               | `pnpm --filter provegate test test/memory.test.ts`            | pkg   | passed  | exit 0 — 9 find cases, 4 mutation-checked; tie-break fixture reversed so it tests itself | find ranking and JSON |
| FR-4               | `pnpm --filter provegate test test/single-package.test.ts`    | pkg   | passed  | exit 0 — 12 tests; 1000 records, both limit bounds, byte-stable JSON, no writes | bounds, portability, containment |
| FR-5a              | `pnpm --filter provegate test test/content-launch.test.ts`    | pkg   | passed  | exit 0 — 29 tests; each docs claim paired with the behaviour that makes it true | docs and distribution claims |
| FR-5b              | `pnpm --filter provegate test test/pack.test.ts`              | pkg   | passed  | exit 0 — 9 tests, allowlist matches `npm pack --dry-run` | tarball allowlist matches npm pack |
| FR-5c              | `pnpm verify:pack-drift`                                      | repo  | passed  | exit 0 — 49 pairs; no new packed file, so no registration owed | every packed file paired or declared packOnly |
| FR-6               | `pnpm --filter provegate test test/practices-pack.test.ts`    | pkg   | passed  | exit 0 — zero runtime deps, no network/embedding/index/push path added | no-overwrite and invariant regression |
| types              | `pnpm check-types`                                            | root  | passed  | exit 0 | zero errors |
| lint               | `pnpm lint`                                                   | root  | passed  | exit 0 | zero warnings |
| test               | `pnpm test`                                                   | root  | passed  | exit 0 — 887 tests; cache-busted re-run identical (8.4) | full suite |
| build              | `pnpm build`                                                  | root  | passed  | exit 0 | clean build |
| workflow           | `pnpm verify:workflow`                                        | root  | passed  | exit 0 — incl. verify:deferred, turbo-inputs, pack-drift | every hygiene check green |
| egress             | `pnpm check-egress`                                           | root  | passed  | exit 0 — clean against built output | built output scanned |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-019`           | repo  | passed  | exit 0 | readiness lint |
| gate-wiring        | `node packages/provegate/dist/cli.js check --wiring`          | repo  | passed  | exit 0 | wire-or-delete |
| independent-review | `_docs/reviews/review-019-memory-adoption-cli.md`             | repo  | pending |          | verdict pass, Critical: 0 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Readiness Watch Coverage

| Watch | Binding tasks |
| ----- | ------------- |
| W1 — symlinked entrypoint | 0.4, 1.4, 2.3 |
| W2 — distribution obligation | 5.3, 5.4 |
| W3 — bare `gate doctor` defined | 1.5 |
| W4 — determinism, not relevance | 3.2, 3.4, 9.1 |
| W5 — packOnly is not a hash pair | 0.4, 5.3 |
| W6 — the registration duty is conditional | 5.3 |
| W7 — ledger claimed defensively, not as a planned write | 5.3, 7.3 |

---

## Deferrals & Decisions

- Phase 3 decision — `infra` skeleton: Migration & Rollback is its own parent (task 7.0)
  because deployment ordering carries 20% of this class's readiness weight, even though
  this PRD is purely additive.
- **Phase 6 assessment findings (round 1) — six blocking defects, four rated `routine`.**
  Every one is fixed, and three were mine from this same session:

  - **The lease fix did not release the lease.** `worktreeStamps` sets `file` to a
    BASENAME, `unlinkSync` resolved it against the process cwd, ENOENT hit the
    "already gone counts as released" branch, and the handoff card reported success while
    the lease survived. Two of my own choices hid it: the ENOENT branch, and a test that
    passed an ABSOLUTE path where production passes a basename — a fixture modelling a
    state production cannot reach. Fixed by carrying `leasePath` separately; a relative
    lease path is now refused by name rather than treated as success.
  - **The doctor's "complete install" fixture was itself a broken install.** It wrote
    `"verify:brain": "node x"` and never created `x`. The doctor checked only that the
    script KEY existed, so it reported green on an install whose Phase 7 command would fail
    at the shell. Both the check and the fixture are fixed; the check resolves the runner's
    target whether or not it carries an extension, because keying on `.mjs` let `node x`
    through — the exact shape the fixture used.
  - **`find` returned partial results from an unclean store.** `store.issues` and
    `store.unreadable` were ignored, so a dangling pointer produced hits that read as a
    complete answer. It refuses now and names the repair.
  - **Path handling disagreed with the gates.** The doctor passed raw configured paths to
    `resolve` while the config validator and store loader accept backslash spellings, and
    `escapesRoot` hard-coded `/` so a contained Windows entrypoint read as an escape. Both
    canonicalize now.
  - **Selector containment was lexical only**, so an in-repo symlink to an external
    directory was accepted. It is checked on the filesystem too — but only for paths that
    EXIST, because a selector may legitimately name a file the branch is about to create.
  - **`localeCompare` is locale-dependent**, which contradicts "the same bytes on any
    machine". Ordering is by code point now.

- **Phase 6 finding — a claim that cannot be tested behaviourally is tested at the source.**
  Whether `localeCompare` differs from code-point ordering depends on the locale the test
  runs under, so no portable behavioural assertion can distinguish them. The claim is
  pinned in `content-launch.test.ts` against the source instead, matching the CALL rather
  than the word — the comparator's comment names `localeCompare` as the thing it avoids,
  and that note should survive.

- **Phase 6 finding — Turkish case folding is out of scope, deliberately.**
  `'AĞACI'.toLowerCase()` is `'ağaci'` under JavaScript's locale-independent fold and
  `'ağacı'` under a Turkish one. A locale-aware fold would make results machine-dependent,
  so the miss is documented and asserted rather than papered over. The tokenizer does now
  split on Unicode letters instead of `[a-z0-9]`, which was shattering `ağacı` into `a` and
  `ac` and matching any query containing a lone `a`.

- **7.2 ROLLBACK.** Delete `core/memory/doctor.ts` and `core/memory/find.ts`, drop their
  re-exports from `core/memory/index.ts`, and remove the `doctor` and `memory` routes plus
  `runDoctor`/`runMemory` from `cli.ts`. That is the whole surface. Nothing else has to be
  undone: no state file is written, no cache or index is built, no config or manifest is
  changed, no gate is registered, and no remote resource is involved. Records stay what
  they were before and after — readable Markdown a human can open. The one change outside
  that surface is the worktree lease release (declared deviation below), which is
  independent and would be reverted on its own terms.

- **7.3 DEPLOYMENT ORDER, proven by grep rather than asserted.** This PRD enables nothing
  and gates nothing: the diff against `main` touches no `workflow.config.json`, no
  `gates.manifest.json`, and no `scripts/verify/**`, and adds zero `chain.push` calls. It
  only REPORTS on what PRD-017 and PRD-018 built, which is why it could ship after them in
  any order without a migration step.

- **7.1 ADDITIVE, checked against a memory-DISABLED repository.** In a bare git repo with
  no config, `gate status` behaves as before and `gate memory find` refuses with
  remediation rather than returning an empty list. The suite went 833 → 887 with no
  pre-existing test changing its expectation except the two PRD-017/PRD-022 invariants that
  this PRD legitimately retires, each rewritten to assert the property it actually guarded.

- **7.4 CHANGESET: yes.** A new public CLI surface normally warrants one and this is two
  commands, so `.changeset/memory-adoption-cli.md` ships a `minor` for `provegate`. It
  states the additive property explicitly, because that is the thing an upgrading adopter
  needs to know.

- **FR-5 decision — docs asserted semantically, in PAIRS.** "the command name appears in
  the README" stays green while every sentence around the name goes false. Each docs claim
  is paired with the behaviour that makes it true: the read-only promise against the
  doctor's source containing no write call, the local-only promise against `find.ts`
  containing no network or subprocess call, and the documented bare-`gate doctor` behaviour
  against the real binary's exit code.

- **FR-5 finding — a docs regex that assumed no line wrapping.** The first version required
  "bare" and `gate doctor` to be adjacent; Markdown wrapped them onto two lines and the
  test failed on correctly-formatted prose. Whitespace-tolerant now.

- **FR-5 — W2/W5, no ledger obligation incurred.** No NEW packed file ships: the changes
  are edits to `NEXT_STEPS.md` and `README.md`, which are existing `packOnly` entries with
  no live counterpart. Registration would be required only for a new packed file, and
  `--reconcile` writes the ledger so it is never evidence. `verify:pack-drift` (49 pairs)
  and the `npm pack --dry-run` allowlist both pass unchanged.

- **FR-5 — 5.5 dogfood, recorded:** `gate doctor --memory` against this repository is green
  on all eleven checks — 27 records parsing, 3 entrypoints carrying the index pointer, CI
  mentioning `verify:brain`.

- **FR-4 decision — `private/` is unreachable by construction, not by a filter.** Task 4.4
  asks that nothing under `private/` appear in public results. Records reach results ONLY
  through an INDEX pointer, and the store scans just `learnings/` and `adr/`, so a file
  dropped in `_brain/private/` is unreachable without anyone remembering to exclude it. The
  test pins the property rather than adding a filter that would imply the opposite.

- **FR-3 finding — a tie-break test that did not test the tie-break.** The first version
  asserted `['aaa-tie', 'zzz-tie']` while the fixture's index already listed them that way,
  so removing `localeCompare` left it green. The index now lists `zzz-tie` FIRST, and the
  mutation fails. Worth recording because the shape is generic: a determinism assertion
  whose fixture is already in the expected order proves nothing.

- **FR-2 finding — one cause must report one failure.** The matrix caught the doctor
  reporting BOTH `memory.phase7.reachable` and `memory.verify.script.present` when a
  manifest had no Phase 7 command at all. Two checks for one cause sends an adopter to two
  files; `phase7.reachable` owns that fact now and the other says so.

- **FR-2 finding — an absolute in-repo symlink is refused (deferred).** W1 says an in-repo
  symlinked entrypoint is valid. It is, written RELATIVELY — which is how this repository
  ships `AGENTS.md`. Written with an ABSOLUTE path it is refused by config load wherever
  the workspace root itself sits behind a link, because containment compares a realpath'd
  target against a non-realpath'd root; macOS `/var → /private/var` makes that the everyday
  case. `containedPath` in `run/init.ts` already documents avoiding exactly this. The fix
  is in `core/config/**`, outside this PRD's Conflict Surface, so it is on the deferral
  board with an owner rather than taken here. The fixture uses the relative form, matching
  what the repository actually ships.

- **FR-2 finding — the escape case never reaches the doctor.** Config load refuses an
  escaping entrypoint before any command runs, which is the better answer: an invalid
  configuration should stop everything rather than produce a diagnosis. The doctor keeps
  its own escape guard for callers that build a config directly, unit-tested in
  `memory.test.ts`; the end-to-end test asserts the refusal instead.

- **Scope deviation (owner-approved) — the worktree-close lease leak.** `removeWorktree`
  deleted the checkout and the branch and never unlinked the lease, so a worktree-stamped
  close left its work item IN-FLIGHT until the TTL expired and blocked every overlapping
  candidate. The plain-close path releases its lease (PRD-018 round 23); this branch of the
  same if/else was never changed with it. PRD-018's first real close hit it — twenty-six
  review rounds did not.

  Fixed here rather than deferred, and the reasons are worth keeping: this PRD's own close
  leaks the same lease, and the fix belongs inside `removeWorktree` where the teardown
  already happens rather than bolted onto the caller. The Conflict Surface was extended by
  three files (`core/run/worktree.ts`, `test/worktree.test.ts`, `test/cli-state.test.ts`)
  and re-claimed, so the fix could carry a regression instead of a promise.

  Five regressions in `test/worktree.test.ts`, mutation-checked both ways: removing the
  unlink fails three of them, and releasing the lease when removal REFUSED fails the fourth.
  That second direction matters — a lease outliving a worktree still on disk would orphan
  the claim on the directory someone is working in, which is `locks-on-main-not-worktree`
  from the other side. `leaseReleased` is reported on the removal result and printed on the
  handoff card.

  **Retires the `Worktree close leaks its lease` deferral row**, removed from `STATUS.md`.

  Cost, recorded honestly: re-claiming needed a release first, and releasing destroyed the
  stamps that make worktree REUSE possible — so the checkout had to be torn down and
  rebuilt, and the in-progress work re-applied from a patch. `gate open --worktree` on a
  PRD whose lease was just released cannot reuse its own checkout. Not fixed here; noted
  because the next agent to widen a surface mid-flight will hit it.

---

## Progress Log

| Date       | Task    | Notes |
| ---------- | ------- | ----- |
| 2026-07-25 | Phase 3 | Plan generated from PRD-019 (Approved), readiness iteration 4 PASS 8.985, and watch items W1–W7, after owner Go. No implementation started. Phase 4 entry is blocked on PRD-017 and PRD-018 Ship Verified (task 0.2). |

---

## Blockers / Open Questions

- PRD-017 and PRD-018 must both be Ship Verified before Phase 4 (task 0.2).
- Not parallelizable with PRD-018 or PRD-021: `gate queue` reports overlaps on
  `practices-pack.test.ts`, `README.md`, and `pack-drift-ledger.json`. Also overlaps
  PRD-020 on `pack-manifest.json`, `QUICKSTART.md`, and `cli.mdx` — PRD-020 is sequenced
  after this PRD for exactly that reason.

---

## Operator Handoff

> Human/runtime/staging checks the agent cannot complete. Keep the corresponding task
> checkbox unchecked until resolved or explicitly accepted.
> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`}.

| Task | Category  | Owner | Required Check | Status | Notes |
| ---- | --------- | ----- | -------------- | ------ | ----- |
| 10.3 | manual-qa | owner | Run `gate doctor --memory` on a repository you did not scaffold and judge whether its failures are actionable — the remediation text is the product here | pending | Judgement no fixture can make; the merge gate refuses until this acceptance is recorded |
