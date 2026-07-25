# Tasks: Governance Truth-Up

> **PRD**: [prd-021-governance-truth-up.md](../../_prds/wip/prd-021-governance-truth-up.md)
> **Readiness**: [readiness-021-governance-truth-up.md](../../_readiness/wip/readiness-021-governance-truth-up.md)
> **Status**: Not Started
> **Readiness Score**: 8.43/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-25
> **Updated**: 2026-07-25

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- Phase 4 agents hold a valid PRD-021 lock lease before editing implementation files or
  this ledger.
- Autonomous Close is **operator-gated**: the merge gate refuses until an owner-signed
  acceptance entry exists (this PRD changes the published config surface).
- No sub-task may introduce `any`, a lint bypass, a swallowed failure, a runtime
  dependency, a network call, or a push code path.

---

## Memory Context

Records to open and confirm still accurate before the dependent task starts (task 0.3).

- `score-must-equal-weighted-sum` — the failure this PRD mechanizes: without a machine
  check, authors round up to clear the threshold.
- `false-green-on-missing-file` — a missing header must fail, not skip; the cutoff is the
  single sanctioned exception and it excuses absence only.
- `known-red-ledger-must-expire` — the doc-claims allowlist is the same shape; a stale or
  expired entry must fail or it becomes a permanent bypass.
- `gate-wire-or-delete` — both new checks need a registered, executing surface.
- `verify-check-phase-placement` — these are Phase 1/2 triage invariants; they belong on
  the pre-merge hygiene surface, not late in Phase 4.

---

## Relevant Files

### Config surface (published — this is what makes the PRD a release)

- `packages/provegate/src/core/config/types.ts` — the `valueScoring` block.
- `packages/provegate/src/core/config/defaults.ts` — today's weights, `enforceFrom: 1`.
- `packages/provegate/src/core/config/validate.ts` — shape + resolved-semantic rules.
- `workflow.config.json` — new at the repo root; the cutoff and nothing else.
- `.changeset/` — the minor release entry carrying the compatibility instruction.

### Standalone checks (stdlib only, no package import)

- `scripts/verify/verify-value-score.mjs` — new; recompute + cutoff + `--print-weights`.
- `scripts/verify/verify-doc-claims.mjs` — new; the future-claim grammar.
- `scripts/verify/doc-claims-allowlist.json` — new; shrink-only, `reviewBy` expiry.
- `scripts/verify/verify-workflow.mjs`, `package.json`, `.github/workflows/` — wiring.

### Governance documents (live + shipped pack copies, hash-paired)

- `AGENT_BOOTSTRAP.md`, `STATUS.md`, `_brain/PROTOCOL.md`
- `packages/provegate/practices/brain/PROTOCOL.md`,
  `practices/templates/AGENT_BOOTSTRAP.template.md`,
  `practices/templates/STATUS.template.md`
- `scripts/verify/pack-drift-ledger.json`
- `docs/research/provegate-bootstrap/{README.md,oss-extraction-roadmap-2026-07-22.md,whitepaper-gated-autonomy-2026-07-22.md}`

### Tests

- `packages/provegate/test/config-value-scoring.test.ts` — new; schema, cutoff, worktree
  transition.
- `packages/provegate/test/value-score-script.test.ts` — new; spawned-script behavior.
- `packages/provegate/test/doc-claims-script.test.ts` — new; grammar and allowlist.
- `packages/provegate/test/content-canon.test.ts` — new; research-pack banner.
- `packages/provegate/test/fixtures/value-score/**` — new.

### Notes

- The verify scripts **cannot** import the built package: they run in adopter repos with
  no `provegate` installed. The weight table therefore exists twice, and the only thing
  keeping the copies honest is the spawned `--print-weights` comparison in task 3.4.
- Live and `practices/` copies are hash-paired in the ledger. Editing one side without
  the other is a gate failure by design; see task 7.2 for the reconcile procedure.

---

## Tasks

- [ ] 0.0 Pre-flight and ownership
  - [ ] 0.1 Run `gate open PRD-021 --worktree` from the base checkout; confirm the lease
        covers the PRD Conflict Surface and record branch/worktree in the Progress Log.
  - [ ] 0.2 W8 — confirm `_state/locks` holds no active lease other than this one before
        the root `workflow.config.json` is committed; record the result. A live lease
        predating the file must merge the base branch before its next `gate` command.
  - [ ] 0.3 Open the five Memory Context records; confirm the paths and commands each one
        names still exist and note any stale finding in **Deferrals & Decisions**.
  - [ ] 0.4 Re-measure the corpus facts the plan rests on and record them: the number of
        PRD files under `_prds/wip` and `_prds/completed`, and how many carry a `Value:`
        header. Expected at Phase-3 time: 21 and 6. A different count re-opens the cutoff
        question before any code is written.
  - [ ] 0.5 Capture the green baseline for `pnpm verify:workflow`,
        `node scripts/verify/verify-pack-drift.mjs`, and the package suite; a pre-existing
        red is ledgered, never normalized silently.

- [ ] 1.0 FR-1 — `valueScoring` config surface (W2, W3)
  - [ ] 1.1 Add the `valueScoring` block (`enforceFrom`, `weights.{MF,UI,TL,AR,RM}`) to
        `packages/provegate/src/core/config/types.ts`.
  - [ ] 1.2 Add defaults to `packages/provegate/src/core/config/defaults.ts`: today's
        weights (.25/.25/.20/.15/.15) and `enforceFrom: 1` — a fresh adopter has no legacy
        corpus, so the safe default is enforce-everywhere.
  - [ ] 1.3 Shape-validate in `validate.ts::validateConfig`: reject unknown axes and
        non-numbers, with the existing path-tagged issue shape.
  - [ ] 1.4 W3 — semantically validate in `validate.ts::validateResolvedConfig`: all five
        axes present, each finite and `> 0`, the sum exactly 1 compared in **integer
        hundredths**, and `enforceFrom` a non-negative integer.
  - [ ] 1.5 W3 — implement the two-decimal rule **lexically, not arithmetically**:
        `String(weight)` must match `/^0(\.\d{1,2})?$|^1(\.0{1,2})?$/` (JS emits the
        shortest round-tripping form), and only then scale with `Math.round(weight * 100)`.
        `Number.isInteger(0.29 * 100)` is false — using it would reject a legal weight.
  - [ ] 1.6 Cover it in `packages/provegate/test/config-value-scoring.test.ts`: accept
        0.29 and 0.58; reject 0.155, 1e-7, a negative weight, a missing axis, an unknown
        axis, and a set summing to 0.99. Each reject names its issue path.

- [ ] 2.0 FR-2 / FR-3 — The recompute check
  - [ ] 2.1 Write `scripts/verify/verify-value-score.mjs` against the shipped verify
        shape: stdlib only, `targetRoot()` argument, shared reporter from `lib.mjs`.
  - [ ] 2.2 Parse the `Value: T (MF/UI/TL/AR/RM: a/b/c/d/e)` header and recompute in
        integer hundredths (`Σ weightHundredths × dim`); require exact equality with the
        declared total formatted to two decimals. No float compare, no tolerance band.
  - [ ] 2.3 Implement the cutoff: a PRD whose numeric id is `< enforceFrom` may omit the
        header and is reported as a skip **with its reason**; a header that is present and
        wrong fails at any id; a malformed header fails at any id.
  - [ ] 2.4 Resolve weights from `workflow.config.json` when present, validating them by
        the same rules as 1.4–1.5 and failing loudly on a violation; otherwise use the
        documented fallback table.
  - [ ] 2.5 Add `--print-weights` (JSON on stdout, exit 0) so the fallback can be proven
        by behavior rather than by reading the source.

- [ ] 3.0 FR-6 — Prove the script by behavior (W4)
  - [ ] 3.1 Build the fixture roots under
        `packages/provegate/test/fixtures/value-score/`: no-config, custom-valid-config,
        invalid-config, wrong-total PRD, pre-cutoff PRD without a header, at-cutoff PRD
        without a header.
  - [ ] 3.2 Create `packages/provegate/test/value-score-script.test.ts` that **spawns the
        real script** against each fixture root — never re-implements its logic.
  - [ ] 3.3 Assert the failing cases exit non-zero with a message naming the cause: wrong
        total reports declared and recomputed; at-cutoff missing header fails; invalid
        config (sum ≠ 1, three-decimal weight, missing axis) names the issue.
  - [ ] 3.4 W4 — assert parity: in the no-config fixture, `--print-weights` deep-equals
        `DEFAULT_CONFIG.valueScoring.weights`. This is the only thing preventing the two
        weight tables from drifting; if someone edits either side, this assertion fails.
  - [ ] 3.5 Assert the passing cases: custom valid config yields the custom weights and a
        total computed from them, and the pre-cutoff missing-header fixture exits 0.

- [ ] 4.0 FR-4 / FR-5 — Repo cutoff and the control-artifact transition (W8)
  - [ ] 4.1 Create the root `workflow.config.json` containing only
        `{"valueScoring": {"enforceFrom": 17}}` — PRD-017 is the first PRD written under
        the scoring rule. Nothing else goes in this file.
  - [ ] 4.2 In `packages/provegate/test/config-value-scoring.test.ts`, assert the resolved
        config deep-equals `DEFAULT_CONFIG` in every respect except the cutoff; this is
        what keeps "minimal" true rather than merely intended.
  - [ ] 4.3 W8 — add the transition fixture: a worktree leased **before** the config file
        existed is refused on reuse (its control-artifact snapshot lacks the file), and
        succeeds after merging the base branch. Use the existing worktree test helpers.
  - [ ] 4.4 Run `node scripts/verify/verify-value-score.mjs` against the live repo and
        confirm the 15 pre-cutoff PRDs are skipped with reasons and the five at-or-after
        the cutoff recompute correctly.

- [ ] 5.0 FR-7 — The doc-claims grammar (W6)
  - [ ] 5.1 Write `scripts/verify/verify-doc-claims.mjs` with the declared file set:
        `AGENT_BOOTSTRAP.md`, `STATUS.md`, `_brain/PROTOCOL.md`, and the three practices
        counterparts. Nothing else is scanned — that bound is what keeps PRDs and `_brain`
        records out of range.
  - [ ] 5.2 Implement the match rule: a line fails when it carries **both** a script token
        (`verify:<name>` or `verify-<name>.mjs`) wired as a `verify:*` key in root
        `package.json` **and** a declared future marker (`wave 2`, `wave-2`, `lands in`,
        `will land`, `future work`, `stub now`, `specify later`, `not yet`).
  - [ ] 5.3 Implement the exclusions: fenced code blocks and `STATUS.md`'s Recent activity
        section are historical record, not claims.
  - [ ] 5.4 Implement `scripts/verify/doc-claims-allowlist.json` as `{file, claim, reason,
        reviewBy}` entries, shrink-only: an entry matching no line, or one past its
        `reviewBy`, fails the check.
  - [ ] 5.5 Cover it in `packages/provegate/test/doc-claims-script.test.ts` by spawning
        the script: positive (a wired script described as future → fail), negative (a
        genuinely unshipped script named as future → pass), fenced-code and
        Recent-activity exclusions hold, and both allowlist failure modes (stale entry,
        expired `reviewBy`) turn it red.

- [ ] 6.0 FR-8 — Wiring (`gate-wire-or-delete`)
  - [ ] 6.1 Add `verify:value-score` and `verify:doc-claims` to root `package.json`
        scripts.
  - [ ] 6.2 Add both to the `verify:workflow` bundle in
        `scripts/verify/verify-workflow.mjs`.
  - [ ] 6.3 Add both to the CI hygiene job under `.github/workflows/`.
  - [ ] 6.4 Run `pnpm verify:gates-wired` and confirm each registered check sits on an
        executing surface; an unwired check must fail this audit, so verify by mutation
        (temporarily unregister one, see it go red, restore).

- [ ] 7.0 FR-9 / FR-10 — Correct the governance documents and the pack pairs
  - [ ] 7.1 Rewrite the four stale claims to name the shipped script and the surface that
        runs it: `AGENT_BOOTSTRAP.md` durable-artifacts (~128) and value-score (~144),
        `STATUS.md` deferral cap (~25), `_brain/PROTOCOL.md` optional-tooling (~182, ~204).
        In the AGENT_BOOTSTRAP triage section, document that the weights and cutoff are
        configurable and name the defaults.
  - [ ] 7.2 Port each correction into its genericized pack counterpart
        (`practices/brain/PROTOCOL.md`, `practices/templates/AGENT_BOOTSTRAP.template.md`,
        `practices/templates/STATUS.template.md`), then run
        `node scripts/verify/verify-pack-drift.mjs --reconcile` and **read its per-pair
        output** — every line it prints is a change being accepted. Paste that output into
        the Progress Log.
  - [ ] 7.3 Run `pnpm verify:doc-claims` against the corrected tree and confirm zero
        findings without adding a single allowlist entry; needing one here would mean the
        correction is incomplete.

- [ ] 8.0 FR-11 — Research pack canon banner
  - [ ] 8.1 Add the status banner to `docs/research/provegate-bootstrap/README.md`: frozen
        bootstrap record, extraction complete through PRD-016, live canon is `apps/docs`
        with the exact canonical link.
  - [ ] 8.2 Mark the roadmap's shipped phases in
        `oss-extraction-roadmap-2026-07-22.md` and point
        `whitepaper-gated-autonomy-2026-07-22.md` at the published v1.0. Do not rewrite
        their content — only mark status.
  - [ ] 8.3 Assert it directly in `packages/provegate/test/content-canon.test.ts`: the
        canonical link, the "complete through PRD-016" statement, and that the roadmap's
        shipped phases are no longer unmarked.

- [ ] 9.0 Migration & Rollback Plan (infra parent — 20% of the readiness weight)
  - [ ] 9.1 Corpus migration: confirm no `Value:` header was backfilled into any
        pre-cutoff PRD. Grep the diff to prove it; the exemption covers absence, never a
        fabricated number.
  - [ ] 9.2 Record the rollout order in **Deferrals & Decisions**: the CLI carrying
        `valueScoring` releases first, adopters upgrade, only then may they add the key.
        The reverse order hard-fails because unknown keys are config errors.
  - [ ] 9.3 Record the downgrade procedure: remove the `valueScoring` key before
        installing an older CLI; nothing else depends on it.
  - [ ] 9.4 Record the rollback of this change itself: delete both scripts, their
        `package.json` entries, their bundle membership, and the root config file. The
        config addition is additive and inert when unused, so no data or artifact
        migration is involved.
  - [ ] 9.5 Re-check `_state/locks` immediately before the merge (the 0.2 measurement can
        go stale during Phase 4) and confirm no lease predates the new control artifact.

- [ ] 10.0 FR-12 — Release entry (W9)
  - [ ] 10.1 Write the `.changeset/` entry declaring a **minor** bump for `provegate`,
        whose note states the one-way compatibility rule: an older CLI rejects
        `valueScoring` as an unknown key, so upgrade the CLI before adding it and remove
        the key before downgrading.
  - [ ] 10.2 W9 — verify the entry semantically rather than by two independent
        quote-sensitive greps: assert in a test that some file in `.changeset/` declares
        `provegate` at `minor` **and** that the same file carries the compatibility
        sentence. Front-matter quoting is a formatting choice, not a contract; if the §11
        greps disagree with this assertion, the greps are what is wrong.
  - [ ] 10.3 Confirm `pnpm changeset status` is **not** used as evidence anywhere: it
        exits 0 on an empty `.changeset/`, so it can never fail.

- [ ] 11.0 Phase 5 — Execute verification
  - [ ] 11.1 Run every PRD §11 command exactly as written from the repository root and
        fill the matching Verification Ledger rows with evidence; no substitutions, no
        omissions.
  - [ ] 11.2 Run the cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`,
        `pnpm build`, `pnpm verify:workflow`; record exit codes.
  - [ ] 11.3 Run `node packages/provegate/dist/cli.js check PRD-021` and
        `node packages/provegate/dist/cli.js check --wiring`; both must be green with the
        two new checks registered.
  - [ ] 11.4 Assert the invariants: `packages/provegate/package.json` still declares zero
        runtime dependencies, and neither new script contains a network call or a push
        path.

- [ ] 12.0 Phase 6 — Independent adversarial audit
  - [ ] 12.1 After Phase 5 is green, obtain an independent review (different model family,
        never the implementing agent) of the merge diff against the PRD and watch items
        W1–W9. Point it at the three highest-leverage attacks: can the doc-claims grammar
        be satisfied by rewording rather than by fixing a claim; does the cutoff let a
        genuinely wrong header through anywhere; and do the two weight tables actually
        diverge under the parity test or only appear to agree.
  - [ ] 12.2 Save the structured verdict to
        `_docs/reviews/review-021-governance-truth-up.md`; the ledger row may read
        `passed` only with verdict `pass` and `Critical: 0`.
  - [ ] 12.3 For each finding, append remediation sub-tasks here, fix under the same
        lease, re-run the affected Phase 5 gates, and obtain a fresh verdict.

- [ ] 13.0 Phase 7 — Durable learning and close preparation
  - [ ] 13.1 Run the `_brain/PROTOCOL.md` §7 capture. The PRD declares
        `docs-outlive-the-gate-they-promise` as a conditional learning: write it if the
        close confirms the promise-versus-shipped pattern, otherwise downgrade that
        Durable Artifacts entry to `none` — decide explicitly, do not leave it implied.
  - [ ] 13.2 Confirm every declared Durable Artifact is present in the merge diff.
  - [ ] 13.3 Prepare the owner handoff: the config-surface change and its changeset, the
        corpus skip report from 4.4, the reconcile output from 7.2, and the independent
        verdict. Leave the operator row pending.
  - [ ] 13.4 After owner acceptance only, run `gate land PRD-021`; verify the post-merge
        gates and worktree cleanup. Never push — the handoff ends with the human push
        instruction.

---

## Verification Ledger

| Gate               | Command / Check                                                  | Scope | Result  | Evidence | Notes |
| ------------------ | ------------------------------------------------------------------ | ----- | ------- | -------- | ----- |
| FR-1               | `pnpm --filter provegate test test/config-value-scoring.test.ts`   | pkg   | pending |          | schema, defaults, lexical two-decimal accept/reject |
| FR-2               | `node scripts/verify/verify-value-score.mjs`                       | repo  | pending |          | live corpus green under the cutoff |
| FR-3               | `pnpm --filter provegate test test/value-score-script.test.ts`     | pkg   | pending |          | config resolution and print-weights parity |
| FR-4               | `pnpm --filter provegate test test/config-value-scoring.test.ts`   | pkg   | pending |          | resolved config deep-equals defaults except the cutoff |
| FR-5               | `pnpm --filter provegate test test/config-value-scoring.test.ts`   | pkg   | pending |          | pre-existing worktree refused before merge, accepted after |
| FR-6               | `pnpm --filter provegate test test/value-score-script.test.ts`     | pkg   | pending |          | behavior matrix, every failing fixture |
| FR-7               | `pnpm --filter provegate test test/doc-claims-script.test.ts`      | pkg   | pending |          | positive, negative, stale and expired allowlist |
| FR-8a              | `pnpm verify:gates-wired`                                          | repo  | pending |          | both checks wired to an executing surface |
| FR-8b              | `pnpm verify:workflow`                                             | repo  | pending |          | the bundle runs both new members |
| FR-9               | `pnpm verify:doc-claims`                                           | repo  | pending |          | zero stale wave-2 claims about wired scripts |
| FR-10              | `pnpm verify:pack-drift`                                           | repo  | pending |          | pack/live pairs reconciled, ledger updated |
| FR-11              | `pnpm --filter provegate test test/content-canon.test.ts`          | pkg   | pending |          | banner, canonical link, roadmap marks |
| FR-12a             | `grep -rc "provegate': minor" .changeset`                          | repo  | pending |          | fails when the minor changeset is missing (see W9) |
| FR-12b             | `grep -rc "upgrade the CLI before" .changeset`                     | repo  | pending |          | the compatibility instruction is in the note |
| types              | `pnpm check-types`                                                 | root  | pending |          | zero errors |
| lint               | `pnpm lint`                                                        | root  | pending |          | zero warnings |
| test               | `pnpm test`                                                        | root  | pending |          | full suite |
| build              | `pnpm build`                                                       | root  | pending |          | clean build |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-021`                | repo  | pending |          | readiness lint |
| gate-wiring        | `node packages/provegate/dist/cli.js check --wiring`               | repo  | pending |          | wire-or-delete |
| independent-review | `_docs/reviews/review-021-governance-truth-up.md`                  | repo  | pending |          | verdict pass, Critical: 0 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Readiness Watch Coverage

| Watch | Binding tasks |
| ----- | ------------- |
| W1 — prospective cutoff, no backfill | 0.4, 2.3, 4.1, 4.4, 9.1 |
| W2 — `valueScoring` as a real schema | 1.1–1.6 |
| W3 — float-safe decimal validation | 1.4, 1.5, 1.6 |
| W4 — prove both weight copies by behavior | 2.5, 3.2, 3.4 |
| W5 — compatibility, changeset, rollout | 9.2–9.4, 10.1 |
| W6 — doc-claims grammar, not intention | 5.1–5.5 |
| W7 — outcome evidence, not token greps | 3.2–3.5, 5.5, 8.3, 10.2 |
| W8 — root-config control-artifact transition | 0.2, 4.3, 9.5 |
| W9 — semantic changeset assertion | 10.2, 10.3 |

---

## Deferrals & Decisions

- Phase 3 decision — `infra` skeleton: Migration & Rollback is its own parent (task 9.0)
  because deployment ordering carries 20% of this class's readiness weight, and this PRD
  publishes a config-surface change that an older CLI rejects.
- Phase 3 decision — W9 is implemented as task 10.2's semantic assertion; the PRD's two
  §11 greps stay as supplementary rows (FR-12a/FR-12b) because §11 is the runner's
  contract, but the test is the authority if they disagree.
- (none deferred yet)

---

## Progress Log

| Date       | Task    | Notes |
| ---------- | ------- | ----- |
| 2026-07-25 | Phase 3 | Plan generated from PRD-021 (Approved), readiness iteration 3 PASS 8.43, and watch items W1–W9, after owner Go. No implementation started. |

---

## Blockers / Open Questions

- Not blocked, but **not parallelizable with the memory program**: `gate queue` reports
  that `scripts/verify/pack-drift-ledger.json` is claimed by PRD-017, PRD-018, and
  PRD-019 as well. The ledger is modify-in-place, not append-only, so it is not
  union-mergeable — this PRD runs alone with respect to those three, in whatever order
  the owner picks.

---

## Operator Handoff

> Human/runtime/staging checks the agent cannot complete. Keep the corresponding task
> checkbox unchecked until resolved or explicitly accepted.
> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`}.

| Task | Category  | Owner | Required Check | Status | Notes |
| ---- | --------- | ----- | -------------- | ------ | ----- |
| 13.3 | manual-qa | owner | Accept the published config-surface change: the `valueScoring` key, the minor bump, and the upgrade-before-config instruction adopters will read in the changelog | pending | A release decision the gates cannot make; the merge gate refuses until this acceptance is recorded |
| 13.3 | manual-qa | owner | Confirm the research-pack banner wording — that `apps/docs` is named the live canon and the bootstrap pack is marked frozen rather than deleted | pending | Canon ownership is an owner call |
