# Readiness Assessment: PRD-038 — Executable Quickstart

**PASS — 8.46/10. The normative requirements are executable without clarification. Residual summary-level wording is retained as watch items but does not override the explicit FRs, direct verification commands, or decided implementation route.**

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-038-executable-quickstart.md` |
| Score | 8.46/10 |
| Verdict | PASS |
| Iteration | 7 |
| PRD Class | infra |
| Model Tier (Execution) | high |
| Model Tier (Audit) | high |
| Scored by | Codex, fresh independent re-scorer |
| Self-scored | no |
| Date | 2026-07-29 |
| PRD Lint | Command-surface waiver applied. `node packages/provegate/dist/cli.js check PRD-038` reached only the documented sandbox write and failed with `EPERM: operation not permitted, open '/Users/rayvaz/Projects/provegate/_state/prds.json.81226.tmp'`. The read-only production-shaped `loadConfig` + `loadManifest` + `lintPrd(config, manifest, content, root, 38)` call returned `{ "ok": true, "issues": [] }`. Command-level evidence additionally relies on the orchestrating session’s out-of-sandbox green run dated 2026-07-29. |
| State Record | Pending orchestration update; current generated state still records iteration 6 at 7.88/ITERATE. |

---

## Iteration 7 — Sweep Review

### 1. Region geometry and per-document scope — CLOSED

The owning rule is now single-valued:

> “the worktree alternative stays INSIDE it under `<!-- qs:skip -->`”

> “the practices layer stays OUTSIDE the region entirely”

FR-1 specifies that `qs:skip` binds to exactly the next `sh` fence, that dangling and doubled markers fail by name, and that both the harness and parity verifier exclude skipped fences. Success Metrics and §6 now agree:

> “every executable, non-skipped command in the tagged `qs:scenario` region”

Implementation Scope correctly assigns each document its own changes:

> “`packages/provegate/QUICKSTART.md` — its `qs:scenario` region markers, the `qs:skip` marker … and the retag of ITS handoff-card fence”

> “`apps/docs/content/docs/quickstart.mdx` — ITS OWN `qs:scenario` region markers … and the retag of ITS handoff-card fence”

The corpus supports the migration: the package document has 14 executable shell-command lines overall and the docs page has 8. Excluding the three-command worktree alternative and package-only commands leaves the intended eight-command canonical path. The only two bare fence openings are the handoff cards in the package and docs documents.

### 2. Measured transcript and production reasons — CLOSED

The transcript now carries the visible missing-task reason, including the stop-card prefix:

> `PRD-001: no tasks file — independent-review ledger missing`

Production constructs the underlying reason in `chain.ts`, while `stopCard` renders `${id}: ${why}`, confirming the prefix.

The main-branch refusal is complete:

> `current branch is 'main' — run from the feature branch, not the base checkout`

This matches the production reason in `merge.ts`.

The Base SHA statement is correctly narrowed:

> “the planted template placeholder was refused in THIS run; no general claim about symbolic refs”

The specified negative fixture plants literal `main`; production rejects it because `validateReviewArtifact` requires a Base SHA value of at least seven characters. The PRD no longer claims that symbolic refs generally fail validation.

### 3. Full active-text consistency sweep — PASS WITH WATCH ITEMS

The sweep covered §1–§12, Memory Inputs, Memory Outputs, Conflict Surface, and Durable Artifacts. Dated Changelog rows were excluded as directed.

No active owning requirement retains the former worktree-outside rule, the broad symbolic-ref claim, the truncated production reasons, or the incorrect per-file retag assignment. Memory Outputs and Durable Artifacts agree on the learning and ADR amendment, and Conflict Surface covers every non-shared implementation target.

Three non-owning shorthand survivors remain:

> “one source of truth; the other proven equivalent or derived”

This Primary Goal retains an alternative even though FR-3 explicitly decides a root parity verifier.

> “the docs-site parity crosses the boundary via docs build or a root script”

This Memory Input similarly retains an obsolete choice. FR-3, FR-4, §8, §11, and §12 all require the root-script route, so an implementing agent has one executable answer.

> “I want every executable command in it to work exactly as printed”

User Story 1 omits “non-skipped,” despite the claimed rework. Its Acceptance Criteria immediately delegates to §6, where the non-skipped qualification is present. It is therefore an editorial consistency defect, not an implementation decision.

### 4. Technical and governance verification — ADEQUATE

The PRD provides a production-shaped, offline tarball installation; a measured scratch-state sequence; exact negative fixtures; runner-sentinel removal; inherited Git-configuration scrubbing; empty-remote assertions; mutation proof that the document is the runtime source; cleanup recovery; direct parity wiring; class-ledger registration; and an atomic rollback set.

Production and repository checks confirmed:

- `packages/provegate` has zero runtime, optional, and peer dependencies.
- The only runner re-entry sentinel in current source is `PROVEGATE_RUN_ACTIVE`.
- Zero operator rows make the acceptance gate pass without an acceptance entry.
- The run chain contains no readiness-artifact gate.
- The stop-card, review-validator, and merge-refusal behavior match the PRD’s corrected claims.
- No remote-push path, protected surface, client/server payload, or untraceable method content is introduced.

No hard cap fires. The lint failure is waived only for the reproduced sandbox `EPERM`, with the read-only production equivalent green and the required out-of-sandbox run reported green.

The Clarity ceiling does not fire: every FR has concrete Targets, every FR maps to a runnable §11 command, DO NOT exists, Open Questions is empty, and no undecided token remains in the owning requirements.

---

## Scorecard

| # | Dimension | Weight | Score | Weighted | Notes |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Clarity | 15% | 7.8/10 | 1.17 | FR-1 and FR-3 are unambiguous and directly verified. Goal-, story-, and Memory-level shorthand retains two obsolete alternatives and one missing `non-skipped` qualifier. |
| 2 | Completeness | 20% | 8.5/10 | Extraction, execution, negative fixtures, parity, wiring, artifacts, failure cleanup, and rollback are covered. |
| 3 | Technical Depth | 20% | 8.6/10 | Strong prototype-backed state model, production-shaped CLI execution, offline install, Git-environment isolation, and mutation proof. |
| 4 | Multi-Tenancy & Security | 10% | 8.8/10 | No tenant/auth surface; no remote, push, network dependency, telemetry, or runtime dependency. Inherited Git configuration is scrubbed. |
| 5 | Scope & Testability | 15% | 8.2/10 | Every FR has a runnable route and named failure behavior. External-write shorthand and privileged cleanup portability remain audit watches. |
| 6 | Migration & Rollback | 20% | 8.8/10 | Corpus-feasible convergence and a coordinated revert unit cover both documents, harness, verifier, wiring, ledger, ADR, and learning. |
| **Total** | **Weighted** | **100%** |  | **8.46/10** | **PASS** |

---

## Watch Items

No blocking missing pieces. The following bind implementation and audit:

1. Remove the remaining alternative-mechanism wording: change “equivalent or derived” and “via docs build or a root script” to the decided root parity verifier. FR-3 and §11 already make the implementation unambiguous.

2. Qualify User Story 1—and ideally §1’s generic “region’s commands” shorthand—as executable, non-skipped commands. Its Acceptance Criteria already delegates to the correctly qualified §6 rule.

3. Read §6’s “nothing outside the temp dir was written” through FR-2’s narrower post-setup observation boundary. Audit should reject an implementation that claims global filesystem proof from inspecting only selected directories.

4. The chmod-555 cleanup plant assumes an unprivileged POSIX runner. Audit should confirm the intended Ubuntu CI identity is non-root or use a failure mechanism that remains deterministic under elevated privileges.

5. Synchronize the PRD’s `Updated` metadata with its 2026-07-29 Changelog entry. This is state-freshness hygiene, not an execution blocker.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| --- | --- | ---: | --- | --- |
| 1 | 2026-07-28 | 4.95 | ITERATE | Initial independent assessment. Measured 14-versus-8 command divergence; traced lint, runner, merge, and worktree behavior; found the nested-run sentinel failure, missing verifier classification/ADR wiring, non-exported scratch helpers, and incomplete hermetic cleanup/no-remote proof. |
| 2 | 2026-07-28 | 6.10 | ITERATE | Confirmed the measured baseline and closed FR-4 governance plus sentinel-memory coverage. Found that the revised state model omitted mandatory close transitions, FR-3’s §11 row violated its root boundary, and install/output-tag/external-write claims remained contradictory. |
| 3 | 2026-07-28 | 5.62 | ITERATE | Confirmed the direct FR-3/FR-4 route and exact sentinel. Found that the claimed [D]/[H] table was absent and contradicted printed order, `gate status` and readiness were omitted, two output fences were untagged, `gate new` intentionally succeeded before `gate init`, and a read-only file did not deterministically fail cleanup. |
| 4 | 2026-07-28 | 7.48 | ITERATE | The real prototype closed command order, raw-template claim, minimal lint, no-readiness, zero-acceptance, offline install, mutation, and single-pass close questions. Remaining findings covered region geometry, fence census, exact negative fixtures, Git config, cleanup, docs migration, and rollback. |
| 5 | 2026-07-28 | 7.61 | ITERATE | Confirmed the corrected handoff-fence census, literal-`main` Base SHA input, complete POSIX cleanup plant, and feasible plain-init docs migration. Corpus and production verification found that worktree was still placed both inside and outside the region, the symbolic-ref claim and truncated main reason survived, the three Git settings did not clear `GIT_CONFIG_COUNT`, and rollback remained test-only. |
| 6 | 2026-07-29 | 7.88 | ITERATE | Confirmed that environment-injected Git configuration is now scrubbed and rollback is a coordinated atomic set. Corpus and source checks found the region contradiction still active, every-command claims incompatible with `qs:skip`, the measured transcript still carrying both truncated reasons and the false symbolic-ref statement, and the two handoff retags assigned to the wrong per-file Scope row. Read-only lint passed under the documented `EPERM` waiver. |
| 7 | 2026-07-29 | 8.46 | PASS | Confirmed the three blocking consistency repairs across FR-1, the transcript, §6, and Implementation Scope. Full corpus and production checks validate the measured geometry and stop reasons. Residual goal/story/Memory shorthand, external-write wording, cleanup privilege assumptions, and stale Updated metadata remain bounded watch items; none introduces an implementation choice or hard cap. |

---

## Verdict

**PASS — 8.46/10.** The explicit requirements now give an implementing agent one route: package-only execution grammar, skipped worktree fence, practices outside the region, a production-shaped scratch harness, and a root parity verifier wired into `verify:workflow`. The remaining inconsistencies occur in summary or rationale text and cannot reasonably override the labeled `DECIDED` FRs, concrete Targets, direct §11 commands, and anti-patterns. This is within the 8–8.9 band: proceed to Phase 3 with the watch items carried forward.

## Model Tier Recommendation

| Phase | Tier | Rationale |
| --- | --- | --- |
| Execution | high | The work combines Markdown extraction, shell-command execution, Git lifecycle setup, environment isolation, production CLI behavior, and cross-boundary verifier wiring. |
| Audit | high | Audit must challenge hermeticity, exact production reasons, mutation causality, cleanup portability, parity semantics, and coordinated rollback. |


---

> **Transcription note (orchestrating session, 2026-07-29).** Iteration 7 transcribed
> verbatim from the seventh fresh independent Codex session of this cycle. PASS 8.46 —
> no blocking pieces; three watch items applied as post-PASS precision edits per the
> scorer's prescriptions, recorded in the changelog. Trajectory: 4.95 → 6.10 → 5.62
> → 7.48 → 7.61 → 7.88 → 8.46, with the owner's prototype-first pivot at iteration 3
> as the turning point. Lint EPERM is the documented sandbox artifact; out-of-sandbox
> green the same day.
