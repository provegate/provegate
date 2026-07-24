# ProveGate docs (`apps/docs`)

The documentation site — Next.js + [Fumadocs](https://fumadocs.dev) (`@fumadocs/base-ui`),
themed to ProveGate on the shared design system (`@provegate/design`, PRD-010/012).

```bash
pnpm --filter docs dev   # http://localhost:3001
```

## Theming is a token map, not a fork

The ProveGate look comes from **binding** Fumadocs' own CSS variables onto the
`--pg-*` tokens — never from forking a Fumadocs layout component. Forking a
layout to restyle it turns every Fumadocs upgrade into a merge conflict; binding
variables keeps upgrades clean. Every Fumadocs component is used as-is and simply
reads the overridden variables.

- `app/global.css` — after the Fumadocs imports, `:root` rebinds
  `--color-fd-*` → `--pg-*`. The `--pg-*` tokens carry their own light/dark
  values via `[data-theme]`, so one block themes both modes.
- `app/layout.tsx` — imports `@provegate/design/styles.css` (self-hosted IBM
  Plex + tokens) and sets `RootProvider` dark-canonical. `next-themes` is
  configured to write the theme to **both** Fumadocs' `.dark` class and our
  `[data-theme]` attribute, which is what lets the single binding block work.

### Colour law in the chrome

Green is earned (passed work only). Fumadocs' `--color-fd-primary` is the
interactive/link colour and `--color-fd-accent` is a hover surface — neither is
the brand's green accent — so they bind to the neutral link/surface tokens,
keeping green out of the navigation and links. Semantic callout colours are left
at Fumadocs' defaults.

### FR-1 binding finding (verify-first)

`@fumadocs/base-ui` 16.x defines `--color-fd-*` in `css/lib/default-colors.css`:
light values in a Tailwind-v4 `@theme {}` block, dark values in a plain `.dark {}`
selector (a class toggle), and semantics in `@theme static`. These are ordinary
runtime CSS custom properties, so **a later `:root` override wins the cascade** —
no `@theme` block of our own is required, and no layout component is forked.

## MDX component map

`components/mdx.tsx` registers the shared design components so docs authors can
use them directly in MDX: `CodeBlock`, `GateLine`, `HandoffCard`,
`EvidenceTable`, `PhasePipeline`, `VerdictBadge`, `Admonition`. All are
presentational (no client hooks), so they render in Fumadocs' server MDX
pipeline as-is.

## OG card

`app/og/docs/[...slug]/route.tsx` renders the brand card (wordmark + page
title). The `[...slug]` input is **bounded** (length cap + charset) with a
site-title fallback, so arbitrary/oversized text never reaches the rendered
image. The card inlines literal brand colours because satori (next/og) cannot
read CSS custom properties.

## No third-party requests

Self-hosted fonts, no CDN, no analytics. `scripts/check-static-egress.mjs`
scans `apps/docs/.next` for any external origin.

`lucide-react` **stays**: the "no third-party icon pack" rule governs *our* `Icon`
component, not Fumadocs' internals, which depend on it.
