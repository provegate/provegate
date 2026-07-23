# Readiness Assessment: PRD-005 — Release Readiness

## Quick Meta

| Field                  | Value                                         |
| ---------------------- | --------------------------------------------- |
| PRD                    | `_prds/wip/prd-005-release-readiness.md`      |
| Score                  | 8.7/10                                        |
| Verdict                | PASS                                          |
| Iteration              | 1                                             |
| Model Tier (Execution) | high                                          |
| Model Tier (Audit)     | high                                          |
| Scored by              | Claude (Fable 5) — same session as PRD author |
| Self-scored            | yes (watch items are binding Phase 3 tasks)   |
| Date                   | 2026-07-23                                    |
| PRD Lint               | passed — `gate check PRD-005` exit 0          |
| State Record           | updated                                       |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale                                                                                     |
| ------------------- | ---- | --------------------------------------------------------------------------------------------- |
| Phase 4 (Execution) | high | Small surface, but the tarball IS the product's first artifact — wrong contents ship forever. |
| Phase 6 (Audit)     | high | Reviewer attacks the pack whitelist for gaps and the changeset flow for monorepo bleed.       |

---

## Analysis

### 1. Technical Depth & Architecture

- The pack-audit test turns tarball contents from a hope into an invariant — the
  strongest piece. Whitelist-root + required-files dual assertion catches both
  directions (missing and leaked).
- LICENSE-in-package with byte-identity test is the npm-standard fix for the real
  defect found while drafting (tarball currently ships license-less; the README badge
  points at a file the npm consumer never gets).
- `release.yml` correctly frozen: the PRD adds zero publish/push paths.

### 2. Edge Cases & Failure Modes

- **Monorepo bleed (W3)**: `changeset version` must bump ONLY `provegate` — the
  private apps must not acquire versions/CHANGELOGs. Task must assert the diff scope
  after running it.
- **Changeset file lifecycle**: `changeset version` consumes `.changeset/*.md`; the
  §11 target list names it, but post-version it exists only in git history. Ledger
  evidence = the version diff, not the file.
- **Version-string false positives (W2)**: shipped docs contain legitimate decimals
  (`r = −0.03`, calibration figures). The FR-4 no-hardcoded-version check must match
  version-shaped patterns only (`provegate@x.y.z`, `"version":`), not bare decimals.
- `npm pack --dry-run --json` output parsed via execFile array args — no shell.

### 3. Maintainability & DX

- RELEASING.md as a self-copy do-not-say page keeps the owner procedure inside the
  same claim discipline as the launch copy.
- Pack test self-maintains: future `files` drift fails with the named path.

### 4. Migration & Rollback

- Everything is a git-revertible commit; publish (irreversible) is explicitly outside
  this PRD and stays owner-triggered. Deployment ordering risk: none — no deploy.

---

## Scorecard (infra weights)

| Dimension                | Weight | Score | Notes                                            |
| ------------------------ | ------ | ----- | ------------------------------------------------ |
| Clarity                  | 15%    | 9.0   | Exact targets; every FR has a runnable check      |
| Completeness             | 20%    | 8.5   | W2/W3 edges found in scoring, bound as tasks      |
| Technical Depth          | 20%    | 8.0   | Simple mechanics, correctly frozen surfaces       |
| Multi-Tenancy & Security | 10%    | 9.0   | No auth surface; provenance already wired; no new deps |
| Scope & Testability      | 15%    | 9.0   | Tight non-goals; workflows/src explicitly frozen  |
| Migration & Rollback     | 20%    | 9.0   | All git-revertible; publish stays human           |

**Weighted: 8.7 — PASS.** Hard caps: security N/A (no protected surface), contract
N/A (no new payload), lint passed.

---

## Watch Items (binding on Phase 3)

- **W1 — LICENSE copyright line (owner)**: root LICENSE reads
  `Copyright (c) 2026 Ramazan Ayvaz`. Copying into the package puts the personal name
  in the tarball. Legal attribution is a legitimate exception to the no-personal-names
  rule (MANIFEST rule 3 covers code/examples), but the owner should consciously choose:
  keep the name, or `ProveGate contributors`. Task blocks FR-1 on this call.
- **W2 — version-check precision**: FR-4's no-hardcoded-version scan must not flag
  calibration decimals; match `provegate@\d`/`"version"` patterns only.
- **W3 — monorepo bleed**: after `changeset version`, assert only
  `packages/provegate/{package.json,CHANGELOG.md}` (+ consumed changeset) changed.
- **W4 — pack test runs npm**: needs npm on PATH in CI — already true (setup-node);
  test should fail with a clear message if `npm` is absent, not a cryptic ENOENT.

---

## Verdict

**PASS** — proceed to Phase 3 task generation on the owner's Go. W1 needs the owner's
copyright choice at or before task approval.
