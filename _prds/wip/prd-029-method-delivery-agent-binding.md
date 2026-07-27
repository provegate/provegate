# PRD-029: Method Delivery — Agent Protocol Binding

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
> **Slug**: `method-delivery-agent-binding`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: workflow tooling — the installer, the config surface and a render step; it adds no capability to the gated method itself, it delivers the method that already exists.
> **Value**: 4.70 (MF/UI/TL/AR/RM: 5/5/5/5/3)
> **Autonomous Close**: operator-gated

<!-- Autonomous Close declares whether the gated close may run without a human stop:
- `eligible` — every verification is machine-checkable; NO operator-owned rows exist.
  The runner may close and locally merge when all gates are green (push stays human).
- `operator-gated` — human/runtime/staging verification exists. The runner's merge gate
  refuses until an owner-signed acceptance entry exists (METHOD.md → Operator acceptance).
Any PRD that produces operator-owned task rows MUST be operator-gated. -->

---

## 1. Introduction / Overview

The package ships its phase protocols in `packages/provegate/prompts/` and **installs none
of them.** `package.json` `files` publishes `prompts/` and `templates/`; `PACK_MAP` in
`core/run/init.ts` names neither, so an adopter's copy sits in
`node_modules/provegate/prompts/` where no agent's file reader is pointed. This repository
has the same gap in its own checkout.

The consequence runs in both directions at once. `prompts/phase-3-task-generator.md:92`
carries **"STOP — Do not continue until the user says Go"** and agents here generate task
plans without ever loading it. Meanwhile `AGENT_BOOTSTRAP.md`'s nine stop-and-ask
checkpoints — two of them open-ended judgment calls — are the only phase guidance that *is*
always loaded, with no counterweight saying Phases 4–7 proceed without asking. Skipping the
human gates and inventing new ones are the same defect with one cause: asymmetric context,
not comprehension.

The parent project did not have this gap.
`docs/research/provegate-bootstrap/source-snapshot/rules/prd-workflow.mdc` is a
glob-attached rule mapping each phase to its prompt file, with four per-phase siblings
beside it. **Extraction carried the method and left the delivery mechanism behind.**

This PRD builds the delivery core: a rendered, tool-neutral protocol store in the consuming
repository, and thin per-tool adapters that point into it. Delivery is a **render**, not a
copy — the shipped corpus carries 20 placeholder tokens that `prompts/PLACEHOLDERS.md`
declares, and `core/run/new.ts:112-149` already renders the PRD template this way.

> **Scope note.** This document is the delivery core of a four-item split taken at
> readiness iteration 1 (W1, `_readiness/wip/readiness-029-method-delivery-agent-binding.md`).
> Store integrity, upgrade and the reconciliation check are **PRD-030**; the Phase 3
> autonomy token and the `AGENT_BOOTSTRAP` proceed rule are **PRD-031**, blocked on method
> provenance; this repository consuming its own store is **PRD-032**.

---

## 2. Goals

### Primary Goals

- [ ] Every phase protocol reaches a consuming repository's filesystem, resolved against
      that repository's `workflow.config.json`.
- [ ] The set of emitted paths is a stated rule, not a count in prose, and a test pins it —
      a file added to the package without a manifest decision fails.
- [ ] A placeholder with no configured value **fails the render by name**; it never ships
      literally and never ships blank.
- [ ] One activation contract, stated once: the store exists if and only if the config
      declares it.
- [ ] Adapters carry a path and no protocol prose, so a corrected rule cannot survive in a
      stale restatement.

### Success Metrics

| Metric                                                       | Current | Target | Measurement                                                        |
| ------------------------------------------------------------ | ------- | ------ | ------------------------------------------------------------------- |
| Phase protocols reachable on a repo's filesystem after init   | 0       | 12     | store inventory after `gate init --prompts` in a scratch repo        |
| Artifact templates reachable the same way                     | 0       | 7      | same                                                                 |
| Agent-config files pointing at a phase protocol               | 0       | 3      | generated adapters for Claude Code, Cursor, Codex                    |
| Placeholder tokens with no resolution path at scaffold time   | 13      | 0      | the render refuses until every unmapped token is supplied            |
| Protocol prose duplicated inside a generated adapter          | n/a     | 0      | asserted by test over generated adapter bodies                       |

---

## 3. User Stories

#### User Story 1

```
As an adopter who just installed provegate,
I want one command to put the phase protocols where my agent will read them,
so that the gated method I installed is the method my agent follows.
```

**Acceptance Criteria:**

- [ ] `gate init --prompts` writes a `prompts` config block naming every placeholder the
      adopter must supply, and writes the store once they resolve.
- [ ] Running it before those values are supplied **fails with the list**, and writes no
      store.
- [ ] No pre-existing agent entrypoint (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules/brain.mdc`)
      is overwritten, shadowed, or reordered.

#### User Story 2

```
As a reader of a repository that has a store,
I want to know exactly which files are in it and why,
so that a file present in the package but absent from the store is a decision I can find.
```

**Acceptance Criteria:**

- [ ] The emitted set follows a stated rule over the package layout, and a test fails when
      a new package file matches no rule.
- [ ] Every emitted file carries a generated-file banner naming the package version and the
      command that reproduces it.
- [ ] `PLACEHOLDERS.md` reaches the store **unsubstituted** — it is the token registry, and
      rendering it would consume the very tokens it documents.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1**: `WorkflowConfig` gains a `prompts` block: `dir` (string, default
   `.provegate`), `adapters` (ordered subset of `claude-code`, `cursor`, `codex`; default
   all three), and `values` (`Record<string, string>`). Validation is split to match the
   loader's real two-pass shape — **`validateConfig` runs on the RAW parsed object at
   `load.ts:267`, `mergeConfig` at 272, `validateResolvedConfig` plus `memoryPathsContained`
   on the MERGED object at 273** — so shape and unknown-key checks for `prompts` go in the
   raw pass, and `prompts.dir` containment goes in the resolved pass beside
   `memoryPathsContained`. Containment realpaths **both** the candidate and the workspace
   root before comparing, so a repository whose root sits behind a symlink is not refused.
   Absent `prompts` means the feature is off and every other FR is inert.
   - **Targets:** `packages/provegate/src/core/config/types.ts::WorkflowConfig`,
     `packages/provegate/src/core/config/types.ts::PromptsConfig`,
     `packages/provegate/src/core/config/defaults.ts`,
     `packages/provegate/src/core/config/validate.ts::validateConfig`,
     `packages/provegate/src/core/config/validate.ts::validateResolvedConfig`,
     `packages/provegate/src/core/config/load.ts`

2. **FR-2**: The emitted set is a **rule over the package layout**, not a count. Exactly
   three dispositions, and every file in `prompts/` and `templates/` has one:

   | Disposition                            | Rule                                                                 | Destination                          |
   | -------------------------------------- | -------------------------------------------------------------------- | ------------------------------------ |
   | rendered (substitution applied)        | every `*.md` under `prompts/` except `README.md` and `PLACEHOLDERS.md` | `<dir>/prompts/<path relative to prompts/>` |
   | rendered (substitution applied)        | every `*-template.md` under `templates/`                             | `<dir>/templates/<basename>`         |
   | copied verbatim, exempt from FR-3      | `prompts/PLACEHOLDERS.md`                                            | `<dir>/prompts/PLACEHOLDERS.md`      |
   | not emitted                            | `prompts/README.md`, `templates/README.md`                           | —                                    |

   Measured against the package today that is **12 rendered protocols** (seven phase files,
   `orchestration-runner.md`, `knowledge-ingest.md`, `knowledge-lint.md`, and the two
   tool-shaped protocols under `prompts/adapters/`), **7 rendered templates**, and **1
   verbatim** file. A test pins the resulting path set; a `*.md` added to the package that
   matches no rule fails it, so the manifest cannot silently drift from the corpus. The
   store additionally receives a **generated** `<dir>/README.md` stating what the store is
   and the command that reproduces it. `workflow.config.json` is the render's **input** and
   stays at the repository root; it is never moved, copied, or emitted.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::RENDER_RULES`,
     `packages/provegate/src/core/run/prompts.ts::planStore`,
     `packages/provegate/src/core/run/prompts.ts::storePath`

3. **FR-3**: `renderPrompts(packageDir, config)` returns a `Map<string, string>` of
   repo-relative path to content. It is pure — no filesystem writes, no clock, no
   environment read — so the same package version and config always produce the same bytes.
   Every rendered file opens with a generated-file banner naming the package version and
   the reproducing command. The render **refuses** when any rendered output still contains a
   `{{TOKEN}}` sequence, naming each surviving token, its registry meaning, and the config
   key or `prompts.values` entry that supplies it. The refusal is proved against the
   **shipped corpus with an empty `values` map**, not a hand-written sample: the tokens it
   hunts are the ones this package ships, and a fixture without them proves nothing. The
   verbatim file of FR-2 is excluded from this check by disposition, not by a token
   allowlist.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::renderPrompts`,
     `packages/provegate/src/core/run/prompts.ts::assertResolved`,
     `packages/provegate/src/core/run/prompts.ts::GENERATED_BANNER`

4. **FR-4**: Every one of the registry's **20** tokens has a resolution path. **Seven** map
   to a config field and resolve automatically: `{{BASE_BRANCH}}` → `branches.base`,
   `{{ID_PREFIX}}` → `idPattern.prefix`, `{{CMD_CHECK_TYPES}}` / `{{CMD_LINT}}` /
   `{{CMD_TEST}}` / `{{CMD_BUILD}}` → the matching `commands.*`, `{{MEMORY_ROOT}}` →
   `memory.root`. The remaining **thirteen** — `{{PROJECT_NAME}}`, `{{CMD_TEST_SCOPED}}`,
   `{{DOMAIN_CHECKS}}`, `{{LINK_TO_VISION_DOC}}`, `{{VISION_OR_DECISIONS_DOC}}`,
   `{{ONE_LINE_PRODUCT_FRAMING}}`, `{{PROJECT_SPECIFIC_HARD_RULES}}`, `{{TECH_STANDARDS}}`,
   `{{ARCHITECTURE_DOC}}`, `{{BEST_PRACTICES_DOC}}`, `{{DOCS_ROOT}}`, `{{REVIEW_TOOL}}`,
   `{{ENV_NOTES}}` — come from `prompts.values`, and `gate init --prompts` scaffolds all
   thirteen keys carrying a **sentinel** built from the registry's Meaning column. A value
   still equal to its sentinel fails FR-3's refusal exactly as an absent one does: an empty
   string would render a protocol with a blank where a path belongs, which is worse than
   failing. The mapping table is derived from `PLACEHOLDERS.md` at build time rather than
   restated in code, and a test asserts the derived set equals the registry's rows.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::CONFIG_BACKED_TOKENS`,
     `packages/provegate/src/core/run/prompts.ts::sentinelFor`,
     `packages/provegate/src/core/run/prompts.ts::resolveValues`,
     `packages/provegate/test/content-placeholders.test.ts`

5. **FR-5**: **One activation contract**, stated here and restated nowhere:
   - The store exists **if and only if** `workflow.config.json` declares `prompts`.
   - `gate init --prompts` writes the `prompts` block (including the thirteen sentinels)
     **and** the store. When any value is unresolved it writes the config, writes **no**
     store file, and exits non-zero with the list — so a re-run after filling the values
     completes it, which additive-only `wx` writes make safe.
   - `gate init --practices` does **not** install a store. `PACK_MAP` is a static
     source-to-destination table and cannot emit a config-dependent render; the pack
     installs the `NEXT_STEPS.md` step and the shim text that tell the adopter to run
     `gate init --prompts`.
   - `templates.prd` is set to the rendered PRD template **only in the starter config that
     `gate init --prompts` writes**. An existing config is never edited; the command prints
     the value to set. Without that rewiring the render would produce a second PRD template
     nobody reads (`core/run/new.ts:170` falls back to the package copy when
     `config.templates.prd` is `''`), which is the drift this PRD exists to remove.
   - `gate init --dry-run --prompts` prints the plan and writes nothing.
   - **Targets:** `packages/provegate/src/core/run/init.ts::planPrompts`,
     `packages/provegate/src/core/run/init.ts::starterConfig`,
     `packages/provegate/src/core/run/init.ts::runInit`,
     `packages/provegate/src/cli.ts::runInit`

6. **FR-6**: `renderAdapters(config)` emits one adapter per configured tool, each carrying a
   **path and no protocol prose**: `.claude/commands/prd-<phase>.md` (one per phase,
   instructing the agent to read the store's protocol and follow it verbatim),
   `.cursor/rules/prd-workflow.mdc` (front-matter `globs` derived from
   `config.dirs.artifacts`, body limited to the phase-to-path table), and
   `AGENTS.md.provegate.snippet` for Codex. A test asserts every **generated** adapter body
   is a pointer: no line of it appears verbatim in any store protocol except a path.
   The two tool-shaped protocols the package already ships —
   `prompts/adapters/codex-starter.md` and `prompts/adapters/cursor-bootstrap.md`, which
   `prompts/README.md` calls "tool-shaped entry points" — are **protocols, rendered into the
   store by FR-2**, and are legitimate pointer targets. They are not competitors to the
   generated adapters and the prose test does not apply to them; the distinction is by
   origin (shipped protocol versus generated pointer), and the test scopes to what
   `renderAdapters` produced.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::renderAdapters`,
     `packages/provegate/src/core/run/prompts.ts::ADAPTERS`,
     `packages/provegate/src/core/run/prompts.ts::phaseCommandBody`

7. **FR-7**: The Codex adapter is a **snippet, never a write** to `AGENTS.md`.
   `planPractices` states that agent-entrypoint files are deliberately absent from the pack
   so an existing entrypoint is never touched or shadowed; that invariant holds unchanged
   for `CLAUDE.md`, `AGENTS.md` and `.cursor/rules/brain.mdc`. It is **narrowed, not
   broken**: a file at a provegate-namespaced path the adopter does not own
   (`.claude/commands/prd-*.md`, `.cursor/rules/prd-workflow.mdc`) is a generated adapter,
   not an entrypoint. The distinction is written into the `planPractices` comment and into
   an ADR, because the current comment reads as a blanket rule and a reader who has only the
   code must not conclude the rule was abandoned.
   - **Targets:** `packages/provegate/src/core/run/init.ts::planPractices`,
     `packages/provegate/practices/shims/AGENTS.md.snippet`,
     `_brain/adr/ADR-0002-agent-protocol-delivery.md`

8. **FR-8**: `gate init --practices` gains the adopter-facing instructions for the store:
   `NEXT_STEPS.md` names `gate init --prompts`, the thirteen values to supply, and where
   the store lands; the shims mention the generated adapters. `PACK_MAP` gains only the
   files that are static — no rendered output enters the pack. `pack-manifest.json` and the
   pack-drift ledger reconcile against the additions, and `verify:pack-drift` is green on
   both sides.
   - **Targets:** `packages/provegate/practices/NEXT_STEPS.md`,
     `packages/provegate/src/core/run/init.ts::PACK_MAP`,
     `packages/provegate/test/pack-manifest.json`,
     `packages/provegate/test/practices-pack.test.ts`,
     `packages/provegate/test/pack.test.ts`

---

## 5. Non-Goals (Out of Scope)

- **Store integrity, drift reconciliation, and upgrade — PRD-030.** The ledger,
  `gate doctor --prompts`, its wiring, regeneration after a package upgrade, exception
  survival, and `templates.prd` rollback. This PRD writes a store; PRD-030 keeps it honest.
- **The Phase 3 autonomy token and the `AGENT_BOOTSTRAP` proceed rule — PRD-031.** Both
  edit method content and one of them is blocked on provenance the source snapshot does not
  currently grant.
- **This repository consuming its own store — PRD-032.** Dogfooding needs PRD-030's
  reconciliation check to be worth anything, so it follows both.
- **Migrating repositories that already installed the pack.** `gate init` is additive-only
  by design and never overwrites. Stated here rather than left to be discovered.
- **A machine-checkable Phase 3 "Go" gate.** Recording the human approval as state is
  state-and-gate work, not content delivery, and belongs in its own item.
- **An agent driver for Phases 4–7.** Whether one is needed should be measured after a
  store exists, not assumed before.
- **Rewriting phase-protocol content.** This PRD renders `prompts/` and never edits it; the
  directory is deliberately absent from the Conflict Surface.
- **A prompts registry, marketplace, or remote fetch.** Nothing here reaches the network.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a scratch repository, **When** `gate init --prompts` runs before any value is
  supplied, **Then** it writes the `prompts` config block with thirteen sentinels, writes no
  store file, and exits non-zero naming each unresolved token.
- **Given** the same repository with the thirteen values filled, **When** the command is
  re-run, **Then** the store is written and every rendered file resolves every token.
- **Given** the store, **When** its contents are listed, **Then** the path set equals what
  FR-2's rules produce, `PLACEHOLDERS.md` is present and unsubstituted, neither package
  `README.md` is present, and `workflow.config.json` is not among them.
- **Given** a `*.md` added to the package's `prompts/` that matches no FR-2 rule, **When**
  the test suite runs, **Then** it fails naming that file.
- **Given** a repository whose config `gate init --prompts` wrote, **When** `gate new` runs,
  **Then** it reads the rendered template because that config's `templates.prd` names it.
- **Given** a repository whose config already existed, **When** `gate init --prompts` runs,
  **Then** the config is byte-identical afterwards and the command prints the `templates.prd`
  value to set.
- **Given** `gate init --practices` without `--prompts`, **When** it completes, **Then** no
  store exists and `NEXT_STEPS.md` names the command that creates one.
- **Given** an existing `AGENTS.md`, **When** `gate init --prompts` runs, **Then** the file
  is byte-identical afterwards and the Codex adapter is emitted as a snippet.
- **Given** `prompts` is absent from the config, **When** every command in this PRD runs,
  **Then** behaviour is byte-identical to the pre-PRD build.

---

## 7. Technical Considerations

### Architecture

**The store is a build output.** Rendered content is a pure function of the installed
package version and `workflow.config.json`. PRD-030 depends on that property to recompute
rather than trust; this PRD's job is to make it true and keep it true.

**The manifest is a rule, not a list.** Readiness iteration 1 found three different counts
of the same set across §1, §4 and §11 of the previous draft. A rule over the package layout
plus a test that pins its output cannot disagree with itself, and a package file added later
fails rather than being silently dropped.

**`PLACEHOLDERS.md` is the one file that must not be rendered.** It documents the tokens in
its own table cells, so substitution would consume the registry and FR-3's refusal would
fire on the document that explains the refusal. It is copied verbatim and exempted **by
disposition** — never by a token allowlist, because an allowlist would also exempt a real
protocol that happened to be listed.

**Validation follows the loader's real shape.** `validateConfig(parsed)` at `load.ts:267`
sees the raw object; `mergeConfig` runs at 272; `validateResolvedConfig(merged)` and
`memoryPathsContained(root, merged)` at 273. The previous draft asserted the merge came
first and would have put both checks in the wrong pass. Unknown-key and shape checks belong
raw, path containment belongs resolved.

**`_brain/INDEX.md` is deliberately unclaimed.** It is modify-in-place and every PRD that
lands a learning appends to it, so claiming it would serialize this item against every other
memory-producing PRD. It is not in `workflow.config.json` `sharedAppendOnly`, so the
exclusion is a judgement recorded here rather than a rule the config enforces. If a reviewer
disagrees, the fix is a `sharedAppendOnly` entry, not a Conflict Surface line.

**Prerequisites and serialization.** PRD-026 declares `core/run/init.ts`, `cli.ts`,
`practices/NEXT_STEPS.md`, `test/init.test.ts`, `test/pack-manifest.json` and
`test/practices-pack.test.ts` — six paths this PRD also claims. The collision is
additive-versus-deletion rather than semantic, but they are modify-in-place files and this
repository runs one serialized merge channel per package. Intended order: **this PRD first,
PRD-026 absorbing its pack entries.** PRD-024 targets `core/gates/prd-ready.ts` and does not
overlap. PRD-030 and PRD-032 both extend `core/run/prompts.ts` and are strictly downstream.
**Re-run `gate queue` before Phase 3 rather than trusting this paragraph** — it has gone
stale twice in this repository within hours of being written.

### Dependencies

- No new runtime dependency. `packages/provegate` takes zero, permanently.
- No prerequisite work item. PRD-030, PRD-031 and PRD-032 depend on this one, not the
  reverse; PRD-026 is a merge-order constraint, not a dependency.
- Nothing here reaches the network, and nothing adds a push code path.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/config` — the `prompts` surface, split across both passes
- [ ] `packages/provegate/src/core/run/prompts.ts` — rules, render, token resolution, adapters
- [ ] `packages/provegate/src/core/run/init.ts` — `--prompts` plan, starter config, `PACK_MAP`
- [ ] `packages/provegate/src/cli.ts` — `init --prompts`
- [ ] `packages/provegate/practices` — NEXT_STEPS and shim text
- [ ] `_brain/adr/ADR-0002-agent-protocol-delivery.md` — the delivery decision

---

## 9. Open Questions

- (none)

---

## 10. References

- `_readiness/wip/readiness-029-method-delivery-agent-binding.md` — iteration 1, 4.48 ITERATE, W1 is this split
- `packages/provegate/prompts/PLACEHOLDERS.md` — the 20-token registry FR-4 derives from
- `packages/provegate/prompts/README.md` — calls `adapters/` "tool-shaped entry points"
- `packages/provegate/src/core/config/load.ts:256-273` — the real two-pass validation order
- `packages/provegate/src/core/run/new.ts:112-170` — the existing substitution and template fallback
- `packages/provegate/src/core/run/init.ts::planPractices` — the entrypoint invariant FR-7 narrows
- `docs/research/provegate-bootstrap/source-snapshot/rules/prd-workflow.mdc` — the parent project's binding, dropped in extraction
- PRD-030, PRD-031, PRD-032 — the rest of the split

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
  The previous draft of this document declared this record `applied` and then reproduced its
  defect six times, which readiness iteration 1 measured. Two structural answers follow from
  it: FR-2 states the emitted set as a rule with a pinning test instead of a count repeated
  in prose, and FR-5 states the activation contract once and forbids its restatement.
- applied: `evidence-pattern-satisfied-by-the-template` — its watch covers
  `packages/provegate/templates/**`, which FR-2 renders. FR-3's refusal is proved against
  the shipped corpus with an empty values map, and the `PLACEHOLDERS.md` exemption is by
  disposition rather than by a token allowlist, because an allowlist is exactly the shape
  this record warns about.
- applied: `strictness-added-during-extraction-is-a-behavior-change` — its watch covers
  `packages/provegate/src/core/run/**`, which FR-2, FR-5 and FR-7 touch. FR-7 is written to
  it: `planPractices` already owns a deliberate decision about entrypoints, so this PRD
  narrows it in the open and records the narrowing in an ADR rather than relaxing it while
  passing through.
- applied: `fixture-must-reach-production-shape` — its watch covers
  `packages/provegate/src/cli.ts`, which FR-5 targets. The `--prompts` regressions run
  through the real argument path, not by calling `planPrompts` with arguments tidier than
  the CLI supplies; option parsing and config loading are where this shape's defects live.
- applied: `assert-absent-needs-an-independent-cause` — its watch covers
  `packages/provegate/test/**`. FR-5's "no store file written on an unresolved value" and
  FR-7's "AGENTS.md byte-identical" both need a scenario in which something *would* have
  written; a fixture missing the file proves nothing about not writing it.
- applied: `adr-section-blank-line-reads-empty` — its watch covers `_brain/adr/**`, and
  FR-7 writes ADR-0002. `## Context` must be followed immediately by prose or
  `verify:brain` fails; the parser fix is an open deferral, so the ADR is written around it.
- applied: `false-green-on-missing-file` — FR-2's pinning test must fail when a package file
  matches no rule, which is the same shape: a check over a file set has to fail on the
  unexpected member, not skip it.
- applied: `gate-wire-or-delete` — the reason no check ships in this PRD. A reconciliation
  check with no executing surface would fail the wiring audit, so it goes to PRD-030
  together with its wiring rather than landing here half-registered.
- reviewed: `docs-outlive-the-gate-they-promise` — its watch covers `AGENT_BOOTSTRAP.md`,
  which this PRD no longer targets; that edit moved to PRD-031. Recorded because the whole
  item is an instance of the pattern: `METHOD.md` described a workflow whose delivery half
  was never built.
- reviewed: `known-red-ledger-must-expire` — the ledger it governs moved to PRD-030 with the
  rest of the integrity surface, so it binds there rather than here.
- reviewed: `two-parsers-wrong-together` — FR-4 derives the token mapping from
  `PLACEHOLDERS.md` rather than restating it in code, which is the structural answer this
  record prefers over a shared corpus.
- not-applicable: `push-is-human-by-omission` — no code path in this PRD reaches a remote,
  and the record's rule is preserved by adding nothing.

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

- adr: `_brain/adr/ADR-0002-agent-protocol-delivery.md` — the decision that shipped method
  content reaches agents as a rendered store with pointer-only generated adapters, and the
  narrowing of the entrypoint invariant that made it possible.
- learning: `_brain/learnings/shipped-content-needs-a-delivery-gate.md` — packaging a
  protocol is not delivering it: content published in a package but never installed into a
  consuming repository is invisible to every agent, and no existing gate detects that,
  because every gate checks what the artifacts say rather than what the agent read.

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `packages/provegate/src/core/run/prompts.ts`
- `packages/provegate/src/core/run/init.ts`
- `packages/provegate/src/core/config/**`
- `packages/provegate/src/cli.ts`
- `packages/provegate/practices/shims/**`
- `packages/provegate/practices/NEXT_STEPS.md`
- `packages/provegate/test/prompts.test.ts`
- `packages/provegate/test/init.test.ts`
- `packages/provegate/test/config.test.ts`
- `packages/provegate/test/pack.test.ts`
- `packages/provegate/test/practices-pack.test.ts`
- `packages/provegate/test/content-placeholders.test.ts`
- `packages/provegate/test/pack-manifest.json`
- `_brain/adr/ADR-0002-agent-protocol-delivery.md`
- `_brain/learnings/shipped-content-needs-a-delivery-gate.md`

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- ADR: `_brain/adr/ADR-0002-agent-protocol-delivery.md` — rendered-store delivery, pointer-only generated adapters, and the narrowed entrypoint invariant
- `_brain/learnings/shipped-content-needs-a-delivery-gate.md` — packaging is not delivery; no existing gate detects content that ships and never installs
- `_brain/INDEX.md` — one pointer line per record above, per the memory protocol
- `_docs/reviews/review-029-method-delivery-agent-binding.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                                    | Scope | Notes                                                                                                             |
| ---- | ------------------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------- |
| FR-1 | `pnpm --filter provegate test test/config.test.ts`                 | pkg   | unknown adapter id and bad shape refused in the raw pass; escaping dir and symlinked root refused in the resolved pass; absent block inert |
| FR-2 | `pnpm --filter provegate test test/prompts.test.ts`                | pkg   | the pinned path set; a package file matching no rule fails; both package READMEs absent; the verbatim file present   |
| FR-3 | `pnpm --filter provegate test test/prompts.test.ts`                | pkg   | shipped corpus with an empty values map refuses, naming every surviving token and its supplier; identical bytes across runs |
| FR-4 | `pnpm --filter provegate test test/content-placeholders.test.ts`   | pkg   | the derived mapping equals the registry rows; seven config-backed and thirteen sentinel-scaffolded                   |
| FR-5 | `pnpm --filter provegate test test/init.test.ts`                   | pkg   | unresolved values write config and no store; re-run completes; existing config untouched; practices installs no store |
| FR-6 | `pnpm --filter provegate test test/prompts.test.ts`                | pkg   | every generated adapter body is a pointer; the two shipped tool-shaped protocols are rendered, not prose-tested      |
| FR-7 | `pnpm --filter provegate test test/init.test.ts`                   | pkg   | a fixture that already has AGENTS.md and would otherwise be written leaves it byte-identical                        |
| FR-8 | `pnpm verify:pack-drift`                                           | repo  | the new pairs reconcile on both sides with no orphan packed file and no lost live copy                              |
| FR-8 | `pnpm --filter provegate test test/pack.test.ts`                    | pkg   | the shipped-file allowlist matches the packed tarball after the additions                                           |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/config.test.ts` — FR-1 adds a configured path that
  resolves against the filesystem; the escaping-dir and symlinked-root cases are the deny
  tests for that surface.
- Contract test: none — this PRD ships no client-to-server payload.

Before Phase 2 PASS, run: `gate check PRD-029`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT state the emitted set as a count anywhere. It is a rule with a pinning test; a
  number written in prose is what disagreed with itself three times in the previous draft.
- DO NOT render `PLACEHOLDERS.md`. Substituting the registry consumes the tokens it
  documents, and the refusal that explains the failure would fire on the explanation.
- DO NOT exempt a file from the unresolved-token check with a token allowlist. Exemption is
  by disposition, one file, named in FR-2.
- DO NOT write protocol prose into a generated adapter. An adapter carries a path.
- DO NOT delete or rewrite `prompts/adapters/*`. They are shipped protocols, they are
  rendered like the others, and editing them is method content this PRD does not own.
- DO NOT edit any file under `packages/provegate/prompts/`. This PRD renders that directory
  and never writes to it; the token work is PRD-031's.
- DO NOT overwrite, reorder, or append to `CLAUDE.md`, `AGENTS.md`, or
  `.cursor/rules/brain.mdc`. The Codex adapter is a snippet the adopter pastes.
- DO NOT move, copy, or emit `workflow.config.json` into the store. It is the render's
  input; the store holds output only.
- DO NOT render a template without giving it a reader. A rendered `prd-template.md` that
  `config.templates.prd` does not point at is a second copy of the artifact this PRD exists
  to stop duplicating.
- DO NOT let the render read the clock, the environment, or the network. PRD-030's
  reconciliation depends on purity.
- DO NOT write a store file when any value is unresolved, and DO NOT substitute an empty
  string for a missing one. A protocol with a blank where a path belongs is worse than a
  refusal.
- DO NOT add a reconciliation check, a ledger, or a `doctor` branch here. They ship with
  their wiring in PRD-030; a registered check with no executing surface fails the audit.
- DO NOT change behaviour for a repository whose config omits `prompts`. Every command must
  be byte-identical to the pre-PRD build, and a test must hold that line.
- DO NOT add a runtime dependency to `packages/provegate`, and DO NOT add a code path that
  reaches a git remote.

---

## Changelog

| Date       | Author | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-07-27 | owner  | **W1 split taken.** Thirteen FRs become eight; integrity to PRD-030, method policy to PRD-031, dogfood to PRD-032. Six internal contradictions closed at their root rather than patched: the emitted set is a rule with a pinning test instead of a count restated in three sections; the registry is **20** tokens, seven config-backed and thirteen scaffolded with sentinels that fail the render; activation is stated once and `--practices` explicitly installs no store; `templates.prd` is set only in the starter config and reported otherwise; the `load.ts` validation order is corrected to raw-then-merge-then-resolved. `prompts/adapters/*` are reclassified as shipped tool-shaped protocols that render like the rest, and `PLACEHOLDERS.md` is copied verbatim because rendering it would consume the registry. `prompts/**` leaves the Conflict Surface entirely. |
| 2026-07-27 | owner  | Initial draft. Scope set by owner decision on three questions: rendered prompts editable with a drift ledger; all three adapters in v1; the autonomy exception config-bound.                                                                                                                                                                                                                                                                                                                                                                                                                          |
