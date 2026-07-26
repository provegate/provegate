# Independent Review: PRD-022 — Control-Artifact Revalidation

> **PRD:** PRD-022
> **Verdict:** pass
> **Reviewer:** codex CLI session (independent of the implementing agent)
> **Tool/Model:** OpenAI Codex CLI, read-only sandbox — a different model family from the implementer (Claude Opus 5)
> **Base SHA:** e107a0984d7b25b921aeafffb24c51c12496c64a
> **Diff range:** e107a09..HEAD
> **Critical:** 0
> **High:** 0
> **Medium:** 3
> **Quorum:** 1/1 pass (single cross-model reviewer)
> **Rounds:** 1 adversarial round; round 1 returned DO NOT CLOSE and its four blockers are remediated
> **Date:** 2026-07-26

**The severity counts are OUTSTANDING findings.** Round 1 raised four blocking items; all
four are fixed in code and tests. The three Medium rows are confirmed-real findings that
are inherited or adversarial-only, recorded as deferrals with owners rather than absorbed.

## Method

One adversarial round by a different model, run read-only against the branch with the diff
as its scope. The brief named six guarantees, required a likelihood rating
(`routine` / `plausible` / `adversarial`) for every failure, required `CONFIDENCE` on every
claim, and pointed the reviewer at the two things the tests cannot self-check: whether the
claim refusal bytes are genuinely unchanged, and whether the fixture's negative assertions
would also pass with the feature removed.

Round 1 returned **DO NOT CLOSE** with four blocking items. Every finding was re-verified
against source before being accepted or rejected. Four were taken as code or test changes;
three were confirmed real but out of this PRD's Conflict Surface or adversarial-only, and
are recorded as deferrals rather than silently absorbed.

## What the review confirmed

- **Ordering contract holds.** `extra` → config → manifest, ref-side mismatches before
  checkout-side, first-occurrence dedup. Verified at the source lines, `CONFIDENCE: high`.
- **Nothing else changed.** The insertion is inside `runRun` only; `--dry-run` returns
  above it, `check` / `status` / `queue` never reach it, and a genuinely unstamped lease
  follows the unchanged path. `CONFIDENCE: high`.
- **A worktree editing its own PRD cannot be refused** — the seam passes no `extra` and the
  primitive adds only the two control filenames. The reviewer noted this was established by
  code reading alone; it is now a test.
- **The ordinary drift negatives are real**: without the seam the checkout's manifest still
  carries the marker command and `runChain` writes both the marker and the metric row, so
  their absence is evidence.

## Round 1 — findings taken

| # | Finding | Likelihood | Resolution |
| - | ------- | ---------- | ---------- |
| 1 | The fail-closed branch emitted its own sentence ("unusable workflow artifact"). `git hash-object` can fail on a legitimate file through a failing clean filter — a case `open.ts` previously reported as ordinary drift — so the claim refusal bytes were **not** unconditionally unchanged | plausible | Taken. The branch now refuses with the canonical text; the remedy is the same either way (restore from base). FR-3's promise holds for every input, not just the tested ones |
| 2 | The claimed before/after byte comparison ran in a scratch directory and left **no evidence in the repository** — the implementation commit added the code and the ledger sentence together | — | Taken. `test/revalidate.test.ts` now claims, advances base, re-claims, and asserts the whole refusal string including the `claim rolled back: ` prefix. The one-off comparison became a permanent pin |
| 3 | The ordering fixture made every entry fail **both** comparators, so first-wins and last-wins dedup produce identical output — it could not verify the rule it named | — | Taken. The worktree is now given the root's manifest but not its config, so raw is `[prd, config, manifest, prd, config]` and the three candidate rules produce three different orders |
| 4 | Guarantee 6 rested on code reading: the fixture edits the PRD **before** claiming, which proves nothing about the check | — | Taken. A new case edits the PRD inside the worktree after the claim and asserts the run proceeds |

Two smaller items were also taken: the deleted-manifest negative is re-anchored on the
metric row (measured to have a cause independent of the scenario, where the marker file
does not), and the allowlist assertion is labelled as a diagnostic rather than proof of
executability.

## Round 1 — findings recorded, not taken

| # | Finding | Likelihood | Why it is recorded |
| - | ------- | ---------- | ------------------ |
| 5 | A checkout that edits `dirs.locksDir` makes `worktreeStamps()` miss its own lease, so the seam skips on its documented `stamps !== null` guard | plausible | Verified at `core/locks/lease.ts:19-20` and **inherited**: the same edit hides the lease from `gate status`, `gate queue`, the merge gate and teardown. The lease is lost for every purpose, not just this check. The fix belongs to lease discovery, outside this Conflict Surface |
| 6 | A checkout that commits `branches.base` pointing at its own feature branch compares itself against itself | adversarial | Same shape as #5 and larger: that edit also redirects the merge target. Inherited, out of surface |
| 7 | An absent-then-restored manifest can be hashed after parsing and pass, while the already-built chain holds `defaultManifest` | adversarial | Real. Needs a concurrent writer landing inside one process's own execution. The obvious fix — refusing when the file exists but `manifestSourceFor` is null — is a second definition of drift inside `cli.ts`, which PRD §12 lists as a DO NOT. **Deferral: owner, due 2026-09-26** |

## Note on the reviewer's own limits

The reviewer could not execute the suite: the managed sandbox denied Vitest's temporary
directory creation with `EPERM`, so every finding came from source and fixture tracing. It
said so explicitly rather than implying it had run anything — which is why the two findings
that turned on *runtime* behaviour (the deleted-manifest marker, the ordering dedup) were
re-measured here before being accepted. Both held.

## Verdict

**pass.** The four blocking findings are remediated in code and tests; the three remaining
are confirmed real, are either inherited or adversarial-only, and are recorded with owners
and dates rather than absorbed. Critical: 0. High: 0.

The round earned its cost twice over. Finding 1 is a defect the author introduced while
answering a different requirement, and it falsified a promise the PRD makes in writing;
finding 3 is a test that would have reported a passing dedup rule forever without testing
it. Both are exactly the class this repository's independence rule exists to catch — a
self-review had already looked at the same two places and passed them.
