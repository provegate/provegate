# Readiness Assessment: PRD-038 — Executable Quickstart

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-038-executable-quickstart.md` |
| Score | 6.10/10 |
| Verdict | ITERATE |
| Iteration | 2 |
| PRD Class | infra |
| Model Tier (Execution) | Do not assign — return to Phase 1 |
| Model Tier (Audit) | — |
| Scored by | Codex (GPT-5), independent re-scorer |
| Self-scored | no |
| Date | 2026-07-28 |
| PRD Lint | Waived for the documented sandbox state-write restriction. `node packages/provegate/dist/cli.js check PRD-038` failed with `EPERM: operation not permitted, open '.../_state/prds.json.9042.tmp'`. The read-only production equivalent `lintPrd(config, manifest, content, root, 38)` returned `{ "ok": true, "issues": [] }`. Relied additionally on the orchestrating session’s out-of-sandbox green run dated 2026-07-28. |
| State Record | pending |

---

## Iteration 2 — Rework Review

### 1. Closed scenario grammar — PARTIAL

The central grammar is now substantially specified:

> “one `<!-- qs:scenario -->` … `<!-- /qs:scenario -->` region,” with “one command per line,” joined backslash continuations, skipped comments/blanks, and retained doc line numbers (`_prds/wip/prd-038-executable-quickstart.md:106-116`).

Independent corpus measurement confirms the iteration-1 baseline:

- `packages/provegate/QUICKSTART.md`: 11 fences; nine `sh`, one untagged output fence, one `json`; 14 non-comment shell commands.
- `apps/docs/content/docs/quickstart.mdx`: eight fences; six `sh`, one untagged output fence, one `json`; eight shell commands.
- Minimum sequence edit distance: 7; exact ordered LCS: 7.

However, the PRD’s claim that “the corpus’s existing output tags are already adequate” is false under its own grammar. The handoff output at `packages/provegate/QUICKSTART.md:108-110` is untagged, not a `text` fence, and neither current document contains a `text` fence.

The document also continues to promise broader coverage than FR-1 defines:

> “all fenced commands in sequence” (`:63`)  
> “every fenced command executes in order” (`:183-185`)

Those statements include the package-only commands that FR-1 explicitly puts outside the scenario. The contract must consistently say “every command fence inside the tagged scenario.”

### 2. Hermetic install mapping — PARTIAL

The source-bound substitution is a real improvement:

> “maps — by exact source-line match, with an assertion that no OTHER install line exists unmapped — to installing the locally packed tarball” (`:120-125`).

The actual package quickstart has exactly one install command, `npm install -D provegate` at line 10, so the proposed exhaustiveness check has a closed present-day corpus.

Two contradictions remain:

1. Setup explicitly runs `pnpm --filter provegate build` and `npm pack`, while §6 promises “nothing outside the temp dir was written” (`:195-196`). A package build writes under the repository’s package tree unless the PRD instead consumes an already-built artifact or explicitly scopes the claim to scratch-command writes. `npm pack` also needs an explicit destination inside the temp root.

2. “Registry … pointed at an unreachable local path” does not name a valid npm setting or URL. Specify the exact registry value and disable audit/fund/update-notifier behavior so registry contact produces a deterministic hard failure rather than a warning or retry.

The exact source mapping prevents silent substitution drift, but the full install setup is not yet hermetic under the PRD’s own external-write criterion.

### 3. Enumerated scratch state model — OPEN

The revised model enumerates initialization and one prose transition:

> “temp root; HOME, XDG dirs, npm userconfig and TMPDIR remapped … `git init -b main` … initial commit” (`:126-129`)  
> “filling the generated PRD minimally and committing is setup” (`:130-134`).

It does not enumerate the state required for the printed live close.

The shipped chain requires:

- a task artifact containing a passed independent-review row (`packages/provegate/src/core/run/chain.ts:518-527`);
- a referenced, schema-valid review artifact (`packages/provegate/src/core/gates/review.ts:177-200`);
- every declared durable artifact to appear in the feature diff (`packages/provegate/src/core/run/chain.ts:534-555`);
- a real, clean feature branch rather than `main` (`packages/provegate/src/core/run/merge.ts:163-182`).

None of the task creation, review creation, durable declaration/evidence, feature-branch checkout, feature commit, or clean-tree transition is in the claimed state model.

The commit rationale is also applied to the wrong printed claim mode. The committed-base requirement quoted by the PRD is specifically enforced for `gate open --worktree` (`packages/provegate/src/core/run/worktree.ts:559-570`), but FR-1 puts the worktree alternative outside the scenario; the canonical printed command is plain `npx gate open PRD-001`.

Finally, `npm install` can leave `node_modules` and package/lock files as non-coordination dirt. The state model does not say which are committed, ignored, or removed before the clean-feature-branch precondition.

This is not an implementation detail: different choices change what the purported adopter scenario proves.

### 4. Root tagged-region parity — PARTIAL

The architectural decision and measurement are closed:

> “a root verifier over the tagged region only” (`:145-155`)  
> “14 versus 8 commands, edit distance 7” (`:150-152`).

The baseline was independently reproduced. A root verifier is the correct cache boundary because the docs-site file is outside `provegate#test`.

But §11 reopens the rejected route:

> `pnpm --filter provegate test test/quickstart-e2e.test.ts -t parity`  
> “or the root-script row below, per the recorded FR-3/FR-4 choice” (`:331`).

There is no direct root parity row below—only FR-4’s aggregate `pnpm verify:workflow`. A package parity test would need to read the docs-site file, directly violating:

> “DO NOT read the docs-site file from inside `provegate#test`” (`:352`).

Because every §11 command executes during `gate run`, the current FR-3 row must either name an actual in-package test that cannot prove FR-3 or violate the declared Turbo boundary. Replace it with the direct root script or assign `pnpm verify:workflow` explicitly to FR-3 as well.

There is also a content-scope contradiction: convergence requires changing the docs twin’s current `npx gate init --practices` to match the package’s plain `npx gate init`, while the PRD says it will not rewrite teaching content or order (`:170-172`). That is a public recommendation change and must be explicitly authorized as the minimal convergence edit.

### 5. Script classification and ADR amendment — CLOSED

FR-4 now names the complete repository-governance surface:

> `package.json`, `scripts/verify/verify-workflow.mjs`, `scripts/verify/script-classes.json`, and `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` (`:158-166`).

The actual files can host the promised changes:

- `verify-workflow.mjs` has a canonical `CHECKS` array.
- `script-classes.json` has a per-script object ledger.
- `verify-script-classes.mjs` rejects every unclassified on-disk verifier and mechanically compares the ledger with ADR-0004’s two-column Classification table (`scripts/verify/verify-script-classes.mjs:88-143`).
- ADR-0004 defines repo class by what a verifier reads (`_brain/adr/ADR-0004-method-rule-vs-repo-rule.md:26-37`) and can accept a `verify-quickstart-parity.mjs | repo` row.

The ADR path is present in Memory Outputs and Durable Artifacts, and all conditional root-route files are now in Conflict Surface.

### 6. Memory inputs and runner sentinel — CLOSED

All requested records are declared with dispositions:

- `runner-sentinel-blocks-cli-spawning-tests`
- `gate-wire-or-delete`
- `ADR-0004-method-rule-vs-repo-rule`
- `adr-section-blank-line-reads-empty`

The sentinel name is exact. The runner exports `PROVEGATE_RUN_ACTIVE=1` into §11 commands (`packages/provegate/src/core/run/chain.ts:823-828`), and the CLI refuses a nested live run when it is truthy (`packages/provegate/src/cli.ts:1019-1024`). The learning explicitly permits a directly invoked CLI-spawning test to strip the sentinel from its child environment (`_brain/learnings/runner-sentinel-blocks-cli-spawning-tests.md:25-30`).

The ADR-format hazard is also accurately applied: the body-capture defect is fixed, but broad formatting remains unsafe because frontmatter list reflow is still rejected.

### 7. Scratch guarantees, cleanup, and diagnostics — PARTIAL

The PRD now provides executable test obligations for:

- `git remote` empty before and after each step;
- cleanup in `finally`;
- deletion verification on pass and planted failure;
- diagnostic-tail capture before deletion (`:139-143`).

Those close much of the iteration-1 rollback gap.

The isolation claim remains stronger than the mechanism:

- Remapping `HOME` does not disable system Git configuration or inherited `GIT_CONFIG_*` variables. A hermetic child should explicitly disable system config and sanitize Git config injection variables.
- The explicit repository build/pack setup conflicts with the assertion that nothing outside the temp root is written.
- The planted failure is still not named, so the required diagnostic and cleanup path is not tied to a deterministic failure point.
- Assertions only before and after “steps” require the PRD to define whether deterministic setup transitions are steps too.

### New and Persisting Defects

1. The FR-3 §11 row contradicts the decided root architecture and the explicit Turbo-boundary prohibition.
2. The live-close state machine remains incomplete: task/review artifacts, durable evidence, feature-branch creation, clean-tree handling, and commits are absent.
3. “Every fenced command” contradicts the tagged-region scope.
4. The existing-output-tag claim is factually wrong: the close output fence is untagged.
5. The mutation remains generic—“reorder two commands”—with no exact pair, expected failing step, or diagnostic.
6. “Reuse their helpers where exported” remains non-actionable; the relevant PRD-007 helpers are file-local.
7. Rollback remains only “plain revert” despite the coordinated verifier, bundle, script ledger, ADR, two public docs, test, learning, index, and review-artifact changes.
8. Sequencing remains stale: PRD-026 is `Ship Verified` and completed, not an active owner. Current PRD-027 and PRD-028 leases are disjoint from PRD-038’s declared surface.

---

## Scorecard

| # | Dimension | Weight | Score | Notes |
| --- | --- | ---: | ---: | --- |
| 1 | Clarity | 15% | 6.0/10 | The grammar and root architecture are named, but §11 reopens the rejected parity route and the scope alternates between tagged commands and all fences. Clarity ceiling applies. |
| 2 | Completeness | 20% | 6.0/10 | Governance and isolation obligations improved; the mandatory close artifacts, branch transition, install dirt handling, and exact mutation remain absent. |
| 3 | Technical Depth | 20% | 6.5/10 | Strong corpus measurement, sentinel tracing, Turbo reasoning, and verifier classification; the claimed state model does not match the shipped close chain. |
| 4 | Multi-Tenancy & Security (MT&S) | 10% | 7.0/10 | No tenant surface. Network and remote intent are strong, but Git system/env isolation and external-write containment are incomplete. |
| 5 | Scope & Testability | 15% | 6.0/10 | Tagged parity is testable, but the FR-3 command is self-contradictory, mutation is unspecified, and “all fences” overclaims coverage. |
| 6 | Migration & Rollback | 20% | 5.5/10 | Failure cleanup is much better; coordinated repository rollback, public docs convergence, package/pack cleanup, and stale sequencing are not modeled. |
| **Total** | **Weighted** | **100%** | **6.10/10** | **ITERATE** |

Hard caps checked: no runtime dependency, push path, method-content provenance, security-contract, or migration hard cap is tripped. The lint cap is waived only for the sandbox state-write `EPERM`; the read-only production lint passed. The Clarity ceiling is triggered because the verification route and executable close-state transitions still require implementation-shaping decisions.

---

## Missing Pieces

1. Replace every “all/every fenced command” promise with the tagged-region contract, and either retag the existing untagged output fence as `text` or define untagged output as legal.

2. Complete the scratch transition table through the real live close: installed-file disposition, minimal filled PRD, baseline commit, plain claim, lint, task creation, passed independent-review row, review artifact, durable declaration/evidence, feature-branch creation, feature commits, clean-tree assertion, dry run, live run, merged-base inspection, and cleanup. Distinguish which transitions are printed commands and which are harness scaffolding.

3. Replace FR-3’s package-test row with a direct root verifier command, or explicitly use `pnpm verify:workflow` for both FR-3 and FR-4. Remove the “or” language.

4. Specify the exact mutation pair, expected failing step, expected retained doc line, and diagnostic. Name the planted cleanup failure as well.

5. Make install containment executable: exact packed-tarball destination under the temp root, exact unreachable registry URL/configuration, audit/fund/update-notifier behavior, and a definition of whether the preparatory repository build is outside the “nothing outside temp” claim.

6. Sanitize Git configuration beyond `HOME`: disable system config and inherited config-injection variables, then assert the effective remote set at every defined boundary.

7. Acknowledge the docs twin’s `--practices` → plain-init convergence as an authorized public recommendation change, or choose a canonical sequence that avoids contradicting the non-goal.

8. Replace the helper-reuse sentence with either an explicitly local fixture or a named shared-helper target, and document coordinated rollback across the verifier registration, bundle, class ledger, ADR row, docs, test, and durable artifacts.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| --- | --- | ---: | --- | --- |
| 1 | 2026-07-28 | 4.95 | ITERATE | Initial independent assessment. Measured 14-versus-8 command divergence; traced lint, runner, merge, and worktree behavior; found the nested-run sentinel failure, missing verifier classification/ADR wiring, non-exported scratch helpers, and incomplete hermetic cleanup/no-remote proof. |
| 2 | 2026-07-28 | 6.10 | ITERATE | Confirmed the 14-versus-8/edit-distance-7 baseline and closed FR-4 governance plus sentinel-memory coverage. Found that the revised state model still omits the shipped close chain’s task/review/durable/feature-branch requirements, FR-3’s §11 row violates its decided root boundary, and install/output-tag/external-write claims remain contradictory. |

---

## Verdict

**ITERATE — return to Phase 1.** The rework correctly chooses a tagged canonical scenario, a root parity verifier, complete class-ledger/ADR wiring, and the exact sentinel remedy. It still does not specify a runnable first close under the shipped CLI: the task/review/durable evidence and feature-branch transition are absent, while the only FR-3 verification row contradicts both the chosen root architecture and the explicit prohibition on an out-of-package test read. Close those executable-state and verification contradictions before Phase 2 PASS.


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 2 transcribed
> verbatim from a fresh independent Codex session; 4.95 → 6.10. The scorer traced the
> real close path and demanded the full scratch transition table; the remaining pieces
> are enumeration and leftover-language sweeps, applied by the author the same day.
> Lint EPERM is the documented sandbox artifact; out-of-sandbox green the same day.
