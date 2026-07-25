# PRD-023: Gate Self-Hosting — One Implementation per Method Rule

> **Status**: Approved
>
> **Created**: 2026-07-25
> **Updated**: 2026-07-25
> **Author**: Cursor, for owner review
> **Audience**: Implementing Agent
> **Slug**: `gate-self-hosting`
> **Cycle Phase**: 2 (Readiness)
> **PRD Class**: infra
> **Class Rationale**: This moves existing checks between surfaces and deletes their
> duplicates; no application behavior and no new user-facing feature.
> **Autonomous Close**: operator-gated
> **Value**: 4.25 (MF/UI/TL/AR/RM: 5/4/4/5/3)

<!-- 0.25*5 + 0.25*4 + 0.20*4 + 0.15*5 + 0.15*3 = 4.25. Draft self-score by the author;
     the independent readiness round owns the real number. -->

---

## 1. Introduction / Overview

Three rules about the method's own artifacts are implemented **twice** in this repository
— once inside `packages/provegate`, once as a `scripts/verify/` script — and in all three
cases the package copy is the stronger one while the script copy is the one CI runs.

| Rule | Package implementation | Script implementation |
| ---- | ---------------------- | --------------------- |
| Independent-review schema | `core/gates/review.ts` (161 lines): verdict, `Critical: 0` contract, `N/M pass` quorum arithmetic against the 3/5 panel gate, a guard so `0 forged` cannot satisfy the contract | `verify-review-artifact.mjs` (34 lines): verdict and critical only |
| Durable artifacts | `core/run/durable.ts` + `chain.ts`: declared paths must appear in the merge diff | `verify-durable-artifacts.mjs` (60 lines): the same rule, a different parser |
| Wire-or-delete | `core/gates/wiring.ts` (212 lines): manifest→script existence **and** script→executing-surface, with shrink-only exceptions | `verify-gates-wired.mjs` (75 lines): one direction of the same audit, plus one the package lacks |

The two durable-artifact parsers have **already diverged**: the package drops a claimed
path containing no `/`, the script does not; the script ignores `*`, the package does not.
That is the same defect class as the `declaredGlobs` bug PRD-021 FR-13 exists to fix —
found once, in one copy, while the other copy kept its own version of the rule.

The cause is structural, not accidental. This repo dogfoods the CLI's **lifecycle**
(`gate open`, `gate run`, `gate land` are how PRDs are claimed and closed) but not its
**gate policy**: `gate` appears in no `package.json` script, no CI step, and no git hook,
so every gate we build for adopters gets a second, weaker implementation for ourselves.

This PRD states the rule that decides where a check lives, applies it to the three
duplicates, and adds the mechanism that makes a fourth one fail at the gate.

It also makes the launch narrative true. The extraction roadmap's first principle is
*"every milestone, replace that slice of the internal scripts with the OSS package —
the strongest proof of the OSS is that we build with it"*. That principle has never been
enforced, which is why the duplicates accumulated; after this PRD, CI runs `gate`.

---

## 2. Goals

### Primary Goals

- [ ] Record the rule that decides whether a check belongs to the package or the repo.
- [ ] Leave exactly one implementation of each of the three duplicated method rules.
- [ ] Keep every guarantee that exists today, including the corpus-wide sweeps the
      scripts perform and the one audit direction the package currently lacks.
- [ ] Make a future duplicate fail mechanically rather than pass review.
- [ ] Put `gate` on an executing surface of this repository.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Method rules with two implementations | 3 | 0 | the class ledger |
| Parsers of the Durable Artifacts section | 2 (divergent) | 1 | the script is deleted |
| Audit directions lost by deleting the scripts | n/a | 0 | on-disk→registered lands in `auditWiring` |
| Repo surfaces that invoke `gate` | 0 | at least 1 CI step | CI workflow text |
| A new method rule added only to `scripts/verify/` | passes | fails | the class ledger fixture |
| Ledger classifications disagreeing with ADR-0002 | n/a | 0 | the ledger-vs-ADR check |
| Lint checks matching a whole line where a part is meant | 2 | 0 | FR-7 fixtures |

---

## 3. User Stories

#### User Story 1

```
As an adopter of provegate,
I want the review, durable-artifact, and wiring gates that this repo relies on,
so that I get the method the repo demonstrates rather than a subset of it.
```

**Acceptance Criteria:**

- [ ] Each of the three rules is reachable from the CLI in both modes it is used in
      today: per-PRD at close, and as a corpus sweep.
- [ ] No behavior this repo relies on is lost when the scripts are deleted.

#### User Story 2

```
As a maintainer adding a new workflow check,
I want the repo to refuse a method rule written as a repo script,
so that the split cannot silently reappear.
```

**Acceptance Criteria:**

- [ ] A `scripts/verify/` script with no class entry fails the check.
- [ ] A script classed as a method rule whose superseding CLI surface already exists
      fails until the script is deleted.

#### User Story 3

```
As someone evaluating provegate from the outside,
I want the repo's own CI to run the tool,
so that "we build with it" is verifiable rather than asserted.
```

**Acceptance Criteria:**

- [ ] At least one CI step invokes the built CLI, and `verify:gates-wired` sees it.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1 — Bind the ledger to the ADR, which is a precondition rather than a
   deliverable.** `_brain/adr/ADR-0002-method-rule-vs-repo-rule.md` lands on `main` ahead
   of this PRD (owner decision of 2026-07-25: the rule must bind PRD-018 through PRD-023,
   and a decision that ships with the last PRD in the wave binds none of them). It states
   the deciding question and both answers: a check governs the **method's** artifacts
   (PRDs, readiness, tasks, review records, `_brain` records, the status board, the
   manifest) → `packages/provegate`, because every adopter needs it; a check governs
   **this repository's** stack (turbo cache keys, pnpm workspace test tasks, the Next
   build's egress, the practices-pack hash ledger, dependency advisories) →
   `scripts/verify/`.

   What this PRD owns is the **mechanical link**: FR-6's ledger must classify every script
   exactly as the ADR does, and the check fails when the two disagree. An ADR whose
   classification no repository artifact is compared against is a document, not a rule —
   which is the failure mode PRD-021 exists to correct, and it must not be reproduced by
   the PRD that cites it.

   **If the ADR is absent at Phase 4 time the precondition was violated — stop rather
   than write it here**, exactly as PRD-021 FR-4 treats the root config file. Two PRDs
   each landing a different first version of one decision is worse than a blocked start.
   - **Targets:** `scripts/verify/script-classes.json`,
     `packages/provegate/test/wiring.test.ts`
2. **FR-2 — Review-artifact rule: one implementation, both modes.** `core/gates/review.ts`
   already holds the stronger rule but is reachable only per-PRD, from `chain.ts` during a
   close. Add a corpus sweep, `gate check --review-artifacts`, beside the existing
   `--wiring` branch in `runCheck`: it validates every record under the configured reviews
   directory with `validateReviewArtifactFile` and reports one line per invalid file. Then
   delete `scripts/verify/verify-review-artifact.mjs` and its `package.json` entry.

   The sweep is what makes the deletion safe: the script's value was never its rule (which
   is weaker) but its **scope** — it checks every review record in the repo, not only the
   one belonging to the PRD being closed. Deleting it without the sweep would trade a weak
   check for no check.
   - **Targets:** `packages/provegate/src/cli.ts::runCheck`,
     `packages/provegate/src/core/gates/review.ts`,
     `scripts/verify/verify-review-artifact.mjs` (deleted),
     `package.json`,
     `packages/provegate/test/self-hosting.test.ts` (new)
3. **FR-3 — Durable-artifacts rule: one parser.** The script's **close mode** duplicates
   what `chain.ts` already enforces via `durableArtifactsOk`; its **lint mode** (every wip
   PRD declares a `## Durable Artifacts` section holding paths or an explicit `none`) has
   no package equivalent. Add that lint to `lintPrd`, so `gate check PRD-NNN` enforces
   declaration at the phase where a missing declaration should stop the work, and expose
   it corpus-wide through the FR-2 sweep flag. Then delete
   `scripts/verify/verify-durable-artifacts.mjs` and its `package.json` entry.

   **The two parsers disagree today and the merged one must pick deliberately.** The
   package's    `declaredArtifacts` drops any backticked value without a `/` and any value
   containing `{` or `}`; the script ignores values containing `{`, `}`, or `*` and has no
   `/` rule. Keep the package behavior for path extraction, and adopt the script's `*`
   exclusion, because an unfilled template placeholder may be a glob.

   **The `/` rule is replaced by PRD-021 FR-13's predicate** (owner decision of
   2026-07-25, §9 Q2) — the same literal named-file and dotfile test that PRD already
   specifies for Conflict Surface claims. One predicate for two sections, which is this
   PRD's thesis applied to itself. Measured against every Durable Artifacts section in the
   corpus it classifies all eleven slash-less tokens correctly: it accepts the two real
   claims the current rule silently drops (`workflow.config.json` in PRD-001,
   `RELEASING.md` in PRD-005) and still rejects the nine prose tokens (`status`, `queue`,
   `run`, `land`, `check`, `gate new`, `--worktree`, `lucide-react`, `commands`), each on
   a stated ground — no dot, or whitespace. **No wip PRD is affected**, so the Phase 7
   gate gets stricter with zero effect on the in-flight wave. Those eleven tokens are the
   fixture.
   - **Targets:** `packages/provegate/src/core/run/durable.ts::declaredArtifacts`,
     `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`,
     `packages/provegate/src/cli.ts::runCheck`,
     `scripts/verify/verify-durable-artifacts.mjs` (deleted),
     `package.json`,
     `packages/provegate/test/self-hosting.test.ts`
4. **FR-4 — Wire-or-delete: close the missing direction before deleting the script.**
   `auditWiring` audits manifest→script existence and script→executing-surface.
   `verify-gates-wired.mjs` audits script→executing-surface **and a third direction the
   package does not have**: every `scripts/verify/verify-*.mjs` on disk must be registered
   in `package.json`. Deleting the script without porting that direction would let an
   unregistered script sit on disk unnoticed — the exact silence the meta-gate exists to
   prevent. Add the on-disk→registered direction to `auditWiring`, driven by config rather
   than a hardcoded path, then delete `scripts/verify/verify-gates-wired.mjs` and its
   `package.json` entry. `gates-wired-exceptions.json` moves with the rule and stays
   shrink-only.
   - **Targets:** `packages/provegate/src/core/gates/wiring.ts::auditWiring`,
     `packages/provegate/src/core/config/types.ts`,
     `scripts/verify/verify-gates-wired.mjs` (deleted),
     `scripts/verify/gates-wired-exceptions.json`,
     `package.json`,
     `packages/provegate/test/wiring.test.ts`
5. **FR-5 — Root manifest and CI run the CLI.** PRD-018 creates the root
   `gates.manifest.json` naming `verify:workflow` as one Phase 4 command. Replace that
   single bundle entry with the checks it wraps, so a check that later moves into the
   package changes one manifest line and nothing else. Add a CI step that runs the built
   CLI's sweep after `pnpm build`, making it the first `gate` invocation on an automated
   surface of this repository.

   **`verify:workflow` survives** (owner decision of 2026-07-25, §9 Q1) as the local
   no-build bundle. Folding it into the manifest would put a build on the local pre-push
   path for the sake of one entrypoint, and the bundle is not yet a clean repo-class set
   anyway: after this PRD's three deletions it holds six checks, and **two of them are
   still method rules** — `verify-brain` (see FR-6) and `verify-deferred` (§5). Deleting
   the bundle is the right end state and the wrong next step; FR-6's pending entries are
   what make it reachable rather than aspirational.
   - **Targets:** `gates.manifest.json`, `.github/workflows/ci.yml`, `package.json`,
     `scripts/verify/verify-workflow.mjs`
6. **FR-6 — Make the next duplicate fail at a gate, not at review.** Add
   `scripts/verify/script-classes.json`: one entry per `scripts/verify/verify-*.mjs`,
   each declaring `class` as `repo` or `method`. A `method` entry names the CLI surface
   that supersedes it and **fails while the script still exists** — that is the state this
   PRD is clearing. An unclassified script fails. A classified script that no longer exists
   fails as stale, so the ledger shrinks with the work (the known-red-ledger lesson).

   **Two entries need a third state**, `method-pending`, and both must carry an owner and
   a `reviewBy` date that the check fails on when it passes — a pending entry that never
   expires is how a stated intention becomes a permanent exemption.

   - `verify-deferred.mjs` enforces the STATUS deferral policy (owner, due date, one
     renewal, cap 15). That is a **method** rule with **no** package implementation at
     all — a gap, not a duplicate, and closing it is not this PRD's job (§5).
   - `verify-brain.mjs` becomes a duplicate **during** this wave, not before it: PRD-017
     FR-3 builds the package record parser (`core/memory/parse.ts`) while FR-4 hardens the
     standalone verifier to the same schema, with one checked-in corpus deliberately run
     against **both parser implementations**. The owner decided on 2026-07-25 to let
     PRD-017 ship as designed — it is in flight under lease at the head of the chain,
     and a shared fixture corpus is a materially stronger pin than the printed-value
     comparison PRD-021 just discarded. So this is a duplicate the project accepts with
     its eyes open, recorded with a date rather than argued away. The pack's copy
     (`practices/verify/verify-brain.mjs`) is the reason it is not trivially deletable,
     and the ADR should say whether a shipped pack script may be a thin CLI wrapper.
   - **Targets:** `scripts/verify/script-classes.json` (new),
     `packages/provegate/src/core/gates/wiring.ts`,
     `packages/provegate/test/wiring.test.ts`
7. **FR-7 — Fix two lint false-negatives of the same shape.** Both match a whole line
   where they must match a part of it, and both were found by this PRD's own drafting.

   **(a) The §11 parser reads the Notes column as commands.**
   `parseVerificationCommands` iterates every backtick span on an `| FR-N` row, so a
   backticked word in the Scope or Notes cell becomes a gate command — an allowlisted one
   silently joins the gate, a non-allowlisted one fails the lint for prose. Scope
   extraction to the **Command column** (the second cell). Splitting the row on `|` is
   safe by contract: the PRD template already forbids a pipe inside a backticked command
   in this table, so the constraint that makes the fix sound is one the artifact already
   carries. `_brain/learnings/notes-column-runs-commands.md` predicted this exactly and
   ends with "fix it in the parser"; its interim guidance is retired in the same change,
   because a learning that outlives its fix is the drift PRD-021 is about.

   **(b) The Open Questions check drops any bullet containing "deferred".**
   `lintPrd` filters `/\(none\b|deferred/i`, so a genuine unresolved question is invisible
   to the gate whenever it merely *mentions* the word — measured on this PRD's own draft,
   which listed three questions and was reported as two, because one names
   `verify-deferred`. Require what the template already states — "every entry explicitly
   deferred **with a link**" — so the exemption needs a deferral target (a link or a
   `PRD-NNN` id), not a substring.

   Both fixes make the gate **stricter**, so each needs a corpus pass before it lands: a
   §11 Notes cell that currently supplies a real command, or an open question that
   currently hides behind the word, becomes a new failure. Report any such case rather
   than editing it silently.
   - **Targets:** `packages/provegate/src/core/gates/safety.ts::parseVerificationCommands`,
     `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`,
     `_brain/learnings/notes-column-runs-commands.md`,
     `packages/provegate/test/self-hosting.test.ts`

---

## 5. Non-Goals (Out of Scope)

- **Porting `verify-deferred` into the package.** It is a real gap — an adopter gets no
  deferral-policy enforcement — but it is new behavior rather than the consolidation this
  PRD performs, and it needs its own decisions about where the board lives for a repo
  whose status file is not `STATUS.md`. FR-6 classes it `method-pending` with an expiring
  date so it cannot be forgotten; the follow-on is a separate candidate.
- Reclassifying or relocating any `repo`-class script: `verify-turbo-inputs`,
  `verify-test-task-coverage`, `verify-dependency-audit`, `verify-pack-drift`,
  `check-egress`, and (per PRD-021) `verify-doc-claims` all stay where they are.
- Changing what any of the three rules **decides**, beyond the one parser reconciliation
  FR-3 states and resolves. This is a relocation, not a retune.
- Replacing the whole CI job list with `gate run`. FR-5 adds one invocation; making the
  runner the sole CI entrypoint is a larger change that should follow evidence that the
  first one is stable.
- Updating `apps/docs/content/docs/method.mdx`. Three PRDs in this wave already claim it
  (018, 020, 022) and a fourth claim buys a conflict for a paragraph. The ADR carries the
  rule; the docs page follows in a later PRD.
- Any change to lease semantics, the memory contract, the value-score gate, or push policy.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a review record whose verdict is `pass` with `Critical: 2`, **When** the
  corpus sweep runs, **Then** it exits non-zero naming that file — the guarantee the
  deleted script provided.
- **Given** a wip PRD with no Durable Artifacts section, **When** `gate check PRD-NNN`
  runs, **Then** it fails, and **when** the sweep runs, **Then** it names that PRD.
- **Given** a `scripts/verify/verify-new.mjs` on disk that is not registered in
  `package.json`, **When** the wiring audit runs, **Then** it fails — the direction that
  would otherwise have been lost with the deleted script.
- **Given** a new script with no entry in the class ledger, **When** the audit runs,
  **Then** it fails.
- **Given** a ledger entry classed as a method rule whose CLI surface exists while the
  script also still exists, **When** the audit runs, **Then** it fails.
- **Given** a ledger entry whose `reviewBy` date has passed, **When** the audit runs,
  **Then** it fails as expired.
- **Given** the three scripts are deleted, **When** the full verification floor runs,
  **Then** it is green and no `package.json` entry references a missing file.

---

## 7. Technical Considerations

### Architecture

- **Two modes, one rule.** Every relocation here has the same shape, and it is the shape
  PRD-021 established for the value-score gate: the rule lives in one function, the
  per-PRD path calls it during `gate check` or the close chain, and a `gate check --<x>`
  flag sweeps the corpus. The scripts being deleted were never a second *rule* worth
  keeping — they were a second *scope*, and the flag is that scope.
- **Delete last.** Each FR ports the missing capability before removing the script, so no
  commit in the sequence has a coverage hole. FR-4 is the sharpest case: the on-disk audit
  direction must exist in `auditWiring` before `verify-gates-wired.mjs` goes away.
- **The ledger is the durable part.** Consolidating three duplicates is worth doing once;
  the ledger is what stops a fourth. Without FR-6 this PRD is a cleanup that decays.
- **Precedent, not invention.** `gate check --wiring` already proves the sweep-flag shape,
  `pack-drift-ledger.json` and `known-red-verifies.json` already prove the ledger shape,
  and `verify-dependency-audit` already proves a CI-only check. Nothing here is new
  machinery.

### Dependencies

- **ADR-0002 committed on `main`** — a precondition, not a work item (FR-1). It is written
  once the PRD-017 lease releases `_brain/**`, ahead of PRD-018, so the rule binds the
  whole wave rather than arriving behind it.
- **PRD-018 Ship Verified** — it creates `gates.manifest.json`, which FR-5 edits, and it
  claims `_brain/**`, which FR-7(a) touches.
- **PRD-019 Ship Verified** — `packages/provegate/src/cli.ts`.
- **PRD-021 Ship Verified** — the largest coupling. It adds the `--value-score` branch to
  the same `runCheck`, edits `verify-workflow.mjs` and `gates-wired-exceptions.json`, and
  its FR-13 changes `declaredGlobs`, which FR-3's parser reconciliation must be written
  against rather than around.
- **PRD-022 Ship Verified** — `packages/provegate/src/cli.ts` again.
- This PRD therefore runs **last** in the wave: 017 → 018 → 019 → 021 → 020 → 022 → 023.
- No new runtime dependencies; `packages/provegate` stays at zero.

### Rollback

- Restore the three scripts from git history and re-add their `package.json` entries. The
  package-side additions are additive and inert if unreferenced, so they may stay. The
  manifest edit in FR-5 reverts to the single bundle entry. No state or artifact migration
  exists.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/cli.ts` — the sweep branches in `runCheck`
- [ ] `packages/provegate/src/core/gates/review.ts`, `wiring.ts`, `prd-ready.ts`,
      `safety.ts`
- [ ] `packages/provegate/src/core/run/durable.ts` — the reconciled parser
- [ ] `scripts/verify/script-classes.json` (new), matched against ADR-0002
- [ ] `_brain/learnings/notes-column-runs-commands.md` — retire the interim guidance
- [ ] Deletions: `verify-review-artifact.mjs`, `verify-durable-artifacts.mjs`,
      `verify-gates-wired.mjs`, and their `package.json` entries
- [ ] `gates.manifest.json`, `.github/workflows/ci.yml`, `scripts/verify/verify-workflow.mjs`
- [ ] `packages/provegate/test/self-hosting.test.ts` (new), `test/wiring.test.ts`

---

## 9. Open Questions

(none) — all three resolved by owner on 2026-07-25.

**Q1 resolved — `verify:workflow` survives**, as the local no-build bundle. Folding it
into the manifest would put a build on the local pre-push path, and the remaining set is
not yet clean anyway: two of the six checks left after this PRD are still method rules
(FR-5).

**Q2 resolved — a Durable Artifacts entry accepts a root-level filename**, using PRD-021
FR-13's predicate rather than a second one. The corpus measurement is in FR-3: eleven
slash-less tokens, all eleven classified correctly, no wip PRD affected.

**Q3 resolved — the pending entries are owner-held with a `reviewBy` of 2026-10-01**, and
there are two of them, not one: `verify-deferred` and `verify-brain` (FR-6). The date is
deliberately the same as the standing memory-metrics deferral already on the board, so
one review pass covers the workflow's outstanding intentions rather than three scattered
dates. The check fails when it passes, so renewal is a decision, not a default.

**Owner decision recorded here because no FR carries it:** PRD-017 ships as designed,
with two record-parser implementations pinned by a shared corpus. This PRD does not
reopen it; FR-6 records it with a date.

---

## 10. References

- The three duplicated pairs, measured 2026-07-25: `core/gates/review.ts` (161) vs
  `verify-review-artifact.mjs` (34); `core/run/durable.ts` (46) vs
  `verify-durable-artifacts.mjs` (60); `core/gates/wiring.ts` (212) vs
  `verify-gates-wired.mjs` (75)
- `_brain/learnings/gate-wire-or-delete.md` — the meta-gate this PRD extends
- `_brain/learnings/known-red-ledger-must-expire.md` — binds FR-6's pending state
- `_brain/learnings/false-green-on-missing-file.md` — binds every deletion in this PRD
- PRD-021 — establishes the method-rule-in-the-package precedent for the value-score gate
- `docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md` §0.1 — the
  dogfood principle this PRD finally enforces

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `packages/provegate/src/cli.ts`
- `packages/provegate/src/core/gates/review.ts`
- `packages/provegate/src/core/gates/wiring.ts`
- `packages/provegate/src/core/gates/prd-ready.ts`
- `packages/provegate/src/core/gates/safety.ts`
- `packages/provegate/src/core/run/durable.ts`
- `packages/provegate/src/core/config/types.ts`
- `packages/provegate/test/self-hosting.test.ts`
- `packages/provegate/test/wiring.test.ts`
- `scripts/verify/verify-review-artifact.mjs`
- `scripts/verify/verify-durable-artifacts.mjs`
- `scripts/verify/verify-gates-wired.mjs`
- `scripts/verify/gates-wired-exceptions.json`
- `scripts/verify/script-classes.json`
- `scripts/verify/verify-workflow.mjs`
- `gates.manifest.json`
- `.github/workflows/ci.yml`
- `_brain/learnings/notes-column-runs-commands.md`

**Every path above is contested, and sequencing is the only resolution.** `cli.ts` is
claimed by PRD-019, PRD-021, and PRD-022; `prd-ready.ts` by PRD-018 and PRD-021;
`durable.ts` by PRD-018; `verify-workflow.mjs` and `gates-wired-exceptions.json` by
PRD-021; `gates.manifest.json` by PRD-018; `_brain/**` by PRD-017 and PRD-018. This PRD
runs last precisely so that every one of those is Ship Verified first. Claiming them
exclusively is what makes an ordering mistake refuse instead of merge. **Run `gate queue`
before claiming** — a PRD's own overlap list is not evidence.

`core/gates/safety.ts` is the one path here **no other PRD claims** — the §11 parser has
been untouched through the whole wave, which is part of why its defect survived.

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Review artifact: `_docs/reviews/review-023-gate-self-hosting.md`
- Learning: `_brain/learnings/notes-column-runs-commands.md` — FR-7(a) retires this
  record's interim guidance once the parser is scoped to the Command column; the record
  is edited, not deleted, so the trap stays discoverable
- Decision: `none` — ADR-0002 lands ahead of this PRD as a precondition (FR-1), so it
  cannot also be this PRD's output. The close is measured against the two paths above.

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                              | Scope | Notes |
| ---- | -------------------------------------------------------------- | ----- | ----- |
| FR-1 | `pnpm --filter provegate test test/wiring.test.ts`              | pkg   | the ledger disagreeing with ADR-0002 fails; a missing ADR stops the start |
| FR-2 | `pnpm --filter provegate test test/self-hosting.test.ts`        | pkg   | the sweep fails a pass-with-criticals record; the script is gone |
| FR-3 | `pnpm --filter provegate test test/self-hosting.test.ts`        | pkg   | declaration lint per PRD and corpus-wide; one parser, reconciled |
| FR-4 | `pnpm --filter provegate test test/wiring.test.ts`              | pkg   | an unregistered on-disk script fails the audit |
| FR-5 | `pnpm verify:gates-wired`                                       | repo  | replaced by the CLI audit; every manifest command resolves |
| FR-6 | `pnpm --filter provegate test test/wiring.test.ts`              | pkg   | unclassified, superseded-but-present, stale, and expired entries all fail |
| FR-7 | `pnpm --filter provegate test test/self-hosting.test.ts`        | pkg   | a Notes-column backtick is not a command; an open question mentioning the word is still counted |
| FR-7 | `pnpm verify:workflow`                                          | repo  | the stricter lints pass over the live corpus |

The FR-5 row runs the built CLI, so `pnpm build` must precede it; the root `pnpm test`
already depends on `build` through turbo, and the floor below runs both.

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm verify:workflow` — the remaining bundle is green

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/wiring.test.ts` — an unclassified script and an
  unregistered on-disk script must each fail; a ledger that only passes on good input is
  not evidence.
- Contract test: n/a — no client→server payload ships.

Before Phase 2 PASS, run: `gate check PRD-023`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT delete a script before its capability exists in the package. Every deletion in
  this PRD is the second half of a pair, never the first.
- DO NOT assume the two implementations of a rule agree. They do not — FR-3 names the
  exact parser divergence, and the merged behavior is a decision to record, not a default
  to inherit.
- DO NOT drop the on-disk→registered audit direction while deleting the script that is
  its only implementation.
- DO NOT let a `method-pending` ledger entry omit an owner or a `reviewBy` date, and DO
  NOT extend a date instead of doing the work — a pending state that renews forever is
  the exemption it was written to avoid.
- DO NOT reclassify a `repo`-class script into the package to make the ledger tidier;
  the rule is whose artifacts the check governs, not how generic the code looks.
- DO NOT retune what any relocated rule decides under cover of moving it.
- DO NOT claim the repo now runs on its own runner; FR-5 adds one CI invocation, and the
  remaining bundle is explicitly still a second surface.
- DO NOT write ADR-0002 inside this PRD. It is a precondition; if it is absent, stop.
- DO NOT let FR-7's stricter lints land without a corpus pass. Each one turns a silent
  pass into a failure, and an existing PRD may be relying on the old behavior — report
  such a case rather than quietly editing the artifact to fit the new rule.
- DO NOT fix the Open Questions filter by deleting the `deferred` exemption outright; the
  template promises a deferral-with-a-link escape and removing it would break PRDs that
  legitimately use it.
- DO NOT delete `notes-column-runs-commands.md` when its hazard is fixed; edit it, so the
  trap and its resolution stay discoverable together.
- DO NOT claim PRD-023 while any PRD-018, 019, 021, or 022 lease is active.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-25 | Cursor | Initial draft. Scoped out of the duplication analysis of 2026-07-25: three method rules are implemented twice, the package copy is stronger in all three, and the script copy is the one CI runs. Created with `gate new`. Three open questions for the owner |
| 2026-07-25 | Cursor, on owner direction | All three open questions resolved, and the resolutions changed the shape of the PRD rather than just filling blanks. **Q2** is answered by measurement, not preference: PRD-021 FR-13's predicate classifies all eleven slash-less Durable Artifacts tokens in the corpus correctly and affects no wip PRD, so FR-3 reuses that predicate instead of inventing a second one. **Q1** keeps `verify:workflow`, and FR-5 now says *why* the end state is not yet reachable — two of the six remaining checks are method rules. **Q3** puts both pending entries on 2026-10-01, and there are two: the owner also decided PRD-017 ships as designed, so `verify-brain` becomes an accepted duplicate recorded with a date rather than a defect. **FR-1 inverts**: ADR-0002 lands ahead of the wave as a precondition, because a decision shipping with the last PRD binds none of them — so this PRD owns the mechanical ledger-vs-ADR link instead of the document. **FR-7 is new**: the two lint false-negatives found while drafting, both a whole-line match where a scoped one is meant |
