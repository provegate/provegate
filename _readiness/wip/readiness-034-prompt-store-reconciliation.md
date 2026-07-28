# Readiness Assessment: PRD-034 — Prompt Store Reconciliation

**PASS — 8.4/10.** The ninth pass closes all three iteration-8 seams. The planned-set-only design is internally consistent, faithful to Revision 2, and executable without an unresolved design decision. No remaining issue rises above a PASS-band watch item.

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-034-prompt-store-reconciliation.md` |
| PRD Class | `infra` |
| Score | 8.4/10 |
| Verdict | PASS |
| Iteration | 9 |
| Prior Iterations Reviewed | 1–8, including all committed readiness revisions |
| Model Tier (Execution) | high |
| Model Tier (Audit) | high |
| PASS-band Tier | 8.0–8.9 → high/high |
| Scored by | GPT-5 via Codex — fresh independent Phase 2 re-score |
| Self-scored | no |
| Date | 2026-07-28 |
| State Record | pending |
| Analysis Mode | read-only; no files changed |
| PRD Lint | WAIVED at the command surface. `node packages/provegate/dist/cli.js check PRD-034` failed only at the documented sandbox write with `EPERM: operation not permitted, open '/Users/rayvaz/Projects/provegate/_state/prds.json.10063.tmp'`. The read-only `resolveConfig` + `loadManifest` + `lintPrd(config, manifest, content, root, 34)` equivalent returned `{ "ok": true, "issues": [] }`. Command-level evidence relies on the orchestrating session’s out-of-sandbox green run dated 2026-07-28. |

## Model Tier Recommendation

Implementation: **high**. Audit: **high**.

The implementation spans configuration validation, filesystem containment, public exports, two command surfaces, packed delivery, CI wiring, migration, and production prose. The design is settled, but the cross-surface work benefits from frontier-level consistency checking.

## Iteration 9 — Final Consistency Review

### 1. Disabled-exception precedence — CLOSED

FR-2 now gives config validation precedence explicitly:

> “structural and semantic validity of `prompts.exceptions[]` is enforced at every config load — a malformed entry fails the load whether or not prompts is enabled”

It separately limits evaluation to an enabled reconciliation:

> “with `prompts.enabled` false there are no findings to suppress and no run to fail, so valid, expired and would-be-stale entries alike are inert — present, validated, unevaluated”

Section 6 repeats the complete decision:

> “a malformed entry still fails the load, while valid, expired and would-be-stale entries are inert — validated, unevaluated, unmentioned by the note”

Section 11 binds disabled-exception inertness to the production-shaped command test. FR-2, FR-3, §6, and §11 no longer permit competing outcomes.

### 2. Planned-path read failures — CLOSED

FR-1 now distinguishes absence from every other read failure:

> “a planned path whose read fails with `ENOENT` is `missing`; any other read failure … fails the run closed, naming the path and the error”

It also decides the leaf-symlink case:

> “a planned path that is a symlink is read only if its realpath stays inside the repository’s canonical containment, else it fails closed naming the escape”

The rule remains per planned leaf: no directory is listed and no orphan walk returns. Section 11 expressly requires read-error fixtures in the command test. This is sufficient to implement missing, directory-at-file, permission/I/O, and leaf-symlink behavior without reopening discovery scope.

### 3. Shipped reconciliation prose — CLOSED

FR-3 enumerates every existing production surface that becomes stale:

> “`storeReadme()`’s rendered README, the `gate init --prompts` printed output, `practices/NEXT_STEPS.md`, the `prompts.ts` module comment, the CLI help text and the `runCheck` usage line”

It gives one consistent replacement rule:

> “every one of those sentences is updated to name `gate check --prompts` as the detector while preserving the true halves — the install stays one-way, and nothing repairs or syncs automatically”

Section 6 requires the rendered README and CLI help to name the command without claiming that nothing detects staleness. Section 11 maps those production-surface assertions to the command test.

Code inspection confirms all six sites exist as described:

- `storeReadme()` currently emits “There is no upgrade path, no reconciliation” and denies automated staleness detection.
- `gate init --prompts` currently prints “no reconciliation and no sync.”
- `practices/NEXT_STEPS.md` says nothing detects staleness.
- The `prompts.ts` module comment denies reconciliation.
- CLI help enumerates `--wiring` but not `--prompts`.
- `runCheck`’s usage line likewise omits `--prompts`.

The target files already belong to FR-1, FR-3, and FR-5 scope, so no undeclared production edit is required.

## Full-Document Consistency Sweep

Every live section in the PRD was checked against the post-narrowing contract.

- **§1:** Describes the detection problem without restoring a receipt, sync, overwrite, or repair mechanism.
- **§2:** Measures planned-path divergences only; unplanned files are explicitly recorded as no-finding limits.
- **§3:** Promises no overwrite, visible reporting, and manual rebase—not automatic survival through upgrade.
- **§4:** Reads exactly `generatedPaths()`, defines five total planned-path classes, fails closed on non-ENOENT reads, performs no directory listing, and keeps exception evaluation separate from disabled config validation.
- **§5:** Places orphan/content discovery outside scope and hands its former operational questions to a future item.
- **§6:** Pins removed-adapter, renamed-tree, unplanned-file, and disabled-file invisibility to their exact scenarios. It does not promise discovery outside the planned set.
- **§7:** Keeps every deletion human-owned, makes existing-adopter pack wiring executable, updates `templates.prd` during the backslash migration, derives the generated delete set from `renderAdapters()`, and gives forward and downgrade ordering.
- **§8:** Contains every implementation file required by the FRs, including the exact pack manifest.
- **§9:** Has no unresolved questions.
- **§10:** References the state model and narrowing rationale without introducing an alternative mechanism.
- **Memory Inputs:** Each declared disposition matches the record’s actual lesson. In particular, the path domain comes from `generatedPaths()`, calendar expiry is identified as PRD-owned, extraction strictness is treated as a behavior change, and production-shaped fixtures are required.
- **Memory Outputs and Durable Artifacts:** Consistently say no stored hash and no receipt; banner version supplies attribution only.
- **Conflict Surface:** Covers the config, run, CLI, pack, CI, test, ledger, changeset, and durable-learning edits. Root `package.json` remains correctly excluded as shared append-only.
- **§11:** Maps every FR to runnable checks and binds classification, limits, read errors, disabled exceptions, production prose, pack delivery, CI ordering, and both migration scenarios.
- **§12:** Preserves zero runtime dependencies, no push/network path, no adopter-file deletion, no comparison reimplementation, and no behavior change for configurations omitting `prompts`.

No live normative statement restores an `orphaned` class, directory walk, scan root, or discovery promise. Walk/search references are denials, recorded state-model capabilities that this check does not exercise, or future-item/history context. No live statement retains the rejected empty-blast-radius claim: the measurable form consistently distinguishes accepted repository/default/fixture configurations from unknowable external adoption.

## Derivation Fidelity

Revision 2’s load-bearing boundaries remain intact:

- **T3 no-write:** `reconcilePrompts` returns typed findings and writes nothing. Exceptions suppress only an exact `modified` finding and never grant write authority.
- **T7 no-receipt:** Expected bytes are recomputed from the installed package and current config. Memory Outputs and Durable Artifacts consistently say no stored hash and no receipt.
- **Constraint 1:** Installation remains additive-only; existing files are skipped.
- **Constraint 2:** The check performs no deletion or reinstall. Every removal is an adopter action.
- **Limit 4:** A removed adapter’s surviving file produces no finding.
- **Limit 5:** A renamed-away tree produces no finding.
- **Limit 6:** Unplanned bannered, unbannered, or stripped files produce no finding.
- **T5 through the planned set:** Currently planned Claude/Cursor adapters still report divergence because their bytes embed the old store path.
- **Revision 2 attribution split:** Both deliberately unbannered paths remain byte-comparable while losing only stale-versus-modified attribution.

## Code Verification

Read-only inspection confirmed:

- `renderPrompts()` copies `prompts/PLACEHOLDERS.md` verbatim and unbannered.
- The Codex snippet is also unbannered.
- `generatedPaths()` contains rendered store members and only currently configured adapters.
- Claude, Cursor, and Codex adapter content embeds `prompts.dir`.
- Current validation accepts an internal relative backslash, so FR-2’s rejection is a real compatibility change.
- Structural and semantic config validation already have distinct stages suitable for the new exception rules.
- `promptsConfigBlock()` derives `templates.prd` from `prompts.dir`, and `createPrd()` consumes that pointer.
- `PACK_MAP`, both workflow bundles, the exact pack manifest, and the drift ledger require the named FR-5 changes.
- The hygiene job currently runs `verify:workflow` without building, so FR-4’s build-before-aggregate requirement is necessary.
- The six PRD-029-era production surfaces exist with the stale wording or missing command discoverability described by FR-3.
- The worktree remained clean after the failed command-level lint attempt.

## Hard Caps and Clarity Gate

No hard cap is triggered:

- no runtime dependency is added to `packages/provegate`;
- no network, telemetry, or remote-push path is introduced;
- no protected endpoint or client/server payload is involved;
- no method-content file is changed;
- no command gains overwrite, deletion, or receipt authority;
- the command-level lint failure has the documented sandbox waiver, and the equivalent lint is green.

The Clarity cap does not apply. Every FR has concrete targets, every FR maps to a runnable §11 command, the DO NOT section is present, Open Questions is empty, and no undecided marker remains.

## Scorecard

| Dimension | Weight | Score | Weighted |
| --- | ---: | ---: | ---: |
| Clarity | 15% | 8.0 | 1.20 |
| Completeness | 20% | 8.25 | 1.65 |
| Technical Depth | 20% | 8.25 | 1.65 |
| MT&S — repository critical rules | 10% | 9.5 | 0.95 |
| Scope & Testability | 15% | 8.0 | 1.20 |
| Migration & Rollback | 20% | 8.5 | 1.70 |
| **Total** | **100%** |  | **8.35 → 8.4** |

## Missing Pieces / Watch Items

No blocking missing pieces.

1. **Canonical containment through symlinked parents.** FR-1 explicitly covers a leaf symlink. During task generation, interpret “canonical containment” over the realpath of every existing planned destination so a non-symlink leaf beneath a symlinked parent cannot escape. The repository’s existing containment helpers document this exact distinction; add a parent-symlink escape fixture alongside the leaf-symlink fixture.

2. **Adjacent CI comment.** When the hygiene job gains a build, update the existing `.github/workflows/ci.yml` comment claiming that the other job is the “ONLY” built-CLI surface because hygiene “never builds.” The behavioral requirement is unambiguous, but leaving that comment would create another stale restatement.

3. **Production-prose audit breadth.** Automated assertions are required for the rendered README and help output, while four other named surfaces are governed by explicit implementation prose. Phase 6 should inspect all six so the untested init output, `NEXT_STEPS.md`, module comment, and `runCheck` usage line do not retain a survivor.

4. **Historical wording precision.** The newest changelog row says §6 and §11 restate all three iteration-8 seams. The read-error rule is owned by FR-1 and fixture-bound in §11, but it has no dedicated §6 criterion. This does not make implementation ambiguous, but future edits should avoid treating the historical summary as an additional normative source.

## Iteration History

| Date | Iteration | Score | Verdict |
| --- | ---: | ---: | --- |
| 2026-07-28 | 1 | 5.1 | ITERATE |
| 2026-07-28 | 2 | 7.3 | ITERATE |
| 2026-07-28 | 3 | 7.4 | ITERATE |
| 2026-07-28 | 4 | 7.6 | ITERATE |
| 2026-07-28 | 5 | 7.5 | ITERATE |
| 2026-07-28 | 6 | 7.6 | ITERATE |
| 2026-07-28 | 7 | 7.7 | ITERATE |
| 2026-07-28 | 8 | 7.8 | ITERATE |
| 2026-07-28 | 9 | 8.4 | PASS |

## Verdict

PASS. Disabled-exception precedence is decided across load and run behavior; planned-path read failures now fail closed without restoring discovery; and every stale shipped reconciliation statement is explicitly in scope with production-surface verification. The planned-set-only contract is consistent across §2, §4, §6, §7, and §11, and Revision 2’s T3, T7, constraints 1–2, limits 4–6, and T5 adapter signal remain intact.

The remaining points are bounded implementation/audit watch items. None requires a product or architectural decision, contradicts the normative behavior, trips a hard cap, or would prevent an implementing agent from proceeding autonomously.
```


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 9 transcribed
> verbatim from the eighth fresh independent Codex session of this PRD's cycle. PASS
> 8.4 — all three iteration-8 seams closed, the planned-set-only design judged
> internally consistent, faithful to Revision 2, and executable without an unresolved
> design decision; four PASS-band watch items bind Phases 3/4/6 (parent-symlink
> containment interpretation + fixture, the stale CI comment, the six-surface prose
> audit at Phase 6, and the changelog-not-normative caution). Nine iterations end to
> end: 5.1 → 7.3 → 7.4 → 7.6 → 7.5 → 7.6 → 7.7 → 7.8 → 8.4, with the owner's
> iteration-5 narrowing as the turning point. Lint EPERM is the documented sandbox
> artifact; out-of-sandbox green the same day.
