# Handoff: ProveGate Design System → Monorepo

## Overview

This is the **ProveGate design system**, packaged for a developer using Claude
Code to wire it into the ProveGate monorepo. The goal: **one shared source of
truth** so the docs site, the landing site, and the `provegate` CLI all render
in the same visual language — same colors, same type, same verdict grammar.

The monorepo you're targeting:

```
provegate/
├─ apps/
│  ├─ docs/         # Fumadocs-style docs site (web)
│  └─ landing/      # marketing landing site (web)
├─ packages/
│  ├─ cli/          # the `provegate` / `gate` CLI (terminal)
│  └─ design/       # ← CREATE THIS: the shared design system
└─ ...
```

Everything below hangs off one idea: **`packages/design/` is the origin.**
The web apps import its CSS tokens + React components. The CLI imports its
color/glyph constants (it can't use CSS, so those tokens are re-expressed as
ANSI). Nobody hardcodes a hex, a glyph, or a verdict string anywhere else.

---

## Monorepo placement (pnpm + turbo)

One package, two render targets (web + terminal). Give it **two export paths**
so the CLI never bundles browser CSS.

```
packages/design/                      # @provegate/design
├─ package.json                       # exports map (below)
├─ src/
│  ├─ tokens.ts                       # SINGLE SOURCE of every hex
│  ├─ tokens/*.css  styles.css        # web css — GENERATED from tokens.ts
│  ├─ react/  (index.ts)              # components
│  └─ cli/   theme.ts                 # ANSI + glyph — GENERATED from tokens.ts, zero web imports
└─ dist/
```

**The load-bearing decision — one source of truth for tokens.** The real risk
is the hexes drifting between `colors.css` and the CLI's ANSI. Make `src/tokens.ts`
the only place hexes live; generate BOTH `tokens/colors.css` and `cli/theme.ts`
from it in a build step (`generate-tokens`). Change proof-green once → web and
terminal move together. The hex↔ANSI mapping in the "Design tokens" section
below is exactly that generator's table.

**`package.json` exports** — consumers import only the sub-path they need, so a
web bundle never pulls the CLI and the CLI never pulls CSS/React:

```json
{
  "exports": {
    "./styles.css": "./src/styles.css",
    "./react":      "./dist/react/index.js",
    "./cli":        "./dist/cli/index.js",
    "./tokens":     "./dist/tokens.js"
  }
}
```

**Turbo pipeline**
- `@provegate/design` gets a `build` task (react + cli + `generate-tokens`).
- `apps/web`, `apps/docs`, `packages/cli` set `dependsOn: ["^build"]` so any
  design change invalidates them.
- Make `generate-tokens` a task and add `src/tokens.ts` to `build`'s `inputs`
  so a token edit cache-busts correctly.

**Consumption**
- `apps/web` + `apps/docs`: once at the root, `import "@provegate/design/styles.css"`
  + components from `@provegate/design/react`. The Fumadocs theme is a **token-map
  override, not a rewrite** — bind `--pg-*` onto Fumadocs' own variables.
- `packages/cli`: only `@provegate/design/cli` (+ `./tokens`). It never touches
  React/CSS, so the zero-runtime-dependency rule holds (theme.ts is pure ANSI).

**Avoid:** duplicating hex/glyph per app; the CLI importing the web bundle
(the separate export path prevents this); embedding the font in the package
(web `@font-face` lives in design; the CLI ships colour + glyph, never a font —
it uses the user's terminal font).

## About the design files

The files in `design-system/` are the **real, authored source** of this system
— not throwaway prototypes:

- `styles.css` + `tokens/*.css` — the token layer. Ship these close to as-is.
- `components/**` — 9 React components as `.jsx.txt` + `.d.ts.txt` + `.prompt.md`
  (usage spec). These are reference implementations: recreate them in the app's
  actual component conventions, but keep the props contract in the `.d.ts.txt`.
  (The `.txt` suffix only keeps them out of the source system's compiler — drop
  it when you port them into `packages/design/`.)
- `SKILL.md` + `readme.md` — the brand rules. **Read these first.** They encode
  the non-negotiables (color law, voice, verdict casing) that make ProveGate
  look like ProveGate.
- `reference/cli-surface.html` — a rendered spec of the CLI output grammar
  (status lines, handoff box, refusal moment). Open it in a browser to see the
  target; the CLI section below tells you how to reproduce it in a terminal.

`assets/logo.svg` and `assets/favicon.svg` are single-color and final — use
them directly.

## Fidelity

**High-fidelity.** Colors, type, spacing, radii, and the CLI glyph grammar are
final. Reproduce them exactly. Where a value is a token, reference the token —
don't inline the resolved value.

---

## Setup: `packages/design/`

The package shape, exports map, single-source token generation, and turbo
pipeline are all in **Monorepo placement** above. In short:

- **Web apps** (`apps/docs`, `apps/landing`): import `@provegate/design/styles.css`
  once at the app root, then use the React components + `--pg-*` custom
  properties. Dark mode: set `<html data-theme="dark">` (dark is canonical).
- **CLI** (`packages/cli`): import `@provegate/design/cli` for colors and
  glyphs. Never duplicate the values.

The token layer is plain CSS custom properties, so it drops into any web stack
(Next.js, Vite, Astro, Fumadocs) with no build step. Do NOT fork the values per
app — that's the whole point of the package.

---

## Design tokens (the contract)

All tokens are CSS custom properties, prefixed `--pg-*`, defined in
`tokens/colors.css`, `typography.css`, `spacing.css`, `effects.css`, `fonts.css`.
Full ramps live in the files; the load-bearing semantic tokens:

### Color — light theme (`:root`) / dark theme (`[data-theme="dark"]`)

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `--pg-accent` / `--pg-pass` | `#147d45` | `#4fd08a` | proof green — **earned pass only** |
| `--pg-fail` | `#c13328` | `#f4776b` | **real failure only** |
| `--pg-warn` / `--pg-pending` | `#a66e08` | `#e8b44a` | warn / pending |
| `--pg-human` / `--pg-refusal` | `#2258c0` | `#6fa8f5` | human-authority gate + refusal |
| `--pg-plan` | `#2b6d78` | `#63b6c2` | dry-run / plan (muted cyan) |
| `--pg-stale` | `#7c6a34` | `#b39a52` | lease/verdict past TTL (dim amber) |
| `--pg-muted` | — | — | metadata (maps to text-subtle) |

### Color — terminal surface (theme-independent, ALWAYS dark)

The CLI has no light mode. These are fixed:

| Token | Hex | ANSI truecolor (`38;2;r;g;b`) |
|---|---|---|
| `--pg-term-bg` | `#14130d` | `48;2;20;19;13` |
| `--pg-term-fg` | `#e7e4db` | `38;2;231;228;219` |
| `--pg-term-dim` | `#8f8a7b` | `38;2;143;138;123` |
| `--pg-term-green` | `#4fd08a` | `38;2;79;208;138` |
| `--pg-term-red` | `#f4776b` | `38;2;244;119;107` |
| `--pg-term-amber` | `#e8b44a` | `38;2;232;180;74` |
| `--pg-term-human` | `#6fa8f5` | `38;2;111;168;245` |
| `--pg-term-plan` | `#63b6c2` | `38;2;99;182;194` |
| `--pg-term-stale` | `#b39a52` | `38;2;179;154;82` |
| `--pg-term-border` | `#2e2b25` | `38;2;46;43;37` |

Each slot also has a **16-color ANSI floor** (green=32/92, red=31/91,
yellow=33/93, blue=34/94, cyan=36/96, dim=90) for terminals without truecolor —
see the comments in `tokens/colors.css`.

### Type

- `--pg-font-sans`: **IBM Plex Sans** — all prose & UI.
- `--pg-font-mono`: **IBM Plex Mono** — all evidence: commands, exit codes,
  logs, ledger, verdicts. In the CLI, everything is mono by definition.

Web apps: load both families (Google Fonts `@import` is in `tokens/fonts.css`;
swap for self-hosted if licensed). The CLI uses whatever monospace font the
user's terminal is set to — you don't ship a font, you ship the color + glyph
grammar.

---

## The CLI surface (primary brand surface)

**Most people meet ProveGate as terminal output, so output is designed.** The
CLI is not styled with CSS — it's styled with a fixed grammar of glyphs, color
as signal, and box-drawing. `packages/cli` must reproduce this exactly.
`reference/cli-surface.html` is the visual target.

### Glyph grammar (fixed — the glyph carries status, colour is redundant)

| Glyph | Color token | Meaning |
|---|---|---|
| `✓` | term-green | passed / exit 0 |
| `✗` | term-red | failed / exit ≠ 0 |
| `⚠` | term-amber | partial / warn |
| `=` | term-dim | skipped |
| `→` | term-human | operator / handoff / next |
| `!` | term-stale | blocked / overlap |
| `·` | term-dim | separator / not-run (never green) |

**Status line shape:**
`<glyph> phase N · <name> · <command> · exit <code> · <verdict>`

**Closed ledger vocabulary** (the only verdict words a `gate run` writes):
`passed · failed · partial · skipped · operator · blocked`. `operator` (needs a
human/staging) and `blocked` (dependency broken) are the two honest escape
hatches — never a silent pass.

### Color-as-signal rules (non-negotiable — from the color law)

1. **Green is earned.** Only passed, verified work is green. A step that was
   listed but not run is dim, never green.
2. **Red is real failure.** Non-zero exit / genuine violation only. Never
   decorative, never a warning-you-can-ignore.
3. **Amber is warn / partial**, not "soft fail".
4. **Human-authority blue (`→`)** marks the operator gate + the refusal — the
   moment the machine hands back control.
5. **Verdicts are the closed lowercase set** `passed` / `failed` / `partial` /
   `skipped` / `operator` / `blocked`. Never `PROVEN`, never `VIOLATED`, never
   emoji. Loud states (`REFUSED`, `STOPPED`, `DRY-RUN`, `HANDOFF CARD`,
   `READY TO PUSH`) are UPPERCASE; verdicts stay lowercase.

### Box-drawing for the moments that matter

Box-drawing (`┌─┐│├┤└┘`) is reserved for two moments, not general output:

- **The handoff** — machine work complete, control returns to the human.
- **The refusal to push** — ProveGate proves everything green but will not run
  `git push`; that authority stays with the operator. The literal line is
  `No. Push is yours.` in human-blue.

Implement with a truecolor helper, honoring `NO_COLOR` / non-TTY (fall back to
the glyphs alone — they carry meaning without color):

```ts
// packages/design/cli/theme.ts
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (rgb: string, s: string) =>
  useColor ? `\x1b[${rgb}m${s}\x1b[0m` : s;

export const term = {
  pass:    (s: string) => c('38;2;79;208;138', s),
  fail:    (s: string) => c('38;2;244;119;107', s),
  warn:    (s: string) => c('38;2;232;180;74', s),
  human:   (s: string) => c('38;2;111;168;245', s),  // + refusal
  plan:    (s: string) => c('38;2;99;182;194', s),   // dry-run
  stale:   (s: string) => c('38;2;179;154;82', s),
  dim:     (s: string) => c('38;2;143;138;123', s),
};
// glyph carries status — keep it even under NO_COLOR
export const glyph = {
  passed:'✓', failed:'✗', partial:'⚠', skipped:'=', operator:'→', blocked:'!', sep:'·',
};
```

---

## Components (web)

Nine React components in `design-system/components/`, grouped by role. Each has
a `.d.ts` (props contract — **preserve this**) and `.prompt.md` (usage rules).

- **core/** `Icon` — the single-color gate mark + icon set.
- **forms/** `Button` — proof-green primary; green means "go", used sparingly.
- **feedback/** `VerdictBadge` (closed ledger vocabulary: passed/failed/partial/
  skipped/operator/blocked, glyph-first), `Admonition`.
- **cli/** `CodeBlock`, `GateLine`, `HandoffCard` — web renderings of the CLI
  grammar above. `HandoffCard` has `handoff` (green rule, “→ READY TO PUSH”) and
  `stopped` (red rule) variants; copy-exact 56-char box-drawing.
- **data/** `EvidenceTable` — the check · command · verdict · exit · evidence ledger.
- **diagram/** `PhasePipeline` — the 7 phases (PRD · Readiness · Tasks · Implement
  · Test · Audit · Learn); human 1–3, autonomous 4–7, push always human.

Recreate these in each web app's component conventions, but the props in the
`.d.ts` files are the contract — don't rename or drop them. `GateLine`,
`HandoffCard`, and `CodeBlock` must match the CLI's glyph + color grammar so web
and terminal read as one system.

---

## Voice & content rules (apply everywhere — web copy, CLI strings, docs)

- Sober, precise, dry wit. **No hype, no exclamation, no emoji.**
- Wordmark `ProveGate` (CamelCase); package/CLI lowercase `provegate`, `gate`.
- Tagline (fixed): "ProveGate (prove + gate): prove it, then let it propagate."
- Verdicts are the closed lowercase ledger set: `passed` / `failed` / `partial`
  / `skipped` / `operator` / `blocked`.
- Command surface: `gate init · new · open · status · queue · check · run · land ·
  push` (`gate` and `provegate` are the same binary).

---

## Files in this bundle

- `design-system/styles.css` — token entry point (imports all of `tokens/`).
- `design-system/tokens/` — colors, typography, spacing, effects, fonts.
- `design-system/components/` — 9 components as `.jsx.txt` (reference impl) +
  `.d.ts.txt` (props contract) + `.prompt.md` (usage). The `.txt` suffix is
  only to keep these out of the source system's compiler — drop it (`.jsx`,
  `.d.ts`) when you port them into `packages/design/`.
- `design-system/assets/` — `logo.svg`, `favicon.svg`.
- `design-system/SKILL.md`, `design-system/readme.md` — brand rules, read first.
- `reference/cli-surface.html` — rendered spec of the CLI output grammar.
- `reference/cli-static-specimens.dc.html` — the full copy-exact CLI specimen
  sheet (install, command surface, `gate run`, handoff + stopped cards, status
  table, `--dry-run` plan, refusals, `--help`, colour/NO_COLOR matrix). These
  strings are what `packages/cli` should print.
- `design-system/_ds_bundle.js` — compiled components, for the reference kits.
- `design-system/ui_kits/` — landing, docs, brand (OG card + README header +
  shields) HTML/React reference recreations.
- `design-system/guidelines/` — foundation specimen cards.
- `design-system/templates/` — live Design Component source of the CLI specimens.

## Web surfaces (included — for the web wave)

The web surfaces are now in the bundle too, mirrored under `design-system/`
so their relative `../styles.css` / `../../_ds_bundle.js` links resolve as-is
(a copy of the compiled `_ds_bundle.js` is included for the React kits):

- `design-system/ui_kits/landing/` — the marketing landing page (full IA,
  dark-first): `index.html` + `Landing.jsx.txt` (Babel loads the `.txt` via its
  `src`, so the mock still renders; the `.txt` keeps it out of the compiler).
- `design-system/ui_kits/docs/` — the Fumadocs-style docs site.
- `design-system/ui_kits/brand/` — brand surfaces: **the OG/social card, the
  GitHub README header, and the npm/shield badges.**
- `design-system/guidelines/*.card.html` — the foundation specimen cards
  (colour, type, spacing, brand incl. the CLI surface).
- `design-system/templates/cli/` + `cli-demo/` — the live Design Component
  source of the CLI specimens (need `support.js` + `ds-base.js`, both included).

These are **reference recreations authored in HTML/React** — rebuild them in the
apps' real stack (Next.js/Fumadocs), not copied verbatim. Compiler markers in
these copies (`@dsCard`, `@startingPoint`, `@template`) were neutralized so the
files are inert references, not live design-system entries.

The CLI wave still only needs `design-system/tokens/`, the brand rules, and
`reference/`. The web surfaces above are for the later `apps/web` + `apps/docs`
wave.

## Implementation checklist

1. Read `SKILL.md` + `readme.md` — internalize color law, voice, verdict casing.
2. Create `packages/design/`; move `styles.css` + `tokens/` in; export the CSS.
3. Add `cli/theme.ts` (ANSI + glyphs) to the same package.
4. `apps/docs` + `apps/landing`: import the CSS once at root; build components
   against the `.d.ts` contracts; wire `data-theme` for dark mode.
5. `packages/cli`: import `theme.ts`; reproduce the status-line grammar, and the
   two box-drawing moments (handoff, refusal). Honor `NO_COLOR` / non-TTY.
6. Verify all three surfaces side by side: same green, same verdicts, same mark.
