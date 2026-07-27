# Readiness Assessment: PRD-029 — Method Delivery, Agent Protocol Binding

> **Iteration 2 (Codex, independent) — 5.73/10, ITERATE. Up 1.25, the largest single-round
> gain in this wave, and the findings changed class.** Iteration 1's were internal
> contradictions; **none of iteration 2's is.** Every factual claim in the rewrite verified
> against source — the 20/7/13 token split, the twelve rendered protocols, the seven
> templates, the README wording, the loader order at 267/272/273, the `new.ts:170` fallback.
> What the split bought was room for the document to be wrong about the *world* instead of
> about itself, and eight [P1]s say it still is. **Two are my own overshoot**: FR-4 derives
> the required value set from the registry rather than from what FR-2 actually renders, so
> four tokens that live only in `practices/templates/AGENT_BOOTSTRAP.template.md` become
> hard refusals an adopter cannot satisfy meaningfully; and FR-3's mandatory banner collides
> with FR-6's `.mdc` frontmatter, which every `.cursor/rules/*.mdc` in this repository and in
> the snapshot opens with on line 1. **Three are the successor interfaces failing to
> compose**: PRD-030 requires a ledger PRD-029 never creates, and PRD-031's two-mode
> rendering needs conditional expansion that `prompts.values` scalar substitution cannot do —
> which also means 030 and 031 are not parallelizable as written.
>
> <details><summary>Iteration 1 (4.48 ITERATE)</summary>
>
> **Iteration 1 (Codex, independent) — 4.48/10, ITERATE.** The lowest opening score in the
> wave, and the findings say why: **six of the eight [P1]s are the document disagreeing with
> itself**, not with the codebase. The token count, the file inventory, the activation
> contract and the `templates.prd` behaviour each say one thing in §4 and another in §6, §7
> or §11. Every checkable finding was re-verified against source here before being recorded;
> **none was rejected.** The two that are not internal contradictions are the sharpest:
> `prompts/adapters/` already ships two prose-heavy adapters the PRD never mentions while
> FR-5 promises "one protocol location", and FR-10 makes conditional a rule the frozen
> snapshot states unconditionally, which is a method-content change rather than a token.
>
> </details>

## Quick Meta

| Field                  | Value                                                                                                                                                                                                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PRD                    | `_prds/wip/prd-029-method-delivery-agent-binding.md`                                                                                                                                                                                                                                                     |
| Score                  | 5.73/10                                                                                                                                                                                                                                                                                                  |
| Verdict                | ITERATE — eight [P1] items, none of them an internal contradiction. Five are specification gaps the rewrite exposed rather than created (render-domain totality, token grammar, activation state machine, adapter grammar, banner-versus-frontmatter); two are hard refusals that reject legitimate input; one is the successor interfaces failing to compose |
| Iteration              | 2                                                                                                                                                                                                                                                                                                        |
| Model Tier (Execution) | do not assign — score < 8                                                                                                                                                                                                                                                                                |
| Model Tier (Audit)     | high (on a PASS)                                                                                                                                                                                                                                                                                         |
| Scored by              | **Codex (gpt-5.x) via the `/codex` skill — independent, different model family, did not write the PRD**                                                                                                                                                                                                  |
| Self-scored            | **no**                                                                                                                                                                                                                                                                                                   |
| Date                   | 2026-07-27                                                                                                                                                                                                                                                                                               |
| PRD Lint               | passed — `lintPrd` green by direct invocation with the real config, manifest, content and root: `{ ok: true, issues: [] }`. The CLI wrapper was not used: `findRecord` writes `_state/prds.json`, which the read-only sandbox refused with `EPERM`. The reviewer stated this rather than implying a run     |
| State Record           | updated — `gate status` re-run after saving                                                                                                                                                                                                                                                              |

<!-- Verdict values: PASS | ITERATE | REJECT. The Score row and Verdict row are parsed
by the state builder — keep the `| Score |` and `| Verdict |` labels intact. -->

---

## Model Tier Recommendation

| Phase               | Tier                       | Rationale                                                                                                                                             |
| ------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase 4 (Execution) | do not assign — score < 8  | The scope split (W1) changes which FRs exist, so any tier assigned now would describe work that will not be executed in this shape                     |
| Phase 6 (Audit)     | high (on a PASS)           | The delivery core touches the installer, the config surface and shipped method content; three surfaces where this repository's defects have historically hidden |

---

## Analysis

### 1. Technical Depth & Architecture

The central design claim is sound and survives scrutiny: rendered content as a pure
function of package version and config is what makes divergence recomputable rather than
merely recorded, and the pointer-only adapter rule is the correct answer to this
repository's most-repeated defect. The reviewer did not challenge either.

What it did challenge is that the PRD **never states which files the render covers**. FR-2
says "all ten files under the package's `prompts/` (including `PLACEHOLDERS.md` and
`orchestration-runner.md`)". Measured here: `find packages/provegate/prompts -name '*.md'`
returns **14**. Ten protocols exist — seven phase files plus `orchestration-runner.md`,
`knowledge-ingest.md` and `knowledge-lint.md` — so naming `PLACEHOLDERS.md` as one of the
ten makes eleven, and `README.md` plus `adapters/` are unaccounted for entirely. §11's FR-2
row says "all ten protocols and the templates emit", which is a third reading. The template
side is worse: no allowlist is given at all, and the seven files under `templates/` include
`README.md`.

**`packages/provegate/prompts/adapters/` already exists** and ships `codex-starter.md` and
`cursor-bootstrap.md` — prose-carrying adapters, installed by nothing, referenced by the
package `README.md` as manual-paste instructions. The PRD does not mention them. FR-5
promises "one protocol location" and a test that no adapter body restates protocol prose;
that test fails on the day it is written, against files this PRD never planned to touch.
This is the finding with the largest consequence for the design, because it means the
adapter problem is partly a **reconciliation** problem and not only a generation problem.

`load.ts` was asserted wrong. §7 says the loader "runs `deepMerge(DEFAULT_CONFIG, parsed)`
before validation, so a partial `prompts` object arrives carrying default siblings".
Measured: `validateConfig(parsed)` at `load.ts:267` runs on the **raw** parsed object,
`mergeConfig` at 272, then `validateResolvedConfig(merged)` at 273. Both validations exist
and the order is the inverse of what the PRD states. The instruction FR-1 derives from the
false premise — write validation against the merged shape — is half right by accident, and
an implementer following §7 would put the wrong check in the wrong pass.

### 2. Edge Cases & Failure Modes

**A fresh `gate init --prompts` cannot succeed as specified.** The registry declares
**20** tokens (measured two ways: `grep -rho '{{[A-Z_0-9]*}}' prompts/ | sort -u` → 20, and
20 rows in `PLACEHOLDERS.md`). The PRD says 21 in §1, in §7 and in its Changelog. Of those
20, seven map to a `workflow.config.json` field; the rest — `{{ARCHITECTURE_DOC}}`,
`{{TECH_STANDARDS}}`, `{{DOMAIN_CHECKS}}`, `{{PROJECT_SPECIFIC_HARD_RULES}}` and the others
— have no source. FR-3 requires the render to refuse on any surviving token, and FR-4
provides no path by which a fresh scaffold supplies those thirteen values. The first
command an adopter runs therefore fails by design, and the PRD's own User Story 1 asserts
the opposite.

**Activation and `templates.prd` disagree across three sections.** FR-1 makes every other
FR inert when `prompts` is absent from the config. FR-13 says `gate init --practices`
installs the store — but `PACK_MAP` is a static source-to-destination table read by
`planPractices`, and a static table cannot emit a config-dependent render. FR-4 says an
existing config is not rewritten, only reported; §6's Gherkin says "Given a repository
initialised with `--prompts`, When `gate new` runs, Then it reads the rendered template",
which is false for exactly the repositories FR-4 declines to edit. Three statements, three
different contracts.

**Migration and rollback are the weakest dimension and the class inflates it to 20%.**
`gate init` is additive-only by explicit design, so it can detect an obsolete store and
cannot repair one. Nothing specifies regeneration after a package upgrade, whether ledger
exceptions survive a re-render, or how `templates.prd` is rolled back if the store is
removed. The PRD's only migration content is a Non-Goal disclaiming adopter migration,
which is honest about the gap and does not close it.

### 3. Maintainability & DX

Targets and Conflict Surface are incomplete in a way that would fail the lock gate rather
than merely inconvenience a reader. `AGENT_BOOTSTRAP.md` is an FR-11 Target and is absent
from the Conflict Surface; it was excluded on the template's "never declare agent entry
docs" rule, but `sharedAppendOnly` is `['package.json', 'pnpm-lock.yaml', 'README.md',
'CLAUDE.md', 'AGENTS.md']` and **does not contain it**, so the exclusion the rule promises
does not apply and the claim is simply missing. `.github/workflows/ci.yml` (FR-9) and
`_brain/INDEX.md` are likewise unclaimed, and three existing test files the work must
edit — `content-prompts.test.ts`, `content-placeholders.test.ts`, `pack.test.ts` — appear
in §11 or in the pack FRs without appearing in Targets.

### 4. Migration & Rollback

Covered under Edge Cases above; scored 3/10. The deployment-ordering failure mode this
dimension exists to catch is present and unaddressed: the store is written by the installer,
read by agents, and reconciled by a check, and no FR says what happens when those three
disagree after an upgrade rather than after an edit.

### 5. Memory Inputs

The declared set is unusually strong and the reviewer did not find a missing watch overlap.
Eleven records with dispositions, every mandatory watch covered — `_prds/**`,
`AGENT_BOOTSTRAP.md`, `core/run/**`, `cli.ts`, `test/**`, `_brain/adr/**` — and the
`fixture-must-reach-production-shape` disposition was added because `gate check` refused the
document without it, which is the contract working as designed rather than an author's
diligence.

One observation worth recording rather than scoring: `a-rule-corrected-survives-where-it-is-restated`
is declared `applied` and cited as the reason adapters carry no prose — and the document
then reproduced that exact defect six times over its own late corrections. Declaring a
record is not applying it.

---

## Scorecard

Class-conditional weights for `infra`, per `prompts/phase-2-readiness-scorer.md` lines
74-82. Verified against that table before recording.

**Iteration 2** (the current score). Iteration 1's row is kept below it.

| #         | Dimension                | Weight | Score       | Notes                                                                                                            |
| --------- | ------------------------ | ------ | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| 1         | Clarity                  | 15%    | 6.5/10      | The manifest and activation are stated once each; the token grammar and the adapter grammar are named but undefined    |
| 2         | Completeness             | 20%    | 5.5/10      | Render domain not total; four required values cannot affect the output; no ledger for the successor to adopt           |
| 3         | Technical Depth          | 20%    | 6.0/10      | Purity and rule-over-list hold and were verified; substitution semantics and partial-run recovery are unspecified      |
| 4         | Multi-Tenancy & Security | 10%    | 6.5/10      | No tenant surface; realpath containment specified; symlink traversal inside the package is not                         |
| 5         | Scope & Testability      | 15%    | 6.0/10      | Eight FRs is the right size; two acceptance criteria describe inputs the rules make impossible                         |
| 6         | Migration & Rollback     | 20%    | 4.5/10      | Transferred to PRD-030 without an interface: no ledger bootstrap, no partial-run recovery, mixed-version store possible |
| **Total** | **Weighted**             |        | **5.73/10** | **ITERATE**                                                                                                          |

Arithmetic re-derived here: `6.5×.15 + 5.5×.20 + 6.0×.20 + 6.5×.10 + 6.0×.15 + 4.5×.20 = 5.725`.

Hard caps checked: **none tripped.** The method-content cap that iteration 1 tripped is gone
from this document — FR-10 moved to PRD-031, which makes the owner-approved snapshot addendum
its own precondition FR, and this PRD now targets no file under
`packages/provegate/prompts/`. No runtime dependency added; no remote-push path added. Lint
cap: not tripped — `lintPrd` returned `{ ok: true, issues: [] }` by direct invocation, the CLI
wrapper again refused by sandbox `EPERM` on the state write.

<details><summary>Iteration 1 scorecard (4.48)</summary>

| #         | Dimension                | Weight | Score       | Notes                                                                                                       |
| --------- | ------------------------ | ------ | ----------- | ------------------------------------------------------------------------------------------------------------- |
| 1         | Clarity                  | 15%    | 5.5/10      | Problem statement and evidence are precise; the specification contradicts itself on what is rendered          |
| 2         | Completeness             | 20%    | 4.5/10      | Thirteen non-config placeholders have no source; the existing `adapters/` directory is unaccounted for        |
| 3         | Technical Depth          | 20%    | 5.0/10      | The purity-and-recompute design holds; the `load.ts` premise is false and the activation contract is threefold |
| 4         | Multi-Tenancy & Security | 10%    | 7.0/10      | No tenant surface; containment is specified with realpath on both sides, which is the historical hole         |
| 5         | Scope & Testability      | 15%    | 3.0/10      | Thirteen FRs across six subsystems; the split is pre-drawn as a contingency and should be taken now           |
| 6         | Migration & Rollback     | 20%    | 3.0/10      | Regeneration, exception survival and `templates.prd` rollback all unspecified                                 |
| **Total** | **Weighted**             |        | **4.48/10** | **ITERATE**                                                                                                 |

Hard cap tripped: method content not traceable to the source snapshot.
`source-snapshot/prompts/phase-3-task-generator.md:80` states the autonomy exception
**unconditionally**, so the then-FR-10 made conditional a rule the snapshot does not
condition. Measured while checking it and worth keeping: our shipped copy of that line
**drops** the snapshot's parenthetical `(single-session test runs, agent-led sweeps)` — a
pre-existing divergence found by a diff neither side was running for it. Both are PRD-031's
now.

</details>

---

## Missing Pieces (to reach 10/10)

Iteration 2's watch items. W1–W8 below them are iteration 1's, retained for the record;
W1 is taken, the rest are closed or transferred as the closure audit states.

1. **W9 — Make the render domain total, collision-free and symlink-safe.** The rule covers
   `*.md` and `*-template.md` and leaves every other package file undisposed while claiming
   totality. Nested templates flatten to a basename and can collide in the returned map;
   case-only collisions land on a case-insensitive filesystem. Symlink traversal is
   unspecified — following one reads outside the shipped tree, skipping one breaks totality.
   And §6's "a `*.md` matching no rule fails" describes an input the wildcard makes
   impossible; the pinning test is right, the criterion states the wrong reason.
2. **W10 — Give the token scan a grammar.** `{{TO\nKEN}}` evades a `{{TOKEN}}` refusal. A
   registered token shown literally in documentation or a fenced example is substituted with
   no escape syntax. A configured value that itself contains `{{OTHER}}` is then read as
   unresolved, and replacement order is undefined when one value contains another token.
   Scan source tokens before substituting, substitute each occurrence once with an opaque
   value, and separate malformed, undeclared and unresolved into three diagnostics.
3. **W11 — Require values from the render inputs, not from the global registry.** Verified
   here: `{{LINK_TO_VISION_DOC}}`, `{{ONE_LINE_PRODUCT_FRAMING}}`,
   `{{PROJECT_SPECIFIC_HARD_RULES}}` and `{{VISION_OR_DECISIONS_DOC}}` occur in **zero**
   files FR-2 renders — only in `practices/templates/AGENT_BOOTSTRAP.template.md`. FR-4 makes
   all thirteen mandatory, so four sentinels must be replaced with values that cannot change
   one byte of the store. Also: a sentinel derived from the registry's mutable Meaning prose
   stops matching when that prose is edited, and the stale text then reads as real content.
   Use a stable sentinel encoding.
4. **W12 — Specify the activation state machine and partial-run recovery.** "The store
   exists iff the config declares `prompts`" is false in the state FR-5 itself creates —
   config written, store refused — and false again after `prompts` is removed while the tree
   remains. `wx` makes each write non-destructive; it does not make a multi-file render
   atomic. A run that fails midway and a re-run under a newer package version produce a
   mixed-version store, because the already-written files are skipped. Pin one package
   version per plan, preflight every destination, and name the four states:
   configured-unresolved, configured-complete, configured-incomplete, unconfigured-orphaned.
5. **W13 — Replace the pointer predicate with an adapter grammar.** "No adapter line appears
   verbatim in a protocol except a path" proves neither direction: exempt any line containing
   a path and arbitrary prose rides along on it; exempt only bare paths and legitimate
   pointer sentences and Cursor table rows are refused; and novel duplicated prose passes
   because it appears nowhere verbatim. Specify what an adapter may contain — frontmatter
   fields, table columns, path syntax, one bounded directive — and validate that.
6. **W14 — Reconcile the banner with `.mdc` frontmatter.** Verified here: every
   `.cursor/rules/*.mdc` in this repository and in the source snapshot opens with `---` on
   line 1. FR-3 requires a banner on every emitted file and FR-6 requires frontmatter; a
   banner above it moves the frontmatter off line 1 and the rule may not attach. Either the
   banner has a frontmatter-safe location or the adapter is exempt and User Story 2's
   criterion is false as written.
7. **W15 — Give PRD-030 a ledger to adopt.** PRD-030 reconciles against a ledger recording
   the version and hashes that produced the store; PRD-029 creates no ledger. Either PRD-029
   writes it, or PRD-030 specifies a bootstrap for a ledgerless store. PRD-030's totality
   argument also covers `prompts.dir` while the generated adapters live outside it, so their
   missing/diverged/orphan semantics are undefined.
8. **W16 — Resolve the successor coupling before claiming parallelism.** PRD-031 gives
   `{{AUTONOMY_MODE}}` two legal values that must select whole text blocks, while forbidding
   any renderer change and relying on PRD-029's literal scalar substitution — conditional
   expansion is not substitution, and putting the block text in `prompts.values` puts method
   content in an adopter's config, which is the provenance rule failing from the other side.
   PRD-032 hardcodes thirteen values and PRD-031 adds a fourteenth, so landing order changes
   PRD-032's config and generated bytes.
9. **W17 — Bring `_brain/INDEX.md` under a valid contract.** It is a required Durable
   Artifact write, it is outside the Conflict Surface by a judgement recorded in §7, and it
   is not in `workflow.config.json` `sharedAppendOnly`. An implementer must therefore either
   break the PRD's own DO NOT or stop for an out-of-scope write. Claim it, or make it
   mechanically shared-append-only.

---

## Iteration 1 watch items (retained)

1. **W1 — Take the split now rather than holding it.** Five of the six confirmed internal
   contradictions exist because one document states one rule in six places. Proposed
   boundary: FR-1 through FR-6 plus FR-13 stay as the delivery core; FR-7/8/9 (ledger,
   doctor, wiring) become an integrity-and-upgrade item; FR-10/11 become a
   provenance-backed method-policy item; FR-12 (dogfood) follows the core. Each successor
   rewrites its own Goals, Conflict Surface and §11 rather than inheriting them.
2. **W2 — Write an exact source-to-destination render manifest** and reconcile every count
   and restatement against it: §1, §4 FR-2, §6, §7, §11 and the Changelog. State whether
   `PLACEHOLDERS.md`, `README.md` and `adapters/` are rendered, and if not, why a reader
   who finds them in the package will not expect them in the store.
3. **W3 — Give every non-config placeholder a source at scaffold time** and prove it
   through the real CLI path, not through the render function. Thirteen tokens have no
   supplier today and FR-3 turns each into a hard failure.
4. **W4 — Define one activation contract.** `--prompts` versus `--practices`, what a static
   `PACK_MAP` can and cannot emit, and what `templates.prd` does for a repository whose
   config already exists. One statement, restated nowhere.
5. **W5 — Reconcile `packages/provegate/prompts/adapters/` and the package `README.md`.**
   Either they become generated pointers, or they are deleted, or the "one protocol
   location" claim is narrowed to say what it excludes. FR-5's test cannot pass otherwise.
6. **W6 — Obtain method provenance for FR-10 or remove it.** An owner-approved, dated
   addendum listed in the source-snapshot manifest, or the FR goes. The same applies to
   FR-11's edit to the shipped `AGENT_BOOTSTRAP.template.md` if its wording is not
   traceable.
7. **W7 — Correct the `load.ts` validation ordering in §7** and complete Targets and
   Conflict Surface: `AGENT_BOOTSTRAP.md` (not covered by `sharedAppendOnly`),
   `.github/workflows/ci.yml`, `_brain/INDEX.md`, `content-prompts.test.ts`,
   `content-placeholders.test.ts`, `pack.test.ts`.
8. **W8 — Specify regeneration, upgrade, exception preservation and rollback.** The 20%
   dimension has no content today beyond a Non-Goal.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ---------- | ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2026-07-27 | 4.48  | ITERATE | **First independent round; eight [P1]s, none rejected on re-verification.** Six are the document disagreeing with itself: the placeholder registry holds **20** tokens where the PRD says 21 in three places; `prompts/` holds 14 Markdown files where FR-2 says "all ten … including `PLACEHOLDERS.md`" and §11 says "all ten protocols"; activation is inert-without-config in FR-1, installed-by-`--practices` in FR-13, and unconditional in §6's Gherkin; `templates.prd` is rewired in FR-4 for new configs only and promised universally in §6. Two are not: **`packages/provegate/prompts/adapters/` already ships `codex-starter.md` and `cursor-bootstrap.md`**, prose-carrying and referenced by the package README as manual-paste instructions, so FR-5's "no adapter restates protocol prose" test fails against files the PRD never planned to touch; and **FR-10 trips the method-content hard cap** — `source-snapshot/prompts/phase-3-task-generator.md:80` states the autonomy exception unconditionally, so conditioning it is a method change that reading the snapshot does not authorize. Also: §7's `load.ts` premise is inverted (`validateConfig(parsed)` at 267 precedes `mergeConfig` at 272), and `AGENT_BOOTSTRAP.md` is an FR-11 Target absent from the Conflict Surface on a `sharedAppendOnly` exclusion that does not list it. Confirmed and left standing: the purity-and-recompute design, the pointer-only adapter rule, the realpath-both-sides containment, and the Memory Inputs set, which covers every watch overlap |

| 2   | 2026-07-27 | 5.73  | ITERATE | **The split landed and the class of finding changed. Up 1.25.** Every rewritten factual claim verified against source — 20 registry rows with 7 mapped and 13 unmapped, 12 rendered protocols, 7 templates, the README's "tool-shaped entry points", the loader at 267/272/273, the `new.ts:170` fallback, literal `{{TOKEN}}` in the registry's own cells. **Not one of the eight [P1]s is an internal contradiction**, which is what the split was for. Two are the rewrite's own overshoot, and both are the same error: a rule derived from the wrong source. **FR-4 derives the required value set from the registry instead of from what FR-2 renders** — `{{LINK_TO_VISION_DOC}}`, `{{ONE_LINE_PRODUCT_FRAMING}}`, `{{PROJECT_SPECIFIC_HARD_RULES}}` and `{{VISION_OR_DECISIONS_DOC}}` occur in zero rendered files and only in `practices/templates/AGENT_BOOTSTRAP.template.md`, so four sentinels must be answered with values that cannot change a byte of the store. **FR-3's mandatory banner collides with FR-6's `.mdc` frontmatter**, which every `.cursor/rules/*.mdc` here and in the snapshot opens with on line 1. Five more are specification depth the previous size hid: the render domain is not total for non-Markdown files, nested-template basename collisions or symlinks; the token scan has no grammar, so a line-broken token evades it and a documented literal is substituted; the activation invariant is false in the state FR-5 itself creates and `wx` does not make a multi-file render atomic; and the pointer predicate proves neither direction, refusing legitimate Cursor table rows or admitting prose that rides on a path line. **Three are the successors failing to compose**: PRD-030 reconciles against a ledger PRD-029 never creates, its totality argument omits the adapters that live outside `prompts.dir`, and PRD-031's two-mode rendering needs conditional expansion that scalar `prompts.values` substitution cannot provide — so 030 and 031 are not parallelizable as written, and PRD-032's thirteen hardcoded values become fourteen depending on landing order. Also confirmed: `_brain/INDEX.md` is a required durable write outside both the Conflict Surface and `sharedAppendOnly`, so §7's recorded judgement leaves an implementer with no lawful path. Memory contract clean — no watch overlap missing — with a [P2] that several dispositions are ceremonial, the sharpest being that `a-rule-corrected-survives-where-it-is-restated` is declared applied while activation is restated in five places |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Verdict

**ITERATE — 5.73/10, iteration 2, scored independently by Codex.**

The split worked and the score says so, but the more useful signal is that **the class of
finding changed.** Iteration 1's eight were the document disagreeing with itself; iteration
2's eight are the document underspecifying the world. Not one is an internal contradiction,
and every factual claim the rewrite makes was verified against source. That is what W1 was
supposed to buy and it bought it.

What remains splits three ways, and only the first is ordinary spec work.

**Five are depth the previous size hid.** A render rule that claims totality and covers only
two glob shapes. A token scan with no grammar, so a line-broken token evades it and a
documented literal is consumed. An activation invariant that is false in the very state its
own FR creates. `wx` treated as if it made a multi-file render atomic. A pointer predicate
that cannot be written to accept legitimate Cursor table rows and reject prose riding on a
path line. Each is answerable inside this document.

**Two are my own overshoot, and they share one root: a rule derived from the wrong source.**
The required value set comes from the registry rather than from what the render actually
consumes, so four tokens that exist only in `practices/templates/AGENT_BOOTSTRAP.template.md`
become refusals an adopter cannot satisfy meaningfully. And a banner required on *every*
emitted file collides with frontmatter that must be on line 1. Both were added as
hardening in the iteration-1 remediation. `strictness-added-during-extraction-is-a-behavior-change`
is declared `applied` in this PRD's Memory Inputs and did not catch either — which is the
second consecutive round in which a record this document declares was not applied to the
document's own new rules.

**Three are the successor interfaces, and they are the ones that change the plan.** PRD-030
reconciles against a ledger PRD-029 never creates. PRD-031's two-mode rendering needs
conditional expansion, and the design that made it "text-only and parallel to PRD-030" rests
on scalar substitution that cannot express it — putting the block text into `prompts.values`
would put method content in an adopter's config, which fails provenance from the other side.
PRD-032's thirteen hardcoded values become fourteen depending on landing order. **The claim
that 030 and 031 are parallelizable does not hold**, and fixing it is a design decision
about where conditional rendering lives, not a wording change.

W15, W16 and W17 therefore bind the successors as much as this document, and the next
revision should settle the ledger interface and the conditional-rendering question before
re-scoring — otherwise iteration 3 will find the same three coupling defects wearing
different clothes.
