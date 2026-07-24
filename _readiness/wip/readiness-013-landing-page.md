# Readiness Assessment: PRD-013 — Landing Page

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-013-landing-page.md`            |
| Score                  | 8.2/10                                         |
| Verdict                | PASS                                           |
| Iteration              | 1                                              |
| Model Tier (Execution) | high                                           |
| Model Tier (Audit)     | high                                           |
| Scored by              | Claude (Opus 4.8) — same session as PRD author |
| Self-scored            | yes (watch items are binding Phase 3 tasks)    |
| Date                   | 2026-07-24                                     |
| PRD Lint               | passed — `gate check PRD-013` exit 0           |
| State Record           | updated                                        |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale                                                                    |
| ------------------- | ---- | ---------------------------------------------------------------------------- |
| Phase 4 (Execution) | high | Widest UI surface; the fictional-CLI reconciliation and copy discipline are error-prone. |
| Phase 6 (Audit)     | high | Reviewer attacks the egress-scan blind spot, fabricated/fictional copy, and the a11y split. |

---

## Analysis

### 1. Technical Depth & Architecture

- Depends on PRD-012 (`./react`) + PRD-010 (tokens). Composes primitives; no
  component is reimplemented in the app.
- The load-bearing decision: the prototype's fictional CLI surface
  (`gate.toml`/`gate ledger`/four commands) and its live Playground are dropped in
  favour of **real, static, copy-exact CLI output**. This is both honest (no
  fabricated surface) and cheaper (no in-browser simulation). It reverses the
  prototype's centerpiece interactivity — a deliberate, owner-decided trade.

### 2. Edge Cases & Failure Modes

- **W1 — a11y verification split**: only contrast + no-color-only status are
  machine-checkable; focus rings, reduced-motion, and 375px no-h-scroll need a
  real browser → operator rows (`skipped` illegal). Do not overclaim.
- **W2 — egress-scan blind spot**: a static scan cannot see a runtime-assembled
  URL; document it, do not imply completeness.
- **W3 — copy discipline residue**: a banned-word grep catches `PROVEN`/speedup%
  and `gate.toml`/`gate ledger`; it cannot catch a plausible invented number →
  operator row.
- **W4 — vitest introduction**: `apps/web` gains a DOM test env; state it, do not
  smuggle it into the diff.

### 3. Maintainability & DX

- The README durable artifact records the rebuilt-not-copied rationale and the
  rejected prototype facts — exactly the non-derivable knowledge.
- Section-per-file keeps the large page reviewable.

### 4. Migration & Rollback

- Replacing a placeholder page; near-zero migration risk (no public traffic yet).
  Revert is a git revert.

---

## Scorecard (feature weights)

| Dimension                | Weight | Score | Notes                                                        |
| ------------------------ | ------ | ----- | ------------------------------------------------------------ |
| Clarity                  | 15%    | 8.5   | Real-surface + static-output settled; section order explicit  |
| Completeness             | 20%    | 8.0   | a11y split + egress blind spot + vitest stated                |
| Technical Depth          | 25%    | 8.0   | Composition over primitives; fictional-surface reconciliation |
| Multi-Tenancy & Security | 20%    | 8.0   | No auth; no third-party egress; copy discipline               |
| Scope & Testability      | 10%    | 8.0   | Large surface but one app; several claims land as operator rows |
| Migration & Rollback     | 10%    | 8.5   | Placeholder replacement; revert clean                         |

**Weighted: 8.2 — PASS.** Hard caps: security N/A (no route with auth/tenancy),
contract N/A (no client→server payload), lint passed.

---

## Watch Items (binding on Phase 3)

- **W1 — a11y machine vs operator split**, focus/motion/375px are operator rows.
- **W2 — egress-scan blind spot documented** in the script header.
- **W3 — fabricated-number residue** → an operator content-review row.
- **W4 — vitest introduction stated** in §7, devDependency only.

---

## Verdict

**PASS** — proceed to Phase 3 on the owner's Go, AFTER PRD-012 lands (consumes
`@provegate/design/react`). The fictional-CLI reconciliation is the highest-risk
copy work; keep it front-of-mind.
