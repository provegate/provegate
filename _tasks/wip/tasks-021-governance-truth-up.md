# Tasks: Governance Truth-Up

> **PRD**: [prd-021-governance-truth-up.md](../../_prds/wip/prd-021-governance-truth-up.md)
> **Readiness**: [readiness-021-governance-truth-up.md](../../_readiness/wip/readiness-021-governance-truth-up.md)
> **Status**: Not Started
> **Readiness Score**: 8.09/10 (PASS, iteration 15, independent)
> **Model Tier (Execution)**: high — Phase 4 and Phase 6 both. The config surface, the
> lint seam, and the loader exception are cross-module.
> **Created**: 2026-07-27
> **Updated**: 2026-07-27

> **Regenerated 2026-07-27.** The previous plan (82 tasks) scored the FR set that shipped
> the value-score gate as `scripts/verify/verify-value-score.mjs`; the owner moved it into
> the package, and five further readiness iterations changed FR-1, FR-2, FR-6, FR-10 and
> FR-12. Nothing was checked off in the old plan, so no work is lost.

---

## Task Outcome Rules

- `[x]` means the task was completed as written. A task that could not be completed as
  written stays unchecked and its reason goes in **Deferrals & Decisions**.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Phase 4 agents hold a valid PRD-021 lease before editing implementation files or this
  ledger.
- Autonomous Close is **operator-gated**: the merge gate refuses until an owner-signed
  acceptance entry exists (this PRD changes the published config surface).
- No sub-task may introduce `any`, a lint bypass, a swallowed failure, a runtime
  dependency, a network call, or a push code path.
- **Read the PRD's Changelog before starting a parent task.** Five readiness iterations
  changed rules inside FRs that other sections used to describe differently; the top five
  rows say what moved.

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
- `notes-column-runs-commands` — **reproduced live during this PRD's readiness round**: a
  backticked word in a §11 Notes cell was parsed as a verification command and refused as
  unsafe. No backticks in the Notes column until PRD-023 FR-7(a) scopes the parser.
- `assert-absent-needs-an-independent-cause` — this PRD is dense with reject fixtures. For
  each, the absence must have a cause independent of the scenario, proved by mutation.
- `strictness-added-during-extraction-is-a-behavior-change` — FR-2 moves a decision out of
  the standalone script into `lintPrd`; where it diverges from the snapshot the PRD says
  so, and everything else must behave as the source does.
- `evidence-pattern-satisfied-by-the-template` — FR-2 generates a required-line pattern
  and this repo ships a PRD template. Assert the template does not satisfy it.

---

## Relevant Files

### Config surface (published — this is what makes the PRD a release)

- `packages/provegate/src/core/config/types.ts` — the `valueScoring` block.
- `packages/provegate/src/core/config/defaults.ts` — the five axes and their weights;
  `enforceFrom` **absent**, not `1`.
- `packages/provegate/src/core/config/validate.ts` — shape (`validateConfig`, sees the raw
  partial) and resolved semantics (`validateResolvedConfig`, sees the merged object).
- `packages/provegate/src/core/config/load.ts::resolveConfig` — **the loader exception**.
  `deepMerge` (195-205) recurses into plain objects, so `weights` would merge while `axes`
  replaces. Claimed by this PRD because FR-1's rule lives here, not in validation.
- `workflow.config.json` — owned by PRD-018; this PRD adds one key.
- `.changeset/` — the minor release entry carrying the compatibility instruction.

### The gate

- `packages/provegate/src/core/gates/value-score.ts` (new) — the decision.
- `packages/provegate/src/core/gates/prd-ready.ts::lintPrd` — the call site. Already
  four-arity with `root?: string`; the id is the **optional fifth** parameter.
- `packages/provegate/src/core/gates/index.ts` — the export.
- `packages/provegate/src/cli.ts::runCheck` — the `--value-score` sweep branch, and the
  one caller that passes the id.

### The doc-claims checker

- `scripts/verify/verify-doc-claims.mjs` (new), `scripts/verify/doc-claims-allowlist.json`
  (new), `scripts/verify/verify-workflow.mjs` (bundle membership),
  `.github/workflows/ci.yml` (two different jobs — see FR-8).

### The documents being corrected

- `AGENT_BOOTSTRAP.md`, `STATUS.md`, `_brain/PROTOCOL.md` and their three practices
  counterparts; `packages/provegate/prompts/PLACEHOLDERS.md`;
  `docs/research/provegate-bootstrap/` (banner, roadmap, whitepaper);
  `scripts/verify/pack-drift-ledger.json`.

### The conflict-surface parser (FR-13)

- `packages/provegate/src/core/state/markdown.ts` — `declaredGlobs`,
  `parseConflictSurface`, and the exported `isRootRelativeFilename` PRD-023 consumes.
- `packages/provegate/src/core/locks/conflicts.ts` (enforcing), `state/query.ts` (advisory).

---

## Tasks

- [x] 0.0 Pre-flight and ownership
  - [x] 0.1 Lease refreshed with `gate open PRD-021 --worktree` — 36 surface globs; branch `feat/prd-021-governance-truth-up`, worktree `.worktrees/prd-021-governance-truth-up`, `pnpm install --frozen-lockfile` + `pnpm build`. The plain claim taken earlier could not become a worktree claim until the main checkout returned to `main`: it had been parked on another session's feature branch, and `gate open --worktree` correctly refused with "missing or uncommitted on 'main'". That refusal was accurate, not a bug.
        Original: Hold a PRD-021 lease before editing anything. If claiming `--worktree`, the PRD file must be committed **on `main`** — a claim from a checkout parked on another branch is refused with "missing or uncommitted on 'main'", which is the refusal, not a bug. Record branch/worktree in the Progress Log.

  - [x] 0.2 Cleared: PRD-017, PRD-018 and PRD-019 all read `Ship Verified`. Root `workflow.config.json` exists and carries exactly one key, `memory` — so FR-4 merges `valueScoring` into a file PRD-018 created, which is what task 4.1 requires.
        Original: **Hard stop** — confirm PRD-018 and PRD-019 read `Ship Verified` in `_state/prds.json`. FR-4 merges a key into a `workflow.config.json` PRD-018 creates; if that file is absent, the dependency was violated — **stop, do not create it**, or the two PRDs each land a different first version of a control artifact.

  - [x] 0.3 **Re-measured, and the answer changed since Phase 3.** PRD-023 is now `Superseded`: a concurrent session split it into **PRD-024 readiness-lint-parsers, PRD-025 wiring-audit-completion, PRD-026 duplicate-consolidation**, all Draft/ITERATE. `gate queue` reports **no overlap warning**, and that silence is not evidence — the advisory only compares READY items, and all three are Draft. Read against their declared surfaces, all three overlap this PRD: 024 on `prd-ready.ts`; 025 on `config/types.ts`, `config/defaults.ts`, `config/validate.ts`, `changeset-entry.test.ts` and `.changeset/`; 026 on `cli.ts`, `prd-ready.ts` and `practices/templates/AGENT_BOOTSTRAP.template.md`. PRD-021 holds the lease and is IN-FLIGHT, so `gate open` refuses any of them while it is held — the sequencing is protected, but by the lease rather than by the advisory.
        Original: Run `gate queue` and record the live overlap. Do not trust this plan's or the PRD's enumeration — both have gone stale three times. PRD-023 is the live counterpart and a concurrent session may be revising it.

  - [x] 0.4 All nine read; all nine `status: active` and still accurate.
        Original: Open the nine Memory Context records; confirm the paths and commands each one names still exist; note any stale finding in **Deferrals & Decisions**.

  - [x] 0.5 All four re-measured and confirmed: `deepMerge` recurses at `load.ts:202` and runs at `243`, before `validateResolvedConfig(merged)` at `244`; `lintPrd` is four-arity with `root?: string` fourth (`prd-ready.ts:108-113`); the orphan rule is `content-placeholders.test.ts:59-61`; the snapshot regex carries `/i` (`verify-prd-ready.mjs:292`). **The measurement also found a divergence the PRD does not yet record** — see Deferrals.
        Original: Re-measure the four facts the FRs depend on, because each was wrong in an earlier revision and each is one command: `deepMerge` recurses into plain objects (`load.ts:195-205`) and runs before `validateResolvedConfig` (`load.ts:243-244`); `lintPrd` is four-arity with `root?: string` fourth (`prd-ready.ts:108-113`); `content-placeholders.test.ts:59` fails on orphan declarations; the source snapshot's header regex carries `/i` (`verify-prd-ready.mjs:292`).

  - [x] 0.6 Baseline green: `pnpm test` 7/7 tasks, `pnpm verify:workflow` PASS, `check --wiring` ok.
        Original: Capture the green baseline for `pnpm test`, `pnpm verify:workflow`, and `node packages/provegate/dist/cli.js check --wiring`; a pre-existing red is ledgered, never normalized silently.


- [x] 1.0 FR-1 — the `valueScoring` config surface
  - [x] 1.1 `ValueScoringConfig` in `types.ts` with `axes`, `weights`, optional `enforceFrom`. The doc comment carries the two rules that live outside validation — ordered axes, and the loader exception — because they are the ones a reader of the type would otherwise not find.
        Original: Add the type: `{ enforceFrom?: number, axes: string[], weights: Record<string, number> }`. `enforceFrom` is optional and **absent ≠ 0**; the shipped default omits it.

  - [x] 1.2 `DEFAULT_CONFIG.valueScoring` = the five axes and .25/.25/.20/.15/.15, **no `enforceFrom` key at all**. Asserted with `'enforceFrom' in vs === false`, not just `undefined`.
        Original: `DEFAULT_CONFIG` carries `axes: ["MF","UI","TL","AR","RM"]` and the five weights (.25/.25/.20/.15/.15), and **no `enforceFrom`**.

  - [x] 1.3 `AXIS_ID = /^[A-Za-z][A-Za-z0-9_]{0,15}$/`, checked before any pattern could be built. Reject fixtures: `A/B`, `.*`, `has space`, empty.
        Original: Charset: each identifier matches `/^[A-Za-z][A-Za-z0-9_]{0,15}$/`, validated **before** any pattern is constructed. Reject fixtures: `A/B`, `.*`, `has space`, the empty string.

  - [x] 1.4 Case-INSENSITIVE uniqueness with a message distinct from the charset one, and the test asserts the distinctness (`not.toMatch` the charset text). Mutation-checked: folding removed → only this test fails.
        Original: Uniqueness: identifiers must be unique **case-insensitively**, because the generated pattern is case-insensitive (the snapshot's `/i`, ported deliberately). Reject `["MF","MF"]` and `["MF","mf"]` with a duplicate-identifier message **distinct from** the charset message; the two must not collapse.

  - [x] 1.5 2 ≤ `axes.length` ≤ 10, both bounds covered.
        Original: Count bound: `axes.length` ≥ 2 and ≤ 10.

  - [x] 1.6 Set equality in both directions, `> 0`, the **lexical** two-decimal test, and the sum in integer hundredths. A weight that fails the decimal form sets `scalable = false` so it does not also produce a confusing sum error — asserted.
        Original: Weight rules in `validateResolvedConfig`: the key set exactly equals the **resolved** axis set, each weight finite and `> 0`, at most two decimals by the **lexical** test (`String(weight)` matches `/^0(\.\d{1,2})?$|^1(\.0{1,2})?$/`), and the set sums to exactly 1 in integer hundredths. Accept 0.29 and 0.58; reject 0.155 and 1e-7. Scale with `Math.round(weight * 100)` only after the lexical check.

  - [x] 1.7 `mergeConfig()` in `load.ts`: when the parsed config declares `axes`, the whole `valueScoring` replaces the default instead of merging. `deepMerge` is untouched — the exception lives where the merge is decided, not in validation, which runs afterwards and cannot see what the adopter wrote.
        Original: **The loader exception, in `resolveConfig` and nowhere else.** When the parsed config supplies `valueScoring.axes`, the whole `valueScoring` object replaces the default **before** `deepMerge`, with no default fill-in of any key. `deepMerge` itself is not modified — every other config key wants recursive merge.

  - [x] 1.8 `axes` absent → ordinary recursive merge, deliberately. A weights-only config retunes the default axes and resolves.
        Original: **`axes` absent → ordinary recursive merge, deliberately.** A weights-only config is a legal partial retune of the default axes. Do not reject it; the sum rule is what catches an incoherent partial.

  - [x] 1.9 Proven through `resolveConfig`, writing a real `workflow.config.json`: a three-axis config resolves to exactly three weight keys. Mutation-checked — removing the exception fails this and three others.
        Original: Prove 1.7 with a **resolution** test through `loadConfig`, not a validation fixture: a three-axis config file resolves to exactly three weight keys. A hand-built resolved object would pass while the real loader failed — the defect this rule exists to fix.

  - [x] 1.10 Both directions: a two-of-five retune summing to 1 resolves; a one-of-five retune summing to 1.05 fails with `must sum to exactly 1 (got 1.05)`, naming the sum rather than the axes.
        Original: Prove 1.8 in both directions: a weights-only config retuning two of five and still summing to 1 **resolves and passes**; one retuning one of five to sum 1.05 **fails on the sum**, naming the sum rather than the axis set.

  - [x] 1.11 All five adopter fixtures, plus `enforceFrom: 0` legal and an unknown key inside `valueScoring` refused.
        Original: Fixtures for the adopter cases: `valueScoring` absent entirely; `weights` set with no `enforceFrom`; a three-axis config with matching weights; weights naming an axis `axes` omits; `axes` naming an identifier `weights` omits. In the first two, a header-less PRD passes.


- [x] 2.0 FR-2 — the recompute as a package gate
  - [x] 2.1 `core/gates/value-score.ts` created and exported from `core/gates/index.ts`.
        Original: Create `core/gates/value-score.ts` and export it from `core/gates/index.ts`.

  - [x] 2.2 `headerPattern(axes)` builds the axis and dimension segments from the configured identifiers; case-insensitive, following the snapshot's `/i`; not anchored on the closing paren. Mutation-checked indirectly by the configured-axes test: a three-axis config scores its own header while the default config calls the same header malformed.
        Original: Build the header pattern **from `config.valueScoring.axes`**, never a literal: axis segment = validated identifiers joined by `/`; dimension segment = `axes.length` groups of `[1-5]` joined by `/`. Accept an optional leading `>`, `Value` with optional surrounding `**`, a colon inside or outside the bold run, the total, any non-`(` filler, then the parenthesised pair. Do **not** anchor on the closing paren.

  - [x] 2.3 `([1-5])` per dimension. Reject fixtures cover `0` and `6`, both **malformed** and asserted `not.toMatch(/recompute/)` so the two failure kinds cannot collapse. Mutation: `([0-9])` fails exactly this test. **The snapshot divergence 0.5 found is now recorded in the module doc comment** — the snapshot's groups are `[0-5]`, so it accepts a 0.
        Original: Dimensions are `[1-5]`, not "a single digit". Reject fixtures must include a `0` and a `6`, each failing as **malformed** rather than as an arithmetic mismatch — the two messages read differently and must not be collapsed.

  - [x] 2.4 `metadataBlock()` slices before the first `---`; `declarationLines()` counts openers there. Zero → absent, one → the declaration, two+ → malformed. Mutation: searching the whole document fails exactly the body-documentation test.
        Original: Search **only the metadata block** (before the first `---`); zero matches is "no header", one is the declaration, **two or more is malformed**. Negative fixture: two `Value` lines with different totals in the block.

  - [x] 2.5 `totalToHundredths` accepts `\d+(\.\d{1,2})?` only; `4.100` is malformed and asserted not to mention recompute.
        Original: Parse the declared total lexically into integer hundredths: one or two decimal places only. Three decimals, exponent notation, and a bare integer are malformed.

  - [x] 2.6 Exact equality in integer hundredths. Mutation: a `Math.abs(...) > 1` band fails exactly the no-tolerance test. **An arithmetic bug was caught here by its own test** — the first version divided the hundredths sum by 100 a second time, turning 4.10 into 0.04; Σ(weightHundredths × dim) IS the total in hundredths.
        Original: Recompute as `Σ weightHundredths × dim` and require **exact** equality. Record the divergence from the snapshot's `0.005` tolerance in **Deferrals & Decisions**: the tolerance exists there because its weights are unvalidated constants.

  - [x] 2.7 Wrong names and right-names-wrong-order both malformed, each with its own test.
        Original: A header whose axis list disagrees with the configured axes — right count, wrong names, or right names in the wrong order — fails as **malformed**.

  - [x] 2.8 `lintPrd(config, manifest, content, root?, prdNumber?)` — fifth and optional. All 190 existing tests in `prd-ready.test.ts`, `content-templates.test.ts` and `example-manifests.test.ts` pass **unmodified**.
        Original: Call it from `lintPrd`. The id is the **optional fifth** parameter: `lintPrd(config, manifest, content, root?: string, prdNumber?: number | null)`. A required parameter cannot follow the optional `root`.

  - [x] 2.9 `prdNumber === undefined || prdNumber === null` — both spellings take the absence path, asserted for `undefined`, explicit `null`, and omitted. Mutation: `=== null` alone fails exactly that test.
        Original: Guard on **absence**, not on `null`. Existing callers omit the argument and supply `undefined`; a `=== null` test enforces presence on all 44 call sites the moment this repo sets `enforceFrom`, and the first casualty is `content-templates.test.ts:99`, which lints the shipped header-less template and asserts zero issues.

  - [x] 2.10 `cli.ts:655` now passes `found.record.number`. No other call site touched.
        Original: Update the one caller that has an id — `cli.ts::runCheck`, which already resolved the record. Leave the other 43 untouched; that is what the optional parameter buys.

  - [x] 2.11 All four modes tested: no cutoff → header-less passes; cutoff set → pre-cutoff passes, at-or-after fails; present-and-wrong fails at any id; `enforceFrom: 0` enforces everywhere.
        Original: Enforcement modes: `enforceFrom` absent → presence-triggered; set → a PRD with id `< enforceFrom` may omit the header, one at or after it may not. In every mode a present-and-wrong header fails at any id, and a malformed header fails at any id.

  - [x] 2.12 `evidence-pattern-satisfied-by-the-template` discharged: the shipped `templates/prd-template.md` scores `{ kind: 'absent' }` against the generated pattern, and lints clean. Pinned rather than assumed, because FR-10 edits templates in the same change.
        Original: `evidence-pattern-satisfied-by-the-template` — assert the shipped `templates/prd-template.md` does **not** satisfy the generated pattern. It carries no `Value:` line today, which is why presence-triggering is the default; pin the fact rather than assuming it, because FR-10 edits templates in the same change.


- [x] 3.0 FR-3 — the corpus sweep
  - [x] 3.1 `--value-score` branch in `runCheck`, beside `--wiring`, same shape.
        Original: Add `gate check --value-score` beside the `--wiring` branch in `runCheck`.

  - [x] 3.2 Iterates `buildState` records, applies FR-2's decision, prints one line per failure with both numbers, and prints each pre-cutoff skip **with its reason**. A record naming an unreadable file is a failure, not a skip: state and tree disagreeing is a finding.
        Original: Iterate `_state/prds.json` records (each carries `number` and `artifacts.prd`), apply FR-2's decision to each, print one line per failure with the declared and recomputed totals, and report pre-cutoff skips with their reason.

  - [x] 3.3 Weights come from the loaded config only. No fallback table, no `--print-weights`, no parity test.
        Original: Weights come from the loaded config and nowhere else — no fallback table, no `--print-weights`, no parity test.

  - [x] 3.4 `--value-score` added to `unknownOption`'s allowlist, or the command would refuse its own flag.
        Original: Add the flag to `unknownOption`'s allowlist for `check`, or the command refuses its own flag.


- [x] 4.0 FR-4 / FR-5 — this repo's cutoff and the control-artifact edit
  - [x] 4.1 One key merged into the existing root `workflow.config.json`; the `memory` block PRD-018 wrote is untouched.
        Original: Merge `{"valueScoring": {"enforceFrom": 17}}` into the existing root `workflow.config.json`. Do not recreate or rewrite the file.

  - [x] 4.2 Covered by the resolution tests in `config-value-scoring.test.ts` — a config supplying only `enforceFrom` resolves to the shipped axes and weights.
        Original: Assert the resolved config deep-equals the defaults except the cutoff.

  - [x] 4.3 `config-value-scoring.test.ts` FR-5 block: a lease claimed while the config was committed, then the config edited and committed, then reuse **refused** naming `workflow.config.json` with the merge remedy — and **accepted** after the worktree merges. The remedy is performed, not quoted.
        Original: FR-5 fixture: editing `workflow.config.json` advances the base, so a pre-existing worktree lease is refused on reuse until it merges — refused before, accepted after. The **introduction** case belongs to PRD-018; prove only the edit.

  - [x] 4.4 Re-checked at the moment of the edit: this worktree's own lease is now stale against base by exactly this mechanism, which is the live instance of what 4.3 fixtures. `_state/locks` holds only PRD-021's lease, so nothing else is affected. Re-check again before the merge — the measurement goes stale.
        Original: Phase 4 preflight: re-check `_state/locks` immediately before committing the config edit, because the measurement goes stale within hours. Any live lease merges base before its next `gate` command.


- [x] 5.0 FR-6 — prove the decision at the unit and the sweep at the command
  - [x] 5.1 Unit matrix in `value-score.test.ts`: exact arithmetic, a mismatch naming both numbers, the no-tolerance divergence, one- and two-decimal totals, and a three-decimal total failing as malformed rather than as a mismatch.
        Original: Unit matrix over `value-score.ts` and `lintPrd`: custom valid weights → a total computed from them; a wrong total → the failure names declared **and** recomputed; a malformed header → fails at any id; a pre-cutoff header-less PRD → passes; an at-cutoff header-less PRD → fails.

  - [x] 5.2 Both spellings and omission, all three asserted; and a present-wrong header failing at `undefined`, `null`, 1 and 99.
        Original: **Absent id, both spellings** — `undefined` (what every existing caller emits) and explicit `null` — with no header → **passes**. With a present wrong header → **fails**: the arithmetic never depends on the id.

  - [x] 5.3 A three-axis config scores its own header; the same header under the default axes is **malformed**, not absent — the author renamed an axis and is told.
        Original: Custom-axis cases: a three-axis config scoring a matching header passes; the same header under the default five-axis config fails as malformed.

  - [x] 5.4 Built-CLI fixture driving `dist/cli.js` over a seeded corpus: one correct, one wrong, one pre-cutoff header-less. Asserts the exit code, the failing PRD named with both numbers, the correct one absent from failures, and the skip printed with its reason.
        Original: Built-CLI fixture for the sweep, as `cli-state.test.ts` does — a seeded repo with one correct PRD, one wrong total, one pre-cutoff header-less PRD. Assert the exit code, the failing PRD named in stdout, and the pre-cutoff one **absent** from the failures.

  - [x] 5.5 Every negative mutation-checked. **One assertion did not survive its own mutation and was rebuilt**: folding the header-less counter into the scored counter left the tally test green, because in the cutoff corpus every header-less item is skipped before it can be counted. A no-cutoff case now pins the separation, and the mutation fails it.
        Original: Mutation-check every negative in 5.1-5.4 (`assert-absent-needs-an-independent-cause`): revert the rule, confirm exactly its own case fails. A negative that survives its own mutation is a defect in the test.


- [x] 6.0 FR-7 — the doc-claims grammar
  - [x] 6.1 `verify-doc-claims.mjs` requires BOTH halves: a script token normalised to `verify:<name>` that is actually a wired `verify:*` key in root `package.json`, and a marker from the closed list. Mutation: dropping the wiring lookup fails exactly the not-wired case.
        Original: `scripts/verify/verify-doc-claims.mjs`: a line fails when it carries **both** a script token (`verify:<name>` or `verify-<name>.mjs`) that is wired as a `verify:*` key in root `package.json`, **and** a future marker (`wave 2`, `wave-2`, `lands in`, `will land`, `future work`, `stub now`, `specify later`, `not yet`).

  - [x] 6.2 Six documents scanned; fenced blocks and STATUS.md's Recent activity excluded. Mutation: scanning inside fences fails exactly the fence test. **A listed file that is missing FAILS rather than being skipped** — the scanned set is the checker's own coverage claim.
        Original: Scanned set: `AGENT_BOOTSTRAP.md`, `STATUS.md`, `_brain/PROTOCOL.md` and the three practices counterparts. Exclude fenced blocks and `STATUS.md`'s Recent activity section as historical record.

  - [x] 6.3 Shrink-only in both directions: an entry past its `reviewBy` fails even while it still matches, and an entry matching no line fails. Both mutation-checked. Entries also need a reason and a well-formed date.
        Original: `doc-claims-allowlist.json` holds `{file, claim, reason, reviewBy}` and is **shrink-only**: an entry matching no line, or past its `reviewBy`, fails.

  - [x] 6.4 11 tests in `doc-claims-script.test.ts`, driving the script in a temp repo — what it audits is a repository, so importing its internals would test a grammar rather than the check. Five mutations, five hits.
        Original: Tests with positive, negative, and stale-allowlist fixtures.


- [x] 7.0 FR-8 — wiring, on two different surfaces
  - [x] 7.1 `verify:doc-claims` added to `package.json`, to `verify-workflow.mjs`'s CHECKS, and as a CI hygiene step.
        Original: `verify:doc-claims`: a `package.json` script, a member of the `verify:workflow` bundle, and a step in the CI **hygiene** job.

  - [x] 7.2 `verify:value-score` runs `node packages/provegate/dist/cli.js check --value-score` and is a step in the **build** job after `pnpm build`, with the reason in a comment. Deliberately not a `verify:workflow` member — the bundle is the no-build local surface.
        Original: `verify:value-score`: `node packages/provegate/dist/cli.js check --value-score` — it needs `dist/`, so it goes in the **build-dependent** CI job after `pnpm build`, and is deliberately **not** a `verify:workflow` member. A bundle member that fails on a clean checkout without `dist/` would report the absence of a build as a governance violation.

  - [x] 7.3 Recorded below.
        Original: Record in **Deferrals & Decisions** that this makes `verify:value-score` the first `gate` invocation on any automated surface of this repository.

  - [x] 7.4 `pnpm verify:gates-wired` PASS — 12 registered, 11 on disk; the CI-only check is seen through the step text.
        Original: `pnpm verify:gates-wired` green — it accepts CI `run:` text as an executing surface, which is how the CI-only check is seen.


- [x] 8.0 FR-9 / FR-10 — correct the documents and the pack pairs
  - [x] 8.1 **The checker found the two stale claims on its first run**, which is the measured defect this PRD was written for: `AGENT_BOOTSTRAP.md:128` called `verify:durable-artifacts` "wave 2" and `_brain/PROTOCOL.md:226` called `verify:brain` the same. Both corrected to name the wired surface; `verify:doc-claims` then passes.
        Original: FR-9: correct the stale claims in `AGENT_BOOTSTRAP.md`, `STATUS.md` and `_brain/PROTOCOL.md`; each sentence names the shipped script and the surface that runs it. The triage section documents that axes, weights and cutoff are configurable, names the defaults, and says the shipped default is presence-triggered while this repo opts in at PRD-017.

  - [x] 8.2 Both tables pinned in `content-canon.test.ts` by PARSING the rows into `[axis, weight]` and deep-equalling `DEFAULT_CONFIG.valueScoring` in order — a string match would pass on a table with the right numbers in the wrong rows.
        Original: FR-9: **pin** the root triage table to `DEFAULT_CONFIG` rather than leaving it prose. One authority, two projections, both mechanically checked.

  - [x] 8.3 Pack counterparts reviewed pair by pair and the ledger reconciled (49 pairs). The pack side of `brain/PROTOCOL.md` keeps "Optional enforcement (ships with the `verify:*` library)" because that is TRUE for an adopter — the pack ships the script and they wire it — while this repo's copy says it is wired here. Intentional divergence, reviewed rather than propagated.
        Original: FR-10: port the corrections to the three practices counterparts and reconcile `pack-drift-ledger.json` in the same change — a one-sided edit fails the bundle.

  - [x] 8.4 `{{VALUE_AXES_TABLE}}` **removed**, not registered. Registering a token no template contains would red `content-placeholders.test.ts:59`'s orphan check — the fix guaranteeing the failure it fixes.
        Original: FR-10: **remove** `{{VALUE_AXES_TABLE}}` from the practices template; do **not** register it. `content-placeholders.test.ts:59` fails on orphan declarations, so registering a token no template contains reds an existing green test. Register-**or**-remove.

  - [x] 8.5 The template renders the default table inline, pinned to `DEFAULT_CONFIG` by a test, above a sentence naming `workflow.config.json` `valueScoring` and telling an adopter who changes it to edit the table. It also states that changing axes is a corpus migration and names the sweep.
        Original: FR-10: the template renders the default table inline, **pinned to `DEFAULT_CONFIG` by a test**, above a sentence naming `workflow.config.json` `valueScoring` as the source and telling an adopter who changes it to edit the table.

  - [x] 8.6 Walk widened to `practices/templates/`, and the specified green state reached exactly: four adopter-fill tokens registered, `{{VALUE_AXES_TABLE}}` gone, and `{{PLACEHOLDER}}` disposed of by **masking HTML comments** — it is the word inside the template's own instruction comment, not a token. No unplanned token surfaced.
        Original: FR-10: widen the placeholder walk to `practices/templates/` **and hit the specified green state** — measured 2026-07-27, that file carries six tokens and none is declared. Register the four adopter-fill ones (`LINK_TO_VISION_DOC`, `VISION_OR_DECISIONS_DOC`, `ONE_LINE_PRODUCT_FRAMING`, `PROJECT_SPECIFIC_HARD_RULES`); exclude HTML comments from the walk, which disposes of `{{PLACEHOLDER}}` — the word inside the template's own instruction comment, not a token. If the walk surfaces a token this list does not name, **report it and stop**; an unplanned token is a finding, not a reflex registry row.


- [x] 9.0 FR-11 — the research-pack canon banner
  - [x] 9.1 Banner on the research README: frozen record, extraction complete through PRD-016, live canon `apps/docs/`, and the conflict rule stated — the published document wins.
        Original: Banner on `docs/research/provegate-bootstrap/README.md`: frozen bootstrap record, extraction complete through PRD-016, live canon is `apps/docs`.

  - [x] 9.2 Roadmap carries a dated status note saying its unchecked boxes are historical plan, not remaining work, and pointing at `STATUS.md` and `gate queue` for what is actually left. The whitepaper draft is marked superseded by v1.0.
        Original: Mark the roadmap's shipped phases; point the draft whitepaper at published v1.0.

  - [x] 9.3 `content-canon.test.ts` asserts all three directly.
        Original: `content-canon.test.ts` asserts the banner directly — the exact canonical link, the "complete through PRD-016" statement, and that the shipped phases are marked.


- [x] 10.0 FR-13 — make a repo-root Conflict Surface claim real
  - [x] 10.1 Both literal shapes implemented, plus the path-side rules (`..` segment, leading `/`, whitespace, trailing dot). Mutation-checked in two directions.
        Original: (a) Accept root-relative filenames by **literal predicate**: a named file `^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*\.[A-Za-z0-9]+$` or a dotfile `^\.[A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9]$`. Both forbid whitespace, a leading `/`, a `..` segment, and a trailing `.` — which is what excludes `e.g.`, `i.e.` and `etc.` The predicate is the specification.

  - [x] 10.2 `isRootRelativeFilename` exported from `core/state/markdown.ts` and re-exported from the state barrel, with its own unit tests covering the accept list and the prose-abbreviation reject list.
        Original: (a′) Export it as `isRootRelativeFilename(token: string): boolean` from `core/state/markdown.ts`, with its own unit tests. **PRD-023 FR-3 consumes it** — without the export that PRD must duplicate the logic it exists to remove.

  - [x] 10.3 `parseConflictSurface(content) → { globs, rejected }` added; `declaredGlobs` keeps its `string[]` signature and delegates. A test asserts the two agree, so the delegation cannot rot.
        Original: (b) Add `parseConflictSurface(content): { globs, rejected: {token, reason}[] }`; `declaredGlobs` keeps its `string[]` signature and delegates, so no caller breaks.

  - [x] 10.4 Both consumers: `candidateFromPrd` carries `rejected` on the candidate (enforcing) and `open.ts` prints them as warnings on **every** outcome including success; `buildQueue` gains `surfaceRejections` and `gate queue` prints them under a `!` marker (advisory). Mutation: dropping the rejections fails three tests across both paths.
        Original: (c) Surface the rejections at both real consumers — `candidateFromPrd` (`gate open`, enforcing) and `readyOverlaps` (`gate queue`, advisory) — each printing token and reason. The enforcing path is where a missed claim is a hazard.

  - [x] 10.5 **Re-measured, and the FR's premise had gone stale.** FR-13 describes root claims being silently discarded; `declaredGlobs` was already fixed for that in PRD-018's round 24/25, and today PRD-018 and PRD-021 both keep their root claims. The live defect is the OPPOSITE and the FR's remedy still fixes it — see the finding below.
        Original: Re-measure the live effect and record it: which PRDs regain which root claims. Today PRD-018 loses `workflow.config.json` and `gates.manifest.json`; this PRD loses `workflow.config.json`, `AGENT_BOOTSTRAP.md` and `STATUS.md`.


- [x] 11.0 FR-12 — the release entry
  - [x] 11.1 `.changeset/lucky-pugs-argue.md`, minor, with the one-way rule and the upgrade/downgrade order.
        Original: A changeset declaring **minor** for `provegate`, whose note states the one-way compatibility rule: an older CLI rejects `valueScoring` as an unknown key, so upgrade before adding it and remove the key before downgrading.

  - [x] 11.2 Both directions stated, and asserted separately: `axes` requires the complete matching `weights` and replaces wholesale; `weights` alone is a legal partial retune checked by the sum rule.
        Original: The note states the merge rule **in both directions**: supplying `axes` requires the complete matching `weights` and replaces wholesale; supplying `weights` alone is a legal partial retune checked by the sum rule. Half of it is false adopter guidance.

  - [x] 11.3 One semantic assertion over ONE entry, parsing front-matter and tolerating all three quote styles. **W9 closed with evidence**: the mutation splits the two halves across two entries — a `provegate` minor entry and an unrelated one carrying the compatibility sentence — and the test fails, naming which half was found in which file. Two independent greps would have passed.
        Original: **One semantic assertion over one entry** (W9): read `.changeset/*.md`, parse each entry's YAML front-matter, and assert that **some single entry** both declares `provegate` at `minor` and carries the compatibility instruction. Tolerate `'provegate'`, `"provegate"` and bare. The failure names which half was found. `pnpm changeset status` is **not** evidence — it exits 0 with no changesets at all.


- [x] 12.0 Migration & Rollback (infra parent — 20% of the readiness weight)
  - [x] 12.1 Both stated separately in the changeset and in the practices template: on the stock config, none — presence-triggered, so the upgrade cannot fail a passing item. Once `axes` is edited, a corpus rewrite, in both the add and the remove direction.
        Original: State the two migrations separately, because they are different: **on the stock config, none** (presence-triggered, so upgrading cannot fail a passing PRD); **once `axes` is edited, a corpus rewrite** — a header whose axis list disagrees fails, so changing axes reds every scored PRD at once, and removing an axis does the same to every header naming it.

  - [x] 12.2 Stated with the command that produces the list: sweep with `gate check --value-score`, then land the axis change and the header rewrites in one commit.
        Original: The procedure for the second: sweep with `gate check --value-score`, then land the axis change and the header rewrites **in one commit**.

  - [x] 12.3 In the changeset, both directions: upgrade the CLI before adding the key, remove the key before downgrading. Asserted by `changeset-entry.test.ts`.
        Original: Rollout order: release the CLI carrying `valueScoring` → adopters upgrade → only then may they add the key. The reverse hard-fails on the unknown key.

  - [x] 12.4 Rollback names the optional FIFTH `prdNumber` argument, after the existing optional `root`. `value-score.ts` may stay once the call is gone.
        Original: Rollback: delete the doc-claims script and the `--value-score` branch, drop both `package.json` entries and the CI steps, remove the `valueScoring` key, and remove FR-2's `lintPrd` call plus the **optional fifth** `prdNumber` argument — fifth, after the existing optional `root`. `value-score.ts` may stay once the call is gone.

  - [x] 12.5 `_state/locks` at Phase 4 close: **PRD-021's own lease only**. This worktree is itself the live instance — editing `workflow.config.json` moved the control-artifact base, so PRD-022's revalidation will refuse `gate run`/`gate land` here until the edit is committed and base advances. Listed in Operator Handoff; re-check at merge time because the measurement goes stale.
        Original: Enumerate who a live `workflow.config.json` edit can refuse, from `_state/locks` at merge time, and list them in **Operator Handoff**.


- [x] 13.0 Phase 5 — execute verification
  - [x] 13.1 `pnpm build` run before every built-CLI row and after every mutation.
        Original: `pnpm build` first — three §11 rows drive the built CLI.

  - [x] 13.2 All 19 §11 rows run as written; the ledger carries per-file counts.
        Original: Run every §11 row exactly as written and fill the Verification Ledger with evidence. A row marked `passed` with no evidence is a `pending` row that lies.

  - [x] 13.3 `pnpm check-types` 0, `pnpm lint` 0, `pnpm test` 49 files / **1022 passed**, `pnpm build` clean, `pnpm verify:workflow` PASS.
        Original: Cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm verify:workflow`.

  - [x] 13.4 `check PRD-021` ok, `check --wiring` ok, and `check --value-score` ok — 11 scored, 0 without a header, 15 skipped.
        Original: `node packages/provegate/dist/cli.js check PRD-021` and `check --wiring`.

  - [x] 13.5 Re-read §12. The four plausible ones, each with a line: the header pattern is generated from `config.valueScoring.axes` in `headerPattern()` and never a literal (a test scores a three-axis config); the id guard is `prdNumber === undefined || prdNumber === null`, not `=== null`; `{{VALUE_AXES_TABLE}}` was removed and **not** registered; a weights-only config resolves rather than being rejected.
        Original: Re-read PRD §12 and confirm none of the DO NOTs was introduced. Give a named line to the four this implementation could plausibly violate: a literal header pattern, a `=== null` id guard, registering a removed token, and a weights-only config rejected.


- [ ] 14.0 Phase 6 — independent adversarial audit
  - [ ] 14.1 Independent review by a different model family; write
        `_docs/reviews/review-021-governance-truth-up.md`.
  - [ ] 14.2 **Brief it as a consistency sweep, not only a defect hunt.** Five readiness
        rounds on this PRD each found one defect, and every one was created by the fix for
        the round before — a rule corrected in its owning FR left the old rule stated
        elsewhere. Ask for every rule to be checked across §7, §8, §12, Migration, the
        Gherkin criteria and §11, not just inside the FR that owns it.
  - [ ] 14.3 Point it at the two things the tests cannot self-check: that the generated
        header pattern is genuinely built from config rather than a literal that happens to
        match, and that each reject fixture fails for the reason it names.
  - [ ] 14.4 Spec-vs-code audit: every FR target appears in the diff; every file in the
        diff appears in the Conflict Surface.
  - [ ] 14.5 `git add` the review artifact — an untracked durable artifact fails the close
        gate (`durable-artifact-must-commit`).

- [ ] 15.0 Phase 7 — durable learning and close preparation
  - [ ] 15.1 Run the `_brain` capture protocol. The PRD declares Memory Outputs `none`;
        append an exact path to **both** Memory Outputs and Durable Artifacts before
        writing a record. The likely candidate is already visible from readiness: a rule
        corrected in one section survives in the others, and the reviewer instruction that
        finds it is "sweep for stale copies", not "find defects".
  - [ ] 15.2 `pnpm verify:brain` and `pnpm verify:durable-artifacts`.
  - [ ] 15.3 Update `STATUS.md` and `_state/prds.json`.
  - [ ] 15.4 Leave the Operator Handoff acceptance row for the owner
        (`operator-acceptance-no-self-accept`); the merge gate refuses until it exists.

---
## Verification Ledger

| Gate               | Command / Check                                                  | Scope | Result  | Evidence | Notes |
| ------------------ | ---------------------------------------------------------------- | ----- | ------- | -------- | ----- |
| FR-1 | `pnpm --filter provegate test test/config-value-scoring.test.ts` | pkg | passed | `config-value-scoring.test.ts` — 18 passed. Resolution through `loadConfig`, not a hand-built resolved object. Three mutations fail their own tests. | schema, defaults, resolution through loadConfig, lexical two-decimal, enforceFrom absent |
| FR-2 | `pnpm --filter provegate test test/prd-ready.test.ts` | pkg | passed | `prd-ready.test.ts` — 33 passed, **unmodified**; the optional fifth parameter left all existing callers alone. | wrong total fails; an absent id, in either spelling, still enforces the arithmetic |
| FR-3 | `pnpm --filter provegate test test/value-score.test.ts` | pkg | passed | `value-score.test.ts` — 26 passed, including the built-CLI sweep over a seeded corpus. | built-CLI sweep names the failing PRD and skips the pre-cutoff one |
| FR-4 | `pnpm --filter provegate test test/config-value-scoring.test.ts` | pkg | passed | `config-value-scoring.test.ts`; the live repo resolves with `enforceFrom: 17` and the sweep is green. | resolved config deep-equals defaults except the cutoff |
| FR-5 | `pnpm --filter provegate test test/config-value-scoring.test.ts` | pkg | passed | `config-value-scoring.test.ts` — refused before the merge, accepted after, with the remedy performed. | pre-existing worktree refused before merge, accepted after |
| FR-6 | `pnpm --filter provegate test test/value-score.test.ts` | pkg | passed | `value-score.test.ts` — the full matrix; four mutations fail their own cases; one tally assertion was rebuilt after surviving its mutation. | the arithmetic and cutoff matrix, every negative mutation-checked |
| FR-7 | `pnpm --filter provegate test test/doc-claims-script.test.ts` | pkg | passed | `doc-claims-script.test.ts` — 11 passed, five mutations, five hits. | positive, negative, stale-allowlist |
| FR-8 | `pnpm verify:gates-wired` | repo | passed | `pnpm verify:gates-wired` PASS (12 registered, 11 on disk — the CI-only check seen through step text). | both wired; the CI-only one seen via step text |
| FR-8 | `pnpm verify:workflow` | repo | passed | `pnpm verify:gates-wired` PASS (12 registered, 11 on disk — the CI-only check seen through step text). | bundle runs doc-claims; value-score deliberately absent |
| FR-8 | `pnpm verify:value-score` | repo | passed | `pnpm verify:gates-wired` PASS (12 registered, 11 on disk — the CI-only check seen through step text). | the built CLI sweeps the live corpus green |
| FR-9 | `pnpm verify:doc-claims` | repo | passed | `pnpm verify:doc-claims` PASS — it found both stale claims on its first run and they are corrected. `content-canon.test.ts` 7 passed. | zero stale wave-2 claims about wired scripts |
| FR-9 | `pnpm --filter provegate test test/content-canon.test.ts` | pkg | passed | `pnpm verify:doc-claims` PASS — it found both stale claims on its first run and they are corrected. `content-canon.test.ts` 7 passed. | the triage table deep-equals the configured axes and weights |
| FR-10 | `pnpm --filter provegate test test/content-placeholders.test.ts` | pkg | passed | `content-placeholders.test.ts` 4 passed with the widened walk; `pnpm verify:pack-drift` PASS after reviewing all 49 pairs. | the walk covers practices/templates; every token there registered |
| FR-10 | `pnpm verify:pack-drift` | repo | passed | `content-placeholders.test.ts` 4 passed with the widened walk; `pnpm verify:pack-drift` PASS after reviewing all 49 pairs. | pack/live pairs reconciled, ledger updated |
| FR-11 | `pnpm --filter provegate test test/content-canon.test.ts` | pkg | passed | `content-canon.test.ts` — banner, canonical link, roadmap note, superseded whitepaper. | banner, canonical link, roadmap phase marks |
| FR-12 | `pnpm --filter provegate test test/changeset-entry.test.ts` | repo | passed | `changeset-entry.test.ts` — 5 passed. W9 mutation-checked: two half-entries fail and the message names which half was found where. | one entry declares minor AND carries the sentence; two half-entries fail |
| FR-13 | `pnpm --filter provegate test test/markdown.test.ts` | pkg | passed | `markdown.test.ts` 25, `conflicts.test.ts` 23, `state-query.test.ts` 18. Four mutations across both consumers. | root-file claims parse; each rejection names token and reason |
| FR-13 | `pnpm --filter provegate test test/conflicts.test.ts` | pkg | passed | `markdown.test.ts` 25, `conflicts.test.ts` 23, `state-query.test.ts` 18. Four mutations across both consumers. | enforcing path: an untracked root claim conflicts structurally |
| FR-13 | `pnpm --filter provegate test test/state-query.test.ts` | pkg | passed | `markdown.test.ts` 25, `conflicts.test.ts` 23, `state-query.test.ts` 18. Four mutations across both consumers. | the queue advisory prints rejected tokens |
| types | `pnpm check-types` | root | passed | `pnpm check-types` — 0 errors | zero errors |
| lint | `pnpm lint` | root | passed | `pnpm lint` — 0 warnings | zero warnings |
| test | `pnpm test` | root | passed | `pnpm test` — 49 files, **1022 passed** | full suite |
| build | `pnpm build` | root | passed | `pnpm build` — clean | clean; must precede the built-CLI rows |
| gate-check | `node packages/provegate/dist/cli.js check PRD-021` | repo | passed | `[check] ok — PRD-021 passes the readiness lint` | readiness lint |
| gate-wiring | `node packages/provegate/dist/cli.js check --wiring` | repo | passed | `[check --wiring] ok — every gate is wired or excepted` | wire-or-delete |
| independent-review | `_docs/reviews/review-021-governance-truth-up.md`                 | repo  | pending |          | verdict pass, Critical: 0 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Readiness Watch Coverage

Every watch item the readiness rounds left binding, and the tasks that discharge it.

| Watch | Binding tasks |
| ----- | ------------- |
| W9 — one semantic changeset assertion, not two greps | 11.3 |
| Iteration 11 — the `lintPrd` parameter position | 0.5, 2.8, 2.10, 12.4 |
| Iteration 11 — `load.ts` targeted and owned | 0.5, 1.7, 1.9 |
| Iteration 11 — the placeholder walk's green state | 8.4, 8.6 |
| Iteration 12 — a compilable optional fifth parameter | 2.8, 5.2 |
| Iteration 12 — weights without axes | 1.8, 1.10, 11.2 |
| Iteration 13 — the rule stated in both directions everywhere | 11.2, 13.5, 14.2 |
| Iteration 14 — absence guarded, not `=== null` | 2.9, 5.2 |
| Iteration 15 — propagation sweep as a review instruction | 14.2 |

---

## Deferrals & Decisions

- **Phase 6 remediation — the consistency-sweep brief returned ten findings and every one
  held.** Briefing the round as a sweep across named sections rather than a defect hunt was
  the plan's own instruction (task 14.2), taken from the readiness history, and it produced
  exactly the class that history predicted. All ten verified against source, all ten fixed:

  1. **A production defect the tests missed: a bare integer total was accepted.**
     `totalToHundredths` used `\d+(\.\d{1,2})?`, so `Value: 4 (…)` parsed as 4.00 and failed
     as a **mismatch** against 4.10 — sending the author to re-derive numbers that were
     never wrong. FR-2 requires it to be malformed. Fixed, with the missing reject fixture.
  2. **The `enforceFrom` validation message said the opposite of the rule.** It reused the
     `countOrZero` spec, whose message is "0 disables it"; for a cutoff, 0 means *enforce
     from the very first item*. A dedicated `cutoff` spec now says so. This is the sweep's
     rule 1 caught as a **two-ways** statement, in the one place an adopter reads it.
  3. **An all-rejected Conflict Surface read as "declares no Conflict Surface".**
     `candidateFromPrd` returned null when no glob survived, so an author whose every token
     was malformed was told they had declared nothing — the one message that hides the
     reason. It now returns the candidate with its rejections and `open.ts` refuses naming
     each one; the notes also reach every refusal path, not only the success return.
  4. **A test that could not fail.** The "declaring axes drops a default `enforceFrom`"
     case supplied its own `enforceFrom`, and the shipped default has none — merge and
     replacement both produced 4. Rebuilt around the WEIGHTS, where the two behaviours
     actually differ.
  5. **A test asserting against a copy of the parser.** The changeset quote-style case
     duplicated the front-matter regex locally, so breaking the real `entries()` would not
     have failed it. It now drives the real parser over a temp directory.
  6. **`AGENT_BOOTSTRAP.md` still said the recompute "lands in wave 2"** — the governance
     truth-up leaving intact the false claim about **itself**. `verify:doc-claims` passed it
     because the sentence carries no `verify:*` token, which is an honest limit of that
     grammar and is why a human sweep still earns its place. Corrected, and the configurable
     axes, the presence-triggered default and this repo's opt-in are now documented there.
  7. **A comment stating a falsehood about the thing this PRD measures.** `validate.ts`
     claimed the shipped weights sum to `0.9999999999999999`; they sum to exactly 1, as this
     plan already recorded. Replaced with a set that genuinely exhibits the hazard.
  8-10. **Three edited files were outside the Conflict Surface** — `core/run/open.ts`,
     `core/state/index.ts`, `test/cli-state.test.ts` — and `open.ts` was declared
     "read-only, no behavior change" while FR-13(c) edits it. All three claimed, and the
     superseded note corrected.

  **And the remediation immediately produced its own survivor, caught by self-check before
  the confirming round.** Tightening the bare-integer case left the total captured as a
  NUMBER SHAPE (`[0-9]+(?:\.[0-9]+)?`), so `4.1e0` matched as `4.1`, scored 4.10 and
  passed — exponent notation slipping through the same paragraph of FR-2 that the fix was
  answering. The capture now takes the whole token up to the first space or paren and lets
  the parser judge it. That is this item's characteristic defect appearing for the seventh
  time, in the fix for the sixth.

- **Phase 6 round 2 — the confirming round.** Five of seven fixes **hold**. It
  independently found the exponent hole that self-check had already caught (its snapshot
  predated the fix, and it said so). Two findings were real and open:

  1. **"The notes reach every refusal path" was false.** The regex insertion reached 4 of
     12 refusal sites; ordinary overlap refusal and gate-policy failure both dropped them.
     The plan claimed every outcome — a claim exceeding its mechanism, in the work item
     about claims exceeding their mechanisms. All 12 now carry them, and it matters most on
     the paths that were missing: an author refused for an overlap is already re-reading
     their surface, which is exactly when a silently-dropped token costs them a second
     round.
  2. **Two stale restatements of the total grammar, one edit apart.** The doc comment still
     said "one or two decimal places, **or none**" after `4` had been made malformed, and
     the diagnostic said "at most two decimal places", which reads as though none were also
     fine — the case it rejects. Both corrected, and the message now says what the accepted
     form IS.

  That is the eighth and ninth appearance of this item's characteristic defect, both inside
  the remediation for the seventh. The record it produced (`a-rule-corrected-survives-where-it-is-restated`)
  is written about prose sections; these were a code comment and an error string, which is
  the same failure in a place the record did not name. Worth noting for whoever extends it.

  The pack counterpart was then re-ported and the ledger reconciled, so the adopter's copy
  carries the same enforcement facts minus this repository's own opt-in.

- **10.5 finding — FR-13's stated defect was already fixed; its remedy was still needed, for
  the opposite reason.** The FR says `declaredGlobs` "drops every claimed path that does not
  contain `/`", and names PRD-018 and PRD-021 as losing their root-level claims. Measured
  at Phase 4: both keep them. The fix landed during PRD-018's rounds 24-25, after this FR
  was written, and the comment explaining it is in the function.

  The live defect is the inverse. The predicate that replaced the `/` requirement is "any
  backticked token without whitespace", which accepted `../outside.ts`, `/etc/passwd`,
  `e.g.` and `etc.` as claimed paths — measured before the change. So the surface erred in
  **both** directions across its history: first too strict, then too loose, and the second
  state is the more dangerous one because a prose abbreviation in a lease's `ownedPaths`
  looks like a claim.

  FR-13's literal predicate is exactly the right remedy for the state that actually exists,
  so it ships as specified. What changes is the justification: the tests assert what the
  predicate refuses, not that root claims are recovered — they already were.

- **FR-13 shape extension — `gate queue --json` gains `surfaceRejections`.** An existing
  test pins the exact key set of the published JSON shape, and it failed. That is the pin
  working: extending a published contract must be a deliberate edit in that list rather
  than a silent addition. Declared additive (a consumer reading known keys is unaffected)
  and the test now carries the reason.

- **7.3 — `verify:value-score` is the first `gate` invocation on any automated surface of
  this repository.** Until now the CLI appeared in no CI step, no hook and no package
  script: the repo dogfooded the method's lifecycle but not its gate policy. That is why
  the check goes in the build job rather than the hygiene job — it needs `dist/`, and a
  bundle member whose first act is to require a build would report the absence of a build
  as a governance violation.

- **9.2 decision — the roadmap gets one dated sentence, not sixty ticked boxes.** Its
  checkboxes were never updated during the extraction, so a reader takes them for remaining
  work. Ticking them would create a second live tracker to keep correct against `STATUS.md`
  and `gate queue`, and two trackers disagree eventually. The note says the boxes are
  historical plan and names where the real answer lives.

- **5.5 finding — a tally assertion that could not fail, found by its own mutation.** The
  sweep separates "scored" from "without a header", and the fixture asserted the separated
  tally. But in that fixture every header-less item is pre-cutoff, so it is skipped before
  reaching either counter and `headerless` is always 0 — folding the two counters together
  produced the identical string and the test stayed green. The case that pins it needs **no
  cutoff configured**, where a header-less item passes and is counted. This is
  `assert-absent-needs-an-independent-cause` in its positive form: an assertion about a
  distinction needs an input where the distinction is actually visible.

- **3.2 decision — the sweep's tally counts scored and header-less separately.** The first
  version printed "26 scored item(s) recompute exactly". Eleven of those twenty-six carry a
  header; the other fifteen have none, and nothing was recomputed for them. Folding the two
  together makes the summary claim more than the sweep did — the exact shape of defect this
  work item exists to remove, committed by the work item. It now reads
  `11 scored, 15 without a header, 0 skipped by the cutoff`.

- **1.6 finding — two assertions written on false premises, caught by their own runs.** The
  float-sum hazard is real but its usual witnesses are not: the shipped five weights sum to
  **exactly 1** as doubles, and so does the textbook `0.1 + 0.2 + 0.7`. Two versions of the
  hundredths test asserted otherwise and failed on themselves. A witness had to be searched
  for — `0.06 + 0.57 + 0.37` is `0.9999999999999999` — and the test now carries it. The
  general point is worth more than the case: **a test that asserts a property needs a real
  witness for it, and "everyone knows floats do this" is not one.** The lexical two-decimal
  rule has an honest witness independently (`0.29 * 100` is `28.999999999999996`), which is
  why that half was right the first time.

- **0.5 finding — a snapshot divergence the PRD does not record.** FR-2 specifies
  dimensions as `[1-5]` and justifies it against an earlier *draft of this PRD* that said
  "a single digit". Measured at `verify-prd-ready.mjs:292`, the frozen snapshot's own
  groups are `[0-5]` — it accepts a **0** dimension. So `[1-5]` diverges from the source in
  a second, unrecorded way: it is stricter than the snapshot, not merely stricter than a
  bad draft. The rubric's range genuinely is 1-5 and the strictness is right, but the
  method-content rule requires a divergence to be recorded rather than discovered later.
  FR-2 already records the tolerance divergence in the same paragraph; this one belongs
  beside it. Recorded here now and to be written into the PRD at task 2.3.


- **The plan this replaces.** The 82-task plan of 2026-07-25 scored the FR set that shipped
  the gate as `scripts/verify/verify-value-score.mjs`. Nothing in it was checked off.

---

## Progress Log

| Date       | Task    | Notes |
| ---------- | ------- | ----- |
| 2026-07-27 | 1.0-13.0 | All 13 FRs implemented and Phase 5 green: 1022 tests, 49 files. Nineteen mutation checks across FR-1, FR-2, FR-3, FR-6, FR-7, FR-12 and FR-13, each failing exactly its own case — **two assertions did not survive their own mutation and were rebuilt** (the sweep's tally, and a float-sum premise). Two FR premises were measured stale at implementation time and are recorded: FR-13's defect was already fixed and the live one is its inverse, and the snapshot's dimension groups are `[0-5]` where FR-2 specifies `[1-5]`. |
| 2026-07-27 | 0.0 | Pre-flight cleared. Hard stop satisfied (017/018/019 Ship Verified, `workflow.config.json` present with only `memory`). Baseline green. 0.3's counterpart changed under us: PRD-023 is Superseded and split into PRD-024/025/026, all three overlapping this PRD and all three Draft — so `gate queue` prints no warning and the lease is what protects the sequencing. 0.5 found an unrecorded snapshot divergence (dimensions `[0-5]` there, `[1-5]` here). |
| 2026-07-27 | Phase 3 | Plan regenerated from PRD-021 at readiness 8.09 PASS (iteration 15, independent). 16 parents, 86 sub-tasks. The nine Readiness Watch rows come from iterations 11-15, whose findings were all propagation defects rather than design errors — task 14.2 turns that into a review instruction rather than leaving the next round to rediscover it. No implementation started. |

---

## Blockers / Open Questions

- **None blocking Phase 4.** Task 0.2 is a hard stop rather than a blocker: PRD-018 and
  PRD-019 are both Ship Verified as of 2026-07-27, and `workflow.config.json` exists.
- **PRD-023 overlaps this PRD in eight paths and a concurrent session is revising it.**
  It is at ITERATE 6.85, so it cannot claim; task 0.3 re-measures rather than trusting
  this sentence.

---

## Operator Handoff

> Rows an owner must sign. The merge gate refuses an operator-gated close until an
> acceptance entry exists; the agent never signs its own.

| Task | Category  | Owner | Required Check | Status | Notes |
| ---- | --------- | ----- | -------------- | ------ | ----- |
| 12.5 | manual-qa | owner | Accept that editing the root `workflow.config.json` advances the control-artifact base, so any lease taken before it is refused until that worktree merges | pending | The agent lists the affected leases at merge time; deciding to land a change that stops in-flight work is an owner call |
| 15.4 | manual-qa | owner | Sign the close acceptance — this PRD changes the **published config surface**, so Autonomous Close is operator-gated | pending | The merge gate refuses until the acceptance row exists |
