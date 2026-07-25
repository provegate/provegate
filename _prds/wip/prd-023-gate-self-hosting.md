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
> duplicates. No application behavior changes, but the surface is user-facing: two new
> CLI flags, new public config keys, and three scripts removed from the published
> practices pack — so it ships as a minor release (FR-9), not as an internal cleanup.
> **Autonomous Close**: operator-gated
> **Value**: 4.25 (MF/UI/TL/AR/RM: 5/4/4/5/3)

<!-- 0.25*5 + 0.25*4 + 0.20*4 + 0.15*5 + 0.15*3 = 4.25. Drafted by the author and left
     unchanged by readiness iteration 1: its findings were omissions in the plan, not a
     change in the item's value. -->

---

## 1. Introduction / Overview

Three rules about the method's own artifacts are implemented **three times** — once inside
`packages/provegate`, once as a `scripts/verify/` script this repo's CI runs, and once
again in `packages/provegate/practices/verify/`, which the package **publishes** and
`gate init --practices` **installs into every adopter repo**. In all three cases the
package copy is the stronger one, and the two weaker copies are the ones that actually
execute — here and at adopters.

**The third copy was missed by two rounds of review and found by the independent one, and
it changes the shape of this PRD.** Measured 2026-07-25:

- `packages/provegate/practices/verify/` ships `verify-review-artifact.mjs`,
  `verify-durable-artifacts.mjs`, and `verify-gates-wired.mjs`.
- `core/run/init.ts`'s `PACK_MAP` installs each at `scripts/verify/…` in the adopter's
  repo, along with `gates-wired-exceptions.json`.
- The packed bundle `practices/verify/verify-workflow.mjs` lists `verify-gates-wired.mjs`
  among its six `CHECKS`.
- `scripts/verify/verify-pack-drift.mjs` parses `PACK_MAP` out of `init.ts` as its single
  source of pairing and fails with *"pack ships 'X' but this repo has no 'Y' — the live
  layer lost its copy"* whenever a mapped destination is absent.

So deleting only the root scripts would red `pnpm verify:pack-drift`, which §11's floor
requires green — and it would leave every adopter on the weaker rule while this repo moved
to the stronger one, which inverts the PRD's own goal. The packed
`gates-wired-exceptions.json` also carries **eight entries** where the root copy is `[]`,
so "the file is empty, nothing migrates" was true of the wrong copy.

| Rule | Package implementation | Root script (this repo's CI) | Packed script (every adopter) |
| ---- | ---------------------- | --------------------- | ----- |
| Independent-review schema | `core/gates/review.ts` (161 lines): verdict, `Critical: 0` contract, `N/M pass` quorum arithmetic against the 3/5 panel gate, a guard so `0 forged` cannot satisfy the contract | `verify-review-artifact.mjs` (34 lines): verdict and critical only | `practices/verify/verify-review-artifact.mjs` |
| Durable artifacts | `core/run/durable.ts` + `chain.ts`: declared paths must appear in the merge diff | `verify-durable-artifacts.mjs` (60 lines): the same rule, a different parser | `practices/verify/verify-durable-artifacts.mjs` |
| Wire-or-delete | `core/gates/wiring.ts` (212 lines): manifest→script existence **and** script→executing-surface, with shrink-only exceptions | `verify-gates-wired.mjs` (75 lines): one direction of the same audit, plus one the package lacks | `practices/verify/verify-gates-wired.mjs` + a non-empty `gates-wired-exceptions.json` |

The two durable-artifact parsers have **already diverged**, in three ways: the package
drops a claimed path containing no `/`, the script does not; the script ignores `*`, the
package does not; and the package collects every backticked span on a bullet where the
script collects only the first. That is the same defect class as the `declaredGlobs` bug
PRD-021 FR-13 exists to fix — found once, in one copy, while the other copy kept its own
version of the rule.

The cause is structural, not accidental. This repo dogfoods the CLI's **lifecycle**
(`gate open`, `gate run`, `gate land` are how PRDs are claimed and closed) but not its
**gate policy**. As this wave opened, `gate` appeared in no `package.json` script, no CI
step, and no git hook — so every gate we build for adopters got a second, weaker
implementation for ourselves. (PRD-021 FR-8 closes the CI half of that first; see FR-5.)

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
- [ ] Leave exactly one implementation of each of the three duplicated method rules —
      counting the **published** copy, not only this repo's (FR-8).
- [ ] Move adopters onto the stronger rule rather than stranding them on the weaker one.
- [ ] Keep every guarantee that exists today: the corpus-wide sweeps the scripts perform,
      the one audit direction the package lacks, **and the three executing-surface kinds
      it also lacks** (FR-4b) — a guarantee with no current occupant is still a guarantee.
- [ ] Make a future duplicate fail mechanically rather than pass review.
- [ ] Put `gate` on this repository's **manifest-driven** surface, where `gate run`
      executes it as phase policy rather than as one more CI line.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Method rules with more than one implementation | 3 (each implemented 3×: package, root script, packed script) | 0 | the class ledger + the pack manifest |
| Checks an adopter loses by upgrading | n/a | 0 | `NEXT_STEPS.md` names the replacing CLI flag for each (FR-8) |
| Parsers of the Durable Artifacts section | 2 (divergent) | 1 | the script is deleted |
| Audit directions lost by deleting the scripts | n/a | 0 | on-disk→registered lands in `auditWiring` |
| Executing-surface kinds lost by deleting the scripts | n/a | 0 | hooks, bundle body, and sibling script bodies land in `auditWiring` (FR-4b) |
| Repo surfaces that invoke `gate` | measure at Phase 4 (PRD-021 adds one first) | the root manifest plus at least 1 CI step | CI workflow text + `gates.manifest.json` |
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

   **A comparison needs something parseable to compare against, so the ADR's shape is
   specified here even though the ADR is written elsewhere.** ADR-0002 must carry a
   table under a `## Classification` heading with exactly two columns —
   `| Script | Class |` — one row per `scripts/verify/verify-*.mjs`, `Class` being
   `repo`, `method`, or `method-pending`. The check parses that table and diffs it against
   `script-classes.json`; a disagreement, a script in one and not the other, or an
   unparseable table each fail. Binding the check to prose would make it a check of
   whatever the parser happened to tolerate.

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

   **This flag covers review records only.** FR-3 adds a second, separate flag for the
   Durable Artifacts sweep rather than overloading this one — two unrelated rules over two
   unrelated sections of two unrelated documents should not share a name that describes
   one of them.

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
   it corpus-wide through **its own flag, `gate check --durable-artifacts`**, beside
   FR-2's. Then delete `scripts/verify/verify-durable-artifacts.mjs` and its
   `package.json` entry.

   **What the declaration lint accepts is stated, because this PRD's own section is the
   awkward case.** A section satisfies the lint when it holds at least one bullet, and
   every bullet either extracts to at least one path under the reconciled parser **or** is
   an explicit `none`. Mixing is legal: this PRD declares two real paths and a
   `Decision: none` bullet, and that must pass — a `none` beside real claims means "this
   axis has no durable output", not "this section is empty". What fails is a section that
   is absent, that holds no bullets at all, or that holds a bullet which is neither a
   `none` nor a path-bearing claim — the case the deleted script already reported at
   `verify-durable-artifacts.mjs:34`.

   **This lint is strictly stricter, so it takes the same corpus pass FR-7 requires.** Run
   it across every wip PRD before it lands and report any newly failing section rather than
   editing the artifact to fit the new rule.

   **The two parsers disagree in three ways and the merged one must pick deliberately.**
   The package's `declaredArtifacts` (`durable.ts:17-23`) drops any backticked value
   without a `/` and any value containing `{` or `}`; the script
   (`verify-durable-artifacts.mjs:35`) ignores values containing `{`, `}`, or `*` and has
   no `/` rule; and — the third, which an earlier draft missed while claiming the list was
   complete — the package uses `matchAll` and collects **every** backticked span on a
   bullet while the script uses `exec` and collects only the **first**, so a bullet
   declaring two paths is two claims to one parser and one to the other. Keep the package
   behavior on both extraction points (all spans, `/`-and-brace handling as the base), and
   adopt the script's `*` exclusion, because an unfilled template placeholder may be a
   glob.

   **The `/` rule is replaced by PRD-021 FR-13's predicate** (owner decision of
   2026-07-25, §9 Q2) — the same literal named-file and dotfile test that PRD already
   specifies for Conflict Surface claims. One predicate for two sections, which is this
   PRD's thesis applied to itself.

   **That reuse is a contract, and PRD-021 now carries it.** The independent readiness
   round found that PRD-021 specified the predicate's *behavior* but named only
   `declaredGlobs` and `parseConflictSurface` as targets, so nothing obliged it to expose
   a callable one — leaving this PRD's Phase 4 to either duplicate the logic (the exact
   defect this PRD exists to remove) or edit `markdown.ts` out of scope. PRD-021 FR-13(a′)
   now exports `isRootRelativeFilename(token: string): boolean` from
   `packages/provegate/src/core/state/markdown.ts` with its own tests. This FR imports it.
   If that export is absent when Phase 4 starts, the PRD-021 prerequisite was not actually
   met — stop, exactly as FR-1 treats a missing ADR.

   **The corpus measurement, re-run 2026-07-25 with the package's own extraction over all
   23 PRDs.** Fourteen slash-less tokens appear in `## Durable Artifacts` sections, and
   they fall into three groups, not one:

   - **2 real claims the current `/` rule silently drops** — `workflow.config.json`
     (PRD-001) and `RELEASING.md` (PRD-005). The predicate accepts both.
   - **8 prose tokens** — `status`, `queue` (PRD-001), `run`, `land`, `check` (PRD-002),
     `gate new` (PRD-006), `--worktree` (PRD-007), `commands` (PRD-015). The predicate
     rejects all eight: seven for carrying no dot, `gate new` for whitespace.
   - **4 backticked `none` tokens** (PRD-001, PRD-002, PRD-020, PRD-023), which never
     reach the predicate — `durable.ts:21` drops them by a separate rule.

   All fourteen are the fixture, grouped as above so the `none` rule is exercised rather
   than assumed. **No wip PRD is affected** — the only slash-less tokens in wip PRDs are
   two of the `none`s — so the Phase 7 gate gets stricter with zero effect on the
   in-flight wave. An earlier draft reported eleven tokens and listed `lucide-react` among
   the prose rejections; that token appears in PRD-014's Non-Goals and Technical
   Considerations, not in any Durable Artifacts section. The conclusions were right and
   the evidence was not, which in a PRD that answers an open question "by measurement, not
   preference" is the part that had to be fixed.
   - **Targets:** `packages/provegate/src/core/run/durable.ts::declaredArtifacts`,
     `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`,
     `packages/provegate/src/cli.ts::runCheck`,
     `scripts/verify/verify-durable-artifacts.mjs` (deleted),
     `package.json`,
     `packages/provegate/test/self-hosting.test.ts`
4. **FR-4 — Wire-or-delete: close the missing direction *and* the missing surfaces before
   deleting the script.** The two implementations differ in two ways, not one, and an
   earlier draft of this FR named only the first.

   **(a) The missing direction.** `auditWiring` audits manifest→script existence
   (`wiring.ts:165`) and script→executing-surface (`wiring.ts:191`).
   `verify-gates-wired.mjs` additionally audits **on-disk→registered**: every
   `scripts/verify/verify-*.mjs` on disk must be registered in `package.json`. Deleting
   the script without porting that would let an unregistered script sit on disk unnoticed
   — the exact silence the meta-gate exists to prevent. Add it to `auditWiring`, driven by
   config rather than a hardcoded path.

   **(b) The missing surfaces, in the direction they share.** The two also disagree about
   what *counts* as an executing surface, and the package sees strictly less:

   | Surface | `verify-gates-wired.mjs` | `auditWiring` |
   | ------- | ------------------------ | ------------- |
   | Manifest commands | no | **yes** |
   | CI workflow files | whole file, comments stripped | `run:` text only |
   | The git-hooks directory | **yes** — hardcoded `.githooks/` | no |
   | The `verify-workflow.mjs` bundle body | **yes** — hardcoded path | no |
   | `package.json` script bodies **not** matching the verify prefix | **yes** | no |

   Three surface kinds would leave with the deletion, so a check wired only through a git
   hook, only through bundle membership, or only through another script's body would
   newly report as "wired nowhere". **Measured impact today is zero** — no `.githooks/`
   file references a `verify:` script and every current check has its own CI step — which
   is exactly why this would pass Phase 6 unnoticed and surface later as a check that was
   wired all along.

   Port all three into `auditWiring`'s surface set, and **because this is shipped package
   code rather than a repo script, both hardcoded paths become config** — the same rule
   FR-4(a) already applies to the on-disk directory. `.githooks/` is this repository's
   choice, set by `package.json`'s `prepare` script
   (`git config core.hooksPath .githooks`); an adopter may use `.husky`, the default
   `.git/hooks`, or none. A hooks directory that does not exist is simply not a surface,
   not an error.

   **The config keys are named here, not left to Phase 4.** Add a `wiring` object to
   `WorkflowConfig`:

   | Key | Type | Default | Meaning |
   | --- | ---- | ------- | ------- |
   | `wiring.scriptsDir` | `string` | `scripts/verify` | Directory walked by the on-disk→registered direction (a) |
   | `wiring.hooksDir` | `string` | `.githooks` | Git-hooks directory read as an executing surface (b) |
   | `wiring.bundlePath` | `string` | `scripts/verify/verify-workflow.mjs` | Bundle whose body counts as an executing surface (b) |

   All three are repo-relative paths. Semantic validation rejects an absolute path, a path
   escaping the repo root via `..`, and a non-string; it does **not** require the paths to
   exist, because absence is a legitimate configuration (an adopter with no git hooks) and
   FR-4(b) already defines absence as "not a surface". `verifyScriptPattern` already exists
   and is unchanged — it stays the selector for both direction 2 and the new exclusion.
   - **Added targets for this sub-part:** `packages/provegate/src/core/config/defaults.ts`,
     `packages/provegate/src/core/config/validate.ts`,
     `packages/provegate/test/config-wiring.test.ts` (new)

   **The third row's exclusion is load-bearing and must be ported exactly.** The script
   pushes only script bodies whose name does **not** match the verify prefix
   (`verify-gates-wired.mjs`: `if (!name.startsWith('verify:'))`). Including verify-prefixed
   bodies would let checks wire each other: a `verify:a` whose body invokes `verify:b`
   would mark `verify:b` wired even if nothing invokes `verify:a`, and a bundle that names
   every member would mark them all wired by existing. Use `config.verifyScriptPattern`
   for the exclusion so it stays consistent with the direction-2 selector immediately
   above it.

   Keep the CI reading as `run:` text: that is a deliberate narrowing (a script named in a
   YAML comment is not wired), and it is the one difference that makes the package
   stricter rather than weaker, so it stays and is stated here rather than silently
   reconciled.

   Then delete `scripts/verify/verify-gates-wired.mjs` and its `package.json` entry.

   **(c) One exceptions store survives, and it is the manifest's.** `auditWiring` reads
   `manifest.wiringExceptions` — `Record<string, string>`, name → reason
   (`gates/manifest.ts:38`) — while the script reads
   `scripts/verify/gates-wired-exceptions.json`, a bare array. The manifest's shape is
   strictly better (it carries the justification the shrink-only policy depends on), it is
   already what the surviving implementation reads, and the file is empty today, so
   nothing migrates: **delete the file with the script.** No other PRD claims it —
   `gate queue` confirms PRD-021's surface does not include it, correcting an earlier
   draft of this PRD's overlap prose. Shrink-only remains the policy, now enforced by
   `auditWiring`'s existing stale-exception check (`wiring.ts:205`).
   - **Targets:** `packages/provegate/src/core/gates/wiring.ts::auditWiring`,
     `packages/provegate/src/core/config/types.ts`,
     `packages/provegate/src/core/config/defaults.ts`,
     `packages/provegate/src/core/config/validate.ts`,
     `scripts/verify/verify-gates-wired.mjs` (deleted),
     `scripts/verify/gates-wired-exceptions.json` (deleted),
     `gates.manifest.json`,
     `package.json`,
     `packages/provegate/test/wiring.test.ts`,
     `packages/provegate/test/config-wiring.test.ts` (new)
5. **FR-5 — Root manifest and CI run the CLI.** PRD-018 creates the root
   `gates.manifest.json` naming `verify:workflow` as one Phase 4 command. Replace that
   single bundle entry with the checks it wraps, so a check that later moves into the
   package changes one manifest line and nothing else. Add a CI step that runs the built
   CLI's sweeps after `pnpm build`.

   **That step is not the first `gate` invocation on this repository's CI, and the claim
   is dropped rather than defended.** PRD-021 FR-8 — a declared prerequisite of this PRD —
   adds `verify:value-score` as `node packages/provegate/dist/cli.js check --value-score`
   on the same build-dependent job, and lands first by this PRD's own ordering. What this
   FR actually contributes is the second and third sweeps and, more importantly, the
   **manifest-driven** surface: PRD-021 puts `gate` in a `package.json` script that CI
   runs, while this PRD puts the checks into `gates.manifest.json`, where `gate run`
   executes them as phase policy. That is the difference worth stating, and §1's
   "`gate` appears in no `package.json` script, no CI step, and no git hook" is likewise a
   statement about the tree as it stands **before this wave**, not at this PRD's Phase 4.

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

8. **FR-8 — Retire the packed duplicates, so adopters move with us.** Owner decision of
   2026-07-25 after the independent readiness round: expand scope rather than ship a
   half-consolidation. Each of FR-2, FR-3, and FR-4 deletes a root script; this FR deletes
   its packed twin in the same change, and rewires the pack so the deletion is coherent
   rather than merely tolerated.

   **What goes.** `practices/verify/verify-review-artifact.mjs`,
   `practices/verify/verify-durable-artifacts.mjs`,
   `practices/verify/verify-gates-wired.mjs`, and
   `practices/verify/gates-wired-exceptions.json`.

   **What must move with them, or the delete does not land.**

   - `core/run/init.ts` — remove the four `PACK_MAP` entries. This is the load-bearing
     step: `verify-pack-drift.mjs` parses `PACK_MAP` out of this file as its *single
     source of pairing*, so a pair disappears only when its entry does. Deleting files
     while leaving entries produces the "the live layer lost its copy" failure; deleting
     entries while leaving files produces the "neither in PACK_MAP nor declared in
     packOnly[]" failure. Both halves, one commit.
   - `practices/verify/verify-workflow.mjs` — drop `verify-review-artifact.mjs`,
     `verify-durable-artifacts.mjs`, and `verify-gates-wired.mjs` from `CHECKS`, leaving
     `verify-brain.mjs`, `verify-deferred.mjs`, and `verify-test-task-coverage.mjs`. The
     packed bundle keeps existing; it just stops running rules the CLI now owns.
   - `scripts/verify/pack-drift-ledger.json` — remove the four pair entries and reconcile.
   - `packages/provegate/test/pack-manifest.json` and its test — the shipped-file
     allowlist must shrink with the pack, or the manifest test fails on files that no
     longer exist.
   - `practices/NEXT_STEPS.md` — tell adopters what replaced the three scripts:
     `gate check --review-artifacts`, `gate check --durable-artifacts`, and
     `gate check --wiring`. **An adopter who upgrades must not silently lose three
     checks**; this sentence is the migration, and FR-9's changeset note points at it.

   **Why deletion rather than "make the packed copies thin CLI wrappers".** A wrapper is a
   fourth thing to keep agreed, and the pack's whole point is that adopters get the method
   — which they now get from `gate`, a dependency they already have. The one real cost is
   stated rather than hidden: an adopter who runs the packed bundle without the CLI on
   PATH loses those three checks until they run the CLI. That is why `NEXT_STEPS.md` is a
   required target and not a courtesy.
   - **Targets:** `packages/provegate/practices/verify/verify-review-artifact.mjs` (deleted),
     `packages/provegate/practices/verify/verify-durable-artifacts.mjs` (deleted),
     `packages/provegate/practices/verify/verify-gates-wired.mjs` (deleted),
     `packages/provegate/practices/verify/gates-wired-exceptions.json` (deleted),
     `packages/provegate/practices/verify/verify-workflow.mjs`,
     `packages/provegate/practices/NEXT_STEPS.md`,
     `packages/provegate/src/core/run/init.ts::PACK_MAP`,
     `scripts/verify/pack-drift-ledger.json`,
     `packages/provegate/test/pack-manifest.json`,
     `packages/provegate/test/practices-pack.test.ts`
9. **FR-9 — Ship it as a release, because this is a user-facing change.** The header's
   class rationale used to say "no application behavior and no new user-facing feature".
   That is false: this PRD adds two public CLI flags (`gate check --review-artifacts`,
   `gate check --durable-artifacts`), new public config keys (FR-4), and it **removes
   three scripts from the published practices pack**. Add a changeset declaring a
   **minor** bump whose note names the two new flags, the new config keys, and the
   packed-script removal with its `NEXT_STEPS.md` migration line.

   Evidence is one semantic assertion over a single entry, not two greps — the same shape
   PRD-021 FR-12 adopts, and for the same reason: independent greps are satisfied by two
   different files.
   - **Targets:** `.changeset/` (new entry),
     `packages/provegate/test/changeset-entry.test.ts` (extended; PRD-021 creates it)
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
- **Turning the packed scripts into thin CLI wrappers instead of deleting them** (FR-8).
  A wrapper is a fourth artifact to keep agreed, and adopters already have the CLI as a
  dependency. The residual — an adopter running the packed bundle without `gate` on PATH
  loses three checks — is stated in FR-8 and mitigated by `NEXT_STEPS.md`, not denied.
- **Adding placeholder substitution to `gate init`.** PRD-021 FR-10 leaves
  `{{VALUE_AXES_TABLE}}` rendered-with-a-note rather than substituted; this PRD touches
  `init.ts` only to remove `PACK_MAP` entries.
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
- **Given** a registered check wired **only** through a `.githooks/` file, **When** the
  wiring audit runs, **Then** it passes; and likewise for one wired only through the
  `verify-workflow.mjs` bundle body, and one wired only through another `package.json`
  script's body. These are the three surfaces that would otherwise be lost with the
  deleted script.
- **Given** a check named only inside a YAML **comment** in a CI workflow, **When** the
  audit runs, **Then** it still fails — the package reads `run:` text, and that narrowing
  is deliberate.
- **Given** a repo whose configured hooks directory does not exist, **When** the audit
  runs, **Then** it completes with that surface simply absent, not an error.
- **Given** a bundle script whose body names every one of its members, **When** the audit
  runs, **Then** those members are **not** thereby wired — verify-prefixed script bodies
  are excluded from the surface set.
- **Given** a Durable Artifacts section holding two real paths and one explicit `none`
  bullet — this PRD's own shape — **When** the declaration lint runs, **Then** it passes;
  **given** a section holding a bullet that is neither, **Then** it fails.
- **Given** a new script with no entry in the class ledger, **When** the audit runs,
  **Then** it fails.
- **Given** a ledger entry classed as a method rule whose CLI surface exists while the
  script also still exists, **When** the audit runs, **Then** it fails.
- **Given** a ledger entry whose `reviewBy` date has passed, **When** the audit runs,
  **Then** it fails as expired.
- **Given** the three scripts are deleted, **When** the full verification floor runs,
  **Then** it is green and no `package.json` entry references a missing file.
- **Given** the packed twins are deleted and their `PACK_MAP` entries removed, **When**
  `pnpm verify:pack-drift` runs, **Then** it passes — neither "the live layer lost its
  copy" nor "neither in PACK_MAP nor declared in packOnly[]" fires.
- **Given** a packed file whose `PACK_MAP` entry was removed but which still exists,
  **When** pack-drift runs, **Then** it fails — the two halves must land together.
- **Given** an adopter reading `NEXT_STEPS.md` after upgrading, **Then** each removed
  script is named alongside the `gate check` flag that replaces it.
- **Given** a `wiring.hooksDir` that is absolute or escapes the repo root, **When** config
  resolves, **Then** it fails with a named issue.

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
- **PRD-021 Ship Verified** — the largest coupling, and now a hard contract rather than a
  sequencing preference. It adds the `--value-score` branch to the same `runCheck`, edits
  `scripts/verify/verify-workflow.mjs`, and its FR-13 changes `declaredGlobs`, which
  FR-3's parser reconciliation must be written against rather than around. **It must also
  have exported `isRootRelativeFilename` from `core/state/markdown.ts`** (its FR-13(a′)) —
  FR-3 imports that symbol, so its absence means the prerequisite was not met. It does
  **not** claim `scripts/verify/gates-wired-exceptions.json`; an earlier draft said it did,
  and `gate queue` reports no such overlap.
- **PRD-022 Ship Verified** — `packages/provegate/src/cli.ts` again.
- **PRD-020 Ship Verified** — new as of this PRD's 2026-07-25 scope expansion, and the
  reason is FR-8: removing three scripts from the pack edits
  `packages/provegate/test/pack-manifest.json`, which PRD-020 also edits for its examples.
  `gate queue` reports the overlap. No design coupling, one shared allowlist.
- This PRD therefore runs **last** in the wave: 017 → 018 → 019 → 021 → 020 → 022 → 023.
  It now overlaps **all five** other PRDs, so its own position is fixed rather than merely
  convenient. That chain remains a valid serialization rather than the only one — PRD-020
  may still run concurrently with PRD-021 or PRD-022 — but the earlier claim that PRD-020
  could also run concurrently with **this** PRD is void: the expansion created the overlap
  that falsified it. That is the second time a "measured, complete" overlap list in this
  wave has gone stale within a day, which is why every claim here says to re-run
  `gate queue` rather than to trust the paragraph.
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
- [ ] Root deletions: `verify-review-artifact.mjs`, `verify-durable-artifacts.mjs`,
      `verify-gates-wired.mjs`, `gates-wired-exceptions.json`, and the three
      `package.json` entries
- [ ] Pack deletions and rewiring (FR-8): the three packed twins +
      `practices/verify/gates-wired-exceptions.json`, the packed bundle's `CHECKS`,
      `init.ts` `PACK_MAP`, `pack-drift-ledger.json`, `test/pack-manifest.json`,
      `practices/NEXT_STEPS.md`
- [ ] `packages/provegate/src/core/config/{types,defaults,validate}.ts` — the `wiring`
      keys (FR-4) + `test/config-wiring.test.ts` (new)
- [ ] `.changeset/` entry (minor, FR-9)
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
FR-13's predicate rather than a second one. The corpus measurement is in FR-3: **fourteen**
slash-less tokens in three groups — 2 real claims the current rule drops, 8 prose tokens
the predicate rejects, and 4 backticked `none`s handled by a separate rule — all classified
correctly, no wip PRD affected. (An earlier draft of this answer said eleven and named
`lucide-react`, which is in PRD-014's Non-Goals rather than any Durable Artifacts section.)

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
- `scripts/verify/pack-drift-ledger.json`
- `gates.manifest.json`
- `.github/workflows/ci.yml`
- `_brain/learnings/notes-column-runs-commands.md`
- `packages/provegate/src/core/config/defaults.ts`
- `packages/provegate/src/core/config/validate.ts`
- `packages/provegate/test/config-wiring.test.ts`
- `packages/provegate/src/core/run/init.ts`
- `packages/provegate/practices/verify/**`
- `packages/provegate/practices/NEXT_STEPS.md`
- `packages/provegate/test/pack-manifest.json`
- `packages/provegate/test/practices-pack.test.ts`
- `.changeset/`

**Almost every path above is contested, and sequencing is the only resolution.** The list
below is what `gate queue` reports on 2026-07-25, not what this PRD believes:

- `packages/provegate/src/cli.ts` — PRD-019, PRD-021, PRD-022.
- `packages/provegate/src/core/gates/prd-ready.ts` — PRD-018, PRD-021.
- `packages/provegate/src/core/run/durable.ts` — PRD-018.
- `scripts/verify/verify-workflow.mjs`, `.github/workflows/ci.yml`, and
  `packages/provegate/src/core/config/types.ts` — PRD-021. The last two were missing from
  an earlier draft of this paragraph, which named three of the five files the queue
  reports for that pair.
- `gates.manifest.json` — PRD-018.
- `_brain/learnings/notes-column-runs-commands.md` — inside `_brain/**`, held by PRD-017
  and claimed by PRD-018.

**`scripts/verify/gates-wired-exceptions.json` is *not* contested.** An earlier draft
listed it as PRD-021's; `gate queue` reports no such overlap and PRD-021's Conflict
Surface does not contain it. FR-4(c) deletes the file, and nothing else claims it.

**The FR-8 scope expansion adds contested paths, and one of them adds a prerequisite.**
Re-measured with `gate queue` after the revision:
`scripts/verify/pack-drift-ledger.json` is claimed by PRD-017 (active lease), PRD-018,
PRD-019, and PRD-021; `packages/provegate/test/practices-pack.test.ts` and
`packages/provegate/src/core/run/init.ts` by PRD-018 and PRD-019;
`packages/provegate/practices/NEXT_STEPS.md` by PRD-019;
`core/config/defaults.ts` and `core/config/validate.ts` by PRD-021 — all PRDs this one
already waited on.

**`packages/provegate/test/pack-manifest.json` is the exception and it is new.** PRD-020
edits that allowlist for its examples; FR-8 edits it because the pack loses three files.
PRD-020 was **not** previously coupled to this PRD, so the expansion promotes it to a
Ship-Verified prerequisite (see Dependencies) and voids the earlier note that PRD-020 could
run concurrently with this PRD. Running last still resolves it. The paragraph this replaced
asserted "no new ordering constraint" before the queue was re-run — which is the mistake
this PRD keeps telling its reader not to make.

This PRD runs last precisely so that every contested path is Ship Verified first. Claiming
them exclusively is what makes an ordering mistake refuse instead of merge. **Run
`gate queue` before claiming** — a PRD's own overlap list is not evidence, as two
corrections to this very paragraph demonstrate.

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
| FR-3 | `pnpm --filter provegate test test/self-hosting.test.ts`        | pkg   | declaration lint per PRD and corpus-wide; one parser, three divergences reconciled; the mixed real-paths-plus-none section passes; all 14 corpus tokens classified |
| FR-4 | `pnpm --filter provegate test test/wiring.test.ts`              | pkg   | an unregistered on-disk script fails the audit |
| FR-4 | `pnpm --filter provegate test test/wiring.test.ts`              | pkg   | hooks, bundle body, and sibling script bodies each count as an executing surface; a YAML comment still does not |
| FR-5 | `pnpm verify:gates-wired`                                       | repo  | replaced by the CLI audit; every manifest command resolves |
| FR-6 | `pnpm --filter provegate test test/wiring.test.ts`              | pkg   | unclassified, superseded-but-present, stale, and expired entries all fail |
| FR-7 | `pnpm --filter provegate test test/self-hosting.test.ts`        | pkg   | a Notes-column backtick is not a command; an open question mentioning the word is still counted |
| FR-7 | `pnpm verify:workflow`                                          | repo  | the stricter lints pass over the live corpus |
| FR-8 | `pnpm verify:pack-drift`                                        | repo  | pairs removed from both sides; no orphan packed file, no lost live copy |
| FR-8 | `pnpm --filter provegate test test/practices-pack.test.ts`      | pkg   | the shipped allowlist shrank with the pack and the packed bundle lists three checks |
| FR-9 | `pnpm --filter provegate test test/changeset-entry.test.ts`     | repo  | one entry declares provegate minor and names the flags, config keys, and pack removal |
| FR-4 | `pnpm --filter provegate test test/config-wiring.test.ts`       | pkg   | scriptsDir, hooksDir, bundlePath defaults, and absolute-or-escaping paths rejected |

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
- DO NOT port only that direction. The script also counts the git-hooks directory, the
  `verify-workflow.mjs` bundle body, and non-verify `package.json` script bodies as
  executing surfaces, and `auditWiring` counts none of them (FR-4(b)). Zero checks depend
  on those surfaces today, which is exactly why omitting them would survive Phase 6 and
  bite later — "no current occupant" is not "no guarantee".
- DO NOT carry the script's hardcoded `.githooks/` and bundle paths into the package.
  This repo sets `core.hooksPath` in its `prepare` script; an adopter may use `.husky` or
  the git default. Both paths come from config, and an absent directory is not a surface
  rather than an error.
- DO NOT count verify-prefixed script bodies as executing surfaces when porting the third
  row. The script excludes them deliberately: without that exclusion a bundle listing its
  own members marks them all wired by existing, and two checks naming each other wire
  themselves.
- DO NOT widen the CI reading from `run:` text to the whole workflow file to close that
  gap. The narrower reading is correct: a check named in a YAML comment is not wired.
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
- DO NOT delete a root script without deleting its packed twin and removing its `PACK_MAP`
  entry in the same change. Files and entries are two halves of one pair; landing either
  alone fails `verify:pack-drift`, in opposite directions.
- DO NOT treat `scripts/verify/gates-wired-exceptions.json` as representative of the
  packed one. The root copy is `[]`; the packed copy carries eight entries.
- DO NOT delete the packed scripts without adding their replacement flags to
  `NEXT_STEPS.md`. An adopter who upgrades and silently loses three checks is a worse
  outcome than the duplication this PRD removes.
- DO NOT ship this without a changeset. Two public CLI flags, new config keys, and three
  files removed from a published pack are a user-facing surface change.
- DO NOT duplicate PRD-021's filename predicate. It is exported as
  `isRootRelativeFilename`; if that export is missing, the prerequisite was not met — stop.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-25 | Cursor | Initial draft. Scoped out of the duplication analysis of 2026-07-25: three method rules are implemented twice, the package copy is stronger in all three, and the script copy is the one CI runs. Created with `gate new`. Three open questions for the owner |
| 2026-07-25 | Cursor, on owner direction | All three open questions resolved, and the resolutions changed the shape of the PRD rather than just filling blanks. **Q2** is answered by measurement, not preference: PRD-021 FR-13's predicate classifies all eleven slash-less Durable Artifacts tokens in the corpus correctly and affects no wip PRD, so FR-3 reuses that predicate instead of inventing a second one. **Q1** keeps `verify:workflow`, and FR-5 now says *why* the end state is not yet reachable — two of the six remaining checks are method rules. **Q3** puts both pending entries on 2026-10-01, and there are two: the owner also decided PRD-017 ships as designed, so `verify-brain` becomes an accepted duplicate recorded with a date rather than a defect. **FR-1 inverts**: ADR-0002 lands ahead of the wave as a precondition, because a decision shipping with the last PRD binds none of them — so this PRD owns the mechanical ledger-vs-ADR link instead of the document. **FR-7 is new**: the two lint false-negatives found while drafting, both a whole-line match where a scoped one is meant |
| 2026-07-25 | Claude Opus 5, via owner | Sequencing note only — no FR, Target, Conflict Surface entry, dependency, or verification command changed. The wave-order line now records that the chain is a valid serialization rather than a required one: `gate queue` measures PRD-020 as overlapping PRD-019 alone, so PRD-020 may run concurrently with PRD-021, PRD-022, or this PRD. This PRD's own position is unchanged — it overlaps four of the five others and still runs last. Readiness iteration 1 (ITERATE 7.95) is recorded in `_readiness/wip/readiness-023-gate-self-hosting.md`; W1–W8 there are unaddressed by this edit |
| 2026-07-25 | Claude Opus 5, via owner | **Readiness iteration 1 remediation (W1–W8).** The blocking item was W1 and it was the same defect class the PRD exists to prevent: FR-4 ported the missing audit *direction* but not the missing *surface set*. `auditWiring` counts manifest commands and CI `run:` text; the `verify-gates-wired.mjs` it deletes also counts `.githooks/*`, the `verify-workflow.mjs` bundle body, and every other `package.json` script body — three surface kinds that would have left with the deletion against a Goal promising no lost guarantee. Measured impact today is zero, which is why it would have passed Phase 6 unseen. **FR-4 is now three parts** (direction, surfaces, exceptions store) with the comparison table inline, and keeps the package's narrower `run:`-only CI reading as a deliberate strengthening rather than reconciling it away. **FR-4(c) settles the exceptions store** (W2): `manifest.wiringExceptions` survives because it carries the justification shrink-only depends on and is already what the surviving implementation reads; `gates-wired-exceptions.json` is empty and is deleted with the script. That also corrected a false claim — `gate queue` shows PRD-021 does **not** claim that file, and the overlap paragraph named three of the five files the queue actually reports for the PRD-021 pair (W8). **The FR-3 corpus measurement is re-run and regrouped** (W3): 14 slash-less Durable Artifacts tokens, not 11 — 2 real claims, 8 prose tokens, 4 backticked `none`s that never reach the predicate — and `lucide-react` is dropped, since it lives in PRD-014's Non-Goals rather than any Durable Artifacts section. The conclusions were always right; the evidence had to match them in a PRD that answers an open question by measurement. **FR-5 drops the "first `gate` invocation" claim** (W4), which PRD-021 FR-8 takes first by this PRD's own ordering, and restates the real contribution as the manifest-driven surface. **FR-3 gets its own `--durable-artifacts` flag** instead of riding FR-2's review-record flag (W5), **states what the declaration lint accepts for mixed sections** using this PRD's own two-paths-plus-`none` shape (W6), and **names the third parser divergence** — `matchAll` versus `exec`, all spans versus the first (W7). Value unchanged at 4.25; iteration 1 did not move it. **Written by the same session that scored iteration 1 — the next round must be independent of it** |
| 2026-07-25 | Claude Opus 5, on owner direction | **Independent-round remediation (Codex iteration 3, four [P1]s). Owner decision: expand scope to the practices pack.** The blocking finding reframed the PRD: the three "duplicate" scripts are implemented **three** times, not twice. `packages/provegate/practices/verify/` ships all three, `core/run/init.ts`'s `PACK_MAP` installs them into every adopter repo, the packed `verify-workflow.mjs` bundle runs `verify-gates-wired.mjs`, and `verify-pack-drift.mjs` — which parses `PACK_MAP` as its single source of pairing — fails when a mapped destination disappears. So the root-only deletion would have redded `pnpm verify:pack-drift`, which §11's own floor requires green, while leaving adopters on the weaker rule as this repo moved to the stronger one. The packed `gates-wired-exceptions.json` also carries eight entries where the root copy is `[]`, so FR-4(c)'s "the file is empty" was true of the wrong copy. **New FR-8** deletes the packed twins and rewires the pack: `PACK_MAP` entries, the packed bundle's `CHECKS`, the drift ledger, the pack manifest and its test, and `NEXT_STEPS.md` — the last is a required target, not a courtesy, because an adopter who upgrades must be told which `gate check` flag replaced each removed script. Deletion is chosen over thin CLI wrappers, with the residual (an adopter running the packed bundle without `gate` on PATH) stated rather than denied. **New FR-9** ships it as a minor release and the class rationale is corrected — two public CLI flags, new config keys, and three files removed from a published pack are user-facing. **FR-4 names its config keys**: `wiring.scriptsDir`, `wiring.hooksDir`, `wiring.bundlePath`, with defaults, repo-relative validation that rejects absolute and `..`-escaping paths, and `defaults.ts`/`validate.ts`/`config-wiring.test.ts` added as targets — the previous revision said "both paths become config" and named only `types.ts`. **FR-3 binds the predicate contract**: PRD-021 FR-13(a′) now exports `isRootRelativeFilename`, so "one predicate for two sections" is real rather than aspirational, and its absence at Phase 4 is a stop. **FR-1 gives the ADR a parseable shape** — a `## Classification` table of `| Script | Class |` rows — because a ledger-vs-ADR comparison against prose is a check of whatever the parser tolerates. Two stale sentences corrected: §9 Q2 still said eleven tokens, and §7 Dependencies still claimed PRD-021 edits `gates-wired-exceptions.json`. The Conflict Surface gains the pack, config, and changeset paths; every new overlap is against a PRD already declared as a prerequisite, so the wave ordering is unchanged |
