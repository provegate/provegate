# Tasks: Single-Package (Non-Monorepo) Support

> **PRD**: [prd-015-single-package-support.md](../../_prds/wip/prd-015-single-package-support.md)
> **Readiness**: [readiness-015-single-package-support.md](../../_readiness/wip/readiness-015-single-package-support.md)
> **Status**: Ship Verified
> **Readiness Score**: 8.2/10
> **Model Tier (Execution)**: medium
> **Created**: 2026-07-24
> **Updated**: 2026-07-24

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- Phase 4 agents hold a valid lock lease before editing implementation files.
- Autonomous Close is **eligible**: every verification is machine-checkable, so
  there are NO operator-owned rows — the runner may close on green gates.

---

## Relevant Files

- `packages/provegate/test/single-package.test.ts` — the lifecycle fixture (real temp repo)
- `packages/provegate/src/core/run/init.ts` — audited; edited only if FR-2/FR-5 needs a fix
- `packages/provegate/QUICKSTART.md` — single-package `commands` recipe (durable artifact)
- `apps/docs/content/docs/quickstart.mdx` — single-package section

---

## Tasks

- [x] 1.0 FR-1 — verify-first lifecycle fixture (W1, W3)
  - [x] 1.1 `single-package.test.ts` drives a REAL temp git repo (one
        `package.json`, no `pnpm-workspace.yaml`, no turbo): `initWorkspace`, then
        a feature branch, then `mergeToLocalBase` → no-ff merge lands on `main`,
        post-merge gate runs, no remote (nothing pushed). Not a mock.
  - [x] 1.2 The fixture config uses NON-pnpm commands (`node -e …`) for all four
        gates + post-merge — tool-agnosticism proven, not asserted.
  - [x] 1.3 Finding: the fixture passed with NO change to gate code → no hardcoded
        monorepo assumption surfaced (scopes FR-5 to a no-op).

- [x] 2.0 FR-2 — `gate init` is layout-agnostic
  - [x] 2.1 Fixture asserts `gate init` scaffolds the workflow tree + config +
        manifest only — no `apps/`/`packages/`/`pnpm-workspace.yaml`, and the
        pre-existing single `package.json` is byte-identical (additive). Wiring
        audit accepts both a `pnpm <script>` and a direct non-pnpm config. No fix needed.

- [x] 3.0 FR-3 — single-package `commands` recipe (durable)
  - [x] 3.1 `QUICKSTART.md` — "Single-package repos" section: layout-agnostic
        statement + a `commands` block (npm-script form) + a direct non-pnpm form.

- [x] 4.0 FR-4 — docs single-package section
  - [x] 4.1 `apps/docs/content/docs/quickstart.mdx` — matching "Single-package
        repos" section. Content addition only.

- [x] 5.0 FR-5 — fix a surfaced monorepo assumption (W2, evidence-scoped)
  - [x] 5.1 **No-op** — FR-1 surfaced no hardcoded monorepo assumption; the audit
        held (init scaffolds workflow-tree only; `commands` is string-config;
        wiring handles both shapes; "workspace" = repo root). No gate code changed.

- [x] 6.0 Phase 5 — Testing
  - [x] 6.1 Every §11 command run; evidence in the ledger.
  - [x] 6.2 Floor: check-types, lint, test, build, gate check, never-push.

- [x] 7.0 Phase 6 — Final Auditing
  - [x] 7.1 Independent adversarial review (codex, cross-model) →
        `_docs/reviews/review-015-single-package-support.md`. R1 FAIL (Critical 1
        — the fixture never executed the four floor commands; + 2 High + 1 Medium).
        R2 FAIL (Critical 1 residual — positive test asserted only the first
        command; + 1 High invalid JSON comment). R3 **PASS** (Critical 0, High 0,
        Medium 0) — all four floor-command mutations now fail the positive test.

- [x] 8.0 Phase 7 — Learning
  - [x] 8.1 Durable artifact (`packages/provegate/QUICKSTART.md`) is in the diff.
  - [x] 8.2 Knowledge ingest: the floor runs from `gates.manifest.json` phase 4,
        NOT from `config.commands` (which only feeds `defaultManifest`, and
        `gate init` scaffolds an EMPTY manifest); a lifecycle fixture must drive
        `runChain` and assert a failing command STOPS the run, or it proves nothing.

---

## Verification Ledger

| Gate               | Command / Check                                                   | Scope | Result  | Evidence | Notes |
| ------------------ | ----------------------------------------------------------------- | ----- | ------- | -------- | ----- |
| FR-1               | `pnpm --filter provegate test test/single-package.test.ts`       | pkg   | passed  | 3 tests, real repo | no-ff merge, no remote |
| FR-2               | `pnpm --filter provegate test test/single-package.test.ts`       | pkg   | passed  | workflow-tree only, additive | |
| FR-3               | `grep -c "commands" packages/provegate/QUICKSTART.md`            | pkg   | passed  | 6 | recipe + non-pnpm form |
| FR-4               | `grep -ci "single-package" apps/docs/content/docs/quickstart.mdx` | docs  | passed  | 1 | section present |
| FR-5               | `pnpm --filter provegate test test/single-package.test.ts`       | pkg   | passed  | no-op — no assumption | audit held |
| types              | `pnpm check-types`                                                | root  | passed  | 0 errors | |
| lint               | `pnpm lint`                                                       | root  | passed  | 0 warnings | |
| test               | `pnpm test`                                                       | root  | passed  | all green (+3 fixture) | |
| build              | `pnpm build`                                                      | root  | passed  | all tasks | |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-015`              | repo  | passed  | readiness lint ok | |
| never-push         | `node packages/provegate/dist/cli.js push; test $? -eq 1`        | repo  | passed  | exit 1 | |
| independent-review | `_docs/reviews/review-015-single-package-support.md`             | repo  | passed  | verdict pass, critical 0 | codex 3 rounds |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

- **Owner decisions (2026-07-24, PRD §9):** (Q1) v1 supports single-package
  additively; (Q2) no repo-shape auto-detect — config-explicit, one recipe;
  (Q3) recipe shows the tool-agnostic `commands` block + one non-pnpm example,
  full Bun/Deno matrix deferred to PRD-017.
- **Surface note (Phase-6 Medium):** this PRD's own lifecycle ledgers
  (`_prds/`, `_readiness/`, `_tasks/`) and its `_docs/reviews/` review are workflow
  bookkeeping, edited by every PRD — not exclusive implementation surface. The PRD
  Conflict Surface note was updated to say so explicitly, so these edits are not an
  undeclared out-of-surface exception.
- **FR-5 is evidence-scoped:** the audit found no hardcoded monorepo assumption
  (init scaffolds workflow-tree only; `commands` is string-config; wiring handles
  both shapes; "workspace" = repo root), so FR-5 is expected to be a no-op — but
  the FR-1 fixture is the authority; fix only what it breaks on.

---

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
| 2026-07-24 | 1.0-5.0 | Phase 4 in worktree `.worktrees/prd-015-single-package-support`. Fixture (`single-package.test.ts`, 3 tests) drives a real single-package temp repo through init + a non-ff local merge with NON-pnpm commands; init proven layout-agnostic + additive; wiring accepts both command shapes. FR-5 no-op — no monorepo assumption surfaced. QUICKSTART + docs got matching "Single-package repos" sections. |
| 2026-07-24 | 6.0 | Phase 5 floor green: check-types, lint, test (+3 fixture), build, gate check ok, never-push exit 1. Phase 6 (independent review) pending. |
| 2026-07-24 | 7.0 | Phase 6 codex R1 FAIL: the fixture proved nothing — it drove `initWorkspace`/`mergeToLocalBase` but never `runChain`, so the four configured floor commands never executed (all tests passed even at exit 1). Also 2 High (docs recipe left the manifest empty; direct `tsc`/`eslint` refused by the safety allowlist) + 1 Medium (out-of-surface ledger edit). Fixed `10747a8`: fixture drives `buildGateChain`+`runChain` (floor executes; a failure stops phase 4); recipe wires `gates.manifest.json` + uses npm/npx; surface note updated. R2 FAIL: residual Critical (positive test asserted only the FIRST floor command) + High (invalid `//` in a JSON block). Fixed `ad3c959`: assert all four floor commands + phase-4-no-stop; drop the JSON comment. R3 **PASS** — Critical 0, High 0, Medium 0; all four mutations break the positive test. |
| 2026-07-24 | 8.0 | Phase 7: durable artifact confirmed; learning ingested (floor = manifest phase 4, not config.commands; init writes an empty manifest; a real lifecycle fixture must assert a failing command STOPS the run). Closing via `gate land` (autonomous-close eligible — no operator rows). |

---

## Blockers / Open Questions

- (none)

---

## Operator Handoff

> Autonomous Close is **eligible** — every verification is machine-checkable, so
> this PRD has NO operator-owned rows.

- (none)
