# Tasks: Config Core + State/Lock Extraction

> **PRD**: [prd-001-config-state-locks.md](../../_prds/wip/prd-001-config-state-locks.md)
> **Readiness**: [readiness-001-config-state-locks.md](../../_readiness/wip/readiness-001-config-state-locks.md)
> **Status**: Not Started
> **Readiness Score**: 8.7/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-22

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- A PRD may be `Code Complete` with operator handoff items, but it is not `Ship Verified`
  until required handoff items are resolved or explicitly accepted.

## Technical Standards Reference

- **Language:** TypeScript strict, ESM, node ≥22 builtins only — zero runtime dependencies
- **Types:** no `any`; `unknown` + narrowing; exported API fully typed (tsup dts)
- **Config:** every module takes `WorkflowConfig` (or slice) as a parameter — no module-level
  config singletons; only the CLI calls `loadConfig`
- **Subprocess:** `execFile`-style array args only (git); never a shell, never string interpolation
- **Paths:** repo-relative paths posix-normalized (`split(sep).join('/')`) before storage/matching (W4)
- **Source parity:** port semantics from `docs/research/provegate-bootstrap/source-snapshot/scripts/*`
  per MANIFEST rules — G as-is, P values → config; no Emofy values, personal names, or Turkish strings

## Relevant Files

- `packages/provegate/src/core/config/types.ts` — `WorkflowConfig` interface tree (new)
- `packages/provegate/src/core/config/defaults.ts` — `DEFAULT_CONFIG` (new)
- `packages/provegate/src/core/config/validate.ts` — hand-rolled validator (new)
- `packages/provegate/src/core/config/load.ts` — root discovery + deep-merge + load (new)
- `packages/provegate/src/core/config/index.ts` — public re-exports (new)
- `packages/provegate/src/core/state/markdown.ts` — markdown parsers (new)
- `packages/provegate/src/core/state/artifacts.ts` — artifact listing/naming (new)
- `packages/provegate/src/core/state/status.ts` — status normalization (new)
- `packages/provegate/src/core/state/build.ts` — record build (new)
- `packages/provegate/src/core/state/io.ts` — snapshot read/write, `mainRepoRoot` (new)
- `packages/provegate/src/core/state/query.ts` — active/ready/queue (new)
- `packages/provegate/src/core/state/index.ts` — re-exports (replaces stub)
- `packages/provegate/src/core/locks/glob.ts` — `globToRegExp` (new)
- `packages/provegate/src/core/locks/lease.ts` — lease CRUD + `validateLock` (new)
- `packages/provegate/src/core/locks/conflicts.ts` — conflict detection (new)
- `packages/provegate/src/core/locks/index.ts` — re-exports (replaces stub)
- `packages/provegate/src/core/config/index.ts`, `src/index.ts`, `src/core/index.ts` — export wiring
- `packages/provegate/src/cli.ts` — `status`/`queue` wiring (modified)
- `packages/provegate/schemas/{agent-lock,prd-state,acceptances}.schema.json` — generalized (new)
- `packages/provegate/schemas/README.md` — replaces placeholder (modified)
- `packages/provegate/README.md` — configuration section (modified)
- `packages/provegate/test/{config,config-load,markdown,status,state-build,state-query,glob,locks-lease,conflicts,schemas}.test.ts` — per-FR suites (new)
- `apps/docs/content/docs/cli.mdx` — status/queue reference (modified)
- `_state/schema/README.md` — pointer to package schemas (new)
- `_state/locks/prd-001-config-state-locks.json` — hand-authored lease (local only, gitignored)

## Tasks

- [ ] 1.0 Pre-flight (manual — no tooling exists yet)
  - [ ] 1.1 Create branch `feat/prd-001-config-state-locks` from `main`; all implementation
        commits land there; base stays merge-only for source (bootstrap-era direct commits end here)
  - [ ] 1.2 Hand-author lease `_state/locks/prd-001-config-state-locks.json` conforming to
        `source-snapshot/schemas/agent-lock.schema.json` (schemaVersion 2, phase `Phase 4`,
        `ownedPaths` = PRD Conflict Surface globs, 24h TTL) — the FR-7 validator must accept
        this exact file at Phase 5
  - [ ] 1.3 Baseline: `pnpm check-types && pnpm lint && pnpm test && pnpm build` green on branch
- [ ] 2.0 Config core (FR-1, FR-2)
  - [ ] 2.1 Write `src/core/config/types.ts`: `WorkflowConfig` + slices (`DirsConfig`,
        `IdPatternConfig`, `StatusVocabConfig`, `BranchesConfig`, `CommandsConfig`,
        `WorktreeConfig`) + `ConfigIssue`
  - [ ] 2.2 Write `src/core/config/defaults.ts`: `DEFAULT_CONFIG` mirroring source values
        de-Emofy'd (dirs `_prds|_readiness|_tasks|_docs` + prefixes, states `wip|completed|deferred`,
        state file `_state/prds.json`, locks `_state/locks`, id `PRD`/3, status vocab + aliases +
        active/implemented sets, branches: protected `["main","master","staging"]` + base `main` +
        feature template + allowed prefixes/files, owners `["owner","operator"]`, worktree `.worktrees`,
        execution phases, sharedAppendOnly)
  - [ ] 2.3 Write `src/core/config/validate.ts`: `validateConfig(value): ConfigIssue[]` —
        type checks per field, unknown-key detection, path-tagged messages
  - [ ] 2.4 Write `src/core/config/load.ts`: `findRepoRoot(cwd)` (walk up to
        `workflow.config.json` or `.git`, clear error otherwise), `deepMerge` (objects recurse,
        arrays/scalars replace), `loadConfig(cwd)` (aggregate-throw on issues)
  - [ ] 2.5 Tests `test/config.test.ts`: defaults cover every chokepoint parameter (assert
        field presence + key values); no personal names / Turkish strings in defaults
  - [ ] 2.6 Tests `test/config-load.test.ts`: merge semantics (array replace), unknown key
        → issue, invalid type → path-tagged issue, aggregate error lists all, root discovery
        (config file, `.git`, neither → throws), fixture dirs via `mkdtemp`
- [ ] 3.0 State parsers + status (FR-3, FR-4)
  - [ ] 3.1 Write `src/core/state/markdown.ts`: `stripMarkdown`, `getMetaValue`,
        `getTableValue`, `sectionAfter`, `findMarkdownTable` (padding-tolerant),
        `writeTableValue` (value-cell-only replace), `countTaskChecks`, `countOperatorHandoff`,
        `declaredGlobs` — pure functions, ported byte-semantics
  - [ ] 3.2 Write `src/core/state/artifacts.ts`: `listMarkdownFiles` (skip
        node_modules/.git/.next), `parseArtifactName(config)` (idPattern-driven regex),
        `collectArtifactFiles(config, root)`, `artifactState`, posix normalization helper (W4)
  - [ ] 3.3 Write `src/core/state/status.ts`: `normalizeStatus(config)` (alias map +
        annotated-head split on `—|–|;|(|\s-\s`), `normalizeAutonomousClose` (pipe → null,
        operator-gated wins over eligible)
  - [ ] 3.4 Tests `test/markdown.test.ts`: each parser incl. prettier-padded table fixture,
        annotated status line, Conflict Surface with `none`/template-token/glob lines
  - [ ] 3.5 Tests `test/status.test.ts`: alias table, placeholder pipe, hedged double-token
        (safer wins), unknown → fallback
- [ ] 4.0 State build + queries + CLI (FR-5, FR-6, W1)
  - [ ] 4.1 Write `src/core/state/io.ts`: `mainRepoRoot(root)` (git `--git-common-dir` via
        `execFileSync` array args, fallback root), `readState`, `writeState` (2-space JSON + `\n`);
        state path stays **checkout-local**
  - [ ] 4.2 Write `src/core/state/build.ts`: `emptyRecord`, `buildState(config, root)` —
        artifact collect → per-record status/cyclePhase/autonomousClose/readiness
        (score/verdict/tiers)/task counts/summary shipReadiness/lastUpdated, sorted, schemaVersion 1
  - [ ] 4.3 Write `src/core/state/query.ts`: `isImplemented`, `latestImplemented`,
        `latestByStatus`, `statusPanelMetrics` (English labels), `getActiveRecords` (per-record
        done-check — NO high-water-mark), `getReadyRecords`, `isResumable`, `readyOverlaps`,
        `buildQueue` — **W1: every status literal read from `config.statusVocab` sets, none inline**
  - [ ] 4.4 Wire `src/cli.ts`: `status` (build → write snapshot → per-record line + panel
        metrics, exit 0) and `queue [--json]` (build → queue render/JSON, exit 0); remove the two
        stubs; keep `push` refusal + remaining stubs byte-identical
  - [ ] 4.5 Tests `test/state-build.test.ts`: fixture artifact tree (mkdtemp) → records
        (multi-artifact merge, wip/completed/deferred states, lastUpdated max); custom idPattern
        (`TASK`/4) acceptance criterion
  - [ ] 4.6 Tests `test/state-query.test.ts`: port source queue semantics — active excludes
        implemented/deferred, ready needs Approved-or-PASS + unlocked, score-then-number sort,
        resume flag, blocked set, readyOverlaps warning; assert vocab-driven (custom-vocab config
        still works — W1 regression)
  - [ ] 4.7 Tests `test/cli-state.test.ts`: spawn built CLI in fixture repo — `status` exit 0 + writes `_state/prds.json`; `queue --json` parses with
        `ready/readyOverlaps/inFlight/blocked/inReview` keys; `push` still exits 1
- [ ] 5.0 Locks: glob + lease + conflicts (FR-7, FR-8, FR-9)
  - [ ] 5.1 Write `src/core/locks/glob.ts`: `globToRegExp` — `**` crosses `/` (collapses
        following slash), `*` single segment, `?` one non-slash, escape `.+()[]{}$^|\`, anchored
  - [ ] 5.2 Write `src/core/locks/lease.ts`: `locksDir(config, root)` (main checkout),
        `lockPathFor`, `ensureLocksDir`, `migrateWorktreeLocks`, `listLockFiles` (parse-error
        tolerant), `validateOwnedPaths`, `validateLock(config)` (required fields, schemaVersion 1|2,
        touchedFiles non-empty, worktree-prefix from config, expiresAt valid + unexpired w/ stale
        age message), `findLeaseConflicts` (pairwise touchedFiles overlap, unexpired only)
  - [ ] 5.3 Write `src/core/locks/conflicts.ts`: `trackedFiles` (git ls-files, empty on
        failure), `materialize` (globs × files − `config.sharedAppendOnly`), `normalizeGlob`,
        `structuralOverlap`, `findConflicts` (execution-phase + surfaced only; same-id skip; NO
        grandfather set), `candidateFromPrd(config)` (idPattern validation, config dirs `wip` +
        drafts-equivalent search, single-match enforcement, `declaredGlobs` reuse, stamped
        execution phase), `candidateConflicts` (own-lock exclusion)
  - [ ] 5.4 Tests `test/glob.test.ts`: segment vs cross-segment `*`/`**`, `a/**` + `a/**/b`
        slash collapse, `?`, metacharacter escaping, anchoring (no substring match)
  - [ ] 5.5 Tests `test/locks-lease.test.ts`: `validateLock` per-field issue list (each
        defect distinct), stale-lock age message, worktree prefix from custom config, parse-error
        tolerance, migrate moves-then-copies, **task 1.2's real lease file validates clean**
  - [ ] 5.6 Tests `test/conflicts.test.ts`: port the 4 `--self-test` fixtures, sharedAppendOnly
        subtraction (broad `**` no false conflict), structural overlap on zero-materialization
        (identical + prefix-nested + sibling false-negative documented), same-PRD skip,
        non-execution-phase exempt, candidate own-lock exclusion
- [ ] 6.0 Schemas, exports & docs (FR-10, FR-11, W2, W3)
  - [ ] 6.1 Port 3 schemas to `packages/provegate/schemas/`: `$id` →
        `https://provegate.dev/schemas/<name>`, titles/descriptions English + neutral, id pattern
        documented as config-default with runtime-derivation note
  - [ ] 6.2 Rewrite `packages/provegate/schemas/README.md`: schema inventory + **W3 id-width
        overflow note** (width exhaustion → artifact invisible; config `idPattern.width` bump path)
  - [ ] 6.3 Write `_state/schema/README.md`: pointer to package schemas as source of truth
  - [ ] 6.4 Export wiring: `src/core/{config,state,locks}/index.ts` re-export public API;
        `src/core/index.ts` + `src/index.ts` surface it; `run`/`gates` stubs untouched
  - [ ] 6.5 Tests `test/schemas.test.ts`: all parse as JSON, `$id` neutral, no `emofy`
        substring anywhere in `schemas/`, agent-lock required fields match `validateLock`
  - [ ] 6.6 `packages/provegate/README.md`: configuration section — `workflow.config.json`
        surface table, defaults, **W2 last-write-wins snapshot note**, status/queue usage
  - [ ] 6.7 `apps/docs/content/docs/cli.mdx`: move `status`/`queue` from stub table to real
        reference with example output; keep remaining rows stubbed
- [ ] 7.0 Migration & Rollback Plan (infra-class mandatory parent)
  - [ ] 7.1 Verify schemaVersion compat: state emits 1, lock validator accepts 1|2 —
        assert in tests (4.5 / 5.5 cover; confirm here in ledger notes)
  - [ ] 7.2 Confirm CLI compat: only `status|queue` change behavior; `--help`, `--version`,
        stubs, `push` byte-identical (covered by `test/cli.test.ts` untouched + 4.7)
  - [ ] 7.3 Record rollback: single `git revert -m 1` of the PRD merge commit restores stubs;
        no data migration (snapshot regenerable, leases ephemeral) — one line in Deferrals
- [ ] 8.0 Phase 5 — Testing — run **every** command from PRD §11; paste evidence in ledger
  - [ ] 8.1 Run all 11 per-FR commands (each its own ledger row)
  - [ ] 8.2 Run `pnpm check-types` — zero errors
  - [ ] 8.3 Run `pnpm lint` — zero warnings
  - [ ] 8.4 Run `pnpm --filter provegate test` — full suite incl. pre-existing push-refusal
  - [ ] 8.5 Run `pnpm build` — clean
  - [ ] 8.6 Run zero-dep check, push-refusal exit check, emofy/name grep gate (§11 cross-cutting)
  - [ ] 8.7 Live dogfood: `node packages/provegate/dist/cli.js status` + `queue --json` at repo
        root — PRD-001 present with current status
  - [ ] 8.8 Re-read PRD §12 DO NOT — grep audit: `any` types, shell spawns, network imports
        (`node:http`, fetch), hardcoded Emofy values in `src/`
- [ ] 9.0 Phase 6 — Final Auditing (operator-arranged)
  - [ ] 9.1 Independent adversarial review by different model/session against PRD §4/§11/§12 +
        readiness W1–W4; review artifact saved per source review-template with verdict/base-SHA/
        critical-count metadata
  - [ ] 9.2 Resolve review findings (critical count must be 0) or record accepted deviations
        in Deferrals & Decisions
- [ ] 10.0 Phase 7 — Learning + close
  - [ ] 10.1 Durable-artifacts check (manual): merge diff touches `apps/docs/content/docs/cli.mdx` + `packages/provegate/README.md` (PRD Durable Artifacts list)
  - [ ] 10.2 Write `_docs/wip/summary-001-config-state-locks.md` (source summary-template shape:
        outcome, evidence pointers, ship readiness)
  - [ ] 10.3 Update PRD header status through lifecycle (`In Progress` → `Code Complete`);
        changelog rows for implementation decisions
  - [ ] 10.4 Local `git merge --no-ff feat/prd-001-config-state-locks` into `main` after owner
        accept; delete lease file; **never push — owner's keystroke**

## Verification Ledger

| Gate               | Command / Check                                                           | Scope     | Result  | Evidence | Notes                            |
| ------------------ | ------------------------------------------------------------------------- | --------- | ------- | -------- | -------------------------------- |
| FR-1               | `pnpm --filter provegate test test/config.test.ts`                        | provegate | pending |          |                                  |
| FR-2               | `pnpm --filter provegate test test/config-load.test.ts`                   | provegate | pending |          |                                  |
| FR-3               | `pnpm --filter provegate test test/markdown.test.ts`                      | provegate | pending |          |                                  |
| FR-4               | `pnpm --filter provegate test test/status.test.ts`                        | provegate | pending |          |                                  |
| FR-5               | `pnpm --filter provegate test test/state-build.test.ts` + live `status`   | provegate | pending |          | live run listed in row `dogfood` |
| FR-6               | `pnpm --filter provegate test test/state-query.test.ts` + live `queue`    | provegate | pending |          |                                  |
| FR-7               | `pnpm --filter provegate test test/locks-lease.test.ts`                   | provegate | pending |          |                                  |
| FR-8               | `pnpm --filter provegate test test/glob.test.ts`                          | provegate | pending |          |                                  |
| FR-9               | `pnpm --filter provegate test test/conflicts.test.ts`                     | provegate | pending |          |                                  |
| FR-10              | `pnpm --filter provegate test test/schemas.test.ts`                       | provegate | pending |          |                                  |
| FR-11              | `pnpm build` + dist import probe (PRD §11 FR-11 command)                  | provegate | pending |          |                                  |
| types              | `pnpm check-types`                                                        | monorepo  | pending |          |                                  |
| lint               | `pnpm lint`                                                               | monorepo  | pending |          |                                  |
| test               | `pnpm --filter provegate test`                                            | provegate | pending |          | incl. push-refusal regression    |
| build              | `pnpm build`                                                              | monorepo  | pending |          |                                  |
| zero-dep           | `node -e "...dependencies check"` (PRD §11)                               | provegate | pending |          |                                  |
| push-refusal       | `node packages/provegate/dist/cli.js push; test $? -eq 1`                 | provegate | pending |          |                                  |
| name-grep          | `grep -ri --include='*.ts' -l -e emofy -e rayvaz packages/provegate/src`  | provegate | pending |          | must match nothing               |
| dogfood            | `node packages/provegate/dist/cli.js status` + `queue --json` (repo root) | repo      | pending |          | PRD-001 visible                  |
| independent-review | cross-model adversarial review artifact                                   | repo      | pending |          | verdict pass, critical = 0       |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

## Deferrals & Decisions

- 0.0 — Phase A parents-only approval stop skipped; full plan generated in one pass because the
  operator gates the complete task file (this document) before Phase 4 — per protocol's
  autonomous-execution exception clause.

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

## Blockers / Open Questions

- (none)

## Operator Handoff

| Task | Category  | Owner | Required Check                                                       | Status  | Notes                                |
| ---- | --------- | ----- | -------------------------------------------------------------------- | ------- | ------------------------------------ |
| 9.1  | external  | owner | Arrange independent cross-model review session; provide verdict file | pending | different model family than executor |
| 10.4 | manual-qa | owner | Accept close; perform local merge sign-off; push (always human)      | pending | runner never pushes                  |
