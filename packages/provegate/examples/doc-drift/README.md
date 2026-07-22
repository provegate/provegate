# Example gate: doc-drift

**Pattern:** documentation that can drift from the code it describes eventually will.
This gate inverts the failure: when a watched source prefix changes in the merge
range, its declared doc must change in the same diff — the same discipline the
method's Phase 7 applies to Durable Artifacts, applied continuously to any doc.

Adapt the `WATCH` map in `check.mjs`, copy it into your repo, add a script, wire it:

```jsonc
// package.json
{ "scripts": { "verify:doc-drift": "node scripts/verify-doc-drift.mjs . main" } }

// gates.manifest.json — run it in phase 4 for every class, cheaply
{
  "phases": {
    "4": ["pnpm check-types", "pnpm lint", "pnpm build", "pnpm test", "pnpm verify:doc-drift"]
  }
}
```

`gate check --wiring` keeps it wired once it exists.
