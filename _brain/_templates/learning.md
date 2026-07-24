---
name: <kebab-case-slug>            # == filename without .md, unique across _brain
description: >-                     # ONE self-contained line; recall relevance matches on this
  <one line: what the trap/rule/fact is, tersely>
type: gotcha                       # gotcha | convention | reference | decision
scope: workflow                    # workflow | project
status: active                     # active | superseded
links: []                          # optional: related record slugs
# provenance: <where a seed came from>     # optional
# superseded-by: <slug>                    # set only when status: superseded
---

<The fact, tersely. State it as an invariant, not a story.>

**Why:** <the reason it holds / decision rationale>
**How to apply:** <what the reader does differently because of this>

<!-- Link related records inline: [[other-slug]]. Delete Why/How lines for type
     `reference`; keep them for `gotcha`, `decision`, and `convention`. -->
