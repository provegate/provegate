# PRD-034: Prompt Store Reconciliation — the Check, Written Against the Model

> **Status**: Draft
>
> <!-- Canonical lifecycle values only (see METHOD.md → Status lifecycle):
> Draft | In Review | Approved | In Progress | Code Complete | Operator Verification |
> Ship Verified | Superseded | Archived | Blocked | Deferred | Not Started. Never
> write "Completed"/"Done" — the state builder normalizes known aliases but the
> canonical value is the contract (workflow.config statusVocab.canonical). -->
>
> **Created**: 2026-07-28
> **Updated**: 2026-07-28
> **Author**: owner
> **Audience**: Implementing Agent
> **Slug**: `prompt-store-reconciliation`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: workflow tooling — a reconciliation check, its command surface, and its wiring in both layers; no product capability is added.
> **Value**: 3.75 (MF/UI/TL/AR/RM: 5/4/3/3/3)
> **Autonomous Close**: operator-gated

---

## 1. Introduction / Overview

PRD-029 writes a protocol store into a consuming repository. Nothing keeps it honest: a
maintainer edits a rendered protocol by hand and the store silently diverges from the package
that produced it; the package is upgraded and additive-only `init` cannot deliver the new
bytes, so the repository runs the old method while reporting a successful install; the store
is deleted and absence reads as "not configured". This PRD owns the detection, the upgrade
view, and the wiring that keeps them from being registered and never run.

**This document deliberately carries no functional requirements yet, and that is its current
correct state.** PRD-030 is producing `_docs/design/prompt-store-state-model.md` — the complete
set of state transitions for a generated store and the actor performing each. Seven readiness
rounds across PRD-029 and PRD-030 were spent repairing counterexamples inside a design whose
transitions had never been written down; writing FRs here before the model is owner-approved
would be the eighth. The FRs are derived from the model, in one pass, once it lands.

What survives from the retracted design is the goal set below and nothing else. Every
mechanism sentence — what recomputes, what the receipt claims, what a `sync` verb does, how an
exception is authorized — was deleted rather than carried, because those are exactly the
statements the model exists to fix.

---

## 2. Goals

### Primary Goals

- [ ] Divergence between a store and the package that rendered it is a named failure, not a
      silent condition.
- [ ] An intentional local edit is possible, recorded, attributable, and expiring.
- [ ] A package upgrade is visible to the adopter, under whatever authority the state model
      establishes for applying it.
- [ ] The check is wired to an executing surface in this repository and in the pack, so it
      cannot be registered and unrun.

### Success Metrics

| Metric                                       | Current | Target | Measurement                                                  |
| ---------------------------------------------- | ------- | ------ | -------------------------------------------------------------- |
| Store divergences detected                     | 0       | all    | a mutated-store fixture, per the model's transition set        |
| Registered checks with no executing surface    | n/a     | 0      | `gate check --wiring` green with the new member present        |
| FRs specified before the state model is approved | n/a   | 0      | this section; the block below is the gate                      |

---

## 3. User Stories

#### User Story 1

```
As a maintainer whose repository has a protocol store,
I want to know when it no longer matches the package I have installed,
so that a method upgrade does not leave my agents on the old protocol without telling me.
```

**Acceptance Criteria:**

- [ ] Written with the FRs, from the state model's transition set.

#### User Story 2

```
As an adopter who deliberately changed one protocol for my project,
I want that edit to survive upgrades and still be visible as a decision,
so that my change is neither silently reverted nor silently forgotten.
```

**Acceptance Criteria:**

- [ ] Written with the FRs, from the state model's transitions 3 and 4.

---

## 4. Functional Requirements

**Blocked by construction.** No FR is written until
`_docs/design/prompt-store-state-model.md` exists and the owner has approved it (PRD-030,
FR-1). This is not a placeholder to be filled in opportunistically: the resumption condition
is the acceptance entry naming that path, and an agent that writes an FR here before it exists
is repeating the failure both parent items were narrowed to stop.

When the model lands, the FRs are derived from it in one pass and cover, at minimum: detection
of divergence, the authority and shape of a recorded local exception, the upgrade view, the
removal path and its stated limits, and the wiring in both layers.

---

## 5. Non-Goals (Out of Scope)

- **Defining the state transitions.** PRD-030 owns the model; this PRD consumes it.
- **Creating the store.** PRD-029, Ship Verified.
- **Editing method content.** No file under `packages/provegate/prompts/` — PRD-031's surface.
- **This repository adopting a store.** PRD-032, which needs this check to exist first.
- **Migrating repositories that installed the pack before PRD-029.** They have no store, so
  there is nothing to reconcile.
- **A remote or shared ledger.** Local files only; nothing here reaches the network.

---

## 6. Acceptance Criteria (Gherkin Style)

- Written with the FRs, from the state model. Recording criteria now would re-create the
  restatement problem: §6 outliving a retracted §4 is precisely how the previous revision
  accumulated nine live contradictions.

---

## 7. Technical Considerations

### Dependencies

- **PRD-029 Ship Verified.** Satisfied.
- **PRD-030 Ship Verified, with the state model owner-approved.** Hard prerequisite, and the
  resumption condition for §4.
- No new runtime dependency. `packages/provegate` takes zero, permanently.
- Nothing here reaches the network, and nothing adds a push code path.

### Conflict and sequencing

This PRD claims `core/run/prompts.ts` and `cli.ts`, which PRD-029 also claimed — sequential
rather than concurrent, and PRD-029 has landed. PRD-030 claims only documents, so it does not
serialize against this one; PRD-031 touches method content and is disjoint from both. Re-run
`gate queue` before Phase 3 rather than trusting this paragraph.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/run/prompts.ts` — the reconciliation surface
- [ ] `packages/provegate/src/cli.ts` — the command surface
- [ ] `packages/provegate/schemas/` — the exception contract, if the model establishes one
- [ ] `scripts/verify/` and `practices/verify/` — the check and its packed twin
- [ ] `.github/workflows/ci.yml` — the hygiene step

Exact paths and symbols are fixed with the FRs.

---

## 9. Open Questions

- (none — every open question this PRD would have carried is a question the state model
  answers, and it is tracked there rather than restated here)

---

## 10. References

- PRD-030 — the state model this PRD is written against; hard prerequisite
- PRD-029 — the one-way install that creates the store
- `_readiness/wip/readiness-030-prompt-store-integrity.md` — iteration 1, W1: why this item exists
- `_brain/learnings/scope-out-the-layer-the-rounds-keep-hitting.md` — the diagnosis behind the split

---

## Memory Inputs

Records from the memory index this work item considered, each with a disposition and a
rationale.

- applied: `shipped-content-needs-a-delivery-gate` — its watch covers
  `packages/provegate/src/core/run/init.ts`, which this PRD's wiring FR will target. The
  record's whole subject is a `PACK_MAP` that named no entry for shipped content, so the
  packed twin of this check must appear in the installer's map, not merely in the package.
- applied: `derive-the-requirement-from-the-consumer` — its watch covers
  `packages/provegate/src/core/run/prompts.ts`. The check's path domain must be computed from
  what the consumer reads rather than from a catalogue; a directory walk and a declared token
  list are both the wider-than-consumed shape this record names.
- applied: `known-red-ledger-must-expire` — any recorded local exception is an acknowledged-
  failure allowlist, and must fail on stale or unknown entries or it becomes a permanent bypass.
- applied: `gate-wire-or-delete` — the wiring FR exists because of it: a registered check with
  no executing surface and an on-disk check with no registration fail the audit in opposite
  directions.
- applied: `false-green-on-missing-file` — a check that reads a rendered store must exit
  non-zero when the store is absent, not report nothing to check.
- reviewed: `strictness-added-during-extraction-is-a-behavior-change` — its watch covers
  `packages/provegate/src/core/run/**`. Binding on whichever verb the model assigns the upgrade
  path to; recorded now so the FR pass does not rediscover it.
- reviewed: `two-parsers-wrong-together` — the packed twin is a second implementation and must
  call the same primitive rather than reimplement the comparison.
- reviewed: `turbo-cache-masks-out-of-input-reads` — a check reading paths outside the package
  cannot live behind the package's turbo inputs.
- not-applicable: `push-is-human-by-omission` — no code path here reaches a remote, and the
  record's rule is preserved by adding nothing.

---

## Memory Outputs

- learning: `_brain/learnings/recompute-beats-recorded-state.md` — when an artifact is a pure
  function of known inputs, a reconciliation check should recompute it rather than compare
  against a stored hash; the stored hash is then free to do the one job recomputation cannot,
  which is telling a package-caused difference from a human-caused one. Relocated from PRD-030
  when that item narrowed to the state model: the insight belongs to the check that proves it.

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `packages/provegate/src/core/run/prompts.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/practices/verify/verify-prompts.mjs`
- `packages/provegate/practices/verify/verify-workflow.mjs`
- `packages/provegate/practices/NEXT_STEPS.md`
- `packages/provegate/test/prompts-integrity.test.ts`
- `scripts/verify/verify-prompts.mjs`
- `.github/workflows/ci.yml`
- `_brain/learnings/recompute-beats-recorded-state.md`

The surface is provisional until the FRs are written; a path the model turns out not to
require is removed before Phase 3 rather than claimed defensively.

---

## Durable Artifacts

- `_brain/learnings/recompute-beats-recorded-state.md` — recompute rather than trust a stored hash; let the hash do the attribution job instead
- `_brain/INDEX.md` — one pointer line for the record above, per the memory protocol
- `_docs/reviews/review-034-prompt-store-reconciliation.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

Written with the FRs. Each FR gets a row scoped to its own test name rather than a shared
whole-file command — readiness iteration 1 on PRD-030 found five FRs sharing one exit code,
which leaves Phase 5 unable to report which requirement failed.

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build

Before Phase 2 PASS, run: `gate check PRD-034`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT write an FR before `_docs/design/prompt-store-state-model.md` is owner-approved. The
  block in §4 is the requirement, not a formality.
- DO NOT restore a mechanism sentence from the retracted design by reading an older revision of
  PRD-030. Those statements were deleted because three rounds retracted them; the model
  supersedes them, and reintroducing one is how a corrected rule survives.
- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT add a runtime dependency to `packages/provegate`, and DO NOT add a code path that
  reaches a git remote.
- DO NOT delete an adopter's file. Removal is reported, never performed.
- DO NOT let an agent author an exception entry, if the model establishes one. It is the
  owner's recorded decision, like an operator acceptance.
- DO NOT reimplement the comparison in the packed twin. It calls the same primitive.
- DO NOT change behaviour for a repository whose config omits `prompts`.

---

## Changelog

| Date       | Author | Changes                                                                                                                              |
| ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-28 | owner  | **Created by the narrowing of PRD-030** (readiness iteration 1, W1, owner option (a)). Carries the reconciliation check, its command surface and its wiring; PRD-030 keeps the state model those are written against. Goals and the conflict surface are carried over; every mechanism statement from the retracted design was deleted rather than inherited, and §4 is blocked on the model by construction. The Memory Output `recompute-beats-recorded-state` relocates here from PRD-030, and the two memory records whose watches cover `core/run/init.ts` and `core/run/prompts.ts` — undeclared in PRD-030 and the cause of its lint failure — are declared here as `applied`, where the code they watch is actually touched. |
