# PRD-020: Adopter Enablement — Manifest Cookbook, Brownfield Playbook, Practices-First Quickstart

> **Status**: Approved
>
> **Created**: 2026-07-25
> **Updated**: 2026-07-25
> **Author**: Cursor, for owner review
> **Audience**: Implementing Agent
> **Slug**: `adopter-enablement`
> **Cycle Phase**: 3 (Task Generation)
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

This PRD closes the enablement gap with shipped content and the tests that keep it
honest: two canonical example manifests, one brownfield adoption page, and a docs pass
that makes the practices path first-class. **No production CLI or runner behavior
changes** — the only executable code added is test code (Vitest fixtures) and the
package's exact tarball allowlist is updated to match the new files.

**Dependency:** PRD-019 must be Ship Verified before this PRD enters Phase 4. PRD-019
claims `apps/docs/content/docs/cli.mdx` and `packages/provegate/QUICKSTART.md`; this PRD
edits both, and must reconcile onto PRD-019's shipped text rather than overwrite it.

---

## 2. Goals

### Primary Goals

- [ ] Give adopters a copyable, parser-valid manifest for the two shapes that actually
      occur: a single-package Node library and a generic pnpm monorepo.
- [ ] Write the brownfield ladder: existing CI → `verify:workflow` → empty floors →
      filled floors, with the failure mode of each rung named.
- [ ] Make `gate init --practices` first-class in the published docs, including what
      stays manual and why.
- [ ] Prove the shipped content by behavior — the examples load through the real parser
      and the docs claims are asserted, not grepped.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Canonical example manifests shipped | 0 | 2 | `examples/manifests/` contents |
| Example manifests that load through `loadManifest` | n/a | 2 | `example-manifests.test.ts` |
| Declared commands that resolve only inside the package checkout | n/a | 0 | adopter-path assertion |
| Malformed manifest fixtures proven to throw | 0 | 2 | mutation cases in the same test |
| Published docs pages naming `--practices` | 0 | ≥ 2 | `content-adoption.test.ts` |
| Tarball allowlist entries missing for new files | n/a | 0 | `pack.test.ts` |
| Production CLI/runner behavior changed | n/a | none | no `src/` path in scope |

---

## 3. User Stories

#### User Story 1

```
As a maintainer starting a fresh Node library,
I want a manifest I can copy that already wires meaningful floor gates,
so that my first `gate run` enforces something instead of passing vacuously.
```

**Acceptance Criteria:**

- [ ] `examples/manifests/single-package/gates.manifest.json`, copied into a repo
      scaffolded by `gate init`, loads through `loadManifest` without a `ManifestError`.
- [ ] Every command it declares passes `isSafeCommand` — a cookbook entry the runner
      would refuse is not a cookbook entry.
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

- [ ] `quickstart.mdx` presents `--practices` as the recommended path and states that
      wiring steps stay manual.
- [ ] `cli.mdx`'s `gate init` entry documents the flag and the never-overwrite guarantee,
      **and** still documents PRD-019's shipped memory commands.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1**: Ship `examples/manifests/single-package/` — a `gates.manifest.json` for a
   greenfield single-package Node library plus a `README.md` annotating every key and
   naming the failure each gate catches. The manifest declares `phases["4"]` with exactly
   the four floor commands **in the shipped default's order** (`npm run check-types`,
   `npm run lint`, `npm run build`, `npm run test` — `defaultManifest()` builds before it
   tests, and a cookbook that teaches the floor must not invert it),
   `postMerge` with check-types and build, an empty `wiringExceptions`,
   and one `classDefaults.hotfix` rule. **Class defaults are additive only** — the runner
   merges their `run` commands onto Phase 4 (`gates/classes.ts` pushes, never subtracts),
   so the hotfix rule adds a focused gate and the README states plainly that narrowing a
   floor means editing `phases["4"]`, not writing a class default.
   - **Targets:** `packages/provegate/examples/manifests/single-package/gates.manifest.json`
     (new), `packages/provegate/examples/manifests/single-package/README.md` (new)
2. **FR-2**: Ship `examples/manifests/monorepo/` — the same for a **generic** pnpm
   workspace (not a copy of this repo's manifest), carrying the canonical values already
   published by the `route-guard-coverage` gallery entry rather than a re-invented
   contract: `hardCaps[0]` is exactly ``{ "id": "route-deny-test", "when": { "targetsMatch":
   ["src/routes/**"] }, "requireLine": "Deny test: `[^`]+`", "message": "targets touch
   routes - name a runnable deny-path test line" }``, and `classDefaults` carries a
   `when.diffMatches: ["src/routes/**"]` rule running `pnpm verify:route-guards` for
   `feature` and `hotfix`, plus one `infra` rule. The invoked command is the **adopter's**
   script, not a package-internal path: the README's first step is copying
   `examples/route-guard-coverage/check.mjs` into the adopter's repo as
   `scripts/verify-route-guards.mjs` and adding the `verify:route-guards` package script,
   matching what the plugin README already instructs. The README also shows the cap
   firing: which FR target path triggers it and which PRD line satisfies it.
   - **Targets:** `packages/provegate/examples/manifests/monorepo/gates.manifest.json`
     (new), `packages/provegate/examples/manifests/monorepo/README.md` (new)
3. **FR-3**: A fixture test proves the examples by behavior, asserting the promised
   content rather than mere parseability. For each example: create a temp directory, copy
   the example's `gates.manifest.json` to `<tmp>/gates.manifest.json`
   (`loadManifest(config, root)` always reads that filename at the root it is given), call
   `loadManifest(DEFAULT_CONFIG, tmp)`, and assert it returns without throwing and that
   every command in every phase, class default, and `postMerge` list satisfies
   `isSafeCommand`. Then assert the specifics: the single-package `phases["4"]` equals the
   four FR-1 commands in order; the monorepo manifest's `hardCaps` is non-empty, its first
   entry carries all four `HardCap` fields non-empty, its `requireLine` compiles as a
   `RegExp`, and its `classDefaults` has a rule for `feature`, `hotfix`, and `infra`; and
   each README mentions every command its manifest declares plus the failure that command
   catches. Two mutation cases must FAIL loudly: a manifest with an unknown top-level key
   and one whose `hardCaps[0]` drops `requireLine` both throw `ManifestError`. A third
   asserts the cap contract itself: a PRD body without the `Deny test:` line does not
   satisfy `requireLine`, and one with it does.
   - **Targets:** `packages/provegate/test/example-manifests.test.ts` (new)
4. **FR-4**: Add `apps/docs/content/docs/brownfield.mdx`: the adoption ladder (adopt
   `verify:workflow` alongside existing CI → `gate init` into the existing tree → fill
   floors from the cookbook → turn on class defaults and hard caps), each rung naming
   its stop-here failure mode, plus the "empty manifest is honestly green" warning.
   Register it in `meta.json`.
   - **Targets:** `apps/docs/content/docs/brownfield.mdx` (new),
     `apps/docs/content/docs/meta.json`
5. **FR-5**: Make `--practices` first-class in the published docs: `quickstart.mdx`
   presents it as the recommended install and states that wiring stays manual;
   `cli.mdx`'s `gate init` section documents the flag and the never-overwrite guarantee.
   The edit is additive — PRD-019's shipped memory-command documentation stays intact.
   - **Targets:** `apps/docs/content/docs/quickstart.mdx`,
     `apps/docs/content/docs/cli.mdx`
6. **FR-6**: `packages/provegate/QUICKSTART.md` and `examples/README.md` cross-link the
   manifest cookbook so the package-local and published surfaces agree.
   - **Targets:** `packages/provegate/QUICKSTART.md`,
     `packages/provegate/examples/README.md`
7. **FR-7**: A docs-content test asserts the claims rather than the tokens, following the
   established `content-launch.test.ts` pattern of reading `apps/docs` from the package
   suite: `quickstart.mdx` contains the `--practices` invocation **and** a manual-wiring
   caveat; `cli.mdx` documents the flag, the never-overwrite guarantee, and still
   contains PRD-019's memory commands; `brownfield.mdx` names every ladder rung with a
   failure mode and is registered in `meta.json`'s `pages` array; both cross-links from
   FR-6 resolve to files that exist.
   - **Targets:** `packages/provegate/test/content-adoption.test.ts` (new)
8. **FR-8**: Update the exact tarball allowlist. `package.json` `files` already ships
   `examples`, but `test/pack-manifest.json` is a byte-exact list compared against
   `npm pack --dry-run` by `test/pack.test.ts`; every new cookbook file is added there.
   - **Targets:** `packages/provegate/test/pack-manifest.json`

---

## 5. Non-Goals (Out of Scope)

- Any change to `gate init`, the runner, or manifest schema semantics — the only
  executable code this PRD adds is test code.
- Shipping domain gates in the package (the ~55 Emofy gates stay out by decision).
- Auto-generating or auto-filling an adopter's manifest.
- Memory documentation (`--memory`, `gate doctor --memory`, `gate memory find`) — owned
  by PRD-018 and PRD-019; this PRD must preserve it, not extend it.
- Persona / day-0-to-day-30 adopter journey narrative.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** either example manifest copied to a temp root, **When** `loadManifest` runs
  against it, **Then** it returns a manifest whose `phases["4"]` is non-empty and whose
  every command is `isSafeCommand`.
- **Given** an example manifest mutated to carry an unknown top-level key, **When** the
  fixture runs, **Then** `loadManifest` throws `ManifestError`.
- **Given** the monorepo example's `requireLine`, **When** it is applied to a PRD body
  with no `Deny test:` line, **Then** it finds no match, and **When** applied to one that
  names a deny test, **Then** it matches.
- **Given** an adopter who copied only the manifest, **When** they follow the README's
  first step, **Then** every command it declares resolves to a script in their own repo.
- **Given** the published docs, **When** `content-adoption.test.ts` runs, **Then**
  quickstart's practices recommendation, cli's never-overwrite guarantee, and
  brownfield's ladder rungs are each asserted present.
- **Given** PRD-019's shipped memory-command docs, **When** this PRD's `cli.mdx` edit
  lands, **Then** those sections are still present.
- **Given** the new cookbook files, **When** `pack.test.ts` runs, **Then** the tarball
  allowlist matches `npm pack --dry-run` exactly.

---

## 7. Technical Considerations

### Architecture

- **Content plus its proof.** The cookbook extends the existing `examples/` gallery
  pattern (zero-dependency script + wiring snippet). Nothing under
  `packages/provegate/src/` is touched; the new Vitest fixtures are test code, and Phase
  6 should read them as in-scope rather than as drift.
- **The examples must be parsed by the real parser.** A hand-checked JSON example rots
  the first time the manifest shape moves; FR-3 binds the gallery to `loadManifest` so a
  schema change breaks the test instead of the adopter. `loadManifest(config, root)`
  resolves `<root>/gates.manifest.json`, which is why the fixture copies rather than
  loads in place.
- **Cookbook commands run in the adopter's repo, not ours.** A manifest is copied out of
  the package by definition, so any command naming a package-internal path (for example
  `node examples/route-guard-coverage/check.mjs`) is dead on arrival. Every command in
  both examples resolves against the adopter's own tree, and the README states the copy
  step that makes it true.
- **Reading `apps/docs` from the package suite is an established pattern.**
  `test/content-launch.test.ts` already asserts over `apps/docs/content/docs/*.mdx`, and
  turbo's `test` task declares no narrowed `inputs` (`verify:turbo-inputs` keeps it that
  way), so FR-7 cannot replay a stale cached green.
- **Sequencing against the memory program.** PRD-019's conflict surface claims
  `apps/docs/content/docs/cli.mdx` and `packages/provegate/QUICKSTART.md` — not the
  docs-site `quickstart.mdx`. The owner resolved the overlap by sequencing rather than
  re-scoping: PRD-019 is already readiness-approved at 8.425 and widening it would force
  a re-score. The Phase 3 plan therefore opens with a preflight task that fails unless
  `_state/prds.json` records PRD-019 as Ship Verified, and FR-7 asserts coexistence
  afterwards.
- **Distribution.** `package.json` `files` already contains `examples` and stays out of
  the conflict surface as a shared append-only manifest; the real distribution edit is
  the exact allowlist in `test/pack-manifest.json` (FR-8).

### Dependencies

- PRD-019 Ship Verified (sequencing only). No code dependency.
- **PRD-023 is a second one, as of its 2026-07-25 scope expansion.** `gate queue` reports
  `PRD-020 <-> PRD-023: packages/provegate/test/pack-manifest.json` — PRD-023 now edits the
  shipped-file allowlist because it removes three scripts from the practices pack, and this
  PRD edits the same allowlist for its examples. PRD-023 runs last in the wave, so
  sequencing already resolves it; what changed is that the two may not run concurrently.
- **Parallelism, measured rather than assumed.** With PRD-019 Ship Verified, this PRD may
  run **concurrently with PRD-021 or PRD-022** — neither intersects its surface. It may
  **not** run concurrently with PRD-023 (above). The wave order recorded elsewhere
  (`017 → 018 → 019 → 021 → 020 → 022 → 023`) is one valid serialization, not the only one.
  The other pair that must stay serialized is PRD-021 and PRD-022, on
  `packages/provegate/src/cli.ts`. **Run `gate queue` before claiming** — this note is a
  measurement with a date on it, and it has already moved once: an earlier version of it
  said PRD-019 was the only overlap, and PRD-023's expansion falsified that within a day.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/examples/manifests/**` (new)
- [ ] `packages/provegate/test/example-manifests.test.ts` (new, test code)
- [ ] `packages/provegate/test/content-adoption.test.ts` (new, test code)
- [ ] `packages/provegate/test/pack-manifest.json` (exact tarball allowlist)
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
- Readiness W1–W6: `_readiness/wip/readiness-020-adopter-enablement.md`
- Existing gallery: `packages/provegate/examples/README.md`
- Manifest contract: `packages/provegate/src/core/gates/manifest.ts` (`HardCap`,
  `ClassRule`, `loadManifest`)
- Docs-content precedent: `packages/provegate/test/content-launch.test.ts`
- Practices manual steps: `packages/provegate/practices/NEXT_STEPS.md`

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
- `packages/provegate/test/content-adoption.test.ts`
- `packages/provegate/test/pack-manifest.json`
- `packages/provegate/QUICKSTART.md`
- `apps/docs/content/docs/brownfield.mdx`
- `apps/docs/content/docs/quickstart.mdx`
- `apps/docs/content/docs/cli.mdx`
- `apps/docs/content/docs/meta.json`

---

## Memory Inputs

- applied: `append-only-manifest-union-driver` — the example manifests this PRD ships are
  regenerable, so they are subtracted from conflict surfaces rather than unioned; the
  record's rule decides how `pack-manifest.json` is treated when two items touch it.
- applied: `false-green-on-missing-file` — every example must be checked by a gate that
  exits non-zero when the example file is absent, or a deleted example passes as adopted.
- reviewed: `turbo-cache-masks-out-of-input-reads` — example fixtures are read by the
  package test task, so they are declared inputs or a cached green replays over them.

## Memory Outputs

- none — adoption examples and their gates are fully derivable from the manifests and
  tests this PRD ships. Append an exact learning path only if a brownfield adoption
  surfaces a trap the examples cannot state.

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

| FR   | Command / Check                                                     | Scope | Notes                                                        |
| ---- | --------------------------------------------------------------------- | ----- | -------------------------------------------------------------- |
| FR-1 | `pnpm --filter provegate test test/example-manifests.test.ts`           | pkg   | single-package example loads, commands safe                     |
| FR-2 | `pnpm --filter provegate test test/example-manifests.test.ts`           | pkg   | monorepo hard cap complete, plugin path resolves                |
| FR-3 | `pnpm --filter provegate test test/example-manifests.test.ts`           | pkg   | the fixture itself, including both mutation cases               |
| FR-4 | `pnpm --filter provegate test test/content-adoption.test.ts`            | pkg   | ladder rungs + failure modes + nav registration asserted        |
| FR-5 | `pnpm --filter provegate test test/content-adoption.test.ts`            | pkg   | practices recommendation, never-overwrite, memory docs preserved |
| FR-6 | `pnpm --filter provegate test test/content-adoption.test.ts`            | pkg   | both cross-links resolve                                        |
| FR-7 | `pnpm --filter provegate test test/content-adoption.test.ts`            | pkg   | the docs-content fixture itself                                 |
| FR-8 | `pnpm --filter provegate test test/pack.test.ts`                        | pkg   | tarball allowlist matches npm pack exactly                      |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build

Hard caps (when your gates manifest configures them):

- Deny test: n/a — no protected route, endpoint, or query path is touched.
- Contract test: n/a — no client→server payload ships.

Before Phase 2 PASS, run: `gate check PRD-020`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT change `gate init`, the runner, or the manifest schema to make an example
  work — the example adapts to the shipped surface, never the reverse.
- DO NOT ship an example manifest whose commands `isSafeCommand` would refuse.
- DO NOT write a command that only resolves inside this package's checkout.
- DO NOT describe a class default as narrowing a floor; the runner only adds.
- DO NOT ship the monorepo example with an empty `hardCaps` array.
- DO NOT prove a docs claim with a bare token grep; assert the claim.
- DO NOT overwrite or trim PRD-019's shipped memory-command documentation in `cli.mdx`.
- DO NOT enter Phase 4 before `_state/prds.json` records PRD-019 as Ship Verified.
- DO NOT copy domain gates out of the source inventory into the package.

---

## Changelog

| Date       | Author | Changes                                                                      |
| ---------- | ------ | ---------------------------------------------------------------------------- |
| 2026-07-25 | Cursor | Initial draft from the vision gap analysis (P1 4–6)                          |
| 2026-07-25 | Cursor | Open Questions resolved by owner: keep FR-5 and sequence after PRD-019; generic monorepo example |
| 2026-07-25 | Cursor | Readiness iteration 1 (ITERATE 6.075): fixture and hard-cap contracts specified, tarball allowlist owned (FR-8), token greps replaced by a docs-content test (FR-7), PRD-019 overlap corrected, scope language fixed to "no production CLI/runner change" |
| 2026-07-25 | Cursor | Readiness iteration 2 (ITERATE 7.000): hard-cap and class-default values written out from the shipped gallery entry, plugin command made adopter-relative, FR-3 assertions extended to the promised manifest and README content, and the false "class defaults narrow the floor" claim removed |
| 2026-07-25 | Claude Opus 5, via owner | Sequencing note only — no FR, Target, Conflict Surface entry, dependency, or verification command changed, and the readiness verdict is untouched. `gate queue` measures this PRD's Conflict Surface as intersecting PRD-019's and nothing else in the wave, so the recorded serial wave order is one valid ordering rather than a constraint: after PRD-019 is Ship Verified this PRD may run concurrently with PRD-021, PRD-022, or PRD-023. Only PRD-021 and PRD-022 must stay serialized, on `packages/provegate/src/cli.ts` |
| 2026-07-25 | Claude Opus 5, on owner direction | Dependency correction, no FR or Target change. PRD-023's scope expansion (its FR-8 removes three scripts from the practices pack) made it edit `packages/provegate/test/pack-manifest.json`, which this PRD also edits for its examples — `gate queue` now reports the overlap. The earlier note that this PRD's surface intersects PRD-019's *and nothing else* is void. Parallelism is now: concurrent with PRD-021 or PRD-022 once PRD-019 ships; **not** concurrent with PRD-023. PRD-023 runs last, so sequencing already resolves it |
