# Readiness Assessment: PRD-035 — ADR Section Anchor

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD path               | `_prds/wip/prd-035-adr-section-anchor.md` |
| Verdict                | PASS |
| Score                  | 8.20/10 |
| Iteration              | 2 |
| Model Tier (Execution) | high |
| Model Tier (Audit)     | high |
| Scored by              | GPT-5 via codex-cli |
| Self-scored            | no — fresh independent session; iteration 1 used a different Codex session, and remediation was performed by neither scorer |
| Date                   | 2026-07-28 |
| PRD Lint               | waived/green — exact CLI invocation hit the known read-only `EPERM`; direct built `lintPrd` returned `{ ok: true, issues: [] }`, and the orchestrating session ran the exact command successfully outside the sandbox on 2026-07-28 post-remediation |
| State Record           | pending |

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | high | Score is in the 8.0–8.9 band. The code change is narrow, but FR-5 adds a new root verifier, bundle wiring, and two drift-ledger effects that warrant careful execution. |
| Phase 6 (Audit)     | high | Audit should explicitly check the runner’s expectation algorithm, workflow membership, both changed drift pairs, and the mutation claims. |

## Analysis

### Technical Depth & Architecture

**[FINDING — Technical Depth] The remediation now describes the actual three-copy topology correctly.** `packages/provegate/test/memory.test.ts` executes the typed parser and `packages/provegate/practices/verify/lib.mjs`; its header explicitly excludes the repository validator. FR-5 separately executes `scripts/verify/lib.mjs`. A read-only probe confirmed the current repository validator reaches the fixture’s expected validity and fields for all 78 existing cases.

**[FINDING — Technical Depth] FR-5 is structurally viable.** Root `package.json` supplies Prettier as a dev dependency and defines root `verify:*` commands as direct Node invocations, outside Turbo. `scripts/verify/verify-gates-wired.mjs` treats a check basename in `verify-workflow.mjs`’s `CHECKS` array as an executing surface, so the proposed package registration plus bundle membership is valid wiring.

**[FINDING — Technical Depth] FR-5’s result-comparison wording is not precise enough.** Fixtures expose expected bare fields such as `["watch"]`. The package test compares those bare fields to the typed parser at `memory.test.ts:448-455`; `field#entry` keying is used separately for typed-versus-shipped parity at `:483-495`. FR-5 says the repository runner compares fixture expectations “with the same field-and-entry keying,” but the fixture has no expected entry keys. The implementation must distinguish expected validity/bare-field assertions from optional keyed parity or extend the fixture schema.

**[FINDING — Completeness] Adding FR-5 to the root workflow changes a second pack-drift pair.** `verify/verify-workflow.mjs` is paired with `scripts/verify/verify-workflow.mjs` in `pack-drift-ledger.json`, while the packed workflow appropriately has no repository corpus runner. FR-3 explicitly discusses only the `verify/lib.mjs` pair. The ledger target and `pnpm verify:pack-drift` will catch both changes, but the PRD should name the workflow pair and record the runner as an intentional repository-only divergence. The current baseline gates were executed read-only: `verify:pack-drift` passed over 49 pairs and `verify:gates-wired` passed with 13 registered checks and 12 on-disk scripts.

### Edge Cases & Failure Modes

**[FINDING — Completeness] The prior mutation defect is repaired.** The PRD now maps mutation of `parse.ts` or the shipped validator to the package corpus and mutation of the repository validator to FR-5. This matches which implementation each command can execute.

**[FINDING — Scope & Testability] The formatter case is now isolated and executable.** FR-5 formats the fixture content with the repository’s installed Prettier and validates that result without modifying the live ADR store. Prettier is present at root, `_brain/` is not excluded by `.prettierignore`, and the current configuration has no Markdown-specific option that invalidates this smoke design.

**[FINDING — Scope & Testability] FR-5’s verification row does not exercise its full wiring claim.** `pnpm verify:memory-corpus` proves the package-script registration and runner behavior, but it remains green if `verify-memory-record-corpus.mjs` is omitted from `verify-workflow.mjs`. A mapped `pnpm verify:workflow` row would execute both the new check through the bundle and the wire-or-delete meta-gate.

**[FINDING — Scope & Testability] Missing and unparseable fixture behavior is explicitly fail-closed.** The runner must name the path and exit non-zero rather than accepting an empty iteration. The next-heading regression also remains explicitly required.

### Maintainability & Developer Experience

**[FINDING — Clarity] FR-4 now matches the repository.** `packages/provegate/practices/brain/learnings/` contains neither `adr-section-blank-line-reads-empty.md` nor `two-parsers-wrong-together.md`, and the packed INDEX contains neither hook. Keeping this hotfix repository-local avoids inventing a seed-promotion lifecycle.

**[FINDING — Clarity] Every FR has Targets and at least one runnable verification row; the DO NOT section is present, Open Questions is `None`, and there are no TBD markers.** The Clarity hard cap does not apply.

**[FINDING — Completeness] Two Memory Input rationales falsely describe record watches.** `assert-absent-needs-an-independent-cause` watches `packages/provegate/test/**`, covering the corpus fixture and package test but not the root runner. `false-green-on-missing-file` declares no `watch` field at all. The lessons are relevant and may honestly be applied voluntarily, but the current claims that their watches cover the runner or verify scripts are factually wrong.

**[FINDING — Multi-Tenancy & Security] No hard cap fires.** The work adds no runtime dependency to `packages/provegate`, no remote-push path, network access, telemetry, protected surface, prompt, template, or schema content. Prettier is an existing root dev dependency.

### Migration & Rollback

**[FINDING — Migration & Rollback] N/A — class waived.** The parser change widens accepted input without changing stored-data shape. Documents valid before the change remain valid after it.

**[FINDING — Completeness] Atomic rollback is now documented, but its drift-ledger description should name both affected pairs.** A revert can safely remove the runner, package registration, workflow membership, fixture change, anchor changes, and reconciled hashes together.

## Iteration 2 — Remediation Review

1. **Missing Piece 1 — genuinely closed.** The PRD no longer claims that the package corpus executes all three implementations.

   > “The package corpus test executes every case against **two** implementations — the typed parser and the shipped practices copy; its own header records that the repository copy is reconciled through `verify:pack-drift`, not run.” (lines 113–118)

   > “The package corpus test executes the typed parser and the **shipped** practices copy; the repository's own `scripts/verify/lib.mjs` is deliberately outside it…” (lines 216–221)

2. **Missing Piece 2 — genuinely closed as to the iteration-1 requirement.** FR-5 adds the repository runner, makes missing input fail closed, assigns runnable verification, and includes the new script in Conflict Surface.

   > “A standalone runner loads every case from `packages/provegate/test/fixtures/memory-record-cases.json`, runs it against `scripts/verify/lib.mjs`'s `validateMemoryRecord`, and compares the reported fields against the fixture's expected validity and fields…” (lines 142–147)

   > “The runner exits non-zero, naming the path, on a missing or unparseable fixture — it never iterates zero cases into a pass.” (lines 150–152)

   > “FR-5 | `pnpm verify:memory-corpus` … every fixture case executes against the repository validator; fails loudly on a missing fixture.” (line 353)

   The new field-versus-entry comparison ambiguity is listed below as a separate iteration-2 defect.

3. **Missing Piece 3 — genuinely closed.** The repository-wide formatting mutation has been replaced by an isolated in-memory smoke.

   > “It then runs the formatter smoke: the FR-2 case's content is formatted with the repository's own prettier (markdown parser) and re-validated — the result must stay valid with every section body captured non-empty.” (lines 147–150)

   > “FR-1 | `pnpm verify:memory-corpus` … the formatter smoke: the FR-2 case formatted by the repository's prettier still validates, sections non-empty.” (line 349)

4. **Missing Piece 4 — genuinely closed by correcting the scope premise.** `_brain/INDEX.md` is now an FR-4 target, and the PRD correctly states that no packed twin exists or will be created.

   > “**No packed twin exists and none is created.** … `packages/provegate/practices/brain/learnings/` carries no copy of this record and the packed INDEX no hook for it.” (lines 133–136)

   > “**Targets:** `_brain/learnings/adr-section-blank-line-reads-empty.md`, `_brain/INDEX.md`” (lines 140–141)

5. **Missing Piece 5 — genuinely closed by scope correction plus explicit atomic rollback.** Because no packed seed is created, its lifecycle is no longer relevant; the actual new runner and wiring receive atomic land/revert treatment.

   > “The additions land atomically with the fix and leave with it. The FR-5 runner, its `package.json` registration, its `verify:workflow` membership, and the FR-3 ledger reconciliation are one commit with the anchor change…” (lines 240–243)

   > “…no intermediate state exists in which a registered check has no script, a script no registration, or a ledger row no counterpart.” (lines 243–245)

6. **Missing Piece 6 — genuinely closed under the prescribed environment waiver.** This was an execution-environment item rather than a missing PRD paragraph. The remediated document now satisfies the linted command-table contract:

   > “Every FR needs at least one table row with a runnable backticked command…” (lines 341–343)

   The exact command again exited before lint with `EPERM` while attempting `_state/prds.json.11683.tmp`. The read-only equivalent imported the built `loadConfig`, `loadManifest`, and `lintPrd` functions and returned `{ "ok": true, "issues": [] }`. Per the required waiver, the orchestrating session’s successful out-of-sandbox execution of `node packages/provegate/dist/cli.js check PRD-035` on 2026-07-28 post-remediation supplies command-level evidence. The failure is therefore not treated as a lint failure or hard cap.

## Scorecard

| #         | Dimension                | Weight              | Score              | Weighted | Notes |
| --------- | ------------------------ | ------------------- | ------------------ | -------- | ----- |
| 1         | Clarity                  | 25%                 | 8/10               | 2.00     | Exact FRs, targets, and commands; comparison semantics and two memory-watch statements remain inaccurate |
| 2         | Completeness             | 25%                 | 8/10               | 2.00     | All six prior gaps are addressed; workflow-pair reconciliation and wiring verification need explicit coverage |
| 3         | Technical Depth          | 30%                 | 8/10               | 2.40     | Strong parser, corpus, Turbo, and mutation reasoning; FR-5 keying and the second drift pair are under-specified |
| 4         | Multi-Tenancy & Security | 10%                 | 10/10              | 1.00     | No dependency, push, network, telemetry, protected-surface, or untraceable method-content expansion |
| 5         | Scope & Testability      | 10%                 | 8/10               | 0.80     | Bounded, executable work; the FR-5 row cannot prove membership in the aggregate workflow |
| 6         | Migration & Rollback     | N/A (redistributed) | N/A — class waived | 0.00     | Hotfix class; no stored-data migration |
| **Total** | **Weighted**             | **100%**            |                    | **8.20** | **PASS** |

## Missing Pieces

1. Add `pnpm verify:workflow` as an FR-5 verification row. The existing direct runner command cannot demonstrate that the runner is a member of `verify-workflow.mjs`’s `CHECKS` array or that the wire-or-delete audit recognizes the membership.

2. Define FR-5’s expectation algorithm precisely. Fixture `fields` are bare field names, while the package’s `field#entry` representation is used for cross-implementation parity. Require expected validity plus bare-field containment, or add expected entry keys or a second implementation comparison; do not conflate the two contracts.

3. State that implementation changes and reconciles both `verify/lib.mjs` and `verify/verify-workflow.mjs` ledger pairs. The latter is an intentional repository-only divergence because adopters do not receive the repository corpus fixture or runner; update the ledger note accordingly.

4. Correct the Memory Input rationales: `assert-absent-needs-an-independent-cause` watches the package corpus paths but not the root runner, while `false-green-on-missing-file` has no watch. Retain them as voluntarily applied records without claiming nonexistent watch coverage.

## Iteration History

| Date       | Iteration | Score   | Verdict | Notes |
| ---------- | --------- | ------- | ------- | ----- |
| 2026-07-28 | 1         | 7.85/10 | ITERATE | initial adversarial score by independent scorer |
| 2026-07-28 | 2         | 8.20/10 | PASS    | all six iteration-1 gaps closed; bounded FR-5 wiring, drift-pair, comparison, and memory-rationale defects remain |

## Verdict

**PASS — 8.20/10.**

The remediation repairs the central readiness defects: it now states the real corpus topology, executes the repository validator separately, adds an isolated Prettier smoke, removes the nonexistent packed seed from scope, documents atomic rollback, and clears lint under the required read-only waiver. No hard cap applies.

The remaining defects are real but bounded: one verification row does not prove aggregate wiring, FR-5 conflates field-level expectations with entry-keyed parity, a second drift pair is implicit rather than named, and two Memory Input rationales overstate watch coverage. These warrant high-tier execution and audit but do not make the hotfix indeterminate or untestable.

---

> **Transcription note (orchestrating session, 2026-07-28).** Iterations 1 and 2 both
> transcribed verbatim from independent Codex scorer sessions (codex-cli 0.145.0,
> read-only sandbox). Iteration 1: session `019fa80b-e73a-7db0-9575-e3da3aac2aa8`,
> ITERATE 7.85, ~1.31M tokens. Iteration 2: fresh session
> `019fa81a-3893-7b11-adf8-20ddee9dcee9`, PASS 8.20, ~1.21M tokens — zero context of the
> remediation, which was written by the orchestrating (non-scorer) session. In both
> iterations the exact CLI lint invocation hit the sandbox's read-only `EPERM` on the
> `_state/prds.json` refresh before reaching the lint; both times the built `lintPrd`
> read-only equivalent returned zero issues, and the orchestrating session ran
> `node packages/provegate/dist/cli.js check PRD-035` green outside the sandbox the same
> day — the waiver reasoning is recorded in the report body. The four iteration-2
> Missing Pieces were applied to the PRD as post-PASS precision edits (they are the
> scorer's own prescriptions, quoted in its report); the PRD changelog records this and
> the owner may order a confirmation pass at Phase 3 approval.
