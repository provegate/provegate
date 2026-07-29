# Independent Review: PRD-036 — Frozen-Snapshot Digest Gate

> **PRD:** PRD-036
> **Verdict:** pass
> **Reviewer:** independent Codex session — did not write the PRD, the readiness scores, or the implementation
> **Tool/Model:** GPT-5 via codex-cli, full-access sandbox (mutation probes restored after each round)
> **Base SHA:** `5a2a64a55ac68631ba1e1cb0ddfe157ec2dd8af2`
> **Diff range:** main..HEAD (the atomic implementation, the task evidence, five fix rounds)
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass
> **Rounds:** 6 — GATE FAIL(1C/1H/3M) → FAIL(1C/1H/2M) → FAIL(3C/1M) → FAIL(1C) → FAIL(1C/1M) → PASS(0/0/0); every fixing round surfaced exactly one further edge in the same predicate family, the repo's recorded `a-rule-corrected-survives-where-it-is-restated` pattern measured live

## Independence

The reviewer is a separate Codex session with no implementation context; eight other
independent sessions scored the PRD's readiness. Every finding was established by
EXECUTION in the reviewer's own environment — planted fixture probes through the
production scanner, revert-and-observe mutations on `turbo.json` and
`script-classes.json`, byte-comparisons of the moved fixture values, and full re-runs
of the census, harness, class gates, aggregate bundle, and the monorepo floor each
round. The implementing session transcribed this artifact from the reviewer's
verbatim round outputs; the verdict line and every finding are the reviewer's.

## Findings

All **closed**; the counts above are the post-fix state.

- **[P1] round 1 · the base accessor bypassed the usage ledger.** The sanctioned
  `repoPath('.')` let `readFileSync(join(repoPath('.'), 'commitlint.config.mjs'))`
  pass with zero violations — an undeclared, uncached future read. Closed with the
  **B4 rule**: a read-API call whose path expression references the base AND carries
  a named literal leaf fails as `[base-literal-read]`; the five live base-literal
  reads B4 exposed were migrated to literal `repoPath` calls. Pure-dynamic base
  reads (a walk's variable) remain legal by the PRD's stated glob-level defense.
- **[P2] round 1 · helper shapes were not export-exact** (an aliased re-export
  passed). Closed: `ExportDeclaration`/`ExportAssignment` refused in both helpers;
  fixture exports must be string-literal constants.
- **[P3] round 1 · deny-10 was not an independent cause** (four failures at once).
  Closed: a non-exported read breach with the export set unchanged.
- **[P3] round 1 · formatter churn in 16 migrated files** violated the
  resolution-expressions-only rule. Closed: migrations re-applied from `main`
  without a format pass; the reviewer's round-2 sweep confirmed every hunk semantic.
- **[P3] rounds 1/2/5 · task-ledger evidence lagged measurement** (the padded-table
  replace trap struck twice). Closed by line-indexed edits; final counts verified
  independently: 59 sources, 33 usages, 25-case harness, 517-escaped-source-byte
  (513 runtime) fixture, 1371 tests.
- **[P1] round 2 · B4 was blind to template literals** (the backtick variant
  passed). Closed; planted.
- **[P2] round 2 · exported declaration KINDS were open** (an exported enum
  passed). Closed: any exported non-`const`-variable declaration fails by kind.
- **[P3] round 2 · identifier shadowing false-positived a legal dynamic read.**
  Closed with scope tracking; planted as a positive control.
- **[P1]×3 round 3 · nearest-binding resolution** (an inner base shadowing an outer
  ordinary variable escaped), **template TAIL leaves**, and **the `node:fs/promises`
  read twins** — all closed; each planted.
- **[P1] round 4 · separator-only template spans counted as literal leaves**,
  false-positiving the legal `${base}/${rel}` shape. Closed with the name-content
  rule; positive/negative pair planted.
- **[P1] round 5 · the name-content rule judged the un-stripped text**, so
  `${base}/./${rel}` false-positived. Closed on the stripped value (dots-only
  content is not a name); planted.

## Round-6 confirmation (the passing round)

The reviewer re-ran the exact round-5 probe, then exercised the production scanner
with a transient 23-case predicate matrix — empty/separator/dots-only parts legal
(15 forms), named forms including `.gitignore`, dotted names, and named template
head/middle/tail spans all failing as `[base-literal-read]` (8 forms) — removed the
probe, verified the worktree clean, and re-ran everything: harness 25/25, census 59
sources / 0 violations / 33 usages / 16 ledger entries, the live Turbo hash probe
(changed on the `wx` snapshot probe, restored after cleanup), `verify:script-classes`
(ledger and ADR-0004 agreeing both directions), `verify:turbo-inputs`,
`verify:brain`, `verify:workflow`, and the floor — `check-types`, `lint`, `test`
(1371/1371), `build`.

## What the earlier rounds also verified by execution

The three mandated mutations failed correctly by name (a removed glob, a removed
class row, a planted multi-parent literal); the atomic set is one commit with the
rollback prova holding at `HEAD~1`; the four moved fixture values and the
`memory.test.ts` path are byte/path-identical; the ADR diff is exactly one added
row; the packed-twin non-port is legitimate (repo-class per ADR-0004); commit
`9018d3d` contains the complete wire-or-delete set.
