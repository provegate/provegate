# PRD-020: Adopter Enablement — Manifest Cookbook, Brownfield Playbook, Practices-First Quickstart

> **Status**: Draft
>
> **Created**: 2026-07-25
> **Updated**: 2026-07-25
> **Author**: Cursor, for owner review
> **Audience**: Implementing Agent
> **Slug**: `adopter-enablement`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Autonomous Close**: operator-gated
> **Value**: 3.90 (MF/UI/TL/AR/RM: 3/5/2/5/5)

<!-- 0.25*3 + 0.25*5 + 0.20*2 + 0.15*5 + 0.15*5 = 3.90. -->

---

## 1. Introduction / Overview

`gate init` scaffolds an artifact tree and an **empty** `gates.manifest.json`, and
`gate init --practices` installs the whole practice layer. Both are deliberate: the CLI
never invents gates for a repo it cannot see, and it never overwrites adopter files.
The cost of that honesty is that a new adopter lands on an empty manifest with no
canonical example of what a filled one looks like, and an existing repo has no written
path from "CI I already have" to "floor gates the runner enforces".

The published docs make this worse than it needs to be: `--practices` — the flag that
installs `_brain/`, the hooks, and the `verify:*` library — appears only in the package
`README.md` and `QUICKSTART.md`, and in **no page** under `apps/docs/content/docs/`.
An adopter following the public quickstart never learns the practice layer exists.

This PRD closes the enablement gap with content, not new CLI surface: two canonical
example manifests, one brownfield adoption page, and a docs pass that makes the
practices path first-class. No command behavior changes.

**Dependency:** PRD-019 must be Ship Verified before this PRD enters Phase 4 — both
claim `apps/docs/content/docs/cli.mdx` and `quickstart.mdx` (owner decision, see §9).

---

## 2. Goals

### Primary Goals

- [ ] Give adopters a copyable, schema-valid manifest for the two shapes that actually
      occur: a single-package Node library and an existing monorepo.
- [ ] Write the brownfield ladder: existing CI → `verify:workflow` → empty floors →
      filled floors, with the failure mode of each rung named.
- [ ] Make `gate init --practices` first-class in the published docs, including what
      stays manual and why.
- [ ] Gate the docs against re-drifting away from the shipped flag surface.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Canonical example manifests shipped | 0 | 2 | `examples/manifests/` contents |
| Example manifests that load through the real parser | n/a | 2 | fixture test via `loadManifest` |
| Published docs pages naming `--practices` | 0 | ≥ 2 | grep gate on `apps/docs` |
| Brownfield adoption page | none | 1 | `apps/docs/content/docs/brownfield.mdx` |
| CLI/runner behavior changed | n/a | none | no `src/` file in the conflict surface |

---

## 3. User Stories

#### User Story 1

```
As a maintainer starting a fresh Node library,
I want a manifest I can copy that already wires meaningful floor gates,
so that my first `gate run` enforces something instead of passing vacuously.
```

**Acceptance Criteria:**

- [ ] `examples/manifests/single-package/gates.manifest.json` drops into a repo scaffolded
      by `gate init` and loads without a manifest error.
- [ ] Its README explains every key it uses: Phase 4 floor commands, `classDefaults`,
      and one hard cap.

#### User Story 2

```
As a maintainer of an existing monorepo with its own CI,
I want a written path from my current pipeline to gated floors,
so that adoption is incremental instead of a rewrite.
```

**Acceptance Criteria:**

- [ ] The brownfield page states, per rung, what breaks if you stop there.
- [ ] It covers the empty-manifest starting state explicitly (why `gate run` is green
      and why that green is meaningless).

#### User Story 3

```
As an adopter reading the published docs,
I want to learn about `gate init --practices` from the quickstart,
so that I don't rebuild the memory protocol and verify library by hand.
```

**Acceptance Criteria:**

- [ ] `quickstart.mdx` presents `--practices` as the recommended path and links the
      manual wiring steps the pack prints.
- [ ] `cli.mdx`'s `gate init` entry documents the flag.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1**: Ship `examples/manifests/single-package/` — a `gates.manifest.json` for a
   greenfield single-package Node library (Phase 4 floor: types, lint, test, build;
   one `classDefaults` entry showing how `hotfix` narrows the floor) plus a `README.md`
   annotating every key and naming the failure each gate catches.
   - **Targets:** `packages/provegate/examples/manifests/single-package/gates.manifest.json`
     (new), `packages/provegate/examples/manifests/single-package/README.md` (new)
2. **FR-2**: Ship `examples/manifests/monorepo/` — the same for a **generic** pnpm
   workspace (not a copy of this repo's manifest): filtered per-package floor commands,
   a `classDefaults` split across `feature`/`infra`/`hotfix`, and one hard cap wired to
   the `route-guard-coverage` example plugin so the two galleries connect.
   - **Targets:** `packages/provegate/examples/manifests/monorepo/gates.manifest.json`
     (new), `packages/provegate/examples/manifests/monorepo/README.md` (new)
3. **FR-3**: A fixture test loads both example manifests through the real
   `loadManifest` parser (not `JSON.parse`) and asserts each declares at least one
   Phase 4 floor command and that every referenced example plugin path exists in the
   package. A malformed example must fail this test, not ship.
   - **Targets:** `packages/provegate/test/example-manifests.test.ts` (new)
4. **FR-4**: Add `apps/docs/content/docs/brownfield.mdx`: the adoption ladder (adopt
   `verify:workflow` alongside existing CI → `gate init` into the existing tree →
   fill floors from the cookbook → turn on class defaults and hard caps), each rung
   naming its stop-here failure mode, plus the "empty manifest is honestly green"
   warning. Register it in `meta.json`.
   - **Targets:** `apps/docs/content/docs/brownfield.mdx` (new),
     `apps/docs/content/docs/meta.json`
5. **FR-5**: Make `--practices` first-class in the published docs: `quickstart.mdx`
   presents it as the recommended install and summarizes what stays manual;
   `cli.mdx`'s `gate init` section documents the flag and the never-overwrite guarantee.
   - **Targets:** `apps/docs/content/docs/quickstart.mdx`,
     `apps/docs/content/docs/cli.mdx`
6. **FR-6**: `packages/provegate/QUICKSTART.md` and `examples/README.md` cross-link the
   manifest cookbook so the package-local and published surfaces agree.
   - **Targets:** `packages/provegate/QUICKSTART.md`,
     `packages/provegate/examples/README.md`

---

## 5. Non-Goals (Out of Scope)

- Any change to `gate init`, the runner, or manifest schema semantics — this PRD ships
  content only.
- Shipping domain gates in the package (the ~55 Emofy gates stay out by decision).
- Auto-generating or auto-filling an adopter's manifest.
- Memory documentation (`--memory`, `gate doctor --memory`, `gate memory find`) — owned
  by PRD-018 and PRD-019.
- Persona / day-0-to-day-30 adopter journey narrative.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a repo scaffolded by `gate init`, **When** the single-package example
  manifest is copied over the empty one, **Then** it loads without a manifest error and
  `gate run` executes its floor commands.
- **Given** the published docs build, **When** a reader follows the quickstart, **Then**
  `gate init --practices` appears with its manual-wiring caveat.
- **Given** an example manifest referencing a plugin path that does not exist, **When**
  the fixture test runs, **Then** it fails.

---

## 7. Technical Considerations

### Architecture

- **Content, not code.** The manifest cookbook extends the existing `examples/` gallery
  pattern (zero-dependency script + wiring snippet); nothing under
  `packages/provegate/src/` is touched, which keeps this a low-risk close.
- **The examples must be parsed by the real parser.** A hand-checked JSON example rots
  the first time the manifest shape moves; FR-3 binds the gallery to `loadManifest` so
  a schema change breaks the test instead of the adopter.
- **Sequencing against the memory program.** PRD-019 also writes public CLI
  documentation (`gate doctor --memory`, `gate memory find`). `apps/docs/content/docs/cli.mdx`
  and `quickstart.mdx` therefore appear in both conflict surfaces. The owner resolved
  this by sequencing rather than re-scoping: PRD-019 is already readiness-approved at
  8.425, and widening its scope would force a re-score. This PRD keeps FR-5 and enters
  Phase 4 only after PRD-019 is Ship Verified.
- **`package.json` `files`** must include the new example directory for the published
  tarball; it is a shared append-only manifest and stays out of the conflict surface.

### Dependencies

- PRD-019 Ship Verified (sequencing only, for the shared docs pages). No code dependency.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/examples/manifests/**` (new)
- [ ] `packages/provegate/test/example-manifests.test.ts` (new)
- [ ] `apps/docs/content/docs/brownfield.mdx` (new) + `meta.json`
- [ ] `apps/docs/content/docs/quickstart.mdx`, `cli.mdx`
- [ ] `packages/provegate/QUICKSTART.md`, `packages/provegate/examples/README.md`

---

## 9. Open Questions

(none) — both resolved by owner on 2026-07-25.

**Q1 resolved:** FR-5's `cli.mdx` edit stays in this PRD; the overlap with PRD-019 is
handled by sequencing (Phase 4 after PRD-019 is Ship Verified) rather than by widening
PRD-019, which is already readiness-approved at 8.425.
**Q2 resolved:** the monorepo example is generic, with no dependency on the dogfood
manifest PRD-018 will write.

---

## 10. References

- Gap analysis: P1 items 4–6 (`hardCap`/`classDefaults` cookbook, brownfield playbook,
  `--practices` first-class)
- Existing gallery: `packages/provegate/examples/README.md`
- Practices manual steps: `packages/provegate/practices/NEXT_STEPS.md`
- Empty-manifest rationale: `apps/docs/content/docs/quickstart.mdx` (line ~99)

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `packages/provegate/examples/**`
- `packages/provegate/test/example-manifests.test.ts`
- `packages/provegate/QUICKSTART.md`
- `apps/docs/content/docs/brownfield.mdx`
- `apps/docs/content/docs/quickstart.mdx`
- `apps/docs/content/docs/cli.mdx`
- `apps/docs/content/docs/meta.json`

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Review artifact: `_docs/reviews/review-020-adopter-enablement.md`
- Learning: `none` — expected to be a content PRD; add a `_brain/learnings/` record only
  if the close surfaces a non-derivable trap (declare it here before Phase 4 if so).

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                                            | Scope | Notes                                     |
| ---- | -------------------------------------------------------------------------- | ----- | ----------------------------------------- |
| FR-1 | `test -f packages/provegate/examples/manifests/single-package/gates.manifest.json` | pkg   | greenfield example ships                  |
| FR-2 | `test -f packages/provegate/examples/manifests/monorepo/gates.manifest.json` | pkg   | monorepo example ships                    |
| FR-3 | `pnpm --filter provegate test test/example-manifests.test.ts`               | pkg   | real parser + plugin paths asserted       |
| FR-4 | `test -f apps/docs/content/docs/brownfield.mdx`                             | docs  | brownfield page exists                    |
| FR-4 | `grep -c brownfield apps/docs/content/docs/meta.json`                       | docs  | page registered in the nav                |
| FR-5 | `grep -rc "init --practices" apps/docs/content/docs/quickstart.mdx`         | docs  | practices path published                  |
| FR-5 | `grep -rc "init --practices" apps/docs/content/docs/cli.mdx`                | docs  | flag documented in the CLI reference      |
| FR-6 | `grep -c manifests packages/provegate/examples/README.md`                   | pkg   | gallery cross-links the cookbook          |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build

Hard caps (when your gates manifest configures them):

- Deny test: n/a — no protected surface is touched (content-only PRD)
- Contract test: n/a — no client→server payload ships

Before Phase 2 PASS, run: `gate check PRD-020`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT change `gate init`, the runner, or the manifest schema to make an example
  work — the example adapts to the shipped surface, never the reverse.
- DO NOT ship an example manifest whose commands cannot actually run in the shape it
  claims to describe.
- DO NOT copy domain gates out of the source inventory into the package.
- DO NOT document memory commands that PRD-018/019 have not shipped yet.

---

## Changelog

| Date       | Author | Changes                                                                      |
| ---------- | ------ | ---------------------------------------------------------------------------- |
| 2026-07-25 | Cursor | Initial draft from the vision gap analysis (P1 4–6)                          |
| 2026-07-25 | Cursor | Open Questions resolved by owner: keep FR-5 and sequence after PRD-019; generic monorepo example |
