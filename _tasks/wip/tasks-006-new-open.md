# Tasks: Kill the Stubs — `gate new` + `gate open`

> **PRD**: [prd-006-new-open.md](../../_prds/wip/prd-006-new-open.md)
> **Readiness**: [readiness-006-new-open.md](../../_readiness/wip/readiness-006-new-open.md)
> **Status**: Not Started
> **Readiness Score**: 8.5/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-23

## Task Outcome Rules

- `[x]` = completed as written; operator-owned stays unchecked; decisions →
  **Deferrals & Decisions**; operator work → **Operator Handoff**.

## Technical Standards Reference

- Engine: TS strict, no `any`, zero deps, no push paths, `wx` + containment writes
  (init discipline).
- W1: id race → post-write re-scan, bounded retry, loud report.
- W2: uninit repo → containment mkdir of parents + `gate init` pointer, no refusal.
- W3: lease matrix self/foreign × valid/stale exact; `--steal` names victim.
- W4: substitution test anchors on SHIPPED template in-place; unknown anchor = failure.
- Lease schema + conflict engine frozen.

## Relevant Files

- `packages/provegate/src/core/run/new.ts` (new), `open.ts` (new)
- `packages/provegate/src/cli.ts` (STUBS table deleted), `src/index.ts` (exports)
- `packages/provegate/test/new.test.ts`, `test/open.test.ts` (new)
- `packages/provegate/QUICKSTART.md`, `apps/docs/content/docs/{quickstart,cli}.mdx`

## Tasks

- [ ] 1.0 Pre-flight
  - [ ] 1.1 Branch `feat/prd-006-new-open`; lease; baseline green (on top of PRD-005 merge)
- [ ] 2.0 `createPrd` (FR-1, W1, W2, W4)
  - [ ] 2.1 `new.ts`: next-ID scan across ALL lifecycle states (max+1, no reuse);
        slug validation `[a-z0-9-]+`; class validation vs config; template resolved
        module-relative (config override `templates.prd`); substitution anchored on
        template metadata lines (ID/slug/date/status/class); `wx` write + containment
  - [ ] 2.2 W1: post-write re-scan — duplicate ID → remove own file, retry next ID
        (max 3), loud report; W2: missing parents created via containment mkdir with
        `gate init` pointer printed
- [ ] 3.0 `claimPrd` (FR-2, W3)
  - [ ] 3.1 `open.ts`: surface parse (empty → refusal + guidance); overlap check vs
        all leases via existing conflict engine; atomic `wx` lease write on clear
  - [ ] 3.2 W3 matrix: self+valid → refresh "already held"; self+stale → refresh;
        foreign+valid → refuse, name overlap; foreign+stale → refuse, advertise
        `--steal`; `--steal` → replace + print victim (prd, owner, age)
- [ ] 4.0 CLI (FR-3)
  - [ ] 4.1 `gate new <slug> [--class=X]`, `gate open <id> [--steal]`; STUBS deleted;
        usage updated; exports in index.ts
- [ ] 5.0 Tests (FR-4)
  - [ ] 5.1 `new.test.ts`: allocation (gaps, completed-state scan), substitution vs
        shipped template (W4), exists-refusal, slug/class rejects, state build sees
        file, id-race simulation (W1), bare-dir run (W2), live CLI
  - [ ] 5.2 `open.test.ts`: claim writes schema-valid lease; conflict refusal names
        holder+globs; W3 matrix all four states; steal logging; no-surface refusal;
        queue shows IN-FLIGHT; live CLI
- [ ] 6.0 Docs (FR-5)
  - [ ] 6.1 QUICKSTART §2 → `gate new`; docs quickstart mirrors; cli.mdx stub rows →
        real; content-launch lint still green
- [ ] 7.0 Phase 5 — §11 sweep, ledger evidence
- [ ] 8.0 Phase 6 — codex review (brief: id-race window, steal semantics, template
        substitution fidelity, containment on new write paths)
- [ ] 9.0 Phase 7 — summary; owner acceptance; close via `gate run PRD-006`

## Verification Ledger

| Gate | Command / Check                                                    | Scope     | Result  | Evidence | Notes                     |
| ---- | ------------------------------------------------------------------ | --------- | ------- | -------- | ------------------------- |
| FR-1 | `pnpm --filter provegate test test/new.test.ts`                    | provegate | pending |          | alloc, substitution, W1/W2 |
| FR-2 | `pnpm --filter provegate test test/open.test.ts`                   | provegate | pending |          | matrix, steal, refusals   |
| FR-3 | `grep -c "phase B" packages/provegate/src/cli.ts`                  | provegate | pending |          | expect exit 1 (0 matches) |
| FR-4 | `pnpm --filter provegate test test/new.test.ts test/open.test.ts`  | provegate | pending |          | grouped rerun             |
| FR-5 | `grep -c "gate new" packages/provegate/QUICKSTART.md`              | provegate | pending |          |                           |

## Deferrals & Decisions

- (none yet)

## Operator Handoff

| Task | Category  | Owner | Required Check                                       | Status  | Notes               |
| ---- | --------- | ----- | ---------------------------------------------------- | ------- | ------------------- |
| 8.0  | external  | owner | Authorize codex review session                       | pending | per precedent       |
| 9.0  | manual-qa | owner | Acceptance; trigger `gate run PRD-006`; push (human) | pending | runner never pushes |

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

## Blockers / Open Questions

- (none)
