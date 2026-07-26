---
name: ADR-0001-closed-loop-agent-memory
description: >-
  Durable memory is closed into a loop through artifacts the repo already commits: declared
  PRD inputs, watch-triggered review, base-ref weakening proof, and Phase 7 capture.
type: decision
scope: workflow
status: accepted
links: [durable-artifact-must-commit, verify-check-phase-placement, gate-wire-or-delete]
---

# ADR-0001: Closed-loop agent memory

## Context
`_brain` stored durable knowledge and instructed capture, but nothing closed the loop.
Nothing recorded which prior records influenced a piece of work, so nothing could show
later that a known constraint was considered — or that it was honored. At the gate, an
agent that wrote no learning and an agent that had nothing to learn were indistinguishable.

Two failure modes followed from that gap, and both were observed rather than predicted.
Capture became ceremonial: a record could be promised in a PRD and never written, and the
close still passed. And recall became optional: a record whose subject a PRD touched
directly could go unread, because nothing connected the record's declared `watch` paths to
the PRD's declared targets.

The constraints on any fix were fixed in advance. The shipped package takes zero runtime
dependencies and makes no network call, so a database, a service, or an embedding index
was never available. Phases 1–3 stay human-approved and push stays human. A repository
that has not opted in must behave exactly as it did before, byte for byte — which rules
out inferring enablement from a `_brain` directory existing.

## Decision
Close the loop with artifacts the repository already commits, and no second state store:

```
INDEX → PRD Memory Inputs → readiness → tasks → implementation → independent review
      → Memory Outputs / Durable Artifacts → Phase 7 validation → INDEX
```

Every arrow is a file in the merge diff. Concretely, four bindings carry it:

1. **Declared inputs.** A PRD names the records it considered, each with a disposition —
   `applied`, `reviewed`, `not-applicable` — and a rationale. A reasoned `none` is legal;
   an unreasoned one is not. Readiness resolves each slug against the real store, so a
   superseded, unindexed, or invalid record is refused by name.
2. **Watch as a review trigger.** An active record's `watch` glob overlapping a declared
   target, or a file in the closing diff, requires an input disposition naming that
   record. It does **not** require editing the record. Treating overlap as proof of
   staleness would train agents to suppress watches rather than declare them.
3. **Outputs proved against the diff.** Declared outputs are exact repo-relative paths,
   each also a Durable Artifact, and Phase 7 refuses a close whose declared paths are
   absent from the merge diff. A declaration is not a capture.
4. **Weakening proved against the base ref.** The comparison baseline is the PRD as
   committed on the base branch — the one version an agent editing its own PRD cannot
   rewrite. Appending an output discovered during implementation is always allowed;
   removing one, changing its type or path, or replacing it with `none` is weakening,
   refused outright for an `eligible` PRD and owner-gated otherwise.

The contract is configuration-driven (`memory.enabled`), default-off, and additive on
install: existing config, manifests, and agent entrypoints are never edited on an
adopter's behalf.

## Consequences
What becomes easier: a reviewer can audit recall, because the claim is written down and
the diff either supports it or does not. Capture stops being a matter of discipline —
the promise and the evidence are compared mechanically, in the same merge.

What becomes harder, deliberately: every memory-enabled PRD now carries two more sections
that a gate parses, and a watch glob is a commitment that future PRDs touching those paths
will have to answer for. Records therefore have a cost, which is the correct pressure —
the store should hold what is non-derivable, not everything.

What must be lived with, stated rather than claimed away:

- The land-time lease barrier is a `gate land` precondition, **not** a git-level
  invariant. A direct `git merge` bypasses it exactly as it bypasses every other gate
  here, and a worktree that survives the merge never re-checks its control artifacts,
  because only a new claim revalidates them. Closing that residual is PRD-022's scope.
- The workspace mutex fails closed on a stale marker, so a crashed holder can block a
  land until an owner clears it manually. That is the correct trade for a lock.
- The record validator is strict in every repository that runs it, regardless of memory
  configuration. Repositories that already validated their store will see records
  rejected that the previous, weaker validator accepted.

## Alternatives considered
**Instruct, do not enforce.** Keep the capture protocol as prose and trust the phase
prompts. Rejected because that is the status quo whose failure mode prompted this: an
instruction with no gate produces artifacts that pass whether or not anyone followed it.

**Compare declarations against working state.** Simpler, and no git plumbing. Rejected
because the agent editing the PRD controls that state: the promise could be edited away
and the edit then verified as compliant. The baseline must be a version the author cannot
rewrite, which is what the base ref is.

**Treat a watch overlap as a staleness verdict** — require the record be updated whenever
a watched path changes. Rejected as an incentive error: it makes declaring a watch
expensive for its author and trains agents to omit them, which removes the very signal
the mechanism exists to produce.

**Grandfather leases already in flight at activation.** Rejected because it is not merely
imprecise but impossible here: a lease records no base SHA, commit timestamps are mutable,
and a merge commit cannot contain its own SHA to name itself as the activation point.
Activation refuses while a foreign lease is active instead, so there is nothing to
grandfather and no boundary to compute.

**Retrieval by embeddings, and effectiveness statistics.** Both deferred rather than
rejected outright. Embeddings would add a runtime dependency and a network call, which the
package forbids; counting reuse before contract-bearing PRDs exist would measure ceremony,
not effect, and is recorded on the status board with an owner and a review date.
