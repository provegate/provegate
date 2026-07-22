# Readiness Assessment: PRD-004 — Launch Surface

## Quick Meta

| Field                  | Value                                            |
| ---------------------- | ------------------------------------------------ |
| PRD                    | `_prds/wip/prd-004-launch-quickstart.md`         |
| Score                  | 8.7/10                                           |
| Verdict                | PASS                                             |
| Iteration              | 1                                                |
| Model Tier (Execution) | high                                             |
| Model Tier (Audit)     | high                                             |
| Scored by              | Claude (Fable 5) — same session as PRD author    |
| Self-scored            | yes (watch items are binding Phase 3 tasks)      |
| Date                   | 2026-07-22                                       |
| PRD Lint               | passed — `gate check PRD-004` exit 0 (draft one) |
| State Record           | updated                                          |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale                                                                                                           |
| ------------------- | ---- | ------------------------------------------------------------------------------------------------------------------- |
| Phase 4 (Execution) | high | Engine changes to the review gate + a new filesystem-writing command + launch prose where every claim is auditable. |
| Phase 6 (Audit)     | high | Reviewer must attack the quorum arithmetic, init's write paths, and every evidence figure against its source.       |

---

## Analysis

### 1. Technical Depth & Architecture

- **Quorum rule design is the PRD's best decision**: ratio ≥ 3/5 as integer math makes
  `1/1` the degenerate full-quorum pass — doctrine holds without the invented
  exception PRD-003's review killed. Historical artifacts (all `1/1 pass`) remain
  valid without retro-editing, satisfying the records-not-inputs principle.
- **Init before config** was unspecified in the draft (every prior command requires a
  discoverable root; init must bootstrap one) — found in scoring, fixed: nearest
  `.git` up from cwd, else cwd.
- **Scaffold-passes-wiring AC was false as drafted**: a fresh non-node repo has no
  `package.json`, and the wiring audit's script-existence direction would fail the
  default manifest commands. Fixed pre-score: direction skipped when there is nothing
  to audit against. This is a real engine semantics change and Phase 6 should poke it
  (can a node repo evade the audit by deleting package.json? — no: a node repo's
  manifest commands still execute at gate run and fail loud; the audit is advisory
  wiring hygiene, not the execution gate) (W1).

### 2. Edge Cases & Failure Modes

- Quorum: malformed forms (`5/3`, `0/0`, non-integer, missing ` pass`) all issue;
  `0/5` fails ratio; strictness applies at parse regardless of verdict (W3: integer
  math, no float).
- Init: partial trees skip per-path; never overwrites; `--dry-run` plans.
- **Do-not-say false positives** found in scoring: the whitepaper _quotes_ external
  measured percentages (the METR RCT's numbers) — a blanket percentage ban would fail
  the evidence pages for doing evidence right. Fixed pre-score: two page classes
  (strict self-copy vs evidence pages with consistency checks) (W2).
- Quickstart rot risk: W4 — the audit test should _execute_ the init portion of the
  quickstart in a fixture, not just grep the commands.

### 3. Maintainability & DX

- The do-not-say lint turns launch-copy discipline into a permanent gate — every
  future copy edit is linted against the positioning contract.
- Number-consistency test between case study and whitepaper kills silent figure drift.

### 4. Migration & Rollback

- Stricter review gate is a deliberate breaking change, pre-release, documented in §7;
  all historical artifacts still validate (verified reasoning above).
- Init is additive-only by §12; rollback = revert; no deploy; publication acts remain
  owner keystrokes (explicit non-goal).

### Security note (MT&S)

- New write surface (`gate init`) is additive-only with per-path skip reporting — no
  overwrite, no delete, no shell. Launch content risk is claims, not code — the lint
  is the control. Package-surface hygiene grep extended to QUICKSTART.md.

---

## Scorecard

Class `feature` weights.

| #         | Dimension                | Weight | Score      | Notes                                                             |
| --------- | ------------------------ | ------ | ---------- | ----------------------------------------------------------------- |
| 1         | Clarity                  | 15%    | 9/10       | 10/10 FRs targeted + §11 rows; lint green from draft one          |
| 2         | Completeness             | 20%    | 8/10       | Two real gaps found in scoring, fixed pre-verdict; W1–W4 remain   |
| 3         | Technical Depth          | 25%    | 8.5/10     | Quorum design strong; init/wiring semantics now explicit          |
| 4         | Multi-Tenancy & Security | 20%    | 9/10       | Additive-only writes; claims controlled by lint; hygiene extended |
| 5         | Scope & Testability      | 10%    | 9/10       | Publication acts and competitor claims cleanly out of scope       |
| 6         | Migration & Rollback     | 10%    | 9/10       | Breaking gate change deliberate + historically compatible         |
| **Total** | **Weighted**             |        | **8.7/10** | **PASS**                                                          |

Hard caps: **none tripped.** MT&S cap N/A (no routes); Contract cap N/A; Lint cap —
`gate check PRD-004` exit 0.

---

## Missing Pieces (to reach 10/10)

1. **W1 — wiring-audit semantics test**: package.json-absent skip covered by test, plus
   the node-repo-cannot-evade reasoning documented in the audit's comment.
2. **W2 — page-class split in the lint**: strict set vs evidence set, both tested with
   deliberate violations.
3. **W3 — integer quorum math**: `N * 5 >= M * 3`, with boundary tests (3/5, 2/5, 1/1,
   5/5, 2/3 [passes: 10≥9], 1/2 [fails: 5<6]).
4. **W4 — quickstart executes**: the test runs the quickstart's init sequence in a
   fixture repo and asserts the promised state, beyond grepping command names.

All binding Phase 3 tasks.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes                                                                                                 |
| --- | ---------- | ----- | ------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | 2026-07-22 | 8.7   | PASS    | Initial assessment. Init root resolution, wiring-absent semantics, and lint page classes fixed pre-verdict. |

---

## Project-Specific Checklist (provegate)

### Always (every PRD)

- [x] No `any` (§12 inherited discipline)
- [x] Zero runtime dependencies
- [x] No push code path; push-refusal regression retained; publication acts owner-only
- [x] No parent hardcodes; whitepaper anonymized by default (owner editorial option)
- [x] No personal names; hygiene grep extended to new package surfaces
- [x] Real PRD lint green (`gate check PRD-004`)

### This PRD

- [x] Quorum doctrine preserved (ratio ≥ 3/5; the PRD-003 lesson is one review old — §12 pins it)
- [x] Do-not-say list mechanical (self-copy strict; evidence pages consistency-checked)
- [x] Init additive-only, ever (§12)
- [x] No retro-editing of historical review artifacts (§12)

---

## Verdict

**PASS — 8.7/10.** Proceed to Phase 3 after the owner's Go.

Lint evidence: `gate check PRD-004` exit 0 on the first draft and after pre-score
edits. Self-scored caveat: same session authored and scored; Phase 6 is codex, primed
at the quorum arithmetic, init write paths, and figure-to-source fidelity. W1–W4 are
binding Phase 3 tasks.
