# Tasks: Release Readiness — Version, License, Pack Audit

> **PRD**: [prd-005-release-readiness.md](../../_prds/wip/prd-005-release-readiness.md)
> **Readiness**: [readiness-005-release-readiness.md](../../_readiness/wip/readiness-005-release-readiness.md)
> **Status**: Not Started
> **Readiness Score**: 8.7/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-23

## Task Outcome Rules

- `[x]` = completed as written; operator-owned stays unchecked; decisions →
  **Deferrals & Decisions**; operator work → **Operator Handoff**.

## Technical Standards Reference

- Frozen surfaces: `.github/workflows/**`, `packages/provegate/src/**` — zero diff.
- No local publish ever; `changeset version` only.
- W1 (owner-decided 2026-07-23): copyright line = `ProveGate contributors` — root
  LICENSE updated, package copy byte-identical.
- W2: version scan matches version-shaped patterns only (`provegate@\d`, `"version"`),
  never bare decimals.
- W3: after `changeset version`, diff scope = provegate package files + consumed
  changeset only.

## Relevant Files

- `LICENSE` (root — copyright line) + `packages/provegate/LICENSE` (new copy)
- `.changeset/<name>.md` (new, consumed by version)
- `packages/provegate/package.json` (version), `packages/provegate/CHANGELOG.md` (generated)
- `packages/provegate/test/pack.test.ts` (new)
- `packages/provegate/test/content-launch.test.ts` (RELEASING.md into lint set)
- `RELEASING.md` (new)

## Tasks

- [ ] 1.0 Pre-flight
  - [ ] 1.1 Branch `feat/prd-005-release-readiness`; lease; baseline gates green
- [ ] 2.0 License (FR-1, W1)
  - [ ] 2.1 Root `LICENSE` copyright line → `ProveGate contributors` (owner decision
        2026-07-23); copy into `packages/provegate/LICENSE`
  - [ ] 2.2 Pack test asserts byte-identity root↔package (anti-drift)
- [ ] 3.0 Version 0.1.0 (FR-2, W3)
  - [ ] 3.1 Author minor changeset (0.1.0 surface: engine, runner, method package,
        launch surface); run `pnpm changeset version`
  - [ ] 3.2 Assert diff scope: only `packages/provegate/{package.json,CHANGELOG.md}`
        changed + changeset consumed; private apps untouched (W3)
- [ ] 4.0 Pack audit (FR-3, FR-4, W2, W4)
  - [ ] 4.1 `test/pack.test.ts`: `npm pack --dry-run --json` via execFile —
        required files (LICENSE, README, METHOD, QUICKSTART, dist/cli.js,
        dist/index.js, ≥1 per prompts/templates/schemas/examples), whitelist-roots
        (unexpected path named in failure), dist hygiene grep (no emofy/rayvaz),
        clear failure if npm missing (W4)
  - [ ] 4.2 Version single-sourcing: `--version` output === package.json; shipped docs
        contain no `provegate@x.y.z` / version-shaped pins (W2 precision)
- [ ] 5.0 RELEASING.md (FR-5)
  - [ ] 5.1 Owner procedure: changeset → version → review commit → push (owner) →
        workflow_dispatch → provenance; explicit "no CI path publishes automatically"
  - [ ] 5.2 Add to content-launch self-copy lint set
- [ ] 6.0 Phase 5 — Testing: §11 sweep, evidence in ledger
- [ ] 7.0 Phase 6 — codex review (brief: whitelist gaps, monorepo bleed, frozen-surface
        diff check, license identity)
- [ ] 8.0 Phase 7 — summary; owner acceptance; close via `gate run PRD-005`

## Verification Ledger

| Gate | Command / Check                                                     | Scope     | Result  | Evidence | Notes                    |
| ---- | ------------------------------------------------------------------- | --------- | ------- | -------- | ------------------------ |
| FR-1 | `test -f packages/provegate/LICENSE`                                | provegate | pending |          | byte-identity in FR-3    |
| FR-2 | `grep -c "\"version\": \"0.1.0\"" packages/provegate/package.json`  | provegate | pending |          |                          |
| FR-3 | `pnpm --filter provegate test test/pack.test.ts`                    | provegate | pending |          | whitelist + hygiene      |
| FR-4 | `pnpm --filter provegate test test/pack.test.ts`                    | provegate | pending |          | version single-sourcing  |
| FR-5 | `test -f RELEASING.md`                                              | repo      | pending |          | linted self-copy         |

## Deferrals & Decisions

- W1 resolved by owner 2026-07-23: `ProveGate contributors`.

## Operator Handoff

| Task | Category  | Owner | Required Check                                       | Status  | Notes               |
| ---- | --------- | ----- | ---------------------------------------------------- | ------- | ------------------- |
| 7.0  | external  | owner | Authorize codex review session                       | pending | per precedent       |
| 8.0  | manual-qa | owner | Acceptance; trigger `gate run PRD-005`; push (human) | pending | runner never pushes |

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

## Blockers / Open Questions

- (none)
