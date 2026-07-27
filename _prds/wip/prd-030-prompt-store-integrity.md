# PRD-030: Prompt Store Integrity and Upgrade

> **Status**: Draft
>
> <!-- Canonical lifecycle values only (see METHOD.md → Status lifecycle):
> Draft | In Review | Approved | In Progress | Code Complete | Operator Verification |
> Ship Verified | Superseded | Archived | Blocked | Deferred | Not Started. Never
> write "Completed"/"Done" — the state builder normalizes known aliases but the
> canonical value is the contract (workflow.config statusVocab.canonical). -->
>
> **Created**: 2026-07-27
> **Updated**: 2026-07-27
> **Author**: owner
> **Audience**: Implementing Agent
> **Slug**: `prompt-store-integrity`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: workflow tooling — a reconciliation check, its wiring, and an upgrade path for an artifact the CLI generates; no product capability is added.
> **Value**: 3.75 (MF/UI/TL/AR/RM: 5/4/3/3/3)
> **Autonomous Close**: operator-gated

<!-- Autonomous Close declares whether the gated close may run without a human stop:
- `eligible` — every verification is machine-checkable; NO operator-owned rows exist.
  The runner may close and locally merge when all gates are green (push stays human).
- `operator-gated` — human/runtime/staging verification exists. The runner's merge gate
  refuses until an owner-signed acceptance entry exists (METHOD.md → Operator acceptance).
Any PRD that produces operator-owned task rows MUST be operator-gated. -->

---

## 1. Introduction / Overview

> ## EVERYTHING BELOW EXCEPT FR-1 IS A SKETCH, NOT A SPECIFICATION
>
> **The whole of this document apart from FR-1 is non-binding**, including §2 Goals, §3 User
> Stories, §4 FR-2–FR-7, §5 Non-Goals, §6 Acceptance Criteria, §7, §8, §11's rows for FR-2
> onward, §12 and the Memory Inputs. It was written against the design PRD-029 carried before
> its scope cut — one in which PRD-029 wrote a receipt and `sync` had an overwrite path.
> Neither is true now: **the receipt has no owner anywhere in the chain and originates here**,
> and every transition this document assumes is one FR-1 must first define.
>
> The banner sits at the top rather than above §4 because readiness iteration 7 found the §4
> version was itself the pattern it exists to stop: a rule stated where it is owned and absent
> everywhere the same content is restated. The stale design is restated in §2's metric row,
> §6, §7 and §11 — all outside the old banner's scope, all reading as binding.
>
> **Do not implement, score, or remediate any of it as written.** FR-1's state model replaces
> it wholesale.


PRD-029 writes a protocol store into a consuming repository. Nothing keeps it honest.

Three ways it goes wrong and none is currently detectable. A maintainer edits a rendered
protocol by hand, and the store silently diverges from the package that produced it. The
package is upgraded, the render changes, and `gate init --prompts` — additive-only by
design, `wx` writes, nothing ever overwritten — cannot deliver the new bytes; the repository
keeps running the old method while reporting a successful install. Or the store is deleted
and every command that reads it now reads nothing, with no error, because absence looks like
"not configured".

The store is a build output: a pure function of the installed package version and
`workflow.config.json`. That property is what makes this tractable — the check does not
trust a recorded hash, it **recomputes the render and compares**. The ledger exists to
distinguish two divergences that look identical on disk: bytes that changed because the
package changed, and bytes that changed because a human changed them on purpose.

**PRD-029 ships a one-way install and writes nothing but the store**: no receipt, no ledger,
no reconciliation. That was the answer to its readiness iteration 5, which found every
mechanism defect of the previous design in this layer — an upgrade path that could not
terminate, an exception that permanently blocked `init`, a receipt whose own preflight status
broke under either reading. **This PRD owns that layer in full**, and it does not inherit a
half-built version of it.

Which is why **FR-1 is a precondition and not an implementation**. Five independent readiness
rounds on PRD-029 scored 4.48, 5.73, 5.90, 5.63 and 4.53, and iteration 5 diagnosed the cause:
each round repaired the counterexample it was given, inside a design whose state transitions
had never been written down. This PRD does not repeat that. Before any code is specified, one
document answers one question — *what is the complete set of state transitions for a generated
store, and which actor performs each?* — covering, concretely: install into a repository that
already has a config; upgrade; upgrade with one deliberately edited file; adding and removing
an adapter; renaming the store directory; removing the config block; and the receipt's own
second write. Every one of those was undefined or defined into a dead end in the version
iteration 5 rejected.

An intentional local edit remains legitimate, recorded, attributable and **expiring** — an
allowlist that cannot go stale is a permanent bypass with a comment attached. What authority
an exception carries, and whether anything overwrites at all, are questions FR-1 answers rather
than questions this introduction settles.

---

## 2. Goals

### Primary Goals

- [ ] Divergence between a store and the package that rendered it is a named failure, not a
      silent condition.
- [ ] An intentional local edit is possible, recorded, attributable, and expiring — as a
      suppression of a finding, never as an authorization to write.
- [ ] A package upgrade is **visible** without any command overwriting anything: the adopter
      sees exactly what would change and decides file by file.
- [ ] The check is wired to an executing surface in this repository and in the pack, so it
      cannot be registered and unrun.

### Success Metrics

| Metric                                                    | Current | Target | Measurement                                                   |
| ---------------------------------------------------------- | ------- | ------ | -------------------------------------------------------------- |
| Store divergences detected                                  | 0       | all    | `gate doctor --prompts` against a mutated store fixture         |
| Expired or orphaned exceptions that pass                    | n/a     | 0      | fixture per invalid-exception shape, each mutating a green base  |
| Upgrade paths that require overwriting an adopter's edit    | n/a     | 0      | sync refuses a file carrying an exception unless told otherwise  |
| Registered checks with no executing surface                 | n/a     | 0      | `gate check --wiring` green with the new member present         |

---

## 3. User Stories

#### User Story 1

```
As a maintainer whose repository has a protocol store,
I want to know when it no longer matches the package I have installed,
so that a method upgrade does not leave my agents on the old protocol without telling me.
```

**Acceptance Criteria:**

- [ ] `gate doctor --prompts` re-renders in memory and reports every path as one of
      `match`, `diverged`, `excepted`, `missing`, `orphan` or `retired`.
- [ ] Exit is non-zero on any `diverged`, `missing`, `orphan`, or invalid exception. `retired` is
      informational: the receipt claims nothing, so a path the plan stopped producing carries no
      obligation and no command deletes it.
- [ ] A repository whose config declares `prompts` and whose store directory is absent
      exits non-zero with that named reason.

#### User Story 2

```
As an adopter who deliberately changed one protocol for my project,
I want that edit to survive upgrades and still be visible as a decision,
so that my change is neither silently reverted nor silently forgotten.
```

**Acceptance Criteria:**

- [ ] The edit is accepted only as an entry in `prompts-exceptions.json` naming the exact
      path, an owner from `config.owners`, a reason, and a `reviewBy` date.
- [ ] `gate sync --prompts` shows what an upgrade would change and **writes nothing**, so the
      edit survives by construction rather than by being spared.
- [ ] An exception whose `reviewBy` has passed, that names a path the render no longer
      produces, or whose file now matches the render again, each fails.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1**: **Precondition FR — nothing else in this PRD is specified until this lands.**
   Author `_docs/design/prompt-store-state-model.md`: the complete set of state transitions for
   a generated store under this package's constraints, and the actor performing each. It must
   name, for every transition, what is read, what is written, by whom, and what happens when
   the step is interrupted:

   | Transition                                    | Must answer                                              |
   | --------------------------------------------- | -------------------------------------------------------- |
   | install into a repo that already has a config | how activation is recorded when no file may be edited     |
   | upgrade                                       | what changes, who applies it, and how it terminates       |
   | upgrade with one deliberately edited file     | whether the edit survives, and what authority says so     |
   | add / remove an adapter                       | what happens to the previous file, and who may delete it  |
   | rename the store directory                    | how the old tree is discovered, or that it is not         |
   | remove the config block                       | what remains discoverable, stated as a limit if none      |
   | the receipt's own second write                | who writes it, and whether it is itself a destination     |

   The document is owner-approved before FR-2 onward are written. It is a **Phase 1 artifact**:
   readiness iteration 5 established that four remediation rounds inside a design without this
   model each fixed a named counterexample and produced a new one, so producing it is the work
   rather than a preamble to it.
   - **Targets:** `_docs/design/prompt-store-state-model.md`

2. **FR-2**: An `exceptions` entry **suppresses a `diverged` finding and authorizes nothing.** It names the exact path (not a
   glob), an `owner` present in `config.owners`, a `reason`, and a `reviewBy` date. Four
   shapes **fail**, each with its own message: an entry whose `reviewBy` has passed; one
   naming a path the render no longer produces; one whose file now matches the render again,
   because a resolved exception that keeps passing is a bypass nobody will notice; and one
   whose owner is not in the allowlist. An agent never authors an exception on its own
   initiative — like an operator acceptance, it is the owner's recorded decision.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::validateExceptions`,
     `packages/provegate/schemas/prompts-exceptions.schema.json`

3. **FR-3**: `promptsDoctor` re-renders in memory and classifies every path: `match`,
   `diverged`, `excepted`, `missing` (generated but absent on disk), `orphan`. It
   **recomputes rather than trusting the ledger**; the ledger only distinguishes an
   upgrade-caused difference from a human-caused one.

   The domain it covers is **the current plan's path set, unioned with the on-disk receipt's**
   — not a directory walk, which is what makes the adapters countable: `.claude/commands/*`
   and `.cursor/rules/prd-workflow.mdc` live outside `prompts.dir` and would be invisible to
   any tree-scoped check. A sixth classification, `retired`, covers a path the receipt lists
   and the current plan no longer produces — an adapter dropped from `prompts.adapters`, for
   instance. **`retired` is informational and does not fail**: the receipt claims nothing, so
   a path it once listed carries no obligation, and no command deletes it. Reporting it once,
   at the moment the plan stops producing it, is the whole of the transition handling that
   the earlier ownership design needed five rules for. A **tree orphan** — present under
   `prompts.dir`, in neither the plan nor the receipt — is reported and fails, because inside
   the store directory an unexplained file means the store is not what the plan says it is.
   The tree scan stays scoped to `prompts.dir`; scanning `.claude/` or `.cursor/` for strays
   would report the adopter's own files, and outside the store directory the receipt is the
   only thing this tool knows about.

   `retired` **persists** rather than being reported once: nothing in this PRD writes the
   receipt, so a retired entry stays there until the human runs `gate init --prompts` again.
   That is the whole difference from the previous design, in which the report and the erasure
   were the same write.

   **The two control files are excluded from the tree-orphan rule by name.** Both
   `provegate.lock.json` and `prompts-exceptions.json` live under `prompts.dir` and are
   produced by no render rule, so without an explicit exclusion each is an orphan under this
   PRD's own definition. Stated here rather than left to an implementer to notice.

   A configured repository whose store directory is absent exits non-zero with that reason —
   a check that reads a file set must fail on absence rather than reporting nothing to check.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::promptsDoctor`,
     `packages/provegate/src/core/run/prompts.ts::classifyPath`,
     `packages/provegate/src/cli.ts::runDoctor`

4. **FR-4**: `gate doctor --prompts` prints the per-path report and `--json` emits it
   structurally, matching the shape `--memory` already establishes. Unknown options are
   refused rather than ignored.
   - **Targets:** `packages/provegate/src/cli.ts::runDoctor`

5. **FR-5**: `gate sync --prompts` is the upgrade **view**. It builds the plan for the
   installed package version, compares it against what is on disk, and **writes nothing —
   not one byte, not the receipt.** For each path it prints the classification and, for a
   `diverged` or upgrade-changed path, a unified diff of on-disk against planned content.
   Exit is non-zero when anything would change, so it composes with CI.

   **The apply path is the human's and it needs no new authority:** delete the files whose
   proposed content you want, then run `gate init --prompts`, which is additive-only and
   fills an absent path. Deletion is the consent. This is why the earlier "overwrite what
   matches the receipt hash" rule is gone — iteration 4 showed it granted a capability from
   receipt membership while the documents promised the receipt granted nothing, and the
   counterexample was an adopter's own hand-written file that happened to match.

   `sync` is a separate verb from `doctor` because they answer different questions —
   *is my store consistent?* against *what would upgrading change?* — and neither writes.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::syncReport`,
     `packages/provegate/src/core/run/prompts.ts::unifiedDiff`,
     `packages/provegate/src/cli.ts::runSync`

6. **FR-6**: Removing the store is defined, and its limit is stated rather than implied.
   While `prompts` is still in the config, `gate doctor --prompts` reports the tree it finds.
   **Once `prompts` is removed there is no locator**, so no command can report the old
   directory — that is a consequence of holding no durable state outside the config, it is
   accepted rather than worked around, and `NEXT_STEPS.md` tells the adopter to delete the
   directory and clear `templates.prd` in the same edit, or `gate new` will read a path that no
   longer exists. No command deletes anything; removal is the human's, like every other
   destructive step.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::promptsDoctor`,
     `packages/provegate/practices/NEXT_STEPS.md`

7. **FR-7**: The check is wired to an executing surface in both layers: a `verify:prompts`
   script here, membership in the `verify:workflow` bundle, a step in the CI hygiene job,
   and for adopters `practices/verify/verify-prompts.mjs` with its `PACK_MAP` entry and its
   row in the packed bundle's `CHECKS`. This FR is complete only when `gate check --wiring`
   is green with the new member present — a registered check with no executing surface, or
   an on-disk check with no registration, fails that audit in opposite directions.
   - **Targets:** `scripts/verify/verify-prompts.mjs`,
     `packages/provegate/practices/verify/verify-prompts.mjs`,
     `packages/provegate/practices/verify/verify-workflow.mjs`,
     `packages/provegate/src/core/run/init.ts::PACK_MAP`,
     `.github/workflows/ci.yml`

---

## 5. Non-Goals (Out of Scope)

- **Creating the store.** PRD-029 owns the config surface, the render rules, token resolution,
  adapters and the installer, and it writes **no** receipt — its scope is a one-way install.
  This PRD is inert until that one is Ship Verified, and everything about persistence,
  reconciliation and upgrade originates here.
- **Editing method content.** No file under `packages/provegate/prompts/` is touched here;
  that is PRD-031's surface.
- **This repository adopting a store.** PRD-032. The check must exist before dogfooding it
  is worth anything, which is why that item follows this one.
- **Deleting anything on the adopter's behalf.** Store removal is reported, never performed.
- **Migrating repositories that installed the pack before PRD-029.** They have no store, so
  there is nothing to reconcile; they run `gate init --prompts` like a fresh adopter.
- **A remote or shared ledger.** The ledger is a local file. Nothing here reaches the
  network.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a store rendered from the installed package, **When** `gate doctor --prompts`
  runs unchanged, **Then** every path reports `match` and exit is zero.
- **Given** a rendered file edited by hand with no recorded exception, **When** the check
  runs, **Then** it exits non-zero naming that path as `diverged`.
- **Given** the same edit with a valid exception, **When** the check runs, **Then** the path
  reports `excepted` and exit is zero.
- **Given** an exception whose `reviewBy` has passed, **When** the check runs, **Then** it
  fails for expiry, and the message says so rather than describing the content.
- **Given** an exception naming a path the render no longer produces, **When** the check
  runs, **Then** it fails as an orphan.
- **Given** an exception whose file now matches the render again, **When** the check runs,
  **Then** it fails, because a resolved exception left standing is a bypass.
- **Given** a configured repository whose store directory is absent, **When** the check
  runs, **Then** it exits non-zero; it does not report "nothing to check".
- **Given** an adapter removed from `prompts.adapters`, **When** the check runs, **Then** its
  previous path reports `retired`, exit stays zero for that path alone, and nothing is deleted.
- **Given** an upgraded package and a store with one hand-edited file, **When**
  `gate sync --prompts` runs, **Then** every untouched file is re-rendered, the edited file
  is left alone and reported, and the ledger reflects what was written.
- **Given** `prompts` is absent from the config, **When** every command in this PRD runs,
  **Then** behaviour is byte-identical to the pre-PRD build.

---

## 7. Technical Considerations

### Architecture

**Recompute, do not trust.** The ledger is not the source of truth about what the store
should contain — the package plus the config is. The check renders in memory and compares.
That is why a corrupted or hand-edited ledger cannot manufacture a green result: it can only
mislabel a divergence as excepted, which FR-2's owner-allowlist and expiry rules then catch.

**The receipt's job is attribution, and its second job is scope — neither is ownership.**
Two divergences are byte-identical on disk: the package changed, or a human changed it. Only
the recorded hash separates them, and that separation is what makes an upgrade path possible
without overwriting someone's work. Because PRD-029 writes it as a record of a *plan* rather
than of a directory, it is also the only thing that can tell this check which files outside
`prompts.dir` are in scope — the adapters. A tree-scoped check would silently not cover them,
which is the gap readiness iteration 2 found.

**Nothing here writes, and that is the design rather than a caveat.** The previous shape drew
a distinction between deciding on content and deciding on a claim, and iteration 4 showed the
distinction did not survive contact: `sync` overwrote a path because the receipt listed it
*and* its bytes matched, so membership was the capability and equality was the trigger. There
is no honest version of that argument, because reproducing the *new* bytes says nothing about
whether the human wanted the old ones. Removing the write removes the question. `retired` is
a report rather than a lifecycle for the same reason: a path the plan stopped producing is a
path this tool no longer says anything about, and it stays in the receipt until an `init`
rewrites it.

**Sync is a separate verb on purpose, and it is a reporter.** `gate init` promises
additive-only, `wx`, nothing-ever-overwritten, and that promise is load-bearing elsewhere; a
`--force` would trade a documented invariant for a convenience. `sync` does not need one — it
answers *what would upgrading change?* and leaves the answer on the terminal. The composition
is `rm` then `init`: the installer's additive-only contract is exactly what makes deletion a
sufficient apply mechanism, and it puts the irreversible step in the hands of the person who
can judge it.

**Prerequisite.** PRD-029 must be Ship Verified before this starts. It claims
`core/run/prompts.ts` and `cli.ts`; this PRD extends both, so they are sequential rather
than concurrent, and the lock gate will refuse them together. PRD-031 is disjoint —
it touches method content and `AGENT_BOOTSTRAP`, not this code — so **030 and 031 may run in
parallel once 029 lands.** Re-run `gate queue` before Phase 3 rather than trusting this
paragraph.

### Dependencies

- **PRD-029 Ship Verified.** Hard prerequisite, not a merge-order note.
- **FR-1's state model, owner-approved.** A hard precondition on this PRD's own FR-2 onward.
- No new runtime dependency. `packages/provegate` takes zero, permanently.
- Nothing here reaches the network, and nothing adds a push code path.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/run/prompts.ts` — ledger, exceptions, doctor, sync
- [ ] `packages/provegate/schemas/prompts-exceptions.schema.json` — the exceptions contract
- [ ] `packages/provegate/src/cli.ts` — `doctor --prompts`, `sync --prompts`
- [ ] `scripts/verify/` and `practices/verify/` — the check and its packed twin
- [ ] `.github/workflows/ci.yml` — the hygiene step

---

## 9. Open Questions

- (none)

---

## 10. References

- PRD-029 — the store this PRD reconciles; hard prerequisite
- `_readiness/wip/readiness-029-method-delivery-agent-binding.md` — W8, the gap this closes
- `_brain/learnings/known-red-ledger-must-expire.md` — why exceptions expire
- `_brain/learnings/gate-wire-or-delete.md` — why FR-7 is a requirement and not a follow-up
- `packages/provegate/src/core/run/init.ts::runInit` — the additive-only promise FR-5 preserves
- `packages/provegate/src/cli.ts::runDoctor` — the `--memory` report shape FR-4 matches

---

## Memory Inputs

Records from the memory index this work item considered, each with a disposition and a
rationale. `applied` — the record changed this work item's shape. `reviewed` — it was read
and found not to change it, but is close enough that a reader deserves to know it was
considered. `not-applicable` — its watch or subject matched, and it does not apply here.
A rationale is required in every form, including `none`: an unreasoned `none` is the
ceremonial answer this contract exists to prevent.

Required in a memory-enabled repository, alongside Memory Outputs below.

- applied: `known-red-ledger-must-expire` — the whole of FR-2. Owner, reason and `reviewBy`
  are its fields, and the four failing shapes — expired, orphaned, self-resolved,
  unauthorized owner — are the ways an allowlist becomes permanent that this record names.
- applied: `false-green-on-missing-file` — FR-3's absent-store case. A check that reads a
  rendered store must exit non-zero when the store is gone, not report nothing to check.
- applied: `gate-wire-or-delete` — FR-7 exists because of it. The check is not done when it
  runs; it is done when the wiring audit sees it registered and executing, in both layers.
- applied: `strictness-added-during-extraction-is-a-behavior-change` — its watch covers
  `packages/provegate/src/core/run/**`. FR-5 is written to it: the additive-only promise
  belongs to `runInit` and its callers, so the overwrite capability goes in a new verb
  rather than being added to the primitive they share.
- applied: `fixture-must-reach-production-shape` — its watch covers
  `packages/provegate/src/cli.ts`, which FR-3, FR-4 and FR-5 target. The doctor and sync
  regressions run through the real argument path; option parsing is where this shape's
  defects have lived.
- applied: `assert-absent-needs-an-independent-cause` — its watch covers
  `packages/provegate/test/**`. FR-5's "the edited file is left alone" needs a scenario in
  which sync would otherwise have written it; a fixture where the render happens to match
  proves nothing.
- applied: `operator-acceptance-no-self-accept` — an exception is the owner's recorded
  decision, and FR-2 borrows that rule rather than inventing a second authorization model.
- reviewed: `two-parsers-wrong-together` — FR-3 recomputes the render instead of comparing
  two readers of the same bytes, which is why no shared corpus is needed. Recorded because
  the packed twin in FR-7 is a second implementation and must call the same primitive rather
  than reimplement the comparison.
- reviewed: `verify-check-phase-placement` — the new check is a hygiene/CI member, not a
  phase gate, so no manifest phase is claimed. Recorded because the wrong placement is the
  failure this record describes.
- reviewed: `turbo-cache-masks-out-of-input-reads` — the check reads paths outside the
  package, which is why it lives in `scripts/verify/`. It binds hardest on PRD-032, where
  the store being read is this repository's own.
- not-applicable: `push-is-human-by-omission` — no code path here reaches a remote, and the
  record's rule is preserved by adding nothing.

---

## Memory Outputs

The durable records this work item expects to produce, at **exact** repo-relative paths. A
directory, a glob, or a promise to "capture learnings" is not an output. A non-empty output
set may **not** contain `none` — the two forms are mutually exclusive, because `none`
asserts the set is empty. Every non-`none` output must also appear in Durable Artifacts
below: outputs and durable artifacts are one contract expressed twice, never two lists that
may disagree.

Appending an output discovered during implementation is always allowed, with a rationale.
Removing one, changing its type or path, or replacing it with `none` is **weakening**, and
Phase 7 compares against this PRD as committed on the base branch — not against working
state.

- learning: `_brain/learnings/recompute-beats-recorded-state.md` — when an artifact is a
  pure function of known inputs, a reconciliation check should recompute it rather than
  compare against a stored hash; the stored hash is then free to do the one job recomputation
  cannot, which is telling a package-caused difference from a human-caused one.

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `packages/provegate/src/core/run/prompts.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/schemas/prompts-exceptions.schema.json`
- `packages/provegate/practices/verify/verify-prompts.mjs`
- `packages/provegate/practices/verify/verify-workflow.mjs`
- `packages/provegate/practices/NEXT_STEPS.md`
- `packages/provegate/test/prompts-integrity.test.ts`
- `scripts/verify/verify-prompts.mjs`
- `.github/workflows/ci.yml`
- `_docs/design/prompt-store-state-model.md`
- `_brain/learnings/recompute-beats-recorded-state.md`

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- `_brain/learnings/recompute-beats-recorded-state.md` — recompute rather than trust a stored hash; let the hash do the attribution job instead
- `_brain/INDEX.md` — one pointer line for the record above, per the memory protocol
- `_docs/reviews/review-030-prompt-store-integrity.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                              | Scope | Notes                                                                                                          |
| ---- | ------------------------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------- |
| FR-1 | `test -f _docs/design/prompt-store-state-model.md`            | repo  | the state model exists; its seven transitions and their actors are what FR-2 onward are written against            |
| FR-2 | `pnpm --filter provegate test test/prompts-integrity.test.ts` | pkg   | expired, orphaned, self-resolved and unauthorized-owner exceptions each fail, every fixture mutating one green baseline |
| FR-3 | `pnpm --filter provegate test test/prompts-integrity.test.ts` | pkg   | the six per-path states including a persisting retired; both control files excluded from the orphan rule; absent store exits non-zero |
| FR-4 | `pnpm --filter provegate test test/prompts-integrity.test.ts` | pkg   | the json shape matches the memory report's contract and unknown options are refused                              |
| FR-5 | `pnpm --filter provegate test test/prompts-integrity.test.ts` | pkg   | every file byte-identical after the run including the receipt; the diff names each changed path; exit non-zero      |
| FR-6 | `pnpm --filter provegate test test/prompts-integrity.test.ts` | pkg   | a config with prompts removed reports the orphaned directory instead of crashing                                 |
| FR-7 | `pnpm verify:workflow`                                        | repo  | the new member runs inside the bundle rather than beside it                                                      |
| FR-7 | `node packages/provegate/dist/cli.js check --wiring`          | repo  | registered and executing in both directions, here and in the packed bundle                                       |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/prompts-integrity.test.ts` — FR-2 introduces an
  authorization decision (whose exception counts), so the unauthorized-owner and expired
  cases are the deny tests for that surface.
- Contract test: none — this PRD ships no client-to-server payload.

Before Phase 2 PASS, run: `gate check PRD-030`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT write a single byte from `sync`, including the receipt. It reports; `init` writes.
- DO NOT reintroduce an overwrite path under any name — `--force`, `--apply`, `--accept`. The
  apply mechanism is the human deleting a file and re-running `init`, and the deletion is the
  consent that no flag can supply.
- DO NOT derive a capability from receipt membership. That is the defect iteration 4 found
  behind the previous revision's promise not to.
- DO NOT trust the receipt's recorded hash as the definition of correct content. Recompute
  the render; the receipt only attributes a difference, it never authorizes one.
- DO NOT let an exception live without an expiry, and DO NOT let a resolved one keep
  passing. Both turn the list into a permanent bypass.
- DO NOT let an agent author an exception. It is the owner's recorded decision, like an
  operator acceptance.
- DO NOT add `--force` to `gate init`. Its additive-only promise is what makes deletion a
  sufficient apply mechanism.
- DO NOT delete the store, the ledger, or any adopter file. Removal is reported, never
  performed.
- DO NOT make an absent store, an unreadable ledger, or an unparseable exception pass
  quietly. Each fails by name; a check that skips is worse than no check because it reports
  green.
- DO NOT reimplement the comparison in the packed twin. It calls the same primitive, or the
  two disagree and the corpus cannot tell you which is right.
- DO NOT edit any file under `packages/provegate/prompts/`. Method content is PRD-031's.
- DO NOT verify this repository's own store here. That is PRD-032, and it needs a cache-free
  surface this PRD only provides.
- DO NOT change behaviour for a repository whose config omits `prompts`. Every command must
  be byte-identical to the pre-PRD build, and a test must hold that line.
- DO NOT add a runtime dependency to `packages/provegate`, and DO NOT add a code path that
  reaches a git remote.

---

## Changelog

| Date       | Author | Changes                                                                                                                                                             |
| ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-27 | owner  | **The sketch banner moves to the top of the document, and `_brain/INDEX.md` is claimed.** Readiness iteration 7 found the §4-scoped banner was itself an instance of the pattern it exists to stop — the stale design is restated in §2's metric row, §6, §7 and §11, all outside its scope and all reading as binding. And `_brain/INDEX.md` is a Durable Artifact of this PRD and of PRD-031, declared by neither, so the path-conflict gate could not see a collision two parallel agents would have; carried unremediated since iteration 5. |
| 2026-07-27 | owner  | **FR-2 through FR-7 marked as a non-binding sketch.** Readiness iteration 6 found nine live restatements of the removed design still in them, and that the receipt now has no owner in the chain. Rewriting them before FR-1's state model exists is exactly what produced the restatements; they are retained for shape and replaced wholesale by the model. |
| 2026-07-27 | owner  | **PRD-029 cut to a one-way install, so this PRD owns the whole lifecycle and inherits no half-built version of it.** FR-1 becomes a **precondition**: one owner-approved document giving the complete state transitions for a generated store and the actor for each, covering the seven cases that were undefined or defined into a dead end in the design readiness iteration 5 rejected. That is the Phase 1 artifact iteration 5 demanded, located in the item that needs it. Nothing here is specified until it lands. |
| 2026-07-27 | owner  | **Iteration 4 remediation, on a fourth owner decision: `sync` never overwrites, it only reports.** Iteration 4's counterexample was an adopter's own hand-written `.claude/commands/prd-3.md`, byte-identical to version 1, recorded by a no-op `init` and then overwritten by a version-2 `sync` — so receipt membership granted a capability while both documents promised it granted nothing. `sync` is now a **reporter**: it prints classifications and unified diffs, writes not one byte including the receipt, and exits non-zero when anything would change. The apply path is the human deleting a file and re-running `init`, whose additive-only contract makes deletion sufficient and makes the irreversible step theirs. Consequences: the receipt has **one writer** (`init`), so a reporter can no longer record hashes for content it declined to place; `retired` **persists** instead of being erased by the write that reports it; exceptions **suppress a finding and authorize nothing**; both control files are excluded from the tree-orphan rule by name; and FR-6 states the config-removal limit — with no `prompts` block there is no locator, which is accepted rather than worked around. §11 corrected from five per-path states to six. |
| 2026-07-27 | owner  | **Iteration 3 remediation (W18, W19).** Owner decision: the receipt claims nothing. Exceptions move out of it into `prompts-exceptions.json`, owned end to end here — inside the receipt they would force a plan executor to preserve state it does not own, which is the shape iteration 3 rejected. FR-5 is restated as a plan executor writing the whole receipt, so the read-never-rewritten contradiction disappears. FR-3's domain becomes the current plan unioned with the on-disk receipt, and `retired` replaces the ownership lifecycle: a path the plan stopped producing is reported once and never deleted, because nothing was claimed. |
| 2026-07-27 | owner  | **Iteration 2 remediation (W15).** Owner decision: PRD-029 writes the ledger as a manifest of generated paths, so FR-1 now *extends* it with `exceptions` rather than creating it, and no bootstrap for a ledgerless store is needed or specified. FR-3's domain becomes the ledger's `generated` list rather than a directory walk, which is what makes the adapters outside `prompts.dir` countable; `orphan` splits into ledger-orphan and tree-orphan, and the tree scan's confinement to `prompts.dir` is stated rather than implied. An unreadable or schema-invalid ledger now fails by name instead of reading as a store with no exceptions. |
| 2026-07-27 | owner  | **`_brain/INDEX.md` moved to `workflow.config.json` `sharedAppendOnly`.** Claiming it here made the path-conflict gate refuse this PRD and PRD-031 together while both assert they may run in parallel — the eighth instance of the restatement pattern, found at PRD-029's iteration 8. The config line resolves it in the direction that keeps the parallelism claim true, which is the alternative iteration 2's W17 originally offered. Still a declared Durable Artifact. |
| 2026-07-27 | owner  | Split out of PRD-029 at readiness iteration 1 (W1). Carries the reconciliation check and its wiring, plus W8's upgrade, exception-survival and removal gaps, which the parent document never specified. `gate sync --prompts` is new: the upgrade path could not be a flag on `init` without breaking its additive-only promise. |
