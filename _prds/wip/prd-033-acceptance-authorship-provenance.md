# PRD-033: Acceptance Authorship Provenance

> **Status**: Draft
>
> **Created**: 2026-07-27
> **Updated**: 2026-07-27
> **Author**: owner
> **Audience**: Implementing Agent
> **Slug**: `acceptance-authorship-provenance`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Value**: 3.50 (MF/UI/TL/AR/RM: 4/4/3/3/3)
> **Autonomous Close**: operator-gated

<!-- Value rationale. MF 4: it makes the method's own statement about itself true and
machine-checked, which is method fidelity of the highest kind — held back from 5 because
it deliberately diverges METHOD.md and the practices template from the source snapshot,
recorded in ADR-0003. UI 4: no new capability, but every operator-gated close in every
adopting repository passes through this field, and the present state costs a stop-and-
relitigate each time. TL 3: closes a standing deferral and removes recurring session
friction; unblocks no roadmap item. AR 3: the shipped template and METHOD.md become
truthful, which is a modest docs/DX gain. RM 3: adding a required field to the store the
merge gate reads is a real regression surface — the enum landing on one validation path
and not the other, or a missed entry, breaks closes — bounded to sixteen entries in one
file and fully tested. -->

<!-- Autonomous Close declares whether the gated close may run without a human stop:
- `eligible` — every verification is machine-checkable; NO operator-owned rows exist.
- `operator-gated` — human/runtime/staging verification exists. The runner's merge gate
  refuses until an owner-signed acceptance entry exists (METHOD.md → Operator acceptance).
Any PRD that produces operator-owned task rows MUST be operator-gated. -->

---

## 1. Introduction / Overview

The method states in four places that an agent never writes the acceptance store.
That statement has been false in this repository since PRD-016. Of the sixteen
entries in `_state/acceptances.json`, eight record an owner typing at a terminal
(`method: "interactive"`) and eight record an agent transcribing an owner's
in-session decision — in four different ad-hoc phrasings:

| `method` text                                                            | count |
| ------------------------------------------------------------------------ | ----- |
| `interactive`                                                            | 8     |
| `agent-directed by owner in chat; not an interactive owner confirmation` | 6     |
| `owner chat directive (recorded by agent at explicit owner instruction)` | 1     |
| `interactive (owner-directed, agent-transcribed)`                        | 1     |

Every one of those eight agents recorded its own authorship honestly. It went
into `method`, the one entry field with no enumeration — so nothing can read it.
`entryProblem` requires `method` to be a non-empty string; `validAcceptance`
does not look at it at all. An owner-typed entry and an agent-typed entry are
byte-indistinguishable to every gate in the runner.

This PRD does not loosen the invariant. The invariant is already gone, and has
been for nine work items. It replaces a documented prohibition nobody follows
with a structural record everybody must fill in: a required, enumerated
`authorship` field that says who typed, beside the existing `owner` field that
says who decided.

**The rule after this PRD:** an agent MAY write the acceptance store, only on
explicit in-session owner direction, and only with `authorship:
"agent-transcribed"`. `owner` continues to name the identity that decided — never
the identity that typed. An agent still never *originates* an acceptance, and
`operator-acceptance-no-self-accept` survives intact: transcribing an owner's
decision is not self-accepting.

## 2. Goals

### Primary Goals

1. Make acceptance authorship a machine-readable field instead of prose in a
   free-text column.
2. Make the documented rule match what the runner actually permits, in every
   place the rule is stated — including the two shipped copies a repo-only edit
   would miss.
3. Make an agent-transcribed acceptance visible at the moment of close, not only
   on a later read of the JSON.

### Success Metrics

- Every entry in the store carries `authorship`, and the validator refuses a
  store where one does not.
- `grep`ping the repository for the old prohibition returns only historical
  artifacts (`_prds/completed/**`, `_tasks/completed/**`, `_readiness/completed/**`),
  which record what was true when written and are never rewritten.
- `pnpm verify:pack-drift` reconciles after the record edits: the packed twin and
  the live copy carry the same content and the same hash pair.

---

## 3. User Stories

#### User Story 1

**As** the owner, **I want** to tell an agent "record the acceptance" without the
session stopping to relitigate whether that is allowed, **so that** a decision I
have already made does not cost a round trip every close.

#### User Story 2

**As** a reviewer reading a closed work item months later, **I want** to know
whether a human typed the acceptance or an agent transcribed it, **so that** I
can weigh the entry without reverse-engineering a prose sentence that four
different agents phrased four different ways.

#### User Story 3

**As** an auditor of this method, **I want** the count of agent-transcribed
acceptances to be queryable, **so that** drift between the documented rule and
practice surfaces as a number rather than as an archaeology exercise.

---

## 4. Functional Requirements

1. **FR-1**: `authorship` becomes a required entry field in the published schema,
   enumerated to exactly `owner-written` and `agent-transcribed`. `schemaVersion`
   stays `1`: no released version has consumers, and the single store in
   existence is migrated by FR-3 in the same change. The field's description
   states that `owner` names who decided and `authorship` names who typed.
   - **Targets:** `packages/provegate/schemas/acceptances.schema.json`
2. **FR-2**: The runtime validator enforces the field. `authorship` joins
   `ENTRY_FIELDS`, and `entryProblem` refuses a missing field and any value
   outside the enum, naming both legal values in the message. `AcceptanceEntry`
   gains the field as a union type, never `string`. The refusal is reported by
   index like every other entry problem, so a store with one bad entry names
   which one.
   - **Targets:** `packages/provegate/src/core/run/acceptance.ts::AcceptanceEntry`,
     `packages/provegate/src/core/run/acceptance.ts::ENTRY_FIELDS`,
     `packages/provegate/src/core/run/acceptance.ts::entryProblem`
3. **FR-3**: The sixteen existing entries are migrated in the same change that
   makes the field required. The mapping is derived from the existing `method`
   text, not invented: `method === "interactive"` → `owner-written` (8 entries);
   every other phrasing → `agent-transcribed` (8 entries). Each entry's `method`
   string is left byte-identical — the migration adds a field, it never rewrites
   what a past close recorded.
   - **Targets:** `_state/acceptances.json`
4. **FR-4**: The prose rule changes wherever it is stated as a prohibition. Four
   sites, two of them shipped to consumers:
   - `AGENT_BOOTSTRAP.md` — the stop-and-ask row
   - `AGENT_BOOTSTRAP.md` — the critical-rules restatement near the end
   - `packages/provegate/METHOD.md` — "Operator acceptance"
   - `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md` — the
     shipped stop-and-ask row
     Each becomes the rule in §1: permitted, only on explicit in-session owner
     direction, only with `authorship: "agent-transcribed"`, with `owner` still
     naming the deciding identity. `packages/provegate/prompts/phase-6-final-auditing.md`
     is a pointer to METHOD.md and is verified to still read correctly after the
     change — it is edited only if it restates the prohibition rather than
     pointing at it.
   - **Targets:** `AGENT_BOOTSTRAP.md`, `packages/provegate/METHOD.md`,
     `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`,
     `packages/provegate/prompts/phase-6-final-auditing.md`
5. **FR-5**: One new cache-free gate holds FR-3 and FR-4 as ongoing properties.
   `verify:acceptance-rule` asserts, from the repository root: the exact
   prohibition sentence appears in no live document (the three completed-artifact
   directories are excluded, they record what was true when written); each of the
   four sites in FR-4 carries the new rule's required tokens, addressed by
   explicit path so deleting the rule fails as loudly as contradicting it; and
   every entry in the store carries a legal `authorship`. It is wired the way
   every gate here is — a `verify:*` key, a `CHECKS` entry, a manifest row —
   because `verify:gates-wired` refuses an on-disk check that is not registered.
   Its known residual: the negative half matches a phrase, so a *paraphrased*
   prohibition introduced at a fifth site passes. The positive per-path
   assertions are what bound this — deleting the rule from a named site fails as
   loudly as contradicting it — and the residual is recorded here rather than
   left for a later reader to find.
   - **Targets:** `scripts/verify/verify-acceptance-rule.mjs`, `package.json`,
     `scripts/verify/verify-workflow.mjs::CHECKS`, `gates.manifest.json`
6. **FR-6**: The memory record is amended in both of its homes, and the drift
   ledger reconciles. `operator-acceptance-no-self-accept` keeps its rule — an
   agent never self-accepts — and gains the distinction that makes it survivable:
   transcribing an owner's decision, recorded as such, is not self-accepting.
   Both the live copy and the packed twin change identically, both INDEX hooks
   follow, and both hashes in the pack drift ledger are updated.
   - **Targets:** `_brain/learnings/operator-acceptance-no-self-accept.md`,
     `packages/provegate/practices/brain/learnings/operator-acceptance-no-self-accept.md`,
     `packages/provegate/practices/brain/INDEX.md`,
     `scripts/verify/pack-drift-ledger.json`
7. **FR-7**: The close names the authorship. `operatorGateOk`'s waived result
   already prints the deciding owner; it additionally prints the authorship, so a
   run that closes on an agent-transcribed acceptance says so in the handoff card
   rather than only in the JSON.
   - **Targets:** `packages/provegate/src/core/run/acceptance.ts::operatorGateOk`,
     `packages/provegate/src/core/run/acceptance.ts::OperatorGateResult`
8. **FR-8**: ADR-0003 records the decision and the deliberate divergence.
   `METHOD.md` and the practices template are method content, which critical rule
   4 requires to be traceable to the source snapshot; this change diverges from
   it on purpose, and the ADR is where that becomes traceable.
   - **Targets:** `_brain/adr/ADR-0003-acceptance-authorship.md`

---

## 5. Non-Goals (Out of Scope)

- **Verifying that the owner actually said it.** No field can prove an
  in-session directive happened. `agent-transcribed` is a declaration, not a
  proof.

  Stated plainly, because a reader who is not told this will mistake the field
  for a control: **nothing stops an agent from writing `owner-written`.** Nothing
  can — the agent holds the pen either way, and no gate the runner could add
  would know the difference. What the field buys is narrower and still worth
  having. It structures the honest path, so authorship stops depending on four
  agents inventing four phrasings of the same sentence; it makes drift countable,
  so "how many closes were agent-transcribed" becomes a query instead of an
  archaeology exercise; and it converts a concealed authorship from an
  unreadable ambiguity into an affirmative false statement in a typed field,
  which review and audit can catch. `authorship` is a record, not an
  enforcement.
- **Changing who may be an `owner`.** The allowlist stays config, roles stay
  roles, and `validAcceptance` keeps checking membership.
- **Touching the push rule.** `push-is-human-by-omission` is a different
  invariant with no code path to weaken, and this PRD adds nothing to it.
- **Rewriting historical artifacts.** Completed PRDs, task files and readiness
  reports that quote the old prohibition record what was true when written.
- **A `--yes`-style CLI flag for writing acceptances.** Recording stays a manual
  edit; this PRD types the record, it does not automate producing one.
- **Bumping `schemaVersion` or shipping a migration path.** See FR-1.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** an acceptance entry with no `authorship` field, **When** the merge
  gate validates the store, **Then** it refuses by index and names both legal
  values.
- **Given** an entry with `authorship: "owner"` or any other non-enum value,
  **When** the store is validated, **Then** it is refused with the same message.
- **Given** the migrated store, **When** every entry is validated, **Then** all
  sixteen pass and no `method` string differs from its pre-migration bytes.
- **Given** a close whose acceptance carries `authorship: "agent-transcribed"`,
  **When** the operator gate waives the rows, **Then** the printed reason names
  both the deciding owner and the authorship.
- **Given** the repository after this PRD, **When** the prohibition is grepped
  for outside `_prds/completed/**`, `_tasks/completed/**` and
  `_readiness/completed/**`, **Then** nothing matches.
- **Given** the amended memory record, **When** `pnpm verify:pack-drift` runs,
  **Then** the live copy and the packed twin reconcile with no orphan and no
  lost copy.
- **Given** an entry carrying a legal `authorship` and an `owner` outside the
  configured allowlist, **When** the store is validated, **Then** it is refused
  **by the allowlist check** — the new field must not short-circuit the identity
  check, and the identity check must not mask a missing field.
- **Given** the change reverted as one unit, **When** the restored validator
  reads the restored store, **Then** all sixteen entries validate — the revert
  carries the migration with it, and the store is never left carrying a field its
  validator refuses.

---

## 7. Technical Considerations

### Architecture

**Two shape checks over one input, and the difference is diagnostic.** `entryProblem`
(structural, runs over every entry) and `validAcceptance` (semantic, runs over the
selected entry) both decide what a valid acceptance is. Both branches of
`operatorGateOk` reach `entryProblem`: the `readCommitted` branch through
`acceptanceFrom` directly, the fallback branch through `loadAcceptance` →
`loadAcceptanceChecked` → `acceptanceFrom`. The enum is therefore enforced on
both paths by construction. What differs is that `loadAcceptance` discards
`problem` and returns `.entry` alone, so on the fallback path a schema-invalid
store fails through `validAcceptance(null)` with a generic reason instead of the
specific one — a worse message, not a weaker gate. The `two-parsers-wrong-together`
risk that remains is the narrow one: `validAcceptance` re-checks `owner`, `items`
and `reason` and must not grow a third opinion about `authorship`. It has no
business knowing about the field.

**This PRD's own close is the first consumer.** The PRD is `operator-gated`, so
its close needs an acceptance, and at merge time the new validator is on the
branch — the entry authorizing this work item must itself carry `authorship`. If
an agent transcribes it at the owner's direction, it carries
`agent-transcribed`, which is the change working on the first entry it governs.

**A repo-root file cannot be held by a package test.** `provegate#test` hashes
package files; `AGENT_BOOTSTRAP.md` and the store live outside the package, so a
package test asserting on them can replay a cached pass over a change it never
saw — the `turbo-cache-masks-out-of-input-reads` shape, and the subject of the
open `Frozen-snapshot digest` deferral, which names this exact hole and asks for
a cache-free `scripts/verify/` gate. `content-canon.test.ts` already reads the
root bootstrap this way. FR-4 and FR-5 therefore split by where the file lives
rather than by what is being asserted: the two shipped sites are package files
and stay in a package test; the root sites and the store go in the cache-free
gate. Extending the existing package test to cover the root files would look
like more coverage and be less.

**The rule is stated in eight places, not four.** Four are prose rules (FR-4),
four are the record and its shipped twin plus both INDEX hooks (FR-5). A repo-only
sweep leaves `packages/provegate/practices/**` stating the old rule to every
consumer who installs the pack, and `verify:pack-drift` fails on the hash pair.
This is exactly the defect `a-rule-corrected-survives-where-it-is-restated`
describes.

### Migration & Rollback

**The migration and the validator are one commit, not two.** FR-1 makes the field
required and FR-3 fills it in. A commit that lands the first without the second
leaves every `gate` invocation in the repository — including the ones running this
PRD's own tests — reading a store its own validator refuses. They land together
or not at all.

**Reverting the code alone breaks the store.** `entryProblem` refuses any entry
carrying a key outside `ENTRY_FIELDS`
(`packages/provegate/src/core/run/acceptance.ts:86`, `unexpected field "..."`).
After this lands, all sixteen entries carry `authorship`; a plain revert of the
commit restores a validator that rejects every one of them, and the store that
authorizes every operator-gated close becomes unreadable. The failure would not
surface at the revert — it would surface at the next merge gate, on unrelated
work.

The undo is therefore **revert the code and the store as one unit**: the same
commit is reverted whole, which restores both the validator and the pre-migration
entries, because FR-3 puts them in that commit. If the field must be removed
without reverting — a partial rollback — the sixteen `authorship` keys must be
stripped in the same change. This is written down here because a rollback plan
discovered during an incident is not a rollback plan.

### Dependencies

None. `packages/provegate` takes zero runtime dependencies.

---

## 8. Implementation Scope

### In Scope

- The schema field, the runtime enum check, and the type.
- The one-time migration of the sixteen entries in this repository's store.
- The four prose rule statements and the four record/index/ledger sites.
- One new cache-free gate, `verify:acceptance-rule`, wired on every surface.
- The waived-reason string in `operatorGateOk`.
- ADR-0003 and one learning record.
- Tests in `packages/provegate/test/acceptance.test.ts` and a case in
  `packages/provegate/test/content-canon.test.ts`.

### Out of Scope

Everything in §5.

---

## 9. Open Questions

None.

---

## 10. References

- `packages/provegate/src/core/run/acceptance.ts` — the validator and the gate
- `packages/provegate/schemas/acceptances.schema.json` — the documented shape
- `_state/acceptances.json` — the store being migrated
- `STATUS.md` — the standing `Acceptance authorship rule` deferral this PRD closes
- `_brain/adr/ADR-0001-closed-loop-agent-memory.md` — ADR house style

---

## Memory Inputs

- applied: `operator-acceptance-no-self-accept` — this PRD amends the record
  rather than contradicting it. The record's rule (an agent never self-accepts)
  stays; what changes is that transcription at owner direction is named as
  distinct from self-acceptance, in both the live copy and the packed twin.
- applied: `a-rule-corrected-survives-where-it-is-restated` — the reason FR-4 and
  FR-5 enumerate sites rather than describing a change. The repo-only sweep found
  four; the full sweep found eight, and the four it added are the shipped ones a
  consumer would receive.
- applied: `turbo-cache-masks-out-of-input-reads` — the reason FR-4 and FR-5
  split by where the file lives rather than by what is asserted. Putting the
  root-file and store assertions in the package test that already reads the root
  bootstrap would inherit a cached-replay hole this repository already has an
  open deferral for.
- applied: `two-parsers-wrong-together` — `entryProblem` and `validAcceptance`
  are two definitions of a valid acceptance over one input. Measurement narrowed
  what this record buys here: both gate branches already reach `entryProblem`, so
  the enum cannot land on one path and miss the other. What survives is the
  smaller rule §7 now states — `validAcceptance` must not grow a third opinion
  about `authorship`, because a second checker that agrees today is a second
  authority that has not disagreed yet.
- not-applicable: `shipped-content-needs-a-delivery-gate` — its watch covers
  `packages/provegate/prompts/**` and FR-4 declares the phase-6 prompt as a
  target. The record is about content that ships and never installs; this PRD
  neither adds nor removes a delivered file, and touches that prompt at most to
  confirm it points at METHOD.md rather than restating the rule. Delivery is
  unchanged, so the record's gate has nothing to hold here.
- not-applicable: `adr-section-blank-line-reads-empty` — its watch covers
  `_brain/adr/**` and FR-8 writes ADR-0003 there. The defect it names is a live
  parser bug with its own open deferral, not a constraint on this PRD's content:
  the ADR is authored without a blank line after a section heading, exactly as
  ADR-0001 and ADR-0002 already are. Fixing the parser is that deferral's work,
  not this one's.
- reviewed: `strictness-added-during-extraction-is-a-behavior-change` — adding a
  required field is added strictness by definition. Here it is the point rather
  than a side effect, and the store it would break is migrated in the same
  change; recorded so the reviewer sees it was weighed.
- reviewed: `push-is-human-by-omission` — the sibling human-action rule, linked
  from the record being amended. It is untouched, and §5 says so explicitly so
  that loosening one is not read as precedent for the other.
- reviewed: `evidence-pattern-satisfied-by-the-template` — a gate that requires
  an artifact to *say* something can be satisfied by boilerplate. `authorship` is
  enumerated rather than free text precisely because `method` was the free-text
  version of the same idea and eight honest answers in it changed nothing.

## Memory Outputs

- learning: `_brain/learnings/free-text-field-is-the-unread-drift-ledger.md` —
  when a rule is enforced only by documentation, the free-text field beside it
  becomes where the violations get honestly recorded and nobody reads them;
  enumerate the field and the drift becomes countable.
- adr: `_brain/adr/ADR-0003-acceptance-authorship.md` — acceptance authorship
  becomes structural; `owner` records who decided, `authorship` records who
  typed; the deliberate divergence of `METHOD.md` and the practices template from
  the source snapshot.

---

## Conflict Surface

- `packages/provegate/src/core/run/acceptance.ts`
- `packages/provegate/schemas/acceptances.schema.json`
- `packages/provegate/test/acceptance.test.ts`
- `packages/provegate/test/content-canon.test.ts`
- `scripts/verify/verify-acceptance-rule.mjs`
- `scripts/verify/verify-workflow.mjs`
- `gates.manifest.json`
- `packages/provegate/METHOD.md`
- `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`
- `packages/provegate/practices/brain/learnings/operator-acceptance-no-self-accept.md`
- `packages/provegate/practices/brain/INDEX.md`
- `_brain/learnings/operator-acceptance-no-self-accept.md`
- `_brain/learnings/free-text-field-is-the-unread-drift-ledger.md`
- `_brain/adr/ADR-0003-acceptance-authorship.md`
- `_state/acceptances.json`
- `scripts/verify/pack-drift-ledger.json`
- `AGENT_BOOTSTRAP.md`

---

## Durable Artifacts

- ADR: `_brain/adr/ADR-0003-acceptance-authorship.md` — authorship becomes structural; who decided and who typed are two fields; the deliberate method-content divergence
- `_brain/learnings/free-text-field-is-the-unread-drift-ledger.md` — a rule enforced only by documentation drifts into the unenumerated field beside it
- `_brain/INDEX.md` — one pointer line per record above, per the memory protocol
- `_docs/reviews/review-033-acceptance-authorship-provenance.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                             | Scope | Notes                                                                                                                    |
| ---- | ----------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------ |
| FR-1 | `pnpm --filter provegate test test/acceptance.test.ts`      | pkg   | the schema names the authorship field in its required list and enumerates exactly the two values; no third value is documented |
| FR-2 | `pnpm --filter provegate test test/acceptance.test.ts`      | pkg   | a missing field and an out-of-enum value are each refused by index, and the message names both legal values               |
| FR-2 | `pnpm check-types`                                          | repo  | the entry type declares authorship as a union of the two literals, not as a string — assigning an arbitrary string fails to compile |
| FR-3 | `pnpm --filter provegate test test/acceptance.test.ts`      | pkg   | the mapping over a fixture of the pre-migration store: the exact interactive value maps to owner-written, every other phrasing to agent-transcribed, and no method string changes |
| FR-4 | `pnpm --filter provegate test test/content-canon.test.ts`   | pkg   | the two SHIPPED sites carry the new rule; both are package files, so this half sits inside the cache key |
| FR-5 | `pnpm verify:acceptance-rule`                               | repo  | cache-free: the prohibition is absent from every live document, each of the four sites carries the rule by explicit path, and every store entry carries a legal authorship value |
| FR-5 | `pnpm verify:gates-wired`                                   | repo  | the new check is registered on every wiring surface — no on-disk check unregistered, no registered check unwired |
| FR-6 | `pnpm verify:pack-drift`                                    | repo  | the amended record reconciles on both sides with no orphan packed file and no lost live copy |
| FR-6 | `pnpm verify:brain`                                         | repo  | both INDEX hooks resolve to their records and the amended record still parses |
| FR-7 | `pnpm --filter provegate test test/acceptance.test.ts`      | pkg   | the waived reason names the deciding owner and the authorship, on both the committed and the fallback path |
| FR-8 | `pnpm verify:brain`                                         | repo  | ADR-0003 parses with non-empty required sections and is indexed |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/acceptance.test.ts` — `the operator gate refuses a store whose entry carries an unknown authorship value`
- Deny test: `packages/provegate/test/acceptance.test.ts` — `the operator gate refuses a store whose entry omits authorship, naming both legal values`
- Deny test: `packages/provegate/test/acceptance.test.ts` — `a legal authorship does not admit an owner outside the allowlist`

  These are refusal-path tests, not shape tests: each drives `operatorGateOk`
  with a record carrying operator rows and asserts the gate returns `ok: false`
  with the naming reason. Asserting that `entryProblem` returns a string would
  test the validator without testing that the authorization path consults it.
  Each must fail the whole store rather than the selected entry alone.

---

## 12. DO NOT (Anti-Patterns)

- **Do not rewrite any `method` string.** The migration adds a field. The prose
  in `method` is what a past close recorded and it is the evidence the mapping
  was derived from, not noise to be tidied.
- **Do not derive the mapping by hand.** It comes from the `method` text: exactly
  `interactive` is `owner-written`, everything else is `agent-transcribed`. If a
  future entry's `method` is ambiguous, that is a reason to refuse it, not to
  guess.
- **Do not teach `validAcceptance` about `authorship`.** The enum belongs to
  `entryProblem`, which both gate branches already reach. A second checker that
  agrees today is a second authority that has not disagreed yet, and this
  repository has shipped that shape twice.
- **Do not split the validator change and the store migration into two
  commits.** Between them the repository cannot read its own acceptance store.
  See §7.
- **Do not land this without the rollback written.** A revert of the code alone
  leaves sixteen entries carrying a key the restored validator refuses.
- **Do not edit the live memory record without editing the packed twin.** They
  are hash-paired in `scripts/verify/pack-drift-ledger.json`; a one-sided edit
  fails `verify:pack-drift`, and a one-sided edit with the ledger "fixed" ships
  the old rule to every consumer.
- **Do not weaken `operator-acceptance-no-self-accept` into "an agent may accept
  its own work".** Transcription requires an owner decision to transcribe. The
  record keeps its rule.
- **Do not touch `push-is-human-by-omission`, `gate push`, or add any code path
  that reaches a remote.** Loosening one human-action rule is not precedent for
  the other, and the push rule is enforced by having no code, not by a check.
- **Do not assert on `AGENT_BOOTSTRAP.md` or `_state/acceptances.json` from a
  package test.** Both are outside the package's cache key; the assertion passes
  from cache over a change it never read. They belong in the cache-free gate. See
  §7.
- **Do not leave the new gate half-wired.** A script in `scripts/verify/` with no
  `verify:*` key fails `verify:gates-wired`, and a key that no aggregate surface
  runs is a check that exists and never executes.
- **Do not declare `_brain/INDEX.md`, `package.json` or `README.md` in the
  Conflict Surface.** They are `sharedAppendOnly` in `workflow.config.json`, and
  this PRD touches `package.json` for the new `verify:*` key.
- **Do not bump `schemaVersion`.** See FR-1; if the implementing agent believes a
  bump is required, that is a Phase 2 finding, not a Phase 4 decision.

---

## Changelog

| Date       | Change                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-27 | PRD created (Phase 1)                                                                                                                     |
| 2026-07-27 | Readiness iteration 1 (6.85, ITERATE): added the §7 Migration & Rollback subsection and its two constraints; stated the threat model in §5; named three deny tests by test name; added the allowlist-interaction and revert acceptance criteria; corrected the `loadAcceptance` claim and narrowed the `two-parsers-wrong-together` disposition to what measurement supports; recorded the new gate's phrase-matching residual |
