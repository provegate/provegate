# Readiness Assessment: PRD-038 — Executable Quickstart

**ITERATE — 7.88/10. The Git-environment and rollback closures hold, but active requirements still contradict the intended region geometry and still preserve the production assertions iteration 5 required removed.**

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-038-executable-quickstart.md` |
| Score | 7.88/10 |
| Verdict | ITERATE |
| Iteration | 6 |
| PRD Class | infra |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit) | — |
| Scored by | Codex (GPT-5), fresh independent re-scorer |
| Self-scored | no |
| Date | 2026-07-29 |
| PRD Lint | Waived for the documented sandbox state-write restriction. `node packages/provegate/dist/cli.js check PRD-038` failed with `EPERM: operation not permitted, open '/Users/rayvaz/Projects/provegate/_state/prds.json.96289.tmp'`. The read-only production equivalent `lintPrd(config, manifest, content, root, 38)` returned `{ "ok": true, "issues": [] }`. Relied additionally on the orchestrating session’s out-of-sandbox green run dated 2026-07-28. |
| State Record | pending |

---

## Iteration 6 — Closure Review

### 1. Region rule — PARTIALLY CLOSED, STILL MULTI-VALUED

The intended rule is now explicit:

> “the worktree alternative stays INSIDE it under `<!-- qs:skip -->`”

and:

> “the practices layer stays OUTSIDE the region entirely”

The skip grammar also closes the requested mechanics: a marker binds to the next `sh` fence; dangling and doubled markers are failures; both readers exclude skipped fences; ordinary unmarked `sh` fences execute.

However, the same FR later retains the opposite placement:

> “Package-only extras (worktree, practices) live OUTSIDE the region”

The top-level metric and §6 also contradict the skip rule:

> “every command in the tagged `qs:scenario` region, in sequence”

> “every command in the tagged `qs:scenario` region executes in order”

A three-command worktree fence cannot simultaneously remain inside the region, be excluded by `qs:skip`, and satisfy “every command … executes.”

The real corpus makes the intended migration feasible:

- Package quickstart: 14 non-comment shell-command lines overall.
- Docs quickstart: 8.
- Package install-to-handoff span: 8 canonical executable commands plus the three-command worktree fence.
- Docs install-to-handoff span: 8 executable commands after changing init to plain `npx gate init`.
- The only untagged openings are the handoff cards at `packages/provegate/QUICKSTART.md:108` and `apps/docs/content/docs/quickstart.mdx:101`.

Filtering the worktree fence therefore yields parity. The PRD merely needs to say that consistently.

Implementation Scope also assigns:

> “the two handoff-card `text` retags”

to `packages/provegate/QUICKSTART.md`, although only one block exists there; the other belongs to the docs file. The docs Scope row does not name its marker or retag. This can cause an implementing agent to omit the docs retag while believing scope is complete.

### 2. Production reasons — EXACT FIXTURE PARAGRAPH CLOSED, ACTIVE TRANSCRIPT STILL FALSE

The negative-fixture paragraph now quotes the two requested visible runner reasons correctly:

> `PRD-001: no tasks file — independent-review ledger missing`

> `current branch is 'main' — run from the feature branch, not the base checkout`

Production confirms them:

- `chain.ts:523` supplies `no tasks file — independent-review ledger missing`, while `cards.ts:21` prefixes `PRD-001:`.
- `merge.ts:177` supplies the complete main-branch reason, including `, not the base checkout`.

The Base SHA fixture is also valid when it plants literal `main`: `review.ts:57` rejects values shorter than seven characters.

But the active measured transcript immediately above the fixtures still says:

> “no tasks file — independent-review ledger missing”

> “the template's symbolic ref is refused; a real sha is required”

> “current branch is 'main' — run from the feature branch”

The first omits the visible `PRD-001:` prefix, the third truncates the required tail, and the middle statement is false. `validateReviewArtifact` checks only that Base SHA has at least seven characters; a direct read-only call confirmed that the shipped `[git merge-base or base tip]` placeholder passes with no issues.

These are active technical assertions, not exempt dated history. An implementer still receives two incompatible fixture specifications.

### 3. Child environment and write boundary — CLOSED

The PRD now requires deletion of:

> “`GIT_CONFIG_COUNT`, every indexed `GIT_CONFIG_KEY_n`/`GIT_CONFIG_VALUE_n`, and `GIT_CONFIG_PARAMETERS`”

before pinning global and system Git configuration to `/dev/null`. This closes the inherited command-scope configuration channel found in iteration 5.

The write claim is tied to the scratch repository and remapped HOME/XDG/npm/TMP roots, with setup-time package build and packing explicitly outside the post-setup observation. The §6 shorthand “nothing outside the temp dir” is readable through this more precise FR-2 definition and does not require a new implementation decision.

### 4. Rollback — CLOSED

The rollback now names one coordinated unit containing:

- package markers and retags;
- docs markers and relocated `--practices` recommendation;
- e2e harness;
- parity verifier;
- root registration and `verify:workflow` membership;
- class-ledger row;
- ADR amendment;
- learning and INDEX pointer.

It also states the failure prevented by atomicity: no registered verifier without its script, marker grammar without its harness, or ADR row without its verifier.

### 5. Memory-input challenge — ADEQUATE, ONE REWORK SIGNAL MISSED

The operationally relevant inputs are applied credibly: direct test execution justifies sentinel removal; the root verifier respects Turbo boundaries; wiring and classification follow ADR-0004; the mutation changes the document rather than the harness; and the built CLI preserves production call shape.

The founding use of `docs-outlive-the-gate-they-promise` is broader than that record’s specific future-tense defect, but it does not misdirect implementation.

The omitted record most descriptive of the current failure is `a-rule-corrected-survives-where-it-is-restated`: after five reworks, the owning rule was fixed while old versions survived in FR-1, Success Metrics, §6, and the measured transcript. Adding it is optional; performing its consistency sweep is not.

---

## Scorecard

| # | Dimension | Weight | Score | Weighted | Notes |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Clarity | 15% | 6.8/10 | 1.02 | The intended rules are discoverable, but active text still gives mutually exclusive worktree placement, execution coverage, and production assertions. |
| 2 | Completeness | 20% | 7.8/10 | Git isolation and rollback are closed. Region restatements, transcript assertions, and docs retag scope remain incomplete. |
| 3 | Technical Depth | 20% | 8.4/10 | Strong prototype, offline tarball execution, production-shaped CLI calls, mutation proof, cleanup recovery, Git-config scrubbing, and direct parity wiring. |
| 4 | Multi-Tenancy & Security | 10% | 8.5/10 | No tenant/auth/secret/network/push surface; remotes and inherited Git configuration are now fail-closed. |
| 5 | Scope & Testability | 15% | 7.5/10 | The scenarios are runnable, but test authors must choose whether skipped regional commands count, and Scope misassigns the docs handoff retag. |
| 6 | Migration & Rollback | 20% | 8.2/10 | The docs migration is corpus-feasible and rollback is atomic; the remaining deduction is the inaccurate per-file retag scope. |
| **Total** | **Weighted** | **100%** |  | **7.88/10** | **ITERATE** |

No hard cap fires. The PRD adds no runtime dependency, protected route, client/server contract, remote-push path, or untraceable method content. The lint cap is waived only for the reproduced sandbox `EPERM`, with both a green read-only lint and the stated out-of-sandbox run.

The mechanical Clarity ceiling does not independently fire: every FR has Targets, every FR maps to a runnable §11 command, DO NOT exists, Open Questions is empty, and no undecided token remains. The substantive Clarity score is nevertheless below 7 because active requirements still encode incompatible implementations.

---

## Missing Pieces

1. Perform one full region-rule consistency sweep. Replace the retained “worktree, practices … OUTSIDE” sentence; qualify Success Metrics and §6 as every executable, non-skipped command; assign each handoff retag and both region markers to the correct document in Implementation Scope.

2. Correct the active measured transcript—not only the later fixture paragraph. Include the `PRD-001:` prefix and `, not the base checkout` tail, and remove the false claim that the shipped symbolic placeholder is generally refused.

3. Re-run the active-text sweep across Introduction, Goals, FRs, §6, Technical Considerations, Implementation Scope, §11, and DO NOT after those edits. Dated Changelog rows remain exempt.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| --- | --- | ---: | --- | --- |
| 1 | 2026-07-28 | 4.95 | ITERATE | Initial independent assessment. Measured 14-versus-8 command divergence; traced lint, runner, merge, and worktree behavior; found the nested-run sentinel failure, missing verifier classification/ADR wiring, non-exported scratch helpers, and incomplete hermetic cleanup/no-remote proof. |
| 2 | 2026-07-28 | 6.10 | ITERATE | Confirmed the measured baseline and closed FR-4 governance plus sentinel-memory coverage. Found that the revised state model omitted mandatory close transitions, FR-3’s §11 row violated its root boundary, and install/output-tag/external-write claims remained contradictory. |
| 3 | 2026-07-28 | 5.62 | ITERATE | Confirmed the direct FR-3/FR-4 route and exact sentinel. Found that the claimed [D]/[H] table was absent and contradicted printed order, `gate status` and readiness were omitted, two output fences were untagged, `gate new` intentionally succeeded before `gate init`, and a read-only file did not deterministically fail cleanup. |
| 4 | 2026-07-28 | 7.48 | ITERATE | The real prototype closed command order, raw-template claim, minimal lint, no-readiness, zero-acceptance, offline install, mutation, and single-pass close questions. Remaining findings covered region geometry, fence census, exact negative fixtures, Git config, cleanup, docs migration, and rollback. |
| 5 | 2026-07-28 | 7.61 | ITERATE | Confirmed the corrected handoff-fence census, literal-`main` Base SHA input, complete POSIX cleanup plant, and feasible plain-init docs migration. Corpus and production verification found that worktree was still placed both inside and outside the region, the symbolic-ref claim and truncated main reason survived, the three Git settings did not clear `GIT_CONFIG_COUNT`, and rollback remained test-only. |
| 6 | 2026-07-29 | 7.88 | ITERATE | Confirmed that environment-injected Git configuration is now scrubbed and rollback is a coordinated atomic set. Corpus and source checks found the region contradiction still active, every-command claims incompatible with `qs:skip`, the measured transcript still carrying both truncated reasons and the false symbolic-ref statement, and the two handoff retags assigned to the wrong per-file Scope row. Read-only lint passed under the documented `EPERM` waiver. |

---

## Verdict

**ITERATE — 7.88/10.** Two substantial iteration-5 gaps are genuinely closed, and the intended implementation is technically credible. The remaining defects are localized prose repairs, but they are not harmless watch items: they tell the harness author which commands execute, tell the verifier author what parity means, and tell the test author which production text to assert. Until those active contradictions are removed, the PRD is not executable without ambiguity.


---

> **Transcription note (orchestrating session, 2026-07-29).** Iteration 6 transcribed
> verbatim from a fresh independent Codex session (the first launch of this round died
> on an auth-expiry stream disconnect and was relaunched after the owner's /login;
> no partial output was used). 7.61 → 7.88. Lint EPERM is the documented sandbox
> artifact; out-of-sandbox green the same day.
