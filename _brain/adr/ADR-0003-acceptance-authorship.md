---
name: ADR-0003-acceptance-authorship
description: >-
  Acceptance authorship becomes a required enumerated field: `owner` records who decided,
  `authorship` records who typed. A record, not an enforcement.
type: decision
scope: workflow
status: accepted
links: [operator-acceptance-no-self-accept, free-text-field-is-the-unread-drift-ledger, push-is-human-by-omission]
---

# ADR-0003: Acceptance authorship

## Context
The method stated in three places that an agent never writes the acceptance store. The
statement had been false in this repository since PRD-016. Of the sixteen entries in
`_state/acceptances.json` at the time of this decision, eight recorded an owner typing at a
terminal (`method: "interactive"`) and eight recorded an agent transcribing an owner's
in-session decision — in four different ad-hoc phrasings, because `method` is the one entry
field with no enumeration and every agent that wrote one reached for it honestly.

Nothing could read those eight. `entryProblem` required `method` to be a non-empty string;
`validAcceptance` did not look at it at all. An owner-typed entry and an agent-typed entry
were byte-indistinguishable to every gate in the runner, which means the merge gate's
`owner ∈ owners` check proved only that a legal role name appeared in a JSON file. The rule
that gave that check its meaning — that agents never write the file — was documentation,
enforced by nothing, and nine work items had already gone the other way.

The owner asked for the rule to change so the workflow would stop relitigating a decision
they had already made, and asked for it to be recorded rather than repeated per session.
There was a standing deferral (`Acceptance authorship rule`) that had anticipated the shape
of the answer: "the artifact should keep saying who actually pressed the gate."

## Decision
Acceptance authorship becomes structural. A required field, `authorship`, enumerated to
exactly `owner-written` and `agent-transcribed`, sits beside `owner`. `owner` names who
DECIDED; `authorship` names who TYPED; `method` keeps its free text for the mechanism. The
enum is enforced in `entryProblem`, the single structural validator both branches of
`operatorGateOk` already reach, and nowhere else — `validAcceptance` holds no opinion about
the field, because a second checker that agrees today is a second authority that has not
disagreed yet.

The documented rule becomes: an agent writes the acceptance store only on explicit
in-session owner direction, and only with `authorship: "agent-transcribed"`. An agent never
originates an acceptance and never accepts its own work. `operator-acceptance-no-self-accept`
survives with its rule intact — transcribing an owner's decision is not self-accepting — and
gains the distinction that makes the rule survivable.

`schemaVersion` stays at `1`. No released version has consumers, and the single store in
existence was migrated in the same commit as the validator, with the mapping derived from the
recorded `method` text rather than invented: exactly `interactive` is `owner-written`, every
other phrasing is `agent-transcribed`.

This diverges `packages/provegate/METHOD.md` and
`packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md` from the source
snapshot, which critical rule 4 requires method content to be traceable to. The divergence is
deliberate, and this ADR is where it becomes traceable.

## Consequences
The field is a **record, not an enforcement**, and the distinction has to be stated plainly
or the field will be mistaken for a control. Nothing prevents an agent from writing
`owner-written`, and nothing can — the agent holds the pen either way, and no gate the runner
could add would know the difference. What the enum buys is narrower and still worth having:
authorship stops depending on four agents inventing four phrasings; drift becomes countable,
so "how many closes were agent-transcribed" is a query rather than an archaeology exercise;
and concealing authorship becomes an affirmative false statement in a typed field, which
review and audit can catch, instead of an unreadable ambiguity that nobody can.

The merge gate's guarantee is therefore honestly weaker than it appeared and honestly
stronger than it was. It appeared to prove a human decided; it never did. It now proves the
entry is well-formed and says who typed it, and the social control — an owner reading a close
they did not authorize — has something to read.

Reverting requires care: `entryProblem` refuses any key outside `ENTRY_FIELDS`, so a revert
of the code alone leaves sixteen entries the restored validator rejects, and the failure
surfaces at the next merge gate on unrelated work. The undo is to revert the code and the
store as one unit, which the single-commit rule above makes possible.

The push rule is untouched and is not weakened by analogy.
`push-is-human-by-omission` is enforced by the absence of a code path rather than by
documentation, which is exactly why it did not decay the way this one did.

## Alternatives considered
**Leave the rule as written and enforce it.** Rejected: nothing can enforce it. The runner
cannot tell who typed a file, and the eight existing violations were not misconduct — they
were an owner directing an agent and the agent complying, which is the workflow working.

**Loosen the prose and add no field.** Rejected: it would have made the documentation true
and left the record unreadable, so the next audit would face the same four phrasings and the
same archaeology. The deferral had already named this: loosening the rule alone will not do
it.

**Bump `schemaVersion` and ship a migration path.** Rejected as ceremony for an unpublished
package with one store in existence. Recorded here so a future reader sees it was weighed
rather than missed; if the package gains consumers before this field does, that judgement
changes.

**Derive authorship at read time from the `method` text.** Rejected: it makes every future
reader re-implement a heuristic over free prose, which is the defect being fixed rather than
a fix for it. The heuristic was correct once, for a migration, against data that already
existed.
