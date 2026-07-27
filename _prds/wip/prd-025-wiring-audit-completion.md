# PRD-025: Wiring Audit Completion — The Meta-Gate That Makes a Fourth Duplicate Fail

> **Status**: Draft
>
> **Created**: 2026-07-27
> **Updated**: 2026-07-27
> **Author**: Claude Opus 5, for owner review
> **Audience**: Implementing Agent
> **Slug**: `wiring-audit-completion`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: Workflow tooling. It adds public config keys (`wiring.*`) and
> strengthens a shipped gate, so it is user-facing enough to need a changeset, but it adds
> no CLI command, no flag, and no behavior outside the wiring audit. Not `feature` because
> no new user-facing capability ships — an existing audit stops being partial.
> **Autonomous Close**: operator-gated
> **Value**: 3.75 (MF/UI/TL/AR/RM: 5/3/5/2/3)

<!-- 0.25*5 + 0.25*3 + 0.20*5 + 0.15*2 + 0.15*3
     = 1.25 + 0.75 + 1.00 + 0.30 + 0.45 = 3.75 -->

---

## 1. Introduction / Overview

Split from PRD-023 on owner direction, 2026-07-27. This is the middle piece: **the audit
and the ledger must be complete before anything is deleted**, because the scripts PRD-026
removes are currently the only implementation of guarantees the package does not have.

`auditWiring` is the package's wire-or-delete meta-gate.
`scripts/verify/verify-gates-wired.mjs` is this repository's weaker copy of it — except in
four respects, where the script is the stronger one. Measured 2026-07-27:

| Capability | `verify-gates-wired.mjs` | `auditWiring` |
| ---------- | ------------------------ | ------------- |
| manifest → script existence | no | **yes** |
| registered → wired | yes | yes |
| **on-disk → registered** | **yes** | no |
| CI workflow files | whole file, comments stripped | `run:` text only |
| **the git-hooks directory** | **yes** — hardcoded `.githooks/` | no |
| **the bundle's membership** | **yes** — hardcoded path | no |
| **non-verify `package.json` script bodies** | **yes** | no |
| how a surface matches a check | script name **or** `.mjs` basename, plain substring (`verify-gates-wired.mjs:49-52`) | a package-manager invocation resolved to a script name, and nothing else (`wiring.ts:229-236`) |

**Measured impact of the four gaps today is zero.** No `.githooks/` file references a
`verify:` script and every current check has its own CI step. That is exactly why deleting
the script without porting them would pass review unnoticed and surface later as a check
that was wired all along. A guarantee with no current occupant is still a guarantee.

Alongside the audit, this PRD lands the durable half: a **class ledger** that decides where
a check belongs and fails when a new one is written on the wrong side. Consolidating
duplicates is worth doing once; the ledger is what stops a fourth. Without it the whole
PRD-023 wave is a cleanup that decays.

**What this PRD deliberately does not do: delete anything.** Every deletion — root scripts,
packed twins, `PACK_MAP` entries, the exceptions file — is PRD-026, in one commit, because
`verify:pack-drift` pairs the two sides and a one-sided deletion is red in either
direction. This PRD's job is to make those deletions safe.

---

## 2. Goals

### Primary Goals

- [ ] Close every gap between `auditWiring` and the script it will replace: the missing
      direction, the three missing surfaces, and the matching rule that reads them.
- [ ] Specify the matching rule as a **closed grammar**, not an open-ended list. An earlier
      revision of this work said "an executing interpreter (`node`, `bun`, `tsx`, …)" and
      an independent review correctly called that unfalsifiable.
- [ ] Take the two hardcoded paths the script carries into config, because this is shipped
      package code and `.githooks/` is one repository's choice.
- [ ] Land a class ledger that fails on an unclassified script, a stale entry, an expired
      pending entry, and a ledger that disagrees with the governing decision record.
- [ ] Leave every deletion to PRD-026, with the audit already stronger than what goes away.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Audit directions `auditWiring` lacks | 1 (on-disk to registered) | 0 | FR-2 fixture |
| Executing-surface kinds `auditWiring` lacks | 3 (hooks, bundle membership, sibling script bodies) | 0 | FR-3 fixtures |
| Invocation forms the audit recognizes | 1 (package-manager only) | 3 (manager, interpreter plus path, bundle membership) | FR-4 fixtures |
| Interpreter names accepted by the matching rule | undefined — an earlier draft ended the list with an ellipsis | a closed literal list, extended only by code change plus a test | FR-4, the list is in source and in the deny matrix |
| Hardcoded repo paths in shipped audit code | 2 (the hooks directory, the bundle path) | 0 | FR-3 config keys plus validation fixtures |
| A new method rule added only under the scripts directory | passes | fails | FR-5 ledger fixture |
| Ledger classifications disagreeing with the decision record | n/a | 0 | FR-1 comparison |

---

## 3. User Stories

#### User Story 1

```
As a maintainer who wired a check through a git hook and nothing else,
I want the wiring audit to see it,
so that "wired nowhere" means unwired rather than unrecognized.
```

**Acceptance Criteria:**

- [ ] A check invoked only from a hook, only from the bundle's membership list, or only
      from another `package.json` script's body registers as wired.
- [ ] A check merely named in a string that nothing executes does not.

#### User Story 2

```
As a maintainer adding a new workflow check,
I want the repo to refuse a method rule written as a repo script,
so that the duplication PRD-023 found cannot silently reappear.
```

**Acceptance Criteria:**

- [ ] A script under the configured scripts directory with no ledger entry fails.
- [ ] A ledger entry whose script no longer exists fails as stale.
- [ ] A pending entry past its review date fails as expired.

#### User Story 3

```
As an adopter whose repo uses a different hooks directory or none at all,
I want the audit's paths to come from my config,
so that a shipped gate does not assume this repository's layout.
```

**Acceptance Criteria:**

- [ ] `wiring.scriptsDir`, `wiring.hooksDir`, and `wiring.bundlePath` are configurable,
      repo-relative, and validated.
- [ ] A configured directory that does not exist is simply not a surface, not an error.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1 — Bind the ledger to the decision record, which is a precondition rather than a
   deliverable.** `_brain/adr/ADR-0002-method-rule-vs-repo-rule.md` lands on the base
   branch **ahead of this PRD** (owner decision of 2026-07-25). It states the deciding
   question and both answers: a check governing the **method's** artifacts (PRDs,
   readiness, tasks, review records, memory records, the status board, the manifest)
   belongs in `packages/provegate`, because every adopter needs it; a check governing
   **this repository's** stack (turbo cache keys, workspace test tasks, the web build's
   egress, the pack hash ledger, dependency advisories) belongs under the scripts
   directory.

   What this PRD owns is the **mechanical link**: FR-5's ledger must classify every script
   exactly as the record does, and the check fails when the two disagree. A decision
   record whose classification no artifact is compared against is a document, not a rule.

   **A comparison needs something parseable, so the record's shape is specified here even
   though the record is written elsewhere.** It must carry a table under a
   `## Classification` heading with exactly two columns — `Script` and `Class` — one row
   per verify script, `Class` being `repo`, `method`, or `method-pending`. The check parses
   that table and diffs it against the ledger; a disagreement, a script in one and not the
   other, or an unparseable table each fail. Binding the check to prose would make it a
   check of whatever the parser happened to tolerate.

   **If the record is absent when Phase 4 starts the precondition was violated — stop
   rather than write it here.** Two work items each landing a different first version of
   one decision is worse than a blocked start.
   - **Targets:** `scripts/verify/script-classes.json`,
     `packages/provegate/src/core/gates/wiring.ts::auditWiring`,
     `packages/provegate/test/wiring.test.ts`
2. **FR-2 — Port the missing audit direction: on-disk to registered.** `auditWiring` audits
   manifest-to-script existence and registered-to-wired.
   `verify-gates-wired.mjs` additionally audits **on-disk to registered**: every
   `verify-*.mjs` in the scripts directory must be registered as a `package.json` script.
   Deleting the script without porting that would let an unregistered script sit on disk
   unnoticed — the exact silence the meta-gate exists to prevent.

   Drive the directory from `wiring.scriptsDir` (FR-3), not a hardcoded path, and keep
   `verifyScriptPattern` as the selector so this direction and the existing one agree on
   what a gate script is.
   - **Targets:** `packages/provegate/src/core/gates/wiring.ts::auditWiring`,
     `packages/provegate/test/wiring.test.ts`
3. **FR-3 — Port the three missing surfaces, with their paths in config.** The script
   counts three surfaces `auditWiring` does not: the git-hooks directory, the bundle, and
   every `package.json` script body whose name does **not** match the verify prefix. Port
   all three.

   **The verify-prefix exclusion is load-bearing and must be ported exactly.** Without it,
   checks wire each other: a `verify:a` whose body invokes `verify:b` marks `verify:b`
   wired even when nothing invokes `verify:a`, and a bundle naming every member marks them
   all wired by existing. Use `config.verifyScriptPattern` for the exclusion so it stays
   consistent with the registered-to-wired selector.

   **Keep the CI reading at `run:` text.** That is a deliberate narrowing — a check named
   in a YAML comment is not wired — and it is the one place the package is already
   stricter than the script. It stays, stated rather than silently reconciled.

   **Because this is shipped package code, both hardcoded paths become config.** The
   hooks directory is this repository's choice, set by `package.json`'s `prepare` script;
   an adopter may use a different one, the git default, or none.

   | Key | Type | Default | Meaning |
   | --- | ---- | ------- | ------- |
   | `wiring.scriptsDir` | `string` | `scripts/verify` | directory walked by FR-2's direction |
   | `wiring.hooksDir` | `string` | `.githooks` | git-hooks directory read as a surface |
   | `wiring.bundlePath` | `string` | `scripts/verify/verify-workflow.mjs` | bundle whose membership counts as a surface |

   All three are repo-relative. Semantic validation rejects an absolute path, a path
   escaping the repo root via a parent-directory segment, and a non-string. It does **not**
   require the paths to exist: absence is a legitimate configuration and is defined below
   as "not a surface", never an error.
   - **Targets:** `packages/provegate/src/core/gates/wiring.ts::auditWiring`,
     `packages/provegate/src/core/config/types.ts`,
     `packages/provegate/src/core/config/defaults.ts`,
     `packages/provegate/src/core/config/validate.ts`,
     `packages/provegate/test/wiring.test.ts`,
     `packages/provegate/test/config-wiring.test.ts` (new)
4. **FR-4 — The matching rule, as a closed grammar.** Adding surfaces without changing how
   they are read registers nothing, and specifying the reading loosely is no better. Both
   mistakes were made in PRD-023 and both were caught independently; the resolution is here
   in full.

   **Why new machinery is needed.** `auditWiring`'s `wiredIn` is `wiredScripts.has(script)`
   (`wiring.ts:236`), and `wiredScripts` is built by running each command through
   `packageScriptOf` (`wiring.ts:229-235`), which returns null unless the first token is
   `pnpm`, `npm`, `yarn`, or `bun` (`wiring.ts:130-133`). It is a package-manager command
   resolver. The two new surfaces do not use that form at all: a hook body runs an
   interpreter against a **path**, and the bundle declares a **bare basename**.
   `NON_EXECUTING_FLAGS` cannot simply be reused, because it is defined against
   package-manager grammar, not interpreter grammar.

   **(a) Derive the key.** For each registered script matching `verifyScriptPattern`, take
   the `.mjs` file its `package.json` body invokes, resolved under `wiring.scriptsDir`.
   That basename is the key the two new surfaces are matched against.

   **(b) Command surfaces — hooks and non-verify script bodies — get a command rule.**
   Split the surface into commands as `auditWiring` already does, then for each command:

   1. Strip leading environment wrappers: `env`, and any `NAME=value` assignment.
   2. The head token must be in this **closed literal list**: `node`, `bun`, `deno`,
      `tsx`, `ts-node`. Anything else — `echo`, `cat`, `printf`, a comment marker, a
      package manager — is not an interpreter invocation for this rule. The list lives in
      source as a constant, not in config: an adopter widening their own gate silently is
      the failure this whole PRD is about, and adding an interpreter should cost a code
      change and a test.
   3. Reject known non-executing modes for that interpreter: `--check`, `-e`, `--eval`,
      `-p`, `--print`, `--help`, `-h`, `--version`, `-v`, and `--dry-run`. Their table is
      separate from `NON_EXECUTING_FLAGS`, which stays package-manager-scoped, and lives
      beside it with a comment saying why the two are not merged.
   4. The basename counts only as a **bare positional argument** — not inside a quoted
      string, not attached to a flag with an equals sign. An eval string that mentions the
      file does not wire it.

   **(c) The bundle is data, not a command — read its membership.** Parse the bundle's
   declared member list structurally. Do not grep its body: a bundle is a list of members
   that happens to live in a script, and substring-matching its text is reading the wrong
   thing — `narrow-the-grammar-not-the-parser`. A bundle path that does not exist, or whose
   contents declare no parseable member list, is **not a surface** — the same rule as an
   absent hooks directory. Absence and unparseability are both "no membership declared",
   never an error.

   **The deny matrix is part of the requirement, not an afterthought.** Each of these must
   leave the check unwired, and each has a fixture: a non-verify script body that echoes
   the basename; an interpreter invoked in syntax-check mode against the path; an
   interpreter eval string mentioning the file; the basename inside a YAML comment; the
   basename inside a verify-prefixed script body (the FR-3 exclusion). Each must be paired
   with the positive control on the same shape — a plain interpreter-plus-path invocation
   in a hook, the same behind an environment wrapper, and the bare basename in the bundle's
   member list all **do** wire it. A deny fixture whose input would fail anyway is not
   evidence.
   - **Targets:** `packages/provegate/src/core/gates/wiring.ts::auditWiring`,
     `packages/provegate/test/wiring.test.ts`
5. **FR-5 — The class ledger, so the next duplicate fails at a gate rather than at review.**
   Add `scripts/verify/script-classes.json`: one entry per verify script, each declaring a
   `class`.

   | Class | Meaning | Failure condition |
   | ----- | ------- | ----------------- |
   | `repo` | governs this repository's stack | none; it belongs where it is |
   | `method` | governs the method's artifacts, and its superseding CLI surface exists | **fails while the script still exists** — the state a new duplicate lands in |
   | `method-pending` | a method rule whose replacement does not exist yet | fails when the review date passes; requires an owner and a date |

   An **unclassified** script fails. A classified script that **no longer exists** fails as
   stale, so the ledger shrinks with the work — `known-red-ledger-must-expire`.

   **What this ledger contains at this PRD's close, which the split changes.** The three
   scripts PRD-026 deletes still exist while this PRD is live, and their CLI replacements
   do not exist yet — PRD-026 adds the sweeps. So they are `method-pending`, owner-held,
   with a review date that names PRD-026 as the work that clears them. That is the honest
   classification and it has a useful property: **if PRD-026 never lands, this ledger goes
   red on its own**, which is exactly what a pending state is for. `verify-deferred` and
   `verify-brain` are `method-pending` for their own reasons (see §5 and PRD-023's Decision
   Record), with the standing review date of 2026-10-01. Everything else is `repo`.
   - **Targets:** `scripts/verify/script-classes.json` (new),
     `packages/provegate/src/core/gates/wiring.ts::auditWiring`,
     `packages/provegate/test/wiring.test.ts`
6. **FR-6 — Ship it as a release, because the config surface is public.** Three new config
   keys under `wiring` are an adopter-visible surface even though no command or flag
   changes. Add a changeset declaring a **minor** bump whose note names the three keys with
   their defaults and states that the wiring audit now recognizes hook, bundle, and
   sibling-script surfaces — an adopter whose check was "wired nowhere" may find it wired
   after upgrading, and that is a verdict change worth announcing.

   Evidence is one semantic assertion over a single entry, not independent greps, which are
   satisfied by two different files.
   - **Targets:** `.changeset/` (new entry),
     `packages/provegate/test/changeset-entry.test.ts`

---

## 5. Non-Goals (Out of Scope)

- **Deleting anything.** No root script, no packed twin, no installer map entry, no
  exceptions file. All of it is PRD-026, in one commit, because the pack-drift check pairs
  the two sides. This PRD only makes those deletions safe.
- **The exceptions-store consolidation.** `manifest.wiringExceptions` is already what
  `auditWiring` reads and it already carries the justification the shrink-only policy
  depends on, so nothing is needed here. Removing the redundant root exceptions file
  belongs with the script it serves, in PRD-026, along with the adopter conversion rule for
  the packed copy.
- **Porting the deferral-policy check into the package.** It is a real gap — an adopter
  gets no deferral-policy enforcement — but it is new behavior, not audit completion. FR-5
  classes it `method-pending` with an expiring date so it cannot be forgotten.
- **Reclassifying or relocating any `repo`-class script.** The turbo-inputs, test-task
  coverage, dependency-audit, pack-drift, egress, and doc-claims checks all stay where they
  are.
- **Making the interpreter list configurable.** A closed source-level list is the point: a
  config knob that lets a repository widen its own gate is the failure mode the meta-gate
  exists to prevent.
- **The readiness lint parsers (PRD-024) and the sweep flags, deletions, pack migration, or
  CI changes (PRD-026).**

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a verify script on disk that is not registered in `package.json`, **When** the
  audit runs, **Then** it fails.
- **Given** a check wired only through a hook that invokes an interpreter against the
  script's path, **When** the audit runs, **Then** it is wired.
- **Given** the same invocation behind an environment wrapper, **Then** it is wired —
  wrappers are stripped before the head token is read.
- **Given** a check named only by its bare basename in the bundle's declared member list,
  **Then** it is wired.
- **Given** a check named only in a non-verify script body as the argument of an echo,
  **Then** it is **not** wired.
- **Given** an interpreter invoked in syntax-check mode against the path, and separately an
  eval string mentioning the file, **Then** neither wires it.
- **Given** a check named only inside a YAML comment in a CI workflow, **Then** it is not
  wired — the package reads `run:` text and that narrowing is deliberate.
- **Given** a verify-prefixed script body that names another verify script, **Then** that
  other script is not thereby wired.
- **Given** a configured hooks directory that does not exist, and separately a bundle path
  whose contents declare no parseable member list, **Then** the audit completes with those
  surfaces simply absent, not an error.
- **Given** a configured hooks directory that is absolute or escapes the repo root,
  **When** config resolves, **Then** it fails with a named issue.
- **Given** a verify script with no ledger entry, **Then** the audit fails.
- **Given** a ledger entry naming a script that does not exist, **Then** it fails as stale.
- **Given** a pending entry whose review date has passed, or which omits an owner or a
  date, **Then** it fails.
- **Given** a ledger whose classification of any script differs from the decision record's
  classification table, or a table that is absent or unparseable, **Then** the check fails
  naming the disagreement.

---

## 7. Technical Considerations

### Architecture

- **Complete before delete.** Every capability the deleted script provides must exist in
  the package before PRD-026 removes it. This PRD is that ordering constraint expressed as
  a work item.
- **Surfaces and predicates are two things.** PRD-023 ported a surface set without the
  predicate that reads it, then specified the predicate too loosely to falsify. FR-4 is
  written as a closed grammar with a deny matrix for that reason: an implementer should
  have no freedom left about what counts.
- **Kind decides the rule.** Hooks and script bodies are commands and get a command
  parser. The bundle is data and gets its member list parsed. One rule for both is what
  produced the echo-counts-as-wiring defect.
- **The ledger is the durable part.** The audit fixes today's gaps; the ledger is what
  makes tomorrow's duplicate fail. Without FR-5 this PRD is a cleanup that decays.

### Dependencies

- **The decision record committed on the base branch** — a precondition, not a work item
  (FR-1). Absent at Phase 4 start means stop.
- **PRD-024** — no ordering constraint either way; the two touch disjoint files.
- **PRD-026 depends on this**, not the reverse. Its deletions are unsafe until the audit
  and ledger here are green.
- The three config files overlap PRD-021, which also creates the changeset-entry test.
  Re-run `gate queue` before claiming rather than trusting this paragraph — three overlap
  counts went stale inside a day during the PRD-023 wave.
- No new runtime dependencies; `packages/provegate` stays at zero.

### Rollback

The audit changes are additive: revert `auditWiring`'s new direction, surfaces, and
matching rule, and the audit returns to today's behavior. Remove the three `wiring` config
keys from the types, defaults, and validation modules and delete the ledger file; because
no other code reads them, nothing else changes. Delete the changeset entry, or if it has
already been released, follow it with a patch changeset stating the keys are no longer
read.

**One asymmetry to respect.** The decision record is a precondition, not a deliverable, so
a rollback of this PRD does **not** revert it — the decision stands whether or not its
mechanical comparison ships. Removing the ledger therefore leaves the record unmatched by
any artifact, which is the state FR-1 exists to end. Record that as the cost of the
rollback rather than deleting the record to tidy up.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/gates/wiring.ts::auditWiring` — direction, surfaces,
      matching grammar, ledger check, decision-record comparison
- [ ] `packages/provegate/src/core/config/types.ts`, `defaults.ts`, `validate.ts` — the
      `wiring` keys
- [ ] `scripts/verify/script-classes.json` (new) — the ledger
- [ ] `packages/provegate/test/wiring.test.ts` — fixtures including the full deny matrix
- [ ] `packages/provegate/test/config-wiring.test.ts` (new) — defaults and path validation
- [ ] `.changeset/` entry (minor)

---

## 9. Open Questions

- (none) — the interpreter grammar, the config keys, and the ledger's three states are all
  specified here; the decision record is a precondition rather than a question.

<!-- BULLET LIST, deliberately: PRD-024's FR-3 makes a paragraph-form section a lint
failure. -->

---

## 10. References

- `_brain/learnings/gate-wire-or-delete.md` — the meta-gate this PRD completes
- `_brain/learnings/known-red-ledger-must-expire.md` — binds FR-5's pending state
- `_brain/learnings/narrow-the-grammar-not-the-parser.md` — governs FR-4(c)
- `_readiness/wip/readiness-023-gate-self-hosting.md` sections 8 and 9 — where the matching
  rule was found missing, then found underspecified
- PRD-023 sections 4 and 7 — the requirements this PRD carries forward

---

## Memory Inputs

- applied: `gate-wire-or-delete` — this PRD is that record's mechanism: every registered
  check wired to an executing surface, every on-disk check registered. FR-2 and FR-3 close
  the two halves the package could not see.
- applied: `known-red-ledger-must-expire` — FR-5's pending state carries an owner and a
  review date and fails when the date passes, so a stated intention cannot become a
  permanent exemption.
- applied: `narrow-the-grammar-not-the-parser` — FR-4(c) reads the bundle's declared member
  list instead of grepping its body, because a bundle is data and text-matching it is
  reading the wrong thing.
- applied: `assert-absent-needs-an-independent-cause` — FR-4's deny matrix is the risk
  here: a "does not wire" assertion passes trivially if the fixture would have failed
  anyway. Every deny case is paired with a positive control on the same shape.
- applied: `strictness-added-during-extraction-is-a-behavior-change` — porting the script's
  surfaces into shared package code is exactly this record's shape. The CI narrowing and
  the echo rejection are deliberate strictness, stated in FR-3 and FR-4; if an existing
  test must be edited to pass, the port changed behavior — revert rather than adjust the
  test.
- reviewed: `fixture-must-reach-production-shape` — the wiring fixtures call `auditWiring`
  with the config and manifest its real callers pass, not hand-built arguments.

---

## Memory Outputs

- learning: `_brain/learnings/surface-set-without-its-predicate.md` — that porting the
  inputs of a check without the predicate that reads them registers nothing, and that
  replacing an unsafe predicate with an open-ended one is the same defect wearing a
  stricter costume. Measured twice in one wave, on the same function.

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `packages/provegate/src/core/gates/wiring.ts`
- `packages/provegate/src/core/config/types.ts`
- `packages/provegate/src/core/config/defaults.ts`
- `packages/provegate/src/core/config/validate.ts`
- `packages/provegate/test/wiring.test.ts`
- `packages/provegate/test/config-wiring.test.ts`
- `scripts/verify/script-classes.json`
- `_brain/learnings/surface-set-without-its-predicate.md`
- `.changeset/`

**Contested, measured with `gate queue` on 2026-07-27:** the three config files and the
changeset directory are claimed by PRD-021, which also creates the changeset-entry test.
Serialize behind it. Re-run `gate queue` before claiming.

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Review artifact: `_docs/reviews/review-025-wiring-audit-completion.md`
- Learning: `_brain/learnings/surface-set-without-its-predicate.md` — the Memory Output
  above, repeated here because the two lists are one contract
- Decision: `none` — the governing decision record lands ahead of this PRD as a
  precondition (FR-1), so it cannot also be this PRD's output

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                              | Scope | Notes |
| ---- | ------------------------------------------------------------ | ----- | ----- |
| FR-1 | `pnpm --filter provegate test test/wiring.test.ts`            | pkg   | a ledger disagreeing with the decision record fails; an absent or unparseable classification table fails; a missing record stops the start |
| FR-2 | `pnpm --filter provegate test test/wiring.test.ts`            | pkg   | an unregistered on-disk script fails the audit, with the directory read from config |
| FR-3 | `pnpm --filter provegate test test/wiring.test.ts`            | pkg   | hooks, bundle membership, and sibling script bodies each count as a surface; a YAML comment still does not; a verify-prefixed body wires nothing |
| FR-3 | `pnpm --filter provegate test test/config-wiring.test.ts`     | pkg   | the three defaults resolve, absolute and escaping paths are rejected, and an absent directory is not an error |
| FR-4 | `pnpm --filter provegate test test/wiring.test.ts`            | pkg   | the full deny matrix and its paired positive controls: interpreter plus bare path wires, environment wrapper wires, bundle membership wires, and the echo, syntax-check, eval, and quoted-string forms do not |
| FR-5 | `pnpm --filter provegate test test/wiring.test.ts`            | pkg   | unclassified, stale, expired, and owner-less or date-less pending entries all fail |
| FR-6 | `pnpm --filter provegate test test/changeset-entry.test.ts`   | pkg   | one entry declares a minor bump and names the three config keys and the recognized surfaces |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm verify:gates-wired` — the script this audit will replace still agrees with the
  repository's real wiring while both exist

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/wiring.test.ts` — an unclassified script, an
  unregistered on-disk script, and every row of FR-4's deny matrix must each fail. A ledger
  and a matcher that only pass on good input are not evidence.
- Contract test: n/a — no client-to-server payload ships.

Before Phase 2 PASS, run: `gate check PRD-025`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` plus narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT delete any script, packed file, installer map entry, or exceptions file. Every
  deletion is PRD-026, in one commit. This PRD makes them safe and stops there.
- DO NOT port a surface set without the predicate that reads it. `auditWiring` resolves
  package-manager commands and matches nothing else, so appending hook and bundle text
  registers zero new wiring on its own. This exact mistake was made and independently
  caught in the PRD-023 wave.
- DO NOT leave the interpreter list open-ended. A list ending in an ellipsis is not a rule;
  an implementer cannot falsify it. The list is closed, in source, and extended only by a
  code change with a test.
- DO NOT reuse `NON_EXECUTING_FLAGS` for interpreters. It is defined against
  package-manager grammar. Interpreters get their own table, beside it, with a comment
  saying why they are not merged.
- DO NOT match the basename as raw text across every surface. Command surfaces get the
  command rule; the bundle gets its member list parsed. One rule for both re-creates the
  echo-counts-as-wiring defect one level down.
- DO NOT count verify-prefixed script bodies as surfaces. Without that exclusion a bundle
  listing its own members marks them all wired by existing, and two checks naming each
  other wire themselves.
- DO NOT widen the CI reading from `run:` text to the whole workflow file. The narrower
  reading is correct: a check named in a YAML comment is not wired.
- DO NOT carry the hooks directory or the bundle path into the package as literals. This
  repo sets its hooks path in a `prepare` script; an adopter may use a different one or the
  git default.
- DO NOT treat an absent hooks directory, or a bundle with no parseable member list, as an
  error. Absence is a legitimate configuration and means "not a surface".
- DO NOT let a pending ledger entry omit an owner or a review date, and DO NOT extend a
  date instead of doing the work. A pending state that renews forever is the exemption it
  was written to avoid.
- DO NOT class the three scripts PRD-026 deletes as `method` in this PRD. Their CLI
  replacements do not exist yet, so `method` would be a false statement that reds the gate
  on landing. Use `method-pending`, owner-held, naming PRD-026.
- DO NOT reclassify a `repo`-class script into the package to make the ledger tidier. The
  rule is whose artifacts the check governs, not how generic the code looks.
- DO NOT write the decision record inside this PRD. It is a precondition; if it is absent,
  stop.
- DO NOT ship a deny fixture without its positive control on the same shape. A "does not
  wire" assertion that would have failed anyway is not evidence.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-27 | Claude Opus 5, on owner direction | **Split from PRD-023 (owner decision, 2026-07-27), carrying its FR-1, FR-4 in all its parts, and FR-6.** PRD-023 sat between 6.65 and 7.19 across four independent rounds; the recorded diagnosis was size. Two things change in the carry-over rather than being copied. **FR-4 gets a closed grammar**: iteration 6 found that PRD-023's open-ended interpreter list "reusing the existing non-executing-flag discipline" was unfalsifiable — that discipline is package-manager-scoped and there is no interpreter parser to reuse — so the interpreter list is now closed and in source, environment wrappers and non-executing modes are enumerated, positional-only matching is required, and the deny matrix is part of the requirement. **FR-5's ledger classification changes because of the split**: the three scripts being deleted are `method-pending` here, not `method`, because their CLI replacements arrive with PRD-026 — which has the useful property that this ledger goes red on its own if PRD-026 never lands. The exceptions-store consolidation and every deletion move to PRD-026. Created with `gate new` |
