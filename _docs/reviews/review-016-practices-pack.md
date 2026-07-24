# Independent Review: PRD-016 — Practices Pack (`gate init --practices`)

> **PRD:** PRD-016
> **Verdict:** pass
> **Reviewer:** Codex (OpenAI Codex CLI, 4 rounds) + two independent Claude Sonnet sessions
> **Tool/Model:** codex exec (read-only sandbox, cross-model) + Sonnet subagents (fresh context, no authoring state)
> **Base SHA:** `c987008`
> **Diff range:** c987008..1cbdb6a
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 3 independent reviewers converged on pass (codex R3/R4; sonnet-A pass w/ 4 medium — closed; sonnet-B fail w/ 1 critical — closed, closure verified by codex R4)

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
sweep found no new critical.

**Sonnet rounds (parallel independent sessions, verdicts delivered after codex R3):**
sonnet-A: pass with 4 medium — two already closed by R1; the remaining two (unrecorded
out-of-surface index.ts barrel export; PACK_MAP safety comment contradicted by the
readdirSync verify/ install) fixed in `1cbdb6a`. sonnet-B: FAIL with 1 critical —
the internal numbered taxonomy ("practice NN" / "pattern PN") leaked into ~10 packed
comments, a W1 class both codex rounds missed; fixed in `1cbdb6a` (self-contained
descriptions; hygiene test now bans the class; verify/ install moved into the explicit
PACK_MAP). **Codex R4 delta confirmation: pass** — greps clean, 12/12 verify files
explicit, no new findings. (Reviewers' sandboxes could not run vitest; the author-side
suite is green: fixture 9/9, full repo floor.)

## Verdict rationale

The load-bearing risks — origin leakage into third-party repos and injectable
pre-commit security scripts — were found, fixed, and pinned with regression fixtures
that fail when the fixes are reverted. Remaining work (owner acceptance of shipping
method content) is the operator gate, not a code finding.
