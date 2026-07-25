# Tasks: Closed-Loop Memory Contract and Enforcement

> **PRD**: [prd-018-memory-contract-enforcement.md](../../_prds/wip/prd-018-memory-contract-enforcement.md)
> **Readiness**: [readiness-018-memory-contract-enforcement.md](../../_readiness/wip/readiness-018-memory-contract-enforcement.md)
> **Status**: In Progress
> **Readiness Score**: 8.33/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-25
> **Updated**: 2026-07-25

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- Phase 4 agents hold a valid PRD-018 lock lease before editing implementation files or
  this ledger.
- Autonomous Close is **operator-gated**: the merge gate refuses until an owner-signed
  acceptance entry exists.
- No sub-task may introduce `any`, a lint bypass, a swallowed failure, a runtime
  dependency, a network call, or a push code path.
- **Phase 4 may not start until `_state/prds.json` records PRD-017 as Ship Verified**
  (task 0.2). This PRD builds directly on its parser and config.
- **Activation may not land while a foreign lease is active** (tasks 6.5 and 9.5). This
  is the whole safety argument for turning the contract on; it is not advisory.

---

## Memory Context

Records to open and confirm still accurate before the dependent task starts (task 0.3).

- `verify-check-phase-placement` — brain validation runs after capture, which is why
  `verify:brain` wires into Phase 7 and not earlier.
- `durable-artifact-must-commit` — exact output evidence must land in the merge diff, not
  merely be declared.
- `gate-wire-or-delete` — both the root and practices gates must reach an executing
  surface, or they are decoration.
- `push-is-human-by-omission` — activation adds no push path.
- `turbo-cache-masks-out-of-input-reads` — `check-egress` reads build output; the cache
  fix that made that safe landed separately as W1, so confirm it is still in place.

---

## Relevant Files

### Contract core

- `packages/provegate/src/core/memory/artifacts.ts` — new: the Inputs/Outputs grammar,
  used by the template, the lint, the runner, and the review.
- `packages/provegate/src/core/gates/prd-ready.ts` — the readiness watch gate.
- `packages/provegate/src/core/run/chain.ts`, `run/durable.ts` — Phase 7 enforcement and
  the base-ref weakening proof.
- `packages/provegate/src/core/run/init.ts` — fresh-practices generation.
- `packages/provegate/src/core/run/merge.ts` — new behavior: `gate land` reads
  `_state/locks` under the workspace mutex. It reads no locks today.

### Method content (traceable to the PRD-017 addendum only)

- `packages/provegate/templates/prd-template.md`,
  `packages/provegate/templates/{readiness,tasks}-template.md`
- `packages/provegate/prompts/**` — ten files, one stated obligation each (FR-3 table)
- `packages/provegate/practices/**`, `packages/provegate/practices/shims/**`

### Root activation (last)

- `workflow.config.json` (new), `gates.manifest.json` (new) — both become worktree
  control artifacts the moment they exist.
- `AGENT_BOOTSTRAP.md`, `CLAUDE.md`, `.cursor/rules/brain.mdc`, `_brain/PROTOCOL.md`,
  `_brain/INDEX.md`, `_brain/adr/ADR-0001-closed-loop-agent-memory.md` (new)
- `packages/provegate/README.md`, `apps/docs/content/docs/method.mdx`,
  `scripts/verify/pack-drift-ledger.json`

### Tests

- `test/content-templates.test.ts`, `test/content-prompts.test.ts`,
  `test/prd-ready.test.ts`, `test/chain.test.ts`, `test/init.test.ts`,
  `test/manifest.test.ts`, `test/open.test.ts`, `test/merge.test.ts`,
  `test/practices-pack.test.ts`

### Notes

- The manifest rule is deep-merge semantics, not style: a fresh practices manifest
  **omits** `phases.4` so configured floors survive, while this repo's manifest repeats
  the four floor commands before appending two. `phases.4: []` erases the floor and is
  forbidden by name.
- The shipped default floor order is check-types, lint, **build**, test — verified in
  `defaultManifest()`. Root Phase 4 appends `verify:workflow` and `check-egress` after it,
  and `check-egress` requires build to have run first.

---

## Tasks

- [x] 0.0 Pre-flight and ownership
  - [x] 0.1 Run `gate open PRD-018 --worktree` from the base checkout; confirm the lease
        covers the PRD Conflict Surface and record branch/worktree in the Progress Log.
  - [x] 0.2 Verify `_state/prds.json` records PRD-017 as Ship Verified. If not, STOP.
  - [x] 0.3 Open the five Memory Context records; confirm the paths and commands each
        names still exist and note any stale finding in **Deferrals & Decisions**.
  - [x] 0.4 Re-confirm W1's fix is still in place: `pnpm verify:turbo-inputs` passes and
        `web#build` still hashes `apps/web/app/**`. FR-6 wires `check-egress` into the
        floor on the strength of that fix; if it regressed, the gate would scan replayed
        bytes.
  - [x] 0.5 Capture the green baseline for `pnpm test`, `pnpm verify:workflow`, and
        `pnpm check-egress`; a pre-existing red is ledgered, never normalized silently.

- [x] 1.0 FR-1 — The artifact contract
  - [x] 1.1 Implement the Memory Inputs/Outputs grammar from the PRD-017 addendum in
        `packages/provegate/src/core/memory/artifacts.ts`: input dispositions
        (`applied` / `reviewed` / `not-applicable`) with slug and rationale; outputs as
        exact repo-relative learning or ADR paths with a rationale.
  - [x] 1.2 Enforce mutual exclusion: a non-empty output set may not contain `none`, and
        `none` requires a reason. This is the ambiguity the retired draft shipped.
  - [x] 1.3 Every declared output is also a Durable Artifact — validate the pairing here
        so the runner does not have to infer it later.
  - [x] 1.4 Normalize `path.ts::SymbolName` to `path.ts` before any glob match; the
        symbol suffix is the obvious false negative in target matching.
  - [x] 1.5 Add the grammar to `packages/provegate/templates/prd-template.md`.
  - [x] 1.6 Cover it in `packages/provegate/test/content-templates.test.ts`, including the
        ADR-output-plus-`none` collision failing.

- [x] 2.0 FR-2 — Readiness watch gate
  - [x] 2.1 In `packages/provegate/src/core/gates/prd-ready.ts`, require both sections
        when `memory.enabled` is true; resolve inputs against active indexed records and
        reject duplicates, superseded records, and missing ones by name.
  - [x] 2.2 Match each record's `watch` globs against the PRD's normalized FR Targets and
        fail on any overlap that has no input disposition, naming the record and the
        normalized path.
  - [x] 2.3 Assert the disabled path in `packages/provegate/test/prd-ready.test.ts`:
        with memory off, behavior is byte-identical to today and historical PRDs are never
        rewritten.
  - [x] 2.4 Assert the enabled path against fixtures covering each rejection reason
        separately — a single "invalid" case cannot prove five different refusals.

- [x] 3.0 FR-3 — Recall through Phase 1–7 (W3, per-file)
  - [x] 3.1 Apply the PRD's obligation table one file at a time across
        `packages/provegate/prompts/**`: phases 1–7, `knowledge-ingest.md`,
        `knowledge-lint.md`, and `orchestration-runner.md`. Each file gains exactly the
        obligation the table names — no more, and nothing invented outside the addendum.
  - [x] 3.2 Register any new placeholder token in `packages/provegate/prompts/PLACEHOLDERS.md`;
        leave `prompts/adapters/**` vendor-neutral and obligation-free.
  - [x] 3.3 Carry the contract into `templates/readiness-template.md` and
        `templates/tasks-template.md` (a Memory Context section and a per-record re-open
        task, matching what the phase-3 obligation states).
  - [x] 3.4 Update `practices/templates/AGENT_BOOTSTRAP.template.md` and
        `practices/shims/**` to match.
  - [x] 3.5 In `packages/provegate/test/content-prompts.test.ts`, assert the obligation
        **per file** — ten separate assertions keyed to the table. A test that only proves
        the directory changed is the failure mode W3 exists to prevent.
  - [x] 3.6 Assert every pre-existing frozen snapshot file is byte-unchanged, and that all
        new method content traces to the PRD-017 addendum.

- [x] 4.0 FR-4 — Phase 7 output and watch enforcement
  - [x] 4.1 In `packages/provegate/src/core/run/chain.ts` and `run/durable.ts`, check that
        every exact declared output appears in Durable Artifacts **and** in the merge
        diff — declaration without evidence is the `durable-artifact-must-commit` trap.
  - [x] 4.2 Check that every watched file changed by the diff has an input disposition.
  - [x] 4.3 Run `memory.verifyCommand` through the existing command-safety allowlist and
        require exit 0 **after** capture, per `verify-check-phase-placement`.
  - [x] 4.4 Dry-run prints every check it would perform; missing records, missing config,
        and missing baselines all fail closed.
  - [x] 4.5 Cover the whole set in `packages/provegate/test/chain.test.ts`, including the
        Phase 7 ordering.

- [x] 5.0 FR-5 — Base-ref weakening proof (W2)
  - [x] 5.1 Compare working declarations against the same PRD blob on the configured base
        ref — never against working state, which the editing agent controls.
  - [x] 5.2 Implement the matrix: append-only emergent output is legal; removal, type or
        path change, and replacement with `none` are weakening. An `eligible` PRD refuses
        outright; an `operator-gated` PRD requires both a changelog approval entry and
        owner acceptance.
  - [x] 5.3 W2 — the non-worktree path has no baseline guarantee. When the PRD blob is
        absent from the base ref, refuse with cause **and** remedy in one message:
        "PRD-NNN has no committed copy on `<base>`; commit the PRD to the base branch
        before closing, or reclaim with `--worktree`."
  - [x] 5.4 Cover both flows in `packages/provegate/test/chain.test.ts` — the worktree
        happy path and the non-worktree refusal text. Only the second is new.

- [ ] 6.0 FR-6 — Safe activation, manifest wiring, and the land barrier
  - [x] 6.1 In `packages/provegate/src/core/run/init.ts`, generate memory-enabled config
        and a manifest containing `phases.7` only for a fresh `gate init --practices`.
        The generated manifest must **omit** `phases.4` entirely so default floor commands
        survive deep merge.
  - [x] 6.2 Assert in `packages/provegate/test/init.test.ts` that existing config,
        manifests, and entrypoints stay byte-unchanged, and in `test/manifest.test.ts`
        that a fresh manifest's absent `phases.4` still resolves to the four floor
        commands while `phases.4: []` erases them.
  - [ ] 6.3 Write this repo's root `gates.manifest.json`: Phase 4 as `check-types`,
        `lint`, `build`, `test`, `verify:workflow`, `check-egress` — the shipped default
        order first, then the two additions, with `build` before `check-egress` because
        the scanner reads build output. Phase 7 runs `verify:brain`.
  - [ ] 6.4 Write the root `workflow.config.json` enabling memory. Both files are new
        worktree control artifacts from this moment; PRD-021 later adds one key to the
        config and PRD-022 closes the revalidation residual.
  - [x] 6.5 Implement the activation barrier in `packages/provegate/src/core/run/merge.ts`:
        `gate land` reads `_state/locks` **inside the workspace mutex** (`run/mutex.ts`,
        the same critical section that guards lease claims) and refuses while a foreign
        lease is active. Outside the mutex it is a check-then-merge race, not a barrier.
  - [x] 6.6 In `packages/provegate/test/merge.test.ts`, assert the refusal with a foreign
        lease present, the pass with none, and that the refusal message names the lease.
  - [x] 6.7 W5 — in `packages/provegate/test/open.test.ts`, prove the control-artifact
        **introduction** transition: a worktree leased before these files exist is refused
        on reuse, and succeeds after merging the base.
  - [ ] 6.8 Record the residual honestly in **Deferrals & Decisions**: a direct
        `git merge` bypasses the barrier, and a surviving worktree does **not** converge,
        because control artifacts are revalidated only on the claim path. Do not write a
        convergence claim anywhere — PRD-022 owns closing it.

- [ ] 7.0 FR-7 — Dogfood, ADR, and parity
  - [ ] 7.1 Apply the contract to `AGENT_BOOTSTRAP.md`, `CLAUDE.md`,
        `.cursor/rules/brain.mdc`, and `_brain/PROTOCOL.md`.
  - [ ] 7.2 Write `_brain/adr/ADR-0001-closed-loop-agent-memory.md` — the declared Memory
        Output of this PRD — and add its INDEX pointer. It carries all four ADR sections.
  - [ ] 7.3 Document the method and the manifest safety rule in
        `apps/docs/content/docs/method.mdx` and `packages/provegate/README.md`.
  - [ ] 7.4 Port every change into its genericized `practices/**` counterpart, then run
        `node scripts/verify/verify-pack-drift.mjs --reconcile` and **read its per-pair
        output** — every printed line is a change being accepted. Paste it into the
        Progress Log.
  - [ ] 7.5 Confirm no repo-specific fact leaked into the package copies (no repo name, no
        wave numbering, English only) via the existing hygiene assertions.
  - [ ] 7.6 Confirm no doctor, find, or stats CLI shipped here — that surface is PRD-019.

- [ ] 8.0 Migration & Rollback Plan (infra parent — 20% of the readiness weight)
  - [ ] 8.1 Order the work as the PRD requires: contract, prompts, runner, tests — then
        root activation **last**. Enabling before every gate exists is the one sequencing
        error that cannot be undone by a later commit.
  - [ ] 8.2 Prove the disabled path end to end: with `memory.enabled: false`, `gate check`,
        `gate status`, and the gate chain behave byte-identically to the 0.5 baseline.
  - [ ] 8.3 Record the rollback in **Deferrals & Decisions**: set `memory.enabled: false`
        and remove the root Phase 7 wiring; Markdown records survive and no data or remote
        migration exists.
  - [ ] 8.4 Record what activation costs adopters: nothing. Fresh installs get the
        memory-enabled config; existing config, manifests, and entrypoints are never
        auto-edited.
  - [ ] 8.5 W13 — confirm PRD-022 is a real PRD rather than a stub before this PRD lands,
        so FR-6's residual has an owner. It is drafted at
        `_prds/wip/prd-022-control-artifact-revalidation.md`; verify it still carries FRs
        and verification commands.

- [ ] 9.0 Phase 5 — Execute verification
  - [ ] 9.1 Run every PRD §11 command exactly as written and fill the matching
        Verification Ledger rows with evidence; no substitutions, no omissions.
  - [ ] 9.2 Run the cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`,
        `pnpm build`, `pnpm verify:workflow`, `pnpm check-egress`; record exit codes.
  - [ ] 9.3 Run `node packages/provegate/dist/cli.js check PRD-018` and
        `node packages/provegate/dist/cli.js check --wiring`.
  - [ ] 9.4 Run `gate run` against this repo with the new root manifest and confirm
        resolved Phase 4 is exactly the six commands in order, and Phase 7 runs
        `verify:brain`.
  - [ ] 9.5 Immediately before the merge, re-read `_state/locks` and confirm no foreign
        lease is active. The 0.x measurement is stale by now, and this is the barrier the
        activation depends on.

- [ ] 10.0 Phase 6 — Independent adversarial audit
  - [ ] 10.1 After Phase 5 is green, obtain an independent review (different model family,
        never the implementing agent) of the merge diff against the PRD, the PRD-017
        addendum, and watch items W1–W13. Direct it at the three sharpest attacks: can a
        declared output be removed while the gate stays green; does a watch overlap
        actually block; and did anything become reachable while memory is disabled.
  - [ ] 10.2 Save the verdict to
        `_docs/reviews/review-018-memory-contract-enforcement.md`; the ledger row may read
        `passed` only with verdict `pass` and `Critical: 0`.
  - [ ] 10.3 For each finding, append remediation sub-tasks here, fix under the same
        lease, re-run the affected Phase 5 gates, and obtain a fresh verdict.

- [ ] 11.0 Phase 7 — Durable learning and close preparation
  - [ ] 11.1 Run the `_brain/PROTOCOL.md` §7 capture. This PRD's declared output is
        ADR-0001; if implementation surfaced a non-derivable trap, append its exact path
        to both Memory Outputs and Durable Artifacts before writing the record.
  - [ ] 11.2 Confirm every declared Durable Artifact (ADR-0001, `method.mdx`, the review)
        is present in the merge diff — this PRD's own gate now enforces that, so it is
        also the first live test of FR-4.
  - [ ] 11.3 Prepare the owner handoff: the activation order evidence, the disabled-path
        proof from 8.2, the reconcile output from 7.4, the lock-table state from 9.5, and
        the independent verdict.
  - [ ] 11.4 After owner acceptance only, run `gate land PRD-018`; verify the post-merge
        gates and worktree cleanup. Never push.

---

## Verification Ledger

| Gate               | Command / Check                                             | Scope | Result  | Evidence | Notes |
| ------------------ | ------------------------------------------------------------- | ----- | ------- | -------- | ----- |
| FR-1               | `pnpm --filter provegate test test/content-templates.test.ts` | pkg   | pending |          | mutually-exclusive grammar |
| FR-2               | `pnpm --filter provegate test test/prd-ready.test.ts`         | pkg   | pending |          | watched target and disabled behavior |
| FR-3               | `pnpm --filter provegate test test/content-prompts.test.ts`   | pkg   | pending |          | per-file obligation, ten assertions |
| FR-4               | `pnpm --filter provegate test test/chain.test.ts`             | pkg   | pending |          | Phase 7 order, output and watch checks |
| FR-5               | `pnpm --filter provegate test test/chain.test.ts`             | pkg   | pending |          | base-ref weakening matrix + non-worktree refusal |
| FR-6a              | `pnpm --filter provegate test test/manifest.test.ts`          | pkg   | pending |          | exact root/practices Phase 4 semantics |
| FR-6b              | `pnpm --filter provegate test test/practices-pack.test.ts`    | pkg   | pending |          | additive practices activation |
| FR-6c              | `pnpm --filter provegate test test/open.test.ts`              | pkg   | pending |          | control-artifact introduction transition |
| FR-6d              | `pnpm --filter provegate test test/merge.test.ts`             | pkg   | pending |          | activation refuses while a foreign lease is active |
| FR-7               | `node scripts/verify/verify-pack-drift.mjs`                   | repo  | pending |          | live/package parity after reconcile |
| types              | `pnpm check-types`                                            | root  | pending |          | zero errors |
| lint               | `pnpm lint`                                                   | root  | pending |          | zero warnings |
| test               | `pnpm test`                                                   | root  | pending |          | full suite |
| build              | `pnpm build`                                                  | root  | pending |          | clean build |
| workflow           | `pnpm verify:workflow`                                        | root  | pending |          | every hygiene check green |
| egress             | `pnpm check-egress`                                           | root  | pending |          | built output scanned after build |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-018`           | repo  | pending |          | readiness lint |
| gate-wiring        | `node packages/provegate/dist/cli.js check --wiring`          | repo  | pending |          | wire-or-delete |
| independent-review | `_docs/reviews/review-018-memory-contract-enforcement.md`     | repo  | pending |          | verdict pass, Critical: 0 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Readiness Watch Coverage

| Watch | Binding tasks |
| ----- | ------------- |
| W1 — the sixth floor gate must not scan stale bytes (resolved outside this PRD) | 0.4 |
| W2 — non-worktree baseline refusal names its remedy | 5.3, 5.4 |
| W3 — per-prompt obligations, asserted per file | 3.1, 3.5 |
| W4 — activation blast radius | 6.5, 6.6, 9.5 |
| W5 — introduction-transition fixture is named and run | 6.7 |
| W6–W8 — no grandfathering boundary (mechanism removed) | 6.5, 6.8 |
| W9 — the lock read is atomic with the merge | 6.5 |
| W10–W12 — bypass and non-convergence stated, not claimed away | 6.8, 8.5 |
| W13 — PRD-022 is a real PRD before this one lands | 8.5 |

---

## Deferrals & Decisions

- Phase 3 decision — `infra` skeleton: Migration & Rollback is its own parent (task 8.0),
  and activation ordering lives there rather than inside FR-6, because ordering is what
  carries this class's 20% weight.
- Phase 3 decision — no grandfathering mechanism is planned. Readiness iterations 3–5
  measured every candidate boundary as unsound: the lease persists no base SHA, commit
  timestamps are mutable, and a merge commit cannot contain its own SHA. The land-time
  lease barrier replaces it, and the residual is recorded rather than engineered around.
- Task 0.3 stale finding — `turbo-cache-masks-out-of-input-reads` names a remedy the repo
  has since forbidden. The record says to add out-of-package paths to the turbo task's
  `inputs`; `verify:turbo-inputs` now fails **any** cached task that declares `inputs`
  without an exceptions entry, precisely because an enumeration silently rots. The hazard
  itself is still live and was re-measured, not assumed: `provegate#test` hashes 179
  inputs, none of them outside the package, while `test/review-quorum.test.ts:70` reads
  `../../../_docs/reviews`. So a change confined to `_docs/reviews/` cannot bust that
  cache. This is the same shape as the "Frozen-snapshot digest" deferral opened at the
  PRD-017 close (owner, due 2026-08-29), which names the snapshot corpus rather than
  `_docs/reviews/`; both want a cache-free `scripts/verify/` gate. Out of PRD-018's
  surface — recorded, not taken. The other four records verified accurate:
  `gate-wire-or-delete` is enforced live (`verify:gates-wired`, 10 registered / 10 on
  disk), `push-is-human-by-omission` holds (`gate push` refuses in the shipped CLI help),
  and the two workflow-seed records name no path that could drift.
- Phase 4 scope decision (owner-approved 2026-07-25) — **`packages/provegate/src/cli.ts` is
  edited although PRD-018's Conflict Surface does not declare it.** One argument on one
  line: `lintPrd(config, manifest, content)` → `lintPrd(config, manifest, content, root)`.
  FR-2's gate resolves declared inputs against the real record store, so it needs a
  repository root, and `gate check` is the only caller. Not wiring it was not the safe
  option: `lintPrd` fails closed when memory is enabled without a root, so FR-6's
  activation would have broken `gate check` for **every** PRD in this repo — and an
  unwired gate is what `gate-wire-or-delete`, one of this PRD's own Memory Inputs, exists
  to forbid. `gate queue` reports the file claimed by PRD-019/021/022/023; none holds an
  active lease, so there is no concurrent writer. The signature matches the house shape
  `auditWiring(config, manifest, root)` already uses.
- Task 0.4 measurement — W1 holds. `verify:turbo-inputs` PASS (6 tasks); `turbo.json`
  declares no `inputs` on `build`, and `web#build` hashes 14 files of which 6 are under
  `app/`. `check-egress` therefore scans bytes the cache key covers.

---

## Progress Log

| Date       | Task    | Notes |
| ---------- | ------- | ----- |
| 2026-07-25 | Phase 3 | Plan generated from PRD-018 (Approved), readiness iteration 6 PASS 8.33, and watch items W1–W13, after owner Go. No implementation started. Phase 4 entry is blocked on PRD-017 Ship Verified (task 0.2). |
| 2026-07-25 | 0.0–0.5 | Phase 4 opened. `gate open PRD-018 --worktree` claimed 22 surface globs; branch `feat/prd-018-memory-contract-enforcement`, worktree `.worktrees/prd-018-memory-contract-enforcement`, lease `_state/locks/prd-018-memory-contract-enforcement.json`. `open` printed two fatal-looking lines — `workflow.config.json` and `gates.manifest.json` absent in the base commit — which is the expected pre-activation state: FR-6 creates both, so there is nothing yet to materialize. 0.2 met: `_state/prds.json` records PRD-017 `Ship Verified` (58/58, land `823d766`, board close `b916307`). Baseline green and captured: `pnpm test` 41 files / 552 tests, `pnpm verify:workflow` PASS across all nine checks, `pnpm check-egress` clean, `pnpm build` 4/4. Nothing pre-existing red, so nothing ledgered as normalized. Two findings recorded in Deferrals & Decisions (0.3, 0.4). No implementation files touched yet. |

---

## Blockers / Open Questions

- ~~PRD-017 must be Ship Verified before Phase 4 (task 0.2).~~ **Cleared 2026-07-25** —
  `_state/prds.json` records it Ship Verified; lease released before this one was claimed.
- Not parallelizable. Re-run at Phase 4 open rather than read from this list, per task
  0.2.1's standing instruction: `gate queue` now reports PRD-018 overlapping **four** PRDs
  — PRD-019 (`practices-pack.test.ts`, `README.md`, `pack-drift-ledger.json`), PRD-021
  (`prd-ready.ts`, `prd-ready.test.ts`, `pack-drift-ledger.json`), PRD-022
  (`method.mdx`), and PRD-023 (`prd-ready.ts`, `durable.ts`, `init.ts`,
  `practices-pack.test.ts`, `_brain/**`, `pack-drift-ledger.json`). The PRD-017 and
  `content-prompts.test.ts` entries this list carried are gone with PRD-017's close.
- ~~PRD-022 must be more than a stub before this PRD lands (task 8.5); it is currently
  Draft and unscored.~~ **Cleared 2026-07-25** — PRD-022 is Approved, readiness PASS 9.10,
  73 tasks planned. Task 8.5 still verifies this at land time rather than trusting the row.

---

## Operator Handoff

> Human/runtime/staging checks the agent cannot complete. Keep the corresponding task
> checkbox unchecked until resolved or explicitly accepted.
> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`}.

| Task | Category  | Owner | Required Check | Status | Notes |
| ---- | --------- | ----- | -------------- | ------ | ----- |
| 11.3 | manual-qa | owner | Accept activation: from this merge every future PRD passes through the memory lint. Confirm you want the contract on repo-wide, and that no other lease is active at merge time | pending | The one-way step in this program; the merge gate refuses until this acceptance is recorded |
| 6.5  | manual-qa | owner | Clear or wait out any foreign lease before landing. If the workspace mutex holds a stale marker from a crashed holder, it fails closed by design and needs manual recovery | pending | Bounded by lease TTL; recovery is documented in `run/mutex.ts` |
