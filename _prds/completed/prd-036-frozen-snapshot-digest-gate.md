# PRD-036: Frozen-Snapshot Digest — the Cache Key Must See Everything the Tests Read

> **Status**: Ship Verified
>
> **Created**: 2026-07-28
> **Updated**: 2026-07-29
> **Author**: Claude Fable 5; iterations 2–3 reworks on the owner's direction, census machine-measured before authorship each round
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

<!-- Value history: born 2.80 (4/2/2/1/5) → exp1 3.45 (refuted: RM 5) → exp2 3.50
(TL 5 ruled down to 4 at iterations 2 AND 3 → 3.30, below cutoff, cut offered twice;
the owner commissioned a fourth precision round instead). TL 5 is re-argued here on
DEFENSE IN DEPTH, the ground iteration 3 itself conceded: the scorer confirmed the
glob set complete ("no uncovered transitive input") and called the :458 bypass "a
boundary-invariant failure, not a missing cache input" — i.e. the cache guarantee
(the thing gate runs rest on) held even against the one live escape the boundary
missed. This round closes that escape too: grammar v4 was re-measured against the
corpus (§1 records the dated-baseline output verbatim — re-measured each round, 28
violations in 21 files at the fifth-round baseline, zero never-observed shapes) and every
measured escape shape in the corpus's history is now caught or migrated, both helper
directions enforced, helper shapes validated. The claim TL 5 rests on is therefore
two-layered and stated exactly: (1) the cache key is complete against the measured
read set — scorer-verified; (2) the boundary alarm catches every escape shape ever
observed here, with its syntactic limits (string concatenation, novel anchor
compositions) named in §5 rather than papered over. ITERATION 4 RULED TL 5 — "the two-layer argument holds at the value level" — so
3.50 stands above the provisional 3.40 threshold and the cut question is closed;
this revision applies iteration 4's five precision pieces without touching the
axes. RM stays 4. -->

<!-- Autonomous Close: `eligible` — every verification is machine-checkable and this PRD
produces no operator-owned rows. -->

---

## 1. Introduction / Overview

Converted from the deferral "Frozen-snapshot digest" (opened at PRD-017 Phase 6
round 9) at the board cap on 2026-07-28. Iterations 1–2 shared one shaped defect — a
census claimed before it was measured — and the measure-first third rework fixed the
method: iteration 3 reproduced its census verbatim and lifted the band to
iterate-in-place, leaving one live compositional escape and four precision pieces.
This fourth revision closes them the same way: **grammar v4 was extended for the
escape shapes iteration 3 named, re-executed against the corpus, and this document is
written from that output.**

The `test` turbo task hashes `$TURBO_DEFAULT$` plus four root globs (PRD-024's and
PRD-028's landings). Everything else a package test reads is invisible to the cache
key, so an edit there replays a cached green over a comparison that never re-ran —
`turbo-cache-masks-out-of-input-reads`. CI checks out fresh, so the published
guarantee holds; the gap is local — **including local `gate run` closes, where a stale
`pnpm test` green would falsify Ship Verified.**

### The measured census (scanner v4 re-executed 2026-07-29, fifth round — the corpus moved twice under the pipeline)

Grammar v4 (= FR-3's grammar, verbatim), re-run after PRD-034 and PRD-038 both
shipped mid-iteration and added test files. AST scan of every string literal and
template-literal part in `packages/provegate/test/**/*.ts`, module specifiers
included:

- **A1** — any literal part containing `../..` (multi-parent) → violation;
- **A2** — any call expression carrying **two or more parent-carrying string
  arguments** (each exactly `'..'` or starting `'../'` — covers the split-join shape
  iteration 3 found live at `content-prompts.test.ts:458`, the mixed shape
  `join(x, '..', '../docs')` iteration 4 named, and PRD-038's new
  `quickstart-e2e.test.ts:308` build-cwd construction) → violation;
- **A3** — `dirname(dirname(…))` nesting → violation;
- **A4** — `new URL('..'|'../…', new URL(…))` nesting → violation;
- **C** — `process.cwd()` / `homedir(` call sites → violation;
- single bare `'..'` and single-parent segments stay legal — measured, they are the
  corpus's in-package `pkgRoot = new URL('..', import.meta.url)` anchors,
  temp-fixture parent hops, 148 relative-import specifiers, and one token fixture.

Output, exclusive partition:

```
files scanned: 56
multi-parent literal parts (violation): 25
bare-parent '..' literals: 25 (violating only in >=2-parent-args-per-call sites: 3 calls)
single-parent legal parts: 196 (predicate: contains '../', not A1, not bare '..';
                                of which module specifiers: 148)
nested-URL: 0   nested-dirname: 0   process.cwd/homedir: 0
violations (pre-migration state): 28 in 21 files
```

The 28 sites decompose into **23 out-of-package escape constructions in 18 reader
files** — the previous round's 21 plus PRD-034's
`prompts-integrity.test.ts:40-42` (reads `.changeset/prompt-store-reconciliation.md`
— already glob-covered) and PRD-038's `quickstart-e2e.test.ts:308`
(`cwd: join(PKG_DIR, '..', '..')` for a build spawn) — **1 in-package multi-bare
site** (`memory.test.ts:461` reaches `packages/provegate/practices/verify/lib.mjs`,
inside the package; migrated to a helper-anchored expression so the rule needs no
exception), and **4 traversal/content fixture strings** in 4
files — two of them also readers (`single-package.test.ts:350`,
`wiring.test.ts:513`, `worktree.test.ts:572`, and PRD-038's
`quickstart-e2e.test.ts:244` markdown-body fixture whose relative link trips A1) whose byte-identical values move into the exempted fixtures module
(FR-2). **No new input group**: both new reads land in already-declared globs, so
the twelve-glob set stands.

**Enumerate, don't pin (this round's lesson — the corpus moved twice between
scores):** the numbers above are the DATED baseline for scoring reproducibility;
the BINDING migration list is the scanner's output re-run at Phase-4 open, and the
Success Metrics are measured by the scanner, never by this table. A test file
landing between PASS and Phase 4 joins the migration by re-measurement, not by PRD
amendment.

**The input groups those 23 constructions (plus their transitive executions) resolve to — 12
new, 4 already declared:**

| #   | Out-of-package input                                                                                                                                                       | Reader (file:line)                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `docs/research/provegate-bootstrap/source-snapshot/**`                                                                                                                     | `content-prompts.test.ts:319,567` and the `:458` frozen-digest walk, `content-placeholders.test.ts:280`                                                                                                      |
| 2   | `docs/research/provegate-bootstrap/*.md` (whitepaper, roadmap, README)                                                                                                     | `content-canon.test.ts:86-109`, `content-launch.test.ts:82,92`                                                                                                                                               |
| 3   | `scripts/verify/**` (`verify-workflow.mjs` fixture; `verify-doc-claims.mjs` + `lib.mjs` via `cpSync`; `verify-script-classes.mjs` + `script-classes.json` via exec + read) | `wiring.test.ts:376`, `doc-claims-script.test.ts:18-19`, `consolidation.test.ts:326,353-361,482`                                                                                                             |
| 4   | `_docs/reviews/**`                                                                                                                                                         | `review-quorum.test.ts:70` — the applied learning record's own original instance                                                                                                                             |
| 5   | `apps/docs/content/docs/**` (`.mdx` + `meta.json`)                                                                                                                         | `content-adoption.test.ts:22-25,145`, `revalidate.test.ts:484`, `content-launch.test.ts:69-77,127-128,275`                                                                                                   |
| 6   | `.changeset/**`                                                                                                                                                            | `changeset-entry.test.ts:25`                                                                                                                                                                                 |
| 7   | repo-wide live `*.md` walk (README, STATUS, AGENT_BOOTSTRAP, CONTRIBUTING, `_docs/launch/`, …)                                                                             | `consolidation.test.ts:210-222` (`liveMarkdown`), direct reads `content-prompts.test.ts:637`, `content-canon.test.ts:39`, `content-launch.test.ts:65-73,273`                                                 |
| 8   | root `package.json`                                                                                                                                                        | `consolidation.test.ts:166`; also read by `auditWiring` (`wiring.ts:430-433`) under row 11's call                                                                                                            |
| 9   | root `turbo.json`                                                                                                                                                          | `open-questions.test.ts:542`, `lint-parsers.test.ts:207`                                                                                                                                                     |
| 10  | root `LICENSE`                                                                                                                                                             | `pack.test.ts:89`                                                                                                                                                                                            |
| 11  | `apps/web/app/page.tsx`                                                                                                                                                    | `content-launch.test.ts:68,85-87` (`SELF_COPY_PAGES`) — iteration 2's find                                                                                                                                   |
| 12  | `.github/workflows/**` and `.githooks/**`                                                                                                                                  | `practices-pack.test.ts:739-744` runs `auditWiring` against the live repo root, which reads both (`wiring.ts:463-469`, `wiring.ts:572-603`) — iteration 2's find; its bundle/scripts-dir reads land in row 3 |

Already declared (no action): `_prds/**` (`prd-ready.test.ts:441`, the lint corpora),
`_brain/**` (`consolidation.test.ts:484`), `workflow.config.json`,
`gates.manifest.json` (every `loadConfig`/`loadManifest` site).

Known boundary, stated: absolute-path literals (`'/etc/…'` deny-fixtures) and
environment reads are not repository inputs — Turbo cannot hash them and the census
does not chase them.

This PRD lands the class fix: declare the complete measured set (FR-1), route every
escape through one auditable helper enforced in both directions (FR-2, FR-3), and
prove at the Turbo level that the key actually moved (FR-4).

---

## 2. Goals

### Primary Goals

- [ ] An edit to **any** path a package test reads invalidates the `provegate#test`
      cache, so every comparison re-runs against the bytes on disk.
- [ ] Out-of-package reads have exactly one home (the boundary helper) and one ledger
      (its exported glob list), enforced in both directions by a repo gate — a new
      escape route or an undeclared helper path fails the verify bundle by name before
      a reviewer has to find it.

### Success Metrics

| Metric                                                     | Current                              | Target                                                 | Measurement                                          |
| ---------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------- |
| Undeclared out-of-package input groups in `provegate#test` | 12, machine-measured 2026-07-29 (§1) | 0                                                      | FR-1 declares; FR-3(b2) asserts ledger ⊆ globs       |
| Multi-parent escape literals outside the exempted helpers  | 23 in 18 files (scanner output, §1)  | 0                                                      | FR-2 migrates; FR-3(a) refuses new ones by file:line |
| Helper calls whose path is absent from the ledger          | n/a (helper is new)                  | 0, fail-closed on non-literal args                     | FR-3(b1)                                             |
| Proof the declared globs live in Turbo's hash              | none                                 | dry-run hash moves on a snapshot mutation and restores | FR-4                                                 |

---

## 3. User Stories

#### User Story 1

```
As a maintainer editing the source snapshot, a docs page, a review artifact, a verify
script, a workflow file, or a git hook,
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

- [ ] A test source containing a multi-parent path literal outside the exempted
      helpers fails `verify:test-inputs` with the file and line named.
- [ ] A `repoPath()` call whose literal argument matches no ledger entry — or whose
      argument is not a string literal — fails `verify:test-inputs` by name.
- [ ] A ledger entry with no covering turbo glob fails `verify:test-inputs` with the
      path named.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1 — Declare the complete measured input set in the test task's cache key.**
   Extend the `test` task's `inputs` in `turbo.json` with the census's twelve new
   globs: `$TURBO_ROOT$/**/*.md`,
   `$TURBO_ROOT$/docs/research/provegate-bootstrap/**`,
   `$TURBO_ROOT$/scripts/verify/**`, `$TURBO_ROOT$/_docs/reviews/**`,
   `$TURBO_ROOT$/apps/docs/content/docs/**`, `$TURBO_ROOT$/.changeset/**`,
   `$TURBO_ROOT$/package.json`, `$TURBO_ROOT$/turbo.json`, `$TURBO_ROOT$/LICENSE`,
   `$TURBO_ROOT$/apps/web/app/page.tsx`, `$TURBO_ROOT$/.github/workflows/**`,
   `$TURBO_ROOT$/.githooks/**`. Keep `$TURBO_DEFAULT$` and all four existing root
   globs. Extend the written reason on the existing `"test"` entry in
   `scripts/verify/turbo-inputs-exceptions.json` to enumerate the census groups.
   **Discovery clause (iteration 6's find):** if the Phase-4 scanner re-run
   surfaces a read outside the twelve declared groups, the new glob joins this
   FR's `inputs` list, `REPO_READ_GLOBS`, and the exceptions reason in the SAME
   atomic change, recorded in the task file's Deferrals & Decisions — the ledger,
   the cache key, and the migration list move together or not at all.
   **Accepted cost, stated for the scorer:** the `*.md` superset means any
   live-markdown edit re-runs every workspace's `test` task — deliberate; `_prds/**`
   already invalidates on every workflow move, and a cheap re-run beats a stale green
   inside a close. Precision-narrowing is a recorded follow-up, not a blocker.
   - **Targets:** `turbo.json`, `scripts/verify/turbo-inputs-exceptions.json`
2. **FR-2 — One boundary for every escape.** Create
   `packages/provegate/test/helpers/repo-reads.ts` exporting `repoPath(rel)`
   (resolves against the repo root), `pkgRoot` (the in-package anchor, one
   definition — exported for reuse, existing anchor sites stay legal and untouched),
   and `REPO_READ_GLOBS` (the census ledger: §1's twelve groups plus the four
   already-declared globs); and
   `packages/provegate/test/helpers/escape-fixtures.ts` exporting the four
   traversal/content fixture strings **byte-identical** to today's values. Migrate
   the out-of-package escape sites (§1 baseline: 23 sites in 18 reader files; the
   binding list is the scanner re-run at Phase-4 open) through `repoPath`, rewrite
   `memory.test.ts:461`'s in-package multi-bare join against the exported `pkgRoot`
   (`join(pkgRoot, 'practices/verify/lib.mjs')` — same resolved path, rule-clean),
   and move the fixture sites to import from `escape-fixtures.ts` (mechanical
   rewrites of resolution expressions and constant homes; no assertion, read API, or
   fixture-value changes). `doc-claims-script.test.ts`'s `cpSync` sources,
   `consolidation.test.ts`'s `execFileSync` script path, and
   `quickstart-e2e.test.ts:308`'s build-spawn `cwd` route through the same helper
   (an executed script or spawn working directory is an input like any other).
   - **Targets:** `packages/provegate/test/helpers/repo-reads.ts` (new),
     `packages/provegate/test/helpers/escape-fixtures.ts` (new), the 21 files §1's
     scanner output names (binding list re-measured at Phase-4 open)
3. **FR-3 — The census as a standing repo gate, in both directions.** New
   `scripts/verify/verify-test-inputs.mjs` (repo-class per ADR-0004 — it reads this
   repository's build config and test sources). Checks, all fail-closed, the grammar
   being exactly §1's v4 rules whose measured output that section records:
   (a) **boundary scan** — AST over every string literal and template part in
   `packages/provegate/test/**/*.ts`, module specifiers included: rules A1
   (multi-parent literal), A2 (a call expression carrying two or more
   parent-carrying string arguments — each exactly `'..'` or starting `'../'` —
   §1's definition verbatim), A3 (`dirname(dirname(…))`), A4
   (`new URL('..…', new URL(…))`), C (`process.cwd()`, `homedir(`) — each violation
   fails by file:line, outside the two exempted helper files. Single-parent literals and single bare `'..'` stay legal by grammar —
   measured, no exemption list, no suppression syntax (`a-rule-that-exempts-itself`).
   (b1) **usage → ledger** — every `repoPath(` call site's first argument must be a
   string literal (non-literal fails closed, by file:line) and must be covered by a
   `REPO_READ_GLOBS` entry (uncovered fails by path).
   (b2) **ledger → turbo** — every `REPO_READ_GLOBS` entry is covered by a glob in
   the `test` task's `inputs`; fail names the uncovered path.
   (b3) **helper shape** — the two exempted files are themselves validated by AST
   shape (iteration 3's find: a shapeless exemption is a future hiding place), with
   a per-file rule so the contract is unambiguous (iteration 5's find):
   `repo-reads.ts` may export exactly `repoPath`, `pkgRoot`, and `REPO_READ_GLOBS`;
   its ONLY permitted imports are `node:path` and `node:url` (what the two anchors
   need); `node:fs` and `node:child_process` imports, and any read or spawn call,
   fail by name. `escape-fixtures.ts` may contain NO imports and NO calls at all —
   only the four named string-constant exports (`TRAVERSAL_SELECTOR`,
   `TRAVERSAL_COMMAND`, `TRAVERSAL_SLUG`, `QUICKSTART_TASKS_FIXTURE` — one per §1
   fixture site, names mirrored in the harness assertion); anything else fails by
   name. BOTH directions are planted in the deny suite: an extra export in
   `escape-fixtures.ts`, and a forbidden `node:fs` import with a read call in
   `repo-reads.ts` (iteration 4's find: the read-side breach needs its own
   independent cause).
   (c) **positive control** — the migrated corpus passes (a)+(b1)+(b2)+(b3).
   **Toolchain anchoring, stated (iteration 3's find):** the scanner resolves
   `typescript` via `createRequire` against `packages/provegate/package.json` — the
   package's devDependency, proven resolvable from a repo-root script by the v4
   prototype run; the root manifest carries no TypeScript and none is added. The
   harness test therefore runs the PRODUCTION script in place with a target-root
   argument (the `verify-script-classes` pattern) instead of copying it to a temp
   root, so resolution anchors survive.
   Wire it fully (`gate-wire-or-delete`): `verify:test-inputs` alias in root
   `package.json`, membership in `scripts/verify/verify-workflow.mjs`'s `CHECKS`
   bundle, a repo-class row in `scripts/verify/script-classes.json`, **and the
   matching row appended to ADR-0004's Classification table**
   (`verify-script-classes.mjs:109-141` diffs both directions). Deny cases in the
   package suite, each planted violation failing by name from its own independent
   cause with (c) as the paired positive control: a multi-parent literal, a
   split-join (`join(x, '..', '..')`), a split-resolve (`resolve(x, '..', '../y')` —
   the mixed shape, iteration 4's find), a nested URL, a nested `dirname`, a
   non-literal `repoPath` argument, an unledgered `repoPath` path, an uncovered
   ledger entry, an extra export in `escape-fixtures.ts`, and a forbidden
   import-plus-read in `repo-reads.ts` — ten planted causes.
   **Named limit, owned in §5:** string concatenation assembling a traversal at
   runtime is outside any syntactic net — documented with a fixture that shows the
   scanner NOT flagging it, so the boundary's edge is tested, not implied.
   - **Targets:** `scripts/verify/verify-test-inputs.mjs` (new),
     `scripts/verify/script-classes.json`,
     `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` (Classification table row),
     `scripts/verify/verify-workflow.mjs`, `package.json`,
     `packages/provegate/test/verify-test-inputs.test.ts` (new)
4. **FR-4 — Prove the key moved, at the Turbo layer, failure-safe.** A probe inside
   `verify-test-inputs.mjs`'s default pass: (i) pre-scan the snapshot root for stale
   `.probe-*` files — fail naming them; (ii) capture
   `turbo run test --filter=provegate --dry=json`'s task hash; (iii) exclusive-create
   (`wx` flag) a unique probe file `.probe-<pid>-<hrtime>.tmp` under
   `docs/research/provegate-bootstrap/source-snapshot/`; (iv) re-capture and assert
   the hash CHANGED; (v) in a `finally`, unlink the probe unconditionally; (vi)
   re-capture and assert the hash restored — so even a failed comparison leaves the
   tree clean and a dirty exit is loud. `--dry=json` never executes tasks: fast, no
   gate-CLI spawn (`runner-sentinel-blocks-cli-spawning-tests` does not apply). Turbo
   2.10.5 (pinned, `package.json:55`) emits the per-task hash — proven by execution
   during iteration 2's review.
   - **Targets:** `scripts/verify/verify-test-inputs.mjs::probe`

---

## 5. Non-Goals (Out of Scope)

- **Re-designing any test.** Every censused read is legitimate; only its cache
  visibility and its resolution path change. Fixture VALUES are byte-frozen.
- **A cache-free `scripts/verify/` twin of any comparison.** Input declaration closes
  the gap without a second implementation of any pin (`two-parsers-wrong-together`).
- **Any change to `verify-turbo-inputs.mjs` policy.** FR-1 uses its sanctioned
  exception path.
- **Narrowing the `*.md` superset to a precise negation list.** Recorded follow-up.
- **Dataflow/alias analysis of read sites.** Refuted at iteration 1. Grammar v4 is
  syntactic and its claim is stated exactly: it catches every escape shape ever
  measured in this corpus (multi-parent literal, split-join, and the never-observed
  nested-URL/nested-dirname/cwd/homedir shapes) — it does not claim adversarial
  completeness. String concatenation assembling a traversal at runtime is the named
  residual, tested as a documented non-catch fixture. The cache guarantee does not
  rest on the boundary alone: it rests on the glob set (scorer-verified complete),
  with the boundary as the drift alarm that keeps the glob set honest — defense in
  depth, per iteration 3's own ruling that the one bypassed read was still
  glob-covered.
- **Chasing absolute-path or environment reads.** Not repository inputs; Turbo cannot
  hash them (§1, known boundary).

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** an edit to any censused path (snapshot, docs page, review artifact, verify
  script, workflow file, git hook, changeset, root manifest, `page.tsx`), **When**
  `pnpm test` runs, **Then** `provegate#test` is a cache miss and the reading tests
  execute.
- **Given** a new test source containing a multi-parent path literal outside the
  exempted helpers, **When** `pnpm verify:test-inputs` runs, **Then** it fails naming
  the file and line.
- **Given** a `repoPath()` call with a non-literal argument or an unledgered path,
  **Then** `verify:test-inputs` fails by name.
- **Given** a `REPO_READ_GLOBS` entry with no covering turbo glob, **Then**
  `verify:test-inputs` fails naming the path.
- **Given** the probe mutation under the snapshot root, **Then** the dry-run task hash
  changes and restores — and on any probe failure the probe file is still removed.
- **Given** no censused-path edit, **Then** caching behaves exactly as after PRD-028.

---

## 7. Technical Considerations

### Architecture

- **Measure, then claim.** The FR-3 grammar ran against the corpus before this
  document was written; §1 is its output, not an estimate. The shipped script is the
  prototype hardened (same AST walk via the package's own `typescript` devDependency —
  a devDependency of the repo toolchain, not a runtime dependency of the package).
- **Extend, do not duplicate.** The `inputs` array, the exceptions entry, the
  script-classes ledger, the ADR table, and the verify bundle all exist; every FR
  appends to a live seam.
- **Two directions or none.** FR-3(b1) ties usage to the ledger, (b2) ties the ledger
  to the cache key; either alone leaves a silent drift path (iteration 2's find).
- **Repo-class placement (ADR-0004).** The census reads `turbo.json` and test
  sources — this repository's stack — so its home is `scripts/verify/`, with the
  ledger row AND the ADR table row landing together (the class gate diffs both ways).

### Rollout & Rollback

- **Atomic rollout, one commit:** helpers + the migrations (21 files at the §1 baseline; scanner-measured at Phase-4 open) + turbo globs + exception
  reason + census script + `script-classes.json` row + ADR-0004 table row + bundle
  row + `package.json` alias + harness test. Partial orderings are red by
  construction; a task plan splitting this across commits is a defect.
- **Rollback, exact reverse order, verified at each step:** (1) remove the harness
  test + census script + alias + `CHECKS` row + `script-classes.json` row + ADR-0004
  table row (wire-or-delete: all six together — the class gate refuses any partial
  subset); (2) revert the migrated files + delete both helpers; (3) revert the turbo
  globs + exception reason to the PRD-028 state. After each step:
  `pnpm verify:script-classes && pnpm verify:turbo-inputs && pnpm verify:workflow &&
pnpm test` green. Step (3) alone restores the pre-PRD cache behavior byte-for-byte.

### Dependencies

- **PRD-024 and PRD-028 are Ship Verified on `main`** — FR-1 appends to their seam.
- **PRD-034 and PRD-038 are Ship Verified (2026-07-29, both landed mid-iteration).**
  The lease that claimed `scripts/verify/verify-workflow.mjs` is released — the locks
  directory is empty at this revision — so the former hard serialization is
  RESOLVED; re-run `gate queue` at claim time as always.
- **Draft PRD-032 also claims `turbo.json`**; it is Phase-1 ITERATE and itself behind
  PRD-034. Re-run `gate queue` before claiming rather than trusting this paragraph.
- **External red baseline, a RECURRING class (iteration 5's re-fire):**
  `pnpm verify:workflow` failed again at this revision because the case-study
  self-hosting sentinel records `"shipVerified": 33` while the fresh derivation is
  34 — the same stale-sentinel class that fired at 32→33, re-armed by PRD-038's
  close; the sentinel's own `--print` mechanism owns each refresh. **This PRD's
  Phase 4 must not start until the aggregate is green** (the cross-cutting floor
  requires it), this PRD does not absorb the fix, and the census-rerun-at-Phase-4
  clause (§1) is the same discipline applied to this PRD's own numbers: every
  close moves the corpus, so bind to re-measurement, not to recorded counts.

---

## 8. Implementation Scope

### In Scope

- [ ] `turbo.json` — twelve globs appended to the `test` task's `inputs`
- [ ] `scripts/verify/turbo-inputs-exceptions.json` — the `test` entry's reason
      extended to enumerate the census
- [ ] `packages/provegate/test/helpers/repo-reads.ts` (new) — `repoPath` +
      `pkgRoot` + `REPO_READ_GLOBS`
- [ ] `packages/provegate/test/helpers/escape-fixtures.ts` (new) — the four
      traversal/content strings, byte-identical
- [ ] 21 test files at the §1 baseline (binding list scanner-measured at Phase-4
      open) — the out-of-package escape sites through `repoPath`, the
      `memory.test.ts:461` in-package rewrite against `pkgRoot`, the 4 fixture
      sites through `escape-fixtures.ts`, mechanical
- [ ] `scripts/verify/verify-test-inputs.mjs` (new) — boundary scan + usage→ledger +
      ledger→turbo + positive control + failure-safe probe
- [ ] `scripts/verify/script-classes.json` — repo-class row
- [ ] `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` — matching Classification
      table row (the class gate diffs both directions)
- [ ] `scripts/verify/verify-workflow.mjs` — `CHECKS` row (claimable: the PRD-034 lease is released; `gate queue` recheck at claim time)
- [ ] `package.json` — `verify:test-inputs` alias
- [ ] `packages/provegate/test/verify-test-inputs.test.ts` (new) — deny/positive
      harness, `doc-claims-script` pattern

---

## 9. Open Questions

- (none)

---

## 10. References

- `_readiness/wip/readiness-036-frozen-snapshot-digest-gate.md` — iterations 1–2:
  the findings this rework answers with measurements
- `_brain/learnings/turbo-cache-masks-out-of-input-reads.md` — the class; its
  `_docs/reviews` instance is census row 4
- `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` — FR-3's placement rule and the
  Classification table FR-3 appends to
- PRD-024 FR-2 / PRD-028 FR-3 — the input-declaration seam this PRD completes
- `_tasks/completed/tasks-025-wiring-audit-completion.md:340-344` — the real-bundle
  fixture's recorded handoff to this census

---

## Memory Inputs

- applied: `turbo-cache-masks-out-of-input-reads` — the class under repair; the
  machine-measured census (§1) covers every reader file the scanner names (18
  out-of-package at the dated baseline, plus the in-package multi-bare site)
  including the record's own `_docs/reviews` origin.
- applied: `narrow-the-grammar-not-the-parser` — applied faithfully this round: the
  grammar was run against the corpus BEFORE authorship (iteration 2 caught the
  previous rework citing this record while skipping its measure-first instruction);
  the numbers in §1 are the measurement.
- applied: `gate-wire-or-delete` — FR-3 ships alias + bundle row + ledger row + ADR
  table row + harness in one move, and the rollback removes all of them together.
- applied: `assert-absent-needs-an-independent-cause` — ten planted deny fixtures
  (the five grammar shapes, non-literal arg, unledgered path, uncovered ledger entry,
  and both helper-shape breaches), each failing from its own independent cause, with
  the passing census as positive control.
- applied: `a-rule-that-exempts-itself` — no suppression syntax; the only doors are
  two structural helper files whose contents the census itself reads and gates.
- reviewed: `two-parsers-wrong-together` — why Non-Goals still reject a cache-free
  twin of any comparison; the input declaration removes the need for a second
  implementation.
- reviewed: `runner-sentinel-blocks-cli-spawning-tests` — FR-4's probe uses
  `turbo --dry=json` only (no task execution, no gate CLI spawn); whole-suite §11
  rows stay on turbo.
- applied: `fixture-must-reach-production-shape` — the harness runs the PRODUCTION
  census script with a target-root argument (the `runLedger` pattern) instead of a
  temp-root copy that would resolve a different `typescript` — the exact defect this
  record describes: a check exercised with cleaner plumbing than production cannot
  detect the production failure.
- applied: `ADR-0004-method-rule-vs-repo-rule` — repo-class placement, and this round
  the ADR's own Classification table is a declared target because
  `verify-script-classes` diffs it against the ledger in both directions.
- reviewed: `adr-section-blank-line-reads-empty` — its watch covers the ADR-0004
  target this PRD now edits. The section anchor is fixed (PRD-035), but the record's
  live hazard binds the FR-3 append: `pnpm format` reflows ADR frontmatter, so the
  implementing agent adds the one table row without running prettier over the ADR
  file and verifies `pnpm verify:brain` and `pnpm verify:script-classes` green after
  the edit.

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
- `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md`
- `packages/provegate/test/**/*.ts` — the whole test-source tree, deliberately a
  glob rather than today's 21-file enumeration (iteration 6's find): the binding
  migration list is the scanner's Phase-4 output, and the lease must own whatever
  that re-measurement names — a static list would leave a newly landed test inside
  the migration but outside the lease. The two helper files land inside this glob.
- `packages/provegate/test/verify-test-inputs.test.ts` (named for clarity; inside
  the glob above)

**Contested, re-measured 2026-07-29 (fifth round):** PRD-034 is Ship Verified and
its lease is released — the locks directory is empty — so no live claim contests
`scripts/verify/verify-workflow.mjs`. Draft PRD-032 still claims `turbo.json` from
Phase-1 ITERATE. Re-run `gate queue` before claiming.

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Review artifact: `_docs/reviews/review-036-frozen-snapshot-digest-gate.md`
- Learning: `none` — the Memory Output above is a reasoned `none`; the class record and
  the placement ADR already exist, and this PRD closes their instances
- Decision: `none` — the ADR-0004 table row is classification maintenance under the
  existing decision, not a new one; the repair pattern is PRD-024's, completed

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                                | Scope | Notes                                                                                                                                                    |
| ---- | -------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-1 | `pnpm verify:turbo-inputs`                                     | repo  | the extended exceptions entry stays valid; no task narrows its key undeclared                                                                            |
| FR-1 | `pnpm verify:test-inputs`                                      | repo  | ledger→turbo coverage: every census glob present in the test task's inputs                                                                               |
| FR-2 | `pnpm verify:test-inputs`                                      | repo  | boundary scan zero violations after the scanner-enumerated migration (21 files at the §1 baseline); every `repoPath` usage ledgered; helper shapes valid |
| FR-2 | `pnpm test`                                                    | repo  | the migrated suite is green through turbo — resolution rewrites changed no assertion or fixture value                                                    |
| FR-3 | `pnpm --filter provegate test test/verify-test-inputs.test.ts` | pkg   | ten planted deny cases fail by name from independent causes; the concatenation non-catch documented; positive control passes                             |
| FR-3 | `pnpm verify:script-classes`                                   | repo  | the ledger row and the ADR-0004 table row agree in both directions                                                                                       |
| FR-4 | `pnpm verify:test-inputs`                                      | repo  | probe ran inside the default pass: hash changed on the exclusive-created snapshot probe, restored after the finally-cleanup, stale probes refused        |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm verify:workflow` — the repo bundle stays green with its new member

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/verify-test-inputs.test.ts` — each of the ten
  planted violations must fail by name from its own independent cause; a census that
  only passes on today's inputs is not evidence, and the concatenation non-catch is
  asserted as a documented limit, not left implied.
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
  `$TURBO_DEFAULT$` or any existing glob while appending.
- DO NOT satisfy FR-3 with a hardcoded list of today's escape sites or a frozen copy
  of §1's output; the scan reads the live test sources every run.
- DO NOT copy the census script to a temp root in the harness — run the production
  script with a target-root argument; a copy loses the `typescript` resolution
  anchor (proven at iteration 3).
- DO NOT add a suppression comment, marker, or exemption field to the boundary scan;
  the two helper files are the only doors.
- DO NOT change any test assertion or fixture VALUE during the FR-2 migration —
  resolution expressions and import homes only.
- DO NOT exempt module specifiers from the boundary scan; the corpus measures zero
  multi-parent specifiers, and a deep import is an escape.
- DO NOT land the `script-classes.json` row without the ADR-0004 table row (or either
  without the script) — the class gate diffs both directions and all partial subsets
  are red.
- DO NOT start Phase 4 while any live lease claims a Conflict Surface path
  (`gate queue` at claim time is the authority — PRD-034's lease is released as of
  this revision), or while `pnpm verify:workflow` is red (the recurring external
  sentinel class; §7).
- DO NOT ship the census in `packages/provegate` (ADR-0004: repo-class).

---

## Changelog

| Date       | Author                                                                                             | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-07-29 | Claude Fable 5, applying the iteration-7 piece                                                     | **Iteration 7 scored 7.98 ITERATE — 0.02 from the bar, one finding: the hard-cap deny note still said "each of the eight planted violations", the count wrapped across a line break so three rounds of greps and replaces missed it (`a-rule-corrected-survives-where-it-is-restated`, literally).** Fixed with a whitespace-tolerant regex, and the final sweep re-run in wrap-tolerant form (live sections flattened before matching); the one other flat-sweep hit was the header comment's superseded iteration-4 narrative, updated to reference the dated baseline. Everything else held under the scorer's execution: census reproduced exactly a third time (56/25/3/0/28-in-21), the surface glob accepted by the production parser and matcher (root, helpers, future nested files in; `src/` out), the Discovery clause judged to close the input-group gap, Scope/DO-NOT conditions confirmed live-lease-bound, all ten Memory Inputs accurate, `lintPrd` ok, five §11 commands safe, hard caps clear. No wip PRD holds an active execution claim over the surface (PRD-032/039 overlaps are Phase-1 ITERATE — queue-time serialization suffices)                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-07-29 | Claude Fable 5, applying the iteration-6 pieces                                                    | **Iteration 6 scored 7.79 ITERATE — census reproduced by the scorer's own scan with ZERO corpus delta (56/25/3/0/28-in-21 exact); A2 and b3 closures confirmed; three residues, all applied same-session.** (1) The [P1]: enumerate-don't-pin conflicted with the lock engine, which builds `ownedPaths` from the static Conflict Surface bullets (`conflicts.ts:207-226`) — a scanner-discovered new file would join the migration but not the lease. Fixed structurally: the surface now claims `packages/provegate/test/**/*.ts` as a glob (the lease owns whatever the Phase-4 re-measurement names), and FR-1 gains the discovery clause — a read outside the twelve declared groups joins the `inputs` list, `REPO_READ_GLOBS`, and the exceptions reason in the same atomic change. (2) The third-round count sweep completed: four fixture strings in FOUR files (two also readers), the census-table header at 23 constructions, the Memory Input disposition scanner-bound, the §11 FR-2 note baseline-bound. (3) The stale PRD-034 serialization prose replaced with the real binding conditions (live-lease check via `gate queue`, aggregate `verify:workflow` green) in Scope and the DO NOT list — the lease is released; the sentinel class re-fired again (34→35) and stays the external Phase-4 precondition                                                                                                                                                                                                                   |
| 2026-07-29 | Claude Fable 5, applying the iteration-5 pieces                                                    | **Iteration 5 scored 7.53 ITERATE — not a regression in the design but the corpus moving twice mid-pipeline: PRD-034 and PRD-038 both shipped between scores, adding `prompts-integrity.test.ts` (a `.changeset` read, glob-covered) and `quickstart-e2e.test.ts` (a build-spawn cwd construction + a markdown-body fixture), which staled every pinned count.** Applied same-session: (1) census re-measured — 56 files, 28 violations in 21 files (23 out-of-package constructions in 18 readers + 1 in-package + 4 fixture strings), no new input group, the twelve globs stand; (2) the **enumerate-don't-pin clause**: §1 is the dated scoring baseline, the BINDING migration list is the scanner re-run at Phase-4 open, Success Metrics measured by the scanner — a corpus that moves at every close can no longer stale this PRD; (3) FR-3(a)'s A2 restated verbatim as §1's parent-carrying definition (the bare-`'..'` shorthand contradicted the split-resolve deny); (4) FR-3(b3) made per-file unambiguous: `repo-reads.ts` may import exactly `node:path`+`node:url`, `escape-fixtures.ts` may import nothing and call nothing, four named constants incl. `QUICKSTART_TASKS_FIXTURE`; (5) the count sweep (rollout/rollback/scope/hard-cap ten causes/`pkgRoot` in the helper summary) and the §7 facts refresh — 034/038 Ship Verified, lease released, the contested paragraph re-measured, and the recurring stale-sentinel class named with the census-rerun clause as the same discipline applied to this PRD's own numbers |
| 2026-07-29 | Claude Fable 5, applying the iteration-4 precision pieces                                          | **Iteration 4 scored 7.83 ITERATE and RULED TL 5 — "the two-layer argument holds at the value level" — closing the cut question: Value 3.50 stands.** The five precision pieces applied same-session: (1) A2 extended to ≥2 parent-carrying literal arguments per call (covers the mixed `join(x, '..', '../docs')` shape the scorer named; re-measured — zero sites beyond the same two); (2) the census legal-side count restated under a defined predicate (contains `'../'`, not A1, not bare — 187, reproducing the scorer's own number; 189 was a predicate-ambiguous figure); (3) reader taxonomy made exact (21 out-of-package reads in 16 files + the one in-package multi-bare site; 19 migrated files total); (4) helper shapes fully enumerated (three named fixture constants; `repo-reads.ts` limited to its three exports) with BOTH breach directions planted — the deny suite grows to ten independent causes including the split-resolve variant and the `repo-reads.ts` forbidden-import-plus-read; (5) Memory Inputs corrected (ten-cause fixture rationale; `fixture-must-reach-production-shape` added for the production-script-with-target-root harness decision). The external `verify:workflow` red cleared upstream (case-study sentinel now 33) — the scorer confirmed green by execution                                                                                                                                                                                                                            |
| 2026-07-29 | Claude Fable 5, on the owner's fourth-round direction (chosen over the recorded cut a second time) | **Grammar v4 — iteration 3's five pieces closed by re-measurement.** The scanner grew rules A2 (≥2 bare `'..'` args in one call — catches the live `content-prompts.test.ts:458` split-join iteration 3 found), A3 (nested `dirname`), A4 (nested URL) and was RE-RUN against the corpus; §1 now records the exclusive partition (25 violations in 19 files: 23 multi-parent + 2 multi-bare-call; 0 for every never-observed shape; the 10 in-package `pkgRoot` anchors and 6 fixture hops measured legal without exemption — A2's one false positive, `memory.test.ts:461`, is in-package and migrates to the exported `pkgRoot` cleanly). FR-3 gains (b3) helper AST-shape validation (exports/imports/calls closed, breach fails by name) and the stated toolchain anchor (`createRequire` against `packages/provegate/package.json`; harness runs the production script with a target-root argument — a temp-root copy loses resolution, proven). Deny set grows to eight planted causes plus the concatenation non-catch asserted as a documented limit. §7 explicitly serializes Phase 4 behind the external `verify:workflow` red (PRD-037's stale `shipVerified` sentinel, not absorbed). Value 3.50 held with TL 5 re-argued on defense in depth — the ground iteration 3 conceded: glob set scorer-verified complete, the one bypass still glob-covered; fallback to the owner's cut/threshold call restated                                                                                                                           |
| 2026-07-29 | Claude Fable 5, on the owner's third-rework direction (chosen over the recorded cut)               | **Measure-first rework.** The FR-3 grammar was prototyped and EXECUTED against the live corpus before this document was touched; §1 records its output verbatim (54 files; 23 multi-parent violations in 18 files — 20 reads, 3 traversal fixtures; 0 multi-parent module specifiers; 210 legal single-parent literals). Iteration 2's findings closed by measurement, not prose: census +3 groups (`apps/web/app/page.tsx`; `.github/workflows/**` and `.githooks/**` behind `practices-pack`'s live `auditWiring` call) and a 16th reader; the 130-import objection dissolves under the multi-parent rule (imports are single-parent — legal by grammar, no exemption needed) and the ~20 single-segment traversal fixtures likewise; the 3 genuinely multi-parent fixture strings move byte-identical into an exempted `escape-fixtures.ts`; FR-3 gains the missing direction (usage→ledger, fail-closed on non-literal args); FR-4 made failure-safe (stale-probe pre-scan, `wx` exclusive create, `finally` cleanup, restored-hash assert); ADR-0004's Classification table row added to Targets/Scope/Conflict Surface/rollout/rollback (`verify-script-classes` diffs both ways). Value re-argued at 3.50: TL 5 on the two blockers the iteration-2 ruling named now removed with evidence; fallback to the owner's cut restated if TL is held at 4                                                                                                                                                                                       |
| 2026-07-29 | Claude Fable 5, on the owner's rework direction                                                    | **Iteration-1 rework — second expansion.** Census 2→12 groups; AST scanner replaced by a byte boundary; Turbo probe; rollout/rollback; Value 3.45→3.50 (RM 5→4, TL 4→5). Iteration 2 (5.85 ITERATE) found the census still incomplete (3 more groups), the byte rule refusing 130 imports and the traversal fixtures, the helper one-directional, and the ADR-0004 row missing — superseded by the measure-first rework above                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-07-28 | Claude Fable 5, on the owner's triage direction                                                    | **Expanded and queued (first expansion).** Both then-known reads declared; census as the class's standing gate. Value 2.80 → 3.45. Iteration 1 (5.55 ITERATE) refuted the two-read baseline and RM 5 — superseded                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-07-28 | Claude Fable 5, converting a deferral at the board cap                                             | Converted from the STATUS.md deferral "Frozen-snapshot digest" (opened PRD-017 Phase 6 round 9, due 2026-08-29) at the board cap of 15 rows. Original cache-free-twin sketch rejected in Non-Goals. Value scored honestly at 2.80, below threshold, expand-or-cut recorded for the owner's triage. Created with `gate new`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
