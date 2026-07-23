# Independent Review: PRD-007 — Worktree Lifecycle

> **PRD:** PRD-007
> **Verdict:** pass
> **Reviewer:** codex (OpenAI Codex CLI 0.145.0, reasoning high)
> **Base SHA:** `bd59384434`
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single cross-model reviewer over thirty-one rounds)

## Summary

Brief: rollback atomicity of worktree provisioning, dirty-tree handling and cleanup
ordering, base-checkout invariants, and the branch-pin guard.

**Rounds 1-29: 47 critical + 34 advisory findings, all fixed.** The review drove the
feature from "works on the happy path" to "refuses everything it cannot prove". The
findings clustered into five themes, each of which changed the design rather than
patching a symptom:

1. **Provisioning is not separable from the claim.** A worktree that fails to
   materialize must roll the lease back; a lease replaced mid-provision must be
   preserved, not overwritten; a rollback that cannot complete must say so instead of
   reporting success. The steal protocol's move-aside + identity-check discipline
   became the single shared routine for every rollback path.
2. **Teardown may only remove what it owns.** Containment is resolved (symlinks
   included) against `worktree.dir`, the occupant branch must match the stamp, the
   base and configured protected branches are never targets, and deletion happens in
   an owned `--no-checkout` scratch context pinned at the base so git's own mergedness
   and checked-out guards re-evaluate at delete time.
3. **The checkout must be provably the thing the lease describes.** Artifact
   validation binds to the bytes the claim actually parsed (blob SHA plus text,
   because a lossy clean filter can collapse two contents into one blob), covers the
   PRD and both control files, and re-runs after every `worktree add` — checkout hooks
   are arbitrary code. Attachment, branch tip, and pinned base are checked too.
4. **Identity, not fields, decides ownership.** Lease selection ranks by recency
   before reading stamps, fails closed on unreadable or partially stamped leases, and
   post-merge cleanup revalidates the complete serialized lease under the claim mutex
   so a rival's refresh is never torn down.
5. **A landed merge is immutable.** The archive's own commit SHA is pinned and merged
   directly; cleanup failures degrade to handoff-card warnings and never crash the
   close or roll the merge back.

Round 27 also caught a genuine test regression the full suite masked: a deliberately
broken lock fixture in `cli-state.test.ts` hijacked later tests in the same root once
fail-closed lease handling shipped. Every test file now passes in isolation as well as
in the suite.

**Round 30: pass — 0 critical, 1 advisory** (SHA-256 repositories with a raised
`core.abbrev` emit commit ids past the parser's 40-character bound). Fixed.

**Round 31 (confirmation): pass — 0 findings.** The reviewer verified the SHA-256 fix
in a SHA-256 repository with HEAD advanced by a post-commit hook, and confirmed
typecheck, lint, build, and tests pass.

## Disposition of findings

| # | Sev | Finding | Resolution |
| - | --- | ------- | ---------- |
| r1 | P1 ×3 | base-ref provisioning, tracked dirt under `worktree.dir`, pre-archive base guard | branch from `refs/heads/<base>`; untracked-only tolerance; `baseWorktreeReady` before archive |
| r2 | P1 ×2 | provisioning debris, throw-unsafe reuse probe | debris removed then named; probe failure means not-reusable |
| r3-r5 | P2 ×7 | containment, occupant checks, moved worktrees, quarantine visibility | resolved-target containment, occupant gating, move detection, always-visible quarantine |
| r6 | P1 | worktree close deleted its own metrics | `appendMetric` resolves against `mainRepoRoot` |
| r7-r13 | P1 ×6 | delete races, cwd deletion, protected branches, cleanup vs concurrent claims | owned scratch delete context, pre-teardown chdir, protected refusals, mutex-serialized cleanup |
| r14-r19 | P1 ×9 | crash-free cleanup, post-provision revalidation, uncommitted artifacts, pinned base | try-guarded teardown, byte-proof revalidation, commit-first refusal, one pinned base SHA |
| r20-r25 | P1 ×12 | parse-time provenance, live-base recheck, filtered hashing, real archive commit | snapshot binding, pre-delete revalidation, `--path` hashing, commit-reported SHA |
| r26-r29 | P1 ×8 | unattributable leases, one-sided stamps, victim restoration, whole-lease identity | fail-closed selection, pair-or-nothing stamps, rollback before refusal, full-document comparison |
| r30 | P2 | SHA-256 commit ids rejected | hash bound widened to 4..64 |

## Verification at review close

`pnpm check-types`, `pnpm lint`, `pnpm --filter provegate test` (440 passed, 69 in
`test/worktree.test.ts`), and `pnpm build` all green; every test file also passes when
run in isolation. Never-push invariant and hygiene scan unchanged.
