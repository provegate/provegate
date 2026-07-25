# Tasks: Agent Memory Substrate

> **PRD**: [prd-017-agent-memory-substrate.md](../../_prds/wip/prd-017-agent-memory-substrate.md)
> **Readiness**: [readiness-017-agent-memory-substrate.md](../../_readiness/wip/readiness-017-agent-memory-substrate.md)
> **Status**: In Progress
> **Readiness Score**: 8.425/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-25
> **Updated**: 2026-07-25

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- Phase 4 agents hold a valid PRD-017 lock lease before editing implementation files or
  this ledger.
- Autonomous Close is **operator-gated**: the merge gate refuses until an owner-signed
  acceptance entry exists (this PRD writes the method's own source addendum).
- No sub-task may introduce `any`, a lint bypass, a swallowed failure, a runtime
  dependency, a network call, or a push code path.

---

## Memory Context

Records selected as PRD-017 Memory Inputs. Open each detail file and confirm the paths
and commands it names still exist **before** the dependent task starts (task 0.2).

- `memory-index-vs-detail` — the small always-loaded INDEX plus on-demand detail stays;
  this PRD validates that shape, it does not replace it.
- `gate-wire-or-delete` — both parser surfaces need an executing check, not just code.
- `turbo-cache-masks-out-of-input-reads` — the corpus and any fixture reading paths
  outside the package's turbo inputs will replay a stale green unless declared.

---

## Relevant Files

### Method source (written first — everything else traces to it)

- `docs/research/provegate-bootstrap/source-snapshot/addenda/agent-memory-closed-loop-2026-07-25.md`
  — new, owner-approved addendum; the traceability source for all three memory PRDs.
- `docs/research/provegate-bootstrap/source-snapshot/MANIFEST.md` — addendum inventory.
- `docs/research/provegate-bootstrap/DECISIONS.md` — post-bootstrap extension rule.

### Core

- `packages/provegate/src/core/config/{types,defaults,validate}.ts` — default-off memory
  configuration block.
- `packages/provegate/src/core/memory/{parse,index}.ts` — new: supported frontmatter
  subset, typed record model, path containment.
- `packages/provegate/src/index.ts` — public surface.

### Standalone verification (no package import allowed)

- `scripts/verify/{lib,verify-brain}.mjs` — live stdlib-only validator.
- `packages/provegate/practices/verify/{lib,verify-brain}.mjs` — shipped copies.
- `scripts/verify/pack-drift-ledger.json` — the root/package hash pairs.

### Memory content

- `_brain/{PROTOCOL.md,INDEX.md,_templates/learning.md,_templates/adr.md}` — the schema
  is specified here; records themselves are asserted, not migrated (see W10).
- `packages/provegate/practices/brain/**` — genericized copies of the same.

### Tests

- `packages/provegate/test/memory.test.ts` — new: config + typed parser.
- `packages/provegate/test/fixtures/memory-record-cases.json` — new: the one corpus both
  parsers must agree on.
- `packages/provegate/test/practices-pack.test.ts` — standalone verifier against the same
  corpus, plus pack parity.
- `packages/provegate/test/content-prompts.test.ts` — addendum traceability and frozen
  snapshot bytes.

### Notes

- The TypeScript parser and the standalone verifier **cannot** import each other: the
  installed verifier runs in an adopter repo with no `provegate` package present. The
  shared corpus is their only contract — this is why W12 is the sharpest audit target.
- Root and `practices/` copies are hash-paired. Editing one side without the other is a
  gate failure by design; see task 5.4 for the reconcile procedure.

---

## Tasks

- [x] 0.0 Pre-flight and ownership
  - [x] 0.1 Run `gate open PRD-017 --worktree` from the base checkout; confirm the lease
        covers the PRD Conflict Surface and record branch/worktree in the Progress Log of
        `_tasks/wip/tasks-017-agent-memory-substrate.md`.
  - [x] 0.2 In the worktree, open `_brain/learnings/memory-index-vs-detail.md`,
        `_brain/learnings/gate-wire-or-delete.md`, and
        `_brain/learnings/turbo-cache-masks-out-of-input-reads.md`; confirm every path and
        command each one names still exists, and record any stale finding in
        **Deferrals & Decisions** before implementing.
  - [x] 0.3 Capture the green baseline for `pnpm verify:workflow`, `pnpm verify:brain`,
        `node scripts/verify/verify-pack-drift.mjs`, and the package suite in the Progress
        Log; a pre-existing red must be ledgered, never normalized silently.
  - [x] 0.4 Re-measure and record the W10 baseline in the Progress Log so the plan is
        acting on current facts, not on the readiness snapshot: count `_brain/INDEX.md`
        hooks over 120 characters, and count records in `_brain/learnings/` missing
        `**Why:**`, `**How to apply:**`, or `provenance`. Expected at Phase-3 time: 0 and
        0. A non-zero count re-opens the migration question in **Deferrals & Decisions**.

- [x] 1.0 FR-1 — Canonical method provenance (W7 lineage, blocking)
  - [x] 1.1 Write
        `docs/research/provegate-bootstrap/source-snapshot/addenda/agent-memory-closed-loop-2026-07-25.md`
        BEFORE any shipped method byte changes: the three-PRD program, the exact Memory
        Inputs/Outputs grammar (including that a non-empty output set may not contain
        `none`), `_brain`-versus-product-doc boundary, watch and weakening semantics,
        deterministic local CLI constraints, and the offline/zero-dependency/no-push
        invariants.
  - [x] 1.2 Append only the new inventory entry to
        `docs/research/provegate-bootstrap/source-snapshot/MANIFEST.md`.
  - [x] 1.3 Record the post-bootstrap extension rule and the PRD-017 owner decision in
        `docs/research/provegate-bootstrap/DECISIONS.md`; do not restate the addendum body.
  - [x] 1.4 In `packages/provegate/test/content-prompts.test.ts`, assert every
        pre-existing frozen snapshot file is byte-unchanged (hash the set, fail on any
        delta) and that the manifest lists the addendum. This is the test that makes
        "frozen" mean something.

- [ ] 2.0 FR-2 — Default-off memory configuration
  - [ ] 2.1 Add the optional `memory` block (`enabled`, `root`, `index`, `entrypoints`,
        `verifyCommand`, `retroAfterCompleted`) to
        `packages/provegate/src/core/config/types.ts`.
  - [ ] 2.2 Add disabled-by-default values to
        `packages/provegate/src/core/config/defaults.ts`; a repo with no config keeps
        exactly today's behavior.
  - [ ] 2.3 Validate in `packages/provegate/src/core/config/validate.ts`: types, unknown
        keys, `retroAfterCompleted` as a non-negative integer, `verifyCommand` through the
        existing command-safety allowlist, and every path repo-relative and contained.
  - [ ] 2.4 W13 — resolve the dead-config window in
        `packages/provegate/src/core/config/types.ts` and **Deferrals & Decisions**:
        `verifyCommand` and `retroAfterCompleted` are validated here but consumed by
        nobody until PRD-018. Either document the window as accepted in the type comment,
        or keep the fields internal until 018 — decide once, record which and why.
  - [ ] 2.5 Add config tests to `packages/provegate/test/memory.test.ts`: defaults are
        disabled, an unsafe `verifyCommand` is rejected, a negative or fractional cadence
        is rejected, an absolute / `..` / cross-root / symlinked path is rejected with a
        path-tagged message, and an unknown key fails.

- [ ] 3.0 FR-3 — Typed record parser and schema
  - [ ] 3.1 Implement the supported frontmatter subset in
        `packages/provegate/src/core/memory/parse.ts`: scalar, folded scalar (`>-`) with
        its body actually read, and inline list. Anything outside the subset fails with a
        path-tagged error — never a silent degrade or a guess.
  - [ ] 3.2 Implement typed learning validation in the same file: meaningful non-empty
        `description`, valid `provenance`, `type` ∈ the documented set, `scope`, `status`,
        `superseded-by` required when superseded, and `**Why:**` + `**How to apply:**`
        bodies for `gotcha`/`convention`/`decision`.
  - [ ] 3.3 Implement ADR validation in the same file: `type: decision` plus the
        Context / Decision / Consequences / Alternatives sections.
  - [ ] 3.4 Validate optional `tags` and `watch` as non-empty slug/glob arrays; reuse the
        repository containment primitive so a `watch` glob cannot escape the workspace.
  - [ ] 3.5 Export the typed model through `packages/provegate/src/core/memory/index.ts`
        and `packages/provegate/src/index.ts`, honoring the 2.4 decision.
  - [ ] 3.6 Add parser tests to `packages/provegate/test/memory.test.ts` covering the
        positive shapes; the deny cases come from the shared corpus in 4.2 so they cannot
        drift from the standalone verifier's.

- [ ] 4.0 FR-4 — Standalone verifier and the two-parser contract (W12)
  - [ ] 4.1 W12 — write the corpus coverage matrix into
        `packages/provegate/test/fixtures/memory-record-cases.json` as a documented header
        block first: every validated field × every failure mode it can exhibit
        (missing, empty, wrong type, placeholder, out-of-set, unsupported YAML, containment
        escape, duplicate, broken supersession), plus the positive baseline. The matrix is
        the contract; the cases implement it.
  - [ ] 4.2 Populate the corpus per that matrix. Each case carries an id, the record
        bytes, and the expected outcome — never a per-parser expectation.
  - [ ] 4.3 Upgrade `scripts/verify/lib.mjs` and `scripts/verify/verify-brain.mjs` to the
        same schema: real folded-scalar reading, meaningful description, body sections,
        ADR sections and type, status/supersession, tags/watch containment, exactly one
        INDEX pointer per public record, unique names, and no public pointer resolving
        under `private/`.
  - [ ] 4.4 W10 — implement the 120-character INDEX hook limit in
        `scripts/verify/verify-brain.mjs` as a **forward-only constraint** measured over
        hook text after the Markdown link. Do not shorten any existing hook: the measured
        baseline is zero violations (longest 102). If 0.4 reported a non-zero count, stop
        and reconcile with **Deferrals & Decisions** before editing a record.
  - [ ] 4.5 Mirror 4.3 and 4.4 into
        `packages/provegate/practices/verify/{lib,verify-brain}.mjs`; the shipped copy is
        genericized, so port behavior, not repo-specific wording.
  - [ ] 4.6 Run the same corpus against the TypeScript parser in
        `packages/provegate/test/memory.test.ts` and against the spawned standalone
        verifier in `packages/provegate/test/practices-pack.test.ts`; a case whose two
        outcomes disagree fails both suites.
  - [ ] 4.7 W10 mutation cover in `packages/provegate/test/practices-pack.test.ts`: a
        121-character hook turns the validator red, a `gotcha` record with no `**Why:**`
        turns it red, and an empty `description: >-` turns it red — each proven by
        mutation, not by asserting today's green.
  - [ ] 4.8 Declare the corpus and any out-of-package path the new tests read as explicit
        turbo inputs for the package test task; a fixture read from outside declared
        inputs replays a cached green (`turbo-cache-masks-out-of-input-reads`). Verify by
        re-running the affected suite with the cache busted.

- [ ] 5.0 FR-5 — Schema documentation and pack parity (W10, W11)
  - [ ] 5.1 Specify the validated schema in `_brain/PROTOCOL.md` — this file is the human
        spec the validator now enforces; state the supported frontmatter subset explicitly
        and that unsupported YAML fails.
  - [ ] 5.2 Update `_brain/_templates/learning.md` and `_brain/_templates/adr.md` to match
        the enforced schema exactly. Note: the ADR template already carries all four
        required sections — verify before editing.
  - [ ] 5.3 W10 — assert, do not migrate: add a check that every existing record in
        `_brain/learnings/` passes the strengthened validator unchanged. Editing a
        conforming record is forbidden here — each needless edit forces a paired pack
        change plus a ledger reconcile for no gain.
  - [ ] 5.4 W11 — sync the genericized copies under
        `packages/provegate/practices/brain/**` for every file 5.1–5.2 touched, then run
        `node scripts/verify/verify-pack-drift.mjs --reconcile` and **read its per-pair
        output**: every line it prints is a change being accepted. Paste that output into
        the Progress Log. Reconciling without reading it is the failure mode the ledger
        exists to prevent.
  - [ ] 5.5 Confirm no repo-specific fact leaked into the package copies (no repo name,
        no wave/practice numbering, English only) via the existing hygiene assertions in
        `packages/provegate/test/practices-pack.test.ts`.

- [ ] 6.0 Migration & Rollback Plan (infra parent — 20% of the readiness weight)
  - [ ] 6.1 Prove the no-op claim: with the branch applied, `pnpm verify:brain` passes
        against the untouched live `_brain/` tree. Record the record count in the Progress
        Log; it must still be 23 unless a record was legitimately added.
  - [ ] 6.2 Prove default-off compatibility in `packages/provegate/test/memory.test.ts`:
        with no `memory` config and with `memory.enabled: false`, `gate check`,
        `gate status`, and the gate chain behave byte-identically to the pre-PRD baseline.
        This is the whole safety argument — assert it, don't assume it.
  - [ ] 6.3 Record the rollback procedure in **Deferrals & Decisions**: revert the
        parser/config/verifier commits; no state file, cache, remote resource, or record
        rewrite is involved, so revert is complete by construction.
  - [ ] 6.4 Confirm the deployment order holds: this PRD enables nothing, creates no root
        `workflow.config.json`, adds no gate to `gates.manifest.json`, and changes no
        phase prompt or PRD template. Grep the diff to prove it and note the result.

- [ ] 7.0 Phase 5 — Execute verification
  - [ ] 7.1 Run every PRD §11 command exactly as written from the repository root and
        fill the matching Verification Ledger rows below with evidence; no command may be
        substituted or omitted.
  - [ ] 7.2 Run the cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`,
        `pnpm build`, `pnpm verify:workflow`; record exit codes.
  - [ ] 7.3 Run `node packages/provegate/dist/cli.js check PRD-017` and
        `node packages/provegate/dist/cli.js check --wiring`; both must be green with the
        new checks registered.
  - [ ] 7.4 W9-class invariants: assert `packages/provegate/package.json` still declares
        zero runtime dependencies, no new source or packed script contains a push path,
        and the new CLI surface count is zero (this PRD ships no command).
  - [ ] 7.5 Re-run the package suite with the turbo cache busted and confirm the result
        matches the cached run; a divergence means 4.8 is incomplete.

- [ ] 8.0 Phase 6 — Independent adversarial audit
  - [ ] 8.1 After Phase 5 is green, obtain an independent review (different model family,
        never the implementing agent) of the merge diff against the PRD, the addendum, and
        watch items W10–W13. Direct it at the two highest-leverage attacks: is the corpus
        matrix actually complete, or does it merely make both parsers agree; and did any
        behavior become reachable while memory is disabled.
  - [ ] 8.2 Save the structured verdict to
        `_docs/reviews/review-017-agent-memory-substrate.md`; the ledger row may read
        `passed` only with verdict `pass` and `Critical: 0`.
  - [ ] 8.3 For each finding, append remediation sub-tasks here, fix under the same lease,
        re-run the affected Phase 5 gates, and obtain a fresh verdict.

- [ ] 9.0 Phase 7 — Durable learning and close preparation
  - [ ] 9.1 Run the `_brain/PROTOCOL.md` §7 capture against the completed work. The PRD
        declares Memory Outputs `none`; if implementation surfaced a non-derivable trap,
        append its exact learning path to **both** the PRD's Memory Outputs and its
        Durable Artifacts before writing the file — never write the record first.
  - [ ] 9.2 Confirm every declared Durable Artifact (the addendum, `_brain/PROTOCOL.md`,
        and the review artifact) is present in the merge diff.
  - [ ] 9.3 Prepare the owner handoff: addendum fidelity, W10–W13 evidence, the
        independent verdict, the measured no-op proof from 6.1, and the local merge plan.
        Leave the operator row pending.
  - [ ] 9.4 After owner acceptance only, run `gate land PRD-017`; verify the post-merge
        gates and worktree cleanup. Never push — the handoff ends with the human push
        instruction.

---

## Verification Ledger

| Gate               | Command / Check                                             | Scope | Result  | Evidence | Notes |
| ------------------ | ----------------------------------------------------------- | ----- | ------- | -------- | ----- |
| FR-1               | `pnpm --filter provegate test test/content-prompts.test.ts` | pkg   | pending |          | addendum traceability, frozen snapshot bytes |
| FR-2               | `pnpm --filter provegate test test/memory.test.ts`          | pkg   | pending |          | config validation and default-off compatibility |
| FR-3               | `pnpm --filter provegate test test/memory.test.ts`          | pkg   | pending |          | typed parser and schema corpus |
| FR-4a              | `pnpm --filter provegate test test/practices-pack.test.ts`  | pkg   | pending |          | standalone mutations and cross-parser conformance |
| FR-4b              | `node scripts/verify/verify-brain.mjs`                      | repo  | pending |          | live records pass unchanged |
| FR-5               | `node scripts/verify/verify-pack-drift.mjs`                 | repo  | pending |          | live/package parity after reconcile |
| types              | `pnpm check-types`                                          | root  | pending |          | zero errors |
| lint               | `pnpm lint`                                                 | root  | pending |          | zero warnings |
| test               | `pnpm test`                                                 | root  | pending |          | full suite |
| build              | `pnpm build`                                                | root  | pending |          | clean build |
| workflow           | `pnpm verify:workflow`                                      | root  | pending |          | every hygiene check green |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-017`         | repo  | pending |          | readiness lint |
| gate-wiring        | `node packages/provegate/dist/cli.js check --wiring`        | repo  | pending |          | wire-or-delete |
| independent-review | `_docs/reviews/review-017-agent-memory-substrate.md`        | repo  | pending |          | verdict pass, Critical: 0 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Readiness Watch Coverage

| Watch | Binding tasks |
| ----- | ------------- |
| W10 — no phantom migration | 0.4, 4.4, 4.7, 5.3 |
| W11 — name the reconcile obligation | 5.4 |
| W12 — corpus coverage contract | 4.1, 4.2, 4.6, 8.1 |
| W13 — acknowledge the dead-config window | 2.4 |

---

## Deferrals & Decisions

- Phase 3 decision — FR-4's hook shortening and FR-5's record migration are planned as
  forward-only constraints proven by mutation, not as migration steps: measurement at
  readiness iteration 3 found 0 INDEX hooks over 120 (longest 102) and 23/23 records
  already carrying `**Why:**`, `**How to apply:**`, and `provenance`. Task 0.4 re-measures
  before any editing decision.
- 1.4 — the frozen-snapshot digest lives in `content-prompts.test.ts` as the PRD says, not in a `scripts/verify/` gate. A verify script would be cache-immune, but adding one means touching `verify-workflow.mjs` and `package.json`, neither of which is in this PRD's Conflict Surface (and `verify-workflow.mjs` is claimed by PRD-021). Residual risk: a docs-only snapshot edit could replay a cached local pass; CI checks out fresh with no restored turbo cache, so the gate is real there. Recorded rather than hidden.
- (none deferred yet)

---

## Progress Log

| Date       | Task | Notes |
| ---------- | ---- | ----- |
| 2026-07-25 | 0.0-1.0 | Phase 4 opened: lease + worktree `.worktrees/prd-017-agent-memory-substrate` (branch `feat/prd-017-agent-memory-substrate`), `pnpm install` in the worktree (a fresh worktree has no node_modules). Baselines green: verify:workflow, verify:brain, verify:pack-drift, verify:turbo-inputs. W10 re-measured at 0 overlong hooks and 0 schema violations across 23 records — the plan's no-migration prohibition holds. Addendum written (English; the manifest entry is Turkish to match that research file), listed in MANIFEST.md, rule recorded in DECISIONS.md. Frozen snapshot pinned by digest over 74 files, mutation-checked: appending one byte to a snapshot file turns the test red. |
| 2026-07-25 | Phase 3 | Plan generated from PRD-017 (Approved), readiness iteration 3 PASS 8.425, and watch items W10–W13, after owner Go. `infra` skeleton: Migration & Rollback is its own parent (task 6.0) because deployment ordering carries 20% of this class's readiness weight. No implementation started. |

---

## Blockers / Open Questions

- (none)

---

## Operator Handoff

> Autonomous Close is **operator-gated** — this PRD writes the method's own source
> addendum, so the owner signs off on the method content before merge. Rows here MUST be
> table rows: the state builder counts table and checkbox rows in this section, and prose
> alone counts as zero operator rows.

| Task | Category   | Owner | Required Check | Status | Notes |
| ---- | ---------- | ----- | -------------- | ------ | ----- |
| 10.0 | acceptance | owner | Review the source addendum against the approved method extension, the W10–W13 evidence, and the independent PASS/Critical-0 verdict; authorize the local merge | pending | Push stays a separate human action after the verified local merge |
