# Readiness Assessment: {{ID_PREFIX}}-XXX — [Feature Name]

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-XXX-{short-name}.md`            |
| Score                  | X.X/10                                         |
| Verdict                | PASS                                           |
| Iteration              | 1                                              |
| Model Tier (Execution) | high                                           |
| Model Tier (Audit)     | high                                           |
| Scored by              | [agent/model]                                  |
| Self-scored            | yes / no (did the PRD's author score it?)      |
| Date                   | YYYY-MM-DD                                     |
| PRD Lint               | passed / waived (reason) — `gate check` result |
| State Record           | updated / pending                              |

<!-- Verdict values: PASS | ITERATE | REJECT. The Score row and Verdict row are parsed
by the state builder — keep the `| Score |` and `| Verdict |` labels intact. -->

---

## Model Tier Recommendation

| Phase               | Tier                 | Rationale       |
| ------------------- | -------------------- | --------------- |
| Phase 4 (Execution) | high / medium / fast | [Why this tier] |
| Phase 6 (Audit)     | high / medium        | [Why this tier] |

---

## Analysis

### 1. Technical Depth & Architecture

[Findings — scalability, data consistency, performance, pattern compliance]

### 2. Edge Cases & Failure Modes

[Findings — failure modes, input validation, concurrent access, side effects, migration]

### 3. Maintainability & DX

[Findings — observability, type safety, self-documentation, pattern consistency]

### 4. Migration & Rollback

[Findings — backward compatibility, deployment order, undo plan]

### 5. Memory Inputs

[Challenge each declared input's relevance, and name any active record whose `watch`
overlaps a declared target and is missing from the inputs. A ceremonial or unexamined
`none` scores down rather than passing.]

---

## Scorecard

Apply the class-conditional weights from `prompts/phase-2-readiness-scorer.md`; mark
class-waived dimensions `N/A — class waived` (never 10/10).

| #         | Dimension                | Weight | Score      | Notes                       |
| --------- | ------------------------ | ------ | ---------- | --------------------------- |
| 1         | Clarity                  | 15%    | X/10       | ...                         |
| 2         | Completeness             | 20%    | X/10       | ...                         |
| 3         | Technical Depth          | 25%    | X/10       | ...                         |
| 4         | Multi-Tenancy & Security | 20%    | X/10       | ...                         |
| 5         | Scope & Testability      | 10%    | X/10       | ...                         |
| 6         | Migration & Rollback     | 10%    | X/10       | ...                         |
| **Total** | **Weighted**             |        | **X.X/10** | **PASS / ITERATE / REJECT** |

Hard caps checked: [none tripped / list]. Lint cap: [`gate check` result].

---

## Missing Pieces (to reach 10/10)

1. [Specific gap and recommended fix — watch items W1, W2, … become binding Phase 3 tasks]

---

## Iteration History

| #   | Date       | Score | Verdict        | Key Changes        |
| --- | ---------- | ----- | -------------- | ------------------ |
| 1   | YYYY-MM-DD | X.X   | ITERATE / PASS | Initial assessment |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

<!-- {{DOMAIN_CHECKS}}: your always-verify list plus per-category blocks (data,
permissions, frontend, integration). Mark whole categories N/A when not applicable. -->

{{DOMAIN_CHECKS}}

---

## Verdict

[PASS — proceed to Phase 3 / ITERATE — fix gaps, re-score / REJECT — return to Phase 1.]

If PASS, record the `gate check` evidence (or the written waiver with rationale).
