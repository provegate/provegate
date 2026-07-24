# PRD-010: Design System Package — One Token Source for Terminal and Web

> **Status**: Draft
>
> **Created**: 2026-07-23
> **Updated**: 2026-07-23
> **Author**: owner
> **Audience**: Implementing Agent (Claude Code / Cursor / Codex)
> **Slug**: `design-system-package`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Class Rationale**: (default class) — a new workspace package with new
> user-visible surface area (the token contract every other surface consumes).
> **Autonomous Close**: operator-gated
> **State Record**: `_state/prds.json`

---

## 1. Introduction / Overview

A design system handoff landed in `docs/design/design_handoff_provegate/`: token
CSS, nine React component references, two brand assets, and copy-exact CLI output
specimens. Its load-bearing instruction is architectural, not cosmetic:

> `packages/design/` is the origin. Nobody hardcodes a hex, a glyph, or a verdict
> string anywhere else.

This PRD builds that origin — **and nothing that consumes it**. The risk the
handoff names explicitly is drift: proof-green living in `colors.css` for the web
and again as an ANSI triplet in the CLI, silently diverging. So the package is
built around a single TypeScript source of truth (`src/tokens.ts`) from which both
the web CSS and the terminal ANSI theme are **generated**, with a byte-identity
gate proving the committed outputs match a fresh generation.

Two handoff instructions are deliberately overridden here, both for repo law:

1. **Fonts are self-hosted, not imported from Google Fonts.** `tokens/fonts.css`
   ships an `@import` to `fonts.googleapis.com`. This repo forbids network calls
   and third-party CDNs on its own surfaces; IBM Plex is OFL-1.1, so self-hosting
   is both legal and required (design brief §12.5).
2. **Paths are mapped to this repo.** The handoff assumes `packages/cli` and
   `apps/landing`; here they are `packages/provegate` and `apps/web`.

Consumers are out of scope by design: PRD-011 adopts the terminal half, and the
web half is deferred to a later wave. That wave is now fully specified upstream —
the second handoff drop (2026-07-23) added `ui_kits/` (landing, docs, brand),
`guidelines/`, and `templates/` — but it lands as its own PRD against its own
conflict surface, not here.

---

## 2. Goals

### Primary Goals

- [ ] Every hex, ANSI triplet, and status glyph in the repo has exactly one
      authoring location: `packages/design/src/tokens.ts`.
- [ ] Web CSS and terminal ANSI are generated from that file, and a gate fails if
      the committed artifacts drift from a fresh generation.
- [ ] The terminal entry point is importable by a package that must publish with
      zero runtime dependencies and no network calls.
- [ ] Web fonts are self-hosted; the repo makes no request to a third-party CDN.

### Success Metrics

| Metric                                   | Current                 | Target                          | Measurement          |
| ---------------------------------------- | ----------------------- | ------------------------------- | -------------------- |
| Authoring locations for proof-green       | 0 (no system)           | exactly 1 (`tokens.ts`)         | `tokens.test.ts`     |
| Generated-artifact drift detection        | none                    | byte-identity gate              | `tokens.test.ts`     |
| Third-party font/CDN requests on our sites| 1 (`@import` in handoff)| 0                               | `assets.test.ts`     |
| CSS/React reachable from the `./cli` entry| n/a                     | 0 imports                       | `cli-entry.test.ts`  |

---

## 3. User Stories

#### User Story 1

```
As the maintainer changing proof-green,
I want to edit one constant in tokens.ts,
so that the web CSS and the terminal ANSI move together and cannot drift.
```

**Acceptance Criteria:**

- [ ] `pnpm --filter @provegate/design generate-tokens` rewrites
      `src/tokens/colors.css` and `src/cli/theme.ts` from `src/tokens.ts`.
- [ ] Both generated files carry a "generated — do not edit" banner naming the
      generator and its source.
- [ ] A test regenerates into a temp dir and asserts byte-identity with the
      committed files; editing a generated file by hand fails the gate.

#### User Story 2

```
As the CLI (a package published with zero runtime dependencies),
I want a terminal entry point that contains only ANSI strings and glyphs,
so that consuming the design system cannot smuggle CSS, React, or a dependency in.
```

**Acceptance Criteria:**

- [ ] `@provegate/design` exposes `./cli` (ANSI + glyphs), `./tokens` (raw token
      values), `./styles.css` (web token entry) and reserves `./react`.
- [ ] The `./cli` entry's transitive import graph contains no `.css` import, no
      React import, and no third-party module.
- [ ] `@provegate/design` itself declares zero runtime `dependencies`.

#### User Story 3

```
As a reader of the docs or landing site,
I want the brand typefaces served from our own origin,
so that no third party learns that I visited, consistent with the no-telemetry rule.
```

**Acceptance Criteria:**

- [ ] IBM Plex Sans + IBM Plex Mono woff2 subsets live under
      `packages/design/assets/fonts/` with the upstream OFL-1.1 license text.
- [ ] `tokens/fonts.css` declares `@font-face` with relative `src` and
      `font-display: swap`; it contains no `http` URL.

---

## 4. Functional Requirements

1. **FR-1**: Create the workspace package `@provegate/design` at
   `packages/design`, `"private": true` (never published to npm; consumed only
   across the workspace), `"type": "module"`, Node ≥ 22, with an `exports` map
   providing `./styles.css`, `./tokens`, `./cli`, and a reserved `./react`.
   Build with tsup, matching the repo's existing emit conventions.
   - **Targets:** `packages/design/package.json`, `packages/design/tsup.config.ts`,
     `packages/design/tsconfig.json`
2. **FR-2**: Author `src/tokens.ts` as the single source of truth: the warm
   neutral ramp, proof-green / fail-red / warn-amber / human-blue / plan-cyan /
   stale-amber ramps, light and dark semantic aliases, the always-dark terminal
   surface slots, and for every terminal slot both a truecolor triplet and its
   16-color ANSI floor. Values are transcribed exactly from the handoff — no
   re-picking, no rounding.
   - **Targets:** `packages/design/src/tokens.ts`
3. **FR-3**: Write `scripts/generate-tokens.ts`, wired as the `generate-tokens`
   package script, emitting (a) `src/tokens/colors.css` — `:root` light,
   `[data-theme="dark"]` and `prefers-color-scheme` dark, plus the terminal
   slots — and (b) `src/cli/theme.ts` — the colorizer, the glyph table, and the
   truecolor/16-color/no-color tiers. Both outputs are committed and carry a
   generated-file banner.
   - **Targets:** `packages/design/scripts/generate-tokens.ts`,
     `packages/design/src/tokens/colors.css`, `packages/design/src/cli/theme.ts`
4. **FR-4**: Port the non-generated token layers from the handoff as-is —
   `typography.css`, `spacing.css`, `effects.css` — plus `styles.css` as the
   import entry. Values are reproduced exactly; where the handoff names a token,
   the token name is preserved (`--pg-*`).
   - **Targets:** `packages/design/src/styles.css`,
     `packages/design/src/tokens/typography.css`,
     `packages/design/src/tokens/spacing.css`,
     `packages/design/src/tokens/effects.css`
5. **FR-5**: Self-host the typefaces: IBM Plex Sans and IBM Plex Mono woff2 under
   `assets/fonts/` with `OFL.txt`, and rewrite `tokens/fonts.css` as local
   `@font-face` declarations. The Google Fonts `@import` from the handoff must not
   survive anywhere in the repo.
   - **Targets:** `packages/design/src/tokens/fonts.css`,
     `packages/design/assets/fonts/`
6. **FR-6**: Move the brand assets in unchanged — `assets/logo.svg` (single-color,
   `currentColor`) and `assets/favicon.svg` — and export their paths from
   `./tokens` so consumers reference rather than copy them.
   - **Targets:** `packages/design/assets/logo.svg`,
     `packages/design/assets/favicon.svg`, `packages/design/src/tokens.ts`
7. **FR-7**: Encode the color law and the closed ledger vocabulary as typed
   constants — `passed | failed | partial | skipped | operator | blocked` with
   their glyphs (`✓ ✗ ⚠ = → !`) and semantic color slots — so no consumer can
   invent a seventh verdict or a decorative green.
   - **Targets:** `packages/design/src/tokens.ts`, `packages/design/src/cli/theme.ts`
8. **FR-8**: Wire the monorepo: add `generate-tokens` to the turbo pipeline with
   `src/tokens.ts` in `build`'s `inputs` so a token edit cache-busts dependents,
   and confirm `pnpm-workspace.yaml`'s `packages/*` glob picks the package up.
   - **Targets:** `turbo.json`, `packages/design/package.json`
9. **FR-9**: Gate the invariants with tests: generated-artifact byte-identity, the
   `./cli` entry's clean import graph, zero declared runtime dependencies, no
   `http`/`https` URL anywhere in the shipped CSS, and the closed verdict set.
   - **Targets:** `packages/design/test/tokens.test.ts`,
     `packages/design/test/cli-entry.test.ts`,
     `packages/design/test/assets.test.ts`
10. **FR-10**: Document the contract in `packages/design/README.md`: the origin
    rule, the color law, how to change a token, why the CLI entry is separate, the
    self-hosted-font override of the handoff, and the string-builder rule from
    FR-11.
    - **Targets:** `packages/design/README.md`
11. **FR-11**: Author the terminal **string builders** in the `./cli` entry as pure
    functions — the handoff card, the stopped card, and the gate status line —
    reproducing today's card text byte-for-byte (`packages/provegate/src/core/run/cards.ts`
    is the reference) plus the new status-line grammar. They are the single
    implementation: `packages/provegate` consumes them (PRD-011) and the web
    `HandoffCard`/`GateLine` render their output (PRD-012), so no parity test
    between two implementations is ever needed. Pure string in, pure string out —
    no color applied inside the builder, no I/O, no process access.
    - **Targets:** `packages/design/src/cli/cards.ts`,
      `packages/design/src/cli/status-line.ts`,
      `packages/design/src/cli/index.ts`,
      `packages/design/test/cards.test.ts`

---

## 5. Non-Goals (Out of Scope)

- Any consumer wiring. `packages/provegate` is PRD-011; `apps/web` and
  `apps/docs` are a later wave.
- The nine React components. The `./react` export path is reserved but empty;
  components land with the web adoption PRD, against the `.d.ts.txt` prop
  contracts in the handoff.
- The landing page, docs layouts and brand surfaces (OG card, README header,
  shields) — `ui_kits/` ships in the second handoff drop and is the web wave's
  input, not this package's.
- Publishing `@provegate/design` to npm. It stays private; only `provegate` ships.
- Changing any string the CLI prints today. FR-11 *reproduces* the current card
  text; wiring the CLI to consume it — and deleting the local copy — is PRD-011.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** an edited hex in `src/tokens.ts`, **When** `generate-tokens` runs,
  **Then** both `colors.css` and `cli/theme.ts` change in the same commit.
- **Given** a hand-edited generated file, **When** the test suite runs, **Then**
  the byte-identity gate fails and names the drifted file.
- **Given** the `./cli` entry, **When** its import graph is walked, **Then** it
  contains no CSS, no React, and no third-party module.
- **Given** the shipped CSS, **When** it is scanned for URLs, **Then** no
  `http`/`https` origin appears.
- **Given** `pnpm build` at the root, **When** turbo runs, **Then**
  `@provegate/design` builds before its dependents and a token edit invalidates
  their cache.

---

## 7. Technical Considerations

### Architecture

- **Generator, not a build-time dependency.** `generate-tokens` emits committed
  source files rather than build artifacts. Committed output means a reviewer sees
  the token diff in the PR, and the CLI can import a plain `.ts` file with no
  cross-package build ordering surprise. The byte-identity test is what makes
  committed generated code safe — it is exactly the method's own doctrine (a
  machine-checkable gate, not a convention).
- **Two entry points, one source.** The `./cli` entry must stay importable by a
  zero-dependency published package. Keeping it in its own directory with its own
  import-graph test is cheaper than auditing bundles later.
- **Private package.** `"private": true` avoids an npm namespace decision now and
  guarantees the published surface stays `provegate` alone.
- **Color-law enforcement is typed, not documented.** The verdict set and the
  semantic slots are union types; a decorative green requires deliberately
  defeating the type, which review will catch.

### Dependencies

- None at runtime. Dev: tsup, typescript, vitest (already in the workspace).
- Font files: IBM Plex Sans + Mono woff2, OFL-1.1, vendored with license text.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/design/**` (new package: package.json, tsconfig, tsup config,
      tokens source, generator, generated CSS + theme, assets, tests, README)
- [ ] `turbo.json` (pipeline wiring)

### Out of Scope

- `packages/provegate/**`, `apps/**`, and every string the CLI prints today.

---

## 9. Open Questions

- (none — font self-hosting and package privacy settled in §1 and §7)

---

## 10. References

- `docs/design/design_handoff_provegate/README.md` — placement, exports map,
  hex↔ANSI table, turbo notes
- `docs/design/design_handoff_provegate/design-system/readme.md` — color law,
  voice, visual foundations
- `docs/design/design_handoff_provegate/design-system/tokens/*.css` — token source
- `docs/design/design_handoff_provegate/design-system/guidelines/*.card.html` —
  rendered specimens of the real tokens (colour, type, spacing, brand); the
  visual acceptance target for FR-2 through FR-4
- `docs/design/design-brief-2026-07-23.md` §12 — the five owner decisions this
  package implements (dark canonical, wordmark + mark, static CLI specimens,
  OSS self-hosted fonts)
- `CLAUDE.md` — zero runtime dependencies, no network calls

---

## Conflict Surface

- `packages/design/**`
- `turbo.json`

---

## Durable Artifacts

- `packages/design/README.md` — the origin rule, the color law, how to change a
  token, why the CLI entry is separate

---

## 11. Verification Commands

Run from repo root after `pnpm build`.

| FR    | Command / Check                                                        | Scope  | Notes                                        |
| ----- | ---------------------------------------------------------------------- | ------ | -------------------------------------------- |
| FR-1  | `pnpm --filter @provegate/design build`                                | design | package builds, exports resolve              |
| FR-2  | `pnpm --filter @provegate/design test test/tokens.test.ts`             | design | every handoff hex present, exactly once      |
| FR-3  | `pnpm --filter @provegate/design test test/tokens.test.ts`             | design | regenerate → byte-identical to committed     |
| FR-4  | `grep -c "pg-space-" packages/design/src/tokens/spacing.css`          | design | ported token layers present                  |
| FR-5  | `pnpm --filter @provegate/design test test/assets.test.ts`            | design | no http URL in shipped CSS; OFL.txt present  |
| FR-6  | `test -f packages/design/assets/logo.svg`                             | design | brand assets vendored                        |
| FR-7  | `pnpm --filter @provegate/design test test/tokens.test.ts`            | design | closed verdict set, glyph table              |
| FR-8  | `pnpm build`                                                           | root   | turbo builds design before dependents        |
| FR-9  | `pnpm --filter @provegate/design test test/cli-entry.test.ts`         | design | cli entry graph: no css/react/third-party    |
| FR-10 | `grep -c "GREEN IS EARNED" packages/design/README.md`                 | design | color law documented                         |
| FR-11 | `pnpm --filter @provegate/design test test/cards.test.ts`             | design | card text byte-identical to today's builder  |

Cross-cutting (all green before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — full workspace suite; every prior PRD suite unchanged
- `pnpm build` — clean build, all packages and apps
- `node packages/provegate/dist/cli.js check PRD-010` — this PRD passes its own gate
- `node packages/provegate/dist/cli.js push; test $? -eq 1` — never-push invariant
- `grep -ri -l -e emofy -e rayvaz packages/design/src && exit 1 || true` — hygiene

---

## 12. DO NOT (Anti-Patterns)

- DO NOT hand-edit a generated file. `colors.css` and `cli/theme.ts` are outputs;
  the source is `tokens.ts` and the byte-identity gate will catch you.
- DO NOT re-pick, round, or "improve" a handoff color. Fidelity is high by
  instruction; a value that seems wrong is an owner question, not an edit.
- DO NOT keep the Google Fonts `@import`, or add any CDN, webfont service, or
  network request to a shipped stylesheet.
- DO NOT let CSS, React, or any third-party module become reachable from the
  `./cli` entry — the published CLI must stay zero-dependency.
- DO NOT add `dependencies` to `packages/design/package.json`.
- DO NOT introduce a seventh verdict word, an emoji status, or a green that marks
  anything other than earned, machine-verified pass.
- DO NOT publish `@provegate/design` or remove its `private` flag.
- DO NOT touch `packages/provegate` or `apps/**` in this PRD — the consumers are
  separate work items with separate conflict surfaces.
- DO NOT apply color, read `process`, or touch I/O inside a string builder. They
  are pure functions; the caller colors and prints.
- DO NOT introduce `any`; use `unknown` + narrowing.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-23 | owner  | Initial draft |
