# Tasks: The Quickstart Executes, or It Fails

> **PRD**: [prd-038-executable-quickstart.md](../../_prds/wip/prd-038-executable-quickstart.md)
> **Readiness**: [readiness-038-executable-quickstart.md](../../_readiness/wip/readiness-038-executable-quickstart.md)
> **Status**: Not Started
> **Readiness Score**: 8.46/10 (iteration 7, PASS — seventh independent scorer; prototype-first pivot at iteration 3)
> **Model Tier (Execution)**: high
> **Model Tier (Audit)**: high
> **PRD Class**: infra
> **Autonomous Close**: eligible
> **Created**: 2026-07-29

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Decisions in **Deferrals & Decisions**; the close is `eligible` — no operator rows
  exist by design; if implementation discovers one, the PRD's Autonomous Close flips
  to operator-gated BEFORE the close.
- Phase 4 agents hold a valid lock lease before editing implementation files or this
  task file.
- The PRD changelog is HISTORY; implement from §4/§6/§7/§11. The [D]/[H] table in
  FR-2 is a MEASURED transcript (2026-07-28 prototype) — trust it over intuition,
  and quote the three stop strings exactly as pinned.
- No `any`, no `eslint-disable`, no `|| true`. Sweeps grep-verified before any
  changelog row claims them.

---

## Memory Context

- `docs-outlive-the-gate-they-promise` — the founding record: the quickstart is the
  gate this PRD builds. Binds 2.0.
- `derive-the-requirement-from-the-consumer` — commands come from the committed doc
  at run time; the harness stores no copy. Binds 1.0, 2.0.
- `runner-sentinel-blocks-cli-spawning-tests` — every spawned CLI child gets a
  sanitized env with the runner sentinels removed, so §11 stays green under
  `gate run` itself. Binds 2.0.
- `turbo-cache-masks-out-of-input-reads` — the parity verifier is a root script; the
  docs file sits outside the package's turbo inputs, comment at the read site.
  Binds 3.0.
- `assert-absent-needs-an-independent-cause` — the mutation pair changes the DOC
  (scratch copy), never the harness. Binds 2.0.
- `push-is-human-by-omission` — the scratch repo never gains a remote; asserted
  before/after every step. Binds 2.0.
- `two-parsers-wrong-together` — one command sequence; the parity verifier keeps the
  two docs one. Binds 3.0.
- `fixture-must-reach-production-shape` — the printed commands run via the real CLI;
  no internal calls. Binds 2.0.
- `gate-wire-or-delete` — FR-4's wiring. Binds 4.0.
- `ADR-0004-method-rule-vs-repo-rule` — the parity rule is a repo rule; the ADR
  gains the class row. Binds 4.0.
- `adr-section-blank-line-reads-empty` — live hazard: no `pnpm format` over the ADR;
  the amendment is hand-placed and `verify:brain` holds it. Binds 4.0.

---

## Relevant Files

- `packages/provegate/QUICKSTART.md` — `qs:scenario` markers, `qs:skip` on the
  worktree block, its handoff-card fence retag (FR-1)
- `packages/provegate/test/quickstart-e2e.test.ts` — NEW: extraction + hermetic e2e
  + negative fixtures + mutation pair + cleanup plant (FR-1/FR-2)
- `apps/docs/content/docs/quickstart.mdx` — its own markers, canonical-region
  convergence, relocated `--practices` section, its handoff-card retag (FR-3)
- `scripts/verify/verify-quickstart-parity.mjs` — NEW: root parity verifier (FR-3)
- `package.json` — `verify:quickstart-parity` (shared append-only)
- `scripts/verify/verify-workflow.mjs` — CHECKS member (FR-4)
- `scripts/verify/script-classes.json` — the class row (FR-4)
- `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` — the amendment (FR-4)
- `_brain/learnings/quickstart-is-a-fixture.md` + `_brain/INDEX.md` — Memory Output
- `_docs/reviews/review-038-executable-quickstart.md` — Phase 6 artifact
- `_docs/wip/summary-038-executable-quickstart.md` — Phase 7 summary

---

## Tasks

- [ ] 0.0 Pre-flight
  - [ ] 0.1 `gate queue`, then `node packages/provegate/dist/cli.js open PRD-038` —
        seven-path surface; check overlap against active leases (034 holds package
        paths — verify disjoint or wait).
  - [ ] 0.2 Board row; worktree (`git worktree add -b prd-038-executable-quickstart
        ../provegate-prd-038 main` + `pnpm install --frozen-lockfile` +
        `pnpm --filter provegate build`).
  - [ ] 0.3 Baseline: re-run the fence census (`grep -n '\`\`\`' packages/provegate/QUICKSTART.md`)
        and record it in the Progress Log against the PRD's corrected census (the
        two handoff-card blocks untagged).
- [ ] 1.0 FR-1 — the markers and the extraction (red-first)
  - [ ] 1.1 Write the extraction tests FIRST (region grammar: one `qs:scenario`
        pair; `qs:skip` binds to exactly the next ```sh fence, dangling/double =
        named failures; per-line splitting with backslash joins and comment/blank
        skips; doc-line retention; untagged fence inside the region = named
        failure) and watch them fail against the unmarked doc.
  - [ ] 1.2 Mark up `packages/provegate/QUICKSTART.md`: the `qs:scenario` pair
        around the canonical path, `qs:skip` before the worktree block's fence, its
        handoff-card fence retagged ` ```text `. Rendering-neutral (HTML comments
        are legal in plain Markdown — this doc is NOT MDX; the docs twin is, and
        gets MDX-comment markers in 3.0, the PRD-037-measured constraint).
  - [ ] 1.3 Extraction green; the skipped worktree fence asserted SKIPPED.
- [ ] 2.0 FR-2 — the hermetic e2e harness
  - [ ] 2.1 Setup helpers (own, small — PRD-007 exports none): temp root; child env
        factory (HOME/XDG/npm-userconfig/TMPDIR under scratch; delete
        `GIT_CONFIG_COUNT`/indexed pairs/`GIT_CONFIG_PARAMETERS` + every
        `PROVEGATE_*` runner sentinel; pin `GIT_CONFIG_GLOBAL=/dev/null`,
        `GIT_CONFIG_SYSTEM=/dev/null`, `GIT_CONFIG_NOSYSTEM=1`); tarball pre-pack
        (`pnpm --filter provegate build` + `npm pack --pack-destination <scratch>`).
  - [ ] 2.2 The measured [D]/[H] table verbatim in the test file, each [H] row tied
        to its CLI precondition; the install line mapped by exact source match to
        the tarball form with the unreachable registry
        (`--registry http://127.0.0.1:9`), exhaustiveness-asserted (no other
        install line unmapped).
  - [ ] 2.3 Single-pass production path: pre-seed every [H] artifact, run the [D]
        commands in doc order, assert each step's outcome, reach the handoff card;
        `git remote` asserted empty before/after every step.
  - [ ] 2.4 The three pinned negative fixtures, exact strings: omitted tasks file →
        `PRD-001: no tasks file — independent-review ledger missing`; planted
        literal `main` in Base SHA → the exact missing-metadata reason; close from
        scratch main → `current branch is 'main' — run from the feature branch,
        not the base checkout`.
  - [ ] 2.5 The mutation pair: scratch doc copy with `gate new`/`gate open`
        swapped → the relocated `gate open PRD-001` fails (nothing to claim),
        named with its retained line from the COPY, stderr tail in the diagnostic.
  - [ ] 2.6 The cleanup plant: non-empty chmod-555 subdir → initial removal failure
        asserted, permissions reset + retry in `finally`, deletion verified,
        diagnostics captured first (POSIX/Ubuntu scope stated in the test).
  - [ ] 2.7 Post-setup write boundary asserted: scratch tree + remapped roots
        contain every file the run created after setup.
- [ ] 3.0 FR-3 — the docs convergence and the parity verifier
  - [ ] 3.1 `apps/docs/content/docs/quickstart.mdx`: its own region markers (MDX
        comment form), the canonical region converged VERBATIM to the package
        sequence (plain `npx gate init`), the `--practices` recommendation moved to
        its own optional section, its handoff-card fence retagged.
  - [ ] 3.2 NEW `scripts/verify/verify-quickstart-parity.mjs`: extracts both tagged
        regions (each doc's own marker syntax), excludes skipped fences
        identically to the harness, asserts command-sequence equality; root-script
        comment naming the turbo boundary; fails loudly on a missing/unmarked doc.
  - [ ] 3.3 Parity green; divergence probe (edit one docs command, watch the named
        failure, revert — Progress Log).
- [ ] 4.0 FR-4 — wiring and classification
  - [ ] 4.1 `package.json` `verify:quickstart-parity`; `verify-workflow.mjs` CHECKS
        member; `script-classes.json` row.
  - [ ] 4.2 `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md`: the application row
        (parity = repo rule), hand-placed in the existing section shape — NO
        format sweep (`adr-section-blank-line-reads-empty` live hazard);
        `pnpm verify:brain` green after.
- [ ] 5.0 Migration & Rollback verification (infra parent)
  - [ ] 5.1 The coordinated atomic set: land as one commit (or verify each
        intermediate tree holds no registered-without-script state); rollback prova
        in a scratch worktree — revert restores parity-verifier-free green.
- [ ] 6.0 Phase 5 — Testing: every §11 row, then the floor
  - [ ] 6.1 `pnpm --filter provegate test test/quickstart-e2e.test.ts -t extraction`
  - [ ] 6.2 `pnpm --filter provegate test test/quickstart-e2e.test.ts -t sequence`
  - [ ] 6.3 `pnpm --filter provegate test test/quickstart-e2e.test.ts -t mutation`
  - [ ] 6.4 `pnpm verify:quickstart-parity`
  - [ ] 6.5 `pnpm verify:workflow`
  - [ ] 6.6 Floor: `pnpm check-types` && `pnpm lint` && `pnpm test` && `pnpm build`
  - [ ] 6.7 Re-read PRD §12 DO NOT — no command copy in the harness, no internal
        calls, no remote, no turbo-boundary read, no doc redesign, committed doc
        never mutated by tests.
- [ ] 7.0 Phase 6 — Final Auditing
  - [ ] 7.1 Independent adversarial review (different model/session; `Critical: 0`;
        `Quorum: 1/1 pass`; real Base SHA; artifact path named in the ledger row) →
        `_docs/reviews/review-038-executable-quickstart.md`.
  - [ ] 7.2 `pnpm verify:workflow` green after any fix; draft
        `_docs/wip/summary-038-executable-quickstart.md`.
- [ ] 8.0 Phase 7 — Learning and close (eligible)
  - [ ] 8.1 Write `_brain/learnings/quickstart-is-a-fixture.md` + INDEX hook
        (≤120 chars); the ADR amendment already carries its own declaration.
  - [ ] 8.2 `pnpm check:durable-artifacts` — learning, ADR, INDEX, review artifact
        in the merge diff.
  - [ ] 8.3 `node packages/provegate/dist/cli.js run PRD-038` — from the WORKTREE
        (the §11 commands need the branch's files; the PRD-037 close proved the
        worktree-run merge lands when the primary is clean); on a stop after
        "archived", `gate-run-resume-after-archive`. NO acceptance needed
        (eligible, zero operator rows). Push stays the owner's.
  - [ ] 8.4 `release PRD-038`, drop the board row, remove the worktree.

---

## Verification Ledger

| Gate | Command / Check | Scope | Result | Evidence | Notes |
| ---- | --------------- | ----- | ------ | -------- | ----- |
| FR-1 | `... -t extraction` | pkg | pending | | red-first vs the unmarked doc |
| FR-2 | `... -t sequence` | pkg | pending | | single-pass to the handoff card; three negative fixtures |
| FR-2 | `... -t mutation` | pkg | pending | | new/open swap; cleanup plant |
| FR-3 | `pnpm verify:quickstart-parity` | repo | pending | | tagged regions equal; divergence probe |
| FR-4 | `pnpm verify:workflow` | repo | pending | | CHECKS membership |
| FR-4 | `pnpm verify:brain` | repo | pending | | ADR amendment parses |
| atomicity | rollback prova | repo | pending | | 5.1 |
| types/lint/test/build | the floor | monorepo | pending | | |
| independent-review | artifact path + `Critical: 0` + Quorum | review | pending | | |
| durable | `pnpm check:durable-artifacts` | repo | pending | | |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

## Deferrals & Decisions

- (none yet)

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

## Blockers / Open Questions

- (none)

## Operator Handoff

> Eligible close: no operator rows by design.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
|      |          |       |                |        |       |
