# Readiness Assessment: PRD-024 — Readiness Lint Parsers

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

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-024-readiness-lint-parsers.md`   |
| Score                  | 7.34/10                                        |
| Verdict                | ITERATE — three [P1] items. The cache-input fix is blocked by a wired gate, the missing-section proof does not prove what it claims, and the live corpus is red on an unrelated memory-contract drift |
| Iteration              | 6                                              |
| Model Tier (Execution) | do not assign — score < 8                      |
| Model Tier (Audit)     | high (on a PASS)                               |
| Scored by              | **Codex (gpt-5.x) via the `/codex` skill — independent, different model family, did not write the PRD** |
| Self-scored            | **no**                                         |
| Date                   | 2026-07-27                                     |
| PRD Lint               | passed — `lintPrd` green by direct invocation with the real config, manifest, content **and root**. The CLI wrapper was not used: `findRecord` writes `_state/prds.json` (`cli.ts:483-492`), which the read-only sandbox refused |
| State Record           | updated — `gate status` re-run after saving    |

<!-- Verdict values: PASS | ITERATE | REJECT. The Score row and Verdict row are parsed
by the state builder — keep the `| Score |` and `| Verdict |` labels intact. -->

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Execution (Phase 4) | do not assign | score below the PASS band |
| Audit (Phase 6)     | high | parser changes with a corpus blast radius |

---

## Analysis

### Findings

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

## Missing Pieces (watch items — binding on Phase 3 and Phase 6)

- Scope both §11 readers through one tested Command-cell parser.
- Define malformed-row error propagation through readiness **and** execution.
- Replace FR-2 and FR-3's prose rules with closed, testable grammars.
- Require the real `lintPrd(config, manifest, content, root)` call shape.
- Wire root corpus paths into Turbo inputs, or provide a guaranteed uncached sweep; declare
  `turbo-cache-masks-out-of-input-reads` as a Memory Input.
- Declare the PRD-021 ordering dependency and document FR-1's effect on existing PRDs.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 6   | 2026-07-27 | 7.34  | ITERATE | **Down 0.46 from the wave's high-water mark.** Two of the three [P1]s are the iteration-5 fixes failing at a level below where they were written. **(AE, OPEN)** the turbo remediation is wrong three ways: task `inputs` are **package-relative**, so a root corpus needs `$TURBO_ROOT$/_prds/**`; specifying `inputs` **replaces** the package defaults, so it needs `$TURBO_DEFAULT$`; and — the blocker — `scripts/verify/verify-turbo-inputs.mjs:61-68` **rejects any cached task carrying `inputs`** unless named in `turbo-inputs-exceptions.json`, which is `{}` today, and that check runs inside the `verify:workflow` bundle this PRD's own floor requires green. As specified, FR-2 fails its own verification, and the exceptions file is in no target list. **(AD, PARTIALLY CLOSED)** the zero-versus-duplicate split is coherent in prose and unproven in evidence: the cited `chain.test.ts:173-183` fixture **contains** a `## 11.` heading, so it binds *one empty section*, not zero sections, and the duplicate case is assigned to the lint test while the chain test covers only malformed rows. An implementation could get either case backwards and still satisfy the named proofs. **(new)** the live wip corpus is **red today** — PRD-026 fails readiness because it targets `_prds/README.md` while omitting a disposition for `a-rule-corrected-survives-where-it-is-restated`, an active record whose watch covers `_prds/**` — so this PRD's "no corpus prerequisite" is false as of this round and must be re-measured or recorded. P2s: the broader glob's cross-workspace invalidation cost is unstated — `turbo.json:15-17` is the generic `test` task, so every workspace pays; the DO NOT list still says "three existing fixtures" where FR-1 now correctly says four; and **the narrowing-history correction reached the introduction but not Non-Goals, References or the changelog**, which is `a-rule-corrected-survives-where-it-is-restated` demonstrated by the document that record was written about. |
| 5   | 2026-07-27 | 7.80  | ITERATE | **First round against the narrowed PRD; not comparable to 1–4, which scored the combined document.** 7.80 is the highest score reached anywhere in this wave and 0.20 from PASS, which is the clearest evidence yet that the §9 half was the drag. Two [P1]s. **(AD)** the missing-section outcome contradicts itself: FR-1 makes zero verification sections a parser issue and `buildGateChain` refuses on any issue, while the acceptance criteria simultaneously require a missing section to keep today's required-empty Phase-5 path (`chain.ts:787-790`, bound by `chain.test.ts:173-183`). Those are different refusal mechanisms; one must give. **(AE)** the config-driven corpus and the static cache input can drift: FR-2 resolves the wip directory from config so a rename is followed, but turbo `inputs` is a static glob list (`schema.json:585-590`), so after a rename the test reads the new directory while caching still watches the old one. Name the exact glob and the rename invariant, or choose a broader input. P2s: the corpus count is stale at six — PRD-028 appeared between writing and scoring, making it seven — though all seven are green; the narrowing history overstates, since iterations 1 and 2 **did** raise §11 [P1]s and the accurate claim is that they were resolved after round two, not that they never existed; and the two-column fixture census names three files where `single-package.test.ts:100-119` is a fourth, though the aggregate count of fifteen rows is right. **Measurement verdicts: the three-token claim CONFIRMED exactly; the corpus claim WRONG on the count and confirmed on the substance — 73 rows, zero malformed, one canonical section each, no prerequisite.** |
| 4   | 2026-07-27 | 6.95  | ITERATE | **Fourth independent round, and the one that falsified the working hypothesis.** Iteration 3 introduced no new requirements — every edit closed a reported finding — and the score still fell 0.45. The predictor is not novelty but **measurement of consequences**. Seven [P1]s. **(K, fourth level)** rationale was moved into an HTML comment and FR-3's grammar permits comments, so `- (none)` followed by `<!-- Who owns the authorization decision? -->` hides a question — and the PRD's own §9 now does exactly that. The fix created the hiding place it moved into. **(X)** requiring "exactly one section" counts matches of `.*Open Questions.*`, which is case-insensitive and substring-based (`markdown.ts:74`), so a document whose only heading is `## Resolved Open Questions` has exactly one match and passes — the precise trap the PRD warns about elsewhere. **(Y)** the cardinality fix covers §9 only; §11 and the FR block have the same first-match-only behavior (`safety.ts:45`, `prd-ready.ts:28,127`), so a malformed row in a second `## 11.` section stays invisible, contradicting the verification claim that the chain refuses when *any* row is malformed. **(Z)** the two-vs-three cell contradiction survives in the **Gherkin criterion**, which still says three where FR-1 and §11 say two; extra-cell behavior beyond four is also undefined. **(AA)** the exact exemption rejects `- (none — resolved)`, which `prd-ready.test.ts:23` uses and `:38-40` expects to pass — so "no existing readiness fixture changed meaning" is false, and that file is in neither Targets, Scope, nor Conflict Surface, as is `chain.test.ts`, which the PRD names as required proof. **(AB)** PRD-021 is not the only corpus blocker: PRD-023, PRD-025 and PRD-026 all carry `(none)` plus trailing prose, and PRD-027 uses a checkbox form — so remediating PRD-021 alone cannot green the corpus while allowlisting is forbidden. **(AC)** FR-4 still leaves the Turbo strategy as an either/or with materially different blast radii and names no command or manifest for the second. P2s: the deferral grammar does not define case, whitespace, or link syntax; the round count still says six in the introduction and four in the changelog. Confirmed: the two-cell threshold **is** the correct compatibility floor, measured across 15 literal fixture rows in five files — ten 2-cell, four 3-cell, one 4-cell; the export-preserving split is right; and the dynamic corpus definition genuinely removed the stale-count defect. |
| 3   | 2026-07-27 | 7.40  | ITERATE | **Third independent round; +0.57, the second-largest single-round gain in this wave.** J **CLOSED** — the exported signature is preserved and the internal split is implementable without touching `gates/index.ts`. L **CLOSED at the reported level**, with the missing regression surfaces raised as a new adjacent finding. H **CLOSED**. K **PARTIALLY CLOSED**, G **PARTIALLY CLOSED**, I **OPEN**. Three new [P1]s. **(K, third level)** refusing continuations was not enough: the exemption is keyed to how a bullet *opens*, so `- (none) — why is auth still undecided?` and `- Deferred to PRD-123 — but who owns authorization?` both pass while carrying the question, and the PRD's own §9 demonstrated that trailing prose is permitted. The same argument that rejected continuations rejects trailing prose. **(V)** a question can hide in a **second** Open Questions section, and a document with **none** reports zero: `sectionMatching` returns the first match and `''` when absent (`markdown.ts:90`), and nothing requires exactly one. **(W)** "malformed row" was underdefined — the PRD said "does not split into cells" in one place and "at least three cells" in two others, and three existing fixtures declare two-column `\| FR \| Command \|` tables (`safety.test.ts:89`, `prd-ready.test.ts:25`, `chain.test.ts:48`). A three-cell minimum would have made all three malformed, changed `lintPrd`'s verdict and tripped the new chain guard, breaking the PRD's own binding rule that no existing test may need editing. No direct test of the chain refusal was required either. P2s: the Non-Goals blast radius still claimed two files against a scope of eight; the rollback omitted the `buildGateChain` guard; Technical Considerations still called the PRD unordered; the round count still contradicted itself two lines apart; and the wip corpus count went stale again when PRD-027 appeared mid-round. Confirmed: the parser split needs no export change, the stated residual is honest, the iteration-2 continuation vector is genuinely closed, the existing no-§11 behavior is bound by `chain.test.ts:173`, and PRD-021's §9 is still paragraph-form so the prerequisite is real. |
| 2   | 2026-07-27 | 6.83  | ITERATE | **Second independent round, on the iteration-1 remediation.** E (the `lintPrd` root argument) and F (turbo inputs) **CLOSED**; A, B, C, D, G, H **PARTIALLY CLOSED**; I **OPEN**. Two new [P1]s, both introduced by the remediation. **(J)** `parseVerificationCommands` is exported from the package's programmatic API (`gates/index.ts:16`) and consumed as an array by `safety.test.ts:62` and `content-templates.test.ts:104`, so widening it to `{commands, issues}` is a **public API break** — while the PRD still claims no published-surface migration and ships no changeset. Keep an array-returning wrapper and add an internal detailed parser, or specify the migration. **(K)** the hiding place moved one level down: FR-2 exempts a bullet by how it **opens** and FR-3 permits arbitrary indented **continuations**, so `- (none)` followed by an indented unresolved question satisfies both and hides exactly what the FR removes. Exempt forms must be single-line, or continuations beneath an exempt bullet must be refused; two deny fixtures. **(L)** FR-1 cannot be implemented inside its declared surface: it requires edits to `chain.ts` and `prd-ready.ts`, neither of which is in its Targets, Implementation Scope, or Conflict Surface, and the affected existing tests are absent too. P2s: the PRD-021 prerequisite was added in FR-4 but the introduction still calls this PRD dependency-free and Non-Goals still calls it a "known case"; the header still says only verdicts move while the corrected rollback says Phase-5 commands change; and the round count now contradicts itself **within two lines** — the fix for I created a new instance of I. |
| 1   | 2026-07-27 | 6.75  | ITERATE | **First independent round on the split-out PRD.** Six [P1]s, all specification gaps rather than contradictions. The headline is finding A: `lintPrd` carries a **second** whole-row backtick scan independent of `parseVerificationCommands`, so scoping one parser leaves the other — a fourth instance of this PRD's own defect class, inside the PRD written to remove it. Also: the malformed-row requirement has no channel to report through; FR-2's "link or work-item id" is still substring-satisfiable; FR-3's leading-explanatory-line allowance re-creates the paragraph exemption and the grammar does not cover wrapped bullets, which this PRD's own `(none)` bullet is; the corpus fixture omits `lintPrd`'s fourth argument, measured to fail with an unrelated memory error; and the corpus test reads `_prds/wip` outside Turbo's declared inputs, which is the indexed `turbo-cache-masks-out-of-input-reads` record the PRD did not declare. Confirmed: all three assigned defects carried over accurately, the `verify:workflow` diagnosis is correct, config-driven wip enumeration is implementable, and the no-pipe template contract is real. |

---

## Verdict

**ITERATE — 6.75/10, iteration 1, scored independently by Codex.**

The carry-over is faithful; the specification is not yet falsifiable. Three of the four FRs
describe a rule in prose where the implementer needs a grammar, and two of the proposed
proofs cannot fail for their stated reason. None of this is a scope problem — the split put
the right three defects in one small document — so a remediation round here has a much
narrower surface than any round PRD-023 ever had.
