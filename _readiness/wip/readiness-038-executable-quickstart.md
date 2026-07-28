# Readiness Assessment: PRD-038 — Executable Quickstart

**ITERATE — 7.61/10. Three claimed closures remain false against production: the region contract contradicts itself, one “complete” stop reason is still truncated, and inherited `GIT_CONFIG_COUNT` still injects remotes.**

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-038-executable-quickstart.md` |
| Score | 7.61/10 |
| Verdict | ITERATE |
| Iteration | 5 |
| PRD Class | infra |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit) | — |
| Scored by | Codex (GPT-5), fresh independent re-scorer |
| Self-scored | no |
| Date | 2026-07-28 |
| PRD Lint | Waived for the documented sandbox state-write restriction. `node packages/provegate/dist/cli.js check PRD-038` failed with `EPERM: operation not permitted, open '.../_state/prds.json.79542.tmp'`. The read-only production equivalent `lintPrd(config, manifest, content, root, 38)` returned `{ "ok": true, "issues": [] }`. Relied additionally on the orchestrating session’s out-of-sandbox green run dated 2026-07-28. |
| State Record | pending |

---

## Iteration 5 — Closure Review

### 1. Region geometry — DECISION PRESENT, CONTRACT STILL CONTRADICTORY

The intended decision is now clear in its owning paragraph:

> “one region, with an explicit ignored-fence form”

and:

> “the worktree alternative block keeps its teaching position inside the flow without executing”

That fits the real package corpus. The optional worktree block is a `sh` fence between `gate open` and `gate check`, containing:

```text
git add ...
git commit ...
npx gate open PRD-001 --worktree
```

The fence census is also corrected. The only untagged opening fences relevant to the migration are the two handoff-card blocks:

- `packages/provegate/QUICKSTART.md:108`
- `apps/docs/content/docs/quickstart.mdx:101`

Both can feasibly become `text`.

However, FR-1 later says:

> “Package-only extras (worktree, practices) live OUTSIDE the region”

The worktree alternative cannot both retain its present teaching position inside the install-to-close region under `qs:skip` and live outside that region. FR-3 compounds this by saying package-only optional sections are “unmeasured” without explicitly stating that the parity verifier excludes package-side `qs:skip` fences.

A second grammar sentence is also inconsistent:

> “an untagged or unmarked-`sh` fence inside the region is a named failure”

Normal canonical commands are precisely unmarked `sh` fences under the grammar just defined. The failure condition should instead name unsupported/untagged fences and malformed or dangling `qs:skip` markers.

Implementation Scope additionally limits the package-doc change to “fence language tags only,” although FR-1 requires two region markers and a `qs:skip` marker.

These are readily repairable residues, but they still force an implementer to choose which instruction wins.

### 2. Negative fixtures — INPUTS PINNED, ACTIVE TEXT STILL FALSE

The omitted-tasks fixture is exact:

> `no tasks file — independent-review ledger missing`

The Base SHA input is now correctly pinned to the literal `main`. Production rejects it because `validateReviewArtifact` accepts any parsed value of at least seven characters and returns:

> `missing \`> **Base SHA:** <git sha>\` metadata`

That correct fixture conflicts with the retained active prototype transcript:

> “the template's symbolic ref is refused; a real sha is required”

The shipped placeholder, `[git merge-base or base tip]`, is long enough to pass. This false statement is outside the exempt dated Changelog.

The close-from-main fixture remains truncated despite being labelled complete. The PRD requires:

> `current branch is 'main' — run from the feature branch`

Production returns:

> `current branch is 'main' — run from the feature branch, not the base checkout`

An implementer following the PRD can therefore write a substring assertion while believing it is pinned to the complete reason.

### 3. Git isolation — REMOTE ASSERTION STRONG, NEUTRALIZATION INCOMPLETE

The three declared settings correctly disable global and system configuration:

```text
GIT_CONFIG_GLOBAL=/dev/null
GIT_CONFIG_SYSTEM=/dev/null
GIT_CONFIG_NOSYSTEM=1
```

They do not neutralize environment-injected configuration. A read-only probe using all three required settings plus:

```text
GIT_CONFIG_COUNT=1
GIT_CONFIG_KEY_0=remote.provegate-injected.url
GIT_CONFIG_VALUE_0=https://invalid.example
```

still made `git remote` report `provegate-injected`.

The before/after assertions prevent an unnoticed remote, but the test remains dependent on its parent environment rather than hermetic. Child environments must remove `GIT_CONFIG_COUNT`, indexed `GIT_CONFIG_KEY_*`/`GIT_CONFIG_VALUE_*`, and `GIT_CONFIG_PARAMETERS` before applying the three fixed settings.

The post-setup write scope is improved, but “nothing outside the scratch root” also needs the active contract to remap temporary/cache roots or state the concrete observation mechanism. Remapping HOME alone does not establish that all child temporary writes stay inside the scratch root.

### 4. Cleanup failure plant — CLOSED

The acceptance criterion now specifies:

> “a NON-EMPTY subdirectory (one file inside) chmod 555”

It asserts the initial POSIX unlink failure, restores permissions, retries in `finally`, verifies deletion, and identifies Ubuntu/POSIX as the suite’s CI scope. This is executable without further design work.

### 5. Docs parity migration — CONTENT DECISION CLOSED, SKIP SEMANTICS NEED CONSOLIDATION

The current docs page has:

```text
npx gate init --practices
```

followed immediately by prose calling `--practices` the recommended install. FR-3 now authorizes both necessary edits:

- canonical init becomes plain `npx gate init`;
- the recommendation moves to a named optional section outside the canonical region.

That is feasible and preserves the recommendation without contradicting the executable sequence.

The remaining issue is shared with FR-1: the parity verifier must explicitly compare executable, non-skipped commands. Otherwise the package-side worktree fence inside the region conflicts with the promise that package-only optional material remains unmeasured.

### 6. Rollback — PRIOR FINDING NOT CLOSED

The active rollback remains:

> “Test-only surface plus possible fence tags; plain revert.”

The scope is no longer test-only and no longer merely possible fence tags. It includes public docs content, package markers, the parity verifier, root registration, workflow-bundle wiring, the class ledger, an ADR amendment, and a new learning/index pointer.

A plain revert may be the mechanism, but the coordinated rollback unit must name those surfaces so partial rollback cannot leave a registered missing verifier or divergent canonical regions.

---

## Scorecard

| # | Dimension | Weight | Score | Weighted | Notes |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Clarity | 15% | 7.0/10 | 1.05 | The owning geometry decision is understandable, but later text places worktree outside the same region, calls normal `sh` fences unmarked failures, and truncates a supposedly complete stop reason. |
| 2 | Completeness | 20% | 7.8/10 | Cleanup and docs-content migration are closed. Environment-injected Git config, parity treatment of skipped fences, exact fixture text, and rollback remain incomplete. |
| 3 | Technical Depth | 20% | 8.2/10 | Strong prototype, real CLI path, offline tarball install, mutation proof, negative fixtures, cleanup recovery, and direct parity wiring. Git’s environment-config channel was still missed. |
| 4 | Multi-Tenancy & Security | 10% | 8.0/10 | No tenant/auth/secret/runtime-dependency/push surface. Remote assertions fail safely, but the claimed hermetic neutralization does not remove inherited command-scope Git config. |
| 5 | Scope & Testability | 15% | 8.0/10 | The main scenarios are runnable and observable. Conflicting region placement and an unspecified outside-write observation weaken deterministic implementation. |
| 6 | Migration & Rollback | 20% | 6.8/10 | The public `--practices` migration is now explicit and feasible, but rollback still misclassifies the change as test-only and omits the coordinated wiring/content set. |
| **Total** | **Weighted** | **100%** |  | **7.61/10** | **ITERATE** |

Hard caps checked: none tripped. No runtime dependency, remote-push path, protected security surface, client/server contract, or untraceable method content is introduced. The lint cap is waived only for the reproduced sandbox `EPERM`; the read-only production lint passed.

The formal Clarity ≤7 structural trigger does not independently fire: every FR has Targets, §11 maps every FR to runnable commands, DO NOT exists, and Open Questions is empty. Clarity is nevertheless 7.0 because the active requirements still encode mutually exclusive implementations.

---

## Missing Pieces

1. Make the region rule single-valued everywhere: worktree remains inside the region under `qs:skip`; practices stays outside. State that both the harness and parity verifier exclude skipped fences, define malformed/dangling `qs:skip` behavior, remove the “unmarked-`sh`” failure wording, and update Implementation Scope to include markers.

2. Quote both remaining production reasons exactly and remove the false active symbolic-ref statement. The main-branch reason must include “`, not the base checkout`”.

3. Scrub environment-injected Git configuration before spawning children—at minimum `GIT_CONFIG_COUNT`, all indexed key/value variables, and `GIT_CONFIG_PARAMETERS`—then apply the global/system pins. Either remap all child temp/cache roots into scratch or narrow the external-write claim to something the test concretely observes.

4. Replace the test-only rollback sentence with the coordinated atomic set: package/docs markers and docs recommendation, e2e harness, parity verifier, root script and workflow registration, class ledger, ADR amendment, learning, and index pointer.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| --- | --- | ---: | --- | --- |
| 1 | 2026-07-28 | 4.95 | ITERATE | Initial independent assessment. Measured 14-versus-8 command divergence; traced lint, runner, merge, and worktree behavior; found the nested-run sentinel failure, missing verifier classification/ADR wiring, non-exported scratch helpers, and incomplete hermetic cleanup/no-remote proof. |
| 2 | 2026-07-28 | 6.10 | ITERATE | Confirmed the measured baseline and closed FR-4 governance plus sentinel-memory coverage. Found that the revised state model omitted mandatory close transitions, FR-3’s §11 row violated its root boundary, and install/output-tag/external-write claims remained contradictory. |
| 3 | 2026-07-28 | 5.62 | ITERATE | Confirmed the direct FR-3/FR-4 route and exact sentinel. Found that the claimed [D]/[H] table was absent and contradicted printed order, `gate status` and readiness were omitted, two output fences were untagged, `gate new` intentionally succeeded before `gate init`, and a read-only file did not deterministically fail cleanup. |
| 4 | 2026-07-28 | 7.48 | ITERATE | The real prototype closed command order, raw-template claim, minimal lint, no-readiness, zero-acceptance, offline install, mutation, and single-pass close questions. Remaining findings covered region geometry, fence census, exact negative fixtures, Git config, cleanup, docs migration, and rollback. |
| 5 | 2026-07-28 | 7.61 | ITERATE | Confirmed the corrected handoff-fence census, literal-`main` Base SHA input, complete POSIX cleanup plant, and feasible plain-init docs migration. Corpus and production verification found that worktree is still placed both inside and outside the region, the symbolic-ref claim and truncated main reason survive, the three Git settings do not clear `GIT_CONFIG_COUNT`, and rollback remains test-only. |

---

## Verdict

**ITERATE — 7.61/10.** The prototype and the cleanup/docs decisions make the eventual implementation credible, but the current PRD still gives an agent contradictory extraction instructions and incorrect production assertions. These are precision repairs, not another redesign; nevertheless, they directly determine parser behavior, fixture strength, and hermetic execution, so the item remains below the executable-without-ambiguity threshold.


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 5 transcribed
> verbatim from a fresh independent Codex session; 7.48 → 7.61, four mechanical pieces
> (single-valued region rule, the two production reasons quoted EXACTLY — the author had
> truncated the base-checkout tail, env-injected git-config scrub, the coordinated
> atomic rollback set), applied the same day. Lint EPERM is the documented sandbox
> artifact; out-of-sandbox green the same day.
