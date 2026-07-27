---
name: shipped-content-needs-a-delivery-gate
description: >-
  Content published in a package but never installed into a consuming repository is invisible
  to every agent, and no gate that checks artifacts can detect it.
type: gotcha
scope: workflow
status: active
links: [derive-the-requirement-from-the-consumer, docs-outlive-the-gate-they-promise]
provenance: PRD-029
watch: [packages/provegate/prompts/**, packages/provegate/src/core/run/init.ts]
---

Packaging a protocol is not delivering it. `package.json` `files` published
`packages/provegate/prompts/` for eleven work items; `PACK_MAP` in `core/run/init.ts` named
no entry in it. So every adopter's copy sat in `node_modules/provegate/prompts/`, where no
agent's file reader is pointed, and this repository had the same gap in its own checkout.

**Nothing detected it, and nothing could.** Every gate in the method checks what the
artifacts SAY — a PRD's sections, a task file's checkboxes, a review's verdict, a manifest's
wiring. Not one checks what the agent actually read. `verify:pack-drift` compares the pack
against the live layer and passes, because the prompts were in neither. `content-*.test.ts`
asserts the corpus is internally consistent and passes, because it is. The frozen-snapshot
digest passes. Every one of them is correct and every one is blind to this.

The symptom that surfaced it was behavioural and looked like two separate problems:
`prompts/phase-3-task-generator.md` carries **"STOP — Do not continue until the user says
Go"**, and agents here generated task plans without it; meanwhile `AGENT_BOOTSTRAP.md`'s ten
stop-and-ask checkpoints were the only phase guidance always in context, so agents also
manufactured approvals during phases the method runs autonomously. Skipping the human gates
and inventing new ones were one defect: **asymmetric loaded context, not comprehension.**

**Why:** extraction moves the content and leaves the delivery mechanism, because the
mechanism lives in the source project's own configuration rather than in the artifact being
extracted. The parent project bound each phase to its prompt with a glob-attached rule; that
rule was not part of the method, so it was not carried.

**How to apply:** when a package ships content an agent is supposed to READ, ask what
installs it and what would fail if nothing did. If the answer to the second is "nothing", the
gap is invisible by construction and will be found behaviourally, months later, by someone
wondering why a documented rule is not being followed. Check the installer's map, not the
package manifest — `files` publishing a directory says nothing about any repository having
it. See [[derive-the-requirement-from-the-consumer]] for the sibling error inside the fix.
