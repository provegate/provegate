# Independent Review: PRD-033 — Acceptance Authorship Provenance

> **PRD:** PRD-033
> **Verdict:** pass
> **Reviewer:** the implementing session — NOT independent. See Independence below.
> **Tool/Model:** Claude Opus 5
> **Base SHA:** de8c46324517232570507f3a70c9f4b3c63d3f6f
> **Diff range:** de8c46324517..c60c9a7
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single reviewer, and that reviewer implemented the work — the count is the format's, not evidence of independence)
> **Rounds:** 1 — findings below were raised and closed within the pass; each fix was mutation-checked

## Independence

This review was performed by the session that wrote the PRD, scored its readiness, and
implemented it. The owner directed that arrangement for the readiness round and it carried
into the audit. It is stated first because every other number in this artifact is worth
less without it: an author's blind spot is the reviewer's blind spot, and no amount of
adversarial framing inside one session fixes that.

What the pass can offer instead of independence is falsifiability. Every finding below was
either reproduced against running code or mutation-checked — the fix was reverted and the
gate or test was confirmed to fail, and to fail on that assertion alone. Two of the five
findings are defects in the reviewer's own work from earlier in the same session, and one
is older than this PRD.

## Findings

Ranked most-severe first. All are **closed**; the counts above are the post-fix state.

- **major** · `scripts/verify/verify-acceptance-rule.mjs` — the gate this PRD adds asserted
  that each site keeps the self-accept prohibition by matching the bare token
  `/self-accept/i`. The two record files carry that token in their frontmatter `name:`
  line, so two of five sites satisfied the assertion on their own filename: the body could
  have dropped the rule entirely and the gate would have stayed green. This is
  `evidence-pattern-satisfied-by-the-template` at small scale, inside a gate written by an
  agent that had just read that record. Fixed to require a rule sentence
  (`never accepts its own work` / `must never self-accept`). Mutation-checked: rewriting the
  record body to say something else now fails the gate, and did not before.
- **major** · `packages/provegate/src/core/run/acceptance.ts:322` — `operatorGateOk`'s
  fallback branch called `loadAcceptance`, which discards `problem`.
  `loadAcceptanceChecked`'s own docstring says a caller treating an acceptance as
  AUTHORIZATION must read it, and this is that caller. The consequence: a store that
  EXISTED and was malformed was indistinguishable from no store at all, so the refusal read
  `record an owner acceptance entry in acceptances.json` while the malformed entry sat right
  there — sending the operator to write a second one. **Predates this PRD**; surfaced
  because three new deny tests asserted on the message and only the committed path carried
  it. Fixed; both paths now produce the same reason.
- **medium** · `_state/acceptances.json` — the first migration went through
  `JSON.parse`/`stringify` and silently rewrote `—` escapes to literal em dashes and
  reordered keys, in `reason` and `items`. The PRD's own §12 forbade rewriting `method`, and
  `method` was preserved perfectly — the collateral landed in the fields the migration was
  not about, where the intended assertion could not see it. Redone as a line-level
  insertion; the fixture test now pins **every** prior field byte-for-byte, not just
  `method`.
- **medium** · `_brain/learnings/operator-acceptance-no-self-accept.md` — the amended record
  quoted the superseded sentence verbatim to explain why it changed, and
  `verify:acceptance-rule` cannot tell a quotation from an assertion. Teaching it to would
  be the parser-parity trap `narrow-the-grammar-not-the-parser` names. Reworded; ADR-0003
  keeps the verbatim history, and the record teaches the rule.
- **low** · PRD FR-4's site list was wrong in both directions. It claimed two statements in
  `AGENT_BOOTSTRAP.md`; there is one, and the line it counted twice is about push and method
  content. It missed `apps/web/app/sections/content.ts`, which states the rule twice on the
  public site. Both web statements say "for itself" and "its own" — the self-accept rule,
  which survives — so neither is false after this change, and one imprecise clause is
  deferred below rather than taken outside the Conflict Surface.
- **low** · task 4.5 specified a `gates.manifest.json` row as one of four wiring surfaces.
  The manifest maps phases to commands and this gate reaches phase 4 through
  `pnpm verify:workflow`, so the row would have run it twice. Two surfaces, not four;
  `verify:gates-wired` passes at 13 registered / 12 on disk.

## Spec-vs-code audit

| FR   | Claim                                                        | Landed                                                                                   |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| FR-1 | required enumerated schema field, `schemaVersion` stays 1    | yes — `schemas/acceptances.schema.json`, `required` + `enum`, version unchanged            |
| FR-2 | validator refuses missing and out-of-enum, names both values | yes — `entryProblem`; absent and illegal share one message on purpose                      |
| FR-3 | sixteen entries migrated, mapping derived, `method` intact   | yes — 8/8, and every other field byte-identical (see the medium finding)                   |
| FR-4 | the rule at every prose site                                 | yes — three sites, not the four claimed; `phase-6-final-auditing.md` is a pointer, unedited |
| FR-5 | cache-free gate, wired                                       | yes — `verify:acceptance-rule`, two surfaces, mutation-checked on both assertion classes    |
| FR-6 | record + packed twin + both INDEX hooks + ledger             | yes — twin byte-identical, `verify:pack-drift` PASS at 49 pairs                            |
| FR-7 | the close names the authorship                               | yes — `2 operator row(s) waived via acceptances.json (owner decided, owner-written)`       |
| FR-8 | ADR-0003 records the decision and the snapshot divergence    | yes — four required sections, parses, indexed                                              |

## Sweep, re-run independently of the author's list

Re-run from the repository root rather than from the PRD's site table. It found the
`apps/web` pair the PRD missed, confirmed `AGENT_BOOTSTRAP.md` states the rule once,
and confirmed the remaining matches are `links:` references in sibling records that carry
no rule text. No site outside the PRD's Conflict Surface required an edit.

## Watch items carried from readiness

| # | Item                                                | Disposition                                                                 |
| - | --------------------------------------------------- | ----------------------------------------------------------------------------- |
| W1 | the revert is asserted, not exercised               | **closed** — exercised in a scratch worktree; evidence in the task ledger    |
| W2 | the gate's negative half matches a phrase           | recorded in the gate's header; positive per-path assertions bound it         |
| W3 | `authorship` is a record, not an enforcement        | stated in ADR-0003 Consequences, METHOD.md, the schema, and the type          |
| W4 | an ambiguous future `method` value has no refusal   | still open — deferral D2                                                     |
| W5 | self-scored readiness                               | compounded, not resolved: the audit is also self-run. See Independence        |

## Verdict

**pass** — Critical 0, High 0, Medium 0 after the fixes above.

The work does what the PRD says, and the two findings that matter were both about a check
being weaker than it appeared rather than about the feature being wrong: a gate satisfied by
a filename, and an authorization caller discarding the diagnostic its own contract demanded.
Both are the same failure in different clothes — an assertion that looks like it holds
something and does not — which is precisely the failure this PRD exists to fix in the
acceptance store itself. That the same shape appeared three times inside one work item is
the most useful thing this review found, and it is why `free-text-field-is-the-unread-drift-ledger`
is written as a general record rather than a note about `method`.

The residual risk is not technical. It is that one session wrote, scored, implemented and
audited this change, and the owner's acceptance is the only outside look it will get before
merge.
