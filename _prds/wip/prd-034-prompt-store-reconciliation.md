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

**Derived 2026-07-28 in one pass from the owner-approved state model**
(`_docs/design/prompt-store-state-model.md`, acceptance entry PRD-030 items 4.1 T1–T7 and
4.3) plus the two derivation notes recorded with the approval: detection must compare
**bytes, not versions** (a `prompts.values` edit re-renders different bytes at the same
version, so the banner cannot see it), and content-based discovery finds only files that
are generated **and still bannered** (a banner-stripped edit falls into the same hole as
the unbannered codex snippet).

1. **FR-1**: The reconciliation primitive. `reconcilePrompts(config, root)` in
   `core/run/prompts.ts` recomputes the generated set — `generatedPaths()` from the
   **installed** package and the **current** config, the same pure function the installer
   uses — and compares bytes on disk, path by path. No stored state is read
   (`recompute-beats-recorded-state`); the banner's version is read only for
   **attribution**, never for detection. Every path in the union of (planned set ∪
   bannered files under the scan roots) gets exactly one class:
   - `current` — bytes equal the fresh render;
   - `stale` — banner version ≠ installed version (T2: an upgrade `init` could not
     deliver);
   - `modified` — banner version = installed version, bytes differ (T3: a human edit
     **or** a config-value change — the banner records version, not config, so the two
     are indistinguishable; the report says so rather than guessing);
   - `missing` — planned path absent on disk (T1 partial install, or T6 deletion);
   - `orphaned` — a file carrying the generated banner that the current plan does not
     produce (T4 removed adapter, T5 renamed dir — found by content within the scan
     roots only: `config.prompts.dir`, `.claude/commands/`, `.cursor/rules/`; a tree
     renamed **away** from those roots is not discoverable, which is the model's
     recorded limit 5, restated here rather than papered over);
   - `unknowable` — the `codex` snippet path when present: it carries no banner, so
     content answers nothing about it (model limit 6). A banner-stripped edit of any
     other file leaves the planned-set comparison (it is still planned, so it reports
     `modified`/`stale` by bytes) but is invisible to the orphan scan — stated in the
     primitive's doc comment as the boundary of content discovery.
   The primitive returns typed findings; it writes **nothing** — not a receipt, not a
   cache, not a repair (model T7 and the T3 boundary: a reporter writes nothing).
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::reconcilePrompts`
2. **FR-2**: The recorded local exception — the one design question the model handed
   this PRD, answered: an intentional edit **does** acquire representation, and its
   home is the adopter's own config, `prompts.exceptions[]`, entries of exactly
   `{ path, reason, owner, expires }`. The tool never writes the config (model
   constraint 1), so authorship is the adopter's by construction, and an agent never
   authors one (an owner decision, like an operator acceptance). Semantics: a valid,
   unexpired entry suppresses the `modified` finding for that exact path and reports
   it as `excepted (expires <date>)`; it suppresses nothing else — `stale`, `missing`,
   `orphaned` and `unknowable` are never exceptable, and **no entry ever authorizes a
   write** (the model's stated boundary). Per `known-red-ledger-must-expire`: an
   expired entry is a failure naming its date; an entry whose path is not currently
   `modified` is a stale entry and a failure; an entry with a missing field or an
   unparseable date is refused at config load with the same semantic-validation
   surface the rest of the config uses.
   - **Targets:** `packages/provegate/src/core/config/defaults.ts`,
     `packages/provegate/src/core/config/load.ts`
3. **FR-3**: The command surface: `gate check --prompts` (the `--wiring` precedent).
   Wraps FR-1 + FR-2, prints one line per non-`current` path with its class and
   attribution, and exits non-zero if anything is not `current`/`excepted`. The
   **upgrade view** is this report's `stale` section: it names banner version vs
   installed version per file and prints the model's T2 remedy verbatim — the adopter
   deletes the printed reinstall unit and re-runs `gate init --prompts`; the command
   performs neither step (constraint 2: no command deletes an adopter's file).
   Fail-closed rules: `prompts.enabled` false → note + exit 0 (behaviour unchanged for
   a repository that never opted in — the enabled flag is the predicate, presence never
   is, per `defaults.ts`); enabled with the store directory absent → non-zero naming
   the directory (`false-green-on-missing-file`: absence is a finding, not
   not-configured — T6 says exactly this).
   - **Targets:** `packages/provegate/src/cli.ts`
4. **FR-4**: Wiring, layer one — this repository. `scripts/verify/verify-prompts.mjs`
   invokes the built CLI (`node packages/provegate/dist/cli.js check --prompts`) so the
   executed code is the shipped code; registered as `verify:prompts` in root
   `package.json`; a member of `verify:workflow`'s CHECKS; a step in the CI hygiene
   job. It runs outside turbo by construction (root script;
   `turbo-cache-masks-out-of-input-reads`). Until PRD-032 flips this repository's
   `prompts.enabled`, the check reports the FR-3 disabled note and passes — the wiring
   lands dormant here and live in the pack, and `gate-wire-or-delete` is satisfied in
   both directions from day one.
   - **Targets:** `scripts/verify/verify-prompts.mjs`, `package.json`,
     `scripts/verify/verify-workflow.mjs`, `.github/workflows/ci.yml`
5. **FR-5**: Wiring, layer two — the pack. `practices/verify/verify-prompts.mjs` calls
   the **same primitive** through the installed package (import from `provegate`) —
   never a reimplementation (`two-parsers-wrong-together`); named in the installer's
   `PACK_MAP` (`shipped-content-needs-a-delivery-gate`: shipped content with no map
   entry never reaches an adopter); a member of the **packed** `verify-workflow.mjs`
   CHECKS (adopters have stores; their bundle runs the check); a row in
   `NEXT_STEPS.md`; both new pack-drift ledger pairs reconciled with notes stating any
   intended repo/pack difference.
   - **Targets:** `packages/provegate/practices/verify/verify-prompts.mjs`,
     `packages/provegate/practices/verify/verify-workflow.mjs`,
     `packages/provegate/src/core/run/init.ts`,
     `packages/provegate/practices/NEXT_STEPS.md`, `scripts/verify/pack-drift-ledger.json`
6. **FR-6**: The conformance tests, one fixture per class and per exception outcome:
   `current`, `stale` (banner rewritten to an older version), `modified` (byte edit at
   the installed version), **`modified` via a `prompts.values` change at the same
   version** (the first derivation note, pinned as its own case), `missing`,
   `orphaned` (an adapter removed from config with its file left), `unknowable` (the
   codex snippet present), banner-stripped edit (still detected via the planned set,
   invisible to the orphan scan — both halves asserted), valid exception, expired
   exception, stale exception entry, disabled config no-op, enabled-but-absent store
   failure. The path domain in every fixture is computed from `generatedPaths()`
   (`derive-the-requirement-from-the-consumer`), never from a hand-kept list.
   - **Targets:** `packages/provegate/test/prompts-integrity.test.ts`

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

- **Given** a store byte-identical to a fresh render, **When** `gate check --prompts`
  runs, **Then** every path reports `current` and the exit code is 0.
- **Given** one store file edited by hand at the installed version, **When** the check
  runs, **Then** that path reports `modified`, the report says the cause may be a hand
  edit or a config change, and the exit code is non-zero.
- **Given** `prompts.values` changed since the render and no file touched, **When** the
  check runs, **Then** the differing paths report `modified` at the same version — the
  banner-blind case is detected by bytes.
- **Given** a store rendered by an older package version, **When** the check runs under
  a newer installed version, **Then** those paths report `stale` naming both versions,
  and the printed remedy is the model's T2 procedure — the command deletes nothing.
- **Given** an adapter removed from `config.prompts.adapters` with its file on disk,
  **When** the check runs, **Then** the file reports `orphaned` via its banner.
- **Given** the codex snippet present, **When** the check runs, **Then** it reports
  `unknowable`, never `current`.
- **Given** a valid unexpired `prompts.exceptions[]` entry for a `modified` path,
  **When** the check runs, **Then** that path reports `excepted (expires <date>)` and
  does not fail the run — and a write is never performed on its behalf.
- **Given** an expired entry, or an entry naming a path that is not `modified`, **When**
  the check runs, **Then** the run fails naming the entry and the reason.
- **Given** `prompts.enabled` false, **When** the check runs, **Then** it notes the
  disabled state and exits 0 with no other output — behaviour unchanged for
  non-adopters.
- **Given** `prompts.enabled` true and the store directory absent, **When** the check
  runs, **Then** it exits non-zero naming the directory.
- **Given** the packed `verify-prompts.mjs` in an adopter repository, **When** it runs,
  **Then** it reaches the same verdict as `gate check --prompts` on the same tree,
  because it calls the same primitive.

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

- [ ] `packages/provegate/src/core/run/prompts.ts` — `reconcilePrompts`, the primitive (FR-1)
- [ ] `packages/provegate/src/core/config/defaults.ts` + `load.ts` — `prompts.exceptions[]`
      shape and semantic validation (FR-2); the exception contract lives in the adopter's
      config, so no new schema file is needed and `schemas/` leaves the scope
- [ ] `packages/provegate/src/cli.ts` — `gate check --prompts` (FR-3)
- [ ] `scripts/verify/verify-prompts.mjs` + `package.json` + `scripts/verify/verify-workflow.mjs`
      + `.github/workflows/ci.yml` — layer-one wiring (FR-4)
- [ ] `packages/provegate/practices/verify/verify-prompts.mjs` + packed `verify-workflow.mjs`
      + `core/run/init.ts` PACK_MAP + `NEXT_STEPS.md` + the drift ledger — layer-two wiring (FR-5)
- [ ] `packages/provegate/test/prompts-integrity.test.ts` — the fixture matrix (FR-6)

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
- applied: `fixture-must-reach-production-shape` — its watch covers `cli.ts`. The FR-3
  tests must invoke the command the way production does — through the CLI entry with a
  real config on a real tree — not by calling `reconcilePrompts` with hand-shaped
  arguments; and the FR-5 packed-twin test must execute the `.mjs` file as a module the
  way an adopter's bundle does, not import its internals.
- applied: `assert-absent-needs-an-independent-cause` — its watch covers the FR-6 test
  file. The suppression assertions bite here: "an excepted path does not fail the run"
  must be caused by the exception entry, not by the path accidentally being `current` —
  each exception fixture first asserts the underlying `modified` finding exists with
  the entry removed, then asserts suppression with it present.
- reviewed: `gate-run-resume-after-archive` — its watch covers
  `packages/provegate/src/core/run/**`, which FR-1 and FR-5 target. The record is about
  the close runner's archive ordering, not the prompts surface; its lesson binds this
  PRD's own Phase 7 close (if the close stops after archiving, un-archive and resume
  from phase 7), and nothing in these FRs touches the runner it describes.
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
- `packages/provegate/src/core/run/init.ts`
- `packages/provegate/src/core/config/defaults.ts`
- `packages/provegate/src/core/config/load.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/practices/verify/verify-prompts.mjs`
- `packages/provegate/practices/verify/verify-workflow.mjs`
- `packages/provegate/practices/NEXT_STEPS.md`
- `packages/provegate/test/prompts-integrity.test.ts`
- `scripts/verify/verify-prompts.mjs`
- `scripts/verify/verify-workflow.mjs`
- `scripts/verify/pack-drift-ledger.json`
- `.github/workflows/ci.yml`
- `_brain/learnings/recompute-beats-recorded-state.md`

Fixed with the FRs (2026-07-28): `schemas/` left the scope (the exception contract lives
in the adopter's config, validated at load); `init.ts`, both `verify-workflow.mjs` copies,
the drift ledger and the config pair entered with FR-2/FR-4/FR-5. `package.json` is
shared append-only and stays out by rule. Re-run `gate queue` before Phase 3: 025 holds
`core/gates/wiring.ts`, disjoint, but the two `verify-workflow.mjs` copies may brush
PRD-026's future surface.

---

## Durable Artifacts

- `_brain/learnings/recompute-beats-recorded-state.md` — recompute rather than trust a stored hash; let the hash do the attribution job instead
- `_brain/INDEX.md` — one pointer line for the record above, per the memory protocol
- `_docs/reviews/review-034-prompt-store-reconciliation.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

Each FR row scopes to its own test name rather than a shared whole-file command —
readiness iteration 1 on PRD-030 found five FRs sharing one exit code, which leaves
Phase 5 unable to report which requirement failed.

| FR   | Command / Check                                                                 | Scope | Notes                                                                                     |
| ---- | -------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------- |
| FR-1 | `pnpm --filter provegate test test/prompts-integrity.test.ts -t classification`   | pkg   | one fixture per class; byte-based detection incl. the same-version values-change case      |
| FR-2 | `pnpm --filter provegate test test/prompts-integrity.test.ts -t exception`        | pkg   | valid / expired / stale-entry / malformed-at-load; suppression scoped to `modified` only   |
| FR-3 | `pnpm --filter provegate test test/prompts-integrity.test.ts -t command`          | pkg   | exit codes, disabled no-op, enabled-but-absent failure, T2 remedy text emitted             |
| FR-4 | `pnpm verify:prompts`                                                             | repo  | dormant note + exit 0 here until PRD-032 enables; executes the built CLI                   |
| FR-4 | `pnpm verify:workflow`                                                            | repo  | the bundle executes the new member; wire-or-delete sees the surface                        |
| FR-5 | `pnpm --filter provegate test test/prompts-integrity.test.ts -t packed`           | pkg   | packed twin resolves and calls the exported primitive, never a second implementation       |
| FR-5 | `pnpm verify:pack-drift`                                                          | repo  | both new ledger pairs reconciled with notes                                                |
| FR-6 | `pnpm --filter provegate test test/prompts-integrity.test.ts`                     | pkg   | the whole fixture matrix, including the banner-stripped both-halves case                   |

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
| 2026-07-28 | orchestrating session, on owner direction | **§4 derived in one pass from the owner-approved state model** (acceptance PRD-030 items 4.1 T1–T7 + 4.3, recorded this morning) and its two derivation notes (byte-based detection; banner-stripped files share the codex-snippet hole). Six FRs: the recomputing primitive with a seven-class report, the `prompts.exceptions[]` config contract (T3's handed question answered: representation yes, in the adopter's config, suppression-only, expiring), `gate check --prompts` with the T2 upgrade view, and wiring in both layers with the pack twin calling the same primitive. §6 and §11 written with the FRs as the parent items required; §8 and the Conflict Surface fixed to the real paths (`schemas/` out, config pair + `init.ts` + both workflow bundles + ledger in); `gate-run-resume-after-archive` disposition added for the new `core/run/**` watch overlap. |
| 2026-07-28 | owner  | **Created by the narrowing of PRD-030** (readiness iteration 1, W1, owner option (a)). Carries the reconciliation check, its command surface and its wiring; PRD-030 keeps the state model those are written against. Goals and the conflict surface are carried over; every mechanism statement from the retracted design was deleted rather than inherited, and §4 is blocked on the model by construction. The Memory Output `recompute-beats-recorded-state` relocates here from PRD-030, and the two memory records whose watches cover `core/run/init.ts` and `core/run/prompts.ts` — undeclared in PRD-030 and the cause of its lint failure — are declared here as `applied`, where the code they watch is actually touched. |
