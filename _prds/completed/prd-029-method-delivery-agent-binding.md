# PRD-029: Method Delivery — One-Way Protocol Install

> **Status**: Ship Verified
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
> **Class Rationale**: workflow tooling — a config key, a render step and an installer branch; it adds no capability to the gated method itself, it delivers the method that already exists.
> **Value**: 4.85 (MF/UI/TL/AR/RM: 5/5/5/5/4)
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
plans without ever loading it. Meanwhile `AGENT_BOOTSTRAP.md`'s ten stop-and-ask checkpoints
— two of them open-ended judgment calls — are the only phase guidance that *is* always
loaded, with no counterweight saying Phases 4–7 proceed without asking. Skipping the human
gates and inventing new ones are the same defect with one cause: asymmetric context, not
comprehension.

The parent project did not have this gap.
`docs/research/provegate-bootstrap/source-snapshot/rules/prd-workflow.mdc` is a
glob-attached rule mapping each phase to its prompt file. **Extraction carried the method and
left the delivery mechanism behind.**

> ## This ships a ONE-WAY INSTALL, and that is the whole scope
>
> `gate init --prompts` renders the protocols into a consuming repository and **behaves
> exactly like every other `init` plan: additive-only, `wx`, an existing path is reported as
> skipped and never touched.** There is no upgrade path, no receipt, no reconciliation, no
> exception store and no `sync`. Re-installing after a package upgrade is: **delete every path
> the command printed, then run it again** — the store tree *and* the two adapter destinations
> that live outside it. The command prints that set on every run, and the instruction is stated
> there, in the store's generated README and in `NEXT_STEPS.md`, not buried here.
>
> This boundary is the remediation. Four independent readiness rounds scored the previous
> ten-FR version 5.73, 5.90, 5.63 and 4.53, and **every mechanism defect in the final round
> lived in the lifecycle** — an upgrade path that could not terminate, an exception that
> permanently blocked `init`, a receipt whose own preflight status broke under either reading,
> an activation predicate the config loader erased. The parts beneath those layers were
> re-measured exact in that same round and called strong. So the layers are gone: they are
> **PRD-030's**, and PRD-030's first requirement is now to author the state-transition model
> they were missing, before it builds anything. **A promise not made is not a gap; a broken
> upgrade path is.**

---

## 2. Goals

### Primary Goals

- [ ] Every phase protocol reaches a consuming repository's filesystem, resolved against
      that repository's `workflow.config.json`.
- [ ] Activation is an explicit opt-in that survives the config loader.
- [ ] Every file in the package's source directories has a disposition, and one matching no
      rule **fails the plan by name** rather than being silently dropped.
- [ ] A placeholder with no value fails the render by name; a literal that is not a token is
      never consumed.
- [ ] The installer's existing contract is unchanged: additive-only, nothing overwritten, and
      a repository that has not opted in behaves byte-identically to today.

### Success Metrics

| Metric                                                       | Current | Target | Measurement                                                     |
| ------------------------------------------------------------ | ------- | ------ | ----------------------------------------------------------------- |
| Phase protocols reachable on a repo's filesystem after init   | none    | all    | store inventory after `gate init --prompts` in a scratch repo      |
| Package files with no disposition                             | n/a     | 0      | the plan fails naming any unmatched file                          |
| Values an adopter must supply that cannot affect the output   | n/a     | 0      | required set derived from the rendered corpus, asserted by test    |
| Existing files any command in this PRD writes over            | n/a     | 0      | additive-only `wx`; an existing path is skipped and reported      |
| Behaviour change for a repository that has not opted in       | n/a     | none   | byte-identical to the pre-PRD build, held by test                 |

---

## 3. User Stories

#### User Story 1

```
As an adopter who just installed provegate,
I want one command to put the phase protocols where my agent will read them,
so that the gated method I installed is the method my agent follows.
```

**Acceptance Criteria:**

- [ ] After opting in and supplying the required values, `gate init --prompts` writes the
      store and the adapters.
- [ ] Running it before those values are supplied **fails with the list**, writing nothing.
- [ ] No pre-existing file anywhere is overwritten, shadowed, or reordered — including
      `CLAUDE.md`, `AGENTS.md` and `.cursor/rules/brain.mdc`.

#### User Story 2

```
As an adopter whose package was upgraded,
I want to know plainly what this tool will and will not do about it,
so that I am not waiting for an upgrade path that does not exist.
```

**Acceptance Criteria:**

- [ ] Re-running `gate init --prompts` reports every existing path as skipped and changes
      nothing.
- [ ] Every run prints the complete generated path set, including the two adapter destinations
      outside the store directory.
- [ ] The command's output, the store's generated README and `NEXT_STEPS.md` all state that
      reinstalling means deleting **every path in that set** — not just the store directory —
      and that reconciliation is a later release.
- [ ] Following the stated procedure after a package upgrade leaves **no file carrying the
      previous version's banner**, which is what makes the instruction correct rather than
      merely present.
- [ ] Nothing in the shipped documentation implies a `sync`, a receipt or an exception.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1**: `WorkflowConfig` gains a `prompts` block shaped **exactly like `memory`**, which
   is the activation mechanism this codebase already chose and documented:
   `enabled` (boolean, **default `false`**), `dir` (default `.provegate`), `adapters`
   (ordered subset of `claude-code`, `cursor`, `codex`; default all three), and `values`
   (`Record<string, string | null>`).

   **`enabled` is the predicate, never presence.** `mergeConfig` is
   `deepMerge(DEFAULT_CONFIG, parsed)` at `load.ts:216`, so once the block has defaults
   `merged.prompts` is always present and a presence test can never be false.
   `defaults.ts:95-101` says exactly this about `memory`: *"the conventional layout an opt-in
   repository gets, **not an implicit activation**: nothing reads them while `enabled` is
   false."* This FR copies that precedent rather than rediscovering why it exists.

   Validation is placed against what each surface can actually do, which the predecessor got
   wrong in two ways:

   - **Shape only, in the raw pass.** `values` needs a **new `Spec` kind**,
     `stringOrNullRecord`: an object mapping strings to `string | null`. The existing
     `stringRecord` is not usable — `validate.ts:149-155` rejects any value that is not a
     string **or is empty**, which is precisely the two values FR-4 declares legal.
   - **Unknown keys are NOT a raw-pass check.** The legal key set is the rendered corpus's
     token set, which lives in package Markdown that the config loader neither reads nor
     should. An unknown key is therefore a **fourth render diagnostic** — `unused`, naming the
     key and the tokens the corpus actually requires — alongside malformed, undeclared and
     unresolved. The alternative, a TypeScript constant of legal keys, is rejected explicitly:
     it would make PRD-031 unable to add `{{AUTONOMY_MODE}}` without a code edit its own
     Non-Goals forbid, which is what keeps that item parallel to PRD-030.
   - **Containment is a sibling of `memoryPathsContained` in `load.ts`, not a change to
     `validateResolvedConfig`.** That function takes a structural config object and **no
     repository root** (`validate.ts:194`), so it cannot resolve a path; `memoryPathsContained`
     takes the root and is composed at `load.ts:273`. The new check goes beside it and reuses
     its longest-existing-prefix resolution so a not-yet-created `.provegate` is not refused.
   - **Targets:** `packages/provegate/src/core/config/types.ts::WorkflowConfig`,
     `packages/provegate/src/core/config/types.ts::PromptsConfig`,
     `packages/provegate/src/core/config/defaults.ts`,
     `packages/provegate/src/core/config/validate.ts::Spec`,
     `packages/provegate/src/core/config/validate.ts::validateConfig`,
     `packages/provegate/src/core/config/load.ts::promptsPathContained`,
     `packages/provegate/src/core/config/load.ts`

2. **FR-2**: The source domain is **every regular file at any depth** under the package's
   `prompts/` and `templates/`. Dispositions are an **ordered** list; first match wins, exact
   paths precede patterns, and **a file matching no rule fails the plan by name**, listing the
   dispositions available. That refusal is what makes the domain total.

   | # | Rule                                               | Disposition                    | Destination                                  |
   | - | -------------------------------------------------- | ------------------------------ | -------------------------------------------- |
   | 1 | any symlink                                        | **refuse the plan by name**    | —                                            |
   | 2 | `prompts/README.md`, `templates/README.md` (exact) | not emitted                    | —                                            |
   | 3 | `prompts/PLACEHOLDERS.md` (exact)                  | copied verbatim, FR-3 exempt   | `<dir>/prompts/PLACEHOLDERS.md`              |
   | 4 | `prompts/_fragments/**`                            | not emitted — render **input** | —                                            |
   | 5 | `prompts/**/*.md`                                  | rendered                       | `<dir>/prompts/<path relative to prompts/>`  |
   | 6 | `templates/*-template.md` (direct children only)   | rendered                       | `<dir>/templates/<basename>`                 |

   Rule 5 preserves the relative path; rule 6 is restricted to direct children so nothing
   flattens. Rule 4 precedes rule 5 deliberately: fragments are inputs and must never be
   reachable as outputs. Destinations are compared **case-folded and NFC-normalised** and a
   collision fails the plan naming both sources. Symlinks are refused rather than followed
   (which reads outside the shipped tree) or skipped (which drops content silently); the
   diagnostic names the file so an adopter can replace it with a regular file. The store also
   receives a **generated** `<dir>/README.md` stating that the tree is generated, which package
   version produced it, that two adapter destinations live outside this directory, and that
   reinstalling means deleting every path the command prints.

   *Corpus measurement, not specification* — the rules are the specification; today they select
   12 rendered protocols, 7 rendered templates, 1 verbatim and 2 not emitted, and a test pins
   the resulting path set.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::DISPOSITIONS`,
     `packages/provegate/src/core/run/prompts.ts::planStore`,
     `packages/provegate/src/core/run/prompts.ts::assertNoCollision`

3. **FR-3**: `renderPrompts(packageDir, config)` returns a `Map<string, string>` of
   repo-relative path to content, and is **pure** — no writes, no clock, no environment read.
   Every rendered file carries a generated-file banner naming the package version and the
   reproducing command; the banner is the first line **except where a format requires
   frontmatter first**, in which case it follows the closing `---` (every `.cursor/rules/*.mdc`
   here and in the snapshot opens with `---` on line 1). The verbatim file of FR-2 carries no
   banner, because a banner would be a substitution.

   Token handling has a grammar and substitution is **one pass over the source**:
   - Two candidate classes, **escape matched first**: an **escape candidate** is `{{` followed
     by one or more `!`; a **token candidate** is `{{` followed by an uppercase ASCII letter.
     The order is load-bearing — under a token-only rule `{{!NAME}}` is not a candidate at all
     and the escape below would be unreachable.
   - Text in neither class — `{{lowercase}}`, `{{ spaced }}`, `{{1}}` — passes through
     untouched.
   - A token candidate is a **token** when it matches `{{` + `[A-Z][A-Z0-9_]*` + `}}` **on one
     line**; otherwise it is **malformed** and fails by name.
   - A well-formed token absent from the registry is **undeclared** and fails. In a method
     corpus an unregistered `{{JSON}}` is likelier an author's typo than deliberate Mustache;
     the cost is stated rather than hidden, and the escape is the remedy.
   - `{{!NAME}}` renders the literal `{{NAME}}`, recursively: `{{!!NAME}}` renders `{{!NAME}}`.
   - Occurrences are collected **before** any replacement and each is replaced once with its
     value treated as **opaque**, so a value containing `{{X}}` is emitted as-is and
     replacement order cannot matter.
   - Four failures, four messages — **malformed**, **undeclared**, **unresolved**, and
     **unused** (a `values` key no rendered token consumes; see FR-1 for why this is a render
     check rather than a config-load one) — each naming the file and line, or the key. The
     refusal is proved against the **shipped corpus with an empty `values` map**.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::renderPrompts`,
     `packages/provegate/src/core/run/prompts.ts::scanTokens`,
     `packages/provegate/src/core/run/prompts.ts::substituteOnce`,
     `packages/provegate/src/core/run/prompts.ts::bannerFor`

4. **FR-4**: The required-value set is **derived from the rendered corpus**, never from the
   registry. It is the tokens FR-3 finds in the files FR-2 dispositions as *rendered*, minus
   those a config field supplies. Measured today the rendered corpus uses 16 distinct tokens,
   seven config-backed, so **nine** are required of an adopter; the registry's other four —
   `{{LINK_TO_VISION_DOC}}`, `{{ONE_LINE_PRODUCT_FRAMING}}`, `{{PROJECT_SPECIFIC_HARD_RULES}}`,
   `{{VISION_OR_DECISIONS_DOC}}` — occur in **zero** rendered files and only in
   `practices/templates/AGENT_BOOTSTRAP.template.md`. Config-backed tokens resolve
   automatically: `{{BASE_BRANCH}}`, `{{ID_PREFIX}}`, the four `{{CMD_*}}`, `{{MEMORY_ROOT}}`.
   The mapping derives from `PLACEHOLDERS.md`, and a registry row naming a config path
   `WorkflowConfig` lacks fails a package test.

   **Unset is `null` or absence**, never an in-band marker, which would make some legitimate
   string unrepresentable. **The empty string is legal per token**: the registry gains an
   `empty` column, `allowed` for prose blocks a project may have nothing to say in
   (`{{DOMAIN_CHECKS}}`, `{{ENV_NOTES}}`), refused elsewhere — an empty `{{ARCHITECTURE_DOC}}`
   renders a protocol telling an agent to read nothing.

   **Discovering the required set never depends on a write.** `gate init --prompts` prints the
   complete `prompts` block — every required key with `null`, every meaning — whether or not it
   writes a config file. A repository that already has a `workflow.config.json` therefore learns
   exactly what to paste, and **that is the only activation path an existing repository has**,
   stated here rather than left to be discovered.

   A token may additionally be declared **enumerated**: the registry names its legal values and
   the package ships one fragment per value at `prompts/_fragments/<TOKEN>.<value>.md`; the
   config supplies the key and the render substitutes the fragment. A value outside the set
   fails by name; a declared value with no fragment, and a fragment containing a token
   candidate, each fail a **package test and the render** — **not "at build time"**, because
   the package's `build` is a single `tsup` invocation with no content validation, and a
   requirement wired to a boundary that does not exist is the `gate-wire-or-delete` failure.
   Interacting legal values across two enumerated tokens are **out of scope and refused**; a
   composite enumeration is the answer if one is ever needed. This PRD ships the mechanism and
   **zero** enumerated tokens.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::requiredValues`,
     `packages/provegate/src/core/run/prompts.ts::CONFIG_BACKED`,
     `packages/provegate/src/core/run/prompts.ts::enumeratedTokens`,
     `packages/provegate/prompts/PLACEHOLDERS.md`,
     `packages/provegate/test/content-placeholders.test.ts`

5. **FR-5**: `gate init --prompts` installs the store and the adapters **under the installer's
   existing contract, unchanged**: writes are `wx`, an existing path is reported as skipped and
   never touched, and `--dry-run` prints the plan and writes nothing. There is **no preflight
   comparison and no mismatch refusal** — this plan behaves like the base and practices plans,
   which is what keeps `gate init`'s additive-only promise intact for every caller rather than
   carving out an exception that would then have to be scoped.

   The command **writes nothing at all** when a required value is unresolved — no store file,
   no adapter, and no starter config — and lists each token with its meaning. "Nothing" is the
   word used everywhere in this document; the predecessor said "no store file" in two places
   and "nothing" in a third, which left a refused run's residue undefined and, because writes
   are `wx` and nothing deletes, permanent. It composes with `--practices` and works without it.

   **Every run prints the complete set of generated paths** — written and skipped alike,
   including the two adapter destinations outside `<dir>` — because that set is what the
   reinstall procedure operates on. The prompt plan's actions append to the existing plan and
   inherit `initWorkspace`'s ordering, which validates every planned path before writing any of
   them and writes activation files last (`init.ts:265-275`); this FR does not change that
   invariant and the config write stays last.
   `templates.prd` is set to the rendered PRD template only in a starter config it writes
   itself; an existing config is never edited and the value to set is printed. **`gate init
   --practices` alone installs no store** — `PACK_MAP` is a static table and cannot emit a
   config-dependent render — and `NEXT_STEPS.md` names the command that does.

   **Re-installation is: delete every path the command printed, then re-run.** Not "delete the
   store directory" — `.claude/commands/prd-*.md` and `.cursor/rules/prd-workflow.mdc` live
   outside it, and deleting only `<dir>` leaves them at the previous package version with stale
   banners and stale store paths while the adopter believes they have reinstalled. The command's
   summary states the full instruction and the paths it applies to. No command in this PRD
   deletes anything.
   - **Targets:** `packages/provegate/src/core/run/init.ts::planPrompts`,
     `packages/provegate/src/core/run/init.ts::starterConfig`,
     `packages/provegate/src/core/run/init.ts::runInit`,
     `packages/provegate/src/cli.ts::runInit`

6. **FR-6**: `renderAdapters(config)` emits one adapter per configured tool, each carrying a
   **path and no protocol prose**, at destinations this FR names explicitly:
   - `claude-code` → `.claude/commands/prd-<phase>.md`, one per phase: banner, one `#` heading,
     one fixed directive sentence, one fenced block whose info string is empty and whose sole
     line is the store-relative protocol path. Nothing else.
   - `cursor` → `.cursor/rules/prd-workflow.mdc`: frontmatter first with exactly `description`,
     `globs` and `alwaysApply` in that order; then the banner; then one `##` heading; then one
     table of exactly two columns (`Phase`, `Protocol`) with one row per phase **in phase
     order**, each cell a phase name or a store path.
     **`globs` derivation, exactly:** for each entry of `config.dirs.artifacts` in declared key
     order (`prd`, `readiness`, `tasks`, `summary`), emit `<entry.dir>/**/*.md`; join with
     `, ` into a **single unquoted scalar on one line**. That is the form the source snapshot's
     own `rules/prd-workflow.mdc` uses, and a test pins the rendered line rather than the
     algorithm. `dirs.artifacts` is a map of `{dir, prefix}` records, not globs — the prefix is
     not used.
   - `codex` → `<dir>/AGENTS.md.provegate.snippet`: one `##` heading and the same table.
     **A snippet, never a write to `AGENTS.md`.**

   **Two of the three destinations are OUTSIDE `<dir>`**, and that is the reinstall unit's
   definition: the generated set is the store tree **plus** `.claude/commands/prd-*.md` and
   `.cursor/rules/prd-workflow.mdc`. FR-5 requires the command to print that complete set on
   every run for exactly this reason.

   A test validates that grammar. `planPractices` states that agent-entrypoint files are
   deliberately absent from the pack so an existing entrypoint is never touched; that invariant
   holds unchanged for `CLAUDE.md`, `AGENTS.md` and `.cursor/rules/brain.mdc`, and is
   **narrowed** — a file at a provegate-namespaced path the adopter does not own is a generated
   adapter, not an entrypoint. The narrowing is written into the `planPractices` comment and
   into an ADR. The two tool-shaped protocols the package ships under `prompts/adapters/`,
   which `prompts/README.md` calls "tool-shaped entry points", are **protocols rendered by
   FR-2** and legitimate pointer targets, not adapters.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::renderAdapters`,
     `packages/provegate/src/core/run/prompts.ts::ADAPTER_GRAMMAR`,
     `packages/provegate/src/core/run/init.ts::planPractices`,
     `packages/provegate/practices/shims/AGENTS.md.snippet`,
     `_brain/adr/ADR-0002-agent-protocol-delivery.md`

7. **FR-7**: `gate init --practices` gains the adopter instructions: `NEXT_STEPS.md` names
   `gate init --prompts`, says the required values are printed by that command, says where the
   store **and the two out-of-store adapter destinations** land, and **states the one-way
   boundary in the adopter's own words** — this version installs once, reinstalling means
   deleting every path the command prints, and reconciliation is a later release. `PACK_MAP` gains only static files; no rendered output enters the pack, and
   `verify:pack-drift` is green on both sides.
   - **Targets:** `packages/provegate/practices/NEXT_STEPS.md`,
     `packages/provegate/src/core/run/init.ts::PACK_MAP`,
     `packages/provegate/test/pack-manifest.json`,
     `packages/provegate/test/practices-pack.test.ts`,
     `packages/provegate/test/pack.test.ts`

---

## 5. Non-Goals (Out of Scope)

- **Every part of the store lifecycle — PRD-030.** No receipt, no ledger, no reconciliation,
  no `doctor --prompts`, no `sync`, no exceptions, no upgrade path, no rollback. Four readiness
  rounds located every mechanism defect in that layer; it is removed here, and PRD-030's first
  requirement is now to author the state-transition model it needs before it builds anything.
- **Editing an adopter's existing `workflow.config.json`.** The block is printed, never written
  into a file that exists. That is the only activation path for an existing repository and FR-4
  says so.
- **Any enumerated token's content — PRD-031.** FR-4 ships the mechanism and zero tokens.
- **This repository consuming its own store — PRD-032.**
- **Overwriting, deleting, or reconciling anything.** The installer's additive-only contract is
  unchanged and no exception to it is carved.
- **A machine-checkable Phase 3 "Go" gate**, and **an agent driver for Phases 4–7.**
- **Rewriting phase-protocol content.** This PRD renders `prompts/` and never edits it, except
  `PLACEHOLDERS.md` and there only for the `empty` and enumerated columns, which are registry
  structure rather than method prose. The registry is absent from `source-snapshot/prompts/` and
  unmentioned in its `MANIFEST.md`, so it is an extraction artifact and its columns are not
  snapshot-traceable content.
- **A prompts registry, marketplace, or remote fetch.** Nothing here reaches the network.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a repository whose config omits `prompts` or sets `enabled: false`, **When** every
  command runs, **Then** behaviour is byte-identical to the pre-PRD build.
- **Given** `DEFAULT_CONFIG` now contains a `prompts` block, **When** a config that never
  mentions `prompts` is resolved, **Then** `merged.prompts.enabled` is `false` and no store
  code executes — presence is never the predicate.
- **Given** a repository that already has a `workflow.config.json`, **When**
  `gate init --prompts` runs, **Then** the config is byte-identical afterwards and the command
  prints the complete `prompts` block with every required key and its meaning.
- **Given** every required value supplied, **When** the command runs, **Then** the store and
  the adapters are written and every rendered file resolves every token.
- **Given** a store that already exists, **When** the command is re-run, **Then** every
  existing path is reported as **skipped**, nothing is written over, and the summary prints the
  complete generated set and states that reinstalling means deleting all of it first.
- **Given** a v1 install and an upgraded package, **When** the adopter follows the printed
  reinstall instruction exactly and re-runs, **Then** **no generated file carries the v1
  banner** — including `.claude/commands/prd-*.md` and `.cursor/rules/prd-workflow.mdc`, which
  are outside the store directory and which a delete-the-directory instruction would have left
  stale.
- **Given** a run refused for an unresolved value, **When** the filesystem is inspected,
  **Then** it is byte-identical to before the run — no store file, no adapter, no starter
  config.
- **Given** a package file matching no disposition rule — a `.txt` beside a protocol, or a
  nested `templates/legacy/x-template.md` — **When** the plan is built, **Then** it fails
  naming that file and the dispositions available.
- **Given** a symlink under `prompts/`, **When** the plan is built, **Then** it is refused by
  name, neither followed nor skipped.
- **Given** a file under `prompts/_fragments/`, **When** the plan is built, **Then** rule 4
  matches before rule 5 and it is not emitted.
- **Given** `{{!CMD_TEST}}` and `{{!!CMD_TEST}}`, **When** the render runs, **Then** the output
  contains `{{CMD_TEST}}` and `{{!CMD_TEST}}` — the escape class matches before the token class.
- **Given** `{{lowercase}}` or `{{ spaced }}`, **When** the render runs, **Then** the text
  passes through untouched.
- **Given** `{{TO` at end of line and `KEN}}` on the next, **When** the render runs, **Then**
  it fails as malformed.
- **Given** a value whose text contains `{{ID_PREFIX}}`, **When** the render runs, **Then** it
  is emitted verbatim and not reported as unresolved.
- **Given** a required token whose registry `empty` column is not `allowed` and whose value is
  `""`, **When** the render runs, **Then** it fails naming the token.
- **Given** an unknown key in `prompts.values`, **When** the **render** runs, **Then** it fails
  with the `unused` diagnostic naming that key and the tokens the corpus requires. The config
  load does **not** refuse it: the legal key set is package Markdown the loader must not read,
  which is FR-1's stated reason for moving the check.
- **Given** a fragment containing a token candidate, **When** the package test suite runs,
  **Then** it fails — and no requirement anywhere claims a build-time boundary.
- **Given** the rendered `.cursor/rules/prd-workflow.mdc`, **When** its first line is read,
  **Then** it is `---`, the frontmatter keys are exactly the three named in FR-6 in order, and
  the banner follows the closing `---`.
- **Given** every generated adapter, **When** the grammar test runs, **Then** each conforms to
  its skeleton and nothing else is present.
- **Given** an existing `AGENTS.md`, **When** the command runs, **Then** it is byte-identical
  afterwards and the Codex adapter is emitted as a snippet inside the store.
- **Given** `gate init --practices` alone, **When** it completes, **Then** no store exists and
  `NEXT_STEPS.md` names the command that creates one and states the one-way boundary.

---

## 7. Technical Considerations

### Architecture

**The scope is the remediation.** Readiness iterations 2–5 scored the ten-FR predecessor 5.73,
5.90, 5.63 and 4.53, and iteration 5's six mechanism defects were all in one layer: an upgrade
that could not terminate, an exception that permanently blocked `init`, a receipt whose own
preflight status broke under either reading, an activation predicate the config loader erased.
The layer beneath them — dispositions, token grammar, the derived value set — was re-measured
exact in that same round and called strong. **Removing the layer removes the defects, and it
removes them by not promising what the design could not deliver.**

**No preflight is the load-bearing simplification.** The predecessor added a mismatch refusal to
`init`, which then had to be scoped away from the base and practices plans, and which made the
prescribed apply path — delete one file, re-run — fail on every other file. Dropping it returns
this plan to the contract every other `init` plan already has: additive-only, skip what exists,
report it. One rule, no exception to scope, no dead end.

**Activation follows `memory`, deliberately.** `mergeConfig` deep-merges defaults, so a presence
test on `prompts` can never be false once the block has defaults. `defaults.ts:95-101` already
records this decision for `memory` and states the reasoning; the predecessor picked the rejected
mechanism without mentioning the precedent. `enabled: false` is the shape, copied rather than
re-derived.

**Discovery without a write.** Printing the config block regardless of whether one is written is
what lets an existing repository — including this one — learn its required values. The
predecessor tied discovery to scaffolding, which only happens where no config exists, which is
nowhere that matters.

**Prerequisites and serialization.** PRD-026 declares `core/run/init.ts`, `cli.ts`,
`practices/NEXT_STEPS.md`, `test/init.test.ts`, `test/pack-manifest.json` and
`test/practices-pack.test.ts` — six paths this PRD also claims, additively rather than
semantically. Intended order: **this PRD first, PRD-026 absorbing its pack entries.** PRD-024
does not overlap. PRD-030, PRD-031 and PRD-032 are strictly downstream. **Re-run `gate queue`
before Phase 3 rather than trusting this paragraph** — it has gone stale twice here within hours.

### Dependencies

- No new runtime dependency. `packages/provegate` takes zero, permanently.
- No prerequisite work item. Nothing here reaches the network; nothing adds a push code path.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/config` — the `prompts` block and its two-pass validation
- [ ] `packages/provegate/src/core/run/prompts.ts` — dispositions, render, token grammar, values, adapters
- [ ] `packages/provegate/src/core/run/init.ts` — the `--prompts` plan, starter config, `PACK_MAP`
- [ ] `packages/provegate/src/cli.ts` — `init --prompts`
- [ ] `packages/provegate/prompts/PLACEHOLDERS.md` — the `empty` and enumerated columns
- [ ] `packages/provegate/practices/NEXT_STEPS.md` — adopter instructions and the one-way boundary
- [ ] `_brain/adr/ADR-0002-agent-protocol-delivery.md` — the delivery decision

---

## 9. Open Questions

- (none)

---

## 10. References

- `_readiness/wip/readiness-029-method-delivery-agent-binding.md` — iterations 1–5; this scope cut answers iteration 5's band action
- `packages/provegate/src/core/config/defaults.ts:95-101` — the `memory` activation precedent FR-1 copies
- `packages/provegate/src/core/config/load.ts:216, 267-273` — the deep merge and the two validation passes
- `packages/provegate/prompts/PLACEHOLDERS.md` — the registry FR-4 derives from and extends
- `packages/provegate/prompts/README.md` — calls `adapters/` "tool-shaped entry points"
- `packages/provegate/src/core/run/new.ts:112-170` — the existing substitution and template fallback
- `packages/provegate/src/core/run/init.ts::planPractices` — the entrypoint invariant FR-6 narrows
- `packages/provegate/package.json` — `build` is one `tsup` invocation, which is why FR-4 names tests
- PRD-030, PRD-031, PRD-032 — the deferred lifecycle, method content, and dogfood

---

## Memory Inputs

Records from the memory index this work item considered, each with a disposition and a
rationale. `applied` — the record changed this work item's shape. `reviewed` — it was read
and found not to change it, but is close enough that a reader deserves to know it was
considered. `not-applicable` — its watch or subject matched, and it does not apply here.
A rationale is required in every form, including `none`: an unreasoned `none` is the
ceremonial answer this contract exists to prevent.

Required in a memory-enabled repository, alongside Memory Outputs below.

- applied: `shipped-content-needs-a-delivery-gate` — **this PRD's own Memory Output**, and its
  watch (`packages/provegate/prompts/**`, `core/run/init.ts`) covers files this merge changes,
  so the contract requires a disposition even though the record did not exist when the work
  started. It is applied in the strongest sense available: the record states that packaging is
  not delivering and that no artifact-checking gate detects the gap, and FR-5 and FR-7 are the
  delivery this repository was missing. Written mid-flight because the trap was hit, per the
  memory protocol, rather than at close.
- applied: `derive-the-requirement-from-the-consumer` — also this PRD's own output, watching
  `prompts/PLACEHOLDERS.md` and `core/run/prompts.ts`, both changed here. FR-4 is the record:
  the required-value set is computed as the tokens the RENDERED corpus consumes minus the
  config-backed ones, never read off the registry, and a test asserts the derived count so it
  moves when the corpus moves.
- applied: `scope-out-the-layer-the-rounds-keep-hitting` — the third of this PRD's own outputs,
  watching `_prds/**` and `_readiness/**`, which the merge diff necessarily changes. It is the
  record of why this document has the shape it has: four rounds put every mechanism defect in
  the store-lifecycle layer while measuring the layers beneath exact, so the layer was removed
  rather than repaired. Applied at the level of the item's scope, which is the only level it
  could be applied at.
- applied: `strictness-added-during-extraction-is-a-behavior-change` — its watch covers
  `packages/provegate/src/core/run/**`. Four rounds found this record declared and not applied
  to that round's own new refusals. It is applied here by **removing** a refusal rather than
  scoping it: FR-5 has no preflight, so `gate init`'s additive-only contract needs no carve-out
  and no caller changes behaviour. The refusals that remain are the render's own, and each
  names its remedy.
- applied: `a-rule-corrected-survives-where-it-is-restated` — its watch covers `_prds/**`. Five
  rounds, five instances. The structural answer here is that a deleted mechanism has no
  restatements to go stale: there is no receipt, no exception and no sync anywhere in this
  document, so the class of defect that produced nine live contradictions in PRD-030 cannot
  recur in it.
- applied: `narrow-the-grammar-not-the-parser` — FR-3's two candidate classes and FR-4's
  terminal fragments with a stated ceiling. Both narrow what the input may be rather than
  growing the reader.
- applied: `gate-wire-or-delete` — FR-4 names package tests and the render as the surfaces
  enforcing fragment rules, because the package's `build` is one `tsup` invocation. A
  requirement wired to a boundary that does not exist was iteration 5's finding, in a document
  that declared this record applied.
- applied: `evidence-pattern-satisfied-by-the-template` — its watch covers
  `packages/provegate/templates/**`, which FR-2 renders. FR-3's refusal is proved against the
  shipped corpus with an empty values map, and the `PLACEHOLDERS.md` exemption is by
  disposition rather than a token allowlist.
- applied: `false-green-on-missing-file` — FR-2's unmatched-file refusal: a check over a file
  set fails on the unexpected member rather than skipping it.
- applied: `fixture-must-reach-production-shape` — its watch covers
  `packages/provegate/src/cli.ts`, which FR-5 targets. The `--prompts` regressions run through
  the real argument path, not by calling `planPrompts` with tidier arguments than the CLI
  supplies.
- applied: `assert-absent-needs-an-independent-cause` — its watch covers
  `packages/provegate/test/**`. FR-5's "writes nothing at all when a value is unresolved" and
  FR-6's "AGENTS.md byte-identical" both need a scenario in which something would otherwise
  have written.
- applied: `absence-must-be-asserted` — the unresolved-value case is a "must NOT exist"
  requirement over the whole store, so the test asserts the destination set is empty rather
  than grepping for one absent path.
- applied: `adr-section-blank-line-reads-empty` — its watch covers `_brain/adr/**`, and FR-6
  writes ADR-0002. `## Context` must be followed immediately by prose or `verify:brain` fails;
  the parser fix is an open deferral, so the ADR is written around it.
- reviewed: `two-parsers-wrong-together` — FR-4 derives the mapping and the enumerated values
  from `PLACEHOLDERS.md`, so the registry is one authority; FR-3's grammar is its reader's
  specification.
- reviewed: `docs-outlive-the-gate-they-promise` — its watch covers `AGENT_BOOTSTRAP.md`, which
  this PRD does not target; that edit is PRD-031's. Recorded because the whole item is an
  instance of the pattern.
- not-applicable: `known-red-ledger-must-expire` — this PRD has no allowlist and no ledger; the
  record binds on PRD-030, where the exceptions store now lives.
- not-applicable: `push-is-human-by-omission` — no code path here reaches a remote, and the
  record's rule is preserved by adding nothing.

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
  content reaches agents as a rendered store installed **one way**, that conditional content is
  an enumerated token resolving to terminal package-shipped fragments, and the narrowing of the
  entrypoint invariant that made generated adapters possible.
- learning: `_brain/learnings/shipped-content-needs-a-delivery-gate.md` — packaging a protocol
  is not delivering it: content published in a package but never installed into a consuming
  repository is invisible to every agent, and no existing gate detects it, because every gate
  checks what the artifacts say rather than what the agent read.
- learning: `_brain/learnings/derive-the-requirement-from-the-consumer.md` — a required-input
  set derived from the catalogue rather than from what the consumer reads produces refusals
  nobody can satisfy meaningfully; the catalogue is a superset by construction and the failure
  looks like diligence.
- learning: `_brain/learnings/scope-out-the-layer-the-rounds-keep-hitting.md` — when successive
  independent reviews put every mechanism defect in one layer of a work item while measuring
  the layers around it exact, the answer is to remove that layer from the item rather than
  repair it in place; the reviews were locating a scope error and reporting it as a sequence of
  design errors, and four remediations each fixed the named counterexample and produced a new
  one.

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
- `packages/provegate/prompts/PLACEHOLDERS.md`
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
- `_brain/learnings/derive-the-requirement-from-the-consumer.md`
- `_brain/learnings/scope-out-the-layer-the-rounds-keep-hitting.md`

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- ADR: `_brain/adr/ADR-0002-agent-protocol-delivery.md` — one-way rendered-store delivery, enumerated tokens over a template language, grammar-checked adapters, the narrowed entrypoint invariant
- `_brain/learnings/shipped-content-needs-a-delivery-gate.md` — packaging is not delivery; no existing gate detects content that ships and never installs
- `_brain/learnings/derive-the-requirement-from-the-consumer.md` — a requirement derived from the catalogue rather than the consumer refuses what nobody can satisfy
- `_brain/learnings/scope-out-the-layer-the-rounds-keep-hitting.md` — when every defect across rounds lands in one layer, the reviews are locating a scope error; remove the layer
- `_brain/INDEX.md` — one pointer line per record above, per the memory protocol
- `_docs/reviews/review-029-method-delivery-agent-binding.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                                  | Scope | Notes                                                                                                                         |
| ---- | ---------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| FR-1 | `pnpm --filter provegate test test/config.test.ts`               | pkg   | a config never mentioning prompts resolves to enabled false; a null and an empty string both pass the new shape; a missing dir passes containment |
| FR-2 | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | ordered dispositions with rule 4 before rule 5; unmatched file and symlink each fail by name; nested paths preserved              |
| FR-3 | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | escape class matched first and recursive; lowercase and spaced braces pass through; malformed, undeclared, unresolved and unused are four distinct diagnostics, the last for a values key no rendered token consumes |
| FR-4 | `pnpm --filter provegate test test/content-placeholders.test.ts` | pkg   | nine required; the four practices-only tokens excluded; the per-token empty policy; a fragment carrying a candidate fails         |
| FR-5 | `pnpm --filter provegate test test/init.test.ts`                 | pkg   | a refused run leaves the filesystem byte-identical; a re-run reports every existing path skipped; an existing config untouched    |
| FR-5 | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | the printed generated set equals the plan's destinations, and following the reinstall instruction across a version bump leaves no path carrying the old banner |
| FR-6 | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | each adapter conforms to its named destination and skeleton; a fixture that already has AGENTS.md leaves it byte-identical        |
| FR-7 | `pnpm verify:pack-drift`                                         | repo  | the new pairs reconcile on both sides with no orphan packed file and no lost live copy                                          |
| FR-7 | `pnpm --filter provegate test test/pack.test.ts`                 | pkg   | the shipped-file allowlist matches the packed tarball after the additions                                                       |

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
- DO NOT add a receipt, a ledger, a reconciliation check, an exceptions store, a `doctor`
  branch, a `sync` verb, or any upgrade path. They are PRD-030's, and four readiness rounds put
  every mechanism defect in that layer.
- DO NOT add a preflight or a mismatch refusal to any `init` plan. This plan is additive-only
  like every other one; an exception would have to be scoped, and the scoping is what produced
  a prescribed apply path that could not run.
- DO NOT overwrite or delete anything, and DO NOT edit an adopter's existing
  `workflow.config.json`. The block is printed.
- DO NOT make presence of the `prompts` block the activation predicate. `mergeConfig`
  deep-merges defaults, so it can never be false. `enabled` is the predicate, as `memory` does.
- DO NOT claim a build-time boundary. The package's `build` is one `tsup` invocation; name
  tests or the render.
- DO NOT state the emitted set as a count *as the specification*. The rules plus the
  unmatched-file refusal are the specification; the corpus figures are a labelled measurement
  with a pinning test.
- DO NOT follow a symlink or silently skip one. Refuse by name, with the remedy.
- DO NOT render `PLACEHOLDERS.md`, and DO NOT exempt anything from the token check with a token
  allowlist. Exemption is by disposition, one file, named in FR-2.
- DO NOT treat every `{{` as a token, and DO NOT match the token class before the escape class
  — `{{!NAME}}` is not a token candidate and the escape would be unreachable.
- DO NOT re-scan a substituted value, and DO NOT use an in-band sentinel for unset.
- DO NOT derive the required-value set from the registry; it covers `practices/templates/` too.
- DO NOT add a conditional block syntax, let a fragment contain a token, or approximate
  interacting enumerated values.
- DO NOT write protocol prose into a generated adapter, and DO NOT delete or rewrite
  `prompts/adapters/*` — shipped protocols this PRD renders.
- DO NOT edit any file under `packages/provegate/prompts/` except `PLACEHOLDERS.md`, and there
  only for the `empty` and enumerated columns.
- DO NOT overwrite, reorder, or append to `CLAUDE.md`, `AGENTS.md`, or
  `.cursor/rules/brain.mdc`.
- DO NOT put a banner above frontmatter, and DO NOT emit `workflow.config.json` into the store.
- DO NOT render a template without giving it a reader.
- DO NOT let the render read the clock, the environment, or the network.
- DO NOT change behaviour for a repository that has not opted in.
- DO NOT add a runtime dependency to `packages/provegate`, and DO NOT add a code path that
  reaches a git remote.

---

## Changelog

| Date       | Author | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-27 | owner  | **Iteration 7 confirmation round (7.48): six of eight items closed, four sentences left, no design decision.** All four were the same class — a rule corrected where it is owned and left standing where it is restated. The unknown-key check was moved to the render in FR-1 and FR-3 and still sent an implementer to the config layer from §6 and from the §11 FR-1 row, which would have put the test in the wrong place; that clause now sits on the FR-3 row. "Writes nothing" was correct in User Story 1, FR-5 and the new §6 criterion, and stale in a second §6 criterion twelve lines away and in a Memory Input rationale — **`grep "store file"` finds both in one command, so the sweep simply was not run**, which is why the previous Changelog row's claim that it was "stated identically in all three places" was false about the document containing it. That claim is removed rather than corrected. |
| 2026-07-27 | owner  | **Iteration 6 remediation (6.03, first round out of the 4–5.9 band).** The reinstall instruction was wrong in all five places it appeared: two of FR-6's three adapter destinations are **outside** `<dir>`, so "delete the store directory" left them at the previous version while the adopter believed they had reinstalled — the one procedure the whole scope decision rests on. The generated set is now printed on every run, the instruction names that set, and a §11 row fails today by asserting no old banner survives the documented procedure. One design decision taken: the unknown-`values`-key check **moves out of the raw pass** into the render as a fourth diagnostic, because the legal key set is package Markdown the loader must not read and a TypeScript constant would break PRD-031's no-code promise; the raw pass gets a new `stringOrNullRecord` shape, since `stringRecord` rejects both `null` and `""` — the two values FR-4 declares legal. Containment moves to a `load.ts` sibling of `memoryPathsContained`, which takes the root that `validateResolvedConfig` does not, and `load.ts` returns to Targets. The `globs` derivation is now exact. A refused run writes **nothing**. |
| 2026-07-27 | owner  | **Scope cut to a one-way install, answering iteration 5's band action (4–5.9 → return to Phase 1).** Ten FRs become seven. **The entire store lifecycle is removed** — no receipt, no reconciliation, no `sync`, no exceptions, no upgrade path — because four independent rounds put every mechanism defect in that layer while measuring the layers beneath it exact. **The preflight goes with it**, returning this plan to the additive-only, skip-if-present contract every other `init` plan has; the predecessor's carve-out is what made its prescribed apply path unrunnable. **Activation becomes `prompts.enabled: false`**, copying the shape `memory` uses at `defaults.ts:95-101`, because `mergeConfig` deep-merges defaults and a presence test can never be false. **Discovery no longer depends on a write**: the config block is printed whether or not one is written, which is the only activation path an existing repository has. FR-6 names each adapter's destination, which no previous version did. FR-4 names package tests rather than a build boundary that does not exist. The one-way limit is stated in the command's output, the store's README and `NEXT_STEPS.md`. |
| 2026-07-27 | owner  | **`_brain/INDEX.md` moved from the Conflict Surface into `workflow.config.json` `sharedAppendOnly`, after the iteration-8 PASS.** The path is append-one-pointer-per-record by protocol, which is what that list is for, and declaring it here contradicted the template's own rule against claiming shared append-only paths. This changes no FR, no Target, no verification command and no Durable Artifact — the index is still a declared Durable Artifact and Phase 7 still checks it against the merge diff. It is recorded rather than folded in silently because the document had already passed readiness when it was made. |
| 2026-07-27 | owner  | Superseded shape: four remediation rounds against readiness iterations 1–4 (split, ledger, enumerated tokens, no-overwrite). Preserved in git history at `607954a`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
