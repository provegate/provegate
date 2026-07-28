# Tasks: Prompt Store State Model — the Precondition for Integrity

> **PRD**: [prd-030-prompt-store-integrity.md](../../_prds/wip/prd-030-prompt-store-integrity.md)
> **Readiness**: [readiness-030-prompt-store-integrity.md](../../_readiness/wip/readiness-030-prompt-store-integrity.md)
> **Status**: Code Complete
> **Readiness Score**: 8.15/10 (PASS, iteration 2)
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
- **This item ships one document and no code.** A diff touching
  `packages/provegate/src/`, `scripts/`, or `.github/` fails the PRD's §6 and §12. The
  floor commands run to prove the tree is untouched, not to prove new code compiles.

---

## Memory Context

The slugs the PRD selected as Memory Inputs, carried here so implementation does not
re-derive them. Each one gets a re-open task below, bound to the work that depends on it:
a record is evidence only while it is true.

- `scope-out-the-layer-the-rounds-keep-hitting` — why this item exists in its narrowed
  form. Binds on 1.0: if the model starts specifying a mechanism, the scope error is
  recurring inside the fix.
- `score-band-prescribes-the-action` — binds on 6.0: if the review returns a finding set
  whose severity band prescribes rework, take that action rather than patching the named
  instance.
- `a-rule-corrected-survives-where-it-is-restated` — binds on 1.0 and 3.0: a decision the
  model makes must be stated where it is owned and nowhere else; a restatement in the
  learning or the summary is how the retracted design returned last time.
- `evidence-pattern-satisfied-by-the-template` — binds on 2.0: the `resolved:` lines are
  the gate, so they must carry real answers, never a placeholder that satisfies the pattern.
- `false-green-on-missing-file` — binds on 5.0: the presence command must be run against
  the real path and must fail if the document is absent.
- `derive-the-requirement-from-the-consumer` — reviewed here, `applied` on PRD-034. Binds
  on 1.0 T2/T4: the model's answer about which paths are in scope is an instance of this
  rule, and PRD-034 will be written to whatever the model says.
- `shipped-content-needs-a-delivery-gate` — reviewed here, `applied` on PRD-034. Binds on
  1.0 T1: "how activation is recorded when no file may be edited" is the same question the
  record's `PACK_MAP` gap asked.
- `push-is-human-by-omission` — not-applicable; preserved by adding nothing. Binds on the
  close: nothing in this item's Phase 7 or merge introduces a remote path.

---

## Relevant Files

- `_docs/design/prompt-store-state-model.md` — **the deliverable**; seven `### T<n>`
  sections, each closing with a `- T<n> resolved:` line
- `_brain/learnings/state-model-before-mechanism.md` — the durable record (Memory Output)
- `_brain/INDEX.md` — one pointer line for the record above (shared append-only)
- `_docs/reviews/review-030-prompt-store-integrity.md` — Phase 6 independent review artifact
- `_docs/wip/summary-030-prompt-store-integrity.md` — Phase 7 summary
- `_state/acceptances.json` — **owner-written only**; the agent never edits this file

### Notes

- No source file is touched. There is no test file to add, because there is no code: the
  structural gate is §11's `grep -qE` chain, and it runs against the document itself.
- `packages/provegate/src/core/run/init.ts::runInit` is **read-only context** for T1 and
  T2 (the additive-only constraint the model is written under), never an edit target.

---

## Tasks

- [x] 0.0 Pre-flight
  - [x] 0.1 Claim the work item: write a lock lease naming PRD-030, the phase, the TTL and
        `ownedPaths` mirroring the PRD's Conflict Surface
        (`_docs/design/prompt-store-state-model.md`,
        `_brain/learnings/state-model-before-mechanism.md`). Lease goes on the main
        checkout, not the worktree.
  - [x] 0.2 Run `gate queue` and confirm no active execution-phase claim overlaps those two
        paths — PRD-031 and PRD-034 are expected to be disjoint; if either has claimed
        them, stop and record the conflict.
  - [x] 0.3 Open each Memory Context record and confirm the paths and commands it names
        still exist; record any stale finding in **Deferrals & Decisions**.
  - [x] 0.4 Read PRD-029 as shipped (`packages/provegate/src/core/run/prompts.ts`,
        `init.ts::runInit`, `init.ts::PACK_MAP`) to establish what the installer actually
        does today. The model describes transitions of the store that exists, not of the
        store the retracted design imagined.

- [x] 1.0 The state model — transitions and actors
  - [x] 1.1 Create `_docs/design/prompt-store-state-model.md` with the four constraints
        stated up front, verbatim from the PRD §4: additive-only `init` (`wx`, nothing ever
        overwritten); no command deletes an adopter's file; no code path reaches a git
        remote; `packages/provegate` takes zero runtime dependencies. Every later section is
        written under them.
  - [x] 1.2 `### T1 Install into a repo that already has a config` — answer how activation
        is recorded when no file may be edited. Read `init.ts::runInit` before writing.
  - [x] 1.3 `### T2 Upgrade` — answer what changes, who applies it, and how the process
        terminates. Termination is the axis the retracted design failed on.
  - [x] 1.4 `### T3 Upgrade with one deliberately edited file` — answer whether the edit
        survives and what authority says so. Name the authority; "the tool respects it" is
        not an authority.
  - [x] 1.5 `### T4 Add / remove an adapter` — answer what happens to the previous file and
        who may delete it.
  - [x] 1.6 `### T5 Rename the store directory` — answer how the old tree is discovered, or
        state that it is not.
  - [x] 1.7 `### T6 Remove the config block` — answer what remains discoverable, stated as a
        limit if the answer is nothing.
  - [x] 1.8 `### T7 The receipt's own second write` — answer who writes it and whether it is
        itself a destination.
  - [x] 1.9 For every transition with no honest answer inside the constraints, record the
        limit and argue the impossibility **from a named constraint**. An asserted
        impossibility and an abandoned one produce identical text — this sub-task is the
        one the Phase 6 reviewer is briefed to attack (W10).
  - [x] 1.10 Re-read §12: confirm no sentence describes what a command does. Any such
        sentence belongs in PRD-034 or nowhere, and its presence here is the restatement
        failure this item was narrowed to stop.

- [x] 2.0 Structural conformance (the machine gate)
  - [x] 2.1 Close each `### T<n>` section with a single line of the exact form
        `- T<n> resolved: reads=<...> writes=<...> actor=<...> interrupt=<...>`, all four
        axes carrying a real answer.
  - [x] 2.2 Run the two `grep -qE` chains from PRD §11 locally and confirm exit 0. Then
        blank one axis in a scratch copy and confirm exit 1 — the gate is only evidence if
        it discriminates. Do not commit the scratch copy.
  - [x] 2.3 Confirm no `resolved:` line restates a mechanism (a command name, a flag, a file
        format). The line records who acts and what moves, not how a tool implements it.

- [x] 3.0 Migration & Rollback Plan (infra class — 20% of the readiness weight)
  - [x] 3.1 Record the ordering constraint in the model's closing section: PRD-034's §4 is
        blocked until this document is owner-approved, and no partial approval unblocks a
        subset of transitions.
  - [x] 3.2 Record the undo: this item's rollback is a revert of one document commit. No
        adopter state, no schema, no deploy ordering — state it explicitly rather than
        leaving the dimension implicitly empty.
  - [x] 3.3 Record what a **later** change to the model costs once PRD-034 exists: which
        FRs would be invalidated, and that the correction is a superseding revision of this
        document rather than an edit in place.

- [ ] 4.0 Owner approval (operator-owned — leave unchecked)
  - [ ] 4.1 Present the model to the owner for review, transition by transition. Seven
        rows in **Operator Handoff**, one per transition — not a single "approve the doc"
        checkbox (readiness W9).
  - [ ] 4.2 If the owner rejects a transition: answer the named gap, re-present that row.
        The item stays open and PRD-034 stays blocked. Do not close on a partial approval.
  - [ ] 4.3 The owner records the acceptance entry in `_state/acceptances.json` naming
        `_docs/design/prompt-store-state-model.md`. **An agent never writes this file, and
        never checks 4.3 on the owner's behalf.**

- [x] 5.0 Phase 5 — Testing
  - [x] 5.1 Run `test -f _docs/design/prompt-store-state-model.md`; paste command and
        output into the Verification Ledger.
  - [x] 5.2 Run the T1–T4 `grep -qE` chain; paste command and output.
  - [x] 5.3 Run the T5–T7 `grep -qE` chain; paste command and output.
  - [x] 5.4 Run the cross-cutting floor — `pnpm check-types`, `pnpm lint`, `pnpm test`,
        `pnpm build` — and confirm each is unchanged from the pre-work baseline. A green
        floor here means the tree was not touched, which is this item's §6 criterion.
  - [x] 5.5 Update every ledger row with `passed` / `failed` and the evidence. A row that
        was not executed is never `passed`.

- [ ] 6.0 Phase 6 — Final Auditing
  - [ ] 6.1 Request an independent review from a session that did not write the model,
        default a different model family. Brief it on two questions specifically: (a) for
        each transition recorded as an accepted limit, is the impossibility argued from a
        stated constraint or merely asserted (W10)? (b) does any sentence describe what a
        command does — a mechanism that belongs to PRD-034?
  - [ ] 6.2 Confirm the diff contains no change under `packages/provegate/src/`,
        `scripts/`, or `.github/` — the review-time check the PRD's §6 assigns here because
        no allowlisted §11 command reads a diff.
  - [ ] 6.3 Save the artifact at `_docs/reviews/review-030-prompt-store-integrity.md` with
        the machine-checked metadata block: PRD, verdict, reviewer, base SHA, severity
        counts. `Verdict: pass` requires `Critical: 0`.
  - [ ] 6.4 Fix every finding or waive it with a one-line justification in the ledger.

- [ ] 7.0 Phase 7 — Learning
  - [x] 7.1 Write `_brain/learnings/state-model-before-mechanism.md`: when a design's state
        transitions are unwritten, each remediation round repairs the counterexample it was
        given and produces a new one; the tell is a **flat remediation trajectory** across
        rounds (4.48, 5.73, 5.90, 5.63, 4.53 on PRD-029, then 4.50 on PRD-030's first
        round), and the fix is to make the model itself the work item. Include `watch`,
        `links`, and the `**Why:**` / `**How to apply:**` lines the protocol requires.
  - [x] 7.2 Add the one-line pointer to `_brain/INDEX.md` under Workflow gotchas. Hook
        ≤ 120 characters. `_brain/INDEX.md` is `sharedAppendOnly` — append, never rewrite
        neighbouring lines.
  - [ ] 7.3 Confirm every Durable Artifact path appears in the merge diff: the learning,
        the INDEX pointer, the review artifact. A declared path absent from the diff
        invalidates the close.
  - [ ] 7.4 Write `_docs/wip/summary-030-prompt-store-integrity.md`. State the scope
        narrowing and its cause once; do not restate the model's decisions — they are owned
        by the model document (`a-rule-corrected-survives-where-it-is-restated`).
  - [ ] 7.5 Confirm the PRD's `## Memory Outputs` as committed on `main` still matches what
        landed. Appending is allowed with a rationale; removing or repathing is weakening.

---

## Verification Ledger

One row per PRD §11 command (pre-populated by Phase 3, all `pending`), plus the
cross-cutting floor and the review row. `gate run` reads the `independent-review` row:
it must be `passed` and name the review artifact path.

| Gate               | Command / Check                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Scope | Result  | Evidence | Notes                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------- | -------- | ------------------------------------------------------------------------ |
| FR-1               | `test -f _docs/design/prompt-store-state-model.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                       | repo  | passed  | `exit 0` | presence; fails on absence                                              |
| FR-1               | `grep -qE "^- T1 resolved: reads=\S.* writes=\S.* actor=\S.* interrupt=\S.*" _docs/design/prompt-store-state-model.md && grep -qE "^- T2 resolved: reads=\S.* writes=\S.* actor=\S.* interrupt=\S.*" _docs/design/prompt-store-state-model.md && grep -qE "^- T3 resolved: reads=\S.* writes=\S.* actor=\S.* interrupt=\S.*" _docs/design/prompt-store-state-model.md && grep -qE "^- T4 resolved: reads=\S.* writes=\S.* actor=\S.* interrupt=\S.*" _docs/design/prompt-store-state-model.md`               | repo  | passed  | `exit 0`; blanking `T4 reads=` in a scratch copy → `exit 1` | transitions 1–4 answered on all four axes; the gate discriminates |
| FR-1               | `grep -qE "^- T5 resolved: reads=\S.* writes=\S.* actor=\S.* interrupt=\S.*" _docs/design/prompt-store-state-model.md && grep -qE "^- T6 resolved: reads=\S.* writes=\S.* actor=\S.* interrupt=\S.*" _docs/design/prompt-store-state-model.md && grep -qE "^- T7 resolved: reads=\S.* writes=\S.* actor=\S.* interrupt=\S.*" _docs/design/prompt-store-state-model.md`                                                                                                                                      | repo  | passed  | `exit 0` | transitions 5–7, same discipline                                        |
| types              | `pnpm check-types`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | repo  | passed  | `5 cached, 5 total >>> FULL TURBO` | floor; full cache hit IS the evidence no package input changed |
| lint               | `pnpm lint`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | repo  | passed  | `4 cached, 4 total >>> FULL TURBO` | floor                                              |
| test               | `pnpm test`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | repo  | passed  | `7 successful, 7 total; 7 cached >>> FULL TURBO` | floor; existing tests unchanged, none added |
| build              | `pnpm build`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | repo  | passed  | `4 cached, 4 total >>> FULL TURBO` | floor                                              |
| independent-review | `_docs/reviews/review-030-prompt-store-integrity.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                     | repo  | pending |          | verdict pass, critical = 0; reviewer is not the authoring session         |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

> Short single-line entries written **during Phase 4** when a non-obvious decision,
> scope cut, or accepted deviation is taken. Format: `- <task#> — <decision>; <≤1
sentence rationale>`. Never inline on sub-task lines.

- (none yet)

---

## Progress Log

> Multi-line runtime context or deviations that don't fit one line.

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

---

## Blockers / Open Questions

- (none)

---

## Operator Handoff

> Human/runtime/staging checks the agent cannot complete. Keep the corresponding task
> checkbox unchecked until resolved or explicitly accepted.
> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`}.

Seven review rows plus the acceptance row (readiness W9: the transitions are enumerated so
the approval cannot be a skim of one checkbox).

| Task | Category  | Owner | Required Check                                                                                             | Status  | Notes                                                       |
| ---- | --------- | ----- | ------------------------------------------------------------------------------------------------------------ | ------- | -------------------------------------------------------------- |
| 4.1  | manual-qa | owner | T1 install-with-existing-config: activation recording is answered, or its impossibility argued from a constraint | pending |                                                             |
| 4.1  | manual-qa | owner | T2 upgrade: what changes, who applies it, and how it terminates                                              | pending | termination is where the retracted design failed            |
| 4.1  | manual-qa | owner | T3 upgrade with an edited file: the edit's survival and the authority behind it                              | pending | "the tool respects it" is not an authority                  |
| 4.1  | manual-qa | owner | T4 add / remove an adapter: the previous file's fate and who may delete it                                   | pending |                                                             |
| 4.1  | manual-qa | owner | T5 rename the store directory: discovery of the old tree, or the stated limit                                | pending |                                                             |
| 4.1  | manual-qa | owner | T6 remove the config block: what remains discoverable, or the stated limit                                   | pending |                                                             |
| 4.1  | manual-qa | owner | T7 the receipt's second write: who writes it and whether it is a destination                                 | pending |                                                             |
| 4.3  | manual-qa | owner | Acceptance entry in `_state/acceptances.json` naming `_docs/design/prompt-store-state-model.md`               | pending | owner-written only; the merge gate refuses without it       |
