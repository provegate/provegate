# PRD-019: Agent Memory Adoption CLI

> **Status**: Approved
>
> **Created**: 2026-07-25
> **Updated**: 2026-07-25
> **Author**: Codex, for owner review
> **Audience**: Implementing Agent
> **Slug**: `memory-adoption-cli`
> **Cycle Phase**: 2 (Readiness)
> **PRD Class**: infra
> **Class Rationale**: This adds local workflow diagnostics and recall CLI over the
> memory substrate; it does not change application runtime behavior.
> **Autonomous Close**: operator-gated
> **Value**: 4.40 (MF/UI/TL/AR/RM: 4/5/4/5/4)

<!-- 0.25*4 + 0.25*5 + 0.20*4 + 0.15*5 + 0.15*4 = 4.40. -->

---

## 1. Introduction / Overview

After PRD-017 supplies strong record parsing and PRD-018 closes and activates the
memory loop, adopters still need two practical capabilities: prove that their
agent/config/gate wiring actually loads memory, and retrieve a small deterministic set
of relevant active records without a cloud service. This PRD adds read-only
`gate doctor --memory` and `gate memory find`, stable JSON contracts, install guidance,
and public CLI documentation.

It intentionally does not add effectiveness statistics. `gate memory stats` and retro
cadence enforcement remain deferred until five completed contract-bearing PRDs provide
meaningful data.

**Dependencies:** PRD-017 and PRD-018 must be Ship Verified before Phase 4.

---

## 2. Goals

### Primary Goals

- [ ] Diagnose partial/manual memory installations without modifying adopter files.
- [ ] Retrieve deterministic relevant records by query, tag, and watched path.
- [ ] Give agents vendor-neutral human and JSON outputs suitable for adapters.
- [ ] Document safe activation/remediation while preserving no-overwrite, offline,
      zero-dependency, and human-push-only invariants.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Specified broken wiring modes diagnosed | 0 | all | fixture matrix |
| Recall result ordering across identical runs | unavailable | byte-stable | JSON golden |
| Default/max result count | unbounded | 20 / 1000 | limit tests |
| Doctor/find repository mutations | n/a | 0 | before/after tree hash |
| Runtime dependencies / network / push paths | 0 | 0 | package/static gates |

---

## 3. User Stories

#### User Story 1

```
As an adopter,
I want a read-only memory doctor,
so that a present `_brain` directory cannot create a false sense of working recall.
```

**Acceptance Criteria:**

- [ ] Mandatory local wiring failures exit non-zero with concrete remediation.
- [ ] Missing literal CI reachability is a warning, not a false local failure.
- [ ] Optional absent vendor files are ignored; configured existing files missing the
      pointer fail.

#### User Story 2

```
As any coding agent,
I want deterministic local memory search,
so that I can select relevant records without embeddings or vendor-specific storage.
```

**Acceptance Criteria:**

- [ ] Query/tag/path selectors produce stable ranked results and matched reasons.
- [ ] Disabled memory, invalid selectors/limits, unsafe paths, or invalid records fail
      before results are returned.

---

## 4. Functional Requirements

1. **FR-1 — Read-only memory doctor:** Add
   `gate doctor --memory [--json]`. It checks memory config and containment, root/index,
   record validation, at least one configured entrypoint with the canonical bootstrap/
   INDEX pointer, standalone verify script, package script, Phase 7 manifest reachability,
   optional CI literal reachability, and unfilled practice placeholders. Mandatory local
   failures use stable non-zero codes; CI absence warns. It never edits config,
   manifests, entrypoints, scripts, or state.
   - **Targets:** `packages/provegate/src/core/memory/doctor.ts` (new),
     `packages/provegate/src/core/memory/index.ts`,
     `packages/provegate/src/cli.ts`,
     `packages/provegate/src/index.ts`,
     `packages/provegate/test/memory.test.ts`

2. **FR-2 — Stable doctor output and partial-install matrix:** Human output names the
   failing check and repair. JSON exposes stable `ok`, `checks[]`, `code`, `severity`,
   and `detail`. Test fresh practices, existing config/manifest, missing index/script/
   package script/Phase 7 wiring, multiple entrypoint combinations, placeholder residue,
   disabled memory, CI warning, and byte-for-byte non-mutation.
   - **Targets:** `packages/provegate/src/core/memory/doctor.ts`,
     `packages/provegate/src/cli.ts`,
     `packages/provegate/test/memory.test.ts`,
     `packages/provegate/test/practices-pack.test.ts`

3. **FR-3 — Deterministic local recall:** Add
   `gate memory find [--query=<text>] [--paths=<comma-list>] [--tag=<slug>] [--limit=N] [--json]`.
   Require at least one selector. Validate repo-relative contained path selectors and
   active indexed records before ranking. Order by watched-path overlap, exact name/tag,
   case-insensitive description/name token matches, then lexical slug. Default limit is
   20; allowed range is 1–1000. Results include slug/type/scope/description/path and
   matched reasons. Disabled memory refuses with remediation.
   - **Targets:** `packages/provegate/src/core/memory/find.ts` (new),
     `packages/provegate/src/core/memory/index.ts`,
     `packages/provegate/src/cli.ts`,
     `packages/provegate/src/index.ts`,
     `packages/provegate/test/memory.test.ts`

4. **FR-4 — Recall bounds, portability, and safety:** Test query/tag/path combinations,
   multi-reason ties, limit boundaries, 1000-record input, Unicode/case behavior,
   Windows separators, absolute/`..`/symlink escape, superseded/private exclusion,
   invalid records, stable JSON, and no repository writes. No embeddings, model calls,
   shell execution, network, persistent search index, or causal recommendation claims.
   - **Targets:** `packages/provegate/src/core/memory/find.ts`,
     `packages/provegate/test/memory.test.ts`,
     `packages/provegate/test/single-package.test.ts`

5. **FR-5 — Adoption guidance and distribution:** Update practices NEXT_STEPS/shims,
   package README/QUICKSTART, docs CLI reference, pack manifest, and content tests with
   doctor/find behavior, activation order, warnings versus failures, no-overwrite,
   local-only recall, and the explicit stats deferral. Root dogfood doctor must be green.
   - **Targets:** `packages/provegate/practices/NEXT_STEPS.md`,
     `packages/provegate/practices/shims/**`,
     `packages/provegate/README.md`, `packages/provegate/QUICKSTART.md`,
     `apps/docs/content/docs/cli.mdx`,
     `packages/provegate/test/pack-manifest.json`,
     `packages/provegate/test/content-launch.test.ts`,
     `packages/provegate/test/practices-pack.test.ts`

6. **FR-6 — Invariant and compatibility regression:** Preserve zero runtime
   dependencies, no CLI network/push path, additive-only practices init, stable existing
   commands, memory-disabled refusal, single-package repositories, and agent-agnostic
   behavior. `verify:workflow`, `check-egress`, and pack-drift remain green.
   - **Targets:** `packages/provegate/package.json`,
     `packages/provegate/test/memory.test.ts`,
     `packages/provegate/test/practices-pack.test.ts`,
     `packages/provegate/test/single-package.test.ts`,
     `scripts/check-static-egress.mjs`,
     `scripts/verify/pack-drift-ledger.json`

---

## 5. Non-Goals (Out of Scope)

- Record/config substrate (PRD-017) or PRD/Phase 7 enforcement (PRD-018).
- `gate memory stats`, retro cadence enforcement, usage dashboards, causal metrics, or
  historical PRD rewrites.
- Automatic near-duplicate merge, supersession decisions, record authoring, or
  entrypoint/config/manifest edits.
- Embeddings, vector databases, model calls, cloud services, telemetry, accounts,
  network state, persistent indexes, or runtime dependencies.
- Supporting arbitrary YAML beyond PRD-017’s documented subset.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** memory enabled but no configured entrypoint contains the pointer, **When**
  doctor runs, **Then** it fails with a stable code and a non-mutating repair.
- **Given** local wiring is green but CI lacks a literal memory command, **When** doctor
  runs, **Then** it returns a warning without making local `ok` false.
- **Given** identical records/selectors, **When** find runs twice, **Then** JSON bytes and
  result order match.
- **Given** a path escape or invalid limit, **When** find runs, **Then** it returns no
  partial result.
- **Given** memory disabled, **When** doctor/find run, **Then** both explain activation
  and preserve legacy state.
- **Given** either command, **When** before/after repository bytes are compared, **Then**
  no file changes.

---

## 7. Technical Considerations

### Architecture

- Doctor consumes PRD-017 config/parser and PRD-018 manifest contract; it does not
  create a second validator or infer enablement.
- Find scans current indexed active records on demand. Output is bounded and no cache
  invalidation problem exists.
- Human and JSON rendering share typed results so adapters cannot change semantics.
- CI reachability is warning-only because CI layouts are user-defined; Phase 7 local
  manifest reachability is mandatory.

### Dependencies

- PRD-017 and PRD-018 Ship Verified; no new runtime dependencies.

### Rollback

- Revert CLI routes and docs. Existing memory/gates continue operating without doctor
  or find; no state or cache cleanup exists.

---

## 8. Implementation Scope

### In Scope

- [ ] Doctor core, CLI, stable human/JSON results
- [ ] Deterministic find core, CLI, ranking, and bounds
- [ ] Partial-install, portability, non-mutation, and invariant fixtures
- [ ] Practices/adoption/package/docs distribution updates

---

## 9. Open Questions

(none) — owner approved the split and stats deferral on 2026-07-25.

---

## 10. References

- PRD-017 agent memory substrate
- PRD-018 closed-loop memory contract
- PRD-017 owner-approved source addendum
- `_brain/learnings/memory-index-vs-detail.md`
- `_brain/learnings/push-is-human-by-omission.md`

---

## Memory Inputs

- applied: `memory-index-vs-detail` — find augments, not replaces, the small INDEX.
- applied: `push-is-human-by-omission` — doctor/find are read-only and never push.
- applied: `gate-wire-or-delete` — doctor proves mandatory local reachability.
- applied: `turbo-cache-masks-out-of-input-reads` — fixtures isolate record trees and
  declare corpus inputs.

---

## Memory Outputs

- none — doctor/find behavior is fully derivable from implementation and tests; append
  an exact learning path only if implementation exposes a non-derivable trap.

---

## Conflict Surface

- `packages/provegate/src/core/memory/doctor.ts`
- `packages/provegate/src/core/memory/find.ts`
- `packages/provegate/src/core/memory/index.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/src/index.ts`
- `packages/provegate/test/memory.test.ts`
- `packages/provegate/test/practices-pack.test.ts`
- `packages/provegate/test/single-package.test.ts`
- `packages/provegate/test/content-launch.test.ts`
- `packages/provegate/test/pack-manifest.json`
- `packages/provegate/practices/NEXT_STEPS.md`
- `packages/provegate/practices/shims/**`
- `packages/provegate/README.md`
- `packages/provegate/QUICKSTART.md`
- `apps/docs/content/docs/cli.mdx`
- `scripts/check-static-egress.mjs`
- `scripts/verify/pack-drift-ledger.json`

---

## Durable Artifacts

- CLI reference: `apps/docs/content/docs/cli.mdx`
- Adoption guide: `packages/provegate/QUICKSTART.md`
- Review: `_docs/reviews/review-019-memory-adoption-cli.md`

---

## 11. Verification Commands

| FR   | Command / Check                                                   | Scope | Notes |
| ---- | ----------------------------------------------------------------- | ----- | ----- |
| FR-1 | `pnpm --filter provegate test test/memory.test.ts`                | pkg   | doctor checks and codes |
| FR-2 | `pnpm --filter provegate test test/practices-pack.test.ts`        | pkg   | partial install and non-mutation |
| FR-3 | `pnpm --filter provegate test test/memory.test.ts`                | pkg   | find ranking/JSON |
| FR-4 | `pnpm --filter provegate test test/single-package.test.ts`        | pkg   | bounds, portability, containment |
| FR-5 | `pnpm --filter provegate test test/content-launch.test.ts`        | pkg   | docs/distribution |
| FR-6 | `pnpm --filter provegate test test/practices-pack.test.ts`        | pkg   | no-overwrite and invariant regression |

Cross-cutting floor:

- `pnpm check-types`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm verify:workflow`
- `pnpm check-egress`

Before Phase 2 PASS, run: `gate check PRD-019`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT add stats/retro metrics before the evidence threshold.
- DO NOT mutate any repository file from doctor/find.
- DO NOT infer enablement, auto-fix wiring, or edit adopter files.
- DO NOT add embeddings, model/network calls, telemetry, persistent indexes, runtime
  dependencies, or push paths.
- DO NOT return partial results after validation failure.
- DO NOT treat CI warning as a local gate failure or local failure as a warning.
- DO NOT duplicate parser/validator semantics from PRD-017.

---

## Changelog

| Date       | Author           | Changes |
| ---------- | ---------------- | ------- |
| 2026-07-25 | Codex, for owner | Initial draft from owner-approved PRD-017 split |
| 2026-07-25 | owner            | Approved PRD-019 Phase 1 scope; waits for PRD-017/018 dependencies |
| 2026-07-25 | independent agent via owner | Readiness iteration 1: PASS 8.425 (infra weights), tiers high/high. Found two uncovered cases living in this repo already: the symlinked `AGENTS.md` entrypoint and the pack-reconcile obligation on shipped adoption files. Watch items W1–W4 |
