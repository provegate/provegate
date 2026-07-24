# Tasks: Practices Pack (`gate init --practices`)

> **PRD**: [prd-016-practices-pack.md](../../_prds/wip/prd-016-practices-pack.md)
> **Readiness**: [readiness-016-practices-pack.md](../../_readiness/wip/readiness-016-practices-pack.md)
> **Status**: Operator Verification
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

- [x] 1.0 FR-1 — `practices/` shipped content (W1, W5)
  - [x] 1.1 Build the genericization map first (Phase-3 gap named by readiness):
        for each source file in this repo's live layer, the pack destination and
        every repo-specific fact to replace (placeholder or TODO marker). Sources:
        `_brain/PROTOCOL.md`, `_brain/INDEX.md` skeleton, `_brain/_templates/*`,
        the 21 workflow seeds, shim snippets, `AGENT_BOOTSTRAP.md` skeleton,
        `STATUS.md` skeleton, `commitlint.config.mjs`, `.githooks/*`,
        `scripts/base-branch-guard.mjs`, `scripts/secret-scan.mjs`,
        `scripts/verify/**`, `_state/known-red-verifies.json`, retros README.
  - [x] 1.2 Materialize `packages/provegate/practices/{brain,shims,templates,hooks,scripts,verify}/`
        + `NEXT_STEPS.md` per the map. All 21 seeds verbatim (`scope: workflow`,
        `provenance: workflow-seed`). Zero repo-of-origin facts (W1). Node-stdlib
        only (W5).
  - [x] 1.3 Add `practices` to `packages/provegate/package.json` `files`.

- [x] 2.0 FR-2 — init flag + plan extension (W4)
  - [x] 2.1 `planInit` gains a practices section (pack file → repo destination),
        active only under the flag; `initWorkspace` reuses `wx` + `containedPath`
        unchanged; hook files written with exec mode.
  - [x] 2.2 `runInit` parses `--practices`; composes with `--dry-run`.
  - [x] 2.3 Bare `gate init` plan byte-identical to today (fixture-asserted, W4).

- [x] 3.0 FR-3/FR-4 — destinations + no-mutation contract (W3)
  - [x] 3.1 Destinations land per PRD FR-3 list; existing files skip-and-report.
  - [x] 3.2 No `git config`, no dependency install, no edits to an existing
        `package.json`; close of run prints NEXT_STEPS (hooksPath, package.json
        verify:* snippet, shim paste).

- [x] 4.0 FR-5 — lifecycle fixture (W2, W3, W4)
  - [x] 4.1 `practices-pack.test.ts` drives a REAL temp git repo: fresh
        `--practices` install → all files exist, hooks executable, and
        `node scripts/verify/verify-workflow.mjs` exits 0 in the fixture repo.
  - [x] 4.2 Re-run → every practices path reported skipped; file contents
        byte-unchanged. `--dry-run` → zero writes.
  - [x] 4.3 Hygiene assertions: no source-project names, no Turkish, no
        `git push` in any packed script; existing-`CLAUDE.md` case untouched.

- [x] 5.0 FR-6 — QUICKSTART section
  - [x] 5.1 Document the flag: what installs, the never-overwrite guarantee, the
        deliberately-manual wiring steps.

- [x] 6.0 Phase 5 — Testing
  - [x] 6.1 Every §11 command run; evidence in the ledger.
  - [x] 6.2 Floor: check-types, lint, test, build, gate check, never-push.

- [x] 7.0 Phase 6 — Final Auditing
  - [x] 7.1 Independent adversarial review (cross-model), primary lens = W1
        content genericization → `_docs/reviews/review-016-practices-pack.md`.

- [x] 8.0 Phase 7 — Learning
  - [x] 8.1 Durable artifacts in the merge diff (review artifact; `_brain`
        learning or explicit `none`).
  - [x] 8.2 Run the `_brain` capture protocol.

---

## Verification Ledger

| Gate               | Command / Check                                                     | Scope | Result  | Evidence | Notes |
| ------------------ | ------------------------------------------------------------------- | ----- | ------- | -------- | ----- |
| FR-1               | `test -d packages/provegate/practices/brain`                         | pkg   | passed  | practices/brain ships | |
| FR-1               | `pnpm --filter provegate test test/practices-pack.test.ts`           | pkg   | passed  | 8 tests, real temp repos | 21 seeds + hygiene asserted |
| FR-2               | `pnpm --filter provegate test test/practices-pack.test.ts`           | pkg   | passed  | idempotent re-run, dry-run zero writes | bare-init parity too |
| FR-3               | `pnpm --filter provegate test test/practices-pack.test.ts`           | pkg   | passed  | exec bits at write time | wx skip proven |
| FR-4               | `pnpm --filter provegate test test/practices-pack.test.ts`           | pkg   | passed  | git config + package.json byte-identical | NEXT_STEPS printed |
| FR-5               | `pnpm --filter provegate test test/practices-pack.test.ts`           | pkg   | passed  | 8/8; mutation smoke: broken pack INDEX turns fixture red | |
| FR-6               | `grep -c "init --practices" packages/provegate/QUICKSTART.md`        | docs  | passed  | 1 | |
| hygiene            | `grep -ri -l -e emofy -e rayvaz packages/provegate/practices && exit 1 \|\| true` | pkg | passed  | clean | also fixture-asserted (Turkish chars, push paths) |
| types              | `pnpm check-types`                                                   | root  | passed  | 0 errors | |
| lint               | `pnpm lint`                                                          | root  | passed  | 0 warnings | |
| test               | `pnpm test`                                                          | root  | passed  | 7/7 tasks (+8 fixture, +9 pack) | |
| build              | `pnpm build`                                                         | root  | passed  | clean build | |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-016`                  | repo  | passed  | readiness lint ok | |
| never-push         | `node packages/provegate/dist/cli.js push; test $? -eq 1`            | repo  | passed  | exit 1 — "No. Push is yours." | |
| independent-review | `_docs/reviews/review-016-practices-pack.md`                         | repo  | passed  | verdict pass, critical 0 | codex 3 rounds, W1 lens |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

- **Owner decisions (2026-07-24, PRD §9):** (Q1) `gate init --practices` flag;
  (Q2) all 21 workflow seeds ship; (Q3) commitlint config written only when
  absent (`wx` skip), differently-named configs reconciled via NEXT_STEPS.
- **Deferred (readiness §3):** pack-vs-repo drift check (a future `verify:*` or
  sync script) — v1 accepts the risk, recorded here so it cannot silently become
  "never".
- **Found during Phase 5 (out of surface, deferred):** the CLI's own
  `gate check --wiring` flags the repo's five wave-2 verify scripts as wired nowhere —
  they run only inside the verify-workflow bundle, which the audit doesn't count as a
  surface. Pre-existing on main (identical output both checkouts), not introduced here;
  recorded on the STATUS board as a deferral at close.
- **Surface decision (recorded per §12):** `packages/provegate/src/core/run/index.ts`
  gained two barrel-export lines (planPractices, practicesPackDir) — the mechanical
  consequence of exporting the new init functions through the existing core barrel.
  Additive-only; not in the declared Conflict Surface; recorded here as the decision.
- **Surface note:** this PRD's own lifecycle ledgers (`_prds/`, `_readiness/`,
  `_tasks/`) and its review artifact are workflow bookkeeping edited by every
  PRD — not exclusive implementation surface.

---

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
| 2026-07-24 | 1.0-5.0 | Phase 4 in worktree `.worktrees/prd-016-practices-pack`. Pack built from the live layer via a per-file genericization pass (W1); `gate init --practices` extends init through planPractices + wx/containedPath; fixture drives real temp repos (fresh green bundle, idempotent re-run, dry-run, no-mutation, bare-init golden). 53 pack files consciously added to the pack manifest. |
| 2026-07-24 | 6.0 | Phase 5 floor green: fixture 8/8 (then 9/9), check-types, lint, test 7/7, build, gate check ok, never-push exit 1. `gate check --wiring` red is pre-existing on main (five wave-2 verify scripts wired only via the bundle) — deferred to the STATUS board, out of this PRD's surface. |
| 2026-07-24 | 7.0 | Phase 6 codex R1 FAIL (4 critical: origin terminology + narrow hygiene test; secret-scan shell injection via staged filename; guard missed deletions/rename sources; weak bare-init parity — plus 2 advisory). Fixed `d210348`. R2 FAIL (2 critical: `0:leak.txt` stage-syntax scan bypass; parsed-not-byte golden — plus advisory: no behavioral security tests). Fixed `e003a1b` (pathspec `:./` form, byte-literal goldens, adversarial-staging fixture vs INSTALLED scripts; mutation-checked). R3 **PASS** — Critical 0, no new findings. |
| 2026-07-24 | 7.0b | Late-arriving parallel Sonnet verdicts: sonnet-A pass (4 medium), sonnet-B FAIL (1 critical: practice-NN/pattern-PN taxonomy leak in ~10 packed comments — W1 class both codex rounds missed). Fixed `1cbdb6a`: taxonomy stripped to self-contained descriptions, hygiene test bans the class, verify/ install moved into the explicit PACK_MAP, index.ts surface decision recorded. Codex R4 delta confirmation: pass, no new findings. |
| 2026-07-24 | 8.0 | Phase 7: review artifact committed; Durable Artifacts learning resolved to `none` (every insight from this PRD is now encoded in code comments + regression tests — derivable, so `_brain` correctly rejects it). Awaiting operator acceptance (9.0) before `gate land`. |

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
