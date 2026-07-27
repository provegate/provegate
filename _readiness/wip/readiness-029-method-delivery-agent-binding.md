# Readiness Assessment: PRD-029 — Method Delivery, Agent Protocol Binding

> **Iteration 1 (Codex, independent) — 4.48/10, ITERATE.** The lowest opening score in the
> wave, and the findings say why: **six of the eight [P1]s are the document disagreeing with
> itself**, not with the codebase. The token count, the file inventory, the activation
> contract and the `templates.prd` behaviour each say one thing in §4 and another in §6, §7
> or §11. Every checkable finding was re-verified against source here before being recorded;
> **none was rejected.** The two that are not internal contradictions are the sharpest:
> `prompts/adapters/` already ships two prose-heavy adapters the PRD never mentions while
> FR-5 promises "one protocol location", and FR-10 makes conditional a rule the frozen
> snapshot states unconditionally, which is a method-content change rather than a token.

## Quick Meta

| Field                  | Value                                                                                                                                                                                                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PRD                    | `_prds/wip/prd-029-method-delivery-agent-binding.md`                                                                                                                                                                                                                                                     |
| Score                  | 4.48/10                                                                                                                                                                                                                                                                                                  |
| Verdict                | ITERATE — eight [P1] items. Five are internal contradictions that exist only at this document's size, one is an unaccounted existing adapter directory, one is a false premise about `load.ts`, and one is a method-content provenance failure that no amount of rewriting inside this PRD can satisfy      |
| Iteration              | 1                                                                                                                                                                                                                                                                                                        |
| Model Tier (Execution) | do not assign — score < 8                                                                                                                                                                                                                                                                                |
| Model Tier (Audit)     | high (on a PASS)                                                                                                                                                                                                                                                                                         |
| Scored by              | **Codex (gpt-5.x) via the `/codex` skill — independent, different model family, did not write the PRD**                                                                                                                                                                                                  |
| Self-scored            | **no**                                                                                                                                                                                                                                                                                                   |
| Date                   | 2026-07-27                                                                                                                                                                                                                                                                                               |
| PRD Lint               | passed — `lintPrd` green by direct invocation with the real config, manifest, content and root: `{ ok: true, issues: [] }`. The CLI wrapper was not used: `findRecord` writes `_state/prds.json`, which the read-only sandbox refused with `EPERM`. The reviewer stated this rather than implying a run     |
| State Record           | updated — `gate status` re-run after saving                                                                                                                                                                                                                                                              |

<!-- Verdict values: PASS | ITERATE | REJECT. The Score row and Verdict row are parsed
by the state builder — keep the `| Score |` and `| Verdict |` labels intact. -->

---

## Model Tier Recommendation

| Phase               | Tier                       | Rationale                                                                                                                                             |
| ------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase 4 (Execution) | do not assign — score < 8  | The scope split (W1) changes which FRs exist, so any tier assigned now would describe work that will not be executed in this shape                     |
| Phase 6 (Audit)     | high (on a PASS)           | The delivery core touches the installer, the config surface and shipped method content; three surfaces where this repository's defects have historically hidden |

---

## Analysis

### 1. Technical Depth & Architecture

The central design claim is sound and survives scrutiny: rendered content as a pure
function of package version and config is what makes divergence recomputable rather than
merely recorded, and the pointer-only adapter rule is the correct answer to this
repository's most-repeated defect. The reviewer did not challenge either.

What it did challenge is that the PRD **never states which files the render covers**. FR-2
says "all ten files under the package's `prompts/` (including `PLACEHOLDERS.md` and
`orchestration-runner.md`)". Measured here: `find packages/provegate/prompts -name '*.md'`
returns **14**. Ten protocols exist — seven phase files plus `orchestration-runner.md`,
`knowledge-ingest.md` and `knowledge-lint.md` — so naming `PLACEHOLDERS.md` as one of the
ten makes eleven, and `README.md` plus `adapters/` are unaccounted for entirely. §11's FR-2
row says "all ten protocols and the templates emit", which is a third reading. The template
side is worse: no allowlist is given at all, and the seven files under `templates/` include
`README.md`.

**`packages/provegate/prompts/adapters/` already exists** and ships `codex-starter.md` and
`cursor-bootstrap.md` — prose-carrying adapters, installed by nothing, referenced by the
package `README.md` as manual-paste instructions. The PRD does not mention them. FR-5
promises "one protocol location" and a test that no adapter body restates protocol prose;
that test fails on the day it is written, against files this PRD never planned to touch.
This is the finding with the largest consequence for the design, because it means the
adapter problem is partly a **reconciliation** problem and not only a generation problem.

`load.ts` was asserted wrong. §7 says the loader "runs `deepMerge(DEFAULT_CONFIG, parsed)`
before validation, so a partial `prompts` object arrives carrying default siblings".
Measured: `validateConfig(parsed)` at `load.ts:267` runs on the **raw** parsed object,
`mergeConfig` at 272, then `validateResolvedConfig(merged)` at 273. Both validations exist
and the order is the inverse of what the PRD states. The instruction FR-1 derives from the
false premise — write validation against the merged shape — is half right by accident, and
an implementer following §7 would put the wrong check in the wrong pass.

### 2. Edge Cases & Failure Modes

**A fresh `gate init --prompts` cannot succeed as specified.** The registry declares
**20** tokens (measured two ways: `grep -rho '{{[A-Z_0-9]*}}' prompts/ | sort -u` → 20, and
20 rows in `PLACEHOLDERS.md`). The PRD says 21 in §1, in §7 and in its Changelog. Of those
20, seven map to a `workflow.config.json` field; the rest — `{{ARCHITECTURE_DOC}}`,
`{{TECH_STANDARDS}}`, `{{DOMAIN_CHECKS}}`, `{{PROJECT_SPECIFIC_HARD_RULES}}` and the others
— have no source. FR-3 requires the render to refuse on any surviving token, and FR-4
provides no path by which a fresh scaffold supplies those thirteen values. The first
command an adopter runs therefore fails by design, and the PRD's own User Story 1 asserts
the opposite.

**Activation and `templates.prd` disagree across three sections.** FR-1 makes every other
FR inert when `prompts` is absent from the config. FR-13 says `gate init --practices`
installs the store — but `PACK_MAP` is a static source-to-destination table read by
`planPractices`, and a static table cannot emit a config-dependent render. FR-4 says an
existing config is not rewritten, only reported; §6's Gherkin says "Given a repository
initialised with `--prompts`, When `gate new` runs, Then it reads the rendered template",
which is false for exactly the repositories FR-4 declines to edit. Three statements, three
different contracts.

**Migration and rollback are the weakest dimension and the class inflates it to 20%.**
`gate init` is additive-only by explicit design, so it can detect an obsolete store and
cannot repair one. Nothing specifies regeneration after a package upgrade, whether ledger
exceptions survive a re-render, or how `templates.prd` is rolled back if the store is
removed. The PRD's only migration content is a Non-Goal disclaiming adopter migration,
which is honest about the gap and does not close it.

### 3. Maintainability & DX

Targets and Conflict Surface are incomplete in a way that would fail the lock gate rather
than merely inconvenience a reader. `AGENT_BOOTSTRAP.md` is an FR-11 Target and is absent
from the Conflict Surface; it was excluded on the template's "never declare agent entry
docs" rule, but `sharedAppendOnly` is `['package.json', 'pnpm-lock.yaml', 'README.md',
'CLAUDE.md', 'AGENTS.md']` and **does not contain it**, so the exclusion the rule promises
does not apply and the claim is simply missing. `.github/workflows/ci.yml` (FR-9) and
`_brain/INDEX.md` are likewise unclaimed, and three existing test files the work must
edit — `content-prompts.test.ts`, `content-placeholders.test.ts`, `pack.test.ts` — appear
in §11 or in the pack FRs without appearing in Targets.

### 4. Migration & Rollback

Covered under Edge Cases above; scored 3/10. The deployment-ordering failure mode this
dimension exists to catch is present and unaddressed: the store is written by the installer,
read by agents, and reconciled by a check, and no FR says what happens when those three
disagree after an upgrade rather than after an edit.

### 5. Memory Inputs

The declared set is unusually strong and the reviewer did not find a missing watch overlap.
Eleven records with dispositions, every mandatory watch covered — `_prds/**`,
`AGENT_BOOTSTRAP.md`, `core/run/**`, `cli.ts`, `test/**`, `_brain/adr/**` — and the
`fixture-must-reach-production-shape` disposition was added because `gate check` refused the
document without it, which is the contract working as designed rather than an author's
diligence.

One observation worth recording rather than scoring: `a-rule-corrected-survives-where-it-is-restated`
is declared `applied` and cited as the reason adapters carry no prose — and the document
then reproduced that exact defect six times over its own late corrections. Declaring a
record is not applying it.

---

## Scorecard

Class-conditional weights for `infra`, per `prompts/phase-2-readiness-scorer.md` lines
74-82. Verified against that table before recording.

| #         | Dimension                | Weight | Score       | Notes                                                                                                       |
| --------- | ------------------------ | ------ | ----------- | ------------------------------------------------------------------------------------------------------------- |
| 1         | Clarity                  | 15%    | 5.5/10      | Problem statement and evidence are precise; the specification contradicts itself on what is rendered          |
| 2         | Completeness             | 20%    | 4.5/10      | Thirteen non-config placeholders have no source; the existing `adapters/` directory is unaccounted for        |
| 3         | Technical Depth          | 20%    | 5.0/10      | The purity-and-recompute design holds; the `load.ts` premise is false and the activation contract is threefold |
| 4         | Multi-Tenancy & Security | 10%    | 7.0/10      | No tenant surface; containment is specified with realpath on both sides, which is the historical hole         |
| 5         | Scope & Testability      | 15%    | 3.0/10      | Thirteen FRs across six subsystems; the split is pre-drawn as a contingency and should be taken now           |
| 6         | Migration & Rollback     | 20%    | 3.0/10      | Regeneration, exception survival and `templates.prd` rollback all unspecified                                 |
| **Total** | **Weighted**             |        | **4.48/10** | **ITERATE**                                                                                                 |

Arithmetic re-derived here: `5.5×.15 + 4.5×.20 + 5.0×.20 + 7.0×.10 + 3.0×.15 + 3.0×.20 = 4.475`.

Hard caps checked: **one tripped.** Method content not traceable to the source snapshot —
`source-snapshot/prompts/phase-3-task-generator.md:80` states the autonomy exception
**unconditionally**, so FR-10's `{{AUTONOMY_MODE}}` makes conditional a rule the snapshot
does not condition. Reading the snapshot, which is all FR-10's stated precondition requires,
does not authorize the change; critical rule 4 needs the wording to be traceable, and the
PRD's Non-Goal claiming FR-10 "changes no rule" is false. No runtime dependency added; no
remote-push path added. Lint cap: not tripped — `lintPrd` returned `{ ok: true, issues: [] }`.

Measured while checking the cap and worth keeping: our shipped copy of that line **drops**
the snapshot's parenthetical `(single-session test runs, agent-led sweeps)`. A pre-existing
divergence, found by a diff neither side was running for it.

---

## Missing Pieces (to reach 10/10)

1. **W1 — Take the split now rather than holding it.** Five of the six confirmed internal
   contradictions exist because one document states one rule in six places. Proposed
   boundary: FR-1 through FR-6 plus FR-13 stay as the delivery core; FR-7/8/9 (ledger,
   doctor, wiring) become an integrity-and-upgrade item; FR-10/11 become a
   provenance-backed method-policy item; FR-12 (dogfood) follows the core. Each successor
   rewrites its own Goals, Conflict Surface and §11 rather than inheriting them.
2. **W2 — Write an exact source-to-destination render manifest** and reconcile every count
   and restatement against it: §1, §4 FR-2, §6, §7, §11 and the Changelog. State whether
   `PLACEHOLDERS.md`, `README.md` and `adapters/` are rendered, and if not, why a reader
   who finds them in the package will not expect them in the store.
3. **W3 — Give every non-config placeholder a source at scaffold time** and prove it
   through the real CLI path, not through the render function. Thirteen tokens have no
   supplier today and FR-3 turns each into a hard failure.
4. **W4 — Define one activation contract.** `--prompts` versus `--practices`, what a static
   `PACK_MAP` can and cannot emit, and what `templates.prd` does for a repository whose
   config already exists. One statement, restated nowhere.
5. **W5 — Reconcile `packages/provegate/prompts/adapters/` and the package `README.md`.**
   Either they become generated pointers, or they are deleted, or the "one protocol
   location" claim is narrowed to say what it excludes. FR-5's test cannot pass otherwise.
6. **W6 — Obtain method provenance for FR-10 or remove it.** An owner-approved, dated
   addendum listed in the source-snapshot manifest, or the FR goes. The same applies to
   FR-11's edit to the shipped `AGENT_BOOTSTRAP.template.md` if its wording is not
   traceable.
7. **W7 — Correct the `load.ts` validation ordering in §7** and complete Targets and
   Conflict Surface: `AGENT_BOOTSTRAP.md` (not covered by `sharedAppendOnly`),
   `.github/workflows/ci.yml`, `_brain/INDEX.md`, `content-prompts.test.ts`,
   `content-placeholders.test.ts`, `pack.test.ts`.
8. **W8 — Specify regeneration, upgrade, exception preservation and rollback.** The 20%
   dimension has no content today beyond a Non-Goal.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ---------- | ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2026-07-27 | 4.48  | ITERATE | **First independent round; eight [P1]s, none rejected on re-verification.** Six are the document disagreeing with itself: the placeholder registry holds **20** tokens where the PRD says 21 in three places; `prompts/` holds 14 Markdown files where FR-2 says "all ten … including `PLACEHOLDERS.md`" and §11 says "all ten protocols"; activation is inert-without-config in FR-1, installed-by-`--practices` in FR-13, and unconditional in §6's Gherkin; `templates.prd` is rewired in FR-4 for new configs only and promised universally in §6. Two are not: **`packages/provegate/prompts/adapters/` already ships `codex-starter.md` and `cursor-bootstrap.md`**, prose-carrying and referenced by the package README as manual-paste instructions, so FR-5's "no adapter restates protocol prose" test fails against files the PRD never planned to touch; and **FR-10 trips the method-content hard cap** — `source-snapshot/prompts/phase-3-task-generator.md:80` states the autonomy exception unconditionally, so conditioning it is a method change that reading the snapshot does not authorize. Also: §7's `load.ts` premise is inverted (`validateConfig(parsed)` at 267 precedes `mergeConfig` at 272), and `AGENT_BOOTSTRAP.md` is an FR-11 Target absent from the Conflict Surface on a `sharedAppendOnly` exclusion that does not list it. Confirmed and left standing: the purity-and-recompute design, the pointer-only adapter rule, the realpath-both-sides containment, and the Memory Inputs set, which covers every watch overlap |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Verdict

**ITERATE — 4.48/10, iteration 1, scored independently by Codex.**

The problem this PRD identifies is real and was verified independently: the phase protocols
ship and never install, and both observed agent symptoms follow from that one cause. The
diagnosis is not what failed here.

What failed is that a thirteen-FR document states each of its rules in six places, and the
author's two late corrections — the store layout and the `templates.prd` rewiring —
propagated to neither §6 nor §11 nor the Changelog. That is the failure mode
`a-rule-corrected-survives-where-it-is-restated` describes, reproduced by a document that
declares the record as `applied`. It is also the failure mode that superseded PRD-023, and
the size is the same. **W1 is therefore load-bearing and comes first**: remediating six
self-contradictions inside one document at this size reproduces the condition that created
them.

Two findings survive any split and must be answered rather than redistributed. The existing
`prompts/adapters/` directory means adapter delivery is a reconciliation problem, not only a
generation problem, and no successor PRD is coherent until that is decided. FR-10's
provenance is a hard cap: the wording must come from an owner-approved snapshot addendum or
the requirement is removed. Neither is a specification gap that better prose closes.
