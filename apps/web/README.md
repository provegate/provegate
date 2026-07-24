# apps/web — the ProveGate landing page

The public landing page (provegate.dev), built on the shared design system.

## The token map

Every colour, font, radius, and spacing value comes from `@provegate/design` —
this app authors **no** hex and **no** font stack (a test enforces it). The layout
imports the token entry once:

```ts
import '@provegate/design/styles.css'; // --pg-* tokens + self-hosted IBM Plex
import './globals.css'; // page-local: reset, focus ring, reveal-on-scroll
```

All nine UI components (`GateLine`, `HandoffCard`, `EvidenceTable`,
`PhasePipeline`, `VerdictBadge`, `CodeBlock`, `Button`, `Icon`, `Admonition`) are
imported from `@provegate/design/react` — never reimplemented here. Section
composition and page-local helpers are the only new work.

Dark is canonical (design brief §12.1); a tiny inline script mirrors
`prefers-color-scheme` onto `<html data-theme>` so light is first-class with no
flash and no third-party request.

## Rebuilt from the prototype, not copied

The landing handoff (`docs/design/design_handoff_landing/`) is a React/Babel
prototype. This app rebuilds it idiomatically in Next.js against the real design
primitives. The prototype's `ds-overrides.jsx` shim and `_ds_bundle.js` are never
touched.

### Prototype facts that were rejected (do-not-say)

- **A fictional CLI surface.** The prototype presents four commands
  (`gate init/run/push/ledger`) over a `gate.toml` config. The shipped tool has
  **ten** commands, uses `workflow.config.json` + `gates.manifest.json`, and has
  no `gate ledger` and no `gate.toml`. This page uses the **real** surface, and a
  test asserts `gate.toml`/`gate ledger` never render.
- **The live Playground.** Dropped. The tool can't be simulated in-browser
  without fabricating output, so the terminal blocks are **real, static,
  copy-exact CLI output** (selectable text) — the brief's §12.4 decision.
- **Placeholder version / badges / download counts.** Never shipped; a test bans
  a hardcoded version, star, or download claim.

## No third-party requests

`scripts/check-static-egress.mjs` scans the built output and fails on any
off-origin fetch (a font CDN, analytics, a CSS `url(http…)`). Fonts are
self-hosted via `@provegate/design`. (Blind spot, stated: a URL assembled at
runtime is invisible to a static scan.)

## Adding a section

1. Add a component to `app/sections/index.tsx`, composing design primitives.
2. Put any copy in `app/sections/content.ts` — and only facts that trace to the
   design brief §2/§4 or the whitepaper. **Never invent a number.**
3. Mount it in `app/page.tsx` in narrative order.
4. `landing.test.tsx` checks the section set + order; `content-web.test.ts`
   checks copy discipline and that no raw hex crept in.
