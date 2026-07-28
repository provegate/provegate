# PRD-036: Frozen-Snapshot Digest — the Cache Key Must See the Snapshot

> **Status**: Draft
>
> **Created**: 2026-07-28
> **Updated**: 2026-07-28
> **Author**: Claude Fable 5, converting a deferral at the board cap (owner review pending)
> **Audience**: Implementing Agent
> **Slug**: `frozen-snapshot-digest-gate`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: infra
> **Class Rationale**: A cache-key gap in this repository's own test wiring — no shipped
> code, no CLI surface, no method content changes. Not `test-hardening` because the test
> itself is correct; what is wrong is the build tool's view of what it reads.
> **Autonomous Close**: eligible
> **Value**: 3.45 (MF/UI/TL/AR/RM: 5/2/4/1/5)

<!-- 0.25*5 + 0.25*2 + 0.20*4 + 0.15*1 + 0.15*5
     = 1.25 + 0.50 + 0.80 + 0.15 + 0.75 = 3.45 -->

<!-- Value history: born at 2.80 (4/2/2/1/5), below the 3.40 threshold, from the
deferral-cap conversion rule. EXPANDED on the owner's triage direction of 2026-07-28 —
the first of the protocol's two expansion attempts — to absorb the class, not only the
instance: FR-1 now declares BOTH measured out-of-package reads (the source snapshot and
the real-bundle fixture PRD-025's review added the same day), and FR-2's census is the
standing gate that makes the NEXT undeclared read fail loudly. MF rises to 5 because
cache-key truthfulness is what keeps every gate's green honest — this exact class
shipped two real stale-green breaks before the blanket rule existed; TL rises to 4
because every future corpus-reading test (the PRD-024 pattern, the PRD-025 bundle
fixture, the snapshot digests) inherits the census instead of rediscovering the trap. -->

<!-- Autonomous Close: `eligible` — every verification is machine-checkable and this PRD
produces no operator-owned rows. -->

---

## 1. Introduction / Overview

Converted from the deferral "Frozen-snapshot digest" (opened at PRD-017 Phase 6 round 9,
due 2026-08-29), when the board reached its cap of 15 rows on 2026-07-28.

The method-content digest tests in `packages/provegate/test/content-prompts.test.ts` pin
shipped prompts against the source snapshot: the test reads
`docs/research/provegate-bootstrap/source-snapshot/` via a relative escape from the
package (`content-prompts.test.ts:316-319`). The `test` turbo task hashes tracked files
of the package only, so an edit to the snapshot does not invalidate `provegate#test`'s
cache — a cached green replays over a snapshot comparison that never re-ran. This is
`turbo-cache-masks-out-of-input-reads` exactly. CI checks out fresh, so the published
guarantee is real; the gap is local-only, which is why it sat on the deferral board
rather than in the pipeline.

PRD-024's FR-2 established the repair pattern and its landing on 2026-07-28 shipped it:
the `test` task now declares `$TURBO_DEFAULT$` plus three root globs with a reasoned
exceptions entry. This PRD extends that list — and the same day supplied a second
customer: PRD-025's review added a fixture reading the real
`scripts/verify/verify-workflow.mjs` from the package tests, recorded in that PRD's
Deferrals as this census's work. FR-1 therefore declares BOTH measured out-of-package
reads, and FR-2 is the gate that finds the third before a reviewer has to.

---

## 2. Goals

### Primary Goals

- [ ] An edit under `docs/research/provegate-bootstrap/source-snapshot/` invalidates the
      `provegate#test` cache, so the digest comparison always re-runs against the bytes on
      disk.
- [ ] Every out-of-package path a package test reads is declared in the task's cache key,
      measured rather than assumed.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Out-of-package read paths in `provegate#test` absent from its cache key | 2, measured 2026-07-28: the source snapshot (digest tests) and `scripts/verify/verify-workflow.mjs` (PRD-025's bundle fixture) | 0 | FR-1; an edit to either re-runs the tests (cache miss), verified by FR-2's census |
| Package tests reading repo-root paths with no declared input | unmeasured | 0, with the census recorded | FR-2 |

---

## 3. User Stories

#### User Story 1

```
As a maintainer editing the source snapshot,
I want the digest tests to actually re-run,
so that a green suite means the shipped prompts still trace to the snapshot on disk.
```

**Acceptance Criteria:**

- [ ] After a snapshot edit, `provegate#test` is a cache miss and the digest comparison
      executes.
- [ ] With no snapshot edit, caching behaves as before.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1 — Declare both measured out-of-package reads in the test task's cache key.**
   Extend the `test` task's `inputs` in `turbo.json` — the array PRD-024's FR-2 landed —
   with `$TURBO_ROOT$/docs/research/provegate-bootstrap/source-snapshot/**` (the digest
   tests' read) and `$TURBO_ROOT$/scripts/verify/verify-workflow.mjs` (the real-bundle
   grammar fixture PRD-025 added), and extend the written reason on the existing
   `"test"` entry in `scripts/verify/turbo-inputs-exceptions.json` to name both reads
   alongside the PRD corpus read. Both parts follow PRD-024's stated grammar: root-prefixed because task
   inputs are package-relative, appended to a list that already carries `$TURBO_DEFAULT$`,
   and excepted because `verify:turbo-inputs` refuses an undeclared `inputs` key. The
   accepted cost is the same shape PRD-024 records: every workspace's `test` task re-runs
   on a snapshot edit — deliberate, against a stale green on the method-content pin.
   - **Targets:** `turbo.json`, `scripts/verify/turbo-inputs-exceptions.json`
2. **FR-2 — Measure the class, not just the instance.** A one-time census with a durable
   assertion: enumerate every `readFileSync`/`readdirSync`/`existsSync` path in
   `packages/provegate/test/**` that resolves outside the package root, and assert each
   one is covered by a glob in the `test` task's `inputs`. Ship it as a test in the
   package suite so a future out-of-package read fails the suite until it is declared —
   the same wire-or-delete discipline the audit gates use, applied to the cache key.
   - **Targets:** `packages/provegate/test/turbo-input-coverage.test.ts` (new)

---

## 5. Non-Goals (Out of Scope)

- **Re-designing the digest tests.** The digest mechanism is correct; only its cache
  visibility is wrong.
- **A cache-free `scripts/verify/` twin of the digest test.** That was the deferral's
  original sketch; it predates PRD-024's input-declaration pattern, which closes the gap
  without a second implementation of the comparison (`two-parsers-wrong-together`).
- **Any change to `verify-turbo-inputs.mjs` policy.** The blanket refuse-undeclared-inputs
  rule stands; this PRD uses its sanctioned exception path.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** an edit to any file under the source snapshot, **When** `pnpm test` runs,
  **Then** `provegate#test` is a cache miss and the digest tests execute.
- **Given** a new test that reads a repo-root path not covered by the `test` task's
  `inputs`, **When** the package suite runs, **Then** FR-2's coverage test fails naming
  the path.
- **Given** no snapshot or PRD edit, **Then** caching behaves exactly as after PRD-024.

---

## 7. Technical Considerations

### Architecture

- **Extend, do not duplicate.** The input list and the exception entry exist after
  PRD-024; this PRD appends to both rather than creating parallel machinery.
- **The census is the durable half.** FR-1 fixes the known instance; FR-2 makes the next
  undeclared read fail loudly instead of waiting for a round-9 review to notice.

### Dependencies

- **PRD-024 is Ship Verified (2026-07-28)** — the `inputs` array and the reasoned
  exception entry FR-1 extends are on `main`, so the former hard ordering is met.
- **PRD-028 (iteration-4 revision) also extends the same `inputs` array and the same
  exception entry** — its FR-3 adds the `_brain` store glob. Serialize on `turbo.json`
  and `scripts/verify/turbo-inputs-exceptions.json` with whichever of the two claims
  first. PRD-026 declares nearby paths (`package.json`, CI); re-run `gate queue` before
  claiming rather than trusting this paragraph.

---

## 8. Implementation Scope

### In Scope

- [ ] `turbo.json` — one glob appended to the `test` task's `inputs`
- [ ] `scripts/verify/turbo-inputs-exceptions.json` — the `test` entry's reason extended
- [ ] `packages/provegate/test/turbo-input-coverage.test.ts` (new) — the FR-2 census

---

## 9. Open Questions

- (none)

---

## 10. References

- STATUS.md deferral row "Frozen-snapshot digest" (removed by this conversion; opened at
  PRD-017 Phase 6 round 9)
- `_brain/learnings/turbo-cache-masks-out-of-input-reads.md` — the class this defect
  belongs to
- PRD-024 FR-2 — the input-declaration pattern this PRD extends

---

## Memory Inputs

- applied: `turbo-cache-masks-out-of-input-reads` — this PRD is that record's remaining
  live instance in this repository; FR-1 closes it and FR-2 makes the class fail loudly.
- applied: `gate-wire-or-delete` — FR-2 is the same discipline pointed at the cache key:
  every out-of-package read declared, or the suite refuses.
- reviewed: `two-parsers-wrong-together` — it is why the Non-Goals reject a cache-free
  twin of the digest comparison in `scripts/verify/`: two implementations of one pin
  drift, and the input declaration removes the need for a second.
- applied: `assert-absent-needs-an-independent-cause` — FR-2's deny case ("an undeclared
  read fails by name") must be proven with a fixture that would otherwise pass: the
  hard-cap note requires the failure to come from the missing declaration, not from a
  census that never enumerates, and the passing census on today's reads is the paired
  positive control.

---

## Memory Outputs

- none — the class is already recorded in `turbo-cache-masks-out-of-input-reads`, and
  this PRD adds an instance fix plus an enforcement test, not a new non-derivable fact.

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `turbo.json`
- `scripts/verify/turbo-inputs-exceptions.json`
- `packages/provegate/test/turbo-input-coverage.test.ts`

**Contested, measured with `gate queue` on 2026-07-28:** `turbo.json` and the exceptions
file are claimed by PRD-024, which must land first (FR-1 extends its edit). Serialize
behind it; re-run `gate queue` before claiming.

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Review artifact: `_docs/reviews/review-036-frozen-snapshot-digest-gate.md`
- Learning: `none` — the Memory Output above is a reasoned `none`; the class record
  already exists and this PRD only closes its instance
- Decision: `none` — the repair pattern is PRD-024's, reused

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check | Scope | Notes |
| ---- | --------------- | ----- | ----- |
| FR-1 | `pnpm --filter provegate test test/content-prompts.test.ts` | pkg | the digest tests pass; cache invalidation on a snapshot edit is proven by the FR-2 coverage test plus a documented cache-miss check in the task plan |
| FR-2 | `pnpm --filter provegate test test/turbo-input-coverage.test.ts` | pkg | every out-of-package read path in the package tests is covered by a test-task input glob; an undeclared read fails naming the path |
| FR-2 | `pnpm verify:turbo-inputs` | repo | the exceptions entry stays valid and no task narrows its key undeclared |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm verify:workflow` — the repo bundle stays green

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/turbo-input-coverage.test.ts` — an undeclared
  out-of-package read must fail by name; a census that only passes on today's inputs is
  not evidence.
- Contract test: n/a — no client-to-server payload ships.

Before Phase 2 PASS, run: `gate check PRD-036`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT build a second digest comparison in `scripts/verify/`. One pin, one
  implementation; the cache key is the fix.
- DO NOT narrow the appended glob below the snapshot root, and do not remove
  `$TURBO_DEFAULT$` while appending — either move re-creates a stale-green key.
- DO NOT start FR-1 before PRD-024 is Ship Verified; both target files are inside its
  Conflict Surface.
- DO NOT satisfy FR-2 with a hardcoded list of today's reads; the census must enumerate
  from the test sources so a new read is caught.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-28 | Claude Fable 5, on the owner's triage direction | **Expanded and queued (first expansion of the protocol's two).** The owner's call on the below-threshold header: absorb the class. FR-1 now declares BOTH out-of-package reads measured on 2026-07-28 — the source snapshot and the real-bundle fixture PRD-025's review round added the same day, recorded in that PRD's Deferrals as this census's work — and the census's value claim changes kind: it is the standing gate for the class, not a one-instance repair. Value 2.80 → 3.45 (MF 4→5: cache-key truthfulness underwrites every gate's green and the class has two shipped breaks on record; TL 2→4: every future corpus-reading test inherits the census). PRD-024's landing turned the dependency from future work into a shipped seam: the inputs array and the reasoned exception entry exist on main, so FR-1 is an extension, not a creation. Serialization note updated — PRD-024 is Ship Verified, and the remaining coordination is only that PRD-026 also touches `package.json`/CI near the same seam; re-run `gate queue` |
| 2026-07-28 | Claude Fable 5, converting a deferral at the board cap | Converted from the STATUS.md deferral "Frozen-snapshot digest" (opened PRD-017 Phase 6 round 9, due 2026-08-29) when the board hit its cap of 15 rows — the cap rule converts the oldest-due row. The original sketch (a cache-free `scripts/verify/` twin) is rejected in Non-Goals: PRD-024's input-declaration pattern closes the gap without a second implementation of the pin. Value scored honestly at 2.80, below the 3.40 candidate threshold, with the expand-or-cut status recorded in the header comment for the owner's triage call. Created with `gate new` |
