# Independent Review: PRD-042 — Adopter First Hour

> **PRD:** PRD-042
> **Verdict:** fail
> **Reviewer:** codex (gpt-5), read-only sandbox
> **Base SHA:** `5552a11233e661048808d5d1bb6a2f7378f27095`
> **Critical:** 1
> **High:** 5
> **Medium:** 3
> **Quorum:** 0/1 pass

## Summary

One adversarial review of `5552a11233e661048808d5d1bb6a2f7378f27095...feat/prd-042-adopter-first-hour`. The generated review artifact can satisfy the review gate after changing only `Verdict`, and five additional high-severity contract or false-green defects remain. No new runtime dependency, network, telemetry, or push path was found; containment, `wx` writes, and the Phase-6 task path align with the gate.

## Findings

| # | Sev | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | CRITICAL | `packages/provegate/src/core/run/new.ts:L486`: `createCompanion` preserves valid-looking Reviewer, Base SHA, zero counts, and `3/5 pass`; changing only Verdict to `pass` makes `validateReviewArtifact` return `ok: true`. Blank every reviewer-owned field and add a verdict-only denial test. | open |
| 2 | HIGH | `packages/provegate/src/core/run/new.ts:L119`: `substituteAnchor` accepts the first match without proving uniqueness or Markdown context; duplicate, fenced, and valid-plus-foreign anchors instantiate. Require exactly one unfenced configured/raw ID anchor; reverse `new.test.ts:L483`, which currently asserts the forbidden behavior. | open |
| 3 | HIGH | `packages/provegate/src/core/run/new.ts:L190`: the placeholder regex skips whole lines containing ordinary links or Notes cells such as `[docs](...)`, leaving resolvable tokens unresolved, while punctuation such as `[path/to/file]` evades it and is partly resolved. Remove the line heuristic and handle scaffolding without violating FR-2’s unconditional closed-token pass. | open |
| 4 | HIGH | `packages/provegate/src/core/run/new.ts:L211`: `dropSection` returns `slice(cut)`, preserving the separator it claims to remove; it also treats fenced `## Memory Inputs` as the real section, corrupting the fence and leaving the actual contract section behind. Use a fence-aware section span and remove through `end`, including last-section coverage. | open |
| 5 | HIGH | `packages/provegate/src/cli.ts:L288`: grammar validation recognizes option names but not their required form. `gate new --tasks PRD-001 --class` writes a tasks file, and `gate new first second` silently writes `first`. Validate exact production arity and reject bare value options before dispatch. | open |
| 6 | HIGH | `scripts/verify/verify-quickstart-parity.mjs:L131`: the order gate compares heading indexes, not the manifest recipe span. Keeping or planting the heading before Close while moving the JSON recipe after Close passes. Locate unique unfenced sections and assert the recipe fence ends before Close. | open |
| 7 | MEDIUM | `packages/provegate/src/core/run/new.ts:L474`: the tasks heading receives only the slug, not the required ID and slug; its PRD link hardcodes `../../`, so nested configured task directories produce a broken link. Emit the specified heading and calculate the relative link from the configured destination. | open |
| 8 | MEDIUM | `packages/provegate/src/core/run/new.ts:L416`: `findWipPrd` accepts arbitrary digit widths. `PRD-1` aliases `PRD-001`, while `PRD-0001` can target and generate wrong-width artifacts that the state builder cannot index. Enforce the configured-width ID grammar. | open |
| 9 | MEDIUM | `packages/provegate/test/quickstart-e2e.test.ts:L264`: the changed fixture accepts both resolved and legacy unresolved tokens, so removing FR-2 remains green; `new.test.ts:L389` claims all seven tokens but checks only four and never tests precedence. Stop accepting the legacy output and assert all seven sources and both fallback rules. The `prompts-integrity.test.ts` change correctly asserts the new rendered-template contract. | open |

## Post-fix verification

No fixes were present to verify. The supplied pre-fix runs passed (`check-types`, lint, tests, build, workflow verification, quickstart parity, and adopter smoke), but they do not cover the cases above. After remediation, rerun the full §11 suite and add regressions for verdict-only review scaffolds, duplicate/fenced/foreign anchors, link and Notes token lines, last/fenced memory sections, bare/extra CLI arguments, recipe-only reordering, nested configured paths, and wrong-width IDs.
