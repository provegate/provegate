# @provegate/design

The ProveGate design system — **one token source for the terminal and the web**.
Private workspace package: the docs site, the landing page, and the `gate` CLI
all render in the same visual language from the same origin. Nobody hardcodes a
hex, a glyph, or a verdict string anywhere else.

## The origin rule

`src/tokens.ts` is the **single source of truth for every colour.** Every hex in
the system lives there (in `ramps` or `tints`); nothing else in the repo authors
a colour. From it, `scripts/generate-tokens.ts` emits BOTH outputs:

- `src/tokens/colors.css` — the web CSS custom properties (`--pg-*`), light on
  `:root`, dark on `[data-theme="dark"]`, plus the always-dark terminal slots.
- `src/cli/theme.ts` — the terminal ANSI theme: truecolor triplets, a 16-colour
  floor, the colorizer, and the verdict→glyph→slot tables.

Both are **generated and committed**. A byte-identity test regenerates them and
diffs the committed files, so a hand-edit of either output fails the gate. To
change a colour: edit `src/tokens.ts`, run
`pnpm --filter @provegate/design generate-tokens`, commit the diff. Change
proof-green once → web and terminal move together.

## The colour law (encoded, not suggested)

- **GREEN IS EARNED.** `--pg-pass` / `--pg-accent` mark work that passed a machine
  check or an operator verdict — never decoration, never a hover accent. Only the
  `passed` verdict maps to the green slot; a `skipped` step is dim, never green.
- **RED IS REAL FAILURE.** `--pg-fail` is a non-zero exit or a `failed` verdict
  only — never generic "danger" styling.
- The verdict vocabulary is a **closed, typed set**: `passed` `failed` `partial`
  `skipped` `operator` `blocked`. Never `PROVEN` / `VIOLATED`, never an emoji. The
  glyph (`✓ ✗ ⚠ = → !`) carries status, so `NO_COLOR` loses nothing.

## Two entry points, one source

The package exposes sub-paths so a web bundle never pulls the CLI and the CLI
never pulls CSS or React:

| Import | What |
| --- | --- |
| `@provegate/design/styles.css` | web token entry (`@import`s all of `tokens/`) |
| `@provegate/design/tokens` | raw token values + the colour law (TS) |
| `@provegate/design/cli` | ANSI theme + card / status-line string builders |
| `@provegate/design/react` | reserved for the web components (PRD-012) |

**Why the CLI entry is separate.** The provegate CLI publishes with **zero runtime
dependencies**. `./cli` therefore contains only ANSI strings, glyphs, and pure
string builders — no CSS, no React, no third-party import. An import-graph test
walks the entry transitively and fails on the first CSS/React/third-party edge,
and the package declares no `dependencies`. The card + status-line builders live
here (not in the CLI) as the single implementation both the terminal and the web
`HandoffCard` render, so the two can never drift.

## Fonts — self-hosted, no CDN

IBM Plex Sans (prose/UI) + IBM Plex Mono (evidence), latin subset, weights
400/500/600/700, served from `assets/fonts/` via local `@font-face`
(`src/tokens/fonts.css`). **No font CDN, no network request** — consistent with
the no-telemetry principle; a build-output egress scan finds no external origin.

Provenance: vendored **unmodified** from `@fontsource/ibm-plex-sans@5.3.0` and
`@fontsource/ibm-plex-mono@5.3.0` (OFL-1.1). The license ships at
`assets/fonts/OFL.txt`. This is the design brief's decision (§12.5) and overrides
the handoff's Google-Fonts `@import`, which the assets test forbids from
reappearing.

## Dark is canonical

Dark is the authored, canonical rendering (design brief §12.1); light is a real,
fully-specified theme derived from the same tokens. Web consumers set
`<html data-theme="dark">`; a small inline script can mirror
`prefers-color-scheme` onto that attribute.

## The React layer (`./react`)

`@provegate/design/react` ships the nine shared components the web apps render —
`Icon`, `Button`, `VerdictBadge`, `Admonition`, `CodeBlock`, `GateLine`,
`HandoffCard`, `EvidenceTable`, `PhasePipeline` — one implementation both the
landing and the docs consume. Every component styles through `--pg-*` tokens: no
component authors a raw hex or a font stack (a test enforces it).

- **Colour law holds in React too.** `Button` has no green variant (primary is
  neutral `--pg-text`); a `VerdictBadge`/`GateLine`/`EvidenceTable` cell is green
  only for `passed`; `skipped` is muted. The verdict vocabulary is the closed
  lowercase six, each with its fixed glyph (`✓ ✗ ⚠ = → !`) matching the terminal.
- **`HandoffCard` takes structured `lines`, not the CLI builder.** Its API is
  `{ variant, title, width, lines[] }` where a line is
  `string | {blank} | {gate,text} | {arrow,text}`. This lets a page compose
  arbitrary card content; parity with the terminal is at the grammar level (same
  glyphs, box chars, verdict colours) — not textContent equality. It does NOT
  call `@provegate/design/cli`'s string builder.
- **React is a PEER dependency.** Consumers (the apps) bring React;
  `@provegate/design` does not bundle it. The `./cli` and `./tokens` entries
  import no React, so the zero-dependency provegate CLI can still bundle `./cli` —
  the import-graph test plus a built-output check (`dist/cli` has no React)
  enforce it.

## Generated files — do not edit

`src/tokens/colors.css` and `src/cli/theme.ts` carry a generated-file banner and
are excluded from lint. Edit `src/tokens.ts` and regenerate. The emit logic is in
`scripts/emit.ts` (side-effect free, so the byte-identity test imports it).
