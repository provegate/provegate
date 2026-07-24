# Tasks: Docs Theming + OG

> **PRD**: [prd-014-docs-theming.md](../../_prds/wip/prd-014-docs-theming.md)
> **Readiness**: [readiness-014-docs-theming.md](../../_readiness/wip/readiness-014-docs-theming.md)
> **Status**: Code Complete — Phase 4/5/6 pass (review Critical 0); operator QA + close pending
> **Readiness Score**: 8.3/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-24
> **Updated**: 2026-07-24

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- Phase 4 agents hold a valid lock lease before editing implementation files.

---

## Relevant Files

- `apps/docs/app/global.css` — bind `--color-fd-*` → `--pg-*` (`:root` + `.dark`); prose/code fonts
- `apps/docs/app/layout.tsx` — self-hosted design styles import, drop Inter, `RootProvider` dark-canonical
- `apps/docs/lib/layout.shared.tsx` — nav wordmark/mark
- `apps/docs/components/mdx.tsx` — register the 7 design components in the MDX map
- `apps/docs/app/og/docs/[...slug]/route.tsx` — brand OG card + bounded `[...slug]`
- `apps/docs/README.md` — token-map/bind-not-fork/FR-1 finding/lucide-react stays
- `apps/docs/package.json` — `@provegate/design` workspace dep
- `scripts/check-static-egress.mjs` — docs `.next` already in scope (PRD-013 landed first)

---

## Tasks

- [x] 1.0 FR-1 — verify the binding mechanism first
  - [x] 1.1 Determine whether binding `--pg-*` onto Fumadocs' `--color-fd-*` in
        `global.css` themes the site on `@fumadocs/base-ui` 16.x + Tailwind v4,
        or whether a `@theme` block is required. Record the finding. (Finding in
        Deferrals & Decisions + global.css + README: runtime custom props →
        `:root` override wins; no `@theme`, no fork.)

- [x] 2.0 FR-2 — bind tokens, wire fonts, dark canonical
  - [x] 2.1 `layout.tsx`: import `@provegate/design/styles.css`; drop the
        `next/font/google` Inter; `RootProvider` dark-canonical (default dark,
        light a real toggle) with `attribute: ['class','data-theme']`.
  - [x] 2.2 `global.css`: override `--color-fd-*` from `--pg-*` (one `:root`
        block; `[data-theme]` on the tokens drives both modes); prose
        `--pg-font-sans`, code `--pg-font-mono`. No hex; Fumadocs layout used
        as-is (no fork). Green kept out of the chrome (primary→link, accent→surface).
  - [x] 2.3 `layout.shared.tsx`: nav already renders the correct-cased `ProveGate`
        wordmark (`appName`) — no edit needed.

- [x] 3.0 FR-3 — register design components in the MDX map
  - [x] 3.1 `mdx.tsx`: added `CodeBlock`, `GateLine`, `HandoffCard`,
        `EvidenceTable`, `PhasePipeline`, `VerdictBadge`, `Admonition` from
        `@provegate/design/react`. `package.json`: `@provegate/design` workspace dep.

- [x] 4.0 FR-4 — brand OG card + bounded slug
  - [x] 4.1 Brand card (green mark + wordmark + title). `[...slug]` bounded
        (length cap 120 + charset regex, site-title fallback) before the image.

- [x] 5.0 FR-5 — egress covers docs
  - [x] 5.1 `check-static-egress.mjs` already scans `apps/docs/.next` (line 29,
        landed with PRD-013); docs build reports zero external origins.

- [x] 6.0 FR-6 — README
  - [x] 6.1 `apps/docs/README.md` — token-map approach, bind-not-fork, the FR-1
        binding finding, why `lucide-react` stays.

- [x] 7.0 Phase 5 — Testing
  - [x] 7.1 Every §11 command run; evidence in the ledger.
  - [x] 7.2 Floor: check-types, lint, test, build, gate check, never-push, hygiene.

- [x] 8.0 Phase 6 — Final Auditing
  - [x] 8.1 Independent adversarial review (codex, cross-model) →
        `_docs/reviews/review-014-docs-theming.md`. R1: pass, Critical 0, but 1
        High (OG token/font) + 1 Medium (legacy `system` theme). Both fixed
        (`b442d96`). R2: independently re-verified — Verdict pass, Critical 0,
        High 0, Medium 0, both RESOLVED.

- [x] 9.0 Phase 7 — Learning
  - [x] 9.1 Durable artifact `apps/docs/README.md` is in the diff (token-map,
        bind-not-fork, FR-1 finding, lucide-react-stays).
  - [x] 9.2 Knowledge ingest: the Tailwind-v4 fumadocs binding recipe
        (`:root` override + `attribute:['class','data-theme']` bridge +
        `storageKey`), the worktree dev gotcha (no node_modules / build dist
        in-tree), OG/satori limits (tokens JS export; woff2 unusable), and the
        surface-gap correction (layout.tsx). Recorded in agent memory.

---

## Verification Ledger

| Gate               | Command / Check                                                  | Scope | Result  | Evidence | Notes |
| ------------------ | ---------------------------------------------------------------- | ----- | ------- | -------- | ----- |
| FR-1               | `grep -c "pg-" apps/docs/app/global.css`                        | docs  | passed  | 19 pg- refs | binding block |
| FR-2               | `pnpm --filter docs build`                                      | docs  | passed  | themed build clean | dark canonical, fonts wired |
| FR-3               | `grep -c "GateLine" apps/docs/components/mdx.tsx`               | docs  | passed  | 2 | 7 components in the map |
| FR-4               | `grep -Eq "slice\(0," apps/docs/app/og/docs/[...slug]/route.tsx` | docs  | passed  | bounded | len 120 + charset + fallback |
| FR-5               | `node scripts/check-static-egress.mjs`                          | root  | passed  | clean — docs .next | no external origin |
| FR-6               | `grep -c "token map" apps/docs/README.md`                       | docs  | passed  | 1 | durable artifact |
| types              | `pnpm check-types`                                              | root  | passed  | 0 errors | |
| lint               | `pnpm lint`                                                     | root  | passed  | 0 warnings | |
| test               | `pnpm test`                                                     | root  | passed  | all green | |
| build              | `pnpm build`                                                    | root  | passed  | all tasks | |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-014`            | repo  | passed  | readiness lint ok | |
| never-push         | `node packages/provegate/dist/cli.js push; test $? -eq 1`      | repo  | passed  | exit 1 | |
| hygiene            | `grep -ri -l -e emofy -e rayvaz apps/docs/app apps/docs/components && exit 1 \|\| true` | docs | passed | clean | |
| independent-review | `_docs/reviews/review-014-docs-theming.md`                     | repo  | passed  | verdict pass, critical 0 | codex R1→R2; High+Medium fixed & re-verified |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

- **Surface correction (2026-07-24)** — the draft's Conflict Surface (5 files)
  omitted `apps/docs/app/layout.tsx`, but FR-2 needs it: the stock
  `next/font/google` Inter and the next-themes default (dark-canonical) both
  live there and cannot be set from CSS alone. Owner approved adding it to the
  surface; the PRD FR-2 targets / Conflict Surface / Implementation Scope and
  the lease were updated to match.
- **FR-1 finding** — `@fumadocs/base-ui` 16.x defines `--color-fd-*` in
  `css/lib/default-colors.css`: light in a Tailwind-v4 `@theme {}` block, dark
  in a plain `.dark {}` selector (class toggle), semantics in `@theme static`.
  These are runtime CSS custom properties, so **binding = overriding
  `--color-fd-*` in `:root`/`.dark` after the Fumadocs imports** — no `@theme`
  block of ours is required and no layout component is forked.

---

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
| 2026-07-24 | 1.0 | FR-1 verify-first: `@fumadocs/base-ui` 16.x defines `--color-fd-*` as runtime custom props (`@theme` light / `.dark` dark). Binding via `:root` override wins — no `@theme`, no fork. |
| 2026-07-24 | 2.0 | Surface gap: `app/layout.tsx` (Inter + dark-canonical) was outside the 5-file lease. Owner approved adding it; PRD surface + lease updated. Bound `--color-fd-*`→`--pg-*`; next-themes writes `class`+`data-theme` so one block themes both; green kept out of chrome. |
| 2026-07-24 | 4.0 | OG `[...slug]` was unbounded (`slice(0,-1)`→`getPage`, `notFound` on odd input). Now length-capped + charset-restricted with a site-title fallback; brand card (mark + wordmark + title, literal colours per satori). |
| 2026-07-24 | 7.0 | Phase 4+5 done in worktree `.worktrees/prd-014-docs-theming`. Floor green: check-types, lint, test, build, egress (exit 0), gate check ok, never-push exit 1, hygiene clean. Phase 6 (independent review) pending. |
| 2026-07-24 | 8.0 | Phase 6 codex R1 → pass, Critical 0; found 1 High (OG copied brand hexes + Satori default font) + 1 Medium (persisted legacy `theme=system` wrote `system` to both selectors, defeating dark-canonical). Fixed `b442d96`: OG colours from `@provegate/design/tokens`; `storageKey: pg-docs-theme` so legacy value is ignored (verified first render dark for a legacy visitor). Satori can't consume the woff2-only package, so the OG font stays Satori's default — accepted as an honest engine limitation, documented in the route. R2 → pass, Critical 0, High 0, Medium 0, both RESOLVED. |
| 2026-07-24 | 9.0 | Phase 7: durable artifact confirmed; learnings ingested to memory. Operator visual rows waived at owner instruction (recorded in acceptances.json); closing via `gate land`. |

---

## Blockers / Open Questions

- Operator visual QA (rows 2.0/4.0) was **waived, not executed in-browser** this
  session at owner instruction. The owner accepted autonomous close on the
  machine gates + the cross-model Phase-6 review via `_state/acceptances.json`.
  A real-browser parity/OG pass remains a good follow-up.

---

## Operator Handoff

> Real-browser verification the docs need but a headless test cannot settle.
> `skipped` is not legal for these.

| Task | Category  | Owner    | Required Check                                        | Status  | Notes                |
| ---- | --------- | -------- | ---------------------------------------------------- | ------- | -------------------- |
| 2.0  | manual-qa | operator | Visual parity of themed docs vs handoff, both themes | waived  | not run in-browser this session; owner accepted close on machine gates + review (acceptances.json) |
| 4.0  | manual-qa | operator | OG card renders correctly for a real docs slug       | waived  | not run in-browser this session; owner accepted (acceptances.json) |
