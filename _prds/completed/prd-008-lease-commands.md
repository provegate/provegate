# PRD-008: Lease Commands — `gate release` + `gate renew` + Queue Countdown

> **Status**: Ship Verified
> **Created**: 2026-07-23
> **Updated**: 2026-07-24
> **Author**: rayvaz
> **Audience**: Implementing Agent (Claude Code / Cursor / Codex)
> **Slug**: `lease-commands`
> **Cycle Phase**: 2 (Readiness Scored)
> **PRD Class**: feature
> **Class Rationale**: (default class) — two new user-facing commands closing the
> lease lifecycle's UX gap.
> **Autonomous Close**: operator-gated
> **State Record**: `_state/prds.json`

---

## 1. Introduction / Overview

A lease is born with one command (`gate open`, PRD-006) but dies only two ways:
`gate run` completes, or a human runs `rm` on a JSON file in `_state/locks/`. The
middle of the lifecycle is just as bare — extending a lease means re-running
`gate open` and knowing that refresh is idempotent, and `gate queue` shows leases
without saying WHEN they expire.

This PRD finishes the lifecycle surface:

- `gate release PRD-XXX` — delete the PRD's lease(s) under the claim mutex.
  Releasing a lease held by a DIFFERENT agent requires `--force` and prints the
  victim (mirror of `--steal`'s loudness; never silent).
- `gate renew PRD-XXX [--hours=N]` — explicit alias for the idempotent refresh:
  delegates to `claimPrd`, so the surface is re-parsed and re-checked against
  active leases (a surface edited since the claim is re-validated, not
  grandfathered). `--hours` maps to `leaseHours` (already validated positive and
  finite by PRD-006 r8).
- `gate queue` — leases gain a remaining-time column (`3h 12m left` /
  `STALE 1h 4m`); `--json` output gains additive fields only.

All three compose existing engine pieces; the only new mutation is the release
unlink, which runs under the existing `.gate-open.mutex`.

---

## 2. Goals

### Primary Goals

- [ ] No lifecycle step requires hand-editing files under `_state/locks/`.
- [ ] Release of a foreign-agent lease is impossible silently.
- [ ] Lease expiry is visible in `gate queue` at a glance.

### Success Metrics

| Metric                  | Current                  | Target                   | Measurement     |
| ----------------------- | ------------------------ | ------------------------ | --------------- |
| Manual lock-file edits  | required for release     | zero                     | release.test.ts |
| Foreign release safety  | none (rm is silent)      | `--force` + victim named | release.test.ts |
| Expiry visibility       | read JSON by hand        | queue column             | cli test        |

---

## 3. User Stories

#### User Story 1

```
As an agent abandoning or finishing outside the runner,
I want `gate release PRD-008` to drop my lease cleanly,
so that the surface is free for the next claim without me touching _state/ by hand.
```

**Acceptance Criteria:**

- [ ] Own lease (agent matches the resolved agent identity) → unlinked under the
      mutex; reports what was released.
- [ ] Foreign lease without `--force` → refusal naming the holder and advertising
      `--force`; with `--force` → released, victim printed (prd, agent, expiry).
- [ ] No lease for the id → clean "nothing to release" (exit 0 — idempotent).
- [ ] Malformed leases for the id fail closed: refusal, repair guidance, no unlink.

#### User Story 2

```
As an agent mid-implementation running long,
I want `gate renew PRD-008 --hours=6` to extend my lease,
so that my claim does not silently go stale under a rival's --steal.
```

**Acceptance Criteria:**

- [ ] Renew delegates to `claimPrd` — refresh semantics, surface re-checked,
      `refreshed: true` reported; conflicts discovered at renew time refuse
      exactly like a fresh claim.
- [ ] `--hours` rejected unless positive and finite (engine already throws; the
      CLI maps it to exit 1 + message).
- [ ] `gate queue` shows remaining time per lease; stale leases show negative age
      with a `STALE` marker; `--json` adds `expiresInSeconds` (additive only).

---

## 4. Functional Requirements

1. **FR-1 — `core/run/release.ts`**: `releaseLease(config, root, id, {force?, agent?})`
   — parse locks via `listLockFiles` (read-only, r8), select by prd, agent-match
   guard, unlink under `withWorkspaceMutex` on the existing `.gate-open.mutex`;
   malformed entries for the id fail closed; returns released/refused detail.
   - **Targets:** `packages/provegate/src/core/run/release.ts`
2. **FR-2 — renew wiring**: `gate renew` is a CLI verb over `claimPrd` with
   `leaseHours` from `--hours` (default `DEFAULT_LEASE_HOURS`); no new engine
   code. `gate open` also learns `--hours` for symmetry.
   - **Targets:** `packages/provegate/src/cli.ts`, `packages/provegate/src/core/run/open.ts`
3. **FR-3 — queue countdown**: `collectLocks` (cli.ts) already carries `expiresAt`
   into `buildQueue`, but `buildQueue` currently drops it — the `inFlight` row type
   is `Omit<QueueLockInfo, 'expiresAt'> & { stale }` and only `stale` survives
   (`core/state/query.ts:140,189-195`). So this FR edits `query.ts` to retain the
   remaining time on the `inFlight` row (add `expiresInSeconds`, computed at build
   from `expiresAt`), the cli.ts queue renderer formats it (`3h 12m left` /
   `STALE 1h 4m`), and `--json` surfaces the same field — additive only.
   Unparseable dates render `?` and never throw. `test/state-query.test.ts` gains
   the additive-field assertion.
   - **Targets:** `packages/provegate/src/core/state/query.ts`,
     `packages/provegate/src/cli.ts`,
     `packages/provegate/test/state-query.test.ts`
4. **FR-4 — exports + usage**: `releaseLease` re-exported through the run barrel
   `core/run/index.ts` (which `core/index.ts` → `src/index.ts` already fan out, so
   `src/index.ts` itself is not edited); usage text gains `release` and `renew`
   rows; both bins.
   - **Targets:** `packages/provegate/src/core/run/index.ts`,
     `packages/provegate/src/cli.ts`
5. **FR-5 — Tests**: `test/release.test.ts` — own/foreign/force matrix, idempotent
   no-lease path, malformed fail-closed, mutex serialization (release racing a
   claim), victim reporting; CLI-level renew + countdown assertions appended to
   `test/open.test.ts` / `test/cli.test.ts`.
   - **Targets:** `packages/provegate/test/release.test.ts`, `packages/provegate/test/cli.test.ts`
6. **FR-6 — Docs**: `cli.mdx` gains release/renew rows; QUICKSTART lease section
   mentions renew before steal.
   - **Targets:** `apps/docs/content/docs/cli.mdx`, `packages/provegate/QUICKSTART.md`

---

## 5. Non-Goals (Out of Scope)

- No auto-expiry daemon or background renewal — staleness stays advisory.
- No lease transfer between agents (`release --force` + fresh `open` is the path).
- No schema changes; `expiresInSeconds` is computed, never stored.
- No changes to steal semantics or the conflict engine.
- No push code paths, dependencies, telemetry, or network calls.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** my own valid lease, **When** `gate release PRD-008` runs, **Then** the
  lock file is gone and the release is reported.
- **Given** a foreign valid lease, **When** `gate release` runs without `--force`,
  **Then** nothing is deleted, exit 1, holder named, `--force` advertised.
- **Given** no lease for PRD-008, **When** `gate release` runs, **Then** exit 0
  with "nothing to release".
- **Given** a lease expiring in 2 hours, **When** `gate queue` runs, **Then** the
  lease row shows a remaining-time value and `--json` carries `expiresInSeconds`.

---

## 7. Technical Considerations

### Architecture

- Release is the FOURTH mutation of the lock domain (claim, steal, migrate exist)
  — it takes the same mutex; a release racing a claim must never unlink a lease
  the claim just refreshed (parse + unlink inside one hold; identity-check the
  parsed snapshot before unlink, PRD-006 steal discipline).
- Renew adds zero engine code on purpose: `claimPrd`'s refresh path IS renewal —
  one protocol, one test surface.
- Agent identity for the own/foreign guard resolves exactly like `claimPrd`'s
  `leaseAgent` (trimmed `--agent` else `config.owners[0]`) — same rules, no new
  identity concept.

### Dependencies

- None added.

### Database Changes

- None.

### API Changes

- New export: `releaseLease` (via `core/run/index.ts`). `ClaimOptions` unchanged
  (renew reuses it). `Queue.inFlight` gains an additive `expiresInSeconds` field;
  no field is removed or renamed, so existing `--json` consumers are unaffected.

---

## 8. Implementation Scope

### In Scope

- `src/core/run/release.ts` (new), `cli.ts`, `open.ts` (`--hours` plumb only),
  `core/run/index.ts` (export), `core/state/query.ts` (inFlight expiry),
  `test/release.test.ts`, `test/cli.test.ts`, `test/state-query.test.ts`
  additions, two docs.

### Out of Scope

- Everything else — especially steal semantics, conflict engine, schemas.

---

## 9. Open Questions

- (none)

---

## 10. References

- `packages/provegate/src/core/run/open.ts` — refresh path, mutex, identity rules
- `packages/provegate/src/core/locks/lease.ts` — `listLockFiles` (read-only, r8)
- `_prds/completed/prd-006-new-open.md` — steal loudness doctrine

---

## Conflict Surface

- `packages/provegate/src/core/run/release.ts`
- `packages/provegate/src/core/run/open.ts`
- `packages/provegate/src/core/run/index.ts`
- `packages/provegate/src/core/state/query.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/test/release.test.ts`
- `packages/provegate/test/cli.test.ts`
- `packages/provegate/test/state-query.test.ts`
- `packages/provegate/QUICKSTART.md`
- `apps/docs/content/docs/cli.mdx`

---

## Durable Artifacts

- `apps/docs/content/docs/cli.mdx` — release/renew documented
- `packages/provegate/QUICKSTART.md` — renew-before-steal guidance

---

## 11. Verification Commands

Run from repo root after `pnpm build`.

| FR   | Command / Check                                                      | Scope     | Notes                                  |
| ---- | -------------------------------------------------------------------- | --------- | -------------------------------------- |
| FR-1 | `pnpm --filter provegate test test/release.test.ts`                  | provegate | own/foreign/force matrix, fail-closed  |
| FR-2 | `pnpm --filter provegate test test/open.test.ts`                     | provegate | renew delegation, --hours validation   |
| FR-3 | `pnpm --filter provegate test test/state-query.test.ts test/cli.test.ts` | provegate | expiry retained + countdown + additive JSON |
| FR-4 | `grep -c -e "  release " -e "  renew " packages/provegate/src/cli.ts` | provegate | usage advertises both                |
| FR-5 | `pnpm --filter provegate test`                                       | provegate | full suite, prior PRD suites unchanged |
| FR-6 | `grep -c "gate renew" packages/provegate/QUICKSTART.md`              | provegate | guidance documented                    |

Cross-cutting (all green before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm --filter provegate test` — full suite incl. all prior PRD suites unchanged
- `pnpm build` — clean (both apps too)
- `node packages/provegate/dist/cli.js check PRD-008` — this PRD passes its own gate
- `node packages/provegate/dist/cli.js push; test $? -eq 1` — never-push invariant
- `grep -ri -l -e emofy -e rayvaz packages/provegate/src && exit 1 || true` — hygiene

---

## 12. DO NOT (Anti-Patterns)

- DO NOT release a foreign lease without `--force`, and never without printing the
  victim — silence is the failure mode this product exists to kill.
- DO NOT unlink outside the mutex, or unlink a lease whose parsed snapshot no
  longer matches the file (identity-check first — steal discipline).
- DO NOT implement renew as new engine code — it IS `claimPrd`'s refresh path.
- DO NOT store computed expiry values; `expiresInSeconds` is derived at render.
- DO NOT break `--json` consumers — additive fields only.
- DO NOT add push code paths, runtime dependencies, or network calls.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-23 | rayvaz | Initial draft |
