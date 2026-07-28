# Readiness Assessment: PRD-028 — Open Questions Grammar

> **Iteration 3 (Codex, independent) — 6.48/10, ITERATE; the traceability cap is STILL
> tripped, by a seventh hiding place the closed grammar itself permits.** Scored the
> 2026-07-28 owner-directed narrowing rewrite (`92953c1`). Orchestration disclosure: the
> rewrite's author ran this round and verified every load-bearing citation against source
> (id width, the artifact parser, turbo inputs, the memory-store read — all reproduced),
> but authored none of the verdicts; Codex is the scorer, as in iterations 1–2.
>
> **The decisive test failed again**: `- Deferred to [PRD-028](_prds/wip/prd-028-…md)` —
> a PRD deferring to **itself** — satisfies every predicate FR-1 states (label pattern,
> path containment, existence, basename number match) while being no *follow-up* at all;
> completed and unregistered look-alike targets pass the same way, and the PRD's stated
> `PRD-\d+` pattern ignores the configured three-digit width (`defaults.ts:26-29`). The
> remedy is structural but small: resolve the link through the existing artifact/state
> parser and require a **distinct, registered, active** follow-up. Two more [P1]s are the
> rewrite's own: **FR-4 ships the guidance as an HTML comment inside §9**, which the
> closed grammar itself refuses — every template-instantiated PRD would fail out of the
> box; and **FR-3's Phase-3 record cannot equal the runtime oracle** once prerequisites
> are repaired. One cross-item find with reach beyond this PRD: `lintPrd` loads the
> `_brain` memory store (`prd-ready.ts:212`) and `_brain/**` is in nobody's turbo test
> inputs — **including shipped PRD-024's** — so a memory-store edit can replay a stale
> corpus green today; missing piece 6 assigns the fix here. What held: B, C, E closed
> with citations (the scanner route is implementable; seven rows count consistently
> everywhere; both fixture invalidations are real and declared), D and F materially
> improved, all caps except traceability clear, and the five-argument lint call verified
> at `cli.ts:789-795`.
>
> <details><summary>Iteration 2 (6.55 ITERATE, Codex)</summary>
>
> **Iteration 2 (Codex, independent) — 6.55/10, ITERATE — and a HARD CAP is tripped.** The
> score rose 0.37 and that is not the headline. **A sixth hiding place exists**, and it is in
> the form the PRD adopted specifically because it was supposed to have none:
> `Deferred to [PRD-123](_prds/wip/prd-123-who-owns-authorization.md)` satisfies every stated
> predicate while the basename **suffix** is author-controlled free text and the target need
> not exist. Because nothing proves the link points at a follow-up PRD, the rule does **not**
> implement the snapshot line it claims to restore — which trips the **method-content
> traceability cap**. That is a REJECT-class signal independent of the score, and the
> Method-Fidelity 5 that lifted this item over the value threshold rests on the same
> disproved premise: at MF 4 the total is 3.30, below 3.40 again.
>
> <details><summary>Iteration 1 (6.18 ITERATE)</summary>
>
> **Iteration 1 (Codex, independent) — 6.18/10, ITERATE.** Seven [P1]s, and the first one
> falsifies the PRD's central thesis: **"the exempt form carries no free text" is false of
> the form the PRD chose.** `Deferred: [Who owns authorization?](background.md)` is an exact
> exempt form carrying an unresolved question in the link label. That is the **fifth**
> hiding place, found in the round after the PRD declared a fifth would be evidence the
> approach is wrong. By its own DO NOT list, that evidence has now arrived.
>
> A second finding is nearly as sharp: the reader the PRD prescribes blanks fenced and raw
> HTML lines to empty strings, which the grammar calls "blank", and **retains** the trailing
> `---` separator, which the grammar forbids — so under the literal rule **every** §9 in the
> repository fails, including this PRD's own.

> </details>
> </details>

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-028-open-questions-grammar.md`   |
| Score                  | 6.48/10                                        |
| Verdict                | ITERATE — three [P1] items and the **method-content traceability hard cap still tripped**: the closed form admits a self-link (a seventh hiding place — existence and number agreement do not establish a distinct follow-up), FR-4 ships template guidance the grammar itself refuses, and FR-3's Phase-3 record cannot stay equal to the runtime oracle |
| Iteration              | 3                                              |
| Model Tier (Execution) | do not assign — score < 8                      |
| Model Tier (Audit)     | high (on a PASS)                               |
| Scored by              | **Codex (gpt-5.x) via the `/codex` skill — independent, different model family, did not write the PRD. Orchestrated by the rewrite's author, who verified citations and authored no verdicts; caveat stated in the banner** |
| Self-scored            | **no**                                         |
| Date                   | 2026-07-28                                     |
| PRD Lint               | passed — Codex ran the five-argument call `lintPrd(config, manifest, content, root, 28)` → `{ ok: true, issues: [] }`, matching the production shape at `cli.ts:789-795`; the orchestrating session's `gate check PRD-028` exit 0 on the same document |
| State Record           | updated — `gate status` re-run after saving    |

<!-- Verdict values: PASS | ITERATE | REJECT. The Score row and Verdict row are parsed
by the state builder — keep the `| Score |` and `| Verdict |` labels intact. -->

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Execution (Phase 4) | do not assign | score below the PASS band, and the central approach is unsettled |
| Audit (Phase 6)     | high | a grammar change with a corpus-wide blast radius |

---

## Analysis

### Findings — iteration 3 (Codex, independent; scored the 2026-07-28 rewrite `92953c1`)

**Prior items:** B, C, E **CLOSED** with citations (`scanDocument`/`sectionBounds` exported
from `core/memory/scan.ts:157-175,515-543`, so the raw-line route is implementable; seven
rows counted consistently across metrics, FR-1, Gherkin, §11 and DO NOT; both
`prd-ready.test.ts` invalidations real at `:13-39` and `:424-436` and declared). D and F
**PARTIALLY CLOSED** — the procedure replaces the stale table but the wip directory now
holds **eight** PRDs with **five** failing, several needing comment/continuation cleanup
rather than the claimed one-line tail edits; turbo carries all three PRD-024 inputs and
the coverage assertion (`turbo.json:15-22`, `lint-parsers.test.ts:197-217`), but see the
new memory-store finding. A and G **OPEN**, upgraded below.

**[P1] H — the seventh hiding place: a self-link (and its cousins) satisfies the closed
form.** `- Deferred to [PRD-028](_prds/wip/prd-028-open-questions-grammar.md)` passes
every FR-1 predicate — label pattern, containment, existence, basename number match —
while deferring the PRD **to itself**; a completed PRD or a hand-created look-alike file
passes the same way, and FR-1's stated `PRD-\d+` ignores the configured three-digit
width (`config/defaults.ts:26-29`, `state/artifacts.ts:33-47`). Existence and number
agreement do not establish a **distinct, registered, active follow-up**, so the
method-content traceability cap stays tripped. Remedy: resolve the link through the
existing artifact/state parser; reject self, completed, malformed-width and unregistered
targets; one deny fixture per rejection.

**[P1] I — FR-4 makes the shipped template fail the grammar this PRD ships.** FR-4 puts
the exact-form guidance in the template's **§9 section comment**; FR-2 refuses every
comment line inside §9 — so a PRD instantiated from the template fails readiness out of
the box (`templates/prd-template.md:117-121`, `content-templates.test.ts:85-101`).
Remedy: the guidance sits immediately **before** the §9 heading, outside the judged
body, and the round-trip test asserts both the guidance text and a green lint on the
instantiated document.

**[P1] J — FR-3's Phase-3 record cannot stay equal to the runtime oracle.** The record
lists failures; the same failures must be repaired before Phase 4; the Gherkin and §11
then require runtime outcomes to *match the record*, which is stale by construction the
moment the prerequisites are fixed. Remedy: the Phase-3 record is discovery output; the
corpus test's oracle is **zero closed-grammar failures**, offenders reported by name.

**[P2, cross-item] K — `lintPrd` reads the `_brain` memory store and `_brain/**` is in
nobody's turbo test inputs.** `prd-ready.ts:212` loads the store when memory is enabled;
the `test` task inputs (shipped by PRD-024) name `_prds/**` and the two configs only —
so a memory-record edit can replay a stale corpus green **today, in the landed PRD-024
test as well as here**. Verified by the orchestrating session against `turbo.json` and
the call site. Missing piece 6 assigns the fix to this PRD (extend the inputs or
isolate the grammar test from store reads).

---

### Findings — iterations 1–2 (historical)

**[P1] A — the "no free text" exemption still contains free text, and this is the fifth
hiding place.** `Deferred: [text](target)` leaves the visible link **label** unrestricted, so
`Deferred: [Who owns authorization?](background.md)` is an exact exempt form carrying the
question (`prd-028:134`). The `Deferred to <id>` form has the opposite problem: it carries no
link at all, which both the PRD template (`templates/prd-template.md:117`) and the mandated
scorer (`phase-2-readiness-scorer.md:218`) require. **The PRD's own DO NOT list says a fifth
hiding place is evidence the approach is wrong rather than that the rule needs another
clause.** That evidence arrived in the first round after the claim was written.

**[P1] B — the prescribed reader cannot enforce the stated line grammar, in both
directions.** FR-2 permits only blank lines, bullet starts and indented continuations, and
directs the implementer to `sectionsMatching` (`markdown.ts:65`). That function converts
every non-text scanned line to `''` (`markdown.ts:82`, `scan.ts:157`), so **fenced code and
raw HTML become permitted "blank" lines** and a displayed question disappears from
validation. It also **retains the terminal `---`**, which the grammar forbids: direct
invocation returned `"\n\n- (none)\n\n---\n"` for **this PRD's own §9**. Under the literal
rule as written, every §9 in the repository fails.

**[P1] C — the four-round record was not transferred faithfully.** The original substring
defect **predates** the four independent rounds; those rounds found link-plus-word,
continuation, same-line tail, and comment. §1's table includes the substring case and
**omits the continuation**, then calls the result four hiding places. The inconsistency
propagates: FR-1 asks for four fixtures, §11 lists five, and the Gherkin section calls five
preceding cases "four" (`prd-028:56, 154, 255, 428`).

**[P1] D — FR-3's corpus table is incomplete and wrong, including about this wave's own
work.** There are **seven** configured wip PRDs. Ignoring the terminal-`---` defect, **six**
fail and only PRD-028 conforms — **PRD-024 itself has `(none)` plus a same-line tail**,
contrary to its "conforms" row, because its §9 was rewritten during the narrowing. Under the
literal FR-2 grammar all seven fail, for finding B's reason.

**[P1] E — the split left the known existing-fixture break dangling.**
`prd-ready.test.ts:13` uses `(none — resolved)` and `:38` expects it to pass; the same file
also lints completed PRD-002 at `:424`, whose exemption carries a tail and a continuation
(`prd-002:332`). Both necessarily fail FR-1, yet `prd-ready.test.ts` is in neither Targets,
Implementation Scope nor Conflict Surface, while the verification floor promises existing
tests stay unchanged. This finding was raised against the predecessor and travelled with the
defect rather than with its fix.

**[P1] F — the Turbo branch is not executable as scoped.** FR-3 says this PRD declares the
wip input if PRD-024 has not landed, but `turbo.json` is in neither Targets nor the Conflict
Surface, and the PRD simultaneously claims no hard ordering against PRD-024
(`prd-028:227, 301, 326, 394`).

**[P1] G — the Value header is arithmetically wrong and crosses the candidate threshold.**
The declared dimensions compute to **3.30**, exactly as the PRD's own comment says, not the
3.50 in the header. The repository threshold is 3.40 (`AGENT_BOOTSTRAP.md:174-177`), so this
is not display drift: **as scoped, PRD-028 is not a valid candidate** and falls under the
expand-don't-delete rule — broaden it to absorb adjacent problems and re-score, cutting only
after two failed expansions with recorded rationale.

### What Codex confirmed

The substring-exemption and first-match/zero-section diagnoses match `prd-ready.ts` and
`markdown.ts` exactly. Exact heading identity and zero/duplicate rejection are the right
rules, and all seven current wip PRDs use one canonical §9 and one canonical FR section, so
those narrowings cost nothing. **Splitting FR-block cardinality here while leaving §11's in
PRD-024 does not create a seam** — each supports its owning PRD's claim and both already
serialize on `prd-ready.ts`. The four-argument corpus call shape is correct. Case and
whitespace behavior, the no-allowlist policy, and the rollback asymmetry are specified
clearly.

---

## Scorecard

Class `infra` weights, per `packages/provegate/prompts/phase-2-readiness-scorer.md`.

| #         | Dimension                | Weight | Score      | Notes |
| --------- | ------------------------ | ------ | ---------- | ----- |
| 1         | Clarity                  | 15%    | 6.0/10     | Detailed FRs, but the deny-matrix count conflicts across three sections and conditional targets are absent. |
| 2         | Completeness             | 20%    | 5.5/10     | The purported closed form retains free text, and the live corpus and existing-test effects are missing. |
| 3         | Technical Depth          | 20%    | 5.5/10     | Strong diagnosis, undermined by a prescribed reader that erases the constructs the grammar intends to reject. |
| 4         | Multi-Tenancy & Security | 10%    | 9.5/10     | No tenant, auth, route, query, or protected data surface. |
| 5         | Scope & Testability      | 15%    | 5.5/10     | Good positive-control intent, but existing regressions and two new bypass shapes are uncovered. |
| 6         | Migration & Rollback     | 20%    | 6.5/10     | Revert is simple; prerequisites, fixture migration and Turbo ordering are understated. |
| **Total** | **Weighted**             |        | **6.18/10** | **ITERATE** |

Weighted sum:
`0.15×6.0 + 0.20×5.5 + 0.20×5.5 + 0.10×9.5 + 0.15×5.5 + 0.20×6.5`
= `0.900 + 1.100 + 1.100 + 0.950 + 0.825 + 1.300 = 6.175` → 6.18.

Hard caps: none mechanically tripped. Security, contract, runtime-dependency, push-path and
method-content caps each checked. The lint cap is clear by direct invocation. **The value
threshold is a governance failure rather than a hard cap, and it blocks candidacy
independently of the score.**

---

## Missing Pieces (watch items — binding on the next revision)

Rewritten at iteration 3; the iteration-2 list is superseded.

1. Resolve the deferral link through the artifact/state parser
   (`parseArtifactName`, configured width): the target must be a **distinct,
   registered, active** work item — reject self, completed, malformed-width,
   unregistered and non-regular targets, each with its own deny fixture.
2. Move FR-4's template guidance **outside** the §9 body (immediately before the
   heading) and make the round-trip test assert both the guidance and a green lint on
   the instantiated document.
3. Rewrite FR-3 so the Phase-3 record is discovery output and the corpus oracle is
   zero closed-grammar failures, offenders named.
4. Re-measure the eight wip PRDs and record the real cleanup shape for the five
   failures (comments and continuations, not only tails).
5. Extend the turbo `test` inputs with the memory store (or isolate the grammar test
   from store reads) — this also closes the stale-green exposure in landed PRD-024's
   corpus test.
6. Re-derive Value only after 1–2 land: the currently supportable dimensions compute
   3.30 (MF 4, AR 2), below the 3.40 threshold — the expansion must actually deliver
   before it counts.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 3   | 2026-07-28 | 6.48  | ITERATE | **First round on the owner-directed narrowing rewrite; scored by Codex, orchestrated by the rewrite's author (verdicts Codex's own, citations re-verified by the orchestrator).** B, C, E CLOSED; D, F PARTIALLY CLOSED; A OPEN at a seventh hiding place — the closed form admits a **self-link** (existence + number match ≠ distinct registered active follow-up; the stated `PRD-\d+` also ignores the configured width) — so the **traceability cap stays tripped**. Two new [P1]s are the rewrite's own: FR-4 ships guidance as a §9 comment the grammar itself refuses (template-instantiated PRDs fail out of the box), and FR-3's Phase-3 record goes stale as its prerequisites are repaired. One cross-item [P2] with reach: `_brain/**` is absent from the turbo test inputs while `lintPrd` reads the store — landed PRD-024's corpus test shares the exposure; the fix is assigned here. Scorecard 7.0 / 5.5 / 6.5 / 8.5 / 6.5 / 6.0 → 6.48. Value judged 3.30-supportable until findings 1–2 land. The trajectory reading: the narrowing direction is right (three closures, both prior reader problems dissolved), and the remaining work is binding the link to the state layer that already exists — specification, not design. |
| 2   | 2026-07-27 | 6.55  | ITERATE | **Score up 0.37; a hard cap tripped, which matters more.** **(A, OPEN — the sixth hiding place)** the free text moved from the link *label* into the link *target*: `Deferred to [PRD-123](_prds/wip/prd-123-who-owns-authorization.md)` satisfies every predicate the PRD states, because only the basename **prefix** is constrained and the suffix is author-controlled — and since existence is deliberately unchecked, nothing proves PRD-123 is a real follow-up. The target is also never constrained to the configured artifact directory, so `docs/prd-123-who-owns-authorization.md` passes too. The rule therefore does **not** implement `source-snapshot/.../phase-2-readiness-scorer.md:210`, and the **method-content traceability cap is tripped**. **(G, PARTIALLY CLOSED)** the 3.55 arithmetic is exact and the weights match config, but the Method-Fidelity 5 was justified by "this exactly restores the snapshot", which finding A disproves; at MF 4 the total is 3.30, below the 3.40 candidate threshold — the item fails triage on the same premise it fails the cap on. **(C, OPEN)** the history says five while the Gherkin enumerates six distinct cases and labels continuation and comment both "3"; the prior rounds record them separately. **(B, PARTIALLY CLOSED)** line-kind validation is feasible but **not through `sectionsMatching`**, which blanks non-text lines; the workable route is `scanDocument` plus the exported `sectionBounds` — and **comments are not a `LineKind` at all**, they are emitted as `text` carrying a mask (`scan.ts:382, 412`), so the rule as written cannot be followed literally. **(new)** the corpus fixture specifies a four-argument call, but production now passes **five** — `cli.ts:721` adds the PRD number, and omitting it disables value-score presence enforcement (`value-score.ts:176, 197`), so the fixture still would not reach production shape. **(D, PARTIALLY CLOSED)** the Phase-3 table is specified as both a prerequisite list and a lasting test oracle; expecting named files to stay red **is** the allowlist the PRD forbids. **(F, PARTIALLY CLOSED)** `_prds/**` does not cover the config, the manifest, or the live memory store the lint reads. **(E, CLOSED)**. Confirmed: the snapshot line reads exactly as quoted, the shipped lint is still the permissive substring check, the arithmetic is exact, and the rollback asymmetry is sound. |
| 1   | 2026-07-27 | 6.18  | ITERATE | **First independent round on the split-out §9 PRD, and it falsifies the PRD's central thesis in one finding.** "The exempt form carries no free text" is false of the form the PRD chose: `Deferred: [Who owns authorization?](background.md)` is exact and carries the question in the link label — the **fifth** hiding place, arriving in the round immediately after the PRD declared that a fifth would be evidence the approach is wrong. **(B)** the prescribed reader fails in both directions: `sectionsMatching` blanks fenced and raw-HTML lines to `''`, which the grammar calls "blank", and retains the terminal `---`, which the grammar forbids — so literally every §9 in the repository fails, including this PRD's own, verified by direct invocation. **(C)** the four-round history was transferred unfaithfully: the substring defect predates the rounds, the continuation case is missing, and the count is four in FR-1, five in §11 and "four" in the Gherkin for five cases. **(D)** the corpus table is wrong about this wave's own work — seven PRDs, six failing, and **PRD-024 is listed as conforming while carrying a same-line tail** its narrowing reintroduced. **(E)** `prd-ready.test.ts` is dangling again, and it also lints completed PRD-002, whose exemption has a tail. **(F)** the conditional `turbo.json` branch is unscoped. **(G)** the declared Value of 3.50 computes to **3.30** — the PRD's own comment says so — which is below the 3.40 candidate threshold, so as scoped this is not a valid candidate and falls under expand-don't-delete. Confirmed sound: both diagnoses, the heading-identity and cardinality rules, the FR-block/§11 split boundary, the four-argument call shape, and the rollback asymmetry. |

---

## Verdict

**ITERATE — 6.48/10, iteration 3, scored independently by Codex.**

The owner's narrowing decision survived its first adversarial round in direction and
failed it in one binding: a closed grammar whose link is validated as a *shape* still is
not a link to a *follow-up* — self, completed and unregistered targets all pass. The
state layer that answers "is this a distinct, registered, active work item" already
exists (`parseArtifactName`, the state record); the next revision binds FR-1 to it
instead of to the filesystem, moves the template guidance out of the judged body, and
makes the corpus oracle zero-failures. Those are the whole list; nothing else in the
design was refuted. Remediate in a session that is not this scorer, then one more
independent round.

*(Iteration 2 verdict, for history: ITERATE 6.55 — "replace the exemption with something
that cannot carry text at all." The narrowing did; the text moved into the link's
referent, which is why the referent must now be resolved, not matched.)*
