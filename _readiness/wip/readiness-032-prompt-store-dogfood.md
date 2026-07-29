# Readiness Assessment: PRD-032 — Prompt-Store Dogfood

> **Iteration 2 (Codex, independent, 2026-07-29) — 5.20/10, ITERATE; still band 4–5.9:
> "Major rework needed. Return to Phase 1" (`score-band-prescribes-the-action`).**
> Scored the day PRD-034 went Ship Verified, exactly as iteration 1 prescribed — the
> scorer *executed* `gate check --prompts`, `verify:prompts`, `check --wiring`, the
> CI-order assertion, and a pure in-memory full render rather than reading them.
> Orchestration disclosure: the orchestrating session verified every load-bearing
> citation against source (FR-1's value set, the missing rollback section, the
> `turbo.json` collision, PRD-034's `unattributable` arm, the live doc-claims red) and
> authored no verdicts; Codex is the scorer and did not write the PRD.
>
> **The headline: the chain is fixed, the specification is not.** The 07-28 refresh
> correctly re-founded PRD-032 on PRD-034 — wiring claims now all hold on main
> (`verify-prompts.mjs` is bundle member 10, both CLI flags exist, CI order asserted
> green). What remains is specification debt: the live initializer now prints **10**
> required values and FR-1 still answers two of them ("and so on" for the rest); the
> infra-weighted-20% migration/rollback section is still absent; FR-3's mutation is
> promised in four places and executed in none — and PRD-034's FINAL contract makes the
> generic "edit a store file → `modified`" claim wrong (unbannered members classify
> `unattributable`, `prd-034:127-137`); the Conflict Surface still claims `turbo.json`
> against live Draft PRD-036 ownership; and the prescribed Phase-5 baseline is red
> TODAY (`verify:doc-claims`: committed `shipVerified: 34` vs fresh 35) with no
> serialization named. Value 3.40 still judged 2.85-supportable — expand-or-cut stands.
> Seven stale restatements swept out by name; the counts/sentinel/PRD-030 families came
> back clean. **Next step: one Phase-1 rework pass with the owner's ten values and a
> rollback section — the blockers are now decisions, not dependencies.**

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-032-prompt-store-dogfood.md`    |
| Score                  | 5.20/10                                        |
| Verdict                | ITERATE — band 4–5.9: Phase-1 rework. The PRD-034 chain and all wiring claims now hold on main; what remains is specification debt: 8 of the 10 required values undecided, no migration/rollback section in the class that weights it 20%, a mutation promised four times and executed zero, a `turbo.json` claim colliding with live PRD-036, and a prescribed verification baseline that is red today |
| Iteration              | 2                                              |
| Model Tier (Execution) | do not assign — fix the PRD first              |
| Model Tier (Audit)     | — (assign on a PASS)                           |
| Scored by              | **Codex (gpt-5.x) via the `/codex` skill — independent, different model family, did not write the PRD; orchestrated by a session that authored no verdicts and re-verified the load-bearing citations** |
| Self-scored            | no                                             |
| Date                   | 2026-07-29                                     |
| PRD Lint               | passed — Codex's `gate check PRD-032` exited 1 only on a sandbox `EPERM` writing the state tmp file, before lint; its direct five-argument production-shaped `lintPrd(config, manifest, text, root, 32)` returned `{ok:true, issues:[]}`; the orchestrator's unsandboxed `gate check PRD-032` exit 0 |
| State Record           | updated — `gate status` re-run after saving    |

<!-- Verdict values: PASS | ITERATE | REJECT. The Score row and Verdict row are parsed
by the state builder — keep the `| Score |` and `| Verdict |` labels intact. -->

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Execution (Phase 4) | do not assign | band 4–5.9; the chain dependency must be re-founded first |
| Audit (Phase 6)     | — | assign when a PASS exists |

---

## Analysis

### Findings — iteration 2 (Codex, independent, 2026-07-29)

Scored against PRD-034's **final landed contract** (Ship Verified `498e400`, HEAD at
scoring `678eaa0`). PRD-038 went Ship Verified *during* the audit and no longer
collides. Every probe below was executed, not read.

**Iteration-1 closure: A CLOSED; C, D, H PARTIALLY CLOSED; B, E, F, G, I STILL OPEN.**

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| A | wrong reconciliation deliverable | **CLOSED** | PRD-034 owns check + twins (`prd-032:36-40,152-170,186-193`), hard Ship Verified prerequisite (`:249-261`); stale "implementation pending" phrase reported separately |
| B | values unspecified | **OPEN** | initializer now prints **10** required keys; FR-1 still names two + "and so on" (`prd-032:128-141`) |
| C | §11 unrunnable/non-evidentiary | **PARTIAL** | flags/scripts now exist (`:403-411`); FR-3 still reruns FR-2's clean-tree command, mutation lives only in Notes (`:407`) |
| D | Conflict Surface contradiction | **PARTIAL** | 034-owned targets dropped, 038 closed; `.gitignore`/`turbo.json` still Targets (`:177-180`) + exclusive claims (`:375-381`) vs PRD-036's live claim (`prd-036:407-408,517-527`) |
| E | no migration/rollback | **OPEN** | Dependencies still jumps straight to Scope (`prd-032:257-266`) |
| F | Claude first-line listing defect | **OPEN** | banner still line 1 of every Claude command (`prompts.ts:788-801`); no acceptance criterion |
| G | two review-template authorities | **OPEN** | root template says Quorum optional (`_docs/review-artifact.template.md:25`); store template + gate require it (`review.ts:48-65`) |
| H | Memory Inputs stale | **PARTIAL** | PRD-034 attribution + turbo-cache disposition fixed (`:308-337,355-358`); four dogfood records still undispositioned |
| I | Value 3.40 not credible | **OPEN** | header unchanged; supportable 2.85 (4/2/3/2/3) |

**[P1] 1 — activation inputs not agent-executable.** 10 printed required keys, exact
answers for two (`prd-032:128-141`); `AUTONOMY_MODE` is owner-recorded and non-inferable;
`DOMAIN_CHECKS`/`ENV_NOTES` need explicit decisions even if empty. Remedy: enumerate all
ten: `PROJECT_NAME`, `CMD_TEST_SCOPED`, `DOMAIN_CHECKS`, `TECH_STANDARDS`,
`ARCHITECTURE_DOC`, `BEST_PRACTICES_DOC`, `DOCS_ROOT`, `REVIEW_TOOL`, `ENV_NOTES`,
`AUTONOMY_MODE`.

**[P1] 2 — migration/rollback absent in the 20%-weighted dimension.** Ordering scattered
across FR-1/FR-2; no section (`prd-032:257-266`). Remedy: ordered activation (capture the
printed generated set → land block + `templates.prd` + all 30 generated paths
atomically) and exact rollback in the state model's terms
(`_docs/design/prompt-store-state-model.md:242-269`): disable block + clear
`templates.prd` in one config change, human deletes every captured path, `check
--prompts` returns the dormant note.

**[P1] 3 — FR-3's mutation neither executed nor correctly scoped.** Promised at
`prd-032:116-117,158-160,210-212,407`; §11 executes only FR-2's clean-tree command. And
PRD-034's final contract classifies edited **unbannered** planned members (codex
snippet, `PLACEHOLDERS.md`) as `unattributable`, not `modified`
(`prd-034:127-137,291-324`). Remedy: name a bannered path
(e.g. `.provegate/prompts/phase-3-task-generator.md`), one runnable §11 command that
plants the edit, asserts non-zero + `modified` + exact path, restores in `finally`.

**[P1] 4 — Conflict Surface claims check-only paths, collides with PRD-036.** FR-6
inspects but Targets `.gitignore`/`turbo.json` (`prd-032:177-180`) and claims both
exclusively (`:375-381`); PRD-036 (Draft, iteration-5 7.53 ITERATE) owns `turbo.json`
live (`prd-036:407-408`). Probes: no planned destination is git-ignored,
`verify:turbo-inputs` green. Remedy: FR-6 becomes targetless read-only assertion; drop
`.gitignore`, `turbo.json`, and the overbroad `.claude/**` claim unless a failing probe
proves a write.

**[P1] 5 — prescribed Phase-5 baseline is red with no serialization.** `pnpm
verify:doc-claims` fails TODAY (committed `shipVerified: 34` vs fresh 35 — observed
across three runs spanning the 034/038 closes, including after the figure-regen commit
`7061ac1`), so `verify:workflow` fails; FR-4/FR-5 require these surfaces without naming
a prerequisite (`prd-032:403-418`). Remedy: require an all-green aggregate at
Phase-3/4 open; name the self-hosting-figure owner; forbid absorbing that edit into
PRD-032's surface.

**[P2] 6 — known adapter/template defects unaccepted and untested.** Claude commands
still open with the banner (`prompts.ts:788-801`); two conflicting review templates
persist. PRD-032 tests only existence/byte-identity (`prd-032:94-101,217-220`). Remedy:
prerequisite the fixes or add operator-owned acceptance rows (this would also bind the
otherwise-unbound `Autonomous Close: operator-gated` header).

**[P2] 7 — Memory Inputs incomplete for the dogfood risk.** Only
`turbo-cache-masks-out-of-input-reads` carries a disposition; missing:
`shipped-content-needs-a-delivery-gate`, `derive-the-requirement-from-the-consumer`,
`state-model-before-mechanism`, `runner-sentinel-blocks-cli-spawning-tests` — all
active and indexed (`_brain/INDEX.md:15-16,27,33,57`).

**[P2] 8 — architectural headlines contradict their own scope.** "Nothing here is
authored; everything is generated" is false (config values + two bootstrap pointer
lines are authored — `prd-032:228-231` vs `:128-142,172-175`); the cache-comment
attribution belongs to PRD-034 FR-4, not PRD-032 FR-3 (`:233-237`).

**[P2] 9 — Value header still fails credibility at the cutoff.** Exact 3.40; supportable
2.85 (MF 4 / UI 2 / TL 3 / AR 2 / RM 3). Expand (absorb the adapter-listing and
review-template closures) or record the cut.

### Restatement sweep — iteration 2 (mandatory pass, `a-rule-corrected-survives-where-it-is-restated`)

Stale restatements found (fix ALL in the rework, not the first instance):

1. `prd-032:249-251` — "implementation pending" for PRD-034, now Ship Verified.
2. `prd-032:245-247,292` — "PRD-031 landing later" future tense; PRD-031 landed.
3. `prd-032:116-117,158-160,210-212,407` — generic "edit a store file → `modified`";
   final PRD-034 classifies unbannered members `unattributable`.
4. `prd-032:472` — changelog still says the set comes from what `init --prompts`
   "scaffolds"; the owning FR correctly says the block is only **printed**.
5. `prd-032:233-237` — cache-boundary comment attributed to PRD-032 FR-3; it shipped
   with PRD-034's script.
6. `prd-032:324-328` — says no exception entry is written, then says the first
   exception "will be written here."
7. `prd-032:228-231` — "everything is generated" overstatement.

Swept clean: required-value counts (no live hardcode; only the dated changelog mention),
"twelve rendered protocols" (correct for the rendered-prompt subset; full plan is 21
store files / 30 generated paths), null-vs-sentinel, PRD-030 attributions,
doctor/sync/receipt absences, CI order + bundle membership claims.

### Findings — iteration 1 (Codex, independent)

**[P1] A — the dependency is the wrong deliverable.** PRD-032 assigns reconciliation
(check, doctor, sync, exceptions, wiring) to PRD-030 (`prd-032:36,146,174`); shipped
PRD-030 produced the state model only and hands the mechanism to PRD-034
(`prd-030:37,49,141`), which is Draft (7.4 ITERATE) and claims `verify-prompts`,
`check --prompts`, bundle membership and CI ordering (`prd-034:232,571`). Remedy:
PRD-034 Ship Verified becomes the hard prerequisite; FR-3/FR-4 rederive from its final
contract.

**[P1] B — seven of nine prompt values unspecified.** FR-1 names two and says "and so
on" (`prd-032:122`); the renderer refuses the whole render on any unresolved value
(`prompts.ts:572,675,687`); only `DOMAIN_CHECKS`/`ENV_NOTES` permit empty
(`PLACEHOLDERS.md:19,30`). Remedy: the exact repository-approved value for all nine,
including explicit decisions on the two empty-allowed keys.

**[P1] C — §11 is not runnable or evidentiary.** `doctor --prompts` is not a surface
(`cli.ts:588`; probe exited 1); `verify-prompts.mjs` does not exist and the bundle has
no prompts member (`verify-workflow.mjs:15`); FR-3 runs FR-2's clean-tree command, so
the hand-edit rejection it claims is never planted. Remedy: PRD-034's real interface
plus a runnable mutation fixture; whole-suite rows stay on turbo
(`runner-sentinel-blocks-cli-spawning-tests`).

**[P1] D — Conflict Surface contradicts its own Targets and live ownership.** FR-3/FR-4
target `verify-prompts.mjs` and `ci.yml`, neither claimed (`prd-032:146` vs `:341`);
PRD-034 claims both (`prd-034:571`); `turbo.json` collides with PRD-028 (`prd-028:584`)
and PRD-036 (`prd-036:232`); `AGENT_BOOTSTRAP.md` with PRD-031 (`prd-031:404`); none of
these are `sharedAppendOnly`. Remedy: drop reconciliation-owned targets behind the
prerequisite; read-only verification for `.gitignore`/`turbo.json` unless a failing
probe proves a write; serialize any `AGENT_BOOTSTRAP.md` edit behind PRD-031.

**[P1] E — no migration/rollback contract in an infra item.** Activation, `templates.prd`,
generated files outside the store, agent-entry docs — and the document goes from
Dependencies straight to Scope (`prd-032:239`). Remedy: ordered activation and exact
rollback (disable block, clear `templates.prd`, human deletes every path in the printed
generated set — the state model's terms).

**[P2] F — dogfooding inherits the Claude first-line listing defect** (banner as command
description — the measured deferral at `STATUS.md:34`; `prompts.ts:788`) with no
acceptance criterion. Gate it or accept it explicitly with a live listing check.

**[P2] G — the review-template Quorum contradiction has two authorities after install**
(store template requires Quorum; root `_docs/review-artifact.template.md:25` says
optional; `review.ts:48,59` refuses omission). Bind dogfood Phase 6 to the store
template and test the binding, or prerequisite the template fix.

**[P2] H — Memory Inputs structurally green, substantively stale**: PRD-030 attributions
that belong to PRD-034 (`prd-032:312,332`); the exact dogfood-relevant records
(`shipped-content-needs-a-delivery-gate`, `derive-the-requirement-from-the-consumer`,
`state-model-before-mechanism`, `runner-sentinel-blocks-cli-spawning-tests`) carry no
disposition. Refresh against the current chain.

**[P2] I — Value 3.40 exact but not credible at the cutoff**: the PRD's own §1 says it
changes repository configuration, "not what the package does for anyone else" —
UI 3/AR 3 unsupported; known adapter defects argue against RM 4. Supportable: 2.85
(4/2/3/2/3), below 3.40 → expand-don't-delete applies (most naturally by absorbing the
adapter/template closures dogfooding will hit) or record the cut.

### What held up (verified with citations, several by execution)

Activation mechanics exactly as shipped (defaults `prompts.enabled: false`, presence ≠
enablement, nine keys printed by the read-only `init --prompts` probe, fail-closed
render accumulating all diagnostics, wx-additive writes); the required-value set derived
from rendered consumers, not the catalogue; cursor globs config-derived; Codex adapter
writes a snippet, never `AGENTS.md`; the whole-suite floor correctly routed through
turbo; `lintPrd` five-argument probe green; §9 conforms to the closed grammar; Value
arithmetic reproduces; no hard cap trips.

---

## Scorecard

Class `infra` weights, per `packages/provegate/prompts/phase-2-readiness-scorer.md`.
Iteration 2 (iteration-1 column values live in Iteration History).

| #         | Dimension                | Weight | Score  | Notes |
| --------- | ------------------------ | ------ | ------ | ----- |
| 1         | Clarity                  | 15%    | 5.0/10 | lint-clean, but 8/10 values unspecified; FR-6 "targets" are read checks; mutation row not runnable as written |
| 2         | Completeness             | 20%    | 5.5/10 | PRD-034 architecture incorporated; rollback, exact values, adapter/template closures, red-baseline handling missing |
| 3         | Technical Depth          | 20%    | 6.5/10 | dormant activation, planned-set reconciliation, root/cache boundary all right; misses the `unattributable` arm and exact state reversal |
| 4         | Multi-Tenancy & Security | 10%    | 9.0/10 | no tenant/auth/query/payload/network/push surface |
| 5         | Scope & Testability      | 15%    | 5.0/10 | strong non-goals; decisive FR-3 mutation prose-only; two declared verification paths red for an undeclared prerequisite |
| 6         | Migration & Rollback     | 20%    | 2.0/10 | still no section, in the class weighted 20% for exactly this |
| **Total** | **Weighted**             |        | **5.20/10** | **ITERATE — Phase-1 band** |

Arithmetic: `(5.0×.15)+(5.5×.20)+(6.5×.20)+(9.0×.10)+(5.0×.15)+(2.0×.20)
= 0.75+1.10+1.30+0.90+0.75+0.40 = 5.20`.

Hard caps: security — no trip (`Deny test: none` appropriate, `prd-032:420-423`);
contract — no trip (no new payload boundary); lint — no trip (sandbox `EPERM` waiver
recorded in Quick Meta; production-shaped `lintPrd` green, orchestrator's CLI run
exit 0); method-content traceability — clear.

---

## Missing Pieces (binding on the Phase-1 rework — iteration 2)

1. The owner's exact answers for all **ten** printed required values (including
   explicit empties for `DOMAIN_CHECKS`/`ENV_NOTES` if intended, and the recorded
   `AUTONOMY_MODE` choice).
2. An ordered Migration & Rollback section in the state model's terms (capture printed
   generated set → atomic land → disable + clear `templates.prd` → human deletes the
   captured set → dormant note confirmed).
3. One runnable §11 mutation command against a **bannered** path: plant, assert
   non-zero + `modified` + exact path, restore in `finally`.
4. FR-6 targetless/read-only; drop `.gitignore`, `turbo.json`, `.claude/**` exclusive
   claims (PRD-036 owns `turbo.json` live).
5. Green-aggregate prerequisite named for the red `verify:doc-claims` baseline
   (self-hosting figure 34→35 belongs to its owner, not this PRD's surface).
6. Adapter banner-listing and review-template ambiguity: prerequisite or
   operator-owned acceptance rows.
7. Dispositions for the four missing dogfood memory records.
8. The seven named stale restatements swept — every instance, not the first.
9. Value header: expand (absorb adapter/template closures) or record the cut; 3.40 as
   declared is not supportable (2.85).

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-07-28 | 4.00  | ITERATE | First independent round. The document consumes a mechanism that shipped PRD-030 explicitly handed to Draft PRD-034; §11's first command is not a CLI surface and its mutation row proves nothing; the Conflict Surface misses its own FR targets while colliding with three live PRDs; an infra item carries no migration/rollback. The activation mechanics themselves verified correct by read-only probes. Band 4–5.9: Phase-1 rework, serialized behind PRD-034 — not another scoring round. Dimension scores: 4.0/4.0/4.0/8.0/4.0/2.0. |
| 2   | 2026-07-29 | 5.20  | ITERATE | Scored the day PRD-034 went Ship Verified; every wiring claim re-verified by execution (both CLI flags, bundle member 10, CI order, full in-memory render: 10 required values, 21 store files, 30 generated paths). Finding A closed; C/D/H partial; B/E/F/G/I open. New against the final contract: the `unattributable` arm breaks the generic mutation claim; the required-value set grew to ten; `verify:doc-claims` red on main with no serialization named; PRD-036's live `turbo.json` claim still collided with. Seven stale restatements named for the sweep. Band 4–5.9 again — but the residue is owner decisions (ten values, rollback shape, value expand-or-cut), not moved dependencies. |

---

## Verdict

**ITERATE — 5.20/10, iteration 2, scored independently by Codex.**

The chain debt is paid: PRD-034 landed and every wiring claim PRD-032 makes now holds
on main, verified by execution. What keeps this in the 4–5.9 band is specification
debt that only the owner can settle — the ten exact values, the rollback contract, an
honest Value header — plus mechanical fixes the rework can carry (the runnable
bannered-path mutation, the narrowed Conflict Surface, the seven-restatement sweep,
the four memory dispositions). The band's action is the instruction
(`score-band-prescribes-the-action`): one more Phase-1 pass, then re-score. Trajectory
4.00 → 5.20 with the blocking dependency gone; a third flat round in this band would
trigger `state-model-before-mechanism`'s cut-or-restate rule, but the residue here is
decisions, not design.
