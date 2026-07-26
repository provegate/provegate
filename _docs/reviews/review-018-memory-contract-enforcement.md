# Independent Review: PRD-018 — Closed-Loop Memory Contract and Enforcement

> **PRD:** PRD-018
> **Verdict:** fail
> **Reviewer:** codex CLI session (independent of the implementing agent)
> **Tool/Model:** OpenAI Codex CLI 0.145.0, reasoning effort high — a different model family from the implementer (Claude Opus 5)
> **Base SHA:** b9163079c412673e6978fbe46dc6d7cac857e380
> **Diff range:** b916307..HEAD
> **Critical:** 80
> **High:** 2
> **Medium:** 55
> **Low:** 3
> **Quorum:** 1/1 pass (single cross-model reviewer)
> **Rounds:** 20

## How this review was run

Sixteen adversarial rounds, each pointed at the PREVIOUS round's repairs rather than at
the original code — because that is where every round after the first found its defects.
Round 1 attacked the implementation; rounds 2-16 each attacked the preceding round's
fixes. All sixteen returned findings, and every finding was remediated.

Every finding was re-verified against source by the implementer before being recorded,
and several were confirmed by direct measurement on this repository rather than by
reading. The reviewer also checked the implementer's own measurements and **refuted one**
— a claim of "four artifacts carry an unmatched backtick run" was six, because the
implementer's scan covered six directories and omitted `_docs/`. The corrected figure is
in the source comment that rests on it.

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

---

## Rounds 4-10 — the fix layer, seven times

Each round attacked the previous round's repairs. The counts: round 4 (4 CRITICAL,
4 MEDIUM), round 5 (4/3), round 6 (4/3), round 7 (4/3), round 8 (3/3), round 9 (2/4),
round 10 (3/2). Every finding was remediated; each remediation carries a regression that
fails when the fix is reverted, and four rounds specifically named earlier regressions
that did NOT — those were rewritten rather than defended.

The through-line, stated plainly because it is the most useful thing this review produced:
**the contract's Markdown scanner is a hand-rolled approximation, the package takes zero
runtime dependencies so there is no parser to defer to, and every round found another rule
it approximated.** Each individual fix was correct and insufficient. Two strategy changes
came out of that, and both are worth more than the individual repairs:

1. **Drift refuses.** An unclosed fence or HTML comment makes a document unreadable, and
   every contract read says so instead of guessing. Measured across 85 artifacts: none is
   refused.
2. **A contract section is a plain bullet list.** A fence at any indentation inside one is
   a construct the scanner cannot classify against CommonMark — a fence nested in a list
   item is code to a renderer and was bullets to the parser — so the section refuses.
   Measured across 52 real contract sections: none contains a fence.

Recurring classes, each closed and each worth naming:

- **Fail-open beats fail-closed as a bug.** Six findings were the permissive direction of
  a parser disagreement: a deleted output counting as a capture, a stale `origin/base`
  lending its commits, an unmatched backtick swallowing a fence, a masked comment forging
  a setext heading, an unreadable INDEX erasing every watched record, an ambiguity encoded
  as a path a repository could create.
- **Two implementations of one rule.** The `frTargets` split, the Durable Artifacts split,
  and the package-versus-standalone INDEX divergence are all the shape
  `_brain/learnings/two-parsers-wrong-together.md` describes. Two are deliberate and
  recorded as deferrals with owners and dates; the third is the open item below.
- **Assertions that cannot fail.** Seven regressions across rounds 2-10 would have stayed
  green with their fix reverted — a mutation fixture holding its own copy of the value
  under test, three times over. They are rewritten to share one helper or to drive the
  real gate.

## Open at round 10

- **Package and standalone INDEX parsers disagree, fail-open.** The package ignores a
  pointer inside a fenced example; `verify-brain.mjs` and its packed twin still count it.
  An active watched record can therefore vanish from readiness and close while
  `verify:brain` passes. Both copies and their shared corpus are outside PRD-018's
  Conflict Surface, so it is on the deferral board rather than half-fixed here.
- A legitimate code span wrapping across lines is read literally, and a `<!--` inside one
  refuses the document. Fail-closed, named, deferred.

---

## Rounds 11-16 — and where this stopped

Counts by round: 11 (5 CRITICAL, 1 MEDIUM), 12 (5, 1), 13 (5, 4), 14 (4, 3), 15 (1, 3),
16 (2, 2). Round 11 is the one worth naming: **all five of its criticals were fail-open** —
a crafted document made a gate ACCEPT a declaration a renderer never displayed. From
round 14 the reviewer was asked to report three numbers each round — findings, how many
RECORD something the renderer does not show, how many only REFUSE something it does — so
the trend could be seen rather than argued about. It went 7/4/3, then 4/1/3, then 4/2/2.

Round 13 did not complete: the reviewer's provider flagged the request as a possible
cybersecurity risk and killed the turn. That is an infrastructure refusal, not a verdict,
and it is recorded as one. Rephrasing the same review in first-party correctness terms —
"where does the reader disagree with a renderer" rather than "craft a document that
bypasses the gate" — ran to completion. Before it was cut off the round named two
candidate defects; both were reproduced independently and both were real.

### The decision this review produced

By round thirteen the pattern was unarguable: a hand-rolled Markdown reader was being
asked to match an entire specification, the package may take no runtime dependency to
defer to, and four of that round's nine findings were the reader REFUSING valid Markdown —
the hardening had begun costing what it bought. The owner's call was to stop matching
CommonMark and NARROW what a contract section may contain, so the reader has less to
understand:

- a declaration is a column-zero bullet, and nothing else is one;
- a line of dashes or equals directly under text is refused rather than interpreted,
  which retires setext handling altogether;
- fences, raw HTML blocks, and indented code refuse the section outright.

Every rule was measured against the corpus before it shipped — 23 PRDs, 52 sections, 312
bullets, 85 artifacts — so none of them cost anything already written. Rounds 14-16 then
found their remaining defects almost entirely in one place, the HTML block classifier,
which is what narrowing was for: it concentrates the risk somewhere a reviewer can point
at. That classifier now implements the specification's seven block types rather than an
approximation of them.

### Round 17 — the confirming round, which did not confirm

Round 17 was commissioned to answer two questions: are round 16's remediations correct,
and does anything still record what a renderer does not display. It reconstructed every
round-16 counterexample and found them all fixed. It then found **three more** in the same
category, and all three were generalizations that had not been carried far enough:

- `paragraphActive` was inferred from the raw line, so a completed `<!-- note -->` kept it
  set and the next line's type-7 tag could not open a block — leaving the bullet that block
  was hiding to be read.
- A named whitespace entity such as `&Tab;` decoded to a visible character, because only
  four lowercase names were recognized out of the hundreds HTML defines.
- Whether a tag displays its contents is a DOM question — `<span hidden>x</span>` shows
  nothing — and the reader was answering it by counting what it stripped.

All three are fixed, and the last one by applying the narrowing decision one level deeper:
raw inline HTML in a rationale is refused by name rather than having its rendered
visibility inferred. Two containers the round named, block quotes and ordered lists, are
refused inside a contract section for the same reason.

Round 17 also confirmed the three statements the close rests on: the shipped template and
PRD-017/018/019 satisfy the narrowed grammar; none of the 108 artifacts under `_prds/`,
`_tasks/`, `_readiness/`, `_docs/` is refused as unreadable; and a memory-DISABLED
repository retains its legacy behavior in `lintPrd`, the gate chain, and
`declaredArtifacts`.

### Round 18 — five more, and the first LOW findings that mattered

Round 18 confirmed round 17's three fixes and found five CRITICAL. Four were one
shape: the reader and a renderer disagreeing about where a block begins or ends.

- The code-span lookahead stopped at blank lines, headings and list markers but **not at
  a fence or an HTML block**. A lone backtick in prose therefore found its "closer" on
  the fence line, the scanner masked the fence OPENER as span content, and a whole
  contract could be forged inside rendered code. The stop now uses the scanner's own
  fence predicate — including the rule that a backtick fence's info string may hold no
  backtick, without which the fix would have refused a span the renderer closes.
- A closing fence was accepted with any trailing Unicode blank, because `.trim()` removes
  NBSP. CommonMark allows spaces and tabs.
- The scanner split on LF while every `/m` regex also broke on a bare CR — **two line
  models over one document**, which is the defect `two-parsers-wrong-together` describes.
  Content is normalized once now, at the single entry point.
- U+2028 and U+2029 are line terminators to JavaScript and ordinary characters to
  CommonMark, so `/m` anchored headings a renderer never shows. Refused by name, and
  masked in the view as well, because the INDEX and the Changelog read that view through
  their own regexes — safe by construction rather than by call order.
- Raw inline HTML was refused only inside a **rationale**. A renderer's HTML parser closes
  the paragraph at a mid-sentence `<div hidden>` and swallows the list after it, so the
  refusal moved up to the section.

The fifth was the rationale counting zero-width characters as visible: `- none — &#8203;`
satisfied the very check that exists to reject an unreasoned `none`.

The three LOW findings are the ones worth recording, because they run the other way.
Round 17's named-entity allowlist refused `&AElig;`, which renders `Æ`. A tag holding a
vertical tab is literal text, not HTML. A leading tab opens an indented code block just as
four spaces do, and a setext contract heading is a heading rather than a missing section.
**A refusal that invents what it saw is the same defect as reading a declaration that is
not there, pointed the other way** — and the narrowing strategy only holds if refusals are
as honest as reads. The unknown-entity case has no third answer without the entity table
this package may not depend on, so it is refused by name and the author writes the
character.

Measured before narrowing, across 239 Markdown files: no separator, no tab-indented
section line, no setext contract heading, no named entity, and no inline HTML in a real
contract section. Every PRD in the repository still parses with no issue. 767 tests.

### Round 19 — the cause behind two rounds of findings

Round 19 was aimed at the scanner, because that is where round 18's findings had moved. It
returned five CRITICAL and seven MEDIUM, and the largest group had a single cause worth
stating plainly:

**The scanner derived block state from the document, and the container check derived it
again from the raw text.** Two passes, one input, no shared answer. A `## Other` written
inside an HTML comment ended the *raw* section early, so the section-level inline-HTML
defense round 18 had just added never saw the rest of the section and was bypassed
entirely. In the other direction, a `>` written inside a comment was refused as a block
quote the page does not contain. This is `two-parsers-wrong-together` with both parsers in
one file — the repository already held the record, and the code still had the defect.

The remedy is structural rather than another rule. `scanDocument` classifies every line
once — `text`, `fence`, `in-fence`, `html`, `in-html`, `indented-code` — and the section
slicer, the container check and the setext diagnostic all read that classification instead
of re-deriving it. The slicer walks lines rather than running `/m` over the document, which
retires the U+2028 forgery structurally and let round 18's document-wide refusal go: that
refusal had been rejecting a separator sitting harmlessly inside a fenced example.

The scanner also gained the block model it never had:

- **indented code**, whose absence ran both ways. `paragraphActive` stayed set across one,
  so a type-7 tag below it could not open the raw HTML block a renderer opens; and a `<!--`
  written inside one was read as a real comment opener, masking a heading and declaration
  the page displays.
- **inline comments must be complete.** `Prose <!-- open` followed by a heading renders the
  opener literally and shows the heading, because an ATX heading interrupts a paragraph.
  Comment state used to run straight across it and lose the declaration.
- `<!-->` and `<!--->` are complete comments. Searching only for `-->` ran to end of file
  and reported an unclosed comment the document had closed.
- the code-span lookahead stops at a comment, which is HTML block type 2 — the round 18
  exploit with `<!--` substituted for `<div>`.

Backslash escapes are honored, so `\<span>` is literal text rather than raw inline HTML.

**The entity rule settles.** It moved in three consecutive rounds: counting an unknown name
invisible let `&Tab;` stand in for a rationale and refused `&AElig;`, which renders; then
refusing unknown names by name invented a character reference out of `&bogus;`, which a
renderer displays literally. The answer is to enumerate the small set of names that render
as blank or zero-width and treat everything else as ink — visible is visible whether the
glyph is `Æ` or the literal text `&bogus;`. No entity table, honest in both directions.

### Round 20 — unaimed, and the refactor held

Round 19 ended with a claim worth testing: that the scanner refactor changed the shape of
the code rather than adding a rule to it. Round 20 was written to measure exactly that. It
was pointed at the whole feature — close gate, weakening, store, readiness lint, chain and
barrier — and told explicitly *not* to assume the scanner is where the bugs are.

It returned: **"Area 6: no defect found in the contract scanner this round."** Two rounds
had found twelve and five defects there; an unaimed round found none. That is the first
positive evidence in this review that a fix converged.

Every finding landed in the machinery around it instead, which no round had aimed at. Six
CRITICAL and two HIGH, all fail-open:

- **`gate land` skipped every memory gate.** `--from-phase=merge` skips all phase gates;
  the operator gate had been made exempt for exactly this reason and the memory gates had
  not. An operator-gated PRD could remove every baseline output, declare `none`, capture
  nothing, and land. They are non-skippable now, for a stronger reason than the operator
  gate: they are what binds the merge to the capture.
- **A branch could erase its own trigger.** Watch obligations came only from the branch's
  store, so changing a watched file and then deleting the watching record *together with*
  its INDEX pointer left a smaller store that is perfectly self-consistent — every
  downstream check agrees, because they are all asked about the store the branch just
  wrote. The base-ref store is read too now, the one version the branch does not control.
- **Approval evidence could be read and then discarded.** The weakening gate read the
  working PRD, and `ensureCheckoutClean` resets tracked `_prds/` on its way to the merge:
  a committed weakening could be waived by a Changelog approval that was never committed.
  The gate judges the committed copy, because that is what lands.
- **`collectDiffFiles` preferred `origin/<base>`** while landing merges into the LOCAL
  base — so a local base behind its remote omitted the very commits the merge introduces.
- **Readiness read FR targets from raw Markdown**, so a fenced
  `## 4. Functional Requirements` was selected over the real section and its watched
  targets were never seen. It reads the executable view now — the same scan the contract
  grammar uses, so the two cannot disagree about which headings are on the page.
- **A schema-invalid acceptance authorized a weakening.** `validAcceptance` checked owner,
  items and reason; a store with no `schemaVersion` and an entry missing `date` and
  `method` waived a removal. The documented schema is enforced where the waiver rests on
  it, rather than depending on the adopter having wired `verify:acceptances`.
- The land **barrier fired for every memory-enabled merge**, telling each one "this merge
  changes gate policy" — false for an ordinary PRD. It is scoped to the activation
  transition the PRD describes.
- **`gate init` wrote the activation switch first**, so an interrupted install left a
  repository demanding a contract it had nothing to satisfy.

Two of these holes were **encoded in the fixtures**: acceptance stores written without
`schemaVersion`, and a PRD handed to the close gate that no branch had committed. A test
that models an impossible state proves nothing about the possible ones, and both now model
what production requires.

Each of the six new regressions was mutation-checked — reverting its fix fails that test
and only that test.

### Open

**No round has run against the current code.** The verdict stays `fail`; this artifact
records twenty rounds in which every finding was closed, not a round that found nothing.

What changed this round is the evidence available to the decision. Rounds 14-20 ran 7, 4,
4, 3, 5, 12, 8 — but the count was never the useful number. The useful one is that the area
two consecutive rounds had been hammering came back clean under an unaimed reviewer, while
the areas no round had aimed at produced eight findings on first contact. That is the
expected shape: review finds defects where review has been, and this feature has now had
one round of attention on each of its parts.

Closing the PRD needs an owner decision. The honest options are to run another unaimed
round — the machinery has had exactly one, as the scanner had before rounds 18 and 19
found seventeen defects in it — or to accept the residual. An agent may not flip the
ledger row, and this one has not.
