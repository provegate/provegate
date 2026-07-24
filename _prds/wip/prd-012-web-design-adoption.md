# PRD-012: Web Design Adoption — Landing and Docs on the Shared System

> **Status**: Draft
>
> **Created**: 2026-07-23
> **Updated**: 2026-07-23
> **Author**: owner
> **Audience**: Implementing Agent (Claude Code / Cursor / Codex)
> **Slug**: `web-design-adoption`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Class Rationale**: (default class) — new user-facing surface: the public
> landing page and the themed documentation site.
> **Autonomous Close**: operator-gated
> **State Record**: `_state/prds.json`

---

## 1. Introduction / Overview

`apps/web` is still the bootstrap placeholder: one centered `<h1>`, a paragraph,
an install `<pre>`, three links, all inline-styled with hardcoded hexes.
`apps/docs` runs stock Fumadocs styling. Meanwhile the second design handoff drop
(2026-07-23) supplied everything the web wave was waiting on: `ui_kits/landing/`
(full IA, dark-first), `ui_kits/docs/` (Fumadocs-shaped), `ui_kits/brand/`
(OG card, README header, shields), `guidelines/` (18 rendered token specimens),
and the nine React components as `.jsx.txt` reference implementations with
`.d.ts.txt` prop contracts.

This PRD lands the web half of the system:

- the nine components, ported into `@provegate/design`'s reserved `./react`
  export so landing and docs share one implementation;
- `apps/web` rebuilt as the designed landing page — eleven sections, dark
  canonical, real CLI strings as first-class objects;
- `apps/docs` re-themed by **mapping** `--pg-*` onto Fumadocs' own variables
  rather than rewriting its layout, plus the brand OG card on the existing OG
  route.

Three rules govern the port, all inherited and all non-negotiable:

1. **No external requests.** No font CDN, no analytics, no beacon, no remote
   asset. "No telemetry" is a product principle; a tracker on provegate.dev would
   be a self-inflicted wound. Fonts come self-hosted from `@provegate/design`.
2. **Copy discipline.** The design kits contain placeholder facts — `v1.4.0`,
   `v1.2.0`, weekly-downloads and a `gate | pass` shield — that are **not true**
   (the package is at `0.1.0` and unpublished, and no such badge service exists).
   Nothing fabricated ships. Every claim on the page traces to
   `docs/design/design-brief-2026-07-23.md` §2/§4 or the whitepaper.
3. **Rebuild, don't copy.** The kits are HTML/React reference recreations that
   load a compiled `_ds_bundle.js`. They are read as specification; the apps get
   idiomatic Next.js components built against the `.d.ts.txt` prop contracts.

---

## 2. Goals

### Primary Goals

- [ ] Landing, docs and terminal read as one system: same green, same verdict
      vocabulary, same mark, same type.
- [ ] Both web apps render every color, font and spacing value from
      `@provegate/design` — no hex, no font stack, no magic pixel authored in an
      app.
- [ ] Neither app issues a request to any third-party origin, at build or at
      runtime.
- [ ] The Fumadocs theme is a token map, not a fork of its layout.

### Success Metrics

| Metric                                   | Current                     | Target                        | Measurement              |
| ---------------------------------------- | --------------------------- | ----------------------------- | ------------------------ |
| Hardcoded hexes in `apps/web` + `apps/docs` | 6+ (inline styles)        | 0                             | `check-static-egress`/lint |
| Third-party origins in built output      | 0 (none yet) → risk on port | 0                             | `check-static-egress.mjs` |
| Landing sections from the design IA      | 0 of 11                     | 11 of 11                      | `landing.test.ts`        |
| Fabricated facts on public surfaces      | 0 → risk from kits          | 0                             | `content-web.test.ts`    |

---

## 3. User Stories

#### User Story 1

```
As a skeptical senior engineer landing on provegate.dev,
I want the problem, the mechanism and the evidence in the product's own visual language,
so that the page reads as engineered rather than marketed, and I reach a terminal.
```

**Acceptance Criteria:**

- [ ] The eleven sections ship in order: nav, hero, problem, core rule, method
      (phase pipeline), mechanisms, refusal, proof + limits, positioning, FAQ,
      footer.
- [ ] The limits sit adjacent to the proof, not hidden — that adjacency is the
      design idea.
- [ ] Terminal blocks are real CLI strings, selectable text, no animation, no
      fabricated output.
- [ ] Primary CTA is the copyable install block; GitHub is secondary.

#### User Story 2

```
As a reader of the docs site,
I want Fumadocs to look like ProveGate,
so that moving between docs, landing and my terminal never feels like three products.
```

**Acceptance Criteria:**

- [ ] `--pg-*` tokens are bound onto Fumadocs' own CSS variables; no Fumadocs
      layout component is forked to achieve theming.
- [ ] MDX gains the design components (`CodeBlock`, `GateLine`, `HandoffCard`,
      `EvidenceTable`, `PhasePipeline`, `VerdictBadge`, `Admonition`) through the
      MDX component map.
- [ ] The existing OG route renders the brand OG card.

#### User Story 3

```
As a visitor who cares about the no-telemetry claim,
I want the site to make zero third-party requests,
so that the principle is observable, not just asserted.
```

**Acceptance Criteria:**

- [ ] A build-output scan finds no external origin in either app.
- [ ] Fonts are served from our own origin via `@provegate/design`.
- [ ] No analytics, tag manager, or beacon exists in either app.

---

## 4. Functional Requirements

1. **FR-1**: Port the nine components into `packages/design/src/react/` behind the
   `./react` export reserved by PRD-010 — `Icon`, `Button`, `VerdictBadge`,
   `Admonition`, `CodeBlock`, `GateLine`, `HandoffCard`, `EvidenceTable`,
   `PhasePipeline`. Props are the contract: every name and type in the
   `.d.ts.txt` files is preserved. Styling reads `--pg-*`; no value is inlined.
   - **Targets:** `packages/design/src/react/index.ts`,
     `packages/design/src/react/*.tsx`
2. **FR-2**: `HandoffCard` and `GateLine` render by calling the **shared string
   builders** authored in `@provegate/design/cli` (PRD-010 FR-11) — the same
   functions the CLI consumes — and wrapping the resulting lines in themed markup.
   Because both surfaces call one builder, parity is structural: there is no second
   implementation to drift, and no cross-package parity test (the M1 build-cycle in
   the first readiness pass is dissolved by this). A component test asserts the
   web card's textContent equals the builder's output for a fixture, and that the
   `handoff` (green rule) / `stopped` (red rule) variants map to the right rule
   color.
   - **Targets:** `packages/design/src/react/HandoffCard.tsx`,
     `packages/design/src/react/GateLine.tsx`,
     `packages/design/test/react-card.test.ts`
3. **FR-3**: Rebuild `apps/web` as the designed landing page: the eleven sections
   from User Story 1, `data-theme="dark"` canonical with a working light theme,
   `@provegate/design/styles.css` imported once at the root, and every hardcoded
   inline style removed.
   - **Targets:** `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`,
     `apps/web/app/sections/*.tsx`, `apps/web/package.json`,
     `apps/web/test/landing.test.ts`
4. **FR-4**: Landing copy is written from the approved sources only — the three
   problem data points, the core rule pull-quote, the seven-phase cut, the five
   mechanisms, the refusal moment, the proof with its limits, the positioning
   framing, the principles. The do-not-say list is enforced: no speedup
   percentage, no `PROVEN`/`VIOLATED`, no fabricated version, badge, download
   count, testimonial or logo row.
   - **Targets:** `apps/web/app/sections/*.tsx`
5. **FR-5**: Theme `apps/docs` by mapping, not forking. First **verify the binding
   mechanism** against the installed `@fumadocs/base-ui` 16.11.5 on Tailwind v4:
   determine whether binding `--pg-*` onto Fumadocs' `--color-fd-*` variables in
   `global.css` themes the site, or whether a Tailwind v4 `@theme` block is
   required, and record the finding in the FR before wiring. Then bind the
   variables, wire the shared fonts, set dark as canonical, and register the design
   components in the MDX map. Fumadocs' own layout components are used as-is;
   `lucide-react` (a Fumadocs internal dependency) stays.
   - **Targets:** `apps/docs/app/global.css`, `apps/docs/components/mdx.tsx`,
     `apps/docs/lib/layout.shared.tsx`, `apps/docs/package.json`
6. **FR-6**: Render the brand OG card on the existing docs OG route and add
   matching static OG metadata plus the favicon to `apps/web`, using
   `assets/logo.svg` and `assets/favicon.svg` from the design package. The OG
   route's `[...slug]` input is **bounded** before it reaches the image: cap length
   and restrict to a known charset, falling back to the site title on violation, so
   unbounded arbitrary text never lands in a rendered image.
   - **Targets:** `apps/docs/app/og/docs/[...slug]/route.tsx`,
     `apps/web/app/layout.tsx`, `apps/web/app/icon.svg`
7. **FR-7**: Write `scripts/check-static-egress.mjs` — a zero-dependency Node
   script that scans both apps' built output for external origins (`http://`,
   `https://` in fetched assets, `fonts.googleapis.com`, analytics hosts) and
   exits non-zero on any hit. Wire it as a repo script so it can be a gate.
   - **Targets:** `scripts/check-static-egress.mjs`, `package.json`
8. **FR-8**: Accessibility and responsiveness, split by what a machine can prove.
   **Machine-checked (this FR's §11 row):** AA contrast over every semantic token
   pair in both themes, including terminal-colored text on the terminal surface,
   computed as a pure function over the tokens; and a static check that no status
   is encoded by color alone (every status carries its glyph). **Operator-verified
   (recorded as operator rows, not this FR's automated row):** visible focus rings,
   `prefers-reduced-motion` honored, and no horizontal body scroll at 375px — these
   need a real browser and are listed under the operator-owned block below.
   - **Targets:** `apps/web/app/sections/*.tsx`, `apps/docs/app/global.css`,
     `apps/web/test/contrast.test.ts`
9. **FR-9**: Content-hygiene test for the public surfaces, mirroring the existing
   package-content test: banned vocabulary, fabricated-metric patterns, wordmark
   casing (`ProveGate` in prose, `provegate`/`gate` for package and binary), and
   the closed verdict set.
   - **Targets:** `apps/web/test/content-web.test.ts`, `apps/web/package.json`
10. **FR-10**: Document the web adoption: how the token map works, why the kits
   were rebuilt rather than copied, which kit facts were rejected as fabricated,
   and how to add a section without inventing a claim.
   - **Targets:** `apps/web/README.md`

---

## 5. Non-Goals (Out of Scope)

- The CLI. PRD-011 owns every string the terminal prints.
- The token layer itself. PRD-010 owns `tokens.ts`, the generator, the CSS and the
  fonts; this PRD consumes them and adds only `src/react/`.
- The GitHub README header and the shield badges — a small follow-up item; badges
  must be backed by something real (CI, npm) before they ship, and the package is
  not published yet.
- Docs *content* rewrites. Only presentation and the MDX component map change;
  the `.mdx` prose is untouched (`cli.mdx` is claimed by other PRDs).
- The animated `templates/cli-demo/` motion study — exploration only; the
  canonical CLI surface is static.
- Any analytics, A/B test, cookie banner, newsletter capture, or third-party
  embed.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** the built output of both apps, **When** `check-static-egress.mjs`
  runs, **Then** it reports zero external origins and exits 0.
- **Given** the landing page in either theme, **When** contrast is measured on
  body text, terminal text and status colors, **Then** every pair meets AA.
- **Given** a web `HandoffCard`, **When** its rendered text is compared to the
  CLI's card builder output, **Then** they are identical.
- **Given** the docs site, **When** Fumadocs' layout components are inspected,
  **Then** none is forked — theming is variable binding only.
- **Given** the landing copy, **When** the content-hygiene test runs, **Then** no
  banned vocabulary, fabricated metric or miscased wordmark is found.
- **Given** a 375px viewport, **When** any section is scrolled, **Then** the body
  never scrolls horizontally.

---

## 7. Technical Considerations

### Architecture

- **Components live in the design package, not in an app.** Two consumers exist;
  a per-app copy would drift exactly the way the token layer was designed to
  prevent. This is the only reason `packages/design/**` appears in this PRD's
  conflict surface — and it is why this work must land after PRD-010.
- **Fumadocs theming is binding, not forking.** `--color-fd-*` (and friends) get
  bound to `--pg-*` in `global.css`. Forking a Fumadocs layout to restyle it makes
  every upgrade a merge conflict; the handoff calls this out explicitly.
- **Lucide stays where Fumadocs needs it.** The design system's "no third-party
  icon pack" rule governs *our* components — which use the `Icon` set — not
  Fumadocs' internals, which already depend on `lucide-react`. Do not attempt to
  strip it.
- **One card builder, no parity problem.** PRD-010 FR-11 puts the card and
  status-line string builders in `@provegate/design/cli`. Both the CLI (PRD-011)
  and the web `HandoffCard` (this PRD's FR-2) call that one implementation, so the
  two surfaces cannot drift and there is no cross-package parity test to schedule.
  This dissolves the M1 build-cycle from the first readiness pass — the earlier
  design had `packages/design` testing against `packages/provegate`, which
  devDepends on it, closing a workspace loop turbo cannot order.
- **Sequencing.** Depends on PRD-010 (tokens, fonts, assets, the `./react` export
  path, the shared card builders). Independent of PRD-011 in code, but both consume
  the same design package — land 010 first, then 011 and 012 may proceed; their
  conflict surfaces are disjoint except for `packages/design/**`, which only this
  PRD extends (adding `src/react/`) after 010 ships.

### Dependencies

- `@provegate/design` (workspace) in both apps. No new third-party **runtime**
  dependency, no font service, no analytics SDK, no icon pack.
- **New dev tooling (stated, not smuggled):** `apps/web` gains `vitest` and a test
  config to host `landing.test.ts`, `content-web.test.ts` and `contrast.test.ts` —
  it has no test runner today. These are devDependencies only; they never enter the
  built site or `check-static-egress`'s scan surface.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/design/src/react/**` + `packages/design/test/react-card.test.ts`
- [ ] `apps/web/**` — layout, sections, metadata, README, tests (vitest introduced)
- [ ] `apps/docs/app/global.css`, `apps/docs/components/mdx.tsx`,
      `apps/docs/lib/layout.shared.tsx`, the OG route, `apps/docs/package.json`
- [ ] `scripts/check-static-egress.mjs` + its root script entry

### Out of Scope

- `packages/provegate/**`, `packages/design/src/tokens*`, the generator, the
  fonts, `apps/docs/content/**`.

---

## 9. Open Questions

- (none — component home, Fumadocs strategy and badge deferral settled in §5/§7)

---

## 10. References

- `docs/design/design_handoff_provegate/design-system/ui_kits/landing/` — landing
  IA and section order
- `docs/design/design_handoff_provegate/design-system/ui_kits/docs/` — docs
  surface recreation
- `docs/design/design_handoff_provegate/design-system/ui_kits/brand/` — OG card,
  README header, shield style
- `docs/design/design_handoff_provegate/design-system/guidelines/*.card.html` —
  rendered token specimens (the visual acceptance target)
- `docs/design/design_handoff_provegate/design-system/components/**` — `.jsx.txt`
  reference implementations and `.d.ts.txt` prop contracts
- `docs/design/design-brief-2026-07-23.md` — audience, voice, do-not-say list,
  landing IA, owner decisions
- `_prds/wip/prd-010-design-system-package.md` — the token origin
- `_prds/wip/prd-011-cli-design-adoption.md` — the terminal rendering this must
  match

---

## Conflict Surface

- `packages/design/src/react/**`
- `packages/design/test/react-card.test.ts`
- `apps/web/**`
- `apps/docs/app/global.css`
- `apps/docs/app/og/docs/[...slug]/route.tsx`
- `apps/docs/components/mdx.tsx`
- `apps/docs/lib/layout.shared.tsx`
- `scripts/check-static-egress.mjs`

---

## Durable Artifacts

- `apps/web/README.md` — the token map, why the kits were rebuilt not copied,
  which kit facts were rejected as fabricated, how to add a section

---

## 11. Verification Commands

Run from repo root after `pnpm build`.

| FR    | Command / Check                                                       | Scope  | Notes                                        |
| ----- | --------------------------------------------------------------------- | ------ | -------------------------------------------- |
| FR-1  | `pnpm --filter @provegate/design build`                               | design | react entry builds, props exported           |
| FR-2  | `pnpm --filter @provegate/design test test/react-card.test.ts`        | design | web card textContent equals shared builder    |
| FR-3  | `pnpm --filter web test test/landing.test.ts`                          | web    | eleven sections present, proof adjacent limits |
| FR-4  | `pnpm --filter web test test/content-web.test.ts`                     | web    | copy discipline, wordmark casing             |
| FR-5  | `pnpm --filter docs build`                                            | docs   | themed docs build clean                      |
| FR-6  | `grep -Eq "slice\(0," apps/docs/app/og/docs/\[...slug\]/route.tsx`     | docs   | OG slug bounded before render                 |
| FR-7  | `node scripts/check-static-egress.mjs`                                | root   | zero external origins in built output        |
| FR-8  | `pnpm --filter web test test/contrast.test.ts`                        | web    | AA over token pairs; no color-only status    |
| FR-9  | `pnpm --filter web test test/content-web.test.ts`                     | web    | banned vocabulary + fabricated-metric scan   |
| FR-10 | `grep -c "token map" apps/web/README.md`                              | web    | adoption documented                          |

Cross-cutting (all green before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — full workspace suite; every prior PRD suite unchanged
- `pnpm build` — clean build, all packages and apps
- `node packages/provegate/dist/cli.js check PRD-012` — this PRD passes its own gate
- `node packages/provegate/dist/cli.js push; test $? -eq 1` — never-push invariant
- `grep -ri -l -e emofy -e rayvaz apps/web/app && exit 1 || true` — hygiene

Operator-owned (human/real-browser verification, recorded as `operator` rows —
`skipped` is not a legal value for these):

- Visible focus rings on every interactive element (keyboard tab-through).
- `prefers-reduced-motion` honored — motion is suppressed with the OS setting on.
- No horizontal body scroll at 375px; wide blocks scroll only inside their own
  container.
- Visual parity against `guidelines/*.card.html` and `ui_kits/landing/index.html`
  in both themes, desktop and mobile.
- Real-browser check that the terminal specimens on the page match what the
  reader's own `gate` prints.

---

## 12. DO NOT (Anti-Patterns)

- DO NOT import, vendor, or ship `_ds_bundle.js`. It exists to render the
  reference kits; app components are rebuilt against the `.d.ts.txt` contracts.
- DO NOT copy the kits' placeholder facts: `v1.4.0`, `v1.2.0`, weekly downloads,
  a `gate | pass` shield, or any badge without a real source behind it.
- DO NOT add a speedup percentage, a defect-reduction claim, `PROVEN`,
  `VIOLATED`, an invented testimonial, a logo row, or a star count.
- DO NOT add analytics, a tag manager, a beacon, a cookie banner, a font CDN, a
  remote image, or any other third-party request.
- DO NOT hardcode a hex, a font stack, a radius, or a spacing value in an app —
  reference the token.
- DO NOT use green for anything but earned, machine-verified pass, or red for
  anything but real failure. No green buttons, no decorative accents.
- DO NOT fork a Fumadocs layout component to theme it; bind variables instead.
- DO NOT strip `lucide-react` from `apps/docs` — Fumadocs' internals need it.
- DO NOT animate terminal output, add a typewriter effect, or embed a recorded
  session; the canonical CLI surface is static, selectable text.
- DO NOT edit `apps/docs/content/**` — other PRDs own those files.
- DO NOT touch `packages/provegate/**` or the token layer PRD-010 owns.
- DO NOT introduce `any`; use `unknown` + narrowing.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-23 | owner  | Initial draft |
