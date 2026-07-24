# Independent Review: PRD-008 — Lease Commands (`gate release` + `gate renew` + queue countdown)

> **PRD:** PRD-008
> **Verdict:** pass
> **Reviewer:** Sonnet 5 (independent Phase 6 session)
> **Base SHA:** `ca0d5f2437de7c58cbfc55212ac366d54bf36dee`
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single independent reviewer)

## Summary

Reviewed `git diff ca0d5f2..921547c` (feature tip `921547c5bea0b131041800754f88b93d6f7b1cc5`) in
full: the new `releaseLease` (`core/run/release.ts`), the `gate renew`/`gate release` CLI
verbs and `--hours` plumbing (`cli.ts`, `open.ts`), the `inFlight.expiresInSeconds` addition
and `formatLeaseRemaining` (`core/state/query.ts`), and all four touched test files. I did
not rely on reasoning alone: I built the package and ran `releaseLease` directly against
~15 hand-built adversarial workspaces (temp dirs + hand-written lock JSON, mirroring
`release.test.ts`'s own harness), plus a full end-to-end run of the actual built CLI
(`dist/cli.js renew` / `release`, spawned as a child process exactly like the existing
`gate open (live CLI)` test does) exercising the success paths that the committed test
suite does not cover at the CLI level. All of it passed.

**Release race (W1).** The entire select → malformed-check → foreign-check →
identity-recheck → unlink sequence runs inside one `withWorkspaceMutex` hold — confirmed by
reading `release.ts` top to bottom (`listLockFiles` is called *inside* the callback passed to
`withWorkspaceMutex`, not before it), so there is no TOCTOU between listing and mutex
acquisition. I extended the shipped `raceWindow` test with two more scenarios beyond the one
in `release.test.ts` (which only covers a same-id `expiresAt` rewrite): a rival that fully
*replaces* the lease (different agent + lockId, simulating a foreign steal landing mid-release)
and a rival that *deletes* the file outright between parse and unlink. Both are caught by the
identity re-check / try-catch around the fresh read — the unlink is skipped, the surviving or
vanished state is reported as an issue, nothing crashes, no lease is silently dropped or
double-deleted.

**Own/foreign guard.** `resolveAgent` mirrors `claimPrd`'s `leaseAgent` resolution exactly
(trimmed `--agent`, else `config.owners[0]`, else `'operator'`). I confirmed empirically that
a whitespace-only `--agent` value falls back to the default owner (not treated as a distinct
empty-string identity), and that no combination I tried — plain foreign, *stale* foreign
(still requires `--force`, mirroring `--steal`'s "stale still blocks" doctrine), or *mixed*
ownership (one own + one foreign lock file for the same id) — releases a foreign lease
without `--force`. Mixed ownership refuses the *whole* operation (both files survive) rather
than partially releasing the caller's own entry; that's a conservative, defensible choice, not
a bug — the alternative (silently splitting the outcome) would be harder to reason about, and
nothing in the PRD requires partial release.

**Malformed fail-closed, filename-prefix matching.** The `${id.toLowerCase()}-` prefix used
for the malformed gate includes the trailing hyphen, which is exactly what prevents the
over-match the review brief worried about: I verified `PRD-1` does **not** match
`prd-10-*.json` or `prd-100-*.json` (the hyphen forces an exact numeric boundary), and that a
malformed (corrupt-JSON) lease for a *different* id never blocks release of the target id. I
also verified the `now: 0` neutralization passed to `validateLock` does what its comment
claims: a well-formed but *expired* lease — own or foreign — is never misclassified as
"malformed" and releases normally (with `--force` still required for the foreign case,
matching FR-1). Two lock files legitimately sharing one `prd` (e.g. an old-slug/new-slug pair
left behind by a rename) both release correctly — the content-authoritative `mine` filter and
array-shaped `ReleaseResult.released` are built for exactly this multiplicity.

**`expiresInSeconds` / queue countdown.** `buildQueue`'s `Queue.inFlight` gained the field
purely additively — `runQueue`'s `--json` path does `JSON.stringify(queue, ...)` directly with
no reshaping step, so nothing could have silently dropped it, and no existing field was
renamed or removed. Staleness for an unparseable `expiresAt` is unchanged behavior (`NaN < now`
was always `false`; the rewritten `!parsed && expiry < now` — where the local is named
`parsed` but actually means "is NaN" — preserves that, verified against the old code and via
the shipped `state-query.test.ts` case). Sign and rounding are correct for past (negative),
future (positive), and unparseable (`null`) — checked past/future/zero/sub-minute cases
directly against `formatLeaseRemaining`.

**`--hours` validation / renew delegation.** Confirmed through a live CLI run that
`gate renew PRD-XXX --hours=6` sets a lease whose expiry is genuinely ~6h out, and that
`gate renew PRD-XXX --hours=-3` exits 1 via the real binary (not just the unit-level
`claimPrd` throw test already in `open.test.ts`). `runRenew` passes no `steal`/`worktree` to
`claimPrd`, so renew cannot accidentally provision a worktree or steal — it is exactly the
refresh path, as required.

**Regressions.** Diffed old vs. new test files line by line: no assertion was weakened, only
extended (the `inFlight` equality check gained the new field; the disjoint/prefix/foreign
cases from prior PRDs are untouched). Full suite: 461/461 passing, matching the PRD's stated
baseline. `check-types`, `lint`, and `build` are all clean.

No Critical or High findings. Three purely cosmetic/Low observations, none of which cause a
foreign lease to drop silently, the wrong lease to be unlinked, or a `--json` consumer to
break — see the table.

## Findings

| #   | Sev  | Finding | Resolution |
| --- | ---- | ------- | ---------- |
| 1   | LOW  | `gate release <id>` does no id-format validation against `config.idPattern` (unlike `gate open`/`gate renew`, which route through `candidateFromPrd`'s strict width-regex and throw a loud "malformed id" error). A wrongly-padded or malformed id (e.g. `PRD-1` instead of `PRD-001`) silently resolves to `"nothing to release — no lease found for PRD-1"` instead of an explicit format error. Verified this does not cause any cross-id collision — the trailing-hyphen filename prefix (`${id}-`) correctly disambiguates `PRD-1` from `prd-10-*`/`prd-100-*`. Cosmetic/UX inconsistency only. | **waived (intentional)** — release must work for leases whose PRD file no longer exists (archived/renamed PRDs; exactly the lingering-lease case release exists to clean), so it deliberately does NOT route through `candidateFromPrd`; a garbage id resolving to "nothing to release" is correct, not a collision |
| 2   | LOW  | The local variable named `parsed` in `buildQueue` (`core/state/query.ts`) actually means "expiry failed to parse" (`Number.isNaN(expiry)`) — the opposite of what the name suggests. Verified the logic is correct despite the confusing name (`!parsed && expiry < now` correctly reduces to the old `Date.parse(...) < now` behavior, since `NaN < now` is always `false`). Readability nit only, zero functional impact. | **fixed** — renamed `parsed` → `unparseable` in the implementing session (pure rename, logic unchanged) |
| 3   | LOW  | The committed test suite exercises `runRenew`/`runRelease` at the CLI level only for the missing-id usage-error path (`cli.test.ts`); there is no repo-committed end-to-end test spawning the real built CLI for a successful `renew`/`release`/`release --force` run, unlike `gate open`, which has a `describe('gate open (live CLI)')` block. The underlying engine functions (`releaseLease`, `claimPrd`) are thoroughly unit-tested directly, and I confirmed via my own end-to-end script (spawning `dist/cli.js`) that the CLI argument-parsing and output-formatting glue in `runRenew`/`runRelease` all work correctly for: renew success + expiry check, invalid `--hours` (exit 1), foreign release refusal (exit 1, names the holder), forced release (exit 0, names victim + `FORCED`), own release (exit 0), and the idempotent no-op. So this is a coverage gap, not a live defect. | **waived** — the release/renew logic is fully unit-tested (`release.test.ts` 7 cases, `open.test.ts` leaseHours) and both the reviewer and the implementing session live-verified the thin CLI wiring; a spawn-based success-path test would mutate real `_state/locks/` and read as flaky. Recorded as a follow-up (isolated-cwd live-CLI block) |

## Post-fix verification

**Post-review disposition (implementing session):** Low #2 (misleading `parsed` variable
name) was fixed — renamed to `unparseable` in `core/state/query.ts`, a pure rename with no
logic change; suite re-run green (461). Low #1 (id-format validation) waived as intentional —
`gate release` must serve leases whose PRD file is gone, so it deliberately skips
`candidateFromPrd`. Low #3 (no live-CLI success-path test) waived — logic fully unit-tested and
live-verified; a spawn-based test would mutate real state; recorded as a follow-up. Verdict and
counts unchanged (Critical: 0).

No fixes were required for the `pass` verdict itself (Critical: 0). Commands actually run during
this review:

- `pnpm --filter provegate build` — clean; confirmed `releaseLease` is exported through
  `dist/index.js` (per FR-4, unlike PRD-009's intentionally-unexported `globsMayIntersect`)
- `pnpm --filter provegate test` — 36 files / 461 tests passed (matches the PRD's stated baseline)
- `pnpm check-types` — clean (all 3 packages)
- `pnpm lint` — clean
- Adversarial script against `releaseLease` (temporary, deleted before finishing): stale
  own/foreign release, filename-prefix disambiguation (`PRD-1` vs `prd-10-*`/`prd-100-*`),
  malformed-lease-for-a-different-id isolation, dual-lock-file-same-id release, whitespace-only
  `--agent`, lowercase id, two additional race-window scenarios (full rival replacement,
  mid-release deletion), and `formatLeaseRemaining` boundary cases — 12/12 checks passed
- Mixed-ownership adversarial script (temporary, deleted before finishing): one-own +
  one-foreign lock file for the same id refuses wholesale without `--force`, releases both
  with `--force` — 2/2 checks passed
- End-to-end live-CLI script (temporary, deleted before finishing): full `gate init` → `new`
  → `open` → `renew --hours=6` → `renew --hours=-3` (rejected) → `release` foreign (refused) →
  `release --force` (succeeds, names victim) → `release` own (succeeds) → `release` again
  (idempotent no-op) — 11/11 checks passed

`git status` at the end of this review shows only this review artifact as new/changed; all
temporary scripts lived under the session scratchpad outside the repo and were deleted
regardless.
