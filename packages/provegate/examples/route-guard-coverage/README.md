# Example gate: route-guard-coverage

**Pattern:** a route file without a deny-path guard test is a declared security
guarantee that is not one. This gate makes the pairing mechanical: every
`*.route.ts` / `*.controller.ts` must have a sibling `*.guard.test.ts`.

Adapt the two patterns at the top of `check.mjs` to your layout, copy it into your
repo (e.g. `scripts/verify-route-guards.mjs`), add a script, and wire it:

```jsonc
// package.json
{ "scripts": { "verify:route-guards": "node scripts/verify-route-guards.mjs" } }

// gates.manifest.json — run it for feature/hotfix diffs that touch routes
{
  "classDefaults": {
    "feature": [
      { "when": { "diffMatches": ["src/routes/**"] }, "run": ["pnpm verify:route-guards"] }
    ],
    "hotfix": [
      { "when": { "diffMatches": ["src/routes/**"] }, "run": ["pnpm verify:route-guards"] }
    ]
  }
}
```

The wire-or-delete audit (`gate check --wiring`) will hold you to it: once the script
exists it must stay wired or carry a justified exception.

Pair it with a manifest hard cap so the _PRD_ names the deny test before scoring:

```jsonc
{
  "hardCaps": [
    {
      "id": "route-deny-test",
      "when": { "targetsMatch": ["src/routes/**"] },
      "requireLine": "Deny test: `(?:pnpm|npm|npx|yarn|bun|node|tsx|vitest) [^`]+`",
      "message": "targets touch routes - name a runnable deny-path test line",
    },
  ],
}
```

The runner prefix in `requireLine` is load-bearing, and it was added by measurement:
the shipped PRD template carries a placeholder line, `` Deny test: `path/to/x.test.ts` ``,
under its hard-caps reminder. A pattern of `` Deny test: `[^`]+` `` matches that
placeholder, so the cap passes on every PRD `gate new` produces and fires only after an
author happens to delete the line. Requiring a runner prefix makes the pattern mean what
the message says — *name a runnable deny-path test line* — and the placeholder no longer
satisfies it.
