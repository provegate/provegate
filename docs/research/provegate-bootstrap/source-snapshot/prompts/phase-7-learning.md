# Phase 7: Learning Protocol

> **Cycle Phase:** 7 of 7 (promoted from a Phase-4 sub-step by PRD-248)
> **Role:** Memory Steward
> **Goal:** Capture this PRD's durable knowledge into the repo's second brain **before** the merge, so the docs land in the same change as the code. Narrow scope: only what _this PRD_ taught — cross-wave retrospective stays a separate periodic activity.

---

## Why this is its own phase (PRD-248)

Wiki-ingest / memory sync used to be Phase 4 Step 2 — structurally the most-skipped step (the `verify:memory-drift` and `verify:doc-bloat` guards exist precisely because it kept drifting). Phase 7 makes it a gate the orchestration must pass, and **orders it before the merge** so repo docs never lag the code.

---

## Agent Constraints

1. **Declared artifacts only.** The PRD's `## Durable Artifacts` section lists the wiki pages / ADRs / patterns this work touches. Update exactly those. A `none` entry is a valid, explicit "nothing durable here."
2. **Narrow scope.** Capture what a future agent needs that is **not derivable from the code or git history**: a convention, an edge case, a decision rationale. Do not restate the diff.
3. **No drift.** After updating, `verify:memory-drift` and `verify:doc-bloat` must be clean.

---

## The Gate

```
For each non-`none` path in PRD §Durable Artifacts:
  the path must be touched in the merge diff (git diff <base>...HEAD)
verify:durable-artifacts  → all declared paths touched   → pass, else STOP
verify:memory-drift       → clean                        → pass, else STOP
verify:doc-bloat          → clean                        → pass, else STOP
```

`verify:durable-artifacts` is the mechanical enforcement: it parses §Durable Artifacts and fails if a declared path is missing from the diff.

---

## Steps

1. Run the wiki-ingest protocol (`prompts/wiki-ingest.md`) for each declared wiki page.
2. If a new architectural decision was made, add the ADR declared in §Durable Artifacts; update its index.
3. If a pattern was used in 3+ files, add the declared pattern page.
4. Run `pnpm verify:durable-artifacts -- <prd>` + `pnpm verify:memory-drift` + `pnpm verify:doc-bloat`.
5. `wiki/log.md` ship entries are automated by `pnpm state:wiki-log` (inside `ship:pre`) — hand-write only for structural wiki operations.

---

## Ordering invariant

Phase 7 runs **before** the merge to local `development` and **before** cleanup (`prd:stop`). The durable-knowledge commits are part of the same merge as the code. Cleanup happens only after the merge is verified.

---

## Handoff

> "Phase 7 complete for PRD-XXX. Durable artifacts updated: [list / none]. memory-drift + doc-bloat clean. Ready for merge gate."
