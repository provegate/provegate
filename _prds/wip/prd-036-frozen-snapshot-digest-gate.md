# PRD-036: Frozen-Snapshot Digest — the Cache Key Must See Everything the Tests Read

> **Status**: Draft
>
> **Created**: 2026-07-28
> **Updated**: 2026-07-29
> **Author**: Claude Fable 5, converting a deferral at the board cap; iteration-1 rework on the readiness scorer's findings
> **Audience**: Implementing Agent
> **Slug**: `frozen-snapshot-digest-gate`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: A cache-key gap in this repository's own test wiring — no shipped
> code, no CLI surface, no method content changes. Not `test-hardening` because the tests
> themselves are correct; what is wrong is the build tool's view of what they read.
> **Autonomous Close**: eligible
> **Value**: 3.50 (MF/UI/TL/AR/RM: 5/2/5/1/4)

<!-- 0.25*5 + 0.25*2 + 0.20*5 + 0.15*1 + 0.15*4
     = 1.25 + 0.50 + 1.00 + 0.15 + 0.60 = 3.50 -->

<!-- Value history: born 2.80 (4/2/2/1/5). First expansion (owner triage 2026-07-28):
3.45 (5/2/4/1/5) — REFUTED at iteration 1 (5.55 ITERATE): RM 5 was unsupportable for a
scanner with no closed grammar and a mis-measured baseline; honest RM 4 put it at 3.30,
below the 3.40 cutoff. SECOND expansion (this rework, 2026-07-29 — the protocol's last
before cut): the scope now absorbs the WHOLE measured class — the complete census found
12 undeclared input groups across 15 test files, not the 2 the first draft named — plus
a byte-closed escape boundary every future test inherits and a Turbo-level cache proof.
RM drops honestly to 4 (a standing repo gate plus a boundary convention is real
maintenance, though the byte-grammar is far simpler than the refuted AST scanner).
TL rises 4→5, and this is the load-bearing claim of the header: a stale test green
inside a Phase-5 `gate run` falsifies Ship Verified itself — the one guarantee every
PRD in this repository rests on — and the census closes that class for every future
close, not per-instance. If the Phase-2 scorer holds TL at 4, the total is 3.30 and the
protocol's action is the recorded cut, which is then the owner's call — that fallback
is stated here so the scorer judges the claim, not the arithmetic. -->

<!-- Autonomous Close: `eligible` — every verification is machine-checkable and this PRD
produces no operator-owned rows. -->

---

## 1. Introduction / Overview

Converted from the deferral "Frozen-snapshot digest" (opened at PRD-017 Phase 6 round 9,
due 2026-08-29) when the board reached its cap of 15 rows on 2026-07-28. Reworked after
iteration 1 (5.55 ITERATE, Codex): the first draft declared exactly two out-of-package
reads; the scorer refuted the baseline, and this session's full census confirms the
refutation and completes the measurement.

The `test` turbo task hashes `$TURBO_DEFAULT$` plus four root globs (PRD-024's and
PRD-028's landings). Everything else a package test reads is invisible to the cache
key, so an edit there replays a cached green over a comparison that never re-ran —
`turbo-cache-masks-out-of-input-reads`, a class with recorded shipped breaks. CI checks
out fresh, so the published guarantee holds; the gap is local — **including local
`gate run` closes, where a stale `pnpm test` green would falsify Ship Verified.**

**The complete census (measured 2026-07-29, this session):** 12 undeclared input groups
across 15 test files:

| #   | Out-of-package read                                                                    | Reader (file:line)                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `docs/research/provegate-bootstrap/source-snapshot/**`                                 | `content-prompts.test.ts:315-323`, `content-placeholders.test.ts:280`                                                                                       |
| 2   | `docs/research/provegate-bootstrap/*.md` (whitepaper, roadmap, README)                 | `content-canon.test.ts:86-109`, `content-launch.test.ts:82,92`                                                                                              |
| 3   | `scripts/verify/verify-workflow.mjs`                                                   | `wiring.test.ts:369-378` (PRD-025's real-bundle fixture)                                                                                                    |
| 4   | `scripts/verify/verify-doc-claims.mjs` + `lib.mjs` (via `cpSync`)                      | `doc-claims-script.test.ts:17-19,56-62`                                                                                                                     |
| 5   | `scripts/verify/verify-script-classes.mjs` + `script-classes.json` (exec + read)       | `consolidation.test.ts:326,353-361,482`                                                                                                                     |
| 6   | `_docs/reviews/**`                                                                     | `review-quorum.test.ts:70-77` — the applied learning record's own original instance                                                                         |
| 7   | `apps/docs/content/docs/**` (`.mdx` + `meta.json`)                                     | `content-adoption.test.ts:22-25,145`, `revalidate.test.ts:483-485`, `content-launch.test.ts:69-77,127-128,275`                                              |
| 8   | `.changeset/**`                                                                        | `changeset-entry.test.ts:25,41-45`                                                                                                                          |
| 9   | repo-wide live `*.md` walk (README, STATUS, AGENT_BOOTSTRAP, CONTRIBUTING, docs/**, …) | `consolidation.test.ts:210-222` (`liveMarkdown`), plus direct reads `content-prompts.test.ts:637`, `content-canon.test.ts:39`, `content-launch.test.ts:273` |
| 10  | root `package.json`                                                                    | `consolidation.test.ts:166`                                                                                                                                 |
| 11  | root `turbo.json`                                                                      | `open-questions.test.ts:542`, `lint-parsers.test.ts:207`                                                                                                    |
| 12  | root `LICENSE`                                                                         | `pack.test.ts:89`                                                                                                                                           |

Already declared (no action): `_prds/**` (`prd-ready.test.ts:441`, the lint corpora),
`_brain/**` (`consolidation.test.ts:484`), `workflow.config.json`,
`gates.manifest.json` (every `loadConfig`/`loadManifest` site).

Non-reads excluded from the census: `single-package.test.ts:350`,
`worktree.test.ts:572`, `wiring.test.ts:513` are traversal-attack _fixture strings_,
not filesystem reads; `worktree.test.ts` and `prompts.test.ts` read only their own
`mkdtemp` fixtures and package files.

Fixing 12 groups one glob at a time is the losing game the first draft played. This PRD
lands the class fix: declare the complete measured set (FR-1), route every escape
through one auditable helper (FR-2), gate the boundary with a byte-closed census that
makes the _next_ undeclared read fail by name (FR-3), and prove at the Turbo level that
the key actually moved (FR-4).

---

## 2. Goals

### Primary Goals

- [ ] An edit to **any** path a package test reads invalidates the `provegate#test`
      cache, so every comparison re-runs against the bytes on disk.
- [ ] Out-of-package reads have exactly one home (the boundary helper) and one ledger
      (its exported glob list), enforced by a repo gate — a new escape route fails the
      verify bundle by file and line before a reviewer has to find it.

### Success Metrics

| Metric                                                     | Current                                      | Target                                    | Measurement                                                   |
| ---------------------------------------------------------- | -------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| Undeclared out-of-package input groups in `provegate#test` | 12, measured 2026-07-29 (census table in §1) | 0                                         | FR-1 declares; FR-3's census asserts list ⊆ globs             |
| Escape sites outside the boundary helper                   | 15 files construct their own `../..` paths   | 0                                         | FR-2 migrates; FR-3's byte scan refuses new ones by file:line |
| Proof the declared globs live in Turbo's hash              | none                                         | dry-run hash moves on a snapshot mutation | FR-4's probe                                                  |

---

## 3. User Stories

#### User Story 1

```
As a maintainer editing the source snapshot, a docs page, a review artifact, or a
verify script,
I want the package tests that read that file to actually re-run,
so that a green suite — especially inside a Phase-5 gate run — means the assertions
held against the bytes on disk, not against a cache from before my edit.
```

**Acceptance Criteria:**

- [ ] After an edit to any censused path, `provegate#test` is a cache miss and the
      reading tests execute.
- [ ] With no censused-path edit, caching behaves as before.

#### User Story 2

```
As the author of a future test that reads a new repo-root path,
I want the verify bundle to fail naming my file and line until I route the read
through the boundary helper and declare its glob,
so that the cache key and the read set cannot drift apart silently again.
```

**Acceptance Criteria:**

- [ ] A test source containing a parent-segment path literal outside the helper fails
      `verify:test-inputs` with the file and line named.
- [ ] A helper-ledger entry with no covering turbo glob fails `verify:test-inputs`
      with the path named.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1 — Declare the complete measured input set in the test task's cache key.**
   Extend the `test` task's `inputs` in `turbo.json` — the array PRD-024 landed and
   PRD-028 extended — with the census's nine new globs:
   `$TURBO_ROOT$/**/*.md` (the `liveMarkdown` walk plus every direct `.md` read — a
   deliberate superset, cost documented below),
   `$TURBO_ROOT$/docs/research/provegate-bootstrap/**` (snapshot files of every
   extension), `$TURBO_ROOT$/scripts/verify/**`, `$TURBO_ROOT$/_docs/reviews/**`,
   `$TURBO_ROOT$/apps/docs/content/docs/**`, `$TURBO_ROOT$/.changeset/**`,
   `$TURBO_ROOT$/package.json`, `$TURBO_ROOT$/turbo.json`, `$TURBO_ROOT$/LICENSE`.
   Keep `$TURBO_DEFAULT$` and all four existing root globs. Extend the written reason
   on the existing `"test"` entry in `scripts/verify/turbo-inputs-exceptions.json` to
   enumerate the census groups. **Accepted cost, stated for the scorer:** the `*.md`
   superset means any live-markdown edit re-runs every workspace's `test` task. That is
   the deliberate trade — `_prds/**` already invalidates on every workflow move, and a
   cheap re-run beats a stale green inside a close. Precision-narrowing the superset is
   a recorded follow-up, not a blocker.
   - **Targets:** `turbo.json`, `scripts/verify/turbo-inputs-exceptions.json`
2. **FR-2 — One boundary for every escape.** Create
   `packages/provegate/test/helpers/repo-reads.ts` exporting `repoPath(rel)` (resolves
   against the repo root) and `REPO_READ_GLOBS` (the census ledger: every root-relative
   glob the package tests may read, matching §1's table plus the four already-declared
   globs). Migrate all 15 census files to build their out-of-package paths through
   `repoPath` — a mechanical rewrite of the resolution expression; **no assertion, read
   API, or fixture content changes**. `doc-claims-script.test.ts`'s `cpSync` sources
   and `consolidation.test.ts`'s `execFileSync` script path route through the same
   helper (an executed script is an input like any other).
   - **Targets:** `packages/provegate/test/helpers/repo-reads.ts` (new), the 15 census
     files listed in §1
3. **FR-3 — The census as a standing repo gate, byte-closed.** New
   `scripts/verify/verify-test-inputs.mjs` (repo-class per ADR-0004 — it reads this
   repository's build config and test sources, so it lives in `scripts/verify/`, never
   in shipped package code). Three checks, all fail-closed:
   (a) **boundary scan** — outside `repo-reads.ts`, no file under
   `packages/provegate/test/**` may contain a parent-directory segment (`..` as a path
   segment) inside a string literal, nor `process.cwd()`, nor `homedir(`. This is a
   byte-level rule over the source text, not an AST scanner
   (`narrow-the-grammar-not-the-parser`): the boundary is enforced by restricting what
   test sources may _contain_, so alias tricks, `join(repoRoot, …)` composition, and
   `cpSync`-shaped reads are all caught at their common prerequisite — constructing the
   escape path. False positives (a `..` in a comment or fixture string) are resolved by
   rewording or routing through the helper; there is no suppression syntax
   (`a-rule-that-exempts-itself`).
   (b) **coverage** — every entry in `REPO_READ_GLOBS` is covered by a glob in the
   `test` task's `inputs`; fail names the uncovered path.
   (c) **positive control** — the current corpus passes (a)+(b).
   Wire it fully (`gate-wire-or-delete`): `verify:test-inputs` alias in root
   `package.json`, membership in `scripts/verify/verify-workflow.mjs`'s `CHECKS`
   bundle, and a repo-class row in `scripts/verify/script-classes.json`. Deny cases are
   proven in the package suite by the `doc-claims-script.test.ts` harness pattern (copy
   the script into a temp root, plant one boundary violation and separately one
   uncovered ledger entry, assert each fails naming the file/path — the planted
   fixture is the independent cause `assert-absent-needs-an-independent-cause`
   requires, with (c) as the paired positive control).
   - **Targets:** `scripts/verify/verify-test-inputs.mjs` (new),
     `scripts/verify/script-classes.json`, `scripts/verify/verify-workflow.mjs`,
     `package.json`, `packages/provegate/test/verify-test-inputs.test.ts` (new)
4. **FR-4 — Prove the key moved, at the Turbo layer.** A `--probe` mode in
   `verify-test-inputs.mjs`, run as part of its default pass: capture
   `turbo run test --filter=provegate --dry=json`'s task hash; write a probe file
   under `docs/research/provegate-bootstrap/source-snapshot/`; re-capture and assert
   the hash CHANGED; delete the probe file; re-capture and assert the hash restored.
   `--dry=json` never executes tasks, so the probe is fast, spawns no gate CLI
   (`runner-sentinel-blocks-cli-spawning-tests` does not apply), and leaves the tree
   clean. This is the evidence iteration 1 found missing: FR-1's globs proven inside
   Turbo's actual hash, not just present in a JSON file.
   - **Targets:** `scripts/verify/verify-test-inputs.mjs::probe`

---

## 5. Non-Goals (Out of Scope)

- **Re-designing any test.** Every censused read is legitimate; only its cache
  visibility and its resolution path change.
- **A cache-free `scripts/verify/` twin of any comparison.** Rejected since draft 1:
  input declaration closes the gap without a second implementation of any pin
  (`two-parsers-wrong-together`).
- **Any change to `verify-turbo-inputs.mjs` policy.** The blanket
  refuse-undeclared-inputs rule stands; FR-1 uses its sanctioned exception path.
- **Narrowing the `*.md` superset to a precise negation list.** Recorded follow-up;
  correctness first, cache thrift second.
- **An AST/data-flow scanner for read sites.** Refuted by iteration 1 and by
  `narrow-the-grammar-not-the-parser`; the byte-closed boundary replaces it.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** an edit to any censused path (snapshot, docs page, review artifact, verify
  script, changeset, root manifest), **When** `pnpm test` runs, **Then**
  `provegate#test` is a cache miss and the reading tests execute.
- **Given** a new test source containing a parent-segment path literal outside
  `repo-reads.ts`, **When** `pnpm verify:test-inputs` runs, **Then** it fails naming
  the file and line.
- **Given** a `REPO_READ_GLOBS` entry with no covering turbo glob, **When**
  `pnpm verify:test-inputs` runs, **Then** it fails naming the path.
- **Given** the probe mutation under the snapshot root, **Then** the dry-run task hash
  changes and restores.
- **Given** no censused-path edit, **Then** caching behaves exactly as after PRD-028.

---

## 7. Technical Considerations

### Architecture

- **Extend, do not duplicate.** The `inputs` array, the exceptions entry, the
  script-classes ledger, and the verify bundle all exist; every FR appends to a live
  seam.
- **The boundary is the durable half.** FR-1 fixes today's 12 groups; FR-2+FR-3 make
  the 13th impossible to add silently. The helper ledger and the turbo globs are two
  statements of one fact, and FR-3(b) is the check that they never diverge.
- **Repo-class placement (ADR-0004).** The census reads `turbo.json` and test sources —
  this repository's stack — so its home is `scripts/verify/`, wired like every repo
  check, with a ledger row. A package-test home (draft 1's design) would itself have
  been an undeclared out-of-package read of `turbo.json`.

### Rollout & Rollback

- **Atomic rollout, one commit:** helper + 15 migrations + turbo globs + exception
  reason + census script + wiring + harness test land together. Partial orderings are
  red by construction (census before globs fails coverage; globs before census leaves
  the guarantee unproved) — the atomicity is the migration plan, and the readiness
  scorer should treat any task plan that splits it across commits as a defect.
- **Rollback, exact reverse order, verified at each step:** (1) remove the harness
  test + census script + its `package.json` alias + `CHECKS` row + `script-classes.json`
  row (wire-or-delete: all five together); (2) revert the 15 migrations + delete the
  helper; (3) revert the turbo globs + exception reason to the PRD-028 state. After
  each step: `pnpm verify:turbo-inputs && pnpm verify:workflow && pnpm test` green.
  Step (3) alone restores the pre-PRD cache behavior byte-for-byte.

### Dependencies

- **PRD-024 and PRD-028 are Ship Verified on `main`** — the `inputs` array carries
  `$TURBO_DEFAULT$`, `_prds/**`, `_brain/**`, and both root configs; FR-1 appends.
- **PRD-034 (Phase 4, live lease) owns `scripts/verify/verify-workflow.mjs` and
  `.github/workflows/ci.yml`.** FR-3's bundle row touches the former, so **Phase 4 of
  this PRD serializes behind PRD-034's close.** No `ci.yml` edit is needed here — the
  census reaches CI through the existing `verify:workflow` bundle step.
- **Draft PRD-032 also claims `turbo.json`** in its Conflict Surface; it is Phase-1
  ITERATE and itself serialized behind PRD-034. Re-run `gate queue` before claiming
  rather than trusting this paragraph.

---

## 8. Implementation Scope

### In Scope

- [ ] `turbo.json` — nine globs appended to the `test` task's `inputs`
- [ ] `scripts/verify/turbo-inputs-exceptions.json` — the `test` entry's reason
      extended to enumerate the census
- [ ] `packages/provegate/test/helpers/repo-reads.ts` (new) — `repoPath` +
      `REPO_READ_GLOBS`
- [ ] 15 test files (§1 census) — escape sites routed through the helper, mechanical
- [ ] `scripts/verify/verify-test-inputs.mjs` (new) — boundary scan + coverage +
      positive control + `--probe`
- [ ] `scripts/verify/script-classes.json` — repo-class row for the new script
- [ ] `scripts/verify/verify-workflow.mjs` — `CHECKS` row (behind PRD-034)
- [ ] `package.json` — `verify:test-inputs` alias
- [ ] `packages/provegate/test/verify-test-inputs.test.ts` (new) — deny/positive
      harness, `doc-claims-script` pattern

---

## 9. Open Questions

- (none)

---

## 10. References

- `_readiness/wip/readiness-036-frozen-snapshot-digest-gate.md` — iteration 1
  (5.55 ITERATE): the findings this rework answers point by point
- `_brain/learnings/turbo-cache-masks-out-of-input-reads.md` — the class; its
  `_docs/reviews` instance is census row 6
- `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` — FR-3's placement rule
- PRD-024 FR-2 / PRD-028 FR-3 — the input-declaration seam this PRD completes
- `_tasks/completed/tasks-025-wiring-audit-completion.md:340-344` — the real-bundle
  fixture's recorded handoff to this census

---

## Memory Inputs

- applied: `turbo-cache-masks-out-of-input-reads` — the class under repair; the census
  (§1) now covers all 12 measured groups including the record's own `_docs/reviews`
  origin, which draft 1 wrongly claimed was already closed.
- applied: `narrow-the-grammar-not-the-parser` — FR-3 restricts what test sources may
  contain (byte-closed boundary) instead of parsing what they mean (the AST scanner
  iteration 1 refuted as unimplementable).
- applied: `gate-wire-or-delete` — FR-3 ships alias + bundle row + ledger row + harness
  in one move, and the rollback removes all five together.
- applied: `assert-absent-needs-an-independent-cause` — the deny cases plant the
  violation (boundary breach; uncovered ledger entry) so the failure has an independent
  cause, with the passing census as the paired positive control.
- applied: `a-rule-that-exempts-itself` — the boundary scan has no suppression syntax;
  the only way past it is the helper, whose ledger the coverage check reads.
- reviewed: `two-parsers-wrong-together` — why Non-Goals still reject a cache-free twin
  of any comparison; the input declaration removes the need for a second implementation.
- reviewed: `runner-sentinel-blocks-cli-spawning-tests` — FR-4's probe uses
  `turbo --dry=json` only (no task execution, no gate CLI spawn); whole-suite §11 rows
  stay on turbo.
- applied: `ADR-0004-method-rule-vs-repo-rule` — the census reads this repository's
  build config and test sources, so it is repo-class: `scripts/verify/` home, ledger
  row, never shipped.

---

## Memory Outputs

- none — the class is `turbo-cache-masks-out-of-input-reads` and the placement rule is
  ADR-0004; this PRD adds an instance-complete fix plus enforcement, not a new
  non-derivable fact. If implementation surfaces one (e.g. a Turbo hashing behavior
  not derivable from its docs), append it with rationale per the contract.

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `turbo.json`
- `scripts/verify/turbo-inputs-exceptions.json`
- `scripts/verify/verify-test-inputs.mjs`
- `scripts/verify/script-classes.json`
- `scripts/verify/verify-workflow.mjs`
- `packages/provegate/test/helpers/repo-reads.ts`
- `packages/provegate/test/verify-test-inputs.test.ts`
- `packages/provegate/test/review-quorum.test.ts`
- `packages/provegate/test/consolidation.test.ts`
- `packages/provegate/test/content-adoption.test.ts`
- `packages/provegate/test/changeset-entry.test.ts`
- `packages/provegate/test/wiring.test.ts`
- `packages/provegate/test/content-prompts.test.ts`
- `packages/provegate/test/revalidate.test.ts`
- `packages/provegate/test/content-launch.test.ts`
- `packages/provegate/test/prd-ready.test.ts`
- `packages/provegate/test/open-questions.test.ts`
- `packages/provegate/test/lint-parsers.test.ts`
- `packages/provegate/test/content-canon.test.ts`
- `packages/provegate/test/doc-claims-script.test.ts`
- `packages/provegate/test/pack.test.ts`
- `packages/provegate/test/content-placeholders.test.ts`

**Contested, measured 2026-07-29:** `scripts/verify/verify-workflow.mjs` is inside
PRD-034's live lease — **Phase 4 serializes behind PRD-034's close.** Draft PRD-032
claims `turbo.json` but is Phase-1 ITERATE and itself behind PRD-034. Re-run
`gate queue` before claiming.

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Review artifact: `_docs/reviews/review-036-frozen-snapshot-digest-gate.md`
- Learning: `none` — the Memory Output above is a reasoned `none`; the class record and
  the placement ADR already exist, and this PRD closes their instances
- Decision: `none` — placement follows ADR-0004; the repair pattern is PRD-024's,
  completed

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                                | Scope | Notes                                                                                                                |
| ---- | -------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------- |
| FR-1 | `pnpm verify:turbo-inputs`                                     | repo  | the extended exceptions entry stays valid; no task narrows its key undeclared                                        |
| FR-1 | `pnpm verify:test-inputs`                                      | repo  | coverage check: every census glob present in the test task's inputs                                                  |
| FR-2 | `pnpm verify:test-inputs`                                      | repo  | boundary scan: zero escape sites outside the helper after the 15-file migration                                      |
| FR-2 | `pnpm test`                                                    | repo  | the migrated suite is green through turbo — the resolution rewrite changed no assertion                              |
| FR-3 | `pnpm --filter provegate test test/verify-test-inputs.test.ts` | pkg   | deny cases fail by name (planted boundary breach; planted uncovered ledger entry); positive control passes           |
| FR-4 | `pnpm verify:test-inputs`                                      | repo  | the probe ran inside the default pass: dry-run task hash changed on the snapshot mutation and restored after cleanup |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm verify:workflow` — the repo bundle stays green with its new member

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/verify-test-inputs.test.ts` — a planted
  out-of-boundary read must fail by file and line, and a planted uncovered ledger
  entry by path; a census that only passes on today's inputs is not evidence.
- Contract test: n/a — no client-to-server payload ships.

Before Phase 2 PASS, run: `gate check PRD-036`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT build a second comparison of any pinned content in `scripts/verify/`. One
  pin, one implementation; the cache key is the fix.
- DO NOT narrow any appended glob below its census group, and do not remove
  `$TURBO_DEFAULT$` or any existing glob while appending — either move re-creates a
  stale-green key.
- DO NOT satisfy FR-3 with a hardcoded list of today's escape sites; the boundary scan
  reads the test sources so a new site is caught, and the coverage check reads the
  helper ledger so a new path is caught.
- DO NOT add a suppression comment, marker, or exemption field to the boundary scan;
  the helper is the only door.
- DO NOT change any test assertion during the FR-2 migration — resolution expressions
  only.
- DO NOT start Phase 4 before PRD-034 closes; `verify-workflow.mjs` is inside its
  lease.
- DO NOT ship the census in `packages/provegate` (ADR-0004: repo-class).

---

## Changelog

| Date       | Author                                                 | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-29 | Claude Fable 5, on the owner's rework direction        | **Iteration-1 rework — second expansion (the protocol's last before cut).** Answers all six binding findings of readiness iteration 1 (5.55 ITERATE, Codex): (A) the census re-measured from source — 12 undeclared input groups across 15 files, not 2; the full table with file:line in §1, including the applied learning record's own `_docs/reviews` origin and the repo-wide `liveMarkdown` walk that forces the `*.md` superset decision. (B) the AST scanner replaced by a byte-closed boundary: one helper (`repo-reads.ts`) as the only legal escape, a `scripts/verify` census gate refusing parent-segment literals, `process.cwd()` and `homedir(` in test sources by file:line, no suppression syntax. (C) FR-4's Turbo-layer probe (`--dry=json` hash comparison across a planted-then-removed snapshot mutation) supplies the cache-miss evidence the old §11 lacked. (D) Rollout & Rollback added: one atomic commit, three-step reverse-order rollback, each step verified. (E) Value rescored honestly: RM 5→4 conceded; TL 4→5 argued on the gate-run stale-green threat with the 3.30-cut fallback stated in the header for the scorer. (F) Dependencies/Conflict Surface refreshed: serializes behind PRD-034 (`verify-workflow.mjs` lease), PRD-032's `turbo.json` claim noted, no `ci.yml` edit needed. FR-2/FR-3 relocated per ADR-0004 (repo-class census in `scripts/verify/`, not a package test — draft 1's placement would itself have been an undeclared read). Memory Inputs grown 4→8 with the boundary-design records |
| 2026-07-28 | Claude Fable 5, on the owner's triage direction        | **Expanded and queued (first expansion of the protocol's two).** The owner's call on the below-threshold header: absorb the class. FR-1 declared BOTH out-of-package reads measured on 2026-07-28 — the source snapshot and the real-bundle fixture PRD-025's review round added the same day — and the census's value claim changed kind: standing gate for the class, not one-instance repair. Value 2.80 → 3.45 (MF 4→5, TL 2→4). Superseded by the 2026-07-29 rework after iteration 1 refuted the two-read baseline and the RM 5 axis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-07-28 | Claude Fable 5, converting a deferral at the board cap | Converted from the STATUS.md deferral "Frozen-snapshot digest" (opened PRD-017 Phase 6 round 9, due 2026-08-29) when the board hit its cap of 15 rows — the cap rule converts the oldest-due row. The original sketch (a cache-free `scripts/verify/` twin) rejected in Non-Goals: PRD-024's input-declaration pattern closes the gap without a second implementation of the pin. Value scored honestly at 2.80, below the 3.40 candidate threshold, with the expand-or-cut status recorded in the header comment for the owner's triage call. Created with `gate new`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
