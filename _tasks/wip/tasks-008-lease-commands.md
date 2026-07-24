# Tasks: Lease Commands

> **PRD**: [prd-008-lease-commands.md](../../_prds/wip/prd-008-lease-commands.md)
> **Readiness**: [readiness-008-lease-commands.md](../../_readiness/wip/readiness-008-lease-commands.md)
> **Status**: Not Started
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

- [ ] 1.0 Release engine (`releaseLease`)
  - [ ] 1.1 Add `core/run/release.ts`: `releaseLease(config, root, id, {force?,
        agent?})` — parse locks via `listLockFiles` (read-only), select by prd,
        resolve agent identity exactly like `claimPrd`'s `leaseAgent` (trimmed
        `--agent` else `config.owners[0] ?? 'operator'`). (FR-1)
  - [ ] 1.2 **W1 — release race**: parse + identity-check + unlink inside ONE
        `withWorkspaceMutex(claimMutexPath(...))` hold; identity-check the parsed
        snapshot against the file immediately before unlink so a rival claim that
        refreshed the lease mid-release aborts the unlink. (FR-1, W1)
  - [ ] 1.3 Own vs foreign: own lease unlinks + reports; foreign lease without
        `--force` refuses (names holder, advertises `--force`, exit 1); with
        `--force` unlinks + prints the victim (prd, agent, expiry). (FR-1)
  - [ ] 1.4 **W4 — malformed fail-closed**: a corrupt/unparseable lease for the id
        blocks the release (no unlink), names the repair path, exit 1. (FR-1, W4)
  - [ ] 1.5 No lease for the id → "nothing to release", exit 0 (idempotent). (FR-1)
  - [ ] 1.6 `test/release.test.ts`: own / foreign / `--force` matrix; victim
        reporting; idempotent no-lease; malformed fail-closed; **mutex
        serialization** (release racing a claim that refreshes — assert abort). (FR-5)

- [ ] 2.0 Renew + `--hours`
  - [ ] 2.1 Add `gate renew PRD-XXX [--hours=N]` in `cli.ts`: a CLI verb over
        `claimPrd` with `leaseHours` from `--hours` (default `DEFAULT_LEASE_HOURS`);
        reports `refreshed: true`; conflicts discovered at renew refuse exactly
        like a fresh claim. **W2 — no divergent behavior** vs a direct claim. (FR-2, W2)
  - [ ] 2.2 Teach `gate open` `--hours` for symmetry (`open.ts` maps it into
        `claimPrd`'s `leaseHours`; engine already validates positive+finite at
        `open.ts:171`, CLI maps the throw to exit 1 + message). (FR-2)
  - [ ] 2.3 `test/open.test.ts`: renew delegation, `--hours` validation (reject
        non-positive/non-finite → exit 1). (FR-5)

- [ ] 3.0 Queue countdown (A1 fix)
  - [ ] 3.1 `core/state/query.ts`: change the `inFlight` row from
        `Omit<QueueLockInfo,'expiresAt'> & { stale }` to also carry
        `expiresInSeconds` (computed at build from `expiresAt`, `stale` retained).
        Unparseable dates → the field is `null`; never throw. (FR-3, A1)
  - [ ] 3.2 `cli.ts` queue renderer: format remaining time per lease
        (`3h 12m left` / `STALE 1h 4m`); unparseable renders `?`. (FR-3)
  - [ ] 3.3 `--json`: surface `expiresInSeconds` on inFlight rows — **additive
        only**, no field removed or renamed. **W3 — JSON stability**. (FR-3, W3)
  - [ ] 3.4 `test/state-query.test.ts`: assert `expiresInSeconds` present +
        correct sign for a stale lease; existing fields unchanged. (FR-5)

- [ ] 4.0 Exports + usage
  - [ ] 4.1 Re-export `releaseLease` through `core/run/index.ts` (fans out via
        `core/index.ts` → `src/index.ts`; the bare barrel is not edited). (FR-4)
  - [ ] 4.2 `cli.ts` usage + command router: add `release` and `renew` rows;
        both bins (`provegate`, `gate`) reach them. (FR-4)

- [ ] 5.0 Tests (aggregate)
  - [ ] 5.1 `test/cli.test.ts`: renew CLI path + countdown render + additive JSON
        assertions. (FR-5)
  - [ ] 5.2 Confirm the full prior suite is unchanged (no regression from the
        query.ts row change). (FR-5)

- [ ] 6.0 Docs
  - [ ] 6.1 `apps/docs/content/docs/cli.mdx`: add `release` + `renew` rows. (FR-6)
  - [ ] 6.2 `QUICKSTART.md`: lease section mentions `gate renew` before `--steal`.
        (FR-6)

- [ ] 7.0 Phase 5 — Testing
  - [ ] 7.1 Run every PRD §11 command; paste evidence into the Verification Ledger.
  - [ ] 7.2 Cross-cutting floor: `pnpm check-types`, `pnpm lint`,
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
| FR-1               | `pnpm --filter provegate test test/release.test.ts`                     | provegate | pending |          | own/foreign/force, fail-closed  |
| FR-2               | `pnpm --filter provegate test test/open.test.ts`                        | provegate | pending |          | renew delegation, --hours       |
| FR-3               | `pnpm --filter provegate test test/state-query.test.ts test/cli.test.ts` | provegate | pending |          | expiry retained + countdown JSON |
| FR-4               | `grep -c -e "  release " -e "  renew " packages/provegate/src/cli.ts`    | provegate | pending |          | usage advertises both           |
| FR-5               | `pnpm --filter provegate test`                                          | provegate | pending |          | full suite, priors unchanged    |
| FR-6               | `grep -c "gate renew" packages/provegate/QUICKSTART.md`                 | provegate | pending |          | guidance documented             |
| types              | `pnpm check-types`                                                       | root      | pending |          | zero errors                     |
| lint               | `pnpm lint`                                                              | root      | pending |          | zero warnings                   |
| build              | `pnpm build`                                                             | root      | pending |          | clean, both apps too            |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-008`                     | repo      | pending |          | PRD passes its own gate         |
| never-push         | `node packages/provegate/dist/cli.js push; test $? -eq 1`               | repo      | pending |          | refusal exit 1                  |
| hygiene            | `grep -ri -l -e emofy -e rayvaz packages/provegate/src && exit 1 \|\| true` | provegate | pending |          | no personal names               |
| independent-review | `_docs/reviews/review-008-lease-commands.md`                            | repo      | pending |          | verdict pass, critical = 0      |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

- (none yet)

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

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
| —    | —        | —     | none — every gate is machine-checkable | — | thin composition; Autonomous Close candidate at close |
