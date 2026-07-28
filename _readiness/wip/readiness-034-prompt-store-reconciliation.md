# Readiness Assessment: PRD-034 — Prompt Store Reconciliation

**ITERATE — 7.5/10.** Both iteration-4 counterexamples are repaired in their owning FRs, but neither fifth-pass closure survives the full-document and migration sweep intact.

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-034-prompt-store-reconciliation.md` |
| PRD Class | `infra` |
| Score | 7.5/10 |
| Verdict | ITERATE |
| Iteration | 5 |
| Model Tier (Execution) | none |
| Model Tier (Audit) | none |
| Scored by | GPT-5 via Codex — fresh independent Phase 2 re-score |
| Self-scored | no |
| Date | 2026-07-28 |
| State Record | pending |
| Analysis Mode | read-only; no files changed |
| PRD Lint | WAIVED at the command surface. `node packages/provegate/dist/cli.js check PRD-034` reached the documented sandbox write and failed with `EPERM: operation not permitted, open '/Users/rayvaz/Projects/provegate/_state/prds.json.32036.tmp'`. The exact read-only `lintPrd(config, manifest, content, root, 34)` equivalent returned `{ "ok": true, "issues": [] }`. Per instruction, command-level evidence relies on the orchestrating session’s out-of-sandbox green run dated 2026-07-28. |

## Model Tier Recommendation

No tier is assigned while the verdict is ITERATE. A future PASS in the 8.0–8.9 band should use **high/high** for execution and audit.

## Iteration 5 — Seam Review

### 1. Unconditional fixed adapter roots — PAPERED OVER

The original iteration-4 counterexample is closed in FR-1. The scan roots no longer disappear when an adapter leaves live configuration:

> “the walk visits the dirname set of `generatedPaths()`'s members PLUS, unconditionally, the two fixed adapter roots `.claude/commands/` and `.cursor/rules/`” (§4, lines 144–146)

> “deriving them from the live config would silently drop a REMOVED adapter's root and make T4's central orphan … undiscoverable” (§4, lines 146–150)

That is faithful to Revision 2’s T4 requirement:

> “Removing one from the config removes it from the plan, and does nothing on disk. The previous file stays” (state model, lines 192–195)

> “The disagreement is discoverable … by recognising the generated banner in a file the current plan does not produce” (state model, lines 202–205)

The store-side bound is also preserved:

> “the bound survives `prompts.dir: "."` because the store-side dirname set under `.` is still only the planned directories, never the repository” (§4, lines 151–153)

The replacement domain nevertheless leaves a new operational seam. Enabled configurations may legally declare no external adapters: the current suite explicitly asserts that `prompts.adapters: []` loads successfully (`config.test.ts`, lines 185–188). Such a repository may have neither fixed directory. The PRD says the roots are visited unconditionally and that:

> “an unreadable entry is a named failure rather than a skip” (§4, lines 154–157)

It never decides whether an absent fixed root is an empty scan, an unreadable-root failure, or something else. The live repository demonstrates the shape: `.claude/commands/` is absent, while `.cursor/rules/` exists for unrelated agent configuration. Walking a never-enabled adapter root also expands reads into user-owned files; because banner discovery requires reading candidates, an unreadable unrelated command could fail reconciliation unless the contract scopes that failure deliberately.

Two stale restatements preserve the previous domain:

> “the path domain always computed from `generatedPaths()`” (§4 FR-6, lines 271–273)

> “orphan discovery is a separate, deliberately bounded banner-search over three declared roots” (Memory Inputs, lines 488–493)

Neither describes “planned dirnames plus two unconditional constants.” The first directly excludes the new constants; the second collapses a multi-directory store-side set into an obsolete three-root model.

The removed-adapter case is now discoverable, but the new domain is not implementable without choosing missing-root and unrelated-entry behavior, and the document still gives implementers incompatible domain definitions.

### 2. Backslash rejection at config load — PAPERED OVER

The technical contradiction from iteration 4 is closed at the right boundary. FR-1 now conditions canonical report spelling on load-time rejection:

> “no backslash can survive in it, because `prompts.dir` itself refuses backslashes at load from this PRD on” (§4, lines 118–119)

FR-2 names the strictness as a behavior change to exactly the existing key involved:

> “`prompts.dir` itself gains the backslash rejection at config load” (§4, lines 188–190)

The production-shaped fixture reaches that seam:

> “a config whose `prompts.dir` contains a backslash asserts the load refusal naming the key” (§4, lines 291–294)

This is correctly scoped. Current code accepts an internal backslash through `unsafeRelPath()` because it splits on both separators only to inspect segments (`validate.ts`, lines 467–481); a read-only built-code probe confirmed `validateResolvedConfig` returns no issue for `foo\bar`. A dedicated `prompts.dir` validation clause can reject it without tightening every path that shares `unsafeRelPath()`.

The migration is not complete, however. The sole procedure is:

> “the changeset carries the migration line (rename the directory, update the value …)” (§4, lines 196–198)

Changing the spelling does more than relocate the store on POSIX. The renderer embeds `prompts.dir` in the Claude, Cursor, and Codex adapter contents (`prompts.ts`, lines 785, 793, 815 and 828). Revision 2 makes that consequence explicit:

> “the adapters embed store paths in their content” (state model, lines 225–229)

After “rename the directory, update the value,” those generated files still contain the old spelling. Additive-only `init` skips them. The migration must therefore include regeneration of the affected generated unit, with ordering that remains executable once the new package refuses the old config. The current two-step line leaves an adopter with `modified` adapters/snippet and no complete transition to current bytes.

The evidence for an empty blast radius is also overstated:

> “no shipped default or fixture uses a backslash, so the practical blast radius is empty” (§4, lines 197–198)

The shipped default is forward-slashed, and no accepted in-repository fixture exercises a legal internal-backslash directory. That measures the repository corpus, not external adopters. Moreover, `config.test.ts` already contains a backslash `prompts.dir` fixture (`C:\evil`, lines 196–203), although it is independently invalid as drive-anchored. The honest claim is “no known accepted in-repository configuration,” with external usage unknown—not an empty adopter blast radius.

The migration is absent from the section that owns existing-adopter migration (§7, lines 389–408), which discusses only practices-pack wiring. Rollback and ordering (§7, lines 410–434) likewise cover exceptions and wiring but not the new directory-spelling transition. Finally, §11 says its rows scope each FR to its own test, yet FR-2’s row names only the `exception` cases (§11, lines 596–605); the backslash-dir load refusal appears only under the whole FR-6 matrix. The fixture exists in prose, but the owning strictness requirement lacks a focused verification mapping.

## Derivation Fidelity

The state-model boundaries remain intact:

- **T3 no-write:** FR-1 returns findings and writes nothing (§4, lines 159–160); FR-2 says an exception never authorizes a write (§4, lines 201–206).
- **T7 no-receipt:** expected bytes are recomputed from the installed package and current config, with no stored state (§4, lines 109–113). Memory Outputs correctly limits stored provenance to the banner version (lines 534–543).
- **Constraint 1:** nothing edits the adopter’s activation/config record.
- **Constraint 2:** deletion remains a human action; the check only reports remedies.
- No runtime dependency, network access, or remote-push path is introduced.
- The two unbannered planned paths remain byte-detectable but version-unattributable, faithful to Revision 2.
- The bounded search honestly declines renamed-away-tree discovery outside its declared domain.

The fifth-pass changes do not violate T3, T7, or constraints 1–2. Their defects concern domain totality, migration completeness, and contradictory restatements.

## Whole-Document Consistency Sweep

One additional contradiction remains outside the two named seams. User Story 2 promises:

> “I want that edit to survive upgrades and still be visible as a decision” (§3, lines 89–91)

But an exception suppresses only `modified`; after a package upgrade, a bannered edited file at the old version becomes `stale`, which is explicitly never exceptable:

> “It suppresses nothing else: `stale`, `missing`, `orphaned` and `unattributable` are never exceptable” (§4, lines 201–204)

The entry then becomes stale because its path is not currently `modified` and fails the run (§4, lines 205–206), while FR-3 prints T2’s delete-and-reinstall remedy. This preserves no-write fidelity and makes the decision visible, but it does not make the edit survive an applied upgrade. The document must either narrow the user story to “never silently overwritten; owner rebases or spares it manually” or specify the manual preservation/rebase transition without granting write authority.

Other prior closures remain sound:

- T5 adapter staleness and T6 production guidance are bound to production-shaped CLI tests.
- The exact pack manifest is targeted in FR-5, Implementation Scope, and Conflict Surface.
- T7 attribution wording consistently says banner version, no hash and no receipt.
- Sections 8 and 10 enumerate the implementation and conflict surfaces completely.
- Section 12 preserves the no-dependency, no-push, no-delete, and config-omission boundaries.

## Code Verification

Read-only source inspection confirmed:

- `renderAdapters()` emits external adapters only for current membership (`prompts.ts`, lines 788–831), validating why fixed roots must be independent of live membership.
- `generatedPaths()` contains only rendered store members and currently configured adapters (`prompts.ts`, lines 837–848).
- Empty adapter membership is a supported configuration (`config.test.ts`, lines 185–188).
- The default prompt block is disabled and uses forward-slash `.provegate` (`defaults.ts`, lines 110–120).
- Current lexical validation accepts internal backslashes while rejecting leading, drive-anchored, home-relative and `..` forms (`validate.ts`, lines 467–481).
- Config resolution performs structural validation before merged semantic validation (`load.ts`, lines 290–323), so a dedicated load-time `prompts.dir` refusal is feasible.
- Store and adapter destinations use native path resolution during installation, while rendered adapter bytes embed the raw configured directory spelling.
- The current repository has no `.claude/commands/` directory and has an unrelated `.cursor/rules/brain.mdc`, demonstrating both missing-root and shared-root shapes.

## Hard Caps and Clarity Gate

No readiness hard cap is triggered:

- No runtime dependency is added to `packages/provegate`.
- No network or remote-push path is introduced.
- No method-content file is changed.
- T3 no-write, T7 no-receipt, and constraints 1–2 remain explicit.
- The CLI lint failure is the documented sandbox write `EPERM`; the read-only lint is green.

Clarity is capped at 7.0. The orphan domain is restated incompatibly in FR-1, FR-6, and Memory Inputs; missing fixed-root behavior is undecided; and User Story 2’s upgrade-survival promise is stronger than the exception semantics. These are central behavior contracts, not editorial defects.

## Scorecard

| Dimension | Weight | Score | Weighted |
| --- | ---: | ---: | ---: |
| Clarity | 15% | 7.0 | 1.05 |
| Completeness | 20% | 7.5 | 1.50 |
| Technical Depth | 20% | 8.0 | 1.60 |
| MT&S — repository critical rules | 10% | 9.5 | 0.95 |
| Scope & Testability | 15% | 7.0 | 1.05 |
| Migration & Rollback | 20% | 6.5 | 1.30 |
| **Total** | **100%** |  | **7.45 → 7.5** |

## Missing Pieces

1. Define the unconditional fixed-root behavior completely: nonexistent root, unreadable root, unrelated readable/unreadable immediate entries, and directory symlinks. State whether an absent root is an empty scan and whether never-enabled adapter directories intentionally enter the read/failure domain. Add a fixture with `prompts.adapters: []`, neither fixed root present, and a current store.

2. Replace every stale traversal restatement. FR-6 must say the orphan domain is planned dirnames plus the two fixed constants, and Memory Inputs must describe that exact set rather than “three declared roots.”

3. Complete the backslash migration. Specify an executable order for editing the config, relocating the POSIX store where necessary, and regenerating every generated file whose bytes embed the old directory spelling. Put the procedure in §7 and the changeset contract, scope blast-radius evidence to known repository configurations, and map the load-refusal fixture to FR-2’s focused §11 verification.

4. Reconcile User Story 2 with the stale-only-on-upgrade behavior. Either narrow “survive upgrades” to the actual no-silent-write/manual-rebase guarantee or define how an owner preserves/rebases an excepted edit during T2 without letting the exception authorize a write.

## Iteration History

| Date | Iteration | Score | Verdict |
| --- | ---: | ---: | --- |
| 2026-07-28 | 1 | 5.1 | ITERATE |
| 2026-07-28 | 2 | 7.3 | ITERATE |
| 2026-07-28 | 3 | 7.4 | ITERATE |
| 2026-07-28 | 4 | 7.6 | ITERATE |
| 2026-07-28 | 5 | 7.5 | ITERATE |

## Verdict

ITERATE. The original removed-adapter and canonical-backslash counterexamples are repaired at their owning mechanisms, and the state-model boundaries remain faithful. The replacement orphan domain still lacks missing/shared-root semantics and survives in two contradictory restatements; the new backslash behavior change lacks a complete generated-content migration and overstates its measured blast radius; and the upgrade-survival user story remains stronger than the exception behavior.


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 5 transcribed
> verbatim from a fresh independent Codex session. Trajectory 5.1 → 7.3 → 7.4 → 7.6 →
> 7.5: flat-to-oscillating across three consecutive rounds inside the iterate band,
> with every round's findings landing in the same layer — the orphan-discovery walk and
> path/exception micro-semantics. Per `scope-out-the-layer-the-rounds-keep-hitting` and
> `score-band-prescribes-the-action` (and the PRD-025 precedent), this is a scope error
> reporting itself as a run of design errors, and the next action is an OWNER structural
> decision — narrow the layer out or keep clause-patching — not another unilateral
> wording round. The decision request is on the board. Lint EPERM is the documented
> sandbox artifact; out-of-sandbox green the same day.
