# PRD-022: Control-Artifact Revalidation Beyond the Claim

> **Status**: Draft
>
> **Created**: 2026-07-25
> **Updated**: 2026-07-25
> **Author**: Cursor, for owner review
> **Audience**: Implementing Agent
> **Slug**: `control-artifact-revalidation`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: This changes when the runner validates gate policy in an existing
> worktree; it is workflow tooling, not application behavior.
> **Autonomous Close**: operator-gated
> **Value**: 3.60 (MF/UI/TL/AR/RM: 4/3/4/3/4)

<!-- 0.25*4 + 0.25*3 + 0.20*4 + 0.15*3 + 0.15*4 = 3.60. -->

---

## 1. Introduction / Overview

A worktree claim validates that the checkout carries the same control artifacts as the
base branch. `open.ts` computes `snapshotsNotMatchingRef` and `snapshotsMissingFrom` over
`requiredArtifacts` and refuses a reuse whose checkout has drifted, with a message
telling the operator to merge or rebase first.

That validation runs **only on the claim path**. `gate run` and `gate land` never repeat
it. So a lease taken before a control artifact changed can execute its whole lifecycle —
every phase gate, then the merge — against gate policy the base branch no longer has, and
nothing reports it. The lease is not stale in any way the system can see; it simply never
asks again.

This was found while scoping PRD-018, which introduces two root control artifacts
(`workflow.config.json`, `gates.manifest.json`). PRD-018 states the residual rather than
claiming to close it; closing it is this PRD.

The failure is quiet by construction, which is the argument for fixing it: a worktree
running the previous manifest passes gates the base would now fail, and the merge is
green.

---

## 2. Goals

### Primary Goals

- [ ] Revalidate control artifacts at every gate execution boundary, not only at claim.
- [ ] Refuse with the same message and the same remedy the claim path already uses.
- [ ] Change nothing for a worktree whose artifacts match the base — the common case
      stays silent and adds no measurable time.
- [ ] Leave non-worktree flows exactly as they are.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Gate entry points that revalidate control artifacts | 1 (claim) | 3 (claim, run, land) | fixture per entry point |
| Drifted worktree reaching a green merge | possible | refused | drift fixture |
| Added validation cost on a matching worktree | n/a | one `git` hash comparison per artifact | measured in the test |
| Behavior change for non-worktree flows | n/a | none | regression fixture |

---

## 3. User Stories

#### User Story 1

```
As an agent working in a long-lived worktree,
I want the runner to tell me when the base's gate policy has moved,
so that I cannot pass gates the base branch would fail.
```

**Acceptance Criteria:**

- [ ] `gate run` refuses when a control artifact in the checkout differs from the base,
      naming the artifact and the merge-or-rebase remedy.
- [ ] The refusal happens before any phase command executes, not after a partial run.

#### User Story 2

```
As an owner landing work,
I want the merge to re-check policy provenance,
so that a green chain recorded under old policy cannot become a merge.
```

**Acceptance Criteria:**

- [ ] `gate land` refuses on drift with the same message shape as the claim path.
- [ ] A worktree whose artifacts match the base is unaffected in behavior and output.

---

## 4. Functional Requirements

1. **FR-1 — Extract the claim path's check into one reusable primitive.** `open.ts`
   currently inlines the drift decision (`snapshotsNotMatchingRef` +
   `snapshotsMissingFrom` over `requiredArtifacts`, deduplicated). Lift it into a single
   exported function that returns the drifted artifact list and the formatted refusal, and
   make `open.ts` call it. Behavior on the claim path must be **byte-identical** — this
   FR ships no new decision, only one owner of the existing one.
   - **Targets:** `packages/provegate/src/core/run/worktree.ts`,
     `packages/provegate/src/core/run/open.ts`,
     `packages/provegate/test/open.test.ts`
2. **FR-2 — `gate run` revalidates before executing anything.** When the invocation
   resolves to a worktree carrying a lease, call the FR-1 primitive before the first
   phase command. On drift, refuse with the shared message and a non-zero exit; execute no
   command and write no chain state. A run outside a worktree, or one whose lease declares
   no worktree, behaves exactly as today.
   - **Targets:** `packages/provegate/src/core/run/chain.ts`,
     `packages/provegate/test/chain.test.ts`
3. **FR-3 — `gate land` revalidates before merging.** Same primitive, same message, before
   any merge or post-merge gate runs. This is the last boundary where drift is still
   recoverable, so the refusal must precede every mutation.
   - **Targets:** `packages/provegate/src/core/run/merge.ts`,
     `packages/provegate/test/merge.test.ts`
4. **FR-4 — Prove the hole is closed, by drift rather than by green.** A fixture builds a
   worktree, advances the base with a control-artifact change, and asserts: `gate run`
   refuses, `gate land` refuses, both name the artifact, and both succeed after the base
   is merged into the branch. A second fixture asserts the matching case is untouched —
   same exit codes, same stdout as before this PRD.
   - **Targets:** `packages/provegate/test/chain.test.ts`,
     `packages/provegate/test/merge.test.ts`
5. **FR-5 — Say when the check does not apply.** Document the boundary in the method docs:
   the guarantee covers worktree-backed leases, and a direct `git merge` still bypasses
   the runner entirely. State it rather than implying completeness — PRD-018's residual
   was created by a claim wider than the mechanism.
   - **Targets:** `apps/docs/content/docs/method.mdx`,
     `packages/provegate/test/content-launch.test.ts`

---

## 5. Non-Goals (Out of Scope)

- Making the pre-commit hook cover merges, or any git-level enforcement.
- Adding new control artifacts, or changing which files are control artifacts.
- Auto-merging or auto-rebasing a drifted worktree on the agent's behalf.
- Any change to the memory contract, the value-score gate, or lease TTL semantics.
- Non-worktree `gate open` flows.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a worktree whose `gates.manifest.json` differs from the base, **When**
  `gate run` starts, **Then** it refuses before the first command, naming the artifact.
- **Given** the same worktree, **When** `gate land` runs, **Then** it refuses before any
  merge step.
- **Given** the base is merged into the branch, **When** either command runs again,
  **Then** it proceeds normally.
- **Given** a worktree whose artifacts match the base, **When** either command runs,
  **Then** exit code and output are identical to the pre-PRD baseline.
- **Given** a lease with no worktree, **When** either command runs, **Then** nothing
  changes.

---

## 7. Technical Considerations

### Architecture

- One decision, three call sites. The claim path's check is the reference behavior; the
  other two must not develop their own opinion of what "drifted" means.
- The check is a hash comparison against a pinned base ref, so it costs one `git` read per
  artifact and needs no network and no cache.
- Refusing before execution matters more than refusing accurately after: a partial chain
  run leaves recorded state that a later reader treats as evidence.

### Dependencies

- **PRD-018 should land first** — it introduces the two root control artifacts that make
  this hole reachable in practice, and its FR-6 text names this PRD as the closer. This
  is an ordering preference, not a technical blocker: the primitive and its call sites are
  independent of the memory contract.
- No new runtime dependencies.

### Rollback

- Revert the two call sites; FR-1's extraction can stay because it is behavior-preserving.
  No state, cache, or artifact migration exists.

---

## 8. Implementation Scope

### In Scope

- [ ] `run/worktree.ts` — the extracted primitive
- [ ] `run/open.ts` — call the primitive, byte-identical behavior
- [ ] `run/chain.ts`, `run/merge.ts` — the two new call sites
- [ ] `test/{open,chain,merge}.test.ts` — drift and no-drift fixtures
- [ ] `apps/docs/content/docs/method.mdx` — the stated boundary

---

## 9. Open Questions

**Q1:** Should `gate run` refuse on drift, or warn and continue? Refusing is specified
above; a warning would preserve momentum for an agent mid-phase at the cost of the
guarantee. Owner decision before Phase 2.

**Q2:** Does the check belong on every `gate` subcommand that reads policy (`check`,
`status`, `queue`), or only on the two that execute and merge? Specified narrowly above;
widening is cheap but changes read-only commands into refusing ones.

---

## 10. References

- PRD-018 FR-6 — states this residual and names this PRD as the closer
- `packages/provegate/src/core/run/open.ts` — the existing reuse-path validation
- PRD-018 readiness W12: `_readiness/wip/readiness-018-memory-contract-enforcement.md`

---

## Conflict Surface

- `packages/provegate/src/core/run/worktree.ts`
- `packages/provegate/src/core/run/chain.ts`
- `packages/provegate/src/core/run/merge.ts`
- `packages/provegate/test/chain.test.ts`
- `packages/provegate/test/merge.test.ts`
- `packages/provegate/test/open.test.ts`

`packages/provegate/src/core/run/open.ts` and `apps/docs/content/docs/method.mdx` are
implementation scope but shared with PRD-018; this PRD lands after it, so they are not
claimed exclusively.

---

## Durable Artifacts

- Method docs: `apps/docs/content/docs/method.mdx`
- Review: `_docs/reviews/review-022-control-artifact-revalidation.md`

---

## 11. Verification Commands

| FR   | Command / Check                                              | Scope | Notes |
| ---- | -------------------------------------------------------------- | ----- | ----- |
| FR-1 | `pnpm --filter provegate test test/open.test.ts`               | pkg   | claim-path behavior unchanged after extraction |
| FR-2 | `pnpm --filter provegate test test/chain.test.ts`              | pkg   | run refuses on drift before the first command |
| FR-3 | `pnpm --filter provegate test test/merge.test.ts`              | pkg   | land refuses on drift before any merge step |
| FR-4 | `pnpm --filter provegate test test/chain.test.ts`              | pkg   | matching worktree identical to baseline |
| FR-5 | `pnpm --filter provegate test test/content-launch.test.ts`     | pkg   | the stated boundary is documented |

Cross-cutting floor:

- `pnpm check-types`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm verify:workflow`

Before Phase 2 PASS, run: `gate check PRD-022`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT let the three call sites hold three definitions of drift; one primitive decides.
- DO NOT change claim-path behavior while extracting it — FR-1 is a refactor.
- DO NOT refuse after executing part of a chain; the check precedes the first command.
- DO NOT auto-merge or auto-rebase a drifted worktree.
- DO NOT claim the runner now prevents policy drift; a direct `git merge` still bypasses
  it, and FR-5 exists to say so.
- DO NOT extend the check to read-only commands without resolving Q2 first.

---

## Changelog

| Date       | Author | Changes |
| ---------- | ------ | ------- |
| 2026-07-25 | Cursor | Initial draft. Scoped out of PRD-018 by owner decision after readiness iteration 5 measured PRD-018's convergence claim as false: control artifacts are revalidated only on the claim path, so `gate run` and `gate land` in an existing worktree never re-check them |
