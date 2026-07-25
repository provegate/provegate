# Knowledge Lint — Health Check Protocol

> **Purpose**: Periodic knowledge-base health check. Run when starting a significant
> session, after completing a work item, or at least weekly.
> **Knowledge base root**: {{DOCS_ROOT}} (architecture / decisions / patterns / operations).

---

## Scope

Validate the declared grammar, not prose quality. Every check below is a question a
machine could ask: does the field exist, does the pointer resolve, does the status
vocabulary match, do two pages contradict each other on a fact. Whether a record is
well-written is not this protocol's business — a record that reads badly and is true
stays; a record that reads beautifully and is false is a finding.

---

## Step 1: Freshness Check

For each page family, verify the content is still accurate against the repo:

1. **architecture** — component/app/package counts and diagrams vs the actual source
   tree; integration points vs actual configuration.
2. **decisions** — every ADR has a status; superseded decisions marked, not deleted;
   recent significant changes have an ADR where one was warranted.
3. **patterns** — each pattern still has 3+ live instances; dead patterns marked
   deprecated with a pointer to the replacement.
4. **operations** — runbook commands still execute; environment facts current.

Compare state-derived facts against the workflow state (`gate status`) rather than
memory: item counts, latest completed work, in-flight claims.

## Step 2: Cross-Reference Integrity

1. Every `## Related` link resolves to an existing page.
2. Every ADR reference points to an existing decision file.
3. No orphan pages (unreachable from the index or any other page).

## Step 3: Contradiction Detection

1. Knowledge pages vs {{BEST_PRACTICES_DOC}} — conflicting guidance?
2. architecture pages vs the actual code structure — drift?
3. decisions vs current implementation — decisions silently reversed without a
   superseding ADR?

## Step 4: Gap Analysis

1. Topics covered only in scattered docs that deserve a page?
2. Recent decisions not reflected in architecture pages?
3. Recent commits (`git log --oneline -20`) with significant changes not captured?

## Step 5: Report & Fix

```markdown
## Knowledge Lint Report — [DATE]

### Stale (fix now)

- [page]: [what's wrong] → [fix applied]

### Contradictions

- [page A] vs [page B]: [conflict] → [resolution]

### Gaps (queue as work items if large)

- [missing topic] → [proposed page / owner]

### Verdict: CLEAN / FIXED / NEEDS-WORK
```

Small fixes: apply immediately in the same session. Structural work: queue it as a
work item — a knowledge-base overhaul deserves its own gated cycle.
