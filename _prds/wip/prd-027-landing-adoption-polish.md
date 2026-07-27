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
| The reader cannot tell where they are | 20 sections, sticky nav (`nav.tsx:88`), no active-anchor state. |
| The mobile hero spends the first screen on a duplicate | `globals.css:132-143` collapses `.pg-hero` to one column at ≤900px, stacking eyebrow + h1 + lede + a 188px-min terminal (`hero-terminal.tsx:70`) + two CTAs + the principles line + a nine-line `HandoffCard`. |
| A content export is dead | `content.ts:284` exports `PROOF`; nothing imports it. `PROOF_EVIDENCE` replaced it and it was never deleted. |
| A concept page competes with the product page | `app/alt/page.tsx` exports no `metadata`, so `/alt` inherits the root title, description and (after FR-1) the OG card, and is indexable. It links back to `/` as "current landing" (`alt/page.tsx:470`). |
| The install command is authored twice | `HERO.install` (`content.ts:18`) and `INSTALLERS[0].code` (`content.ts:350`) are byte-identical strings in the file whose header claims to be "the single source of landing copy". |

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
- [ ] A reader 15 sections deep can see where they are.
- [ ] The mobile first screen carries the thesis and the calls to action, not a duplicate of
      a beat the hero terminal already landed.
- [ ] No landing content export exists without a render that uses it.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Social preview card | none; `summary_large_image` declared with no image | 1200×630 card renders; declaration and asset agree | `pnpm --filter web test test/metadata.test.ts` |
| Copy affordances for the install command above the fold | 0 | 1 | `pnpm --filter web test test/landing.test.tsx` |
| TrustStrip claims linked to their evidence | 0 of 3 | 3 of 3 | `pnpm --filter web test test/landing.test.tsx` |
| Rendered `href="#…"` with no matching id on the page | 1 (`#refusal` is unlinkable — no id exists to link to) | 0, asserted for every anchor | anchor-closure test (FR-4) |
| Unreferenced exports in `sections/content.ts` | 1 (`PROOF`) | 0, asserted | `pnpm --filter web test test/content-web.test.ts` |
| Indexable landing pages | 2 (`/`, `/alt`) | 1 | `pnpm --filter web test test/metadata.test.ts` |
| External origins fetched by the built app | 0 | 0 (unchanged — the OG card must not regress it) | `node scripts/check-static-egress.mjs` |
| Hero elements above the fold at 375×667 | eyebrow, h1, lede (operator-measured) | eyebrow, h1, lede, both CTAs | operator row, real browser |

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
   layout. Wire `openGraph.images` and `twitter.images` **explicitly** in `metadata` rather
   than relying on file-convention injection, so the contract is assertable at the source.
   - **Targets:** `apps/web/app/opengraph-image.tsx`, `apps/web/app/layout.tsx`,
     `apps/web/test/metadata.test.ts`
2. **FR-2**: The hero carries one copy control for the install command. Its accessible name
   matches `/copy/i`, its payload is the install string from `sections/content.ts` (never a
   second literal), and it is operable before the typing animation settles and when
   `prefers-reduced-motion: reduce` renders the finished state immediately. Clipboard access
   degrades to a no-op where `navigator.clipboard` is absent (jsdom) without throwing.
   - **Targets:** `apps/web/app/sections/hero-terminal.tsx`,
     `apps/web/app/sections/index.tsx::Hero`, `apps/web/test/landing.test.tsx`
3. **FR-3**: The install command is authored once in `sections/content.ts`. `HERO.install`,
   `HERO_TERMINAL.steps` and the npm entry of `INSTALLERS` all derive from that one
   declaration; the rendered output of all three is byte-identical to today's. A test
   asserts the literal `npm install -D provegate` appears exactly once in the file.
   - **Targets:** `apps/web/app/sections/content.ts`, `apps/web/test/content-web.test.ts`
4. **FR-4**: Claims link to evidence, and every anchor resolves. `Refusal` gains
   `id="refusal"`. Each `TRUST_STRIP` entry carries its own href — the ledger claim to
   `#ledger`, the 80+-agents claim to `#proof`, the push claim to `#refusal` — and renders
   as a focusable `<a>`, not a `<span>`. The test collects **every** `href="#…"` in the
   fully rendered page and asserts a matching `id` renders; it must fail if any existing nav
   or footer anchor is ever orphaned, not only the three added here.
   - **Targets:** `apps/web/app/sections/index.tsx::Refusal`,
     `apps/web/app/sections/index.tsx::TrustStrip`,
     `apps/web/app/sections/content.ts::TRUST_STRIP`, `apps/web/test/landing.test.tsx`
5. **FR-5**: The sticky nav shows the active section. An `IntersectionObserver` in the
   existing client component sets `aria-current="true"` on the matching link and nothing
   else. When `IntersectionObserver` is undefined (jsdom, no-JS), the nav renders with no
   active link and does not throw — the same defensive shape `hero-terminal.tsx:43` already
   uses. Activation must not reflow text: the indicator occupies its space whether active or
   not.
   - **Targets:** `apps/web/app/sections/nav.tsx`, `apps/web/test/landing.test.tsx`
6. **FR-6**: The mobile hero drops the `HandoffCard`. At ≤900px the card's wrapper is
   `display: none` in `globals.css`; **no second DOM copy** is rendered anywhere to
   compensate. This is acceptable because the hero terminal's closing lines
   (`content.ts:42-43`) already state the same fact in text, and those lines must remain —
   they are what carries the beat for the mobile reader and for a screen reader, since
   `display: none` removes the card from the accessibility tree too. The full card returns at
   ≥901px, where the handoff design puts it.
   - **Targets:** `apps/web/app/globals.css`, `apps/web/app/sections/index.tsx::Hero`,
     `apps/web/test/a11y.test.ts`
7. **FR-7**: No landing content export is unreferenced. Delete `content.ts::PROOF`, and add
   the general rule as a test: every export of `sections/content.ts` is referenced by at
   least one source under `apps/web/app`. This is `gate-wire-or-delete` applied to the
   landing's content layer, so the defect cannot silently return.
   - **Targets:** `apps/web/app/sections/content.ts::PROOF`,
     `apps/web/test/content-web.test.ts`
8. **FR-8**: `/alt` stops competing with `/`. The route stays — it is the owner's comparison
   surface — but it exports its own `metadata` with `robots: { index: false, follow: false }`
   and a title that names it a concept, so search and social never present it as the product
   page. Whether `/alt` survives to launch is not decided here.
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
- **Given** a reader scrolled to the ledger, **When** the nav is inspected, **Then** exactly
  one link carries `aria-current="true"` and no text has shifted position.
- **Given** a browser with no `IntersectionObserver`, **When** the nav mounts, **Then** it
  renders with no active link and throws nothing.
- **Given** a 375×667 viewport, **When** the page loads, **Then** the eyebrow, thesis, lede
  and both CTAs are above the fold, the `HandoffCard` is absent from the hero, and no second
  copy of it appears elsewhere in the document.
- **Given** `sections/content.ts`, **When** its exports are enumerated, **Then** every one is
  referenced by a source under `apps/web/app`, and `PROOF` is gone.
- **Given** `/alt`, **When** its metadata resolves, **Then** it is `noindex, nofollow` and
  its title names it a concept page.

---

## 7. Technical Considerations

### Architecture

**The OG card is a port, not a design.** `apps/docs/app/og/docs/[...slug]/route.tsx` already
solved every hard part and recorded why in place: tokens instead of hexes because Satori
cannot read CSS custom properties; the built-in typeface because Satori cannot consume the
packaged woff2; `revalidate = false`. `apps/web` has one static card, so the file-convention
`app/opengraph-image.tsx` is simpler than a dynamic route — but `layout.tsx` already declares
an explicit `openGraph` object, and an explicit `images` entry is what a test can assert
without resolving Next's metadata merge. Declare it explicitly.

**Why an anchor-closure test rather than three assertions.** Three new hrefs are three new
chances to rot, and the page already carries the failure this test catches: `#refusal` has
no target. Asserting the closed set — every rendered `href="#…"` has a rendered `id` — costs
the same to write and turns a class of defect into a gate. It is the same reasoning as
`gate-wire-or-delete`, applied to anchors.

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

Not claimed, deliberately: `apps/docs/**` (read as the OG pattern, never written) and
`scripts/check-static-egress.mjs` (executed as a gate, never edited — if the OG card trips
it, the card is wrong, not the check). Measured with `gate queue` on 2026-07-27: no active
claim overlaps `apps/web/**`. Re-run `gate queue` before claiming.

---

## Durable Artifacts

- Review artifact: `_docs/reviews/review-027-landing-adoption-polish.md`
- Learning: `_brain/learnings/metadata-declares-what-it-cannot-provide.md` — the Memory
  Output above, repeated here because the two lists are one contract
- Decision: `none` — no architectural decision is taken. Every FR either wires something the
  page already declared or ports a pattern already decided in `apps/docs`.

---

## 11. Verification Commands

Run from the repo root after `pnpm build`.

| FR   | Command / Check | Scope | Notes |
| ---- | --------------- | ----- | ----- |
| FR-1 | `pnpm --filter web test test/metadata.test.ts` | web | card exists; declaration and asset agree |
| FR-1 | `node scripts/check-static-egress.mjs` | root | the OG card fetches nothing external |
| FR-2 | `pnpm --filter web test test/landing.test.tsx` | web | hero copy control, real payload, reduced-motion |
| FR-3 | `pnpm --filter web test test/content-web.test.ts` | web | install literal authored exactly once |
| FR-4 | `pnpm --filter web test test/landing.test.tsx` | web | every rendered anchor resolves to a rendered id |
| FR-5 | `pnpm --filter web test test/landing.test.tsx` | web | aria-current wiring; no-IO fallback throws nothing |
| FR-6 | `pnpm --filter web test test/a11y.test.ts` | web | ≤900px rule present; exactly one HandoffCard in the DOM |
| FR-7 | `pnpm --filter web test test/content-web.test.ts` | web | no unreferenced export in `sections/content.ts` |
| FR-8 | `pnpm --filter web test test/metadata.test.ts` | web | the alt route is noindex, nofollow, own title |

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
- At 375×667: eyebrow, thesis, lede and both CTAs above the fold; no `HandoffCard` in the
  hero; no horizontal scroll.
- Scrolling `/` highlights exactly one nav link at a time, with no text shift on activation.
- The card renders correctly in a real unfurl (X, Slack, or an OG debugger) for `/`.
- Keyboard: the three trust-strip anchors take focus, show a visible ring, and land on the
  right section.

Before Phase 2 PASS, run: `gate check PRD-027`

---

## 12. DO NOT (Anti-Patterns)

- DO NOT reorder, merge, split or drop a section. `PG_ORDER` is owner-approved and
  `landing.test.tsx:15-56` locks it.
- DO NOT change the hero CTA hierarchy or the button variants. It is a real problem and it is
  a Non-Goal here.
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
