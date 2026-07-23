# PRD-007: Worktree Lifecycle — Claim to Checkout in One Step

> **Status**: Draft
> **Created**: 2026-07-23
> **Updated**: 2026-07-23
> **Author**: rayvaz
> **Audience**: Implementing Agent (Claude Code / Cursor / Codex)
> **Slug**: `worktree-lifecycle`
> **Cycle Phase**: 2 (Readiness Scored)
> **PRD Class**: feature
> **Class Rationale**: (default class) — new user-facing behavior: an isolated
> checkout provisioned at claim time, torn down at merge time.
> **Autonomous Close**: operator-gated
> **State Record**: `_state/prds.json`

---

## 1. Introduction / Overview

The parallel-agent story is the product's pitch, and half its plumbing already
exists: `workflow.config` has `worktree.dir`, the lock schema validates
`worktree`/`branch` fields, `migrateWorktreeLocks` moves worktree-local leases to
the main checkout, and `mainRepoRoot` resolves the shared lock domain. But nothing
CREATES a worktree or cleans one up — claim → branch → checkout is a manual
three-step, and after `gate run` lands a merge the worktree lingers forever.

This PRD closes the loop:

- `gate open PRD-XXX --worktree` — after a successful (atomic) claim, create the
  feature branch and a linked worktree under the configured `worktree.dir` on the
  main checkout, and stamp the lease's `worktree` + `branch` fields. Claim and
  checkout succeed or fail together.
- `gate run` merge phase — when the lease carries a worktree stamp, drive the
  no-ff merge against the MAIN checkout (the worktree cannot switch to a branch
  the main checkout holds), and after post-merge gates pass, remove the worktree
  and delete the merged branch. A dirty worktree refuses removal — loudly, never
  `--force`.

The lock layer stays platform-agnostic: `--worktree` is optional sugar. Locks keep
working ABOVE any external worktree manager (roadmap risk table commitment).

---

## 2. Goals

### Primary Goals

- [ ] One command takes an agent from "PRD approved" to "isolated checkout with a
      valid lease".
- [ ] Merged worktrees are cleaned up by the runner; failed runs leave the worktree
      intact for resumption (current behavior preserved).
- [ ] Lease `worktree`/`branch` stamps round-trip through the existing schema
      validation.

### Success Metrics

| Metric                     | Current                     | Target                 | Measurement      |
| -------------------------- | --------------------------- | ---------------------- | ---------------- |
| Claim→checkout steps       | 3 manual (open, branch, wt) | 1 command              | worktree.test.ts |
| Post-merge worktree debris | accumulates                 | removed on green close | worktree.test.ts |
| Dirty-worktree data loss   | possible via manual rm      | impossible (refusal)   | worktree.test.ts |

---

## 3. User Stories

#### User Story 1

```
As an agent starting implementation,
I want `gate open PRD-007 --worktree` to claim the surface AND hand me an isolated checkout,
so that parallel agents each work in their own tree with the lock already held.
```

**Acceptance Criteria:**

- [ ] On successful claim: branch `feat/prd-XXX-<slug>` created from the main
      checkout's current base HEAD; worktree added at
      `<worktree.dir>/prd-XXX-<slug>` (containment-checked, on the MAIN checkout).
- [ ] Lease JSON gains `worktree` (config-prefix-validated by the existing
      `validateLock`) and `branch` fields.
- [ ] Worktree creation failure rolls the just-installed lease back — claim and
      checkout are one atomic outcome; the refusal names the git error.
- [ ] Without `--worktree`, `gate open` behavior is byte-identical to today.
- [ ] Pre-existing branch or worktree path → refusal naming the collision; no
      `--force` variant exists.

#### User Story 2

```
As the runner closing a PRD,
I want the merge phase to land from the worktree-stamped lease and clean up after itself,
so that a green close leaves no debris and a red close preserves my work.
```

**Acceptance Criteria:**

- [ ] When the lease carries a worktree stamp, the merge executes against the MAIN
      checkout (`git -C <mainRoot>`): checkout base, no-ff merge of the feature
      branch, post-merge gates — the existing merge semantics, relocated.
- [ ] After post-merge gates pass: `git worktree remove` (no `--force` — a dirty
      worktree fails the removal and is REPORTED on the successful close as a
      warning, never rolled back), then `git branch -d` (merged-only delete).
- [ ] Any gate failure before the merge commit leaves worktree, branch, and lease
      exactly as they were (current "worktree left intact" card).

---

## 4. Functional Requirements

1. **FR-1 — `core/run/worktree.ts`**: `createWorktree(config, root, {id, slug, branch})`
   and `removeWorktree(config, root, lease)` — git via `execFileSync` (zero deps),
   worktree path resolved under `worktree.dir` on `mainRepoRoot` and
   containment-checked before any git call; removal never passes `--force`;
   branch deletion uses `-d` (refuses unmerged).
   - **Targets:** `packages/provegate/src/core/run/worktree.ts`
2. **FR-2 — `open.ts` `--worktree`**: claim first (existing atomic protocol,
   untouched), then worktree provisioning; on provisioning failure the installed
   lease is removed under the same mutex hold and the result is a refusal.
   Lease body gains `worktree`/`branch` only in this mode.
   - **Targets:** `packages/provegate/src/core/run/open.ts`
3. **FR-3 — merge relocation + cleanup**: `merge.ts` detects a worktree-stamped
   lease and drives base checkout + no-ff merge + post-merge gates via
   `git -C <mainRoot>`; cleanup (worktree remove + branch -d) runs only after the
   post-merge gates pass; failures append warnings to the close card instead of
   throwing (commit-tail discipline from PRD-006 r4).
   - **Targets:** `packages/provegate/src/core/run/merge.ts`, `packages/provegate/src/core/run/cards.ts`
4. **FR-4 — CLI wiring**: `gate open PRD-XXX [--steal] [--worktree]`; usage text
   updated; both bins.
   - **Targets:** `packages/provegate/src/cli.ts`, `packages/provegate/src/index.ts`
5. **FR-5 — Tests**: `test/worktree.test.ts` with real `git init` repos (precedent:
   the PRD-006 r8 migration test): create/remove round-trip, lease stamp passes
   `validateLock`, claim rollback on provisioning failure (plant a colliding
   branch), dirty-worktree removal refusal surfaces as warning, merge-from-worktree
   lands on main, no-worktree path unchanged.
   - **Targets:** `packages/provegate/test/worktree.test.ts`, `packages/provegate/test/open.test.ts`
6. **FR-6 — Docs**: `cli.mdx` open/run rows updated; QUICKSTART gains the
   parallel-agent recipe (open --worktree → work → gate run).
   - **Targets:** `apps/docs/content/docs/cli.mdx`, `packages/provegate/QUICKSTART.md`

---

## 5. Non-Goals (Out of Scope)

- No session/terminal management (tmux, VS Code windows) — checkout only.
- No auto-rebase or sync of worktree branches; staleness is the human's signal.
- No worktree support in `gate new` (PRDs are created on the main checkout).
- No lease schema changes — `worktree`/`branch` fields already validate.
- No removal of the manual path: external worktree managers stay first-class
  (locks work above them; `--worktree` is optional).
- No push code paths, dependencies, telemetry, or network calls — ever.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a clean claim with `--worktree`, **When** it succeeds, **Then**
  `.worktrees/prd-XXX-<slug>` exists, the branch exists, and the lease validates
  with both stamps.
- **Given** branch `feat/prd-XXX-<slug>` already exists, **When**
  `gate open --worktree` runs, **Then** no lease exists afterwards and the refusal
  names the branch.
- **Given** a worktree with uncommitted changes, **When** the merge phase reaches
  cleanup, **Then** the merge is landed, the worktree survives, and the close card
  carries a warning naming the path.
- **Given** a lease without worktree stamps, **When** `gate run` merges, **Then**
  behavior is byte-identical to PRD-006's merge.

---

## 7. Technical Considerations

### Architecture

- The claim mutex already serializes the lock domain; worktree provisioning runs
  inside the same hold so rollback (lease unlink) cannot race a rival claim.
- Merge relocation is the hard part: today `merge.ts` assumes it can
  `git checkout <base>` in place. A worktree CANNOT check out `main` while the
  main checkout holds it — every base-branch operation must target
  `git -C <mainRoot>`. The existing "run from the feature branch" guard inverts
  in worktree mode: the runner runs IN the worktree, and the guard verifies the
  lease's branch matches the worktree's HEAD.
- `git worktree remove` refuses dirty trees by default — that refusal IS the
  safety mechanism; never bypass it.

### Dependencies

- None added. git invoked via `execFileSync` (existing `io.ts` pattern).

### Database Changes

- None. Lease fields already in schema.

### API Changes

- New exports: `createWorktree`, `removeWorktree`. `ClaimOptions` gains
  `worktree?: boolean`.

---

## 8. Implementation Scope

### In Scope

- `src/core/run/worktree.ts` (new), `open.ts`, `merge.ts`, `cards.ts`, `cli.ts`,
  `index.ts`, `test/worktree.test.ts`, `test/open.test.ts` additions, two docs.

### Out of Scope

- Everything else — especially `new.ts`, the gates, the lock schema, and the
  conflict engine.

---

## 9. Open Questions

- (none — merge-relocation design settled in §7)

---

## 10. References

- `packages/provegate/src/core/locks/lease.ts` — `migrateWorktreeLocks`,
  `validateLock` worktree-prefix rule
- `packages/provegate/src/core/state/io.ts` — `mainRepoRoot`
- `packages/provegate/test/open.test.ts` — r8 worktree test (git-repo test recipe)
- `docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md` — risk
  table: lock layer stays ABOVE worktree managers

---

## Conflict Surface

- `packages/provegate/src/core/run/worktree.ts`
- `packages/provegate/src/core/run/open.ts`
- `packages/provegate/src/core/run/merge.ts`
- `packages/provegate/src/core/run/cards.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/src/index.ts`
- `packages/provegate/test/worktree.test.ts`
- `packages/provegate/test/open.test.ts`
- `packages/provegate/QUICKSTART.md`
- `apps/docs/content/docs/cli.mdx`

---

## Durable Artifacts

- `packages/provegate/QUICKSTART.md` — parallel-agent recipe
- `apps/docs/content/docs/cli.mdx` — `--worktree` documented

---

## 11. Verification Commands

Run from repo root after `pnpm build`.

| FR   | Command / Check                                                     | Scope     | Notes                                   |
| ---- | ------------------------------------------------------------------- | --------- | --------------------------------------- |
| FR-1 | `pnpm --filter provegate test test/worktree.test.ts`                | provegate | create/remove, containment, no --force  |
| FR-2 | `pnpm --filter provegate test test/open.test.ts`                    | provegate | rollback atomicity, stamp validation    |
| FR-3 | `pnpm --filter provegate test test/worktree.test.ts`                | provegate | merge-from-worktree, dirty-tree warning |
| FR-4 | `grep -c "\-\-worktree" packages/provegate/src/cli.ts`              | provegate | usage advertises the flag               |
| FR-5 | `pnpm --filter provegate test`                                      | provegate | full suite, prior PRD suites unchanged  |
| FR-6 | `grep -c "\-\-worktree" packages/provegate/QUICKSTART.md`           | provegate | recipe documented                       |

Cross-cutting (all green before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm --filter provegate test` — full suite incl. all prior PRD suites unchanged
- `pnpm build` — clean (both apps too)
- `node packages/provegate/dist/cli.js check PRD-007` — this PRD passes its own gate
- `node packages/provegate/dist/cli.js push; test $? -eq 1` — never-push invariant
- `grep -ri -l -e emofy -e rayvaz packages/provegate/src && exit 1 || true` — hygiene

---

## 12. DO NOT (Anti-Patterns)

- DO NOT pass `--force` to `git worktree remove` — dirty trees refuse, and the
  refusal is surfaced, not overridden.
- DO NOT delete a branch that is not PROVABLY merged into the configured base
  (`merge-base --is-ancestor`, tip pinned). A parked-HEAD `-d` refusal may
  escalate only through git's atomic compare-and-delete
  (`update-ref -d <ref> <proven-tip>`) — a tip advanced after the proof
  mismatches and survives; never a blind `-D` (codex r6+r7).
- DO NOT write the lease and the worktree as separate outcomes — provisioning
  failure rolls the lease back under the same mutex hold.
- DO NOT let the worktree check out the base branch or touch the base checkout's
  index — all base-branch git runs through `git -C <mainRoot>`.
- DO NOT create worktree paths outside the containment-checked `worktree.dir`.
- DO NOT make `--worktree` the default or required — locks stay platform-agnostic
  above external worktree managers.
- DO NOT add push code paths, runtime dependencies, or network calls.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-23 | rayvaz | Initial draft |
