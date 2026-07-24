# Independent Review: PRD-012 — React Component Layer (`@provegate/design/react`)

> **PRD:** PRD-012
> **Verdict:** pass
> **Reviewer:** Sonnet 5 (independent Phase 6 session)
> **Base SHA:** `f35561c4a1c9fdf2cf3301da85ff573066da0c10`
> **Critical:** 0
> **High:** 0
> **Medium:** 1
> **Quorum:** 1/1 pass (single independent reviewer)

## Summary

Reviewed `git diff f35561c..5bd6241` in full: all nine component `.tsx` files, the barrel,
`package.json`/`tsconfig.json`, and both new test files. Diffed every component's prop
interface against its `.d.ts.txt` contract line-by-line, cross-checked `HandoffCard` against
the landing README's authoritative structured-lines API, built the package and grepped the
built bundles (both `packages/design/dist/cli/index.js` and, one level further downstream,
`packages/provegate/dist/cli.js`) for any trace of React, and wrote three independent temporary
probes to adversarially test the three explicitly-named auto-critical categories rather than
trust the shipped suite's framing alone.

**React-free `./cli` (the load-bearing invariant) — confirmed clean, harder than asked.**
`grep -ci "react"` and `grep -ci "jsx"` on `packages/design/dist/cli/index.js` **and**
`packages/provegate/dist/cli.js` both return 0. `package.json` has no `dependencies` key at
all (only `peerDependencies`/`peerDependenciesMeta` with `optional: true`, plus devDependencies)
— so nothing makes React a runtime dependency of the published CLI at either layer. I then tried
to break it per the brief's suggestion ("a shared util imported by both entries"): added a
temporary `src/cli/_review-probe-shared.ts` that re-exports from `'react'`, imported it from
`cli/index.ts`, and reran the import-graph test — it failed immediately, correctly naming the
probe file as the source of the React edge. (This test was hardened during the PRD-010 review
cycle to classify `.css`/`react` specifiers by pattern before recursing into them, including
backtick-quoted dynamic imports — that fix is still in effect and still catches this class of
leak.) Reverted; confirmed clean again.

**Colour law — confirmed clean across all six verdict-taking surfaces, not just the three the
shipped suite checks directly.** `Button` never matches `--pg-(pass|green|accent)` in any of its
3 variants (shipped test, re-read and agree). `VerdictBadge` is green only for `passed` across
all 6 verdicts (shipped test). `EvidenceTable`'s exit cell is red only for `failed`, confirmed
`blocked`/`partial` are not (shipped test). I independently probed the three verdict-taking
surfaces the shipped `react.test.tsx` doesn't directly assert on: **`GateLine`**'s glyph color
is `--pg-term-green` only for `passed` (checked all 6); **`Admonition`**'s left-rule is
`--pg-pass` only for `type="pass"` and `--pg-fail` only for `type="fail"` (checked all 6 types);
**`HandoffCard`**'s per-row gate glyphs never leak `--pg-term-green` for a non-`passed` row (the
card's own header/footer rule is legitimately green for the `handoff` variant — that's the
card-level color, not a verdict leak, and is separate from each row's own glyph color). All
three passed on first correct attempt after I fixed a selector bug in my own probe (documented
below, not a product defect).

**Prop-contract fidelity — confirmed exact for all nine.** Read every `.d.ts.txt` and its
shipped `.tsx` counterpart side by side: every prop name and type matches exactly for `Icon`,
`Button`, `VerdictBadge`, `Admonition`, `CodeBlock`, `GateLine`, `HandoffCard`, `EvidenceTable`,
and `PhasePipeline`. `HandoffCard`'s API matches the landing README's authoritative
`{variant, title, width, lines[]}` shape exactly (`lines` = `string | {blank} | {gate,text} |
{arrow,text}`), and it does not call the CLI string builder (confirmed by reading the
implementation — it draws the box directly from `lines`).

**Everything else checked out clean:** zero hex literals anywhere in `src/react/**` (independent
`grep`); every `fontFamily` reference is exactly `var(--pg-font-sans)` or `var(--pg-font-mono)`
(independent `grep`), and both tokens genuinely exist in `tokens/typography.css` (not
referencing something undefined). `src/cli/**`, `src/tokens.ts`, `src/tokens/**`, and
`scripts/**` are byte-for-byte unchanged (empty diff). The DOM test environment is scoped via
per-file `// @vitest-environment jsdom` pragmas on exactly `props.test.tsx` and `react.test.tsx`
(15 tests); the other 27 (cli-entry, assets, cards, tokens) stay in the default node
environment — 42/42 total, deterministic. No `any` in `src/react/**`. Hygiene scan clean.

**What's not clean:** one real, empirically-verified behavioral gap in `PhasePipeline` — see
Finding 1. It does not touch the prop *signature* (not a dropped/renamed prop, so it isn't the
auto-critical "dropped prop contract" case) and has no security/data implication — a diagram
element simply never gets its active-highlight ring under one specific documented input. Medium,
not blocking.

## Findings

| #   | Sev    | Finding | Resolution |
| --- | ------ | ------- | ---------- |
| 1   | MEDIUM | **`PhasePipeline`'s `active` prop never highlights the Push node, contradicting its own `.d.ts.txt` doc comment** ("Highlight the active phase number (**or "push"**)."). The component's `showPush` branch calls `node({ n: '→', label: 'Push (you)', authority: 'human' }, false)` — the second argument (`isActive`) is **hard-coded `false`**, unconditionally, regardless of what `active` is set to. Even setting `active="→"` (the push node's actual `n` value) wouldn't help, since the call site never compares `active` against it at all. **Repro (executed, then deleted):** rendered `<PhasePipeline phases={[...]} active="push" showPush />` in a temporary jsdom test and queried for `[aria-current="step"]` — zero elements matched; the Push node's circle has no `aria-current` attribute under any input. Not caught by the shipped `props.test.tsx` test, which renders `active={1}` (a real phase number) and never exercises the Push-highlight path at all. | **fixed** — replaced the hardcoded `false` with `active === 'push' \|\| active === '→'` and added a `props.test.tsx` case asserting `active="push"` yields exactly one `[aria-current="step"]` on the Push node (design suite 43). |

No CRITICAL or HIGH findings. The three auto-critical categories named in the brief — a runtime
React dependency reaching the CLI bundle, a green colour-law leak, and a dropped prop contract —
were each tested past what the shipped suite alone establishes and found genuinely clean.

## Post-fix verification

**Post-review disposition (implementing session):** the one Medium (PhasePipeline
push-node highlight) was FIXED — `active === 'push' || active === '→'` replaces the
hardcoded `false`, plus a regression test asserting `active="push"` highlights
exactly the Push node. Design suite re-run: 43 (was 42), check-types/lint/build
clean. Verdict and counts unchanged (Critical: 0).

Commands actually run during the review:

- `pnpm --filter @provegate/design build` — clean; `dist/react/index.js` (21.46 KB) emitted
  alongside an unchanged `dist/cli/index.js` (3.38 KB, byte-size identical to pre-PRD-012)
- `pnpm --filter @provegate/design test` — 42/42 (matches stated baseline)
- `pnpm --filter provegate build` && `pnpm --filter provegate test` — clean, 481/481
- `pnpm check-types`, `pnpm lint`, `pnpm build` (root, all 4 workspace projects) — all clean
- `grep -ci "react"` / `grep -ci "jsx"` on `packages/design/dist/cli/index.js` and
  `packages/provegate/dist/cli.js` — 0 in all four checks
- `node -e "require('./packages/design/package.json').dependencies"` — `undefined` (no
  `dependencies` key at all)
- **React-reachable-from-`./cli` adversarial probe** (temporary files, deleted before
  finishing): added `src/cli/_review-probe-shared.ts` re-exporting from `'react'`, imported it
  from `cli/index.ts` — `test/cli-entry.test.ts`'s import-graph assertion failed immediately,
  correctly naming the probe file. Reverted (`git diff --stat` on the touched file was empty
  afterward); confirmed clean re-run (4/4 in that test file).
- **Colour-law independent probe** (temporary test file, deleted before finishing): rendered
  `GateLine` for all 6 statuses, `Admonition` for all 6 types, and `HandoffCard` in both
  variants with a non-`passed` row — confirmed green appears only where the law permits it.
  (My first attempt at the `HandoffCard` case had a selector bug — `querySelectorAll('div')`
  + `.find()` matched the outer card wrapper, whose text also contains the row's text, before
  the actual row `div`; fixed by taking the last/innermost match. Noting this so the false
  start isn't mistaken for a finding — the corrected probe passed.)
- **`active="push"` repro** (temporary test file, deleted before finishing): confirmed 0 elements
  carry `aria-current="step"` when `active="push"` is passed — Finding 1.
- `node dist/cli.js push` — exits 1, `No. Push is yours.`
- `node dist/cli.js check PRD-012` — passes its own gate

`git status` at the end of this review shows only this review artifact as new/changed — every
temporary probe file and edit was deleted or reverted before finishing.
