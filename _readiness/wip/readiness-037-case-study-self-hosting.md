# Readiness Assessment: PRD-037 — Case Study, Part Two: the Tool's Own Ledger

**PASS — 8.40/10.** The PRD is executable without human clarification. The figure pair is independently derivable, and the mode, state-validation, sentinel, mutation, and verification contracts are now sufficiently deterministic. Three stale restatements remain as PASS-band watch items; the owning FR and verification row resolve each unambiguously.

## Quick Meta

| Field | Value |
| --- | --- |
| Score | 8.40/10 |
| Verdict | PASS |
| Iteration | 5 |
| PRD Class | feature |
| Scored by | Codex — fresh independent session |
| Self-scored | no |
| Date | 2026-07-28 |
| Model Tier (Execution) | high |
| Model Tier (Audit) | high |
| PRD Lint | waived/green — `node packages/provegate/dist/cli.js check PRD-037` failed with the documented sandbox `EPERM` opening `_state/prds.json.35604.tmp`; the read-only `lintPrd` equivalent returned `{"ok":true,"issues":[]}`; relying on the orchestrating session’s out-of-sandbox green run on 2026-07-28 |
| State Record | unchanged — analysis-only rescore; `_state/prds.json` records 7.10 ITERATE from iteration 4 |
| Repository Changes | none |

## Iteration 5 — Closure Review

| Rework piece | Status | Verification |
| --- | --- | --- |
| 1. State-only figure source | **CLOSED; wording watch** | §7 now states that `_state/prds.json` is “the script's ONLY figure source” and that flagged modes read MDX “solely for sentinel validation and region comparison, never as a figure input” (`:216-220`). FR-1 agrees: its “FIGURE source is `_state/prds.json` and nothing else” (`:119-123`). The introduction still says state is the script’s “only input” (`:43-45`), which is operationally false but overridden by the exact matrix and §7. |
| 2. Canonical invocation matrix | **CLOSED; terminology watch** | FR-2 accepts exactly one mode flag; zero, invalid, or combined flags produce usage on stderr, exit 2, and read nothing (`:136-144`). The table fixes each class’s reads, stdout, stderr, mutation, success, and sentinel failure. “Only the three flagged modes validate sentinels” is explicit (`:146`). The fixture list’s “all four modes” (`:128`) should say three flagged modes plus the invalid-invocation class. |
| 3. Consumed-state schema and `closeModes` | **CLOSED** | FR-1 requires a root object with a `records` array and string `prd`/`status` fields; the first violation by array index exits 1 naming index and field (`:108`). Known modes emit in fixed order; unknown or missing `autonomousClose` values become successful `unclassified {count, ids}`, IDs sorted, never folded into known modes (`:108`). |
| 4. Consistency sweep | **CLOSED for implementation; acceptance wording watch** | Normative §12 is de-numbered; the only two `5.1s` occurrences are dated changelog history and exempt. Generic read-only claims are now mode-scoped. §11 uses the harness source-token assertion, not a docs build (`:308-312`). FR-2 gives the exact H2 span, `[0-9]` predicate outside the sentinel pair, and source token `[#self-hosting-ledger]` (`:148-157`). §6’s older “digit absent from FR-1’s output” wording (`:199-200`) is weaker, but FR-2 and the harness row identify the executable predicate. |
| 5. Harness scope declarations | **CLOSED** | `scripts/verify/derive-figures.test-cases.mjs` appears in FR-1 Targets (`:124-131`), Implementation Scope (`:241-244`), Conflict Surface (`:288-293`), and runnable §11 rows (`:309-310`). |

### Independent Derivability Probe

The current `_state/prds.json` parses as a root object with a `records` array containing 39 records. Every record has string `prd` and `status`; no consumed-schema violation was found.

| Figure | Current derivation | Assessment |
| --- | ---: | --- |
| `shipVerified` | **31** records where `status === "Ship Verified"` | Derivable |
| `closeModes.operator-gated` | **29** | Derivable |
| `closeModes.eligible` | **2** (`PRD-015`, `PRD-035`) | Derivable |
| `closeModes.unclassified` | **0**, IDs `[]` | Deterministic success case |

The change from iteration 4’s 30/28/2 snapshot demonstrates the intended property: newly closed work updates the figures without changing the document’s contract.

### Final Adversarial Sweep

The cut scorer-session, review-aggregate, resumed-stop, and readiness-iteration figures remain absent from generated-number promises. Their narrative treatment is consistently unnumbered.

The explicit heading syntax is supported by the installed Fumadocs remark-heading pipeline, whose parser recognizes terminal `[#slug]` suffixes. The source-token assertion is therefore anchored to a real repository mechanism.

No runtime dependency, network call, telemetry, push path, package method-content change, tenant surface, protected route, payload contract, schema migration, or deployment ordering requirement is introduced.

## Scorecard

| Dimension | Weight | Score | Weighted | Notes |
| --- | ---: | ---: | ---: | --- |
| Clarity | 15% | 7.8/10 | 1.170 | Owning FRs and the canonical matrix are executable; three stale phrases modestly reduce consistency |
| Completeness | 20% | 8.2/10 | State grammar, malformed input, mode dispatch, sentinels, drift, byte preservation, and unknown close modes are covered |
| Technical Depth | 25% | 8.4/10 | Sound state-derived projection, deterministic aggregation, bounded mutation, source-level heading assertion, and first-line drift behavior |
| Multi-Tenancy & Security | 20% | 8.8/10 | No tenant, auth, secret, network, telemetry, dependency, push, or protected-surface exposure |
| Scope & Testability | 10% | 8.4/10 | Narrow scope, runnable rows, full harness placement, and adversarial fixtures; minor wording residue remains |
| Migration & Rollback | 10% | 8.9/10 | No migration; plain revert is credible, and `--write` is bounded to bytes strictly inside one validated region |
| **Total** | **100%** |  | **8.400/10** | **PASS** |

Hard caps: none.

Clarity cap: not triggered. Every FR has concrete Targets, §11 maps every FR to a runnable command, DO NOT exists, Open Questions is empty, and no unresolved placeholder remains.

## Watch Items

1. Narrow the introduction’s “`_state/prds.json` — its only input” to “its only figure source,” matching FR-1 and §7.

2. Replace “all four modes” in the fixture catalogue with “all three flagged modes plus invalid invocation classes.”

3. Make §6 and the FR-4 §11 note repeat FR-2’s exact rule: `[0-9]` anywhere in the `self-hosting-ledger` H2 span outside the sentinel pair fails. This removes the weaker “absent from FR-1 output” and “unsourced digit” formulations.

These are consistency repairs, not missing design decisions. FR-2 and the harness verification row already tell an implementing agent which behavior to implement.

## Iteration History

| Date | Iteration | Score | Verdict | Notes |
| --- | ---: | ---: | --- | --- |
| 2026-07-28 | 1 | 5.30/10 | ITERATE | Underivable scorer/review/stop figures, incorrect existing-lint account, and unresolved MDX embedding architecture |
| 2026-07-28 | 2 | 6.28/10 | ITERATE | Sentinel projection improved; corpus probe cut readiness iterations and exposed stale promises, digit conflict, missing lifecycle behavior, and fixture gaps |
| 2026-07-28 | 3 | 6.40/10 | ITERATE | Eight residual closures requested: state-only inputs, de-numbering, complete modes, narrowed read-only language, close-mode diagnostics, fixture harness, source heading assertion, and dated sequencing |
| 2026-07-28 | 4 | 7.10/10 | ITERATE | Figure pair re-derived successfully; fixture and sequencing closures hold, but stale normative text leaves the input, mode, mutation, close-mode, digit, and heading contracts contradictory |
| 2026-07-28 | 5 | 8.40/10 | PASS | Canonical mode and state contracts, deterministic unclassified output, exact digit span, source heading token, and harness scope are present; independent probe derives 31/29/2 with zero unclassified; three non-blocking restatement watches remain |

## Verdict

**PASS — 8.40/10.**

The fourth rework closes the implementation-changing gaps. An agent can now determine accepted invocations, every read and mutation boundary, failure statuses, sentinel behavior, consumed-state validation order, close-mode aggregation, generated-region comparison, and the exact source-level digit and heading checks without inventing architecture.

The remaining contradictions are real and should be cleaned up, especially after the changelog’s prior false closure claims. They do not justify another ITERATE verdict because the owning FR and runnable harness row already provide a single executable answer for each.

## Model Tier Recommendation

| Phase | Tier | Rationale |
| --- | --- | --- |
| Implementation | high | The work is small but correctness depends on byte-preserving replacement, fail-closed parsing, deterministic diagnostics, and fixture isolation across several CLI modes |
| Audit | high | Audit should adversarially compare every restatement against FR-2 and verify mutation boundaries, sentinel failures, malformed-state ordering, and verifier wiring |


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 5 transcribed
> verbatim from the fifth fresh independent Codex session of this cycle. PASS 8.40 —
> "consistency repairs, not missing design decisions"; the three watch items were
> applied as post-PASS precision edits per the scorer's own prescriptions, recorded
> in the PRD changelog. Trajectory: 5.30 → 6.28 → 6.40 → 7.10 → 8.40. Lint EPERM is
> the documented sandbox artifact; out-of-sandbox green the same day.
