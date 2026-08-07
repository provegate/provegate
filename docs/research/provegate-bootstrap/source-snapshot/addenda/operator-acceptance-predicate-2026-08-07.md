# Addendum A3 — What `Autonomous Close` Demands

> **Status:** approved by the owner, 2026-08-07 (in-session direction: "Addendum yaz, FR-5(a)
> kalsın"; drafted by the implementing agent, approval is the owner's recorded act).
> **Scope:** method content for PRD-040 (the operator-acceptance predicate and what counts as
> an operator-owned row).
> **Relationship to the snapshot:** the frozen snapshot under `../` is unchanged and stays
> unchanged. This file is an *addendum*: method content the source project never had, which
> the owner approved as a canonical extension of the workflow. Written in English because
> shipped package content is English-only (MANIFEST §4).

## 1. Why this file exists

The snapshot gives the workflow an operator-acceptance gate and a per-item declaration, and it
never says what the declaration **demands**. It says which items must be `operator-gated` —
"any PRD that produces operator-owned task rows" — and it leaves the converse unwritten: what
an `operator-gated` item owes when it produces none.

The implementation resolved that silence by accident. `operatorGateOk` demands an acceptance
when the operator-row count is positive and passes when it is zero, so the declaration itself
does nothing; the count is the whole gate. An item declared `operator-gated` with no operator
rows merges without a human signature, which makes the QUICKSTART's own advice — "keep
`Autonomous Close: operator-gated` until you trust the gates" — a comment rather than a
control.

The first external adopter run (2026-08-07) found the same silence from the other side: an
`operator-gated` item whose handoff was written as prose merged with `operator rows: 0` and no
acceptance. Repairing the counter alone would leave the declaration inert; deciding what the
declaration means is an **extension** of the snapshot's rule, not an implementation of it, so
under the addenda rule (`../MANIFEST.md` §addenda) it requires this owner-approved record.

## 2. The authorized clauses

**Clause 1 — the declaration is the demand.** An item whose `Autonomous Close` is
`operator-gated` requires a valid owner acceptance entry before its close may merge,
**regardless of how many operator-owned rows its task artifact holds**. Rows are evidence of
*what* is being accepted; the declaration is the statement *that* a human signs this close. An
author who wants no signature declares `eligible` — that is the choice the field exists to
express, and it is made in the open, in the artifact, before the work starts.

**Clause 2 — `eligible` beside operator-owned rows is a contradiction, and it is refused.** The
snapshot already says such an item MUST be `operator-gated`. The rule was unenforced, so the
two documents could disagree in silence. They may not: the refusal names the declaration, the
count, and the artifact, and the remedies are exactly two — change the declaration, or remove
the rows.

**Clause 3 — what an operator-owned row is.** A row is operator-owned when it appears as a list
item or a table data row under the task artifact's `Operator Handoff` section, **or** when it
is a Verification Ledger row whose `Result` is `operator` or `blocked`. The ledger's allowed
results already include both; a method that offers an author a way to say "a human owns this"
and then reads only one of the two places they may say it is not a method, it is a lottery.

**Clause 4 — the invariant is evaluated where it cannot be skipped.** Clauses 1 and 2 are
checked before implementation begins *and* again at the merge gate. One evaluation point is a
gate; a resume that enters the chain after that point is a bypass. Two evaluation points that
must agree is an invariant.

**Clause 5 — an unreadable artifact refuses; it never counts as zero.** When the task artifact
cannot be read — no result column where one is required, a malformed table, a document that
ends inside a fence — the gate refuses and names what it could not read. A silent zero is the
permissive answer to a question nobody could answer, and it is the same failure this addendum
exists to close.

## 3. What this does not authorize

- It does not change who may author an acceptance entry, or what one contains. ADR-0003 and the
  snapshot's operator-acceptance rules stand unchanged: an agent never originates an acceptance
  and never accepts its own work.
- It does not make `operator-gated` the default. The default stays as the templates ship it,
  and an adopter who wants machine-only closes declares `eligible`.
- It does not authorize new prose in any shipped template beyond what Clauses 1–3 state.

## 4. What adopters meet

Clause 1 changes behaviour for existing repositories: an `operator-gated` item that merged with
no acceptance yesterday refuses today. That is the point of the clause, and it is a
compatibility break in effect even though it is a bug fix in intent. The implementing work
measures the affected population before it ships, states both remedies, and the release note
names the change before it names the fix — an adopter meets the refusal first.
