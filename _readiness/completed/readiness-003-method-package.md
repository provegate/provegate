# Readiness Assessment: PRD-003 — Method Package

## Quick Meta

| Field                  | Value                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| PRD                    | `_prds/wip/prd-003-method-package.md`                                                  |
| Score                  | 8.7/10                                                                                 |
| Verdict                | PASS                                                                                   |
| Iteration              | 1                                                                                      |
| Model Tier (Execution) | high                                                                                   |
| Model Tier (Audit)     | high                                                                                   |
| Scored by              | Claude (Fable 5) — same session as PRD author                                          |
| Self-scored            | yes (watch items are binding Phase 3 tasks)                                            |
| Date                   | 2026-07-22                                                                             |
| PRD Lint               | **passed — `gate check PRD-003` exit 0** (first real lint row; the waiver era is over) |
| State Record           | updated (`gate status` — PRD-003 Draft visible)                                        |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale                                                                                                                     |
| ------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------- |
| Phase 3 (Execution) | high | ~2,500 LOC-equivalent of calibrated method prose; translation fidelity and de-parenting judgment are the hard part, not code. |
| Phase 4 (Audit)     | high | Reviewer must diff calibrated numbers against the snapshot and hunt parent residue — prose review at adversarial depth.       |

---

## Analysis

### 1. Technical Depth & Architecture

- **The round-trip architecture is the PRD's spine**: templates validated by the very
  parsers that will consume adopters' artifacts (`lintPrd`, `validateReviewArtifact`,
  `validateTasksReviewRow`, `buildState`). Template↔engine drift becomes a red test.
  This is the correct inversion — content conforms to shipped code, never vice versa.
- **Unshipped-tooling policy** was missing from the draft (prompts could have named
  parent commands with no shipped equivalent, or silently dropped method steps); found
  in scoring, fixed pre-verdict in FR-2 + §7.
- **Calibration protection** is explicit and testable: weights/classes/hard-caps/quorum
  are pinned by §12 and belong in the Phase 6 review brief (W4).

### 2. Edge Cases & Failure Modes

- **W1 — round-trip fill map**: raw templates carry `{{…}}` command placeholders that
  the safety parser would flag as unsafe; the round-trip tests must substitute
  allowlist-safe real values before invoking the engine. The fill map is a Phase 3
  deliverable, not an improvisation.
- **W2 — hygiene character policy**: "English-only" must be a precise class — Turkish
  letters (`çğıöşüÇĞİÖŞÜ`) fail; typographic non-ASCII (em-dash, arrows, ≥) is legal.
  Spelled out in the test, or the gate is noise.
- **W3 — CLI-mention audit**: extract `gate <subcommand>` mentions from prompts and
  assert membership in the CLI usage list — mechanical enforcement of US-1/AC-1.
- Dogfood already caught one hazard class: pipes inside backticked §11 table commands
  (the FR-4 row) — `gate check` flagged it on the draft's first lint. Recorded in the
  changelog; the phase-1 prompt port should carry this authoring note forward (W5,
  small).

### 3. Maintainability & DX

- PLACEHOLDERS.md as a registry with a declaration-enforcing test keeps token sprawl
  impossible. Manual substitution is the right v1 (a `gate init` renderer is a scoped-out
  follow-up, correctly).
- Volume risk (~2,500 LOC-equivalent prose) is the completeness hazard; the mechanical
  gates catch structure and hygiene, but translation fidelity rests on Phase 6 — hence
  the audit-tier recommendation and W4.

### 4. Migration & Rollback

- Purely additive content + a `files` field entry; no engine changes (§12 bars `src/`
  edits). Rollback = revert the merge. No deploy, no data, no consumer breakage — the
  package is still pre-release.

### Security note (MT&S)

- No execution surface changes. Example gate scripts are node-builtins-only and run in
  tests with pass/fail fixtures. The real MT&S risk for content is leakage — parent
  internals, personal names — and that is exactly what the hygiene gate greps kill,
  at vitest level and again at §11 shell level.

---

## Scorecard

Class `feature` weights (full 6-dimension formula).

| #         | Dimension                | Weight | Score      | Notes                                                                     |
| --------- | ------------------------ | ------ | ---------- | ------------------------------------------------------------------------- |
| 1         | Clarity                  | 15%    | 9/10       | 10/10 FRs have Targets + §11 rows; real lint green from draft one         |
| 2         | Completeness             | 20%    | 8/10       | Policy gap found + fixed pre-score; prose-volume risk remains (W1–W5)     |
| 3         | Technical Depth          | 25%    | 8.5/10     | Round-trip inversion strong; content fidelity inherently softer than code |
| 4         | Multi-Tenancy & Security | 20%    | 9/10       | Leakage-focused hygiene gates at two levels; zero-dep examples            |
| 5         | Scope & Testability      | 10%    | 9/10       | Sharp non-goals (55 domain gates stay out); content machine-verified      |
| 6         | Migration & Rollback     | 10%    | 9/10       | Additive, revert-only, no engine changes                                  |
| **Total** | **Weighted**             |        | **8.7/10** | **PASS**                                                                  |

Hard caps: **none tripped.** MT&S cap N/A (no routes); Contract cap N/A (no FE→BE
payload); **Lint cap: satisfied by the real gate** — `gate check PRD-003` exit 0.

---

## Missing Pieces (to reach 10/10)

1. **W1 — placeholder fill map** for round-trip tests: documented substitution table,
   command values allowlist-safe.
2. **W2 — hygiene character classes**: Turkish letter class fails; typographic
   non-ASCII allowlisted — both explicit in the test.
3. **W3 — CLI-mention audit test**: `gate <sub>` mentions in prompts ⊆ CLI usage list.
4. **W4 — Phase 6 brief**: codex primed to diff calibrated numbers (weights, class
   tables, caps, quorum) against the snapshot and to hunt parent residue and invented
   doctrine.
5. **W5 — authoring hazard note**: the table-pipe lesson (no `|` inside backticked §11
   table commands) lands in the phase-1 prompt's §11 guidance.

All binding Phase 3 tasks.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes                                                                                                  |
| --- | ---------- | ----- | ------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | 2026-07-22 | 8.7   | PASS    | Initial assessment. Unshipped-tooling policy added pre-verdict; `gate check` had already fixed the FR-4 row. |

---

## Project-Specific Checklist (provegate)

### Always (every PRD)

- [x] No `any` types — no engine code in scope at all (§12 bars `src/`)
- [x] Zero runtime dependencies (examples node-builtins only)
- [x] No push code path touched; push-refusal §11 regression retained
- [x] No parent-project hardcodes — the entire PRD is about removing them, gated twice
- [x] No personal names (hygiene greps at vitest + shell level)
- [x] English-only shipped content (hygiene gate, W2 precision)
- [x] Real PRD lint: `gate check PRD-003` green — no waiver

### Extraction discipline (this PRD)

- [x] Calibrated numbers pinned (§12): weights, class tables, hard caps, 5-lens quorum
- [x] Codex-starter renumber drift fix specified (inventory side-finding #1)
- [x] AT-list prompts (sis-ema, repo-cleanup, bug-sweep) explicitly excluded
- [x] No invented doctrine — port and generalize only (§12)

---

## Verdict

**PASS — 8.7/10.** Proceed to Phase 3 after the owner's Go.

Lint evidence: `gate check PRD-003` exit 0 (structural lint + manifest hard caps),
recorded above — the first readiness report in this repo with a machine lint row instead
of a waiver. Self-scored caveat: same session authored and scored; Phase 6 review is
codex with the W4 brief. W1–W5 are binding Phase 3 tasks.
