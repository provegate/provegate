# Tasks: Design System Package

> **PRD**: [prd-010-design-system-package.md](../../_prds/wip/prd-010-design-system-package.md)
> **Readiness**: [readiness-010-design-system-package.md](../../_readiness/wip/readiness-010-design-system-package.md)
> **Status**: Code Complete
> **Readiness Score**: 8.5/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-23
> **Updated**: 2026-07-23

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- A PRD may be `Code Complete` with operator handoff items, but it is not
  `Ship Verified` until required handoff items are resolved or explicitly accepted.
- Phase 4 agents hold a valid lock lease (METHOD.md → Locks) before editing
  implementation files or this task file.

---

## Relevant Files

- `packages/design/package.json` — `@provegate/design`, private, exports map, scripts
- `packages/design/tsconfig.json` — TS config matching workspace conventions
- `packages/design/tsup.config.ts` — emit for `./react` and `./cli` entries
- `packages/design/src/tokens.ts` — single source of truth for every hex + ANSI triplet
- `packages/design/scripts/generate-tokens.ts` — emits colors.css + cli/theme.ts
- `packages/design/src/tokens/colors.css` — GENERATED web color tokens
- `packages/design/src/cli/theme.ts` — GENERATED colorizer + glyph table + tiers
- `packages/design/src/styles.css` — web token entry (imports all of tokens/)
- `packages/design/src/tokens/typography.css` — ported type scale
- `packages/design/src/tokens/spacing.css` — ported spacing/radii
- `packages/design/src/tokens/effects.css` — ported shadows/motion
- `packages/design/src/tokens/fonts.css` — self-hosted @font-face (no CDN)
- `packages/design/assets/fonts/` — IBM Plex Sans + Mono woff2 + OFL.txt
- `packages/design/assets/logo.svg`, `packages/design/assets/favicon.svg` — brand marks
- `packages/design/src/cli/cards.ts` — handoff + stopped card string builders (pure)
- `packages/design/src/cli/status-line.ts` — gate status-line builder (pure)
- `packages/design/src/cli/index.ts` — `./cli` entry: theme + builders, zero web imports
- `packages/design/test/tokens.test.ts` — hex coverage, byte-identity, verdict set, contrast
- `packages/design/test/cli-entry.test.ts` — transitive import-graph purity
- `packages/design/test/assets.test.ts` — no http URL in CSS, OFL present, font src resolves
- `packages/design/test/cards.test.ts` — card text byte-identical to today's builder
- `packages/design/README.md` — origin rule, color law, how to change a token
- `turbo.json` — generate-tokens task + tokens.ts in build inputs

### Notes

- Tests live in `packages/design/test/` (mirrors `packages/provegate/test/`).
- `colors.css` and `cli/theme.ts` are GENERATED — never hand-edit; regenerate from
  `tokens.ts`. Reference: `docs/design/design_handoff_provegate/`.

---

## Tasks

- [x] 1.0 Package scaffold + turbo wiring
  - [x] 1.1 Create `packages/design/package.json`: name `@provegate/design`,
        `"private": true`, `"type": "module"`, `engines.node ">=22"`, `exports`
        map (`./styles.css`, `./tokens`, `./cli`, reserved `./react`), scripts
        (`build`, `generate-tokens`, `check-types`, `lint`, `test`), **no
        `dependencies` key**. (FR-1)
  - [x] 1.2 Add `packages/design/tsconfig.json` and `tsup.config.ts` matching the
        `packages/provegate` emit conventions (esm, node22, dts, clean, no
        splitting). tsup entries: `cli`, `react` (react may be an empty stub
        re-export until PRD-012). (FR-1)
  - [x] 1.3 Wire `turbo.json`: add a `generate-tokens` task, add
        `packages/design/src/tokens.ts` to `build`'s `inputs`, confirm
        `pnpm-workspace.yaml` `packages/*` glob resolves the package. (FR-8)
  - [x] 1.4 Confirm `pnpm --filter @provegate/design build` resolves and `pnpm
        build` orders design before dependents. (FR-1, FR-8)

- [x] 2.0 Token source of truth + typed law
  - [x] 2.1 Author `packages/design/src/tokens.ts`: warm neutral ramp; proof-green,
        fail-red, warn-amber, human-blue, plan-cyan, stale-amber ramps; light +
        dark semantic aliases; always-dark terminal slots; each terminal slot with
        BOTH a truecolor triplet and its 16-color ANSI floor. Transcribe from the
        handoff exactly — no re-pick, no rounding. (FR-2)
  - [x] 2.2 Encode the color law and closed ledger vocabulary as union types:
        `passed|failed|partial|skipped|operator|blocked` + glyphs `✓ ✗ ⚠ = → !`,
        and semantic color slots, so a decorative green requires defeating the
        type. (FR-7)
  - [x] 2.3 Export brand asset paths (`logo.svg`, `favicon.svg`) from `./tokens`
        so consumers reference rather than copy. (FR-6)

- [x] 3.0 Generator + generated outputs + byte-identity gate
  - [x] 3.1 Write `packages/design/scripts/generate-tokens.ts`: emit
        `src/tokens/colors.css` (`:root` light, `[data-theme="dark"]` +
        `prefers-color-scheme` dark, terminal slots) and `src/cli/theme.ts` (the
        `useColor` colorizer, glyph table, truecolor/16-color/no-color tiers).
        Both carry a "generated — do not edit" banner naming the generator +
        source. (FR-3)
  - [x] 3.2 **W1 — generator vs formatter**: make the generator emit
        already-prettier/eslint-clean output, OR add both files to the formatter
        ignore-list. Decide once; record the choice in the README (task 7.1). A
        clean checkout must `generate-tokens` byte-identically. (W1)
  - [x] 3.3 Pin determinism: fixed key order, fixed number formatting, trailing
        newline — so the byte-identity gate is stable, not flaky. (W1)
  - [x] 3.4 `test/tokens.test.ts`: regenerate into a temp dir and assert
        byte-identity with the committed `colors.css` + `cli/theme.ts`; a
        hand-edit fails and names the drifted file. Also assert every handoff hex
        appears exactly once and the closed verdict set + glyph table are present.
        (FR-2, FR-3, FR-7)

- [x] 4.0 Ported token layers + self-hosted fonts + assets
  - [x] 4.1 Port `typography.css`, `spacing.css`, `effects.css` and `styles.css`
        from the handoff verbatim; preserve every `--pg-*` name. (FR-4)
  - [x] 4.2 **W2 — font provenance**: vendor upstream IBM Plex Sans + Mono woff2
        UNMODIFIED into `assets/fonts/`, commit `OFL.txt`, record source URL +
        checksum (in README). No subsetting toolchain. (FR-5, W2)
  - [x] 4.3 Rewrite `tokens/fonts.css` as local `@font-face` (relative `src`,
        `font-display: swap`); the Google Fonts `@import` must not survive
        anywhere in the repo. (FR-5)
  - [x] 4.4 Move `assets/logo.svg` + `assets/favicon.svg` in unchanged. (FR-6)
  - [x] 4.5 `test/assets.test.ts`: no `http`/`https` URL in any shipped CSS;
        `OFL.txt` present; **W3** — assert the `@font-face` `src` resolves from a
        consumer context (path exists relative to the CSS file), not just that no
        http appears. (FR-5, W3)

- [x] 5.0 CLI string builders (FR-11)
  - [x] 5.1 Author `src/cli/cards.ts`: pure `handoffCard` + `stopCard` builders
        reproducing today's card text byte-for-byte (reference
        `packages/provegate/src/core/run/cards.ts`). No color, no I/O, no
        `process` access inside the builder. (FR-11)
  - [x] 5.2 Author `src/cli/status-line.ts`: pure builder for the
        `<glyph> phase N · name · command · exit code · verdict` grammar. (FR-11)
  - [x] 5.3 `src/cli/index.ts` exports theme + builders as the `./cli` entry; no
        `.css`, no React, no third-party import. (FR-11, FR-9)
  - [x] 5.4 `test/cards.test.ts`: assert `handoffCard`/`stopCard` output is
        byte-identical to the current `cards.ts` fixtures. (FR-11)

- [x] 6.0 Invariant tests (import-graph + contrast)
  - [x] 6.1 **W4** — `test/cli-entry.test.ts`: walk the TRANSITIVE import graph
        from the `./cli` entry; fail on the first `.css`, React, or non-relative
        (third-party) import. (FR-9, W4)
  - [x] 6.2 Assert `@provegate/design` declares zero runtime `dependencies`
        (read its package.json). (FR-9)
  - [x] 6.3 **W5** — pure-function contrast test over the semantic token pairs
        (text-on-surface, status-on-terminal-bg) in both themes; assert WCAG AA.
        (W5)

- [x] 7.0 README durable artifact
  - [x] 7.1 Write `packages/design/README.md`: the origin rule, the color law
        (`GREEN IS EARNED`), how to change a token (edit tokens.ts → run
        generate-tokens), why the `./cli` entry is separate, the self-hosted-font
        override of the handoff (+ the W1 formatter decision and W2 font
        provenance/checksum). (FR-10)

- [x] 8.0 Phase 5 — Testing
  - [x] 8.1 Run every PRD §11 command; paste command + trimmed output into the
        Verification Ledger. A listed-but-not-run command is never `passed`.
  - [x] 8.2 Run the cross-cutting floor: `pnpm check-types`, `pnpm lint`,
        `pnpm test`, `pnpm build`, `gate check PRD-010`, the never-push invariant,
        the hygiene grep.

- [ ] 9.0 Phase 6 — Final Auditing
  - [ ] 9.1 Independent adversarial review (different model family) of the diff;
        save the verdict artifact from `templates/review-template.md` to
        `_docs/reviews/review-010-design-system-package.md`. `Verdict: pass`
        requires `Critical: 0`. Reviewer attacks: generator determinism, the
        import-graph test's honesty, font provenance.

- [ ] 10.0 Phase 7 — Learning
  - [ ] 10.1 Confirm the declared Durable Artifact (`packages/design/README.md`)
        appears in the merge diff.
  - [ ] 10.2 Knowledge ingest: capture only what is NOT derivable from the code —
        the generator/formatter decision and the token-origin rule.

---

## Verification Ledger

| Gate               | Command / Check                                                | Scope  | Result  | Evidence | Notes                       |
| ------------------ | -------------------------------------------------------------- | ------ | ------- | -------- | --------------------------- |
| FR-1               | `pnpm --filter @provegate/design build`                        | design | passed | dist: cli 3.38KB, tokens 5.30KB, react stub | package builds, exports      |
| FR-2               | `pnpm --filter @provegate/design test test/tokens.test.ts`     | design | passed | every ramp+terminal hex present in colors.css | hexes present, once each     |
| FR-3               | `pnpm --filter @provegate/design test test/tokens.test.ts`     | design | passed | regenerate == committed (colors.css + theme.ts) | regenerate → byte-identical  |
| FR-4               | `grep -c "pg-space-" packages/design/src/tokens/spacing.css`   | design | passed | 10 | ported layers present        |
| FR-5               | `pnpm --filter @provegate/design test test/assets.test.ts`     | design | passed | no http in css; OFL.txt; 8 woff2 src resolve | no http; OFL; src resolves    |
| FR-6               | `test -f packages/design/assets/logo.svg`                      | design | passed | logo.svg + favicon.svg present | brand assets vendored        |
| FR-7               | `pnpm --filter @provegate/design test test/tokens.test.ts`     | design | passed | 6 verdicts, green=passed only, skipped=dim | closed verdict set + glyphs  |
| FR-8               | `pnpm build`                                                    | root   | passed | turbo 4 tasks, design builds | turbo orders design first    |
| FR-9               | `pnpm --filter @provegate/design test test/cli-entry.test.ts`  | design | passed | cli graph pure; zero dependencies | no css/react/third-party      |
| FR-10              | `grep -c "GREEN IS EARNED" packages/design/README.md`          | design | passed | 1 | color law documented         |
| FR-11              | `pnpm --filter @provegate/design test test/cards.test.ts`      | design | passed | handoff/stop cards byte-exact + statusLine | card text byte-identical     |
| types              | `pnpm check-types`                                             | root   | passed | 0 errors | zero errors                  |
| lint               | `pnpm lint`                                                    | root   | passed | 0 warnings | zero warnings                |
| build              | `pnpm build`                                                   | root   | passed | 4 tasks clean | clean, all packages/apps      |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-010`           | repo   | passed | exit 0 | PRD passes its own gate      |
| never-push         | `node packages/provegate/dist/cli.js push; test $? -eq 1`     | repo   | passed | exit 1 | refusal exit 1               |
| hygiene            | `grep -ri -l -e emofy -e rayvaz packages/design/src && exit 1 \|\| true` | design | passed | clean | no personal names |
| independent-review | `_docs/reviews/review-010-design-system-package.md`           | repo   | pending |          | verdict pass, critical = 0   |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

- 3.x — W1 (generator vs formatter) resolved by keeping the generated
  `theme.ts` lint-clean (no eslint-disable needed) so no formatter/ignore
  exception was required; `colors.css` is CSS (not linted). The byte-identity
  gate compares against the emitters in `scripts/emit.ts`, which is split out of
  `generate-tokens.ts` precisely so the test imports it without the file-writing
  side effect.
- 4.2 — W2 font provenance: vendored UNMODIFIED from
  `@fontsource/ibm-plex-{sans,mono}@5.3.0` (OFL-1.1), latin subset, weights
  400/500/600/700; `OFL.txt` + the @fontsource version recorded in the README.
  No subsetting toolchain. The @fontsource packages are devDependencies only
  (used to source the files); the vendored woff2 are served from our own origin.
- 1.x — the byte-identity design means `colors.css` + `cli/theme.ts` are
  GENERATED and committed; a token change is a two-step (edit `tokens.ts` →
  `generate-tokens`), and the gate proves the committed output is current. The
  dark-theme rgba tints are computed from ramp hexes (`rgbaOf`) so green lives in
  exactly one place even in the alpha values.
- FR-8 scope: `turbo.json` gained a `generate-tokens` task; nothing consumes
  `@provegate/design` yet (PRD-011/012 do), so "builds before dependents" is
  latent — verified the package builds under the workspace `pnpm build`.

---

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

---

## Blockers / Open Questions

- (none)

---

## Operator Handoff

> None — every gate is machine-checkable. The empty row keeps the operator-row
> count at 0 so the merge gate needs no acceptance.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
|      |          |       |                |        |       |
