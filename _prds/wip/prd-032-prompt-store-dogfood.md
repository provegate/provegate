# PRD-032: This Repository Consumes Its Own Protocol Store

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
> **Slug**: `prompt-store-dogfood`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: repository configuration and generated artifacts — this changes how provegate develops itself, not what the package does for anyone else.
> **Value**: 3.40 (MF/UI/TL/AR/RM: 4/3/3/3/4)
> **Autonomous Close**: operator-gated

<!-- Autonomous Close declares whether the gated close may run without a human stop:
- `eligible` — every verification is machine-checkable; NO operator-owned rows exist.
  The runner may close and locally merge when all gates are green (push stays human).
- `operator-gated` — human/runtime/staging verification exists. The runner's merge gate
  refuses until an owner-signed acceptance entry exists (METHOD.md → Operator acceptance).
Any PRD that produces operator-owned task rows MUST be operator-gated. -->

---

## 1. Introduction / Overview

The duplication audit of 2026-07-25 named the root cause of three method rules being
implemented twice: *"this repo dogfoods the CLI's lifecycle but not its gate policy — `gate`
appears in no `package.json` script, no CI step, and no git hook."* The same class of gap is
about to open again. PRD-029 gives adopters a protocol store; PRD-030 gives them a check that
keeps it honest. Neither makes this repository use either one.

That matters more here than it usually would, because **this repository is the first place
the delivery gap was observed.** Agents working in provegate write PRDs without ever loading
`phase-3-task-generator.md`. Shipping a fix that adopters get and provegate does not would
leave the originating instance of the bug in place, in the repository whose own board records
it.

This PRD is the smallest item in the split and the last in the chain: fill this repository's
`prompts.values`, generate the store and the adapters with the built CLI, commit them, and
wire the reconciliation check so the committed copy cannot drift.

One trap decides the shape of the verification. The store lives outside
`packages/provegate/`, and a `provegate#test` turbo task hashes package files. A package test
that reads the store would replay a cached green while the store drifted — the failure
`turbo-cache-masks-out-of-input-reads` already records, and the same reason
`content-prompts.test.ts`'s frozen-snapshot digest sits on the deferral board today. The
check runs from `scripts/verify/`.

---

## 2. Goals

### Primary Goals

- [ ] Agents working in this repository reach the phase protocols through the same mechanism
      adopters get, produced by the same CLI.
- [ ] The committed store is provably a fresh render of the installed package and this
      repository's config.
- [ ] The check that proves it runs outside the turbo cache.

### Success Metrics

| Metric                                                          | Current | Target | Measurement                                              |
| ----------------------------------------------------------------- | ------- | ------ | ---------------------------------------------------------- |
| Phase protocols reachable by an agent working in this repository   | none    | all    | store inventory at the repository root                     |
| Generated adapter files here pointing at a phase protocol          | 0       | all    | one Claude command per phase, one Cursor rule, one snippet  |
| Hand-written bytes in the store or the adapters                    | n/a     | 0      | committed render equals a fresh render, checked cache-free  |
| Required placeholder values this repository leaves unfilled        | all     | 0      | the render refuses otherwise, so a green check is the proof |
| Required values this document hardcodes rather than derives        | n/a     | 0      | the set comes from what `gate init --prompts` scaffolds     |

---

## 3. User Stories

#### User Story 1

```
As an agent starting Phase 3 in this repository,
I want the task-generation protocol in my loaded context,
so that I follow the STOP rule instead of never seeing it.
```

**Acceptance Criteria:**

- [ ] `.provegate/prompts/phase-3-task-generator.md` exists, is committed, and resolves every
      placeholder against this repository's config.
- [ ] `.cursor/rules/prd-workflow.mdc` attaches on the artifact directories derived from
      `config.dirs.artifacts`, and `.claude/commands/prd-*.md` exists per phase.
- [ ] `.cursor/rules/brain.mdc`, `CLAUDE.md` and `AGENTS.md` are byte-identical to their
      pre-PRD state.

#### User Story 2

```
As a reviewer of a later change,
I want to know the committed store still matches the package,
so that an upgrade cannot leave this repository's agents on a stale protocol.
```

**Acceptance Criteria:**

- [ ] A `scripts/verify/` check re-renders and compares, and is a member of the
      `verify:workflow` bundle and the CI hygiene job.
- [ ] The check fails when a store file is edited by hand without a recorded exception.
- [ ] The check does not run as a package test, and a comment says why.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1**: `workflow.config.json` gains the `prompts` block for this repository: `dir`
   (`.provegate`), `adapters` (all three), and `values` filled for **every key the installed
   package requires** — the set PRD-029 FR-5 derives from the rendered corpus, obtained by
   running `gate init --prompts` and reading what it scaffolds, **never by copying a count
   from this document.** That is deliberate: PRD-031 adds `{{AUTONOMY_MODE}}` to the rendered
   corpus, so the required set has one size before it lands and another after, and a
   hardcoded list here would make this item's correctness depend on landing order. Each value
   carries this repository's real answer — `{{ARCHITECTURE_DOC}}` is `AGENT_BOOTSTRAP.md`,
   `{{REVIEW_TOOL}}` is the `/codex` invocation this repository actually uses, and so on;
   `{{MEMORY_ROOT}}` and the six other config-backed tokens resolve without a `values` entry.
   No key is left `null`, and the render refusing otherwise is what makes a green result proof
   that every value was answered rather than defaulted.
   - **Targets:** `workflow.config.json`

2. **FR-2**: The store and the adapters are generated by the **built CLI**
   (`node packages/provegate/dist/cli.js init --prompts`) and committed. No file under
   `.provegate/`, `.claude/` or `.cursor/rules/prd-workflow.mdc` is hand-written or
   hand-edited. `templates.prd` is set to the rendered PRD template in the same change, so
   `gate new` in this repository reads the store.
   - **Targets:** `.provegate/**`, `.claude/commands/**`,
     `.cursor/rules/prd-workflow.mdc`, `workflow.config.json`

3. **FR-3**: A `scripts/verify/` check asserts the committed store and adapters equal a
   fresh render of the installed package against the committed config, and delegates the
   receipt and exception rules to PRD-030's primitive rather than reimplementing them. It
   runs from `scripts/verify/` and **not** as a package test, with a comment naming the
   reason: the store is outside `packages/provegate/`, `provegate#test` hashes package
   files, and a cached green would replay while the store drifted.
   - **Targets:** `scripts/verify/verify-prompts.mjs`

4. **FR-4**: The check is wired: a member of the `verify:workflow` bundle and a step in the
   CI hygiene job. `gate check --wiring` is green with it present. PRD-030 creates the
   script and its packed twin; this FR only adds this repository's store to what the script
   covers and confirms the wiring holds with real content behind it.
   - **Targets:** `scripts/verify/verify-prompts.mjs`, `.github/workflows/ci.yml`

5. **FR-5**: `AGENT_BOOTSTRAP.md`'s knowledge map and reading strategy name the store, so an
   agent reading the entrypoint learns the protocols exist and where they are. This is a
   pointer, not protocol prose — one line in the map and one in the Level 2 reading list.
   - **Targets:** `AGENT_BOOTSTRAP.md`

6. **FR-6**: `.gitignore` and the turbo inputs are checked rather than assumed: the store is
   **committed**, so no ignore rule may exclude it, and no turbo task may narrow its inputs
   in a way that hides it. `verify:turbo-inputs` stays green.
   - **Targets:** `.gitignore`, `turbo.json`

---

## 5. Non-Goals (Out of Scope)

- **Building the store mechanism.** PRD-029 owns the render, the config surface, the
  adapters and the installer. This PRD runs it.
- **Building the reconciliation check.** PRD-030 owns the ledger, the doctor, the sync verb
  and `verify-prompts.mjs` itself. This PRD points it at this repository's store.
- **Changing method content.** PRD-031. This PRD renders whatever the package ships at the
  time it runs.
- **Making `gate` this repository's gate runner.** The 2026-07-25 audit's wider finding —
  that `gate` appears in no script, CI step or hook here — is real and larger than this item.
  PRD-026 owns the consolidation half; the rest is a separate candidate.
- **Adopting the store in `apps/` or `packages/design`.** One store at the repository root,
  matching how an adopter's repository is shaped.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** this repository at `main`, **When** an agent lists `.provegate/prompts/`,
  **Then** twelve rendered protocols are present and none contains an unresolved token.
- **Given** the committed config, **When** a fresh render runs against the installed
  package, **Then** it equals the committed store byte for byte.
- **Given** a hand-edited store file with no ledger exception, **When** `verify:prompts`
  runs, **Then** it fails naming that path.
- **Given** `pnpm verify:workflow`, **When** it runs, **Then** the prompts check runs inside
  the bundle rather than beside it.
- **Given** the check, **When** its location is inspected, **Then** it is under
  `scripts/verify/` and carries the comment explaining why it is not a package test.
- **Given** `gate new` in this repository, **When** it creates a PRD, **Then** it reads the
  rendered template because `templates.prd` names it.
- **Given** `CLAUDE.md`, `AGENTS.md` and `.cursor/rules/brain.mdc`, **When** the change
  lands, **Then** all three are byte-identical to their pre-PRD state.

---

## 7. Technical Considerations

### Architecture

**Nothing here is authored; everything is generated and committed.** The value of this item
is entirely in it being produced by the shipped CLI. A hand-written `.provegate/` that looks
right would be worse than none, because the check would then be measuring a copy against
itself.

**The cache trap decides the verification surface.** This is the third time in this
repository that a check reading paths outside a package's turbo inputs has come up — the
frozen-snapshot digest deferral is the standing instance, and `verify:turbo-inputs` exists
because of the second. FR-3 states the reason in a comment so the next person who wants to
"just make it a test" reads it there.

**Last in the chain, and small on purpose.** It needs the store (PRD-029) and the check
(PRD-030). It does not need PRD-031 — but PRD-029's readiness iteration 2 showed why that
independence has to be *built* rather than asserted: PRD-031 adds `{{AUTONOMY_MODE}}` to the
rendered corpus, and PRD-029 derives the required-value set from that corpus, so the number
of values this repository must supply differs before and after PRD-031 lands. A hardcoded
list here would make this item wrong depending on merge order. FR-1 therefore derives the set
from what `gate init --prompts` scaffolds against the installed package. With that, PRD-031
landing later simply changes the rendered bytes, which FR-3's check requires to be
re-committed — the mechanism working, not a conflict.

**Prerequisites.** PRD-029 and PRD-030 both Ship Verified. Conflict Surface is disjoint from
both: they own package code and the verify script's creation, this one owns the repository's
own configuration and generated artifacts. `.github/workflows/ci.yml` and
`scripts/verify/verify-prompts.mjs` appear in PRD-030's surface too, which is why this item
follows rather than parallels it. Re-run `gate queue` before Phase 3 rather than trusting
this paragraph.

### Dependencies

- **PRD-029 Ship Verified** — the store mechanism.
- **PRD-030 Ship Verified** — the reconciliation check this one wires to real content.
- No new runtime dependency; nothing reaches the network; no push code path.

---

## 8. Implementation Scope

### In Scope

- [ ] `workflow.config.json` — the `prompts` block with every required value answered
- [ ] `.provegate/` — the generated store, committed
- [ ] `.claude/commands/` and `.cursor/rules/prd-workflow.mdc` — the generated adapters
- [ ] `scripts/verify/verify-prompts.mjs` — this repository's store added to its coverage
- [ ] `AGENT_BOOTSTRAP.md` — two pointer lines
- [ ] `.gitignore`, `turbo.json` — confirm nothing hides the store

---

## 9. Open Questions

- (none)

---

## 10. References

- STATUS.md, 2026-07-25 duplication audit — *"this repo dogfoods the CLI's lifecycle but not its gate policy"*
- `_brain/learnings/turbo-cache-masks-out-of-input-reads.md` — why FR-3 is not a package test
- PRD-029 — the store mechanism; hard prerequisite
- PRD-030 — the reconciliation check; hard prerequisite
- PRD-031 — later method-content changes simply re-render; not a prerequisite
- `_readiness/wip/readiness-029-method-delivery-agent-binding.md` — W1, the split that produced this item

---

## Memory Inputs

Records from the memory index this work item considered, each with a disposition and a
rationale. `applied` — the record changed this work item's shape. `reviewed` — it was read
and found not to change it, but is close enough that a reader deserves to know it was
considered. `not-applicable` — its watch or subject matched, and it does not apply here.
A rationale is required in every form, including `none`: an unreasoned `none` is the
ceremonial answer this contract exists to prevent.

Required in a memory-enabled repository, alongside Memory Outputs below.

- applied: `turbo-cache-masks-out-of-input-reads` — the whole of FR-3. The store sits outside
  `packages/provegate/`, `provegate#test` hashes package files, and a package test would
  replay a cached green while the store drifted. The check runs from `scripts/verify/` and
  the comment naming the reason is part of the requirement, not decoration.
- applied: `gate-wire-or-delete` — FR-4. A check covering this repository's store that is not
  a bundle member and not a CI step is registered and unrun, which the wiring audit refuses
  in one direction and this record refuses in both.
- applied: `docs-outlive-the-gate-they-promise` — its watch covers `AGENT_BOOTSTRAP.md`,
  which FR-5 edits. Two pointer lines are the whole edit precisely because a longer
  description of the store in the entrypoint would be prose that outlives the store's shape.
- applied: `a-rule-corrected-survives-where-it-is-restated` — its watch covers `_prds/**`.
  FR-5 is deliberately a pointer rather than a summary: any protocol content restated in
  `AGENT_BOOTSTRAP.md` would be a copy that drifts from the store it describes.
- applied: `durable-artifact-must-commit` — the store is a committed artifact, and FR-6
  checks that no ignore rule excludes it. An uncommitted generated tree would leave the check
  green locally and the repository's agents empty on a fresh clone.
- reviewed: `known-red-ledger-must-expire` — the ledger and its exceptions are PRD-030's; this
  item consumes them and adds no exception of its own. Recorded because the first exception
  this repository writes will be written here, and it will need an owner and a date.
- reviewed: `evidence-pattern-satisfied-by-the-template` — FR-1's proof that every value was
  answered is the render refusing on an unset `null`, not a human reading the config. Recorded
  because "the config has the right number of keys" is exactly the satisfied-by-the-template shape.
- not-applicable: `push-is-human-by-omission` — no code path here reaches a remote, and the
  record's rule is preserved by adding nothing.
- not-applicable: `strictness-added-during-extraction-is-a-behavior-change` — its watch covers
  `core/run/**`, which this PRD does not touch; every code target belongs to PRD-029 or
  PRD-030.

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

- none — every durable fact this chain produces is claimed upstream: the delivery decision
  and its ADR by PRD-029, the recompute-over-recorded-state rule by PRD-030, and the
  self-exempting-rule record by PRD-031. This item runs a shipped mechanism against one
  repository and is expected to teach nothing the code does not already record. If executing
  it does surface a non-derivable fact, appending an output with a rationale is allowed and
  is the correct response.

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `.provegate/**`
- `.claude/**`
- `.cursor/rules/prd-workflow.mdc`
- `workflow.config.json`
- `AGENT_BOOTSTRAP.md`
- `turbo.json`
- `.gitignore`

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- `none` — no `_brain` record is expected; every durable fact in this chain is claimed by PRD-029, PRD-030 or PRD-031
- `_docs/reviews/review-032-prompt-store-dogfood.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                      | Scope | Notes                                                                                                     |
| ---- | ---------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------- |
| FR-1 | `node packages/provegate/dist/cli.js doctor --prompts` | repo  | every path reports match, which is only reachable when every required value is answered                      |
| FR-2 | `node scripts/verify/verify-prompts.mjs`             | repo  | the committed store and adapters equal a fresh render of the installed package                              |
| FR-3 | `node scripts/verify/verify-prompts.mjs`             | repo  | a hand-edited store file with no exception fails; the check reads paths outside the package's turbo inputs   |
| FR-4 | `pnpm verify:workflow`                               | repo  | the prompts check runs inside the bundle rather than beside it                                              |
| FR-4 | `node packages/provegate/dist/cli.js check --wiring` | repo  | registered and executing, with real content behind it rather than an empty store                            |
| FR-5 | `pnpm verify:doc-claims`                             | repo  | the entrypoint's new lines make no claim about a gate that does not run                                     |
| FR-6 | `pnpm verify:turbo-inputs`                           | repo  | no task narrows its inputs in a way that hides the store from a gate that reads it                          |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build

Hard caps (when your gates manifest configures them):

- Deny test: none — this PRD touches no protected code surface and adds no permission check.
- Contract test: none — this PRD ships no client-to-server payload.

Before Phase 2 PASS, run: `gate check PRD-032`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT hand-write or hand-edit a single byte under `.provegate/`, `.claude/` or
  `.cursor/rules/prd-workflow.mdc`. Generated by the built CLI, or it is not dogfooding.
- DO NOT verify this with a package test. The store is outside the package's turbo inputs
  and a cached green will replay while it drifts. The comment saying so is part of FR-3.
- DO NOT reimplement the receipt or exception rules here. The check delegates to PRD-030's
  primitive; a second implementation is the duplication this repository is already paying to
  remove.
- DO NOT edit `CLAUDE.md`, `AGENTS.md` or `.cursor/rules/brain.mdc`. The generated adapters
  sit at their own paths and shadow nothing.
- DO NOT summarize any protocol inside `AGENT_BOOTSTRAP.md`. Two pointer lines. A summary is
  a copy, and it will drift from the store it describes.
- DO NOT add the store to `.gitignore`. It is committed on purpose; an ignored store is
  green locally and empty on a fresh clone.
- DO NOT leave a required key `null` or absent in `workflow.config.json`. The refusal is the
  proof that every value was answered.
- DO NOT hardcode the required-value set or its size. Derive it from what
  `gate init --prompts` scaffolds against the installed package; PRD-031 changes that set,
  and a copied count makes this item's correctness depend on merge order.
- DO NOT start before PRD-029 and PRD-030 are both Ship Verified. Without the check this is
  a committed tree nobody reconciles, which is the drift surface the chain exists to avoid.
- DO NOT add a runtime dependency to `packages/provegate`, and DO NOT add a code path that
  reaches a git remote.

---

## Changelog

| Date       | Author | Changes                                                                                                                                                                                                                                              |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-07-27 | owner  | **Iteration 2 remediation (W16).** FR-1 no longer hardcodes thirteen values: PRD-031 adds a token to the rendered corpus and PRD-029 derives the required set from that corpus, so a copied count would make this item wrong depending on merge order. The set is now obtained from what `gate init --prompts` scaffolds against the installed package, which removes the ordering dependency rather than documenting it. |
| 2026-07-27 | owner  | Split out of PRD-029 at readiness iteration 1 (W1). Last in the chain: it needs both the store and the check. FR-6 is new — the parent never checked that an ignore rule or a narrowed turbo input could hide a committed generated tree from the gate that reads it. |
