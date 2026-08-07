# PRD-042: The Adopter's First Hour

> **Status**: Draft
>
> **Created**: 2026-08-07
> **Updated**: 2026-08-07
> **Author**: owner
> **Audience**: Implementing Agent
> **Slug**: `adopter-first-hour`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Class Rationale**: n/a — feature class.
> **Autonomous Close**: eligible
> **Value**: 3.75 (MF/UI/TL/AR/RM: 3/5/2/5/4)

<!-- 0.25*3 + 0.25*5 + 0.20*2 + 0.15*5 + 0.15*4
     = 0.75 + 1.25 + 0.40 + 0.75 + 0.60 = 3.75 -->

---

## 1. Introduction / Overview

The first external adopter run (`pnpm smoke:adopter`, 2026-08-07) reached a merged close, and
everything that cost time between `npm install` and that close was hand-work the tool could
have done:

- `gate new` writes the PRD and nothing else. Phase 6 then stops with
  `no tasks file — independent-review ledger missing`, naming neither the path the runner
  expects nor the row it will read. The adopter has to find
  `node_modules/provegate/templates/tasks-template.md`, copy it, and guess the file name.
- The instantiated PRD ships `{{CMD_TEST_SCOPED}}`, `{{CMD_CHECK_TYPES}}`, `{{CMD_LINT}}`,
  `{{CMD_TEST}}`, `{{CMD_BUILD}}`, `{{MEMORY_ROOT}}` and `{{DOCS_ROOT}}` unsubstituted. The
  readiness lint refuses only the §11 ones — as an unsafe command, not as an unfilled token —
  and the others survive into the closed artifact.
- The PRD carries the full Memory Inputs and Memory Outputs contract prose into a repository
  where `memory.enabled` is false, with no signal that the sections are inert.
- QUICKSTART puts the manifest recipe under "Single-package repos", *after* the close section,
  while `gate init` deliberately writes an empty manifest. A linear reader reaches `gate run`
  with zero gates wired.

One more, from this repository rather than the fixture: `gate new` cannot instantiate a
RENDERED template. Its anchor is `/^# \{\{ID_PREFIX\}\}-XXX: /m`, and `gate init --prompts`
substitutes that token away, so in any repository that dogfoods its own prompt store — this one
— `gate new` exits 1 and every PRD is created by hand. The defect was recorded during PRD-034
and parked because the deferral board was at its cap.

None of this is a gate failure. It is the difference between a tool that works and a tool
someone else can pick up.

---

## 2. Goals

### Primary Goals

- [ ] Every artifact the gate chain reads can be created by the CLI that reads it.
- [ ] A token the configuration can resolve is never handed to the author to resolve.
- [ ] A stop names the path and the shape it wants.

### Success Metrics

| Metric                                     | Current | Target | Measurement                    |
| ------------------------------------------ | ------- | ------ | ------------------------------ |
| Artifacts the CLI can instantiate          | 1 of 3  | 3 of 3 | FR-1 tests                     |
| Unsubstituted tokens in a new PRD          | 7       | 0      | FR-2 test, adopter smoke fill  |
| Templates `gate new` can read              | plain   | both   | FR-5 test against the rendered store |

---

## 3. User Stories

#### User Story 1

```
As someone adopting the workflow on a Tuesday afternoon,
I want the CLI to hand me the artifacts its own gates demand,
so that my first close fails on my code and not on my paperwork.
```

**Acceptance Criteria:**

- [ ] `gate new --tasks PRD-001` writes the task file the phase-6 gate reads, named as the
      runner expects.
- [ ] A PRD created by `gate new` carries no token the configuration could have resolved.

---

## 4. Functional Requirements

1. **FR-1**: `gate new --tasks <ID>` and `gate new --review <ID>` instantiate the shipped tasks
   and review templates for an existing PRD, filling id, slug, dates and the cross-referenced
   paths, refusing when the PRD does not exist or the target file already does (additive-only,
   as `gate init` is).
   - **Targets:** `packages/provegate/src/core/run/new.ts`, `packages/provegate/src/cli.ts::runNew`
2. **FR-2**: `gate new` substitutes every template token the configuration can resolve —
   the four `commands` entries, the memory root, the docs root — and prints the tokens it could
   not resolve as a list the author must fill. An unresolvable token is reported, never left
   silent.
   - **Targets:** `packages/provegate/src/core/run/new.ts`
3. **FR-3**: When `memory.enabled` is false, `gate new` omits the Memory Inputs and Memory
   Outputs sections rather than shipping a contract that does not apply. A section that cannot
   be enforced is instruction the reader must ignore.
   - **Targets:** `packages/provegate/src/core/run/new.ts`
4. **FR-4**: The phase-6 stop names the artifact path it expected and the ledger row it reads,
   in the message itself — not in a document the reader has to find.
   - **Targets:** `packages/provegate/src/core/gates/review.ts`
5. **FR-5**: `gate new` instantiates a RENDERED template: the id anchor matches both the
   `{{ID_PREFIX}}` form and the substituted form, so a repository that installs its own prompt
   store can still create work items. Template drift stays an error; a rendered template is not
   drift.
   - **Targets:** `packages/provegate/src/core/run/new.ts::substituteAnchor`
6. **FR-6**: QUICKSTART introduces the manifest before the close that executes it, in both
   copies the parity check holds together, and the practices NEXT_STEPS heading numbering is
   corrected.
   - **Targets:** `packages/provegate/QUICKSTART.md`, `apps/docs/content/docs/quickstart.mdx`,
     `packages/provegate/practices/NEXT_STEPS.md`

---

## 5. Non-Goals (Out of Scope)

- `gate accept` — a writer for `_state/acceptances.json`. An agent may never originate an
  acceptance, so that command needs its own design.
- Generating PRD *content* (that is Phase 1's prompt, not the CLI).
- A `gate init --preset` that wires a language-specific floor: worth doing, needs its own item
  so the preset set can be argued on its own merits.
- The operator-count and terminal-status defects from the same run — PRD-040 and PRD-041.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** an existing PRD, **When** `gate new --tasks PRD-001` runs, **Then** the task file
  appears at the path the phase-6 gate reads, and re-running refuses instead of overwriting.
- **Given** a repository with `memory.enabled: false`, **When** `gate new` runs, **Then** the
  new PRD has no Memory Inputs or Memory Outputs section.
- **Given** a repository whose configured template is rendered, **When** `gate new` runs,
  **Then** the item is created.
- **Given** a close with no tasks file, **When** phase 6 stops, **Then** the message names the
  expected path and the required row.

---

## 7. Technical Considerations

### Architecture

`gate new` already owns anchored substitution (`substituteAnchor`) and refuses on drift. FR-1
and FR-2 extend that same mechanism to two more templates and to a token set drawn from config
— no template language, no second renderer. FR-5 widens one anchor's alternation, and the
drift error stays the failure mode for everything else.

FR-3 removes sections from a document the readiness lint then parses, so the lint's memory-
contract arm must agree that an absent section is legal when the contract is off — the two
already agree on this for hand-written PRDs; the test pins it.

The QUICKSTART edit moves prose between two copies that a parity check compares. Move both in
the same commit or the check fails, which is the point of it.

### Dependencies

- none

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/run/new.ts`
- [ ] `packages/provegate/src/cli.ts`
- [ ] `packages/provegate/src/core/gates/review.ts`
- [ ] `packages/provegate/QUICKSTART.md`, `apps/docs/content/docs/quickstart.mdx`
- [ ] `packages/provegate/practices/NEXT_STEPS.md`
- [ ] `packages/provegate/test/new.test.ts`

---

## 9. Open Questions

- (none)

---

## 10. References

- `scripts/adopter-smoke.sh` and `scripts/adopter-smoke-fill.mjs` — the substitutions in the
  fill script are the list FR-2 removes
- `_tasks/completed/tasks-034-prompt-store-reconciliation.md` — where the rendered-template
  defect was recorded

---

## Memory Inputs

- applied: `quickstart-is-a-fixture` — FR-6 moves prose in the document the parity check
  executes, so both copies move in one commit and the tagged region stays runnable.
- applied: `derive-the-requirement-from-the-consumer` — FR-2 takes its token set from what the
  consumer can answer (`config.commands`, the roots) rather than from the template's full
  catalogue; a token nothing can resolve is reported, not demanded.
- applied: `shipped-content-needs-a-delivery-gate` — the whole item exists because packaging
  proved nothing about delivery; the adopter smoke is the gate that measured it and FR-2's
  test asserts the delivered artifact, not the template source.
- applied: `metadata-declares-what-it-cannot-provide` — FR-3 is that rule for the memory
  sections: a contract shipped into a repository that cannot enforce it declares a capability
  with no asset.
- applied: `assert-absent-needs-an-independent-cause` — FR-3's test must prove the sections are
  absent because memory is off, not because the fixture template lacked them.
- reviewed: `evidence-pattern-satisfied-by-the-template` — `templates/**` watch; FR-1
  instantiates templates whose placeholder lines must not satisfy any gate's required-line
  check, so the instantiated fixtures are asserted against the gates, not against the template.
- reviewed: `docs-are-a-wiring-surface` — `practices/**` watch; FR-6 edits NEXT_STEPS
  numbering only and registers or deregisters nothing.
- reviewed: `fixture-must-reach-production-shape` — `cli.ts` watch; FR-1's tests drive the CLI
  entry point with the argument shapes a user types, not the helper beneath it.
- reviewed: `strictness-added-during-extraction-is-a-behavior-change` — `core/run/**` watch;
  FR-5 loosens an anchor rather than tightening one, and FR-1's refusals are new paths on a
  command that previously had no such argument.
- reviewed: `surface-set-without-its-predicate` — `core/gates/**` watch via `review.ts`; FR-4
  rewrites a stop message and touches neither the input set the gate reads nor its predicate.
- reviewed: `gate-run-resume-after-archive` — `core/run/**` watch via `new.ts`; this item
  instantiates artifacts before a run and changes nothing about resuming a stopped close.
- reviewed: `narrow-the-grammar-not-the-parser` — FR-3 removes whole sections by the same
  heading grammar the reader already uses; no new Markdown reading is introduced.
- reviewed: `a-rule-corrected-survives-where-it-is-restated` — `_prds/**` watch; the token list
  is restated in §1, §2 and §4, so a correction sweeps all three.

## Memory Outputs

- learning: `_brain/learnings/the-first-hour-is-a-surface.md` — the steps between install and
  first close are a product surface with no gate over it; self-hosting cannot see them because
  the maintainers performed each one so often they stopped noticing they were performing it.

---

## Conflict Surface

- `packages/provegate/src/core/run/new.ts`
- `packages/provegate/src/core/gates/review.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/QUICKSTART.md`
- `apps/docs/content/docs/quickstart.mdx`
- `packages/provegate/practices/NEXT_STEPS.md`
- `packages/provegate/test/new.test.ts`

---

## Durable Artifacts

- `_brain/learnings/the-first-hour-is-a-surface.md` — every Memory Output above repeats here;
  the two lists are one contract and Phase 7 refuses when they disagree
- ADR: `none`

---

## 11. Verification Commands

| FR   | Command / Check                | Scope                  | Notes                                     |
| ---- | ------------------------------ | ---------------------- | ----------------------------------------- |
| FR-1 | `pnpm test --filter provegate` | new.test.ts            | tasks + review instantiated, re-run refuses |
| FR-2 | `pnpm test --filter provegate` | new.test.ts            | no resolvable token survives, rest reported |
| FR-3 | `pnpm test --filter provegate` | new.test.ts            | memory sections absent when contract is off |
| FR-4 | `pnpm test --filter provegate` | chain.test.ts          | the stop names path and row                |
| FR-5 | `pnpm test --filter provegate` | new.test.ts            | rendered template instantiates             |
| FR-6 | `pnpm verify:quickstart-parity` | both quickstart copies | the tagged region still runs               |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm smoke:adopter` — the delivered CLI still closes a PRD end to end

Before Phase 2 PASS, run: `gate check PRD-042`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT overwrite an artifact that already exists; refuse, as `gate init` does.
- DO NOT invent a template language — anchored substitution and enumerated tokens only.
- DO NOT move QUICKSTART prose in one copy without the other.

---

## Changelog

| Date       | Author | Changes                                                      |
| ---------- | ------ | ------------------------------------------------------------ |
| 2026-08-07 | owner  | Initial draft — the hand-work measured in the first adopter run |
