# Parallel-agent orchestration — SPEC (wave 4)

## 0. The model

- **Partition by disjoint source surface.** Each work-item declares the source globs it will
  exclusively write (its **Conflict Surface**). Items with disjoint surfaces run in parallel;
  items whose surfaces overlap **serialize** — the gate enforces it.
- **One item = one lock = one worktree = one branch = one status-board row.**
- **Concurrency cap** — a *convention, not enforced*: the origin system documents a small
  cap (2 implementation + 1 review/test in flight) but no gate counts locks. If you want it
  real, enforce it in `start` by counting active execution-phase locks.
- **Single merge channel:** every item lands one-at-a-time into a local integration branch.
  Push is always human.

Invariant that makes it work: *concurrent branches touch disjoint paths by construction, so
their merges cannot conflict on source.* Shared append-only files are removed from the
conflict surface entirely via a git union driver (§7).

---

## 1. Claim protocol (`start`)

Claiming a work-item, in order:
1. **Validate the claim** — the `phase` value must be in the closed phase set (a typo'd
   phase would silently exempt the lock from every phase-filtered gate, §5), and the
   refusals below apply. Two independent no-worktree refusals: (a) a claim for any
   *execution* phase without a worktree is refused regardless of base; (b) a `--no-worktree`
   claim based on a protected base is refused regardless of *phase*.
2. **Pre-start overlap refusal (§5)** — check the item's declared Conflict Surface against
   all active locks. On overlap, `die` (exit 1) creating **nothing**: "surface overlaps an
   active item — serialize."
3. **Worktree** — `git worktree add .worktrees/<id>-<slug> -b feat/<id>-<slug> <base>`
   (base = the integration branch, e.g. `development`).
4. **Write the lock (§3)** to the **main checkout's** lock dir, not the worktree (see `_brain/learnings/append-only-manifest-union-driver.md` —
   `locks-on-main-not-worktree`), mirroring the Conflict Surface into `ownedPaths` (§5) —
   *before* hydration, so a crash mid-install still leaves the claim visible to rivals.
5. **Hydrate** — symlink the root `.env`/`.env.local` by existence only (never read values;
   see `_brain/learnings/fresh-worktree-env-gap.md`), install deps.

Terminology guard — three different "protected" sets exist; don't build one constant:
- the **commit-guard set** (`scripts/base-branch-guard.mjs`): `{main, master, staging}` — merge-only for source;
- the **protected-as-worktree-base set** (this wave): the commit-guard set **plus the
  integration branch** — branches you may fork from but never claim on without a worktree;
- the **promotion-target set** (§8): the commit-guard set only — PRs into these must carry
  no active claims.

Release (`stop`): refuse a dirty worktree without `--force`; `git worktree remove`; delete the
branch (unless kept); delete the lock file + status-board row.

---

## 2. Ready-queue (`queue`)

Computes what can be started **now**. Buckets:
- **READY** — item is approved/PASS **AND** not locked **AND** not already done. This is the
  startable pool; the orchestrator only ever hands out from READY, never a locked/in-flight item.
- **IN-FLIGHT** — one row per active lock (`id, agent, phase, worktree, stale?`).
- **BLOCKED** — blocked status / failed readiness / missing tasks.
- **IN-REVIEW** — code-complete / awaiting operator verification.
- **readyOverlaps warning** — an *advisory* pairwise comparison among READY candidates,
  by exact glob-string equality only (a nested pair like `apps/x/**` vs `apps/x/src/**` is
  a false negative here) → "⚠ overlap (do not run together)". The real, materialized check
  runs at `start` (§5) and catches what this misses.

Note the "done" test is **per-item**, not a serial high-water-mark — an out-of-order landing
must not mask a lower-numbered ready item.

---

## 3. Lock schema

See `packages/provegate/schemas/agent-lock.schema.json` (the shipped schema is the SSOT). Fields:

| Field | Req | Meaning |
|-------|-----|---------|
| `schemaVersion` | yes | a fresh project ships `1`; bump on shape change |
| `lockId` | yes | `<id>-<slug>-<uuid8>` |
| `agent` | yes | who holds it (`--agent` / env / user) |
| `item` | yes | the work-item id |
| `phase` | yes | current phase — a **closed enum**, validated at claim time (§1); the execution-phase filter keys on it |
| `startedAt` | yes | ISO timestamp |
| `expiresAt` | yes | ISO; `startedAt + ttlHours` (default 24h) |
| `branch` | no | `feat/<id>-<slug>` |
| `worktree` | no | repo-relative; must start with `.worktrees/` |
| `ownedPaths` | no | glob array mirrored from Conflict Surface (§5); unique, non-empty strings |
| `touchedFiles` | no | vestige of a pre-`ownedPaths` design — auto-seeded with only the spec doc path, so its pairwise-overlap check catches just "two claims on the same spec doc"; keep optional or drop |
| `notes` | no | free text |

**TTL policy:** locks **expire, they don't refresh** — a stale lock is re-created, not renewed.
Expiry is passive and asymmetric: the overlap engine **excludes** expired locks (rivals are
unblocked), but the stale lock *file* still blocks re-claiming the item itself and still
holds it out of READY until removed — **nothing reaps automatically**; the lock gate flags
`expiresAt < now` for a human (or a doctor command) to remove. No heartbeat/lease.

**Runtime locks are git-ignored** (only a `README.md` is committed in the lock dir) — they are
local coordination state, not source.

Validation (`verify:agent-locks`): required fields present, `phase` in the closed enum,
`worktree` under `.worktrees/`, valid `ownedPaths` (unique, non-empty strings — an
empty-string glob must fail), TTL expiry flagged.

---

## 4. Branch isolation (`verify:branch-isolation`)

Fails when an active execution-phase lock has no `worktree`, or its `branch` is a protected
base / not a `feat/` branch. Guarantees every in-flight item is isolated on its own worktree +
feature branch, never mutating a shared base.

**Runtime complement — the worktree-cwd commit guard.** Lock-JSON checks never see the live
checkout: an agent that claimed correctly (right lock, right worktree) but kept editing in
the *main* checkout slips every lock-based gate. Close that hole with a commit-time guard on
the main checkout: when committing source on a `feat/<id>` branch, require the working
directory to be the worktree the lock pins; otherwise refuse the commit. (This is the
"second block" the single-agent base-branch guard drops for single-agent projects — re-adopt it here.)

---

## 5. Conflict Surface → ownedPaths (the heart)

- **Declared in the spec** as `## Conflict Surface` — a bullet list of backticked globs the item
  claims exclusive write-ownership of; `- none` if it writes no source. Shared
  append-only/modify-in-place files are *by convention* never declared here (the engine
  subtracts them regardless, so a declaration is inert — no gate rejects it; add one if you
  want the convention hard). They are handled by the union driver / regeneration instead (§7).
- **Parser** extracts backticked tokens containing `/`, drops template/`none` tokens, dedupes.
- **Start-time mirroring:** `start` reads the spec's Conflict Surface → writes lock `ownedPaths`.
- **Pre-start check** runs **before** any worktree/lock is created, and builds the candidate from
  the item's **own declared surface** — *deliberately independent of any `--owned-paths`
  override*, so a caller can't dodge the check by mirroring a false surface (see `_brain/learnings/append-only-manifest-union-driver.md` —
  `conflict-check-independent-of-override`). On overlap: exit 1, **no override/force flag exists**.
- **Failure semantics — fail closed.** If the item's spec or its declared surface cannot be
  read (missing file, ambiguous match, malformed section), **refuse the claim** — do not
  warn-and-continue. (The origin implementation warns and skips the check here; that is a
  silent bypass — a renamed spec file passes the gate. Provegate must not copy it.)

### Overlap engine (`verify:path-conflicts`)
Zero-dependency, framework-free:
1. Filter to execution-phase locks with a non-empty `ownedPaths`.
2. `materialize` each glob-set against `git ls-files`, then **subtract the shared-append-only
   set** (post-materialization, so a broad `**` can't false-conflict on a manifest).
3. Fail on any non-empty pairwise intersection.
4. `structuralOverlap` handles not-yet-created dirs (identical / prefix-nested globs).
   Known limitation: *sibling* globs under a not-yet-created dir are a false negative —
   a documented non-goal, state it rather than discovering it.
5. A tiny `globToRegExp` compiles globs (`**` crosses `/`, `*` within a segment).

A `--item` mode runs the same detector for a candidate spec vs. active locks (the pre-start
check), stamping the candidate as a synthetic execution-phase entry so the filter doesn't
exempt it.

---

## 6. Merge train (serialization)

Landing an item (`autorun` merge step):
1. Run **from the feat worktree**, not the base checkout.
2. Locate the checkout that has the integration branch checked out.
3. Ensure that checkout is clean — auto-reset only **coordination-only** dirt (status board,
   state dir, plans); anything else aborts.
4. **`git merge --no-ff <branch>`** into local integration (an explicit merge commit per item).
5. **Post-merge gate:** type-check + build; on failure **`git reset --hard HEAD~1`** (auto-revert,
   worktree left intact).
6. Release the lock; print a handoff card: "ready to push — run `git push` yourself."

**Why it's conflict-free:** single channel (one at a time) + the path-conflict gate ⇒ any two
concurrently-merging branches touch disjoint source paths, so no-ff merges can't conflict.

---

## 7. Shared manifests: union driver vs. subtraction (two lists, not one)

Shared files everyone touches must not be a Conflict Surface — that would force every item
touching them to serialize. But there are **two classes with different handling**:

- **True append-only files** (a package manifest, a lockfile, a CHANGELOG): declare them in
  `.gitattributes` with `merge=union` — parallel appends auto-resolve at merge time.
- **Modify-in-place shared files** (the status board, whose cells hold single updated
  values): **never union-merge these** — union *duplicates* rows instead of resolving them.
  They stay off the `.gitattributes` list and self-heal via the next regeneration pass plus
  a freshness check (pattern P1).

Both classes go into the overlap engine's **subtraction set** (§5.2) — i.e. the subtraction
set is a *superset* of the union list. Keep both lists as project config. (see `_brain/learnings/append-only-manifest-union-driver.md` —
the union/subtraction split)

---

## 8. CI enforcement (know what bites where)

- **Lock-based gates bite locally, not in CI.** Locks are git-ignored, so a CI checkout has
  none — `path-conflicts` / `branch-isolation` / `agent-locks` really enforce in the
  landing runner's final-audit bundle and on developer machines. A nightly heartbeat cron
  re-runs the bundle as *rot detection* ("fail loud on silence"), not lock enforcement.
- **What CI can check is the board:** `status-sync --ci` drops lock-matching and enforces
  **"promotion PRs carry no active claims"** — a PR into a promotion target (the
  commit-guard set, §1) must have an empty active-agents table. Also fails on board rows
  stale > 7 days.
- A local **pre-commit backstop** blocks staging source on a base branch (`scripts/base-branch-guard.mjs`), and
  the worktree-cwd guard (§4) closes the live-checkout hole.

---

## 9. Generalization notes

**Reusable as-is (the orchestration core):** the claim protocol (worktree + JSON lock), the
Conflict-Surface → ownedPaths mirroring + pre-start refusal, the pure overlap engine
(`globToRegExp` + materialize against `git ls-files` + shared-append-only subtraction), the
single serialized no-ff merge channel with post-merge auto-revert + never-push, the ready-queue,
the union-driver trick, and the TTL/stale + "promotion PRs carry no claims" rules.

**Strip or parameterize:** the phase vocabulary (`Phase 1..4`, `EXECUTION_PHASES`) → provegate's
own work-item states (wave 3); the `_state/`, `_prds/`, status-board layout + Turkish labels; the
`pnpm`/Turborepo coupling (post-merge `check-types`/`build`, `verify:turbo-*`); the sharp
native-binary check (a monorepo footgun, not orchestration); base-branch names and the
shared-append-only file list (project config). The origin system leaves the JSON Schema doc-only (real gate
in `verify:agent-locks`) — provegate may prefer to actually validate against the schema.
