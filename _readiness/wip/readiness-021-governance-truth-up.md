# Readiness Assessment: PRD-021 — Governance Truth-Up

> **W13–W21 were remediated in the PRD on 2026-07-25, by the same session that scored
> iteration 7. The 7.30 ITERATE below therefore describes a PRD that has since changed,
> and it deliberately still stands as the machine verdict: no independent round has
> cleared the revision, so Phase 3 must stay shut.** The next round must be run by a
> session that did not write the remediation, and should record `self-scored: no` only if
> that is true of it. Summary of what moved: `enforceFrom` now ships absent
> (presence-triggered, per the source snapshot's own `validateVScore`) with `17` demoted
> to this repo's opt-in; FR-2 gained the real header grammar; FR-9 pins the
> AGENT_BOOTSTRAP weight table to `DEFAULT_CONFIG`; the overlap list was rebuilt from
> `gate queue` and now carries PRD-023 and the PRD-017 lease; FR-13(b) states what it does
> not fix; the cross-reference drift, the stale counts, and the self-expiring DO NOT are
> corrected. Value re-scored to 4.10 per §10.
>
> **Iteration 7 (2026-07-25) has scored the relocated FR set — see §10 and the Verdict.**
> The iteration-6 PASS (8.43) scored a PRD that no longer exists: the owner relocated the
> value-score gate from `scripts/verify/verify-value-score.mjs` into the package
> (`core/gates/value-score.ts` + `gate check --value-score`), which rewrote FR-2, FR-3,
> FR-6, and FR-8, added `packages/provegate/src/cli.ts` and
> `packages/provegate/src/core/gates/prd-ready.ts` to the Conflict Surface, and made
> PRD-019 a prerequisite. **The 8.43 verdict does not transfer**; it is preserved below as
> prior analysis only. W1–W12 remain useful as history, and W9 remains binding.

## Quick Meta

| Field | Value |
| ----- | ----- |
| PRD | `_prds/wip/prd-021-governance-truth-up.md` |
| Score | 7.30/10 (infra weights) |
| Verdict | ITERATE — the relocated FR set ships an adopter-facing gate with no template affordance (W13) and asserts corpus/lease facts that are no longer true (W17, W18). The iteration-6 PASS (8.43) is preserved below as prior analysis only |
| Iteration | 7 |
| Model Tier (Execution) | do not assign — score < 8; fix the PRD first |
| Model Tier (Audit) | high (when re-scored into the PASS band) |
| Scored by | independent agent (Claude Opus 5, different model family from the PRD author), via owner |
| Self-scored | no — this session did not write or revise the PRD |
| Date | 2026-07-25 |
| PRD Lint | passed — `node packages/provegate/dist/cli.js check PRD-021` exit 0 (re-run at iteration 7) |
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

### 10. Iteration-7 independent measurement — the relocated FR set

Everything below was measured against the working tree, not read from the PRD.

**The relocation's core design holds up.** `lintPrd(config, manifest, content)` at
`packages/provegate/src/core/gates/prd-ready.ts:54` does take a resolved `WorkflowConfig`
as its first parameter, so FR-2's "no new plumbing" claim is true. `runCheck`
(`packages/provegate/src/cli.ts:456`) already resolves the record via `findRecord` at
line 476 and calls `lintPrd` at 482 with three arguments, so the fourth `number` argument
is a mechanical change on a caller that already holds the value. The `--wiring` branch
FR-3 models itself on is at line 460. `declaredGlobs`
(`core/state/markdown.ts:163`) drops slash-less tokens at line 171 exactly as FR-13 says,
and `findConflicts` (`core/locks/conflicts.ts:108`) falls back to `structuralOverlap`
only under `a.mat.size === 0 || b.mat.size === 0`, which is the precise condition FR-13(c)
identifies. FR-8's wiring claim also checks out: `verify-gates-wired.mjs` counts a
registered script as wired when **either** its script name **or** its `scripts/verify/*.mjs`
basename appears in a surface, and CI `run:` text is a surface — so a `verify:value-score`
key with no `.mjs` file on disk satisfies direction 1 and is invisible to direction 2.
The build-dependent job (`.github/workflows/ci.yml`, job `verify`) ends with `pnpm build`,
so a step appended after it is correctly ordered.

**W13 — the gate ships to adopters with no way to satisfy it. This is the blocking
finding.** FR-1 sets the package default `enforceFrom: 1` and argues "a fresh adopter has
no legacy corpus, so the safe default is enforce everywhere". FR-2 makes a missing header
at or after the cutoff a failure. But the shipped PRD template
(`packages/provegate/templates/prd-template.md`) has **no `Value:` line in its header
block** — the block ends at `Autonomous Close`. A grep for `Value` across the entire
shipped method surface (`templates/`, `prompts/`, `schemas/`) returns only two unrelated
table column headings. The shipped adopter bootstrap
(`packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`) carries no triage
or weight section at all; the five weights and the `Value: 3.55 (…)` notation exist only
in **this repo's** `AGENT_BOOTSTRAP.md:131-148`, which adopters never receive. The result
is deterministic: an adopter scaffolds a PRD from the shipped template, runs
`gate check PRD-001` — the command every PRD's §11 instructs them to run before Phase 2
PASS — and gets a hard failure naming a header the method never told them to write and
the template never emitted. The PRD's own thesis is that a documented rule with no
implementation is a lie; this is its mirror image, and the class is worse because it
red-fails on first contact. Either FR-1 adds the `Value:` line to the template, the
Phase 1 generator prompt, and the practices bootstrap template (all method content —
each addition must trace to the source snapshot per the critical rules, and FR-10's
pack-drift ledger reconcile then applies), or the shipped default becomes non-enforcing
and `enforceFrom: 17` stays a this-repo choice. The PRD picks neither.

**W14 — the header grammar in FR-2 matches zero files in the corpus.** FR-2 specifies
parsing "the `Value: T (MF/UI/TL/AR/RM: a/b/c/d/e)` header". Every PRD on disk writes
`> **Value**: 4.15 (MF/UI/TL/AR/RM: 4/4/4/5/4)` — inside a blockquote, with bold
delimiters. A parser written to the literal spec finds nothing, and the failure direction
depends entirely on an unstated implementation choice. `_brain/learnings/grep-token-anchors-real-impl.md`
records this exact class. FR-2 must state the accepted form (leading `>` optional,
`**` optional, first matching line wins, more than one header is an error) and, separately,
what decimal forms the **declared** total may take: the recompute produces hundredths, but
the PRD never says whether a declared `3.7` equals 370 or fails for not being two
decimals. Every current header happens to be two-decimal, so the corpus will not expose
the ambiguity — the implementing agent will simply guess.

**W15 — the "one copy of the weight table" success metric is false as written, and this
PRD adds the second copy itself.** The metric row claims `Copies of the weight table:
1 (DEFAULT_CONFIG) → 1`, justified as "no second table exists to test". But FR-9 requires
`AGENT_BOOTSTRAP.md` to document the weights "with the default values named", and FR-10
ports that section to the practices template. After this PRD there are three copies: the
`DEFAULT_CONFIG` values, the prose table at `AGENT_BOOTSTRAP.md:137-141`, and its shipped
counterpart. Nothing pins them: FR-7's doc-claims grammar fires only on a wired script
token co-occurring with a future marker, so retuning a weight in `DEFAULT_CONFIG` leaves
both documents silently wrong. The iteration-6 design at least had a parity test for its
duplicate; this one removed the test and kept a duplicate in a different medium. Either
the metric drops the claim and the docs point at the config surface instead of restating
the numbers, or a check pins the prose table to `DEFAULT_CONFIG`.

**W16 — `gate queue` contradicts the PRD's own overlap list, in the PRD that says to run
`gate queue`.** The Conflict Surface section asserts "the relocation adds three overlaps"
and names PRD-018, PRD-019, and PRD-022, then instructs: "Run `gate queue` before
claiming — PRD-022 learned the hard way that a PRD's own overlap list is not evidence."
Running it reports a fourth, larger one:
`PRD-021 <-> PRD-023: scripts/verify/verify-workflow.mjs, packages/provegate/src/core/gates/prd-ready.ts, packages/provegate/src/cli.ts, .github/workflows/ci.yml, packages/provegate/src/core/config/types.ts`
— five files, and PRD-023 appears nowhere in PRD-021. The wave-order line
"(017 → 018 → 019 → **021** → 020 → 022)" also stops before PRD-023, which now exists and
declares PRD-021 as a prerequisite. Sequencing resolves the hazard from PRD-023's side;
the defect is that PRD-021 asserts a complete overlap list that is not complete, having
told the reader exactly how to disprove it.

**W17 — five surfaces overlap the currently active PRD-017 lease, undeclared.** The live
lease (`_state/locks/prd-017-agent-memory-substrate.json`, Phase 2b) owns
`packages/provegate/src/core/config/**`, `_brain/**`,
`packages/provegate/practices/brain/**`, `scripts/verify/pack-drift-ledger.json`, and
`docs/research/provegate-bootstrap/{DECISIONS.md, source-snapshot/**}`. PRD-021 claims
`core/config/{types,defaults,validate}.ts`, `_brain/PROTOCOL.md`,
`practices/brain/PROTOCOL.md`, the same ledger, and `docs/research/provegate-bootstrap/**`.
PRD-017 is named nowhere in PRD-021's Dependencies or Conflict Surface. Enforcement is not
at risk — `findConflicts` materializes both surfaces against `git ls-files`, the tracked
files intersect, and `gate open PRD-021` would refuse today — but the PRD documents a
dependency chain that omits the one lease it currently collides with, and FR-1 extends a
config surface PRD-017 is rewriting right now.

**W18 — `readyOverlaps` cannot see either overlap above, and FR-13(b) does not fix it.**
`core/state/query.ts:181` compares declared globs by **exact string equality**
(`surfaces[i].paths.filter(p => surfaces[j].paths.includes(p))`), so
`docs/research/provegate-bootstrap/**` never matches
`docs/research/provegate-bootstrap/DECISIONS.md`; and the function is handed only READY
records, so an IN-FLIGHT lease is out of scope by construction. FR-13(b) adds
rejected-token *reporting* to this consumer while leaving both blind spots intact. FR-13's
stated purpose is to "make a repo-root Conflict Surface claim real"; a claim the advisory
still cannot compare is only half real. This is a scope decision, not necessarily a
defect — but the PRD should state which half it is fixing rather than implying the
advisory becomes trustworthy.

**W19 — internal cross-references drifted, and one is a direct contradiction.**
§7 Migration cites "(FR-11 minor bump)" for the changeset, which is FR-12; FR-11 is the
research-pack banner. §9 Q2 cites "(FR-6)" for the doc-claims check, which is FR-7.
§9 Q3 says the config-borne weights pulled in "the behavioral parity test with it (FR-5)"
— that parity test was **deleted** by the relocation and §12 now forbids reintroducing it,
while FR-5 is the worktree control-artifact test. §10 References cites "Readiness W1–W7"
when the watch items run to W12. §9 and §12 cannot both be followed as written.

**W20 — two asserted facts are stale, in a PRD whose subject is stale assertions.**
§1 states "the scan set holds 21 PRDs and only 6 carry a `Value:` header"; today it is 23
PRDs and 8 headers, and one of the eight (PRD-016, at 4.15) sits *before* the cutoff, so
the "15 pre-cutoff PRDs are skipped by id" framing understates what the gate will
actually read. §7 Migration states "`_state/locks` is empty at the time of writing" —
the PRD-017 lease has been active since 09:44Z. Neither error changes the design, and the
arithmetic survives both: all eight declared headers recompute exactly under the default
weights (016 → 4.15, 017 → 4.05, 018 → 4.55, 019 → 4.40, 020 → 3.90, 021 → 3.65,
022 → 3.60, 023 → 4.25), so FR-8's `pnpm verify:value-score` row would find the live
corpus green. The point is that a PRD asking the repo to stop shipping stale counts should
not ship two of its own; both should become measured-at-implementation statements or be
dropped.

**W21 — a DO NOT that expires before Phase 4 begins.** §12 says "DO NOT claim
`verify:value-score` is enforced locally; it is CI-only **until the root gates manifest
exists**". Neither `workflow.config.json` nor `gates.manifest.json` exists in the working
tree today — both are created by PRD-018, which is a blocking prerequisite. The condition
is therefore satisfied before this PRD's Phase 4 can start, so either the manifest does
not in fact confer local enforcement (delete the clause) or it does (and FR-8's "stated
residual" is wrong by the time it ships).

**Value re-score (the PRD assigns this to the independent round; recorded here, not
applied to the PRD).** Current header: `3.65 (MF/UI/TL/AR/RM: 5/3/3/4/3)`, correct
arithmetic for the declared dimensions. The relocation changes two of them. **UI 3 → 4**:
the gate now ships to every adopter with configurable weights rather than remaining a
repo-local script. **TL 3 → 4**: FR-13 repairs a parser defect that silently voids
root-file Conflict Surface claims for PRD-018, PRD-021, and PRD-023 — measured, not
hypothetical. MF stays 5, AR stays 4, RM stays 3 (the published behavior change and the
adopter-visible gate offset the removed duplication). Recommended header:
`4.10 (MF/UI/TL/AR/RM: 5/4/4/4/3)` — which crosses the 4.00 top-tier triage threshold and
should move the item's queue position. Apply it during the W13–W21 revision, not before.

---

## Scorecard

Class `infra` weights, per
`packages/provegate/prompts/phase-2-readiness-scorer.md`.

**Iteration 7 — scores the relocated FR set.** The iteration-6 table below it is retained
as prior analysis; the two numbers are not comparable, because they score different FR
sets (FR-2, FR-3, FR-6, and FR-8 were rewritten and the parity test was removed).

| # | Dimension | Weight | Score | Notes |
| - | --------- | ------ | ----- | ----- |
| 1 | Clarity | 15% | 7.5/10 | All agent-executability checks pass — every FR has Targets, every FR maps to a runnable command, DO NOT and empty Open Questions are present, no TBD tokens. Held down by W14 (the header grammar the parser must accept is unstated and matches no file on disk) and W19 (four drifted cross-references, one of them a §9/§12 contradiction the agent cannot resolve from the text). |
| 2 | Completeness | 20% | 6.5/10 | W13 is a hole in the shipped product, not the prose: the gate is enabled by default for adopters whose template cannot satisfy it. W15 reintroduces the weight duplication in a different medium with no check, and W18 leaves the advisory half-fixed without saying so. |
| 3 | Technical Depth | 20% | 8.0/10 | The strongest dimension and it survived the relocation. Integer-hundredths arithmetic, the lexical two-decimal rule with the `Number.isInteger(0.29 * 100)` trap named, null-id-still-enforces, and FR-13's three-part decomposition were each verified against the source and are correct. W13/W18 are depth misses at the boundary rather than in the core. |
| 4 | Multi-Tenancy & Security | 10% | 8.5/10 | No protected route, endpoint, query path, tenant data, or client→server payload. No runtime dependency, no network, no push path. The new CI step runs a built local CLI and touches no secret. |
| 5 | Scope & Testability | 15% | 7.5/10 | Non-Goals are unusually disciplined — the "relocate any other check → PRD-023" boundary is exactly right. Every FR has a runnable command and the deny test is named. Two Success Metrics rows are false as written (W15, W20), and W9 is still open from iteration 6. |
| 6 | Migration & Rollback | 20% | 6.5/10 | Rollout order, downgrade, the published-behavior asymmetry, and the worktree control-artifact transition are all concrete and genuinely good. But infra weights this dimension at 20% precisely because deployment ordering is the failure mode, and W13 is a deployment-ordering failure at the adopter boundary: the release enables a gate before the artifact that satisfies it exists. W20's stale lease claim is in this section too. |
| **Total** | **Weighted** | | **7.30/10** | **ITERATE** |

Weighted sum:
`0.15×7.5 + 0.20×6.5 + 0.20×8.0 + 0.10×8.5 + 0.15×7.5 + 0.20×6.5`
= `1.125 + 1.300 + 1.600 + 0.850 + 1.125 + 1.300 = 7.300`, reported as **7.30/10**.

Hard caps checked (iteration 7):

- **Security cap:** not triggered — no protected route, endpoint, or query path is
  added or touched.
- **Contract cap:** not triggered — no new client→server payload ships.
- **Lint cap:** not triggered — `node packages/provegate/dist/cli.js check PRD-021`
  exited 0 on re-run.
- **ProveGate method caps:** no runtime dependency and no push path. **Method-content
  check raised, not tripped:** W13's remedy would add a line to
  `templates/prd-template.md`, the Phase 1 generator prompt, and
  `practices/templates/AGENT_BOOTSTRAP.template.md` — all method content, which must
  trace to the source snapshot (`AGENT_BOOTSTRAP.md` critical rule 4). The revision must
  show that trace or choose the non-enforcing default instead.

The verdict is ITERATE on W13 alone; W14–W21 would not individually block.

<details>
<summary>Superseded — iteration-6 scorecard (pre-relocation FR set, 8.43 PASS)</summary>

| # | Dimension | Weight | Score | Notes |
| - | --------- | ------ | ----- | ----- |
| 1 | Clarity | 15% | 8.5/10 | The two literal shapes, named accept/reject fixtures, diagnostic API, consumer paths, and enforcing test make FR-13 autonomous; W9 remains a bounded FR-12 evidence issue. |
| 2 | Completeness | 20% | 8.5/10 | Root parsing, diagnostics, advisory/enforcing consumers, per-glob structural union, exact residual, and migration/dependency boundaries are covered. |
| 3 | Technical Depth | 20% | 8.5/10 | Per-glob unmaterialized structural overlap correctly addresses the mixed tracked/untracked surface failure while retaining the file intersection. |
| 4 | Multi-Tenancy & Security | 10% | 8.5/10 | No protected route, endpoint, tenant data, or client/server payload changes. Bounded parsing and loud diagnostics prevent silent ownership loss. |
| 5 | Scope & Testability | 15% | 8.0/10 | The three target tests cover parser, enforcing, and advisory paths with literal accept/reject cases; W9 remains for changeset association evidence. |
| 6 | Migration & Rollback | 20% | 8.5/10 | The cutoff, release ordering, downgrade, rollback, lease preflight, and root-config edit transition remain concrete; the measured PRD-018 dependency confirms deployment order. |
| **Total** | **Weighted** | | **8.425/10** | **PASS (superseded)** |

</details>

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

### Iteration-7 watch items (against the relocated FR set)

13. **W13 — BLOCKING: the shipped gate has no shipped affordance.** `enforceFrom: 1` by
    default plus "missing header at/after the cutoff fails" plus a
    `templates/prd-template.md` with no `Value:` line means every adopter's first
    `gate check` fails on a header the method never told them to write. Resolve by adding
    the header line to the PRD template, the Phase 1 generator prompt, and
    `practices/templates/AGENT_BOOTSTRAP.template.md` (with the source-snapshot trace and
    an FR-10 ledger reconcile), **or** by shipping a non-enforcing default and keeping
    `enforceFrom: 17` a this-repo choice. Pick one in FR-1 explicitly.
14. **W14 — the parsed header form is unspecified.** FR-2's literal grammar matches no
    file in the corpus (`> **Value**: …` is the real form). State the accepted shape and
    the multiple-match rule, and state whether a declared one-decimal total is legal.
15. **W15 — the "one weight table" metric is false after FR-9/FR-10.** Either stop
    restating the numbers in the two bootstrap documents and point at the config surface,
    or add a check pinning the prose table to `DEFAULT_CONFIG`. Update the metric row
    either way.
16. **W16 — the overlap list omits PRD-023 (five files, `gate queue`-confirmed).** Add
    PRD-023 to the Conflict Surface narrative and extend the wave-order line past PRD-022.
17. **W17 — PRD-017's active lease overlaps five claimed surfaces, undeclared.** Name it
    in Dependencies, and note that FR-1 extends a config surface PRD-017 is mid-flight on.
18. **W18 — FR-13(b) leaves `readyOverlaps` blind in two ways it does not name.** Exact
    string comparison misses glob-vs-file overlap, and only READY records are scanned, so
    an in-flight lease never warns. State this as scoped-out with the reason, or fix it.
19. **W19 — four drifted cross-references, one contradictory.** §7 "FR-11 minor bump" →
    FR-12; §9 Q2 "(FR-6)" → FR-7; §9 Q3's parity test was deleted and §12 forbids it;
    §10 "W1–W7" → W1–W21.
20. **W20 — two stale asserted facts.** "21 PRDs / 6 headers" → 23 / 8, one of them
    pre-cutoff; "`_state/locks` is empty" → the PRD-017 lease is active. Make both
    measured-at-implementation or drop them.
21. **W21 — a DO NOT whose condition expires before Phase 4.** "CI-only until the root
    gates manifest exists" — PRD-018 creates that manifest and is a blocking prerequisite.
    Delete the clause or correct FR-8's stated residual.

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
| 7 | 2026-07-25 | 7.30 | ITERATE | First round against the **relocated** FR set; not comparable to iteration 6. Verified the relocation's core against source: `lintPrd` already takes the resolved config, `runCheck` already holds the record, the `--wiring` branch is the right model, `declaredGlobs` drops slash-less tokens, `findConflicts` falls back only at zero materialization, and a `.mjs`-less `verify:*` key still satisfies `verify-gates-wired`. Blocked on W13 — `enforceFrom: 1` ships an adopter-facing gate while `templates/prd-template.md` has no `Value:` line, so every adopter's first `gate check` fails on a header the method never emitted. Also W14 (the specified header grammar matches no file on disk), W15 (FR-9/FR-10 recreate the weight duplication the relocation claimed to remove), W16/W17 (`gate queue` reports a five-file PRD-023 overlap and the active PRD-017 lease collides on five surfaces, neither declared), W18 (`readyOverlaps` stays blind to glob-vs-file and to in-flight leases), W19–W21 (drifted cross-references, stale corpus/lease facts, a self-expiring DO NOT). All eight declared `Value:` headers recompute exactly, so the live corpus would sweep green. Value re-score recommended: 3.65 → **4.10** (5/4/4/4/3). |

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

Iteration 7 (relocated FR set):

- [x] Confirmed `lintPrd` (`core/gates/prd-ready.ts:54`) takes the resolved
  `WorkflowConfig` first, so FR-2's "no new plumbing" is true.
- [x] Confirmed `runCheck` (`cli.ts:456`) resolves the record at line 476 and calls
  `lintPrd` with three arguments at line 482 — the fourth `number` argument is mechanical.
- [x] Confirmed the `--wiring` branch exists at `cli.ts:460` as FR-3's model.
- [x] Confirmed `declaredGlobs` drops slash-less tokens at `core/state/markdown.ts:171`.
- [x] Confirmed `findConflicts` falls back to `structuralOverlap` only under
  `a.mat.size === 0 || b.mat.size === 0` (`core/locks/conflicts.ts:108`).
- [x] Confirmed `verify-gates-wired` direction 1 accepts a script name found in CI text
  even with no `scripts/verify/*.mjs` basename, so FR-8's CLI-invoking key wires cleanly.
- [x] Confirmed the CI `verify` job ends with `pnpm build`, so an appended step is ordered.
- [x] Confirmed neither `workflow.config.json` nor `gates.manifest.json` exists yet.
- [x] Recomputed all eight declared `Value:` headers under the default weights — every one
  is exact, so `verify:value-score` would find the live corpus green.
- [ ] **W13:** `templates/prd-template.md` has no `Value:` line, and no `Value` token
  exists anywhere in `templates/`, `prompts/`, or `schemas/`; the shipped
  `practices/templates/AGENT_BOOTSTRAP.template.md` has no triage or weight section.
  With `enforceFrom: 1` the shipped gate cannot be satisfied by a shipped artifact.
- [ ] **W14:** FR-2's literal `Value: T (…)` grammar matches zero PRDs; the real form is
  `> **Value**: T (…)`.
- [ ] **W15:** FR-9/FR-10 create prose copies of the weight table with no pinning check.
- [ ] **W16/W17:** `gate queue` reports a five-file PRD-021 ↔ PRD-023 overlap; the active
  PRD-017 lease overlaps five more surfaces. Neither is declared in the PRD.
- [ ] **W18:** `readyOverlaps` (`core/state/query.ts:181`) compares globs by exact string
  equality and receives only READY records.
- [ ] **W19/W20/W21:** cross-reference drift, stale corpus/lease facts, self-expiring
  DO NOT clause.

---

## Verdict

**ITERATE — 7.30/10, iteration 7.** The lint passes and no hard cap applies. The
relocation's core design is sound and was verified against source rather than accepted
from the prose: `lintPrd` already carries the resolved config, `runCheck` already holds
the record, `declaredGlobs` and `findConflicts` behave exactly as FR-13 describes, and
the wiring meta-gate accepts a CLI-invoking `verify:*` key. Technical Depth at 8.0
reflects that.

**W13 is the blocking finding and it is the only one that blocks.** FR-1 chooses
`enforceFrom: 1` for adopters and argues the default should be "enforce everywhere";
FR-2 makes a missing header a failure. But the shipped PRD template emits no `Value:`
line, the Phase 1 generator prompt never mentions one, and the shipped adopter bootstrap
template carries no triage section at all — the notation and the weights live only in
this repository's `AGENT_BOOTSTRAP.md`, which adopters do not receive. The consequence is
deterministic rather than speculative: an adopter scaffolds from the shipped template,
runs the `gate check` their PRD's §11 tells them to run before Phase 2 PASS, and is
failed for omitting something nothing asked them to write. A PRD whose thesis is that a
documented rule with no implementation is a lie must not ship the inverse.

The remedy is a choice FR-1 has to make explicitly — add the header to the three method
artifacts (with the source-snapshot trace and an FR-10 ledger reconcile) or ship a
non-enforcing default and keep `enforceFrom: 17` a this-repo decision. Either is
acceptable; leaving it unstated is not.

W14–W21 are ordinary revision work and would not individually block: an unstated header
grammar, a weight table quietly re-duplicated into prose by FR-9/FR-10, two undeclared
overlaps that `gate queue` reports in one command, an advisory left half-fixed without
saying so, and four cross-references plus two corpus facts that have drifted. W9 remains
binding from iteration 6.

No model tier is assigned: the score is below 8. On re-score into the PASS band, both
Phase 4 and Phase 6 warrant high tier — the config surface, the lint seam, and the lock
parser are all cross-module.

The independent value re-score the PRD delegates to this round is
`4.10 (MF/UI/TL/AR/RM: 5/4/4/4/3)`, up from 3.65: the gate now ships to adopters (UI) and
FR-13 repairs a measured defect that would otherwise void root-file claims for three
PRDs in this wave (TL). Apply it with the W13–W21 revision. At 4.10 the item crosses the
4.00 top-tier triage threshold.
