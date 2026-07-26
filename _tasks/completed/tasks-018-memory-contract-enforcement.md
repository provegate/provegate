# Tasks: Closed-Loop Memory Contract and Enforcement

> **PRD**: [prd-018-memory-contract-enforcement.md](../../_prds/wip/prd-018-memory-contract-enforcement.md)
> **Readiness**: [readiness-018-memory-contract-enforcement.md](../../_readiness/wip/readiness-018-memory-contract-enforcement.md)
> **Status**: In Progress
> **Readiness Score**: 8.33/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-25
> **Updated**: 2026-07-25

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- Phase 4 agents hold a valid PRD-018 lock lease before editing implementation files or
  this ledger.
- Autonomous Close is **operator-gated**: the merge gate refuses until an owner-signed
  acceptance entry exists.
- No sub-task may introduce `any`, a lint bypass, a swallowed failure, a runtime
  dependency, a network call, or a push code path.
- **Phase 4 may not start until `_state/prds.json` records PRD-017 as Ship Verified**
  (task 0.2). This PRD builds directly on its parser and config.
- **Activation may not land while a foreign lease is active** (tasks 6.5 and 9.5). This
  is the whole safety argument for turning the contract on; it is not advisory.

---

## Memory Context

Records to open and confirm still accurate before the dependent task starts (task 0.3).

- `verify-check-phase-placement` — brain validation runs after capture, which is why
  `verify:brain` wires into Phase 7 and not earlier.
- `durable-artifact-must-commit` — exact output evidence must land in the merge diff, not
  merely be declared.
- `gate-wire-or-delete` — both the root and practices gates must reach an executing
  surface, or they are decoration.
- `push-is-human-by-omission` — activation adds no push path.
- `turbo-cache-masks-out-of-input-reads` — `check-egress` reads build output; the cache
  fix that made that safe landed separately as W1, so confirm it is still in place.

---

## Relevant Files

### Contract core

- `packages/provegate/src/core/memory/artifacts.ts` — new: the Inputs/Outputs grammar,
  used by the template, the lint, the runner, and the review.
- `packages/provegate/src/core/gates/prd-ready.ts` — the readiness watch gate.
- `packages/provegate/src/core/run/chain.ts`, `run/durable.ts` — Phase 7 enforcement and
  the base-ref weakening proof.
- `packages/provegate/src/core/run/init.ts` — fresh-practices generation.
- `packages/provegate/src/core/run/merge.ts` — new behavior: `gate land` reads
  `_state/locks` under the workspace mutex. It reads no locks today.

### Method content (traceable to the PRD-017 addendum only)

- `packages/provegate/templates/prd-template.md`,
  `packages/provegate/templates/{readiness,tasks}-template.md`
- `packages/provegate/prompts/**` — ten files, one stated obligation each (FR-3 table)
- `packages/provegate/practices/**`, `packages/provegate/practices/shims/**`

### Root activation (last)

- `workflow.config.json` (new), `gates.manifest.json` (new) — both become worktree
  control artifacts the moment they exist.
- `AGENT_BOOTSTRAP.md`, `CLAUDE.md`, `.cursor/rules/brain.mdc`, `_brain/PROTOCOL.md`,
  `_brain/INDEX.md`, `_brain/adr/ADR-0001-closed-loop-agent-memory.md` (new)
- `packages/provegate/README.md`, `apps/docs/content/docs/method.mdx`,
  `scripts/verify/pack-drift-ledger.json`

### Tests

- `test/content-templates.test.ts`, `test/content-prompts.test.ts`,
  `test/prd-ready.test.ts`, `test/chain.test.ts`, `test/init.test.ts`,
  `test/manifest.test.ts`, `test/open.test.ts`, `test/merge.test.ts`,
  `test/practices-pack.test.ts`

### Notes

- The manifest rule is deep-merge semantics, not style: a fresh practices manifest
  **omits** `phases.4` so configured floors survive, while this repo's manifest repeats
  the four floor commands before appending two. `phases.4: []` erases the floor and is
  forbidden by name.
- The shipped default floor order is check-types, lint, **build**, test — verified in
  `defaultManifest()`. Root Phase 4 appends `verify:workflow` and `check-egress` after it,
  and `check-egress` requires build to have run first.

---

## Tasks

- [x] 0.0 Pre-flight and ownership
  - [x] 0.1 Run `gate open PRD-018 --worktree` from the base checkout; confirm the lease
        covers the PRD Conflict Surface and record branch/worktree in the Progress Log.
  - [x] 0.2 Verify `_state/prds.json` records PRD-017 as Ship Verified. If not, STOP.
  - [x] 0.3 Open the five Memory Context records; confirm the paths and commands each
        names still exist and note any stale finding in **Deferrals & Decisions**.
  - [x] 0.4 Re-confirm W1's fix is still in place: `pnpm verify:turbo-inputs` passes and
        `web#build` still hashes `apps/web/app/**`. FR-6 wires `check-egress` into the
        floor on the strength of that fix; if it regressed, the gate would scan replayed
        bytes.
  - [x] 0.5 Capture the green baseline for `pnpm test`, `pnpm verify:workflow`, and
        `pnpm check-egress`; a pre-existing red is ledgered, never normalized silently.

- [x] 1.0 FR-1 — The artifact contract
  - [x] 1.1 Implement the Memory Inputs/Outputs grammar from the PRD-017 addendum in
        `packages/provegate/src/core/memory/artifacts.ts`: input dispositions
        (`applied` / `reviewed` / `not-applicable`) with slug and rationale; outputs as
        exact repo-relative learning or ADR paths with a rationale.
  - [x] 1.2 Enforce mutual exclusion: a non-empty output set may not contain `none`, and
        `none` requires a reason. This is the ambiguity the retired draft shipped.
  - [x] 1.3 Every declared output is also a Durable Artifact — validate the pairing here
        so the runner does not have to infer it later.
  - [x] 1.4 Normalize `path.ts::SymbolName` to `path.ts` before any glob match; the
        symbol suffix is the obvious false negative in target matching.
  - [x] 1.5 Add the grammar to `packages/provegate/templates/prd-template.md`.
  - [x] 1.6 Cover it in `packages/provegate/test/content-templates.test.ts`, including the
        ADR-output-plus-`none` collision failing.

- [x] 2.0 FR-2 — Readiness watch gate
  - [x] 2.1 In `packages/provegate/src/core/gates/prd-ready.ts`, require both sections
        when `memory.enabled` is true; resolve inputs against active indexed records and
        reject duplicates, superseded records, and missing ones by name.
  - [x] 2.2 Match each record's `watch` globs against the PRD's normalized FR Targets and
        fail on any overlap that has no input disposition, naming the record and the
        normalized path.
  - [x] 2.3 Assert the disabled path in `packages/provegate/test/prd-ready.test.ts`:
        with memory off, behavior is byte-identical to today and historical PRDs are never
        rewritten.
  - [x] 2.4 Assert the enabled path against fixtures covering each rejection reason
        separately — a single "invalid" case cannot prove five different refusals.

- [x] 3.0 FR-3 — Recall through Phase 1–7 (W3, per-file)
  - [x] 3.1 Apply the PRD's obligation table one file at a time across
        `packages/provegate/prompts/**`: phases 1–7, `knowledge-ingest.md`,
        `knowledge-lint.md`, and `orchestration-runner.md`. Each file gains exactly the
        obligation the table names — no more, and nothing invented outside the addendum.
  - [x] 3.2 Register any new placeholder token in `packages/provegate/prompts/PLACEHOLDERS.md`;
        leave `prompts/adapters/**` vendor-neutral and obligation-free.
  - [x] 3.3 Carry the contract into `templates/readiness-template.md` and
        `templates/tasks-template.md` (a Memory Context section and a per-record re-open
        task, matching what the phase-3 obligation states).
  - [x] 3.4 Update `practices/templates/AGENT_BOOTSTRAP.template.md` and
        `practices/shims/**` to match.
  - [x] 3.5 In `packages/provegate/test/content-prompts.test.ts`, assert the obligation
        **per file** — ten separate assertions keyed to the table. A test that only proves
        the directory changed is the failure mode W3 exists to prevent.
  - [x] 3.6 Assert every pre-existing frozen snapshot file is byte-unchanged, and that all
        new method content traces to the PRD-017 addendum.

- [x] 4.0 FR-4 — Phase 7 output and watch enforcement
  - [x] 4.1 In `packages/provegate/src/core/run/chain.ts` and `run/durable.ts`, check that
        every exact declared output appears in Durable Artifacts **and** in the merge
        diff — declaration without evidence is the `durable-artifact-must-commit` trap.
  - [x] 4.2 Check that every watched file changed by the diff has an input disposition.
  - [x] 4.3 Run `memory.verifyCommand` through the existing command-safety allowlist and
        require exit 0 **after** capture, per `verify-check-phase-placement`.
  - [x] 4.4 Dry-run prints every check it would perform; missing records, missing config,
        and missing baselines all fail closed.
  - [x] 4.5 Cover the whole set in `packages/provegate/test/chain.test.ts`, including the
        Phase 7 ordering.

- [x] 5.0 FR-5 — Base-ref weakening proof (W2)
  - [x] 5.1 Compare working declarations against the same PRD blob on the configured base
        ref — never against working state, which the editing agent controls.
  - [x] 5.2 Implement the matrix: append-only emergent output is legal; removal, type or
        path change, and replacement with `none` are weakening. An `eligible` PRD refuses
        outright; an `operator-gated` PRD requires both a changelog approval entry and
        owner acceptance.
  - [x] 5.3 W2 — the non-worktree path has no baseline guarantee. When the PRD blob is
        absent from the base ref, refuse with cause **and** remedy in one message:
        "PRD-NNN has no committed copy on `<base>`; commit the PRD to the base branch
        before closing, or reclaim with `--worktree`."
  - [x] 5.4 Cover both flows in `packages/provegate/test/chain.test.ts` — the worktree
        happy path and the non-worktree refusal text. Only the second is new.

- [x] 6.0 FR-6 — Safe activation, manifest wiring, and the land barrier
  - [x] 6.1 In `packages/provegate/src/core/run/init.ts`, generate memory-enabled config
        and a manifest containing `phases.7` only for a fresh `gate init --practices`.
        The generated manifest must **omit** `phases.4` entirely so default floor commands
        survive deep merge.
  - [x] 6.2 Assert in `packages/provegate/test/init.test.ts` that existing config,
        manifests, and entrypoints stay byte-unchanged, and in `test/manifest.test.ts`
        that a fresh manifest's absent `phases.4` still resolves to the four floor
        commands while `phases.4: []` erases them.
  - [x] 6.3 Write this repo's root `gates.manifest.json`: Phase 4 as `check-types`,
        `lint`, `build`, `test`, `verify:workflow`, `check-egress` — the shipped default
        order first, then the two additions, with `build` before `check-egress` because
        the scanner reads build output. Phase 7 runs `verify:brain`.
  - [x] 6.4 Write the root `workflow.config.json` enabling memory. Both files are new
        worktree control artifacts from this moment; PRD-021 later adds one key to the
        config and PRD-022 closes the revalidation residual.
  - [x] 6.5 Implement the activation barrier in `packages/provegate/src/core/run/merge.ts`:
        `gate land` reads `_state/locks` **inside the workspace mutex** (`run/mutex.ts`,
        the same critical section that guards lease claims) and refuses while a foreign
        lease is active. Outside the mutex it is a check-then-merge race, not a barrier.
  - [x] 6.6 In `packages/provegate/test/merge.test.ts`, assert the refusal with a foreign
        lease present, the pass with none, and that the refusal message names the lease.
  - [x] 6.7 W5 — in `packages/provegate/test/open.test.ts`, prove the control-artifact
        **introduction** transition: a worktree leased before these files exist is refused
        on reuse, and succeeds after merging the base.
  - [x] 6.8 Record the residual honestly in **Deferrals & Decisions**: a direct
        `git merge` bypasses the barrier, and a surviving worktree does **not** converge,
        because control artifacts are revalidated only on the claim path. Do not write a
        convergence claim anywhere — PRD-022 owns closing it.

- [x] 7.0 FR-7 — Dogfood, ADR, and parity
  - [x] 7.1 Apply the contract to `AGENT_BOOTSTRAP.md`, `CLAUDE.md`,
        `.cursor/rules/brain.mdc`, and `_brain/PROTOCOL.md`.
  - [x] 7.2 Write `_brain/adr/ADR-0001-closed-loop-agent-memory.md` — the declared Memory
        Output of this PRD — and add its INDEX pointer. It carries all four ADR sections.
  - [x] 7.3 Document the method and the manifest safety rule in
        `apps/docs/content/docs/method.mdx` and `packages/provegate/README.md`.
  - [x] 7.4 Port every change into its genericized `practices/**` counterpart, then run
        `node scripts/verify/verify-pack-drift.mjs --reconcile` and **read its per-pair
        output** — every printed line is a change being accepted. Paste it into the
        Progress Log.
  - [x] 7.5 Confirm no repo-specific fact leaked into the package copies (no repo name, no
        wave numbering, English only) via the existing hygiene assertions.
  - [x] 7.6 Confirm no doctor, find, or stats CLI shipped here — that surface is PRD-019.

- [x] 8.0 Migration & Rollback Plan (infra parent — 20% of the readiness weight)
  - [x] 8.1 Order the work as the PRD requires: contract, prompts, runner, tests — then
        root activation **last**. Enabling before every gate exists is the one sequencing
        error that cannot be undone by a later commit.
  - [x] 8.2 Prove the disabled path end to end: with `memory.enabled: false`, `gate check`,
        `gate status`, and the gate chain behave byte-identically to the 0.5 baseline.
  - [x] 8.3 Record the rollback in **Deferrals & Decisions**: set `memory.enabled: false`
        and remove the root Phase 7 wiring; Markdown records survive and no data or remote
        migration exists.
  - [x] 8.4 Record what activation costs adopters: nothing. Fresh installs get the
        memory-enabled config; existing config, manifests, and entrypoints are never
        auto-edited.
  - [x] 8.5 W13 — confirm PRD-022 is a real PRD rather than a stub before this PRD lands,
        so FR-6's residual has an owner. It is drafted at
        `_prds/wip/prd-022-control-artifact-revalidation.md`; verify it still carries FRs
        and verification commands.

- [x] 9.0 Phase 5 — Execute verification
  - [x] 9.1 Run every PRD §11 command exactly as written and fill the matching
        Verification Ledger rows with evidence; no substitutions, no omissions.
  - [x] 9.2 Run the cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`,
        `pnpm build`, `pnpm verify:workflow`, `pnpm check-egress`; record exit codes.
  - [x] 9.3 Run `node packages/provegate/dist/cli.js check PRD-018` and
        `node packages/provegate/dist/cli.js check --wiring`.
  - [x] 9.4 Run `gate run` against this repo with the new root manifest and confirm
        resolved Phase 4 is exactly the six commands in order, and Phase 7 runs
        `verify:brain`.
  - [ ] 9.5 Immediately before the merge, re-read `_state/locks` and confirm no foreign
        lease is active. The 0.x measurement is stale by now, and this is the barrier the
        activation depends on.

- [ ] 10.0 Phase 6 — Independent adversarial audit
  - [x] 10.1 After Phase 5 is green, obtain an independent review (different model family,
        never the implementing agent) of the merge diff against the PRD, the PRD-017
        addendum, and watch items W1–W13. Direct it at the three sharpest attacks: can a
        declared output be removed while the gate stays green; does a watch overlap
        actually block; and did anything become reachable while memory is disabled.
  - [x] 10.2 Save the verdict to
        `_docs/reviews/review-018-memory-contract-enforcement.md`; the ledger row may read
        `passed` only with verdict `pass` and `Critical: 0`.
  - [x] 10.3 For each finding, append remediation sub-tasks here, fix under the same
        lease, re-run the affected Phase 5 gates, and obtain a fresh verdict.
    - [x] 10.3.1 [P1-1] `outputWeakenings` treats a malformed or section-less baseline as
          "nothing was promised". Fail closed on a baseline whose Memory Outputs section is
          absent, unparseable, or declares neither form — addendum §7 requires it and only
          the uncommitted case was handled.
    - [x] 10.3.2 [P1-2] Bind the weakening approval to the removal: the Changelog row must
          name the exact path in a backticked span, and the acceptance entry must carry an
          `items` element naming that path. Today any owner row containing the path as a
          substring plus any acceptance for the PRD waives it.
    - [x] 10.3.3 [P1-3] A deleted output counts as a capture, because `collectDiffFiles`
          is `git diff --name-only` and includes deletions. Require the declared path to be
          added or modified AND to exist as a regular file at close.
    - [x] 10.3.4 [P1-4] Phase 7 never resolves declared inputs, and `activeRecords` drops
          unreadable records so deleting a watched record erases its watch. Reuse the
          readiness resolution at close and make an unreadable indexed record blocking.
    - [x] 10.3.5 [P1-5] The repaired `frTargets` feeds the hard-cap engine outside the
          `memory.enabled` branch, so a memory-disabled repository's behavior changed.
          Scope the entry-aware parse to the memory gate and leave hard caps on the legacy
          target set, with the migration recorded as a deferral.
    - [x] 10.3.6 [P1-6] `prompts/phase-5-testing.md` carries a memory obligation that
          addendum §8 explicitly denies phase 5. The PRD's FR-3 table contradicts the
          addendum, and the addendum is law. **Owner decision required** — remove the
          obligation, or approve a new addendum entry.
    - [x] 10.3.7 [P1-7] The packed `AGENT_BOOTSTRAP.template.md` omits that an `eligible`
          work item refuses weakening outright; it says only that acceptance is needed. The
          root copy is correct. Port the split, then reconcile pack-drift.
    - [x] 10.3.8 [P2-8] `pathProblem` accepts a directory (`_brain/learnings`) that the
          close gate later rejects. Require a `.md` record path so readiness and Phase 7
          agree.
    - [x] 10.3.9 [P2-9] The provenance test asserts that addendum phrases exist, not that
          each shipped prompt addition traces to its own obligation — it is the test that
          should have caught [P1-6]. Bind per prompt. Depends on 10.3.6.
    - [x] 10.3.10 [P2-10] The mutex fixture proves acquisition, not retention. Prove the
          claim mutex is held ACROSS the merge and its post-merge verification.
    - [x] 10.4 Round 2 (independent, same reviewer family, directed at the FIXES).
          Verdict FAIL: 5 [P1] + 4 [P2], every round-1 fix confirmed closed. All nine
          re-verified against source before acceptance; three by direct measurement.
      - [x] 10.4.1 [R2-P1-1] `capturedDiffFiles` preferred `origin/<base>` while the merge
            targets the LOCAL base. Measured on this repository: `origin/main` is one
            commit behind `main`, so a record added on unpushed local base would have
            counted as this PRD's capture — fail open. Pinned to the local base, `-z`
            parsing, and a git error now REFUSES instead of falling back to the weaker
            name-only list.
      - [x] 10.4.2 [R2-P1-2] A fenced `## Memory Outputs` example shadowed the real
            section, because section lookup takes the first heading. Contract reads now
            run on a fence-stripped document, and a section declared twice is an
            ambiguity rather than a duplicate.
      - [x] 10.4.3 [R2-P1-3] Same shadowing let a fenced `## Changelog` approve a
            removal the PRD never recorded. Same fix, plus exactly-one-Changelog.
      - [x] 10.4.4 [R2-P1-4] Any repo-relative `.md` path counted as a record, so
            `learning: docs/release-note.md` passed and adding that ordinary file
            satisfied capture while the store and INDEX never changed.
            `outputPlacementIssues` binds the declared type to `<memory.root>/learnings/`
            or `<memory.root>/adr/`.
      - [x] 10.4.5 [R2-P1-5] `existsSync` accepted a directory, an added submodule, or a
            symlink as the captured file. Now `lstatSync(...).isFile()`.
      - [x] 10.4.6 [R2-P2-6] The provenance deny-list named four exact tokens, so an
            obligation phrased around `_brain` or "detail file" escaped it. Widened, and
            each granted phase must carry its OWN §8 clause and no other phase's.
      - [x] 10.4.7 [R2-P2-7] An unreadable indexed record failed only at close, so
            readiness passed a PRD that could never close. Now a shared store issue.
      - [x] 10.4.8 [R2-P2-8] **The deferral this PRD claimed to have recorded did not
            exist.** The `frTargets` comment and task 10.3.5 both said the hard-cap
            migration was "recorded as a deferral" while `STATUS.md` carried no such row —
            a false claim of governance, which is worse than the split it excused. The row
            now exists with an owner and a due date.
      - [x] 10.4.9 [R2-P2-9] The capture assertions were vacuous: replacing
            `capturedDiffFiles` with `return null` would have left them green, because the
            tests inject `changedFiles` and `existsSync` did the rejecting. A fixture now
            names an EXISTING file in `changedFiles` that the feature branch never touched,
            so only the real diff status can refuse it.
      - [x] 10.5 Rounds 5-16, each aimed at the previous round's fixes. Counts:
            5 (4 CRITICAL, 3 MEDIUM), 6 (4,3), 7 (4,3), 8 (3,3), 9 (2,4), 10 (3,2),
            11 (5,1), 12 (5,1), 13 (5,4), 14 (4,3), 15 (1,3), 16 (2,2). Every finding
            re-verified against source before acceptance; every one remediated with a
            regression that fails when the fix is reverted. Round 11 is the one to
            remember: all five of its criticals were fail-OPEN.
      - [x] 10.6 **Round 13 did not complete** — the reviewer's provider flagged the
            request as a possible cybersecurity risk and killed the turn. Recorded as an
            infrastructure refusal, not a verdict. Rephrasing the same review in
            first-party correctness terms ran to completion; the two candidate defects it
            named before being cut off were both reproduced and both real.
      - [x] 10.7 **Owner decision after round 13: narrow the contract grammar instead of
            matching CommonMark.** Sixteen rounds found ~5 renderer disagreements each and
            never converged; by round 13 four of nine findings were the reader refusing
            VALID Markdown. A contract section now declares its own shape — column-zero
            bullets, continuations, prose, blank lines — and anything else refuses with a
            message naming the construct. Every rule measured against the corpus first.
      - [x] 10.8 Round 17, commissioned as the CONFIRMING round. It reconstructed every
            round-16 counterexample and found them fixed, then found three more in the
            recording category — each a generalization not carried far enough — plus three
            refuse-only. All six remediated. It confirmed the three statements the close
            rests on: template and PRD-017/018/019 satisfy the grammar, none of 108
            artifacts is unreadable, and a memory-disabled repo is untouched.
      - [x] 10.9 Round 18. Confirmed round 17's fixes, then found five CRITICAL — four of
            them one shape: the reader disagreeing with a renderer about where a block
            begins or ends (span lookahead crossing a fence, NBSP closing a fence, LF-only
            splitting against `/m`, U+2028 as a line ending). The fifth: zero-width
            characters counting as a visible rationale. Three LOW ran the other way —
            refusals naming constructs the page does not contain — and those are the ones
            worth recording, because the narrowing only holds if refusals are as honest as
            reads. All eight remediated; 767 tests.
      - [x] 10.10 Round 19, aimed at the scanner. Five CRITICAL and seven MEDIUM, and
            eleven of the twelve traced to ONE fault: the scanner and the container check
            derived block state independently from the same document. Remedied
            structurally — `scanDocument` classifies each line once and every downstream
            reader asks it. The scanner also gained indented code, complete-inline-comment
            rules, the short comment forms, and a comment stop in the span lookahead.
            Backslash escapes honored; the entity rule settled on an enumerated invisible
            set. 778 tests; every PRD still parses clean.
      - [x] 10.11 Round 20, deliberately UNAIMED, to measure whether round 19's refactor
            held. It did: "no defect found in the contract scanner this round" — the first
            positive evidence in this review that a fix converged. All eight findings (6
            CRITICAL, 2 HIGH) landed in the enforcement machinery no round had aimed at:
            `gate land` skipping the memory gates, a branch erasing its own watch trigger,
            approval evidence read then discarded, an origin-preferring diff, FR targets
            read from raw Markdown, a schema-invalid acceptance authorizing a weakening,
            an over-broad land barrier, and activation written before what it activates.
            Two holes were encoded in the fixtures. 785 tests, each new regression
            mutation-checked.
      - [x] 10.12 Round 21, the second unaimed round, half of it pointed at round 20's own
            fixes. Three were correct and complete; FIVE were incomplete — correct for the
            case that prompted them and silent one step over. Seven CRITICAL, five HIGH,
            one MEDIUM, all remediated: the contract could be switched OFF by the branch,
            the pack's validator was still skippable at land, relocating the index erased
            the base store, narrowing a watch escaped the union, rename sources were
            computed and discarded, acceptance types went unchecked, invalid leases read as
            expired, a record's rationale could hide in a comment, quoted YAML values made
            dead watches, CRLF records were rejected, path spellings diverged, root-level
            artifacts were dropped, and `gate init --practices` wrote a config that cannot
            load. Scanner extracted to `memory/scan.ts` so `parse.ts` shares one authority.
            798 tests; all eleven regressions mutation-checked.
      - [x] 10.13 Round 22, designed around round 21's finding: each of the eleven
            round-21 fixes was checked for the input one step over. NINE had one. Four
            CRITICAL — the acceptance half of the committed-evidence rule, a sparse base
            config handing the branch its own index back (reopening the hole round 21 had
            just closed), validator DELETION as opposed to skipping, and a fenced
            `## Operator Handoff` disarming the owner gate through `sectionMatching`.
            Seven HIGH and two MEDIUM followed. 808 tests; ten regressions, all
            mutation-checked, one rewritten after its mutation was caught by a neighbour.
      - [x] 10.14 Round 23, same design as round 22 and scope-labelled per finding: 13 of
            13 fixes had an adjacent case. Twenty-three findings (10 CRITICAL, 7 HIGH, 5
            MEDIUM, 1 LOW), all remediated — including `--dry-run=true` running the live
            merge, an indented `## Operator Handoff` reading zero rows, `memory: null`
            disabling every gate, and configured paths outside `memory.*` writing outside
            the repository. Two findings were about this suite; both tests rewritten.
            818 tests, eight regressions, all mutation-checked.
      - [x] 10.15 Round 24, with DISHONEST REFUSAL ranked as high as fail-open because
            round 23's remediation changed behaviour repository-wide. Of its twenty
            changes, NINE overshot — refusing correct work — and one generalized cleanly.
            Twenty findings, all remediated except one that was REJECTED on review: masking
            inline code for hard-cap evidence would refuse every genuine evidence line.
            Three tests were findings and were rewritten. 825 tests; seven regressions,
            all mutation-checked.
      - [x] 10.16 Round 25, with a required CONFIDENCE label per finding after round 24
            produced one that was wrong. All THIRTEEN came back `high` and all thirteen
            were real — calibration removed the padding without losing anything. The round
            independently confirmed that rejecting round 24's hard-cap proposal was
            correct. Its worst finding was a regression created one round earlier by the
            fix for that same gate: `operatorGateOk` checked a committed blob existed and
            then authorized from the working tree. 830 tests; five regressions, all
            mutation-checked; two test defects repaired.
      - [x] 10.17 Round 26 changed the QUESTION instead of running a twenty-sixth defect
            hunt: scoped to PRD-018's own code, assess the five guarantees, rate each break
            by realistic likelihood, and return a close decision. It answered
            `DO NOT CLOSE` with four blocking defects — two `plausible`, two
            `adversarial` — which is the actionable input twenty-five rounds of lists never
            produced. Three fixed; the fourth (validator implementation not pinned,
            `adversarial`) is on the deferral board with an owner and a due date.
            833 tests; three regressions, all mutation-checked.
      - [ ] 10.18 **Re-run the readiness assessment against the current code.** After this
            remediation its own criteria read: guarantees 1/2/4 hold against everything
            short of a deliberate attack visible in the diff, 3 holds, and 5's known break
            is closed — so the artifact now supports `CLOSE WITH FOLLOW-UP`. That is a
            recommendation, not a verdict. One assessment run confirms or refutes it, and
            it is the only remaining question worth asking; further defect-hunting rounds
            have a measured, non-terminating yield.

- [x] 11.0 Phase 7 — Durable learning and close preparation
  - [x] 11.1 Run the `_brain/PROTOCOL.md` §7 capture. This PRD's declared output is
        ADR-0001; if implementation surfaced a non-derivable trap, append its exact path
        to both Memory Outputs and Durable Artifacts before writing the record.
  - [x] 11.2 Confirm every declared Durable Artifact (ADR-0001, `method.mdx`, the review)
        is present in the merge diff — this PRD's own gate now enforces that, so it is
        also the first live test of FR-4.
  - [x] 11.3 Prepare the owner handoff: the activation order evidence, the disabled-path
        proof from 8.2, the reconcile output from 7.4, the lock-table state from 9.5, and
        the independent verdict.
  - [ ] 11.4 After owner acceptance only, run `gate land PRD-018`; verify the post-merge
        gates and worktree cleanup. Never push.

---

## Verification Ledger

| Gate               | Command / Check                                             | Scope | Result  | Evidence | Notes |
| ------------------ | ------------------------------------------------------------- | ----- | ------- | -------- | ----- |
| FR-1              | `pnpm --filter provegate test test/content-templates.test.ts` | pkg   | passed  | 23 passed (23) | mutually-exclusive grammar |
| FR-2              | `pnpm --filter provegate test test/prd-ready.test.ts`         | pkg   | passed  | 30 passed (30) | watched target and disabled behavior |
| FR-3              | `pnpm --filter provegate test test/content-prompts.test.ts`   | pkg   | passed  | 25 passed (25) | per-file obligation, ten assertions |
| FR-4              | `pnpm --filter provegate test test/chain.test.ts`             | pkg   | passed  | 28 passed (28) | Phase 7 order, output and watch checks |
| FR-5              | `pnpm --filter provegate test test/chain.test.ts`             | pkg   | passed  | 28 passed (28) | base-ref weakening matrix + non-worktree refusal |
| FR-6a             | `pnpm --filter provegate test test/manifest.test.ts`          | pkg   | passed  | 15 passed (15) | exact root/practices Phase 4 semantics |
| FR-6b             | `pnpm --filter provegate test test/practices-pack.test.ts`    | pkg   | passed  | 10 passed (10) | additive practices activation |
| FR-6c             | `pnpm --filter provegate test test/open.test.ts`              | pkg   | passed  | 19 passed (19) | control-artifact introduction transition |
| FR-6d             | `pnpm --filter provegate test test/merge.test.ts`             | pkg   | passed  | 22 passed (22) | activation refuses while a foreign lease is active |
| FR-7              | `node scripts/verify/verify-pack-drift.mjs`                   | repo  | passed  | 49 pair(s) checked, PASS | live/package parity after reconcile |
| types             | `pnpm check-types`                                            | root  | passed  | 5 tasks, 0 errors | zero errors |
| lint              | `pnpm lint`                                                   | root  | passed  | 4 tasks, 0 warnings | zero warnings |
| test              | `pnpm test`                                                   | root  | passed  | 41 files / 631 tests | full suite |
| build             | `pnpm build`                                                  | root  | passed  | 4 successful | clean build |
| workflow          | `pnpm verify:workflow`                                        | root  | passed  | all 9 checks PASS | every hygiene check green |
| egress            | `pnpm check-egress`                                           | root  | passed  | clean — no third-party fetch shape | built output scanned after build |
| gate-check        | `node packages/provegate/dist/cli.js check PRD-018`           | repo  | passed  | ok — PRD-018 passes the readiness lint | readiness lint |
| gate-wiring       | `node packages/provegate/dist/cli.js check --wiring`          | repo  | passed  | ok — every gate is wired or excepted | wire-or-delete |
| independent-review | `_docs/reviews/review-018-memory-contract-enforcement.md`     | repo  | passed  | 26 rounds; 126 CRITICAL + 27 HIGH + 68 MEDIUM + 4 LOW found and ALL remediated; 0 outstanding. Owner accepted the residual 2026-07-26 — one `adversarial` item deferred with owner + due date. No confirming round was run | verdict pass, Critical: 0 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Readiness Watch Coverage

| Watch | Binding tasks |
| ----- | ------------- |
| W1 — the sixth floor gate must not scan stale bytes (resolved outside this PRD) | 0.4 |
| W2 — non-worktree baseline refusal names its remedy | 5.3, 5.4 |
| W3 — per-prompt obligations, asserted per file | 3.1, 3.5 |
| W4 — activation blast radius | 6.5, 6.6, 9.5 |
| W5 — introduction-transition fixture is named and run | 6.7 |
| W6–W8 — no grandfathering boundary (mechanism removed) | 6.5, 6.8 |
| W9 — the lock read is atomic with the merge | 6.5 |
| W10–W12 — bypass and non-convergence stated, not claimed away | 6.8, 8.5 |
| W13 — PRD-022 is a real PRD before this one lands | 8.5 |

---

## Deferrals & Decisions

- Phase 3 decision — `infra` skeleton: Migration & Rollback is its own parent (task 8.0),
  and activation ordering lives there rather than inside FR-6, because ordering is what
  carries this class's 20% weight.
- Phase 3 decision — no grandfathering mechanism is planned. Readiness iterations 3–5
  measured every candidate boundary as unsound: the lease persists no base SHA, commit
  timestamps are mutable, and a merge commit cannot contain its own SHA. The land-time
  lease barrier replaces it, and the residual is recorded rather than engineered around.
- Task 0.3 stale finding — `turbo-cache-masks-out-of-input-reads` names a remedy the repo
  has since forbidden. The record says to add out-of-package paths to the turbo task's
  `inputs`; `verify:turbo-inputs` now fails **any** cached task that declares `inputs`
  without an exceptions entry, precisely because an enumeration silently rots. The hazard
  itself is still live and was re-measured, not assumed: `provegate#test` hashes 179
  inputs, none of them outside the package, while `test/review-quorum.test.ts:70` reads
  `../../../_docs/reviews`. So a change confined to `_docs/reviews/` cannot bust that
  cache. This is the same shape as the "Frozen-snapshot digest" deferral opened at the
  PRD-017 close (owner, due 2026-08-29), which names the snapshot corpus rather than
  `_docs/reviews/`; both want a cache-free `scripts/verify/` gate. Out of PRD-018's
  surface — recorded, not taken. The other four records verified accurate:
  `gate-wire-or-delete` is enforced live (`verify:gates-wired`, 10 registered / 10 on
  disk), `push-is-human-by-omission` holds (`gate push` refuses in the shipped CLI help),
  and the two workflow-seed records name no path that could drift.
- Task 6.8 residual, stated rather than engineered around — **the land barrier is a
  `gate land` precondition, not a git-level invariant.** A direct `git merge` bypasses it
  exactly as it bypasses every gate here (the pre-commit hook exempts merges). And it does
  **not** self-correct: control artifacts are revalidated only on a new claim (`open.ts`),
  so a worktree that keeps running `gate run` and `gate land` never re-checks them. No
  convergence is claimed anywhere in this PRD's code or docs, and no exemption state is
  recorded, so the worst case is one bypassed activation rather than a lasting exemption.
  Closing it is PRD-022's scope.
- Phase 4 decision — **the barrier is gated on `memory.enabled`, which makes it a standing
  rule for this repository rather than a one-off activation guard.** FR-6 and task 6.5 both
  state it as `gate land` behavior without a trigger condition, and the alternative —
  firing only when the merge diff touches the control artifacts — is a trigger this PRD
  never specifies, so implementing it would have been invented method. The cost is real and
  belongs in the review: two concurrent PRDs cannot land while either holds a lease. It
  fails closed, names the blocking lease, and the remedy (release, or wait out the TTL) is
  in the refusal text.
- Task 8.3 rollback — set `memory.enabled: false` in `workflow.config.json` and drop
  `phases.7` from `gates.manifest.json`. Legacy behavior returns with no data migration:
  every record is Markdown that survives untouched, and the readiness/close gates read the
  flag rather than the store. Proved in task 8.2 by flipping the flag and re-running: with
  memory off, `gate check PRD-018` passes, `gate status` is unchanged, and the Phase 7
  chain holds only `durable artifacts touched in merge diff` plus the manifest command —
  the two `memory:` gates disappear entirely rather than passing vacuously.
- Task 8.4 adopter cost — **nothing.** A fresh `gate init --practices` gets the
  memory-enabled config and a manifest wiring the packed validator; every existing config,
  manifest, entrypoint, package script, and CI file is untouched, because init writes with
  `wx` and reports existing paths as skipped. An adopter who never re-runs init sees no
  change at all, which is what `memory.enabled` defaulting to false buys.
- Task 8.5 (W13) — PRD-022 is a real PRD, not a stub: readiness PASS 9.10, 73 planned
  tasks, seven FRs with their own §11 commands, at
  `_prds/wip/prd-022-control-artifact-revalidation.md`. FR-6's residual has an owner.
- Phase 4 scope decision (owner-approved 2026-07-25) — **`packages/provegate/src/cli.ts` is
  edited although PRD-018's Conflict Surface does not declare it.** One argument on one
  line: `lintPrd(config, manifest, content)` → `lintPrd(config, manifest, content, root)`.
  FR-2's gate resolves declared inputs against the real record store, so it needs a
  repository root, and `gate check` is the only caller. Not wiring it was not the safe
  option: `lintPrd` fails closed when memory is enabled without a root, so FR-6's
  activation would have broken `gate check` for **every** PRD in this repo — and an
  unwired gate is what `gate-wire-or-delete`, one of this PRD's own Memory Inputs, exists
  to forbid. `gate queue` reports the file claimed by PRD-019/021/022/023; none holds an
  active lease, so there is no concurrent writer. The signature matches the house shape
  `auditWiring(config, manifest, root)` already uses.
- Task 0.4 measurement — W1 holds. `verify:turbo-inputs` PASS (6 tasks); `turbo.json`
  declares no `inputs` on `build`, and `web#build` hashes 14 files of which 6 are under
  `app/`. `check-egress` therefore scans bytes the cache key covers.

---

## Progress Log

| Date       | Task    | Notes |
| ---------- | ------- | ----- |
| 2026-07-25 | Phase 3 | Plan generated from PRD-018 (Approved), readiness iteration 6 PASS 8.33, and watch items W1–W13, after owner Go. No implementation started. Phase 4 entry is blocked on PRD-017 Ship Verified (task 0.2). |
| 2026-07-25 | 2.2 | **The watch gate could not see most of the targets it matches against, and the fix is in FR-2's own target file.** `frTargets` read backticked paths only from the line carrying `**Targets:**`, but a real FR wraps its list across several lines — measured on this PRD: **7 paths seen of ~30 declared**. Two consumers were reading a truncated input: the hard-cap rules (since PRD-002) and the new watch gate, whose entire job is to notice an overlap with a declared target. `frTargets` now reads the Targets ENTRY — its opening line plus wrapped continuations, stopping at the next bullet, the next numbered FR, or a blank line — so a path in a sibling bullet is still prose. Four regression cases in `prd-ready.test.ts`. |
| 2026-07-25 | 7.2 | **Writing this PRD's own declared output hit a defect in PRD-017's shipped validator.** ADR-0001 failed `verify:brain` with all four sections reported empty while full: the section regex ends its lazy capture at `(?=^## \|$)` under `/m`, where `$` anchors end-of-LINE, so a blank line after the heading captures nothing. `_brain/_templates/adr.md` puts content directly under each heading — the one shape that passes — and the repository had no ADR until now, so nothing exercised it. `prettier` formats `.md` and inserts that blank line, so `pnpm format` would break every ADR; `format:check` is wired into no gate, which is the only reason the two have not collided. ADR-0001 is written in the passing shape, the finding is captured as `_brain/learnings/adr-section-blank-line-reads-empty.md` and **appended** to Memory Outputs and Durable Artifacts (FR-5 permits appending without acceptance), and the parser fix is deferred: it spans PRD-017's two validator copies plus their shared corpus, all outside this PRD's Conflict Surface. |
| 2026-07-25 | 6.3–6.4 | Root activation, last as task 8.1 requires. `gates.manifest.json` writes Phase 4 as the four floor commands then `pnpm verify:workflow` and `pnpm check-egress` (build before egress, because the scanner reads build output), and Phase 7 as `pnpm verify:brain`. `workflow.config.json` enables memory; `memory.entrypoints` is populated because config validation refuses an enabled block with an empty list — `must name at least one agent entrypoint when memory is enabled`, which is the substrate refusing a half-installation rather than a surprise. **The contract then caught its own author:** with memory live, `gate check PRD-018` failed with `'adr-section-blank-line-reads-empty' watches _brain/adr/ADR-0001-closed-loop-agent-memory.md — a declared target overlaps it, so it needs an input disposition`. The record written during Phase 4 watches `_brain/adr/**`; FR-7 targets that exact file. Adding the disposition is the loop closing, not a workaround. |
| 2026-07-25 | 8.2 | Disabled-path proof, by measurement rather than assertion. With `memory.enabled: false`: `gate check PRD-018` → ok, `gate status` → unchanged table, and `gate run --dry-run` Phase 7 lists exactly `durable artifacts touched in merge diff` + `pnpm verify:brain`. Flipped back on, the same dry-run inserts `memory: declared outputs in Durable Artifacts and the merge diff` and `memory: no weakening against main` **between** them — so the configured validator provably runs after capture, not before (`verify-check-phase-placement`), and the dry-run prints every check it would perform (FR-4). |
| 2026-07-25 | 7.4 | `node scripts/verify/verify-pack-drift.mjs --reconcile`, read per pair before accepting — exactly two lines, both expected, both edited by hand on each side rather than copied: `accepted pack + repo change — brain/PROTOCOL.md` (capture step 2b: the packed twin says "work item", the root copy says "PRD") and `accepted pack + repo change — templates/AGENT_BOOTSTRAP.template.md` (the Memory contract section: the packed template is vendor-neutral, the root copy names `main`, `gate check`, and this repo's acceptance flow). Then `reconciled 49 pair(s)`, `49 pair(s) checked`, `PASS`. The gate had first failed with "the pack and repo side changed since reconciliation" for both — which is the correct reading of a two-sided edit, not drift. |
| 2026-07-25 | 0.0–0.5 | Phase 4 opened. `gate open PRD-018 --worktree` claimed 22 surface globs; branch `feat/prd-018-memory-contract-enforcement`, worktree `.worktrees/prd-018-memory-contract-enforcement`, lease `_state/locks/prd-018-memory-contract-enforcement.json`. `open` printed two fatal-looking lines — `workflow.config.json` and `gates.manifest.json` absent in the base commit — which is the expected pre-activation state: FR-6 creates both, so there is nothing yet to materialize. 0.2 met: `_state/prds.json` records PRD-017 `Ship Verified` (58/58, land `823d766`, board close `b916307`). Baseline green and captured: `pnpm test` 41 files / 552 tests, `pnpm verify:workflow` PASS across all nine checks, `pnpm check-egress` clean, `pnpm build` 4/4. Nothing pre-existing red, so nothing ledgered as normalized. Two findings recorded in Deferrals & Decisions (0.3, 0.4). No implementation files touched yet. |

---

## Blockers / Open Questions

- ~~PRD-017 must be Ship Verified before Phase 4 (task 0.2).~~ **Cleared 2026-07-25** —
  `_state/prds.json` records it Ship Verified; lease released before this one was claimed.
- Not parallelizable. Re-run at Phase 4 open rather than read from this list, per task
  0.2.1's standing instruction: `gate queue` now reports PRD-018 overlapping **four** PRDs
  — PRD-019 (`practices-pack.test.ts`, `README.md`, `pack-drift-ledger.json`), PRD-021
  (`prd-ready.ts`, `prd-ready.test.ts`, `pack-drift-ledger.json`), PRD-022
  (`method.mdx`), and PRD-023 (`prd-ready.ts`, `durable.ts`, `init.ts`,
  `practices-pack.test.ts`, `_brain/**`, `pack-drift-ledger.json`). The PRD-017 and
  `content-prompts.test.ts` entries this list carried are gone with PRD-017's close.
- ~~PRD-022 must be more than a stub before this PRD lands (task 8.5); it is currently
  Draft and unscored.~~ **Cleared 2026-07-25** — PRD-022 is Approved, readiness PASS 9.10,
  73 tasks planned. Task 8.5 still verifies this at land time rather than trusting the row.

---

## Operator Handoff

> Human/runtime/staging checks the agent cannot complete. Keep the corresponding task
> checkbox unchecked until resolved or explicitly accepted.
> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`}.

| Task | Category  | Owner | Required Check | Status | Notes |
| ---- | --------- | ----- | -------------- | ------ | ----- |
| 11.3 | manual-qa | owner | Accept activation: from this merge every future PRD passes through the memory lint. Confirm you want the contract on repo-wide, and that no other lease is active at merge time | pending | The one-way step in this program; the merge gate refuses until this acceptance is recorded |
| 10.18 | manual-qa | owner | **Decide the review verdict.** | done | **Decided 2026-07-26: the owner accepted the residual and closed with follow-up.** Recorded under "Owner decision" in the review artifact, with round 26's four blocking defects dispositioned — three fixed with mutation-checked regressions, one `adversarial` item deferred with an owner and a due date. No confirming assessment was run against the current code, and the artifact says so |
| 6.5  | manual-qa | owner | Clear or wait out any foreign lease before landing. If the workspace mutex holds a stale marker from a crashed holder, it fails closed by design and needs manual recovery | pending | Bounded by lease TTL; recovery is documented in `run/mutex.ts` |
