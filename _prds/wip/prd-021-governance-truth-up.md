# PRD-021: Governance Truth-Up — Stale Wave-2 Claims and the Value-Score Recompute Gate

> **Status**: Approved
>
> **Created**: 2026-07-25
> **Updated**: 2026-07-25
> **Author**: Cursor, for owner review
> **Audience**: Implementing Agent
> **Slug**: `governance-truth-up`
> **Cycle Phase**: 2 (Readiness)
> **PRD Class**: infra
> **Class Rationale**: This corrects governance documents and adds two workflow verify
> gates plus one additive config key; no application runtime behavior changes.
> **Autonomous Close**: operator-gated
> **Value**: 3.65 (MF/UI/TL/AR/RM: 5/3/3/4/3)

<!-- 0.25*5 + 0.25*3 + 0.20*3 + 0.15*4 + 0.15*3 = 3.65. Re-scored at readiness
     iteration 1: the config surface and root config file lower RM from 5 to 3, while
     configurable weights raise UI and AR. -->

---

## 1. Introduction / Overview

The governance documents promise three mechanical checks "in wave 2". Two of them
shipped and the docs never caught up; one never shipped and the docs imply it exists as
future-certain work:

- `AGENT_BOOTSTRAP.md:128` says the `verify:durable-artifacts` check "lands in wave 2" —
  `scripts/verify/verify-durable-artifacts.mjs` is wired in `package.json` today.
- `STATUS.md:25` says the deferral cap is "gate-enforced in wave 2" —
  `scripts/verify/verify-deferred.mjs` enforces cap 15 / warn 12 today.
- `_brain/PROTOCOL.md:182,204` still calls `verify:brain` optional wave-2 tooling and a
  stub — it is a wired gate.
- `AGENT_BOOTSTRAP.md:144` says the value-score recompute "lands in wave 2" — nothing
  under `scripts/verify/` recomputes a declared `Value:` header. This is the one real
  hole, and `_brain/learnings/score-must-equal-weighted-sum.md` already records the
  failure mode: without a machine check, authors round up to clear the threshold.

Separately, the research pack (`docs/research/provegate-bootstrap/`) reads as the live
plan while `apps/docs` carries the v1.0 canon — the roadmap's phase checkboxes look
unstarted although PRD-001–016 are Ship Verified. Two canons, no marked winner.

This PRD makes the documents describe the system that exists, ships the missing
recompute gate, and adds a narrow drift check so the "lands in wave 2" class of lie
cannot silently return.

**Corpus reality that shapes the design:** the scan set holds 21 PRDs and only 6 carry a
`Value:` header — the rule postdates PRD-016. A gate that simply required the header
would red-fail 15 shipped artifacts on its first run. The owner chose a **prospective
cutoff** over backfilling or a per-file exemption list (§9 Q4).

---

## 2. Goals

### Primary Goals

- [ ] Ship the value-score recompute gate promised by the triage rules, with configurable
      weights and a declared enforcement cutoff, and with arithmetic that is exact for
      every weight set the config permits.
- [ ] Correct every stale wave-2 claim in the governance docs, on both the live side and
      the shipped practices copy.
- [ ] Mark the research pack as the frozen bootstrap record and name `apps/docs` as the
      live canon.
- [ ] Make a re-drift of these claims a gate failure, with a grammar precise enough that
      it neither false-positives on genuine future work nor becomes a permanent bypass.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| In-scope PRDs whose declared value is machine-verified | 0 | all at/after the cutoff | `value-score-script.test.ts` |
| Legacy PRDs red-failed by the new gate | n/a | 0 | pre-cutoff fixture |
| Weight sets that can produce a non-representable total | unbounded | 0 | two-decimal weight validation |
| Copies of the weight table that can silently diverge | n/a | 0 | `--print-weights` parity test |
| Stale "wave 2" claims about wired scripts | 4 | 0 | `pnpm verify:doc-claims` |
| Pack/live pairs left one-sided | n/a | 0 | `pnpm verify:pack-drift` |
| Runtime dependencies added | 0 | 0 | zero-dep policy |

---

## 3. User Stories

#### User Story 1

```
As a reviewer scoring a PRD candidate,
I want the declared Value header recomputed mechanically,
so that a rounded-up score cannot carry a below-threshold candidate into the queue.
```

**Acceptance Criteria:**

- [ ] A PRD declaring `Value: 4.05 (MF/UI/TL/AR/RM: 5/3/5/3/4)` passes; changing one
      dimension without changing the total fails with both numbers reported.
- [ ] A PRD **at or after the cutoff** with no `Value:` header fails — a missing header
      must not be a pass (per the false-green-on-missing-file learning).
- [ ] A PRD **before the cutoff** with no header passes, and one before the cutoff with a
      *wrong* header still fails: exemption covers absence, never a false number.

#### User Story 2

```
As an adopter with a different sense of what matters,
I want to set my own triage weights,
so that the gate enforces my model rather than ProveGate's.
```

**Acceptance Criteria:**

- [ ] `valueScoring.weights` in `workflow.config.json` resolves and is used by both the
      CLI config surface and the standalone script.
- [ ] Weights that are non-finite, negative, more than two decimals, missing an axis, or
      that do not sum to exactly 1 are rejected with a named issue.

#### User Story 3

```
As an agent reading AGENT_BOOTSTRAP before starting work,
I want the document to describe gates that actually exist,
so that I don't skip a check believing a human enforces it by inspection.
```

**Acceptance Criteria:**

- [ ] No governance doc describes a wired `verify:*` script as future work.
- [ ] The practices-pack copies move with the live files and the pack-drift ledger is
      reconciled in the same change.

#### User Story 4

```
As a newcomer reading docs/research/provegate-bootstrap,
I want to know it is the frozen bootstrap record, not the live plan,
so that I don't act on a roadmap whose phases already shipped.
```

**Acceptance Criteria:**

- [ ] The pack README carries a banner naming `apps/docs` as the live canon and the
      extraction as complete through PRD-016.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1**: Extend the CLI config surface with an additive `valueScoring` key:
   `{ enforceFrom: number, weights: { MF, UI, TL, AR, RM: number } }`. Shape validation
   rejects unknown axes and non-numbers; semantic validation (`validateResolvedConfig`)
   requires all five axes present, each finite, `> 0`, expressed in at most two decimal
   places, summing to exactly 1 (compared in integer hundredths, never float equality),
   and `enforceFrom` a non-negative integer. The two-decimal test is **lexical, not
   arithmetic**: `String(weight)` must match `/^0(\.\d{1,2})?$|^1(\.0{1,2})?$/`, because
   JS number-to-string emits the shortest round-tripping form (`String(0.29) === "0.29"`)
   while `Number.isInteger(0.29 * 100)` is false and would reject a legal weight. Only
   after the lexical check passes is the value scaled with `Math.round(weight * 100)` into
   the integer hundredths used everywhere downstream. Accept fixtures must include 0.29
   and 0.58; reject fixtures must include 0.155 and 1e-7. Package defaults keep today's weights
   (.25/.25/.20/.15/.15) and `enforceFrom: 1` — a fresh adopter has no legacy corpus, so
   the safe default is "enforce everywhere".
   - **Targets:** `packages/provegate/src/core/config/types.ts`,
     `packages/provegate/src/core/config/defaults.ts::DEFAULT_CONFIG`,
     `packages/provegate/src/core/config/validate.ts::validateConfig`,
     `packages/provegate/src/core/config/validate.ts::validateResolvedConfig`
2. **FR-2**: Add `scripts/verify/verify-value-score.mjs`. For every PRD under
   `_prds/wip/` and `_prds/completed/` it parses the `Value: T (MF/UI/TL/AR/RM: a/b/c/d/e)`
   header and recomputes the total in **integer hundredths** (`Σ weightHundredths × dim`,
   dimensions being integers 1–5), then requires exact equality with the declared total
   formatted to two decimals. Because every configured weight is at most two decimals,
   every legal total is exactly representable — no tolerance band, no float compare.
   Enforcement respects the cutoff: a PRD whose numeric id is `< enforceFrom` may omit
   the header (reported as a skip with its reason), but a header that is present and
   wrong fails at any id. A malformed header fails at any id.
   - **Targets:** `scripts/verify/verify-value-score.mjs` (new),
     `scripts/verify/lib.mjs` (reuse the existing reporter)
3. **FR-3**: The script resolves its weights from `workflow.config.json` when present —
   validating them by the same rules as FR-1 and failing loudly on a violation — and
   otherwise from a documented fallback table. It exposes `--print-weights` (JSON on
   stdout, exit 0) purely so the fallback can be proven by behavior rather than by
   reading the source.
   - **Targets:** `scripts/verify/verify-value-score.mjs`
4. **FR-4**: Set this repo's cutoff. Create a root `workflow.config.json` containing only
   `{"valueScoring": {"enforceFrom": 17}}` — PRD-017 is the first PRD written under the
   scoring rule. A test asserts the resolved config deep-equals `DEFAULT_CONFIG` in every
   other respect, so introducing the file changes nothing else about gate behavior.
   - **Targets:** `workflow.config.json` (new),
     `packages/provegate/test/config-value-scoring.test.ts` (new)
5. **FR-5**: Cover the control-artifact transition the new file creates. `gate open
   --worktree` snapshots `workflow.config.json` as a required artifact when it exists, so
   a worktree claimed before this change carries a snapshot without it and must merge or
   rebase the base branch before reuse. A fixture proves both sides: a leased worktree
   created without the file is refused after the file lands, and succeeds once the base is
   merged in. `_state/locks` is empty today, so no live lease is affected; the Phase 4
   preflight re-checks that before the file is committed.
   - **Targets:** `packages/provegate/test/config-value-scoring.test.ts`,
     `packages/provegate/src/core/run/open.ts` (read-only reference — no behavior change)
6. **FR-6**: Prove the script by behavior, not by source inspection. Spawn the real
   script against fixture roots and assert: no config → `--print-weights` deep-equals
   `DEFAULT_CONFIG.valueScoring.weights`; custom valid config → the custom weights and a
   total computed from them; invalid config (sum ≠ 1, three-decimal weight, missing axis)
   → non-zero exit naming the issue; a PRD with a wrong total → non-zero exit reporting
   declared and recomputed; a pre-cutoff PRD with no header → exit 0; an at-cutoff PRD
   with no header → non-zero exit.
   - **Targets:** `packages/provegate/test/value-score-script.test.ts` (new),
     `packages/provegate/test/fixtures/value-score/**` (new)
7. **FR-7**: Add `scripts/verify/verify-doc-claims.mjs` with an explicit grammar, not an
   intention. Scanned files are the declared governance set (`AGENT_BOOTSTRAP.md`,
   `STATUS.md`, `_brain/PROTOCOL.md`, and the three practices counterparts). A line fails
   when it contains **both** a script token (`verify:<name>` or `verify-<name>.mjs`) that
   is wired as a `verify:*` key in root `package.json`, **and** a declared future marker
   (`wave 2`, `wave-2`, `lands in`, `will land`, `future work`, `stub now`,
   `specify later`, `not yet`). Fenced code blocks and `STATUS.md`'s Recent activity
   section are excluded as historical record. `scripts/verify/doc-claims-allowlist.json`
   holds `{file, claim, reason, reviewBy}` entries for genuinely-future work; it is
   shrink-only — an entry that no longer matches any line, or whose `reviewBy` has
   passed, fails the check (the known-red-ledger lesson).
   - **Targets:** `scripts/verify/verify-doc-claims.mjs` (new),
     `scripts/verify/doc-claims-allowlist.json` (new),
     `packages/provegate/test/doc-claims-script.test.ts` (new, with positive, negative,
     and stale-allowlist fixtures)
8. **FR-8**: Wire both gates: `verify:value-score` and `verify:doc-claims` in
   `package.json`, membership in the `verify:workflow` bundle, and the CI hygiene job, so
   the existing wire-or-delete audit (`verify:gates-wired`) sees each registered check on
   an executing surface.
   - **Targets:** `package.json` (`scripts`), `scripts/verify/verify-workflow.mjs`,
     `.github/workflows/` (hygiene job)
9. **FR-9**: Correct the stale governance claims: `AGENT_BOOTSTRAP.md` durable-artifacts
   (line ~128) and value-score (line ~144) sentences, the `STATUS.md` deferral-cap note
   (line ~25), and the `_brain/PROTOCOL.md` optional-tooling sections (~182, ~204). Each
   sentence states the shipped script name and the surface that runs it. The
   AGENT_BOOTSTRAP triage section additionally documents that the weights and the cutoff
   are configurable, with the default values named.
   - **Targets:** `AGENT_BOOTSTRAP.md`, `STATUS.md`, `_brain/PROTOCOL.md`
10. **FR-10**: Port the same corrections to the shipped practices copies and reconcile the
   hash ledger in the same change — `brain/PROTOCOL.md`,
   `templates/AGENT_BOOTSTRAP.template.md`, and `templates/STATUS.template.md` are all
   pack-drift pairs, so a one-sided edit fails the bundle.
   - **Targets:** `packages/provegate/practices/brain/PROTOCOL.md`,
     `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`,
     `packages/provegate/practices/templates/STATUS.template.md`,
     `scripts/verify/pack-drift-ledger.json`
11. **FR-11**: Add a status banner to `docs/research/provegate-bootstrap/README.md`:
    frozen bootstrap record, extraction complete through PRD-016, live canon is
    `apps/docs`. Mark the roadmap's shipped phases and point the draft whitepaper at the
    published v1.0. A dedicated test asserts the banner directly — the exact canonical
    link to the published docs, the "complete through PRD-016" statement, and that the
    roadmap's shipped phases are no longer unmarked.
    - **Targets:** `docs/research/provegate-bootstrap/README.md`,
      `docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md`,
      `docs/research/provegate-bootstrap/whitepaper-gated-autonomy-2026-07-22.md`,
      `packages/provegate/test/content-canon.test.ts` (new)
12. **FR-12**: Ship the config-surface change as a release: a changeset declaring a
    **minor** bump (additive key, no behavior change for an absent key), whose note
    states the one-way compatibility rule — an older CLI rejects `valueScoring` as an
    unknown key, so adopters upgrade the CLI before adding it, and remove the key before
    downgrading. `pnpm changeset status` is **not** acceptable evidence: it exits 0 on a
    checkout with no changesets at all. The gate is a grep for the `provegate` minor
    front-matter line and for the compatibility sentence in the note, both of which fail
    when the changeset is missing.
    - **Targets:** `.changeset/` (new entry)

---

## 5. Non-Goals (Out of Scope)

- Retuning the default weight values or thresholds, or touching the expand-don't-delete
  triage rule — this gate enforces the declared arithmetic and makes the weights
  configurable; it does not change what they are.
- Backfilling `Value:` headers into the 15 pre-cutoff PRDs, or rewriting completed PRDs
  whose headers are already correct.
- Publishing a `valueScoring` reference on the docs site. `apps/docs/content/docs/cli.mdx`
  and `packages/provegate/QUICKSTART.md` are claimed by PRD-019 and PRD-020; documenting
  the key there would make a three-way conflict surface. It is documented in
  `AGENT_BOOTSTRAP.md` and its shipped pack template instead.
- Memory effectiveness metrics (`gate memory stats`) — a dated deferral, owner-held.
- Panel-vs-single-reviewer machine rule — needs an ADR before any PRD.
- Any marketing or landscape claim re-verification.
- Rewriting the research pack's content; this PRD only marks its status.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a PRD at or after the cutoff whose declared total does not equal the weighted
  sum, **When** `pnpm verify:value-score` runs, **Then** it exits non-zero naming the PRD,
  the declared total, and the recomputed total.
- **Given** a PRD at or after the cutoff with no `Value:` header, **When** the check runs,
  **Then** it fails rather than passing by absence.
- **Given** one of the 15 pre-cutoff PRDs, **When** the check runs, **Then** it is skipped
  with a stated reason and the run stays green.
- **Given** a `workflow.config.json` carrying `valueScoring.weights`, **When** any `gate`
  command loads config, **Then** it resolves normally instead of failing on an unknown
  key, **and** the standalone script's `--print-weights` reports the same weights.
- **Given** weights that sum to 0.99, or a weight with three decimals, **When** either the
  CLI or the script resolves them, **Then** the resolution fails with a named issue.
- **Given** a governance line naming a wired script as future work, **When**
  `pnpm verify:doc-claims` runs, **Then** it fails; **given** a line naming a genuinely
  unshipped script, **Then** it passes.
- **Given** an allowlist entry that matches no line, or whose `reviewBy` has passed,
  **When** the check runs, **Then** it fails as stale.
- **Given** the corrected `AGENT_BOOTSTRAP.md` without the paired practices template edit,
  **When** `pnpm verify:pack-drift` runs, **Then** it fails until the counterpart is
  ported and the ledger reconciled.

---

## 7. Technical Considerations

### Architecture

- **Two more members of the existing verify library.** Both checks follow the shipped
  shape: zero dependencies, target-root argument, shared reporter from `lib.mjs`,
  registered in the bundle and in CI. Nothing new is invented.
- **Absence is a failure, not a skip — except where a policy says otherwise.** Two
  `_brain` learnings bind this directly (a grep-a-file check must exit 1 when the file is
  absent; a declared score must be machine-compared). The cutoff is the one sanctioned
  exception, and it is narrow by construction: it excuses only a *missing* header on a
  *pre-cutoff* id, never a wrong one.
- **Exact arithmetic is a validation problem, not a rounding problem.** Rather than
  choosing a tolerance, FR-1 constrains weights to two decimals, so the recompute is
  integer arithmetic in hundredths and every legal total has an exact two-decimal form.
- **Two copies of the weight table.** The verify scripts are standalone and zero-dep; they
  cannot import the built package (PRD-016 deliberately left them convention-default). The
  fallback table in the script and `DEFAULT_CONFIG` are therefore duplicates. FR-3's
  `--print-weights` plus FR-5's spawn test pin them by behavior — editing either side
  makes the printed JSON diverge from `DEFAULT_CONFIG` and the test fails.
- **Introducing a root `workflow.config.json` is not free.** `gate open --worktree`
  snapshots the config file as a control artifact when it exists
  (`run/open.ts` binds `configSourceFor` bytes into the lease). The file must therefore be
  committed in the same change as the code that reads it, and it must stay minimal —
  FR-4's deep-equal test is what keeps "minimal" true. A worktree leased *before* the file
  existed carries a snapshot without it and is refused on reuse until it merges the base
  branch; FR-5 tests both sides of that transition rather than asserting it in prose.
- **Phase placement.** Register both checks where their failure should surface (the
  verify-check-phase-placement learning) — these are Phase 1/2 triage invariants, so they
  belong on the pre-merge hygiene surface, not late in Phase 4.

### Migration & Rollback

- **Corpus migration:** prospective cutoff at PRD-017. The 15 pre-cutoff PRDs are skipped
  by id, with no file list to maintain and no fabricated scores. New PRDs are in scope
  automatically because their ids exceed the cutoff.
- **Rollout order:** release the CLI carrying `valueScoring` (FR-11 minor bump) → adopters
  upgrade → only then may they add the key. The reverse order hard-fails, because unknown
  keys are config errors; the changeset note states this.
- **Downgrade:** remove the `valueScoring` key from `workflow.config.json` before
  installing an older CLI. Nothing else in the repo depends on the key.
- **In-flight worktrees:** `_state/locks` is empty at the time of writing, so no live
  claim is affected. The Phase 4 preflight re-checks it; if a lease exists, the worktree
  merges the base branch before its next `gate` command, which is the same procedure any
  control-file change already requires.
- **Rollback of this change:** delete the two scripts, their `package.json` entries, their
  bundle membership, and the root config file; the config-surface addition is additive and
  inert when unused, so a published version carrying it needs no data or artifact
  migration.

### Dependencies

- none (existing verify library + shipped scripts + changesets infrastructure)

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/config/` — `valueScoring` types, defaults, validation
- [ ] `scripts/verify/verify-value-score.mjs`, `scripts/verify/verify-doc-claims.mjs`,
      `scripts/verify/doc-claims-allowlist.json` (new) + bundle/CI registration
- [ ] `workflow.config.json` (new, cutoff only)
- [ ] `packages/provegate/test/config-value-scoring.test.ts`,
      `test/value-score-script.test.ts`, `test/doc-claims-script.test.ts`,
      `test/content-canon.test.ts`, `test/fixtures/value-score/**` (new)
- [ ] `AGENT_BOOTSTRAP.md`, `STATUS.md`, `_brain/PROTOCOL.md`
- [ ] `packages/provegate/practices/` counterparts + `pack-drift-ledger.json`
- [ ] `docs/research/provegate-bootstrap/` status banner + roadmap/whitepaper pointers
- [ ] `.changeset/` entry (minor)

---

## 9. Open Questions

(none) — all four resolved by owner on 2026-07-25.

**Q1 resolved:** exact two-decimal equality, made sound by constraining configured weights
to two decimals and recomputing in integer hundredths (FR-1, FR-2).
**Q2 resolved:** the doc-claims drift check ships, scoped narrowly to the governance file
set with an expiring allowlist (FR-6).
**Q3 resolved:** the weights live in `workflow.config.json` — which pulls the CLI config
surface into scope (FR-1) and the behavioral parity test with it (FR-5).
**Q4 resolved (readiness W1):** the 15 header-less legacy PRDs are handled by a
**prospective cutoff** (`enforceFrom: 17`), not by backfill and not by a per-file
exemption list.

---

## 10. References

- Gap analysis: P0 item 3 (doc drift remainder) + P2 item 7 (value-score recompute)
- Readiness W1–W7: `_readiness/wip/readiness-021-governance-truth-up.md`
- `_brain/learnings/score-must-equal-weighted-sum.md`
- `_brain/learnings/false-green-on-missing-file.md`
- `_brain/learnings/known-red-ledger-must-expire.md`
- `_brain/learnings/gate-wire-or-delete.md`
- `_brain/learnings/verify-check-phase-placement.md`
- Config contract: `packages/provegate/src/core/config/load.ts` (`deepMerge`,
  `configSourceFor`), `validate.ts` (unknown keys are errors)
- Worktree control-artifact binding: `packages/provegate/src/core/run/open.ts`
- `scripts/verify/pack-drift-ledger.json` (`_readme` describes the reconcile contract)
- Already closed by release prep (2026-07-25): the package README's "not implemented"
  claims — not in this PRD's scope

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `scripts/verify/verify-value-score.mjs`
- `scripts/verify/verify-doc-claims.mjs`
- `scripts/verify/doc-claims-allowlist.json`
- `scripts/verify/verify-workflow.mjs`
- `scripts/verify/pack-drift-ledger.json`
- `workflow.config.json`
- `packages/provegate/src/core/config/types.ts`
- `packages/provegate/src/core/config/defaults.ts`
- `packages/provegate/src/core/config/validate.ts`
- `packages/provegate/test/config-value-scoring.test.ts`
- `packages/provegate/test/value-score-script.test.ts`
- `packages/provegate/test/doc-claims-script.test.ts`
- `packages/provegate/test/content-canon.test.ts`
- `packages/provegate/test/fixtures/value-score/**`
- `AGENT_BOOTSTRAP.md`
- `STATUS.md`
- `_brain/PROTOCOL.md`
- `packages/provegate/practices/brain/PROTOCOL.md`
- `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`
- `packages/provegate/practices/templates/STATUS.template.md`
- `docs/research/provegate-bootstrap/**`

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Review artifact: `_docs/reviews/review-021-governance-truth-up.md`
- Learning: `_brain/learnings/docs-outlive-the-gate-they-promise.md` — the promise-vs-shipped
  gap is the recurring shape here (three of four wave-2 claims were already true); record
  it if the close confirms the pattern, otherwise downgrade this entry to `none` before
  Phase 4.

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR    | Command / Check                                                        | Scope | Notes                                                       |
| ----- | ------------------------------------------------------------------------ | ----- | ------------------------------------------------------------- |
| FR-1  | `pnpm --filter provegate test test/config-value-scoring.test.ts`          | pkg   | schema, defaults, merge, lexical two-decimal accept/reject     |
| FR-2  | `node scripts/verify/verify-value-score.mjs`                              | repo  | live corpus green under the cutoff                             |
| FR-3  | `pnpm --filter provegate test test/value-score-script.test.ts`            | pkg   | config resolution + print-weights parity with DEFAULT_CONFIG   |
| FR-4  | `pnpm --filter provegate test test/config-value-scoring.test.ts`          | pkg   | resolved config deep-equals defaults except the cutoff         |
| FR-5  | `pnpm --filter provegate test test/config-value-scoring.test.ts`          | pkg   | pre-existing worktree refused before merge, accepted after     |
| FR-6  | `pnpm --filter provegate test test/value-score-script.test.ts`            | pkg   | the behavior matrix, including every failing fixture           |
| FR-7  | `pnpm --filter provegate test test/doc-claims-script.test.ts`             | pkg   | positive, negative, and stale-allowlist cases                  |
| FR-8  | `pnpm verify:gates-wired`                                                 | repo  | both checks wired to an executing surface                      |
| FR-8  | `pnpm verify:workflow`                                                    | repo  | the bundle runs both new members                               |
| FR-9  | `pnpm verify:doc-claims`                                                  | repo  | zero stale wave-2 claims about wired scripts                   |
| FR-10 | `pnpm verify:pack-drift`                                                  | repo  | pack/live pairs reconciled, ledger updated                     |
| FR-11 | `pnpm --filter provegate test test/content-canon.test.ts`                 | pkg   | banner, canonical link, roadmap phase marks                    |
| FR-12 | `grep -rc "provegate': minor" .changeset`                                 | repo  | exits 1 when the minor changeset is missing                    |
| FR-12 | `grep -rc "upgrade the CLI before" .changeset`                            | repo  | the compatibility instruction is in the note                   |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/value-score-script.test.ts` — "a wrong declared
  total fails the check" and "an at-cutoff PRD with no header fails"; a check that only
  passes on good input is not evidence.
- Contract test: n/a — no client→server payload ships.

Before Phase 2 PASS, run: `gate check PRD-021`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT let a missing header pass at or after the cutoff, or let a *wrong* header pass
  anywhere — the exemption covers absence only.
- DO NOT compare totals as floats or introduce a tolerance band; the weight validation is
  what makes exact comparison sound.
- DO NOT validate the two-decimal rule with `Number.isInteger(weight * 100)` — it rejects
  legal values such as 0.29; check the canonical decimal text first.
- DO NOT use `pnpm changeset status` as proof that a changeset exists; it exits 0 on an
  empty `.changeset/`.
- DO NOT backfill invented scores into the pre-cutoff PRDs.
- DO NOT put anything except the cutoff in the root `workflow.config.json`.
- DO NOT edit a live governance file without porting the practices counterpart and
  reconciling the ledger in the same change.
- DO NOT silence either new check with a known-red ledger entry instead of fixing the
  claim, and DO NOT add an allowlist entry without a `reviewBy` date.
- DO NOT change the default weight values or thresholds under cover of this cleanup —
  making them configurable is in scope, retuning them is not.
- DO NOT rewrite research-pack content while adding its status banner.

---

## Changelog

| Date       | Author | Changes                                                                        |
| ---------- | ------ | -------------------------------------------------------------------------------- |
| 2026-07-25 | Cursor | Initial draft from the vision gap analysis (P0-3 and P2-7)                       |
| 2026-07-25 | Cursor | Owner resolved three Open Questions: exact equality, narrow doc-claims check, config-borne weights (FR count 6 → 8) |
| 2026-07-25 | Cursor | Readiness iteration 2 (ITERATE 7.50): lexical two-decimal validation replaces arithmetic (`Number.isInteger(0.29 * 100)` is false), the worktree control-artifact transition becomes a tested FR-5, FR-11 gets a direct banner assertion, and `changeset status` is replaced as evidence because it exits 0 on an empty `.changeset/` (FR count 11 → 12) |
| 2026-07-25 | Cursor | Readiness iteration 1 (ITERATE 4.43): prospective cutoff at PRD-017 for the 15 legacy PRDs, `valueScoring` specified as a real schema with two-decimal weights and integer-hundredths arithmetic, behavioral parity via `--print-weights`, doc-claims grammar and expiring allowlist, changeset/rollout/downgrade stated, token greps replaced by spawn tests (FR count 8 → 11); value re-scored 3.55 → 3.65 |
