# ProveGate — Design System

> **ProveGate** (prove + gate): prove it, then let it propagate.

An open-source developer tool — CLI + method — that gates autonomous AI coding
agents on **machine-checkable evidence**. The thesis: an agent's "done" is not
evidence. Work passes only when a command exits 0, or an independent reviewer's
structured verdict says pass.

This design system encodes that thesis as a visual language: sober, precise,
engineered. Aerospace checklist meets terminal culture. Not magic, not sparkles.

---

## Sources

This system was authored **from a written brief** — there was no attached
codebase, Figma file, or existing brand kit. Everything here (mark, palette,
type, components) is original to this brief. If you have real product sources
(the `provegate` repo, a Figma library, marketing copy), attach them via the
Import menu and this system should be reconciled against them.

**Font substitution:** no brand font files were provided. **IBM Plex Sans**
(prose/UI) and **IBM Plex Mono** (evidence) are used — one engineered
superfamily drawn as a pair, from Google Fonts. They load via `@import` in `tokens/fonts.css`. If ProveGate has
licensed typefaces, drop the files in `assets/fonts/` and swap the `@font-face`
`src`. **→ Please confirm or provide the intended typefaces.**

---

## Product context

ProveGate ships as two things that must feel like one:

1. **The CLI (`gate`)** — runs gates, prints pass/fail evidence, produces the
   handoff card, and refuses to push on your behalf ("No. Push is yours.").
   CLI output is a **first-class brand surface**, not an afterthought. Command
   surface: `init · new · open · status · queue · check · run · land · push`
   (`gate` and `provegate` are the same binary). Zero runtime deps, hand-rolled
   ANSI, respects `NO_COLOR` + non-TTY, `--json` for machine consumption.
2. **The method / docs** — a Fumadocs/Next.js docs site and a landing page that
   explain the 7-phase model (phases 1–3 human, 4–7 autonomous, push always
   yours) and the evidence ledger.

**Audience:** professional software engineers (CLI-native, Hacker News crowd)
and engineering leads evaluating AI-workflow governance. They are allergic to AI
hype. They trust things that look engineered, measured, and honest.

---

## CONTENT FUNDAMENTALS

How ProveGate writes.

- **Tone:** sober, precise, quietly confident, with dry wit. Never breathless,
  never salesy. The product refuses to oversell exactly as the CLI refuses to
  push.
- **Person:** address the reader as **you** ("Push is always yours"). The tool
  refers to itself as **the gate** / **ProveGate**, rarely "we". Avoid first
  person plural marketing ("we believe…").
- **Verdicts are the closed ledger vocabulary, lowercase and evidence-styled:**
  `passed` `failed` `partial` `skipped` `operator` `blocked`. Always monospace.
  `operator` (needs a human/staging) and `blocked` (dependency broken) are the
  two honest escape hatches — never a silent pass. **Never** the badge words
  **PROVEN** / **VIOLATED** — that is a defunct competitor's vocabulary, banned.
- **Casing:** the wordmark is always **ProveGate** (CamelCase). The package and
  CLI are lowercase: `provegate`, `gate`. Never "Provegate", "PROVEGATE",
  "Prove Gate".
- **Claims:** no fabricated metrics, no speedup percentages, no "10x". State
  what is true and checkable. Approved sample lines (use verbatim):
  - "listed but not run is never passed"
  - "one test killed what 80+ agents' reasoning could not"
  - "phases 1-3 human, 4-7 autonomous, push is always yours"
  - "an agent's *done* is not evidence"
- **Emoji:** none. Not in docs, not in the CLI, not in marketing. Status is
  conveyed by the fixed monospace glyph grammar (`✓ ✗ ⚠ → = !`) and color,
  never by emoji. The glyph carries status so nothing is lost under NO_COLOR.
- **Punctuation & vibe:** short declaratives. Periods, not exclamation points.
  A dash of deadpan is on-brand ("No. Push is yours."). Think man-page terseness
  with the occasional exact, quotable sentence.

---

## VISUAL FOUNDATIONS

- **Palette:** a near-black warm terminal ground (`--pg-warm-950` `#14130d`) and
  a warm-leaning neutral gray ramp for prose. One earned accent: **proof green**
  (`--pg-green-600` on light, `--pg-green-400` on dark) with exit-0 semantics.
  Status set: **pass** green, **fail** red, **warn/partial** amber, and a
  distinct **human-authority / refusal** blue for operator-gate moments. Two
  further derived slots: **plan / dry-run** (muted cyan) and **stale** (dim
  amber, for a lease past its TTL). Every terminal slot declares its 16-color
  ANSI floor + truecolor in `tokens/colors.css` — the glyph is the source of
  truth, colour is redundant. Max two background colors per surface.
- **COLOR LAW (enforced, not suggested):** **green is earned** — it marks work
  that passed a machine check or operator verdict, never a button, accent, or
  decoration. **Red is real failure** — a non-zero exit or a fail verdict only,
  never generic "danger" or emphasis. Human-authority blue is reserved for the
  moments a person decides.
- **Type:** one sans (**IBM Plex Sans**) for every heading, label, and
  paragraph; its sibling monospace (**IBM Plex Mono**) for **all evidence** — commands,
  exit codes, paths, ledger excerpts, logs, verdicts. The rule is absolute:
  *evidence is always monospace.* Scale in `tokens/typography.css`.
- **Backgrounds:** flat. No gradients, no imagery, no textures, no glow. The
  terminal surface is its own always-dark panel regardless of theme. Both light
  and dark themes are first-class and AA-contrast throughout.
- **Borders:** hairline 1px `--pg-border`; 1.5–2px for emphasis/diagram nodes.
  Dotted leaders (`·····`) connect a check to its verdict, echoing CLI output.
- **Radii:** restrained — `sm 3px`, `md 6px`, `lg 10px`, `pill` only for human
  gate nodes and verdict counts. Corners read engineered, not soft/friendly.
- **Shadows:** subtle, cool-neutral, low-spread (`--pg-shadow-sm/md/lg`). Used
  to lift a surface, never to decorate. No colored shadows, no neon.
- **Motion:** measured and short (100–240ms) on a firm ease
  (`cubic-bezier(0.2,0,0.1,1)`). Fades and small position shifts only — no
  bounce, no spring, no confetti. Honors `prefers-reduced-motion`.
- **Hover / press:** hover shifts background one step (secondary/ghost) or
  darkens the accent (`--pg-accent-hover`); press is a subtle darken, no scale
  bounce. Focus is a 3px human-blue ring (`--pg-ring`).
- **Transparency / blur:** used sparingly — tinted status backgrounds
  (`color-mix` at ~14%), no glassmorphism, no backdrop blur.
- **Cards:** flat surface, 1px border, `md` radius, optional `sm` shadow. No
  rounded card with a lone colored left-border accent (that trope is avoided);
  the only left-rule pattern is the docs Admonition, which is a genuine callout.
- **Diagram language:** gates are nodes on a pipeline. **Human gates** = pill +
  person glyph in operator-blue. **Machine gates** = square + chip glyph in
  neutral. The human→machine boundary is a dashed "hand off" connector; solid
  connectors elsewhere. Locks, merge, and terminal glyphs come from one icon set.
- **Layout:** content max-widths `--pg-container` (1200), `--pg-container-prose`
  (720), `--pg-container-docs` (1400). 4px spacing grid. Dense but aligned —
  checklist rhythm, generous vertical breathing between sections.

---

## ICONOGRAPHY

- ProveGate uses **one original inline SVG icon set**, shipped as the `Icon`
  component (`components/core/Icon.jsx`). 24px grid, 2px stroke, round caps,
  `currentColor`. Geometric and single-weight — engineered, not illustrative.
- **No icon font, no emoji, no third-party pack.** If you need a glyph that
  isn't in the set, add it to `Icon.jsx` in the same 24/2/round style rather
  than importing Lucide/Heroicons. (An `Icon` wrapper is the one intentional
  primitive addition — see "Intentional additions".)
- **Two authorities are deliberately distinct glyphs:** `human` (person) for
  operator gates, `machine` (chip) for autonomous checks. Keep them visually
  separate in every diagram.
- In terminal/CLI contexts, status is drawn with the fixed monospace glyph
  grammar (`✓` passed, `✗` failed, `⚠` partial/warn, `→` operator/handoff,
  `=` skipped, `!` blocked/overlap) in the terminal palette — this is
  intentional and matches real `gate` output. Everywhere else use `Icon`.
- Names: `gate check cross pending human machine lock exit0 merge terminal copy
  arrowRight chevronRight github`.

---

## Components

React primitives, bundled to `window.DesignSystem_65dbcc`. Reference the CSS
custom properties for all styling. Source under `components/<group>/`.

- **Icon** (`core/`) — geometric single-stroke glyph set; `human` vs `machine`
  distinguish gate authorities.
- **Button** (`forms/`) — neutral primary, outline secondary, quiet ghost;
  sizes `sm|md|lg`. Never green.
- **VerdictBadge** (`feedback/`) — `passed|failed|partial|skipped|operator|blocked`
  chip, monospace, lowercase, glyph-first, optional exit code. Encodes the
  color law + the closed ledger vocabulary.
- **Admonition** (`feedback/`) — docs callout: `note tip warning pass fail
  human`.
- **CodeBlock** (`cli/`) — always-dark terminal code/command block, filename
  tab + copy, optional `$` prompt.
- **GateLine** (`cli/`) — one line of `gate run` output: glyph, name, dotted
  leader, verdict, exit code. Ledger vocabulary; glyph carries status.
- **HandoffCard** (`cli/`) — the copy-exact card family: `handoff` (green rule,
  “→ READY TO PUSH — the runner never pushes”) and `stopped` (red rule).
  Box-drawing, 56-char rule, `│` gutter — these become the CLI string builders.
- **EvidenceTable** (`data/`) — the evidence ledger table (check · command ·
  verdict · exit · evidence).
- **PhasePipeline** (`diagram/`) — the 7-phase diagram (PRD · Readiness · Tasks
  · Implement · Test · Audit · Learn); human 1–3, autonomous 4–7, push always
  human.

### Intentional additions

- **Icon** — no source icon set existed, so a small original set is provided as
  a primitive. Extend it in place; do not import an external pack.

---

## UI kits

Full-screen, high-fidelity recreations that compose the primitives above.

- **`ui_kits/docs/`** — the ProveGate docs site (Fumadocs/Next.js style): top
  bar, sidebar nav, prose with code blocks, admonitions, evidence table, phase
  pipeline, and a table-of-contents rail.
- **`ui_kits/landing/`** — the marketing landing page: hero, install block, the
  handoff/refusal moment, the phase pipeline, and the evidence ledger.
- **`ui_kits/brand/`** — brand surfaces: the OG/social card, the GitHub README
  header, and the npm/shield badge style.

---

## Templates

Starting-point artifacts consuming projects can copy. Each lives in
`templates/<slug>/` and loads the system via a sibling `ds-base.js`.

- **`templates/cli/`** — the canonical **CLI surface**: copy-exact static
  specimens (install, command surface, `gate run`, the handoff + stopped cards,
  `gate status` table, `--dry-run` plan, refusals, `--help`, and a
  colour/NO_COLOR matrix). These become the CLI's string builders.
- **`templates/cli-demo/`** — an animated motion study of a `gate` session
  (typewriter). Exploration only; the canonical output is the static template.

## Foundations (Design System tab)

Specimen cards live in `guidelines/*.card.html`, grouped **Colors**, **Type**,
**Spacing**, **Brand**. They render the real tokens from `styles.css`.

---

## Index / manifest (root)

- `styles.css` — global entry point (consumers link this). `@import`s only.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`,
  `effects.css`. All `--pg-*` custom properties.
- `components/` — `core/`, `forms/`, `feedback/`, `cli/`, `data/`, `diagram/`.
- `templates/` — `cli/` (canonical static), `cli-demo/` (animated exploration).
- `ui_kits/` — `docs/`, `landing/`, `brand/`.
- `guidelines/` — foundation specimen cards.
- `assets/` — `logo.svg` (single-color mark, `currentColor`), `favicon.svg`
  (green-on-dark 16px+).
- `thumbnail.html` — homepage tile.
- `SKILL.md` — Agent Skills manifest for downloading this system into Claude Code.

Namespace for `@dsCard` HTML: **`window.DesignSystem_65dbcc`**.
