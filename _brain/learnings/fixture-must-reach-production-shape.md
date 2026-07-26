---
name: fixture-must-reach-production-shape
description: >-
  A regression that calls the fixed function with better arguments than production does
  cannot detect the defect; mutation-checking it proves only that the test runs the line.
type: gotcha
scope: workflow
status: active
links: [two-parsers-wrong-together, false-green-on-missing-file]
watch: [packages/provegate/src/core/run/worktree.ts, packages/provegate/src/cli.ts]
---
A worktree close deleted its checkout and its branch and left the lease behind, so the
work item stayed IN-FLIGHT until its TTL expired. The fix unlinked the lease inside the
teardown, shipped with five regressions, and every one of them passed. It did not work.

Production passes `stamps.file`, which is a BASENAME. The tests passed an absolute path.
`unlinkSync` resolved the basename against the process cwd, failed with ENOENT, and the
"already gone counts as released" branch reported success while the lease survived — so
the handoff card said `lease released` and the next overlapping claim was refused.

Mutation-checking did not catch it. Deleting the unlink failed three tests, which proved
the tests reach that line; it could not prove they reach it the way the caller does. The
review that found it read the call site and the fixture side by side, which is the only
thing that would have.

**Why:** a fixture is an assumption about how the code is invoked, and an assumption
written by the same person in the same sitting inherits the same blind spot. Absolute
versus relative, trimmed versus raw, committed versus working-tree — the argument SHAPE is
where this hides, and it never shows up as a failing test.
**How to apply:** when a regression covers a fix, read the production call site and copy
its argument shape into the fixture, including the parts that look incidental. If the
function is reachable only through a caller you cannot invoke in a test, say so in the
test rather than substituting a cleaner argument. And when a fix has an "already fine"
branch — ENOENT, empty, absent — check what that branch would report if the input were
malformed, because it is the branch that turns a wrong argument into a green run. See
[[two-parsers-wrong-together]] for the same failure between two readers of one document.
