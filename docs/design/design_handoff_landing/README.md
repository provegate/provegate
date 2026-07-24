# Handoff: ProveGate Landing Page

## Overview
Marketing landing page for **ProveGate** — the open-source CLI + method that gates
autonomous coding agents on machine-checkable evidence. Single-page, dark-first,
developer-focused, built entirely on the ProveGate design system.

Section order (this is the intended narrative — follow it):
Nav → Hero (live-typing terminal) → Trust strip → **Problem** (proof stats) →
**Core rule** (band) → How it works (animated `gate run`) → Playground
(`gate.toml` → live run) → Phase pipeline → Seven-phase detail → Operator-gate flow →
Refusal → Evidence ledger → **Proof + honest limits** → Anatomy of a gate →
Self-attestation vs. evidence → **Positioning** (band) → Feature grid → Install (tabs) →
Command reference → CI integration → FAQ + quickstart → Install/CTA → Footer.

## About the Design Files
These files are **design references authored in HTML/React (Babel)** — a prototype
showing intended look and behavior, **not** production code to ship as-is. Recreate the
page inside the ProveGate monorepo using its existing environment (Next.js / Fumadocs)
and its real design-system components. Composition and page-local helpers are the new
work; the primitives already exist in the repo.

## ⭐ Where the components live: `packages/design`
The design system has been built in this monorepo as the **`packages/design`** package.
**Import every ProveGate primitive from there** — `Icon`, `Button`, `CodeBlock`,
`GateLine`, `HandoffCard`, `VerdictBadge`, `EvidenceTable`, `Admonition`, `PhasePipeline`
— along with the `--pg-*` design tokens it ships. That package is the single source of
truth and is already current; do NOT recreate these components, and do NOT copy anything
from this prototype's `_ds/` bundle or `ds-overrides.jsx` (see the warning below). If an
import name or path differs from what you expect, check `packages/design`'s entry/exports
first rather than reimplementing. The prototype's `window.DesignSystem_65dbcc.<Name>` and
the `X`-prefixed aliases both map 1:1 to named imports from `packages/design`.

## ⚠️ Read this first: the `ds-overrides.jsx` shim is a LOCAL WORKAROUND — do not port it
The prototype loads a **bound snapshot** of the design-system bundle that was a stale
build: its compiled components still exported the OLD verdict vocabulary
(`pass/fail/pending/human`) and the OLD `HandoffCard` API (`rows/verdict/refusal`),
even though the DS **source** had already been updated to the new closed vocabulary and
the new `HandoffCard` API. `ds-overrides.jsx` re-implements the four changed components
(GateLine, VerdictBadge, HandoffCard, EvidenceTable) from the updated source and
reassigns them onto the DS namespace so the prototype renders correctly.

**In the monorepo this shim is unnecessary and must NOT be copied.** The repo's design
system is the source of truth and is already current — import the real components. Treat
`ds-overrides.jsx` only as a precise spec of the CURRENT component APIs (below).

## Fidelity
**High-fidelity.** Final colors, typography, spacing, copy, interactions. Recreate
faithfully with the repo's real components + `--pg-*` tokens.

## Design-system components used (import from `packages/design`)
- `Icon` (core) — names used: `check gate cross pending human machine lock exit0 merge terminal copy arrowRight chevronRight github`. `human` vs `machine` = distinct gate authorities.
- `Button` (forms) — `primary | secondary | ghost`, sizes `sm|md|lg`. **Never green.**
- `CodeBlock` (cli) — always-dark terminal block; `filename`, `lang`, `prompt`, `copyable`. Children = string.
- `GateLine` (cli) — **current** `status`: `passed | failed | partial | skipped | operator | blocked` (default `passed`); props `name`, `command`, `code`, `bare`. Glyph carries status (✓ ✗ ⚠ = → !).
- `VerdictBadge` (feedback) — **current** `verdict`: same closed set (default `passed`); props `label`, `code`, `solid`, `size`.
- `HandoffCard` (cli) — **current API**: `variant`("handoff"|"stopped"), `title`, `width`(default 56), `lines[]`. Each line is `{blank:true}` | a string | `{gate:"passed"|…, text}` | `{arrow:true, text}`. (The old `rows/verdict/refusal` API is gone.)
- `EvidenceTable` (data) — `rows[]` of `{check, command, verdict, code, evidence}`; verdict cell uses VerdictBadge; exit cell turns red when `verdict === "failed"`.
- `Admonition` (feedback) — `type`: `note|tip|warning|pass|fail|human`, `title`.
- `PhasePipeline` (diagram) — `phases[]`, `active`, `showPush`. **Pass an explicit `phases` prop** (see canonical names below) — do not rely on the component default.

## Canonical content (must match — this was reconciled against the DS source)
- **Seven phases:** 1 **PRD** · 2 **Readiness** · 3 **Tasks** (human 1–3) · 4 **Implement** · 5 **Test** · 6 **Audit** · 7 **Learn** (machine 4–7); **Push** always human. "Humans own intent and release; the machine owns the verified middle."
- **CLI surface (only these four):** `gate init` (scaffold `gate.toml`) · `gate run` (run gates, write ledger) · `gate push` (refuses — the runner never pushes) · `gate ledger` (list runs/evidence).
- **Config:** file is `gate.toml`; a machine gate is `cmd = "…"` + `require = "exit0"`; an operator gate is `kind = "operator"` + `reviewer = "@who"`.
- **Verdict vocabulary is closed & lowercase monospace:** `passed / failed / partial / skipped / operator / blocked`. Never `pass`/`fail`/`PROVEN`/`VIOLATED`.
- **Audit vs operator are distinct:** Audit (phase 6) is a *machine* gate — an independent reviewer, by default a **different model family**; a pass requires `Critical: 0`; an absent reviewer never counts. Operator gates are *human* verdicts for things a command can't settle. Do not conflate them.
- **The refusal invariant (verbatim):** "The runner contains no code path that pushes to a remote." / "No. Push is yours."
- **Approved proof stats (verbatim, no fabrication):** 22.58% inaccurate self-reporting (20,574-session field study); 80+ agents endorsed a non-existent OpenSSL padding-oracle bug, one executed test killed it; METR RCT — devs forecast 24% / felt 20% speedup, were 19% slower. Honest limits are stated on purpose ("showing the limits next to the proof is the point").
- **Principles line:** "MIT · zero deps · local-only · no telemetry · Node ≥ 22".
- **Positioning:** SDD gates what you *intend*; ProveGate gates what you *shipped* — complementary, downstream of the spec.

## Interactions & Behavior
- **Reveal on scroll:** IntersectionObserver adds `.pg-in`; opacity + 12px translateY, 0.5s `cubic-bezier(0.2,0,0.1,1)`, wrapped in `@media (prefers-reduced-motion:no-preference)`.
- **Reduced motion:** `HeroTerminal` and `GateRun` check `prefers-reduced-motion: reduce` and render the finished state immediately (no typing/stagger); caret blink disabled.
- **Hero terminal / GateRun:** start when scrolled into view; GateRun has a replay button.
- **Playground:** re-parses `gate.toml` on every keystroke → live `GateLine`s + summary; operator gate → amber "handoff blocked", else green "exit 0".
- **Theme:** `data-theme="dark"` on `<html>` (dark default); light is first-class.
- **Tabs / FAQ / phase chips:** React state; a11y wired — `role=tablist/tab`+`aria-selected`, `aria-expanded`, `aria-pressed`; global `:focus-visible` ring uses `--pg-focus-ring`.
- **Mobile nav (≤900px):** desktop links + CTAs hidden; a hamburger toggles a drawer (`aria-expanded`/`aria-controls`) with links + CTAs.

## Responsive
`--pg-container` 1200px, 28px gutters. ≤900px: hero/how/install/playground/comparison/faq/proof grids → 1 col; primary nav → drawer; footer → 2 cols. ≤560px: footer + phase-detail → 1 col.

## Design tokens (use the repo's real `--pg-*` tokens; do not hardcode)
**Color law (enforced):** green = earned (passed / exit 0) only, never decoration/buttons/accents (active tab underline is neutral `--pg-text`, NOT green); red = real failure only; human-blue = operator decisions. Terminal surface is always dark.
- Ramp `--pg-warm-50…950`; proof green `--pg-green-400/600`; fail `--pg-red-*`; amber `--pg-amber-*`; human `--pg-human-*`; plus `--pg-cyan/plan`, `--pg-stale`, `--pg-warn`, `--pg-refusal`.
- Semantic: `--pg-bg / -subtle / surface / border / border-strong / text / -muted / -subtle`, status `--pg-pass/-bg/-text`, `--pg-fail…`, `--pg-warn…`, `--pg-human…`, `--pg-stale…`, `--pg-muted`, links `--pg-link/-hover`, `--pg-focus-ring`, and terminal set `--pg-term-bg/-fg/-dim/-border/-green/-red/-amber/-human/-plan/-stale`.
- Type: IBM Plex Sans (`--pg-font-sans`) for UI/prose; IBM Plex Mono (`--pg-font-mono`) for **all evidence** (commands, codes, paths, verdicts, eyebrows). Radii `sm 3 / md 6 / lg 10 / pill`. 4px spacing grid. Flat backgrounds, hairline borders, subtle shadows.

## Content rules
Wordmark `ProveGate`; CLI/package lowercase `provegate`/`gate`. No emoji (status via ✓ ✗ ⚠ ◷ glyphs + color). Sober, terse, dry; periods not exclamations. No fabricated metrics beyond the approved stats above.

## Files in this bundle
- `ProveGate Landing.html` — host: token `<link>`s, DS bundle `<script>`, **`ds-overrides.jsx`** (local shim — see warning), React/Babel pins, `<style>` (reveal, caret, focus ring, responsive + mobile-nav rules), mount.
- `landing-sections.jsx` — Nav (+mobile drawer), Hero + `HeroTerminal` + `useTyping`, TrustStrip, How + `GateRun`, Phases (+`METHOD_PHASES`), Refusal, Ledger, Features, Install, Footer; `Mark`/`Wordmark`/`SectionHead`/`Reveal`/`REDUCED` helpers.
- `landing-extras.jsx` — Tabs, InstallTabs, CommandRef, Playground (+`gate.toml` parser), CIIntegration, Comparison, OperatorFlow, FaqAndQuickstart, PhaseDetail (+`PHASE_DATA`), Anatomy, Problem, CoreRule, Proof, Positioning.
- `landing-app.jsx` — `ProveGateLanding` composing every section in order.
- `ds-overrides.jsx` — **local workaround only; do not port.** Doubles as a spec of the current GateLine/VerdictBadge/HandoffCard/EvidenceTable APIs.

## Notes for the implementing agent
- Import every DS primitive from **`packages/design`** (named imports); delete the shim concept. The prototype's `window.DesignSystem_65dbcc.<Name>` and the `X`-prefixed aliases in `landing-extras.jsx` are Babel-scope workarounds → each maps 1:1 to a named import from `packages/design`.
- Keep the color law intact (green is earned; neutral tab underline). Keep the closed verdict vocabulary and the phase names exactly.
- Replace all `href="#"` placeholders (GitHub, docs, spec, nav anchors) with real routes.
- Add `<meta name="description">` and OG/social tags (the DS brand kit has an OG-card style to derive from) — the prototype omits them.
