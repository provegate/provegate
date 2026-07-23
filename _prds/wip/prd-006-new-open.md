# PRD-006: Kill the Stubs — `gate new` + `gate open`

> **Status**: Draft
> **Created**: 2026-07-23
> **Updated**: 2026-07-23
> **Author**: rayvaz
> **Audience**: Implementing Agent (Claude Code / Cursor / Codex)
> **Slug**: `new-open`
> **Cycle Phase**: 2 (Readiness Scored)
> **PRD Class**: feature
> **Class Rationale**: (default class) — two new user-facing CLI behaviors completing
> the workflow's entry path: create a PRD, claim it with locks.
> **Autonomous Close**: operator-gated
> **State Record**: `_state/prds.json`

---

## 1. Introduction / Overview

Two stubs remain: `gate new` and `gate open`. Today the quickstart papers over them
with `cp templates/prd-template.md ...` and the lock lease is written by hand. This
PRD makes the workflow's front door real:

- `gate new <slug>` — allocate the next ID from workflow state, instantiate the
  shipped PRD template into `_prds/wip/`, substitute the knowable placeholders
  (ID, slug, date, status), report the path and the next step (`gate check`).
- `gate open PRD-XXX` — parse the PRD's Conflict Surface globs, run the existing
  path-conflict detection against all active leases, and either write a valid lease
  into the locks dir or refuse with the named overlap. Claiming is atomic: no lease
  is written when a conflict exists.

Both commands compose from engine pieces that already exist (state build, id pattern,
glob engine, lease validation, conflict detection). No new concepts — plumbing the
front door to the machinery behind it.

---

## 2. Goals

### Primary Goals

- [ ] `gate new <slug>` creates a checkable PRD skeleton registered by state build.
- [ ] `gate open PRD-XXX` acquires a valid lease or refuses with named conflicts.
- [ ] Zero stubs left in the CLI; usage text reflects reality.
- [ ] QUICKSTART/docs updated: `cp` + hand-edit replaced by `gate new`.

### Success Metrics

| Metric              | Current                 | Target                     | Measurement       |
| ------------------- | ----------------------- | -------------------------- | ----------------- |
| Stub commands       | 2 (new, open)           | 0                          | CLI test          |
| PRD creation        | manual cp + 8 edits     | one command                | new.test.ts       |
| Lock acquisition    | hand-written JSON       | one command, conflict-safe | open.test.ts      |

---

## 3. User Stories

#### User Story 1

```
As an adopter starting my first item,
I want `gate new fix-login-timeout` to hand me a ready-to-fill PRD,
so that my first contact with the method is a form, not a scavenger hunt.
```

**Acceptance Criteria:**

- [ ] Next free ID computed from existing artifacts via the configured `idPattern`
      (gaps are not reused; max + 1).
- [ ] Template resolved from the shipped package (module-relative), written to
      `<prdsDir>/<wipState>/prd-XXX-<slug>.md` with ID/slug/date/status substituted;
      refuses to overwrite an existing file.
- [ ] `--class=<class>` optional flag pre-fills the PRD class line (validated against
      the configured classes); default leaves the template's default.
- [ ] Slug validated (`[a-z0-9-]+`); the created file immediately parses in
      `gate status` (state build sees it).

#### User Story 2

```
As an agent (or human) about to implement,
I want `gate open PRD-006` to claim the conflict surface atomically,
so that parallel work collides at claim time, not merge time.
```

**Acceptance Criteria:**

- [ ] Conflict Surface globs parsed from the PRD; empty/missing surface refuses with
      guidance (a claim over nothing protects nothing).
- [ ] Overlap check against every active lease in the locks dir using the existing
      glob-overlap engine; any overlap → no lease written, exit 1, each overlap
      reported as `lock-holder ↔ glob pair`.
- [ ] On success: lease JSON (existing schema: prd, owner from config, globs,
      acquiredAt from git commit time or ISO now, ttl from config default) written
      to the locks dir; `gate open` on an already-self-held lease is idempotent
      (refreshes, reports "already held"); a *stale* foreign lease (past ttl) is
      reported but still blocks unless `--steal` — and `--steal` logs loudly.
- [ ] `gate queue` shows the new lease as IN-FLIGHT immediately after.

---

## 4. Functional Requirements

1. **FR-1 — `core/run/new.ts`**: `createPrd(config, root, {slug, cls?})` — next-ID
   allocation (scan all lifecycle states so completed/deferred IDs are never reused),
   template instantiation with placeholder substitution, refuse-on-exists; returns
   the created path + id. Template source: package `templates/prd-template.md`
   resolved module-relative with a config override (`templates.prd`).
   - **Targets:** `packages/provegate/src/core/run/new.ts`
2. **FR-2 — `core/run/open.ts`**: `claimPrd(config, root, id, {steal?})` — surface
   parse, overlap check via existing conflict engine, atomic lease write (`wx`;
   self-held refresh path explicit), stale-lease reporting, `--steal` escape hatch
   that never silently steals.
   - **Targets:** `packages/provegate/src/core/run/open.ts`
3. **FR-3 — CLI wiring**: `gate new <slug> [--class=X]`, `gate open <id> [--steal]`;
   STUBS table deleted; usage updated; both bins.
   - **Targets:** `packages/provegate/src/cli.ts`
4. **FR-4 — Tests**: `test/new.test.ts` (id allocation incl. gaps + completed-state
   scan, substitution correctness, exists-refusal, slug/class validation, created file
   passes state build + `gate check` structural floor), `test/open.test.ts` (claim,
   conflict refusal with named overlaps, idempotent re-claim, stale reporting, steal
   logging, no-surface refusal, lease validates against lock schema).
   - **Targets:** `packages/provegate/test/new.test.ts`, `packages/provegate/test/open.test.ts`
5. **FR-5 — Docs**: QUICKSTART.md §2 uses `gate new` (cp path deleted); docs
   quickstart page mirrors; CLI reference page rows move from stub to real.
   - **Targets:** `packages/provegate/QUICKSTART.md`, `apps/docs/content/docs/quickstart.mdx`, `apps/docs/content/docs/cli.mdx`

---

## 5. Non-Goals (Out of Scope)

- No worktree orchestration (next PRD; `open` claims locks, it does not create
  branches or worktrees).
- No interactive prompts — flags only, agent-first.
- No lease auto-expiry daemon; staleness stays advisory + `--steal`.
- No changes to the lease schema or the conflict engine.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a scaffolded repo, **When** `gate new my-fix` runs twice, **Then** the
  second run refuses (exists) and no file is touched.
- **Given** PRD-A holding `src/auth/**`, **When** `gate open` runs for PRD-B whose
  surface includes `src/auth/login.ts`, **Then** no lease is written, exit 1, and the
  overlap names PRD-A and both globs.
- **Given** a PRD with no Conflict Surface section, **When** `gate open` runs,
  **Then** it refuses and points at the section to fill.

---

## 7. Technical Considerations

### Architecture

- Both commands are thin composers over existing engine modules; new logic is ID
  allocation and template substitution only.
- Template resolution: `new URL('../../templates/prd-template.md', import.meta.url)`
  from dist, so the installed package is self-sufficient; config override for repos
  that fork the template.
- Lease writes use the `wx`/containment discipline established by `gate init`
  (PRD-004 review).

### Dependencies

- None added.

### Database Changes

- None.

### API Changes

- New exports: `createPrd`, `claimPrd` from the package index.

---

## 8. Implementation Scope

### In Scope

- `src/core/run/new.ts`, `src/core/run/open.ts`, `src/cli.ts`, `src/index.ts`
  (exports), the two test files, QUICKSTART + two docs pages.

### Out of Scope

- Everything else; especially the runner chain, gates, and lock schema.

---

## 9. Open Questions

- (none)

---

## 10. References

- `packages/provegate/src/core/locks/` — glob engine, lease validation, conflicts
- `packages/provegate/src/core/run/init.ts` — containment + `wx` discipline
- `_prds/completed/prd-001-config-state-locks.md` — lease model origin

---

## Conflict Surface

- `packages/provegate/src/core/run/new.ts`
- `packages/provegate/src/core/run/open.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/src/index.ts`
- `packages/provegate/test/new.test.ts`
- `packages/provegate/test/open.test.ts`
- `packages/provegate/QUICKSTART.md`
- `apps/docs/content/docs/quickstart.mdx`
- `apps/docs/content/docs/cli.mdx`

---

## Durable Artifacts

- `packages/provegate/QUICKSTART.md` — creation path via `gate new`
- `apps/docs/content/docs/cli.mdx` — new/open documented as real

---

## 11. Verification Commands

Run from repo root after `pnpm build`.

| FR   | Command / Check                                                  | Scope     | Notes                                     |
| ---- | ---------------------------------------------------------------- | --------- | ----------------------------------------- |
| FR-1 | `pnpm --filter provegate test test/new.test.ts`                  | provegate | id allocation, substitution, refusal      |
| FR-2 | `pnpm --filter provegate test test/open.test.ts`                 | provegate | claim, conflict refusal, steal logging    |
| FR-3 | `grep -c "phase B" packages/provegate/src/cli.ts`                | provegate | expect 0 — stub table gone (grep exits 1) |
| FR-4 | `pnpm --filter provegate test test/new.test.ts test/open.test.ts` | provegate | grouped rerun                            |
| FR-5 | `grep -c "gate new" packages/provegate/QUICKSTART.md`            | provegate | creation path documented                  |

Cross-cutting (all green before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm --filter provegate test` — full suite incl. all prior PRD suites unchanged
- `pnpm build` — clean (both apps too)
- `node packages/provegate/dist/cli.js check PRD-006` — this PRD passes its own gate
- `node packages/provegate/dist/cli.js push; test $? -eq 1` — never-push invariant
- `grep -ri -l -e emofy -e rayvaz packages/provegate/src && exit 1 || true` — hygiene

---

## 12. DO NOT (Anti-Patterns)

- DO NOT reuse IDs from completed/deferred states — max across ALL states + 1.
- DO NOT write a lease when any overlap exists; partial claims do not exist.
- DO NOT make `--steal` silent — it prints what it stole from whom, always.
- DO NOT add interactive prompts; every input is an argument or flag.
- DO NOT fabricate template content — the shipped `prd-template.md` is the single
  source; substitution touches only ID/slug/date/status/class lines.
- DO NOT add push code paths, runtime dependencies, or network calls.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-23 | rayvaz | Initial draft |
