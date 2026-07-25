# Readiness Assessment: PRD-023 — Gate Self-Hosting

> **Current state: iteration 3, 6.65/10, ITERATE — scored independently by Codex
> (gpt-5.x, different model family), and the ITERATE is on substance.** Iteration 2's
> self-scored 8.30 does not stand. The independent round found four [P1] items, and the
> first is blocking in a way neither self-scored round came close to: **the three scripts
> this PRD deletes are also shipped in the practices pack, installed by
> `gate init --practices`, run by the packed bundle, and protected by a pack-drift rule
> that fails when a mapped repo destination disappears.** The deletion as specified would
> red `pnpm verify:pack-drift`, which this PRD's own floor requires green. See §6.

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-023-gate-self-hosting.md`       |
| Score                  | 6.65/10                                        |
| Verdict                | ITERATE — four [P1] items open (§6). The self-scored 8.30 at iteration 2 is superseded |
| Iteration              | 3                                              |
| Model Tier (Execution) | do not assign — score < 8                      |
| Model Tier (Audit)     | high (on a PASS)                               |
| Scored by              | **Codex (gpt-5.x) via the `/codex` skill — independent, different model family, did not write the PRD or any prior round** |
| Self-scored            | **no**                                         |
| Date                   | 2026-07-25                                     |
| PRD Lint               | passed — `node packages/provegate/dist/cli.js check PRD-023` exit 0 (re-run at iteration 3) |
| State Record           | updated — `gate status` re-run after saving    |

<!-- Verdict values: PASS | ITERATE | REJECT. The Score row and Verdict row are parsed
by the state builder — keep the `| Score |` and `| Verdict |` labels intact. -->

At iteration 3 four [P1] items are open. The architecture is still the strongest in the
wave and still needs no rework — but the PRD's **scope** is wrong: it treats three scripts
as repo-local when the package publishes and installs copies of all three.

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

### 5. Iteration-2 measurement — the remediated FR set (self-scored)

**W1 is closed properly: FR-4 is now three parts and the comparison table is in the PRD,
not only in this report.** The surface delta is stated as a table, the three lost kinds
are ported, and the one difference that makes the package *stricter* — reading CI `run:`
text rather than the whole file — is kept and labelled deliberate rather than silently
reconciled. That last choice is the part a weaker remediation would have gotten wrong by
"restoring parity".

Checking the remediation against source produced two further findings, both since fixed.

**W9 — FOUND AND FIXED THIS ROUND: two hardcoded paths were about to move into shipped
package code.** The script's surface set names `.githooks/` and
`scripts/verify/verify-workflow.mjs` as literals. `auditWiring` ships to adopters, and
`.githooks/` is *this repository's* choice — `package.json`'s `prepare` script runs
`git config core.hooksPath .githooks`, and an adopter may use `.husky`, the git default,
or no hooks at all. FR-4(a) had already said the on-disk directory must be config-driven;
FR-4(b) said only "port the three". Both paths are now config, and an absent hooks
directory is specified as "not a surface" rather than an error, with a Gherkin row.

**W10 — FOUND AND FIXED THIS ROUND: the third surface row dropped a load-bearing
exclusion.** The row read "every other `package.json` script body". The script's actual
loop is `for (const [name, body] of Object.entries(scripts)) if (!name.startsWith('verify:'))`
— it pushes only **non**-verify-prefixed bodies, and that exclusion is what stops checks
from wiring each other. Without it, `verify:workflow`'s body names every bundle member, so
all of them would count as wired by the bundle merely existing, and two checks naming each
other would wire the pair. The row now states the exclusion, FR-4(b) explains why it is
load-bearing, `config.verifyScriptPattern` is named as the selector so it matches
direction 2 immediately above, and both a Gherkin row and a DO NOT cover it.

**W3's re-measurement was itself re-run rather than trusted.** Fourteen slash-less tokens
across 23 PRDs, in the three groups the PRD now states, with `lucide-react` absent from
every Durable Artifacts section — it is in PRD-014's Non-Goals and Technical
Considerations. The predicate accepts both real claims and rejects all eight prose tokens.

**W2's resolution was checked for a false premise, and had one.** The remediation asserts
that PRD-021 does not claim `scripts/verify/gates-wired-exceptions.json`; `gate queue`
reports no such overlap and PRD-021's Conflict Surface does not list it. That corrects the
original PRD text, which named the file as PRD-021's. Deleting an empty array file whose
only reader is the script being deleted is the right call.

**What this round cannot do.** Every finding above came from the session that wrote the
text. W9 and W10 were catchable only because they were checkable against source; a wrong
judgement in the same prose would have read as correct.

### 6. Iteration-3 independent measurement — Codex

Run via the `/codex` skill, consult mode, read-only sandbox, `model_reasoning_effort=high`,
with an explicit instruction not to defer to the self-scored conclusions. **Every finding
below was re-verified against source by the recording session before being written here.**

**[P1] 1 — BLOCKING: the three "duplicates" are published, installed, and protected, and
deleting them fails this PRD's own verification floor.** Both self-scored rounds treated
`scripts/verify/verify-{review-artifact,durable-artifacts,gates-wired}.mjs` as
repo-local files. They are not. Verified:

- `packages/provegate/practices/verify/` ships all three
  (`verify-review-artifact.mjs`, `verify-durable-artifacts.mjs`, `verify-gates-wired.mjs`).
- `core/run/init.ts` maps each one into an adopter repo — `gate init --practices` installs
  them at `scripts/verify/…`, and installs `gates-wired-exceptions.json` too.
- The packed bundle `practices/verify/verify-workflow.mjs` lists `verify-gates-wired.mjs`
  among its six `CHECKS`.
- `scripts/verify/verify-pack-drift.mjs` fails with *"pack ships 'X' but this repo has no
  'Y' — the live layer lost its copy"* when a mapped repo destination is absent.

So deleting the root scripts reds `pnpm verify:pack-drift`, which §11's cross-cutting
floor requires green. **And the packed `gates-wired-exceptions.json` is not empty** — it
carries eight entries, while the root copy this PRD inspected is `[]`. FR-4(c)'s "the file
is empty, so nothing migrates" is true of the root copy and false of the shipped one.

Scope must expand to the practices scripts, the packed bundle, the packed exceptions file,
`init.ts`, `NEXT_STEPS.md`, the pack manifest and its test, and the pack-drift ledger — or
Goal 2 ("exactly one implementation of each rule") and User Story 1 ("adopters get the
method this repo demonstrates") are both false as written.

**[P1] 2 — FR-4 makes three paths configurable and names no keys.** The iteration-2
remediation said the hooks directory, the bundle path, and the on-disk verify directory
"become config", but its Targets list only `config/types.ts`. `WorkflowConfig` has no such
fields today and `validate.ts` mirrors the full shape, so the change needs named keys,
defaults, semantic validation, config tests, and Conflict Surface entries for
`defaults.ts` and `validate.ts`. None are present.

**[P1] 3 — FR-3 consumes a predicate PRD-021 does not promise to export.** "One predicate
for two sections" requires PRD-021's FR-13 named-file/dotfile test to be reusable, but
PRD-021 names only `declaredGlobs` and `parseConflictSurface` as targets. Either PRD-021
must export a named predicate with tests, or PRD-023 must add `markdown.ts` to its own
Targets and Conflict Surface. As written, Phase 4 either duplicates the logic — in the PRD
whose thesis is that duplication is the defect — or edits out of scope.

**[P1] 4 — the class rationale is false and the release is missing.** The header says "no
application behavior and **no new user-facing feature**". This PRD adds two public CLI
flags (`--review-artifacts`, `--durable-artifacts`), new public config keys (item 2), and
changes published practices assets. That is a user-facing surface change and needs a
changeset with compatibility notes, plus a semantic assertion that it exists.

**[P2] 5 — two revision leftovers.** §9 Q2 still says "eleven slash-less tokens, all eleven
classified correctly" (lines 537–538) after FR-3 was corrected to fourteen. §7 Dependencies
still claims PRD-021 "edits `verify-workflow.mjs` and `gates-wired-exceptions.json`"
(line 488), contradicting both FR-4(c) and the corrected Conflict Surface paragraph at
line 610, which state that PRD-021 does not claim that file.

**[P2] 6 — ADR-0002's machine comparison has no parseable format.** The ADR is genuinely
absent (`_brain/adr/` holds only `.gitkeep`; the INDEX carries a commented placeholder) and
`_brain/**` is leased by PRD-017 until 21:44Z, so the stop-precondition is valid. But FR-1
promises a check that the ledger "classifies every script exactly as the ADR does", and
nothing specifies a parseable shape in the ADR to compare against. Bind FR-1 to a named
table or marker rather than unconstrained prose.

**What Codex confirmed, having been told to distrust it.** The FR-4(b) surface table is
accurate, and keeping CI at `run:` text is correct — the deleted script reads nearly the
whole YAML while `yamlRunText` excludes comments and non-executing fields, so the package
is genuinely stricter. The 14-token corpus measurement is right under the package's
extraction (2 real paths, 8 prose tokens, 4 `none`), and the only wip cases are the two
`none`s. FR-4's size is not itself a blocker if Phase 3 decomposes it.

**The lesson for this file.** The self-scored rounds asked "does the remediation match the
source it cites?" and it did. They never asked "is the *scope* right?" — and the answer was
no, in a way one `ls packages/provegate/practices/verify/` would have shown.

---

## Scorecard

Class `infra` weights, per `packages/provegate/prompts/phase-2-readiness-scorer.md`.

**Iteration 3 — independent (Codex). Supersedes the self-scored iteration 2 below.**

| #         | Dimension                | Weight | Score      | Notes |
| --------- | ------------------------ | ------ | ---------- | ----- |
| 1         | Clarity                  | 15%    | 6.5/10     | FR-4 does not name its new config contract, and two stale contradictions survive the revision. |
| 2         | Completeness             | 20%    | 6.0/10     | The published practices-pack duplicates and the installer contract are entirely omitted. |
| 3         | Technical Depth          | 20%    | 7.5/10     | Surface comparison and parser measurements are strong; integration boundaries are not. |
| 4         | Multi-Tenancy & Security | 10%    | 9.0/10     | No protected surface, payload, runtime dependency, network, or push path. |
| 5         | Scope & Testability      | 15%    | 6.5/10     | Core tests are named, but the required pack/init and config-validation surfaces are absent. |
| 6         | Migration & Rollback     | 20%    | 5.5/10     | The deletion as specified breaks pack-drift; no changeset and no adopter migration. |
| **Total** | **Weighted**             |        | **6.65/10** | **ITERATE** |

Hard caps: none tripped. Lint exits 0.

<details>
<summary>Superseded — iteration-2 scorecard (self-scored, 8.30 ITERATE)</summary>

| #         | Dimension                | Weight | Score      | Notes |
| --------- | ------------------------ | ------ | ---------- | ----- |
| 1         | Clarity                  | 15%    | 8.5/10     | Both sweep flags are now named (`--review-artifacts`, `--durable-artifacts`), the declaration lint's acceptance shape is stated using this PRD's own mixed section, the third parser divergence is named, and FR-4's surface delta is a table rather than a sentence. |
| 2         | Completeness             | 20%    | 8.0/10     | W1's surface set ported with its config and exclusion corrections (W9, W10); the exceptions store settled; the corpus measurement regrouped. Not higher because FR-4 now carries three parts plus two sub-rules, and the Phase 3 plan will have to decompose it carefully. |
| 3         | Technical Depth          | 20%    | 8.5/10     | Unchanged and still the strongest dimension: every measurable claim re-derived from source across two rounds, and the remediation caught the `startsWith('verify:')` exclusion that a parity-restoring fix would have dropped. |
| 4         | Multi-Tenancy & Security | 10%    | 8.5/10     | Unchanged: no protected surface, no dependency, no network, no push path. Net effect is three fewer scripts and one manifest-driven CLI invocation. |
| 5         | Scope & Testability      | 15%    | 8.5/10     | Three Gherkin rows added for the ported surfaces, one for the absent hooks directory, one for the bundle self-wiring case; the stale-by-dependency metric is now measured-at-implementation; deny test unchanged and still names two cases. |
| 6         | Migration & Rollback     | 20%    | 8.0/10     | The surface narrowing is now inside the plan rather than absent from it, the "first `gate` invocation" claim is handed to PRD-021, and the overlap paragraph is rebuilt from `gate queue` with a false PRD-021 claim removed. The five-way dependency chain was correct from the start. |
| **Total** | **Weighted**             |        | **8.30/10** | **ITERATE — on independence** |

Weighted sum:
`0.15×8.5 + 0.20×8.0 + 0.20×8.5 + 0.10×8.5 + 0.15×8.5 + 0.20×8.0`
= `1.275 + 1.600 + 1.700 + 0.850 + 1.275 + 1.600 = 8.30`.

Hard caps checked (iteration 2): security not tripped, contract not tripped, lint exit 0,
no runtime dependency and no push path. **No cap forces the ITERATE** — the independence
rule does.

</details>

<details>
<summary>Superseded — iteration-1 scorecard (pre-remediation, 7.95 ITERATE)</summary>

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

</details>

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

### Iteration-2 status

**W1–W8: all RESOLVED in the PRD** (see §5 and the 2026-07-25 changelog row).

9. **W9 — RESOLVED, found and fixed this round.** FR-4(b) was about to move two hardcoded
   paths into shipped package code: `.githooks/` (this repo's `core.hooksPath`, set by the
   `prepare` script — an adopter may use `.husky` or the git default) and the
   `verify-workflow.mjs` bundle path. Both are config now, with an absent hooks directory
   specified as "not a surface, not an error" and covered by a Gherkin row.
10. **W10 — RESOLVED, found and fixed this round.** The third surface row read "every
    other `package.json` script body"; the script's loop excludes verify-prefixed names,
    and that exclusion is what stops a bundle from wiring its own members and two checks
    from wiring each other. FR-4(b) now states it, names `config.verifyScriptPattern` as
    the selector, and carries a Gherkin row and a DO NOT.

**Open for the next round, and it is not a PRD defect:** an independent scorer. See the
Verdict.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 3   | 2026-07-25 | 6.65  | ITERATE | **Independent — Codex (gpt-5.x) via the `/codex` skill, read-only, high reasoning effort. Supersedes the self-scored 8.30.** Four [P1]s, all re-verified against source before recording. The blocking one is scope, not detail: the three scripts this PRD deletes are **shipped in the practices pack**, installed into adopter repos by `gate init --practices` (`core/run/init.ts`), run by the packed `verify-workflow.mjs` bundle, and protected by `verify-pack-drift.mjs`, which fails with "pack ships 'X' but this repo has no 'Y' — the live layer lost its copy" when a mapped destination disappears. So the deletion reds `pnpm verify:pack-drift`, which §11's floor requires green — and the packed `gates-wired-exceptions.json` holds eight entries where the root copy this PRD inspected is `[]`, so FR-4(c)'s "the file is empty" is true of the wrong copy. Also: FR-4 makes three paths configurable without naming keys, defaults, validation, or the `defaults.ts`/`validate.ts` targets; FR-3 consumes a predicate PRD-021 never promises to export, so Phase 4 must duplicate it or edit out of scope; the class rationale claims "no new user-facing feature" while adding two public CLI flags and new config, with no changeset. Two revision leftovers: §9 Q2 still says eleven tokens after FR-3 was corrected to fourteen, and §7 Dependencies still claims PRD-021 edits `gates-wired-exceptions.json`, contradicting FR-4(c). Codex confirmed the FR-4(b) surface table, the `run:`-only CI narrowing, and the 14-token measurement. |
| 2   | 2026-07-25 | 8.30  | ITERATE | **Self-scored — the ITERATE is on independence, not substance.** W1–W8 all resolved: FR-4 became three parts with the surface-delta table inline, keeping the package's narrower CI `run:` reading as a deliberate strengthening rather than restoring parity; FR-4(c) settled the exceptions store on `manifest.wiringExceptions` and deleted the empty JSON file, correcting a false claim that PRD-021 owned it; the corpus measurement regrouped to 14 tokens in three groups with `lucide-react` dropped; FR-5 handed the "first `gate` invocation" claim to PRD-021 FR-8; FR-3 gained its own `--durable-artifacts` flag, a stated acceptance shape for mixed sections, and the third parser divergence. Two new items caught by checking the remediation against source and both fixed: **W9**, FR-4(b) was about to move `.githooks/` and the bundle path into shipped package code as literals when this repo's hooks path comes from its own `prepare` script; and **W10**, the third surface row dropped the `startsWith('verify:')` exclusion that stops a bundle from wiring its own members. No hard cap trips and the lint exits 0; the verdict is held solely by the rule that a gate may not be self-declared green. |
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

**ITERATE — 6.65/10, iteration 3, scored independently by Codex.** Four [P1] items are
open. The self-scored 8.30 does not stand, and the gap is not judgement — it is a scope
error that two rounds of careful source-checking never looked for.

The blocking item is [P1] 1. This PRD's premise is "three method rules are implemented
twice, once in the package and once as a repo script; delete the script". The truth is that
all three scripts are *also published in the practices pack*, installed into adopter repos
by `gate init --practices`, executed by the packed bundle, and pinned by a pack-drift rule
that fails the moment a mapped destination disappears. Deleting the root copies reds
`pnpm verify:pack-drift`, which this PRD's own cross-cutting floor requires green. The
duplication is threefold, not twofold, and the third copy is the one adopters actually get.

That reframes the PRD rather than patching it: Goal 2 and User Story 1 are false while the
packed copies survive, and FR-2/FR-3/FR-4 each need a pack-side half. It is still the right
PRD — the finding strengthens its thesis — but the scope has to grow before Phase 3 can
decompose it.

The other three are contained: FR-4 names three configurable paths without naming keys or
validation targets; FR-3 depends on PRD-021 exporting a predicate it never promises; the
class rationale claims no user-facing change while adding two CLI flags and new config, so
a changeset is missing.

**Remediation order.** Item 1 is a scope expansion the owner should sign off before it is
written — it pulls in `init.ts`, the pack manifest, `NEXT_STEPS.md`, and the ledger, and it
touches PRD-019's and PRD-018's surfaces. Items 2 and 4 are specification work. Item 3
needs a one-line commitment in PRD-021 (export the predicate) or one added target here.
Item 5 is two stale sentences.

Whoever remediates must not also score the next round.

<details>
<summary>Superseded — iteration-2 verdict (self-scored, 8.30 ITERATE)</summary>

**ITERATE — 8.30/10, iteration 2. The score is in the PASS band and the verdict is not,
and the gap is entirely the scorer.**

Substantively this PRD is ready, and it was the strongest in the wave before the
remediation. W1–W10 are closed, no hard cap trips, and `gate check PRD-023` exits 0. The
remediation also passed the test a weaker one would have failed: FR-4(b) keeps the
package's narrower CI reading instead of restoring parity with the script, and W10 caught
the `startsWith('verify:')` exclusion that a "port the surfaces" instruction would
otherwise have dropped — losing it would have let a bundle wire its own members and
quietly inverted the meta-gate.

What blocks it is `AGENT_BOOTSTRAP.md`'s critical rule: *a gate passes only when its check
returns 0 or an independent reviewer — different model or human, never the author — says
`pass`.* This session wrote the W1–W10 remediation and then scored it. Both of this
round's findings were caught only because they were **checkable against source**; a wrong
judgement in the same prose would have read as correct to the session that wrote it.

`_state/prds.json` therefore keeps `ITERATE`, and Phase 3 stays shut.

**What an independent round needs to do:**

1. Confirm the FR-4(b) surface table against `verify-gates-wired.mjs` and `wiring.ts`, and
   judge whether keeping CI at `run:`-only is right or whether the whole-file reading
   should have been ported too.
2. Judge FR-4(c)'s deletion of `gates-wired-exceptions.json` — the file is empty and its
   only reader is the script being deleted, but deletion is irreversible in a way the
   other two ports are not.
3. Re-run the FR-3 corpus measurement (14 tokens, three groups) and confirm no wip PRD is
   affected.
4. Judge whether FR-4 is now too large for one FR and should split before Phase 3
   decomposes it.
5. Confirm ADR-0002's precondition status — it is still unwritten, and `_brain/**` is
   under the PRD-017 lease.

On an independent PASS, assign high tier for both Phase 4 and Phase 6: three relocations
and three deletions whose failure mode is silent capability loss.

</details>

<details>
<summary>Superseded — iteration-1 verdict (pre-remediation, 7.95 ITERATE)</summary>

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

</details>
