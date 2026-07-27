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

- [x] 0.0 Pre-flight and ownership
  - [x] 0.1 Claimed with `gate open PRD-020 --worktree` — 9 surface globs; branch `feat/prd-020-adopter-enablement`, worktree `.worktrees/prd-020-adopter-enablement`. `pnpm install --frozen-lockfile` + `pnpm build` first: a linked worktree inherits no `node_modules`.
        Original: Run `gate open PRD-020 --worktree` from the base checkout; confirm the lease covers the PRD Conflict Surface and record branch/worktree in the Progress Log.

  - [x] 0.2 `_state/prds.json` records PRD-019 **Ship Verified** (and PRD-022, which landed after this plan was written). Not blocked. Note for anyone reading the locks from here: `_state/locks/` does not exist in a linked worktree — leases live in the main checkout (`locks-on-main-not-worktree`), where PRD-020's is the only one.
        Original: W5 — verify the dependency before touching a shared page: confirm `_state/prds.json` records PRD-019 as Ship Verified, and record the check in the Progress Log. If it is not, STOP — the remaining tasks are blocked, not deferred.

  - [x] 0.3 All three read and still accurate, all `status: active`. **Same divergence PRD-022 found**: this plan's Memory Context named `notes-column-runs-commands`, which the PRD's `## Memory Inputs` did not, while the PRD named `append-only-manifest-union-driver`, which the plan did not. The PRD is what the gate parses, so it now declares the union. Also added during the claim: `assert-absent-needs-an-independent-cause`, written by PRD-022 yesterday, whose watch overlaps three of this PRD's targets — `gate check` refused the claim until it had a disposition, which is the contract working as designed.
        Original: Open the three Memory Context records; confirm the paths and commands each one names still exist and note any stale finding in **Deferrals & Decisions**.

  - [x] 0.4 Baseline green: `pnpm test` 7/7 tasks, `pnpm verify:workflow` PASS, `pnpm --filter provegate test test/pack.test.ts` 9 passed. Nothing pre-existing red.
        Original: Capture the green baseline for `pnpm test`, `pnpm verify:workflow`, and `pnpm --filter provegate test test/pack.test.ts` in the Progress Log; a pre-existing red is ledgered, never normalized silently.


- [x] 1.0 FR-1 — Single-package cookbook entry
  - [x] 1.1 Written. `phases["4"]` = the four floor commands in `defaultManifest()`'s order (check-types, lint, **build, test**), `postMerge` = check-types + build, `wiringExceptions` = `{}`, one additive `classDefaults.hotfix` rule.
        Original: Write `packages/provegate/examples/manifests/single-package/gates.manifest.json` with `phases["4"]` = the four floor commands in `defaultManifest()`'s order (`npm run check-types`, `npm run lint`, `npm run build`, `npm run test` — build precedes test in the shipped default, so the cookbook must not invert it), `postMerge` = check-types and build, `wiringExceptions` = `{}`, and exactly one additive `classDefaults.hotfix` rule.

  - [x] 1.2 README annotates all five keys with the failure each catches, and states the additive-only rule against the code: `core/gates/classes.ts` pushes matching `run` commands onto Phase 4 and never subtracts, so narrowing means editing `phases["4"]`. No key is described as narrowing anything.
        Original: W7 — write `packages/provegate/examples/manifests/single-package/README.md` so it annotates every key with the failure that key catches, and states plainly that class defaults are **additive only**: `gates/classes.ts` pushes their `run` commands onto Phase 4 and never subtracts, so narrowing a floor means editing `phases["4"]`. Do not describe a class default as narrowing anything.

  - [x] 1.3 No path under `examples/` and no repo-specific filter. Went further than the task asked and added a **Commands this manifest assumes exist** table naming which are the adopter's — `npm run test:smoke` is explicitly flagged as an example shape, not a shipped script, because a cookbook whose commands silently do not resolve is the defect this PRD exists to prevent.
        Original: Confirm every command the file declares would resolve in an adopter repo scaffolded by `gate init` — no path under `examples/`, no repo-specific filter.


- [x] 2.0 FR-2 — Monorepo cookbook entry (W2)
  - [x] 2.1 Written with the canonical `id`, `when.targetsMatch` and `message` copied from `examples/route-guard-coverage/README.md`. **`requireLine` is a declared deviation** — see the finding below: the published pattern is satisfied by the shipped PRD template's own placeholder, so copying it verbatim would have published a cap that never fires. Both files now carry the corrected pattern, so they still agree.
        Original: Write `packages/provegate/examples/manifests/monorepo/gates.manifest.json` with `hardCaps[0]` carrying the canonical values already published by `examples/route-guard-coverage/README.md` — `id: route-deny-test`, `when.targetsMatch: ["src/routes/**"]`, the `Deny test:` `requireLine`, and its message — copied, not re-invented.

  - [x] 2.2 `feature` and `hotfix` gated on `when.diffMatches: ["src/routes/**"]` running `pnpm verify:route-guards`, plus an unconditional `infra` rule running `pnpm verify:workflow`. Both are adopter scripts; the README's command table says where each comes from and what to do without the practices pack.
        Original: Add `classDefaults` rules for `feature` and `hotfix` gated on `when.diffMatches: ["src/routes/**"]` running `pnpm verify:route-guards`, plus one `infra` rule. The invoked script is the **adopter's**, not a package path.

  - [x] 2.3 Step 1 of the README is the copy instruction, matching the plugin README, and it comes BEFORE the manifest copy — a manifest naming a script that does not exist fails at Phase 4 with an error about the script.
        Original: Write `packages/provegate/examples/manifests/monorepo/README.md` whose first step is copying `examples/route-guard-coverage/check.mjs` into the adopter repo as `scripts/verify-route-guards.mjs` and adding the `verify:route-guards` package script — matching what the plugin README already instructs.

  - [x] 2.4 The cap firing is walked end to end: which FR target arms it, what the satisfying line looks like, and that no match refuses before scoring. Every step of that walk was then executed in a real adopter repo (9.4), which is how the finding below was found.
        Original: In the same README, walk the cap firing: which FR target path triggers `targetsMatch`, and which PRD line satisfies `requireLine`.


- [x] 3.0 FR-3 — Real-parser fixture (W4)
  - [x] 3.1 `test/example-manifests.test.ts` copies each example to a temp root as `gates.manifest.json` and calls `loadManifest(DEFAULT_CONFIG, tmp)` — the same read an adopter's repository root gets.
        Original: Create `packages/provegate/test/example-manifests.test.ts`. For each example: make a temp dir, copy its `gates.manifest.json` to `<tmp>/gates.manifest.json` (`loadManifest(config, root)` always reads that filename at the root it is given), and call `loadManifest(DEFAULT_CONFIG, tmp)`.

  - [x] 3.2 `isSafeCommand` over `phases`, `classDefaults[*].run` and `postMerge` for both examples.
        Original: Assert command safety across every list — `phases`, `classDefaults[*].run`, and `postMerge` — with `isSafeCommand`; a cookbook entry the runner would refuse is not a cookbook entry.

  - [x] 3.3 Derived from `defaultManifest(DEFAULT_CONFIG)`, not restated: the test strips the `pnpm ` prefix from the floor and asserts the example is the same four verbs in the same order. Mutation-checked — inverting build/test in the example fails exactly this test.
        Original: Assert the single-package specifics: `phases["4"]` equals the four FR-1 commands in order, and that the order matches `defaultManifest(DEFAULT_CONFIG)`'s Phase 4 sequence rather than restating a literal that can drift from it.

  - [x] 3.4 All four `HardCap` fields non-empty, `requireLine` compiles, and `classDefaults` has `feature`, `hotfix`, `infra`.
        Original: Assert the monorepo specifics: `hardCaps` is non-empty, its first entry has all four `HardCap` fields non-empty, its `requireLine` compiles as a `RegExp`, and `classDefaults` has a rule for `feature`, `hotfix`, and `infra`.

  - [x] 3.5 Every command in every list must appear in that example's README, plus at least four `**Catches:**` annotations. Mutation-checked — adding an undocumented command to the manifest fails exactly this test.
        Original: Assert each README mentions every command its manifest declares and the failure that command catches — the README claim is part of the artifact, not decoration.

  - [x] 3.6 Three mutation cases, each breaking one thing in the shipped example: unknown top-level key → `ManifestError`; `hardCaps[0]` without `requireLine` → `ManifestError`; an unsafe class-default command → throws at load.
        Original: Mutation cases (each must FAIL loudly, proven by mutation rather than by asserting today's green): a manifest with an unknown top-level key throws `ManifestError`; one whose `hardCaps[0]` drops `requireLine` throws `ManifestError`.

  - [x] 3.7 Both directions, plus a third case the finding added: the pattern does NOT match the shipped template's placeholder line, and the loose pattern it replaced does. That test reads `templates/prd-template.md` directly, so it fails if the template's placeholder ever changes shape.
        Original: Cap-contract case: applied to a PRD body with no `Deny test:` line the monorepo `requireLine` finds no match, and applied to one that names a deny test it matches.


- [x] 4.0 FR-4 — Brownfield adoption page
  - [x] 4.1 `apps/docs/content/docs/brownfield.mdx` — four rungs: `verify:workflow` beside existing CI → `gate init` into the existing tree → fill floors from the cookbook → class defaults and hard caps.
        Original: Write `apps/docs/content/docs/brownfield.mdx`: the ladder — adopt `verify:workflow` alongside existing CI → `gate init` into the existing tree → fill floors from the cookbook → turn on class defaults and hard caps.

  - [x] 4.2 Each rung ends with a bolded **Stop here and this stays unprotected** paragraph; the last says plainly that nothing stays unprotected *by the workflow*, which is not the same as nothing being unprotected.
        Original: For each rung, name the stop-here failure mode: what stays unprotected if the adopter stops at that step.

  - [x] 4.3 Stated as its own paragraph under rung 2, including why the green is honest and worthless, and the distinction the warning needs to teach: an ABSENT manifest inherits the floor, the empty one `gate init` writes does not.
        Original: State the empty-manifest warning explicitly — `gate init` writes an empty `gates.manifest.json`, `gate run` is therefore honestly green, and that green means nothing until floors are filled.

  - [x] 4.4 Registered in `meta.json` after `method`.
        Original: Register the page in `apps/docs/content/docs/meta.json`'s `pages` array.


- [x] 5.0 FR-5 — Practices-first published docs
  - [x] 5.1 `gate init --practices` is now the quickstart's install line, with a paragraph on what the pack does not do and a pointer to `NEXT_STEPS.md` as the thing that prints the manual steps.
        Original: In `apps/docs/content/docs/quickstart.mdx`, present `gate init --practices` as the recommended install and state that wiring steps stay manual, linking what the pack prints.

  - [x] 5.2 Additive: the `gate init` heading gained `[--practices]` and two paragraphs. PRD-019's `gate doctor` and `gate memory find` sections were read first and are untouched — asserted, not assumed, by a test.
        Original: In `apps/docs/content/docs/cli.mdx`, document the flag under `gate init` together with the never-overwrite guarantee. The edit is **additive** — read PRD-019's shipped memory-command sections first and leave them intact.


- [x] 6.0 FR-6 — Cross-links
  - [x] 6.1 `examples/README.md` gained a **Manifest cookbook** section above the plugin gallery.
        Original: Link the cookbook from `packages/provegate/examples/README.md`.

  - [x] 6.2 `QUICKSTART.md`'s Where to go next names `examples/manifests/`.
        Original: Link it from `packages/provegate/QUICKSTART.md` so the package-local and published surfaces agree.


- [x] 7.0 FR-7 — Semantic docs assertions (W4)
  - [x] 7.1 `test/content-adoption.test.ts`, following `content-launch.test.ts`'s `repoRoot` resolution for reading `apps/docs` from the package suite.
        Original: Create `packages/provegate/test/content-adoption.test.ts` following the `content-launch.test.ts` pattern for reading `apps/docs` from the package suite.

  - [x] 7.2 Both halves: the invocation AND a manual-wiring caveat naming `NEXT_STEPS.md`. Mutation-checked — deleting the caveat paragraph fails exactly this test.
        Original: Assert `quickstart.mdx` contains the `--practices` invocation **and** a manual-wiring caveat — the token alone is not the claim.

  - [x] 7.3 Scoped to the `gate init` section for the flag and the never-overwrite guarantee, plus a separate assertion that `gate doctor` and `memory find` survive.
        Original: Assert `cli.mdx` documents the flag and the never-overwrite guarantee, **and** still contains PRD-019's memory commands.

  - [x] 7.4 Counts `## Rung N` headings and stop-here paragraphs and requires them to match, so a rung added without its failure mode fails. Mutation-checked — removing one stop-here paragraph fails exactly this test. `meta.json` registration asserted separately.
        Original: Assert `brownfield.mdx` names every ladder rung with a failure mode and that `meta.json` registers it in `pages`.

  - [x] 7.5 Both links resolved on disk, not just found as strings, plus the brownfield page's two path links.
        Original: Assert both FR-6 cross-links resolve to files that exist.

  - [x] 7.6 `pnpm verify:turbo-inputs` PASS — the package `test` task declares no `inputs`, so it hashes every tracked file in the package. The `apps/docs` reads are still outside that key; recorded below rather than silently accepted, and the §11 row bypasses turbo.
        Original: Confirm the package `test` task still declares no narrowed turbo `inputs` (`pnpm verify:turbo-inputs`), then re-run this suite with the cache busted and confirm the result matches; a divergence means the assertion can go stale-green.


- [x] 8.0 FR-8 — Distribution (W3)
  - [x] 8.1 Four paths added to `test/pack-manifest.json` (95 → 99 entries), sorted.
        Original: Add every new cookbook file to `packages/provegate/test/pack-manifest.json`, the byte-exact allowlist `pack.test.ts` compares against `npm pack --dry-run`.

  - [x] 8.2 `pnpm --filter provegate test test/pack.test.ts` — 9 passed, tarball matches the allowlist exactly. `package.json` `files` untouched.
        Original: Run `pnpm --filter provegate test test/pack.test.ts` and confirm the tarball matches exactly; do not edit `package.json` `files`, which already ships `examples`.


- [x] 9.0 Phase 5 — Execute verification
  - [x] 9.1 All §11 rows run from the repository root; ledger filled with evidence.
        Original: Run every PRD §11 command exactly as written from the repository root and fill the matching Verification Ledger rows with evidence; no substitutions, no omissions.

  - [x] 9.2 `pnpm check-types` 0, `pnpm lint` 0, `pnpm test` 44 files / **944 passed**, `pnpm build` clean, `pnpm verify:workflow` PASS.
        Original: Run the cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm verify:workflow`; record exit codes.

  - [x] 9.3 `check PRD-020` ok, `check --wiring` ok.
        Original: Run `node packages/provegate/dist/cli.js check PRD-020` and `node packages/provegate/dist/cli.js check --wiring`; both must be green.

  - [x] 9.4 **Done as a real walk-through, and it found the finding below.** In a temp repo: `git init` + `npm init` + `gate init`, copied the monorepo manifest verbatim, copied `check.mjs` to `scripts/verify-route-guards.mjs`, added the `verify:route-guards` script, ran it. Clean repo → `ok - 0 route file(s)`; an unguarded `src/routes/admin.route.ts` → **exit 1** naming the file; adding the sibling guard test → `ok - 1 route file(s), all guarded`. Then the cap, through `gate check`: a fresh `gate new` PRD with routes targets is **refused**, and clears when a real deny-test line is written. Both halves of the manifest proven against the real CLI, not asserted.
        Original: W8 — end-to-end adopter proof: in a temp repo scaffolded by `gate init`, copy the monorepo example manifest, copy `check.mjs` to `scripts/verify-route-guards.mjs`, add the `verify:route-guards` script, and run the gate the manifest declares. Record the outcome in the Progress Log. Asserting the copy instruction exists is not the same as proving the copied thing runs.

  - [x] 9.5 `git diff --stat -- packages/provegate/src/` is empty. No production source touched.
        Original: Assert the no-production-change claim by grepping the merge diff: no file under `packages/provegate/src/` is touched.


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
| FR-1 | `pnpm --filter provegate test test/example-manifests.test.ts` | pkg | passed | 12 tests; single-package loads through `loadManifest`, every command passes `isSafeCommand`, phase 4 order derived from `defaultManifest` (mutation: inverting build/test fails it) | single-package example loads, commands safe |
| FR-2 | `pnpm --filter provegate test test/example-manifests.test.ts` | pkg | passed | monorepo loads; cap complete and compiling; all three class rules present; commands are adopter-relative and named in the README command table | monorepo hard cap complete, adopter-relative command |
| FR-3 | `pnpm --filter provegate test test/example-manifests.test.ts` | pkg | passed | 23 tests total in the file. Three mutation cases throw `ManifestError`/throw at load; the README-completeness test fails on an undocumented command (mutation-checked); the template-placeholder regression pins the cap fix | the fixture itself, all three mutation cases |
| FR-4 | `pnpm --filter provegate test test/content-adoption.test.ts` | pkg | passed | 11 tests; four rungs, four stop-here paragraphs (counts must match — mutation: removing one fails it), empty-manifest warning with the absent-vs-empty distinction, `meta.json` registration | ladder rungs, failure modes, nav registration |
| FR-5 | `pnpm --filter provegate test test/content-adoption.test.ts` | pkg | passed | quickstart carries the invocation AND the manual-wiring caveat (mutation: deleting the caveat fails it); cli.mdx section carries the flag, the never-overwrite guarantee, and PRD-019's memory commands intact | practices path, never-overwrite, memory docs preserved |
| FR-6 | `pnpm --filter provegate test test/content-adoption.test.ts` | pkg | passed | both cross-links resolved on disk, not matched as strings; brownfield's two path links resolved too | both cross-links resolve |
| FR-7 | `pnpm --filter provegate test test/content-adoption.test.ts` | pkg | passed | the fixture itself, 11 tests; `verify:turbo-inputs` PASS, cross-package read recorded as a deferral | the docs-content fixture itself |
| FR-8 | `pnpm --filter provegate test test/pack.test.ts` | pkg | passed | 9 passed; `npm pack --dry-run` matches the 99-entry allowlist byte for byte | tarball allowlist matches npm pack exactly |
| types | `pnpm check-types` | root | passed | `pnpm check-types` — 0 errors | zero errors |
| lint | `pnpm lint` | root | passed | `pnpm lint` — 0 warnings | zero warnings |
| test | `pnpm test` | root | passed | `pnpm test` 7/7 tasks; package-level uncached: 44 files, **944 passed** (baseline 899 + 45) | full suite |
| build | `pnpm build` | root | passed | `pnpm build` — clean | clean build |
| workflow | `pnpm verify:workflow` | root | passed | `pnpm verify:workflow` — PASS | every hygiene check green |
| gate-check | `node packages/provegate/dist/cli.js check PRD-020` | repo | passed | `[check] ok — PRD-020 passes the readiness lint` | readiness lint |
| gate-wiring | `node packages/provegate/dist/cli.js check --wiring` | repo | passed | `[check --wiring] ok — every gate is wired or excepted` | wire-or-delete |
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

- **9.4 finding, and a declared deviation from task 2.1 — the published hard-cap pattern is
  satisfied by the shipped PRD template's own placeholder.** Task 2.1 says to copy the
  canonical `requireLine` from `examples/route-guard-coverage/README.md` — `` Deny test:
  `[^`]+` `` — "copied, not re-invented". Copying it verbatim was measured in the 9.4
  adopter repo and the cap **never fired**: `templates/prd-template.md` carries
  `` - Deny test: `path/to/x.test.ts` — [required when Targets touch protected surfaces] ``
  under its hard-caps reminder, and that line matches the pattern. So a PRD created by
  `gate new`, with targets under `src/routes/**` and no deny test anywhere, passes
  `gate check`. The cap fires only if the author happens to have deleted a reminder line
  nobody told them to delete.

  Publishing that as a cookbook entry would ship a gate that does not gate — the exact
  defect this PRD exists to prevent — so the pattern now requires a runner prefix:
  `` Deny test: `(?:pnpm|npm|npx|yarn|bun|node|tsx|vitest) [^`]+` ``. It means what the
  cap's own message already said, *name a runnable deny-path test line*, and the
  placeholder no longer satisfies it. **Both files were changed together**, so the cookbook
  and the plugin README still publish identical values and task 2.1's real intent — one
  canonical pair, not two drifting ones — holds.

  Re-measured after the change: a fresh `gate new` PRD with routes targets is refused, and
  clears once a real line is written. A regression pins it by reading the template directly
  and asserting the shipped placeholder does NOT satisfy the cap while the loose pattern
  does — so if the template's placeholder changes shape, the test says so.

  **Not taken:** changing the template itself. It lives outside this PRD's Conflict Surface,
  and the placeholder is legitimate as a reminder — the defect was a pattern loose enough to
  accept a reminder as evidence.

- **7.6 — the docs assertions read outside this package's turbo cache key.**
  `test/content-adoption.test.ts` reads `apps/docs/content/docs/*`, which
  `provegate#test` does not hash (`verify:turbo-inputs` PASS confirms the task declares no
  narrowed `inputs`; the gap is cross-package, not a narrowing). A root `pnpm test` can
  therefore replay a stale green after a docs-only edit. The §11 rows run the package
  script directly and bypass turbo. Same shape as the deferral PRD-022 recorded; the
  repo-wide fix is still out of surface.


- Phase 3 decision — the `feature` skeleton's data/API/frontend layers do not apply to a
  content PRD; parents follow the artifact order (cookbook → fixture → docs → links →
  distribution) with the Phase 5/6/7 parents unchanged. Recorded so Phase 6 does not read
  the deviation as drift.
- (none deferred yet)

---

## Progress Log

| Date       | Task    | Notes |
| ---------- | ------- | ----- |
| 2026-07-27 | 0.0 | Pre-flight cleared: PRD-019 Ship Verified, lease held, baseline green. 0.3 reconciled the PRD's Memory Inputs with the plan's Memory Context (same divergence PRD-022 found) and disposed the new `assert-absent-needs-an-independent-cause` record, which `gate check` had refused the claim over. |
| 2026-07-27 | 1.0-8.0 | Both cookbook entries + READMEs, the real-parser fixture, `brownfield.mdx`, the practices-first docs edits, cross-links, the docs fixture, and the pack allowlist. Five mutation checks, each failing exactly its own test. |
| 2026-07-27 | 9.4 | The adopter walk-through found a real defect in the published hard cap: the canonical `requireLine` is satisfied by the shipped PRD template's own placeholder, so the cap never fires on a `gate new` PRD. Pattern corrected in both files, re-measured end to end, pinned by a regression that reads the template. Recorded as a declared deviation from task 2.1. |
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
