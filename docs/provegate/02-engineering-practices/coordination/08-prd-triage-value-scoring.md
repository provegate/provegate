# 08 — PRD triage / value scoring

**Invariant.** Two **orthogonal** gates govern the funnel from idea to execution:
1. a **value/priority triage** — score each candidate on a small fixed set of weighted
   business dimensions, with an explicit "stay-in" and "top-tier" threshold, and an
   *expand-don't-delete* rule (a below-threshold candidate is broadened to absorb adjacent
   problems and re-scored; cut only after N failed expansions, with recorded rationale);
2. a **readiness quality gate** — a **binary** PASS verdict backed by non-negotiable
   *hard caps* (not tunable by decimal points) that a spec must clear before implementation
   starts.

Both scores must be **mechanically re-derivable from their declared sub-scores** — else
authors round the total up to clear the threshold.

**Why it matters.** The value gate stops low-value work from entering the expensive gated
pipeline; the readiness gate stops under-specified work from entering execution. Keeping
them orthogonal prevents "it's important, so ship it half-specified." And the mechanical
re-derivation matters: in the source project's own audit, 19 of 55 hand-written totals
mismatched their sub-scores — every one inflated upward — see seed
`score-must-equal-weighted-sum`.

**Mechanism (generic).**
- **Value triage — 5 weighted dimensions**, each scored 1–5, weighted sum = the value
  score. Emofy's axes (replace with provegate's own): Vision Alignment 0.25, User Impact
  0.25, Technical Leverage 0.20, Strategic Moat 0.15, Risk/Compliance 0.15. Notation in the
  spec: `Value: 3.55 (VA/UE/TK/MO/RU: 4/5/2/3/3)`.
  - **Thresholds:** value ≥ 3.40 → stays a candidate; ≥ 4.00 → top tier (front of queue).
  - **Expand-don't-delete:** below threshold → expand scope + re-score; cut only after two
    expansions still below, with recorded rationale.
- **Readiness gate — binary PASS + hard caps.** A weighted rubric (clarity, completeness,
  technical depth, testability, …) produces a number, but the *verdict is binary*
  (PASS / ITERATE), and domain-specific **hard caps** force ITERATE regardless of the
  weighted total (source-project example: any route change must name a runnable
  cross-tenant-deny test; any new FE→BE payload must have a round-trip contract test). The
  decimal has no predictive power — the caps and the binary verdict are the real gate.
- Mechanical re-derivation applies to the **value score**: a check recomputes the declared
  total from the sub-scores and fails on mismatch. For the readiness gate, the
  machine-checkable part is the *caps + binary verdict* — recomputing its advisory decimal
  adds nothing.

**Provegate implementation.**
1. Define provegate's own value axes (5 dims + weights) + the 3.40 / 4.00 thresholds.
2. Add the value-score notation + a "readiness: PASS/ITERATE" field to the work-item
   template, with project-appropriate hard caps.
3. Add a mechanical check: declared total == Σ(dims×weights); fail on mismatch
   (seed `score-must-equal-weighted-sum`).
4. Adopt expand-don't-delete for triage; record cut rationale.

**De-emofy notes.** Emofy's value axes are strategy-loaded (2026 thesis, pilot metrics,
child-safety/KVKK) — replace wholesale with provegate's axes; keep the 5-dim weighted-sum +
thresholds + expansion structure. **Recalibrate the 3.40 / 4.00 cutoffs** to your own
scoring distribution — they are artifacts of the source project's candidate pool, not
universal constants. The readiness "Multi-Tenancy & Security" dimension and its
hard caps are multitenant-specific — generalize the *pattern* ("binary verdict + domain
hard caps override the weighted total"). Translate Turkish (Eşik→Threshold, hakem→arbiter).
Note: promotion in Emofy is a manual editorial process (no `prd:promote` script) — only an
operator-acceptance script exists. Keep it manual + documented.

**Related.** seed `score-must-equal-weighted-sum` · deepens `00`'s PRD-lifecycle row ·
practice 06 (deferral cap is the same "keep the queue honest" instinct).
