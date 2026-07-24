# Readiness Assessment: PRD-012 — Web Design Adoption

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-012-web-design-adoption.md`     |
| Score                  | 8.4/10                                         |
| Verdict                | PASS                                           |
| Iteration              | 2                                              |
| Model Tier (Execution) | high                                           |
| Model Tier (Audit)     | high                                           |
| Scored by              | Claude (Opus 4.8) — same session as PRD author |
| Self-scored            | yes                                            |
| Date                   | 2026-07-23                                     |
| PRD Lint               | passed — `gate check PRD-012` exit 0           |
| State Record           | updated                                        |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale                                                                                    |
| ------------------- | ---- | -------------------------------------------------------------------------------------------- |
| Phase 4 (Execution) | high | Widest surface of the three PRDs; Fumadocs/Tailwind v4 theming and OG rendering are subtle.   |
| Phase 6 (Audit)     | high | Reviewer attacks the egress-scan blind spot, the copy-discipline residue, and the OG input bound. |

---

## Analysis

### 1. Technical Depth & Architecture

- Putting the components in `@provegate/design` rather than per-app is right, and
  the reasoning (two consumers, drift is the thing the token layer exists to
  prevent) is stated rather than assumed.
- "Bind, don't fork" for Fumadocs is the correct instinct: forking a layout to
  restyle it converts every upgrade into a merge conflict.
- **The card-parity test as specified cannot be built.** FR-2 puts
  `card-parity.test.ts` in `packages/design`, comparing the React card against
  `packages/provegate`'s `cards.ts` builder. But `provegate` devDepends on
  `design` (PRD-011 FR-1), so this test edge closes a workspace cycle, and turbo's
  `dependsOn: ["^build"]` cannot order it. This is a build-graph deadlock, not a
  style preference — see M1.
- The Fumadocs binding assumes plain CSS custom properties are enough. `apps/docs`
  runs `@fumadocs/base-ui` v16 on Tailwind v4, where theme values commonly flow
  through `@theme`. The strategy is plausible but unverified against the installed
  versions.

### 2. Edge Cases & Failure Modes

- **A11y verification is overclaimed (M2).** FR-8 bundles four assertions behind
  one `a11y.test.ts` row, but only contrast is computable headlessly. Focus rings,
  `prefers-reduced-motion`, and "no horizontal scroll at 375px" need a real browser
  or a human. As written, the §11 row promises machine evidence the test cannot
  produce — precisely the failure this method exists to prevent.
- **Egress scanning has a blind spot.** A static scan of built output cannot see a
  URL assembled at runtime. Honest, but the PRD should say so rather than let the
  gate imply completeness.
- **Copy discipline is only partly checkable.** A banned-word grep catches
  `PROVEN` and a speedup percentage; it cannot catch a plausible invented number.
  That residue belongs in an operator row, explicitly.
- **OG route input**: the docs OG route renders an arbitrary `[...slug]` into an
  image. Not an auth surface, but unbounded text into a rendered image deserves a
  length/charset bound.
- `apps/web` currently has no test runner; FR-8/FR-9 silently introduce vitest and
  its devDependencies. Unstated dependency growth.

### 3. Maintainability & DX

- One component implementation shared by two apps, all values tokenized — the
  right end state.
- The README durable artifact (why the kits were rebuilt, which kit facts were
  rejected) captures exactly the non-derivable knowledge worth keeping.
- Scope is the largest of the three PRDs: nine components, a landing rebuild, a
  docs re-theme, an OG surface, a new repo script, and two new test suites. Each is
  defensible; together they make one review face wide enough to hide a mistake in.

### 4. Migration & Rollback

- Replacing a placeholder landing page carries near-zero migration risk; the site
  is not yet public traffic.
- `apps/docs` theming is reversible via git revert; no content is touched.
- Depends on PRD-010 and extends `packages/design/**`, so it serializes behind it.

---

## Scorecard (feature weights)

| Dimension                | Weight | Score | Notes                                                          |
| ------------------------ | ------ | ----- | -------------------------------------------------------------- |
| Clarity                  | 15%    | 8.0   | Targets concrete; the parity test's home is wrong               |
| Completeness             | 20%    | 7.5   | A11y verification overclaims; vitest introduction unstated      |
| Technical Depth          | 25%    | 8.0   | Binding strategy sound but unverified against Tailwind v4       |
| Multi-Tenancy & Security | 20%    | 8.0   | No auth surface; OG slug input unbounded; no third-party egress |
| Scope & Testability      | 10%    | 7.5   | Four surfaces in one PRD; several claims land as operator rows  |
| Migration & Rollback     | 10%    | 8.5   | Placeholder replacement; revert clean                           |

**Iteration 1 weighted: 7.9 — ITERATE.** Iteration 2, after M1–M5 were fixed in
the PRD (see Iteration History), re-scores the affected dimensions: Clarity 8.5
(parity test relocated, its cycle dissolved), Completeness 8.5 (a11y split honest,
vitest growth stated), Technical Depth 8.5 (Fumadocs binding now a verify-first
step), Scope & Testability 8.0. **Iteration 2 weighted: 8.4 — PASS.** Hard caps:
security N/A (no route with an auth or tenancy path; OG slug now bounded), contract
N/A (no client→server payload), lint passed.

---

## Missing Pieces — all resolved in iteration 2

Each was fixed in the PRD before this re-score; kept here as the record of what the
gate caught.

1. **M1 — resolve the card-parity cycle.** ✅ RESOLVED via option (a): PRD-010
   FR-11 now authors the card + status-line string builders in
   `@provegate/design/cli`; PRD-011 consumes them and PRD-012 FR-2 renders their
   output, so there is one implementation and no cross-package parity test. PRD-011
   FR-1/FR-4 were updated to match — the cross-PRD decision this flagged.

<details><summary>Original finding (iteration 1)</summary>

1. **M1 — resolve the card-parity cycle.** Pick one: (a) move the card and
   status-line string builders into `@provegate/design/cli` as the single
   implementation and have `packages/provegate` consume them — cleanest, but it
   changes PRD-011's FR-4 and must be decided before PRD-011 starts; (b) keep the
   builders in `provegate` and test parity from `provegate` instead, with the web
   component importing them; (c) drop the parity test and accept drift. (a) or (b);
   (c) contradicts the PRD's own goal. **This is a cross-PRD decision, not a local
   edit.**

</details>

2. **M2 — split FR-8 honestly.** ✅ RESOLVED: FR-8 now machine-checks contrast over
   token pairs + no-color-only status; focus rings, reduced motion and 375px
   no-h-scroll moved to operator rows where `skipped` is illegal.
3. **M3 — state the dependency growth.** ✅ RESOLVED: §7 Dependencies now names the
   vitest introduction to `apps/web` as devDependency-only.
4. **M4 — verify the Fumadocs binding before committing to it.** ✅ RESOLVED: FR-5
   now leads with a verify-against-installed-versions step before wiring.
5. **M5 — bound the OG slug.** ✅ RESOLVED: FR-6 bounds length + charset with a
   title fallback; §11 greps the bound.

## Optional (would raise the score, not required)

- **Split the PRD.** Components (`packages/design/src/react/**` + parity) is a
  clean unit; landing + docs theming is another. Two smaller conflict surfaces
  could run in parallel and would each review better. Recommended if the wave is
  not time-boxed.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes                                                       |
| --- | ---------- | ----- | ------- | ----------------------------------------------------------------- |
| 1   | 2026-07-23 | 7.9   | ITERATE | Initial assessment — M1 card-parity cycle, M2 a11y overclaim + 3  |
| 2   | 2026-07-23 | 8.4   | PASS    | M1 (builders → design pkg, PRD-011 updated), M2–M5 fixed in PRD   |

---

## Verdict

**PASS (iteration 2)** — the iteration-1 gaps were specification defects, not
research gaps, and all five (M1–M5) were fixed in the PRD before this re-score. M1
was settled the way it had to be — the shared string builders now live in
`@provegate/design/cli` (PRD-010 FR-11) and PRD-011's FR-1/FR-4 were updated to
consume them — so PRD-011 must enter Phase 3 with that scope, not its original one.
Proceed to Phase 3 on the owner's Go, after PRD-010 lands.

The optional split-the-PRD suggestion still stands (components vs landing+docs) if
the wave is not time-boxed; it would improve reviewability but is not required to
pass.
