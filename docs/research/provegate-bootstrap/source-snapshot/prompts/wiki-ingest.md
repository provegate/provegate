# Wiki Ingest — Source Integration Protocol

> **Purpose**: When a new source is added (PRD completed, meeting notes, decision made, analysis report),
> this protocol ensures the wiki is updated to reflect the new knowledge.
> **Trigger**: After Phase 4 completion, after a meeting/decision, or manually by user ("ingest this").

---

## When to Ingest

| Event                      | Source                                                             | Priority                                        |
| -------------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| PRD completed (Phase 4)    | `_prds/completed/prd-XXX-*.md` + `_tasks/completed/tasks-XXX-*.md` | **HIGH** — always ingest                        |
| Architecture decision      | ADR in `decisions/` or verbal decision                             | **HIGH** — always ingest                        |
| Meeting/discussion outcome | Notes, Slack thread, verbal summary                                | **MEDIUM** — ingest if it changes understanding |
| Analysis/review report     | `_plans/*.md`                                                      | **MEDIUM** — ingest key findings                |
| Bug fix / hotfix           | Code change + git commit                                           | **LOW** — only if it reveals a systemic issue   |
| Version upgrade            | `pnpm-workspace.yaml` change                                       | **LOW** — update `tech-stack.md` only           |

---

## Ingest Workflow

### Step 1: Read the Source

Read the complete source document. Identify:

- **New facts**: things that didn't exist before (new tables, new endpoints, new permissions, new roles)
- **Changed facts**: things that supersede existing wiki content (renamed entities, changed architecture)
- **New rules**: conventions or patterns introduced that future agents must follow
- **Contradictions**: where new source conflicts with existing wiki content

### Step 2: Discuss with User (if interactive)

If in a conversation with the user, briefly share:

- Top 3-5 key takeaways from the source
- Any contradictions found with existing wiki
- Suggested wiki updates

If batch-ingesting (no user present), skip this step.

### Step 3: Update Wiki Pages

For each affected wiki page, make targeted updates:

#### `current-state.md`

- Update "Completed Work" with new PRD summary
- Update "What's Next" if the next PRD is known
- Move completed deferred items out of "Deferred Items"

#### `rules.md`

- Add any new agent rules introduced by the PRD
- Format: clear, imperative, with PRD reference
- Group under the appropriate section (UI, EMA, Backend, etc.)
- If a rule supersedes an old one, remove the old one

#### `database.md`

- Add new tables to the relevant domain
- Update table counts
- Add new domains if created

#### `entity-ids.md`

- Add new prefixes to the table
- Update the "180+ prefixes" count if it's significantly off

#### `permissions.md`

- Add new permission resources or actions
- Update role descriptions if changed
- Update resource/action counts

#### `architecture.md`

- Add new modules to backend structure
- Update package descriptions if changed
- Add new architectural patterns (notification, intelligence, etc.)

#### `tech-stack.md`

- Update version numbers if changed
- Add new technologies if introduced

#### `vision.md`

- Only update if the product direction has fundamentally changed
- This should be rare (last update: 2026-04-02)

#### `scripts.md`

- Add new CLI commands
- Remove deprecated commands

### Step 3b: Verify Against Code (CRITICAL)

PRDs describe what was _specified_, not necessarily what was _implemented_. Numbers, counts, and structural claims in PRDs may be outdated by the time you ingest them. Before committing wiki updates:

1. **Counts** (table counts, resource counts, module counts, prefix counts): spot-check against actual code. Example: if the PRD says "29 permission resources", grep `packages/types/src/permissions.ts` and count.
2. **Directory structures** (module lists, sub-modules): verify with `ls` against actual directories.
3. **Config keys and values**: verify the actual implementation file exists and matches.

If a wiki claim doesn't match the code, **trust the code** — update the wiki to reflect reality, not the PRD.

This step was added after the first real ingest (PRD-124/125/126) revealed that PRD-stated counts (32 permission resources, 15 SIS sub-modules) diverged from actual code (38 resources, 23 sub-modules). Without verification, stale data would have entered the wiki.

### Step 4: Update Cross-References

For every wiki page you modified:

1. Check its `## Related` section — add links to newly relevant pages
2. Check other pages that should now link to the modified page
3. Ensure no broken links

### Step 5: Check for New Page Candidates

Ask yourself:

- Does this source introduce a **new concept** that doesn't fit in existing pages? → Create a new wiki page
- Does this source make an existing page **too long** (>150 lines)? → Consider splitting
- Does this source reveal a **pattern used 3+ times**? → Consider a new `patterns/` file

If creating a new page:

1. Create it in `wiki/`
2. Add `## Related` section with links to relevant existing pages
3. Update `MEMORY.md` index table
4. Update `AGENT_BOOTSTRAP.md` directory tree

### Step 6: Update Raw Sources Registry

If the source type is new or the registry is stale:

- Update `wiki/raw-sources.md` with the new source details
- Update file counts if significantly changed

### Step 7: Log the Ingest

Append to `wiki/log.md`:

```markdown
## [YYYY-MM-DD] ingest | <Source Title>

Source: `<file path>`
Pages updated: <list of wiki pages touched>
New pages created: <list, or "none">
Key changes:

- <bullet summary of what changed in the wiki>
```

### Step 8: Verify Workflow State

After wiki updates:

1. Run `pnpm state:sync`.
2. Run `pnpm verify:prd-state`.
3. Run `pnpm verify:memory-drift`.

Do not mark a PRD `Ship Verified` while `_state/prds.json`, `_STATUS.md`, `MEMORY.md`, `wiki/current-state.md`, or Serena `project/current-state` disagree on PRD count/latest implemented PRD.

---

## Ingest Checklist (quick reference)

```markdown
- [ ] Source read completely
- [ ] Key takeaways identified (new facts, changed facts, new rules, contradictions)
- [ ] `current-state.md` updated (if PRD completion)
- [ ] `rules.md` updated (if new agent rules)
- [ ] `database.md` updated (if new tables/domains)
- [ ] `entity-ids.md` updated (if new prefixes)
- [ ] `permissions.md` updated (if new resources/actions/roles)
- [ ] `architecture.md` updated (if structural changes)
- [ ] `tech-stack.md` updated (if version changes)
- [ ] **Counts and structures verified against actual code** (Step 3b)
- [ ] Cross-references checked and updated
- [ ] New page candidates considered
- [ ] `wiki/log.md` entry appended
- [ ] `pnpm state:sync` run
- [ ] `pnpm verify:prd-state` passed
- [ ] `pnpm verify:memory-drift` passed
```

---

## Batch Ingest (multiple sources at once)

When ingesting multiple sources (e.g., catching up after several PRDs):

1. Read all sources first, take notes on all changes
2. Make ONE pass through wiki pages, applying all changes at once
3. This avoids redundant reads and conflicting partial updates
4. Log each source as a separate entry in `log.md`

---

## Integration with Phase 4

Phase 4 (Final Audit) Step 2 includes wiki ingest. If any older prompt says "update `docs/ai-context/MEMORY.md`", interpret it as: **Run the wiki-ingest protocol** on the completed PRD. Specifically:

1. Read the PRD and task files
2. Follow this ingest workflow
3. The old "update MEMORY.md" step is replaced by updating the relevant wiki pages

## Related

- [Wiki Lint](wiki-lint.md) — periodic health check (catches what ingest misses)
- [Raw Sources](../wiki/raw-sources.md) — where sources live
- [Wiki Index](../MEMORY.md) — the index that gets updated
