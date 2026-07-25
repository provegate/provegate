# Readiness Assessment: PRD-020 — Adopter Enablement

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-020-adopter-enablement.md` |
| Score                  | 6.075/10 |
| Verdict                | ITERATE |
| Iteration              | 1 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | independent GPT-5.6 Terra scorer |
| Self-scored            | no |
| Date                   | 2026-07-25 |
| PRD Lint               | passed — `node packages/provegate/dist/cli.js check PRD-020` exit 0 |
| State Record           | pending — intentionally not updated; this assessment did not run `gate status` |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | Do not assign | The fixture, distribution, and verification contracts require unresolved design choices. |
| Phase 6 (Audit)     | — | Re-score after the PRD names executable assertions for the shipped examples and docs. |

---

## Analysis

### 1. Technical Depth & Architecture

- The low-runtime-risk boundary is sound: no CLI, runner, schema, network, telemetry, or
  push-path change is requested. `loadManifest` is the right integration seam because it
  validates shape and command safety, rather than merely proving the JSON parses.
- FR-3 does not specify the fixture closely enough to implement without deciding behavior:
  `loadManifest` accepts a *root* and always reads `<root>/gates.manifest.json`. The PRD
  does not say whether the fixture loads each example in place or copies it to a temporary
  scaffold, which `WorkflowConfig` it uses, how a plugin path is resolved, or what
  deliberately malformed fixture is supplied. “A malformed example must fail this test”
  is an outcome, not a test design.
- FR-2 says to wire one hard cap to `route-guard-coverage`, but leaves its
  `id`, `when.targetsMatch`, `requireLine`, `message`, and the command path/execution
  form unspecified. Those fields are the hard-cap contract; an agent would have to invent
  the cookbook's central example.
- The package already has `"examples"` in `package.json` `files`, so no `files` edit is
  needed for this directory. But `test/pack-manifest.json` is an exact allowlist of the
  tarball and `test/pack.test.ts` compares it to `npm pack --dry-run`; every new example
  file must be added there. Neither path is in scope, in Targets, or in §11. The claimed
  distribution handling is therefore incomplete.

### 2. Edge Cases & Failure Modes

- Measured facts: no `apps/docs/content/docs/` page currently mentions `--practices`;
  `packages/provegate/examples/` currently contains only `doc-drift`,
  `route-guard-coverage`, and its README. These premises are correct.
- The documented PRD-019 collision is only partly real. PRD-019 targets and claims
  `apps/docs/content/docs/cli.mdx`, but does **not** target, claim, or otherwise name
  `quickstart.mdx`. PRD-020's assertion that both PRDs claim both pages is false.
  The Phase-4 sequencing rule is directionally clear (“PRD-019 Ship Verified”) but is
  not backed by a Phase-4 preflight command or a task requirement that proves the
  dependency status before editing the shared CLI page.
- The examples' core promise is not exercised. A file-existence check can pass with an
  empty manifest, unsafe/invalid commands, no README explanation, or a generic
  monorepo recipe that cannot run. The stated greenfield criterion requires copying into
  a `gate init` scaffold and running the declared floor; no §11 row proves that.
- Docs checks are loose token greps. `grep -rc "init --practices"` proves only a string
  appears and neither that quickstart recommends the practices path with manual steps,
  nor that CLI documents the never-overwrite guarantee. `grep -c brownfield` likewise
  proves neither valid nav registration nor the adoption ladder/failure modes.

### 3. Maintainability & DX

- The proposed gallery split is discoverable and aligns with the existing two example
  plugins. Cross-links can make the package-local and public documentation coherent.
- The PRD calls itself “content, not code,” but FR-3 adds
  `packages/provegate/test/example-manifests.test.ts`; that is a test-code change. The
  accurate boundary is “no production CLI/runner behavior change,” not content-only.
- The final package result must reconcile the exact pack manifest. Omitting that
  obligation guarantees the package test fails after adding the cookbook, and leaving it
  outside the conflict surface creates an undocumented shared-path edit.

### 4. Migration & Rollback

- The user-facing change is additive and rollback is deletion/revert; it stores no data
  and changes no deployed contract.
- PRD-019 Ship Verified is a stated Phase-4 dependency, which is stronger than a vague
  ordering note, but it needs an executable entry condition and its claimed quickstart
  overlap must be corrected. The implementation must also reconcile onto PRD-019's
  shipped `cli.mdx`, not overwrite it.
- `package.json` is correctly excluded from the conflict surface as shared append-only,
  and its existing `files: ["examples"]` covers the new directory. The actual required
  distribution edit is `test/pack-manifest.json`, an exact modified-in-place allowlist;
  the PRD neither owns nor verifies it.

---

## Scorecard

Class `feature` weights, per `prompts/phase-2-readiness-scorer.md`.

| #         | Dimension                | Weight | Score      | Notes |
| --------- | ------------------------ | ------ | ---------- | ----- |
| 1         | Clarity                  | 15%    | 6.0/10     | Targets, runnable root commands, DO NOT list, and resolved questions pass the executability checklist; FR-3 and FR-2 still force fixture/hard-cap design decisions. |
| 2         | Completeness             | 20%    | 5.0/10     | Covers the intended adopter stories, but omits the exact pack-manifest update, valid fixture semantics, executable dependency preflight, and semantic docs proof. |
| 3         | Technical Depth          | 25%    | 5.5/10     | Correct parser seam and low-risk boundary; no concrete generic manifest or hard-cap/plugin contract is specified. |
| 4         | Multi-Tenancy & Security | 20%    | 8.5/10     | No protected route/query/payload surface; parser safety and the no-network/no-push constraints remain applicable. |
| 5         | Scope & Testability      | 10%    | 4.5/10     | Scope is mostly bounded, but nearly every content FR is certified only by existence or token grep rather than its stated behavior. |
| 6         | Migration & Rollback     | 10%    | 6.5/10     | Additive and revertible, but sequencing and exact-package distribution requirements are not fully wired. |
| **Total** | **Weighted**             |        | **6.075/10** | **ITERATE** |

Weighted sum:
`0.15×6.0 + 0.20×5.0 + 0.25×5.5 + 0.20×8.5 + 0.10×4.5 + 0.10×6.5`
= `0.90 + 1.00 + 1.375 + 1.70 + 0.45 + 0.65 = 6.075`.

Hard caps checked — none triggered:

- **Security cap:** not triggered. No protected route, endpoint, or query path is
  touched; the content-only surface does not require a deny-path test.
- **Contract cap:** not triggered. No client→server payload or real external schema ships.
- **Lint cap:** not triggered — `node packages/provegate/dist/cli.js check PRD-020`
  exits 0.
- **ProveGate method caps:** no runtime dependency, network, push path, or untraceable
  method-content change is proposed.

---

## Missing Pieces (watch items)

1. **W1 — specify a real manifest-fixture contract.** Define whether each example is
   copied into a temp `gate init` scaffold or loaded from its example directory; name the
   exact config, expected Phase-4 commands, and plugin-path resolution rule. Add a
   deliberate invalid manifest fixture (or an in-test mutation) and assert `loadManifest`
   throws. Include a copy-and-run assertion for the single-package recipe. This is a
   binding Phase 3 task.
2. **W2 — make the monorepo hard cap copyable, not aspirational.** State the complete
   `hardCaps` object and the `classDefaults` rules, including the exact
   `route-guard-coverage` command/path and a test fixture that demonstrates the cap fires
   when its named evidence is absent. This is a binding Phase 3 task.
3. **W3 — own the tarball allowlist.** Add
   `packages/provegate/test/pack-manifest.json` to scope/Targets and update its exact file
   list for every cookbook file; verify it with `pnpm --filter provegate test
   test/pack.test.ts`. Keep `package.json` out of the conflict surface: its existing
   `files` entry already includes `examples`. This is a binding Phase 3 task.
4. **W4 — replace existence/token greps with semantic evidence.** Per FR, use tests or
   focused assertions that prove manifest validity and README annotations; the brownfield
   ladder's rungs/failure modes and valid nav entry; quickstart's recommended practices
   command/manual caveat; CLI's flag and never-overwrite guarantee; and both required
   cross-links. Greps may remain as a narrow supplemental assertion, never the sole proof.
5. **W5 — make sequencing enforceable and correct.** Correct the false statement that
   PRD-019 also claims `quickstart.mdx`. Add a Phase-4 task/preflight that requires
   PRD-019 to be Ship Verified and preserves its shipped CLI documentation before
   PRD-020 edits `cli.mdx`. This is a binding Phase 3 task.
6. **W6 — correct the scope language.** Replace “content-only” with “no production
   CLI/runner behavior change” and explicitly classify the new Vitest fixture as test
   code. This prevents Phase 6 from treating an implementation change as out-of-scope
   drift.

---

## Iteration History

| # | Date       | Score | Verdict | Key Changes |
| - | ---------- | ----- | ------- | ----------- |
| 1 | 2026-07-25 | 6.075 | ITERATE | Initial independent assessment. Lint passes, but measured package distribution, fixture specification, semantic verification, and PRD-019 overlap gaps prevent autonomous execution. |

> Re-scoring updates Quick Meta and appends a row here — never a new file.

---

## Project-Specific Checklist

- [x] `packages/provegate` retains zero runtime dependencies; no telemetry, network, or
  autonomous push path is proposed.
- [x] No protected route, endpoint, query path, client→server payload, or schema migration
  is introduced.
- [x] Public docs currently contain no `--practices` mention; the stated documentation gap
  is real.
- [x] Existing examples are exactly `doc-drift` and `route-guard-coverage` plus gallery
  README; the stated gallery premise is real.
- [x] `package.json` already includes `examples` in `files`.
- [ ] W1: real-parser fixture defines roots, config, plugin resolution, and malformed case.
- [ ] W2: generic monorepo hard-cap/class-default contract is concrete and exercised.
- [ ] W3: exact tarball allowlist (`test/pack-manifest.json`) is owned and tested.
- [ ] W4: every §11 row proves its FR's behavior, not only a file or token.
- [ ] W5: PRD-019 sequencing has a machine-checkable Phase-4 entry condition; false
  quickstart-overlap claim corrected.
- [ ] W6: content-only wording corrected to acknowledge the new test code.

---

## Verdict

**ITERATE — 6.075/10.** The lint is green and no hard cap is triggered, but the decimal is
not the deciding issue: the PRD leaves the fixture and hard-cap contracts to the
implementer, omits the exact tarball allowlist that will otherwise fail, and treats
existence/token greps as proof of behavior.

Resolve W1–W6, then re-run `node packages/provegate/dist/cli.js check PRD-020` and
independently re-score before Phase 3.
