# PRD-002: Gate Manifest + Autorun Runner

> **Status**: Draft
> **Created**: 2026-07-22
> **Updated**: 2026-07-22
> **Author**: rayvaz
> **Audience**: Implementing Agent (Claude Code / Cursor / Codex)
> **Slug**: `gate-manifest-runner`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: Builds the runner/tooling core (no user-facing product surface); the risk profile is deployment ordering of the gate chain and merge machinery, not data or UI.
> **Autonomous Close**: operator-gated
> **State Record**: `_state/prds.json`

---

## 1. Introduction / Overview

Roadmap Phase C — the heart of the product. Port the deterministic orchestration runner
(`prd-autorun.mjs`, 378 LOC) and its seams into `packages/provegate/src/core/{gates,run}`:
a user-editable **gates manifest** (per-phase command chains, diff-conditional class
defaults, hard-cap rules), the **§11 command-safety allowlist**, the **review-artifact
schema gate**, the **operator-acceptance guard**, the **durable-artifacts gate**, local
JSONL **metrics**, and the **no-ff local merge with post-merge verification + auto-revert**.
Wires three CLI commands: `gate run` (phases 4–7 + merge), `gate land` (merge step only),
and `gate check` (PRD readiness lint — retires the PRD-001 lint waiver).

Dogfood finale: **`gate run PRD-002` closes this very PRD** — the runner's first
production run is its own landing.

Extraction rules bind (MANIFEST): G port as-is, P values → config/manifest, no personal
names, English-only. **The runner has no code path that pushes to a git remote** — the
architectural invariant this whole project is named after.

---

## 2. Goals

### Primary Goals

- [ ] `gates.manifest.json`: user-owned, validated manifest — phase chains, class
      defaults (diff-conditional), hard caps, post-merge gates.
- [ ] `core/run`: the autorun engine — gate chain, resume, dry-run, handoff cards,
      archive, local no-ff merge, auto-revert. Zero push paths.
- [ ] `gate check`: machine PRD-readiness lint driven by manifest hard caps — no more
      structural-lint waivers.
- [ ] Dogfood: PRD-002 lands via `gate run PRD-002`.

### Success Metrics

| Metric                    | Current               | Target                     | Measurement                |
| ------------------------- | --------------------- | -------------------------- | -------------------------- |
| PRD close mechanics       | manual choreography   | one command (`gate run`)   | PRD-002's own close        |
| Readiness lint            | waived (tool missing) | `gate check` exit 0/1      | run against PRD-002 itself |
| Push code paths in runner | 0                     | 0 (§11 grep + safety test) | `grep` gate + vitest       |
| Runtime dependencies      | 0                     | 0                          | §11 zero-dep check         |

---

## 3. User Stories

### Primary User: workflow operator

#### User Story 1

```
As a workflow operator,
I want phases 4-7 and the local merge to run as one deterministic command,
so that closing a verified work item costs one invocation instead of an hour of choreography,
while the push stays my keystroke.
```

**Acceptance Criteria:**

- [ ] `gate run PRD-XXX` executes the manifest gate chain in order and stops loud at the
      first failure with a STOP card naming the phase, the reason, and the resume flag.
- [ ] `gate run --dry-run PRD-XXX` prints the full plan (including which §11 commands
      would be refused as unsafe) and executes nothing.
- [ ] `gate run --from-phase=5 PRD-XXX` resumes mid-chain; `gate land PRD-XXX` runs the
      merge step only.
- [ ] On post-merge gate failure the merge commit is automatically reverted and the
      feature branch left intact.
- [ ] No invocation, flag, or failure path ever pushes to a remote.

#### User Story 2

```
As a workflow operator,
I want gate membership declared in a manifest I own,
so that adding a project-specific gate is config, not a fork of the runner.
```

**Acceptance Criteria:**

- [ ] `gates.manifest.json` at repo root overrides built-in defaults; absent file = floor
      gates from `workflow.config` commands.
- [ ] Class defaults support diff-conditional rules (`when.diffMatches` globs — reuses
      the PRD-001 glob engine).
- [ ] An invalid manifest fails loud with path-tagged errors before anything runs.
- [ ] The manifest self-audits: a declared gate wired to no chain fails `gate check-wiring`
      (wire-or-delete), modulo a shrink-only exceptions list.

#### User Story 3

```
As a spec author,
I want the readiness lint to be a machine gate,
so that a PRD with unrunnable §11 rows or missing hard-cap evidence cannot reach scoring as "ready".
```

**Acceptance Criteria:**

- [ ] `gate check PRD-XXX` fails when: any FR lacks a Targets line; any FR lacks a §11
      row with a runnable command; §12 DO NOT is missing; Open Questions is non-empty;
      `TBD`/`???` appears in FR/spec sections.
- [ ] Manifest `hardCaps` fire when a rule's `when.targetsMatch` globs intersect the
      PRD's FR targets and the required greppable line is absent.
- [ ] Unsafe §11 commands (shell metachars, non-allowlisted prefixes, `git push`) are
      reported at lint time, not discovered at run time.

---

## 4. Functional Requirements

All new code TypeScript strict, ESM, node ≥22 builtins only; every module takes
`WorkflowConfig`/manifest as parameters (no singletons); repo paths posix-normalized.

1. **FR-1 — Manifest types + defaults + load/validate**: `GatesManifest` — `phases`
   (map phase key → command list; defaults: phase 4 = config.commands floor
   [checkTypes, lint, build, test], 6/7 empty), `classDefaults` (per class: list of
   `{ when?: { diffMatches: string[] }, run: string[] }`), `hardCaps` (list of
   `{ id, when: { targetsMatch: string[] }, requireLine: string, message }`),
   `postMerge` (default [checkTypes, build]), `wiringExceptions`
   (`{ gate: reason }`, shrink-only). Loader: `gates.manifest.json` at repo root,
   deep-merge over defaults, hand-rolled shape + semantic validation (unknown keys,
   classes must be members of config `classes`, non-empty command strings),
   aggregate-throw. New config field: `classes` (default
   `["feature", "test-hardening", "hotfix", "infra"]`) and `dirs.reviewsDir`
   (default `_docs/reviews`), `dirs.metricsFile` (default `_state/prd-metrics.jsonl`),
   `commands.allowedPrefixes` (default `["pnpm ", "npm ", "npx ", "yarn ", "bun ", "node ", "tsx ", "vitest ", "playwright ", "psql ", "curl ", "test ", "grep "]`).
   - **Targets:** `packages/provegate/src/core/gates/manifest.ts`, `packages/provegate/src/core/config/types.ts`, `packages/provegate/src/core/config/defaults.ts`, `packages/provegate/src/core/config/validate.ts`
2. **FR-2 — Command safety**: port `isSafeCommand` (reject `` ` ``/`$`/`>`/`<`/`$(`/
   `git push` anywhere; split on `&&`/`||`/`;`/`|`; every segment must start with an
   allowed prefix from config) and `parseVerificationCommands` (§11 section, `| FR-N |`
   rows, backticked commands, dedupe, per-command safety flag).
   - **Targets:** `packages/provegate/src/core/gates/safety.ts`
3. **FR-3 — Class parsing + diff conditioning**: port `parsePrdClass` (header field,
   validated against config `classes`, default first class), `collectDiffFiles`
   (merge-base vs `origin/<base>` then `<base>` then `HEAD` fallback — array-arg
   execFile only), `resolveClassGates(manifest, class, changedFiles)` (rules whose
   `when.diffMatches` globs match ≥1 changed file — glob engine reuse; unconditional
   rules always apply), `mergeGateCommands` dedupe.
   - **Targets:** `packages/provegate/src/core/gates/classes.ts`
4. **FR-4 — Review-artifact gate**: port `validateReviewArtifact` (PRD/Verdict/
   Reviewer/Base SHA/Critical/Quorum metadata block; pass⇒Critical must be 0),
   `extractReviewArtifactPath` + `validateTasksReviewRow` (ledger row `independent-review`
   must be `passed` and name an artifact under config `dirs.reviewsDir`), artifact path
   pattern derived from config (id pattern + reviews dir). New
   `schemas/review-metadata.schema.json` (the fourth schema, deferred from PRD-001).
   - **Targets:** `packages/provegate/src/core/gates/review.ts`, `packages/provegate/schemas/review-metadata.schema.json`, `packages/provegate/schemas/README.md`
5. **FR-5 — Operator-acceptance guard**: port `loadAcceptance`/`validAcceptance`
   (acceptances file under config state dir, owner must be in config `owners` — role
   identities, never person names; items non-empty; reason ≥ 5 chars) and
   `operatorGateOk` (0 operator rows = pass; else require valid acceptance entry).
   - **Targets:** `packages/provegate/src/core/run/acceptance.ts`
6. **FR-6 — Durable-artifacts gate**: parse the PRD `## Durable Artifacts` section
   (backticked paths, `none` handling — same discipline as `declaredGlobs`), gate
   passes iff every declared path appears in the merge-range diff
   (`merge-base(base, HEAD)...HEAD`).
   - **Targets:** `packages/provegate/src/core/run/durable.ts`, `packages/provegate/src/core/state/markdown.ts` (shared parser)
7. **FR-7 — Metrics**: `appendMetric(config, root, entry)` — append JSONL to config
   `dirs.metricsFile` (create dirs; never throw into the gate path — best-effort with
   stderr note). Local only, no network, file gitignored by default (add to repo
   `.gitignore`).
   - **Targets:** `packages/provegate/src/core/run/metrics.ts`, `.gitignore`
8. **FR-8 — Runner engine**: `buildGateChain(config, manifest, prdRecord, prdContent, tasksContent, changedFiles)` →
   ordered gates: Phase 4 floor+class commands; Phase 5 §11 commands (refusing unsafe =
   STOP, empty = STOP "PRD gap"); Phase 6 review-ledger fn-gate; Phase 7
   durable-artifacts fn-gate; merge-gate operator guard. `runChain` executes with
   per-gate results + metrics + `--from-phase` skip logic; `planChain` renders the
   dry-run plan; STOP card (stderr, resume hint, exit 1) and handoff card (stdout,
   diffstat, gate list, "push is yours") ported with English text.
   - **Targets:** `packages/provegate/src/core/run/chain.ts`, `packages/provegate/src/core/run/cards.ts`
9. **FR-9 — Archive + local merge + auto-revert**: port `archivePrdArtifacts`
   equivalent (move the item's four artifacts wip→completed via git mv semantics +
   commit with config-driven message), `ensureBaseCheckoutClean` (reset
   coordination-only dirt; refuse on source dirt), merge target discovery: worktree
   with base checked out (source parity) **or single-checkout fallback** (base is a
   local branch in this checkout: checkout base → merge → on failure reset + return to
   feature branch) — deliberate OSS generalization, single-checkout repos are
   first-class. `git merge --no-ff` array-args, post-merge gates from manifest
   `postMerge`, failure ⇒ `git reset --hard HEAD~1` + STOP. **No push invocation
   anywhere; §11 grep gate enforces.**
   - **Targets:** `packages/provegate/src/core/run/merge.ts`, `packages/provegate/src/core/run/archive.ts`
10. **FR-10 — PRD-ready lint (`gate check`)**: structural checks (every FR has
    `**Targets:**`; every FR has a §11 row with ≥1 runnable command; `## 12. DO NOT`
    present; `## 9. Open Questions` empty or explicitly deferred; no `TBD`/`???`/
    `to be decided` in FR/spec sections; unsafe §11 commands reported) + manifest
    `hardCaps` evaluation (rule fires when `when.targetsMatch` intersects FR target
    paths and `requireLine` regex finds no match in the PRD). Library returns issue
    list; CLI exits 0/1.
    - **Targets:** `packages/provegate/src/core/gates/prd-ready.ts`
11. **FR-11 — Wiring audit (`gate check-wiring`)**: every manifest-declared command
    must be reachable (member of a phase chain, a class-default rule, or `postMerge`);
    every package.json script matching config pattern (`verifyScriptPattern`, default
    `^verify:`) must be referenced by the manifest, CI workflow run-lines
    (`.github/workflows/*.yml`, executing text only), or `wiringExceptions`; stale
    exceptions (gate now wired or script gone) fail — shrink-only.
    - **Targets:** `packages/provegate/src/core/gates/wiring.ts`
12. **FR-12 — CLI + exports**: wire `run` (`--dry-run`, `--from-phase=4|5|6|7|merge`),
    `land` (= run `--from-phase=merge`), `check` (+ `check-wiring` subaction via
    `gate check --wiring`? no — separate hidden? decide: `gate check <id>` and
    `gate check --wiring`), replacing their stubs; `init|new|open` remain stubs;
    `push` refusal byte-identical; public exports for all new modules.
    - **Targets:** `packages/provegate/src/cli.ts`, `packages/provegate/src/core/gates/index.ts`, `packages/provegate/src/core/run/index.ts`, `packages/provegate/src/index.ts`

---

## 5. Non-Goals (Out of Scope)

- **Worktree creation/management** (`prd-worktree.mjs`, 672 LOC) — separate PRD; the
  runner consumes existing checkouts, it does not create them.
- **`gate init` / `gate new` / `gate open`** — scaffolding + lease-acquisition UX,
  later Phase B/C follow-up PRD.
- **Readiness scoring** (Phase 2 prompt) — stays an agent phase; `gate check` is the
  structural lint, not the scorer.
- **Status panel, wiki sync, ship-pre, branch-isolation/commit guards, defer
  machinery** — later PRDs.
- **Prompts/templates/method docs** — Phase D.
- **Domain gates** (verify:rds-imports etc. seen in source class-gates) — user-manifest
  content, never shipped; examples arrive Phase D.
- **CI-side autorun** — the runner is local-only by design in this phase.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** no `gates.manifest.json`, **When** `gate run --dry-run PRD-XXX` runs,
  **Then** the plan shows the floor gates from config.commands and the §11 commands of
  that PRD, and exits 0 without executing anything.
- **Given** a manifest with `classDefaults.infra = [{ when: { diffMatches: ["scripts/**"] }, run: ["pnpm verify:x"] }]`
  and a diff touching `scripts/a.mjs`, **When** the chain is built for an infra PRD,
  **Then** `pnpm verify:x` appears exactly once in Phase 4.
- **Given** a §11 row containing `` `rm -rf /` `` or `` `git push` ``, **When** the
  runner reaches Phase 5, **Then** it refuses the command and STOPs (and `gate check`
  reported it beforehand).
- **Given** a tasks ledger whose `independent-review` row is `passed` but names an
  artifact with `Verdict: pass` and `Critical: 2`, **When** Phase 6 runs, **Then** the
  gate fails with the schema issue.
- **Given** operator-handoff rows > 0 and no valid acceptance entry, **When** the merge
  gate runs, **Then** the chain STOPs naming the acceptance command; **Given** a valid
  entry signed by a config owner, **Then** the gate passes as waived.
- **Given** a post-merge gate failure, **When** the merge step runs, **Then**
  `git reset --hard HEAD~1` restores base and the STOP card says the feature branch is
  intact.
- **Given** this repository single-checkout, **When** `gate run PRD-002` executes with
  all gates green and the owner's acceptance recorded, **Then** the PRD's artifacts are
  archived, the feature branch merges no-ff into `main`, post-merge gates pass, and the
  handoff card ends with the push belonging to the human.
- **Given** any state, **When** `gate push` runs, **Then** `No. Push is yours.` exit 1.

---

## 7. Technical Considerations

### Architecture

- **Manifest vs config**: `workflow.config.json` = repo shape + vocabulary (PRD-001);
  `gates.manifest.json` = gate membership + policy. Separate files because the manifest
  is expected to churn per-project while config is near-static.
- **Execution**: §11 and manifest commands are shell command lines by nature; they run
  through the shell **only after** `isSafeCommand` passes (allowlisted prefix on every
  pipeline segment, no metachars, no `git push`). Internal git operations stay
  `execFile` array-args. This is source parity and the §12 no-shell rule is refined
  accordingly: _user-gate commands_ run via checked shell; _internal plumbing_ never
  does.
- **Merge substrate**: worktree-discovery port + single-checkout fallback (documented
  generalization; roadmap open decision #4 answered "yes, single-package/checkout
  repos are supported").
- **Metrics** append-only local JSONL; failures to write never fail a gate.
- **Recursion note**: `gate run PRD-002` executes PRD-002's own §11, which includes
  vitest suites but NOT `gate run` itself (no self-recursion in §11 FR rows —
  the dogfood close is the operator-triggered outer invocation).

### Dependencies

- Runtime: none. Reuses PRD-001 core (config, state, locks glob engine, markdown).

### Database Changes

- None. New files: `gates.manifest.json` (optional, user-owned),
  `_state/prd-metrics.jsonl` (generated, gitignored), `_state/acceptances.json`
  (operator-written, committed).

### API Changes

- CLI: `run`, `land`, `check` become real. Programmatic exports for manifest, safety,
  classes, review, acceptance, durable, metrics, chain, merge, prd-ready, wiring.

---

## 8. Implementation Scope

### In Scope

- [x] `packages/provegate/src/core/gates/` (new: manifest, safety, classes, review, prd-ready, wiring)
- [x] `packages/provegate/src/core/run/` (new: chain, cards, merge, archive, acceptance, durable, metrics)
- [x] `packages/provegate/src/core/config/` (field additions only)
- [x] `packages/provegate/src/cli.ts`, `src/index.ts`
- [x] `packages/provegate/schemas/review-metadata.schema.json`
- [x] `packages/provegate/test/`
- [x] `.gitignore` (metrics file)

### Out of Scope

- [ ] `apps/*` beyond the docs page durable artifact
- [ ] Any push/remote/network code path

---

## 9. Open Questions

- (none — scope decisions recorded as Non-Goals; the single-checkout merge
  generalization is a §7 decision, reviewable at Phase 1 approval)

---

## 10. References

- Roadmap Phase C: `docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md` §Faz C
- Source ports: `source-snapshot/scripts/{prd-autorun,prd-class-gates,prd-command-safety,review-artifact-utils,verify-gates-wired,prd-archive,prd-metrics}.mjs`
- PRD-001 core (consumed): `packages/provegate/src/core/{config,state,locks}`
- `docs/research/provegate-bootstrap/DECISIONS.md` — never-push invariant, zero deps, local JSONL metrics

---

## Conflict Surface

- `packages/provegate/src/**`
- `packages/provegate/test/**`
- `packages/provegate/schemas/**`
- `gates.manifest.json`

---

## Durable Artifacts

- `apps/docs/content/docs/cli.mdx` — `run`/`land`/`check` move to the implemented section
- `packages/provegate/README.md` — manifest + runner documentation
- ADR: `none` (decisions recorded in §7)

---

## 11. Verification Commands

Run from repo root after `pnpm build`. Every FR maps to ≥1 runnable command.

| FR    | Command / Check                                                                                                  | Scope     | Notes                                                        |
| ----- | ---------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------ |
| FR-1  | `pnpm --filter provegate test test/manifest.test.ts`                                                             | provegate | defaults, merge, unknown keys, semantic class check          |
| FR-2  | `pnpm --filter provegate test test/safety.test.ts`                                                               | provegate | metachar/push refusal, prefix allowlist, §11 parse           |
| FR-3  | `pnpm --filter provegate test test/classes.test.ts`                                                              | provegate | class parse, diff fallback chain, conditional rules          |
| FR-4  | `pnpm --filter provegate test test/review-gate.test.ts`                                                          | provegate | metadata block, pass-with-critical rejection, ledger row     |
| FR-5  | `pnpm --filter provegate test test/acceptance.test.ts`                                                           | provegate | owner allowlist from config, malformed entries               |
| FR-6  | `pnpm --filter provegate test test/durable.test.ts`                                                              | provegate | declared∩diff, `none` handling                               |
| FR-7  | `pnpm --filter provegate test test/metrics.test.ts`                                                              | provegate | JSONL append, best-effort failure                            |
| FR-8  | `pnpm --filter provegate test test/chain.test.ts` && `node packages/provegate/dist/cli.js run --dry-run PRD-002` | provegate | chain assembly, from-phase skip, live dry-run plan exit 0    |
| FR-9  | `pnpm --filter provegate test test/merge.test.ts`                                                                | provegate | fixture-repo merge, auto-revert, coordination-dirt reset     |
| FR-10 | `pnpm --filter provegate test test/prd-ready.test.ts` && `node packages/provegate/dist/cli.js check PRD-002`     | provegate | structural + hard caps; live lint of this PRD exits 0        |
| FR-11 | `pnpm --filter provegate test test/wiring.test.ts` && `node packages/provegate/dist/cli.js check --wiring`       | provegate | unwired gate fails, stale exception fails, live audit exit 0 |
| FR-12 | `pnpm build && node packages/provegate/dist/cli.js --help`                                                       | provegate | run/land/check listed as real; stubs unchanged               |

Cross-cutting (all green before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm --filter provegate test` — full suite incl. all PRD-001 suites unchanged
- `pnpm build` — clean
- `node -e "const d=require('./packages/provegate/package.json').dependencies; if (d && Object.keys(d).length) process.exit(1)"` — zero runtime deps
- `node packages/provegate/dist/cli.js push; test $? -eq 1` — never-push invariant
- `grep -rn --include='*.ts' -e 'git push' -e 'push(' packages/provegate/src/core/run packages/provegate/src/core/gates | grep -v '\.push(' | grep -v 'refuse' ; test $? -eq 1` — no push invocation in runner/gates (array `.push()` excluded)
- `grep -ri --include='*.ts' -l -e emofy -e rayvaz packages/provegate/src && exit 1 || true` — no parent-project names

Close (operator-triggered, the dogfood finale): `node packages/provegate/dist/cli.js run PRD-002`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT add a runtime dependency.
- DO NOT add any code path that pushes to a git remote — not in merge, not in archive,
  not behind a flag. The safety gate must refuse `git push` inside §11 commands too.
- DO NOT run user-gate commands without an `isSafeCommand` pass; DO NOT spawn internal
  git through a shell (array-args only).
- DO NOT hardcode parent-project values: gate names (`verify:rds-imports`,
  `verify:affected-tests`…), branch `development`, `@emofy/*` package mapping, UI-app
  prefixes, `_STATUS.md`/wiki paths — class defaults and gate lists live in the user's
  manifest, never in shipped code.
- DO NOT port the `ACCEPTANCE_OWNERS` personal name or grandfather thresholds
  (`REVIEW_SCHEMA_FROM_PRD` gating — schema is required from PRD-001 here, no
  legacy window).
- DO NOT let metrics writes fail a gate, and DO NOT send metrics anywhere.
- DO NOT weaken PRD-001 semantics (stateRoles, sentinel, vocab-driven queries) while
  integrating.
- DO NOT fabricate prompts/templates content — Phase D.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-22 | rayvaz | Initial draft |
