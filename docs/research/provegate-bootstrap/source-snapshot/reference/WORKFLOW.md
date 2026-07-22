# WORKFLOW.md — The 7-Phase Gated PRD Workflow

> **Purpose**: This document defines the mandatory development cycle for all feature work. Every AI agent must follow this protocol. No exceptions.
> **Detailed agent prompts**: `docs/ai-context/prompts/` — phase-specific activation protocols.

---

## Overview

Every feature, enhancement, or significant change goes through seven phases (PRD-248 split Testing and Learning into first-class, gated phases):

```
Phase 1:  PRD Drafting        → Define WHAT and WHY            (human-approved)
Phase 2:  Readiness Scoring   → Senior Staff Engineer stress test (PASS verdict)
Phase 3:  Task Generation     → Atomic implementation plan      (human "Go")
Phase 4:  Implementation      → Write the behavior              ┐
Phase 5:  Testing             → Execute every §11 command, deny tests │ autonomous
Phase 6:  Final Auditing      → Independent adversarial review  │ (gated)
Phase 7:  Learning            → Capture durable knowledge       ┘
→ Merge to local development   (autonomous, all gates green)
→ Cleanup (worktree/lock/_STATUS)
→ Push to remote               (HUMAN — never automated)
```

### Mapping from the old 4-phase model

| Old        | New     | Change                                                  |
| ---------- | ------- | ------------------------------------------------------- |
| Phase 1    | Phase 1 | Renamed PRD Generation → PRD Drafting                   |
| Phase 2    | Phase 2 | Same                                                    |
| Phase 2b   | Phase 3 | Promoted to first-class                                 |
| Phase 3    | Phase 4 | Implementation, minus the full test gate                |
| (in 3 + 4) | Phase 5 | **New** — Testing split out, gated on executed §11      |
| Phase 4    | Phase 6 | Final Auditing (independent review + executed evidence) |
| (in 4)     | Phase 7 | **New** — Learning promoted from a Phase-4 sub-step     |

### Autonomy cut (PRD-248)

Phases 1–3 keep their human gates (PRD approval, "Go"). Phases 4–7 plus the **local** `development` merge and cleanup run autonomously via the deterministic orchestration runner (`scripts/prd-autorun.mjs` + `prompts/orchestration-runner.md`). The runner **never pushes** — push to remote (which triggers CI/deploy) is always the human's decision, made from the handoff card the runner prints.

Autonomy is safe only because each phase boundary is a **machine-checkable gate** (a `verify:*` exit code or an independent reviewer verdict — not the implementing agent's own judgment). If any gate fails, the runner stops and hands back to the human with the worktree intact.

| Phase / step     | Gate (machine-checkable)                                                                               | On fail        |
| ---------------- | ------------------------------------------------------------------------------------------------------ | -------------- |
| 4 Implementation | `check-types` + `lint` + `build` + `verify:affected-tests` + **class-default** gates (PRD-249)         | STOP           |
| 5 Testing        | every PRD §11 FR command exits 0 (real env); `verify:prd-ready` dry-runs §11 safety at Phase 2         | STOP           |
| 6 Final Auditing | independent-review ledger `passed` + **structured review artifact** (PRD≥249); `verify:workflow` clean | STOP           |
| 7 Learning       | `verify:durable-artifacts` (PRD-scoped); memory-drift + doc-bloat via Phase 6 `verify:workflow`        | STOP           |
| → Merge          | operator rows = 0 **or** valid `_state/acceptances.json` entry; local `development` clean              | STOP           |
| → Cleanup        | post-merge `check-types` + `build` → `prd:stop`                                                        | leave worktree |
| → Push           | —                                                                                                      | **human only** |

Ordering invariants: **Learning (7) runs before the merge** (durable docs land in the same merge); **cleanup runs after the merge is verified** (a failed merge must not destroy the worktree).

### Class-default gates (PRD-249)

`prd:autorun` merges **PRD Class** with the diff to auto-run extra gates in Phase 4 (authors need not duplicate them in §11 unless they want explicit evidence rows):

| PRD Class                      | Auto Phase-4 gates (when diff matches)                                             |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| All (with tests)               | `pnpm verify:affected-tests -- --retry=2` on touched packages with a `test` script |
| `infra`                        | `pnpm verify:gates-wired`                                                          |
| `feature` / `hotfix` + UI apps | `pnpm verify:rds-imports`                                                          |
| `feature` + `apps/backend/`    | `pnpm verify:permission-guard-coverage`                                            |

§11 commands are still required per FR; `verify:prd-ready` (Phase 2) **dry-runs §11 safety** with the same filter `prd:autorun` uses — unsafe commands fail readiness before execution.

### Review artifact schema (PRD ≥ 249)

Phase 6 review files (`_docs/reviews/review-XXX-*.md`) must include a metadata block:

`PRD`, `Verdict` (pass|fail), `Reviewer`, `Base SHA`, `Critical` (numeric), `Quorum`. **`Verdict: pass` requires `Critical: 0`.** Template: `_docs/reviews/_TEMPLATE.md`. Checked by `pnpm verify:review-artifact` and `prd:autorun` Phase 6.

### Gate metrics

Each `prd:autorun` gate appends one JSON line to `_state/prd-metrics.jsonl` on the **main checkout** (gitignored, survives worktree cleanup). Inspect: `pnpm prd:metrics tail --n=30` or `pnpm prd:metrics tail PRD-249`. Manual flush from a worktree: `pnpm prd:metrics sync`. Use for flake/rework tuning — not a ship gate.

**Locks** also live on the main checkout (`_state/locks/`, gitignored). `pnpm prd:locks sync` migrates worktree-local lock files; `prd:stop` and `prd:autorun` call this automatically.

**Resume:** `pnpm prd:autorun PRD-XXX --from-phase=5` skips gates before Phase 5; `--from-phase=merge` skips straight to pre-merge archive + local merge (after gates already passed).

**Archive:** Before merge, `prd:autorun` moves `wip/` artifacts to `completed/`, writes a summary stub if missing, runs `state:sync` + wiki ship-log append, and commits on the feat branch. Manual: `pnpm prd:archive PRD-XXX`.

**Defer:** When a PRD is shelved mid-flight (a Phase-4 recon invalidates the scored approach, or the work re-scopes to a future cycle), `pnpm prd:defer PRD-XXX` moves its `prd`/`readiness`/`tasks` artifacts `wip/` → `deferred/`, sets `Status: Deferred`, and runs `state:sync`. This keeps the active `wip/` queue honest while preserving the re-open context (record it as a `⚠ DEFERRED` note + re-open checklist in the PRD). A `Deferred` PRD stays tracked in `_state/prds.json` (state `deferred`) but is quiet to `verify:prd-state` / `verify:prd-ready`. **Re-open:** move the three artifacts back to `wip/`, reset `Status`, then `pnpm prd:start PRD-XXX`.

### Operator acceptances (structured handoff)

Operator-owned task rows block autonomous merge unless `_state/acceptances.json` has a valid owner-gated entry (`pnpm prd:accept PRD-XXX …`). This is separate from `Autonomous Close: eligible` — eligible PRDs must have **zero** operator rows; acceptances waive rows on `operator-gated` PRDs when the owner explicitly records acceptance.

### Workflow State Control Plane

The durable lifecycle SSOT is `_state/prds.json`, generated from PRD artifacts by `pnpm state:sync`. Agents should query it through `pnpm state:index`, `pnpm state:active`, `pnpm state:next`, or `pnpm state:prd -- PRD-XXX` instead of reading the full JSON file.
Markdown remains the human-facing interface, but agents and CI must verify it against state:

- `_state/prds.json` — PRD number, slug, artifact paths, status, readiness score, task counts, operator handoff count
- `_state/locks/*.json` — runtime agent locks on the **main checkout** (ignored by git; schema in `_state/schema/agent-lock.schema.json`)
- `_STATUS.md` — short human board only; do not use it as the only source of truth
- `docs/ai-context/wiki/*` and Serena memories — derived durable memory updated after Phase 4

Run `pnpm verify:workflow` after workflow/meta changes. It wraps PRD state, lock, status-sync (lock ↔ `_STATUS.md`), memory drift, and doc-bloat checks.

To claim a PRD for execution use `pnpm prd:start PRD-XXX` (creates worktree under `.worktrees/`, lock under `_state/locks/`, row in `_STATUS.md`); `pnpm prd:stop PRD-XXX` reverses all three. See Phase 3 → Cross-Agent Conflict Check for the full flow.

### Status Model

PRD status separates implementation completion from ship readiness:

| Status                  | Meaning                                              | Exit Criteria                                                 |
| ----------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| `Approved`              | PRD passed readiness and is ready for task execution | `PASS` verdict (≥8 + hard caps), tasks generated              |
| `In Progress`           | Phase 3 implementation is active                     | Active agent registered, task file updated as work proceeds   |
| `Code Complete`         | Agent-finishable code work is done                   | Required code tasks complete, agent-run verification recorded |
| `Operator Verification` | Human/runtime/staging checks remain                  | Verification Ledger has `operator` or `blocked` rows          |
| `Ship Verified`         | Phase 6 audit passed with evidence                   | No required gates unresolved; deferrals triaged               |
| `Archived`              | Artifacts are ready to move to `completed/`          | Summary created and memory sync done                          |
| `Blocked`               | Execution cannot proceed safely                      | Blocker documented with resumption condition                  |
| `Deferred`              | Shelved mid-flight; artifacts in `deferred/`         | `pnpm prd:defer`; re-open context recorded; quiet to gates    |

`[x]` in task files means "completed as written." It must not mean "deferred," "operator-owned," or "covered later." Operator-owned work stays unchecked and is recorded in the task file's `Operator Handoff` section.

**Operator Acceptance (2026-06-10):** a PRD may reach `Ship Verified` with operator-owned checks accepted-but-not-run **only** when the owner's decision is recorded as PRD meta: `> **Operator Acceptance**: <who> <date> — <what was accepted>`. This waives the unchecked-task / operator-handoff strictness in `verify:prd-state` for that PRD. Without it, `Ship Verified` with open operator rows fails state verification.

`verify:prd-state` enforces the meta mechanically (2026-06-11): the value must parse as `<owner> <YYYY-MM-DD> — <what>` with an allowlisted owner (SSOT: `scripts/allowlists/acceptance-owners.json`, shared with `prd:accept` — PRD-418); a malformed or non-allowlisted line does **not** waive the gates and is itself a state violation. Operator Acceptance is an owner decision — agents must never add this line on their own initiative; ask the user and record who decided.

### Deferral Policy

Deferrals are allowed but they expire. Enforced by `pnpm verify:deferred` (part of `verify:workflow` / `ship:pre`, and of the CI `workflow-state` job):

1. Every deferred or follow-up item lands as a row in `_STATUS.md` ("Bekleyen follow-ups" or "Deferred") with **Sahip** (owner), **Vade** (expiry, `YYYY-MM-DD`), and **Yenileme** (renewal counter, starts at `0`).
2. An overdue row fails the gate: renew the date with a justification in the Not column **and increment Yenileme**, or convert the item to a PRD and delete the row.
3. A row may be renewed once; on the second renewal it must become a PRD. Mechanically enforced: `Yenileme > 1` fails the gate.
4. Combined cap: **15 open rows** across both tables. At the cap, no new deferral may be added until one is closed. **Cap-full procedure:** convert the oldest (or lowest-value) row to a PRD and delete it, _then_ add the new row — never skip recording a deferral because the cap is full, and never check `[x]` on work that was actually deferred. The gate warns from 12 rows (80%).
5. Spec tasks, manual ACs, and tests are not silently deferrable: a deferred test/AC must appear as a row here — a `.skip` stub in code without a matching row is a gate violation.

### Visual Flow

```
┌──────────────────────────────────────────────────────────────┐
│  1. PRD DRAFTING (insan onaylı)                             │
│  → Agent: Clarifying questions → PRD → _prds/wip/...         │
│  ⛔ IMPLEMENT ETME — önce Phase 2                            │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  2. READINESS SCORING (PASS verdict: ≥8 + hard caps)        │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  3. TASK GENERATION (insan "Go")                             │
│  → tasks-XXX-{name}.md                                       │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  4–7 OTONOM (prd:start worktree + orchestration-runner)      │
│  4 Implementation → check-types + lint + build               │
│  5 Testing        → her PRD §11 komutu exit 0                  │
│  6 Final Auditing → reviewer panel + verify:workflow           │
│  7 Learning       → verify:durable-artifacts (PRD-scoped)     │
│  → prd:autorun: archive wip→completed, lokal development merge + prd:stop   │
│  → Handoff card → İNSAN push                                 │
└──────────────────────────────────────────────────────────────┘
```

### Prompt Templates

Each phase has a detailed agent activation protocol:

| Phase     | Prompt Template                                               | Purpose                                             |
| --------- | ------------------------------------------------------------- | --------------------------------------------------- |
| 1         | `docs/ai-context/prompts/phase-1-prd-generator.md`            | PRD creation with Gate Contract fields              |
| 2         | `docs/ai-context/prompts/phase-2-readiness-scorer.md`         | Technical stress test and scoring                   |
| 3         | `docs/ai-context/prompts/phase-3-task-generator.md`           | Task list generation from scored PRD                |
| 4         | `docs/ai-context/prompts/phase-4-implementation.md`           | Implementation with quality standards               |
| 4 (start) | `docs/ai-context/prompts/phase-4-implementation-bootstrap.md` | Artifact paths + paste message to begin Phase 4     |
| 4 (Codex) | `docs/ai-context/prompts/codex-phase-4-starter.md`            | PRD preflight + Codex paste prompt                  |
| 5         | `docs/ai-context/prompts/phase-5-testing.md`                  | Execute §11 commands, adversarial tests             |
| 6         | `docs/ai-context/prompts/phase-6-final-auditing.md`           | Independent review + spec audit                     |
| 7         | `docs/ai-context/prompts/phase-7-learning.md`                 | Durable artifacts + wiki ingest                     |
| —         | `docs/ai-context/prompts/orchestration-runner.md`             | Agent driver for Phases 4–7 + `prd:autorun` pairing |

---

## PRD Class — pick before Phase 1

Every PRD declares a class via the header `> **PRD Class**: <class>`. The class branches the workflow's costs to match the work shape. Promoted from ad-hoc waiver to first-class field in 2026-05-24 after PRD-193's lessons-learned roll-up (see `docs/ai-context/GSTACK_INTEGRATION.md` §Lessons).

| Class            | What it covers                                           | Phase 2 dims                                            | Phase 3 skeleton                                                  |
| ---------------- | -------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| `feature`        | New user surface, schema change, RBAC, cross-module work | 6-dim (15/20/25/20/10/10)                               | Database → Backend → API → Events → FE → Permissions → QA         |
| `test-hardening` | Single-test / test-infra fix; no production code changes | 4-dim, Multi-Tenancy + Migration N/A; 25/30/33/0/12/0   | Pre-flight → Diagnostic → Fix → Audit → Doc → Gate → Phase 4 prep |
| `hotfix`         | Production bug fix, bounded blast radius                 | 5-dim, Migration N/A; 25/25/30/10/10/0                  | Pre-flight → Repro → Fix → Verify → Doc → Gate                    |
| `infra`          | Workflow / tooling / CI / deploy change                  | 6-dim with Migration inflated to 20%; 15/20/20/10/15/20 | Feature skeleton + explicit Migration & Rollback Plan parent      |

Pick honestly. The structural failure mode is forcing `feature` on a 1h test fix (over-engineers) or forcing `test-hardening` on a schema change (under-engineers). When unsure, default to `feature` — over-engineering is the safer error.

`verify:prd-ready` reads the class from the header and skips the project-wide `OrgScopedRepository` / `"owner"` / `PERMISSION_MATRIX` DO NOT-boilerplate requirement for `test-hardening` only (no production code by definition). `hotfix` lost this exemption from PRD-199: a hotfix touches production code by definition, and the Phase 2 weight table already keeps MT&S scored for it. From PRD-199 the lint also enforces the calibration hard caps mechanically: a `feature`/`hotfix`/`infra` PRD with a backend controller target must name a runnable cross-tenant-deny test (`Cross-tenant test:` line with a backticked `*.e2e-spec.ts`/`*.spec.ts` path), and a PRD pairing dto/schema targets with frontend targets must name a round-trip contract test (`Contract test:` line). A written waiver in the readiness report remains the escape hatch.

---

## Phase 1: PRD Drafting

**Goal:** Create a complete, unambiguous product requirements document.
**Agent prompt:** `docs/ai-context/prompts/phase-1-prd-generator.md`

### Steps

1. **Ask clarifying questions** before writing anything:
   - **Business Logic:** What problem does this solve? What are the exact acceptance criteria?
   - **Multi-Tenancy & Auth:** Is this tenant-scoped? New permissions or roles needed?
   - **Data Model & IDs:** New entities? What prefix in `PREFIX_MAP`?
   - **Integration Points:** PostgreSQL, Redis, Convex, external APIs — how do they interact?
   - **Edge Cases:** Authorization failures, data conflicts, missing input, concurrent access?

2. **Create the PRD** at `_prds/wip/prd-XXX-{name}.md` using `_prds/_TEMPLATE.md`.

3. **Do NOT begin implementation.** The PRD is a document, not a signal to start coding.

### PRD Structure

1. Overview & Goals (problem, success metrics)
2. User Stories (with acceptance criteria per story)
3. Functional Requirements (FR-1, FR-2, ... with pass/fail criteria)
4. Technical Specifications (IDs, DB schemas, auth, backend, frontend, cache/queue, types)
5. Multi-Tenancy & Security (tenant isolation, data-leakage prevention)
6. Acceptance Criteria (Gherkin: Given/When/Then)
7. Non-Goals (explicit scope boundaries)
8. Open Questions
9. References & Changelog

### File Naming

All related files share the same 3-digit number and kebab-case name:

```
prd-042-admin-dashboard.md
tasks-042-admin-dashboard.md
summary-042-admin-dashboard.md
```

### Rules

- Audience: implementing agent (Claude Code / Cursor / Codex) — every FR has Targets, Verification Commands, DO NOT list
- PRD status: `Draft` → `In Review` → `Approved` → `In Progress` → `Code Complete` → `Operator Verification` → `Ship Verified` → `Archived`
- No `any` types or ambiguous specs in the PRD
- Always verify ID prefixes and roles against `docs/ai-context/MEMORY.md`
- Before Phase 2 PASS, run `pnpm verify:prd-ready -- _prds/wip/prd-XXX-{name}.md`; unresolved lint findings require PRD revision or an explicit readiness waiver.

---

## Phase 2: Readiness Scoring

**Goal:** Stress-test the PRD with Senior Staff Engineer rigor. No code is written until this gate passes.
**Agent prompt:** `docs/ai-context/prompts/phase-2-readiness-scorer.md`

### Analysis Framework

The agent must analyze the PRD across four dimensions:

#### 2.1 Technical Depth & Architecture

| Area                   | Questions                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| **Scalability**        | How does this hold under 10x/100x load? O(n) operations? N+1 queries? Unbounded result sets? |
| **Data Consistency**   | Race conditions? Transaction boundaries? Eventual consistency risks with Redis/Convex?       |
| **Performance**        | Heavy DB locks? Missing indexes? Large payload transfers? Cold-start latency?                |
| **Pattern Compliance** | Does it follow existing patterns (OrgScopedRepository, CQRS, CacheService, QueueFactory)?    |

#### 2.2 Edge Cases & Failure Modes

| Area                  | Questions                                                                     |
| --------------------- | ----------------------------------------------------------------------------- |
| **Failure Modes**     | What if PostgreSQL is down? Redis unavailable? External API returns 500?      |
| **Input Validation**  | Is Zod/class-validator strict enough? File upload boundaries?                 |
| **Concurrent Access** | Two users editing the same entity — who wins? Locking strategy?               |
| **Side Effects**      | Does this break existing features? Invalidate caches? Affect queue consumers? |
| **Data Migration**    | Existing data that needs transformation? Reversible migration?                |

#### 2.3 Maintainability & Developer Experience

| Area                   | Questions                                                  |
| ---------------------- | ---------------------------------------------------------- |
| **Observability**      | Logs, metrics, audit events needed for production?         |
| **Type Safety**        | Branded types for IDs? All inputs/outputs typed? No `any`? |
| **Self-Documentation** | Readable implementation, or needs external docs?           |

#### 2.4 Migration & Rollback Strategy

| Area                       | Questions                                                                |
| -------------------------- | ------------------------------------------------------------------------ |
| **Backward Compatibility** | Breaks existing API consumers or DB queries?                             |
| **Rollback Plan**          | If this fails in production, exact undo steps? Data re-migration needed? |
| **Deployment Order**       | Backend/frontend deployment dependencies?                                |

### Scoring Dimensions

| #   | Dimension                    | Weight | Measures                                                                                  |
| --- | ---------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| 1   | **Clarity**                  | 15%    | Implementing agent can execute autonomously? Targets + Verification + DO NOT all present? |
| 2   | **Completeness**             | 20%    | All user stories, acceptance criteria, edge cases?                                        |
| 3   | **Technical Depth**          | 25%    | Architecture, scalability, performance, consistency?                                      |
| 4   | **Multi-Tenancy & Security** | 20%    | Tenant isolation, auth, permissions, data leakage?                                        |
| 5   | **Scope & Testability**      | 10%    | Clear non-goals? Test scenarios? Measurable metrics?                                      |
| 6   | **Migration & Rollback**     | 10%    | Backward compat, deployment strategy, undo plan?                                          |

### Score Interpretation

| Score     | Verdict          | Action                                                   |
| --------- | ---------------- | -------------------------------------------------------- |
| **9-10**  | Bulletproof      | Proceed to task generation immediately.                  |
| **8-8.9** | Solid            | Proceed with minor "watch items" flagged.                |
| **6-7.9** | Good start       | Iterate on identified gaps, re-score after improvements. |
| **4-5.9** | Significant gaps | Major rework required. Return to Phase 1.                |
| **1-3.9** | Critical issues  | Fundamental redesign needed.                             |

### Calibration addendum (2026-06-10)

A calibration study (`_plans/readiness-calibration-2026-06-10.md`) correlated 143 post-ship review findings against 83 readiness scores. Result: **within the PASS band the decimal has zero predictive power** (r = −0.03; 96% of scores sit in 8.0–9.4; MT&S subscores never left 8–9 even for the PRD that shipped a cross-tenant read). The gate's _existence_ works (scored-era: 0 criticals vs unscored-era: 2), the _number_ doesn't. Rules derived from the data:

1. **The verdict is binary.** PASS / ITERATE is the gate; the decimal is advisory color. Do not negotiate scope by tenths of a point.
2. **Hard caps instead of deductions.** The following force ITERATE regardless of weighted total:
   - **MT&S cap:** any PRD adding or touching a route must name a runnable cross-tenant-deny test (file path + test name) as a PASS precondition. "Pattern compliance described" is intent, not wiring — it does not count.
   - **Contract cap:** any PRD introducing a new FE→BE payload must specify a round-trip contract test against the real schema (Zod/class-validator). FE↔BE mismatch was the dominant scored-era defect class (a flagship feature shipped DOA under a 9.1 score).
3. **No non-PRD bypass lane.** Ad-hoc sprints touching production surfaces produced more High findings than all scored account PRDs combined. Work above trivial size on a production surface goes through the cycle — at minimum the MT&S + contract checklist with a `hotfix`-class PRD.
4. **Per-PRD review cannot see repo seams.** Both 2026-06-09 criticals were invariant violations (guard registration, filter interpolation) living outside every reviewed diff. Complement the cycle with the quarterly adversarial repo review and repo-invariant CI guards (see `_STATUS.md` follow-ups).

### Scoring Output

Save the readiness report as a file using the template at `_readiness/_TEMPLATE.md`:

- **Location:** `_readiness/wip/readiness-XXX-{name}.md`
- **Numbering:** Same XXX as the corresponding PRD
- **Re-scoring:** Update the existing file — append to Iteration History, update Quick Meta with latest score

The report includes: Quick Meta table, Model Tier Recommendation, detailed analysis, scorecard, missing pieces, iteration history, and Emofy-specific checklist.

### Project-Specific Verification Checklist

When scoring any Emofy PRD, always verify:

- [ ] New entity IDs use `generateId('entity')` with prefix in `PREFIX_MAP`
- [ ] New permissions added to `PERMISSION_MATRIX` in `@emofy/types`
- [ ] Ghost roles `"owner"` / `"workspaceAdmin"` are NOT referenced
- [ ] All DB queries use `OrgScopedRepository` or explicit `orgId` filter
- [ ] Cache keys follow `{group}:{module}:{entity}:{id}` via `CacheService`
- [ ] Queue names follow `{group}:{module}:{action}` via `QueueFactory`
- [ ] Frontend uses `<Can>` component for permission rendering
- [ ] Backend uses `@Permissions()` or `@Roles()` decorators for endpoint protection

---

## Phase 3: Task Generation

**Goal:** Transform scored PRD into atomic sub-tasks an implementing agent can execute — each sub-task carries its file path from the PRD's Targets.
**Agent prompt:** `docs/ai-context/prompts/phase-3-task-generator.md`
**Pre-condition:** Readiness verdict `PASS` — weighted score ≥ 8 (advisory floor) **and** all hard caps clear (see Phase 2 Calibration addendum). The decimal is advisory color, not a negotiation lever.

### Two-Phase Approach

1. **Phase A:** Create ~5-7 parent tasks in recommended order:
   - Database & Infrastructure → Backend Core → API & Validation → Events & Integration → Frontend → Permissions → QA

2. **Present to user**, then **STOP and wait for "Go"**.

3. **Phase B:** After user approval, create detailed sub-tasks with:
   - Explicit file paths matching monorepo structure
   - Specific instructions per sub-task
   - Relevant Files section listing all files that will be created/modified

### Task File

- **Location:** `_tasks/wip/tasks-XXX-{name}.md`
- **Numbering:** Same XXX as PRD. Parent: `1.0`, Sub: `1.1`, `1.2`, ...

---

## Phase 4: Implementation

**Goal:** Implement tasks one-by-one with continuous quality verification and zero technical debt.
**Agent prompt:** `docs/ai-context/prompts/phase-4-implementation.md`  
**Start-of-phase message (paths + handoff):** `docs/ai-context/prompts/phase-4-implementation-bootstrap.md`

### Cross-Agent Conflict Check

Before starting a sub-task, claim the PRD with the wrapper. One command creates
a git worktree, writes the lock, and updates `_STATUS.md`:

```sh
pnpm prd:start PRD-XXX [--phase "Phase 4"] [--agent name] [--base development]
cd .worktrees/prd-XXX-<slug>   # all subsequent work happens here
```

When done (or handed off):

```sh
pnpm prd:stop PRD-XXX          # removes worktree, lock, _STATUS row
```

#### Branch isolation (non-negotiable)

Execution and review phases (Phases 4–6) write code or verify shipped diffs, so they **must** run in
the `feat/prd-XXX-*` worktree `prd:start` creates — never directly on
`development`/`main`/`staging`. Base branches are **merge-only** for source:
feature work lands via a merge from the feat branch; only coordination artifacts
(PRD/task/readiness/summary state, `_STATUS.md`, wiki, docs) may be committed
straight onto a base branch.

Enforcement:

- `prd:start` refuses `--no-worktree` for execution phases.
- `pnpm verify:branch-isolation` (in `verify:workflow`) fails if an active
  execution-phase lock has no worktree or is pinned to a base branch.
- The pre-commit guard (`scripts/guard-base-branch-commit.mjs`) blocks staging
  source files for a direct commit on a base branch. Deliberate one-off:
  `ALLOW_BASE_COMMIT=1 git commit …`.

#### Parallel sessions & Claude Desktop

Running a second session (e.g. Claude Desktop) on this repo at the same time?
Each session gets its **own** `pnpm prd:start` worktree and its own
`_STATUS.md` row — never share one base-branch checkout, or the two streams mix
uncommitted work and the ledger drifts. One PRD = one lock = one worktree = one
active-agent row. Doc-only work (Phase 1/2) may stay in the main checkout.

**Parallel execution playbook (PRD-249):**

1. **One PRD per worktree** — never two agents on the same `feat/prd-XXX-*` branch.
2. **Disjoint file sets** — before starting PRD-B while PRD-A runs, `pnpm state:active` + skim FR `Targets:`; avoid overlapping paths (especially `packages/types`, `packages/db`, shared guards).
3. **Independent parent tasks** — within one PRD, sub-tasks that touch disjoint packages may run in parallel subagents only when the task file marks them `[parallel-safe]` and scope-lock paths do not intersect.
4. **Merge order** — merge PRD-A to local `development` before starting PRD-B if both touch the same package; otherwise serial `prd:autorun` merges are fine (human pushes once both are green).
5. **Review isolation** — Phase 6 reviewer must not be the implementing agent session; use a fresh panel per PRD.

Verification helpers:

- `pnpm prd:status` — show every active claim across both layers
- `pnpm verify:agent-locks` — schema + expiry check
- `pnpm verify:status-sync` — fails on drift between `_STATUS.md` and `_state/locks/`
- `pnpm verify:workflow` — runs the full chain

If another active lock or `_STATUS.md` row already lists the PRD or files you
need to modify, **STOP** and notify the user. Remove or renew stale locks only
when you own them or the user explicitly approves recovery.

#### Manual fallback (when the wrapper can't be used)

Prefer `prd:start`. A hand-written lock for an execution phase must still satisfy
branch isolation, or `verify:branch-isolation` will reject it:

1. Create the `feat/prd-XXX-<slug>` worktree yourself (`git worktree add`); a
   lock pinned to `development`/`main` is **not** allowed for Phases 4–6.
2. Create a lock file in `_state/locks/<prd-slug>.json` per the schema, with the
   `worktree` and `branch` (feat/\*) fields set.
3. Append a matching row to `_STATUS.md` under "Aktif Agent'lar".
4. Run `pnpm verify:status-sync` && `pnpm verify:branch-isolation` before continuing.

### Execution Loop

```
1. READ   → Next uncompleted sub-task
2. EXECUTE → Write code changes
3. VERIFY  → pnpm check-types && pnpm lint (after each sub-task)
           → pnpm test --filter=<affected-packages> (skip if no test infra)
           → pnpm build (after each parent task)
4. UPDATE  → Mark only completed-as-written items [x], update Relevant Files, log progress/evidence
5. COMMIT  → Conventional Commits format where the agent mode allows commits
6. REPEAT  → Next sub-task (autonomous; stop only for PRD/task gaps or blockers)
```

### Verification Ledger

Every task file must include a `Verification Ledger` that records what was actually verified:

| Result     | Meaning                                                                          |
| ---------- | -------------------------------------------------------------------------------- |
| `passed`   | Gate ran successfully for the stated scope                                       |
| `failed`   | Gate ran and failed; do not proceed until fixed or explicitly blocked            |
| `partial`  | Gate ran for a narrower scope; evidence explains why                             |
| `skipped`  | Gate is not applicable; notes explain why                                        |
| `operator` | Requires human, browser session, staging, DB credentials, or runtime environment |
| `blocked`  | Cannot run because of an unresolved dependency or unrelated breakage             |

Use precise scopes such as `monorepo`, `affected packages`, `@emofy/backend`, or `manual staging`.

### Quality Standards

- **No `any` types.** Use branded types for IDs.
- **OrgScopedRepository** for all tenant-scoped entities.
- **class-validator DTOs** for all API inputs.
- **`@Permissions()` / `@Roles()`** on all protected endpoints.
- **TanStack Query** for all frontend API calls.
- **`<Can>` component** for all permission-gated UI.
- **`CacheService` / `QueueFactory`** for all cache/queue operations.
- **Risk-class test gate (2026-06-10):** if the diff touches guards, permissions/roles, org-scoping, auth flows, or user-controlled query/search filters, at least one integration test exercising the new behavior is **required** before Phase 4. In the Verification Ledger this gate may only be `passed` or `failed` — `skipped` is not acceptable; `operator` requires an explicit `Operator Acceptance` meta on the PRD. Rationale: the two critical post-ship findings of 2026-06-09 (RolesGuard bypass, Meili filter injection) are exactly the class an integration test catches and lint/types cannot.

### Scope Locking

Do not modify files outside the current PRD's scope. No opportunistic refactoring.

### Commit Mode

Autonomous CLI agents may commit after each logical unit when explicitly operating under this workflow. Cursor Composer agents must not create commits unless the user explicitly asks; they should record `changes uncommitted` in the task file's Progress Log or Verification Ledger instead.

### Error & Blocker Management

- Type errors: fix immediately, never proceed with broken types.
- Design questions not in PRD: stop and ask user.
- Unexpected complexity: log in task file "Blockers" section.

---

## Phase 5: Testing

**Goal:** Execute every PRD §11 verification command with evidence; run adversarial tests beyond happy path.
**Agent prompt:** `docs/ai-context/prompts/phase-5-testing.md`

Gate (mechanical): each §11 command exits 0; ledger rows updated. `prd:autorun` runs this phase before Phase 6.

---

## Phase 6: Final Auditing

**Goal:** Independent adversarial review, spec-vs-code audit, and workflow integrity gates.
**Agent prompt:** `docs/ai-context/prompts/phase-6-final-auditing.md`
**Gate (mechanical):** independent-review ledger `passed` + structured review artifact + `pnpm verify:workflow` clean.

### Verification Audit

#### Spec vs. Code

- [ ] Every FR implemented
- [ ] Every User Story has a code path
- [ ] Every Acceptance Criterion verifiable
- [ ] Non-Goals respected (nothing out-of-scope added)

#### Code Hygiene

- [ ] No `console.log` in production code
- [ ] No `FIXME` / `TODO` / `HACK` comments
- [ ] No commented-out code blocks
- [ ] No `any` types or `as any` casts

#### Build Verification

```bash
pnpm build && pnpm check-types && pnpm lint  # All must pass
```

#### Verification Commands Are Executed, Not Listed

The PRD's per-FR **Verification Commands** must be **run** during Phase 5 (Testing), with the command and trimmed output pasted as evidence into the Verification Ledger / summary. A listed-but-not-run command is `operator` or `blocked` — never `passed`.

#### Independent Adversarial Review (blocking)

A reviewer that did **not** write the code reviews the full diff vs base:

- Default mechanism: gstack `/codex` review mode (different model family, pass/fail gate).
- Fallback when Codex is unavailable: a fresh agent session with no implementation context, prompted to refute the diff.
- Every finding is either fixed or explicitly waived with a one-line justification in the ledger.
- Ledger row `independent-review` records the tool, diff range, and verdict (`passed` / `failed`). `skipped` is not a valid result for `feature` / `hotfix` / `infra` classes; `test-hardening` may skip with justification.

Rationale: Phase 6 self-audit by the implementing agent does not catch its own blind spots — the 2026-06-09 post-hoc reviews surfaced 87 + 56 findings inside Ship Verified PRDs.

**Mechanical gate:** `pnpm verify:workflow` (includes `verify:prd-state`, memory-drift, doc-bloat, durable-artifacts). `prd:autorun` runs this after the independent-review ledger check.

#### Multi-Tenancy Audit

- [ ] All new queries include `orgId` filter
- [ ] No cross-tenant data leakage paths
- [ ] New endpoints protected by `OrgGuard`
- [ ] New entities use correct `generateId()` prefix
- [ ] Risk-class test gate: diff touching guards / permissions / org-scoping / auth / user-controlled filters carries at least one integration test (ledger row, no `skipped`)

#### Permission Audit

- [ ] `PERMISSION_MATRIX` updated in `@emofy/types`
- [ ] Backend: `@Permissions()` / `@Roles()` on endpoints
- [ ] Frontend: `<Can>` / `usePermission` on UI elements

---

## Phase 7: Learning & Sign-off

**Goal:** Capture durable knowledge, sync memory/wiki, document the PRD, and report sign-off. Runs **before** the merge so durable docs land in the same merge as the code.
**Agent prompt:** `docs/ai-context/prompts/phase-7-learning.md`
**Gate (mechanical):** PRD-scoped `pnpm verify:durable-artifacts` + `pnpm ship:pre`.

### Step 1: Wiki Ingest & Memory Sync

1. **Run wiki-ingest protocol** (`docs/ai-context/prompts/wiki-ingest.md`) on the completed PRD — this updates the relevant wiki pages (`wiki/*.md`) instead of the old monolithic MEMORY.md. At minimum update: `current-state.md`, and any pages affected by new tables, prefixes, permissions, or rules.
2. **Run `pnpm verify:durable-artifacts -- _prds/.../prd-XXX-....md`** — PRD-scoped durable artifact paths must appear in the change set.
3. **Run `pnpm ship:pre`** — wraps `state:sync` + `state:wiki-log` + `verify:workflow` (PRD state, locks, status-sync, deferrals, memory-drift, doc-bloat), refuses to run on `main`, and prints a handoff card with branch / base / diff / detected PRD. `Ship Verified` is not valid while this check fails.
4. **Update `_STATUS.md`** — log activity, update PRD status, update stats. Any deferred/follow-up item gets a row with Sahip + Vade (see Deferral Policy).
5. **Update `docs/ai-context/BEST_PRACTICES.md`** if new reusable patterns were introduced (used in 3+ files).
6. **Capture lessons learned** — if this implementation revealed an edge case, convention, or decision that future agents need to know, add it to the relevant wiki page. See `.cursor/rules/self-improve.mdc` for the full protocol.
7. **`wiki/log.md` ship entries are automated** — `pnpm state:wiki-log` (inside `ship:pre`) appends one line per shipped PRD. Hand-write log entries only for structural wiki operations (page adds/merges/archives).

### Step 2: Documentation

Create summary at `_docs/wip/summary-XXX-{name}.md` covering: overview, key features, technical implementation, files changed, verification evidence, operator handoff, ship readiness, breaking changes, deferred items.

### Step 3: Sign-off Report

Provide concise summary to user:

- Core changes
- Architectural impact
- Memory updates performed
- Residual technical debt
- Verification results (build/types/lint/multi-tenancy/permissions)

Notify either:

- `Ship Verified`: "Files ready to move from `wip/` to `completed/`."
- `Operator Verification`: "Code complete, but files should remain in `wip/` until operator-owned verification is complete."

---

## Directory Structure

```
_prds/
├── wip/           # Active PRDs
├── completed/     # Done PRDs (68 as of 2026-03-08)
└── _TEMPLATE.md

_readiness/
├── wip/           # Active readiness reports (scored, PRD not yet completed)
├── completed/     # Done readiness reports (moved with PRD on Phase 4)
└── _TEMPLATE.md

_tasks/
├── wip/           # Active task files
├── completed/     # Done task files
└── _TEMPLATE.md

_docs/
├── wip/           # Active summaries
├── completed/     # Done summaries
└── _SUMMARY_TEMPLATE.md

docs/ai-context/
├── MEMORY.md           # Wiki Index (page catalog + reading guide)
├── BEST_PRACTICES.md   # Quality Manual
├── WORKFLOW.md          # This file
├── wiki/               # LLM Wiki — atomik bilgi sayfaları
│   ├── vision.md, tech-stack.md, architecture.md, database.md
│   ├── entity-ids.md, permissions.md, current-state.md
│   ├── rules.md, scripts.md, raw-sources.md
│   ├── cross-reference-convention.md
│   └── log.md          # Chronological wiki operations log
└── prompts/            # Agent activation protocols
    ├── phase-1-prd-generator.md
    ├── phase-2-readiness-scorer.md
    ├── phase-3-task-generator.md
    ├── phase-4-implementation.md
    ├── phase-4-implementation-bootstrap.md
    ├── phase-5-testing.md
    ├── phase-6-final-auditing.md
    ├── phase-7-learning.md
    ├── orchestration-runner.md       # Agent driver for Phases 4–7 + prd:autorun
    ├── wiki-ingest.md                # Source → Wiki integration protocol
    └── wiki-lint.md                  # Wiki health check protocol
```

```
_state/
├── prds.json            # Generated PRD lifecycle state
├── schema/              # JSON schemas for state + locks
└── locks/               # Runtime agent locks (JSON ignored; README committed)
```

---

## Paperclip Handoff Protocol

> **Status: INACTIVE (2026-06-11).** Paperclip tooling is not wired into this repo; no script or CI step creates or reads Paperclip issues. This section is retained as a design sketch for future multi-agent handoffs — do **not** treat it as a required step. The operative handoff mechanism is `_STATUS.md` + the phase prompts + `pnpm prd:start`/`prd:stop`. Reactivating this protocol requires an `infra`-class PRD that wires the tooling.

**Original design (when active):** Every phase transition creates a Paperclip issue assigned to the next responsible agent. Updating `_STATUS.md` alone is not sufficient — agents only pick up work from their Paperclip inbox.

### Handoff Map

```
Phase 1 → 2:   PM assigns task to CTO         "Phase 2: Score PRD-XXX"              (tasks:assign)
Phase 2 → 3:   CTO assigns task to PM         "Phase 3: Generate tasks for PRD-XXX" (tasks:assign)
Phase 2 → 1:   CTO assigns task to PM         "Phase 2: Revise PRD-XXX"             (tasks:assign)
Phase 3 → 4:   PM assigns task to Engineer    "Phase 4: Implement PRD-XXX"          (tasks:assign)
Phase 4 → 5:   Engineer @mentions CTO         "@cto Phase 5 ready: PRD-XXX"         (comment)
Phase 6 → 7:   CTO assigns tasks to PM + CEO    "PRD-XXX Complete/Shipped"             (tasks:assign)
```

> Note: Engineers lack `tasks:assign` — they use comments + @mention on the parent issue.
> CTO picks up the mention via `PAPERCLIP_WAKE_REASON: mention`.

### Agent IDs (for Paperclip assignee field)

| Agent         | Paperclip ID                           | `tasks:assign` |
| ------------- | -------------------------------------- | :------------: |
| CEO           | `c0563962-4276-445c-a09d-9d4781bcf6be` |       ✅       |
| CTO           | `bef9ee55-c6ab-4066-91a0-41a2c4a848c5` |       ✅       |
| PM            | `2e4c122d-f96c-495e-a2ec-d99e7ba0a27a` |       ✅       |
| CMO           | `6c600325-f20e-492b-9101-cadde7a33036` |       ✅       |
| Legal Counsel | `caf7b241-c13e-48dd-9372-d1bc57cb55d9` |       ✅       |

### Rules

1. **Primary channel**: Paperclip inbox (`GET /api/agents/me/inbox-lite`)
2. **Supplementary**: `_STATUS.md` for human visibility and fallback
3. **Managers**: Create Paperclip issues with `assigneeAgentId` at each phase boundary
4. **Individual contributors**: Use comments + @mention on the parent issue for handoffs
5. **Include context in comments**: PRD file path, score results, task file path, completion notes
6. **Fallback**: If `_STATUS.md` shows a pending handoff but no Paperclip task exists, the receiving agent should self-assign by creating the task

---

## Cross-Agent Coordination

Multiple AI agents may work concurrently. To prevent conflicts:

1. **Before starting:** Run `pnpm state:prd -- PRD-XXX` or `pnpm state:index`, inspect `_state/locks/`, and read `_STATUS.md`
2. **Acquire lock:** Add `_state/locks/<lockId>.json` with touched files and expiry, then run `pnpm verify:agent-locks`
3. **Register visibly:** Add the same work to `_STATUS.md` for humans
4. **Avoid file conflicts:** Don't work on files another active lock or agent row is modifying
5. **On completion:** Remove your lock, update `_STATUS.md`, run `pnpm state:sync`
6. **Task files are shared state:** `_tasks/wip/` files remain the sub-task execution contract

---

## Parallel Agents & Merge Train

Operating rules for running **2–3 agents on independent PRDs concurrently** (PRD-312).
The path-conflict gate + ready-queue make this safe; the rules keep it that way.

- **Concurrency cap:** default **2 implementation + 1 review/test** in flight. Scale up only
  once the queue and conflict surfaces are clean.
- **Pull from the queue:** `pnpm prd:queue` (or `state:next`) is the ready pool — Approved/PASS,
  unlocked, not implemented. The orchestrator hands out PRDs from READY; never hand-picks a
  locked or in-flight PRD.
- **Declare a Conflict Surface:** every parallel PRD lists the source globs it owns in its
  `## Conflict Surface`. `prd:start` mirrors them into the lock's `ownedPaths`;
  `verify:path-conflicts` FAILS if two ACTIVE execution-phase locks overlap.
- **Epic-shard for disjoint surfaces:** split an epic into shards with **disjoint source surfaces**
  (backend-only / UI-only / docs / test). PRDs whose surfaces overlap **serialize** — do not run
  them in parallel (the gate enforces this). `prd:queue` flags overlapping READY candidates.
- **Shared/append-only manifests are never a Conflict Surface:** `package.json`, `pnpm-lock.yaml`,
  `commitlint.config.js`, `docs/ai-context/WORKFLOW.md`, `scripts/verify-workflow.mjs`,
  `_STATUS.md`, `CLAUDE.md`, `AGENTS.md` are append-only; a git **union merge-driver**
  (`.gitattributes`) resolves them, so two PRDs both appending a line never serialize.
- **Single merge channel:** every PRD lands via `prd:autorun` into **local `development`** (no-ff),
  one at a time. Same-surface PRDs queue behind each other.
- **Push is always the human's decision** — never automated, even after a green local merge.

---

## Quick Reference

| Phase                  | Input         | Output                                   | Gate                                                      |
| ---------------------- | ------------- | ---------------------------------------- | --------------------------------------------------------- |
| 1. PRD Drafting        | User request  | `_prds/wip/prd-XXX-{name}.md`            | User approval                                             |
| 2. Readiness Scoring   | Completed PRD | `_readiness/wip/readiness-XXX-{name}.md` | `PASS` verdict (≥8 advisory floor + hard caps clear)      |
| 3. Task Generation     | Scored PRD    | `_tasks/wip/tasks-XXX-{name}.md`         | User says "Go"                                            |
| 4. Implementation      | Task file     | Implemented code, `[x]` marks            | `check-types` + `lint` + `build`                          |
| 5. Testing             | Code complete | Verification ledger evidence             | Every PRD §11 command exit 0                              |
| 6. Final Auditing      | Tested code   | Review doc + workflow gates              | Independent adversarial review + `pnpm verify:workflow`   |
| 7. Learning            | Audited code  | Wiki sync + durable artifacts            | `pnpm verify:durable-artifacts` (PRD-scoped) + `ship:pre` |
| merge (operator-gated) | Gates green   | Local `development` merge + handoff card | `prd:autorun` (never pushes); human push                  |

**Closing shortcut:** `/prd-land [PRD-XXX]` (Claude Code `.claude/commands/`, Cursor CLI `.cursor/commands/`) wraps the one canonical closing command `pnpm prd:autorun -- --from-phase=merge PRD-XXX` — archive wip→completed, local `development` merge, `prd:stop` cleanup, handoff card. It **never pushes** and never does a manual merge. Use only when Phases 4–7 gates are already green.

---

## Model Tier Guide

Readiness reports include a **Model Tier Recommendation** for Phase 4 (Implementation) and Phase 6 (Final Auditing). This is advisory, not binding.

| Tier       | Models (examples)             | When                                                                          |
| ---------- | ----------------------------- | ----------------------------------------------------------------------------- |
| **high**   | Opus 4.6, GPT-5.4             | RBAC/schema changes, cross-module impact, score 8–8.9, ambiguous requirements |
| **medium** | Sonnet 4.6, Composer 2        | Well-scoped PRD, clear criteria, single-module, score >= 9                    |
| **fast**   | Composer 2 Fast, quick models | Trivial/repetitive sub-tasks within a scored PRD                              |

Override freely based on task-level complexity. When in doubt, start medium and escalate if stuck.

---

## Git Branching Strategy

Long-lived branches aligned with CI/CD (`ci.yml` / `deploy.yml`):

```
main                    # production — deploy :latest + :sha
  ↑
staging                 # QA — deploy :staging + :sha
  ↑
development             # integration — autonomous local-merge target
  └── feat/prd-XXX-{name}   # created by `pnpm prd:start` (worktree under .worktrees/)
```

- Feature branches are named `feat/prd-XXX-{short-name}` matching the PRD number and are created by `pnpm prd:start` (never hand-cut on a base branch — see Phase 4 → Branch isolation).
- Base branches (`development`/`staging`/`main`) are **merge-only** for source. The default integration path is the autonomous `feat → local development` merge performed by `prd:autorun` once all gates are green; the runner **never pushes**.
- **Push to remote (which triggers CI/deploy) is always the human's decision**, made from the handoff card. A remote PR into `development` is only needed when a human chooses to route review through the forge instead of the local merge.
- All PRD-related files (PRD, tasks, summary) use the same `XXX` number and `{name}` slug.

---

## Agent & IDE Configuration

| Platform    | Config File           | Skill Location                       | Notes                      |
| ----------- | --------------------- | ------------------------------------ | -------------------------- |
| Cursor      | `.cursor/rules/*.mdc` | `.cursor/skills/`, `.agents/skills/` | Rules + skills             |
| Claude Code | `CLAUDE.md`           | Auto-memory                          | PRD workflow, backend arch |
| VS Code     | `AGENTS.md`           | `.agents/skills/*/AGENTS.md`         |                            |
| Antigravity | `AGENTS.md`           | `.agents/skills/*/AGENTS.md`         |                            |

### Cursor Rules (PRD Workflow)

| Rule            | File                     | Purpose                                      |
| --------------- | ------------------------ | -------------------------------------------- |
| PRD Create      | `prd-create.mdc`         | Clarifying questions, format                 |
| Task Generation | `prd-generate-tasks.mdc` | 2-phase generation                           |
| Task Processing | `prd-process-tasks.mdc`  | Points to phase-3 / phase-4 SSOT + bootstrap |
| Workflow        | `prd-workflow.mdc`       | General workflow                             |
