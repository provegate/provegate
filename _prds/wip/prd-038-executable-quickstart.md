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

This PRD makes the quickstart a fixture: a harness extracts the fenced commands from
the doc — **the committed doc is the source; the harness holds no copy of the
sequence** — runs them in order in a scratch repository against the built CLI, and
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
| Quickstart steps executed by any gate | 0 | all fenced commands in sequence | the harness parses the committed doc and runs what it finds |
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

1. **FR-1**: The extraction. A harness parses `packages/provegate/QUICKSTART.md`'s
   fenced shell blocks in document order — the doc is the single source; the harness
   stores no command copy (`derive-the-requirement-from-the-consumer`: the consumer is
   the reader, and the harness runs what the reader reads). Non-command fences (output
   examples) are distinguished by the doc's own fence language tags; if the tags are
   ambiguous today, the FR includes tagging them — a docs-only edit that changes no
   visible rendering.
   - **Targets:** `packages/provegate/test/quickstart-e2e.test.ts`,
     `packages/provegate/QUICKSTART.md`
2. **FR-2**: The execution and the assertions. Each extracted command runs in a scratch
   git repository (temp dir; the built CLI on PATH via `node dist/cli.js`
   substitution), in sequence, with per-step assertions derived from the doc's own
   stated outcomes: `init` scaffolds the promised tree; `new` allocates the promised
   hotfix-class PRD; `check` prints the promised verdict; the first close completes
   with the promised artifacts. A step exiting non-zero, or an assertion failing,
   names the step and the doc line it came from. The harness never touches the real
   repository (`push-is-human-by-omission` preserved by construction: the scratch repo
   has no remote).
   - **Targets:** `packages/provegate/test/quickstart-e2e.test.ts`
3. **FR-3**: The two docs, one sequence. The docs-site quickstart
   (`apps/docs/content/docs/quickstart.mdx`) either derives its command blocks from
   `QUICKSTART.md` or is asserted command-sequence-equivalent by the harness — the
   implementation picks whichever the MDX pipeline supports cleanly and records the
   choice; what it may not do is leave two independently-edited sequences
   (`two-parsers-wrong-together`, applied to prose).
   - **Targets:** `apps/docs/content/docs/quickstart.mdx`,
     `packages/provegate/test/quickstart-e2e.test.ts`
4. **FR-4**: The cache boundary, honestly. The harness lives in
   `packages/provegate/test/` and reads `QUICKSTART.md` **inside the package** — no
   turbo input issue. The docs-site file in FR-3 is OUTSIDE the package: whatever
   mechanism FR-3 picks must not read it from inside `provegate#test`
   (`turbo-cache-masks-out-of-input-reads`) — either the derivation happens at docs
   build time, or the equivalence check runs as a root script. The FR is satisfied
   only with the boundary stated in a comment at the read site.
   - **Targets:** `packages/provegate/test/quickstart-e2e.test.ts` or
     `scripts/verify/verify-quickstart-parity.mjs` (the implementation's recorded
     choice), `package.json`, `scripts/verify/verify-workflow.mjs` (only if the root
     script route is taken)

---

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
- **Given** a deliberately broken step (mutation: reorder two commands in a scratch
  copy of the doc), **When** the harness runs against it, **Then** it fails naming the
  step and its doc line — proving the doc is the source
  (`assert-absent-needs-an-independent-cause`: the failure's cause is the doc change,
  not a harness edit).
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
- [ ] `scripts/verify/verify-quickstart-parity.mjs` + `package.json` +
      `scripts/verify/verify-workflow.mjs` — only if FR-3/FR-4 take the root-script
      route (recorded choice)

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

---

## Conflict Surface

- `packages/provegate/test/quickstart-e2e.test.ts`
- `packages/provegate/QUICKSTART.md`
- `apps/docs/content/docs/quickstart.mdx`
- `scripts/verify/verify-quickstart-parity.mjs`

---

## Durable Artifacts

- `_brain/learnings/quickstart-is-a-fixture.md` — the Memory Output above, repeated here
- `_brain/INDEX.md` — one pointer line, per the memory protocol
- `_docs/reviews/review-038-executable-quickstart.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

| FR   | Command / Check                                                              | Scope | Notes                                                              |
| ---- | ---------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------- |
| FR-1 | `pnpm --filter provegate test test/quickstart-e2e.test.ts -t extraction`      | pkg   | commands come from the doc; the tag rules are exercised             |
| FR-2 | `pnpm --filter provegate test test/quickstart-e2e.test.ts -t sequence`        | pkg   | full scratch-repo run; per-step outcome assertions                  |
| FR-2 | `pnpm --filter provegate test test/quickstart-e2e.test.ts -t mutation`        | pkg   | a reordered scratch-copy doc fails naming the step and line         |
| FR-3 | `pnpm --filter provegate test test/quickstart-e2e.test.ts -t parity`          | pkg   | or the root-script row below, per the recorded FR-3/FR-4 choice     |
| FR-4 | `pnpm verify:workflow`                                                        | repo  | if the root-script route is taken, the bundle executes the member   |

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
| 2026-07-28 | orchestrating session, for owner review | Drafted as the second of three Faz E launch items (portfolio-review outward-gap action): the first-touch promise becomes an executed fixture — doc-sourced commands, scratch-repo e2e, both-direction drift gates, and a parity rule for the rendered twin. |
