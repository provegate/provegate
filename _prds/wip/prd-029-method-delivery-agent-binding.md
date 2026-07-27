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
repository, thin per-tool adapters that point into it, and a manifest of what it generated.
Delivery is a **render**, not a copy — the shipped corpus carries placeholder tokens that
`prompts/PLACEHOLDERS.md` declares, and `core/run/new.ts:112-149` already renders the PRD
template this way.

> **Scope note.** This document is the delivery core of a four-item split taken at readiness
> iteration 1 (W1) and revised against iteration 2 (W9–W17), recorded in
> `_readiness/wip/readiness-029-method-delivery-agent-binding.md`. Divergence reconciliation,
> exceptions, upgrade and rollback are **PRD-030**; the Phase 3 autonomy content and the
> `AGENT_BOOTSTRAP` proceed rule are **PRD-031**, blocked on method provenance; this
> repository consuming its own store is **PRD-032**. Two owner decisions taken at iteration 2
> shape this revision: **this PRD writes the ledger** (a manifest of generated paths, so
> PRD-030 has something to adopt and the adapters outside `prompts.dir` are covered), and
> **conditional content is an enumerated token** whose fragments ship in the package, so
> PRD-031 stays code-free and parallel to PRD-030.

---

## 2. Goals

### Primary Goals

- [ ] Every phase protocol reaches a consuming repository's filesystem, resolved against
      that repository's `workflow.config.json`.
- [ ] Every file in the package's source directories has a disposition, and a file that
      matches no rule **fails the plan by name** rather than being silently dropped.
- [ ] Token handling has a grammar: malformed, undeclared and unresolved are three distinct
      failures, and a documented literal is not consumed.
- [ ] An adopter is asked for exactly the values the render actually consumes — never for a
      value that cannot change a byte of the output.
- [ ] The render is transactional: one package version per plan, every destination
      preflighted, no partial or mixed-version store.
- [ ] What was generated is recorded, so PRD-030 can reconcile it without guessing.

### Success Metrics

| Metric                                                       | Current | Target | Measurement                                                       |
| ------------------------------------------------------------ | ------- | ------ | ------------------------------------------------------------------- |
| Phase protocols reachable on a repo's filesystem after init   | 0       | 12     | store inventory after `gate init --prompts` in a scratch repo        |
| Package files with no disposition                             | n/a     | 0      | the plan fails naming any unmatched file                            |
| Values an adopter must supply that cannot affect the output   | n/a     | 0      | required set derived from the rendered corpus, asserted by test      |
| Partial or mixed-version stores reachable by any command      | n/a     | 0      | preflight fails on a destination whose bytes differ from the plan    |
| Generated paths absent from the ledger                        | n/a     | 0      | the ledger is written from the plan, not from a directory walk       |

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
I want a record of what was generated and by which package version,
so that the next tool along can tell an upgrade apart from an edit.
```

**Acceptance Criteria:**

- [ ] The ledger lists every generated path, including adapters outside `prompts.dir`.
- [ ] It is written from the executed plan, never from a walk of the directory afterwards.
- [ ] It records the package version that produced the store.

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

2. **FR-2**: The source domain is **every regular file at any depth** under the package's
   `prompts/` and `templates/`. Dispositions are an **ordered** list; the first match wins,
   exact-path rules precede pattern rules, and **a file matching no rule fails the plan by
   name**, listing the dispositions available. That refusal is what makes the domain total,
   and it is reachable: a `.txt` beside a protocol, or a nested
   `templates/legacy/x-template.md`, hits it today.

   | # | Rule                                                    | Disposition                    | Destination                                  |
   | - | ------------------------------------------------------- | ------------------------------ | -------------------------------------------- |
   | 1 | any symlink                                             | **refuse the plan by name**    | —                                            |
   | 2 | `prompts/README.md`, `templates/README.md` (exact)      | not emitted                    | —                                            |
   | 3 | `prompts/PLACEHOLDERS.md` (exact)                       | copied verbatim, FR-4 exempt   | `<dir>/prompts/PLACEHOLDERS.md`              |
   | 4 | `prompts/_fragments/**` (any depth)                     | not emitted — render **input** | —                                            |
   | 5 | `prompts/**/*.md` (any depth)                           | rendered                       | `<dir>/prompts/<path relative to prompts/>`  |
   | 6 | `templates/*-template.md` (direct children only)        | rendered                       | `<dir>/templates/<basename>`                 |

   Rule 5 **preserves the relative path**, so `prompts/adapters/codex-starter.md` lands at
   `<dir>/prompts/adapters/codex-starter.md` and cannot collide with a sibling. Rule 6 is
   restricted to direct children precisely so no flattening happens. After the plan is built
   and before anything is written, destinations are compared **case-folded and
   Unicode-normalised (NFC)** and any collision fails the plan naming both sources — a
   defence that costs nothing today and holds when rule 6 is ever widened. Symlinks are
   refused rather than followed or skipped: following one reads outside the shipped tree,
   skipping one silently drops content. The store additionally receives a **generated**
   `<dir>/README.md`. `workflow.config.json` is the render's **input** and stays at the
   repository root; it is never moved, copied, or emitted.

   Measured against the package today: **12 rendered protocols** (seven phase files,
   `orchestration-runner.md`, `knowledge-ingest.md`, `knowledge-lint.md`, and the two
   tool-shaped protocols under `prompts/adapters/`), **7 rendered templates**, **1 verbatim**,
   **2 not emitted**. Those numbers are a measurement of the corpus, not the specification;
   the rules above are the specification, and a test pins the resulting path set.
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
   - A token is `{{`, an identifier matching `[A-Z][A-Z0-9_]*`, then `}}`, **all on one
     line**. A `{{` whose `}}` does not appear on the same line, or whose identifier is
     outside the charset, is **malformed**.
   - `{{!NAME}}` renders as the literal text `{{NAME}}` and is never treated as a token. This
     is the escape a document needs when it *documents* a token, which the shipped corpus
     does.
   - Every source occurrence is collected **before** any replacement, and each is replaced
     exactly once with its value treated as **opaque**: a configured value containing `{{X}}`
     is emitted as-is and never re-scanned, so replacement order cannot matter.
   - Three failures, three messages: **malformed** (file, line, the offending text),
     **undeclared** (well-formed, absent from the registry), **unresolved** (declared, no
     value). Each names the file and line; unresolved additionally names the registry meaning
     and the supplying key.
   - The refusal is proved against the **shipped corpus with an empty `values` map**, not a
     hand-written sample: the tokens it hunts are the ones this package ships.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::scanTokens`,
     `packages/provegate/src/core/run/prompts.ts::substituteOnce`,
     `packages/provegate/src/core/run/prompts.ts::TOKEN_GRAMMAR`

5. **FR-5**: The required-value set is **derived from the rendered corpus**, never from the
   registry. It is the tokens FR-4 finds in the files FR-2 dispositions as *rendered*, minus
   those a config field supplies. Measured today that is **13 registry rows of which four —
   `{{LINK_TO_VISION_DOC}}`, `{{ONE_LINE_PRODUCT_FRAMING}}`, `{{PROJECT_SPECIFIC_HARD_RULES}}`,
   `{{VISION_OR_DECISIONS_DOC}}` — occur in ZERO rendered files** and only in
   `practices/templates/AGENT_BOOTSTRAP.template.md`; requiring them would make an adopter
   answer four questions that cannot change one byte of the store. Config-backed tokens
   resolve automatically: `{{BASE_BRANCH}}` → `branches.base`, `{{ID_PREFIX}}` →
   `idPattern.prefix`, `{{CMD_CHECK_TYPES}}` / `{{CMD_LINT}}` / `{{CMD_TEST}}` /
   `{{CMD_BUILD}}` → the matching `commands.*`, `{{MEMORY_ROOT}}` → `memory.root`. The
   mapping is derived from `PLACEHOLDERS.md`, and the registry is validated independently:
   a row whose config-field cell names a path `WorkflowConfig` does not have fails at build
   time. `gate init --prompts` scaffolds each required key with the **constant sentinel**
   `<PROVEGATE:UNSET>` — a fixed string, never text derived from the registry's Meaning
   column, because Meaning is prose that changes and a stale derived sentinel would then read
   as a real value. The command prints each key's meaning; the file carries the constant.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::requiredValues`,
     `packages/provegate/src/core/run/prompts.ts::CONFIG_BACKED`,
     `packages/provegate/src/core/run/prompts.ts::SENTINEL`,
     `packages/provegate/test/content-placeholders.test.ts`

6. **FR-6**: A token may be declared **enumerated** in the registry: its cell names its legal
   values, and the package ships one fragment per value at
   `prompts/_fragments/<TOKEN>.<value>.md`. The config supplies the **key**, not the text —
   `"AUTONOMY_MODE": "human-gated"` — and the render substitutes the fragment's content. A
   configured value that is not one of the declared legal values fails by name, listing them.
   A declared enumerated value with no fragment file fails at build time. This is the whole
   conditional-content mechanism: **no template language, one level of indirection**, and
   method text stays in the package where the provenance rule can see it rather than moving
   into an adopter's config. This PRD ships the mechanism and no enumerated token; PRD-031
   ships the first one.
   - **Targets:** `packages/provegate/src/core/run/prompts.ts::enumeratedTokens`,
     `packages/provegate/src/core/run/prompts.ts::fragmentFor`,
     `packages/provegate/prompts/PLACEHOLDERS.md`

7. **FR-7**: Activation has **four named states** and one invariant, stated here and
   restated nowhere: a **complete** store exists if and only if the config declares `prompts`
   *and* every required value resolves.

   | State                   | Config      | Values      | Store            |
   | ----------------------- | ----------- | ----------- | ---------------- |
   | `unconfigured`          | no `prompts`| —           | none; all inert  |
   | `configured-unresolved` | declared    | any unset   | **none written** |
   | `configured-complete`   | declared    | all resolve | matches the plan |
   | `configured-orphaned`   | removed     | —           | tree remains     |

   The render is **transactional**. One package version is pinned per plan. Every destination
   is preflighted before anything is written, and an existing destination whose bytes differ
   from what this plan would write **fails the plan** rather than being skipped — `wx` makes
   an individual write non-destructive, it does not make a multi-file render atomic, and
   skipping is exactly how a failed v1 run plus a v2 re-run produces a mixed-version store.
   A destination whose bytes already match is a no-op, so a re-run after a partial write
   completes cleanly. `gate init --practices` does **not** install a store: `PACK_MAP` is a
   static source-to-destination table and cannot emit a config-dependent render; the pack
   installs the instructions. `templates.prd` is set to the rendered PRD template **only in
   the starter config `gate init --prompts` writes**; an existing config is never edited and
   the command prints the value to set. `gate init --dry-run --prompts` prints the plan and
   writes nothing.
   - **Targets:** `packages/provegate/src/core/run/init.ts::planPrompts`,
     `packages/provegate/src/core/run/init.ts::preflight`,
     `packages/provegate/src/core/run/init.ts::starterConfig`,
     `packages/provegate/src/cli.ts::runInit`

8. **FR-8**: The store carries `<prompts.dir>/provegate.lock.json`: the package version that
   produced it, and for **every generated path** the hash of what was written. It is a
   manifest of generated paths, **not of a directory**, so the adapters that live outside
   `prompts.dir` are in it. It is written from the executed plan, never from a walk of the
   filesystem afterwards — a walk would record whatever is there, which is the question the
   ledger exists to answer. It is schema-validated. This PRD owns `packageVersion` and
   `generated`; PRD-030 adds `exceptions` and everything that interprets a divergence.
   - **Targets:** `packages/provegate/schemas/prompts-lock.schema.json`,
     `packages/provegate/src/core/run/prompts.ts::writeLedger`

9. **FR-9**: Adapters are validated by a **positive grammar**, not by comparing prose lines
   against protocols. Each generated adapter is produced from a fixed skeleton in which only
   paths and phase names vary:
   - `.claude/commands/prd-<phase>.md` — optional frontmatter, one H1, one fixed directive
     sentence, one fenced store path. Nothing else.
   - `.cursor/rules/prd-workflow.mdc` — frontmatter first (`description`, `globs` derived
     from `config.dirs.artifacts`, `alwaysApply`), then the banner, one H2, and one table
     whose only cells are a phase name and a store path.
   - `AGENTS.md.provegate.snippet` — one H2 and the same table.

   The test validates that grammar. The previous line-comparison predicate is dropped: it
   could not simultaneously accept a legitimate Cursor table row and reject protocol prose
   appended to a line that happens to contain a path, and it passed novel duplicated prose
   that appears nowhere verbatim. The two tool-shaped protocols the package already ships —
   `prompts/adapters/codex-starter.md` and `cursor-bootstrap.md`, which `prompts/README.md`
   calls "tool-shaped entry points" — are **protocols rendered by FR-2**, are legitimate
   pointer targets, and are not adapters; the grammar applies to what `renderAdapters`
   produced.
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
    `NEXT_STEPS.md` names `gate init --prompts`, the values to supply and where the store
    lands. `PACK_MAP` gains only static files; no rendered output enters the pack, and
    `verify:pack-drift` is green on both sides.
    - **Targets:** `packages/provegate/src/core/run/init.ts::planPractices`,
      `packages/provegate/src/core/run/init.ts::PACK_MAP`,
      `packages/provegate/practices/shims/AGENTS.md.snippet`,
      `packages/provegate/practices/NEXT_STEPS.md`,
      `packages/provegate/test/pack-manifest.json`,
      `_brain/adr/ADR-0002-agent-protocol-delivery.md`

---

## 5. Non-Goals (Out of Scope)

- **Interpreting a divergence — PRD-030.** This PRD records what it generated; PRD-030 adds
  `exceptions`, `gate doctor --prompts`, `gate sync --prompts` and the wiring. Writing the
  ledger here is what gives that item something to adopt instead of a bootstrap guess.
- **Any enumerated token's content — PRD-031.** FR-6 ships the mechanism and zero enumerated
  tokens. The first one, its two fragments and the owner-approved snapshot addendum that
  authorizes them belong there.
- **This repository consuming its own store — PRD-032.**
- **Migrating repositories that already installed the pack.** `gate init` is additive-only by
  design and never overwrites. Stated here rather than left to be discovered.
- **A machine-checkable Phase 3 "Go" gate.** State-and-gate work; its own item.
- **An agent driver for Phases 4–7.** Measure after a store exists, do not assume before.
- **Rewriting phase-protocol content.** This PRD renders `prompts/` and never edits it, with
  one exception stated in FR-6: `PLACEHOLDERS.md` gains the enumerated-token column, which is
  registry structure rather than method prose.
- **A prompts registry, marketplace, or remote fetch.** Nothing here reaches the network.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a scratch repository, **When** `gate init --prompts` runs before any value is
  supplied, **Then** it writes the `prompts` config block with a `<PROVEGATE:UNSET>` sentinel
  per required key, writes **no** store file, and exits non-zero naming each unresolved token
  with its meaning.
- **Given** the same repository with those values filled, **When** the command is re-run,
  **Then** the store and the ledger are written and every rendered file resolves every token.
- **Given** a package file matching no disposition rule — a `.txt` beside a protocol, or a
  nested `templates/legacy/x-template.md` — **When** the plan is built, **Then** it fails
  naming that file and the dispositions available.
- **Given** a symlink under `prompts/`, **When** the plan is built, **Then** it is refused by
  name, neither followed nor silently skipped.
- **Given** a source file containing `{{TO` at the end of a line and `KEN}}` on the next,
  **When** the render runs, **Then** it fails as **malformed**, not as resolved.
- **Given** a source file containing `{{!CMD_TEST}}`, **When** the render runs, **Then** the
  output contains the literal text `{{CMD_TEST}}` and no substitution occurred.
- **Given** a configured value whose text contains `{{ID_PREFIX}}`, **When** the render runs,
  **Then** that text is emitted verbatim and is not reported as unresolved.
- **Given** the registry's four tokens that appear in no rendered file, **When** the required
  set is derived, **Then** none of them is required and the adopter is never asked for them.
- **Given** a registry row whose config-field cell names a path `WorkflowConfig` lacks,
  **When** the test suite runs, **Then** it fails at build time.
- **Given** an enumerated token configured with a value outside its declared set, **When**
  the render runs, **Then** it fails naming the legal values.
- **Given** a partially written store and a newer installed package, **When**
  `gate init --prompts` is re-run, **Then** it fails naming every destination whose bytes
  differ from the new plan; no mixed-version store is produced.
- **Given** a completed store, **When** the ledger is read, **Then** it lists every generated
  path including the adapters outside `prompts.dir`, and records the package version.
- **Given** the rendered `.cursor/rules/prd-workflow.mdc`, **When** its first line is read,
  **Then** it is `---`, and the banner follows the closing `---`.
- **Given** every generated adapter, **When** the grammar test runs, **Then** each conforms
  to its skeleton and nothing else is present.
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

**The store is a build output, and the ledger is its receipt.** Rendered content is a pure
function of the package version and `workflow.config.json`; PRD-030 depends on that to
recompute rather than trust. The ledger does the one job recomputation cannot: telling a
package-caused difference from a human-caused one. It is written from the plan rather than
from a directory walk, because a walk records whatever is on disk — which is the question,
not the answer.

**Totality comes from the refusal, not from the rules.** No finite rule list covers a
directory that anyone may add a file to. What makes the domain total is that an unmatched
file **fails**, and iteration 2's criterion was unreachable because the previous wildcard
matched every `.md`. It is reachable now: a `.txt` or a nested template hits it.

**One pass, opaque values.** Collecting every source occurrence before substituting and
treating values as opaque removes replacement order as a variable entirely. Without it, a
value containing another token makes the output depend on iteration order, and a value that
legitimately contains `{{` gets reported as unresolved.

**Required values come from the corpus, not the catalogue.** This was iteration 2's clearest
overshoot and it has one shape: a rule derived from the wrong source. The registry is a
catalogue of every token in `prompts/`, `templates/` **and** `practices/templates/`; the
render consumes only the first two. Deriving the requirement from what is rendered is both
correct today and self-correcting when the corpus changes.

**Enumerated tokens instead of a template language.** Conditional content needs exactly one
capability: pick one of N package-shipped fragments by a configured key. A block syntax would
be more general and would make `core/run/prompts.ts` a template engine, which
`narrow-the-grammar-not-the-parser` argues against directly. Two shipped variants of a whole
protocol would be more duplication, which is this repository's most measured defect. The
fragment indirection keeps method text in the package, where the provenance rule can see it.

**`_brain/INDEX.md` is claimed.** Iteration 2 was right that recording it in prose as a
deliberate exclusion left an implementer with no lawful path: it is a required Durable
Artifact write, it is not in `sharedAppendOnly`, and this PRD's own DO NOT forbids touching
what it has not claimed. It is now in the Conflict Surface. If the repository later decides
the index should be shared-append-only, that is a `workflow.config.json` change and a
different item.

**Prerequisites and serialization.** PRD-026 declares `core/run/init.ts`, `cli.ts`,
`practices/NEXT_STEPS.md`, `test/init.test.ts`, `test/pack-manifest.json` and
`test/practices-pack.test.ts` — six paths this PRD also claims. The collision is
additive-versus-deletion rather than semantic, but they are modify-in-place files and this
repository runs one serialized merge channel per package. Intended order: **this PRD first,
PRD-026 absorbing its pack entries.** PRD-024 does not overlap. PRD-030 and PRD-031 are both
strictly downstream and, with the owner decisions taken at iteration 2, disjoint from each
other. **Re-run `gate queue` before Phase 3 rather than trusting this paragraph** — it has
gone stale twice in this repository within hours of being written.

### Dependencies

- No new runtime dependency. `packages/provegate` takes zero, permanently.
- No prerequisite work item. PRD-030, PRD-031 and PRD-032 depend on this one; PRD-026 is a
  merge-order constraint, not a dependency.
- Nothing here reaches the network, and nothing adds a push code path.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/config` — the `prompts` surface, split across both passes
- [ ] `packages/provegate/src/core/run/prompts.ts` — dispositions, grammar, render, adapters, ledger
- [ ] `packages/provegate/src/core/run/init.ts` — `--prompts` plan, preflight, starter config, `PACK_MAP`
- [ ] `packages/provegate/src/cli.ts` — `init --prompts`
- [ ] `packages/provegate/schemas/prompts-lock.schema.json` — the ledger contract
- [ ] `packages/provegate/prompts/PLACEHOLDERS.md` — the enumerated-token column
- [ ] `packages/provegate/practices` — NEXT_STEPS and shim text
- [ ] `_brain/adr/ADR-0002-agent-protocol-delivery.md` — the delivery decision

---

## 9. Open Questions

- (none)

---

## 10. References

- `_readiness/wip/readiness-029-method-delivery-agent-binding.md` — iterations 1 and 2; W1 and W9–W17
- `packages/provegate/prompts/PLACEHOLDERS.md` — the registry FR-5 derives from and FR-6 extends
- `packages/provegate/prompts/README.md` — calls `adapters/` "tool-shaped entry points"
- `packages/provegate/src/core/config/load.ts:256-273` — the real two-pass validation order
- `packages/provegate/src/core/run/new.ts:112-170` — the existing substitution and template fallback
- `packages/provegate/src/core/run/init.ts::planPractices` — the entrypoint invariant FR-10 narrows
- `.cursor/rules/brain.mdc:1` — frontmatter on line 1, the constraint FR-3's banner respects
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

- applied: `strictness-added-during-extraction-is-a-behavior-change` — its watch covers
  `packages/provegate/src/core/run/**`. **Two rounds running, this record was declared and
  not applied**, so it is applied here to the specific refusals: FR-5 no longer refuses a
  value the output cannot consume, FR-4's escape stops the token scan refusing a documented
  literal, and FR-3's banner no longer refuses to coexist with a format that needs
  frontmatter first. FR-10 also narrows `planPractices`'s deliberate decision in the open
  rather than relaxing it while passing through.
- applied: `a-rule-corrected-survives-where-it-is-restated` — its watch covers `_prds/**`.
  Iteration 2 found activation restated in five places; FR-7 now states it as one table with
  four named states and every other section points at that table rather than paraphrasing
  it. FR-6's fragment mechanism exists partly for the same reason: two whole protocol
  variants would be the same rule in two files.
- applied: `narrow-the-grammar-not-the-parser` — FR-4 and FR-6 together. A one-line token
  grammar with an explicit literal escape, and enumerated values selecting package-shipped
  fragments, are both the narrow answer; a block syntax would make this file a template
  engine and this record argues the other way.
- applied: `evidence-pattern-satisfied-by-the-template` — its watch covers
  `packages/provegate/templates/**`, which FR-2 renders. FR-4's refusal is proved against the
  shipped corpus with an empty values map, and the `PLACEHOLDERS.md` exemption is by
  disposition rather than a token allowlist, because an allowlist is exactly this shape.
- applied: `false-green-on-missing-file` — FR-2's unmatched-file refusal and FR-7's preflight.
  A check over a file set has to fail on the unexpected member; a plan over destinations has
  to fail on the one whose bytes disagree, not skip it.
- applied: `fixture-must-reach-production-shape` — its watch covers
  `packages/provegate/src/cli.ts`, which FR-7 targets. The `--prompts` regressions run through
  the real argument path, not by calling `planPrompts` with arguments tidier than the CLI
  supplies.
- applied: `assert-absent-needs-an-independent-cause` — its watch covers
  `packages/provegate/test/**`. FR-7's "no store file written when a value is unresolved" and
  FR-10's "AGENTS.md byte-identical" both need a scenario in which something would otherwise
  have written; a fixture missing the file proves nothing.
- applied: `absence-must-be-asserted` — named by iteration 2 as missing. FR-7's
  configured-unresolved state is a "must NOT exist" requirement over the whole store, so the
  test asserts the destination set is empty rather than grepping for one absent path.
- applied: `adr-section-blank-line-reads-empty` — its watch covers `_brain/adr/**`, and FR-10
  writes ADR-0002. `## Context` must be followed immediately by prose or `verify:brain` fails;
  the parser fix is an open deferral, so the ADR is written around it.
- applied: `gate-wire-or-delete` — the reason no reconciliation check ships here. FR-8 writes
  the ledger and reads nothing; the check and its wiring are PRD-030's, together, because a
  registered check with no executing surface fails the audit.
- applied: `two-parsers-wrong-together` — FR-5 derives the token mapping from
  `PLACEHOLDERS.md` and FR-6 derives the enumerated values from the same table, so the
  registry is one authority rather than two. Iteration 2 noted this still needs a parser;
  FR-4's grammar is that parser's specification, and the registry's own rows are its test
  corpus.
- reviewed: `docs-outlive-the-gate-they-promise` — its watch covers `AGENT_BOOTSTRAP.md`,
  which this PRD no longer targets; that edit is PRD-031's. Recorded because the whole item is
  an instance: `METHOD.md` described a workflow whose delivery half was never built.
- reviewed: `known-red-ledger-must-expire` — FR-8 writes the ledger's factual half and no
  allowlist; `exceptions` and their expiry are PRD-030's, where this record binds.
- not-applicable: `push-is-human-by-omission` — no code path in this PRD reaches a remote, and
  the record's rule is preserved by adding nothing.

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
  content reaches agents as a rendered store with a generated-path ledger and grammar-checked
  adapters, that conditional content is an enumerated token resolving to package-shipped
  fragments rather than a template language, and the narrowing of the entrypoint invariant
  that made the adapters possible.
- learning: `_brain/learnings/shipped-content-needs-a-delivery-gate.md` — packaging a
  protocol is not delivering it: content published in a package but never installed into a
  consuming repository is invisible to every agent, and no existing gate detects that,
  because every gate checks what the artifacts say rather than what the agent read.
- learning: `_brain/learnings/derive-the-requirement-from-the-consumer.md` — a required-input
  set derived from the catalogue rather than from what the consumer actually reads produces
  refusals nobody can satisfy meaningfully; the catalogue is a superset by construction, and
  the failure looks like diligence, which is why two review rounds are what caught it.

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

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- ADR: `_brain/adr/ADR-0002-agent-protocol-delivery.md` — rendered-store delivery, the generated-path ledger, enumerated tokens over a template language, grammar-checked adapters, and the narrowed entrypoint invariant
- `_brain/learnings/shipped-content-needs-a-delivery-gate.md` — packaging is not delivery; no existing gate detects content that ships and never installs
- `_brain/learnings/derive-the-requirement-from-the-consumer.md` — a requirement derived from the catalogue rather than the consumer refuses what nobody can satisfy
- `_brain/INDEX.md` — one pointer line per record above, per the memory protocol
- `_docs/reviews/review-029-method-delivery-agent-binding.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR    | Command / Check                                                  | Scope | Notes                                                                                                                    |
| ----- | ---------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------- |
| FR-1  | `pnpm --filter provegate test test/config.test.ts`               | pkg   | unknown adapter id and bad shape refused in the raw pass; escaping dir and symlinked root refused in the resolved pass      |
| FR-2  | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | ordered dispositions; an unmatched file and a symlink each fail by name; nested paths preserved; collision detection fires  |
| FR-3  | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | identical bytes across runs; banner on every rendered file; the mdc keeps its frontmatter on line 1                         |
| FR-4  | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | line-broken token is malformed; the escape emits a literal; an opaque value containing a token is not rescanned             |
| FR-5  | `pnpm --filter provegate test test/content-placeholders.test.ts` | pkg   | the required set excludes the four practices-only tokens; a registry row naming a missing config path fails at build time   |
| FR-6  | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | an illegal enumerated value fails naming the legal set; a declared value with no fragment fails at build time               |
| FR-7  | `pnpm --filter provegate test test/init.test.ts`                 | pkg   | the four states; unresolved writes zero store files; a mismatched destination fails preflight instead of being skipped      |
| FR-8  | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | the ledger lists every generated path including adapters outside the store dir, and is built from the plan not a walk       |
| FR-9  | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | every generated adapter conforms to its skeleton; the shipped tool-shaped protocols are rendered and not grammar-checked    |
| FR-10 | `pnpm --filter provegate test test/init.test.ts`                 | pkg   | a fixture that already has AGENTS.md and would otherwise be written leaves it byte-identical                                |
| FR-10 | `pnpm verify:pack-drift`                                         | repo  | the new pairs reconcile on both sides with no orphan packed file and no lost live copy                                     |
| FR-10 | `pnpm --filter provegate test test/pack.test.ts`                 | pkg   | the shipped-file allowlist matches the packed tarball after the additions                                                  |

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
- DO NOT state the emitted set as a count anywhere. It is an ordered disposition list whose
  totality comes from the unmatched-file refusal; a number in prose is what disagreed with
  itself three times in the first draft.
- DO NOT follow a symlink and DO NOT silently skip one. Following reads outside the shipped
  tree; skipping drops content. Refuse by name.
- DO NOT render `PLACEHOLDERS.md`. Substituting the registry consumes the tokens it
  documents, and the refusal explaining the failure would fire on the explanation.
- DO NOT exempt a file from the token check with a token allowlist. Exemption is by
  disposition, one file, named in FR-2.
- DO NOT re-scan a substituted value. Values are opaque; scanning output makes the result
  depend on replacement order and turns a legitimate `{{` inside a value into a failure.
- DO NOT derive the required-value set from the registry. It is a catalogue covering
  `practices/templates/` too, and four of its rows appear in nothing this PRD renders.
- DO NOT build the sentinel from the registry's Meaning column. Meaning is prose that
  changes; a stale derived sentinel then reads as a real value. The sentinel is a constant.
- DO NOT add a conditional block syntax to the renderer. Conditional content is an
  enumerated token resolving to a package-shipped fragment; a block syntax is a template
  language and it will grow.
- DO NOT ship an enumerated token in this PRD. The mechanism is here; the first token, its
  fragments and their provenance are PRD-031's.
- DO NOT put method text into `prompts.values`. The config carries keys; the package carries
  prose, where the provenance rule can see it.
- DO NOT skip a destination whose bytes differ from the plan. `wx` protects one write, not a
  multi-file render; skipping is how a mixed-version store happens.
- DO NOT write any store file while a required value is unresolved. A protocol with a blank
  where a path belongs is worse than a refusal.
- DO NOT build the ledger by walking the directory. It is written from the executed plan; a
  walk records whatever is there, which is the question it exists to answer.
- DO NOT validate an adapter by comparing its lines against protocol prose. That predicate
  cannot both accept a Cursor table row and reject prose appended to a path line. Validate
  the grammar.
- DO NOT write protocol prose into a generated adapter, and DO NOT delete or rewrite
  `prompts/adapters/*` — they are shipped protocols this PRD renders, and their content is
  method content it does not own.
- DO NOT edit any file under `packages/provegate/prompts/` except `PLACEHOLDERS.md`, and
  there only to add the enumerated-token column. Method prose is PRD-031's.
- DO NOT overwrite, reorder, or append to `CLAUDE.md`, `AGENTS.md`, or
  `.cursor/rules/brain.mdc`. The Codex adapter is a snippet the adopter pastes.
- DO NOT put a banner above frontmatter. Every `.cursor/rules/*.mdc` here and in the snapshot
  opens with `---` on line 1, and moving it may stop the rule attaching.
- DO NOT move, copy, or emit `workflow.config.json` into the store. It is the render's input.
- DO NOT render a template without giving it a reader. A rendered `prd-template.md` that
  `config.templates.prd` does not point at is a second copy of the artifact this PRD exists
  to stop duplicating.
- DO NOT let the render read the clock, the environment, or the network. PRD-030's
  reconciliation depends on purity.
- DO NOT add a reconciliation check, an exceptions list, or a `doctor` branch here. They ship
  with their wiring in PRD-030.
- DO NOT change behaviour for a repository whose config omits `prompts`. Every command must
  be byte-identical to the pre-PRD build, and a test must hold that line.
- DO NOT add a runtime dependency to `packages/provegate`, and DO NOT add a code path that
  reaches a git remote.

---

## Changelog

| Date       | Author | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-27 | owner  | **Iteration 2 remediation (W9–W17), with two owner design decisions.** Eight FRs become ten: **FR-8 writes the ledger** as a manifest of generated paths, so PRD-030 adopts it instead of bootstrapping and the adapters outside `prompts.dir` are covered; **FR-6 adds enumerated tokens**, whose fragments ship in the package and whose config value is a key, so PRD-031 stays code-free and parallel to PRD-030 without putting method prose in an adopter's config. The render domain is now total by refusal rather than by wildcard, with symlink refusal, path-preserving destinations and normalized collision detection. FR-4 gives tokens a grammar: one line, `{{!NAME}}` escape, collect-then-substitute-once with opaque values, and three distinct diagnostics. **FR-5 derives the required set from the rendered corpus** — the four practices-only tokens are no longer demanded — and the sentinel is a constant rather than Meaning-derived. FR-7 names four activation states and makes the plan transactional with preflight. FR-9 replaces the unwritable pointer predicate with a positive adapter grammar. FR-3 places the banner after frontmatter where a format needs it first. `_brain/INDEX.md` is claimed rather than excluded by prose. |
| 2026-07-27 | owner  | **W1 split taken.** Thirteen FRs become eight; integrity to PRD-030, method policy to PRD-031, dogfood to PRD-032. Six internal contradictions closed at their root: the emitted set became a rule with a pinning test; the registry is 20 tokens, seven config-backed; activation stated once with `--practices` installing no store; `templates.prd` set only in the starter config; the `load.ts` order corrected. `prompts/adapters/*` reclassified as shipped tool-shaped protocols, `PLACEHOLDERS.md` copied verbatim.                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-07-27 | owner  | Initial draft. Scope set by owner decision on three questions: rendered prompts editable with a drift ledger; all three adapters in v1; the autonomy exception config-bound.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
