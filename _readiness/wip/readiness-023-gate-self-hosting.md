# Readiness Assessment: PRD-023 — Gate Self-Hosting

> **W1–W8 were remediated in the PRD on 2026-07-25, by the same session that scored
> iteration 1. The 7.95 ITERATE below therefore describes a PRD that has since changed,
> and it deliberately still stands as the machine verdict: no independent round has
> cleared the revision, so Phase 3 must stay shut.** The next round must be run by a
> session that did not write the remediation. Summary of what moved: FR-4 became three
> parts and now ports the three missing executing-surface kinds alongside the missing
> direction, keeping the narrower `run:`-only CI reading as a deliberate strengthening;
> FR-4(c) settles the exceptions store on `manifest.wiringExceptions` and deletes the
> empty JSON file; the FR-3 corpus measurement is re-run as 14 tokens in three groups with
> `lucide-react` dropped; FR-5 drops the "first `gate` invocation" claim to PRD-021 and
> restates its contribution as the manifest-driven surface; FR-3 gained its own
> `--durable-artifacts` flag, a stated acceptance shape for mixed sections, and the third
> parser divergence; the overlap paragraph was rebuilt from `gate queue`. Value unchanged
> at 4.25.

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-023-gate-self-hosting.md`       |
| Score                  | 7.95/10                                        |
| Verdict                | ITERATE                                        |
| Iteration              | 1                                              |
| Model Tier (Execution) | do not assign — score < 8; close W1 first      |
| Model Tier (Audit)     | high (on re-score into the PASS band)          |
| Scored by              | independent agent (Claude Opus 5, different model family from the PRD author), via owner |
| Self-scored            | no — this session did not write or revise the PRD |
| Date                   | 2026-07-25                                     |
| PRD Lint               | passed — `node packages/provegate/dist/cli.js check PRD-023` exit 0 |
| State Record           | updated — `gate status` re-run after saving    |

<!-- Verdict values: PASS | ITERATE | REJECT. The Score row and Verdict row are parsed
by the state builder — keep the `| Score |` and `| Verdict |` labels intact. -->

This is a **narrow ITERATE**. One finding (W1) is substantive; the rest are corrections
to statements that are wrong rather than to a design that is wrong. The architecture is
the strongest in the wave and no part of it needs rework.

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | high | Three cross-module relocations plus three deletions, each of which must not lose a guarantee. The failure mode is silent capability loss, which a lower tier will not notice because everything still passes. |
| Phase 6 (Audit)     | high | The audit's real job is to re-derive that each deleted script's *whole* behavior landed somewhere — including the surface set W1 identifies, not just the named direction. |

---

## Analysis

### 1. Technical Depth & Architecture

**Every measurable claim in the PRD was re-measured, and the measurements are exact.**
The duplicate-pair table's line counts are correct to the line: `core/gates/review.ts`
161, `core/run/durable.ts` 46, `core/gates/wiring.ts` 212,
`verify-review-artifact.mjs` 34, `verify-durable-artifacts.mjs` 60,
`verify-gates-wired.mjs` 75. Independent verification of the behavioral claims:

- **The parser divergence is real and correctly characterized.**
  `durable.ts:19` drops any backticked value without a `/`; `durable.ts:20` drops values
  containing `{` or `}`; it does **not** exclude `*`. `verify-durable-artifacts.mjs:35`
  excludes `{`, `}`, and `*` and has no `/` rule. FR-3's description matches the source
  exactly, and its resolution (keep the package's path extraction, adopt the script's `*`
  exclusion) is the right one.
- **`parseVerificationCommands` does read the Notes column.** `safety.ts:48` selects
  `| FR-N` rows and `safety.ts:49` runs `matchAll` over the **whole line**, so any
  backticked span in the Scope or Notes cell becomes a candidate command. FR-7(a) is
  accurate, and the defect is live rather than hypothetical: PRD-021's own §11 FR-8 row
  carries `(needs \`pnpm build\`)` in its Notes cell, and `pnpm build` has whitespace so it
  escapes the `inertPath` filter at `safety.ts:55` and is admitted as a gate command.
  `gate check PRD-021` passes only because `pnpm` happens to be allowlisted — precisely
  the "an allowlisted one silently joins the gate" case FR-7(a) describes.
- **The Open Questions filter is exactly as claimed.** `prd-ready.ts:98` filters
  `/\(none\b|deferred/i`, so any bullet merely containing the word is exempted.
- **`validateReviewArtifactFile` exists** (`review.ts:124`), so FR-2's sweep has the
  function it needs.
- **`auditWiring` has the two directions FR-4 names and not the third.** Direction 1
  (`wiring.ts:165`) requires each manifest command naming a package script to exist;
  direction 2 (`wiring.ts:191`) requires each `verifyScriptPattern`-matching
  `package.json` key to be wired or excepted. Nothing walks `scripts/verify/` on disk.
- **The FR-5 arithmetic is right, including its dependency.** The bundle
  (`verify-workflow.mjs:16-23`) holds eight checks; minus this PRD's three deletions is
  five; plus `verify:doc-claims`, which PRD-021 FR-8 adds and which is a prerequisite,
  is six. Of those six, `verify-brain` and `verify-deferred` are method rules, exactly as
  FR-5 states. That chain crosses two PRDs and the PRD got it right.

The "two modes, one rule" architecture — rule in one function, per-PRD caller at close or
`gate check`, corpus sweep behind a flag — is already proven by `gate check --wiring` and
is the correct shape. "Delete last" is stated as a sequencing invariant rather than a
hope, and FR-4 correctly identifies itself as the sharpest case.

**A third parser divergence exists that FR-3 does not name.** The package uses
`matchAll` and collects **every** backticked span on a bullet; the script uses
`/`([^`]+)`/.exec(line)` (`verify-durable-artifacts.mjs:32`) and collects only the
**first**. A bullet declaring two paths is two claims to the package and one to the
script. FR-3's chosen resolution ("keep the package behavior for path extraction") happens
to cover this, so the outcome is right — but FR-3 presents an exhaustive account of where
the parsers disagree, and it is not exhaustive.

### 2. Edge Cases & Failure Modes

**W1 — deleting `verify-gates-wired.mjs` loses three executing *surfaces*, not just one
*direction*.** This is the finding that holds the verdict. FR-4 frames the entire delta as
the missing on-disk→registered direction, and ports that. But the two implementations also
disagree on what counts as a surface in the direction they share:

| Surface | `verify-gates-wired.mjs` | `auditWiring` |
| ------- | ------------------------ | ------------- |
| Manifest commands | no | **yes** (`wiring.ts:181`) |
| CI workflow files | whole file, comments stripped | `run:` text only (`yamlRunText`) |
| `.githooks/*` | **yes** | no |
| The `verify-workflow.mjs` bundle body | **yes** | no |
| Every other `package.json` script body | **yes** (the script's comment names `ship:pre` chaining `verify:workflow`) | no |

After the deletion, a check wired *only* through a git hook, *only* through bundle
membership, or *only* through another script's body would newly report as "wired nowhere".
Measured impact today is zero — `.githooks/commit-msg` and `.githooks/pre-commit` contain
no `verify:` reference, and every current `verify:*` has its own step in the CI
`workflow-hygiene` job — so nothing breaks on landing. But Goal 3 is "keep every guarantee
that exists today, including … the one audit direction the package currently lacks", and
this is a second thing the package lacks, unported and unmentioned. FR-4's own DO NOT
("DO NOT drop the on-disk→registered audit direction while deleting the script that is its
only implementation") states the principle that this violates in its other half. Resolve
by porting the surface set into `auditWiring` alongside the direction, or by stating the
narrowing as an accepted reduction with the measurement above — the same treatment PRD-021
FR-8 gives its CI-only residual.

**W2 — the exceptions store changes shape and FR-4 does not say how.**
`gates-wired-exceptions.json` is a JSON **array** (currently `[]`);
`manifest.wiringExceptions` is `Record<string, string>` — name → reason
(`gates/manifest.ts:38`), and `auditWiring` reads only the latter. FR-4 says the file
"moves with the rule and stays shrink-only", which is a policy statement where a
migration is needed: does the file's content move into `gates.manifest.json`, or does
`auditWiring` learn to read the file? The file is empty today so no data is at risk, but
the answer determines whether PRD-021 — which also claims
`scripts/verify/gates-wired-exceptions.json` — is editing a file this PRD deletes.

**W3 — the FR-3 corpus measurement is wrong in count and in one token.** FR-3 and §9 Q2
both rest on it, and §9 Q2 explicitly says the question was "answered by measurement, not
preference". Re-running the package's own extraction over every `## Durable Artifacts`
section in all 23 PRDs yields **14** slash-less tokens, not eleven:

- 2 real claims the current `/` rule silently drops — `workflow.config.json` (PRD-001)
  and `RELEASING.md` (PRD-005). **Both as stated.**
- 8 prose tokens — `status`, `queue` (PRD-001), `run`, `land`, `check` (PRD-002),
  `gate new` (PRD-006), `--worktree` (PRD-007), `commands` (PRD-015). The PRD lists
  **nine** and includes `lucide-react`, which appears nowhere in any Durable Artifacts
  section — it is in PRD-014's Non-Goals and Technical Considerations.
- 4 backticked `none` tokens (PRD-001, PRD-002, PRD-020, PRD-023), handled by a separate
  rule at `durable.ts:21` and outside the predicate's remit.

The **conclusions survive intact**: PRD-021 FR-13's predicate accepts both real claims
(`RELEASING.md` and `workflow.config.json` both satisfy the named-file shape) and rejects
all eight prose tokens (seven for having no dot, `gate new` for whitespace), and the only
slash-less tokens in wip PRDs are the two `none`s, so "no wip PRD is affected" is true.
Only the count and one token name are wrong. Correct them and name the `none` handling
explicitly, since four of the fourteen fall to a different rule.

**W4 — the "first `gate` invocation" claim is false by the time this PRD ships, and it
collides with a prerequisite.** §1 states "`gate` appears in no `package.json` script, no
CI step, and no git hook", FR-5 calls its CI step "the first `gate` invocation on an
automated surface of this repository", and the Success Metrics row reads
`Repo surfaces that invoke gate | Current: 0`. All three are true of the working tree
today and false at this PRD's Phase 4, because **PRD-021 FR-8 — a declared prerequisite —
adds `verify:value-score` as `node packages/provegate/dist/cli.js check --value-score` on
the build-dependent CI job, and claims the same first**. Both PRDs cannot be first, and
PRD-021 lands earlier by this PRD's own ordering. Restate FR-5's contribution as what it
actually is (extending `gate` from one CI surface to the manifest-driven one) and make
the metric measured-at-implementation.

**W5 — one flag, two unrelated rules, and the name only covers one.** FR-2 introduces
`gate check --review-artifacts`; FR-3 then says the Durable Artifacts declaration lint is
exposed "corpus-wide through the FR-2 sweep flag". "Review artifacts" and "Durable
Artifacts" are different sections of different documents, and §6's Gherkin says only "when
the sweep runs" without naming a flag. The implementing agent has to guess whether to add
a second flag or overload the first. Name the flags explicitly in both FRs.

**W6 — the declaration lint's acceptance shape is unstated for mixed sections.** FR-3
requires each wip PRD to declare "paths or an explicit `none`". This PRD's own section
holds two paths **and** a `Decision: \`none\`` bullet. Whether a section may mix them, and
whether a `none` bullet beside real paths is legal, decides whether the new lint passes on
the corpus it will first meet. FR-7's DO NOT already demands a corpus pass before the
stricter lints land; extend that requirement to FR-3, which is also strictly stricter.

**Deletion safety is otherwise well handled.** Each FR ports before removing, §6 asserts
the post-deletion floor is green with no `package.json` entry referencing a missing file,
and `false-green-on-missing-file` is cited as binding on every deletion. The FR-6 ledger's
four failure states (unclassified, superseded-but-present, stale, expired) each have a
Gherkin row and are named in the deny test.

### 3. Maintainability & DX

The ledger is correctly identified as the durable half of the change: consolidating three
duplicates once is cleanup, and only FR-6 stops a fourth. The `method-pending` state with
a mandatory owner and an expiring `reviewBy` follows `known-red-ledger-must-expire`
directly, and putting both pending entries on the same 2026-10-01 date as the standing
memory-metrics deferral is a real DX judgement rather than a default.

FR-6's treatment of `verify-brain` deserves specific credit: rather than arguing the
duplicate away or reopening an in-flight PRD, it records an accepted duplicate with a
date and states why the shared-corpus pin is stronger than the alternative PRD-021
discarded. That is the honest form of a residual.

FR-7's insistence that a learning is retired in the same change that fixes its hazard —
edited, not deleted, so the trap stays discoverable — is the right handling of
`notes-column-runs-commands.md`, and it closes the loop the record itself opened with
"fix it in the parser".

### 4. Migration & Rollback

**The ADR-as-precondition inversion is the best decision in the PRD.** A decision that
ships with the last PRD of a wave binds none of the wave; landing ADR-0002 on `main` ahead
of PRD-018 makes it bind all of it. The stop-don't-write instruction mirrors PRD-021 FR-4's
handling of `workflow.config.json` and is stated in both §4 and §12. `_brain/adr/` holds
only `.gitkeep` today, so the precondition is genuinely unmet and correctly flagged;
`_brain/**` is under the active PRD-017 lease, which is why FR-1 sequences it after that
lease releases.

The dependency chain was checked and is complete and correct. `gate queue` confirms
PRD-023 overlaps PRD-018 (`prd-ready.ts`, `durable.ts`), PRD-019 (`cli.ts`), PRD-021
(five files), and PRD-022 (`cli.ts`) — every one of which the PRD declares as a
Ship-Verified prerequisite, and running last resolves all of them. The claim that
`core/gates/safety.ts` is the one path no other PRD claims is also true.

Two gaps, both minor: the overlap prose lists three of the five PRD-021 files and omits
`.github/workflows/ci.yml` and `packages/provegate/src/core/config/types.ts`, which
`gate queue` reports; and W1's surface narrowing has no migration note, which is where one
belongs. Rollback itself is clean — restore three files from git history, re-add three
`package.json` entries, revert one manifest line; the package-side additions are inert if
unreferenced and no state or artifact migration exists.

---

## Scorecard

Class `infra` weights, per `packages/provegate/prompts/phase-2-readiness-scorer.md`.

| #         | Dimension                | Weight | Score      | Notes |
| --------- | ------------------------ | ------ | ---------- | ----- |
| 1         | Clarity                  | 15%    | 8.0/10     | All agent-executability checks pass: every FR carries Targets, every FR maps to a runnable §11 command, DO NOT is present and specific, Open Questions is `(none)` with all three resolutions recorded, no TBD tokens. Held down by W5 (one flag named for one of the two rules it carries) and W2 (the exceptions store changes shape with no stated migration). |
| 2         | Completeness             | 20%    | 7.5/10     | W1 is a real unported capability in a PRD whose thesis is "port before deleting", and Goal 3 promises the opposite. W3's measurement error and W6's unstated acceptance shape compound it. Everything else — the three ports, the ledger's four failure states, the deletion ordering — is covered. |
| 3         | Technical Depth          | 20%    | 8.5/10     | The strongest dimension in the wave. Six line counts exact, both named parser divergences verified against source, the `lintPrd` filter and `parseVerificationCommands` claims exact, and the six-checks-after-deletion arithmetic correct across a two-PRD dependency. Docked only for the unnamed third divergence (`matchAll` vs `exec`). |
| 4         | Multi-Tenancy & Security | 10%    | 8.5/10     | No protected route, endpoint, query path, tenant data, or client→server payload. No runtime dependency, no network, no push path. Net effect is three fewer scripts and one CI step running a locally built CLI. |
| 5         | Scope & Testability      | 15%    | 8.0/10     | Non-Goals are the most disciplined in the wave — `verify-deferred` is named a gap rather than absorbed, and the "one CI invocation, not `gate run` as sole entrypoint" boundary is exactly right. Deny test named with two cases. Two Success Metrics rows are stale-by-dependency (W4) and one rests on the miscounted measurement (W3). |
| 6         | Migration & Rollback     | 20%    | 7.5/10     | The ADR precondition inversion, the stop-don't-write rule, delete-last ordering, and a clean git-history rollback are all strong, and the five-way dependency chain is complete and correct. W1 belongs in this section and is absent from it; W4's "first invocation" claim is contradicted by a declared prerequisite. |
| **Total** | **Weighted**             |        | **7.95/10** | **ITERATE** |

Weighted sum:
`0.15×8.0 + 0.20×7.5 + 0.20×8.5 + 0.10×8.5 + 0.15×8.0 + 0.20×7.5`
= `1.200 + 1.500 + 1.700 + 0.850 + 1.200 + 1.500 = 7.950`.

Hard caps checked:

- **Security cap:** not tripped — no protected route, endpoint, or query path is added or
  touched.
- **Contract cap:** not tripped — no client→server payload ships.
- **Lint cap:** not tripped — `node packages/provegate/dist/cli.js check PRD-023` exit 0.
- **ProveGate method caps:** no runtime dependency, no push path. **Method-content note:**
  FR-3 changes `declaredArtifacts`, which is package behavior rather than shipped
  prompt/template/schema content, so critical rule 4 is not engaged.

---

## Missing Pieces (watch items — binding on Phase 3 and Phase 6)

1. **W1 — BLOCKING: port the surface set, not just the direction.** `auditWiring` counts
   only manifest commands and CI `run:` text as executing surfaces;
   `verify-gates-wired.mjs` also counts `.githooks/*`, the `verify-workflow.mjs` bundle
   body, and every other `package.json` script body. Either port those three into
   `auditWiring` with FR-4's new direction, or state the narrowing as an accepted
   reduction with the zero-current-impact measurement. Do not delete the script until one
   of the two is written.
2. **W2 — specify the exceptions migration.** `gates-wired-exceptions.json` is an array;
   `manifest.wiringExceptions` is name → reason and is what `auditWiring` reads. Say which
   store survives, and reconcile with PRD-021, which also claims the file.
3. **W3 — correct the FR-3 / §9 Q2 measurement.** 14 slash-less tokens, not 11: 2 real
   claims, 8 prose tokens, 4 backticked `none`s handled by a separate rule.
   `lucide-react` is not among them — it is in PRD-014's Non-Goals. The conclusions hold;
   the evidence must match them.
4. **W4 — drop the "first `gate` invocation" claim.** PRD-021 FR-8, a prerequisite, puts
   `gate` on CI first and claims the same. Restate FR-5's contribution and make the
   `Repo surfaces that invoke gate` metric measured-at-implementation.
5. **W5 — name both sweep flags.** FR-2 introduces `--review-artifacts`; FR-3 says the
   Durable Artifacts lint rides "the FR-2 sweep flag". State whether that is a second flag
   or an overload, in both FRs and in §6.
6. **W6 — state the declaration lint's acceptance shape.** May a Durable Artifacts section
   mix real paths with a `none` bullet, as this PRD's own does? Extend FR-7's
   corpus-pass-before-landing requirement to FR-3, which is equally strictness-increasing.
7. **W7 — name the third parser divergence.** The package's `matchAll` collects every
   backticked span per bullet; the script's `exec` collects the first. FR-3's chosen
   resolution covers it, but the divergence list claims to be complete.
8. **W8 — complete the overlap prose.** `gate queue` reports five PRD-021 files; the PRD
   names three, omitting `.github/workflows/ci.yml` and
   `packages/provegate/src/core/config/types.ts`.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-07-25 | 7.95  | ITERATE | First independent assessment. Every measurable claim re-derived from source and found exact: six line counts, both named parser divergences, the `parseVerificationCommands` whole-line match (with a live instance in PRD-021's own §11 Notes cell), the `lintPrd` `deferred` filter, `auditWiring`'s two directions, and the six-checks-after-deletion arithmetic across the PRD-021 dependency. Verdict rests on W1: `auditWiring`'s executing-surface set is narrower than the script FR-4 deletes by three surface kinds (git hooks, the bundle body, other `package.json` script bodies), unported and unmentioned, against a Goal that promises no lost guarantee — zero measured impact today, but the same class the FR exists to prevent. Also W2–W8: the exceptions store changes shape without a migration, the FR-3 corpus measurement reports 11 where 14 exist and names a token that is not there, the "first `gate` invocation" claim is taken by a declared prerequisite, one sweep flag carries two unrelated rules, the declaration lint's mixed-section shape is unstated, a third parser divergence is unnamed, and the overlap prose lists three of five `gate queue`-reported PRD-021 files. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- [x] Used infra weights: Technical Depth 20%, Multi-Tenancy & Security 10%,
      Migration & Rollback 20%.
- [x] Ran the required lint via the built CLI — `gate check PRD-023` exit 0.
- [x] Verified all six duplicate-pair line counts (161/46/212 vs 34/60/75) — exact.
- [x] Verified `durable.ts:19-20` drops slash-less and brace-containing values and does
      not exclude `*`; `verify-durable-artifacts.mjs:35` excludes `{}*` with no `/` rule.
- [x] Verified `safety.ts:48-49` matches every backtick span on an `| FR-N` row, and the
      `inertPath` filter at `:55` admits whitespace-bearing Notes tokens.
- [x] Confirmed a live instance: PRD-021 §11 FR-8 Notes carries `pnpm build`, which is
      admitted as a gate command and passes only because `pnpm` is allowlisted.
- [x] Verified `prd-ready.ts:98` filters `/\(none\b|deferred/i`.
- [x] Verified `validateReviewArtifactFile` exists at `review.ts:124`.
- [x] Verified `auditWiring` has manifest→script and script→surface, and nothing walks
      `scripts/verify/` on disk.
- [x] Verified the bundle holds 8 checks; 8 − 3 + PRD-021's `verify:doc-claims` = 6, of
      which `verify-brain` and `verify-deferred` are method rules — FR-5 is correct.
- [x] Confirmed `_brain/adr/` is empty, so the ADR-0002 precondition is genuinely unmet.
- [x] Confirmed `_brain/**` is held by the active PRD-017 lease, consistent with FR-1's
      sequencing note.
- [x] Ran `gate queue`: all four overlapping PRDs (018, 019, 021, 022) are declared
      prerequisites; `core/gates/safety.ts` is claimed by no other PRD, as stated.
- [x] Re-measured the Durable Artifacts corpus: 14 slash-less tokens, not 11 (W3).
- [x] Verified PRD-021 FR-13's predicate accepts `RELEASING.md` and
      `workflow.config.json` and rejects all eight prose tokens — the conclusion holds.
- [x] Confirmed no wip PRD is affected by the stricter rule: the only wip slash-less
      tokens are two backticked `none`s.
- [x] Confirmed no runtime dependency, no network call, and no push path is added.
- [ ] **W1:** port `.githooks/*`, the bundle body, and other `package.json` script bodies
      into `auditWiring`'s surface set, or record the narrowing as an accepted reduction.
- [ ] **W2:** state whether `gates-wired-exceptions.json` or `manifest.wiringExceptions`
      survives, and reconcile with PRD-021's claim on the file.
- [ ] **W3–W8:** correct the corpus measurement, drop the "first invocation" claim, name
      both sweep flags, state the mixed-section acceptance shape, name the third parser
      divergence, complete the overlap prose.

---

## Verdict

**ITERATE — 7.95/10, iteration 1.** The lint passes and no hard cap applies. This is a
narrow miss, and it should be read as one: the architecture needs no rework, the
dependency chain is complete and correct, and every behavioral claim the PRD makes about
this codebase was re-derived from source and found exact — six line counts, two parser
divergences, three lint internals, and a six-check arithmetic that crosses a PRD boundary.
Technical Depth at 8.5 is the highest in the wave and is earned.

**W1 is what holds the verdict.** FR-4's argument is that deleting
`verify-gates-wired.mjs` would lose the on-disk→registered direction, so port it first —
correct, and correctly the sharpest case in the PRD. But the two implementations also
disagree about what counts as an *executing surface* in the direction they share:
`auditWiring` sees manifest commands and CI `run:` text; the script additionally sees
`.githooks/*`, the `verify-workflow.mjs` bundle body, and every other `package.json`
script body. Three surface kinds leave with the deletion, unported and unmentioned, in a
PRD whose Goal 3 is "keep every guarantee that exists today" and whose §12 forbids exactly
this move in its other half. The measured impact today is zero — no git hook references a
`verify:` script and every check has its own CI step — which is precisely why it would
survive Phase 6 unnoticed and surface later as a check that was wired all along and now
reports as wired nowhere. Port the surface set, or state the narrowing as an accepted
reduction with that measurement, the way PRD-021 FR-8 handles its CI-only residual. Either
closes W1.

W2–W8 are corrections rather than redesign: an exceptions store that changes shape without
a stated migration, a corpus measurement that reports eleven tokens where fourteen exist
and names one (`lucide-react`) that is in a different section of a different PRD, a "first
`gate` invocation" claim that a declared prerequisite takes first, one sweep flag carrying
two unrelated rules, an unstated acceptance shape for mixed Durable Artifacts sections, an
unnamed third parser divergence, and an overlap list that names three of the five files
`gate queue` reports. None would individually block; together they are why Completeness
and Migration sit at 7.5.

Two things deserve explicit credit. The ADR-as-precondition inversion is the right call
stated the right way — a decision that ships with the last PRD of a wave binds none of it,
and FR-1 owns the mechanical ledger-vs-ADR link rather than the document, so the rule
cannot become the thing PRD-021 exists to correct. And FR-6's handling of `verify-brain`
is the honest form of a residual: an accepted duplicate recorded with an expiring date and
a stated reason, instead of an argument that it is not really a duplicate.

No model tier is assigned while the score is below 8. On re-score into the PASS band both
Phase 4 and Phase 6 warrant high tier — three relocations and three deletions whose
failure mode is silent capability loss, which is exactly what a lower tier will not see.

The author's draft self-score of `4.25 (MF/UI/TL/AR/RM: 5/4/4/5/3)` recomputes correctly
under the default weights and this round does not move it: the relocation-and-ledger scope
is unchanged by the findings above, and W1 is an omission in the plan rather than a change
in the item's value.
