# PRD-037: Case Study, Part Two — the Tool's Own Ledger

> **Status**: Draft
>
> **Created**: 2026-07-28
> **Updated**: 2026-07-28
> **Author**: orchestrating session, for owner review (Faz E gap named in the 2026-07-28 portfolio review)
> **Audience**: Implementing Agent
> **Slug**: `case-study-self-hosting`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Autonomous Close**: operator-gated
> **Value**: 3.50 (MF/UI/TL/AR/RM: 4/3/2/5/4)

<!-- 0.25*4 + 0.25*3 + 0.20*2 + 0.15*5 + 0.15*4
     = 1.00 + 0.75 + 0.40 + 0.75 + 0.60 = 3.50
     MF 4: the method proving itself on its own ledger IS method fidelity — every figure
     recomputes from workflow state. UI 3: evidence adopters actually weigh. TL 2: unblocks
     the announcement's central claim, nothing mechanical. AR 5: the roadmap's Faz E
     meta-story — "built with its own 7-phase process, here are the PRDs" — is the launch
     narrative. RM 4: docs content plus one derivation script; figures self-verify. -->

---

## 1. Introduction / Overview

The shipped case study (`apps/docs/content/docs/case-study.mdx`, PRD-004) tells the
**origin** story: ~390 gated work items on the platform the method was extracted from.
It does not tell the story the roadmap names as the launch narrative (Faz E: *"bu araç
kendi 7-fazlı süreciyle geliştirildi, işte PRD'leri"*): **this repository has now run
30+ of its own PRDs through the same gates**, and unlike the origin figures — which the
do-not-say lint guards as *externally sourced* claims — the self-hosting figures are
**recomputable from the repository's own committed state** by anyone who clones it.

That difference is the point. An adopter cannot audit the origin platform; they can run
one script here and watch every number reproduce: PRDs shipped, readiness iterations per
item, independent-scorer counts, ITERATE→PASS trajectories, review rounds, criticals
found-and-closed, closes stopped by the gate chain and resumed. The section this PRD
adds is evidence-by-execution — the product's own thesis applied to its marketing.

**The figures are never typed.** A derivation script computes every number from
`_state/prds.json` and the committed readiness/review artifacts; the doc embeds the
script's output; `verify:doc-claims` refuses a drifted figure. A hand-edited number is
the defect this design makes impossible — the same discipline PRD-027's metrics table
and PRD-004's figure-tracing lint already enforce.

---

## 2. Goals

### Primary Goals

- [ ] The case study carries a "Part two: the tool's own ledger" section whose every
      figure recomputes from committed workflow state by a named script.
- [ ] A reader can re-derive every self-hosting number with one command in a fresh clone.
- [ ] The origin (~390) and self-hosting figure sets stay textually distinct:
      externally-sourced versus locally-recomputable, each labeled with its
      verification path.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Self-hosting figures in the case study | 0 | every figure in the new section | the section exists; each figure names its derivation |
| Figures typed by hand | n/a | 0 | the sentinel region is `--print` output; `--check` via `verify:doc-claims` fails byte-level drift |
| Derivation commands a reader can run | 0 | 1 | `node scripts/derive-self-hosting-figures.mjs` runs read-only; output matches the doc |

---

## 3. User Stories

#### User Story 1

```
As a skeptical adopter reading the case study,
I want the self-hosting numbers to be recomputable in my clone,
so that the tool's central claim is evidence I can execute, not marketing I must trust.
```

**Acceptance Criteria:**

- [ ] The §6 criteria for the derivation script, the embedded output, and the drift lint.

#### User Story 2

```
As the owner writing the announcement,
I want the meta-story section to exist with verified figures,
so that the launch text links to evidence instead of asserting it.
```

**Acceptance Criteria:**

- [ ] The section is linkable (stable heading id) and citable without new claims (§6).

---

## 4. Functional Requirements

1. **FR-1**: The derivation script — **narrowed at iteration 1 to the figures the
   committed artifacts reliably support**, each under a per-figure contract:

   | JSON key | Label | Source + predicate | Computation | Missing/malformed input |
   | -------- | ----- | ------------------ | ----------- | ----------------------- |
   | `shipVerified` | PRDs Ship Verified | `_state/prds.json` records with `status: "Ship Verified"` | count | unreadable/unparseable state → exit non-zero naming the path |
   | `closeModes` | operator-gated vs eligible closes | same records' `autonomousClose` field | count per value; unknown values listed, never folded | a record missing the field is listed by id, not guessed |
   | `readinessIterations` | readiness iterations, total and per-item max | the Iteration History TABLES of `_readiness/completed/**` for Ship Verified PRDs only — the corpus choice is stated in the section: closed items, because wip histories still move; a Superseded PRD's artifact is excluded and the exclusion printed | row count per table; max over items; a file whose table cannot be parsed is a named failure, never a zero | absent artifact for a Ship Verified PRD → named failure |

   Figures the iteration-1 probe found NOT reliably derivable are **cut, not
   approximated** — distinct scorer sessions (free-text `Scored by` labels do not
   deduplicate), review-round and criticals aggregates (narrative prose, no normalized
   metadata), and resumed gate-chain stops (no committed event ledger). The section may
   NAME these phenomena in unnumbered prose ("multiple independent scorers per item;
   review rounds that failed before they passed") but no digit attaches to them.
   Normalizing artifacts to make them derivable is future work this PRD does not own.
   The script prints one JSON block and one markdown table; read-only; computes rather
   than caches (the committed doc region in FR-2 is a PROJECTION of this output, and
   FR-3 is what keeps the projection honest — "no stored figure" was iteration 1's
   overclaim, corrected: the stored projection exists and is byte-checked).
   - **Targets:** `scripts/derive-self-hosting-figures.mjs`
2. **FR-2**: The section, with the delivery mechanism DECIDED (iteration 1): the doc
   carries a **committed generated region** delimited by unique sentinel comments
   (`<!-- self-hosting-figures:start -->` / `:end`); the FR-1 script has two modes —
   `--print` emits the region's content, `--check` compares the committed region
   byte-for-byte against a fresh derivation and exits non-zero on drift naming the
   first differing line. Regeneration rule stated beside the region: re-run `--print`
   after any close that changes the counted state; FR-3's check is what catches a
   forgotten regeneration. Around the region: prose that interprets WITHOUT adding
   numbers — no digit outside the sentinels. The origin section gains one framing line
   naming the two evidence classes. Stable heading id for deep links.
   - **Targets:** `apps/docs/content/docs/case-study.mdx`,
     `scripts/derive-self-hosting-figures.mjs`
3. **FR-3**: The drift gate. `verify:doc-claims` invokes the FR-1 script's `--check`
   mode — the committed sentinel region must equal a fresh derivation byte-for-byte,
   failing by first differing line. Wiring unchanged: the lint is already a bundle
   member; only its coverage grows by this one call.
   - **Targets:** `scripts/verify/verify-doc-claims.mjs`
4. **FR-4**: Honesty boundaries, stated in the section: iteration counts include the
   rounds that FAILED (the 5.1s, the flat plateaus, the reverted claims — the ledger
   cuts both ways or it is not a ledger); the origin ~390 stays externally sourced and
   labeled; no competitor comparison (PRD-039's lane).
   - **Targets:** `apps/docs/content/docs/case-study.mdx`

---

## 5. Non-Goals (Out of Scope)

- **Landing-page changes.** `apps/web` is PRD-027's leased surface; a landing pointer
  to this section is a one-line follow-up after 027 lands.
- **Announcement rewriting.** The draft may cite the section; the voice pass is the
  owner's (Faz E).
- **Competitor claims.** PRD-039.
- **New origin-platform figures.** The ~390 corpus is closed and externally sourced.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a fresh clone at `main`, **When**
  `node scripts/derive-self-hosting-figures.mjs` runs, **Then** it prints the figure
  set read-only and the numbers equal those rendered in the case study.
- **Given** any byte of the sentinel region edited by hand, **When**
  `pnpm verify:doc-claims` runs, **Then** the `--check` mode fails naming the first
  differing line.
- **Given** a figure the artifacts cannot reliably support (scorer sessions, review
  aggregates, resumed stops), **When** the section is read, **Then** the phenomenon
  appears only as unnumbered prose — no digit attaches to it.
- **Given** the new section's prose, **When** scanned, **Then** no sentence outside the
  derived table carries a digit absent from FR-1's output.
- **Given** the docs build, **When** the section renders, **Then** its heading id is
  stable and linkable.
- **Given** `_state/prds.json` absent or unreadable, **When** the script runs, **Then**
  it exits non-zero naming the path.

---

## 7. Technical Considerations

**The founding principle has a pending record.** Recompute-figures-from-state-on-every-
check is the substance of `recompute-beats-recorded-state` — PRD-034's declared Memory
Output, not yet an indexed record, so it cannot be cited in Memory Inputs. It is stated
as FR-1's own rule instead; when 034 lands the record, appending it as an input with a
rationale is the correct (and allowed) move.

**Derivation, not narration.** `_state/prds.json` is the generated SSOT (`gate status`
rebuilds it); readiness artifacts carry iteration histories as tables the script parses
with a stated grammar (the `| date | iteration | score | verdict |` row shape the
completed corpus actually uses — a table that does not parse is a named failure). Any
figure the artifacts cannot support is **omitted rather than estimated** — iteration 1
proved three promised figures underivable and they are cut, not normalized; a smaller
true table beats a fuller approximate one.

**Rollback.** Plain revert; no state, no schema, nothing installed anywhere.

**Sequencing.** Disjoint from every active lease (026: package code + repo verify
deletions; 027: web + design; 031: method content). `apps/docs` content is untouched by
all in-flight items; `verify-doc-claims.mjs` is claimed by no active lease (confirm with
`gate queue` before Phase 3).

### Dependencies

- None hard. Richer after 026/027/031 land (more closed PRDs to count) — the script
  recomputes, so landing order changes the numbers, never the mechanism.

---

## 8. Implementation Scope

### In Scope

- [ ] `scripts/derive-self-hosting-figures.mjs` — new, read-only
- [ ] `apps/docs/content/docs/case-study.mdx` — the section + framing line
- [ ] `scripts/verify/verify-doc-claims.mjs` — coverage rows

---

## 9. Open Questions

- (none)

---

## 10. References

- `docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md` Faz E — the meta-story this delivers
- `apps/docs/content/docs/case-study.mdx` — part one, the origin corpus
- `_docs/retros/retro-2026-07-28.md` — the self-hosting day this section will count

---

## Memory Inputs

- applied: `false-green-on-missing-file` — its watch covers the verify scripts; the
  derivation script and the lint rows fail loudly on absent inputs rather than
  rendering an empty table as success.
- applied: `a-rule-corrected-survives-where-it-is-restated` — its watch covers
  `_prds/**`. FR-2's no-digits-outside-the-table rule exists so a figure never gets a
  prose restatement that drifts from the derived value.
- applied: `docs-outlive-the-gate-they-promise` — the section describes gates that run;
  FR-3 binds every figure to a live check so the prose cannot outlive its evidence.
- reviewed: `evidence-pattern-satisfied-by-the-template` — the lint must compare
  VALUES, not the presence of a table; a template-shaped section with stale numbers is
  the failure mode FR-3's rows must catch.
- not-applicable: `push-is-human-by-omission` — nothing here executes git.

---

## Memory Outputs

- none — the design applies existing records (`recompute-beats-recorded-state` above);
  a docs section and a derivation script are expected to teach nothing non-derivable.
  If implementation surfaces a trap, appending with a rationale is the correct
  response.

---

## Conflict Surface

- `scripts/derive-self-hosting-figures.mjs`
- `apps/docs/content/docs/case-study.mdx`
- `scripts/verify/verify-doc-claims.mjs`

---

## Durable Artifacts

- `none` — no `_brain` record expected (see Memory Outputs)
- `_docs/reviews/review-037-case-study-self-hosting.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

| FR   | Command / Check                                | Scope | Notes                                                                      |
| ---- | ---------------------------------------------- | ----- | --------------------------------------------------------------------------- |
| FR-1 | `node scripts/derive-self-hosting-figures.mjs` | repo  | read-only; prints the figure set; non-zero on unreadable state              |
| FR-2 | `pnpm --filter docs build`                     | docs  | the section renders; the heading id is stable                               |
| FR-3 | `pnpm verify:doc-claims`                       | repo  | every section figure equals a fresh derivation; drift fails by name         |
| FR-4 | `pnpm verify:doc-claims`                       | repo  | the two evidence classes stay labeled; no unsourced digit outside the table |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build

Before Phase 2 PASS, run: `gate check PRD-037`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT type a figure. Every number is derived output; a hand-edited digit is the
  defect this PRD exists to make impossible.
- DO NOT count what the artifacts cannot support — omit, never estimate.
- DO NOT hide the failed rounds. The ledger includes the 5.1s and the reverts, or the
  section is marketing wearing a lab coat.
- DO NOT touch `apps/web` (PRD-027's lease) or the announcement draft's voice.
- DO NOT compare to competitors here — PRD-039 owns sourced comparison.
- DO NOT introduce `any`; no network; no push path; `packages/provegate` untouched.

---

## Changelog

| Date       | Author | Changes                                                                                                            |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| 2026-07-28 | orchestrating session (author), Phase 1 rework | **Iteration 1 scored 5.30 ITERATE — the scorer's own derivation probe proved three promised figures underivable, and the band (4-5.9) prescribes Phase 1 rework, taken.** The figure set narrows to a per-figure contract table over what the artifacts support (Ship Verified count; close-mode split; readiness iterations from closed items' history tables, corpus and exclusions stated); scorer-session, review-aggregate and resumed-stop figures are CUT — nameable in unnumbered prose, never digits. The MDX mechanism is decided: a committed sentinel-delimited generated region with `--print`/`--check` modes, byte-compared by `verify:doc-claims`; "no stored figure" corrected to the honest form (a stored PROJECTION exists and is byte-checked). |
| 2026-07-28 | orchestrating session, for owner review | Drafted as the first of three Faz E launch items (the 2026-07-28 portfolio review's outward-gap action): the roadmap's meta-story delivered as recomputable evidence — a derivation script, a derived section, and drift rows in the existing figure lint. |
