# Tasks: Launch Surface — Init, Quickstart, Case Study, Whitepaper

> **PRD**: [prd-004-launch-quickstart.md](../../_prds/wip/prd-004-launch-quickstart.md)
> **Readiness**: [readiness-004-launch-quickstart.md](../../_readiness/wip/readiness-004-launch-quickstart.md)
> **Status**: Phase 6 Complete — Review Passed
> **Readiness Score**: 8.7/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-22

## Task Outcome Rules

- `[x]` = completed as written; operator-owned stays unchecked; decisions →
  **Deferrals & Decisions**; operator work → **Operator Handoff**.

## Technical Standards Reference

- Engine: TS strict, no `any`, zero deps, execFile arrays for git, no push paths.
- Quorum: integer math `N * 5 >= M * 3` (W3); doctrine ratio ≥ 3/5; no retro-edits of
  historical review artifacts (§12).
- Init: additive-only, idempotent, roots at nearest `.git` else cwd (W1).
- Launch copy: positioning §1/§2 source; do-not-say §6 mechanical (W2 page classes);
  every evidence figure traces to the whitepaper/calibration source docs.

## Relevant Files

- `packages/provegate/src/core/gates/review.ts` — quorum arithmetic (modify)
- `packages/provegate/src/core/gates/wiring.ts` — package.json-absent skip (modify)
- `packages/provegate/src/core/run/init.ts` — scaffolder (new)
- `packages/provegate/src/cli.ts` — init wiring (modify)
- `packages/provegate/schemas/review-metadata.schema.json` — description update
- `packages/provegate/QUICKSTART.md` (new) + `packages/provegate/package.json` (files)
- `packages/provegate/test/{review-quorum,init,content-launch}.test.ts` (new)
- `apps/docs/content/docs/{quickstart,case-study,whitepaper}.mdx` (new), `{index.mdx,meta.json}` (modify)
- `apps/web/app/page.tsx`, root `README.md`, `packages/provegate/README.md` (modify)
- `_docs/launch/announcement-draft.md` (new)
- `_tasks/completed/tasks-003-method-package.md` — deferral row closed
- `_state/locks/prd-004-launch-quickstart.json` — lease (local)

## Tasks

- [ ] 1.0 Pre-flight
  - [ ] 1.1 Branch `feat/prd-004-launch-quickstart`; lease (Conflict Surface globs);
        baseline gates green
- [x] 2.0 Quorum arithmetic (FR-1, W3)
  - [x] 2.1 `review.ts`: parse `Quorum` strictly (`^(\d+)/(\d+) pass$` post-strip;
        N ≤ M, M ≥ 1 → else issue); `pass` verdict requires `N * 5 >= M * 3`
  - [x] 2.2 Schema description: arithmetic now enforced; close the PRD-003 deferral
        row (pointer to this PRD)
  - [x] 2.3 Tests `test/review-quorum.test.ts`: 3/5 ✓, 2/5 ✗, 1/1 ✓, 5/5 ✓, 2/3 ✓
        (10≥9), 1/2 ✗ (5<6), 0/5 ✗, malformed (`5/3`, `0/0`, `x/y`, missing "pass") →
        issues; fail-verdict artifacts unaffected by ratio; PRD-001..003 historical
        artifact fixtures still validate
- [x] 3.0 `gate init` (FR-2, W1)
  - [x] 3.1 `src/core/run/init.ts`: `initWorkspace(config, root, {dryRun})` — plan +
        execute: artifact dirs × states (`.gitkeep`), state dir, locks dir, starter
        `workflow.config.json` (branches.base + idPattern from defaults), starter
        `gates.manifest.json` (`{}`); per-path created/skipped report; additive-only
  - [x] 3.2 `cli.ts`: `init [--dry-run]` — roots at nearest `.git` up from cwd else
        cwd (no config required); prints report + quickstart pointer; replaces stub
  - [x] 3.3 `wiring.ts`: skip script-existence direction when `package.json` absent;
        comment documents the no-evasion reasoning (execution gate still fails loud)
  - [ ] 3.4 Tests `test/init.test.ts`: full tree shape; idempotent second run (all
        skipped, zero mutations — mtime/content unchanged); `--dry-run` writes
        nothing; scaffolded repo passes `buildState` + `auditWiring` (W1) + starter
        config passes `validateConfig`/`validateResolvedConfig`; non-git dir roots
        at cwd
- [x] 4.0 Quickstart (FR-3, W4)
  - [x] 4.1 `QUICKSTART.md`: hotfix-class walkthrough — install, `gate init`, copy
        `templates/prd-template.md`, fill hotfix skeleton, `gate check`, manual
        phases 2–3, phases 4–7 via prompts, `gate run` close, handoff-card ending;
        every command real and copy-pasteable
  - [x] 4.2 `package.json` files += QUICKSTART.md; package README links it
  - [x] 4.3 `apps/docs/content/docs/quickstart.mdx` — same walkthrough, docs-shaped
- [x] 5.0 Evidence pages (FR-4, FR-5)
  - [x] 5.1 `case-study.mdx`: ~390 items; 143-finding calibration (r = −0.03 decimal
        score), binary + hard-caps redesign; 0 vs 2 critical post-ship; cross-model
        catches; observational/single-project caveats inline per figure
  - [x] 5.2 `whitepaper.mdx`: adapt the draft — parent anonymized ("a production SaaS
        platform"), numbers cross-checked with 5.1, citations kept
- [x] 6.0 README, landing, announcement (FR-6, FR-7)
  - [x] 6.1 Root `README.md`: meta-story section (read `_prds/completed/`), quickstart
        snippet, evidence links, positioning one-liners
  - [x] 6.2 `apps/web/app/page.tsx`: elevator pitch, quickstart snippet, docs links
  - [x] 6.3 `_docs/launch/announcement-draft.md`: HN-style draft (80-agents/one-test
        provocation + meta-story + links); marked owner-edit-before-posting
- [x] 7.0 Launch verification suite (FR-8, FR-9, W2, W4)
  - [x] 7.1 `test/content-launch.test.ts`: do-not-say — strict set over self-copy
        pages (READMEs, landing source, QUICKSTART, announcement): "first ever"
        variants, percentage speedup/bug claims, badge-jargon labels; evidence pages
        (case-study, whitepaper): "first ever" + badge-jargon only + figure
        consistency between the two pages; deliberate-violation fixtures both ways (W2)
  - [x] 7.2 Quickstart command audit + **W4 execution**: every backticked `gate`
        command exists; the init sequence from QUICKSTART runs in a fixture repo and
        produces the promised tree
- [x] 8.0 Docs nav + packaging (FR-10)
  - [x] 8.1 `meta.json` order: index, quickstart, method, case-study, whitepaper, cli;
        index page links all
- [x] 9.0 Phase 5 — Testing: every §11 command, evidence in ledger
  - [x] 9.1 10 per-FR rows + cross-cutting (types/lint/test/build/check PRD-004/
        push-refusal/hygiene grep incl. QUICKSTART.md)
  - [x] 9.2 §12 re-read + audit (no overclaims, no competitor claims, init
        additive-only, no retro-edits)
- [x] 10.0 Phase 6 — Final Auditing
  - [x] 10.1 Codex review — brief: quorum arithmetic boundaries, init write-path
        safety, wiring-skip evasion, figure-to-source fidelity, do-not-say
        completeness; artifact in `_docs/reviews/` (validated by the NEW quorum gate)
  - [x] 10.2 Fix/waive; critical = 0; verification round
- [x] 11.0 Phase 7 — Learning + close
  - [x] 11.1 Summary artifact; PRD lifecycle walk
  - [ ] 11.2 Owner acceptance; close via `gate run PRD-004`; push stays owner's

## Verification Ledger

| Gate               | Command / Check                                                             | Scope     | Result  | Evidence | Notes                               |
| ------------------ | --------------------------------------------------------------------------- | --------- | ------- | -------- | ----------------------------------- |
| FR-1               | `pnpm --filter provegate test test/review-quorum.test.ts`                   | provegate | passed | 12/12 | W3 boundaries + historical fixtures |
| FR-2               | `pnpm --filter provegate test test/init.test.ts`                            | provegate | passed | 7/7 | W1 scaffold passes gates |
| FR-3               | `grep -c "gate init" packages/provegate/QUICKSTART.md`                      | provegate | passed | 2 |                                     |
| FR-4               | `grep -c "143" apps/docs/content/docs/case-study.mdx`                       | repo      | passed | 3 |                                     |
| FR-5               | `grep -c "production SaaS platform" apps/docs/content/docs/whitepaper.mdx`  | repo      | passed | 1 (0 emofy) |                                     |
| FR-6               | `grep -c "prove it, then let it propagate" README.md`                       | repo      | passed | 1 |                                     |
| FR-7               | `test -f _docs/launch/announcement-draft.md`                                | repo      | passed | exists |                                     |
| FR-8               | `pnpm --filter provegate test test/content-launch.test.ts`                  | provegate | passed | 16/16 | W2 page classes |
| FR-9               | `pnpm --filter provegate test test/init.test.ts test/review-quorum.test.ts` | provegate | passed | 19/19 |                                     |
| FR-10              | `grep -c "quickstart" apps/docs/content/docs/meta.json`                     | repo      | passed | 1 |                                     |
| types              | `pnpm check-types`                                                          | repo      | passed  | 3/3 tasks | zero errors |
| lint               | `pnpm lint`                                                                 | repo      | passed  | 3/3 tasks | zero warnings |
| full-suite         | `pnpm --filter provegate test`                                              | provegate | passed  | 302/302 (31 files) | prior suites unchanged |
| build              | `pnpm build`                                                                | repo      | passed  | 3/3 tasks | both apps clean |
| self-check         | `node packages/provegate/dist/cli.js check PRD-004`                         | provegate | passed  | exit 0 | PRD passes its own gate |
| push-refusal       | `node packages/provegate/dist/cli.js push`                                  | provegate | passed  | exit 1, "No. Push is yours." | |
| hygiene            | `grep -ri -l -e emofy -e rayvaz packages/provegate/src QUICKSTART.md`       | provegate | passed  | clean | |
| wiring             | `node packages/provegate/dist/cli.js check --wiring`                        | provegate | passed  | all wired/excepted | |
| types              | `pnpm check-types`                                                          | monorepo  | pending |          |                                     |
| lint               | `pnpm lint`                                                                 | monorepo  | pending |          |                                     |
| test               | `pnpm --filter provegate test`                                              | provegate | pending |          | prior suites intact                 |
| build              | `pnpm build`                                                                | monorepo  | pending |          | both apps too                       |
| prd-lint           | `node packages/provegate/dist/cli.js check PRD-004`                         | repo      | pending |          |                                     |
| push-refusal       | `node packages/provegate/dist/cli.js push; test $? -eq 1`                   | provegate | pending |          |                                     |
| hygiene-sh         | emofy/rayvaz grep over src + QUICKSTART (PRD §11)                           | provegate | pending |          |                                     |
| independent-review | codex adversarial review artifact                                           | repo      | pending |          | validated by the NEW quorum gate    |
| dogfood            | close via `gate run PRD-004`                                                | repo      | pending |          | operator-triggered                  |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

## Deferrals & Decisions

- 2.2 — PRD-003 deferral row CLOSED in `_tasks/completed/tasks-003-method-package.md`
  (due 2026-07-29, closed 2026-07-22, 0 renewals) — historical file gains a closure
  pointer only, no retro-edit of its content.
- 2.x — historical review artifacts carry annotated quorums ("1/1 pass (single
  cross-model reviewer…)"); the parser anchors `N/M pass` as a prefix (`\b` boundary),
  never retro-editing the artifacts (§12).
- 7.2 — command audit scopes to fenced/backticked code; prose "quality gate skeleton"
  is English, not a command (W3 precedent).
- 6.x — announcement Spec Kit line uses positioning §1 category framing only (no
  competitor internals, §12).

- 0.0 — Full plan in one pass; operator gates the complete document (repo convention).

## Progress Log

| Date       | Task    | Notes                                                                        |
| ---------- | ------- | ---------------------------------------------------------------------------- |
| 2026-07-22 | 2.0–8.0 | Quorum arithmetic + gate init + full launch surface on feat/prd-004; 35 new tests |
| 2026-07-22 | 2.2     | PRD-003 quorum deferral closed 7 days before due, 0 renewals                 |
| 2026-07-22 | 9.0     | §11 sweep: 10/10 FR rows + 8 cross-cutting green; 302 tests, 31 files        |
| 2026-07-22 | 10.0    | codex 4 rounds: 3 crit + 9 P2/P3 found+fixed → pass 0 findings; 330 tests    |
| 2026-07-22 | 11.1    | summary artifact written; review artifact validates under its own new gate    |

## Blockers / Open Questions

- (none)

## Operator Handoff

| Task | Category  | Owner | Required Check                                                    | Status  | Notes                        |
| ---- | --------- | ----- | ----------------------------------------------------------------- | ------- | ---------------------------- |
| 10.1 | external  | owner | Authorize codex review session                                    | pending | agent executes per precedent |
| 11.2 | manual-qa | owner | Acceptance entry; trigger `gate run PRD-004`; push (always human) | pending | runner never pushes          |
