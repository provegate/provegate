# Independent Review: PRD-015 — Single-Package (Non-Monorepo) Support

> **PRD:** PRD-015
> **Verdict:** pass
> **Reviewer:** Codex (GPT, independent Phase 6 session)
> **Base SHA:** `b0dbff5`
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single independent reviewer)

## Summary

I reviewed `git diff b0dbff5..HEAD`, the PRD and readiness assessment, and all four
changed files. I ran the requested fixture, package typecheck, and package lint; all
were green. I then attacked whether that green result proves the claimed lifecycle,
whether the configured non-pnpm commands execute, whether a freshly initialized repo
can follow either documented recipe, whether FR-5 is honestly a no-op, whether the
diff is additive-only, and whether every edit is inside the declared Conflict Surface.

The real-git portions held: the fixture creates actual temporary repositories and
commits, and `mergeToLocalBase` performs a real local no-ff merge with no remote.
The load-bearing proof did not hold. The fixture never invokes `gate new`, `gate
open`, `gate check`, or the `gate run` orchestrator, and all three tests still pass
when every configured floor command is changed to fail. A real `gate init` also
creates an explicitly empty manifest, so the documented commands-only recipe earns
a green wiring check while running none of those commands; the direct `tsc`/`eslint`
recipe is rejected by the default safety allowlist once actually wired.

Commands run:

```sh
pnpm --filter provegate test test/single-package.test.ts
pnpm --filter provegate check-types
pnpm --filter provegate lint
git diff --stat b0dbff5..HEAD
git diff --name-status b0dbff5..HEAD
rg -n --glob 'packages/provegate/src/**' \
  '(--filter|\bturbo\b|pnpm-workspace|apps/|packages/)' packages/provegate/src
```

## Findings

### Critical — The green fixture bypasses the lifecycle and never executes the four configured gates

**Location:** `packages/provegate/test/single-package.test.ts:54`,
`packages/provegate/test/single-package.test.ts:99`,
`packages/provegate/test/single-package.test.ts:111`,
`packages/provegate/test/single-package.test.ts:115`

**Attack:** W1 requires `init → new → open → check → run`; W3 requires the
non-pnpm `commands` mapping to execute in the real run/merge path. The fixture imports
and calls only `initWorkspace`, `auditWiring`, and `mergeToLocalBase`. It never calls
the CLI lifecycle or `buildGateChain`/`runChain`. Although `defaultManifest` puts the
four configured commands in phase 4, the third test replaces `postMerge` with one
independent passing command and calls `mergeToLocalBase` directly. That function
executes only `manifest.postMerge`
(`packages/provegate/src/core/run/merge.ts:138`), while the actual runner executes the
floor through `runChain` (`packages/provegate/src/cli.ts:682`).

**Evidence/repro:** Make a temporary copy of the test, change only the four config
commands to exit 1, leave the separate post-merge command at exit 0, and run it:

```sh
cp packages/provegate/test/single-package.test.ts \
  packages/provegate/test/single-package-repro.test.ts
perl -pi -e \
  'if ($. >= 56 && $. <= 59) { s/process\.exit\(0\)/process.exit(1)/g }' \
  packages/provegate/test/single-package-repro.test.ts
pnpm --filter provegate test test/single-package-repro.test.ts
rm packages/provegate/test/single-package-repro.test.ts
```

Observed: `Test Files 1 passed`, `Tests 3 passed`, exit 0. Thus the claimed proof is
green even when `checkTypes`, `lint`, `test`, and `build` would all fail. This is not
the whole lifecycle required by PRD FR-1
(`_prds/wip/prd-015-single-package-support.md:96`) or readiness W1/W3
(`_readiness/wip/readiness-015-single-package-support.md:46`).

### High — The documented commands-only recipe leaves all scaffolded gates empty

**Location:** `packages/provegate/QUICKSTART.md:114`,
`packages/provegate/QUICKSTART.md:117`,
`packages/provegate/QUICKSTART.md:145`,
`apps/docs/content/docs/quickstart.mdx:93`,
`apps/docs/content/docs/quickstart.mdx:96`

**Attack:** Follow the recipe literally in a new single-package repository: run
`gate init`, add the shown `commands` block, then run `gate check --wiring`. Contrary
to “that is the only place repo shape or toolchain differs,” init writes
`phases.4: []` and `postMerge: []`
(`packages/provegate/src/core/run/init.ts:52`). Arrays replace defaults during config
merge (`packages/provegate/src/core/config/load.ts:45`), so editing `commands` does
not wire them into the manifest. The wiring audit sees no manifest commands, and the
shown script names do not match the default `^verify:` reverse-audit pattern.

**Evidence/repro:** In an actual temporary git repo with one `package.json`, I ran the
built CLI's `init`, added exactly the npm `commands` block from the quickstart, and
ran:

```sh
node /absolute/path/to/packages/provegate/dist/cli.js check --wiring
```

Observed exit 0:

```text
[check --wiring] ok — every gate is wired or excepted
```

Loading the resulting effective manifest printed:

```json
{
  "phase4": [],
  "postMerge": []
}
```

A user following the recipe receives a green audit but no configured floor or
post-merge gates. The docs must also show how to populate `gates.manifest.json` (or
the scaffold/runtime behavior must make the documented one-place recipe true).

### High — The documented direct `tsc`/`eslint` recipe is rejected when actually wired

**Location:** `packages/provegate/QUICKSTART.md:131`,
`packages/provegate/QUICKSTART.md:134`,
`packages/provegate/QUICKSTART.md:145`,
`apps/docs/content/docs/quickstart.mdx:110`

**Attack:** Wire the direct recipe into phase 4 and post-merge, then run the claimed
`gate check --wiring`. The safety gate accepts only configured prefixes
(`packages/provegate/src/core/gates/safety.ts:25`), and the defaults include neither
`tsc ` nor `eslint ` (`packages/provegate/src/core/config/defaults.ts:69`). The test's
claim that allowlisted `node` “stands in for any `tsc`/`vitest`/`npm run`” at
`packages/provegate/test/single-package.test.ts:51` is false for the safety path.

**Evidence/repro:** In the initialized temp repo, I set the four commands exactly to
`tsc --noEmit`, `eslint .`, `vitest run`, and `tsc -b`, placed them in manifest phase
4/post-merge, and ran `gate check --wiring`. Observed exit 1:

```text
gate commands refused by the safety gate
  - commands: unsafe: tsc --noEmit
  - commands: unsafe: eslint .
  - commands: unsafe: tsc -b
```

The recipe must either use already allowlisted invocations (for example npm/npx),
or document the required `commands.allowedPrefixes` additions and prove that form.

### Medium — The branch edits an undeclared, non-shared path without recording the decision

**Location:** `_tasks/wip/tasks-015-single-package-support.md:36`,
`_tasks/wip/tasks-015-single-package-support.md:88`

**Attack:** Reconcile every changed path against the PRD Conflict Surface and the
listed shared append-only exceptions. The Conflict Surface contains the fixture,
`init.ts`, and two quickstarts
(`_prds/wip/prd-015-single-package-support.md:213`); the shared exceptions do not
include `_tasks/**`, and §12 forbids unrecorded out-of-surface edits
(`_prds/wip/prd-015-single-package-support.md:264`). No decision authorizing this
extra surface appears in the task file's Deferrals & Decisions section.

**Evidence/repro:**

```sh
git diff --name-only b0dbff5..HEAD
```

Observed out-of-surface path:

```text
_tasks/wip/tasks-015-single-package-support.md
```

That edit is also where the invalid W1/W3 completion claims and passed ledger rows
were recorded. Add the path to the Conflict Surface or record the explicit decision;
do not leave the scope exception implicit.

### Attack vectors that held

- **FR-5/W2:** Source search found no hardcoded turbo invocation,
  `pnpm-workspace` lookup, or `apps/`/`packages/` runtime path in the single-package
  init/config/wiring/run/merge paths. `--filter` occurs only in wiring grammar that
  recognizes filtered commands. The default pnpm commands are the expressly
  preserved monorepo defaults, not a new branch-specific assumption.
- **W4/additive-only:** `git diff b0dbff5..HEAD -- packages/provegate/src` is empty.
  Root/package manifests, lockfile, and
  `packages/provegate/src/core/config/defaults.ts` are unchanged. Therefore no gate
  runtime code, runtime dependency, network call, telemetry, auto-detection, or
  monorepo default changed in this branch.
- **Real git substrate:** The fixture uses `git init`, real commits, a real feature
  branch, and a real `mergeToLocalBase`; the resulting merge has two parents and no
  remote. The defect is the skipped lifecycle/gate execution, not a mocked git merge.
- **Schema/CLI spelling:** `checkTypes`, `lint`, `test`, and `build` match
  `packages/provegate/src/core/config/validate.ts:58`, partial `commands` objects
  inherit `allowedPrefixes`, and `gate check --wiring` is accepted by the CLI at
  `packages/provegate/src/cli.ts:450`.

## Round 2 — fix verification

I reviewed `git diff 52834ba..HEAD` and the current files at fix commit `10747a8`.
I rebuilt the CLI, re-ran the fixture and its negative case, repeated the mutation
attack against more than one configured floor command, and followed both documented
manifest forms in a fresh single-package git repo.

### Finding 1 (Critical) — STILL-OPEN

**Current location:** `packages/provegate/test/single-package.test.ts:9`,
`packages/provegate/test/single-package.test.ts:102`,
`packages/provegate/test/single-package.test.ts:150`,
`packages/provegate/test/single-package.test.ts:165`,
`packages/provegate/test/single-package.test.ts:172`

The fixture now calls the real `buildGateChain` + `runChain`, and the dedicated
negative test does assert that a failing `checkTypes` command stops at phase 4. Those
are real improvements. The unmodified file is green:

```sh
pnpm --filter provegate test test/single-package.test.ts
```

Observed exit 0:

```text
Test Files  1 passed (1)
     Tests  5 passed (5)
```

The focused negative test is also real and green:

```sh
pnpm --filter provegate exec vitest run test/single-package.test.ts \
  -t 'FAILING non-pnpm floor command stops the run at phase 4' --reporter=verbose
```

Observed exit 0:

```text
✓ ... FR-1/W3 (negative): a FAILING non-pnpm floor command stops the run at phase 4
Test Files  1 passed (1)
     Tests  1 passed | 4 skipped (5)
```

However, the required mutation attack still defeats the positive proof. I copied the
test and changed one passing floor command — the second command, not the specially
asserted first command:

```sh
cp packages/provegate/test/single-package.test.ts \
  packages/provegate/test/single-package-repro.test.ts
```

```diff
-      lint: 'node --eval "process.exit(0)"',
+      lint: 'node --eval "process.exit(1)"',
```

Then:

```sh
pnpm --filter provegate test test/single-package-repro.test.ts
```

Observed exit 0:

```text
Test Files  1 passed (1)
     Tests  5 passed (5)
```

The repro file was then removed. For comparison, changing the first `checkTypes`
command to exit 1 does fail the positive test (`Test Files 1 failed`, `Tests 1 failed
| 4 passed`, exit 1), which exposes why the later-command mutation survives:
the positive assertion requires only `passedPhase4.length > 0` and one passed result
for the first command. It never requires four phase-4 passes and never asserts the
positive outcome reached the expected phase-6 stop. With `lint` failing, the first
command supplies the one pass, the real chain stops at phase 4, and the supposedly
positive lifecycle proof still reports green.

This violates the explicit Round-2 criterion that flipping a passing floor command
must make the positive test fail. The fix proves the first floor command and one
negative path, but it does not make all four configured floor commands load-bearing.
The Critical remains open.

### Finding 2 (High) — STILL-OPEN

**Current location:** `packages/provegate/QUICKSTART.md:120`,
`packages/provegate/QUICKSTART.md:124`,
`apps/docs/content/docs/quickstart.mdx:99`

Both documents now explain that init creates an empty manifest and show phase `"4"`
plus `postMerge`; the commands-only omission is substantively corrected. The docs-app
block is valid JSON. The package quickstart, however, places this line inside its
fenced `json` block:

```json
// gates.manifest.json
```

I followed that package recipe literally in a fresh git repo: `npm init -y`, added
the four shown scripts, ran the built CLI's `init`, and replaced the empty manifest
with the exact fenced block. Then:

```sh
node /absolute/path/to/packages/provegate/dist/cli.js check --wiring
```

Observed exit 1:

```text
gates.manifest.json is not valid JSON: Unexpected token '/', "// gates.m"... is not valid JSON
```

Removing only the comment and keeping the shown phase-4/post-merge npm commands
produces exit 0:

```text
[check --wiring] ok — every gate is wired or excepted
```

Thus the wiring guidance is now conceptually correct, but one of the two requested
recipes still fails when copied literally. The High remains open until the filename
label is moved outside the JSON block (or removed).

### Finding 3 (High) — RESOLVED

**Current location:** `packages/provegate/QUICKSTART.md:134`,
`apps/docs/content/docs/quickstart.mdx:112`

Both recipes now use allowlisted `npx` forms and explicitly say that bare
`tsc`/`eslint` require either `npx` or additions to
`commands.allowedPrefixes`. In the initialized temp repo I wired:

```json
{
  "phases": {
    "4": ["npx tsc --noEmit", "npx eslint .", "npx vitest run", "npx tsc -b"]
  },
  "postMerge": ["npx tsc --noEmit", "npx tsc -b"]
}
```

Then:

```sh
node /absolute/path/to/packages/provegate/dist/cli.js check --wiring
```

Observed exit 0:

```text
[check --wiring] ok — every gate is wired or excepted
```

Repeating with bare `tsc`/`eslint` still gives the honest, documented exit 1:

```text
gate commands refused by the safety gate
  - commands: unsafe: tsc --noEmit
  - commands: unsafe: eslint .
  - commands: unsafe: tsc -b
```

The shown `npm` manifest and the direct `npx` alternative both pass manifest safety;
the limitation of bare executables is accurately disclosed.

### Finding 4 (Medium) — RESOLVED

**Current location:** `_prds/wip/prd-015-single-package-support.md:220`,
`_tasks/wip/tasks-015-single-package-support.md:111`

The PRD Conflict Surface note now explicitly classifies this PRD's `_prds/`,
`_readiness/`, `_tasks/`, and `_docs/reviews/` lifecycle artifacts as workflow
bookkeeping. The task ledger's Deferrals & Decisions records the same decision and
ties it to the Phase-6 Medium. Repro:

```sh
rg -n \
  'control artifacts this PRD|Surface note \\(Phase-6 Medium\\)|undeclared out-of-surface' \
  _prds/wip/prd-015-single-package-support.md \
  _tasks/wip/tasks-015-single-package-support.md
```

Observed:

```text
_tasks/wip/tasks-015-single-package-support.md:111:- **Surface note (Phase-6 Medium):** this PRD's own lifecycle ledgers
_tasks/wip/tasks-015-single-package-support.md:115:  undeclared out-of-surface exception.
_prds/wip/prd-015-single-package-support.md:222:> control artifacts this PRD's own lifecycle writes — its `_prds/`, `_readiness/`,
```

The formerly implicit out-of-surface bookkeeping exception is now explicitly
recorded in both requested places.

### Final Round-2 result

> **Verdict:** fail
> **Critical:** 1
> **High:** 1
> **Medium:** 0
> **Quorum:** 0/1 pass (single independent reviewer)

## Round 3 — fix verification

I reviewed `git diff 10747a8..HEAD` and the current files at fix commit `ad3c959`.
The fix range contains only the two residual targets:

```text
M	packages/provegate/QUICKSTART.md
M	packages/provegate/test/single-package.test.ts
```

I re-ran the unmodified fixture and focused negative case, then made four fresh
temporary copies of the fixture and independently changed exactly one configured
floor command to exit 1. I also parsed every fenced JSON block in both quickstarts
with `JSON.parse` and re-checked the manifest wiring and safety allowlist.

### Finding 1 (Critical, residual) — RESOLVED

**Current location:** `packages/provegate/test/single-package.test.ts:150`,
`packages/provegate/test/single-package.test.ts:162`,
`packages/provegate/test/single-package.test.ts:175`,
`packages/provegate/test/single-package.test.ts:178`

The positive proof now requires a passed phase-4 result for each of the four exact
configured commands and requires that the chain did not stop at phase 4. The
unmodified fixture is green:

```sh
pnpm --filter provegate test test/single-package.test.ts
```

Observed exit 0:

```text
Test Files  1 passed (1)
     Tests  5 passed (5)
BASELINE_EXIT=0
```

The dedicated negative test still asserts both
`outcome.stopped?.phase === "4 Implementation"` and a `FAILED` result for its
failing `checkTypes` command. Its focused run is green:

```sh
pnpm --filter provegate exec vitest run test/single-package.test.ts \
  -t 'FAILING non-pnpm floor command stops the run at phase 4' --reporter=verbose
```

Observed exit 0:

```text
✓ ... FR-1/W3 (negative): a FAILING non-pnpm floor command stops the run at phase 4
Test Files  1 passed (1)
     Tests  1 passed | 4 skipped (5)
NEGATIVE_EXIT=0
```

I then ran these four mutations independently. After each run I removed the repro
copy before creating the next one:

```sh
# checkTypes
cp packages/provegate/test/single-package.test.ts \
  packages/provegate/test/single-package-repro.test.ts
perl -pi -e \
  'if ($. == 61) { s/process\.exit\(0\)/process.exit(1)/ }' \
  packages/provegate/test/single-package-repro.test.ts
pnpm --filter provegate test test/single-package-repro.test.ts

# lint
cp packages/provegate/test/single-package.test.ts \
  packages/provegate/test/single-package-repro.test.ts
perl -pi -e \
  'if ($. == 62) { s/process\.exit\(0\)/process.exit(1)/ }' \
  packages/provegate/test/single-package-repro.test.ts
pnpm --filter provegate test test/single-package-repro.test.ts

# test
cp packages/provegate/test/single-package.test.ts \
  packages/provegate/test/single-package-repro.test.ts
perl -pi -e \
  'if ($. == 63) { s/void 0/process.exit(1)/ }' \
  packages/provegate/test/single-package-repro.test.ts
pnpm --filter provegate test test/single-package-repro.test.ts

# build
cp packages/provegate/test/single-package.test.ts \
  packages/provegate/test/single-package-repro.test.ts
perl -pi -e \
  'if ($. == 64) { s/node -e "0"/node -e "process.exit(1)"/ }' \
  packages/provegate/test/single-package-repro.test.ts
pnpm --filter provegate test test/single-package-repro.test.ts
```

Every mutation made the positive test fail; none left the suite green:

```text
checkTypes:
  Test Files  1 failed (1)
       Tests  1 failed | 4 passed (5)
  CHECK_TYPES_MUTATION_EXIT=1

lint:
  Test Files  1 failed (1)
       Tests  1 failed | 4 passed (5)
  LINT_MUTATION_EXIT=1

test:
  Test Files  1 failed (1)
       Tests  1 failed | 4 passed (5)
  TEST_MUTATION_EXIT=1

build:
  Test Files  1 failed (1)
       Tests  1 failed | 4 passed (5)
  BUILD_MUTATION_EXIT=1
```

In each failure, Vitest showed the mutated command as `FAILED` in the received
phase-4 results and the original expected command/pass pair as missing. This also
covered the previous escape path: the later `lint`, `build`, and `test` mutations
all fail the positive proof after one or more earlier commands have passed. The
temporary repro file was absent after all four runs. The residual Critical is
resolved.

### Finding 2 (High) — RESOLVED

**Current location:** `packages/provegate/QUICKSTART.md:120`,
`packages/provegate/QUICKSTART.md:124`,
`apps/docs/content/docs/quickstart.mdx:99`,
`apps/docs/content/docs/quickstart.mdx:103`

The package quickstart no longer includes `// gates.manifest.json` inside its JSON
fence. I parsed every fenced JSON block in both quickstarts directly:

```sh
node -e 'const fs=require("node:fs"); for (const file of process.argv.slice(1)) { const text=fs.readFileSync(file,"utf8"); const blocks=[...text.matchAll(/^```json\s*$\n([\s\S]*?)^```\s*$/gm)]; if (!blocks.length) throw new Error(`${file}: no JSON blocks`); blocks.forEach((match,index)=>{ JSON.parse(match[1]); const line=text.slice(0,match.index).split("\n").length; console.log(`${file}: JSON block ${index+1} at line ${line}: parsed OK`); }); }' \
  packages/provegate/QUICKSTART.md \
  apps/docs/content/docs/quickstart.mdx
```

Observed exit 0:

```text
packages/provegate/QUICKSTART.md: JSON block 1 at line 124: parsed OK
apps/docs/content/docs/quickstart.mdx: JSON block 1 at line 103: parsed OK
JSON_PARSE_EXIT=0
```

An explicit search also confirms the invalid comment is gone:

```sh
rg -n '// gates\.manifest\.json' \
  packages/provegate/QUICKSTART.md \
  apps/docs/content/docs/quickstart.mdx
```

Observed no matches:

```text
INVALID_JSON_COMMENT=absent
```

The prior recipe fixes did not regress. Both quickstarts still say to replace the
empty `gates.manifest.json`, wire all four `npm run` commands into `phases."4"`,
and wire `npm run check-types` plus `npm run build` into `postMerge`. Both also
show the `npx tsc`, `npx eslint`, and `npx vitest` alternatives and disclose the
bare-command allowlist rule. Current defaults contain both `npm ` and `npx ` in
`commands.allowedPrefixes` (`packages/provegate/src/core/config/defaults.ts:69`).
The residual High is resolved.

### Final Round-3 result

> **Verdict:** pass
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single independent reviewer)
