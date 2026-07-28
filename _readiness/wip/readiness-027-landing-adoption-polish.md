# Readiness Assessment: PRD-027 — Landing Adoption Polish

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-027-landing-adoption-polish.md` |
| Score | 7.45/10 |
| Verdict | ITERATE — the proposed client entry does not close the existing server-barrel contract, its two-config build leaves output cleaning undefined, and declared Targets still fall outside Implementation Scope and Conflict Surface |
| Iteration | 6 |
| Model Tier (Execution) | do not assign — score < 8 |
| Model Tier (Audit) | — |
| Scored by | **GPT-5 (Codex) — fresh independent session; did not score iteration 5 or author its remediation** |
| Self-scored | **no** |
| Artifact state | current PRD assessed at commit `adc7c5d` |
| Date | 2026-07-28 |
| PRD Lint | **waived CLI write failure; content green.** `node packages/provegate/dist/cli.js check PRD-027` failed only while opening `_state/prds.json.56958.tmp` with the documented sandbox `EPERM`. The read-only `lintPrd(loadConfig, loadManifest, PRD content, root, 27)` equivalent returned `{"ok":true,"issues":[]}`. Relies additionally on the orchestrating session’s out-of-sandbox green run on 2026-07-28 |
| State Record | not modified — analysis-only review |

<!-- Verdict values: PASS | ITERATE. Keep Score and Verdict labels intact. -->

---

## Model Tier Recommendation

| Phase | Tier | Rationale |
| --- | --- | --- |
| Execution (Phase 4) | do not assign | The client-export contract, deterministic build arrangement and conflict surface remain incomplete |
| Audit (Phase 6) | — | Assign after the PRD reaches PASS; an 8–8.9 PASS requires high/high |

---

## Analysis

The remediation materially improves the document. All four rewritten Success Metrics commands emit every stated value. The live-unfurl condition is no longer a close criterion and now has a future durable home. The mobile baseline is assigned to an artifact that will exist before implementation. The changesets discussion is corrected in most normative sections, and FR-7 now claims external references rather than rendering.

The central W24 repair is nevertheless incomplete. A dedicated client subpath is a viable RSC mechanism for the two landing call sites, but `CodeBlock` remains exported from the unmarked `@provegate/design/react` barrel. `apps/docs/components/mdx.tsx:3-13` imports it through that barrel into a server MDX pipeline and explicitly documents every shared component as presentational and hook-free. FR-9 turns that same component into an event-handling component while declaring `apps/docs` a Non-Goal. Moving only the two landing server imports leaves the existing package contract internally contradictory.

The proposed second `tsup` configuration also lacks deterministic output-cleaning semantics. The current configuration has `clean: true` (`packages/design/tsup.config.ts:6-18`). Installed `tsup@8.5.1` accepts an options array but executes its configurations through `Promise.all`; each configuration cleans its own shared output directory when `clean` is enabled. The PRD specifies a second configuration and shared `dist/react/*` output without stating how cleaning occurs safely or asserting that every pre-existing entry survives a clean build.

Scope bookkeeping repeats the same boundary error. FR-9 targets `packages/design/package.json`, `client.ts`, `tsup.config.ts` and the web import change, while FR-1 targets the announcement draft. Implementation Scope omits the new client entry, build config, package export and launch draft; Conflict Surface omits `packages/design/package.json` and the launch draft. The text claims those surfaces were widened when they were not.

### Evidence re-executed

The four remediated metric commands produced exactly:

- Anchor occurrences, unique targets, orphans: `12 6 0`.
- `copyable` call sites, button presence, inert-span presence: `4 false true`.
- Export census and unreferenced list: `38 ["PROOF"]`.
- Root/alt metadata equality and `/alt` robots presence: `true false`.

Additional read-only verification found:

- `_tasks/wip/tasks-027-landing-adoption-polish.md` does not exist. This is expected before Phase 3, and the PRD now states that timing honestly.
- `_docs/launch/announcement-draft.md` currently has no `## Launch checklist`. This is also expected: FR-1 is written to create it during Phase 4, and §11 says the close diff must contain it.
- `packages/design/tsup.config.ts` can syntactically become an options array, but its current `clean: true` cannot be carried into concurrent same-output configurations without an explicit cleaning design.
- `apps/web/app/sections/index.tsx` is a server module and contains the two affected `CodeBlock` uses.
- `apps/web/app/sections/tabs.tsx` begins with `'use client'`; its two uses already sit inside the client graph.
- `apps/docs/components/mdx.tsx` is another server consumer of the barrel and remains unaccounted for.
- Effective Changesets configuration is `{"version":true,"tag":false}` for private packages.
- No readiness hard cap applies: no protected route or new client→server payload is introduced, and lint is green under the written sandbox waiver.

---

## Iteration 6 — Remediation Review

### W24 — client delivery architecture

**Status: PAPERED OVER.**

The architecture is finally selected:

> “The chosen architecture is a **dedicated client subpath entry**” (`PRD:430-440`).

The intended delivery checks are also named:

> “a design test reads the **built** `dist/react/client.js` and asserts the leading `"use client"` directive, and a web test asserts the two server sections import from the client subpath” (`PRD:450-453`).

That closes the original two landing call sites, and the RSC reasoning for `tabs.tsx` is correct:

> “The two `tabs.tsx` call sites already sit inside a client boundary and keep the barrel import” (`PRD:445-449`).

It does not close the package contract. `CodeBlock` remains exported from the non-client barrel consumed by the docs server-MDX map, whose comment says all shared components are server-presentational. The chosen architecture must either remove `CodeBlock` from that barrel, migrate every consumer to the client subpath, or define a separate non-interactive server component.

The claimed surface widening also did not occur completely:

> “The Conflict Surface below claims the design files by name” (`PRD:455-461`).

But Conflict Surface omits `packages/design/package.json`, and Implementation Scope omits `client.ts`, `tsup.config.ts` and `package.json`. The build design additionally leaves concurrent output cleaning unspecified.

### W25 — emitted-tags close contract and durable launch check

**Status: GENUINELY CLOSED.**

The live-client Gherkin criterion is gone and the close contract is explicit:

> “**Emitted tags are this PRD’s complete acceptance contract for the card**” (`PRD:523-529`).

The future live check has a target, durable path, owner and ordering:

> “FR-1 now **creates it**: a `## Launch checklist` section in `_docs/launch/announcement-draft.md` (an FR-1 Target and a Durable Artifact — the close diff must carry it)” (`PRD:906-915`).

FR-1 names the file as a Target (`PRD:236-241`), and Durable Artifacts repeats it (`PRD:831-832`). The file’s current lack of a checklist is therefore honest rather than stale tense: it is an implementation deliverable, not claimed current state.

The path’s omission from Implementation Scope and Conflict Surface is a new scope defect, but the W25 acceptance/ownership repair itself is real.

### W26 — claim-sized metric commands

**Status: GENUINELY CLOSED.**

Each of the four rewritten cells contains one command producing every stated datum:

> “one command emits all three numbers” → `12 6 0` (`PRD:111`).

> “4 call sites, 0 with a control” → `4 false true` (`PRD:112`).

> “one command emits the census and the unreferenced list” → `38 ["PROOF"]` (`PRD:113`).

> “one command compares the emitted meta sets and checks robots” → `true false` (`PRD:114`).

All four outputs were reproduced exactly. The HandoffCard row is also honestly narrowed to a source-occurrence claim (`PRD:116`).

### W27 — mobile baseline artifact

**Status: GENUINELY CLOSED.**

The Success Metric now names the task artifact and correct creation phase:

> “the operator records it in the **task artifact’s Operator Handoff table** (created at Phase 3, before implementation)” (`PRD:117`).

The operator instruction repeats both timing and durable location:

> “**Baseline capture, after Phase 3 and before Phase 4 starts** … records the pixel value in the task artifact’s Operator Handoff table” (`PRD:888-896`).

The task artifact does not exist yet, as expected before Phase 3. The repository task template contains an Operator Handoff table, and the Phase-3 protocol requires operator work to be carried there.

### W28 — Changesets premise

**Status: PAPERED OVER.**

The Non-Goal and DO NOT sections now state the correct distinction:

> “`private: true` … prevents **publication** — it does not make changesets skip them” (`PRD:509-516`).

> “the effective config versions private packages, so this is a policy line, not a tool guarantee” (`PRD:978-983`).

Execution confirmed `privatePackages = {"version":true,"tag":false}`.

However, Rollback retains the exact false premise W28 claimed to remove:

> “`web` and `@provegate/design` are both `private: true`, so changesets skips them” (`PRD:627-631`).

The Changelog’s assertion that this was corrected “everywhere” (`PRD:997`) is therefore false. The no-changeset decision may remain repository policy, but the supply-chain rationale is not internally consistent.

### W29 — Memory Input honesty

**Status: PAPERED OVER.**

The `gate-wire-or-delete` half is genuinely corrected:

> “an export cannot outlive its **last external reference** — deliberately the weaker claim FR-7 itself makes (‘referenced, not rendered’)” (`PRD:730-736`).

The `state-model-before-mechanism` record is now listed, but its disposition is ceremonial:

> “The iteration-5 work order wrote the ground truth by execution (the esbuild bundle probe behind FR-9’s architecture, the resolved changesets config)” (`PRD:737-743`).

Two probes do not constitute the record’s prescribed state model: no transitions, actors, reads, writes or interruption states are enumerated. Nor does the PRD explain that the record is inapplicable because this is a static-page delivery boundary rather than a state machine. The new barrel-consumer, build-cleaning and scope-restatement defects demonstrate that measured facts did not end the same-class trajectory.

---

### New findings introduced or exposed by the remediation

**[P1] V — the client subpath leaves the existing server-barrel contract broken.**

`packages/design/src/react/index.ts:12` continues exporting `CodeBlock` from the unmarked server-capable barrel. `apps/docs/components/mdx.tsx:3-13` imports that export into a server MDX pipeline and explicitly states that all shared components are presentational and have no client hooks. FR-9 adds browser event handling while declaring `apps/docs` untouched (`PRD:507-508`).

The fix must decide the complete export contract: remove `CodeBlock` from the server barrel and migrate all imports, route the docs map through the client subpath, or split the interactive wrapper from a server-safe renderer. A test should reject server-context imports through the wrong subpath.

**[P1] W — the second `tsup` configuration has no safe clean/output model.**

The current config has one shared `dist` output and `clean: true`. Installed tsup runs an options array concurrently. The PRD says only:

> “`tsup.config.ts` gains a second config for that entry with `banner: { js: '"use client";' }`” (`PRD:441-443`).

It does not say which operation cleans the shared output, how races are prevented, or how stale client output is removed. The built-directive assertion can pass while another config’s outputs have been deleted. A clean-build test must assert `tokens`, `cli/index`, `react/index`, `react/client` and their declarations all coexist after one build.

**[P2] X — Targets, Implementation Scope and Conflict Surface disagree.**

FR-9 targets `packages/design/src/react/client.ts`, `packages/design/tsup.config.ts` and `packages/design/package.json` (`PRD:469-472`), but Implementation Scope lists only `CodeBlock.tsx` and `props.test.tsx` for the design package (`PRD:684-685`). Conflict Surface omits `packages/design/package.json` (`PRD:784-790`).

FR-1 targets the launch draft (`PRD:236-241`), and Durable Artifacts names it (`PRD:831-832`), but neither Implementation Scope nor Conflict Surface includes it. The queue therefore cannot protect all declared writes.

**[P2] Y — Rollback preserves the false Changesets rule.**

The normative Rollback text still says private packages are skipped (`PRD:627-631`) after Non-Goals and DO NOT correctly say the opposite. This is precisely the restatement failure the declared memory record warns about.

**[P3] Z — the iteration-5 Changelog overclaims its own consistency sweep.**

The Changelog says:

> “Targets/Conflict Surface widened accordingly” and “the false ‘changesets skips private packages’ premise corrected everywhere” (`PRD:997`).

Both claims are contradicted by the current document. This is audit evidence that the remediation statement was written without a separate sweep.

---

## Scorecard — iteration 6

| # | Dimension | Weight | Score | Weighted |
| --- | --- | --- | --- | --- |
| 1 | Clarity | 15% | 7.0/10 | 1.05 |
| 2 | Completeness | 20% | 7.5/10 | 1.50 |
| 3 | Technical Depth | 25% | 7.0/10 | 1.75 |
| 4 | Multi-Tenancy & Security | 20% | 9.0/10 | 1.80 |
| 5 | Scope & Testability | 10% | 6.5/10 | 0.65 |
| 6 | Migration & Rollback | 10% | 7.0/10 | 0.70 |
| **Total** | **Weighted** |  | **7.45/10** | **ITERATE** |

`1.05 + 1.50 + 1.75 + 1.80 + 0.65 + 0.70 = 7.45`.

Clarity remains at 7 because the central delivery mechanism still needs a package-wide export decision and deterministic build-cleaning arrangement. The mechanical Clarity cap does not apply: every FR has a Targets line, every FR maps to a runnable command, DO NOT exists, Open Questions is empty, and no unresolved marker appears.

Completeness improves because W25–W27 are substantively closed and the metrics are executable. It remains below PASS quality because the existing docs consumer and several required write surfaces were not included.

Technical Depth gets credit for correctly distinguishing server and client landing call sites and for asserting the built directive. It falls because the analysis stopped at those four uses, leaving the barrel’s wider server contract and concurrent build behavior unresolved.

Multi-Tenancy & Security is judged against the actual static-page risk. There are no tenants, protected routes, auth decisions, server payloads or user-controlled network inputs. Clipboard writes are local and guarded; no dependency, telemetry, external fetch, push path or method-content change is introduced. It is below 10 because supply-chain wording remains contradictory and undeclared conflict-surface writes weaken coordination safety.

Scope & Testability improves from iteration 5 through executable metrics and a legitimate baseline artifact. It remains weak because declared Targets do not agree with Scope/Conflict Surface, and the delivery test does not cover the barrel’s other server consumer or prove all build outputs survive cleaning.

Migration & Rollback is bounded and mostly reversible, but its Changesets premise is still false and its client-entry migration omits an existing server consumer.

---

## Missing Pieces

- **W30 — close the complete `CodeBlock` export contract.** Decide whether the server barrel drops `CodeBlock`, every consumer imports the client subpath, or an interactive wrapper is split from a server-safe renderer. Include `apps/docs/components/mdx.tsx` and both stale barrel/server-rendering comments when applicable.
- **W31 — specify deterministic `tsup` output cleaning.** State how the two configurations share `dist` without concurrent deletion or stale client output, then assert every existing entry plus `react/client` and all declarations survive one clean build.
- **W32 — synchronize every declared surface.** Add `packages/design/src/react/client.ts`, `packages/design/tsup.config.ts`, `packages/design/package.json` and `_docs/launch/announcement-draft.md` to Implementation Scope and Conflict Surface as appropriate; add any docs consumer selected by W30.
- **W33 — remove the Rollback survivor.** Replace “changesets skips them” with the same repository-policy wording used in Non-Goals and DO NOT, then perform a separate whole-document sweep.
- **W34 — disposition `state-model-before-mechanism` honestly.** Either explain why its state-machine remedy is not applicable to this static delivery problem, or supply the model the disposition claims exists. Do not equate two executed probes with a state model.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| --- | --- | --- | --- | --- |
| 6 | 2026-07-28 | 7.45 | ITERATE | W25–W27 genuinely closed; W24, W28 and W29 papered over. All four metric commands reproduced exactly and lint content is green under the documented EPERM waiver. New P1s: the client entry leaves the docs server-barrel contract intact, and concurrent tsup cleaning is undefined. New P2s: Targets disagree with Scope/Conflict Surface and Rollback preserves the false Changesets premise |
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
| No telemetry/network in shipped page code | **holds.** Clipboard is a guarded local platform API; static egress remains the declared floor |
| Method content traceability | **not applicable.** No prompt, template or schema |
| No new dependency beyond specification | **holds.** `next/og`, React and tsup already exist |
| Static-page security | **holds.** No tenant, auth, protected route, server payload or user-controlled image input |
| Supply-chain honesty | **fails one normative restatement.** Effective private-package versioning is acknowledged except in Rollback |
| Client delivery | **fails package-wide.** The landing imports are designed, but the docs server barrel remains an unaccounted consumer |
| Build determinism | **not specified.** Two concurrent configs share an output directory whose current owner uses `clean: true` |
| Conflict Surface | **incomplete.** Package export and launch-draft writes are not declared |
| Memory Inputs | **mechanically valid, substantively partial.** `gate-wire-or-delete` is honest; the state-model disposition overclaims what execution probes established |
| Memory Outputs and Durable Artifacts | **paths agree.** The learning and INDEX repeat correctly; launch draft is durable but absent from Conflict Surface |
| Operator-row rebinding | **holds.** Task artifact timing is honest and the file is correctly absent before Phase 3 |
| Launch-checklist tense | **holds.** The current file has no checklist; FR-1 explicitly creates it during implementation |
| Value arithmetic | **holds.** 3.40 |
| Lint | **passes under written waiver.** Direct read-only `lintPrd` green; CLI failed solely on the known `_state` EPERM refresh |

---

## Verdict

**ITERATE — 7.45/10, iteration 6, independently scored by GPT-5 Codex.**

The remediation closes the evidence-command, launch-ownership and baseline-timing defects, but the central client-delivery repair still stops short of the package’s full consumer contract. Moving two landing imports does not make an interactive component safe while the same component remains exported through a server-documented barrel and registered in the docs server-MDX pipeline.

The build mechanism is also not implementation-ready: a second same-output tsup configuration needs explicit cleaning semantics, and the clean-build assertion must prove that every existing export survives alongside the client entry. Finally, required writes must appear consistently in Targets, Implementation Scope and Conflict Surface, and the stale Changesets sentence must be removed.

No hard cap forces the verdict. The weighted score remains below the 8.0 PASS threshold.


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 6 transcribed
> verbatim from a fresh independent Codex session (codex-cli 0.145.0, read-only sandbox)
> that neither scored iteration 5 nor wrote the W24-W29 remediation. All four metric
> commands were re-executed by the scorer and reproduced exactly. The lint EPERM is the
> documented sandbox artifact; the orchestrating session's out-of-sandbox `gate check
> PRD-027` was green the same day. Iteration-6 findings V/W/X/Y/Z plus the W29 rewrite
> are the next work order; the iteration-6 remediation was performed by the orchestrating
> session (still a non-scorer), and iteration 7 requires another fresh scorer.
