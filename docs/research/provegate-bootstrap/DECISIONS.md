# ProveGate — Locked Decisions (as of 2026-07-22)

> Owner: Ramazan Ayvaz (rayvaz). Every entry below is an owner decision unless marked PENDING.
> The bootstrap agent must treat LOCKED items as constraints, not suggestions.

## Identity

| Item         | Decision                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| Project name | **provegate** (npm package, GitHub org — both verified free 2026-07-22)                               |
| Wordmark     | **ProveGate** (CamelCase in all prose/marketing; package/binary lowercase)                            |
| Tagline      | "ProveGate (prove + gate): prove it, then let it propagate." (README first line)                      |
| Thesis name  | "Gated Autonomy" (whitepaper term; distinct from tool name)                                           |
| License      | MIT                                                                                                   |
| Telemetry    | None. No accounts, no cloud. Local JSONL metrics only                                                 |
| Copy caution | Never use PROVEN/VIOLATED badge-jargon (dead shipgate project's vocabulary); the verb "prove" is fine |

## Architecture

| Item           | Decision                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Repo shape     | **Monorepo**: `packages/provegate` (CLI+core+method assets) + `apps/web` (landing) + `apps/docs`                |
| Package split  | Single `provegate` package initially; `@provegate/core` split only if programmatic-API demand appears           |
| Method assets  | `prompts/` (7 phase prompts + tool adapters), `templates/`, `schemas/`, `examples/` ship INSIDE the npm package |
| Dogfood        | The provegate repo runs the gated workflow on itself from day one (`_prds/`, `_state/`, gates in CI)            |
| Core invariant | **The runner has no code path that pushes to a remote.** Push is always the human's decision                    |
| CLI deps       | Zero runtime dependencies (target); dev-deps unrestricted                                                       |

## Tech stack

| Layer      | Choice                                                                          | Note                                                                     |
| ---------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Language   | **TypeScript** (owner decision 2026-07-22, overrode buildless-.mjs alternative) |                                                                          |
| Build      | **tsup**                                                                        | See "Known traps" in BOOTSTRAP_PROMPT — incremental×clean emit blindness |
| Workspace  | pnpm + turborepo                                                                |                                                                          |
| Test       | vitest                                                                          |                                                                          |
| Web        | Next.js → Vercel                                                                | Minimal skeleton at bootstrap; content later                             |
| Docs       | Fumadocs (Next-based)                                                           | Separate app; docs-drift gate target                                     |
| Release    | Changesets + GitHub Actions `npm publish --provenance`                          | Provenance = on-brand evidence                                           |
| Quality    | prettier + eslint + commitlint (conventional)                                   |                                                                          |
| Node floor | ≥ 22                                                                            |                                                                          |

## PENDING (confirm with owner before hard-wiring)

| Item                    | Proposed                                                                                                                                                                                | Status                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| CLI binary              | Dual-bin: `provegate` + `gate` (both PATH/npm-bin free at sweep; `prove` is FORBIDDEN — /usr/bin/prove is Perl's TAP harness). `gate push` → refuses with "No. Push is yours." (exit 1) | **APPROVED (owner, 2026-07-22)** — hard-wired at bootstrap, refusal covered by vitest |
| Domain                  | **provegate.dev — REGISTERED (owner, 2026-07-22)**                                                                                                                                      | DONE                            |
| GitHub org              | **`provegate`** lowercase (URL = identifier); org Display Name = "ProveGate" (wordmark); repo `provegate/provegate`                                                                     | decided; reservation owner task |
| npm placeholder publish | —                                                                                                                                                                                       | owner task                      |

## Method source of truth

The workflow being productized is the **7-Phase Gated PRD Workflow** (Emofy Platform, ~390 PRDs).
Extraction map: `de-emofy-inventory-2026-07-22.md`. Program plan: `oss-extraction-roadmap-2026-07-22.md`
(Phase A partially done: hygiene PRD-418 landed, name decided; this bootstrap = "repo iskeleti" item).
Thesis + evidence: `whitepaper-gated-autonomy-2026-07-22.md`. Market: `competitor-landscape-*.md`
(incl. §2.5 shipgate/gatecheck addendum). Launch copy source: `positioning-and-faq-2026-07-22.md`.

## Post-bootstrap method extensions

The `source-snapshot/` copy is frozen: extraction happens *from* that version and it is
never edited to accommodate later work. The rule that shipped method content must trace to
the snapshot had no expression for a deliberate extension, which left only two bad options —
fabricate package content, or edit the frozen copy.

**Decision (owner, 2026-07-25):** a post-bootstrap method extension requires an
owner-approved addendum under `source-snapshot/addenda/`, dated and listed in
`MANIFEST.md`. Every shipped prompt, template, or schema byte must trace to the frozen
snapshot **or** to such an addendum; nothing else counts as method provenance. Addenda are
written in English because they source English-only package content.

| Addendum | Date | Scope |
| -------- | ---- | ----- |
| `addenda/agent-memory-closed-loop-2026-07-25.md` | 2026-07-25 | Closed-loop agent memory: PRD Memory Inputs/Outputs grammar, watch and weakening semantics, the `_brain` versus product-doc boundary, deterministic local recall constraints, and the offline / zero-dependency / human-push invariants. Source for PRD-017, PRD-018, and PRD-019. |
| `addenda/autonomy-mode-and-proceed-rule-2026-07-27.md` | 2026-07-28 | Autonomy mode and the Phase 4–7 proceed rule: the Phase 3 exception is a configured value (`AUTONOMY_MODE`, two legal values, never a self-assessment), and the entrypoint carries an explicit proceed rule beside its stop rules. Source for PRD-031. |
| `addenda/operator-acceptance-predicate-2026-08-07.md` | 2026-08-07 | What `Autonomous Close` demands: the declaration is the demand (an `operator-gated` item needs an acceptance at any row count), `eligible` beside operator-owned rows is refused, what an operator-owned row is (Operator Handoff rows plus ledger `operator`/`blocked` results), the invariant is evaluated at two points so no resume skips it, and an unreadable artifact refuses instead of counting zero. Source for PRD-040. |
