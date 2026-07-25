# Readiness Assessment: PRD-021 — Governance Truth-Up

## Quick Meta

| Field | Value |
| ----- | ----- |
| PRD | `_prds/wip/prd-021-governance-truth-up.md` |
| Score | 8.43/10 |
| Verdict | PASS |
| Iteration | 6 |
| Model Tier (Execution) | high |
| Model Tier (Audit) | high |
| Scored by | independent agent (gpt-5.6, different model family from the PRD author), via owner |
| Self-scored | no |
| Date | 2026-07-25 |
| PRD Lint | passed — `node packages/provegate/dist/cli.js check PRD-021` exit 0 (re-run at iteration 6) |
| State Record | pending — intentionally not updated during this assessment |

---

## Model Tier Recommendation

| Phase | Tier | Rationale |
| ----- | ---- | --------- |
| Phase 4 (Execution) | high | The 8–8.9 band and cross-module parser/lock/queue behavior warrant high-tier implementation. |
| Phase 6 (Audit) | high | Independently audit parser diagnostics, per-glob structural union, and the single-entry changeset assertion in W9. |

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

### 7. Iteration-4 independent measurement — FR-13 and dependency

The reported `declaredGlobs` defect is real. The built package returns neither
`workflow.config.json` nor `gates.manifest.json` from PRD-018, and returns neither
`workflow.config.json`, `AGENT_BOOTSTRAP.md`, nor `STATUS.md` from PRD-021. The five
claims are present in their respective Conflict Surface sections but are discarded by
the current `if (!value.includes('/')) continue` branch.

Both named consumers use the parser: `readyOverlaps` is advisory only, while
`candidateFromPrd` puts its output into lease `ownedPaths`, which reaches the enforcing
`findConflicts` path. The FR-13 targets name `markdown.test.ts` and
`conflicts.test.ts`, but do not require the latter to exercise
`candidateFromPrd`/`candidateConflicts` with an untracked root file. That distinction
matters: `findConflicts` first materializes against `git ls-files`; a newly created
root control artifact has no materialized path. Its protection then depends entirely
on `structuralOverlap`, which can intersect identical literal names but is not proven
by the proposed end-to-end fixture as written.

The proposed root-file predicate is directionally safe for ordinary repo-root filenames
such as `workflow.config.json`, `.gitignore`, and `AGENT_BOOTSTRAP.md`. It is not a
complete parser contract: “no `..` segment” does not define whether `foo..bar` is legal,
and a merely dot-containing backticked prose token can become a claimed path. More
importantly, `declaredGlobs` returns only `string[]`; FR-13 requires every rejected
token to be reported as a named parse failure but specifies neither a diagnostic result
type nor a caller-visible error/reporting channel. An implementer would have to invent
the observable behavior and its test.

PRD-018 FR-6 explicitly creates the root `workflow.config.json` (and
`gates.manifest.json`) and assigns PRD-021 the later edit-only case. The dependency
claim is true. It also means the plan correctly prevents PRD-021 Phase 4 until PRD-018
is Ship Verified; PRD-018 is currently still Phase 2, so this is a real ordering blocker.

### 8. Iteration-5 independent measurement — W10/W11 remediation

**W11 is resolved.** The proposed per-glob materialization split closes the measured
case: each `workflow.config.json` literal matches no tracked file, so the structural
union compares those two unmaterialized literals even though their surrounding surfaces
also materialize tracked paths. It leaves the ordinary tracked-file intersection intact
and does not add structural comparisons for a glob that already matched a tracked file;
therefore it does not introduce false conflicts for ordinary fully tracked surfaces.

**W10 is resolved.** `parseConflictSurface` preserves `declaredGlobs`' public `string[]`
contract while making rejected tokens and reasons available to the only two consuming
surfaces. `candidateFromPrd` is the enforcing `gate open` route and `readyOverlaps` is
the advisory `gate queue` route. `lintPrd`, invoked by `runCheck`, imports only
`sectionMatching` and does not parse the Conflict Surface; the PRD's claim that
`gate check` is not the wiring point is true. `markdown.test.ts`, `conflicts.test.ts`,
and `state-query.test.ts` all already exist; the latter is correctly an existing target,
not a promised new file.

One material contradiction remains. FR-13(a) accepts any no-slash token with a dot,
no whitespace, no leading slash, and no `..` segment; a prose-looking token such as
`e.g.` satisfies that rule. FR-13(b) simultaneously requires a “prose-like dotted
token” rejection fixture without defining a stricter filename grammar or naming the
fixture token. The agent cannot both implement the stated predicate and reliably make
that required rejection test pass. Specify a rejectable literal/example plus a rule that
excludes it, or remove that test category. This is W12 and caps Clarity at 7.

### 9. Iteration-6 independent measurement — literal filename predicates

**W12 is resolved.** Direct execution of the two stated regular expressions produces
the specified result for every requested token: the named-file expression accepts
`workflow.config.json`, `STATUS.md`, `AGENT_BOOTSTRAP.md`, and `Node.js`; the dotfile
expression accepts `.gitignore` and `.npmrc`; neither accepts `e.g.`, `i.e.`, `etc.`,
`none`, `{placeholder}`, or `../escape.md`. The three abbreviation tokens fail because
their trailing dot cannot satisfy the named-file expression's final alphanumeric
extension. `Node.js` is intentionally accepted as the declared residual.

The literal grammar removes the earlier “plausible filename” ambiguity, supplies an
exact negative fixture, and preserves loud rejection for all other listed tokens. No
tested regex behavior differs from the PRD's claims. The Phase 3 tasks repeat the same
two expressions and named fixtures. The readiness lint passed again.

---

## Scorecard

Class `infra` weights, per
`packages/provegate/prompts/phase-2-readiness-scorer.md`.

| # | Dimension | Weight | Score | Notes |
| - | --------- | ------ | ----- | ----- |
| 1 | Clarity | 15% | 8.5/10 | The two literal shapes, named accept/reject fixtures, diagnostic API, consumer paths, and enforcing test make FR-13 autonomous; W9 remains a bounded FR-12 evidence issue. |
| 2 | Completeness | 20% | 8.5/10 | Root parsing, diagnostics, advisory/enforcing consumers, per-glob structural union, exact residual, and migration/dependency boundaries are covered. |
| 3 | Technical Depth | 20% | 8.5/10 | Per-glob unmaterialized structural overlap correctly addresses the mixed tracked/untracked surface failure while retaining the file intersection. |
| 4 | Multi-Tenancy & Security | 10% | 8.5/10 | No protected route, endpoint, tenant data, or client/server payload changes. Bounded parsing and loud diagnostics prevent silent ownership loss. |
| 5 | Scope & Testability | 15% | 8.0/10 | The three target tests cover parser, enforcing, and advisory paths with literal accept/reject cases; W9 remains for changeset association evidence. |
| 6 | Migration & Rollback | 20% | 8.5/10 | The cutoff, release ordering, downgrade, rollback, lease preflight, and root-config edit transition remain concrete; the measured PRD-018 dependency confirms deployment order. |
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
10. **W10 — RESOLVED: observable rejected-claim diagnostics.** FR-13(b) introduces
    `parseConflictSurface`, keeps `declaredGlobs` compatible, and binds token/reason
    output to the actual enforcing and advisory consumers.
11. **W11 — RESOLVED: root-file enforcement when absent.** FR-13(c) requires structural
    comparison of each unmaterialized glob and task 10.5.6 drives
    `candidateFromPrd`/`candidateConflicts` with an untracked root filename.
12. **W12 — RESOLVED: literal filename predicate.** FR-13(a) now supplies exact named
    file and dotfile regular expressions; `e.g.` is named as a trailing-dot rejection,
    while the deliberate `Node.js` residual is accepted and documented.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| - | ---- | ----- | ------- | ----------- |
| 1 | 2026-07-25 | 4.43 | ITERATE | Independent infra-weighted assessment. Lint passed, but measured 21 scanned PRDs with only 6 value headers; configuration, arithmetic, compatibility, claim-parser, evidence, and rollback gaps require Phase 1 revision. |
| 2 | 2026-07-25 | 7.50 | ITERATE | Re-score verified the prospective cutoff, complete config contract, exact-cent architecture, behavioral standalone tests, bounded doc-claim grammar, and changeset/rollout plan. W3 remains open for float-safe decimal validation; W7 for false-green changeset evidence; W8 records the root-config worktree-control-artifact transition. |
| 3 | 2026-07-25 | 8.43 | PASS | Re-score verified the lexical decimal rule accepts 0.5/1/0.29/0.58 and rejects 0.155/1e-7, the real-git worktree test is implementable, and direct content evidence replaces the old FR-11 gap. W9 binds Phase 3/6 to replace brittle independent changeset greps with one semantic entry assertion. |
| 4 | 2026-07-25 | 7.60 | ITERATE | Independent re-score measured FR-13's five silently dropped root claims and confirmed PRD-018 owns root-config creation. FR-13 lacks an observable parse-failure contract and an enforcing-path test for an untracked root artifact; W10–W11 must be resolved. |
| 5 | 2026-07-25 | 7.78 | ITERATE | W10 and W11 are resolved: diagnostics have named consumers and unmaterialized-glob union reaches mixed surfaces. W12 remains because the prose-like dotted-token rejection contradicts the stated acceptance predicate. |
| 6 | 2026-07-25 | 8.43 | PASS | Literal named-file and dotfile regexes resolve W12; direct execution confirms every requested accept/reject case and the documented `Node.js` residual. W9 remains binding. |

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
- [x] Measured built `declaredGlobs`: all five claimed root-file paths are presently
  dropped, exactly as FR-13 says.
- [x] Confirmed `readyOverlaps` is advisory and `candidateFromPrd` feeds enforcing lease
  ownership; confirmed conflict materialization uses `git ls-files`.
- [x] Confirmed PRD-018 FR-6 creates `workflow.config.json`, making the PRD-021
  dependency claim true.
- [x] W10 resolved: `parseConflictSurface` supplies diagnostics to the two consumers;
  `gate check` does not read the Conflict Surface.
- [x] W11 resolved: per-glob unmaterialized structural union and the candidate/lease
  fixture cover an absent root file.
- [x] W12 resolved: both literal regexes accept/reject every requested token as claimed,
  including the deliberate `Node.js` residual.

---

## Verdict

**PASS — 8.43/10, iteration 6.** The lint passes, no hard cap applies, and W12 is
resolved: the parser's literal named-file/dotfile grammar produces the claimed result
for every requested token. The deliberate `Node.js` residual is explicitly accepted,
which is consistent with the fail-loud ownership model.

W9 remains a binding Phase 3/6 watch item: replace FR-12's independent greps with one
semantic assertion that proves the same changeset contains both the `provegate` minor
entry and the compatibility instruction. Phase 4 and Phase 6 both require high tier.
