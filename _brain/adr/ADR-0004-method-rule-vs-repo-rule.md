---
name: ADR-0004-method-rule-vs-repo-rule
description: >-
  A check is method-class when it governs the method's artifacts and repo-class when it
  governs this repository's stack; the class ledger is repo-class and lives in
  scripts/verify, never in shipped package code.
type: decision
scope: workflow
status: accepted
links: [gate-wire-or-delete, known-red-ledger-must-expire]
---

# ADR-0004: Method Rule versus Repo Rule — the Classification and Its Home

## Context

Three method rules were implemented three times each (package, repo script, packed
script), and the consolidation wave needed a durable answer to two questions: what makes
a check a METHOD rule rather than a REPO rule, and where does the ledger recording that
classification live. An earlier draft put the ledger inside `auditWiring` — shipped
package code that `gate check --wiring` runs for every adopter — where the `method` class
is structurally unreachable for an adopter and a repository-local artifact became a hard
requirement of shipped code. Two independent reviewers found that seam from opposite
sides.

## Decision

A check is **method-class** when it governs the method's artifacts — PRDs, readiness
records, tasks, review records, memory records — and **repo-class** when it governs this
repository's stack (build caches, dependency hygiene, pack integrity, egress, its own
scripts directory). The test is what the check READS, not where it runs.

The class ledger (`scripts/verify/script-classes.json`) and its gate
(`verify-script-classes.mjs`) are **repo-class**: they govern which files exist under
this repository's scripts directory and where each belongs. They live in
`scripts/verify/`, are wired like every repo check, and never ship in
`packages/provegate` or the practices pack. PRD-026 lands both.

## Classification

The surviving verify scripts at the time of transcription. The three scripts PRD-026
deletes (`verify-review-artifact.mjs`, `verify-durable-artifacts.mjs`,
`verify-gates-wired.mjs`) are deliberately **unlisted**: the ledger and this record are
born agreeing at that PRD's close, and neither store ever contains the deleted trio.

| Script | Class |
| ------ | ----- |
| verify-brain.mjs | method-pending |
| verify-deferred.mjs | method-pending |
| verify-memory-record-corpus.mjs | method-pending |
| verify-doc-claims.mjs | repo |
| verify-test-task-coverage.mjs | repo |
| verify-pack-drift.mjs | repo |
| verify-acceptance-rule.mjs | repo |
| verify-turbo-inputs.mjs | repo |
| verify-quickstart-parity.mjs | repo |
| verify-test-inputs.mjs | repo |
| verify-review-quorum-authority.mjs | repo |
| verify-prompts-mutation.mjs | repo |
| verify-dependency-audit.mjs | repo |
| verify-workflow.mjs | repo |
| verify-script-classes.mjs | repo |
| verify-prompts.mjs | repo |

Appended at PRD-034: `verify-prompts.mjs` reads this repository's `ci.yml` and executes
the built CLI from this repository's layout — repo-class by the what-it-READS test. The
method-side rule is not this script: it ships as the packed twin
(`practices/verify/verify-prompts.mjs`), which imports the package's exported primitive.

`verify-quickstart-parity.mjs` (PRD-038) is repo-class by the Decision's own test: it
READS this repository's two quickstart documents — a doc-consistency rule for this
repo, not a method artifact — and never ships in the package or the pack.

## Alternatives

**Ledger inside `auditWiring` (rejected, twice found):** makes a repository-local file a
hard requirement of code every adopter runs, where `method` is unreachable for them, and
splits the transition across two PRDs. **Classification by execution location (rejected):**
where a check runs is an implementation choice; what it reads is the invariant — a method
rule executed from CI is still a method rule. **No ledger, review-only (rejected):** the
fourth duplicate arrived through five adversarial review rounds unseen; a gate is the
only reader that does not tire.

## Consequences

A new duplicate of a method rule fails at a gate rather than at review: a `method`-class
entry whose script still exists is red by definition, and `method-pending` expires on its
`reviewBy` date (`known-red-ledger-must-expire`). The ledger schema, the failure
conditions, and the mechanical diff of this table against the ledger are PRD-026 FR-8's;
this record carries the decision and the classification, not the mechanism.
