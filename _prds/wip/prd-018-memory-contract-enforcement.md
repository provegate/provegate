# PRD-018: Closed-Loop Memory Contract and Enforcement

> **Status**: Approved
>
> **Created**: 2026-07-25
> **Updated**: 2026-07-25
> **Author**: Codex, for owner review
> **Audience**: Implementing Agent
> **Slug**: `memory-contract-enforcement`
> **Cycle Phase**: 2 (Readiness)
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
   bootstrap, and thin agent shims. Phase 1 selects inputs; Phase 2 challenges relevance;
   Phase 3 carries slugs; Phase 4 opens/revalidates details; Phase 6 independently audits
   application and `none`; Phase 7 captures exact outputs. Product/architecture docs
   maintain current explanations while `_brain` owns non-derivable traps/rationale.
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
   - **Targets:** `packages/provegate/src/core/run/init.ts`,
     `packages/provegate/test/init.test.ts`,
     `packages/provegate/test/practices-pack.test.ts`,
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

---

## Memory Outputs

- adr: `_brain/adr/ADR-0001-closed-loop-agent-memory.md` — explicit PRD memory inputs,
  watched review triggers, base-ref weakening proof, and Phase 7 capture are the
  canonical closed-loop architecture.

---

## Conflict Surface

- `packages/provegate/templates/**`
- `packages/provegate/prompts/**`
- `packages/provegate/src/core/memory/artifacts.ts`
- `packages/provegate/src/core/gates/prd-ready.ts`
- `packages/provegate/src/core/run/chain.ts`
- `packages/provegate/src/core/run/durable.ts`
- `packages/provegate/src/core/run/init.ts`
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
- DO NOT treat watch overlap as proof of staleness.
- DO NOT add doctor/find/stats, runtime dependencies, telemetry, network, or push.
- DO NOT auto-edit existing adopter files or historical PRDs.
- DO NOT fabricate method content outside the PRD-017 addendum.

---

## Changelog

| Date       | Author           | Changes |
| ---------- | ---------------- | ------- |
| 2026-07-25 | Codex, for owner | Initial draft from owner-approved PRD-017 split |
| 2026-07-25 | owner            | Approved PRD-018 Phase 1 scope; waits for PRD-017 dependency |
| 2026-07-25 | independent agent via owner | Readiness iteration 1: PASS 8.15 (infra weights), tiers high/high. Verified the deep-merge floor rule and the egress scanner's fail-closed behavior; found the egress gate can scan cache-stale build output. Watch items W1–W4 |
