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
kendi 7-fazlı süreciyle geliştirildi, işte PRD'leri"*): **this repository runs its own
PRDs through the same gates** — how many is the derivation script's answer, never this
document's — and unlike the origin figures, which the do-not-say lint guards as
*externally sourced* claims, the self-hosting figures are **recomputable from the
repository's own committed state** by anyone who clones it.

That difference is the point. An adopter cannot audit the origin platform; they can run
one script here and watch every number reproduce — the contract table in FR-1 names
exactly which figures, and the phenomena the artifacts cannot count (multi-scorer
quorums, failing rounds, resumed stops) appear as unnumbered prose. The section this
PRD adds is evidence-by-execution — the product's own thesis applied to its
marketing.

**The figures are never typed.** A derivation script computes every number from
`_state/prds.json` — its only input — and the doc embeds the script's output;
`verify:doc-claims` refuses a drifted figure. A hand-edited number is
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
| Derivation commands a reader can run | 0 | 1 | `--print` reads only the state file and the MDX sentinels; its output matches the committed region byte for byte |

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
   | `closeModes` | operator-gated vs eligible closes | same records' `autonomousClose` field | count per KNOWN value, emitted in fixed order (`operator-gated`, then `eligible`); every unknown value and every record missing the field aggregates under `unclassified {count, ids}` — ids sorted lexicographically, a SUCCESS diagnostic, never folded into a known mode — identically in the JSON and as an "unclassified (listed)" table row | consumed-state schema: the root must be an object whose `records` is an array; each record needs string `prd` and `status`; the first violation BY ARRAY INDEX exits 1 naming index and field; absent/unreadable file exits 1 naming the path |
   Figures the iteration-1 and iteration-2 probes found NOT reliably derivable are
   **cut, not approximated** — distinct scorer sessions (free-text `Scored by` labels
   do not deduplicate), review-round and criticals aggregates (narrative prose),
   resumed gate-chain stops (no committed event ledger), **and readiness-iteration
   counts** (iteration 2 measured the history-table grammar varying across the 29
   Ship Verified artifacts, concurring rows like `9b` included; migrating 29
   artifacts to one grammar is real work a marketing section does not justify). The section may
   NAME these phenomena in unnumbered prose ("multiple independent scorers per item;
   review rounds that failed before they passed") but no digit attaches to them.
   Normalizing artifacts to make them derivable is future work this PRD does not own.
   The script prints one JSON block and one markdown table; its FIGURE source is
   `_state/prds.json` and nothing else; it computes rather
   than caches (the committed doc region in FR-2 is a PROJECTION of this output, and
   FR-3 is what keeps the projection honest — "no stored figure" was iteration 1's
   overclaim, corrected: the stored projection exists and is byte-checked).
   - **Targets:** `scripts/derive-self-hosting-figures.mjs`,
     `scripts/verify/derive-figures.test-cases.mjs` (the fixture harness — a root
     test script exercising: both current close modes; Superseded exclusion;
     unknown/missing `autonomousClose` → deterministic `unclassified` output;
     parseable-but-malformed state; all four modes; stale region bytes; the
     first-differing-line diagnostic; missing/duplicate/inverted sentinels;
     outside-byte preservation under `--write`; the no-digit prose rule; and the
     doc-claims verifier's existing behavior preserved)
2. **FR-2**: The section, with the delivery mechanism DECIDED and its lifecycle
   closed (iterations 1-2): the doc carries a **committed generated region**
   delimited by exactly one ordered sentinel pair
   (`<!-- self-hosting-figures:start -->` before `<!-- self-hosting-figures:end -->`);
   with ONE canonical invocation matrix (exactly one mode flag accepted; zero flags
   or any combination → usage to stderr, exit 2, NOTHING read):

   | Mode | Reads | stdout | stderr | Mutates | Success | Sentinel failure |
   | ---- | ----- | ------ | ------ | ------- | ------- | ---------------- |
   | (none)/invalid/combined | nothing | — | usage | no | exit 2 | n/a — not reached |
   | `--print` | state + MDX sentinels | generated content (sentinels excluded) | diagnostics | no | exit 0 | exit 1 naming the broken rule (missing/duplicate/inverted) |
   | `--write` | state + MDX | — | diagnostics | ONLY the bytes strictly between the pair | exit 0 | exit 1, doc untouched |
   | `--check` | state + MDX | — | first differing line | no | exit 0 | exit 1 naming the broken rule |

   Only the three flagged modes validate sentinels. Regeneration rule beside the
   region: re-run `--write` after any close that changes the counted state; FR-3's
   `--check` catches a forgotten regeneration. **The no-digit rule, one predicate,
   stated once:** within the H2 span of `self-hosting-ledger` (from that heading to
   the next `## ` or end of file), any character matching `[0-9]` OUTSIDE the
   sentinel pair fails the harness — FR-4's honesty prose lives under the same
   predicate, and part one's externally-sourced figures live outside the span and
   are untouched. The origin section gains one framing line
   naming the two evidence classes. The heading is written
   `## Part two: the tool's own ledger [#self-hosting-ledger]` — the explicit-id
   suffix syntax the docs stack's remark pipeline accepts — and the harness asserts
   that SOURCE token, never a build product.
   - **Targets:** `apps/docs/content/docs/case-study.mdx`,
     `scripts/derive-self-hosting-figures.mjs`
3. **FR-3**: The drift gate. `verify:doc-claims` invokes the FR-1 script's `--check`
   mode — the committed sentinel region must equal a fresh derivation byte-for-byte,
   failing by first differing line. Wiring unchanged: the lint is already a bundle
   member; only its coverage grows by this one call.
   - **Targets:** `scripts/verify/verify-doc-claims.mjs`
4. **FR-4**: Honesty boundaries, stated in the section: the prose names the texture
   without digits — items iterated many times before passing, rounds that failed,
   claims that were caught and reverted (the ledger cuts both ways or it is not a
   ledger; and per the no-digit rule, none of this carries a number outside the
   generated region); the origin ~390 stays externally sourced and labeled; no
   competitor comparison (PRD-039's lane).
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
  `node scripts/derive-self-hosting-figures.mjs --print` runs, **Then** it emits the
  generated content read-only and the bytes equal the committed region.
- **Given** a bare invocation with no mode flag, **When** it runs, **Then** usage
  goes to stderr and the exit status is 2 — nothing printed, nothing written.
- **Given** any byte of the sentinel region edited by hand, **When**
  `pnpm verify:doc-claims` runs, **Then** the `--check` mode fails naming the first
  differing line.
- **Given** a figure the artifacts cannot reliably support (scorer sessions, review
  aggregates, resumed stops), **When** the section is read, **Then** the phenomenon
  appears only as unnumbered prose — no digit attaches to it.
- **Given** the new section's prose, **When** scanned, **Then** no sentence outside the
  derived table carries a digit absent from FR-1's output.
- **Given** the MDX source, **When** the fixture harness runs, **Then** the heading
  carries the explicit id `self-hosting-ledger` — asserted in source, not via a build.
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
rebuilds it) and the script's ONLY figure source. The flagged modes additionally READ
the MDX target — solely for sentinel validation and region comparison, never as a
figure input. Any figure the state cannot support is **omitted rather than
estimated**; a smaller true table beats a fuller approximate one.

**Rollback.** Plain revert; no state, no schema, nothing installed anywhere.

**Sequencing.** Checked against machine state at each phase boundary rather than
trusted from this paragraph: at drafting time 026/027/031 held leases on package code,
web+design, and method content respectively — all disjoint from this surface — and
`verify-doc-claims.mjs` was unleased. Re-run `gate queue` before Phase 3; the statement
above is dated, not standing.

### Dependencies

- None hard. Richer after 026/027/031 land (more closed PRDs to count) — the script
  recomputes, so landing order changes the numbers, never the mechanism.

---

## 8. Implementation Scope

### In Scope

- [ ] `scripts/derive-self-hosting-figures.mjs` — new; `--print`/`--check` mutate nothing, `--write` only the region
- [ ] `scripts/verify/derive-figures.test-cases.mjs` — new, the fixture harness
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
- `scripts/verify/derive-figures.test-cases.mjs`
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
| FR-1 | `node scripts/derive-self-hosting-figures.mjs --print` | repo | read-only; emits the generated content; non-zero on unreadable/malformed state or sentinel violations |
| FR-1 | `node scripts/verify/derive-figures.test-cases.mjs` | repo | the fixture harness: modes, close-mode diagnostics, sentinel failures, outside-byte preservation |
| FR-2 | `node scripts/verify/derive-figures.test-cases.mjs` | repo | the harness asserts the heading source token (`[#self-hosting-ledger]`), the H2-span digit rule, and the region placement — never via a docs build |
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
- DO NOT hide the failed rounds. The prose names failing rounds and reverted claims —
  without digits — or the section is marketing wearing a lab coat.
- DO NOT touch `apps/web` (PRD-027's lease) or the announcement draft's voice.
- DO NOT compare to competitors here — PRD-039 owns sourced comparison.
- DO NOT introduce `any`; no network; no push path; `packages/provegate` untouched.

---

## Changelog

| Date       | Author | Changes                                                                                                            |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| 2026-07-28 | orchestrating session (author), fourth rework — grep-verified | **Iteration 4 (7.10) applied, with a correction the score forced: several third-rework edits recorded as applied were ABSENT from the file** (the §12 digits, the §7 parser paragraph, the full mode matrix, the closeModes contract — the batch tooling lost writes while printing success; the third-rework changelog row overstates accordingly and this row is written AFTER a grep of every change below). Landed and verified: the canonical invocation matrix (one flag exactly; zero/combined → usage/exit 2 reading nothing; per-mode reads/streams/mutation/status; sentinel validation only in flagged modes); the consumed-state schema with first-by-array-index diagnostics and the ordered, sorted `unclassified {count, ids}` success form; §7 rewritten state-only with the modes' MDX reads scoped to sentinels; the single no-digit predicate over the `self-hosting-ledger` H2 span; the explicit-id heading source token `[#self-hosting-ledger]`; every generic "read-only" narrowed; the §11 docs-build row replaced by the harness assertion; the harness file added to Scope and Conflict Surface. |
| 2026-07-28 | orchestrating session (author), third rework | **Iteration 3 (6.40) applied — eight pieces, mostly residual restatements.** The input set narrows to `_state/prds.json` ALONE (readiness/review artifacts left with the figures they served; the §7 parser contract deleted); §12's surviving "the 5.1s" de-numbered. The complete mode matrix defined (default = usage/exit 2; `--print` content-only to stdout, sentinels excluded; `--write` the single permitted in-place mutation with outside-byte preservation; `--check` first-differing-line at exit 1; identical sentinel validation in all three real modes) and "read-only" narrowed to the modes it describes. The `closeModes` contract completed: unknown/missing values emit a deterministic `unclassified {count, ids}` diagnostic, malformed-but-parseable state fails naming the first offending element. The fixture harness added to Targets/§11 with the full case list. The heading id made explicit (`self-hosting-ledger`), asserted in MDX source. The sequencing paragraph dated instead of standing. |
| 2026-07-28 | orchestrating session (author), second rework | **Iteration 2 (6.28) applied.** `readinessIterations` CUT — the probe measured the history-table grammar varying across all 29 Ship Verified artifacts (`9b` concurring rows included); migrating 29 artifacts is not a marketing section's business, so the derivable pair remains and the texture goes to unnumbered prose. The intro's own `30+` digit and stale figure list swept (the count is the script's answer, never this document's). The no-digit contradiction fixed — "the 5.1s" de-numbered in FR-4. The region lifecycle closed: exactly one ordered sentinel pair, named failures on missing/duplicate/inverted, three modes (default = usage + exit 2, `--print`, `--write` in place), regeneration by `--write`. |
| 2026-07-28 | orchestrating session (author), Phase 1 rework | **Iteration 1 scored 5.30 ITERATE — the scorer's own derivation probe proved three promised figures underivable, and the band (4-5.9) prescribes Phase 1 rework, taken.** The figure set narrows to a per-figure contract table over what the artifacts support (Ship Verified count; close-mode split; readiness iterations from closed items' history tables, corpus and exclusions stated); scorer-session, review-aggregate and resumed-stop figures are CUT — nameable in unnumbered prose, never digits. The MDX mechanism is decided: a committed sentinel-delimited generated region with `--print`/`--check` modes, byte-compared by `verify:doc-claims`; "no stored figure" corrected to the honest form (a stored PROJECTION exists and is byte-checked). |
| 2026-07-28 | orchestrating session, for owner review | Drafted as the first of three Faz E launch items (the 2026-07-28 portfolio review's outward-gap action): the roadmap's meta-story delivered as recomputable evidence — a derivation script, a derived section, and drift rows in the existing figure lint. |
