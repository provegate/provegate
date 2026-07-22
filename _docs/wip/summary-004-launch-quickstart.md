# Development Summary: Launch Surface

> **PRD**: [prd-004-launch-quickstart.md](../../_prds/wip/prd-004-launch-quickstart.md)
> **Tasks**: [tasks-004-launch-quickstart.md](../../_tasks/wip/tasks-004-launch-quickstart.md)
> **Ship Readiness**: Ship Verified
> **Completed**: 2026-07-22
> **Author**: rayvaz (implementing agent: claude-fable-5; reviewer: codex)

---

## Overview

Roadmap Phase E landed: the adoption path. `gate init` scaffolds a working gated
repo; the quorum arithmetic deferral from PRD-003 closed on time and immediately
validated its first artifact (this PRD's own review); the quickstart walks install →
first gated close in one sitting; the evidence pages (case study + whitepaper) ship
with per-figure caveats and a mechanical do-not-say lint over every launch surface.

---

## Key Features

- **Quorum arithmetic** (the governed deferral, closed 7 days early, 0 renewals):
  `validateReviewArtifact` parses `N/M pass`, rejects pass verdicts below 3/5 in
  integer math, caps counts at 3 digits (safe-integer), and accepts only
  ` (`-opened annotations after the head — historical artifacts stay valid, forged
  tails do not.
- **`gate init`**: additive-only, idempotent, whole-plan path containment
  (absolute/`..`/symlink refusal) validated before any write, atomic `wx` file
  creation, starter configs that validate against the shipped engine. Refused plans
  write nothing.
- **Wiring audit hardening**: real package-manager grammar (`packageScriptOf`) —
  run/run-script forms, lifecycle aliases, non-script subcommands, cross-package
  selectors (spaced and equals-attached) scoped out; a repo without package.json
  whose manifest references package scripts is flagged, not silently skipped.
- **Launch surface**: QUICKSTART.md (shipped in the package), docs quickstart page,
  case study + whitepaper (anonymized, per-figure caveats, external evidence
  labeled), README/landing positioning, owner-edit announcement draft.
- **Do-not-say lint**: page-class split — self-copy pages ban "first ever" variants
  (Unicode-hyphen normalized), percentage claims, and badge-jargon; evidence pages
  additionally must trace **every** percentage figure verbatim to the research
  source document. Deliberate-violation fixtures both ways.

## Review Trail

Codex, 4 rounds: fail (3 critical + 5 P2) → fail (3 P2 + 1 P3) → fail (1 P2) →
**pass, 0 findings**. The criticals: a safe-integer bypass of the very quorum gate
this PRD shipped, config-controlled path escape in init, and a misattributed
evidence figure on the launch page arguing against unattributed claims. Full
disposition table in
[review-004-launch-quickstart.md](../reviews/review-004-launch-quickstart.md).

## Verification

330/330 tests (31 files), types/lint/build clean, `gate check PRD-004` green,
`gate check --wiring` green, push refusal intact, hygiene greps clean. Full ledger
in the task file.

## Learnings

- The reviewer's round-1 quorum exploit (`5404319552844595/9007199254740993 pass`)
  is now a named boundary test — calibration by adversary continues to outperform
  calibration by author.
- Evidence pages needed a *stricter* number rule than marketing pages, not a
  looser one: all-figure tracing, not claim-phrase matching.
- `{}` as a starter manifest was a trap: deep-merge semantics made "empty" inherit
  the full default gate set. Explicit empty floors are the honest scaffold.
