# Tasks: The Cache Key Must See Everything the Tests Read

> **PRD**: [prd-036-frozen-snapshot-digest-gate.md](../../_prds/wip/prd-036-frozen-snapshot-digest-gate.md)
> **Readiness**: [readiness-036-frozen-snapshot-digest-gate.md](../../_readiness/wip/readiness-036-frozen-snapshot-digest-gate.md)
> **Status**: Code Complete
> **Readiness Score**: 8.18/10 (iteration 8, PASS — eight independent Codex rounds; TL settled at iteration 4; measure-first pivot at iteration 3)
> **Model Tier (Execution)**: high
> **Model Tier (Audit)**: high
> **PRD Class**: infra
> **Autonomous Close**: eligible
> **Created**: 2026-07-29

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Decisions in **Deferrals & Decisions**; the close is `eligible` — no operator rows
  exist by design; if implementation discovers one, the PRD's Autonomous Close flips
  to operator-gated BEFORE the close.
- Phase 4 agents hold a valid lock lease before editing implementation files or this
  task file. The lease mirrors the Conflict Surface — including the
  `packages/provegate/test/**/*.ts` glob, which is deliberate: the lease owns
  whatever the 1.1 re-measurement names.
- The PRD changelog is HISTORY; implement from §1/§4/§6/§7/§11. §1's census is a
  DATED BASELINE (2026-07-29, fifth round): the BINDING migration list is task 1.1's
  scanner re-run, never the table (`enumerate, don't pin`).
- **W1 (PASS watch item):** the rollout is ONE atomic commit — helpers, migrations,
  turbo globs, exception reason, census script, ledger row, ADR row, bundle row,
  alias, harness. The task order below is build order inside the worktree, not a
  commit sequence; no intermediate tree may land.
- No `any`, no `eslint-disable`, no `|| true`. Sweeps grep-verified wrap-tolerantly
  (flatten whitespace first — the iteration-7 lesson) before any row claims them.

---

## Memory Context

- `turbo-cache-masks-out-of-input-reads` — the class under repair; §1 row 4 is the
  record's own origin instance. Binds 1.0–3.0.
- `narrow-the-grammar-not-the-parser` — the grammar is the MEASURED v4 rule set;
  do not grow it toward AST dataflow during implementation. Binds 1.0, 2.0.
- `gate-wire-or-delete` — alias + bundle row + ledger row + ADR row + harness land
  and roll back together. Binds 5.0, 6.0.
- `assert-absent-needs-an-independent-cause` — ten planted deny causes, each with
  its own independent cause; positive control paired. Binds 5.0.
- `a-rule-that-exempts-itself` — no suppression syntax anywhere; the two helper
  files are the only doors and 5.0 validates their AST shape. Binds 1.0, 5.0.
- `two-parsers-wrong-together` — one pin, one implementation; no cache-free twin of
  any comparison. Binds 1.0 (scanner) and 4.0 (probe).
- `runner-sentinel-blocks-cli-spawning-tests` — the probe uses `turbo --dry=json`
  only; whole-suite §11 rows stay on turbo. Binds 4.0, 7.0.
- `fixture-must-reach-production-shape` — the harness runs the PRODUCTION script
  with a target-root argument (`runLedger` pattern); never a temp-root copy (loses
  the `typescript` anchor). Binds 5.0.
- `ADR-0004-method-rule-vs-repo-rule` — repo-class placement; the Classification
  table row is part of the atomic set. Binds 5.0.
- `adr-section-blank-line-reads-empty` — live hazard: NO `pnpm format` over the
  ADR; hand-place the row; `verify:brain` + `verify:script-classes` green after.
  Binds 5.0.

---

## Relevant Files

- `turbo.json` — twelve globs appended to the `test` task's `inputs` (FR-1)
- `scripts/verify/turbo-inputs-exceptions.json` — the `test` reason extended (FR-1)
- `packages/provegate/test/helpers/repo-reads.ts` — NEW: `repoPath` + `pkgRoot` +
  `REPO_READ_GLOBS` (FR-2)
- `packages/provegate/test/helpers/escape-fixtures.ts` — NEW: four byte-identical
  constants (FR-2)
- 21 test files at the §1 baseline (binding list from task 1.1) — mechanical
  migrations (FR-2)
- `scripts/verify/verify-test-inputs.mjs` — NEW: grammar v4 scan + b1/b2/b3 +
  failure-safe probe (FR-3, FR-4)
- `scripts/verify/script-classes.json` — repo-class row (FR-3)
- `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` — Classification table row (FR-3)
- `scripts/verify/verify-workflow.mjs` — `CHECKS` member (FR-3)
- `package.json` — `verify:test-inputs` alias (FR-3; shared append-only)
- `packages/provegate/test/verify-test-inputs.test.ts` — NEW: ten-deny harness (FR-3)
- `_docs/reviews/review-036-frozen-snapshot-digest-gate.md` — Phase 6 artifact
- `_docs/wip/summary-036-frozen-snapshot-digest-gate.md` — Phase 7 summary

---

## Tasks

- [x] 0.0 Pre-flight (gates W2 and W3 before any edit)
  - [x] 0.1 **W3:** `pnpm verify:workflow` on fresh main — MUST be green before
        implementation. If red on the case-study sentinel (34→35 at Phase-3 time),
        STOP: the refresh belongs to the sentinel's own `--print` mechanism
        (PRD-037's), not this PRD; surface to the owner and wait.
  - [x] 0.2 **W2:** `gate queue` — serialize if PRD-032 or PRD-039 has entered an
        execution phase (their Draft surfaces overlap `turbo.json` /
        `content-launch.test.ts` / `script-classes.json` / `verify-workflow.mjs`).
  - [x] 0.3 `node packages/provegate/dist/cli.js open PRD-036 --worktree` — the
        lease carries the surface incl. the test-tree glob; board row added;
        `pnpm install --frozen-lockfile` + `pnpm --filter provegate build` in the
        worktree.
- [x] 1.0 FR-3 scanner core — red-first against the live corpus
  - [x] 1.1 **W2 (binding census):** port the prototype grammar (A1 multi-parent
        literal; A2 ≥2 parent-carrying string args per call; A3 nested `dirname`;
        A4 nested URL; C `process.cwd()`/`homedir(`; template heads and spans
        scanned; module specifiers included) into
        `scripts/verify/verify-test-inputs.mjs`, `typescript` resolved via
        `createRequire` against `packages/provegate/package.json`. Run it: the
        violation list IS the binding migration list. Record it in the Progress
        Log against the §1 baseline (28 in 21). A NEW INPUT GROUP (read outside
        the twelve declared globs) triggers FR-1's discovery clause: glob +
        `REPO_READ_GLOBS` entry + exception reason join atomically, decision
        recorded below.
  - [x] 1.2 Checks b1 (every `repoPath(` first arg a string literal, ledgered;
        non-literal fails closed by file:line), b2 (every `REPO_READ_GLOBS` entry
        covered by a `test`-task input glob; fail names the path), b3 (helper
        shapes: `repo-reads.ts` exports exactly `repoPath`/`pkgRoot`/
        `REPO_READ_GLOBS`, imports only `node:path`+`node:url`, no read/spawn
        calls; `escape-fixtures.ts` zero imports, zero calls, exactly the four
        named constants).
  - [x] 1.3 Red-first proof: the scan against the unmigrated corpus fails naming
        exactly the 1.1 list — no more, no fewer (the paired positive control
        arrives at 2.4).
- [x] 2.0 FR-2 — helpers and the mechanical migration
  - [x] 2.1 `test/helpers/repo-reads.ts` (`repoPath(rel)` against the repo root;
        `pkgRoot`; `REPO_READ_GLOBS` = the twelve new + four declared globs) and
        `test/helpers/escape-fixtures.ts` (`TRAVERSAL_SELECTOR`,
        `TRAVERSAL_COMMAND`, `TRAVERSAL_SLUG`, `QUICKSTART_TASKS_FIXTURE` —
        byte-identical values, no imports, no calls).
  - [x] 2.2 Migrate every 1.1-listed out-of-package escape site through `repoPath`
        (incl. `doc-claims-script`'s `cpSync` sources, `consolidation`'s
        `execFileSync` script path, `quickstart-e2e:308`'s spawn `cwd`);
        `memory.test.ts:461` rewritten against `pkgRoot`
        (`join(pkgRoot, 'practices/verify/lib.mjs')`). Resolution expressions and
        constant homes ONLY — no assertion, read-API, or fixture-value change
        (W5's audit subject).
  - [x] 2.3 The four fixture sites import from `escape-fixtures.ts`; values
        byte-diffed against the originals in the Progress Log.
  - [x] 2.4 Boundary scan green on the migrated corpus (the positive control);
        `pnpm test` green through turbo — zero behavior change.
- [x] 3.0 FR-1 — the cache key
  - [x] 3.1 `turbo.json` `test.inputs`: append the twelve globs (`**/*.md`;
        `docs/research/provegate-bootstrap/**`; `scripts/verify/**`;
        `_docs/reviews/**`; `apps/docs/content/docs/**`; `.changeset/**`;
        `package.json`; `turbo.json`; `LICENSE`; `apps/web/app/page.tsx`;
        `.github/workflows/**`; `.githooks/**` — all `$TURBO_ROOT$`-prefixed);
        keep `$TURBO_DEFAULT$` and the four existing globs untouched.
  - [x] 3.2 `turbo-inputs-exceptions.json` `test` reason extended to enumerate the
        census groups; `pnpm verify:turbo-inputs` green; b2 green.
- [x] 4.0 FR-4 — the failure-safe Turbo probe
  - [x] 4.1 In the census default pass: stale `.probe-*` pre-scan (fail naming
        them) → capture `turbo run test --filter=provegate --dry=json` task hash →
        exclusive-create (`wx`) `.probe-<pid>-<hrtime>.tmp` under the snapshot
        root → re-capture, assert hash CHANGED → `finally`: unlink unconditionally
        → re-capture, assert hash RESTORED. `--dry=json` only; no task execution,
        no gate-CLI spawn.
- [x] 5.0 FR-3 wiring, classification, and the deny harness
  - [x] 5.1 Root `package.json` alias `verify:test-inputs`;
        `verify-workflow.mjs` `CHECKS` member; `script-classes.json` repo row.
  - [x] 5.2 `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md`: the
        `verify-test-inputs.mjs | repo` Classification row, HAND-PLACED in the
        existing table shape — no `pnpm format` over the ADR;
        `pnpm verify:brain` and `pnpm verify:script-classes` green after.
  - [x] 5.3 `test/verify-test-inputs.test.ts` — the harness runs the PRODUCTION
        script with a target-root argument (the `runLedger` pattern; never a
        temp-root copy). Ten planted deny causes, each failing BY NAME from its
        own independent cause: (1) multi-parent literal; (2) split-join
        `join(x, '..', '..')`; (3) split-resolve `resolve(x, '..', '../y')`;
        (4) nested URL; (5) nested `dirname`; (6) non-literal `repoPath` arg;
        (7) unledgered `repoPath` path; (8) uncovered ledger entry; (9) extra
        export in `escape-fixtures.ts`; (10) forbidden `node:fs` import + read
        call in `repo-reads.ts`. Plus the documented limit: a string-concatenation
        traversal asserted NOT flagged (the boundary's edge tested, not implied).
        Positive control: the live corpus passes.
- [x] 6.0 Migration & Rollback verification (infra parent; W1)
  - [x] 6.1 Atomicity check: the full set stages as one commit; no intermediate
        tree holds a registered-without-script or script-without-ledger state
        (`verify:script-classes` diffs the ADR both ways).
  - [x] 6.2 Rollback prova in a scratch worktree: revert restores the PRD-028
        turbo state and a census-free green
        (`pnpm verify:script-classes && pnpm verify:turbo-inputs &&
pnpm verify:workflow && pnpm test` at each of the three documented steps).
- [x] 7.0 Phase 5 — Testing: every §11 row, then the floor
  - [x] 7.1 `pnpm verify:turbo-inputs`
  - [x] 7.2 `pnpm verify:test-inputs` (census + coverage + probe in one pass)
  - [x] 7.3 `pnpm --filter provegate test test/verify-test-inputs.test.ts`
  - [x] 7.4 `pnpm verify:script-classes`
  - [x] 7.5 `pnpm test` (turbo-routed; cache-miss observed after the FR-1 edit,
        then warm-cache behavior confirmed unchanged on a no-edit re-run)
  - [x] 7.6 Floor: `pnpm check-types` && `pnpm lint` && `pnpm build` &&
        `pnpm verify:workflow`
  - [x] 7.7 Re-read PRD §12 DO NOT — wrap-tolerant sweep for each (no second pin
        comparison, no glob narrowing, no hardcoded site list, no suppression
        marker, no fixture-value change, no specifier exemption, no partial
        ledger/ADR subset, no census in the shipped package).
- [ ] 8.0 Phase 6 — Final Auditing (W5)
  - [ ] 8.1 Independent adversarial review (different model/session; `Critical: 0`;
        Quorum per config; real Base SHA; artifact path named in the ledger row) →
        `_docs/reviews/review-036-frozen-snapshot-digest-gate.md`. Brief the
        reviewer to SWEEP the W5 subjects: migrations changed no assertion/read
        API/fixture value; helper exports/imports/calls exactly match FR-3(b3);
        the ADR received only the table-row append.
  - [ ] 8.2 `pnpm verify:workflow` green after any fix; draft
        `_docs/wip/summary-036-frozen-snapshot-digest-gate.md`.
- [ ] 9.0 Phase 7 — Learning and close (eligible)
  - [ ] 9.1 Memory Outputs: reasoned `none` (declared in the PRD) — if
        implementation surfaced a non-derivable fact (e.g. an undocumented Turbo
        hashing behavior), append it to the PRD with rationale FIRST, then write
        the learning + INDEX hook.
  - [ ] 9.2 `pnpm check:durable-artifacts` — the review artifact in the merge diff.
  - [ ] 9.3 `node packages/provegate/dist/cli.js run PRD-036` — from the PRIMARY
        checkout (the PRD-031 close trap: a worktree-run merge cannot land while
        main is checked out there); disposition the close-time watch fires
        PREEMPTIVELY (records watching the PRD file and `_state/prds.json` fire on
        any closing diff); on a stop after "archived":
        `gate-run-resume-after-archive`. NO acceptance needed (eligible, zero
        operator rows). Push stays the owner's.
  - [ ] 9.4 Release the lease, drop the board row, remove the worktree.

---

## Verification Ledger

| Gate                  | Command / Check                                                           | Scope    | Result  | Evidence                                        | Notes                                                                                              |
| --------------------- | ------------------------------------------------------------------------- | -------- | ------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| FR-1                  | `pnpm verify:turbo-inputs`                                                | repo     | passed  | 6 tasks checked                                 | exceptions entry valid; no undeclared narrowing                                                    |
| FR-1                  | `pnpm verify:test-inputs`                                                 | repo     | passed  | 16 entries covered                              | ledger→turbo coverage                                                                              |
| FR-2                  | `pnpm verify:test-inputs`                                                 | repo     | passed  | 58 sources, 0 violations; 23 usages ledgered    | boundary scan zero violations; usage ledgered; helper shapes valid                                 |
| FR-2                  | `pnpm test`                                                               | repo     | passed  | 1359 tests, 57 files                            | migrated suite green through turbo; zero behavior change                                           |
| FR-3                  | `pnpm --filter provegate test test/verify-test-inputs.test.ts`            | pkg      | passed  | 13/13 incl. stale-probe refusal                 | ten deny causes by name; concatenation non-catch documented; positive control                      |
| FR-3                  | `pnpm verify:script-classes`                                              | repo     | passed  | both directions agree                           | ledger row and ADR table row agree both ways                                                       |
| FR-4                  | `pnpm verify:test-inputs`                                                 | repo     | passed  | proven live in the worktree                     | probe: hash changed on `wx` snapshot probe, restored after `finally` cleanup, stale probes refused |
| atomicity             | rollback prova                                                            | repo     | passed  | HEAD~1: zero set members, gates green           | three-step reverse order, each step verified                                                       |
| types/lint/test/build | the floor                                                                 | monorepo | passed  | 5/5 4/4 7/7 4/4; workflow PASS; FULL TURBO warm | plus `pnpm verify:workflow` with the new bundle member                                             |
| independent-review    | `_docs/reviews/review-036-frozen-snapshot-digest-gate.md` — `Critical: 0` | review   | pending |                                                 | W5 sweep briefed                                                                                   |
| durable               | `pnpm check:durable-artifacts`                                            | repo     | pending |                                                 | review artifact in the merge diff                                                                  |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

## Deferrals & Decisions

- Phase-3 note (2026-07-29): `pnpm verify:workflow` is RED on main at task-gen time —
  the recurring case-study sentinel drift (34→35, fourth firing of the day). Task
  0.1 (W3) blocks Phase 4 on a fresh green; the refresh is owned by the sentinel's
  own mechanism (PRD-037's `--print`), not this PRD. Deliberately NOT absorbed.
- Phase-3 note: the owner's Go for Phase 3 was given in-session (2026-07-29);
  recorded here per the protocol's autonomous-execution clause. Phase 4 starts on
  the owner's next Go; the claim itself happens at task 0.3.

- 0.1 — W3 fired as designed: `verify:workflow` red on the sentinel (34→35). The
  owner approved the DOCUMENTED refresh in-session (the two same-day precedents'
  exact procedure): the generated region only, committed on main via the
  sanctioned ALLOW_BASE_COMMIT one-off (`5a2a64a`). Aggregate green before claim.
- 1.1 — the binding census re-run reproduced the §1 baseline EXACTLY (28
  violations in 21 files; zero corpus drift). No new input group — the discovery
  clause did not trigger.
- b1 implementation decision — `repoPath('.')` is the sanctioned BASE accessor
  (exempt from ledger coverage by exact-literal match): nine files need a base
  for config-derived subpaths that cannot be literals; their input groups are
  census-declared at the glob level. Documented in the script; recorded for the
  reviewer's judgment (W5).
- prd-ready migration — the `${state}` template URL became two literal
  `repoPath` candidates (wip/completed), behavior identical, keeping b1
  literal-only without a template carve-out.
- pack-drift — the CHECKS edit tripped the twin ledger; reconciled WITHOUT
  porting: the packed twin deliberately does not gain `verify-test-inputs`
  (repo-class per ADR-0004, never ships).

## Progress Log

| Date       | Task    | Notes                                                                                                                                                                                                                           |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-29 | 0.1-0.3 | W3 red→refresh→green (`5a2a64a`); queue clear; lease 8 globs; worktree + design-then-provegate build (the PRD-014 dist trap)                                                                                                    |
| 2026-07-29 | 1.1-1.3 | red-first: 28 violations in 21 files named — §1 baseline byte-exact; +2 fail-closed helper-missing by design                                                                                                                    |
| 2026-07-29 | 2.x     | 21 files migrated (20 escape sites via repoPath, memory:461 via pkgRoot, 4 byte-identical fixture constants incl. the 519-byte quickstart template); one leftover repoRoot ref (content-prompts:501) caught by the suite, fixed |
| 2026-07-29 | 3.x     | twelve globs appended (17 inputs total); exceptions reason enumerates every group                                                                                                                                               |
| 2026-07-29 | 4.1     | probe PROVEN LIVE: hash changed on the wx snapshot probe, restored after finally cleanup                                                                                                                                        |
| 2026-07-29 | 5.x     | four surfaces one move; ADR row hand-placed (pre-existing ADR prettier-warn confirmed on main, untouched); harness 13/13                                                                                                        |
| 2026-07-29 | 6.x     | atomic commit `9018d3d` (32 files); prova: HEAD~1 zero members, gates green there                                                                                                                                               |
| 2026-07-29 | 7.x     | floor green; verify:workflow PASS post pack-drift reconcile; warm cache FULL TURBO 511ms                                                                                                                                        |

## Blockers / Open Questions

- (none)

## Operator Handoff

> Eligible close: no operator rows by design.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
|      |          |       |                |        |       |
