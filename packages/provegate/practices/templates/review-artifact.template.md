<!--
Generic independent-review artifact.
One per gated change. Committed alongside the change (it is a durable artifact).
The reviewer is NOT the author: a different model/agent session, or a human.

FORMAT MATTERS: the machine check parses the blockquote `> **Key:** value` lines below —
do not convert them to a table or prose. Hard rule (machine-checked):
`Verdict: pass` REQUIRES `Critical: 0`. Verdict is strictly `pass | fail` — a
review-optional class (e.g. pure test-hardening) produces NO artifact and instead records
a skip justification in the work-item ledger.
File name (repo convention): review-<NNN>-<short-slug>.md
-->

# Independent Review: PRD-<NNN> — <title>

> **PRD:** PRD-<NNN>
> **Verdict:** pass | fail
> **Reviewer:** <human name / agent-session id — MUST NOT be the author>
> **Tool/Model:** <model or CLI used; note if different family from the author>
> **Base SHA:** <sha the diff is measured against>
> **Diff range:** <base>..<head>
> **Critical:** <integer count of critical findings>
> **High:** <integer count — optional>
> **Medium:** <integer count — optional>
> **Quorum:** <optional — e.g. 2/3 pass; omit for a single reviewer>

## Findings

Ranked most-severe first. For each: `severity` · `file:line` · problem · suggested fix.

- **critical** · `path:line` — <problem>. <fix>.
- **major** · `path:line` — <problem>. <fix>.
- **minor** · `path:line` — <problem>. <fix>.

## Verdict rationale

<Why pass/fail, in two or three sentences.>
