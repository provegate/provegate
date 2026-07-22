# Phase 2: PRD Gatekeeper & Readiness Scorer

> **Cycle Phase:** 2 of 7
> **Role:** Senior Staff Engineer
> **Goal:** Stress-test a PRD with ruthless technical rigor. No code is written until this gate is passed.

---

## Agent Constraints

1. **No Implementation:** This phase produces analysis only — zero code changes.
2. **Be Adversarial:** Your job is to find holes, not to validate. Think like an attacker, a DBA under load, and a new hire reading this for the first time.
3. **Reference Memory:** Read `docs/ai-context/MEMORY.md` and `docs/ai-context/BEST_PRACTICES.md` to validate the PRD against existing architecture and conventions.
4. **Run PRD Lint:** Before assigning PASS, run or require evidence for `pnpm verify:prd-ready -- _prds/wip/prd-XXX-{name}.md`. A lint failure caps the verdict at ITERATE unless explicitly waived with a written reason in the readiness report.

---

## Analysis Framework

### 1. Technical Depth & Architecture

| Dimension              | Questions to Answer                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Scalability**        | How does this hold up under 10x or 100x load? Are there O(n) operations, N+1 queries, or unbounded result sets? |
| **Data Consistency**   | Are there race conditions? Transaction boundaries? Eventual consistency risks with Redis/Convex?                |
| **Performance**        | Heavy DB locks? Missing indexes? Large payload transfers? Cold-start latency?                                   |
| **Multi-Tenancy**      | Is `orgId` enforced on every query path? Can tenant A ever see tenant B's data?                                 |
| **Auth & Permissions** | Are the correct roles specified? Is `PERMISSION_MATRIX` updated? Are API endpoints protected?                   |

### 2. "What If" Scenarios (Edge Cases)

| Scenario              | Questions to Answer                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| **Failure Modes**     | What happens if PostgreSQL is down? Redis unavailable? Convex unreachable? External API returns 500?      |
| **Input Validation**  | Is Zod validation strict enough? Can malformed data bypass validation? Are file uploads bounded?          |
| **Concurrent Access** | Two users editing the same entity — who wins? Optimistic vs pessimistic locking?                          |
| **Side Effects**      | Does this change break existing features? Does it invalidate cached data? Does it affect queue consumers? |
| **Data Migration**    | Is there existing data that needs transformation? Is the migration reversible?                            |

### 3. Maintainability & Developer Experience

| Dimension               | Questions to Answer                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Observability**       | What logs/metrics are needed in production? Are audit events defined?                       |
| **Self-Documentation**  | Is the implementation "readable" or will it need extensive external docs?                   |
| **Type Safety**         | Are branded types used for IDs? Are all inputs/outputs typed with Zod? No `any`?            |
| **Pattern Consistency** | Does this follow existing patterns (OrgScopedRepository, CQRS, CacheService, QueueFactory)? |

### 4. Migration & Rollback Strategy

| Dimension                  | Questions to Answer                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| **Backward Compatibility** | Does this break existing API consumers or DB queries?                                            |
| **The "Undo" Button**      | If this fails in production, what is the exact rollback plan? Does it require data re-migration? |
| **Deployment Order**       | Can backend and frontend deploy independently? Any ordering constraints?                         |

---

## Scoring System

### Class-conditional weights

Read the PRD's `PRD Class` field from its header metadata. Apply the
weights below; if the field is absent default to `feature`. Promoted
to a first-class field in 2026-05-24 after PRD-193's lessons-learned
roll-up — see `docs/ai-context/GSTACK_INTEGRATION.md` §Lessons.

| Dimension                    | feature | test-hardening | hotfix | infra |
| ---------------------------- | ------- | -------------- | ------ | ----- |
| **Clarity**                  | 15%     | 25%            | 25%    | 15%   |
| **Completeness**             | 20%     | 30%            | 25%    | 20%   |
| **Technical Depth**          | 25%     | 33%            | 30%    | 20%   |
| **Multi-Tenancy & Security** | 20%     | N/A            | 10%    | 10%   |
| **Scope & Testability**      | 10%     | 12%            | 10%    | 15%   |
| **Migration & Rollback**     | 10%     | N/A            | N/A    | 20%   |

**N/A means dimension is not scored** — do not award 10/10 to N/A
dimensions; their weight is already redistributed in the table above.
Inflating a class-N/A dimension to 10/10 is the failure mode this
table replaces. Mark the cell `N/A — class waived` in the readiness
report's Scorecard section.

Weight rationale per class:

- `feature` — 6-dim formula, full coverage. Production user surface.
- `test-hardening` — Multi-Tenancy + Migration structurally N/A; the
  freed 30% concentrates in Clarity + Completeness + Tech Depth where
  the real adversarial questions live (was the root cause actually
  diagnosed? did the fix touch only the test surface? are stub shapes
  documented?). PRD-193 lessons #1-3 mapped here.
- `hotfix` — Migration N/A (revert = `git revert` of the single commit);
  Multi-Tenancy stays at half-weight because some hotfixes do touch
  auth-adjacent code.
- `infra` — Migration inflated to 20% because deployment ordering is
  the failure mode (worktree CI, deploy runbook, lock schema bump).
  Multi-Tenancy halved because infra rarely touches tenant data.

### Dimensions (1-10 each)

| #   | Dimension                    | What It Measures                                                                                                                                                               |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Clarity**                  | Can the implementing agent execute autonomously without human clarification? Every FR has Targets (file paths + symbols), Verification Commands runnable, DO NOT list present. |
| 2   | **Completeness**             | All user stories, acceptance criteria, edge cases covered?                                                                                                                     |
| 3   | **Technical Depth**          | Architecture, scalability, performance, data consistency addressed?                                                                                                            |
| 4   | **Multi-Tenancy & Security** | Tenant isolation, auth, permissions, data-leakage prevention?                                                                                                                  |
| 5   | **Scope & Testability**      | Clear non-goals? Test scenarios identified? Success metrics?                                                                                                                   |
| 6   | **Migration & Rollback**     | Backward compatibility, deployment strategy, undo plan?                                                                                                                        |

### Score Interpretation

| Score     | Verdict          | Action                                                   |
| --------- | ---------------- | -------------------------------------------------------- |
| **9-10**  | Bulletproof      | Proceed to task generation immediately.                  |
| **8-8.9** | Solid            | Proceed with minor notes flagged as "watch items".       |
| **6-7.9** | Good start       | Iterate on identified gaps, re-score after improvements. |
| **4-5.9** | Significant gaps | Major rework needed. Return to Phase 1.                  |
| **1-3.9** | Critical issues  | Fundamental redesign required.                           |

### Hard Caps (force ITERATE regardless of weighted total — calibration 2026-06-10)

Calibration against 143 post-ship findings showed the decimal score has zero predictive power inside the PASS band (`_plans/readiness-calibration-2026-06-10.md`); these wiring-level caps are what discriminate. Cap the verdict at **ITERATE** when:

1. **MT&S cap:** the PRD adds/touches a route but does not name a runnable cross-tenant-deny test (file path + test name). Describing the security pattern ("uses OrgScopedRepository ✅") is intent, not wiring — it does not satisfy the cap. Write it as a greppable line: `Cross-tenant test: \`path/to/x.e2e-spec.ts\` — <test name>`.
2. **Contract cap:** the PRD introduces a new FE→BE payload but specifies no round-trip contract test against the real schema (Zod/class-validator). Write it as: `Contract test: \`path/to/x.spec.ts\``.
3. **Lint cap (existing):** `pnpm verify:prd-ready` fails without a written waiver.

From PRD-199, caps 1–2 are also enforced mechanically by `verify:prd-ready` (controller targets ⇒ `Cross-tenant test:` line required; dto/schema + frontend targets ⇒ `Contract test:` line required). The lint catches the missing line; **you** still judge whether the named test actually exercises the deny path.

The verdict is binary (PASS / ITERATE); do not negotiate scope by tenths of a point. Report the verdict first, scorecard second — the decimal is advisory color. If this scoring session also wrote or revised the PRD, note `self-scored: yes` in Quick Meta for Phase 4 visibility.

---

## Output Format

Save the readiness report as a **persistent file** using the template at `_readiness/_TEMPLATE.md`.

### File Management

- **Location:** `_readiness/wip/readiness-XXX-{name}.md`
- **Numbering:** Same XXX as the corresponding PRD
- **Re-scoring (ITERATE):** Update the existing file — do NOT create a new one. Append a row to Iteration History, update Quick Meta with the latest score/verdict, and keep previous analysis for reference.
- **State:** Run `pnpm state:sync` after saving the readiness report so `_state/prds.json` reflects the latest score/verdict.

### Model Tier Recommendation

Include a Model Tier Recommendation in the report based on:

| Condition                                       | Execution Tier                | Audit Tier |
| ----------------------------------------------- | ----------------------------- | ---------- |
| Score >= 9, no RBAC/schema/cross-module changes | medium or fast                | medium     |
| Score >= 9, with RBAC or schema changes         | high                          | high       |
| Score 8–8.9                                     | high                          | high       |
| Score < 8 (ITERATE)                             | Do not assign — fix PRD first | —          |

> **Tier definitions:** high = Opus 4.6 / GPT-5.4 level, medium = Sonnet 4.6 / Composer 2, fast = Composer 2 Fast / quick models. This is advisory — agents and users may override based on task-level complexity.

### Report Structure

The report must include all sections from `_readiness/_TEMPLATE.md`:

1. **Quick Meta** — structured table with score, verdict, iteration, model tiers, date
2. **Model Tier Recommendation** — phase-by-phase tier with rationale
3. **Analysis** — four sections (Technical Depth, Edge Cases, Maintainability, Migration)
4. **Scorecard** — 6-dimension weighted table
5. **Missing Pieces** — specific gaps and fixes to reach 10/10
6. **Iteration History** — date, score, verdict, key changes per round
7. **Emofy-Specific Checklist** — project verification items
8. **Verdict** — PASS / ITERATE / REJECT with explanation

---

## After Passing (Score >= 8)

Transition to task generation:

> "PRD-XXX scored **X.X/10 — PASS**. PRD lint passed (`pnpm verify:prd-ready -- ...`). Readiness report saved at `_readiness/wip/readiness-XXX-{name}.md`. State refreshed with `pnpm state:sync`. Model tier recommendation: Implementation = [tier], Final audit = [tier]. Ready for task generation. Shall I proceed to **Phase 3: Task List Generation** and create the implementation plan?"

If score is 6-7.9, list the specific improvements needed and ask:

> "PRD-XXX scored **X.X/10 — ITERATE** (iteration #N). Readiness report updated at `_readiness/wip/readiness-XXX-{name}.md`. The following gaps need to be addressed: [list]. Shall I update the PRD with these fixes and re-score?"

---

## Task Generation (Phase 3 — after scoring passes)

Once the PRD passes, generate tasks following the detailed protocol at `docs/ai-context/prompts/phase-3-task-generator.md`.

---

## Project-Specific Checks

When scoring Emofy PRDs, always verify:

- [ ] New entity IDs use `generateId('entity')` pattern with prefix in `PREFIX_MAP`
- [ ] New permissions added to `PERMISSION_MATRIX` in `@emofy/types`
- [ ] Ghost roles `"owner"` / `"workspaceAdmin"` are NOT referenced
- [ ] All DB queries go through `OrgScopedRepository` or include explicit `orgId` filter
- [ ] Cache keys follow `{group}:{module}:{entity}:{id}` format via `CacheService`
- [ ] Queue names follow `{group}:{module}:{action}` format via `QueueFactory`
- [ ] Frontend uses `<Can>` component or `usePermission` hook for authorization
- [ ] Backend uses `@Permissions()` or `@Roles()` decorators

## Agent-Executability Checks (Clarity gate)

A PRD cannot score above **7/10 on Clarity** if any of these fail:

- [ ] Every FR has a **Targets** line with concrete file paths (`path/to/file.ts::SymbolName`).
- [ ] **Verification Commands** section exists, every command is runnable from repo root, and each FR maps to at least one command.
- [ ] **DO NOT (Anti-Patterns)** section exists with at least the project-wide forbidden moves plus feature-specific ones.
- [ ] **Open Questions** section is empty (or every entry is marked as deferred to a follow-up PRD with a link).
- [ ] No `TBD`, `???`, or `to be decided` strings in FR/Tech Spec sections.
