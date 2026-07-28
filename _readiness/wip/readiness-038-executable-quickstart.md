# Readiness Assessment: PRD-038 — Executable Quickstart

> **Verdict: ITERATE — 4.95/10.** Return to Phase 1. The documented shell fences do not form one runnable scenario, and the proposed test deadlocks against the runner’s re-entry guard.

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-038-executable-quickstart.md` |
| Score | 4.95/10 |
| Verdict | ITERATE |
| Iteration | 1 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit) | — |
| Scored by | Codex (GPT-5), independent scorer |
| Self-scored | no |
| Date | 2026-07-28 |
| PRD Lint | waived for sandbox write restriction — the exact CLI failed with `EPERM` writing `_state/prds.json.<pid>.tmp`; the read-only `lintPrd(config, manifest, content, root, 38)` equivalent returned `{ ok: true, issues: [] }`. Relied additionally on the orchestrating session’s out-of-sandbox green run dated 2026-07-28. |
| State Record | pending |

---

## Model Tier Recommendation

| Phase | Tier | Rationale |
| --- | --- | --- |
| Phase 1 remediation | high | The revision must define an executable state machine spanning Markdown selection, Git/worktree state, runner artifacts, Turbo, and repository verifier wiring. |
| Phase 4 execution | Do not assign — fix PRD first | The present FRs cannot produce a passing implementation without making unrecorded design decisions. |
| Phase 6 audit | — | Re-score independently after remediation. |

---

## Analysis

### 1. Technical Depth & Architecture

**[FINDING — Clarity]** FR-1 mistakes “shell fence” for “one executable scenario.” The package document has 11 fences: nine `sh`, one untagged handoff-output example, and one `json` example (`packages/provegate/QUICKSTART.md:9-173`). The language tags already distinguish commands from output, so the contemplated output-retagging at `_prds/wip/prd-038-executable-quickstart.md:101-107` is unnecessary. They do not distinguish canonical-flow commands from alternatives and later optional material. Extracting every `sh` fence yields 14 commands, including both a plain claim and a later worktree claim, followed after the close by `gate init --practices`, `gate doctor`, and `gate memory find` (`packages/provegate/QUICKSTART.md:37-69`, `:97-100`, `:142-173`). Those are not one ordered init→new→check→run program.

**[FINDING — Completeness]** The printed sequence cannot advance from `gate new` to `gate check` without executing prose-defined human work that FR-2 never models. `gate new` instantiates placeholders, unresolved Open Questions, example targets, verification commands, Memory Outputs, and Conflict Surface entries (`packages/provegate/templates/prd-template.md:30-235`). `lintPrd` rejects missing/unrunnable FR verification, unresolved questions, placeholders, unsafe commands, and malformed durable declarations (`packages/provegate/src/core/gates/prd-ready.ts:109-179`). The harness therefore needs a specified transition that fills the generated PRD; merely running the next fence fails.

**[FINDING — Technical Depth]** A successful close needs substantially more state than the PRD provisions. `gate run` requires runnable §11 commands, a task file with a passing independent-review row, and durable artifacts present in the merge diff (`packages/provegate/src/core/run/chain.ts:468-555`). It then requires execution from a non-base, clean feature branch (`packages/provegate/src/core/run/merge.ts:163-182`). The quickstart’s worktree block creates such a checkout, but the next printed command remains in the original checkout; the runner explicitly refuses when the lease pins a different branch and tells the caller to run from the claimed worktree (`packages/provegate/src/cli.ts:1197-1208`). FR-2 does not specify task/readiness/review creation, commits, branch transition, worktree-output parsing, or `cwd` movement.

**[FINDING — Scope & Testability]** The mutation criterion “reorder two commands” is not a defined mutation. Some reorderings are observationally harmless; others fail before the behavior under test. The PRD must name the exact pair, expected failing step, and expected diagnostic. Its current wording at `_prds/wip/prd-038-executable-quickstart.md:160-164` cannot prove that the committed document—not harness scaffolding—owns the ordering.

### 2. Edge Cases & Failure Modes

**[FINDING — Technical Depth]** The proposed §11 commands cannot verify a nested live close under `gate run`. Phase 5 executes §11 commands with `PROVEGATE_RUN_ACTIVE=1` (`packages/provegate/src/core/run/chain.ts:815-828`). The nested CLI explicitly refuses every non-dry `gate run` when that variable is set (`packages/provegate/src/cli.ts:1013-1024`). All three scoped test rows at `_prds/wip/prd-038-executable-quickstart.md:280-283` directly invoke the package test that is supposed to spawn the live close. This is the exact failure recorded by `_brain/learnings/runner-sentinel-blocks-cli-spawning-tests.md`, but that record is absent from Memory Inputs.

**[FINDING — MT&S]** The no-network rule contradicts the selected command corpus. The first extracted command is `npm install -D provegate` (`packages/provegate/QUICKSTART.md:9-12`), while the PRD prohibits network access (`_prds/wip/prd-038-executable-quickstart.md:308`) and only defines substitution for CLI invocations (`:110-112`). It must decide whether installation is tested from a locally packed tarball, mapped hermetically, or excluded from this scenario with a separate package-install test. The current implementer must silently choose.

**[FINDING — MT&S]** “No remote after a full run” does not prove that the scratch repository never gained one, especially when an earlier step fails and final assertions are skipped. The critical promise appears at `_prds/wip/prd-038-executable-quickstart.md:117-118` and `:169-170`, but there is no per-step remote assertion, deny wrapper, or `finally` path. Likewise, “nothing outside the temp dir was written” is incompatible with ordinary npm/npx caches unless `HOME`, npm cache, XDG paths, and temporary paths are redirected under the scratch root.

**[FINDING — Migration & Rollback]** Cleanup is asserted only in prose. Section 7 says cleanup occurs on success and failure (`_prds/wip/prd-038-executable-quickstart.md:180-184`) but does not define ownership, `try/finally` ordering, how cleanup is verified, or what diagnostic state survives a failure. This is the primary rollback mechanism for an infra-class scratch harness and needs executable criteria.

### 3. Maintainability & DX

**[FINDING — Clarity]** FR-3 leaves the central architecture unresolved—derive during MDX build or compare in a root verifier—and says the implementer chooses (`_prds/wip/prd-038-executable-quickstart.md:120-138`). That is an implementation-shaping decision with different targets, wiring, cache behavior, and rollback. It triggers the Clarity ceiling of 7/10 even before the runnability defects.

**[FINDING — Completeness]** The two documents are materially divergent today. Parsing their `sh` fences and ignoring comment-only lines produces 14 package commands versus 8 docs-site commands, with a minimum sequence edit distance of 7. Only seven commands are exact ordered matches. The first semantic difference occurs immediately: plain `gate init` in the package (`packages/provegate/QUICKSTART.md:9-12`) versus recommended `gate init --practices` in MDX (`apps/docs/content/docs/quickstart.mdx:12-15`). The package additionally contains the three-command worktree path and three late practices/memory commands that MDX lacks. Exact all-shell-block parity therefore cannot pass without a public content rewrite, contradicting the non-goal at `_prds/wip/prd-038-executable-quickstart.md:142-146`. The PRD needs a tagged canonical subset, not whole-document shell equality.

**[FINDING — Technical Depth]** The root-script option omits mandatory repository wiring. Every new `scripts/verify/verify-*.mjs` file must be present in `scripts/verify/script-classes.json`; otherwise `verify-script-classes.mjs` fails it as unclassified (`scripts/verify/verify-script-classes.mjs:88-105`). That ledger is also mechanically compared with ADR-0004’s Classification table (`scripts/verify/verify-script-classes.mjs:108-143`; `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md:35-62`). Neither file is a target, conflict claim, Memory Input, or Durable Artifact. The proposed root route would fail its own `pnpm verify:workflow`.

**[FINDING — Technical Depth]** FR-4 is otherwise correct about the Turbo boundary. `provegate#test` hashes `$TURBO_DEFAULT$`, so in-package `QUICKSTART.md` is covered, while the docs application is outside that package (`turbo.json:15-23`). The existing exception is narrowly documented for `_prds/**` and the root config/manifest (`scripts/verify/turbo-inputs-exceptions.json:1-3`); it should not be widened for MDX parity. A root verifier is the clean boundary if FR-3 chooses parity.

**[FINDING — Completeness]** The PRD-007 scratch helpers are not exported or reusable. `gitRoot`, `commitArtifacts`, and `prdWithSurface` are file-local functions in `packages/provegate/test/worktree.test.ts:30-69`; no shared helper module exists under `packages/provegate/test/`. The qualified wording “where exported” at `_prds/wip/prd-038-executable-quickstart.md:180-182` avoids a literal falsehood but gives the implementer nothing to reuse. The PRD must either scope a new helper module or explicitly permit a local fixture.

**[FINDING — Completeness]** Memory selection misses three directly governing records: `runner-sentinel-blocks-cli-spawning-tests` for the nested runner, `gate-wire-or-delete` for the new root verifier, and accepted `ADR-0004-method-rule-vs-repo-rule` for its mandatory classification. Conversely, `docs-outlive-the-gate-they-promise` is stretched: that record concerns documentation describing an already-shipped gate as future work, not an unexecuted documentation example. Its general motivation is useful, but the current “founding record” rationale overstates fidelity.

### 4. Migration & Rollback

**[FINDING — Migration & Rollback]** No fence-language migration is currently necessary: command fences are already `sh`, output is untagged, and the manifest example is `json`. If semantic scenario markers are added, the PRD should require HTML comments or another rendering-neutral marker and verify that both Markdown and MDX output remain compatible. “Possible fence tags; plain revert” at `_prds/wip/prd-038-executable-quickstart.md:184` does not cover the actual change needed.

**[FINDING — Migration & Rollback]** The root parity rollback is incomplete. Reverting it requires removing the package-script registration, bundle member, class-ledger row, and ADR-0004 classification row together; otherwise wire-or-delete, script classification, or the ledger/ADR comparison remains red. The PRD currently lists only the verifier, `package.json`, and bundle as conditional scope (`_prds/wip/prd-038-executable-quickstart.md:205-207`).

**[FINDING — Scope & Testability]** Conflict accounting is stale and internally incomplete. PRD-026 is now `Ship Verified`/closed (`_state/prds.json:931-965`), and the only live lock file is PRD-027 on disjoint web/design paths (`_state/locks/prd-027-landing-adoption-polish.json:1-43`). Nevertheless, PRD-038 still calls PRD-026 active (`_prds/wip/prd-038-executable-quickstart.md:186-189`). More importantly, its conditional root route targets `scripts/verify/verify-workflow.mjs` at `:135-138`, while Conflict Surface omits it at `:259-265`; PRD-026 previously claimed that exact file (`_prds/completed/prd-026-duplicate-consolidation.md:917-923`). The missing claim would have hidden the overlap when this draft was created.

---

## Scorecard

| # | Dimension | Weight | Score | Notes |
| --- | --- | ---: | ---: | --- |
| 1 | Clarity | 15% | 5.0/10 | Central scenario selection and FR-3 architecture are unresolved. Clarity ceiling applies. |
| 2 | Completeness | 20% | 4.5/10 | Missing PRD filling, task/review artifacts, branch transitions, helper contract, and sentinel handling. |
| 3 | Technical Depth | 20% | 5.0/10 | Turbo reasoning is sound, but the CLI state machine and root verifier governance were not traced. |
| 4 | Multi-Tenancy & Security (MT&S) | 10% | 5.5/10 | No tenant surface; repository critical rules apply. Network, external writes, and never-remote proof are incomplete. |
| 5 | Scope & Testability | 15% | 5.0/10 | Strong intent and mutation framing, but the selected commands and parity target are not executable as specified. |
| 6 | Migration & Rollback | 20% | 5.0/10 | Rendering-neutral change and scratch cleanup are asserted, not designed; root-route rollback is incomplete. |
| **Total** | **Weighted** | **100%** | **4.95/10** | **ITERATE** |

Hard caps checked: no security, contract, runtime-dependency, push-path, or method-content cap is presently tripped. Lint cap is explicitly waived for the sandbox-only state-write `EPERM`; the read-only production `lintPrd` call passed. The Clarity ceiling is triggered by the unresolved FR-3 choice and non-runnable alternative verification paths.

---

## Missing Pieces

1. Replace FR-1’s “all fenced shell blocks” rule with a closed executable-scenario grammar. Name rendering-neutral start/end or step markers, command splitting, comment handling, line-number retention, and the treatment of optional/alternative shell blocks. Record that today’s output tags are already adequate.

2. Resolve the install contradiction explicitly. Specify a hermetic local-tarball mapping for `npm install -D provegate`—with an exhaustiveness assertion tying it to the exact source line—or remove installation from this harness and add a separately named packed-install test. No registry/network fallback may exist.

3. Add an explicit scratch state model: `git init -b main`, repository-local identity, initial commit, generated-PRD fill, baseline commit, claim mode, feature/worktree transition, task and review artifact creation, durable artifact creation, feature commits, close, inspection, and cleanup. Identify which transitions are doc commands and which are deterministic harness setup.

4. Decide FR-3 in the PRD. Recommended: a root parity verifier comparing only the tagged canonical scenario, preserving the package-only optional worktree/practices sections. Record the current measured baseline—14 versus 8 commands, edit distance 7—and state the expected post-change sequence.

5. If the root verifier route is chosen, add concrete targets and conflict claims for `scripts/verify/verify-workflow.mjs`, `scripts/verify/script-classes.json`, and `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md`; add the ADR update to Memory Outputs and Durable Artifacts. Keep `package.json` out of Conflict Surface because it is shared append-only, but retain it in scope.

6. Add Memory Inputs for `runner-sentinel-blocks-cli-spawning-tests`, `gate-wire-or-delete`, and `ADR-0004-method-rule-vs-repo-rule`. Specify either that the scratch CLI child receives an environment with `PROVEGATE_RUN_ACTIVE` removed, or route whole-suite verification through the root Turbo task as the sentinel record prescribes.

7. Make the scratch guarantees executable: mutable HOME/XDG/npm/TMP paths under the scratch root; no inherited Git global configuration capable of adding remotes; `git remote` asserted empty before and after every step; cleanup in `finally`; deletion verified after both passing and planted-failure cases. Define how diagnostics are retained before deletion.

8. Replace the generic reorder mutation with one exact mutation and expected step/line diagnostic. Add separate deny fixtures for an unclassified shell block, an unsupported command transformation, a nested-run sentinel leak, a remote appearing between steps, parity divergence, and cleanup after failure.

9. Either add `packages/provegate/test/helpers/scratch-repo.ts` with a named exported fixture API or state that the new test owns a local helper. Do not imply PRD-007 exported reusable helpers when its helpers remain file-local.

10. Refresh sequencing: PRD-026 is closed and has no active lease; PRD-027’s current lease is disjoint. Add every conditional root-route file to Conflict Surface before the next queue check, especially `verify-workflow.mjs`, the class ledger, and ADR-0004.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| --- | --- | ---: | --- | --- |
| 1 | 2026-07-28 | 4.95 | ITERATE | Initial independent assessment. Measured 14-versus-8 command divergence; traced the printed sequence through lint, runner, merge, and worktree behavior; found the nested-run sentinel failure, missing verifier classification/ADR wiring, non-exported scratch helpers, and incomplete hermetic cleanup/no-remote proof. |

---

## Verdict

**ITERATE — return to Phase 1.** The concept is valuable, and the Turbo boundary insight is correct, but the PRD currently treats a tutorial containing prose transitions, alternatives, and optional follow-ons as one shell program. Its own scoped verification would refuse under the runner sentinel, and its root parity alternative would fail the newly shipped verifier-classification gate. Define the executable scenario and scratch state machine, choose the parity architecture, wire repository governance, and then request a fresh independent score.


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 1 transcribed
> verbatim from a fresh independent Codex session, which measured the real quickstart
> corpus (14 vs 8 commands across the two docs, edit distance 7), found the unpublished-
> package install contradiction, and surfaced the runner-sentinel record the draft had
> missed. Band 4-5.9 = Phase 1 rework by the author, taken the same day. Lint EPERM is
> the documented sandbox artifact; out-of-sandbox green the same day.
