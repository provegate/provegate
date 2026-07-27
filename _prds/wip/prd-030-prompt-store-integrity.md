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

An intentional edit is legitimate and is recorded as an exception. An exception carries an
owner, a reason, and a review date, and it **expires** — an allowlist that cannot go stale
is a permanent bypass with a comment attached, which this repository has already learned
once.

---

## 2. Goals

### Primary Goals

- [ ] Divergence between a store and the package that rendered it is a named failure, not a
      silent condition.
- [ ] An intentional local edit is possible, recorded, attributable, and expiring.
- [ ] A package upgrade has a delivery path that does not require overwriting anything the
      adopter changed.
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
      `match`, `diverged`, `excepted`, `missing`, `orphan`.
- [ ] Exit is non-zero on any `diverged`, `missing`, `orphan`, or invalid exception.
- [ ] A repository whose config declares `prompts` and whose store directory is absent
      exits non-zero with that named reason.

#### User Story 2

```
As an adopter who deliberately changed one protocol for my project,
I want that edit to survive upgrades and still be visible as a decision,
so that my change is neither silently reverted nor silently forgotten.
```

**Acceptance Criteria:**

- [ ] The edit is accepted only as a ledger exception naming the exact path, an owner from
      `config.owners`, a reason, and a `reviewBy` date.
- [ ] `gate sync --prompts` re-renders unmodified files and refuses to touch a file
      carrying an exception unless explicitly told to.
- [ ] An exception whose `reviewBy` has passed, that names a path the render no longer
      produces, or whose file now matches the render again, each fails.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1**: The ledger at `<prompts.dir>/provegate.lock.json` records the package version
   that produced the store and, for every emitted path, the hash of the render that produced
   it. It is schema-validated. It is the only file under `prompts.dir` the render does not
   produce, and FR-3's totality argument depends on that: everything else under the
   directory is reproducible, so "does this tree match the render" is a complete question.
   - **Targets:** `packages/provegate/schemas/prompts-lock.schema.json`,
     `packages/provegate/src/core/run/prompts.ts::readLedger`,
     `packages/provegate/src/core/run/prompts.ts::writeLedger`

2. **FR-2**: An `exceptions` entry accepts a divergence. It names the exact path (not a
   glob), an `owner` present in `config.owners`, a `reason`, and a `reviewBy` date. Four
   shapes **fail**, each with its own message: an entry whose `reviewBy` has passed; one
   naming a path the render no longer produces; one whose file now matches the render again,
   because a resolved exception that keeps passing is a bypass nobody will notice; and one
   whose owner is not in the allowlist. An agent never authors an exception on its own
   initiative — like an operator acceptance, it is the owner's recorded decision.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::validateExceptions`,
     `packages/provegate/schemas/prompts-lock.schema.json`

3. **FR-3**: `promptsDoctor` re-renders in memory and classifies every path: `match`,
   `diverged`, `excepted`, `missing` (rendered but absent on disk), `orphan` (present under
   `prompts.dir` but produced by no rule). It **recomputes rather than trusting the ledger**;
   the ledger only distinguishes an upgrade-caused difference from a human-caused one. A
   configured repository whose store directory is absent exits non-zero with that reason —
   a check that reads a file set must fail on absence rather than reporting nothing to
   check.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::promptsDoctor`,
     `packages/provegate/src/cli.ts::runDoctor`

4. **FR-4**: `gate doctor --prompts` prints the per-path report and `--json` emits it
   structurally, matching the shape `--memory` already establishes. Unknown options are
   refused rather than ignored.
   - **Targets:** `packages/provegate/src/cli.ts::runDoctor`

5. **FR-5**: `gate sync --prompts` is the upgrade path. It re-renders and **overwrites only
   files whose on-disk bytes match their ledger hash** — that is, only files it wrote and
   nobody has touched. A file carrying an exception is left alone and reported; a file that
   diverged with no exception is left alone and reported as requiring a decision. It rewrites
   the ledger on success. `--dry-run` prints the plan. This is why the upgrade path is a new
   verb rather than a flag on `init`: `gate init` is additive-only by explicit design and
   overwriting through it would break a promise the installer makes everywhere else.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::syncStore`,
     `packages/provegate/src/cli.ts::runSync`

6. **FR-6**: Removing the store is defined. When `prompts` is deleted from the config,
   `gate doctor --prompts` reports the orphaned directory rather than crashing, and
   `NEXT_STEPS.md` states that `templates.prd` must be cleared in the same edit or `gate new`
   will read a path that no longer exists. No command deletes the directory; removal is the
   human's, like every other destructive step.
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

- **Creating the store.** PRD-029 owns the config surface, the render rules, token
  resolution, adapters and the installer. This PRD is inert until that one is Ship Verified.
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
- **Given** a rendered file edited by hand with no ledger exception, **When** the check
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

**The ledger's real job is attribution.** Two divergences are byte-identical on disk: the
package changed, or a human changed it. Only the ledger's recorded hash separates them, and
that separation is what makes an upgrade path possible without overwriting someone's work.

**Sync is a separate verb on purpose.** `gate init` promises additive-only, `wx`,
nothing-ever-overwritten, and that promise is load-bearing in several other places. Adding a
`--force` to it would trade a documented invariant for a convenience. `gate sync --prompts`
overwrites only what it can prove it wrote.

**Prerequisite.** PRD-029 must be Ship Verified before this starts. It claims
`core/run/prompts.ts` and `cli.ts`; this PRD extends both, so they are sequential rather
than concurrent, and the lock gate will refuse them together. PRD-031 is disjoint —
it touches method content and `AGENT_BOOTSTRAP`, not this code — so **030 and 031 may run in
parallel once 029 lands.** Re-run `gate queue` before Phase 3 rather than trusting this
paragraph.

### Dependencies

- **PRD-029 Ship Verified.** Hard prerequisite, not a merge-order note.
- No new runtime dependency. `packages/provegate` takes zero, permanently.
- Nothing here reaches the network, and nothing adds a push code path.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/run/prompts.ts` — ledger, exceptions, doctor, sync
- [ ] `packages/provegate/schemas/prompts-lock.schema.json` — the ledger contract
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
- `packages/provegate/schemas/prompts-lock.schema.json`
- `packages/provegate/practices/verify/verify-prompts.mjs`
- `packages/provegate/practices/verify/verify-workflow.mjs`
- `packages/provegate/practices/NEXT_STEPS.md`
- `packages/provegate/test/prompts-integrity.test.ts`
- `scripts/verify/verify-prompts.mjs`
- `.github/workflows/ci.yml`
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
| FR-1 | `pnpm --filter provegate test test/prompts-integrity.test.ts` | pkg   | the ledger validates against its schema and records one entry per emitted path                                   |
| FR-2 | `pnpm --filter provegate test test/prompts-integrity.test.ts` | pkg   | expired, orphaned, self-resolved and unauthorized-owner exceptions each fail, every fixture mutating one green baseline |
| FR-3 | `pnpm --filter provegate test test/prompts-integrity.test.ts` | pkg   | the five per-path states; absent store exits non-zero with its own reason; a forged ledger cannot manufacture green |
| FR-4 | `pnpm --filter provegate test test/prompts-integrity.test.ts` | pkg   | the json shape matches the memory report's contract and unknown options are refused                              |
| FR-5 | `pnpm --filter provegate test test/prompts-integrity.test.ts` | pkg   | untouched files re-rendered, excepted and diverged files left byte-identical and reported, ledger rewritten       |
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
- DO NOT trust the ledger's recorded hash as the definition of correct content. Recompute
  the render; the ledger only attributes a difference, it never authorizes one.
- DO NOT let an exception live without an expiry, and DO NOT let a resolved one keep
  passing. Both turn the list into a permanent bypass.
- DO NOT let an agent author an exception. It is the owner's recorded decision, like an
  operator acceptance.
- DO NOT add `--force` to `gate init`. Its additive-only promise is relied on elsewhere;
  overwriting belongs to a verb that can prove it wrote the bytes it replaces.
- DO NOT overwrite a file that diverged without an exception, even during sync. Report it
  and let the human decide.
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
| 2026-07-27 | owner  | Split out of PRD-029 at readiness iteration 1 (W1). Carries the ledger, the reconciliation check and its wiring, plus W8's upgrade, exception-survival and removal gaps, which the parent document never specified. `gate sync --prompts` is new: the upgrade path could not be a flag on `init` without breaking its additive-only promise. |
