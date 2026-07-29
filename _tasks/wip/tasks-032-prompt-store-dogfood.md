# Tasks: The Repository Runs Its Own Prompt Store

> **PRD**: [prd-032-prompt-store-dogfood.md](../../_prds/wip/prd-032-prompt-store-dogfood.md)
> **Readiness**: [readiness-032-prompt-store-dogfood.md](../../_readiness/wip/readiness-032-prompt-store-dogfood.md)
> **Status**: Code Complete
> **Readiness Score**: 8.10/10 (iteration 7, PASS — zero findings; seven iterations, trajectory 4.00 → 8.10)
> **Model Tier (Execution)**: high
> **Model Tier (Audit)**: high
> **PRD Class**: infra
> **Autonomous Close**: operator-gated
> **Created**: 2026-07-29

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Decisions in **Deferrals & Decisions**. The close is **operator-gated** (W4): the
  live Claude command-listing observation is an operator row, and Phase 7 requires an
  owner-signed acceptance naming it — an agent transcribes an acceptance only on
  explicit in-session owner direction (`authorship: "agent-transcribed"`), never
  originates one.
- Phase 4 agents hold a valid lock lease before editing implementation files or this
  task file. The former PRD-036 contest is RESOLVED (036 shipped `ee20240`, lease
  released, locks dir empty at task-gen) — the four once-contested surfaces
  (`verify-workflow.mjs`, `script-classes.json`, ADR-0004, `prompts.test.ts`) are
  claimable; `gate queue` re-establishes truth at claim time (W3).
- The PRD changelog is HISTORY; implement from §4/§6/§7 Migration/§11/§12. FR-1's
  ten-value table is OWNER-RECORDED — W6: an additional printed key STOPS for an
  owner decision; a no-longer-printed key is dropped.
- Generated content is generated: not one hand-written byte under `.provegate/`,
  `.claude/commands/`, or `.cursor/rules/prd-workflow.mdc` (the FR-3 probe's
  plant-and-restore is the sanctioned exception).
- Evidence edits to this file's Verification Ledger go BY LINE INDEX (the
  padded-table replace trap struck twice on PRD-036's ledger).
- No `any`, no `eslint-disable`, no `|| true`.

---

## Memory Context

- `runner-sentinel-blocks-cli-spawning-tests` — `CMD_TEST_SCOPED` is turbo-routed;
  whole-suite §11 rows stay on turbo. Binds 2.0, 8.0.
- `derive-the-requirement-from-the-consumer` — FR-1's key SET comes from the printed
  block at execution time, never the catalogue; the table answers, the print
  enumerates (W6). Binds 2.0.
- `shipped-content-needs-a-delivery-gate` — the whole PRD is this record's closure:
  the store goes live where the gate can see it. Binds 3.0, 6.0.
- `turbo-cache-masks-out-of-input-reads` — FR-3 is a repo script, not a package test;
  the comment saying so is part of the script. Binds 5.0.
- `assert-absent-needs-an-independent-cause` — the mutation probe plants its own
  cause (a one-byte edit on a bannered path) and restores in `finally` (W5).
  Binds 5.0.
- `fixture-must-reach-production-shape` — the probe runs the shipped reconciliation
  via the real script, not a reimplementation. Binds 5.0.
- `false-green-on-missing-file` — the Quorum verifier fails loudly on a missing
  file in EITHER copy. Binds 4.0.
- `two-parsers-wrong-together` — `verify:pack-drift` proves agreement only; the
  SEMANTIC verifier is the standing guard (both copies could regress together).
  Binds 4.0.
- `gate-wire-or-delete` — both new scripts arrive WITH their wiring: one CHECKS
  filename literal (W1), one shrink-only exception, two class rows, two ADR rows —
  or the meta-gates refuse. Binds 6.0.
- `a-rule-corrected-survives-where-it-is-restated` — nine historical restatement
  instances on this PRD; W2 briefs the reviewer to SWEEP, not hunt. Binds 9.0.
- `adr-section-blank-line-reads-empty` — live hazard: NO `pnpm format` over
  ADR-0004; hand-place the two rows. Binds 6.0.
- `ADR-0004-method-rule-vs-repo-rule` — both new scripts are repo-class (read repo
  state, never ship). Binds 6.0.
- `operator-acceptance-no-self-accept` + `operator-row-must-be-a-table-row` — the
  W4 close mechanics. Binds 8.0, 10.0.

---

## Relevant Files

- `workflow.config.json` — the `prompts` block (FR-1) + `templates.prd` (FR-2)
- `.provegate/**`, `.claude/commands/**`, `.cursor/rules/prd-workflow.mdc` — the
  generated store and adapters, committed (FR-2)
- `packages/provegate/src/core/run/prompts.ts` +
  `packages/provegate/test/prompts.test.ts` — the Claude listing-line closure (FR-7)
- `scripts/verify/verify-prompts-mutation.mjs` — NEW: the FR-3 bite probe
- `_docs/review-artifact.template.md` +
  `packages/provegate/practices/templates/review-artifact.template.md` +
  `scripts/verify/pack-drift-ledger.json` — the FR-8 Quorum alignment
- `scripts/verify/verify-review-quorum-authority.mjs` — NEW: the FR-8 semantic
  verifier
- `scripts/verify/verify-workflow.mjs`, `gates.manifest.json`,
  `scripts/verify/script-classes.json`,
  `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` — the FR-9 integration set
- `package.json` — two aliases (shared append-only)
- `AGENT_BOOTSTRAP.md` — two pointer lines (FR-5)
- `_docs/reviews/review-032-prompt-store-dogfood.md` — Phase 6 artifact
- `_docs/wip/summary-032-prompt-store-dogfood.md` — Phase 7 summary

---

## Tasks

- [x] 0.0 Pre-flight (W3 re-verified at claim)
  - [x] 0.1 Fresh `pnpm verify:workflow` on current main — green required; a red
        belongs to whoever owns the drifted surface (§12), STOP and surface.
  - [x] 0.2 `gate queue` — locks dir empty and no overlapping execution claim
        (the 036 contest resolved at its close; re-establish, don't trust).
  - [x] 0.3 `node packages/provegate/dist/cli.js open PRD-032 --worktree`; board
        row; `pnpm install --frozen-lockfile`; `pnpm --filter @provegate/design
    build` then `pnpm --filter provegate build` (the worktree dist trap).
- [x] 1.0 FR-7 — the Claude listing line (adapter first, so every later render
      carries it)
  - [x] 1.1 Test FIRST in `packages/provegate/test/prompts.test.ts`: for every
        generated Claude command — the first line is phase-descriptive (not the
        banner), AND the banner remains present and parseable (`bannerFor` path);
        watch it fail against the current adapter.
  - [x] 1.2 `packages/provegate/src/core/run/prompts.ts`: the Claude adapter emits
        a phase-descriptive listing line first, banner intact below (attribution
        depends on it — §12). Test green; rebuild the package.
- [x] 2.0 FR-1 — the owner-answered values (W6)
  - [x] 2.1 Run the built CLI's `init --prompts` PRINT and diff its key set against
        FR-1's ten-value table: an EXTRA printed key = STOP (owner decision); a
        vanished key = dropped, recorded below.
  - [x] 2.2 `workflow.config.json`: the `prompts` block — `dir: .provegate`, all
        three adapters, `enabled`, and every printed key answered verbatim from the
        owner table. No `null` values; the fail-closed render is the proof.
- [x] 3.0 FR-2 + FR-5 — the atomic activation (Migration §, order binding)
  - [x] 3.1 BEFORE committing: run the render, capture the printed generated set
        (the `generatedPaths()` list — ~30 paths at the current corpus) into the
        Progress Log — it is the rollback's deletion manifest.
  - [x] 3.2 ONE commit: the filled block, `templates.prd` → the rendered PRD
        template, every captured generated path (store + Claude commands + Cursor
        rule + codex snippet), and the two `AGENT_BOOTSTRAP.md` pointer lines (one
        knowledge-map line, one Level-2 reading line — pointers, no protocol
        summary). No flag-on-store-absent intermediate state.
  - [x] 3.3 Confirm live: `node packages/provegate/dist/cli.js check --prompts` —
        every planned path `current`; `pnpm verify:prompts` green (committed store
        equals a fresh render).
- [x] 4.0 FR-8 — one review-template authority, closed at the source
  - [x] 4.1 Align BOTH copies to required-Quorum (root
        `_docs/review-artifact.template.md` + packed
        `practices/templates/review-artifact.template.md`): required wording + the
        `quorum-is-required` marker present, optional/omit wording absent;
        reconcile `pack-drift-ledger.json` in the same change (§12: never
        root-only).
  - [x] 4.2 NEW `scripts/verify/verify-review-quorum-authority.mjs`: semantic,
        both copies, loud on a missing file; `package.json` alias
        `verify:review-quorum`.
- [x] 5.0 FR-3 — the bite, executed (W5)
  - [x] 5.1 NEW `scripts/verify/verify-prompts-mutation.mjs` + alias
        `verify:prompts-mutation`: refuse on a dirty tree → plant one byte on the
        BANNERED `.provegate/prompts/phase-3-task-generator.md` (the `modified`
        arm; the two unbannered members would classify `unattributable` — wrong
        target) → run the shipped reconciliation → assert non-zero naming exactly
        that path `modified` → restore in `finally` on ALL paths → assert the tree
        clean. Repo script, never a package test (the turbo-inputs comment is part
        of the file).
- [x] 6.0 FR-9 — the integration set, one gate-green sequence (W1)
  - [x] 6.1 `verify-workflow.mjs` `CHECKS`: append exactly the filename literal
        `'verify-review-quorum-authority.mjs'` — never the alias; the bundle gains
        exactly ONE member from this PRD (§12).
  - [x] 6.2 `gates.manifest.json` `wiringExceptions`: the shrink-only
        `verify:prompts-mutation` entry with the Phase-5-evidence justification.
  - [x] 6.3 `script-classes.json`: both scripts `repo`; ADR-0004 Classification
        table: both rows, HAND-PLACED — no `pnpm format` over the ADR;
        `pnpm verify:brain` + `pnpm verify:script-classes` green after.
  - [x] 6.4 Pack-drift check: the packed practices template edit (4.1) may trip
        the twin ledger — reconcile with the counterpart decision recorded.
- [x] 7.0 FR-4 + FR-6 — read-only liveness assertions
  - [x] 7.1 `pnpm verify:workflow` — the prompts check runs INSIDE the bundle with
        real content; `gate check --wiring` green (registered and executing).
  - [x] 7.2 `pnpm verify:turbo-inputs` green; ignore-rule arm noted as CI's
        fresh-checkout `verify:prompts` (a probe finding an ignored planned path =
        Deferrals entry + surface join, never speculative).
- [x] 8.0 Phase 5 — Testing: every §11 row, then the floor
  - [x] 8.1 `node packages/provegate/dist/cli.js check --prompts` (FR-1)
  - [x] 8.2 `pnpm verify:prompts` (FR-2)
  - [x] 8.3 `pnpm verify:prompts-mutation` (FR-3; W5 restoration observed)
  - [x] 8.4 `pnpm verify:workflow` + `gate check --wiring` (FR-4)
  - [x] 8.5 `pnpm verify:doc-claims` (FR-5)
  - [x] 8.6 `pnpm verify:turbo-inputs` (FR-6)
  - [x] 8.7 `pnpm test --filter provegate` (FR-7, turbo-routed)
  - [x] 8.8 `pnpm verify:review-quorum` + `pnpm verify:pack-drift` (FR-8)
  - [x] 8.9 `pnpm verify:script-classes` + `gate check --wiring` (FR-9)
  - [x] 8.10 Floor: `pnpm check-types` && `pnpm lint` && `pnpm test` &&
        `pnpm build`
  - [ ] 8.11 **OPERATOR (W4):** the live Claude command-listing observation — open
        Claude Code in this repository, observe every generated `/prd-*` command
        listing phase-descriptively (not as a banner comment). Operator row below.
  - [x] 8.12 Re-read PRD §12 DO NOT — wrap-tolerant sweep.
- [x] 9.0 Phase 6 — Final Auditing (W2)
  - [x] 9.1 Independent adversarial review (different model/session; `Critical: 0`;
        quorum per config; real Base SHA; artifact path in the ledger row) →
        `_docs/reviews/review-032-prompt-store-dogfood.md`. Brief: SWEEP all nine
        named restatement surfaces INCLUDING new remediation text (W2); verify the
        no-hand-edit rule (every generated byte equals a fresh render); the banner
        parseability under the listing fix; the both-copies Quorum semantics; the
        integration set's bidirectional consistency.
  - [x] 9.2 `pnpm verify:workflow` green after any fix; draft
        `_docs/wip/summary-032-prompt-store-dogfood.md`.
- [x] 10.0 Phase 7 — operator-gated close
  - [x] 10.1 Memory Outputs: reasoned `none` stands unless implementation surfaced
        a non-derivable fact (append with rationale first if so).
  - [x] 10.2 `pnpm check:durable-artifacts` — the review artifact in the merge
        diff.
  - [x] 10.3 **OPERATOR:** owner-signed acceptance in `_state/acceptances.json`
        naming the 8.11 observation (agent transcribes ONLY on explicit in-session
        owner direction, `authorship: "agent-transcribed"`).
  - [ ] 10.4 `node packages/provegate/dist/cli.js run PRD-032` — §11 rows run from
        the WORKTREE if a new alias stops the primary-root chain
        (`--from-phase=5`, the 036/037 recipe); preemptive close-time watch
        dispositions; on an archive stop: `gate-run-resume-after-archive`. Push
        stays the owner's.
  - [ ] 10.5 Release the lease, drop the board row, remove the worktree.

---

## Verification Ledger

| Gate                  | Command / Check                                                    | Scope    | Result   | Evidence | Notes                                                                             |
| --------------------- | ------------------------------------------------------------------ | -------- | -------- | -------- | --------------------------------------------------------------------------------- |
| FR-1                  | `node packages/provegate/dist/cli.js check --prompts`              | repo     | passed | 30 current / 0 everything-else | all planned paths `current`                                                       |
| FR-2                  | `pnpm verify:prompts`                                              | repo     | passed | store equals fresh render | committed store equals fresh render, via 034's script as shipped                  |
| FR-3                  | `pnpm verify:prompts-mutation`                                     | repo     | passed | executed clean-tree; dirty-tree refusal also observed | the bite: planted byte named `modified`, restored in `finally`, tree clean        |
| FR-4                  | `pnpm verify:workflow`                                             | repo     | passed | PASS — the one new CHECKS member (`verify-review-quorum-authority.mjs`) live; the mutation probe deliberately excepted, not membered | the prompts check inside the bundle                                               |
| FR-4                  | `node packages/provegate/dist/cli.js check --wiring`               | repo     | passed | every gate wired or excepted | registered and executing with real content                                        |
| FR-5                  | `pnpm verify:doc-claims`                                           | repo     | passed | PASS | the entrypoint's new lines claim nothing that does not run                        |
| FR-6                  | `pnpm verify:turbo-inputs`                                         | repo     | passed | PASS | no task hides the store from a gate that reads it                                 |
| FR-7                  | `pnpm test --filter provegate`                                     | repo     | passed | 39/39 incl. the two FR-7 tests (red-first proven) | listing-line test: phase-descriptive first line + parseable banner, every command |
| FR-8                  | `pnpm verify:review-quorum`                                        | repo     | passed | PASS both copies | semantic, both copies; loud on missing file                                       |
| FR-8                  | `pnpm verify:pack-drift`                                           | repo     | passed | PASS post-reconcile | agreement guard on the root/packed pair                                           |
| FR-9                  | `pnpm verify:script-classes`                                       | repo     | passed | PASS (both rows, both directions) | both scripts classified; ADR rows bidirectional                                   |
| FR-9                  | `node packages/provegate/dist/cli.js check --wiring`               | repo     | passed | PASS | CHECKS member + shrink-only exception; nothing wired nowhere                      |
| types/lint/test/build | the floor                                                          | monorepo | passed | 5/5 4/4 7/7 4/4 |                                                                                   |
| operator              | live Claude command-listing observation (8.11)                     | operator | operator |          | W4; bound to the Phase-7 acceptance                                               |
| independent-review    | `_docs/reviews/review-032-prompt-store-dogfood.md` — `Critical: 0` | review   | passed | 2 rounds, C:0 both (1 High closed r1); quorum 1/1 | W2 sweep briefed                                                                  |
| durable               | `pnpm check:durable-artifacts`                                     | repo     | pending  |          | review artifact in the merge diff                                                 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

## Deferrals & Decisions

- Phase-3 note (2026-07-29): the owner's Go given in-session; recorded per the
  protocol's autonomous-execution clause. W3 verified at task-gen: PRD-036 shipped
  (`ee20240`), its lease released, locks dir empty, `verify:workflow` green at the
  036 close. Phase 4 starts on the owner's next Go; the claim happens at 0.3 with
  the re-verification built into 0.1/0.2.
- Ordering decision (task-gen): FR-7's adapter change lands BEFORE the FR-2 render
  (1.0 → 3.0), so the committed store is rendered once, by the fixed adapter —
  FR-2's fresh-render equality then covers the listing line automatically instead
  of requiring a re-render commit.
- 3.2 decision — `gate init --prompts` also topped up workspace scaffolding
  (.gitkeep files, `_docs/deferred/`) as a side effect; those are OUTSIDE this
  PRD's Conflict Surface and were not committed (removed from the worktree). The
  generated-set commit carries exactly the 30 printed paths.
- W6 discharge — the printed key set matched FR-1's table key-for-key; no owner
  STOP needed.
- pack-drift reconcile decision — the twin ledger tripped on the practices
  template edit (intended, FR-8's source-side change) and the workflow bundle
  member; reconciled with the counterpart decision: the packed twin's CHECKS
  array is the ADOPTER bundle and deliberately does NOT gain repo-class members
  (same rule as the 036 close).

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
| 2026-07-29 | 0.x | sentinel re-fired at the 036 close (35→36) — refreshed per the owner's standing same-day approval (`region regen only`); queue clear; lease 16 globs; worktree provisioned (design-then-provegate build) |
| 2026-07-29 | 1.x | FR-7 red-first: listing test failed against the current adapter (banner as line 1), green after the fix; `bannerVersion` exported as the one parsing authority, reconciliation call site refactored onto it |
| 2026-07-29 | 2.1 | W6: printed key set == FR-1's ten-value table exactly — no STOP, nothing dropped |
| 2026-07-29 | 3.1 | captured generated set (30 paths): .provegate/** 22 files (prompts×13 incl. PLACEHOLDERS, README, templates×7, adapters×2, the codex snippet), .claude/commands/prd-{1..7}.md, .cursor/rules/prd-workflow.mdc — the rollback deletion manifest |
| 2026-07-29 | 3.2 | atomic activation `3d8596b` (FR-7 source commit `7d58c0f` precedes it, so the store rendered once by the fixed adapter); init's workspace-scaffolding side effects (.gitkeep files, _docs/deferred/) NOT committed — outside the surface, decision below |
| 2026-07-29 | 3.3 | live: 30 current / 0 stale / 0 modified / 0 missing / 0 unattributable |
| 2026-07-29 | 5.1 | bite probe: dirty-tree refusal observed first (by design), then clean run — planted byte named `modified`, restored, tree clean |
| 2026-07-29 | 6.x | wiring set one commit; pack-drift 3 failures reconciled (templates pair + workflow bundle member) |

## Blockers / Open Questions

- (none)

## Operator Handoff

> Operator-gated close: one live-verification row; the Phase-7 acceptance names it.

| Task | Category          | Owner | Required Check                                                                                                                | Status  | Notes                                                                               |
| ---- | ----------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| 8.11 | live-verification | owner | every generated `/prd-*` command lists phase-descriptively in Claude Code's command palette (banner no longer the first line) | accepted | owner observed 2026-07-29; acceptance transcribed (agent-transcribed) naming this row; closes the PRD-029 deferral |
