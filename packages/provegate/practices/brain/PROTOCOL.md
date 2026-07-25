# `_brain` — Agent-Agnostic Memory Protocol

Implementable spec. A coding agent can build `_brain` from this document alone.
(Installed by `gate init --practices`; this file is the canonical protocol.)

---

## 1. Purpose

`_brain` is an in-repo, committed store of **durable, non-derivable knowledge** that any
coding agent (Claude Code, Codex, Cursor, …) and any human contributor reads and writes.

It is the deposit target for the **Learning** output of the gated PRD workflow: each
phase that discovers a non-obvious trap, decision, or constraint writes it here so the
next agent — of any brand — inherits it.

A common failure mode this design rejects: memory kept in a per-user, agent-specific home
directory — not committed, not tool-neutral. That does not survive contributor turnover or
a different agent. `_brain` is in-repo and tool-neutral by design.

---

## 2. Core principle (the filter)

> Store only what **cannot be derived** from the code, git history, or existing docs.

If a fact is recoverable by reading the repo, it does **not** belong in `_brain`.
Concretely — do NOT store:

- code structure, module maps, API signatures → read the code
- past bug fixes recoverable from `git log` → read history
- task-only context that dies with the PR → ephemeral, not durable
- secrets or secret-adjacent values → never
- product/domain specifics that don't generalize → out of scope for seed content

Do store: traps the code can't reveal, decisions and their _why_, external constraints,
cross-cutting conventions, pointers to external resources.

---

## 3. Layout

```
_brain/
  INDEX.md              # one-line pointers; ALWAYS loaded (small on purpose)
  README.md             # what _brain is + how to add a learning (short; humans read it)
  PROTOCOL.md           # this SPEC, imported verbatim — the canonical protocol
  learnings/            # non-derivable knowledge — gotchas, conventions, references
    <slug>.md
  adr/                  # architecture decision records
    ADR-0001-<slug>.md
  private/              # OPTIONAL — gitignored; sensitive project-scoped learnings
    .gitignore          # contains: `*` plus `!.gitignore` (else it ignores itself)
  _templates/
    learning.md
    adr.md
```

Peer of `_prds/`, `_readiness/`, `_tasks/`. Unlike those, `_brain` is **not**
lifecycle-staged (no `wip/completed/deferred`) — it is a persistent knowledge base;
lifecycle is expressed by each record's `status` field instead.

---

## 4. Record schema (learnings)

Each `learnings/<slug>.md` is one fact with YAML frontmatter:

```yaml
---
name: false-green-on-missing-file        # kebab-case, == filename slug, unique
description: >-                            # one line; used for recall relevance matching
  A per-FR check that greps a file must exit non-zero when the file is absent,
  else the gate is a false green.
type: gotcha                              # gotcha | convention | reference | decision
scope: workflow                           # workflow | project   (the generalization knob)
status: active                            # active | superseded
links: [absence-must-be-asserted]         # optional; related record slugs
provenance: workflow-seed                 # optional; where a seed came from
superseded-by: <slug>                     # optional; set when status: superseded
---

<the fact, tersely>. For types `gotcha`, `decision`, and `convention`, follow with:

**Why:** <the reason it is true / the decision rationale>
**How to apply:** <what the reader should do differently>

Link related records inline with [[absence-must-be-asserted]].
```

### Field rules

- **name** — kebab-case, equals the filename without `.md`, unique across `_brain`.
- **description** — ONE line, self-contained. This is what an agent scans to decide
  relevance. If it needs the body to be understood, rewrite it.
- **type**
  - `gotcha` — a non-obvious trap; body must include **Why** + **How to apply**.
  - `convention` — a cross-cutting rule the code doesn't state.
  - `reference` — a pointer to an external resource (URL, dashboard, ticket).
  - `decision` — a lightweight decision that isn't heavy enough for a full ADR.
- **scope** — `workflow` (true for anyone running the gated workflow) or `project`
  (specific to the downstream product). **Seed content is `workflow` only.**
- **status** — `active` or `superseded`. Wrong records are deleted (git history is the
  audit). Records replaced by a better one are marked `superseded` + `superseded-by`,
  kept briefly for traceability, then removable.
- **links / superseded-by** — record slugs; may point to a slug that doesn't exist yet
  (marks something worth writing). Not an error.

---

## 5. INDEX.md

The always-loaded table of contents. One line per record, grouped by section. No record
body ever goes here.

```markdown
# _brain — index

> One-line pointers only. Detail lives in each file. Keep hooks short (≤ ~120 chars).

## Workflow gotchas

- [false green on missing file](learnings/false-green-on-missing-file.md) — grep-a-file check must exit 1 when file absent
- [absence must be asserted](learnings/absence-must-be-asserted.md) — "must NOT exist" needs an explicit assert-absent, not a negative grep

## Conventions

- ...

## ADRs

- [ADR-0001 …](adr/ADR-0001-....md) — <one-line hook>
```

Keep INDEX small enough that loading it whole is cheap. If it grows large, split detail
further — never inline it.

---

## 6. Recall protocol (agent-agnostic)

Because no agent-neutral harness auto-injects memory, recall is explicit:

1. **Load INDEX.** The agent's entrypoint shim (§8) points every agent to `_brain/INDEX.md`
   at task start.
2. **Match by hook.** Scan the one-line hooks/`description`s against the task. Read the
   detail file only for matches — don't bulk-read `learnings/`.
3. **Verify before trusting.** A record reflects what was true _when written_. If it names
   a file, flag, command, or path, confirm that still exists in the repo before acting on
   it. A stale record is a lead, not a fact.

---

## 7. Capture protocol (Learning → memory)

This is the pipeline that turns the workflow's Learning phase output into durable
memory. Make it an explicit step of the workflow's final phase so it is never
skipped:

1. **Trigger.** At phase/PRD close, ask: _did we hit something not derivable from the
   code?_ (a trap, a non-obvious decision, an external constraint). **Mid-task capture is
   allowed and encouraged** — a discovered trap may be written the moment it is found;
   don't wait for close and risk losing it.
   Routing (event → record):

   | Event                       | Record                                              |
   | --------------------------- | --------------------------------------------------- |
   | non-obvious trap hit        | `learnings/` `type: gotcha`                         |
   | lightweight decision made   | `learnings/` `type: decision`                       |
   | architecture-level decision | `adr/` ADR                                          |
   | same pattern used 3+ times  | promote to `type: convention` (or the patterns doc) |
   | useful external resource    | `learnings/` `type: reference`                      |

2. **Generalize filter.** _Would this be true for anyone, or is it a one-off for this
   task?_ One-off → discard. Generalizable → continue.
3. **Write the record.** Create `learnings/<slug>.md` per §4. Terse. Include **Why** +
   **How to apply** for gotchas.
4. **Index it.** Add the one-line pointer to `INDEX.md`.
5. **Link.** Cross-link related records with `[[slug]]`.
6. **Dedupe.** Before creating, check for an existing record that already covers it —
   update that file instead of forking a near-duplicate.

Optional enforcement (ships with the `verify:*` library): a `verify:brain` script (§9) can
require that a change touching a declared workflow-tooling path glob either adds/updates a
`_brain` record or carries an explicit `Learning: none` line in its Durable Artifacts
section — nudging capture without forcing noise.

---

## 8. Agent-agnostic loading (shims)

`_brain` does not auto-load; each agent reads a different entrypoint. Put ONE pointer
line in each, all substance stays in `_brain`:

- `CLAUDE.md` → Claude Code
- `AGENTS.md` → Codex, and the shared cross-agent contract
- `.cursor/rules/brain.mdc` → Cursor

Ready-to-paste snippets ship with the pack (`practices/shims/` in the installed package). Rule: shims are **thin** — a pointer and
the recall/verify reminder, nothing more. Never duplicate learning content into a shim;
it will drift.

---

## 9. Optional tooling — `verify:brain`

A `verify:brain` check (runnable in CI and the workflow gate) that asserts:

- every `learnings/*.md` and `adr/*.md` has valid frontmatter (required: `name`,
  `description`, `type`, `scope`, `status`);
- `name` equals the filename slug and is unique;
- every record has exactly one `INDEX.md` pointer (no orphans, no duplicates);
- no `[[link]]` / `links:` / `superseded-by:` points at a name that violates the slug
  rules (dangling to a not-yet-written _valid_ slug is allowed and reported as a soft
  note, not a failure);
- ADR records are validated per the ADR template's own rules (`ADR-NNNN-<slug>` names,
  `proposed | accepted | superseded` status), not the learning-record rules.

The record schema above is designed so the check is mechanical to add. Alongside it, a periodic (e.g. weekly) `_brain` lint pass
is worth one recurring line: sweep for stale `superseded` records, hook/description drift,
and near-duplicate candidates to merge.

---

## 10. Committed vs. private

- **Default: committed.** OSS knowledge is shared; that is the whole value.
- **Sensitive project learnings** (`scope: project` with private detail) → `_brain/private/`,
  gitignored. Keep the _pointer_ out of the public `INDEX.md`, or use a separate
  `private/INDEX.md`. Never put secrets in `_brain` at all — private is for
  business-sensitive, not credentials.

---

## 11. ADRs

Architecture Decision Records live in `_brain/adr/` — a decision is a heavy, long-lived
memory. Template in `_templates/adr.md`. Each ADR also gets an `INDEX.md` pointer with a
one-line hook. Numbering: `ADR-0001-<slug>.md`, monotonically increasing, never reused.

**Decisions bind:** before any architecture-level change, sweep `adr/` for a decision it
touches — and **update the ADR before deviating from it** (a superseding ADR, not a silent
violation).

---

## 12. Acceptance (definition of done for adoption)

- [ ] `_brain/` exists with the §3 layout.
- [ ] `INDEX.md` present, grouped, pointing at every seeded record — no orphans.
- [ ] `_templates/learning.md` + `_templates/adr.md` present and match §4 / §11.
- [ ] This document present as `_brain/PROTOCOL.md` — the canonical protocol.
- [ ] Seed learnings present in `_brain/learnings/` (installed from the pack), each
      `scope: workflow`, `provenance: workflow-seed`, verified to describe a tool-agnostic
      invariant (no source-project leak).
- [ ] Agent shims wired into `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/brain.mdc` (create
      the entrypoints if absent).
- [ ] `README.md` in `_brain/` tells a human how to add a learning in < 1 minute and
      points at `PROTOCOL.md` for the full rules.
