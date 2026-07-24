# Tasks: Landing Page

> **PRD**: [prd-013-landing-page.md](../../_prds/wip/prd-013-landing-page.md)
> **Readiness**: [readiness-013-landing-page.md](../../_readiness/wip/readiness-013-landing-page.md)
> **Status**: Code Complete
> **Readiness Score**: 8.2/10
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

- `apps/web/app/layout.tsx` — styles.css import, dark canonical, OG meta
- `apps/web/app/globals.css` — reset, focus ring, reveal-on-scroll (motion-gated)
- `apps/web/app/sections/content.ts` — approved copy + real CLI output (single source)
- `apps/web/app/sections/index.tsx` — the narrative sections (design primitives)
- `apps/web/app/sections/reveal.tsx` — reveal-on-scroll client component
- `apps/web/app/page.tsx` — composition in handoff order
- `apps/web/README.md` — token map, rebuilt-not-copied, rejected prototype facts
- `apps/web/test/content-web.test.ts` — copy discipline, no hex
- `apps/web/test/landing.test.tsx` — section set + order; real CLI surface
- `apps/web/test/a11y.test.ts` — reduced-motion gating; focus/375px → operator
- `scripts/check-static-egress.mjs` — zero third-party fetch in the build

---

## Tasks

- [x] 1.0 App shell + tokens (FR-1)
  - [x] 1.1 `layout.tsx`: import `@provegate/design/styles.css` + `globals.css`;
        `data-theme="dark"` canonical, OS-mirroring script; OG/twitter meta. No
        inline hex.
  - [x] 1.2 `globals.css`: token-driven reset, `:focus-visible` ring
        (`--pg-ring`), reveal-on-scroll gated by `prefers-reduced-motion`,
        `overflow-x: hidden` on body.

- [x] 2.0 Sections (FR-2/FR-3/FR-4/FR-5)
  - [x] 2.1 `content.ts` — approved facts (3 stats verbatim, core rule, phases,
        REAL ten commands, real CLI output strings, principles line). No fabrication.
  - [x] 2.2 `sections/index.tsx` — Nav, Hero, Problem, CoreRule, Method
        (PhasePipeline + HandoffCard), RunWalkthrough (real GateLines), Refusal,
        EvidenceLedger (EvidenceTable + VerdictBadge), Proof (+ limits adjacent),
        Positioning, CommandRef (real ten), Footer — composing design primitives.
  - [x] 2.3 Terminal blocks are REAL static CLI output; the fictional
        Playground/`gate.toml`/`gate ledger` are dropped (FR-3).
  - [x] 2.4 `page.tsx` composes in handoff order; limits sit adjacent to proof.

- [x] 3.0 Motion + a11y (FR-6)
  - [x] 3.1 Reveal-on-scroll motion-gated; reduced-motion renders finished state;
        focus ring; no horizontal body scroll. Real-browser focus/375px/contrast
        are operator rows.

- [x] 4.0 Egress + content tests (FR-7/FR-8/FR-9)
  - [x] 4.1 `scripts/check-static-egress.mjs` — zero-dep; fails on any off-origin
        fetch (font CDN, analytics, CSS `url(http)`). Blind spot documented.
  - [x] 4.2 `content-web.test.ts` — banned vocab, no `%faster/%fewer`, no
        fabricated version/downloads/stars, wordmark casing, no hex.
  - [x] 4.3 `landing.test.tsx` — section set + order; Hero/Problem/Proof/Refusal
        content; CommandRef real ten + no `gate.toml`/`gate ledger` rendered.
  - [x] 4.4 `a11y.test.ts` — reduced-motion gating; focus ring; no h-scroll.

- [x] 5.0 README (FR-10)
  - [x] 5.1 `apps/web/README.md` — token map, rebuilt-not-copied, rejected
        prototype facts (fictional CLI, placeholder version/badges), how to add a
        section.

- [x] 6.0 Phase 5 — Testing
  - [x] 6.1 Every §11 command run; evidence in the ledger.
  - [x] 6.2 Floor: check-types, lint, test, build, gate check, never-push, hygiene.

- [x] 7.0 Phase 6 — Final Auditing
  - [x] 7.1 Independent adversarial review → `_docs/reviews/review-013-landing-page.md`.
        `Verdict: pass` requires `Critical: 0`. Reviewer attacks: egress (any
        third-party fetch in the build), fabricated/fictional copy, token-only
        (no hex), the real-surface reconciliation, reduced-motion gating.
        PASS after 3 rounds — see Progress Log.

- [x] 8.0 Phase 7 — Learning
  - [x] 8.1 Confirm the durable artifact (`apps/web/README.md`) is in the diff.
  - [x] 8.2 Knowledge ingest: the fictional-CLI → real-static-output decision,
        and the egress lesson (a denylist/enumerated model misses shapes; scan
        by fetch SHAPE, over any scheme and any quote style).

---

## Verification Ledger

| Gate               | Command / Check                                        | Scope | Result  | Evidence | Notes                       |
| ------------------ | ------------------------------------------------------ | ----- | ------- | -------- | --------------------------- |
| FR-1               | `pnpm --filter web build`                              | web   | passed  | compiled, 3 static pages | landing builds |
| FR-2               | `pnpm --filter web test test/landing.test.ts`         | web   | passed  | sections compose primitives | |
| FR-3               | `pnpm --filter web test test/content-web.test.ts`     | web   | passed  | no gate.toml/ledger rendered | |
| FR-4               | `pnpm --filter web test test/content-web.test.ts`     | web   | passed  | real ten-command ref | |
| FR-5               | `pnpm --filter web test test/content-web.test.ts`     | web   | passed  | copy discipline, casing | |
| FR-6               | `pnpm --filter web test test/a11y.test.ts`            | web   | passed  | reduced-motion gating; focus; no h-scroll | |
| FR-7               | `node scripts/check-static-egress.mjs`                | root  | passed  | clean — no third-party fetch SHAPE | fetch-shape model (Phase-6 fix) |
| FR-8               | `pnpm --filter web test test/content-web.test.ts`     | web   | passed  | banned/fabricated/fictional scan | |
| FR-9               | `pnpm --filter web test test/landing.test.ts`         | web   | passed  | section order; proof adjacent to limits | |
| FR-10              | `grep -c "token map" apps/web/README.md`             | web   | passed  | 1 | |
| types              | `pnpm check-types`                                     | root  | passed  | 0 errors | |
| lint               | `pnpm lint`                                            | root  | passed  | 0 warnings | |
| test               | `pnpm test`                                            | root  | passed  | design 43, provegate 481, web 16 | |
| build              | `pnpm build`                                           | root  | passed  | 4 tasks | |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-013`   | repo  | passed  | exit 0 | |
| never-push         | `node packages/provegate/dist/cli.js push; test $? -eq 1` | repo | passed | exit 1 | |
| hygiene            | `grep -ri -l -e emofy -e rayvaz apps/web/app && exit 1 \|\| true` | web | passed | clean | |
| independent-review | `_docs/reviews/review-013-landing-page.md`            | repo  | passed  | verdict pass, critical 0 | 3 rounds — denylist→shape, then wss:/backtick closed |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

- FR-3 — the prototype's live Playground + fictional CLI (`gate.toml`, `gate
  ledger`, four commands) are DROPPED per the owner's real-surface decision.
  Terminal blocks are real static CLI output (GateLine/HandoffCard fed real
  strings); CommandRef lists the real ten. Both enforced by rendered-output tests.
- FR-7 — the egress scanner flags a real FETCH (CSS `url(http)`, `@import`, a
  denylisted font-CDN/analytics host), not `<a href>`/metadata URLs to our own
  origin or github.com. Runtime-assembled URLs are a stated static blind spot.
- 4.2/4.3 — the CLI-surface + fabrication checks that need RENDERED output live in
  `landing.test.tsx`; `content-web.test.ts` keeps the pure source scans (banned
  vocab, hex, casing) — the `speedup` in the approved METR quote is not a claim.
- `apps/web` gained vitest + a DOM env (devDependencies only; never in the build).
- 4.1 (Phase-6 Critical fix) — the egress scanner was rewritten from a
  denylist+CSS model to a FETCH-SHAPE detector. The review proved the old model
  missed a `<script src>` / `<link preconnect>` / JS `fetch()` to a non-denylisted
  host. It now flags an external-origin URL in any fetch context (script/link/media
  src|href, CSS url()/@import, JS fetch/beacon/WebSocket/EventSource/XHR-open and
  .src=/.href=), ignoring framework doc-URL strings (never in a fetch shape).
  Re-validated against both reviewer injections.
- 4.1 (Phase-6 round-2) — re-verification found two shapes the fetch-shape
  detector still missed: a `wss://` WebSocket URL and any backtick-quoted URL.
  Fixed: `URL_RE`/`isExternal` accept any `[a-z…]:` scheme (keeping
  protocol-relative `//`), and the JS quote class gained backtick. Re-probed:
  `new WebSocket('wss://…')`, `fetch(\`https://…\`)`, `el.src = \`https://…\``
  now all fail (exit 1); clean build still exits 0.

---

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
| 2026-07-24 | 7.1 | Phase-6 round 1 → FAIL (Critical 1): egress scanner was a denylist+CSS model; reviewer injected `<script src>`/`<link preconnect>`/`fetch()` to non-denylisted hosts and it reported clean. Rewrote as fetch-shape detector (`6f2c10d`). |
| 2026-07-24 | 7.1 | Round 2 → FAIL (Critical 1): shape detector still missed `wss://` (URL_RE scheme) and backtick-quoted URLs (JS quote class). Widened scheme to any `[a-z…]:` + added backtick to quote classes (`484f476`). |
| 2026-07-24 | 7.1 | Round 3 → PASS (Critical 0): all three bypasses fixed; reviewer threw 12 more shapes (`ws://`, `WSS://`, backtick in beacon/importScripts/EventSource/XHR-open, unquoted CSS `url()`), none slipped; string-concat remains the declared blind spot. |
| 2026-07-24 | 3.1/2.2 | Operator browser QA (Claude-in-Chrome, real Chrome). Focus rings, reduced-motion CSS, desktop light+dark parity all PASS. **Bug found at 375px**: `EvidenceTable` wrapper `.pg-evidence` used `overflow:hidden`, clipping the trailing `Evidence` column (~73px unreachable) — wide block did NOT scroll in-box. Fixed `packages/design/src/react/EvidenceTable.tsx` → `overflow-x:auto; overflow-y:hidden` (matches `pg-handoff`). Re-verified in a 375px same-origin iframe: table scrolls in-box, Evidence column reachable, page still no h-scroll, zero uncontained overflow. Floor re-run green (types/lint/test 481+16, build, egress exit 0). |

---

## Blockers / Open Questions

- Machine phases 4–7 complete; Phase 6 PASS (Critical 0). Operator browser QA ran
  2026-07-24 (Claude-in-Chrome): all four Operator Handoff rows now **passed**, with
  one bug found and fixed (`EvidenceTable` 375px clip → in-box scroll). One caveat:
  `prefers-reduced-motion` was verified by live CSSOM (mechanism sound), not by
  flipping the OS toggle — the browser tools can't emulate the media feature. Owner
  to confirm reduced-motion visually and accept the rows; `gate` merge stays blocked
  until those rows are accepted and the design-package fix is committed.

---

## Operator Handoff

> Real-browser verification the page needs but a headless test cannot settle.
> `skipped` is not legal for these.

| Task | Category  | Owner    | Required Check                                          | Status  | Notes                        |
| ---- | --------- | -------- | ------------------------------------------------------ | ------- | ---------------------------- |
| 3.1  | manual-qa | operator | Visible focus rings on every interactive element        | passed  | box-shadow `--pg-ring` visible on nav Docs/GitHub, hero buttons, footer links (Chrome tab-through) |
| 3.1  | manual-qa | operator | prefers-reduced-motion suppresses all motion            | passed  | live CSSOM: `reduce` branch hard-sets `.pg-reveal{opacity:1;transform:none}`, durations→0s, transition only under `no-preference`. OS-toggle visual not flippable via tools; mechanism verified |
| 3.1  | manual-qa | operator | No horizontal scroll at 375px                           | passed  | after fix — see Progress Log. Page never h-scrolls (`overflow-x:hidden`); handoff/terminal + evidence table now scroll in-box |
| 2.2  | manual-qa | operator | Visual parity vs the landing handoff, both themes       | passed  | desktop light + dark both coherent (hero, phase pipeline, handoff card, gate-run, evidence ledger, command ref); 375px mobile verified after fix |
