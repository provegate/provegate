# Independent Review: PRD-018 — Closed-Loop Memory Contract and Enforcement

> **PRD:** PRD-018
> **Verdict:** fail
> **Reviewer:** codex CLI session (independent of the implementing agent)
> **Tool/Model:** OpenAI Codex CLI 0.145.0, reasoning effort high — a different model family from the implementer (Claude Opus 5)
> **Base SHA:** b9163079c412673e6978fbe46dc6d7cac857e380
> **Diff range:** b916307..a511d7b (4 commits, 50 files)
> **Critical:** 7
> **High:** 0
> **Medium:** 3
> **Quorum:** 1/1 pass (single cross-model reviewer, round 1)
> **Rounds:** 1

## How this review was run

One adversarial round against the merge diff, directed at the three attacks the PRD names
in task 10.1: can a declared output be removed while the gate stays green; does a watch
overlap actually block; and did anything become reachable while memory is disabled. The
reviewer was given the PRD, the owner-approved addendum, the readiness watch items, and
the task ledger, and was told the two defects the implementer claims to have found were
hypotheses rather than facts.

The reviewer ran 5.7M tokens across ~20 repository commands and reproduced its findings
with executable counterexamples rather than reading alone. Its own note on limits, kept
here rather than dropped: a focused `vitest` run could not start in its read-only sandbox
(`EPERM` creating the transform directory), so it treated the ledger's green counts as
claims and worked from source-level counterexamples. The floor commands it did run
returned zero, several as Turbo cache replays.

**Every finding below was re-verified against source by the implementer before being
recorded here. All ten held.** One of them — the `frTargets` hard-cap leak — was found
independently by the implementer before the review returned, and is recorded as such.

## Findings

| #   | Sev      | Finding | Resolution |
| --- | -------- | ------- | ---------- |
| 1   | CRITICAL | `artifacts.ts:373` — `outputWeakenings()` returns `[]` whenever the baseline parses to zero entries, so a **malformed or section-less baseline reads as "nothing was promised"**. Addendum §7 requires a missing, malformed, or uncommitted baseline to fail closed; only the uncommitted case was handled. Reproduced with `README.md` as the base-ref blob: the weakening gate returned `{ok:true}`. | open |
| 2   | CRITICAL | `chain.ts:138` — approval is not matched to the removal. `changelogApproves()` accepts **any** owner row whose Changes cell merely contains the path as a substring, and `validAcceptance()` accepts **any** acceptance entry for the PRD regardless of what it covers. An unrelated audit row plus an unrelated acceptance reproduced `{ok:true,waived:true}` after an output was removed. | open |
| 3   | CRITICAL | `artifacts.ts:291` — a **deleted** declared output counts as a capture. `touched()` tests membership in `collectDiffFiles()`, which is `git diff --name-only` and therefore includes deletions. Deleting a promised record and its INDEX pointer leaves the path in the diff, `verify:brain` validates the smaller store, and both memory gates stay green. | open |
| 4   | CRITICAL | `artifacts.ts:317` — Phase 7 never resolves declared inputs. `memoryCloseIssues()` reads the input slugs but never checks that they exist, are active, or are indexed, so replacing a real input with `no-such-record` passes the close gate. Worse, `activeRecords()` silently drops unreadable records, so deleting a watched record erases its watch instead of blocking. | open |
| 5   | CRITICAL | `prd-ready.ts:52` — the repaired `frTargets()` feeds the pre-existing hard-cap engine, which sits **outside** the `memory.enabled` branch. With memory disabled, a target on a continuation line now fires a hard cap that `main` did not fire, breaking FR-2's "disabled repositories retain current behavior" and the matching acceptance criterion. Found independently by the implementer and by the reviewer. | open |
| 6   | CRITICAL | `prompts/phase-5-testing.md:35` — the shipped Phase 5 prompt carries a memory obligation, but addendum §8 states for phase 5: "No memory obligation. Verification is verification," and its preamble forbids any prompt obligation the section does not name. **The PRD's FR-3 table contradicts the addendum here**, and the addendum is law. Needs an owner decision, not a code fix. | open — owner |
| 7   | CRITICAL | `practices/templates/AGENT_BOOTSTRAP.template.md:123` — the shipped adopter contract says weakening "needs owner acceptance" and omits that an `eligible` work item is refused **outright**. An adopter following the template can obtain an acceptance and still be rejected by `memoryWeakeningGate()`. The root `AGENT_BOOTSTRAP.md` states the split correctly; the packed twin does not. | open |
| 8   | MEDIUM   | `artifacts.ts:86` — three path predicates disagree about a directory. `pathProblem()` accepts `_brain/learnings` as an exact path, `declaredArtifacts()` returns it, and `durableArtifactsOk()` lets any child satisfy it — but the memory close gate requires an exact changed path. Readiness passes what Phase 7 will reject. | open |
| 9   | MEDIUM   | `test/content-prompts.test.ts:239` — the provenance test asserts that some addendum phrases exist, not that each shipped prompt addition traces to its approved obligation. It passes while carrying finding 6, and it even quotes "No memory obligation" from the addendum while the phase-5 prompt violates it. This is the test that should have caught finding 6. | open |
| 10  | MEDIUM   | `test/merge.test.ts:392` — the mutex fixture proves the merge **acquires** the claim mutex, not that it **holds** it across the merge. An acquire-check-release-then-merge implementation would pass this test unchanged, which is exactly the check-then-merge race W9 exists to prevent. | open |

## Confirmed correct (do not re-litigate)

The reviewer was told to distrust these and confirmed them against source:

- A valid baseline detects removal, path rename, type change, and replacement with `none`;
  a missing working heading also fails.
- `eligible`, `null`, and every other non-`operator-gated` close state take the fail-closed
  branch.
- Valid indexed watches normalize `::Symbol`, use the repository glob engine, include
  active ADRs, and exclude superseded records.
- The generated practices manifest omits `phases.4`, and the real loader preserves the
  four-command floor. This repo's root Phase 4 resolves to the six required commands in
  order, and Phase 7 to `verify:brain`.
- The implementation genuinely holds the claim mutex across the merge and its post-merge
  verification; a stale marker fails closed.
- A plain non-practices `gate init` keeps its previous scaffold bytes, and existing files
  are never overwritten.
- No runtime dependency, network call, remote-push path, `any`, lint bypass, or suppression
  directive was added.
- **Both defects the implementer claimed to have discovered are real:** the old `Targets`
  parser under-counted wrapped entries, and the ADR section regex's `$` under `/m` treats
  the blank line after a heading as the end of the section.

## Post-fix verification

Pending. The ledger row for `independent-review` stays `failed` until every CRITICAL is
closed and a fresh independent round returns `pass` with `Critical: 0`.
