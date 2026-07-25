# PRD-017: Agent Memory Substrate

> **Status**: Approved
>
> **Created**: 2026-07-25
> **Updated**: 2026-07-25
> **Author**: Codex, for owner review
> **Audience**: Implementing Agent
> **Slug**: `agent-memory-substrate`
> **Cycle Phase**: 3 (Task Generation)
> **PRD Class**: infra
> **Class Rationale**: This hardens the local workflow substrate and method source;
> all behavior remains default-off.
> **Autonomous Close**: operator-gated
> **Value**: 4.05 (MF/UI/TL/AR/RM: 5/3/5/3/4)

<!-- 0.25*5 + 0.25*3 + 0.20*5 + 0.15*3 + 0.15*4 = 4.05. -->

---

## 1. Introduction / Overview

ProveGate’s committed `_brain` store has a sound recall/capture protocol, but its
validator does not parse folded descriptions correctly, record quality is only partly
checked, and the TypeScript CLI has no reusable typed memory parser. Before PRD memory
contracts or CLI recall can safely ship, the method needs an owner-approved source
addendum, a default-off configuration surface, and one conformance-tested record model
shared semantically by the TypeScript core and standalone zero-dependency verifier.

This PRD delivers that substrate only. It does not change PRD readiness, Phase 1–7
behavior, runner gates, root dogfood activation, or user-facing memory commands.
PRD-018 will build the closed-loop contract on this substrate; PRD-019 will add
adoption CLI. Effectiveness statistics remain deferred until five contract-bearing PRDs
exist.

---

## 2. Goals

### Primary Goals

- [ ] Record the owner-approved closed-loop method extension as a traceable source
      addendum without modifying the frozen source snapshot.
- [ ] Add a typed, default-off memory configuration and a supported zero-dependency
      record/frontmatter model.
- [ ] Make `verify:brain` reject malformed or ceremonial records and keep root/package
      practices copies synchronized.
- [ ] Prove the TypeScript parser and standalone verifier agree through one mutation
      corpus.

### Success Metrics

| Metric                                              | Current | Target | Measurement                      |
| --------------------------------------------------- | ------- | ------ | -------------------------------- |
| Empty folded descriptions accepted                  | yes     | no     | mutation fixture                 |
| Parser implementations sharing a conformance corpus | 0       | 2      | core + standalone fixture        |
| Existing valid brain records accepted               | 23      | all    | `pnpm verify:brain`              |
| Runtime dependencies / network / push paths added   | 0       | 0      | manifest and egress/static tests |
| Memory behavior enabled by this PRD                 | n/a     | none   | compatibility fixtures           |

---

## 3. User Stories

#### User Story 1

```
As a maintainer,
I want memory records validated against one explicit schema,
so that a green validator means the index and record content are usable.
```

**Acceptance Criteria:**

- [ ] Empty folded descriptions, placeholders, missing rationale sections, invalid ADR
      types/statuses, unsafe watches, duplicate pointers, and broken supersession fail.
- [ ] Current valid records and templates pass after intentional hook/schema migration.

#### User Story 2

```
As a downstream feature author,
I want a typed memory parser and default-off config,
so that PRD contracts and local recall can reuse one stable substrate.
```

**Acceptance Criteria:**

- [ ] Memory-disabled repositories retain current status/check/run behavior.
- [ ] Core and standalone validation agree on every shared fixture case.

---

## 4. Functional Requirements

1. **FR-1 — Canonical method provenance:** Add the owner-approved English addendum
   `source-snapshot/addenda/agent-memory-closed-loop-2026-07-25.md`. It specifies the
   full three-PRD closed-loop program, exact Memory Inputs/Outputs grammar, `_brain`
   versus product-doc boundary, watch/weakening semantics, deterministic local CLI
   constraints, and offline/zero-dependency/no-push invariants. Add it to `MANIFEST.md`
   and record the extension rule in `DECISIONS.md`; all pre-existing frozen snapshot
   bytes remain unchanged.
   - **Targets:**
     `docs/research/provegate-bootstrap/source-snapshot/addenda/agent-memory-closed-loop-2026-07-25.md`
     (new), `docs/research/provegate-bootstrap/source-snapshot/MANIFEST.md`,
     `docs/research/provegate-bootstrap/DECISIONS.md`,
     `packages/provegate/test/content-prompts.test.ts`

2. **FR-2 — Default-off memory configuration:** Add optional `memory` configuration
   fields `enabled`, `root`, `index`, `entrypoints`, `verifyCommand`, and
   `retroAfterCompleted`. Defaults are disabled; all paths are repo-relative and
   contained; cadence is a non-negative integer; the verify command passes the existing
   command-safety validator. This PRD does not create root `workflow.config.json`, does
   not enable practices installs, and does not alter runtime gates.
   - **Targets:** `packages/provegate/src/core/config/types.ts`,
     `packages/provegate/src/core/config/defaults.ts`,
     `packages/provegate/src/core/config/validate.ts`,
     `packages/provegate/test/memory.test.ts` (new)

3. **FR-3 — Typed record parser and schema:** Implement the documented scalar,
   folded-scalar, and inline-list frontmatter subset; unsupported YAML fails loud.
   Learning records require meaningful description/provenance, valid
   type/scope/status/supersession, and `Why`/`How to apply` for
   gotcha/convention/decision. ADRs require `type: decision` and Context/Decision/
   Consequences/Alternatives sections. Optional `tags` and `watch` arrays are validated;
   watch paths cannot escape the repository.
   - **Targets:** `packages/provegate/src/core/memory/parse.ts` (new),
     `packages/provegate/src/core/memory/index.ts` (new),
     `packages/provegate/src/index.ts`,
     `packages/provegate/test/memory.test.ts`

4. **FR-4 — Strong standalone brain verification:** Upgrade the live and shipped
   stdlib-only verifier to use the same supported schema, exactly-one INDEX pointer,
   valid links, unique names, public/private separation, and a 120-character maximum
   for human hook text after the Markdown link. Existing overlong hooks are shortened
   without changing record meaning. One checked-in corpus runs against both parser
   implementations and includes every positive/mutation case.
   - **Targets:** `scripts/verify/lib.mjs`, `scripts/verify/verify-brain.mjs`,
     `packages/provegate/practices/verify/lib.mjs`,
     `packages/provegate/practices/verify/verify-brain.mjs`,
     `packages/provegate/test/fixtures/memory-record-cases.json` (new),
     `packages/provegate/test/practices-pack.test.ts`,
     `scripts/verify/pack-drift-ledger.json`

5. **FR-5 — Protocol/template migration and parity:** Update the live and genericized
   protocol, learning/ADR templates, INDEX hooks, and records to the validated schema.
   `verify:pack-drift` must cover every root/package pair. No agent entrypoint, phase
   prompt, PRD template, gate manifest, or workflow behavior changes in this PRD.
   - **Targets:** `_brain/PROTOCOL.md`, `_brain/INDEX.md`,
     `_brain/_templates/learning.md`, `_brain/_templates/adr.md`,
     `_brain/learnings/**`, `packages/provegate/practices/brain/**`,
     `packages/provegate/test/practices-pack.test.ts`,
     `scripts/verify/pack-drift-ledger.json`

---

## 5. Non-Goals (Out of Scope)

- Memory Inputs/Outputs readiness lint, watched-target enforcement, Phase 1–7 prompt
  changes, weakening detection, Phase 7 runner wiring, or dogfood activation
  (PRD-018).
- `gate doctor --memory`, `gate memory find`, adoption docs, or adapter UX (PRD-019).
- `gate memory stats`, retro cadence enforcement, or historical effectiveness metrics
  (deferred until five contract-bearing PRDs exist).
- Embeddings, vector databases, network calls, accounts, telemetry, caches, runtime
  dependencies, or push code.
- Rewriting historical PRD artifacts or enabling memory by detecting `_brain` presence.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** `description: >-` with no folded body, **When** either validator runs,
  **Then** both reject it with the same fixture outcome.
- **Given** an absolute, `..`, cross-root, or symlink-escaping memory path, **When**
  config/record validation runs, **Then** it fails with a path-tagged error.
- **Given** every current valid record, **When** `pnpm verify:brain` runs, **Then** it
  passes with exactly one INDEX pointer per public record.
- **Given** memory is absent or disabled, **When** existing check/run/status tests run,
  **Then** their output and behavior remain unchanged.
- **Given** a one-sided live/practices edit, **When** pack-drift runs, **Then** it fails.

---

## 7. Technical Considerations

### Architecture

- The addendum is the source for all three PRDs; the original snapshot remains frozen.
- The TypeScript parser is reusable core; the standalone verifier remains stdlib-only.
  A shared corpus, not runtime imports, prevents semantic drift.
- Configuration is explicit and default-off. Presence detection may be used only by
  PRD-019 doctor diagnostics, never to enable behavior.
- This PRD strengthens record validation but creates no workflow gate or user command.

### Dependencies

- none; `packages/provegate` retains zero runtime dependencies.

### Rollback

- Revert parser/config/verifier changes. Markdown remains readable and no state
  migration or remote cleanup exists.

---

## 8. Implementation Scope

### In Scope

- [ ] Source addendum and locked provenance decision
- [ ] Default-off memory config
- [ ] Typed core parser and public types
- [ ] Standalone validator hardening
- [ ] Shared mutation/conformance corpus
- [ ] Live/practices protocol, template, hook, and record parity

---

## 9. Open Questions

(none) — the owner approved the three-PRD split and FR-9 deferral on 2026-07-25.

---

## 10. References

- `_brain/PROTOCOL.md` §§4–9
- `_brain/learnings/memory-index-vs-detail.md`
- `_brain/learnings/gate-wire-or-delete.md`
- `_brain/learnings/verify-check-phase-placement.md`
- Independent owner-provided review of the original PRD-017, 2026-07-25
- Follow-ups: PRD-018 memory contract enforcement; PRD-019 memory adoption CLI

---

## Memory Inputs

- applied: `memory-index-vs-detail` — preserve small INDEX and on-demand detail.
- applied: `gate-wire-or-delete` — both parser surfaces need executable checks.
- applied: `turbo-cache-masks-out-of-input-reads` — fixtures declare isolated roots and
  the shared corpus as explicit inputs.

---

## Memory Outputs

- none — this substrate formalizes already-approved method and parser behavior; any
  non-derivable implementation trap discovered later must be appended as an exact
  learning path before close.

---

## Conflict Surface

- `docs/research/provegate-bootstrap/source-snapshot/addenda/**`
- `docs/research/provegate-bootstrap/source-snapshot/MANIFEST.md`
- `docs/research/provegate-bootstrap/DECISIONS.md`
- `packages/provegate/src/core/config/**`
- `packages/provegate/src/core/memory/**`
- `packages/provegate/src/index.ts`
- `packages/provegate/test/memory.test.ts`
- `packages/provegate/test/content-prompts.test.ts`
- `packages/provegate/test/fixtures/memory-record-cases.json`
- `scripts/verify/lib.mjs`
- `scripts/verify/verify-brain.mjs`
- `scripts/verify/pack-drift-ledger.json`
- `packages/provegate/practices/brain/**`
- `packages/provegate/practices/verify/lib.mjs`
- `packages/provegate/practices/verify/verify-brain.mjs`
- `packages/provegate/test/practices-pack.test.ts`
- `_brain/**`

---

## Durable Artifacts

- Source: `docs/research/provegate-bootstrap/source-snapshot/addenda/agent-memory-closed-loop-2026-07-25.md`
- Protocol: `_brain/PROTOCOL.md`
- Learning: `_brain/learnings/two-parsers-wrong-together.md`
- Review: `_docs/reviews/review-017-agent-memory-substrate.md`

---

## 11. Verification Commands

| FR   | Command / Check                                             | Scope | Notes                                             |
| ---- | ----------------------------------------------------------- | ----- | ------------------------------------------------- |
| FR-1 | `pnpm --filter provegate test test/content-prompts.test.ts` | pkg   | addendum trace and frozen bytes                   |
| FR-2 | `pnpm --filter provegate test test/memory.test.ts`          | pkg   | config validation and default-off compatibility   |
| FR-3 | `pnpm --filter provegate test test/memory.test.ts`          | pkg   | typed parser/schema corpus                        |
| FR-4 | `pnpm --filter provegate test test/practices-pack.test.ts`  | pkg   | standalone mutations and cross-parser conformance |
| FR-4 | `node scripts/verify/verify-brain.mjs`                      | repo  | live records pass                                 |
| FR-5 | `node scripts/verify/verify-pack-drift.mjs`                 | repo  | live/package parity                               |

Cross-cutting floor:

- `pnpm check-types`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm verify:workflow`

Before Phase 2 PASS, run: `gate check PRD-017`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT enable memory, add a Phase 7 command, or change Phase 1–7/PRD templates.
- DO NOT modify any pre-existing frozen source-snapshot file.
- DO NOT add a runtime dependency, network call, telemetry, cache, or push path.
- DO NOT infer enablement from `_brain` presence.
- DO NOT maintain separate fixture semantics for core and standalone parsers.
- DO NOT accept unsupported YAML by guessing.
- DO NOT use `any`, bypass lint/hooks, weaken containment, or hide a failure.

---

## Changelog

| Date       | Author                      | Changes                                                                                                                                                                                                                      |
| ---------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-25 | Codex, for owner            | Original closed-loop draft                                                                                                                                                                                                   |
| 2026-07-25 | owner                       | Approved canonical extension, Phase 1, readiness, and Phase 3 parent plan                                                                                                                                                    |
| 2026-07-25 | independent agent via owner | Found output-grammar conflict, manifest ambiguity, readiness/scope risks                                                                                                                                                     |
| 2026-07-25 | owner                       | Approved split into PRD-017/018/019 and FR-9 deferral                                                                                                                                                                        |
| 2026-07-25 | Codex, for owner            | Rescoped to default-off memory substrate; returned to Phase 1                                                                                                                                                                |
| 2026-07-25 | owner                       | Approved revised PRD-017 Phase 1 scope                                                                                                                                                                                       |
| 2026-07-25 | independent agent via owner | Readiness iteration 3: PASS 8.425 (infra weights), tiers high/high. Measured the PRD's own claims: the folded-description hole is real, the hook/record/ADR migrations are not. Watch items W10–W13. Phase 3 awaits owner Go |
| 2026-07-25 | owner                       | Go for Phase 3                                                                                                                                                                                                               |
| 2026-07-25 | independent agent via owner | Phase 3 plan generated: 48 sub-tasks under the `infra` skeleton with Migration & Rollback as its own parent; W10–W13 each bound to explicit tasks                                                                            |
