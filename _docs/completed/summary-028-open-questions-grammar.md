# Summary: PRD-028 — Open Questions Grammar

> **PRD**: [prd-028-open-questions-grammar.md](../../_prds/wip/prd-028-open-questions-grammar.md)
> **Tasks**: [tasks-028-open-questions-grammar.md](../../_tasks/wip/tasks-028-open-questions-grammar.md)
> **Review**: [review-028-open-questions-grammar.md](../reviews/review-028-open-questions-grammar.md)
> **Date**: 2026-07-28

---

## What shipped

The §9 Open Questions grammar is closed and its deferral referent is canonically
resolved. The old lint read `deferred` as a substring over bullet-start lines of the
first matching section; nine hiding places were measured across eight successive
exemption rules. The ninth rule is a closed set: every raw line in exactly one
heading-identified section must be blank, `- (none)`, an exact
`- Deferred to [PRD-NNN](<path>)`, or one terminal `---` — everything else fails by
name. The deferral resolves through the state layer to a distinct, registered,
unfinished work item: configured id width, artifact-root containment, the state
builder's own basename parser with number equality, existence, configured
wip/deferred role, lstat-regular with exactly one hard link, realpath containment
with canonical state-segment agreement, on-disk byte-equal basename, a refused
charset (`#`, `?`, `%`, `&`, `\`, `:`, ASCII controls), and the target's own H1.
The absent fifth argument fails closed. The same cardinality rule closes the FR-block
first-match hole, with FR entries read from the scanner's executable view. The
shipped template teaches both forms immediately before the §9 heading and
instantiates green. `$TURBO_ROOT$/_brain/**` joined the test task's inputs.

## Numbers

- 38 tests in `open-questions.test.ts`: the sixteen-row deny matrix with paired
  positive controls, the grammar/cardinality fixtures, the wip corpus oracle
  (9 files, 0 offenders), the four-input turbo assertion. Full suite 1255/1255.
- Phase 6: seven independent Codex rounds; Critical went 2 → 3 → 1 → 1 → 1 → 0 → 0.
  Rounds 1–5 each found a real canonical-identity or referent-split bypass
  (directory alias, hardlink, case-identity, fenced FR, `?`/`%`, `&quest;`
  entity, control characters); rounds 6–7 sustained Critical: 0.
- The Phase-4 stop rule fired: four wip PRDs failed the closed grammar; the owner
  directed in-session conformance edits on main (`48d5503`) instead of a hand-back.

## Durable artifacts

- Review: `_docs/reviews/review-028-open-questions-grammar.md` (pass, Critical: 0,
  quorum 1/1)
- Learning: `_brain/learnings/exemption-marker-needs-no-prose.md` + INDEX pointer
- Decision: none — the grammar closure is the owner's recorded PRD decision;
  loosening it is a future ADR

## Operator handoff

Operator-gated close: owner acceptance + `git push` remain the owner's.
