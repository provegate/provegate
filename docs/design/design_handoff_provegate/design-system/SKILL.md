---
name: provegate-design
description: Use this skill to generate well-branded interfaces and assets for ProveGate, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## ProveGate at a glance
- **Tagline (fixed):** "ProveGate (prove + gate): prove it, then let it propagate."
- **Wordmark:** always `ProveGate` (CamelCase). Package/CLI lowercase: `provegate`, `gate`.
- **Voice:** sober, precise, dry wit. No hype, no emoji. Verdicts are the closed lowercase ledger set — `passed` `failed` `partial` `skipped` `operator` `blocked` — never `PROVEN` / `VIOLATED`.
- **Color law:** green is EARNED (passed work only). Red is REAL failure only. Human-authority blue marks operator gates + the refusal; warn=amber, plan/dry-run=muted cyan, stale=dim amber. Never decorative; the glyph (`✓ ✗ ⚠ → = !`) carries status so NO_COLOR loses nothing.
- **Type:** IBM Plex Sans (prose/UI) + IBM Plex Mono (all evidence — commands, codes, logs, verdicts). One engineered superfamily.
- **Tokens:** CSS custom properties `--pg-*` in `styles.css` (light + dark, AA).
- **Components** (React, `window.DesignSystem_65dbcc`): Icon, Button, VerdictBadge, Admonition, CodeBlock, GateLine, HandoffCard, EvidenceTable, PhasePipeline.
- **CLI surface:** `gate init · new · open · status · queue · check · run · land · push` (`gate`/`provegate` = same binary). 7 phases: PRD · Readiness · Tasks (human) · Implement · Test · Audit · Learn (autonomous); push always human. Copy-exact specimens: `templates/cli/` (canonical, static) — they become the CLI string builders.
- **Assets:** `assets/logo.svg` (single-color mark), `assets/favicon.svg`.
