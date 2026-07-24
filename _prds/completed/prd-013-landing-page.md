# PRD-013: Landing Page — apps/web on the Shared System

> **Status**: Draft
>
> **Created**: 2026-07-24
> **Updated**: 2026-07-24
> **Author**: owner
> **Audience**: Implementing Agent (Claude Code / Cursor / Codex)
> **Slug**: `landing-page`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Class Rationale**: (default class) — the public landing page, a new
> user-facing surface.
> **Autonomous Close**: operator-gated
> **State Record**: `_state/prds.json`

---

## 1. Introduction / Overview

`apps/web` is still the bootstrap placeholder (one centered `<h1>`, inline hexes).
This PRD rebuilds it as the designed landing page, composing the nine components
from `@provegate/design/react` (PRD-012) and the `--pg-*` tokens (PRD-010). The
authoritative spec is the landing handoff
(`docs/design/design_handoff_landing/`): final colours, copy, section order, and
interactions for the single-page, dark-first landing.

Three inherited, non-negotiable rules:

1. **No external requests.** No font CDN, no analytics, no beacon, no remote
   asset — "no telemetry" is a product principle. Fonts are self-hosted via
   `@provegate/design`.
2. **Copy discipline.** Only the approved, verbatim proof stats ship (22.58%
   self-reporting; 80+ agents / one test; METR 19% slower). No fabricated
   version, badge, download count, testimonial, or logo row. Every claim traces
   to `docs/design/design-brief-2026-07-23.md` §2/§4 or the whitepaper.
3. **Rebuild, don't copy.** The handoff is a React/Babel prototype; `apps/web`
   gets idiomatic Next.js components importing the real design primitives. The
   `ds-overrides.jsx` shim and `_ds_bundle.js` are never touched.

**The real CLI surface, not the prototype's.** The landing prototype presents a
fictional four-command CLI (`gate init/run/push/ledger`) over a `gate.toml`
config that the shipped tool does not have (owner decision 2026-07-24). This PRD
uses the **real** surface: the ten commands
(`init new open renew release status queue check run land push`),
`workflow.config.json` + `gates.manifest.json` (no `gate.toml`, no `gate ledger`).
Consequently the prototype's **live Playground** (edit `gate.toml` → live run) and
its fictional `CommandRef`/`CIIntegration` are **not built as interactive
fictions**; they are replaced by **real, static, copy-exact CLI output** as
selectable text (the design brief's §12.4 decision) and a command reference over
the real ten. This keeps the do-not-say rule (no fabricated surface) intact.

---

## 2. Goals

### Primary Goals

- [ ] Landing renders as one system with the terminal: same green, verdict
      vocabulary, mark, type — every value from `@provegate/design`.
- [ ] Zero third-party requests at build or runtime.
- [ ] Every terminal block is real CLI output (selectable text), never a
      fabricated or fictional-surface string.
- [ ] The proof and its honest limits sit adjacent — the design idea.

### Success Metrics

| Metric                                   | Current        | Target             | Measurement            |
| ---------------------------------------- | -------------- | ------------------ | ---------------------- |
| Hardcoded hexes in `apps/web`            | 6+ (inline)    | 0                  | `content-web.test.ts`  |
| Third-party origins in built output      | 0 → port risk  | 0                  | `check-static-egress.mjs` |
| Fabricated / fictional-surface facts     | 0 → kit risk   | 0                  | `content-web.test.ts`  |
| Sections from the handoff narrative      | 0              | full order         | `landing.test.ts`      |

---

## 3. User Stories

#### User Story 1

```
As a skeptical senior engineer landing on provegate.dev,
I want the problem, the mechanism, and the honest evidence in the product's own visual language,
so that the page reads as engineered rather than marketed, and I reach a real terminal command.
```

**Acceptance Criteria:**

- [ ] The handoff's section narrative ships in order (nav, hero, trust, problem,
      core rule, how-it-works, phase pipeline, phase detail, operator-gate,
      refusal, evidence ledger, proof+limits, positioning, features, install,
      command reference, FAQ, CTA, footer).
- [ ] Limits sit adjacent to proof.
- [ ] Terminal blocks are real CLI output, selectable, no fabrication, no
      fictional `gate.toml`/`gate ledger`.
- [ ] Primary CTA is the copyable install block; GitHub secondary.

#### User Story 2

```
As a visitor who cares about the no-telemetry claim,
I want the page to make zero third-party requests,
so that the principle is observable, not just asserted.
```

**Acceptance Criteria:**

- [ ] A build-output scan finds no external origin.
- [ ] Fonts are served from our own origin via `@provegate/design`.
- [ ] No analytics, tag manager, cookie banner, or beacon.

#### User Story 3

```
As a keyboard / reduced-motion / mobile user,
I want the page usable and calm,
so that the design's motion and layout never exclude me.
```

**Acceptance Criteria:**

- [ ] `prefers-reduced-motion: reduce` renders finished states (no typing/stagger,
      no caret blink); reveal-on-scroll is motion-gated.
- [ ] Visible focus rings (`--pg-focus-ring`); tablist/tab/aria wired; mobile nav
      drawer with `aria-expanded`/`aria-controls`.
- [ ] No horizontal body scroll at 375px; wide blocks scroll in their own
      container.

---

## 4. Functional Requirements

1. **FR-1**: Rebuild `apps/web` root: import `@provegate/design/styles.css` once,
   `data-theme="dark"` canonical with a working light theme, remove every inline
   hex; add OG/social meta + favicon from the design brand assets.
   - **Targets:** `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`,
     `apps/web/app/icon.svg`, `apps/web/package.json`
2. **FR-2**: Build the section components in `apps/web/app/sections/*.tsx` in the
   handoff order, composing `@provegate/design/react` primitives (`GateLine`,
   `HandoffCard`, `EvidenceTable`, `PhasePipeline`, `VerdictBadge`, `Admonition`,
   `CodeBlock`, `Button`, `Icon`) — no per-app reimplementation.
   - **Targets:** `apps/web/app/sections/*.tsx`
3. **FR-3**: The `gate run` walkthrough, the handoff card, the status table, and
   the refusal render as **real, static, copy-exact CLI output** (selectable
   text). No live Playground, no `gate.toml` parser, no fictional command.
   - **Targets:** `apps/web/app/sections/*.tsx`
4. **FR-4**: The command reference lists the **real ten** commands with real
   one-line descriptions; install shows the real `npm i -D provegate` + `gate
   init` flow. No `gate ledger`, no `gate.toml`.
   - **Targets:** `apps/web/app/sections/*.tsx`
5. **FR-5**: Copy is written from approved sources only (brief §2/§4 +
   whitepaper): the three proof stats verbatim, the core-rule pull-quote, the
   seven-phase cut, the refusal, proof-with-limits, positioning, principles line
   (`MIT · zero deps · local-only · no telemetry · Node ≥ 22`). Do-not-say
   enforced.
   - **Targets:** `apps/web/app/sections/*.tsx`
6. **FR-6**: Motion + a11y: reveal-on-scroll gated by `prefers-reduced-motion`;
   reduced-motion renders finished states; focus rings, tablist/aria, mobile-nav
   drawer; no horizontal scroll at 375px.
   - **Targets:** `apps/web/app/sections/*.tsx`, `apps/web/app/globals.css`
7. **FR-7**: `scripts/check-static-egress.mjs` (zero-dep Node) scans the built
   output for external origins (`http(s)://`, `fonts.googleapis.com`, analytics
   hosts) and exits non-zero on any hit; wired as a repo script. Note in-header
   that runtime-assembled URLs are out of its static reach.
   - **Targets:** `scripts/check-static-egress.mjs`, `package.json`
8. **FR-8**: `content-web.test.ts` — banned vocabulary (`PROVEN`/`VIOLATED`,
   speedup %), fabricated-metric + fictional-surface patterns (`gate.toml`, `gate
   ledger`, a version/download/star count), wordmark casing (`ProveGate` prose,
   `provegate`/`gate` binary), the closed verdict set, and no hardcoded hex in
   `apps/web`.
   - **Targets:** `apps/web/test/content-web.test.ts`, `apps/web/package.json`
9. **FR-9**: `landing.test.ts` — the section set is present in the handoff order;
   the limits block renders adjacent to the proof block.
   - **Targets:** `apps/web/test/landing.test.ts`
10. **FR-10**: `apps/web/README.md` — the token map, why the prototype was rebuilt
    not copied, which prototype facts were rejected (fictional CLI, placeholder
    version/badges), how to add a section without inventing a claim.
    - **Targets:** `apps/web/README.md`

---

## 5. Non-Goals (Out of Scope)

- The nine components (PRD-012) and the token layer (PRD-010).
- `apps/docs` theming + the OG route rendering (PRD-014).
- Any live/interactive CLI simulation, `gate.toml` parser, or fictional command.
- Analytics, A/B tests, cookie banners, newsletter capture, third-party embeds.
- The animated prototype's `_ds_bundle.js` / `ds-overrides.jsx`.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** the built site, **When** `check-static-egress.mjs` runs, **Then** it
  reports zero external origins.
- **Given** the landing copy, **When** the content test runs, **Then** no banned
  vocabulary, fabricated metric, or fictional-surface token (`gate.toml`, `gate
  ledger`) appears.
- **Given** either theme, **When** contrast is measured on body/terminal/status
  text, **Then** every pair meets AA.
- **Given** `prefers-reduced-motion: reduce`, **When** the page loads, **Then**
  finished states render with no typing/stagger.
- **Given** a 375px viewport, **Then** the body never scrolls horizontally.

---

## 7. Technical Considerations

### Architecture

- **Depends on PRD-012** (`@provegate/design/react`) and PRD-010 (tokens/fonts).
- **Real output, not fiction.** The centerpiece interactions in the prototype
  (Playground, fictional CommandRef) are dropped; real CLI specimens ship as
  static selectable text. This is cheaper AND honest — the tool cannot be
  simulated in-browser without fabricating output.
- **New dev tooling (stated):** `apps/web` gains vitest + config + a DOM env for
  `landing.test.ts`/`content-web.test.ts`; devDependencies only, never in the
  built site.
- **Egress scan has a static blind spot** (runtime-assembled URLs) — documented,
  not silently implied complete.

### Dependencies

- `@provegate/design` (workspace), react/react-dom (already in apps/web). No
  third-party runtime dependency, no font service, no analytics.

---

## 8. Implementation Scope

### In Scope

- [ ] `apps/web/**` — layout, sections, globals, metadata, README, tests
- [ ] `scripts/check-static-egress.mjs` + root script entry

### Out of Scope

- `packages/**`, `apps/docs/**`.

---

## 9. Open Questions

- (none — real-surface + static-output decisions settled 2026-07-24)

---

## 10. References

- `docs/design/design_handoff_landing/` — the landing spec (section order,
  interactions, copy); its fictional CLI surface is corrected to the real one here
- `docs/design/design-brief-2026-07-23.md` — audience, voice, do-not-say, §12.4
  static-output decision
- `packages/provegate/src/cli.ts`, `.../run/cards.ts` — the REAL CLI output to
  quote (status table, handoff card, refusal)
- `_prds/wip/prd-012-web-design-adoption.md` — the components this composes

---

## Conflict Surface

- `apps/web/**`
- `scripts/check-static-egress.mjs`

---

## Durable Artifacts

- `apps/web/README.md` — token map, rebuilt-not-copied, rejected prototype facts,
  how to add a section

---

## 11. Verification Commands

Run from repo root after `pnpm build`.

| FR    | Command / Check                                                  | Scope | Notes                                     |
| ----- | ---------------------------------------------------------------- | ----- | ----------------------------------------- |
| FR-1  | `pnpm --filter web build`                                        | web   | landing builds clean                       |
| FR-2  | `pnpm --filter web test test/landing.test.ts`                    | web   | sections compose design primitives         |
| FR-3  | `pnpm --filter web test test/content-web.test.ts`                | web   | no gate.toml / gate ledger in output       |
| FR-4  | `pnpm --filter web test test/content-web.test.ts`                | web   | real ten-command reference                 |
| FR-5  | `pnpm --filter web test test/content-web.test.ts`                | web   | copy discipline, wordmark casing           |
| FR-6  | `pnpm --filter web test test/a11y.test.ts`                       | web   | contrast pairs; reduced-motion; no h-scroll |
| FR-7  | `node scripts/check-static-egress.mjs`                           | root  | zero external origins                      |
| FR-8  | `pnpm --filter web test test/content-web.test.ts`                | web   | banned/fabricated/fictional scan           |
| FR-9  | `pnpm --filter web test test/landing.test.ts`                    | web   | section order; proof adjacent to limits    |
| FR-10 | `grep -c "token map" apps/web/README.md`                        | web   | adoption documented                        |

Cross-cutting (all green before Code Complete):

- `pnpm check-types` · `pnpm lint` · `pnpm test` · `pnpm build`
- `node packages/provegate/dist/cli.js check PRD-013`
- `node packages/provegate/dist/cli.js push; test $? -eq 1`
- `grep -ri -l -e emofy -e rayvaz apps/web/app && exit 1 || true`

Operator-owned (real-browser, recorded as `operator` rows — `skipped` illegal):

- Visible focus rings (keyboard tab-through); reduced-motion suppresses motion;
  no horizontal scroll at 375px; visual parity vs the landing handoff in both
  themes, desktop + mobile.

---

## 12. DO NOT (Anti-Patterns)

- DO NOT ship the fictional CLI surface: no `gate.toml`, no `gate ledger`, no
  four-command set. Use the real ten commands and real config files.
- DO NOT build a live Playground or any in-browser CLI simulation — real CLI
  output ships as static selectable text.
- DO NOT copy prototype placeholder facts (version, downloads, badges) or any
  fabricated metric beyond the approved stats.
- DO NOT add analytics, a font CDN, a remote asset, or any third-party request.
- DO NOT hardcode a hex, font stack, radius, or spacing — reference the token.
- DO NOT use green for anything but earned pass (neutral tab underline, never
  green); red only for real failure.
- DO NOT import `_ds_bundle.js` or port `ds-overrides.jsx`.
- DO NOT reimplement a design component in the app — import from
  `@provegate/design/react`.
- DO NOT touch `packages/**` or `apps/docs/**`.
- DO NOT introduce `any`.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-24 | owner  | Initial draft |
