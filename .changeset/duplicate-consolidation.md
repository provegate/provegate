---
'provegate': minor
---

Two new corpus sweeps — `gate check --review-artifacts` and
`gate check --durable-artifacts` — replace the three practices-pack scripts the pack no
longer ships (`verify-review-artifact.mjs`, `verify-durable-artifacts.mjs`,
`verify-gates-wired.mjs`; the wiring rule lives in `gate check --wiring`). `gate check
PRD-NNN` now also lints the Durable Artifacts declaration at readiness. An older CLI has
none of these flags, so upgrade the CLI first, then migrate.

`gate init` is additive-only by design, so an existing install keeps its old copies until
you migrate BY HAND. The five steps — the fifth loses data if skipped:

1. Delete `scripts/verify/verify-review-artifact.mjs`,
   `scripts/verify/verify-durable-artifacts.mjs` and
   `scripts/verify/verify-gates-wired.mjs` — but NOT the exceptions file yet: step 5
   reads it, and deleting it first loses the data step 5 exists to preserve.
2. Remove the three matching `package.json` script entries.
3. Remove the three names from the `CHECKS` array in your installed
   `scripts/verify/verify-workflow.mjs`.
4. Add `gate check --review-artifacts`, `gate check --durable-artifacts` and
   `gate check --wiring` wherever the removed checks ran (CI, hooks, your manifest via
   package-script aliases).
5. Convert your exceptions: drop the entries for the three removed scripts; map each
   survivor's filename to the `package.json` script that invokes it; DROP every survivor
   that is already wired (the audit refuses a wired exception as stale); record what
   remains in `gates.manifest.json` under `wiringExceptions` with a real, non-whitespace
   justification — and only THEN delete the old `gates-wired-exceptions.json`, as this
   step's last act. If the file is absent there is nothing to do; if it is present but
   empty, skip the conversion and still delete the file — a retired store needs no
   contents to be retired.

Downgrading back: restore the four files from the pack of the previous release and
reverse steps 2–5; nothing happens automatically in either direction, which is what makes
the manual migration safe to publish.
