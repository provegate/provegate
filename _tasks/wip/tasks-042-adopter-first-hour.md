# Tasks: The Adopter's First Hour

> **PRD**: [prd-042-adopter-first-hour.md](../../_prds/wip/prd-042-adopter-first-hour.md)
> **Readiness**: [readiness-042-adopter-first-hour.md](../../_readiness/wip/readiness-042-adopter-first-hour.md)
> **Status**: Not Started
> **Readiness Score**: 8.1/10 (PASS, iteration 6)
> **Model Tier (Execution)**: high
> **Model Tier (Audit)**: high
> **Created**: 2026-08-07
> **Updated**: 2026-08-07

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- Phase 4 agents hold a valid lock lease before editing implementation files or this task file.

---

## Memory Context

The slugs PRD-042 selected as Memory Inputs, carried here so implementation does not re-derive
them. Each is re-opened in task 0.0: a record is evidence only while it is true.

- `quickstart-is-a-fixture` — both quickstart copies move in one commit; the parity check
  executes the tagged region.
- `derive-the-requirement-from-the-consumer` — the token set comes from what config can answer.
- `shipped-content-needs-a-delivery-gate` — assertions run against the instantiated artifact and
  the delivered CLI, never the template source.
- `metadata-declares-what-it-cannot-provide` — the memory-on failure is what stops FR-3 becoming
  an escape hatch.
- `assert-absent-needs-an-independent-cause` — FR-3's absence fixture must have the sections in
  its template.
- `evidence-pattern-satisfied-by-the-template` — an instantiated placeholder must never satisfy
  the Phase-6 gate.
- `strictness-added-during-extraction-is-a-behavior-change` — FR-5 loosens a detector; the four
  deny tests pin what must still refuse.
- `a-rule-corrected-survives-where-it-is-restated` — the token set is restated in §1, §2, §4, §11.

---

## Readiness Watch Items (bind Phases 3–6)

- **W1** — FR-1 needs a closed artifact-substitution table: which tokens the tasks and review
  templates receive, and which are left to the author (readiness MP-1).
- **W2** — `cli.ts::usage` belongs to FR-6, not FR-1 (readiness MP-12).
- **W3** — §6 and §11 restate three refusals where FR-1 defines eight (readiness MP-13).

---

## Relevant Files

| File | Why it changes |
| ---- | -------------- |
| `packages/provegate/src/core/run/new.ts` | artifact instantiation, the token pass, memory-section omission, the anchor alternation |
| `packages/provegate/src/cli.ts` | `runNew` argument surface, `usage` help line |
| `packages/provegate/src/core/run/chain.ts` | the Phase-6 stop message (FR-4) |
| `packages/provegate/QUICKSTART.md` | manifest recipe order, the new artifact commands |
| `apps/docs/content/docs/quickstart.mdx` | the parity twin — moves in the same commit |
| `scripts/verify/verify-quickstart-parity.mjs` | the structural order assertion |
| `packages/provegate/practices/NEXT_STEPS.md` | duplicate `## 7` heading |
| `packages/provegate/test/new.test.ts` | FR-1, FR-2, FR-3, FR-5 |
| `packages/provegate/test/chain.test.ts` | FR-4 and the unedited-template regression |
| `packages/provegate/test/prd-ready.test.ts` | FR-3's memory-on failure |
| `packages/provegate/test/content-hygiene.test.ts` | NEXT_STEPS heading assertion |
| `packages/provegate/test/cli.test.ts` | help-line content assertion |
| `_prds/wip/prd-042-adopter-first-hour.md` | W1–W3 (task 1.0) |
| `_docs/reviews/review-042-adopter-first-hour.md` | Phase 6 artifact |
| `.changeset/` | release note for the new modes |

### Notes

- Tests live beside the behaviour they cover; the four FR-5 deny tests and the FR-3 memory-on
  failure are written INSIDE their implementing parent, not deferred to the Phase-5 parent.
- `packages/provegate` takes no runtime dependency, ever. Everything here is Node built-ins.

---

## Tasks

- [ ] 0.0 Pre-flight
  - [ ] 0.1 `gate open PRD-042` — claim the declared Conflict Surface; confirm no overlap with
        PRD-040/041/043, which claim `markdown.ts`, `acceptance.ts`, `archive.ts` and
        `query.ts` (this item claims none of them).
  - [ ] 0.2 Open each Memory Context record and confirm the paths and commands it names still
        exist; record any stale finding in **Deferrals & Decisions**.
  - [ ] 0.3 Run the floor once on a clean tree to establish the baseline: `pnpm check-types`,
        `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm smoke:adopter`.

- [ ] 1.0 Close the readiness watch items in the PRD (before any code)
  - [ ] 1.1 **W1** — add the closed artifact-substitution table to FR-1: which of the seven
        tokens the tasks and review templates receive, and which are left to the author.
  - [ ] 1.2 **W2** — move `packages/provegate/src/cli.ts::usage` out of FR-1's Targets and into
        FR-6's, with `packages/provegate/test/cli.test.ts`.
  - [ ] 1.3 **W3** — restate all eight FR-1 refusal categories and their exact `new.test.ts`
        titles in §6 and §11; verify by counting rows, not by reading.
  - [ ] 1.4 `node packages/provegate/dist/cli.js check PRD-042` green after the edits.

- [ ] 2.0 CLI surface: three productions, mutual exclusion, eight refusals
  - [ ] 2.1 `cli.ts::runNew` — parse the three productions; `--tasks`/`--review` take an id.
  - [ ] 2.2 Refusals, each with its own message naming what was ambiguous: both artifact flags;
        positional beside an artifact flag; `--class`/`--template` beside one; repeated flag;
        flag without an id; neither slug nor flag.
  - [ ] 2.3 `new.test.ts` — the six argument refusals, by the titles §11 names.
  - [ ] 2.4 Confirm the legacy positional production is byte-identical in behaviour: same output
        path, same exit codes, same drift refusals.

- [ ] 3.0 Artifact instantiation (FR-1)
  - [ ] 3.1 `new.ts` — resolve the id against PRD artifacts in the configured wip role ONLY;
        take number and slug from the artifact BASENAME, never the heading.
  - [ ] 3.2 Refusals for zero and two matches, naming the id and the candidates respectively.
  - [ ] 3.3 Destination paths from config
        (`dirs.artifacts.tasks.{dir,prefix}`, `dirs.stateRoles.wip`, `dirs.reviewsDir`).
  - [ ] 3.4 `wx`-atomic writes with the same containment check `gate init` uses; an existing
        destination is reported and left byte-untouched.
  - [ ] 3.5 `new.test.ts` — the path shapes, the two id refusals, the re-run byte-identity.
  - [ ] 3.6 `chain.test.ts` — `"an unedited instantiated tasks template fails the Phase-6 gate"`:
        instantiate, run the real chain, require a FAILURE. This is the risk-class test for this
        parent and may never be `skipped`.

- [ ] 4.0 Token substitution pass (FR-2)
  - [ ] 4.1 `new.ts` — a pass that runs AFTER the existing anchored substitutions and changes
        none of them; the seven-row table is the closed set.
  - [ ] 4.2 Precedence: `prompts.values` wins for `CMD_TEST_SCOPED` and `DOCS_ROOT`; the rest are
        config-only; an absent or empty source is not a substitution.
  - [ ] 4.3 Unresolved tokens: one `[new] unresolved tokens: …` line, sorted, deduplicated, on
        stdout; exit code stays 0.
  - [ ] 4.4 `new.test.ts` — all seven substituted; empty value keeps its token; the report line's
        shape; `{{ID_PREFIX}}` and the other anchors provably untouched.

- [ ] 5.0 Memory-section omission (FR-3)
  - [ ] 5.1 `new.ts` — when `memory.enabled` is false, omit `## Memory Inputs` and
        `## Memory Outputs` from heading through the last line before the next `## ` at column
        zero, including that section's trailing `---`.
  - [ ] 5.2 `new.test.ts` — the fixture template HAS both sections and the config disables
        memory, so absence has an independent cause.
  - [ ] 5.3 `prd-ready.test.ts` — the same document passes with memory off and FAILS with memory
        on. Risk-class test for this parent: it is what stops the omission becoming an escape
        hatch, and Phase 6 may not accept it as `skipped`.

- [ ] 6.0 Phase-6 diagnostics (FR-4)
  - [ ] 6.1 `chain.ts::buildGateChain` — the `no tasks file` arm names the configured expected
        path and the required `independent-review` row columns (`Gate`, `Command / Check` naming
        the review artifact path, `Result` = `passed`).
  - [ ] 6.2 `chain.test.ts` — assert the message contains the resolved path, not a template.

- [ ] 7.0 Anchor alternation for rendered templates (FR-5)
  - [ ] 7.1 `new.ts::substituteAnchor` — the id anchor becomes a two-member alternation: literal
        `{{ID_PREFIX}}`, or exactly `escapeRegExp(config.idPattern.prefix)`. No wildcards.
  - [ ] 7.2 `new.test.ts` — a rendered template instantiates.
  - [ ] 7.3 `new.test.ts` — four deny tests: foreign prefix, malformed heading, absent anchor,
        two competing anchors. Risk-class tests for this parent: they pin what a loosened
        detector must still refuse.
  - [ ] 7.4 Verify in THIS repository: `node packages/provegate/dist/cli.js new probe-slug`
        succeeds against `.provegate/templates/prd-template.md`, then delete the probe artifact.

- [ ] 8.0 Discoverability (FR-6)
  - [ ] 8.1 `cli.ts::usage` — the `new` line advertises `--tasks` and `--review`.
  - [ ] 8.2 `cli.test.ts` — `"the new help line advertises --tasks and --review"`.
  - [ ] 8.3 `QUICKSTART.md` — move the manifest heading and recipe before the close section, and
        teach `gate new --tasks` / `--review` where the text currently prescribes copying a
        template by hand.
  - [ ] 8.4 `apps/docs/content/docs/quickstart.mdx` — the identical moves, same commit.
  - [ ] 8.5 `verify-quickstart-parity.mjs` — a structural order assertion: the manifest section
        must precede the close section in each copy; command-sequence equality cannot see it.
  - [ ] 8.6 `practices/NEXT_STEPS.md` — the second `## 7` becomes `## 8`.
  - [ ] 8.7 `content-hygiene.test.ts` —
        `"NEXT_STEPS numbered headings are unique and sequential"`.
  - [ ] 8.8 `pnpm verify:quickstart-parity` green.

- [ ] 9.0 Phase 5 — Testing
  - [ ] 9.1 Run every §11 command for real; a listed-but-not-run command is `operator` or
        `blocked`, never `passed`.
  - [ ] 9.2 Fill the Verification Ledger with evidence per row.
  - [ ] 9.3 `pnpm smoke:adopter` — the delivered CLI still closes a PRD end to end, and the
        fixture fill script's substitutions shrink because FR-2 now does them.
  - [ ] 9.4 Add the changeset: the two new modes, the help line, the quickstart reordering.

- [ ] 10.0 Phase 6 — Final Auditing
  - [ ] 10.1 Independent adversarial review of the diff by an agent that did not write it
        (`codex exec --sandbox read-only`), saved to
        `_docs/reviews/review-042-adopter-first-hour.md` with all six metadata fields.
  - [ ] 10.2 Sweep, do not hunt: the token set is restated in §1, §2, §4 and §11 — confirm all
        four agree after every correction (`a-rule-corrected-survives-where-it-is-restated`).
  - [ ] 10.3 Verify each closure by reading the file back; a changelog row is not evidence. This
        item's own readiness cost three rounds to a silently-failed edit.

- [ ] 11.0 Phase 7 — Learning
  - [ ] 11.1 Knowledge ingest: capture any non-derivable trap as a `_brain/learnings/` record.
  - [ ] 11.2 Durable-artifacts check against the PRD's declaration (`none` — the PRD declares no
        learning output; if one is discovered, append it with a rationale, which is always
        allowed).
  - [ ] 11.3 Summary in `_docs/wip/`, then `gate run PRD-042` from the primary checkout.

---

## Verification Ledger

One row per PRD §11 command, pre-populated `pending`; evidence filled at Phase 5.

| Gate               | Command / Check                                  | Scope                   | Result  | Evidence | Notes                       |
| ------------------ | ------------------------------------------------ | ----------------------- | ------- | -------- | --------------------------- |
| FR-1               | `pnpm test --filter provegate`                   | new.test.ts             | pending |          | paths, re-run, refusals     |
| FR-1               | `pnpm test --filter provegate`                   | chain.test.ts           | pending |          | unedited template fails P6  |
| FR-2               | `pnpm test --filter provegate`                   | new.test.ts             | pending |          | seven tokens, empty value   |
| FR-3               | `pnpm test --filter provegate`                   | new.test.ts             | pending |          | sections absent, memory off |
| FR-3               | `pnpm test --filter provegate`                   | prd-ready.test.ts       | pending |          | memory-on failure           |
| FR-4               | `pnpm test --filter provegate`                   | chain.test.ts           | pending |          | stop names path + columns   |
| FR-5               | `pnpm test --filter provegate`                   | new.test.ts             | pending |          | rendered + four refusals    |
| FR-6               | `pnpm verify:quickstart-parity`                  | both quickstart copies  | pending |          | structural order            |
| FR-6               | `pnpm test --filter provegate`                   | content-hygiene.test.ts | pending |          | NEXT_STEPS headings         |
| FR-6               | `pnpm test --filter provegate`                   | cli.test.ts             | pending |          | help advertises both modes  |
| types              | `pnpm check-types`                               | repo                    | pending |          |                             |
| lint               | `pnpm lint`                                      | repo                    | pending |          |                             |
| test               | `pnpm test`                                      | repo                    | pending |          |                             |
| build              | `pnpm build`                                     | repo                    | pending |          |                             |
| smoke              | `pnpm smoke:adopter`                             | adopter fixture         | pending |          | delivered CLI still closes  |
| independent-review | `_docs/reviews/review-042-adopter-first-hour.md` | repo                    | pending |          | verdict pass, critical = 0  |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

- (none yet)

---

## Progress Log

| Date       | Phase | Note                                                             |
| ---------- | ----- | ---------------------------------------------------------------- |
| 2026-08-07 | 3     | Parent skeleton generated; stopped for the owner's sub-task Go    |
| 2026-08-07 | 3     | Sub-tasks generated on the owner's Go; awaiting the Phase-4 start |

---

## Blockers / Open Questions

- (none)

---

## Operator Handoff

- (none) — PRD-042 is `Autonomous Close: eligible` and produces no operator-owned rows.
