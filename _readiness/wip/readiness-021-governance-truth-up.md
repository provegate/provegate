# Readiness Assessment: PRD-021 — Governance Truth-Up

## Quick Meta

| Field | Value |
| ----- | ----- |
| PRD | `_prds/wip/prd-021-governance-truth-up.md` |
| Score | 8.43/10 |
| Verdict | PASS |
| Iteration | 3 |
| Model Tier (Execution) | high |
| Model Tier (Audit) | high |
| Scored by | Independent readiness scorer |
| Self-scored | no |
| Date | 2026-07-25 |
| PRD Lint | passed — `node packages/provegate/dist/cli.js check PRD-021` exit 0 (re-run at iteration 3) |
| State Record | pending — intentionally not updated during this assessment |

---

## Model Tier Recommendation

| Phase | Tier | Rationale |
| ----- | ---- | --------- |
| Phase 4 (Execution) | high | Score is in the 8–8.9 band. The implementation spans a published config contract, two standalone verifiers, release metadata, and worktree provenance; the detail is executable but mistakes are systemic. |
| Phase 6 (Audit) | high | Audit the standalone/CLI decimal parity, legacy-worktree refusal-and-recovery fixture, and that changeset evidence binds package, release level, and compatibility note in one file. |

---

## Analysis

### 1. Technical Depth & Architecture

The existing premises about shipped checks are real: `verify-durable-artifacts.mjs`
exists and is registered in the root manifest; `verify-deferred.mjs` has `CAP = 15`
and `WARN_AT = 12`; `verify:brain` is registered, bundled, and run in CI; and no root
`workflow.config.json` exists. `validateConfig` also rejects unknown keys. The stale
wording in `AGENT_BOOTSTRAP.md`, `STATUS.md`, and `_brain/PROTOCOL.md` is present as
claimed. The named practices/live pairs are in the pack-drift ledger.

The proposed value gate does not yet define a safe configuration contract. `deepMerge`
does recursively merge plain-object defaults, so a fully specified
`valueScoring.weights` object would merge as the PRD assumes. But FR-2 does not say:

- whether all five axes are required, whether unknown/missing axes fail, or whether
  weights must be finite, non-negative, and sum to exactly 1;
- whether custom weights can be partial, and therefore which fallback applies;
- how the standalone script parses and validates configuration independently of the
  TypeScript CLI config loader; or
- how the script and CLI are proven to resolve the same effective weights.

FR-3 is not sufficient as written. A test can compare a test-visible fallback export
with `DEFAULT_CONFIG`, but the PRD does not require such an export or a behavior-level
fixture that runs the standalone script under both absent and custom config. A source
grep/static extraction could make the test pass while the executable fallback differs.
The standalone script cannot import the built package, so the required test seam and
the independent JSON-validation contract must be explicitly designed.

Exact two-decimal equality is only justified for the fixed defaults. It is unsafe for
adopter-configurable decimal weights: for example, legitimate weights can yield a sum
such as `4.995`, which has no exact two-decimal representation. The PRD must either
restrict each configured weight/possible sum to an explicit two-decimal-compatible
quantization, or specify canonical decimal arithmetic plus a deterministic rounding
rule and test it. The cited learning itself permits a small float tolerance; this PRD
rejects that without covering the new configurable case.

### 2. Edge Cases & Failure Modes

FR-1 scans every file in both `_prds/wip/` and `_prds/completed/` and makes a missing
header a failure. The live corpus has 21 PRD files but only 6 `Value:` headers. Thus the
new check fails approximately 15 existing artifacts on its first run. That contradicts
the stated non-goal excluding retrospective scoring/rewrites and leaves no migration
decision. This is the dominant readiness failure.

The claim-drift gate is underspecified. “Describes a `verify:*` script as future work”
does not provide the governance-file list, exact future-tense/token matching rules,
whether a mention in a historical/changelog/example/code fence counts, how script-name
aliases are treated, or how the package script is recognized as wired. A broad regex
will false-positive on legitimate future work and historical records; a narrow regex
will miss the intended drift. The allowlist's expiry/review policy is also absent, so it
can become a permanent bypass.

An older installed CLI necessarily rejects a newly added `valueScoring` key, because
the current unknown-key validator is intentionally strict. Adding the field is
backward-compatible for an upgraded CLI reading an old config; it is not
forward-compatible for an adopter who deploys the new config before upgrading the CLI.
The PRD calls the change “backward-compatible” but names neither that constraint nor a
version/rollout rule.

### 3. Maintainability & DX

The work changes the published `provegate` configuration surface but only says “needs a
changeset” in prose. It has no changeset target, release level/rationale, package
documentation/config-example update, or verification row proving the new schema is
published and versioned. An implementation agent must invent those decisions.

Several §11 rows are presence greps, not acceptance evidence. `grep -c valueScoring`
does not prove parsing, validation, merge behavior, compatibility, or use by the
standalone script. `grep -c value-score` does not prove bundle execution. `grep -c
frozen` accepts an unrelated sentence. FR-4's two `pnpm verify:*` rows would run the
checks but do not prove each is CI-wired; the existing wire-or-delete check needs an
explicit relevant assertion/mutation. The requirement table therefore satisfies the
lint mechanically while leaving central regressions untested.

### 4. Migration & Rollback

Migration and rollback are inadequate for an infra change weighted at 20%. The PRD
asserts an additive/revert-clean rollback, but enabling a newly strict corpus-wide gate
changes the green/red state of all existing repositories and this repository's 15
headerless PRDs. Removing scripts after a failed rollout does not say how a release that
has introduced `valueScoring` is rolled back without stranding adopters on either an old
CLI/new config or new CLI/removed config field.

Specify one chosen migration: exempt pre-introduction PRDs by an explicit, narrow
version/date rule; backfill every historical header with an audit trail; or limit the
scan to PRDs created after a declared cutoff. Define the rollout order (release CLI
support, require minimum CLI version, then permit config use), downgrade/rollback
behavior, and test fixtures for each side of that compatibility boundary.

### 5. Iteration-2 independent measurement

The revised PRD resolves the former corpus-red failure. It records the measured corpus
reality (21 PRDs, six headers), sets this repository's `enforceFrom` to 17, and requires
pre-cutoff missing headers to be skipped while still rejecting malformed or wrong
headers at every id. The five PRDs at or after that cutoff (017–021) currently have
headers whose declared default-weight totals recompute correctly.

The `enforceFrom: 1` package default is coherent: a fresh adopter has no pre-existing
PRD corpus, so it should enforce the header everywhere. The root override is also
correctly partial under the current recursive `deepMerge`: after the proposed
`valueScoring` default exists, `{"valueScoring":{"enforceFrom":17}}` preserves the
default weights. It is not entirely inert, however. `workflow.config.json` becomes a
required control-artifact snapshot for `gate open --worktree`; a pre-existing leased
checkout without it will be refused on reuse until it merges/rebases the base branch.
There are no current lease files in `_state/locks`, but the PRD needs to state and test
that transition rather than treating the deep-equal resolved-config assertion as the
whole operational effect.

The mathematical claim behind integer-hundredths recomputation is sound: five
integer-hundredth weights multiplied by integer dimensions always sum to integer cents,
and therefore format exactly to two decimals. The implementation contract is still
incomplete because JavaScript JSON numbers are binary floats: `0.29 * 100` evaluates to
`28.999999999999996`. FR-1 must prescribe lexeme-safe parsing or an equivalent
round-trip/epsilon-free decimal validation algorithm; `Number.isInteger(weight * 100)`
would reject legal two-decimal weights.

FR-6 now bounds its scanner to six named governance files. Consequently it cannot
false-positive on PRD-021 itself or arbitrary `_brain` records: neither is scanned.
The declared exclusions also protect fenced examples and `STATUS.md` Recent activity.
The grammar, package-manifest lookup, and stale/expired allowlist behavior resolve the
former unspecified-matcher concern.

`pnpm changeset status` is not evidence that a changeset exists. On the current checkout
it exits 0 while reporting “NO packages to be bumped” at patch, minor, and major. FR-11
requires a minor changeset, but its sole §11 command would pass if the implementation
forgot it. The PRD must add a targeted assertion that the `provegate` package has the
required pending minor release and that the changeset text carries the compatibility
instruction.

### 6. Iteration-3 independent measurement

FR-1 now gives an implementable float-safe rule. Its `String(weight)` expression accepts
legal JSON-number values `0.5`, `1` (including source spelling `1.0`, which parses to
the shortest form `1`), `0.29`, and `0.58`; semantic positivity and the five-axis
hundredths sum exclude an otherwise individually valid weight of 1. It rejects `0.155`
and `1e-7`, as required. Once the lexical form has passed, `Math.round(weight * 100)`
is safe for the allowed range, so the integer-cent total remains exact.

FR-5 correctly models the control-artifact transition: existing `open.ts` behavior
compares required artifact snapshots against both base and the reused checkout, and
therefore refuses a worktree that predates `workflow.config.json` until it merges or
rebases. The existing `worktree.test.ts` already has real-git root, commit, PRD, claim,
and cleanup helpers proving that test style. Those helpers are local rather than
exported, so the named config test must repeat a small helper or locate the fixture in
the worktree test; that is implementation mechanics, not an unresolved design choice.

The new FR-11 direct content-canon test resolves the banner-proof gap. FR-12 fixes the
old absence false green: either grep fails when no matching changeset exists. It is
still not a durable semantic check: valid YAML may use `"provegate": minor` rather than
`'provegate': minor`, and independent recursive greps can match the minor declaration
in one changeset and the compatibility sentence in another. This is a bounded watch
item, not a hard cap; require one parser/test that finds a single changeset entry with
all three properties.

---

## Scorecard

Class `infra` weights, per
`packages/provegate/prompts/phase-2-readiness-scorer.md`.

| # | Dimension | Weight | Score | Notes |
| - | --------- | ------ | ----- | ----- |
| 1 | Clarity | 15% | 8.5/10 | All 12 FRs carry targets and runnable checks. The lexical decimal rule, worktree transition, content assertion, and changed changeset evidence resolve prior ambiguity; docked only for FR-12's format-dependent greps. |
| 2 | Completeness | 20% | 8.5/10 | Cutoff, validation, parity, drift grammar, release policy, and operational rollback are covered. A single-entry semantic changeset assertion would close the remaining evidence gap. |
| 3 | Technical Depth | 20% | 8.5/10 | Lexical validation followed by rounded integer cents avoids binary-float rejection while retaining exact arithmetic. The standalone parity and real worktree recovery fixtures exercise the two highest-risk boundaries. |
| 4 | Multi-Tenancy & Security | 10% | 8.5/10 | No protected tenant/auth/payload surface changes. Bounded document scanning and expiring allowlist prevent the main governance bypasses. |
| 5 | Scope & Testability | 15% | 8.0/10 | The rebuilt table maps every FR to outcome evidence, including direct content and worktree tests. FR-12's two separate greps remain brittle and do not prove the required metadata/note coexist in one changeset. |
| 6 | Migration & Rollback | 20% | 8.5/10 | The cutoff, release ordering, downgrade, rollback, Phase 4 lease preflight, and refusal-then-merge/rebase fixture give this infra change a concrete operational plan. |
| **Total** | **Weighted** | | **8.425/10** | **PASS** |

Weighted sum:
`0.15×8.5 + 0.20×8.5 + 0.20×8.5 + 0.10×8.5 + 0.15×8.0 + 0.20×8.5`
= `1.275 + 1.70 + 1.70 + 0.85 + 1.20 + 1.70 = 8.425`, reported as **8.43/10**.

Hard caps checked:

- **Security cap:** not triggered — no protected route, endpoint, or query path is
  added or touched.
- **Contract cap:** not triggered — no new client→server payload ships.
- **Lint cap:** not triggered — `node packages/provegate/dist/cli.js check PRD-021`
  exited 0.
- **ProveGate method caps:** the PRD specifies no runtime dependency or push path.

---

## Missing Pieces (watch items — binding on Phase 3 and Phase 6)

1. **W1 — RESOLVED: prospective cutoff.** `enforceFrom: 17`, a no-backfill
   non-goal, and pre-/at-cutoff fixtures resolve the 15-header legacy corpus conflict.
2. **W2 — RESOLVED: explicit config schema.** The five axes, unknown-axis rejection,
   positive/two-decimal/sum constraints, and non-negative cutoff are now specified for
   structural and resolved validation.
3. **W3 — RESOLVED: float-safe decimal validation.** The `String(weight)` lexical gate
   plus `Math.round` after validation admits 0.29/0.58 and rejects three-decimal and
   exponent-form values without `Number.isInteger(weight * 100)`.
4. **W4 — RESOLVED: behavioral duplicate-default proof.** `--print-weights` and
   spawned real-script fixtures cover absent/custom config and failure behavior without
   a runtime package import.
5. **W5 — RESOLVED: compatibility and release policy.** FR-11 names a minor changeset,
   upgrade-before-config ordering, downgrade action, and rollback. Its actual
   changeset-evidence command remains W7.
6. **W6 — RESOLVED: bounded doc-claims grammar.** The file set, tokens, markers,
   exclusions, manifest lookup, and expiring shrink-only allowlist are specific; PRDs
   and unrelated `_brain` records are outside the scanner.
7. **W7 — PARTIALLY RESOLVED: outcome evidence.** FR-11 now directly tests the
   content-canon outcome and FR-12 fails absent a changeset. W9 narrows the remaining
   association/format problem in the two FR-12 greps.
8. **W8 — RESOLVED: worktree control-artifact transition.** FR-5, the migration
   preflight, and the refusal-before/acceptance-after-merge fixture cover existing
   worktree reuse.
9. **W9 — watch item: parse one changeset entry.** Replace FR-12's two greps with a
   test/parser that accepts normal YAML quote styles and proves the same new changeset
   declares `provegate` minor and contains the required upgrade-before-config sentence.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| - | ---- | ----- | ------- | ----------- |
| 1 | 2026-07-25 | 4.43 | ITERATE | Independent infra-weighted assessment. Lint passed, but measured 21 scanned PRDs with only 6 value headers; configuration, arithmetic, compatibility, claim-parser, evidence, and rollback gaps require Phase 1 revision. |
| 2 | 2026-07-25 | 7.50 | ITERATE | Re-score verified the prospective cutoff, complete config contract, exact-cent architecture, behavioral standalone tests, bounded doc-claim grammar, and changeset/rollout plan. W3 remains open for float-safe decimal validation; W7 for false-green changeset evidence; W8 records the root-config worktree-control-artifact transition. |
| 3 | 2026-07-25 | 8.43 | PASS | Re-score verified the lexical decimal rule accepts 0.5/1/0.29/0.58 and rejects 0.155/1e-7, the real-git worktree test is implementable, and direct content evidence replaces the old FR-11 gap. W9 binds Phase 3/6 to replace brittle independent changeset greps with one semantic entry assertion. |

---

## Project-Specific Checklist

- [x] Used infra weights: Migration & Rollback 20%, Multi-Tenancy & Security 10%.
- [x] Ran the required lint via the built CLI; exit 0.
- [x] Confirmed no root `workflow.config.json` exists before the proposed change.
- [x] Confirmed `verify-durable-artifacts.mjs` exists and is root-manifest registered.
- [x] Confirmed `verify-deferred.mjs` enforces cap 15 and warns at 12.
- [x] Confirmed the cited stale statements occur in `AGENT_BOOTSTRAP.md`, `STATUS.md`,
  and `_brain/PROTOCOL.md`.
- [x] Confirmed the three named live/practices relationships are in the pack-drift
  ledger.
- [x] Confirmed unknown config keys are validation errors and `deepMerge` recursively
  merges plain objects.
- [x] Confirmed the package has a published config surface and changesets infrastructure.
- [x] Verified the prospective cutoff makes current PRD-017–021 in-scope and preserves
  the 15 headerless historical PRDs without backfill.
- [x] Verified integer-hundredths recomputation mathematically yields a two-decimal
  result for every legal five-axis weight set.
- [x] Verified the PRD's scanner excludes PRD-021 and non-target `_brain` records.
- [x] Verified there are no current lease files under `_state/locks`.
- [x] Verified the lexical decimal contract accepts 0.5, 1/1.0, 0.29, and 0.58 while
  rejecting 0.155 and 1e-7.
- [x] Verified existing worktree helpers support the control-artifact refusal/recovery
  fixture.
- [x] Verified FR-11 has a direct banner/canonical-link test.
- [ ] Replace FR-12's independent quote-sensitive greps with one semantic changeset
  assertion (W9).

---

## Verdict

**PASS — 8.43/10, iteration 3.** The lint passed again, no hard cap applies, and the
revision resolves W3 and W8 while giving FR-11 direct evidence. The config's lexical
decimal contract is safe for all legal numeric values, the proposed root cutoff is
coherent, and the documented worktree transition matches the current control-artifact
implementation.

W9 is a binding Phase 3/6 watch item, not a blocker: make FR-12 parse one changeset
entry rather than independently grepping for a single-quoted package line and a sentence.
The current commands can reject a valid double-quoted YAML entry or certify a minor
declaration and compatibility sentence that appear in different changesets. Phase 4
should use a high-tier implementation agent; Phase 6 should use a high-tier auditor.
