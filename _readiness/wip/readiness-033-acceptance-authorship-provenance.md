# Readiness Assessment: PRD-033 — Acceptance Authorship Provenance

## Quick Meta

| Field                  | Value                                                          |
| ---------------------- | -------------------------------------------------------------- |
| PRD                    | `_prds/wip/prd-033-acceptance-authorship-provenance.md`        |
| Score                  | 8.25/10                                                        |
| Verdict                | PASS                                                           |
| Iteration              | 2                                                              |
| Model Tier (Execution) | high                                                           |
| Model Tier (Audit)     | high                                                           |
| Scored by              | Claude Opus 5                                                  |
| Self-scored            | yes — the same agent wrote the PRD, at the owner's direction    |
| Date                   | 2026-07-27                                                     |
| PRD Lint               | passed — `gate check PRD-033`                                  |
| State Record           | pending                                                        |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale                                                                                                                            |
| ------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 4 (Execution) | high | Score band 8–8.9, and independently: a schema change to the artifact the merge gate treats as authorization. The mistakes available here are quiet ones — an enum landing beside the identity check instead of before it, a migration that fills fifteen of sixteen entries |
| Phase 6 (Audit)     | high | Same surface. The audit's real job is the sweep: eight sites, two of them shipped, and a hash-paired twin that fails on the ledger rather than on the substance if one side moves alone |

---

## Analysis

### 1. Technical Depth & Architecture

The PRD's strongest work is the site enumeration. The full-repo sweep found eight
statements of the rule where a file-scoped search found four, and the four it added
are the ones shipped to consumers — the packed record twin, the packed INDEX, and the
hash pair in `scripts/verify/pack-drift-ledger.json`. A repo-only fix would have left
every adopter installing the old rule while the repository's own docs claimed
otherwise, and `verify:pack-drift` would have failed on the hash pair rather than on
the substance.

The cache-key reasoning is also right and non-obvious. `provegate#test` hashes package
files; `AGENT_BOOTSTRAP.md` and `_state/acceptances.json` are outside the package, so
a package test asserting on them can replay a cached pass over a change it never read.
Splitting FR-4 and FR-5 by *where the file lives* rather than by *what is asserted* is
the correct axis, and it avoids widening the hole the open `Frozen-snapshot digest`
deferral already names.

**[FINDING — Tech Depth] §7 asserts a risk that measurement dissolves, and hands the
measurement to the implementer.** The PRD states that the `loadAcceptance` fallback
path "must be confirmed to run the same structural check, or the enum is enforced on
one path and not the other." Reading the code answers it: `loadAcceptance` →
`loadAcceptanceChecked` → `acceptanceFrom` → `entryProblem`. Both branches of
`operatorGateOk` funnel through the same structural validator. What actually differs
is narrower and worth stating precisely: the fallback branch calls `loadAcceptance`,
which discards `problem` and returns `.entry` alone, so a schema-invalid store fails
the gate through `validAcceptance(null)` with a generic message instead of the specific
one. That is a *diagnostic* difference, not an enforcement gap. The PRD's framing
inflates a real-but-small issue into a correctness risk, and asks Phase 4 to establish
something Phase 1 could have established by reading three functions.

### 2. Edge Cases & Failure Modes

Covered: missing field, out-of-enum value, refusal by index, the migration mapping,
the pack drift pair, both INDEX hooks.

**[FINDING — Completeness] The interaction between the new field and the existing
owner check is untested.** An entry can carry a perfectly legal
`authorship: "owner-written"` and an `owner` outside the config allowlist. Today
`entryProblem` passes it on shape and the allowlist check in `acceptanceFrom` catches
it. Adding a required field to the same entry is exactly when an ordering or
short-circuit mistake would let one check mask the other, and no acceptance criterion
pins that both still fire.

**[FINDING — Security] The threat model is implied and never stated.** §5 says
`agent-transcribed` is a declaration rather than a proof, which is honest but answers
the wrong question. The unanswered one is: *what stops an agent from writing
`owner-written`?* Nothing does, and nothing can. The enum's actual security value is
narrower than the PRD lets a reader assume — it structures the honest path and turns a
concealed authorship into an affirmative false statement in a typed field. That is a
real improvement and it is defensible, but a reader who is not told this will read
`authorship` as a control. It is not one.

### 3. Maintainability & DX

The DO NOT list is specific and mostly earned from measurement rather than
imagination — the one-sided record edit, the package test over a repo-root file, the
half-wired gate.

**[WATCH] The new gate's absence assertion is phrase-shaped.** `verify:acceptance-rule`
greps for the exact prohibition sentence. A *paraphrased* prohibition added at a fifth
site passes it. The PRD mitigates this correctly by pairing the negative with positive
per-path assertions, so deleting the rule fails as loudly as contradicting it — but the
residual (a reworded prohibition at a new site) is undetected and should be named
rather than left for a future reader to discover.

### 4. Migration & Rollback

**[FINDING — Migration, confirmed against the code] Reverting this change breaks the
store.** `entryProblem` refuses any entry carrying a key outside `ENTRY_FIELDS`
(`packages/provegate/src/core/run/acceptance.ts:86`, `unexpected field "..."`). After
this PRD lands, every entry carries `authorship`. Reverting the commit restores a
validator that rejects all sixteen of them — so the store that authorizes every
operator-gated close becomes unreadable, and the failure surfaces at the next merge
gate rather than at the revert. The PRD has no §7 rollback subsection at all. The undo
is "revert the code and the store together, or strip the field", and that has to be
written down before Phase 4, not discovered during it.

**[FINDING — Migration] The intra-phase ordering constraint is unstated.** FR-1 makes
the field required and FR-3 migrates the store. The PRD says "in the same change" in
FR-1's prose, which is not the same as telling Phase 4 that these may not land as two
commits: a commit that requires the field before the migration lands leaves every
`gate` invocation in the repository — including the ones running the new tests — reading
a store its own validator refuses.

### 5. Memory Inputs

Six declared, and the two the lint demanded were added with reasoned
`not-applicable` dispositions rather than boilerplate. Challenged:

- `operator-acceptance-no-self-accept` (applied) — correct and load-bearing. The PRD
  amends rather than contradicts, and FR-6 carries it to both homes.
- `a-rule-corrected-survives-where-it-is-restated` (applied) — this is the input that
  changed the work. It is why FR-4 and FR-6 enumerate paths instead of describing an
  intent, and the sweep it forced is what found the four shipped sites.
- `turbo-cache-masks-out-of-input-reads` (applied) — correct, and it produced the
  FR-4/FR-5 split rather than merely being cited.
- `two-parsers-wrong-together` (applied) — **the weakest of the six.** It is cited to
  justify an instruction to the implementer, and the finding above shows the
  instruction was unnecessary: both paths already reach one validator. The record
  still applies to the `entryProblem` / `validAcceptance` pair, but for a different
  and smaller reason than the PRD gives.
- `strictness-added-during-extraction-is-a-behavior-change` (reviewed) — fair. Added
  strictness is the point here, and the disposition says so.
- `push-is-human-by-omission` (reviewed) — correct to include. Loosening one
  human-action rule invites reading it as precedent for the sibling, and §5 forecloses
  that explicitly.
- `evidence-pattern-satisfied-by-the-template` (reviewed) — apt. `method` was the
  free-text version of this idea and eight honest answers in it changed nothing.

No active record whose watch overlaps a declared target is missing from the inputs.

---

## Round 2 — what the fixes actually closed

Every gap from round 1 was a written addition to an existing section, and each was
checked against the code rather than against the PRD's own prose.

- **Closed, and it is the round's most valuable output.** §7 now carries a Migration &
  Rollback subsection naming both the ordering constraint (validator and migration are
  one commit) and the revert defect, with the undo written as a procedure. Two
  acceptance criteria back it.
- **Closed.** §5 states the threat model in the words a reader needs: nothing stops an
  agent from writing `owner-written`, nothing can, and `authorship` is a record rather
  than an enforcement. The PRD no longer lets the field be mistaken for a control.
- **Closed, and better than asked.** Three deny tests are named in the cap's greppable
  format with actual test names, and the PRD specifies that they drive `operatorGateOk`
  with a record carrying operator rows rather than asserting on `entryProblem` — a
  shape test would have satisfied the cap's letter while testing the validator instead
  of the authorization path.
- **Closed.** The `loadAcceptance` claim is replaced with what measurement shows, and
  the `two-parsers-wrong-together` disposition is narrowed to the risk that survives:
  `validAcceptance` must not grow a third opinion about the field.
- **Closed.** The allowlist-interaction criterion pins that neither check masks the
  other.
- **Closed.** The gate's phrase-matching residual is recorded in FR-5 itself.

Nothing about the PRD's shape moved: eight FRs, the same targets, the same Conflict
Surface. That is the expected signature of a round whose findings were all gaps in
what was written rather than errors in what was decided.

---

## Scorecard

Class: `feature` — the six-dimension formula, no waived dimensions.

| #         | Dimension                | Weight | Score       | Notes                                                                                                                              |
| --------- | ------------------------ | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1         | Clarity                  | 15%    | 9/10        | Targets, commands, DO NOT, empty Open Questions, lint clean, and the stale unknown is gone. Held at 9: §7 now carries four subsections a new reader must hold at once |
| 2         | Completeness             | 20%    | 8/10        | Rollback and allowlist-interaction criteria added. An ambiguous future `method` value has a DO NOT but no operational definition of refusing it |
| 3         | Technical Depth          | 25%    | 8/10        | The sweep, the cache-key split and the ledger pair are strong, and the `loadAcceptance` claim is now measured rather than asserted   |
| 4         | Multi-Tenancy & Security | 20%    | 8/10        | Threat model stated without overclaiming; three refusal-path deny tests named. The residual control is social, disclosed as such      |
| 5         | Scope & Testability      | 10%    | 9/10        | Six explicit non-goals, concrete success metrics, per-FR test scenarios                                                             |
| 6         | Migration & Rollback     | 10%    | 8/10        | Ordering, defect and undo all written, with criteria. No runnable §11 row exercises the revert — it is a git-level property          |
| **Total** | **Weighted**             |        | **8.25/10** | **PASS**                                                                                                                           |

Arithmetic: 9(0.15) + 8(0.20) + 8(0.25) + 8(0.20) + 9(0.10) + 8(0.10)
= 1.35 + 1.60 + 2.00 + 1.60 + 0.90 + 0.80 = **8.25**

### Hard Caps

| Cap      | Status                                                                                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security | **CLEAR** — three deny tests named in the greppable format with test names, and each exercises the refusal path through `operatorGateOk` rather than the validator alone |
| Contract | N/A — no new client→server payload                                                                                                                              |
| Lint     | clear — `gate check PRD-033` passes                                                                                                                             |

---

## Watch Items (carried into Phases 4–6)

Band 8–8.9 proceeds with minor notes flagged rather than fixed. These are those notes.

1. **The revert is asserted, not exercised.** The rollback criterion has no runnable
   §11 row, because "reverting this commit restores a store its validator accepts" is a
   git-level property and a test that reconstructs it would prove less than reading it.
   Phase 5 should record it as evidence — check out the revert, run the validator,
   paste the result — rather than leave it as prose.
2. **The new gate's negative half matches a phrase.** A paraphrased prohibition
   introduced at a fifth site passes `verify:acceptance-rule`. The positive per-path
   assertions bound this; the residual is real and recorded in FR-5.
3. **`authorship` is a record, not an enforcement.** A false `owner-written` is
   undetectable by construction. Disclosed in §5 by design, and named here so Phase 6
   does not report it as a discovery.
4. **An ambiguous future `method` value has no operational refusal.** §12 says an
   ambiguous entry is a reason to refuse rather than guess, but nothing says what
   refusing means — the migration is one-time, so this only bites a future hand-edit.
5. **Self-scored.** See the Verdict.

---

## Missing Pieces (to reach 10/10)

1. **Add a rollback subsection to §7.** Name the failure explicitly: after this lands,
   reverting the code alone leaves sixteen entries carrying a field the restored
   validator refuses as `unexpected field`. State the undo — revert the code and the
   store as one, or strip the field — and add an acceptance criterion for it.
2. **State the intra-phase ordering constraint.** The validator change and the store
   migration land in one commit; a repository between them cannot read its own
   acceptance store.
3. **State the threat model in §5.** `authorship` structures the honest path and makes
   a concealed authorship an affirmative false statement. It does not prevent one, and
   nothing can. Say so, so no reader mistakes it for a control.
4. **Name the deny test properly.** The cap's format is
   `Deny test: \`path/to/x.test.ts\` — <test name>`. Supply the actual test name, and
   make it a test that exercises the refusal path rather than the shape.
5. **Add the interaction acceptance criterion.** A legal `authorship` with an
   out-of-allowlist `owner` must still be refused, and by the allowlist check — one
   check must not mask the other.
6. **Correct §7's `loadAcceptance` claim** to what measurement shows: both paths reach
   `entryProblem`; the fallback branch discards `problem`, so the difference is
   diagnostic quality, not enforcement. Adjust the `two-parsers-wrong-together`
   disposition to match the smaller, real reason.

---

## Iteration History

| #   | Date       | Score   | Verdict | Key Changes                                                                                                                                                        |
| --- | ---------- | ------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2026-07-27 | 6.85/10 | ITERATE | Initial self-scored round. Six gaps; one confirmed rollback defect                                                                                                 |
| 2   | 2026-07-27 | 8.25/10 | PASS    | All six closed: §7 Migration & Rollback subsection, §5 threat model, three named refusal-path deny tests, two acceptance criteria, the corrected `loadAcceptance` claim, the gate residual. Security cap cleared. No FR, target or Conflict Surface path changed |

---

## Project-Specific Checklist

- [x] Value header present and its arithmetic holds — enforced by `gate check` from id 17
- [x] `Autonomous Close` is `operator-gated`, and this PRD does produce operator rows
- [x] Conflict Surface declares no `sharedAppendOnly` path — `package.json`,
      `README.md` and `_brain/INDEX.md` are correctly absent
- [x] Memory Outputs and Durable Artifacts agree, path for path
- [x] No §11 command carries a pipe character or a shell metacharacter
- [x] Every FR maps to at least one §11 row
- [x] Deny test named in the cap's greppable format with an actual test name — three of them
- [x] Rollback plan written — §7, with two acceptance criteria

---

## Verdict

**PASS — 8.25/10.**

Band 8–8.9 prescribes: proceed, with the minor notes flagged as watch items rather than
fixed. The five watch items are listed above and carried into Phases 4–6. Ready for
Phase 3.

Two things are worth naming plainly rather than leaving in the scorecard.

**This is a self-scored assessment.** The agent that wrote the PRD scored it, at the
owner's explicit direction, and the known cost is that an author's blind spot is also
the scorer's — a round like this cannot certify its own independence, and should not be
read as if it had. What it can offer is evidence that it was not ceremonial, and the
evidence here is that round 1's two hardest findings were against the author's own
text: a risk the PRD asserted that reading three functions dissolved, and a rollback
path the PRD never considered and `acceptance.ts:86` confirms is broken. Neither was
reachable by agreeing with the document. The 6.85 was also an honest band call — it sat
below PASS and the prescribed action was applied rather than negotiated, which is the
failure mode `score-band-prescribes-the-action` exists to name.

**The security dimension is where the weight is.** This PRD's subject *is* the
authorization artifact for every operator-gated close, on a 20% dimension. It reaches
8/10 not by adding a control — no control is available, and §5 now says so — but by
refusing to overclaim, naming three refusal-path tests, and pinning that the new field
and the identity check cannot mask each other. A reader who wants one number from this
report should take that one.
