# Readiness Assessment: PRD-030 — Prompt Store Integrity and Upgrade

## Quick Meta

| Field                  | Value                                                                     |
| ---------------------- | ------------------------------------------------------------------------- |
| PRD                    | `_prds/wip/prd-030-prompt-store-integrity.md`                             |
| Score                  | 8.15/10                                                                   |
| Verdict                | PASS                                                                      |
| Iteration              | 2                                                                         |
| Model Tier (Execution) | high                                                                      |
| Model Tier (Audit)     | high                                                                      |
| Scored by              | Claude Opus 5                                                             |
| Self-scored            | **yes** — iteration 2 scores a document this session rewrote (see below)   |
| Date                   | 2026-07-28                                                                |
| PRD Lint               | passed — `gate check PRD-030` (iteration 1: failed, two findings)         |
| State Record           | updated                                                                   |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale                                                                                                     |
| ------------------- | ---- | --------------------------------------------------------------------------------------------------------------- |
| Phase 4 (Execution) | high | Score in the 8–8.9 band. The deliverable is a state model whose failure mode is a transition answered into a dead end — the exact reasoning failure four remediation rounds already demonstrated is not cheap. |
| Phase 6 (Audit)     | high | The reviewer's job is to find the transition the model answered wrongly, and to confirm no mechanism sentence crept back in. A different model family, per the method's default. |

---

## Analysis — Iteration 2 (after the narrowing)

Option (a) was applied: PRD-030 is now FR-1 alone — the state model — and PRD-034 carries the
reconciliation check, written against it.

**W1 (blocking) — resolved, and resolved by deletion rather than annotation.** The banner is
gone because the text it protected the reader from is gone. §2, §6, §7 and §11 were rewritten
to the narrowed scope; the retracted design does not survive at a single restatement site,
which is the fix `a-rule-corrected-survives-where-it-is-restated` prescribes and the one the
previous revision declined. §4 is one requirement with one target. The document no longer
tells its scorer not to score it.

**W2 (blocking) — resolved by relocation, which is the honest form.** The two flagged records
watch `core/run/init.ts` and `core/run/prompts.ts`; the narrowed PRD targets neither, so the
gate no longer demands them here and `gate check PRD-030` passes. They are not waived away:
both are declared `applied` on PRD-034, where the code they watch is actually touched, and
PRD-030 records the relocation as `reviewed` with the reason. A disposition that moved to the
item that will edit the file is stronger than one written to silence a lint.

**W3 — resolved, and the gate discriminates.** `test -f` alone passed on an empty file. FR-1
now fixes a document format (`### T<n>` sections, each closing with
`- T<n> resolved: reads=… writes=… actor=… interrupt=…`), and §11 chains a per-transition
`grep -qE` over all four axes. Checked live rather than assumed: an answered line exits 0, the
same line with `actor=` blank exits 1. A `grep -c` variant was rejected during scoring for the
opposite reason — it prints "3" for a three-of-seven model and still exits 0, so the ledger
would record a number nobody gated on.

**W4 — dissolved with the scope.** One FR, no shared exit code. The lesson is carried forward
explicitly in PRD-034's §11, which requires per-FR test-name scoping rather than a repeated
whole-file command.

**W5, W6, W7 — dissolved with the retracted text.** The §6/§2 overwrite language, FR-3's
self-contradiction on `retired`, and §11's FR-6 row asserting the capability FR-6 denied all
lived in the deleted region. PRD-034's §12 forbids restoring any of them from an older
revision, which is the specific way this class of defect returns.

**W8 — resolved and then some.** The owner-approval row is named as operator-owned, and the
rejection path is now specified: the gap is answered, the row is re-presented, PRD-034 stays
blocked. No partial approval unblocks a subset of transitions.

**[FINDING — Testability, non-blocking] The model's substance remains a human judgment, and
the PRD is right to say so.** §11 holds structure only: all seven transitions present, all four
axes non-blank. A model that answers every axis with a plausible sentence and gets transition 5
wrong passes every command in the table. That is not a defect to fix with a better grep — it is
why the item is `operator-gated` and why Phase 6 is independent. Flagged so the Phase 3 plan
writes the operator row with the seven transitions enumerated in it, rather than a single
"owner approves the doc" checkbox that invites a skim.

**[FINDING — Completeness, non-blocking] "State the limit" is the right rule and it is
unfalsifiable from outside.** FR-1 says a transition with no honest answer inside the
constraints records the limit rather than inventing a mechanism. Correct — it is how FR-6 of
the old revision got the config-removal case right. But "we decided this is impossible" and
"we did not work hard enough" produce identical documents. The reviewer's brief should name it:
for each recorded limit, is the impossibility argued from a stated constraint, or asserted?

**Self-scoring disclosure.** This session rewrote the PRD and then scored it. Two changes were
made during scoring rather than reported as gaps — the owner-rejection loop in FR-1, and moving
§6's no-code-in-diff criterion to a review-time check (no allowlisted command reads a diff, and
a §11 row pretending to would be the false evidence §12 forbids). Both are recorded here rather
than folded silently into the score. A PASS from an author-scorer is worth what Phase 6's
independent reviewer says it is worth; the method's answer to this session's conflict of
interest is the different-model-family audit, not a stricter self-assessment.

---

## Analysis — Iteration 1 (pre-narrowing, retained for reference)

### 1. Technical Depth & Architecture

Where this PRD reasons, it reasons well, and the reasoning is hard-won rather than decorative.
**Recompute, do not trust** is the correct architecture for an artifact that is a pure function
of package version plus config: it makes a corrupted ledger unable to manufacture a green
result, and it frees the recorded hash to do the one job recomputation cannot — separating a
package-caused difference from a human-caused one. The receipt-as-attribution/scope framing is
what makes the adapters outside `prompts.dir` countable at all; a tree-scoped check would be
silently blind to `.claude/commands/*` and `.cursor/rules/prd-workflow.mdc`.

The removal of the overwrite path is the strongest single decision in the document. §7 states
the counterexample plainly: `sync` overwrote because the receipt listed the path *and* the
bytes matched, so membership was the capability and equality was the trigger — while both
documents promised the receipt granted nothing. "Reproducing the new bytes says nothing about
whether the human wanted the old ones" is the correct refutation, and `rm` + additive-only
`init` is a genuinely sufficient apply mechanism that keeps the irreversible step with the
person who can judge it.

**[FINDING — Tech Depth] FR-3 contradicts itself on `retired` within one requirement.**
Line 204: "Reporting it once, at the moment the plan stops producing it, is the whole of the
transition handling…". Line 212: "`retired` **persists** rather than being reported once".
These are not two facets of one rule; they are the pre- and post-iteration-4 designs sitting
in the same FR. An implementing agent reading top-down implements the first.

**[FINDING — Tech Depth] §11's FR-6 note contradicts FR-6's own text.** FR-6 establishes that
once `prompts` leaves the config **there is no locator**, so no command can report the old
directory — stated as an accepted limit. §11's FR-6 row then requires "a config with prompts
removed reports the orphaned directory instead of crashing". The verification command asserts
the capability the requirement says does not exist. This one matters more than the other stale
restatements because §11 *is* the Phase 5 gate: the ledger would be written against the
retracted design.

### 2. Edge Cases & Failure Modes

The failure enumeration is unusually complete for a first draft: four exception shapes each
with its own message (expired, orphaned, self-resolved, unauthorized owner), the absent-store
case failing by name rather than reporting "nothing to check", both control files
(`provegate.lock.json`, `prompts-exceptions.json`) excluded from the tree-orphan rule *by
name* rather than left for an implementer to notice, and an unreadable/unparseable file
failing loudly. The DO-NOT list is the best part of the document — fifteen entries, each one
a named defect from a prior round rather than a generic prohibition.

**[FINDING — Edge Cases] §6 and §2 still specify the write that FR-5 and §12 forbid.** §6:
"every untouched file is re-rendered … and the ledger reflects what was written". §2's metric
row: "sync refuses a file carrying an exception unless told otherwise" — "unless told
otherwise" is an overwrite flag by another name. FR-5 says "writes nothing — not one byte, not
the receipt"; §12 says "DO NOT reintroduce an overwrite path under any name — `--force`,
`--apply`, `--accept`". The top banner acknowledges this class of staleness, which is honest,
but acknowledgement is not removal: these lines read as binding to a parser and to an agent.

### 3. Maintainability & DX

The Non-Goals section is exemplary — six named exclusions, each with the reason and the owning
item (PRD-029 creates, PRD-031 edits method content, PRD-032 dogfoods). Boundary questions an
implementing agent would otherwise ask are pre-answered.

**[FINDING — Maintainability] The document instructs its own scorer not to score it.** The
banner reads: "EVERYTHING BELOW EXCEPT FR-1 IS A SKETCH, NOT A SPECIFICATION … Do not
implement, score, or remediate any of it as written." Taking that at its word — which is the
only honest reading — this PRD contains exactly one specified requirement, FR-1, whose output
is an owner-approved design document. That is a Phase 1 artifact by the PRD's own admission
("It is a **Phase 1 artifact**"), and the method has a name for a work item whose sole content
is one document that must be approved before anything else can be written: it is not a PRD
ready for Phase 3, it is Phase 1 still in progress.

This is not a criticism of the decision to write the banner. Iteration 5's diagnosis on
PRD-029 — four remediation rounds each repairing the counterexample it was given inside a
design whose state transitions were never written down — is correct, and refusing to
re-litigate FR-2..FR-7 before the model exists is the right call. The error is keeping them in
the same document. A PRD is a contract the toolchain parses; a contract that declares 80% of
itself non-binding cannot be scored, planned, or verified as one unit, and every gate
downstream will read the sketch as the spec.

### 4. Migration & Rollback

Strong on the axis that matters for `infra` class. The additive-only `init` promise is
preserved rather than traded away; behaviour for a repository whose config omits `prompts` is
required to be byte-identical to the pre-PRD build, with a test named to hold that line;
FR-6 states the config-removal limit as an accepted consequence of holding no durable state
outside the config, rather than inventing a hidden locator to work around it. Rollback for the
adopter is `rm` + `init`, which needs no new authority.

All of it sits in the non-binding region.

### 5. Memory Inputs

The declared set is substantive, not ceremonial. `known-red-ledger-must-expire` genuinely *is*
FR-2 — owner, reason, `reviewBy`, and the four ways an allowlist becomes permanent map
one-to-one onto the four failing shapes. `false-green-on-missing-file` → FR-3's absent-store
case, correct. `strictness-added-during-extraction-is-a-behavior-change` is the sharpest of
them: it is why the new capability went into a new verb instead of into the primitive `runInit`
and its callers share. The three `reviewed` entries each state what was considered and why it
did not bind, and `push-is-human-by-omission` as `not-applicable` is right — the rule is
preserved by adding nothing.

**[FINDING — Memory Inputs] Two active records whose watch overlaps a declared target are
missing, and `gate check` fails on both.** This is the lint failure, and neither is a
formality:

- `shipped-content-needs-a-delivery-gate` watches `packages/provegate/src/core/run/init.ts`;
  FR-7 targets `init.ts::PACK_MAP`. The record's entire subject is a `PACK_MAP` that named no
  entry for shipped content, and its rule — "check the installer's map, not the package
  manifest" — is precisely what FR-7's packed twin must satisfy. The single most on-point
  record in the index for FR-7 is the one FR-7 does not name.
- `derive-the-requirement-from-the-consumer` watches
  `packages/provegate/src/core/run/prompts.ts`, targeted by FR-2, FR-3 and FR-5. Its rule
  (`consumed ∩ declared`, computed by scanning what the consumer reads) binds directly on
  FR-3's domain definition — "the current plan's path set, unioned with the on-disk
  receipt's, not a directory walk" is an instance of this record's shape, arrived at
  independently and left uncredited.

Both are `applied` in substance and undeclared in form. That is the disposition to write —
not `reviewed`, and not a waiver.

---

## Scorecard

Class `infra` weights (Migration inflated to 20%, Multi-Tenancy halved to 10%).
Iteration 2 — the narrowed document.

| #         | Dimension                | Weight | Score       | Notes                                                                                                     |
| --------- | ------------------------ | ------ | ----------- | ----------------------------------------------------------------------------------------------------------- |
| 1         | Clarity                  | 15%    | 9/10        | One FR, one target, an exact document format, four named constraints it may not relax, empty Open Questions, DO-NOT scoped to the deliverable. An agent can execute this without asking anything. |
| 2         | Completeness             | 20%    | 9/10        | Seven transitions each with the question it must answer; the no-honest-answer case closed by "state the limit"; the owner-rejection loop specified. Held off 10 by the unfalsifiability of a recorded limit. |
| 3         | Technical Depth          | 20%    | 7/10        | The depth is the diagnosis and the constraint set, not architecture — by design, since the architecture is the deliverable. Honest, and it caps this dimension for a document-authoring item. |
| 4         | Multi-Tenancy & Security | 10%    | 8/10        | No code, no protected surface, no push path, no dependency. The one authority question — who approves the model — is routed to an owner acceptance rather than an agent's judgment. |
| 5         | Scope & Testability      | 15%    | 8/10        | Non-Goals precise and each names its owning item. §11 is exit-code-real for structure and says plainly that substance is operator-owned. The no-code-in-diff criterion sits with Phase 6 because no allowlisted command reads a diff. |
| 6         | Migration & Rollback     | 20%    | 8/10        | Nothing to migrate; the undo is a revert of one document. What this dimension actually carries here is ordering, and it is explicit in both directions: PRD-034's §4 is blocked by construction, PRD-030's §7 states the prerequisite. |
| **Total** | **Weighted**             |        | **8.15/10** | **PASS**                                                                                                   |

Weighted sum: 9(.15) + 9(.20) + 7(.20) + 8(.10) + 8(.15) + 8(.20) =
1.35 + 1.80 + 1.40 + 0.80 + 1.20 + 1.60 = **8.15** ✔.

Hard caps checked: security cap — not tripped (no protected surface, no code). Contract cap —
not tripped (`none`, correctly declared). Lint cap — **not tripped**: `gate check PRD-030`
passes.

Value header arithmetic verified: 5(.25) + 2(.25) + 5(.20) + 1(.15) + 5(.15) = 3.65 ✔.

Iteration 1's scorecard (4.50, pre-narrowing): Clarity 4, Completeness 3, Tech Depth 5,
Security 7, Scope & Testability 4, Migration 5 — retained for the trajectory.

---

## Missing Pieces (to reach 10/10)

**Iteration 2 disposition:** W1 resolved (option (a) — narrowed to FR-1; PRD-034 created).
W2 resolved (dispositions relocated to PRD-034; lint passes). W3 resolved (content-anchored
`grep -qE` chain, discrimination verified live). W4, W5, W6, W7 dissolved with the retracted
scope, and the lesson behind W4 is carried into PRD-034's §11. W8 resolved, plus the
rejection path. Two non-blocking findings remain, both for the Phase 3 plan and the Phase 6
brief rather than for the PRD:

- **W9 (Phase 3)** — write the operator row with the seven transitions enumerated in it, not
  as one "owner approves the doc" checkbox. §11 gates structure; the substance is exactly what
  a single checkbox invites a reader to skim.
- **W10 (Phase 6 brief)** — for each transition the model records as an accepted limit, ask
  whether the impossibility is argued from a stated constraint or merely asserted. "Impossible"
  and "we stopped trying" produce identical documents, and only the reviewer can tell them apart.

Iteration 1's list, retained:

1. **W1 — Split the item, or finish Phase 1 before re-scoring.** A PRD that declares FR-2..FR-7
   non-binding cannot be scored as a contract, and Phase 3 would plan against a sketch. Two
   legitimate shapes: (a) this item becomes FR-1 alone — the state model, owner-approved, with
   a content-anchored gate — and a successor PRD carries the implementation written against
   it; or (b) this item stays in Phase 1 until the model lands and FR-2..FR-7 are rewritten
   from it. Either is a defensible reading of the method; what is not defensible is passing
   readiness with a banner saying "do not score this".
2. **W2 — Clear the lint (blocking, hard cap).** Add `applied:` dispositions for
   `shipped-content-needs-a-delivery-gate` (FR-7 targets `init.ts::PACK_MAP`; the record is
   about a `PACK_MAP` that shipped content nobody installed) and
   `derive-the-requirement-from-the-consumer` (FR-3's plan∪receipt domain *is* `consumed ∩
   declared`). Re-run `gate check PRD-030` and record the pass in Quick Meta.
3. **W3 — FR-1's verification cannot see the requirement.** `test -f
   _docs/design/prompt-store-state-model.md` passes on an empty file. FR-1's substance is
   seven named transitions each answering what is read, what is written, by whom, and what
   happens on interrupt — none of which existence proves. Anchor the command to the content
   (assert the seven transition rows are present and non-empty), per
   `_brain/learnings/evidence-pattern-satisfied-by-the-template.md`: a required-line gate that
   the template itself satisfies is not a gate.
4. **W4 — Five FRs share one exit code.** FR-2 through FR-6 all verify with the identical
   `pnpm --filter provegate test test/prompts-integrity.test.ts`. The Notes column
   distinguishes them; the gate does not. Phase 5 cannot report which FR failed, and a file
   that never grew FR-4's cases still shows green for FR-4. Scope each row to its own test
   name filter.
5. **W5 — Delete the retracted design rather than annotating it.** §6's "every untouched file
   is re-rendered … the ledger reflects what was written" and §2's "unless told otherwise"
   specify the overwrite that FR-5 and §12 forbid. The banner is the right instinct applied at
   the wrong layer — `_brain/learnings/a-rule-corrected-survives-where-it-is-restated.md` is
   the record for exactly this, and the fix it prescribes is removal at every restatement
   site, not a note at the top.
6. **W6 — Resolve `retired` inside FR-3.** "Reported once, at the moment the plan stops
   producing it" (line 204) and "persists rather than being reported once" (line 212) are the
   two designs, both live. Keep the second; delete the first.
7. **W7 — §11's FR-6 row asserts the capability FR-6 denies.** A config with `prompts` removed
   has no locator, so it cannot "report the orphaned directory". Rewrite the row to verify the
   stated limit (behaviour is byte-identical to the pre-PRD build and no crash occurs), not
   its opposite.
8. **W8 — Name the operator handoff FR-1 creates.** "The document is owner-approved before
   FR-2 onward are written" is a human decision inside the autonomous span. `Autonomous Close:
   operator-gated` is the correct declaration, but Phase 3 must plan the handoff row and the
   close needs an owner-signed acceptance naming it — otherwise the merge gate refuses with no
   one having been told what to sign.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes                                                                                |
| --- | ---------- | ----- | ------- | -------------------------------------------------------------------------------------------- |
| 1   | 2026-07-27 | 4.50  | ITERATE | Initial assessment. Lint cap tripped (two missing memory inputs). Document declares FR-2..FR-7 non-binding; three live contradictions between the retracted and current designs (W5, W6, W7). |
| 2   | 2026-07-28 | 8.15  | PASS    | Owner chose option (a): narrowed to FR-1 (the state model); PRD-034 created for the reconciliation check. Retracted design deleted at every site rather than annotated. Memory dispositions relocated to PRD-034; lint passes. §11 anchored on content with per-transition discrimination verified live. Owner-rejection path specified. Self-scored — see the disclosure in the iteration 2 analysis. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

Iteration 2 (the narrowed document); iteration 1's result in parentheses where it differed.

| Check                                                             | Result                                                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| No runtime dependency added to `packages/provegate`               | ✔ this PRD adds no code at all                                                       |
| No code path reaching a git remote                                | ✔ §7 and §12; `push-is-human-by-omission` disposed as N/A                            |
| No telemetry / network call                                       | ✔ nothing here executes                                                              |
| Method content traceable to the source snapshot                   | ✔ N/A — no file under `packages/provegate/prompts/` is touched (§5, §12)             |
| Conflict Surface declared, shared append-only paths excluded      | ✔ 2 paths, down from 11 — PRD-034 and PRD-031 no longer serialize behind this item   |
| Durable Artifacts declared and mirrored in Memory Outputs         | ✔ one learning, INDEX pointer, review artifact — the two lists agree                 |
| Memory Output relocation recorded rather than silently dropped    | ✔ `recompute-beats-recorded-state` moved to PRD-034, stated in both Changelogs       |
| Value header arithmetic                                           | ✔ 3.65 = Σ(dims × weights), re-scored for the narrowed scope (was 3.75)              |
| Open Questions empty or deferred with links                       | ✔ `(none)`                                                                           |
| No `TBD` / `???` / `to be decided` in FR or Tech Spec             | ✔                                                                                    |
| Every FR carries a Targets line                                   | ✔ the one FR does                                                                    |
| Every FR maps to at least one runnable §11 command                | ✔ three rows, exit-code-discriminating (was: form satisfied, discrimination not — W4)|
| Operator-owned work declared where it exists                      | ✔ owner approval named in §11 and §4, with the rejection path                        |
| `gate check` clean                                                | ✔ `[check] ok — PRD-030 passes the readiness lint` (was ✘, two findings)             |

---

## Verdict

**PASS — 8.15/10 (iteration 2).** Proceed to Phase 3: Task List Generation.

`gate check PRD-030` passes; no hard cap is tripped. The item is one requirement, one target,
one document, with a structural gate that discriminates (verified live: a blank axis exits
non-zero) and an honest declaration that the document's substance is owner-judged rather than
grep-judged.

Two carries into the next phases, neither blocking: Phase 3 writes the operator row with the
seven transitions enumerated rather than as one checkbox (W9); the Phase 6 brief asks, for
each transition recorded as an accepted limit, whether the impossibility is argued from a
stated constraint or merely asserted (W10).

Model tiers: Execution `high`, Audit `high` — 8–8.9 band, and the failure mode is a
transition answered into a dead end, which four prior remediation rounds show is not cheap
to catch.

**This is a self-scored PASS.** The session that rewrote the PRD scored it, and made two
changes during scoring rather than reporting them as gaps (both recorded in the iteration 2
analysis). The method's answer to that conflict of interest is Phase 6's independent
different-family reviewer, not a stricter self-assessment — the audit should be read as the
real verdict on this document.

---

## Verdict — Iteration 1 (superseded)

**ITERATE — 4.50/10.** Two independent reasons, either sufficient on its own.

The lint cap is tripped: `gate check PRD-030` fails with two memory-input findings and there
is no written waiver. Both name records that are `applied` in substance — the one record in
the index whose entire subject is a `PACK_MAP` shipping content nobody installed is missing
from the FR that edits `PACK_MAP`.

The structural reason is larger. This document declares everything except FR-1 to be a
sketch and instructs the reader not to score it. That instruction is correct and it is the
verdict: the item is still in Phase 1. FR-1 is a Phase 1 artifact by the PRD's own words, and
a work item whose only specified content is one owner-approved design document is not ready
for task generation — it is ready to produce that document. The banner is honest engineering;
it is also the readiness answer.

The quality of the reasoning that *is* here is high, and the record of how it was reached —
five scored rounds on the parent, each counterexample named in the Changelog — is exactly the
discipline the method asks for. Nothing in this verdict says the thinking is wrong. It says
the contract is not yet written.

Re-score after W1 and W2, and the score will move a long way on W3–W7 alone.
