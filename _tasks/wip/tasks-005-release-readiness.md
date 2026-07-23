# Tasks: Release Readiness — Version, License, Pack Audit

> **PRD**: [prd-005-release-readiness.md](../../_prds/wip/prd-005-release-readiness.md)
> **Readiness**: [readiness-005-release-readiness.md](../../_readiness/wip/readiness-005-release-readiness.md)
> **Status**: Phase 5 Complete — Testing Verified
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

- [x] 1.0 Pre-flight
  - [x] 1.1 Branch `feat/prd-005-release-readiness`; lease; baseline gates green
- [x] 2.0 License (FR-1, W1)
  - [x] 2.1 Root `LICENSE` copyright line → `ProveGate contributors` (owner decision
        2026-07-23); copy into `packages/provegate/LICENSE`
  - [x] 2.2 Pack test asserts byte-identity root↔package (anti-drift)
- [x] 3.0 Version 0.1.0 (FR-2, W3)
  - [x] 3.1 Author minor changeset (0.1.0 surface: engine, runner, method package,
        launch surface); run `pnpm changeset version`
  - [x] 3.2 Assert diff scope: only `packages/provegate/{package.json,CHANGELOG.md}`
        changed + changeset consumed; private apps untouched (W3)
- [x] 4.0 Pack audit (FR-3, FR-4, W2, W4)
  - [x] 4.1 `test/pack.test.ts`: `npm pack --dry-run --json` via execFile —
        required files (LICENSE, README, METHOD, QUICKSTART, dist/cli.js,
        dist/index.js, ≥1 per prompts/templates/schemas/examples), whitelist-roots
        (unexpected path named in failure), dist hygiene grep (no emofy/rayvaz),
        clear failure if npm missing (W4)
  - [x] 4.2 Version single-sourcing: `--version` output === package.json; shipped docs
        contain no `provegate@x.y.z` / version-shaped pins (W2 precision)
- [x] 5.0 RELEASING.md (FR-5)
  - [x] 5.1 Owner procedure: changeset → version → review commit → push (owner) →
        workflow_dispatch → provenance; explicit "no CI path publishes automatically"
  - [x] 5.2 Add to content-launch self-copy lint set
- [x] 6.0 Phase 5 — Testing: §11 sweep, evidence in ledger
- [ ] 7.0 Phase 6 — codex review (brief: whitelist gaps, monorepo bleed, frozen-surface
        diff check, license identity)
- [ ] 8.0 Phase 7 — summary; owner acceptance; close via `gate run PRD-005`

## Verification Ledger

| Gate | Command / Check                                                     | Scope     | Result  | Evidence | Notes                    |
| ---- | ------------------------------------------------------------------- | --------- | ------- | -------- | ------------------------ |
| FR-1 | `test -f packages/provegate/LICENSE`                                | provegate | passed | exists + byte-identity | byte-identity in FR-3   |
| FR-2 | `grep -c "\"version\": \"0.1.0\"" packages/provegate/package.json`  | provegate | passed | 1                      |                         |
| FR-3 | `pnpm --filter provegate test test/pack.test.ts`                    | provegate | passed | 6/6 in pack suite      | whitelist + hygiene     |
| FR-4 | `pnpm --filter provegate test test/pack.test.ts`                    | provegate | passed | 6/6 in pack suite      | version single-sourcing |
| FR-5 | `test -f RELEASING.md`                                              | repo      | passed | exists, linted         | linted self-copy        |

## Deferrals & Decisions

- W1 resolved by owner 2026-07-23: `ProveGate contributors` (root + package, byte-identity tested).
- CHANGELOG.md added to package.json `files` — npm does NOT auto-include changelogs
  (only README/LICENSE/package.json); found by the pack test's required-files assertion.
- W3 verified: `changeset version` touched only provegate package.json + CHANGELOG; changeset consumed.

## Operator Handoff

| Task | Category  | Owner | Required Check                                       | Status  | Notes               |
| ---- | --------- | ----- | ---------------------------------------------------- | ------- | ------------------- |
| 7.0  | external  | owner | Authorize codex review session                       | pending | per precedent       |
| 8.0  | manual-qa | owner | Acceptance; trigger `gate run PRD-005`; push (human) | pending | runner never pushes |

## Progress Log

| Date       | Task    | Notes                                                                    |
| ---------- | ------- | ------------------------------------------------------------------------ |
| 2026-07-23 | 2.0–5.0 | License (ProveGate contributors), 0.1.0 via changesets, pack audit, RELEASING.md |
| 2026-07-23 | 6.0     | §11 sweep green: 337 tests, src+workflows zero-diff vs main, hygiene clean |

## Blockers / Open Questions

- (none)
