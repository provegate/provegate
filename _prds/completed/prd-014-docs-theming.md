# PRD-014: Docs Theming + OG — apps/docs on the Shared System

> **Status**: Draft
>
> **Created**: 2026-07-24
> **Updated**: 2026-07-24
> **Author**: owner
> **Audience**: Implementing Agent (Claude Code / Cursor / Codex)
> **Slug**: `docs-theming`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Class Rationale**: (default class) — the documentation site's visual identity
> and its social/OG surface.
> **Autonomous Close**: operator-gated
> **State Record**: `_state/prds.json`

---

## 1. Introduction / Overview

`apps/docs` runs stock Fumadocs styling. This PRD makes it look like ProveGate by
**mapping** the `--pg-*` tokens (PRD-010) onto Fumadocs' own CSS variables — a
token map, **not a fork** of Fumadocs' layout — registering the design components
(PRD-012) in the MDX component map, and rendering the brand OG card on the
existing OG route. It is the third and last web-wave PRD (after PRD-012 components
and PRD-013 landing).

Inherited rules: **no external requests** (self-hosted fonts, no CDN, no
analytics); the **colour law** holds (green earned only); the wordmark casing and
closed verdict vocabulary are preserved. Docs *content* (`content/docs/**`) is NOT
rewritten — only presentation and the component map change.

---

## 2. Goals

### Primary Goals

- [ ] Docs render in the ProveGate visual language: same green, type, mark, dark
      canonical — every value from `@provegate/design`.
- [ ] The Fumadocs theme is a token map, not a fork of its layout.
- [ ] The MDX component map exposes the design components to docs authors.
- [ ] The OG route renders the brand card; the site makes zero third-party
      requests.

### Success Metrics

| Metric                                | Current       | Target          | Measurement            |
| ------------------------------------- | ------------- | --------------- | ---------------------- |
| Forked Fumadocs layout components     | 0             | 0               | review + `docs build`  |
| Third-party origins in built docs     | 0 → port risk | 0               | `check-static-egress.mjs` |
| Design components in the MDX map      | 0             | 7               | `mdx.tsx`              |
| Unbounded OG slug input               | yes           | bounded         | `route.tsx` grep       |

---

## 3. User Stories

#### User Story 1

```
As a reader moving between the landing, the docs, and my terminal,
I want all three to look like one product,
so that ProveGate never feels like three different tools.
```

**Acceptance Criteria:**

- [ ] `--pg-*` tokens are bound onto Fumadocs' own CSS variables; no Fumadocs
      layout component is forked to theme it.
- [ ] Dark is canonical; light is a real theme; fonts are the shared self-hosted
      IBM Plex.
- [ ] MDX gains `CodeBlock`, `GateLine`, `HandoffCard`, `EvidenceTable`,
      `PhasePipeline`, `VerdictBadge`, `Admonition` through the component map.

#### User Story 2

```
As someone sharing a docs link,
I want a branded OG card,
so that the preview reads as ProveGate — without leaking or crashing on odd slugs.
```

**Acceptance Criteria:**

- [ ] The OG route renders the brand card (mark + title).
- [ ] The `[...slug]` input is bounded (length + charset) with a title fallback,
      so unbounded arbitrary text never reaches the rendered image.

#### User Story 3

```
As a visitor who cares about no-telemetry,
I want the docs to make zero third-party requests,
so that the principle holds across the whole property.
```

**Acceptance Criteria:**

- [ ] A build-output scan finds no external origin in the docs app.
- [ ] `lucide-react` (a Fumadocs internal dependency) stays — the "no third-party
      icon pack" rule governs OUR components, not Fumadocs internals.

---

## 4. Functional Requirements

1. **FR-1**: **Verify the binding mechanism first** against the installed
   `@fumadocs/base-ui` (16.x) on Tailwind v4: determine whether binding `--pg-*`
   onto Fumadocs' `--color-fd-*` variables in `global.css` themes the site, or
   whether a Tailwind v4 `@theme` block is required; record the finding in the FR
   before wiring.
   - **Targets:** `apps/docs/app/global.css`
2. **FR-2**: Bind the tokens: map `--pg-*` onto Fumadocs' variables in
   `global.css`, wire the shared self-hosted fonts (`@provegate/design/styles.css`
   or its font layer), set dark canonical. Fumadocs' own layout components are
   used as-is; no fork.
   - **Targets:** `apps/docs/app/global.css`, `apps/docs/lib/layout.shared.tsx`,
     `apps/docs/app/layout.tsx` (font wiring + `RootProvider` dark-canonical;
     added to the surface 2026-07-24 — the draft missed it, but self-hosted IBM
     Plex over the stock `next/font/google` Inter and the next-themes default
     both live here)
3. **FR-3**: Register the design components in the MDX component map so docs
   authors get `CodeBlock`, `GateLine`, `HandoffCard`, `EvidenceTable`,
   `PhasePipeline`, `VerdictBadge`, `Admonition`.
   - **Targets:** `apps/docs/components/mdx.tsx`, `apps/docs/package.json`
4. **FR-4**: Render the brand OG card on the existing OG route, and **bound the
   `[...slug]` input** (cap length, restrict charset, fall back to the site title
   on violation) before it reaches the image.
   - **Targets:** `apps/docs/app/og/docs/[...slug]/route.tsx`
5. **FR-5**: `scripts/check-static-egress.mjs` covers the docs build output too
   (shared with PRD-013 if it lands first; additive otherwise) — zero external
   origins.
   - **Targets:** `scripts/check-static-egress.mjs`
6. **FR-6**: `apps/docs/README.md` (or a docs note) — the token-map approach, why
   Fumadocs is bound not forked, the FR-1 binding finding, and that `lucide-react`
   stays.
   - **Targets:** `apps/docs/README.md`

---

## 5. Non-Goals (Out of Scope)

- The nine components (PRD-012) and `apps/web` (PRD-013).
- Rewriting docs **content** (`content/docs/**`) — only presentation + the MDX map.
- Forking any Fumadocs layout component.
- Stripping `lucide-react` from Fumadocs internals.
- Analytics, a font CDN, or any third-party request.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** the docs site, **When** Fumadocs' layout components are inspected,
  **Then** none is forked — theming is variable binding only.
- **Given** the built docs, **When** `check-static-egress.mjs` runs, **Then** it
  reports zero external origins.
- **Given** the OG route, **When** an oversized/odd slug is passed, **Then** the
  input is bounded and the card falls back to the site title.
- **Given** an MDX page, **When** it uses a design component, **Then** the
  component renders through the map.

---

## 7. Technical Considerations

### Architecture

- **Depends on PRD-012** (components) and PRD-010 (tokens/fonts). Independent of
  PRD-013 in code; both add `scripts/check-static-egress.mjs` (shared, additive).
- **Bind, don't fork.** Forking a Fumadocs layout to restyle it makes every
  upgrade a merge conflict; binding `--pg-*` onto `--color-fd-*` keeps upgrades
  clean. The FR-1 verify-first step de-risks the Tailwind v4 mechanism.
- **`lucide-react` stays.** The no-third-party-icon rule governs OUR `Icon`
  component, not Fumadocs' internals.

### Dependencies

- `@provegate/design` (workspace). No third-party runtime dep, no font service,
  no analytics. `apps/docs` keeps its existing Fumadocs/Tailwind stack.

---

## 8. Implementation Scope

### In Scope

- [ ] `apps/docs/app/global.css`, `apps/docs/app/layout.tsx`,
      `apps/docs/lib/layout.shared.tsx`, `apps/docs/components/mdx.tsx`, the OG
      route, `apps/docs/README.md`, `apps/docs/package.json`
- [ ] `scripts/check-static-egress.mjs` (shared with PRD-013)

### Out of Scope

- `apps/docs/content/**`, `apps/web/**`, `packages/**`.

---

## 9. Open Questions

- (none — the Tailwind-v4 binding mechanism is a verify-first step inside FR-1,
  not a blocking unknown)

---

## 10. References

- `docs/design/design_handoff_provegate/design-system/ui_kits/docs/` — the docs
  surface recreation
- `docs/design/design_handoff_provegate/design-system/ui_kits/brand/` — the OG
  card style
- `packages/design/src/tokens/*.css` — the `--pg-*` tokens to bind (PRD-010)
- `_prds/wip/prd-012-web-design-adoption.md` — the components to register

---

## Conflict Surface

- `apps/docs/app/global.css`
- `apps/docs/app/layout.tsx`
- `apps/docs/app/og/docs/[...slug]/route.tsx`
- `apps/docs/components/mdx.tsx`
- `apps/docs/lib/layout.shared.tsx`
- `apps/docs/README.md`

> `scripts/check-static-egress.mjs` and `apps/docs/package.json` are shared,
> append-only-style surfaces edited additively; not leased exclusively.

---

## Durable Artifacts

- `apps/docs/README.md` — the token-map approach, bind-not-fork, the FR-1 binding
  finding, why `lucide-react` stays

---

## 11. Verification Commands

Run from repo root after `pnpm build`.

| FR    | Command / Check                                                   | Scope | Notes                                    |
| ----- | ----------------------------------------------------------------- | ----- | ---------------------------------------- |
| FR-1  | `grep -c "pg-" apps/docs/app/global.css`                          | docs  | tokens bound in global.css               |
| FR-2  | `pnpm --filter docs build`                                        | docs  | themed docs build clean                  |
| FR-3  | `grep -c "GateLine" apps/docs/components/mdx.tsx`                 | docs  | design components in the MDX map         |
| FR-4  | `grep -Eq "slice\(0," "apps/docs/app/og/docs/[...slug]/route.tsx"` | docs  | OG slug bounded before render            |
| FR-5  | `node scripts/check-static-egress.mjs`                            | root  | zero external origins in docs build      |
| FR-6  | `grep -c "token map" apps/docs/README.md`                        | docs  | theming approach documented              |

Cross-cutting (all green before Code Complete):

- `pnpm check-types` · `pnpm lint` · `pnpm test` · `pnpm build`
- `node packages/provegate/dist/cli.js check PRD-014`
- `node packages/provegate/dist/cli.js push; test $? -eq 1`
- `grep -ri -l -e emofy -e rayvaz apps/docs/app apps/docs/components && exit 1 || true`

Operator-owned (real-browser, recorded as `operator` rows — `skipped` illegal):

- Visual parity of the themed docs vs the docs handoff (both themes); the OG card
  renders correctly for a real docs slug.

---

## 12. DO NOT (Anti-Patterns)

- DO NOT fork a Fumadocs layout component to theme it — bind `--pg-*` onto its
  variables instead.
- DO NOT strip `lucide-react` from `apps/docs` — Fumadocs' internals need it.
- DO NOT add analytics, a font CDN, a remote asset, or any third-party request.
- DO NOT hardcode a hex, font stack, radius, or spacing — reference the token.
- DO NOT use green for anything but earned pass; red only for real failure.
- DO NOT leave the OG `[...slug]` input unbounded.
- DO NOT edit `apps/docs/content/**` — only presentation and the MDX map.
- DO NOT reimplement a design component — register `@provegate/design/react`.
- DO NOT touch `packages/**` or `apps/web/**`.
- DO NOT introduce `any`.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-24 | owner  | Initial draft |
