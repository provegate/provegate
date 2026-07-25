# Tasks: Adopter Enablement

> **PRD**: [prd-020-adopter-enablement.md](../../_prds/wip/prd-020-adopter-enablement.md)
> **Readiness**: [readiness-020-adopter-enablement.md](../../_readiness/wip/readiness-020-adopter-enablement.md)
> **Status**: Not Started
> **Readiness Score**: 8.5/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-25
> **Updated**: 2026-07-25

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- Phase 4 agents hold a valid PRD-020 lock lease before editing implementation files or
  this ledger.
- Autonomous Close is **operator-gated**: the merge gate refuses until an owner-signed
  acceptance entry exists.
- No sub-task may introduce `any`, a lint bypass, a swallowed failure, a runtime
  dependency, a network call, or a push code path.
- **Phase 4 may not start until `_state/prds.json` records PRD-019 as Ship Verified**
  (task 0.2). This PRD edits two files PRD-019 owns.

---

## Memory Context

Records to open and confirm still accurate before the dependent task starts (task 0.3).

- `turbo-cache-masks-out-of-input-reads` — the docs test reads `apps/docs` from the
  package suite; the `test` task must keep its un-narrowed inputs or the assertion
  replays a cached green.
- `false-green-on-missing-file` — every new assertion must fail when its target file is
  absent, not skip.
- `notes-column-runs-commands` — never put a backticked token in a §11 Notes cell; the
  parser reads the whole row and `gate check` refuses it as an unsafe command.

---

## Relevant Files

### Shipped cookbook content

- `packages/provegate/examples/manifests/single-package/gates.manifest.json` — new;
  greenfield floor, one additive `classDefaults.hotfix` rule, `postMerge`.
- `packages/provegate/examples/manifests/single-package/README.md` — new; every key
  annotated with the failure it catches.
- `packages/provegate/examples/manifests/monorepo/gates.manifest.json` — new; generic
  workspace, the canonical `route-deny-test` hard cap, three class rules.
- `packages/provegate/examples/manifests/monorepo/README.md` — new; the copy-the-plugin
  first step, then the cap firing walk-through.
- `packages/provegate/examples/README.md` — gallery cross-link.
- `packages/provegate/QUICKSTART.md` — cookbook cross-link.

### Published docs

- `apps/docs/content/docs/brownfield.mdx` — new; the adoption ladder.
- `apps/docs/content/docs/meta.json` — nav registration.
- `apps/docs/content/docs/quickstart.mdx`, `apps/docs/content/docs/cli.mdx` — the
  `--practices` pass, additive over PRD-019's shipped memory documentation.

### Tests and distribution

- `packages/provegate/test/example-manifests.test.ts` — new; the real-parser fixture.
- `packages/provegate/test/content-adoption.test.ts` — new; semantic docs assertions.
- `packages/provegate/test/pack-manifest.json` — the exact tarball allowlist.

### Notes

- The examples are **copied out of the package** by definition. Every command they
  declare must resolve in the adopter's tree, never against `examples/` here.
- `package.json` `files` already contains `examples`; it stays out of the conflict
  surface as a shared append-only manifest. The real distribution edit is
  `test/pack-manifest.json`.

---

## Tasks

- [ ] 0.0 Pre-flight and ownership
  - [ ] 0.1 Run `gate open PRD-020 --worktree` from the base checkout; confirm the lease
        covers the PRD Conflict Surface and record branch/worktree in the Progress Log.
  - [ ] 0.2 W5 — verify the dependency before touching a shared page: confirm
        `_state/prds.json` records PRD-019 as Ship Verified, and record the check in the
        Progress Log. If it is not, STOP — the remaining tasks are blocked, not deferred.
  - [ ] 0.3 Open the three Memory Context records; confirm the paths and commands each
        one names still exist and note any stale finding in **Deferrals & Decisions**.
  - [ ] 0.4 Capture the green baseline for `pnpm test`, `pnpm verify:workflow`, and
        `pnpm --filter provegate test test/pack.test.ts` in the Progress Log; a
        pre-existing red is ledgered, never normalized silently.

- [ ] 1.0 FR-1 — Single-package cookbook entry
  - [ ] 1.1 Write
        `packages/provegate/examples/manifests/single-package/gates.manifest.json` with
        `phases["4"]` = the four floor commands in `defaultManifest()`'s order
        (`npm run check-types`, `npm run lint`, `npm run build`, `npm run test` — build
        precedes test in the shipped default, so the cookbook must not invert it),
        `postMerge` = check-types and build, `wiringExceptions` = `{}`, and exactly one
        additive `classDefaults.hotfix` rule.
  - [ ] 1.2 W7 — write
        `packages/provegate/examples/manifests/single-package/README.md` so it annotates
        every key with the failure that key catches, and states plainly that class
        defaults are **additive only**: `gates/classes.ts` pushes their `run` commands
        onto Phase 4 and never subtracts, so narrowing a floor means editing
        `phases["4"]`. Do not describe a class default as narrowing anything.
  - [ ] 1.3 Confirm every command the file declares would resolve in an adopter repo
        scaffolded by `gate init` — no path under `examples/`, no repo-specific filter.

- [ ] 2.0 FR-2 — Monorepo cookbook entry (W2)
  - [ ] 2.1 Write `packages/provegate/examples/manifests/monorepo/gates.manifest.json`
        with `hardCaps[0]` carrying the canonical values already published by
        `examples/route-guard-coverage/README.md` — `id: route-deny-test`,
        `when.targetsMatch: ["src/routes/**"]`, the `Deny test:` `requireLine`, and its
        message — copied, not re-invented.
  - [ ] 2.2 Add `classDefaults` rules for `feature` and `hotfix` gated on
        `when.diffMatches: ["src/routes/**"]` running `pnpm verify:route-guards`, plus one
        `infra` rule. The invoked script is the **adopter's**, not a package path.
  - [ ] 2.3 Write `packages/provegate/examples/manifests/monorepo/README.md` whose first
        step is copying `examples/route-guard-coverage/check.mjs` into the adopter repo as
        `scripts/verify-route-guards.mjs` and adding the `verify:route-guards` package
        script — matching what the plugin README already instructs.
  - [ ] 2.4 In the same README, walk the cap firing: which FR target path triggers
        `targetsMatch`, and which PRD line satisfies `requireLine`.

- [ ] 3.0 FR-3 — Real-parser fixture (W4)
  - [ ] 3.1 Create `packages/provegate/test/example-manifests.test.ts`. For each example:
        make a temp dir, copy its `gates.manifest.json` to `<tmp>/gates.manifest.json`
        (`loadManifest(config, root)` always reads that filename at the root it is given),
        and call `loadManifest(DEFAULT_CONFIG, tmp)`.
  - [ ] 3.2 Assert command safety across every list — `phases`, `classDefaults[*].run`,
        and `postMerge` — with `isSafeCommand`; a cookbook entry the runner would refuse
        is not a cookbook entry.
  - [ ] 3.3 Assert the single-package specifics: `phases["4"]` equals the four FR-1
        commands in order, and that the order matches `defaultManifest(DEFAULT_CONFIG)`'s
        Phase 4 sequence rather than restating a literal that can drift from it.
  - [ ] 3.4 Assert the monorepo specifics: `hardCaps` is non-empty, its first entry has
        all four `HardCap` fields non-empty, its `requireLine` compiles as a `RegExp`, and
        `classDefaults` has a rule for `feature`, `hotfix`, and `infra`.
  - [ ] 3.5 Assert each README mentions every command its manifest declares and the
        failure that command catches — the README claim is part of the artifact, not
        decoration.
  - [ ] 3.6 Mutation cases (each must FAIL loudly, proven by mutation rather than by
        asserting today's green): a manifest with an unknown top-level key throws
        `ManifestError`; one whose `hardCaps[0]` drops `requireLine` throws
        `ManifestError`.
  - [ ] 3.7 Cap-contract case: applied to a PRD body with no `Deny test:` line the
        monorepo `requireLine` finds no match, and applied to one that names a deny test
        it matches.

- [ ] 4.0 FR-4 — Brownfield adoption page
  - [ ] 4.1 Write `apps/docs/content/docs/brownfield.mdx`: the ladder — adopt
        `verify:workflow` alongside existing CI → `gate init` into the existing tree →
        fill floors from the cookbook → turn on class defaults and hard caps.
  - [ ] 4.2 For each rung, name the stop-here failure mode: what stays unprotected if the
        adopter stops at that step.
  - [ ] 4.3 State the empty-manifest warning explicitly — `gate init` writes an empty
        `gates.manifest.json`, `gate run` is therefore honestly green, and that green
        means nothing until floors are filled.
  - [ ] 4.4 Register the page in `apps/docs/content/docs/meta.json`'s `pages` array.

- [ ] 5.0 FR-5 — Practices-first published docs
  - [ ] 5.1 In `apps/docs/content/docs/quickstart.mdx`, present `gate init --practices`
        as the recommended install and state that wiring steps stay manual, linking what
        the pack prints.
  - [ ] 5.2 In `apps/docs/content/docs/cli.mdx`, document the flag under `gate init`
        together with the never-overwrite guarantee. The edit is **additive** — read
        PRD-019's shipped memory-command sections first and leave them intact.

- [ ] 6.0 FR-6 — Cross-links
  - [ ] 6.1 Link the cookbook from `packages/provegate/examples/README.md`.
  - [ ] 6.2 Link it from `packages/provegate/QUICKSTART.md` so the package-local and
        published surfaces agree.

- [ ] 7.0 FR-7 — Semantic docs assertions (W4)
  - [ ] 7.1 Create `packages/provegate/test/content-adoption.test.ts` following the
        `content-launch.test.ts` pattern for reading `apps/docs` from the package suite.
  - [ ] 7.2 Assert `quickstart.mdx` contains the `--practices` invocation **and** a
        manual-wiring caveat — the token alone is not the claim.
  - [ ] 7.3 Assert `cli.mdx` documents the flag and the never-overwrite guarantee, **and**
        still contains PRD-019's memory commands.
  - [ ] 7.4 Assert `brownfield.mdx` names every ladder rung with a failure mode and that
        `meta.json` registers it in `pages`.
  - [ ] 7.5 Assert both FR-6 cross-links resolve to files that exist.
  - [ ] 7.6 Confirm the package `test` task still declares no narrowed turbo `inputs`
        (`pnpm verify:turbo-inputs`), then re-run this suite with the cache busted and
        confirm the result matches; a divergence means the assertion can go stale-green.

- [ ] 8.0 FR-8 — Distribution (W3)
  - [ ] 8.1 Add every new cookbook file to `packages/provegate/test/pack-manifest.json`,
        the byte-exact allowlist `pack.test.ts` compares against `npm pack --dry-run`.
  - [ ] 8.2 Run `pnpm --filter provegate test test/pack.test.ts` and confirm the tarball
        matches exactly; do not edit `package.json` `files`, which already ships
        `examples`.

- [ ] 9.0 Phase 5 — Execute verification
  - [ ] 9.1 Run every PRD §11 command exactly as written from the repository root and
        fill the matching Verification Ledger rows with evidence; no substitutions, no
        omissions.
  - [ ] 9.2 Run the cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`,
        `pnpm build`, `pnpm verify:workflow`; record exit codes.
  - [ ] 9.3 Run `node packages/provegate/dist/cli.js check PRD-020` and
        `node packages/provegate/dist/cli.js check --wiring`; both must be green.
  - [ ] 9.4 W8 — end-to-end adopter proof: in a temp repo scaffolded by `gate init`, copy
        the monorepo example manifest, copy `check.mjs` to `scripts/verify-route-guards.mjs`,
        add the `verify:route-guards` script, and run the gate the manifest declares.
        Record the outcome in the Progress Log. Asserting the copy instruction exists is
        not the same as proving the copied thing runs.
  - [ ] 9.5 Assert the no-production-change claim by grepping the merge diff: no file
        under `packages/provegate/src/` is touched.

- [ ] 10.0 Phase 6 — Independent adversarial audit
  - [ ] 10.1 After Phase 5 is green, obtain an independent review (different model
        family, never the implementing agent) of the merge diff against the PRD and
        watch items W1–W8. Point it at the two highest-leverage attacks: can an adopter
        who copies only the manifest actually run every command in it, and does any
        README claim exceed what the fixture asserts.
  - [ ] 10.2 Save the structured verdict to
        `_docs/reviews/review-020-adopter-enablement.md`; the ledger row may read
        `passed` only with verdict `pass` and `Critical: 0`.
  - [ ] 10.3 For each finding, append remediation sub-tasks here, fix under the same
        lease, re-run the affected Phase 5 gates, and obtain a fresh verdict.

- [ ] 11.0 Phase 7 — Durable learning and close preparation
  - [ ] 11.1 Run the `_brain/PROTOCOL.md` §7 capture. The PRD declares Durable Artifacts
        `Learning: none`; if implementation surfaced a non-derivable trap, append its
        exact path to the PRD's Durable Artifacts **before** writing the record.
  - [ ] 11.2 Confirm every declared Durable Artifact (the review artifact, plus any
        learning added in 11.1) is present in the merge diff.
  - [ ] 11.3 Prepare the owner handoff: the adopter walk-through evidence from 9.4, the
        independent verdict, and the local merge plan. Leave the operator row pending.
  - [ ] 11.4 After owner acceptance only, run `gate land PRD-020`; verify the post-merge
        gates and worktree cleanup. Never push — the handoff ends with the human push
        instruction.

---

## Verification Ledger

| Gate               | Command / Check                                              | Scope | Result  | Evidence | Notes |
| ------------------ | ------------------------------------------------------------- | ----- | ------- | -------- | ----- |
| FR-1               | `pnpm --filter provegate test test/example-manifests.test.ts` | pkg   | pending |          | single-package example loads, commands safe |
| FR-2               | `pnpm --filter provegate test test/example-manifests.test.ts` | pkg   | pending |          | monorepo hard cap complete, adopter-relative command |
| FR-3               | `pnpm --filter provegate test test/example-manifests.test.ts` | pkg   | pending |          | the fixture itself, all three mutation cases |
| FR-4               | `pnpm --filter provegate test test/content-adoption.test.ts`  | pkg   | pending |          | ladder rungs, failure modes, nav registration |
| FR-5               | `pnpm --filter provegate test test/content-adoption.test.ts`  | pkg   | pending |          | practices path, never-overwrite, memory docs preserved |
| FR-6               | `pnpm --filter provegate test test/content-adoption.test.ts`  | pkg   | pending |          | both cross-links resolve |
| FR-7               | `pnpm --filter provegate test test/content-adoption.test.ts`  | pkg   | pending |          | the docs-content fixture itself |
| FR-8               | `pnpm --filter provegate test test/pack.test.ts`              | pkg   | pending |          | tarball allowlist matches npm pack exactly |
| types              | `pnpm check-types`                                            | root  | pending |          | zero errors |
| lint               | `pnpm lint`                                                   | root  | pending |          | zero warnings |
| test               | `pnpm test`                                                   | root  | pending |          | full suite |
| build              | `pnpm build`                                                  | root  | pending |          | clean build |
| workflow           | `pnpm verify:workflow`                                        | root  | pending |          | every hygiene check green |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-020`           | repo  | pending |          | readiness lint |
| gate-wiring        | `node packages/provegate/dist/cli.js check --wiring`          | repo  | pending |          | wire-or-delete |
| independent-review | `_docs/reviews/review-020-adopter-enablement.md`              | repo  | pending |          | verdict pass, Critical: 0 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Readiness Watch Coverage

| Watch | Binding tasks |
| ----- | ------------- |
| W1 — real fixture contract | 3.1–3.7 |
| W2 — copyable hard cap and portable plugin command | 2.1–2.4, 9.4 |
| W3 — own the tarball allowlist | 8.1, 8.2 |
| W4 — semantic evidence, not token greps | 3.3–3.5, 7.2–7.5 |
| W5 — enforceable PRD-019 sequencing | 0.2, 5.2, 7.3 |
| W6 — accurate scope language | 9.5 |
| W7 — class defaults cannot narrow | 1.2 |
| W8 — run the copied plugin from an adopter-shaped repo | 9.4 |

---

## Deferrals & Decisions

- Phase 3 decision — the `feature` skeleton's data/API/frontend layers do not apply to a
  content PRD; parents follow the artifact order (cookbook → fixture → docs → links →
  distribution) with the Phase 5/6/7 parents unchanged. Recorded so Phase 6 does not read
  the deviation as drift.
- (none deferred yet)

---

## Progress Log

| Date       | Task    | Notes |
| ---------- | ------- | ----- |
| 2026-07-25 | Phase 3 | Plan generated from PRD-020 (Approved), readiness iteration 3 PASS 8.5, and watch items W1–W8, after owner Go. No implementation started. Phase 4 entry is blocked on PRD-019 Ship Verified (task 0.2). |

---

## Blockers / Open Questions

- PRD-019 must be Ship Verified before Phase 4 begins (task 0.2). It is currently
  Approved and gated on PRD-017 and PRD-018.

---

## Operator Handoff

> Human/runtime/staging checks the agent cannot complete. Keep the corresponding task
> checkbox unchecked until resolved or explicitly accepted.
> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`}.

| Task | Category  | Owner | Required Check | Status | Notes |
| ---- | --------- | ----- | -------------- | ------ | ----- |
| 11.3 | manual-qa | owner | Read `brownfield.mdx` end to end and confirm the ladder matches how you would actually onboard an existing repo, and that the cookbook examples are ones you would hand to an adopter | pending | Judgement the fixture cannot make; the merge gate refuses until this acceptance is recorded |
