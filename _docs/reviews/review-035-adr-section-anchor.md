# Independent Review: PRD-035 — ADR Section Anchor

> **PRD:** PRD-035
> **Verdict:** pass
> **Reviewer:** independent Codex session — did not write the PRD, the readiness scores, or the implementation
> **Tool/Model:** GPT-5 via codex-cli 0.145.0, read-only sandbox, session `019fa837-baf3-7470-b3ad-83f838d7dc6d`
> **Base SHA:** 9bd2f684ba6d26d550ff88e613f4b02c1f5fa2ce
> **Diff range:** 9bd2f68..0b3dbca (three commits: fdcbf27, ff38988, 0b3dbca)
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass
> **Rounds:** 3 — round 1 GATE: FAIL (two [P1], one [P2]); round 2 GATE: FAIL (one [P1] held open, one new [P1]); round 3 GATE: PASS, no new defects

## Independence

The reviewer is a separate Codex session with no implementation context: the PRD was
authored by the owner and the orchestrating session, readiness was scored by two other
Codex sessions, and the implementation was written by the orchestrating session. Every
finding below was established or re-verified **by execution** in the reviewer's own
read-only environment — regex probes, in-memory prettier formatting of live ADRs,
gate re-runs, and a simulated-config probe against the pin. The implementing session
transcribed this artifact from the reviewer's verbatim round outputs (retained in the
session transcripts); the verdict line and every finding are the reviewer's.

## Findings

Ranked most-severe first. All are **closed**; the counts above are the post-fix state.

- **[P1] round 1 · the formatter smoke over-claimed, and the PRD goal with it.**
  The runner's smoke formatted a link-free minimal case and concluded "prettier
  output is legal", while formatting any real ADR in memory produced
  `structure`/`links` failures in all three validators: prettier reflows a
  frontmatter inline `links` list past its print width into an indented block form
  the documented subset rejects. The PRD's goal 3 ("make `pnpm format` safe on
  `_brain/adr/**`") and the retired learning's safety claim were therefore still
  false with the anchor fixed. **Closed** across rounds 1-2: the claim is narrowed
  to body scope at every site (goal, metric, user story 2, FR-5, learning), and the
  runner gained a pinned-limitation smoke. Round 2 held it open because the pin
  formatted at prettier's default width 80 while `pnpm format` runs
  `.prettierrc.json`'s printWidth 100 — the pin reflowed a line the real sweep
  leaves alone, a false green about the very behavior it pins. The final pin
  resolves the repository config and asserts three non-vacuous facts: the
  unformatted long-links source is valid, the formatter changed the bytes under
  that config, and the reflowed output is refused. Round 3 verified by execution:
  links line 138 chars, source issues `[]`, bytes changed, refusal produced; a
  simulated `printWidth: 200` leaves bytes unchanged and trips the pin's
  changed-bytes assertion; accepting the reflowed form would trip the refusal
  assertion.

- **[P1] round 1 · the retired learning gave a false account of why the defect
  escaped**, saying the corpus "only asserted agreement" — but the package test
  asserts every case's expected verdict. The true account: a coverage hole (no
  case exercised the formatter's blank-line shape), plus a repository copy never
  executed against the corpus, plus all three copies sharing one wrong anchor so
  the parity check had no disagreement to show. **Closed** in round 1 for the
  learning; round 2 found the stale account still standing in PRD goal 2, §7,
  FR-2, the DO NOT rationale, and the task file's Memory Context (**new [P1]**),
  and round 2's fix swept all five sites. Round 3 confirmed the remaining
  "agreement-only" matches are dated review history or valid warnings against
  parity-only cases, not current claims.

- **[P2] round 1 · the workflow ledger note overwrote the prior rationale** (the
  packed bundle must not run `verify-pack-drift`/`verify-turbo-inputs`) when
  recording the new corpus-runner divergence. **Closed**: the note restores the
  prior rationale and appends the new one; `verify:pack-drift` green over 49 pairs.

## Verified by execution (reviewer's own probes, rounds 1-3)

- All three anchors identical, `^## ` stop and `m` flag intact, comments truthful.
- The new corpus case asserts `valid: true`; direct execution returned no issues in
  all three implementations; the adjacent-heading empty-section case still fails on
  `body`.
- `pnpm verify:memory-corpus`, `verify:brain`, `verify:pack-drift`,
  `verify:gates-wired`, `verify:workflow` all pass.
- The runner pointed at an absent root exits 1 naming the missing fixture path.
- No live ADR modified, no packed seed created, no turbo-cached cross-boundary read
  added; worktree clean at round 3.
- Environment note: the reviewer's sandbox denied Vitest's temp-directory creation
  (`EPERM`), so the package suite's claims were re-established by direct Node
  execution of the compiled typed parser and both standalone validators across all
  79 cases; the implementing session ran the Vitest suite green (75/75) outside the
  sandbox.
