# Tasks: Single-Package (Non-Monorepo) Support

> **PRD**: [prd-015-single-package-support.md](../../_prds/wip/prd-015-single-package-support.md)
> **Readiness**: [readiness-015-single-package-support.md](../../_readiness/wip/readiness-015-single-package-support.md)
> **Status**: Not Started
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

- [ ] 1.0 FR-1 — verify-first lifecycle fixture (W1, W3)
  - [ ] 1.1 `single-package.test.ts`: build a temp git repo with ONE `package.json`
        (no `pnpm-workspace.yaml`, no turbo), drive `gate init` → `gate new` →
        `gate open` → `gate check` → `gate run` with a trivial gates manifest;
        assert each exits clean and the local no-ff merge lands (no push). Drive a
        REAL repo, not a mock.
  - [ ] 1.2 Exercise a NON-pnpm `commands` mapping (e.g. `node`-based or direct
        `tsc`/`vitest`) in the fixture so tool-agnosticism is proven, not asserted.
  - [ ] 1.3 Record which monorepo assumptions (if any) surfaced — this scopes FR-5.

- [ ] 2.0 FR-2 — `gate init` is layout-agnostic
  - [ ] 2.1 Assert in the fixture that `gate init` scaffolds only the workflow tree
        (+ starter config + empty gates manifest), additively, with no
        `apps/`/`packages/`. `starterConfig` `commands` are editable placeholders,
        not pnpm/turbo/`--filter`-bound. Fix only if the assertion fails.

- [ ] 3.0 FR-3 — single-package `commands` recipe (durable)
  - [ ] 3.1 `QUICKSTART.md`: a `commands` block mapping
        `checkTypes/lint/test/build` to a repo's own scripts, WITH one non-pnpm
        example, and the "gate is repo-layout-agnostic" statement.

- [ ] 4.0 FR-4 — docs single-package section
  - [ ] 4.1 `apps/docs/content/docs/quickstart.mdx`: add a single-package section
        (point `commands` at your scripts; the workflow tree is the same).
        Content addition only; no restyle.

- [ ] 5.0 FR-5 — fix a surfaced monorepo assumption (W2, evidence-scoped)
  - [ ] 5.1 If FR-1 surfaced a real hardcoded `--filter`/turbo/apps-path, fix it
        config-over-hardcode, no new runtime dep. If none, record the no-op here.

- [ ] 6.0 Phase 5 — Testing
  - [ ] 6.1 Every §11 command run; evidence in the ledger.
  - [ ] 6.2 Floor: check-types, lint, test, build, gate check, never-push.

- [ ] 7.0 Phase 6 — Final Auditing
  - [ ] 7.1 Independent adversarial review → `_docs/reviews/review-015-single-package-support.md`.
        `Verdict: pass` requires `Critical: 0`. Attacks: the fixture is a REAL
        single-package repo (not a mock); additive-only (monorepo + default config
        untouched); `packages/provegate` zero-dep + no network; the recipe is
        actually runnable.

- [ ] 8.0 Phase 7 — Learning
  - [ ] 8.1 Confirm the durable artifact (`packages/provegate/QUICKSTART.md`) is in the diff.
  - [ ] 8.2 Knowledge ingest: gate is repo-layout-agnostic by design (workspace =
        repo root; `commands` string-config); what the fixture had to set up to
        prove single-package.

---

## Verification Ledger

| Gate               | Command / Check                                                   | Scope | Result  | Evidence | Notes |
| ------------------ | ----------------------------------------------------------------- | ----- | ------- | -------- | ----- |
| FR-1               | `pnpm --filter provegate test test/single-package.test.ts`       | pkg   | pending |          | full lifecycle, real repo |
| FR-2               | `pnpm --filter provegate test test/single-package.test.ts`       | pkg   | pending |          | init workflow-tree only |
| FR-3               | `grep -c "commands" packages/provegate/QUICKSTART.md`            | pkg   | pending |          | recipe present |
| FR-4               | `grep -ci "single-package" apps/docs/content/docs/quickstart.mdx` | docs  | pending |          | section present |
| FR-5               | `pnpm --filter provegate test test/single-package.test.ts`       | pkg   | pending |          | no residual assumption |
| types              | `pnpm check-types`                                                | root  | pending |          | |
| lint               | `pnpm lint`                                                       | root  | pending |          | |
| test               | `pnpm test`                                                       | root  | pending |          | |
| build              | `pnpm build`                                                      | root  | pending |          | |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-015`              | repo  | pending |          | |
| never-push         | `node packages/provegate/dist/cli.js push; test $? -eq 1`        | repo  | pending |          | |
| independent-review | `_docs/reviews/review-015-single-package-support.md`             | repo  | pending |          | Phase 6 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

- **Owner decisions (2026-07-24, PRD §9):** (Q1) v1 supports single-package
  additively; (Q2) no repo-shape auto-detect — config-explicit, one recipe;
  (Q3) recipe shows the tool-agnostic `commands` block + one non-pnpm example,
  full Bun/Deno matrix deferred to PRD-017.
- **FR-5 is evidence-scoped:** the audit found no hardcoded monorepo assumption
  (init scaffolds workflow-tree only; `commands` is string-config; wiring handles
  both shapes; "workspace" = repo root), so FR-5 is expected to be a no-op — but
  the FR-1 fixture is the authority; fix only what it breaks on.

---

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |

---

## Blockers / Open Questions

- (none)

---

## Operator Handoff

> Autonomous Close is **eligible** — every verification is machine-checkable, so
> this PRD has NO operator-owned rows.

- (none)
