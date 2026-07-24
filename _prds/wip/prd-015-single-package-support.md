# PRD-015: Single-Package (Non-Monorepo) Support

> **Status**: Draft
>
> **Created**: 2026-07-24
> **Updated**: 2026-07-24
> **Author**: owner
> **Audience**: Implementing Agent (Claude Code / Cursor / Codex)
> **Slug**: `single-package-support`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Class Rationale**: (default class) — a first-class supported repo shape and
> its adoption path (fixture + quickstart), user-facing.
> **Autonomous Close**: eligible
> **State Record**: `_state/prds.json`

---

## 1. Introduction / Overview

`gate` was extracted inside a pnpm+turbo monorepo, and every shipped example
(the dogfood repo, `QUICKSTART.md`, the docs) speaks that layout. But the tool is
**already designed to be layout-agnostic**: `gate init` scaffolds only the
workflow tree (`_prds/`, `_tasks/`, `_state/`, …) and never `apps/`/`packages/`;
"workspace" throughout the code means the **git repo root**, not a pnpm
workspace; the `commands` config takes arbitrary strings; and the wiring audit
already understands both `--filter`ed and plain scripts.

This PRD makes that latent capability **explicit and proven**: a test fixture
that runs the whole gated lifecycle in a plain single-package repo, a documented
`commands` recipe for non-pnpm/non-turbo repos, and a fix for any residual
monorepo assumption the fixture surfaces. It is additive — monorepo support is
untouched. First impressions drive adoption (roadmap §4.4); a user in a single
`package.json` repo should reach a green `gate run` without owning a monorepo.

---

## 2. Goals

### Primary Goals

- [ ] The full gated lifecycle (`init` → `new` → `open` → `check` → `run`) runs
      green in a plain single-package git repo, proven by an automated fixture.
- [ ] A non-pnpm/non-turbo repo configures its gates in ONE place (`commands`),
      documented with a concrete recipe.
- [ ] Any residual monorepo assumption is removed config-over-hardcode; the
      `packages/provegate` zero-dependency law is preserved.

### Success Metrics

| Metric                                       | Current      | Target        | Measurement                        |
| -------------------------------------------- | ------------ | ------------- | ---------------------------------- |
| Single-package lifecycle covered by a test   | 0            | 1 fixture     | `single-package.test.ts`           |
| Monorepo/tool assumptions hardcoded in gate  | audit        | 0             | review + fixture                   |
| Documented single-package `commands` recipe  | 0            | 1             | `QUICKSTART.md` + docs quickstart  |
| New runtime deps in `packages/provegate`     | 0            | 0             | `package.json`                     |

---

## 3. User Stories

#### User Story 1

```
As a developer with a single-package repo (one package.json, no pnpm workspace),
I want `gate init` then `gate run` to work without a monorepo,
so that I can adopt gated autonomy without restructuring my project.
```

**Acceptance Criteria:**

- [ ] `gate init` in a fresh single-package repo scaffolds only the workflow tree
      (no `apps/`/`packages/`), additively.
- [ ] With `commands` pointed at the repo's own scripts, `gate run` executes the
      Phase-5 floor and closes with a local merge (push stays human).

#### User Story 2

```
As someone whose repo uses npm (or a direct tsc/eslint/vitest toolchain),
I want a one-place command recipe,
so that gate runs my checks without assuming pnpm or turbo.
```

**Acceptance Criteria:**

- [ ] The quickstart shows a `commands` block that maps `checkTypes/lint/test/build`
      to the user's own commands (a non-pnpm example included).
- [ ] The wiring audit (`gate check --wiring`) passes for a single-package
      `commands` config.

---

## 4. Functional Requirements

1. **FR-1 (verify-first)**: A fixture drives the whole lifecycle in a temporary
   plain single-package repo — `gate init`, `gate new`, `gate open`, `gate check`,
   `gate run` with a trivial gates manifest — asserting each exits clean and the
   local merge lands (no push). Record in the FR which monorepo assumptions (if
   any) surfaced, so FR-5 is scoped by evidence, not guesswork.
   - **Targets:** `packages/provegate/test/single-package.test.ts`
2. **FR-2**: Confirm `gate init` is layout-agnostic: it scaffolds only the
   workflow tree + starter config + empty gates manifest, additively, and its
   `starterConfig` `commands` are editable placeholders that do not presuppose
   pnpm/turbo/`--filter`. Assert this in the fixture; fix if violated.
   - **Targets:** `packages/provegate/src/core/run/init.ts::initWorkspace`,
     `packages/provegate/src/core/run/init.ts::starterConfig`
3. **FR-3**: Document a single-package `commands` recipe — the `commands` config
   already accepts arbitrary strings, so show mapping `checkTypes/lint/test/build`
   to a repo's own scripts, including one non-pnpm example (e.g. `tsc --noEmit`,
   `eslint .`, `vitest run`, `npm run build`). No code change if the audit is clean.
   - **Targets:** `packages/provegate/QUICKSTART.md`
4. **FR-4**: Add a single-package section to the docs quickstart — gate is
   repo-layout-agnostic; point `commands` at your scripts; the workflow tree is the
   same. Content addition only (does not restyle the docs).
   - **Targets:** `apps/docs/content/docs/quickstart.mdx`
5. **FR-5**: Fix any real monorepo assumption FR-1 surfaces (a hardcoded
   `--filter`/turbo/apps-path), config-over-hardcode, with no new runtime
   dependency. If FR-1 finds none, this FR is a no-op recorded as such.
   - **Targets:** (scoped by FR-1; within `packages/provegate/src/core/**`)

---

## 5. Non-Goals (Out of Scope)

- Dropping or weakening monorepo support — single-package is strictly additive.
- A scaffolder that creates application/package source; `gate init` stays
  workflow-tree-only and additive.
- Auto-detecting repo shape and branching behavior on it (see Open Questions Q2).
- The Bun/Deno runtime matrix (roadmap §4.3) — that is PRD-017; here `commands`
  is merely shown to be tool-agnostic.
- Changing the shipped default `commands` away from `pnpm` (the dogfood repo IS a
  monorepo; defaults stay, single-package is a documented configuration).

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a fresh single-package git repo, **When** `gate init` runs, **Then**
  only the workflow tree + config + manifest are created, additively, with no
  `apps/`/`packages/`.
- **Given** that repo with `commands` mapped to its own scripts, **When**
  `gate run` executes, **Then** the Phase-5 floor runs and a local no-ff merge
  lands, and nothing is pushed.
- **Given** a single-package `commands` config, **When** `gate check --wiring`
  runs, **Then** it passes (no false monorepo assumption).
- **Given** the docs quickstart, **When** a single-package user reads it, **Then**
  the `commands` recipe is present with a non-pnpm example.

---

## 7. Technical Considerations

### Architecture

- **Verify-first, then close gaps.** The audit shows the capability is mostly
  present (init scaffolds workflow-tree-only; `commands` is string-config; wiring
  handles both shapes; "workspace" = repo root). So the load-bearing deliverable
  is the FR-1 fixture that PROVES it end-to-end; FR-5 fixes only what the fixture
  breaks on.
- **Config over hardcode** (source-snapshot rule): every repo-shape/tool
  difference lives in `commands`/`dirs`, never in a branch on layout.
- **Zero-dependency law** for `packages/provegate` holds; no network, no telemetry.

### Dependencies

- None new. Uses the existing test harness (vitest) and a temp-git-repo fixture
  pattern (as the worktree/lease tests already do).

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/test/single-package.test.ts` (the lifecycle fixture)
- [ ] `packages/provegate/src/core/run/init.ts` (only if FR-2/FR-5 needs a fix)
- [ ] `packages/provegate/QUICKSTART.md` (single-package recipe)
- [ ] `apps/docs/content/docs/quickstart.mdx` (single-package section)

### Out of Scope

- `apps/web/**`, `packages/design/**`, the docs theming/layout.

---

## 9. Open Questions

> Owner decisions (roadmap §4). Each has a proposal; resolve or explicitly defer
> before Phase 2 PASS.

- [ ] **Q1 (roadmap §4.4):** Confirm v1 officially supports single-package repos.
      *Proposal: yes — this PRD delivers it additively.*
- [ ] **Q2:** Should `gate init` auto-detect monorepo vs single-package and tailor
      the starter `commands`? *Proposal: no auto-detect in v1 — ship one
      documented recipe; keep `starterConfig` commands as editable defaults.*
- [ ] **Q3 (relates to §4.3):** Show npm/yarn/bun examples in the recipe, or pnpm
      + "swap for your tool"? *Proposal: show the tool-agnostic `commands` block
      with one non-pnpm example; defer the full Bun/Deno matrix to PRD-017.*

---

## 10. References

- `docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md` §4.4 —
  single-package support open decision
- `packages/provegate/src/core/run/init.ts` — the additive workflow-tree scaffold
- `packages/provegate/src/core/gates/wiring.ts` — the `--filter`/plain-script audit
- `packages/provegate/src/core/config/defaults.ts` — `commands` config
- `packages/provegate/QUICKSTART.md` — the current (monorepo-flavored) narrative

---

## Conflict Surface

- `packages/provegate/test/single-package.test.ts`
- `packages/provegate/src/core/run/init.ts`
- `packages/provegate/QUICKSTART.md`
- `apps/docs/content/docs/quickstart.mdx`

> `package.json`/lockfiles and agent-entry docs are shared append-only surfaces,
> excluded from overlap by `workflow.config.json` `sharedAppendOnly`.

---

## Durable Artifacts

- `packages/provegate/QUICKSTART.md` — the single-package `commands` recipe and
  the "gate is repo-layout-agnostic" statement.

---

## 11. Verification Commands

Run from repo root.

| FR   | Command / Check                                                        | Scope | Notes                                  |
| ---- | ---------------------------------------------------------------------- | ----- | -------------------------------------- |
| FR-1 | `pnpm --filter provegate test test/single-package.test.ts`            | pkg   | full lifecycle in a single-package repo |
| FR-2 | `pnpm --filter provegate test test/single-package.test.ts`            | pkg   | init scaffolds workflow-tree only       |
| FR-3 | `grep -c "commands" packages/provegate/QUICKSTART.md`                 | pkg   | single-package recipe present           |
| FR-4 | `grep -ci "single-package" apps/docs/content/docs/quickstart.mdx`     | docs  | quickstart section present              |
| FR-5 | `pnpm --filter provegate test test/single-package.test.ts`            | pkg   | no residual monorepo assumption          |

Cross-cutting floor (all green before Code Complete):

- `pnpm check-types` · `pnpm lint` · `pnpm test` · `pnpm build`
- `node packages/provegate/dist/cli.js check PRD-015`
- `node packages/provegate/dist/cli.js push; test $? -eq 1`

Before Phase 2 PASS, run: `gate check PRD-015`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT drop or weaken monorepo support — single-package is additive.
- DO NOT hardcode a repo layout or a tool; every difference lives in `commands`/`dirs`.
- DO NOT make `gate init` create application/package source — it stays
  workflow-tree-only and additive.
- DO NOT add a runtime dependency to `packages/provegate` (zero-dep law), nor a
  network call or telemetry.
- DO NOT branch behavior on repo shape by auto-detection in v1 (unless Q2 decides otherwise).
- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.

---

## Changelog

| Date       | Author | Changes                                             |
| ---------- | ------ | --------------------------------------------------- |
| 2026-07-24 | owner  | Initial draft (grounded in a monorepo-assumption audit) |
