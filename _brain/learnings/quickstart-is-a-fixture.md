---
name: quickstart-is-a-fixture
description: >-
  A public first-touch doc is a test fixture with a rendering: extract-and-execute the
  committed doc's tagged region, keep the doc the runtime source so BOTH directions of
  drift fail, and prove doc-sourcing with a mutation the production tool actually
  rejects.
type: convention
scope: workflow
status: active
links: [docs-outlive-the-gate-they-promise, derive-the-requirement-from-the-consumer]
watch: [packages/provegate/QUICKSTART.md, apps/docs/content/docs/quickstart.mdx]
---

PRD-038 turned `QUICKSTART.md` into an executed fixture, and the pattern generalizes to
any public doc that promises a command sequence.

**Extract-and-execute beats restate-and-hope.** The harness parses the committed doc's
tagged `qs:scenario` region at run time and stores no command copy — a copy is the
drift the gate exists to kill. Ignored-but-documented alternatives get an explicit
skip marker binding to exactly the next fence, so teaching position survives without
execution.

**The doc must be the runtime source so both directions fail.** A CLI change that
breaks a printed step and a doc edit that breaks the path both turn the same test red.
Doc-sourcing is PROVEN, not assumed: mutate a scratch COPY (swap two commands so the
production tool itself refuses — `gate open` before `gate new` has nothing to claim)
and watch the failure name the step with its retained line from the copy.

**Prototype before specifying.** Three readiness rounds oscillated while the scratch
close-path was guessed prose; one real execution produced the [D]/[H] transcript
(claim succeeds on the raw template; the chain demands no readiness artifact; three
exact stop strings) and the item converged immediately. Ground truth is cheaper to
run than to argue about.

**Why:** first-touch docs rot silently because no gate reads them, and a broken first
five minutes costs an adopter.
**How to apply:** tag the canonical region; run it hermetically (tarball install
against an unreachable registry, scrubbed git config, remapped HOME/XDG/npm/TMP,
remote-emptiness asserted every step); pin real failure strings as negative fixtures;
and when the sequence's ground truth is disputed, execute it once and paste the
transcript.
