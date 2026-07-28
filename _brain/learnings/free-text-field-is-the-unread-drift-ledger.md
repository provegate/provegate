---
name: free-text-field-is-the-unread-drift-ledger
description: >-
  When a rule is enforced only by documentation, the unenumerated field beside it becomes
  where the violations get honestly recorded, and nobody can read them.
type: gotcha
scope: workflow
status: active
links: [operator-acceptance-no-self-accept, evidence-pattern-satisfied-by-the-template, docs-outlive-the-gate-they-promise]
watch: [_state/**, packages/provegate/schemas/**]
---

A rule that only documentation enforces does not get obeyed or broken cleanly. It drifts,
and the drift lands in whatever adjacent field has no enumeration — because the people
breaking the rule are usually not hiding it. They write down what they did, in the one place
that accepts arbitrary text, and that text is unreadable to every gate, query and audit.

Measured: the method said an agent never writes the acceptance store. Sixteen entries
existed; eight had been written by an agent at explicit owner direction, over nine work
items. Every one of those eight said so, in `method`, the only entry field with no enum —
in four different phrasings, because each agent invented its own. Nothing could count them.
The merge gate checked `owner ∈ owners`, which passes identically whoever typed the file, so
the check that looked like proof of a human decision proved only that a legal role name
appeared in some JSON.

**Why:** an unenumerated field is where honesty goes when the rule has no room for it. That
makes it the most reliable record of drift in the system and the least readable — the two
properties arrive together, and the second one is why the drift can run for nine work items
without anyone noticing. Finding four phrasings of the same fact is not a documentation
problem; it is the measurement telling you the rule and the practice separated a long time
ago.

**How to apply:** when a documented rule has no mechanical enforcement, look at the free-text
field next to it before deciding whether the rule holds — grep the values and count the
distinct phrasings. More than one phrasing of the same fact means drift, and the count is
how long it has been running. Then enumerate the field rather than restating the rule:
`owner` (who decided) beside `authorship` (who typed), required, two legal values. The enum
does not prevent a false value and cannot — but it converts a concealed one from an
unreadable ambiguity into an affirmative false statement a reviewer can catch, and it makes
"how often did this happen" a query instead of archaeology. The same shape recurs wherever a
gate is satisfied by something weaker than it appears: a filename matching a rule token, a
docstring standing in for a check. See ADR-0003.
