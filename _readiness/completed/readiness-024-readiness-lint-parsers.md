# Readiness Assessment: PRD-024 — Readiness Lint Parsers

> **Iteration 9 (Claude Fable 5) — 8.35/10, PASS.** First PASS in nine rounds. The
> round-2 remediation closed both iteration-8 [P1]s the way the remedies prescribed:
> the §11-parser class is an exact five-predicate issue-identity set whose strings are
> verified byte-level against `prd-ready.ts`, and the turbo input is bound to the
> configured artifact root by a coverage assertion that fails a rename by name. All four
> P2s swept; corpus re-measured at ten files / 60 rows / zero class issues. Integrity
> note, stated rather than implied: this scorer wrote the round-2 work orders (on the
> owner's direction) and authored none of the document's text — the remediation was two
> isolated sessions; Phase 3's owner Go and Phase 6's independent review remain the
> load-bearing outside readers. Five watch items bind them.
>
> **Concurring independent round, same day (Claude Fable 5, separate session) — 8.18/10,
> PASS. Quorum 2/2.** This second scorer wrote neither the PRD, nor either remediation,
> nor the round-2 work orders, and scored without reading the 8.35 round first — the two
> rounds collided in the working tree, which is the disclosure. Every load-bearing claim
> was re-executed rather than read: all four emitted issue strings byte-checked
> (`prd-ready.ts:124,142,148,170`), the caller shape at `cli.ts:795`, the turbo trio
> (`turbo.json` test task bare today, exceptions `{}`, `verify-turbo-inputs.mjs:60-77`
> both refusal directions), PRD-036's Dependencies serialization, the template's no-pipe
> contract, and the archived PRD-021 row at `:1278`. The full lint was re-run across all
> ten wip files: the same three red for the same out-of-class reasons, zero class-predicate
> issues. **One dated count corrected, same class as the iteration-7 correction: the live
> corpus is 65 FR rows at this scoring, not 60** — a fourth same-day move, +2 from
> PRD-027's remediation (its new FR-9 rows) and +3 from PRD-035's, both landing after the
> round-2 remediation measured; ten files / zero malformed / one canonical section each
> all reproduced, so the qualitative claims hold and the enumerate-don't-pin design
> absorbs the drift. The fixture census reproduced at sixteen with one definitional note:
> a raw grep finds a seventeenth `| FR-N` literal at `prd-ready.test.ts:48`, which is the
> argument of a `.replace()` deleting a row, not a fixture row. Dimensions (infra):
> 8.5 / 8.0 / 8.0 / 9.0 / 8.0 / 8.0 → 8.175. Two watch items added as W6 and W7; neither
> blocks, both are one-sentence Phase-3 fixes.
>
> <details><summary>Iteration 8 (7.68 ITERATE)</summary>
>
> **Iteration 8 (Codex, independent) — 7.68/10, ITERATE, UP 0.35.** First round on the
> remediated document, by a scorer who wrote neither the document nor its remediation.
> Five of seven open items CLOSED with citations; what remains is specification
> precision, not design: the new **§11-parser-class is not an implementable predicate**
> over `lintPrd`'s bare string issues, and the turbo glob **does not follow a configured
> artifact-root rename** — the corpus directory is config, the cache key is a literal.
> The corpus also drifted a third time mid-day: PRD-036's creation made it ten files
> and sixty rows again, which is the dynamic-enumeration design proving itself.
>
> <details><summary>Iteration 7 (7.33 ITERATE)</summary>
>
> **Iteration 7 (Claude Fable 5, independent) — 7.33/10, ITERATE.** The document is
> unchanged since iteration 6; this round re-verified every open finding against live
> source and re-measured the corpus after PRD-021's close. The open [P1] stands — FR-2's
> turbo strategy still fails the PRD's own floor — and the corpus finding grew: **four of
> ten wip PRDs are red today, none of them for a §11 reason**, so "no corpus
> prerequisite" is further from true than when it was written. The §11 substance holds
> exactly: 70 FR rows, zero malformed, one canonical section per file. *[Scorer
> correction, 2026-07-28: **60 rows, not 70** — the scorer's counting script matched each
> table's header row as an FR row, one per file. Found by the remediation session's
> independent recount at the readiness commit; every qualitative claim (zero malformed,
> one canonical section each) reproduced. A span-wider-than-its-claim defect in the round
> that was scoring exactly that defect class.]*
>
> <details><summary>Iteration 4 (6.95 ITERATE)</summary>
>
> **Iteration 4 (Codex, independent) — 6.95/10, DOWN 0.45.** The round that falsified the
> working hypothesis. Iteration 3 added **no new material** — every edit closed a finding —
> and the score still fell. What predicts the score is not whether material is new but
> **whether the consequences of a fix were measured**: the end-anchored exemption closed K's
> third level and silently invalidated an existing test fixture, four live wip PRDs, and its
> own "no existing fixture changed meaning" claim. K also moved a **fourth** time, into the
> HTML comment the fix itself introduced as the home for rationale.
>
> <details><summary>Iteration 3 (7.40 ITERATE)</summary>
>
> **Iteration 3 (Codex, independent) — 7.40/10, ITERATE.** Up 0.57, the second-largest
> single-round gain in this wave. J closed, L closed at the reported level, and the
> exempt-bullet continuation vector closed — but **K moved a third time**, into the same
> line as the exemption marker, and two structural holes surfaced that no prior round had
> reached: a duplicate or missing §9 section, and a row-cell threshold that would have
> broken three existing fixtures.
>
> <details><summary>Iteration 2 (6.83 ITERATE)</summary>
>
> **Iteration 2 (Codex, independent) — 6.83/10, ITERATE.** Up 0.08. E and F closed
> outright; six findings are partially closed and one is open. The remediation introduced
> two of its own: an **unacknowledged public API break** (`parseVerificationCommands` is
> exported and consumed as an array by two existing tests), and the paragraph hiding place
> **moved one level down** into the indented continuation of an exempt bullet.
>
> <details><summary>Iteration 1 (6.75 ITERATE)</summary>
>
> **Iteration 1 (Codex, independent) — 6.75/10, ITERATE.** The three assigned PRD-023
> defects transferred accurately and the split exposed new seams, all of them
> specification gaps rather than internal contradictions. The sharpest is a fourth
> instance of this PRD's own defect class: `lintPrd` has a **second, independent**
> whole-row backtick scan that FR-1 does not scope.

> </details>
> </details>
> </details>
> </details>
> </details>
> </details>
> </details>
> </details>
> </details>

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-024-readiness-lint-parsers.md`   |
| Score                  | 8.35/10                                        |
| Verdict                | PASS — both iteration-8 [P1]s closed as prescribed (exact five-predicate issue-identity set; turbo input bound to the configured artifact root), all four P2s swept, corpus clean of class issues. Five watch items bind Phase 3 and Phase 6 |
| Iteration              | 9                                              |
| Model Tier (Execution) | high                                           |
| Model Tier (Audit)     | high                                           |
| Scored by              | **Claude Fable 5 — authored none of the document's text (remediation by two isolated sessions); caveat stated: this scorer wrote the round-2 work orders on owner direction, so Phase 3's Go and Phase 6's independent review remain the load-bearing outside readers** |
| Self-scored            | **no** (with the caveat above)                 |
| Quorum                 | **2/2 PASS** — a concurring independent round the same day (Claude Fable 5, separate session; wrote neither the PRD, the remediations, nor the work orders) scored **8.18 PASS** without reading this round first, re-executed every load-bearing measurement, corrected the corpus count to 65 rows (fourth same-day move), and added watch items W6–W7 |
| Date                   | 2026-07-28                                     |
| PRD Lint               | passed — `gate check PRD-024` exit 0, run live by the scorer; `gate check --value-score` green (21 scored, 0 without a header) |
| State Record           | updated — `gate status` re-run after saving    |

<!-- Verdict values: PASS | ITERATE | REJECT. The Score row and Verdict row are parsed
by the state builder — keep the `| Score |` and `| Verdict |` labels intact. -->

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Execution (Phase 4) | high | parser semantics + a build-tool cache contract; the deny fixtures are the value and a medium-tier session under-writes them |
| Audit (Phase 6)     | high | parser changes with a corpus blast radius; string-identity verification against FR-2's predicate table is the first check |

---

## Analysis

### Findings

(Iteration 1's findings below are historical — see the Iteration History table for
rounds 2-9. The iteration-9 scorecard: Clarity 8.5, Completeness 8.5, Technical Depth
8.0, Multi-Tenancy & Security 9.0, Scope & Testability 8.5, Migration & Rollback 8.0 →
`0.15×8.5 + 0.20×8.5 + 0.20×8.0 + 0.10×9.0 + 0.15×8.5 + 0.20×8.0 = 8.35`. Hard caps:
none tripped — no protected surface, no client-server payload, lint green, zero runtime
dependencies, no push path, no method content.)

**[P1] A — FR-1 scopes the executor's parser and leaves the readiness predicate reading
the whole row.** FR-1 targets `parseVerificationCommands`, but `lintPrd` independently
decides whether a row carries a runnable command using `row.matchAll(...)` across the
**entire row** (`prd-ready.ts:127-142`). After the proposed fix, a Command cell holding no
runnable command still passes readiness whenever Notes contains an allowlisted token such
as `pnpm test`, and the executor then receives no command from that row
(`chain.ts:491-495`). This is a **fourth instance of the PRD's own defect class**, found in
the PRD that exists to remove it. Scope both readers through one shared cell-extraction
rule and add a deny fixture where only Notes carries an allowlisted command.

**[P1] B — the malformed-row requirement has no reporting channel.** The PRD requires a row
that does not split into cells to be "reported, never silently skipped", but
`parseVerificationCommands` returns only `SafetyCheckedCommand[]` (`safety.ts:31-44`) and
the executor consumes that array directly (`chain.ts:491-495`). There is nowhere for the
report to go. Specify whether parsing returns `{commands, issues}`, whether `lintPrd` owns
the diagnostic, and how a malformed row is prevented from disappearing during `gate run`
when other valid rows remain.

**[P1] C — FR-2's deferral predicate is still a substring test wearing a better name.**
"A Markdown link or a `PRD-NNN` identifier" is satisfied by an unresolved entry that merely
happens to cite something: *"Why was this deferred? See [background](…)"* passes. Define a
closed syntactic form — `Deferred to PRD-NNN` or `Deferred: [target](…)` — and add a deny
fixture holding both the word and an unrelated link.

**[P1] D — FR-3's "leading explanatory line" re-creates the exemption it removes.** Nothing
syntactically distinguishes an explanation from an unresolved question, so exactly one
paragraph-form question can still hide in that slot. The grammar also never defines wrapped
bullet continuations — and **this PRD's own `(none)` bullet wraps onto a second line**.
Enumerate the accepted line forms (blank, bullet start, continuation, HTML comment) and
either eliminate the leading-prose allowance or require a fixed marker.

**[P1] E — the corpus fixture omits a production argument that changes its result.**
`lintPrd` takes the repository root as a fourth parameter (`prd-ready.ts:108-113`) and the
CLI passes it (`cli.ts:654-655`). FR-4 names only config and manifest. Measured by the
reviewer: this PRD passes with `root` and fails without it, with the unrelated error
*"memory is enabled but the readiness lint received no repository root"* — this repository
enables memory. FR-4 must require the four-argument shape. This is
`fixture-must-reach-production-shape` in the FR that cites it.

**[P1] F — the corpus test reads outside Turbo's declared inputs.** The test reads wip PRDs
at the repository root; `turbo.json:15-17` declares no additional inputs for the test task,
so a change under `_prds/wip` can replay a cached green. This is
`turbo-cache-masks-out-of-input-reads`, an active indexed record the PRD does **not**
declare as a Memory Input. Add the input surface or define an explicitly uncached corpus
command, and add `turbo.json` to Targets and Conflict Surface.

**[P2] G — PRD-021 is an ordering dependency, not a "known case".** The configured wip
corpus holds five PRDs and PRD-021's §9 is paragraph-form (`prd-021:1028-1046`), so FR-3
rejects it. The PRD states the stop condition but still calls itself dependency-free. State
that PRD-021's §9 remediation is a Phase-4 prerequisite, and that allowlisting an expected
failure in the corpus test is forbidden.

**[P2] H — two behavioral claims overstate.** The success metric says *every* backtick
outside the Command column reaches the gate; inert file paths are already excluded
(`safety.ts:51-58`). The header and rollback say only lint verdicts move; FR-1 also changes
**Phase-5 commands**, because `buildGateChain` executes the parser's output directly. Add
the backward-compatibility note for any existing PRD relying on Notes-cell execution.

**[P2] I — the round count is internally inconsistent**: the introduction says six rounds,
the changelog says four. Six is the total including self-scored rounds; four is the
independent subset. Use one definition.

### What Codex confirmed

All three assigned defects carried over accurately. `verify:workflow` genuinely never
invokes `lintPrd`, so the corpus-command diagnosis is right. Enumerating wip PRDs from
config is implementable via `dirs.artifacts.prd.dir` and `dirs.stateRoles.wip`. The
no-pipe Command-cell contract really is in the shipped template
(`templates/prd-template.md:196-201`). The proposed positive controls are non-vacuous in
intent. The overlap claim is accurate — PRD-021 and PRD-026 both claim `prd-ready.ts`. No
security, contract, dependency, push-path, or method-content cap is tripped.

---

## Scorecard

Class `infra` weights, per `packages/provegate/prompts/phase-2-readiness-scorer.md`.

| #         | Dimension                | Weight | Score      | Notes |
| --------- | ------------------------ | ------ | ---------- | ----- |
| 1         | Clarity                  | 15%    | 6.5/10     | Concrete targets and commands, but FR-1 omits a second whole-row predicate and FR-3 defines no falsifiable grammar. |
| 2         | Completeness             | 20%    | 6.5/10     | All assigned defects transferred; malformed-row propagation, the `root` argument, and cache inputs are absent. |
| 3         | Technical Depth          | 20%    | 6.5/10     | Root causes accurately measured; caller, executor, and Turbo-input analysis stops one layer short. |
| 4         | Multi-Tenancy & Security | 10%    | 9.0/10     | No tenant, auth, or data surface; command scoping reduces accidental execution. |
| 5         | Scope & Testability      | 15%    | 6.5/10     | Runnable focused tests and good positive controls, but some deny cases can fail for an unrelated reason. |
| 6         | Migration & Rollback     | 20%    | 6.5/10     | Revert is simple, but PRD-021 is a live prerequisite and FR-1 changes executed commands, not only verdicts. |
| **Total** | **Weighted**             |        | **6.75/10** | **ITERATE** |

Weighted sum:
`0.15×6.5 + 0.20×6.5 + 0.20×6.5 + 0.10×9.0 + 0.15×6.5 + 0.20×6.5`
= `0.975 + 1.300 + 1.300 + 0.900 + 0.975 + 1.300 = 6.750`.

Hard caps: none tripped. Security, contract, lint, runtime-dependency, push-path and
method-content caps each checked explicitly.

---

## Missing Pieces → Watch items (PASS at iteration 9 — these bind Phase 3 and Phase 6)

Rewritten at iteration 9; the iteration-8 remediation list is complete and closed. (An
earlier wording of this preamble began with the bare word "Updated" and the state
builder's `getMetaValue` third pattern captured the rest of the sentence as the record's
`lastUpdated` value — `lint-must-name-the-span-it-judges`, this PRD's own declared Memory
Output, live in the state builder. Deferral filed on the board.)

- **W1 — string identity is the contract.** FR-1's implementation must emit the three
  new prefixes byte-exactly as FR-2's predicate table states them; Phase 6's first check
  is that the two FRs and the shipped strings agree — drift between the tables is this
  document's own defect class arriving in code.
- **W2 — the turbo edit and the exceptions entry are one change.** They land in one
  commit and revert in one (the two-way order is in Rollback); Phase 5 re-runs
  `verify:turbo-inputs` and `verify:workflow` after the edit.
- **W3 — PRD-036 extends the same `inputs` array** and serializes behind this PRD by its
  own Dependencies section; re-run `gate queue` at claim.
- **W4 — the three red corpus files (026 / 031 / 034) belong to their authors.** Phase 4
  re-runs the class sweep before writing the per-file expectations; a new red on a class
  predicate is a stop, not an allowlist.
- **W5 — the classification pair's positive control is the vacuity guard.** Phase 6
  confirms the unsafe-Command-cell fixture can actually fail (mutate the implementation,
  watch it go red) — a deny sweep that cannot fail is not evidence.
- **W6 (concurring round) — predicate 4's anchor contradicts the table's own detail
  rule.** FR-1's prefix table says "detail may follow a prefix … appending detail never
  breaks the predicate"; FR-2's predicate 4 is `$`-anchored full-match, so that sentence
  is true of predicates 1–3 and 5 and false of 4. Today's emitted string matches exactly
  (`prd-ready.ts:148`, byte-checked) and FR-1 does not license changing it, so nothing is
  wrong yet — but an implementer who follows the detail sentence for the no-runnable
  issue breaks the class predicate silently. Phase 3 makes it consistent one way: drop
  the `$`, or state that the two existing member strings are matched as-is and must not
  gain detail.
- **W7 (concurring round) — the negative control's "no issue at all" needs the fixture
  green outside the planted cell.** The corpus-shaped fixture asserts zero issues when
  the unsafe token sits in Notes, but its own conformance elsewhere is unspecified — a
  fixture numbered at or past `enforceFrom` without a Value header fails for an unrelated
  reason, the exact trap `assert-absent-needs-an-independent-cause` names and this PRD
  teaches. The failure direction is loud, not silent, which is why this is a watch item:
  Phase 3 states the fixture is lint-green apart from the planted cell and picks its PRD
  number against `enforceFrom` deliberately.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 9   | 2026-07-28 | 8.35  | **PASS** | **First PASS in nine rounds: 6.75 → 6.83 → 7.40 → 6.95 → 7.80 → 7.34 → 7.33 → 7.68 → 8.35.** Scored by the session that wrote the round-2 work orders (owner-directed) and authored none of the document's text; the caveat is in Quick Meta and the outside readers are Phase 3 and Phase 6. **Both iteration-8 [P1]s verified closed against source, not against the changelog.** (A) The §11-parser class is an exact issue-identity set: FR-1 fixes three new prefixes with the chain-versus-lint split marked per row, FR-2 enumerates five predicates — the three new ones plus `^FR-\d+: §11 row has no runnable command$` (`prd-ready.ts:148`, byte-checked this round) and the `unsafe §11 command` prefix (`:170`, byte-checked) — each membership reasoned, the `no §11 verification row` issue (`:142`) explicitly OUT, the unimplementable provenance qualifier deleted with its reason, and a classification fixture pair required whose positive control is an unsafe **Command-cell** command. (B) The turbo input is bound: the corpus test must read `turbo.json`, resolve `dirs.artifacts.prd.dir`, and assert a declared `test`-task glob at or above the resolved root, so a rename fails by name; the PRD-036 coordination is stated in both directions with PRD-036's own Dependencies section as the evidence. **All four P2s verified swept** (metric now 0 with a separate "merely present" row; both fifth-argument overstatements corrected to missing-header-enforcement-only per `value-score.ts:189-201`; the PRD-034 example corrected to heading-with-zero-FR-entries per `prd-ready.ts:124`, including inside the newest changelog row; the 2026-07-27 row carries its supersession marker). **Corpus re-measured by the scorer this round:** ten files, 60 FR rows, zero malformed, one canonical section each, zero issues matching any of the five class predicates; three files red on rules FR-1 never reads. Residual leftover sweep for the old wordings came back empty outside history. Scorecard: 8.5 / 8.5 / 8.0 / 9.0 / 8.5 / 8.0 → 8.35; no hard cap tripped. **Five watch items bind Phase 3 and Phase 6** — see Missing Pieces, now the watch list. |
| 9b  | 2026-07-28 | 8.18  | **PASS** | **Concurring independent round, quorum 2/2.** Scored by a separate Claude Fable 5 session that wrote neither the PRD, nor either remediation, nor the round-2 work orders, and had not read row 9 when it scored — the two rounds collided in the working tree. Method: re-execution over reading. All four emitted issue strings byte-checked against `prd-ready.ts` (:124, :142, :148, :170); `cli.ts:795` five-argument caller re-read; the turbo trio measured (test task bare at `turbo.json:15-17`, exceptions `{}`, both refusal directions of `verify-turbo-inputs.mjs:60-77`); PRD-036's `Dependencies` serialization confirmed at `prd-036:151-155`; the template no-pipe contract at `templates/prd-template.md:198-200`; the archived PRD-021 hazard row at `:1278`; the full lint re-run across all ten wip files — the same three red (026 ×3 dispositions, 031 ×2, 034 `no functional requirements found`), zero class-predicate issues. **Corpus count corrected, iteration-7-correction class: 65 FR rows at scoring time, not 60** — the fourth same-day move, +2 from PRD-027's remediation (new FR-9 rows) and +3 from PRD-035's, both landing after the round-2 measurement; ten files, zero malformed, one canonical section each all reproduced, so the enumerate-don't-pin design absorbs it and no edit is demanded. Fixture census reproduced at sixteen; the seventeenth raw-grep hit is `prd-ready.test.ts:48`, a `.replace()` deletion selector, recorded as the definitional note. **Two new findings, filed as watch items rather than [P1]s because today's strings satisfy both:** W6 — predicate 4's `$`-anchor contradicts the table's "detail may follow" sentence, true of four predicates and false of one; W7 — the negative control's "no issue at all" assertion leaves the fixture's own conformance unpinned against `enforceFrom`, the `assert-absent-needs-an-independent-cause` trap with a loud failure direction. Dimensions (infra): Clarity 8.5, Completeness 8.0, Tech Depth 8.0, Multi-Tenancy 9.0, Scope & Testability 8.0, Migration & Rollback 8.0 → **8.175**. No hard cap tripped; `gate check PRD-024` exit 0 run by this scorer. Disclosure: this scorer's own PRD-027 remediation earlier the same session is what moved the corpus count — stated so the correction's provenance is auditable |
| 8   | 2026-07-28 | 7.68  | ITERATE | **First independent round on the remediated document (Codex; wrote neither the PRD nor the remediation), and the largest score in this item's history: 6.75 → 6.83 → 7.40 → 6.95 → 7.80* → 7.34 → 7.33 → 7.68** (*7.80 scored the narrowed doc pre-blocker). Dimensions: Clarity 7.5, Completeness 7.5, Tech Depth 7.5, Multi-Tenancy 9.0, Scope & Testability 7.0, Migration & Rollback 8.0 → 7.675. Both [P1]s re-verified against source by the orchestrating session before recording. **(P1-A, carried at a deeper level)** the corpus scoping was the right move and its definition is not implementable: `lintPrd` exposes `issues: string[]` with no diagnostic codes (`prd-ready.ts:98`), the class prose omits the `§11 row has no runnable command` issue **that FR-1 itself changes the predicate for**, and the emitted unsafe-command string carries no cell provenance — so "unsafe issue raised from a cell other than the Command column" cannot be read off the result. An implementer can satisfy the prose by classifying all unsafe strings, none, or `/§11/` — three different tests. Remedy: an exact diagnostic-prefix set (or code enum), an explicit include/exclude decision on the no-runnable issue, and a classification fixture with an unsafe **Command-cell** positive control. **(P1-B, NEW)** the turbo strategy passes its gate and misses a rename: the corpus test reads the wip directory from config (`dirs.artifacts.prd.dir`, `types.ts:7`, default `_prds` at `defaults.ts:9`) while the cache input is the literal `$TURBO_ROOT$/_prds/**` — rename the configured artifact root and the test reads the new directory while turbo hashes the old glob, and `verify:turbo-inputs` stays green because it checks only that the exception reason is non-empty (`verify-turbo-inputs.mjs:60-68`). The PRD's own glob invariant covered subdirectory renames, not the root. Remedy: a coverage assertion binding the resolved configured path to the declared glob — the same shape PRD-036's FR-2 census sketches; coordinate rather than duplicate. **P2s:** the re-anchored Success Metric still labels one inert token as "reaching the gate" (it is excluded at `safety.ts:51-58`; the value is zero or the label changes); two restatements overstate the fifth argument ("skips/disables the value header check" in Memory Inputs and §12) where the owning FR is exact — omission skips only missing-header enforcement from `enforceFrom`, arithmetic and malformed-header checks still run (`value-score.ts:189`); the PRD-034 example says it "declares no §4 FR section at all" where PRD-034 has the literal heading with zero numbered `**FR-N**` entries (`prd-ready.ts:121`'s actual diagnostic); the older Changelog row still carries three superseded claims and should be marked superseded rather than rewritten. **Corpus drift, third instance in one day:** PRD-036's creation (the deferral-cap conversion) made the corpus ten files and sixty rows again — the dated 2026-07-28 nine-file measurement in FR-2 aged within hours of being written, which is precisely why the FR enumerates the directory instead of pinning a count. **CLOSED with citations:** the turbo strategy at the gate level (all three parts verified against `verify-turbo-inputs.mjs:60-68,72-77`, exceptions `{}`, `schema.json:585`), the duplicate-section chain proof (§11 row + hard-cap line), the zero-section distinction (`chain.test.ts:173` body is the word `nothing`), the fixture census — **independently recounted at sixteen rows in six files with all eleven locations cited**, and the four-fixture/narrowing-history sweeps (sole survivor: the historical Changelog row). **Verified exact:** `cli.ts:795` five-argument call, `enforceFrom: 17` (`workflow.config.json:18`), `turbo.json:15` no inputs today, all three workspaces carry test scripts (the stated invalidation cost is real), PRD-021's archived `pnpm build` row at `_prds/completed/prd-021-governance-truth-up.md:1278`, and the live corpus: sixty rows, one canonical section each, zero malformed, the sole outside-Command token the inert `pack-manifest.json` in PRD-026. |
| 7   | 2026-07-28 | 7.33  | ITERATE | **Confirmation round on an unchanged document — every open finding re-verified against live source rather than carried on faith, and the corpus re-measured after PRD-021's close.** Dimension scores (infra weights): Clarity 8.0, Completeness 6.5, Tech Depth 7.0, Multi-Tenancy 9.0, Scope & Testability 7.5, Migration & Rollback 7.0 → 7.325. **(AE, CONFIRMED OPEN)** `verify-turbo-inputs.mjs:60-68` refuses any cached task carrying `inputs` unless named in `turbo-inputs-exceptions.json` — measured `{}` today — and that check runs inside the `verify:workflow` bundle FR-2's own floor requires green. The `$TURBO_ROOT$`/`$TURBO_DEFAULT$` forms and the exceptions entry are still absent from the text, and the exceptions file from every target list. The sanctioned path is the one the verifier's own header states — an exceptions entry with a written reason — and the FR should take it explicitly. **(corpus, WORSE)** `gate check` run across all ten wip PRDs: **four are red today** — PRD-026 (three missing memory dispositions), PRD-030 (one), PRD-031 (two), PRD-034 (no FR section) — while the §11 substance holds exactly: 70 FR rows *(scorer correction 2026-07-28: **60** — the counting script also matched each table's header row, one per file; independent recount by the remediation session at the readiness commit; qualitative claims unaffected)*, zero malformed, exactly one canonical verification section per file, re-measured by cell-splitting every row. So FR-1's relaxation claim survives and FR-2's expectation model does not: a per-file-outcome corpus test cannot be written green today, allowlisting is forbidden by the FR itself, and none of the four reds is anything FR-1 changes. The FR must either state the corpus-green prerequisite it currently denies having, or scope its per-file assertion to the §11 issue class this PRD introduces — which its own "report, never edit" paragraph almost says. **(AD residual, NARROWED)** `chain.test.ts:173-183`'s fixture contains a `## 11.` heading whose body is the word `nothing` — one section, no runnable rows *(scorer correction 2026-07-28: originally written "empty body"; the bind claim — one-section-not-zero-sections — stands either way)* — so it binds one-section-no-rows, not zero-sections, exactly as iteration 6 read it; the §11 chain row now claims the zero-section case, but the **duplicate-section chain refusal** — FR-1's own "two or more sections is a parser issue and the chain refuses" — is assigned to no chain test anywhere in §11; only the lint test covers duplicates. **(stale measurements, NEW)** PRD-021 closed 2026-07-27 and its archive removed §1's only allowlisted-command instance from the wip corpus: the live hazard count is now **zero** (PRD-027's `sections/content.ts` token is gone too; only PRD-026's inert `pack-manifest.json` remains), so "one live instance … is the whole case for this work" is a dated claim that should re-anchor on the archived measurement or on the class. Line anchors drifted the same way: the missing-root refusal now sits at `prd-ready.ts:181-185`, the whole-row scan at `:133-148` — PRD-021's fifth parameter moved them. P2s carried: the DO NOT still says "three existing fixtures" where FR-1 counts four; Non-Goals and References still say every blocking finding came from the §9 half where the introduction was corrected to "closed after round two" — `a-rule-corrected-survives-where-it-is-restated`, still live in the document that cites it. **Confirmed exact this round:** `chain.ts:491` and `:787-790`, `gates/index.ts:16`, `safety.test.ts:62/89/94/112`, the two-column fixtures in `prd-ready.test.ts`, `chain.test.ts:48` and `single-package.test.ts:100-119`, `markdown.ts:90` first-match and `:74` case-insensitive heading pattern, and the four-fixture two-cell census. |
| 6   | 2026-07-27 | 7.34  | ITERATE | **Down 0.46 from the wave's high-water mark.** Two of the three [P1]s are the iteration-5 fixes failing at a level below where they were written. **(AE, OPEN)** the turbo remediation is wrong three ways: task `inputs` are **package-relative**, so a root corpus needs `$TURBO_ROOT$/_prds/**`; specifying `inputs` **replaces** the package defaults, so it needs `$TURBO_DEFAULT$`; and — the blocker — `scripts/verify/verify-turbo-inputs.mjs:61-68` **rejects any cached task carrying `inputs`** unless named in `turbo-inputs-exceptions.json`, which is `{}` today, and that check runs inside the `verify:workflow` bundle this PRD's own floor requires green. As specified, FR-2 fails its own verification, and the exceptions file is in no target list. **(AD, PARTIALLY CLOSED)** the zero-versus-duplicate split is coherent in prose and unproven in evidence: the cited `chain.test.ts:173-183` fixture **contains** a `## 11.` heading, so it binds *one empty section*, not zero sections, and the duplicate case is assigned to the lint test while the chain test covers only malformed rows. An implementation could get either case backwards and still satisfy the named proofs. **(new)** the live wip corpus is **red today** — PRD-026 fails readiness because it targets `_prds/README.md` while omitting a disposition for `a-rule-corrected-survives-where-it-is-restated`, an active record whose watch covers `_prds/**` — so this PRD's "no corpus prerequisite" is false as of this round and must be re-measured or recorded. P2s: the broader glob's cross-workspace invalidation cost is unstated — `turbo.json:15-17` is the generic `test` task, so every workspace pays; the DO NOT list still says "three existing fixtures" where FR-1 now correctly says four; and **the narrowing-history correction reached the introduction but not Non-Goals, References or the changelog**, which is `a-rule-corrected-survives-where-it-is-restated` demonstrated by the document that record was written about. |
| 5   | 2026-07-27 | 7.80  | ITERATE | **First round against the narrowed PRD; not comparable to 1–4, which scored the combined document.** 7.80 is the highest score reached anywhere in this wave and 0.20 from PASS, which is the clearest evidence yet that the §9 half was the drag. Two [P1]s. **(AD)** the missing-section outcome contradicts itself: FR-1 makes zero verification sections a parser issue and `buildGateChain` refuses on any issue, while the acceptance criteria simultaneously require a missing section to keep today's required-empty Phase-5 path (`chain.ts:787-790`, bound by `chain.test.ts:173-183`). Those are different refusal mechanisms; one must give. **(AE)** the config-driven corpus and the static cache input can drift: FR-2 resolves the wip directory from config so a rename is followed, but turbo `inputs` is a static glob list (`schema.json:585-590`), so after a rename the test reads the new directory while caching still watches the old one. Name the exact glob and the rename invariant, or choose a broader input. P2s: the corpus count is stale at six — PRD-028 appeared between writing and scoring, making it seven — though all seven are green; the narrowing history overstates, since iterations 1 and 2 **did** raise §11 [P1]s and the accurate claim is that they were resolved after round two, not that they never existed; and the two-column fixture census names three files where `single-package.test.ts:100-119` is a fourth, though the aggregate count of fifteen rows is right. **Measurement verdicts: the three-token claim CONFIRMED exactly; the corpus claim WRONG on the count and confirmed on the substance — 73 rows, zero malformed, one canonical section each, no prerequisite.** |
| 4   | 2026-07-27 | 6.95  | ITERATE | **Fourth independent round, and the one that falsified the working hypothesis.** Iteration 3 introduced no new requirements — every edit closed a reported finding — and the score still fell 0.45. The predictor is not novelty but **measurement of consequences**. Seven [P1]s. **(K, fourth level)** rationale was moved into an HTML comment and FR-3's grammar permits comments, so `- (none)` followed by `<!-- Who owns the authorization decision? -->` hides a question — and the PRD's own §9 now does exactly that. The fix created the hiding place it moved into. **(X)** requiring "exactly one section" counts matches of `.*Open Questions.*`, which is case-insensitive and substring-based (`markdown.ts:74`), so a document whose only heading is `## Resolved Open Questions` has exactly one match and passes — the precise trap the PRD warns about elsewhere. **(Y)** the cardinality fix covers §9 only; §11 and the FR block have the same first-match-only behavior (`safety.ts:45`, `prd-ready.ts:28,127`), so a malformed row in a second `## 11.` section stays invisible, contradicting the verification claim that the chain refuses when *any* row is malformed. **(Z)** the two-vs-three cell contradiction survives in the **Gherkin criterion**, which still says three where FR-1 and §11 say two; extra-cell behavior beyond four is also undefined. **(AA)** the exact exemption rejects `- (none — resolved)`, which `prd-ready.test.ts:23` uses and `:38-40` expects to pass — so "no existing readiness fixture changed meaning" is false, and that file is in neither Targets, Scope, nor Conflict Surface, as is `chain.test.ts`, which the PRD names as required proof. **(AB)** PRD-021 is not the only corpus blocker: PRD-023, PRD-025 and PRD-026 all carry `(none)` plus trailing prose, and PRD-027 uses a checkbox form — so remediating PRD-021 alone cannot green the corpus while allowlisting is forbidden. **(AC)** FR-4 still leaves the Turbo strategy as an either/or with materially different blast radii and names no command or manifest for the second. P2s: the deferral grammar does not define case, whitespace, or link syntax; the round count still says six in the introduction and four in the changelog. Confirmed: the two-cell threshold **is** the correct compatibility floor, measured across 15 literal fixture rows in five files — ten 2-cell, four 3-cell, one 4-cell; the export-preserving split is right; and the dynamic corpus definition genuinely removed the stale-count defect. |
| 3   | 2026-07-27 | 7.40  | ITERATE | **Third independent round; +0.57, the second-largest single-round gain in this wave.** J **CLOSED** — the exported signature is preserved and the internal split is implementable without touching `gates/index.ts`. L **CLOSED at the reported level**, with the missing regression surfaces raised as a new adjacent finding. H **CLOSED**. K **PARTIALLY CLOSED**, G **PARTIALLY CLOSED**, I **OPEN**. Three new [P1]s. **(K, third level)** refusing continuations was not enough: the exemption is keyed to how a bullet *opens*, so `- (none) — why is auth still undecided?` and `- Deferred to PRD-123 — but who owns authorization?` both pass while carrying the question, and the PRD's own §9 demonstrated that trailing prose is permitted. The same argument that rejected continuations rejects trailing prose. **(V)** a question can hide in a **second** Open Questions section, and a document with **none** reports zero: `sectionMatching` returns the first match and `''` when absent (`markdown.ts:90`), and nothing requires exactly one. **(W)** "malformed row" was underdefined — the PRD said "does not split into cells" in one place and "at least three cells" in two others, and three existing fixtures declare two-column `\| FR \| Command \|` tables (`safety.test.ts:89`, `prd-ready.test.ts:25`, `chain.test.ts:48`). A three-cell minimum would have made all three malformed, changed `lintPrd`'s verdict and tripped the new chain guard, breaking the PRD's own binding rule that no existing test may need editing. No direct test of the chain refusal was required either. P2s: the Non-Goals blast radius still claimed two files against a scope of eight; the rollback omitted the `buildGateChain` guard; Technical Considerations still called the PRD unordered; the round count still contradicted itself two lines apart; and the wip corpus count went stale again when PRD-027 appeared mid-round. Confirmed: the parser split needs no export change, the stated residual is honest, the iteration-2 continuation vector is genuinely closed, the existing no-§11 behavior is bound by `chain.test.ts:173`, and PRD-021's §9 is still paragraph-form so the prerequisite is real. |
| 2   | 2026-07-27 | 6.83  | ITERATE | **Second independent round, on the iteration-1 remediation.** E (the `lintPrd` root argument) and F (turbo inputs) **CLOSED**; A, B, C, D, G, H **PARTIALLY CLOSED**; I **OPEN**. Two new [P1]s, both introduced by the remediation. **(J)** `parseVerificationCommands` is exported from the package's programmatic API (`gates/index.ts:16`) and consumed as an array by `safety.test.ts:62` and `content-templates.test.ts:104`, so widening it to `{commands, issues}` is a **public API break** — while the PRD still claims no published-surface migration and ships no changeset. Keep an array-returning wrapper and add an internal detailed parser, or specify the migration. **(K)** the hiding place moved one level down: FR-2 exempts a bullet by how it **opens** and FR-3 permits arbitrary indented **continuations**, so `- (none)` followed by an indented unresolved question satisfies both and hides exactly what the FR removes. Exempt forms must be single-line, or continuations beneath an exempt bullet must be refused; two deny fixtures. **(L)** FR-1 cannot be implemented inside its declared surface: it requires edits to `chain.ts` and `prd-ready.ts`, neither of which is in its Targets, Implementation Scope, or Conflict Surface, and the affected existing tests are absent too. P2s: the PRD-021 prerequisite was added in FR-4 but the introduction still calls this PRD dependency-free and Non-Goals still calls it a "known case"; the header still says only verdicts move while the corrected rollback says Phase-5 commands change; and the round count now contradicts itself **within two lines** — the fix for I created a new instance of I. |
| 1   | 2026-07-27 | 6.75  | ITERATE | **First independent round on the split-out PRD.** Six [P1]s, all specification gaps rather than contradictions. The headline is finding A: `lintPrd` carries a **second** whole-row backtick scan independent of `parseVerificationCommands`, so scoping one parser leaves the other — a fourth instance of this PRD's own defect class, inside the PRD written to remove it. Also: the malformed-row requirement has no channel to report through; FR-2's "link or work-item id" is still substring-satisfiable; FR-3's leading-explanatory-line allowance re-creates the paragraph exemption and the grammar does not cover wrapped bullets, which this PRD's own `(none)` bullet is; the corpus fixture omits `lintPrd`'s fourth argument, measured to fail with an unrelated memory error; and the corpus test reads `_prds/wip` outside Turbo's declared inputs, which is the indexed `turbo-cache-masks-out-of-input-reads` record the PRD did not declare. Confirmed: all three assigned defects carried over accurately, the `verify:workflow` diagnosis is correct, config-driven wip enumeration is implementable, and the no-pipe template contract is real. |

---

## Verdict

**PASS — 8.35/10, iteration 9.**

Nine rounds, four scorers (Codex ×6, Claude Fable 5 ×2, the split's own authors ×0),
and the document that emerges is the strongest form of a small idea: one reader, scoped
to the span its claim is about, with an issue class you can grep and a cache key you can
audit. Every rule that survived did so by being made exact — the row grammar measured
against sixteen fixtures, the issue class enumerated as five string predicates, the
corpus assertion decoupled from three red files it cannot affect, the turbo input tied
to the config it watches. **A concurring independent round the same day scored 8.18 PASS
(quorum 2/2)** — a scorer with no hand in the work orders, colliding in the working tree
rather than coordinating, which upgrades the integrity caveat above from a promise to a
verified fact. The seven watch items above (W1–W5, plus the concurring round's W6–W7)
bind Phase 3 and Phase 6; the owner's Go opens Phase 3. Model tiers high / high.

*(Iteration 1 verdict, for history: ITERATE 6.75 — "the carry-over is faithful; the
specification is not yet falsifiable." That diagnosis no longer describes the document.)*
