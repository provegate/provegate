# Readiness Assessment: PRD-002 — Gate Manifest + Autorun Runner

## Quick Meta

| Field                  | Value                                                                     |
| ---------------------- | ------------------------------------------------------------------------- |
| PRD                    | `_prds/wip/prd-002-gate-manifest-runner.md`                               |
| Score                  | 8.65/10                                                                   |
| Verdict                | PASS                                                                      |
| Iteration              | 1                                                                         |
| Model Tier (Execution) | high                                                                      |
| Model Tier (Audit)     | high                                                                      |
| Scored by              | Claude (Fable 5) — same session as PRD author                             |
| Self-scored            | yes (watch items are binding Phase 3 tasks)                               |
| Date                   | 2026-07-22                                                                |
| PRD Lint               | waived — FINAL waiver; FR-10 ships the tool that retires it (see Verdict) |
| State Record           | updated (`gate status` — PRD-002 Draft visible)                           |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale                                                                                                                        |
| ------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| Phase 3 (Execution) | high | The runner is the product's heart; merge/auto-revert code destroys work when wrong; safety gate semantics must be byte-faithful. |
| Phase 4 (Audit)     | high | Cross-model review mandatory; the reviewer must attack the merge state machine and the safety allowlist, not skim the port.      |

---

## Analysis

### 1. Technical Depth & Architecture

- **Config/manifest split** is right: near-static shape (config) vs per-project gate
  policy (manifest). Manifest self-audit (wire-or-delete) ports the parent's hardest-won
  meta-lesson.
- **Merge substrate**: single-checkout fallback is a real deviation from source,
  correctly surfaced as a §7 decision with the roadmap open-decision #4 justification.
  Scoring found two unstated preconditions — dirty feature checkout and already-on-base
  — both now specified in FR-9 (fixed pre-score).
- **Recursion hazard** found during scoring: a §11 row invoking `gate run` would loop.
  FR-8 now specifies the `PROVEGATE_RUN_ACTIVE` env sentinel with a dry-run exemption
  (fixed pre-score). Nested dry-run stays legal — PRD-002's own FR-8 verification row
  depends on it.
- **Auto-revert**: `reset --hard HEAD~1` after a no-ff merge commit is correct (merge
  always creates the commit); untracked files survive reset — no data-loss path
  identified.

### 2. Edge Cases & Failure Modes

- Covered: absent manifest (floor gates), invalid manifest (aggregate errors), empty
  §11 (STOP "PRD gap"), unsafe commands (STOP + lint-time report), review artifact
  pass-with-critical contradiction, operator rows without acceptance, stale wiring
  exceptions, post-merge failure revert.
- **Lint self-application** wrinkle (this PRD cites the lint's own `TBD` patterns)
  resolved pre-score: backtick-quoted tokens exempt; verified bare-TBD count is 0 on
  this document.
- **Watch item (W1)**: recursion-guard behavior needs its own test (nested non-dry-run
  refused, dry-run exempt) — easy to lose in implementation.
- **Watch item (W2)**: merge preconditions need fixture-repo tests (dirty feature
  checkout, on-base invocation) — the failure card, not just the happy path.

### 3. Maintainability & DX

- Every module parameterized on config/manifest — consistent with PRD-001's reviewed
  architecture; reuses its glob engine, markdown parsers, state records.
- Cards ported with English text; STOP card carries resume hint — operator ergonomics
  preserved.
- **Watch item (W3)**: the archive commit message constant must satisfy the consuming
  repo's commitlint (lower-case subject, known type) — assert in a test, since the
  runner commits on the user's behalf.

### 4. Migration & Rollback

- No deploy, no data migration. Rollback = revert the PRD merge; runner artifacts
  (metrics JSONL) are gitignored and regenerable; `gates.manifest.json` optional.
- The runner's own failure modes are self-limiting: worst case is a reverted merge and
  an intact feature branch — designed, tested (FR-9), and carded.
- CLI compat: `run`/`land`/`check` go stub→real (widening); `status`/`queue`/`push`
  untouched with regression coverage inherited from PRD-001.

### Security note (MT&S)

- User-gate commands execute through a shell **after** the safety pass; threat model
  now explicit in §7 (accident/injection defense, not adversarial-author sandbox —
  the spec is human-approved upstream). Internal git stays array-args. `curl`/`psql`
  allowlisted = user's own §11 probes; the CLI itself originates no network calls.
  Evasion via string-concatenated payloads inside `node -e` is out of scope by the
  stated model — acceptable, documented.

---

## Scorecard

Class `infra` weights.

| #         | Dimension                | Weight | Score       | Notes                                                                    |
| --------- | ------------------------ | ------ | ----------- | ------------------------------------------------------------------------ |
| 1         | Clarity                  | 15%    | 9/10        | 12/12 FRs have Targets + §11 rows; OQ empty; bare-TBD 0                  |
| 2         | Completeness             | 20%    | 8/10        | Four gaps found in scoring, all fixed pre-verdict; W1–W4 remain as tasks |
| 3         | Technical Depth          | 20%    | 8.5/10      | Merge state machine + recursion + threat model now explicit              |
| 4         | Multi-Tenancy & Security | 10%    | 8.5/10      | Shell exec bounded by safety gate + documented threat model              |
| 5         | Scope & Testability      | 15%    | 9/10        | Sharp non-goals (worktree excluded); live dogfood commands per FR        |
| 6         | Migration & Rollback     | 20%    | 9/10        | Auto-revert designed + tested; no deploy; regenerable artifacts          |
| **Total** | **Weighted**             |        | **8.65/10** | **PASS**                                                                 |

Hard caps: **none tripped.** MT&S cap N/A (no routes); Contract cap N/A (no FE→BE
payload); Lint cap — waived, see Verdict.

---

## Missing Pieces (to reach 10/10)

1. **W1 — recursion-guard test**: nested non-dry-run `gate run` refused under
   `PROVEGATE_RUN_ACTIVE`; `--dry-run` exempt (FR-8's own §11 row depends on it).
2. **W2 — merge precondition tests**: dirty feature checkout and on-base invocation
   both STOP with the correct card, fixture-repo based.
3. **W3 — archive commit message lint-compat**: assert the generated message passes
   conventional-commit shape (lower-case subject).
4. **W4 — lint backtick exemption self-test**: `gate check PRD-002` must exit 0 against
   this very document (its FR-10 cites the lint's own patterns in backticks).

All four are binding Phase 3 tasks.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes                                                                                                                                           |
| --- | ---------- | ----- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2026-07-22 | 8.65  | PASS    | Initial assessment. Four defects found during scoring fixed pre-verdict: merge preconditions, recursion guard, backtick lint exemption, threat model. |

---

## Project-Specific Checklist (provegate)

### Always (every PRD)

- [x] No `any` types (§12)
- [x] Zero runtime dependencies (§11 mechanical check)
- [x] No push code path — §11 grep gate over `core/run` + `core/gates`, safety gate
      refuses `git push` in user commands, push-refusal regression retained
- [x] No parent-project hardcodes — gate names/branches/paths live in the user manifest (§12)
- [x] No personal names (`ACCEPTANCE_OWNERS` port explicitly excludes them) (§12)
- [x] English-only package content (§11 grep gate)
- [x] Internal subprocesses via array args; user-gate shell execution bounded by
      `isSafeCommand` + documented threat model (§7, §12)

### Extraction discipline (this PRD)

- [x] G-files as-is / P-values → config/manifest mapping present per FR
- [x] `REVIEW_SCHEMA_FROM_PRD` grandfather window explicitly not ported
- [x] Emofy domain gates (`verify:rds-imports` etc.) barred from shipped defaults (§12)

---

## Verdict

**PASS — 8.65/10.** Proceed to Phase 3 after the owner's Go.

**Lint cap waiver (final)**: `gate check` is this PRD's FR-10 deliverable. Substitute
structural lint executed with evidence: 12/12 FRs carry `**Targets:**` lines; 12/12 FRs
have §11 command rows; `## 12. DO NOT` present; `## 9. Open Questions` empty; bare
`TBD`/`???` outside backticks: 0. This waiver retires itself — every subsequent PRD gets
the real gate.

Self-scored caveat: same session authored and scored. Phase 6 review must be an
independent model (codex, per repo precedent), primed to attack the merge state machine
and the safety allowlist. W1–W4 are binding Phase 3 tasks.
