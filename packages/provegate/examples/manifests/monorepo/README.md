# Cookbook: monorepo with a domain gate

A manifest for a pnpm workspace that also runs one project-specific check. It is the
single-package entry plus the two keys that make a gate *yours*: a class default that runs
your script when the diff touches a sensitive path, and a hard cap that refuses a PRD which
does not say what it protects.

## Step 1 — install the domain gate first

This manifest invokes a script **your repo owns**. Nothing in the package provides it, and
a manifest naming a command that does not exist fails at Phase 4 with a confusing error.

```
cp node_modules/provegate/examples/route-guard-coverage/check.mjs scripts/verify-route-guards.mjs
```

Then add the script — the name the manifest below invokes:

```jsonc
// package.json
{ "scripts": { "verify:route-guards": "node scripts/verify-route-guards.mjs" } }
```

Open `scripts/verify-route-guards.mjs` and adapt the two patterns at the top to your
layout. It ships matching `*.route.ts` / `*.controller.ts` against a sibling
`*.guard.test.ts`. If your routes live elsewhere, it **fails closed** rather than passing
vacuously: a missing `src/routes` is treated as a misconfigured gate and errors, by design.
Adapt `ROUTES_DIR` before you wire it, or the first run stops on a directory you do not
have.

The manifest also declares `pnpm verify:workflow` for the `infra` class. That script comes
from the practices pack:

```sh
npx gate init --practices   # writes scripts/verify/, prints the wiring steps
```

```jsonc
// package.json
{ "scripts": { "verify:workflow": "node scripts/verify/verify-workflow.mjs" } }
```

If you do not want the pack, **delete the `infra` rule from the manifest before copying
it** — a rule naming a script that does not exist is a Phase 4 failure waiting for the
first infra item.

Both scripts wired, or the `infra` rule removed: only then copy `gates.manifest.json`.

**And read the manifest you already have first.** `gate init --practices` writes one
containing `phases: { "7": [...] }`, the Phase 7 memory validator, and replacing the file
deletes that gate silently. Merge keys rather than overwriting.

## `phases["4"]`

```json
["pnpm check-types", "pnpm lint", "pnpm build", "pnpm test"]
```

**Catches:** the same floor as the single-package entry, in the shipped default's order —
build before test. In a workspace these are usually turbo/nx tasks that fan out to every
package, which is what you want at Phase 4: the item's own package passing while a
dependent breaks is exactly the failure a monorepo adds.

## `classDefaults`

```json
{
  "feature": [{ "when": { "diffMatches": ["src/routes/**"] }, "run": ["pnpm verify:route-guards"] }],
  "hotfix":  [{ "when": { "diffMatches": ["src/routes/**"] }, "run": ["pnpm verify:route-guards"] }],
  "infra":   [{ "run": ["pnpm verify:workflow"] }]
}
```

**Catches (feature/hotfix):** a route added or changed without a deny-path guard test —
a declared security guarantee that is not one. The `when.diffMatches` scope means the
check costs nothing on the many PRDs that never touch `src/routes/`, which is what keeps
it from being disabled six weeks in.

**Catches (infra):** a workflow change that breaks the workflow's own checks. `infra` runs
it unconditionally — there is no `when` — because an infra item's blast radius is not
readable from its diff paths.

**These are additive.** `core/gates/classes.ts` appends each matching rule's `run` to Phase
4 and never subtracts, so no entry here can make a class skip a floor command. Narrowing
happens in `phases["4"]` and nowhere else.

## `hardCaps`

```json
[
  {
    "id": "route-deny-test",
    "when": { "targetsMatch": ["src/routes/**"] },
    "requireLine": "^\\s*-?\\s*Deny test: `(?:pnpm|npm|npx|yarn|bun|node|tsx|vitest) [^`]+`",
    "message": "targets touch routes - name a runnable deny-path test line"
  }
]
```

**Catches:** a PRD that plans to change routes without naming the test that proves the
deny path. The class default above proves the test *exists* in the tree; this proves the
*specification* committed to one before implementation started. Different failure, earlier
moment.

**How it fires, end to end:**

1. A PRD declares an FR target under `src/routes/` — say
   `- **Targets:** \`src/routes/admin.route.ts\``. That path matches
   `when.targetsMatch: ["src/routes/**"]`, so the cap is **armed** for this PRD. A PRD
   whose targets are all elsewhere never sees it.
2. The cap then searches the PRD body for `requireLine` as a regular expression. The line
   that satisfies it looks like:

   ```
   Deny test: `pnpm vitest run src/routes/admin.guard.test.ts`
   ```

   Three things in that pattern are load-bearing. The **backticks** mean a bare sentence
   does not satisfy it. The **runner prefix** means a bare path does not. The **anchor**
   (`^\s*-?\s*`, compiled with the `m` flag by the readiness lint) means the line must
   *start* with the evidence — without it, *"we will add a Deny test: `pnpm vitest …` next
   sprint"* satisfies the cap from the middle of a paragraph.

   The prefix list is finite and it is yours to extend: mirror your own
   `commands.allowedPrefixes` from `workflow.config.json`. A repo whose tests run under
   `make` or `deno` must add those alternatives, or this cap refuses a legitimate line.

   That prefix is not decoration, and it is the one thing to keep if you adapt this cap.
   The shipped PRD template carries a placeholder under its own hard-caps reminder —
   `` - Deny test: `path/to/x.test.ts` — [required when Targets touch protected surfaces] ``
   — and a looser pattern of `` Deny test: `[^`]+` `` **matches that placeholder**. Copy the
   looser form and you get a cap that passes on every PRD `gate new` produces, firing only
   when an author happens to have deleted the reminder. Measured in a scratch adopter repo
   built from `gate init`: with the loose pattern the cap never fired; with this one it
   fires on the template's placeholder and clears on a real line.
3. No match → the item is refused with `message`, before scoring — including when the only
   candidate line is the template's placeholder. The remedy is to write
   the line, or to stop touching routes.

`requireLine` is a regex in **source form** — a JSON string compiled with `new RegExp()`.
Escape accordingly, and remember that a pattern which matches nothing anywhere is a cap
that fires on every armed PRD.

## `postMerge`

```json
["pnpm check-types", "pnpm build"]
```

**Catches:** a base branch that stops type-checking or building once this branch is in it.
Runs after the local merge; a failure reverts the merge and leaves the feature branch
intact.

Note what is **not** here: `pnpm verify:route-guards`. That is a **cost decision, not a
safety claim** — the merge genuinely can break this invariant. A route added on base while
this branch deleted a guard test produces a merged tree that fails a check neither side
failed alone. The trade is that it doubles the cost of every landing to catch a case that
requires two items touching the same surface, which the conflict-surface lease already
makes rare. If your routes are edited by several items at once, add it here; you will be
paying for a real risk rather than a hypothetical one.

## `wiringExceptions`

```json
{}
```

**Catches:** an orphaned check. Once `scripts/verify-route-guards.mjs` exists,
`gate check --wiring` requires that something invokes it — the `classDefaults` entry above
is what satisfies that. Delete the manifest rule and keep the script, and the audit fails;
that is the point, and it is why this key stays empty here.

**If you also installed the practices pack**, expect one disagreement, measured in a
scratch adopter repo built exactly from these instructions: `gate check --wiring` passes
(the manifest rule is an executing surface it knows about) while the pack's
`scripts/verify/verify-gates-wired.mjs` **fails** on the same repo — it counts CI steps,
git hooks, the bundle and `ship:pre`, and not manifest class defaults. So a manifest-wired
domain gate reads as unwired to it. Until the two agree, either also invoke the script from
CI, or record it in that script's exceptions file. This is a known duplication in the
tooling, not something your manifest did wrong.

## Commands this manifest assumes exist

| Command | Where it comes from |
| ------- | ------------------- |
| `pnpm check-types`, `pnpm lint`, `pnpm build`, `pnpm test` | yours — workspace scripts |
| `pnpm verify:route-guards` | yours, installed in **Step 1** above from `examples/route-guard-coverage/check.mjs` |
| `pnpm verify:workflow` | the **practices pack** — see Step 1. The pack creates files and never edits your `package.json`; the script line is yours to paste. Without the pack, delete the `infra` rule rather than leaving a command that cannot resolve |

**Nothing in this table is provided by copying the manifest.** Step 1 exists because a
cookbook entry that is not runnable as copied fails at Phase 4 with an error about a
missing script, which reads as a broken tool rather than an unfinished install.

## Verify it before you trust it

```
gate check --wiring
gate check PRD-001
gate run PRD-001 --dry-run
```

`gate check PRD-001` is where the hard cap speaks: an armed PRD with no `Deny test:` line
is refused there, at readiness, not at Phase 4 after the work is done.
