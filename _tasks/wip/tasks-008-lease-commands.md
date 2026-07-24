# Tasks: Lease Commands

> **PRD**: [prd-008-lease-commands.md](../../_prds/wip/prd-008-lease-commands.md)
> **Readiness**: [readiness-008-lease-commands.md](../../_readiness/wip/readiness-008-lease-commands.md)
> **Status**: Code Complete
> **Readiness Score**: 8.7/10
> **Model Tier (Execution)**: medium
> **Created**: 2026-07-24
> **Updated**: 2026-07-24

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- A PRD may be `Code Complete` with operator handoff items, but it is not
  `Ship Verified` until required handoff items are resolved or explicitly accepted.
- Phase 4 agents hold a valid lock lease (METHOD.md → Locks) before editing
  implementation files or this task file.

---

## Relevant Files

- `packages/provegate/src/core/run/release.ts` — new: `releaseLease` (guarded unlink)
- `packages/provegate/src/core/run/open.ts` — `--hours` plumb into `claimPrd`
- `packages/provegate/src/core/run/index.ts` — export `releaseLease`
- `packages/provegate/src/core/state/query.ts` — retain `expiresInSeconds` on inFlight row
- `packages/provegate/src/cli.ts` — `release`/`renew` verbs, queue countdown, usage
- `packages/provegate/test/release.test.ts` — own/foreign/force/malformed/race matrix
- `packages/provegate/test/state-query.test.ts` — additive `expiresInSeconds` field
- `packages/provegate/test/cli.test.ts` — renew + countdown render, additive JSON
- `packages/provegate/QUICKSTART.md` — renew-before-steal guidance
- `apps/docs/content/docs/cli.mdx` — release/renew documented

### Notes

- Thin composition over existing protocol: the only NEW mutation is the release
  unlink, under the existing `.gate-open.mutex`; renew is `claimPrd`'s refresh path.
- Implement AFTER PRD-007 lands and BEFORE PRD-011 (shared `open.ts`/`cli.ts`/
  `run/index.ts`/`cli.test.ts`; the path-conflict gate serializes them).
- `cli.mdx` also shared with PRD-009 — sequence the doc edit.
- Reference: `open.ts:163` (`claimPrd`), `:171` (leaseHours validation), `:205`
  (`leaseAgent`), `lease.ts:89` (`listLockFiles`), `query.ts:140,189-195` (inFlight
  Omit — the A1 fix site).

---

## Tasks

- [x] 1.0 Release engine (`releaseLease`)
  - [x] 1.1 Add `core/run/release.ts`: `releaseLease(config, root, id, {force?,
        agent?})` — parse locks via `listLockFiles` (read-only), select by prd,
        resolve agent identity exactly like `claimPrd`'s `leaseAgent` (trimmed
        `--agent` else `config.owners[0] ?? 'operator'`). (FR-1)
  - [x] 1.2 **W1 — release race**: parse + identity-check + unlink inside ONE
        `withWorkspaceMutex(claimMutexPath(...))` hold; identity-check the parsed
        snapshot against the file immediately before unlink so a rival claim that
        refreshed the lease mid-release aborts the unlink. (FR-1, W1)
  - [x] 1.3 Own vs foreign: own lease unlinks + reports; foreign lease without
        `--force` refuses (names holder, advertises `--force`, exit 1); with
        `--force` unlinks + prints the victim (prd, agent, expiry). (FR-1)
  - [x] 1.4 **W4 — malformed fail-closed**: a corrupt/unparseable lease for the id
        blocks the release (no unlink), names the repair path, exit 1. (FR-1, W4)
  - [x] 1.5 No lease for the id → "nothing to release", exit 0 (idempotent). (FR-1)
  - [x] 1.6 `test/release.test.ts`: own / foreign / `--force` matrix; victim
        reporting; idempotent no-lease; malformed fail-closed; **mutex
        serialization** (release racing a claim that refreshes — assert abort). (FR-5)

- [x] 2.0 Renew + `--hours`
  - [x] 2.1 Add `gate renew PRD-XXX [--hours=N]` in `cli.ts`: a CLI verb over
        `claimPrd` with `leaseHours` from `--hours` (default `DEFAULT_LEASE_HOURS`);
        reports `refreshed: true`; conflicts discovered at renew refuse exactly
        like a fresh claim. **W2 — no divergent behavior** vs a direct claim. (FR-2, W2)
  - [x] 2.2 Teach `gate open` `--hours` for symmetry (`open.ts` maps it into
        `claimPrd`'s `leaseHours`; engine already validates positive+finite at
        `open.ts:171`, CLI maps the throw to exit 1 + message). (FR-2)
  - [x] 2.3 `test/open.test.ts`: renew delegation, `--hours` validation (reject
        non-positive/non-finite → exit 1). (FR-5)

- [x] 3.0 Queue countdown (A1 fix)
  - [x] 3.1 `core/state/query.ts`: change the `inFlight` row from
        `Omit<QueueLockInfo,'expiresAt'> & { stale }` to also carry
        `expiresInSeconds` (computed at build from `expiresAt`, `stale` retained).
        Unparseable dates → the field is `null`; never throw. (FR-3, A1)
  - [x] 3.2 `cli.ts` queue renderer: format remaining time per lease
        (`3h 12m left` / `STALE 1h 4m`); unparseable renders `?`. (FR-3)
  - [x] 3.3 `--json`: surface `expiresInSeconds` on inFlight rows — **additive
        only**, no field removed or renamed. **W3 — JSON stability**. (FR-3, W3)
  - [x] 3.4 `test/state-query.test.ts`: assert `expiresInSeconds` present +
        correct sign for a stale lease; existing fields unchanged. (FR-5)

- [x] 4.0 Exports + usage
  - [x] 4.1 Re-export `releaseLease` through `core/run/index.ts` (fans out via
        `core/index.ts` → `src/index.ts`; the bare barrel is not edited). (FR-4)
  - [x] 4.2 `cli.ts` usage + command router: add `release` and `renew` rows;
        both bins (`provegate`, `gate`) reach them. (FR-4)

- [x] 5.0 Tests (aggregate)
  - [x] 5.1 `test/cli.test.ts`: renew CLI path + countdown render + additive JSON
        assertions. (FR-5)
  - [x] 5.2 Confirm the full prior suite is unchanged (no regression from the
        query.ts row change). (FR-5)

- [x] 6.0 Docs
  - [x] 6.1 `apps/docs/content/docs/cli.mdx`: add `release` + `renew` rows. (FR-6)
  - [x] 6.2 `QUICKSTART.md`: lease section mentions `gate renew` before `--steal`.
        (FR-6)

- [x] 7.0 Phase 5 — Testing
  - [x] 7.1 Run every PRD §11 command; paste evidence into the Verification Ledger.
  - [x] 7.2 Cross-cutting floor: `pnpm check-types`, `pnpm lint`,
        `pnpm --filter provegate test`, `pnpm build`, `gate check PRD-008`,
        never-push, hygiene grep.

- [ ] 8.0 Phase 6 — Final Auditing
  - [ ] 8.1 Independent adversarial review → verdict artifact at
        `_docs/reviews/review-008-lease-commands.md`. `Verdict: pass` requires
        `Critical: 0`. Reviewer attacks: the release-race window (identity-check vs
        unlink ordering), `--json` additive-only claim, malformed fail-closed.

- [ ] 9.0 Phase 7 — Learning
  - [ ] 9.1 Confirm the declared Durable Artifacts (`cli.mdx`, `QUICKSTART.md`) are
        in the merge diff.
  - [ ] 9.2 Knowledge ingest: the release-mutex identity-check discipline (steal
        parity) — not derivable from the code alone.

---

## Verification Ledger

| Gate               | Command / Check                                                          | Scope     | Result  | Evidence | Notes                          |
| ------------------ | ------------------------------------------------------------------------ | --------- | ------- | -------- | ------------------------------ |
| FR-1               | `pnpm --filter provegate test test/release.test.ts`                     | provegate | passed  | 7 tests: own/foreign/force/idempotent/malformed/other-id/race | |
| FR-2               | `pnpm --filter provegate test test/open.test.ts`                        | provegate | passed  | leaseHours maps expiry; non-positive/non-finite throws | renew = refresh |
| FR-3               | `pnpm --filter provegate test test/state-query.test.ts test/cli.test.ts` | provegate | passed  | expiresInSeconds additive + null; formatLeaseRemaining badges | |
| FR-4               | `grep -c -e "  release " -e "  renew " packages/provegate/src/cli.ts`    | provegate | passed  | 2 (both usage rows)             | |
| FR-5               | `pnpm --filter provegate test`                                          | provegate | passed  | 36 files, 461 tests             | priors unchanged |
| FR-6               | `grep -c "gate renew" packages/provegate/QUICKSTART.md`                 | provegate | passed  | 1 (+ cli.mdx release/renew)     | |
| types              | `pnpm check-types`                                                       | root      | passed  | 0 errors                        | |
| lint               | `pnpm lint`                                                              | root      | passed  | 0 warnings                      | |
| build              | `pnpm build`                                                             | root      | passed  | 3 tasks (incl docs)             | |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-008`                     | repo      | passed  | exit 0                          | |
| never-push         | `node packages/provegate/dist/cli.js push; test $? -eq 1`               | repo      | passed  | exit 1                          | |
| hygiene            | `grep -ri -l -e emofy -e rayvaz packages/provegate/src && exit 1 \|\| true` | provegate | passed  | clean                           | |
| independent-review | `_docs/reviews/review-008-lease-commands.md`                            | repo      | pending |          | verdict pass, critical = 0      |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

- 3.2 — `formatLeaseRemaining` (the countdown badge) lives in `core/state/query.ts`
  beside the `expiresInSeconds` field it renders, not in `cli.ts`, so it is a pure
  unit-testable function (`state-query.test.ts`); `cli.ts` imports it. `cli.test.ts`
  keeps only the safe integration checks (help lists renew/release; bare commands
  → usage exit 1) since it spawns the real binary against the working repo.
- 1.6 — `releaseLease` gained a `raceWindow?` test seam mirroring
  `ClaimOptions.raceWindow`, so W1 (release racing a refresh) is exercised
  deterministically: the callback rewrites the lease's `expiresAt` between parse
  and unlink, and the identity re-check aborts that unlink.
- 1.1 — malformed leases FOR the id are detected by filename prefix
  (`${id}-`), not content, so an unreadable lease is still attributed to the id and
  fails closed (its `prd` field can't be read).

---

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

---

## Blockers / Open Questions

- (none — sequence after PRD-007, before PRD-011; `cli.mdx` shared with PRD-009)

---

## Operator Handoff

> None — every gate is machine-checkable (thin composition over existing
> protocol). The empty row keeps the operator-row count at 0 so the merge gate
> needs no acceptance.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
|      |          |       |                |        |       |
