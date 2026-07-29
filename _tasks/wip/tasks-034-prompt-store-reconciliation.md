# Tasks: Prompt Store Reconciliation — the Check, Written Against the Model

> **PRD**: [prd-034-prompt-store-reconciliation.md](../../_prds/wip/prd-034-prompt-store-reconciliation.md)
> **Readiness**: [readiness-034-prompt-store-reconciliation.md](../../_readiness/wip/readiness-034-prompt-store-reconciliation.md)
> **Status**: In Progress
> **Readiness Score**: 8.4/10 (iteration 9, PASS — eighth independent scorer)
> **Model Tier (Execution)**: high
> **Model Tier (Audit)**: high
> **PRD Class**: infra
> **Autonomous Close**: operator-gated
> **Created**: 2026-07-28

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned or blocked tasks unchecked; record decisions in
  **Deferrals & Decisions**, human work in **Operator Handoff**.
- The close is **operator-gated**: the merge gate refuses without an owner-signed
  acceptance entry. The agent transcribes only on explicit in-session owner
  direction, never originates.
- Phase 4 agents hold a valid lock lease before editing implementation files or this
  task file.
- No `any`, no `eslint-disable`, no `|| true`. Surface blockers verbatim.
- The PRD changelog is HISTORY, not a normative source (iteration-9 watch item 4):
  implement from §4/§6/§7/§11, never from a changelog row.

---

## Memory Context

Slugs the PRD selected, carried so implementation does not re-derive them:

- `recompute-beats-recorded-state` — the Memory Output this PRD creates: recompute,
  never trust recorded state; the banner version (only stored provenance — no hash,
  no receipt per T7) does the one job recomputation cannot. Binds 1.0.
- `derive-the-requirement-from-the-consumer` — the entire path domain is
  `generatedPaths()`; no catalogue, no walk; this record forbids re-adding a casual
  directory walk later. Binds 1.0, 6.0.
- `shipped-content-needs-a-delivery-gate` — the packed twin must be in `PACK_MAP` or
  it never reaches an adopter. Binds 4.0.
- `two-parsers-wrong-together` — the packed twin calls the exported primitive AND the
  shared evaluator; it reimplements neither comparison nor interpretation. Binds 4.0.
- `known-red-ledger-must-expire` — exceptions fail on stale/unknown/malformed; the
  UTC calendar expiry is this PRD's own decision modeled on the lesson. Binds 2.0.
- `false-green-on-missing-file` — enabled + absent store = named failure; the runner
  never iterates zero cases into a pass. Binds 1.0, 3.0, 5.0.
- `turbo-cache-masks-out-of-input-reads` — the repo check is a root script outside
  turbo. Binds 5.0.
- `fixture-must-reach-production-shape` — FR-3 tests drive the real CLI entry on a
  real tree; the packed-twin test executes the `.mjs` as a module. Binds 6.0.
- `assert-absent-needs-an-independent-cause` — every suppression fixture first proves
  the underlying `modified` finding with the entry removed. Binds 6.0.
- `strictness-added-during-extraction-is-a-behavior-change` — the `prompts.dir`
  backslash rejection is a NAMED behavior change with its changeset migration
  procedure; never slipped in as a bugfix. Binds 2.0, 4.0.
- `a-rule-corrected-survives-where-it-is-restated` — the six-surface prose sweep
  (FR-3) and the stale CI comment (watch item 2) are this record on shipped prose.
  Binds 3.0, 5.0, 9.0.
- `gate-run-resume-after-archive` — if the close stops after "archived", un-archive
  and resume `--from-phase=7`. Binds 10.0.

---

## Relevant Files

- `packages/provegate/src/core/run/prompts.ts` — `reconcilePrompts` +
  `evaluatePromptReconciliation` + module-comment prose update (FR-1/5, FR-3 sweep)
- `packages/provegate/src/core/run/index.ts` — both symbols exported (FR-1)
- `packages/provegate/src/core/config/types.ts` — `PromptsException`, config type (FR-2)
- `packages/provegate/src/core/config/validate.ts` — array-of-record spec +
  `prompts.dir` backslash rejection (FR-2)
- `packages/provegate/src/core/config/load.ts` — semantic checks: path contract,
  UTC expiry parse, duplicates (FR-2)
- `packages/provegate/src/core/config/defaults.ts` — `exceptions: []` default (FR-2)
- `packages/provegate/src/cli.ts` — `gate check --prompts`, help text, `runCheck`
  usage line (FR-3 + sweep)
- `packages/provegate/practices/verify/verify-prompts.mjs` — NEW packed twin (FR-5)
- `packages/provegate/practices/verify/verify-workflow.mjs` — packed CHECKS (FR-5)
- `packages/provegate/practices/NEXT_STEPS.md` — row + prose update (FR-5, sweep)
- `packages/provegate/src/core/run/init.ts` — PACK_MAP entry; `gate init --prompts`
  output prose (FR-5, sweep)
- `packages/provegate/test/pack-manifest.json` — exact-file manifest gains the twin (FR-5)
- `packages/provegate/test/prompts-integrity.test.ts` — NEW: the fixture matrix (FR-6)
- `scripts/verify/verify-prompts.mjs` — NEW: built-CLI invoker + `--assert-ci-order` (FR-4)
- `package.json` — `verify:prompts` (shared append-only)
- `scripts/verify/verify-workflow.mjs` — CHECKS member (FR-4)
- `.github/workflows/ci.yml` — hygiene job: provegate build before the aggregate +
  the stale "ONLY built-CLI surface" comment updated (FR-4, watch item 2)
- `scripts/verify/pack-drift-ledger.json` — one new pair + the changed workflow pair (FR-5)
- `.changeset/prompt-store-reconciliation.md` — minor; three-step adopter migration +
  backslash-dir procedure incl. the `templates.prd` step (FR-5)
- `_brain/learnings/recompute-beats-recorded-state.md` + `_brain/INDEX.md` — Memory
  Output + hook
- `_docs/reviews/review-034-prompt-store-reconciliation.md` — Phase 6 artifact
- `_docs/wip/summary-034-prompt-store-reconciliation.md` — Phase 7 summary

---

## Tasks

- [x] 0.0 Pre-flight
  - [x] 0.1 `gate queue`, then `node packages/provegate/dist/cli.js open PRD-034` —
        lease the Conflict Surface (disjoint from PRD-027's; `.changeset/` freed by
        PRD-025's close).
  - [x] 0.2 Board row in `STATUS.md`; worktree
        (`git worktree add -b prd-034-prompt-store-reconciliation ../provegate-prd-034 main`
        + `pnpm install --frozen-lockfile` + `pnpm --filter provegate build`).
  - [x] 0.3 Baseline: `pnpm test` green; record in the Progress Log the six shipped
        prose sites' CURRENT "nothing detects staleness" wordings (grep evidence for
        the FR-3 sweep's before-state).
- [x] 1.0 FR-1 — the primitive (red-first)
  - [x] 1.1 Write the FR-6 classification fixtures FIRST and watch them fail: five
        planned-path classes (`missing`/`current`/`stale`/`modified`/`unattributable`),
        the same-version `values`-change case, the two deliberately unbannered paths,
        the stripped-banner case.
  - [x] 1.2 `reconcilePrompts(config, root)` in `core/run/prompts.ts`: recompute via
        `generatedPaths()`, byte-compare per planned path, canonical POSIX report
        spelling (collapse repeated separators, drop leading `./`), banner parsed for
        attribution only.
  - [x] 1.3 Read-error contract: `ENOENT` → `missing`; any other read failure fails
        the run closed naming path + error; a symlinked planned path (leaf OR beneath
        a symlinked parent — realpath the full destination, watch item 1) is read
        only inside canonical repo containment, else fails closed naming the escape.
  - [x] 1.4 Limit pins as fixtures: T4 removed-adapter file → NO finding; T5
        renamed-away tree → NO finding while the current adapters report diverged
        through the planned set; unplanned stripped/bannered files → NO finding.
  - [x] 1.5 Export `reconcilePrompts` + `evaluatePromptReconciliation` from
        `core/run/index.ts`; API-export test asserts both import from `provegate`.
- [x] 2.0 FR-2 — the config surface
  - [x] 2.1 `types.ts`: `PromptsException { path; reason; owner; expires }` +
        `exceptions` on the prompts config; `defaults.ts`: `exceptions: []`.
  - [x] 2.2 `validate.ts`: array-of-record structural spec; `prompts.dir` backslash
        rejection (the named strictness change); unknown entry fields refused.
  - [x] 2.3 `load.ts` semantics: rejection-only path contract (backslash, absolute/
        home/drive, `.`/`..`/empty segments, leading `./`), byte-exact case-sensitive
        duplicates, non-empty `reason`/`owner`, `YYYY-MM-DD` UTC expiry valid THROUGH
        the named day.
  - [x] 2.4 Disabled precedence: validity enforced at every load (malformed fails
        even when disabled); evaluation only on an enabled run — disabled entries
        present, validated, unevaluated, unmentioned by the note.
- [x] 3.0 FR-3 — the command + the prose sweep
  - [x] 3.1 `cli.ts`: `gate check --prompts` — per-finding lines only for
        non-`current`, one summary line with all five class counts + excepted; exit 0
        iff nothing outside `current`/`excepted`; `stale` section prints installed vs
        banner version and the model's T2 remedy verbatim; enabled + absent store dir
        → non-zero naming it; disabled → exit 0 with the verbatim-tested note (the
        unexercised planned-set reconciliation + both T6 consequences).
  - [x] 3.2 Suppression through FR-2: `modified` only; excepted paths report
        `excepted (expires <date>)`; expired/stale entries fail the run naming entry
        and rule.
  - [x] 3.3 The six-surface restatement sweep: `storeReadme()` output, `gate init
        --prompts` printed output, `practices/NEXT_STEPS.md`, the `prompts.ts` module
        comment, CLI help, `runCheck` usage — each names `gate check --prompts` as
        the detector, keeps the one-way/no-auto-repair truths, drops every "nothing
        detects staleness" claim.
- [x] 4.0 FR-5 — the pack layer
  - [x] 4.1 `evaluatePromptReconciliation(findings)` in `prompts.ts` — verdict +
        report lines; the CLI consumes it (3.1 refactors onto it if written first).
  - [x] 4.2 NEW `practices/verify/verify-prompts.mjs`: imports primitive + evaluator
        from the installed `provegate`; reimplements nothing.
  - [x] 4.3 Wiring: PACK_MAP entry in `core/run/init.ts`; packed
        `verify-workflow.mjs` CHECKS member; `NEXT_STEPS.md` row;
        `test/pack-manifest.json` gains the new packed path.
  - [x] 4.4 Ledger: reconcile the ONE new pair (`verify/verify-prompts.mjs`) and the
        changed workflow pair, notes updated.
  - [x] 4.5 `.changeset/prompt-store-reconciliation.md` (minor): the three-step
        existing-adopter migration verbatim (upgrade → `gate init --practices`
        creates the file → add the CHECKS member) AND the backslash-dir procedure
        (git mv on POSIX → config edit incl. `templates.prd` in the same edit →
        delete every `renderAdapters()`-derived embedding file + re-run
        `gate init --prompts`) AND the downgrade ordering (remove the whole
        `exceptions` key; remove member/file/script entry before downgrading).
- [x] 5.0 FR-4 — the repo layer
  - [x] 5.1 NEW `scripts/verify/verify-prompts.mjs`: runs
        `node packages/provegate/dist/cli.js check --prompts`; `--assert-ci-order`
        mode parses the hygiene JOB's own step list and fails unless the provegate
        build precedes the aggregate.
  - [x] 5.2 `package.json` `verify:prompts`; `scripts/verify/verify-workflow.mjs`
        CHECKS member.
  - [x] 5.3 `.github/workflows/ci.yml`: hygiene job gains
        `pnpm --filter provegate build` before `verify:workflow`; update the adjacent
        stale comment claiming the other job is the ONLY built-CLI surface (watch
        item 2).
- [x] 6.0 FR-6 — the full fixture matrix (beyond 1.1's red-first core)
  - [x] 6.1 Exceptions: valid; expiry boundary (today passes, yesterday fails);
        duplicate/malformed-date/non-normalized path refused at load; stale entry
        fails; every suppression fixture first proves the finding with the entry
        removed; disabled-exception inertness.
  - [x] 6.2 Command: summary counts; disabled note verbatim; enabled-absent failure;
        backslash-dir load refusal; production-surface assertions (rendered README +
        help mention the check, neither claims nothing detects).
  - [x] 6.3 Migration scenarios: pre-034 practices tree through upgrade+init (new
        file created, existing untouched, changeset text carries all three steps);
        backslash-dir procedure end-to-end incl. `templates.prd` resolving via the
        production `gate new` path and a clean post-migration reconcile. (The
        resolver assertion is error-class discrimination — see Deferrals: the
        inherited PRD-029 anchor defect blocks full instantiation of ANY rendered
        template, with a control fixture proving the discrimination.)
  - [x] 6.4 Containment: leaf-symlink and parent-symlink escape fixtures (watch
        item 1); packed-twin executed as a module; API-export assertion.
- [x] 7.0 Migration & Rollback verification (infra parent)
  - [x] 7.1 Sequence atomicity: landed as ONE commit (`bf942eb`) — the permitted
        degenerate case; no intermediate tree exists.
  - [x] 7.2 Rollback prova: `git revert -n HEAD` in a scratch worktree
        (`../provegate-prd-034-rollback`, removed after): `verify:workflow` PASS,
        `verify:pack-drift` PASS, pack test 9/9 — green pre-PRD state restored.
- [x] 8.0 Phase 5 — Testing: every §11 row, then the floor
  - [x] 8.1 `pnpm --filter provegate test test/prompts-integrity.test.ts -t classification` — 16 passed
  - [x] 8.2 `pnpm --filter provegate test test/prompts-integrity.test.ts -t api-export` — 1 passed
  - [x] 8.3 `pnpm --filter provegate test test/prompts-integrity.test.ts -t exception` — 16 passed
  - [x] 8.4 `pnpm --filter provegate test test/prompts-integrity.test.ts -t command` — 13 passed
  - [x] 8.5 `pnpm --filter provegate test test/prompts-integrity.test.ts -t packed` — 5 passed
  - [x] 8.6 `pnpm --filter provegate test test/prompts-integrity.test.ts` — 54/54
  - [x] 8.7 `pnpm verify:prompts` (dormant note, exit 0) + `pnpm verify:prompts -- --assert-ci-order` PASS
  - [x] 8.8 `pnpm verify:workflow` PASS + `pnpm verify:pack-drift` PASS
  - [x] 8.9 Floor: check-types 5/5, lint 4/4, test 7/7 (1327 tests, 55 files), build 4/4
  - [x] 8.10 §12 re-read: no `any` (types+lint green); reconcile writes nothing
        (byte-level no-write fixture); no repair/sync verb anywhere; twin imports the
        primitive; a repo whose config OMITS prompts sees zero change (defaults carry
        no backslash and an empty exceptions list — the backslash refusal on a
        PRESENT block is FR-2's named behavior change, not a violation).
- [ ] 9.0 Phase 6 — Final Auditing
  - [ ] 9.1 Independent adversarial review (different model/session; `Critical: 0`;
        `Quorum: 1/1 pass`) → `_docs/reviews/review-034-prompt-store-reconciliation.md`.
  - [ ] 9.2 The six-surface prose audit (watch item 3): reviewer inspects ALL six
        sites, not only the two test-held ones.
  - [ ] 9.3 `pnpm verify:workflow` green after any fix; draft
        `_docs/wip/summary-034-prompt-store-reconciliation.md`.
- [ ] 10.0 Phase 7 — Learning and close (operator-gated)
  - [ ] 10.1 Write `_brain/learnings/recompute-beats-recorded-state.md` (banner-version
        attribution form) + the `_brain/INDEX.md` hook (≤120 chars).
  - [ ] 10.2 `pnpm verify:durable-artifacts` — learning, INDEX hook, review artifact
        in the merge diff.
  - [ ] 10.3 Owner acceptance transcribed on explicit direction (the merge gate
        refuses without it).
  - [ ] 10.4 `node packages/provegate/dist/cli.js run PRD-034`; on a stop after
        "archived", follow `gate-run-resume-after-archive`. Push stays the owner's.
  - [ ] 10.5 `release PRD-034`, drop the board row, remove the worktree.

---

## Verification Ledger

| Gate | Command / Check | Scope | Result | Evidence | Notes |
| ---- | --------------- | ----- | ------ | -------- | ----- |
| FR-1 | `... -t classification` | pkg | passed | 16 passed / 38 skipped (2026-07-29) | five classes + limit pins + values-change case |
| FR-1 | `... -t api-export` | pkg | passed | 1 passed (2026-07-29) | both symbols import from the package root |
| FR-2 | `... -t exception` | pkg | passed | 16 passed (2026-07-29) | incl. expiry boundary, backslash-dir refusal, disabled inertness |
| FR-3 | `... -t command` | pkg | passed | 13 passed (2026-07-29) | summary/note verbatim, T2 remedy, surface assertions, read-error fixtures |
| FR-5 | `... -t packed` | pkg | passed | 5 passed (2026-07-29) | twin as module, shared evaluator, PACK_MAP + manifest + NEXT_STEPS |
| FR-6 | whole `prompts-integrity.test.ts` | pkg | passed | 54/54 (2026-07-29) | full matrix incl. both migration scenarios |
| FR-4 | `pnpm verify:prompts` + `-- --assert-ci-order` | repo | passed | dormant note exit 0; order PASS (2026-07-29) | dormant note; hygiene-job order |
| FR-4/5 | `pnpm verify:workflow` + `pnpm verify:pack-drift` | repo | passed | both PASS (2026-07-29) | CHECKS membership; both ledger pairs + notes |
| atomicity | intermediate-commit `verify:workflow` sweep | repo | passed | one commit `bf942eb`; rollback prova green (7.2) | 7.1 degenerate case + revert restores pre-PRD green |
| types/lint/test/build | the floor | monorepo | passed | 5/5, 4/4, 7/7 (1327 tests), 4/4 (2026-07-29) | |
| independent-review | `Critical: 0`, Quorum `1/1 pass`, six-surface audit | review | pending | | |
| durable | `pnpm verify:durable-artifacts` | repo | pending | | |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

## Deferrals & Decisions

- **Inherited PRD-029 defect found by the 6.3 migration fixture: `gate new` cannot
  instantiate a RENDERED template.** `instantiateTemplate` anchors on the literal
  `# {{ID_PREFIX}}-XXX: ` line, but the render substitutes `{{ID_PREFIX}}` → the
  configured prefix, so any `templates.prd` pointing into the store (exactly what
  `promptsConfigBlock` prints for every adopter) fails with "template anchor not found".
  Fix lives in `core/run/new.ts` (accept both anchor forms) or in the source template
  (escape the anchor tokens) — the first is outside this PRD's Conflict Surface, the
  second is method content (§5 non-goal). The fixture pins the honest current behavior:
  resolution against the MOVED template is proven by error-class discrimination
  (anchor-drift error = the moved bytes were read; the abandoned spelling ENOENTs), with
  a control fixture proving the discrimination. **Needs an owner decision at close: the
  STATUS deferral board is at its 15-row cap, so recording it there requires converting
  the oldest-due row first — flagged in Operator Handoff.**
- **`scripts/verify/script-classes.json` and ADR-0004's classification table gained a
  `verify-prompts.mjs | repo` row** — neither file is in the Conflict Surface, but the
  rows are the mechanical registration `verify:script-classes` (a §11-required green)
  demands for ANY new verify script, the same class of append as a `package.json` script
  entry. Class rationale recorded in the ADR appendix: the repo script reads this
  repository's `ci.yml` and executes the built CLI (repo-class by the what-it-READS
  test); the method-side rule is the packed twin. Taken under the proceed rule, recorded
  here rather than escalated.
- **The changeset assertions in `prompts-integrity.test.ts` read `.changeset/` from the
  package test**, which is outside the package's turbo `test` inputs — the same
  pre-existing gap `changeset-entry.test.ts` already has (precedent followed, not
  created). A stale-cache replay window exists for changeset-only edits; the fix (a
  `$TURBO_ROOT$/.changeset/**` input) touches `turbo.json`, which PRD-024/PRD-036
  serialize on — not taken here.
- **`verify-pack-drift.mjs` crashes (TypeError on `was.pack`) instead of printing its
  intended "no ledger entry" failure when a PACK_MAP pair has no ledger row.** Surfaced
  by the new pair; `--reconcile` path unaffected. Fails loudly, so no gate hole — but
  the diagnostic is wrong-shaped. Script outside the Conflict Surface; recorded.
- **`test/practices-pack.test.ts` (outside the Conflict Surface) gained a
  production-shape fixture fix:** the packed bundle now contains the twin, which
  imports `provegate` — and the fresh-install fixture ran in a temp repo with NO
  installed package, an environment no real adopter has (their `gate` binary came from
  the install). `makeRepo` now symlinks `node_modules/provegate` to the package root
  (`fixture-must-reach-production-shape`), and the two tree walkers skip
  `node_modules` like `.git`; the dry-run root assertion admits the link. No assertion
  was weakened — the bundle-green claim now runs one check stronger. Forced by the
  in-scope CHECKS change; taken under the proceed rule, recorded.
- **TOCTOU residue in `reconcilePrompts`, accepted as the adversarial class
  (review round 3):** the read now targets the VALIDATED realpath and a mid-run
  vanish fails closed ("changed during the run"), so a symlink swap at the
  planned path can no longer redirect the read. What remains — the resolved
  target itself being swapped between `realpathSync` and `readFileSync(real)` —
  requires a concurrent writer racing inside one process's own execution: the
  same class the PRD-022 "manifest absent-then-restored race" deferral records,
  and the same posture is taken (recorded, not built against). A read-only
  check on a stable tree cannot hit it.
- **Evaluator signature:** `evaluatePromptReconciliation(findings, { exceptions,
  todayUtc })` — the PRD names the first argument; exceptions and the day arrive as
  options because the module's no-clock purity rule (its own header) forbids reading
  the date inside the package. CLI and twin both pass `new Date().toISOString()`.
- **Shared preflight added beyond the two named exports:** `promptsCheckPreflight` +
  `PROMPTS_DISABLED_NOTE` exported so the disabled note and absent-store failure have
  ONE implementation for CLI and twin (`two-parsers-wrong-together` applied to the
  branches around the primitive, not only the primitive).

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
| 2026-07-28 | 0.1 | `gate queue`: PRD-034 READY, IN-FLIGHT 0, no overlap. `gate open PRD-034`: lease claimed, 19 globs, lock written to the MAIN checkout (`_state/locks/prd-034-prompt-store-reconciliation.json`). `gate check PRD-034` re-run green under post-PRD-028 gates (the closed §9 grammar landed after task-gen). |
| 2026-07-28 | 0.2 | Board row added on main. Worktree at `../provegate-prd-034` from main `9789381`. `pnpm --filter provegate build` failed on unbuilt `@provegate/design` (fresh-worktree dep gap); full `pnpm build` green (4/4). No root `.env*` exists, so the fresh-worktree env gap is n/a. |
| 2026-07-29 | 1.0–5.0 | Red-first held: `prompts-integrity.test.ts` written first, 53/54 red (missing exports), then green in slices. FR-1 primitive (16 classification tests incl. both symlink-containment arms, EISDIR fail-closed, canonical `.`-dir spelling, no-write proof), FR-2 config surface (structural spec + backslash `prompts.dir` refusal in `validate.ts`, rejection-only path contract + UTC calendar expiry + byte-wise duplicates in `load.ts`), FR-3 command + six-surface sweep, FR-5 pack layer (twin imports package; PACK_MAP; packed CHECKS; NEXT_STEPS; pack-manifest; changeset), FR-4 repo layer (`verify:prompts` + `--assert-ci-order` hygiene-job-scoped; CI build-before-aggregate + stale comment fixed — watch item 2 done). Drift ledger: one new pair + workflow pair reconciled, both notes updated. `verify:workflow` PASS, `check --wiring` PASS, integrity suite 54/54. |
| 2026-07-28 | 0.3 | Baseline `pnpm test` green: 54 files, 1273 tests. Six-site before-state (FR-3 sweep evidence): (1) `prompts.ts` module comment L13-14 "no receipt, no reconciliation, no upgrade path and no `sync`"; (2) `storeReadme()` L713 "no upgrade path, no reconciliation" + L722 "Automated staleness detection is deliberately not part of this version."; (3) `cli.ts` init output L258 "There is no upgrade path, no reconciliation and no sync in this version."; (4) `practices/NEXT_STEPS.md` L82-84 "no upgrade path, no reconciliation and no `sync` … nothing detects that it is stale"; (5) CLI help `check` line L125 lists only `PRD-XXX \| --wiring` (no `--prompts`); (6) `runCheck` usage L834 lists `--wiring \| --value-score \| --review-artifacts \| --durable-artifacts` (no `--prompts`). |

## Blockers / Open Questions

- (none)

## Operator Handoff

> The close is operator-gated; the one operator action is the close acceptance.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
| 10.3 | manual-qa | owner | owner-signed acceptance entry covering the autonomous close (review read, verdict accepted) | pending | agent transcribes only on explicit direction |
