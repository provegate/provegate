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
them. Each gets a re-open task in 0.0: a record is evidence only while it is true.

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
  templates get, and which are left to the author (readiness MP-1).
- **W2** — `cli.ts::usage` belongs to FR-6, not FR-1: the requirement that owns discoverability
  owns its target, and `cli.test.ts` moves with it (readiness MP-12).
- **W3** — §6 and §11 restate three refusals where FR-1 defines eight; all eight categories and
  their exact `new.test.ts` titles must appear in both (readiness MP-13).

---

## Tasks — parent skeleton (Phase A)

> Sub-tasks are NOT generated yet. Phase 3 stops here for the owner's "Go" — this repository is
> configured `human-gated`, and the agent does not assess its own mode.

- [ ] 0.0 Pre-flight
- [ ] 1.0 Close the three readiness watch items in the PRD (W1, W2, W3) before any code
- [ ] 2.0 CLI surface: the three productions, their mutual exclusion, and the eight refusals
- [ ] 3.0 Artifact instantiation: configured destination paths, wip-role identity, basename
      authority, `wx`-atomic contained writes
- [ ] 4.0 Token substitution: the closed seven-row pass, precedence, empty-value behaviour,
      sorted unique reporting — additive to the existing anchors
- [ ] 5.0 Memory-section omission when the contract is off, with the memory-on failure pinned
- [ ] 6.0 Phase-6 diagnostics: the stop names the configured path and the ledger row columns
- [ ] 7.0 Anchor alternation for rendered templates, with the four drift refusals held
- [ ] 8.0 Discoverability: `gate --help`, both quickstart copies, the parity order assertion,
      and the NEXT_STEPS heading fix
- [ ] 9.0 Phase 5 — Testing: run every §11 command, fill the Verification Ledger with evidence
- [ ] 10.0 Phase 6 — Final Auditing: independent adversarial review, spec-vs-code audit
- [ ] 11.0 Phase 7 — Learning: knowledge ingest, durable-artifacts check, summary

---

## Relevant Files

Pending Phase B.

---

## Verification Ledger

One row per PRD §11 command, pre-populated `pending`; evidence filled at Phase 5.

| Gate               | Command / Check                                | Scope                   | Result  | Evidence | Notes                      |
| ------------------ | ---------------------------------------------- | ----------------------- | ------- | -------- | -------------------------- |
| FR-1               | `pnpm test --filter provegate`                 | new.test.ts             | pending |          | paths, re-run, refusals    |
| FR-1               | `pnpm test --filter provegate`                 | chain.test.ts           | pending |          | unedited template fails P6 |
| FR-2               | `pnpm test --filter provegate`                 | new.test.ts             | pending |          | seven tokens, empty value  |
| FR-3               | `pnpm test --filter provegate`                 | new.test.ts             | pending |          | sections absent, memory off |
| FR-3               | `pnpm test --filter provegate`                 | prd-ready.test.ts       | pending |          | memory-on failure          |
| FR-4               | `pnpm test --filter provegate`                 | chain.test.ts           | pending |          | stop names path + columns  |
| FR-5               | `pnpm test --filter provegate`                 | new.test.ts             | pending |          | rendered + four refusals   |
| FR-6               | `pnpm verify:quickstart-parity`                | both quickstart copies  | pending |          | structural order           |
| FR-6               | `pnpm test --filter provegate`                 | content-hygiene.test.ts | pending |          | NEXT_STEPS headings        |
| FR-6               | `pnpm test --filter provegate`                 | cli.test.ts             | pending |          | help advertises both modes |
| types              | `pnpm check-types`                             | repo                    | pending |          |                            |
| lint               | `pnpm lint`                                    | repo                    | pending |          |                            |
| test               | `pnpm test`                                    | repo                    | pending |          |                            |
| build              | `pnpm build`                                   | repo                    | pending |          |                            |
| independent-review | `_docs/reviews/review-042-adopter-first-hour.md` | repo                  | pending |          | verdict pass, critical = 0 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

- (none yet)

---

## Progress Log

| Date       | Phase | Note                                                        |
| ---------- | ----- | ----------------------------------------------------------- |
| 2026-08-07 | 3     | Parent skeleton generated; stopped for the owner's sub-task Go |

---

## Blockers / Open Questions

- (none)

---

## Operator Handoff

- (none) — PRD-042 is `Autonomous Close: eligible` and produces no operator-owned rows.
