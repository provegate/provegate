# Summary: PRD-029 — Method Delivery, One-Way Protocol Install

> **Status**: Code Complete · **Readiness**: 8.35 PASS (iteration 8) · **Review**: pass, critical 0
> **Branch**: `feat/prd-029-method-delivery` · **Tests**: 1026 → 1093 · **Date**: 2026-07-27

## What shipped

`gate init --prompts` renders the package's phase protocols into a consuming repository and
generates one adapter per configured tool. Before this, `package.json` published
`packages/provegate/prompts/` and `PACK_MAP` installed none of it, so every adopter's copy sat
in `node_modules/` where no agent's file reader is pointed — and this repository had the same
gap in its own checkout.

Seven FRs: the `prompts` config surface, an ordered disposition list over the shipped corpus, a
pure render with a token grammar, values derived from the rendered corpus, the installer branch,
grammar-checked adapters, and the pack instructions.

**The install is one way.** No receipt, no reconciliation, no `sync`, no upgrade path.
Reinstalling is deleting every path the command printed and running it again. That boundary is
the scope, not an omission, and it is stated in the command's output, the store's generated
README and `NEXT_STEPS.md`.

## The decisions worth remembering

**Activation is `enabled`, never presence.** `mergeConfig` deep-merges defaults, so once the
block has them `merged.prompts` exists everywhere and a presence test can never be false. This
codebase had already rejected that mechanism for `memory` and written the reasoning at
`defaults.ts:95-101`; the earlier design picked it anyway without mentioning the precedent.

**Totality lives in the refusal.** No finite rule list covers a directory anyone may add a file
to, so a package file matching no disposition fails the plan by name and the diagnostic lists
the dispositions available.

**The required-value set is derived from the consumer.** The registry declares 20 tokens and
covers `practices/templates/`, which the store does not render; the honest requirement is nine.
Requiring all thirteen non-config rows would have made every adopter answer four questions that
cannot change one byte of output.

**The reinstall unit is the printed set, not the store directory.** Two of the three adapter
destinations live outside it.

**Conditional content is an enumerated token**, with terminal package-shipped fragments, so
method prose stays where the provenance rule can see it. The mechanism ships with zero tokens;
PRD-031 ships the first.

## How it got here

Eight independent readiness rounds: 4.48 → 5.73 → 5.90 → 5.63 → 4.53 → 6.03 → 7.48 → **8.35**.

Five of those sat in the 4–5.9 band, whose prescribed action in
`phase-2-readiness-scorer.md` is *"Major rework needed. Return to Phase 1"* — and each was
given the 6–7.9 action instead. Nobody read the table until round 6. Every mechanism defect
across four rounds had landed in one layer while the layers beneath measured exact: **the
reviews were locating a scope error and reporting it as a run of design errors**, because a
defect list is the only shape a per-round review has. Cutting the layer moved the score to 6.03
and then 8.35, and nothing new was designed after the cut.

Phase 6 returned **fail with one critical**, all four blocking findings reproduced:

- an unvalidated adapter name wrote 11 protocols, **zero adapters**, and exited 0 while
  reporting success;
- `prompts.dir` never joined the lexical path rules, so `~/store` was accepted and the printed
  reinstall set — under the instruction *"delete EVERY path above"* — expanded to the adopter's
  **home directory**;
- the containment diagnostic was swallowed and reported as *"prompts is not enabled"* about a
  config that enables it;
- the collision guard's test could not fail on a case-insensitive volume, which is where the
  work was done.

**Two overshoots inside that remediation, both caught by the suite**: a regex for an adversarial
input spanned two adjacent valid tokens and refused four shipped files, and the config-error fix
broke `gate init` in a bare directory. Both are
`strictness-added-during-extraction-is-a-behavior-change`, committed by the session that had
just been shown that record.

## Spec-vs-code: two places the implementation exceeds the specification

Recorded rather than silently absorbed, and **not** fixed by editing FRs — the spec was scored
at 8.35 and rewriting a requirement after the fact is the weakening the method guards against.

1. **Adapter membership is validated in the resolved pass**, while FR-1 assigns shape and
   unknown-key checks to the raw pass. Membership of a closed set is arguably shape; it sits in
   `validateResolvedConfig` beside `validateValueScoring`, which is where value-set constraints
   already live. No FR forbids it and no behaviour contradicts the spec.
2. **`prompts.dir` gets the lexical path rules, which no FR mentions.** FR-1 specifies only the
   filesystem containment. The lexical half is what Phase 6's M1 required, and the spec never
   asked for it because the spec never noticed it was missing.

Both belong in the successor's scope review rather than in a post-score FR edit.

## What is not done

- **Two operator handoff rows stay open by design.** The generated Cursor rule must be shown to
  attach in a live editor and a generated Claude command to resolve. The grammar test pins the
  bytes; only a real session proves the pointer resolves for the tool. This is why the PRD is
  operator-gated.
- **Automated staleness detection is PRD-030's**, by scope. After an upgrade the store does not
  change and nothing detects it; every generated file names its producing version, and reading
  that banner is the disclosed mechanism.
- **PRD-030 remains quarantined** — everything but its FR-1 is a declared non-binding sketch
  until `_docs/design/prompt-store-state-model.md` exists.

## Durable artifacts

- `_brain/adr/ADR-0002-agent-protocol-delivery.md`
- `_brain/learnings/shipped-content-needs-a-delivery-gate.md`
- `_brain/learnings/derive-the-requirement-from-the-consumer.md`
- `_brain/learnings/scope-out-the-layer-the-rounds-keep-hitting.md`
- `_docs/reviews/review-029-method-delivery-agent-binding.md`
