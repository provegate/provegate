# Readiness Assessment: PRD-034 — Prompt Store Reconciliation

**ITERATE — 7.7/10.** The seventh pass corrects substantial portions of the planned-set contract, but all three claimed sweep closures are incomplete. Normative discovery and empty-blast-radius residues remain, and the backslash migration still leaves a generated `templates.prd` pointer behind.

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-034-prompt-store-reconciliation.md` |
| PRD Class | `infra` |
| Score | 7.7/10 |
| Verdict | ITERATE |
| Iteration | 7 |
| Model Tier (Execution) | none |
| Model Tier (Audit) | none |
| PASS-band tier | 8.0–8.9 → high/high |
| Scored by | GPT-5 via Codex — fresh independent Phase 2 re-score |
| Self-scored | no |
| Date | 2026-07-28 |
| State Record | pending |
| Analysis Mode | read-only; no files changed |
| PRD Lint | WAIVED at the command surface. `node packages/provegate/dist/cli.js check PRD-034` failed at the documented sandbox write with `EPERM: operation not permitted, open '/Users/rayvaz/Projects/provegate/_state/prds.json.37052.tmp'`. The exact read-only `lintPrd(config, manifest, content, root, 34)` equivalent returned `{ "ok": true, "issues": [] }`. Command-level evidence relies on the orchestrating session’s out-of-sandbox green run dated 2026-07-28. |

## Iteration 7 — Sweep Review

### 1. Walk-era sentence sweep — PAPERED OVER

Several owning statements are correctly narrowed:

> “Planned-path divergences detected … all planned … unplanned files are recorded limits, pinned as no-finding fixtures” (§2, lines 64–66)

> “there is no content discovery at all — the check reads exactly the planned set” (§4, lines 104–109)

FR-1 also explicitly prohibits directory enumeration:

> “a `readFileSync` per member of `generatedPaths()`, no directory listing, no walk” (§4, lines 140–142)

However, two iteration-6 findings survive in live normative sections.

The T6 acceptance criterion still says:

> “the files on disk produce no finding in any configuration” (§6, lines 353–356)

That is false. A later enabled configuration can make one of those files planned, at which point it can report `current`, `stale`, `modified`, `missing`, or `unattributable`. The correct scope appears later:

> “Any generated files left on disk produce no finding in this configuration” (§6, lines 366–370)

Section 11 also retains the removed search contract:

> “disabled note names the unexercised search” (§11, line 629)

FR-3 instead defines the production note as naming:

> “the planned-set reconciliation” (§4, lines 215–218)

The document therefore still gives the command test two incompatible expected strings. No live `orphaned` result class or scan-root algorithm survives, but the disabled-command verification row still instructs the implementer to name a search.

### 2. Backslash migration and renderer-derived delete set — PAPERED OVER

The adapter enumeration itself is now correct:

> “delete every generated file whose CONTENT embeds `prompts.dir` … every `.claude/commands/prd-<phase>.md` … `.cursor/rules/prd-workflow.mdc` … and the codex snippet” (§7, lines 427–432)

Code confirms all nine default adapter outputs embed the configured directory:

- seven Claude phase files (`prompts.ts:788–795`);
- one Cursor rule (`prompts.ts:798–817`);
- the Codex snippet (`prompts.ts:821–829`).

`generatedPaths()` unions the rendered store and currently configured adapters (`prompts.ts:837–848`). The §11 whole-matrix row also names the full renderer-derived delete set and post-migration reconciliation (§11, line 635).

The migration is still incomplete end to end. `promptsConfigBlock()` emits:

> `templates: { prd: \`${config.prompts.dir}/templates/prd-template.md\` }` (`init.ts:395–403`)

and `gate new` reads that configured path (`new.ts:168–171`). The three migration steps move the POSIX store and edit only `prompts.dir`; they never update `templates.prd`. For the normal activation block, a POSIX adopter can therefore finish the stated procedure with a clean prompt reconciliation while `gate new` still points at the old literal-backslash directory.

The proposed fixture cannot catch this if it verifies only `generatedPaths()`, because `templates.prd` is not a generated-set member. The procedure and fixture must update and exercise this second config pointer whenever it names the old store.

### 3. Empty-blast-radius sweep — PAPERED OVER

The defensible form now exists in FR-2:

> “no known accepted repository, shipped default or fixture configuration uses an internal backslash, while external adopter usage is unknowable — the procedure is stated rather than the need denied” (§4, lines 188–191)

Memory Inputs repeats the same accepted-configuration qualification (§Memory Inputs, lines 528–533).

Two live restatements still overclaim.

FR-1 retains the exact rejected formulation:

> “no adopter migrates anything except the empty backslash-dir set FR-2 names” (§4, lines 122–124)

FR-2 does not name an empty set; it explicitly says external adopter usage is unknowable and supplies a migration.

Section 7 also says:

> “this repository’s config and every shipped default and fixture are backslash-free” (§7, lines 434–435)

That literal fixture claim is false: `config.test.ts:196–203` contains `C:\evil`. That case is refused independently as drive-anchored, so the accurate measurable statement is about **accepted** fixture configurations, not every fixture.

## Full-Document Sweep

The live PRD contains no active scan-root definition and no `orphaned` classification. References to walks or discovery in FR-1 and §5 either explicitly deny present behavior or describe a future item.

The surviving problematic statements are:

1. §6 line 356 — “no finding in any configuration,” an overbroad absence claim.
2. §11 line 629 — “unexercised search,” contradicting FR-3’s planned-set-only note.
3. FR-1 lines 122–124 — “empty backslash-dir set,” denying an unknowable adopter need.
4. §7 lines 434–435 — “every … fixture” is backslash-free, contradicted by the rejection fixture.

The dated changelog rows retain historical walk and empty-radius wording but are exempt as requested.

## Derivation Fidelity

The state-model boundaries remain intact.

- **T3 no-write:** FR-1 returns typed results and writes nothing (§4, line 151); FR-2 says no exception authorizes a write (§4, lines 194–199); §6 repeats the no-write behavior at lines 357–359.
- **T7 no-receipt:** expected bytes come from the installed package plus current config, with no stored state (§4, lines 111–115). Memory Outputs consistently says “no stored hash and no receipt” (§Memory Outputs, lines 560–567).
- **Constraint 1:** installation remains additive-only. Existing files are skipped; migration replacement requires adopter deletion followed by `init`.
- **Constraint 2:** the command only prints the deletion/reinstall remedy (§4, lines 207–214); all deletion remains an adopter action.
- **Limit 4:** a removed adapter file produces no finding (§6, lines 335–338).
- **Limit 5:** the renamed-away tree produces no finding, while currently planned external adapters expose the old embedded store path (§6, lines 347–352).
- **Limit 6:** an edited file is detected while planned and invisible once made unplanned (§6, lines 343–346).
- **T5 through the planned set:** FR-6 explicitly requires existing Claude/Cursor adapter findings because their planned bytes embed the old directory (§4, lines 275–279).

The one derivation-related contradiction is the T6 “any configuration” sentence. The planned-set mechanism itself remains faithful.

## Code Verification

Read-only inspection and probes confirmed:

- `renderAdapters()` emits only configured adapter types and interpolates `prompts.dir` into all Claude, Cursor, and Codex bodies.
- With the default three adapters and seven phase files, the renderer produces nine adapter destinations containing `prompts.dir`.
- `generatedPaths()` contains store members plus only currently configured adapters.
- The shipped default enables all three adapter types but leaves prompts disabled.
- Current validation accepts an internal relative backslash such as `foo\bar`; a read-only `validateResolvedConfig` probe returned no `prompts.dir` issue.
- `PromptsConfig`, structural validation, semantic loading, and defaults are split across the four files FR-2 targets. Adding `exceptions` requires all four surfaces as specified.
- The hygiene CI job currently installs and runs `verify:workflow` without building. FR-4’s build-before-aggregate change is necessary.
- `PACK_MAP` explicitly installs the packed workflow. Adding `verify-prompts.mjs` therefore requires the named new map row.
- `pack-manifest.json` is an exact-file manifest and must gain the packed script.
- The drift ledger already has the `verify-workflow.mjs` pair; the PRD correctly asks for one new prompt-check pair plus reconciliation of that existing pair.

Two new defects emerged from this code comparison:

1. The backslash migration omits the `templates.prd` pointer generated from `prompts.dir`.
2. The CI plan will stale the current workflow comment saying the verify job runs the “ONLY” built-CLI gate because the hygiene job “installs but never builds” (`ci.yml:40–44`). FR-4 changes both facts, while its order assertion checks only step ordering. The implementation scope must require that adjacent restatement to be updated.

## Hard Caps and Clarity Gate

No readiness hard cap is triggered:

- no runtime dependency is added to `packages/provegate`;
- no network or remote-push path is introduced;
- no method-content file is changed;
- T3 no-write, T7 no-receipt, and constraints 1–2 remain explicit;
- the lint failure is the documented sandbox `EPERM`, and the read-only lint is green.

Clarity is capped at 7.0. Live acceptance and verification surfaces still disagree about the disabled note and no-finding scope, while FR-1 contradicts FR-2 about whether the migration population is empty.

## Scorecard

| Dimension | Weight | Score | Weighted |
| --- | ---: | ---: | ---: |
| Clarity | 15% | 7.0 | 1.05 |
| Completeness | 20% | 8.0 | 1.60 |
| Technical Depth | 20% | 8.5 | 1.70 |
| MT&S — repository critical rules | 10% | 9.5 | 0.95 |
| Scope & Testability | 15% | 7.0 | 1.05 |
| Migration & Rollback | 20% | 6.5 | 1.30 |
| **Total** | **100%** |  | **7.65 → 7.7** |

## Missing Pieces

1. Complete the live narrowing sweep: scope §6 line 356 to the disabled/unplanned configuration and replace §11’s “unexercised search” with FR-3’s exact planned-set-reconciliation wording.

2. Remove the surviving empty-radius claims in FR-1 and §7. Use the accepted-configuration qualification consistently: no known accepted repository/default/fixture configuration uses an internal backslash; external adopter usage is unknowable.

3. Complete the backslash migration for `templates.prd`. When it points beneath the old store, the changeset must tell adopters to update it in the same config edit. Extend the migration fixture beyond clean reconciliation to exercise `gate new` or the production template resolver against the moved template.

4. Require FR-4’s CI edit to update the adjacent “ONLY built CLI / hygiene never builds” comment so the implementation does not knowingly create another stale restatement.

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

## Verdict

ITERATE. The planned-set-only architecture is valid, technically detailed, and faithful to the state model’s no-write, no-receipt, human-deletion, and recorded-limit boundaries. The seventh pass does not make the document internally consistent end to end: two walk-era acceptance/verification statements and two empty-radius claims survive, while the supposedly complete backslash migration leaves the generated `templates.prd` pointer behind. These are implementation-directing contradictions below the 8.0 readiness threshold.


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 7 transcribed
> verbatim from a fresh independent Codex session. 7.6 → 7.7; three residues, two of
> them the remediating session's own incomplete sweeps (again), one a real catch: the
> backslash-dir migration must update `templates.prd` in the same config edit when it
> points beneath the old store — the model's T6 templates.prd consequence applied to
> the rename. Lint EPERM is the documented sandbox artifact; out-of-sandbox green the
> same day.
