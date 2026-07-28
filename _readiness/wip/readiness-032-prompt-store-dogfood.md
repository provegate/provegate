# Readiness Assessment: PRD-032 — Prompt-Store Dogfood

> **Iteration 1 (Codex, independent) — 4.00/10, ITERATE, and the band matters more than
> the decimal: 4–5.9 is "Major rework needed. Return to Phase 1"
> (`score-band-prescribes-the-action`).** Orchestration disclosure: the orchestrating
> session verified every load-bearing citation against source (the doctor flag surface,
> PRD-030's mechanism handoff, the §11 rows) and authored no verdicts; Codex is the
> scorer and did not write the PRD.
>
> **The headline: the document is written against an obsolete chain.** It assigns the
> reconciliation mechanism (verify-prompts, doctor --prompts, exceptions, bundle wiring)
> to PRD-030 — but shipped PRD-030 produced only the state model and says in its own
> §1 that *"the mechanism is PRD-034's"* (`prd-030:49`). PRD-034 is Draft at 7.4
> ITERATE. Consequences cascade: §11's first row runs `doctor --prompts`, a flag the
> CLI does not accept (`cli.ts:588` — `--memory`/`--json` only; the scorer's probe
> exited 1); FR-2/FR-3 run a `verify-prompts.mjs` that does not exist; FR-3's mutation
> claim is never exercised (same clean-tree command as FR-2); and the Conflict Surface
> both misses its own FR targets (`verify-prompts.mjs`, `ci.yml` — PRD-034 claims both)
> and collides with PRD-028/036 (`turbo.json`) and PRD-031 (`AGENT_BOOTSTRAP.md`).
> **No migration/rollback section at all in an infra-class item** (weight 20). Value
> 3.40 arithmetic is exact but judged 2.85-supportable (4/2/3/2/3) — below threshold,
> expand-or-cut applies. What held: the live activation mechanics are correctly
> understood (fail-closed render, nine keys, wx-additive, presence≠enablement — all
> re-probed read-only), §9 conforms to PRD-028's closed grammar, no hard cap trips.
> **Next step is Phase-1 rework serialized behind PRD-034, not another scoring round.**

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-032-prompt-store-dogfood.md`    |
| Score                  | 4.00/10                                        |
| Verdict                | ITERATE — band 4–5.9: Phase-1 rework. Written against an obsolete chain: the mechanism it consumes is unshipped PRD-034's, its first §11 command is not a CLI surface, its mutation row proves nothing, its Conflict Surface misses its own targets while colliding with three live PRDs, and an infra item ships no migration/rollback contract |
| Iteration              | 1                                              |
| Model Tier (Execution) | do not assign — fix the PRD first              |
| Model Tier (Audit)     | — (assign on a PASS)                           |
| Scored by              | **Codex (gpt-5.x) via the `/codex` skill — independent, different model family, did not write the PRD; orchestrated by a session that authored no verdicts and re-verified the load-bearing citations** |
| Self-scored            | no                                             |
| Date                   | 2026-07-28                                     |
| PRD Lint               | passed — Codex ran the five-argument production-shaped `lintPrd(config, manifest, text, root, 32)` directly → green; the orchestrator's `gate check PRD-032` exit 0 |
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

| #         | Dimension                | Weight | Score  | Notes |
| --------- | ------------------------ | ------ | ------ | ----- |
| 1         | Clarity                  | 15%    | 4.0/10 | seven of nine values unspecified; targets vs surface contradiction |
| 2         | Completeness             | 20%    | 4.0/10 | the mechanism it consumes is another Draft PRD's; no rollback |
| 3         | Technical Depth          | 20%    | 4.0/10 | activation mechanics right; the chain and verification layer wrong |
| 4         | Multi-Tenancy & Security | 10%    | 8.0/10 | no tenant/auth/data surface |
| 5         | Scope & Testability      | 15%    | 4.0/10 | first §11 command not a surface; mutation claim unexercised |
| 6         | Migration & Rollback     | 20%    | 2.0/10 | absent entirely, in the class weighted 20% for exactly this |
| **Total** | **Weighted**             |        | **4.00/10** | **ITERATE — Phase-1 band** |

Hard caps: security, contract, lint, method-content traceability — all clear.

---

## Missing Pieces (binding on the Phase-1 rework)

1. PRD-034 Ship Verified as the hard prerequisite; rederive FR-3/FR-4 from its final
   contract and drop every PRD-030-as-mechanism reference.
2. Exact approved answers for all nine prompt values.
3. §11 rebuilt on the shipped reconciliation interface plus a real mutation fixture.
4. Conflict Surface reconciled with PRD-028/031/034/036; read-only stance on
   `turbo.json`/`.gitignore` unless a probe proves a write.
5. The Claude first-line listing defect gated or explicitly accepted.
6. One canonical review template, bound and tested.
7. Ordered activation + full rollback section.
8. Memory Inputs/Outputs refreshed against the current chain.
9. Value re-scored honestly; expand-or-cut per the threshold rule.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-07-28 | 4.00  | ITERATE | First independent round. The document consumes a mechanism that shipped PRD-030 explicitly handed to Draft PRD-034; §11's first command is not a CLI surface and its mutation row proves nothing; the Conflict Surface misses its own FR targets while colliding with three live PRDs; an infra item carries no migration/rollback. The activation mechanics themselves verified correct by read-only probes. Band 4–5.9: Phase-1 rework, serialized behind PRD-034 — not another scoring round. |

---

## Verdict

**ITERATE — 4.00/10, iteration 1, scored independently by Codex.**

The idea is right and its mechanics are correctly understood; the document is simply
written against a chain that moved underneath it — PRD-030 narrowed to the state model
and the mechanism went to PRD-034, which has not shipped. The band's action is the
instruction (`score-band-prescribes-the-action`): return to Phase 1, re-found on
PRD-034's final contract once it lands, and bring the nine values, the rollback section
and an honest Value with it.
