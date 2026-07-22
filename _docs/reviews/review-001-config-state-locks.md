# Independent Review: PRD-001 — Config Core + State/Lock Extraction

> **PRD:** PRD-001
> **Verdict:** pass
> **Reviewer:** codex (OpenAI Codex CLI v0.144.3, model gpt-5.6-sol, reasoning high)
> **Base SHA:** `d739abc4be2b0a94dc23f0feeab8b20387b2df87`
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single cross-model reviewer over three rounds; the 5-lens panel
> arrives with the Phase C runner)

## Summary

Full adversarial review of `main...feat/prd-001-config-state-locks` (39 files,
+3479/−124) by a different model family, primed with PRD-001 §4/§11/§12, readiness watch
items W1–W4, and the source-snapshot scripts for port-fidelity comparison. Round 1
(1.06M tokens) returned **fail** — 4 critical, 3 advisory findings, all confirmed real.
Round 2 (423K tokens) verified the fixes, kept one item open (sentinel literal in the
producing path) and flagged three test-adequacy gaps. Round 3 (205K tokens) confirmed
every item resolved with no new issues: **pass**. Overall risk after fixes: low; the
review materially hardened config isolation (the point of this PRD).

## Findings

| #   | Sev      | Finding                                                                                   | Resolution                                   |
| --- | -------- | ----------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | CRITICAL | `"Unknown"` status literal in query (and, round 2, in build) instead of a shared sentinel | fixed (`a6071e1`, `d0d265d`)                 |
| 2   | CRITICAL | `completed`/`deferred`/`states[0]` hardcoded in queries — broke custom lifecycle names    | fixed (`a6071e1` — `dirs.stateRoles`)        |
| 3   | CRITICAL | `candidateFromPrd` hardcoded `drafts`/first-state search + `Phase 4` fallback             | fixed (`a6071e1`)                            |
| 4   | CRITICAL | Valid-JSON non-object lock file (`null`) crashed `gate queue`                             | fixed (`a6071e1`)                            |
| 5   | ADVISORY | Snapshot write not atomic — concurrent writers could interleave                           | fixed (`a6071e1` — temp+rename)              |
| 6   | ADVISORY | No semantic config validation — `ready: ["Approvd"]` typo passed silently                 | fixed (`a6071e1` — `validateResolvedConfig`) |
| 7   | ADVISORY | Configured prefixes interpolated into regexes unescaped                                   | fixed (`a6071e1`, test hardened `d0d265d`)   |

Round-2 test-adequacy caveats (candidate test used first state; no atomic-write
assertion; no `parseArtifactName` metacharacter case) were closed in `d0d265d`.

## Post-fix verification

Re-run after fixes (implementing session, this checkout):

- `pnpm check-types` — 3/3 tasks, zero errors
- `pnpm lint` — 3/3 tasks, zero warnings
- `pnpm --filter provegate test` — 120/120 (12 files), including one regression test per finding
- `pnpm build` — 3/3 tasks clean
- `node packages/provegate/dist/cli.js status` — exit 0, PRD-001 listed
- `node packages/provegate/dist/cli.js push` — refuses, exit 1

Reviewer re-ran `pnpm check-types` and `pnpm lint` independently (green); its sandbox
denied vitest temp-dir creation (`EPERM`), so test adequacy was judged by source-level
inspection against the pre-fix implementation, explicitly noted in its output.
