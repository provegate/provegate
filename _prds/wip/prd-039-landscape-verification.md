# PRD-039: Landscape Claims Verified, or Downgraded — the Launch Text's Evidence Gate

> **Status**: Draft
>
> **Created**: 2026-07-28
> **Updated**: 2026-07-28
> **Author**: orchestrating session, for owner review (Faz E gap named in the 2026-07-28 portfolio review)
> **Audience**: Implementing Agent
> **Slug**: `landscape-verification`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Autonomous Close**: operator-gated
> **Value**: 3.15 (MF/UI/TL/AR/RM: 3/3/3/5/2)

<!-- 0.25*3 + 0.25*3 + 0.20*3 + 0.15*5 + 0.15*2
     = 0.75 + 0.75 + 0.60 + 0.75 + 0.30 = 3.15
     BELOW the 3.40 candidate threshold, and deliberately not rounded up (the draft's
     first header said 3.30 with the same dimensions; `gate check` recomputed 3.15 and
     refused — the arithmetic gate working on its own author): MF 3 (the
     do-not-say honesty rules applied to competitor claims are method-adjacent, not
     method), UI 3 (adopters weigh comparisons when choosing), TL 3 (the roadmap's own
     launch gate: bullet under Faz E — "◐ hücreleri lansman metnine girmeden
     birincil-doküman teyidi"), AR 5 (an unverified comparison in launch text is the
     credibility risk), RM 2 (research decays: competitors ship; verified cells rot on
     a calendar, standing maintenance is real). Per the expand-don't-delete rule this
     enters triage as a candidate for BROADENING — the natural absorption is the
     launch-runbook adjacencies (announcement do-not-say coverage, release.yml dry-run
     evidence) — or for explicit owner acceptance at 3.30 as a roadmap-mandated launch
     gate whose value axis (AR) is capped by the rubric's weights. Owner call, recorded
     here rather than smoothed over. -->

---

## 1. Introduction / Overview

The competitor landscape
(`docs/research/provegate-bootstrap/competitor-landscape-agentic-workflows-2026-07-22.md`)
carries two confidence marks: ✅ adversarially verified (3-0/2-1 votes) and ◐ *sourced
but unverified*. The roadmap's Faz E has an explicit launch gate on the second class:
**no ◐ cell enters launch text before primary-document confirmation** (open question
#1: Spec Kit / Kiro / BMAD gate mechanics; a Taskmaster / Cline mini-survey). Today the
◐ cells outnumber the verified ones in exactly the rows the announcement and landing
would cite — Spec Kit's phase gates, Kiro's spec-check mechanics, adoption figures,
license terms.

This PRD runs the verification: every ◐ cell either gets confirmed against a primary
document (the vendor's own docs/repo/changelog, cited with a dated URL) and promoted to
✅, or **downgraded/removed** — and the launch surfaces (announcement draft, landing
copy claims, whitepaper comparisons) are swept so no claim rests on a cell that failed
its check. The do-not-say lint gains rows binding every surviving competitor claim to
its citation, so a future landscape edit cannot reintroduce an unsourced comparison.

**Research decays.** Every verified cell carries its verification date; the table
header states the revalidation rule (stale after a named interval or a major vendor
release) — a ✅ from July is not a ✅ forever, and the table says so.

---

## 2. Goals

### Primary Goals

- [ ] Zero ◐ cells cited by any launch surface: each is verified-with-citation or
      downgraded, and the surfaces are swept against the outcome.
- [ ] The do-not-say lint refuses a competitor claim with no citation row.
- [ ] Every verified cell is dated and carries the revalidation rule.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| ◐ cells in rows the launch surfaces cite | measured at Phase 4 start by a grep over the table | 0 | the updated table; each former ◐ resolves to ✅-with-citation or a downgrade |
| Competitor claims in launch surfaces without a citation row | unmeasured | 0 | the new do-not-say rows |
| Verified cells without a verification date | all | 0 | the table's date column |

---

## 3. User Stories

#### User Story 1

```
As a reader of the launch announcement,
I want every comparison to competitors to trace to their own documents,
so that the tool's honesty pitch is not undermined by its marketing.
```

**Acceptance Criteria:**

- [ ] The §6 criteria: citations on every surviving claim, lint rows guarding them.

#### User Story 2

```
As the owner deciding launch timing,
I want the roadmap's ◐ gate discharged with a dated record,
so that open question #1 closes with evidence instead of expiring silently.
```

**Acceptance Criteria:**

- [ ] The roadmap's open-decision row for question #1 is answerable from this PRD's
      output (the owner closes it; this PRD supplies the record).

---

## 4. Functional Requirements

1. **FR-1**: The verification pass. For each ◐ cell in the landscape table: locate the
   primary document (vendor docs, repository, changelog, license file), record a dated
   citation, and mark the cell ✅ with the date — or, where the primary document
   contradicts or cannot support the claim, rewrite the cell to what IS supported (or
   remove it) with the contradiction noted. Scope: the Spec Kit / Kiro / BMAD gate-
   mechanics rows the roadmap names, plus the Taskmaster / Cline mini-survey rows, plus
   every other ◐ a launch surface cites (the Phase 4 grep fixes the exact list —
   derived, not copied from this document).
   - **Targets:** `docs/research/provegate-bootstrap/competitor-landscape-agentic-workflows-2026-07-22.md`
2. **FR-2**: The launch-surface sweep. The announcement draft, the landing's claim
   strings (`apps/web/app/sections/content.ts` — comparison claims only, if any
   survive there), and the docs-site comparison passages are swept against FR-1's
   outcomes: a claim resting on a downgraded cell is corrected or cut
   (`a-rule-corrected-survives-where-it-is-restated`, applied to marketing). The sweep
   happens AFTER PRD-027 lands if the landing is still leased — sequencing, not scope.
   - **Targets:** `_docs/launch/announcement-draft.md`,
     `apps/web/app/sections/content.ts`, `apps/docs/content/docs/*.mdx` (the
     comparison passages the Phase 4 grep finds)
3. **FR-3**: The lint. `verify:doc-claims` gains rows binding every surviving
   competitor claim in the launch surfaces to its citation in the landscape table — an
   uncited comparison, or a citation pointing at a cell that no longer supports it,
   fails by name.
   - **Targets:** `scripts/verify/verify-doc-claims.mjs`
4. **FR-4**: The decay rule. The landscape table header states the revalidation
   interval and trigger (owner-set at Phase 3; the PRD proposes 90 days or a major
   vendor release, whichever first), and every ✅ carries its date. An expired date is
   the reader's signal, not a lint failure — research staleness is a judgment, and the
   table says whose (`known-red-ledger-must-expire`'s lesson applied as reader-facing
   dating, not as a gate; the distinction is stated so nobody later "fixes" it into a
   red build over a vendor's release calendar).
   - **Targets:** `docs/research/provegate-bootstrap/competitor-landscape-agentic-workflows-2026-07-22.md`

---

## 5. Non-Goals (Out of Scope)

- **New comparisons or new competitors.** Verification and downgrade only; widening
  the table is separate work.
- **The announcement's voice pass.** The owner's, after this lands.
- **Re-running the original adversarial panels.** The ✅ cells stand on their recorded
  votes; only ◐ cells are in scope.
- **A web scraper or any network automation.** Verification is a human-plus-agent
  reading task at Phase 4; nothing shipped here fetches anything
  (`check-egress` unchanged).

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** the updated landscape table, **When** grepped for ◐, **Then** no remaining
  ◐ cell is cited by any launch surface, and each former ◐ shows either a dated
  citation or a downgrade note.
- **Given** a launch surface claim about a competitor, **When**
  `pnpm verify:doc-claims` runs, **Then** the claim has a citation row or the lint
  fails naming it.
- **Given** a citation whose cell was downgraded (mutation probe), **When** the lint
  runs, **Then** it fails naming the orphaned claim.
- **Given** any ✅ cell, **When** read, **Then** it carries a verification date, and
  the header carries the revalidation rule.
- **Given** the announcement draft after the sweep, **When** read against FR-1's
  outcomes, **Then** no sentence rests on a downgraded cell.

---

## 7. Technical Considerations

**Verification is reading, not scraping.** Primary documents are consulted by the
implementing agent/owner at Phase 4; the repository stores citations (URL + date +
the sentence-level claim each supports), never fetched content. Nothing in the product
gains a network path.

**The lint rows are string-anchored the honest way.** PRD-033's review recorded the
trap (`evidence-pattern-satisfied-by-the-template`): a row satisfied by the claim's own
filename proves nothing. Rows bind claim text to citation presence AND cell status.

**Rollback.** Docs and lint rows; plain revert.

**Sequencing.** FR-2's landing file is inside PRD-027's active lease — that sweep
waits for 027 to land (likely same-day at current pace). FR-1/FR-3/FR-4 are
lease-disjoint now. Re-run `gate queue` before Phase 3.

### Dependencies

- Soft: PRD-027 landing frees `content.ts` for FR-2's sweep half.
- Owner: the roadmap's open-decision row #1 is closed by the owner on this PRD's
  evidence — an operator-gated close row, which is why the header says operator-gated.

---

## 8. Implementation Scope

### In Scope

- [ ] `docs/research/provegate-bootstrap/competitor-landscape-agentic-workflows-2026-07-22.md` — cells, dates, header rule
- [ ] `_docs/launch/announcement-draft.md` — claim sweep (content only; voice untouched)
- [ ] `apps/web/app/sections/content.ts` — comparison claims, post-027
- [ ] `apps/docs/content/docs/*.mdx` — comparison passages the Phase 4 grep names
- [ ] `scripts/verify/verify-doc-claims.mjs` — citation rows

---

## 9. Open Questions

- (none — the revalidation interval is a Phase 3 owner setting with a proposed
  default, not an open design question)

---

## 10. References

- `docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md` Faz E + §4
  open decision #1 — the launch gate this discharges
- `docs/research/provegate-bootstrap/competitor-landscape-agentic-workflows-2026-07-22.md` — the table
- `docs/research/provegate-bootstrap/positioning-and-faq-2026-07-22.md` — the claims'
  strategic frame

---

## Memory Inputs

- applied: `a-rule-corrected-survives-where-it-is-restated` — FR-2 is this record as a
  requirement: a downgraded cell's claim is swept from every surface that restated it,
  and FR-3's lint keeps it swept.
- applied: `evidence-pattern-satisfied-by-the-template` — the lint rows bind claim
  text to citation presence AND cell status; a row a filename can satisfy is the
  recorded failure shape.
- applied: `docs-outlive-the-gate-they-promise` — launch surfaces promising "we only
  compare with sources" get the gate that makes it true.
- reviewed: `known-red-ledger-must-expire` — the decay rule is this lesson applied as
  reader-facing dating rather than a build gate, with the distinction stated in FR-4
  so a later editor does not convert vendor release calendars into red builds.
- not-applicable: `push-is-human-by-omission` — nothing here executes git or fetches
  anything.

---

## Memory Outputs

- none — the verification produces citations in the landscape document itself, which
  is their durable home; no `_brain` record is expected. If the verification uncovers
  a non-derivable process trap, appending with a rationale is the correct response.

---

## Conflict Surface

- `docs/research/provegate-bootstrap/competitor-landscape-agentic-workflows-2026-07-22.md`
- `_docs/launch/announcement-draft.md`
- `scripts/verify/verify-doc-claims.mjs`

> `apps/web/app/sections/content.ts` and the docs comparison passages join at Phase 3
> only if still unleased — the FR-2 sweep serializes behind PRD-027 by design.

---

## Durable Artifacts

- `none` — citations land in the landscape document; no `_brain` record expected
- `_docs/reviews/review-039-landscape-verification.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

| FR   | Command / Check                    | Scope | Notes                                                                     |
| ---- | ---------------------------------- | ----- | -------------------------------------------------------------------------- |
| FR-1 | `grep -c "◐" docs/research/provegate-bootstrap/competitor-landscape-agentic-workflows-2026-07-22.md` | repo | the count shrinks to the launch-uncited residue; the table shows dates/downgrades |
| FR-2 | `pnpm verify:doc-claims`           | repo  | no launch-surface claim rests on a downgraded cell                         |
| FR-3 | `pnpm verify:doc-claims`           | repo  | uncited or orphaned comparisons fail by name                               |
| FR-4 | `pnpm verify:doc-claims`           | repo  | every ✅ dated; the header carries the revalidation rule                    |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build

Before Phase 2 PASS, run: `gate check PRD-039`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT promote a ◐ on a secondary source — primary documents only, dated.
- DO NOT soften a downgrade into weasel wording; the cell says what the source
  supports, or the claim goes.
- DO NOT add a fetch, scraper, or any network path anywhere.
- DO NOT touch `content.ts` while PRD-027's lease is active.
- DO NOT convert the decay dates into a build gate — FR-4 states why.
- DO NOT edit the announcement's voice; claims only.
- DO NOT introduce `any`; no push path; `packages/provegate` untouched.

---

## Changelog

| Date       | Author | Changes                                                                                                        |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| 2026-07-28 | orchestrating session, for owner review | Drafted as the third of three Faz E launch items (portfolio-review outward-gap action), discharging the roadmap's ◐-cell launch gate. Scored HONESTLY at 3.15 — below the 3.40 threshold (first draft said 3.30; the value gate recomputed and refused) — with the triage options stated in the header comment: broaden (absorb the launch-runbook adjacencies) or owner-accept as a roadmap-mandated gate. Deliberately not rounded up. |
