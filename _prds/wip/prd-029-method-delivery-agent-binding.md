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
plans without ever loading it. Meanwhile `AGENT_BOOTSTRAP.md`'s ten stop-and-ask checkpoints
— two of them open-ended judgment calls — are the only phase guidance that *is* always
loaded, with no counterweight saying Phases 4–7 proceed without asking. Skipping the human
gates and inventing new ones are the same defect with one cause: asymmetric context, not
comprehension.

The parent project did not have this gap.
`docs/research/provegate-bootstrap/source-snapshot/rules/prd-workflow.mdc` is a
glob-attached rule mapping each phase to its prompt file, with four per-phase siblings
beside it. **Extraction carried the method and left the delivery mechanism behind.**

This PRD builds the delivery core: a rendered, tool-neutral protocol store in the consuming
repository, thin per-tool adapters that point into it, and a receipt of what was rendered.
Delivery is a **render**, not a copy — the shipped corpus carries placeholder tokens that
`prompts/PLACEHOLDERS.md` declares, and `core/run/new.ts:112-149` already renders the PRD
template this way.

> **Scope note.** This is the delivery core of a four-item split (W1), revised against
> readiness iterations 2 and 3 (W9–W24), recorded in
> `_readiness/wip/readiness-029-method-delivery-agent-binding.md`. Reconciliation, exceptions,
> upgrade and rollback are **PRD-030**; the Phase 3 autonomy content and the
> `AGENT_BOOTSTRAP` proceed rule are **PRD-031**; this repository consuming its own store is
> **PRD-032**.
>
> Three owner decisions shape this revision. **Conditional content is an enumerated token**
> whose fragments ship in the package, so PRD-031 stays code-free and parallel to PRD-030.
> **This PRD writes a receipt.** And — taken at iteration 3, replacing an earlier design this
> document carried — **the receipt makes no ownership claim.** Iteration 3's blocking finding
> was that one file was being asked to be a receipt, an ownership manifest, a reconciliation
> scope and a migration state at once, split between two writers by prose. It is now one
> thing: a statement of which paths hold render output of a known version. Nothing acquires,
> retires, relocates or relinquishes a path, because nothing claims one.

---

## 2. Goals

### Primary Goals

- [ ] Every phase protocol reaches a consuming repository's filesystem, resolved against
      that repository's `workflow.config.json`.
- [ ] Every file in the package's source directories has a disposition, and a file that
      matches no rule **fails the plan by name** rather than being silently dropped.
- [ ] Token handling has a grammar: a literal that is not a token is never consumed, and
      malformed, undeclared and unresolved are three distinct failures.
- [ ] An adopter is asked for exactly the values the render consumes — never for one that
      cannot change a byte of the output.
- [ ] The render is planned in full before anything is written, and an incomplete store is a
      named state rather than an undetected one.
- [ ] What was rendered is recorded as a **receipt and nothing more**, so PRD-030 can
      reconcile it without either side claiming a path.

### Success Metrics

| Metric                                                       | Current | Target | Measurement                                                       |
| ------------------------------------------------------------ | ------- | ------ | ------------------------------------------------------------------- |
| Phase protocols reachable on a repo's filesystem after init   | none    | all    | store inventory after `gate init --prompts` in a scratch repo        |
| Package files with no disposition                             | n/a     | 0      | the plan fails naming any unmatched file                            |
| Values an adopter must supply that cannot affect the output   | n/a     | 0      | required set derived from the rendered corpus, asserted by test      |
| Legitimate documents or values the render refuses             | n/a     | 0      | the token candidate rule and the `null` unset marker, both by test   |
| Paths the tool claims but did not render                      | n/a     | 0      | the receipt states content, not ownership; asserted by its schema     |

---

## 3. User Stories

#### User Story 1

```
As an adopter who just installed provegate,
I want one command to put the phase protocols where my agent will read them,
so that the gated method I installed is the method my agent follows.
```

**Acceptance Criteria:**

- [ ] `gate init --prompts` writes a `prompts` config block naming exactly the values the
      render consumes, and writes the store once they resolve.
- [ ] Running it before those values are supplied **fails with the list**, and writes no
      store file at all.
- [ ] No pre-existing agent entrypoint (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules/brain.mdc`)
      is overwritten, shadowed, or reordered.

#### User Story 2

```
As a reader of a repository that has a store,
I want to know exactly which files are in it and why,
so that a file present in the package but absent from the store is a decision I can find.
```

**Acceptance Criteria:**

- [ ] Every source file has a disposition; an unmatched one fails the plan naming the file
      and the dispositions available.
- [ ] Every rendered file carries a generated-file banner, placed so that a format requiring
      frontmatter on line 1 still has it on line 1.
- [ ] `PLACEHOLDERS.md` reaches the store **unsubstituted** — it is the token registry, and
      rendering it would consume the very tokens it documents.

#### User Story 3

```
As the maintainer of a repository whose store was written months ago,
I want to know which paths hold render output and from which package version,
so that the next tool along can tell an upgrade apart from an edit without either of us
claiming to own a file.
```

**Acceptance Criteria:**

- [ ] The receipt lists every path the executed plan produced, including adapters outside
      `prompts.dir`, and records the package version.
- [ ] It says nothing about ownership, and no command derives a right to overwrite from it.
- [ ] It is written from the executed plan, never from a walk of the directory afterwards,
      and it excludes itself.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1**: `WorkflowConfig` gains a `prompts` block: `dir` (string, default
   `.provegate`), `adapters` (ordered subset of `claude-code`, `cursor`, `codex`; default
   all three), and `values` (`Record<string, string | null>` — see FR-5 for why `null`).
   Validation is split to match the loader's real two-pass shape — **`validateConfig` runs on
   the RAW parsed object at `load.ts:267`, `mergeConfig` at 272, `validateResolvedConfig`
   plus `memoryPathsContained` on the MERGED object at 273** — so shape and unknown-key
   checks for `prompts` go in the raw pass, and `prompts.dir` containment goes in the
   resolved pass beside `memoryPathsContained`. Containment **realpaths the longest existing
   prefix of the candidate and reattaches the missing tail**, and realpaths the root, before
   comparing: the default `.provegate` does not exist on first use, and a literal
   realpath-both-sides implementation would refuse every fresh repository.
   `memoryPathsContained` already solves it this way and is the reference.
   - **Targets:** `packages/provegate/src/core/config/types.ts::WorkflowConfig`,
     `packages/provegate/src/core/config/types.ts::PromptsConfig`,
     `packages/provegate/src/core/config/defaults.ts`,
     `packages/provegate/src/core/config/validate.ts::validateConfig`,
     `packages/provegate/src/core/config/validate.ts::validateResolvedConfig`,
     `packages/provegate/src/core/config/load.ts`

2. **FR-2**: The source domain is **every regular file at any depth** under the package's
   `prompts/` and `templates/`. Dispositions are an **ordered** list; the first match wins,
   exact-path rules precede pattern rules, and **a file matching no rule fails the plan by
   name**, listing the dispositions available. That refusal is what makes the domain total.

   | # | Rule                                                    | Disposition                    | Destination                                  |
   | - | ------------------------------------------------------- | ------------------------------ | -------------------------------------------- |
   | 1 | any symlink                                             | **refuse the plan by name**    | —                                            |
   | 2 | `prompts/README.md`, `templates/README.md` (exact)      | not emitted                    | —                                            |
   | 3 | `prompts/PLACEHOLDERS.md` (exact)                       | copied verbatim, FR-4 exempt   | `<dir>/prompts/PLACEHOLDERS.md`              |
   | 4 | `prompts/_fragments/**` (any depth)                     | not emitted — render **input** | —                                            |
   | 5 | `prompts/**/*.md` (any depth)                           | rendered                       | `<dir>/prompts/<path relative to prompts/>`  |
   | 6 | `templates/*-template.md` (direct children only)        | rendered                       | `<dir>/templates/<basename>`                 |

   Rule 5 **preserves the relative path**, so `prompts/adapters/codex-starter.md` lands at
   `<dir>/prompts/adapters/codex-starter.md`. Rule 6 is restricted to direct children so no
   flattening happens. Rule 4 precedes rule 5 deliberately: fragments are inputs and must
   never be reachable as outputs. After the plan is built and before anything is written,
   destinations are compared **case-folded and Unicode-normalised (NFC)** and any collision
   fails the plan naming both sources. Symlinks are refused rather than followed or skipped:
   following one reads outside the shipped tree, skipping one silently drops content — the
   refusal is a deliberate portability policy and its diagnostic names the file so an adopter
   can replace it with a regular file. The store additionally receives a **generated**
   `<dir>/README.md`. `workflow.config.json` is the render's **input** and stays at the
   repository root; it is never moved, copied, or emitted.

   *Corpus measurement, not specification* — the rules above are the specification, and this
   is what they currently select: 12 rendered protocols, 7 rendered templates, 1 verbatim, 2
   not emitted. A test pins the resulting path set so the measurement cannot drift unnoticed.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::DISPOSITIONS`,
     `packages/provegate/src/core/run/prompts.ts::planStore`,
     `packages/provegate/src/core/run/prompts.ts::assertNoCollision`

3. **FR-3**: `renderPrompts(packageDir, config)` returns a `Map<string, string>` of
   repo-relative path to content. It is pure — no filesystem writes, no clock, no
   environment read — so the same package version and config always produce the same bytes.
   Every **rendered** file carries a generated-file banner naming the package version and the
   reproducing command, as a Markdown comment. The banner is the first line **except in a
   file whose format requires frontmatter first**, where it is the first line after the
   closing `---`: every `.cursor/rules/*.mdc` in this repository and in the source snapshot
   opens with `---` on line 1, and a banner above it moves the frontmatter and the rule may
   not attach. The verbatim file of FR-2 carries no banner, because a banner would be a
   substitution.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::renderPrompts`,
     `packages/provegate/src/core/run/prompts.ts::bannerFor`,
     `packages/provegate/src/core/run/prompts.ts::GENERATED_BANNER`

4. **FR-4**: Token handling has a grammar, and substitution is **one pass over the source**.
   - A **token candidate** is `{{` followed immediately by an uppercase ASCII letter. Text
     like `{{lowercase}}`, `{{ spaced }}` or `{{1}}` is not a candidate and passes through
     untouched — a rule that classified every `{{` as a token would refuse ordinary
     documents that happen to contain brace pairs.
   - A candidate is a **token** when it matches `{{` + `[A-Z][A-Z0-9_]*` + `}}` **on one
     line**. A candidate that does not close on the same line, or whose identifier leaves the
     charset, is **malformed** and fails by name.
   - **Escape:** `{{!NAME}}` renders as the literal `{{NAME}}`. The escape is recursive —
     `{{!!NAME}}` renders as `{{!NAME}}` — so any literal a document needs can be written.
     No shipped file uses it today (`grep` finds zero `{{!` in the package); it exists so a
     future protocol can document a token without the render consuming it, and the
     `PLACEHOLDERS.md` exemption in FR-2 is what covers the one document that discusses
     tokens now.
   - Every source occurrence is collected **before** any replacement, and each is replaced
     exactly once with its value treated as **opaque**: a configured value containing `{{X}}`
     is emitted as-is and never re-scanned, so replacement order cannot matter.
   - Three failures, three messages: **malformed**, **undeclared** (well-formed, absent from
     the registry), **unresolved** (declared, no value). Each names the file and line;
     unresolved additionally names the registry meaning and the supplying key.
   - The refusal is proved against the **shipped corpus with an empty `values` map**.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::scanTokens`,
     `packages/provegate/src/core/run/prompts.ts::substituteOnce`,
     `packages/provegate/src/core/run/prompts.ts::TOKEN_GRAMMAR`

5. **FR-5**: The required-value set is **derived from the rendered corpus**, never from the
   registry. It is the tokens FR-4 finds in the files FR-2 dispositions as *rendered*, minus
   those a config field supplies. Measured today the rendered corpus uses 16 distinct tokens,
   seven of them config-backed, so **nine** values are required of an adopter; the registry's
   other four — `{{LINK_TO_VISION_DOC}}`, `{{ONE_LINE_PRODUCT_FRAMING}}`,
   `{{PROJECT_SPECIFIC_HARD_RULES}}`, `{{VISION_OR_DECISIONS_DOC}}` — occur in **zero**
   rendered files and only in `practices/templates/AGENT_BOOTSTRAP.template.md`, so requiring
   them would make an adopter answer four questions that cannot change one byte of the store.
   Config-backed tokens resolve automatically: `{{BASE_BRANCH}}` → `branches.base`,
   `{{ID_PREFIX}}` → `idPattern.prefix`, `{{CMD_CHECK_TYPES}}` / `{{CMD_LINT}}` /
   `{{CMD_TEST}}` / `{{CMD_BUILD}}` → the matching `commands.*`, `{{MEMORY_ROOT}}` →
   `memory.root`. The mapping is derived from `PLACEHOLDERS.md`, and the registry is validated
   independently: a row whose config-field cell names a path `WorkflowConfig` does not have
   fails at build time.

   **Unset is `null`, not a sentinel string.** `gate init --prompts` scaffolds each required
   key with JSON `null`, and the command prints each key's meaning. A `null` and an absent key
   are both unset; every string, including one that looks like a marker, is a value. An
   in-band sentinel would make some legitimate string unrepresentable, which is a data-model
   collision rather than a policy, and this is the cheapest way not to have one.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::requiredValues`,
     `packages/provegate/src/core/run/prompts.ts::CONFIG_BACKED`,
     `packages/provegate/src/core/config/types.ts::PromptsConfig`,
     `packages/provegate/test/content-placeholders.test.ts`

6. **FR-6**: A token may be declared **enumerated** in the registry: its cell names its legal
   values, and the package ships one fragment per value at
   `prompts/_fragments/<TOKEN>.<value>.md`. The config supplies the **key**, not the text —
   `"AUTONOMY_MODE": "human-gated"` — and the render substitutes the fragment's content. A
   configured value outside the declared set fails by name, listing them. A declared value
   with no fragment file fails at build time.

   **Fragments are terminal, and that is enforced rather than assumed**: a fragment containing
   a token candidate fails at build time. Without that rule a fragment's token survives into
   the output unresolved, because FR-4 substitutes in one pass and rescanning would break the
   opacity guarantee that makes replacement order irrelevant.

   **The ceiling is stated rather than discovered.** Two enumerated tokens select fragments
   independently; **legal-value interactions between tokens are out of scope and are refused
   rather than approximated.** If a future requirement needs one, the answer is a single
   composite enumeration covering the valid combinations — not a cross-token validator and
   not a conditional language. That keeps this mechanism at one indirection, which is the
   whole reason it was chosen over a block syntax.

   This PRD ships the mechanism and **zero** enumerated tokens; PRD-031 ships the first one.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::enumeratedTokens`,
     `packages/provegate/src/core/run/prompts.ts::fragmentFor`,
     `packages/provegate/src/core/run/prompts.ts::assertFragmentTerminal`,
     `packages/provegate/prompts/PLACEHOLDERS.md`

7. **FR-7**: Activation has **five named states** and one invariant, stated here and restated
   nowhere: a **complete** store exists if and only if the config declares `prompts`, every
   required value resolves, and every planned path holds its planned bytes.

   | State                   | Condition                                                              |
   | ----------------------- | ---------------------------------------------------------------------- |
   | `unconfigured`          | no `prompts` in the config; every command in this PRD is inert          |
   | `configured-unresolved` | declared, at least one required value unset; **no store file written**  |
   | `configured-complete`   | declared, all values resolve, every planned path matches the plan       |
   | `configured-incomplete` | declared and resolvable, but some planned path is absent or differs     |
   | `store-without-config`  | `prompts` removed from the config while a store tree remains on disk    |

   The plan is **built in full and validated before a single byte is written**: one package
   version is pinned per plan, all content is produced in memory, and every destination is
   preflighted. A destination whose bytes differ from the plan **fails the plan** rather than
   being skipped; one whose bytes already match is a no-op. Writes are then per-file and
   ordinary — **there is no multi-file atomicity and this document does not claim any.** An
   interruption, a disk error or a concurrent run leaves `configured-incomplete`, which is a
   named state precisely because it is reachable, and the next run detects it at preflight and
   either completes it or names the mismatched paths.

   **Mismatch refusal is scoped to the prompt plan only.** `gate init`'s base and practices
   plans keep their existing additive-only, skip-if-present behaviour; applying this rule to
   them would turn "an existing file is skipped" into "a modified file aborts the run", which
   would break the byte-identical promise this PRD makes for repositories without `prompts`.
   The refusal's diagnostic names the path and directs the adopter to PRD-030's
   `gate doctor --prompts` and `gate sync --prompts`, which are where a deliberate local edit
   is meant to be handled.

   `gate init --practices` does **not** install a store: `PACK_MAP` is a static
   source-to-destination table and cannot emit a config-dependent render; the pack installs
   the instructions. `templates.prd` is set to the rendered PRD template **only in the starter
   config `gate init --prompts` writes**; an existing config is never edited and the command
   prints the value to set. `gate init --dry-run --prompts` prints the plan and writes nothing.
   - **Targets:** `packages/provegate/src/core/run/init.ts::planPrompts`,
     `packages/provegate/src/core/run/init.ts::preflightPromptPlan`,
     `packages/provegate/src/core/run/init.ts::starterConfig`,
     `packages/provegate/src/cli.ts::runInit`

8. **FR-8**: The store carries `<prompts.dir>/provegate.lock.json`: the package version the
   plan was executed from, and for **every path in that plan** the hash of its planned
   content. It covers paths outside `prompts.dir` — the adapters — because it is a record of
   a plan, not of a directory. It is written from the executed plan, never from a walk of the
   filesystem, and it **excludes itself**: a file cannot contain its own hash.

   **It is a receipt and it claims nothing.** It states that these paths held this render
   output at this version. It does not assert that the tool owns them, created them, or may
   overwrite them, and **no command may derive a right to write from its presence** — a
   destination that already matched the plan is recorded because its content is render output,
   not because the tool wrote it. Every consumer's decision is therefore about *content*, and
   the questions a manifest-of-ownership would have to answer — how a path is acquired, when
   it is retired, what a rename means, what happens when the config is removed — do not arise,
   because nothing is acquired.

   Its writer is a **role, not a PRD**: whoever executes a plan writes the whole file. That is
   `gate init --prompts` here and `gate sync --prompts` in PRD-030, one full-file write each,
   the same schema. There are no per-field owners.
   - **Targets:** `packages/provegate/schemas/prompts-lock.schema.json`,
     `packages/provegate/src/core/run/prompts.ts::writeReceipt`

9. **FR-9**: Adapters are validated by a **normative grammar**, not by comparing prose lines
   against protocols. Each generated adapter is produced from a fixed skeleton in which only
   store paths and phase names vary, and the grammar states exactly what is permitted:
   - `.claude/commands/prd-<phase>.md` — the banner, one `#` heading (`<phase name>`), one
     paragraph consisting of the single fixed directive sentence, and one fenced block whose
     info string is empty and whose sole line is the store-relative protocol path. No other
     block is permitted.
   - `.cursor/rules/prd-workflow.mdc` — YAML frontmatter first, containing exactly
     `description`, `globs` and `alwaysApply` in that order; then the banner; then one `##`
     heading; then one table with exactly two columns (`Phase`, `Protocol`) and one row per
     phase **in phase order**, each row's cells being a phase name and a store-relative path
     and nothing else.
   - `AGENTS.md.provegate.snippet` — one `##` heading and the same table under the same rules.

   The test validates that grammar. The previous line-comparison predicate is dropped: it
   could not simultaneously accept a legitimate Cursor table row and reject protocol prose
   appended to a line containing a path, and it passed novel duplicated prose. The two
   tool-shaped protocols the package already ships — `prompts/adapters/codex-starter.md` and
   `cursor-bootstrap.md`, which `prompts/README.md` calls "tool-shaped entry points" — are
   **protocols rendered by FR-2**, are legitimate pointer targets, and are not adapters.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::renderAdapters`,
     `packages/provegate/src/core/run/prompts.ts::ADAPTER_GRAMMAR`,
     `packages/provegate/src/core/run/prompts.ts::validateAdapter`

10. **FR-10**: The Codex adapter is a **snippet, never a write** to `AGENTS.md`.
    `planPractices` states that agent-entrypoint files are deliberately absent from the pack
    so an existing entrypoint is never touched or shadowed; that invariant holds unchanged
    for `CLAUDE.md`, `AGENTS.md` and `.cursor/rules/brain.mdc`. It is **narrowed, not
    broken**: a file at a provegate-namespaced path the adopter does not own is a generated
    adapter, not an entrypoint. The distinction is written into the `planPractices` comment
    and into an ADR. `gate init --practices` additionally gains the adopter instructions:
    `NEXT_STEPS.md` names `gate init --prompts`, the values to supply, where the store lands,
    and — because nothing claims a path — that removing an adapter from `prompts.adapters`,
    renaming `prompts.dir`, or removing `prompts` leaves the previous files on disk for the
    adopter to delete. `PACK_MAP` gains only static files; no rendered output enters the pack,
    and `verify:pack-drift` is green on both sides.
    - **Targets:** `packages/provegate/src/core/run/init.ts::planPractices`,
      `packages/provegate/src/core/run/init.ts::PACK_MAP`,
      `packages/provegate/practices/shims/AGENTS.md.snippet`,
      `packages/provegate/practices/NEXT_STEPS.md`,
      `packages/provegate/test/pack-manifest.json`,
      `_brain/adr/ADR-0002-agent-protocol-delivery.md`

---

## 5. Non-Goals (Out of Scope)

- **Interpreting a divergence — PRD-030.** This PRD writes a receipt; PRD-030 adds the
  exceptions store, `gate doctor --prompts`, `gate sync --prompts` and the wiring.
- **Deleting or tracking a path the current plan does not produce.** A retired adapter, a
  renamed `prompts.dir` or a removed `prompts` block leaves files on disk. Because the receipt
  claims nothing, nothing is orphaned in a sense that obliges this tool; the files are the
  adopter's, `NEXT_STEPS.md` says so, and no command deletes them.
- **Interacting enumerated values — FR-6 refuses them by design.** If a requirement for one
  arrives, it is a composite enumeration, not a conditional language.
- **Multi-file write atomicity.** FR-7 plans in full before writing and names the incomplete
  state; it does not claim a transaction it cannot implement without a staging directory.
- **Any enumerated token's content — PRD-031.**
- **This repository consuming its own store — PRD-032.**
- **Migrating repositories that already installed the pack.** `gate init` is additive-only.
- **A machine-checkable Phase 3 "Go" gate**, and **an agent driver for Phases 4–7.**
- **Rewriting phase-protocol content.** This PRD renders `prompts/` and never edits it, except
  `PLACEHOLDERS.md`, and there only to add the enumerated-token column, which is registry
  structure rather than method prose.
- **A prompts registry, marketplace, or remote fetch.** Nothing here reaches the network.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a scratch repository, **When** `gate init --prompts` runs before any value is
  supplied, **Then** it writes the `prompts` block with `null` for each required key, writes
  **no** store file, and exits non-zero naming each unresolved token with its meaning.
- **Given** the same repository with those values filled, **When** the command is re-run,
  **Then** the store and the receipt are written and every rendered file resolves every token.
- **Given** a `values` entry whose string looks like a marker, **When** the render runs,
  **Then** it is treated as a value; only `null` and absence are unset.
- **Given** a package file matching no disposition rule — a `.txt` beside a protocol, or a
  nested `templates/legacy/x-template.md` — **When** the plan is built, **Then** it fails
  naming that file and the dispositions available.
- **Given** a symlink under `prompts/`, **When** the plan is built, **Then** it is refused by
  name, neither followed nor silently skipped.
- **Given** a file under `prompts/_fragments/`, **When** the plan is built, **Then** rule 4
  matches before rule 5 and it is not emitted.
- **Given** a fragment containing a token candidate, **When** the package is built, **Then**
  it fails: fragments are terminal.
- **Given** a source file containing `{{lowercase}}` or `{{ spaced }}`, **When** the render
  runs, **Then** the text passes through untouched and nothing is reported.
- **Given** a source file containing `{{TO` at end of line and `KEN}}` on the next, **When**
  the render runs, **Then** it fails as **malformed**.
- **Given** `{{!CMD_TEST}}` and `{{!!CMD_TEST}}`, **When** the render runs, **Then** the
  output contains `{{CMD_TEST}}` and `{{!CMD_TEST}}` respectively.
- **Given** a configured value containing `{{ID_PREFIX}}`, **When** the render runs, **Then**
  that text is emitted verbatim and is not reported as unresolved.
- **Given** the registry's four tokens that appear in no rendered file, **When** the required
  set is derived, **Then** none of them is required.
- **Given** an enumerated token configured outside its declared set, **When** the render runs,
  **Then** it fails naming the legal values.
- **Given** a store interrupted mid-write, **When** the state is classified, **Then** it is
  `configured-incomplete`, and the next run either completes it or names the mismatched paths.
- **Given** an existing destination whose bytes differ from the prompt plan, **When**
  `gate init --prompts` runs, **Then** it fails naming that path and directing the adopter to
  `gate doctor --prompts`.
- **Given** an existing file the **base or practices** plan would write, **When**
  `gate init --practices` runs, **Then** it is skipped as before and the run succeeds — the
  mismatch rule is prompt-plan-only.
- **Given** a completed store, **When** the receipt is read, **Then** it lists every path the
  plan produced including adapters outside `prompts.dir`, records the package version, and
  does not list itself.
- **Given** the receipt, **When** any command reads it, **Then** no write permission is
  derived from a path appearing in it.
- **Given** the rendered `.cursor/rules/prd-workflow.mdc`, **When** its first line is read,
  **Then** it is `---`, the frontmatter keys are exactly the three named in FR-9 in order, and
  the banner follows the closing `---`.
- **Given** every generated adapter, **When** the grammar test runs, **Then** each conforms to
  its skeleton and nothing else is present.
- **Given** a repository whose config `gate init --prompts` wrote, **When** `gate new` runs,
  **Then** it reads the rendered template because that config's `templates.prd` names it.
- **Given** a repository whose config already existed, **When** `gate init --prompts` runs,
  **Then** the config is byte-identical afterwards and the command prints the `templates.prd`
  value to set.
- **Given** a repository whose `prompts.dir` does not yet exist, **When** containment is
  checked, **Then** it resolves the longest existing prefix and is not refused.
- **Given** an existing `AGENTS.md`, **When** `gate init --prompts` runs, **Then** the file is
  byte-identical afterwards and the Codex adapter is emitted as a snippet.
- **Given** `prompts` is absent from the config, **When** every command in this PRD runs,
  **Then** behaviour is byte-identical to the pre-PRD build.

---

## 7. Technical Considerations

### Architecture

**The receipt claims nothing, and that is the whole of iteration 3's remediation.** The
previous design had one file being a render receipt, a manifest of owned paths, PRD-030's
reconciliation scope and the migration state, with its fields split between two writers by
prose — a split that contradicted itself the first time `sync` had to rewrite what PRD-030
called read-only. Dropping the ownership claim collapses all of it. Every consumer's question
becomes a question about **content**: does this path hold render output of the version I
expect? Acquisition, retirement, rename and relinquish were consequences of claiming, and
they disappear with the claim. What remains is one sentence an implementer can hold: the
receipt says what the plan produced, and whoever executes a plan writes the whole file.

**Totality comes from the refusal, not from the rules.** No finite rule list covers a
directory anyone may add a file to. What makes the domain total is that an unmatched file
fails.

**A candidate rule, not a brace rule.** Requiring a token candidate to begin `{{` + uppercase
is the cheapest way to stop the grammar refusing ordinary documents. The alternative — treat
every `{{` as a token and refuse what does not parse — makes the render hostile to prose it
was never meant to interpret, which is the overshoot shape two rounds have now found here.

**`null` rather than a sentinel string.** Any in-band marker makes one legitimate string
unrepresentable. `null` is out of band, costs a union type, and removes the collision
entirely.

**Enumerated tokens, with the ceiling stated.** Conditional content needs one capability: pick
one of N package-shipped fragments by a configured key. Fragments are terminal and that is
enforced, so the mechanism cannot grow a second level by accident, and interacting
enumerations are refused rather than approximated. `narrow-the-grammar-not-the-parser` argues
for exactly this over a block syntax.

**No transaction is claimed.** Planning in full before writing removes the mixed-version
failure; it does not make N writes atomic, and saying otherwise would be a promise the code
cannot keep. `configured-incomplete` exists because the state is reachable.

**Prerequisites and serialization.** PRD-026 declares `core/run/init.ts`, `cli.ts`,
`practices/NEXT_STEPS.md`, `test/init.test.ts`, `test/pack-manifest.json` and
`test/practices-pack.test.ts` — six paths this PRD also claims. The collision is
additive-versus-deletion rather than semantic, but they are modify-in-place files and this
repository runs one serialized merge channel per package. Intended order: **this PRD first,
PRD-026 absorbing its pack entries.** PRD-024 does not overlap. PRD-030 and PRD-031 are
strictly downstream and disjoint from each other. **Re-run `gate queue` before Phase 3 rather
than trusting this paragraph.**

### Dependencies

- No new runtime dependency. `packages/provegate` takes zero, permanently.
- No prerequisite work item. PRD-030, PRD-031 and PRD-032 depend on this one; PRD-026 is a
  merge-order constraint.
- Nothing here reaches the network, and nothing adds a push code path.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/config` — the `prompts` surface, split across both passes
- [ ] `packages/provegate/src/core/run/prompts.ts` — dispositions, grammar, render, adapters, receipt
- [ ] `packages/provegate/src/core/run/init.ts` — `--prompts` plan, prompt-plan preflight, starter config, `PACK_MAP`
- [ ] `packages/provegate/src/cli.ts` — `init --prompts`
- [ ] `packages/provegate/schemas/prompts-lock.schema.json` — the receipt contract
- [ ] `packages/provegate/prompts/PLACEHOLDERS.md` — the enumerated-token column
- [ ] `packages/provegate/practices` — NEXT_STEPS and shim text
- [ ] `_brain/adr/ADR-0002-agent-protocol-delivery.md` — the delivery decision

---

## 9. Open Questions

- (none)

---

## 10. References

- `_readiness/wip/readiness-029-method-delivery-agent-binding.md` — iterations 1–3; W1, W9–W24
- `packages/provegate/prompts/PLACEHOLDERS.md` — the registry FR-5 derives from and FR-6 extends
- `packages/provegate/prompts/README.md` — calls `adapters/` "tool-shaped entry points"
- `packages/provegate/src/core/config/load.ts:256-273` — the real two-pass validation order
- `packages/provegate/src/core/config/load.ts::memoryPathsContained` — the prefix-realpath containment FR-1 reuses
- `packages/provegate/src/core/run/new.ts:112-170` — the existing substitution and template fallback
- `packages/provegate/src/core/run/init.ts::planPractices` — the entrypoint invariant FR-10 narrows
- `.cursor/rules/brain.mdc:1` — frontmatter on line 1, the constraint FR-3's banner respects
- `AGENT_BOOTSTRAP.md` — the ten stop-and-ask checkpoints
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

- applied: `strictness-added-during-extraction-is-a-behavior-change` — its watch covers
  `packages/provegate/src/core/run/**`. **Three rounds running this record was declared and
  not applied to that round's own new refusals**, which is now itself a Memory Output below.
  Applied here to each refusal this revision introduces: the token candidate rule stops the
  grammar refusing `{{lowercase}}`; `null` replaces the sentinel that made one legitimate
  string unrepresentable; the mismatch preflight is scoped to the prompt plan so ordinary
  `gate init` keeps its skip-if-present behaviour; and the symlink refusal is stated as a
  deliberate portability policy with a diagnostic that names the remedy.
- applied: `a-rule-corrected-survives-where-it-is-restated` — its watch covers `_prds/**`.
  Three rounds, three instances, the last being a count corrected in one FR while three other
  sections kept the old one under a changelog claiming otherwise. FR-2's corpus figures are
  now labelled a measurement rather than a specification, which is what the DO NOT was really
  trying to say, and the DO NOT is reworded to match instead of contradicting the body.
- applied: `narrow-the-grammar-not-the-parser` — FR-4's candidate rule and FR-6's terminal
  fragments with a stated ceiling. Both narrow what the input may be rather than growing the
  reader; the alternative in each case was a more capable parser.
- applied: `evidence-pattern-satisfied-by-the-template` — its watch covers
  `packages/provegate/templates/**`, which FR-2 renders. FR-4's refusal is proved against the
  shipped corpus with an empty values map, and the `PLACEHOLDERS.md` exemption is by
  disposition rather than a token allowlist.
- applied: `false-green-on-missing-file` — FR-2's unmatched-file refusal and FR-7's preflight:
  a check over a file set fails on the unexpected member, a plan over destinations fails on
  the one whose bytes disagree.
- applied: `fixture-must-reach-production-shape` — its watch covers
  `packages/provegate/src/cli.ts`, which FR-7 targets. The `--prompts` regressions run through
  the real argument path.
- applied: `assert-absent-needs-an-independent-cause` — its watch covers
  `packages/provegate/test/**`. FR-7's "no store file written when unresolved" and FR-10's
  "AGENTS.md byte-identical" both need a scenario in which something would otherwise have
  written.
- applied: `absence-must-be-asserted` — FR-7's `configured-unresolved` is a "must NOT exist"
  requirement over the whole store, so the test asserts the destination set is empty rather
  than grepping for one absent path.
- applied: `adr-section-blank-line-reads-empty` — its watch covers `_brain/adr/**`, and FR-10
  writes ADR-0002. `## Context` must be followed immediately by prose or `verify:brain` fails.
- applied: `gate-wire-or-delete` — the reason no reconciliation check ships here. FR-8 writes
  the receipt and reads nothing; the check and its wiring are PRD-030's, together.
- applied: `two-parsers-wrong-together` — FR-5 and FR-6 both derive from `PLACEHOLDERS.md`, so
  the registry is one authority. FR-4's grammar is that reader's specification and the
  registry's rows are its corpus.
- reviewed: `docs-outlive-the-gate-they-promise` — its watch covers `AGENT_BOOTSTRAP.md`,
  which this PRD no longer targets; that edit is PRD-031's.
- reviewed: `known-red-ledger-must-expire` — FR-8 writes a receipt and no allowlist; the
  exceptions store and its expiry are PRD-030's, where this record binds.
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
  content reaches agents as a rendered store, that the record of it is a **receipt claiming
  nothing** rather than an ownership manifest, that conditional content is an enumerated token
  resolving to terminal package-shipped fragments, and the narrowing of the entrypoint
  invariant that made the adapters possible.
- learning: `_brain/learnings/shipped-content-needs-a-delivery-gate.md` — packaging a
  protocol is not delivering it: content published in a package but never installed into a
  consuming repository is invisible to every agent, and no existing gate detects that,
  because every gate checks what the artifacts say rather than what the agent read.
- learning: `_brain/learnings/derive-the-requirement-from-the-consumer.md` — a required-input
  set derived from the catalogue rather than from what the consumer actually reads produces
  refusals nobody can satisfy meaningfully; the catalogue is a superset by construction, and
  the failure looks like diligence.
- learning: `_brain/learnings/a-record-declared-is-not-a-record-applied.md` — across three
  independent rounds on this item, two memory records were declared `applied` and then
  violated by the same session in the same document. The failure is positional rather than
  intentional: a session applies a record to the defect it has just been shown and not to the
  rules it is about to write, so the check has to be a step in the remediation — sweep the
  new rules against every declared record before the artifact is re-scored — rather than a
  disposition line.
- learning: `_brain/learnings/one-file-one-claim.md` — an artifact asked to be a receipt, an
  ownership manifest, a reconciliation scope and a migration state at once cannot be owned by
  anyone, and the contradiction surfaces as field-level ownership prose that the first write
  path violates; dropping the strongest claim — here, ownership — collapsed four unanswerable
  lifecycle questions into none, because they were all consequences of claiming.

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
- `packages/provegate/schemas/prompts-lock.schema.json`
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
- `_brain/INDEX.md`
- `_brain/adr/ADR-0002-agent-protocol-delivery.md`
- `_brain/learnings/shipped-content-needs-a-delivery-gate.md`
- `_brain/learnings/derive-the-requirement-from-the-consumer.md`
- `_brain/learnings/a-record-declared-is-not-a-record-applied.md`
- `_brain/learnings/one-file-one-claim.md`

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- ADR: `_brain/adr/ADR-0002-agent-protocol-delivery.md` — rendered-store delivery, a receipt that claims nothing, enumerated tokens over a template language, grammar-checked adapters, and the narrowed entrypoint invariant
- `_brain/learnings/shipped-content-needs-a-delivery-gate.md` — packaging is not delivery; no existing gate detects content that ships and never installs
- `_brain/learnings/derive-the-requirement-from-the-consumer.md` — a requirement derived from the catalogue rather than the consumer refuses what nobody can satisfy
- `_brain/learnings/a-record-declared-is-not-a-record-applied.md` — a declared memory record is applied to the defect just shown, not to the rules about to be written; make the sweep a step
- `_brain/learnings/one-file-one-claim.md` — an artifact with four jobs has no owner; drop the strongest claim and the lifecycle questions disappear with it
- `_brain/INDEX.md` — one pointer line per record above, per the memory protocol
- `_docs/reviews/review-029-method-delivery-agent-binding.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR    | Command / Check                                                  | Scope | Notes                                                                                                                       |
| ----- | ---------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| FR-1  | `pnpm --filter provegate test test/config.test.ts`               | pkg   | raw-pass shape refusals, resolved-pass containment, a non-existent dir accepted via prefix realpath, a symlinked root accepted  |
| FR-2  | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | ordered dispositions with rule 4 before rule 5; unmatched file and symlink each fail by name; nested paths preserved            |
| FR-3  | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | identical bytes across runs; banner on every rendered file; the mdc keeps frontmatter on line 1                                 |
| FR-4  | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | lowercase and spaced braces pass through; line-broken is malformed; the escape is recursive; opaque values are not rescanned    |
| FR-5  | `pnpm --filter provegate test test/content-placeholders.test.ts` | pkg   | nine required; the four practices-only tokens excluded; a marker-looking string is a value and only null is unset               |
| FR-6  | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | illegal enumerated value fails naming the set; a fragment containing a candidate fails at build time                            |
| FR-7  | `pnpm --filter provegate test test/init.test.ts`                 | pkg   | five states; unresolved writes zero store files; a mismatched prompt destination fails while the practices plan still skips     |
| FR-8  | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | the receipt covers adapters outside the store dir, excludes itself, and is built from the plan rather than a walk               |
| FR-9  | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | frontmatter keys and order, table columns and row order, the fenced path block; anything beyond the skeleton fails              |
| FR-10 | `pnpm --filter provegate test test/init.test.ts`                 | pkg   | a fixture that already has AGENTS.md and would otherwise be written leaves it byte-identical                                    |
| FR-10 | `pnpm verify:pack-drift`                                         | repo  | the new pairs reconcile on both sides with no orphan packed file and no lost live copy                                        |
| FR-10 | `pnpm --filter provegate test test/pack.test.ts`                 | pkg   | the shipped-file allowlist matches the packed tarball after the additions                                                     |

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
- DO NOT **specify** the emitted set by count. The specification is the ordered disposition
  list plus the unmatched-file refusal; the corpus figures in FR-2 are a labelled measurement
  and a pinning test holds them. A count presented as the rule is what disagreed with itself
  three times.
- DO NOT let the receipt claim, imply, or be read as ownership. It states that a path held
  render output at a version. No command may derive a right to write from it.
- DO NOT add per-field owners to the receipt. Whoever executes a plan writes the whole file.
- DO NOT build the receipt by walking the directory, and DO NOT include the receipt in itself.
- DO NOT follow a symlink and DO NOT silently skip one. Refuse by name, with the remedy.
- DO NOT render `PLACEHOLDERS.md`, and DO NOT exempt anything from the token check with a
  token allowlist. Exemption is by disposition, one file, named in FR-2.
- DO NOT treat every `{{` as a token. A candidate begins `{{` plus an uppercase letter;
  anything else is prose and passes through.
- DO NOT re-scan a substituted value, and DO NOT make the escape non-recursive. Both make some
  legitimate text unwritable.
- DO NOT use an in-band sentinel for unset. `null` and absence are unset; every string is a
  value.
- DO NOT derive the required-value set from the registry. It covers `practices/templates/`
  too, and four of its rows appear in nothing this PRD renders.
- DO NOT add a conditional block syntax, and DO NOT let a fragment contain a token. The
  mechanism is one indirection and terminal fragments are what hold it there.
- DO NOT approximate interacting enumerated values. They are refused; a composite enumeration
  is the answer if one is ever needed.
- DO NOT claim atomicity FR-7 does not implement. Plan fully, write per file, name the
  incomplete state.
- DO NOT apply the mismatch refusal to the base or practices plan. Those keep skip-if-present,
  or the byte-identical promise for repositories without `prompts` is broken.
- DO NOT write any store file while a required value is unresolved.
- DO NOT validate an adapter by comparing its lines against protocol prose, and DO NOT write
  protocol prose into a generated adapter.
- DO NOT delete or rewrite `prompts/adapters/*` — shipped protocols this PRD renders.
- DO NOT edit any file under `packages/provegate/prompts/` except `PLACEHOLDERS.md`, and there
  only for the enumerated-token column.
- DO NOT overwrite, reorder, or append to `CLAUDE.md`, `AGENTS.md`, or
  `.cursor/rules/brain.mdc`.
- DO NOT put a banner above frontmatter.
- DO NOT move, copy, or emit `workflow.config.json` into the store.
- DO NOT render a template without giving it a reader.
- DO NOT let the render read the clock, the environment, or the network.
- DO NOT add a reconciliation check, an exceptions store, or a `doctor` branch here.
- DO NOT change behaviour for a repository whose config omits `prompts`.
- DO NOT add a runtime dependency to `packages/provegate`, and DO NOT add a code path that
  reaches a git remote.

---

## Changelog

| Date       | Author | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-27 | owner  | **Iteration 3 remediation (W18–W24), on a third owner decision: the receipt claims nothing.** Iteration 3's blocking finding was structural — one file being a receipt, an ownership manifest, a reconciliation scope and a migration state, split between two writers by prose that its own `sync` path contradicted. Dropping the ownership claim collapses W18 and W19 together: there are no per-field owners (whoever executes a plan writes the whole file), and acquisition, retirement, rename and relinquish do not arise because nothing is acquired. FR-7 gains `configured-incomplete`, stops claiming a transaction it cannot implement, and **scopes mismatch refusal to the prompt plan** so ordinary `gate init` keeps skip-if-present. FR-6 makes fragment terminality build-time enforced and **states the ceiling**: interacting enumerations are refused, not approximated. FR-4 adds a candidate rule so `{{lowercase}}` is prose, makes the escape recursive, and drops a false claim that the shipped corpus needs it. FR-5 replaces the sentinel string with `null`. FR-1 reuses `memoryPathsContained`'s prefix-realpath so a fresh repository is not refused. FR-9's adapter grammar is normative. Counts swept: ten stop-and-ask checkpoints, nine required values, and the DO NOT reworded to forbid specifying by count rather than contradicting FR-2's labelled measurement. |
| 2026-07-27 | owner  | **Iteration 2 remediation (W9–W17).** Eight FRs to ten: the receipt, and enumerated tokens. Render domain total by refusal, symlink refusal, path-preserving destinations, normalized collision detection. Token grammar with one-line tokens and opaque one-pass substitution. Required set derived from the rendered corpus. Four activation states with preflight. Positive adapter grammar. Banner after frontmatter. `_brain/INDEX.md` claimed. |
| 2026-07-27 | owner  | **W1 split taken.** Thirteen FRs become eight; integrity to PRD-030, method policy to PRD-031, dogfood to PRD-032. Six internal contradictions closed at their root. `prompts/adapters/*` reclassified as shipped tool-shaped protocols, `PLACEHOLDERS.md` copied verbatim.                                                                                                                                                                                                                                                                                                                     |
| 2026-07-27 | owner  | Initial draft. Scope set by owner decision on three questions: rendered prompts editable with a drift ledger; all three adapters in v1; the autonomy exception config-bound.                                                                                                                                                                                                                                                                                                                                                                                                                    |
