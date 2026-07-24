# Readiness Assessment: PRD-008 — Lease Commands

## Quick Meta

| Field                  | Value                                         |
| ---------------------- | --------------------------------------------- |
| PRD                    | `_prds/wip/prd-008-lease-commands.md`         |
| Score                  | 8.7/10                                        |
| Verdict                | PASS                                          |
| Iteration              | 2                                             |
| Model Tier (Execution) | medium                                        |
| Model Tier (Audit)     | high                                          |
| Scored by              | Claude (Fable 5) — same session as PRD author |
| Self-scored            | yes (watch items are binding Phase 3 tasks)   |
| Date                   | 2026-07-23                                    |
| PRD Lint               | passed — `gate check PRD-008` exit 0          |
| State Record           | updated                                       |

---

## Model Tier Recommendation

| Phase               | Tier   | Rationale                                                                             |
| ------------------- | ------ | -------------------------------------------------------------------------------------- |
| Phase 4 (Execution) | medium | Thin composition over existing protocol; the only new mutation is a guarded unlink.     |
| Phase 6 (Audit)     | high   | Any lock-domain mutation deserves adversarial review — release racing claim especially. |

---

## Analysis

### 1. Technical Depth & Architecture

- Release is correctly framed as the fourth lock-domain mutation and takes the
  existing mutex — no second synchronization story.
- Renew as pure delegation to `claimPrd` is the strongest call in the PRD: zero
  new engine code, and surface re-validation on renew falls out for free (an
  edited surface cannot be grandfathered past the conflict check).
- Identity rules reuse `claimPrd`'s agent resolution verbatim — no new identity
  concept to audit.

### 2. Edge Cases & Failure Modes

- **Release racing a claim (W1)**: the lease parsed before the mutex could be
  refreshed by the time release holds it — snapshot identity-check before unlink
  (steal discipline from PRD-006) is bound as a task, with a race-window test.
- **Malformed leases (W4)**: fail closed on release exactly as claim does —
  unlinking a lease you cannot fully parse destroys the evidence of what broke.
- **Foreign `--force`**: mirrors `--steal` loudness; victim (prd, agent, expiry)
  printed. The asymmetry (steal requires stale, force-release does not) is
  deliberate and documented — release is an operator action, steal is a rival's.
- **Idempotent no-lease release**: exit 0, not error — agents retry.

### 3. Maintainability & DX

- Countdown column computed at render; nothing stored, `--json` additive only —
  no consumer breakage surface.
- `renew before steal` guidance in QUICKSTART turns a failure path (stale +
  steal) into a habit (renew early).

### 4. Migration & Rollback

- Additive commands; schema untouched; revert = git revert.

---

## Scorecard (feature weights)

| Dimension                | Weight | Score | Notes                                              |
| ------------------------ | ------ | ----- | -------------------------------------------------- |
| Clarity                  | 15%    | 9.0   | Own/foreign/force matrix fully enumerated          |
| Completeness             | 20%    | 8.5   | Race + malformed edges found in scoring, bound     |
| Technical Depth          | 25%    | 8.5   | Renew-as-delegation; mutex + identity reuse        |
| Multi-Tenancy & Security | 20%    | 8.5   | Loud-force discipline; fail-closed on malformed    |
| Scope & Testability      | 10%    | 9.0   | Small surface, complete refusal enumeration        |
| Migration & Rollback     | 10%    | 9.0   | Additive; computed fields only                     |

**Weighted: 8.7 — PASS.** Hard caps: security N/A (no protected route/endpoint),
contract N/A (JSON additive-only asserted by test), lint passed.

---

## Watch Items (binding on Phase 3)

- **W1 — release race**: parse + identity-check + unlink inside one mutex hold;
  raceWindow-style test refreshes the lease mid-release and asserts abort.
- **W2 — renew drift ban**: renew's implementation is a call to `claimPrd` plus
  argument mapping — a test asserts no divergent behavior (same refusals, same
  refresh result).
- **W3 — JSON stability**: snapshot-style test pins existing queue `--json`
  fields; `expiresInSeconds` is added, nothing moves.
- **W4 — malformed fail-closed**: corrupt lease for the target id blocks release
  (no unlink), names the repair path.

---

## Code-Reality Amendment (iteration 2, 2026-07-24)

A pre-Phase-3 verification of the PRD against the current source found one spec
defect and one targeting error — neither a PRD-007 drift; both predate the draft:

- **A1 (blocking, fixed) — FR-3 needed `core/state/query.ts`.** `collectLocks`
  does carry `expiresAt` into `buildQueue`, but `buildQueue` drops it:
  `Queue.inFlight` is `Omit<QueueLockInfo,'expiresAt'> & { stale }`
  (`query.ts:140,189-195`, unchanged since PRD-001). The countdown and the
  `--json expiresInSeconds` field are therefore impossible in `cli.ts` alone. FR-3
  now edits `query.ts` (retain `expiresInSeconds` on the inFlight row) and adds
  `query.ts` + `test/state-query.test.ts` to the Conflict Surface and scope.
- **A2 (minor, fixed) — FR-4 export target.** `releaseLease` is re-exported
  through `core/run/index.ts` (which fans out to `core/index.ts` → `src/index.ts`);
  the bare `src/index.ts` barrel is not edited. FR-4 and the Conflict Surface now
  name `core/run/index.ts`.

Everything else verified accurate: `listLockFiles` (lease.ts:89), the
`.gate-open.mutex` + `withWorkspaceMutex`, `claimPrd`/`leaseHours`/
`DEFAULT_LEASE_HOURS`, the `leaseAgent` resolution, `--hours` not yet on
`gate open` (FR-2 correct), and `stale` already computed + `[STALE]` printed. The
fixes are additive and stay inside the same thin-composition scope; score is
unchanged at **8.7 PASS**.

## Verdict

**PASS (iteration 2)** — proceed to Phase 3 task generation on the owner's Go.
Implement AFTER PRD-007 lands (shared `open.ts`/`cli.ts` surface; 008 rebases
cheaply), and BEFORE PRD-011 (both claim `open.ts`/`cli.ts`/`cli.test.ts`; the
path-conflict gate serializes them).
