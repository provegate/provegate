# verify:* catalog — universal checks to extract

Each check: **invariant** · **how it checks** · **pattern** (from `patterns.md`) · **phase/gate**.
Names are Emofy's `verify:*`; rename freely. Emofy-domain checks to DROP are listed at the end.

> All are plain scripts that exit 0 (pass) / non-zero (fail). Rename `pnpm` → provegate's runner.

## Spec / work-item lifecycle

- **prd-ready** — a spec is execution-ready. *How:* markdown/regex lint — FR Targets exist on
  disk (absence allowed when the line says new/create/delete), no unresolved open questions,
  §11 has a runnable command per FR, DO NOT present, no escape-words (TBD/TODO), Durable
  Artifacts present-or-`none`, §11 safety dry-run, declared score == Σ(weights), Conflict
  Surface covers every FR Target. *Pattern:* — (composite lint). *Gate:* Phase 2 (human).
  *Drop:* Emofy's specific DO-NOT items + multi-tenant hard caps; keep the lint skeleton.
- **prd-state** — the state JSON is fresh AND lifecycle rules hold. *How:* regenerate state
  from spec files + byte-compare (P1); then rules — status not Unknown, required artifacts
  present per status, no status aliases, "shipped" requires a review artifact on disk.
  *Pattern:* P1 + a state machine. *Gate:* `verify:workflow`, pre-ship, CI.
- **durable-artifacts** — every declared (non-`none`) Durable Artifact path is in the merge
  diff. *How:* parse `## Durable Artifacts` paths, intersect with `git diff merge-base…HEAD`
  ∪ working+staged (P5). *Pattern:* P5. *Gate:* Phase 7. *Fully universal.*
- **review-artifact** — the independent-review record has a valid schema. *How:* parse
  `> **Key:** value` meta; require Item/Verdict(pass|fail)/Reviewer/Base-SHA/Critical(numeric);
  **Verdict=pass requires Critical=0**. (The origin system also requires `Quorum` — its
  multi-reviewer panel; provegate makes Quorum optional, a declared divergence.) *Pattern:*
  — (schema). *Gate:* Phase 6. *Fully universal* (this is `02` practice 01 in runnable form).
- **deferred** — every deferral row has owner+expiry+renewal-counter; overdue fails;
  renew-once-then-escalate; a combined row cap (warn at 80%). *How:* markdown table scan of the
  status board. *Pattern:* — . *Gate:* `verify:workflow`, CI. *Universal backlog-honesty.*

## Coordination / parallel agents (adopt with the orchestration wave)

- **status-sync** — the status board's active-agent table ⇄ the lock files agree. *How:*
  filesystem scan of lock JSONs vs. parsed board table, bidirectional match; a `--ci` mode
  checks stale claims + "no active claims on PRs into protected branches." *Pattern:* P1-ish.
  *Gate:* `verify:workflow`, CI.
- **path-conflicts** — no two active items claim overlapping source paths. *How:* materialize
  each lock's `ownedPaths` globs against `git ls-files`, subtract shared manifests, fail on
  non-empty pairwise intersection; `--prd` mode checks a candidate's Conflict Surface vs.
  active locks; has `--self-test`. *Pattern:* P5. *Gate:* item-start pre-check, `verify:workflow`.
- **agent-locks** — lock files are schema-valid + expiry-checked. *Pattern:* — (schema).
- **branch-isolation** — execution-phase locks run in an isolated worktree on a feature
  branch, never a protected base. *How:* active-lock field scan. *Pattern:* — .
- **acceptances** — the operator sign-off store matches its JSON schema and every owner is
  allowlisted. *How:* structural JSON validation + owner allowlist (P6). *Pattern:* P6.

## Meta / hygiene (the honest-library layer)

- **gates-wired** — every `verify:*` in package.json is reachable from CI/pre-ship, and every
  `verify-*` script on disk is a registered gate. *How:* parse executing CI `run:` steps
  (skip `if:false`/comments) + script files; shrink-only exception list. *Pattern:* P3.
  *Gate:* CI heartbeat. *The meta-gate — port this early.*
- **workflow** — the aggregate local gate bundle. *How:* run a hard-coded list of checks;
  partition against a known-red manifest that fails on stale/unknown entries (P4). *Pattern:*
  P4. *Gate:* Phase 6, pre-ship, CI. *The gate-runner-of-runners.*
- **doc-bloat** — agent-facing markdown stays under size caps. *How:* per-file byte-size
  caps + per-file longest-line caps. *Pattern:* — . *Universal token-cost guard.*
- **memory-drift** — implemented items are reflected in the memory/status docs. *How:* compare
  the state JSON's implemented records against the target docs. *Pattern:* P1-ish. *Gate:*
  `verify:workflow`. *Drop* the specific wiki/Serena paths; keep the idea (ties to `_brain`).
- **status-panel** — committed status-panel cells equal recomputed values. *Pattern:* P1.
- **affected-tests** — tests for git-diff-affected packages pass (retry, class-aware). *How:*
  diff → package map → run tests on changed packages. *Pattern:* — . *Gate:* Phase 4. *Drop*
  the `@emofy/*` package-name heuristics; keep affected-selection.
- **no-cycles / package-cycles** — import-cycle / workspace-dep-cycle ratchet vs. a baseline.
  *How:* a file-graph tool (madge) for import cycles; a hand-rolled workspace-manifest DFS
  for package cycles; shrink-only baseline JSON either way. *Pattern:* P2.
- **test-task-coverage** — a source-bearing, buildable package that declares no *real* test
  task is silently skipped by the pipeline's test run — green while never tested. *How:*
  scan workspace packages; each with source + build must declare a genuine test task; also
  closes the `--passWithNoTests` and literal `\|\| true` escape hatches. *Pattern:* — (a
  false-green closer, kin to seed `false-green-on-missing-file`). *Gate:* `verify:workflow`,
  CI. *Fully universal.*
- **ci-freshness** — the default branch must have a recent green CI run. *How:* a scheduled
  meta-monitor (cron) that queries the CI provider and fails loud when no green run exists
  within N days — catches a *silently broken or disabled* CI pipeline, which no per-commit
  check can see. Distinct from the nightly gate-bundle heartbeat. *Pattern:* — . *Gate:*
  scheduled workflow. *Universal (born from a multi-week silent CI outage).*
- **dependency-audit** — dependency vulnerabilities above a severity floor fail, with a
  shrink-only allowlist for accepted advisories. *How:* the package manager's audit command
  + severity threshold + allowlist, in its own scheduled/CI workflow. *Pattern:* P2-adjacent
  (allowlist is shrink-only). *Universal security hygiene.*

---

## DROP for a generic project (Emofy-domain checks)

These enforce Emofy's product model; a generic OSS project drops them. Listed so provegate's
agent recognizes and doesn't port them:

- **Multi-tenant / RLS / org-scoping:** `org-scoped-repos`, `org-purge-coverage`, `skip-org`,
  `no-system-users-in-public-surfaces`, `convex-org-naming`, `no-string-filter`, `no-record-bodies`.
- **Data-classification / privacy:** `processing-inventory`, `redact-patterns-fresh`,
  `legal-parity`, `audit-metadata-allowlist`, `audit-actions-mirror`.
- **Scope-planes / authorization (largest bucket):** `plane-coverage`, `scope-sync`,
  `domain-boundaries` (but keep its **ratchet mechanism** — P2), `boundaries-tags`,
  `manifest-accuracy`, and the whole `authorization-*`/`authz-*`/`permission-*`/
  `convex-role-mirror`/`org-role-literals`/`no-client-ac-authz` family.
- **Platform-specific:** `token-*` (design tokens), `rds-*`/`ramarkable-*` (design system),
  `ema-*` (mini-apps), `webhook-*`/`event-*`/`search-index-wiring`,
  `openapi-snapshot`/`v1-semantics`/`api-wiring`/`dev-sdk-coverage`,
  `turbo-*`/`root-task-inputs` (monorepo build), `security-headers`/`no-*-mocks`.
  (`dependency-audit` moved to EXTRACT above — it is generic security hygiene, not product
  logic.)

**Rule of thumb:** if a check encodes *what the product is* (its entities, roles, tenancy,
design system), drop it. If it encodes *how the workflow stays honest* (state freshness,
declared-and-checked, ratchets, wire-or-delete, review schema), keep it.
