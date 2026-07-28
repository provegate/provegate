# PRD-028: Open Questions Grammar — Implement the Rule the Method Already States

> **Status**: Operator Verification
>
> **Created**: 2026-07-27
> **Updated**: 2026-07-28
> **Author**: Claude Opus 5 (original), Claude Fable 5 (narrowing rewrite), for owner review
> **Audience**: Implementing Agent
> **Slug**: `open-questions-grammar`
> **Cycle Phase**: 7 (Operator Verification)
> **PRD Class**: infra
> **Class Rationale**: A method-fidelity defect in the readiness lint's §9 reader, plus the
> section cardinality it needs, plus the template line that teaches the form. No new flag,
> config key, CLI command, or exported signature: only which documents pass moves. Not
> `test-hardening` because production lint code changes, not only tests — and the passing
> set moving is what makes the measured corpus procedure a requirement rather than a
> courtesy.
> **Autonomous Close**: operator-gated
> **Value**: 3.45 (MF/UI/TL/AR/RM: 4/4/2/3/4)

<!-- 0.25*4 + 0.25*4 + 0.20*2 + 0.15*3 + 0.15*4
     = 1.00 + 1.00 + 0.40 + 0.45 + 0.60 = 3.45

     MF is 4, not 5, at the iteration-4 scorer's derivation and deliberately kept there:
     two consecutive revisions claimed the follow-up guarantee was re-earned and two
     consecutive rounds broke it (a self-link, then a symlink alias). MF 5 is available
     to a future round only after the canonical-resolution mechanism survives one
     unbroken. AR 3 stands on FR-4's corrected template delivery — the one recorded
     expansion under expand-don't-delete. 3.45 clears the 3.40 threshold without the
     contested point. -->

---

## 1. Introduction / Overview

Split out of PRD-024 on owner direction 2026-07-27, re-founded the same day after
iteration 1 falsified the free-text exemption, and **narrowed radically on 2026-07-28 by
owner decision** (in-session, following the PRD-025 precedent) after iteration 2 found a
sixth hiding place inside the form adopted specifically because it was supposed to have
none — and tripped the method-content traceability hard cap on it.

### The record this document is built on

Eight successive exemption rules produced nine hiding places, each created by the
previous fix — the seventh (a number-level self-link) and eighth (a symlink alias) found
by iterations 3 and 4 inside this document's own narrowings. The ninth rule is not a
better exemption grammar; it is the owner's decision to **close the grammar entirely**,
with the referent **canonically resolved** — regular file, realpath containment,
realpath distinctness, configured role, recognized H1 — to a distinct, unfinished,
filed work item.

| # | Rule at the time | Where the question moved |
| - | ---------------- | ------------------------ |
| 0 | substring `deferred` anywhere (predates the rounds) | a bullet that merely mentions the word |
| 1 | must also carry a link or a work-item id | *"Why was this deferred? See [background](…)"* |
| 2 | must open with the deferral form | `- (none) — why is auth still undecided?`, same line |
| 3a | end-anchored | an indented continuation under the exempt bullet |
| 3b | continuations refused | `<!-- Who owns the authorization decision? -->` |
| 4 | no free text; `Deferred: [text](target)` | the link **label**: `Deferred: [Who owns authorization?](background.md)` |
| 5 | label is an id; target basename starts with it | the target basename **suffix**: `Deferred to [PRD-123](_prds/wip/prd-123-who-owns-authorization.md)`, target existence deliberately unchecked |
| 6 | target must exist with the label's number | the **referent**: `Deferred to [PRD-028](…prd-028-….md)` — a self-link; a completed PRD or a parser-rejected look-alike passes the same shape test |
| 7 | referent resolved by basename, number, state and existence | the **alias**: a wip symlink named `prd-123-followup.md` pointing at the declaring PRD — every basename-level check passes while the canonical referent is self; the absent fifth argument fails open; a stub passes unread |

**Nine history rows, one deny fixture per row is the floor; sixteen deny fixtures in the
full matrix (the seven extra resolution rejections are FR-1's). Nine and sixteen are the
two counts this document uses everywhere.**

### Why resolution replaces existence, and why that closes the hard cap

Iteration 2's cap finding was exact: with existence unchecked, *nothing proves the link
points at a follow-up PRD*. Iteration 3 sharpened it: with existence checked as a
**shape**, a self-link, a completed PRD, or a parser-rejected look-alike still passes —
existence and number agreement do not establish a *distinct, registered, unfinished
follow-up*. So the referent is **resolved**, not matched: through `parseArtifactName`
(the state builder's own parser), at the configured id width, to an item that is not the
declaring PRD and not finished. The "suffix free text" hole dissolves the same way it
did before — the suffix is the real slug of a real filed work item — and the self-link
hole dissolves because the fifth lint argument names the declaring PRD. An author who
files a real PRD to smuggle a question has filed the question, which is what
`source-snapshot/prompts/phase-2-readiness-scorer.md:210` — *"deferred to a follow-up
PRD with a link"* — wanted all along.

### The two shipped defects (unchanged diagnosis, measured)

| # | Lint | Reads | Should read | Symptom |
| - | ---- | ----- | ----------- | ------- |
| a | the §9 exemption (`prd-ready.ts:153` region) | `deferred` as a substring, anywhere in the bullet | the closed forms below | a genuine unresolved question is invisible whenever it merely *mentions* the word |
| b | the §9 selection | bullet-start lines only, in the first matching section only | the section's whole raw body, in exactly one section identified by its heading | prose reports **zero unresolved items whatever it contains**; a second section is invisible; no section reports zero |

---

## 2. Goals

### Primary Goals

- [ ] Close the §9 grammar to two exact forms with no author-typed field anywhere — the
      ninth rule is a closed set canonically resolved through the state layer, not a
      better predicate.
- [ ] Make an unresolved question fail the lint regardless of the shape it is written in,
      including every one of the nine historical shapes.
- [ ] Prove — not assume — that a deferral resolves to a distinct, registered,
      unfinished follow-up, which is what the snapshot's rule states and what closes the
      traceability cap.
- [ ] Require exactly one §9 section, identified by its heading; same for the FR block.
- [ ] Teach the form where authors first meet it: the shipped PRD template's §9 guidance.
- [ ] Land it with the corpus prerequisites measured against the live directory at Phase 3.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Author-typed fields in the exempt forms | 1 (the link target's basename suffix, unverified) | 0 — every character of both forms is either fixed syntax or verified against a real work item | FR-1 fixtures |
| Places an unresolved question can hide in §9 | 9, measured across eight successive rules plus the original | 0 | the FR-1 deny matrix, sixteen rows |
| Unresolved questions hidden by paragraph, fence, HTML or comment form | unbounded — a prose §9 reports 0 whatever it contains | 0 — any line outside the closed grammar fails | FR-2 fixtures |
| §9 sections a document may declare | unbounded; only the first is read | exactly 1 | FR-2 fixture |
| Deferrals resolving to a distinct, registered, unfinished follow-up | not checked — shape and existence only, which iteration 3 broke with a self-link | all | FR-1 fixtures |
| Wip PRDs failing the restored rule | measured at Phase 3 against the live directory, never hardcoded | 0, by their authors before this lands | the FR-3 prerequisite procedure |
| Template §9 guidance stating the exact closed forms, outside the judged body | 0 | 1, and the instantiated document lints green | FR-4, `content-templates.test.ts` |
| Turbo test inputs covering every root surface the lint reads | 3 of 4 — the `_brain` store is missing, in landed PRD-024's test too | 4 of 4 | FR-3; the corpus test asserts presence |

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
- [ ] An entry deferred to a distinct, registered, unfinished follow-up, in the exact
      form,
      still passes.

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
   - `- Deferred to [PRD-NNN](<path>)` — where the reference is **resolved through the
     state layer, not matched as a shape** (iteration 3 broke shape-plus-existence with
     a self-link):
     1. the **label** matches the configured id pattern **at its configured width** —
        `idPattern.prefix` plus exactly `idPattern.width` digits
        (`config/defaults.ts:26-29`; the shipped default is `PRD` + 3) — and nothing
        more;
     2. the **path** points inside the configured artifact root
        (`dirs.artifacts.prd.dir`), in a lifecycle state directory, never outside it;
     3. the target **parses as a registered work item**: `parseArtifactName`
        (`state/artifacts.ts:33-47`, the parser the state builder indexes with) must
        accept the basename, and the parsed number must equal the label's — a
        look-alike the parser rejects is not a work item;
     4. the file **exists** at that path, resolved against the repository root;
     5. the referenced item is a **distinct, unfinished follow-up**: its number differs
        from the declaring PRD's own, and its state directory is the **configured**
        `dirs.stateRoles.wip` or `dirs.stateRoles.deferred` name (never the literal
        strings — roles are config, `config/types.ts:23-31`; and "unfinished" rather
        than "active", because the state query's active set excludes deferred records,
        `state/query.ts:58-69`) — a completed-role target is finished work, not a
        follow-up;
     6. the target is a **regular file with exactly one hard link**: `lstat`, never
        `stat` — a symlink is refused outright, because iteration 4 built the eighth
        hiding place from one (`_prds/wip/prd-123-followup.md` → the declaring PRD
        passes every basename-level check while canonically self-linking); and a
        multiply-linked target is refused too, because realpath canonicalizes names,
        not identity (Phase 6 round 1);
     7. identity is **canonical**: the realpath of the target must remain under the
        realpath of the artifact root, must differ from the realpath of the declaring
        PRD's own artifact — the alias comparison rule 5's number check cannot see —
        and the **canonical state segment must equal the lexical one**, because a
        symlinked state directory relabels finished work as unfinished while every
        file-level check passes (Phase 6 round 1); the **on-disk basename must be
        byte-equal to the linked one** (the state layer's own directory listing is the
        authority), because a case-insensitive filesystem otherwise resolves a
        deferral to an item the state builder refuses (round 2); and the path carries
        no `#`, `?`, `%`, `&`, `\` or `:`, each of which makes the link and the
        filesystem disagree about the referent (rounds 2-4 — `&` because
        CommonMark decodes character references in link destinations);
     8. the target is a **recognized record, not a stub**: its first heading is the H1
        the template ships — the configured prefix, the target's own number and a
        colon (`# PRD-NNN: …`) — so a parser-valid file holding only a smuggled
        question does not resolve; a document that carries the work item's own H1 has
        been filed as that work item.

   **The absent fifth argument fails closed.** When the declaring PRD's number is not
   supplied and the section contains any Deferred entry, the lint reports the deferral
   as unverifiable instead of skipping the self check — the production caller always
   passes the number, and a fixture that omits it is
   `fixture-must-reach-production-shape` violated, not a laxer mode.

   A label/target number mismatch fails. A missing file fails. A path outside the
   artifact root fails. A self-reference fails — by number or by canonical alias. A
   completed-role target fails. A basename the artifact parser rejects fails. A
   wrong-width label fails. A symlink fails. A hardlinked target fails. A state
   directory that is an alias fails. An on-disk name that differs from the link
   fails. A `#`, `?`, `%`, `&`, `\`, `:` or ASCII control character in the path fails. A stub without its own H1 fails. A
   deferral linted without the declaring number fails. There is no field left in
   either form where an author can type a question, and no way to satisfy the form
   without a **real, distinct, unfinished, filed work item** on the other end — the snapshot
   line (`source-snapshot/prompts/phase-2-readiness-scorer.md:210`) made
   machine-checkable: *deferred to a follow-up PRD* (resolved, registered, not this one,
   not finished), *with a link* (the form is a link). An author who files a real PRD to
   carry the question has filed the question; that is the system working, not a hole.

   **Ordering is the workflow, not a rule relaxation.** Create the follow-up with
   `gate new`, then defer to it. The existence waiver was deleted as the sixth hiding
   place's enabler (owner decision, 2026-07-28); the shape-only check was deleted as the
   seventh's (this revision, on iteration 3's finding).

   **Matching is exact, not normalized.** No case folding on the fixed syntax, no
   whitespace collapsing, no trailing punctuation, no alternate separators. The previous
   revision's tolerance paragraph is gone: tolerance is surface area, and this document's
   history is what surface area costs. (Rule 3's correspondence between label and
   basename is the parser's — the configured prefix and number equality — a
   derivation from config, not a tolerance.)

   **The deny matrix is the requirement: sixteen rows.** One fixture per history row in
   §1's table (nine — row 6's fixture is the number-level self-link, row 7's the
   symlink alias), plus the seven remaining resolution rejections: completed-role
   target, wrong-width label, parser-rejected basename, label/target number mismatch,
   symlink alias to a *different* PRD, H1-less stub, and a Deferred entry linted
   without the declaring number — each paired with a positive control on the same shape
   (the exact form, against a distinct fixture work item in a wip-role directory). A
   deny fixture whose input would fail anyway is not evidence
   (`assert-absent-needs-an-independent-cause`), and this is the PRD where that matters
   most: eight previous rules each passed their own tests.
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
   section, heading-identified — and its entries are read from the **executable**
   view (scanner text lines), because a requirement written inside a fence is an
   example to every renderer, and reading it as a real FR let a document with no
   live requirements pass (Phase 6 round 2). §11's copy is **not** here: PRD-024 shipped it
   (`fc610f9`), and the boundary was independently confirmed not to be a seam.
   - **Targets:** `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`,
     `packages/provegate/src/core/gates/prd-ready.ts::frBlocks`,
     `packages/provegate/test/open-questions.test.ts`
3. **FR-3 — Measure the corpus at Phase 3; the runtime oracle is zero failures, never
   the record.** Both FRs turn a silent pass into a failure, so the live corpus is
   measured, not assumed — the requirement is the **procedure**, because a hardcoded
   table in this document was wrong within hours twice: enumerate the configured wip
   directory, run each file through the new rules, record the failures with their reason
   in the task plan. **That record is discovery output and nothing downstream compares
   against it** — iteration 3 caught the contradiction: the record lists failures, the
   failures must be repaired before Phase 4, so any oracle equal to the record is stale
   by construction the moment the prerequisites land. The corpus test's oracle is **zero
   closed-grammar §9 failures**, offenders reported by filename. Every failing PRD is a
   **Phase-4 prerequisite owned by its author** — and the measured shape of those fixes
   (iteration 3: eight wip files, five failing — PRD-025/026/027/034/036) is **comments
   and continuations, not only tails**, so the hint is honest: some prerequisites are
   several deleted lines, none is design work.

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

   **One turbo edit IS needed, found by iteration 3 and taken here: the memory store
   joins the cache key.** PRD-024 landed (`fc610f9`) with the `test` task's inputs
   covering `$TURBO_ROOT$/_prds/**`, `workflow.config.json` and `gates.manifest.json`,
   plus a coverage assertion binding the glob to the configured artifact root
   (`lint-parsers.test.ts`). But `lintPrd` also loads the `_brain` memory store when
   memory is enabled (`prd-ready.ts:212`), and `_brain/**` is in nobody's inputs — a
   memory-record edit can replay a stale corpus green today, **in landed PRD-024's
   corpus test as much as in this one**. This FR adds `$TURBO_ROOT$/_brain/**` to the
   `test` task's inputs and extends the existing exceptions entry's reason to name the
   store; the corpus test asserts all **four** root inputs are present. `turbo.json` and
   the exceptions file therefore return to this PRD's surface — PRD-036's FR-1 extends
   the same array and serializes behind whichever lands first; re-run `gate queue` at
   claim.
   - **Targets:** `packages/provegate/test/open-questions.test.ts`,
     `packages/provegate/test/prd-ready.test.ts`, `turbo.json`,
     `scripts/verify/turbo-inputs-exceptions.json`
4. **FR-4 — Teach the closed forms where authors first meet them, from outside the
   judged body.** The shipped PRD template's §9 guidance states the rule's intent but
   not the forms, which is how seven generations of near-miss syntax got written in good
   faith. **Placement is the requirement, because the first version of this FR failed
   its own grammar**: it put the guidance in a comment *inside* §9, which FR-2 refuses —
   a template-instantiated PRD would have failed readiness out of the box (iteration 3).
   The guidance therefore sits **immediately before the §9 heading**, in the preceding
   section's tail where no §9 grammar reads, stating the two exact lines verbatim; the
   shipped §9 **body** is exactly `- (none)`. Two assertions in the round-trip test: the
   guidance text is present, and **a document instantiated from the template passes the
   §9 lint green** — the self-application that would have caught the first version.
   **Traceability:** this is the snapshot rule of `phase-2-readiness-scorer.md:210`
   restated as its exact machine-checked grammar — no new method content, the same rule
   made precise; the changelog carries this argument and the round-trip keeps the
   template's §11 contract unchanged.
   - **Targets:** `packages/provegate/templates/prd-template.md`,
     `packages/provegate/test/content-templates.test.ts`

---

## 5. Non-Goals (Out of Scope)

- **The §11 command reader and its section cardinality.** PRD-024 shipped them
  (`fc610f9`). Do not pull them back.
- **Removing the §9 exemption or routing deferrals to the status board.** Proposed and
  rejected 2026-07-27: the source snapshot states the exemption; removing it fabricates
  method content in the opposite direction.
- **An exemption grammar with any author-typed field, or a referent resolved below the
  canonical level.** Eight rules produced nine holes. The owner's 2026-07-28 decision
  closes the grammar and this revision resolves the referent canonically; loosening
  either is a new owner decision, not a remediation.
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
- **Given** a deferral whose target is the declaring PRD itself, **Then** it fails — a
  follow-up is a different work item. *(6)*
- **Given** a completed-role target, a wrong-width label, a basename the artifact
  parser rejects, a label and target naming **different** numbers, a **symlink** target
  (alias to self or anything — non-regular is refused outright), an **H1-less stub**, or
  a Deferred entry linted **without the declaring number**, **Then** each fails — the
  resolution rejections. *(history row 7 covers the alias)*
- **Given** a **hardlinked** target, a **symlinked state directory**, an on-disk name
  that differs from the link by case, or a path carrying `#`, `?`, `%`, `&`, `\` or `:`, **Then**
  each fails — the Phase 6 canonical-identity extensions, deny-tested with positive
  controls.
- **Given** a Functional Requirements entry written **inside a fence**, **Then** the
  document reports no functional requirements — an example is not a requirement.
- **Given** `- (none)` alone, or `- Deferred to [PRD-NNN](<path>)` resolving to a
  distinct registered work item in a directory named by the configured
  `dirs.stateRoles.wip` or `dirs.stateRoles.deferred` role, **Then** each
  is exempt — the positive controls, paired per deny shape, sixteen in all.
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
  all five production arguments, **Then** it reports **zero closed-grammar §9 failures**,
  any offender named by filename — never compared against the Phase-3 record, which is
  discovery output and stale by construction once the prerequisites land.
- **Given** `turbo.json`, **When** the corpus test asserts its inputs, **Then** all four
  root surfaces the lint reads are declared — the artifact root, both configs, and the
  `_brain` store this PRD adds.
- **Given** the shipped template, **Then** the two exact forms appear immediately before
  the §9 heading, the shipped §9 body is exactly the `(none)` line, and a document
  instantiated from the template **passes the §9 lint green** — the self-application the
  first FR-4 failed.

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
- **Resolution is the proof.** The link is not validated as a *shape* — iteration 3
  broke shape-plus-existence with a self-link — it is resolved through the state layer
  to a distinct, registered, unfinished work item. That is what "deferred to a
  follow-up PRD" means, and it is the difference between this revision and the eight
  that failed.
- **Measure the blast radius with the rule, at Phase 3.** The corpus procedure, not a
  table; two hardcoded tables have already aged into falsehood inside this one document.

### Dependencies

- **PRD-024 — landed** (`fc610f9`): §11 cardinality, the shared row extractor, and the
  turbo inputs this PRD's corpus test relies on are on main. No ordering constraint
  remains.
- **PRD-026 and this PRD both claim `prd-ready.ts`** — serialize; re-run `gate queue`
  before claiming rather than trusting this paragraph.
- **Every wip PRD failing the closed grammar** — comment and continuation deletions,
  several lines in places (FR-3's measured shape), by each PRD's author, before Phase 4
  starts here.
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
- [ ] `packages/provegate/test/open-questions.test.ts` (new) — the sixteen-row deny
      matrix with paired positive controls, the grammar fixtures, the wip corpus pass
      with the five-argument call, the four-input turbo assertion
- [ ] `packages/provegate/test/prd-ready.test.ts` — two fixtures the closed grammar
      necessarily invalidates, declared here
- [ ] `packages/provegate/templates/prd-template.md` — §9 guidance immediately before
      the heading, shipped body exactly the `(none)` line (FR-4)
- [ ] `turbo.json` — the `_brain` store joins the `test` task inputs (FR-3)
- [ ] `scripts/verify/turbo-inputs-exceptions.json` — the entry's reason extends to name
      the store (FR-3)
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
- applied: `surface-set-without-its-predicate` — its watch covers `gates/**` and this
  PRD rewrites the §9 predicate. The record's rule binds FR-1 directly: the deferral
  surface (a link) is worthless without the predicate that resolves it, and iteration 3
  proved a shape predicate is "the same defect in a stricter costume" — the resolution
  predicate (parser + width + state + distinctness) is the ported half the record
  demands, and the sixteen-row deny matrix is the proof it actually reads.
- applied: `lint-must-name-the-span-it-judges` — the §9 reader answers about a span it
  does not read (bullet-start lines of the first substring-matched section); FR-2 names
  the span — one heading-identified section, every raw line — and reads exactly it.
- applied: `false-green-on-missing-file` — inverted deliberately: a **missing** target
  is a failure (row 5's fixture), and after iteration 3 an **existing but wrong** one —
  self, completed, parser-rejected — is one too (row 6 and the resolution rejections).
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
- applied: `a-rule-corrected-survives-where-it-is-restated` — **and this document is the
  record's live demonstration**: iteration 4 caught the iteration-3 sweep claiming
  every restatement had been updated while Implementation Scope still ordered a
  seven-row matrix. This revision's counts (nine history rows, sixteen deny rows,
  canonical resolution) were swept by grep over the whole document rather than by
  memory, and the Phase 6 reviewer is briefed to sweep, not to hunt.
- applied: `turbo-cache-masks-out-of-input-reads` — iteration 3 proved PRD-024's inputs
  did NOT cover everything the lint reads: the `_brain` store was outside every cache
  key. FR-3 adds it and asserts all four root inputs; `turbo.json` and the exceptions
  file are back on this surface for exactly that write.
- applied: `scope-out-the-layer-the-rounds-keep-hitting` — close-time watch fire on
  this document's own closing diff; the record's move is what rounds 1-5 actually took:
  five referent-split findings were answered by scoping out the whole ambiguous-path
  layer (the refused charset) instead of patching each character.
- not-applicable: `free-text-field-is-the-unread-drift-ledger` — its watch covers
  `_state/prds.json`, which this closing diff touches only as a mechanical
  regeneration via `gate status`; no free-text field moved.
- reviewed: `state-model-before-mechanism` — close-time watch fire on the closing diff;
  the resolution predicate consumes the existing state model (the artifact parser,
  configured roles, the directory listing) rather than inventing a parallel mechanism,
  which is the record's rule already satisfied.
- not-applicable: `exemption-marker-needs-no-prose` — this PRD's own Memory Output;
  its watch on `prd-ready.ts` fires on the very diff that created the record, not on a
  prior trap (the same newborn-watch pattern PRD-025 and PRD-026 recorded at close).
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
- `turbo.json`
- `scripts/verify/turbo-inputs-exceptions.json`
- `_brain/learnings/exemption-marker-needs-no-prose.md`

**Contested, re-measured 2026-07-28 (iteration-3 remediation):** PRD-021 closed and
PRD-024 landed (`fc610f9`), releasing their claims. `turbo.json` and the exceptions file
return to this surface for the `_brain` input (FR-3); **PRD-036's FR-1 extends the same
array** — serialize with it on those two files, and with **PRD-026** on `prd-ready.ts`
and `content-templates.test.ts`. `_brain/INDEX.md` is
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
| FR-1 | `pnpm --filter provegate test test/open-questions.test.ts`    | pkg   | the sixteen-row deny matrix, one fixture per history row plus the seven remaining resolution rejections, each paired with its positive control; self by number or canonical alias, symlink, stub, completed-role, wrong-width, parser-rejected, mismatched, missing, out-of-root and unverifiable-without-number targets all fail |
| FR-2 | `pnpm --filter provegate test test/open-questions.test.ts`    | pkg   | a paragraph section fails; fenced, raw-HTML, comment and checkbox lines fail; one trailing separator is ignored and a second fails; zero and duplicate sections fail; a longer heading is not the section; duplicate requirement sections fail the same way |
| FR-3 | `pnpm --filter provegate test test/open-questions.test.ts`    | pkg   | the corpus pass: every PRD in the configured wip directory through the lint with all five production arguments, oracle zero closed-grammar failures with offenders named, never compared to the Phase-3 record, no allowlist; plus the assertion that all four root inputs are declared, including the brain store this PRD adds |
| FR-3 | `pnpm test`                                                   | repo  | the whole suite via turbo with the two declared fixture edits and no others — the direct package invocation cannot run under the runner, per the runner-sentinel learning PRD-024 recorded |
| FR-4 | `pnpm --filter provegate test test/content-templates.test.ts` | pkg   | the guidance sits before the heading, the shipped body is the none line, and a document instantiated from the template passes the section-9 lint green |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; only the two declared fixtures change
- `pnpm build` — clean build
- `pnpm verify:workflow` — the repo bundle stays green

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/open-questions.test.ts` — all sixteen deny rows
  (the nine history rows including the self-link and the symlink alias, plus the
  resolution rejections), the paragraph section, the fenced and comment cases, and the
  duplicate and missing sections must each **fail**. A grammar that only passes on good
  input is not evidence, and this is the PRD where that matters most: eight previous
  rules each passed their own tests.
- Contract test: n/a — no client-to-server payload ships.

Before Phase 2 PASS, run: `gate check PRD-028`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` plus narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT design a tenth exemption rule. Eight predicates produced nine holes; the ninth
  is a closed set canonically resolved, by owner decision, and loosening it is a new
  owner decision.
- DO NOT resolve the referent below the canonical level: lstat-regular, realpath
  containment, realpath distinctness, the recognized H1. Basename-level resolution was
  the eighth hiding place.
- DO NOT let an absent fifth argument skip the self check. With a Deferred entry
  present it fails closed as unverifiable.
- DO NOT leave any author-typed field in either exempt form. Every variable character is
  either fixed syntax or verified against a real work item on disk.
- DO NOT weaken the resolution to a shape check. Shape-plus-existence was the seventh
  hiding place (a self-link); the referent must resolve to a distinct, registered,
  unfinished work item — "the follow-up comes later" means create it first with
  `gate new`.
- DO NOT put the template guidance inside the §9 body. The first FR-4 did, in a comment
  the grammar itself refuses; the instantiated-document-lints-green assertion keeps it
  out.
- DO NOT compare the corpus outcome to the Phase-3 record. The record is discovery; the
  oracle is zero failures — a record-shaped oracle is stale the moment the prerequisites
  are repaired.
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
| 2026-07-28 | Claude Fable 5, Phase 6 round 5 (Codex, independent) | **Both round-4 fixes verified; the control-character bypass closed.** U+0000–U+001F and U+007F join the refused charset: a POSIX filename may carry them but CommonMark refuses to parse such a destination, so the "link" rendered as prose — a deferral passing without the required link on the page. Deny fixture against a real on-disk U+0007 file, paired with the standing positive control |
| 2026-07-28 | Claude Fable 5, Phase 6 round 4 (Codex, independent) | **The entity bypass closed; the changeset completed.** `&` joins the refused charset — CommonMark decodes named references in link destinations, so `&quest;` rendered as `?` split the referent between readers exactly as the raw character would; deny fixture added against a real on-disk `&quest;` file. The changeset's resolution list gains the label/target number-equality rule the sweep found missing |
| 2026-07-28 | Claude Fable 5, Phase 6 round 3 (Codex, independent) | **The remaining [P1] closed and every disclosure gap taken.** `?` and `%` join the refused charset (a query suffix and percent-decoding are the same two-readers split as a fragment). The case-identity fixture asserts the MECHANISM (`on-disk name differs`) wherever the filesystem can reproduce the bypass, with the existence refusal as the declared case-sensitive fallback. The hard-cap engine's move to the executable FR view is now a **declared** behavior change: the stale raw-content comment is corrected, a regression pins fenced-target-does-not-fire / live-target-fires, and the argument recorded — the target reader finally agrees with the evidence reader (`contractView`) about what is on the page. The changeset states the full resolution rule set. Refused invisible lines print explicit `U+NNNN` codepoints (JSON.stringify prints NBSP as itself), fixture pinned. The stale rule-3 lower-casing parenthetical corrected |
| 2026-07-28 | Claude Fable 5, Phase 6 round 2 (Codex, independent) | **Two of three [P1]s taken as defects; the third adjudicated to a rule tightening.** (1) Case-insensitive filesystems resolved a deferral to an item the state builder refuses — closed by on-disk byte-equality against the directory listing (the state layer's own name source), portable deny fixture asserting the verdict, not the platform-dependent reason. (2) A fenced FR entry read as a real requirement let a document with no live requirements pass — `frBlocks` now consumes the scanner's executable lines; deny fixture added. (3) The render/lint referent disagreement (doc-relative links, `#` fragments) is not a fail-open — every non-repo-relative form fails closed — so the path stays a repository-relative state-layer coordinate and the charset that makes two readers disagree (`#`, `\`, `:`) is refused; adjudication recorded. [P2]s: these rules written into FR-1/FR-2/§6 normatively (this row's edit), template guidance names the configured width, corpus test derives the declaring number through `parseArtifactName`. [P3]: refused lines that trim to nothing are shown as codepoints |
| 2026-07-28 | Claude Fable 5, Phase 6 round 1 (Codex, independent) | **Two [P1] canonical-identity bypasses closed as FR-1 rule extensions.** Rule 6 extends: a target with **multiple hard links** is refused (realpath canonicalizes names, not identity — a finished artifact hardlinked into a wip role passed every path-level rule). Rule 7 extends: the **canonical state segment must equal the lexical one** (a symlinked state DIRECTORY — `deferred` → `completed` — relabeled finished work as unfinished while every file-level check passed). Both carry deny fixtures with positive controls; the wrong-width and parser-rejected rows gained otherwise-valid existing targets so each rule is its row's only failing cause ([P2]). The two live "active" restatements corrected to "unfinished" and the two historical changelog count claims marked superseded ([P2]/[P3]) |
| 2026-07-28 | Claude Fable 5 (rewrite author, non-scorer), iteration-4 remediation | **Canonical resolution replaces basename resolution; both iteration-4 [P1]s and both [P2]s closed.** The eighth hiding place — a wip symlink alias passing every basename-level check while canonically self-linking — dies at three added rules: lstat-regular (symlinks refused outright), realpath containment under the realpath'd artifact root, and realpath distinctness against the declaring PRD's own artifact; the H1-recognition rule closes the deferred-stub path, and the absent fifth argument now **fails closed** as unverifiable when a Deferred entry is present. History row 7 records the alias; the counts are nine history rows and sixteen deny fixtures, swept by grep this time — the §8 seven-row survivor iteration 4 caught is fixed, and the `a-rule-corrected…` disposition now names its own failure instead of claiming a clean sweep. Config-role [P2]: `wip`/`deferred` literals replaced by `dirs.stateRoles` names with the prefix from config, and "active" corrected to "unfinished" against `query.ts:58-69`. The `turbo-cache…` disposition flips to applied (024's inputs did not cover the store). Dependencies' one-line claim corrected to FR-3's measured comments-and-continuations shape. **Value re-declared 3.45 (4/4/2/3/4) at the scorer's supportable derivation** — MF 4 held deliberately after two broken re-earn claims; MF 5 waits for a round the mechanism survives |
| 2026-07-28 | Claude Fable 5 (rewrite author, non-scorer), iteration-3 remediation | **All three iteration-3 [P1]s closed and the cross-item [P2] taken; the referent is now resolved, not matched.** **(H)** FR-1's link rule rewrites from shape-plus-existence to **state-layer resolution**: label at the configured width (`defaults.ts:26-29`), basename accepted by `parseArtifactName` (`state/artifacts.ts:33-47`) with the parsed number equal to the label's, file existing under the artifact root, and the referent a **distinct, active** item — not the declaring PRD (the lint's fifth argument names it) and not `completed`. The self-link, completed-target, look-alike and wrong-width cases each gain a deny fixture; history row 6 records the seventh hiding place and the deny matrix is twelve rows (eight history + four resolution rejections), swept at every count [superseded by the iteration-4 revision: nine history rows, sixteen deny fixtures]. **(I)** FR-4's guidance moves outside the judged body — immediately before the §9 heading — after the first version put it in a comment FR-2 itself refuses; the round-trip now asserts the instantiated document lints green, the self-application that would have caught it. **(J)** FR-3's Phase-3 record is discovery output only; the corpus oracle is zero closed-grammar failures with offenders named. **(K)** `$TURBO_ROOT$/_brain/**` joins the test task inputs with the exceptions reason extended — `lintPrd` reads the store (`prd-ready.ts:212`) and nobody's cache key knew, landed PRD-024's corpus test included; `turbo.json` and the exceptions file return to the surface, serializing with PRD-036's FR-1. Value stays 3.70: MF 5 now rests on resolution rather than the disproved shape premise, AR 3 on the corrected template delivery — re-derivation recorded here as iteration 3's missing piece 6 asked |
| 2026-07-28 | Claude Fable 5, on owner decision (in-session) | **Radical narrowing — the owner's structural decision, following the PRD-025 precedent: stop designing exemption predicates, close the grammar.** Iteration 2 (Codex, 6.55 ITERATE) found the sixth hiding place inside the form adopted because it was supposed to have none — the link target's basename suffix, with existence deliberately unchecked — and tripped the **method-content traceability hard cap** on exactly that waiver: nothing proved the link pointed at a follow-up PRD. The design answer reverses the waiver rather than adding a seventh predicate: **the target must exist under the configured artifact root and carry the label's number** — existence is the proof the snapshot's rule (*deferred to a follow-up PRD with a link*) always implied, the suffix stops being free text because it is the real slug of a real filed work item, and an author who files a PRD to "hide" a question has filed the question, which is the system working. **The grammar closes**: two exact single-line forms, blank lines, one optional terminal `---`, everything else refused by name — no continuation clause, no comment clause, no tolerance normalization (each was a previous hiding place). **FR-2 drops the line-kind approach** iteration 2 proved unfollowable (comments are not a `LineKind`) for raw-line judgment within scanner-located bounds. **The history is corrected to seven deny rows** (0 original substring + six fix-created moves, 3a/3b split per the record), and seven is the count everywhere [superseded: iterations 3 and 4 found rows 6 and 7, making nine history rows and sixteen deny fixtures]. **The five-argument production call** replaces four at every mention (the fifth arms value enforcement — this wave's twice-found defect). **Turbo resolved by measurement**: PRD-024 landed (`fc610f9`) with the inputs and the coverage assertion; FR-3 asserts presence, `turbo.json` leaves the surface. **FR-4 added as the recorded expansion** under expand-don't-delete (iteration 2 showed the old 3.55 rested on a disproved MF premise and computed 3.30 at MF 4): the shipped template's §9 guidance states the two exact forms, with the traceability argument written — the same snapshot rule made precise, not new method content. Value re-declared **3.70 (5/4/2/3/4)** with the expansion recorded in the header comment. Conflict Surface re-measured: 021 closed and 024 landed release `prd-ready.ts` and `turbo.json`; live contention is PRD-026 only. Fixture-count, argument-count and existence corrections swept at every restatement per `a-rule-corrected-survives-where-it-is-restated`, now a declared input |
| 2026-07-27 | Claude Opus 5, on owner direction | **Re-founded after iteration 1 (6.18) falsified the previous approach, and after reading the source snapshot.** The owner's decision was to remove the exemption entirely and route deferrals to the status board. **Measurement blocked it**: `source-snapshot/prompts/phase-2-readiness-scorer.md:210` states the exemption as method law — *empty, or every entry deferred to a follow-up PRD with a link* — so removing it would fabricate method content in the opposite direction from the defect. FR-1 therefore implemented the snapshot's rule — `(none)` or `Deferred to [<id>](<path>)` with the label and target bound to the same work item — rather than designing a sixth grammar. [Superseded where it conflicts with the 2026-07-28 narrowing: the existence waiver this row's revision carried became the sixth hiding place, the five-count became seven, and the four-argument call became five] |
| 2026-07-27 | Claude Opus 5, on owner direction | **Split out of PRD-024 after readiness iteration 4**, carrying the §9 defects and the hiding places four independent rounds uncovered. Created with `gate new` |
