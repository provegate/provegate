# Summary: PRD-035 — ADR Section Anchor

> **PRD**: [prd-035-adr-section-anchor.md](../../_prds/wip/prd-035-adr-section-anchor.md)
> **Status**: Code Complete, pending gated close
> **Class**: hotfix · **Autonomous Close**: eligible
> **Branch**: `prd-035-adr-section-anchor` (three commits: fdcbf27, ff38988, 0b3dbca)
> **Date**: 2026-07-28

## What shipped

- The ADR section capture ends at end-of-input — `(?=^## |(?![\s\S]))` replacing the
  `/m`-broken `(?=^## |$)` — in all three implementations: the typed parser
  (`core/memory/parse.ts:581`), the repository validator (`scripts/verify/lib.mjs:336`),
  and the shipped copy (`practices/verify/lib.mjs:336`). A blank line after every
  heading — what prettier writes — validates; a heading with no blank line before it
  still ends the section; a genuinely empty section is still refused.
- One corpus case (`adr-blank-line-after-every-heading-valid`, expected **valid**),
  proven red on both executed implementations before the fix.
- `verify:memory-corpus` (new, `scripts/verify/verify-memory-record-corpus.mjs`):
  executes all 79 cases against the repository validator the package corpus never
  runs, fails closed on a missing/unparseable fixture, and carries two prettier
  smokes under the **repository's** resolved config — body formatting must validate,
  and the frontmatter reflow limitation is pinned with three non-vacuous assertions.
  Wired as a root script and a `verify:workflow` CHECKS member.
- Both moved pack-drift pairs reconciled; the workflow pair's note preserves the prior
  repo-only rationale and appends the corpus-runner divergence.
- `adr-section-blank-line-reads-empty` retired to what remains true: anchor fixed;
  lessons kept (`$` under `/m`; corpus coverage holes); **live warning kept** — a
  `pnpm format` sweep over `_brain/adr/**` is still unsafe because prettier reflows
  long frontmatter inline lists into a block form the subset rejects, now pinned.

## Honest scope note

The PRD's original goal 3 ("make `pnpm format` safe on `_brain/adr/**`") was
**narrowed in Phase 6**: the anchor fix makes prettier's *body* output legal, and the
frontmatter reflow is a distinct, now-pinned limitation whose fix belongs to a future
item (subset change or prettier config), not this hotfix.

## Verification

Red-first corpus case; three anchor-restore mutation probes each failing the new case
by name through its own command; `verify:memory-corpus` / `verify:brain` /
`verify:pack-drift` / `verify:workflow` / package suite 75/75 / `check-types` / `lint`
/ `test` / `build` all green; independent adversarial review over three rounds
(GATE: FAIL → FAIL → PASS), `Critical: 0` post-fix, artifact at
`_docs/reviews/review-035-adr-section-anchor.md`.

## Durable artifacts

- `_brain/learnings/adr-section-blank-line-reads-empty.md` — the declared Memory
  Output, edited (retired + live warning)
- `_brain/INDEX.md` — hook updated
- `_docs/reviews/review-035-adr-section-anchor.md` — the independent review

Learning beyond the declared output: none — the Phase 6 findings themselves are
recorded inside the retired learning (the reflow hazard) and the PRD changelog.
