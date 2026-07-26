# PRD-018: Closed-Loop Memory Contract and Enforcement

> **Status**: Ship Verified
>
> **Created**: 2026-07-25
> **Updated**: 2026-07-26
> **Author**: Codex, for owner review
> **Audience**: Implementing Agent
> **Slug**: `memory-contract-enforcement`
> **Cycle Phase**: 3 (Task Generation)
> **PRD Class**: infra
> **Class Rationale**: This changes workflow artifacts, phase prompts, readiness lint,
> and runner gates rather than an application feature.
> **Autonomous Close**: operator-gated
> **Value**: 4.55 (MF/UI/TL/AR/RM: 5/5/5/4/3)

<!-- 0.25*5 + 0.25*5 + 0.20*5 + 0.15*4 + 0.15*3 = 4.55. -->

---

## 1. Introduction / Overview

PRD-017 provides the owner-approved method addendum, default-off memory configuration,
typed record parser, and strong standalone validator. This PRD uses that substrate to
close the learning loop: prior records become explicit PRD inputs, selected slugs flow
through readiness/tasks/implementation/review, exact new records become Phase 7 outputs,
and watched paths or weakened declarations cannot silently bypass review.

It also activates this repository safely. A fresh practices manifest omits `phases.4`
entirely so configured floor gates survive deep merge. This repo’s explicit dogfood
manifest repeats the four Phase 4 floor commands and adds `verify:workflow` plus the
built-site `check-egress`, then wires `verify:brain` in Phase 7. No gate is enabled
before its implementation and command exist.

**Dependency:** PRD-017 must be Ship Verified before this PRD enters Phase 4.

---

## 2. Goals

### Primary Goals

- [ ] Add a parseable Memory Inputs/Outputs contract to new memory-enabled PRDs.
- [ ] Carry selected memory through Phases 1–7 and independent review.
- [ ] Enforce watched-target/diff acknowledgement and append-only emergent outputs.
- [ ] Block declaration weakening against the immutable base-ref PRD without owner
      acceptance.
- [ ] Enable the closed loop in this repo and fresh practices installs without
      weakening Phase 4 floors or overwriting adopter files.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| New memory-enabled PRDs with valid input/output sections | 0% | 100% | readiness fixtures |
| Watched target/diff overlaps acknowledged | unmeasured | 100% | deny fixtures |
| Declared memory outputs validated before merge | diff-only | 100% | chain fixtures |
| Root Phase 4 floor commands after manifest load | implicit 4 | exact 6 including workflow/egress | manifest test |
| Runtime dependencies / push paths added | 0 | 0 | package/static gates |

---

## 3. User Stories

#### User Story 1

```
As a PRD author and reviewer,
I want prior memory recorded with a disposition,
so that known constraints cannot disappear between planning and implementation.
```

**Acceptance Criteria:**

- [ ] Inputs reference active indexed records with `applied`, `reviewed`, or
      `not-applicable` and a rationale; reasoned `none` is allowed only when empty.
- [ ] Every active watch overlapping a normalized FR target appears as an input.

#### User Story 2

```
As a memory steward closing a PRD,
I want exact output paths and immutable-baseline comparison,
so that learning capture cannot be ceremonial or silently weakened.
```

**Acceptance Criteria:**

- [ ] Outputs are exact learning/ADR paths or one reasoned `none`, never both.
- [ ] Emergent output append is allowed; baseline removal/weakening fails unless the
      PRD is operator-gated and owner acceptance exists.

---

## 4. Functional Requirements

1. **FR-1 — PRD memory artifact contract:** Add exact Memory Inputs and Memory Outputs
   grammar from the PRD-017 addendum to the shipped PRD template and typed artifact
   parser. Inputs validate dispositions/slugs/rationales; outputs validate type/exact
   repo-relative path/rationale. A non-empty output set cannot contain `none`; every
   output is also a Durable Artifact. Target matching strips `::SymbolName`.
   - **Targets:** `packages/provegate/templates/prd-template.md`,
     `packages/provegate/src/core/memory/artifacts.ts` (new),
     `packages/provegate/test/content-templates.test.ts`

2. **FR-2 — Readiness watch gate:** When `memory.enabled` is true, readiness requires
   both sections, resolves active indexed inputs, rejects duplicates/superseded/missing
   records, matches record `watch` globs against normalized FR Targets, and fails on
   any omitted overlap. Disabled repositories retain current behavior; historical PRDs
   are not rewritten.
   - **Targets:** `packages/provegate/src/core/gates/prd-ready.ts`,
     `packages/provegate/src/core/memory/artifacts.ts`,
     `packages/provegate/test/prd-ready.test.ts`

3. **FR-3 — Recall through Phase 1–7:** Update the addendum-traceable phase prompts,
   placeholder registry, readiness/tasks templates, knowledge protocols, practices
   bootstrap, and thin agent shims. Product/architecture docs maintain current
   explanations while `_brain` owns non-derivable traps/rationale.

   Each prompt gains exactly one stated obligation, so `content-prompts.test.ts` asserts
   **per file** rather than proving the directory changed:

   | Prompt file | Obligation the file must state |
   | ----------- | ------------------------------ |
   | `phase-1-prd-generator.md` | Select Memory Inputs from the INDEX with a disposition and rationale each; emit `none` only with a reason |
   | `phase-2-readiness-scorer.md` | Challenge each input's relevance and score a ceremonial or unexamined `none` down rather than accepting it |
   | `phase-3-task-generator.md` | Carry the selected slugs into a Memory Context section and bind a task to re-opening each before its dependent work |
   | `phase-4-implementation.md` | Open each detail file and confirm the paths and commands it names still exist before acting on it |
   | `phase-5-testing.md` | **None.** Addendum §8 states "No memory obligation. Verification is verification," and §8 forbids any prompt obligation it does not name. Removed at the Phase 6 close by owner decision; the file is asserted to carry no memory instruction |
   | `phase-6-final-auditing.md` | Independently audit whether each input was actually applied, and challenge every `none` — an unexamined `none` is a finding |
   | `phase-7-learning.md` | Capture exact output paths into both Memory Outputs and Durable Artifacts before writing the record |
   | `knowledge-ingest.md` | Write the record only after the PRD declares its exact path |
   | `knowledge-lint.md` | Validate the declared grammar, not prose quality |
   | `orchestration-runner.md` | Refuse a Phase 7 close whose declared outputs are absent from the merge diff |

   `PLACEHOLDERS.md` registers any new token the above introduce; `adapters/**` stays
   vendor-neutral and gains no obligation of its own.
   - **Targets:** `packages/provegate/prompts/**`,
     `packages/provegate/templates/readiness-template.md`,
     `packages/provegate/templates/tasks-template.md`,
     `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`,
     `packages/provegate/practices/shims/**`,
     `packages/provegate/test/content-prompts.test.ts`

4. **FR-4 — Phase 7 output/watch enforcement:** The runner checks that every exact
   output is in Durable Artifacts and the merge diff, every watched changed file has an
   input disposition, and `memory.verifyCommand` passes command safety and exits 0 after
   capture. Dry-run prints every check. Missing records/config/baselines fail closed.
   - **Targets:** `packages/provegate/src/core/run/chain.ts`,
     `packages/provegate/src/core/run/durable.ts`,
     `packages/provegate/src/core/memory/artifacts.ts`,
     `packages/provegate/test/chain.test.ts`

5. **FR-5 — Base-ref weakening proof:** Compare working declarations with the same PRD
   blob on the configured base ref. Append-only emergent output is allowed. Removal,
   type/path change, or replacement with `none` is weakening; an `eligible` PRD always
   refuses, while an `operator-gated` PRD requires both a changelog approval entry and
   owner acceptance. Missing/malformed/uncommitted baseline refuses.

   **Non-worktree flows have no baseline guarantee.** `gate open --worktree` already
   refuses while workflow artifacts are uncommitted on the base (`worktree.ts:425`), so
   the blob is guaranteed there; a plain `gate open` carries no such promise. When the
   PRD blob is absent from the base ref, the refusal names the cause and the remedy in one
   message — "PRD-NNN has no committed copy on `<base>`; commit the PRD to the base branch
   before closing, or reclaim with `--worktree`" — so the first non-worktree close fails
   with an instruction rather than an opaque baseline error. A fixture covers the
   non-worktree refusal text, not only the worktree happy path.
   - **Targets:** `packages/provegate/src/core/memory/artifacts.ts`,
     `packages/provegate/src/core/run/chain.ts`,
     `packages/provegate/test/chain.test.ts`

6. **FR-6 — Safe activation and executable gate wiring:** For a fresh
   `gate init --practices`, generate memory-enabled config and a manifest containing
   `phases.7` only; **the generated manifest must omit `phases.4` entirely** so default
   floor commands survive deep merge. Existing config/manifest/entrypoints remain
   byte-unchanged. This repo’s root manifest explicitly writes Phase 4 as
   `check-types`, `lint`, `build`, `test`, `verify:workflow`, `check-egress`, and Phase 7
   as `verify:brain`; `phases.4: []` is forbidden by a regression test. Root activation
   happens last.

   **Activation blast radius — removed, not computed.** Turning the contract on changes
   the lint every future PRD passes through. The obvious answer is to grandfather leases
   already in flight, but every boundary that could express it is unsound here: the lease
   records no base SHA to compare ancestry against, commit timestamps are mutable, and a
   merge commit cannot contain its own SHA, so it cannot name itself as the activation
   point. Rather than build machinery for a case that need not exist, **activation
   refuses while any foreign lease is active**: `gate land` for this PRD reads
   `_state/locks` and stops when another lease is present, so there is no in-flight PRD
   to grandfather and no boundary to compute. The owner clears or waits out the other
   lease — leases carry a TTL, so the wait is bounded.

   The check runs **inside the workspace mutex** (`run/mutex.ts`, the same critical
   section that guards lease claims), so a lease cannot appear between the check and the
   merge. Without that, the barrier is a read that is stale by the time it matters.

   The guarantee is scoped honestly: this is a `gate land` precondition, **not a
   git-level invariant**. A direct `git merge` bypasses it, as it bypasses every gate in
   this system — the pre-commit hook exempts merges. And the residual does **not**
   self-correct: control artifacts are revalidated only on a new claim (`open.ts`), so a
   worktree that keeps running `gate run` and `gate land` never re-checks them. Closing
   that is PRD-022's scope, not this PRD's — `_prds/wip/prd-022-control-artifact-revalidation.md`,
   drafted with the primitive, both call sites, and its own drift fixtures. What this PRD owns is the barrier and an
   accurate statement of its limit — no convergence is claimed, and no exemption state is
   recorded, so the worst case is one bypassed activation, not a lasting exemption.

   The mutex fails closed on a stale marker by design, which means a crashed holder can
   block activation until an owner clears it manually. That is the correct trade for a
   lock, and it is recorded as an operator handoff item rather than engineered around.

   **Both root files are worktree control artifacts.** `gate open --worktree` snapshots
   `workflow.config.json` and `gates.manifest.json` by content hash and compares them
   against the base, so creating them refuses every lease whose snapshot predates them
   until it merges or rebases. This PRD owns that **introduction** transition and proves
   both sides in a fixture: a worktree leased before the files exist is refused on reuse,
   and succeeds after merging the base. PRD-021 later adds one key to
   `workflow.config.json` and proves only the edit case. There is **one** lock check and
   it is the land-time barrier above, executed inside the mutex — no separate Phase 4
   preflight. A preflight reading would be stale by merge time and would only create a
   second, weaker answer to the same question.
   - **Targets:** `packages/provegate/src/core/run/init.ts`,
     `packages/provegate/test/init.test.ts`,
     `packages/provegate/test/practices-pack.test.ts`,
     `packages/provegate/test/open.test.ts` (the introduction-transition fixture:
     refused on reuse before the base merge, accepted after),
     `packages/provegate/src/core/run/merge.ts` (`gate land` reads `_state/locks` and
     refuses activation while a foreign lease is active — it reads no locks today),
     `packages/provegate/test/merge.test.ts`,
     `workflow.config.json` (new), `gates.manifest.json` (new),
     `packages/provegate/test/manifest.test.ts`

7. **FR-7 — Dogfood and method documentation:** Apply the contract to root agent
   entrypoints/protocol, document the method and manifest safety rule, add the accepted
   architecture ADR, and prove root/practices/package parity. No doctor/find/stats CLI
   ships here.
   - **Targets:** `AGENT_BOOTSTRAP.md`, `CLAUDE.md`, `.cursor/rules/brain.mdc`,
     `_brain/PROTOCOL.md`, `_brain/INDEX.md`,
     `_brain/adr/ADR-0001-closed-loop-agent-memory.md` (new),
     `packages/provegate/practices/**`,
     `packages/provegate/README.md`,
     `apps/docs/content/docs/method.mdx`,
     `scripts/verify/pack-drift-ledger.json`,
     `packages/provegate/test/practices-pack.test.ts`

---

## 5. Non-Goals (Out of Scope)

- Record/frontmatter substrate implementation (PRD-017 dependency).
- `gate doctor --memory`, `gate memory find`, CLI adapters, or adoption reference
  (PRD-019).
- `gate memory stats`, retro cadence enforcement, embeddings, vector search, telemetry,
  accounts, network state, or causal “bugs prevented” claims.
- Automatic edits to existing adopter config, manifests, entrypoints, package scripts,
  or CI.
- Historical PRD rewrites or weakening human-only push/acceptance.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** an ADR output and a `none` output in one PRD, **When** readiness runs,
  **Then** it fails the mutually-exclusive grammar.
- **Given** a watch glob matching `path.ts::Symbol`, **When** the record is omitted,
  **Then** readiness names the record and normalized path.
- **Given** a baseline ADR output, **When** it is removed without owner acceptance,
  **Then** Phase 7 refuses before merge.
- **Given** a fresh practices manifest, **When** it loads, **Then** `phases.4` is absent
  in source and resolved floor gates remain the configured four commands.
- **Given** this repo’s root manifest, **When** it loads, **Then** resolved Phase 4 is
  exactly the four floor commands followed by `verify:workflow` and built-site
  `check-egress`; Phase 7 runs `verify:brain`.
- **Given** memory disabled, **When** legacy checks run, **Then** behavior is unchanged.
- **Given** a foreign active lease in `_state/locks`, **When** activation tries to land
  through `gate land`, **Then** it refuses under the workspace mutex — so no in-flight
  PRD ever needs grandfathering.
- **Given** activation landed by a direct `git merge` while a foreign lease was active,
  **When** that lease continues with `gate run`, **Then** nothing re-checks the control
  artifacts — this residual is stated, not claimed away, and PRD-022 closes it.
- **Given** a worktree leased before the root control files exist, **When** it is reused
  after they land, **Then** it is refused until the base is merged, and succeeds after.
- **Given** a PRD with no committed copy on the base ref, **When** a non-worktree close
  runs, **Then** the refusal names both the cause and the remedy.

---

## 7. Technical Considerations

### Architecture

- Closed loop:
  `INDEX → PRD Inputs → readiness → tasks → implementation → independent review →
  Outputs/Durable Artifacts → Phase 7 validator → INDEX`.
- Watch overlap triggers review; it is not proof a record is stale.
- Weakening compares immutable base-ref bytes, not mutable working state.
- Root manifest intentionally repeats the Phase 4 floor to append two root-specific
  gates. Shipped practices manifests omit Phase 4 because adopter commands are config.
- `check-egress` scans built `apps/web/.next` and `apps/docs/.next`; it is not a CLI
  network checker and runs only after build.

### Dependencies

- PRD-017 Ship Verified; no new runtime dependencies.
- PRD-022 (control-artifact revalidation in `gate run`/`gate land`) is a **follow-on, not
  a blocker**: it closes the residual FR-6 states rather than anything FR-6 needs.

### Rollback

- Set `memory.enabled: false` and remove root Phase 7 wiring; legacy behavior returns
  without deleting Markdown. No remote or data migration exists.

---

## 8. Implementation Scope

### In Scope

- [ ] PRD/readiness/tasks memory artifact contract
- [ ] Phase 1–7 prompt flow
- [ ] Watch and durable-output enforcement
- [ ] Base-ref weakening and owner acceptance
- [ ] Safe fresh-practices and explicit root manifest wiring
- [ ] Root dogfood, ADR, tests, and method docs

---

## 9. Open Questions

(none) — owner approved the split and independent review remediation on 2026-07-25.

---

## 10. References

- PRD-017 agent memory substrate (blocking dependency)
- PRD-017 owner-approved source addendum
- `_brain/learnings/verify-check-phase-placement.md`
- `_brain/learnings/durable-artifact-must-commit.md`
- Independent owner-provided review, 2026-07-25

---

## Memory Inputs

- applied: `verify-check-phase-placement` — brain validation runs after capture.
- applied: `durable-artifact-must-commit` — exact output evidence lands in the merge.
- applied: `gate-wire-or-delete` — root/practices gates must reach executing surfaces.
- applied: `push-is-human-by-omission` — activation adds no push path.
- applied: `adr-section-blank-line-reads-empty` — written during Phase 4 and immediately
  binding on it: ADR-0001 is formatted with each section's first line directly under its
  heading, because a blank line there reads as an empty section.
- applied: `narrow-the-grammar-not-the-parser` — written at this PRD's own Phase 7 close
  and binding on the code it describes: the contract sections declare their shape and
  refuse the rest, rather than the reader modelling more Markdown each round.

---

## Memory Outputs

- adr: `_brain/adr/ADR-0001-closed-loop-agent-memory.md` — explicit PRD memory inputs,
  watched review triggers, base-ref weakening proof, and Phase 7 capture are the
  canonical closed-loop architecture.
- learning: `_brain/learnings/adr-section-blank-line-reads-empty.md` — the ADR section
  check anchors on `$` under `/m`, so a blank line after the heading reads as an empty
  section; appended during Phase 4, when writing this PRD's own ADR hit it.
- learning: `_brain/learnings/narrow-the-grammar-not-the-parser.md` — sixteen review
  rounds found ~5 renderer disagreements each in a hand-rolled Markdown reader and never
  converged; narrowing what a contract section may contain retired the class. Appended at
  the Phase 7 capture, which is where the lesson finished forming.

---

## Conflict Surface

- `packages/provegate/templates/**`
- `packages/provegate/prompts/**`
- `packages/provegate/src/core/memory/artifacts.ts`
- `packages/provegate/src/core/gates/prd-ready.ts`
- `packages/provegate/src/core/run/chain.ts`
- `packages/provegate/src/core/run/durable.ts`
- `packages/provegate/src/core/run/init.ts`
- `packages/provegate/src/core/run/merge.ts`
- `packages/provegate/test/merge.test.ts`
- `packages/provegate/test/open.test.ts`
- `packages/provegate/test/prd-ready.test.ts`
- `packages/provegate/test/chain.test.ts`
- `packages/provegate/test/init.test.ts`
- `packages/provegate/test/manifest.test.ts`
- `packages/provegate/test/content-prompts.test.ts`
- `packages/provegate/test/content-templates.test.ts`
- `packages/provegate/test/practices-pack.test.ts`
- `packages/provegate/practices/**`
- `_brain/**`
- `scripts/verify/pack-drift-ledger.json`
- `workflow.config.json`
- `gates.manifest.json`
- `packages/provegate/README.md`
- `apps/docs/content/docs/method.mdx`

Shared agent entrypoints are implementation scope but omitted from exclusive ownership
per the configured shared-file rule.

---

## Durable Artifacts

- Decision: `_brain/adr/ADR-0001-closed-loop-agent-memory.md`
- Learning: `_brain/learnings/adr-section-blank-line-reads-empty.md`
- Learning: `_brain/learnings/narrow-the-grammar-not-the-parser.md`
- Method docs: `apps/docs/content/docs/method.mdx`
- Review: `_docs/reviews/review-018-memory-contract-enforcement.md`

---

## 11. Verification Commands

| FR   | Command / Check                                                   | Scope | Notes |
| ---- | ----------------------------------------------------------------- | ----- | ----- |
| FR-1 | `pnpm --filter provegate test test/content-templates.test.ts`     | pkg   | mutually-exclusive grammar |
| FR-2 | `pnpm --filter provegate test test/prd-ready.test.ts`             | pkg   | watched target and disabled behavior |
| FR-3 | `pnpm --filter provegate test test/content-prompts.test.ts`       | pkg   | Phase 1–7 traceability |
| FR-4 | `pnpm --filter provegate test test/chain.test.ts`                 | pkg   | Phase 7 order and output/watch checks |
| FR-5 | `pnpm --filter provegate test test/chain.test.ts`                 | pkg   | base-ref weakening matrix |
| FR-6 | `pnpm --filter provegate test test/manifest.test.ts`              | pkg   | exact root/practices Phase 4 semantics |
| FR-6 | `pnpm --filter provegate test test/practices-pack.test.ts`        | pkg   | additive practices activation |
| FR-6 | `pnpm --filter provegate test test/open.test.ts`                  | pkg   | control-artifact introduction: refused before base merge, accepted after |
| FR-6 | `pnpm --filter provegate test test/merge.test.ts`                 | pkg   | activation refuses while a foreign lease is active |
| FR-7 | `node scripts/verify/verify-pack-drift.mjs`                       | repo  | live/package parity |

Cross-cutting floor:

- `pnpm check-types`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm verify:workflow`
- `pnpm check-egress`

Before Phase 2 PASS, run: `gate check PRD-018`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT allow output entries and `none` in the same section.
- DO NOT generate `phases.4: []`; shipped practices omit the key, root repeats the
  exact floor before additions.
- DO NOT enable root/practices memory before PRD-017 and all PRD-018 gates exist.
- DO NOT compare weakening against working-state declarations.
- DO NOT let a non-worktree close fail with a bare baseline error; name the remedy.
- DO NOT build a grandfathering boundary: the lease records no base SHA, timestamps are
  mutable, and a merge commit cannot name its own SHA. Refuse activation while another
  lease is active instead.
- DO NOT read the lock table outside the workspace mutex and call it a barrier; a
  check-then-merge race is not a barrier.
- DO NOT claim the lease check makes activation impossible to bypass, and DO NOT claim a
  surviving lease converges on the contract: only a new claim revalidates control
  artifacts, so `gate run` and `gate land` in an existing worktree do not.
- DO NOT prove FR-3 by asserting the prompts directory changed; assert the per-file
  obligation table.
- DO NOT treat watch overlap as proof of staleness.
- DO NOT add doctor/find/stats, runtime dependencies, telemetry, network, or push.
- DO NOT auto-edit existing adopter files or historical PRDs.
- DO NOT fabricate method content outside the PRD-017 addendum.

---

## Changelog

| Date       | Author           | Changes |
| ---------- | ---------------- | ------- |
| 2026-07-25 | Cursor | Readiness iteration 5 (ITERATE 7.65): the convergence argument was false — control artifacts are revalidated only in `open.ts`, so a worktree that keeps running `gate run`/`gate land` never re-checks them. Rather than patch FR-6 a fourth time, the owner scoped the revalidation gap out to PRD-022; FR-6 now keeps the mutex-guarded land barrier, states its limit exactly, claims no convergence, and records the stale-mutex recovery as operator handoff |
| 2026-07-25 | Cursor | Readiness iteration 4 (ITERATE 7.93): the removal was right but its claim was too strong. The lock-table read now runs inside the workspace mutex so a lease cannot appear between check and merge (W9), and "nothing can fail open" is replaced by a scoped guarantee plus a convergence argument — a direct `git merge` does bypass `gate land`, and what saves it is that the surviving lease must merge the control artifacts before its next claim (W10) |
| 2026-07-25 | Cursor | Readiness iteration 3 (PASS 8.05): W6–W8 killed the grandfathering mechanism rather than repairing it. The lease persists no base SHA (W7) and a merge commit cannot write its own SHA into its own changelog row (W8) — the scheme was impossible, not merely imprecise. Activation now simply refuses while any foreign lease is active, so there is no in-flight PRD to grandfather and no boundary to compute |
| 2026-07-25 | Cursor | Readiness iteration 2 (PASS 8.43): W5 gives FR-6 a named introduction-transition fixture (`test/open.test.ts`) and a runnable row; W6 replaces the timestamp boundary with git ancestry against an activation SHA recorded at merge time, with malformed leases failing closed. Corrects an iteration-2 finding: the merge commit is not "already recorded" — it cannot exist until this PRD lands |
| 2026-07-25 | Cursor | Next-wave prep: readiness W2/W3/W4 resolved in the PRD. FR-3 gains a per-file prompt obligation table (ten files were behind one verification row), FR-5 states the non-worktree baseline refusal and its remedy, and FR-6 fixes the activation boundary at lease `startedAt` versus the merge commit. FR-6 also takes ownership of the root control-artifact **introduction** transition, per the owner's decision that this PRD creates `workflow.config.json` and PRD-021 only adds a key |
| 2026-07-25 | claude-code | Phase 4: appended a second Memory Output. Writing ADR-0001 — this PRD's declared output, and the repository's first ADR — failed `verify:brain` with all four sections reported empty while full. The section regex ends its lazy capture at `(?=^## \|$)` under `/m`, where `$` is an end-of-LINE anchor, so a blank line after the heading captures nothing. `_brain/_templates/adr.md` puts content directly under each heading, which is why the shape was never exercised, and `prettier` writes the blank line, so `pnpm format` would break every ADR. Appending is what FR-5 permits without acceptance; the parser fix spans PRD-017's two validator copies and their shared corpus, all outside this PRD's Conflict Surface, so it is a deferral rather than a scope grab |
| 2026-07-25 | Codex, for owner | Initial draft from owner-approved PRD-017 split |
| 2026-07-25 | owner            | Approved PRD-018 Phase 1 scope; waits for PRD-017 dependency |
| 2026-07-25 | independent agent via owner | Readiness iteration 1: PASS 8.15 (infra weights), tiers high/high. Verified the deep-merge floor rule and the egress scanner's fail-closed behavior; found the egress gate can scan cache-stale build output. Watch items W1–W4 |
