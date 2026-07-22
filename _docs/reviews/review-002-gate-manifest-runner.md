# Independent Review: PRD-002 — Gate Manifest + Autorun Runner

> **PRD:** PRD-002
> **Verdict:** pass
> **Reviewer:** codex (OpenAI Codex CLI v0.144.3, model gpt-5.6-sol, reasoning high)
> **Base SHA:** `b173d20f8ed33dd76ad57868e62795ef7631aa84`
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single cross-model reviewer over three rounds; panel arrives with a
> later milestone)

## Summary

Adversarial review of the runner core, primed per the readiness report to attack the merge
state machine, the command-safety allowlist, the recursion sentinel, and the auto-revert
paths. Round 1 (1.79M tokens): **fail** — 8 critical + 2 advisory, including a
gate-land acceptance bypass, archive-before-preconditions index sweeps, detached-HEAD
self-merge, HEAD~1 revert assumptions, and two faithful ports of latent source bugs (lone
`&` in the safety gate; the skip-all-on-merge semantics). Round 2 (761K tokens): 8/10
resolved, two incomplete (absent-manifest safety, bare-token visibility) plus a NEW
critical (newline separator bypass) and two test-adequacy caveats. Round 3 (237K tokens):
every item **RESOLVED** by built-artifact probes, no new issues — **pass**. The reviewer
executed its original exploit probes against the compiled dist at each round.

## Findings

| #   | Sev      | Finding                                                                                                                      | Resolution                   |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | CRITICAL | Lone `&` accepted by safety gate (backgrounding + sentinel-clear payloads)                                                   | fixed (`465d2e3`)            |
| 2   | CRITICAL | Manifest/config commands executed as trusted, bypassing the safety gate; round 2: absent-manifest defaults still unvalidated | fixed (`465d2e3`, `508334f`) |
| 3   | CRITICAL | `gate land` (`--from-phase=merge`) skipped the operator-acceptance merge gate                                                | fixed (`465d2e3`)            |
| 4   | CRITICAL | Archive ran before merge preconditions and committed the whole index                                                         | fixed (`465d2e3`)            |
| 5   | CRITICAL | Detached HEAD treated as branch `HEAD` → self-merge of the base tip                                                          | fixed (`465d2e3`)            |
| 6   | CRITICAL | Auto-revert assumed `HEAD~1` was the pre-merge tip                                                                           | fixed (`465d2e3`)            |
| 7   | CRITICAL | Worktree-path merge conflict unhandled (stranded `MERGE_HEAD`)                                                               | fixed (`465d2e3`)            |
| 8   | CRITICAL | Review gate accepted `Critical: -1` / forged values / substring id matches                                                   | fixed (`465d2e3`)            |
| 9   | ADVISORY | Non-prefix §11 tokens silently invisible; round 2: bare words still hidden                                                   | fixed (`465d2e3`, `508334f`) |
| 10  | ADVISORY | Unknown manifest phase keys counted as wired while never executing                                                           | fixed (`465d2e3`)            |
| 11  | CRITICAL | (round 2, NEW) newline-separated payloads passed the safety gate                                                             | fixed (`508334f`)            |

Test-adequacy caveats (round 2): worktree revert now proven against an intervening
post-merge commit; a real-CLI test proves `gate land` from the base refuses before any
archive mutation. Dogfood note: the hardened lint then flagged a backticked `none` token
in this PRD's own §11 row — the gate corrected its own specification document.

## Post-fix verification

- `pnpm check-types` / `pnpm lint` / `pnpm build` — 3/3 tasks each
- `pnpm --filter provegate test` — 211/211 (23 files), one regression test per finding
- Live: `gate check PRD-002` exit 0, `gate check --wiring` exit 0,
  `gate run --dry-run PRD-002` exit 0, nested sentinel refusal exit 1
- Reviewer re-ran its round-1 exploit probes against the built dist in round 3: all refused

Reviewer sandbox note: vitest/turbo could not start under codex's read-only sandbox
(`EPERM` on temp dirs) in every round; the reviewer verified via tsc, eslint, source
tracing, and direct compiled-module probes, stated explicitly each time.
