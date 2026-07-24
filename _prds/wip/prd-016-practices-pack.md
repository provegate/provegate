# PRD-016: Practices Pack — `gate init --practices`

> **Status**: Draft
>
> <!-- Canonical lifecycle values only (see METHOD.md → Status lifecycle):
> Draft | In Review | Approved | In Progress | Code Complete | Operator Verification |
> Ship Verified | Superseded | Archived | Blocked | Deferred | Not Started. Never
> write "Completed"/"Done" — the state builder normalizes known aliases but the
> canonical value is the contract (workflow.config statusVocab.canonical). -->
>
> **Created**: 2026-07-24
> **Updated**: 2026-07-24
> **Author**: agent (Claude Code session), for owner review
> **Audience**: Implementing Agent
> **Slug**: `practices-pack`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Class Rationale**: n/a (feature)
> **Autonomous Close**: operator-gated
> **Value**: 4.15 (MF/UI/TL/AR/RM: 4/4/4/5/4)

<!-- Value axes (AGENT_BOOTSTRAP.md → PRD triage): MF 0.25, UI 0.25, TL 0.20,
AR 0.15, RM 0.15. 0.25*4 + 0.25*4 + 0.20*4 + 0.15*5 + 0.15*4 = 4.15 — top tier. -->

---

## 1. Introduction / Overview

This repo now runs a full practices layer on top of the gated workflow: `_brain`
agent-agnostic memory, a canonical `AGENT_BOOTSTRAP.md` entrypoint with thin per-tool
shims, a base-branch guard + secret-scan pre-commit pair, and a zero-dependency
`verify:*` check library with a known-red ledger. All of it was hand-built here on
2026-07-24 (practices-handoff import) and none of it ships in the `provegate` package —
`gate init` scaffolds only the workflow tree (artifact dirs, starter config, empty gates
manifest).

This PRD packages that layer as a **practices pack**: a `practices/` content directory
shipped with the npm package, installed into any adopter repo by `gate init --practices`
under the existing never-overwrite discipline. An adopter gets in one command what this
repo built by hand.

---

## 2. Goals

### Primary Goals

- [ ] `gate init --practices` installs the full practices layer into a fresh OR existing
      repo without overwriting a single existing file.
- [ ] The installed layer is immediately runnable: verify scripts execute with zero
      dependencies, hooks are executable, all content is English-only and
      source-project-clean.
- [ ] The pack is convention-default (same dir names as `gate init` defaults); adaptation
      points are explicit TODO markers, not silent assumptions.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Commands to stand up the practices layer in a new repo | ~20 manual steps | 1 (`gate init --practices`) | fixture test walks the one-command path |
| Files overwritten on re-run / existing repo | n/a | 0 | fixture test: second run reports all-skip |
| Hygiene (source-project names / Turkish in shipped pack) | n/a | 0 matches | §11 grep gates |

---

## 3. User Stories

#### User Story 1

```
As a maintainer adopting the gated workflow in a new repo,
I want one command to install the memory protocol, guard hooks, and verify library,
so that I start with the proven practice layer instead of rebuilding it from docs.
```

**Acceptance Criteria:**

- [ ] `gate init --practices` on an empty git repo creates the workflow tree AND the
      practices layer; `node scripts/verify/verify-workflow.mjs` exits 0 immediately.
- [ ] Running it again reports every practices path as skipped, none overwritten.

#### User Story 2

```
As a maintainer with an existing CLAUDE.md / AGENTS.md,
I want the pack to leave my entrypoints untouched and hand me paste-ready shims,
so that adoption never destroys my existing agent configuration.
```

**Acceptance Criteria:**

- [ ] Existing root files are never modified; shim content lands as
      `practices/shims/*.snippet` files plus a printed "paste this" next-step.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1**: The package ships a `practices/` content directory: `brain/` (generic
   PROTOCOL.md, INDEX starter, `_templates/learning.md`, `_templates/adr.md`, the 21
   `scope: workflow` seed learnings), `shims/` (CLAUDE.md / AGENTS.md / cursor-rule
   snippets), `templates/` (AGENT_BOOTSTRAP, STATUS, commitlint config), `hooks/`
   (pre-commit, commit-msg), `scripts/` (base-branch-guard.mjs, secret-scan.mjs), and
   `verify/` (lib + the 7 check scripts + verify-workflow bundle + empty allowlists +
   known-red ledger starter). All zero-dependency, English-only, config-over-hardcode.
   - **Targets:** `packages/provegate/practices/**` (new), `packages/provegate/package.json`
     (`files` array)
2. **FR-2**: `gate init --practices` extends the init plan with the practices actions,
   reusing the existing `wx` never-overwrite writes and `containedPath` root-containment;
   `--dry-run` composes with it. Bare `gate init` behavior is byte-identical to today.
   - **Targets:** `packages/provegate/src/core/run/init.ts::planInit`,
     `packages/provegate/src/core/run/init.ts::initWorkspace`,
     `packages/provegate/src/cli.ts::runInit`
3. **FR-3**: Repo-level files land at their conventional destinations (`_brain/**`,
   `scripts/verify/**`, `scripts/*.mjs`, `.githooks/*`, `AGENT_BOOTSTRAP.md`,
   `STATUS.md`, `_docs/retros/README.md`, `_state/known-red-verifies.json`); hook files
   are written executable; existing files are skipped and reported, never overwritten.
   - **Targets:** `packages/provegate/src/core/run/init.ts` (practices plan section)
4. **FR-4**: The command mutates no adopter state beyond file creation: it does NOT run
   `git config`, does NOT edit an existing `package.json`, does NOT install
   dependencies. It ends by printing the manual wiring steps (hooksPath, package.json
   script snippet, shim paste), sourced from one next-steps template in the pack.
   - **Targets:** `packages/provegate/practices/NEXT_STEPS.md` (new),
     `packages/provegate/src/cli.ts::runInit`
5. **FR-5**: A fixture test proves the lifecycle end-to-end in a temp git repo: fresh
   install → all files created, verify bundle exits 0; re-run → all-skip; `--dry-run` →
   zero writes; hygiene assertions (no source-project names, no Turkish, hooks
   executable).
   - **Targets:** `packages/provegate/test/practices-pack.test.ts` (new)
6. **FR-6**: QUICKSTART documents the flag: what installs, what stays manual (the
   printed wiring steps), and the never-overwrite guarantee.
   - **Targets:** `packages/provegate/QUICKSTART.md`

---

## 5. Non-Goals (Out of Scope)

- The four deferred CLI hardenings (§11 parser Command-column scoping; rejecting
  `completed/done` aliases on new items; TTY-guarded `gate accept` writer;
  state-staleness check) — each is its own future PRD.
- Config-aware path remapping in the installed verify scripts (v1 is
  convention-default; a config-reading v2 is future work).
- Editing or merging into existing adopter files (shims stay paste-yourself by design).
- Parallel-orchestration machinery (docs-only per the wave-4 decision).
- Any npm publish / release-channel work.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** an empty git repo, **When** `gate init --practices` runs, **Then** the
  workflow tree AND practices layer exist, and `node scripts/verify/verify-workflow.mjs`
  exits 0.
- **Given** a repo where `gate init --practices` already ran, **When** it runs again,
  **Then** every practices path reports as skipped and no file content changed.
- **Given** a repo with an existing `CLAUDE.md`, **When** the pack installs, **Then**
  `CLAUDE.md` is untouched and the shim snippet is available under `practices/shims/`
  with a printed paste instruction.
- **Given** `gate init --practices --dry-run`, **When** it completes, **Then** the plan
  is printed and zero files exist on disk.

---

## 7. Technical Considerations

### Architecture

- **Content lives in the package, not in code:** `practices/` is static shipped content
  (like `prompts/` and `templates/` today); `planInit` gains a practices section that
  maps pack files → repo destinations. No new abstractions.
- **Provenance:** pack content is lifted from this repo's reviewed practices import
  (landed 2026-07-24, commits `a9b3e6d`..`b3baf5b`), which itself derives from the
  reviewed handoff. Seed learnings travel verbatim (`scope: workflow`,
  `provenance: workflow-seed`). Nothing is fabricated; owner approval of this PRD is the
  method-content sign-off.
- **Safety rails preserved:** zero runtime dependencies, no network, no push paths, `wx`
  writes, `containedPath` containment — all existing invariants; the fixture test
  asserts the pack scripts contain no `git push`.
- **Verify scripts:** installed under `scripts/verify/` exactly as in this repo
  (target-root argument, reporter, known-red ledger). They assume convention-default dir
  names — the same defaults `gate init` scaffolds, so a pack install is always
  internally consistent.

### Dependencies

- none (static content + existing init machinery)

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/practices/**` (new shipped content)
- [ ] `packages/provegate/src/core/run/init.ts`, `src/cli.ts` (flag + plan)
- [ ] `packages/provegate/package.json` (`files` array only)
- [ ] `packages/provegate/test/practices-pack.test.ts` (new)
- [ ] `packages/provegate/QUICKSTART.md`

---

## 9. Open Questions

(none) — all resolved by owner on 2026-07-24.

**Q1 resolved:** `gate init --practices` flag (not a separate command) — composes with
existing init and `--dry-run`.
**Q2 resolved:** all 21 workflow seed learnings ship — tool-agnostic by construction.
**Q3 resolved:** `commitlint.config.mjs` is written only when absent (`wx` skip);
differently-named existing configs are reconciled by the adopter via NEXT_STEPS.

---

## 10. References

- This repo's installed practice layer (source of the pack content): `_brain/`,
  `AGENT_BOOTSTRAP.md`, `STATUS.md`, `scripts/verify/`, `scripts/base-branch-guard.mjs`,
  `scripts/secret-scan.mjs`, `.githooks/`, `_state/known-red-verifies.json`
- `_brain/PROTOCOL.md` (canonical memory protocol; pack ships a genericized copy)
- `_docs/parallel-orchestration/` (explicitly NOT packed)
- Import history: commits `a9b3e6d` (wave 1) … `d2a923f` (handoff deletion)

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `packages/provegate/practices/**`
- `packages/provegate/src/core/run/init.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/test/practices-pack.test.ts`
- `packages/provegate/QUICKSTART.md`
- `packages/provegate/package.json`

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Review artifact: `_docs/reviews/review-016-practices-pack.md`
- Learning: `_brain/learnings/{slug}.md` — capture protocol at Phase 7; placeholder
  until the learning (if any) is known; replace with `- none` if nothing non-derivable
  surfaces

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                                                | Scope     | Notes                                        |
| ---- | ------------------------------------------------------------------------------ | --------- | -------------------------------------------- |
| FR-1 | `test -d packages/provegate/practices/brain`                                    | pkg       | pack content dir ships                       |
| FR-1 | `pnpm --filter provegate test test/practices-pack.test.ts`                      | pkg       | 21 seeds + hygiene asserted in fixture       |
| FR-2 | `pnpm --filter provegate test test/practices-pack.test.ts`                      | pkg       | flag + dry-run + never-overwrite lifecycle   |
| FR-3 | `pnpm --filter provegate test test/practices-pack.test.ts`                      | pkg       | destinations + executable hooks + skip report |
| FR-4 | `pnpm --filter provegate test test/practices-pack.test.ts`                      | pkg       | no git-config/package.json mutation asserted |
| FR-5 | `pnpm --filter provegate test test/practices-pack.test.ts`                      | pkg       | the fixture test itself                      |
| FR-6 | `grep -c "init --practices" packages/provegate/QUICKSTART.md`                   | docs      | flag documented                              |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build

Hygiene (mirrors prior PRDs):

- `grep -ri -l -e emofy -e rayvaz packages/provegate/practices && exit 1 || true` — no
  source-project names in shipped pack content

Before Phase 2 PASS, run: `gate check PRD-016`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT add a runtime dependency to `packages/provegate` (zero-dep invariant).
- DO NOT add any code path that pushes to a git remote — in the CLI or in any packed
  script; the fixture asserts pack scripts contain no `git push`.
- DO NOT overwrite any existing adopter file — `wx` or skip, never truncate/merge.
- DO NOT mutate adopter state beyond file creation (no `git config`, no dependency
  install, no edits to an existing `package.json`).
- DO NOT fabricate method content — pack files are lifted from this repo's reviewed
  practice layer, adapted only by genericization (placeholders, TODO markers).

---

## Changelog

| Date       | Author            | Changes                                    |
| ---------- | ----------------- | ------------------------------------------ |
| 2026-07-24 | agent (for owner) | Initial draft                              |
| 2026-07-24 | owner             | Q1–Q3 resolved (flag, all 21 seeds, wx)    |
