<!--
Independent-review artifact — practice 01. Reviewer is NOT the author.
-->

# Independent Review: PRD-024 — §11 Command Extraction (Readiness Lint Parsers)

> **PRD:** PRD-024
> **Verdict:** pass
> **Reviewer:** Codex CLI session (orchestrated by the implementing session; all findings and verdicts are Codex's own)
> **Tool/Model:** codex (OpenAI, gpt-5.x, reasoning high) — different model family from the author (Claude Fable 5)
> **Base SHA:** bb27c373
> **Diff range:** main..1f745a9
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass

## Findings

Ranked most-severe first. One finding across two rounds; found, fixed, and re-verified
within this review.

- **critical (RESOLVED in `1f745a9`)** · `turbo.json:17` — the cached corpus test reads
  root `workflow.config.json` and `gates.manifest.json` through the five-argument
  production call (`loadConfig(repoRoot)` / `loadManifest`), but the declared inputs
  named only `$TURBO_DEFAULT$` and `$TURBO_ROOT$/_prds/**` — a root config change (an
  `allowedPrefixes` edit, a memory toggle) changes lint outcomes without invalidating
  the cache, replaying a stale green. This is `turbo-cache-masks-out-of-input-reads`
  arriving through the fix written against it, one file over from where FR-2 looked.
  Fix applied: both files joined the `inputs` list and the exceptions entry's reason
  names them. Round 2 verified the closure verbatim: "the round-1 P1 is closed …
  no new P1 or P2 issues were found."

## Verdict rationale

The parser contract held on first read: Command-cell scoping through one shared
extraction, the malformed-row report under its exact prefix, the lint-only/chain-refusal
split between zero and duplicate sections, the preserved export signature with zero
existing-test edits, and the five-predicate corpus class all verified against the diff.
The single critical finding was in the cache declaration, not the parser — the corpus
test's own config reads were outside its cache key — and it was fixed and independently
re-verified in round 2 with no new findings. Targeted tests, cache-input verification,
type checking, linting, and builds passed (1125 tests, 51 files; `verify:workflow`
PASS).
