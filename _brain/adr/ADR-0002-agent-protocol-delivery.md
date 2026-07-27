---
name: ADR-0002-agent-protocol-delivery
description: >-
  Shipped phase protocols reach agents as a rendered store installed one way, with
  pointer-only generated adapters and enumerated tokens instead of a template language.
type: decision
scope: workflow
status: accepted
links: [shipped-content-needs-a-delivery-gate, derive-the-requirement-from-the-consumer]
---

# ADR-0002: Agent protocol delivery

## Context
The package shipped ten phase protocols in `packages/provegate/prompts/` and installed none
of them. `package.json` `files` published the directory; `PACK_MAP` named no entry in it, so
an adopter's copy sat in `node_modules/provegate/prompts/` where no agent's file reader is
pointed. This repository had the same gap in its own checkout, and the consequence was
observable in both directions: `phase-3-task-generator.md` carries a STOP rule agents here
never loaded, while `AGENT_BOOTSTRAP.md`'s ten stop-and-ask checkpoints were the only phase
guidance always in context, with no counterweight saying Phases 4–7 proceed without asking.
Agents skipped the human gates and invented new ones, from one cause.

The parent project had no such gap: a glob-attached rule mapped each phase to its prompt.
Extraction carried the method and left the delivery mechanism behind.

Delivery could not be a copy. The corpus carries placeholder tokens that resolve against the
consuming repository's configuration, so an adopter receiving the raw files receives
`{{CMD_TEST}}` and no way to resolve it.

## Decision
Protocols reach agents as a **rendered store**, written by `gate init --prompts` into a
configured directory, with thin per-tool adapters that point into it.

Four choices inside that, each taken against a rejected alternative:

**The install is ONE WAY.** No receipt, no reconciliation, no exception store, no `sync`.
Reinstalling is deleting every path the command printed and running it again. The plan is an
ordinary `InitAction` set, so it inherits the installer's additive-only contract unchanged —
no preflight, no mismatch refusal, no exception to scope.

**The reinstall unit is the printed set, not the store directory.** Two of the three adapter
destinations live outside it. Every run prints the complete set for that reason.

**Adapters carry a path and no protocol prose**, validated by a positive grammar rather than
by comparing lines against protocols. One protocol in one place is the point.

**Conditional content is an enumerated token**: the registry names a token's legal values,
the package ships one terminal fragment per value, and the config supplies the key. Method
text stays in the package, where the provenance rule can see it.

**Activation is `prompts.enabled`, never presence.** `mergeConfig` deep-merges defaults, so a
presence test can never be false once the block has them — the mechanism this codebase had
already rejected for `memory`, with the reasoning written at `defaults.ts:95-101`.

## Consequences
Adopters get the method their package ships, resolved for their repository, and a stale store
is readable because every generated file names the package version that produced it.

What becomes harder: an upgrade is manual, and a store that goes stale after one is detectable
only by a human reading a banner. That is a disclosed limit of this version and PRD-030 owns
it — the layer was removed rather than repaired because four independent readiness rounds put
every mechanism defect in it while measuring the layers beneath exact.

The entrypoint invariant is narrowed rather than broken: `planPractices` still installs no
adopter entrypoint, and a generated adapter at a provegate-namespaced path is a different
class. The distinction is written into that function's comment, because the comment reads as
a blanket rule and a reader who has only the code must not conclude the rule was abandoned.

Interacting legal values across two enumerated tokens are refused rather than approximated. A
composite enumeration is the answer if one is ever needed, which keeps the mechanism at one
indirection.

## Alternatives considered
**A conditional block syntax in the renderer** — more general, and it makes `prompts.ts` a
template language. `narrow-the-grammar-not-the-parser` argues the other way, and template
languages grow.

**Two whole variants of a protocol file, selected by config** — no mechanism at all, and the
same rule in two files. This repository's most measured defect is a rule corrected where it is
owned and left standing where it is restated.

**The block text in `prompts.values`** — moves method prose into an adopter's configuration,
where the provenance rule cannot see it. Provenance failing from the other side.

**A receipt that grants overwrite authority** — carried through three revisions and rejected at
readiness iteration 4: membership in a manifest was granting a capability while the documents
promised it granted nothing, and reproducing bytes says nothing about whether a human wanted
the old ones.
