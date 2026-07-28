---
name: runner-sentinel-blocks-cli-spawning-tests
description: >-
  A §11 row that runs tests which themselves spawn the gate CLI fails under `gate run` —
  the re-entry sentinel propagates through the environment into the children and refuses
  them; route the row through turbo (honest inputs make a replay a valid green).
type: gotcha
scope: workflow
status: active
links: [turbo-cache-masks-out-of-input-reads, lint-must-name-the-span-it-judges]
provenance: PRD-024
---

`gate run` exports `PROVEGATE_RUN_ACTIVE=1` into every §11 command's environment so a
row containing `gate run` cannot recurse (`chain.ts` — deliberate, enforced at
`cli.ts`). But the sentinel rides ordinary process-env inheritance, so it also reaches
CLI invocations made by *tests*: `revalidate.test.ts` spawns `gate run` inside isolated
temp fixtures, and under the runner those children refuse with the re-entry error — ten
failures in a file that is green under a plain `pnpm test`.

**Why:** three pieces are each correct alone — the sentinel (stops recursion), the test
(exercises the real CLI in a sandbox), the §11 row (wants the whole suite green) — and
the failure only exists at their intersection, which no single file shows.

**How to apply:** a §11 row that needs the whole suite goes through turbo (`pnpm test`),
not a direct package invocation: turbo runs the suite in its own task context, and once
the task's `inputs` are honest (every out-of-package read declared), a cache replay is a
valid green rather than a mask. If a future row genuinely must run a CLI-spawning test
file directly under the runner, the test must strip the sentinel from the env it gives
its children — an isolation fix in the test, never an exemption in the runner.
