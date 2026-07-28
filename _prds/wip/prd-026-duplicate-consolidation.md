# PRD-026: Duplicate Consolidation — Delete the Copies, Once Their Replacements Exist

> **Status**: Draft
>
> **Created**: 2026-07-27
> **Updated**: 2026-07-27
> **Author**: Claude Opus 5, for owner review
> **Audience**: Implementing Agent
> **Slug**: `duplicate-consolidation`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: Workflow tooling, but the surface is user-facing: two new public CLI
> flags, three scripts removed from the published practices pack, and a documented manual
> migration for existing adopters. It ships as a minor release (FR-7), not an internal
> cleanup. Not `feature` because no new capability is created — two rules gain a second
> invocation mode and their duplicate implementations go away.
> **Autonomous Close**: operator-gated
> **Value**: 3.75 (MF/UI/TL/AR/RM: 5/4/3/4/2)

<!-- 0.25*5 + 0.25*4 + 0.20*3 + 0.15*4 + 0.15*2
     = 1.25 + 1.00 + 0.60 + 0.60 + 0.30 = 3.75 -->

---

## 1. Introduction / Overview

Split from PRD-023 on owner direction, 2026-07-27. This is the last of the three pieces and
the only one that deletes anything.

Two rules about the method's own artifacts are implemented **three times** — once inside
`packages/provegate`, once as a repo script this repository's CI runs, and once again in
`packages/provegate/practices/verify/`, which the package **publishes** and
`gate init --practices` installs into every adopter repo. In both cases the package copy is
the stronger one, and the two weaker copies are the ones that actually execute — here and
at adopters. A third rule, wire-or-delete, is in the same shape; PRD-025 completes its
package implementation and this PRD removes its copies.

| Rule | Package implementation | Repo script | Packed script |
| ---- | ---------------------- | ----------- | ------------- |
| Independent-review schema | `core/gates/review.ts` — verdict, the zero-criticals contract, quorum arithmetic against the panel gate, and a guard so a forged zero cannot satisfy it | `verify-review-artifact.mjs` — verdict and criticals only | shipped, and installed |
| Durable artifacts | `core/run/durable.ts` + `chain.ts` — declared paths must appear in the merge diff | `verify-durable-artifacts.mjs` — the same rule, a different parser | shipped, and installed |
| Wire-or-delete | `core/gates/wiring.ts` — completed by PRD-025 | `verify-gates-wired.mjs` | shipped, and installed |

**The two durable-artifact parsers have already diverged**, which is the concrete cost of
the duplication. Measured 2026-07-27 against the package as it stands: the script excludes
`*` and the package does not, and the package collects every backticked span in a bullet's
declaration half while the script collects only the first. A third divergence — the package
dropping any claimed path without a slash — existed when this work was first scoped and is
now **gone**, because the package side was fixed and the script side was not. That is the
thesis demonstrated rather than argued: a rule with two implementations gets fixed once.

**Delete last.** Every capability being removed must already exist in the package. For the
two sweeps that is FR-1 and FR-2 here; for the wiring audit it is the whole of PRD-025,
which is a hard prerequisite.

---

## 2. Goals

### Primary Goals

- [ ] Leave exactly one implementation of each of the three rules, counting the
      **published** copy and not only this repository's.
- [ ] Preserve every guarantee the deleted scripts provide: their corpus-wide scope becomes
      a CLI sweep, and PRD-025 has already absorbed the wiring audit's four gaps.
- [ ] Give existing adopters a stated, exact, published migration — and be honest that it
      is manual, because `gate init` is additive-only by design and this PRD does not
      change that.
- [ ] Put `gate` on this repository's manifest-driven surface, so "we build with it" is
      verifiable rather than asserted.
- [ ] Leave no live document telling anyone to run a check that no longer exists.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Method rules with more than one implementation | 3, each implemented three times | 0 | the class ledger plus the pack manifest |
| Artifact-token **extraction** implementations for the Durable Artifacts section | 2, divergent | 1 | the script is deleted. Narrowed deliberately: the package retains two section *readers*, `declaredArtifacts` and `declaredArtifactsStrict`, whose split is a recorded deferral this PRD does not close |
| Checks a **fresh** adopter loses by upgrading | n/a | 0 | `NEXT_STEPS.md` names the replacing flag for each |
| Checks an **existing** adopter loses by upgrading | n/a | 0 once they run the migration; three stale copies keep running until they do | the changeset migration section. **Not** provable by any fixture — the migration is manual |
| Removed pack paths an upgrade re-ships or deletes | n/a | 0 | the upgrade fixture, through the executor |
| Live documents naming a deleted check, under FR-6's stated boundary | 7 | 0 | FR-6 |
| Repo surfaces that invoke `gate` | measured at Phase 4 | the root manifest plus at least one CI step | CI workflow text plus the manifest |

---

## 3. User Stories

#### User Story 1

```
As an adopter of provegate,
I want the review, durable-artifact, and wiring gates the repo itself relies on,
so that I get the method the repo demonstrates rather than a subset of it.
```

**Acceptance Criteria:**

- [ ] Each rule is reachable from the CLI in both modes it is used in today: per-PRD at
      close, and as a corpus sweep.
- [ ] No behavior this repo relies on is lost when the scripts are deleted.

#### User Story 2

```
As an adopter upgrading to the release that removes the packed scripts,
I want to be told exactly what to do,
so that I do not silently keep running three checks that have diverged from the CLI.
```

**Acceptance Criteria:**

- [ ] The changeset note carries the full migration, not a pointer to a file already
      written into my repo.
- [ ] Every step that can lose data is named, including the exceptions conversion.

#### User Story 3

```
As someone evaluating provegate from the outside,
I want the repo's own CI to run the tool,
so that "we build with it" is verifiable rather than asserted.
```

**Acceptance Criteria:**

- [ ] The root gates manifest names the CLI sweeps, and at least one CI step invokes the
      built CLI.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1 — Review-artifact rule: one implementation, both modes.** `core/gates/review.ts`
   holds the stronger rule but is reachable only per-PRD, from the close chain. Add a
   corpus sweep, `gate check --review-artifacts`, beside the existing `--wiring` branch in
   `runCheck`: it validates every record under the configured reviews directory and reports
   one line per invalid file.

   The sweep is what makes the deletion safe. The script's value was never its rule, which
   is weaker, but its **scope**: it checks every review record in the repo, not only the one
   belonging to the PRD being closed. Deleting it without the sweep trades a weak check for
   no check.

   **This flag covers review records only.** FR-2 adds a separate flag rather than
   overloading this one — two unrelated rules over two unrelated sections of two unrelated
   documents should not share a name that describes one of them.

   **"Every record" is not a specification, and the deleted script had two predicates this
   one needs.** Selection: a candidate is a file directly under the configured reviews
   directory whose basename matches `^review-.*\.md$` — not recursive, and templates are
   excluded by that pattern rather than by an allowlist. Binding: the package validator
   checks PRD identity only when `expectedId` is supplied, and `validateReviewArtifactFile`
   defaults it away (`review.ts:89-95, 124-134`), so a sweep that omits it would accept a
   perfectly valid review **for the wrong PRD**. Derive the expected identifier from the
   filename — `review-023-slug.md` yields `PRD-023` under the configured id pattern — and
   pass it. A file whose name yields no identifier fails as unparseable rather than being
   skipped.

   Deny cases, each paired with a passing control on the same input shape: a valid record
   filed under the wrong PRD's name; a record whose filename yields no identifier; a
   template-shaped file that must not be selected.
   - **Targets:** `packages/provegate/src/cli.ts::runCheck`,
     `packages/provegate/src/core/gates/review.ts`,
     `packages/provegate/test/consolidation.test.ts` (new)
2. **FR-2 — Durable-artifacts rule: one parser, two modes.** The script's **close mode**
   duplicates what the close chain already enforces; its **lint mode** — every wip PRD
   declares a `## Durable Artifacts` section holding paths or an explicit `none` — has no
   package equivalent. Add that lint to `lintPrd`, so `gate check PRD-NNN` enforces
   declaration at the phase where a missing declaration should stop the work, and expose it
   corpus-wide through its own flag, `gate check --durable-artifacts`.

   **What the declaration lint accepts.** A section satisfies it when it holds at least one
   bullet, and every bullet either extracts to at least one path under the reconciled
   parser **or** is an explicit `none`. Mixing is legal: a section declaring two real paths
   and a `none` bullet must pass — a `none` beside real claims means "this axis has no
   durable output", not "this section is empty". What fails is a section that is absent,
   holds no bullets, or holds a bullet that is neither a `none` nor a path-bearing claim.

   **The parser reconciliation, re-measured 2026-07-27.** Two divergences are live and one
   is retired:

   | Divergence | Resolution |
   | ---------- | ---------- |
   | the script ignores values containing `*`, the package does not | **adopt the script's exclusion** — an unfilled template placeholder may be a glob |
   | the package collects every backticked span in the pre-em-dash declaration half, the script collects only the first | **keep the package behavior** — a bullet declaring two paths is two claims |
   | *(retired)* the package dropped any claimed path without a slash | **gone.** The slash rule was replaced by a shape test in a later round. Do **not** reintroduce a named-file predicate under any name: an extension test drops `LICENSE`, a leading-capital test drops `justfile`, and an allowlist drops `BUILD` and `WORKSPACE`. All three were tried and reverted, and the code says so in place. |

   **This lint is strictly stricter, so it takes a corpus pass before it lands.** Run it
   across every wip PRD and report any newly failing section rather than editing the
   artifact to fit the new rule.
   - **Targets:** `packages/provegate/src/core/run/durable.ts::declaredArtifacts`,
     `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`,
     `packages/provegate/src/cli.ts::runCheck`,
     `packages/provegate/test/consolidation.test.ts`
3. **FR-3 — Delete the repo scripts, the root bundle membership, and nothing one-sided.**
   With FR-1, FR-2, and PRD-025 in place, remove `verify-review-artifact.mjs`,
   `verify-durable-artifacts.mjs`, `verify-gates-wired.mjs`, their three `package.json`
   entries, and `scripts/verify/gates-wired-exceptions.json`.

   **The root bundle's member list is part of this deletion, not an implication of it.**
   `scripts/verify/verify-workflow.mjs` currently declares **eight** members and names all
   three of the deleted scripts. Deleting the files while the bundle still lists them makes
   `pnpm verify:workflow` — a floor command — fail on missing modules. Remove the three,
   leaving **five**. (An earlier version of this work said six, which was the packed
   bundle's arithmetic applied to the root one; the packed bundle has six members and keeps
   three.)

   **The exceptions file goes with its script.** `auditWiring` reads
   `manifest.wiringExceptions`, which carries the justification the shrink-only policy
   depends on and is already what the surviving implementation reads. The root file is
   empty, so nothing migrates here — but the **packed** copy is not, and FR-5 carries its
   conversion rule for adopters.
   - **Targets:** `scripts/verify/verify-review-artifact.mjs` (deleted),
     `scripts/verify/verify-durable-artifacts.mjs` (deleted),
     `scripts/verify/verify-gates-wired.mjs` (deleted),
     `scripts/verify/gates-wired-exceptions.json` (deleted),
     `scripts/verify/verify-workflow.mjs::CHECKS`,
     `package.json`
4. **FR-4 — The root manifest and CI run the CLI.** Replace the manifest's single
   `verify:workflow` entry with the checks it wraps, so a check that later moves into the
   package changes one manifest line and nothing else. Add a CI step that runs the built
   CLI's sweeps after the build.

   **The contribution is the manifest-driven surface, not the first invocation.** PRD-021
   already puts a `gate` call in a `package.json` script that CI runs. What this FR adds is
   the sweeps and, more importantly, entries in `gates.manifest.json`, where `gate run`
   executes them as phase policy rather than as one more CI line.

   **`verify:workflow` survives** as the local no-build bundle (owner decision of
   2026-07-25). Folding it into the manifest would put a build on the local pre-push path
   for one entrypoint, and the remaining set is not yet clean anyway: of the five checks
   left after FR-3, two are still method rules — the memory validator and the deferral
   check — both carried as `method-pending` in PRD-025's ledger.

   **The CI change is a replacement, not an addition.** CI runs the three aliases FR-3
   deletes (`ci.yml:64-77`, `package.json:32-36`). Those three steps are **removed** in the
   same change; leaving them beside the new sweep would either fail on missing scripts or,
   worse, run the same rules through two implementations — the state this PRD exists to end.
   The rollback restores them, and an earlier version specified the restore without the
   removal.

   **The manifest entries are enumerated, because "the checks it wraps" is not a
   specification.** Phase 4 gains `pnpm check-types`, `pnpm lint`, `pnpm build`,
   `pnpm test`, `pnpm verify:workflow`, `pnpm check-egress` — today's set minus nothing —
   and the two sweeps arrive as **CI steps invoking the built CLI directly**, not as
   manifest entries. That distinction is load-bearing: `packageScriptOf` resolves only
   package-manager invocations, so a manifest entry reading `node …/dist/cli.js check --…`
   resolves to no `package.json` script and would fail the wiring audit's first direction.
   If a sweep is to be manifest-driven it needs a `package.json` alias first; name that
   alias or keep the sweeps in CI, but do not put a bare `node` command in the manifest.

   **FR-4's own verification must not name a deleted script.** An earlier version of this
   work verified this requirement with `pnpm verify:gates-wired`, the very script FR-3
   deletes; five independent review rounds did not notice. This FR verifies through
   `gate check --wiring`, which survives, plus a test that every manifest command resolves
   to an existing `package.json` script — run against the repository **after** the change,
   not against a fixture.
   - **Targets:** `gates.manifest.json`, `.github/workflows/ci.yml`, `package.json`,
     `packages/provegate/test/consolidation.test.ts`
5. **FR-5 — Retire the packed duplicates, and state honestly who that moves.** Each of the
   deletions above has a packed twin; this FR removes them in the same change and rewires
   the pack so the deletion is coherent rather than merely tolerated.

   **What goes.** The three packed scripts and `practices/verify/gates-wired-exceptions.json`.

   **What must move with them, or the delete does not land.**

   - `core/run/init.ts` — remove the four `PACK_MAP` entries. This is load-bearing:
     `verify-pack-drift.mjs` parses `PACK_MAP` as its **single source of pairing**, so a
     pair disappears only when its entry does. Files without entries and entries without
     files each fail, in opposite directions. Both halves, one commit.
   - `practices/verify/verify-workflow.mjs` — drop the three from `CHECKS`, leaving three.
   - `scripts/verify/pack-drift-ledger.json` — remove the four pair entries and reconcile.
     Three are ordinary hash pairs; the fourth, for the exceptions file, is a pack-tracked
     entry with a note explaining why its repo side diverges.
   - `packages/provegate/test/pack-manifest.json` and its test — the shipped-file allowlist
     must shrink with the pack.
   - `practices/NEXT_STEPS.md` — see FR-6; this file both *instructs adopters to register
     the three scripts* and is the natural home of the fresh-install guidance.

   **`gate init` is additive-only, so removing a file from the pack migrates nobody who
   already installed it.** `init.ts` declares the invariant — nothing is ever overwritten
   or deleted, existing paths are reported as skipped — and writes with the exclusive-create
   flag so create-versus-skip is atomic. `NEXT_STEPS.md` tells adopters the same. The claim
   "adopters move with us" holds for a **fresh** install and for nobody else: an existing
   adopter keeps all three scripts, their `package.json` entries, their bundle membership,
   and a non-empty exceptions file, while the pack stops shipping any of them.

   **The invariant is not this PRD's to break.** A pack that deletes adopter files on
   upgrade is a far worse property than the duplication being removed. So the migration is
   manual, exact, and published, and what this FR makes mechanical is the part that can be.

   **The existing-install migration — five steps, all manual.**

   1. Delete the three scripts and `scripts/verify/gates-wired-exceptions.json`.
   2. Remove the three `package.json` script entries.
   3. Remove the three names from the `CHECKS` array in the installed
      `scripts/verify/verify-workflow.mjs`.
   4. Add `gate check --review-artifacts`, `gate check --durable-artifacts`, and
      `gate check --wiring` wherever the removed checks ran.
   5. Convert any exceptions entries by the rule below. Skip when the file is absent or
      empty.

   **Step 5 is a conversion rule, not a re-recording, because the two stores differ in
   every respect.** Measured 2026-07-27:

   | | `gates-wired-exceptions.json` | `manifest.wiringExceptions` |
   | --- | --- | --- |
   | shape | bare array | `Record<string, string>` |
   | key | `.mjs` **filename** | **package-script name** |
   | value | none | justification, validated non-empty |
   | unknown key | ignored | reported stale — the audit fails an exception naming no existing script |

   The packed file ships **eight** filenames, so a literal copy produces eight stale
   exceptions and a red gate. The rule has **four** steps, and the third was missing from an
   earlier version:

   1. **Drop** the entries for the three removed scripts. They no longer exist.
   2. **Map** each survivor's filename to the `package.json` script whose body invokes it.
   3. **Drop every survivor that is already wired.** `auditWiring` refuses an exception for
      a wired script as stale (`wiring.ts:238-255`), and an exception is only meaningful for
      a check that is wired nowhere. This step is not optional bookkeeping: the reviewer
      executed the three-step version against this repository and `auditWiring` rejected
      **all five** survivors, because all five are wired here.
   4. **Justify or drop** what remains. The new store requires a reason the old array never
      carried, and an exception nobody can justify is one that should not exist. Stubbing a
      placeholder would quietly defeat the shrink-only policy.

   **Prove it through the audit, not the loader.** `validateManifest` accepts any object of
   non-empty strings (`manifest.ts:247-256`), so a manifest that loads cleanly can still be
   a state the wiring audit refuses — which is exactly what the three-step rule produced.
   The fixture asserts the converted result passes `auditWiring`, not merely `loadManifest`.
   Note also that the loader's non-empty check is a **length** check and accepts whitespace
   (`manifest.ts:251`); if "justify" is meant semantically, require trimmed non-empty text
   and add a whitespace case, or say plainly that the contract is non-zero length.

   **The conversion is proved, not just documented.** This repository's own copy is empty,
   so nothing here would exercise the rule — a migration whose only validation is that it
   was written down. The pack ships real eight-entry data: capture it as a **retained
   fixture** (the same change deletes the live file, so the fixture must own a copy),
   convert it by the rule, and assert the result is a manifest the loader accepts, that the
   three removed names are absent, and that an entry with an empty justification is
   refused.

   **The upgrade fixture must call the executor, not the planner.** `planPractices` returns
   an action list and writes nothing; the additive-only guarantee lives in `initWorkspace`,
   which holds the exclusive-create write, and production runs the pair. Seed a repo with
   the **old** pack shape, then run the production pair and assert:

   - **(a) Removal.** Neither the created nor the skipped list names any of the four
     removed paths. Not "reported skipped" — a path absent from `PACK_MAP` is absent from
     the plan entirely, so it appears in **neither** list, and asserting `skipped` would
     pass for the wrong reason.
   - **(b) Non-mutation.** The four seeded files are present and byte-identical.
   - **(c) Positive control, skipped branch.** A **retained** pack file, pre-seeded with
     modified content, is reported skipped and is byte-identical afterwards. This is the
     independent cause (a) and (b) lack alone: it proves the run processed the pack rather
     than doing nothing.
   - **(d) Positive control, created branch.** A retained pack file that is **absent** is
     reported created. Both branches of the skip/create decision are pinned.

   **The mutation check, and the trap in it.** Re-adding a removed path to `PACK_MAP` and
   expecting (a) to go red does **not** work as stated in an earlier version:
   `planPractices` reads every mapped source eagerly, so re-adding an entry whose file the
   same change deleted raises a file-not-found error before any report exists — the check
   would fail on pack readability rather than on the created/skipped contract. Restore a
   readable source alongside the entry, or inject the removed action directly into the
   plan, and assert the failure came from the contract.
   - **Targets:** `packages/provegate/practices/verify/verify-review-artifact.mjs` (deleted),
     `packages/provegate/practices/verify/verify-durable-artifacts.mjs` (deleted),
     `packages/provegate/practices/verify/verify-gates-wired.mjs` (deleted),
     `packages/provegate/practices/verify/gates-wired-exceptions.json` (deleted),
     `packages/provegate/practices/verify/verify-workflow.mjs`,
     `packages/provegate/src/core/run/init.ts::PACK_MAP`,
     `scripts/verify/pack-drift-ledger.json`,
     `packages/provegate/test/pack-manifest.json`,
     `packages/provegate/test/practices-pack.test.ts`,
     `packages/provegate/test/init.test.ts`
6. **FR-6 — Leave no live document naming a deleted check.** This is wire-or-delete applied
   to documentation, and it is the requirement five independent review rounds of the
   predecessor PRD never raised. Measured 2026-07-27, six live documents name a check this
   PRD removes, and **three of them ship inside the package**:

   | Document | Why it matters |
   | -------- | -------------- |
   | `packages/provegate/practices/NEXT_STEPS.md` | **shipped.** Instructs adopters to register all three scripts in `package.json` and to wire two of them in CI. It is not merely a mention — it is the wiring instruction that created the duplication at every adopter. |
   | `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md` | **shipped.** The entrypoint every adopter starts from names one of the checks. |
   | `packages/provegate/examples/manifests/monorepo/README.md` | **shipped.** Tells adopters the wiring script exists, that it fails on that example, and how to handle it via its exceptions file. |
   | `AGENT_BOOTSTRAP.md` | this repository's canonical agent entrypoint |
   | `_docs/parallel-orchestration/README.md` | repo documentation, names the meta-gate by its script alias twice |
   | `_prds/README.md` | repo documentation, describes the lint behavior by script name |
   | `STATUS.md` | the board's **Recent activity** log names the checks in historical entries |

   **`STATUS.md` is the seventh and it is a boundary question, not a rewrite.** Its
   references sit in a historical activity log, which is a record of what happened and is
   not rewritten — the same treatment PRD-021 already specifies for that section
   (`prd-021:539-546`). So FR-6's check excludes `STATUS.md`'s historical section
   explicitly, by the same rule, and that exclusion is **asserted** rather than assumed: a
   test that the exclusion does not also swallow the live parts of the board. An earlier
   version said six documents and would have had a check whose count, targets and boundary
   disagreed.

   Each must be rewritten to name the surviving CLI surface. `NEXT_STEPS.md` additionally
   carries the fresh-install guidance and a pointer to the migration.

   **The source snapshot is explicitly excluded.** `docs/research/.../source-snapshot/**`
   is law and is never edited; its references are historical by construction. Per-work-item
   artifacts under `_prds/`, `_readiness/`, and `_tasks/` are likewise historical and are
   not rewritten.
   - **Targets:** `packages/provegate/practices/NEXT_STEPS.md`,
     `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`,
     `packages/provegate/examples/manifests/monorepo/README.md`,
     `AGENT_BOOTSTRAP.md`,
     `_docs/parallel-orchestration/README.md`,
     `_prds/README.md`,
     `packages/provegate/test/consolidation.test.ts`
7. **FR-7 — Ship it as a release, and carry the migration in the release note.** Two public
   CLI flags, three files removed from a published pack, and a manual migration are a
   user-facing surface change. Add a changeset declaring a **minor** bump.

   **The changeset carries the migration itself, not a pointer to it.** Because `gate init`
   is additive-only, an existing adopter is not migrated by the upgrade and will not re-read
   a pack file written into their repo months ago. The release note is the only surface that
   reaches them, so it must carry **all five** of FR-5's steps — including the exceptions
   conversion, the one step that loses data if skipped. `NEXT_STEPS.md` keeps the same
   content for fresh installs; the changeset is what reaches everyone else.

   Evidence is one semantic assertion over a single entry, not independent greps, which are
   satisfied by two different files. The assertion covers the five steps, not only the
   flags.
   - **Targets:** `.changeset/` (new entry),
     `packages/provegate/test/changeset-entry.test.ts`

8. **FR-8 — The class ledger, as a repo-class check, so the next duplicate fails at a gate
   rather than at review.** Owner decision of 2026-07-27, moving this here from PRD-025.

   **Why it lives here and not in the package.** Apply the decision record's own test to the
   ledger: it governs which files exist under **this repository's** scripts directory and
   where they belong — not PRDs, readiness records, tasks, review records, or memory
   records. That is repo-class. Putting it in shipped code made a repository-local artifact
   a hard requirement of `auditWiring`, which `gate check --wiring` runs for every adopter,
   and where the `method` class is structurally unreachable: an adopter cannot move a check
   into `packages/provegate`. It also created a cross-PRD seam — the ledger enforced stale
   entries in one PRD while another deleted the scripts — which two independent reviewers
   found from opposite sides. **This PRD owns both halves, so the transition is one commit
   by construction.**

   **What ships.** `scripts/verify/verify-script-classes.mjs`, registered as a
   `package.json` gate and wired like any other, plus `scripts/verify/script-classes.json`:
   one entry per `verify-*.mjs` under the scripts directory, each declaring a `class`.

   | Class | Meaning | Failure condition |
   | ----- | ------- | ----------------- |
   | `repo` | governs this repository's stack | none; it belongs where it is |
   | `method` | governs the method's artifacts, and its superseding CLI surface exists | **fails while the script still exists** — the state a new duplicate lands in |
   | `method-pending` | a method rule whose CLI replacement does not exist yet | fails when `reviewBy` passes; requires `owner` and `reviewBy` |

   An **unclassified** script fails. An entry naming a script that no longer exists fails as
   stale, so the ledger shrinks with the work — `known-red-ledger-must-expire`.

   **The schema is named, not left to Phase 4.** A JSON object keyed by filename, each value
   `{ "class": "repo" | "method" | "method-pending", "owner"?: string, "reviewBy"?: "YYYY-MM-DD", "supersededBy"?: string }`.
   `owner` and `reviewBy` are required for `method-pending` and refused otherwise;
   `supersededBy` names the CLI surface for `method` and is required there. Any other key,
   or a malformed date, fails.

   **What the ledger contains at this PRD's close.** The three deleted scripts are **absent**
   — the deletion and the ledger land together, so they are never written and never go
   stale. `verify-deferred` and `verify-brain` are `method-pending`, owner-held, `reviewBy`
   2026-10-01 (PRD-023's Decision Record). `verify-script-classes` itself is `repo`, which
   is self-referential and correct. Everything else is `repo`.

   **The comparison against the decision record, which is the mechanical half.**
   `_brain/adr/ADR-0002-method-rule-vs-repo-rule.md` lands on the base branch **ahead of this
   PRD** as a precondition. It carries a table under a `## Classification` heading with
   exactly two columns — `Script` and `Class` — one row per verify script. This check parses
   that table and diffs it against the ledger; a disagreement, a script in one and not the
   other, or an unparseable table each fail. A decision record whose classification no
   artifact is compared against is a document, not a rule. **Both files change in the
   deletion commit**: removing three ledger rows without removing the record's three
   matching rows converts this PRD into a different red.

   **If the record is absent when Phase 4 starts the precondition was violated — stop rather
   than write it here.** Two work items each landing a different first version of one
   decision is worse than a blocked start.

   **Every negative fixture mutates one valid green baseline.** An earlier version of this
   requirement asked only that unclassified, stale, expired and malformed-pending inputs
   "fail" — and with the record absent, every one of them would have been red for that
   reason alone. Build a passing ledger-plus-record pair first, mutate exactly one thing per
   fixture, and assert the **specific** issue that mutation introduces.
   - **Targets:** `scripts/verify/verify-script-classes.mjs` (new),
     `scripts/verify/script-classes.json` (new),
     `package.json`,
     `packages/provegate/test/consolidation.test.ts`

---

## 5. Non-Goals (Out of Scope)

- **Completing the wiring audit.** That is PRD-025 in full and a hard prerequisite here.
  The **class ledger** is no longer a non-goal: owner decision of 2026-07-27 moved it here
  from PRD-025 as a repo-class check (FR-8), because it governs this repository's scripts
  directory and because the PRD that deletes the scripts must be the one that drops their
  rows.
- **The readiness lint parsers.** PRD-024.
- **Making `gate init` remove anything, on upgrade or otherwise.** The additive-only
  invariant is load-bearing for every pack path; a pack that deletes adopter files is a
  worse property than the duplication being removed. The migration is manual by design.
- **Detecting an adopter's stale pack copies.** After this lands, an adopter who never
  migrates keeps three scripts that diverge from the CLI — the duplication relocated rather
  than eliminated. A read-only report naming pack files the installed version no longer
  ships is the right answer and is new behavior. Named here as a follow-on candidate so the
  residual is on the record rather than discovered by an adopter.
- **Turning the packed scripts into thin CLI wrappers.** A wrapper is a fourth artifact to
  keep agreed, and adopters already have the CLI as a dependency. The residual — an adopter
  running the packed bundle without the CLI on PATH loses three checks — is stated, not
  denied.
- **Porting the deferral-policy check into the package**, or reclassifying any `repo`-class
  script. PRD-025's ledger carries both as pending.
- **Replacing the whole CI job list with `gate run`.** FR-4 adds one invocation; making the
  runner the sole CI entrypoint should follow evidence that the first one is stable.
- **Editing the source snapshot or any historical work-item artifact** to remove references
  to the deleted checks. Both are historical by construction (FR-6).
- **Changing what any relocated rule decides**, beyond the one parser reconciliation FR-2
  states and resolves. This is a relocation, not a retune.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a review record whose verdict is a pass with a non-zero critical count,
  **When** the corpus sweep runs, **Then** it exits non-zero naming that file.
- **Given** a wip PRD with no Durable Artifacts section, **When** `gate check PRD-NNN`
  runs, **Then** it fails; and **when** the sweep runs, **Then** it names that PRD.
- **Given** a Durable Artifacts section holding two real paths and one explicit `none`
  bullet, **Then** the declaration lint passes; **given** a bullet that is neither, **Then**
  it fails.
- **Given** a declared value containing an asterisk, **Then** it is excluded; **given** a
  bullet whose declaration half holds two backticked paths, **Then** both are claims.
- **Given** the three scripts are deleted and the root bundle's member list is trimmed to
  five, **When** the verification floor runs, **Then** it is green and no `package.json`
  entry references a missing file.
- **Given** the packed twins are deleted and their installer-map entries removed, **When**
  the pack-drift check runs, **Then** it passes; **given** a packed file whose entry was
  removed but which still exists, **Then** it fails.
- **Given** a repo seeded with the old pack shape, **When** the upgrade runs through the
  production init pair, **Then** the four removed paths appear in **neither** the created
  nor the skipped list, the four seeded files are byte-identical, a retained pre-seeded file
  is reported skipped, and a retained absent file is reported created.
- **Given** a removed path is re-added to the installer map **together with a readable
  source**, **When** the fixture runs, **Then** it fails on the created/skipped contract —
  not on a missing file.
- **Given** the retained eight-entry exceptions fixture, **When** the documented conversion
  is applied, **Then** the three removed names are gone, each survivor is keyed by its
  package-script name, and the result loads as a valid manifest; **given** an entry with an
  empty justification, **Then** it is refused.
- **Given** every manifest command after FR-4's edit, **When** the resolution test runs,
  **Then** each names an existing `package.json` script — and no verification row in this
  PRD names a script this PRD deletes.
- **Given** the repository after this PRD, **When** the documentation check runs, **Then**
  no live document outside the source snapshot and the work-item artifacts names a deleted
  check.
- **Given** an adopter reading the changeset note, **Then** all five migration steps are
  present, including the exceptions conversion.
- **Given** the converted exceptions set, **When** `auditWiring` runs against it, **Then**
  it passes — not merely `loadManifest`. **Given** the three-step conversion that omits
  already-wired survivors, **Then** the audit rejects them, which is the measured case.
- **Given** the repository after this PRD, **When** the ledger check runs, **Then** the
  three deleted scripts appear in neither the ledger nor the decision record's table; and
  **given** either store still holding one of them, **Then** it fails.
- **Given** a valid review record filed under the wrong PRD's name, **When** the review
  sweep runs, **Then** it fails — the expected identifier is derived from the filename and
  passed, not defaulted away.
- **Given** CI after this PRD, **Then** the three replaced steps are absent and the sweep
  is present; **given** a manifest entry invoking the CLI binary directly, **Then** the
  wiring audit fails it, because it resolves to no package script.

---

## 7. Technical Considerations

### Architecture

- **Two modes, one rule.** Every relocation here has the same shape: the rule lives in one
  function, the per-PRD path calls it during `gate check` or the close chain, and a
  `gate check --<x>` flag sweeps the corpus. The deleted scripts were never a second *rule*
  worth keeping — they were a second *scope*, and the flag is that scope.
- **Delete last, and delete both halves together.** No commit in the sequence may have a
  coverage hole, and no deletion may be one-sided: the pack-drift check pairs the packed
  file with its installer-map entry and fails in opposite directions on either half alone.
- **Documentation is a wiring surface.** FR-6 exists because a shipped file that tells an
  adopter to register a deleted script is not a stale comment — it is the instruction that
  created the duplication in the first place.
- **Precedent, not invention.** `gate check --wiring` already proves the sweep-flag shape,
  and the drift and known-red ledgers already prove the ledger shape.

### Dependencies

- **PRD-025 Ship Verified** — a hard prerequisite. It completes `auditWiring`; deleting
  `verify-gates-wired.mjs` before that removes guarantees the package does not yet have.
  PRD-025 no longer lands the ledger — that moved here (FR-8).
- **The decision record committed on the base branch** — a precondition, not a work item
  (FR-8). Absent at Phase 4 start means stop.
- **PRD-024** — no ordering constraint on FR-1, FR-3, FR-4, FR-5 or FR-6. FR-2 adds a lint
  to `lintPrd`, which PRD-024 also edits, so those two serialize on that file.
- **PRD-021 Ship Verified** — shares `runCheck`, `verify-workflow.mjs`, the CI workflow, and
  creates the changeset-entry test.
- **PRD-020 Ship Verified** — shares `test/pack-manifest.json`.
- Re-run `gate queue` before claiming. Three overlap counts in the PRD-023 wave went stale
  inside a day, and this PRD's own list is not evidence.
- No new runtime dependencies; `packages/provegate` stays at zero.

### Rollback

The deletions are the risk, and the reverse operation has the same both-halves property
the forward one does: a partial revert is red in the opposite direction, so it is one
commit.

**Repo half.** Restore the three scripts and the root exceptions file from history, re-add
their three `package.json` entries, restore the three members to the root bundle's `CHECKS`,
restore the individual CI steps, **remove the FR-4 CLI sweep**, and revert the manifest to
its single bundle entry. The CI steps and the bundle membership are not inert: CI names them.

**Pack half.** Restore the four packed files, their four installer-map entries, the three
members of the packed bundle's `CHECKS`, the four drift-ledger pairs — three ordinary hash
pairs and one pack-tracked entry with its note — and the four rows in the pack manifest and
its test. Reconcile the drift ledger if either side moved while the change was live.

**The class ledger must be flipped, and the decision record must move with it.** PRD-025's
ledger classes the restored scripts; restoring them without updating it is red by that
PRD's own rule. Flip the affected entries back to `method-pending` with an owner and a
review date rather than deleting them, which would trip the unclassified-script rule
instead — and mirror the same three rows in the decision record, because PRD-025 FR-1 makes
ledger-versus-record agreement a gate. Both files, one commit.

**Adopter-visible behavior.** Nothing happens automatically, for the same reason the
forward migration is manual. An adopter who migrated and then upgrades to a rolled-back
version keeps their deleted files deleted; re-running `gate init --practices` re-creates the
scripts but never re-registers their `package.json` entries or bundle membership, because
init does not edit existing files. Their `gate check` invocations keep working, since the
package-side sweeps stay. A rollback is a no-op for migrated and unmigrated adopters alike,
which is the correct property and the reason the manual migration is safe to publish.

No state or artifact migration exists in **this repository**: no state file, work-item
artifact, or lock shape changes.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/cli.ts::runCheck` — the two sweep branches
- [ ] `packages/provegate/src/core/gates/review.ts`, `core/run/durable.ts`,
      `core/gates/prd-ready.ts` — the sweep entry points and the reconciled parser
- [ ] Repo deletions: three scripts, the root exceptions file, three `package.json`
      entries, and three members of the root bundle's `CHECKS`
- [ ] Pack deletions and rewiring: the three packed twins plus the packed exceptions file,
      the packed bundle's `CHECKS`, the installer map, the drift ledger, the pack manifest
      and its test
- [ ] `gates.manifest.json`, `.github/workflows/ci.yml`
- [ ] Six live documents (FR-6)
- [ ] `packages/provegate/test/consolidation.test.ts` (new), `test/init.test.ts`,
      `test/practices-pack.test.ts`
- [ ] `scripts/verify/verify-script-classes.mjs` and `script-classes.json` (new) — the
      ledger (FR-8), plus its `package.json` registration
- [ ] `_brain/adr/ADR-0002-method-rule-vs-repo-rule.md` — the three deleted rows removed
      from its classification table, in the deletion commit
- [ ] `.changeset/` entry (minor)

---

## 9. Open Questions

- (none) — the parser reconciliation, the migration steps, the conversion rule, and the
  documentation set are all specified and measured here.

<!-- BULLET LIST, deliberately: PRD-024's FR-3 makes a paragraph-form section a lint
failure. -->

---

## 10. References

- `_brain/learnings/false-green-on-missing-file.md` — binds every deletion here
- `_brain/learnings/gate-wire-or-delete.md` — extended to documentation by FR-6
- `_brain/learnings/known-red-ledger-must-expire.md` — binds FR-8's pending state
- `_brain/learnings/fixture-must-reach-production-shape.md` — binds FR-5's upgrade fixture
- `_brain/learnings/assert-absent-needs-an-independent-cause.md` — binds its positive
  controls and its mutation check
- `_readiness/wip/readiness-023-gate-self-hosting.md` sections 8 and 9 — where findings T
  and X, and the fixture and mutation-check defects, were measured
- PRD-023 sections 4 and 7 — the requirements this PRD carries forward
- `docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md` — the dogfood
  principle FR-4 finally enforces

---

## Memory Inputs

- applied: `false-green-on-missing-file` — every deletion here removes a check; each one is
  paired with the surviving surface that covers it, and the floor commands must fail rather
  than skip when a named file is gone.
- applied: `gate-wire-or-delete` — FR-3 and FR-5 are the delete half, and FR-6 extends the
  same rule to documentation: a shipped file instructing an adopter to register a deleted
  script is a wiring instruction, not a stale comment.
- applied: `fixture-must-reach-production-shape` — FR-5's upgrade fixture calls the
  production init pair rather than the pure planner, because the invariant under test lives
  in the executor. A fixture that cannot fail for its stated reason reports as coverage.
- applied: `assert-absent-needs-an-independent-cause` — the upgrade fixture's two absences
  are paired with two positive controls, and the mutation check is written so it fails on
  the contract rather than on a missing pack file.
- applied: `durable-artifact-must-commit` — the review artifact and the learning this PRD
  declares must be committed with the change; the close gate checks the merge diff.
- applied: `narrow-the-grammar-not-the-parser` — FR-2's declaration lint reads a hand-rolled
  Markdown section; it restricts what the section may contain rather than learning more
  Markdown.
- applied: `evidence-pattern-satisfied-by-the-template` — FR-6's check is a pattern
  searched against documents, which is exactly this record's subject, and its watch covers
  the shipped example this PRD edits. Two consequences. The check must run against the
  **real repository tree**, not a hand-written fixture, or it tests a document written to
  fail rather than the ones that ship. And its exclusion list — the source snapshot and the
  work-item artifacts — must itself be asserted: an exclusion that accidentally matches
  everything makes the check pass vacuously, which is the same inert-gate failure this
  record describes arriving through the exclusion rather than the pattern.
- applied: `known-red-ledger-must-expire` — FR-8's `method-pending` state carries an owner
  and a `reviewBy` and fails when the date passes, so a stated intention cannot become a
  permanent exemption. It arrives with the ledger from PRD-025.
- applied: `shipped-content-needs-a-delivery-gate` — its watch covers `init.ts`, where this
  PRD deletes four `PACK_MAP` entries. The record's rule runs in both directions: removing a
  delivery entry is a delivery change, and the proof it strands no adopter is FR-5's upgrade
  fixture calling the **production init pair** over a tree that already installed the old
  content — an artifact-checking gate on the installed side, not the packaged side.
- reviewed: `scope-out-the-layer-the-rounds-keep-hitting` — its watch covers
  `_prds/README.md`, a declared FR-6 target. The edit there is a documentation truth-up
  (a script name follows its consolidation), not a remediation round; no defect class is
  clustering in one layer in this PRD's history, so the record's action does not fire.
- applied: `a-rule-corrected-survives-where-it-is-restated` — same watch, same target, and
  here the record is load-bearing rather than incidental: FR-6 exists because a rule
  restated in shipped documentation outlives the implementation it describes. The
  consolidation therefore sweeps every restatement site against the **real repository
  tree**, and the exclusion list is itself asserted, so a missed restatement fails the
  check instead of surviving in a document nobody re-read.
- reviewed: `gate-run-resume-after-archive` — its watch covers `run/**` and this PRD's
  targets include `durable.ts` and `init.ts`. The record is a close-time operational trap:
  nothing in this PRD moves the archive boundary or the gate ordering it warns about, and
  this PRD's own close must follow its rule — if the merge step stops after the archive,
  fix the cause and complete without re-entering the memory gates.
- reviewed: `two-parsers-wrong-together` — the two durable-artifact parsers agreeing on a
  corpus would not prove either correct, which is why FR-2 resolves each divergence
  deliberately instead of reconciling to whatever both happen to do.
- reviewed: `strictness-added-during-extraction-is-a-behavior-change` — adopting the
  script's asterisk exclusion is added strictness reaching the package's existing callers;
  if an existing test must be edited to pass, the merge changed behavior — revert rather
  than adjust the test.

---

## Memory Outputs

- learning: `_brain/learnings/docs-are-a-wiring-surface.md` — that a shipped document
  instructing an adopter to register a check is a wiring surface subject to wire-or-delete,
  and that six such documents survived five adversarial reviews of the deletion that
  invalidates them.

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
- `packages/provegate/src/core/gates/prd-ready.ts`
- `packages/provegate/src/core/run/durable.ts`
- `packages/provegate/src/core/run/init.ts`
- `packages/provegate/practices/verify/**`
- `packages/provegate/practices/NEXT_STEPS.md`
- `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`
- `packages/provegate/examples/manifests/monorepo/README.md`
- `packages/provegate/test/consolidation.test.ts`
- `packages/provegate/test/init.test.ts`
- `packages/provegate/test/practices-pack.test.ts`
- `packages/provegate/test/pack-manifest.json`
- `scripts/verify/verify-review-artifact.mjs`
- `scripts/verify/verify-durable-artifacts.mjs`
- `scripts/verify/verify-gates-wired.mjs`
- `scripts/verify/gates-wired-exceptions.json`
- `scripts/verify/verify-workflow.mjs`
- `scripts/verify/pack-drift-ledger.json`
- `gates.manifest.json`
- `.github/workflows/ci.yml`
- `_docs/parallel-orchestration/README.md`
- `AGENT_BOOTSTRAP.md`
- `_prds/README.md`
- `packages/provegate/test/changeset-entry.test.ts`
- `packages/provegate/test/pack.test.ts`
- `scripts/verify/script-classes.json`
- `scripts/verify/verify-script-classes.mjs`
- `_brain/adr/ADR-0002-method-rule-vs-repo-rule.md`
- `_brain/learnings/docs-are-a-wiring-surface.md`
- `.changeset/`

**Both FR-6 targets are claimed, correcting an earlier assumption.** An earlier revision
left `AGENT_BOOTSTRAP.md` and `_prds/README.md` unclaimed on the belief that
`sharedAppendOnly` covered them. It does not: the default set is the **exact paths**
`package.json`, `pnpm-lock.yaml`, `README.md`, `CLAUDE.md`, `AGENTS.md` (`defaults.ts:95`),
and conflict subtraction uses exact canonical-string membership (`conflicts.ts:63-69,
93-97`). Neither target is in that set, so both are claimed above — as is
`test/changeset-entry.test.ts`, which FR-7 targets and an earlier revision omitted.

**Contested, and the reason this PRD runs last.** `cli.ts`, `prd-ready.ts`, the CI workflow,
`verify-workflow.mjs`, `pack-drift-ledger.json`, `init.ts`, `practices-pack.test.ts`,
`pack-manifest.json`, and the changeset directory are each claimed by at least one of
PRD-020, PRD-021, PRD-024 and PRD-025. Re-run `gate queue` before claiming.

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Review artifact: `_docs/reviews/review-026-duplicate-consolidation.md`
- Learning: `_brain/learnings/docs-are-a-wiring-surface.md` — the Memory Output above,
  repeated here because the two lists are one contract
- Decision: `none` — the governing decision record is PRD-025's precondition, and this PRD
  takes no new architectural decision; it executes one already recorded

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                             | Scope | Notes |
| ---- | ----------------------------------------------------------- | ----- | ----- |
| FR-1 | `pnpm --filter provegate test test/consolidation.test.ts`   | pkg   | the review sweep fails a pass-with-criticals record across the whole reviews directory, and the repo script is gone |
| FR-2 | `pnpm --filter provegate test test/consolidation.test.ts`   | pkg   | declaration lint per PRD and corpus-wide; one parser with the two live divergences resolved and the retired third not reintroduced; the mixed real-paths-plus-none section passes |
| FR-3 | `pnpm verify:workflow`                                      | repo  | the trimmed five-member bundle is green and no entry references a missing file |
| FR-4 | `pnpm --filter provegate test test/consolidation.test.ts`   | pkg   | every manifest command resolves to an existing script, and no verification row names a deleted one |
| FR-5 | `pnpm verify:pack-drift`                                    | repo  | pairs removed from both sides; no orphan packed file and no lost live copy |
| FR-5 | `pnpm --filter provegate test test/init.test.ts`            | pkg   | the upgrade fixture through the executor: removed paths in neither list, seeded files byte-identical, and both positive controls hold |
| FR-5 | `pnpm --filter provegate test test/pack.test.ts`            | pkg   | the shipped-file allowlist shrank with the pack — this is the test that loads `pack-manifest.json` and compares it against the packed tarball |
| FR-5 | `pnpm --filter provegate test test/practices-pack.test.ts`  | pkg   | the packed bundle lists three checks, and the retained eight-entry exceptions fixture converts to a state the wiring audit accepts — not merely one the manifest loader accepts |
| FR-6 | `pnpm --filter provegate test test/consolidation.test.ts`   | pkg   | no live document outside the source snapshot and the work-item artifacts names a deleted check |
| FR-7 | `pnpm --filter provegate test test/changeset-entry.test.ts` | pkg   | one entry declares a minor bump and carries all five migration steps including the exceptions conversion |
| FR-8 | `pnpm verify:script-classes`                                | repo  | unclassified, stale, expired, and owner-less or date-less pending entries each fail, every fixture mutating one green baseline; the three deleted scripts appear in neither store |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm verify:workflow` — the remaining bundle is green

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/init.test.ts` — the mutation check must make the
  upgrade fixture fail **on the created/skipped contract**. A fixture that goes red on a
  missing pack file has found a defect in itself, not evidence for the change.
- Contract test: n/a — no client-to-server payload ships.

Before Phase 2 PASS, run: `gate check PRD-026`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` plus narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT delete a script before its capability exists in the package. Every deletion here
  is the second half of a pair, never the first, and the wiring half is PRD-025 in full.
- DO NOT start while PRD-025 is anything other than Ship Verified.
- DO NOT delete a repo script without deleting its packed twin and removing its installer
  map entry in the same change. Files and entries are two halves of one pair; either alone
  fails the pack-drift check, in opposite directions.
- DO NOT delete the scripts while the root bundle still lists them. The member list is part
  of FR-3, not a consequence of it.
- DO NOT reintroduce a named-file predicate into the durable-artifacts parser under any
  name. An extension test drops `LICENSE`, a leading-capital test drops `justfile`, and an
  allowlist drops `BUILD` and `WORKSPACE`; all three were tried and reverted.
- DO NOT verify any FR with a command this PRD deletes. An earlier version of this work
  verified its CI requirement with the very script it removed, and five independent review
  rounds did not notice.
- DO NOT assert the upgrade fixture against the pure planner. It returns actions and writes
  nothing; the invariant lives in the executor. A fixture that cannot fail for its stated
  reason is worse than none, because it reports as coverage.
- DO NOT assert that a removed pack path is "reported skipped". It is absent from the plan,
  so it is in neither list; asserting skipped passes for the wrong reason.
- DO NOT write the mutation check as "re-add the map entry". The planner reads every mapped
  source eagerly, so that raises a missing-file error before the assertion. Restore a
  readable source too, or inject the action directly.
- DO NOT ship an assert-absent here without its positive control. Both declared Memory
  Inputs say so, and an earlier version of this fixture violated both while citing them.
- DO NOT tell an adopter to "re-record" their exceptions. The stores differ in key, value,
  and failure mode; apply the conversion rule and prove it against a retained copy of the
  real eight-entry array, because this repository's own copy is empty and will never
  exercise it.
- DO NOT let the migration step count drift between FR-5, FR-7, and the changeset. There
  are five steps; an earlier version said four in two places while listing five.
- DO NOT make `gate init` delete, overwrite, or prune anything to force the migration. The
  additive-only invariant is not this PRD's to trade away, and the fixture's non-mutation
  assertion exists to catch an attempt.
- DO NOT claim that adopters "move with us". They move when they run the migration; state
  the fresh-install and existing-install cases separately every time.
- DO NOT call the CI steps or the root bundle membership "inert" in the rollback. CI names
  them.
- DO NOT edit the source snapshot or any historical work-item artifact to satisfy FR-6.
  Both are historical by construction.
- DO NOT assume `sharedAppendOnly` covers `AGENT_BOOTSTRAP.md` or `_prds/README.md`. The
  default set is exact paths and matching is exact-string; both are claimed, and an earlier
  version left them unclaimed on that false assumption.
- DO NOT prove the exception conversion with `loadManifest`. A manifest that loads cleanly
  can be a state the wiring audit refuses, which is precisely what the earlier three-step
  rule produced. Prove it through the audit.
- DO NOT put a bare `node …/dist/cli.js` command in `gates.manifest.json`.
  `packageScriptOf` resolves only package-manager invocations, so it resolves to no script
  and fails the audit's first direction. Give it a `package.json` alias or keep it in CI.
- DO NOT add the CLI sweep to CI while leaving the three steps it replaces. That either
  fails on missing scripts or runs the same rules twice — the state this PRD ends.
- DO NOT write the decision record inside this PRD. It is a precondition (FR-8); if it is
  absent, stop.
- DO NOT build a ledger fixture that is red because the decision record is missing. Every
  negative mutates one green baseline and asserts the specific issue it introduces.
- DO NOT rewrite `STATUS.md`'s historical activity log to satisfy FR-6. It is a record of
  what happened; exclude it explicitly and assert the exclusion does not swallow the live
  board.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-28 | Claude Fable 5, retro action 5 | **Four missing memory-input dispositions added; `gate check PRD-026` green again.** The corpus went red when active records' watches began overlapping this PRD's declared targets — two at creation (`scope-out-the-layer-the-rounds-keep-hitting` and `a-rule-corrected-survives-where-it-is-restated`, both watching `_prds/README.md`, an FR-6 target), one on `init.ts` (`shipped-content-needs-a-delivery-gate` — applied: deleting PACK_MAP entries is a delivery change and FR-5's production-init upgrade fixture is the installed-side proof), and one arriving the same day this fix landed (`gate-run-resume-after-archive`, created by PRD-035's close, watching `run/**`). Each disposition states what was done about the record rather than editing any record to quiet the gate. No FR, target, or Value change |
| 2026-07-27 | Claude Opus 5, on owner direction | **Iteration-1 remediation (Codex, seven [P1]s), plus the owner's ledger decision.** **New FR-8 takes the class ledger from PRD-025, as a repo-class check.** The decision record's own test says repo: the ledger governs which files exist under this repository's scripts directory, not the method's artifacts. That closes finding A by construction — one PRD now owns both the ledger and the deletions whose rows it must lose, so the transition is one commit instead of a cross-PRD contract nobody held. The schema, the three classes, the decision-record comparison, and the rule that every negative fixture mutates one green baseline are all specified rather than left to Phase 4. **(D) the exception conversion gains its missing third step and its real proof.** The reviewer executed the documented three-step rule and `auditWiring` rejected all five survivors as stale, because they are wired here — a manifest the loader accepts is not a state the audit accepts. The rule now drops already-wired survivors and the fixture asserts through the audit. **(C) FR-1 gains the two predicates the deleted script had**: candidate selection by filename pattern, and an expected identifier derived from the filename and passed, since `validateReviewArtifactFile` defaults it away and a sweep without it accepts a valid review for the wrong PRD. **(B) FR-4's CI change is a replacement, not an addition**, and the manifest entries are enumerated — with the reason a bare `node dist/cli.js` entry cannot go there: `packageScriptOf` resolves only package-manager invocations. **(E) seven documents, not six** — `STATUS.md` matches, and its historical activity log is excluded by the precedent PRD-021 already sets, with the exclusion itself asserted. **(F) both FR-6 targets are claimed**: `sharedAppendOnly` is a set of exact paths matched by exact string and covers neither, correcting a false assumption; `changeset-entry.test.ts` and `pack.test.ts` are claimed too. **(G) FR-5 points at `pack.test.ts`**, which is where the shipped-file allowlist is actually asserted. **(H) the parser metric is narrowed** to token extraction, since the package retains two section readers by a recorded deferral. **(I) the non-empty justification contract is stated** as the length check it currently is |
| 2026-07-27 | Claude Opus 5, on owner direction | **Split from PRD-023 (owner decision, 2026-07-27), carrying its FR-2, FR-3, FR-5, FR-8 and FR-9.** PRD-023 sat between 6.65 and 7.19 across four independent rounds; the recorded diagnosis was size. Five things change in the carry-over rather than being copied, all from PRD-023's iteration-6 findings. **FR-4's verification no longer names a deleted script** — the predecessor verified its CI requirement with `pnpm verify:gates-wired`, the script it removes, and five rounds missed it (finding T). **FR-5's mutation check is rewritten** — re-adding an installer-map entry whose file the same change deletes raises a missing-file error before the assertion, so the check failed on pack readability rather than the contract (finding V). **The migration is five steps everywhere** — the predecessor split the exceptions conversion into its own step while two other places still said four (finding W). **FR-6 is new and larger than the finding that prompted it** — the review named three live documents still instructing readers to run the deleted checks; re-measuring found **six**, three of them shipped inside the package, and one of those is `NEXT_STEPS.md`'s registration instructions, which are what created the duplication at every adopter in the first place (finding X, extended). **FR-2's parser reconciliation is re-measured** — two divergences are live and the third is retired, because the package side was fixed and the script side was not. Created with `gate new` |
