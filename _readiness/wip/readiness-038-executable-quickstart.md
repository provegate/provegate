# Readiness Assessment: PRD-038 — Executable Quickstart

**ITERATE — 7.48/10. The prototype resolves the close-state uncertainty, but the extraction contract and negative fixtures remain internally contradictory.**

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-038-executable-quickstart.md` |
| Score | 7.48/10 |
| Verdict | ITERATE |
| Iteration | 4 |
| PRD Class | infra |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit) | — |
| Scored by | Codex (GPT-5), fresh independent re-scorer |
| Self-scored | no |
| Date | 2026-07-28 |
| PRD Lint | Waived for the documented sandbox state-write restriction. `node packages/provegate/dist/cli.js check PRD-038` failed with `EPERM: operation not permitted, open '.../_state/prds.json.57373.tmp'`. The read-only production equivalent `lintPrd(config, manifest, content, root, 38)` returned `{ "ok": true, "issues": [] }`. Relied additionally on the orchestrating session’s out-of-sandbox green run dated 2026-07-28. |
| State Record | pending |

---

## Iteration 4 — Prototype Review

### 1. Prototype-backed state model — SUBSTANTIALLY CLOSED

The real prototype materially resolves iteration 3’s central uncertainty:

- The printed command order now includes `gate status` and preserves `gate open` before `gate check`.
- `gate open PRD-001` can claim the generated raw template. The shipped template contributes one claimable conflict glob, `path/to/owned/dir/**`; the `none` bullet is ignored.
- A direct in-memory production lint of the instantiated template confirms that replacing both `{{CMD_TEST_SCOPED}}` values with `node -e "process.exit(0)"` and changing `Autonomous Close` to `eligible` produces `{ "ok": true, "issues": [] }`.
- `buildGateChain` contains no readiness-artifact gate. The prototype’s successful close without `_readiness/...` therefore matches production.
- `operatorGateOk` returns success immediately when `operatorHandoffCount === 0`; an eligible task with zero operator rows requires no acceptance entry.
- The `gate new`/`gate open` mutation is genuine: before `gate new` allocates PRD-001, there is no artifact for `gate open PRD-001` to claim.
- The plain-init package has no runtime dependencies, and the reported tarball installation with an unreachable registry is consistent with that package shape.

The arrow transcript is no longer missing the decisive transitions, although it is still prose labelled as a “table.” That presentation issue alone would be a watch item rather than a blocker.

### 2. Single-region extraction contract — NOT EXECUTABLE AS WRITTEN

The package document’s optional worktree block lies between the canonical `gate open` and `gate check` steps:

```text
open → optional worktree commands → check → run
```

That block contains three real commands in a `sh` fence:

- `git add ...`
- `git commit ...`
- `npx gate open PRD-001 --worktree`

FR-1 simultaneously requires:

1. exactly one contiguous `qs:scenario` region;
2. all canonical commands from install through close;
3. every `sh` fence in that region to execute; and
4. package-only worktree material to remain outside the region.

Those four conditions cannot all hold in the current document layout. The implementation must either move the worktree block, permit multiple scenario regions, or define an explicit excluded-fence grammar. Moving it changes teaching order, which the Non-Goals currently forbid.

The fence census also contradicts FR-1. The two untagged opening fences are both handoff-card copies:

- `packages/provegate/QUICKSTART.md:108`
- `apps/docs/content/docs/quickstart.mdx:101`

The worktree transcript is not an untagged fence; it is a comment inside the package’s `sh` fence. Therefore the instruction to retag “the worktree claim transcript and the handoff card” does not identify the actual pair.

### 3. Three negative fixtures — ONE EXACT, TWO MISSTATED

The no-tasks stop is exact production text:

> `no tasks file — independent-review ledger missing`

The other two quoted messages are not verbatim:

| Fixture | PRD wording | Production reason |
| --- | --- | --- |
| Base SHA | `missing Base SHA` | `missing \`> **Base SHA:** <git sha>\` metadata` |
| Base branch | `current branch is 'main' — run from the feature branch` | `current branch is 'main' — run from the feature branch, not the base checkout` |

More importantly, the review gate does not require a Git SHA. `validateReviewArtifact` checks only that the parsed Base SHA value is at least seven characters long:

- The shipped placeholder `[git merge-base or base tip]` passes validation.
- `main` fails because it has four characters.
- A longer symbolic ref also passes.

Thus “the template’s symbolic ref is refused; a real sha is required” is false. A fixture based on the raw review template will not stop at Base SHA, while a fixture using `main` will. The PRD must name the exact planted value and the exact expected reason.

### 4. Hermeticity — PARTIALLY CLOSED

The tarball destination, unreachable registry, npm flags, remapped HOME, no-remote assertions, and sentinel sanitization are strong.

Two iteration-3 contradictions remain:

- HOME remapping does not neutralize inherited Git configuration. A read-only probe, `git -c remote.provegate-injected.url=https://invalid.example remote`, added `provegate-injected` to the reported remotes. Inherited `GIT_CONFIG_COUNT`/`GIT_CONFIG_KEY_*`/`GIT_CONFIG_VALUE_*` can do the same. These variables and system/global config must be neutralized explicitly.
- Setup runs `pnpm --filter provegate build`, which writes `packages/provegate/dist` outside the scratch directory. Section 6’s unconditional “nothing outside the temp dir was written” therefore contradicts the specified setup. Scope the assertion to adopter commands, or stage the already-built tarball without writing during the test.

### 5. Cleanup probe — BETTER, BUT NOT FULLY PINNED

A chmod-555 directory is stronger than iteration 3’s read-only file. However:

- An empty non-writable subdirectory can still be removed through its writable parent.
- The PRD does not require a child entry inside the protected directory.
- The mechanism is POSIX-specific, while the package declares no operating-system restriction.

The initial-failure assertion prevents a false green on Ubuntu, but an implementer must still invent the non-empty directory and platform policy. Name both.

### 6. Public-doc parity and rollback — STILL CONTRADICTORY

The docs quickstart currently executes and recommends `npx gate init --practices`; the measured package path uses plain `npx gate init`. FR-3 says the docs twin adopts the package sequence while “teaching prose stays free,” yet leaving the recommendation prose unchanged would make the rendered page contradict its command.

This is a public recommendation change, while Non-Goals prohibit rewriting quickstart content or teaching order. The PRD must authorize the exact command/prose reconciliation or choose a different canonical sequence.

Related stale statements remain:

- “reuse their helpers where exported” names helpers that are file-local;
- sequencing still describes PRD-026 as owning files although it is Ship Verified;
- Implementation Scope still says “derivation or parity” after FR-3 decided parity;
- rollback remains “plain revert” without naming the coordinated docs, verifier, registry, workflow-bundle, ADR, and memory-artifact rollback set.

---

## Scorecard

| # | Dimension | Weight | Score | Weighted | Notes |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Clarity | 15% | 7.0/10 | 1.05 | Formal clarity checks pass, but one contiguous region cannot exclude the mid-document worktree block, and two “verbatim” fixtures do not quote production. |
| 2 | Completeness | 20% | 7.5/10 | The prototype closes command order, readiness, acceptance, install, mutation, and live-close state. Exact fence disposition, Git isolation, and cleanup/platform setup remain incomplete. |
| 3 | Technical Depth | 20% | 8.0/10 | Strong real prototype, offline install, sentinel handling, single-pass production path, and negative-fixture strategy. Base SHA semantics and scenario geometry were not checked against their consumers. |
| 4 | Multi-Tenancy & Security | 10% | 8.0/10 | No tenant, auth, secret, dependency, telemetry, network, or push surface. Remote intent is sound, but HOME alone does not neutralize injected Git configuration. |
| 5 | Scope & Testability | 15% | 7.5/10 | Mutation, parity, per-step assertions, and cleanup recovery are testable. The primary extraction grammar needs a design choice, and the chmod failure lacks a non-empty/platform contract. |
| 6 | Migration & Rollback | 20% | 7.0/10 | Test-only code is reversible, but public `--practices` guidance, coordinated verifier wiring, external setup writes, stale sequencing, and the exact rollback set remain unresolved. |
| **Total** | **Weighted** | **100%** |  | **7.48/10** | **ITERATE** |

Hard caps checked: none tripped. No runtime dependency, remote-push path, protected security surface, client/server contract, or untraceable method content is introduced. The lint cap is waived only for the reproduced sandbox `EPERM`; the read-only production lint passed.

The formal Clarity ≤7 trigger does not independently fire: every FR has concrete Targets, §11 maps every FR to a runnable command, DO NOT exists, and Open Questions is empty. Clarity is nevertheless held at 7.0 because the extraction and negative-fixture instructions admit incompatible implementations.

---

## Missing Pieces

1. Resolve the single-region geometry explicitly. Choose one: move the optional worktree block outside the canonical path and authorize the teaching-order change; allow multiple ordered regions; or introduce an explicit ignored-fence form. Correct the fence census—the actual untagged openings are the two handoff cards.

2. Pin the three negative fixtures to exact production inputs and reasons. For Base SHA, name a short planted value such as `main`; do not claim the raw template or symbolic refs generally fail. Quote the complete Base SHA and base-branch reasons.

3. Neutralize inherited Git configuration (`GIT_CONFIG_*`, global, and system sources), or narrow the remote-impossibility claim. Scope “nothing outside the temp dir was written” so it does not contradict the preparatory package build.

4. Make the cleanup plant complete: require a non-empty chmod-555 directory and state the Ubuntu/POSIX test scope, or use a platform-independent injected removal failure.

5. Decide the docs parity migration. Name whether the docs command becomes plain init and require the surrounding `--practices` recommendation to change with it, or select another canonical sequence. Remove “derivation or parity,” the nonexistent exported-helper suggestion, and stale PRD-026 ownership wording.

6. Expand rollback from “plain revert” to the exact coordinated surface: package/docs markers and prose, e2e test, parity verifier, root script registration, workflow bundle, script-class ledger, ADR amendment, and declared memory artifacts.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| --- | --- | ---: | --- | --- |
| 1 | 2026-07-28 | 4.95 | ITERATE | Initial independent assessment. Measured 14-versus-8 command divergence; traced lint, runner, merge, and worktree behavior; found the nested-run sentinel failure, missing verifier classification/ADR wiring, non-exported scratch helpers, and incomplete hermetic cleanup/no-remote proof. |
| 2 | 2026-07-28 | 6.10 | ITERATE | Confirmed the measured baseline and closed FR-4 governance plus sentinel-memory coverage. Found that the revised state model omitted mandatory close transitions, FR-3’s §11 row violated its root boundary, and install/output-tag/external-write claims remained contradictory. |
| 3 | 2026-07-28 | 5.62 | ITERATE | Confirmed the direct FR-3/FR-4 route and exact sentinel. Found that the claimed [D]/[H] table was absent and contradicted printed order, `gate status` and readiness were omitted, two output fences were untagged, `gate new` intentionally succeeded before `gate init`, and a read-only file did not deterministically fail cleanup. |
| 4 | 2026-07-28 | 7.48 | ITERATE | The real prototype closes the command-order, raw-template claim, minimal lint, no-readiness, zero-acceptance, offline-install, mutation, and single-pass close questions. New source verification found that one contiguous region cannot exclude the mid-document worktree commands; the fence pair is misidentified; the raw review placeholder passes Base SHA validation; two quoted stops are truncated; HOME does not neutralize injected Git config; and docs parity still conflicts with the `--practices` recommendation and rollback scope. |

---

## Verdict

**ITERATE — 7.48/10.** Prototype-first was the correct move and eliminated most of the speculative state-model risk. What remains is not cosmetic: the implementing agent cannot place one scenario region satisfying FR-1 without changing an expressly protected teaching order, and the required Base SHA fixture will not stop if built from the template the PRD names. Resolve those design choices and pin the hermeticity/docs migration details before Phase 3.


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 4 transcribed
> verbatim from a fresh independent Codex session; 5.62 → 7.48 — the prototype-first
> decision broke the oscillation, and the five remaining pieces are precision (region
> geometry, pinned negative fixtures, git-config neutralization, complete cleanup
> plant, the docs-parity migration decision), applied the same day. Lint EPERM is the
> documented sandbox artifact; out-of-sandbox green the same day.
