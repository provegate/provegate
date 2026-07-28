# PRD-035: ADR Section Anchor — the Formatter Must Not Break Every ADR

> **Status**: Draft
>
> **Created**: 2026-07-28
> **Updated**: 2026-07-28
> **Author**: owner
> **Audience**: Implementing Agent
> **Slug**: `adr-section-anchor`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: hotfix
> **Class Rationale**: a reproduced defect in shipped code with a bounded blast radius — one regex anchor in three copies, one corpus case, and one repository corpus runner that makes the third copy's conformance executable. Not `feature` (no capability), not `test-hardening` (`core/memory/parse.ts` is production code).
> **Value**: 3.65 (MF/UI/TL/AR/RM: 4/4/3/3/4)
> **Autonomous Close**: eligible

<!-- Value rationale. MF 4: the method's own ADR validator disagrees with the method's own
formatter, so the repository cannot run `pnpm format` without breaking its own governance
records. UI 4: adopters receive the same broken parser in `practices/verify/lib.mjs`, and
they hit it on their FIRST ADR. TL 3: unblocks no roadmap item, but every ADR written from
here on is hand-guarded against the formatter today, which is a standing tax. AR 3: an
adopter whose first ADR fails validation because they formatted it is a bad first
impression. RM 4: a one-token anchor change in three copies, held by a corpus the package
test executes for the two package-side copies and the FR-5 runner for the third. -->

<!-- Autonomous Close: `eligible` — every verification is machine-checkable and this PRD
produces no operator-owned rows. -->

---

## 1. Introduction / Overview

The ADR section check captures a section body with

```
^## ${heading}${suffix}[ \t]*\r?\n([\s\S]*?)(?=^## |$)
```

under the `m` flag. `^## ` is the correct stop for the next heading. `$` is not a
correct stop for end-of-document: under `/m` it matches at the end of **every**
line, including a zero-length position at the start of an empty one. So a blank
line immediately after `## Context` ends the lazy capture at offset zero, and the
section reads as empty.

`prettier` writes exactly that blank line. The repository's own formatter and its
own ADR validator therefore disagree, and `pnpm format` breaks every ADR in the
store.

Reproduced against `_brain/adr/ADR-0003-acceptance-authorship.md` on 2026-07-28:
inserting one blank line after `## Context` turns `verify:brain: PASS` into

```
verify:brain: FAIL — _brain/adr/ADR-0003-acceptance-authorship.md: body — the '## Context' section is empty
```

Removing the line restores PASS. The defect is live, and every ADR in this
repository is hand-guarded against the formatter today.

Carried from the `ADR section regex` deferral (raised writing ADR-0001 during
PRD-018 — the repository's first ADR, so nothing had exercised the path).
Converted to a work item on 2026-07-28 under the deferral cap rule.

## 2. Goals

### Primary Goals

1. Make the section capture end at end-of-input rather than end-of-line.
2. Make all three implementations agree **and be right, under execution** — the
   package corpus asserts each case's expected verdict, but no case exercises the
   formatter's blank-line shape, and the repository copy is never run against the
   corpus at all today.
3. Make prettier's **body** formatting legal: a blank line after every heading no
   longer reads as an empty section. *(Narrowed in Phase 6 round 1 from "make
   `pnpm format` safe on `_brain/adr/**`": the reviewer measured that prettier
   ALSO reflows a long frontmatter inline list into a block form the documented
   subset rejects, so a full format sweep remains unsafe for a reason outside
   this anchor. The FR-5 runner pins that limitation as an executing assertion;
   the retired learning carries the live warning.)*

### Success Metrics

- A record with a blank line after every section heading validates in all three
  implementations, each under execution: the package corpus test runs the typed
  parser and the shipped copy; the FR-5 runner runs the repository copy.
- The formatter smoke in the FR-5 runner proves prettier's **body** output legal:
  a valid record formatted by the repository's own prettier still validates, with
  every section body captured non-empty — and its second smoke pins the known
  frontmatter limitation: prettier's reflow of a long `links` inline list is
  REFUSED by the subset, asserted as current behavior so a future change retires
  the pin consciously. (Sweeping the live store with `pnpm format` stays a
  separate call — §5 — and stays unsafe while the pin stands.)
- Mutation: restoring the `$` anchor in `parse.ts` or the shipped copy fails the
  new corpus case in the package test; restoring it in `scripts/verify/lib.mjs`
  fails the FR-5 runner. Each failure has the anchor as its cause, not a missing
  case.

---

## 3. User Stories

#### User Story 1

**As** an adopter writing my first ADR, **I want** the validator to accept the
document my formatter produced, **so that** I do not have to discover by
bisection that a blank line is illegal.

#### User Story 2

**As** a maintainer of this repository, **I want** the validator to stop rejecting
prettier-shaped section bodies, **so that** the formatter and the governance gate
stop disagreeing about a blank line — knowing the frontmatter reflow limitation
remains recorded and pinned until its own fix.

---

## 4. Functional Requirements

1. **FR-1**: The section capture ends at end-of-input, not end-of-line. Replace
   the `$` alternative in the lookahead with an end-of-input assertion —
   `(?=^## |(?![\s\S]))` — keeping the `^## ` stop and the `m` flag, so a
   following heading with no blank line before it still ends the section. The
   comment above the expression states why `$` was wrong, in terms of `/m`.
   - **Targets:** `packages/provegate/src/core/memory/parse.ts`,
     `scripts/verify/lib.mjs`, `packages/provegate/practices/verify/lib.mjs`
2. **FR-2**: The shared corpus carries the case, asserted as **valid**. A record
   whose every section heading is followed by a blank line is a legal ADR. The
   package corpus test executes every case against **two** implementations — the
   typed parser and the shipped practices copy; its own header records that the
   repository copy is reconciled through `verify:pack-drift`, not run. One case
   therefore binds those two directly and the third through FR-5's runner — and
   its contribution is **coverage**: the existing 78 cases already assert
   expected verdicts, but none exercised the formatter's blank-line shape, so
   the assertion never ran against this defect while all three copies shared the
   same wrong anchor.
   - **Targets:** `packages/provegate/test/fixtures/memory-record-cases.json`,
     `packages/provegate/test/memory.test.ts`
3. **FR-3**: The three copies stay reconciled, and **both** affected ledger pairs
   are reconciled by name. `scripts/verify/lib.mjs` and
   `packages/provegate/practices/verify/lib.mjs` differ today in ways unrelated to
   this fix; the pack drift ledger records the intended divergence, and this
   change must not widen it. The FR-5 wiring also moves the second pair:
   `verify/verify-workflow.mjs` ↔ `scripts/verify/verify-workflow.mjs`, where the
   repository side gains the corpus runner and the packed side deliberately does
   not — adopters receive neither the fixture nor the runner. That is an
   intentional repository-only divergence, recorded with a ledger `note` on the
   pair when it is reconciled.
   - **Targets:** `scripts/verify/pack-drift-ledger.json`
4. **FR-4**: The memory record is retired to what remains true. The anchor bug is
   fixed, so `adr-section-blank-line-reads-empty` no longer describes live
   behaviour; it is edited to record the general lesson (`$` under `/m` is not
   end-of-input) rather than deleted, so the trap stays discoverable. The
   repository INDEX hook follows the retired record. **No packed twin exists and
   none is created.** An earlier draft said "its packed twin and both INDEX hooks
   follow"; measured 2026-07-28, `packages/provegate/practices/brain/learnings/`
   carries no copy of this record and the packed INDEX no hook for it. The packed
   seed set is selective — this record's nearest sibling,
   `two-parsers-wrong-together`, is likewise unpacked — and promoting a record to
   a shipped seed is a packing decision this hotfix does not own (§5).
   - **Targets:** `_brain/learnings/adr-section-blank-line-reads-empty.md`,
     `_brain/INDEX.md`
5. **FR-5**: The repository copy's conformance is executed, not inferred from a
   hash pairing. A standalone runner loads every case from
   `packages/provegate/test/fixtures/memory-record-cases.json`, runs it against
   `scripts/verify/lib.mjs`'s `validateMemoryRecord`, and compares the reported
   issues against the fixture's expected validity and **bare field names**
   (containment — the same contract the package test's first assertion uses).
   Entry-keyed `field#entry` comparison is the package test's
   cross-implementation parity contract; the fixture declares no expected entry
   keys, and this runner does not conflate the two. It then runs the formatter
   smoke: the FR-2 case's content is formatted with the repository's own
   prettier (markdown parser) and re-validated — the result must stay valid with
   every section body captured non-empty — plus the pinned-limitation smoke: a
   long `links` inline list formatted by prettier reflows into a block form the
   subset rejects, and the runner asserts that refusal so the limitation is a
   named executing fact (Phase 6 round 1). The runner exits non-zero, naming the
   path, on a missing or unparseable fixture — it never iterates zero cases into
   a pass. It is a root script on purpose: `provegate#test` is turbo-cached over
   package inputs, and a package test reading a repository path replays stale
   green (`turbo-cache-masks-out-of-input-reads`); root `verify:*` scripts run
   outside turbo by construction. Wiring: registered as `verify:memory-corpus`
   in `package.json` and added to the `verify:workflow` CHECKS bundle, so the
   wire-or-delete audit sees an executing surface.
   - **Targets:** `scripts/verify/verify-memory-record-corpus.mjs`,
     `package.json`, `scripts/verify/verify-workflow.mjs`

---

## 5. Non-Goals (Out of Scope)

- **Rewriting the section parser.** The `^## ` stop is correct and was chosen
  deliberately; only the end-of-input alternative is wrong.
- **Reformatting the existing ADRs.** They are legal today and stay legal after.
  Whether to run `pnpm format` over `_brain/` is a separate call.
- **Merging the two `lib.mjs` copies.** They differ for reasons this PRD does not
  own; see FR-3.
- **The other multiline-parser deferrals** (`Multiline code spans`,
  `Brain validator INDEX parsing`). Same neighbourhood, different defects.
- **Promoting the retired learning to a packed seed.** The practices brain seed
  set is deliberately selective and does not carry this record today; whether the
  general lesson ships to adopters is a packing decision with provenance and
  rollback questions of its own, and fixing the defect does not need it.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** an ADR with a blank line after every section heading, **When**
  `verify:brain` runs, **Then** it passes.
- **Given** the same ADR, **When** the package parser validates it, **Then** it
  reports no issue — and likewise the shipped practices copy.
- **Given** the FR-2 case's content, **When** the FR-5 runner formats it with the
  repository's prettier and re-validates, **Then** it stays valid and every
  section body is captured non-empty.
- **Given** the `$` anchor restored in `parse.ts` or the shipped practices copy,
  **When** `pnpm --filter provegate test test/memory.test.ts` runs, **Then** the
  new case fails and no other case changes.
- **Given** the `$` anchor restored in `scripts/verify/lib.mjs`, **When**
  `pnpm verify:memory-corpus` runs, **Then** the new case fails and no other case
  changes.
- **Given** the corpus fixture file absent or unparseable, **When** the FR-5
  runner runs, **Then** it exits non-zero naming the path, rather than iterating
  zero cases and reporting success.
- **Given** an ADR whose next heading follows with no blank line, **When** it is
  validated, **Then** the section still ends at that heading and does not swallow
  the next body.

---

## 7. Technical Considerations

### Reproduction

`perl -0pi -e 's/## Context\n(?!\n)/## Context\n\n/' <an ADR>` then
`pnpm verify:brain`. Reproduced 2026-07-28 on ADR-0003; message quoted in §1.

### Architecture

**Three implementations, one contract — two executed, one reconciled.** The
TypeScript parser and the stdlib validator cannot import each other — the
validator runs in repositories where the package is not installed — and
`memory-record-cases.json` is their contract. The package corpus test executes
the typed parser and the **shipped** practices copy; the repository's own
`scripts/verify/lib.mjs` is deliberately outside it, reconciled by hash through
`verify:pack-drift` (`memory.test.ts`'s own header records this). A hash pairing
proves the two copies were compared once by a human, not that the repository copy
passes the cases — which is why FR-5 adds a runner that executes it, from the
repository side of the turbo cache boundary. The corpus is still the right
vehicle — and the reason this defect survived is a coverage hole, not a weak
assertion: the 78 cases assert expected verdicts, but none exercised a blank
line after a heading, and all three copies shared the same wrong anchor, so the
typed-versus-shipped parity check had no disagreement to show.
`two-parsers-wrong-together` names the all-wrong-together shape, which is why
FR-2 puts the formatter's own output into the corpus as a **behavioural** claim
(this document is legal) rather than relying on parity.

**Why not `\z`.** JavaScript has no `\z`. `(?![\s\S])` is the idiomatic
end-of-input assertion and composes inside the existing lookahead without
dropping the `m` flag that `^## ` needs.

### Migration & Rollback

None for stored data. Nothing changes shape; the fix widens what validates and
narrows nothing. Rollback is a plain revert of the commit — no artifact is left in
a state the previous code refuses, because every document legal before stays legal
after.

The additions land atomically with the fix and leave with it. The FR-5 runner, its
`package.json` registration, its `verify:workflow` membership, and the FR-3 ledger
reconciliation are one commit with the anchor change, so a revert removes the
runner together with both wiring points and restores both reconciled ledger
pairs (`verify/lib.mjs` and `verify/verify-workflow.mjs`) — no
intermediate state exists in which a registered check has no script, a script no
registration, or a ledger row no counterpart.

---

## 8. Implementation Scope

### In Scope

The anchor in three copies, one corpus case, the repository corpus runner with its
two wiring points, the drift ledger reconciliation, and the record edit with its
repository INDEX hook.

### Out of Scope

Everything in §5.

---

## 9. Open Questions

None.

---

## 10. References

- `_brain/learnings/adr-section-blank-line-reads-empty.md` — the record this retires
- `_brain/learnings/two-parsers-wrong-together.md` — why the corpus missed it
- `STATUS.md` — the `ADR section regex` deferral this converts
- `packages/provegate/test/fixtures/memory-record-cases.json` — the shared contract

---

## Memory Inputs

- applied: `adr-section-blank-line-reads-empty` — the record that describes this
  defect. FR-1 is its stated fix and FR-4 retires it to the general lesson.
- applied: `two-parsers-wrong-together` — the reason FR-2 asserts a behavioural
  claim rather than a parity one. Three implementations agreed here and were all
  wrong, which is precisely what a conformance corpus cannot catch unless a case
  pins what the right answer IS.
- reviewed: `narrow-the-grammar-not-the-parser` — the tempting fix is a smarter
  Markdown reader. This is the opposite and stays so: one anchor token, no new
  grammar, the `^## ` stop untouched.
- reviewed: `strictness-added-during-extraction-is-a-behavior-change` — this moves
  the other way, widening what validates. Recorded because the reverse direction
  deserves the same scrutiny: FR-1 must not make an empty section legal, which is
  the acceptance criterion about a heading following with no blank line.
- applied: `a-rule-corrected-survives-where-it-is-restated` — its watch covers
  this PRD file, and Phase 6 round 2 demonstrated the record live: the corrected
  corpus history landed in the learning while goal 2, §7, FR-2, the DO NOT
  rationale and the task file still restated the old account. The round-2 fix
  swept every restatement, which is exactly this record's prescription.
- reviewed: `scope-out-the-layer-the-rounds-keep-hitting` — its watch covers this
  PRD file. Two Phase 6 rounds put their findings in one layer (the formatter
  claim), and the response was the record's: the layer was scoped out — the claim
  narrowed to body scope, the frontmatter reflow pinned as a recorded limitation
  owned by a future item — rather than a third wording round.
- reviewed: `state-model-before-mechanism` — its watch covers `_prds/wip/**`.
  Not the failure shape here: this hotfix specifies a mechanism whose ground
  truth is written and executable (a reproduced defect, a one-token fix, a
  corpus), and its readiness trajectory converged in two rounds.
- reviewed: `free-text-field-is-the-unread-drift-ledger` — its watch covers
  `_state/**`, which the close touches only through the generated
  `_state/prds.json`, rewritten mechanically by the state builder. This PRD adds
  no documentation-enforced rule and no free-text field beside one.
- applied: `assert-absent-needs-an-independent-cause` — its watch covers the
  package corpus paths (`packages/provegate/test/**`) this PRD edits; the root
  runner sits outside the watch and the record is applied there voluntarily.
  The mutation check in §2 is where it bites: restoring the
  `$` anchor must fail the new case *because the anchor is wrong*, not because the
  case was removed alongside it. The check therefore restores the anchor only and
  leaves the corpus untouched, so the failure has a cause independent of the
  scenario that produces it.
- applied: `false-green-on-missing-file` — applied voluntarily; the record
  declares no watch. FR-5 reads the corpus fixture from disk, which is exactly
  this record's trap: the runner must exit non-zero naming a missing or
  unparseable fixture rather than iterating zero cases into a pass. The last
  acceptance criterion pins it.
- applied: `turbo-cache-masks-out-of-input-reads` — the reason FR-5 is a root
  script rather than a package test: the repository validator and the fixture sit
  on opposite sides of `provegate#test`'s hashed inputs, and a package test
  reading across that boundary replays cached green over a real change.

## Memory Outputs

- learning: `_brain/learnings/adr-section-blank-line-reads-empty.md` — edited, not
  created: retired from a live-defect report to the general lesson that `$` under
  `/m` is end-of-line, not end-of-input, and that a conformance corpus proving
  three implementations agree proves nothing about whether they are right.

---

## Conflict Surface

- `packages/provegate/src/core/memory/parse.ts`
- `scripts/verify/lib.mjs`
- `packages/provegate/practices/verify/lib.mjs`
- `packages/provegate/test/fixtures/memory-record-cases.json`
- `packages/provegate/test/memory.test.ts`
- `_brain/learnings/adr-section-blank-line-reads-empty.md`
- `scripts/verify/verify-memory-record-corpus.mjs`
- `scripts/verify/verify-workflow.mjs`
- `scripts/verify/pack-drift-ledger.json`

---

## Durable Artifacts

- `_brain/learnings/adr-section-blank-line-reads-empty.md` — retired to the general lesson; the Memory Output above, repeated here
- `_brain/INDEX.md` — the hook line updated to match the retired record
- `_docs/reviews/review-035-adr-section-anchor.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).

| FR   | Command / Check                                          | Scope | Notes                                                                                              |
| ---- | -------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| FR-1 | `pnpm --filter provegate test test/memory.test.ts`       | pkg   | a blank line after each heading validates; a heading with no blank line before it still ends the section |
| FR-1 | `pnpm verify:brain`                                      | repo  | the live store, including three ADRs, still validates                                              |
| FR-1 | `pnpm verify:memory-corpus`                              | repo  | the formatter smoke: the FR-2 case formatted by the repository's prettier still validates, sections non-empty |
| FR-2 | `pnpm --filter provegate test test/memory.test.ts`       | pkg   | the new case asserts valid, not merely equal, against the typed parser and the shipped copy        |
| FR-3 | `pnpm verify:pack-drift`                                 | repo  | the packed validator and record reconcile; the intended divergence is not widened                  |
| FR-4 | `pnpm verify:brain`                                      | repo  | the retired record parses and its INDEX hook resolves                                              |
| FR-5 | `pnpm verify:memory-corpus`                              | repo  | every fixture case executes against the repository validator; fails loudly on a missing fixture    |
| FR-5 | `pnpm verify:workflow`                                   | repo  | the bundle executes the runner as a CHECKS member — the direct command above cannot prove membership |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added cases pass; existing cases unchanged
- `pnpm build` — clean build

Hard caps (when your gates manifest configures them):

- Not applicable — this PRD adds no protected surface and no client→server payload.

---

## 12. DO NOT (Anti-Patterns)

- **Do not drop the `m` flag.** `^## ` needs it. Only the `$` alternative is wrong.
- **Do not replace `^## ` with `\n## `.** The existing comment records why: a
  heading that follows with no blank line must still end the section, or an empty
  one swallows the next body and reads as full.
- **Do not fix one copy.** Three implementations share one contract, and a
  one-sided fix ships the defect to adopters while the repository looks green.
- **Do not add a corpus case that only asserts the three agree.** Before this fix
  all three copies agreed on the wrong anchor, so a parity-only case had no
  disagreement to catch. The case must assert that the document IS valid.
- **Do not make an empty section legal.** Widening the capture must not turn a
  genuinely empty `## Context` into a pass; the acceptance criteria pin both
  directions.
- **Do not delete `adr-section-blank-line-reads-empty`.** It is edited, so the trap
  stays discoverable after the code stops exhibiting it.
- **Do not reformat the existing ADRs as part of this change.** They are legal
  before and after; mixing a formatting sweep into the fix hides which one moved
  the gate. The formatter claim is proven by FR-5's isolated smoke, never by
  formatting the live store during verification.
- **Do not run the corpus from inside the turbo-cached package test against
  repository paths.** `provegate#test` hashes package inputs only; a package test
  reading `scripts/verify/lib.mjs` replays stale green from cache. The runner is
  a root script for exactly that reason.
- **Do not create the packed seed while fixing the defect.** The packed brain set
  is selective and this record is not in it; promotion is a separate decision
  with its own provenance and rollback questions.

---

## Changelog

| Date       | Change                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-28 | PRD created (Phase 1). Converted from the `ADR section regex` deferral under the cap rule; defect re-reproduced first. |
| 2026-07-28 | **Phase 6 round 2 (same independent Codex session, GATE: FAIL — one [P1] still open, one new [P1]; both closed).** [P1 still open] the round-1 pin formatted at prettier's default width 80 while `pnpm format` runs `.prettierrc.json`'s printWidth 100 and leaves the synthetic line unchanged — a false green about the very behavior it pins; rebuilt on `prettier.resolveConfig` with three assertions (source valid, bytes changed under the repo config, output refused) and a links line past the configured width. [new P1] the corrected corpus history had not been propagated: goal 2, §7, FR-2, the DO NOT rationale and the task file's Memory Context still said the 78 cases proved only agreement — all now state the coverage-hole account the learning records. |
| 2026-07-28 | **Phase 6 round 1 (independent Codex review, GATE: FAIL — two [P1], one [P2], all closed).** [P1] the formatter smoke over-claimed: formatting a real ADR still fails validation because prettier reflows long frontmatter inline lists into a block form the subset rejects — goal 3, the metric, user story 2 and FR-5 narrowed to the body-scoped claim, and the runner gained a pinned-limitation smoke asserting the refusal on prettier's own output. [P1] the retired learning's history was wrong — the corpus asserted per-case correctness; the escape was a coverage hole plus a never-executed repository copy, and the learning now says so, keeping the format-sweep warning live. [P2] the workflow ledger note had overwritten the prior verify-pack-drift/verify-turbo-inputs rationale — restored and appended. |
| 2026-07-28 | **Iteration 2 scored PASS 8.20** (fresh independent Codex session, zero remediation context). Its four watch-item prescriptions applied as post-PASS precision edits, quoted from the report: `pnpm verify:workflow` added as an FR-5 verification row (the direct command cannot prove CHECKS membership); FR-5's comparison contract stated as expected-validity + bare-field containment, never entry-keyed parity; FR-3 names both moved ledger pairs, the workflow pair as an intentional repository-only divergence with a ledger note; the two memory-input rationales corrected to stop claiming watch coverage the records do not declare (`assert-absent…` watches package test paths only, `false-green…` declares no watch). Verdict unchanged by these edits; owner may order a confirmation pass at Phase 3 approval. |
| 2026-07-28 | Remediated after readiness iteration 1 (ITERATE 7.85, independent Codex scorer; remediation by the non-scorer orchestrating session). The three-implementation execution claim corrected to the measured topology — the package corpus test runs the typed parser and the shipped copy, the repository copy is hash-reconciled via `verify:pack-drift`. FR-5 added: a repository corpus runner (`verify:memory-corpus`, wired into `verify:workflow`) executes the third copy and carries the isolated prettier smoke that replaces the unsafe repo-wide `pnpm format` verification. FR-4 narrowed: no packed twin exists and none is created; `_brain/INDEX.md` added to its Targets. Migration paragraph states atomic land/revert for the added wiring. Memory inputs `false-green-on-missing-file` re-dispositioned to applied and `turbo-cache-masks-out-of-input-reads` added. |
