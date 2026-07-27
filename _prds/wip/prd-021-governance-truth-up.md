# PRD-021: Governance Truth-Up — Stale Wave-2 Claims and the Value-Score Recompute Gate

> **Status**: Approved
>
> **Created**: 2026-07-25
> **Updated**: 2026-07-25
> **Author**: Cursor, for owner review
> **Audience**: Implementing Agent
> **Slug**: `governance-truth-up`
> **Cycle Phase**: 3 (Task plan)
>
> <!-- Returned from Phase 3 by the owner scope change of 2026-07-25: the iteration-5
> PASS (8.43) and the generated 82-task plan both scored the pre-relocation FR set and
> are stale until an independent re-score clears the revised one. Readiness iteration 7
> then scored the relocated set at 7.30 ITERATE; this revision answers W13–W21. The next
> round must be scored by a session that did not write this revision. -->
>
> **PRD Class**: infra
> **Class Rationale**: This corrects governance documents, adds one method gate to the
> CLI plus one repo verify gate, and one additive config key; no application runtime
> behavior changes.
> **Autonomous Close**: operator-gated
> **Value**: 4.10 (MF/UI/TL/AR/RM: 5/4/4/4/3)

<!-- 0.25*5 + 0.25*4 + 0.20*4 + 0.15*4 + 0.15*3 = 4.10. Re-scored by readiness
     iteration 7, which is the independent round this comment previously reserved the
     re-score for: the relocation ships the gate to every adopter with configurable
     weights (UI 3 → 4), and FR-13 repairs a measured parser defect that would otherwise
     void root-file Conflict Surface claims for PRD-018, PRD-021, and PRD-023 (TL 3 → 4).
     MF, AR, and RM unchanged. At 4.10 this crosses the 4.00 top-tier triage threshold. -->

---

## 1. Introduction / Overview

The governance documents promise three mechanical checks "in wave 2". Two of them
shipped and the docs never caught up; one never shipped and the docs imply it exists as
future-certain work:

- `AGENT_BOOTSTRAP.md:128` says the `verify:durable-artifacts` check "lands in wave 2" —
  `scripts/verify/verify-durable-artifacts.mjs` is wired in `package.json` today.
- `STATUS.md:25` says the deferral cap is "gate-enforced in wave 2" —
  `scripts/verify/verify-deferred.mjs` enforces cap 15 / warn 12 today.
- `_brain/PROTOCOL.md:182,204` still calls `verify:brain` optional wave-2 tooling and a
  stub — it is a wired gate.
- `AGENT_BOOTSTRAP.md:144` says the value-score recompute "lands in wave 2" — nothing
  under `scripts/verify/` recomputes a declared `Value:` header. This is the one real
  hole, and `_brain/learnings/score-must-equal-weighted-sum.md` already records the
  failure mode: without a machine check, authors round up to clear the threshold.

Separately, the research pack (`docs/research/provegate-bootstrap/`) reads as the live
plan while `apps/docs` carries the v1.0 canon — the roadmap's phase checkboxes look
unstarted although PRD-001–016 are Ship Verified. Two canons, no marked winner.

This PRD makes the documents describe the system that exists, ships the missing
recompute gate, and adds a narrow drift check so the "lands in wave 2" class of lie
cannot silently return.

**Where each gate ships is a decision, not a detail.** The value-score recompute is a
rule about the *method's* artifacts — every ProveGate adopter who scores a PRD needs it,
and the weights it enforces are already becoming part of the CLI config surface (FR-1).
It therefore ships **inside the package**, on `gate check`. The doc-claims check is a
rule about *this repository's* governance files, so it stays a `scripts/verify/` script.
An earlier draft put both in `scripts/`, which would have shipped adopters the
`valueScoring` config key with nothing that enforces it, and left this repo with a second
copy of the weight table to keep in sync — a duplication the draft acknowledged and then
spent FR-3 and FR-6 managing. Removing it is cheaper than pinning it.

**Corpus reality that shapes the design.** The rule postdates PRD-016, so most of the
corpus carries no `Value:` header. Exact counts are deliberately **not** stated here —
two earlier drafts stated them and both went stale within a day as the wave grew (that
being the class of defect this PRD exists to remove). FR-3's sweep reports the live
numbers; the design fact that matters is only this: **a gate that required the header
would red-fail every pre-rule artifact on its first run.**

**How the source snapshot solves that, and why this PRD must not solve it differently.**
`docs/research/provegate-bootstrap/source-snapshot/scripts/verify-prd-ready.mjs:280-306`
already implements this exact rule, and its comment states the design: *"Presence-triggered:
only PRDs carrying a `**V-Skor:**` line are checked, so pre-triage PRDs are never
retro-failed."* `validateVScore` takes no PRD number and has no cutoff guard — it is a
pure presence trigger. The snapshot's id cutoff (`ENFORCE_FROM_PRD = 248`) is a separate,
repo-local constant governing *other* checks, and its own PRD template carries no
`V-Skor` line at all.

That combination is the whole answer. **Presence-triggered is the shipped default**; an
id cutoff is a repository's own opt-in to the stricter rule that the header must also be
*present*. An earlier draft of FR-1 defaulted `enforceFrom: 1` — "enforce everywhere" —
which fused the snapshot's two mechanisms into one and produced an adopter-facing trap:
`templates/prd-template.md` emits no `Value:` line and no prompt asks for one, so an
adopter's first `gate check` would have failed on a header nothing told them to write.
Adding that line to the shipped template is not the fix either — the snapshot's template
omits it, so writing one would be fabricated method content under critical rule 4. The fix
is to ship the snapshot's behavior and keep the cutoff a local choice (FR-1, FR-4).

**A second, larger adopter problem sits behind the first, and it was found only by the
independent readiness round.** Two self-scored rounds asserted that the shipped
`practices/templates/AGENT_BOOTSTRAP.template.md` "has no triage section at all". It has
one, at line 108 — the earlier greps looked for the literal weight values and the token
`Value`, and the section uses lowercase prose plus a `{{VALUE_AXES_TABLE}}` placeholder,
so both searches returned nothing and the absence read as proof. Line 111 of that section
tells adopters to **"define your own axes"**.

So the shipped method invites an adopter to choose their own scoring axes, and an
`MF/UI/TL/AR/RM`-only gate could not score them. The owner's decision of 2026-07-25 is to
**make the axes configurable** rather than to rewrite the shipped template to canonical
axes: the latter needs a snapshot addendum and takes a capability away from adopters to
make one gate simpler. FR-1 carries the axis contract, FR-2 generates its header pattern
from it, and FR-10 repairs the placeholder that declares it.

---

## 2. Goals

### Primary Goals

- [ ] Ship the value-score recompute gate promised by the triage rules, with configurable
      weights and a declared enforcement cutoff, and with arithmetic that is exact for
      every weight set the config permits.
- [ ] Correct every stale wave-2 claim in the governance docs, on both the live side and
      the shipped practices copy.
- [ ] Mark the research pack as the frozen bootstrap record and name `apps/docs` as the
      live canon.
- [ ] Make a re-drift of these claims a gate failure, with a grammar precise enough that
      it neither false-positives on genuine future work nor becomes a permanent bypass.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| In-scope PRDs whose declared value is machine-verified | 0 | every PRD carrying a header, plus every id at/after this repo's cutoff | `value-score.test.ts` |
| Legacy PRDs red-failed by the new gate | n/a | 0 | pre-cutoff fixture |
| Adopter PRDs red-failed by the shipped default | n/a | 0 | presence-triggered default fixture (FR-1) |
| Adopters who can score with their own axes | 0 | all | three-axis config fixture (FR-1, FR-2) |
| Unregistered placeholder tokens in shipped templates | 1 (`{{VALUE_AXES_TABLE}}`) | 0 | `content-placeholders.test.ts` walks `practices/templates/` (FR-10) |
| Weight sets that can produce a non-representable total | unbounded | 0 | two-decimal weight validation |
| Copies of the weight table that no check compares | 1 (`AGENT_BOOTSTRAP.md` prose) | 0 | `content-canon.test.ts` pins the prose table to `DEFAULT_CONFIG` (FR-9) |
| Adopters who get the gate their `valueScoring` key configures | 0 | all | the gate ships in the package |
| `gate` invocations on an executing surface of this repo | 0 | 1 (`verify:value-score`) | `verify:gates-wired` |
| Stale "wave 2" claims about wired scripts | 4 | 0 | `pnpm verify:doc-claims` |
| Pack/live pairs left one-sided | n/a | 0 | `pnpm verify:pack-drift` |
| Runtime dependencies added | 0 | 0 | zero-dep policy |

---

## 3. User Stories

#### User Story 1

```
As a reviewer scoring a PRD candidate,
I want the declared Value header recomputed mechanically,
so that a rounded-up score cannot carry a below-threshold candidate into the queue.
```

**Acceptance Criteria:**

- [ ] A PRD declaring `Value: 4.05 (MF/UI/TL/AR/RM: 5/3/5/3/4)` passes; changing one
      dimension without changing the total fails with both numbers reported.
- [ ] **With no cutoff configured (the shipped default), a PRD with no header passes and
      a PRD with a wrong header fails.** Presence is the trigger; absence is not a claim
      to check. This is the snapshot's behavior and it is what an adopter gets.
- [ ] **With a cutoff configured, a PRD at or after it with no header fails** — a missing
      header must not be a pass once a repo has declared the header mandatory (per the
      false-green-on-missing-file learning, which governs a claim that should exist).
- [ ] A PRD **before the cutoff** with no header passes, and one before the cutoff with a
      *wrong* header still fails: the cutoff excuses absence, never a false number.

#### User Story 2

```
As an adopter with a different sense of what matters,
I want to set my own triage weights,
so that the gate enforces my model rather than ProveGate's.
```

**Acceptance Criteria:**

- [ ] `valueScoring.axes` and `valueScoring.weights` in `workflow.config.json` resolve and
      are the single source the gate scores against — an adopter who declares three axes of
      their own gets a gate that scores those three, and the header pattern names them.
- [ ] Weights that are non-finite, negative, more than two decimals, or that do not sum to
      exactly 1 are rejected with a named issue; so is a weight set whose keys do not
      exactly equal the declared axes, in either direction.
- [ ] An axis identifier outside the charset is rejected before any pattern is built.

#### User Story 3

```
As an agent reading AGENT_BOOTSTRAP before starting work,
I want the document to describe gates that actually exist,
so that I don't skip a check believing a human enforces it by inspection.
```

**Acceptance Criteria:**

- [ ] No governance doc describes a wired `verify:*` script as future work.
- [ ] The practices-pack copies move with the live files and the pack-drift ledger is
      reconciled in the same change.

#### User Story 4

```
As a newcomer reading docs/research/provegate-bootstrap,
I want to know it is the frozen bootstrap record, not the live plan,
so that I don't act on a roadmap whose phases already shipped.
```

**Acceptance Criteria:**

- [ ] The pack README carries a banner naming `apps/docs` as the live canon and the
      extraction as complete through PRD-016.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1**: Extend the CLI config surface with an additive `valueScoring` key:
   `{ enforceFrom?: number, axes: string[], weights: Record<string, number> }`.

   **The axes are configurable, and that is an owner decision of 2026-07-25 forced by a
   measurement.** The shipped `practices/templates/AGENT_BOOTSTRAP.template.md` carries a
   triage section (line 108) whose line 111 tells adopters to "define your own axes" —
   so a gate that only knows `MF/UI/TL/AR/RM` cannot score the method it ships with. The
   alternative (rewrite the shipped template to canonical axes) was rejected: it would
   need an owner-approved snapshot addendum and would take a real capability away from
   adopters to make one gate simpler.

   `axes` is an **ordered** list of identifiers; order is the order the header lists its
   dimensions in, so it is contractual, not cosmetic. Package default is
   `["MF","UI","TL","AR","RM"]`. Each identifier must match `/^[A-Za-z][A-Za-z0-9_]{0,15}$/`
   — this is not decoration. FR-2 builds the header pattern **out of** these identifiers,
   so the charset is what keeps a configured axis from altering the pattern's meaning: it
   admits no `/` (the dimension separator), no regex metacharacter, and no whitespace.
   Validate the charset before any pattern is constructed, and construct the pattern from
   validated identifiers only. `axes.length` must be ≥ 2 and ≤ 10; a one-axis score is the
   dimension itself, and the upper bound keeps a generated pattern bounded.

   **Identifiers must be unique, compared case-INSENSITIVELY**, and neither the charset nor
   the count bound implies it. `["A","A"]` has length 2, collapses to one `Record` key, and
   makes the recompute apply one weight twice while the header still parses. `["A","a"]` is
   worse: it validates, and then the generated pattern cannot tell the two apart, because
   the pattern is case-insensitive. It is case-insensitive on purpose — the source
   snapshot's regex carries `/i` (`verify-prd-ready.mjs:292`) and porting it faithfully is
   a method obligation — so the ambiguity is resolved on the identifier side rather than by
   diverging from the snapshot. Reject fixtures: `["MF","MF"]` and `["MF","mf"]`, each
   failing as a duplicate identifier, which is a different message from a charset
   violation and must not be collapsed into one.

   `weights` is keyed by axis identifier. Semantic validation
   (`validateResolvedConfig`) requires that the weight key set **exactly equals** the axis
   set — a missing axis and an extra axis are both errors, and neither may be defaulted,
   because silently supplying a weight for an axis the adopter did not declare is how a
   score stops meaning what the adopter thinks it means. Each weight must be finite,
   `> 0`, expressed in at most two decimal places, and the set must sum to exactly 1
   (compared in integer hundredths, never float equality). `enforceFrom`, **when
   present**, is a non-negative integer. The two-decimal test is
   **lexical, not arithmetic**: `String(weight)` must match
   `/^0(\.\d{1,2})?$|^1(\.0{1,2})?$/`, because
   JS number-to-string emits the shortest round-tripping form (`String(0.29) === "0.29"`)
   while `Number.isInteger(0.29 * 100)` is false and would reject a legal weight. Only
   after the lexical check passes is the value scaled with `Math.round(weight * 100)` into
   the integer hundredths used everywhere downstream. Accept fixtures must include 0.29
   and 0.58; reject fixtures must include 0.155 and 1e-7.

   **`enforceFrom` is optional and its shipped default is absent, not `1`.** Package
   defaults keep today's axes and weights (.25/.25/.20/.15/.15) and **omit `enforceFrom`
   entirely**, which selects the presence-triggered mode FR-2 defines and the source
   snapshot ships (§1). An earlier draft defaulted it to `1` on the argument that "a fresh
   adopter has no legacy corpus, so the safe default is enforce everywhere" — that
   argument is wrong in the one direction that matters. The shipped
   `templates/prd-template.md` emits no `Value:` line and no shipped prompt asks for one,
   so `enforceFrom: 1` would fail an adopter's very first `gate check` for omitting
   something nothing had asked them to write. The type must therefore make absence
   expressible: `enforceFrom?: number`, absent ≠ 0. A configured `0` is legal and means
   the same as `1` (every id is ≥ both), but it is a deliberate opt-in rather than a
   default.

   **`deepMerge` makes the replacement a LOADER rule, not a validation rule — and an
   earlier draft of this FR got that backwards.** Measured at `core/config/load.ts:243`:
   `resolveConfig` runs `deepMerge(DEFAULT_CONFIG, parsed)` and only then
   `validateResolvedConfig(merged)`. `deepMerge` (lines 195-205) recurses into plain
   objects, so `axes` — an array — replaces wholesale, while `weights` — a plain object —
   **merges**. A three-axis override therefore arrives at validation carrying the five
   default weight keys and fails the set-equality rule above. Stating the replacement as
   validation makes **every legal custom-axis config an error**.

   So it is specified where it happens: in `resolveConfig`, **before** the merge, when the
   parsed config supplies `valueScoring.axes`, the whole `valueScoring` object replaces the
   default rather than merging into it. Everything else merges as it always has — this is
   one keyed exception with one reason, not a change to `deepMerge`, which stays exactly as
   it is because every other config key wants recursive merge.

   Three rules follow, and they are different rules. The third is the one an earlier
   revision left implicit, and implicit was wrong in the direction that costs adopters:

   - **Loader, `axes` supplied (`load.ts`):** `valueScoring` is taken from the parsed
     config verbatim, with no default fill-in of any of its keys.
   - **Loader, `axes` absent:** ordinary recursive merge, unchanged. A config supplying
     only `weights` is **retuning the default axes**, which is a legitimate and common
     thing to want — moving MF from .25 to .30 and UI to .20 while leaving TL/AR/RM alone.
     Rejecting it would make every weight change a five-line rewrite for no safety gain,
     because the sum rule already catches an incoherent partial: raising MF without
     lowering something else resolves to 1.05 and fails validation naming the sum.
   - **Validation (`validate.ts`):** the weight key set must exactly equal the *resolved*
     axis set, however it was resolved, and the weights must sum to exactly 1. With `axes`
     supplied this is now *reachable*, because the loader no longer silently fills the
     missing keys; with `axes` absent it compares against the default axes, which is what a
     partial override should be measured against.

   Fixtures pin the partial case in both directions: a weights-only config retuning two of
   five and still summing to 1 **resolves and passes**, and one retuning one of five to sum
   to 1.05 **fails on the sum**, naming the sum rather than the axis set.

   The proof this needs is a **resolution** test, not a validation test: a three-axis
   config file resolved through `loadConfig` must produce exactly three weight keys. A
   validation-only fixture builds the resolved object by hand and would pass while the real
   loader still failed — which is the defect this paragraph exists to fix.

   **Changing `axes` is a corpus migration, and "adopter migration: none" is true only of
   the shipped default.** Presence-triggering protects a *header-less* PRD; it does not
   protect a *scored* one. FR-2 fails a header whose axis list disagrees with the config,
   so editing `axes` in a repo that already has scored PRDs reds every one of them at once.
   The downgrade direction is the same shape: removing an axis invalidates every header
   that still names it. This PRD does not add header schema versioning — that is a real
   feature with its own decisions — it names the migration and ships the preflight it
   already builds. `gate check --value-score` (FR-3) sweeps the corpus and lists exactly
   which PRDs a proposed axis change would fail. The rule, stated in the config
   documentation FR-9 touches: run the sweep, then land the `axes` change and the header
   rewrites **in one commit**. A config change that reds the corpus until a follow-up lands
   is the half-migration this PRD exists to stop shipping.

   Fixtures must include the adopter cases directly: `valueScoring` absent entirely;
   `valueScoring.weights` set but no `enforceFrom`; a **three-axis** config with matching
   weights summing to 1; a config whose weights name an axis absent from `axes`; a config
   whose `axes` names an identifier `weights` omits; and axis identifiers that violate the
   charset (`A/B`, `.*`, `has space`, the empty string). In the first two, a header-less
   PRD passes.
   - **Targets:** `packages/provegate/src/core/config/types.ts`,
     `packages/provegate/src/core/config/defaults.ts::DEFAULT_CONFIG`,
     `packages/provegate/src/core/config/validate.ts::validateConfig`,
     `packages/provegate/src/core/config/validate.ts::validateResolvedConfig`,
     `packages/provegate/src/core/config/load.ts::resolveConfig`
2. **FR-2**: Add the recompute as a **package gate**, `core/gates/value-score.ts`, and
   call it from `lintPrd` so `gate check PRD-NNN` enforces it. Given the PRD body and its
   numeric id, it parses the value header, recomputes the total in **integer hundredths**
   (`Σ weightHundredths × dim` over the configured axes in order, dimensions being
   integers 1–5), and requires exact
   equality with the declared total. Because every configured weight is at most two
   decimals, every legal total is exactly representable — no tolerance band, no float
   compare. This is a deliberate strengthening of the snapshot, which compares with
   `Math.abs(stated - computed) > 0.005`; the tolerance exists there because its weights
   are unvalidated constants, and FR-1's two-decimal rule is what makes exactness sound
   here. Record it as a divergence, not an oversight.

   **The header grammar is part of this FR, because the obvious one matches nothing and
   because it is generated rather than written.** Every PRD that carries the header writes
   it inside the metadata blockquote, with bold delimiters and the colon *outside* them:

   ```
   > **Value**: 4.15 (MF/UI/TL/AR/RM: 4/4/4/5/4)
   ```

   A pattern written against the bare prose form `Value: T (…)` matches zero files. The
   snapshot's regex (`verify-prd-ready.mjs:292`) is the model to port, with two
   adjustments — it expects `**V-Skor:**` with the colon *inside* the bold run, and its
   axis names are hardcoded where FR-1 makes ours configurable.

   **Build the pattern from `config.valueScoring.axes`, never from a literal.** The axis
   segment is the validated identifiers joined by `/`; the dimension segment is
   `axes.length` groups of `[1-5]` joined by `/`. The accepted form is therefore: optional
   leading `>` and whitespace; `Value` with optional surrounding `**`; a colon that may
   sit inside or outside the bold run; the total; any non-`(` filler; then
   `(<axes joined by /> : <n dims joined by />)`. Following the snapshot, do **not** anchor
   on the closing paren — trailing prose after the dims is legal.

   **Dimensions are `[1-5]`, not "a single digit".** An earlier draft said single digit,
   which admits `0` and `6`–`9`, so `9.00 (MF/UI/TL/AR/RM: 9/9/9/9/9)` recomputes
   consistently and passes a rule the rubric forbids. Reject fixtures must include a `0`
   dimension and a `6` dimension, each failing as malformed rather than as an arithmetic
   mismatch — the two failures read differently and an implementer must not collapse them.

   A header whose axis list does not match the configured axes — right count, wrong names,
   or right names in the wrong order — fails as malformed. That is the whole point of
   generating the pattern: an adopter who renames an axis gets told, rather than getting a
   silent non-match that presence-triggering would read as "no header".

   **Search only the metadata block — the text before the first `---` — and take the
   first match.** A draft of this FR instead declared that more than one matching line is
   an error, and measurement killed it: the fenced example three paragraphs above is
   itself a matching line, so this PRD carries two and would have been rejected by its own
   rule. Any PRD that documents the header format has the same problem. The snapshot does
   not have this failure mode because `validateVScore` runs a single `.exec(content)` and
   takes the first hit; scoping to the metadata block is the same answer made structural,
   since that is where the template puts the header and no example ever appears there. A
   PRD body quoting the header in prose, in a fence, or in a §6 row is documentation, not
   a second declaration.

   **Inside that block, at most one.** "First match wins" was the right answer to the
   fenced-example problem and the wrong answer once the search is scoped: a *second* `Value`
   line within the metadata block is a genuine duplicate declaration — two totals, and the
   gate silently scoring the earlier one — not an example, because no example is ever
   written there. So: zero matches in the block is "no header" (presence-triggering
   decides what that means), one is the declaration, two or more is **malformed**. Negative
   fixture: a metadata block carrying two `Value` lines with different totals, failing as a
   duplicate declaration rather than scoring either. This is a divergence from the
   snapshot's single `.exec` and is recorded as one: the snapshot searches the whole
   document, where "first match wins" is the only safe rule.

   **The declared total's own decimal form is specified, not inferred.** Parse it
   lexically into integer hundredths: it must carry one or two decimal places
   (`4.1` → 410, `4.10` → 410), and any other form — three decimals, exponent notation, a
   bare integer — fails as malformed. This is stricter than the snapshot's `Number()`
   parse and is what keeps the comparison exact on both sides.

   Enforcement respects the cutoff **when one is configured**: with `enforceFrom` absent
   the check is presence-triggered, so a PRD with no header passes; with `enforceFrom`
   set, a PRD whose id is `< enforceFrom` may omit the header while one at or after it may
   not. In every mode a header that is present and wrong fails at any id, and a malformed
   header fails at any id.

   `lintPrd` already receives the resolved `WorkflowConfig`, so FR-1's `valueScoring` key
   arrives with **no new plumbing** — that is the whole reason this belongs here rather
   than in a standalone script that would have to re-read and re-validate the same file.

   The id is a **parameter, not a re-parse** — and the position is measured, not assumed.
   `lintPrd` is already four-arity: `lintPrd(config, manifest, content, root?)`
   (`core/gates/prd-ready.ts:108-113`), and `runCheck` passes the root in that slot
   (`cli.ts:655`). An earlier revision of this FR said "gains a fourth argument", which
   would have displaced `root` and silently broken the memory contract's store loading.
   The id is therefore the **fifth** parameter — and it must be **optional**, because a
   required parameter cannot follow the optional `root?: string`:

   ```ts
   lintPrd(config, manifest, content, root?: string, prdNumber?: number | null)
   ```

   Absent and `null` mean the same thing and take the documented null-id path below. That
   equivalence is what keeps this a **one-caller change**. Measured on 2026-07-27: 44 call
   sites — **41** in `test/prd-ready.test.ts` passing three or four arguments, plus
   `test/content-templates.test.ts:99`, `test/example-manifests.test.ts:127`, and
   `cli.ts:655`. Only `cli.ts` passes the number.

   Note what "the null path" means at those call sites: they **omit** the argument, so the
   gate receives `undefined`, not `null`. The contract equates the two, and FR-6's matrix
   must cover **both spellings** under a configured cutoff — an implementation that checks
   `prdNumber === null` and not `undefined` would enforce presence on every existing caller
   the moment this repo sets `enforceFrom`, which is the shipped-template test at
   `content-templates.test.ts:99` turning red on an artifact nobody changed. Making the parameter required would edit all 44 and pull
   two test files this PRD does not otherwise touch into its Conflict Surface, to buy
   nothing — the null path already exists and is load-bearing.

   `runCheck` already resolved the record via `findRecord` and has the number in hand. The
   rollback note in §Migration names the same ordinal; a rollback that restores a
   four-arity call is a different function. Deriving the id from the
   `# PRD-NNN:` heading inside the body would make the cutoff depend on a title string the
   lint does not otherwise trust. Existing callers that have no id **omit the argument
   entirely and therefore supply `undefined`** — they cannot pass `null`, because the
   parameter does not exist until this PRD adds it. Both spellings take the same path:
   **skip the cutoff comparison, enforce the arithmetic unconditionally** — absence of an
   id must not become absence of a check. Write the guard against absence
   (`prdNumber == null`, or an explicit `undefined || null` test), never `=== null`: the
   strict form enforces presence on all 44 existing call sites the moment this repo sets
   `enforceFrom`, and the first casualty is `content-templates.test.ts:99`, which lints the
   shipped header-less template and asserts zero issues.

   **State the exact residual: a `null` id skips the *presence* requirement even where a
   cutoff is configured**, because presence is defined by id and there is no id. The
   arithmetic still runs, so a wrong header never escapes; only "you must have one" does.
   That is the correct trade and it is load-bearing rather than theoretical:
   `packages/provegate/test/content-templates.test.ts:99` lints the **shipped PRD
   template** through `lintPrd` and asserts `issues` is empty, and that template has no
   `Value:` header. It passes today because the caller supplies no id, and it must keep
   passing — which is also the cleanest mechanical proof of why FR-1 refuses an
   id-based default: with `enforceFrom: 1` baked into `DEFAULT_CONFIG`, any caller that
   ever supplied an id would turn this existing green test red on the shipped artifact.
   Do not "fix" that by exempting the template inside the gate; keep the null-id path.
   - **Targets:** `packages/provegate/src/core/gates/value-score.ts` (new),
     `packages/provegate/src/core/gates/index.ts`,
     `packages/provegate/src/core/gates/prd-ready.ts::lintPrd`
3. **FR-3**: Add a corpus sweep mode, `gate check --value-score`, beside the existing
   `gate check --wiring` branch in `runCheck` — the same shape, a repo-wide audit rather
   than a single-PRD lint. It iterates the records in `_state/prds.json` (each already
   carries `number` and `artifacts.prd`), applies FR-2's decision to each, prints one line
   per failure with the declared and recomputed totals, and reports pre-cutoff skips with
   their reason. This is what catches a score edited **after** its PRD passed Phase 2;
   `gate check PRD-NNN` alone only covers the PRD in front of it.

   Weights come from the loaded config and nowhere else. There is no fallback table, no
   `--print-weights`, and no parity test, because a second copy of the weights no longer
   exists — `DEFAULT_CONFIG` supplies them when the repo declares none.
   - **Targets:** `packages/provegate/src/cli.ts::runCheck`,
     `packages/provegate/src/core/state/query.ts` (read-only: the record list)
4. **FR-4**: Set this repo's cutoff by **adding one key to the existing root
   `workflow.config.json`** — `{"valueScoring": {"enforceFrom": 17}}`, PRD-017 being the
   first PRD written under the scoring rule. This is the opt-in FR-1 keeps out of the
   shipped defaults: it is what makes a *missing* header a failure here while adopters
   stay on the presence-triggered mode. PRD-018 FR-6 creates that file (memory
   config); this PRD merges a key into it and must not recreate or rewrite it. If the file
   is absent at Phase 4 time the dependency was violated — stop rather than create it, or
   the two PRDs each land a different "first" version of a control artifact.
   - **Targets:** `workflow.config.json` (owned by PRD-018; this PRD adds one key),
     `packages/provegate/test/config-value-scoring.test.ts` (new)
5. **FR-5**: Cover the control-artifact edit. `gate open --worktree` snapshots
   `workflow.config.json` **by content hash**, so editing it advances the base for every
   lease taken before the edit: a pre-existing worktree is refused on reuse until it merges
   or rebases. A fixture proves both sides — refused before the merge, accepted after.
   The **introduction** case (a lease whose snapshot predates the file existing at all)
   belongs to PRD-018, which creates the file; this PRD proves only the edit case. Phase 4
   preflight re-checks `_state/locks` before committing, because the measurement goes stale.
   - **Targets:** `packages/provegate/test/config-value-scoring.test.ts`,
     `packages/provegate/src/core/run/open.ts` (read-only reference — no behavior change)
6. **FR-6**: Prove the decision at the unit and the sweep at the **command**. The
   arithmetic and cutoff matrix is a unit test over `value-score.ts` and `lintPrd`: custom
   valid weights → a total computed from them; a wrong total → the failure names declared
   and recomputed; a malformed header → fails at any id; a pre-cutoff PRD with no header
   → passes; an at-cutoff PRD with no header → fails; **an absent id — both `undefined` (the
   spelling every existing caller uses) and an explicit `null` — with no header →
   passes**, because presence is defined by id and there is no id (FR-2 states this
   residual and `packages/provegate/test/content-templates.test.ts` depends on it — it
   lints the header-less shipped template through `lintPrd` and asserts zero issues). A
   `null` id with a *present wrong* header still fails: the arithmetic never depends on
   the id. An earlier draft of this row said the `null`-id headerless case fails, which
   contradicted FR-2 and would have reddened that existing test.
   Custom-axis cases belong here too: a three-axis config scoring a matching header
   passes; the same header under the default five-axis config fails as malformed.
   Invalid weights (sum ≠ 1, three-decimal, missing axis) are FR-1's rejection, asserted
   there rather than duplicated here.

   The sweep gets a **built-CLI** fixture, as `cli-state.test.ts` does, because the thing
   under test is that the *command* reports and exits non-zero across a corpus — a
   function call cannot show that. A seeded fixture repo holds one correct PRD, one with a
   wrong total, and one pre-cutoff header-less PRD; the assertion is the exit code plus
   the failing PRD named in stdout, with the pre-cutoff one absent from the failures.
   - **Targets:** `packages/provegate/test/value-score.test.ts` (new),
     `packages/provegate/test/fixtures/value-score/**` (new)
7. **FR-7**: Add `scripts/verify/verify-doc-claims.mjs` with an explicit grammar, not an
   intention. Scanned files are the declared governance set (`AGENT_BOOTSTRAP.md`,
   `STATUS.md`, `_brain/PROTOCOL.md`, and the three practices counterparts). A line fails
   when it contains **both** a script token (`verify:<name>` or `verify-<name>.mjs`) that
   is wired as a `verify:*` key in root `package.json`, **and** a declared future marker
   (`wave 2`, `wave-2`, `lands in`, `will land`, `future work`, `stub now`,
   `specify later`, `not yet`). Fenced code blocks and `STATUS.md`'s Recent activity
   section are excluded as historical record. `scripts/verify/doc-claims-allowlist.json`
   holds `{file, claim, reason, reviewBy}` entries for genuinely-future work; it is
   shrink-only — an entry that no longer matches any line, or whose `reviewBy` has
   passed, fails the check (the known-red-ledger lesson).
   - **Targets:** `scripts/verify/verify-doc-claims.mjs` (new),
     `scripts/verify/doc-claims-allowlist.json` (new),
     `packages/provegate/test/doc-claims-script.test.ts` (new, with positive, negative,
     and stale-allowlist fixtures)
8. **FR-8**: Wire both gates, on **different surfaces**, because they now have different
   prerequisites.

   `verify:doc-claims` is unchanged in kind: a `package.json` script, a member of the
   `verify:workflow` bundle, and a step in the CI hygiene job.

   `verify:value-score` runs the built CLI — `node packages/provegate/dist/cli.js check
   --value-score` — so it **cannot** join the hygiene job, which installs but never
   builds. It goes in the build-dependent CI job, after `pnpm build`. It is likewise
   **not** a member of the `verify:workflow` bundle: that bundle is the no-build local
   surface, and a member that fails on a clean checkout without `dist/` would be a gate
   that reports the absence of a build as a governance violation.

   Both must still satisfy `verify:gates-wired`, which accepts CI `run:` text as an
   executing surface. This makes `verify:value-score` the **first `gate` invocation on any
   automated surface of this repository** — until now the CLI has appeared in no
   `package.json` script, no CI step, and no git hook.

   **Stated residual:** a `verify:*` script whose executing surface is CI-only is a
   weaker guarantee than a bundle member, because the local `pnpm verify:workflow` will
   not catch it before a push. `verify:dependency-audit` is already CI-only for the same
   class of reason (it needs registry access), so the shape is precedented rather than
   novel — but it is a real reduction and it is recorded here, not glossed.
   - **Targets:** `package.json` (`scripts`), `scripts/verify/verify-workflow.mjs`,
     `.github/workflows/ci.yml`
9. **FR-9**: Correct the stale governance claims: `AGENT_BOOTSTRAP.md` durable-artifacts
   (line ~128) and value-score (line ~144) sentences, the `STATUS.md` deferral-cap note
   (line ~25), and the `_brain/PROTOCOL.md` optional-tooling sections (~182, ~204). Each
   sentence states the shipped script name and the surface that runs it. The
   AGENT_BOOTSTRAP triage section additionally documents that the **axes**, the weights,
   and the cutoff are configurable, with the default values named, and that the shipped
   default is presence-triggered while this repo opts in at PRD-017.

   **Naming the default values creates the one duplication this PRD would otherwise
   ship, so it is pinned rather than tolerated.** `AGENT_BOOTSTRAP.md:137-141` holds the
   five weights as a prose table, and a human scoring a candidate needs them there — but
   after the relocation `DEFAULT_CONFIG` is the authority, and nothing compares the two.
   Retuning a weight in code would leave the document silently wrong, which is precisely
   the failure this PRD exists to remove. Add an assertion to `content-canon.test.ts`
   (already this PRD's file, via FR-11) that parses the AGENT_BOOTSTRAP triage table and
   deep-equals it against `DEFAULT_CONFIG.valueScoring.weights`, keyed by axis. The
   document keeps the numbers; the check keeps them true. `verify:doc-claims` (FR-7) is
   *not* the right home — its grammar is about future-tense claims, not value agreement.
   - **Targets:** `AGENT_BOOTSTRAP.md`, `STATUS.md`, `_brain/PROTOCOL.md`,
     `packages/provegate/test/content-canon.test.ts`
10. **FR-10**: Port the same corrections to the shipped practices copies and reconcile the
    hash ledger in the same change — `brain/PROTOCOL.md`,
    `templates/AGENT_BOOTSTRAP.template.md`, and `templates/STATUS.template.md` are all
    pack-drift pairs, so a one-sided edit fails the bundle.

    **Close the `{{VALUE_AXES_TABLE}}` gap while you are in that file**, because FR-1's
    configurable axes are meaningless if the shipped document that declares them is
    broken. Three measured defects, all in the adopter's copy:

    - `practices/templates/AGENT_BOOTSTRAP.template.md:116` contains
      `{{VALUE_AXES_TABLE}}`, and the token is **not declared** in
      `prompts/PLACEHOLDERS.md`. **Remove the token; do not register it.** An earlier draft
      of this FR said to add the registry row *and* replace the token with an inline table —
      register-and-remove, which guarantees the failure it is fixing:
      `content-placeholders.test.ts:59` fails on **orphan declarations** ("declared but
      never used"), so registering a token no template still contains turns that existing
      green test red. Register-or-remove is the rule, and remove is the right side of it
      here, because nothing substitutes the token (next bullet).
    - `packages/provegate/test/content-placeholders.test.ts` walks `prompts/` and
      `templates/` only, so no test covers `practices/templates/` and the undeclared token
      has been shipping invisibly. Add `practices/templates/` to that walk — **and specify
      the green state, because widening a test without one just moves the red.** Measured
      on 2026-07-27, `practices/templates/AGENT_BOOTSTRAP.template.md` carries six tokens
      and none is declared: `{{VALUE_AXES_TABLE}}`, `{{LINK_TO_VISION_DOC}}`,
      `{{VISION_OR_DECISIONS_DOC}}`, `{{ONE_LINE_PRODUCT_FRAMING}}`,
      `{{PROJECT_SPECIFIC_HARD_RULES}}`, and `{{PLACEHOLDER}}`.

      They split cleanly by **who fills them**, and the disposition follows from that:
      - **Four are adopter-fill prose** — `LINK_TO_VISION_DOC`, `VISION_OR_DECISIONS_DOC`,
        `ONE_LINE_PRODUCT_FRAMING`, `PROJECT_SPECIFIC_HARD_RULES`. A bootstrap template is
        exactly where a fill-in-the-blank belongs, and the registry is exactly where it is
        declared. **Register all four**, with no config mapping.
      - **`{{PLACEHOLDER}}` is not a token**; it is the word "placeholder" inside the
        template's own HTML instruction comment ("Fill every {{PLACEHOLDER}} and delete
        this comment", line 4). Registering it would declare a token nothing substitutes,
        and deleting the sentence would remove the instruction that makes the other four
        usable. **Exclude HTML comments from the walk** — the same masking the readiness
        lint already applies to its executable view — and state that as the reason.
      - **`{{VALUE_AXES_TABLE}}` is removed**, per the bullet above: it is config-derived
        rather than adopter-prose, and nothing substitutes it.

      Green state after this FR: five tokens in that file, four declared, one gone, zero
      orphans. If the walk surfaces a token this list does not name, report it and stop —
      an unplanned token is a finding, not a registry row to add on reflex.
    - Nothing substitutes the token — `core/run/init.ts` copies pack files verbatim — so
      `gate init --practices` writes a literal `{{VALUE_AXES_TABLE}}` into the adopter's
      `AGENT_BOOTSTRAP.md`. **This PRD does not add substitution to the installer**
      (that is a real feature with its own decisions, and `init.ts` belongs to PRD-023's
      expanded surface). It does the honest minimum: the template renders the default
      table inline **and** states, in the sentence above it, that the axes and weights come
      from `workflow.config.json` `valueScoring` and that an adopter who changes them must
      edit this table to match. A wrong-but-visible default beats an unfilled placeholder;
      a note naming the config key beats both silently.

      **The inline table is pinned to `DEFAULT_CONFIG`, not hand-maintained.** A hardcoded
      table inside a document about configurable axes is exactly the duplication this PRD
      exists to remove, so a test asserts the table's rows equal
      `DEFAULT_CONFIG.valueScoring.axes` in order with their weights. Change the default
      axes and the test names the template that no longer matches. Without that pin, the
      table is a second authority with nothing keeping it honest — which is finding E's
      subject, one paragraph below.
    - **Targets:** `packages/provegate/practices/brain/PROTOCOL.md`,
      `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`,
      `packages/provegate/practices/templates/STATUS.template.md`,
      `packages/provegate/prompts/PLACEHOLDERS.md`,
      `packages/provegate/test/content-placeholders.test.ts`,
      `scripts/verify/pack-drift-ledger.json`
11. **FR-11**: Add a status banner to `docs/research/provegate-bootstrap/README.md`:
    frozen bootstrap record, extraction complete through PRD-016, live canon is
    `apps/docs`. Mark the roadmap's shipped phases and point the draft whitepaper at the
    published v1.0. A dedicated test asserts the banner directly — the exact canonical
    link to the published docs, the "complete through PRD-016" statement, and that the
    roadmap's shipped phases are no longer unmarked.
    - **Targets:** `docs/research/provegate-bootstrap/README.md`,
      `docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md`,
      `docs/research/provegate-bootstrap/whitepaper-gated-autonomy-2026-07-22.md`,
      `packages/provegate/test/content-canon.test.ts` (new)
12. **FR-12**: Ship the config-surface change as a release: a changeset declaring a
    **minor** bump (additive key, no behavior change for an absent key), whose note
    states the one-way compatibility rule — an older CLI rejects `valueScoring` as an
    unknown key, so adopters upgrade the CLI before adding it, and remove the key before
    downgrading. `pnpm changeset status` is **not** acceptable evidence: it exits 0 on a
    checkout with no changesets at all.

    **The evidence is one semantic assertion over one entry, not two independent greps
    (W9, open since readiness iteration 6).** Two recursive greps — one for the
    `provegate` minor front-matter line, one for the compatibility sentence — are
    satisfied by two *different* files, so a checkout carrying an unrelated minor
    changeset plus an unrelated note passes while the entry this PRD owes is missing.
    Replace them with a test that reads `.changeset/*.md`, parses each entry's YAML
    front-matter, and asserts that **some single entry** both declares `provegate` at
    `minor` and contains the compatibility instruction in its body. Tolerate the quote
    styles changesets actually emits (`'provegate'`, `"provegate"`, bare) rather than
    pinning one. The failure message names which half was found so a half-written
    changeset is diagnosable.

    Because the axes are now part of the published config surface (FR-1), the note must
    also state the merge rule **as FR-1 defines it, in both directions** — an earlier draft
    of this sentence stated only half of it and would have published false adopter guidance:
    supplying `valueScoring.axes` requires the complete matching `weights` set and replaces
    the defaults wholesale, while supplying `weights` alone is a legal partial retune of the
    default axes, checked by the sum rule. A changeset that tells an adopter both keys are
    mandatory together makes the common case — nudging one weight — look unsupported.
    - **Targets:** `.changeset/` (new entry),
      `packages/provegate/test/changeset-entry.test.ts` (new)
13. **FR-13**: Make a repo-root Conflict Surface claim real. `declaredGlobs`
    (`packages/provegate/src/core/state/markdown.ts`) drops every claimed path that does
    not contain `/`, so a root-level file claim is silently discarded — measured today:
    PRD-018 loses `workflow.config.json` and `gates.manifest.json`, and this PRD loses
    `workflow.config.json`, `AGENT_BOOTSTRAP.md`, and `STATUS.md`. Both the advisory
    (`gate queue`) and the enforcing path (`candidateFromPrd` → lease `ownedPaths`) read
    that function, so two PRDs can claim and create the same root control artifact with no
    warning. Three parts, all required — the first alone does not fix the defect:

    **(a) Accept root-relative filenames, by literal predicate.** A backticked claim with
    no `/` is accepted when it matches one of exactly two shapes, and nothing else:
    a named file `^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*\.[A-Za-z0-9]+$` (so
    `workflow.config.json`, `STATUS.md`, and `AGENT_BOOTSTRAP.md` pass), or a dotfile
    `^\.[A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9]$` (so `.gitignore` and `.npmrc` pass).
    Both shapes forbid whitespace, a leading `/`, a `..` segment, and a trailing `.` —
    which is what excludes prose abbreviations such as `e.g.`, `i.e.`, and `etc.` The
    predicate is the specification; "plausible filename" is not.

    **(a′) Export the predicate under a name, because PRD-023 consumes it.** The two
    shapes above ship as `isRootRelativeFilename(token: string): boolean`, exported from
    `packages/provegate/src/core/state/markdown.ts` with its own unit tests. PRD-023 FR-3
    reuses it for the `## Durable Artifacts` section — "one predicate for two sections" is
    that PRD's thesis applied to itself, and it is only true if this PRD actually exposes
    one. Without the export, PRD-023's Phase 4 must either duplicate the logic (the defect
    that PRD exists to remove) or edit this file out of scope. Treat the export as part of
    the contract, not an implementation detail.

    **(b) Make rejection observable.** Add
    `parseConflictSurface(content): { globs: string[]; rejected: { token, reason }[] }`;
    `declaredGlobs` keeps its `string[]` signature and delegates, so no caller breaks.
    The observable surfaces are the two real consumers — `candidateFromPrd` (`gate open`,
    the enforcing path) and `readyOverlaps` (`gate queue`, the advisory) — each printing
    the rejected token and its reason. `gate check` does not read the Conflict Surface at
    all today, so it is not the place; silence at the two paths that do read it is what
    kept this invisible for twenty PRDs.
    Tests cover rejected `none`, `{placeholder}`, `e.g.` (trailing dot), and a `..`
    escape, each asserting the reason text, not just the exclusion. A residual is
    accepted knowingly: a backticked prose token that happens to be a well-formed
    filename (`Node.js`) parses as a claim. That is the right failure direction now that
    rejection is loud — an unintended claim surfaces as an overlap, while a silent drop
    surfaces as nothing.

    **Two further weaknesses in `readyOverlaps` are scoped out, and named so the advisory
    is not mistaken for trustworthy afterwards.** It compares declared globs by exact
    string equality (`state/query.ts:181`), so `docs/research/**` never matches
    `docs/research/DECISIONS.md`; and it is handed only READY records, so an in-flight
    lease never produces a warning. Both are real — together they are why `gate queue`
    stays silent about this PRD's five-surface overlap with the active PRD-017 lease (see
    Dependencies). Neither is fixed here: (c) already changes `findConflicts`, which is
    the **enforcing** path, and that is where a missed overlap is a hazard rather than a
    missed hint — `gate open` does refuse the PRD-017 case today. Widening the advisory's
    matching is a separate change with its own false-positive budget. What FR-13(b) buys
    the advisory is rejected-token visibility, and that is all it claims.

    **(c) Fix the enforcing path, which (a) alone does not reach.** `findConflicts`
    (`locks/conflicts.ts`) materializes globs against `git ls-files` and only falls back
    to `structuralOverlap` when a surface materializes to **zero** files. PRD-018 and
    PRD-021 each materialize dozens, so their shared claim on the not-yet-tracked
    `workflow.config.json` would still not conflict even after (a). Compute structural
    overlap over each surface's **unmaterialized** globs — those matching no tracked file
    — and union it with the file intersection. Existing behavior for tracked files is
    unchanged; the new case is "both PRDs claim a file that does not exist yet", which is
    exactly the collision that started this FR.
    - **Targets:** `packages/provegate/src/core/state/markdown.ts::declaredGlobs`,
      `packages/provegate/src/core/state/markdown.ts::isRootRelativeFilename` (new, exported),
      `packages/provegate/src/core/state/markdown.ts::parseConflictSurface` (new),
      `packages/provegate/src/core/locks/conflicts.ts::findConflicts`,
      `packages/provegate/src/core/locks/conflicts.ts::candidateFromPrd`,
      `packages/provegate/src/core/state/query.ts::readyOverlaps`,
      `packages/provegate/test/markdown.test.ts`,
      `packages/provegate/test/conflicts.test.ts`,
      `packages/provegate/test/state-query.test.ts`

---

## 5. Non-Goals (Out of Scope)

- Retuning the default weight values or thresholds, or touching the expand-don't-delete
  triage rule — this gate enforces the declared arithmetic and makes the weights
  configurable; it does not change what they are.
- Backfilling `Value:` headers into the 15 pre-cutoff PRDs, or rewriting completed PRDs
  whose headers are already correct.
- Publishing a `valueScoring` reference on the docs site. `apps/docs/content/docs/cli.mdx`
  and `packages/provegate/QUICKSTART.md` are claimed by PRD-019 and PRD-020; documenting
  the key there would make a three-way conflict surface. It is documented in
  `AGENT_BOOTSTRAP.md` and its shipped pack template instead.
- Relocating any **other** check into the package. Three method rules are currently
  implemented twice (`verify-review-artifact` against `core/gates/review.ts`,
  `verify-durable-artifacts` against `core/run/durable.ts`, `verify-gates-wired` against
  `core/gates/wiring.ts`), and `verify-deferred` is a method rule with no package
  implementation at all. This PRD fixes only the check it was already shipping, so it does
  not grow into a refactor; the general rule and the existing duplicates belong to
  PRD-023.
- **Adding a `Value:` line to `templates/prd-template.md` or the Phase 1 generator
  prompt.** Both are method content and the source snapshot's own PRD template omits the
  line, so writing one would be fabrication under critical rule 4. Presence-triggered
  enforcement (FR-1) is what makes the omission harmless; a shipped header line would need
  an owner-approved snapshot addendum and belongs to whichever PRD seeks one.
- **Teaching `gate init` to substitute placeholders.** FR-10 repairs
  `{{VALUE_AXES_TABLE}}` by rendering a default table and naming the config key that
  governs it, not by adding template substitution to the installer. Substitution is a real
  feature with its own decisions, and `core/run/init.ts` is in PRD-023's expanded surface.
- **Widening `readyOverlaps`' glob matching or extending it to in-flight leases** —
  named in FR-13(b), scoped out there with the reason.
- Memory effectiveness metrics (`gate memory stats`) — a dated deferral, owner-held.
- Panel-vs-single-reviewer machine rule — needs an ADR before any PRD.
- Any marketing or landscape claim re-verification.
- Rewriting the research pack's content; this PRD only marks its status.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a PRD at or after the cutoff whose declared total does not equal the weighted
  sum, **When** `gate check PRD-NNN` runs, **Then** it exits non-zero naming the declared
  total and the recomputed total.
- **Given** a PRD at or after the cutoff with no `Value:` header, **When** the check runs,
  **Then** it fails rather than passing by absence.
- **Given** a config with no `enforceFrom` — the shipped default — **When** a PRD with no
  header is checked, **Then** it passes; and **when** a PRD with a wrong header is
  checked, **Then** it still fails. An adopter on the stock template is never red-failed.
- **Given** the header as every PRD actually writes it,
  `> **Value**: 4.15 (MF/UI/TL/AR/RM: 4/4/4/5/4)`, **When** the parser runs, **Then** it
  matches; **given** a declared total with three decimals or in exponent form, **Then**
  it fails as malformed rather than being coerced.
- **Given** the AGENT_BOOTSTRAP triage table and `DEFAULT_CONFIG.valueScoring.weights`,
  **When** `content-canon.test.ts` runs, **Then** they deep-equal by axis; changing one
  without the other fails.
- **Given** one of the 15 pre-cutoff PRDs, **When** the check runs, **Then** it is skipped
  with a stated reason and the run stays green.
- **Given** a `workflow.config.json` carrying custom `valueScoring.weights`, **When**
  `gate check PRD-NNN` runs, **Then** config resolves instead of failing on an unknown key
  **and** the recomputed total reflects the custom weights, not the defaults.
- **Given** a config declaring three axes of the adopter's own naming with matching
  weights, **When** a PRD whose header names those three axes is checked, **Then** it
  passes and the total is computed from the adopter's weights; **and given** that same
  header under the default five-axis config, **Then** it fails as malformed rather than
  being read as a missing header.
- **Given** a config whose `axes` and `weights` key sets disagree, or an axis identifier
  containing `/` or a regex metacharacter, **When** any `gate` command resolves config,
  **Then** it fails with a named issue and no pattern is constructed.
- **Given** a declared dimension of `0` or `6`, **When** the check runs, **Then** the
  header fails as malformed — distinctly from an arithmetic mismatch.
- **Given** a `.changeset/` holding one entry that declares `provegate` minor and a
  *different* entry carrying the compatibility sentence, **When** the changeset assertion
  runs, **Then** it fails — the two properties must sit on one entry.
- **Given** weights that sum to 0.99, or a weight with three decimals, **When** any `gate`
  command resolves config, **Then** the resolution fails with a named issue.
- **Given** a PRD whose score was edited to a wrong total *after* it passed Phase 2,
  **When** `gate check --value-score` sweeps the corpus, **Then** it exits non-zero naming
  that PRD — the per-PRD lint alone would never look at it again.
- **Given** a governance line naming a wired script as future work, **When**
  `pnpm verify:doc-claims` runs, **Then** it fails; **given** a line naming a genuinely
  unshipped script, **Then** it passes.
- **Given** an allowlist entry that matches no line, or whose `reviewBy` has passed,
  **When** the check runs, **Then** it fails as stale.
- **Given** the corrected `AGENT_BOOTSTRAP.md` without the paired practices template edit,
  **When** `pnpm verify:pack-drift` runs, **Then** it fails until the counterpart is
  ported and the ledger reconciled.

---

## 7. Technical Considerations

### Architecture

- **A method rule and a repo rule, deliberately split.** The dividing question is whose
  artifacts a check governs. The value-score recompute governs PRDs — the method's own
  artifacts — so it ships in `packages/provegate` and every adopter gets it. The
  doc-claims check governs `AGENT_BOOTSTRAP.md`, `STATUS.md`, and `_brain/PROTOCOL.md`
  as *this repo* writes them, so it stays a `scripts/verify/` script following the
  shipped shape: zero dependencies, target-root argument, shared reporter from `lib.mjs`.
- **The relocation removes scope rather than adding it.** A standalone script would need
  its own config read, its own weight validation, a documented fallback table, a
  `--print-weights` escape hatch, and a spawn test pinning that table against
  `DEFAULT_CONFIG`. All of it exists only to keep two copies of one number agreed. In the
  package there is one table, `lintPrd` already holds the resolved config, and the
  scaffolding is unnecessary rather than merely cheaper.
- **Absence is a failure, not a skip — except where a policy says otherwise.** Two
  `_brain` learnings bind this directly (a grep-a-file check must exit 1 when the file is
  absent; a declared score must be machine-compared). The cutoff is the one sanctioned
  exception, and it is narrow by construction: it excuses only a *missing* header on a
  *pre-cutoff* id, never a wrong one.
- **Exact arithmetic is a validation problem, not a rounding problem.** Rather than
  choosing a tolerance, FR-1 constrains weights to two decimals, so the recompute is
  integer arithmetic in hundredths and every legal total has an exact two-decimal form.
- **One authority for the weights, and two projections of it — say that, not "one copy".**
  `DEFAULT_CONFIG` supplies the defaults, the root `workflow.config.json` overrides them,
  and the gate reads whatever `lintPrd` was handed. That is the authority, and nothing else
  *decides* a weight. But two documents still **display** the table: the root
  `AGENT_BOOTSTRAP.md` triage section that FR-9 keeps, and the practices template's inline
  table that FR-10 adds. An earlier revision of this section claimed nothing but the config
  holds a weight, in the same PRD whose FR-10 was adding a second table — the exact shape of
  the stale-claim defect this PRD exists to fix, committed by the PRD itself.

  So: one authority, two projections, and **both are mechanically pinned to
  `DEFAULT_CONFIG`** — the root `AGENT_BOOTSTRAP.md` table by FR-9's pin, the practices
  template's table by FR-10's. Neither is hand-maintained, and a change to the default axes
  or weights names the document that no longer matches. (A draft of this paragraph called
  the root projection "currently manual"; FR-9 pins it, so that was wrong in the safe
  direction and is corrected here rather than left as a claim that undersells the design.)
  The earlier design's two *authorities* — the script's fallback table and `DEFAULT_CONFIG`,
  mitigated by a behavioural parity test — are genuinely gone, and that is the real
  improvement: one decision point instead of two, with the projections proved against it
  rather than compared to each other.
- **Introducing a root `workflow.config.json` is not free.** `gate open --worktree`
  snapshots the config file as a control artifact when it exists
  (`run/open.ts` binds `configSourceFor` bytes into the lease). The file must therefore be
  committed in the same change as the code that reads it, and it must stay minimal —
  FR-4's deep-equal test is what keeps "minimal" true. A worktree leased *before* the file
  existed carries a snapshot without it and is refused on reuse until it merges the base
  branch; FR-5 tests both sides of that transition rather than asserting it in prose.
- **Phase placement.** Register each check where its failure should surface (the
  verify-check-phase-placement learning). Both are Phase 1/2 triage invariants. The
  relocation improves this rather than complicating it: the value-score rule now fires
  inside `gate check PRD-NNN`, which every PRD's §11 already names as the command to run
  **before Phase 2 PASS** — the exact moment a wrong score should stop the work. The
  corpus sweep and the doc-claims check remain pre-merge hygiene, catching the
  after-the-fact edit that a Phase 2 lint cannot see.

### Migration & Rollback

- **Corpus migration:** prospective cutoff at PRD-017, opted into by this repo alone
  (FR-4). Pre-cutoff PRDs are skipped by id, with no file list to maintain and no
  fabricated scores. New PRDs are in scope automatically because their ids exceed the
  cutoff. Pre-cutoff PRDs that *do* carry a header are still checked for arithmetic — the
  cutoff excuses absence only — and every such header in the corpus recomputes correctly
  today, so the first run is green.
- **Adopter migration on the stock config: none, by construction.** With `enforceFrom`
  absent the gate is presence-triggered, so upgrading the CLI cannot fail a PRD that was
  passing before. This is the property that makes the release safe to ship ahead of any
  template change, and it is why FR-1 refuses the "enforce everywhere" default.
- **Adopter migration once `axes` is edited: real, and it is a corpus rewrite.** The
  heading above is true of the upgrade, not of every later config change. A header whose
  axis list disagrees with the config fails as malformed (FR-2), so changing `axes` reds
  every already-scored PRD at once, and removing an axis does the same to every header that
  still names it. The procedure is FR-1's: sweep with `gate check --value-score` to get the
  exact list, then land the `axes` change and the header rewrites in one commit. Stating
  only the first bullet is how "no migration" becomes a claim that outlives its condition —
  which is the class of defect this whole PRD exists to correct.
- **Rollout order:** release the CLI carrying `valueScoring` (FR-12 minor bump) → adopters
  upgrade → only then may they add the key. The reverse order hard-fails, because unknown
  keys are config errors; the changeset note states this.
- **Downgrade:** remove the `valueScoring` key from `workflow.config.json` before
  installing an older CLI. Nothing else in the repo depends on the key.
- **In-flight worktrees:** do not assert a count here — an earlier draft claimed
  `_state/locks` was empty and the PRD-017 lease was active within hours. The Phase 4
  preflight is the measurement: re-check `_state/locks` then, and for any live lease the
  worktree merges the base branch before its next `gate` command, which is the same
  procedure any control-file change already requires.
- **Rollback of this change:** delete the doc-claims script and the `--value-score`
  branch, drop both `package.json` entries and the CI steps, remove the `valueScoring`
  key, **and remove FR-2's `lintPrd` call plus the optional FIFTH `prdNumber` argument it
  added to that signature** — fifth, after the existing optional `root`, which the
  four-arity form already occupies. An earlier draft said `core/gates/value-score.ts` "may stay — uncalled,
  it changes nothing"; it would not be uncalled, because FR-2 wires it into `lintPrd`,
  which is the whole reason the gate fires at `gate check` time. The file itself may stay
  once the call is gone. The config-surface addition is additive and inert when unused, so
  a published version carrying it needs no data or artifact migration.
- **Rollback is one direction shorter than before, and one direction longer.** The gate
  now ships to adopters, so reverting it after a release is a **published** behavior
  change: an adopter on the new CLI whose PRD scores were being checked stops being
  checked. That is the cost of putting the rule where adopters can use it, and it argues
  for landing FR-1 and FR-2 in the same release rather than the key first.

### Dependencies

- **PRD-018 must be Ship Verified before this PRD enters Phase 4.** Two reasons now. It
  creates the root `workflow.config.json` that FR-4 adds a key to; and its FR-2 adds the
  readiness watch gate to the same `lintPrd` this PRD's FR-2 extends. That puts this PRD
  behind the memory chain (017 → 018), which is a deliberate cost: the alternative is two
  PRDs each creating the same control artifact, a collision the gate cannot currently see
  (FR-13).
- **PRD-019 must also be Ship Verified first**, for one reason and no other: it claims
  `packages/provegate/src/cli.ts` to add `gate doctor`, and FR-3 adds the `--value-score`
  branch to `runCheck` in the same file. No design coupling — only a modify-in-place file
  both must write. This dependency is **new as of the 2026-07-25 relocation**; the
  script-based design did not touch `cli.ts`.
- **PRD-017 must be Ship Verified first, and its lease released.** This was undeclared
  until readiness iteration 7 measured it. The live lease owns
  `packages/provegate/src/core/config/**` (which contains all three of FR-1's targets),
  `_brain/**` (FR-9's `_brain/PROTOCOL.md`), `packages/provegate/practices/brain/**`
  (FR-10's counterpart), `scripts/verify/pack-drift-ledger.json` (FR-10), and
  `docs/research/provegate-bootstrap/{DECISIONS.md, source-snapshot/**}` — five surfaces
  inside this PRD's claim. The chain 017 → 018 → 019 → 021 already resolves it, and
  `findConflicts` would refuse a concurrent `gate open` because the tracked files
  intersect, so nothing was ever at risk; the omission was in the document, not the gate.
  It matters beyond bookkeeping for one reason: **FR-1 extends the same config surface
  PRD-017 is mid-flight on**, so FR-1 must be written against whatever `core/config/`
  looks like after PRD-017 merges, not against today's tree.
- Otherwise none — existing verify library, shipped scripts, changesets infrastructure.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/config/` — `valueScoring` types, defaults, validation
- [ ] `packages/provegate/src/core/gates/value-score.ts` (new) + `lintPrd` call
- [ ] `packages/provegate/src/cli.ts` — the `--value-score` sweep branch in `runCheck`
- [ ] `scripts/verify/verify-doc-claims.mjs`,
      `scripts/verify/doc-claims-allowlist.json` (new) + bundle/CI registration
- [ ] `package.json` + `.github/workflows/ci.yml` — `verify:value-score` on the
      build-dependent surface, `verify:doc-claims` on the hygiene surface
- [ ] `workflow.config.json` — one key added to PRD-018's file, not a new file
- [ ] `packages/provegate/src/core/state/markdown.ts` — root-file Conflict Surface claims
- [ ] `packages/provegate/test/config-value-scoring.test.ts`,
      `test/value-score.test.ts`, `test/doc-claims-script.test.ts`,
      `test/content-canon.test.ts`, `test/changeset-entry.test.ts`,
      `test/fixtures/value-score/**` (new)
- [ ] `packages/provegate/prompts/PLACEHOLDERS.md` +
      `test/content-placeholders.test.ts` — **remove** `{{VALUE_AXES_TABLE}}` from the
      practices template (do not register it — registering a token no template contains
      reds the orphan check), register the four adopter-fill tokens the widened walk
      surfaces, exclude HTML comments from the walk, and widen it to
      `practices/templates/` (FR-10)
- [ ] `AGENT_BOOTSTRAP.md`, `STATUS.md`, `_brain/PROTOCOL.md`
- [ ] `packages/provegate/practices/` counterparts + `pack-drift-ledger.json`
- [ ] `docs/research/provegate-bootstrap/` status banner + roadmap/whitepaper pointers
- [ ] `.changeset/` entry (minor)

---

## 9. Open Questions

(none) — all four resolved by owner on 2026-07-25.

**Q1 resolved:** exact two-decimal equality, made sound by constraining configured weights
to two decimals and recomputing in integer hundredths (FR-1, FR-2).
**Q2 resolved:** the doc-claims drift check ships, scoped narrowly to the governance file
set with an expiring allowlist (FR-7).
**Q3 resolved:** the weights live in `workflow.config.json`, which pulls the CLI config
surface into scope (FR-1). The behavioral parity test this answer originally dragged in
**no longer exists** — the 2026-07-25 relocation deleted the second weight table it
existed to pin, and §12 now forbids reintroducing either. What remains of that thread is
FR-9's prose-table assertion, which pins a *document* to `DEFAULT_CONFIG` rather than a
second implementation to the first.
**Q4 resolved (readiness W1, amended at W13):** the header-less legacy PRDs are handled by
a **prospective cutoff** (`enforceFrom: 17`), not by backfill and not by a per-file
exemption list. The cutoff is this repository's opt-in; the shipped default is
presence-triggered, which is what keeps the same mechanism from red-failing adopters
whose template never emitted the header (§1, FR-1).

---

## 10. References

- Gap analysis: P0 item 3 (doc drift remainder) + P2 item 7 (value-score recompute)
- Readiness W1–W21: `_readiness/wip/readiness-021-governance-truth-up.md`
- **Source-snapshot precedent for this gate:**
  `docs/research/provegate-bootstrap/source-snapshot/scripts/verify-prd-ready.mjs:280-306`
  (`validateVScore`, presence-triggered, no id parameter) and `:65` (`ENFORCE_FROM_PRD`,
  the separate repo-local id cutoff). The snapshot's PRD template carries no value header,
  which is why presence-triggering is load-bearing rather than lenient
- `_brain/learnings/score-must-equal-weighted-sum.md`
- `_brain/learnings/false-green-on-missing-file.md`
- `_brain/learnings/known-red-ledger-must-expire.md`
- `_brain/learnings/gate-wire-or-delete.md`
- `_brain/learnings/verify-check-phase-placement.md`
- Config contract: `packages/provegate/src/core/config/load.ts` (`deepMerge`,
  `configSourceFor`), `validate.ts` (unknown keys are errors)
- Worktree control-artifact binding: `packages/provegate/src/core/run/open.ts`
- `scripts/verify/pack-drift-ledger.json` (`_readme` describes the reconcile contract)
- Already closed by release prep (2026-07-25): the package README's "not implemented"
  claims — not in this PRD's scope

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `scripts/verify/verify-doc-claims.mjs`
- `scripts/verify/doc-claims-allowlist.json`
- `scripts/verify/verify-workflow.mjs`
- `scripts/verify/pack-drift-ledger.json`
- `packages/provegate/src/core/gates/value-score.ts`
- `packages/provegate/src/core/gates/prd-ready.ts`
- `packages/provegate/src/core/gates/index.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/test/prd-ready.test.ts`
- `packages/provegate/test/value-score.test.ts`
- `.github/workflows/ci.yml`
- `workflow.config.json` — write ownership during this PRD's execution phase only;
  PRD-018 owns creating it, and the two never run concurrently (see Dependencies)
- `packages/provegate/src/core/state/markdown.ts`
- `packages/provegate/src/core/locks/conflicts.ts`
- `packages/provegate/src/core/state/query.ts`
- `packages/provegate/test/markdown.test.ts`
- `packages/provegate/test/conflicts.test.ts`
- `packages/provegate/test/state-query.test.ts`
- `packages/provegate/src/core/config/types.ts`
- `packages/provegate/src/core/config/defaults.ts`
- `packages/provegate/src/core/config/validate.ts`
- `packages/provegate/src/core/config/load.ts`
- `packages/provegate/test/config-value-scoring.test.ts`
- `packages/provegate/test/doc-claims-script.test.ts`
- `packages/provegate/test/content-canon.test.ts`
- `packages/provegate/test/content-placeholders.test.ts`
- `packages/provegate/test/changeset-entry.test.ts`
- `packages/provegate/prompts/PLACEHOLDERS.md`
- `packages/provegate/test/fixtures/value-score/**`
- `AGENT_BOOTSTRAP.md`
- `STATUS.md`
- `_brain/PROTOCOL.md`
- `packages/provegate/practices/brain/PROTOCOL.md`
- `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`
- `packages/provegate/practices/templates/STATUS.template.md`
- `docs/research/provegate-bootstrap/**`

**This PRD overlaps other work items, and every overlap is claimed rather than excused.**

**Read the queue, not this list.** The enumeration below has now gone stale three times in
this file — most recently when a reader compared it against `gate queue` and found the
PRD-023 overlap reported as eight files where the prose said five. The Conflict Surface
itself is complete, so locking has never been affected; only the sentence drifts, and it
drifts because the surface it describes is edited by other PRDs, not by this one. The
current measurement, `gate queue` on **2026-07-27** with PRD-018, 019, 020 and 022 landed:

- **PRD-021 ↔ PRD-023, eight paths** — `packages/provegate/src/cli.ts`,
  `packages/provegate/src/core/gates/prd-ready.ts`,
  `packages/provegate/src/core/config/types.ts`,
  `packages/provegate/src/core/config/defaults.ts`,
  `packages/provegate/src/core/config/validate.ts`, `scripts/verify/verify-workflow.mjs`,
  `scripts/verify/pack-drift-ledger.json`, `.github/workflows/ci.yml`. This PRD's FR-1 now
  also targets `core/config/load.ts`; if PRD-023 claims it too the count becomes nine, and
  the queue will say so.
- **No other active overlap.** PRD-018, PRD-019, PRD-020 and PRD-022 have all landed, so
  their rows below are historical. They are kept because they record why several files are
  shared at all.

Historical, from `gate queue` on 2026-07-25 while those items were in flight:

- `packages/provegate/src/cli.ts` — also PRD-019's (`gate doctor`), PRD-022's (the
  revalidation seam in `runRun()`), and PRD-023's (its sweep branches). Four PRDs, four
  different regions, one modify-in-place file that is not union-mergeable.
- `packages/provegate/src/core/gates/prd-ready.ts` — also PRD-018's (FR-2, the readiness
  watch gate) and PRD-023's (FR-3's declaration lint). All three add a check to `lintPrd`.
- `packages/provegate/test/prd-ready.test.ts` — PRD-018, same reason.
- `scripts/verify/verify-workflow.mjs`, `.github/workflows/ci.yml`, and
  `packages/provegate/src/core/config/types.ts` — all three also PRD-023's.
- `scripts/verify/pack-drift-ledger.json` — also PRD-018's and PRD-019's, and held by the
  **active PRD-017 lease** along with `packages/provegate/src/core/config/**`,
  `_brain/**`, `packages/provegate/practices/brain/**`, and
  `docs/research/provegate-bootstrap/**` (see Dependencies).

The PRD-023 and PRD-017 rows are the ones an earlier revision missed while asserting the
list was complete — in the same paragraph that told the reader to run `gate queue`.

The wave order (017 → 018 → 019 → **021** → 020 → 022 → 023) already resolves all three by
sequencing, and PRD-018 is already a blocking prerequisite for other reasons (FR-4).
PRD-019 now becomes one too, on the `cli.ts` overlap alone. Declaring them exclusively is
the point: the lock gate then refuses if the ordering is ever violated, instead of two
agents silently editing the same function. **Run `gate queue` before claiming** — PRD-022
learned the hard way that a PRD's own overlap list is not evidence.

**That order is a valid serialization, not a required one.** `gate queue` on 2026-07-25
reports no intersection between PRD-020's Conflict Surface and this one, so once PRD-019 is
Ship Verified PRD-020 may run **concurrently with this PRD**. What must stay serialized is
this PRD against PRD-022, which shares `packages/provegate/src/cli.ts`. (PRD-020 may
**not** run concurrently with PRD-023 — that PRD's scope expansion later the same day
created an overlap on `packages/provegate/test/pack-manifest.json`. Re-run the queue rather
than carrying this sentence forward.)

PRD-023 declares this PRD as a Ship-Verified prerequisite and runs last, so sequencing
resolves that pair from its side; PRD-017 is resolved by the 017 → 018 → 019 → 021 chain.

---

## Memory Inputs

- applied: `gate-wire-or-delete` — this PRD's subject IS the meta-gate's other direction:
  a documented claim with no executing check is the same defect as an unwired script.
- applied: `false-green-on-missing-file` — a doc-claims checker that skips an absent file
  certifies the very drift it exists to catch.
- applied: `unparseable-command-must-fail-loudly` — the claims allowlist must refuse an
  entry it cannot classify rather than silently dropping it.
- reviewed: `known-red-ledger-must-expire` — the allowlist is an acknowledged-exception
  list and needs the same staleness rule, or it becomes a permanent bypass.
- applied: `fixture-must-reach-production-shape` — this PRD edits `cli.ts`, and the record
  watches it: a regression here must call the gate the way the router does, not with
  cleaner arguments.

- applied: `assert-absent-needs-an-independent-cause` — this PRD's reject fixtures are
  negative by construction (a header that must NOT match, a config that must NOT resolve,
  an orphan declaration that must NOT exist). Each one needs a mutation check proving the
  absence has a cause independent of the scenario, or it is green either way.
- applied: `strictness-added-during-extraction-is-a-behavior-change` — FR-2 moves the
  value-score decision out of the standalone script and into `lintPrd`. The relocation must
  not tighten what the snapshot does on the way: where it deliberately diverges (exact
  comparison instead of a tolerance band, `[1-5]` instead of any digit) the PRD records it
  as a divergence, and everything else must behave as the source does.
- applied: `evidence-pattern-satisfied-by-the-template` — written by PRD-020 about this
  exact class of gate. FR-2 generates a required-line pattern and the repo ships a PRD
  template; the obligation is one assertion that the shipped template does not
  accidentally satisfy the generated header pattern. Today it cannot (the template emits
  no `Value:` line, which is why presence-triggering is the default), and that fact must be
  pinned rather than assumed, because FR-10 edits templates in the same change.

## Memory Outputs

- learning: `_brain/learnings/docs-outlive-the-gate-they-promise.md` — a document that
  describes a check as future work keeps describing it that way after the check ships, and
  the stale direction is the inverse of the intuitive one: three of four "wave 2" claims
  here were already true, and the two defects were shipped-things-called-unshipped.
- learning: `_brain/learnings/a-rule-corrected-survives-where-it-is-restated.md` — across
  five consecutive readiness rounds on this item, every finding was created by the fix for
  the round before it: a rule corrected in its owning FR while the old version survived in
  another section. The remedy is a reviewer instruction, not a gate — brief a sweep across
  named sections rather than a defect hunt.

Appended at Phase 7 under the escape hatch this section opened at Phase 1. It is not
derivable from the checker or from the code: the evidence is the shape of five rounds, and
the actionable half is how the sixth round was briefed.

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Review artifact: `_docs/reviews/review-021-governance-truth-up.md`
- Learning: `_brain/learnings/docs-outlive-the-gate-they-promise.md` — **the close
  confirmed the pattern and sharpened its direction.** `verify:doc-claims` found two stale
  claims on its first run, and both were the INVERSE of the expected defect: a wired,
  CI-running script described as future work. The record carries that measurement, because
  a checker written for the intuitive direction would have found nothing.
- Learning: `_brain/learnings/a-rule-corrected-survives-where-it-is-restated.md` — the
  readiness history's own shape: five rounds, five findings, every one created by the fix
  for the round before it. Every Memory Output repeats here; the two lists are proved
  against the same merge diff.

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR    | Command / Check                                                        | Scope | Notes                                                       |
| ----- | ------------------------------------------------------------------------ | ----- | ------------------------------------------------------------- |
| FR-1  | `pnpm --filter provegate test test/config-value-scoring.test.ts`          | pkg   | schema, defaults, merge, lexical two-decimal accept/reject, and enforceFrom absent by default |
| FR-2  | `pnpm --filter provegate test test/prd-ready.test.ts`                     | pkg   | the lint fails a wrong total; an absent id, in either spelling, still enforces the arithmetic |
| FR-3  | `pnpm --filter provegate test test/value-score.test.ts`                   | pkg   | built-CLI sweep names the failing PRD and skips the pre-cutoff one |
| FR-4  | `pnpm --filter provegate test test/config-value-scoring.test.ts`          | pkg   | resolved config deep-equals defaults except the cutoff         |
| FR-5  | `pnpm --filter provegate test test/config-value-scoring.test.ts`          | pkg   | pre-existing worktree refused before merge, accepted after     |
| FR-6  | `pnpm --filter provegate test test/value-score.test.ts`                   | pkg   | the arithmetic and cutoff matrix, including every failing fixture |
| FR-7  | `pnpm --filter provegate test test/doc-claims-script.test.ts`             | pkg   | positive, negative, and stale-allowlist cases                  |
| FR-8  | `pnpm verify:gates-wired`                                                 | repo  | both checks wired; the CI-only one is seen via CI step text    |
| FR-8  | `pnpm verify:workflow`                                                    | repo  | the bundle runs doc-claims; value-score is deliberately absent |
| FR-8  | `pnpm verify:value-score`                                                 | repo  | the built CLI sweeps the live corpus green (needs `pnpm build`) |
| FR-9  | `pnpm verify:doc-claims`                                                  | repo  | zero stale wave-2 claims about wired scripts                   |
| FR-9  | `pnpm --filter provegate test test/content-canon.test.ts`                 | pkg   | the AGENT_BOOTSTRAP triage table deep-equals the configured axes and weights |
| FR-10 | `pnpm --filter provegate test test/content-placeholders.test.ts`          | pkg   | the walk covers practices/templates and every token there is registered |
| FR-10 | `pnpm verify:pack-drift`                                                  | repo  | pack/live pairs reconciled, ledger updated                     |
| FR-11 | `pnpm --filter provegate test test/content-canon.test.ts`                 | pkg   | banner, canonical link, roadmap phase marks                    |
| FR-12 | `pnpm --filter provegate test test/changeset-entry.test.ts`               | repo  | one entry declares provegate minor AND carries the compatibility sentence; two half-entries fail |
| FR-13 | `pnpm --filter provegate test test/markdown.test.ts`                     | pkg   | root-file claims parse; each rejection names token and reason  |
| FR-13 | `pnpm --filter provegate test test/conflicts.test.ts`                    | pkg   | enforcing path: an untracked root claim conflicts structurally |
| FR-13 | `pnpm --filter provegate test test/state-query.test.ts`                  | pkg   | the queue advisory prints rejected tokens                      |

The FR-3 and FR-8 rows drive the **built** CLI, so `pnpm build` must precede them; the
root `pnpm test` already depends on `build` through turbo, and the floor below runs both.

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/value-score.test.ts` — "a wrong declared total
  fails the check", "an at-cutoff PRD with no header fails", and the paired positive
  "with no cutoff configured, a header-less PRD passes"; a check that only passes on good
  input is not evidence, and one that only fails is a trap.
- Contract test: n/a — no client→server payload ships.

Before Phase 2 PASS, run: `gate check PRD-021`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` + narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT let a missing header pass at or after a **configured** cutoff, or let a *wrong*
  header pass anywhere — the exemption covers absence only.
- DO NOT default `enforceFrom` to `1`, `0`, or any other value. Its shipped default is
  **absent**, which selects presence-triggered mode. The stock `templates/prd-template.md`
  emits no `Value:` line, so any id-based default red-fails an adopter's first
  `gate check` for omitting something nothing asked them to write.
- DO NOT "fix" that by adding a `Value:` line to the shipped PRD template or the Phase 1
  prompt. The source snapshot's template omits it too; writing one is fabricated method
  content under critical rule 4.
- DO NOT write the header pattern against the bare form `Value: T (…)`. Every PRD that
  carries the header writes `> **Value**: T (…)` and the bare pattern matches nothing —
  port the snapshot's regex shape, adjusted for the colon sitting outside the bold run.
- DO NOT hardcode `MF/UI/TL/AR/RM` anywhere in the gate. The axis list is config
  (FR-1) and the header pattern is generated from it (FR-2). A literal five-axis pattern
  is the defect the independent readiness round found, not a shortcut.
- DO NOT interpolate an axis identifier into a pattern before validating it against the
  charset. The charset is what makes generation safe; validating after building the
  pattern validates nothing.
- DO NOT specify dimensions as "a single digit". The rubric's range is 1–5, and a single
  digit admits 0 and 6–9, which lets `9/9/9/9/9` recompute consistently and pass.
- DO NOT let `deepMerge` produce a weight set for axes the adopter never declared. When
  `axes` is supplied, the whole `valueScoring` object replaces the default before the merge
  and the weight set must match the declared axes exactly. This is **not** a rule that
  weights may never appear alone: with `axes` absent there are no undeclared axes to
  produce, so a weights-only config is an ordinary partial retune of the defaults and the
  sum rule is what keeps it honest.
- DO NOT assert that a shipped template lacks a section by grepping for what the section
  would contain. `practices/templates/AGENT_BOOTSTRAP.template.md` has a triage section at
  line 108 that greps for the weight values and for `Value` both miss, and two rounds
  asserted its absence on exactly that evidence. List the file's headings instead.
- DO NOT compare totals as floats or introduce a tolerance band; the weight validation is
  what makes exact comparison sound.
- DO NOT validate the two-decimal rule with `Number.isInteger(weight * 100)` — it rejects
  legal values such as 0.29; check the canonical decimal text first.
- DO NOT use `pnpm changeset status` as proof that a changeset exists; it exits 0 on an
  empty `.changeset/`.
- DO NOT reintroduce a standalone `verify-value-score.mjs`, a fallback weight table, or
  `--print-weights`. A second copy of the weights is the defect this revision removed; a
  parity test for it is not a substitute for its absence.
- DO NOT let the `null` id path skip the arithmetic. Absent id means "cutoff unknown", not
  "unchecked" — a caller with no record must still fail a wrong total.
- DO NOT derive the cutoff id by parsing the `# PRD-NNN:` heading from the body; the
  caller has the record and passes the number.
- DO NOT add `verify:value-score` to the `verify:workflow` bundle. It runs the built CLI,
  and the bundle is the no-build local surface — a member that fails on a clean checkout
  would report a missing build as a governance violation.
- DO NOT claim `verify:value-score` is enforced locally. It is CI-only, full stop — the
  reduction is that it is absent from the `verify:workflow` bundle, which is the local
  no-build surface, and no manifest changes that. An earlier draft conditioned this on
  "until the root gates manifest exists", a condition PRD-018 satisfies **before** this
  PRD's Phase 4 can start, which made the clause expire before anyone could read it.
- DO NOT backfill invented scores into the pre-cutoff PRDs.
- DO NOT put anything except the cutoff key into the root `workflow.config.json`, and DO
  NOT create that file — PRD-018 owns its creation; a missing file means the dependency
  was violated.
- DO NOT widen `declaredGlobs` into a permissive "anything backticked is a path" parser;
  the fix is accepting root-relative filenames **and** naming what it still rejects.
- DO NOT stop at the parser: without the structural-overlap change in `findConflicts`, a
  claim on a file that is not yet tracked still cannot conflict, and the defect survives
  its own fix.
- DO NOT change `declaredGlobs`'s exported signature; add the diagnostic function beside
  it and delegate.
- DO NOT edit a live governance file without porting the practices counterpart and
  reconciling the ledger in the same change.
- DO NOT silence either new check with a known-red ledger entry instead of fixing the
  claim, and DO NOT add an allowlist entry without a `reviewBy` date.
- DO NOT change the default weight values or thresholds under cover of this cleanup —
  making them configurable is in scope, retuning them is not.
- DO NOT rewrite research-pack content while adding its status banner.

---

## Changelog

| Date       | Author | Changes                                                                        |
| ---------- | ------ | -------------------------------------------------------------------------------- |
| 2026-07-27 | Claude Opus 5 | Readiness iteration 14 (ITERATE 7.99) answered. The axes/weights propagation defect is closed; one stale copy survived on the item introduced the round before. Three sites said existing callers "pass `null`" — they cannot, because the parameter does not exist until this PRD adds it; they **omit** it and supply `undefined`. FR-2's prose, FR-6's matrix, and the §11 FR-2 row now name both spellings, and the guard is specified as an absence test rather than `=== null`, because the strict form would enforce presence on all 44 existing call sites the moment this repo sets `enforceFrom` — first casualty `content-templates.test.ts:99`, which lints the shipped header-less template and asserts zero issues. Writing that §11 Notes cell also reproduced `notes-column-runs-commands` live: a backticked word in the Notes column was parsed as a verification command and `gate check` refused it as unsafe. Backticks removed; the record's interim workaround is the fix until PRD-023's FR-7(a) scopes the parser to the Command column |
| 2026-07-27 | Claude Opus 5 | Readiness iteration 13 (ITERATE 7.98) answered. One blocker, and it was the same propagation defect a third time: making weights-only overrides legal in FR-1 left FR-12's changeset note and a DO NOT rule still saying `axes` and `weights` are supplied together — so routine implementation would either violate FR-1 or publish false adopter guidance. Both now state the rule in both directions. Two non-blocking items also taken: the caller census was off by one (41 in `prd-ready.test.ts`, not 42), and the existing callers **omit** the fifth argument rather than passing `null`, so FR-6's matrix must cover `undefined` and `null` both — an implementation checking only `=== null` would red the shipped-template test the moment this repo sets `enforceFrom` |
| 2026-07-27 | Claude Opus 5 | Readiness iteration 12 (ITERATE 7.95, "converging") answered. Two contract inconsistencies, both introduced at the previous remediation seam. **The fifth `lintPrd` parameter was not compilable as written** — a required parameter cannot follow the optional `root?: string` — so it is `prdNumber?: number \| null`, optional, with absent and `null` meaning the same thing. That is what keeps it a one-caller change: measured, there are 44 call sites, 42 in `prd-ready.test.ts`, and a required parameter would edit all of them and pull two untouched test files into the Conflict Surface to buy nothing. The rollback note now names the fifth ordinal too. **Weights without axes was unspecified and defaulted to the wrong answer**: the loader rule covered `axes` present, so a weights-only override merged recursively and passed with default-filled keys, contradicting the wholesale-replacement prose. Decided in the adopter's favour — a weights-only config retunes the default axes, which is legitimate, and the sum rule already catches an incoherent partial. Three loader/validation rules are now stated separately with fixtures pinning the partial case in both directions |
| 2026-07-27 | Claude Opus 5 | Readiness iteration 10's four [P1]s and three [P2]s answered, each re-verified against source before being written. **A** was the load-bearing one and it moved an FR's target: `deepMerge` recurses into plain objects, so `weights` merges while `axes` replaces, and a three-axis config reaches validation carrying five default weight keys — the replacement is a LOADER rule, `load.ts::resolveConfig` joins FR-1's targets, and the proof is a resolution test rather than a validation fixture. **B** requires case-insensitive uniqueness of axis identifiers, resolving the `A`/`a` ambiguity on the identifier side rather than by dropping the snapshot's `/i`. **C** withdraws "adopter migration: none" for the scored corpus: changing `axes` reds every scored PRD, so the rule is sweep with `gate check --value-score`, then land the axis change and the header rewrites in one commit. **D** replaces register-and-remove with register-**or**-remove — registering `{{VALUE_AXES_TABLE}}` after removing it would red `content-placeholders.test.ts`'s orphan check — and pins the inline table to `DEFAULT_CONFIG`. **E** corrects "one copy of the weight table" to one authority and two projections, one pinned and one manual, which is the same stale-claim defect this PRD exists to fix, committed by the PRD itself. **F** requires at most one `Value` line inside the metadata block. **G** replaces the overlap enumeration with a dated measurement and an instruction to read the queue. Also disposes the three memory records written by PRD-020 and PRD-022 whose watches now overlap this PRD's targets |
| 2026-07-25 | Claude Opus 5, on owner direction | **Readiness iteration 9 remediation — the independent Codex round's four [P1]s. Owner decision: make the axes configurable.** The blocking finding was a false premise two self-scored rounds asserted four times: `practices/templates/AGENT_BOOTSTRAP.template.md` was said to have no triage section. It has one at line 108, and line 111 tells adopters to **"define your own axes"** — so an `MF/UI/TL/AR/RM`-only gate cannot score the method it ships with. The owner chose configurable axes over rewriting the shipped template to canonical axes, which would have needed a snapshot addendum and removed an adopter capability. **FR-1** gains `axes: string[]` (ordered, default MF/UI/TL/AR/RM), `weights` keyed by those axes with exact set-equality validation in both directions, an axis-identifier charset that is load-bearing rather than cosmetic (FR-2 interpolates identifiers into the header pattern, so the charset is what keeps a configured axis from altering the pattern's meaning), a 2–10 axis-count bound, and a `deepMerge` rule so `axes` and `weights` replace the defaults wholesale instead of an adopter inheriting weights for axes they never declared. **FR-2** builds the header pattern *from* config rather than a literal, and **dimensions become `[1-5]`** — the previous "each dim a single digit" admitted 0 and 6–9, so `9/9/9/9/9` recomputed consistently and passed. A header whose axis list disagrees with the config now fails as malformed rather than reading as a missing header. **FR-6** is corrected: it said "`null` id with no header → fails", contradicting FR-2's remediation and the existing `content-templates.test.ts`, which lints the header-less shipped template and asserts zero issues. **FR-10** repairs the placeholder that declares the axes — `{{VALUE_AXES_TABLE}}` is unregistered in `PLACEHOLDERS.md`, `content-placeholders.test.ts` walks only `prompts/` and `templates/` so `practices/templates/` was never covered, and nothing substitutes the token, so `gate init --practices` writes it literally into an adopter's bootstrap; the fix registers the token, widens the walk, and renders a default table naming the config key, while leaving installer substitution explicitly out of scope. **FR-13** now exports `isRootRelativeFilename` by name, because PRD-023 FR-3 consumes it and "one predicate for two sections" is only true if one is exposed. **FR-12** replaces W9's two independent greps — satisfiable by two different files — with one semantic assertion over a single changeset entry. **Rollback** now removes FR-2's `lintPrd` call; the earlier text called `value-score.ts` "uncalled", which it would not be |
| 2026-07-25 | Claude Opus 5, via owner | **Readiness iteration 7 remediation (W13–W21). The blocking fix came from the source snapshot rather than from a judgement call.** `verify-prd-ready.mjs:280-306` already implements this gate and its comment states the design — *"Presence-triggered: only PRDs carrying a `**V-Skor:**` line are checked, so pre-triage PRDs are never retro-failed."* `validateVScore` takes no PRD number and has no cutoff guard; the snapshot's `ENFORCE_FROM_PRD = 248` is a separate repo-local constant for other checks, and its PRD template carries no value header. The earlier `enforceFrom: 1` default fused those two mechanisms and produced W13: the shipped `templates/prd-template.md` emits no `Value:` line, so an adopter's first `gate check` would fail on a header nothing asked for. **FR-1 now ships `enforceFrom` absent (presence-triggered) and FR-4's `17` becomes this repo's opt-in**; adding the line to the shipped template is refused as fabricated method content and moved to Non-Goals with the reason. **FR-2 gains the header grammar** (W14) — the specified bare form `Value: T (…)` matched zero files against the real `> **Value**: T (…)`, so the snapshot regex is ported with the colon-outside-bold adjustment, plus a stated rule for the declared total's own decimal form and a recorded divergence from the snapshot's 0.005 tolerance. **FR-9 pins the AGENT_BOOTSTRAP weight table to `DEFAULT_CONFIG` in `content-canon.test.ts`** (W15) rather than shipping the prose duplicate the relocation claimed to remove. Overlap list rebuilt from `gate queue` and now carries PRD-023 (five files) and the active PRD-017 lease (five surfaces), the latter added to Dependencies with the note that FR-1 extends a config surface PRD-017 is mid-flight on (W16, W17). FR-13(b) states the two `readyOverlaps` weaknesses it does **not** fix and why the enforcing path is where it matters (W18). Cross-reference drift fixed: FR-11 → FR-12, FR-6 → FR-7, §9 Q3's deleted parity test, W1–W7 → W1–W21 (W19). Stale corpus counts and the "`_state/locks` is empty" claim removed rather than re-measured, since both went stale within a day (W20). The self-expiring "until the root gates manifest exists" DO NOT replaced with the unconditional reduction (W21). Value re-scored 3.65 → 4.10 per iteration 7. **Written by the same session that scored iteration 7 — the next round must be independent of it** |
| 2026-07-25 | Claude Opus 5, via owner | Sequencing and overlap-list corrections only — no FR, Target, dependency, or verification command changed, and no Conflict Surface path was added or removed. Two fixes, both measured with `gate queue`: the wave-order sentence now says the chain is a valid serialization rather than a required one (PRD-020 overlaps PRD-019 alone, so it may run concurrently with this PRD; PRD-021 ∥ PRD-022 stays forbidden on `cli.ts`), and the "three overlaps" claim now names the fourth it omitted — `PRD-021 <-> PRD-023` on five files. Readiness iteration 7 (ITERATE 7.30) is recorded separately in `_readiness/wip/readiness-021-governance-truth-up.md`; W13–W21 there are unaddressed by this edit |
| 2026-07-25 | Cursor, on owner direction | **Owner scope change — the value-score gate moves from `scripts/verify/` into the package.** The gate enforces a rule about PRDs, which are the method's own artifacts, while FR-1 was already putting `valueScoring` into the CLI config surface — so the previous split shipped adopters a config key with nothing that reads it, and left this repo a second weight table to keep agreed. FR-2 becomes `core/gates/value-score.ts` called from `lintPrd`, so `gate check PRD-NNN` enforces it at exactly the Phase 2 moment §11 already names; FR-3 becomes a `gate check --value-score` corpus sweep beside the existing `--wiring` branch. The relocation **removes** scope: the fallback table, `--print-weights`, and the parity test existed only to manage the duplication. It also **adds** three Conflict Surface overlaps (`cli.ts` with PRD-019 and PRD-022, `prd-ready.ts` and its test with PRD-018) and a new PRD-019 prerequisite, all declared rather than excused. `verify-doc-claims` stays a script — it governs this repo's files, not the method's. Cycle Phase returns to 2: the iteration-5 PASS and the 82-task plan are stale. Value not re-scored by the author |
| 2026-07-25 | Cursor | Readiness iteration 5 (ITERATE 7.78): W10 and W11 cleared. W12 caught FR-13 contradicting itself — "contains a `.`" accepts `e.g.` while the test list demanded prose tokens be rejected. FR-13(a) is now two literal regex shapes (named file, dotfile) that forbid a trailing dot, and the `Node.js`-shaped residual is accepted explicitly rather than left implied |
| 2026-07-25 | Cursor | Readiness iteration 4 (ITERATE 7.60): FR-13 as first written would not have fixed the defect it names. `findConflicts` only falls back to structural overlap when a surface materializes to zero tracked files, so two surfaces claiming the untracked `workflow.config.json` still would not collide after the parser fix (W11). FR-13 now has three required parts, and W10's rejection diagnostics get a named function and the two consumers that actually read the surface — `gate check` does not |
| 2026-07-25 | Cursor | Next-wave audit: `declaredGlobs` silently drops every Conflict Surface claim without a `/`, so this PRD's `workflow.config.json`/`AGENT_BOOTSTRAP.md`/`STATUS.md` claims and PRD-018's `workflow.config.json`/`gates.manifest.json` claims never reach a lease. Owner folded the fix in as FR-13 and assigned root-config creation to PRD-018, so FR-4 becomes an add-a-key step behind a new PRD-018 dependency and FR-5 narrows to the edit case (FR count 12 → 13) |
| 2026-07-25 | Cursor | Initial draft from the vision gap analysis (P0-3 and P2-7)                       |
| 2026-07-25 | Cursor | Owner resolved three Open Questions: exact equality, narrow doc-claims check, config-borne weights (FR count 6 → 8) |
| 2026-07-25 | Cursor | Readiness iteration 2 (ITERATE 7.50): lexical two-decimal validation replaces arithmetic (`Number.isInteger(0.29 * 100)` is false), the worktree control-artifact transition becomes a tested FR-5, FR-11 gets a direct banner assertion, and `changeset status` is replaced as evidence because it exits 0 on an empty `.changeset/` (FR count 11 → 12) |
| 2026-07-25 | Cursor | Readiness iteration 1 (ITERATE 4.43): prospective cutoff at PRD-017 for the 15 legacy PRDs, `valueScoring` specified as a real schema with two-decimal weights and integer-hundredths arithmetic, behavioral parity via `--print-weights`, doc-claims grammar and expiring allowlist, changeset/rollout/downgrade stated, token greps replaced by spawn tests (FR count 8 → 11); value re-scored 3.55 → 3.65 |
