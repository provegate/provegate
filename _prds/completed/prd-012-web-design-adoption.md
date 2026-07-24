# PRD-012: React Component Layer — the Design System's `./react` Export

> **Status**: Ship Verified
>
> **Created**: 2026-07-23
> **Updated**: 2026-07-24
> **Author**: owner
> **Audience**: Implementing Agent (Claude Code / Cursor / Codex)
> **Slug**: `web-design-adoption`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Class Rationale**: (default class) — new user-facing surface: the nine
> shared React components every web app renders through.
> **Autonomous Close**: operator-gated
> **State Record**: `_state/prds.json`

---

## 1. Introduction / Overview

The web wave was one mega-PRD; it is split into three at claim time (owner
decision 2026-07-24): **this PRD builds the nine React components** into
`@provegate/design`'s reserved `./react` export; **PRD-013** rebuilds `apps/web`
(the landing page) on them; **PRD-014** themes `apps/docs` + the OG card. The
components are the root both consumers share, so they land first.

PRD-010 reserved `packages/design/src/react/` with an empty stub. This PRD fills
it with the nine components the second handoff drop specified —
`docs/design/design_handoff_provegate/design-system/components/**` supplies each
component's `.d.ts.txt` (the prop contract, **preserved exactly**) and `.jsx.txt`
(a reference implementation to rebuild idiomatically, not copy). The landing
handoff's README (`docs/design/design_handoff_landing/README.md`) is authoritative
on the CURRENT component APIs where the two disagree — notably `HandoffCard`.

Two settled decisions shape the build:

1. **`HandoffCard` takes structured `lines[]`, not the CLI string builder.** The
   current contract is `{ variant, title, width, lines[] }` where each line is a
   `string | { blank } | { gate, text } | { arrow, text }`. This supersedes the
   earlier idea (a web card that calls `@provegate/design/cli`'s `handoffCard`):
   the landing needs arbitrary card content, so the component renders structured
   lines. Parity with the terminal is at the **grammar** level — same glyphs
   (`✓ ✗ ⚠ = → !`), same box-drawing, same verdict colours — not textContent
   equality. (This dissolves the old cross-package parity test entirely.)
2. **Tokens only, colour law enforced.** Every component styles through `--pg-*`
   custom properties — no inline hex, no font stack. Green is earned: `Button` is
   never green; a `VerdictBadge`/`GateLine`/`EvidenceTable` cell is green only for
   `passed`. The verdict vocabulary is the closed lowercase set.

Consumers (landing, docs) are out of scope — they are PRD-013 / PRD-014.

---

## 2. Goals

### Primary Goals

- [ ] Nine components exported from `@provegate/design/react`, each matching its
      `.d.ts.txt` prop contract exactly.
- [ ] Every component styles through `--pg-*` tokens; no hex, no font stack, no
      magic pixel is authored in a component.
- [ ] The verdict-taking components share the terminal's glyph + colour grammar
      and the closed verdict set — web and CLI read as one system.
- [ ] The `./cli` entry stays React-free: adding React to `./react` must not make
      the zero-dependency CLI bundle pull React.

### Success Metrics

| Metric                                | Current            | Target                    | Measurement          |
| ------------------------------------- | ------------------ | ------------------------- | -------------------- |
| Components under `./react`            | 0 (stub)           | 9                         | `react/index.ts`     |
| Prop-contract fidelity                | n/a                | 9 of 9 match `.d.ts.txt`  | `props.test.tsx`     |
| Hardcoded hexes in `src/react/**`    | n/a                | 0                         | `react.test.tsx`     |
| React reachable from `./cli`         | 0                  | 0                         | `cli-entry.test.ts` (PRD-010) |

---

## 3. User Stories

#### User Story 1

```
As a web app (landing or docs) importing @provegate/design/react,
I want the nine components with their documented prop contracts,
so that I compose pages from one implementation, not per-app copies.
```

**Acceptance Criteria:**

- [ ] `import { Icon, Button, VerdictBadge, Admonition, CodeBlock, GateLine,
      HandoffCard, EvidenceTable, PhasePipeline } from '@provegate/design/react'`
      resolves and each renders.
- [ ] Every prop name and type in the component's `.d.ts.txt` is present; none
      is renamed or dropped.
- [ ] No component inlines a colour or font — all styling is `--pg-*`.

#### User Story 2

```
As a developer who trusts the colour law,
I want the components to obey it,
so that green never appears except on earned, passed work.
```

**Acceptance Criteria:**

- [ ] `Button` has no green variant; `VerdictBadge`/`GateLine`/`EvidenceTable`
      render green only for the `passed` verdict.
- [ ] The verdict set is the closed lowercase six; a seventh value is a type
      error (or, at runtime, is not rendered as a known verdict).
- [ ] Status glyphs are `✓ ✗ ⚠ = → !`, matching the CLI.

#### User Story 3

```
As the maintainer of the zero-dependency CLI,
I want React confined to the ./react entry,
so that adding components never leaks React into the published CLI bundle.
```

**Acceptance Criteria:**

- [ ] React is a peer/dev dependency of `@provegate/design`, imported only under
      `src/react/`.
- [ ] PRD-010's `cli-entry.test.ts` (no React reachable from `./cli`) still
      passes; a new assertion confirms `./cli`'s built output has no React.

---

## 4. Functional Requirements

1. **FR-1**: Add React tooling to `@provegate/design`: `react` (+ `react-dom`
   types) as a `peerDependency` and devDependency; a jsdom/happy-dom test
   environment and `@testing-library/react` (or equivalent) as devDependencies;
   `tsup`/`tsconfig` set up to emit `./react` with JSX. The `./cli` and `./tokens`
   entries stay React-free.
   - **Targets:** `packages/design/package.json`, `packages/design/tsup.config.ts`,
     `packages/design/tsconfig.json`, `packages/design/vitest.config.ts`
2. **FR-2**: `core/Icon` — the single-stroke geometric icon set (24px grid, 2px
   stroke, `currentColor`), names `check gate cross pending human machine lock
   exit0 merge terminal copy arrowRight chevronRight github`; `human` vs `machine`
   are distinct authorities. Rebuild from `Icon.jsx.txt`, contract from
   `Icon.d.ts.txt`.
   - **Targets:** `packages/design/src/react/Icon.tsx`
3. **FR-3**: `forms/Button` — `primary | secondary | ghost`, sizes `sm|md|lg`;
   **never green** (primary is neutral, per the colour law). Contract from
   `Button.d.ts.txt`.
   - **Targets:** `packages/design/src/react/Button.tsx`
4. **FR-4**: `feedback/VerdictBadge` + `feedback/Admonition` — VerdictBadge:
   closed `verdict` set (default `passed`), props `label code solid size`,
   glyph-first, monospace, green only for `passed`. Admonition: `type`
   `note|tip|warning|pass|fail|human`, `title`.
   - **Targets:** `packages/design/src/react/VerdictBadge.tsx`,
     `packages/design/src/react/Admonition.tsx`
5. **FR-5**: `cli/CodeBlock` + `cli/GateLine` — CodeBlock: always-dark terminal
   block, `filename lang prompt copyable`, string children. GateLine: closed
   `status` set (default `passed`), props `name command code bare`; the glyph
   carries status.
   - **Targets:** `packages/design/src/react/CodeBlock.tsx`,
     `packages/design/src/react/GateLine.tsx`
6. **FR-6**: `cli/HandoffCard` — the **structured-lines** contract
   `{ variant('handoff'|'stopped'), title, width=56, lines[] }`, each line
   `string | {blank} | {gate,text} | {arrow,text}`; copy-exact box-drawing, the
   `→ READY TO PUSH` moment in human-blue, the green/red rule per variant.
   - **Targets:** `packages/design/src/react/HandoffCard.tsx`
7. **FR-7**: `data/EvidenceTable` — `rows[]` of `{check, command, verdict, code,
   evidence}`; the verdict cell renders a `VerdictBadge`; the exit cell turns red
   only when `verdict === 'failed'`.
   - **Targets:** `packages/design/src/react/EvidenceTable.tsx`
8. **FR-8**: `diagram/PhasePipeline` — `phases[]`, `active`, `showPush`; human
   gates (1–3) vs machine gates (4–7) are visually distinct; push is always the
   human boundary. Callers pass explicit `phases` (canonical: PRD · Readiness ·
   Tasks · Implement · Test · Audit · Learn).
   - **Targets:** `packages/design/src/react/PhasePipeline.tsx`
9. **FR-9**: Barrel `react/index.ts` exports all nine; `@provegate/design/react`
   resolves them with types. The reference `.jsx.txt`/`.d.ts.txt` are the source;
   the shipped `ds-overrides.jsx` shim is NOT ported (it is a stale-bundle
   workaround; it only documents the current APIs).
   - **Targets:** `packages/design/src/react/index.ts`
10. **FR-10**: Tests — a prop-contract test (each component accepts its
    `.d.ts.txt` props and renders), a token-only scan (no hex/font-stack in
    `src/react/**`), the closed-verdict-set + glyph-grammar assertions, the
    colour-law checks (Button not green; VerdictBadge green only for passed), and
    a `./cli`-stays-React-free assertion (extends PRD-010's import-graph test).
    - **Targets:** `packages/design/test/props.test.tsx`,
      `packages/design/test/react.test.tsx`, `packages/design/test/cli-entry.test.ts`
11. **FR-11**: Document the layer in the design README: the nine components, the
    `HandoffCard` lines contract, the colour-law obligations for consumers, and
    that `./react` is peer-React while `./cli` stays React-free.
    - **Targets:** `packages/design/README.md`

---

## 5. Non-Goals (Out of Scope)

- `apps/web` (the landing page) — **PRD-013**.
- `apps/docs` theming + the OG card — **PRD-014**.
- The static-egress scanner, a11y/browser verification, content-hygiene of pages
  — those gate the *pages*, so they live with PRD-013/014.
- The landing prototype's fictional CLI surface (`gate.toml`, `gate ledger`, the
  four-command set) — no component encodes it; components are surface-agnostic.
- The `ds-overrides.jsx` shim and the `_ds_bundle.js` — never ported.
- Changing the token layer, the CLI builders, or anything under `src/cli`/
  `src/tokens` (PRD-010 owns them; this PRD only adds `src/react/`).

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** the built package, **When** a consumer imports any of the nine from
  `@provegate/design/react`, **Then** it resolves with types and renders.
- **Given** `src/react/**`, **When** scanned, **Then** no hardcoded hex or font
  stack appears — all styling is `--pg-*`.
- **Given** a `VerdictBadge`, **When** rendered for each verdict, **Then** only
  `passed` is green and the glyph matches the CLI.
- **Given** the `./cli` built entry, **When** its imports are walked, **Then** no
  React edge exists (PRD-010's gate still green).
- **Given** a `HandoffCard` with `lines`, **When** rendered, **Then** the box,
  glyphs, and the `→ READY TO PUSH` line match the terminal grammar.

---

## 7. Technical Considerations

### Architecture

- **React is confined to `./react`.** `@provegate/design` gains React as a
  peerDependency (consumers bring it) + a devDependency (build/test). The `./cli`
  and `./tokens` entries import no React; PRD-010's import-graph test already
  fails on a React edge from `./cli`, and this PRD adds a built-output check.
- **`HandoffCard` is a renderer, not a wrapper.** It takes structured `lines[]`
  and draws the box. It does not call the CLI string builder — the two share a
  grammar (glyphs, box chars, verdict colours), verified by assertion, not by
  textContent equality. This is the reconciliation the richer landing handoff
  forced, and it removes the workspace-cycle risk the first readiness pass flagged
  outright.
- **Prop contracts are the API.** The `.d.ts.txt` files are copied into real
  `.tsx` prop types; the `.jsx.txt` are rebuilt idiomatically. Names/types never
  drift.
- **A test env is new for this package.** Component tests need jsdom/happy-dom;
  add a `vitest.config.ts` with the DOM environment scoped so the existing
  node-environment tests (tokens/cli/assets) are unaffected.

### Dependencies

- `react` + `react-dom` (peer + dev), `@types/react(-dom)` (dev), a DOM test env
  + testing-library (dev). No runtime dependency is added to the CLI's world;
  `@provegate/design` stays `private`.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/design/src/react/**` (nine components + barrel)
- [ ] `packages/design/test/props.test.tsx`, `react.test.tsx`, extend
      `cli-entry.test.ts`
- [ ] `packages/design/package.json`, `tsup.config.ts`, `tsconfig.json`,
      `vitest.config.ts`, `README.md`

### Out of Scope

- `apps/**`, `scripts/**`, `src/cli/**`, `src/tokens/**`, the token source.

---

## 9. Open Questions

- (none — HandoffCard API, the split, and the fictional-surface handling were
  settled at claim time 2026-07-24)

---

## 10. References

- `docs/design/design_handoff_landing/README.md` — CURRENT component APIs
  (authoritative where they disagree with the older `.d.ts.txt`)
- `docs/design/design_handoff_provegate/design-system/components/**` — the nine
  `.d.ts.txt` prop contracts + `.jsx.txt` reference implementations
- `packages/design/src/tokens.ts`, `src/tokens/*.css` — the `--pg-*` tokens +
  colour law (PRD-010)
- `packages/design/src/cli/*` — the terminal glyph/verdict grammar to match
- `_prds/completed/prd-010-design-system-package.md` — the package this extends

---

## Conflict Surface

- `packages/design/src/react/**`
- `packages/design/test/props.test.tsx`
- `packages/design/test/react.test.tsx`
- `packages/design/test/cli-entry.test.ts`
- `packages/design/vitest.config.ts`
- `packages/design/tsup.config.ts`
- `packages/design/tsconfig.json`

> `packages/design/package.json` and `README.md` are shared append-only-style
> surfaces edited additively; not leased exclusively.

---

## Durable Artifacts

- `packages/design/README.md` — the React layer: nine components, HandoffCard
  lines contract, colour-law obligations, peer-React vs React-free `./cli`

---

## 11. Verification Commands

Run from repo root after `pnpm build`.

| FR    | Command / Check                                                       | Scope  | Notes                                        |
| ----- | --------------------------------------------------------------------- | ------ | -------------------------------------------- |
| FR-1  | `pnpm --filter @provegate/design build`                               | design | react entry builds with JSX                  |
| FR-2  | `pnpm --filter @provegate/design test test/props.test.tsx`            | design | Icon renders, names present                  |
| FR-3  | `pnpm --filter @provegate/design test test/react.test.tsx`            | design | Button has no green variant                  |
| FR-4  | `pnpm --filter @provegate/design test test/react.test.tsx`            | design | VerdictBadge/Admonition verdict + type sets  |
| FR-5  | `pnpm --filter @provegate/design test test/props.test.tsx`            | design | CodeBlock + GateLine render, glyph carries   |
| FR-6  | `pnpm --filter @provegate/design test test/react.test.tsx`            | design | HandoffCard lines[] + box + READY TO PUSH    |
| FR-7  | `pnpm --filter @provegate/design test test/react.test.tsx`            | design | EvidenceTable exit red only on failed        |
| FR-8  | `pnpm --filter @provegate/design test test/props.test.tsx`            | design | PhasePipeline explicit phases render         |
| FR-9  | `pnpm --filter @provegate/design test test/props.test.tsx`            | design | all nine resolve from the barrel             |
| FR-10 | `pnpm --filter @provegate/design test test/cli-entry.test.ts`         | design | ./cli stays React-free (built output)        |
| FR-11 | `grep -c "HandoffCard" packages/design/README.md`                     | design | React layer documented                       |

Cross-cutting (all green before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — full workspace suite; every prior PRD suite unchanged
- `pnpm build` — clean build, all packages and apps
- `node packages/provegate/dist/cli.js check PRD-012` — this PRD passes its own gate
- `node packages/provegate/dist/cli.js push; test $? -eq 1` — never-push invariant
- `grep -ri -l -e emofy -e rayvaz packages/design/src && exit 1 || true` — hygiene

---

## 12. DO NOT (Anti-Patterns)

- DO NOT port `ds-overrides.jsx` or `_ds_bundle.js` — the shim is a stale-bundle
  workaround; the tokens/builders in `packages/design` are the source of truth.
- DO NOT let React become reachable from the `./cli` entry — the published CLI
  stays zero-dependency; keep React under `src/react/` only.
- DO NOT hardcode a hex, a font stack, a radius, or a spacing value in a
  component — reference the `--pg-*` token.
- DO NOT give `Button` a green variant, or paint any non-`passed` verdict green.
  Green is earned.
- DO NOT rename or drop a prop from a `.d.ts.txt` contract.
- DO NOT invent a verdict outside `passed · failed · partial · skipped ·
  operator · blocked`, and never `pass`/`fail`/`PROVEN`/`VIOLATED`.
- DO NOT make `HandoffCard` call the CLI string builder — it renders structured
  `lines[]`; parity is at the grammar level.
- DO NOT touch `src/cli/**`, `src/tokens/**`, the token source, or any `apps/**`
  — those are PRD-010 (owned) and PRD-013/014 (separate).
- DO NOT introduce `any`; use `unknown` + narrowing.

---

## Changelog

| Date       | Author | Changes                                                    |
| ---------- | ------ | ---------------------------------------------------------- |
| 2026-07-23 | owner  | Initial draft (whole web wave)                             |
| 2026-07-24 | owner  | Rescoped to the React component layer; landing → PRD-013, docs+OG → PRD-014; HandoffCard lines[] API; fictional CLI surface dropped |
