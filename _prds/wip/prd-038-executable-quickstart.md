# PRD-038: The Quickstart Executes, or It Fails

> **Status**: Draft
>
> **Created**: 2026-07-28
> **Updated**: 2026-07-28
> **Author**: orchestrating session, for owner review (Faz E gap named in the 2026-07-28 portfolio review)
> **Audience**: Implementing Agent
> **Slug**: `executable-quickstart`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: workflow tooling — a harness that executes existing docs; no user-facing capability changes, but a public promise (the quickstart) gains a gate.
> **Autonomous Close**: eligible
> **Value**: 3.80 (MF/UI/TL/AR/RM: 4/4/3/5/3)

<!-- 0.25*4 + 0.25*4 + 0.20*3 + 0.15*5 + 0.15*3
     = 1.00 + 1.00 + 0.60 + 0.75 + 0.45 = 3.80
     MF 4: the method's first-touch path held by the method's own kind of gate. UI 4: the
     quickstart IS the first user experience; a broken step is a lost adopter. TL 3:
     de-risks every future CLI change against the doc silently breaking. AR 5: the
     roadmap's own risk table says "süreç ağır algısı adoption öldürür — quickstart ...
     en hafif yol ilk izlenim". RM 3: an e2e harness has moving parts (scratch repos,
     tmp dirs), but it is test-only surface. -->

<!-- Autonomous Close: `eligible` — every verification is machine-checkable; no
operator-owned rows. -->

---

## 1. Introduction / Overview

`QUICKSTART.md` (shipped in the package) and `apps/docs/content/docs/quickstart.mdx`
(PRD-004) promise a first-touch path: install → `gate init` → `gate new` (hotfix class
first, per the roadmap's lightest-first-impression rule) → `gate check` → a first gated
close. **Nothing executes that promise.** Every CLI change since PRD-004 has been free
to break a quickstart step silently — the docs are prose the gates never read, which is
exactly the shape `docs-outlive-the-gate-they-promise` records.

This PRD makes the quickstart a fixture: a harness extracts the tagged scenario
region's commands from the doc — **the committed doc is the source; the harness holds
no copy of the sequence** — runs them in order in a scratch repository against the built CLI, and
asserts each step's promised outcome (the tree `init` scaffolds, the PRD `new`
creates, the lint verdict `check` prints, the close `run` completes). A quickstart
edit that breaks the path, or a CLI change that breaks the quickstart, turns a page
red instead of an adopter's first five minutes.

---

## 2. Goals

### Primary Goals

- [ ] The package quickstart's command sequence executes end to end in CI, from the
      committed doc, against the built CLI, in a scratch repository.
- [ ] Doc and CLI cannot drift apart silently in either direction.
- [ ] The docs-site quickstart is held to the same sequence as the package
      `QUICKSTART.md` (one source of truth; the other proven equivalent or derived).

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Quickstart steps executed by any gate | 0 | every command in the tagged `qs:scenario` region, in sequence | the harness parses the region at run time and runs what it finds |
| Promised outcomes asserted | 0 | one assertion per step's stated result | the harness's per-step expectations, derived from the doc's own prose claims |
| Divergence between the two quickstart docs | unmeasured | 0 command-sequence divergence | the equivalence check in FR-3 |

---

## 3. User Stories

#### User Story 1

```
As a first-time adopter following the quickstart,
I want every command in it to work exactly as printed,
so that my first five minutes build trust instead of a bug report.
```

**Acceptance Criteria:**

- [ ] The §6 criteria for the harness: doc-sourced commands, scratch-repo execution,
      per-step outcome assertions.

#### User Story 2

```
As a maintainer changing the CLI,
I want a broken quickstart step to fail my build,
so that the first-touch promise is a gate I cannot forget, not prose I must remember.
```

**Acceptance Criteria:**

- [ ] The harness runs in CI and in `pnpm test`; a deliberately broken step fails by
      naming the step (§6 mutation criterion).

---

## 4. Functional Requirements

**Reworked at iteration 1 (4.95 → Phase 1 rework):** the scorer measured the real
corpus — 14 commands in `QUICKSTART.md` versus 8 in the docs twin, edit distance 7 —
found the unpublished-package install contradiction, and surfaced the runner-sentinel
record. Every mechanism below is now closed, decided, and hermetic.

1. **FR-1**: The extraction, under a **closed scenario grammar**. `QUICKSTART.md` gains
   rendering-neutral markers: one `<!-- qs:scenario -->` … `<!-- /qs:scenario -->`
   region delimits the canonical first-touch path; within it, every ` ```sh ` fence is
   executable and every ` ```text ` fence is output illustration; the ONE currently
   untagged output fence in the corpus is retagged `text` in the same change, after
   which an untagged fence inside the region is a named failure, not a guess. Command splitting: one command per line;
   backslash continuations joined; `#`-prefixed and blank lines skipped; every command
   retains its doc line number for failure naming. Package-only extras (worktree,
   practices) live OUTSIDE the region and are not part of the canonical scenario.
   The harness stores no command copy; it parses the region at run time
   (`derive-the-requirement-from-the-consumer`).
   - **Targets:** `packages/provegate/test/quickstart-e2e.test.ts`,
     `packages/provegate/QUICKSTART.md`
2. **FR-2**: The execution — hermetic, with the scratch state model explicit.
   - **Install mapping, exhaustive:** the doc's `npm install -D provegate` line maps —
     by exact source-line match, with an assertion that no OTHER install line exists
     unmapped — to installing the locally packed tarball (`pnpm --filter provegate
     build` + `npm pack` in setup). The child npm's registry is pointed at an
     unreachable local path, so any accidental registry fetch fails loudly: **no
     network fallback can exist**.
   - **Scratch state model, enumerated through the real live close** (iteration 2's
     trace), as a doc-command [D] versus harness-scaffolding [H] table the test file
     carries verbatim: [H] temp root; HOME/XDG/npm-userconfig/TMPDIR remapped;
     `git init -b main`; repo-local identity; initial commit → [D] install (tarball
     mapping) → [D] `gate init` → [H] config fill + installed-file disposition
     recorded → [D] `gate new` (hotfix) → [H] fill the generated PRD minimally
     (targets, §11 row, memory sections) → [H] baseline commit (the claim rules
     demand committed control files — PRD-007) → [D] `gate check` (verdict asserted)
     → [D/H per the doc's printed path] plain claim (`gate open`), task-file
     creation, a passed independent-review row + review artifact, durable
     declaration and its evidence, feature-branch creation and feature commits,
     clean-tree assertion → [D] `gate run --dry-run` then the live `gate run` →
     [H] merged-base inspection (the close's promised artifacts exist on the scratch
     main) → [H] cleanup. Every [H] row exists only to satisfy a precondition the
     CLI itself enforces, and the table says which precondition.
   - **Sentinel hygiene:** every spawned CLI child receives a sanitized environment
     with `PROVEGATE_RUN_ACTIVE` (and every runner sentinel) removed — the
     `runner-sentinel-blocks-cli-spawning-tests` record's prescription for a
     CLI-spawning test, so the §11 rows stay green under `gate run` itself.
   - **Remote-impossibility, asserted:** `git remote` is asserted EMPTY before and
     after every step; no inherited global git config can add one (HOME is remapped).
   - **Cleanup:** in `finally`; deletion verified after both a passing run and a
     planted-failure run; on failure the scratch log tail is copied into the test
     failure message BEFORE deletion so diagnostics survive the cleanup.
   - **Targets:** `packages/provegate/test/quickstart-e2e.test.ts`
3. **FR-3**: Parity, DECIDED — a root verifier over the tagged region only.
   `scripts/verify/verify-quickstart-parity.mjs` extracts the `qs:scenario` region
   from `packages/provegate/QUICKSTART.md` and from
   `apps/docs/content/docs/quickstart.mdx` (which gains the same markers) and asserts
   command-sequence equality; package-only optional sections stay package-only and
   unmeasured. **Measured baseline, recorded:** today the docs are 14 versus 8
   commands, edit distance 7 — the implementation converges the canonical region (the
   docs twin adopts the package sequence; teaching prose stays free) and the verifier
   holds the convergence. It is a root script because the docs file sits outside the
   package's turbo inputs (`turbo-cache-masks-out-of-input-reads`), with the comment
   at the read site.
   - **Targets:** `scripts/verify/verify-quickstart-parity.mjs`,
     `apps/docs/content/docs/quickstart.mdx`, `packages/provegate/QUICKSTART.md`
4. **FR-4**: The verifier's wiring and classification. `verify:quickstart-parity` in
   root `package.json`; a `verify:workflow` CHECKS member (`gate-wire-or-delete`); a
   row in `scripts/verify/script-classes.json`; and the class assignment justified
   under `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` — the parity rule governs
   THIS repository's two documents, a repo rule, and the ADR gains that row (an
   amendment, declared in Memory Outputs and Durable Artifacts).
   - **Targets:** `package.json`, `scripts/verify/verify-workflow.mjs`,
     `scripts/verify/script-classes.json`,
     `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md`

## 5. Non-Goals (Out of Scope)

- **Rewriting the quickstart's content or teaching order.** The sequence is PRD-004's;
  this PRD executes it. A step that proves broken is fixed as the minimal correction,
  not redesigned.
- **Browser/docs-site rendering tests.** The docs app builds already; only the command
  sequence is in scope.
- **Benchmarking or timing promises.** No "in five minutes" claim is asserted.
- **The brownfield guide.** `brownfield.mdx` is a different path; a follow-up if this
  pattern earns it.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** the committed `QUICKSTART.md`, **When** the harness runs, **Then** every
  fenced command executes in order in a scratch repo and every per-step assertion
  passes.
- **Given** the mutation pair — a scratch copy of the doc with `gate init` and
  `gate new` swapped — **When** the harness runs against the copy, **Then** the
  expected failing step is the relocated `gate new` (no workspace to allocate in),
  the failure names that step with its retained doc line from the COPY, and the
  diagnostic carries the child's stderr tail — proving the doc is the source
  (`assert-absent-needs-an-independent-cause`: the cause is the doc change, not a
  harness edit).
- **Given** the planted cleanup failure — a file made read-only inside the scratch
  root before teardown — **When** the harness finishes, **Then** cleanup still
  completes (permissions reset in `finally`), deletion is verified, and the
  diagnostic tail was captured before it.
- **Given** a CLI change that breaks a quickstart outcome, **When** `pnpm test` runs,
  **Then** the harness fails before any adopter sees it.
- **Given** the two quickstart docs, **When** the FR-3 mechanism runs, **Then** a
  command-sequence divergence fails by name.
- **Given** the scratch repository after a full run, **When** inspected, **Then** it
  has no remote and nothing outside the temp dir was written.

---

## 7. Technical Considerations

**The doc is the fixture.** The harness must fail when the DOC changes incompatibly,
not only when the CLI does — both directions are the contract. Parsing fenced blocks
by language tag is deliberate: it keeps the doc readable and the extraction dumb.

**Scratch-repo hygiene.** Temp dir per run, `git init` inside, no remote ever
configured, cleanup on success and failure both; the worktree-lifecycle tests
(PRD-007) already model this pattern — reuse their helpers where exported.

**Rollback.** Test-only surface plus possible fence tags; plain revert.

**Sequencing.** `packages/provegate/test/` overlaps no active lease's declared surface,
but PRD-026 owns `test/init.test.ts`/`test/practices-pack.test.ts` and the practices
tree — this PRD adds a NEW test file and touches neither. Re-run `gate queue` before
Phase 3.

### Dependencies

- None. The quickstart and CLI both shipped; the harness binds them.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/test/quickstart-e2e.test.ts` — new: extraction, execution,
      assertions, mutation-provable doc-sourcing
- [ ] `packages/provegate/QUICKSTART.md` — fence language tags only, if needed (FR-1)
- [ ] `apps/docs/content/docs/quickstart.mdx` — derivation or parity per FR-3
- [ ] `scripts/verify/verify-quickstart-parity.mjs` + `package.json` (shared
      append-only, out of Conflict Surface by rule) + `scripts/verify/verify-workflow.mjs`
      + `scripts/verify/script-classes.json` — the decided root-verifier route (FR-3/4)
- [ ] `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` — the class-row amendment

---

## 9. Open Questions

- (none)

---

## 10. References

- `packages/provegate/QUICKSTART.md` — the promise this executes
- `apps/docs/content/docs/quickstart.mdx` — the same promise, rendered
- `docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md` §3 — the
  adoption-risk row this answers ("süreç ağır algısı adoption öldürür")
- `_brain/learnings/docs-outlive-the-gate-they-promise.md` — the record this is built on

---

## Memory Inputs

- applied: `docs-outlive-the-gate-they-promise` — the founding record: the quickstart
  is a promise no gate reads; this PRD is the gate.
- applied: `derive-the-requirement-from-the-consumer` — the harness runs what the
  reader reads: commands come from the committed doc at run time, never from a copy in
  the test.
- applied: `turbo-cache-masks-out-of-input-reads` — FR-4's boundary: the package test
  may read only in-package files; the docs-site parity crosses the boundary via docs
  build or a root script, stated in a comment at the read site.
- applied: `assert-absent-needs-an-independent-cause` — the mutation criterion proves
  doc-sourcing by changing the DOC (in a scratch copy) and watching the harness fail
  for that reason alone.
- applied: `push-is-human-by-omission` — the scratch repo never has a remote; the
  harness cannot push by construction, and the §6 criterion asserts it.
- applied: `runner-sentinel-blocks-cli-spawning-tests` — its subject exactly: this
  harness spawns the CLI from a test, so every child gets a sanitized environment with
  the runner sentinels removed (FR-2), keeping the §11 rows green under `gate run`.
- applied: `gate-wire-or-delete` — the FR-4 wiring exists because of it: the parity
  verifier is registered, a CHECKS member, and classed, or it would be a registered
  check with no executing surface.
- applied: `ADR-0004-method-rule-vs-repo-rule` — the parity rule governs this
  repository's two documents, a repo rule by the ADR's own test; FR-4 amends the ADR
  with the class row rather than leaving the assignment implicit.
- reviewed: `adr-section-blank-line-reads-empty` — its watch covers `_brain/adr/**`,
  which FR-4's amendment touches. The anchor defect is fixed (PRD-035); the live
  half of the record binds here: the ADR edit must not be swept by `pnpm format`
  (frontmatter reflow hazard), so the amendment is hand-placed in the existing
  section shape and `verify:brain` holds it.
- reviewed: `two-parsers-wrong-together` — two independently-edited quickstart
  sequences are two implementations of one promise; FR-3 exists to keep it one.
- reviewed: `fixture-must-reach-production-shape` — the harness invokes the BUILT CLI
  as an adopter would, not internal functions; a step that calls `initWorkspace`
  directly would prove nothing about the printed command.

---

## Memory Outputs

- learning: `_brain/learnings/quickstart-is-a-fixture.md` — a public first-touch doc is
  a test fixture with a rendering: extract-and-execute beats restate-and-hope, the doc
  must be the runtime source so both directions of drift fail, and the mutation probe
  that proves doc-sourcing is part of the pattern, not optional.
- adr: `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` — amended with the parity
  verifier's repo-rule class row (FR-4); the decision framework is untouched, one
  application row is added.

---

## Conflict Surface

- `packages/provegate/test/quickstart-e2e.test.ts`
- `packages/provegate/QUICKSTART.md`
- `apps/docs/content/docs/quickstart.mdx`
- `scripts/verify/verify-quickstart-parity.mjs`
- `scripts/verify/verify-workflow.mjs`
- `scripts/verify/script-classes.json`
- `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md`

---

## Durable Artifacts

- `_brain/learnings/quickstart-is-a-fixture.md` — the Memory Output above, repeated here
- `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` — the amendment, repeated here
- `_brain/INDEX.md` — one pointer line, per the memory protocol
- `_docs/reviews/review-038-executable-quickstart.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

| FR   | Command / Check                                                              | Scope | Notes                                                              |
| ---- | ---------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------- |
| FR-1 | `pnpm --filter provegate test test/quickstart-e2e.test.ts -t extraction`      | pkg   | commands come from the doc; the tag rules are exercised             |
| FR-2 | `pnpm --filter provegate test test/quickstart-e2e.test.ts -t sequence`        | pkg   | full scratch-repo run; per-step outcome assertions                  |
| FR-2 | `pnpm --filter provegate test test/quickstart-e2e.test.ts -t mutation`        | pkg   | a reordered scratch-copy doc fails naming the step and line         |
| FR-3 | `pnpm verify:quickstart-parity`                                               | repo  | the root verifier compares the tagged regions of both docs directly |
| FR-4 | `pnpm verify:workflow`                                                        | repo  | the bundle executes the member; wire-or-delete sees the surface     |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build

Before Phase 2 PASS, run: `gate check PRD-038`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT keep a copy of the command sequence in the harness. The doc is the source;
  a copy is the drift this PRD exists to kill.
- DO NOT call package internals for any step — the printed command runs, or the step
  is not verified.
- DO NOT configure a remote in the scratch repo, ever.
- DO NOT read the docs-site file from inside `provegate#test` (the turbo boundary).
- DO NOT redesign the quickstart while wiring it — minimal fixes only; teaching-order
  changes are the owner's.
- DO NOT let the mutation criterion mutate the committed doc — scratch copies only.
- DO NOT introduce `any`; no network; no push path; no runtime dependency.

---

## Changelog

| Date       | Author | Changes                                                                                                    |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| 2026-07-28 | orchestrating session (author), second rework | **Iteration 2 (6.10) applied.** Every "all fenced commands" promise replaced by the tagged-region contract, and the one untagged output fence retagged so an untagged fence inside the region becomes a named failure. The scratch model enumerated THROUGH the real live close as a [D]/[H] table (installed-file disposition, minimal PRD fill, baseline commit, plain claim, task file, passed review row + artifact, durable evidence, feature branch/commits, clean-tree assertion, dry then live `gate run`, merged-base inspection, cleanup) — every [H] row tied to the CLI precondition it satisfies. §11's FR-3 "or" removed: `pnpm verify:quickstart-parity` directly. The mutation pair specified exactly (init/new swap; expected failing step, retained line, stderr-tail diagnostic) and the planted cleanup failure named (read-only file; permissions reset in finally). |
| 2026-07-28 | orchestrating session (author), Phase 1 rework | **Iteration 1 scored 4.95 ITERATE; band prescribes Phase 1 rework, taken the same day.** The extraction gains a closed scenario grammar (`qs:scenario` region markers, per-line splitting rules, doc-line retention; the existing output tags recorded as adequate). The install contradiction resolved hermetically: the unpublished-package `npm install -D provegate` line maps by exact source match to a locally packed tarball with an unreachable registry — no network fallback can exist. The scratch state model enumerated (remapped HOME/XDG/npm/TMP, local git identity, the doc-command-vs-setup split incl. the committed-state preconditions PRD-007 demands). Sentinel hygiene added per `runner-sentinel-blocks-cli-spawning-tests`. FR-3 decided: a root parity verifier over the tagged region only, with the measured 14-vs-8/edit-distance-7 baseline recorded and the docs twin converging. FR-4 adds wiring + `script-classes.json` + the ADR-0004 repo-rule amendment (Memory Output + Durable). Remote-impossibility and cleanup made executable assertions. |
| 2026-07-28 | orchestrating session, for owner review | Drafted as the second of three Faz E launch items (portfolio-review outward-gap action): the first-touch promise becomes an executed fixture — doc-sourced commands, scratch-repo e2e, both-direction drift gates, and a parity rule for the rendered twin. |
