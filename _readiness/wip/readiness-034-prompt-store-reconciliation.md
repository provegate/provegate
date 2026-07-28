# Readiness Assessment: PRD-034 — Prompt Store Reconciliation

**ITERATE — 7.8/10.** All three iteration-7 remediation pieces are genuinely closed, and the planned-set-only design is internally consistent across its principal requirements. The final code sweep found two user-visible reconciliation denials that the PRD does not require the implementation to remove, plus an unresolved disabled-exception precedence rule and planned-path I/O behavior. These could mislead an implementing agent or adopter, so the item remains below the 8.0 gate.

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-034-prompt-store-reconciliation.md` |
| PRD Class | `infra` |
| Score | 7.8/10 |
| Verdict | ITERATE |
| Iteration | 8 |
| Prior Iterations Reviewed | 1–7, including their committed readiness revisions |
| Model Tier (Execution) | none — ITERATE |
| Model Tier (Audit) | none — ITERATE |
| PASS-band Tier | 8.0–8.9 → high/high |
| Scored by | GPT-5 via Codex — fresh independent Phase 2 re-score |
| Self-scored | no |
| Date | 2026-07-28 |
| State Record | pending |
| Analysis Mode | read-only; no files changed |
| PRD Lint | WAIVED at the command surface. `node packages/provegate/dist/cli.js check PRD-034` failed at the documented sandbox write with `EPERM: operation not permitted, open '/Users/rayvaz/Projects/provegate/_state/prds.json.45248.tmp'`. The read-only `resolveConfig` + `loadManifest` + `lintPrd(config, manifest, content, root, 34)` equivalent returned `{ "ok": true, "issues": [] }`. Command-level evidence relies on the orchestrating session’s out-of-sandbox green run dated 2026-07-28. |

## Iteration 8 — Consistency Review

### 1. Disabled-case scope and §11 wording — GENUINELY CLOSED

The formerly universal no-finding claim is now explicitly limited:

> “in this disabled configuration the files left on disk produce no finding — the limits-4-6 pin for the unplanned/disabled case, not a claim about enabled planned paths” (§6)

The second disabled criterion repeats the same boundary:

> “Any generated files left on disk produce no finding in this configuration” (§6)

Section 11 now matches FR-3’s production-surface wording:

> “disabled note names the unexercised planned-set reconciliation + T6 consequences verbatim” (§11, FR-3)

No live acceptance or verification sentence still requires an orphan search.

### 2. Accepted-configuration blast-radius wording — GENUINELY CLOSED

FR-1 replaces the rejected empty-population claim with:

> “needed by no known accepted repository/default/fixture configuration, while external adopter usage is unknowable” (§4, FR-1)

FR-2 and Memory Inputs use the same measurable qualification:

> “no known accepted repository, shipped default or fixture configuration uses an internal backslash, while external adopter usage is unknowable” (§4, FR-2)

Section 7 similarly distinguishes measurable repository/default/fixture evidence from an adopter population that cannot be enumerated. The `C:\evil` rejection fixture no longer contradicts the claim because the statement is expressly about accepted configurations.

### 3. Backslash migration and `templates.prd` — GENUINELY CLOSED

The migration now updates both config pointers atomically:

> “edit `prompts.dir` to the new value — **and in the same config edit, update `templates.prd` wherever it points beneath the old store spelling**” (§7)

It also requires production-shaped verification:

> “the production template resolver (`gate new`’s read of `templates.prd`) resolves against the moved template rather than the abandoned spelling” (§7)

Code confirms the need and the closure: `promptsConfigBlock()` derives `templates.prd` from `config.prompts.dir`, while `createPrd()` reads `config.templates.prd`. The migration also correctly derives its generated-content delete set from `renderAdapters()`: every Claude phase file, the Cursor rule, and the Codex snippet embed the configured directory.

The §11 whole-matrix row names the backslash migration and renderer-derived delete set. Section 7 supplies the additional mandatory template-resolver assertion, so the test contract is implementable without guessing.

### 4. New contradiction: disabled reconciliation versus exception staleness

FR-2 states without qualification:

> “An entry whose path is not currently `modified` is a stale entry and fails the run.”

FR-3 states:

> “`prompts.enabled` false → exit 0 with a note”

and §6 repeats an unconditional disabled exit-zero criterion.

A valid config can retain `prompts.exceptions` while switching `enabled` to `false`. The document does not decide whether:

- exceptions become dormant and their runtime expiry/staleness checks are skipped;
- non-empty exceptions are invalid while disabled; or
- exception failures take precedence over the disabled exit-zero rule.

An implementing agent must choose. The fixture matrix has no disabled-plus-exception case. This is a live FR-2/FR-3 contradiction, so Clarity remains capped at 7.0.

### 5. New code defect: shipped surfaces still deny reconciliation exists

The PRD targets all affected files but never requires their existing statements to change.

`storeReadme()` emits a planned `README.md` containing:

> “There is no upgrade path, no reconciliation”

and:

> “Automated staleness detection is deliberately not part of this version.”

`gate init --prompts` prints:

> “There is no upgrade path, no reconciliation and no sync in this version.”

The packed `practices/NEXT_STEPS.md` similarly says:

> “There is no upgrade path, no reconciliation … nothing detects that it is stale”

These become false when PRD-034 lands. Because `renderPrompts()` always adds the generated README to the planned set, a fresh post-034 install would ship documentation saying the new command does not exist. The module-level comment in `prompts.ts` repeats the same obsolete rule.

The implementation could satisfy every current FR and test while leaving all these contradictions intact. The correct replacement should preserve the true boundary—one-way additive installation, no automated repair or sync—while naming the new read-only reconciliation check.

The CLI help and its no-argument usage text also enumerate `--wiring` but not the new `--prompts` command surface, with no test requiring discoverability.

### 6. New edge ambiguity: planned-path read failures

FR-1 promises a total five-class result for every planned path and then says no filesystem contract is needed. A planned destination that exists but is unreadable, is a directory, or is a symlink whose target cannot be read is neither `missing` nor byte-comparable.

The orphan-walk filesystem questions are correctly out of scope, but planned-file reads still need a narrow rule: distinguish `ENOENT` from other read failures, name the affected planned path, fail closed, and decide whether reconciliation follows a leaf symlink outside the workspace. The current matrix covers absence but not these reachable read failures.

## Full-Document Sweep

Every live sentence in §§1–12, Memory Inputs, Memory Outputs, Conflict Surface, and Durable Artifacts was checked.

No live statement:

- defines or implies a directory walk or scan root;
- restores an `orphaned` classification;
- promises discovery of an unplanned file;
- claims the backslash migration population is empty; or
- gives the renamed-away tree or removed adapter file a finding.

Remaining references to walks, searches, orphan discovery, or unplanned files are explicit denials, recorded limits, future-item boundaries, or explanations of the owner’s narrowing. Dated changelog rows retain historical designs and are exempt.

The principal §2/§4/§6/§7/§11 planned-set contract is consistent:

- §2 measures planned paths and records unplanned files as no-finding limits.
- §4 reads exactly `generatedPaths()` and has five total byte-based classes.
- §6 pins removed-adapter, renamed-tree, and unplanned-file invisibility.
- §7’s migration performs human deletion and additive reinstall without granting write authority to reconciliation.
- §11 tests planned classification and all three limit pins.

The disabled-exception precedence issue is the remaining internal contradiction.

## Derivation Fidelity

The Revision 2 boundaries remain intact:

- **T3 no-write:** the primitive returns typed findings and “writes nothing”; exceptions suppress only `modified` and never authorize a write.
- **T7 no-receipt:** expected bytes come from the installed package and current config; Memory Outputs and Durable Artifacts consistently say “no stored hash and no receipt.”
- **Constraint 1:** installation remains additive-only; existing files are skipped.
- **Constraint 2:** every deletion is an adopter action. The command prints the reinstall remedy but performs neither deletion nor reinstall.
- **Limit 4:** a removed adapter file produces no finding.
- **Limit 5:** a renamed-away tree produces no finding.
- **Limit 6:** an unplanned bannered, unbannered, or stripped file produces no finding.
- **T5 through the planned set:** current Claude/Cursor adapters still report divergence because their bytes embed the old store path.

The stale shipped “no reconciliation” messages contradict the new capability, but they do not relax the model’s no-write or no-receipt boundaries.

## Code Verification

Read-only inspection confirmed:

- `renderPrompts()` copies `PLACEHOLDERS.md` verbatim and unbannered, while the Codex snippet is also unbannered.
- `generatedPaths()` contains the rendered store and only currently configured adapters.
- All default Claude, Cursor, and Codex adapter outputs embed `prompts.dir`.
- Current validation accepts an internal relative backslash; the PRD’s new load-time rejection is therefore a real behavior change.
- `promptsConfigBlock()` derives `templates.prd` from the store directory, and `createPrd()` consumes that pointer.
- `PACK_MAP`, the exact pack manifest, both workflow bundles, and the drift ledger require the FR-5 edits named by the PRD.
- The hygiene job currently lacks a build before `verify:workflow`; FR-4’s ordered build remains necessary.
- The existing generated README, init output, packed next-steps document, module comment, and CLI usage text all require a consistency update that the PRD does not presently mandate.

## Hard Caps and Clarity Gate

No readiness hard cap is triggered:

- no runtime dependency is added to `packages/provegate`;
- no network or remote-push path is introduced;
- no command gains overwrite or deletion authority;
- no receipt or stored hash is introduced;
- method-content files are not changed;
- the lint command failure is the documented sandbox `EPERM`, and the read-only lint is green.

Clarity is capped at 7.0 because FR-2 and FR-3 give incompatible outcomes for a disabled configuration retaining exceptions.

## Scorecard

| Dimension | Weight | Score | Weighted |
| --- | ---: | ---: | ---: |
| Clarity | 15% | 7.0 | 1.05 |
| Completeness | 20% | 7.0 | 1.40 |
| Technical Depth | 20% | 8.0 | 1.60 |
| MT&S — repository critical rules | 10% | 9.5 | 0.95 |
| Scope & Testability | 15% | 7.0 | 1.05 |
| Migration & Rollback | 20% | 8.5 | 1.70 |
| **Total** | **100%** |  | **7.75 → 7.8** |

## Missing Pieces

1. Decide disabled-exception precedence. Align FR-2, FR-3, §6, and the fixture matrix on whether valid, expired, and stale exception entries are ignored, refused, or evaluated while `prompts.enabled` is false.

2. Require a reconciliation-restatement sweep across the existing production surfaces already in scope: `storeReadme()` output, `gate init --prompts` output, `practices/NEXT_STEPS.md`, the `prompts.ts` module comment, CLI help, and `runCheck` usage. Preserve “one-way/no automated repair or sync” while removing the false “no reconciliation/nothing detects staleness” claim, with production-surface tests.

3. Define planned-path read-error behavior independently of orphan discovery: `ENOENT` maps to `missing`; other I/O/type failures fail closed and name the path; explicitly decide leaf-symlink containment. Add focused fixtures that do not reintroduce a directory walk.

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

## Verdict

ITERATE. The eighth pass genuinely closes all three iteration-7 residues: the planned-set wording is consistent, the blast-radius claim is measurable, and the backslash migration now updates and exercises `templates.prd`. The document still permits an implementation that chooses contradictory disabled-exception semantics and ships multiple production surfaces falsely stating that reconciliation and staleness detection do not exist. Planned-path read failures are also outside the supposedly total classification. Those remaining points would mislead an implementing agent or adopter and must be specified before PASS.

---


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 8 transcribed
> verbatim from a fresh independent Codex session. 7.7 → 7.8; the seven prior pieces
> held, three new legitimate seams: disabled-exception precedence undecided, the
> PRD-029-era production surfaces still claim "nothing detects staleness" (which this
> PRD falsifies — `a-rule-corrected-survives-where-it-is-restated` on shipped prose),
> and planned-path read-error behavior needed its own contract now that the walk is
> gone. Lint EPERM is the documented sandbox artifact; out-of-sandbox green same day.
