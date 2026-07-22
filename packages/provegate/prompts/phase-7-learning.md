# Phase 7: Learning Protocol

> **Cycle Phase:** 7 of 7
> **Role:** Memory Steward
> **Goal:** Capture this PRD's durable knowledge into the repo's knowledge base **before** the merge, so the docs land in the same change as the code. Narrow scope: only what _this PRD_ taught — cross-cycle retrospective stays a separate periodic activity.

---

## Why this is its own phase

Knowledge capture is structurally the most-skipped step when it is a sub-step of
something else. Phase 7 makes it a gate the orchestration must pass, and **orders it
before the merge** so repo docs never lag the code.

---

## Agent Constraints

1. **Declared artifacts only.** The PRD's `## Durable Artifacts` section lists the
   knowledge pages / ADRs / patterns this work touches. Update exactly those. A `none`
   entry is a valid, explicit "nothing durable here."
2. **Narrow scope.** Capture what a future agent needs that is **not derivable from the
   code or git history**: a convention, an edge case, a decision rationale. Do not
   restate the diff.
3. **No drift.** Knowledge pages must reflect post-merge reality — run the
   knowledge-lint protocol (`prompts/knowledge-lint.md`) after updating.

---

## The Gate

```
For each non-`none` path in PRD §Durable Artifacts:
  the path must be touched in the merge diff (git diff {{BASE_BRANCH}}...HEAD)
```

`gate run {{ID_PREFIX}}-XXX` enforces this mechanically: its Phase 7 gate parses
§Durable Artifacts and STOPs if a declared path is missing from the diff.

---

## Steps

1. Run the knowledge-ingest protocol (`prompts/knowledge-ingest.md`) for each declared
   knowledge page.
2. If a new architectural decision was made, add the ADR declared in §Durable
   Artifacts; update its index.
3. If a pattern was used in 3+ files, add the declared pattern page.
4. Run the knowledge-lint protocol to confirm no drift or bloat.

---

## Ordering invariant

Phase 7 runs **before** the merge to local {{BASE_BRANCH}} and **before** cleanup. The
durable-knowledge commits are part of the same merge as the code. Cleanup happens only
after the merge is verified.

---

## Handoff

> "Phase 7 complete for {{ID_PREFIX}}-XXX. Durable artifacts updated: [list / none].
> Knowledge lint clean. Ready for the merge gate."
