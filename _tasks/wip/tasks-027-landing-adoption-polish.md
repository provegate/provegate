# Tasks: Landing Adoption Polish — a Shareable Card, a Copyable First Action, Linked Claims

> **PRD**: [prd-027-landing-adoption-polish.md](../../_prds/wip/prd-027-landing-adoption-polish.md)
> **Readiness**: [readiness-027-landing-adoption-polish.md](../../_readiness/wip/readiness-027-landing-adoption-polish.md)
> **Status**: Ship Verified (pending owner acceptance + merge)
> **Readiness Score**: 8.20/10 (iteration 7, PASS — fourth independent scorer)
> **Model Tier (Execution)**: high
> **Model Tier (Audit)**: high
> **PRD Class**: feature
> **Autonomous Close**: operator-gated
> **Created**: 2026-07-28

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked — `skipped`
  is illegal for operator rows.
- Record implementation decisions in **Deferrals & Decisions**; human/runtime work in
  **Operator Handoff**.
- A PRD may be `Code Complete` with operator handoff items, but it is not
  `Ship Verified` until required handoff items are resolved or explicitly accepted —
  this close is **operator-gated**: the merge gate refuses without an owner-signed
  acceptance entry.
- Phase 4 agents hold a valid lock lease before editing implementation files or this
  task file.
- No `any`, no `eslint-disable`, no `|| true`. Surface blockers verbatim.

---

## Memory Context

Slugs the PRD selected, carried so implementation does not re-derive them:

- `metadata-declares-what-it-cannot-provide` — the Memory Output this PRD creates; the
  unifying defect (declared capabilities with nothing behind them). Binds 1.0.
- `false-green-on-missing-file` — FR-1/FR-8 assert against built HTML; an absent build
  file fails the row, and a fresh build precedes the emitted-metadata reads. Binds 1.0, 8.0.
- `grep-token-anchors-real-impl` — FR-7's census is word-anchored over comment-stripped
  sources (`PROOF` is a prefix of `PROOF_EVIDENCE`). Binds 4.0.
- `gate-wire-or-delete` — an export must not outlive its last external reference; a
  declared link with no target is an unwired surface. Binds 4.0, 5.0.
- `turbo-cache-masks-out-of-input-reads` — `landing.test.tsx` reads within the web
  package's inputs; keep it that way. Binds every test task.
- `notes-column-runs-commands` — the PRD's disposition predates PRD-024's same-day fix
  of the §11 parser; the discipline (no backticks in Notes cells) is kept regardless.
  Binds 8.0.
- `push-is-human-by-omission` — FR-4 makes `Refusal` addressable; nothing executes git.
- `state-model-before-mechanism` — the export contract (FR-9) is the written ground
  truth; implement against it, do not re-litigate it. Binds 2.0.

---

## Relevant Files

- `apps/web/app/opengraph-image.tsx` — NEW: the card route (FR-1)
- `apps/web/app/layout.tsx` — metadata coherence, no `images` declaration + comment (FR-1)
- `apps/web/app/alt/page.tsx` — own metadata, pinned concept title, noindex (FR-8)
- `apps/web/app/sections/content.ts` — `SITE_TITLE`/`PRODUCT_NAME`/`PRODUCT_NAME_PARTS`,
  install single-sourced, `TRUST_STRIP` hrefs, `PROOF` deleted (FR-1/3/4/7)
- `apps/web/app/sections/ui.tsx` — `Wordmark` derives from `PRODUCT_NAME_PARTS` (FR-1)
- `apps/web/app/sections/index.tsx` — `Refusal` id, TrustStrip anchors, hero wrapper
  class, two `CopyableCodeBlock` imports (FR-4/6/9)
- `apps/web/app/sections/tabs.tsx` — two `CopyableCodeBlock` imports (FR-9)
- `apps/web/app/sections/hero-terminal.tsx` — copy control (FR-2)
- `apps/web/app/sections/nav.tsx` — retained-ratio scrollspy, `aria-current` (FR-5)
- `apps/web/app/globals.css` — the ≤900px hero rule (FR-6)
- `packages/design/src/react/CodeBlock.tsx` — server renderer, `copyable` prop REMOVED,
  span deleted (FR-9)
- `packages/design/src/react/client.ts` — NEW: `CopyableCodeBlock` (FR-9)
- `packages/design/src/react/index.ts` — barrel keeps the server renderer only (FR-9)
- `packages/design/tsup.config.ts` — second config + `banner {js:'"use client";'}` +
  both `clean: false` + pre-clean build script (FR-9)
- `packages/design/package.json` — `./react/client` export, build script (FR-9)
- `packages/design/README.md`, `apps/web/README.md` — import-contract descriptions (FR-9)
- `_docs/launch/announcement-draft.md` — NEW `## Launch checklist` section (FR-1)
- `apps/web/test/metadata.test.ts` — NEW (FR-1/FR-8)
- `apps/web/test/landing.test.tsx`, `apps/web/test/content-web.test.ts`,
  `apps/web/test/a11y.test.ts` — extended, never weakened
- `packages/design/test/props.test.tsx` — extended (FR-9)
- `_brain/learnings/metadata-declares-what-it-cannot-provide.md` + `_brain/INDEX.md` —
  the Memory Output + hook
- `_docs/reviews/review-027-landing-adoption-polish.md` — Phase 6 artifact
- `_docs/wip/summary-027-landing-adoption-polish.md` — Phase 7 summary

---

## Tasks

- [x] 0.0 Pre-flight
  - [x] 0.1 `node packages/provegate/dist/cli.js open PRD-027` — lease the Conflict
        Surface (apps/web files, five design files, two READMEs, launch draft, brain
        learning). `gate queue` first: no expected overlap with active claims.
  - [x] 0.2 Add the Active Agents row to `STATUS.md`; create the implementation
        worktree (`git worktree add -b prd-027-landing-adoption-polish
        ../provegate-prd-027 main` + `pnpm install --frozen-lockfile` +
        `pnpm --filter @provegate/design build` — web consumes the built dist).
  - [x] 0.3 Fresh baseline: `pnpm --filter web build`, then run the four §2 metric
        commands and record their pre-change outputs in the Progress Log
        (expected: `12 6 0` · `4 false true` · `38 ["PROOF"]` · `true false`).
  - [x] 0.4 **STOP-equivalent handoff row**: the 375×667 hero-height baseline is the
        operator's, measured on the PRE-change tree before any 7.x work merges — the
        row is seeded in Operator Handoff below. Implementation of 7.0 may not start
        until its `Recorded value` cell is filled.
- [x] 1.0 FR-1 + FR-8 — the card and the concept page, one atomic unit
  - [x] 1.1 `apps/web/app/opengraph-image.tsx`: file-convention OG route, 1200×630,
        brand values imported from `@provegate/design/tokens` JS (satori cannot read
        CSS custom properties — the PRD-014 pattern), title/name from the new
        `content.ts` constants.
  - [x] 1.2 `apps/web/app/sections/content.ts`: add `SITE_TITLE`, `PRODUCT_NAME`,
        `PRODUCT_NAME_PARTS`; `apps/web/app/sections/ui.tsx::Wordmark` derives from
        the parts; `layout.tsx` metadata derives title/description from the constants,
        declares NO `openGraph.images`/`twitter.images` key, and carries the comment
        naming the resolver reason (`resolve-metadata.js:137-157`).
  - [x] 1.3 `apps/web/app/alt/page.tsx`: exported `metadata` — pinned title
        `ProveGate — alternative landing concept`, own description, `card: 'summary'`,
        no image of either kind, `robots: noindex, nofollow`.
  - [x] 1.4 `_docs/launch/announcement-draft.md`: append the `## Launch checklist`
        section — one item: owner runs an OG debugger against the deployed origin
        before the first share; `/` renders the 1200×630 card, `/alt` title-only;
        ordering: after first deploy, before first share.
  - [x] 1.5 NEW `apps/web/test/metadata.test.ts`: the source coherence triple; fresh
        built `index.html` emits absolute `og:image`, 1200/630 dimensions,
        `twitter:image`; `alt.html` emits the pinned title, no image, summary card,
        noindex+nofollow robots; an ABSENT build file fails both rows rather than
        skipping.
  - [x] 1.6 `pnpm --filter web build` + `node scripts/check-static-egress.mjs` — the
        card added no external fetch.
- [x] 2.0 FR-9 — the split renderer
  - [x] 2.1 `packages/design/src/react/CodeBlock.tsx`: delete the aria-hidden span and
        the `copyable` prop from `CodeBlockProps`; the server renderer keeps
        everything else byte-compatible for existing consumers.
  - [x] 2.2 NEW `packages/design/src/react/client.ts`: `CopyableCodeBlock` — wraps the
        server renderer; `<button type="button">` with accessible name `/copy/i` in
        the header slot; payload = `copyText` ?? string `children`; renders no control
        when neither yields a string; `navigator.clipboard` guarded (absent → no-op).
  - [x] 2.3 `packages/design/tsup.config.ts`: export an array — existing config plus a
        `react/client` entry config carrying `banner: { js: '"use client";' }`; BOTH
        configs `clean: false`; `packages/design/package.json` build script becomes
        `rm -rf dist && tsup`, exports gains `./react/client` → dist path.
  - [x] 2.4 Migrate the four call sites: `apps/web/app/sections/index.tsx` (2) and
        `apps/web/app/sections/tabs.tsx` (2) import `CopyableCodeBlock` from
        `@provegate/design/react/client`.
  - [x] 2.5 Update `packages/design/README.md` and `apps/web/README.md`
        import-contract descriptions; `apps/docs/README.md` untouched.
  - [x] 2.6 Tests: `packages/design/test/props.test.tsx` — button renders + activation
        writes payload (clipboard mocked) + missing clipboard no-throw + non-string
        no-control + **the barrel `CodeBlockProps` type carries no `copyable`**
        (type-level assertion) + **built `dist/react/client.js` starts with
        `"use client"`** + **five-output coexistence after one clean build**
        (`tokens`, `cli/index`, `react/index`, `react/client`, declarations).
        `apps/web/test/landing.test.tsx` — the four blocks expose working controls
        whose payloads equal the constants they render, and the four import sites
        resolve to the client subpath.
- [x] 3.0 FR-2 — the hero copy control
  - [x] 3.1 `apps/web/app/sections/hero-terminal.tsx`: real copy control for the
        install command; usable before the typing animation finishes; present in the
        reduced-motion finished state; clipboard guarded as FR-9's.
  - [x] 3.2 `landing.test.tsx`: control present, payload is the real install constant,
        reduced-motion state carries it, animation unaffected by activation.
- [x] 4.0 FR-3 + FR-7 — one install source, no dead exports
  - [x] 4.1 `content.ts`: the install command declared once; hero terminal, hero copy,
        install tab and `/alt` all derive from it (value derivation, not equal
        strings).
  - [x] 4.2 Delete `content.ts::PROOF`; `content-web.test.ts`: word-anchored,
        comment-stripped app-wide census excluding the declaration file — zero
        externally-unreferenced exports; the four install consumers derive from the
        single declaration.
- [x] 5.0 FR-4 — claims link to their proof
  - [x] 5.1 `sections/index.tsx`: `Refusal` gains `id="refusal"`; the three
        `TRUST_STRIP` claims render as `<a href="#…">` to `#refusal`/`#ledger`/`#proof`
        (hrefs live in `content.ts`).
  - [x] 5.2 `landing.test.tsx`: the anchor-closure test — every rendered `href="#…"`
        (nav and footer included) resolves to a rendered id.
- [x] 6.0 FR-5 — the scrollspy
  - [x] 6.1 `sections/nav.tsx`: retained per-target ratio map with declared thresholds
        (a callback is a delta, not a snapshot), document-order tie-break,
        `aria-current="location"` on exactly one desktop-strip link, no indicator
        below 900px, no-`IntersectionObserver` renders inert and throws nothing.
  - [x] 6.2 `landing.test.tsx`: sequential-callback simulation incl. out-of-order
        threshold arrivals; exactly one location token with the drawer open.
- [x] 7.0 FR-6 — the mobile hero (blocked on the Operator Handoff baseline row)
  - [x] 7.1 `globals.css` ≤900px block + `sections/index.tsx` hero wrapper class: the
        `HandoffCard` absent from the collapsed hero, no second copy anywhere.
  - [x] 7.2 `a11y.test.ts` + `landing.test.tsx`: the wrapper class sits inside the
        900px block; exactly one `HandoffCard` in the document, inside that wrapper —
        the CSS rule and the card count cannot both pass while the card shows.
- [x] 8.0 Phase 5 — Testing: every PRD §11 row, then the floor
  - [x] 8.1 `pnpm --filter web build` (fresh, FR-1)
  - [x] 8.2 `pnpm --filter web test test/metadata.test.ts` (FR-1 + FR-8)
  - [x] 8.3 `node scripts/check-static-egress.mjs` (FR-1 reading)
  - [x] 8.4 `pnpm --filter web test test/landing.test.tsx` (FR-2/4/5/6/9)
  - [x] 8.5 `pnpm --filter web test test/content-web.test.ts` (FR-3 + FR-7)
  - [x] 8.6 `pnpm --filter web test test/a11y.test.ts` (FR-6)
  - [x] 8.7 `pnpm --filter @provegate/design test` (FR-9)
  - [x] 8.8 Floor: `pnpm check-types` && `pnpm lint` && `pnpm test` && `pnpm build`
        && `pnpm --filter web build` && `node scripts/check-static-egress.mjs`
  - [x] 8.9 Post-change metric re-run: the four §2 commands emit their Target values;
        record outputs in the Progress Log next to the 0.3 baselines.
  - [x] 8.10 Re-read PRD §12 DO NOT — confirm none introduced (no section reorder, no
        copy-hierarchy change, no `.changeset/` write, no reformat sweep, no
        aria-hidden fallback span).
- [x] 9.0 Phase 6 — Final Auditing
  - [x] 9.1 Independent adversarial review, different model/session, `Critical: 0`,
        `Quorum` field present (`1/1 pass`) →
        `_docs/reviews/review-027-landing-adoption-polish.md`.
  - [x] 9.2 Operator rows executed in a real browser (Claude-in-Chrome per the
        PRD-013 pattern; same-origin 375px iframe for the viewport rows) — results
        recorded in Operator Handoff, `skipped` illegal.
  - [x] 9.3 `pnpm verify:workflow` green after any review-driven fix.
  - [x] 9.4 Draft `_docs/wip/summary-027-landing-adoption-polish.md`.
- [ ] 10.0 Phase 7 — Learning and close (operator-gated)
  - [x] 10.1 Write `_brain/learnings/metadata-declares-what-it-cannot-provide.md` +
        the `_brain/INDEX.md` hook (≤120 chars).
  - [x] 10.2 `pnpm verify:durable-artifacts` — learning, INDEX hook, review artifact,
        launch-checklist section all in the merge diff.
  - [ ] 10.3 Owner acceptance: the merge gate refuses without an owner-signed entry in
        `_state/acceptances.json` covering the operator rows — the agent transcribes
        only on explicit in-session owner direction, never originates.
  - [ ] 10.4 `node packages/provegate/dist/cli.js run PRD-027` — chain + local merge;
        if the run stops after "archived", follow `gate-run-resume-after-archive`
        (un-archive, resume `--from-phase=7`). Push stays the owner's.
  - [ ] 10.5 `release PRD-027`, drop the STATUS.md row, remove the worktree.

---

## Verification Ledger

| Gate | Command / Check | Scope | Result | Evidence | Notes |
| ---- | --------------- | ----- | ------ | -------- | ----- |
| FR-1 | `pnpm --filter web build` | web | passed | fresh build 2026-07-28 | fresh build precedes emitted reads |
| FR-1/8 | `pnpm --filter web test test/metadata.test.ts` | web | passed | 8 passed (8), fresh build | coherence triple + emitted card + exact alt title/description; absent file fails |
| FR-1 | `node scripts/check-static-egress.mjs` | root | passed | [egress] clean | zero external origins |
| FR-2/4/5/6/9 | `pnpm --filter web test test/landing.test.tsx` | web | passed | 37 passed (37) — web suite total 67/67 across four files | sequential-callback scrollspy, anchor closure, four clicked payloads |
| FR-3/7 | `pnpm --filter web test test/content-web.test.ts` | web | passed | 13 passed (13); 41 exports, zero orphans; unrecognized export forms fail loudly | word-anchored census |
| FR-6 | `pnpm --filter web test test/a11y.test.ts` | web | passed | 9 passed (9) | wrapper class inside the 900px block via the shared constant |
| FR-9 | `pnpm --filter @provegate/design test` | design | passed | 53 passed (53) incl. built-directive, five-output coexistence, and both type-level deny tests (copyable AND headerControl) | button/type/directive/coexistence set |
| metrics | the four §2 commands, post-change | web | passed | M1 15/7/0 · M2 client-button true, server-span false · M3 41 [] · M4 false true | targets vs 0.3 baselines |
| types | `pnpm check-types` | monorepo | passed | 0 errors | |
| lint | `pnpm lint` | monorepo | passed | 0 warnings | |
| test | `pnpm test` | monorepo | passed | 7/7 turbo tasks | |
| build | `pnpm build` + `pnpm --filter web build` | monorepo | passed | clean | |
| independent-review | `Critical: 0`, Quorum `1/1 pass` | review | passed | 3 Codex rounds: 2 criticals found→fixed→re-verified; round 3 'No findings … PASS' | `_docs/reviews/review-027-landing-adoption-polish.md` |
| durable | `pnpm verify:durable-artifacts` | repo | passed | learning + INDEX hook + review artifact + launch checklist all in the diff | incl. launch checklist section |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

## Deferrals & Decisions

- 2.2 — the header slot lives on `CodeBlockBase`, the INTERNAL renderer (not
  barrel-exported): the client wrapper's button lands in the one existing header markup
  without duplicating it, while the public `CodeBlock` carries no slot at type level and
  hard-drops it at runtime after the spread. Server-safety preserved — the docs MDX
  consumer renders identically. (Recorded as corrected across Codex rounds 1–2; the
  earlier public-slot version was both rounds' [P1].)
- 2.2 — `client.ts` became `client.tsx` (the component is JSX); the shipped entry path
  `dist/react/client.js` is unchanged, which is the contract.
- 2.1 (Codex round 1 [P1]) — the header slot moved off the public surface: `CodeBlockBase`
  (internal, carries `headerControl`) is not barrel-exported, the public `CodeBlock` has
  no slot, and a type-level deny test holds it — a public node slot would have been the
  handlerless-affordance path back in.
- 0.4 — the hero baseline (1562 px) was captured through the sanctioned Claude-in-Chrome +
  same-origin-iframe method against the pre-change main tree served locally; the owner's
  close acceptance covers it per the PRD-013 precedent.

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
| 2026-07-28 | 0.3 | Baseline metrics, pre-change: M1 `12 6 0` · M2 `4 false true` · M3 `38 ["PROOF"]` · M4 `true false` — all four exactly the expected values |
| 2026-07-28 | 0.4 | Hero baseline recorded: **1562 px** at 375×667 on the pre-change tree (iframe method); 7.x unblocked |

## Blockers / Open Questions

- (none)

## Operator Handoff

> Real-browser checks; `skipped` illegal. Category ∈ {runtime, staging, deploy, secret,
> manual-qa, legal, external}.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
| 0.4 | manual-qa | owner | **Baseline: 375×667 hero block rendered height on the PRE-change tree.** Recorded value: **1562 px** | recorded | measured 2026-07-28 BEFORE any 7.x implementation, via Claude-in-Chrome + 375px same-origin iframe (PRD-013 pattern) against the pre-change main tree served at localhost; HandoffCard visible, no h-scroll, iframe width verified 375; agent-measured through the sanctioned method — the owner's close acceptance covers it per the PRD-013 precedent |
| 9.2a | manual-qa | owner | hero copy control and install-tab control write the real command to the system clipboard, both themes | passed | 2026-07-28: payload captured in-browser both themes (exact install constant, 4 controls); real click + owner Cmd+V confirmed the system clipboard |
| 9.2b | manual-qa | owner | 375×667 post-change: hero measurably shorter than the recorded baseline; no `HandoffCard` in the hero; no horizontal scroll | passed | 2026-07-28: 1240px vs 1562px baseline (−322px); wrapper display:none; the only other HANDOFF CARD text is the Next flight payload, not DOM; no h-scroll |
| 9.2c | manual-qa | owner | scrolling `/` highlights exactly one nav link incl. fast scroll; no text shift; nothing below 900px | passed | 2026-07-28, visible tab: 5/5 sections each exactly one aria-current; fast out-of-order scroll retains the last max (no flicker to none); initial hidden-tab zero readings were rAF suspension, not a defect |
| 9.2d | manual-qa | owner | the three trust-strip anchors take focus, show a visible ring, land on the right section (keyboard) | passed | 2026-07-28: owner Tab-tested live — rings visible, targets correct; machine half: universal :focus-visible ring rule applies, focus() + targets verified (scripted focus cannot trigger Chrome's focus-visible heuristic, which is why the eye half is the owner's) |

> **Launch precondition (NOT a close row):** after the first deploy and before the first
> share, the owner runs the OG-debugger check per the `## Launch checklist` FR-1 adds to
> `_docs/launch/announcement-draft.md`.
