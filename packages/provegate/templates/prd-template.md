# {{ID_PREFIX}}-XXX: [Feature Name]

> **Status**: Draft
>
> <!-- Canonical lifecycle values only (see METHOD.md → Status lifecycle):
> Draft | In Review | Approved | In Progress | Code Complete | Operator Verification |
> Ship Verified | Superseded | Archived | Blocked | Deferred | Not Started. Never
> write "Completed"/"Done" — the state builder normalizes known aliases but the
> canonical value is the contract (workflow.config statusVocab.canonical). -->
>
> **Created**: [YYYY-MM-DD]
> **Updated**: [YYYY-MM-DD]
> **Author**: [role identity, e.g. owner]
> **Audience**: Implementing Agent
> **Slug**: `[short-name]`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Class Rationale**: [required when class ≠ feature — why this class, why not feature; one line]
> **Autonomous Close**: operator-gated

<!-- Autonomous Close declares whether the gated close may run without a human stop:
- `eligible` — every verification is machine-checkable; NO operator-owned rows exist.
  The runner may close and locally merge when all gates are green (push stays human).
- `operator-gated` — human/runtime/staging verification exists. The runner's merge gate
  refuses until an owner-signed acceptance entry exists (METHOD.md → Operator acceptance).
Any PRD that produces operator-owned task rows MUST be operator-gated. -->

---

## 1. Introduction / Overview

[What this feature is and the problem it solves]

---

## 2. Goals

### Primary Goals

- [ ] Goal 1
- [ ] Goal 2

### Success Metrics

| Metric     | Current | Target | Measurement      |
| ---------- | ------- | ------ | ---------------- |
| [Metric 1] | [X]     | [Y]    | [How to measure] |

---

## 3. User Stories

#### User Story 1

```
As a [user type],
I want to [action],
so that [benefit].
```

**Acceptance Criteria:**

- [ ] AC1
- [ ] AC2

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1**: [Requirement with clear pass/fail criteria]
   - **Targets:** `path/to/file.ts::SymbolName`, `path/to/other.ts`
2. **FR-2**: [Requirement description]
   - **Targets:** ...

---

## 5. Non-Goals (Out of Scope)

- [Explicitly not in this PRD 1]
- [Explicitly not in this PRD 2]

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** [context], **When** [action], **Then** [expected result].

---

## 7. Technical Considerations

### Architecture

[Approach; decisions with rationale]

### Dependencies

- [Dependency or "none"]

<!-- {{TECH_STANDARDS}}: add your stack-specific sections here (schema changes, API
changes, cache/queue plans) as your project requires. -->

---

## 8. Implementation Scope

### In Scope

- [ ] [component/package 1]
- [ ] [component/package 2]

---

Section 9 below accepts exactly two entry forms, each alone on its raw line — `- (none)`,
or `- Deferred to [{{ID_PREFIX}}-NNN](<path>)` where the path resolves to a distinct,
unfinished, filed work item (create it first, then defer to it). Blank lines and one
terminal `---` are the only other lines allowed; anything else fails `gate check`.

## 9. Open Questions

- (none)

---

## 10. References

- [Related work items, docs, links]

---

## Memory Inputs

Records from the memory index this work item considered, each with a disposition and a
rationale. `applied` — the record changed this work item's shape. `reviewed` — it was read
and found not to change it, but is close enough that a reader deserves to know it was
considered. `not-applicable` — its watch or subject matched, and it does not apply here.
A rationale is required in every form, including `none`: an unreasoned `none` is the
ceremonial answer this contract exists to prevent.

Required in a memory-enabled repository, alongside Memory Outputs below.

- applied: `[record-slug]` — [how the record changed this work item]

<!-- When no active record is relevant, replace the bullets above with exactly one
reasoned `none` line: `- none — [why no active record is relevant]`. -->

---

## Memory Outputs

The durable records this work item expects to produce, at **exact** repo-relative paths. A
directory, a glob, or a promise to "capture learnings" is not an output. A non-empty output
set may **not** contain `none` — the two forms are mutually exclusive, because `none`
asserts the set is empty. Every non-`none` output must also appear in Durable Artifacts
below: outputs and durable artifacts are one contract expressed twice, never two lists that
may disagree.

Appending an output discovered during implementation is always allowed, with a rationale.
Removing one, changing its type or path, or replacing it with `none` is **weakening**, and
Phase 7 compares against this PRD as committed on the base branch — not against working
state.

- learning: `{{MEMORY_ROOT}}/learnings/[slug].md` — [the durable fact expected]

<!-- When no non-derivable output is expected, replace the bullets above with exactly one
reasoned `none` line: `- none — [why no non-derivable output is expected]`. -->

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `path/to/owned/dir/**`
- `none`

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- `{{DOCS_ROOT}}/[page].md` — [what is learned] | `none`
- ADR: `{{DOCS_ROOT}}/decisions/adr-XXX-[slug].md` | `none`
- `{{MEMORY_ROOT}}/learnings/[slug].md` — every Memory Output above repeats here; the two
  lists are one contract and Phase 7 refuses when they disagree

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check       | Scope | Notes |
| ---- | --------------------- | ----- | ----- |
| FR-1 | `{{CMD_TEST_SCOPED}}` |       |       |
| FR-2 | `{{CMD_TEST_SCOPED}}` |       |       |

Cross-cutting floor (run before Code Complete):

- `{{CMD_CHECK_TYPES}}` — zero errors
- `{{CMD_LINT}}` — zero warnings
- `{{CMD_TEST}}` — added tests pass; existing tests unchanged
- `{{CMD_BUILD}}` — clean build

Hard caps (when your gates manifest configures them):

- Deny test: `path/to/x.test.ts` — [required when Targets touch protected surfaces]
- Contract test: `path/to/x.test.ts` — [required when a new client→server payload ships]

Before Phase 2 PASS, run: `gate check {{ID_PREFIX}}-XXX`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.

<!-- {{DOMAIN_CHECKS}}: add your project-wide forbidden moves (scoping bypasses,
ghost roles, unregistered permissions) plus feature-specific ones. -->

- [Feature-specific anti-patterns]

---

## Changelog

| Date         | Author | Changes       |
| ------------ | ------ | ------------- |
| [YYYY-MM-DD] | [role] | Initial draft |
