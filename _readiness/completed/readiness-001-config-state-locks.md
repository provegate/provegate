# Readiness Assessment: PRD-001 — Config Core + State/Lock Extraction

## Quick Meta

| Field                  | Value                                                                          |
| ---------------------- | ------------------------------------------------------------------------------ |
| PRD                    | `_prds/wip/prd-001-config-state-locks.md`                                      |
| Score                  | 8.7/10                                                                         |
| Verdict                | PASS                                                                           |
| Iteration              | 1                                                                              |
| Model Tier (Execution) | high                                                                           |
| Model Tier (Audit)     | high                                                                           |
| Scored by              | Claude (Fable 5) — same session as PRD author                                  |
| Self-scored            | yes (Phase 4 must treat watch items as external review notes, not suggestions) |
| Date                   | 2026-07-22                                                                     |
| PRD Lint               | waived — see Verdict (tool is unextracted; substitute structural lint run)     |
| State Record           | pending — state tooling is what this PRD builds (FR-5)                         |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale                                                                                                                                  |
| ------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase 3 (Execution) | high | Score in 8–8.9 band; port work demands semantic fidelity to source scripts (glob engine, queue semantics) where subtle drift is expensive. |
| Phase 4 (Audit)     | high | Cross-model review mandatory (different model family than executor); parity claims in §11 need adversarial checking, not rubber-stamping.  |

---

## Analysis

### 1. Technical Depth & Architecture

- **Config injection over singleton** (§7) is the right call — it kills the source's
  module-level `REPO_ROOT`/`STATE_PATH` constants, which is exactly what made the parent's
  33 P-files hard to extract.
- **Repo-root discovery** replaces `import.meta.url`-relative rooting; the non-git,
  no-config edge is specified to throw a clear error (fixed pre-score).
- **State-file locality** was ambiguous in the draft (worktree AC implied a main-checkout
  state write, which would snapshot the _wrong tree's_ artifacts); fixed pre-score to
  checkout-local state + main-checkout locks — source parity.
- **Scale**: artifact scan is bounded to configured dirs (not repo-wide); pairwise conflict
  detection is O(n²) over _active locks_ — n is agent count, single digits by construction.
  No unbounded growth path.
- **Watch item (W1)**: FR-6 queries must reference status vocab through config keys, not
  re-hardcode `"Approved"`/`"Blocked"` literals — the port's most likely drift point, since
  the source hardcodes exactly these.

### 2. Edge Cases & Failure Modes

- Covered in PRD: absent config (pure defaults), invalid config (aggregate path-tagged
  errors), unknown keys, malformed locks (issue lists, parse-error tolerant listing), stale
  leases, zero-materialization globs (structural overlap), sharedAppendOnly subtraction,
  placeholder-pipe status degradation, empty artifact tree (implied by "absent file = pure
  defaults" + fixture tests).
- **Concurrent `gate status` writers**: last-write-wins on `prds.json` — acceptable because
  the snapshot is regenerable from artifacts (SSOT), but the README config section (durable
  artifact) should say so (W2).
- **Id-width overflow** (`PRD-1000` under width-3): parse fails → artifact invisible to
  state. Inherited source behavior; needs one documented line so an adopter isn't surprised
  (W3).
- **Windows paths**: source posix-normalizes (`split(sep).join("/")`); PRD doesn't name this
  explicitly — port must preserve it or glob matching breaks off-POSIX (W4).

### 3. Maintainability & DX

- Library returns issues / typed errors, CLI owns exit codes — clean layering, testable
  without process spawning.
- Per-FR named test files make the §11 ledger enforceable; the 4 source self-test fixtures
  port as regression anchors.
- Strict TS, no `any`, exports with dts — consistent with the bootstrap skeleton.
- Human output of `gate status` is unpinned — deliberate freedom; `queue --json` is the
  machine surface. Fine for infra class.

### 4. Migration & Rollback

- Pre-release 0.0.0, no published consumers; no data migration; lock schemaVersion 1|2 and
  state schemaVersion 1 ported as-is, so any future Emofy dogfood swap reads existing files.
- Rollback = `git revert` of the PRD's merge — no deploy ordering, no irreversible steps.
- CLI compat: `status`/`queue` go from exit-1 stubs to functional — strictly widening, no
  break. `push` refusal covered by an explicit regression command in §11.

---

## Scorecard

Class `infra` weights (Multi-Tenancy halved, Migration & Rollback inflated to 20%).

| #         | Dimension                | Weight | Score      | Notes                                                                     |
| --------- | ------------------------ | ------ | ---------- | ------------------------------------------------------------------------- |
| 1         | Clarity                  | 15%    | 9/10       | 11/11 FRs have Targets + §11 rows; OQ empty; agent-executable             |
| 2         | Completeness             | 20%    | 8/10       | W1–W4 are real but wording-level; edge cases otherwise well enumerated    |
| 3         | Technical Depth          | 20%    | 8.5/10     | Architecture decisions explicit; parity mapped per symbol                 |
| 4         | Multi-Tenancy & Security | 10%    | 9/10       | No tenant data/routes; execFile-only + no-network + zero-dep locked in    |
| 5         | Scope & Testability      | 15%    | 9/10       | Sharp non-goals with rationale; per-FR runnable commands; success metrics |
| 6         | Migration & Rollback     | 20%    | 9/10       | Pre-release, revert-only, schema versions preserved                       |
| **Total** | **Weighted**             |        | **8.7/10** | **PASS**                                                                  |

Hard caps: **none tripped.** MT&S cap N/A (no routes touched); Contract cap N/A (no FE→BE
payload); Lint cap — see waiver in Verdict.

---

## Missing Pieces (to reach 10/10)

1. **W1 — vocab-driven queries**: when porting FR-6, read `"Approved"`-class semantics from
   `statusVocab` (e.g. a `readyStatuses`/`blockedStatuses` slice or documented canonical-set
   requirement) instead of literals. Phase 3 must carry this as an explicit task.
2. **W2 — concurrent-writer note**: document last-write-wins snapshot semantics in the
   README configuration section (already a durable artifact of this PRD).
3. **W3 — id-width overflow**: one documented line in schemas/README about width exhaustion
   behavior and the config bump path.
4. **W4 — posix path normalization**: preserve the source's repo-path normalization; add a
   fixture with `\`-style input if feasible in CI.

None of these move the verdict; all four must appear in the Phase 3 task list.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes                                                                                                                                    |
| --- | ---------- | ----- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2026-07-22 | 8.7   | PASS    | Initial assessment. Two defects found during scoring were fixed in the PRD pre-verdict (state-file locality, merge semantics) — see Changelog. |

---

## Project-Specific Checklist (provegate)

> Adapted from the parent template; Emofy categories (DB/permissions/frontend/Convex/env)
> are N/A — this is a zero-dependency CLI core with no routes, tenants, or UI.

### Always (every PRD)

- [x] No `any` types — `unknown` with narrowing only (§12)
- [x] Zero runtime dependencies (§11 mechanical check)
- [x] No code path pushes to a git remote; `push` refusal has a regression command (§11)
- [x] No parent-project hardcodes: dirs/branches/labels/thresholds flow through config (§12)
- [x] No personal names in package code or defaults (§12 + §11 grep gate)
- [x] English-only package content (MANIFEST rule; §11 grep gate covers `emofy`/owner name)
- [x] Subprocesses via `execFile`-style array args only, never a shell (§12, added pre-score)

### Extraction discipline (this PRD)

- [x] G-files port as-is; P-files' values lifted to config (FR-by-FR mapping present)
- [x] `GRANDFATHERED` set and PRD-number thresholds explicitly NOT ported
- [x] PRD-312 regression (serial high-water-mark) explicitly barred in §12

---

## Verdict

**PASS — 8.7/10.** Proceed to Phase 3 (task generation) after the owner's Go.

Hard-cap review: MT&S and Contract caps structurally N/A (no routes, no FE→BE payloads).
**Lint cap waiver**: `verify:prd-ready` does not exist yet — it is itself Phase C extraction
scope. Substitute structural lint executed this session with evidence: 0 `TBD|???|to be
decided` strings; 11/11 FRs carry `**Targets:**` lines; 11/11 FRs have §11 command rows;
`## 12. DO NOT` present; `## 9. Open Questions` empty. Waiver reason: the mechanical
substitute covers every check the lint would run at this repo's current state; the real
gate lands with Phase C and must replace this waiver in future PRDs.

Self-scored caveat: the same session authored and scored this PRD. Phase 6 review must be an
independent model/session (already the plan of record), and W1–W4 are binding Phase 3 tasks,
not optional polish.
