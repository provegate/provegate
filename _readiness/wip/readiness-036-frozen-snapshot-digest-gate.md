# Readiness Assessment: PRD-036 — Frozen-Snapshot Digest Gate

> **Iteration 1 (Codex, independent) — 5.55/10, ITERATE, band 4–5.9: "Major rework
> needed. Return to Phase 1" (`score-band-prescribes-the-action`).** Orchestration
> disclosure: the orchestrating session verified every load-bearing citation against
> source (the five additional undeclared reads, the `turbo.json` inputs array, the
> learning record's own `_docs/reviews` instance, the PRD-025 fixture handoff) and
> authored no verdicts; Codex is the scorer and did not write the PRD.
>
> **The headline: the PRD's measured baseline is false.** It declares exactly two
> out-of-package reads (`prd-036:74-77`) — but the package suite also reads
> `_docs/reviews/**` (`review-quorum.test.ts:70-77`), `apps/docs/**`
> (`content-adoption.test.ts:22-25`, `revalidate.test.ts:483-485`), root
> `AGENT_BOOTSTRAP.md` (`content-prompts.test.ts:636-637`), `.changeset/**`
> (`changeset-entry.test.ts:25,41-45`), and copies `scripts/verify/` sources via
> `cpSync` (`doc-claims-script.test.ts:17-19,56-62`) — none covered by the current
> inputs (`turbo.json:15-23`). The Memory Input's own record names `_docs/reviews` as
> this defect class's original instance, refuting the PRD's "remaining live instance"
> claim. FR-2's discovery grammar (three named fs APIs) cannot find aliased or
> `cpSync`-shaped reads it promises to catch; FR-1's §11 row invokes Vitest directly
> and so bypasses the very Turbo cache behavior it must prove; an infra item with an
> initially-red census ships no atomic-rollout/rollback contract; and RM 5 is not
> supportable for a scanner with no closed grammar — RM 4 puts Value at 3.30, back
> below the 3.40 cutoff after the first expansion. What held: both named reads are
> real, PRD-024's seam exists on main exactly as described, the exception policy
> behaves as claimed, all four Memory Inputs are active and indexed, §11 parses safe,
> and `lintPrd` is green. **Next step is Phase-1 rework — complete the census, close
> the scanner grammar, add rollout/rollback — not another scoring round.**

## Quick Meta

| Field                  | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PRD                    | `_prds/wip/prd-036-frozen-snapshot-digest-gate.md`                                                                                                                                                                                                                                                                                                                                                                                                      |
| Score                  | 5.55/10                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Verdict                | ITERATE — band 4–5.9: Phase-1 rework. The declared two-read baseline omits at least five further undeclared repo-root reads the census would immediately trip on; the FR-2 scanner has no implementable closed grammar; FR-1's runnable row bypasses Turbo and cannot evidence cache invalidation; no rollout/rollback contract in an infra item whose census lands red; post-expansion RM 5 unsupported — RM 4 yields 3.30, below the candidate cutoff |
| Iteration              | 1                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Model Tier (Execution) | do not assign — fix the PRD first                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Model Tier (Audit)     | — (assign on a PASS)                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Scored by              | **Codex (gpt-5.x) via the `/codex` skill — independent, different model family, did not write the PRD; orchestrated by a session that authored no verdicts and re-verified the load-bearing citations**                                                                                                                                                                                                                                                 |
| Self-scored            | no                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Date                   | 2026-07-28                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| PRD Lint               | passed — Codex ran the production-shaped `lintPrd(config, manifest, text, root, 36)` directly → `ok: true`, zero issues; the orchestrator's `gate check PRD-036` exit 0; all three §11 commands classified safe by direct `parseVerificationCommands` probe                                                                                                                                                                                             |
| State Record           | updated — `gate status` re-run after saving                                                                                                                                                                                                                                                                                                                                                                                                             |

<!-- Verdict values: PASS | ITERATE | REJECT. The Score row and Verdict row are parsed
by the state builder — keep the `| Score |` and `| Verdict |` labels intact. -->

---

## Model Tier Recommendation

| Phase               | Tier          | Rationale                                                                    |
| ------------------- | ------------- | ---------------------------------------------------------------------------- |
| Execution (Phase 4) | do not assign | band 4–5.9; the census baseline and scanner grammar must be re-founded first |
| Audit (Phase 6)     | —             | assign when a PASS exists                                                    |

---

## Analysis

### Findings — iteration 1 (Codex, independent)

**[P1] A — the claimed census baseline is materially incomplete.** The PRD reports
exactly two missing paths (`prd-036:74-77`), but current package tests also read
`_docs/reviews/**` (`review-quorum.test.ts:70-77`), `apps/docs/**`
(`content-adoption.test.ts:22-25`; `revalidate.test.ts:483-485`), root
`AGENT_BOOTSTRAP.md` (`content-prompts.test.ts:636-637`), and `.changeset/**`
(`changeset-entry.test.ts:25,41-45`) — none covered by the current inputs
(`turbo.json:15-23`). The applied memory record itself names `_docs/reviews` as this
defect class's first instance (`turbo-cache-masks-out-of-input-reads:14-17`), refuting
the PRD's claim to be that record's "remaining live instance" (`prd-036:198-199`).
Orchestrator verification note: `content-adoption.test.ts:14-19` records its cache gap
as an accepted, documented cost with the §11 row as uncached authority — that
acceptance does not survive FR-2 as written, whose census would fail on the read; the
PRD must either declare the glob or carve a reasoned exception shape into the census.
Remedy: perform and record the complete baseline census; add every needed root glob to
FR-1, Targets, Implementation Scope, the exception rationale, and the success metrics
— or choose a conservative wider glob and document its invalidation cost.

**[P1] B — FR-2 does not define an implementable, class-complete discovery grammar.**
It promises to catch every out-of-package read while scanning only
`readFileSync`/`readdirSync`/`existsSync` (`prd-036:116-121`). Real sources use
aliased dynamic arguments — `readFileSync(join(repoRoot, rel))`
(`content-adoption.test.ts:22-25`) — and pull external inputs via `cpSync`
(`doc-claims-script.test.ts:17-19,56-62`), which the named API set cannot find. No
AST/data-flow grammar, no conservative fallback, no behavior for unclassifiable
expressions; a hardcoded list is (correctly) forbidden by §12 (`prd-036:298-299`),
which leaves no autonomous implementation contract at all. Remedy: define a closed
supported syntax (input-bearing APIs, alias resolution, fail-closed diagnostic on
unsupported expressions) plus source-text fixtures: direct literal, root alias,
helper, dynamic path, and an unclassifiable deny case that fails by file name.

**[P1] C — FR-1's runnable row does not evidence FR-1.** The acceptance criterion is
an actual Turbo cache miss after a snapshot edit (`prd-036:138-145`), but the §11 row
invokes Vitest directly (`prd-036:260-263`), bypassing Turbo entirely; deferring the
cache-miss proof to "a documented check in the task plan" is not runner-executable
evidence, and the FR-2 census proves a glob exists, not that Turbo invalidated.
Remedy: a dedicated runnable check comparing Turbo behavior or hashes across a
controlled snapshot mutation in a temp fixture, with the census kept as the
structural positive control.

**[P1] D — no rollout/rollback contract in an infra item whose census lands red.**
Serialization is discussed (`prd-036:158-166`) but the document moves straight into
Implementation Scope (`prd-036:168-176`) with no deployment order and no rollback.
Because the real baseline exceeds the declared two reads, landing the census before
all declarations turns the package suite red; landing declarations without a valid
census leaves the standing guarantee unproved. Remedy: one atomic change carrying the
complete baseline, the globs, the exception rationale, and the census; an exact
rollback order (test, globs, reason text) verified by `pnpm verify:turbo-inputs` plus
the package suite.

**[P1] E — Value arithmetic exact, post-expansion RM 5 unsupported.** 3.45 reproduces
under the configured weights (`defaults.ts:122-130`), but RM 5 means safest/lowest
standing maintenance — untenable for a source scanner with no stable grammar, a
baseline already missed, and a deliberate every-workspace test invalidation cost
(`prd-036:110-114`). RM 4 alone yields 3.30, below the 3.40 cutoff; TL 4 is
supportable only once FR-2 genuinely covers the class. This is the second
below-threshold event after the first expansion (born 2.80). Remedy: finish the
scanner and rollout specification, rescore RM/TL honestly; if still below 3.40, take
the protocol's second expansion or record the cut.

**[P2] F — serialization facts have moved; the PRD correctly requires re-measurement.**
PRD-024 and PRD-028 are Ship Verified with `_brain/**` already in the inputs array
(`turbo.json:17`); draft PRD-032 now also claims `turbo.json` (`prd-032` Conflict
Surface); the sole live lease (PRD-034) owns none of PRD-036's write targets. No
readiness penalty — the PRD instructs re-running `gate queue` before claiming — but
the Phase-1 rework should refresh §7/Conflict Surface prose to the post-024/028 state.

### What held up (verified with citations, several by execution)

Both named reads are real: the snapshot escape (`content-prompts.test.ts:315-323`) and
the PRD-025 real-bundle fixture (`wiring.test.ts:369-378`, its Deferrals handoff to
PRD-036 recorded at `tasks-025:340-344`). PRD-024's seam exists on main exactly as
described: `inputs` carries `$TURBO_DEFAULT$` plus root globs with the two claimed
reads genuinely absent (`turbo.json:15-23`), and the `"test"` exceptions entry has a
written reason. The exception policy behaves as claimed: cached tasks with `inputs`
require a non-empty exception, stale entries rejected (`verify-turbo-inputs.mjs:57-77`);
`pnpm verify:turbo-inputs` and `pnpm verify:brain` pass. All four Memory Inputs are
active, indexed records. Every FR has a backticked §11 row; direct
`parseVerificationCommands` + `isSafeCommand` probes classify all three commands safe;
`lintPrd` five-argument probe green. Hard caps all clear. (Scorer caveat: targeted
Vitest execution was blocked in the scorer's read-only sandbox — tmp-dir creation
denied, environmental, not an assertion failure; the read-site claims were proven by
source inspection instead.)

---

## Scorecard

Class `infra` weights, per `packages/provegate/prompts/phase-2-readiness-scorer.md`.

| #         | Dimension                | Weight | Score       | Notes                                                                                                            |
| --------- | ------------------------ | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| 1         | Clarity                  | 15%    | 6.5/10      | concrete targets and anti-patterns; scanner contract and glob-scope conflict block autonomous execution          |
| 2         | Completeness             | 20%    | 4.5/10      | the measured baseline omits several existing repo-root inputs and non-listed input APIs                          |
| 3         | Technical Depth          | 20%    | 5.5/10      | Turbo semantics and exception policy accurate; static-analysis grammar, fallback, cache-proof design unspecified |
| 4         | Multi-Tenancy & Security | 10%    | 9.5/10      | no tenant/auth/network/data surface                                                                              |
| 5         | Scope & Testability      | 15%    | 5.5/10      | named deny test and positive control good; deny mechanism undefined, FR-1 row bypasses Turbo                     |
| 6         | Migration & Rollback     | 20%    | 4.0/10      | serialization recognized; atomic rollout and exact rollback absent despite an initially red census               |
| **Total** | **Weighted**             |        | **5.55/10** | **ITERATE — band 4–5.9: Phase-1 rework**                                                                         |

Hard caps: security, contract, lint, runtime-dependency, push-path, method-content
traceability — all clear.

---

## Missing Pieces (binding on the Phase-1 rework)

1. The complete baseline census, recorded in the PRD: every out-of-package read in
   `packages/provegate/test/**` today, with each path's disposition (declare the glob,
   or a reasoned census exception shape for accepted-cost reads like
   `content-adoption`'s).
2. FR-2 rebuilt as a closed discovery grammar: enumerated input-bearing APIs
   (including `cpSync`), alias/`join(repoRoot, …)` resolution, fail-closed diagnostic
   on unclassifiable expressions, plus fixtures for each shape and a deny case that
   fails by file name.
3. A runnable FR-1 evidence row that exercises Turbo itself (behavior or hash
   comparison across a controlled snapshot mutation), not a direct Vitest invocation.
4. An atomic rollout plan (baseline + globs + exception reason + census in one change)
   and an exact rollback order, both verified by `pnpm verify:turbo-inputs` and the
   package suite.
5. Value re-scored honestly after the rework (RM 5 → 4 puts it at 3.30); below 3.40
   means the protocol's second expansion or the recorded cut.
6. §7 Dependencies / Conflict Surface prose refreshed to the post-024/028 facts, with
   the PRD-032 `turbo.json` claim noted for serialization.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ---------- | ----- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2026-07-28 | 5.55  | ITERATE | First independent round. The declared two-read baseline is refuted by at least five further undeclared repo-root reads in the package suite — including the one the applied learning record itself names as the class's first instance; the FR-2 scanner grammar cannot find aliased or `cpSync`-shaped reads; FR-1's §11 row bypasses Turbo; no rollout/rollback in an infra item whose census lands red; RM 5 unsupported post-expansion (RM 4 → 3.30, below cutoff). Both named reads, PRD-024's seam, the exception policy, Memory Inputs, §11 safety, and `lintPrd` all verified green. Band 4–5.9: Phase-1 rework, not another scoring round. |

---

## Verdict

**ITERATE — 5.55/10, iteration 1, scored independently by Codex.**

The instinct is right and the seam is real — both named reads verify, and PRD-024's
pattern is on main ready to extend. But the document promises a census while
mis-measuring its own baseline: the suite already holds more undeclared reads than the
two it names, including the very instance its applied learning record was written
about, and the scanner it specifies could not find them. The band's action is the
instruction (`score-band-prescribes-the-action`): return to Phase 1, re-found FR-1 on
a complete measured baseline, close FR-2's grammar, give the infra change its
rollout/rollback contract, and bring an honest RM with it.
