# Readiness Assessment: PRD-028 — Open Questions Grammar

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

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-028-open-questions-grammar.md`   |
| Score                  | 6.18/10                                        |
| Verdict                | ITERATE — seven [P1] items. The exemption approach is falsified by a fifth hiding place, the prescribed reader cannot enforce the stated grammar, and the declared Value of 3.50 actually computes to 3.30, below the 3.40 candidate threshold |
| Iteration              | 1                                              |
| Model Tier (Execution) | do not assign — score < 8                      |
| Model Tier (Audit)     | high (on a PASS)                               |
| Scored by              | **Codex (gpt-5.x) via the `/codex` skill — independent, different model family, did not write the PRD** |
| Self-scored            | **no**                                         |
| Date                   | 2026-07-27                                     |
| PRD Lint               | passed — `lintPrd(config, manifest, content, root)` returned `{ ok: true, issues: [] }` by direct invocation; the CLI wrapper writes `_state/prds.json` and was not run under the read-only constraint |
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

### Findings

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

## Missing Pieces (watch items — binding on Phase 3 and Phase 6)

- Replace the arbitrary link label with a fixed, source-aligned deferral token tied to a
  linked follow-up work item — or accept that the exemption approach itself needs replacing.
- Validate scanned **line kinds** rather than the blanked text; define the terminal `---`
  explicitly; deny fenced, raw-HTML and indented-code content.
- Correct the history to separate the original defect from the four fix-created moves, and
  require all five regressions consistently across FR-1, §6 and §11.
- Re-measure all seven wip PRDs and add PRD-024 to the prerequisite table.
- Declare `prd-ready.test.ts` and the conditionally required `turbo.json`.
- Correct Value to 3.30 and apply the below-threshold triage rule.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-07-27 | 6.18  | ITERATE | **First independent round on the split-out §9 PRD, and it falsifies the PRD's central thesis in one finding.** "The exempt form carries no free text" is false of the form the PRD chose: `Deferred: [Who owns authorization?](background.md)` is exact and carries the question in the link label — the **fifth** hiding place, arriving in the round immediately after the PRD declared that a fifth would be evidence the approach is wrong. **(B)** the prescribed reader fails in both directions: `sectionsMatching` blanks fenced and raw-HTML lines to `''`, which the grammar calls "blank", and retains the terminal `---`, which the grammar forbids — so literally every §9 in the repository fails, including this PRD's own, verified by direct invocation. **(C)** the four-round history was transferred unfaithfully: the substring defect predates the rounds, the continuation case is missing, and the count is four in FR-1, five in §11 and "four" in the Gherkin for five cases. **(D)** the corpus table is wrong about this wave's own work — seven PRDs, six failing, and **PRD-024 is listed as conforming while carrying a same-line tail** its narrowing reintroduced. **(E)** `prd-ready.test.ts` is dangling again, and it also lints completed PRD-002, whose exemption has a tail. **(F)** the conditional `turbo.json` branch is unscoped. **(G)** the declared Value of 3.50 computes to **3.30** — the PRD's own comment says so — which is below the 3.40 candidate threshold, so as scoped this is not a valid candidate and falls under expand-don't-delete. Confirmed sound: both diagnoses, the heading-identity and cardinality rules, the FR-block/§11 split boundary, the four-argument call shape, and the rollback asymmetry. |

---

## Verdict

**ITERATE — 6.18/10, iteration 1, scored independently by Codex.**

Two of the seven findings are ordinary remediation work. The other five are not, and finding
A is the one that matters: **the exemption approach has now produced five hiding places in
five attempts, and the PRD itself wrote down what that means.** Adding a sixth predicate is
the move this document exists to refuse. The next revision should either replace the
exemption with something that cannot carry text at all, or reconsider whether a §9 exemption
belongs in a machine gate.

Finding G compounds it: at 3.30 the item is below the candidate threshold, so the owner's
options are to expand its scope until it earns its place or to record why it is being cut.
Those two questions — what replaces the exemption, and whether this item survives triage —
are one decision, and it is the owner's.
