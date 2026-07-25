# Independent Review: PRD-018 — Closed-Loop Memory Contract and Enforcement

> **PRD:** PRD-018
> **Verdict:** fail
> **Reviewer:** codex CLI session (independent of the implementing agent)
> **Tool/Model:** OpenAI Codex CLI 0.145.0, reasoning effort high — a different model family from the implementer (Claude Opus 5)
> **Base SHA:** b9163079c412673e6978fbe46dc6d7cac857e380
> **Diff range:** b916307..HEAD
> **Critical:** 17
> **High:** 0
> **Medium:** 10
> **Quorum:** 1/1 pass (single cross-model reviewer)
> **Rounds:** 3 (a fourth is running)

## How this review was run

Three adversarial rounds so far, each one pointed at the PREVIOUS round's repairs rather
than at the original code — because that is where every round after the first found its
defects. Round 1 attacked the implementation, round 2 the fixes, round 3 the fixes to the
fixes. All three returned FAIL.

Round 1 was directed at the merge diff, directed at the three attacks the PRD names
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
| 1   | CRITICAL | `artifacts.ts:373` — `outputWeakenings()` returns `[]` whenever the baseline parses to zero entries, so a **malformed or section-less baseline reads as "nothing was promised"**. Addendum §7 requires a missing, malformed, or uncommitted baseline to fail closed; only the uncommitted case was handled. Reproduced with `README.md` as the base-ref blob: the weakening gate returned `{ok:true}`. | fixed |
| 2   | CRITICAL | `chain.ts:138` — approval is not matched to the removal. `changelogApproves()` accepts **any** owner row whose Changes cell merely contains the path as a substring, and `validAcceptance()` accepts **any** acceptance entry for the PRD regardless of what it covers. An unrelated audit row plus an unrelated acceptance reproduced `{ok:true,waived:true}` after an output was removed. | fixed |
| 3   | CRITICAL | `artifacts.ts:291` — a **deleted** declared output counts as a capture. `touched()` tests membership in `collectDiffFiles()`, which is `git diff --name-only` and therefore includes deletions. Deleting a promised record and its INDEX pointer leaves the path in the diff, `verify:brain` validates the smaller store, and both memory gates stay green. | fixed |
| 4   | CRITICAL | `artifacts.ts:317` — Phase 7 never resolves declared inputs. `memoryCloseIssues()` reads the input slugs but never checks that they exist, are active, or are indexed, so replacing a real input with `no-such-record` passes the close gate. Worse, `activeRecords()` silently drops unreadable records, so deleting a watched record erases its watch instead of blocking. | fixed |
| 5   | CRITICAL | `prd-ready.ts:52` — the repaired `frTargets()` feeds the pre-existing hard-cap engine, which sits **outside** the `memory.enabled` branch. With memory disabled, a target on a continuation line now fires a hard cap that `main` did not fire, breaking FR-2's "disabled repositories retain current behavior" and the matching acceptance criterion. Found independently by the implementer and by the reviewer. | fixed |
| 6   | CRITICAL | `prompts/phase-5-testing.md:35` — the shipped Phase 5 prompt carries a memory obligation, but addendum §8 states for phase 5: "No memory obligation. Verification is verification," and its preamble forbids any prompt obligation the section does not name. **The PRD's FR-3 table contradicts the addendum here**, and the addendum is law. Needs an owner decision, not a code fix. | fixed — owner decided: obligation removed |
| 7   | CRITICAL | `practices/templates/AGENT_BOOTSTRAP.template.md:123` — the shipped adopter contract says weakening "needs owner acceptance" and omits that an `eligible` work item is refused **outright**. An adopter following the template can obtain an acceptance and still be rejected by `memoryWeakeningGate()`. The root `AGENT_BOOTSTRAP.md` states the split correctly; the packed twin does not. | fixed |
| 8   | MEDIUM   | `artifacts.ts:86` — three path predicates disagree about a directory. `pathProblem()` accepts `_brain/learnings` as an exact path, `declaredArtifacts()` returns it, and `durableArtifactsOk()` lets any child satisfy it — but the memory close gate requires an exact changed path. Readiness passes what Phase 7 will reject. | fixed |
| 9   | MEDIUM   | `test/content-prompts.test.ts:239` — the provenance test asserts that some addendum phrases exist, not that each shipped prompt addition traces to its approved obligation. It passes while carrying finding 6, and it even quotes "No memory obligation" from the addendum while the phase-5 prompt violates it. This is the test that should have caught finding 6. | fixed |
| 10  | MEDIUM   | `test/merge.test.ts:392` — the mutex fixture proves the merge **acquires** the claim mutex, not that it **holds** it across the merge. An acquire-check-release-then-merge implementation would pass this test unchanged, which is exactly the check-then-merge race W9 exists to prevent. | fixed |

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

---

## Round 2 — the fix layer

Round 1's ten findings were all remediated, and round 2 confirmed every one of them
closed. It then returned **FAIL** on the remediations themselves: 5 CRITICAL, 4 MEDIUM.
That is the round's lesson, and it is why round 3 exists: fixes are where the next
defects live, so each round is pointed at the previous round's repairs rather than at the
original code.

| #   | Sev      | Finding | Resolution |
| --- | -------- | ------- | ---------- |
| 11  | CRITICAL | `chain.ts` — `capturedDiffFiles` preferred `origin/<base>` while the merge targets the LOCAL base. Measured on this repository: `origin/main` is one commit behind `main`, so a record added on unpushed local base counted as this PRD's capture. **Fails open.** | fixed — pinned to the local base, `-z` parsing, git failure now refuses |
| 12  | CRITICAL | `artifacts.ts` — a fenced `## Memory Outputs` example shadowed the real section, because section lookup takes the first heading. A PRD could carry a valid quoted example above a malformed real one. | fixed — contract reads run fence-stripped; a twice-declared section is an ambiguity |
| 13  | CRITICAL | `artifacts.ts` — the same shadowing let a fenced `## Changelog` approve a removal the PRD never recorded. | fixed |
| 14  | CRITICAL | `artifacts.ts` — any repo-relative `.md` path counted as a record, so `learning: docs/release-note.md` passed and adding that ordinary file satisfied capture while the store and INDEX never changed. | fixed — type bound to `<memory.root>/learnings/` or `/adr/` |
| 15  | CRITICAL | `chain.ts` — `existsSync` accepted a directory, an added submodule, or a symlink as the captured file. | fixed — `lstatSync(...).isFile()` |
| 16  | MEDIUM   | the provenance deny-list named four exact tokens, so an obligation phrased around `_brain` or "detail file" escaped it. | fixed — widened, plus per-phase own-clause assertions |
| 17  | MEDIUM   | an unreadable indexed record failed only at close, so readiness passed a PRD that could never close. | fixed — shared store issue |
| 18  | MEDIUM   | **the deferral this PRD claimed to have recorded did not exist.** The code comment and the task ledger both said the hard-cap parser migration was "recorded as a deferral" while `STATUS.md` carried no such row. | fixed — the row exists, with an owner and a due date |
| 19  | MEDIUM   | **the capture assertions were vacuous.** Replacing `capturedDiffFiles` with `return null` would have left them green: the tests inject `changedFiles` and `existsSync` did the rejecting. | fixed — a fixture now names an existing file the branch never touched |

Findings 18 and 19 are about honesty rather than behavior, and both were right. A false
claim of governance is worse than the split it excused, and an assertion that cannot fail
is worse than an absent one, because it reports coverage.

## Round 3 — the fixes to the fixes

**FAIL**: 5 CRITICAL, 3 MEDIUM. One CRITICAL was already closed by a commit the
reviewer's tree predated (the `./_brain` root normalization, found by the implementer
attacking its own round-2 fix) and is recorded here as stale rather than counted twice.

| #   | Sev      | Finding | Resolution |
| --- | -------- | ------- | ---------- |
| 20  | CRITICAL | `artifacts.ts` — `\s` matches a NEWLINE, so `##` on one line with the heading text on the next satisfied `^##\s+<name>$`. A forged non-heading was read as the real section, and the same construction forges a Changelog. | fixed — `[ \t]` |
| 21  | CRITICAL | `artifacts.ts` — `withoutFences` was a toggle, not a fence parser: a `~~~` block was "closed" by a ``` line inside it, exposing everything after, so text the author fenced OFF became a live contract section. | fixed — opener character, length, and indent tracked; an unclosed fence consumes the rest and reads as absent |
| 22  | CRITICAL | `chain.ts` — a file in the store was still not a record. An unindexed `<root>/learnings/new.md` holding arbitrary text passed placement and `lstat`, and `loadMemoryStore` never sees unindexed files. Whether a Phase 7 validator is wired is adopter configuration, which a gate may not lean on. | fixed — every declared output must be indexed, parse, and match its declared type |
| 23  | CRITICAL | `artifacts.ts` — prose tokenization of acceptance items failed open a second way: a comma is legal in a filename, so `x.md,backup.md` split into a token equal to the promised path. | fixed — exact item or exact backticked span; nothing inferred from punctuation |
| 24  | CRITICAL | `artifacts.ts` — the configured root was compared as a raw string, so `./_brain` broke every placement check. | already fixed before the round returned |
| 25  | MEDIUM   | malformed `--name-status -z` output was not rejected; `/^[AM]/` accepts `MALFORMED`. | accepted as advisory — the stream comes from git, and a desynchronized parse fails closed |
| 26  | MEDIUM   | the provenance oracle rejects unrelated prose and still misses paraphrase. | fixed in part — a mutation fixture now proves both directions; exact-clause binding remains the stronger form |
| 27  | MEDIUM   | **four round-2 regressions would stay green with their fix reverted:** `[R2-P1-1]` forked the branch before the local-only commit, so both implementations rejected; `[R2-P1-3]` put the forged Changelog after the real one, which the old first-heading parser never read; no fixture covered a twice-declared section; no fixture covered a symlink or a gitlink. | fixed — all four fixtures now discriminate |

Writing those fixtures found one more defect in this PR's own code, reported here rather
than left in a commit message: an INDEX pointer resolving to a **directory** threw
`EISDIR` out of `loadMemoryStore`, crashing a gate whose contract is to report.

## Post-fix verification

`pnpm check-types`, `pnpm lint`, `pnpm test` (670), `pnpm build`, `pnpm verify:workflow`
(all nine checks), `pnpm check-egress`, `gate check PRD-018`, and `gate check --wiring`
all green after round 3's remediation.

The ledger row for `independent-review` stays `failed` until a round returns `pass` with
`Critical: 0`.
