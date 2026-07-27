# Tasks: Method Delivery — One-Way Protocol Install

> **PRD**: [prd-029-method-delivery-agent-binding.md](../../_prds/wip/prd-029-method-delivery-agent-binding.md)
> **Readiness**: [readiness-029-method-delivery-agent-binding.md](../../_readiness/wip/readiness-029-method-delivery-agent-binding.md)
> **Status**: Code Complete
> **Readiness Score**: 8.35/10 (PASS, iteration 8)
> **Model Tier (Execution)**: high
> **Created**: 2026-07-27
> **Updated**: 2026-07-27

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- A PRD may be `Code Complete` with operator handoff items, but it is not `Ship Verified`
  until required handoff items are resolved or explicitly accepted.
- Phase 4 agents hold a valid lock lease (METHOD.md → Locks) before editing implementation
  files or this task file.
- No `any` anywhere in this work; use `unknown` plus narrowing. The PRD's §12 forbids it and
  so does the repository's typing discipline.

---

## Memory Context

The slugs the PRD selected as Memory Inputs, carried here so implementation does not
re-derive them. Each one gets a re-open task below, bound to the work that depends on it:
a record is evidence only while it is true.

- `strictness-added-during-extraction-is-a-behavior-change` — every refusal added in tasks
  1–5 must be checked for the legitimate input it would reject. This PRD's design answer was
  to **remove** the preflight rather than scope it; do not reintroduce one.
- `a-rule-corrected-survives-where-it-is-restated` — eight readiness rounds produced eight
  instances, four of them inside the fixes. After every change to a rule, re-read the other
  places that state it. Binds task 9.3.
- `narrow-the-grammar-not-the-parser` — the two token candidate classes (2.5) and terminal
  fragments (3.5). Narrow the input, do not grow the reader.
- `gate-wire-or-delete` — task 3.5 names package tests and the render as the enforcing
  surfaces. The package `build` is one `tsup` invocation; do not wire anything to it.
- `evidence-pattern-satisfied-by-the-template` — task 2.7 proves the refusal against the
  **shipped corpus**, not a hand-written sample.
- `false-green-on-missing-file` — task 2.2's unmatched-file refusal must fail on the
  unexpected member, never skip it.
- `fixture-must-reach-production-shape` — tasks 4.6 and 5.6 run through the real CLI argument
  path, not by calling `planPrompts`/`renderAdapters` with tidier arguments.
- `assert-absent-needs-an-independent-cause` — tasks 4.5 and 5.5: each negative assertion
  needs a scenario in which something would otherwise have written.
- `absence-must-be-asserted` — task 4.5 asserts the destination set is **empty**, not that one
  named path is missing.
- `adr-section-blank-line-reads-empty` — task 5.7's ADR: `## Context` must be followed
  immediately by prose, and `pnpm format` must not be allowed to insert a blank line there.
- `two-parsers-wrong-together` (reviewed) — the registry is one authority for both the
  config-backed mapping and the enumerated values; do not add a second reader.
- `docs-outlive-the-gate-they-promise` (reviewed) — task 6.2's `NEXT_STEPS.md` text must
  describe only what ships in this item.

---

## Relevant Files

- `packages/provegate/src/core/config/types.ts` — `PromptsConfig`, `WorkflowConfig` extension
- `packages/provegate/src/core/config/defaults.ts` — the opt-in-off default block
- `packages/provegate/src/core/config/validate.ts` — new `stringOrNullRecord` Spec kind, raw-pass shape
- `packages/provegate/src/core/config/load.ts` — `promptsPathContained`, composed at the resolved pass
- `packages/provegate/src/core/run/prompts.ts` — dispositions, render, token grammar, values, adapters
- `packages/provegate/src/core/run/init.ts` — `planPrompts`, `starterConfig`, `planPractices` comment, `PACK_MAP`
- `packages/provegate/src/cli.ts` — `init --prompts` wiring and its summary output
- `packages/provegate/prompts/PLACEHOLDERS.md` — `empty` column, enumerated column
- `packages/provegate/practices/NEXT_STEPS.md` — adopter instructions and the one-way boundary
- `packages/provegate/practices/shims/AGENTS.md.snippet` — Codex shim text
- `packages/provegate/test/config.test.ts` — FR-1
- `packages/provegate/test/prompts.test.ts` — FR-2, FR-3, FR-5 (printed set + reinstall), FR-6
- `packages/provegate/test/content-placeholders.test.ts` — FR-4
- `packages/provegate/test/init.test.ts` — FR-5
- `packages/provegate/test/pack.test.ts`, `packages/provegate/test/pack-manifest.json` — FR-7
- `_brain/adr/ADR-0002-agent-protocol-delivery.md` — the delivery decision
- `_brain/learnings/shipped-content-needs-a-delivery-gate.md`
- `_brain/learnings/derive-the-requirement-from-the-consumer.md`
- `_brain/learnings/scope-out-the-layer-the-rounds-keep-hitting.md`
- `_brain/INDEX.md` — pointer lines (shared-append-only; not in the Conflict Surface)

### Notes

- Tests live in `packages/provegate/test/`, matching the existing package layout.
- `_brain/INDEX.md` is in `workflow.config.json` `sharedAppendOnly` as of `eded477`; append
  pointer lines, never rewrite the file.
- `prompts/adapters/*` are **shipped protocols this work renders**. Do not edit or delete them.

---

## Tasks

- [x] 0.0 Pre-flight
  - [x] 0.1 Open each Memory Context record and confirm the paths, line numbers and commands
        it names still exist; record any stale finding in **Deferrals & Decisions**.
  - [x] 0.2 `gate open PRD-029` — claim the lease. Confirm the lease's `ownedPaths` mirror the
        PRD's Conflict Surface.
  - [x] 0.3 Run `gate queue` and re-measure the overlap with PRD-026. The PRD names six shared
        paths; **do not trust that paragraph** — if PRD-026 is in flight, stop and hand back.
  - [x] 0.4 Record the baseline test count from `pnpm test` in the **Progress Log**, so the
        Phase 5 delta is measurable.

- [x] 1.0 Config surface (FR-1)
  - [x] 1.1 Add `PromptsConfig` to `packages/provegate/src/core/config/types.ts`: `enabled:
        boolean`, `dir: string`, `adapters: string[]`, `values: Record<string, string | null>`;
        extend `WorkflowConfig`.
  - [x] 1.2 Add the default block to `packages/provegate/src/core/config/defaults.ts` with
        `enabled: false`, mirroring the `memory` block's shape **and its comment** — the
        rationale at `defaults.ts:95-101` is why presence is never the predicate.
  - [x] 1.3 Add a `stringOrNullRecord` kind to the `Spec` union in
        `packages/provegate/src/core/config/validate.ts` and its arm in the switch. Do **not**
        reuse `stringRecord`: `validate.ts:149-155` rejects non-strings and empty strings,
        which are the two values FR-4 declares legal.
  - [x] 1.4 Declare the `prompts` shape in `validateConfig`'s raw-pass spec, including
        `adapters` membership. **Unknown `values` keys are not checked here** — that is task
        3.4's render diagnostic.
  - [x] 1.5 Add `promptsPathContained(root, config)` to
        `packages/provegate/src/core/config/load.ts` beside `memoryPathsContained`, reusing its
        longest-existing-prefix resolution, and compose it into the resolved pass at line 273.
  - [x] 1.6 `packages/provegate/test/config.test.ts`: a config never mentioning `prompts`
        resolves to `enabled: false`; `null` and `""` both pass the new shape; a
        not-yet-created `.provegate` passes containment; an escaping `dir` and a symlinked root
        are both refused **(deny test — PRD §11 hard cap)**.

- [x] 2.0 Render core (FR-2, FR-3)
  - [x] 2.1 Create `packages/provegate/src/core/run/prompts.ts` with the ordered `DISPOSITIONS`
        list exactly as the PRD's table states, rules 1–6 in order.
  - [x] 2.2 `planStore`: walk every regular file at any depth under the package's `prompts/`
        and `templates/`; first match wins; **a file matching no rule fails the plan by name**,
        listing the dispositions available.
  - [x] 2.3 Refuse symlinks by name — neither follow nor skip — with a diagnostic naming the
        file and the remedy.
  - [x] 2.4 `assertNoCollision`: compare destinations case-folded and NFC-normalised; a
        collision fails the plan naming both sources.
  - [x] 2.5 `scanTokens`: two candidate classes with the **escape class matched first**
        (`{{` + `!`+, then `{{` + `[A-Z]`). Text in neither class passes through untouched.
  - [x] 2.6 `substituteOnce`: collect every source occurrence before replacing; replace each
        exactly once; treat values as **opaque** and never re-scan output.
  - [x] 2.7 Emit the four diagnostics — malformed, undeclared, unresolved, unused — each naming
        file and line (or key). Prove the refusal against the **shipped corpus with an empty
        `values` map**.
  - [x] 2.8 `bannerFor`: banner first, except where a format requires frontmatter first, where
        it follows the closing `---`. The verbatim file carries no banner.
  - [x] 2.9 Generate `<dir>/README.md` stating the tree is generated, the producing version,
        that two adapter destinations live outside the directory, and the reinstall rule.
  - [x] 2.10 `packages/provegate/test/prompts.test.ts`: rule 4 before rule 5; a `.txt` and a
        nested `templates/legacy/x-template.md` each fail by name; a symlink fails; nested
        paths preserved; the pinned path set; escape recursion; `{{lowercase}}` untouched;
        line-broken token malformed; an opaque value containing a token not re-scanned.

- [x] 3.0 Values and enumerated tokens (FR-4)
  - [x] 3.1 `requiredValues`: derive from the tokens FR-2 dispositions as **rendered**, minus
        the config-backed set. Never from the registry.
  - [x] 3.2 `CONFIG_BACKED`: the seven mappings, derived from `PLACEHOLDERS.md` rather than
        restated in code.
  - [x] 3.3 Add the `empty` column to `packages/provegate/prompts/PLACEHOLDERS.md`, `allowed`
        for `{{DOMAIN_CHECKS}}` and `{{ENV_NOTES}}` only, plus the enumerated column.
  - [x] 3.4 Unknown-`values`-key detection as the render's `unused` diagnostic, naming the key
        and the tokens the corpus requires.
  - [x] 3.5 `enumeratedTokens` / `fragmentFor` / `assertFragmentTerminal`: legal values from the
        registry, fragments at `prompts/_fragments/<TOKEN>.<value>.md`, an illegal value fails
        by name, a fragment containing a candidate fails **at render and in a package test —
        not at build time**.
  - [x] 3.6 `packages/provegate/test/content-placeholders.test.ts`: nine required; the four
        practices-only tokens excluded; a registry row naming a config path `WorkflowConfig`
        lacks fails; the per-token empty policy in both directions; a terminality violation
        fails.

- [x] 4.0 Installer (FR-5)
  - [x] 4.1 `planPrompts` in `packages/provegate/src/core/run/init.ts`, producing `InitAction`s
        under the existing `wx` additive-only contract. **No preflight, no mismatch refusal.**
  - [x] 4.2 Refuse before writing anything when a required value is unresolved — no store file,
        no adapter, no starter config — listing each token with its meaning.
  - [x] 4.3 Print the complete generated path set on **every** run, written and skipped alike,
        including the two destinations outside `<dir>`; state the reinstall rule in the summary.
  - [x] 4.4 `starterConfig` sets `templates.prd` to the rendered template when it writes a
        config; when one exists, print the block and the value to set and edit nothing.
  - [x] 4.5 `packages/provegate/test/init.test.ts`: a refused run leaves the filesystem
        **byte-identical** (assert the destination set is empty, with a scenario that would
        otherwise have written); a re-run reports every existing path skipped; an existing
        config is untouched; `--practices` alone installs no store.
  - [x] 4.6 `packages/provegate/test/prompts.test.ts`: the printed set equals the plan's
        destinations, and **following the reinstall instruction across a version bump leaves no
        path carrying the old banner**. Drive it through the real CLI argument path.

- [x] 5.0 Adapters (FR-6)
  - [x] 5.1 `renderAdapters` emitting the three named destinations exactly as the PRD states.
  - [x] 5.2 `ADAPTER_GRAMMAR`: the Claude command skeleton, the `.mdc` frontmatter keys in
        order, the two-column table in phase order.
  - [x] 5.3 `globs` derivation: each `config.dirs.artifacts` entry in declared key order →
        `<entry.dir>/**/*.md`, joined with `, ` as a single unquoted scalar. `prefix` unused.
  - [x] 5.4 Codex adapter as a snippet inside `<dir>`; never a write to `AGENTS.md`.
  - [x] 5.5 Narrow the `planPractices` comment in `init.ts` to distinguish an adopter's
        entrypoint from a provegate-namespaced generated adapter.
  - [x] 5.6 `packages/provegate/test/prompts.test.ts`: each adapter conforms to its destination
        and skeleton; the rendered `.mdc` opens with `---` and its `globs` line matches the
        pinned string; a fixture that **already has** `AGENTS.md` leaves it byte-identical.
  - [x] 5.7 Write `_brain/adr/ADR-0002-agent-protocol-delivery.md` — one-way delivery,
        enumerated tokens over a template language, grammar-checked adapters, the narrowed
        entrypoint invariant. `## Context` followed immediately by prose.

- [x] 6.0 Pack (FR-7)
  - [x] 6.1 `PACK_MAP` additions — static files only; no rendered output enters the pack.
  - [x] 6.2 `packages/provegate/practices/NEXT_STEPS.md`: name `gate init --prompts`, say the
        values are printed by it, say where the store and the two out-of-store destinations
        land, and **state the one-way boundary in the adopter's own words**.
  - [x] 6.3 Update `packages/provegate/practices/shims/AGENTS.md.snippet`.
  - [x] 6.4 Reconcile `packages/provegate/test/pack-manifest.json` and the pack-drift ledger.
  - [x] 6.5 `packages/provegate/test/pack.test.ts` and `test/practices-pack.test.ts` green with
        the additions.

- [x] 7.0 Migration & Rollback Plan
  - [x] 7.1 **Forward**: a repository that has not opted in is byte-identical to the pre-PRD
        build. Hold it with a test, not an assertion in prose.
  - [x] 7.2 **Activation for an existing repository**: confirm by fixture that the only path is
        printing the block for the human to paste, and that no existing config is edited.
  - [x] 7.3 **Reinstall**: confirm the printed set is the complete unit, and that deleting it
        and re-running produces a store with no file carrying the previous version's banner.
        This is task 4.6's test, referenced here because it is the migration story.
  - [x] 7.4 **Rollback**: deleting the printed set plus removing the `prompts` block returns the
        repository to its pre-install state; `templates.prd` must be cleared in the same edit or
        `gate new` reads a path that no longer exists. Record this in `NEXT_STEPS.md`.
  - [x] 7.5 **Deployment order**: confirm the prompt plan's actions inherit `initWorkspace`'s
        ordering (`init.ts:265-275`) and that the config write stays last.
  - [x] 7.6 Record in **Deferrals & Decisions** that automated staleness detection is deferred
        to PRD-030 by scope, with the PRD's Non-Goal as the reference.

- [x] 8.0 Phase 5 — Testing
  - [x] 8.1 `pnpm --filter provegate test test/config.test.ts` (FR-1)
  - [x] 8.2 `pnpm --filter provegate test test/prompts.test.ts` (FR-2)
  - [x] 8.3 `pnpm --filter provegate test test/prompts.test.ts` (FR-3)
  - [x] 8.4 `pnpm --filter provegate test test/content-placeholders.test.ts` (FR-4)
  - [x] 8.5 `pnpm --filter provegate test test/init.test.ts` (FR-5)
  - [x] 8.6 `pnpm --filter provegate test test/prompts.test.ts` (FR-5, printed set + reinstall)
  - [x] 8.7 `pnpm --filter provegate test test/prompts.test.ts` (FR-6)
  - [x] 8.8 `pnpm verify:pack-drift` (FR-7)
  - [x] 8.9 `pnpm --filter provegate test test/pack.test.ts` (FR-7)
  - [x] 8.10 Cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`, `pnpm build`.
  - [x] 8.11 Record every result in the **Verification Ledger** with evidence. A listed-but-not-run
        command is never `passed`.

- [x] 9.0 Phase 6 — Final Auditing
  - [x] 9.1 Independent adversarial review of the full diff — a different model family or a
        fresh session, **never the implementing session**. Tier: high.
  - [x] 9.2 Spec-vs-code audit: every FR's stated behaviour against what was built, and every
        §12 DO NOT confirmed not violated.
  - [ ] 9.3 **Restatement sweep** — for every rule the implementation changed, re-read §2, §3,
        §6, §11, §12 and the Memory Inputs against the FR that owns it. Eight readiness rounds
        produced eight instances of a rule corrected where owned and stale where restated, four
        of them inside the fixes. Do this as a separate step **after** the fixes, and do not
        write that it was done in the same edit that does it.
  - [x] 9.4 Save `_docs/reviews/review-029-method-delivery-agent-binding.md` and set the
        `independent-review` ledger row.

- [ ] 10.0 Phase 7 — Learning
  - [x] 10.1 `_brain/learnings/shipped-content-needs-a-delivery-gate.md`
  - [x] 10.2 `_brain/learnings/derive-the-requirement-from-the-consumer.md`
  - [x] 10.3 `_brain/learnings/scope-out-the-layer-the-rounds-keep-hitting.md` — also resolves
        the forward link already recorded in `score-band-prescribes-the-action`.
  - [x] 10.4 Append one `_brain/INDEX.md` pointer per record and per ADR-0002. Append only.
  - [x] 10.5 `pnpm verify:brain` green; every Durable Artifact present in the merge diff.
  - [ ] 10.6 Write `_docs/wip/summary-029-method-delivery-agent-binding.md`.

---

## Verification Ledger

One row per PRD §11 command (pre-populated by Phase 3, all `pending`), plus the
cross-cutting floor and the review row. `gate run` reads the `independent-review` row:
it must be `passed` and name the review artifact path.

| Gate               | Command / Check                                                  | Scope | Result  | Evidence | Notes                                            |
| ------------------ | ---------------------------------------------------------------- | ----- | ------- | -------- | ------------------------------------------------ |
| FR-1               | `pnpm --filter provegate test test/config.test.ts`               | pkg   | passed  | 15 passed | enabled-false default; null and empty; containment |
| FR-2               | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | passed  | 34 passed | ordered dispositions; unmatched and symlink fail  |
| FR-3               | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | passed  | 34 passed | escape first and recursive; four diagnostics      |
| FR-4               | `pnpm --filter provegate test test/content-placeholders.test.ts` | pkg   | passed  | 15 passed | nine required; empty policy; terminality          |
| FR-5               | `pnpm --filter provegate test test/init.test.ts`                 | pkg   | passed  | 44 passed | refused run byte-identical; re-run skips          |
| FR-5               | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | passed  | 34 passed | printed set; no old banner after reinstall        |
| FR-6               | `pnpm --filter provegate test test/prompts.test.ts`              | pkg   | passed  | 34 passed | adapter destinations and grammar                  |
| FR-7               | `pnpm verify:pack-drift`                                          | repo  | passed  | 49 pairs | pairs reconcile on both sides                     |
| FR-7               | `pnpm --filter provegate test test/pack.test.ts`                 | pkg   | passed  | 9 passed | shipped-file allowlist matches the tarball        |
| types              | `pnpm check-types`                                                | repo  | passed  | 5/5 tasks | zero errors                                       |
| lint               | `pnpm lint`                                                       | repo  | passed  | 4/4 tasks | zero warnings                                     |
| test               | `pnpm test`                                                       | repo  | passed  | 1093 passed | added tests pass; existing unchanged              |
| build              | `pnpm build`                                                      | repo  | passed  | 4/4 tasks | clean build                                       |
| independent-review | `_docs/reviews/review-029-method-delivery-agent-binding.md`      | repo  | passed  | round 2  | verdict pass, critical = 0 (round 1: fail, 1 critical) |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

> Short single-line entries written **during Phase 4** when a non-obvious decision,
> scope cut, or accepted deviation is taken. Format: `- <task#> — <decision>; <≤1
sentence rationale>`. Never inline on sub-task lines.

- 1.5 — extracted `resolveContainedPaths` from `memoryPathsContained` rather than duplicating it; each caller keeps its own enabled-guard, entry list and post-checks, because `strictness-added-during-extraction-is-a-behavior-change` warns that a shared primitive relocates decisions the callers owned. Proof is the unmodified memory suite, not the comment.
- 9.x/m4 — the Codex snippet stays without a banner. FR-6 specifies exactly a heading and a table, and adding one would put the code outside the spec that was scored 8.35. The reviewer's point is fair — it is the one artifact a human pastes into a file they own — and it is a spec change for a later item, not a Phase 4 edit.
- 7.6 — automated staleness detection is deferred to PRD-030 by scope, per this PRD's Non-Goals. After a package upgrade the store does not change and nothing detects it; every generated file names the producing version, and reading that banner is the disclosed mechanism. Recorded here because a reviewer will read the absence as a gap rather than a boundary.
- 7.1 — "byte-identical for a non-adopter" is held by comparing the PLAN, not by a sentence: `planInit` emits no `.provegate/`, `.claude/` or `.cursor/` action, and the starter config it writes carries no `prompts` block. Adding the block to `DEFAULT_CONFIG` changes nothing for such a repository because `enabled` gates every consumer.
- 6.1 — `PACK_MAP` gains NO entry. The pack is a static source→destination table and the store is a config-dependent render, so the only pack change is instructional: `NEXT_STEPS.md` §5 tells the adopter to run `gate init --prompts` separately and states the one-way boundary. `verify:pack-drift` stays at 49 pairs, which is the evidence that nothing rendered entered the pack.
- 5.1–5.4 — landed WITH parent 4 rather than after it. FR-5 requires every run to print the complete generated set, and that set includes the two adapter destinations outside the store, so `renderAdapters` is a dependency of `planPrompts` rather than a successor to it. The task order read the other way; the dependency did not.
- 4.5 — the reinstall pair is deliberate: one test asserts that deleting only the store directory LEAVES v1 adapters in place (the defect readiness iteration 6 found, kept as a regression guard), and the next asserts the corrected procedure leaves no path carrying the old banner. The first would pass on a broken implementation, which is why it is paired rather than alone.
- 3.2 — `CONFIG_BACKED` is not a constant: the seven mappings are read from `PLACEHOLDERS.md`'s `workflow.config field` column, so the registry stays the single authority for token metadata and a second reader cannot disagree with it (`two-parsers-wrong-together`). A test asserts every declared path resolves against `DEFAULT_CONFIG`.
- 3.5 — fragment terminality is enforced at RENDER time and by a package test, never "at build time": the package `build` is one `tsup` invocation with no content validation and an adopter does not build package content at install. Wiring it there would be the `gate-wire-or-delete` failure readiness iteration 5 found.
- 2.5 — `ESCAPE_CANDIDATE` has no standalone constant: `substituteOnce` must match both candidate classes in ONE alternation to keep the escape ordered first, and a second pass would reintroduce the ordering bug readiness iteration 4 found. Documented in the module rather than left to a reader to rediscover.
- 2.7/2.9 — the four diagnostics and the generated store README are deferred to parent 3, where `requiredValues` supplies the registry the `undeclared`/`unresolved`/`unused` messages need. `scanTokens` already emits `malformed`.
- 1.4 — unknown `values` keys are deliberately NOT a raw-pass issue; a test asserts they pass config load, and the `unused` render diagnostic (task 3.4) owns them. Recorded because a reviewer will read the permissiveness as a gap.

---

## Progress Log

> Multi-line runtime context or deviations that don't fit one line.

| Date | Task | Notes |
| ---- | ---- | ----- |
| 2026-07-27 | 0.3 | `gate queue` re-measured: no overlap warning, PRD-026 is BLOCKED at Draft/ITERATE Phase 1, nothing IN-FLIGHT. Safe to proceed; the PRD's six-path overlap is latent, not active. |
| 2026-07-27 | 0.4 | Baseline `pnpm test`: **1026 passed, 49 files** (plus web 39/3). |
| 2026-07-27 | 1.0 | 1026 → 1034 (8 new in `config.test.ts`); every pre-existing test unmodified, which is the extraction proof for 1.5. |
| 2026-07-27 | 9.0 | Phase 6 round 1: **fail, 1 critical**. C1 — an unvalidated adapter name produced a store with no agent bound to it and exit 0. M1 — `prompts.dir` never joined the lexical path rules, so `~/store` was accepted and the printed reinstall set, whose instruction is "delete EVERY path above", expanded to the adopter's HOME. M2 — the containment diagnostic was swallowed and reported as "prompts is not enabled". M3 — the collision guard had no effective test on a case-insensitive volume. All fixed; round 2 **pass, critical 0**. |
| 2026-07-27 | 9.0 | **Two overshoots inside the remediation itself, both caught by the suite.** The m2 regex spanned two adjacent valid tokens and refused four shipped files; the M2 fix broke `gate init` in a bare directory. Both are `strictness-added-during-extraction-is-a-behavior-change`, committed by the session that had just been shown that record — which is the same positional failure `a-record-declared-is-not-a-record-applied` describes. |
| 2026-07-27 | 10.x | Three declared learnings written and indexed; `verify:brain` and `verify:workflow` green. `scope-out-the-layer-the-rounds-keep-hitting` also resolves the forward link `score-band-prescribes-the-action` has been carrying since it was written. |
| 2026-07-27 | 8.0 | Phase 5 green. Every §11 row executed and recorded with evidence — nine FR rows and the four floor commands, no ad-hoc additions and no omissions. Baseline 1026 → **1087**, 61 new tests, every pre-existing one unmodified. |
| 2026-07-27 | 7.0 | 1079 → **1087**. Eight migration tests. The ordering one asserts `report.created` puts the store before `workflow.config.json`, rather than trusting `initWorkspace`'s comment that activation is written last. |
| 2026-07-27 | 6.0 | 1073 → **1079**. `verify:pack-drift` green at 49 pairs — no `PACK_MAP` entry was needed: the store is rendered, not packed, so the pack gains instructions rather than files. |
| 2026-07-27 | 5.6 | The adapter prose test failed on its first run against the generated BANNER, which appears in every rendered file by design. Fixed by stripping the banner from both sides — the failure is what made the filter honest rather than permissive. |
| 2026-07-27 | 4.0 | 1066 → **1073**. End-to-end verified on a scratch repo: opt-in prints the block with nine `null` keys and refuses; filled config renders the store plus 7 Claude commands, 1 Cursor rule, 1 Codex snippet. `.mdc` line 1 is `---`, and the `globs` line reproduces `source-snapshot/rules/prd-workflow.mdc:3` byte for byte. The only file left carrying `{{` is `PLACEHOLDERS.md` — verbatim by disposition, exactly as specified. |
| 2026-07-27 | 3.0 | 1026 → **1066**. FR-4's central claim is now machine-verified: **9 required values**, not the registry's 20 and not the 13 an earlier draft asserted. The four practices-only tokens are declared and never demanded. |
| 2026-07-27 | 2.0 | prompts.ts core landed. 21 tests in `prompts.test.ts`. The corpus measurement is now machine-pinned: 12 rendered protocols, 7 rendered templates, 1 verbatim — the figures the PRD states as a measurement rather than a specification. |
| 2026-07-27 | 1.6 | Mutation-checked: removing `promptsPathContained` from the resolved pass fails the escaping-dir deny test **and only that test** (1 failed / 14 passed). |

---

## Blockers / Open Questions

- (none)

---

## Operator Handoff

> Human/runtime/staging checks the agent cannot complete. Keep the corresponding task
> checkbox unchecked until resolved or explicitly accepted.
> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`}.

| Task | Category  | Owner | Required Check                                                                                                              | Status  | Notes                                                                                                         |
| ---- | --------- | ----- | --------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| 5.6  | manual-qa | owner | The generated `.cursor/rules/prd-workflow.mdc` actually attaches in a real Cursor session on a `_prds/**` file                | pending | The grammar test pins the bytes; only a live editor proves the rule attaches. This is why the PRD is operator-gated |
| 5.6  | manual-qa | owner | A generated `.claude/commands/prd-*.md` is invocable in a real Claude Code session and loads the store protocol it points at | pending | Same reason: a pointer that parses is not a pointer that resolves for the tool                                 |

