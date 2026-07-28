# Readiness Assessment: PRD-038 — Executable Quickstart

**ITERATE — 5.62/10. Return to Phase 1.**

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-038-executable-quickstart.md` |
| Score | 5.62/10 |
| Verdict | ITERATE |
| Iteration | 3 |
| PRD Class | infra |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit) | — |
| Scored by | Codex (GPT-5), fresh independent re-scorer |
| Self-scored | no |
| Date | 2026-07-28 |
| PRD Lint | Waived for the documented sandbox state-write restriction. `node packages/provegate/dist/cli.js check PRD-038` failed with `EPERM: operation not permitted, open '.../_state/prds.json.13111.tmp'`. The read-only production equivalent `lintPrd(config, manifest, content, root, 38)` returned `{ "ok": true, "issues": [] }`. Relied additionally on the orchestrating session’s out-of-sandbox green run dated 2026-07-28. |
| State Record | pending |

---

## Iteration 3 — Closure Review

### 1. Tagged-region contract — NOT CLOSED

The owning FR is substantially clearer:

> “one `<!-- qs:scenario -->` … `<!-- /qs:scenario -->` region”  
> “within it, every ` ```sh ` fence is executable and every ` ```text ` fence is output illustration”  
> “an untagged fence inside the region is a named failure”

But the stale promise remains in §6:

> “Then every fenced command executes in order in a scratch repo”

That still means every fence, including package-only material FR-1 explicitly places outside the scenario. The iteration-2 changelog’s claim that every occurrence was replaced is therefore false.

The corpus was re-measured:

| Document | Fences | Languages | Non-comment `sh` commands |
| --- | ---: | --- | ---: |
| `packages/provegate/QUICKSTART.md` | 11 | 9 `sh`, 1 untagged, 1 `json` | 14 |
| `apps/docs/content/docs/quickstart.mdx` | 8 | 6 `sh`, 1 untagged, 1 `json` | 8 |

There are two untagged output fences in the two-document corpus, not one:

- `packages/provegate/QUICKSTART.md:108`
- `apps/docs/content/docs/quickstart.mdx:101`

Both illustrate the final handoff and would naturally fall inside equivalent first-touch regions. FR-1 only explicitly retags the package copy, while FR-3 gives the docs twin the same markers without specifying its output-fence disposition. Either both must be retagged, or the grammar must explicitly be package-only and the docs verifier must state how it handles untagged fences.

### 2. Scratch state model through live close — NOT CLOSED

The PRD claims:

> “as a doc-command [D] versus harness-scaffolding [H] table the test file carries verbatim”

No such table exists in the PRD. Instead, FR-2 contains one arrow-separated paragraph, including the unresolved label:

> “[D/H per the doc’s printed path]”

It neither classifies every transition nor states each harness action and its corresponding CLI precondition. Deferring the required state model to a future test file leaves the implementing agent to invent it.

The real canonical command path printed today is:

| Order | Printed command | PRD trace |
| ---: | --- | --- |
| 1 | `npm install -D provegate` | Present |
| 2 | `npx gate init` | Present |
| 3 | `npx gate status` | Missing |
| 4 | `npx gate new fix-login-timeout --class=hotfix` | Present |
| 5 | `npx gate open PRD-001` | Moved after `gate check` and labelled `[D/H]` |
| 6 | `npx gate check PRD-001` | Placed before the printed `gate open` |
| 7 | `npx gate run --dry-run PRD-001` | Present |
| 8 | `npx gate run PRD-001` | Present |

The harness is simultaneously required to execute doc-sourced commands “in order” and instructed by its state trace to reorder `open` and `check`. It also has no instruction for asserting the printed `status` result.

The quickstart’s prose path includes Phase 2 readiness before task generation:

> “You want PASS (≥ 8, no caps tripped)”  
> “Then … the task file”

The proposed scaffolding creates a task file but no PASS readiness artifact. The runner does not independently enforce a readiness verdict, so a live close can turn green while the harness silently skips this documented phase. The harness must assert the promise the CLI does not enforce.

The shipped close preconditions otherwise trace as follows:

- `buildGateChain` refuses when no task file or no passed `independent-review` row exists.
- `validateTasksReviewRow` requires a referenced review artifact with valid PRD, verdict, reviewer, base SHA, Critical, and quorum metadata.
- The durable gate requires every declared path to appear in the feature diff.
- `mergePreconditions` requires a non-base, non-detached feature branch and a clean checkout.
- `operatorGateOk` requires committed acceptance only when the task file contains operator-owned rows.

The PRD names review, durable, branch, and clean-tree concepts, but does not give exact transitions or commands. It also never decides whether the scratch task contains zero operator rows—requiring no acceptance—or contains a row and therefore needs committed owner acceptance. That choice cannot be left implicit, especially because an implementing agent may not originate an acceptance.

Installed-file disposition is similarly only named, not decided. `npm install` can leave `package.json`, a lockfile, and untracked `node_modules`; plain `gate init` creates no root `.gitignore`. The PRD does not say what is committed, ignored, or removed before the clean-tree assertion.

### 3. FR-3 and FR-4 verification route — CLOSED

Section 11 now directly assigns:

> FR-3: `pnpm verify:quickstart-parity`  
> FR-4: `pnpm verify:workflow`

This matches the decided root boundary and no longer asks an in-package test to read the docs-site file.

The repository can host FR-4 as written:

- `scripts/verify/script-classes.json` accepts a new `repo` entry.
- `verify-script-classes.mjs` enforces on-disk coverage and mechanically compares the ledger to ADR-0004’s two-column Classification table.
- ADR-0004 defines repository class by what a check reads and can accept the new row.
- `verify-workflow.mjs` has a direct `CHECKS` array for the verifier.
- Root `package.json` has the established `verify:*` registration surface.

### 4. Mutation and cleanup probes — NOT CLOSED

The exact mutation is specified, but its expected behavior contradicts the shipped CLI.

The PRD says swapping `gate init` and `gate new` makes relocated `gate new` fail because there is “no workspace to allocate in.” The implementation deliberately supports this case. `createPrd` says:

> “Uninitialized repo (W2): create just the needed parents”

The CLI then reports:

> “parent directories were missing — run `gate init` for the full workflow tree”

Therefore `gate new` succeeds before `gate init`; the proposed mutation supplies neither the expected failure nor the promised stderr diagnostic. A mutation such as swapping `gate new` and `gate open` would have an independent, shipped failure cause: `open` cannot claim a PRD that does not yet exist.

The cleanup probe is also not a deterministic planted failure. On POSIX systems, deleting a read-only file is governed by permissions on its parent directory; a writable scratch directory can remove that file normally. Resetting the file mode in `finally` may execute, but the test does not prove cleanup would otherwise fail. Use a deterministic failure injection or a permission setup whose first deletion attempt is asserted to fail before recovery.

### 5. Sentinel contract — CLOSED

The name is exact:

> `PROVEGATE_RUN_ACTIVE`

`runChain` exports it as `1` into §11 commands, and the CLI refuses a nested live run when it is truthy. Removing it from each harness-spawned CLI child is the documented remedy for a direct CLI-spawning test.

### 6. Persisting hermeticity and corpus contradictions

The earlier install and isolation defects remain:

- `pnpm --filter provegate build` can write repository build output outside the scratch root.
- `npm pack` has no specified destination and normally writes into its invocation directory.
- “an unreachable local path” is not an exact npm registry URL or configuration.
- Audit, fund, update-notifier, cache, and lifecycle behavior remain unspecified.
- The assertion that “nothing outside the temp dir was written” has no scope excluding preparatory build output.
- Remapping `HOME` does not disable system Git configuration or inherited `GIT_CONFIG_*` injection.

FR-3 also still requires the docs twin to replace its recommended:

> `npx gate init --practices`

with the package’s plain-init sequence, while the docs explicitly say:

> “`--practices` is the recommended install.”

That is a public recommendation change, contradicting the non-goal against rewriting teaching content unless explicitly authorized and reconciled in the surrounding prose.

Finally, “reuse their helpers where exported” is non-actionable because the cited lifecycle helpers are file-local, the rollback remains only “plain revert” despite coordinated verifier/ledger/ADR/doc changes, and sequencing still says PRD-026 owns files even though PRD-026 is already Ship Verified.

---

## Scorecard

| # | Dimension | Weight | Score | Notes |
| --- | --- | ---: | ---: | --- |
| 1 | Clarity | 15% | 5.5/10 | The tagged grammar and root verifier are clear, but the promised state table does not exist, `[D/H]` remains unresolved, and the trace contradicts printed command order. |
| 2 | Completeness | 20% | 5.5/10 | The trace omits `gate status`, the readiness artifact, operator-row disposition, and exact installed-file handling; both output fences are not covered. |
| 3 | Technical Depth | 20% | 5.8/10 | Strong runner, sentinel, class-ledger, and parity reasoning, but the mutation contradicts production behavior and the close model is not executable. |
| 4 | Multi-Tenancy & Security (MT&S) | 10% | 6.5/10 | No tenant surface. Network and remote intent are strong, but npm and Git isolation are not exact or hermetic. |
| 5 | Scope & Testability | 15% | 5.5/10 | Direct parity is testable; the primary mutation cannot fail as claimed and the cleanup probe does not deterministically exercise recovery. |
| 6 | Migration & Rollback | 20% | 5.3/10 | Public docs convergence, external build/pack writes, helper ownership, sequencing, and coordinated rollback remain under-specified. |
| **Total** | **Weighted** | **100%** | **5.62/10** | **ITERATE** |

Hard caps checked: no runtime dependency, remote-push path, protected security surface, client/server contract, or untraceable method content is introduced. The lint cap is waived only for the reproduced sandbox `EPERM`; the read-only production lint passed. The formal Clarity checklist is present, but the dimension scores below seven on executable substance.

---

## Missing Pieces

1. Put the actual [D]/[H] transition table in the PRD. Preserve the document’s exact order, include `gate status`, and give each [H] action its exact command/file mutation, placement, expected state, and CLI precondition.

2. Include the documented readiness transition: create and assert a PASS readiness artifact before task generation. Explicitly state that the task fixture has zero operator-owned rows and therefore requires no acceptance, or specify a valid authorized alternative.

3. Decide the installed-file disposition: exact committed files, exact ignore/removal treatment for `node_modules`, tarball destination under scratch, explicit npm registry URL and no-audit/no-fund/update-notifier/cache behavior.

4. Replace the init/new mutation with one that production actually rejects, or change the expected result to match `gate new`’s supported uninitialized-repository behavior. Retain copied-document line attribution and stderr-tail assertions.

5. Replace the read-only-file cleanup case with a deterministic initial cleanup failure, assert that failure occurs, then reset/retry in `finally` and verify deletion.

6. Retag both handoff output fences—or explicitly scope the grammar to one document—and replace the surviving §6 “every fenced command” promise with the tagged-region contract.

7. Sanitize system and injected Git configuration, not only `HOME`, and scope or correct the “nothing outside the temp dir was written” assertion.

8. Reconcile the docs twin’s `--practices` recommendation with parity and the non-goal; replace the nonexistent-helper suggestion, update stale PRD-026 sequencing, and specify an atomic coordinated rollback.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| --- | --- | ---: | --- | --- |
| 1 | 2026-07-28 | 4.95 | ITERATE | Initial independent assessment. Measured 14-versus-8 command divergence; traced lint, runner, merge, and worktree behavior; found the nested-run sentinel failure, missing verifier classification/ADR wiring, non-exported scratch helpers, and incomplete hermetic cleanup/no-remote proof. |
| 2 | 2026-07-28 | 6.10 | ITERATE | Confirmed the measured baseline and closed FR-4 governance plus sentinel-memory coverage. Found that the revised state model omitted mandatory close transitions, FR-3’s §11 row violated its root boundary, and install/output-tag/external-write claims remained contradictory. |
| 3 | 2026-07-28 | 5.62 | ITERATE | Confirmed the direct FR-3/FR-4 route and exact sentinel. Found that the claimed [D]/[H] table is absent and contradicts the printed order, `gate status` and readiness are omitted, two output fences are untagged, `gate new` intentionally succeeds before `gate init`, and a read-only file does not deterministically fail cleanup. |

---

## Verdict

**ITERATE — return to Phase 1.** The parity architecture, repository wiring, and sentinel remedy are ready. The central executable claim is not: the state model is prose rather than the promised table, disagrees with the document’s command order, omits documented transitions, and relies on mutation and cleanup failures that the current platform and CLI do not produce. An implementing agent would have to redesign the harness to make its required tests meaningful.


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 3 transcribed
> verbatim from a fresh independent Codex session; 6.10 → 5.62 — the trajectory
> OSCILLATES and the round found the draft's mutation example contradicts production
> behavior and the close path omits the readiness transition. Per the repository's own
> records (`state-model-before-mechanism`), the next action is not another wording
> round: the ground truth (the real scratch-close sequence) should be EXECUTED once and
> the measured transition table pasted, or the item parked. Decision request on the
> board. Lint EPERM is the documented sandbox artifact; out-of-sandbox green same day.
