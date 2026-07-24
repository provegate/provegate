# 05 — Parallel-agent orchestration (wave 4)

How multiple coding agents work concurrently on different work-items **without colliding**.
The core idea: partition work into **disjoint source surfaces**, give each item its own git
worktree + branch + lock, refuse to start an item whose surface overlaps an active one, and
merge everything back through a **single serialized channel**. Because concurrent branches
touch disjoint paths by construction, their merges cannot conflict.

Grounded against Emofy's `scripts/prd-worktree.mjs` (claim), `scripts/verify-path-conflicts.mjs`
(overlap engine), `scripts/query-prd-state.mjs` (queue), `scripts/prd-autorun.mjs` (merge
train). Genericized here.

## When to adopt

**Only if provegate goes multi-agent.** A single-agent project doesn't need any of this —
it needs waves 1–3. This wave is the most advanced and the most Emofy-monorepo-coupled;
adopt it last, and only the pieces you need.

## Read in order
1. `SPEC.md` — the full model: claim protocol, lock schema, ready-queue, Conflict-Surface →
   ownedPaths mirroring + pre-start refusal (the heart), the overlap engine, the merge train,
   append-only manifest handling, and CI enforcement.
2. `templates/agent-lock.schema.json` — a generic lock schema to validate against.

## Depends on
- Wave 1 `_brain` (learnings deposit).
- Wave 2 `03` — the `verify:*` checks this wave adds (`path-conflicts`, `agent-locks`,
  `branch-isolation`, `status-sync`) plug into the same wiring model (`03/B/wiring.md`).
- Wave 3 `04` — the lifecycle states (what "READY"/"active"/"done" mean) and the
  Autonomous-Close merge flow this orchestration serializes.
- `02` practice 02 (protected-branch flow) + practice 06 (status board).

## New seed learnings emitted
In `../01-brain-memory-protocol/seed-learnings/`:
- `append-only-manifest-union-driver` — union-merge only TRUE append-only files (lockfile,
  changelog); modify-in-place shared files (a status board) are subtracted from conflict
  surfaces but must never be union-merged (union duplicates their rows).
- `locks-on-main-not-worktree` — lock files must live on the main checkout, not inside the
  worktree, or tearing down the worktree orphans the claim.
- `conflict-check-independent-of-override` — the pre-start overlap check must read the item's
  own declared surface, never a caller-supplied override, or a caller dodges the check.
