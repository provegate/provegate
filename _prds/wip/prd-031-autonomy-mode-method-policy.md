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
> **Updated**: 2026-07-27
> **Author**: owner
> **Audience**: Implementing Agent
> **Slug**: `autonomy-mode-method-policy`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: method content and the agent entrypoint — no code path changes; the deliverable is prompt and bootstrap text plus the provenance record that authorizes it.
> **Value**: 3.95 (MF/UI/TL/AR/RM: 5/5/2/4/3)
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
   - **Targets:** `docs/research/provegate-bootstrap/source-snapshot/addenda/autonomy-mode-and-proceed-rule-2026-07-27.md`,
     `docs/research/provegate-bootstrap/source-snapshot/MANIFEST.md`

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
     `packages/provegate/prompts/PLACEHOLDERS.md`

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
   field mapping, because the value is supplied through `prompts.values` as a key. The
   registry's own rule — a token not in the table must not appear in any shipped prompt — is
   enforced by `test/content-placeholders.test.ts`, and PRD-029 FR-4 additionally fails a **package test and
   the render** — never "at build time", since the package's `build` is one `tsup` invocation —
   when a declared enumerated value has no fragment file; this FR must leave both green.
   Because PRD-029 derives the required-value set from the **rendered corpus**, adding this
   token makes it required for every adopter **the next time they run `gate init --prompts`** —
   not from the moment this PRD lands, which was true only while an upgrade path existed and is
   false under the one-way install. The conclusion is unchanged: PRD-032 must derive its own
   value set rather than hardcoding a count, because the set it needs depends on the package
   version installed when it runs.
   - **Targets:** `packages/provegate/prompts/PLACEHOLDERS.md`

---

## 5. Non-Goals (Out of Scope)

- **Delivering the protocols to agents.** PRD-029. This PRD changes what the protocols say;
  it does not change how they arrive. Without PRD-029 the edits are correct and still unread.
- **A machine-checkable "Go" gate.** Recording the human's approval as state and refusing a
  task file without it is state-and-gate work and belongs in its own item. This PRD removes
  the self-issued exception; it does not add enforcement.
- **Changing the stop-and-ask checkpoint list.** The ten entries stay as they are. The
  asymmetry is fixed by adding the proceed rule, not by removing stops.
- **Any code path.** No TypeScript file is targeted. If an FR here appears to need one, the
  design is wrong: `{{AUTONOMY_MODE}}` was deliberately made a `prompts.values` entry rather
  than a config key so this PRD stays text-only.
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
- **Given** `{{AUTONOMY_MODE}}`, **When** `content-placeholders.test.ts` runs, **Then** the
  token is found in the registry and the test stays green.

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

**Prerequisite and parallelism.** PRD-029 must be Ship Verified: until the store exists, an
edited protocol still reaches no agent, and the `{{AUTONOMY_MODE}}` token would render
nowhere. Once it lands, **this PRD and PRD-030 are disjoint** — 030 owns
`core/run/prompts.ts`, `cli.ts` and the verify surface; this one owns method content,
`AGENT_BOOTSTRAP.md` and the snapshot addenda — so they may run in parallel. `gate check`'s
Targets-versus-watch machinery and `gate queue` should both be re-run before Phase 3 rather
than trusting this paragraph.

### Dependencies

- **PRD-029 Ship Verified.** Hard prerequisite.
- **An owner-approved addendum.** Hard precondition, and it is FR-1 rather than an
  assumption.
- No new runtime dependency; no code path added; nothing reaches the network.

---

## 8. Implementation Scope

### In Scope

- [ ] `docs/research/provegate-bootstrap/source-snapshot/addenda/` — the provenance record
- [ ] `packages/provegate/prompts/phase-3-task-generator.md` — the autonomy block
- [ ] `packages/provegate/prompts/orchestration-runner.md` — the proceed rule for 4–7
- [ ] `packages/provegate/prompts/PLACEHOLDERS.md` — the token row
- [ ] `AGENT_BOOTSTRAP.md` and its shipped template — the proceed rule
- [ ] `packages/provegate/test/content-prompts.test.ts` — the two-copy and mode assertions

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

- applied: `a-rule-corrected-survives-where-it-is-restated` — its watch covers `_prds/**`.
  FR-5 edits one rule in two files and FR-4 states a related rule in a third, which is
  precisely the shape this record describes; the test in FR-5 exists because of it, and FR-3
  repairs an existing instance between the shipped prompt and its own snapshot.
- applied: `docs-outlive-the-gate-they-promise` — its watch covers `AGENT_BOOTSTRAP.md`,
  which FR-5 edits. The entrypoint currently describes an autonomy boundary that its own
  rule list contradicts, which is this record's failure mode in the entrypoint itself.
- applied: `evidence-pattern-satisfied-by-the-template` — the template and the live
  `AGENT_BOOTSTRAP.md` are the two copies FR-5 must keep identical, and a test that only
  greps the live copy would pass while the shipped one stays stale. The assertion covers
  both.
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
| FR-6 | `pnpm verify:workflow`                                        | repo  | the frozen-snapshot digest and the method-content checks stay green with the addendum in place                 |

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
- DO NOT add a config key or touch any TypeScript file. The value travels through
  `prompts.values`, and that choice is what keeps this PRD parallel to PRD-030.
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
| 2026-07-27 | owner  | **Two carried items closed.** The claim that adding `{{AUTONOMY_MODE}}` makes it required "from the moment this PRD lands" was true only while an upgrade path existed; under the one-way install nothing re-renders an existing store, so it becomes required at the adopter's next `gate init --prompts`. And `_brain/INDEX.md` is a Durable Artifact here and in PRD-030, declared by neither — the conflict gate could not see a collision the two would have while claiming parallelism. Carried since readiness iteration 5. |
| 2026-07-27 | owner  | **Swept against PRD-029's cut.** The enumerated-token mechanism moved from PRD-029 FR-6 to FR-4 when that document was renumbered, so three references here pointed at the adapters FR. And the "fails at build time" claim survived readiness iteration 5's sweep because it is split across a line break, which `grep` misses; PRD-029 FR-4 now states the opposite explicitly and this FR matches it. |
| 2026-07-27 | owner  | **Iteration 2 remediation (W16).** PRD-029's iteration 2 falsified the `prompts.values` design: scalar substitution cannot select a text block, and putting the block text in an adopter's config moves method prose out of the package. Owner decision: an **enumerated token** whose fragments ship at `prompts/_fragments/`, with the config carrying only the key. FR-2 now targets the two fragments; the target list still contains no TypeScript file, so this item stays parallel to PRD-030. FR-6 records the consequence for PRD-032: adding a token to the rendered corpus changes every adopter's required set, so PRD-032 must derive its values rather than hardcode a count. |
| 2026-07-27 | owner  | **`_brain/INDEX.md` moved to `workflow.config.json` `sharedAppendOnly`.** Claiming it here made the path-conflict gate refuse this PRD and PRD-030 together while both assert parallelism in six sentences. The config line makes the claim true rather than deleting it. Still a declared Durable Artifact. |
| 2026-07-27 | owner  | Split out of PRD-029 at readiness iteration 1 (W1, W6). The parent's stated precondition — read the snapshot — was insufficient: the snapshot states the exception unconditionally, so FR-1 makes the owner-approved addendum a precondition FR rather than an assumption. `{{AUTONOMY_MODE}}` moved from a config key to a `prompts.values` entry, which removes every code target and makes this item parallel to PRD-030. FR-3 is new: the shipped copy already drops the snapshot's parenthetical. |
