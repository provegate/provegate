---
name: the-first-hour-is-a-surface
description: >-
  The steps between install and first close are a product surface with no gate over them;
  self-hosting cannot see them because maintainers perform each one so often they stopped
  noticing they were performing it. Measure it from outside, once.
type: convention
scope: workflow
links: [shipped-content-needs-a-delivery-gate, quickstart-is-a-fixture]
status: active
watch: [packages/provegate/src/core/run/new.ts, packages/provegate/QUICKSTART.md, scripts/adopter-smoke.sh]
---

Every gate in this repository reads the source tree, so none of them can observe what an
install hands someone. The first external run (PRD-042, 2026-08-07) found five defects in
under an hour, and every one had been invisible for 39 self-hosted items — not because the
gates were weak, but because the maintainers had learned the one working shape of each step
and stopped seeing the others.

The measured list, as a shape to look for rather than a list to fix:

- **A command created one of the three artifacts its own chain reads.** `gate new` wrote the
  PRD; the tasks file and the review artifact were `node_modules` archaeology.
- **A stop named what was missing and not what it wanted.** `no tasks file` said neither the
  path nor the row shape, so the adopter reverse-engineered both.
- **Placeholders shipped into a closed artifact.** Seven `{{TOKEN}}`s the configuration could
  already answer survived into the merged PRD.
- **A contract shipped into a repository that could not enforce it** — the memory sections,
  with no signal that they were inert.
- **The document taught the steps in the order the maintainer already knew**, not the order a
  reader meets them: the manifest recipe sat after the close that executes it, and
  `gate init` writes an empty manifest.

**Why:** a maintainer's first hour happened years ago and left no artifact. Nothing in the
repository records it, so nothing can drift-check it, and no amount of self-hosting recreates
it — the 40th PRD exercises the same worn path as the 39th.

**How to apply:** keep one adopter-shaped fixture that installs the PACKED artifact into a
repository the tool has never seen and drives one item to a close ([[shipped-content-needs-a-delivery-gate]]).
Run it in CI. When it finds friction, resist fixing the fixture — the fixture is reporting the
product. And when a fix removes a signal an adopter used to get (PRD-042's token pass removed
the lint refusal that caught an unfilled PRD), record the loss where the next person meets it
rather than where it was convenient to write.
