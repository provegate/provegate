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
  (`gate init/run/push/ledger`) over a TOML gate config. The shipped tool has
  **thirteen** commands (`init new open renew release status queue check doctor
  memory run land push`), uses `workflow.config.json` + `gates.manifest.json`,
  and has neither of the prototype's invented config file nor its `ledger`
  subcommand. This page uses the **real** surface, and `landing.test.tsx` asserts
  the two fictional tokens never render.
- **Fictional distribution channels and flags.** No Homebrew tap, no
  `curl | sh` installer, no CI-mode flag on `gate run` — none of them exist.
  Install is npm/pnpm; CI runs the same commands the manifest declares.
  `content-web.test.ts` asserts all three stay absent, and that any `gate run`
  flag named on the page is one the CLI actually accepts.
- **Placeholder version / badges / download counts.** Never shipped; a test bans
  a hardcoded version, star, or download claim.

### The Playground: a plan, never a simulated run

The prototype's Playground edited a TOML file and printed invented verdicts. The
shipped section (`app/sections/playground.tsx`) edits the **real**
`gates.manifest.json` and renders the chain that `gate run --dry-run` would
print — the same validation messages and the same `planChain` grammar as
`packages/provegate`. It carries **no verdict and no green**, because nothing has
run: green is earned, and a plan earns nothing. `landing.test.tsx` asserts the
rendered output contains neither `passed` nor `exit 0`.

Terminal blocks elsewhere on the page remain real, static, copy-exact CLI output
as selectable text (the brief's §12.4 decision).

## No third-party requests

`scripts/check-static-egress.mjs` scans the built output and fails on any
off-origin fetch (a font CDN, analytics, a CSS `url(http…)`). Fonts are
self-hosted via `@provegate/design`. (Blind spot, stated: a URL assembled at
runtime is invisible to a static scan.)

## Where a section lives

`app/sections/index.tsx` holds the server-rendered sections and re-exports the
interactive ones, so `page.tsx` and the tests see one module surface. Anything
that needs state gets its own `'use client'` module:

| Module | Section |
|---|---|
| `nav.tsx` | theme toggle + mobile drawer |
| `hero-terminal.tsx` | the typing hero terminal |
| `gate-run.tsx` | the staged `gate run` with replay |
| `playground.tsx` | the manifest validator + dry-run plan |
| `tabs.tsx` | `InstallTabs`, `CIIntegration` |
| `phase-detail.tsx` | the seven-phase selector |
| `faq.tsx` | quickstart + FAQ accordion |
| `anatomy.tsx` | the status-line breakdown |

Shared layout helpers (`SectionHead`, `Mark`, `Wordmark`, the fluid type ramp)
live in `ui.tsx` and are hook-free, so both server and client sections import
them.

## Adding a section

1. Add a component to `app/sections/index.tsx`, composing design primitives.
2. Put any copy in `app/sections/content.ts` — and only facts that trace to the
   design brief §2/§4 or the whitepaper. **Never invent a number.**
3. Mount it in `app/page.tsx` in narrative order.
4. `landing.test.tsx` checks the section set + order; `content-web.test.ts`
   checks copy discipline and that no raw hex crept in.

Copy affordances import from `@provegate/design/react/client`
(`CopyableCodeBlock`) — the server barrel's `CodeBlock` deliberately has no
copy prop, so an affordance can never render without its handler (PRD-027).
