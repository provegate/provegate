# Parallel-agent orchestration (imported, NOT adopted)

> Status: **docs only.** This repo runs a single agent; none of this is implemented here.
> Adopt only if/when this repo runs multiple agents in parallel. When adopting, follow
> `SPEC.md` and plug the checks into the existing verify:* wiring
> (`scripts/verify/`, audited by `gate check --wiring`).

How multiple coding agents work concurrently on different work-items **without colliding**.
The core idea: partition work into **disjoint source surfaces**, give each item its own git
worktree + branch + lock, refuse to start an item whose surface overlaps an active one, and
merge everything back through a **single serialized channel**. Because concurrent branches
touch disjoint paths by construction, their merges cannot conflict.

Grounded against the source project's implementation (claim protocol, overlap engine,
ready-queue, merge train). Genericized here.

## When to adopt

**Only if this project goes multi-agent.** A single-agent project doesn't need any of
this. This is the most advanced and the most monorepo-coupled part of the practices
handoff; adopt it last, and only the pieces you need.

## Read in order

1. `SPEC.md` — the full model: claim protocol, lock schema, ready-queue, Conflict-Surface →
   ownedPaths mirroring + pre-start refusal (the heart), the overlap engine, the merge train,
   append-only manifest handling, and CI enforcement.
2. `packages/provegate/schemas/agent-lock.schema.json` — the lock schema to validate
   against (the package schema is the SSOT; this doc set deliberately ships no duplicate).

## Depends on (all already in place here)

- `_brain/` (learnings deposit — wave 1).
- The verify:* library (`scripts/verify/`) — the checks this wave would add
  (`path-conflicts`, `agent-locks`, `branch-isolation`, `status-sync`) plug into the same
  wiring model and the `gate check --wiring` meta-gate.
- The lifecycle states (`_prds/README.md`) and the Autonomous-Close merge flow this
  orchestration serializes (already implemented by `gate run` / `gate land`).
- The protected-branch commit flow (`scripts/base-branch-guard.mjs`) and the status board
  (`STATUS.md`).

## Pre-seeded learnings (already in `_brain/learnings/`)

- `append-only-manifest-union-driver` — union-merge only TRUE append-only files (lockfile,
  changelog); modify-in-place shared files (a status board) are subtracted from conflict
  surfaces but must never be union-merged (union duplicates their rows).
- `locks-on-main-not-worktree` — lock files must live on the main checkout, not inside the
  worktree, or tearing down the worktree orphans the claim.
- `conflict-check-independent-of-override` — the pre-start overlap check must read the item's
  own declared surface, never a caller-supplied override, or a caller dodges the check.
