# Development Summary: Landing Adoption Polish

> **PRD**: [prd-027-landing-adoption-polish.md](../../_prds/completed/prd-027-landing-adoption-polish.md)
> **Tasks**: [tasks-027-landing-adoption-polish.md](../../_tasks/completed/tasks-027-landing-adoption-polish.md)
> **Ship Readiness**: Operator Verification
> **Completed**: 2026-07-28
> **Author**: Claude Fable 5 (implementation), Codex ×3 rounds (independent review), owner (live operator rows)

---

## Overview

The landing page stops asserting things it does not wire (PRD-027, nine FRs). A real OG
card ships through the file convention with the no-images resolver rule; `/alt` becomes
a pinned, noindexed concept page; the product name, install command and trust-strip
claims are single-sourced and linked; the nav gains a retained-ratio scrollspy; the
mobile hero drops its duplicate block (1562→1240px measured); and every copy affordance
is real — the design package splits into a server-safe barrel and a `react/client`
entry whose built output opens with `"use client"`.

---

## Key Outcomes

- §2 metrics all at target: 15/7/0 anchors (three new claim links, zero orphans),
  41 exports / zero dead, split metadata between `/` and `/alt`, four clicked
  copy controls with exact payloads.
- The FR-9 delivery seam ate both review criticals (a public header slot, then a
  spread leak) — the pattern the PRD's own history predicted, closed with an internal
  base + hard-drop + type-level and runtime deny tests.
- Live-browser operator rows: hero −322px at 375×667, scrollspy 5/5 with correct
  fast-scroll retention, focus rings and system clipboard confirmed by the owner's own
  Tab and Cmd+V. (Ops note: a hidden tab suspends rAF and IntersectionObserver — the
  first "failure" reading was the tab being backgrounded, not the code.)
- `_docs/launch/announcement-draft.md` gained the launch checklist: OG debugger against
  the deployed origin after first deploy, before first share.

## Files

Web: `opengraph-image.tsx` (new), `layout.tsx`, `alt/page.tsx`, `sections/content.ts`,
`ui.tsx`, `index.tsx`, `tabs.tsx`, `hero-terminal.tsx`, `nav.tsx`, `globals.css`;
tests `metadata.test.ts` (new, 8) + `landing` (37) + `content-web` (13) + `a11y` (9).
Design: `CodeBlock.tsx` (split), `client.tsx` (new), `tsup.config.ts` (array +
banner), `package.json` (`./react/client`), `props.test.tsx` (54). Docs untouched and
provably unaffected. Review: 3 Codex rounds → PASS, Critical 0, quorum 1/1.
