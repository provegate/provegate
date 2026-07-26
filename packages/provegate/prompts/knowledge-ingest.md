# Knowledge Ingest — Source Integration Protocol

> **Purpose**: When a new source of knowledge appears (a work item completed, a decision
> made, an analysis produced), this protocol updates the knowledge base to reflect it.
> **Trigger**: Phase 7 of a closing work item, after a decision, or manually ("ingest this").
> **Knowledge base root**: {{DOCS_ROOT}} — four page families: **architecture**
> (system shape, components, integration points), **decisions** (ADRs with status and
> rationale), **patterns** (reusable conventions used in 3+ places), **operations**
> (runbooks, environments, recurring procedures).

---

## Precondition

Write the record only after the PRD declares its exact path in `## Memory Outputs`. The
declaration comes first because Phase 7's gate compares the declared paths against the
merge diff: a record written at a path nothing declared is invisible to that gate, and a
declared path with no record fails it. Ingest is the second half of a promise, never the
first half.

---

## When to Ingest

| Event                         | Source                          | Priority                                        |
| ----------------------------- | ------------------------------- | ----------------------------------------------- |
| Work item completed (Phase 7) | completed PRD + tasks artifacts | **HIGH** — always ingest                        |
| Architecture decision         | ADR or verbal decision          | **HIGH** — always ingest                        |
| Meeting/discussion outcome    | Notes, thread, verbal summary   | **MEDIUM** — ingest if it changes understanding |
| Analysis/review report        | planning artifacts              | **MEDIUM** — ingest key findings                |
| Bug fix / hotfix              | Code change + commit            | **LOW** — only if it reveals a systemic issue   |
| Dependency/tooling upgrade    | manifest change                 | **LOW** — update the architecture page only     |

---

## Ingest Workflow

### Step 1: Read the Source

Read the complete source document. Identify:

- **New facts**: things that didn't exist before (new entities, endpoints, permissions)
- **Changed facts**: things that supersede existing content (renames, architecture shifts)
- **New rules**: conventions or patterns future agents must follow
- **Contradictions**: where the new source conflicts with existing knowledge pages

### Step 2: Discuss with User (if interactive)

Share the top 3–5 takeaways, any contradictions found, and the suggested page updates.
If batch-ingesting (no user present), skip this step.

### Step 3: Update Pages (targeted, never wholesale)

- **architecture** — components, counts, integration points that changed
- **decisions** — new ADR (status, context, decision, consequences) + index entry;
  supersede rather than delete old decisions
- **patterns** — a convention now used in 3+ places gets its page; link the instances
- **operations** — new runbook steps, environment facts, recurring procedures

Rules for every update:

- Write only what is **not derivable from code or git history** — rationale,
  conventions, edge cases; never restate diffs.
- New content replaces or supersedes stale content in the same edit — no append-only
  rot.
- Each rule/fact carries its source reference ({{ID_PREFIX}}-XXX or ADR id).

### Step 4: Verify

Run the knowledge-lint protocol (`prompts/knowledge-lint.md`) on the touched pages.
Phase 7's mechanical gate then checks that every page declared in the PRD's Durable
Artifacts is present in the merge diff.
