# Tasks: Acceptance Authorship Provenance

> **PRD**: [prd-033-acceptance-authorship-provenance.md](../../_prds/wip/prd-033-acceptance-authorship-provenance.md)
> **Readiness**: [readiness-033-acceptance-authorship-provenance.md](../../_readiness/wip/readiness-033-acceptance-authorship-provenance.md)
> **Status**: Operator Verification
> **Readiness Score**: 8.25/10
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
re-derive them. Each one gets a re-open task below, bound to the work that depends on it:
a record is evidence only while it is true.

- `operator-acceptance-no-self-accept` — the record this PRD amends. Its rule survives;
  what is added is that transcription at owner direction is not self-acceptance. Binds 3.0.
- `a-rule-corrected-survives-where-it-is-restated` — why 3.0 enumerates eight sites
  instead of describing a change. Binds 3.0.
- `turbo-cache-masks-out-of-input-reads` — why the assertions split by where the file
  lives, not by what is asserted. Binds 2.0 and 4.0.
- `two-parsers-wrong-together` — `validAcceptance` must not grow a third opinion about
  `authorship`. Binds 2.0.
- `strictness-added-during-extraction-is-a-behavior-change` — a required field is added
  strictness; the store it would break is migrated in the same commit. Binds 1.0.
- `push-is-human-by-omission` — untouched, and must stay untouched. Binds 3.0.
- `evidence-pattern-satisfied-by-the-template` — `method` was the free-text version of
  this idea and eight honest answers in it changed nothing. Binds 1.0.

---

## Relevant Files

- `packages/provegate/schemas/acceptances.schema.json` — the documented entry shape; gains `authorship`
- `packages/provegate/src/core/run/acceptance.ts` — `AcceptanceEntry`, `ENTRY_FIELDS`, `entryProblem`, `operatorGateOk`
- `packages/provegate/test/acceptance.test.ts` — validator, migration-mapping and three deny tests
- `packages/provegate/test/fixtures/` — pre-migration store fixture for the mapping test
- `packages/provegate/test/content-canon.test.ts` — the two shipped prose sites
- `_state/acceptances.json` — the sixteen entries migrated
- `AGENT_BOOTSTRAP.md` — stop-and-ask row + critical-rules restatement
- `packages/provegate/METHOD.md` — "Operator acceptance"
- `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md` — shipped stop-and-ask row
- `packages/provegate/prompts/phase-6-final-auditing.md` — pointer; verified, edited only if it restates
- `_brain/learnings/operator-acceptance-no-self-accept.md` — live record
- `packages/provegate/practices/brain/learnings/operator-acceptance-no-self-accept.md` — packed twin
- `_brain/INDEX.md` — live hook (shared append-only; not in the Conflict Surface)
- `packages/provegate/practices/brain/INDEX.md` — packed hook
- `scripts/verify/pack-drift-ledger.json` — the hash pair for the record
- `_brain/adr/ADR-0003-acceptance-authorship.md` — new
- `_brain/learnings/free-text-field-is-the-unread-drift-ledger.md` — new
- `scripts/verify/verify-acceptance-rule.mjs` — new cache-free gate
- `scripts/verify/verify-workflow.mjs` — `CHECKS` registration
- `gates.manifest.json` — manifest registration
- `package.json` — the `verify:*` key (shared append-only; not in the Conflict Surface)

### Notes

- Tests live in `packages/provegate/test/`, not beside the source.
- Repo-root files and `_state/` are outside the package cache key; assertions on them
  belong in `scripts/verify/`, never in a package test. See PRD §7.

---

## Tasks

- [x] 0.0 Pre-flight
  - [x] 0.1 Open each Memory Context record and confirm the paths and commands it names
        still exist; record any stale finding in **Deferrals & Decisions**.
  - [x] 0.2 Claim the lock lease for this work item with the PRD's Conflict Surface as
        `ownedPaths`; confirm no active claim overlaps.
  - [x] 0.3 Branch `feat/prd-033-acceptance-authorship` from `main`.
  - [x] 0.4 Record the pre-migration bytes of `_state/acceptances.json` (the committed
        blob at `HEAD`) as the baseline the mapping and the `method`-preservation
        assertions are checked against.

- [x] 1.0 Data & Infrastructure — the field, the type, the migration (FR-1, FR-3)
  - [x] 1.1 Add `authorship` to `packages/provegate/schemas/acceptances.schema.json`:
        `enum: ["owner-written", "agent-transcribed"]`, added to `required`. The
        description states that `owner` names who decided and `authorship` names who
        typed. Leave `schemaVersion` at `1` — PRD FR-1 and §12.
  - [x] 1.2 Widen `AcceptanceEntry` in `packages/provegate/src/core/run/acceptance.ts`
        with `authorship: 'owner-written' | 'agent-transcribed'`. A union, never
        `string`, and never `any`.
  - [x] 1.3 Migrate all sixteen entries in `_state/acceptances.json`. Mapping from the
        existing `method` text: exactly `interactive` → `owner-written` (8 entries);
        every other phrasing → `agent-transcribed` (8 entries). Do not alter any
        `method` string — PRD §12.
  - [x] 1.4 Add the pre-migration store as a fixture under
        `packages/provegate/test/fixtures/` so the mapping is testable without reading
        `_state/` from inside the package.
  - [x] 1.5 Test in `packages/provegate/test/acceptance.test.ts`: the mapping over the
        fixture produces the expected split, and every `method` string in the result is
        byte-identical to the fixture's.
  - [x] 1.6 Re-read `strictness-added-during-extraction-is-a-behavior-change` and
        `evidence-pattern-satisfied-by-the-template` before closing this parent; confirm
        the field is enumerated rather than free text and that the migration lands with
        the validator, not before it.

- [x] 2.0 Core Logic & Validation — enforcement and the close message (FR-2, FR-7)
  - [x] 2.1 Add `authorship` to `ENTRY_FIELDS` in
        `packages/provegate/src/core/run/acceptance.ts`.
  - [x] 2.2 Extend `entryProblem` to refuse a missing field and any value outside the
        enum, naming both legal values in the message. Refusal is reported by index,
        like every other entry problem.
  - [x] 2.3 Leave `validAcceptance` unchanged. It must not learn about `authorship` —
        PRD §7 and §12, and `two-parsers-wrong-together`.
  - [x] 2.4 Extend `OperatorGateResult`'s waived `why` in `operatorGateOk` to name the
        authorship beside the deciding owner.
  - [x] 2.5 **Deny test** in `packages/provegate/test/acceptance.test.ts`:
        `the operator gate refuses a store whose entry carries an unknown authorship value`.
        Drives `operatorGateOk` with a record carrying operator rows; asserts
        `ok: false` and the naming reason. Not an `entryProblem` shape assertion.
  - [x] 2.6 **Deny test**:
        `the operator gate refuses a store whose entry omits authorship, naming both legal values`.
  - [x] 2.7 **Deny test**:
        `a legal authorship does not admit an owner outside the allowlist` — the new
        field must not short-circuit the identity check, and the identity check must not
        mask a missing field.
  - [x] 2.8 Test that a malformed entry fails the WHOLE store, not merely the selected
        entry — the existing comment at the validation loop says why.
  - [x] 2.9 Test the waived reason on both branches: the `readCommitted` path and the
        `loadAcceptance` fallback.
  - [x] 2.10 Re-read `two-parsers-wrong-together` before closing this parent; confirm
        exactly one function decides what a legal `authorship` is.

- [x] 3.0 Governance Content Sweep — eight sites, two of them shipped (FR-4, FR-6, FR-8)
  - [x] 3.1 Re-read `a-rule-corrected-survives-where-it-is-restated`, then re-run the
        full-repo sweep for the prohibition BEFORE editing. Treat the eight sites below
        as the expected set, not the complete one; record any ninth in **Deferrals &
        Decisions**.
  - [x] 3.2 `AGENT_BOOTSTRAP.md` — the **Operator acceptance** stop-and-ask row.
  - [x] 3.3 `AGENT_BOOTSTRAP.md` — the critical-rules restatement near the end.
  - [x] 3.4 `packages/provegate/METHOD.md` — the "Operator acceptance" section.
  - [x] 3.5 `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md` — the
        shipped stop-and-ask row. Same rule, same wording discipline.
  - [x] 3.6 `packages/provegate/prompts/phase-6-final-auditing.md` — verify it points at
        METHOD.md rather than restating the rule; edit only if it restates.
  - [x] 3.7 Amend `_brain/learnings/operator-acceptance-no-self-accept.md`: the rule
        survives, and transcription at explicit owner direction, recorded as such, is
        named as distinct from self-acceptance.
  - [x] 3.8 Apply the identical amendment to
        `packages/provegate/practices/brain/learnings/operator-acceptance-no-self-accept.md`.
        A one-sided edit ships the old rule to every consumer.
  - [x] 3.9 Update both hooks: `_brain/INDEX.md` and
        `packages/provegate/practices/brain/INDEX.md`.
  - [x] 3.10 Update both hashes for the record in `scripts/verify/pack-drift-ledger.json`.
  - [x] 3.11 Write `_brain/adr/ADR-0003-acceptance-authorship.md`: the decision, the two
        fields and what each records, and the deliberate divergence of `METHOD.md` and
        the practices template from the source snapshot (critical rule 4). **W3** — the
        ADR must state that `authorship` is a record and not an enforcement, in those
        terms. No blank line after any section heading — `adr-section-blank-line-reads-empty`.
  - [x] 3.12 Add the ADR pointer to `_brain/INDEX.md`.
  - [x] 3.13 Case in `packages/provegate/test/content-canon.test.ts`: both SHIPPED sites
        (`METHOD.md`, the practices template) carry the new rule and not the
        prohibition. Package files only — the repo-root sites belong to 4.0.
  - [x] 3.14 Confirm `push-is-human-by-omission`, `gate push` and the runner are
        untouched, and that no edit in this parent reads as precedent for the push rule.
  - [ ] 3.15 **Operator-owned** — owner reads the four amended prose sites and ADR-0003
        and confirms the landed rule is the one they decided. See **Operator Handoff**.
        Leave unchecked; the agent cannot complete it.

- [x] 4.0 Gate Wiring — one cache-free gate, registered everywhere (FR-5)
  - [x] 4.1 Write `scripts/verify/verify-acceptance-rule.mjs`. Three assertions: the
        prohibition sentence appears in no live document (excluding `_prds/completed/**`,
        `_tasks/completed/**`, `_readiness/completed/**`); each of the four prose sites
        carries the rule, addressed by explicit path so deletion fails as loudly as
        contradiction; every entry in the store carries a legal `authorship`.
  - [x] 4.2 **W2** — record the residual in the gate's own header comment: the negative
        half matches a phrase, so a paraphrased prohibition at a fifth site passes, and
        the positive per-path assertions are what bound it.
  - [x] 4.3 Register the `verify:acceptance-rule` key in `package.json`.
  - [x] 4.4 Add the script to `CHECKS` in `scripts/verify/verify-workflow.mjs`.
  - [ ] 4.5 Add the manifest row in `gates.manifest.json`.
  - [x] 4.6 Run `pnpm verify:gates-wired` — no on-disk check unregistered, no registered
        check unwired.
  - [x] 4.7 Mutation check: revert one assertion at a time and confirm the gate fails on
        that assertion and only that one.

- [x] 5.0 Migration & Rollback Plan
  - [x] 5.1 Confirm the validator change (2.0) and the store migration (1.3) are staged
        into ONE commit. A repository between them cannot read its own acceptance store
        — PRD §7 and §12.
  - [x] 5.2 **W1** — exercise the revert rather than asserting it: from the branch tip,
        `git revert` the combined commit into a scratch worktree, run the restored
        validator against the restored store, and confirm all sixteen entries validate.
        Paste the result into the Verification Ledger as evidence.
  - [x] 5.3 Confirm the partial-rollback path is written in PRD §7 and matches what 5.2
        observed; correct the PRD if they disagree.

- [x] 6.0 Phase 5 — Testing
  - [x] 6.1 Run every command in PRD §11 and fill the Verification Ledger with evidence.
        No ad-hoc additions, no omissions.
  - [x] 6.2 Run the cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`,
        `pnpm build`.
  - [x] 6.3 Mutation check on each of the three deny tests: revert the enum check and
        confirm each fails, and that reverting it fails those tests and only those.
  - [x] 6.4 Re-read PRD §12 and confirm no listed anti-pattern was introduced.

- [x] 7.0 Phase 6 — Final Auditing
  - [x] 7.1 Independent adversarial review; write
        `_docs/reviews/review-033-acceptance-authorship-provenance.md` with the
        machine-parsed `> **Key:** value` blockquote lines the review gate requires,
        including `Quorum`.
  - [x] 7.2 Spec-vs-code audit: every FR against what landed, every Target against the
        merge diff.
  - [x] 7.3 Re-run the site sweep independently of 3.1 — the reviewer sweeps, and does
        not merely confirm the author's list.
  - [x] 7.4 Reproduce and fix every finding; record each in **Deferrals & Decisions**
        with its disposition.

- [x] 8.0 Phase 7 — Learning
  - [x] 8.1 Write `_brain/learnings/free-text-field-is-the-unread-drift-ledger.md` — a
        rule enforced only by documentation drifts into the unenumerated field beside
        it, where the violations are honestly recorded and unreadable.
  - [x] 8.2 Add its pointer to `_brain/INDEX.md`.
  - [x] 8.3 Durable-artifacts check: every path in the PRD's Durable Artifacts appears
        in the merge diff, and Memory Outputs and Durable Artifacts still agree.
  - [x] 8.4 Close the `Acceptance authorship rule` deferral row in `STATUS.md`; if any
        part of it survives this PRD, retitle rather than delete it.
  - [x] 8.5 Write `_docs/wip/summary-033-acceptance-authorship-provenance.md`.
  - [x] 8.6 Capture protocol (`_brain/PROTOCOL.md` §7): anything non-derivable found
        during 1.0–7.0 that is not already a declared output.

---

## Verification Ledger

| Gate               | Command / Check                                              | Scope | Result  | Evidence | Notes                                                     |
| ------------------ | ------------------------------------------------------------ | ----- | ------- | -------- | ----------------------------------------------------------- |
| FR-1               | `pnpm --filter provegate test test/acceptance.test.ts`       | pkg   | passed  | 22 passed | schema required list + exactly two enum values            |
| FR-2               | `pnpm --filter provegate test test/acceptance.test.ts`       | pkg   | passed  | 22 passed | missing and out-of-enum refused by index, both values named |
| FR-2               | `pnpm check-types`                                           | repo  | passed  | 5 tasks, 0 errors | authorship is a union of two literals, not a string       |
| FR-3               | `pnpm --filter provegate test test/acceptance.test.ts`       | pkg   | passed  | 22 passed | mapping over the fixture; no method string changes        |
| FR-4               | `pnpm --filter provegate test test/content-canon.test.ts`    | pkg   | passed  | 12 passed | the two shipped sites carry the new rule                  |
| FR-5               | `pnpm verify:acceptance-rule`                                | repo  | passed  | 5 sites, 16 entries | cache-free: absence, five sites by path, 16 store entries      |
| FR-5               | `pnpm verify:gates-wired`                                    | repo  | passed  | 13 registered / 12 on disk | registered on every wiring surface                        |
| FR-6               | `pnpm verify:pack-drift`                                     | repo  | passed  | 49 pairs | record and twin reconcile, hash pair updated              |
| FR-6               | `pnpm verify:brain`                                          | repo  | passed  | store valid | both INDEX hooks resolve; amended record parses           |
| FR-7               | `pnpm --filter provegate test test/acceptance.test.ts`       | pkg   | passed  | 22 passed | waived reason names owner and authorship, both paths      |
| FR-8               | `pnpm verify:brain`                                          | repo  | passed  | store valid | ADR-0003 parses with non-empty sections and is indexed    |
| types              | `pnpm check-types`                                           | repo  | passed  | 5 tasks, 0 errors | floor                                                     |
| lint               | `pnpm lint`                                                  | repo  | passed  | 0 warnings | floor                                                     |
| test               | `pnpm test`                                                  | repo  | passed  | 1110 + 43 + 39 | floor — added tests pass, existing unchanged              |
| build              | `pnpm build`                                                 | repo  | passed  | 4 tasks clean | floor                                                     |
| rollback (W1)      | revert the combined commit in a scratch worktree, validate   | repo  | passed  | full revert: 10/10 tests green, store consistent. Partial revert (code only) refused: `acceptances[0]: unexpected field "authorship" in the acceptance entry`, entry null | task 5.2 — exercised, not asserted; §7 predicted both |
| independent-review | `_docs/reviews/review-033-acceptance-authorship-provenance.md` | repo  | passed  | verdict pass, 0/0/0 | verdict pass, critical = 0                                |

---

## Deferrals & Decisions

| # | Decision / Deferral | Rationale |
| - | ------------------- | --------- |
| D1 | **W5 — this PRD's readiness was self-scored.** The agent that wrote PRD-033 scored it, at the owner's explicit direction. | Carried into Phase 6: the independent review is the only outside look this work item gets, and 7.3 requires the reviewer to re-run the site sweep rather than confirm the author's list. |
| D2 | **W4 — an ambiguous future `method` value has no operational refusal.** §12 says an ambiguous entry is a reason to refuse rather than guess; nothing defines refusing. | The migration is one-time and mechanical, so this can only bite a future hand-edit. Recorded rather than built. |
| D4 | **4.5 left unchecked: the manifest row is unnecessary.** `gates.manifest.json` maps phases to commands, and `verify:acceptance-rule` reaches phase 4 through `pnpm verify:workflow`. | Adding the row would run the gate twice per phase. `verify:gates-wired` passes at 13 registered / 12 on disk with two surfaces, so the task plan's "four surfaces" was over-specified. Left unchecked because `[x]` means completed as written, and this was not. |
| D5 | **The PRD's site list was wrong in both directions.** It claimed two statements in `AGENT_BOOTSTRAP.md` (there is one — the other line is about push and method content) and missed `apps/web/app/sections/content.ts`, which states the rule twice. | Found by running the sweep from the repo root before editing, as 3.1 required, rather than trusting the PRD's table. Both web statements are about self-acceptance and remain true; one imprecise clause is a new deferral. `phase-6-final-auditing.md` turned out to be a pointer and needed no edit. |
| D6 | **The first migration was redone.** A `JSON.parse`/`stringify` round-trip rewrote `—` escapes to literal em dashes and reordered keys in `reason` and `items`. | The PRD forbade rewriting `method`, and `method` was preserved perfectly — the collateral landed in the fields the migration was not about, where the intended assertion could not see it. Redone as a line-level insertion; the fixture test now pins every prior field, not just `method`. |
| D7 | **A pre-existing authorization defect was fixed in scope.** `operatorGateOk`'s fallback branch discarded `problem`, so a malformed store was indistinguishable from an absent one. | Surfaced by the new deny tests, which asserted on a message only the committed path carried. `loadAcceptanceChecked`'s docstring already demanded that authorization callers read `problem`; the fix makes both paths agree. Inside the Conflict Surface and required for FR-2's stated criterion to hold on both paths. |
| D8 | **Two findings were raised against work done earlier in this same session.** The gate's self-accept assertion was satisfied by the record files' frontmatter `name:` line, and the amended record quoted the superseded sentence verbatim where the gate reads assertions. | Both fixed and mutation-checked. Recorded here because a self-run audit's only defence is that its findings are falsifiable and land on its own work. |
| D9 | **The deferral table is now at 15/15.** One row closed (`Acceptance authorship rule`), three opened. | At the cap. The next work item that needs a row must convert the oldest one first — surfaced to the owner rather than absorbed by dropping a finding. |
| D3 | **This PRD's own acceptance is its first consumer.** It is `operator-gated`, so its close needs an entry, and at merge time the new validator is on the branch — the entry authorizing this work must itself carry `authorship`. | Deliberate. PRD §7. |

---

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
| 2026-07-28 | 0.0 | Task file generated (Phase 3). Not started. |
| 2026-07-28 | 0.0–2.0 | Lease claimed, branch cut, seven records re-read (no stale path). Schema field, union type, validator enum, close message, migration and 12 tests — validator and migration in ONE commit (f2110c0). |
| 2026-07-28 | 3.0 | Sweep re-run from the repo root first: found a ninth site the PRD missed and one it double-counted. Three prose sites, record + packed twin, both INDEX hooks, drift ledger, ADR-0003. |
| 2026-07-28 | 4.0 | `verify:acceptance-rule` written and wired on two surfaces. Both assertion classes mutation-checked; each fires once. |
| 2026-07-28 | 5.0 | Revert exercised in a scratch worktree. Full revert consistent; partial revert refused at `acceptances[0]`. |
| 2026-07-28 | 6.0 | Full floor green: 1110 provegate tests (+17), 43 design, 39 web. Enum mutation fails exactly 4 tests and only those. |
| 2026-07-28 | 7.0 | Phase 6 pass, Critical 0 — two findings against this session's own work, both closed and mutation-checked. |
| 2026-07-28 | 8.0 | Learning written and indexed, deferral closed, three opened (15/15 cap). |

---

## Blockers / Open Questions

- (none)

---

## Operator Handoff

> Human/runtime/staging checks the agent cannot complete. Keep the corresponding task
> checkbox unchecked until resolved or explicitly accepted.
> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`}.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
| 3.15 | manual-qa | owner | Read the four amended prose sites and ADR-0003, and confirm the landed rule says what the owner decided: an agent may write the acceptance store, only on explicit in-session owner direction, only with `authorship: agent-transcribed`, and `owner` still names who decided | passed | This is a governance change to the method's own contract. The agent can verify the text is consistent across eight sites; it cannot verify the text is the rule the owner wanted |
