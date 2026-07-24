# Readiness Assessment: PRD-014 — Docs Theming + OG

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-014-docs-theming.md`            |
| Score                  | 8.3/10                                         |
| Verdict                | PASS                                           |
| Iteration              | 1                                              |
| Model Tier (Execution) | high                                           |
| Model Tier (Audit)     | medium                                         |
| Scored by              | Claude (Opus 4.8) — same session as PRD author |
| Self-scored            | yes (watch items are binding Phase 3 tasks)    |
| Date                   | 2026-07-24                                     |
| PRD Lint               | passed — `gate check PRD-014` exit 0           |
| State Record           | updated                                        |

---

## Model Tier Recommendation

| Phase               | Tier   | Rationale                                                                 |
| ------------------- | ------ | ------------------------------------------------------------------------- |
| Phase 4 (Execution) | high   | Fumadocs/Tailwind v4 binding is subtle; the verify-first step de-risks it. |
| Phase 6 (Audit)     | medium | Smaller surface; reviewer checks bind-not-fork, OG input bound, egress.    |

---

## Analysis

### 1. Technical Depth & Architecture

- "Bind, don't fork" is the right instinct: forking a Fumadocs layout makes every
  upgrade a merge conflict. The FR-1 verify-first step (does `--pg-*`→`--color-fd-*`
  binding suffice on Tailwind v4, or is an `@theme` block needed?) converts the
  one real unknown into a checked step rather than a guess.
- Depends on PRD-012 (components for the MDX map) + PRD-010 (tokens). Independent
  of PRD-013 except the shared, additive egress script.

### 2. Edge Cases & Failure Modes

- **W1 — Tailwind v4 binding mechanism** must be confirmed against the installed
  `@fumadocs/base-ui` version before wiring (FR-1); a wrong assumption themes
  nothing.
- **W2 — OG `[...slug]` unbounded** today: arbitrary text into a rendered image;
  bound length + charset with a title fallback.
- **W3 — `lucide-react` must stay**: the no-third-party-icon rule governs OUR
  `Icon`, not Fumadocs internals; do not strip it.
- **W4 — content untouched**: only presentation + the MDX map change;
  `content/docs/**` is not rewritten.

### 3. Maintainability & DX

- Binding rather than forking keeps Fumadocs upgrades clean. The README records
  the binding finding — non-derivable knowledge worth keeping.

### 4. Migration & Rollback

- Presentation-only; reversible via git revert. No content change, no data.

---

## Scorecard (feature weights)

| Dimension                | Weight | Score | Notes                                                     |
| ------------------------ | ------ | ----- | --------------------------------------------------------- |
| Clarity                  | 15%    | 8.5   | 6 FRs, verify-first binding step explicit                  |
| Completeness             | 20%    | 8.0   | Binding mechanism + OG bound + lucide caveat found          |
| Technical Depth          | 25%    | 8.0   | Bind-not-fork; Tailwind v4 de-risked by verify-first        |
| Multi-Tenancy & Security | 20%    | 8.5   | No auth; OG input bounded; no third-party egress            |
| Scope & Testability      | 10%    | 8.0   | Small surface; visual parity is an operator row             |
| Migration & Rollback     | 10%    | 8.5   | Presentation-only; revert clean                             |

**Weighted: 8.3 — PASS.** Hard caps: security N/A (no auth/tenancy route; OG input
bounded), contract N/A (no client→server payload), lint passed.

---

## Watch Items (binding on Phase 3)

- **W1 — verify the Tailwind v4 binding** against the installed Fumadocs version
  before wiring; record the finding.
- **W2 — bound the OG slug** (length + charset + title fallback).
- **W3 — keep `lucide-react`**; do not strip Fumadocs internals.
- **W4 — content untouched**; presentation + MDX map only.

---

## Verdict

**PASS** — proceed to Phase 3 on the owner's Go, AFTER PRD-012 lands (the MDX map
registers `@provegate/design/react`). Smallest of the three web PRDs.
