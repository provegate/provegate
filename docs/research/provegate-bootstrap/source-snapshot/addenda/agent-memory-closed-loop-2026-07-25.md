# Addendum A1 — Closed-Loop Agent Memory

> **Status:** approved by the owner, 2026-07-25.
> **Scope:** method content for PRD-017 (substrate), PRD-018 (contract and enforcement),
> and PRD-019 (adoption CLI).
> **Relationship to the snapshot:** the frozen snapshot under `../` is unchanged and stays
> unchanged. This file is an *addendum*: method content the source project never had, which
> the owner approved as a canonical extension of the workflow. Written in English because
> shipped package content is English-only (MANIFEST §4).

## 1. Why this file exists

Package prompts, templates, and schemas may only carry method content traceable to the
frozen snapshot — the rule exists so an agent cannot invent method under the guise of
implementing it. That rule has no expression for a *deliberate* extension, so the only
ways to add one were to fabricate content or to edit the frozen copy. Both are worse than
the problem.

An addendum is the third way: new method content, owner-approved, dated, and stored beside
the snapshot rather than inside it. The frozen bytes stay frozen; the extension is
traceable to a specific approval; and a reader can always tell which is which by location.

**Rule (recorded in `../../DECISIONS.md`):** post-bootstrap method extensions require an
owner-approved addendum under `source-snapshot/addenda/`, listed in `MANIFEST.md`. Shipped
method content must trace to the snapshot *or* to an addendum. Nothing else counts.

## 2. The problem this extension solves

`_brain` already stores durable, non-derivable knowledge, and its capture discipline is
sound: a small always-loaded index, detail files opened on demand, a learning written at
close. What it lacks is a *loop*. Nothing records which prior records influenced a piece of
work, so nothing can show that a known constraint was considered and — later — that it was
honored. Capture is instructed rather than proved: an agent that writes no learning and an
agent that had nothing to learn are indistinguishable at the gate.

The extension closes that loop with artifacts the repository already commits:

```
INDEX → PRD Memory Inputs → readiness → tasks → implementation → independent review
      → Memory Outputs / Durable Artifacts → Phase 7 validation → INDEX
```

Every arrow is a file in the merge diff. No database, no service, no second state store.

## 3. Program shape

The extension lands as three work items, in dependency order. The split exists because the
substrate is safe to land alone while the contract changes how every future work item is
gated, and mixing them would make a mistake in the first indistinguishable from a mistake
in the second.

| Item | Owns | Enables |
| ---- | ---- | ------- |
| Substrate | the addendum, default-off memory configuration, one supported record model, a hardened standalone validator, and a conformance corpus shared by both parser implementations | nothing — no behavior changes |
| Contract and enforcement | the PRD memory grammar, readiness watch gate, phase-prompt flow, Phase 7 output/watch/weakening enforcement, and activation | the loop, for repositories that opt in |
| Adoption CLI | read-only wiring diagnosis and deterministic local recall | adopters proving and using their own installation |

Effectiveness statistics are deliberately **not** in the program. Counting reuse before
contract-bearing work items exist would measure ceremony, not effect; the decision is
recorded on the status board with an owner and a review date rather than dropped.

## 4. Knowledge boundary

Two stores, one rule each. The boundary is what keeps the loop from turning `_brain` into a
second documentation site.

- **`_brain` owns** what the code cannot reveal: traps, conventions the code does not state,
  decision rationale, and pointers to external resources. Its test is *non-derivability* —
  if a careful reader could recover the fact from the repository, it does not belong.
- **Product, architecture, and operations documentation own** maintained explanations of
  how the system currently behaves.

A product document may link to a record; it must not copy the record's rationale. A record
must not restate what the product document maintains. When both would be true, the record
wins for *why* and the document wins for *what*.

## 5. PRD memory contract

Two sections, fixed grammar. Both are required in a memory-enabled repository and both are
parsed, not read.

### Memory Inputs

```
- applied|reviewed|not-applicable: `<record-slug>` — <rationale>
- none — <why no active record is relevant>
```

- `applied` — the record changed this work item's shape.
- `reviewed` — the record was read and found not to change it, but is close enough that a
  reader deserves to know it was considered.
- `not-applicable` — the record's watch or subject matched, and it does not apply here.
- A referenced record must exist, be `active`, and be indexed.
- A rationale is required in every form, including `none`. An unreasoned `none` is the
  ceremonial answer the contract exists to prevent.

### Memory Outputs

```
- learning|adr: `<exact repo-relative path>` — <the durable fact expected>
- none — <why no non-derivable output is expected>
```

- Paths are exact. A directory, a glob, or a promise to "capture learnings" is not an
  output.
- **A non-empty output set may not contain `none`.** The two forms are mutually exclusive:
  `none` asserts the set is empty, so a section holding both asserts nothing and leaves the
  weakening comparison in §7 without an unambiguous baseline.
- Every non-`none` output must also appear in the work item's Durable Artifacts. Outputs and
  durable artifacts are one contract expressed twice, never two lists that may disagree.

## 6. Watch semantics

A record may declare `watch` globs: the paths whose change makes the record worth
re-reading.

- An **overlap** between an active record's `watch` and a work item's declared targets — or
  the closing diff — requires an input disposition naming that record. It does **not**
  require editing the record.
- A watch is a **review trigger, not a staleness verdict**. Treating overlap as proof of
  staleness turns every touched path into a rewrite obligation, which trains agents to
  suppress watches rather than declare them.
- Target matching strips an optional `::SymbolName` suffix before applying the repository's
  existing glob grammar, so a symbol-scoped target still matches a path-scoped watch.
- `watch` is not an ownership claim. Two records may watch the same path.

## 7. Weakening semantics

Declared outputs are a promise, and the promise must survive the work item that made it.

- The comparison baseline is the work item's PRD **as committed on the configured base
  ref** — the one version an agent editing its own PRD cannot rewrite. Comparing against
  working state would let the promise be edited away and the edit then verified as
  compliant.
- **Appending** an output discovered during implementation is always allowed, with a
  rationale. Discovery is the point of doing the work.
- **Weakening** is removal of a baseline output, a change to its type or path, or its
  replacement by `none`. It is refused outright for a work item eligible for autonomous
  close, and for an operator-gated one it requires both a recorded owner approval in the
  changelog and a matching owner acceptance entry.
- A missing, malformed, or uncommitted baseline **fails closed** and names the remedy —
  commit the PRD to the base branch — rather than reporting a bare comparison error.

## 8. Recall through phases 1–7

Each phase carries one obligation. The list is the contract phase prompts implement; a
prompt that adds a memory instruction not named here is out of scope for this addendum.

| Phase | Obligation |
| ----- | ---------- |
| 1 PRD generation | Scan the index, select relevant records, write Memory Inputs with dispositions and rationales, and declare expected Memory Outputs. |
| 2 Readiness | Stress-test the selection: challenge an unreasoned `none`, name any active record whose watch overlaps a declared target and is missing from the inputs. |
| 3 Task generation | Carry the selected slugs into executable task context so implementation does not re-derive them. |
| 4 Implementation | Open each selected record's detail file and confirm the paths and commands it names still exist before relying on it. A record is evidence only while it is true. |
| 5 Testing | No memory obligation. Verification is verification. |
| 6 Independent review | Audit whether the selected records were actually applied, and challenge `none` in both sections. |
| 7 Learning | Capture the actual outputs at their exact declared paths, append any emergent output before writing it, and run the configured validator after capture — not before. |

## 9. Local retrieval constraints

Retrieval exists so an agent can find the few records that matter without reading them all.
It is bounded deliberately.

- **Deterministic:** identical inputs against an identical tree produce identical output,
  including ordering. Ranking is watched-path overlap, then exact name or tag match, then
  case-insensitive token matches in name and description, then lexical slug order as the
  final tie-break.
- **Bounded:** a conservative default result count and a validated maximum. Retrieval that
  returns everything has returned nothing.
- **Honest about what it is:** ranking is deterministic, not semantic. No embeddings, no
  model call, no network, no persistent search index, no cache that correctness depends on.
- **Verified before use:** a record that fails validation is never returned. Retrieval and
  validation may not disagree about what a valid record is.
- **Read-only:** retrieval and diagnosis never write to the repository.

## 10. Invariants

These bind every part of the extension and are not negotiable per work item.

1. **Offline.** No network call, telemetry, account, or cloud state, at any phase.
2. **Zero runtime dependencies** in the shipped package.
3. **Push stays human.** No code path added here may push to a remote.
4. **Configuration over detection.** Behavior keys off explicit configuration. The presence
   of a memory directory never enables a gate; detection may only *report* a partial
   installation. A repository that has not opted in behaves exactly as it did before.
5. **Never overwrite.** Installation is additive. Existing configuration, manifests, agent
   entrypoints, package manifests, and CI files are never edited on an adopter's behalf.
6. **Supported subset, not general parsing.** The record format is an explicitly documented
   subset. Anything outside it fails with a path-tagged error rather than being guessed —
   a tolerant parser and a strict one disagreeing about the same file is the failure this
   prevents.
7. **One semantic contract, two implementations.** The typed parser and the standalone
   validator cannot import each other, because the validator runs in repositories where the
   package is not installed. A shared conformance corpus is their only contract, and it is
   the thing to attack first in review.
8. **Human approvals unchanged.** Phases 1–3 remain human-approved, independent review
   remains required, and operator acceptance remains an owner action.

## 11. What this addendum does not change

The seven-phase lifecycle, the gate model, the artifact directories, the review quorum, the
value-scoring triage, and the acceptance model are all untouched. Repositories that do not
enable memory keep their current behavior byte for byte. Historical work items are not
rewritten to manufacture retrospective compliance; they are simply outside the contract.
