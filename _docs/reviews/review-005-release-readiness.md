# Independent Review: PRD-005 — Release Readiness

> **PRD:** PRD-005
> **Verdict:** pass
> **Reviewer:** codex (OpenAI Codex CLI, model gpt-5.6-sol, reasoning high)
> **Base SHA:** `7f978600c2`
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single cross-model reviewer over two rounds)

## Summary

Brief: pack whitelist gaps, license identity (W1), version flow (W2/W3), RELEASING.md
publish-path audit, §12 frozen-surface compliance.

**Round 1: fail — 1 critical + 2 P2.** The critical hit the PRD's primary invariant:
whole-directory allowlisting plus "at least one file" assertions meant a stray file
under `prompts/` — or the deletion of every prompt but one — passed the tarball audit.
P2s: the version-pin regex missed semver-range forms (`provegate@^0.1.0`), and the
branch bled an unrelated PRD-006 state-record change.

**Round 2: pass — 0 findings.** The packed set now compares exactly against a
committed manifest (43 entries; extra and missing reported separately), a belt test
keeps the manifest itself honest, the residue scan reads every packed file (token set
extended), pin detection covers ranges with deliberate-violation fixtures, and the
state diff is zero.

Round 1 confirmed clean on first inspection: frozen surfaces (src/, workflows/) at
zero diff, license identity root↔package under `ProveGate contributors`, 0.1.0 bump
correctly scoped with CHANGELOG generated (and codex verified the claim that npm's
always-included list excludes changelogs — adding CHANGELOG.md to `files` was
necessary, not decorative), RELEASING.md contains no auto-publish path, no committed
pack artifacts.

## Disposition of findings

| # | Sev | Finding | Resolution |
| - | --- | ------- | ---------- |
| 1 | P1 | permissive pack whitelist | exact committed manifest + belt test + full-set residue scan |
| 2 | P2 | version-pin regex gaps | range-aware pattern + vacuity fixtures |
| 3 | P2 | _state scope bleed | restored to main; zero _state diff |
