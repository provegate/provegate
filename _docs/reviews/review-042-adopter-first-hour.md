# Independent Review: PRD-042 — Adopter First Hour

> **PRD:** PRD-042
> **Verdict:** fail
> **Reviewer:** codex (gpt-5), read-only sandbox
> **Base SHA:** `5552a11233e661048808d5d1bb6a2f7378f27095`
> **Critical:** 0
> **High:** 3
> **Medium:** 1
> **Quorum:** 0/1 pass

## Summary

Round 6 reviewed `5552a11233e661048808d5d1bb6a2f7378f27095...feat/prd-042-adopter-first-hour`. All three round-5 findings are genuinely closed: substitution targets the validated anchor line, both fence consumers use `fenceSpans`, and explicitly empty prompt values remain unresolved. The former placeholder-line heuristic is absent; configured tokens resolve unconditionally in §11 rows, Notes, links, and the Changelog. The two changed tests assert the new contract rather than loosening it. However, valid configuration shapes still bypass the foreign-anchor guard and create undiscoverable companion artifacts, `dropSection` mutates unrelated content, and the quickstart order assertion retains a command-bearing post-Close false green.

## Findings

| # | Sev | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | HIGH | `packages/provegate/src/core/run/new.ts:222`: the foreign-anchor guard assumes a whitespace-free prefix via `^# \S+-XXX:`, while configuration accepts prefixes containing spaces. With configured prefix `AC ME`, a template containing both `# RFC ALT-XXX: foreign` and the canonical `# AC ME-XXX:` instantiates and retains both headings. Enforce a closed prefix grammar at config load or detect the complete column-zero `…-XXX:` heading shape. | open |
| 2 | HIGH | `packages/provegate/src/core/run/new.ts:661`: artifact prefixes are accepted as arbitrary non-empty strings, so `tasks.prefix: "nested/tasks"` writes `_tasks/wip/nested/tasks-NNN-slug.md`; the state reader matches the basename against `nested/tasks-NNN-…`, never discovers the file, and Phase 6 still reports it missing. Restrict artifact prefixes to safe basename components or make creation and discovery share one normalized path grammar. | open |
| 3 | HIGH | `scripts/verify/verify-quickstart-parity.mjs:193`: recipe classification recognizes only marker lengths divisible by three, while line 201 treats any nonempty flattened value—including `""`—as a command. A pre-Close `{"phases":{"4":""}}` triple fence plus a real command-bearing post-Close four-backtick JSON fence yields one pre-Close “recipe” and passes. Parse every valid shared fence span with an exact `json` info string and require at least one nonempty command string. | open |
| 4 | MEDIUM | `packages/provegate/src/core/run/new.ts:385`: after removing a memory section, `dropSection` collapses every run of three blank lines across the entire surviving document, including unrelated fenced examples. Limit normalization to the removal seam or preserve all bytes outside the removed spans. | open |

## Post-fix verification

Orchestrator-provided evidence reports PASS for `pnpm check-types`, `pnpm lint`, `pnpm test` (8/8 tasks), `pnpm build`, `pnpm verify:workflow`, `pnpm verify:quickstart-parity`, and `pnpm smoke:adopter` (0 failing, 0 stale known-red). Read-only probes confirmed the three open behavioral defects: the spaced foreign prefix instantiated, unrelated fenced blank lines collapsed, and the crafted post-Close recipe passed the verifier’s current classification.
