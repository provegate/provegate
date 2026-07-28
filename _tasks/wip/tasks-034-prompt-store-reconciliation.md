# Tasks: Prompt Store Reconciliation — the Check, Written Against the Model

> **PRD**: [prd-034-prompt-store-reconciliation.md](../../_prds/wip/prd-034-prompt-store-reconciliation.md)
> **Readiness**: [readiness-034-prompt-store-reconciliation.md](../../_readiness/wip/readiness-034-prompt-store-reconciliation.md)
> **Status**: Not Started
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

- [ ] 0.0 Pre-flight
  - [ ] 0.1 `gate queue`, then `node packages/provegate/dist/cli.js open PRD-034` —
        lease the Conflict Surface (disjoint from PRD-027's; `.changeset/` freed by
        PRD-025's close).
  - [ ] 0.2 Board row in `STATUS.md`; worktree
        (`git worktree add -b prd-034-prompt-store-reconciliation ../provegate-prd-034 main`
        + `pnpm install --frozen-lockfile` + `pnpm --filter provegate build`).
  - [ ] 0.3 Baseline: `pnpm test` green; record in the Progress Log the six shipped
        prose sites' CURRENT "nothing detects staleness" wordings (grep evidence for
        the FR-3 sweep's before-state).
- [ ] 1.0 FR-1 — the primitive (red-first)
  - [ ] 1.1 Write the FR-6 classification fixtures FIRST and watch them fail: five
        planned-path classes (`missing`/`current`/`stale`/`modified`/`unattributable`),
        the same-version `values`-change case, the two deliberately unbannered paths,
        the stripped-banner case.
  - [ ] 1.2 `reconcilePrompts(config, root)` in `core/run/prompts.ts`: recompute via
        `generatedPaths()`, byte-compare per planned path, canonical POSIX report
        spelling (collapse repeated separators, drop leading `./`), banner parsed for
        attribution only.
  - [ ] 1.3 Read-error contract: `ENOENT` → `missing`; any other read failure fails
        the run closed naming path + error; a symlinked planned path (leaf OR beneath
        a symlinked parent — realpath the full destination, watch item 1) is read
        only inside canonical repo containment, else fails closed naming the escape.
  - [ ] 1.4 Limit pins as fixtures: T4 removed-adapter file → NO finding; T5
        renamed-away tree → NO finding while the current adapters report diverged
        through the planned set; unplanned stripped/bannered files → NO finding.
  - [ ] 1.5 Export `reconcilePrompts` + `evaluatePromptReconciliation` from
        `core/run/index.ts`; API-export test asserts both import from `provegate`.
- [ ] 2.0 FR-2 — the config surface
  - [ ] 2.1 `types.ts`: `PromptsException { path; reason; owner; expires }` +
        `exceptions` on the prompts config; `defaults.ts`: `exceptions: []`.
  - [ ] 2.2 `validate.ts`: array-of-record structural spec; `prompts.dir` backslash
        rejection (the named strictness change); unknown entry fields refused.
  - [ ] 2.3 `load.ts` semantics: rejection-only path contract (backslash, absolute/
        home/drive, `.`/`..`/empty segments, leading `./`), byte-exact case-sensitive
        duplicates, non-empty `reason`/`owner`, `YYYY-MM-DD` UTC expiry valid THROUGH
        the named day.
  - [ ] 2.4 Disabled precedence: validity enforced at every load (malformed fails
        even when disabled); evaluation only on an enabled run — disabled entries
        present, validated, unevaluated, unmentioned by the note.
- [ ] 3.0 FR-3 — the command + the prose sweep
  - [ ] 3.1 `cli.ts`: `gate check --prompts` — per-finding lines only for
        non-`current`, one summary line with all five class counts + excepted; exit 0
        iff nothing outside `current`/`excepted`; `stale` section prints installed vs
        banner version and the model's T2 remedy verbatim; enabled + absent store dir
        → non-zero naming it; disabled → exit 0 with the verbatim-tested note (the
        unexercised planned-set reconciliation + both T6 consequences).
  - [ ] 3.2 Suppression through FR-2: `modified` only; excepted paths report
        `excepted (expires <date>)`; expired/stale entries fail the run naming entry
        and rule.
  - [ ] 3.3 The six-surface restatement sweep: `storeReadme()` output, `gate init
        --prompts` printed output, `practices/NEXT_STEPS.md`, the `prompts.ts` module
        comment, CLI help, `runCheck` usage — each names `gate check --prompts` as
        the detector, keeps the one-way/no-auto-repair truths, drops every "nothing
        detects staleness" claim.
- [ ] 4.0 FR-5 — the pack layer
  - [ ] 4.1 `evaluatePromptReconciliation(findings)` in `prompts.ts` — verdict +
        report lines; the CLI consumes it (3.1 refactors onto it if written first).
  - [ ] 4.2 NEW `practices/verify/verify-prompts.mjs`: imports primitive + evaluator
        from the installed `provegate`; reimplements nothing.
  - [ ] 4.3 Wiring: PACK_MAP entry in `core/run/init.ts`; packed
        `verify-workflow.mjs` CHECKS member; `NEXT_STEPS.md` row;
        `test/pack-manifest.json` gains the new packed path.
  - [ ] 4.4 Ledger: reconcile the ONE new pair (`verify/verify-prompts.mjs`) and the
        changed workflow pair, notes updated.
  - [ ] 4.5 `.changeset/prompt-store-reconciliation.md` (minor): the three-step
        existing-adopter migration verbatim (upgrade → `gate init --practices`
        creates the file → add the CHECKS member) AND the backslash-dir procedure
        (git mv on POSIX → config edit incl. `templates.prd` in the same edit →
        delete every `renderAdapters()`-derived embedding file + re-run
        `gate init --prompts`) AND the downgrade ordering (remove the whole
        `exceptions` key; remove member/file/script entry before downgrading).
- [ ] 5.0 FR-4 — the repo layer
  - [ ] 5.1 NEW `scripts/verify/verify-prompts.mjs`: runs
        `node packages/provegate/dist/cli.js check --prompts`; `--assert-ci-order`
        mode parses the hygiene JOB's own step list and fails unless the provegate
        build precedes the aggregate.
  - [ ] 5.2 `package.json` `verify:prompts`; `scripts/verify/verify-workflow.mjs`
        CHECKS member.
  - [ ] 5.3 `.github/workflows/ci.yml`: hygiene job gains
        `pnpm --filter provegate build` before `verify:workflow`; update the adjacent
        stale comment claiming the other job is the ONLY built-CLI surface (watch
        item 2).
- [ ] 6.0 FR-6 — the full fixture matrix (beyond 1.1's red-first core)
  - [ ] 6.1 Exceptions: valid; expiry boundary (today passes, yesterday fails);
        duplicate/malformed-date/non-normalized path refused at load; stale entry
        fails; every suppression fixture first proves the finding with the entry
        removed; disabled-exception inertness.
  - [ ] 6.2 Command: summary counts; disabled note verbatim; enabled-absent failure;
        backslash-dir load refusal; production-surface assertions (rendered README +
        help mention the check, neither claims nothing detects).
  - [ ] 6.3 Migration scenarios: pre-034 practices tree through upgrade+init (new
        file created, existing untouched, changeset text carries all three steps);
        backslash-dir procedure end-to-end incl. `templates.prd` resolving via the
        production `gate new` path and a clean post-migration reconcile.
  - [ ] 6.4 Containment: leaf-symlink and parent-symlink escape fixtures (watch
        item 1); packed-twin executed as a module; API-export assertion.
- [ ] 7.0 Migration & Rollback verification (infra parent)
  - [ ] 7.1 Sequence atomicity: between adjacent commits of the implementation
        stack, no tree holds a registered check without its script or a script
        without registration — verify by checking out each intermediate commit and
        running `pnpm verify:workflow` (or land as one commit).
  - [ ] 7.2 Rollback prova: revert the stack in a scratch worktree; confirm
        `verify:workflow`, `verify:pack-drift` and the pack test return to green
        pre-PRD state.
- [ ] 8.0 Phase 5 — Testing: every §11 row, then the floor
  - [ ] 8.1 `pnpm --filter provegate test test/prompts-integrity.test.ts -t classification`
  - [ ] 8.2 `pnpm --filter provegate test test/prompts-integrity.test.ts -t api-export`
  - [ ] 8.3 `pnpm --filter provegate test test/prompts-integrity.test.ts -t exception`
  - [ ] 8.4 `pnpm --filter provegate test test/prompts-integrity.test.ts -t command`
  - [ ] 8.5 `pnpm --filter provegate test test/prompts-integrity.test.ts -t packed`
  - [ ] 8.6 `pnpm --filter provegate test test/prompts-integrity.test.ts` (whole matrix)
  - [ ] 8.7 `pnpm verify:prompts` (dormant note here) + `pnpm verify:prompts -- --assert-ci-order`
  - [ ] 8.8 `pnpm verify:workflow` + `pnpm verify:pack-drift`
  - [ ] 8.9 Floor: `pnpm check-types` && `pnpm lint` && `pnpm test` && `pnpm build`
  - [ ] 8.10 Re-read PRD §12 DO NOT — no `any`, no adopter-file delete, no repair
        verb, no second implementation, no behavior change for a no-prompts repo.
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
| FR-1 | `... -t classification` | pkg | pending | | five classes + limit pins + values-change case |
| FR-1 | `... -t api-export` | pkg | pending | | both symbols import from `provegate` |
| FR-2 | `... -t exception` | pkg | pending | | incl. expiry boundary, backslash-dir refusal, disabled inertness |
| FR-3 | `... -t command` | pkg | pending | | summary/note verbatim, T2 remedy, surface assertions, read-error fixtures |
| FR-5 | `... -t packed` | pkg | pending | | twin as module, shared evaluator |
| FR-6 | whole `prompts-integrity.test.ts` | pkg | pending | | full matrix incl. both migration scenarios |
| FR-4 | `pnpm verify:prompts` + `-- --assert-ci-order` | repo | pending | | dormant note; hygiene-job order |
| FR-4/5 | `pnpm verify:workflow` + `pnpm verify:pack-drift` | repo | pending | | CHECKS membership; both ledger pairs |
| atomicity | intermediate-commit `verify:workflow` sweep | repo | pending | | 7.1 |
| types/lint/test/build | the floor | monorepo | pending | | |
| independent-review | `Critical: 0`, Quorum `1/1 pass`, six-surface audit | review | pending | | |
| durable | `pnpm verify:durable-artifacts` | repo | pending | | |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

## Deferrals & Decisions

- (none yet)

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

## Blockers / Open Questions

- (none)

## Operator Handoff

> The close is operator-gated; the one operator action is the close acceptance.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
| 10.3 | manual-qa | owner | owner-signed acceptance entry covering the autonomous close (review read, verdict accepted) | pending | agent transcribes only on explicit direction |
