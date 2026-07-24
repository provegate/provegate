# Tasks: Practices Pack (`gate init --practices`)

> **PRD**: [prd-016-practices-pack.md](../../_prds/wip/prd-016-practices-pack.md)
> **Readiness**: [readiness-016-practices-pack.md](../../_readiness/wip/readiness-016-practices-pack.md)
> **Status**: Not Started
> **Readiness Score**: 8.15/10
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
- Autonomous Close is **operator-gated**: the merge gate refuses until an
  owner-signed acceptance entry exists (shipping method content warrants explicit
  owner sign-off at close).

---

## Relevant Files

- `packages/provegate/practices/**` — the shipped pack content (new)
- `packages/provegate/src/core/run/init.ts` — `planInit`/`initWorkspace` practices section
- `packages/provegate/src/cli.ts` — `runInit` flag parsing + next-steps print
- `packages/provegate/test/practices-pack.test.ts` — lifecycle fixture (new)
- `packages/provegate/QUICKSTART.md` — flag documentation
- `packages/provegate/package.json` — `files` array

---

## Tasks

- [ ] 1.0 FR-1 — `practices/` shipped content (W1, W5)
  - [ ] 1.1 Build the genericization map first (Phase-3 gap named by readiness):
        for each source file in this repo's live layer, the pack destination and
        every repo-specific fact to replace (placeholder or TODO marker). Sources:
        `_brain/PROTOCOL.md`, `_brain/INDEX.md` skeleton, `_brain/_templates/*`,
        the 21 workflow seeds, shim snippets, `AGENT_BOOTSTRAP.md` skeleton,
        `STATUS.md` skeleton, `commitlint.config.mjs`, `.githooks/*`,
        `scripts/base-branch-guard.mjs`, `scripts/secret-scan.mjs`,
        `scripts/verify/**`, `_state/known-red-verifies.json`, retros README.
  - [ ] 1.2 Materialize `packages/provegate/practices/{brain,shims,templates,hooks,scripts,verify}/`
        + `NEXT_STEPS.md` per the map. All 21 seeds verbatim (`scope: workflow`,
        `provenance: workflow-seed`). Zero repo-of-origin facts (W1). Node-stdlib
        only (W5).
  - [ ] 1.3 Add `practices` to `packages/provegate/package.json` `files`.

- [ ] 2.0 FR-2 — init flag + plan extension (W4)
  - [ ] 2.1 `planInit` gains a practices section (pack file → repo destination),
        active only under the flag; `initWorkspace` reuses `wx` + `containedPath`
        unchanged; hook files written with exec mode.
  - [ ] 2.2 `runInit` parses `--practices`; composes with `--dry-run`.
  - [ ] 2.3 Bare `gate init` plan byte-identical to today (fixture-asserted, W4).

- [ ] 3.0 FR-3/FR-4 — destinations + no-mutation contract (W3)
  - [ ] 3.1 Destinations land per PRD FR-3 list; existing files skip-and-report.
  - [ ] 3.2 No `git config`, no dependency install, no edits to an existing
        `package.json`; close of run prints NEXT_STEPS (hooksPath, package.json
        verify:* snippet, shim paste).

- [ ] 4.0 FR-5 — lifecycle fixture (W2, W3, W4)
  - [ ] 4.1 `practices-pack.test.ts` drives a REAL temp git repo: fresh
        `--practices` install → all files exist, hooks executable, and
        `node scripts/verify/verify-workflow.mjs` exits 0 in the fixture repo.
  - [ ] 4.2 Re-run → every practices path reported skipped; file contents
        byte-unchanged. `--dry-run` → zero writes.
  - [ ] 4.3 Hygiene assertions: no source-project names, no Turkish, no
        `git push` in any packed script; existing-`CLAUDE.md` case untouched.

- [ ] 5.0 FR-6 — QUICKSTART section
  - [ ] 5.1 Document the flag: what installs, the never-overwrite guarantee, the
        deliberately-manual wiring steps.

- [ ] 6.0 Phase 5 — Testing
  - [ ] 6.1 Every §11 command run; evidence in the ledger.
  - [ ] 6.2 Floor: check-types, lint, test, build, gate check, never-push.

- [ ] 7.0 Phase 6 — Final Auditing
  - [ ] 7.1 Independent adversarial review (cross-model), primary lens = W1
        content genericization → `_docs/reviews/review-016-practices-pack.md`.

- [ ] 8.0 Phase 7 — Learning
  - [ ] 8.1 Durable artifacts in the merge diff (review artifact; `_brain`
        learning or explicit `none`).
  - [ ] 8.2 Run the `_brain` capture protocol.

---

## Verification Ledger

| Gate               | Command / Check                                                     | Scope | Result  | Evidence | Notes |
| ------------------ | ------------------------------------------------------------------- | ----- | ------- | -------- | ----- |
| FR-1               | `test -d packages/provegate/practices/brain`                         | pkg   | pending |          |       |
| FR-1               | `pnpm --filter provegate test test/practices-pack.test.ts`           | pkg   | pending |          | 21 seeds + hygiene |
| FR-2               | `pnpm --filter provegate test test/practices-pack.test.ts`           | pkg   | pending |          | flag, dry-run, wx |
| FR-3               | `pnpm --filter provegate test test/practices-pack.test.ts`           | pkg   | pending |          | destinations, exec hooks |
| FR-4               | `pnpm --filter provegate test test/practices-pack.test.ts`           | pkg   | pending |          | no-mutation contract |
| FR-5               | `pnpm --filter provegate test test/practices-pack.test.ts`           | pkg   | pending |          | the fixture itself |
| FR-6               | `grep -c "init --practices" packages/provegate/QUICKSTART.md`        | docs  | pending |          |       |
| hygiene            | `grep -ri -l -e emofy -e rayvaz packages/provegate/practices && exit 1 \|\| true` | pkg | pending | | no source-project names |
| types              | `pnpm check-types`                                                   | root  | pending |          |       |
| lint               | `pnpm lint`                                                          | root  | pending |          |       |
| test               | `pnpm test`                                                          | root  | pending |          |       |
| build              | `pnpm build`                                                         | root  | pending |          |       |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-016`                  | repo  | pending |          |       |
| never-push         | `node packages/provegate/dist/cli.js push; test $? -eq 1`            | repo  | pending |          |       |
| independent-review | `_docs/reviews/review-016-practices-pack.md`                         | repo  | pending |          | W1 = primary lens |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

- **Owner decisions (2026-07-24, PRD §9):** (Q1) `gate init --practices` flag;
  (Q2) all 21 workflow seeds ship; (Q3) commitlint config written only when
  absent (`wx` skip), differently-named configs reconciled via NEXT_STEPS.
- **Deferred (readiness §3):** pack-vs-repo drift check (a future `verify:*` or
  sync script) — v1 accepts the risk, recorded here so it cannot silently become
  "never".
- **Surface note:** this PRD's own lifecycle ledgers (`_prds/`, `_readiness/`,
  `_tasks/`) and its review artifact are workflow bookkeeping edited by every
  PRD — not exclusive implementation surface.

---

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |

---

## Blockers / Open Questions

- (none)

---

## Operator Handoff

> Autonomous Close is **operator-gated** — the rows below need a human; the merge
> gate refuses until an owner-signed acceptance entry exists.

- [ ] 9.0 Operator acceptance of autonomous close: owner reviews the Phase-6
      verdict + the packed content (method-content sign-off) and records the
      acceptance entry in `_state/acceptances.json`.
