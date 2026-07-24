# Independent Review: PRD-016 — Practices Pack (`gate init --practices`)

> **PRD:** PRD-016
> **Verdict:** pass
> **Reviewer:** Codex (OpenAI Codex CLI, independent Phase 6 sessions, reasoning high)
> **Tool/Model:** codex exec, read-only sandbox — different model family from the author (Claude)
> **Base SHA:** `c987008`
> **Diff range:** c987008..e003a1b
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single cross-model reviewer over three rounds)

## Summary

Three adversarial rounds against the practices-pack change (`practices/` shipped
content, `gate init --practices`, the lifecycle fixture), with W1
(genericize-don't-copy) as the primary lens per the readiness assessment.

**R1 — FAIL (4 critical, 2 advisory):** origin-process terminology shipped in packed
files with a too-narrow hygiene test; the packed secret scanner allowed shell command
injection through a staged filename (`execSync` interpolation); the packed base-branch
guard ignored deletions and rename source paths; the bare-init parity test asserted
only prefix absence. Advisory: broken pack paths in PROTOCOL.md; hook mode subject to
umask. All fixed in `d210348`.

**R2 — FAIL (2 critical, 1 advisory):** the scanner fix left a second bypass — a
filename colliding with git index-stage syntax (`0:leak.txt`) was silently skipped;
the golden parity test compared parsed JSON, not bytes. Advisory: no behavioral
regression tests for the security scripts. All fixed in `e003a1b` (pathspec `:./`
form; byte-literal goldens; an adversarial-staging fixture running the INSTALLED
scripts, mutation-checked).

**R3 — PASS (0/0/0):** each prior finding verified CLOSED with evidence; full-branch
sweep found no new critical. (Codex could not re-run vitest in its read-only sandbox;
the author-side suite is green: 9/9 fixture, full repo floor.)

## Verdict rationale

The load-bearing risks — origin leakage into third-party repos and injectable
pre-commit security scripts — were found, fixed, and pinned with regression fixtures
that fail when the fixes are reverted. Remaining work (owner acceptance of shipping
method content) is the operator gate, not a code finding.
