# PRD-031: Autonomy Mode and the Phase 4–7 Proceed Rule

> **Status**: Draft
>
> <!-- Canonical lifecycle values only (see METHOD.md → Status lifecycle):
> Draft | In Review | Approved | In Progress | Code Complete | Operator Verification |
> Ship Verified | Superseded | Archived | Blocked | Deferred | Not Started. Never
> write "Completed"/"Done" — the state builder normalizes known aliases but the
> canonical value is the contract (workflow.config statusVocab.canonical). -->
>
> **Created**: 2026-07-27
> **Updated**: 2026-07-28
> **Author**: owner
> **Audience**: Implementing Agent
> **Slug**: `autonomy-mode-method-policy`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: method content and the agent entrypoint — no code path changes; the deliverable is prompt and bootstrap text plus the provenance record that authorizes it.
> **Value**: 3.55 (MF/UI/TL/AR/RM: 5/4/2/3/3)

<!-- 0.25*5 + 0.25*4 + 0.20*2 + 0.15*3 + 0.15*3
     = 1.25 + 1.00 + 0.40 + 0.45 + 0.45 = 3.55
     Re-scored at iteration 1's derivation: UI 5 and AR 4 claimed reach this PRD does
     not have — existing stores and bootstraps are explicitly not migrated (one-way
     install), so the clause reaches fresh installs and next-init renders only. 3.55
     clears the 3.40 threshold without the overstatement. -->
> **Autonomous Close**: operator-gated

<!-- Autonomous Close declares whether the gated close may run without a human stop:
- `eligible` — every verification is machine-checkable; NO operator-owned rows exist.
  The runner may close and locally merge when all gates are green (push stays human).
- `operator-gated` — human/runtime/staging verification exists. The runner's merge gate
  refuses until an owner-signed acceptance entry exists (METHOD.md → Operator acceptance).
Any PRD that produces operator-owned task rows MUST be operator-gated. -->

---

## 1. Introduction / Overview

Two rules in the shipped method work against the autonomy boundary they are supposed to
express, and both are text rather than code.

**The Phase 3 STOP rule grants its own exception to the agent.**
`prompts/phase-3-task-generator.md:92-94` says "STOP — Do not continue until the user says
'Go'. Exception: in autonomous-execution mode, document the skipped approval gate…". Who
decides whether the session is in autonomous-execution mode? Nothing does. The agent
assesses itself, and an agent that has just been asked to produce a task plan has every
reason to conclude it is autonomous. The gate is real and its exception is self-issued.

**The `AGENT_BOOTSTRAP` entrypoint states ten reasons to stop and no reason to proceed.**
Its stop-and-ask list is the only phase guidance an agent always loads, and two of its ten
entries — "out-of-scope files" and "unspecified design question" — are open-ended enough to
cover most of Phase 4. The counterweight, that Phases 4–7 run autonomously and a failed gate
is the only legitimate stop, lives in `METHOD.md` and `orchestration-runner.md`, which are
not loaded. The loaded context is asymmetric, and an agent optimizing against it correctly
decides to ask.

Together these produce the two symptoms that opened this line of work: agents skip the human
gate at Phase 3, and agents manufacture human gates during Phases 4–7. PRD-029 makes the
protocols reachable. This PRD makes the two rules say what they mean once they are read.

> **Provenance is the blocker, and it comes first.** Both edits are method content, bound by
> critical rule 4: every prompt, template and schema byte in the package must trace to the
> frozen snapshot or to a dated, owner-approved addendum beside it
> (`source-snapshot/MANIFEST.md` §addenda). The snapshot's own copy at
> `source-snapshot/prompts/phase-3-task-generator.md:80` states the exception
> **unconditionally**. Conditioning it is therefore an extension, not an implementation, and
> reading the snapshot — which was the previous draft's entire stated precondition — does not
> authorize it. FR-1 is the addendum. Nothing else in this PRD may land without it.

---

## 2. Goals

### Primary Goals

- [ ] The Phase 3 autonomy exception becomes a decision the human records in configuration,
      never one the agent grants itself.
- [ ] The entrypoint states the proceed rule as plainly as it states the stop rules.
- [ ] Every changed byte of method content traces to an owner-approved, dated addendum
      listed in the snapshot manifest.
- [ ] The two `AGENT_BOOTSTRAP` copies — this repository's and the shipped template — carry
      the same wording, held by a test.

### Success Metrics

| Metric                                                         | Current | Target | Measurement                                                     |
| ---------------------------------------------------------------- | ------- | ------ | ----------------------------------------------------------------- |
| Method-content bytes with no snapshot or addendum trace           | 0       | 0      | manual trace at review; the cap is what makes this a precondition  |
| Self-assessable exceptions to a human-gated STOP rule             | 1       | 0      | the rendered Phase 3 protocol under a human-gated configuration    |
| Proceed-rule statements in always-loaded agent context            | 0       | 1      | `AGENT_BOOTSTRAP.md` and the shipped template                      |
| Divergences between the two bootstrap copies                      | 1       | 0      | asserted by test                                                   |

---

## 3. User Stories

#### User Story 1

```
As an owner who wants Phase 3 human-gated,
I want that to be a value in my config,
so that no agent can decide on its own that this session is exempt.
```

**Acceptance Criteria:**

- [ ] The rendered Phase 3 protocol contains no self-assessable exception when the
      repository is configured human-gated.
- [ ] The exception text still renders, unchanged in meaning, when the repository is
      configured autonomous.
- [ ] The value comes from `workflow.config.json`; nothing infers it from session state.

#### User Story 2

```
As an implementing agent in Phase 4,
I want the entrypoint to tell me when to proceed as clearly as it tells me when to stop,
so that I neither skip a human gate nor manufacture one.
```

**Acceptance Criteria:**

- [ ] `AGENT_BOOTSTRAP.md` states that during Phases 4–7 the only legitimate stops are the
      enumerated stop-and-ask checkpoints and a failed gate, and that every other decision
      is recorded in the task file rather than escalated.
- [ ] The shipped `AGENT_BOOTSTRAP.template.md` carries the same clause, so adopters get it.
- [ ] A test fails when the two diverge.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1**: **Precondition FR — nothing else starts until this lands.** Write
   `source-snapshot/addenda/autonomy-mode-and-proceed-rule-2026-07-27.md`, following the
   shape Addendum A1 established: status line recording owner approval and date, scope
   naming this PRD, an explicit statement that the frozen snapshot under `../` is unchanged,
   and the extension itself in English. It must state two things the snapshot does not: that
   the Phase 3 exception is a configured value rather than a session self-assessment, and
   that the entrypoint carries an explicit proceed rule for Phases 4–7. Add its row to the
   `addenda/` table in `source-snapshot/MANIFEST.md`. The addendum is authored **by the
   owner**; an agent may draft it, and the approval is the owner's recorded act.

   **The verification is a new named assertion, because the existing one is green
   without the addendum** (iteration 1): `content-prompts.test.ts` deliberately
   excludes `MANIFEST.md` and all of `addenda/**` from the frozen-snapshot digest
   (`content-prompts.test.ts:449,472`) and hardcodes only Addendum A1 (`:460`) — so
   no current row can fail when FR-1 has not happened. The test gains an assertion
   that reads the addendum file directly (never through the digest): exact path
   exists; the status line carries owner approval and the date; the scope names
   PRD-031; the unchanged-snapshot statement is present; the manifest's addenda table
   carries its row; and the two authorized policy clauses (configured Phase 3
   exception, explicit 4–7 proceed rule) appear. Absent any part, the FR-1 row fails —
   which is what makes the ordering provable rather than asserted.
   - **Targets:** `docs/research/provegate-bootstrap/source-snapshot/addenda/autonomy-mode-and-proceed-rule-2026-07-27.md`,
     `docs/research/provegate-bootstrap/source-snapshot/MANIFEST.md`,
     `packages/provegate/test/content-prompts.test.ts`

2. **FR-2**: `prompts/phase-3-task-generator.md` replaces the self-granted exception with
   `{{AUTONOMY_MODE}}`, declared **enumerated** in the registry with legal values
   `human-gated` and `autonomous`. The two renderings ship as package fragments —
   `prompts/_fragments/AUTONOMY_MODE.human-gated.md` and
   `prompts/_fragments/AUTONOMY_MODE.autonomous.md` — and their wording is fixed by the
   addendum: the human-gated fragment states that the STOP rule has no exception and that
   this repository is configured human-gated; the autonomous fragment reproduces the
   snapshot's exception text unchanged. The adopter's config carries the **key**, never the
   prose.

   This uses PRD-029 FR-4's enumerated-token mechanism, which exists precisely so this PRD
   adds **no code target**: scalar `prompts.values` substitution cannot select a text block,
   and putting the block text into an adopter's config would move method content out of the
   package and fail provenance from the other side. Both were found at PRD-029's readiness
   iteration 2. `_fragments/` is a render **input**, not an emitted path — PRD-029 FR-2 rule
   4 — so the fragments never appear in a store.
   - **Targets:** `packages/provegate/prompts/phase-3-task-generator.md`,
     `packages/provegate/prompts/_fragments/AUTONOMY_MODE.human-gated.md`,
     `packages/provegate/prompts/_fragments/AUTONOMY_MODE.autonomous.md`,
     `packages/provegate/prompts/PLACEHOLDERS.md`,
     `packages/provegate/test/content-placeholders.test.ts`

3. **FR-3**: The shipped copy of the Phase 3 protocol is reconciled with the snapshot on the
   one point where it already silently diverges: our copy drops the snapshot's parenthetical
   `(single-session test runs, agent-led sweeps)` from the exception. Restore it inside the
   `autonomous` rendering, so that mode reproduces the snapshot's text rather than an
   abridgement of it. Found while checking FR-1's provenance; recorded rather than absorbed,
   because a divergence nobody was looking for is the interesting kind.
   - **Targets:** `packages/provegate/prompts/phase-3-task-generator.md`,
     `packages/provegate/test/content-prompts.test.ts`

4. **FR-4**: `orchestration-runner.md` states the same proceed rule for the phases it drives,
   because it is the document an agent reads when it is inside Phases 4–7 and it currently
   describes the loop without saying that asking is not part of it. Wording traces to the
   addendum.
   - **Targets:** `packages/provegate/prompts/orchestration-runner.md`

5. **FR-5**: Both `AGENT_BOOTSTRAP` copies gain the proceed rule beside the stop rules: the
   only legitimate stops during Phases 4–7 are the enumerated stop-and-ask checkpoints and a
   failed gate; every other decision is the agent's and is recorded in the task file's
   Deferrals & Decisions rather than escalated. A test asserts the two copies carry it and
   carry it identically — a rule corrected in one copy and left stale in the other is this
   repository's most frequently observed defect, and it has already happened once between
   exactly these two files.
   - **Targets:** `AGENT_BOOTSTRAP.md`,
     `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`,
     `packages/provegate/test/content-prompts.test.ts`

6. **FR-6**: `{{AUTONOMY_MODE}}` is registered in `PLACEHOLDERS.md` using the enumerated
   column PRD-029 FR-4 adds: its meaning, its two legal values, and no `workflow.config`
   field mapping, because the value is supplied through `prompts.values` as a key.

   **The corpus-test surface moves with it, and the exact moves are specified here**
   (iteration 1's decisive finding — the first enumerated token in the registry cannot
   leave these expectations standing):

   - `content-placeholders.test.ts:96` — the registry-row count moves 20 → 21;
   - `:103` — the zero-enumerations assertion becomes: exactly one enumerated token,
     `AUTONOMY_MODE`, with legal values `human-gated` and `autonomous`;
   - `:107` — the required-value census follows the rendered corpus (the count moves
     with the token's arrival in a rendered consumer);
   - `:158` — the clean-render fixture supplies a **legal** enumerated value
     (`human-gated`) for this token instead of the generic `x` the renderer rejects
     for an enumeration (`prompts.ts:595`).

   **Enumeration coverage is mutation-checked, not asserted once** (iteration 1 found
   the claimed missing-fragment package test does not exist — the live corpus asserts
   zero enumerations): the corpus test gains assertions that every declared legal value
   has its exact fragment file; both legal modes render and their outputs carry the
   mode's fragment text; an illegal key is refused at render (`prompts.ts:605` is the
   renderer half — the test half is new); and a missing-fragment case is exercised
   against a temp copy of the corpus with one fragment removed, proving the failure
   fires rather than trusting that it would. Fragment terminality stays green.

   Because PRD-029 derives the required-value set from the **rendered corpus**, adding
   this token makes it required for every adopter **the next time they run
   `gate init --prompts`** — not from the moment this PRD lands. The consequence for
   PRD-032 stands: it must derive its own value set rather than hardcoding a count.
   - **Targets:** `packages/provegate/prompts/PLACEHOLDERS.md`,
     `packages/provegate/test/content-placeholders.test.ts`

---

## 5. Non-Goals (Out of Scope)

- **Delivering the protocols to agents.** PRD-029. This PRD changes what the protocols say;
  it does not change how they arrive. Without PRD-029 the edits are correct and still unread.
- **A machine-checkable "Go" gate.** Recording the human's approval as state and refusing a
  task file without it is state-and-gate work and belongs in its own item. This PRD removes
  the self-issued exception; it does not add enforcement.
- **Changing the stop-and-ask checkpoint list.** The ten entries stay as they are. The
  asymmetry is fixed by adding the proceed rule, not by removing stops.
- **Any production code path.** No file under `packages/provegate/src/**` is targeted —
  `{{AUTONOMY_MODE}}` travels through `prompts.values` precisely so no config key or
  renderer change is needed. **Test files are not exempt and never were honestly:**
  the corpus tests hardcode the registry's shape (20 rows, zero enumerations, nine
  required values, an `x`-for-every-token fixture — `content-placeholders.test.ts:96,
  103,107,158`), so the first enumerated token necessarily moves them. Iteration 1
  caught the earlier absolute wording as a self-contradiction; the boundary is
  production code, and the test-side changes are specified in FR-6 rather than
  forbidden by a rule the FRs cannot satisfy.
- **Migrating adopters who already have an `AGENT_BOOTSTRAP.md`.** `gate init` never
  overwrites, so FR-5's clause reaches fresh installs only. Stated rather than discovered.
- **Auditing the rest of the shipped corpus against the snapshot.** FR-3 fixes the one
  divergence found while establishing provenance here. A full sweep is worth doing and is
  not this item.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** no approved addendum, **When** any FR after FR-1 is attempted, **Then** the work
  stops: method content without provenance is a hard cap, not a review comment.
- **Given** an approved addendum, **When** the snapshot manifest is read, **Then** its
  `addenda/` table names the file, its date, and its owner.
- **Given** a repository configured human-gated, **When** the Phase 3 protocol renders,
  **Then** the STOP rule carries no exception and states that this repository is configured
  human-gated.
- **Given** a repository configured autonomous, **When** the same protocol renders, **Then**
  the exception text matches the snapshot's, parenthetical included.
- **Given** the rendered Phase 3 protocol in either mode, **When** it is searched for a
  self-assessment instruction, **Then** none is present: the agent is never asked to decide
  which mode it is in.
- **Given** the two `AGENT_BOOTSTRAP` copies, **When** the test suite runs, **Then** it
  fails if the proceed rule is absent from either or worded differently between them.
- **Given** `{{AUTONOMY_MODE}}`, **When** `content-placeholders.test.ts` runs, **Then**
  the registry census is 21 rows with exactly one enumeration, the clean-render fixture
  supplies a legal mode value, both legal fragments exist and render, an illegal key is
  refused, and a temp-copy missing-fragment mutation fails — each as its own assertion.
- **Given** a tree with no FR-1 addendum, **When** the FR-1 row runs, **Then** it
  **fails** — the assertion reads the addendum directly, because the digest excludes
  `addenda/**` and was green without it.

---

## 7. Technical Considerations

### Architecture

**The addendum is the architecture.** Everything else here is text. The reason this is a
separate work item rather than three FRs inside PRD-029 is that its blocker is not
engineering: it is an owner decision about method, recorded in a place the hard cap can see.
PRD-029's previous draft stated "read the snapshot first" as its precondition, and reading
does not authorize — the snapshot says the opposite of what the change wants, so the only
lawful paths are an addendum or abandoning the change.

**No code, on purpose — and the second attempt at it is the one that works.** The first
design put `autonomy` in the `prompts` config block, which would have made this PRD claim
`core/config/**` and serialize it against PRD-030. The second expressed it as a plain
`prompts.values` entry, and PRD-029's readiness iteration 2 killed that too: scalar
substitution cannot select a text block, and putting the block text in the config moves
method prose into an adopter's file where the provenance rule cannot see it. The third —
**an enumerated token whose fragments ship in the package** — gets the outcome with neither
cost: the human sets a key in `workflow.config.json`, the agent never assesses itself, the
prose stays in the package under the addendum's authority, and this PRD's target list
contains no TypeScript file. **That is what keeps 030 and 031 parallelizable**, and it is
PRD-029 FR-4 that pays for it.

**Two copies, one wording, held by a test.** FR-5 edits the same rule in two files. This
repository's records say plainly what happens next if nothing holds them together, and the
divergence FR-3 repairs is an existing instance of it between the shipped prompt and its
own snapshot.

**The chain, as shipped (re-founded 2026-07-28 — the earlier narrative predated the
day's landings).** PRD-029 (the one-way store install and the enumerated-token
mechanism this PRD rides) is **Ship Verified** — the hard prerequisite is met. PRD-030
shipped as the **state model only** and handed the reconciliation mechanism to
PRD-034, which is Draft; PRD-032 (activation/dogfood) sits at 4.00 ITERATE, parked
behind PRD-034. **None of that blocks this PRD**: its deliverable is package content
plus corpus tests, and the token's effects reach adopters at their next
`gate init --prompts` whether or not this repository has enabled its own store (it has
not — no `.provegate/`, no `prompts` block in `workflow.config.json`).

### Dependencies

- **PRD-029 Ship Verified** — met (`2026-07-27`).
- **An owner-approved addendum** — hard precondition, and it is FR-1 rather than an
  assumption.
- **Serialization, declared rather than discovered** (iteration 1 found these
  collisions undeclared): **PRD-026** claims
  `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md` (an FR-5
  target); **PRD-032** claims `AGENT_BOOTSTRAP.md` (the other FR-5 target). Neither
  path is `sharedAppendOnly`. This PRD serializes with each on those files — re-run
  `gate queue` at claim, and expect to wait on whichever is in execution phase.
- No new runtime dependency; no production code path; nothing reaches the network.

### Rollback

Everything here is text plus corpus-test expectations, and the revert is one
`git revert`: the fragments, the registry row, the protocol block, the bootstrap
clauses and the test expectations disappear together, restoring the prior corpus
exactly. Consequences, stated: an adopter who ran `gate init --prompts` while this was
live keeps their rendered store (one-way install — nothing rewrites it), and the
`AUTONOMY_MODE` key in their config becomes an unknown-key render diagnostic only at
their next install; the addendum and its manifest row **stay** — a dated,
owner-approved record of an extension later reverted is provenance history, and
deleting it would falsify the record the cap exists to keep.

---

## 8. Implementation Scope

### In Scope

- [ ] `docs/research/provegate-bootstrap/source-snapshot/addenda/` — the provenance record
- [ ] `packages/provegate/prompts/phase-3-task-generator.md` — the autonomy block
- [ ] `packages/provegate/prompts/orchestration-runner.md` — the proceed rule for 4–7
- [ ] `packages/provegate/prompts/PLACEHOLDERS.md` — the token row
- [ ] `AGENT_BOOTSTRAP.md` and its shipped template — the proceed rule
- [ ] `packages/provegate/test/content-prompts.test.ts` — the two-copy, mode, and
      direct-read addendum assertions
- [ ] `packages/provegate/test/content-placeholders.test.ts` — registry count,
      enumeration coverage, legal-value fixture, missing-fragment mutation check

---

## 9. Open Questions

- (none)

---

## 10. References

- `docs/research/provegate-bootstrap/source-snapshot/MANIFEST.md` §addenda — the provenance rule and the table FR-1 extends
- `docs/research/provegate-bootstrap/source-snapshot/addenda/agent-memory-closed-loop-2026-07-25.md` — Addendum A1, the shape FR-1 follows
- `docs/research/provegate-bootstrap/source-snapshot/prompts/phase-3-task-generator.md:80` — the unconditional exception, and the parenthetical FR-3 restores
- `packages/provegate/prompts/phase-3-task-generator.md:92-94` — the self-granted exception
- `AGENT_BOOTSTRAP.md` — ten stop rules, no proceed rule
- `_readiness/wip/readiness-029-method-delivery-agent-binding.md` — W6, the finding that produced this item
- PRD-029 — hard prerequisite; PRD-030 — parallel sibling

---

## Memory Inputs

Records from the memory index this work item considered, each with a disposition and a
rationale. `applied` — the record changed this work item's shape. `reviewed` — it was read
and found not to change it, but is close enough that a reader deserves to know it was
considered. `not-applicable` — its watch or subject matched, and it does not apply here.
A rationale is required in every form, including `none`: an unreasoned `none` is the
ceremonial answer this contract exists to prevent.

Required in a memory-enabled repository, alongside Memory Outputs below.

- applied: `shipped-content-needs-a-delivery-gate` — its watch covers four of this PRD's
  targets (`phase-3-task-generator.md`, both `AUTONOMY_MODE` fragments,
  `PLACEHOLDERS.md`, `orchestration-runner.md`), and the record's rule is this PRD's
  central risk: edited prompt content that packages but never renders. The delivery
  proof is the content round-trip — the token must render through the store pipeline in
  the package tests, not merely sit in the corpus — and FR-6's registration is checked
  by the same tests that render it, so the changed content cannot ship dark.
- applied: `derive-the-requirement-from-the-consumer` — its watch covers
  `PLACEHOLDERS.md`, an FR-6 target. The record binds the token's registration: the
  required-value set is derived from rendered consumers (`prompts.ts:467-483`), so
  `{{AUTONOMY_MODE}}`'s two enumerated values enter through the fragment files the
  renderer actually consumes — registering a key no consumer renders (or a value no
  fragment carries) is exactly the catalogue-shaped demand the record forbids.
- applied: `a-rule-corrected-survives-where-it-is-restated` — its watch covers `_prds/**`.
  FR-5 edits one rule in two files and FR-4 states a related rule in a third — the
  record's shape — and the FR-5 test exists because of it. **The record also fired on
  this document itself**: iteration 1 found the stale PRD-030 narrative and the old
  test-count assumptions surviving under an `applied` disposition; this revision's
  chain rewrite and count updates were swept by grep over the whole document, and the
  Phase 6 reviewer is briefed to sweep.
- reviewed: `docs-outlive-the-gate-they-promise` — its watch covers `AGENT_BOOTSTRAP.md`,
  which FR-5 edits, so the disposition is required; the record's specific failure mode
  (a shipped check still described as future work, with the stale direction inverted)
  is not this PRD's defect. Considered for FR-5's wording: the proceed rule references
  the stop list as it ships today, never as planned work, so this record's trap is not
  reintroduced.
- applied: `evidence-pattern-satisfied-by-the-template` — the record's rule (a
  required-pattern check satisfied by scaffold text) shapes FR-5's assertion design:
  the test asserts **identity between the two copies**, never the presence of a
  pattern in each — a pattern-grep would be satisfied by the template's own text while
  the live copy stayed stale, which is this record's failure mode arriving through the
  checker.
- applied: `assert-absent-needs-an-independent-cause` — its watch covers
  `packages/provegate/test/**`, and FR-3 and FR-5 target `content-prompts.test.ts`. FR-2's
  central assertion is a negative — the human-gated rendering carries no exception and no
  self-assessment instruction — and it is vacuous unless the same fixture proves the
  autonomous rendering **does** carry them. Both modes render from one source, so the
  autonomous case is the independent cause that makes the absence meaningful.
- applied: `narrow-the-grammar-not-the-parser` — `{{AUTONOMY_MODE}}` has exactly two legal
  renderings, both fixed by the addendum, rather than a free-text value the render would
  have to interpret. A narrow grammar is why no parser is needed.
- reviewed: `strictness-added-during-extraction-is-a-behavior-change` — its watch covers
  `core/run/**`, which this PRD deliberately does not touch. Recorded because the earlier
  design did, and moving the value into `prompts.values` is what removed that surface.
- reviewed: `two-parsers-wrong-together` — no parser is added here, and FR-6 keeps the
  registry the single authority the placeholder test already reads.
- not-applicable: `push-is-human-by-omission` — no code path here reaches a remote, and the
  record's rule is preserved by adding nothing.
- not-applicable: `adr-section-blank-line-reads-empty` — its watch covers `_brain/adr/**`
  and this PRD writes no ADR; the method decision is recorded as a snapshot addendum, which
  is the provenance mechanism the manifest defines, not an architecture decision record.

---

## Memory Outputs

The durable records this work item expects to produce, at **exact** repo-relative paths. A
directory, a glob, or a promise to "capture learnings" is not an output. A non-empty output
set may **not** contain `none` — the two forms are mutually exclusive, because `none`
asserts the set is empty. Every non-`none` output must also appear in Durable Artifacts
below: outputs and durable artifacts are one contract expressed twice, never two lists that
may disagree.

Appending an output discovered during implementation is always allowed, with a rationale.
Removing one, changing its type or path, or replacing it with `none` is **weakening**, and
Phase 7 compares against this PRD as committed on the base branch — not against working
state.

- learning: `_brain/learnings/a-rule-that-exempts-itself.md` — a gate whose exception the
  gated party evaluates is not a gate; the failure is invisible in review because the
  exception reads as a considered caveat rather than as a bypass, and the fix is to move the
  predicate to whoever owns the decision rather than to strengthen the wording.

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `packages/provegate/prompts/phase-3-task-generator.md`
- `packages/provegate/prompts/orchestration-runner.md`
- `packages/provegate/prompts/_fragments/**`
- `packages/provegate/prompts/PLACEHOLDERS.md`
- `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`
- `packages/provegate/test/content-prompts.test.ts`
- `packages/provegate/test/content-placeholders.test.ts`
- `AGENT_BOOTSTRAP.md`
- `docs/research/provegate-bootstrap/source-snapshot/addenda/**`
- `docs/research/provegate-bootstrap/source-snapshot/MANIFEST.md`
- `_brain/learnings/a-rule-that-exempts-itself.md`

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- `_brain/learnings/a-rule-that-exempts-itself.md` — a gate whose exception the gated party evaluates is not a gate
- `_brain/INDEX.md` — one pointer line for the record above, per the memory protocol
- `docs/research/provegate-bootstrap/source-snapshot/addenda/autonomy-mode-and-proceed-rule-2026-07-27.md` — the owner-approved provenance for every method byte this PRD changes
- `_docs/reviews/review-031-autonomy-mode-method-policy.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                              | Scope | Notes                                                                                                        |
| ---- | ------------------------------------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------- |
| FR-1 | `pnpm --filter provegate test test/content-prompts.test.ts`  | pkg   | the addendum exists, carries an owner and a date, and the snapshot manifest names it in the addenda table       |
| FR-2 | `pnpm --filter provegate test test/content-prompts.test.ts`  | pkg   | both renderings; the human-gated one contains no exception and no self-assessment instruction                   |
| FR-3 | `pnpm --filter provegate test test/content-prompts.test.ts`  | pkg   | the autonomous rendering reproduces the snapshot's exception text including its parenthetical                   |
| FR-4 | `pnpm --filter provegate test test/content-prompts.test.ts`  | pkg   | the orchestration protocol states the proceed rule and its wording traces to the addendum                      |
| FR-5 | `pnpm --filter provegate test test/content-prompts.test.ts`  | pkg   | both bootstrap copies carry the proceed rule and carry it identically; either one missing fails                 |
| FR-6 | `pnpm --filter provegate test test/content-placeholders.test.ts` | pkg | the token is registered and no shipped prompt carries an unregistered one                                       |
| FR-6 | `pnpm verify:workflow`                                        | repo  | the repo bundle stays green with the addendum in place — workflow-script checks only; the digest and the addendum proof live in the package-test rows above, which the bundle never runs |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build

Hard caps (when your gates manifest configures them):

- Deny test: none — this PRD touches no protected code surface and adds no permission check.
- Contract test: none — this PRD ships no client-to-server payload.
- **Method-content cap: FR-1 is the discharge.** Every byte FR-2 through FR-6 changes must
  trace to the addendum or to the frozen snapshot. This is the cap the previous draft tripped.

Before Phase 2 PASS, run: `gate check PRD-031`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT change one method byte before FR-1's addendum is approved and listed in the
  manifest. Reading the snapshot is not authorization; the snapshot says the opposite.
- DO NOT edit the frozen snapshot. The extension lives beside it, dated and attributed. That
  is what an addendum is for.
- DO NOT let an agent approve the addendum. Drafting is agent work; approval is the owner's
  recorded act.
- DO NOT reintroduce a self-assessable exception in any wording. "In autonomous mode",
  "where appropriate", "unless the session is unattended" are all the same defect: the gated
  party evaluating its own exemption.
- DO NOT add a config key or touch any file under `packages/provegate/src/**`. The
  value travels through `prompts.values`; the renderer already knows enumerations.
  The two corpus-test files are declared targets — the earlier absolute no-TypeScript
  rule was iteration 1's decisive self-contradiction and is deliberately gone.
- DO NOT satisfy the missing-fragment requirement with an assertion that the renderer
  *would* fail. The mutation check runs the failure — a deny case that is never
  executed is not evidence.
- DO NOT edit `AGENT_BOOTSTRAP.md` without editing the shipped template in the same change,
  or the reverse. They are one rule in two files and the test will say so.
- DO NOT remove or reword any of the ten stop-and-ask checkpoints. The asymmetry is fixed
  by adding the proceed rule, not by subtracting stops.
- DO NOT abridge the snapshot's text when rendering the autonomous mode. FR-3 exists because
  an abridgement already happened once and nobody was looking for it.
- DO NOT add a runtime dependency to `packages/provegate`, and DO NOT add a code path that
  reaches a git remote.

---

## Changelog

| Date       | Author | Changes                                                                                                                                                                                                                                                                                                 |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-28 | Claude Fable 5 (non-scorer session), iteration-1 rework | **All seven missing pieces applied; the self-contradiction is resolved by admitting the corpus-test surface.** **(1)** The absolute no-TypeScript rule was impossible against the shipped corpus tests (`content-placeholders.test.ts:96,103,107,158` hardcode 20 rows, zero enumerations, nine values, and an `x` fixture the renderer rejects for an enumeration) — the boundary narrows to production code (`src/**`), and both corpus-test files become declared targets with their exact expectation moves specified in FR-6. **(2)** Enumeration coverage is mutation-checked: both legal fragments, illegal-key refusal, and a temp-copy missing-fragment case that runs the failure. **(3)** FR-1's verification reads the addendum directly with a named assertion — the digest deliberately excludes `addenda/**` (`content-prompts.test.ts:449,472`), which is why the old row was green without the addendum. **(4)** Serialization declared: PRD-026 on the bootstrap template, PRD-032 on the root bootstrap. **(5)** The chain narrative re-founded on shipped state: 029 Ship Verified (prerequisite met), 030 state-model-only with the mechanism at Draft 034, 032 parked at 4.00; none of it blocks this text-plus-tests item. **(6)** The `verify:workflow` note describes what the bundle runs; the three flagged dispositions corrected (`docs-outlive…` honestly to reviewed; `evidence-pattern…` re-grounded on identity-not-pattern; `a-rule-corrected…` names its own iteration-1 firing). **(7)** Value re-declared 3.55 (5/4/2/3/3) at the scorer's derivation — no migration of existing stores means no current-adopter reach — and a Rollback section lands: one revert restores the corpus, the adopter's stale key degrades to a render diagnostic at next install, and the addendum stays as dated provenance history. Awaits an independent re-score |
| 2026-07-27 | owner  | **Two carried items closed.** The claim that adding `{{AUTONOMY_MODE}}` makes it required "from the moment this PRD lands" was true only while an upgrade path existed; under the one-way install nothing re-renders an existing store, so it becomes required at the adopter's next `gate init --prompts`. And `_brain/INDEX.md` is a Durable Artifact here and in PRD-030, declared by neither — the conflict gate could not see a collision the two would have while claiming parallelism. Carried since readiness iteration 5. |
| 2026-07-27 | owner  | **Swept against PRD-029's cut.** The enumerated-token mechanism moved from PRD-029 FR-6 to FR-4 when that document was renumbered, so three references here pointed at the adapters FR. And the "fails at build time" claim survived readiness iteration 5's sweep because it is split across a line break, which `grep` misses; PRD-029 FR-4 now states the opposite explicitly and this FR matches it. |
| 2026-07-27 | owner  | **Iteration 2 remediation (W16).** PRD-029's iteration 2 falsified the `prompts.values` design: scalar substitution cannot select a text block, and putting the block text in an adopter's config moves method prose out of the package. Owner decision: an **enumerated token** whose fragments ship at `prompts/_fragments/`, with the config carrying only the key. FR-2 now targets the two fragments; the target list still contains no TypeScript file, so this item stays parallel to PRD-030. FR-6 records the consequence for PRD-032: adding a token to the rendered corpus changes every adopter's required set, so PRD-032 must derive its values rather than hardcode a count. |
| 2026-07-27 | owner  | **`_brain/INDEX.md` moved to `workflow.config.json` `sharedAppendOnly`.** Claiming it here made the path-conflict gate refuse this PRD and PRD-030 together while both assert parallelism in six sentences. The config line makes the claim true rather than deleting it. Still a declared Durable Artifact. |
| 2026-07-27 | owner  | Split out of PRD-029 at readiness iteration 1 (W1, W6). The parent's stated precondition — read the snapshot — was insufficient: the snapshot states the exception unconditionally, so FR-1 makes the owner-approved addendum a precondition FR rather than an assumption. `{{AUTONOMY_MODE}}` moved from a config key to a `prompts.values` entry, which removes every code target and makes this item parallel to PRD-030. FR-3 is new: the shipped copy already drops the snapshot's parenthetical. |
