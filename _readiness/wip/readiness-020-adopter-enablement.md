# Readiness Assessment: PRD-020 — Adopter Enablement

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-020-adopter-enablement.md` |
| Score                  | 7.000/10 |
| Verdict                | ITERATE |
| Iteration              | 2 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit)     | — |
| Scored by              | independent GPT-5.6 Terra scorer |
| Self-scored            | no |
| Date                   | 2026-07-25 |
| PRD Lint               | passed — `node packages/provegate/dist/cli.js check PRD-020` exit 0 (iteration 2) |
| State Record           | pending — intentionally not updated; this assessment did not run `gate status` |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | Do not assign | The fixture, distribution, and verification contracts require unresolved design choices. |
| Phase 6 (Audit)     | — | Re-score after the example commands and class-default semantics are made executable. |

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

### Iteration 2 Addendum — Revision Verification

- **W1 resolved.** FR-3 now specifies temporary-root copying, `DEFAULT_CONFIG`,
  `loadManifest`, a non-empty Phase 4 assertion, command safety, package plugin-path
  existence, and two named `ManifestError` mutations. This is a material, implementable
  fixture contract.
- **W3 resolved.** FR-8 owns `test/pack-manifest.json` and its real exact-tarball test;
  `package.json` remains correctly out of scope because its existing `files` entry already
  includes `examples`.
- **W5 and W6 resolved.** The false docs-site quickstart overlap is corrected, the Phase
  3 preflight requires PRD-019 Ship Verified, the docs fixture must preserve its memory
  documentation, and the PRD accurately calls the new executable work test code rather
  than content-only work.
- **W2 remains open.** FR-2 names `HardCap` fields but does not write their values.
  The existing route-guard example already supplies a concrete object
  (`route-deny-test`, `src/routes/**`, `Deny test: \`[^\`]+\``, and its message); saying
  that the manifest must contain fields leaves the implementing agent to choose a
  different contract. More seriously, the specified `node examples/route-guard-coverage/check.mjs`
  resolves only in a checkout containing that directory. A generic adopter who copies
  only the manifest cannot run it; the shipped plugin README instead directs the adopter
  to copy the script and wire a local `pnpm verify:route-guards` command.
- **W4 is only partially resolved.** Replacing greps with named Vitest fixtures is the
  right shape, and FR-7 concretely covers the docs. The example fixture does not require
  the exact four single-package commands, a non-empty/meaningful hard-cap array, all
  `classDefaults`/`postMerge` commands, or either README's promised explanations. An empty
  `hardCaps` array and a misleading README can still parse and pass every stated §11
  command.
- **New W7 — class defaults cannot narrow a floor.** FR-1 requires the four Phase-4
  floor commands and says `classDefaults.hotfix` “narrows” that floor. The live runner
  merges class-default commands *onto* Phase 4 (`resolveClassGates` plus
  `mergeGateCommands`); it has no subtraction/override behavior. The described outcome
  is impossible without a production semantic change that the PRD prohibits.

---

## Scorecard

Class `feature` weights, per `prompts/phase-2-readiness-scorer.md`.

| #         | Dimension                | Weight | Score      | Notes |
| --------- | ------------------------ | ------ | ---------- | ----- |
| 1         | Clarity                  | 15%    | 7.0/10     | The executability checklist passes and FR-3 is concrete, but FR-2 still omits the actual hard-cap contract and describes an adopter command that cannot run in the claimed copy-only shape. |
| 2         | Completeness             | 20%    | 6.5/10     | Tarball ownership, docs semantics, and sequencing are now covered; example semantics still permit empty hard caps and unverified README claims. |
| 3         | Technical Depth          | 25%    | 6.0/10     | Correct parser seam and package audit, but a class default cannot narrow Phase 4 and the generic plugin invocation is not portable to an adopter repository. |
| 4         | Multi-Tenancy & Security | 20%    | 8.5/10     | No protected route/query/payload surface; parser safety and the no-network/no-push constraints remain applicable. |
| 5         | Scope & Testability      | 10%    | 6.5/10     | Every FR now invokes a test, but the example test's specified assertions do not prove all promised manifest and README behavior. |
| 6         | Migration & Rollback     | 10%    | 8.0/10     | Additive, reversible, and now owns distribution; PRD-019 sequencing is a stated preflight rather than merely a note. |
| **Total** | **Weighted**             |        | **7.000/10** | **ITERATE** |

Weighted sum:
`0.15×7.0 + 0.20×6.5 + 0.25×6.0 + 0.20×8.5 + 0.10×6.5 + 0.10×8.0`
= `1.05 + 1.30 + 1.50 + 1.70 + 0.65 + 0.80 = 7.000`.

Hard caps checked — none triggered:

- **Security cap:** not triggered. No protected route, endpoint, or query path is
  touched; the content-only surface does not require a deny-path test.
- **Contract cap:** not triggered. No client→server payload or real external schema ships.
- **Lint cap:** not triggered — `node packages/provegate/dist/cli.js check PRD-020`
  exits 0.
- **ProveGate method caps:** no runtime dependency, network, push path, or untraceable
  method-content change is proposed.

---

## Missing Pieces (iteration 2 watch items)

1. **W1 — resolved.** FR-3 now has the requested root/config/parser/path/mutation
   contract.
2. **W2 — still open: make the hard cap and plugin runnable.** Write the actual object
   values in FR-2 (the existing example is the canonical source), state where a generic
   adopter copies the plugin, and wire a command that resolves there. Add a fixture that
   proves the cap fires without its required evidence and passes with it.
3. **W3 — resolved.** FR-8 owns the exact tarball allowlist and runs `pack.test.ts`.
4. **W4 — still open: make example evidence semantic.** Require
   `example-manifests.test.ts` to assert every stated Phase-4/class-default/post-merge
   command, the non-empty concrete hard cap and its four fields, and the README key/failure
   explanations. Keep FR-7's docs assertions.
5. **W5 — resolved.** The overlap claim is corrected; the Ship Verified preflight and
   preservation requirement are explicit.
6. **W6 — resolved.** The PRD distinguishes test code from production behavior.
7. **W7 — new: reconcile class-default semantics.** Remove “hotfix narrows the floor,”
   or change the example to demonstrate class defaults adding conditional gates. Do not
   change runner semantics under this PRD.

---

## Iteration History

| # | Date       | Score | Verdict | Key Changes |
| - | ---------- | ----- | ------- | ----------- |
| 1 | 2026-07-25 | 6.075 | ITERATE | Initial independent assessment. Lint passes, but measured package distribution, fixture specification, semantic verification, and PRD-019 overlap gaps prevent autonomous execution. |
| 2 | 2026-07-25 | 7.000 | ITERATE | W1, W3, W5, and W6 resolved; docs tests replace greps. Re-score found the monorepo command is not runnable by a copy-only adopter, FR-2 still lacks actual hard-cap values, and class defaults cannot narrow Phase 4. |

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
- [x] W1: real-parser fixture defines roots, config, plugin resolution, and malformed case.
- [ ] W2: generic monorepo hard-cap/class-default contract has exact values and an
  adopter-runnable plugin command.
- [x] W3: exact tarball allowlist (`test/pack-manifest.json`) is owned and tested.
- [ ] W4: every §11 test proves all promised example and README behavior, not only
  parser acceptance and docs claims.
- [x] W5: PRD-019 sequencing has a Ship Verified preflight; the false quickstart-overlap
  claim is corrected.
- [x] W6: scope wording acknowledges the new test code.
- [ ] W7: class-default example matches the runner's additive semantics.

---

## Verdict

**ITERATE — 7.000/10.** The lint is green and no hard cap is triggered. The revision
substantially improves testability, distribution, sequencing, and scope accuracy, but it
still makes a generic adopter run a package-checkout-relative plugin command, does not
state the hard-cap values it asks the implementer to write, and requires a class default
to perform an operation the runner cannot perform.

Resolve W2, W4, and W7, then re-run `node packages/provegate/dist/cli.js check PRD-020` and
independently re-score before Phase 3.
