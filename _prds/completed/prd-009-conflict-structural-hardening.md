# PRD-009: Conflict Detection Hardening — Close the Sibling-Glob False-Negative

> **Status**: Draft
> **Created**: 2026-07-23
> **Updated**: 2026-07-23
> **Author**: rayvaz
> **Audience**: Implementing Agent (Claude Code / Cursor / Codex)
> **Slug**: `conflict-structural-hardening`
> **Cycle Phase**: 2 (Readiness Scored)
> **PRD Class**: test-hardening
> **Class Rationale**: not feature — no new user-facing surface; this closes a
> DOCUMENTED false-negative in existing conflict detection and pins it with a
> pattern-pair test matrix.
> **Autonomous Close**: operator-gated
> **State Record**: `_state/prds.json`

---

## 1. Introduction / Overview

`structuralOverlap` in `core/locks/conflicts.ts` exists for the empty-repo hole:
when two surfaces materialize to ZERO tracked files (new directories), file-level
overlap cannot fire, so overlap is decided on the glob patterns themselves. Today
that decision only catches identical or prefix-nested normalized globs — the
header comment admits it: "The residual sibling-glob case is a documented
false-negative."

Concretely, with no tracked files under `src/`:

- `src/api/*.ts` vs `src/api/users.ts` — no overlap reported; both claims land.
- `src/*/handlers/**` vs `src/auth/handlers/**` — same miss.

Two agents then both hold "exclusive" leases over the same future files, and the
collision this product promises to catch at claim time arrives at merge time
instead — the exact failure mode the whitepaper argues against.

The fix: a zero-dependency glob-intersection decision, `globsMayIntersect(a, b)`,
sound over the engine's supported syntax (`**`, `*`, `?`, literals — the whole
grammar `globToRegExp` compiles). Pattern intersection over this grammar is
decidable; the requirement is NO false negatives, with rare conservative false
positives acceptable (a refused claim is recoverable by editing a surface; a
missed collision is silent corruption).

---

## 2. Goals

### Primary Goals

- [ ] Zero false-negative pattern pairs across the supported glob grammar
      (verified by an enumerated test matrix).
- [ ] Existing true-negative pairs (genuinely disjoint surfaces) keep passing —
      parallelism is not sacrificed.
- [ ] The "documented false-negative" comment is deleted because it stops being
      true.

### Success Metrics

| Metric                        | Current             | Target             | Measurement       |
| ----------------------------- | ------------------- | ------------------ | ----------------- |
| Sibling-pair false negatives  | documented, unfixed | 0 in matrix        | conflicts.test.ts |
| Disjoint-pair false positives | 0                   | 0 in matrix        | conflicts.test.ts |
| Structural check syntax cover | prefix-nesting only | full glob grammar  | glob.test.ts      |

---

## 3. User Stories

#### User Story 1

```
As two agents claiming surfaces over directories that do not exist yet,
I want overlapping PATTERNS refused at claim time even with zero tracked files,
so that "collide at claim, not at merge" holds for greenfield work too.
```

**Acceptance Criteria:**

- [ ] `gate open` refuses when the candidate's globs may-intersect an active
      lease's globs, regardless of materialization; the refusal names both globs
      (`a ~ b` format, as today).
- [ ] Literal-vs-wildcard pairs (`src/api/users.ts` vs `src/api/*.ts`), star-crossing
      pairs (`src/*/x/**` vs `src/a/x/**`), and `?` pairs are all in the matrix.
- [ ] Genuinely disjoint pairs (`src/a/**` vs `src/b/**`, `*.md` vs `*.ts`) stay
      claimable in parallel — asserted, not assumed.

---

## 4. Functional Requirements

1. **FR-1 — `globsMayIntersect` in `core/locks/glob.ts`**: segment-wise
   simultaneous walk over both patterns (literal↔literal by equality;
   `*`/`?` unify within a segment; `**` unifies across segments), memoized,
   bounded (patterns are config-scale, not user-input-scale); zero dependencies;
   documented decision rules in the module header. Sound: returns `true` whenever
   any concrete path matches both.
   - **Targets:** `packages/provegate/src/core/locks/glob.ts`
2. **FR-2 — `structuralOverlap` rewrite**: replace the normalize+prefix check with
   `globsMayIntersect`; keep the `a ~ b` reporting shape and the "only when a
   side materializes to zero files" trigger condition unchanged (materialized
   overlap already handles the rest).
   - **Targets:** `packages/provegate/src/core/locks/conflicts.ts`
3. **FR-3 — Test matrix**: `glob.test.ts` gains an intersect matrix (pairs ×
   expected verdict, including the two documented misses above, `**` boundary
   cases, `?`-vs-literal, and disjoint controls); `conflicts.test.ts` asserts the
   end-to-end claim refusal for a sibling pair with zero tracked files and the
   parallel claim for a disjoint pair.
   - **Targets:** `packages/provegate/test/glob.test.ts`, `packages/provegate/test/conflicts.test.ts`
4. **FR-4 — Doc truth**: the false-negative comment in `conflicts.ts` and any
   docs echo (METHOD/cli pages, if present) are updated to describe the new
   guarantee and its conservative-refusal bias.
   - **Targets:** `packages/provegate/src/core/locks/conflicts.ts`, `apps/docs/content/docs/cli.mdx`

---

## 5. Non-Goals (Out of Scope)

- No new glob syntax (no braces, no character classes, no negation) — the grammar
  stays what `globToRegExp` compiles.
- No changes to materialized (tracked-file) overlap detection.
- No CLI surface changes; refusal formats stay as they are.
- No performance work beyond memoization — surfaces are tens of globs, not
  thousands.
- No push code paths, dependencies, telemetry, or network calls.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** zero tracked files and an active lease over `src/api/*.ts`, **When**
  `gate open` runs for a surface containing `src/api/users.ts`, **Then** the claim
  refuses naming `src/api/users.ts ~ src/api/*.ts`.
- **Given** zero tracked files and an active lease over `src/a/**`, **When**
  `gate open` runs for `src/b/**`, **Then** the claim succeeds.
- **Given** the pairs in the FR-3 matrix, **When** `globsMayIntersect` evaluates
  each, **Then** every verdict matches the enumerated expectation.

---

## 7. Technical Considerations

### Architecture

- Intersection over `**`/`*`/`?`/literal patterns is intersection of regular
  languages — decidable; the segment-wise walk with memoization on
  (indexA, indexB) pairs is the standard construction, ~60 lines, no library.
- Conservative bias is a DESIGN CHOICE stated in code: where the walk cannot
  cheaply prove disjointness it returns may-intersect. False positive cost = one
  refused claim + a surface edit; false negative cost = silent double-claim.
- `findConflicts` and `candidateConflicts` call sites are untouched — only the
  structural predicate under them changes.

### Dependencies

- None added.

### Database Changes

- None.

### API Changes

- New export from locks internals: `globsMayIntersect` (test-visible; whether it
  joins the package index is Phase 3's call — default no).

---

## 8. Implementation Scope

### In Scope

- `src/core/locks/glob.ts`, `src/core/locks/conflicts.ts`, the two test files,
  the doc echo.

### Out of Scope

- Everything else — especially lease install protocol, mutex, CLI.

---

## 9. Open Questions

- (none)

---

## 10. References

- `packages/provegate/src/core/locks/conflicts.ts:63` — the documented
  false-negative comment this PRD deletes (`structuralOverlap` at :64)
- `packages/provegate/src/core/locks/glob.ts` — supported grammar
  (`globToRegExp`)
- `_prds/completed/prd-001-config-state-locks.md` — glob engine origin

---

## Conflict Surface

- `packages/provegate/src/core/locks/glob.ts`
- `packages/provegate/src/core/locks/conflicts.ts`
- `packages/provegate/test/glob.test.ts`
- `packages/provegate/test/conflicts.test.ts`
- `apps/docs/content/docs/cli.mdx`

---

## Durable Artifacts

- `apps/docs/content/docs/cli.mdx` — structural-overlap guarantee described

---

## 11. Verification Commands

Run from repo root after `pnpm build`.

| FR   | Command / Check                                                   | Scope     | Notes                                  |
| ---- | ----------------------------------------------------------------- | --------- | -------------------------------------- |
| FR-1 | `pnpm --filter provegate test test/glob.test.ts`                  | provegate | intersect matrix, memoized walk        |
| FR-2 | `pnpm --filter provegate test test/conflicts.test.ts`             | provegate | end-to-end refusal + disjoint control  |
| FR-3 | `pnpm --filter provegate test test/glob.test.ts test/conflicts.test.ts` | provegate | grouped rerun                    |
| FR-4 | `pnpm --filter provegate test test/conflicts.test.ts`                             | provegate | doc-truth test: comment absent (portable exit) |

Cross-cutting (all green before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm --filter provegate test` — full suite incl. all prior PRD suites unchanged
- `pnpm build` — clean (both apps too)
- `node packages/provegate/dist/cli.js check PRD-009` — this PRD passes its own gate
- `node packages/provegate/dist/cli.js push; test $? -eq 1` — never-push invariant
- `grep -ri -l -e emofy -e rayvaz packages/provegate/src && exit 1 || true` — hygiene

---

## 12. DO NOT (Anti-Patterns)

- DO NOT resolve ambiguity toward disjoint — uncertain = may-intersect, always.
- DO NOT extend the glob grammar while hardening it — same syntax in, same out.
- DO NOT touch materialized overlap or its precedence over the structural check.
- DO NOT regex-intersect by string manipulation on the compiled regexes — walk
  the PATTERNS; the compiled form erases segment structure.
- DO NOT weaken any existing passing pair in the suite to make the matrix green.
- DO NOT add push code paths, runtime dependencies, or network calls.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-23 | rayvaz | Initial draft |
