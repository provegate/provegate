# Independent Review: PRD-038 — The Quickstart Executes, or It Fails

> **PRD:** PRD-038
> **Verdict:** pass
> **Reviewer:** independent Codex session — did not write the PRD, the readiness scores, or the implementation
> **Tool/Model:** GPT-5 via codex-cli 0.145.0, read-only sandbox
> **Base SHA:** `90fa05a2efbb7f77acd5a9511d311258196bafb8`
> **Diff range:** main..HEAD (implementation, two fix rounds, the post-steal wiring commit)
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass
> **Rounds:** 3 — round 1 GATE: FAIL (three [P1], two [P2]); round 2 GATE: FAIL (one lease-blocked [P1] held); round 3 GATE: PASS after the owner's stale-lease steal landed the CHECKS member; two cosmetic [P2]s from round 3 fixed in the close-out

## Independence

The reviewer is a separate Codex session with no implementation context; seven other
independent sessions scored the PRD's readiness. Findings were established and
re-verified by execution in the reviewer's own read-only environment, including
grammar-hole probes against both parsers, an npm-environment injection probe, and
re-runs of `verify:workflow`, `check:wiring`, `verify:quickstart-parity`,
`verify:brain` and `verify:script-classes`. The implementing session transcribed
this artifact from the reviewer's verbatim round outputs; the verdict line and
every finding are the reviewer's.

## Findings

All **closed**; the counts above are the post-fix state.

- **[P1] round 1 · parity was not CI-gated.** The check's only executing surface
  was the repo's `gates.manifest.json` phases."4" (a valid interim recorded when
  PRD-034's lease blocked the CHECKS file), but CI runs `verify:workflow`, whose
  CHECKS omitted it — a docs-twin change could pass CI. Round 2 held the finding:
  "the lease explains serialization; it does not complete the requirement."
  **Closed in round 3** after the OWNER stole the ~8h-stale PRD-034 lease (the
  method's designed mechanism): the CHECKS member landed, the interim surface was
  retired (no duplicate execution), the moved pack-drift pair reconciled;
  `verify:workflow` executed parity in the reviewer's own run, `check:wiring`
  reports `bundle:10`.
- **[P1] round 1 · the closed grammar silently excluded commands.** `qs:skip`
  accepted intervening content before a later fence, and a trailing backslash
  dropped its command (`joined` never flushed) — both reproduced by probes, and
  duplicated identically in the parity verifier so parser equivalence could not
  catch them. **Closed:** both parsers bind `qs:skip` through blank lines only to
  the immediately next ```sh fence and flush an unterminated continuation as a
  named failure, with the reviewer's probes added as harness cases.
- **[P1] round 1 · the harness was not hermetic against npm state.** `childEnv`
  preserved `npm_config_cache`/`NPM_CONFIG_*` (an injection probe retained
  outside paths), only the install line was registry-pinned, and setup packed
  without building. **Closed:** all `npm_config_*`/`NPM_CONFIG_*` scrubbed; every
  child pinned by a scratch `.npmrc` (unreachable registry, scratch cache,
  notifier off); setup builds when `dist` is absent — the unconditional rebuild
  the finding suggested was measured to race sibling suites over the shared
  `dist` and is deliberately avoided, with gated-path freshness owned by the
  phase-4 build-before-test order (the residual ad-hoc stale-dist case was
  downgraded by the reviewer to a non-blocking [P2]).
- **[P2] round 1 · the cleanup plant exercised a lookalike.** **Closed:** the
  plant now calls the harness's own `cleanupScratch` (shared path: first-attempt
  failure asserted, modes reset, retry, deletion verified).
- **[P2] round 1 · the ADR amendment split its table.** **Closed:** the rationale
  prose sits below the Classification table; `verify:brain` and
  `verify:script-classes` green.
- **[P2] round 3 · ledger-note miscount and a stale task-ledger row.** **Closed**
  in the close-out commit (the note no longer numbers the repo-only set; the FR-4
  row states the post-steal reality).

## Out-of-surface decisions, judged

The reviewer assessed the three recorded Deferrals: the lease serialization was
"a legitimate temporary lease workaround" whose completion the steal delivered;
the `content-adoption.test.ts` update preserves the test's claim (the practices
install exists as a command fence); the `practices-pack.test.ts` scoping keeps
PRD-026's provable claim (the five survivors raise no issue) while unpinning a
blanket invariant that forbade any future manifest-wired script.
