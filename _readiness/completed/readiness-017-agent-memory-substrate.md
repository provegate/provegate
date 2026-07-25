# Readiness Assessment: PRD-017 — Agent Memory Substrate

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-017-agent-memory-substrate.md` |
| Score                  | 8.425/10 |
| Verdict                | PASS |
| Iteration              | 3 |
| Model Tier (Execution) | high |
| Model Tier (Audit)     | high |
| Scored by              | Iteration 3: independent agent (different model family from the PRD author), via owner |
| Self-scored            | no |
| Date                   | 2026-07-25 |
| PRD Lint               | passed — `gate check PRD-017` exit 0 (re-run at iteration 3) |
| State Record           | updated — PRD-017 shows `PASS · 8.425` |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | high | Score band 8–8.9. Two parser implementations must agree by construction, and the frontmatter subset has to fail loud on everything outside it — a tolerant parser is the failure mode, and tolerance is easy to write by accident. |
| Phase 6 (Audit)     | high | The audit must attack the corpus itself, not the code: a thin conformance fixture makes both parsers "agree" while proving nothing. It must also confirm the PRD changed no workflow behavior, since default-off is the whole safety argument. |

---

## Analysis

### 1. Technical Depth & Architecture

The original PRD described a coherent closed loop but combined method provenance,
configuration, two parsers, PRD artifact contracts, Phase 1–7 prompts, runner gates,
dogfood activation, doctor/find/stats CLI, and documentation in one work item. The
independent review correctly found that default-off substrate can land separately
without a half-wired gate:

- PRD-017 now owns addendum, config, typed parser, standalone verifier, conformance
  corpus, and protocol/template parity only.
- PRD-018 owns the PRD contract, Phase 1–7 flow, Phase 7 weakening/watch gates, and
  activation.
- PRD-019 owns doctor/find adoption CLI.
- Stats/retro metrics are deferred until five contract-bearing PRDs exist.

This removes the original 72-task whole-repo lock while retaining safe dependency order.

### 2. Edge Cases & Failure Modes

The independent review identified two blocking correctness issues in the retired scope:

1. Memory Outputs contained an ADR entry and `none` simultaneously, contradicting the
   proposed mutually-exclusive grammar and making weakening semantics ambiguous.
2. “Phase 7 verifier only” was ambiguous because manifest deep-merge preserves the
   default Phase 4 floor only when `phases.4` is omitted; explicit `phases.4: []`
   silently removes it.

The split drafts resolve both:

- PRD-017 now has one reasoned `none` and no declared record output.
- PRD-018 has one ADR output and no `none`.
- PRD-018 requires fresh practices manifests to omit `phases.4`.
- Root dogfood explicitly repeats the four floor commands and appends
  `verify:workflow` plus built-site `check-egress`, then wires Phase 7 brain validation.

### 3. Maintainability & DX

- One conformance corpus remains mandatory for core and standalone parsers.
- Default-off substrate prevents upgrade breakage before contract/activation work lands.
- Effectiveness metrics no longer ship before meaningful data exists.
- Each follow-up has a narrower conflict surface, verification ledger, and independent
  review boundary.

### 4. Migration & Rollback

- PRD-017 changes no workflow behavior and enables nothing.
- PRD-018 activates only after PRD-017 is Ship Verified and all commands exist.
- PRD-019 is read-only additive CLI over shipped substrate/contract.
- Historical PRDs remain untouched; no remote/data migration exists.

---

### 5. Iteration-3 independent measurement

The iteration-1 **8.25/10** belonged to the retired 10-FR/72-task scope and is not
reused. Iteration 3 scored the five-FR substrate against the live repository rather than
against the PRD's own description. Four claims were measured:

| Claim under test | Method | Result |
| ---------------- | ------ | ------ |
| Empty folded descriptions are accepted today (FR-3/FR-4 premise) | fixture record `description: >-` with no body, run through the live validator | **confirmed** — `verify:brain: PASS`. The premise is real and wider than stated: `parseFrontmatter` stores the literal `>-` and never reads the folded body, so *every* folded description in the repo is currently unvalidated, not only empty ones |
| Overlong INDEX hooks need shortening (FR-4) | measured hook text after the Markdown link across all 23 pointers | **not confirmed** — zero exceed 120; longest is 102 |
| Existing records need schema migration (FR-5) | checked every record for `**Why:**`, `**How to apply:**`, and `provenance` | **not confirmed** — 23/23 conform (20 gotcha, 3 convention) |
| ADR sections need a template change (FR-3) | compared `_brain/_templates/adr.md` against the required sections | **not confirmed** — Context / Decision / Consequences / Alternatives already present |

The premise is sound; the migration is not. Both findings move the score, in opposite
directions: the real hole justifies the work (Technical Depth), while the phantom
migration costs clarity and invites vacuous tests. Near-zero migration risk is also why
Migration & Rollback — the heaviest `infra` weight, inflated precisely because
deployment ordering is the infra failure mode — scores highest here.

---

## Scorecard

Class `infra` weights, per `prompts/phase-2-readiness-scorer.md`.

| #         | Dimension                | Weight | Score       | Notes |
| --------- | ------------------------ | ------ | ----------- | ----- |
| 1         | Clarity                  | 15%    | 8.0/10      | All five FRs carry concrete Targets and one runnable §11 row each; DO NOT list is specific. Docked for FR-4/FR-5 describing a migration that measurement shows is empty — an agent will hunt for work that does not exist, or "migrate" conforming seed records and trip pack-drift on both sides for nothing |
| 2         | Completeness             | 20%    | 8.0/10      | Stories, Gherkin, non-goals, and measurable metrics all present; edge cases named (unsupported YAML, path escape, duplicate pointer, supersession, private/public). Two gaps: the pack-drift reconcile obligation created by editing paired files is never stated, and `verifyCommand`/`retroAfterCompleted` ship validated but unconsumed until PRD-018 without that window being acknowledged |
| 3         | Technical Depth          | 20%    | 8.5/10      | The real architectural risk — two parser implementations drifting — is answered correctly by a shared corpus rather than runtime imports, which the standalone verifier cannot have. Unsupported YAML fails loud instead of degrading. Docked because the corpus has no stated coverage contract, so "both parsers agree" could be satisfied by a thin fixture |
| 4         | Multi-Tenancy & Security | 10%    | 8.5/10      | No tenant surface. Path containment (absolute / `..` / cross-root / symlink), public-versus-private index separation, and command-safety for `verifyCommand` are all specified. Docked slightly because command safety is validated here but not executed until PRD-018, so this PRD cannot prove the check bites |
| 5         | Scope & Testability      | 15%    | 8.5/10      | This is what the split bought: five FRs, default-off, no workflow behavior change, non-goals that name which PRD owns each excluded piece. Two success metrics are now known-vacuous (see the measurement table); the rest are checkable, and two were checked |
| 6         | Migration & Rollback     | 20%    | 9.0/10      | Enables nothing: no root config, no practices activation, no gate change. Rollback is a revert with no state, cache, or remote to clean. Deployment order 017 → 018 → 019 is explicit with activation last. Measured migration cost is ≈0, so the realistic hazard — existing records breaking — is near-zero. Docked only for the unstated ledger-reconcile procedure |
| **Total** | **Weighted**             |        | **8.425/10** | **PASS** |

Weighted sum:
`0.15×8.0 + 0.20×8.0 + 0.20×8.5 + 0.10×8.5 + 0.15×8.5 + 0.20×9.0`
`= 1.20 + 1.60 + 1.70 + 0.85 + 1.275 + 1.80 = 8.425`.

Hard caps — none triggered:

- **Security cap:** not triggered. No protected route, endpoint, or query path is added
  or touched; path containment is a filesystem invariant, not an auth surface.
- **Contract cap:** not triggered. No client→server payload or external schema.
- **Lint cap:** not triggered — `gate check PRD-017` exits 0 (re-run at iteration 3).
- **ProveGate method caps:** no runtime dependency, no push code path, and method
  content traces to the FR-1 addendum, which is the first and blocking task.

---

## Missing Pieces (watch items — notes, not blockers)

Band 8–8.9 is "proceed with minor notes flagged as watch items". W10–W13 bind Phase 3
task generation and Phase 6 audit; none of them blocks Phase 4 entry.

1. **W10 — no phantom migration.** FR-4's hook shortening and FR-5's record migration
   have zero current violations (measured: 0 hooks over 120, longest 102; 23/23 records
   carry `**Why:**`, `**How to apply:**`, and `provenance`; the ADR template already
   holds all four required sections). Rewrite both as forward-only constraints and prove
   them with mutation tests — a 121-character hook, a record missing `**Why:**` — never
   with a migration step. Do not edit a conforming record: each needless seed edit forces
   a paired pack change and a ledger reconcile for no gain.
2. **W11 — name the reconcile obligation.** FR-4/FR-5 edit both sides of pack-paired
   files, which is exactly what `verify:pack-drift` refuses. The PRD must state the
   procedure: change both sides, run
   `node scripts/verify/verify-pack-drift.mjs --reconcile`, and read its per-pair
   "accepted" output. Without it Phase 5 hits a red gate with no documented escape.
3. **W12 — corpus coverage contract.** Define the minimum matrix the conformance corpus
   must cover (which field × which failure mode), so cross-parser agreement cannot be
   satisfied by a thin fixture. This is the single highest-leverage Phase 6 attack.
4. **W13 — acknowledge the dead-config window.** `memory.verifyCommand` and
   `retroAfterCompleted` are validated but consumed by nobody until PRD-018. Either state
   that explicitly as an accepted consequence, or keep the fields unexported until 018.

Iteration-2 items are now closed: the independent re-score is this document, and task
generation may begin once the owner authorizes Phase 3.

---

## Iteration History

| # | Date       | Score | Verdict | Key Changes |
| - | ---------- | ----- | ------- | ----------- |
| 1 | 2026-07-25 | 8.25  | PASS    | Self-scored original 10-FR closed-loop scope |
| 2 | 2026-07-25 | stale | ITERATE | Independent review found output-grammar and manifest ambiguity; owner approved three-PRD split and stats deferral |
| 3 | 2026-07-25 | 8.425 | PASS    | Independent class-weighted re-score of the five-FR substrate. Measured four PRD claims against the live repo: the folded-description hole is real (and wider than stated), while the hook/record/ADR migrations do not exist. Watch items W10–W13 replace the retired iteration-2 blockers |

---

## Project-Specific Checklist

- [x] Original critical grammar conflict removed from all three draft PRDs.
- [x] Fresh practices versus root manifest Phase 4 semantics are explicit.
- [x] Stats/retro feature recorded on STATUS with owner and review date.
- [x] No implementation or runtime dependency added during rescope.
- [x] Owner approved the revised PRD-017/018/019 Phase 1 scopes.
- [x] `gate check PRD-017`, PRD-018, and PRD-019 pass after the split.
- [x] Revised PRD-017 independently rescored (iteration 3, 8.425, PASS).
- [x] PRD claims measured against the live repository, not accepted as written.
- [ ] PRD-018 and PRD-019 independently pass their own Phase 1–3 gates.

---

## Verdict

**PASS — 8.425/10, iteration 3.** Scored independently: a different model family from the
PRD author, with no authoring involvement in any of the three split drafts.

The substrate is the right first slice. It enables nothing, so a mistake here cannot make
the repository red or change a single gate; and the hole it closes is real — the live
validator today accepts a record whose folded description is empty, and in fact never
reads a folded description at all. Rollback is a revert.

Four watch items (W10–W13) bind Phase 3 and Phase 6. The most valuable is W12: the
conformance corpus is the entire defence against the two parsers drifting, and a thin
corpus would make them "agree" while proving nothing. The most likely to waste effort is
W10 — two FRs describe a migration that measurement shows does not exist, and acting on
that description would edit conforming seed records for nothing.

Phase 4 is unblocked once the owner authorizes Phase 3 task generation.
