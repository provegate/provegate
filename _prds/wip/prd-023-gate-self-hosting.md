# PRD-023: Gate Self-Hosting — One Implementation per Method Rule

> **Status**: Draft
>
> **Created**: 2026-07-25
> **Updated**: 2026-07-25
> **Author**: Cursor, for owner review
> **Audience**: Implementing Agent
> **Slug**: `gate-self-hosting`
> **Cycle Phase**: 1 (PRD Generation)
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

1. **FR-1 — Record the rule as an ADR.** `_brain/adr/ADR-0002-method-rule-vs-repo-rule.md`
   states the deciding question and both answers: a check governs the **method's**
   artifacts (PRDs, readiness, tasks, review records, `_brain` records, the status board,
   the manifest) → it belongs in `packages/provegate`, because every adopter needs it; a
   check governs **this repository's** stack (turbo cache keys, pnpm workspace test tasks,
   the Next build's egress, the practices-pack hash ledger, dependency advisories) → it
   belongs in `scripts/verify/`. The ADR names the current classification of every script
   so the ledger in FR-6 has an owner-approved source, and records the three duplicates as
   the evidence that motivated it.
   - **Targets:** `_brain/adr/ADR-0002-method-rule-vs-repo-rule.md` (new),
     `_brain/INDEX.md`
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
   package's `declaredArtifacts` drops any backticked value without a `/` and any value
   containing `{` or `}`; the script ignores values containing `{`, `}`, or `*` and has no
   `/` rule. Keep the package behavior for path extraction, and adopt the script's `*`
   exclusion, because an unfilled template placeholder may be a glob. The `/` rule is the
   riskier half — after PRD-021 FR-13 a root-level filename is a legitimate claim
   elsewhere in the system, so a `Durable Artifacts` entry naming `STATUS.md` is currently
   dropped. Resolve it as an explicit decision, not as an inherited default (§9 Q2).
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
   surface of this repository. `verify:workflow` survives as the local no-build bundle
   for the repo-class scripts that remain.
   - **Targets:** `gates.manifest.json`, `.github/workflows/ci.yml`, `package.json`,
     `scripts/verify/verify-workflow.mjs`
6. **FR-6 — Make the next duplicate fail at a gate, not at review.** Add
   `scripts/verify/script-classes.json`: one entry per `scripts/verify/verify-*.mjs`,
   each declaring `class` as `repo` or `method`. A `method` entry names the CLI surface
   that supersedes it and **fails while the script still exists** — that is the state this
   PRD is clearing. An unclassified script fails. A classified script that no longer exists
   fails as stale, so the ledger shrinks with the work (the known-red-ledger lesson).

   One entry needs a third state and it is the interesting one: `verify-deferred.mjs`
   enforces the STATUS deferral policy — owner, due date, one renewal, cap 15 — which is a
   **method** rule with **no** package implementation at all. It is a gap, not a duplicate,
   and closing it is not this PRD's job (§5). It is classed `method-pending` with an owner
   and a `reviewBy` date, and the check fails when that date passes. A pending entry that
   never expires is how a stated intention becomes a permanent exemption.
   - **Targets:** `scripts/verify/script-classes.json` (new),
     `packages/provegate/src/core/gates/wiring.ts`,
     `packages/provegate/test/wiring.test.ts`

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

- **PRD-018 Ship Verified** — it creates `gates.manifest.json`, which FR-5 edits, and it
  owns `_brain/**`, where FR-1's ADR lands.
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

- [ ] `_brain/adr/ADR-0002-method-rule-vs-repo-rule.md` + INDEX pointer
- [ ] `packages/provegate/src/cli.ts` — the sweep branches in `runCheck`
- [ ] `packages/provegate/src/core/gates/review.ts`, `wiring.ts`, `prd-ready.ts`
- [ ] `packages/provegate/src/core/run/durable.ts` — the reconciled parser
- [ ] `scripts/verify/script-classes.json` (new)
- [ ] Deletions: `verify-review-artifact.mjs`, `verify-durable-artifacts.mjs`,
      `verify-gates-wired.mjs`, and their `package.json` entries
- [ ] `gates.manifest.json`, `.github/workflows/ci.yml`, `scripts/verify/verify-workflow.mjs`
- [ ] `packages/provegate/test/self-hosting.test.ts` (new), `test/wiring.test.ts`

---

## 9. Open Questions

- [ ] **Q1 — Does `verify:workflow` survive?** After three deletions the bundle holds the
      repo-class scripts plus PRD-021's doc-claims check. Keeping it means two local
      entrypoints (the bundle and the CLI); folding it into the manifest means the local
      pre-push path needs a build. Owner decision — it sets whether FR-5 is one CI step
      or a full local-surface migration.
- [ ] **Q2 — Does a Durable Artifacts entry accept a root-level filename?** The package
      parser drops any value without a `/`, so `STATUS.md` is silently not a durable path
      today. PRD-021 FR-13 makes exactly that shape legitimate for Conflict Surface
      claims. Accepting it here is consistent but widens what the Phase 7 gate demands of
      the merge diff. Owner decision, because it changes a close-time gate's strictness.
- [ ] **Q3 — Who owns the `method-pending` entry for `verify-deferred`, and by when?**
      FR-6 requires an owner and a date; the check fails when the date passes, so this
      cannot be left blank.

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
- `_brain/adr/ADR-0002-method-rule-vs-repo-rule.md`

**Every path above is contested, and sequencing is the only resolution.** `cli.ts` is
claimed by PRD-019, PRD-021, and PRD-022; `prd-ready.ts` by PRD-018 and PRD-021;
`durable.ts` by PRD-018; `verify-workflow.mjs` and `gates-wired-exceptions.json` by
PRD-021; `gates.manifest.json` by PRD-018; `_brain/**` by PRD-017 and PRD-018. This PRD
runs last precisely so that every one of those is Ship Verified first. Claiming them
exclusively is what makes an ordering mistake refuse instead of merge. **Run `gate queue`
before claiming** — a PRD's own overlap list is not evidence.

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Decision: `_brain/adr/ADR-0002-method-rule-vs-repo-rule.md`
- Review artifact: `_docs/reviews/review-023-gate-self-hosting.md`

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                              | Scope | Notes |
| ---- | -------------------------------------------------------------- | ----- | ----- |
| FR-1 | `pnpm verify:brain`                                             | repo  | the ADR is schema-valid and indexed |
| FR-2 | `pnpm --filter provegate test test/self-hosting.test.ts`        | pkg   | the sweep fails a pass-with-criticals record; the script is gone |
| FR-3 | `pnpm --filter provegate test test/self-hosting.test.ts`        | pkg   | declaration lint per PRD and corpus-wide; one parser, reconciled |
| FR-4 | `pnpm --filter provegate test test/wiring.test.ts`              | pkg   | an unregistered on-disk script fails the audit |
| FR-5 | `pnpm verify:gates-wired`                                       | repo  | replaced by the CLI audit; every manifest command resolves |
| FR-6 | `pnpm --filter provegate test test/wiring.test.ts`              | pkg   | unclassified, superseded-but-present, stale, and expired entries all fail |

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
- DO NOT claim PRD-023 while any PRD-018, 019, 021, or 022 lease is active.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-25 | Cursor | Initial draft. Scoped out of the duplication analysis of 2026-07-25: three method rules are implemented twice, the package copy is stronger in all three, and the script copy is the one CI runs. Created with `gate new`. Three open questions for the owner |
