# Readiness Assessment: PRD-016 — Practices Pack (`gate init --practices`)

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-016-practices-pack.md`          |
| Score                  | 8.15/10                                        |
| Verdict                | PASS                                           |
| Iteration              | 1                                              |
| Model Tier (Execution) | medium                                         |
| Model Tier (Audit)     | medium                                         |
| Scored by              | Claude (Fable 5) — same session as PRD author  |
| Self-scored            | yes (watch items are binding Phase 3 tasks)    |
| Date                   | 2026-07-24                                     |
| PRD Lint               | passed — `gate check PRD-016` exit 0           |
| State Record           | updated                                        |

---

## Model Tier Recommendation

| Phase               | Tier   | Rationale                                                                    |
| ------------------- | ------ | ---------------------------------------------------------------------------- |
| Phase 4 (Execution) | medium | Init machinery is reused as-is; the work is content packaging + careful genericization, not subtle logic. |
| Phase 6 (Audit)     | medium | The load-bearing review is content hygiene: every packed file must carry zero repo-of-origin facts. That needs attention, not just greps. |

---

## Analysis

### 1. Technical Depth & Architecture

- Right shape: `practices/` is static shipped content (like `prompts/` and
  `templates/` today) and `planInit` gains a practices section — no new
  abstractions, and the existing `wx` never-overwrite + `containedPath`
  containment are reused rather than re-implemented.
- The genuinely risky part is NOT code — it is the **content lift**: this repo's
  live practice files contain repo-specific facts (bootstrap knowledge map,
  DECISIONS paths, provegate product framing, this repo's commitlint SCOPES).
  Packed copies must be genericized templates, not copies of this repo's files.
- The verify scripts are already parameterized by target root and
  convention-default dir names — the same defaults `gate init` scaffolds, so a
  pack install is internally consistent by construction.

### 2. Edge Cases & Failure Modes

- **Fixture must be REAL** (proven pattern from PRD-015): a mocked install proves
  nothing. Drive a temp git repo: fresh install → files exist AND
  `verify-workflow` exits 0; re-run → all-skip; `--dry-run` → zero writes.
- **Existing-file collisions:** adopter already has `STATUS.md` / `.githooks/*` /
  `commitlint.config.mjs` → must skip-and-report, never truncate or merge.
- **Executable bits:** hooks written without exec permission fail silently at
  commit time — fixture must assert mode.
- **Bare `gate init` regression:** the flag must not change the flagless plan by
  a single byte.

### 3. Maintainability & DX

- One command replaces ~20 manual steps; NEXT_STEPS keeps the deliberately-manual
  wiring (hooksPath, package.json snippet, shim paste) explicit instead of
  mutating adopter state.
- Risk to watch: pack content and this repo's live practice layer can drift; not
  solved in v1 (accepted — noted for a future sync check).

### 4. Migration & Rollback

- Purely additive package content + one flag. Reversible via git revert; no
  data, no schema, no runtime dependency, no network, no push path.

---

## Scorecard (feature weights)

| Dimension                | Weight | Score | Notes                                                        |
| ------------------------ | ------ | ----- | ------------------------------------------------------------ |
| Clarity                  | 15%    | 8.5   | 6 FRs with concrete targets; all owner decisions resolved     |
| Completeness             | 20%    | 7.5   | Content list is fixed, but the file-by-file genericization map is Phase-3 work |
| Technical Depth          | 25%    | 7.5   | Reuses init machinery; low novelty; risk lives in content, not code |
| Multi-Tenancy & Security | 20%    | 8.5   | No auth/network; wx + containment reused; no-push asserted in fixture |
| Scope & Testability      | 10%    | 9.0   | Fixture-driven lifecycle; small, additive surface             |
| Migration & Rollback     | 10%    | 9.0   | Additive; revert-clean                                        |

**Weighted: 8.15 — PASS.** (0.15·8.5 + 0.20·7.5 + 0.25·7.5 + 0.20·8.5 + 0.10·9.0 +
0.10·9.0 = 8.15.) Hard caps: security N/A (no auth/tenancy/route), contract N/A
(no client→server payload), zero-runtime-dep cap holds (static content only),
no-push cap holds (fixture asserts packed scripts contain no `git push`), lint
passed (`gate check PRD-016` exit 0).

---

## Watch Items (binding on Phase 3)

- **W1 — genericize, don't copy:** every packed file carries ZERO repo-of-origin
  facts (no DECISIONS paths, no provegate product framing, no this-repo SCOPES;
  placeholders + TODO markers instead). Hygiene grep + fixture assertions.
- **W2 — real fixture:** temp git repo; fresh install → `verify-workflow` exit 0;
  re-run → all-skip; `--dry-run` → zero writes; hooks executable.
- **W3 — no adopter-state mutation:** no `git config`, no dependency install, no
  edits to an existing `package.json`; packed scripts contain no `git push`.
- **W4 — bare-init regression:** flagless `gate init` plan is byte-identical to
  today (fixture-asserted).
- **W5 — zero-dep invariant:** `packages/provegate` gains no runtime dependency;
  packed verify scripts stay node-stdlib-only.

---

## Verdict

**PASS** — proceed to Phase 3. Code risk is low (init machinery reused); the
review weight sits on content genericization (W1), which Phase 6's independent
audit must treat as its primary lens. Autonomous Close stays **operator-gated**:
shipping method content in the package warrants an explicit owner acceptance at
close, even though every §11 check is machine-settleable.
