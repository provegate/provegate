# PRD-021: Governance Truth-Up — Stale Wave-2 Claims and the Value-Score Recompute Gate

> **Status**: Approved
>
> **Created**: 2026-07-25
> **Updated**: 2026-07-25
> **Author**: Cursor, for owner review
> **Audience**: Implementing Agent
> **Slug**: `governance-truth-up`
> **Cycle Phase**: 2 (Readiness)
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
`templates/prd-template.md` emits no `Value:` line, no prompt asks for one, and the
shipped `AGENT_BOOTSTRAP.template.md` has no triage section, so an adopter's first
`gate check` would have failed on a header nothing told them to write. Adding that line
to the shipped template is not the fix either — the snapshot's template omits it, so
writing one would be fabricated method content under critical rule 4. The fix is to ship
the snapshot's behavior and keep the cutoff a local choice (FR-1, FR-4).

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

- [ ] `valueScoring.weights` in `workflow.config.json` resolves and is the single table
      the gate scores against — an adopter who sets it changes what `gate check` enforces.
- [ ] Weights that are non-finite, negative, more than two decimals, missing an axis, or
      that do not sum to exactly 1 are rejected with a named issue.

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
   `{ enforceFrom: number, weights: { MF, UI, TL, AR, RM: number } }`. Shape validation
   rejects unknown axes and non-numbers; semantic validation (`validateResolvedConfig`)
   requires all five axes present, each finite, `> 0`, expressed in at most two decimal
   places, summing to exactly 1 (compared in integer hundredths, never float equality),
   and `enforceFrom`, **when present**, a non-negative integer. The two-decimal test is
   **lexical, not arithmetic**: `String(weight)` must match
   `/^0(\.\d{1,2})?$|^1(\.0{1,2})?$/`, because
   JS number-to-string emits the shortest round-tripping form (`String(0.29) === "0.29"`)
   while `Number.isInteger(0.29 * 100)` is false and would reject a legal weight. Only
   after the lexical check passes is the value scaled with `Math.round(weight * 100)` into
   the integer hundredths used everywhere downstream. Accept fixtures must include 0.29
   and 0.58; reject fixtures must include 0.155 and 1e-7.

   **`enforceFrom` is optional and its shipped default is absent, not `1`.** Package
   defaults keep today's weights (.25/.25/.20/.15/.15) and **omit `enforceFrom`
   entirely**, which selects the presence-triggered mode FR-2 defines and the source
   snapshot ships (§1). An earlier draft defaulted it to `1` on the argument that "a fresh
   adopter has no legacy corpus, so the safe default is enforce everywhere" — that
   argument is wrong in the one direction that matters. The shipped
   `templates/prd-template.md` emits no `Value:` line, no shipped prompt asks for one, and
   `practices/templates/AGENT_BOOTSTRAP.template.md` carries no triage section, so
   `enforceFrom: 1` would fail an adopter's very first `gate check` for omitting something
   nothing had asked them to write. The type must therefore make absence expressible:
   `enforceFrom?: number`, absent ≠ 0. A configured `0` is legal and means the same as
   `1` (every id is ≥ both), but it is a deliberate opt-in rather than a default.

   Fixtures must include the adopter case directly: a config with `valueScoring` absent
   entirely, and a config with `valueScoring.weights` set but no `enforceFrom` — in both,
   a header-less PRD passes.
   - **Targets:** `packages/provegate/src/core/config/types.ts`,
     `packages/provegate/src/core/config/defaults.ts::DEFAULT_CONFIG`,
     `packages/provegate/src/core/config/validate.ts::validateConfig`,
     `packages/provegate/src/core/config/validate.ts::validateResolvedConfig`
2. **FR-2**: Add the recompute as a **package gate**, `core/gates/value-score.ts`, and
   call it from `lintPrd` so `gate check PRD-NNN` enforces it. Given the PRD body and its
   numeric id, it parses the value header, recomputes the total in **integer hundredths**
   (`Σ weightHundredths × dim`, dimensions being integers 1–5), and requires exact
   equality with the declared total. Because every configured weight is at most two
   decimals, every legal total is exactly representable — no tolerance band, no float
   compare. This is a deliberate strengthening of the snapshot, which compares with
   `Math.abs(stated - computed) > 0.005`; the tolerance exists there because its weights
   are unvalidated constants, and FR-1's two-decimal rule is what makes exactness sound
   here. Record it as a divergence, not an oversight.

   **The header grammar is part of this FR, because the obvious one matches nothing.**
   Every PRD in the corpus writes the header inside the metadata blockquote with bold
   delimiters and the colon *outside* them:

   ```
   > **Value**: 4.15 (MF/UI/TL/AR/RM: 4/4/4/5/4)
   ```

   A pattern written against the bare prose form `Value: T (…)` matches zero files. The
   snapshot's regex (`verify-prd-ready.mjs:292`) is the model to port, with two
   adjustments — it expects `**V-Skor:**` with the colon *inside* the bold run, and this
   repo's axis names differ. The accepted form is therefore: optional leading `>` and
   whitespace; `Value` with optional surrounding `**`; a colon that may sit inside or
   outside the bold run; the total; any non-`(` filler; then
   `(MF/UI/TL/AR/RM: a/b/c/d/e)` with each dim a single digit. Following the snapshot, do
   **not** anchor on the closing paren — trailing prose after the dims is legal. If more
   than one line matches, that is an error rather than a first-match-wins race.

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

   The id is a **parameter, not a re-parse**. `lintPrd(config, manifest, content)` gains a
   fourth argument carrying the record's `number`; `runCheck` already resolved the record
   via `findRecord` and has it. Deriving the id from the `# PRD-NNN:` heading inside the
   body would make the cutoff depend on a title string the lint does not otherwise trust.
   Existing callers that have no id pass `null`, which **skips the cutoff comparison and
   enforces the arithmetic unconditionally** — absence of an id must not become absence of
   a check.
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
   → passes; an at-cutoff PRD with no header → fails; `null` id with no header → fails.
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
   AGENT_BOOTSTRAP triage section additionally documents that the weights and the cutoff
   are configurable, with the default values named, and that the shipped default is
   presence-triggered while this repo opts in at PRD-017.

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
   - **Targets:** `packages/provegate/practices/brain/PROTOCOL.md`,
     `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`,
     `packages/provegate/practices/templates/STATUS.template.md`,
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
    checkout with no changesets at all. The gate is a grep for the `provegate` minor
    front-matter line and for the compatibility sentence in the note, both of which fail
    when the changeset is missing.
    - **Targets:** `.changeset/` (new entry)
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
- **One copy of the weight table.** `DEFAULT_CONFIG` supplies the defaults, the root
  `workflow.config.json` overrides them, and the gate reads whatever `lintPrd` was handed.
  Nothing else holds a weight. The earlier design accepted two copies — the script's
  fallback table and `DEFAULT_CONFIG` — and mitigated with a behavioral parity test; this
  design has nothing to pin, which is strictly stronger than a pinned duplicate.
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
- **Adopter migration: none, by construction.** With `enforceFrom` absent the gate is
  presence-triggered, so upgrading the CLI cannot fail a PRD that was passing before.
  This is the property that makes the release safe to ship ahead of any template change,
  and it is why FR-1 refuses the "enforce everywhere" default.
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
  branch, drop both `package.json` entries and the CI steps, and remove the `valueScoring`
  key. `core/gates/value-score.ts` may stay — uncalled, it changes nothing. The
  config-surface addition is additive and inert when unused, so a published version
  carrying it needs no data or artifact migration.
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
      `test/content-canon.test.ts`, `test/fixtures/value-score/**` (new)
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
- `packages/provegate/test/config-value-scoring.test.ts`
- `packages/provegate/test/doc-claims-script.test.ts`
- `packages/provegate/test/content-canon.test.ts`
- `packages/provegate/test/fixtures/value-score/**`
- `AGENT_BOOTSTRAP.md`
- `STATUS.md`
- `_brain/PROTOCOL.md`
- `packages/provegate/practices/brain/PROTOCOL.md`
- `packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md`
- `packages/provegate/practices/templates/STATUS.template.md`
- `docs/research/provegate-bootstrap/**`

**This PRD overlaps four others, and every overlap is claimed rather than excused.** The
list below is what `gate queue` reports on 2026-07-25 — not what this PRD believes, which
is the distinction that cost it a round:

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
measures PRD-020's Conflict Surface as intersecting PRD-019's and nothing else, so once
PRD-019 is Ship Verified PRD-020 may run **concurrently with this PRD**. What must stay
serialized is this PRD against PRD-022, which shares `packages/provegate/src/cli.ts`.

PRD-023 declares this PRD as a Ship-Verified prerequisite and runs last, so sequencing
resolves that pair from its side; PRD-017 is resolved by the 017 → 018 → 019 → 021 chain.

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Review artifact: `_docs/reviews/review-021-governance-truth-up.md`
- Learning: `_brain/learnings/docs-outlive-the-gate-they-promise.md` — the promise-vs-shipped
  gap is the recurring shape here (three of four wave-2 claims were already true); record
  it if the close confirms the pattern, otherwise downgrade this entry to `none` before
  Phase 4.

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR    | Command / Check                                                        | Scope | Notes                                                       |
| ----- | ------------------------------------------------------------------------ | ----- | ------------------------------------------------------------- |
| FR-1  | `pnpm --filter provegate test test/config-value-scoring.test.ts`          | pkg   | schema, defaults, merge, lexical two-decimal accept/reject, and enforceFrom absent by default |
| FR-2  | `pnpm --filter provegate test test/prd-ready.test.ts`                     | pkg   | the lint fails a wrong total; a null id still enforces the arithmetic |
| FR-3  | `pnpm --filter provegate test test/value-score.test.ts`                   | pkg   | built-CLI sweep names the failing PRD and skips the pre-cutoff one |
| FR-4  | `pnpm --filter provegate test test/config-value-scoring.test.ts`          | pkg   | resolved config deep-equals defaults except the cutoff         |
| FR-5  | `pnpm --filter provegate test test/config-value-scoring.test.ts`          | pkg   | pre-existing worktree refused before merge, accepted after     |
| FR-6  | `pnpm --filter provegate test test/value-score.test.ts`                   | pkg   | the arithmetic and cutoff matrix, including every failing fixture |
| FR-7  | `pnpm --filter provegate test test/doc-claims-script.test.ts`             | pkg   | positive, negative, and stale-allowlist cases                  |
| FR-8  | `pnpm verify:gates-wired`                                                 | repo  | both checks wired; the CI-only one is seen via CI step text    |
| FR-8  | `pnpm verify:workflow`                                                    | repo  | the bundle runs doc-claims; value-score is deliberately absent |
| FR-8  | `pnpm verify:value-score`                                                 | repo  | the built CLI sweeps the live corpus green (needs `pnpm build`) |
| FR-9  | `pnpm verify:doc-claims`                                                  | repo  | zero stale wave-2 claims about wired scripts                   |
| FR-9  | `pnpm --filter provegate test test/content-canon.test.ts`                 | pkg   | the AGENT_BOOTSTRAP triage table deep-equals DEFAULT_CONFIG    |
| FR-10 | `pnpm verify:pack-drift`                                                  | repo  | pack/live pairs reconciled, ledger updated                     |
| FR-11 | `pnpm --filter provegate test test/content-canon.test.ts`                 | pkg   | banner, canonical link, roadmap phase marks                    |
| FR-12 | `grep -rc "provegate': minor" .changeset`                                 | repo  | exits 1 when the minor changeset is missing                    |
| FR-12 | `grep -rc "upgrade the CLI before" .changeset`                            | repo  | the compatibility instruction is in the note                   |
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
- DO NOT write the header pattern against the bare form `Value: T (…)`. Every PRD in the
  corpus writes `> **Value**: T (…)` and the bare pattern matches nothing — port the
  snapshot's regex shape, adjusted for the colon sitting outside the bold run.
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
