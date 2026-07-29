# Independent Review: PRD-037 — Case Study, Part Two

> **PRD:** PRD-037
> **Verdict:** pass
> **Reviewer:** independent Codex session — did not write the PRD, the readiness scores, or the implementation
> **Tool/Model:** GPT-5 via codex-cli 0.145.0, read-only sandbox
> **Base SHA:** `a384b5956ccedc8d09be62af85da15209f54021b`
> **Diff range:** a384b59..d00b977 (three commits: 9a7c672, 136c830, d00b977)
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass
> **Rounds:** 2 — round 1 GATE: FAIL (one [P1], three [P2]); round 2 GATE: PASS with one partial [P2] residue, closed in a follow-up commit the same session

## Independence

The reviewer is a separate Codex session with no implementation context: the PRD was
drafted by the orchestrating session and scored by five other independent Codex
sessions; the implementation was written by the orchestrating session. Every finding
was established or re-verified by execution in the reviewer's own read-only
environment — the fixture harness, the `--check` mode, `verify:doc-claims`, the docs
build, and the reviewer's own probes (including a fenced-token forgery that passed the
round-1 guard). The implementing session transcribed this artifact from the reviewer's
verbatim round outputs; the verdict line and every finding are the reviewer's.

## Findings

All **closed**; the counts above are the post-fix state.

- **[P1] round 1 · a count smuggled as a word.** The section's honesty prose said
  "at least twice, a remediation changelog claimed edits an independent scorer proved
  absent" — a count that is neither state-derived nor inside the generated region,
  evading the `[0-9]` predicate by being spelled out, violating §12's
  "omit, never estimate" and falsifying the task ledger's no-digit claim. **Closed:**
  de-counted to pure phenomenon prose ("remediation changelogs have claimed edits an
  independent scorer then proved absent").
- **[P2] round 1 · fenced-token false-green in the heading guard.**
  `hasHeadingToken` used unrestricted `includes()`; the reviewer's probe placed the
  heading token only inside a fenced code block and passed region equality, the
  token guard, and the digit gate with no rendered H2. **Closed:** `headingIndex()`
  anchors to a real H2 source line outside fences, with the reviewer's probe added
  to the harness; round 2 found the fence detector missed `~~~` fences (a valid
  tilde-fenced token still passed) — closed in the follow-up commit with a
  tilde-fence harness case.
- **[P2] round 1 · wiring overstated.** The doc claimed the comparison runs on
  "every lint run" and that drift "fails the build"; root `lint`/`build` never run
  it. **Closed:** the text names the real gate — `verify:doc-claims`, a
  `verify:workflow` member and CI step.
- **[P2] round 1 · a corrected overclaim surviving in code commentary.** The script
  header still said "no stored number exists to go stale" above the committed
  projection that can. **Closed:** the comment states the projection is stored, can
  drift, and is caught by `--check` via `verify:doc-claims`.

## Verified by execution (reviewer's own probes, rounds 1-2)

- The invocation matrix matches the PRD's table (flag cardinality, streams, exit
  codes, nothing-read default); sentinel validation identical in the three flagged
  modes; `--write` preserves every outside byte; `--check` names the first differing
  line.
- The `closeModes` contract holds: fixed order, sorted `unclassified {count, ids}` as
  success, first-violation-by-array-index diagnostics.
- The region content equals a fresh derivation; the H2 span carries no digit outside
  the pair; the `[#self-hosting-ledger]` token is asserted in MDX source and the
  fumadocs build compiles the page (30/30) with the sentinels in MDX comment form —
  the HTML-comment form the PRD originally named is REJECTED by the MDX pipeline, a
  build-measured constraint the task file's Deferrals records.
- The doc-claims scoping holds: both files absent = silent (fixture roots), exactly
  one = loud failure.
- §12 DO NOT: no typed figure, no estimated count post-fix, failed rounds named
  without digits, `apps/web` untouched, no competitor mention.
