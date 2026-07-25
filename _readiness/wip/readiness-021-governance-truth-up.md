# Readiness Assessment: PRD-021 — Governance Truth-Up

## Quick Meta

| Field | Value |
| ----- | ----- |
| PRD | `_prds/wip/prd-021-governance-truth-up.md` |
| Score | 4.43/10 |
| Verdict | ITERATE |
| Iteration | 1 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit) | — |
| Scored by | Independent readiness scorer |
| Self-scored | no |
| Date | 2026-07-25 |
| PRD Lint | passed — `node packages/provegate/dist/cli.js check PRD-021` exit 0 |
| State Record | pending — intentionally not updated during this assessment |

---

## Model Tier Recommendation

| Phase | Tier | Rationale |
| ----- | ---- | --------- |
| Phase 4 (Execution) | Do not assign | Score is below 8 and the PRD leaves the corpus migration, configurable arithmetic contract, compatibility posture, and document-claim grammar unspecified. |
| Phase 6 (Audit) | — | Assign after the revised PRD names a deployment/rollback plan and mutation tests that prove both parsers/config consumers reject invalid inputs. |

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

---

## Scorecard

Class `infra` weights, per
`packages/provegate/prompts/phase-2-readiness-scorer.md`.

| # | Dimension | Weight | Score | Notes |
| - | --------- | ------ | ----- | ----- |
| 1 | Clarity | 15% | 5.0/10 | Concrete FR targets, runnable rows, DO NOT section, and resolved questions meet the mechanical checklist. Capped below 7 by unresolved config schema, standalone-parser seam, doc-claim grammar, historical corpus policy, and release decisions. |
| 2 | Completeness | 20% | 4.0/10 | Covers the desired docs and wiring, but omits the 15-header migration, custom-weight validity/rounding, config parser parity, old-CLI behavior, changeset/release work, and claim-check allowlist lifecycle. |
| 3 | Technical Depth | 20% | 4.5/10 | Correctly recognizes duplicate-default drift and standalone constraints, but FR-3 does not define a behavior-proof anti-drift test. Exact decimal equality is unsound for arbitrary configured weights. |
| 4 | Multi-Tenancy & Security | 10% | 8.0/10 | No tenant, auth, endpoint, query, or client/server payload surface changes. Strict config validation and local filesystem scanning are appropriate, but the future-claim allowlist needs expiry to avoid a governance bypass. |
| 5 | Scope & Testability | 15% | 4.5/10 | Non-goals and FR mapping exist, but core §11 proof is weak source-token evidence. No mutation matrix establishes missing/malformed headers, invalid config, non-default arithmetic, false-positive doc text, CI wiring, or legacy-corpus behavior. |
| 6 | Migration & Rollback | 20% | 2.5/10 | The first run red-fails 15 existing PRDs; no stated migration, release sequence, minimum version, downgrade plan, or rollback fixture exists. “Revert” does not resolve an already-published config-surface change. |
| **Total** | **Weighted** | | **4.425/10** | **ITERATE** |

Weighted sum:
`0.15×5.0 + 0.20×4.0 + 0.20×4.5 + 0.10×8.0 + 0.15×4.5 + 0.20×2.5`
= `0.75 + 0.80 + 0.90 + 0.80 + 0.675 + 0.50 = 4.425`, reported as **4.43/10**.

Hard caps checked:

- **Security cap:** not triggered — no protected route, endpoint, or query path is
  added or touched.
- **Contract cap:** not triggered — no new client→server payload ships.
- **Lint cap:** not triggered — `node packages/provegate/dist/cli.js check PRD-021`
  exited 0.
- **ProveGate method caps:** the PRD specifies no runtime dependency or push path.

---

## Missing Pieces (watch items — binding on Phase 3 and Phase 6)

1. **W1 — decide the legacy PRD migration before wiring the gate.** Enumerate all 21
   scanned artifacts and choose/implement one explicit policy for the 15 without
   headers: audited backfill, a narrowly defined legacy exemption, or a prospective
   cutoff. Add fixtures proving missing headers fail only where the policy requires,
   and remove the contradictory non-goal.
2. **W2 — define `valueScoring` as a real schema.** Name all axes and their required
   shape; specify finite/non-negative values, sum invariant, partial-override behavior,
   numeric representation, and deterministic total formatting. Add reject fixtures for
   invalid/missing/extra axes and non-finite values.
3. **W3 — make arithmetic executable and safe.** Either constrain weights so every
   valid total is exactly representable to two decimals, or define decimal arithmetic
   and one canonical rounding/comparison rule. Test default and non-default values,
   including a non-.05 result, at the standalone-script boundary.
4. **W4 — prove both weight copies by behavior.** Require a named test interface/export
   for the standalone fallback and run the real script in fixtures with no config,
   valid custom config, and deliberately divergent fallback/default values. Prove the
   CLI resolved config and standalone effective config agree without importing the
   built package at runtime.
5. **W5 — state compatibility, changeset, and rollout.** Add a changeset path and
   semver rationale; document that old CLIs reject the new key; require upgrade-before-
   config rollout; and specify downgrade behavior. Add package documentation/example and
   tests for old config on new CLI plus new config on the supported CLI.
6. **W6 — specify `verify-doc-claims` as a grammar, not an intention.** List scanned
   files, exact recognized future-claim forms, exclusions for historical/changelog/code
   text, wired-script lookup semantics, and a shrink-only/expiry-reviewed allowlist.
   Add positive, negative, and mutation fixtures proving no false future-work hit.
7. **W7 — replace token greps with outcome evidence.** Keep greps only as supplemental
   assertions. Add executable tests for config loading/validation, standalone behavior,
   workflow and CI wiring (including an unwired mutation), pack-ledger reconciliation,
   the research banner's exact canonical link, and the configured claim parser.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| - | ---- | ----- | ------- | ----------- |
| 1 | 2026-07-25 | 4.43 | ITERATE | Independent infra-weighted assessment. Lint passed, but measured 21 scanned PRDs with only 6 value headers; configuration, arithmetic, compatibility, claim-parser, evidence, and rollback gaps require Phase 1 revision. |

---

## Project-Specific Checklist

- [x] Used infra weights: Migration & Rollback 20%, Multi-Tenancy & Security 10%.
- [x] Ran the required lint via the built CLI; exit 0.
- [x] Confirmed no root `workflow.config.json`.
- [x] Confirmed `verify-durable-artifacts.mjs` exists and is root-manifest registered.
- [x] Confirmed `verify-deferred.mjs` enforces cap 15 and warns at 12.
- [x] Confirmed the cited stale statements occur in `AGENT_BOOTSTRAP.md`, `STATUS.md`,
  and `_brain/PROTOCOL.md`.
- [x] Confirmed the three named live/practices relationships are in the pack-drift
  ledger.
- [x] Confirmed unknown config keys are validation errors and `deepMerge` recursively
  merges plain objects.
- [x] Confirmed the package has a published config surface and changesets infrastructure.
- [ ] Define and test legacy PRD migration before `verify:value-score` joins the bundle.
- [ ] Define standalone config parsing/validation parity and custom-weight arithmetic.
- [ ] Define older-CLI rollout, version bump, and rollback procedure.
- [ ] Replace weak source-grep verification with outcome/mutation tests.

---

## Verdict

**ITERATE — 4.43/10, iteration 1.** The requested documentation truth-up is well
motivated and its factual premises checked out, but the new gate cannot safely ship as
specified. It would fail 15 current PRDs immediately, while the PRD declares historical
rewrites out of scope. Its configurable arithmetic, two-copy drift defense, doc-claim
matcher, release compatibility, and rollback plan all require decisions that an
implementing agent must not invent.

No explicit factual premise requested for verification was false: the durable-artifacts,
deferred, and brain gates are present/wired as claimed; their stale documentation is
present; the named pack-drift pairs exist; unknown keys fail validation; and the root
has no `workflow.config.json`. The material factual condition omitted by the PRD is the
legacy corpus: only 6 of 21 files in the proposed scan set currently carry `Value:`
headers.
