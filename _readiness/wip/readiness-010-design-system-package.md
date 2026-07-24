# Readiness Assessment: PRD-010 — Design System Package

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-010-design-system-package.md`   |
| Score                  | 8.5/10                                         |
| Verdict                | PASS                                           |
| Iteration              | 1                                              |
| Model Tier (Execution) | high                                           |
| Model Tier (Audit)     | high                                           |
| Scored by              | Claude (Opus 4.8) — same session as PRD author |
| Self-scored            | yes (watch items are binding Phase 3 tasks)    |
| Date                   | 2026-07-23                                     |
| PRD Lint               | passed — `gate check PRD-010` exit 0           |
| State Record           | updated                                        |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale                                                                                   |
| ------------------- | ---- | ------------------------------------------------------------------------------------------- |
| Phase 4 (Execution) | high | A generator whose output is committed and byte-gated punishes sloppiness; font/CSS resolution across package boundaries is fiddly. |
| Phase 6 (Audit)     | high | Reviewer attacks generator determinism, the CLI entry's import graph, and vendored-asset provenance. |

---

## Analysis

### 1. Technical Depth & Architecture

- The single-source/generated-output design is the right answer to the drift risk
  the handoff names, and committing the output (rather than building it) makes the
  token diff visible in review — a real advantage for a system whose whole claim is
  "evidence over assertion".
- Splitting `./cli` from `./react`/`./styles.css` at the exports level, then
  proving the split with an import-graph test, is cheaper and more durable than
  auditing bundles after the fact.
- `private: true` correctly defers the npm namespace question and keeps the
  published surface at exactly one package.
- Typing the verdict set and semantic slots turns the color law into something a
  compiler enforces. Good; the law is the part most likely to erode.

### 2. Edge Cases & Failure Modes

- **Formatter vs generator (W1)**: prettier/eslint will happily reformat the
  generated `colors.css` and `theme.ts`, and the byte-identity gate will then fail
  on a clean checkout. Either the generator emits already-formatted output or the
  files are ignored by the formatter — decided once, tested both ways.
- **Font pipeline (W2)**: "woff2 subsets" implies a subsetting toolchain this repo
  does not have and should not grow. Vendor the upstream IBM Plex woff2 files
  as-published, record source URL + checksum, and skip custom subsetting.
- **Relative URL resolution (W3)**: `@font-face src` inside
  `node_modules/@provegate/design/src/tokens/fonts.css` must resolve to
  `../../assets/fonts/*` from every consuming bundler. This is the most likely
  silent breakage and cannot be caught by the CSS-content test alone.
- **Import-graph honesty (W4)**: a test that only inspects the entry file proves
  nothing. It must walk transitively and fail on the first `.css`, React, or
  non-relative import.
- Generator determinism beyond formatting: key order, number formatting, and the
  trailing newline must be pinned, or the gate becomes flaky rather than useful.

### 3. Maintainability & DX

- One authoring file, one generator, two outputs, one gate — a maintainer changing
  a color has exactly one place to look and one command to run.
- The README is a real durable artifact (the origin rule and the color law are not
  derivable from the code).
- Risk of a second source appearing later (a hex in a component) is mitigated by
  the typed slots but not mechanically prevented in this PRD; PRD-012 inherits it.

### 4. Migration & Rollback

- Purely additive: a new workspace package plus a turbo entry. Nothing consumes it
  in this PRD, so revert is `git revert` with no consumer fallout.
- The `turbo.json` edit is the only shared-surface change; a mistake there degrades
  cache behavior, not correctness.

---

## Scorecard (feature weights)

| Dimension                | Weight | Score | Notes                                                       |
| ------------------------ | ------ | ----- | ----------------------------------------------------------- |
| Clarity                  | 15%    | 9.0   | Ten FRs, concrete targets, overrides of the handoff stated  |
| Completeness             | 20%    | 8.0   | Font pipeline + contrast verification found in scoring      |
| Technical Depth          | 25%    | 8.5   | Generator/gate design sound; determinism needs pinning      |
| Multi-Tenancy & Security | 20%    | 8.0   | No tenancy surface; supply chain = vendored fonts, provenance recorded |
| Scope & Testability      | 10%    | 9.0   | Tight surface, every invariant has a runnable check         |
| Migration & Rollback     | 10%    | 9.0   | Additive; no consumers; revert clean                        |

**Weighted: 8.5 — PASS.** Hard caps: security N/A (no route, endpoint, or query
path), contract N/A (no client→server payload), lint passed.

---

## Watch Items (binding on Phase 3)

- **W1 — generator vs formatter**: pin output formatting so a clean checkout
  regenerates byte-identically; add the decision (ignore-list or pre-formatted
  emit) to the README.
- **W2 — font provenance**: vendor upstream IBM Plex woff2 unmodified, commit
  `OFL.txt`, record source URL and checksum; no subsetting toolchain.
- **W3 — cross-package URL resolution**: a test (or a consuming smoke build) that
  proves the `@font-face` `src` resolves from a consumer, not just that the file
  contains no `http`.
- **W4 — transitive import-graph test**: walk the whole graph from the `./cli`
  entry, fail on any CSS/React/third-party edge.
- **W5 — contrast is asserted but unproven**: the handoff claims AA throughout.
  Add a pure-function contrast test over the semantic token pairs (text-on-surface,
  status-on-terminal-bg) in this package, so the claim is machine-checked at the
  token layer instead of only in the browser wave.

---

## Post-score amendment (FR-11 added)

Scoring PRD-012 surfaced a build-graph cycle (its card-parity test had
`packages/design` depending on `packages/provegate`, which devDepends on design).
The fix moves the card + status-line **string builders** into
`@provegate/design/cli` as the single implementation. That is added here as
**FR-11** (pure string builders, card text byte-identical to today's
`cards.ts`, plus `test/cards.test.ts`). It does not change this PRD's verdict — the
work is small, additive, and inside the existing conflict surface — but it makes
PRD-010 the sole home of the card strings, which PRD-011 and PRD-012 then consume.
Score stands at 8.5 PASS.

## Verdict

**PASS** — proceed to Phase 3 task generation on the owner's Go. This is the root
of the chain: PRD-011 and PRD-012 both consume it (tokens, fonts, assets, and now
the shared card builders), so land it first and keep W5's contrast gate in scope
rather than deferring it downstream.
