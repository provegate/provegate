# Tasks: Open Questions Grammar — Implement the Rule the Method Already States

> **PRD**: [prd-028-open-questions-grammar.md](../../_prds/wip/prd-028-open-questions-grammar.md)
> **Readiness**: [readiness-028-open-questions-grammar.md](../../_readiness/wip/readiness-028-open-questions-grammar.md)
> **Status**: In Progress
> **Readiness Score**: 8.70/10 PASS (iteration 5, Codex; traceability cap clear)
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

---

## Memory Context

The slugs the PRD selected as Memory Inputs, carried here so implementation does not
re-derive them. Each gets a re-open task (0.1): a record is evidence only while true.

- `narrow-the-grammar-not-the-parser` — the whole design: closed set of raw lines, never
  parser growth (tasks 1.x, 2.x).
- `surface-set-without-its-predicate` — the deferral surface is worthless without the
  resolution predicate; the sixteen-row deny matrix proves it reads (1.4, 1.5).
- `lint-must-name-the-span-it-judges` — one heading-identified section, every raw line,
  exactly that span (2.x).
- `false-green-on-missing-file` — a missing target fails; an existing-but-wrong target
  (self, completed, alias, stub) fails too (1.4).
- `assert-absent-needs-an-independent-cause` — every deny fixture pairs with a positive
  control on the same shape (1.5).
- `known-red-ledger-must-expire` — no allowlisting a failing corpus file, ever (3.2).
- `fixture-must-reach-production-shape` — five-argument lint calls everywhere (3.1).
- `strictness-added-during-extraction-is-a-behavior-change` — the two invalidated
  `prd-ready.test.ts` fixtures are declared, deliberate lint changes (4.1).
- `a-rule-corrected-survives-where-it-is-restated` — sweep by grep, never by memory; the
  Phase 6 reviewer is briefed to sweep (7.2).
- `turbo-cache-masks-out-of-input-reads` — the `_brain` store joins the cache key (3.3).
- `evidence-pattern-satisfied-by-the-template` — the template's example forms must not
  satisfy any deny fixture (4.2).
- `runner-sentinel-blocks-cli-spawning-tests` — whole-suite §11 rows go through turbo
  (already encoded in §11; keep it that way).

---

## Relevant Files

- `packages/provegate/src/core/gates/prd-ready.ts` — closed exempt forms with canonical
  resolution (`lintPrd`), raw-line grammar, §9 + FR-block cardinality (`frBlocks`)
- `packages/provegate/test/open-questions.test.ts` — **new**: sixteen-row deny matrix,
  grammar fixtures, corpus pass, four-input turbo assertion
- `packages/provegate/test/prd-ready.test.ts` — two declared fixture invalidations
- `packages/provegate/templates/prd-template.md` — §9 guidance before the heading (FR-4)
- `packages/provegate/test/content-templates.test.ts` — guidance + instantiated-lints-green
- `turbo.json` — `$TURBO_ROOT$/_brain/**` joins the `test` task inputs (FR-3)
- `scripts/verify/turbo-inputs-exceptions.json` — reason extends to name the store
- `_brain/learnings/exemption-marker-needs-no-prose.md` — **new** at Phase 7 + its
  `_brain/INDEX.md` pointer
- `_docs/reviews/review-028-open-questions-grammar.md` — Phase 6 artifact (Quorum row)

### Notes

- Serialization (re-run `gate queue` at claim): **PRD-026** shares `prd-ready.ts` and
  `content-templates.test.ts`; **PRD-036** shares `turbo.json` and the exceptions file.
- `packages/provegate` takes zero runtime dependencies — hard rule.

---

## FR-3 Phase-3 Discovery Record (2026-07-28, DISCOVERY ONLY — never the oracle)

Measured by extracting each wip §9 body and judging every raw line against the closed
grammar (blank / exact `- (none)` / exact Deferred form / one trailing `---`). The
runtime oracle is **zero failures**; this record only names today's prerequisites.

| PRD | Verdict | Offending shape | Owner |
| --- | ------- | --------------- | ----- |
| PRD-026 | FAILS | `(none)` with a two-line tail, then an HTML comment block | its author |
| PRD-027 | FAILS | checkbox form (`- [ ] none.`) with a three-line wrapped tail | its author |
| PRD-028 | conforms | — | — |
| PRD-031 | conforms | — | — |
| PRD-032 | conforms | — | — |
| PRD-034 | FAILS | `(none — …)` parenthetical wrapped across two lines | its author |
| PRD-036 | FAILS | `(none)` with a three-line tail | its author |

**Stop rule:** if any of the four still fails when Phase 4 starts, stop and hand back to
that PRD's author — report, never edit, never allowlist.

---

## Tasks

- [x] 0.0 Pre-flight
  - [x] 0.1 Open each Memory Context record; confirm the paths and commands it names
        still exist; record staleness in **Deferrals & Decisions**.
  - [x] 0.2 Claim: STATUS.md row, lock lease, `gate open PRD-028 --worktree`; re-run
        `gate queue` — stop on any active overlap with `prd-ready.ts`,
        `content-templates.test.ts` (PRD-026) or `turbo.json`/exceptions (PRD-036).
  - [x] 0.3 Baseline: `pnpm check-types && pnpm lint && pnpm test && pnpm build` green;
        `pnpm install` in the worktree; build `dist` in-tree.
  - [x] 0.4 Re-run the FR-3 discovery (the script shape above) and confirm the four
        prerequisite PRDs now conform; if not — stop rule.
- [x] 1.0 FR-1 — closed exempt forms with canonical resolution (`lintPrd`)
  - [x] 1.1 The two exact line forms; no tolerance normalization anywhere.
  - [x] 1.2 Resolution rules 1–5: configured width + prefix (`idPattern`), containment
        under the configured artifact root, `parseArtifactName` acceptance with number
        equality, existence, configured `stateRoles.wip`/`stateRoles.deferred` role and
        number-distinctness via the fifth argument (W1: configured names and
        "unfinished" wording are authoritative — ignore any stale "active" restatement).
  - [x] 1.3 Resolution rules 6–8 in fail-closed order (W3): `lstat`-regular first (any
        symlink refused), then realpath containment (path-boundary-safe comparison,
        never a string prefix), then realpath distinctness against the declaring PRD's
        artifact, then H1 recognition — through the scanner's real heading semantics,
        never a raw `^#` match (W2).
  - [x] 1.4 Fail-closed fifth argument: a Deferred entry with no declaring number
        reports unverifiable.
  - [x] 1.5 The sixteen-row deny matrix in `open-questions.test.ts` — one per history
        row (nine) plus the seven resolution rejections — each paired with its positive
        control (a distinct fixture item in a wip-role directory); symlink fixtures
        created at test runtime, never committed as repo symlinks.
- [x] 2.0 FR-2 — raw-line grammar + cardinality
  - [x] 2.1 Locate the one §9 section via `scanDocument` + `sectionBounds`; judge RAW
        source lines against the closed set; one optional terminal `---`; everything
        else fails by name.
  - [x] 2.2 §9 cardinality: zero missing, two-plus ambiguous; heading equals canonical
        name after optional ordinal; `## Resolved Open Questions` is not the section.
  - [x] 2.3 `frBlocks` cardinality the same way.
  - [x] 2.4 Fixtures: paragraph section, fenced, raw-HTML, comment, checkbox, second
        `---`, duplicate/missing sections, longer heading, duplicate FR sections.
- [x] 3.0 FR-3 — corpus pass + turbo store input
  - [x] 3.1 Corpus test: enumerate the configured wip directory, five-argument
        production call per file (re-read the `cli.ts` call site first).
  - [x] 3.2 Oracle: **zero closed-grammar §9 failures**, offenders by filename; never
        compared to the discovery record; no allowlist.
  - [x] 3.3 `turbo.json`: `$TURBO_ROOT$/_brain/**` joins the `test` inputs; exceptions
        reason extended to name the store; both edits one commit; re-run
        `pnpm verify:turbo-inputs` + `pnpm verify:workflow` immediately.
  - [x] 3.4 The four-input presence assertion in the corpus test.
- [x] 4.0 FR-4 — template guidance, outside the judged body
  - [x] 4.1 `prd-ready.test.ts`: update the two declared fixtures (`(none — resolved)`
        and the PRD-002 self-lint expectation) — deliberate, declared lint changes;
        nothing else in that file moves.
  - [x] 4.2 Template: the two exact forms immediately **before** the §9 heading; shipped
        §9 body exactly `- (none)`; round-trip asserts the guidance text AND that a
        template-instantiated document lints green; the template's example forms satisfy
        no deny fixture.
- [x] 5.0 Migration & Rollback verification (infra parent)
  - [x] 5.1 Rollback: revert matcher + grammar + cardinality + template line, delete the
        new test file, revert the two fixture edits — confirm nothing published moves.
  - [x] 5.2 Corpus asymmetry check: the four repaired §9s still pass the old substring
        rule (rollback strands nothing).
  - [x] 5.3 Turbo two-way revert order per `verify-turbo-inputs.mjs` both directions.
- [x] 6.0 Phase 5 — Testing
  - [x] 6.1 Every §11 command into the Verification Ledger with evidence; floor green
        (`check-types`, `lint`, `test`, `build`, `verify:workflow`).
- [ ] 7.0 Phase 6 — Final Auditing
  - [ ] 7.1 Independent adversarial review (different model/session):
        `_docs/reviews/review-028-open-questions-grammar.md`, Quorum row, `pass`
        with `Critical: 0`.
  - [ ] 7.2 W4 inspection: all sixteen deny fixtures + positive controls —
        symlink-to-self, symlink-to-other, absent fifth argument, H1-less stub, and a
        custom `stateRoles` configuration case; vacuity check by mutation (widen the
        resolver, watch the matrix go red, revert).
  - [ ] 7.3 Restatement sweep by grep (counts nine/sixteen, "unfinished", configured
        role names) — sweep, don't hunt.
- [ ] 8.0 Phase 7 — Learning & close
  - [ ] 8.1 Write `_brain/learnings/exemption-marker-needs-no-prose.md` + its
        `_brain/INDEX.md` pointer line.
  - [ ] 8.2 Durable artifacts in the merge diff (`verify:durable-artifacts`); Memory
        Outputs vs the PRD as committed on main.
  - [ ] 8.3 Summary artifact; archive; board close; `gate status`. Push stays with the
        owner.

---

## Verification Ledger

| Gate               | Command / Check                                               | Scope | Result  | Evidence | Notes |
| ------------------ | ------------------------------------------------------------- | ----- | ------- | -------- | ----- |
| FR-1               | `pnpm --filter provegate test test/open-questions.test.ts`     | pkg   | passed  | 31/31, 2026-07-28 | sixteen-row deny matrix + positive controls |
| FR-2               | `pnpm --filter provegate test test/open-questions.test.ts`     | pkg   | passed  | same run as FR-1 | raw-line grammar + cardinality fixtures |
| FR-3               | `pnpm --filter provegate test test/open-questions.test.ts`     | pkg   | passed  | corpus 9 wip files, 0 offenders | corpus zero-failure oracle + four-input assertion |
| FR-3               | `pnpm test`                                                    | repo  | passed  | 1248/1248 (54 files, +32) | whole suite via turbo (runner-sentinel rule) |
| FR-4               | `pnpm --filter provegate test test/content-templates.test.ts`  | pkg   | passed  | incl. new FR-4 placement test | guidance placement + instantiated-lints-green |
| types              | `pnpm check-types`                                             | repo  | passed  | 2026-07-28 |       |
| lint               | `pnpm lint`                                                    | repo  | passed  | 2026-07-28 |       |
| test               | `pnpm test`                                                    | repo  | passed  | 2026-07-28 |       |
| build              | `pnpm build`                                                   | repo  | passed  | 2026-07-28 |       |
| workflow           | `pnpm verify:workflow`                                         | repo  | passed  | 2026-07-28 | includes verify:turbo-inputs |
| independent-review | `_docs/reviews/review-028-open-questions-grammar.md`           | repo  | pending |          | verdict pass, critical = 0 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

> Format: `- <task#> — <decision>; <≤1 sentence rationale>`.

- Phase 3 — the Phase A→B approval gate was collapsed into the owner's single "Go"
  (2026-07-28), per the protocol's autonomous-execution clause, recorded here as that
  clause requires. The FR-3 discovery ran during task generation; its record is above,
  discovery-only.
- 0.4 — the stop rule FIRED: 027/034/036 still failed and 039 (born after the record)
  failed too. The owner directed in-session conformance edits on main instead of a full
  hand-back (commit `48d5503`); the deleted prose was rationale already recorded
  elsewhere. A new owner decision superseding this PRD's report-never-edit rule for
  those four documents, recorded here as ADR-0003-style transcription discipline asks.
- 0.1 — all 12 Memory Context records exist and their named paths/commands were
  re-confirmed; no staleness found.
- 1.5/4.1 — two consequential test edits beyond the two declared fixture invalidations:
  the `openQ` probe in `prd-ready.test.ts` rides on fixture 1's replaced string (its
  source string and expected message moved with the rule), and the lint-green fixtures
  in `lint-parsers.test.ts` / `value-score.test.ts` gained a `- (none)` §9 because the
  new cardinality rule makes a §9-less document fail — fixtures reaching the new
  production shape, not silent scope growth.
- 2.x — `rawSection` recovers the raw-line slice by reference identity against the
  scanner's section body, so the exported `sectionBounds` signature stays untouched
  (the PRD's no-exported-signature-change promise).
- 5.1 — rollback rehearsed by inspection: matcher + grammar + cardinality + template
  line revert cleanly, the new test file deletes, the two fixture edits revert; no
  exported signature, config key, flag, or state shape moved.
- 5.2 — corpus asymmetry verified live before Phase 4: after the four §9 repairs on
  main, `gate check` (OLD substring lint) passed all four — the closed form is strictly
  narrower, a rollback strands nothing.
- 5.3 — turbo two-way revert holds by construction: the `_brain` input glob and the
  extended exception reason land in one commit, and `pnpm verify:turbo-inputs` passed
  after the forward edit; reverting the pair restores the exact pre-change state.

---

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
| 2026-07-28 | 0.1–0.4 | claim + worktree + baseline green; stop rule fired → owner-directed §9 conformance on main (`48d5503`); re-measure: 9/9 wip conform |
| 2026-07-28 | 1.x–2.x | closed grammar + canonical resolution in `prd-ready.ts`; §9 and FR cardinality; 16-row deny matrix + controls (31 tests) |
| 2026-07-28 | 3.x | corpus oracle zero offenders (9 wip files); `_brain/**` joined turbo test inputs; four-input assertion |
| 2026-07-28 | 4.x | two declared fixture invalidations + template guidance before the heading; instantiated template lints green |
| 2026-07-28 | 5.x–6.x | rollback/asymmetry/turbo-revert recorded; floor green: 1248/1248, types/lint/build/workflow PASS |

---

## Blockers / Open Questions

- (resolved 2026-07-28) Four wip PRDs failed the closed grammar at Phase-4 start
  (027/034/036/039 — 026 had landed; 039 was born after the record). Owner-directed
  conformance edits on main (`48d5503`); re-measured: the whole wip corpus conforms.

---

## Operator Handoff

> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`}.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
| 8.3  | manual-qa | owner | operator-gated close acceptance + `git push` | pending | push is always the human's call |
