# Readiness Assessment: PRD-027 — Landing Adoption Polish

> **Historical artifact note.** Iterations 2 and 3 assessed a subsequently lost revision. Iteration 4 assessed the rebuilt PRD. This iteration assesses the current 933-line remediation at commit `991d1dd`, independently and from disk.

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-027-landing-adoption-polish.md` |
| Score | 7.25/10 |
| Verdict | ITERATE — FR-9 lacks a deliverable client boundary, and the rebinding of real-unfurl verification leaves a live acceptance criterion behind an untracked future launch note |
| Iteration | 5 |
| Model Tier (Execution) | do not assign — score < 8 |
| Model Tier (Audit) | high, after remediation reaches PASS |
| Scored by | **GPT-5 (Codex via codex-cli 0.145.0) — fresh independent session; did not author the PRD or remediation** |
| Self-scored | **no** |
| Artifact state | current PRD assessed at `991d1dd`; iterations 2–3 remain historical |
| Date | 2026-07-28 |
| PRD Lint | **waived command failure, content green.** The required CLI reached only `_state/prds.json.14157.tmp` and failed with `EPERM`, the documented read-only-sandbox artifact. Direct read-only `lintPrd(loadConfig, loadManifest, PRD content, root, 27)` returned `{"ok":true,"issues":[]}`. The orchestrating session’s writable post-remediation run was also green on 2026-07-28 |
| State Record | not modified — analysis-only review |

<!-- Verdict values: PASS | ITERATE | REJECT. Keep Score and Verdict labels intact. -->

---

## Model Tier Recommendation

| Phase | Tier | Rationale |
| --- | --- | --- |
| Execution (Phase 4) | do not assign | FR-9’s client/bundle architecture and several evidence paths remain underspecified |
| Audit (Phase 6) | high | the remaining defects cross package, bundler, workflow-phase and launch-boundary layers |

---

## Analysis

The remediation genuinely closes the app-wide install source, brand constants, exact `/alt` title, anchor count wording, egress scope and stale citations. It also correctly identifies the inert `copyable` behavior.

It does not reach PASS. The central new FR cannot be implemented within its declared surface: `CodeBlock` needs a client boundary, but `@provegate/design/react` is a bundled barrel and a directive added only to `CodeBlock.tsx` is dropped during bundling. Two affected uses are rendered from server `sections/index.tsx`. The PRD neither chooses a delivery architecture nor targets the barrel/build configuration required to make the handler reach the browser.

The real-unfurl rows were removed from the close, but the PRD still retains a live-client acceptance criterion. The proposed launch precondition exists only as prose pointing “around” an announcement draft that contains no such checklist. It has no tracked task, owner, due date, target or durable artifact.

The Success Metrics table is better formatted but still overclaims what its commands measure, and the mobile baseline is assigned to a Phase-6 review artifact that does not exist before Phase 4 and whose template contains no operator rows.

### Evidence re-executed

The existing built HTML was timestamped 2026-07-28 13:42:57 +0300, after the PRD remediation commit. Read-only measurements produced:

- Root `og:image`: 0.
- Hero `termButton`: 0.
- TrustStrip links in the cited source span: 0.
- `id="refusal"`: 0.
- Anchor occurrences: 12; unique targets: 6; orphans: 0.
- `copyable` call sites: 4.
- `content.ts` exports: 38; externally unreferenced: only `PROOF`.
- Root/alt metadata sets: identical; `/alt` has no robots tag.
- Built file sizes: 233,709 B and 101,898 B.
- Static egress: `[egress] clean`.
- Source `HandoffCard` occurrence: 1.

The repository code also confirms:

- Both `apps/web/package.json` and `packages/design/package.json` set `private: true`.
- That does **not** make Changesets skip them under this configuration. `.changeset/config.json` omits `privatePackages`; the installed Changesets parser resolves it to `{"version":true,"tag":false}`. Private packages are not published, but they are not automatically excluded from version planning.
- An in-memory esbuild probe with `"use client"` prepended only to `CodeBlock.tsx` produced a bundled `react/index.js` with no client directive. The current barrel is the package export consumed by Next.
- `_docs/launch/announcement-draft.md` contains no OG-debugger or unfurl checklist.
- The review template is created during Phase 6 and has no Operator Handoff section; operator rows belong in the task artifact.

No hard cap is tripped: `packages/provegate` is untouched, no push path or shipped network/telemetry behavior is specified, and no method content is changed.

---

## Iteration 5 — Remediation Review

### Latest-iteration findings

| Finding | Status | Verification |
| --- | --- | --- |
| **[P1] H / W18 — inert `copyable`** | **PARTIALLY CLOSED** | The false rejection is honestly withdrawn: “that rejection was wrong” and “FR-9 wires it for real” (`PRD:61-69`). FR-9 specifies a button, payload and clipboard tests (`PRD:416-443`). But it omits the required client delivery boundary. The two server-component uses cannot receive browser event handling through the current bundled barrel, and neither `src/react/index.ts` nor `tsup.config.ts` is targeted. |
| **[P1] I / W19 — unexecutable real-unfurl rows** | **COSMETICALLY PAPERED OVER** | The PRD correctly says the former row “could not execute” and binds close to fresh emitted-tag assertions (`PRD:606-618`). But §6 still requires a real live-client result: “Given a link to `https://provegate.dev/`, When it is unfurled … Then a 1200×630 card renders” (`PRD:489-491`). The replacement is only prose at `PRD:849-855`; its claimed launch-checklist home contains no checklist and is outside Scope, Targets and Durable Artifacts. |
| **[P2] J / W20 — fourth install literal** | **CLOSED** | FR-3 explicitly measures all four authorings, names `/alt`, defines value derivation and scans app-wide excluding only the declaration file (`PRD:250-269`). |
| **[P2] K / W20 — incomplete brand source and unpinned `/alt` title** | **CLOSED** | `PRODUCT_NAME_PARTS`, `PRODUCT_NAME`, `SITE_TITLE` and `Wordmark` are one structural source, with `ui.tsx::Wordmark` targeted (`PRD:220-240`). `/alt` is pinned to `ProveGate — alternative landing concept` (`PRD:372-379`). |
| **[P2] L / W21 — acceptance tests presented as measurements** | **PARTIALLY CLOSED** | The table now separates “Current — measured by” from “Target — held by” (`PRD:98-106`). Several cells still do not contain commands producing the claimed value: the anchor command only lists six unique hrefs and neither counts 12 nor diffs ids; the copy command lists call sites but cannot establish “0 of 4 actually copy”; the export commands check only `PROOF`, not the full 38-export census; the metadata “diff” is described but not given as a runnable command; and the HandoffCard grep proves a source occurrence, not rendered mobile behavior (`PRD:111-116`). |
| **[P2] M / W22 — mobile-height baseline has no home** | **OPEN UNDER A NEW TEMPORAL CONTRADICTION** | A capture point and path are now named (`PRD:117`, `PRD:834-839`), but the chosen path is the independent Phase-6 review artifact. That artifact is created after implementation and its template has no operator rows. It cannot hold a “first operator row” before Phase 4 without violating the workflow’s artifact ownership and phase order. |
| **[P3] N / W23 — anchor occurrences conflated with targets** | **CLOSED** | The PRD consistently states “12 anchor occurrences over 6 unique targets” (`PRD:111`, `PRD:560-563`). Re-execution matched both values. |
| **[P3] O / W23 — egress row cross-cutting scope** | **CLOSED** | The metric calls it cross-cutting (`PRD:115`), the FR row discloses both-app scanning (`PRD:794`), and the command repeats in the floor (`PRD:819-821`). |
| **[P3] P / W23 — duplicated header and stale citation** | **CLOSED** | The metrics table has one header (`PRD:105-106`), and both conflict discussions cite `conflicts.ts:67-68` (`PRD:467-472`, `PRD:754-756`). |

### New findings introduced or exposed by the remediation

**[P1] Q — FR-9 has no client-component delivery architecture.**

`CodeBlock` currently lives behind the bundled `@provegate/design/react` entry. FR-9 says only:

> “`copyable` renders a real `<button type="button">`” and its handler uses `navigator.clipboard` (`PRD:416-424`).

Its Targets are only:

> `packages/design/src/react/CodeBlock.tsx`, `packages/design/test/props.test.tsx`, `apps/web/test/landing.test.tsx` (`PRD:442-443`).

Two advertising blocks are rendered from server `apps/web/app/sections/index.tsx`. A browser handler therefore needs a client boundary that survives the design build. The current `tsup` entry bundles every React component through `src/react/index.ts`; an in-memory build proved a directive placed only in `CodeBlock.tsx` is discarded. The viable choices expand scope:

- make the entire `react/index` entry a client module, also correcting the docs claim that all shared components render server-side;
- preserve/split a component-level client entry through build and package exports; or
- move the interactive wrapper into the web consumer, contradicting “no consumer changes.”

Until one is selected, FR-9 is not executable within its Targets.

**[P2] R — the Changesets exemption is false.**

The PRD repeats:

> “`@provegate/design` is `private: true`, so changesets skips it” (`PRD:429-432`),

and:

> “both `private: true` … so changesets skips every package this PRD touches” (`PRD:480-483`).

The installed configuration resolves `privatePackages.version` to `true`. `private: true` prevents publication; it does not establish the claimed version-planning exemption. A no-changeset decision may still be intentional, but it must be justified as repository policy, not as behavior of Changesets. The categorical DO NOT at `PRD:917-919` presently rests on a false supply-chain premise.

**[P2] S — the live-unfurl condition has no durable owner or enforcement surface.**

The launch note names “whatever PRD or owner action performs the deploy” (`PRD:614-618`) and says the announcement draft is its “home” (`PRD:849-855`). That file contains no corresponding checklist, and this PRD does not target it. The requirement therefore disappears from machine state at close while remaining in Acceptance Criteria. Either make emitted tags the complete acceptance contract and remove the live-client criterion, or create a tracked launch task/checklist with owner and ordering.

**[P2] T — the mobile baseline is assigned to the wrong workflow artifact.**

`PRD:834-839` requires an operator to write a pre-Phase-4 value into an independent Phase-6 review artifact. The workflow creates that artifact during Phase 6 from a schema whose author must be independent. The task artifact’s Operator Handoff table is the available pre-implementation durable surface. The current instruction cannot be followed honestly.

**[P3] U — Memory Inputs overclaim the FR-7 result and omit the record most directly implicated by the trajectory.**

FR-7 carefully limits itself to “referenced, not rendered” (`PRD:362-369`), but the `gate-wire-or-delete` disposition says its test ensures “an export cannot outlive its render again” (`PRD:692-695`). That is the stronger claim the FR explicitly disavows.

The active `state-model-before-mechanism` record describes a flat multi-round readiness trajectory and says to stop repeatedly patching instances. PRD-027’s own report records four rounds with Scope & Testability stuck at 5.5, yet the remediation neither applies nor reviews that record. The new client-boundary and evidence-span failures are another instance of the same pattern.

---

## Scorecard — iteration 5

| # | Dimension | Weight | Score | Weighted |
| --- | --- | --- | --- | --- |
| 1 | Clarity | 15% | 7.0/10 | 1.05 |
| 2 | Completeness | 20% | 7.0/10 | 1.40 |
| 3 | Technical Depth | 25% | 7.0/10 | 1.75 |
| 4 | Multi-Tenancy & Security | 20% | 9.0/10 | 1.80 |
| 5 | Scope & Testability | 10% | 5.5/10 | 0.55 |
| 6 | Migration & Rollback | 10% | 7.0/10 | 0.70 |
| **Total** | **Weighted** |  | **7.25/10** | **ITERATE** |

`1.05 + 1.40 + 1.75 + 1.80 + 0.55 + 0.70 = 7.25`.

Clarity receives 7 despite complete formal sections because FR-9 omits its delivery boundary and live-client acceptance is split from its only evidence. No mechanical Clarity cap applies: every FR has Targets, §11 maps all FRs, DO NOT exists, Open Questions is empty, and no TBD marker appears.

Technical Depth retains credit for the verified Next metadata resolver, scrollspy retention model, app-wide derivation and emitted-tag assertions. It falls because the new central requirement stops at component source and misses the package build/React Server Component boundary.

Multi-Tenancy & Security is judged on the repository’s actual critical rules rather than tenant boilerplate. This is a static marketing surface with no auth route, tenant, client→server payload or user input. No `packages/provegate` runtime dependency, push path, telemetry, shipped external fetch or method-content change is specified. It is below 10 because the supply-chain claim about private packages and Changesets is false.

Scope & Testability remains the lowest dimension for a fifth round: incomplete measurement commands, an impossible baseline artifact, an untracked launch condition, and FR-9 tests that cannot compensate for a missing browser-delivery boundary.

---

## Missing Pieces

- **W24 — choose and target FR-9’s client delivery architecture.** Prove with built `@provegate/design/react` output that the browser receives the handler. Include every required barrel, export, build-config, docs-comment or consumer path in Targets, Scope and Conflict Surface.
- **W25 — settle the real-unfurl contract honestly.** Either remove the live-client Gherkin criterion and define fresh emitted tags as the complete close contract, or add an actual tracked launch checklist/task with an owner and ordering.
- **W26 — make every Success Metrics measurement executable and claim-sized.** Each cell must contain one complete read-only command that produces every number in the cell, including anchor occurrences/orphans, the full export census, metadata diff plus robots, and working-copy count.
- **W27 — move the pre-Phase-4 mobile baseline to the task artifact’s Operator Handoff or another artifact that exists before implementation.** Do not prepopulate the independent Phase-6 review.
- **W28 — correct the Changesets reasoning.** Verify the effective `privatePackages` configuration and state the repository’s deliberate versioning decision. Do not claim `private: true` automatically skips version planning.
- **W29 — correct Memory Input honesty.** Change “render” to “external reference” for FR-7 and disposition `state-model-before-mechanism`.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| --- | --- | --- | --- | --- |
| 5 | 2026-07-28 | 7.25 | ITERATE | Independent remediation review. J/K/N/O/P closed; H/L partial; I papered over; M still open through a temporally impossible artifact choice. New P1: FR-9 lacks a client boundary that survives the design bundle. New P2s: false Changesets exemption, untracked launch acceptance, incomplete measurement commands, wrong-phase baseline storage. Read-only lint green under the documented CLI EPERM waiver |
| 4 | 2026-07-27 | 7.55 | ITERATE | Rebuilt PRD largely held, but `copyable` was inert and the real-unfurl operator rows had no deployable target. Install/brand scope, metric provenance, mobile baseline, anchor terminology, egress scope and citation residue remained |
| 3 | 2026-07-27 | 7.33 | ITERATE | CSS declaration was not bound to the hidden card; scrollspy treated observer callbacks as visibility snapshots; export census included declarations and substring-matched `PROOF_EVIDENCE`; stale-build and measurement-language gaps remained |
| 2 | 2026-07-27 | 7.03 | ITERATE | Resolver behavior held under execution, but FR-6 could not lift earlier CTAs and metadata assertions stopped below emitted behavior. OG content, nav ownership, rollback coupling, INDEX scope and install count were incomplete |
| 1 | 2026-07-27 | 6.93 | ITERATE | Self-score. Explicit image declarations suppressed Next’s file-convention card; one Success Metrics baseline was fabricated; rollback, `/alt` inheritance and several test placements were incomplete |

---

## Project-Specific Checklist

| Check | Result |
| --- | --- |
| No runtime dependency in `packages/provegate` | **holds.** Package untouched |
| No push-to-remote path | **holds.** No git execution |
| No telemetry/network in shipped page code | **holds.** Clipboard is a local platform API; static egress baseline is clean |
| Method content traceability | **not applicable.** No prompt, template or schema |
| No new dependency beyond specification | **holds.** `next/og`, React and workspace design package already exist |
| Static-page security | **holds.** No tenant, auth, protected route, server payload or user-controlled image input |
| Supply-chain honesty | **fails in wording.** Private packages are not published, but effective Changesets config permits their versioning |
| Memory Inputs | **mechanically valid, substantively partial.** FR-7’s disposition overclaims rendering and the flat-trajectory record is omitted |
| Memory Outputs and Durable Artifacts | **paths agree.** Learning and INDEX repeat in scope/conflict/durable declarations |
| Operator-row rebinding | **not yet legitimate.** Emitted-tag close evidence is valid, but a live-client acceptance criterion remains behind an untracked launch note |
| Value arithmetic | **holds.** 3.40 |
| Lint | **passes under written waiver.** Direct `lintPrd` green; CLI failed solely on the known `_state` EPERM refresh |

---

## Verdict

**ITERATE — 7.25/10, iteration 5, independently scored by GPT-5 through codex-cli.**

The remediation improved the document materially, but the resurrected central requirement stops one layer before delivery. A clipboard handler in `CodeBlock.tsx` is not a browser feature until the package’s built entry carries a client boundary, and the present Targets cannot produce that result.

The other decisive issue is evidence ownership. The PRD cannot retain live-client acceptance while moving its only real-client check to an untracked future action, nor can it store a pre-implementation measurement in an independent artifact created after implementation. Fresh emitted-tag assertions are legitimate close evidence; the surrounding claims must be narrowed to match them or placed on a real durable launch surface.

No hard cap forces the verdict. The weighted score itself remains below 8.0.

---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 5 transcribed
> verbatim from a fresh independent Codex session (codex-cli 0.145.0, read-only sandbox,
> ~3.45M tokens) that neither scored iteration 4 nor wrote the remediation, per the
> board's re-score rule. The scorer verified by execution where possible — including an
> in-memory esbuild probe proving a `"use client"` directive placed only in
> `CodeBlock.tsx` is dropped by the bundled `react/index` barrel, and a changesets
> config resolution showing `privatePackages.version` defaults to `true`. The lint
> EPERM in Quick Meta is the documented read-only-sandbox artifact; the orchestrating
> session's out-of-sandbox `gate check PRD-027` was green the same day. Six missing
> pieces W24–W29 are the remediation work order; remediate by a non-scorer session,
> re-score once.
