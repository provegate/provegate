# Readiness Assessment: PRD-012 — React Component Layer

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-012-web-design-adoption.md`     |
| Score                  | 8.4/10                                         |
| Verdict                | PASS                                           |
| Iteration              | 3 (rescoped to the component layer)            |
| Model Tier (Execution) | high                                           |
| Model Tier (Audit)     | high                                           |
| Scored by              | Claude (Opus 4.8) — same session as PRD author |
| Self-scored            | yes (watch items are binding Phase 3 tasks)    |
| Date                   | 2026-07-24                                     |
| PRD Lint               | passed — `gate check PRD-012` exit 0           |
| State Record           | updated                                        |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale                                                                     |
| ------------------- | ---- | ----------------------------------------------------------------------------- |
| Phase 4 (Execution) | high | React + JSX tooling added to a node-only package; the colour-law + prop contracts must be exact. |
| Phase 6 (Audit)     | high | Reviewer attacks the ./cli-stays-React-free guarantee, prop-contract fidelity, and the colour law. |

---

## Analysis

### 1. Technical Depth & Architecture

- The split (owner, 2026-07-24) is the right call: the components are the shared
  root, so they land first as their own small unit; landing (013) and docs (014)
  consume them. This turned a mega-PRD into three reviewable ones.
- Confining React to `./react` while `./cli` stays React-free is the load-bearing
  invariant; PRD-010 already has an import-graph gate, extended here with a
  built-output check.
- The HandoffCard decision (structured `lines[]`, not the CLI string builder) is
  reconciled against the richer landing handoff and dissolves the workspace-cycle
  risk the first readiness pass flagged. Parity moves to the grammar level.

### 2. Edge Cases & Failure Modes

- **W1 — test env split**: React component tests need a DOM env (jsdom/happy-dom);
  the existing node-env tests (tokens/cli/assets) must keep their environment. A
  per-file environment or a scoped vitest config is required, or the node tests
  break.
- **W2 — React leaking into `./cli`**: adding React as a dep risks tsup pulling it
  into the CLI bundle if any `./cli` file imports a react-touching module. The
  built-output assertion (no React in `dist/cli`) is the real guard, not just the
  source import-graph.
- **W3 — peerDependency semantics**: React as a peer means the package must NOT
  bundle its own React; consumers (apps) provide it. Getting peer vs dev vs
  bundled wrong either duplicates React or fails to resolve in a consumer.
- **W4 — `.d.ts.txt` vs landing-handoff API drift**: the two handoffs disagree
  (notably HandoffCard). The landing README is authoritative on CURRENT APIs; the
  `.d.ts.txt` must be reconciled to it, not copied blindly.

### 3. Maintainability & DX

- One implementation of each component, tokenized, is the end state both web apps
  want. The README durable artifact captures the peer-React / React-free split.
- Nine components is real surface; the prop-contract test is what keeps them
  honest against the `.d.ts.txt` files.

### 4. Migration & Rollback

- Purely additive: fills PRD-010's reserved `./react` stub. Revert is a git
  revert; no consumer exists yet (013/014 are later). The `package.json` React
  additions are the only shared-surface change, edited additively.

---

## Scorecard (feature weights)

| Dimension                | Weight | Score | Notes                                                    |
| ------------------------ | ------ | ----- | -------------------------------------------------------- |
| Clarity                  | 15%    | 8.5   | 11 FRs, concrete targets, HandoffCard API settled         |
| Completeness             | 20%    | 8.0   | Test-env split + peer-React edges found in scoring         |
| Technical Depth          | 25%    | 8.5   | React confinement + built-output guard; contracts as API   |
| Multi-Tenancy & Security | 20%    | 8.0   | No tenancy; supply-chain = React peer/dev, no runtime dep   |
| Scope & Testability      | 10%    | 8.5   | Tight surface (src/react only); every invariant has a check |
| Migration & Rollback     | 10%    | 9.0   | Additive; fills a reserved stub; revert clean               |

**Weighted: 8.4 — PASS.** Hard caps: security N/A (no route/endpoint/query path),
contract N/A (no client→server payload), lint passed.

---

## Watch Items (binding on Phase 3)

- **W1 — DOM test env scoped** so node-env tests (tokens/cli/assets) are
  unaffected; component tests run under jsdom/happy-dom.
- **W2 — built-output React guard**: assert `dist/cli` has no React (not just the
  source import graph).
- **W3 — React as peer + dev**, never bundled; verify a consumer resolves one
  React.
- **W4 — reconcile the `.d.ts.txt` against the landing README** where they
  disagree (HandoffCard especially); the README's current API wins.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes                                              |
| --- | ---------- | ----- | ------- | -------------------------------------------------------- |
| 1   | 2026-07-23 | 7.9   | ITERATE | Whole web wave; M1 build-cycle + a11y overclaim          |
| 2   | 2026-07-23 | 8.4   | PASS    | M1–M5 fixed (still the whole wave)                       |
| 3   | 2026-07-24 | 8.4   | PASS    | Rescoped to the component layer; landing→013, docs→014   |

---

## Verdict

**PASS** — proceed to Phase 3 task generation on the owner's Go. This is the root
of the web wave: PRD-013 (landing) and PRD-014 (docs) both consume it, so land it
first. Keep W2 (built-output React guard) and W1 (test-env split) in scope.
