# Tasks: Duplicate Consolidation — Delete the Copies, Once Their Replacements Exist

> **PRD**: [prd-026-duplicate-consolidation.md](../../_prds/wip/prd-026-duplicate-consolidation.md)
> **Readiness**: [readiness-026-duplicate-consolidation.md](../../_readiness/wip/readiness-026-duplicate-consolidation.md)
> **Status**: Code Complete
> **Readiness Score**: 8.43/10 (PASS, iteration 6)
> **Model Tier (Execution)**: high
> **Created**: 2026-07-28
> **Updated**: 2026-07-28

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- A PRD may be `Code Complete` with operator handoff items, but it is not
  `Ship Verified` until required handoff items are resolved or explicitly accepted.
- Phase 4 agents hold a valid lock lease (METHOD.md → Locks) before editing
  implementation files or this task file.
- No `any`; `unknown` plus narrowing. PRD §12 binds every task — re-read it per parent.
- **The one-commit deletion invariant binds parent 6.0**: every deletion — repo scripts,
  packed twins, `PACK_MAP` entries, both exceptions files, both bundle trims — lands in
  ONE commit, because `verify:pack-drift` pairs the two sides and a one-sided state is
  red in either direction.

---

## Memory Context

The slugs the PRD selected as Memory Inputs, carried here so implementation does not
re-derive them. Each gets the 0.1 re-open pass; the ones that constrain a specific
parent are noted there.

- `false-green-on-missing-file` — every deletion pairs with its surviving surface; floor
  commands fail rather than skip on a missing file (6.0).
- `gate-wire-or-delete` — the delete half (6.0) and the documentation extension (7.0).
- `fixture-must-reach-production-shape` — the upgrade fixture calls the production
  `initWorkspace` pair, never the planner alone (6.6).
- `assert-absent-needs-an-independent-cause` — both upgrade-fixture absences carry
  positive controls; the mutation check fails on the contract, not on readability (6.6).
- `durable-artifact-must-commit` — the review artifact and the learning land in the
  closing merge (12.0).
- `narrow-the-grammar-not-the-parser` — FR-2's declaration lint restricts the section,
  never learns more Markdown (2.0).
- `evidence-pattern-satisfied-by-the-template` — FR-6's check runs against the real
  tree and its exclusion list is itself asserted (7.0).
- `known-red-ledger-must-expire` — `method-pending` requires owner + reviewBy and fails
  past the date (3.0).
- `shipped-content-needs-a-delivery-gate` — removing a `PACK_MAP` entry is a delivery
  change; the proof is the executor-driven upgrade fixture (6.6).
- `surface-set-without-its-predicate` — the review sweep ships selection AND binding;
  the ledger ships its surface AND schema-plus-diff predicate (1.0, 3.0).
- `a-rule-corrected-survives-where-it-is-restated` — after ANY mid-flight rule
  correction, grep every restatement; this document measured the defect inside its own
  remediation twice (all parents).
- `scope-out-the-layer-the-rounds-keep-hitting` / `gate-run-resume-after-archive` /
  `two-parsers-wrong-together` / `strictness-added-during-extraction-is-a-behavior-change`
  — reviewed dispositions; the close-time trap recipe (un-archive, resume from 7) applies
  at 12.6 if the merge stops after the archive.

---

## Relevant Files

- `packages/provegate/src/cli.ts::runCheck` — the two sweep branches
- `packages/provegate/src/core/gates/review.ts` — sweep entry, select-then-bind
- `packages/provegate/src/core/run/durable.ts::declaredArtifacts` — asterisk exclusion
- `packages/provegate/src/core/gates/prd-ready.ts::lintPrd` — the declaration lint
- `packages/provegate/src/core/gates/manifest.ts::validateManifest` — trimmed justification
- `scripts/verify/verify-script-classes.mjs` + `scripts/verify/script-classes.json` (new)
- `scripts/verify/verify-workflow.mjs::CHECKS` — 11 → 9 (minus trio, plus ledger)
- Deletions: `scripts/verify/verify-{review-artifact,durable-artifacts,gates-wired}.mjs`,
  `scripts/verify/gates-wired-exceptions.json`, the four packed twins, four `PACK_MAP`
  entries, packed bundle 6 → 3
- `gates.manifest.json`, `.github/workflows/ci.yml`, `package.json` (aliases + removals)
- `scripts/verify/pack-drift-ledger.json`, `packages/provegate/test/pack-manifest.json`
- FR-6's six live documents; `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` (READ-ONLY)
- Tests: `packages/provegate/test/consolidation.test.ts` (new), `init.test.ts`,
  `practices-pack.test.ts`, `pack.test.ts`, `changeset-entry.test.ts`
- `.changeset/` (new minor entry); `_brain/learnings/docs-are-a-wiring-surface.md` (new)
- `_docs/reviews/review-026-duplicate-consolidation.md` (new)

### Notes

- Tests in `packages/provegate/test/`, `pnpm --filter provegate test <file>`.
- Zero runtime dependencies; refusing input is always legal, guessing never is.

---

## Tasks

- [x] 0.0 Pre-flight
  - [x] 0.1 Open each Memory Context record; confirm named paths/commands still exist;
        stale findings → Deferrals & Decisions.
  - [x] 0.2 W2: re-run `node packages/provegate/dist/cli.js queue`; PRD-028 shares
        `prd-ready.ts` — if it holds an execution-phase claim, serialize behind it.
  - [x] 0.3 Confirm `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` is committed on the
        base branch and ratified (the owner's Phase-3 Go of 2026-07-28 is the
        ratification; it is recorded on the board). Absent → STOP.
  - [x] 0.4 `gate open PRD-026 --worktree` from a clean base; lease on the MAIN checkout.
  - [x] 0.5 Worktree: `pnpm install`; build `@provegate/design` then `provegate` (dist is
        gitignored); baseline `pnpm --filter provegate test` green; record the count.
  - [x] 0.6 Re-measure the dated facts: root bundle ELEVEN members, packed SIX; CI steps
        at `ci.yml:75-88`; script entries at `package.json:32,34,37`; `.changeset/` holds
        three entries with per-entry discriminators; `_docs/reviews` all match
        `^review-\d{3}-`. Drift → stop-and-record, not silent adjustment.
- [x] 1.0 FR-1 — the review sweep (`gate check --review-artifacts`)
  - [x] 1.1 `cli.ts::runCheck`: the flag beside `--wiring`; one line per invalid file;
        non-zero exit on any.
  - [x] 1.2 Selection: files directly under the configured reviews dir matching
        `^review-.*\.md$` MINUS any basename containing `.template.`; not recursive.
  - [x] 1.3 Binding: derive `expectedId` from `^review-(\d{3})-` under the configured id
        pattern and PASS it to the validator; a selected name yielding no id fails as
        unparseable, never skipped.
  - [x] 1.4 Tests (`consolidation.test.ts`): valid-record-wrong-PRD fails; no-id name
        fails; `review-026-copy.template.md` NOT selected — each beside its passing
        control on the same shape.
- [x] 2.0 FR-2 — the durable-artifacts declaration lint + sweep
  - [x] 2.1 `durable.ts::declaredArtifacts`: adopt the script's asterisk exclusion; keep
        every-span collection; do NOT reintroduce any named-file predicate (the code
        comment already says why).
  - [x] 2.2 `lintPrd`: the declaration rule — ≥1 bullet, each bullet a path-bearing claim
        or explicit `none`; mixing legal; absent/empty/neither fails.
  - [x] 2.3 `cli.ts::runCheck`: `--durable-artifacts` sweep over configured wip PRDs.
  - [x] 2.4 Corpus pass BEFORE the lint lands (strictly stricter): run across every wip
        PRD; a newly failing section is reported to its author, never edited to fit.
  - [x] 2.5 Tests: mixed section passes; absent/empty/neither-bullet fail; asterisk
        excluded; two-path bullet is two claims.
- [x] 3.0 FR-8 — the class ledger (BEFORE the deletion commit, so the bundle gains its
      ninth member in the same change that drops three)
  - [x] 3.1 `scripts/verify/script-classes.json`: eleven entries exactly matching
        ADR-0004's table; `verify-brain`, `verify-deferred`,
        `verify-memory-record-corpus` as `method-pending` (owner, reviewBy 2026-10-01);
        the rest `repo`.
  - [x] 3.2 `scripts/verify/verify-script-classes.mjs` via the shared `targetRoot()`:
        schema (class enum; owner+reviewBy required iff pending; supersededBy required
        iff method; unknown keys and malformed dates fail), unclassified fails, stale
        entry fails, expired reviewBy fails, ADR `## Classification` table diff
        (two columns exactly; unparseable table fails).
  - [x] 3.3 Register `verify:script-classes` in `package.json`; membership in the root
        bundle `CHECKS` (its wiring surface).
  - [x] 3.4 Tests: mutate-one-green-baseline per fixture — unclassified, stale, expired,
        malformed-pending, table-vs-ledger disagreement — each asserting its SPECIFIC
        issue beside the passing baseline pair.
- [x] 4.0 FR-4 — manifest and CI run the CLI (retain-plus-add)
  - [x] 4.1 `package.json`: `check:review-artifacts` and `check:durable-artifacts`
        aliases (`node packages/provegate/dist/cli.js check --…`) — non-verify names, by
        design.
  - [x] 4.2 `gates.manifest.json` phase 4: today's six commands + the two aliases, build
        preceding them.
  - [x] 4.3 `ci.yml`: REPLACE the three alias steps (`:75-88`) with the sweep invocations
        after the build step; removal and addition in one edit.
  - [x] 4.4 Test: every manifest command resolves to an existing `package.json` script;
        no §11 row nor manifest entry names a deleted script.
- [x] 5.0 FR-6 — the documentation sweep (before the deletion commit; the docs stop
      naming what is about to go)
  - [x] 5.1 Rewrite the six live documents to the surviving CLI surface;
        `NEXT_STEPS.md` additionally carries fresh-install guidance + migration pointer.
  - [x] 5.2 The boundary check in `consolidation.test.ts`: walk every tracked `*.md`
        outside the enumerated exclusions (source snapshot; `_prds` STATE dirs but NOT
        `_prds/README.md`; `_readiness/**`; `_tasks/**`; `_docs/reviews|completed|wip|retros`;
        `_brain/**`; `.changeset/**`; STATUS.md historical sections); zero deleted-check
        names.
  - [x] 5.3 Vacuity control: a planted live-shaped mention inside the scan set is
        refused; the STATUS.md exclusion does not swallow the board's live sections.
- [x] 6.0 FR-3 + FR-5 — THE DELETION COMMIT (one commit, both halves)
  - [x] 6.1 Repo: delete the three scripts + `gates-wired-exceptions.json`; remove the
        three `package.json` entries; root bundle `CHECKS` 11 → 9 (trio out, ledger in).
  - [x] 6.2 Pack: delete the three packed twins + packed exceptions file; packed bundle
        `CHECKS` 6 → 3.
  - [x] 6.3 `init.ts::PACK_MAP`: remove the four entries (the drift check's single source
        of pairing).
  - [x] 6.4 `pack-drift-ledger.json`: remove the four pairs (three hash pairs + the
        pack-tracked exceptions entry with its note); reconcile.
  - [x] 6.5 `pack-manifest.json` + `pack.test.ts`: the shipped-file allowlist shrinks by
        four.
  - [x] 6.6 Upgrade fixture (`init.test.ts`, production `initWorkspace` pair over an
        old-shape seeded repo): removed paths in NEITHER list; seeded files
        byte-identical; retained pre-seeded file skipped (control); retained absent file
        created (control); mutation check fails on the created/skipped CONTRACT (readable
        source restored alongside the re-added entry).
  - [x] 6.7 Conversion fixture (`practices-pack.test.ts`): the retained eight-entry
        exceptions data through the four-step rule → three removed names gone, all
        already-wired survivors DROPPED (empty store here), result passes `auditWiring`
        (not merely `loadManifest`); whitespace justification refused
        (`manifest.ts::validateManifest` trimmed contract + fixture).
- [x] 7.0 FR-7 — the release
  - [x] 7.1 `.changeset/` minor entry carrying ALL FIVE migration steps including the
        exceptions conversion; compatibility sentence present.
  - [x] 7.2 `changeset-entry.test.ts`: this entry's own assertion group discriminated by
        its own tokens (the two sweep flags); the distinct-files test covers all three
        qualifying entries.
- [x] 8.0 Migration & Rollback Plan (infra-class explicit parent)
  - [x] 8.1 Prove the both-halves revert: reverting the deletion commit + the FR-4 edit
        restores today's behavior — six-command phase-4 list, both aliases gone, trio
        restored, bundles 11 and 6 again, drift ledger reconciled.
  - [x] 8.2 Assert the adopter no-op property as documented: neither migrated nor
        unmigrated adopters are touched by a rollback (prose + the additive-only fixture
        already proves the mechanism).
  - [x] 8.3 Confirm the ledger reverts WITH the consolidation (no impossible
        method/method-pending state can be constructed post-revert).
- [x] 9.0 Phase 5 — Testing (every §11 row, no additions, no omissions)
  - [x] 9.1 The twelve §11 rows exactly as written (five consolidation.test.ts rows, the
        two repo sweeps, init/pack/practices-pack/changeset rows, verify:script-classes
        live row).
  - [x] 9.2 Floor: `pnpm check-types`, `pnpm lint`, `pnpm test`, `pnpm build`,
        `pnpm verify:workflow` (nine-member bundle green).
  - [x] 9.3 Mutation checks: revert the asterisk exclusion, the template exclusion, and
        one ledger schema rule in isolation — each kills exactly its paired fixture.
  - [x] 9.4 Update the Verification Ledger with evidence per row.
- [ ] 10.0 Phase 6 — Final Auditing
  - [ ] 10.1 Independent review (different model/session; never this one): sweep-first
        brief over the rules that changed; spec-vs-code walk of FR-1/2/8 predicates and
        the deletion inventory; `Critical: 0` required.
  - [ ] 10.2 Write `_docs/reviews/review-026-duplicate-consolidation.md` (Quorum row
        required).
  - [ ] 10.3 Remediate; re-run 9.x after every fix until Critical: 0.
- [ ] 11.0 Phase 7 — Learning & close
  - [ ] 11.1 Write `_brain/learnings/docs-are-a-wiring-surface.md` + INDEX pointer
        (hook ≤ 120 chars).
  - [ ] 11.2 Durable Artifacts vs merge diff; Memory Outputs vs the PRD on main (no
        weakening).
  - [ ] 11.3 `_brain` capture protocol for anything non-derivable hit in flight.
  - [ ] 11.4 Summary `_docs/wip/summary-026-duplicate-consolidation.md`; Status headers;
        `gate status`.
  - [ ] 11.5 Operator acceptance: STOP and hand to the owner (transcription only on
        explicit in-session direction, ADR-0003 rules).
  - [ ] 11.6 `gate run PRD-026` from the worktree; if the merge stops after the archive,
        apply `gate-run-resume-after-archive` (un-archive, resume from 7). Merge to
        local main; board close. Push stays the owner's.

---

## Verification Ledger

| Gate               | Command / Check                                             | Scope | Result  | Evidence | Notes |
| ------------------ | ----------------------------------------------------------- | ----- | ------- | -------- | ----- |
| FR-1               | `pnpm --filter provegate test test/consolidation.test.ts`   | pkg   | passed  | 22/22; live reviews dir validates | review sweep: select-then-bind, wrong-PRD fails |
| FR-2               | `pnpm --filter provegate test test/consolidation.test.ts`   | pkg   | passed  | live wip corpus green under the lint | declaration lint + reconciled parser |
| FR-3               | `pnpm verify:workflow`                                      | repo  | passed  | PASS, 9 members | nine-member bundle green |
| FR-4               | `pnpm --filter provegate test test/consolidation.test.ts`   | pkg   | passed  | resolution test green; deleted names absent | every manifest command resolves |
| FR-5               | `pnpm verify:pack-drift`                                    | repo  | passed  | 45 pairs PASS | pairs removed both sides |
| FR-5               | `pnpm --filter provegate test test/init.test.ts`            | pkg   | passed  | 46/46 incl. both controls + sensitivity check | upgrade fixture through the executor |
| FR-5               | `pnpm --filter provegate test test/pack.test.ts`            | pkg   | passed  | 95-row allowlist matches the tarball | allowlist shrank with the pack |
| FR-5               | `pnpm --filter provegate test test/practices-pack.test.ts`  | pkg   | passed  | 25/25; three-step conversion rejected by the audit, four-step accepted | packed bundle three; conversion audit-accepted |
| FR-6               | `pnpm --filter provegate test test/consolidation.test.ts`   | pkg   | passed  | real tree clean; planted mention refused | boundary + vacuity control |
| FR-7               | `pnpm --filter provegate test test/changeset-entry.test.ts` | pkg   | passed  | 9/9; three entries by their own discriminators | five steps; discriminated selector |
| FR-8               | `pnpm --filter provegate test test/consolidation.test.ts`   | pkg   | passed  | 7 mutations, each its specific issue | mutate-one-baseline fixtures via targetRoot |
| FR-8               | `pnpm verify:script-classes`                                | repo  | passed  | 11 entries, 11 on disk, PASS | live ledger+record pair; trio in neither store |
| types              | `pnpm check-types`                                          | repo  | passed  | 0 errors |       |
| lint               | `pnpm lint`                                                 | repo  | passed  | 0 errors |       |
| test               | `pnpm test`                                                 | repo  | passed  | 53 files / 1211 tests (baseline 1183 + 28) | fixture updates recorded in Deferrals |
| build              | `pnpm build`                                                | repo  | passed  | clean |       |
| bundle             | `pnpm verify:workflow`                                      | repo  | passed  | PASS | the remaining bundle green |
| independent-review | `_docs/reviews/review-026-duplicate-consolidation.md`       | repo  | pending |          | verdict pass, critical = 0 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

> Short single-line entries written **during Phase 4**. Format: `- <task#> — <decision>;
> <≤1 sentence rationale>`. Never inline on sub-task lines.

- Phase 3 — the protocol's Phase A "type Go" stop was not re-asked; the owner
  commissioned this phase in-session on 2026-07-28 ("PRD-026 Phase-3 Go"), which is also
  ADR-0004's ratification. Recorded per the autonomous-execution exception.
- 2.2 — the declaration lint keeps the retired script's documented placeholder rule
  (values with `{`, `}`, `*` ignored until filled in); without it `gate new`'s own
  template fails the lint it ships beside — found by the revalidate fixture, which lints
  the shipped template PRD.
- 2.x — fixture PRDs across four test files gained the Durable Artifacts section: the
  lint is FR-mandated strictness and the fixtures were under production shape
  (`fixture-must-reach-production-shape`), not the port changing behavior.
- 9.3 — the first asterisk fixture was VACUOUS (green under the mutation too): the lint
  verdict cannot observe the exclusion, only `declaredArtifacts` extraction can —
  `assert-absent-needs-an-independent-cause`, caught by running the mutation check
  against the fixture instead of trusting it. Rebound to the extraction.
- 5.2 — the FR-6 boundary test reads repository-root markdown outside the package's
  turbo inputs (AGENT_BOOTSTRAP.md, _docs/**, STATUS.md): recorded for PRD-036's input
  census, the same disposition its round-3 reviewer accepted for the bundle fixture; CI
  checks out fresh.
- 6.x — `verify:script-classes` is intentionally RED between the replacements commit and
  the deletion commit (the trio exists, unclassified) and green from the deletion commit
  on — born-agreeing observed live, in the order the plan sequenced.

---

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

---

## Blockers / Open Questions

- (none)

---

## Operator Handoff

> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`}.

| Task | Category  | Owner | Required Check | Status | Notes |
| ---- | --------- | ----- | -------------- | ------ | ----- |
| 11.5 | manual-qa | owner | Owner-signed acceptance entry in `_state/acceptances.json` for the operator-gated close (decision the owner's; transcription per ADR-0003 if directed in-session) | pending | the merge gate refuses without it |
