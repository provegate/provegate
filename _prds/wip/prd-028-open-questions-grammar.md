# PRD-028: Open Questions Grammar — Four Hiding Places, One Closed Rule

> **Status**: Draft
>
> **Created**: 2026-07-27
> **Updated**: 2026-07-27
> **Author**: Claude Opus 5, for owner review
> **Audience**: Implementing Agent
> **Slug**: `open-questions-grammar`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: Two defects in the readiness lint's §9 reader, plus the section
> cardinality both need. No new flag, config key, CLI command, or exported signature change:
> only which documents pass moves. Not `test-hardening` because production lint code
> changes, not only tests — and the set of passing documents moving is what makes this
> user-facing enough to need a corpus prerequisite list rather than a quiet landing.
> **Autonomous Close**: operator-gated
> **Value**: 3.50 (MF/UI/TL/AR/RM: 5/3/2/2/4)

<!-- 0.25*5 + 0.25*3 + 0.20*2 + 0.15*2 + 0.15*4
     = 1.25 + 0.75 + 0.40 + 0.30 + 0.60 = 3.30 -->

---

## 1. Introduction / Overview

Split out of PRD-024 on owner direction, 2026-07-27, after four independent readiness
rounds. That history is the reason this document exists and is recorded plainly rather
than summarized away.

PRD-024 carried three defects: one in the §11 command reader and two here. Its scores
across four independent rounds were 6.75, 6.83, 7.40 and 6.95 — a band, not a trend. **Every
blocking finding in all four rounds came from this half**, while the §11 defect drew no
objection after round two. The §11 work stays in PRD-024, which has no prerequisites and no
ordering constraint; this half comes here, with the full record of what four adversarial
rounds established.

### The two defects

| # | Lint | Reads | Should read | Symptom |
| - | ---- | ----- | ----------- | ------- |
| a | the §9 exemption (`prd-ready.ts:153`) | `/\(none\b\|deferred/i` anywhere in the bullet | an actual, closed deferral form | a genuine unresolved question is invisible whenever it merely *mentions* the word |
| b | the §9 selection (`prd-ready.ts:149-153`) | lines matching `^\s*-\s+\S`, in the first matching section only | the section's whole claim, in exactly one section | prose reports **zero unresolved items whatever it contains**; a second section is invisible; no section reports zero |

Defect (a) was measured on PRD-023's own draft: it listed three questions and the lint
reported two, because one named `verify-deferred`. Defect (b) was measured empirically by a
reviewer, who injected a bold, unresolved `**Q5 open …**` paragraph into PRD-023 and watched
the lint return clean.

### The four hiding places, and why they are stated up front

The exemption rule moved four consecutive times across four rounds, and **each move was
created by the previous fix**. This is the single most useful thing four rounds produced,
because it is the shape of the problem rather than a list of symptoms:

| Round | Rule at the time | Where the question moved |
| ----- | ---------------- | ------------------------ |
| 1 | substring `deferred` anywhere | a bullet that merely mentions the word |
| 2 | must also carry a link or a work-item id | *"Why was this deferred? See [background](…)"* |
| 3 | must **open with** the deferral form | `- (none) — why is auth still undecided?`, on the same line |
| 4 | end-anchored, rationale moves to a comment | `<!-- Who owns the authorization decision? -->` |

Each rule was tighter than the last and each left exactly one place to put a question,
because **nothing syntactic separates a rationale from a question**. FR-1 stops trying: the
exempt form carries no free text at all, anywhere in the section.

---

## 2. Goals

### Primary Goals

- [ ] Make an unresolved question fail the lint regardless of the shape it is written in.
- [ ] Fix the grammar rather than teach the parser more Markdown, per
      `narrow-the-grammar-not-the-parser`.
- [ ] Close the exemption once, with no free text left anywhere the parser cannot classify.
- [ ] Require exactly one §9 section, identified by its heading rather than a substring.
- [ ] Land it with the corpus prerequisites named and measured, not discovered at Phase 4.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Places an unresolved question can hide in §9 | 4, measured across four independent rounds | 0 | the FR-1 deny matrix, one fixture per historical hiding place |
| Unresolved questions hidden by the word "deferred" | 1 measured, in PRD-023's draft | 0 | FR-1 fixture |
| Unresolved questions hidden by paragraph form | unbounded — a prose §9 reports 0 whatever it holds | 0 | FR-2 fixture, seeded from the reviewer's injected case |
| §9 sections a document may declare | unbounded; only the first is read | exactly 1 | FR-2 fixture |
| §9 headings that satisfy the selector | any heading containing the words | exactly the canonical one | FR-2 fixture |
| Wip PRDs that fail the new grammar | 5 of 6, measured 2026-07-27 | 0, by their authors before this lands | the corpus prerequisite table (FR-3) |

---

## 3. User Stories

#### User Story 1

```
As an author running the readiness check on a PRD,
I want the lint to count the questions my section 9 actually contains,
so that a green verdict means the section is resolved rather than mis-read.
```

**Acceptance Criteria:**

- [ ] An unresolved question fails the lint regardless of whether it is a bullet, a
      paragraph, a continuation, a same-line tail, or a comment.
- [ ] A legitimately deferred entry in one of the closed forms still passes.

#### User Story 2

```
As an owner reading a green readiness verdict,
I want a second or missing section 9 to fail,
so that "zero unresolved items" cannot mean "zero in the part I happened to read".
```

**Acceptance Criteria:**

- [ ] Zero matching sections fails as missing; two or more fails as ambiguous.
- [ ] A heading that merely contains the words is not the section.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1 — The exemption is a closed form with no free text.** `lintPrd` filters
   `/\(none\b|deferred/i` over each bullet, so any bullet that mentions the word is exempt.
   Replace it with three exact forms, and **only** these three, as the bullet's entire
   content:

   - `(none)`
   - `Deferred to <work-item-id>`, the identifier matching the configured id pattern in full
   - `Deferred: <markdown-link>`, meaning exactly `[text](target)` with a non-empty target

   **Nothing may follow, precede, or accompany the form.** No same-line tail, no indented
   continuation beneath it, and no HTML comment inside the section — those are the third and
   fourth hiding places from §1 and they are closed by construction rather than by a
   predicate that tries to read them. A `(none)` section needs no rationale: it asserts the
   section is empty, and anything worth saying about why belongs in a Decision Record
   section or §10.

   **The matcher is defined, not left to the implementer.** Comparison is case-insensitive,
   matching today's behavior (`prd-ready.ts:153`); internal runs of whitespace collapse to
   one space and leading and trailing whitespace is trimmed, so `Deferred to   PRD-123` is
   the same token sequence as `Deferred to PRD-123`.

   **Do not fix this by deleting the exemption.** The template promises a
   deferral-with-a-link escape and removing it outright would break PRDs that legitimately
   use it.

   **The deny matrix is the requirement, one fixture per historical hiding place** — round 1
   through round 4 in §1's table — each paired with a positive control on the same shape: the
   exact form passes. A deny fixture whose input would fail anyway is not evidence.
   - **Targets:** `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`,
     `packages/provegate/test/open-questions.test.ts` (new)
2. **FR-2 — Exactly one §9 section, identified by its heading, holding only bullets.** Three
   related holes, all in the same reader, all closed together.

   **(a) The section must be a bullet list.** The filter keeps only lines matching
   `^\s*-\s+\S`, so a §9 written as bold paragraphs reports zero unresolved items whatever
   it contains. Per `narrow-the-grammar-not-the-parser`, restrict what the section may
   contain rather than teaching the filter to read paragraphs. Inside it, a line must be
   blank, a bullet start matching `^\s*-\s+\S`, or an **indented continuation** of the
   preceding bullet matching `^\s+\S`. Nothing else — no leading explanatory line, no
   comment. A continuation is part of its bullet, and per FR-1 an **exempt** bullet may not
   have one.

   **(b) There must be exactly one such section.** `sectionMatching` returns the **first**
   match and an empty string when there is none (`markdown.ts:90`), and the lint uses it. So
   a document with two `## 9. Open Questions` headings has its second — and every question in
   it — invisible, and a document with **no** such heading reports zero rather than failing.
   Use `sectionsMatching` (`markdown.ts:65`): zero fails as missing, two or more fails as
   ambiguous.

   **(c) Counting matches is not enough; identify the heading.** `sectionsMatching` is
   case-insensitive and substring-based (`markdown.ts:74`), so a document whose only heading
   is `## Resolved Open Questions` has exactly one match and would pass — the precise trap
   authors are steered into when they move resolved history out of §9. The heading must,
   after stripping an optional leading ordinal, equal `Open Questions` case-insensitively
   and nothing more. Measured 2026-07-27: all six PRDs in the wip directory already use the
   canonical form, so this narrowing costs nothing today.

   **The same first-match hole exists in the FR block** (`frBlocks`, `prd-ready.ts:28`) and
   is closed the same way, by the same heading rule. §11's copy of it is **not** here: it
   belongs to PRD-024, because that PRD's own claim about malformed rows is false without
   it.
   - **Targets:** `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`,
     `packages/provegate/src/core/gates/prd-ready.ts::frBlocks`,
     `packages/provegate/test/open-questions.test.ts`
3. **FR-3 — The corpus prerequisites, named and measured before the rule lands.** FR-1 and
   FR-2 both turn a silent pass into a failure, so the live corpus must be measured, not
   assumed. This is the requirement the wider PRD-024 lacked: its iteration-3 fix closed a
   hole correctly and did not measure what the closure broke, and iteration 4 found the
   blast radius the hard way.

   **Measured 2026-07-27 across the configured wip directory. Five of six PRDs fail today:**

   | PRD | Why it fails |
   | --- | ------------ |
   | PRD-021 | §9 is paragraph-form, so FR-2(a) rejects it |
   | PRD-023 | `(none)` followed by trailing prose and a continuation |
   | PRD-025 | same |
   | PRD-026 | same |
   | PRD-027 | `- [ ] none.` — a checkbox form, which is none of FR-1's three |
   | PRD-024 | conforms — it was rewritten to during its own readiness rounds |

   Each fix is one line: move the prose out of the bullet. Five of the six are in the same
   wave and under active revision anyway, so the cost is real and small. They are **Phase-4
   prerequisites**: this PRD reports and never edits another author's document.

   **Allowlisting an expected failure is forbidden.** A sweep with a known-red exemption is
   the ledger-shaped bypass `known-red-ledger-must-expire` warns about, arriving in a test
   instead of a ledger. If a listed PRD is still failing when Phase 4 starts, stop and hand
   back.

   **The corpus pass runs the lint it verifies.** PRD-023 named the repo bundle for this and
   that bundle never calls the readiness lint. The runnable form is a package test:
   iterate every PRD under the configured wip directory and call the lint with the caller's
   real argument shape — config, manifest, content **and the repository root**, four
   arguments, as `cli.ts:654-655` passes them. Omitting the root fails with an unrelated
   missing-root error in this memory-enabled repository, so a three-argument call is
   `fixture-must-reach-production-shape` violated in the FR that cites it.

   **The corpus test reads outside its package.** If PRD-024 has already declared the wip
   directory as a turbo `test` input, nothing more is needed and `turbo.json` is not a
   target here. If it has not, this PRD declares it — the same choice, for the same reason
   (`turbo-cache-masks-out-of-input-reads`). Check before claiming.
   - **Targets:** `packages/provegate/test/open-questions.test.ts`

---

## 5. Non-Goals (Out of Scope)

- **The §11 command reader and its section cardinality.** PRD-024, which after the
  2026-07-27 narrowing has no prerequisites and no ordering constraint. Do not pull it back.
- **Editing another PRD's §9.** FR-3 reports; the five listed PRDs are their authors'.
- **A corpus sweep flag on the CLI.** PRD-026 adds sweep flags for other sections; a
  readiness-lint sweep is a plausible follow-on and is not needed to prove this fix.
- **Rewriting completed PRDs** to satisfy the stricter grammar. Historical artifacts stand
  and are outside the sweep.
- **Teaching the filter to read paragraphs, bold runs, or nested structures.** The fix is a
  grammar restriction. A hand-rolled Markdown reader never reaches renderer parity, which is
  the whole point of `narrow-the-grammar-not-the-parser`.
- **A fifth predicate for the exemption.** Four rounds produced four predicates and four
  hiding places. FR-1 removes the free text instead; if a fifth hiding place appears, that
  is evidence the approach is wrong, not that the predicate needs another clause.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** an Open Questions bullet that is genuinely unresolved and happens to contain the
  word "deferred", **When** the lint runs, **Then** it is counted as unresolved.
- **Given** a bullet reading *"Why was this deferred? See [background](…)"*, **Then** it is
  counted as unresolved — a link plus the word is not a deferral.
- **Given** `- (none) — why is auth still undecided?`, **Then** it fails: the exempt form
  carries no tail.
- **Given** `- (none)` followed by an indented unresolved question, **Then** it fails: the
  exempt form carries no continuation.
- **Given** `- (none)` followed by `<!-- Who owns the authorization decision? -->`, **Then**
  it fails: comments are not a permitted line form in this section.
- **Given** a bullet whose entire content is `(none)`, or `Deferred to <id>`, or
  `Deferred: [text](target)`, **Then** each is exempt — the positive control for the four
  cases above.
- **Given** `Deferred to   PRD-123` with repeated whitespace, or a case variant, **Then** it
  is still exempt; **given** `Deferred:` with an empty target, **Then** it is not.
- **Given** an Open Questions section written as bold paragraphs containing an unresolved
  question, **When** the lint runs, **Then** it fails — this is the reviewer's injected case,
  which returns clean today.
- **Given** a document with two Open Questions sections, or none, **Then** the lint fails in
  each case.
- **Given** a document whose only matching heading is `## Resolved Open Questions`, **Then**
  the lint fails — a heading that contains the words is not the section.
- **Given** a document with two Functional Requirements sections, **Then** the lint fails —
  the same first-match hole, closed the same way.
- **Given** every PRD in the configured wip directory, **When** the corpus test runs,
  **Then** each file's outcome matches its expectation, and a newly failing file is reported
  by name rather than edited or allowlisted.

---

## 7. Technical Considerations

### Architecture

- **Remove the free text, do not predicate it.** Four rounds proved that any rule permitting
  free text beside an exemption marker leaves a place to put a question, because nothing
  syntactic separates rationale from question. The exempt form carries none.
- **Grammar over parser.** Both FRs restrict what the document may contain. Teaching the
  filter to recognize bold paragraphs is the road to renderer parity.
- **Measure the blast radius with the rule.** FR-3 exists because the predecessor's
  iteration-3 fix was correct and unmeasured, and iteration 4 found five broken artifacts
  and a broken fixture that the fix had silently created. A stricter grammar ships with its
  corpus table or it does not ship.

### Dependencies

- **PRD-024** — no hard ordering, but both edit `prd-ready.ts`, so they serialize on that
  file. PRD-024 also declares the wip directory as a turbo test input; if it lands first,
  FR-3 inherits that and adds nothing.
- **Five corpus prerequisites** (FR-3), each a one-line §9 edit by that PRD's author.
- `prd-ready.ts` is also claimed by PRD-021 and PRD-026. Re-run `gate queue` before claiming
  rather than trusting this paragraph.
- No new runtime dependencies; `packages/provegate` stays at zero.

### Rollback

Revert the exemption matcher, the line grammar, and the two cardinality checks; delete the
new test file. No exported signature, config key, flag, or state shape changes, so nothing
published moves and no adopter sees anything but a lint that counts differently.

**The corpus is the asymmetry.** Forward, five PRDs are edited by their authors to conform.
Backward, those edits stay — a §9 written in the closed form is still valid under the old
substring rule, since the old rule is strictly more permissive. So a rollback is safe and
leaves no artifact stranded, which is the reason the prerequisites are cheap.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/gates/prd-ready.ts::lintPrd` — the exemption form, the
      line grammar, §9 cardinality and heading identity
- [ ] `packages/provegate/src/core/gates/prd-ready.ts::frBlocks` — the same cardinality rule
- [ ] `packages/provegate/test/open-questions.test.ts` (new) — the deny matrix, one fixture
      per historical hiding place, plus the wip corpus pass

---

## 9. Open Questions

- (none)

---

## 10. References

- `_brain/learnings/narrow-the-grammar-not-the-parser.md` — governs both FRs
- `_brain/learnings/false-green-on-missing-file.md` — the class both defects belong to
- `_brain/learnings/known-red-ledger-must-expire.md` — binds FR-3's no-allowlist rule
- `_readiness/wip/readiness-024-readiness-lint-parsers.md` — four independent rounds; the
  four hiding places in §1 are its findings, in order
- PRD-024 — the §11 half of the original document, which stays there

---

## Memory Inputs

- applied: `narrow-the-grammar-not-the-parser` — both FRs are this record's direct
  application: the §9 reader is a hand-rolled Markdown scanner, so the fix restricts what the
  section may contain instead of teaching it to read paragraphs, tails, or comments.
- applied: `false-green-on-missing-file` — both defects are false greens produced by a reader
  answering about a span it did not read; the fixtures assert the failure, not just the pass.
- applied: `assert-absent-needs-an-independent-cause` — the deny matrix is the risk here: a
  "this does not pass" assertion is worthless if the input would have failed anyway. Every
  one of the four historical cases is paired with a positive control on the same shape.
- applied: `known-red-ledger-must-expire` — FR-3 forbids allowlisting an expected corpus
  failure. A sweep with a known-red exemption is this record's bypass arriving in a test
  rather than a ledger, and five listed prerequisites is exactly the pressure that would
  tempt it.
- applied: `fixture-must-reach-production-shape` — the corpus test calls the lint with all
  four arguments; a three-argument call fails on an unrelated memory error in this repository
  and would have reported as coverage.
- reviewed: `turbo-cache-masks-out-of-input-reads` — the corpus test reads outside its
  package, and PRD-024 already declares the wip directory as a test input. Reviewed rather
  than applied because if that PRD lands first this one inherits the declaration and changes
  nothing; FR-3 says to check before claiming.

---

## Memory Outputs

- learning: `_brain/learnings/exemption-marker-needs-no-prose.md` — that a lint exemption
  which permits free text beside its marker will always leave one place to put the thing
  being exempted, because nothing syntactic separates a rationale from a claim; measured
  four times in four consecutive rounds, each hiding place created by the previous fix.

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `packages/provegate/src/core/gates/prd-ready.ts`
- `packages/provegate/test/open-questions.test.ts`
- `_brain/learnings/exemption-marker-needs-no-prose.md`

**Contested, measured with `gate queue` on 2026-07-27:**
`packages/provegate/src/core/gates/prd-ready.ts` is claimed by PRD-021, PRD-024 and PRD-026.
Serialize; do not run this concurrently with any of them. Re-run `gate queue` before
claiming rather than trusting this paragraph.

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Review artifact: `_docs/reviews/review-028-open-questions-grammar.md`
- Learning: `_brain/learnings/exemption-marker-needs-no-prose.md` — the Memory Output above,
  repeated here because the two lists are one contract
- Decision: `none` — no architectural decision is taken here; one reader is restricted to a
  grammar it can actually decide

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                              | Scope | Notes |
| ---- | ------------------------------------------------------------ | ----- | ----- |
| FR-1 | `pnpm --filter provegate test test/open-questions.test.ts`    | pkg   | one deny fixture per historical hiding place — the bare word, the word plus an unrelated link, the same-line tail, the continuation, the comment — each paired with its positive control |
| FR-1 | `pnpm --filter provegate test test/open-questions.test.ts`    | pkg   | whitespace and case variants of the deferral form are exempt; an empty link target is not |
| FR-2 | `pnpm --filter provegate test test/open-questions.test.ts`    | pkg   | a paragraph-form section fails; zero and duplicate sections each fail; a heading that merely contains the words is not the section; duplicate requirement sections fail the same way |
| FR-3 | `pnpm --filter provegate test test/open-questions.test.ts`    | pkg   | the corpus pass: every PRD in the configured wip directory run through the readiness lint with all four arguments, expected outcome asserted per file, no allowlist |
| FR-3 | `pnpm --filter provegate test`                                | pkg   | the whole package suite stays green |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm verify:workflow` — the repo bundle stays green

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/open-questions.test.ts` — all four historical hiding
  places, the paragraph section, and the duplicate and missing sections must each **fail**. A
  grammar that only passes on good input is not evidence, and this is the PRD where that
  matters most: four previous rules each passed their own tests.
- Contract test: n/a — no client-to-server payload ships.

Before Phase 2 PASS, run: `gate check PRD-028`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` plus narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT permit free text beside an exemption marker in any form — trailing, leading,
  continuation, or comment. Four rounds produced four predicates and four hiding places, and
  every one of them was created by the previous fix.
- DO NOT add a fifth predicate if a new hiding place appears. That is evidence the approach
  is wrong, not that the rule needs another clause.
- DO NOT delete the `deferred` exemption to close it. The template promises a
  deferral-with-a-link escape and removing it breaks PRDs that legitimately use it.
- DO NOT teach the filter to read paragraphs, bold runs, or nested structures. The fix is a
  grammar restriction.
- DO NOT accept a heading that merely contains the words. `## Resolved Open Questions` is
  exactly the trap authors fall into when moving resolved history out of the section.
- DO NOT ship this without the corpus table measured against the live wip directory. The
  predecessor's iteration-3 fix was correct and unmeasured, and it silently invalidated five
  artifacts and an existing fixture.
- DO NOT edit another PRD's §9 to make the corpus green. Report and stop.
- DO NOT allowlist a known-failing PRD. Five prerequisites is exactly the pressure that
  would tempt it.
- DO NOT take §11's cardinality fix from PRD-024. It lives there because that PRD's own
  claim depends on it.
- DO NOT call the readiness lint with three arguments in the fixtures. The fourth is the
  repository root and omitting it fails for a reason unrelated to the rules under test.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-27 | Claude Opus 5, on owner direction | **Split out of PRD-024 after readiness iteration 4.** Four independent rounds scored the combined PRD 6.75, 6.83, 7.40, 6.95 — a band, not a trend — and **every blocking finding in all four came from this half**, while the §11 defect drew no objection after round two. Two unrelated problems were sharing a document and the smaller one was being held hostage. What comes here is the full record rather than a restatement: the two defects with their measurements, and **the four hiding places in the order they appeared**, each created by the previous fix, which is the most useful thing four adversarial rounds produced. FR-1 stops adding predicates and removes the free text instead. FR-2 folds in the section-cardinality and heading-identity holes iterations 3 and 4 found. **FR-3 is new and exists because of iteration 4's lesson**: the predecessor's fix was correct and unmeasured, and silently invalidated five wip PRDs and an existing fixture — so the corpus table is a requirement, measured 2026-07-27, with five named Phase-4 prerequisites and an explicit ban on allowlisting them. §11's cardinality stays in PRD-024 because that PRD's own claim about malformed rows is false without it. Created with `gate new` |
