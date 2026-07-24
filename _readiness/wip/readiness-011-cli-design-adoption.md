# Readiness Assessment: PRD-011 — CLI Design Adoption

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-011-cli-design-adoption.md`     |
| Score                  | 8.3/10                                         |
| Verdict                | PASS                                           |
| Iteration              | 1                                              |
| Model Tier (Execution) | high                                           |
| Model Tier (Audit)     | high                                           |
| Scored by              | Claude (Opus 4.8) — same session as PRD author |
| Self-scored            | yes (watch items are binding Phase 3 tasks)    |
| Date                   | 2026-07-23                                     |
| PRD Lint               | passed — `gate check PRD-011` exit 0           |
| State Record           | updated                                        |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale                                                                                     |
| ------------------- | ---- | --------------------------------------------------------------------------------------------- |
| Phase 4 (Execution) | high | Touches every command's output plus the runner's result path; the zero-dependency invariant is easy to break silently. |
| Phase 6 (Audit)     | high | Reviewer attacks the published manifest, the no-color identity claim, and the public API shape change. |

---

## Analysis

### 1. Technical Depth & Architecture

- Keeping the reporter as an optional CLI-supplied callback preserves the
  substrate split the method itself argues for: core computes, CLI presents. The
  PRD names this explicitly, which is what stops an implementing agent from
  "helpfully" adding a logger to the runner.
- One capability-detection choke point is what makes the color/no-color identity
  test meaningful; scattered `isTTY` checks would make it vacuous.
- devDependency + tsup inlining is the correct way to consume shared tokens
  without adding a runtime dependency — and the PRD gates it on the published
  manifest rather than trusting the build.
- Space-padded alignment (no unicode rules) keeps `grep PRD-001` working; a table
  that broke grep would be a regression dressed as a design win.

### 2. Edge Cases & Failure Modes

- **Public API shape (M1)**: FR-6 may need structured overlap data on
  `ClaimResult`, whose type is re-exported from `src/index.ts` — a file **not** in
  the conflict surface. Either the change stays strictly additive (new optional
  field, existing `issues` untouched) or `src/index.ts` joins the surface.
- **Determinism of the identity test (W1)**: diffstats, paths, and durations vary
  per run, so "strip ANSI == NO_COLOR output" must compare two renderings of the
  same fixture, not two live runs.
- **NO_COLOR semantics (W2)**: the convention is presence-with-non-empty-value;
  pick one reading, document it, test the empty-string case explicitly.
- **Truecolor detection (W2)**: absent `COLORTERM`, fall back to the 16-color
  floor rather than emitting truecolor and hoping. A wrong guess produces garbage
  on exactly the terminals least able to complain.
- **Quoted-output drift (W3)**: `--help`, the status table, and the plan view are
  reproduced inside `METHOD.md`, `QUICKSTART.md`, the shipped prompts, and the docs
  site. Changing the strings without sweeping those leaves the package documenting
  a CLI that no longer exists.
- **Pack manifest churn (W4)**: `test/pack-manifest.json` is an exact file list;
  bundling a new workspace package must not introduce chunks that churn it.

### 3. Maintainability & DX

- After this lands, every glyph and escape has exactly one authoring site, and a
  test forbids a second one — the same shape as PRD-010's token rule.
- The status table becomes prettier for humans and no better for machines;
  `gate status` still has no `--json`, unlike `queue`. Not a blocker, but it is
  the natural follow-up and should be named rather than discovered later.
- Per-gate lines materially improve long-run debuggability, which is the actual DX
  win here.

### 4. Migration & Rollback

- Output-only change: no state, schema, or exit-code movement. Revert is a git
  revert with no data implications.
- It *is* a user-visible break for anyone parsing human output — acceptable
  pre-1.0, and `--json` remains the supported machine path.
- Depends on PRD-010; overlaps PRD-008 on `cli.ts`/`open.ts` and will serialize at
  claim time, which is the lock layer working as designed.

---

## Scorecard (feature weights)

| Dimension                | Weight | Score | Notes                                                        |
| ------------------------ | ------ | ----- | ------------------------------------------------------------ |
| Clarity                  | 15%    | 8.5   | Specimens are copy-exact targets; FRs map cleanly to files    |
| Completeness             | 20%    | 8.0   | `index.ts` API gap and doc-drift sweep found in scoring       |
| Technical Depth          | 25%    | 8.5   | Reporter design, choke-point detection, bundling proof        |
| Multi-Tenancy & Security | 20%    | 8.0   | No tenancy; supply-chain risk is the bundled devDependency, gated on the published manifest |
| Scope & Testability      | 10%    | 8.5   | Every claim has a runnable check; identity test needs fixtures |
| Migration & Rollback     | 10%    | 8.0   | Human-output break, pre-1.0, revert trivial                   |

**Weighted: 8.3 — PASS.** Hard caps: security N/A (no route, endpoint, or query
path; no auth surface), contract N/A (no client→server payload), lint passed.

---

## Missing Pieces (fix during Phase 3, no re-score required)

1. **M1 — `src/index.ts`**: ✅ RESOLVED — added to the Conflict Surface, and FR-6
   now states the `ClaimResult` change is additive-only (new optional field,
   `issues` untouched).

**Cross-PRD amendment (from PRD-012 scoring):** PRD-012's card-parity test created
a workspace build cycle. The resolution moves the card + status-line string
builders into `@provegate/design/cli` (PRD-010 FR-11). PRD-011 FR-1 and FR-4 were
updated accordingly: FR-1 also re-exports the shared builders, and FR-4 now
**retires** the local `cards.ts` construction (re-exporting the shared builder,
applying color at the CLI) instead of colorizing an in-package builder. Net scope
is unchanged — the card text is still byte-preserved and a fixture test proves it —
but the string source of truth is now the design package. Score stands at 8.3 PASS.

## Watch Items (binding on Phase 3)

- **W1 — fixture-based identity test**: compare two renderings of one fixture;
  never two live runs.
- **W2 — capability semantics**: pin `NO_COLOR` (empty-string case) and the
  truecolor fallback direction; test both.
- **W3 — documentation sweep**: every place the repo quotes CLI output
  (`METHOD.md`, `QUICKSTART.md`, `prompts/**`, `apps/docs/content/**`) is checked
  and updated in the same merge, or the drift is recorded.
- **W4 — pack manifest**: rebuild and diff `test/pack-manifest.json`; no new
  chunks, no new published files, `dependencies` still absent.
- **W5 — status `--json`**: name it as a follow-up item now (out of scope here) so
  the machine path for `gate status` is not silently forgotten.

---

## Verdict

**PASS** — proceed to Phase 3 task generation on the owner's Go, after PRD-010
lands. Sequence against PRD-008 deliberately: both claim `cli.ts` and `open.ts`,
and PRD-008 is the smaller rebase burden if it goes first.
