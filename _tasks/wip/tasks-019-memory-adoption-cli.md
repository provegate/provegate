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

- [ ] 0.0 Pre-flight and ownership
  - [ ] 0.1 Run `gate open PRD-019 --worktree` from the base checkout; confirm the lease
        covers the PRD Conflict Surface and record branch/worktree in the Progress Log.
  - [ ] 0.2 Verify the dependency chain: `_state/prds.json` records **both** PRD-017 and
        PRD-018 as Ship Verified. If either is not, STOP — this is a block, not a
        deferral.
  - [ ] 0.3 Open the five Memory Context records; confirm the paths and commands each
        names still exist and note any stale finding in **Deferrals & Decisions**.
  - [ ] 0.4 Re-confirm the two measured facts the plan rests on: `ls -la AGENTS.md` still
        shows a symlink to `CLAUDE.md`, and `NEXT_STEPS.md` plus the shims are still
        `packOnly` in `scripts/verify/pack-drift-ledger.json`. Both changed meaning during
        readiness; a different answer changes FR-2 and FR-5.
  - [ ] 0.5 Capture the green baseline for `pnpm test`, `pnpm verify:workflow`, and
        `pnpm check-egress`; a pre-existing red is ledgered, never normalized silently.

- [ ] 1.0 FR-1 — Read-only memory doctor
  - [ ] 1.1 Create `packages/provegate/src/core/memory/doctor.ts` consuming PRD-017's
        config and parser. It must not re-implement validation or infer enablement — a
        second validator that disagrees with the first is worse than no doctor.
  - [ ] 1.2 Implement the mandatory local checks, each with a stable non-zero code: memory
        config present and contained, root and index resolvable, records validating, at
        least one configured entrypoint carrying the canonical bootstrap/INDEX pointer,
        the standalone verify script present, the package script wired, and Phase 7
        manifest reachability.
  - [ ] 1.3 Implement the warning-only checks: CI literal reachability (layouts are
        user-defined, so absence warns) and unfilled practice placeholders.
  - [ ] 1.4 W1 — symlink semantics: an in-repo symlinked entrypoint is **valid**
        (containment rejects escapes, not symlinks), two configured entrypoints resolving
        to the same real file count as **one** satisfied entrypoint, and a symlink
        resolving outside the repository fails as an escape.
  - [ ] 1.5 W3 — bare `gate doctor` with no mode flag prints usage and exits 1 in
        `packages/provegate/src/cli.ts`, matching `gate renew` and `gate release`.
  - [ ] 1.6 Wire `gate doctor --memory [--json]` in `cli.ts` and export the typed result
        through `core/memory/index.ts` and `src/index.ts`.

- [ ] 2.0 FR-2 — Stable output and the partial-install matrix
  - [ ] 2.1 Human output names the failing check and its repair; JSON exposes `ok`,
        `checks[]`, `code`, `severity`, `detail`. Both render from one typed result so an
        adapter cannot change semantics.
  - [ ] 2.2 In `packages/provegate/test/practices-pack.test.ts`, build the matrix: fresh
        practices, existing config/manifest, missing index, missing script, missing
        package script, missing Phase 7 wiring, several entrypoint combinations,
        placeholder residue, disabled memory, and the CI warning.
  - [ ] 2.3 Add the three W1 symlink cases to the same matrix, using this repository's own
        `AGENTS.md` → `CLAUDE.md` as the fixture.
  - [ ] 2.4 Prove non-mutation by before/after tree hash — the assertion that converts
        "doctor never writes" from a claim into a gate. Cover both the passing and the
        failing paths; a diagnostic that writes only when it fails is still a writer.

- [ ] 3.0 FR-3 — Deterministic recall
  - [ ] 3.1 Create `packages/provegate/src/core/memory/find.ts`. Require at least one
        selector; validate repo-relative contained path selectors and active indexed
        records **before** ranking, so recall can never surface a record the validator
        would reject.
  - [ ] 3.2 Implement the ranking exactly as specified: watched-path overlap, then exact
        name/tag, then case-insensitive description/name token matches, then lexical slug
        as the final tie-break. The tie-break is what makes runs byte-stable.
  - [ ] 3.3 Implement bounds: default limit 20, allowed 1–1000, out-of-range refused
        before any result is computed.
  - [ ] 3.4 Results carry slug, type, scope, description, path, and the matched reasons —
        the reasons are the honesty mechanism, since ranking is deterministic rather than
        relevant.
  - [ ] 3.5 Disabled memory refuses with remediation instead of returning an empty list;
        an empty list reads as "nothing relevant", which would be a lie.
  - [ ] 3.6 Wire `gate memory find [--query] [--paths] [--tag] [--limit] [--json]` in
        `cli.ts` and export through both index files.

- [ ] 4.0 FR-4 — Bounds, portability, safety
  - [ ] 4.1 In `packages/provegate/test/single-package.test.ts`, cover query/tag/path
        combinations, multi-reason ties, both limit boundaries, and a 1000-record input.
  - [ ] 4.2 Cover Unicode and case behavior, and Windows path separators in selectors.
  - [ ] 4.3 Cover containment: absolute, `..`, and symlink-escape selectors each refuse
        with a path-tagged message and return **no partial result**.
  - [ ] 4.4 Cover exclusion: superseded records and anything under `private/` never appear
        in public results.
  - [ ] 4.5 Assert byte-stable JSON across two identical runs, and no repository writes.
  - [ ] 4.6 Declare the record fixtures as explicit turbo inputs for the package test
        task, then re-run with the cache busted and confirm the result matches; a fixture
        read from outside declared inputs replays a cached green.

- [ ] 5.0 FR-5 — Adoption guidance and distribution
  - [ ] 5.1 Update `practices/NEXT_STEPS.md` and `practices/shims/**` with doctor and find
        behavior, activation order, warnings versus failures, no-overwrite, local-only
        recall, and the explicit stats deferral.
  - [ ] 5.2 Update `packages/provegate/README.md`, `QUICKSTART.md`, and
        `apps/docs/content/docs/cli.mdx` with the same, including bare `gate doctor`.
  - [ ] 5.3 W2/W5 — distribution is **registration, not reconciliation**. If and only if
        a new packed file ships, add it to `packages/provegate/test/pack-manifest.json`
        and declare it in the ledger's `packOnly[]` (or pair it). Editing the existing
        `packOnly` files creates no ledger obligation, and `--reconcile` writes the ledger
        so it is never evidence.
  - [ ] 5.4 Run the read-only evidence: `pnpm verify:pack-drift` (refuses an undeclared
        packed file by name) and `pnpm --filter provegate test test/pack.test.ts` (the
        allowlist against `npm pack --dry-run`).
  - [ ] 5.5 Run the root dogfood doctor and record its output in the Progress Log; it must
        be green against this repository's own wiring.
  - [ ] 5.6 Assert the docs claims in `packages/provegate/test/content-launch.test.ts`
        semantically — the behavior each command promises, not the presence of its name.

- [ ] 6.0 FR-6 — Invariants and compatibility
  - [ ] 6.1 Assert `packages/provegate/package.json` still declares zero runtime
        dependencies, and that no new source or packed file contains a network call, an
        embedding, a persistent index, or a push path.
  - [ ] 6.2 Assert practices init stays additive-only and existing commands are unchanged.
  - [ ] 6.3 Assert single-package repositories behave identically.
  - [ ] 6.4 Run `pnpm check-egress` and confirm `scripts/check-static-egress.mjs` still
        passes against built output.

- [ ] 7.0 Migration & Rollback Plan (infra parent — 20% of the readiness weight)
  - [ ] 7.1 Prove the additive claim: with the branch applied and memory disabled, every
        pre-existing command behaves byte-identically to the recorded baseline from 0.5.
  - [ ] 7.2 Record the rollback in **Deferrals & Decisions**: remove the two CLI routes
        and the two core modules; records stay readable Markdown, no state file, cache,
        or remote resource is involved.
  - [ ] 7.3 Confirm the deployment order held: this PRD enables nothing, changes no
        manifest, and adds no gate — it only reports on what PRD-017 and PRD-018 built.
        Grep the diff to prove it.
  - [ ] 7.4 Decide and record whether the new commands warrant a changeset entry; a new
        public CLI surface normally does.

- [ ] 8.0 Phase 5 — Execute verification
  - [ ] 8.1 Run every PRD §11 command exactly as written from the repository root and fill
        the matching Verification Ledger rows with evidence; no substitutions, no
        omissions.
  - [ ] 8.2 Run the cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`,
        `pnpm build`, `pnpm verify:workflow`, `pnpm check-egress`; record exit codes.
  - [ ] 8.3 Run `node packages/provegate/dist/cli.js check PRD-019` and
        `node packages/provegate/dist/cli.js check --wiring`; both must be green.
  - [ ] 8.4 Re-run the package suite with the turbo cache busted and confirm the result
        matches the cached run; a divergence means 4.6 is incomplete.

- [ ] 9.0 Phase 6 — Independent adversarial audit
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
| FR-1               | `pnpm --filter provegate test test/memory.test.ts`            | pkg   | pending |          | doctor checks and stable codes |
| FR-2               | `pnpm --filter provegate test test/practices-pack.test.ts`    | pkg   | pending |          | partial-install matrix, symlinks, non-mutation |
| FR-3               | `pnpm --filter provegate test test/memory.test.ts`            | pkg   | pending |          | find ranking and JSON |
| FR-4               | `pnpm --filter provegate test test/single-package.test.ts`    | pkg   | pending |          | bounds, portability, containment |
| FR-5a              | `pnpm --filter provegate test test/content-launch.test.ts`    | pkg   | pending |          | docs and distribution claims |
| FR-5b              | `pnpm --filter provegate test test/pack.test.ts`              | pkg   | pending |          | tarball allowlist matches npm pack |
| FR-5c              | `pnpm verify:pack-drift`                                      | repo  | pending |          | every packed file paired or declared packOnly |
| FR-6               | `pnpm --filter provegate test test/practices-pack.test.ts`    | pkg   | pending |          | no-overwrite and invariant regression |
| types              | `pnpm check-types`                                            | root  | pending |          | zero errors |
| lint               | `pnpm lint`                                                   | root  | pending |          | zero warnings |
| test               | `pnpm test`                                                   | root  | pending |          | full suite |
| build              | `pnpm build`                                                  | root  | pending |          | clean build |
| workflow           | `pnpm verify:workflow`                                        | root  | pending |          | every hygiene check green |
| egress             | `pnpm check-egress`                                           | root  | pending |          | built output scanned |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-019`           | repo  | pending |          | readiness lint |
| gate-wiring        | `node packages/provegate/dist/cli.js check --wiring`          | repo  | pending |          | wire-or-delete |
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
- (none deferred yet)

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
