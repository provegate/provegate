# PRD-004: Launch Surface — Init, Quickstart, Case Study, Whitepaper

> **Status**: Draft
> **Created**: 2026-07-22
> **Updated**: 2026-07-22
> **Author**: rayvaz
> **Audience**: Implementing Agent (Claude Code / Cursor / Codex)
> **Slug**: `launch-quickstart`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Class Rationale**: (default class) — the launch surface is the product's first-contact user experience: `gate init`, the quickstart, and the evidence pages.
> **Autonomous Close**: operator-gated
> **State Record**: `_state/prds.json`

---

## 1. Introduction / Overview

Roadmap Phase E. Everything between `npm install -D provegate` and a stranger's first
gated close: **`gate init`** (the last stub standing between the README promise and
reality), the **hotfix-class quickstart** (the lightest path as first impression, per
the roadmap's adoption-risk note), the **case study** and **whitepaper** pages on the
docs site (the evidence, stated with the do-not-say discipline), the **README/landing
overhaul** fed by the positioning document, and an **announcement draft** for the owner
to edit. Plus the governed deferral due 2026-07-29: **runtime quorum arithmetic** in
the review gate — the engine item PRD-003's review produced.

New mechanical gate for launch copy: a **do-not-say lint** — the banned-claims list
from the positioning document, enforced by test over every launch-facing page.

---

## 2. Goals

### Primary Goals

- [ ] `gate init` scaffolds a working gated repo (tree + configs), idempotently.
- [ ] Quorum arithmetic enforced in the review gate (deferral closed on time).
- [ ] Quickstart: install → init → hotfix-class item → `gate check` → `gate run`,
      reproducible by a stranger.
- [ ] Case study + whitepaper pages live on the docs site, do-not-say clean.
- [ ] README/landing carry the positioning one-liners and the meta-story.

### Success Metrics

| Metric                   | Current               | Target                     | Measurement                    |
| ------------------------ | --------------------- | -------------------------- | ------------------------------ |
| Stub commands remaining  | 3 (init, new, open)   | 2 (init real)              | CLI test                       |
| Governed deferral        | open (due 2026-07-29) | closed                     | quorum tests + deferral row    |
| Launch-copy claim safety | manual discipline     | mechanical do-not-say lint | content test over launch pages |
| Quickstart executability | none                  | every command copy-pastes  | quickstart round-trip test     |

---

## 3. User Stories

#### User Story 1

```
As a first-time adopter,
I want one command to scaffold the workflow tree and configs,
so that the method starts working before I have read anything but the quickstart.
```

**Acceptance Criteria:**

- [ ] `gate init` creates the artifact tree (all artifact dirs × lifecycle states),
      the state/locks dirs, a starter `workflow.config.json`, and a starter
      `gates.manifest.json`; prints what it created and the quickstart pointer.
- [ ] Re-running never overwrites anything (idempotent; reports "exists, skipped").
- [ ] The scaffolded repo immediately passes `gate status` and `gate check --wiring`.

#### User Story 2

```
As a maintainer of the method,
I want the review gate to enforce the panel quorum arithmetically,
so that a pass verdict with a failing quorum is mechanically impossible (the PRD-003 deferral).
```

**Acceptance Criteria:**

- [ ] `Quorum: N/M pass` parses strictly (N ≤ M, M ≥ 1); malformed quorum is an issue.
- [ ] A `pass` verdict requires N/M ≥ 3/5 — the calibrated panel gate; `3/5` passes,
      `2/5` fails, `1/1` passes as the degenerate full-quorum case.
- [ ] The deferral row is closed with a pointer to this PRD.

#### User Story 3

```
As an evaluating engineer reading the launch,
I want the evidence stated exactly as strong as it is,
so that the project citing calibration data against others' overclaiming never overclaims itself.
```

**Acceptance Criteria:**

- [ ] Case study page carries the numbers with their caveats: ~390 production items,
      the 143-finding calibration (decimal score r = −0.03 with post-ship defects),
      binary-verdict + hard-caps redesign, 0 vs 2 critical post-ship findings,
      cross-model catches — labeled observational and single-project.
- [ ] The do-not-say lint fails any launch page containing the banned claims
      ("first ever", unmeasured speedup percentages, badge-jargon verdict labels).
- [ ] The whitepaper page anonymizes the parent project ("a production SaaS
      platform") — naming it is the owner's editorial call, not a default.

---

## 4. Functional Requirements

1. **FR-1 — Quorum arithmetic (the governed deferral)**: extend
   `validateReviewArtifact` — parse `Quorum` as `N/M pass` (strict: integers, N ≤ M,
   M ≥ 1); add issue when malformed; when verdict is `pass`, require N/M ≥ 3/5.
   Update the shipped schema description to state the arithmetic is now enforced.
   Close the PRD-003 deferral row in the archived task file with a pointer here.
   - **Targets:** `packages/provegate/src/core/gates/review.ts`, `packages/provegate/schemas/review-metadata.schema.json`, `_tasks/completed/tasks-003-method-package.md`
2. **FR-2 — `gate init`**: new CLI command replacing the stub — creates the config-derived
   tree (each artifact dir × each lifecycle state with `.gitkeep`, state dir, locks
   dir), writes starter `workflow.config.json` (`{}` + a `$schema`-style comment file
   is not possible in JSON — instead a minimal object with the two most-commonly
   customized fields populated from defaults) and starter `gates.manifest.json`
   (`{}`), never overwrites existing files, reports created/skipped per path, exits 0;
   `--dry-run` prints the plan. **Root resolution**: init must work before any config
   exists — it roots at the nearest `.git` walking up from cwd, else cwd itself
   (never requires an existing `workflow.config.json`). **Wiring semantics**: on a
   scaffolded repo without a `package.json`, the wiring audit's script-existence
   direction is skipped (nothing to audit against) instead of failing — a fresh
   non-node repo must pass `gate check --wiring`.
   - **Targets:** `packages/provegate/src/core/run/init.ts`, `packages/provegate/src/cli.ts`, `packages/provegate/src/core/run/index.ts`
3. **FR-3 — Quickstart**: `packages/provegate/QUICKSTART.md` + docs page — the
   hotfix-class walkthrough: install, `gate init`, copy the PRD template, fill the
   hotfix skeleton, `gate check`, manual phases 2–3 (score + tasks), phases 4–7 with
   the prompts, close with `gate run`. Every command shown must exist and be
   copy-pasteable; ships in the npm package (`files` += QUICKSTART.md).
   - **Targets:** `packages/provegate/QUICKSTART.md`, `apps/docs/content/docs/quickstart.mdx`, `packages/provegate/package.json`
4. **FR-4 — Case study page**: `apps/docs/content/docs/case-study.mdx` — the long form
   of the whitepaper's evidence section: origin (~390 items), the calibration study
   (143 findings, r = −0.03, the redesign to binary + hard caps), outcome deltas
   (0 vs 2 critical post-ship), cross-model review data (reviewer catches the
   implementing family missed), every figure with its observational/single-project
   caveat inline.
   - **Targets:** `apps/docs/content/docs/case-study.mdx`
5. **FR-5 — Whitepaper page**: adapt the research-corpus whitepaper draft to
   `apps/docs/content/docs/whitepaper.mdx` (v1.0 editorial pass: parent project
   anonymized to "a production SaaS platform", numbers cross-checked against the case
   study page, citations kept).
   - **Targets:** `apps/docs/content/docs/whitepaper.mdx`
6. **FR-6 — README + landing overhaul**: root README gains the meta-story section
   ("this repo runs its own method — read `_prds/completed/`"), the quickstart
   snippet, and evidence links; the landing page (`apps/web`) gains the elevator
   pitch, quickstart snippet, and docs links — copy sourced from the positioning
   document's one-liners, do-not-say clean.
   - **Targets:** `README.md`, `apps/web/app/page.tsx`, `packages/provegate/README.md`
7. **FR-7 — Announcement draft**: `_docs/launch/announcement-draft.md` — HN-style
   post built on the positioning provocation (the 80-agents/one-test story), the
   meta-story, and the evidence links. Explicitly a draft for the owner's edit; not
   shipped in the package; still do-not-say linted.
   - **Targets:** `_docs/launch/announcement-draft.md`
8. **FR-8 — Do-not-say lint**: test over the launch surfaces (READMEs, landing page
   source, quickstart, case-study/whitepaper/announcement pages) banning: "first ever"
   and variants, unmeasured percentage speedup claims (regex for `\d+% faster|fewer
bugs` outside quoted external data), and the dead project's badge-jargon verdict
   labels; plus number-consistency checks between case study and whitepaper pages.
   - **Targets:** `packages/provegate/test/content-launch.test.ts`
9. **FR-9 — Init + quorum + quickstart tests**: quorum arithmetic units (3/5, 2/5,
   1/1, 5/3 malformed, non-integer); init fixture tests (tree shape, idempotency,
   scaffolded repo passes `gate status` + `gate check --wiring` via the library);
   quickstart command audit (every backticked `gate`/install command in QUICKSTART.md
   exists in the CLI usage or is a standard package-manager invocation).
   - **Targets:** `packages/provegate/test/review-quorum.test.ts`, `packages/provegate/test/init.test.ts`, `packages/provegate/test/content-launch.test.ts`
10. **FR-10 — Docs nav + method links**: docs site index links quickstart, method,
    case study, whitepaper, CLI; `meta.json` ordering; package README links
    QUICKSTART.md.
    - **Targets:** `apps/docs/content/docs/meta.json`, `apps/docs/content/docs/index.mdx`

---

## 5. Non-Goals (Out of Scope)

- **Competitor-specific claims** — the landscape's unverified cells stay out of all
  launch copy (do-not-say list); primary-doc verification of Spec Kit/Kiro/BMAD gate
  mechanics is a separate research task, deliberately not blocking launch.
- **Actual publication acts** — npm publish, git push, posting the announcement,
  domain deployment: owner keystrokes, all of them.
- **`gate new` / `gate open`** — remaining stubs; scaffolding one work item
  (`new`) and lease UX (`open`) follow the worktree PRD.
- **Worktree machinery** — unchanged, separate PRD.
- **Whitepaper external hosting / PDF** — the docs page is the publication surface
  for now.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** an empty git repo, **When** `gate init` runs, **Then** the artifact tree +
  starter configs exist, a second run reports every path as skipped, and
  `gate status` + `gate check --wiring` both exit 0.
- **Given** a review artifact with `Verdict: pass` and `Quorum: 2/5 pass`, **When**
  the review gate runs, **Then** it fails naming the quorum; **Given** `3/5 pass` or
  `1/1 pass`, **Then** it passes.
- **Given** the launch pages, **When** the do-not-say lint runs, **Then** zero banned
  claims; **Given** a page with "first ever", **Then** the lint names it.
- **Given** QUICKSTART.md, **When** the command audit runs, **Then** every `gate`
  command shown exists in the CLI.
- **Given** this PRD, **When** `gate check PRD-004` runs, **Then** exit 0.

---

## 7. Technical Considerations

### Architecture

- **Quorum rule**: ratio ≥ 3/5 reconciles doctrine with practice — the calibrated
  panel gate holds, and a single cross-model reviewer (`1/1`) passes as the degenerate
  full-quorum case rather than via a documented exception. Implemented as integer
  arithmetic (`N * 5 >= M * 3`) — no float comparison. Historical review artifacts
  in `_docs/reviews/` are records, not gate inputs for closed PRDs — no retro-editing.
- **Init is additive-only**: never writes over an existing file, never deletes;
  the starter config carries populated defaults for the two highest-churn fields
  (`branches.base`, `idPattern`) so the file teaches its own surface.
- **Whitepaper anonymization** is the default editorial stance (§3 US-3); the owner
  can name the parent in their own editorial pass — recorded as an owner option, not
  an open question.
- **Do-not-say lint is content-scoped**: launch pages only; the research corpus under
  `docs/research/` is historical record and exempt.

### Dependencies

- Runtime: none (unchanged).

### Database Changes

- None.

### API Changes

- CLI: `init` becomes real. `validateReviewArtifact` gains quorum enforcement
  (stricter — a breaking change for pass-with-weak-quorum artifacts, which is the
  point; pre-release, no consumers).

---

## 8. Implementation Scope

### In Scope

- [x] `packages/provegate/src/core/{gates/review.ts,run/init.ts}`, `src/cli.ts`
- [x] `packages/provegate/{QUICKSTART.md,README.md,package.json,schemas}`
- [x] `packages/provegate/test/` (3 new suites)
- [x] `apps/docs/content/docs/` (quickstart, case-study, whitepaper, index, meta)
- [x] `apps/web/app/page.tsx`, root `README.md`
- [x] `_docs/launch/announcement-draft.md`

---

## 9. Open Questions

- (none — the whitepaper-naming decision is recorded in §7 as an owner editorial option)

---

## 10. References

- Roadmap Phase E: `docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md` §Faz E
- Launch copy source: `docs/research/provegate-bootstrap/positioning-and-faq-2026-07-22.md` (§1, §2, §6 do-not-say)
- Evidence source: `docs/research/provegate-bootstrap/whitepaper-gated-autonomy-2026-07-22.md`
- Deferral origin: `_docs/reviews/review-003-method-package.md` + PRD-003 tasks Deferrals
- Adoption-risk note (hotfix-first quickstart): roadmap §3

---

## Conflict Surface

- `packages/provegate/src/**`
- `packages/provegate/test/**`
- `packages/provegate/schemas/**`
- `packages/provegate/QUICKSTART.md`
- `apps/docs/content/**`
- `apps/web/app/**`
- `_docs/launch/**`

---

## Durable Artifacts

- `apps/docs/content/docs/quickstart.mdx` — the adoption path, live
- `apps/docs/content/docs/case-study.mdx` — the evidence, live
- `packages/provegate/README.md` — quickstart + method-assets links

---

## 11. Verification Commands

Run from repo root after `pnpm build`.

| FR    | Command / Check                                                             | Scope     | Notes                                      |
| ----- | --------------------------------------------------------------------------- | --------- | ------------------------------------------ |
| FR-1  | `pnpm --filter provegate test test/review-quorum.test.ts`                   | provegate | arithmetic cases + malformed forms         |
| FR-2  | `pnpm --filter provegate test test/init.test.ts`                            | provegate | tree, idempotency, scaffold passes gates   |
| FR-3  | `grep -c "gate init" packages/provegate/QUICKSTART.md`                      | provegate | walkthrough present; audit in launch suite |
| FR-4  | `grep -c "143" apps/docs/content/docs/case-study.mdx`                       | repo      | calibration figures present with caveats   |
| FR-5  | `grep -c "production SaaS platform" apps/docs/content/docs/whitepaper.mdx`  | repo      | anonymized provenance default              |
| FR-6  | `grep -c "prove it, then let it propagate" README.md`                       | repo      | positioning tagline in place               |
| FR-7  | `test -f _docs/launch/announcement-draft.md`                                | repo      | draft exists (owner edits before posting)  |
| FR-8  | `pnpm --filter provegate test test/content-launch.test.ts`                  | provegate | do-not-say lint + number consistency       |
| FR-9  | `pnpm --filter provegate test test/init.test.ts test/review-quorum.test.ts` | provegate | grouped rerun of both engine suites        |
| FR-10 | `grep -c "quickstart" apps/docs/content/docs/meta.json`                     | repo      | nav wired                                  |

Cross-cutting (all green before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm --filter provegate test` — full suite incl. all prior PRD suites unchanged
- `pnpm build` — clean (both apps too)
- `node packages/provegate/dist/cli.js check PRD-004` — this PRD passes its own gate
- `node packages/provegate/dist/cli.js push; test $? -eq 1` — never-push invariant
- `grep -ri -l -e emofy -e rayvaz packages/provegate/src packages/provegate/QUICKSTART.md && exit 1 || true` — hygiene on new package surfaces

---

## 12. DO NOT (Anti-Patterns)

- DO NOT overclaim: no "first ever", no unmeasured speedup/bug-reduction percentages,
  no badge-jargon verdict labels — the do-not-say lint enforces, but the discipline is
  editorial first.
- DO NOT include competitor-mechanics claims (Spec Kit/Kiro/BMAD internals) — the
  verification research has not run; launch copy stays on our side of the fence.
- DO NOT let `gate init` overwrite or delete anything, ever.
- DO NOT weaken the quorum rule while implementing it (ratio ≥ 3/5; the PRD-003
  lesson is one review old).
- DO NOT name the parent project in launch pages by default (owner's editorial call).
- DO NOT add runtime dependencies; no push code paths; internal git via array args.
- DO NOT retro-edit historical review artifacts to satisfy the new quorum arithmetic —
  they are records; the gate applies from here forward.
- DO NOT fabricate evidence numbers — every figure traces to the whitepaper/calibration
  source documents.

---

## Changelog

| Date       | Author | Changes                                                                                                                                |
| ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-22 | rayvaz | Initial draft                                                                                                                          |
| 2026-07-22 | rayvaz | Phase 2 pre-score fixes: init root resolution + package.json-absent wiring semantics; do-not-say page-class split; integer quorum math |
