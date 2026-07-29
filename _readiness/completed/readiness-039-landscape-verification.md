# Readiness Assessment: PRD-039 — Landscape Verification

> **Iteration 2 (Codex, independent) — 6.43/10, ITERATE, band 6–7.9 ("Good start —
> iterate on the identified gaps") — the push-path HARD CAP is CLEARED by the
> capability-isolated FR-6 redesign, and 4 of iteration 1's 11 findings closed
> outright (5, 6, 9 fully; 4 external-red sequencing accepted) with 7 partial. But
> both value movements are REFUSED AGAIN on new grounds (the "contract-pinned"
> claim outruns the six mutations; the claims corpus has unhandled mentions/aliases)
> → Value stays 3.15, below 3.40: **this is the protocol's second failed expansion —
> the recorded-cut decision returns to the owner.** Orchestration disclosure: the
> orchestrating session wrote the rework; Codex scored fresh, reproduced the census
> partition exactly by its own count (85/79/16/6/21/22), and the session re-verified
> the decisive new citations before transcribing (PRD-036's Conflict Surface now
> claims the `packages/provegate/test/**/*.ts` glob at its lines 539-543 — an
> iteration-6 change that post-dates this PRD's contest prose; whitepaper mentions
> at lines 96/290/331-340 outside the six mapped passages, confirming the
> orphan-scan positive-control defect). It authored no verdicts.

---

# PRD-039 Phase-2 Readiness — Iteration 2

**ITERATE — 6.43/10.** The push-path hard cap is cleared, but the PRD is not ready for Phase 3. Iteration-1 dispositions: **1 PARTIALLY CLOSED; 2 PARTIALLY CLOSED; 3 PARTIALLY CLOSED; 4 CLOSED; 5 CLOSED; 6 CLOSED; 7 PARTIALLY CLOSED; 8 PARTIALLY CLOSED; 9 CLOSED; 10 PARTIALLY CLOSED; 11 PARTIALLY CLOSED.** Execution reproduced 85 total ◐ glyphs, 79 in matrix lines 38–57 across 16 rows, six outside, 21 ▲ glyphs, the 22 matching-line baseline, the external `shipVerified` 34→35 failure, empty locks, green brain and wiring checks, and a clean direct `lintPrd` result. The exact CLI wrapper failed before lint with read-only `EPERM`.

## Quick Meta

| Field | Value |
| --- | --- |
| Score | 6.43/10 |
| Verdict | ITERATE |
| Iteration | 2 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit) | — |
| Scored by | OpenAI Codex, independent Phase-2 scorer |
| Self-scored | no |
| Date | 2026-07-29 |
| PRD Lint | passed with sandbox waiver — direct production `lintPrd` returned `{"ok":true,"issues":[]}`; CLI aborted on `_state/prds.json.*.tmp` write with `EPERM` |
| State Record | unchanged by read-only scoring — PRD-039 remains Draft at 4.88/ITERATE in `_state/prds.json:1412-1435` |

## Model Tier Recommendation

| Phase | Tier | Rationale |
| --- | --- | --- |
| Phase 4 (Execution) | Do not assign — fix PRD first | Score is below 8; the scorer requires another PRD iteration (`packages/provegate/prompts/phase-2-readiness-scorer.md:161-170`). |
| Phase 6 (Audit) | — | No implementation should enter audit while the research-handoff, claim-inventory, workflow-contract, and conflict-surface defects remain. |

## Findings

1. **[P1] Landscape question #2 is named correctly but cannot be discharged by the specified work.** The actual referents are confirmed: the roadmap names Taskmaster/Clash (`oss-extraction-roadmap-2026-07-22.md:83-84`), and landscape question #2 requires a separate Taskmaster/swarm-protocol/Clash survey (`competitor-landscape-agentic-workflows-2026-07-22.md:185-190`). Exact `Cline` search over the research/docs corpus returned no match. The Introduction, User Story 2, and Dependencies now cite questions #1–#2 correctly (`prd-039-landscape-verification.md:55-64,180-184,442-443`).

   The implementation does not follow through: FR-1 requires only cells in launch-cited rows and explicitly says widening is never required (`:198-200`). Clash and swarm-protocol have no matrix rows or cell slugs, while new competitors/comparisons are out of scope (`:339-340`). The References section still calls roadmap §4 decision #1 the launch gate (`:479-482`), although roadmap §4 item #1 is branding (`oss-extraction-roadmap-2026-07-22.md:106-110`). The Non-Goals section also says only ◐ cells are in scope despite the redesign covering ▲ (`prd-039-landscape-verification.md:342-343`).

   **Remedy:** either mandate and specify the separate mini-survey, including its artifact and non-cell ledger grammar, or stop claiming question #2 is closed. Correct §10 and the stale ◐-only restatement.

2. **[P1] The claimed six-passage inventory and FR-3 orphan scan cannot share a green positive control as written.** The expected discovery hits exist at announcement line 61 and whitepaper lines 89, 100, 104, 320, and 324. `content.ts` returned zero; `packages/provegate/README.md:147` is a self-adapter reference.

   The same grep also finds competitor names outside those six mapped passages: Claude Code at whitepaper line 96, Cursor/Codex at line 290, and exact matrix names throughout references at lines 331–340 (`apps/docs/content/docs/whitepaper.mdx:89-104,290,320-340`). FR-3 demands one map entry per recorded passage, then rejects any matching line outside a mapped anchor (`prd-039-landscape-verification.md:225-250`). No References exclusion or non-claim/self-reference grammar exists. Conversely, matrix-derived full names miss aliases such as announcement “Spec Kit” versus matrix “GitHub Spec Kit,” and English “orchestrators” versus matrix “Orkestratör kategorisi” (`competitor-landscape...md:38,51`).

   **Remedy:** define exact scan spans and semantic exclusions, record every surviving claim/mention disposition, and specify an alias model derived from repository data. Add live-corpus fixtures for references, self-adapter mentions, full names, and short aliases.

3. **[P1] The release contract pins capability isolation but not the promised behavior compatibility.** The six mutations cover extra triggers, default, dry-job OIDC, secrets, checkout credentials, and misplaced publish (`prd-039-landscape-verification.md:305-324`). They do not test:

   - removal or alteration of dry install/verify/pack;
   - an extra executable dry step;
   - reordering or alteration of the release job;
   - the promised byte-identical false-mode command sequence.

   Yet the acceptance criterion and value rationale claim those behaviors are contract-pinned (`:379-382`; header value rationale). The current baseline to preserve is concrete at `.github/workflows/release.yml:13-36`.

   **Remedy:** define the normalized job-span representation and expected release step sequence, then add mutations for omitted dry verification/pack, changed release commands/order, and unexpected steps. Keep the six capability mutations.

4. **[P1] PRD-036 overlap is understated.** PRD-036 claims `packages/provegate/test/**/*.ts` explicitly so every present and future package test is leased (`prd-036-frozen-snapshot-digest-gate.md:539-543`). PRD-039 therefore conflicts on all four named test files—`content-launch`, `competitor-claims`, `launch-runbook`, and `release-contract`—plus `verify-workflow.mjs`, `script-classes.json`, and ADR-0004 (`prd-039-landscape-verification.md:458-468,565-568`). Its coordination prose lists only four shared surfaces (`:570-573`).

   **Remedy:** disclose the entire test-tree glob overlap and serialize all seven shared paths behind whichever PRD becomes active first.

5. **[P1] FR-1’s §11 command remains non-evidence.** The command at `prd-039-landscape-verification.md:592` counts matching lines across the entire landscape. FR-1 requires zero only in launch-cited rows and permits every other row to remain unresolved (`:198-200`); six prose ◐ marks are expressly out of scope (`:73-75`). Therefore the command cannot reach zero under a conforming minimum implementation. Labeling it “line-count evidence” fixes the unit claim, not the scope defect.

   **Remedy:** verify the exact launch-cited cell-id set through the ledger/claims checker, or provide a command that selects only those rows and counts glyphs. Retain the global 22-line/85-glyph values only as baseline context.

6. **[P2] Duplicate/multi-claim ledger semantics remain undefined.** The table includes an `İddia` column, and a matrix cell can contain multiple claims, but FR-3 parses into a singular `cellId → {url,date,status}` object (`prd-039-landscape-verification.md:190-203,229-232`). It does not say whether duplicate cell IDs fail, overwrite, or represent multiple supporting claims and URLs.

   **Remedy:** either require exactly one ledger row per cell and define how multiple claims/sources are encoded, or parse `cellId → rows[]` with an explicit all-claims predicate and duplicate/multi-source mutations.

## What held up

- Census reproduced exactly:

  - `grep -o '◐' … | wc -l` → `85`
  - matrix lines 38–57 → `79`
  - outside matrix → `6`, at lines 6, 123, 131, 178, 188, 200
  - matrix rows containing ◐ → `16`
  - total ▲ → `21`
  - `grep -c '◐' …` → `22`

- The fixed slug list covers the matrix’s 19 competitor rows; the twentieth row is Emofy, explicitly excluded. The nine normalized columns map to the actual matrix columns, so existing competitor cell IDs are implementable (`competitor-landscape...md:36-57`; `prd-039...md:190-198`).
- FR-4 is decided: 90 days or a major vendor release, with age reader-facing rather than build-red (`prd-039...md:253-263`).
- FR-5 closes iteration-1 finding 5: `### Adım N —`, exactly one shaped `Evidence:` line, named negative cases, and `existsSync`-first missing-file failure are specified (`:264-285,373-375`).
- The dry job is genuinely capability-isolated in the proposed design: `contents: read`, no `id-token`, `persist-credentials: false`, no secret reference, with the privileged release job false-only (`:286-304`). No publish or Git push capability remains reachable from the dry path through an input/condition failure.
- Alias + `CHECKS` + `script-classes.json` + ADR-0004 is sufficient wiring in shape. Existing `gate check --wiring` returned “every gate is wired or excepted,” and `pnpm verify:script-classes` passed 13/13.
- The external red reproduced exactly: `pnpm verify:doc-claims` failed on committed `shipVerified: 34` versus derived `35`. Blocking Phase 4 until the upstream refresh turns green, without absorbing it, is acceptable (`prd-039...md:429-439`).
- Locks were empty. PRD-027, PRD-034, and PRD-038 are Ship Verified; PRD-036 is Draft/ITERATE (`_state/prds.json:968-1002,1227-1261,1301-1324,1375-1409`).
- All ten Memory Input slugs are indexed and active; `pnpm verify:brain` returned PASS. The two downgrades to `reviewed`, production-shaped fixture disposition, quickstart exclusion, push-capability rationale, and ADR formatting warning are individually defensible (`prd-039...md:489-541`). However, `a-rule-corrected-survives-where-it-is-restated` is not fully applied because §5 and §10 retain stale rules.
- Every FR has a runnable-shaped §11 row; no backticked command contains a pipe. Direct `lintPrd` returned no issues.
- `packages/provegate/package.json` has no runtime dependencies. No manifest directly depends on a YAML parser; existing transitive YAML packages in `pnpm-lock.yaml` come from the toolchain. The proposed contract explicitly adds no YAML dependency.
- Value arithmetic is correct: `0.25*3 + 0.25*3 + 0.20*4 + 0.15*5 + 0.15*3 = 3.50`.

## Analysis

### Technical Depth & Architecture

The new claims model fits `verify-doc-claims.mjs`’s existing `targetRoot`/reporter/top-level-block structure (`scripts/verify/verify-doc-claims.mjs:36-42,44-72,161-217`). Its current inventory and alias semantics are not closed, and its singular ledger map does not define multi-claim cells. The release security boundary is sound; the compatibility contract is incomplete.

### Edge Cases & Failure Modes

Unresolved cases are reference-section names, self-references, short aliases, localized matrix names, duplicate ledger cell IDs, multiple sources per cell, omitted dry steps, altered release order, and the unrepresented Clash/swarm-protocol survey.

### Maintainability & DX

The PRD introduces standing anchor maps, a ledger parser, an orphan scan, a runbook grammar, and a workflow parser. Mutation coverage is appropriate in direction but does not yet cover the highest-drift states claimed by the document.

### Migration & Rollback

The atomic rollout and reverse rollback are materially improved (`prd-039...md:397-410`). The external-red precondition is explicit. Rollback and compatibility remain weaker than claimed until the release-job baseline is structurally pinned and the full PRD-036 overlap is serialized.

## Scorecard

PRD Class: `feature`; weights are 15/20/25/20/10/10 (`phase-2-readiness-scorer.md:70-99`).

| # | Dimension | Weight | Score | Weighted | Notes |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Clarity | 15% | 6.5/10 | 0.975 | Mechanical Clarity gate passes, but question #2, orphan boundaries, ledger duplicates, and compatibility snapshots require invention. |
| 2 | Completeness | 20% | 5.5/10 | One claimed research handoff is unimplemented; the claim inventory and conflict inventory are incomplete. |
| 3 | Technical Depth | 25% | 6.0/10 | Substantial data/security design now exists, but claim coverage and release compatibility are not closed contracts. |
| 4 | Multi-Tenancy & Security | 20% | 8.0/10 | No tenant/auth surface. Dry execution is capability-isolated and the push hard cap is cleared. |
| 5 | Scope & Testability | 10% | 5.5/10 | Mutation suites are named, but FR-1 evidence cannot measure its target and key workflow/claim mutations are absent. |
| 6 | Migration & Rollback | 10% | 7.0/10 | Atomic rollout, reverse rollback, and upstream-red sequencing are defined; false-mode compatibility and complete serialization are not pinned. |
| **Total** | **Weighted** | **100%** |  | **6.43/10** | **ITERATE** |

Exact total: `0.975 + 1.10 + 1.50 + 1.60 + 0.55 + 0.70 = 6.425`.

## Hard Caps

- **Push-path cap: CLEARED.** The dry job has no Git write token, persisted checkout credentials, npm OIDC, or npm secret. The privileged job remains a human-only `workflow_dispatch` release path and adds no `git push` command (`AGENT_BOOTSTRAP.md:24-32,209-213`; `prd-039...md:286-304`).
- **Security route/query cap:** not applicable; no protected application route, endpoint, or query is touched.
- **Client/server contract cap:** not applicable; no new payload or schema boundary.
- **Lint cap:** cleared by written sandbox waiver and direct `lintPrd` pass. Exact CLI failure was `EPERM` on `_state/prds.json.46731.tmp`, before lint.
- **Runtime-dependency cap:** clear; no package runtime dependency is proposed.
- **Method-content cap:** not applicable; no shipped prompt/template/schema content is changed.
- **YAML dependency:** no new direct dependency is specified; the contract requires a structural line-level reader.

## Value Axis Ruling

Both proposed movements are **REFUSED on new grounds**.

- **TL 3→4: REFUSED.** Capability isolation removes the previous security objection, but the claimed “contract-pinned release pipeline” is not yet true: the check does not pin dry execution completeness or false-mode byte identity. The PRD also claims to discharge landscape question #2 without specifying the required survey.
- **RM 2→3: REFUSED.** The prior OIDC/Git-credential risk is removed. The new refusal ground is that the standing surfaces are not deny-suite-pinned as claimed: claim aliases/exclusions are undefined, and release-command drift is outside the six workflow mutations.

Result:

`0.25*3 + 0.25*3 + 0.20*3 + 0.15*5 + 0.15*2 = 3.15`

**Value total: 3.15 — below the 3.40 threshold.** This is the protocol’s **second failed expansion**. The recorded-cut decision returns to the owner; another automatic expansion is not justified (`AGENT_BOOTSTRAP.md:204-207`).

## Missing Pieces

1. Specify or remove the claimed Taskmaster/swarm-protocol/Clash question-#2 closure; sweep §5, §10, Dependencies, and acceptance language together.
2. Replace the six-passage assertion with a complete syntactic inventory: scan boundaries, exclusions, aliases, reference handling, and actual-corpus fixtures.
3. Decide ledger uniqueness and multiple-claim/source behavior, with matching malformed/duplicate mutations.
4. Extend the release contract to pin dry steps and the exact false-mode release sequence; add independent mutations.
5. Replace FR-1’s global line count with an exact launch-cited cell/ledger verification.
6. Disclose PRD-036’s entire package-test glob overlap and serialize all shared paths.
7. Re-run direct lint, `verify:brain`, `verify:doc-claims`, both deny suites, release-contract verification, wiring/classification checks, and the full floor after the upstream 34→35 refresh.
8. Return the failed second expansion to the owner for the recorded-cut decision.

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| --- | --- | --- | --- | --- |
| 1 | 2026-07-29 | 4.88 | ITERATE | False census, referent errors, unspecified claims lint, unsafe dry path, weak runbook evidence, stale scope/state, and both value movements refused. |
| 2 | 2026-07-29 | 6.43 | ITERATE | Census, isolation, FR-4, FR-5, external-red sequencing, lint, and most memory issues closed; research question #2, claim/orphan corpus, release compatibility contract, FR-1 evidence, conflict glob, and value threshold remain unresolved. |

## Verdict

**ITERATE — 6.43/10.** This is the 6–7.9 “Good start” band: correct the identified gaps and re-score (`phase-2-readiness-scorer.md:112-120`). The push-path hard cap no longer blocks the PRD, but the research handoff, claims checker, compatibility contract, verification evidence, and conflict serialization still prevent autonomous execution. PRD-039 must not proceed to Phase 3.

---


> **Iteration 1 (Codex, independent) — 4.88/10, ITERATE, band 4–5.9 ("Major rework
> needed. Return to Phase 1") — and the push-path HARD CAP is tripped by FR-6's
> dry-run design. Both value-axis movements (TL 3→4, RM 2→3) REFUSED → Value falls
> back to 3.15, below the 3.40 threshold: the first expansion failed its value
> re-score.** Orchestration disclosure: the orchestrating session wrote the
> 2026-07-29 expansion (FR-5/FR-6) on the owner's triage direction; Codex scored
> fresh in a read-only sandbox, executed the census/lint/verify commands itself, and
> the session re-verified the decisive citations before transcribing (85 ◐ glyphs vs
> 22 matching lines by direct count; the roadmap's "Taskmaster/Clash" wording at
> `oss-extraction-roadmap-2026-07-22.md:84`; `_state/locks/` empty — the 034/038
> leases released mid-session as both PRDs reached Ship Verified; `pnpm
> verify:doc-claims` red on `shipVerified` 34 vs 35). It authored no verdicts.

---

# Readiness Assessment: PRD-039 — Landscape Verification

**ITERATE — 4.88/10.** The census, legend, roadmap, launch lint, release workflow, memory records, leases/state, value arithmetic, and §11 rows were inspected. Execution returned: `grep -c "◐"` → `22` lines, but 85 glyph occurrences; direct `lintPrd` → `{"ok":true,"issues":[]}`; `verify:brain` → PASS; `pnpm verify:doc-claims` → FAIL (`shipVerified` 34 committed vs 35 derived). The exact CLI wrapper could not reach lint because the read-only sandbox rejected its `_state/prds.json.*.tmp` write with `EPERM`; the targeted Vitest command likewise could not create its temporary directory. The PRD fails on census semantics, roadmap identity, unspecified lint architecture, release capability isolation, verification adequacy, scope/conflict completeness, and value justification. The repository push-path hard cap applies.

## Quick Meta

| Field | Value |
| --- | --- |
| Score | 4.88/10 |
| Verdict | ITERATE |
| Iteration | 1 |
| Model Tier (Execution) | Do not assign — fix PRD first |
| Model Tier (Audit) | — |
| Scored by | OpenAI Codex, independent Phase-2 scorer |
| Self-scored | no |
| Date | 2026-07-29 |
| PRD Lint | passed with sandbox waiver — direct production-shaped `lintPrd` returned `{"ok":true,"issues":[]}`; exact CLI wrapper aborted before lint on read-only `EPERM` |
| State Record | pending — PRD-039 remains Draft with null readiness score/verdict (`_state/prds.json:1412-1435`) |

## Model Tier Recommendation

| Phase | Tier | Rationale |
| --- | --- | --- |
| Phase 4 (Execution) | Do not assign — fix PRD first | Scores below 8 must return to PRD work before assignment (`packages/provegate/prompts/phase-2-readiness-scorer.md:161-170`). |
| Phase 6 (Audit) | — | No implementation should enter audit while the release hard cap and executable-contract gaps remain. |

## Findings

1. **[P1] The “22 ◐ marks/cells” census is false.** `grep -c "◐" ...` returned 22 because `grep -c` counts matching lines. Counting occurrences returned 85 total glyphs, 79 within the main matrix. Several rows contain 5–9 marks each (`docs/research/provegate-bootstrap/competitor-landscape-agentic-workflows-2026-07-22.md:38-51`). The PRD labels 22 as marks/cells and uses it as the baseline and FR-1 metric (`_prds/wip/prd-039-landscape-verification.md:75-77,97-103,387`). The legend itself is correct: ✅ is adversarially verified; ◐ is sourced but unverified (`competitor-landscape-agentic-workflows-2026-07-22.md:6`).  
   **Remedy:** define a stable cell identity/inventory, distinguish lines, cells, and glyphs, record the exact launch-cited subset before readiness, and replace the line-count metric with a single-line command that counts the intended unit.

2. **[P1] The roadmap referents are wrong.** Faz E names Spec Kit/Kiro/BMAD plus a Taskmaster/**Clash** mini-survey (`oss-extraction-roadmap-2026-07-22.md:77-84`); PRD-039 repeatedly substitutes Taskmaster/**Cline** (`_prds/wip/prd-039-landscape-verification.md:43-51,138-145`). The roadmap’s §4 open decision #1 is “name + brand,” not competitor verification (`oss-extraction-roadmap-2026-07-22.md:106-110`). The relevant numbered open question is instead in the landscape document (`competitor-landscape-agentic-workflows-2026-07-22.md:185-190`). PRD-039 nevertheless claims it closes “the roadmap’s open-decision row #1” (`_prds/wip/prd-039-landscape-verification.md:274-279,306-312`).  
   **Remedy:** restore Clash or cite an owner-approved scope change to Cline; identify the actual landscape question and exact owner acceptance item; remove every false §4/open-decision reference.

3. **[P1] FR-3 leaves the implementing agent to invent the citation contract.** The current verifier scans six fixed governance documents (`scripts/verify/verify-doc-claims.mjs:74-84`), recognizes wired `verify:*` tokens plus a closed future-marker list (`verify-doc-claims.mjs:86-117`), and judges those line pairs (`verify-doc-claims.mjs:161-186`). It has no competitor-claim row grammar, launch-surface inventory, landscape-cell identity, citation parser, or status/date predicate. FR-3 merely says it “gains rows” and targets the whole file (`_prds/wip/prd-039-landscape-verification.md:156-160,243-252`).  
   **Remedy:** specify the exact symbol/data schema, concrete surface files, claim anchoring, landscape cell identifier, primary URL/date/✅ predicates, deleted-claim behavior, duplicate behavior, and mutation fixtures. Name the tests that prove missing claim, missing citation, downgraded cell, duplicate row, and template/filename false positives.

4. **[P1] The shared FR-2/3/4 verifier is already red for an undeclared prerequisite.** `pnpm verify:doc-claims` failed with `shipVerified` committed as 34 versus fresh 35. The stale region is visible at `apps/docs/content/docs/case-study.mdx:94-111`, and the verifier runs its check before the existing grammar (`scripts/verify/verify-doc-claims.mjs:44-71`). The PRD neither declares this prerequisite nor safely owns the generated-region refresh.  
   **Remedy:** require a green baseline before Phase 4 or explicitly include the generated case-study region and its canonical write/check process in Targets, Scope, Conflict Surface, rollout, and rollback.

5. **[P1] FR-5’s verification does not test its evidence-per-step requirement.** The existing `SELF_COPY_PAGES` contains the announcement but not the runbook (`packages/provegate/test/content-launch.test.ts:64-73`); adding the runbook is indeed one array entry. The test then proves only file existence and do-not-say cleanliness (`content-launch.test.ts:84-93`). Its mutation cases prove the existing banned-expression rules are non-vacuous (`content-launch.test.ts:95-123`), but nothing parses runbook steps or requires each to name a command, lint, or operator artifact. The PRD explicitly promises that stronger invariant (`_prds/wip/prd-039-landscape-verification.md:169-183,232-234`) while §11 maps FR-5 only to the existing test (`prd-039-landscape-verification.md:391`).  
   **Remedy:** add a named runbook-structure test with missing-evidence, malformed-artifact, and missing-file mutations; target its symbol and map it in §11.

6. **[P1] `NODE_AUTH_TOKEN` omission does not make the dry path capability-free.** The existing job grants `contents: write` and `id-token: write` to every step and uses `actions/checkout@v4` (`.github/workflows/release.yml:6-17`). Checkout v4 persists authenticated Git credentials by default, enabling later scripts to push; `persist-credentials: false` is the opt-out ([actions/checkout documentation](https://github.com/actions/checkout/blob/main/README.md)). npm trusted publishing can authenticate publication through OIDC using `id-token: write`, without `NODE_AUTH_TOKEN` ([npm trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/)). Thus the PRD’s claim that the secret “is simply not there” and publication is impossible even if other guards fail is false (`_prds/wip/prd-039-landscape-verification.md:257-262,333-337`).  
   **Remedy:** isolate `dry_run=true` in a separate job with `contents: read`, no `id-token: write`, `persist-credentials: false`, no secrets, and only install/verify/pack. Keep the privileged publish job behind an explicit false-input condition. Pin whether pack runs only in dry mode so `dry_run=false` preserves today’s command sequence.

7. **[P1] FR-6’s grep is theater; the operator URL cannot replace a structural deny test.** `grep -n "dry_run"` cannot prove the trigger set is exact, the default is boolean true, publish is false-only, pack is dry-only, credentials are absent, or permissions are isolated (`_prds/wip/prd-039-landscape-verification.md:383-392`). A completed run URL can show that one dispatch skipped a step, but cannot prove absence of Git credentials or OIDC publication capability. The current invariant is stronger: Release must remain dispatch-only (`RELEASING.md:3-5,47-51`).  
   **Remedy:** add a runnable static workflow-contract test covering all invariants and independent deny mutations. Retain the operator URL only as supplemental runtime evidence.

8. **[P1] FR-2’s targets are neither concrete nor legally writable under the declared Conflict Surface.** FR-2 targets `apps/docs/content/docs/*.mdx` and defers the exact passages to an unspecified Phase-4 grep (`_prds/wip/prd-039-landscape-verification.md:147-155`). `apps/web/app/sections/content.ts` and the docs files appear in Scope (`prd-039-landscape-verification.md:283-296`) but are omitted from the Conflict Surface (`prd-039-landscape-verification.md:357-372`). The repository contract requires stopping before touching out-of-scope files (`AGENT_BOOTSTRAP.md:47-67`).  
   **Remedy:** run and record the discovery now, replace the wildcard with exact files/symbols, and add every surviving target to Conflict Surface before Phase 3.

9. **[P1] FR-4 contains an unresolved design decision despite declaring no open questions.** The interval is “owner-set at Phase 3,” with 90 days merely proposed (`_prds/wip/prd-039-landscape-verification.md:161-167`), while Open Questions says none (`prd-039-landscape-verification.md:300-302`). An unspecified design decision is a stop-and-ask checkpoint (`AGENT_BOOTSTRAP.md:65-67`), and the Clarity gate requires Open Questions to be empty only when decisions are actually resolved (`phase-2-readiness-scorer.md:209-221`).  
   **Remedy:** fix the interval, release trigger definition, date format, owner, and stale-display semantics in the PRD now.

10. **[P1] The Memory Inputs do not survive adversarial review.** All seven named records are indexed and active, and `pnpm verify:brain` passed. However:

    - `push-is-human-by-omission` requires capability omission (`_brain/learnings/push-is-human-by-omission.md:13-22`); FR-6 retains Git write and OIDC capability, so its `applied` disposition is refused.
    - The wildcard docs target includes `apps/docs/content/docs/quickstart.mdx`, watched by active `quickstart-is-a-fixture` (`_brain/learnings/quickstart-is-a-fixture.md:8-12`; indexed at `_brain/INDEX.md:53-57`), but that record is absent.
    - `docs-outlive-the-gate-they-promise` concerns wired checks described as future work (`_brain/learnings/docs-outlive-the-gate-they-promise.md:14-26`); the PRD’s generic “sourced marketing” rationale is an analogy, not an application.
    - `evidence-pattern-satisfied-by-the-template` becomes applied only when FR-3 names a production-shaped/template negative fixture (`_brain/learnings/evidence-pattern-satisfied-by-the-template.md:37-46`); that fixture is currently unspecified.
    - The `assert-absent-needs-an-independent-cause` review is otherwise accurate: the target test has an independent missing-file assertion and planted positive violations (`content-launch.test.ts:84-111`).

    **Remedy:** isolate the release capabilities, narrow exact docs targets or disposition `quickstart-is-a-fixture`, and correct the two overstated `applied` rationales.

11. **[P2] The lease narrative is stale, although the PRD-036 overlap is real.** `_state/locks/` was empty when inspected. PRD-027 is already Ship Verified (`_state/prds.json:968-1002`), as are PRD-034 (`_state/prds.json:1227-1261`) and PRD-038 (`_state/prds.json:1375-1409`). PRD-036 remains Draft/ITERATE (`_state/prds.json:1301-1324`) and does claim `content-launch.test.ts` (`_prds/wip/prd-036-frozen-snapshot-digest-gate.md:517-555`).  
    **Remedy:** delete the active-lease/serialization claims for 027/034/038, retain the measured 036 conflict, and rerun queue/locks immediately before Phase 3.

## What held up

- The literal census command returns 22, exactly as reported; only its interpretation as marks/cells fails.
- The document’s ✅/◐ legend matches the PRD’s stated semantics (`competitor-landscape-agentic-workflows-2026-07-22.md:6`).
- Release currently has only `workflow_dispatch`, and `NODE_AUTH_TOKEN` is scoped to the publish step (`.github/workflows/release.yml:6-8,33-36`).
- Adding `_docs/launch/runbook.md` to `SELF_COPY_PAGES` is mechanically one array entry, and the existing do-not-say test contains non-vacuous deny cases (`content-launch.test.ts:64-73,95-111`).
- The PRD-036 same-file conflict is correctly disclosed.
- Every declared Memory Input names an indexed, active record; `pnpm verify:brain` returned PASS.
- The declared value arithmetic is correct: `0.25*3 + 0.25*3 + 0.20*4 + 0.15*5 + 0.15*3 = 3.50`, matching the repository weights (`AGENT_BOOTSTRAP.md:176-190`; `packages/provegate/src/core/config/defaults.ts:123-132`).
- Every FR has a §11 row, each command is single-line, root-runnable in shape, and none contains a pipe. The direct production `lintPrd` invocation returned zero issues.
- No client→server payload, protected route/query, runtime dependency, method prompt/template/schema change, telemetry, or product network path is introduced. `packages/provegate/package.json` contains only dev dependencies (`packages/provegate/package.json:60-67`).
- Plain revert is viable for the documentation and test-array portions. The operator run URL is acceptable supplemental evidence for one dispatched execution.

## Analysis

### 1. Technical Depth & Architecture

The documentation-only research path has no scale or tenant-data concern. The two architectural changes do: the citation lint lacks a state model, and the dry-run design fails capability isolation. Both require specification before implementation.

### 2. Edge Cases & Failure Modes

Uncovered cases include multiple ◐ marks per row/cell, renamed or deleted claims, duplicate citation mappings, stale dates, missing runbook evidence, OIDC publication without `NODE_AUTH_TOKEN`, persisted Git credentials, pack lifecycle side effects, omitted inputs, and false-mode behavior drift.

### 3. Maintainability & DX

The current wildcard discovery, stale coordination facts, and analogy-level Memory Inputs force implementer judgment. The citation mechanism needs a closed data grammar and named mutation suite, not prose about “rows.”

### 4. Migration & Rollback

Docs and array changes are revertible. Release rollback is not adequately specified until the dry and publish paths are capability-isolated and `dry_run=false` behavior is pinned by test. Deployment order must include the already-red self-hosting region.

### 5. Memory Inputs

Accepted: `a-rule-corrected-survives-where-it-is-restated`, `known-red-ledger-must-expire` as reviewed, `docs-are-a-wiring-surface`, and `assert-absent-needs-an-independent-cause` as reviewed. Conditional: `evidence-pattern-satisfied-by-the-template`. Refused as currently reasoned: `docs-outlive-the-gate-they-promise` and `push-is-human-by-omission`. Missing under the current wildcard target: `quickstart-is-a-fixture`.

## Scorecard

PRD Class: `feature`; weights are fixed by `phase-2-readiness-scorer.md:70-99`.

| # | Dimension | Weight | Score | Weighted | Notes |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Clarity | 15% | 6.0/10 | 0.90 | Structured FRs, but wildcard targets, an unspecified grep, undefined lint schema, and an owner-set Phase-3 decision fail autonomous executability. |
| 2 | Completeness | 20% | 5.5/10 | Roadmap identity, baseline-red dependency, runbook evidence test, and release invariant test are missing or wrong. |
| 3 | Technical Depth | 25% | 4.5/10 | Citation architecture is undefined; dry-run capability analysis is materially incorrect. |
| 4 | Multi-Tenancy & Security | 20% | 3.5/10 | No tenant data, but the publication/push credential boundary is not isolated. |
| 5 | Scope & Testability | 10% | 5.0/10 | All FRs have rows, but FR-1, FR-5, and FR-6 evidence is incomplete or theatrical. |
| 6 | Migration & Rollback | 10% | 5.5/10 | Revert is plausible, but false-mode compatibility, job isolation, and the current red prerequisite are unresolved. |
| **Total** | **Weighted** | **100%** |  | **4.88/10** | **ITERATE** |

Exact unrounded total: `0.90 + 1.10 + 1.125 + 0.70 + 0.50 + 0.55 = 4.875`.

Hard caps:

- **Push-path cap: tripped.** The proposed dry path retains authenticated Git write and npm OIDC capability while claiming enforcement by omission (`AGENT_BOOTSTRAP.md:209-213`).
- Security route/query cap: not applicable; no protected application route, endpoint, or query.
- Contract cap: not applicable; no client→server payload.
- Lint cap: cleared by written sandbox waiver and direct `lintPrd` pass.
- Runtime-dependency cap: clear.
- Method-content traceability cap: not applicable.

## Value Axis Ruling

The header arithmetic is correct at 3.50, but both challenged movements are refused.

- **TL 3→4: REFUSED.** The roadmap’s actual launch gate is primary-document verification before ◐ claims reach launch text (`oss-extraction-roadmap-2026-07-22.md:77-84`); it does not define a second release-pipeline half. FR-6 is also not yet a proven release path because its security model and verification are deficient.
- **RM 2→3: REFUSED.** Research decay remains standing maintenance, and a release workflow plus launch runbook are standing operational surfaces, not one-shot work. FR-6 adds security and compatibility risk rather than diluting it.

Resulting value:

`0.25*3 + 0.25*3 + 0.20*3 + 0.15*5 + 0.15*2 = 3.15`

**Value total: 3.15 — does not clear the 3.40 candidate threshold** (`AGENT_BOOTSTRAP.md:204-207`). This first expansion therefore failed its value re-score.

## Missing Pieces

1. Replace the 22-line census with an exact, reproducible cell inventory and record the concrete launch-cited subset.
2. Correct Clash/Cline and the roadmap/open-question identity; define the exact owner acceptance row and artifact.
3. Specify FR-3’s complete citation data model, concrete scan set, algorithms, symbols, diagnostics, and mutation suite.
4. Resolve the current `verify:doc-claims` self-hosting drift and declare the generated-region ownership/sequence.
5. Enumerate exact FR-2 files and symbols; add every target to Conflict Surface and correct stale lease claims.
6. Add an executable runbook-structure test proving evidence-per-step, with independent negative fixtures.
7. Split dry and publish jobs by capability; remove Git/OIDC/write credentials from dry execution; pin false-mode compatibility.
8. Replace FR-6’s grep with a static workflow contract/deny test. Keep the dispatched URL only as supplemental operator evidence.
9. Decide FR-4’s revalidation interval and trigger before Phase 3.
10. Correct Memory Input dispositions and add or eliminate the `quickstart-is-a-fixture` overlap.
11. Re-run direct lint, `pnpm verify:brain`, `pnpm verify:doc-claims`, the targeted tests, and the full floor in a writable environment.
12. Re-score value honestly. Under expand-don’t-delete, a further owner-directed expansion is required if the total remains below 3.40.

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| --- | --- | --- | --- | --- |
| 1 | 2026-07-29 | 4.88 | ITERATE | Initial independent score after first expansion; census, roadmap, lint architecture, dry-run safety, verification, scope, memory, and value movements refuted. |

## Project-Specific Checklist

- [x] Census command executed; semantic defect recorded.
- [x] ✅/◐ legend inspected.
- [x] Faz E and numbered open decisions inspected.
- [x] `SELF_COPY_PAGES`, file-existence test, and mutation cases inspected.
- [x] Release trigger, permissions, steps, secrets, and RELEASING “Never” list inspected.
- [x] Current `verify-doc-claims.mjs` grammar inspected and executed.
- [x] Locks, PRD state, and PRD-036 overlap inspected.
- [x] All declared Memory Inputs opened; `verify:brain` passed.
- [x] Value arithmetic recomputed; TL/RM ruled independently.
- [x] All six §11 rows audited for syntax and evidentiary value.
- [x] Runtime dependency, client/server contract, security, method-content, and push caps considered.
- [ ] Push/publication capability isolation specified.
- [ ] Every FR backed by honest runnable evidence.
- [ ] Value threshold cleared.

## Verdict

**ITERATE — 4.88/10.** The score lies in the 4–5.9 “Significant gaps” band, whose required action is major rework and return to Phase 1 (`packages/provegate/prompts/phase-2-readiness-scorer.md:112-120`). Independently, the release capability defect trips the repository push-path hard cap. PRD-039 must not proceed to Phase 3.
