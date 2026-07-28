# Readiness Assessment: PRD-027 — Landing Adoption Polish

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-027-landing-adoption-polish.md` |
| Score | 8.20/10 |
| Verdict | PASS — V/W/X/Y/Z/W29 are genuinely closed; two non-blocking documentation and rollback defects remain |
| Iteration | 7 |
| Model Tier (Execution) | high |
| Model Tier (Audit) | high |
| Scored by | **GPT-5 Codex — fresh independent session; did not score iteration 6 or author its remediation** |
| Self-scored | **no** |
| Artifact state | current PRD assessed at commit `c6ecd5b` |
| Date | 2026-07-28 |
| PRD Lint | **waived CLI write failure; content green.** `node packages/provegate/dist/cli.js check PRD-027` failed only while opening `_state/prds.json.16988.tmp` with the documented sandbox `EPERM`. The read-only five-argument `lintPrd(config, manifest, content, root, 27)` equivalent returned `{"ok":true,"issues":[]}`. Relies additionally on the orchestrating session’s out-of-sandbox green run on 2026-07-28 |
| State Record | not modified — analysis-only review |

<!-- Verdict values: PASS | ITERATE. Keep Score and Verdict labels intact. -->

---

## Model Tier Recommendation

| Phase | Tier | Rationale |
| --- | --- | --- |
| Execution (Phase 4) | high | This is an 8–8.9 PASS with detailed framework, package-export and test contracts |
| Audit (Phase 6) | high | Audit should verify the RSC export boundary, clean-build output set and emitted metadata |

---

## Analysis

The iteration-6 remediation closes all six assigned findings. The package contract now separates the server-safe renderer from the interactive client wrapper; the build has one explicit clean before concurrent tsup configurations; Targets, Implementation Scope and Conflict Surface agree; all current Changesets prose distinguishes repository policy from tool behavior; and W29 now gives an honest, task-specific disposition.

Repository verification supports those conclusions:

- `apps/docs/components/mdx.tsx:3-18` imports the barrel `CodeBlock` into the server MDX map and does not pass `copyable`.
- No `copyable` use exists anywhere under `apps/docs`.
- `packages/design/src/react/index.ts:12` currently exports `CodeBlock` and its props from the server barrel, providing the exact seam FR-9 will narrow.
- Installed `tsup@8.5.1` executes configuration-array entries through `Promise.all` (`packages/design/node_modules/tsup/dist/index.js:1494-1497`) and each configuration independently removes its output directory when `clean` is enabled (`:1590-1595`). The specified single pre-clean plus `clean: false` in both configurations is therefore the correct model.
- Normalizing `::SymbolName` suffixes, every FR Target appears in Implementation Scope. Every implementation write is covered by Conflict Surface; `apps/web/app/**` and `apps/web/test/**` cover the individual web files.
- The only current “changesets skips” matches outside dated Changelog history are explicit negations at PRD lines 529 and 1016.
- The direct read-only lint equivalent is green.

Two new defects remain. First, the rollback ordering ignores a source dependency: FR-8 is specified to consume `PRODUCT_NAME`, which FR-1 introduces, so reverting FR-1 first leaves FR-8 uncompilable. Second, the new public subpath makes two existing README statements false, but neither README is targeted. These reduce Migration & Rollback and Scope & Testability, but neither is a hard cap or an implementation-architecture blocker.

### Evidence re-executed

The four Success Metrics commands reproduced their claimed outputs exactly:

- Anchor occurrences, unique targets, orphans: `12 6 0`.
- `copyable` call sites, button presence, inert-span presence: `4 false true`.
- Export census and unreferenced list: `38 ["PROOF"]`.
- Root/alt metadata equality and `/alt` robots presence: `true false`.

No readiness hard cap applies: the PRD adds no runtime dependency to `packages/provegate`, no push path, and no method content.

---

## Iteration 7 — Remediation Review

### V — complete `CodeBlock` export contract

**Status: GENUINELY CLOSED.**

The barrel and client responsibilities are now explicit:

> “the barrel `CodeBlock` stays a server-safe renderer and **loses the `copyable` prop at the type level**” (`PRD:440-444`).

> “`packages/design/src/react/client.ts` (new) exports `CopyableCodeBlock`” (`PRD:445-448`).

> “**all four** web call sites … import `CopyableCodeBlock` from `@provegate/design/react/client`” (`PRD:458-460`).

The wrong-subpath failure is held at the type boundary:

> “the barrel’s `CodeBlockProps` type test asserts `copyable` is gone” (`PRD:465-470`).

The docs-consumer reasoning is accurate. `apps/docs/components/mdx.tsx:6,18` consumes the barrel renderer, and a repository-wide search finds no docs call site passing `copyable`. Its existing server-presentational contract therefore remains true without touching `apps/docs`.

### W — deterministic tsup output model

**Status: GENUINELY CLOSED.**

The cleaning owner and concurrency behavior are pinned:

> “installed tsup runs an options array concurrently over the shared `dist`” (`PRD:450-452`).

> “both configs set `clean: false` and the package `build` script performs one explicit pre-clean (`rm -rf dist && tsup`)" (`PRD:452-454`).

The output-survival assertion covers the old and new entries plus declarations:

> “A clean-build test asserts `tokens`, `cli/index`, `react/index`, `react/client` and their declaration files all coexist after one `pnpm --filter @provegate/design build`” (`PRD:454-456`).

Installed tsup behavior confirms the diagnosis: configuration entries run concurrently, and `clean` is performed per configuration. One pre-clean followed by two non-cleaning builds removes the race and prevents stale output on a normal package build.

### X — Targets, Implementation Scope and Conflict Surface

**Status: GENUINELY CLOSED.**

FR-9 targets the complete package and consumer set (`PRD:486-490`). Implementation Scope repeats `client.ts`, `index.ts`, `tsup.config.ts`, `package.json`, `tabs.tsx`, the launch draft and both test surfaces (`PRD:705-717`). Conflict Surface covers the same writes (`PRD:814-827`).

Independent normalization found no FR Target absent from Implementation Scope and no implementation write outside Conflict Surface. The extra `apps/web/app/sections/tabs.tsx` entry is redundant under `apps/web/app/**`, but harmless.

### Y — Rollback Changesets premise

**Status: GENUINELY CLOSED.**

Rollback now uses the correct policy form:

> “`private: true` blocks publication; by repository policy no changeset is written — the effective changesets config would version them” (`PRD:645-650`).

This agrees with Non-Goals (`PRD:524-533`) and DO NOT (`PRD:1014-1019`). A whole-document grep found no surviving affirmative claim that Changesets skips private packages outside dated Changelog history.

### Z — false consistency-sweep claim

**Status: GENUINELY CLOSED.**

The new Changelog row acknowledges the earlier overclaim rather than silently replacing history:

> “the iteration-5 changelog claimed a sweep it had not run — this row is written AFTER grepping the document for every corrected claim” (`PRD:1033`).

The current normative text supports that disposition: the stale Changesets premise is gone and the three declaration surfaces agree.

### W29 — Memory Input honesty

**Status: GENUINELY CLOSED.**

The revised disposition distinguishes the record’s literal state-machine prescription from the applicable lesson:

> “a static page’s delivery boundary is not a state machine with actors and interrupted states; the unwritten ground truth here was a package **export contract**” (`PRD:766-772`).

It also admits the previous evidence was insufficient:

> “with the honest admission that two probes alone did not end the trajectory” (`PRD:773-775`).

That is an honest `reviewed` disposition: it explains why the literal remedy is inapplicable and identifies the written contract used instead.

---

### New findings

**[P2] AA — the rollback order breaks FR-8’s source dependency.**

FR-8 specifies its title using `PRODUCT_NAME`:

> “composed as `PRODUCT_NAME` (FR-1’s constant)” (`PRD:377-378`).

Rollback then instructs:

> “**revert FR-1 first, or revert both together.** Never FR-8 alone” (`PRD:654-658`).

Reverting FR-1 first removes the constant while FR-8 still consumes it, leaving a type/build failure. The safe contract is to revert both atomically. If tooling forces sequential working-tree operations, revert FR-8 before FR-1 and do not deploy or share the intermediate state.

**[P2] AB — the new client subpath leaves repository API documentation stale and out of scope.**

`packages/design/README.md:41-46` enumerates the package’s import subpaths but has no `@provegate/design/react/client`. Its React section says the landing and docs consume the same nine barrel components (`:76-82`).

`apps/web/README.md:16-19` states:

> “All nine UI components … are imported from `@provegate/design/react`.”

After FR-9, four landing call sites instead import `CopyableCodeBlock` from `@provegate/design/react/client`. Neither README appears in FR Targets, Implementation Scope or Conflict Surface. `apps/docs/README.md:42-48` remains accurate because the docs continue using the server-presentational barrel and should not be changed.

---

## Scorecard — iteration 7

| # | Dimension | Weight | Score | Weighted |
| --- | --- | --- | --- | --- |
| 1 | Clarity | 15% | 8.5/10 | 1.275 |
| 2 | Completeness | 20% | 8.0/10 | 1.600 |
| 3 | Technical Depth | 25% | 8.5/10 | 2.125 |
| 4 | Multi-Tenancy & Security | 20% | 9.5/10 | 1.900 |
| 5 | Scope & Testability | 10% | 7.5/10 | 0.750 |
| 6 | Migration & Rollback | 10% | 5.5/10 | 0.550 |
| **Total** | **Weighted** |  | **8.20/10** | **PASS** |

`1.275 + 1.600 + 2.125 + 1.900 + 0.750 + 0.550 = 8.20`.

Clarity is above the cap threshold. Every FR has Targets, every FR maps to a runnable verification row, DO NOT exists, Open Questions is explicitly empty, and no unresolved marker remains.

Completeness receives substantial credit for closing the docs consumer, build-output and scope-list holes. It loses points because the new public import contract is absent from the package and web READMEs.

Technical Depth is strong. The PRD correctly distinguishes server rendering, client delivery, type-level import rejection, built directive preservation and tsup’s concurrent cleaning behavior.

Multi-Tenancy & Security is judged against the actual static-page risk. There are no tenants, protected routes, auth changes, server payloads, external fetches, telemetry, new dependencies or push paths. Supply-chain language is now internally honest.

Scope & Testability is materially improved: declarations agree, evidence commands reproduce, and the split entry is held by type, import-path, built-output and interaction tests. It loses points for omitting two files whose exact API statements become false.

Migration & Rollback is the weakest dimension because its primary rollback instruction can leave the tree uncompilable. The feature remains low-risk and git-reversible, but the written ordering must account for FR-8’s dependency on an FR-1 symbol.

---

## Missing Pieces

- Correct the FR-1/FR-8 rollback rule: require an atomic joint revert, or document FR-8-before-FR-1 as the non-deployable sequential working-tree order.
- Add `packages/design/README.md` and `apps/web/README.md` to FR-9 Targets, Implementation Scope and Conflict Surface, and update their import-contract descriptions. Leave `apps/docs/README.md` unchanged.

---

## Iteration History

| # | Date | Score | Verdict | Key Changes |
| --- | --- | --- | --- | --- |
| 7 | 2026-07-28 | 8.20 | PASS | V/W/X/Y/Z/W29 genuinely closed. Split renderer preserves the docs server contract; installed tsup confirms the single-pre-clean model; declaration lists agree; Changesets wording is clean; all four metrics reproduced and lint content is green under the EPERM waiver. New P2s: rollback ordering ignores FR-8’s dependency on FR-1’s `PRODUCT_NAME`, and the new client subpath leaves design/web README contracts stale |
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
| No telemetry/network in shipped page code | **holds.** Clipboard is a guarded local API; static egress remains the floor |
| Method content traceability | **not applicable.** No prompt, template or schema |
| No new dependency beyond specification | **holds.** `next/og`, React and tsup already exist |
| Static-page security | **holds.** No tenant, auth, protected route, server payload or user-controlled image input |
| Supply-chain honesty | **holds.** Publication, version planning and repository policy are distinguished consistently |
| Client delivery | **holds.** Server renderer and client wrapper have separate entries and evidence |
| Docs server consumer | **holds.** It imports the server barrel and never passes the removed prop |
| Build determinism | **holds.** One explicit pre-clean precedes concurrent non-cleaning configurations |
| Conflict Surface | **complete for declared work.** README migration is the only newly found omission |
| Memory Inputs | **substantively honest.** W29 explains both the record’s literal limit and the applied contract form |
| Memory Outputs and Durable Artifacts | **paths agree** |
| Success Metrics | **all four claimed outputs reproduced exactly** |
| Value arithmetic | **holds.** 3.40 |
| Lint | **passes under written waiver.** Direct five-argument `lintPrd` green; CLI failed solely on known `_state` EPERM |
| Hard caps | **none apply** |

---

## Verdict

**PASS — 8.20/10, iteration 7, independently scored by GPT-5 Codex.**

The remediation resolves the architecture, build-output, declaration-scope, supply-chain and memory-honesty defects that held iteration 6 below readiness. The resulting PRD is implementation-ready and exceeds the 8.0 threshold without a hard cap or Clarity cap.

The rollback dependency and README migration should still be corrected: they are concrete defects, but they do not invalidate the selected delivery architecture or its acceptance model. Execution and audit should use high/high.


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 7 transcribed
> verbatim from the fourth fresh independent Codex session of this PRD's readiness cycle
> (codex-cli 0.145.0, read-only sandbox). All six iteration-6 findings confirmed
> GENUINELY CLOSED; the four metric commands reproduced again. The two Missing Pieces
> (the FR-1/FR-8 atomic-revert wording and the two README targets) were applied to the
> PRD as post-PASS precision edits per the scorer's own prescriptions — recorded in the
> PRD changelog; the owner may order a confirmation pass at Phase 3 approval. The lint
> EPERM is the documented sandbox artifact; out-of-sandbox `gate check PRD-027` green
> the same day.
