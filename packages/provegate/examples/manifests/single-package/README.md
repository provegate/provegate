# Cookbook: single-package repo

A manifest for one package at the repository root, using npm scripts.

## Before you copy — read the manifest you already have

`gate init --practices` writes a `gates.manifest.json` containing
`phases: { "7": [...] }`, the Phase 7 memory validator. **Overwriting that file with this
one deletes that gate, silently.** Merge these keys into yours instead of replacing the
file.

The asymmetry that decides what a copy costs you: an **absent** `phases["4"]` inherits the
built-in floor, while an **empty array** erases it. Plain `gate init` writes
`{ "phases": { "4": [] }, "postMerge": [] }` — both erased, which is what this file is for.
The `--practices` one omits `phases["4"]` entirely, so it still has the floor.

Then copy `gates.manifest.json` next to your `package.json` and change the script names to
yours.

**What "change the script names" covers:** the four floor commands are scripts **you
already have** — this file adds nothing you must write from scratch, which is the property
the `classDefaults` section below protects. It is not self-contained: an npm project
without a `lint` script fails at Phase 4 on `npm run lint`, and it should.

Every key below is annotated with **the failure it catches**. A key you cannot name a
failure for is a key you do not need.

## `phases["4"]`

```json
["npm run check-types", "npm run lint", "npm run build", "npm run test"]
```

**Catches:** code that compiles in an editor but not in CI, style drift, a build that
breaks only in a clean tree, and a red test suite — before the runner archives anything or
merges. This is the floor: Phase 4 is where implementation is proved, and everything after
it assumes these passed.

**The order is the shipped default's order** (`defaultManifest()` in
`core/gates/manifest.ts`): check-types, lint, **build, then test**. Build precedes test on
purpose — a test suite that imports build output should fail on the build, where the error
names the file, not on an import error three layers down. Do not invert it because
alphabetical or habit says otherwise.

An absent manifest inherits exactly this floor with the config's own command names. You
write the file when your script names differ from `pnpm check-types` and friends — which,
for an npm-based single package, they do.

## `classDefaults`

```json
{}
```

**Catches:** nothing as shipped, and that is deliberate — **this file declares no script
you would have to write first**. A class default names a script, and a manifest shipping a
rule for one you have not written fails at Phase 4 with an error about a missing script, on
the first hotfix, at the worst possible moment. The four floor commands are a different
case: they are scripts an npm project already has, renamed.

Add one when you have the script. The shape:

```json
{ "hotfix": [{ "run": ["npm run test:smoke"] }] }
```

**Catches (once you add it):** a hotfix that passes the floor and still breaks the running
system — the case where "the unit tests are green" is not the question anyone is asking at
02:00. Write `test:smoke` first, then add the rule.

**Class defaults are ADDITIVE ONLY.** `classDefaults` for the PRD's class are appended to
Phase 4's command list (`core/gates/classes.ts` pushes each matching rule's `run` onto the
chain and never removes anything). There is no key here that narrows a floor, skips a
command, or makes a class cheaper. If you want a class to run *less*, the only lever is
`phases["4"]` itself — and that narrows it for every class at once.

A rule with no `when` runs for every PRD of that class. Add `when.diffMatches` to scope it
to a path — see the monorepo entry, which does exactly that.

## `hardCaps`

```json
[]
```

**Catches:** nothing, deliberately. An empty array is the honest state for a repo that has
not yet identified a guarantee its PRDs must state in writing. Hard caps are a *documentation*
gate — they refuse a PRD whose targets touch a sensitive path without a required line in
the PRD body — and inventing one to fill the key would train you to ignore it. See the
monorepo entry for a real one.

## `postMerge`

```json
["npm run check-types", "npm run build"]
```

**Catches:** the merge itself. These run on the base checkout *after* the local merge, and
a failure reverts it. Two commits that each pass alone can still produce a base that does
not type-check — a rename in one and a new caller in the other is the everyday case.

Keep this list short. It runs on the critical path of every landing, and everything here is
already proved on the branch; what it re-proves is the *combination*.

## `wiringExceptions`

```json
{}
```

**Catches:** a check that exists but nothing runs — a `scripts/verify-*.mjs` in the tree
that no manifest command, package script, or CI step invokes. `gate check --wiring` fails
on it. An entry here is a written justification for one such orphan, and the audit is
shrink-only: you can remove an exception, never widen the set silently.

Empty is the goal state. A repo with nothing to except is a repo where every check runs.

## Commands this manifest assumes exist

Nothing here is provided by the package. Every command is a script in **your**
`package.json`, and a manifest naming one you do not have fails at Phase 4 with an error
about the script, not about the manifest.

| Command | Where it comes from |
| ------- | ------------------- |
| `npm run check-types`, `npm run lint`, `npm run build`, `npm run test` | **yours.** The four you already run in CI. If your script names differ, rename them here before the first `gate run` — these are the only commands the shipped file declares, and it declares nothing you have to write from scratch |

## Verify it before you trust it

```
gate check --wiring
gate run PRD-001 --dry-run
```

The dry run prints the exact chain this manifest produces for that PRD's class, without
executing anything. If a command in the plan is not one you meant to run, fix the manifest
before the first real run — not after it stops you at Phase 4.
