# Tasks: Open Questions Grammar — Implement the Rule the Method Already States

> **PRD**: [prd-028-open-questions-grammar.md](../../_prds/wip/prd-028-open-questions-grammar.md)
> **Readiness**: [readiness-028-open-questions-grammar.md](../../_readiness/wip/readiness-028-open-questions-grammar.md)
> **Status**: Not Started
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

- [ ] 0.0 Pre-flight
  - [ ] 0.1 Open each Memory Context record; confirm the paths and commands it names
        still exist; record staleness in **Deferrals & Decisions**.
  - [ ] 0.2 Claim: STATUS.md row, lock lease, `gate open PRD-028 --worktree`; re-run
        `gate queue` — stop on any active overlap with `prd-ready.ts`,
        `content-templates.test.ts` (PRD-026) or `turbo.json`/exceptions (PRD-036).
  - [ ] 0.3 Baseline: `pnpm check-types && pnpm lint && pnpm test && pnpm build` green;
        `pnpm install` in the worktree; build `dist` in-tree.
  - [ ] 0.4 Re-run the FR-3 discovery (the script shape above) and confirm the four
        prerequisite PRDs now conform; if not — stop rule.
- [ ] 1.0 FR-1 — closed exempt forms with canonical resolution (`lintPrd`)
  - [ ] 1.1 The two exact line forms; no tolerance normalization anywhere.
  - [ ] 1.2 Resolution rules 1–5: configured width + prefix (`idPattern`), containment
        under the configured artifact root, `parseArtifactName` acceptance with number
        equality, existence, configured `stateRoles.wip`/`stateRoles.deferred` role and
        number-distinctness via the fifth argument (W1: configured names and
        "unfinished" wording are authoritative — ignore any stale "active" restatement).
  - [ ] 1.3 Resolution rules 6–8 in fail-closed order (W3): `lstat`-regular first (any
        symlink refused), then realpath containment (path-boundary-safe comparison,
        never a string prefix), then realpath distinctness against the declaring PRD's
        artifact, then H1 recognition — through the scanner's real heading semantics,
        never a raw `^#` match (W2).
  - [ ] 1.4 Fail-closed fifth argument: a Deferred entry with no declaring number
        reports unverifiable.
  - [ ] 1.5 The sixteen-row deny matrix in `open-questions.test.ts` — one per history
        row (nine) plus the seven resolution rejections — each paired with its positive
        control (a distinct fixture item in a wip-role directory); symlink fixtures
        created at test runtime, never committed as repo symlinks.
- [ ] 2.0 FR-2 — raw-line grammar + cardinality
  - [ ] 2.1 Locate the one §9 section via `scanDocument` + `sectionBounds`; judge RAW
        source lines against the closed set; one optional terminal `---`; everything
        else fails by name.
  - [ ] 2.2 §9 cardinality: zero missing, two-plus ambiguous; heading equals canonical
        name after optional ordinal; `## Resolved Open Questions` is not the section.
  - [ ] 2.3 `frBlocks` cardinality the same way.
  - [ ] 2.4 Fixtures: paragraph section, fenced, raw-HTML, comment, checkbox, second
        `---`, duplicate/missing sections, longer heading, duplicate FR sections.
- [ ] 3.0 FR-3 — corpus pass + turbo store input
  - [ ] 3.1 Corpus test: enumerate the configured wip directory, five-argument
        production call per file (re-read the `cli.ts` call site first).
  - [ ] 3.2 Oracle: **zero closed-grammar §9 failures**, offenders by filename; never
        compared to the discovery record; no allowlist.
  - [ ] 3.3 `turbo.json`: `$TURBO_ROOT$/_brain/**` joins the `test` inputs; exceptions
        reason extended to name the store; both edits one commit; re-run
        `pnpm verify:turbo-inputs` + `pnpm verify:workflow` immediately.
  - [ ] 3.4 The four-input presence assertion in the corpus test.
- [ ] 4.0 FR-4 — template guidance, outside the judged body
  - [ ] 4.1 `prd-ready.test.ts`: update the two declared fixtures (`(none — resolved)`
        and the PRD-002 self-lint expectation) — deliberate, declared lint changes;
        nothing else in that file moves.
  - [ ] 4.2 Template: the two exact forms immediately **before** the §9 heading; shipped
        §9 body exactly `- (none)`; round-trip asserts the guidance text AND that a
        template-instantiated document lints green; the template's example forms satisfy
        no deny fixture.
- [ ] 5.0 Migration & Rollback verification (infra parent)
  - [ ] 5.1 Rollback: revert matcher + grammar + cardinality + template line, delete the
        new test file, revert the two fixture edits — confirm nothing published moves.
  - [ ] 5.2 Corpus asymmetry check: the four repaired §9s still pass the old substring
        rule (rollback strands nothing).
  - [ ] 5.3 Turbo two-way revert order per `verify-turbo-inputs.mjs` both directions.
- [ ] 6.0 Phase 5 — Testing
  - [ ] 6.1 Every §11 command into the Verification Ledger with evidence; floor green
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
| FR-1               | `pnpm --filter provegate test test/open-questions.test.ts`     | pkg   | pending |          | sixteen-row deny matrix + positive controls |
| FR-2               | `pnpm --filter provegate test test/open-questions.test.ts`     | pkg   | pending |          | raw-line grammar + cardinality fixtures |
| FR-3               | `pnpm --filter provegate test test/open-questions.test.ts`     | pkg   | pending |          | corpus zero-failure oracle + four-input assertion |
| FR-3               | `pnpm test`                                                    | repo  | pending |          | whole suite via turbo (runner-sentinel rule) |
| FR-4               | `pnpm --filter provegate test test/content-templates.test.ts`  | pkg   | pending |          | guidance placement + instantiated-lints-green |
| types              | `pnpm check-types`                                             | repo  | pending |          |       |
| lint               | `pnpm lint`                                                    | repo  | pending |          |       |
| test               | `pnpm test`                                                    | repo  | pending |          |       |
| build              | `pnpm build`                                                   | repo  | pending |          |       |
| workflow           | `pnpm verify:workflow`                                         | repo  | pending |          | includes verify:turbo-inputs |
| independent-review | `_docs/reviews/review-028-open-questions-grammar.md`           | repo  | pending |          | verdict pass, critical = 0 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

> Format: `- <task#> — <decision>; <≤1 sentence rationale>`.

- Phase 3 — the Phase A→B approval gate was collapsed into the owner's single "Go"
  (2026-07-28), per the protocol's autonomous-execution clause, recorded here as that
  clause requires. The FR-3 discovery ran during task generation; its record is above,
  discovery-only.

---

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

---

## Blockers / Open Questions

- Four wip PRDs (026, 027, 034, 036) fail the closed grammar today — Phase-4
  prerequisites owned by their authors (see the discovery record's stop rule).

---

## Operator Handoff

> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`}.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
| 8.3  | manual-qa | owner | operator-gated close acceptance + `git push` | pending | push is always the human's call |
