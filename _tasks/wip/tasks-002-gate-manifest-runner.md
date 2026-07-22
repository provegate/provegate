# Tasks: Gate Manifest + Autorun Runner

> **PRD**: [prd-002-gate-manifest-runner.md](../../_prds/wip/prd-002-gate-manifest-runner.md)
> **Readiness**: [readiness-002-gate-manifest-runner.md](../../_readiness/wip/readiness-002-gate-manifest-runner.md)
> **Status**: Not Started
> **Readiness Score**: 8.65/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-22

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**; operator work in
  **Operator Handoff**.

## Technical Standards Reference

- TypeScript strict, ESM, node ≥22 builtins only — zero runtime dependencies
- No `any`; modules take config/manifest as parameters — no singletons
- Internal git: `execFile` array args ONLY. User-gate commands: shell, but only after
  `isSafeCommand` passes (see PRD §7 threat model)
- **Never any push code path** — §11 grep gate over `core/run` + `core/gates`
- Reuse PRD-001 core: glob engine, markdown parsers, state records, config loader
- Source parity from `docs/research/provegate-bootstrap/source-snapshot/scripts/`:
  {prd-autorun, prd-class-gates, prd-command-safety, review-artifact-utils,
  verify-gates-wired, prd-archive, prd-metrics}.mjs — G as-is, P values → config/manifest

## Relevant Files

- `packages/provegate/src/core/gates/manifest.ts` — manifest types/defaults/load/validate (new)
- `packages/provegate/src/core/gates/safety.ts` — isSafeCommand + §11 parse (new)
- `packages/provegate/src/core/gates/classes.ts` — class parse + diff conditioning (new)
- `packages/provegate/src/core/gates/review.ts` — review-artifact gate (new)
- `packages/provegate/src/core/gates/prd-ready.ts` — readiness lint (new)
- `packages/provegate/src/core/gates/wiring.ts` — wire-or-delete audit (new)
- `packages/provegate/src/core/gates/index.ts` — exports (replaces stub)
- `packages/provegate/src/core/run/acceptance.ts` — operator guard (new)
- `packages/provegate/src/core/run/durable.ts` — durable-artifacts gate (new)
- `packages/provegate/src/core/run/metrics.ts` — local JSONL metrics (new)
- `packages/provegate/src/core/run/chain.ts` — gate chain build/plan/run (new)
- `packages/provegate/src/core/run/cards.ts` — STOP/handoff cards (new)
- `packages/provegate/src/core/run/archive.ts` — wip→completed archive (new)
- `packages/provegate/src/core/run/merge.ts` — local no-ff merge + auto-revert (new)
- `packages/provegate/src/core/run/index.ts` — exports (replaces stub)
- `packages/provegate/src/core/config/{types,defaults,validate}.ts` — field additions
- `packages/provegate/src/cli.ts` — run/land/check wiring
- `packages/provegate/schemas/review-metadata.schema.json` — fourth schema (new)
- `packages/provegate/test/{manifest,safety,classes,review-gate,acceptance,durable,metrics,chain,merge,prd-ready,wiring}.test.ts` — per-FR suites (new)
- `apps/docs/content/docs/cli.mdx`, `packages/provegate/README.md` — durable artifacts
- `.gitignore` — metrics file entry
- `_state/locks/prd-002-gate-manifest-runner.json` — hand-authored lease (local, gitignored)

## Tasks

- [ ] 1.0 Pre-flight
  - [ ] 1.1 Branch `feat/prd-002-gate-manifest-runner` from `main`
  - [ ] 1.2 Hand-author lease (schemaVersion 2, Phase 4, `ownedPaths` = Conflict Surface
        incl. `gates.manifest.json`, 24h TTL) — FR-7 (PRD-001) validator must accept it
  - [ ] 1.3 Baseline gates green on branch
- [ ] 2.0 Config additions + manifest core (FR-1)
  - [ ] 2.1 Config fields: `classes`, `dirs.reviewsDir`, `dirs.metricsFile`,
        `commands.allowedPrefixes` — types, defaults, validate spec + semantic checks
        (classes non-empty; prefixes non-empty strings)
  - [ ] 2.2 `src/core/gates/manifest.ts`: `GatesManifest` types (`phases`,
        `classDefaults`, `hardCaps`, `postMerge`, `wiringExceptions`), `DEFAULT_MANIFEST`
        derived from config commands (floor phase 4 = [checkTypes, lint, build, test],
        postMerge = [checkTypes, build]), `loadManifest(config, root)` — absent file =
        defaults; deep-merge; shape + semantic validation (unknown keys, classes ∈
        config.classes, commands non-empty); aggregate `ManifestError`
  - [ ] 2.3 Tests `test/manifest.test.ts`: defaults, merge, unknown key, bad class,
        empty command, absent file
- [ ] 3.0 Safety + classes (FR-2, FR-3)
  - [ ] 3.1 `src/core/gates/safety.ts`: `isSafeCommand(config, cmd)` — reject
        `` ` ``/`$`/`>`/`<`/`$(` and `\bgit\s+push\b`; split `&&`/`||`/`;`/`|`; every
        segment starts with an allowed prefix. `parseVerificationCommands(content)` —
        §11 section FR-rows, backticked, deduped, safety-flagged
  - [ ] 3.2 `src/core/gates/classes.ts`: `parsePrdClass(config, content)` (validated,
        default first class), `collectDiffFiles(root, base)` (merge-base origin/base →
        base → HEAD fallback, execFile array args), `resolveClassGates(manifest, cls,
    changedFiles)` (glob-engine `when.diffMatches`, unconditional rules always),
        `mergeGateCommands`
  - [ ] 3.3 Tests `test/safety.test.ts`: metachar set, `git push` embedded, segment
        prefixes, custom prefix config, §11 parse fixtures (incl. non-FR rows ignored)
  - [ ] 3.4 Tests `test/classes.test.ts`: header parse + unknown class default, diff
        fallback chain (fixture git repo), conditional vs unconditional rules, dedupe
- [ ] 4.0 Gate functions (FR-4, FR-5, FR-6, FR-7)
  - [ ] 4.1 `src/core/gates/review.ts`: `validateReviewArtifact` (metadata block,
        pass⇒Critical=0), `extractReviewArtifactPath` (pattern from config
        `dirs.reviewsDir` + idPattern), `validateTasksReviewRow` — schema always
        required (no grandfather window)
  - [ ] 4.2 `schemas/review-metadata.schema.json` + README row (fourth schema)
  - [ ] 4.3 `src/core/run/acceptance.ts`: `loadAcceptances(config, root)`,
        `validAcceptance(config, entry)` (owner ∈ config.owners lower-cased, items
        non-empty, reason ≥5 chars), `operatorGateOk(config, root, record)`
  - [ ] 4.4 `src/core/run/durable.ts`: `declaredArtifacts(content)` (backticked paths,
        `none` discipline — shared markdown module), `durableArtifactsOk(declared,
    diffFiles)` — every declared path in merge-range diff
  - [ ] 4.5 `src/core/run/metrics.ts`: `appendMetric(config, root, entry)` — mkdir,
        JSONL append, ts stamp, best-effort (failure → stderr note, never throws);
        `.gitignore` entry for `_state/prd-metrics.jsonl`
  - [ ] 4.6 Tests `test/review-gate.test.ts`, `test/acceptance.test.ts`,
        `test/durable.test.ts`, `test/metrics.test.ts` — incl. pass-with-critical,
        non-owner acceptance, missing declared path, unwritable metrics dir
- [ ] 5.0 Runner chain + lint + wiring (FR-8, FR-10, FR-11, W1, W4)
  - [ ] 5.1 `src/core/run/cards.ts`: `stopCard`/`handoffCard` renderers (English,
        resume hint, "push is yours" footer) — pure string builders
  - [ ] 5.2 `src/core/run/chain.ts`: `buildGateChain(...)` (phase 4 floor+class; phase 5
        §11; phase 6 review fn; phase 7 durable fn; merge-gate operator fn),
        `planChain` (dry-run render incl. unsafe flags), `runChain` (execute, results,
        metrics, `--from-phase` skip, first-failure STOP), **recursion guard**:
        `PROVEGATE_RUN_ACTIVE` sentinel set for child commands; non-dry-run entry under
        sentinel refuses (W1); dry-run exempt
  - [ ] 5.3 `src/core/gates/prd-ready.ts`: structural lint (Targets per FR, §11 FR-row
        per FR with ≥1 runnable command, DO NOT present, Open Questions empty/deferred,
        bare `TBD`/`???`/`to be decided` outside backticks (W4), unsafe §11 report) +
        `hardCaps` evaluation (`when.targetsMatch` globs ∩ FR target paths ⇒
        `requireLine` regex must match)
  - [ ] 5.4 `src/core/gates/wiring.ts`: manifest self-audit (every command reachable
        from phases/classDefaults/postMerge), package.json scripts matching config
        `verifyScriptPattern` (add config field, default `^verify:`) wired in
        manifest/CI run-lines/exceptions; stale exceptions fail (shrink-only)
  - [ ] 5.5 Tests `test/chain.test.ts` (assembly order, from-phase skip, empty-§11
        STOP, unsafe STOP, recursion guard W1 — nested refused, dry-run exempt)
  - [ ] 5.6 Tests `test/prd-ready.test.ts` (each structural check, hard-cap fire/miss,
        backtick exemption W4) and `test/wiring.test.ts` (unwired command, unwired
        script, stale exception, CI run-line detection)
- [ ] 6.0 Archive + merge (FR-9, W2, W3)
  - [ ] 6.1 `src/core/run/archive.ts`: move item's four artifacts wip→completed
        (git mv semantics via execFile), commit `chore(workflow): archive PRD-XXX artifacts`
        — **W3: message shape asserted conventional (lower-case subject) in test**
  - [ ] 6.2 `src/core/run/merge.ts`: preconditions (refuse on-base invocation; refuse
        dirty non-coordination feature checkout — W2), base discovery (worktree with
        base checked out → source parity; else single-checkout fallback: checkout base,
        merge, on any failure reset + checkout back), `ensureBaseCheckoutClean`
        (coordination-only reset), `git merge --no-ff` array-args, postMerge gates,
        failure ⇒ `git reset --hard HEAD~1` + STOP card, success ⇒ handoff card.
        No push strings anywhere
  - [ ] 6.3 Tests `test/merge.test.ts`: fixture git repos (mkdtemp + git init) —
        happy-path merge, post-merge failure auto-revert (base restored, feature
        intact), dirty-checkout refusal (W2), on-base refusal (W2), coordination-dirt
        reset, single-checkout fallback path
- [ ] 7.0 CLI + exports + docs (FR-12)
  - [ ] 7.1 `src/cli.ts`: `run` (`--dry-run`, `--from-phase=`), `land`
        (run --from-phase=merge), `check <id>` / `check --wiring`; stubs `init|new|open`
        unchanged; `push` refusal byte-identical; usage text updated
  - [ ] 7.2 Export wiring: gates/run index modules + `src/index.ts`
  - [ ] 7.3 `apps/docs/content/docs/cli.mdx`: run/land/check → implemented section
  - [ ] 7.4 `packages/provegate/README.md`: manifest surface table + runner section
        (incl. recursion sentinel, threat model line, metrics privacy note)
- [ ] 8.0 Migration & Rollback Plan (infra-class mandatory)
  - [ ] 8.1 Confirm CLI compat: only run/land/check change; status/queue/push regression
        suites untouched and green
  - [ ] 8.2 Rollback line in Deferrals: revert PRD merge; metrics gitignored;
        manifest optional — no consumer breakage
- [ ] 9.0 Phase 5 — Testing: every §11 command, evidence in ledger
  - [ ] 9.1 12 per-FR commands (one ledger row each)
  - [ ] 9.2 Cross-cutting: check-types, lint, full test suite, build, zero-dep,
        push-refusal, runner push-grep, emofy/name grep
  - [ ] 9.3 Live: `gate run --dry-run PRD-002` (plan, exit 0), `gate check PRD-002`
        (exit 0 — waiver retired), `gate check --wiring` (exit 0)
  - [ ] 9.4 §12 DO NOT re-read + grep audit
- [ ] 10.0 Phase 6 — Final Auditing
  - [ ] 10.1 Codex adversarial review (primed: merge state machine, safety allowlist,
        recursion guard, auto-revert paths) — artifact in `_docs/reviews/` with schema
        (now machine-validated by FR-4 code)
  - [ ] 10.2 Fix or waive findings; critical must be 0; re-verify round
- [ ] 11.0 Phase 7 — Learning + dogfood close
  - [ ] 11.1 Durable artifacts in diff (cli.mdx, README)
  - [ ] 11.2 Summary `_docs/wip/summary-002-gate-manifest-runner.md`
  - [ ] 11.3 PRD lifecycle walk (In Progress → Code Complete → Operator Verification)
  - [ ] 11.4 Owner records acceptance entry in `_state/acceptances.json` (validated by
        FR-5 code — the guard gates its own PRD)
  - [ ] 11.5 **Dogfood finale**: `node packages/provegate/dist/cli.js run PRD-002` —
        chain + archive + no-ff merge to main + post-merge gates + handoff card;
        push stays owner's

## Verification Ledger

| Gate               | Command / Check                                                            | Scope     | Result  | Evidence | Notes                        |
| ------------------ | -------------------------------------------------------------------------- | --------- | ------- | -------- | ---------------------------- |
| FR-1               | `pnpm --filter provegate test test/manifest.test.ts`                       | provegate | pending |          |                              |
| FR-2               | `pnpm --filter provegate test test/safety.test.ts`                         | provegate | pending |          |                              |
| FR-3               | `pnpm --filter provegate test test/classes.test.ts`                        | provegate | pending |          |                              |
| FR-4               | `pnpm --filter provegate test test/review-gate.test.ts`                    | provegate | pending |          |                              |
| FR-5               | `pnpm --filter provegate test test/acceptance.test.ts`                     | provegate | pending |          |                              |
| FR-6               | `pnpm --filter provegate test test/durable.test.ts`                        | provegate | pending |          |                              |
| FR-7               | `pnpm --filter provegate test test/metrics.test.ts`                        | provegate | pending |          |                              |
| FR-8               | `pnpm --filter provegate test test/chain.test.ts` + live dry-run           | provegate | pending |          | incl. W1 recursion guard     |
| FR-9               | `pnpm --filter provegate test test/merge.test.ts`                          | provegate | pending |          | incl. W2 preconditions       |
| FR-10              | `pnpm --filter provegate test test/prd-ready.test.ts` + live check         | provegate | pending |          | incl. W4 backtick exemption  |
| FR-11              | `pnpm --filter provegate test test/wiring.test.ts` + live `check --wiring` | provegate | pending |          |                              |
| FR-12              | `pnpm build` + `--help` surface                                            | provegate | pending |          |                              |
| types              | `pnpm check-types`                                                         | monorepo  | pending |          |                              |
| lint               | `pnpm lint`                                                                | monorepo  | pending |          |                              |
| test               | `pnpm --filter provegate test`                                             | provegate | pending |          | all PRD-001 suites unchanged |
| build              | `pnpm build`                                                               | monorepo  | pending |          |                              |
| zero-dep           | dependencies-field check (PRD §11)                                         | provegate | pending |          |                              |
| push-refusal       | `node packages/provegate/dist/cli.js push; test $? -eq 1`                  | provegate | pending |          |                              |
| push-grep          | no push invocation in `core/run` + `core/gates` (PRD §11)                  | provegate | pending |          | W3 archive msg also checked  |
| name-grep          | no emofy/rayvaz in `src/`                                                  | provegate | pending |          |                              |
| dogfood            | `gate check PRD-002` + `gate run --dry-run PRD-002` + close via `gate run` | repo      | pending |          | close is operator-triggered  |
| independent-review | codex adversarial review artifact                                          | repo      | pending |          | verdict pass, critical = 0   |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

## Deferrals & Decisions

- 0.0 — Phase A parents-only stop skipped; operator gates the complete plan (established
  repo convention, autonomous-execution exception clause).

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

## Blockers / Open Questions

- (none)

## Operator Handoff

| Task | Category  | Owner | Required Check                                                          | Status  | Notes                                |
| ---- | --------- | ----- | ----------------------------------------------------------------------- | ------- | ------------------------------------ |
| 10.1 | external  | owner | Authorize codex review session (established cross-model reviewer)       | pending | agent executes per PRD-001 precedent |
| 11.4 | manual-qa | owner | Record acceptance entry in `_state/acceptances.json` (or dictate terms) | pending | FR-5 guard validates it mechanically |
| 11.5 | manual-qa | owner | Trigger dogfood close; push after handoff card (always human)           | pending | runner never pushes                  |
