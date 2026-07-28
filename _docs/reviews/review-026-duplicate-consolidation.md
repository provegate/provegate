# Independent Review: PRD-026 — Duplicate Consolidation

> **PRD:** PRD-026
> **Verdict:** pass
> **Reviewer:** Codex (gpt-5.x) via the `/codex` skill — read-only, not the author or the implementing session
> **Tool/Model:** codex CLI 0.145.0, model_reasoning_effort=high; orchestrated by Claude Fable 5, which implemented the work and re-verified every finding before acting on it
> **Base SHA:** 20fa78a9540217a688676f05b286f9271c440a49
> **Diff range:** 20fa78a..968377a
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (one independent reviewer, four rounds; Critical: 0 in rounds two, three and four)
> **Rounds:** 4 — every finding reconstructed before acceptance; every fix re-reviewed by the round after it

## Independence

The reviewer is a different model family from the implementer and read only the diff and
the repository. The implementing session wrote the fixes between rounds and never scored
its own round; each round's brief required reconstructing the previous round's
counterexamples rather than reading the fix descriptions.

## Round history

All findings are **closed**; the counts above are the final state.

- **Round 1 — 3 critical, 4 advisory.** (P1) deleting `verify:gates-wired`'s CI step
  left the wiring audit with NO executing surface — the wave's own wire-or-delete
  violation, found by walking the deletion inventory; fixed with the `check:wiring`
  alias joining the manifest and CI, and FR-4's enumeration corrected with a changelog
  row. (P1) the published migration deleted the exceptions file in step 1 and read it in
  step 5 — data loss by step order; the file now outlives the conversion. (P1) a
  method-class ledger row whose script was deleted was exempt from the stale rule, so
  the two-store state FR-8 forbids reported PASS; method is now never a resting place.
  Advisory: the STATUS boundary swallowed the whole Deferrals table (live Topic/Item
  cells invisible); `2099-99-99` passed the date shape; duplicate ADR rows resolved
  last-wins; `NEXT_STEPS.md` never told a fresh adopter to wire the corpus flags.
- **Round 2 — Critical: 0, three advisory; every round-1 closure reconstructed and
  upheld.** The review sweep's binding regex hardcoded a three-digit width against a
  configurable `idPattern.width`; the Note-cell strip broke on pipes inside the cell and
  ate live columns of OTHER tables; an adopter with an already-empty legacy exceptions
  file never deleted it. All three fixed with fixtures (the piped-Note board fixture
  proves both directions).
- **Round 3 — Critical: 0; the round-2 scenarios closed.** One advisory: the durable
  sweep selected every `.md` in the wip directory where the deleted script filtered on
  `prd-\d+`; the selector now derives from the configured prefix and width.
- **Round 4 — Critical: 0; the README / three-digit / four-digit scenarios behave.**
  One advisory in the new selector itself: the configured prefix was compiled unescaped,
  so a metacharacter prefix mis-selected or crashed. Fixed with the repository's own
  `escapeRegExp`, the same treatment every other artifact reader gives that value —
  a one-line fix mirroring an existing reviewed pattern, landed after the round with
  the full suite and the live sweeps re-run green.

## Verification evidence

1216 package tests green (baseline 1183 + 33 across the consolidation and four rounds);
`pnpm check-types`, `pnpm lint`, `pnpm build`, `pnpm verify:workflow` (nine-member
bundle), `pnpm verify:pack-drift` (45 pairs), `pnpm verify:script-classes` (11 entries,
11 on disk) all green in the worktree; the three CLI sweeps run green against the live
repository. W-mutation checks: the asterisk exclusion, the template exclusion and the
ledger's still-exists rule were each reverted in isolation and produced exactly their
paired fixtures' failures — and the first asterisk fixture was itself caught VACUOUS by
its mutation check (green under the mutation too) and rebound to the extraction
observable, which is `assert-absent-needs-an-independent-cause` enforced on the evidence
rather than assumed of it. The born-agreeing two-store transaction was observed live:
`verify:script-classes` red between the replacements commit and the deletion commit,
green from the deletion commit on.

## Verdict rationale

The consolidation's risk was never the new code — it was the inventory: every deleted
guarantee needed a surviving surface, and the sharpest finding of the whole review was
round 1 catching the wave violating its own rule (the wiring audit left with no
executing surface). Four rounds moved strictly outward — inventory, then boundaries,
then selectors, then a metacharacter — and every fix shipped with a fixture that can
fail on its own cause. Nothing blocks.
