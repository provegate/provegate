# Tasks: Method Package — Prompts, Templates, METHOD.md, Examples

> **PRD**: [prd-003-method-package.md](../../_prds/wip/prd-003-method-package.md)
> **Readiness**: [readiness-003-method-package.md](../../_readiness/wip/readiness-003-method-package.md)
> **Status**: Not Started
> **Readiness Score**: 8.7/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-22

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Operator-owned / blocked work stays unchecked; decisions land in **Deferrals &
  Decisions**; operator work in **Operator Handoff**.

## Technical Standards Reference

- Content only: NO `src/` changes (§12). Tests may import the engine.
- English-only shipped content; hygiene classes per W2 (Turkish letters fail;
  typographic non-ASCII legal). No parent names, no personal names.
- Calibrated numbers port UNCHANGED: phase-2 weights + class tables, hard-cap rules,
  5-lens set, ≥3/5 quorum (§12; W4 review brief).
- Prompts name only shipped CLI commands; unshipped parent flows → documented manual
  procedures (FR-2 policy).
- `{{TOKEN}}` = UPPER_SNAKE, declared in PLACEHOLDERS.md, enforced by test (FR-1).
- Source: `docs/research/provegate-bootstrap/source-snapshot/{prompts,templates,reference}/`.

## Relevant Files

- `packages/provegate/prompts/PLACEHOLDERS.md` (new) + `prompts/README.md` (rewrite)
- `packages/provegate/prompts/phase-{1..7}-*.md` (new, 7 files)
- `packages/provegate/prompts/orchestration-runner.md` (new)
- `packages/provegate/prompts/knowledge-{ingest,lint}.md` (new, 2 files)
- `packages/provegate/prompts/adapters/{cursor-bootstrap,codex-starter}.md` (new, 2 files)
- `packages/provegate/templates/{prd,readiness,tasks,summary,review,doc,status-board}-template.md` (new, 7 files) + `templates/README.md` (rewrite)
- `packages/provegate/METHOD.md` (new)
- `packages/provegate/examples/{route-guard-coverage,doc-drift}/{check.mjs,README.md}` (new) + `examples/README.md` (rewrite)
- `packages/provegate/test/content-{placeholders,prompts,templates,examples,hygiene}.test.ts` (new, 5 suites)
- `packages/provegate/package.json` (`files` += METHOD.md), `packages/provegate/README.md`
- `apps/docs/content/docs/method.mdx`
- `_state/locks/prd-003-method-package.json` (lease, local)

## Tasks

- [ ] 1.0 Pre-flight
  - [ ] 1.1 Branch `feat/prd-003-method-package`; lease with Conflict Surface globs;
        baseline gates green
- [ ] 2.0 Placeholder convention (FR-1)
  - [ ] 2.1 Survey parent-specific values across all source prompts/templates → token
        set; write `prompts/PLACEHOLDERS.md` (token, semantics, example value,
        workflow.config counterpart where one exists)
  - [ ] 2.2 Suite `test/content-placeholders.test.ts`: every `{{…}}` under prompts/ +
        templates/ declared; registry has no orphans; UPPER_SNAKE shape
- [ ] 3.0 Phase prompts port (FR-2, W5)
  - [ ] 3.1 High-portability pair: `phase-5-testing` (80%) + `phase-7-learning` (70%) —
        near-verbatim, CLI refs updated ("run, don't list" discipline intact)
  - [ ] 3.2 `phase-2-readiness-scorer` (70%) — **weights/class tables/hard-caps/tier
        table byte-faithful**; parent checklist block → `{{DOMAIN_CHECKS}}` section
  - [ ] 3.3 `phase-1-prd-generator` (55%) — 12-section structure intact; parent
        discovery examples → generic; References table → placeholder block; **W5: add
        the §11 authoring note (no pipe chars inside backticked table commands)**
  - [ ] 3.4 `phase-3-task-generator` (50%) — class skeletons intact; parent path tables + example task tree → generic equivalents
  - [ ] 3.5 `phase-4-implementation` (50%) — task-file edit contract intact; execution
        loop commands → `{{COMMANDS_*}}` + shipped CLI
  - [ ] 3.6 `phase-6-final-auditing` (45%) — panel/quorum/ship-gate intact; parent
        Memory-Sync step → generic knowledge-sync referencing knowledge prompts
  - [ ] 3.7 Unshipped-tooling sweep over all 7: acceptance/worktree/panel steps become
        manual procedures; zero nonexistent commands
- [ ] 4.0 Orchestration, knowledge, adapters (FR-3, FR-4, FR-5)
  - [ ] 4.1 `orchestration-runner.md` — substrate split, 5-lens panel + ≥3/5 quorum,
        invariants (learning-before-merge, cleanup-after-verified-merge, never-push)
  - [ ] 4.2 `knowledge-ingest.md` + `knowledge-lint.md` — generic taxonomy
        (architecture/decisions/patterns/operations) under `{{DOCS_ROOT}}`
  - [ ] 4.3 `adapters/codex-starter.md` — port + **fix "Phase 3" renumber drift**
  - [ ] 4.4 `adapters/cursor-bootstrap.md` — rewrite from method first principles
- [ ] 5.0 Templates port (FR-6)
  - [ ] 5.1 `review-template.md` (cleanest) — metadata block matches `validateReviewArtifact`
  - [ ] 5.2 `tasks-template.md` — Verification Ledger + Operator Handoff + an
        `independent-review` row shaped for `validateTasksReviewRow`
  - [ ] 5.3 `readiness-template.md` — 6-dim scorecard; parent checklist → swap block;
        Score/Verdict/tier rows parse via `buildState`
  - [ ] 5.4 `prd-template.md` — EN comments; §8 scope + §11 caps + §12 DO-NOTs →
        placeholder blocks; structure passes `lintPrd` when minimally filled
  - [ ] 5.5 `summary-template.md` + `doc-template.md` — EN; Ship Readiness section
        parseable
  - [ ] 5.6 `status-board-template.md` — parent board structure, EN headers matching
        `statusPanelMetrics` labels
- [ ] 6.0 METHOD.md (FR-7)
  - [ ] 6.1 Distill WORKFLOW.md generic core: gate rule, phase/gate table, classes,
        status lifecycle, conflict-surface→lock→conflict chain, deferral renewal-cap,
        autonomy boundary, calibration principle; cross-links to prompts/templates/CLI
- [ ] 7.0 Examples gallery (FR-8)
  - [ ] 7.1 `route-guard-coverage/check.mjs` + README + manifest snippet; pass/fail
        fixtures under test
  - [ ] 7.2 `doc-drift/check.mjs` + README + manifest snippet; pass/fail fixtures
  - [ ] 7.3 `examples/README.md` — pattern gallery intro (domain gates stay user-side)
- [ ] 8.0 Content verification suite (FR-9, W1, W2, W3)
  - [ ] 8.1 `content-hygiene.test.ts` — parent/personal-name greps; **W2 char policy**
        (Turkish class `[çğıöşüÇĞİÖŞÜ]` fails; `— – → ≥ ✓` legal); applies to prompts/,
        templates/, examples/, METHOD.md
  - [ ] 8.2 `content-prompts.test.ts` — file census (7+1+2+2), calibrated-number spot
        checks vs snapshot values, codex-starter says Phase 4 and never claims Phase 3,
        **W3 CLI-mention audit** (`gate <sub>` mentions ⊆ usage list)
  - [ ] 8.3 `content-templates.test.ts` — **W1 fill map** (documented substitutions,
        allowlist-safe commands) + engine round-trips: prd→`lintPrd` clean,
        review→`validateReviewArtifact` valid + contradiction flips invalid,
        tasks→`validateTasksReviewRow` shape, readiness/status-board→`buildState`/
        `statusPanelMetrics` labels
  - [ ] 8.4 `content-examples.test.ts` — both scripts exit 0/1 on pass/fail fixtures
- [ ] 9.0 Packaging + docs (FR-10)
  - [ ] 9.1 `package.json` files += METHOD.md; `npm pack --dry-run` listing verified
  - [ ] 9.2 `apps/docs/content/docs/method.mdx` — real phase/gate table from METHOD.md
  - [ ] 9.3 `packages/provegate/README.md` — method assets section
- [ ] 10.0 Phase 5 — Testing: every §11 command, evidence in ledger
  - [ ] 10.1 10 per-FR rows + cross-cutting (types/lint/test/build/check PRD-003/
        push-refusal/shell-level hygiene grep)
  - [ ] 10.2 §12 re-read + grep audit (calibrated numbers, no src/ diff)
- [ ] 11.0 Phase 6 — Final Auditing
  - [ ] 11.1 Codex review, **W4 brief**: diff calibrated numbers vs snapshot; hunt
        parent residue, dropped method steps, invented doctrine; artifact in
        `_docs/reviews/` (schema-gated)
  - [ ] 11.2 Fix/waive findings; critical = 0; verification round
- [ ] 12.0 Phase 7 — Learning + close
  - [ ] 12.1 Summary artifact; PRD lifecycle walk
  - [ ] 12.2 Owner acceptance entry; **close via `gate run PRD-003`**; push stays owner's

## Verification Ledger

| Gate               | Command / Check                                                           | Scope     | Result  | Evidence | Notes                            |
| ------------------ | ------------------------------------------------------------------------- | --------- | ------- | -------- | -------------------------------- |
| FR-1               | `pnpm --filter provegate test test/content-placeholders.test.ts`          | provegate | pending |          |                                  |
| FR-2               | `pnpm --filter provegate test test/content-prompts.test.ts`               | provegate | pending |          |                                  |
| FR-3               | `grep -c "never push" packages/provegate/prompts/orchestration-runner.md` | provegate | pending |          |                                  |
| FR-4               | `grep -c architecture packages/provegate/prompts/knowledge-ingest.md`     | provegate | pending |          |                                  |
| FR-5               | `grep -c "Phase 4" packages/provegate/prompts/adapters/codex-starter.md`  | provegate | pending |          | suite asserts no Phase-3 claim   |
| FR-6               | `pnpm --filter provegate test test/content-templates.test.ts`             | provegate | pending |          | W1 fill map + round-trips        |
| FR-7               | `grep -cE "^## " packages/provegate/METHOD.md`                            | provegate | pending |          |                                  |
| FR-8               | `pnpm --filter provegate test test/content-examples.test.ts`              | provegate | pending |          |                                  |
| FR-9               | `pnpm --filter provegate test test/content-hygiene.test.ts`               | provegate | pending |          | W2 char classes                  |
| FR-10              | `pnpm --filter provegate exec npm pack --dry-run`                         | provegate | pending |          | content files in listing         |
| types              | `pnpm check-types`                                                        | monorepo  | pending |          |                                  |
| lint               | `pnpm lint`                                                               | monorepo  | pending |          |                                  |
| test               | `pnpm --filter provegate test`                                            | provegate | pending |          | PRD-001/002 suites unchanged     |
| build              | `pnpm build`                                                              | monorepo  | pending |          |                                  |
| prd-lint           | `node packages/provegate/dist/cli.js check PRD-003`                       | repo      | pending |          | real gate, no waiver             |
| push-refusal       | `node packages/provegate/dist/cli.js push; test $? -eq 1`                 | provegate | pending |          |                                  |
| hygiene-sh         | shell-level emofy/rayvaz grep over shipped content (PRD §11)              | provegate | pending |          |                                  |
| src-frozen         | `git diff --stat main...HEAD -- packages/provegate/src`                   | provegate | pending |          | must be empty (§12)              |
| independent-review | codex adversarial review artifact                                         | repo      | pending |          | W4 brief; verdict pass, crit = 0 |
| dogfood            | close via `gate run PRD-003`                                              | repo      | pending |          | operator-triggered               |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

## Deferrals & Decisions

- 0.0 — Full plan in one pass; operator gates the complete document (repo convention).

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

## Blockers / Open Questions

- (none)

## Operator Handoff

| Task | Category  | Owner | Required Check                                                    | Status  | Notes                        |
| ---- | --------- | ----- | ----------------------------------------------------------------- | ------- | ---------------------------- |
| 11.1 | external  | owner | Authorize codex review session (W4 brief)                         | pending | agent executes per precedent |
| 12.2 | manual-qa | owner | Acceptance entry; trigger `gate run PRD-003`; push (always human) | pending | runner never pushes          |
