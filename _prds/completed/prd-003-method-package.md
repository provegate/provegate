# PRD-003: Method Package — Prompts, Templates, METHOD.md, Examples

> **Status**: Operator Verification
> **Created**: 2026-07-22
> **Updated**: 2026-07-22
> **Author**: rayvaz
> **Audience**: Implementing Agent (Claude Code / Cursor / Codex)
> **Slug**: `method-package`
> **Cycle Phase**: 7 (Learning — operator close pending)
> **PRD Class**: feature
> **Class Rationale**: (default class) — the method content IS the product's user-facing surface; this PRD ships what `npm install -D provegate` exists to deliver.
> **Autonomous Close**: operator-gated
> **State Record**: `_state/prds.json`

---

## 1. Introduction / Overview

Roadmap Phase D. Extract the method itself into the package: the 7 phase prompts, the
orchestration-runner prompt, the two knowledge prompts, the tool adapters, the 6 artifact
templates plus the status board, the `METHOD.md` spec, and a 2–3 gate example gallery —
all English-only, de-parented, placeholder-parameterized per the source-snapshot MANIFEST
rules. Source portability map (inventory §3): phase-5 80%, orchestration-runner 75%,
phase-2 70%, phase-7 70% port near-verbatim; phase-1/3/4/6 need example-block swaps;
the Cursor adapter is a rewrite; the Codex starter carries a known renumber drift
("Phase 3" text) that must be corrected during the port.

The Phase-D twist: **content is verified by the engine Phases B–C shipped.** Templates
round-trip through the real parsers (`lintPrd`, `validateReviewArtifact`,
`parseVerificationCommands`, `buildState`), so a template that drifts from the tooling
fails a vitest gate, not a reader's patience. Prompts reference the shipped CLI
(`gate check`, `gate run`, `gate status`) instead of the parent's script names.

---

## 2. Goals

### Primary Goals

- [x] 10 core method prompts + 2 adapters shipped under `prompts/`, placeholder-clean.
- [x] 7 artifact templates shipped under `templates/`, each mechanically validated
      against the Phase B–C engine.
- [x] `METHOD.md`: the method spec distilled from the parent WORKFLOW.md's generic core.
- [x] `examples/`: 2–3 genericized gate plugins wired as manifest snippets.
- [x] Every content file passes the hygiene gate: no parent-project names, no personal
      names, English-only, valid placeholder tokens.

### Success Metrics

| Metric                       | Current               | Target                                                           | Measurement                      |
| ---------------------------- | --------------------- | ---------------------------------------------------------------- | -------------------------------- |
| Method assets in the package | 4 placeholder READMEs | 10 prompts + 2 adapters + 7 templates + METHOD.md + 2–3 examples | `npm pack` listing + vitest      |
| Template ↔ engine drift      | unchecked             | mechanically impossible                                          | round-trip tests via B–C parsers |
| Parent-project residue       | n/a                   | 0 occurrences                                                    | hygiene test greps               |
| Codex-starter renumber drift | present in source     | corrected                                                        | prompt content test              |

---

## 3. User Stories

### Primary User: adopting team (agent operator + spec author)

#### User Story 1

```
As an adopter,
I want the phase prompts to arrive with the package and reference the shipped CLI,
so that I can paste a prompt into my agent and the gates it names actually exist on my machine.
```

**Acceptance Criteria:**

- [ ] Each phase prompt names `gate check` / `gate run` / `gate status` where the parent
      named internal scripts; no command referenced in a prompt is absent from the CLI.
- [ ] Project-specific content sits in documented `{{PLACEHOLDER}}` tokens, never inline
      example residue from the parent project.
- [ ] The orchestration-runner prompt carries the substrate split (stochastic agents /
      deterministic runner) and the never-push invariant verbatim.

#### User Story 2

```
As a spec author,
I want the PRD/readiness/tasks/review templates to match the machine gates exactly,
so that an artifact created from a template passes `gate check` and the runner's parsers on day one.
```

**Acceptance Criteria:**

- [ ] A minimally-filled PRD template passes `lintPrd` structurally.
- [ ] The review template's metadata block validates through `validateReviewArtifact`.
- [ ] The tasks template ships a ledger whose `independent-review` row shape satisfies
      `validateTasksReviewRow`'s parser, and the readiness template's Score/Verdict rows
      parse through the state builder.

#### User Story 3

```
As an evaluating engineer,
I want METHOD.md and the example gates to explain the system without the parent project,
so that I can judge and adapt the method from the package alone.
```

**Acceptance Criteria:**

- [ ] METHOD.md covers: the gate rule, 7 phases + gate table, PRD classes, status
      lifecycle, conflict surfaces/locks, deferral governance, autonomy boundary.
- [ ] Each example gate ships as a runnable zero-dependency script plus the manifest
      snippet wiring it.
- [ ] No section requires knowledge of the parent project to parse.

---

## 4. Functional Requirements

Content files are markdown/scripts under `packages/provegate/`; every FR carries a
vitest verification suite. English-only, no parent names, no personal names (MANIFEST
rules bind).

1. **FR-1 — Placeholder convention**: define the token set (`{{PROJECT_NAME}}`,
   `{{BASE_BRANCH}}`, `{{ID_PREFIX}}`, `{{COMMANDS_*}}`, `{{DOMAIN_CHECKS}}`, …) in
   `prompts/PLACEHOLDERS.md` with one-line semantics each; every `{{…}}` token used
   anywhere in `prompts/` or `templates/` must be declared there.
   - **Targets:** `packages/provegate/prompts/PLACEHOLDERS.md`, `packages/provegate/test/content-placeholders.test.ts`
2. **FR-2 — Phase prompts (7)**: port `phase-1-prd-generator` … `phase-7-learning` from
   the snapshot: English, parent examples/DO-NOTs/References swapped for generic content
   or placeholders, command references updated to the shipped CLI, class tables and
   scoring weights preserved intact (they are the method's calibrated core).
   **Unshipped-tooling policy**: where the parent flow used tooling not yet extracted
   (acceptance recording, worktree start/stop, state panel sync), the prompt describes
   the manual procedure (e.g. "record an owner entry in the acceptances file — see
   METHOD.md") and never names a command the CLI does not have.
   - **Targets:** `packages/provegate/prompts/phase-1-prd-generator.md`, `packages/provegate/prompts/phase-2-readiness-scorer.md`, `packages/provegate/prompts/phase-3-task-generator.md`, `packages/provegate/prompts/phase-4-implementation.md`, `packages/provegate/prompts/phase-5-testing.md`, `packages/provegate/prompts/phase-6-final-auditing.md`, `packages/provegate/prompts/phase-7-learning.md`
3. **FR-3 — Orchestration-runner prompt**: port with the substrate split, the 5-lens
   review panel (correctness/security/cross-tenant/contract/perf) with ≥3/5 quorum, and
   the invariant block (learning-before-merge, cleanup-after-verified-merge, never-push).
   - **Targets:** `packages/provegate/prompts/orchestration-runner.md`
4. **FR-4 — Knowledge prompts (2)**: port `wiki-ingest` and `wiki-lint` with the parent's
   page taxonomy replaced by a generic knowledge-base model (architecture / decisions /
   patterns / operations pages under a configurable docs root).
   - **Targets:** `packages/provegate/prompts/knowledge-ingest.md`, `packages/provegate/prompts/knowledge-lint.md`
5. **FR-5 — Tool adapters (2)**: `adapters/cursor-bootstrap.md` (rewrite — source is 85%
   parent-specific) and `adapters/codex-starter.md` (port; **fix the "Phase 3" renumber
   drift** — the content must say Phase 4, inventory side-finding #1).
   - **Targets:** `packages/provegate/prompts/adapters/cursor-bootstrap.md`, `packages/provegate/prompts/adapters/codex-starter.md`
6. **FR-6 — Artifact templates (7)**: port prd / readiness / tasks / summary / review /
   doc templates plus the status-board structure: English throughout (source carries
   Turkish comment blocks and board headers), parent blocks (§8 scope apps, §11
   hard-cap examples, §12 DO-NOTs, readiness checklist) swapped for generic
   placeholder blocks, metadata shapes byte-compatible with the Phase B–C parsers.
   - **Targets:** `packages/provegate/templates/prd-template.md`, `packages/provegate/templates/readiness-template.md`, `packages/provegate/templates/tasks-template.md`, `packages/provegate/templates/summary-template.md`, `packages/provegate/templates/review-template.md`, `packages/provegate/templates/doc-template.md`, `packages/provegate/templates/status-board-template.md`
7. **FR-7 — METHOD.md**: distill the parent WORKFLOW.md's generic ~60% into the package
   method spec: the gate rule, phase model + gate table, PRD classes, 9-value status
   lifecycle, conflict surface → lock → path-conflict chain, deferral renewal-cap
   governance, autonomy boundary (humans: spec/verdict/plan/push), calibration principle
   (binary verdict + hard caps). Cross-link prompts/templates/CLI.
   - **Targets:** `packages/provegate/METHOD.md`, `packages/provegate/package.json`
8. **FR-8 — Examples gallery (2)**: genericized domain gates as zero-dependency runnable
   scripts + manifest wiring snippets: `route-guard-coverage` (every route file matches a
   guard-pattern test file) and `doc-drift` (declared docs updated when watched paths
   change), each with a README explaining the pattern and its manifest snippet.
   - **Targets:** `packages/provegate/examples/route-guard-coverage/check.mjs`, `packages/provegate/examples/route-guard-coverage/README.md`, `packages/provegate/examples/doc-drift/check.mjs`, `packages/provegate/examples/doc-drift/README.md`, `packages/provegate/examples/README.md`
9. **FR-9 — Content verification suite**: hygiene (no `emofy`/`rayvaz`/Turkish
   characters anywhere under `prompts/`, `templates/`, `examples/`, `METHOD.md`;
   placeholder tokens all declared; CLI commands named in prompts exist in the CLI
   usage), plus the template↔engine round-trips: filled PRD template passes `lintPrd`;
   review template validates via `validateReviewArtifact`; tasks-template ledger row
   satisfies `validateTasksReviewRow`; readiness/status-board rows parse via
   `buildState`/`statusPanelMetrics` labels; example scripts execute (pass and fail
   fixtures).
   - **Targets:** `packages/provegate/test/content-hygiene.test.ts`, `packages/provegate/test/content-prompts.test.ts`, `packages/provegate/test/content-templates.test.ts`, `packages/provegate/test/content-examples.test.ts`
10. **FR-10 — Packaging + docs**: `npm pack --dry-run` includes every content file
    (`files` already lists the dirs; METHOD.md must be added); docs-site method page
    gains the real phase/gate table from METHOD.md; package README links the method
    assets.
    - **Targets:** `packages/provegate/package.json`, `apps/docs/content/docs/method.mdx`, `packages/provegate/README.md`

---

## 5. Non-Goals (Out of Scope)

- **Domain gates beyond the 2 gallery examples** — the parent's ~55 domain gates stay
  out by design (roadmap scope discipline §0.4).
- **Worktree machinery** (`prd-worktree.mjs`) — separate PRD.
- **`gate init` scaffolding** that copies these templates into a repo — natural follow-up
  PRD once the templates exist; not here.
- **Prompt auto-templating engine** (rendering `{{…}}` from workflow.config) — tokens are
  documented for manual/agent substitution in this phase.
- **Launch copy, whitepaper, case study** — roadmap Phase E.
- **The parent's `sis-ema`/`repo-cleanup`/`bug-sweep` prompts** — explicitly excluded by
  the inventory (AT list).

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** the packed tarball, **When** its file list is inspected, **Then** it contains
  10 prompts, 2 adapters, PLACEHOLDERS.md, 7 templates, METHOD.md, and the examples.
- **Given** any content file, **When** the hygiene suite runs, **Then** zero matches for
  parent-project names, personal names, or non-ASCII Turkish characters, and every
  `{{…}}` token is declared in PLACEHOLDERS.md.
- **Given** the PRD template filled with minimal generic values, **When** `lintPrd` runs
  against it, **Then** it reports zero structural issues.
- **Given** the review template with its sample metadata values, **When**
  `validateReviewArtifact` runs, **Then** it validates (and flips to invalid when
  Verdict/Critical contradict).
- **Given** the codex-starter adapter, **When** its content is scanned, **Then** it names
  Phase 4 (the source's "Phase 3" drift is gone).
- **Given** the example gate scripts with their pass and fail fixtures, **When** executed
  with node, **Then** exit codes are 0 and 1 respectively.
- **Given** this PRD itself, **When** `gate check PRD-003` runs, **Then** exit 0 — the
  first PRD linted by the real gate from its first draft.

---

## 7. Technical Considerations

### Architecture

- **Content, not code**: no changes to `src/` beyond none-at-all; the engine consumes
  the templates, never the reverse. The verification suite imports the engine from
  `src/` (same package) to round-trip the templates.
- **Placeholder policy**: tokens are UPPER_SNAKE inside `{{…}}`; PLACEHOLDERS.md is the
  registry; the hygiene test enforces declaration. Rendering stays manual by design
  (agents substitute during Phase 1/adoption; `gate init` automation is a later PRD).
- **Calibrated content is load-bearing**: phase-2 scoring weights, hard-cap rules,
  class tables, and the 5-lens quorum port UNCHANGED — they encode the 143-finding
  calibration; wording may localize, numbers may not.
- **Unshipped-tooling policy** (applies to every prompt/template): shipped CLI commands
  are named directly; parent flows without a shipped equivalent become documented manual
  procedures; nothing is presented as a command that does not exist.
- **Turkish source surfaces** (template comments, status-board headers, prompt notes)
  are translated, not transliterated; the status board keeps the parent's table
  _structure_ (lock mirror + owner/due/renewal columns) with English headers matching
  `statusPanelMetrics` labels.

### Dependencies

- Runtime: none (unchanged). Example scripts: node builtins only.

### Database Changes

- None.

### API Changes

- None to the CLI. Package surface: new content directories + `METHOD.md` in `files`.

---

## 8. Implementation Scope

### In Scope

- [x] `packages/provegate/prompts/` (10 + 2 adapters + PLACEHOLDERS.md; replaces placeholder README)
- [x] `packages/provegate/templates/` (7 templates; replaces placeholder README)
- [x] `packages/provegate/examples/` (2 gates + READMEs)
- [x] `packages/provegate/METHOD.md`
- [x] `packages/provegate/test/content-*.test.ts`
- [x] `packages/provegate/package.json` (files field), `packages/provegate/README.md`
- [x] `apps/docs/content/docs/method.mdx`

### Out of Scope

- [ ] `packages/provegate/src/**` (no engine changes)
- [ ] Root workflow artifacts beyond the usual PRD lifecycle files

---

## 9. Open Questions

- (none — scope decisions recorded as Non-Goals)

---

## 10. References

- Roadmap Phase D: `docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md` §Faz D
- Portability map: `docs/research/provegate-bootstrap/de-emofy-inventory-2026-07-22.md` §3–4
- Source content: `docs/research/provegate-bootstrap/source-snapshot/{prompts,templates,reference}/`
- Engine consumed for round-trips: PRD-001/PRD-002 core (`lintPrd`, `validateReviewArtifact`, `validateTasksReviewRow`, `parseVerificationCommands`, `buildState`)
- Binding rules: `docs/research/provegate-bootstrap/source-snapshot/MANIFEST.md` §Kullanım kuralları

---

## Conflict Surface

- `packages/provegate/prompts/**`
- `packages/provegate/templates/**`
- `packages/provegate/examples/**`
- `packages/provegate/METHOD.md`
- `packages/provegate/test/**`

---

## Durable Artifacts

- `apps/docs/content/docs/method.mdx` — real phase/gate table lands in the docs site
- `packages/provegate/README.md` — method assets section

---

## 11. Verification Commands

Run from repo root after `pnpm build`.

| FR    | Command / Check                                                           | Scope     | Notes                                                           |
| ----- | ------------------------------------------------------------------------- | --------- | --------------------------------------------------------------- |
| FR-1  | `pnpm --filter provegate test test/content-placeholders.test.ts`          | provegate | every used token declared; registry complete                    |
| FR-2  | `pnpm --filter provegate test test/content-prompts.test.ts`               | provegate | 7 phase prompts: presence, hygiene, CLI refs, weights           |
| FR-3  | `grep -c "never push" packages/provegate/prompts/orchestration-runner.md` | provegate | invariant block present (also covered in prompts suite)         |
| FR-4  | `grep -c architecture packages/provegate/prompts/knowledge-ingest.md`     | provegate | generic taxonomy present (full set asserted in prompts suite)   |
| FR-5  | `grep -c "Phase 4" packages/provegate/prompts/adapters/codex-starter.md`  | provegate | renumber drift fixed (prompts suite asserts no "Phase 3" claim) |
| FR-6  | `pnpm --filter provegate test test/content-templates.test.ts`             | provegate | engine round-trips for all 7 templates                          |
| FR-7  | `grep -cE "^## " packages/provegate/METHOD.md`                            | provegate | spec sections present (content suite checks the set)            |
| FR-8  | `pnpm --filter provegate test test/content-examples.test.ts`              | provegate | pass/fail fixtures execute with exit 0/1                        |
| FR-9  | `pnpm --filter provegate test test/content-hygiene.test.ts`               | provegate | no parent/personal names, English-only, tokens declared         |
| FR-10 | `pnpm --filter provegate exec npm pack --dry-run`                         | provegate | listing includes prompts/templates/examples/METHOD.md           |

Cross-cutting (all green before Code Complete):

- `pnpm check-types` — zero errors (engine untouched, suites compile)
- `pnpm lint` — zero warnings
- `pnpm --filter provegate test` — full suite incl. all PRD-001/002 suites unchanged
- `pnpm build` — clean
- `node packages/provegate/dist/cli.js check PRD-003` — this PRD passes its own gate
- `node packages/provegate/dist/cli.js push; test $? -eq 1` — never-push invariant
- `grep -ri -l -e emofy -e rayvaz packages/provegate/prompts packages/provegate/templates packages/provegate/examples packages/provegate/METHOD.md && exit 1 || true` — content hygiene at the shell level too

---

## 12. DO NOT (Anti-Patterns)

- DO NOT alter calibrated numbers: phase-2 weights, class-conditional tables, hard-cap
  rules, the 5-lens set, or the ≥3/5 quorum — wording localizes, numbers do not.
- DO NOT carry parent examples "temporarily" — every parent-specific block becomes a
  documented placeholder or generic content in the same commit.
- DO NOT let a prompt reference a command the shipped CLI does not have (no
  `pnpm verify:*` parent script names, no unshipped subcommands presented as existing).
- DO NOT introduce undeclared `{{…}}` tokens.
- DO NOT add runtime dependencies; example scripts are node-builtins only.
- DO NOT touch `packages/provegate/src/**` — content extraction must not smuggle engine
  changes past review.
- DO NOT include personal names or non-English content in any shipped file.
- DO NOT fabricate method content absent from the snapshot — port and generalize, never
  invent doctrine.

---

## Changelog

| Date       | Author | Changes                                                                                                                 |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| 2026-07-22 | rayvaz | Initial draft                                                                                                           |
| 2026-07-22 | rayvaz | `gate check` caught table-pipe hazard in FR-4 row (fixed); Phase 2 pre-score fix: unshipped-tooling policy in FR-2 + §7 |
| 2026-07-22 | rayvaz | Phases 4–5 complete (34f42d4): 52 content tests, src frozen, pack verified; Status → Code Complete                      |
