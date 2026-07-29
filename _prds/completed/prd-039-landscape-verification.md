# PRD-039: Landscape Claims Verified, or Downgraded — the Launch Text's Evidence Gate

> **Status**: Archived — recorded cut 2026-07-29 (second failed expansion; owner decision)
>
> **Created**: 2026-07-28
> **Updated**: 2026-07-29
> **Author**: orchestrating session, for owner review (Faz E gap named in the 2026-07-28 portfolio review); first expansion on the owner's triage direction 2026-07-29; iteration-1 rework (second-expansion precision pass) same day, census machine-measured before authorship
> **Audience**: Implementing Agent
> **Slug**: `landscape-verification`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Autonomous Close**: operator-gated
> **Value**: 3.50 (MF/UI/TL/AR/RM: 3/3/4/5/3)

<!-- 0.25*3 + 0.25*3 + 0.20*4 + 0.15*5 + 0.15*3
     = 0.75 + 0.75 + 0.80 + 0.75 + 0.45 = 3.50 -->

<!-- Value history: born 3.15 (3/3/3/5/2), below the 3.40 threshold, deliberately not
     rounded up (the first draft's 3.30 was refused by the arithmetic gate). Owner
     chose EXPAND on 2026-07-29; the first expansion claimed 3.50 (TL 4, RM 3) and
     iteration 1 REFUSED both movements (4.88 ITERATE, push-path hard cap tripped by
     the naive dry-run design) → back to 3.15. This rework re-argues the same two
     movements on NEW grounds, the refusal grounds having been removed:
     TL 3→4 — iteration 1 refused TL 4 because "FR-6 is not yet a proven release
     path; its security model and verification are deficient" and the roadmap bullet
     names only the evidence rule. The rework answers the first ground directly:
     FR-6 is now capability-isolated (separate job, contents:read, no id-token,
     persist-credentials:false, no secrets) and pinned by a fail-closed workflow
     contract check with planted deny mutations (FR-6b). On the second ground: the
     TL axis reads "unlocks or de-risks later roadmap work" — it does not require
     the roadmap to have named the work. A contract-pinned release pipeline plus a
     machine-gated claims lint de-risk Faz E launch on both of its failure axes
     (false claims in launch text; an unproven publish path on launch day), and the
     gate now also covers the ▲ class (unsourced) the roadmap bullet missed.
     RM 2→3 — iteration 1 refused RM 3 because "a release workflow plus launch
     runbook are standing operational surfaces" and "FR-6 adds security and
     compatibility risk". The rework removes the risk half: the workflow contract
     check pins every invariant (trigger set, default, permissions, credentials,
     secrets absence, false-mode compatibility) with deny mutations, so the standing
     surface cannot drift silently; the runbook is linted; decay stays reader-faced
     (FR-4's rule is now decided, not deferred). What remains standing is research
     decay — real, dated, and the reason RM is not 4. The scorer rules on both
     movements at iteration 2; if either is refused again, this is the protocol's
     second failed expansion and the recorded-cut decision returns to the owner. -->

---

## 1. Introduction / Overview

The competitor landscape
(`docs/research/provegate-bootstrap/competitor-landscape-agentic-workflows-2026-07-22.md`)
carries three confidence marks (its own legend, line 6): ✅ adversarially verified
(3-0/2-1 votes), ◐ *sourced but unverified* (blog/README inference), and ▲ *model
training knowledge, unsourced* — strictly weaker than ◐. The roadmap's Faz E bullet
(`oss-extraction-roadmap-2026-07-22.md:83-84`) gates launch on the unverified class:
**no ◐ cell enters launch text before primary-document confirmation**, citing the
landscape's own §6 research-handoff questions — #1 (mainstream gate mechanics need
primary-document verification; the matrix's ◐ cells exist because blog-sourced claims
failed the adversarial threshold) and #2 (Taskmaster / swarm-protocol / **Clash**
produced no claims in any source; a separate mini-survey is required). This PRD
discharges those two landscape questions; the roadmap §4 "açık kararlar" list is a
different list (its #1 is naming/branding) and is NOT touched here — the first draft
misattributed the referent and wrote "Cline", a tool that appears nowhere in the
research corpus; both errors are corrected in this revision.

### The measured census (2026-07-29, exact partition)

- **85 ◐ glyphs** in the document total (`grep -o`-counted; `grep -c` reports 22 —
  that is a *line* count and is not the census).
- **79 glyphs sit inside the 20-row comparison matrix** (lines 38–57), spread over
  **16 of the 20 tool rows**; the 4 ◐-free rows are Taskmaster (entirely ▲),
  agent-gates, multi-model-review (both fully adversarially scored), and Emofy (ours).
- **6 glyphs sit outside the matrix**: the legend's own definition (line 6) and five
  prose self-references (lines 123, 131, 178, 188, 200) — mark *mentions*, not cells;
  out of scope.
- **21 ▲ glyphs**, concentrated in the Taskmaster row (all eight dimension cells) and
  the Aider row. An unsourced cell cited by launch text is strictly worse than a
  sourced-unverified one, so **this PRD's gate covers ▲ exactly as it covers ◐** — a
  deliberate widening of the roadmap bullet's letter to its evident intent.
- **A cell** is (tool row × column) — one cell can carry several glyphs (Spec Kit's
  Workflow cell carries a ◐ on the shape claim and `[MULTI]` sourcing marks). The
  verification unit is the cell, identified as `<tool-slug>.<column>` (e.g.
  `spec-kit.G`, `kiro.Olgunluk`); FR-1's ledger fixes the identity scheme.
- **The launch-cited subset, measured by the FR-2 discovery grep (run 2026-07-29, no
  longer deferred to Phase 4):** `_docs/launch/announcement-draft.md:61` (one Spec Kit
  comparison) and `apps/docs/content/docs/whitepaper.mdx:89,100,104,320,324`
  (spec-driven quartet, the three review prototypes *with GitHub star counts*,
  agent-gates' dormancy claim, the complementarity passages, Vector V1).
  `apps/web/app/sections/content.ts` carries **zero** competitor claims (measured) and
  leaves the scope; `packages/provegate/README.md:147` mentions "Cursor/Codex
  adapters" — our own adapter surfaces, not comparison claims; excluded with this
  reason.

This PRD runs the verification: every ◐/▲ cell in a launch-cited row either gets
confirmed against a primary document (the vendor's own docs/repo/changelog, cited with
a dated URL) and promoted to ✅, or **downgraded/removed** — and the launch surfaces
are swept so no claim rests on a cell that failed its check. The claims lint binds
every surviving competitor claim to its ledger row, so a future landscape or
launch-text edit cannot reintroduce an unsourced comparison.

**Research decays.** Every verified cell carries its verification date; the table
header states the revalidation rule (stale after a named interval or a major vendor
release) — a ✅ from July is not a ✅ forever, and the table says so.

**The first expansion (2026-07-29, owner-directed).** The launch text's evidence gate
is one half of what launch day actually needs; the other half is the path the text
travels: a launch runbook that does not exist, and a Release workflow whose publish
path has never produced pre-launch evidence of working. This PRD absorbs both
adjacencies the original triage note named. FR-5 creates `_docs/launch/runbook.md` —
the ordered launch-day procedure where every step names its machine- or
operator-checkable evidence — and puts the runbook itself under the do-not-say lint
(it is launch surface: a checklist that quotes a banned claim shape ships that shape).
FR-6 gives `.github/workflows/release.yml` a human-dispatched dry-run path that is
**capability-isolated, not merely token-less** — iteration 1 proved token omission
alone is a false guard: the release job's `id-token: write` enables npm OIDC trusted
publishing without any `NODE_AUTH_TOKEN`, and `actions/checkout@v4` persists
authenticated git credentials by default. The dry path therefore runs in its own job
with `contents: read`, no `id-token`, `persist-credentials: false`, and no secrets —
and a fail-closed workflow contract check (FR-6b) pins every one of those invariants
with planted deny mutations, so the runbook's "release pipeline proven" step cites a
real run of a structurally-verified workflow.

---

## 2. Goals

### Primary Goals

- [ ] Zero ◐/▲ cells cited by any launch surface: each is verified-with-citation in
      the ledger or downgraded, and the two measured launch surfaces are swept
      against the outcome.
- [ ] The claims lint refuses an uncited competitor claim, an orphaned citation, and
      a claim resting on a downgraded or absent ledger row — each by file:line.
- [ ] Every verified cell is dated in the ledger and the matrix header carries the
      revalidation rule (decided: 90 days or a major vendor release).
- [ ] Launch day has a runbook: every step names its evidence source, enforced by a
      runbook-structure test, and the runbook passes the do-not-say lint.
- [ ] The release pipeline is proven before launch: the dry-run job is
      capability-isolated (contents:read, no id-token, persist-credentials:false, no
      secrets), the contract check pins it, and one dispatched dry-run completed.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| ◐/▲ glyphs in launch-cited matrix rows | 85 ◐ + 21 ▲ total; 79 ◐ in the matrix across 16 of 20 rows; launch-cited subset fixed by the recorded discovery (§1) | 0 in launch-cited rows (at zero, line-count and glyph-count coincide) | the updated matrix + the FR-1 ledger; each resolves to ✅-with-ledger-row or a downgrade |
| Launch-surface competitor claims without a ledger binding | 6 passages measured (§1) — none bound | 0 unbound | the FR-3 claims map + orphan scan, failing by file:line |
| Ledger rows without a primary URL + date | ledger does not exist | 0 | FR-3(b) predicate over the FR-1 ledger table |
| Launch-day steps without a named evidence source | no runbook exists | 0 | the FR-5 runbook-structure test |
| Release workflow invariants pinned by a check | 0 — the workflow has never been contract-tested | all (trigger set, dry_run default, per-job permissions, credentials, secrets absence, false-mode compatibility) | `pnpm verify:release-contract` + planted deny mutations |
| Pre-launch proof the Release pipeline ran | none | one dispatched dry-run recorded in the runbook | the workflow run URL, transcribed by the operator (workflow_dispatch is owner-only) |

---

## 3. User Stories

#### User Story 1

```
As a reader of the launch announcement,
I want every comparison to competitors to trace to their own documents,
so that the tool's honesty pitch is not undermined by its marketing.
```

**Acceptance Criteria:**

- [ ] The §6 criteria: citations on every surviving claim, lint rows guarding them.

#### User Story 2

```
As the owner deciding launch timing,
I want the Faz E launch gate discharged with a dated record,
so that the landscape's research-handoff questions #1 and #2 close with evidence
instead of expiring silently.
```

**Acceptance Criteria:**

- [ ] The landscape's §6 questions #1 (gate-mechanics primary-doc verification) and
      #2 (Taskmaster / swarm-protocol / Clash mini-survey) are answerable from the
      FR-1 ledger (the owner closes them; this PRD supplies the record). The
      roadmap's §4 "açık kararlar" list is untouched — different list, corrected
      misattribution.

---

## 4. Functional Requirements

1. **FR-1**: The verification pass and its ledger. The landscape document gains a new
   section `## 8. Doğrulama Sicili` — a table with columns
   `| Hücre | İddia | Birincil kaynak | Tarih | Sonuç |` where `Hücre` is the cell id
   `<tool-slug>.<column>` (slugs fixed here: `spec-kit`, `kiro`, `bmad`, `openspec`,
   `taskmaster`, `spec-kitty`, `gsd`, `tessl`, `aider`, `claude-code`, `cursor`,
   `devin`, `codex-cli`, `orchestrators`, `agent-gates`, `multi-model-review`,
   `adversarial-review`, `adverse`, `vector-v1`; columns `Workflow`, `G`, `T`, `A`,
   `P`, `O`, `E`, `Olgunluk`, `Lisans`), `Sonuç` ∈ {`verified`, `downgraded`,
   `removed`}. For each ◐/▲ cell in a **launch-cited row** (the §1 measured subset;
   widening to further rows is allowed, never required): locate the primary document
   (vendor docs, repository, changelog, license file), record the dated citation row,
   and update the matrix cell ◐/▲→✅ — or, where the primary document contradicts or
   cannot support the claim, rewrite the cell to what IS supported (or remove it),
   `Sonuç: downgraded/removed`, contradiction noted in the ledger row. The matrix
   header gains the FR-4 decay rule. Verification is reading, not scraping — no
   shipped code fetches anything.
   - **Targets:** `docs/research/provegate-bootstrap/competitor-landscape-agentic-workflows-2026-07-22.md`
2. **FR-2**: The launch-surface sweep, over the measured set. Exactly two files carry
   competitor claims (§1 discovery, recorded 2026-07-29):
   `_docs/launch/announcement-draft.md:61` and
   `apps/docs/content/docs/whitepaper.mdx:89,100,104,320,324` — including the GitHub
   star counts and dormancy claims at lines 100/104, which are `Olgunluk`-cell claims.
   Each passage is swept against FR-1's outcomes: a claim resting on a downgraded
   cell is corrected or cut (`a-rule-corrected-survives-where-it-is-restated`,
   applied to marketing). `apps/web/app/sections/content.ts` measured zero competitor
   claims and is OUT of scope; `packages/provegate/README.md:147` is our own adapter
   list, not a claim; both exclusions recorded here. If the sweep itself changes a
   whitepaper figure, the evidence-page do-not-say rules (figure tracing to the
   research source) bind the edit — the research source is updated by FR-1, so the
   trace stays intact.
   - **Targets:** `_docs/launch/announcement-draft.md`,
     `apps/docs/content/docs/whitepaper.mdx`
3. **FR-3**: The claims lint, fully specified. `verify:doc-claims` gains one new
   check block (same file, `scripts/verify/verify-doc-claims.mjs`, after the existing
   self-hosting and future-marker blocks) with this data model:
   (a) **claims map** — an exported const `COMPETITOR_CLAIMS`:
   `[{ file, anchor, cells }]` where `file` is repo-relative, `anchor` is a verbatim
   substring of the claim sentence (long enough to be unique in the file), and
   `cells` is a non-empty list of FR-1 cell ids. One entry per §1 passage.
   (b) **ledger parse** — the `## 8. Doğrulama Sicili` table is parsed into
   `cellId → {url, date, status}`; a row missing a `http(s)` URL or a `YYYY-MM-DD`
   date, or carrying an unknown status, fails by cell id (fail-closed on malformed
   rows — an unparseable row is an error, never skipped).
   (c) **claim → ledger** — every `COMPETITOR_CLAIMS` entry: `anchor` must occur in
   `file` (a reworded or deleted claim fails by file + anchor — the map is then
   updated deliberately, with the sweep), and every id in `cells` must resolve to a
   ledger row with `status: verified` (a downgraded/removed/absent row fails naming
   the file, the anchor, and the cell).
   (d) **orphan scan** — tool names are parsed from the matrix's first column
   (the `| **Name** |` rows — single source, never a duplicated name list); any line
   of the two FR-2 surfaces matching a tool name outside a mapped anchor fails by
   file:line. Word-boundary matching; the `Emofy`/ProveGate self-row is excluded.
   (e) **deny suite** — new package test
   `packages/provegate/test/competitor-claims.test.ts` runs the PRODUCTION script
   against fixture roots (the `doc-claims-script.test.ts` cpSync pattern): planted
   mutations each failing by name from its own independent cause — missing anchor
   (reworded claim), unmapped competitor line (orphan), cell absent from ledger,
   ledger row downgraded, ledger row missing URL/date, malformed ledger row, and a
   template-placeholder anchor that matches only a scaffold file — the
   `evidence-pattern-satisfied-by-the-template` shape — asserted to FAIL, not pass;
   plus the migrated corpus as positive control.
   - **Targets:** `scripts/verify/verify-doc-claims.mjs::COMPETITOR_CLAIMS`,
     `packages/provegate/test/competitor-claims.test.ts` (new)
4. **FR-4**: The decay rule, decided. The matrix header states: **a ledger row is
   stale 90 days after its `Tarih`, or on a major release of the row's vendor,
   whichever comes first; staleness is the reader's signal to re-verify, never a lint
   failure.** This is the rule, not a proposal — the owner's Phase-3 approval of this
   PRD approves it (no decision is deferred into implementation). Every ✅ traces to
   its dated ledger row (FR-3(b) enforces URL + date presence). An expired date stays
   a reader judgment (`known-red-ledger-must-expire`'s lesson applied as reader-facing
   dating, not as a gate; the distinction is stated so nobody later "fixes" it into a
   red build over a vendor's release calendar — FR-3 checks row *shape*, never row
   *age*).
   - **Targets:** `docs/research/provegate-bootstrap/competitor-landscape-agentic-workflows-2026-07-22.md`
5. **FR-5**: The launch runbook, with an enforced structure. New
   `_docs/launch/runbook.md`: the ordered launch-day procedure — announcement voice
   pass (owner), full verification sweep, Release dry-run evidence (FR-6's run URL),
   version-commit landing, owner push, Release dispatch (`dry_run=false`),
   post-publish verification (npm listing + provenance badge,
   `npm view provegate version`), announcement publication. **Structure grammar,
   machine-checked:** every step is a `### Adım N —` heading whose body contains
   exactly one `Evidence:` line of one of three shapes — a backticked runnable
   command, a backticked `verify:*`/`pnpm` lint name, or `operator: <artifact>`
   (URL + date at execution time). New test
   `packages/provegate/test/launch-runbook.test.ts` parses the runbook and fails
   naming the step on: a step with no `Evidence:` line, an `Evidence:` line matching
   none of the three shapes, and a missing runbook file (its own independent cause —
   `existsSync` first, so absence never vacuously passes). The runbook also joins
   `SELF_COPY_PAGES` in the do-not-say lint
   (`packages/provegate/test/content-launch.test.ts`, one array entry). It
   duplicates no RELEASING.md content — it SEQUENCES launch day and links to
   RELEASING.md for the mechanics (`docs-are-a-wiring-surface`: steps bind to
   checks, not prose promises).
   - **Targets:** `_docs/launch/runbook.md` (new),
     `packages/provegate/test/launch-runbook.test.ts` (new),
     `packages/provegate/test/content-launch.test.ts::SELF_COPY_PAGES`
6. **FR-6**: Release dry-run, capability-isolated and contract-pinned.
   **(a) The workflow.** `.github/workflows/release.yml` gains a `dry_run` boolean
   `workflow_dispatch` input, **default `true`** (a thoughtless dispatch publishes
   nothing), and splits into two jobs:
   - `dry-run` job — `if: inputs.dry_run == true`. Job-level
     `permissions: contents: read` and **no `id-token`** (npm OIDC trusted
     publishing is impossible from this job); `actions/checkout@v4` with
     `persist-credentials: false` (no authenticated git remains on disk); **no
     `secrets.*` reference and no `env:` carrying one on any step**; steps: install
     → the same verify sweep → `pnpm --filter provegate pack` (pack runs ONLY here —
     the publish job's command sequence stays byte-identical to today's).
   - `release` job — `if: inputs.dry_run == false`. Today's steps verbatim, with
     today's `contents: write` + `id-token: write` moved from workflow level to this
     job only. The trigger set remains exactly `workflow_dispatch` (RELEASING.md's
     Never list binds; no schedule, no push trigger, ever).
   The guard is capability omission, not a conditional: the dry job cannot publish
   or push because the permissions, token, and credentials are structurally absent
   from it (`push-is-human-by-omission` applied for real this time — iteration 1
   proved the token-only version false).
   **(b) The contract check.** New repo-class script
   `scripts/verify/verify-release-contract.mjs` (ADR-0004: it reads this repo's
   `.github/workflows/release.yml` — repo stack, never shipped), structural
   line-level parse (no YAML dependency added anywhere), all fail-closed: trigger
   set is exactly `workflow_dispatch`; the `dry_run` input exists, is boolean,
   defaults true; both jobs carry an explicit `if:` on the input with opposite
   polarity; no workflow-level `permissions` block remains; the dry job's
   permissions are exactly `contents: read` with no `id-token` key; its checkout
   carries `persist-credentials: false`; no dry-job line references `secrets.`; the
   publish command appears only in the release job. Wired fully
   (`gate-wire-or-delete`): `verify:release-contract` alias in root `package.json`,
   `CHECKS` bundle row in `scripts/verify/verify-workflow.mjs`, repo-class row in
   `scripts/verify/script-classes.json`, matching ADR-0004 Classification table row
   (the class gate diffs both directions). Deny suite: new
   `packages/provegate/test/release-contract.test.ts` runs the PRODUCTION script
   with a target-root argument against fixture workflow copies, each planted breach
   failing by name from its own cause — an extra trigger, a missing/false `dry_run`
   default, `id-token` present in the dry job, a `secrets.` reference on a dry
   step, `persist-credentials` absent, the publish command in the dry job — plus
   the real workflow as positive control.
   **(c) The evidence.** The runbook's "pipeline proven" step cites one completed
   dry-run's URL, transcribed by the operator who dispatched it (workflow_dispatch
   is owner-only; supplemental runtime evidence on top of (b)'s structural proof,
   never a substitute).
   - **Targets:** `.github/workflows/release.yml`,
     `scripts/verify/verify-release-contract.mjs` (new),
     `scripts/verify/verify-workflow.mjs`, `scripts/verify/script-classes.json`,
     `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` (Classification table row),
     `package.json`, `packages/provegate/test/release-contract.test.ts` (new)

---

## 5. Non-Goals (Out of Scope)

- **New comparisons or new competitors.** Verification and downgrade only; widening
  the table is separate work.
- **The announcement's voice pass.** The owner's, after this lands.
- **Re-running the original adversarial panels.** The ✅ cells stand on their recorded
  votes; only ◐ cells are in scope.
- **A web scraper or any network automation.** Verification is a human-plus-agent
  reading task at Phase 4; nothing shipped here fetches anything
  (`check-egress` unchanged).
- **Executing any release.** FR-6 adds a dry path and evidence; dispatching either
  mode is the owner's act, never this PRD's. No real publish happens inside this
  PRD's phases, and the dry-run's completion is operator-transcribed evidence, not a
  CI gate this repo's checks depend on.
- **Rewriting RELEASING.md.** The runbook sequences and links; the release mechanics
  document stays canonical.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** the updated landscape matrix, **When** its launch-cited rows are read,
  **Then** no ◐/▲ remains in them, and each former mark resolves to a
  `verified` ledger row (URL + date) or a `downgraded`/`removed` row with the
  contradiction noted.
- **Given** a launch-surface claim about a competitor, **When**
  `pnpm verify:doc-claims` runs, **Then** the claim is bound through
  `COMPETITOR_CLAIMS` to `verified` ledger rows, or the lint fails naming file,
  anchor, and cell.
- **Given** a downgraded cell, a reworded claim, an unmapped competitor mention, a
  malformed ledger row, or a template-only anchor (planted mutations), **When** the
  claims deny suite runs, **Then** each fails by name from its own independent cause,
  and the real corpus passes as positive control.
- **Given** the matrix header, **Then** it carries the decided revalidation rule
  (90 days or a major vendor release) — and no lint anywhere turns row age into a
  failure.
- **Given** the runbook, **When** `launch-runbook.test.ts` and the do-not-say lint
  run, **Then** every `### Adım` carries exactly one well-shaped `Evidence:` line,
  the file is in `SELF_COPY_PAGES`, and a missing runbook fails from its own cause.
- **Given** `.github/workflows/release.yml`, **When**
  `pnpm verify:release-contract` runs, **Then** every FR-6(b) invariant holds, and
  each planted breach fixture fails by name.
- **Given** a dispatch with `dry_run=true` (or defaulted), **Then** the dry job runs
  install/verify/pack with `contents: read`, no `id-token`, no persisted
  credentials, and no secret reference; **Given** `dry_run=false`, **Then** the
  release job runs today's command sequence byte-identically.

---

## 7. Technical Considerations

**Verification is reading, not scraping.** Primary documents are consulted by the
implementing agent/owner at Phase 4; the repository stores citations (URL + date +
the sentence-level claim each supports), never fetched content. Nothing in the product
gains a network path.

**The lint rows are string-anchored the honest way.** PRD-033's review recorded the
trap (`evidence-pattern-satisfied-by-the-template`): a row satisfied by the claim's own
filename proves nothing. Rows bind claim text to citation presence AND cell status.

**Rollout, atomic; rollback, exact reverse.** One commit carries: the ledger + matrix
updates + decay header (FR-1), the two-surface sweep (FR-2), the claims block + deny
test (FR-3), the runbook + its structure test + the `SELF_COPY_PAGES` entry (FR-5),
the two-job workflow + contract script + its full wiring (alias, `CHECKS` row,
`script-classes.json` row, ADR-0004 table row) + deny test (FR-6). Partial orderings
are red by construction (the class gate diffs the ledger/ADR both ways; the claims
lint fails on an anchor whose sweep has not landed). Rollback in reverse: (1) remove
both deny tests + the contract script + alias + `CHECKS` row + `script-classes.json`
row + ADR-0004 row (all six together — the class gate refuses partial subsets) + the
claims block + the `SELF_COPY_PAGES` entry; (2) delete the runbook; (3) revert
`release.yml` byte-for-byte to the publish-only shape; (4) revert the two swept
surfaces and the landscape document. After each step:
`pnpm verify:script-classes && pnpm verify:doc-claims && pnpm verify:workflow &&
pnpm test` green.

**The dry path is capability-isolated, not conditionally guarded.** Iteration 1
refuted the token-omission design: `id-token: write` enables npm OIDC trusted
publishing with no `NODE_AUTH_TOKEN` at all, and `actions/checkout@v4` persists
authenticated git credentials by default. FR-6(a) therefore removes the
*capabilities* from the dry job — `contents: read`, no `id-token` key,
`persist-credentials: false`, no `secrets.` reference — and FR-6(b) pins each of
those absences with a planted-breach deny suite. The trigger set stays
`workflow_dispatch`-only (RELEASING.md's Never list binds).

**Sequencing, re-measured 2026-07-29 (post-iteration-1).** `_state/locks/` is empty;
PRD-027, PRD-034, and PRD-038 are all Ship Verified — every earlier lease claim in
this document is deleted, not merely stale. Two live serialization facts remain:
(1) **contested surfaces with draft PRD-036** (Phase-1 ITERATE): its Conflict
Surface also names `packages/provegate/test/content-launch.test.ts`,
`scripts/verify/verify-workflow.mjs`, `scripts/verify/script-classes.json`, and
`_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` — all append/disjoint edits, but
whichever PRD goes active first owns them; re-run `gate queue` before Phase 3 and
serialize the loser behind the winner's close. (2) **`pnpm verify:doc-claims` is RED
on main**: `case-study.mdx` records `"shipVerified": 34` against a fresh derivation
of 35 — the PRD-037 sentinel gone stale again after PRD-038's close; that refresh
mechanism owns the fix, **this PRD's Phase 4 must not start until the aggregate is
green, and this PRD does not absorb the fix** (FR-3 appends to the same script, so a
red baseline would poison its positive control).

### Dependencies

- External red, explicitly serialized: the `verify:doc-claims` sentinel drift above —
  cleared upstream before Phase 4, not absorbed.
- Contested with draft PRD-036: the four shared wiring surfaces above — queue
  recheck at Phase 3, serialize on conflict.
- Owner: the landscape §6 questions #1–#2 are closed by the owner on the FR-1
  ledger — an operator-gated close row, which is why the header says operator-gated.
- Owner: the FR-6 dry-run dispatch itself (workflow_dispatch is owner-only) — its
  run URL is an operator-transcribed acceptance item, and launch day does not start
  until it exists.

---

## 8. Implementation Scope

### In Scope

- [ ] `docs/research/provegate-bootstrap/competitor-landscape-agentic-workflows-2026-07-22.md` — matrix cells, the `## 8` ledger, decay header
- [ ] `_docs/launch/announcement-draft.md` — line-61 claim swept (content only; voice untouched)
- [ ] `apps/docs/content/docs/whitepaper.mdx` — the five measured passages swept
- [ ] `scripts/verify/verify-doc-claims.mjs` — `COMPETITOR_CLAIMS` + ledger parse + orphan scan
- [ ] `packages/provegate/test/competitor-claims.test.ts` (new) — claims deny suite + positive control
- [ ] `_docs/launch/runbook.md` (new) — the launch-day sequence, evidence-per-step
- [ ] `packages/provegate/test/launch-runbook.test.ts` (new) — runbook-structure test
- [ ] `packages/provegate/test/content-launch.test.ts` — `SELF_COPY_PAGES` gains the
      runbook row (one array entry; no rule changes)
- [ ] `.github/workflows/release.yml` — two-job split, `dry_run` input, per-job permissions
- [ ] `scripts/verify/verify-release-contract.mjs` (new) — the workflow contract check
- [ ] `packages/provegate/test/release-contract.test.ts` (new) — contract deny suite
- [ ] `scripts/verify/verify-workflow.mjs` — `CHECKS` bundle row (contested with 036)
- [ ] `scripts/verify/script-classes.json` — repo-class row (contested with 036)
- [ ] `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md` — Classification table row (contested with 036)
- [ ] `package.json` — `verify:release-contract` alias

---

## 9. Open Questions

- (none)

---

## 10. References

- `docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md` Faz E + §4
  open decision #1 — the launch gate this discharges
- `docs/research/provegate-bootstrap/competitor-landscape-agentic-workflows-2026-07-22.md` — the table
- `docs/research/provegate-bootstrap/positioning-and-faq-2026-07-22.md` — the claims'
  strategic frame

---

## Memory Inputs

- applied: `a-rule-corrected-survives-where-it-is-restated` — FR-2 is this record as a
  requirement: a downgraded cell's claim is swept from every surface that restated it
  (both measured files), and FR-3(c)'s anchor check keeps it swept — a reworded or
  resurrected claim fails by file + anchor.
- applied: `evidence-pattern-satisfied-by-the-template` — FR-3(e) plants the record's
  exact failure shape as a deny fixture: a `COMPETITOR_CLAIMS` anchor that matches
  only a template/scaffold file is asserted to FAIL; the rows bind claim text to
  ledger presence AND `verified` status, so no filename or placeholder can satisfy
  them. (Iteration 1 refused the previous vague rationale; the fixture is now named.)
- reviewed: `docs-outlive-the-gate-they-promise` — reviewed, not applied: the
  record's precise class is a shipped check described as future work, which this PRD
  does not risk. Its adjacent lesson — text promising a guarantee must be wired to
  the check that makes it true — is inherited through FR-3's binding of launch
  claims to the ledger. (Downgraded from `applied`; iteration 1 correctly called the
  old rationale an analogy.)
- reviewed: `known-red-ledger-must-expire` — the decay rule is this lesson applied as
  reader-facing dating rather than a build gate; FR-4 is now decided (90 days /
  major release) and FR-3 checks row *shape* never row *age*, so a later editor
  cannot "fix" vendor calendars into red builds without contradicting the PRD text.
- applied: `docs-are-a-wiring-surface` — the runbook IS wiring, and FR-5 now
  enforces it structurally: every `### Adım` binds to a checkable `Evidence:` line
  (command, lint, or operator artifact), machine-parsed by
  `launch-runbook.test.ts`, and the runbook joins the linted launch surfaces.
- applied: `push-is-human-by-omission` — applied for real this time: iteration 1
  proved token omission alone is NOT capability omission (`id-token: write` enables
  OIDC publishing tokenlessly; checkout persists git credentials). FR-6(a) removes
  the capabilities themselves from the dry job — permissions, token key, persisted
  credentials, secret references — and FR-6(b) pins each absence with its own deny
  mutation. The trigger set stays `workflow_dispatch`-only.
- applied: `fixture-must-reach-production-shape` — both deny suites (FR-3(e),
  FR-6(b)) run the PRODUCTION scripts against fixture roots with a target-root
  argument, never a rewritten copy with cleaner plumbing — the exact defect class
  this record describes.
- reviewed: `assert-absent-needs-an-independent-cause` — its watch covers
  `packages/provegate/test/**`, which now holds three new test files. Every negative
  assertion in them has an independent cause: a missing runbook fails `existsSync`
  before any content check; each planted workflow breach is a distinct fixture
  mutating one invariant; each claims mutation fails from its own cause with the
  real corpus as paired positive control.
- reviewed: `quickstart-is-a-fixture` — its watch covers `QUICKSTART.md` and
  `quickstart.mdx`; the first expansion's wildcard docs target would have overlapped
  it, and iteration 1 flagged the missing disposition. The rework removes the
  overlap at the source: FR-2's measured set is exactly two files, neither of them
  quickstart surfaces (quickstart.mdx carries zero competitor claims, measured
  2026-07-29), and nothing here touches the tagged `qs:scenario` region.
- reviewed: `adr-section-blank-line-reads-empty` — its watch covers the ADR-0004
  target FR-6(b) appends to. The section anchor is fixed (PRD-035), but the record's
  live hazard binds the append: `pnpm format` reflows ADR frontmatter, so the
  implementing agent adds the one Classification table row without running prettier
  over the ADR file and verifies `pnpm verify:brain` and `pnpm verify:script-classes`
  green after the edit.

---

## Memory Outputs

- none — the verification produces citations in the landscape document itself, which
  is their durable home; no `_brain` record is expected. If the verification uncovers
  a non-derivable process trap, appending with a rationale is the correct response.

---

## Conflict Surface

- `docs/research/provegate-bootstrap/competitor-landscape-agentic-workflows-2026-07-22.md`
- `_docs/launch/announcement-draft.md`
- `apps/docs/content/docs/whitepaper.mdx`
- `scripts/verify/verify-doc-claims.mjs`
- `scripts/verify/verify-release-contract.mjs`
- `scripts/verify/verify-workflow.mjs`
- `scripts/verify/script-classes.json`
- `_brain/adr/ADR-0004-method-rule-vs-repo-rule.md`
- `_docs/launch/runbook.md`
- `.github/workflows/release.yml`
- `packages/provegate/test/content-launch.test.ts`
- `packages/provegate/test/competitor-claims.test.ts`
- `packages/provegate/test/launch-runbook.test.ts`
- `packages/provegate/test/release-contract.test.ts`

> **Contested with draft PRD-036 (Phase-1 ITERATE), measured 2026-07-29 post-iteration-1:**
> `content-launch.test.ts`, `verify-workflow.mjs`, `script-classes.json`, and
> `ADR-0004` appear in both Conflict Surfaces — append/disjoint edits in each case,
> but whichever PRD goes active first owns them; re-run `gate queue` before Phase 3
> and serialize the loser behind the winner's close. All prior lease prose is
> deleted, not stale: `_state/locks/` is empty; PRD-027/034/038 are Ship Verified.
> `apps/web/app/sections/content.ts` left the surface entirely (zero competitor
> claims, measured).

---

## Durable Artifacts

- `none` — citations land in the landscape document; no `_brain` record expected
- `_docs/reviews/review-039-landscape-verification.md` — the independent Phase 6 artifact

---

## 11. Verification Commands

| FR   | Command / Check                    | Scope | Notes                                                                     |
| ---- | ---------------------------------- | ----- | -------------------------------------------------------------------------- |
| FR-1 | `grep -c "◐" docs/research/provegate-bootstrap/competitor-landscape-agentic-workflows-2026-07-22.md` | repo | line-count evidence, honestly labeled: baseline 22 lines / 85 glyphs (§1); in launch-cited rows the target is zero, where line-count and glyph-count coincide; the ledger shows dates/downgrades |
| FR-2 | `pnpm verify:doc-claims`           | repo  | both measured surfaces bound; no claim rests on a downgraded cell          |
| FR-3 | `pnpm verify:doc-claims`           | repo  | unbound claims, orphan mentions, malformed/absent ledger rows fail by name |
| FR-3 | `pnpm --filter provegate test test/competitor-claims.test.ts` | pkg | seven planted mutations fail from independent causes; corpus passes as positive control |
| FR-4 | `pnpm verify:doc-claims`           | repo  | ledger rows carry URL + date (shape, never age); the header carries the decided rule |
| FR-5 | `pnpm --filter provegate test test/launch-runbook.test.ts` | pkg | every step has one well-shaped `Evidence:` line; missing file fails from its own cause |
| FR-5 | `pnpm --filter provegate test test/content-launch.test.ts` | pkg | the runbook row is in `SELF_COPY_PAGES` and the file is clean under the lint |
| FR-6 | `pnpm verify:release-contract`     | repo  | every FR-6(b) invariant holds on the live workflow                          |
| FR-6 | `pnpm --filter provegate test test/release-contract.test.ts` | pkg | six planted workflow breaches fail by name; the real workflow is the positive control; the dispatched-run URL stays the operator's acceptance item |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm verify:workflow` — the repo bundle stays green with its new member (requires
  the upstream sentinel red cleared first — §7)
- `pnpm verify:script-classes` — ledger and ADR-0004 table agree in both directions

Before Phase 2 PASS, run: `gate check PRD-039`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT promote a ◐ or ▲ on a secondary source — primary documents only, dated.
- DO NOT soften a downgrade into weasel wording; the cell says what the source
  supports, or the claim goes.
- DO NOT add a fetch, scraper, or any network path anywhere.
- DO NOT convert the decay dates into a build gate — FR-4 states why; FR-3 checks
  ledger-row shape, never age.
- DO NOT edit the announcement's voice; claims only.
- DO NOT add any trigger besides `workflow_dispatch` to release.yml — dry-run mode
  included (RELEASING.md's Never list binds this PRD).
- DO NOT rely on a conditional where a capability can be absent: the dry job takes
  no `id-token`, no write permission, no persisted credentials, no `secrets.`
  reference — and the contract check pins each absence.
- DO NOT change the release job's command sequence — `dry_run=false` behavior is
  byte-identical to today's, asserted by the contract check.
- DO NOT add a YAML parsing dependency for the contract check — structural
  line-level parse; the root and package manifests gain nothing.
- DO NOT duplicate the tool-name list — the orphan scan parses names from the
  matrix's first column, single source.
- DO NOT land the `script-classes.json` row without the ADR-0004 table row (or
  either without the script) — the class gate diffs both directions.
- DO NOT duplicate RELEASING.md's mechanics into the runbook — sequence and link.
- DO NOT introduce `any`; no push path; `packages/provegate` runtime source
  untouched (the package-tree edits are three new test files plus one test-array
  entry).

---

## Changelog

| Date       | Author | Changes                                                                                                        |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| 2026-07-29 | owner decision, transcribed by Claude Fable 5 (039 session) | **RECORDED CUT — the expand-don't-delete rule's terminal action after two failed expansions.** Born 3.15 (below the 3.40 threshold, honestly scored). Expansion 1 (launch-runbook adjacencies) claimed 3.50; iteration 1 refused both axis movements and tripped the push-path hard cap (4.88 ITERATE). The precision rework re-claimed 3.50 on new grounds; iteration 2 cleared the hard cap and moved the band to iterate-in-place (6.43) but refused the movements again → 3.15 under threshold twice. The owner chose the protocol's recorded cut over a third precision round and over below-threshold acceptance. **The Faz E launch gate (landscape §6 questions #1–#2) REMAINS OPEN — the cut removes this vehicle, not the roadmap requirement.** Iteration 2's Missing Pieces section is the specification map for any narrow successor item (the readiness file survives in `_readiness/completed/`). Artifacts archived wip → completed. |
| 2026-07-29 | Claude Fable 5, applying iteration 1's findings (owner chose rework over cut) | **Iteration-1 rework — every finding closed by measurement or redesign.** Census re-founded on the exact partition (85 glyphs, 79 in the 20-row matrix across 16 rows, 21 ▲ now inside the gate, cell = row×column with a fixed id scheme); the FR-2 discovery grep RUN and recorded (two files exactly; `content.ts` measured zero and left scope; README:147 excluded with reason); the roadmap referent corrected (landscape §6 questions #1–#2; "Cline" was a corpus-absent fabrication — the research names **Clash**; roadmap §4 untouched); FR-3 fully specified (claims map + ledger parse + claim→ledger + matrix-derived orphan scan + seven-mutation deny suite incl. the template-anchor shape); FR-4 decided (90 days / major release — no deferred decision, Open Questions honestly empty); FR-5 gains the runbook-structure test; FR-6 redesigned after the push-path hard cap — capability-isolated two-job split (contents:read, no id-token, persist-credentials:false, no secrets on the dry path) + `verify:release-contract` with six planted breaches, fully wired (alias/CHECKS/ledger/ADR rows); stale lease prose deleted (locks empty; 027/034/038 Ship Verified); external `verify:doc-claims` red (34 vs 35) explicitly serialized, not absorbed; Memory Inputs corrected (two downgrades to reviewed with honest rationales, `fixture-must-reach-production-shape` + `quickstart-is-a-fixture` added); rollout/rollback made atomic/exact. Value re-argued at 3.50 on the new grounds (TL 4: capability-isolated + contract-pinned release path; RM 3: standing surfaces deny-suite-pinned; research decay keeps RM under 4) — the scorer rules at iteration 2; a second refusal is the second failed expansion and returns the recorded-cut decision to the owner. |
| 2026-07-29 | Claude Fable 5, on the owner's triage direction (expand chosen over accept-below-threshold) | **First expansion — the launch-runbook adjacencies absorbed, exactly as the original header named them.** FR-5: `_docs/launch/runbook.md` (new), the ordered launch-day procedure with a named evidence source per step, itself added to `SELF_COPY_PAGES` so the do-not-say lint covers it. FR-6: `release.yml` gains a `dry_run` workflow_dispatch input (default true), publish step skipped and `NODE_AUTH_TOKEN` absent on the dry path — trigger set unchanged, evidence is the operator-transcribed run URL. Baseline measured: 22 ◐ marks in the landscape table. Conflict Surface +3 (runbook, release.yml, content-launch.test.ts — the last contested with draft PRD-036, queue-recheck noted). Memory Inputs: `docs-are-a-wiring-surface` added as applied; `push-is-human-by-omission` upgraded not-applicable→applied (the token-omission guard). Value re-scored 3.15 → 3.50 (TL 3→4: both halves of the launch gate — evidence rule AND proven release path; RM 2→3: the absorbed surfaces are one-shot, the decay share shrinks and stays reader-faced). Axis movements argued in the header comment for the independent scorer to rule on. |
| 2026-07-28 | orchestrating session, for owner review | Drafted as the third of three Faz E launch items (portfolio-review outward-gap action), discharging the roadmap's ◐-cell launch gate. Scored HONESTLY at 3.15 — below the 3.40 threshold (first draft said 3.30; the value gate recomputed and refused) — with the triage options stated in the header comment: broaden (absorb the launch-runbook adjacencies) or owner-accept as a roadmap-mandated gate. Deliberately not rounded up. |
