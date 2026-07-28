# Summary: PRD-033 — Acceptance Authorship Provenance

> **PRD:** PRD-033 · **Ship Readiness:** Ship Verified pending owner acceptance
> **Readiness:** 8.25/10 PASS (iteration 2, self-scored)
> **Review:** pass, Critical 0 (self-run — see below)
> **Branch:** `feat/prd-033-acceptance-authorship` · 30 files, +3567/−461

## What changed

`authorship` is now a required, enumerated field on every acceptance entry:
`owner-written` or `agent-transcribed`. `owner` records who **decided**;
`authorship` records who **typed**; `method` keeps its free text for the mechanism.
The rule became: an agent writes the acceptance store only on explicit in-session
owner direction, and only with `agent-transcribed`. An agent never originates an
acceptance and never accepts its own work.

## Why this was not a loosening

The method said an agent never writes the acceptance store. That had been false
since PRD-016. Of the sixteen entries in the store, **eight were already
agent-written** at owner direction, over nine work items — and every one of those
eight said so honestly, in `method`, the only entry field with no enumeration.
Four different agents invented four different phrasings. Nothing could read them.

The merge gate checked `owner ∈ owners`, which passes identically whoever typed the
file. So the check that looked like proof a human had decided proved only that a
legal role name appeared in some JSON. The invariant this PRD was accused of
weakening had already been gone for nine work items; what it did was make the
record structural so the drift is countable.

The field is a **record, not an enforcement**, and every artifact now says so.
Nothing prevents an agent from writing `owner-written`, and nothing can. What the
enum buys is that concealing authorship becomes an affirmative false statement in a
typed field rather than an unreadable ambiguity.

## What the process caught

- **Readiness round 1 (6.85, ITERATE)** found two defects in the PRD's own text: a
  risk it asserted that reading three functions dissolved, and a **rollback path it
  never considered**. `entryProblem` refuses unknown keys, so reverting the code
  alone would have left sixteen entries the restored validator rejects — surfacing
  not at the revert but at the next merge gate, on unrelated work.
- **The sweep, run from the repo root before editing**, found a ninth site the PRD
  missed (`apps/web`, stating the rule twice) and one it double-counted. Running it
  from the PRD's own table would have found neither.
- **Phase 6** found that the gate this PRD adds was itself satisfiable by
  boilerplate: its self-accept assertion matched the token `self-accept`, which the
  record files carry in their frontmatter `name:` line. Two of five sites were green
  on their own filename.
- **A pre-existing authorization defect**: `operatorGateOk`'s fallback branch
  discarded the `problem` that `loadAcceptanceChecked`'s docstring demands
  authorization callers read. A malformed store read as an absent one, so the
  refusal told the operator to record an entry while the bad one sat right there.

Three of those four are the same failure wearing different clothes — an assertion
that looks like it holds something and does not. That is the shape
`free-text-field-is-the-unread-drift-ledger` records, and it is why the record is
written generally rather than as a note about `method`.

## Evidence

Every §11 command PASS. 1110 provegate tests (+17), 43 design, 39 web; types, lint,
build clean. `verify:workflow` PASS including the new gate. Mutation-checked:
neutering the enum fails exactly four tests and only those; each of the new gate's
two assertion classes fires once. **W1 exercised, not asserted** — full revert in a
scratch worktree: 10/10 green and consistent; partial revert refused with
`acceptances[0]: unexpected field "authorship"`, entry null.

## What the owner is being asked to accept

One operator row: that the landed rule, at every site, is the rule they decided.
The agent verified the text is consistent across eight sites and machine-checked at
five; it cannot verify the text is what was wanted.

**This work item was written, scored, implemented and audited by one session**, at
the owner's direction. The readiness and the review both say so in their own words.
The acceptance entry that closes it will carry `authorship: agent-transcribed` — the
change working on the first entry it governs — and the owner's reading of it is the
only outside look this work gets before merge.

## Open after this

Three new deferrals, taking the table to **15/15, at the cap**: the public copy on
`apps/web` carries one clause that is now imprecise (outside the Conflict Surface);
the rule ships to adopters while the gate holding it stays repo-only; and
`loadAcceptance` survives with no production caller. The next work item needing a
deferral must convert the oldest row first.
