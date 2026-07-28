# PRD-028: Open Questions Grammar — Implement the Rule the Method Already States

> **Status**: Draft
>
> **Created**: 2026-07-27
> **Updated**: 2026-07-28
> **Author**: Claude Opus 5 (original), Claude Fable 5 (narrowing rewrite), for owner review
> **Audience**: Implementing Agent
> **Slug**: `open-questions-grammar`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: A method-fidelity defect in the readiness lint's §9 reader, plus the
> section cardinality it needs, plus the template line that teaches the form. No new flag,
> config key, CLI command, or exported signature: only which documents pass moves. Not
> `test-hardening` because production lint code changes, not only tests — and the passing
> set moving is what makes the measured corpus procedure a requirement rather than a
> courtesy.
> **Autonomous Close**: operator-gated
> **Value**: 3.70 (MF/UI/TL/AR/RM: 5/4/2/3/4)

<!-- 0.25*5 + 0.25*4 + 0.20*2 + 0.15*3 + 0.15*4
     = 1.25 + 1.00 + 0.40 + 0.45 + 0.60 = 3.70

     One recorded expansion under the expand-don't-delete rule (iteration 2 found the
     previous 3.55 rested on a disproved MF premise; at MF 4 it computed 3.30, below the
     3.40 threshold): FR-4 now ships the exact closed forms into the PRD template's §9
     guidance, which is where an adopter first meets the rule — AR rises 2→3 on that
     delivery, and MF 5 is re-earned rather than assumed, because the existence check FR-1
     adds is what makes "deferred to a follow-up PRD" provable instead of asserted. -->

---

## 1. Introduction / Overview

Split out of PRD-024 on owner direction 2026-07-27, re-founded the same day after
iteration 1 falsified the free-text exemption, and **narrowed radically on 2026-07-28 by
owner decision** (in-session, following the PRD-025 precedent) after iteration 2 found a
sixth hiding place inside the form adopted specifically because it was supposed to have
none — and tripped the method-content traceability hard cap on it.

### The record this document is built on

Six successive exemption rules produced six hiding places, each created by the previous
fix. The seventh rule is not a better exemption grammar; it is the owner's decision to
**close the grammar entirely**: two exact forms, everything else refused, and the one
field that previous rules left to the author — the deferral target — bound to a **real,
existing work item** whose number the lint verifies.

| # | Rule at the time | Where the question moved |
| - | ---------------- | ------------------------ |
| 0 | substring `deferred` anywhere (predates the rounds) | a bullet that merely mentions the word |
| 1 | must also carry a link or a work-item id | *"Why was this deferred? See [background](…)"* |
| 2 | must open with the deferral form | `- (none) — why is auth still undecided?`, same line |
| 3a | end-anchored | an indented continuation under the exempt bullet |
| 3b | continuations refused | `<!-- Who owns the authorization decision? -->` |
| 4 | no free text; `Deferred: [text](target)` | the link **label**: `Deferred: [Who owns authorization?](background.md)` |
| 5 | label is an id; target basename starts with it | the target basename **suffix**: `Deferred to [PRD-123](_prds/wip/prd-123-who-owns-authorization.md)`, target existence deliberately unchecked |

**Seven deny fixtures, one per row, and every count in this document is seven.**

### Why existence-checking flips, and why that closes the hard cap

Iteration 2's cap finding was exact: with existence deliberately unchecked, *nothing
proves the link points at a follow-up PRD*, so the rule does not implement
`source-snapshot/prompts/phase-2-readiness-scorer.md:210` — *"empty, or every entry is
marked as deferred to a follow-up PRD with a link"*. The previous revision's argument for
not checking ("a follow-up may be drafted after the deferral") had the workflow backwards:
`gate new` exists precisely so the follow-up is created **first** and then deferred to. A
deferral to a work item that does not exist is a wish wearing a link. Under the closed
grammar the target must exist and carry the label's number — and then the "suffix free
text" hole dissolves by construction: the suffix is the real slug of a real work item,
visible on the board and in the queue. An author who creates
`prd-123-who-owns-authorization.md` to smuggle a question has not hidden it; they have
**filed it**, which is what the snapshot's rule wanted all along.

### The two shipped defects (unchanged diagnosis, measured)

| # | Lint | Reads | Should read | Symptom |
| - | ---- | ----- | ----------- | ------- |
| a | the §9 exemption (`prd-ready.ts:153` region) | `deferred` as a substring, anywhere in the bullet | the closed forms below | a genuine unresolved question is invisible whenever it merely *mentions* the word |
| b | the §9 selection | bullet-start lines only, in the first matching section only | the section's whole raw body, in exactly one section identified by its heading | prose reports **zero unresolved items whatever it contains**; a second section is invisible; no section reports zero |

---

## 2. Goals

### Primary Goals

- [ ] Close the §9 grammar to two exact forms with no author-typed field anywhere — the
      seventh rule is a closed set, not a better predicate.
- [ ] Make an unresolved question fail the lint regardless of the shape it is written in,
      including every one of the seven historical shapes.
- [ ] Prove — not assume — that a deferral points at a real follow-up work item, which is
      what the snapshot's rule states and what closes the traceability cap.
- [ ] Require exactly one §9 section, identified by its heading; same for the FR block.
- [ ] Teach the form where authors first meet it: the shipped PRD template's §9 guidance.
- [ ] Land it with the corpus prerequisites measured against the live directory at Phase 3.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Author-typed fields in the exempt forms | 1 (the link target's basename suffix, unverified) | 0 — every character of both forms is either fixed syntax or verified against a real work item | FR-1 fixtures |
| Places an unresolved question can hide in §9 | 7, measured across six successive rules plus the original | 0 | the FR-1 deny matrix, one fixture per historical hiding place, seven rows |
| Unresolved questions hidden by paragraph, fence, HTML or comment form | unbounded — a prose §9 reports 0 whatever it contains | 0 — any line outside the closed grammar fails | FR-2 fixtures |
| §9 sections a document may declare | unbounded; only the first is read | exactly 1 | FR-2 fixture |
| Deferrals whose target provably exists with the label's number | not checked | all | FR-1 fixtures |
| Wip PRDs failing the restored rule | measured at Phase 3 against the live directory, never hardcoded | 0, by their authors before this lands | the FR-3 prerequisite procedure |
| Template §9 guidance stating the exact closed forms | 0 — it states the rule's intent, not the forms | 1, round-tripped | FR-4, `content-templates.test.ts` |

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
      paragraph, a continuation, a same-line tail, a comment, a fenced block, a link
      label, or a link-target slug pointing at nothing.
- [ ] An entry deferred to a real follow-up work item, in the exact form, still passes.

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

1. **FR-1 — The closed exempt forms, with the target verified.** Replace the substring
   filter. A §9 bullet is exempt when its entire raw line is exactly one of:

   - `- (none)` — nothing before, nothing after, single line
   - `- Deferred to [PRD-NNN](<path>)` — where **all three variable parts are verified,
     none typed freely**:
     1. the **label** matches the configured work-item id pattern in full (`PRD-\d+` under
        the shipped prefix config) and nothing more;
     2. the **path** points inside the configured artifact root
        (`dirs.artifacts.prd.dir`), in any lifecycle state directory
        (`dirs.stateRoles.*`), never outside it;
     3. the file at that path **exists** (resolved against the repository root the lint
        already receives) and its basename begins with the lower-cased label followed by
        `-` — the number in the link is the number on disk.

   A label/target number mismatch fails. A missing file fails. A path outside the
   artifact root fails. A label that is prose fails. There is no field left in either
   form where an author can type a question, because every variable character is checked
   against a real work item — which is also precisely the snapshot line
   (`source-snapshot/prompts/phase-2-readiness-scorer.md:210`) made machine-checkable:
   *deferred to a follow-up PRD* (the file exists and is that PRD), *with a link* (the
   form is a link). That is the traceability argument the iteration-2 hard cap demanded.

   **Ordering is the workflow, not a rule relaxation.** Create the follow-up with
   `gate new`, then defer to it. The previous revision's existence waiver is deleted as
   the sixth hiding place's enabling condition — reversed by owner decision, 2026-07-28.

   **Matching is exact, not normalized.** No case folding on the fixed syntax, no
   whitespace collapsing, no trailing punctuation, no alternate separators. The previous
   revision's tolerance paragraph is gone: tolerance is surface area, and this document's
   history is what surface area costs. (The lower-casing in rule 3 maps the label to the
   filename convention; it is a derivation, not a tolerance.)

   **The deny matrix is the requirement: one fixture per hiding place in §1's table — all
   seven** — each paired with a positive control on the same shape (the exact form, built
   against a fixture work item that exists). A deny fixture whose input would fail anyway
   is not evidence (`assert-absent-needs-an-independent-cause`), and this is the PRD where
   that matters most: six previous rules each passed their own tests.
   - **Targets:** `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`,
     `packages/provegate/test/open-questions.test.ts` (new)
2. **FR-2 — Exactly one §9 section, holding only the closed grammar, judged on raw
   lines.**

   **(a) The grammar is a closed set of line forms.** Within the §9 section body, every
   raw line must be one of: blank; the exact `- (none)` line; an exact `- Deferred to …`
   line per FR-1; or a single optional terminal `---` (section furniture, explicitly
   allowed — iteration 1 measured that forbidding it fails every §9 in the repository
   including this document's own). **Anything else fails, by name**: a paragraph, a bold
   run, an indented continuation, a same-line tail, an HTML comment, a fenced code line,
   raw HTML, a checkbox bullet, a second `---`. There is no continuation clause and no
   comment clause because rows 3a and 3b of the history are where those clauses hid.

   **(b) Judge the raw text, not a masked view — and not a line-kind taxonomy either.**
   Iteration 1 proved `sectionsMatching` unusable here (it blanks fenced and raw-HTML
   lines to `''`, so a masked question reads as "blank"); iteration 2 added that comments
   are not a `LineKind` at all (`scan.ts:382, 412` — they are `text` carrying a mask), so
   a line-kind grammar cannot be followed literally either. The closed grammar dissolves
   both problems: use `scanDocument` plus the exported `sectionBounds` to locate the one
   §9 section, then judge the **raw source lines** within those bounds against the closed
   set. A fenced question is not an allowed line, so it fails; a comment is not an
   allowed line, so it fails; no masking, no taxonomy, no renderer parity — the document
   is restricted instead (`narrow-the-grammar-not-the-parser`).

   **(c) Exactly one such section.** Zero fails as missing; two or more fails as
   ambiguous. The heading must, after stripping an optional leading ordinal, equal
   `Open Questions` case-insensitively and nothing more — `## Resolved Open Questions` is
   not the section.

   **(d) The same first-match hole exists in the FR block** (`frBlocks`,
   `prd-ready.ts:28`) and is closed the same way: exactly one Functional Requirements
   section, heading-identified. §11's copy is **not** here: PRD-024 shipped it
   (`fc610f9`), and the boundary was independently confirmed not to be a seam.
   - **Targets:** `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`,
     `packages/provegate/src/core/gates/prd-ready.ts::frBlocks`,
     `packages/provegate/test/open-questions.test.ts`
3. **FR-3 — Measure the corpus at Phase 3 and name every prerequisite before the rule
   lands.** Both FRs turn a silent pass into a failure, so the live corpus is measured,
   not assumed — the requirement is the **procedure**, because a hardcoded table in this
   document was wrong within hours twice: enumerate the configured wip directory, run
   each file through the new rules, record the failures with their reason in the task
   plan. Every failing PRD is a **Phase-4 prerequisite owned by its author** — under the
   closed grammar the fix is mechanical (delete the tail, or file the follow-up and use
   the exact form), which is what makes a long prerequisite list cheap rather than
   tempting.

   **This PRD reports and never edits another author's document. Allowlisting an
   expected failure is forbidden** (`known-red-ledger-must-expire`). If a listed PRD is
   still failing when Phase 4 starts, stop and hand back.

   **Existing fixtures are prerequisites too, and they are declared.**
   `prd-ready.test.ts:13` uses `(none — resolved)` and expects it to pass; the same file
   lints completed PRD-002, whose exemption carries a tail and a continuation. Both fail
   the closed grammar, and both edits are **deliberate lint changes with a corpus pass
   behind them** — the half of `strictness-added-during-extraction-is-a-behavior-change`
   that is allowed, declared instead of discovered.

   **The corpus pass runs the lint it verifies, with the production call shape — five
   arguments.** Config, manifest, content, the repository root, **and the PRD's own
   number**: `cli.ts` passes all five (re-read the call site rather than this sentence;
   at this writing it is the `runCheck` body), and the fifth arms value-header presence
   enforcement from the configured `enforceFrom`, so a four-argument fixture passes a
   header-less file the real `gate check` refuses —
   `fixture-must-reach-production-shape`, the same finding PRD-024's remediation hit one
   parameter earlier.

   **No turbo edit is needed, and that is asserted rather than assumed.** PRD-024 landed
   (`fc610f9`) with the `test` task's inputs covering `$TURBO_ROOT$/_prds/**`,
   `workflow.config.json` and `gates.manifest.json`, plus a coverage assertion binding
   the glob to the configured artifact root (`lint-parsers.test.ts`). This PRD's corpus
   test reads the same three surfaces and nothing more, so the cache key is already
   honest; the corpus test here asserts those inputs are present (one read of
   `turbo.json`, no write) and `turbo.json` leaves this PRD's surface.
   - **Targets:** `packages/provegate/test/open-questions.test.ts`,
     `packages/provegate/test/prd-ready.test.ts`
4. **FR-4 — Teach the closed forms where authors first meet them.** The shipped PRD
   template's §9 guidance states the rule's intent but not the forms, which is how six
   generations of near-miss syntax got written in good faith. The template's §9 section
   comment now states the two exact lines, verbatim, with one sentence: anything else in
   this section fails readiness. **Traceability:** this is the snapshot rule of
   `phase-2-readiness-scorer.md:210` restated as its exact machine-checked grammar — no
   new method content, the same rule made precise; the changelog carries this argument
   and the round-trip test (`content-templates.test.ts`) keeps holding the template's
   §11 contract unchanged.
   - **Targets:** `packages/provegate/templates/prd-template.md`,
     `packages/provegate/test/content-templates.test.ts`

---

## 5. Non-Goals (Out of Scope)

- **The §11 command reader and its section cardinality.** PRD-024 shipped them
  (`fc610f9`). Do not pull them back.
- **Removing the §9 exemption or routing deferrals to the status board.** Proposed and
  rejected 2026-07-27: the source snapshot states the exemption; removing it fabricates
  method content in the opposite direction.
- **An exemption grammar with any author-typed field.** Six rules produced six holes. The
  owner's 2026-07-28 decision closes the grammar; a request to loosen it is a new owner
  decision, not a remediation.
- **Editing another PRD's §9.** FR-3 reports; the failures are their authors'.
- **Rewriting completed PRDs** to satisfy the closed grammar. Historical artifacts stand
  and are outside the sweep — except that `prd-ready.test.ts` lints one as a fixture,
  which FR-3 declares.
- **Teaching the filter to read paragraphs, bold runs, or nested structures.** The fix is
  a grammar restriction, never parser growth.
- **Changing the phase-2 scorer prompt.** Its :218 line already asks for a link to a
  follow-up; the closed form satisfies it as written.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a bullet that is genuinely unresolved and happens to contain the word
  "deferred", **Then** it is counted as unresolved. *(0)*
- **Given** *"Why was this deferred? See [background](…)"*, **Then** it fails. *(1)*
- **Given** `- (none) — why is auth still undecided?`, **Then** it fails. *(2)*
- **Given** `- (none)` followed by an indented unresolved question, **Then** it fails.
  *(3a)*
- **Given** `- (none)` followed by an HTML comment containing a question, **Then** it
  fails. *(3b)*
- **Given** `- Deferred: [Who owns authorization?](background.md)`, **Then** it fails —
  the label is not an id. *(4)*
- **Given** `- Deferred to [PRD-123](_prds/wip/prd-123-who-owns-authorization.md)` where
  no such file exists, **Then** it fails — the target must exist and carry the label's
  number. *(5)*
- **Given** `- (none)` alone, or `- Deferred to [PRD-NNN](<path>)` whose target exists
  under the artifact root with the label's number, **Then** each is exempt — the positive
  controls, one per deny shape, seven in all.
- **Given** a label and an existing target naming **different** numbers, **Then** it
  fails.
- **Given** a §9 written as bold paragraphs containing an unresolved question, **Then**
  the lint fails — the reviewer's injected case, which returns clean today.
- **Given** a fenced code block, raw HTML, or a checkbox bullet inside §9, **Then** the
  lint fails — the raw line is not in the closed set.
- **Given** the section's single trailing `---`, **Then** it is ignored; **given** a
  second `---`, **Then** it fails.
- **Given** two Open Questions sections, or none, **Then** the lint fails in each case;
  **given** a document whose only matching heading is `## Resolved Open Questions`,
  **Then** it fails.
- **Given** two Functional Requirements sections, **Then** the lint fails — the same
  first-match hole, closed the same way.
- **Given** every PRD in the configured wip directory, **When** the corpus test runs with
  all five production arguments, **Then** each file's outcome matches the Phase-3
  procedure's record, and a newly failing file is reported by name rather than edited or
  allowlisted.
- **Given** the shipped template's §9 guidance, **Then** it states the two exact forms
  and round-trips through the content tests unchanged elsewhere.

---

## 7. Technical Considerations

### Architecture

- **A closed set, not a predicate.** Every previous rule tried to describe what is
  forbidden; each description had a complement nobody enumerated. The closed grammar
  enumerates what is *allowed* — four line forms — and the complement is everything,
  which is not a hiding place because it all fails.
- **Raw lines, located by the scanner.** `scanDocument` + `sectionBounds` find the one
  section; the judgment runs on raw source lines within it. No masked view, no line-kind
  taxonomy, no renderer parity race.
- **Existence is the proof.** The link's label and target are not validated as *shapes*;
  they are resolved against the repository. That is what "deferred to a follow-up PRD"
  means, and it is the difference between this revision and the six that failed.
- **Measure the blast radius with the rule, at Phase 3.** The corpus procedure, not a
  table; two hardcoded tables have already aged into falsehood inside this one document.

### Dependencies

- **PRD-024 — landed** (`fc610f9`): §11 cardinality, the shared row extractor, and the
  turbo inputs this PRD's corpus test relies on are on main. No ordering constraint
  remains.
- **PRD-026 and this PRD both claim `prd-ready.ts`** — serialize; re-run `gate queue`
  before claiming rather than trusting this paragraph.
- **Every wip PRD failing the closed grammar** — a one-line §9 edit each, by that PRD's
  author, before Phase 4 starts here.
- No new runtime dependencies; `packages/provegate` stays at zero.

### Rollback

Revert the exemption matcher, the closed-grammar judge, the two cardinality checks, and
the template guidance line; delete the new test file; revert the `prd-ready.test.ts`
fixture edits. No exported signature, config key, flag, or state shape changes.

**The corpus asymmetry is favourable.** Forward, the failing PRDs are edited by their
authors to conform. Backward, those edits stay valid: a §9 in the closed form still
passes the old substring rule, which is strictly more permissive. A rollback strands no
artifact.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/gates/prd-ready.ts::lintPrd` — the closed exempt
      forms with target resolution, the raw-line grammar, §9 cardinality and heading
      identity
- [ ] `packages/provegate/src/core/gates/prd-ready.ts::frBlocks` — the same cardinality
      rule
- [ ] `packages/provegate/test/open-questions.test.ts` (new) — the seven-row deny matrix
      with paired positive controls, the grammar fixtures, the wip corpus pass with the
      five-argument call, the turbo-inputs presence assertion
- [ ] `packages/provegate/test/prd-ready.test.ts` — two fixtures the closed grammar
      necessarily invalidates, declared here
- [ ] `packages/provegate/templates/prd-template.md` — §9 guidance states the two exact
      forms (FR-4)
- [ ] `packages/provegate/test/content-templates.test.ts` — the round-trip holds
- [ ] `_brain/learnings/exemption-marker-needs-no-prose.md` — the Memory Output
- [ ] `_brain/INDEX.md` — one appended pointer line for the learning above

---

## 9. Open Questions

- (none)

---

## 10. References

- `docs/research/provegate-bootstrap/source-snapshot/prompts/phase-2-readiness-scorer.md:210`
  — the rule this PRD makes machine-checkable
- `_brain/learnings/narrow-the-grammar-not-the-parser.md` — governs FR-1 and FR-2
- `_brain/learnings/lint-must-name-the-span-it-judges.md` — the §9 reader is the class
  instance this repo keeps shipping; PRD-024's close recorded five others
- `_readiness/wip/readiness-028-open-questions-grammar.md` — the two rounds that
  falsified the free-text approaches and found hiding places 4 and 5
- `_readiness/completed/readiness-024-readiness-lint-parsers.md` — the four combined
  rounds; hiding places 1–3 are its findings

---

## Memory Inputs

- applied: `narrow-the-grammar-not-the-parser` — the whole design: a closed set of
  allowed lines judged on raw text, instead of a parser that learns paragraphs, masks,
  comments, or link anatomy.
- applied: `lint-must-name-the-span-it-judges` — the §9 reader answers about a span it
  does not read (bullet-start lines of the first substring-matched section); FR-2 names
  the span — one heading-identified section, every raw line — and reads exactly it.
- applied: `false-green-on-missing-file` — inverted deliberately: here a **missing** file
  is the failure (a deferral target that does not exist), and the deny fixture for row 5
  asserts it.
- applied: `assert-absent-needs-an-independent-cause` — every deny fixture pairs with a
  positive control on the same shape, built against a fixture work item that exists, so
  "this fails" is evidence about the rule rather than about a broken fixture.
- applied: `known-red-ledger-must-expire` — FR-3 forbids allowlisting an expected corpus
  failure; the closed grammar keeps the prerequisite fixes one-line cheap, which removes
  the pressure that tempts a ledger.
- applied: `fixture-must-reach-production-shape` — the corpus test calls the lint with
  all **five** production arguments; the fifth arms value-header enforcement, and its
  omission was found as a live defect in this wave twice.
- applied: `strictness-added-during-extraction-is-a-behavior-change` — the two
  invalidated `prd-ready.test.ts` fixtures are the allowed half (a rule changed on
  purpose, declared, with a corpus pass); the forbidden half — a guard reaching callers
  nobody warned — is what FR-3's report-never-edit rule prevents.
- applied: `a-rule-corrected-survives-where-it-is-restated` — the fixture count, the
  argument count, and the existence decision each changed in this revision, and each was
  swept at every restatement: the history table, the metrics, FR-1, the Gherkin rows,
  §11 and the DO NOT list all say seven, five, and checked.
- reviewed: `turbo-cache-masks-out-of-input-reads` — the corpus test's reads are inside
  the inputs PRD-024 shipped; FR-3 asserts their presence instead of declaring new ones,
  and `turbo.json` left this PRD's surface on that measurement.
- reviewed: `evidence-pattern-satisfied-by-the-template` — FR-4 writes the exact forms
  into the shipped template, which is precisely the surface this record warns can satisfy
  a required-line check vacuously; the §9 lint judges real documents' sections, never the
  template, and the template round-trip test asserts the guidance without the deny sweep
  reading it.

---

## Memory Outputs

- learning: `_brain/learnings/exemption-marker-needs-no-prose.md` — that a lint exemption
  permitting **any** author-typed field will always leave one place to put the thing
  being exempted, because nothing syntactic separates a rationale from a claim; measured
  six times against six successive rules, each hiding place created by the previous fix,
  and closed only by a grammar whose every variable character is verified against a real
  work item — existence is the proof, prose is the hole.

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
- `packages/provegate/test/prd-ready.test.ts`
- `packages/provegate/templates/prd-template.md`
- `packages/provegate/test/content-templates.test.ts`
- `_brain/learnings/exemption-marker-needs-no-prose.md`

**Contested, re-measured 2026-07-28:** PRD-021 closed and PRD-024 landed (`fc610f9`), so
their old claims on `prd-ready.ts` and `turbo.json` are released; `turbo.json` also left
this PRD's surface (FR-3 asserts, never writes). The live contention is **PRD-026**
(`prd-ready.ts`, `content-templates.test.ts`) — serialize with it. `_brain/INDEX.md` is
in this repository's `sharedAppendOnly` set and is deliberately not claimed. Re-run
`gate queue` before claiming rather than trusting this paragraph.

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Review artifact: `_docs/reviews/review-028-open-questions-grammar.md`
- Learning: `_brain/learnings/exemption-marker-needs-no-prose.md` — the Memory Output
  above, repeated here because the two lists are one contract
- Index pointer: `_brain/INDEX.md` — the one-line hook for the learning above
- Decision: `none` — the owner's narrowing decision is recorded in this PRD's changelog
  and the §9 grammar is a lint rule, not an architecture; if a later PRD wants to loosen
  the closed grammar, that is the moment for an ADR

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                              | Scope | Notes |
| ---- | ------------------------------------------------------------ | ----- | ----- |
| FR-1 | `pnpm --filter provegate test test/open-questions.test.ts`    | pkg   | the seven-row deny matrix, one fixture per historical hiding place, each paired with its positive control; label-target number mismatch fails; a missing target fails; a target outside the artifact root fails |
| FR-2 | `pnpm --filter provegate test test/open-questions.test.ts`    | pkg   | a paragraph section fails; fenced, raw-HTML, comment and checkbox lines fail; one trailing separator is ignored and a second fails; zero and duplicate sections fail; a longer heading is not the section; duplicate requirement sections fail the same way |
| FR-3 | `pnpm --filter provegate test test/open-questions.test.ts`    | pkg   | the corpus pass: every PRD in the configured wip directory through the lint with all five production arguments, outcomes recorded per file, no allowlist; plus the assertion that the test task inputs PRD-024 shipped are present |
| FR-3 | `pnpm test`                                                   | repo  | the whole suite via turbo with the two declared fixture edits and no others — the direct package invocation cannot run under the runner, per the runner-sentinel learning PRD-024 recorded |
| FR-4 | `pnpm --filter provegate test test/content-templates.test.ts` | pkg   | the template round-trip holds with the new section-9 guidance in place |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; only the two declared fixtures change
- `pnpm build` — clean build
- `pnpm verify:workflow` — the repo bundle stays green

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/open-questions.test.ts` — all seven hiding places,
  the paragraph section, the fenced and comment cases, the number-mismatch and
  missing-target cases, and the duplicate and missing sections must each **fail**. A
  grammar that only passes on good input is not evidence, and this is the PRD where that
  matters most: six previous rules each passed their own tests.
- Contract test: n/a — no client-to-server payload ships.

Before Phase 2 PASS, run: `gate check PRD-028`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` plus narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT design an eighth exemption rule. Six predicates produced six holes; the seventh
  is a closed set by owner decision, and loosening it is a new owner decision.
- DO NOT leave any author-typed field in either exempt form. Every variable character is
  either fixed syntax or verified against a real work item on disk.
- DO NOT waive the existence check. Its absence was the sixth hiding place and the
  tripped hard cap; "the follow-up comes later" means create it first with `gate new`.
- DO NOT delete the exemption. The snapshot states it; removing it fabricates method
  content in the opposite direction.
- DO NOT write the grammar against the text `sectionsMatching` returns, and DO NOT build
  a line-kind taxonomy — comments are not a `LineKind`. Locate the section with the
  scanner, judge the raw lines against the closed set.
- DO NOT add a continuation or comment clause to the grammar. Rows 3a and 3b are where
  those clauses hid.
- DO NOT hardcode the corpus table in this document. Two of them aged into falsehood
  here; the requirement is the Phase-3 procedure.
- DO NOT edit another PRD's §9 to make the corpus green. Report and stop.
- DO NOT allowlist a known-failing PRD.
- DO NOT quietly edit `prd-ready.test.ts`. Its two invalidated fixtures are declared, and
  the distinction that makes them acceptable is written in the Memory Inputs.
- DO NOT pull §11's cardinality back from PRD-024. It shipped there (`fc610f9`).
- DO NOT call the readiness lint with fewer than its five production arguments in any
  fixture. The fourth's absence fails on an unrelated memory error; the fifth's absence
  skips missing-header enforcement and passes a file the real `gate check` refuses.
- DO NOT let the §9 lint read the shipped template as a document, and DO NOT let the
  template's example forms satisfy any deny fixture —
  `evidence-pattern-satisfied-by-the-template`.
- DO NOT run the whole package suite as a direct `--filter` invocation in §11. It reaches
  the CLI-spawning revalidate fixtures, which the runner's re-entry sentinel refuses —
  route it through turbo (`runner-sentinel-blocks-cli-spawning-tests`).

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-28 | Claude Fable 5, on owner decision (in-session) | **Radical narrowing — the owner's structural decision, following the PRD-025 precedent: stop designing exemption predicates, close the grammar.** Iteration 2 (Codex, 6.55 ITERATE) found the sixth hiding place inside the form adopted because it was supposed to have none — the link target's basename suffix, with existence deliberately unchecked — and tripped the **method-content traceability hard cap** on exactly that waiver: nothing proved the link pointed at a follow-up PRD. The design answer reverses the waiver rather than adding a seventh predicate: **the target must exist under the configured artifact root and carry the label's number** — existence is the proof the snapshot's rule (*deferred to a follow-up PRD with a link*) always implied, the suffix stops being free text because it is the real slug of a real filed work item, and an author who files a PRD to "hide" a question has filed the question, which is the system working. **The grammar closes**: two exact single-line forms, blank lines, one optional terminal `---`, everything else refused by name — no continuation clause, no comment clause, no tolerance normalization (each was a previous hiding place). **FR-2 drops the line-kind approach** iteration 2 proved unfollowable (comments are not a `LineKind`) for raw-line judgment within scanner-located bounds. **The history is corrected to seven deny rows** (0 original substring + six fix-created moves, 3a/3b split per the record), and seven is the count everywhere. **The five-argument production call** replaces four at every mention (the fifth arms value enforcement — this wave's twice-found defect). **Turbo resolved by measurement**: PRD-024 landed (`fc610f9`) with the inputs and the coverage assertion; FR-3 asserts presence, `turbo.json` leaves the surface. **FR-4 added as the recorded expansion** under expand-don't-delete (iteration 2 showed the old 3.55 rested on a disproved MF premise and computed 3.30 at MF 4): the shipped template's §9 guidance states the two exact forms, with the traceability argument written — the same snapshot rule made precise, not new method content. Value re-declared **3.70 (5/4/2/3/4)** with the expansion recorded in the header comment. Conflict Surface re-measured: 021 closed and 024 landed release `prd-ready.ts` and `turbo.json`; live contention is PRD-026 only. Fixture-count, argument-count and existence corrections swept at every restatement per `a-rule-corrected-survives-where-it-is-restated`, now a declared input |
| 2026-07-27 | Claude Opus 5, on owner direction | **Re-founded after iteration 1 (6.18) falsified the previous approach, and after reading the source snapshot.** The owner's decision was to remove the exemption entirely and route deferrals to the status board. **Measurement blocked it**: `source-snapshot/prompts/phase-2-readiness-scorer.md:210` states the exemption as method law — *empty, or every entry deferred to a follow-up PRD with a link* — so removing it would fabricate method content in the opposite direction from the defect. FR-1 therefore implemented the snapshot's rule — `(none)` or `Deferred to [<id>](<path>)` with the label and target bound to the same work item — rather than designing a sixth grammar. [Superseded where it conflicts with the 2026-07-28 narrowing: the existence waiver this row's revision carried became the sixth hiding place, the five-count became seven, and the four-argument call became five] |
| 2026-07-27 | Claude Opus 5, on owner direction | **Split out of PRD-024 after readiness iteration 4**, carrying the §9 defects and the hiding places four independent rounds uncovered. Created with `gate new` |
