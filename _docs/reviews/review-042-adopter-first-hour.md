# Independent Review: PRD-042 — Adopter First Hour

> **PRD:** PRD-042
> **Verdict:** fail
> **Reviewer:** codex (gpt-5), read-only sandbox
> **Base SHA:** `5552a11233e661048808d5d1bb6a2f7378f27095`
> **Critical:** 0
> **High:** 3
> **Medium:** 6
> **Quorum:** 0/1 pass

## Summary

Round 2 reviewed `5552a11233e661048808d5d1bb6a2f7378f27095...feat/prd-042-adopter-first-hour`. The Critical review-scaffold defect is closed, unconditional token substitution is restored, and both changed tests now assert the new contract rather than weakening it. Three high-severity false-green paths remain in anchor/fence handling and quickstart ordering. No runtime dependency, network, telemetry, or push path was introduced.

## Findings

| # | Sev | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | HIGH | `packages/provegate/src/core/run/new.ts:L157`: `assertSingleIdAnchor` counts only canonical alternatives, so a template containing one valid anchor plus `# RFC-XXX: foreign` instantiates and preserves the foreign competing heading. Reject every unfenced ID-shaped anchor outside the closed alternatives, then require exactly one canonical anchor. | open |
| 2 | HIGH | `packages/provegate/src/core/run/new.ts:L120`: `fencedLines` treats any same-marker opener as a closing fence, even with an info tail or insufficient length. A valid fence containing `````still-open`` followed by `# PRD-XXX:` is treated as closed and the fenced anchor instantiates; the same parser can make `dropSection` delete from a fenced Memory heading. Implement matching fence-length/closing syntax and add crafted-fence regressions for FR-3 and FR-5. | open |
| 3 | HIGH | `scripts/verify/verify-quickstart-parity.mjs:L174`: any fence with `"phases"` in the next eight lines qualifies as the recipe. An empty/decoy manifest fence before Close lets the real floor recipe follow Close while verification passes. Identify one tagged or structurally validated recipe and reject competing recipe-shaped fences. | open |
| 4 | MEDIUM | `packages/provegate/src/core/run/new.ts:L249`: `replaceAll(token, value)` interprets replacement sequences. A valid configured path such as `docs/$&` writes `docs/{{DOCS_ROOT}}` and remains unresolved despite its non-empty source. Use a callback replacement so configured bytes are literal, preferably in one non-cascading pass. | open |
| 5 | MEDIUM | `packages/provegate/src/cli.ts:L375`: repeated value options remain outside the three-production grammar; `gate new slug --class=feature --class=hotfix` reaches PRD creation using the first value and silently ignores the second, as does repeated `--template`. Enforce option cardinality before dispatch and add CLI-level denial tests. | open |
| 6 | MEDIUM | `packages/provegate/src/core/run/new.ts:L549`: the tasks-to-PRD link counts raw slash-separated segments instead of filesystem depth. A contained configuration such as `workflow/./tasks/nested` is normalized for the write but receives one excess `../` in the link. Compute the link with `relative(dirname(destination), prdPath)`. | open |
| 7 | MEDIUM | `packages/provegate/test/new.test.ts:L639`: the test titled “LAST section” never makes either Memory section last; the shipped template still places Conflict Surface, Durable Artifacts, §11, and Changelog afterward. Move a Memory section to EOF in the fixture and assert the preceding section remains byte-intact. | open |
| 8 | MEDIUM | `_tasks/wip/tasks-042-adopter-first-hour.md:L194,L209,L230`: the task artifact still says the PRD declares no Memory Output and that token substitution skips placeholder lines, contradicting the PRD’s declared learning and the corrected unconditional implementation. Update Phase 7, the ledger evidence, and Deferrals & Decisions before close. | open |
| 9 | MEDIUM | `scripts/adopter-smoke.sh` and `scripts/adopter-smoke-fill.mjs` are modified outside the PRD’s Conflict Surface without the decision required by §12. Record and approve the scope expansion or revert those edits from this PRD. | open |

## Post-fix verification

The orchestrator-supplied typecheck, lint, tests, build, workflow verification, quickstart parity, and adopter smoke all pass, but they do not cover the remaining counterexamples. After remediation, rerun the full §11 suite and add regressions for valid-plus-foreign anchors, non-closing fence markers, a decoy manifest fence, literal `$` replacement values, repeated value options, normalized configured paths, and a genuinely terminal Memory section.
