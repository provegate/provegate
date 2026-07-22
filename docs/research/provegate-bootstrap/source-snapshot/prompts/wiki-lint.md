# Wiki Lint — Health Check Protocol

> **Purpose**: Periodic wiki health check. Run this when starting a new session or after major changes.
> **Frequency**: At least once per week, or after completing any PRD.

---

## Instructions

You are performing a wiki health check on the Emofy Second Brain wiki at `docs/ai-context/wiki/`.

### Step 1: Freshness Check

For each wiki page, verify the information is still accurate:

1. **`current-state.md`** — Compare with `_STATUS.md`. Are PRD numbers, completed phases, and "What's Next" items up to date?
2. **`tech-stack.md`** — Spot-check versions against `pnpm-workspace.yaml` catalog. Flag any mismatches.
3. **`rules.md`** — Are there new PRDs since last update that introduced new rules? Check `_prds/completed/` for recent completions.
4. **`entity-ids.md`** — Compare prefix count claim ("180+ prefixes") with actual `PREFIX_MAP` in `packages/db/src/utils/id.ts`.
5. **`permissions.md`** — Compare resource/action counts with `packages/types/src/permissions.ts`.
6. **`database.md`** — Compare domain table counts with actual `packages/db/src/schema/core/` structure.
7. **`architecture.md`** — Check app count, package count against actual `apps/` and `packages/` directories.

### Step 2: Cross-Reference Integrity

1. Read every `## Related` section across all wiki pages.
2. Verify all linked pages exist.
3. Verify all ADR references in `## Related` point to existing files in `decisions/`.
4. Check for orphan wiki pages (pages not linked from any other page or the index).

### Step 3: Contradiction Detection

1. Compare `rules.md` with `BEST_PRACTICES.md` — any conflicting guidance?
2. Compare `architecture.md` with actual code structure — any drift?
3. Compare `vision.md` with `docs/000_PRODUCT_VISION_AND_ROADMAP.md` — any divergence?

### Step 4: Gap Analysis

1. Are there important topics covered in `BEST_PRACTICES.md` that should have their own wiki page?
2. Are there recent ADRs (`decisions/`) not reflected in wiki pages?
3. Are there patterns (`patterns/`) that should be cross-referenced from wiki pages?
4. Scan recent git commits (`git log --oneline -20`) — any significant changes not captured in the wiki?

### Step 5: Report & Fix

Generate a report with:

```markdown
## Wiki Lint Report — [DATE]

### Freshness

- [ ] current-state.md — OK / STALE (details)
- [ ] tech-stack.md — OK / STALE (details)
- [ ] rules.md — OK / STALE (details)
- [ ] entity-ids.md — OK / STALE (details)
- [ ] permissions.md — OK / STALE (details)
- [ ] database.md — OK / STALE (details)
- [ ] architecture.md — OK / STALE (details)

### Cross-References

- Broken links: (list)
- Orphan pages: (list)

### Contradictions

- (list any found)

### Gaps

- Missing pages: (list suggested new pages)
- Missing cross-refs: (list)

### Actions Taken

- (list updates made during this lint pass)
```

After generating the report, **fix all issues** you can fix directly. Update the wiki pages, fix broken links, update stale data. Append a lint entry to `wiki/log.md`.

After fixing wiki issues, run:

```bash
pnpm state:sync
pnpm verify:prd-state
pnpm verify:memory-drift
```

If `verify:memory-drift` fails, treat it as part of the lint findings and update the stale memory target or state artifact before signing off.

### Step 6: Log Entry

Append to `docs/ai-context/wiki/log.md`:

```markdown
## [YYYY-MM-DD] lint | Wiki health check

- Pages checked: X
- Stale pages updated: X
- Broken links fixed: X
- Contradictions found: X
- New pages created: X
- Workflow state verified: yes/no
```
