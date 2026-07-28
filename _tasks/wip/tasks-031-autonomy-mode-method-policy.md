# Tasks: Autonomy Mode and the Phase 4–7 Proceed Rule

> **PRD**: [prd-031-autonomy-mode-method-policy.md](../../_prds/wip/prd-031-autonomy-mode-method-policy.md)
> **Readiness**: [readiness-031-autonomy-mode-method-policy.md](../../_readiness/wip/readiness-031-autonomy-mode-method-policy.md)
> **Status**: Ship Verified (pending owner acceptance + merge)
> **Readiness Score**: 8.88/10 PASS (iteration 3, Codex; every cap clear)
> **Model Tier (Execution)**: high
> **Created**: 2026-07-28
> **Updated**: 2026-07-28

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- A PRD may be `Code Complete` with operator handoff items, but it is not
  `Ship Verified` until required handoff items are resolved or explicitly accepted.
- Phase 4 agents hold a valid lock lease (METHOD.md → Locks) before editing
  implementation files or this task file.

---

## Memory Context

The slugs the PRD selected as Memory Inputs, carried here so implementation does not
re-derive them. Each gets a re-open task (0.1).

- `shipped-content-needs-a-delivery-gate` — edited prompt content must render through
  the store pipeline in package tests, never merely sit in the corpus (2.x, 6.x).
- `derive-the-requirement-from-the-consumer` — the token's values enter through the
  fragment files the renderer consumes; no catalogue-shaped registration (6.x).
- `a-rule-corrected-survives-where-it-is-restated` — fired on this document twice
  during readiness; every count/wording change sweeps by grep, and the Phase 6
  reviewer is briefed to sweep (7.2, 9.3).
- `docs-outlive-the-gate-they-promise` (reviewed) — FR-5's proceed rule references the
  stop list as shipped, never as planned.
- `evidence-pattern-satisfied-by-the-template` — FR-5's test asserts IDENTITY between
  the two bootstrap copies, never a pattern present in each (5.2).
- `assert-absent-needs-an-independent-cause` — FR-2's human-gated negative pairs with
  the autonomous positive from one fixture (2.3).
- `narrow-the-grammar-not-the-parser` — two legal renderings fixed by the addendum;
  no parser.
- `strictness-added-during-extraction-is-a-behavior-change` (reviewed) — no `src/**`
  surface; the boundary is production code.
- `two-parsers-wrong-together` (reviewed) — the registry stays the single authority.
- `push-is-human-by-omission` / `adr-section-blank-line-reads-empty`
  (not-applicable) — recorded dispositions stand.

---

## Relevant Files

- `docs/research/provegate-bootstrap/source-snapshot/addenda/autonomy-mode-and-proceed-rule-2026-07-27.md`
  — **new**: the provenance record (FR-1; drafted by agent, approved by owner)
- `docs/research/provegate-bootstrap/source-snapshot/MANIFEST.md` — the addenda table row
- `packages/provegate/prompts/phase-3-task-generator.md` — the `{{AUTONOMY_MODE}}` block
  (FR-2) + the restored parenthetical (FR-3)
- `packages/provegate/prompts/_fragments/AUTONOMY_MODE.human-gated.md` — **new** (FR-2)
- `packages/provegate/prompts/_fragments/AUTONOMY_MODE.autonomous.md` — **new** (FR-2)
- `packages/provegate/prompts/orchestration-runner.md` — the proceed rule (FR-4)
- `packages/provegate/prompts/PLACEHOLDERS.md` — the enumerated registry row (FR-6)
- `AGENT_BOOTSTRAP.md` + `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`
  — the proceed rule, identical wording (FR-5)
- `packages/provegate/test/content-prompts.test.ts` — addendum direct-read assertion
  (FR-1), mode assertions (FR-2), parenthetical (FR-3), orchestration (FR-4),
  two-copy identity (FR-5)
- `packages/provegate/test/content-placeholders.test.ts` — registry 21, one
  enumeration, builder rule, missing-fragment mutation (FR-6)
- `packages/provegate/test/prompts.test.ts` + `packages/provegate/test/init.test.ts`
  — enumerated-aware value builders, ten-key set (FR-6)
- `_brain/learnings/a-rule-that-exempts-itself.md` — **new** at Phase 7 + its
  `_brain/INDEX.md` pointer
- `_docs/reviews/review-031-autonomy-mode-method-policy.md` — Phase 6 artifact (Quorum row)

### Notes

- **Ordering is the contract: no method byte moves before the FR-1 addendum is
  owner-approved (readiness W3).** Task 1.0 completes — including its operator stop —
  before 2.0 begins.
- Serialization (`gate queue` at claim): PRD-026 shares the bootstrap **template**;
  PRD-032 shares the root `AGENT_BOOTSTRAP.md`. Neither is in execution phase at
  writing — verify at claim, not from this note.
- `packages/provegate` takes zero runtime dependencies; no `src/**` file moves.

---

## Tasks

- [x] 0.0 Pre-flight
  - [x] 0.1 Open each Memory Context record; confirm paths/commands still exist; record
        staleness in **Deferrals & Decisions**.
  - [x] 0.2 Claim: STATUS.md row, `gate open PRD-031 --worktree`; re-run `gate queue` —
        stop on any active overlap (026: bootstrap template; 032: root bootstrap).
  - [x] 0.3 Baseline green (`pnpm check-types && pnpm lint && pnpm test && pnpm build`);
        `pnpm install` + in-tree build in the worktree.
- [x] 1.0 FR-1 — the addendum, approval-first (readiness W1/W3)
  - [x] 1.1 Draft `addenda/autonomy-mode-and-proceed-rule-2026-07-27.md` on Addendum
        A1's shape: status line (owner approval + date), scope naming PRD-031, the
        unchanged-snapshot statement, and the two authorized clauses (configured
        Phase 3 exception; explicit 4–7 proceed rule).
  - [x] 1.2 **OPERATOR STOP — the owner approves the drafted addendum.** In-session
        approval recorded; the acceptance entry naming the exact addendum path may be
        transcribed now or at close, on explicit direction only
        (`authorship: "agent-transcribed"`, ADR-0003). Nothing after this line starts
        until approval exists.
  - [x] 1.3 Add the addendum's row to `MANIFEST.md`'s addenda table.
  - [x] 1.4 `content-prompts.test.ts`: the direct-read assertion (exact path, status
        line with owner+date, scope, unchanged-snapshot statement, manifest row, both
        authorized clauses) — reading the file, never the digest, and named as
        shape-and-clauses, never as approval proof.
- [x] 2.0 FR-2 — the configured exception
  - [x] 2.1 Write both fragments; the human-gated one states the STOP rule has no
        exception and the repository is configured human-gated; the autonomous one
        reproduces the snapshot's exception text unchanged (parenthetical included —
        FR-3 folds in here).
  - [x] 2.2 Replace the self-granted exception in `phase-3-task-generator.md` with
        `{{AUTONOMY_MODE}}`.
  - [x] 2.3 `content-prompts.test.ts`: both renderings from one fixture — the
        human-gated negative (no exception, no self-assessment instruction) paired
        with the autonomous positive (`assert-absent-needs-an-independent-cause`).
- [x] 3.0 FR-3 — the parenthetical, asserted
  - [x] 3.1 The autonomous rendering's assertion quotes the snapshot's exception text
        including `(single-session test runs, agent-led sweeps)` — byte-compared to
        `source-snapshot/prompts/phase-3-task-generator.md:80`.
- [x] 4.0 FR-4 — the orchestration proceed rule
  - [x] 4.1 `orchestration-runner.md` states the proceed rule for Phases 4–7; wording
        traces to the addendum.
  - [x] 4.2 `content-prompts.test.ts`: the rendered protocol carries the rule; the
        assertion quotes the addendum's clause so the trace is checked.
- [x] 5.0 FR-5 — the entrypoint proceed rule, two copies
  - [x] 5.1 Both `AGENT_BOOTSTRAP` copies gain the clause beside the stop rules: during
        Phases 4–7 the only legitimate stops are the enumerated checkpoints and a
        failed gate; every other decision is recorded in the task file's Deferrals &
        Decisions rather than escalated.
  - [x] 5.2 The test asserts **identity** between the two copies' clauses — never a
        pattern present in each (readiness W-input: a pattern-grep is satisfied by the
        template alone).
- [x] 6.0 FR-6 — the registry row and the corpus-test migration
  - [x] 6.1 `PLACEHOLDERS.md`: the enumerated row — meaning, two legal values, no
        `workflow.config` field mapping.
  - [x] 6.2 The value-builder rule, once, everywhere a fixture synthesizes per-row
        values (`row.enumerated?.[0] ?? generic`): `content-placeholders.test.ts:158,
        173,185,206,217`, `prompts.test.ts:289-292`, `init.test.ts:315-325`.
  - [x] 6.3 Census moves: registry 20→21 (`content-placeholders.test.ts:96`);
        zero→one enumeration (`:103`); both required-value censuses (`:107,164`);
        the nine-key set → ten (`init.test.ts:383-395`).
  - [x] 6.4 Enumeration coverage, mutation-checked: both fragments exist and render
        with their text; an illegal key is refused; a temp-copy missing-fragment case
        **runs** the failure; terminality stays green.
- [x] 7.0 Migration & Rollback verification (infra parent)
  - [x] 7.1 Confirm the one-revert unit: fragments + registry row + protocol block +
        bootstrap clauses + test expectations revert together; nothing published moves.
  - [x] 7.2 Restatement sweep by grep: counts (21, ten, one enumeration), the `src/**`
        boundary wording, the proceed-rule wording across its three homes.
  - [x] 7.3 Confirm the adopter consequences as written: one-way install untouched;
        a stale `AUTONOMY_MODE` key degrades to a render diagnostic at next install
        (`prompts.ts:621-650`); the addendum stays as provenance history on any revert.
- [x] 8.0 Phase 5 — Testing
  - [x] 8.1 Every §11 command into the Verification Ledger with evidence; floor green.
- [x] 9.0 Phase 6 — Final Auditing
  - [x] 9.1 Independent adversarial review (different model/session):
        `_docs/reviews/review-031-autonomy-mode-method-policy.md`, Quorum row, `pass`
        with `Critical: 0`.
  - [x] 9.2 **Readiness W2**: inspect the committed PRD-031 acceptance entry — `items`
        must contain the exact addendum path.
  - [x] 9.3 Vacuity checks by mutation: widen the human-gated fixture to carry the
        exception → the negative assertion goes red; remove a fragment in the temp
        copy → the missing-fragment case fires; revert both.
  - [x] 9.4 Sweep, don't hunt: the three proceed-rule homes, the two bootstrap copies,
        every count.
- [ ] 10.0 Phase 7 — Learning & close
  - [x] 10.1 Write `_brain/learnings/a-rule-that-exempts-itself.md` + its
        `_brain/INDEX.md` pointer line.
  - [x] 10.2 Durable artifacts in the merge diff (`verify:durable-artifacts`); Memory
        Outputs vs the PRD as committed on main.
  - [ ] 10.3 Summary artifact; archive; board close; `gate status`. Push stays with
        the owner.

---

## Verification Ledger

| Gate               | Command / Check                                                  | Scope | Result  | Evidence | Notes |
| ------------------ | ---------------------------------------------------------------- | ----- | ------- | -------- | ----- |
| FR-1               | `pnpm --filter provegate test test/content-prompts.test.ts`      | pkg   | passed  | 43/43; A2 read directly, all four shape assertions | shape-and-clauses; approval was the 1.2 operator stop, owner-given in-session |
| FR-2               | `pnpm --filter provegate test test/content-prompts.test.ts`      | pkg   | passed  | fragments paired + render-level both-modes in content-placeholders | paired mode renderings |
| FR-3               | `pnpm --filter provegate test test/content-prompts.test.ts`      | pkg   | passed  | snapshot sentence anchored in the snapshot itself, matched in the fragment and the render | snapshot parenthetical byte-compared |
| FR-4               | `pnpm --filter provegate test test/content-prompts.test.ts`      | pkg   | passed  | clause-2 core quoted in the runner assertion | proceed rule quoted against the addendum |
| FR-5               | `pnpm --filter provegate test test/content-prompts.test.ts`      | pkg   | passed  | block-extracted and compared with toBe — identity, not pattern | two-copy identity |
| FR-6               | `pnpm --filter provegate test test/content-placeholders.test.ts` | pkg   | passed  | 21/21: census 21 rows, TEN required, both fragments, illegal key, temp-copy mutation | census 21, one enumeration, mutation checks |
| FR-6               | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | passed  | builder rule renders green | enumerated-aware builders |
| FR-6               | `pnpm --filter provegate test test/init.test.ts`                 | pkg   | passed  | 83/83; activation block names exactly ten keys | ten-key set through init |
| FR-6               | `pnpm verify:workflow`                                           | repo  | passed  | PASS after pack-drift reconcile (both bootstrap sides changed by design) | bundle scripts only; digest proof is the package rows |
| types              | `pnpm check-types`                                               | repo  | passed  | 0 errors |       |
| lint               | `pnpm lint`                                                      | repo  | passed  | clean |       |
| test               | `pnpm test`                                                      | repo  | passed  | 7/7 turbo tasks | whole suite via turbo |
| build              | `pnpm build`                                                     | repo  | passed  | clean |       |
| operator           | owner approval of the FR-1 addendum; acceptance names the path   | repo  | operator | approval given in-session 2026-07-28 ("ok 031 için onay") and sealed into A2's status line; the close acceptance must name the exact addendum path (W2, checked at Phase 6) | `skipped` is illegal |
| independent-review | `_docs/reviews/review-031-autonomy-mode-method-policy.md`        | repo  | passed  | Codex 3 rounds; round 3 'No findings … PASS' | verdict pass, critical = 0 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

> Format: `- <task#> — <decision>; <≤1 sentence rationale>`.

- Phase 3 — the Phase A→B approval gate was collapsed into the owner's single "Go"
  (2026-07-28), per the protocol's autonomous-execution clause, recorded here as that
  clause requires.
- 1.2 — the owner approved the drafted addendum in-session ("ok 031 için onay",
  2026-07-28) BEFORE any method byte moved (W3 held); the approval is sealed into A2's
  status line, and the committed acceptance naming the exact addendum path lands at the
  merge gate per the 024/027 close pattern.
- 4.2/5.1 — the proceed-rule block carries NO inline addendum-path citation: the shipped
  template would dangle the repo-only path at adopters, and FR-5 requires the two copies
  identical — the trace is held by the FR-4 test quoting the addendum's clause.
- 6.x — OUT-OF-SURFACE, recorded per §12: `packages/provegate/test/pack-manifest.json`
  and `scripts/verify/pack-drift-ledger.json` sit outside the declared Conflict Surface
  and were touched as gate-forced consequences of in-scope work — the pack manifest's
  conscious-addition gate caught the two new fragments (as designed), and
  `verify:pack-drift --reconcile` ran once because BOTH bootstrap sides changed by
  design in one commit. Neither file is claimed by any active PRD.

---

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

---

## Blockers / Open Questions

- (none)

---

## Operator Handoff

> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`}.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
| 1.2  | manual-qa | owner | approve the drafted FR-1 addendum (in-session); acceptance entry names the exact addendum path | operator | approval GIVEN in-session 2026-07-28 ("ok 031 için onay") before any method byte moved (W3 held), sealed into A2's status line; the committed acceptance naming the exact path lands at the merge gate (W2 — the close is where the acceptance store is written, per the 024/027 pattern) |
| 10.3 | manual-qa | owner | operator-gated close acceptance + `git push` | pending | push is always the human's call |
