# PRD-027: Landing Adoption Polish — a Shareable Card, a Copyable First Action, Linked Claims

> **Status**: Draft
>
> **Created**: 2026-07-27
> **Updated**: 2026-07-28
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
suggestions. Six survived verification against the code; two more defects the review missed
were found while checking it; and one item this PRD had **rejected** — the copy button —
came back at readiness iteration 4, where the rejection itself was proven wrong (the
affordance it cited as working is inert). This PRD ships the six that survived, the two new
ones, and the resurrected one as FR-9 — nine FRs. It touches **no section order and no copy
claim** — those are the owner-approved handoff's, and the parts of the review that wanted
them changed are Non-Goals with a pointer to what they'd cost.

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
| The install command is authored **four** times app-wide | Measured, not eyeballed: `npm install -D provegate` appears at `content.ts:18` (`HERO.install`), `:35` (`HERO_TERMINAL.steps`), `:350` (`INSTALLERS[0].code`) — three independent authorings in the file whose header claims to be "the single source of landing copy" — **and a fourth outside it**, `alt/page.tsx:202`, in a file that already imports `HERO` and authors the literal anyway. |
| The page advertises "copy" where nothing copies | `copyable` renders `<span aria-hidden="true">copy</span>` with no handler (`CodeBlock.tsx:52-56`); its doc comment delegates wiring to a consumer it gives no wiring point. Four call sites advertise it; zero can copy. |

One review item is **rejected** rather than deferred, because the code contradicts it:

- *"`Problem` and `Proof` both render `PROOF_STATS` — the same three stats twice."* They do
  not. `Problem` renders `PROOF_STATS` (`index.tsx:168`); `Proof` renders `PROOF_EVIDENCE`
  and `LIMITS` (`index.tsx:516`, `531`). The separation is the design decision — limits
  adjacent to evidence — and `landing.test.tsx:79-85` asserts it.

A second review item — *"terminal blocks need a copy button"* — was rejected in an earlier
revision of this PRD, **and that rejection was wrong.** The rejection claimed `copyable`
"renders one"; it renders `<span aria-hidden="true">copy</span>` with no handler and no
clipboard call, and the component's own comment says the wiring "is the consumer's"
(`packages/design/src/react/CodeBlock.tsx:11-14,52-56`) — while giving the consumer no wiring
point. No consumer wires it: all four call sites (`tabs.tsx:93`, `:121`, `index.tsx:794`,
`:797`) pass the prop and stop. The shipped page therefore **shows the word "copy" where
nothing is copyable** — this PRD's own thesis defect, one layer down, previously cited as
proof the defect was absent. FR-9 wires it for real. The narrower half of the old rejection
stands: the blocks without any affordance — hero terminal, `GateRun`, `CommandRef`, the
playground plan — are **output**, not input, and gain nothing.

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
- [ ] Every rendered "copy" affordance actually copies. A visible copy label with no
      handler is the metadata defect of FR-1 wearing a UI shirt, and after FR-9 none is left.

### Success Metrics

Every "Current" value below was produced by the **read-only command in its own cell**, run
against today's tree (a fresh `pnpm --filter web build` first for the rows that read built
HTML). The "Held by" column names the **acceptance test that will hold the target** — most
of those tests do not exist yet, which is exactly why they cannot be what measured the
current value. Three earlier rounds each shipped one loose number here, and a fourth
conflated the two kinds of command; this table exists to prevent both.

| Metric | Current — measured by | Target — held by |
| ------ | --------------------- | ---------------- |
| `og:image` / `twitter:image` emitted for `/` | **0 of each** — `grep -c 'property="og:image"' apps/web/.next/server/app/index.html` → 0, while `twitter:card` declares `summary_large_image` | both present, image absolute under `metadataBase`, 1200×630 — `test/metadata.test.ts` (new) |
| Copy affordances for the install command in the hero | 0 — `grep -cw termButton apps/web/app/sections/hero-terminal.tsx` → 0 | 1 — `test/landing.test.tsx` |
| TrustStrip claims rendered as links | 0 of 3 — `sed -n '136,153p' apps/web/app/sections/index.tsx \| grep -c '<a'` → 0 | 3 of 3 — `test/landing.test.tsx` |
| Anchor targets that exist for a TrustStrip claim | 2 of 3 — `grep -c 'id="refusal"' apps/web/app/sections/index.tsx` → 0; `#ledger` and `#proof` render | 3 of 3 — `test/landing.test.tsx` |
| Orphaned anchors in built HTML — `href="#…"` with no matching id | **0 orphans across 12 occurrences over 6 unique targets — one command emits all three numbers**: `node -e "const f=require('fs').readFileSync('apps/web/.next/server/app/index.html','utf8');const occ=[...f.matchAll(/href=\"#([^\"]+)\"/g)].map(m=>m[1]);const ids=new Set([...f.matchAll(/id=\"([^\"]+)\"/g)].map(m=>m[1]));const u=[...new Set(occ)];console.log(occ.length,u.length,u.filter(t=>!ids.has(t)).length)"` → `12 6 0` | 0, asserted for every anchor by the closure test (FR-4) |
| `copyable` call sites whose rendered control carries a handler | **4 call sites, 0 with a control — the source renders an `aria-hidden` span and no `<button>`**: `node -e "const cp=require('child_process').execSync;const n=cp('grep -rn copyable apps/web/app --include=*.tsx',{encoding:'utf8'}).trim().split('\n').length;const s=require('fs').readFileSync('packages/design/src/react/CodeBlock.tsx','utf8');console.log(n,/<button/.test(s),/aria-hidden/.test(s))"` → `4 false true` | 4 of 4, delivered through the client entry — design `props.test.tsx` + built-output directive assertion + `test/landing.test.tsx` (FR-9) |
| Exports of `sections/content.ts` with no reference outside the declaration file | **1 of 38 — one command emits the census and the unreferenced list**: `node -e "const f=require('fs').readFileSync('apps/web/app/sections/content.ts','utf8');const N=[...f.matchAll(/^export (?:const\|function) (\w+)/gm)].map(m=>m[1]);const cp=require('child_process').execSync;let u=[];for(const n of N){try{cp('grep -rlw '+n+' apps/web/app --include=*.ts --include=*.tsx',{encoding:'utf8'}).trim().split('\n').filter(p=>p!=='apps/web/app/sections/content.ts').length\|\|u.push(n)}catch(e){u.push(n)}};console.log(N.length,JSON.stringify(u))"` → `38 ["PROOF"]` | 0, asserted — `test/content-web.test.ts` |
| Routes emitting product-page metadata | **2 — one command compares the emitted meta sets and checks robots**: `node -e "const r=p=>require('fs').readFileSync(p,'utf8');const M=f=>[...f.matchAll(/<meta [^>]*>/g)].map(m=>m[0]).sort();const a=M(r('apps/web/.next/server/app/index.html'));const b=M(r('apps/web/.next/server/app/alt.html'));console.log(JSON.stringify(a)===JSON.stringify(b),b.some(x=>/name=\"robots\"/.test(x)))"` → `true false` (sets identical, no robots) | 1 — `test/metadata.test.ts` (new) |
| External origins fetched by the built apps | 0 — `node scripts/check-static-egress.mjs` → `[egress] clean`; note the script scans **both** built apps when present, so this row is cross-cutting rather than FR-1-specific | 0, unchanged; the OG card must not regress it — same script, in the cross-cutting floor |
| `HandoffCard` **source occurrences** in the hero grid (rendered mobile absence is the operator row's claim, not this cell's) | 1 — `grep -c '<HandoffCard' apps/web/app/sections/index.tsx` → 1, inside the collapsed grid's second item | 0 source occurrences in the hero, no second copy anywhere — `test/landing.test.tsx` + `test/a11y.test.ts`; rendered 375px behaviour held by the operator row |
| Mobile hero block height at 375px | not yet measured — the operator records it in the **task artifact's Operator Handoff table** (created at Phase 3, before implementation) per §11; a Phase-6 artifact cannot hold a pre-Phase-4 value | measurably shorter by the card's height — operator row, real browser, compared against the value recorded in the task artifact |

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
- [ ] Every block elsewhere on the page that advertises "copy" actually copies — no
      aria-hidden label with no handler survives (FR-9).

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
   is reusable today: the wordmark is split JSX (`ui.tsx:157` — `Prove` and `Gate` are two
   nodes so the accent can colour the second) and the title is a nested `metadata` property
   (`layout.tsx:10`). So introduce, in `sections/content.ts`:
   `PRODUCT_NAME_PARTS = ['Prove', 'Gate'] as const` — the split the wordmark's styling
   needs, declared once — `PRODUCT_NAME` derived as the parts joined, and `SITE_TITLE`
   holding the title already shipped. **Every consumer of the name then derives from that one
   declaration**: `layout.tsx`, the card's JSX and the card's `alt` consume `PRODUCT_NAME` /
   `SITE_TITLE`, and `Wordmark` (`ui.tsx`) maps `PRODUCT_NAME_PARTS` instead of hardcoding
   the two nodes — otherwise the constant is introduced *because* the wordmark is split JSX
   while the split JSX survives beside it, which is the single-source claim made false at
   birth. `PRINCIPLES` (`content.ts:306`) is the footer line. Export
   `size = { width: 1200, height: 630 }` and pass that same object to `ImageResponse`, plus
   `contentType = 'image/png'` and an `alt` equal to `SITE_TITLE`. The mark is the green
   token square the docs card already draws (`route.tsx:54-62`), not a new asset.
   - **Targets:** `apps/web/app/opengraph-image.tsx`, `apps/web/app/layout.tsx`,
     `apps/web/app/sections/content.ts::SITE_TITLE`,
     `apps/web/app/sections/content.ts::PRODUCT_NAME`,
     `apps/web/app/sections/content.ts::PRODUCT_NAME_PARTS`,
     `apps/web/app/sections/ui.tsx::Wordmark`, `apps/web/test/metadata.test.ts`,
     `_docs/launch/announcement-draft.md` (the `## Launch checklist` section — §11)
2. **FR-2**: The hero carries one copy control for the install command. Its accessible name
   matches `/copy/i`, its payload is the install string from `sections/content.ts` (never a
   second literal), and it is operable before the typing animation settles and when
   `prefers-reduced-motion: reduce` renders the finished state immediately. Clipboard access
   degrades to a no-op where `navigator.clipboard` is absent (jsdom) without throwing. No new
   primitive is needed: `TermBar` already accepts `children` for trailing controls and
   `termButton` exists for this chrome (`ui.tsx:173-211`).
   - **Targets:** `apps/web/app/sections/hero-terminal.tsx`,
     `apps/web/app/sections/index.tsx::Hero`, `apps/web/test/landing.test.tsx`
3. **FR-3**: The install command is authored once, **app-wide**. Measured, it is authored
   **four** times today: `content.ts:18` (`HERO.install`), `:35` (`HERO_TERMINAL.steps`),
   `:350` (`INSTALLERS[0].code`) — and `alt/page.tsx:202`, which renders the npm line as its
   own literal in a file that already imports `HERO`. An earlier revision said "three",
   which was correct *within `content.ts`* and wrong about the app; the census below is
   scoped so that mistake cannot recur. After this FR all four derive from one declaration
   and the rendered output of each is byte-identical to today's.

   **Assert the derivation, not the character count.** The invariant is that the four
   consumers cannot drift apart, which is a property of their *values*: `INSTALLERS`' npm
   `code` equals `HERO.install`; `HERO.install.split('\n')` equals
   `HERO_TERMINAL.steps.slice(0, 2)` — the terminal's third step (`npx gate run PRD-001`) is
   deliberately not part of the install pair; and `/alt`'s rendered install line equals
   `HERO.install.split('\n')[0]`, consumed from the constant rather than re-typed. A
   source-text census is secondary, **scans every source under `apps/web/app` excluding the
   declaration file**, and must tolerate prose: strip comments before counting, since a doc
   comment quoting `npm install -D provegate` is not a duplication and must not fail the
   gate.
   - **Targets:** `apps/web/app/sections/content.ts`, `apps/web/app/alt/page.tsx`,
     `apps/web/test/content-web.test.ts`
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
   `robots: { index: false, follow: false }` and a title naming it a concept. The title is
   pinned verbatim so no copy is invented at implementation time:
   **`ProveGate — alternative landing concept`**, composed as `PRODUCT_NAME` (FR-1's
   constant) plus the phrase `alternative landing concept`, which is the route's own
   self-description in its module comment (`alt/page.tsx:24`) — a name for the page, not a
   new claim about the tool. Whether `/alt` survives to launch is not decided here.

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
9. **FR-9**: `CodeBlock`'s `copyable` affordance copies. Today it renders
   `<span aria-hidden="true">copy</span>` with no handler and no clipboard call
   (`CodeBlock.tsx:52-56`), and its doc comment delegates the wiring to "the consumer" while
   exposing no wiring point — no `onCopy`, no slot, no ref to the label. Four call sites
   advertise it (`tabs.tsx:93`, `:121`, `index.tsx:794`, `:797`); zero can copy. That is the
   declared-capability defect of FR-1 in component form, and this PRD previously cited it as
   evidence the defect was absent.

   **The contract.** `copyable` renders a real `<button type="button">` whose accessible
   name matches `/copy/i`, in the same header slot the span occupies today. Its payload is a
   new optional `copyText` prop when provided, else `children` when `children` is a plain
   string — which covers all four current call sites (`current.code`, `C.HERO.install`,
   `C.MANIFEST_SEED` are all strings). When neither yields a
   string, the control does not render: an affordance with no payload is the defect this FR
   deletes, and silently rendering it anyway would reintroduce it. The handler guards
   `navigator.clipboard` exactly as FR-2 does — absent (jsdom, insecure context) means
   no-op, never a throw. The component stays dependency-free; a platform API call inside an
   event handler does not breach the "side-effect-free" note, but the doc comment that
   promised consumer wiring must be rewritten to state the new contract, or the comment
   becomes the next stale promise.

   **Delivery architecture — decided, iteration 5 [P1] Q, completed by iteration 6
   [P1] V/W.** A handler in `CodeBlock.tsx` is not a browser feature until the built
   package entry carries a client boundary: the design package ships a bundled barrel
   (`src/react/index.ts` → `dist/react/index.js`), and a `"use client"` directive
   placed only in the component source is dropped by the bundle (proven by the
   iteration-5 esbuild probe). Two of the four call sites are rendered from the server
   component `sections/index.tsx`. And the barrel has a server consumer this PRD must
   not break: `apps/docs/components/mdx.tsx:3-13` imports `CodeBlock` into Fumadocs'
   server MDX pipeline under a comment promising the shared components carry no client
   hooks. The chosen architecture is therefore a **split renderer**, not a re-export:
   - the barrel `CodeBlock` stays a server-safe renderer and **loses the `copyable`
     prop at the type level** — the aria-hidden span is deleted (per the DO NOT), no
     handler code path exists in it, and the docs comment stays true. Passing
     `copyable` through the barrel becomes a compile error, which is the test that
     rejects server-context imports through the wrong subpath;
   - `packages/design/src/react/client.ts` (new) exports `CopyableCodeBlock`: wraps
     the server renderer, adds the `<button type="button">` (accessible name
     `/copy/i`), the `copyText`/string-children payload contract above, and the
     guarded `navigator.clipboard` handler;
   - `tsup.config.ts` gains a second config for that entry with
     `banner: { js: '"use client";' }`. **Build-output model (iteration 6 [P1] W):**
     installed tsup runs an options array concurrently over the shared `dist`, so
     `clean: true` in either config races the other's writes — both configs set
     `clean: false` and the package `build` script performs one explicit pre-clean
     (`rm -rf dist && tsup`). A clean-build test asserts `tokens`, `cli/index`,
     `react/index`, `react/client` and their declaration files all coexist after one
     `pnpm --filter @provegate/design build`;
   - `packages/design/package.json` `exports` gains `./react/client` (dist path);
   - **all four** web call sites (`sections/index.tsx` ×2, `sections/tabs.tsx` ×2)
     import `CopyableCodeBlock` from `@provegate/design/react/client` — uniform, even
     though the tabs sit inside a client boundary already. The earlier "no consumer
     changes" promise is withdrawn — it was the [P1]'s root: a contract that stopped
     one layer before delivery. `apps/docs` is untouched **and provably unaffected**:
     its imports resolve to the server renderer whose surface only shrank by a prop it
     never passed.
   Delivery is asserted where it exists: a design test reads the **built**
   `dist/react/client.js` and asserts the leading `"use client"` directive; the
   clean-build coexistence test holds the output model; a web test asserts the four
   call sites import from the client subpath; and the barrel's `CodeBlockProps` type
   test asserts `copyable` is gone — a jsdom render cannot see an RSC boundary, so
   directives, types and import paths are the evidence.

   **Scope consequence, stated.** This FR touches `packages/design`, which the rest of
   the PRD does not. Both touched packages are unpublished (`private: true`) and the
   repository's deliberate policy is to version only published packages, so no changeset
   is added — that is a policy statement, not tool behavior (see the DO NOT), and no
   `.changeset/` write happens (that directory is another active PRD's claimed surface).
   The Conflict Surface below claims the design files by name, and `gate queue` was
   re-run before claiming: no active claim overlaps them.

   **Tests, both layers.** Design (`props.test.tsx`): the button renders with the
   accessible name; activating it writes the payload (clipboard mocked); a missing
   clipboard does not throw; non-string children with no `copyText` renders no control.
   Web (`landing.test.tsx`): each of the four advertising blocks exposes a working control
   whose payload equals the constant it renders. The hero terminal's control is FR-2's and
   is asserted there — this FR adds no affordance to output blocks.
   - **Targets:** `packages/design/src/react/CodeBlock.tsx`,
     `packages/design/src/react/client.ts`, `packages/design/src/react/index.ts`,
     `packages/design/tsup.config.ts`, `packages/design/package.json`,
     `apps/web/app/sections/index.tsx`, `apps/web/app/sections/tabs.tsx`,
     `packages/design/test/props.test.tsx`, `apps/web/test/landing.test.tsx`

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
  configuration only, never `.gitattributes` (`conflicts.ts:67-68`, where `materialize` subtracts only the
configured `sharedAppendOnly` set), so neither alone is enough.
  That is memory-substrate work; this PRD only declares its own write.
- **The `/` vs `/alt` concept contest.** FR-8 only stops `/alt` from being indexed and
  mistaken for the product page.
- **New copy or new claims.** Every string still traces to `sections/content.ts` and the
  design brief. Nothing new is asserted about the tool.
- **`apps/docs`.** Its OG route already exists and is untouched; this PRD reads it as the
  pattern to follow.
- **A published release.** `web` and `@provegate/design` are both `private: true`
  (`apps/web/package.json`, `packages/design/package.json`), which prevents
  **publication** — it does not make changesets skip them: the repository's
  `.changeset/config.json` omits `privatePackages`, whose effective default is
  `{version: true, tag: false}` (iteration 5 resolved the installed config to prove
  it). The no-changeset decision here is **repository policy** — unpublished packages
  take no changeset because a version plan for something never published records
  nothing — stated as policy, not as tool behavior. No write into `.changeset/`, which
  is also an active claim of PRD-025's Conflict Surface.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a freshly built `/`, **When** its emitted metadata is read, **Then** every
  field an unfurl client consumes is present and consistent — `og:image` absolute,
  1200×630 dimensions, `twitter:image`, and no field promising a card type without an
  image behind it. **Emitted tags are this PRD's complete acceptance contract for the
  card** (iteration-5 W25): what a live client renders after a deploy is the launch
  checklist's item (§11), owned by the owner, ordered before the first share — not a
  criterion this close can test, because no deploy exists to unfurl.
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
- **Given** a freshly built `/alt`, **When** `alt.html` is read, **Then** it emits the title
  `ProveGate — alternative landing concept`, **no** `og:image`, **no** `twitter:image`,
  `twitter:card="summary"`, and a `robots` meta carrying `noindex` and `nofollow`.
- **Given** `sections/content.ts`, **When** the install declaration is compared to its four
  consumers, **Then** `INSTALLERS`' npm `code` equals `HERO.install`, `HERO.install`'s two
  lines equal the first two `HERO_TERMINAL.steps`, and `/alt`'s rendered install line equals
  the declaration's first line — and a doc comment quoting the command fails nothing.
- **Given** any block that advertises a copy affordance, **When** the reader activates it,
  **Then** the block's real payload reaches the clipboard — and **When** `navigator.clipboard`
  is absent, **Then** nothing throws. A `copyable` block whose payload cannot be derived
  renders no affordance at all.
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
chances to rot. The page has **no** orphaned anchor today — twelve `href="#…"` occurrences
over six unique targets, every one resolving,
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
undefined in jsdom and in insecure contexts, so every handler must guard rather than throw.
Two control kinds exist after this PRD and share that guard: FR-2's hero control (TermBar
chrome, `termButton`) and FR-9's `CodeBlock` button (design package). The tests assert
presence and payload wiring for both; the real copy is an operator row.

### Dependencies

- none. `next/og` ships inside `next` (already a dependency of `apps/web`); the clipboard is
  a platform API; `@provegate/design/tokens` is an existing workspace export.

### Rollback

Seven of the nine FRs revert cleanly and independently: they are additive or deletive
changes to private, unpublished packages with no data, no schema and no external
published consumer. Neither package is published (`private: true` blocks publication;
by repository policy no changeset is written — the effective changesets config would
version them, see the Non-Goal), so there is no version to unpublish and no adopter to
migrate. Reverting FR-9 restores the inert span, which is the shipped state — worse,
but not broken by the revert; the docs' server import survives both directions because
the server renderer never gains a handler.

**FR-1 and FR-8 are one ordered rollback unit.** FR-8 exists *because* FR-1 makes the root
card reach `/alt`. Reverting FR-8 alone leaves the root card in place with no override on
`/alt`, restoring exactly the impersonating unfurl FR-8 was written to prevent, on a page that
is once again indexable. The rule: **revert FR-1 first, or revert both together.** Never FR-8
alone.

**FR-1 is also asymmetric in time.** A `git revert` restores the repository, but X, Slack,
LinkedIn and every other unfurl consumer **caches the card it already fetched**, on their
schedule. A wrong card outlives its revert by hours to days, and the remedies are per-platform
cache-purge tools the repository does not control.

The consequence is an **ordering constraint, not a rollback plan** — and it binds the
**deploy-and-share step, not this PRD's close.** An earlier revision made a real-client
unfurl check a blocking pre-merge operator row, and that row could not execute: deployment
is a Non-Goal, the repository has no web preview or deploy workflow
(`.github/workflows/ci.yml` builds, `release.yml` publishes npm — measured), and fetching
`provegate.dev` before this change deploys would inspect old production. A gate that cannot
run is not a gate. So the split is: **this PRD's close is held by the emitted-tag
assertions** (`test/metadata.test.ts`, on fresh builds, both routes); **the real-unfurl
check is a launch precondition** — before either URL is shared anywhere (a README, a post,
a message), the owner runs an OG debugger against the *deployed* origin and sees `/` render
the card and `/alt` render title-only. That step belongs to whatever act first deploys or
shares the URL — the launch checklist around `_docs/launch/announcement-draft.md` is its
natural home — and §11 records it as a launch note rather than a close-blocking row,
because unfurl consumers cache what they fetch and a wrong card outlives its revert.

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
- [ ] `apps/web/app/sections/ui.tsx` — `Wordmark` derives from `PRODUCT_NAME_PARTS` (FR-1)
- [ ] `apps/web/app/globals.css` — the ≤900px rule (FR-6)
- [ ] `apps/web/app/alt/page.tsx` — own metadata, noindex, install line from the constant
      (FR-3, FR-8)
- [ ] `packages/design/src/react/CodeBlock.tsx` — server renderer, `copyable` prop
      removed at the type level, span deleted (FR-9)
- [ ] `packages/design/src/react/client.ts` — new client entry, `CopyableCodeBlock` (FR-9)
- [ ] `packages/design/src/react/index.ts` — barrel keeps the server renderer only (FR-9)
- [ ] `packages/design/tsup.config.ts` — second config, banner, `clean: false` pair +
      pre-clean build script (FR-9)
- [ ] `packages/design/package.json` — `./react/client` export, build script (FR-9)
- [ ] `apps/web/app/sections/tabs.tsx` — both call sites import the client entry (FR-9)
- [ ] `_docs/launch/announcement-draft.md` — the `## Launch checklist` section (FR-1)
- [ ] `packages/design/test/props.test.tsx` — extended, never weakened (FR-9)
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
  layer: the unreferenced `PROOF` export is deleted, and the rule is added as a test so
  an export cannot outlive its **last external reference** — deliberately the weaker
  claim FR-7 itself makes ("referenced, not rendered"), not a render guarantee; the
  iteration-5 review caught this disposition overclaiming the stronger one. FR-4's
  anchor-closure test is the same record applied to anchors — a declared link with no
  target is an unwired surface.
- reviewed: `state-model-before-mechanism` — its watch covers `_prds/wip/**`, and its
  shape is this PRD's own trajectory: six rounds with Scope & Testability flat while
  the rest measured exact. The record's literal prescription — write the state
  transitions before mechanism — is **deliberately not taken**: a static page's
  delivery boundary is not a state machine with actors and interrupted states; the
  unwritten ground truth here was a package **export contract**, and iteration 6's V/W
  findings forced it to be written as one (the split-renderer contract and the
  build-output model in FR-9, each held by a named test). Recorded as reviewed, with
  the honest admission that two probes alone did not end the trajectory — the
  written-contract form of the record's lesson is what this round applies.
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
  nine FRs themselves are derivable from the code and are not written to `_brain`.

---

## Memory Outputs

- learning: `_brain/learnings/metadata-declares-what-it-cannot-provide.md` — a metadata
  field that declares a capability without shipping the asset behind it degrades **silently**:
  `twitter.card: 'summary_large_image'` with no image produces no card, no build error, no
  lint warning and no test failure. The durable rule is the coherence assertion — when a
  declaration names a richer form, assert in a test that the asset it promises exists — and
  it generalizes past OG cards to any declared-capability field. This PRD itself supplied
  the second instance: `copyable` rendered the word "copy" with no handler (FR-9), and the
  PRD's earlier revision cited that inert declaration as proof the capability existed —
  the failure mode includes *reviewers reading declarations as evidence*.

---

## Conflict Surface

- `apps/web/app/**`
- `apps/web/test/**`
- `packages/design/src/react/CodeBlock.tsx`
- `packages/design/src/react/client.ts`
- `packages/design/src/react/index.ts`
- `packages/design/tsup.config.ts`
- `packages/design/package.json`
- `packages/design/test/props.test.tsx`
- `apps/web/app/sections/tabs.tsx`
- `_docs/launch/announcement-draft.md`
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
**configuration only**, never `.gitattributes` (`conflicts.ts:67-68`, where `materialize` subtracts only the
configured `sharedAppendOnly` set), so adding a union driver
would not by itself change queue behaviour; and PRD-024, PRD-025, PRD-026 and PRD-028 all
declare new memory records **without** declaring the INDEX write, so the repo-wide collision
stays invisible to the gate no matter what this PRD does. Both are Non-Goals above.

Not claimed, deliberately: `apps/docs/**` (read as the OG pattern, never written),
`scripts/check-static-egress.mjs` (executed as a gate, never edited — if the OG card trips
it, the card is wrong, not the check), and `.changeset/**` (both touched packages are
`private: true`, and the directory is PRD-025's declared surface — FR-9 states the
avoidance as a rule). Measured with `gate queue` on 2026-07-28: zero in-flight claims, so
nothing overlaps `apps/web/**`, `packages/design/**` or `_brain/**`; the two design paths
are named file-by-file rather than as a glob so the claim stays as narrow as FR-9's touch.
Re-run `gate queue` before claiming — and expect an INDEX overlap the moment another
memory-producing PRD declares the same path.

---

## Durable Artifacts

- Review artifact: `_docs/reviews/review-027-landing-adoption-polish.md`
- Learning: `_brain/learnings/metadata-declares-what-it-cannot-provide.md` — the Memory
  Output above, repeated here because the two lists are one contract
- Index pointer: `_brain/INDEX.md` — the one-line hook for the learning above. Named here as
  well as in the Conflict Surface because `_brain/PROTOCOL.md:219-224` makes indexing part of
  capture, so a close whose diff lacks this line captured nothing
- Launch surface: `_docs/launch/announcement-draft.md` — the `## Launch checklist`
  section FR-1 adds; the live-unfurl precondition's durable, owner-owned home (§11)
- Decision: `none` — no architectural decision is taken beyond FR-9's client-entry
  choice, which is recorded in the FR itself and reversible with it. Every other FR
  either wires something the page already declared or ports a pattern already decided
  in `apps/docs`.

---

## 11. Verification Commands

Run from the repo root after `pnpm build`.

| FR   | Command / Check | Scope | Notes |
| ---- | --------------- | ----- | ----- |
| FR-1 | `pnpm --filter web build` | web | a fresh build, so the emitted-metadata rows below cannot read a stale tree |
| FR-1 | `pnpm --filter web test test/metadata.test.ts` | web | the source coherence triple plus the emitted og:image, its 1200x630 dimensions and the twitter image; an absent build file fails the row |
| FR-1 | `node scripts/check-static-egress.mjs` | root | the OG card fetches nothing external; the script scans both built apps when present, so it repeats in the cross-cutting floor and this row is its FR-1 reading |
| FR-2 | `pnpm --filter web test test/landing.test.tsx` | web | hero copy control, real payload, reduced-motion |
| FR-3 | `pnpm --filter web test test/content-web.test.ts` | web | the four consumers derive from one declaration, alt included; comment-stripped app-wide census excluding the declaration file as the secondary check |
| FR-4 | `pnpm --filter web test test/landing.test.tsx` | web | every rendered anchor resolves to a rendered id |
| FR-5 | `pnpm --filter web test test/landing.test.tsx` | web | retained per-target ratio map driven by sequential callbacks, document-order tie-break, exactly one location token across the whole nav with the drawer open, no-IO fallback throws nothing |
| FR-6 | `pnpm --filter web test test/a11y.test.ts` | web | the wrapper class is hidden inside the 900px block of the stylesheet |
| FR-6 | `pnpm --filter web test test/landing.test.tsx` | web | exactly one HandoffCard, and it sits inside an element carrying that same wrapper class |
| FR-7 | `pnpm --filter web test test/content-web.test.ts` | web | word-anchored token census over comment-stripped sources, excluding the declaration file |
| FR-8 | `pnpm --filter web test test/metadata.test.ts` | web | the built alt route emits the pinned concept title, no image of either kind, a summary card and a robots meta carrying noindex and nofollow; an absent build file fails the row |
| FR-9 | `pnpm --filter @provegate/design test` | design | the copyable control is a real button with an accessible copy name; activation writes the payload; absent clipboard throws nothing; non-string children with no copyText renders no control |
| FR-9 | `pnpm --filter web test test/landing.test.tsx` | web | each of the four advertising blocks exposes a working control whose payload equals the constant it renders |

<!-- No backticks in the Scope/Notes cells of an FR row: the §11 parser extracts every
backticked span on the whole row (`safety.ts:47-59`, deliberate — a bare word must surface
as unsafe rather than be silently dropped), so a backticked note becomes a candidate gate
command. See the `notes-column-runs-commands` Memory Input. -->


Cross-cutting floor (all green before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; the three existing web test files and the design
  package's `props.test.tsx` keep every assertion
- `pnpm build` — clean build
- `pnpm --filter web build` — the landing and the OG route build
- `node scripts/check-static-egress.mjs` — zero external origins across every built app
  present, the cross-cutting reading of the FR-1 row above

Hard caps — none apply, and each is named so Phase 2 can confirm rather than assume:

- No runtime dependency is added to `packages/provegate`; this PRD does not touch the package.
- No code path that pushes to a remote is added; nothing here executes git.
- No method content (prompt, template, schema) is touched, so nothing needs source-snapshot
  traceability.

Operator-owned (real browser, recorded as `operator` rows — `skipped` is illegal):

- The install command actually reaches the system clipboard, in both themes — from the hero
  control (FR-2) and from the install tab's block (FR-9).
- **Baseline capture, after Phase 3 and before Phase 4 starts:** at 375×667 against the
  pre-change tree, the operator measures the hero block's rendered height and **records
  the pixel value in the task artifact's Operator Handoff table**
  (`_tasks/wip/tasks-027-landing-adoption-polish.md` — created at Phase 3, so it exists
  before implementation; the Phase 3 generator seeds the row). Iteration 5 correctly
  refused the earlier home: the independent Phase-6 review artifact is created after
  implementation by an independent author and has no operator rows — it cannot hold a
  pre-Phase-4 value. The task artifact is workflow state that survives to the close,
  which is all the comparison needs.
- At 375×667 after the change: confirm the hero shrank against the recorded value, that no
  `HandoffCard` renders in the hero, and that there is no horizontal scroll. The CTAs are
  not part of this row — FR-6 cannot lift them and the PRD does not claim it does.
- Scrolling `/` highlights exactly one nav link at a time, with no text shift on activation —
  including while scrolling *fast*, where threshold callbacks arrive out of order. Below 900px
  there is deliberately no indicator.
- Keyboard: the three trust-strip anchors take focus, show a visible ring, and land on the
  right section.

**Launch precondition — deliberately not an operator row of this PRD**, because it cannot
execute before a deploy exists and a row that cannot run is not a gate (§7 → Rollback,
measured against the repo's workflows). Iteration 5 found the previous version of this
note pointed at a checklist that did not exist, so FR-1 now **creates it**: a
`## Launch checklist` section in `_docs/launch/announcement-draft.md` (an FR-1 Target and
a Durable Artifact — the close diff must carry it) with one tracked item: *owner, before
the first share of either URL and after the first deploy, runs an OG debugger against the
deployed origin; `/` renders the 1200×630 card, `/alt` unfurls title-only with no image;
unfurl consumers cache what they fetch, so this precedes every share.* The requirement
therefore survives the close in a durable, owner-owned surface instead of vanishing into
prose.

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
  invariant is that the four consumers — `/alt` included — derive from one declaration.
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
- DO NOT weaken or delete an assertion in `landing.test.tsx`, `content-web.test.ts`,
  `a11y.test.ts` or the design package's `props.test.tsx` to make a change pass. If an
  existing assertion fails, the change is wrong.
- DO NOT render a copy affordance whose payload cannot be derived, and DO NOT keep the
  aria-hidden span as a fallback. A visible "copy" with no handler is the defect FR-9
  deletes; reintroducing it quietly for an edge case is the same defect with a rationale.
- DO NOT write anything into `.changeset/`. Both touched packages are unpublished and
  the repository's policy is no changeset for them (`private: true` blocks publication;
  it does NOT make changesets skip version planning — the effective config versions
  private packages, so this is a policy line, not a tool guarantee) — and that
  directory is PRD-025's claimed surface; entering it creates the path collision the
  queue gate exists to prevent.
- DO NOT add an `inputs` key to any task in `turbo.json` — `scripts/verify/verify-turbo-inputs.mjs`
  refuses it as a blanket rule (exceptions file is empty), and narrowing the `test` task's key
  is precisely what would create the stale-green defect that currently cannot happen here.
- DO NOT introduce `any`, an `eslint-disable`, or a `|| true`. Surface the error verbatim.

---

## Changelog

| Date | Author | Changes |
| ---- | ------ | ------- |
| 2026-07-27 | Claude Opus 5 | Initial draft — six verified items from the independent landing review, two defects found while verifying it, two items rejected with evidence |
| 2026-07-28 | Claude Fable 5 | **Iteration-4 remediation, every finding re-verified against source before editing.** **[P1] H closed as FR-9**: the rejection of the copy-button review item is deleted and replaced with the corrected finding — `copyable` renders `<span aria-hidden="true">copy</span>` with no handler (`CodeBlock.tsx:52-56` re-read; all four call sites re-measured passing plain-string children), so FR-9 wires it in the component: a real button, `copyText`-or-string-children payload, no-payload renders no control, clipboard guarded, doc comment rewritten. Scope consequence stated in the FR and the Conflict Surface: two `packages/design` files claimed by name; both touched packages measured `private: true`, so no `.changeset/` write — that directory is PRD-025's claim and a new DO NOT names the avoidance. **[P1] I closed by rebinding the constraint**: the two BLOCKING real-unfurl operator rows could not execute pre-merge (no deploy or preview workflow — `ci.yml`/`release.yml` re-checked), so the close is held by the emitted-tag assertions and the real-unfurl check is restated as a launch precondition bound to the first deploy/share, pointed at the launch checklist. **[P2]s J, K, L, M closed**: FR-3 goes app-wide — the fourth authoring at `alt/page.tsx:202` re-measured, `/alt` becomes a named consumer, the census excludes only the declaration file; FR-1 gains `PRODUCT_NAME_PARTS` with `Wordmark` (`ui.tsx:157`) as a named consumer so the split JSX cannot survive beside the constant, and FR-8's title is pinned verbatim from the route's own self-description; the Success Metrics table now separates the read-only command that produced each current value (every one re-run this session: 0 og:image, 0/4 working copy affordances, 38 exports/1 orphan, 12 anchor occurrences over 6 targets, 0-line metadata diff between routes) from the acceptance test that will hold the target; the mobile-height baseline gets a capture point (before Phase 4) and a durable home (the review artifact's first operator row). **[P3]s N, O, P closed**: occurrences vs targets stated everywhere the count appears; the egress row marked cross-cutting and repeated in the floor; the duplicated metrics header removed and the stale `conflicts.ts:63` citation corrected to `:67-68` at both sites |
| 2026-07-28 | orchestrating session (non-scorer), second pass | **Iteration-6 findings V/W/X/Y/Z + the W29 rewrite applied.** V: the delivery architecture completed as a SPLIT RENDERER — the barrel `CodeBlock` stays server-safe and loses `copyable` at the type level (compile error is the wrong-subpath test; the docs server-MDX consumer provably unaffected), the client entry exports `CopyableCodeBlock`, all four web call sites move to it. W: build-output model fixed — both tsup configs `clean: false`, one explicit pre-clean in the build script, clean-build coexistence test over all five outputs. X: Targets, Implementation Scope and Conflict Surface swept into agreement (design package.json, client.ts, index.ts, tsup config, tabs.tsx, launch draft everywhere they belong). Y: the Rollback section's surviving false changesets sentence corrected to the policy form. Z acknowledged: the iteration-5 changelog claimed a sweep it had not run — this row is written AFTER grepping the document for every corrected claim, and the sweep discipline is exactly `a-rule-corrected-survives-where-it-is-restated`. W29: the `state-model-before-mechanism` disposition rewritten from ceremonial to honest — the record's lesson lands as a written export contract, not as two probes. |
| 2026-07-28 | orchestrating session (non-scorer), on owner direction | **Iteration-5 work order W24–W29 applied.** W24: FR-9 gains its delivery architecture — a dedicated client subpath entry (`react/client` + tsup banner `"use client"`), chosen over a client-marked barrel to keep the static landing unhydrated; the "no consumer changes" promise withdrawn, two server call sites re-import from the client entry, delivery asserted on the BUILT entry's directive plus import-path assertions; Targets/Conflict Surface widened accordingly. W25: emitted tags declared the complete close contract; the live-unfurl §6 criterion replaced; FR-1 now CREATES the `## Launch checklist` in `_docs/launch/announcement-draft.md` (Target + Durable Artifact) so the precondition survives close in an owner-owned surface. W26: four metric cells rewritten to single verified commands each emitting every claimed number (all four re-run this session: 12/6/0, 4+span, 38+PROOF, identical+no-robots); HandoffCard cell narrowed to source occurrences. W27: the mobile baseline moved from the temporally impossible Phase-6 review artifact to the task artifact's Operator Handoff. W28: the false "changesets skips private packages" premise corrected everywhere to repository policy (effective `privatePackages.version=true` acknowledged). W29: the `gate-wire-or-delete` disposition narrowed to FR-7's actual claim and `state-model-before-mechanism` dispositioned against this PRD's own flat-dimension trajectory. |
| 2026-07-27 | Claude Opus 5 | **Rebuilt after loss.** A concurrent session committed this PRD mid-round (`b63f5d6`, capturing the 484-line draft) and the PRD-021 land/merge commits then overwrote the uncommitted W1–W15 remediations; no stash and no dangling blob carried them (`4a16dfd`, `d4b1900`, `8ef533d` all hold one Changelog row). This row rebuilds all fifteen **and** closes Codex's iteration-3 findings in one pass, from `_readiness/wip/readiness-027-landing-adoption-polish.md`, which survived because it had been committed. **FR-1:** the `images` declaration is forbidden with the resolver cited (`resolve-metadata.js:137-157`), asserted at two levels — a source coherence triple plus the emitted `og:image` in built HTML — with absence *and* staleness failing the row, and the card's content pinned to new `SITE_TITLE` / `PRODUCT_NAME` constants because the wordmark is split JSX and the title a nested metadata property, so neither was reusable. **FR-3/FR-15:** install baseline corrected to three (`content.ts:18,35,350`), asserted as value derivation not character count. **FR-5:** `aria-current="location"`, and the algorithm rewritten — an `IntersectionObserver` callback is not a snapshot, so a retained per-target ratio map with declared thresholds replaces "greatest ratio in this callback", tested with sequential callbacks; `aria-current` belongs to the desktop strip alone, since `Nav` maps `NAV_LINKS` twice. **FR-6:** the fold claim withdrawn everywhere including the operator row, the grid geometry stated, and the assertion joined through the wrapper class so a CSS rule and a card count can no longer both pass while the card stays visible. **FR-7:** the census excludes the declaration file and matches word-anchored tokens, because `PROOF` is a prefix of `PROOF_EVIDENCE`; `grep-token-anchors-real-impl` declared as a Memory Input, alongside `false-green-on-missing-file`. **FR-8:** `/alt` drops the inherited card by declaration (`:182-190` replaces wholesale), takes `card: 'summary'`, and is asserted on emitted metadata — measured before-state: `alt.html` emits metadata byte-identical to `/` with no robots meta, though the files differ in size. **§7:** Rollback added, with FR-1+FR-8 as one ordered unit and the unfurl-cache asymmetry making the real-unfurl operator rows a precondition to sharing either URL. **Scope/Conflict Surface/Durable Artifacts:** `_brain/INDEX.md` declared in all three, with the two limits on that reasoning stated as Non-Goals. Every Success Metric now carries the command that produced its current value |
