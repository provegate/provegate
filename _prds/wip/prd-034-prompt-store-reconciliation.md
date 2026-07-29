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

**The functional requirements are derived from `_docs/design/prompt-store-state-model.md`
at Revision 2** (owner-approved 2026-07-28 — the same day Revision 1 landed, superseded on
PRD-034's own iteration-1 finding that a second generated path ships unbannered). The
original discipline held: no FR was written before the model existed; the first derivation
was scored 5.1 by an independent session whose findings forced both the model's Revision 2
and this second derivation. Seven readiness rounds across PRD-029 and PRD-030 were spent
repairing counterexamples inside a design whose transitions had never been written down —
the model, and the score-band rule (4-5.9 returns to Phase 1, which is what happened), are
why this document was rewritten rather than patched.

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
| Planned-path divergences detected              | 0       | all planned | mutated-store fixtures over the five planned-path classes; unplanned files are recorded limits, pinned as no-finding fixtures |
| Registered checks with no executing surface    | n/a     | 0      | `gate check --wiring` green with the new member present        |
| FRs specified before the state model is approved | 0 (held) | 0    | historical gate — held through both derivations; Revision 2 preceded the re-derivation |

---

## 3. User Stories

#### User Story 1

```
As a maintainer whose repository has a protocol store,
I want to know when it no longer matches the package I have installed,
so that a method upgrade does not leave my agents on the old protocol without telling me.
```

**Acceptance Criteria:**

- [ ] The §6 criteria for classification, the upgrade view, and the summary line (FR-1/FR-3).

#### User Story 2

```
As an adopter who deliberately changed one protocol for my project,
I want that edit never overwritten by any tool and visible as a recorded decision,
so that my change is neither silently reverted nor silently forgotten — knowing an
upgrade reports it and I rebase it by hand, because no exception authorizes a write.
```

**Acceptance Criteria:**

- [ ] The §6 criteria for the exception contract: suppression scoped to `modified`, expiry
      boundary, stale-entry failure, and the no-write rule (FR-2).

---

## 4. Functional Requirements

**Re-derived 2026-07-28 (second pass) from the state model at Revision 2** (owner-approved
the same day: two unbannered generated paths; the detection/attribution split) **and the
iteration-1 readiness score's eleven missing pieces.** Detection compares **bytes, never
versions**; the banner is attribution only; and after the owner's iteration-5
narrowing there is no content discovery at all — the check reads exactly the planned
set.

1. **FR-1**: The reconciliation primitive. `reconcilePrompts(config, root)` in
   `core/run/prompts.ts` recomputes the generated set — `generatedPaths()` from the
   **installed** package and the **current** config, the same pure function the installer
   uses — and compares bytes on disk. No stored state is read
   (`recompute-beats-recorded-state`). **Findings name paths in one canonical
   spelling** (iteration 3's contradiction, resolved at the source): the primitive
   normalizes each joined `dir + '/' + rel` with POSIX rules — collapse repeated
   separators, drop a leading `./` — so every legal `prompts.dir` spelling (`.`
   included, which raw interpolation would render as `./prompts/…`) converges to one
   clean repo-relative form — and no backslash can survive in it, because `prompts.dir`
   itself refuses backslashes at load from this PRD on (FR-2's strictness clause).
   This defines only how the CHECK reports; no file on disk moves, the installer's
   writes are untouched, and the only migration is FR-2's backslash-dir procedure —
   needed by no known accepted repository/default/fixture configuration, while
   external adopter usage is unknowable. The
   classification is **total** over every path it examines:
   - every **planned** path (a member of `generatedPaths()`) gets exactly one of:
     `missing` (absent on disk); `current` (bytes equal the fresh render); `stale`
     (bytes differ, banner parseable, banner version ≠ installed — T2's undelivered
     upgrade); `modified` (bytes differ, banner parseable, banner version = installed —
     a hand edit **or** a config-value change; indistinguishable, and the report says
     so); `unattributable` (bytes differ and no banner is parseable — which includes
     the two **deliberately unbannered** members, the codex snippet and
     `prompts/PLACEHOLDERS.md`, and any file whose banner a human stripped or mangled).
     Per Revision 2: detection still works for the unattributable arm — the fresh
     render is the expected content (`PLACEHOLDERS.md`'s is its packaged source,
     verbatim) — only the stale-versus-modified split is lost;
   **Read-error contract (iteration 8), stated without reintroducing any walk:** a
   planned path whose read fails with `ENOENT` is `missing`; any other read failure
   (permission, a directory where a file was planned, an I/O error) fails the run
   closed, naming the path and the error — never skipped into a class; and a planned
   path that is a symlink is read only if its realpath stays inside the repository's
   canonical containment, else it fails closed naming the escape — one rule per leaf,
   no directory ever listed.
   **And nothing else: this check reads no directory it did not plan** (narrowed by
   owner decision after iteration 5 — three consecutive rounds landed every finding
   in the orphan-walk layer, which `scope-out-the-layer-the-rounds-keep-hitting`
   names a scope error). The primitive touches exactly the planned paths — a
   `readFileSync` per member of `generatedPaths()`, no directory listing, no walk,
   no filesystem contract to specify. **Orphan discovery is not performed, and the
   consequences are stated as the model's limits rather than solved:** a removed
   adapter's surviving file produces no finding (model limit 4 — it keeps working
   until a human deletes it, and T5's adapter-staleness signal still fires through
   the planned set because the CURRENT adapters' bytes embed the old store path); a
   tree renamed away produces no finding (limit 5: no lookup, only a search — and
   this check runs no search); unplanned bannered or unbannered files anywhere
   produce no finding (limit 6). A future item may add bounded content discovery;
   its design owes answers this PRD deliberately does not (symlinks, unreadable
   roots, never-enabled adapters, cost) — recorded in §5 as the follow-up seam. The primitive returns typed findings and writes **nothing** (T7; the T3
   boundary). It is exported through the package's explicit export list — an API-export
   test asserts `import { reconcilePrompts } from 'provegate'` resolves, because
   `core/run/index.ts` re-exports by name and a new symbol does not travel for free.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::reconcilePrompts`,
     `packages/provegate/src/core/run/index.ts`
2. **FR-2**: The recorded local exception — the model's one handed question, answered:
   representation yes, in the adopter's own config, `prompts.exceptions[]`, entries of
   exactly `{ path, reason, owner, expires }`, with the semantics nailed shut:
   - `path` is repo-relative, forward slashes only, and the contract is **rejection,
     not canonicalization**: a backslash anywhere refuses the entry (one contract; no
     normalize-then-compare ambiguity); absolute, home-relative and drive-anchored
     forms, `.` or `..` as any segment, empty segments (repeated or trailing
     separators) and a leading `./` are refused — rules this PRD defines for this
     field, enumerated in its own validator rather than attributed to the existing
     watch-glob rule; the match against findings is byte-exact and case-sensitive
     against the **canonical report spelling FR-1 defines** — which by construction
     contains no backslash, no leading `./` and no empty segment, so the rejection
     rules and the matchable set are provably compatible for every legal
     `prompts.dir` (on a case-insensitive filesystem two spellings are still two
     strings; the entry matches the report's spelling, nothing else);
     duplicates are compared byte-wise after no transformation and refused at load;
   - `reason` and `owner` must be non-empty after trimming; unknown fields are refused;
   - `expires` is a `YYYY-MM-DD` calendar date compared in UTC; the entry is valid
     **through** that date and expired when the run's UTC date is later; a malformed
     date is refused at load. Calendar expiry is a **PRD-owned decision modeled on**
     `known-red-ledger-must-expire`'s lesson (stale, unknown and malformed entries must
     fail) — the record prescribes failure on staleness, not this mechanism; the
     mechanism is this document's own choice, stated as such.
   **And the one strictness addition to an existing key, stated as the behavior
   change it is:** `prompts.dir` itself gains the backslash rejection at config load.
   Today's validator accepts a backslash in the value, raw interpolation carries it
   into every generated path, and no canonical spelling can both name the real
   cross-platform disk destination and stay backslash-free (iteration 4's second
   find). The alternatives — a report spelling that renames a POSIX file containing a
   literal backslash, or an exception contract that admits backslashes — misreport
   the disk or reopen the ambiguity, so the config surface tightens instead: the
   changeset carries the migration procedure (§7; no known accepted repository,
   shipped default or fixture configuration uses an internal backslash, while
   external adopter usage is unknowable — the procedure is stated rather than the
   need denied) and
   `strictness-added-during-extraction-is-a-behavior-change` moves to `applied` for
   exactly this clause.
   **Disabled precedence, decided (iteration 8):** structural and semantic validity
   of `prompts.exceptions[]` is enforced at every config load — a malformed entry
   fails the load whether or not prompts is enabled, because config validity is not
   feature-scoped. Entry EVALUATION (expiry, stale-entry-versus-findings) happens only
   when the check runs enabled: with `prompts.enabled` false there are no findings to
   suppress and no run to fail, so valid, expired and would-be-stale entries alike are
   inert — present, validated, unevaluated — and the FR-3 disabled note does not
   mention them. §6 and the fixture matrix state this same rule.
   A valid, unexpired entry suppresses the `modified` finding for its exact path and
   reports `excepted (expires <date>)`. It suppresses **nothing else**: `stale`,
   `missing` and `unattributable` are never exceptable — an unattributable
   divergence might be an undelivered upgrade, and suppressing it would hide T2. An
   entry whose path is not currently `modified` is a stale entry and fails the run. No
   entry ever authorizes a write (the model's boundary). The config surface is typed in
   `types.ts`, structurally validated in `validate.ts` (the spec learns an
   array-of-record shape), and semantically validated in `load.ts` beside the config's
   existing semantic checks.
   - **Targets:** `packages/provegate/src/core/config/types.ts`,
     `packages/provegate/src/core/config/validate.ts`,
     `packages/provegate/src/core/config/load.ts`,
     `packages/provegate/src/core/config/defaults.ts`
3. **FR-3**: The command surface: `gate check --prompts` (the `--wiring` precedent),
   wrapping FR-1 + FR-2 through the shared evaluator (FR-5). **Output contract,
   decided:** one line per finding that is not `current`, plus exactly one summary line
   naming every count (`N current, M excepted, K stale, …`); `current` paths are
   otherwise silent; exit 0 iff nothing falls outside `current`/`excepted`. The `stale`
   section is the upgrade view: installed version vs banner version per file, and the
   model's T2 remedy printed verbatim — the adopter deletes the printed reinstall unit
   and re-runs `gate init --prompts`; the command performs neither step (constraint 2).
   Fail-closed rules: `prompts.enabled` false → exit 0 with a note whose text is a
   **named production surface, tested verbatim** (iteration 3): it names what was not
   exercised — the planned-set reconciliation — and carries T6's two
   adopter consequences, one sentence each: clear `templates.prd` in the same change
   that removes the block, and the generated files remain on disk, readable by
   agents, until a human deletes them. T6's content-search capability still exists
   and a silent pass must not imply nothing is discoverable; enabled with the store directory absent →
   non-zero naming the directory (`false-green-on-missing-file`; T6: absence under an
   enabled config is a finding, not not-configured).
   **Restatement sweep over the shipped surfaces this PRD already targets
   (iteration 8):** the PRD-029-era prose claims "no reconciliation exists / nothing
   detects staleness" in `storeReadme()`'s rendered README, the `gate init --prompts`
   printed output, `practices/NEXT_STEPS.md`, the `prompts.ts` module comment, the CLI
   help text and the `runCheck` usage line. This PRD makes those claims false, and
   `a-rule-corrected-survives-where-it-is-restated` applies to shipped prose exactly
   as to rules: every one of those sentences is updated to name `gate check
   --prompts` as the detector while preserving the true halves — the install stays
   one-way, and nothing repairs or syncs automatically. Production-surface tests
   assert the shipped texts: the rendered README and the help output must mention the
   check, and must not claim nothing detects staleness.
   - **Targets:** `packages/provegate/src/cli.ts`
4. **FR-4**: Wiring, layer one — this repository. `scripts/verify/verify-prompts.mjs`
   invokes the built CLI (`node packages/provegate/dist/cli.js check --prompts`);
   registered as `verify:prompts` in root `package.json`; a member of
   `verify:workflow`'s CHECKS; a step in the CI hygiene job — **and the hygiene job
   gains `pnpm --filter provegate build` before the aggregate step**, because that job
   installs without building today and a clean checkout would fail on a missing `dist`
   (the workflow's own comments already put built-CLI checks after a build). The order
   is asserted mechanically by the script's own `--assert-ci-order` mode — it parses
   `ci.yml`, isolates the **hygiene job's own step list** (never a whole-file index
   search, which a build step in a different job would satisfy), and fails unless that
   job runs the provegate build before its aggregate step — because the §11 command
   grammar (rightly) refuses inline comparison operators. Runs outside turbo
   (`turbo-cache-masks-out-of-input-reads`). Until PRD-032 flips this repository's
   `prompts.enabled`, the check reports the FR-3 disabled note and passes — dormant
   here, live at fresh installs, and the CLI path live for every upgraded adopter
   (§7 → migration).
   - **Targets:** `scripts/verify/verify-prompts.mjs`, `package.json`,
     `scripts/verify/verify-workflow.mjs`, `.github/workflows/ci.yml`
5. **FR-5**: Wiring, layer two — the pack, drift-proofed. The package exports one
   shared evaluator beside the primitive — `evaluatePromptReconciliation(findings)`
   returning the verdict and the report lines — and **both** the CLI and the packed
   `practices/verify/verify-prompts.mjs` consume it through the installed package
   (`two-parsers-wrong-together`: the twin reimplements neither the comparison nor the
   interpretation). The packed script is named in the installer's `PACK_MAP`
   (`shipped-content-needs-a-delivery-gate`), joins the **packed**
   `verify-workflow.mjs` CHECKS, gains a `NEXT_STEPS.md` row, and the drift ledger
   moves by **one new pair** (`verify/verify-prompts.mjs`) **plus reconciliation of
   the changed existing workflow pair** with an updated note; the packed file also
   joins `packages/provegate/test/pack-manifest.json` — the exact-file manifest the
   pack test enforces, where an unlisted new file fails deliberately. A changeset (minor)
   carries the release note **including the existing-adopter migration instruction**
   (§7) — `.changeset/` is claimable now that PRD-025 has landed.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::evaluatePromptReconciliation`,
     `packages/provegate/practices/verify/verify-prompts.mjs`,
     `packages/provegate/practices/verify/verify-workflow.mjs`,
     `packages/provegate/src/core/run/init.ts`,
     `packages/provegate/practices/NEXT_STEPS.md`,
     `packages/provegate/test/pack-manifest.json`,
     `scripts/verify/pack-drift-ledger.json`, `.changeset/prompt-store-reconciliation.md`
6. **FR-6**: The conformance tests — one fixture per class, per exception outcome, and
   per declared limit, the path domain always computed from `generatedPaths()`
   (`derive-the-requirement-from-the-consumer`):
   classes — `current`; `stale`; `modified` by byte edit; `modified` by a
   `prompts.values` change at the same version (derivation note 1, its own case);
   `missing`; the T4 LIMIT pinned — an adapter removed from config with its file
   left produces NO finding (a future discovery item must flip this assertion
   consciously); `unattributable` via a
   stripped banner (detected through the planned set — and its unplanned twin
   produces no finding, the limit-6 pin); `unattributable` via an edited `PLACEHOLDERS.md`; the codex
   snippet edited (`unattributable`) and removed (`missing`);
   limits — a T5 rename fixture with two trees, asserting three things: the new
   store reconciles, the renamed-away tree produces no finding (the limit is the
   assertion), **and the existing Claude/Cursor adapters report as diverged because
   their content embeds the old store path** — T5's adapter-staleness consequence,
   detectable without any search; a T6 fixture with the config block removed and
   bannered files left, asserting the disabled note's **exact production text** — the
   unexercised-reconciliation naming and both T6 consequences — against the CLI's real
   output, never against fixture-local prose;
   exceptions — valid; expiry boundary (an entry expiring **today** passes, yesterday
   fails); duplicate path refused at load; malformed date refused; non-normalized path
   refused; stale entry fails the run;
   command — disabled no-op note; enabled-but-absent store failure; a config whose
   `prompts.dir` contains a backslash asserts the load refusal naming the key (the
   FR-2 strictness clause, proven at the seam a rejection-only entry fixture cannot
   reach); the FR-3 summary
   line's counts; the API-export assertion (FR-1); the migration scenario (§7): a
   PRD-029-era practices tree through the additive installer — the new packed check is
   created, the adopter's existing `verify-workflow.mjs` and `NEXT_STEPS.md` are
   untouched, and the changeset text carries the manual wiring line. FR-3's tests
   invoke the real CLI entry on a real tree, and the packed-twin test executes the
   `.mjs` as a module (`fixture-must-reach-production-shape`); every suppression
   assertion first proves the underlying finding with the entry removed
   (`assert-absent-needs-an-independent-cause`).
   - **Targets:** `packages/provegate/test/prompts-integrity.test.ts`

## 5. Non-Goals (Out of Scope)

- **Defining the state transitions.** PRD-030 owns the model; this PRD consumes it.
- **Creating the store.** PRD-029, Ship Verified.
- **Editing method content.** No file under `packages/provegate/prompts/` — PRD-031's surface.
- **This repository adopting a store.** PRD-032, which needs this check to exist first.
- **Migrating repositories that installed the pack before PRD-029.** They have no store, so
  there is nothing to reconcile.
- **Orphan / content discovery — cut by owner decision after iteration 5.** Three
  consecutive readiness rounds landed every finding in the walk layer's operational
  contract (symlinks, unreadable roots, never-enabled adapters, cost bounds), which
  `scope-out-the-layer-the-rounds-keep-hitting` names a scope error. This check reads
  only planned paths; the model's limits 4-6 are pinned as behaviour (fixtures assert
  NO finding). A future item owning bounded content discovery inherits the walk-contract
  questions this PRD refused, with the iteration 2-5 readiness reports as its design
  input.
- **A remote or shared ledger.** Local files only; nothing here reaches the network.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a store byte-identical to a fresh render, **When** `gate check --prompts`
  runs, **Then** the summary line reports every planned path as `current`, no per-path
  line is printed, and the exit code is 0 — per-path lines exist only for findings
  outside `current`.
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
  **When** the check runs, **Then** the file produces NO finding — the T4 limit
  pinned as behaviour: this check performs no orphan discovery, and the surviving
  file's invisibility is the recorded consequence, not an oversight.
- **Given** an edited codex snippet or an edited `prompts/PLACEHOLDERS.md`, **When**
  the check runs, **Then** the path reports `unattributable` — detected by bytes
  against the fresh render, with no stale-versus-modified claim; byte-identical copies
  of both report `current`.
- **Given** a planned file whose banner was stripped and whose bytes were edited,
  **When** the check runs, **Then** it reports `unattributable` through the planned
  set — and the same file, made unplanned, produces no finding (the limit-6 pin:
  no content discovery exists to see it).
- **Given** a store renamed with the config updated, **When** the check runs,
  **Then** the new store reconciles, the abandoned
  tree produces no finding (the declared limit-5 restatement, asserted so a future
  wider search must flip it consciously) — **and the existing Claude/Cursor adapters
  report as diverged**, because their content embeds the old store path: T5's
  adapter-staleness consequence, visible without any search.
- **Given** `prompts.enabled` false with bannered files left on disk, **When** the
  check runs, **Then** its note carries the exact T6 text — the unexercised
  reconciliation and both adopter consequences — asserted verbatim against the CLI
  output; and in this disabled configuration the files left on disk produce no
  finding — the limits-4-6 pin for the unplanned/disabled case, not a claim about
  enabled planned paths, which the classification criteria above own.
- **Given** a valid unexpired `prompts.exceptions[]` entry for a `modified` path,
  **When** the check runs, **Then** that path reports `excepted (expires <date>)` and
  does not fail the run — and a write is never performed on its behalf.
- **Given** an entry whose `expires` is today's UTC date, **When** the check runs,
  **Then** it still suppresses; **Given** yesterday's date, **Then** the run fails
  naming the entry and its expiry.
- **Given** an entry naming a path that is not `modified`, a duplicate path, a
  malformed date, or a non-normalized path, **When** the config loads or the check
  runs, **Then** the failure names the entry and the exact rule it broke.
- **Given** `prompts.enabled` false with `prompts.exceptions[]` present, **When** the
  config loads and the check runs, **Then** a malformed entry still fails the load,
  while valid, expired and would-be-stale entries are inert — validated, unevaluated,
  unmentioned by the note (the disabled-precedence rule).
- **Given** the rendered store README and the CLI help after this PRD, **When** read,
  **Then** each names `gate check --prompts` as the staleness detector and neither
  claims nothing detects it — while still stating the install is one-way and nothing
  repairs automatically.
- **Given** `prompts.enabled` false, **When** the check runs, **Then** it exits 0 with
  a note naming what was not exercised — the planned-set reconciliation — and
  carrying the T6 consequences; never a bare silence. (Any generated files left on
  disk produce no finding in this configuration: the recorded limit, not an
  oversight.)
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
rather than concurrent, and PRD-029 has landed. PRD-025 has landed too, freeing
`.changeset/`. PRD-030 claims only documents; PRD-031 touches method content and is
disjoint. Re-run `gate queue` before Phase 3 rather than trusting this paragraph.

### Existing-adopter migration

The installer is additive-only (`wx`): an upgrade delivers the NEW packed
`verify-prompts.mjs` (its path does not exist yet) but can never edit an adopter's
existing `verify-workflow.mjs` or `NEXT_STEPS.md` — so for a repository that installed
the PRD-029-era practices pack, the bundle membership does **not** propagate. Two
honest consequences, both specified rather than hoped:

- the **CLI path is live immediately on package upgrade** — `gate check --prompts`
  ships in the package, needs no practices file, and is the surface an existing
  adopter actually has on day one;
- the **bundle wiring is manual for them, in three explicit steps the release note
  carries verbatim**: (1) upgrade the package; (2) run `gate init --practices` — the
  additive installer is what CREATES the new `verify-prompts.mjs` in their tree, since
  upgrading a package alone writes nothing into a repository; (3) add
  `verify-prompts.mjs` to the CHECKS array of their `verify-workflow.mjs` copy. The
  FR-6 migration fixture proves the full sequence: a pre-034 practices tree, package
  upgraded, installer run (new file created, existing files untouched), and the
  changeset text asserted to contain all three steps. Nothing is overwritten, nothing
  is deleted, and nothing pretends the bundle updated itself.

### Rollback and ordering

Ordering constraints, stated because the config and the package version move
independently:

- **The backslash-dir migration, executable order** (FR-2's strictness clause; the
  changeset carries these steps verbatim): (1) pick the new backslash-free directory
  name and, on POSIX where the old spelling is a literal filename, `git mv` the store
  directory to it (on Windows the same value already named the forward-slash-equivalent
  path — only the config spelling changes); (2) edit `prompts.dir` to the new value
  — **and in the same config edit, update `templates.prd` wherever it points beneath
  the old store spelling** (the model's T6 consequence applied to a rename: leaving
  it stale makes `gate new` read a path that no longer exists);
  (3) delete every generated file whose CONTENT embeds `prompts.dir` and re-run
  `gate init --prompts` — that set comes from `renderAdapters()`, not from memory:
  every `.claude/commands/prd-<phase>.md` (one per phase; each embeds the store path
  in its body), `.cursor/rules/prd-workflow.mdc` (the table), and the codex snippet
  `<dir>/AGENTS.md.provegate.snippet` (the table again, and the file itself moves
  with the directory) — the additive installer rewrites none of them in place. A
  §11-mapped fixture proves the changeset carries this procedure verbatim, that the
  migrated generated set reconciles clean afterwards, and that the production
  template resolver (`gate new`'s read of `templates.prd`) resolves against the moved
  template rather than the abandoned spelling. Blast-radius evidence is scoped to what is measurable: this
  repository's config and every shipped default and fixture are backslash-free; an
  adopter population cannot be enumerated, so the changeset states the procedure
  rather than asserting nobody needs it.
- **Upgrade before excepting:** `prompts.exceptions` is an unknown key to every
  pre-034 validator, so the package upgrade lands before any exception entry is
  written; an adopter who writes the entry first gets a config refusal naming the key.
- **Un-except before downgrading:** symmetrically, a downgrade below this PRD's
  version must be preceded by removing the **entire `prompts.exceptions` key** — an
  empty array is still an unknown key to the old validator, so entries-only removal
  is not enough.
- **Un-wire before downgrading:** a packed `verify-prompts.mjs` imports the exported
  primitive; downgrading the package below the export makes that check fail loudly at
  import. The release note states the order: remove the CHECKS member, the packed file,
  and — for a repository whose fresh install also registered it — the
  `verify:prompts` package-script entry, before downgrading. Pack installation never
  deletes, so the cleanup is the adopter's, named rather than implied.
- **This repository:** the implementation lands so that reverting it unwinds the
  runner, the `verify:prompts` registration, the CHECKS membership, the CI build+step
  pair, and both ledger movements together — whether one commit or a small stack, the
  tree between adjacent commits never holds a registered check without its script or
  a script without registration (the PRD-035 atomicity rule applied to the sequence,
  not to an assumed commit count). The config here carries no exceptions until PRD-032, so no config
  ordering applies locally.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/run/prompts.ts` — `reconcilePrompts` +
      `evaluatePromptReconciliation` (FR-1, FR-5)
- [ ] `packages/provegate/src/core/run/index.ts` — both symbols join the explicit
      export list (FR-1)
- [ ] `.changeset/prompt-store-reconciliation.md` — minor release note carrying the
      existing-adopter migration instruction (FR-5)
- [ ] `packages/provegate/src/core/config/defaults.ts` + `types.ts` + `validate.ts` +
      `load.ts` — `prompts.exceptions[]` type, structural spec and semantic validation
      (FR-2); the contract lives in the adopter's config, so no new schema file is
      needed and `schemas/` stays out of scope
- [ ] `packages/provegate/src/cli.ts` — `gate check --prompts` (FR-3)
- [ ] `scripts/verify/verify-prompts.mjs` + `package.json` + `scripts/verify/verify-workflow.mjs`
      + `.github/workflows/ci.yml` — layer-one wiring (FR-4)
- [ ] `packages/provegate/practices/verify/verify-prompts.mjs` + packed `verify-workflow.mjs`
      + `core/run/init.ts` PACK_MAP + `NEXT_STEPS.md` + the drift ledger +
      `packages/provegate/test/pack-manifest.json` (the exact-file manifest gains the new
      packed path or the pack test fails deliberately) — layer-two wiring (FR-5)
- [ ] `packages/provegate/test/prompts-integrity.test.ts` — the fixture matrix (FR-6)

---

## 9. Open Questions

- (none)

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
  `packages/provegate/src/core/run/prompts.ts`. Two domains, kept distinct so the record
  is applied precisely: the check's entire path domain is computed from
  `generatedPaths()` — what the consumer reads, never a catalogue or a walk. After the
  iteration-5 narrowing there is no second domain: orphan discovery is not performed,
  and the record is what forbids re-adding it as a casual directory walk later (FR-1).
- applied: `known-red-ledger-must-expire` — any recorded local exception is an
  acknowledged-failure allowlist and must fail on stale, unknown or malformed entries, or
  it becomes a permanent bypass. The record prescribes that failure; the **calendar
  expiry mechanism** (`expires`, UTC date, valid through the named day) is this PRD's own
  design decision modeled on the lesson, not something the record mandates (FR-2 states
  it as such).
- applied: `gate-wire-or-delete` — the wiring FR exists because of it: a registered check with
  no executing surface and an on-disk check with no registration fail the audit in opposite
  directions.
- applied: `false-green-on-missing-file` — a check that reads a rendered store must exit
  non-zero when the store is absent, not report nothing to check.
- applied: `strictness-added-during-extraction-is-a-behavior-change` — its watch covers
  `packages/provegate/src/core/run/**`, and FR-2's `prompts.dir` backslash rejection IS
  this record's subject: an existing key gets stricter, named as a behavior change with
  its changeset migration procedure and the measurable statement (no known accepted
  repository/default/fixture configuration uses an internal backslash; external
  adopter usage is unknowable), never slipped in as a bugfix. Also binding on whichever verb the upgrade path uses.
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
- reviewed: `adr-section-blank-line-reads-empty` — close-time watch fire: the merge diff
  appends a classification row and rationale to ADR-0004 (the gate-demanded registration
  for the new verify script). The edit was written by hand, `pnpm format` was not run
  over `_brain/adr/**` (the record's live hazard), and `verify:brain` plus
  `verify:memory-corpus` are green on the result.
- reviewed: `free-text-field-is-the-unread-drift-ledger` — close-time watch fire: the
  merge diff appends the PRD-034 acceptance entry to `_state/acceptances.json`. The
  entry uses the enumerated ADR-0003 fields (`owner`, `authorship`, `items` naming the
  exact review-artifact path); no rule was parked in the free-text `reason` beside the
  enumerated fields.
- applied: `docs-are-a-wiring-surface` — close-time watch fire on
  `practices/NEXT_STEPS.md` and both packed verify files: the NEXT_STEPS row telling an
  adopter to register `verify:prompts` IS wiring and was treated as such — added
  together with the PACK_MAP entry, the packed CHECKS member and the pack-manifest row,
  never as prose alone.
- applied: `recompute-beats-recorded-state` — close-time watch fire: this PRD's own
  Memory Output watches `core/run/prompts.ts`, which the diff that creates the record
  also changes (the 025-precedent newborn-watch case). The record's rule IS FR-1's
  design — the check recomputes and stores nothing; the banner version is the one
  recorded provenance, doing the attribution job recomputation cannot.

---

## Memory Outputs

- learning: `_brain/learnings/recompute-beats-recorded-state.md` — when an artifact is a
  pure function of known inputs, a reconciliation check recomputes it rather than trusting
  recorded state. This design keeps no stored hash and no receipt (the model's T7); the
  only recorded provenance is the banner's **version**, and that is what does the one job
  recomputation cannot — splitting a package-caused difference (`stale`) from a
  same-version one (`modified`). Relocated from PRD-030 when that item narrowed to the
  state model; reworded at iterations 2–3, which caught the original stored-hash phrasing
  contradicting the no-receipt decision the FRs implement.

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `packages/provegate/src/core/run/prompts.ts`
- `packages/provegate/src/core/run/index.ts`
- `packages/provegate/src/core/run/init.ts`
- `packages/provegate/src/core/config/defaults.ts`
- `packages/provegate/src/core/config/types.ts`
- `packages/provegate/src/core/config/validate.ts`
- `packages/provegate/src/core/config/load.ts`
- `.changeset/prompt-store-reconciliation.md`
- `packages/provegate/src/cli.ts`
- `packages/provegate/practices/verify/verify-prompts.mjs`
- `packages/provegate/practices/verify/verify-workflow.mjs`
- `packages/provegate/practices/NEXT_STEPS.md`
- `packages/provegate/test/pack-manifest.json`
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

- `_brain/learnings/recompute-beats-recorded-state.md` — recompute rather than trust recorded state; the banner version (the only stored provenance — no hash, no receipt) does the attribution job recomputation cannot
- `_brain/INDEX.md` — one pointer line for the record above, per the memory protocol
- `_docs/reviews/review-034-prompt-store-reconciliation.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

Each FR row scopes to its own test name rather than a shared whole-file command —
readiness iteration 1 on PRD-030 found five FRs sharing one exit code, which leaves
Phase 5 unable to report which requirement failed.

| FR   | Command / Check                                                                 | Scope | Notes                                                                                     |
| ---- | -------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------- |
| FR-1 | `pnpm --filter provegate test test/prompts-integrity.test.ts -t classification`   | pkg   | total five-class arm over planned paths only; the same-version values-change case; the three limit pins (T4 removed-adapter, T5 rename, stripped-unplanned) |
| FR-1 | `pnpm --filter provegate test test/prompts-integrity.test.ts -t api-export`       | pkg   | `reconcilePrompts` and `evaluatePromptReconciliation` import from the package root         |
| FR-2 | `pnpm --filter provegate test test/prompts-integrity.test.ts -t exception`        | pkg   | valid / expiry-boundary / duplicate / malformed date / non-normalized path / stale entry / backslash-dir load refusal; suppression scoped to `modified` only |
| FR-3 | `pnpm --filter provegate test test/prompts-integrity.test.ts -t command`          | pkg   | summary-line counts, per-path lines only for findings, disabled note names the unexercised planned-set reconciliation + T6 consequences verbatim, enabled-but-absent failure, T2 remedy text, disabled-exception inertness, restatement-sweep surface assertions (README + help), read-error contract fixtures |
| FR-4 | `pnpm verify:prompts`                                                             | repo  | dormant note + exit 0 here until PRD-032 enables; executes the built CLI                   |
| FR-4 | `pnpm verify:workflow`                                                            | repo  | the bundle executes the new member; wire-or-delete sees the surface                        |
| FR-4 | `pnpm verify:prompts -- --assert-ci-order`                                        | repo  | the script's second mode reads `ci.yml` and exits non-zero unless the provegate build step precedes the aggregate — the order is asserted by an allowlisted command, not by prose |
| FR-5 | `pnpm --filter provegate test test/prompts-integrity.test.ts -t packed`           | pkg   | packed twin executes as a module and consumes the exported primitive + evaluator — never a second implementation |
| FR-5 | `pnpm verify:pack-drift`                                                          | repo  | one new pair (`verify-prompts.mjs`) + the changed workflow pair reconciled, notes updated  |
| FR-6 | `pnpm --filter provegate test test/prompts-integrity.test.ts`                     | pkg   | the whole fixture matrix: the migration scenarios (adopter three-step; backslash-dir procedure with the full renderAdapters()-derived delete set and a clean post-migration reconcile), the three limit pins, and both Revision-2 cases |

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
| 2026-07-28 | orchestrating session (non-scorer), ninth pass | **Iteration-8 seams applied (7.8; the seven prior pieces held).** Disabled-exception precedence DECIDED: structural/semantic validity enforced at every config load (config validity is not feature-scoped), evaluation only on an enabled run — disabled entries are present, validated, unevaluated, unmentioned. The read-error contract stated without any walk: ENOENT→missing, every other read failure fails closed naming path and error, leaf symlinks read only inside canonical containment. And the restatement sweep the scorer demanded: the PRD-029-era "nothing detects staleness" prose in storeReadme, init output, NEXT_STEPS, the module comment, CLI help and runCheck usage is updated to name `gate check --prompts` while preserving the true one-way/no-auto-repair halves, held by production-surface tests over the rendered README and help output. §6 and §11 restate all three. |
| 2026-07-28 | orchestrating session (non-scorer), eighth pass | **Iteration-7 residues applied (7.7).** The §6 disabled-case pin scoped to its configuration; §11's FR-3 row says exactly what the note says; FR-1's surviving "empty backslash-dir set" replaced by the measurable form. The real catch landed: the backslash migration's step 2 now updates `templates.prd` in the same config edit (the model's T6 consequence applied to the rename), and the migration fixture exercises the production template resolver against the moved template, not just a clean reconcile. |
| 2026-07-28 | orchestrating session (non-scorer), seventh pass | **Iteration-6 sweep pieces applied (7.6 — the narrowing accepted; findings moved from design to sweep completeness).** Five stale walk-era sentences replaced in live sections (§2 metric now planned-path-scoped with limits named; §4's derivation header; §6's walked-domain, bannered-orphan-search and disabled-tail wordings; §11's FR-3 note alignment). The backslash migration's delete set is now derived from `renderAdapters()` rather than remembered wrongly as "two adapters" — every claude phase file, the cursor rule and the codex snippet embed the dir — with a §11-mapped fixture proving the changeset text and a clean post-migration reconcile. Every empty-blast-radius phrase replaced by the measurable form: no known accepted config uses an internal backslash; external adopter usage is unknowable; the procedure is stated rather than the need denied. |
| 2026-07-28 | owner decision + orchestrating session, sixth pass | **Narrowed radically after iteration 5 (7.5; trajectory flat at 7.4/7.6/7.5 with every round in the walk layer — the owner chose option (a) per `scope-out-the-layer-the-rounds-keep-hitting` and the PRD-025 precedent).** Orphan/content discovery is CUT: the primitive reads exactly the planned paths (one readFileSync per `generatedPaths()` member — no listing, no walk, no filesystem contract), the `orphaned` class is gone, and the model's limits 4-6 are pinned as fixtures asserting NO finding (T4 removed-adapter file, T5 renamed-away tree, unplanned stripped/bannered files). T5's adapter-staleness signal survives through the planned set. The two small iteration-5 pieces landed with it: the backslash-dir migration gains its executable three-step order in §7 and the changeset (git mv on POSIX, config edit, delete + re-init the two adapters whose content embeds the old spelling; blast-radius claims scoped to measurable configs), and User Story 2 narrows to the actual guarantee (never overwritten, reported on upgrade, rebased by hand). A future discovery item inherits the walk-contract questions with iterations 2-5 as design input (§5). |
| 2026-07-28 | orchestrating session (non-scorer), fifth pass | **Iteration-4 seams closed (7.6 ITERATE; three pieces confirmed genuinely closed).** The walk domain now includes the two fixed adapter roots UNCONDITIONALLY — deriving them from live membership would have made T4's removed-adapter orphan undiscoverable exactly when it matters; the store side stays planned-dirname-derived so the `.` bound holds. And the backslash seam is closed at the config surface: `prompts.dir` refuses backslashes at load — this PRD's one strictness addition to an existing key, stated as a behavior change with its changeset migration line and an empty measured blast radius (the feature shipped this week), with `strictness-added-during-extraction-is-a-behavior-change` moved to `applied`; the canonical-spelling claim is now conditioned on it, and a backslash-dir fixture proves the refusal at the seam an entry fixture cannot reach. |
| 2026-07-28 | orchestrating session (non-scorer), fourth pass | **Iteration-3 findings applied (7.4 ITERATE), with a confession the scorer forced:** two iteration-2 closures this changelog previously claimed were never applied — the remediation script died on a mismatch and the retry dropped the Memory Output T7 rewrite and the pack-manifest Scope/Surface sweep while the row still said "applied" (`a-rule-corrected-survives-where-it-is-restated`, operating on the remediation itself; every chunk in this pass wrote and verified per-edit). Now actually landed: the Memory Output and Durable Artifact reworded to banner-version attribution; `pack-manifest.json` in §8 and the Conflict Surface. New decisions closing iteration 3's real find: **findings report one canonical POSIX spelling** (primitive normalizes the joined path; report-format only, nothing on disk moves) so the rejection-only exception contract is provably compatible with every legal `prompts.dir` incl. `.`; the orphan **walk domain is exact** — the dirname set of `generatedPaths()` plus each directory's immediate entries, nothing else — and FR-1's orphan claim is scoped to it; T6's consequences bound to the FR-3 note as a verbatim-tested production surface, restated in §6 with the T5 adapter-staleness criterion. |
| 2026-07-28 | orchestrating session (non-scorer), third pass | **Iteration-2 findings applied (7.3 ITERATE — six precision pieces, five prior closures confirmed).** T5 fixture now asserts the adapter-staleness consequence (embedded old store path reports diverged) and T6 guidance repeats the model's two consequences. The orphan walk gains its bounded contract (no symlink follow, canonical containment, unreadable-entry failure, `.`-safe bound). The exception path contract becomes rejection-only (backslash refuses; dot/empty segments enumerated in this PRD's own validator; byte-exact case-sensitive match against the spelling `generatedPaths()` produces). `pack-manifest.json` joins FR-5 everywhere it must. The migration instruction becomes three verbatim steps incl. `gate init --practices` as the file-creating action, proven by the fixture and the release-note assertion. Rollback: the whole `prompts.exceptions` key removed before downgrade, the fresh-adopter script entry named, atomicity restated over the sequence not a commit count, the CI-order assertion scoped to the hygiene job's own step list. The Memory Output reworded from stored-hash to banner-version attribution — iteration 2 caught the phrasing contradicting T7. |
| 2026-07-28 | orchestrating session, on owner direction | **§4 re-derived (second pass) against state-model Revision 2 and the iteration-1 score's eleven missing pieces.** Classification made total (five arms; `unattributable` absorbs the two deliberately unbannered paths and stripped banners — detection by bytes survives, only attribution is lost, per Revision 2). T5/T6 claims replaced by asserted limits (rename fixture asserts NON-discovery; the disabled note names the unexercised search). FR-2 gains the full semantic contract (UTC calendar expiry through the named day, normalization, duplicates, non-empty fields) and its real targets (`types.ts`, `validate.ts`). FR-3's output contract decided: findings-only lines + one summary. FR-4 adds the CI build-before-aggregate step with a mechanical order check. FR-5 adds the shared evaluator (interpretation cannot drift), corrects the ledger claim to one-new-pair-plus-one-changed, and carries the changeset with the existing-adopter migration instruction — §7 gains the migration and rollback/ordering sections the infra class demands. Memory wording fixed (planned domain vs orphan search; calendar expiry as PRD-owned decision). Intro's "no FRs yet" block retired with the history stated. |
| 2026-07-28 | orchestrating session, on owner direction | **§4 derived in one pass from the owner-approved state model** (acceptance PRD-030 items 4.1 T1–T7 + 4.3, recorded this morning) and its two derivation notes (byte-based detection; banner-stripped files share the codex-snippet hole). Six FRs: the recomputing primitive with a seven-class report, the `prompts.exceptions[]` config contract (T3's handed question answered: representation yes, in the adopter's config, suppression-only, expiring), `gate check --prompts` with the T2 upgrade view, and wiring in both layers with the pack twin calling the same primitive. §6 and §11 written with the FRs as the parent items required; §8 and the Conflict Surface fixed to the real paths (`schemas/` out, config pair + `init.ts` + both workflow bundles + ledger in); `gate-run-resume-after-archive` disposition added for the new `core/run/**` watch overlap. |
| 2026-07-28 | owner  | **Created by the narrowing of PRD-030** (readiness iteration 1, W1, owner option (a)). Carries the reconciliation check, its command surface and its wiring; PRD-030 keeps the state model those are written against. Goals and the conflict surface are carried over; every mechanism statement from the retracted design was deleted rather than inherited, and §4 is blocked on the model by construction. The Memory Output `recompute-beats-recorded-state` relocates here from PRD-030, and the two memory records whose watches cover `core/run/init.ts` and `core/run/prompts.ts` — undeclared in PRD-030 and the cause of its lint failure — are declared here as `applied`, where the code they watch is actually touched. |
