# PRD-027: Landing Adoption Polish — a Shareable Card, a Copyable First Action, Linked Claims

> **Status**: Draft
>
> **Created**: 2026-07-27
> **Updated**: 2026-07-27
> **Author**: Claude Opus 5, for owner review
> **Audience**: Implementing Agent
> **Slug**: `landing-adoption-polish`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Autonomous Close**: operator-gated
> **State Record**: `_state/prds.json`
> **Value**: 3.40 (MF/UI/TL/AR/RM: 3/3/2/5/5)

<!-- 0.25*3 + 0.25*3 + 0.20*2 + 0.15*5 + 0.15*5
     = 0.75 + 0.75 + 0.40 + 0.75 + 0.75 = 3.40

     This sits EXACTLY at the ≥3.40 candidate threshold. It was not rounded up: the
     candidate was broadened once (FR-3 install single-sourcing, FR-7 unreferenced-export
     rule, FR-8 /alt indexability) per the expand-don't-delete rule, and the dimensions
     were left where the evidence puts them. MF is 3 and not 5 because this is the
     method's marketing surface, not the method; TL is 2 because only the OG pattern and
     the anchor-closure test carry forward. If the owner scores AR lower, the candidate
     drops below threshold and should be broadened again rather than shipped thin. -->

---

## 1. Introduction / Overview

An independent review of the shipped landing page (`apps/web`, PRD-013) produced ten
suggestions. Six survived verification against the code; four did not, and two more
defects the review missed were found while checking it. This PRD ships the six that
survived plus the two new ones. It touches **no section order and no copy claim** — those
are the owner-approved handoff's, and the parts of the review that wanted them changed are
Non-Goals with a pointer to what they'd cost.

The unifying defect is small and consistent: **the page asserts things it does not wire.**

| Defect | Evidence in the code |
| ------ | -------------------- |
| The social card is declared but does not exist | `app/layout.tsx:22` sets `twitter.card: 'summary_large_image'`; no `openGraph.images`, no `twitter.images`, no image route anywhere in `apps/web`. X and Slack render no large card — the declared card type is a promise the page cannot keep. It fails silently: no build error, no test, no warning. |
| The first action is shown but cannot be taken | `HeroTerminal` types `npm install -D provegate` (`content.ts:35`) with no copy control. The first copyable install is `InstallTabs`, ~17 sections down (`page.tsx:52`). |
| Three claims point at evidence with no link | `TRUST_STRIP` (`content.ts:56-60`) renders as plain `<span>`s (`index.tsx:136-153`). Worse, one of them — "push is always yours" — has **no reachable target at all**: the `Refusal` section carries no `id` (`index.tsx:426`), so neither the strip nor the footer can link to it. |
| The reader cannot tell where they are | 23 composition blocks (`page.tsx:35-57`, counted), sticky nav (`nav.tsx:88`), no active-anchor state. |
| The mobile hero spends the first screen on a duplicate | `globals.css:132-143` collapses `.pg-hero` to one column at ≤900px, stacking eyebrow + h1 + lede + a 188px-min terminal (`hero-terminal.tsx:70`) + two CTAs + the principles line + a nine-line `HandoffCard`. |
| A content export is dead | `content.ts:284` exports `PROOF`; nothing imports it. `PROOF_EVIDENCE` replaced it and it was never deleted. |
| A concept page competes with the product page | `app/alt/page.tsx` exports no `metadata`, so `/alt` inherits the root title and description — and, once FR-1 lands, the OG card too, because the resolver threads `resolvedMetadata` down the segment chain (`resolve-metadata.js:764-800`). Measured: `alt.html` already emits metadata byte-identical to `/`, with no `robots` meta. It also links back to `/` as "current landing" (`alt/page.tsx:470`). |
| The install command is authored **three** times | Measured, not eyeballed: `npm install -D provegate` appears at `content.ts:18` (`HERO.install`), `:35` (`HERO_TERMINAL.steps`) and `:350` (`INSTALLERS[0].code`) — three independent authorings in the file whose header claims to be "the single source of landing copy". |

Two review items are **rejected** rather than deferred, because the code contradicts them:

- *"`Problem` and `Proof` both render `PROOF_STATS` — the same three stats twice."* They do
  not. `Problem` renders `PROOF_STATS` (`index.tsx:168`); `Proof` renders `PROOF_EVIDENCE`
  and `LIMITS` (`index.tsx:516`, `531`). The separation is the design decision — limits
  adjacent to evidence — and `landing.test.tsx:79-85` asserts it.
- *"Terminal blocks need a copy button."* `InstallTabs` and every CI snippet already pass
  `copyable` (`tabs.tsx:93`, `tabs.tsx:121`), which renders one
  (`packages/design/src/react/CodeBlock.tsx:38-52`). The blocks without a copy control —
  hero terminal, `GateRun`, `CommandRef`, the playground plan — are **output**, not input.
  FR-2 adds the one copy affordance that is genuinely missing, and no others.

---

## 2. Goals

### Primary Goals

- [ ] Every capability the page's metadata declares is backed by a real asset.
- [ ] The first action a developer takes — copy the install command — is available in the
      hero, without scrolling.
- [ ] Every claim the page makes in passing links to the section that proves it, and every
      in-page anchor on the page resolves to an id that renders.
- [ ] A desktop reader 15 blocks deep can see where they are. (Desktop-scoped on purpose:
      below 900px the nav collapses into a drawer, so there is no visible nav to indicate
      position — see FR-5.)
- [ ] The mobile hero is shorter by the nine-line block that duplicates a beat the hero
      terminal already landed. Not "the CTAs are above the fold" — FR-6 cannot deliver that
      and says so.
- [ ] No landing content export exists without at least one **other** source under
      `apps/web/app` referencing it. (Deliberately "referencing", not "rendering" — FR-7
      states why the stronger claim is not the one being made.)

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
Every "current" value below was produced by a command, and the command is named beside it.
Three earlier rounds each shipped one loose number here; a measured value without its
measurement is the defect this table exists to prevent.

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| `og:image` / `twitter:image` emitted for `/` | **0 of each**, while `twitter:card` declares `summary_large_image` — grep of the meta tags in `.next/server/app/index.html` | both present, image absolute under `metadataBase`, 1200×630 | `pnpm --filter web test test/metadata.test.ts` |
| Copy affordances for the install command in the hero | 0 — `HeroTerminal` types the command with no control (`hero-terminal.tsx:71-91`) | 1 | `pnpm --filter web test test/landing.test.tsx` |
| TrustStrip claims rendered as links | 0 of 3 — all three are `<span>` (`index.tsx:136-153`) | 3 of 3 | `pnpm --filter web test test/landing.test.tsx` |
| Anchor targets that exist for a TrustStrip claim | 2 of 3 — `#ledger` and `#proof` render; `Refusal` carries no id (`index.tsx:426`) | 3 of 3 | `pnpm --filter web test test/landing.test.tsx` |
| Orphaned anchors — rendered `href="#…"` with no matching id | **0**, measured by rendering all 23 blocks and diffing hrefs against ids | 0, asserted for every anchor instead of assumed | anchor-closure test (FR-4) |
| Exports of `sections/content.ts` with no reference outside the declaration file | 1 — `PROOF`, the only one of 38, by word-anchored token census | 0, asserted | `pnpm --filter web test test/content-web.test.ts` |
| Routes emitting product-page metadata | 2 — `/` and `/alt` emit byte-identical metadata, and `alt.html` has no `robots` meta | 1 | `pnpm --filter web test test/metadata.test.ts` |
| External origins fetched by the built app | 0 — `node scripts/check-static-egress.mjs` reports `[egress] clean` | 0, unchanged; the OG card must not regress it | `node scripts/check-static-egress.mjs` |
| `HandoffCard` rendered in the mobile hero at ≤900px | 1 — the card is in the collapsed grid's second item | 0, with no second copy anywhere in the document | `pnpm --filter web test test/landing.test.tsx` + `test/a11y.test.ts` |
| Mobile hero block height at 375px | not yet measured — the operator records it **before** the change | measurably shorter by the card's height | operator row, real browser |

The CTAs are deliberately absent from this table. FR-6 cannot lift them above the fold and
says why; see the Non-Goal.

---

## 3. User Stories

#### User Story 1 — the shared link

```
As someone who saw ProveGate mentioned in a thread,
I want the link to render a card that says what it is,
so that I can tell whether to open it.
```

**Acceptance Criteria:**

- [ ] A 1200×630 card renders for `/`, generated locally, with no external request.
- [ ] Its colours come from `@provegate/design/tokens`, not a second copy of the hexes.
- [ ] No metadata field declares a card type the page cannot supply.

#### User Story 2 — the first thirty seconds

```
As a developer evaluating the tool,
I want to copy the install command from the first screen,
so that I can try it before I decide to read anything.
```

**Acceptance Criteria:**

- [ ] The hero exposes one copy control whose payload is the real install command.
- [ ] It works before the typing animation finishes and under `prefers-reduced-motion`.
- [ ] Nothing about the animation is faked to accommodate it.

#### User Story 3 — the skeptic

```
As a reader who distrusts marketing claims,
I want each claim in the trust strip to take me to the evidence,
so that the page argues the way it says arguments should work.
```

**Acceptance Criteria:**

- [ ] Each of the three strip items is a real anchor to the section that substantiates it.
- [ ] The `Refusal` section is addressable.
- [ ] A test proves every anchor on the page has a target — not just the three new ones.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch.

1. **FR-1**: A locally generated OG card exists for `apps/web`, and the social metadata
   declares exactly what it can supply. Mirror the shipped docs pattern
   (`apps/docs/app/og/docs/[...slug]/route.tsx`): `next/og` `ImageResponse`, 1200×630,
   colours read from `@provegate/design/tokens` (Satori cannot read CSS custom properties,
   and `content-web.test.ts` forbids a raw hex under `app/`), Satori's built-in typeface —
   the packaged woff2 is not consumable there, so identity carries through colour, mark and
   layout. `apps/web` has one static card and no `[...slug]`, so the file convention
   `app/opengraph-image.tsx` replaces the dynamic route, and with it the docs route's input
   bounding: a static card has no input to bound.

   **Declare neither `openGraph.images` nor `twitter.images`.** This is the opposite of the
   obvious move and it is measured, not assumed. In the installed `next@16.2.11`,
   `dist/lib/metadata/resolve-metadata.js:137-157` applies file-based `opengraph-image`
   metadata **only when the level's own metadata has no `images` key** — its comment says so
   verbatim — and gates `twitter` the same way. Declaring either key switches the file
   convention **off** and forces a hardcoded route path. `:619-653` then fills
   `twitter.images` from the resolved `openGraph.images`, so one file feeds both. The
   omission must carry a comment citing that line, so a later reader sees a decision rather
   than an oversight. Keep the module directly under `app/` and out of any route group:
   `get-metadata-route.js:45-46` leaves the path un-suffixed (`/opengraph-image`) only
   outside a group.

   **Two levels of assertion, because either alone is a proxy.**
   *Source level* — the coherence triple: (i) `apps/web/app/opengraph-image.tsx` exists and
   its source declares a default export, `ImageResponse`, and the shared `size`; (ii) the
   exported `metadata` declares **no** `images` key under `openGraph` and none under
   `twitter`; (iii) `metadata.twitter.card` is `summary_large_image`. Any two without the
   third is the defect. Feasibility measured: `await import('../app/layout')` resolves in
   this vitest setup despite two stylesheet imports, and yields `openGraph` keys
   `[title, description, url, siteName, type]` — no `images`.
   *Emitted level* — read `apps/web/.next/server/app/index.html` and assert an `og:image`
   absolute under `metadataBase`, `og:image:width`/`height` of 1200/630, and a
   `twitter:image`. The source triple checks what is declared; the acceptance criteria
   describe what an unfurl does, and a framework change to the `:137` gate could suppress
   the card with all three source parts still true.

   **Both emitted-level rows guard against absence *and* staleness.** An absent build file
   fails the row rather than skipping it — that is `false-green-on-missing-file`. Staleness
   is the subtler half: `gates.manifest.json` builds before Phase 5 and root turbo `test`
   depends on `build`, but the §11 command invokes package vitest directly and Phase 4 is
   skippable via `--from-phase=5` (`chain.ts:88`), so an old `.next` tree could certify a
   card nobody produced. The row therefore requires a fresh `pnpm --filter web build` as an
   executable prerequisite, and Phase-5 resume is not a valid path for it.

   **Content, so the implementer never invents copy.** Non-Goals forbid new claims, so the
   card composes only strings that already exist — but they must first *be* strings. Neither
   is reusable today: the wordmark is split JSX (`ui.tsx:147`) and the title is a nested
   `metadata` property (`layout.tsx:9`). So introduce two constants in `sections/content.ts`,
   `PRODUCT_NAME` and `SITE_TITLE`, holding the values already shipped, and have
   `layout.tsx`, the card's JSX and the card's `alt` all consume them — one declaration, no
   drift. `PRINCIPLES` (`content.ts:306`) is the footer line. Export
   `size = { width: 1200, height: 630 }` and pass that same object to `ImageResponse`, plus
   `contentType = 'image/png'` and an `alt` equal to `SITE_TITLE`. The mark is the green
   token square the docs card already draws (`route.tsx:54-62`), not a new asset.
   - **Targets:** `apps/web/app/opengraph-image.tsx`, `apps/web/app/layout.tsx`,
     `apps/web/app/sections/content.ts::SITE_TITLE`,
     `apps/web/app/sections/content.ts::PRODUCT_NAME`, `apps/web/test/metadata.test.ts`
2. **FR-2**: The hero carries one copy control for the install command. Its accessible name
   matches `/copy/i`, its payload is the install string from `sections/content.ts` (never a
   second literal), and it is operable before the typing animation settles and when
   `prefers-reduced-motion: reduce` renders the finished state immediately. Clipboard access
   degrades to a no-op where `navigator.clipboard` is absent (jsdom) without throwing. No new
   primitive is needed: `TermBar` already accepts `children` for trailing controls and
   `termButton` exists for this chrome (`ui.tsx:173-211`).
   - **Targets:** `apps/web/app/sections/hero-terminal.tsx`,
     `apps/web/app/sections/index.tsx::Hero`, `apps/web/test/landing.test.tsx`
3. **FR-3**: The install command is authored once in `sections/content.ts`. Measured, it is
   authored **three** times today: `:18` (`HERO.install`), `:35` (`HERO_TERMINAL.steps`) and
   `:350` (`INSTALLERS[0].code`). After this FR all three derive from one declaration and the
   rendered output of each is byte-identical to today's.

   **Assert the derivation, not the character count.** The invariant is that the three
   consumers cannot drift apart, which is a property of their *values*: `INSTALLERS`' npm
   `code` equals `HERO.install`, and `HERO.install.split('\n')` equals
   `HERO_TERMINAL.steps.slice(0, 2)` — the terminal's third step (`npx gate run PRD-001`) is
   deliberately not part of the install pair. A source-text count is secondary and must
   tolerate prose: strip comments before counting, since a doc comment quoting
   `npm install -D provegate` is not a duplication and must not fail the gate.
   - **Targets:** `apps/web/app/sections/content.ts`, `apps/web/test/content-web.test.ts`
4. **FR-4**: Claims link to evidence, and every anchor resolves. `Refusal` gains
   `id="refusal"`. Each `TRUST_STRIP` entry carries its own href — the ledger claim to
   `#ledger`, the 80+-agents claim to `#proof`, the push claim to `#refusal` — and renders
   as a focusable `<a>`, not a `<span>`. The test collects **every** `href="#…"` in the
   fully rendered page and asserts a matching `id` renders; it must fail if any existing nav
   or footer anchor is ever orphaned, not only the three added here. The rendering is proven
   feasible, not assumed: all 23 composition blocks render into one container and
   `render(<Page />)` also works in this jsdom setup (measured — the existing suite reads
   `page.tsx` as *text* at `landing.test.tsx:49`, which had suggested otherwise). `<Page />`
   is preferred because it asserts over the real composition. Today's orphan count is
   **zero**, so this installs a regression floor on a clean surface rather than fixing a
   broken link; the actual gap is that `#refusal` has no target to point at.
   - **Targets:** `apps/web/app/sections/index.tsx::Refusal`,
     `apps/web/app/sections/index.tsx::TrustStrip`,
     `apps/web/app/sections/content.ts::TRUST_STRIP`, `apps/web/test/landing.test.tsx`
5. **FR-5**: The sticky nav shows the active section, with `aria-current="location"` on the
   active link and nothing else. `location` is the token whose definition matches what this
   indicator means — the current position within a set — where `page` means the current page
   among pages and `step` a step in a process; `true` is the unqualified fallback and says
   less than the markup knows.

   **The algorithm, and why the obvious one is wrong.** An `IntersectionObserver` callback
   does **not** carry a snapshot of every currently-intersecting target: entries are queued
   only for targets that crossed a configured threshold. So "among the entries in this
   callback, greatest `intersectionRatio`" is broken — a callback reporting a newly-visible
   section at 0.1 would displace a still-visible section at 0.8. Instead: declare explicit
   `thresholds` (0, 0.25, 0.5, 0.75, 1), maintain a **per-target ratio map** that each
   callback *updates* rather than replaces, and take the active section as the map's maximum,
   tie-broken by `NAV_LINKS` order. When every ratio is 0 — above the first section or below
   the last — the previously active link stays active rather than flickering to none.
   The test must drive **sequential** callbacks, not one batch: A at 0.8, then a later
   callback reporting only B at 0.1, then A exiting. A single batched two-entry test proves
   sorting and nothing about retention.

   **Which nav owns it.** `Nav` maps `NAV_LINKS` **twice** — the desktop strip
   (`nav.tsx:104`) and the mobile drawer (`nav.tsx:159`). `aria-current` belongs to the
   **desktop strip only**. Mechanically: `.pg-navlinks` is `display: none` at ≤900px
   (`globals.css:147-150`) but stays in the DOM, so marking both renders two `aria-current`
   links whenever the drawer is open. Semantically: the drawer is a menu the reader
   deliberately opened and it closes on selection (`nav.tsx:163`), not a position indicator.
   Consequence, stated rather than hidden: below 900px there is no visible active indicator,
   because below 900px there is no visible nav to carry one — which is why the Goal is scoped
   to the desktop reader. The test asserts **exactly one** `aria-current` across the whole
   `Nav` render, with the drawer open.

   When `IntersectionObserver` is undefined (jsdom, no-JS), the nav renders with no active
   link and does not throw — the same defensive shape `hero-terminal.tsx:43` already uses.
   Activation must not reflow text: the indicator occupies its space whether active or not.
   - **Targets:** `apps/web/app/sections/nav.tsx`, `apps/web/test/landing.test.tsx`
6. **FR-6**: The mobile hero drops the `HandoffCard`. At ≤900px the card's wrapper class is
   `display: none` in `globals.css`; **no second DOM copy** is rendered anywhere to
   compensate. This is acceptable because the hero terminal's closing lines
   (`content.ts:42-43`) already state the same fact in text, and those lines must remain —
   they are what carries the beat for the mobile reader and for a screen reader, since
   `display: none` removes the card from the accessibility tree too. The full card returns at
   ≥901px, where the handoff design puts it.

   **What FR-6 does NOT do, measured.** It does not lift the CTAs above the fold, and no
   version of it can. The hero is a two-item grid: the **first** item holds the eyebrow, h1,
   lede, terminal, both CTAs and the principles line; the **second** holds the `HandoffCard`
   (`index.tsx:59-117` — the left `<div>` closes at 109, the `<Reveal><HandoffCard/></Reveal>`
   follows it). At ≤900px `globals.css:132-143` only collapses the grid to one column, so the
   card renders *after* the CTAs. Hiding a later element cannot move an earlier one upward.
   FR-6's deliverable is a shorter mobile hero — one nine-line block gone — and nothing about
   the fold. No metric, criterion, operator row or Goal in this PRD may claim otherwise; the
   two changes that would lift the CTAs are a Non-Goal below.

   **The assertion must bind the class to the card, or it proves nothing.** A CSS-rule check
   plus a one-card DOM count is green even if the wrapper never carries the class. So the
   test does both halves and *joins* them: render `Hero` in jsdom, assert the single
   `HandoffCard` is inside an element carrying the exact wrapper class, and assert that same
   class name appears inside the `max-width: 900px` block of `globals.css`. The class name is
   the shared term between the two assertions and must be read from one place, not typed
   twice. The DOM half lives in `landing.test.tsx` (which has the jsdom pragma); the
   stylesheet half in `a11y.test.ts` (which reads CSS as text and has no pragma). Measured
   baseline: the hero renders exactly one card today.
   - **Targets:** `apps/web/app/globals.css`, `apps/web/app/sections/index.tsx::Hero`,
     `apps/web/test/a11y.test.ts`, `apps/web/test/landing.test.tsx`
7. **FR-7**: No landing content export is unreferenced. Delete `content.ts::PROOF`, and add
   the general rule as a test: every export of `sections/content.ts` is referenced by at
   least one **other** source under `apps/web/app`. This is `gate-wire-or-delete` applied to
   the landing's content layer, so the defect cannot silently return.

   **Two ways this census goes vacuous, both measured, both must be closed.** First, the scan
   scope: `content.ts` is itself under `apps/web/app`, and every export names itself at its
   own declaration — including the declaration file means every export is trivially
   "referenced". Exclude the declaration file. Second, token anchoring: `PROOF` is a
   **prefix of `PROOF_EVIDENCE`** (`:284` vs `:291`), so a substring scan greens the exact
   orphan this FR exists to delete. Match word-anchored identifier tokens (`\bNAME\b`), never
   `includes()`, and enumerate the export forms the scanner recognizes so a new form cannot
   silently escape it. This is `grep-token-anchors-real-impl`, declared in Memory Inputs.

   **"Referenced", not "rendered" — and the gap is stated, not papered over.** A token scan
   cannot tell a render from a dead constant, and `apps/web/tsconfig.json` does not set
   `noUnusedLocals`, so nothing else closes the difference. Proving *render* use needs a
   parser and reachability analysis, disproportionate for one content module. So the check
   strips comments — a commented-out reference must not keep an export alive — and the Goal
   claims exactly what the check delivers. Measured: 38 exports, `PROOF` the only one with
   zero external references, so the rule passes the moment `PROOF` goes and adds no hidden
   scope.
   - **Targets:** `apps/web/app/sections/content.ts::PROOF`,
     `apps/web/test/content-web.test.ts`
8. **FR-8**: `/alt` stops competing with `/`, in search **and** in unfurls. The route stays —
   it is the owner's comparison surface — but it exports its own `metadata` with
   `robots: { index: false, follow: false }` and a title naming it a concept. Whether `/alt`
   survives to launch is not decided here.

   **`noindex` governs crawlers, not unfurls, so FR-1 hands `/alt` a problem FR-8 must
   close.** The resolver accumulates metadata down the segment chain
   (`resolve-metadata.js:764-800` threads `resolvedMetadata` through each item), so the root
   `app/opengraph-image.tsx` reaches `/alt` and, left alone, `/alt` unfurls as the product
   page. The lever is that an `openGraph` declaration **replaces** the resolved object
   wholesale rather than merging field-wise (`:182-190`). So `/alt` declaring
   `openGraph: { title, description }` — and, per FR-1's rule, **no** `images` key — drops the
   inherited card and unfurls imageless under its own name. That is the intended outcome for
   an internal comparison surface, not a regression. Verified by execution, not reading:
   invoking `accumulateMetadata` with these shapes yields `/` →
   `https://provegate.dev/opengraph-image` in both Open Graph and Twitter, and `/alt` → own
   title, no image, `card: summary`, `noindex, nofollow`.

   Because the image goes, the card *type* must go with it: `/alt` also declares
   `twitter: { card: 'summary' }`, so the level cannot inherit a `summary_large_image`
   declaration whose image it no longer has. Shipping that inherited card type onto an
   imageless page would reintroduce FR-1's defect one route over.

   **Asserted on the emitted metadata, and the measured before-state makes the case.**
   `apps/web/.next/server/app/alt.html` today emits **metadata byte-identical to `/`** — the
   same `og:title`, the same `og:description`, the same `twitter:card="summary_large_image"`,
   and **no `robots` meta at all**. (The files themselves are not identical: 233,709 B vs
   101,898 B. Only the metadata is.) `/alt` is currently indistinguishable from the product
   page to every crawler and unfurl client. After this FR, `alt.html` must emit its own
   title, **no** `og:image`, **no** `twitter:image`, `twitter:card="summary"`, and a `robots`
   meta carrying `noindex` and `nofollow`. Same absence-and-staleness rule as FR-1.
   - **Targets:** `apps/web/app/alt/page.tsx`, `apps/web/test/metadata.test.ts`

---

## 5. Non-Goals (Out of Scope)

- **Section order, merges, and moves.** The review proposed collapsing `InstallTabs` into
  `Install`, thinning `Problem`, and promoting `Playground` above `RunWalkthrough`. The
  order is the owner-approved handoff's (`docs/design/design_handoff_landing/landing-app.jsx:10`,
  `PG_ORDER`) and `landing.test.tsx:15-56` locks it as strictly increasing positions in
  `page.tsx`. Changing it costs an amended handoff plus a rewritten narrative test, and the
  `Playground`-first proposal is also arguable on merit: `RunWalkthrough` teaches the
  gates-in/evidence-out model that the manifest editor assumes. Owner decision, separate PRD.
- **Hero CTA hierarchy.** Two primaries exist today — nav "Get started" → `#install`
  (`nav.tsx:130`) and hero "Read the spec" (`index.tsx:99`). Real conflict, but the hero
  CTAs come from the handoff; flipping them is a design question, not polish. FR-2 makes the
  install action reachable without touching the button hierarchy.
- **Lifting the mobile CTAs above the fold.** Two changes would do it, and neither is taken
  here: reduce the hero terminal's 188px `minHeight` (`hero-terminal.tsx:70`), or reorder the
  CTAs ahead of the terminal at ≤900px. The first shrinks the animated run — the hero's proof
  beat — to buy layout. The second reverses the argument's order on mobile (thesis → lede →
  *ask* → evidence), a narrative decision belonging to the design handoff, not to a polish PRD.
  FR-6 shortens the hero without touching either. If the fold is worth the trade it deserves
  its own owner decision, and FR-6's measurement is the input for it.
- **A union merge driver for `_brain/INDEX.md`, and the cross-PRD INDEX collision.** Every
  memory-producing PRD needs the same one-line append and none of PRD-024/025/026/028 declares
  it, so the collision is invisible to the path-conflict gate repo-wide. Fixing that means both
  a `.gitattributes` driver **and** a `sharedAppendOnly` entry — overlap subtraction reads
  configuration only, never `.gitattributes` (`conflicts.ts:63`), so neither alone is enough.
  That is memory-substrate work; this PRD only declares its own write.
- **The `/` vs `/alt` concept contest.** FR-8 only stops `/alt` from being indexed and
  mistaken for the product page.
- **New copy or new claims.** Every string still traces to `sections/content.ts` and the
  design brief. Nothing new is asserted about the tool.
- **`apps/docs`.** Its OG route already exists and is untouched; this PRD reads it as the
  pattern to follow.
- **A published release.** `web` is `private: true`, so changesets skips it; no changeset
  and no version bump.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a link to `https://provegate.dev/`, **When** it is unfurled by a client that
  honours `twitter:card`, **Then** a 1200×630 card renders, and no metadata field promises a
  card type without an image behind it.
- **Given** `layout.tsx`, **When** its exported `metadata` is inspected, **Then** neither
  `openGraph` nor `twitter` declares an `images` key — because declaring one suppresses the
  file-convention card (`resolve-metadata.js:137-157`) — and a comment in place says so.
- **Given** a freshly built `apps/web`, **When** `.next/server/app/index.html` is read, **Then**
  it emits `og:image` (absolute), `og:image:width` 1200, `og:image:height` 630 and
  `twitter:image`; and **When** the build output is absent, **Then** the check fails rather
  than skipping.
- **Given** the built app, **When** `check-static-egress.mjs` runs, **Then** it reports zero
  external origins — the OG card added no font, image or beacon fetch.
- **Given** the hero on first paint, **When** the reader activates the copy control before
  the typing animation finishes, **Then** the real install command is copied and the
  animation is unaffected.
- **Given** `prefers-reduced-motion: reduce`, **When** the hero renders, **Then** the
  finished state and the copy control are both present, with no typing and no caret blink.
- **Given** the fully rendered page, **When** every `href="#…"` is collected, **Then** each
  one has a matching `id` in the render — including the nav and footer anchors that predate
  this PRD.
- **Given** a reader scrolled to the ledger with the mobile drawer open, **When** the whole
  `Nav` is inspected, **Then** exactly one link carries `aria-current="location"`, it is in the
  desktop strip, and no text has shifted position.
- **Given** a browser with no `IntersectionObserver`, **When** the nav mounts, **Then** it
  renders with no active link and throws nothing.
- **Given** a 375×667 viewport, **When** the page loads, **Then** the `HandoffCard` is absent
  from the hero, no second copy appears elsewhere in the document, and the hero block is
  measurably shorter than the recorded before-value. The CTAs are **not** claimed above the
  fold.
- **Given** the rendered `Hero`, **When** the single `HandoffCard` is located, **Then** it sits
  inside an element carrying the wrapper class that `globals.css` hides inside its
  `max-width: 900px` block — the class is the joining term, asserted on both sides.
- **Given** `sections/content.ts`, **When** its exports are enumerated, **Then** every one is
  referenced by a source under `apps/web/app`, and `PROOF` is gone.
- **Given** a freshly built `/alt`, **When** `alt.html` is read, **Then** it emits its own
  concept title, **no** `og:image`, **no** `twitter:image`, `twitter:card="summary"`, and a
  `robots` meta carrying `noindex` and `nofollow`.
- **Given** `sections/content.ts`, **When** the install declaration is compared to its three
  consumers, **Then** `INSTALLERS`' npm `code` equals `HERO.install` and `HERO.install`'s two
  lines equal the first two `HERO_TERMINAL.steps` — and a doc comment quoting the command
  fails nothing.
- **Given** the export census, **When** it runs, **Then** it excludes `content.ts` itself and
  matches word-anchored tokens, so `PROOF` is **not** kept alive by `PROOF_EVIDENCE`.
- **Given** a scroll position where two sections intersect in separate observer callbacks,
  **When** the nav recomputes, **Then** the section with the greater retained ratio is active —
  not merely the one reported most recently.

---

## 7. Technical Considerations

### Architecture

**The OG card is a port, not a design.** `apps/docs/app/og/docs/[...slug]/route.tsx` already
solved every hard part and recorded why in place: tokens instead of hexes because Satori
cannot read CSS custom properties; the built-in typeface because Satori cannot consume the
packaged woff2; `revalidate = false`. `apps/web` has one static card, so the file-convention
`app/opengraph-image.tsx` replaces the dynamic route.

**The declaration that must not be written.** The instinct is to declare `openGraph.images`
next to the file so a test can read it. That instinct is wrong here, and the resolver settles
it rather than an argument: `resolve-metadata.js:137-157` merges file-based image metadata
**only** when the level declares no `images` key. Declaring it suppresses the file and hands
the implementer a hardcoded path to maintain. FR-1 therefore asserts a coherence triple on the
source **and** the emitted tags on the built output — see FR-1 for why neither level alone is
enough.

**Why an anchor-closure test rather than three assertions.** Three new hrefs are three new
chances to rot. The page has **no** orphaned anchor today — all six rendered anchors resolve,
measured by rendering the whole composition — so this installs a regression floor while the
surface is clean rather than fixing a bug. Asserting the closed set (every rendered
`href="#…"` has a rendered `id`) costs the same to write as three individual assertions and
turns a class of defect into a gate. Same reasoning as `gate-wire-or-delete`, applied to
anchors.

**The mobile fold is a content decision, not a CSS trick.** Two DOM copies of the
`HandoffCard` behind media queries would duplicate content in the accessibility tree and
double the maintenance. Hiding it at ≤900px loses the card for mobile and screen-reader
users, and that is only acceptable because the hero terminal states the same fact in text
directly above it. FR-6 therefore pins those lines as load-bearing: they may not be removed
to shorten the hero further.

**Clipboard.** `navigator.clipboard.writeText` is a platform API — no dependency. It is
undefined in jsdom and in insecure contexts, so the handler must guard rather than throw;
the test asserts the control's presence and payload wiring, and the real copy is an operator
row.

### Dependencies

- none. `next/og` ships inside `next` (already a dependency of `apps/web`); the clipboard is
  a platform API; `@provegate/design/tokens` is an existing workspace export.

### Rollback

Six of the eight FRs revert cleanly and independently: they are additive or deletive changes
to a private, unpublished app with no data, no schema and no consumer. `web` is
`private: true`, so changesets skips it — no version to unpublish, no adopter to migrate.

**FR-1 and FR-8 are one ordered rollback unit.** FR-8 exists *because* FR-1 makes the root
card reach `/alt`. Reverting FR-8 alone leaves the root card in place with no override on
`/alt`, restoring exactly the impersonating unfurl FR-8 was written to prevent, on a page that
is once again indexable. The rule: **revert FR-1 first, or revert both together.** Never FR-8
alone.

**FR-1 is also asymmetric in time.** A `git revert` restores the repository, but X, Slack,
LinkedIn and every other unfurl consumer **caches the card it already fetched**, on their
schedule. A wrong card outlives its revert by hours to days, and the remedies are per-platform
cache-purge tools the repository does not control.

The consequence is an **ordering constraint, not a rollback plan**: the real-unfurl operator
rows in §11 are a **precondition to sharing either URL anywhere** — a README, a post, a
message — not post-hoc checks. This is the one place in this PRD where "ship it, revert if
wrong" does not hold, and it is why FR-1's verification includes a human step at all.

Two smaller notes, so nobody looks for a plan that isn't needed:

- **FR-8** reverts freely on its own terms, but only after FR-1. A crawler that already indexed
  `/alt` drops it on its next crawl; no action, just latency.
- **FR-7** (deleting `PROOF`) feels irreversible and isn't: the content is in git history, and
  `PROOF_EVIDENCE` already carries the same facts in the copy that actually renders.

---

## 8. Implementation Scope

### In Scope

- [ ] `apps/web/app/layout.tsx` — social metadata coherence (FR-1)
- [ ] `apps/web/app/opengraph-image.tsx` — new, the card (FR-1)
- [ ] `apps/web/app/sections/hero-terminal.tsx` — copy control (FR-2)
- [ ] `apps/web/app/sections/content.ts` — install single-sourced, `TRUST_STRIP` hrefs,
      `PROOF` deleted (FR-3, FR-4, FR-7)
- [ ] `apps/web/app/sections/index.tsx` — `Refusal` id, `TrustStrip` anchors, hero card
      wrapper class (FR-4, FR-6)
- [ ] `apps/web/app/sections/nav.tsx` — active-section state (FR-5)
- [ ] `apps/web/app/globals.css` — the ≤900px rule (FR-6)
- [ ] `apps/web/app/alt/page.tsx` — own metadata, noindex (FR-8)
- [ ] `apps/web/test/metadata.test.ts` — new
- [ ] `apps/web/test/landing.test.tsx`, `apps/web/test/content-web.test.ts`,
      `apps/web/test/a11y.test.ts` — extended, never weakened
- [ ] `_brain/learnings/metadata-declares-what-it-cannot-provide.md` — the Memory Output
- [ ] `_brain/INDEX.md` — **one appended pointer line** for the learning above. In scope
      because `_brain/PROTOCOL.md:219-224` makes indexing step 4 of the capture protocol: a
      learning without its pointer is not captured. Without this line an implementing agent
      hits the out-of-scope stop-and-ask at Phase 7, on a write the method itself requires.

---

## 9. Open Questions

- [ ] none. Two questions were resolved as Non-Goals rather than deferred: section order and
      hero CTA hierarchy both belong to the design handoff, and each is named above with the
      cost of changing it. `/alt`'s survival to launch is likewise out of scope — FR-8 makes
      the route harmless either way, so nothing here blocks on the answer.

---

## 10. References

- PRD-013 (`_prds/completed/prd-013-landing-page.md`) — the landing's constraints: no
  external requests, copy discipline, the real CLI surface.
- `docs/design/design_handoff_landing/landing-app.jsx:10` — `PG_ORDER`, the locked order.
- `docs/design/design_handoff_landing/README.md:60-64` — render `PG_ORDER` unconditionally;
  the theme toggle is real product behaviour.
- `apps/docs/app/og/docs/[...slug]/route.tsx` — the OG pattern being ported.
- `scripts/check-static-egress.mjs` — what "no external request" is measured by.

---

## Memory Inputs

- applied: `grep-token-anchors-real-impl` — FR-7's census is exactly the shape this record
  warns about, and it was measured failing: `PROOF` is a **prefix of `PROOF_EVIDENCE`**
  (`content.ts:284` vs `:291`), so a substring scan would green the orphan the FR exists to
  delete. FR-7 therefore matches word-anchored identifier tokens, never `includes()`, and
  enumerates the export forms it recognizes.
- applied: `false-green-on-missing-file` — FR-1 and FR-8 assert against built HTML
  (`.next/server/app/index.html`, `alt.html`). If a route stops being prerendered the file
  vanishes and a naive check skips instead of failing, certifying a card nobody verified. Both
  rows fail explicitly on an absent build file — and, because absence is only half of it, also
  require a fresh build so a stale tree cannot certify either.
- applied: `gate-wire-or-delete` — FR-7 is this record applied to the landing's content
  layer: the unreferenced `PROOF` export is deleted, and the rule is added as a test so an
  export cannot outlive its render again. FR-4's anchor-closure test is the same record
  applied to anchors — a declared link with no target is an unwired surface.
- applied: `score-must-equal-weighted-sum` — the declared 3.40 equals the arithmetic shown
  under the header. The candidate lands exactly on the threshold and was deliberately not
  rounded up; the header comment says what to do if the owner scores a dimension lower.
- applied: `notes-column-runs-commands` — it is still unfixed in the parser: `safety.ts:47-59`
  extracts every backticked span on an `| FR-N` row, exempting only extension-terminated
  paths, and the record's interim rule is therefore live. The first `gate check PRD-027` run
  refused two Notes-column spans as unsafe commands, so §11's Notes cells carry no backticks
  and a comment under the table says why.
- reviewed: `turbo-cache-masks-out-of-input-reads` — `landing.test.tsx:49` reads
  `../app/page.tsx` with `readFileSync`, which is the stale-green shape this record
  describes. Checked `turbo.json`: the `test` task declares no `inputs`, so the default
  input set is the whole `apps/web` package and `app/page.tsx` is inside it. A change to
  `page.tsx` does invalidate the cache. No change needed, and no `inputs` key may be added:
  `scripts/verify/verify-turbo-inputs.mjs` already refuses one as a blanket rule, for the
  reason this record gives.
- reviewed: `push-is-human-by-omission` — FR-4 makes the `Refusal` section addressable and
  links a claim to it. That section is the page's statement of this invariant; the change
  adds an `id` and an anchor, no code path. The omission stays an omission.
- reviewed: `memory-index-vs-detail` — it governs the single output below: the durable fact
  is a platform behaviour the repo does not record, not a description of this diff. The
  eight FRs themselves are derivable from the code and are not written to `_brain`.

---

## Memory Outputs

- learning: `_brain/learnings/metadata-declares-what-it-cannot-provide.md` — a metadata
  field that declares a capability without shipping the asset behind it degrades **silently**:
  `twitter.card: 'summary_large_image'` with no image produces no card, no build error, no
  lint warning and no test failure. The durable rule is the coherence assertion — when a
  declaration names a richer form, assert in a test that the asset it promises exists — and
  it generalizes past OG cards to any declared-capability field.

---

## Conflict Surface

- `apps/web/app/**`
- `apps/web/test/**`
- `_brain/learnings/metadata-declares-what-it-cannot-provide.md`
- `_brain/INDEX.md`

**Why `_brain/INDEX.md` is claimed even though it looks like a shared append-only file.**
Measured, because the rule turns on configuration rather than intuition: the default
`sharedAppendOnly` set is exactly `package.json`, `pnpm-lock.yaml`, `README.md`, `CLAUDE.md`,
`AGENTS.md` (`packages/provegate/src/core/config/defaults.ts:95`) — `INDEX.md` is **not** in
it, and this repo has **no `.gitattributes`**, so no union-merge driver exists for it either.
Two concurrent appends therefore produce a real conflict with nothing to resolve it
automatically. Leaving the path undeclared would not avoid the collision; it would only hide
it from the path-conflict gate, the one thing that can warn at claim time. Claiming it
serializes the INDEX append across memory-producing PRDs, and given the absent merge driver
that serialization is correct rather than over-claiming.

Two limits on that reasoning, stated so it is not read as a fix: overlap subtraction consults
**configuration only**, never `.gitattributes` (`conflicts.ts:63`), so adding a union driver
would not by itself change queue behaviour; and PRD-024, PRD-025, PRD-026 and PRD-028 all
declare new memory records **without** declaring the INDEX write, so the repo-wide collision
stays invisible to the gate no matter what this PRD does. Both are Non-Goals above.

Not claimed, deliberately: `apps/docs/**` (read as the OG pattern, never written) and
`scripts/check-static-egress.mjs` (executed as a gate, never edited — if the OG card trips
it, the card is wrong, not the check). Measured with `gate queue` on 2026-07-27: no active
claim overlaps `apps/web/**` or `_brain/**`. Re-run `gate queue` before claiming — and expect
an INDEX overlap the moment another memory-producing PRD declares the same path.

---

## Durable Artifacts

- Review artifact: `_docs/reviews/review-027-landing-adoption-polish.md`
- Learning: `_brain/learnings/metadata-declares-what-it-cannot-provide.md` — the Memory
  Output above, repeated here because the two lists are one contract
- Index pointer: `_brain/INDEX.md` — the one-line hook for the learning above. Named here as
  well as in the Conflict Surface because `_brain/PROTOCOL.md:219-224` makes indexing part of
  capture, so a close whose diff lacks this line captured nothing
- Decision: `none` — no architectural decision is taken. Every FR either wires something the
  page already declared or ports a pattern already decided in `apps/docs`.

---

## 11. Verification Commands

Run from the repo root after `pnpm build`.

| FR   | Command / Check | Scope | Notes |
| ---- | --------------- | ----- | ----- |
| FR-1 | `pnpm --filter web build` | web | a fresh build, so the emitted-metadata rows below cannot read a stale tree |
| FR-1 | `pnpm --filter web test test/metadata.test.ts` | web | the source coherence triple plus the emitted og:image, its 1200x630 dimensions and the twitter image; an absent build file fails the row |
| FR-1 | `node scripts/check-static-egress.mjs` | root | the OG card fetches nothing external |
| FR-2 | `pnpm --filter web test test/landing.test.tsx` | web | hero copy control, real payload, reduced-motion |
| FR-3 | `pnpm --filter web test test/content-web.test.ts` | web | the three consumers derive from one declaration; comment-stripped source count as the secondary check |
| FR-4 | `pnpm --filter web test test/landing.test.tsx` | web | every rendered anchor resolves to a rendered id |
| FR-5 | `pnpm --filter web test test/landing.test.tsx` | web | retained per-target ratio map driven by sequential callbacks, document-order tie-break, exactly one location token across the whole nav with the drawer open, no-IO fallback throws nothing |
| FR-6 | `pnpm --filter web test test/a11y.test.ts` | web | the wrapper class is hidden inside the 900px block of the stylesheet |
| FR-6 | `pnpm --filter web test test/landing.test.tsx` | web | exactly one HandoffCard, and it sits inside an element carrying that same wrapper class |
| FR-7 | `pnpm --filter web test test/content-web.test.ts` | web | word-anchored token census over comment-stripped sources, excluding the declaration file |
| FR-8 | `pnpm --filter web test test/metadata.test.ts` | web | the built alt route emits its own title, no image of either kind, a summary card and a robots meta carrying noindex and nofollow; an absent build file fails the row |

<!-- No backticks in the Scope/Notes cells of an FR row: the §11 parser extracts every
backticked span on the whole row (`safety.ts:47-59`, deliberate — a bare word must surface
as unsafe rather than be silently dropped), so a backticked note becomes a candidate gate
command. See the `notes-column-runs-commands` Memory Input. -->


Cross-cutting floor (all green before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; the three existing web test files keep every assertion
- `pnpm build` — clean build
- `pnpm --filter web build` — the landing and the OG route build

Hard caps — none apply, and each is named so Phase 2 can confirm rather than assume:

- No runtime dependency is added to `packages/provegate`; this PRD does not touch the package.
- No code path that pushes to a remote is added; nothing here executes git.
- No method content (prompt, template, schema) is touched, so nothing needs source-snapshot
  traceability.

Operator-owned (real browser, recorded as `operator` rows — `skipped` is illegal):

- The install command actually reaches the system clipboard, in both themes.
- At 375×667: **record the hero block height before the change**, then confirm it shrank, that
  no `HandoffCard` renders in the hero, and that there is no horizontal scroll. The CTAs are not
  part of this row — FR-6 cannot lift them and the PRD does not claim it does.
- Scrolling `/` highlights exactly one nav link at a time, with no text shift on activation —
  including while scrolling *fast*, where threshold callbacks arrive out of order. Below 900px
  there is deliberately no indicator.
- **BLOCKING, and ordered:** the card renders correctly in a real unfurl (an OG debugger, X or
  Slack) for `/`. This row is a **precondition to the URL being shared anywhere** — a README, a
  post, a message — not a post-hoc check: unfurl consumers cache what they fetched, so a wrong
  card survives its own revert (§7 → Rollback).
- **BLOCKING, and ordered, for `/alt` too:** the same debugger shows `/alt` unfurling with its
  own concept title and **no image**, not the product card. Machine assertions cover the emitted
  tags; only a real client proves what the tags produce, and `/alt` is the route whose whole
  purpose is to not look like `/`.
- Keyboard: the three trust-strip anchors take focus, show a visible ring, and land on the
  right section.

Before Phase 2 PASS, run: `gate check PRD-027`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT reorder, merge, split or drop a section. `PG_ORDER` is owner-approved and
  `landing.test.tsx:15-56` locks it.
- DO NOT change the hero CTA hierarchy or the button variants. It is a real problem and it is
  a Non-Goal here.
- DO NOT declare `openGraph.images` or `twitter.images` in `layout.tsx`. It reads like the
  careful thing to do and it is the defect: `resolve-metadata.js:137-157` applies the
  file-convention card **only** when that key is absent. Declaring it suppresses the card and
  leaves a hardcoded route path to rot.
- DO NOT move `opengraph-image.tsx` into a route group. `get-metadata-route.js:45-46` appends a
  six-character hash to the path once it sits inside one.
- DO NOT let a missing **or stale** build file pass an FR-1 or FR-8 row. An absent
  `.next/server/app/*.html` is a failure, never a skip; a build older than the change is the
  same failure wearing a green shirt.
- DO NOT give `/alt` an `images` key to "restore" the picture FR-8 deliberately drops, and DO
  NOT leave it inheriting `summary_large_image` with no image. Both are FR-1's defect one route
  over.
- DO NOT assert FR-6 with a CSS-rule check and a card count that never meet. The wrapper class
  is the joining term: assert the card is inside it **and** that the stylesheet hides it.
- DO NOT claim the mobile CTAs are above the fold, in any section. FR-6 cannot deliver it, and
  the two changes that could are a Non-Goal with the reason stated.
- DO NOT treat an `IntersectionObserver` callback as a snapshot of what is visible. Entries
  arrive per threshold crossing; keep a per-target ratio map or the indicator will follow the
  most recent report instead of the largest section.
- DO NOT set `aria-current` on the drawer's `NAV_LINKS` map (`nav.tsx:159`). The desktop strip
  owns it; marking both yields two current links whenever the drawer is open.
- DO NOT match export names with `includes()` in FR-7's census, and DO NOT scan
  `content.ts` itself. `PROOF` is a prefix of `PROOF_EVIDENCE`, and every export names itself at
  its own declaration — either mistake greens the orphan.
- DO NOT assert FR-3 by counting the install literal in raw source. Comments are prose; the
  invariant is that the three consumers derive from one declaration.
- DO NOT skip the `_brain/INDEX.md` pointer line. A learning without its index entry is not
  captured (`_brain/PROTOCOL.md:219-224`), and the path is declared so the write is in scope.
- DO NOT state a measured number anywhere in this PRD without the command that produced it.
  Three review rounds each caught one loose figure here; the rule exists because of them.
- DO NOT write a raw hex anywhere under `apps/web/app` — including the OG card.
  `content-web.test.ts` scans every `.ts`/`.tsx`/`.css` under `app/` and fails on
  `#rrggbb`. Colours come from `@provegate/design/tokens`.
- DO NOT fetch a font, image or any other external origin for the OG card. Satori's built-in
  typeface is the answer; `check-static-egress.mjs` is the gate, and "no telemetry" is a
  product principle, not a preference.
- DO NOT render a second `HandoffCard` to solve the mobile fold, and DO NOT delete the hero
  terminal's closing handoff lines — they are what carries the beat once the card is hidden.
- DO NOT add a second literal of the install command. FR-3 exists to remove the one that is
  already duplicated.
- DO NOT invent copy, a version badge, a star count, or any claim not already in
  `sections/content.ts`.
- DO NOT add a dependency. `next/og` ships with `next`; the clipboard is a platform API.
- DO NOT let the nav active indicator change layout when it activates.
- DO NOT weaken or delete an assertion in `landing.test.tsx`, `content-web.test.ts` or
  `a11y.test.ts` to make a change pass. If an existing assertion fails, the change is wrong.
- DO NOT add an `inputs` key to any task in `turbo.json` — `scripts/verify/verify-turbo-inputs.mjs`
  refuses it as a blanket rule (exceptions file is empty), and narrowing the `test` task's key
  is precisely what would create the stale-green defect that currently cannot happen here.
- DO NOT introduce `any`, an `eslint-disable`, or a `|| true`. Surface the error verbatim.

---

## Changelog

| Date | Author | Changes |
| ---- | ------ | ------- |
| 2026-07-27 | Claude Opus 5 | Initial draft — six verified items from the independent landing review, two defects found while verifying it, two items rejected with evidence |
| 2026-07-27 | Claude Opus 5 | **Rebuilt after loss.** A concurrent session committed this PRD mid-round (`b63f5d6`, capturing the 484-line draft) and the PRD-021 land/merge commits then overwrote the uncommitted W1–W15 remediations; no stash and no dangling blob carried them (`4a16dfd`, `d4b1900`, `8ef533d` all hold one Changelog row). This row rebuilds all fifteen **and** closes Codex's iteration-3 findings in one pass, from `_readiness/wip/readiness-027-landing-adoption-polish.md`, which survived because it had been committed. **FR-1:** the `images` declaration is forbidden with the resolver cited (`resolve-metadata.js:137-157`), asserted at two levels — a source coherence triple plus the emitted `og:image` in built HTML — with absence *and* staleness failing the row, and the card's content pinned to new `SITE_TITLE` / `PRODUCT_NAME` constants because the wordmark is split JSX and the title a nested metadata property, so neither was reusable. **FR-3/FR-15:** install baseline corrected to three (`content.ts:18,35,350`), asserted as value derivation not character count. **FR-5:** `aria-current="location"`, and the algorithm rewritten — an `IntersectionObserver` callback is not a snapshot, so a retained per-target ratio map with declared thresholds replaces "greatest ratio in this callback", tested with sequential callbacks; `aria-current` belongs to the desktop strip alone, since `Nav` maps `NAV_LINKS` twice. **FR-6:** the fold claim withdrawn everywhere including the operator row, the grid geometry stated, and the assertion joined through the wrapper class so a CSS rule and a card count can no longer both pass while the card stays visible. **FR-7:** the census excludes the declaration file and matches word-anchored tokens, because `PROOF` is a prefix of `PROOF_EVIDENCE`; `grep-token-anchors-real-impl` declared as a Memory Input, alongside `false-green-on-missing-file`. **FR-8:** `/alt` drops the inherited card by declaration (`:182-190` replaces wholesale), takes `card: 'summary'`, and is asserted on emitted metadata — measured before-state: `alt.html` emits metadata byte-identical to `/` with no robots meta, though the files differ in size. **§7:** Rollback added, with FR-1+FR-8 as one ordered unit and the unfurl-cache asymmetry making the real-unfurl operator rows a precondition to sharing either URL. **Scope/Conflict Surface/Durable Artifacts:** `_brain/INDEX.md` declared in all three, with the two limits on that reasoning stated as Non-Goals. Every Success Metric now carries the command that produced its current value |
