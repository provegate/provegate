# Readiness Assessment: PRD-034 — Prompt Store Reconciliation

**ITERATE — 7.6/10.** The planned-path-only narrowing is faithful at its owning FR and preserves the state-model boundaries, but the whole-document sweep did not land. Live criteria still require a walk/search, and the backslash migration is refuted by the current renderer.

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-034-prompt-store-reconciliation.md` |
| PRD Class | `infra` |
| Score | 7.6/10 |
| Verdict | ITERATE |
| Iteration | 6 |
| Model Tier (Execution) | none |
| Model Tier (Audit) | none |
| Scored by | GPT-5 via Codex — fresh independent Phase 2 re-score |
| Self-scored | no |
| Date | 2026-07-28 |
| State Record | pending |
| Analysis Mode | read-only; no files changed |
| PRD Lint | WAIVED at the command surface. `node packages/provegate/dist/cli.js check PRD-034` reached the documented sandbox write and failed with `EPERM: operation not permitted, open '/Users/rayvaz/Projects/provegate/_state/prds.json.35620.tmp'`. The exact read-only `lintPrd(config, manifest, content, root, 34)` equivalent returned `{ "ok": true, "issues": [] }`. Per instruction, command-level evidence relies on the orchestrating session’s out-of-sandbox green run dated 2026-07-28. |

## Model Tier Recommendation

No tier is assigned while the verdict is ITERATE. A PASS in the 8.0–8.9 band should use **high/high** for execution and audit.

## Iteration 6 — Narrowing Review

### 1. The structural cut is derivationally valid

Revision 2 binds the claims a check makes; it does not obligate PRD-034 to implement every discovery capability the model says is possible. Its re-derivation instructions explicitly allow a check without wider search if limits 4–6 are stated honestly.

FR-1 now defines an exact planned set:

- one file read per `generatedPaths()` member;
- no directory listing or walk;
- five planned-path classes: `missing`, `current`, `stale`, `modified`, and `unattributable`;
- no `orphaned` class in any live normative section;
- typed findings and no writes.

FR-6 and most of §6 pin the cut as observable behaviour:

- T4: a removed adapter file produces no finding;
- T5: the renamed-away tree produces no finding;
- T6/limit 6: an unplanned stripped or bannered file produces no finding;
- T5’s surviving signal is tested through planned Claude/Cursor adapter paths whose expected bytes contain the current store directory.

This follows the PRD-025 precedent correctly: the repeatedly defective layer is removed, its residuals are made explicit, and tests must fail if a later implementation casually restores it.

### 2. The full-document discovery sweep failed

The owning FR is planned-path-only, but several live statements still promise or test the removed layer:

- §2 targets **all** store divergences “per the model’s transition set” (`:66`). That includes the T4–T6 states the narrowed check deliberately does not discover.
- §4’s derivation preamble still says “content discovery finds only bannered files inside declared roots” (`:107–108`).
- §6 locates the abandoned tree “outside the walked domain” (`:345`), implying another domain is walked.
- §6 requires the disabled note to name “the bannered-orphan search” (`:364–367`).
- §11 repeats that requirement as “disabled note names the unexercised search” (`:620`).
- The T6 criterion says leftover files “produce no finding in any configuration” (`:354`). That is false once a later configuration plans one of those paths; the guarantee applies under the disabled/unplanned scenario, not every configuration.

These are not changelog history. The §6 and §11 statements directly instruct the implementer and test author to put a search back into the production contract, while FR-3 says the note names only planned-set reconciliation. The PRD therefore does not yet make one coherent claim about the narrowed command.

Clarity remains capped at 7.0 because the contradiction sits in the normative acceptance and verification surfaces.

### 3. The backslash migration is not executable against current code

The three-step order exists in §7, and the upgrade-before-config-edit ordering is viable. Its generated-content set is wrong:

> “delete the two generated adapter files and re-run `gate init --prompts`” (`:424–425`)

`renderAdapters()` shows that all three configured adapter types embed `prompts.dir`:

- Claude emits seven `.claude/commands/prd-<phase>.md` files using the directory directly (`prompts.ts:789–795`);
- Cursor emits `.cursor/rules/prd-workflow.mdc` containing the shared table (`:798–817`);
- Codex emits `<dir>/AGENTS.md.provegate.snippet` containing that same table (`:821–829`).

The shipped default enables all three (`defaults.ts:116–120`). A read-only render using that default produced nine adapter paths containing the old spelling: seven Claude files, one Cursor file, and the Codex snippet.

After `git mv` moves the store and the config is edited, the moved Codex snippet exists at its new path with old embedded bytes. Additive-only `init` skips it. Deleting only two files also cannot cover the seven Claude destinations. The migration must identify and delete every configured adapter output whose bytes depend on `prompts.dir`, including the Codex snippet at the post-move path, before reinstalling.

No focused §11 check proves the backslash changeset procedure or that the migrated generated set reconciles. The existing migration fixture is for practices-pack wiring, not this directory migration.

### 4. The blast-radius sweep also remains incomplete

The correctly scoped statement appears in §7: repository configuration and shipped configurations are measurable; the external adopter population is not.

Three live restatements retain the rejected “empty” claim:

- FR-1 says the backslash-dir migration set is empty (`:121–123`);
- FR-2 says no shipped fixture uses a backslash and the practical blast radius is empty (`:187–189`);
- Memory Inputs says the change has “an empty measured blast radius” (`:520–524`).

The literal fixture claim is also false: `config.test.ts` includes `C:\evil`, although that case is independently refused as drive-anchored. The defensible measurement is that no known **accepted** repository/default/fixture configuration uses an internal backslash. Current validation still accepts `foo\bar`, confirmed by a read-only `validateResolvedConfig` probe returning no issues.

### 5. User Story 2 is closed

The previous upgrade-survival contradiction is removed. User Story 2 now promises only what the mechanism supplies:

- no tool overwrites the edit;
- the exception remains a visible, expiring owner decision;
- an upgrade reports the divergence;
- the adopter rebases manually;
- no exception authorizes a write.

That agrees with FR-2’s `modified`-only suppression, stale-entry failure, and T3’s authority boundary.

### 6. State-model invariants remain intact

- **T3 no-write:** reconciliation returns findings; exceptions only suppress a `modified` finding and never authorize a write.
- **T7 no-receipt:** expected bytes are recomputed from installed package plus current config; no stored hash or receipt is introduced. Banner version remains attribution, not integrity state.
- **Constraint 1:** installation remains additive-only; existing paths are not overwritten.
- **Constraint 2:** every deletion in reporting and migration remains an adopter action.
- No runtime dependency, network path, remote push path, or method-content change is introduced.

## Code Verification

Read-only inspection and probes confirmed:

- `generatedPaths()` contains rendered store paths plus only currently configured adapters (`prompts.ts:837–848`).
- `renderAdapters()` embeds the raw `prompts.dir` spelling in Claude, Cursor, and Codex content (`prompts.ts:782–829`).
- The shipped default configures all three adapters (`defaults.ts:116–120`).
- Empty adapter membership remains legal (`config.test.ts:185–188`).
- Current lexical validation accepts an internal backslash such as `foo\bar`, while rejecting absolute, drive-relative, home-relative, and `..` forms (`validate.ts:467–481`).
- The rendered default adapter set has nine paths whose bytes contain the configured directory spelling.
- Repository status remained unchanged; the failed lint command left no temporary state file.

## Hard Caps and Clarity Gate

No readiness hard cap is triggered:

- no runtime dependency is added to `packages/provegate`;
- no network or remote-push path is introduced;
- no method-content file is changed;
- T3 no-write, T7 no-receipt, and constraints 1–2 remain explicit;
- the CLI lint failure is the documented sandbox `EPERM`, and the read-only lint is green.

Clarity is capped at 7.0. The normative document simultaneously says there is no walk/search and requires the disabled output and tests to name an unexercised orphan search. The migration also names a generated-file set contradicted by the renderer.

## Scorecard

| Dimension | Weight | Score | Weighted |
| --- | ---: | ---: | ---: |
| Clarity | 15% | 7.0 | 1.05 |
| Completeness | 20% | 8.0 | 1.60 |
| Technical Depth | 20% | 8.5 | 1.70 |
| MT&S — repository critical rules | 10% | 9.5 | 0.95 |
| Scope & Testability | 15% | 7.0 | 1.05 |
| Migration & Rollback | 20% | 6.0 | 1.20 |
| **Total** | **100%** |  | **7.55 → 7.6** |

## Missing Pieces

1. Complete the narrowing sweep in live sections: scope §2’s metric to planned paths; remove §4’s declared-root content-discovery sentence; replace §6’s “walked domain” and “bannered-orphan search”; scope the T6 no-finding claim to its disabled/unplanned configuration; and make §11 test the same planned-set-only note FR-3 promises.

2. Correct the backslash migration against `renderAdapters()`: enumerate every configured adapter destination whose content embeds `prompts.dir`, including all Claude phase files, Cursor, and the moved Codex snippet; delete those paths before reinstall; and add a focused verification that the changeset carries the procedure and the migrated generated set reconciles.

3. Replace the remaining empty-blast-radius claims in FR-1, FR-2, and Memory Inputs with the measurable statement already used in §7: no known accepted repository/default/fixture configuration uses an internal backslash, while external adopter usage is unknown.

## Iteration History

| Date | Iteration | Score | Verdict |
| --- | ---: | ---: | --- |
| 2026-07-28 | 1 | 5.1 | ITERATE |
| 2026-07-28 | 2 | 7.3 | ITERATE |
| 2026-07-28 | 3 | 7.4 | ITERATE |
| 2026-07-28 | 4 | 7.6 | ITERATE |
| 2026-07-28 | 5 | 7.5 | ITERATE |
| 2026-07-28 | 6 | 7.6 | ITERATE |

## Verdict

ITERATE. The owner’s structural narrowing is valid and the core planned-path contract is substantially ready, including explicit negative fixtures for limits 4–6, preserved T5 adapter-staleness detection, T3 no-write, and T7 no-receipt. It does not yet survive the required whole-document sweep: §2, §4, §6, and §11 retain discovery obligations the FR removed, and the backslash migration misses generated content demonstrably produced by the current default renderer.


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 6 transcribed
> verbatim from a fresh independent Codex session. The owner's narrowing was accepted as
> the right structural move (7.5 → 7.6, findings shifted from design to sweep
> completeness): three pieces remain, all mechanical — stale walk-era sentences in five
> live sections, the migration's adapter enumeration corrected against
> `renderAdapters()` (every claude phase file + cursor + the codex snippet embed the
> dir, not "two adapters"), and the empty-blast-radius phrasing replaced with the
> measurable §7 form. Lint EPERM is the documented sandbox artifact; out-of-sandbox
> green the same day.
