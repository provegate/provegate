---
name: ADR-<NNNN>-<kebab-slug>      # == filename without .md; NNNN monotonic, never reused
description: >-                     # ONE line; the decision in a sentence (for INDEX hook)
  <one line: what was decided>
type: decision
scope: workflow                    # workflow | project
status: accepted                   # proposed | accepted | superseded
links: []                          # optional: related record/ADR slugs
# superseded-by: ADR-<NNNN>-<slug>       # set only when status: superseded
---

# ADR-<NNNN>: <Title>

## Context
<The forces at play. What problem, what constraints, what pressure forced a decision.>

## Decision
<What we chose. State it plainly.>

## Consequences
<What becomes easier, what becomes harder, what we now must live with.>

## Alternatives considered
<Briefly: what else was on the table and why it lost.>
