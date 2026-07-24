# Independent Review: PRD-010 — Design System Package (`@provegate/design`)

> **PRD:** PRD-010
> **Verdict:** fail
> **Reviewer:** Sonnet 5 (independent Phase 6 session)
> **Base SHA:** `cdb498e3594d94bddfc0e0c560c014091277d48b`
> **Critical:** 1
> **High:** 1
> **Medium:** 0
> **Quorum:** 1/1 pass (single independent reviewer)

## Summary

Reviewed `git diff cdb498e..0bc1725` (feature tip `0bc17253695ac89a9d9e7ed16d3940807e59c819`)
in full: `src/tokens.ts`, `scripts/emit.ts` + `generate-tokens.ts`, all four `src/tokens/*.css`
layers, `src/styles.css`, `src/cli/{index,cards,status-line,theme}.ts`, `src/react/index.ts`,
both brand SVGs, all 8 vendored woff2 files + `OFL.txt`, `package.json`, `tsup.config.ts`,
`tsconfig.json`, `turbo.json`, and all four test files. I byte-diffed every non-generated
source file against the handoff (`docs/design/design_handoff_provegate/`), byte-compared the
vendored woff2 files against the actual installed `@fontsource/ibm-plex-{sans,mono}` npm
packages, independently recomputed the WCAG contrast ratios from scratch (not from the test's
own math), diffed `packages/design/src/cli/cards.ts` against
`packages/provegate/src/core/run/cards.ts` byte-for-byte, and — per the empirical-gate
instruction — wrote and ran temporary probes against the two gates the brief flagged as
highest-risk (the byte-identity gate and the `./cli` import-graph gate) plus one the brief
didn't name (the "typed color law" claim). Two of those probes found real, reproducible
defects; both are reverted (confirmed clean rebuild + `git status`).

**What's clean.** Every ramp hex, tint, and terminal-slot hex in `src/tokens.ts` is a byte-exact
transcription of the handoff's `colors.css` (no re-picking, no rounding — checked line by
line). The dark-theme `rgba(...)` tints computed by `rgbaOf` match the handoff's literal values
exactly, including the specific pair named in the brief (`rgba(79,208,138,0.14)` for
green-400@.14) and all five others. `typography.css`, `spacing.css`, and `effects.css` are
byte-identical to the handoff. `fonts.css` contains no `http`/`https` URL, all 8 `@font-face`
`src` paths resolve to real files, and all 8 vendored `.woff2` files are byte-identical
(`cmp`) to the actual `@fontsource/ibm-plex-sans@5.3.0`/`@fontsource/ibm-plex-mono@5.3.0`
packages installed in this workspace — genuinely unmodified, not just "looks right." The brand
SVGs are byte-identical to the handoff's originals. `cards.ts`'s two builder function bodies
are **byte-for-byte identical** to `packages/provegate/src/core/run/cards.ts` (confirmed with
`diff`, zero output). WCAG contrast, recomputed independently: terminal fg 14.6:1, dim 5.4:1,
every status hue 6.8–9.8:1, light/dark body text ~16.5:1 — all comfortably clear the honest
4.5/3.0 thresholds, no fudging. The `Verdict` string union itself is closed (a 7th verdict
literal fails to type-check). `package.json` has no `dependencies` key at all. `turbo.json`
correctly adds a `generate-tokens` task and puts `src/**` in `build`'s `inputs`. No `any`
anywhere in `src`/`scripts`. Full workspace: `pnpm --filter @provegate/design test` 24/24,
`pnpm --filter provegate test` 461/461, `pnpm check-types`/`pnpm lint`/`pnpm build` all clean
across all 4 workspace projects.

**What's broken — Critical.** FR-9's `./cli` import-graph gate does not actually enforce "no
CSS reachable from `./cli`." See Finding 1 for the concrete repro: a one-line dynamic
`import()` inside an already-reachable file passes the test with zero findings *and* the tsup
build succeeds, shipping a real `dist/cli/index.css` (9.48 KB, with fonts) next to
`dist/cli/index.js`. This is exactly the failure mode the review brief names as
auto-Critical.

**What's broken — High.** FR-7's own Architecture section claims "a decorative green requires
deliberately defeating the type" — this is false. See Finding 2: the exported `verdictStyles`
object in `tokens.ts` is fully mutable at the type level (an explicit type annotation silently
widens away the `as const` protection), so `verdictStyles.skipped.slot = 'green'` type-checks
under this project's own strict `tsconfig.json` with zero errors — no assertion, no `any`, no
deliberate defeat of anything.

## Findings

| #   | Sev      | Finding | Resolution |
| --- | -------- | ------- | ---------- |
| 1   | CRITICAL | **The `./cli` clean-import-graph gate (FR-9, `test/cli-entry.test.ts`) can be silently defeated by a dynamic `import()`.** The specifier-matching regex is `/(?:from\|import)\s*['"]([^'"]+)['"]/g` — it requires the keyword to be followed (after optional whitespace) *immediately* by a quote character. Dynamic-import syntax `import('spec')` has a `(` in between, so it never matches; the walker silently treats such a file as having no further edges. **Repro (executed, then fully reverted):** added `export async function _probe() { return import('../styles.css'); }` to `packages/design/src/cli/status-line.ts` (already transitively reachable: `cli/index.ts` re-exports from `./status-line.js`). Result: (a) `pnpm --filter @provegate/design test test/cli-entry.test.ts` still reports **0** CSS/React/third-party findings and passes; (b) `pnpm --filter @provegate/design build` **succeeds** and emits a brand-new `dist/cli/index.css` (9.48 KB — the full fonts→colors→typography→spacing→effects chain, plus 8 copied woff2 files) sitting directly next to `dist/cli/index.js`. This is the literal scenario FR-9 exists to prevent: CSS reachable from, and now bundled into, the `./cli` entry of a package whose entire point is to stay importable by a zero-runtime-dependency, no-network CLI. (I also tried a dynamic `import('react')`, which the *build* happens to catch today — `react` isn't resolvable in this workspace so esbuild errors — but the *test* still reported it as clean, so that safety net is coincidental to what happens to be installed, not something FR-9's gate itself provides; the CSS case proves the gate has no real teeth against this class of import.) Verified reverted: `git diff` on the probed file is empty, package rebuilds with only `dist/{tokens,react/index,cli/index}.{js,d.ts}` (no stray `.css`), and `test/cli-entry.test.ts` is back to 2/2 passing. | unfixed — verdict blocks on this; straightforward fix is to also flag `import\s*\(` call expressions (and ideally re-run the walk against the actual **built** `dist/cli/index.js`'s `require`/`import` graph, or grep the build output for `.css`, rather than trusting a hand-rolled source-level regex) |
| 2   | HIGH     | **FR-7's "color law is typed" claim is false for `verdictStyles`.** `src/tokens.ts` declares `export const verdictStyles: Record<Verdict, VerdictStyle> = { ... } as const;`. The **explicit** `: Record<Verdict, VerdictStyle>` type annotation widens the assignment back to a plain mutable shape — TypeScript discards the `as const` narrowing whenever a wider explicit type is given, so the exported value's static type has ordinary mutable `glyph`/`slot` fields. **Repro (executed, then deleted):** `import { verdictStyles } from './src/tokens.js'; verdictStyles.skipped.slot = 'green';` compiles with **zero** `tsc` errors under this package's own `tsconfig.json` (`strict: true`). Control case, to confirm this isn't just "TS allows all mutation": the *same object literal* with **no** explicit annotation — `const x = {...} as const; x.skipped.slot = 'green';` — correctly produces `TS2540: Cannot assign to 'slot' because it is a read-only property.` So the fix is available (drop the redundant annotation, or wrap in `Readonly<...>`/`Readonly<Record<Verdict, Readonly<VerdictStyle>>>`) — it just isn't applied. Same gap in the *generated* `src/cli/theme.ts`: `verdictSlot`/`glyph` are declared `Record<Verdict, TermSlot>` with no `as const` at all. Scope note: the `Verdict` **string union** itself is correctly closed — a genuinely new 7th verdict literal does fail to type-check (`TS2322`/`TS2345`, verified) — only the "repaint an existing verdict's colour slot" half of FR-7's guarantee is unenforced. No live consumer exists yet (this PRD explicitly excludes consumer wiring), so nothing is broken *today*, but the stated mechanism that's supposed to prevent it going forward does not, and the PRD's own words ("requires deliberately defeating the type") are demonstrably inaccurate. | unfixed — recommend removing the explicit `Record<...>` annotations on `verdictStyles`/`verdictSlot`/`glyph` (or adding `Readonly<>` wrappers) so the emitted type is actually the const-asserted one, plus regenerating `emit.ts`'s template accordingly |
| 3   | LOW      | `assets/fonts/OFL.txt` is byte-identical to `@fontsource/ibm-plex-sans`'s `LICENSE` file only. The two `@fontsource` packages' `LICENSE` files are identical except for line 1 (the copyright preamble, which names the specific font files under that package) — the committed `OFL.txt` carries only the Sans preamble, omitting Mono's font-specific copyright notice, even though both families are vendored here. Not a functional defect, a minor OFL completeness nit. | unfixed — optional: append the Mono copyright line, or note both packages share the OFL body and one preamble suffices |

## Post-fix verification

Verdict is `fail` (Critical: 1), so no fixes have been applied — review only, per instructions.
Commands actually run during this review:

- `pnpm --filter @provegate/design build` / `pnpm --filter @provegate/design test` — 24/24
  passing on the shipped code (before and after each temporary probe, confirming clean start
  and clean revert)
- `pnpm --filter provegate test` — 461/461 (baseline confirmed)
- `pnpm check-types`, `pnpm lint`, `pnpm build` (root, all 4 workspace projects) — all clean
- `diff` of every non-generated `packages/design` source file against
  `docs/design/design_handoff_provegate/...` — byte-identical except intentional, in-scope
  edits (fonts.css self-hosting per FR-5, styles.css comment reword)
- `cmp` of all 8 vendored `.woff2` files against `node_modules/.pnpm/@fontsource+ibm-plex-{sans,mono}@5.3.0/.../files/*.woff2` — byte-identical
- `diff packages/provegate/src/core/run/cards.ts packages/design/src/cli/cards.ts` (function
  bodies only, header comment excluded) — byte-identical, zero diff output
- Independent WCAG contrast recomputation (temporary script, deleted before finishing) —
  cross-checked every ratio the test asserts against a from-scratch implementation of the
  standard relative-luminance formula
- **Finding 1 repro**: added a dynamic `import()` to `src/cli/status-line.ts`, ran
  `test/cli-entry.test.ts` (still green — the bug) and `pnpm --filter @provegate/design build`
  (produced `dist/cli/index.css` — the proof), then reverted with `git checkout --`, rebuilt,
  and re-ran both `test/cli-entry.test.ts` (2/2) and the full design suite (24/24) to confirm
  clean recovery
- **Finding 2 repro**: two isolated `tsc --noEmit` probes (temporary `.ts` files in
  `packages/design/`, deleted immediately after) — one importing the real `verdictStyles` and
  mutating `.slot` (zero errors), one with the same literal but no explicit annotation
  (correctly errors `TS2540`), plus two probes on the `Verdict` string union confirming it
  *is* closed (`TS2322`, `TS2345`)
- Manual byte-identity corruption of the gate itself, per the brief's attack surface 1: hand-edited a hex in the committed `src/tokens/colors.css` → `tokens.test.ts` correctly fails
  (2 tests); reverted, edited `src/tokens.ts` without regenerating → `tokens.test.ts` correctly
  fails again; reverted; hand-edited `src/cli/theme.ts` → correctly fails; reverted. The
  byte-identity gate itself (FR-3) has real teeth — unlike the import-graph gate.

`git status` at the end of this review shows only this review artifact as new/changed — every
temporary probe file and edit was deleted or reverted before finishing.
