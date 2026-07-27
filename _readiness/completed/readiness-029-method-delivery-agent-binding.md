# Readiness Assessment: PRD-029 — Method Delivery, Agent Protocol Binding

> # ✅ PASS — 8.35/10, iteration 8
>
> **PRD-029 has no open finding. The reviewer could not fault it, and said so plainly rather
> than manufacturing a ninth round.** All seven edits landed; six closed clean and the seventh
> landed correctly while surfacing one inconsistency **in the successor documents, not here**.
> Codex scored **8.85 PASS** independently and found the same single issue without being told
> what the other had found. Band action for 8–8.9: *"Solid — proceed with minor notes flagged
> as watch items."*
>
> **Trajectory: 4.48 → 5.73 → 5.90 → 5.63 → 4.53 → 6.03 → 7.48 → 8.35.** The turn was the
> scope cut at iteration 6. What moved it afterwards was not new design — it was **sweeping
> the same rule everywhere it is restated, three rounds running.**
>
> **Two scoring adjustments the reviewer disclosed and asked to be audited on, both audited
> here and both upheld.** Its first pass came to 7.95 — below the line — and it raised two
> dimensions on re-reading the rubric. Migration & Rollback 7.0 → 8.0: the dimension asks
> *"Backward compatibility, deployment strategy, undo plan?"* (`phase-2-readiness-scorer.md:110`,
> verified), and it had been deducting for automated staleness detection, which the rubric does
> not ask about. **That correction runs against its own ceiling, stated at iteration 6 and held
> at iteration 7, rather than toward a nicer number.** Completeness 8.0 → 8.5 removed a
> double-count of the same residual across two dimensions. It also declined to follow Codex's
> Migration score of 9.0, noting that is Codex's third position on that dimension in three
> rounds and each move has been toward its own total.
>
> **Watch items on the PASS, neither blocking:** the `_brain/INDEX.md` claim added at iteration
> 7 now makes the path-conflict gate refuse PRD-030 and PRD-031 together — correct — while both
> still assert parallelism in six sentences (PRD-031 `:267`, `:279`, `:319`, verified). One
> config line in `sharedAppendOnly` fixes six sentences and keeps the claim true, which is what
> iteration 2's W17 actually offered as its second option. And
> `_docs/design/prompt-store-state-model.md` still does not exist, with PRD-030's FR-1 verifying
> only that a file is present in Phase 5 — fine while PRD-030 is a declared sketch, not fine the
> moment its FR-2–FR-7 are rewritten from the model.
>
> <details><summary>Iteration 7 (7.48 ITERATE)</summary>
>
> **Iteration 7 (confirmation round, independent session + Codex) — 7.48/10, ITERATE. Six of
> eight items closed, and the substantive change is that **no design decision remains in
> PRD-029**.** Iteration 6 left one open — what authority defines the legal `prompts.values`
> key set — and the answer taken (move the unknown-key check out of the raw pass into the
> render, because the legal set is package Markdown the loader must not read, and a TypeScript
> constant would break the promise keeping PRD-031 parallel to PRD-030) was judged correct.
> Codex scored **7.95** independently; both ITERATE, both in the 6–7.9 band, converging on the
> same two open items without being told what the other had found.
>
> **Both remaining [P1]s were the same class, and it is this chain's signature defect:** a rule
> corrected where it is owned and left standing where it is restated. The unknown-key check was
> moved in FR-1 and FR-3 and still sent an implementer to the config layer from §6 and from the
> §11 FR-1 row — which would have put the test in the wrong file. "Writes nothing" was right in
> User Story 1, FR-5 and one §6 criterion, and stale in a second §6 criterion **twelve lines
> away** and in a Memory Input rationale. The reviewer named the aggravating fact precisely:
> **this one was not the line-break class — `grep "store file"` finds both in one command, so
> the sweep was simply not run** — which made the previous Changelog's claim that the rule was
> "stated identically in all three places" false about the document containing it.
>
> The [P2]s were carried or cross-document: PRD-030's non-binding banner was scoped to §4 while
> the removed design is restated in §2, §6, §7 and §11 — the pattern applied to the fix for the
> pattern; PRD-031 still claimed a token becomes required "from the moment this PRD lands",
> true only while an upgrade path existed; and `_brain/INDEX.md`, raised at iteration 5 and
> carried three rounds, is a Durable Artifact of PRD-030 and PRD-031 and declared by neither,
> so the path-conflict gate cannot see a collision two parallel agents would have.
>
> **First round in seven in which every code citation the document makes checked out.** Item 6
> was verified to the byte: the stated `globs` algorithm reproduces
> `source-snapshot/rules/prd-workflow.mdc:3` exactly, order and `, ` join included. The
> reviewer **rejected one Codex finding** — that a dated Changelog row contradicts a newer one
> — on this repository's own settled position, `verify-doc-claims.mjs` deliberately excluding
> historical log sections because *"rewriting history to satisfy a linter is the wrong
> direction"*; it noted Codex had taken that position a round earlier and reversed without new
> evidence. It also declined to follow Codex's Migration & Rollback score from 6.0 to 9.0 on
> one fix, holding its own stated ceiling rather than adjusting it to reach a nicer total.
>
> </details>
>
> <details><summary>Iteration 6 (6.03 ITERATE)</summary>
>
> **Iteration 6 (Codex via the independent session, own brief) — 6.03/10, ITERATE. The first
> round in six to leave the 4–5.9 band, which changes the prescribed action from "return to
> Phase 1" to "iterate on identified gaps, re-score".** The scope cut worked. The reviewer said
> so plainly and without softening: the lifecycle is genuinely gone from PRD-029, the
> activation fix is correct **and correctly justified** against `defaults.ts:95-101`, discovery
> without a write closes the finding that broke PRD-032's derivation, the build-time claims are
> fully swept from this document, the Conflict Surface is complete for the first time, and **no
> §11 note inverts its FR this round** — all seven read against their FR bodies.
>
> **The one defect that mattered was at the seam the cut left behind, not in what it removed.**
> FR-6 puts two of three adapter destinations **outside** `<dir>` — `.claude/commands/prd-*.md`
> and `.cursor/rules/prd-workflow.mdc` — while the reinstall instruction, stated in five
> places, named only the store directory. Follow it after an upgrade and those files hit `wx`,
> are reported skipped, and stay at the previous version with stale banners and stale store
> paths while the adopter believes they have reinstalled. Verified against the executor:
> `initWorkspace` writes sequentially with `wx` and never deletes (`init.ts:248-283`). **It is
> the one procedure the entire scope decision rests on**, and nothing tested it.
>
> One genuine design item: `prompts.values` asked the raw validation pass for a shape it cannot
> express — `stringRecord` rejects any value that is not a string **or is empty**
> (`validate.ts:149-155`), which is exactly the `null` and `""` FR-4 declares legal — and for
> an authority it does not have, since the legal key set is package Markdown. A TypeScript
> constant would have made PRD-031 unable to add its token without a code edit its own
> Non-Goals forbid.
>
> The rest are specification: `validateResolvedConfig` takes no repository root so containment
> cannot live there and `load.ts` had dropped out of Targets; the `globs` derivation was named
> but never given; "writing nothing" and "no store file" disagreed across three places, leaving
> a refused run's residue undefined and, under `wx`, permanent. Cross-document, PRD-031's three
> references to the enumerated-token mechanism still said FR-6 after the renumber, its
> "fails at build time" claim survived a grep sweep **because it is split across a line break**,
> and PRD-032 carried an FR-5/FR-4 pair two lines apart in one sentence — the sixth instance of
> `a-rule-corrected-survives-where-it-is-restated`, created by the fix for the fifth.
>
> The reviewer also **rejected one Codex "what holds"** — that PRD-030 and PRD-031 have disjoint
> surfaces — because both write `_brain/INDEX.md` in Durable Artifacts and **neither declares
> it**, so the conflict gate cannot see the collision. That remains open. It downgraded one
> Codex [P1] with executor evidence, corrected two of its line cites, and disagreed with its
> Migration score with a stated reason; the two scores were 6.03 and 5.45, straddling a band
> boundary, which it flagged rather than buried.
>
> </details>
>
> <details><summary>Iteration 5 (4.53 ITERATE)</summary>
>
> **Iteration 5 (Codex via an independent Claude session that wrote its own brief) — 4.53/10,
> ITERATE. The lowest score of the five, and the round found the thing four rounds of aimed
> briefs could not: the scoring protocol has been prescribing the remedy since round one and
> nobody read the table.** `prompts/phase-2-readiness-scorer.md` §Score Interpretation gives
> **4–5.9 → "Major rework needed. Return to Phase 1."** and 6–7.9 → "iterate and re-score".
> The five scores are 4.48, 5.73, 5.90, 5.63, 4.53. **Every one is in the 4–5.9 band; not one
> has ever been in 6–7.9.** Five rounds applied the wrong band's action. The flat trajectory
> was never noise about the document — it was the process running the wrong instruction.
>
> This round was commissioned differently on purpose: a separate session chose its own angles,
> because four rounds of increasingly targeted briefs were written by the session that also
> authored every remediation between them. It aimed at the *adopter lifecycle traced
> mechanically*, at stale copies of the **newest** fix rather than the old counts, and at
> codebase claims no round had touched — and it deliberately did not re-check the token
> registry, the file inventory or the loader ordering, which it confirmed are settled.
>
> **Six findings are the mechanism, and together they say the tool installs once and can never
> be run again against the same repository.** The upgrade path does not terminate: after an
> upgrade every rendered file differs, so deleting one and re-running `init` fails preflight on
> the rest, and selective application is impossible. An excepted edit **permanently blocks
> `init`**, because nothing tells `init` an exception exists and PRD-029 forbids itself an
> exceptions store. The **receipt's own participation in preflight is unspecified and both
> readings break** — as a destination it blocks `init` forever, as a non-destination `init`
> overwrites an existing file, and PRD-030 already picks the second horn in writing. **An
> existing repository can never be activated**, because `init` never edits an existing config,
> which also breaks PRD-032's prescribed method for deriving its own value set. And
> **presence-based activation does not survive the loader**: `mergeConfig` deep-merges defaults,
> so once `prompts` has defaults `merged.prompts` is always present and the `unconfigured`
> state is unreachable — the mechanism this codebase **deliberately rejected for `memory`**,
> with the rationale written at `defaults.ts:95-101` and never mentioned in the PRD.
>
> **PRD-030 carries nine live restatements of the design iteration 4 removed**, including the
> exact FR-1-versus-FR-5 contradiction iteration 3 blocked on, surviving two remediations that
> each claimed to close it — and a §11 verification row asserting the opposite of the FR it
> verifies. The successors are where the mechanism now lives and they have never been scored.
>
> Verified and closed, recorded so a later round does not re-spend on them: FR-2's corpus
> measurement is exact, FR-5's 16/7/9 arithmetic is exact, the loader ordering is correct, the
> containment reference is real, `{{!NAME}}` is now reachable, the five-versus-six state defect
> is closed, both control files are excluded from the orphan rule, and the method-content cap
> is **not** tripped — the registry is an extraction artifact absent from the snapshot, so the
> new columns are not snapshot-traceable content. Lint green on all four by direct `lintPrd`.
>
> </details>
>
> <details><summary>Iteration 4 (5.63 ITERATE)</summary>
>
> **Iteration 4 (Codex, independent) — 5.63/10, ITERATE. The first decline, and the round
> answered the question the brief was built around: the structural blocker did not lift.
> Ownership returned as hash-qualified membership.** The counterexample is concrete and rated
> `routine`: a user writes `.claude/commands/prd-3.md` themselves, byte-identical to version
> 1's render, because they want that command pinned. `init` no-ops and **records the path**.
> After an upgrade, `sync` sees bytes matching the receipt hash and overwrites with version 2.
> The tool never wrote the original file — and an identical file *absent* from the receipt
> would not be eligible, so **path membership supplies the capability and hash equality merely
> exercises it.** That is the thing FR-8 says no command may do. The "I can reproduce these
> bytes, so replacing them loses nothing" argument fails three ways: the current package
> reproduces the *new* bytes, the receipt stores a hash and not the old content, and equality
> proves no change since a baseline — never consent.
>
> Three more are structural and all rated `routine`. **`sync` cannot truthfully rewrite the
> receipt**: it leaves excepted and diverged files untouched and then writes the whole receipt
> from the new plan, so the file records a hash the path does not hold. Either the receipt
> means "these bytes were present" and sync lies, or it means "these are expected bytes" and
> PRD-029's definition is wrong; an implementer must choose. **`retired` still has no durable
> home** — reported once, then erased by the next receipt write, invisible thereafter outside
> `prompts.dir` and reclassified as a *failing* tree orphan inside it. And the two-file model
> has **no complete invariant**: `prompts-exceptions.json` sits under `prompts.dir`, is
> neither a plan path nor a receipt entry, and is therefore a tree orphan unless excluded.
>
> Four self-contradictions introduced by this round's own remediation, every one verified here.
> **`{{!NAME}}` is not a token candidate under the candidate rule written five lines above it**
> — `!` is not an uppercase letter — so the escape is unreachable by its own grammar.
> **Fragment terminality "at build time" is unwired**: the package's `build` script is only
> `tsup`, and `gate-wire-or-delete` is declared `applied` in the same document. PRD-030 says
> "a sixth classification" at line 170 and "the five per-path states" at line 458. PRD-032
> still says the render refuses on a sentinel after the switch to `null`.
>
> **`a-record-declared-is-not-a-record-applied` was declared as a Memory Output by this
> revision and was not applied to it** — the reviewer names four pieces of evidence and
> observes that declaring the learning reproduced the failure it describes. Fourth consecutive
> instance, now self-referential.
>
> **The trajectory is the verdict.** 4.48 → 5.73 → 5.90 → **5.63**: local counterexample repair
> around a protected conclusion, with contradictions migrating into the successor interfaces
> that are not being scored. The reviewer's instruction is explicit — **another ordinary
> wording round is not the right instrument.** Pause readiness; make an owner decision on what
> grants overwrite authority; write that model independently of these four documents; re-enter
> readiness afterwards.
>
> </details>
>
> <details><summary>Iteration 3 (5.90 ITERATE)</summary>
>
> **Iteration 3 (Codex, independent) — 5.90/10, ITERATE. Up 0.17, and the number is the
> least useful thing this round produced.** Asked for a decision rather than a list, it
> answered: **the document is not implementable and the blocker is structural, not another
> missing sentence.** Decision 1 — the one this session recommended and the owner approved —
> is the problem. A single ledger is being asked to be four things at once: a receipt of what
> was rendered, a manifest of which paths the tool owns, the scope definition for PRD-030's
> reconciliation, and the migration state across adapter and directory changes. It is also
> split between two writers by field-level prose, and **that split already contradicts
> itself**: PRD-030 FR-1 calls `packageVersion` and `generated` read-never-rewritten while
> its FR-5 has sync rewrite the ledger on success, which an upgrade necessarily does. The
> reviewer's own words: another wording-only remediation round will not fix it.
> **Five of the seven new watch items are labelled DESIGN, not wording.**
>
> The round also caught four stale facts, every one verified here. `AGENT_BOOTSTRAP.md` has
> **ten** stop-and-ask checkpoints; "nine" appears in PRD-029, PRD-031 and on the board. The
> `{{!NAME}}` escape is justified in FR-4 as something "the shipped corpus does" — `grep`
> finds **zero** `{{!` in any shipped file, and the one document that discusses tokens is
> verbatim-exempt. The required-value count is **nine**, not thirteen: 20 registry rows minus
> seven config-backed minus four that appear in no rendered file. And **PRD-032 still says
> "thirteen" in three live places** after a changelog entry claiming the count was removed —
> the third consecutive round in which `a-rule-corrected-survives-where-it-is-restated` is
> declared `applied` and then reproduced by the same session.
>
> </details>
>
> <details><summary>Iteration 2 (5.73 ITERATE)</summary>
>
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
> </details>
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
| Score                  | 8.35/10                                                                                                                                                                                                                                                                                                  |
| Verdict                | **PASS** — 8.35, no open finding in PRD-029. Two watch items, both in the successors: PRD-030 and PRD-031 declare an `_brain/INDEX.md` overlap while asserting parallelism in six sentences, and PRD-030's state-model precondition verifies only file presence. Neither blocks this item, which is a hard prerequisite of both and serializes ahead of them regardless |
| Iteration              | 8                                                                                                                                                                                                                                                                                                        |
| Model Tier (Execution) | high                                                                                                                                                                                                                                                                                |
| Model Tier (Audit)     | high — the Phase 6 reviewer must not be the implementing session                                                                                                                                                                                                                                                                                         |
| Scored by              | **Codex (gpt-5.x), commissioned by a separate Claude session that wrote its own brief — independent in model family AND in framing; neither authored the PRD**                                                                                                                                                                                                  |
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

**Iteration 8** (the current score — PASS). Earlier rows are kept below it.

| #         | Dimension                | Weight | Score       | Contribution |
| --------- | ------------------------ | ------ | ----------- | ------------ |
| 1         | Clarity                  | 15%    | 8.5/10      | 1.275        |
| 2         | Completeness             | 20%    | 8.5/10      | 1.700        |
| 3         | Technical Depth          | 20%    | 8.5/10      | 1.700        |
| 4         | Multi-Tenancy & Security | 10%    | 8.0/10      | 0.800        |
| 5         | Scope & Testability      | 15%    | 8.5/10      | 1.275        |
| 6         | Migration & Rollback     | 20%    | 8.0/10      | 1.600        |
| **Total** | **Weighted**             |        | **8.35/10** | **PASS**     |

Arithmetic re-derived here: `8.5×.15 + 8.5×.20 + 8.5×.20 + 8.0×.10 + 8.5×.15 + 8.0×.20 = 8.350`.
Codex scored 8.85 PASS independently. Band 8–8.9: *"Solid — proceed with minor notes flagged as
watch items."*

Hard caps checked: **none tripped.** Security — `test/config.test.ts` named, and its escaping-dir
and symlinked-root cases genuinely exercise the containment surface FR-1 adds. Contract — no
client-to-server payload. Lint — `lintPrd` `{ ok: true, issues: [] }` on all four PRDs by direct
invocation. Method content, runtime dependency, remote push: none.

<details><summary>Iteration 7 scorecard (7.48)</summary>

**Iteration 7.**

| #         | Dimension                | Weight | Score       | Movement from 6.03                                                                                          |
| --------- | ------------------------ | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| 1         | Clarity                  | 15%    | 7.0/10      | +0.5 — destinations, globs and the reinstall unit exact; two contradictions land in §6 and §11, what an implementer reads |
| 2         | Completeness             | 20%    | 7.5/10      | +2.0 — both iteration-6 blockers answered with real decisions; nothing missing now, two things misstated       |
| 3         | Technical Depth          | 20%    | 8.0/10      | +2.0 — the values seam identifies the layering constraint and rejects the alternative with a named consequence  |
| 4         | Multi-Tenancy & Security | 10%    | 8.0/10      | unchanged                                                                                                     |
| 5         | Scope & Testability      | 15%    | 7.5/10      | +0.5 — a §11 row that would have caught iteration 6's [P1]; one row of eight still specified the wrong layer   |
| 6         | Migration & Rollback     | 20%    | 7.0/10      | +2.5 — the manual procedure is correct, complete, printed at runtime and machine-checked                       |
| **Total** | **Weighted**             |        | **7.48/10** | **6.03 → 7.48**                                                                                              |

Arithmetic re-derived here: `7.0×.15 + 7.5×.20 + 8.0×.20 + 8.0×.10 + 7.5×.15 + 7.0×.20 = 7.475`.
Codex scored 7.95. The reviewer declined to follow it on Migration & Rollback (9.0 against its
own 7.0) on the ground that it had called 6.0 the honest ceiling for this class one round
earlier and moved to 9.0 on a single fix.

Hard caps checked: **none tripped.** Lint green by direct `lintPrd` on all four.

</details>

<details><summary>Iteration 6 scorecard (6.03)</summary>

**Iteration 6.**

| #         | Dimension                | Weight | Score       | Notes                                                                                                              |
| --------- | ------------------------ | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1         | Clarity                  | 15%    | 6.5/10      | Every FR has Targets and a §11 row; adapter destinations named for the first time. Three places an implementer must guess |
| 2         | Completeness             | 20%    | 5.5/10      | Activation, discovery, destinations, empty-string policy specified; the reinstall procedure is incomplete wherever it appears |
| 3         | Technical Depth          | 20%    | 6.0/10      | Activation fix exactly right and cites its precedent; dropping preflight also solved partial-run recovery. Two code claims wrong |
| 4         | Multi-Tenancy & Security | 10%    | 8.0/10      | No tenant surface; containment reused correctly; symlinks refused; deny test real; the entrypoint narrowing is confined      |
| 5         | Scope & Testability      | 15%    | 7.0/10      | Seven FRs right-sized, Conflict Surface complete, no §11 inversions. Nothing tests the reinstall or the destination set     |
| 6         | Migration & Rollback     | 20%    | 4.5/10      | Backward compatibility excellent and machine-tested; the only migration content is the manual procedure, which is incorrect  |
| **Total** | **Weighted**             |        | **6.03/10** | **ITERATE — band action: iterate on identified gaps, re-score**                                                          |

Arithmetic re-derived here: `6.5×.15 + 5.5×.20 + 6.0×.20 + 8.0×.10 + 7.0×.15 + 4.5×.20 = 6.025`.
Codex independently scored 5.45; the gap is Migration & Rollback alone (3.0 against 4.5), and it
straddles a band boundary, which the reviewer flagged rather than buried.

Hard caps checked: **none tripped.** Lint green by direct `lintPrd` on all four PRDs.

</details>

<details><summary>Iteration 5 scorecard (4.53)</summary>

**Iteration 5.**

| #         | Dimension                | Weight | Score       | Notes                                                                                                              |
| --------- | ------------------------ | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1         | Clarity                  | 15%    | 5.5/10      | Lint-green and well-targeted, but §6 and §11 specify a build boundary FR-6 itself disproves; adapter destinations unstated |
| 2         | Completeness             | 20%    | 3.5/10      | No activation surviving the loader, no path from an existing config, no terminating upgrade, no init/exception interaction |
| 3         | Technical Depth          | 20%    | 5.0/10      | Purity, token grammar and dispositions are strong and exactly measured; the no-overwrite decision was never traced through |
| 4         | Multi-Tenancy & Security | 10%    | 7.5/10      | No tenant surface; containment reuses the real prefix-resolving behaviour; symlink refused; the deny test is real         |
| 5         | Scope & Testability      | 15%    | 5.0/10      | Ten FRs is right; FR-6's row verifies a boundary that does not exist and three successor rows cannot discriminate         |
| 6         | Migration & Rollback     | 20%    | 2.5/10      | The dimension `infra` inflates for exactly this: upgrade does not terminate, rename bricks `init`, 031→032 leaves an orphan |
| **Total** | **Weighted**             |        | **4.53/10** | **ITERATE — band action: return to Phase 1**                                                                            |

Arithmetic re-derived here: `5.5×.15 + 3.5×.20 + 5.0×.20 + 7.5×.10 + 5.0×.15 + 2.5×.20 = 4.525`.
Codex independently scored 4.33 — same band, same verdict.

Hard caps checked: **none tripped.** Lint green by direct `lintPrd` on all four PRDs.
Method content checked against the snapshot: `PLACEHOLDERS.md` is absent from
`source-snapshot/prompts/` and unmentioned in its `MANIFEST.md`, so the registry is an
extraction artifact and its new columns are not snapshot-traceable content.

</details>

<details><summary>Iteration 4 scorecard (5.63)</summary>

**Iteration 4.**

| #         | Dimension                | Weight | Score       | Notes                                                                                                          |
| --------- | ------------------------ | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| 1         | Clarity                  | 15%    | 7.0/10      | Each rule stated once; four self-contradictions introduced by this round's own remediation                          |
| 2         | Completeness             | 20%    | 5.5/10      | No schema version, no empty-value policy, no unknown-key policy, no invariant across the two control files          |
| 3         | Technical Depth          | 20%    | 5.0/10      | Build-time enforcement is unwired; the escape is unreachable by its own candidate rule                              |
| 4         | Multi-Tenancy & Security | 10%    | 7.0/10      | No tenant surface; containment now reuses the prefix-realpath behaviour it names                                    |
| 5         | Scope & Testability      | 15%    | 6.5/10      | Ten FRs is right; the adapter skeleton's fixed directive sentence is still unwritten                                |
| 6         | Migration & Rollback     | 20%    | 4.0/10      | `retired` has no durable home; config removal leaves no locator; recovery from a partial store is undefined         |
| **Total** | **Weighted**             |        | **5.63/10** | **ITERATE**                                                                                                        |

Arithmetic re-derived here: `7.0×.15 + 5.5×.20 + 5.0×.20 + 7.0×.10 + 6.5×.15 + 4.0×.20 = 5.625`.

Hard caps checked: **none tripped.** Lint passed by direct `lintPrd` invocation.

</details>

<details><summary>Iteration 3 scorecard (5.90)</summary>

**Iteration 3.**

| #         | Dimension                | Weight | Score       | Notes                                                                                                              |
| --------- | ------------------------ | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1         | Clarity                  | 15%    | 7.0/10      | Each rule is now stated once and the two decisions are explicit; several counts restated wrong, one against its own DO NOT |
| 2         | Completeness             | 20%    | 6.0/10      | The ledger has no schema-evolution, self-exclusion, acquisition or retirement model; fragment terminality unenforced      |
| 3         | Technical Depth          | 20%    | 5.5/10      | "Transactional" is asserted over a preflight plus `wx` sequence with a race window and no rollback                        |
| 4         | Multi-Tenancy & Security | 10%    | 7.0/10      | No tenant surface; containment specified, though a literal reading refuses a fresh repository                            |
| 5         | Scope & Testability      | 15%    | 7.0/10      | Ten FRs is right and the split holds; the adapter grammar is not yet tight enough to implement against                    |
| 6         | Migration & Rollback     | 20%    | 4.0/10      | The path lifecycle is unpriced: adapter changes, `prompts.dir` moves and config removal all leave undiscoverable state    |
| **Total** | **Weighted**             |        | **5.90/10** | **ITERATE**                                                                                                            |

Arithmetic re-derived here: `7.0×.15 + 6.0×.20 + 5.5×.20 + 7.0×.10 + 7.0×.15 + 4.0×.20 = 5.90`.

Hard caps checked: **none tripped.** Lint passed by direct `lintPrd` invocation,
`{ ok: true, issues: [] }`; the CLI wrapper again refused by sandbox `EPERM` on the state
write. No client-to-server contract, no runtime dependency, no remote-push path.

</details>

<details><summary>Iteration 2 scorecard (5.73)</summary>

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
its own precondition FR. No runtime dependency added; no remote-push path added. Lint cap:
not tripped.

</details>

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

Iteration 3's watch items. **Five are DESIGN — they change what the mechanism is, not how it
is described — and the reviewer's decision was explicit that a wording-only round will not
clear them.** W9–W17 and W1–W8 below are the earlier rounds', retained for the record.

1. **W18 — DESIGN: give the ledger one schema owner and a full-file write contract.**
   Field-level prose ownership does not survive contact: PRD-030 FR-1 calls `packageVersion`
   and `generated` read-never-rewritten while its FR-5 has sync rewrite the ledger, which an
   upgrade must do — and once `exceptions` exist, PRD-029's writer has to preserve them or
   its planned bytes differ from the file on disk and preflight refuses forever. Needs: a
   schema version, one full-file read-modify-write owner, canonical serialization, and an
   explicit statement that the ledger excludes itself from `generated` (it cannot hash
   itself, which is reasonable and currently unstated and untested).
2. **W19 — DESIGN: define managed-path acquisition and retirement.** A pre-existing
   destination whose bytes already match is a no-op, and the plan still records it as
   generated — so the tool claims a path it did not write, and PRD-030 may later overwrite an
   adopter's own file because its hash matches. Realistic for `.cursor/rules/prd-workflow.mdc`.
   The lifecycle has five transitions and the documents specify none: acquire, retain,
   **retire** (an adapter removed from `prompts.adapters` — dropped from the ledger it becomes
   invisible, kept it becomes a permanent orphan), **relocate** (`prompts.dir` renamed: the
   old tree and old ledger fall outside every scan), and **relinquish** (`prompts` removed:
   nothing records where the old directory was).
3. **W20 — DESIGN: replace "transactional" with a commit protocol that exists.** Preflight
   plus a sequence of `wx` writes has a race window and no rollback; disk exhaustion, a
   permission error, an interrupt or a concurrent `init` still leaves a partial store, and
   FR-7's four-state table has no state for it. Add `configured-incomplete`, say what
   concurrency does, and define recovery. Also: `configured-orphaned` is misnamed — its
   Config column says the config was removed, which is a different condition from an orphaned
   tree.
4. **W21 — DESIGN: make fragment terminality enforceable, and choose the ceiling.** A
   fragment containing a token leaves it unresolved under FR-4's one-pass rule, and rescanning
   would break that rule — so fragments must be token-free and that must fail at build time.
   Separately, two enumerated tokens whose legal values interact cannot be represented at all;
   the document must say whether the answer is a composite enumeration, a cross-token
   validator, or an admission that a conditional language arrives. "No template language"
   holds only until the first interacting requirement.
5. **W22 — DESIGN: remove the sentinel and escape collisions.** A legitimate configured value
   equal to `<PROVEGATE:UNSET>` is refused, and there is no spelling that renders `{{!NAME}}`
   itself literally. Both are data-model collisions rather than policy. Note also that FR-4's
   stated justification is false: `grep` finds **zero** `{{!` in any shipped file, and the one
   document that discusses tokens is the verbatim-exempt registry. The escape may still be
   worth having; the reason given for it is not the reason.
6. **W23 — SPECIFICATION: make the adapter grammar normative, and scope the preflight.** The
   grammar leaves "optional frontmatter", the "fixed directive", fence syntax, row order and
   cardinality undefined. And `init.ts::preflight` is a generic target: applying
   mismatch-refusal to the base or practices plan turns ordinary `gate init` from
   "existing files are skipped" into "a modified file aborts the plan", which breaks the
   byte-identical promise this PRD makes for repositories without `prompts`. It must be
   prompt-plan-only, and the diagnostic must hand an adopter with a legitimately edited store
   to `doctor`/`sync` — a handoff neither document defines.
7. **W24 — WORDING: sweep the stale counts.** `AGENT_BOOTSTRAP.md` has **ten** stop-and-ask
   checkpoints, not nine (PRD-029, PRD-031, STATUS.md). The required-value set is **nine**,
   not thirteen, and becomes ten when PRD-031 lands; **PRD-032 still says "thirteen" in three
   live places** despite a changelog claiming otherwise. PRD-032's "3 agent-config files" is
   not a file count — the outputs are seven Claude commands, one Cursor rule and one snippet.
   And PRD-029's §12 says "DO NOT state the emitted set as a count anywhere" while FR-2 and
   the metrics table both do.

Also recorded, [P2], confidence medium: FR-1's containment says to realpath both candidate
and root, but the default `.provegate` does not exist on first use. `memoryPathsContained`
already solves this by realpathing the longest existing prefix and reattaching the tail; the
PRD should require that behaviour rather than leave a literal implementation to refuse a
fresh repository.

---

## Iteration 2 watch items (retained)

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

| 3   | 2026-07-27 | 5.90  | ITERATE | **Up 0.17, and the number is the least useful thing the round produced.** Briefed to return a decision rather than a list, with every finding rated for realistic likelihood, it answered that the document **is not implementable and the blocker is structural**. Decision 1 is the problem: one ledger is asked to be a render receipt, a manifest of which paths the tool owns, PRD-030's reconciliation scope, and the migration state across adapter and directory changes — and it is split between two writers by field-level prose that **already contradicts itself**, since PRD-030 FR-1 calls `packageVersion`/`generated` read-never-rewritten while its FR-5 has sync rewrite the ledger, which an upgrade must do. The ownership consequence is concrete and rated `routine`: a pre-existing destination whose bytes already match is a no-op yet still recorded as generated, so the tool claims a path it never wrote and PRD-030 may later overwrite an adopter's own `.cursor/rules/prd-workflow.mdc`. Four transitions have no model at all — retiring an adapter, adding one over a pre-existing file, renaming `prompts.dir`, removing `prompts`. Decision 2 survives for the case it was made for: lines 92–94 of the Phase 3 protocol are one STOP rule plus one exception block, so a fragment can select both renderings and PRD-031 can stay code-free — **but terminality is asserted, not enforced** (a fragment containing a token is left unresolved by the one-pass rule, and rescanning would break it), and two enumerated tokens whose legal values interact cannot be represented, so the document must name its ceiling. `preflight` is a generic `init.ts` target: applied to the base or practices plan it turns ordinary `gate init` from "existing files are skipped" into "a modified file aborts", breaking this PRD's own byte-identical promise. Four stale facts verified here: **`AGENT_BOOTSTRAP.md` has ten stop-and-ask checkpoints, not nine**, repeated in PRD-029, PRD-031 and on the board; the `{{!NAME}}` escape is justified as something "the shipped corpus does" and `grep` finds **zero** `{{!` anywhere; the required-value set is **nine**, not thirteen; and **PRD-032 still says "thirteen" in three live places** under a changelog claiming the count was removed — the third consecutive round in which `a-rule-corrected-survives-where-it-is-restated` is declared `applied` and then reproduced by the session declaring it. Memory contract otherwise clean, with a [P1] that `strictness-added-during-extraction-is-a-behavior-change` is now cited against the *previous* round's overshoots while this round's new refusals — the escape, the sentinel, the generic preflight — again escaped its analysis. W9, W14 and W17 closed; the other six partially. Five of the seven new items are DESIGN |

| 4   | 2026-07-27 | 5.63  | ITERATE | **The first decline, and the round answered the question the brief was built around: the structural blocker did not lift.** Ownership returned as **hash-qualified membership**, with a `routine` counterexample: a user writes `.claude/commands/prd-3.md` themselves, byte-identical to version 1's render, because they want it pinned; `init` no-ops and records the path; after an upgrade `sync` sees bytes matching the receipt hash and overwrites. The tool never wrote that file — and an identical file **absent** from the receipt would not be eligible, so path membership supplies the capability and hash equality only exercises it. That is exactly what FR-8 says no command may do, and the "I can reproduce these bytes so nothing is lost" argument fails three ways: the current package reproduces the *new* bytes, the receipt holds a hash rather than the old content, and equality proves no change since a baseline, never consent. Three more structural, all `routine`: **`sync` cannot truthfully rewrite the receipt** — it leaves excepted and diverged files alone and then writes the whole receipt from the new plan, so the file records a hash the path does not hold, and an implementer must choose whether the receipt means "these bytes were present" or "these are expected bytes"; **`retired` still has no durable home**, reported once and erased by the next receipt write, invisible thereafter outside `prompts.dir` and reclassified as a *failing* tree orphan inside it; and **the two-file model has no complete invariant**, since `prompts-exceptions.json` lives under `prompts.dir`, is neither a plan path nor a receipt entry, and is a tree orphan unless excluded. Four self-contradictions from this round's own remediation, each verified here: **`{{!NAME}}` is not a token candidate under the rule written five lines above it** (`!` is not uppercase), so the escape is unreachable by its own grammar; **fragment terminality "at build time" is unwired** because the package `build` script is only `tsup`, in a document that declares `gate-wire-or-delete` applied; PRD-030 says "a sixth classification" at line 170 and "the five per-path states" at line 458; PRD-032 still says the render refuses on a sentinel after the switch to `null`. Two policy gaps rated `plausible`: an empty-string value resolves a required token and deletes it from the output, and an unknown key in `values` has no defined meaning. And the memory test the brief set: **`a-record-declared-is-not-a-record-applied` was declared as a Memory Output by this revision and was not applied to it**, on four pieces of evidence — declaring the learning reproduced the failure it describes, the fourth consecutive instance and now self-referential. W19 open; W18, W20, W21, W22 partially closed; W23 and W24 partially, with the surviving items named |

| 5   | 2026-07-27 | 4.53  | ITERATE | **Commissioned differently on purpose — a separate session chose its own brief — and it found what four aimed rounds could not: the protocol has been prescribing the remedy all along.** `phase-2-readiness-scorer.md` §Score Interpretation maps **4–5.9 to "Major rework needed. Return to Phase 1"** and 6–7.9 to "iterate and re-score". The five scores are 4.48, 5.73, 5.90, 5.63, 4.53 — **every one in the 4–5.9 band, none ever in 6–7.9** — so five rounds ran the wrong band's action. The flat trajectory was the process, not the document. **Six findings are mechanism.** The upgrade path does not terminate: after an upgrade every rendered file differs, so deleting one and re-running `init` fails preflight on the rest and selective application is impossible — the two documents were written the same sitting and do not compose. An excepted edit **permanently blocks `init`**, because nothing tells `init` an exception exists and PRD-029 forbids itself an exceptions store. The **receipt's own preflight status is unwritten and both readings break**: as a destination it blocks `init` forever, as a non-destination `init` overwrites an existing file, and PRD-030 already picks the second horn in writing. **An existing repository can never be activated** — `init` never edits an existing config — which also breaks PRD-032's prescribed method for deriving its own value set. **Presence-based activation does not survive the loader**: `mergeConfig` deep-merges defaults, so `merged.prompts` is always present and `unconfigured` is unreachable; this repository rejected exactly that mechanism for `memory` and wrote the rationale at `defaults.ts:95-101`, which the PRD never mentions. And the "fails at build time" claim FR-6 itself disproves survives in five other places, two of them §6 and §11 — the executable sections. **PRD-030 carries nine live restatements of the removed design**, including the FR-1-versus-FR-5 contradiction iteration 3 blocked on, alive through two remediations that each claimed to close it, plus a §11 row asserting the opposite of the FR it verifies. Cross-item: PRD-031 and PRD-032 both claim `AGENT_BOOTSTRAP.md` with compatible prerequisites, and PRD-031 landing after PRD-032 leaves this repository's store un-regenerable by any owner. The reviewer **rejected one Codex finding and downgraded two** with evidence, and recorded eight verified-and-closed items so a later round does not re-spend on them |

| 6   | 2026-07-27 | 6.03  | ITERATE | **First round in six to leave the 4–5.9 band, so the prescribed action changes from "return to Phase 1" to "iterate and re-score".** The scope cut worked and the reviewer said so without softening: the lifecycle is genuinely gone, the activation fix is correct **and correctly justified** against `defaults.ts:95-101`, discovery-without-a-write closes what broke PRD-032's derivation, the build-time claims are fully swept from this document, the Conflict Surface is complete for the first time, and **no §11 note inverts its FR** — all seven read against their bodies. **The blocker was at the seam the cut left, not in what it removed**: FR-6 puts two of three adapter destinations **outside** `<dir>`, while the reinstall instruction — stated in five places — named only the store directory, so following it after an upgrade leaves `.claude/commands/*` and `.cursor/rules/prd-workflow.mdc` at the old version with stale banners while the adopter believes they reinstalled. Verified against `initWorkspace`, which writes with `wx` and never deletes (`init.ts:248-283`). **It is the one procedure the whole scope decision rests on and nothing tested it.** One genuine design item: `prompts.values` asked the raw pass for a shape it cannot express — `stringRecord` rejects any value that is not a string **or is empty** (`validate.ts:149-155`), exactly the `null` and `""` FR-4 declares legal — and for an authority it lacks, since the legal key set is package Markdown; a TypeScript constant would have made PRD-031 unable to add its token without a code edit its own Non-Goals forbid. The rest are specification: `validateResolvedConfig` takes no root so containment cannot live there and `load.ts` had dropped from Targets; the `globs` derivation was named but never given; "writing nothing" and "no store file" disagreed across three places, leaving a refused run's residue undefined and, under `wx`, permanent. Cross-document: PRD-031's three enumerated-token references still said FR-6 after the renumber and its "fails at build time" claim **survived a grep sweep because it is split across a line break**; PRD-032 carried an FR-5/FR-4 pair two lines apart in one sentence — the sixth instance of `a-rule-corrected-survives-where-it-is-restated`, created by the fix for the fifth. The reviewer **rejected one Codex "what holds"** — that PRD-030 and PRD-031 have disjoint surfaces — because both write `_brain/INDEX.md` and neither declares it, so the conflict gate cannot see the collision; that remains open. It also downgraded one Codex [P1] with executor evidence, corrected two line cites, and refuted a hypothesis of its own about `starterConfig` leaking defaults |

| 7   | 2026-07-27 | 7.48  | ITERATE | **Confirmation round. Six of eight items closed, and the substantive change is that no design decision remains in PRD-029.** The `prompts.values` authority question from iteration 6 was answered and judged correct: the unknown-key check moves out of the raw pass into the render, because the legal key set is package Markdown the loader must not read, and a TypeScript constant would break the promise keeping PRD-031 parallel to PRD-030. **Both remaining [P1]s were this chain's signature defect** — a rule corrected where owned and stale where restated. The moved check still sent an implementer to the config layer from §6 and from the §11 FR-1 row, which would have put the test in the wrong file; "writes nothing" was right in three places and stale in a fourth **twelve lines from the correct one** plus a Memory Input rationale. The reviewer named the aggravating fact exactly: **this was not the line-break class — `grep "store file"` finds both in one command, so the sweep was not run** — which made the prior Changelog's "stated identically in all three places" false about its own document. [P2]s carried or cross-document: PRD-030's non-binding banner was scoped to §4 while the removed design is restated in §2, §6, §7 and §11, **the pattern applied to the fix for the pattern**; PRD-031 claimed a token becomes required "from the moment this PRD lands", true only while an upgrade path existed; and `_brain/INDEX.md`, carried three rounds, is a Durable Artifact of PRD-030 and PRD-031 and declared by neither. **First round in seven where every code citation checked out**, including a byte-exact verification that the stated `globs` algorithm reproduces `source-snapshot/rules/prd-workflow.mdc:3`. One Codex finding **rejected** — a dated Changelog row is history, per this repository's own `verify-doc-claims.mjs` exclusion and its comment that *"rewriting history to satisfy a linter is the wrong direction"*; Codex had held that position a round earlier and reversed without new evidence |

| 8   | 2026-07-27 | 8.35  | **PASS** | **No open finding in PRD-029.** All seven edits landed; six closed clean and the seventh landed correctly while surfacing one inconsistency in the successors. Both PRD-029 sweeps verified **by reading every occurrence**: nothing routes an unknown `values` key to the config loader — FR-1:163, FR-1:167-170, FR-3:243, §6:439-442 and the §11 FR-3 row all agree — and "writes nothing" has one voice across User Story 1, FR-5 and §6, with the enumerating form appearing only where it enumerates. The false Changelog claim is **gone rather than reworded**, which was the right call for a claim false about its own document. Edit 2 was the one that could have gone wrong and did not: FR-1's §11 row now tests the *shape* (`null` and `""` both pass `stringOrNullRecord`) while FR-3's tests the four *diagnostics*, matching the layering FR-1 and FR-4 actually specify. **The one open item is [P2] and lives in the successors:** claiming `_brain/INDEX.md` made the path-conflict gate correctly refuse PRD-030 and PRD-031 together, while both still assert parallelism — six sentences, PRD-031 `:267`, `:279`, `:319` verified — the **eighth instance of the restatement pattern and the fourth time a fix for one instance created the next.** Recommended remedy is one line in `sharedAppendOnly`, which is what iteration 2's W17 offered as its second option and which matches how the index is actually written. **Two disclosed scoring adjustments, audited here and upheld:** Migration & Rollback 7.0 → 8.0 because the rubric asks *"backward compatibility, deployment strategy, undo plan"* (`phase-2-readiness-scorer.md:110`) and the reviewer had been deducting for automated staleness detection, which it does not ask — a correction **against its own ceiling**, set at iteration 6 and held at iteration 7; and Completeness 8.0 → 8.5 removing a residual double-counted across two dimensions. It declined Codex's Migration 9.0, noting that is Codex's third position on that dimension in three rounds, each move toward its own total |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Verdict

**PASS — 8.35/10, iteration 8, scored independently. Proceed to Phase 3 with the two watch
items below flagged.**

Eight rounds. The document is implementable and there is nothing left for an implementer to
decide: the reinstall unit, the values-validation seam and its layering rationale, the
containment location, the `globs` derivation, the four diagnostics and the adapter destinations
are all written down. What remains is ordinary decomposition inside targets, grammars and tests
the document names.

**What actually moved this item, for whoever reads this next.** Five rounds sat in the 4–5.9
band whose prescribed action is *return to Phase 1*, and were each given the 6–7.9 action
instead. The turn came when the band action was finally taken and the scope was cut: every
mechanism defect across four rounds had landed in the store-lifecycle layer while the layers
beneath it measured exact, so the layer was removed rather than repaired. **The reviews were
locating a scope error and reporting it as a sequence of design errors.** After the cut, nothing
new was designed — three rounds of sweeping the same rule everywhere it is restated took it from
6.03 to 8.35.

**Watch items, both in the successors, neither blocking this item:**

1. **The parallelism claim.** `_brain/INDEX.md` is now declared by PRD-030 and PRD-031, so the
   path-conflict gate refuses them together — correct — while both still assert they may run in
   parallel, in six sentences. One line in `workflow.config.json` `sharedAppendOnly` keeps the
   claim true and matches how the index is actually written (append one pointer per record);
   the alternative is dropping the claim and accepting serialization. Owner's call.
2. **PRD-030's state-model precondition** verifies only that a file exists, in Phase 5. That is
   acceptable while everything but its FR-1 is a declared sketch, and it stops being acceptable
   the moment FR-2–FR-7 are rewritten from the model. Strengthen it then to PRD-031's precedent,
   which asserts owner, date and manifest listing rather than mere presence.

**One method observation belongs in the `_brain` capture at this item's close**, and no current
record states it: eight rounds produced eight instances of a rule corrected where it is owned
and left standing where it is restated, and **four of those were created by the fix for the
previous one.** `a-rule-corrected-survives-where-it-is-restated` was declared `applied` in every
version of this PRD. Declaring it did not apply it. What worked, in the end, was treating the
sweep as a separate step performed after the fix — and the evidence that it is separate is that
two of iteration 7's four items were findable by a single `grep` and were still missed. Six of eight items closed, and there is no design decision
left in PRD-029.**

That is the change worth recording. Iteration 6 left exactly one open question — what authority
defines the legal `prompts.values` key set — and the answer taken was judged correct: the check
moves into the render because the legal set is package Markdown the config loader must not
read, and the alternative would have made PRD-031 unable to add its token without a code edit
its own Non-Goals forbid. Everything remaining is a sentence.

**Both open [P1]s were the same defect this chain has produced in every round: a rule corrected
where it is owned and left standing where it is restated.** The unknown-key check was moved in
FR-1 and FR-3 and still pointed at the config layer from §6 and the §11 FR-1 row. "Writes
nothing" was correct in three places and stale in a fourth twelve lines away. The reviewer's
sharpest observation is not the finding but its cause: **this was not the line-break case that
defeats a grep — one grep finds both — so the sweep was not run**, and the Changelog then
asserted a sweep that had not happened.

The same pattern appeared in the fix for the pattern: PRD-030's non-binding banner was scoped
to §4 while the removed design is restated in §2, §6, §7 and §11. It is now at the top of the
document and covers everything except FR-1.

**Method notes worth keeping.** This is the first round in seven where every code citation the
document makes checked out. The reviewer rejected a Codex finding on this repository's own
settled position about historical log entries, and declined to follow Codex's Migration score
from 6.0 to 9.0 on a single fix — holding a stated ceiling rather than adjusting it to reach a
nicer total is what makes the other numbers usable. And `_brain/INDEX.md` survived three rounds
only because a human-side reader kept re-raising it after the model reviewer's own "what holds"
list had cleared it. The first score in the 6–7.9 band, and the band action is
now the one this item has been receiving all along.**

Six rounds sat in 4–5.9, whose prescribed action is *return to Phase 1*; the owner took that
action, PRD-029 was cut to a one-way install, and the score moved out of the band. **The
instrument now matches the document**, which is what the band action was supposed to produce.

**The cut worked, and the remaining problem is no longer design.** The lifecycle is gone. The
activation fix is right and cites the precedent it copies. Discovery without a write closes the
finding that broke PRD-032. The Conflict Surface is complete for the first time in six rounds,
and not one §11 note inverts its FR.

**What was left was the seam the cut created.** A one-way installer's entire migration story is
its reinstall instruction, and that instruction named the store directory while two of three
adapter destinations live outside it. The Non-Goal is honest; the remedy was wrong. That is now
fixed with a §11 row that fails today rather than with prose.

One design decision was genuinely open and is taken: the unknown-`values`-key check moves out of
the raw validation pass into the render, because the legal key set is package Markdown the
loader must not read and a TypeScript constant would break the promise that keeps PRD-031
parallel to PRD-030.

**Still open and recorded so it does not disappear:** `_brain/INDEX.md` is written by PRD-030
and PRD-031 in Durable Artifacts and declared by neither, so the path-conflict gate cannot see a
collision those two items will have. Raised at iteration 5, unremediated, and missed by the
model reviewer's own "what holds" list — which is the argument for keeping a second reader who
rejects findings as well as producing them. The lowest of the five, and the only round that examined the
process rather than the document.**

**The protocol answered this four rounds ago and nobody read the table.**
`prompts/phase-2-readiness-scorer.md` §Score Interpretation:

| Score | Verdict | Action |
| --- | --- | --- |
| 6–7.9 | Good start | Iterate on identified gaps, re-score after improvements. |
| **4–5.9** | **Significant gaps** | **Major rework needed. Return to Phase 1.** |

4.48, 5.73, 5.90, 5.63, 4.53. **Every score is in the 4–5.9 band. Not one has ever reached
6–7.9.** Five rounds applied the 6–7.9 action to a document that has never been there. The
trajectory was never noise about the document; it was the process executing the wrong
instruction, in the repository whose method that instruction is.

**The document is not implementable, and the remaining problem is design.** An agent building
PRD-029 and PRD-030 as written produces a tool that installs correctly once and can never be
run again against the same repository: the upgrade path refuses, the exception path refuses,
the receipt refuses itself, and the activation predicate is erased by the loader before any
command sees it. None of that is reachable by rewording, because the answers are not elsewhere
in the documents.

The iteration-4 decision is sound and was not re-litigated. The failure is in how it was
applied: **the overwrite was subtracted from every verb and nothing was put in its place.**
Iteration 3 blocked because one file was doing four jobs; iteration 4 removed the jobs; what is
missing now is the state machine those jobs were badly approximating.

**The next step is Phase 1, and its first artifact is one owner-authored page** — outside all
four PRDs — answering a single question: *under a no-overwrite rule, what is the complete set
of state transitions for a generated store, and which actor performs each?* It must cover
concretely: install into a repository that already has a config; upgrade; upgrade with one
excepted file; add and remove an adapter; rename `prompts.dir`; and the receipt's own second
write. Every one is currently undefined or defined into a dead end. Then: decide activation
against the codebase rather than the prose (`prompts.enabled`, the shape `memory` already
uses); fix the landing order so PRD-031 precedes PRD-032 or owns the regeneration; rewrite all
four documents against that model **in one sitting**; and only then re-enter readiness.

Two process facts belong in the record. **Scoring one document while its three successors are
edited in parallel is why contradictions keep migrating into the ones nobody is scoring** —
three consecutive rounds now, and PRD-030 is where the mechanism actually lives. And this
round is the first evidence that *who writes the brief* changes what is found: four aimed
briefs, all written by the session that also wrote every remediation, never examined the band
table, the loader's activation semantics, or whether the named verification commands can
discriminate. An unaimed session found all three in one pass. The first decline in the
sequence, and the most useful round of the four.**

The brief asked one question directly: did the structural blocker lift, or did ownership
return in disguise? It returned. `sync` overwrites a file because its bytes match a receipt
hash **and its path is in the receipt** — an identical file outside the receipt is not
eligible — so membership grants the capability and equality merely exercises it. FR-8's
sentence saying no command may derive a right to write from the receipt is therefore false
about the system the four documents describe. The reframing from "ownership" to "content"
that iteration 3's remediation rested on did not change the mechanism; it changed the
vocabulary.

Three consequences follow and none is wording. `sync` cannot rewrite the receipt truthfully
while leaving divergences in place. `retired` is erased by the write that reports it.
`prompts-exceptions.json` is an orphan under the rule its own document writes.

**The trajectory is the finding.** 4.48 → 5.73 → 5.90 → **5.63**. Three remediations, each
written by the session that received the findings, each correct for the counterexample it was
given and each introducing a new one — this round's include an escape sequence unreachable by
the candidate rule five lines above it, and a "fails at build time" requirement in a package
whose `build` is one `tsup` invocation. The reviewer's description is exact: local
counterexample repair around a protected conclusion, with contradictions migrating into the
successor documents that are not being scored.

**Another remediation round is the wrong instrument, and this artifact is where that is
recorded rather than argued.** The next step is an owner decision on a single question —
**what grants the authority to overwrite a file?** — with three candidate answers already on
the table: content equality alone; an explicit, recorded adoption of a path; or nothing,
because `sync` never overwrites and only proposes. That model, and its state transitions,
should be written **independently of these four PRDs** and readiness re-entered afterwards.

One process observation belongs here because it is the fourth instance and it is now
self-referential: `a-record-declared-is-not-a-record-applied` was declared as a Memory Output
by the revision this round scored, and was not applied to that revision. A session applies a
memory record to the defect it has just been shown, not to the rules it is about to write.
Whatever remediation follows should not be authored by the session that received these
findings.

The score moved 0.17 and the round's value is not in it. Asked for a decision rather than a
list, the reviewer gave one: **this document is not good enough to implement, and the reason
is structural.** That is the first time in three rounds the answer has been something other
than a defect list, and it is worth more than the previous two rounds' findings combined.

**Decision 1 is the blocker, and it is this session's recommendation.** A single
`provegate.lock.json` is carrying four jobs — the receipt of what was rendered, the manifest
of which paths the tool owns, the scope definition for PRD-030's reconciliation, and the
migration state across adapter and directory changes — with its fields split between two
writers by prose. The split contradicts itself already, in documents written in the same
sitting: PRD-030 FR-1 says `packageVersion` and `generated` are read and never rewritten, and
its FR-5 has `gate sync --prompts` rewrite the ledger on success, which an upgrade must do.
The ownership job is the one that bites in ordinary use: a destination that already exists
with matching bytes is a no-op and is still recorded as generated, so the tool claims a file
it never wrote and a later `sync` may overwrite the adopter's own Cursor rule.

Four transitions have no model: retiring an adapter, adding one where a file already exists,
renaming `prompts.dir`, and removing `prompts` entirely. Each leaves state that no command
can discover. That is a managed-path lifecycle, and no amount of rewording FR-8 produces one.

**Decision 2 holds for the case it was made for and has a stated ceiling problem.** Lines
92–94 of the Phase 3 protocol are one STOP rule plus one exception block, so fragments can
express both renderings and PRD-031 can stay code-free — the design works. But terminality is
asserted rather than enforced, and two enumerated tokens whose legal values interact cannot be
represented at all. "No template language" is true until the first interacting requirement,
and the document should say what happens then rather than discover it.

**Three rounds, three instances of the same failure by the same author.**
`a-rule-corrected-survives-where-it-is-restated` has been declared `applied` in every version
of this PRD, and every round has found the rule corrected in one place and left standing in
another — this time PRD-032's "thirteen", under a changelog entry stating the count was
removed. `strictness-added-during-extraction-is-a-behavior-change` has now been declared for
three rounds while each round's *newest* refusals escape its analysis. The pattern is not that
these records are wrong; it is that a session applies them to what it has just been told about
and not to what it is about to write. That is worth a durable record of its own, and it
belongs to whoever closes this item.

**Next step is not another remediation round.** W18–W22 are design decisions about what the
ledger is and where conditional content stops. W23 and W24 are ordinary work and should follow
the design, not precede it.

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
