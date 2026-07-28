# PRD-030: Prompt Store State Model — the Precondition for Integrity

> **Status**: Ship Verified
>
> <!-- Canonical lifecycle values only (see METHOD.md → Status lifecycle):
> Draft | In Review | Approved | In Progress | Code Complete | Operator Verification |
> Ship Verified | Superseded | Archived | Blocked | Deferred | Not Started. Never
> write "Completed"/"Done" — the state builder normalizes known aliases but the
> canonical value is the contract (workflow.config statusVocab.canonical). -->
>
> **Created**: 2026-07-27
> **Updated**: 2026-07-28
> **Author**: owner
> **Audience**: Implementing Agent
> **Slug**: `prompt-store-integrity`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: workflow tooling — one design document that fixes the state transitions every later command in this layer is written against; no product capability is added and no code ships.
> **Value**: 3.65 (MF/UI/TL/AR/RM: 5/2/5/1/5)
> **Autonomous Close**: operator-gated

<!-- Autonomous Close declares whether the gated close may run without a human stop:
- `eligible` — every verification is machine-checkable; NO operator-owned rows exist.
  The runner may close and locally merge when all gates are green (push stays human).
- `operator-gated` — human/runtime/staging verification exists. The runner's merge gate
  refuses until an owner-signed acceptance entry exists (METHOD.md → Operator acceptance).
Any PRD that produces operator-owned task rows MUST be operator-gated. -->

---

## 1. Introduction / Overview

PRD-029 writes a protocol store into a consuming repository. Nothing keeps it honest, and
before anything can, one question has to be answered on paper: **what is the complete set of
state transitions for a generated store, and which actor performs each?**

This PRD is that document and nothing else.

The narrowing is not a preference. Five independent readiness rounds on PRD-029 scored 4.48,
5.73, 5.90, 5.63 and 4.53, and iteration 5 diagnosed the cause: each round repaired the
counterexample it was given, inside a design whose state transitions had never been written
down. The reconciliation layer was then split out — and its first readiness round scored
**4.50/ITERATE** for the same reason in a new shape: the document had to declare its own
requirements a non-binding sketch, because they were written against a design that three
rounds had since retracted. Two items, seven rounds, one cause.

`_brain/learnings/scope-out-the-layer-the-rounds-keep-hitting.md` names this exactly: defects
clustering in one layer are a scope error reported as design errors. So this item stops
reporting them. It produces the model; the mechanism is PRD-034's, written against the model
rather than against the counterexample of the week.

The document is judged by a human — a design's completeness is not a property a grep can
assert. The §11 commands hold its **structure** (every transition present, every axis
answered, nothing left blank); its **substance** is an operator-owned row and an owner-signed
acceptance. Saying that plainly is the point: a machine gate that claims to verify a design
document's correctness would be the false green this whole method exists to refuse.

---

## 2. Goals

### Primary Goals

- [ ] Every state transition a generated store can undergo is named, with its actor, its
      reads, its writes, and its interrupt behaviour.
- [ ] No transition is left to be discovered by the implementation, which is how the previous
      seven rounds each found a new dead end.
- [ ] The model is owner-approved before any code in this layer is specified.

### Success Metrics

| Metric                                                     | Current | Target | Measurement                                                       |
| ------------------------------------------------------------ | ------- | ------ | ------------------------------------------------------------------- |
| Transitions defined with actor, reads, writes and interrupt  | 0       | 7      | the `resolved:` line of each `### T*` section, checked in §11        |
| Transitions defined into a dead end                          | 3       | 0      | owner review of the model against the seven cases                   |
| Readiness rounds spent repairing a counterexample            | 7       | 0      | PRD-034's first readiness score, once written against the model     |

---

## 3. User Stories

#### User Story 1

```
As the maintainer who will specify the reconciliation check,
I want one document that fixes every state transition a generated store can undergo,
so that the specification is written against a model instead of against the last counterexample.
```

**Acceptance Criteria:**

- [ ] `_docs/design/prompt-store-state-model.md` exists and covers all seven transitions.
- [ ] Each transition names what is read, what is written, by whom, and what happens when the
      step is interrupted — none of the four left blank.
- [ ] The owner has approved it, recorded as an acceptance entry rather than as an agent's
      claim that it reads well.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1**: Author `_docs/design/prompt-store-state-model.md`: the complete set of state
   transitions for a generated protocol store under this package's constraints, and the actor
   performing each. Every transition is a `### T<n> <name>` section that answers what is read,
   what is written, by whom, and what happens when the step is interrupted, and closes with a
   single machine-checkable line of the form
   `- T<n> resolved: reads=<...> writes=<...> actor=<...> interrupt=<...>`.

   The seven transitions, and the question each must answer:

   | # | Transition                                    | Must answer                                              |
   | - | --------------------------------------------- | -------------------------------------------------------- |
   | 1 | install into a repo that already has a config | how activation is recorded when no file may be edited     |
   | 2 | upgrade                                       | what changes, who applies it, and how it terminates       |
   | 3 | upgrade with one deliberately edited file     | whether the edit survives, and what authority says so     |
   | 4 | add / remove an adapter                       | what happens to the previous file, and who may delete it  |
   | 5 | rename the store directory                    | how the old tree is discovered, or that it is not         |
   | 6 | remove the config block                       | what remains discoverable, stated as a limit if none      |
   | 7 | the receipt's own second write                | who writes it, and whether it is itself a destination     |

   Constraints the model is written under, and may not silently relax: `gate init --prompts`
   is additive-only (`wx`, nothing ever overwritten); no command deletes an adopter's file; no
   code path reaches a git remote; `packages/provegate` takes zero runtime dependencies. Where
   a transition has no honest answer inside those constraints, the model **states the limit**
   rather than inventing a mechanism — FR-1 is complete when every transition is answered *or*
   its impossibility is recorded, not when every transition has a mechanism.

   The document is owner-approved before PRD-034 is specified. The approval is an operator-owned
   task row and an acceptance entry naming this path; an agent never records it. **If the owner
   rejects the model**, the named gap is answered and the row is re-presented — the item stays
   open and PRD-034 stays blocked. There is no path in which a rejected model is closed as
   Ship Verified, and no partial approval that unblocks a subset of transitions: PRD-034 is
   written against the whole model or not at all.
   - **Targets:** `_docs/design/prompt-store-state-model.md`

---

## 5. Non-Goals (Out of Scope)

- **Any code.** No file under `packages/provegate/src/`, `scripts/`, or `.github/` is touched
  here. This PRD ships one document.
- **The reconciliation check, `doctor`, `sync`, exceptions, and their wiring.** PRD-034, written
  against this model. Naming a mechanism here would restate a design before the model that
  should produce it exists — the error this narrowing corrects.
- **Creating the store.** PRD-029, Ship Verified.
- **Editing method content.** No file under `packages/provegate/prompts/` — PRD-031's surface.
- **This repository adopting a store.** PRD-032.
- **Deleting anything on the adopter's behalf.** Removal is a human action in every transition
  the model describes.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** the model document, **When** §11 runs, **Then** all seven `### T<n>` sections are
  present and each carries a `resolved:` line with all four axes non-empty.
- **Given** a transition with no honest answer inside the constraints, **When** the model is
  read, **Then** it records the limit explicitly and names what the adopter must do instead.
- **Given** the model as written, **When** the owner reviews it, **Then** approval is recorded
  as an acceptance entry naming `_docs/design/prompt-store-state-model.md`.
- **Given** the owner rejects the model, **When** the gap is answered, **Then** the row is
  re-presented and PRD-034 stays blocked until it is signed.
- **Given** this PRD's merge, **When** the Phase 6 reviewer inspects the diff, **Then** it
  contains no change under `packages/provegate/src/`, `scripts/`, or `.github/`. This is a
  review-time check, not a §11 row: no allowlisted command reads a diff, and a §11 row that
  pretended to would be the false evidence this PRD's own §12 forbids.

---

## 7. Technical Considerations

### Why a document is the deliverable

The store is a build output — a pure function of the installed package version and
`workflow.config.json`. That property is what makes reconciliation tractable at all, and it is
also what makes the transitions finite and enumerable in advance. Seven of them exist; three
were previously defined into dead ends and the rest were undefined. Enumerating them costs one
document and removes the failure mode that has consumed seven readiness rounds.

### What this document is not

It is not a specification of `doctor`, `sync`, or an exception format. Those are PRD-034's, and
writing them here would reproduce the exact defect this narrowing corrects: a mechanism
specified before the model that constrains it, restated in four places, retracted in three.

### Dependencies

- **PRD-029 Ship Verified.** Satisfied — the store this model describes exists.
- No runtime dependency, no network call, no push code path. This PRD adds no code at all.

---

## 8. Implementation Scope

### In Scope

- [ ] `_docs/design/prompt-store-state-model.md` — the model
- [ ] `_brain/learnings/state-model-before-mechanism.md` — the durable record
- [ ] `_brain/INDEX.md` — its pointer line

---

## 9. Open Questions

- (none)

---

## 10. References

- PRD-029 — the store whose transitions this model describes; Ship Verified
- PRD-034 — the reconciliation check, written against this model
- `_readiness/wip/readiness-030-prompt-store-integrity.md` — iteration 1, W1: the narrowing
- `_brain/learnings/scope-out-the-layer-the-rounds-keep-hitting.md` — the diagnosis this applies
- `packages/provegate/src/core/run/init.ts::runInit` — the additive-only constraint the model is written under

---

## Memory Inputs

Records from the memory index this work item considered, each with a disposition and a
rationale. `applied` — the record changed this work item's shape. `reviewed` — it was read
and found not to change it, but is close enough that a reader deserves to know it was
considered. `not-applicable` — its watch or subject matched, and it does not apply here.
A rationale is required in every form.

- applied: `scope-out-the-layer-the-rounds-keep-hitting` — the whole of this narrowing. Seven
  readiness rounds across two items clustered in one layer; the record's rule is that this is
  a scope error being reported as design errors, and acting on it is what produced this PRD.
- applied: `score-band-prescribes-the-action` — iteration 1 scored 4.50, whose band prescribes
  "return to Phase 1" rather than another remediation round. The band's action was taken
  literally instead of being treated as advisory color.
- applied: `a-rule-corrected-survives-where-it-is-restated` — the previous revision carried a
  retracted design in §2, §6, §7 and §11 behind a banner. This revision deletes the sites
  rather than annotating them, which is the record's prescribed fix.
- applied: `evidence-pattern-satisfied-by-the-template` — why §11 anchors on a `resolved:` line
  with four non-empty axes instead of `test -f`, which an empty file passes, and why the
  document's substance is an operator row rather than a grep claiming to judge a design.
- reviewed: `false-green-on-missing-file` — the presence check must exit non-zero when the
  document is absent; `test -f` does, and it is kept alongside the content anchors rather than
  replaced by them.
- reviewed: `derive-the-requirement-from-the-consumer` — its watch covers
  `packages/provegate/src/core/run/prompts.ts`, which this narrowed PRD no longer targets, so
  it carries no disposition obligation here. Recorded because the model's domain question
  (what set of paths is in scope) is an instance of its rule, and it moves to PRD-034 as an
  `applied` input where the code lives.
- reviewed: `shipped-content-needs-a-delivery-gate` — same relocation: its watch covers
  `core/run/init.ts`, no longer a target here, and it binds on PRD-034's wiring FR.
- not-applicable: `push-is-human-by-omission` — this PRD adds no code, so the rule is
  preserved by adding nothing.

---

## Memory Outputs

The durable records this work item expects to produce, at **exact** repo-relative paths. A
directory, a glob, or a promise to "capture learnings" is not an output. A non-empty output
set may **not** contain `none`. Every non-`none` output must also appear in Durable Artifacts
below.

Appending an output discovered during implementation is always allowed, with a rationale.
Removing one, changing its type or path, or replacing it with `none` is **weakening**, and
Phase 7 compares against this PRD as committed on the base branch.

- learning: `_brain/learnings/state-model-before-mechanism.md` — when a design's state
  transitions are unwritten, each remediation round repairs the counterexample it was given and
  produces a new one; the tell is a remediation trajectory that stays flat across rounds, and
  the fix is to make the model itself the work item rather than a preamble to it.

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `_docs/design/prompt-store-state-model.md`
- `_brain/learnings/state-model-before-mechanism.md`

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- `_brain/learnings/state-model-before-mechanism.md` — write the state model before the mechanism; a flat remediation trajectory is the tell
- `_brain/INDEX.md` — one pointer line for the record above, per the memory protocol
- `_docs/reviews/review-030-prompt-store-integrity.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                                                                                                                                                                                                                                                          | Scope | Notes                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------- |
| FR-1 | `test -f _docs/design/prompt-store-state-model.md`                                                                                                                                                                                                                                       | repo  | presence; fails on absence rather than reporting nothing to check                                                 |
| FR-1 | `grep -qE "^- T1 resolved: reads=\S.* writes=\S.* actor=\S.* interrupt=\S.*" _docs/design/prompt-store-state-model.md && grep -qE "^- T2 resolved: reads=\S.* writes=\S.* actor=\S.* interrupt=\S.*" _docs/design/prompt-store-state-model.md && grep -qE "^- T3 resolved: reads=\S.* writes=\S.* actor=\S.* interrupt=\S.*" _docs/design/prompt-store-state-model.md && grep -qE "^- T4 resolved: reads=\S.* writes=\S.* actor=\S.* interrupt=\S.*" _docs/design/prompt-store-state-model.md` | repo  | transitions 1–4: each answered on all four axes, none blank. Chained so a single unanswered axis exits non-zero — a count would print 3-of-7 and still exit 0 |
| FR-1 | `grep -qE "^- T5 resolved: reads=\S.* writes=\S.* actor=\S.* interrupt=\S.*" _docs/design/prompt-store-state-model.md && grep -qE "^- T6 resolved: reads=\S.* writes=\S.* actor=\S.* interrupt=\S.*" _docs/design/prompt-store-state-model.md && grep -qE "^- T7 resolved: reads=\S.* writes=\S.* actor=\S.* interrupt=\S.*" _docs/design/prompt-store-state-model.md` | repo  | transitions 5–7, same discipline                                                                                  |

Operator-owned (never machine-checkable; belongs in the task file as an Operator Handoff row):

- The owner reads the model and approves it, recorded as an acceptance entry naming
  `_docs/design/prompt-store-state-model.md`. A design's completeness is a judgment; §11 holds
  its structure only, and claiming otherwise would be the false green this method refuses.

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — existing tests unchanged; this PRD adds none
- `pnpm build` — clean build

Hard caps (when your gates manifest configures them):

- Deny test: none — this PRD adds no code and touches no protected surface.
- Contract test: none — this PRD ships no client-to-server payload.

Before Phase 2 PASS, run: `gate check PRD-030`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT write code. Not a check, not a script, not a test. This PRD ships one document, and
  a diff touching `packages/provegate/src/`, `scripts/` or `.github/` fails §6's last criterion.
- DO NOT specify `doctor`, `sync`, an exception format, or a wiring FR here. They are PRD-034's,
  and specifying them before the model is the defect this narrowing corrects.
- DO NOT invent a mechanism for a transition that has no honest answer inside the constraints.
  State the limit. An accepted limit is a finished transition; a worked-around one is the next
  counterexample.
- DO NOT relax a stated constraint to make a transition answerable — additive-only `init`, no
  deletion on the adopter's behalf, no remote, zero runtime dependencies.
- DO NOT let an agent record the owner's approval. It is an operator row and an acceptance
  entry, like every other owner decision.
- DO NOT claim a §11 command verifies the model's correctness. They verify its structure; the
  substance is operator-owned and the PRD says so where the claim would otherwise be made.
- DO NOT carry forward text from the retracted reconciliation design. If a sentence describes
  what a command does, it belongs in PRD-034 or nowhere.

---

## Changelog

| Date       | Author | Changes                                                                                                                                                             |
| ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-28 | owner  | **Narrowed to FR-1 alone; the reconciliation check moves to PRD-034.** Readiness iteration 1 scored 4.50/ITERATE on two grounds: the lint cap (two undeclared memory inputs) and the document declaring FR-2–FR-7 a non-binding sketch, which is Phase 1 still in progress rather than a contract ready for Phase 3. Owner chose option (a): this item becomes the state model, PRD-034 carries the mechanism written against it. Consequences: §2, §6, §7 and §11 are rewritten to the narrowed scope rather than annotated (the retracted design is deleted at every site, per `a-rule-corrected-survives-where-it-is-restated`); the Conflict Surface drops from eleven paths to two, so PRD-034 and PRD-031 no longer serialize behind it; §11 anchors on content rather than `test -f`, and states plainly that the model's substance is operator-owned; the Memory Output `recompute-beats-recorded-state` **relocates to PRD-034** — the insight belongs to the check that proves it, and it is moved rather than dropped; Value re-scored 3.75 → 3.65 (UI 4→2 and AR 3→1, since a design document reaches no adopter directly; TL 3→5, since it is now the precondition of the whole layer; RM 3→5, since a document carries no regression risk). |
| 2026-07-27 | owner  | **The sketch banner moves to the top of the document, and `_brain/INDEX.md` is claimed.** Readiness iteration 7 found the §4-scoped banner was itself an instance of the pattern it exists to stop — the stale design is restated in §2's metric row, §6, §7 and §11, all outside its scope and all reading as binding. And `_brain/INDEX.md` is a Durable Artifact of this PRD and of PRD-031, declared by neither, so the path-conflict gate could not see a collision two parallel agents would have; carried unremediated since iteration 5. |
| 2026-07-27 | owner  | **FR-2 through FR-7 marked as a non-binding sketch.** Readiness iteration 6 found nine live restatements of the removed design still in them, and that the receipt now has no owner in the chain. Rewriting them before FR-1's state model exists is exactly what produced the restatements; they are retained for shape and replaced wholesale by the model. |
| 2026-07-27 | owner  | **PRD-029 cut to a one-way install, so this PRD owns the whole lifecycle and inherits no half-built version of it.** FR-1 becomes a **precondition**: one owner-approved document giving the complete state transitions for a generated store and the actor for each, covering the seven cases that were undefined or defined into a dead end in the design readiness iteration 5 rejected. |
| 2026-07-27 | owner  | **Iteration 4 remediation, on a fourth owner decision: `sync` never overwrites, it only reports.** Iteration 4's counterexample was an adopter's own hand-written `.claude/commands/prd-3.md`, byte-identical to version 1, recorded by a no-op `init` and then overwritten by a version-2 `sync` — so receipt membership granted a capability while both documents promised it granted nothing. |
| 2026-07-27 | owner  | **Iteration 3 remediation (W18, W19).** Owner decision: the receipt claims nothing. Exceptions move out of it into a file owned end to end by this layer — inside the receipt they would force a plan executor to preserve state it does not own. |
| 2026-07-27 | owner  | **Iteration 2 remediation (W15).** Owner decision: PRD-029 writes the ledger as a manifest of generated paths; the domain of any later check becomes the plan unioned with the receipt rather than a directory walk, which is what makes the adapters outside `prompts.dir` countable. |
| 2026-07-27 | owner  | **`_brain/INDEX.md` moved to `workflow.config.json` `sharedAppendOnly`.** Claiming it here made the path-conflict gate refuse this PRD and PRD-031 together while both assert they may run in parallel. Still a declared Durable Artifact. |
| 2026-07-27 | owner  | Split out of PRD-029 at readiness iteration 1 (W1). Carries the reconciliation check and its wiring, plus W8's upgrade, exception-survival and removal gaps, which the parent document never specified. |
