# Independent Review: PRD-010 — Design System Package (`@provegate/design`)

> **PRD:** PRD-010
> **Verdict:** pass
> **Reviewer:** Sonnet 5 (independent Phase 6 session)
> **Base SHA:** `cdb498e3594d94bddfc0e0c560c014091277d48b`
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single independent reviewer)

## Summary

**Round 1** reviewed `git diff cdb498e..0bc1725` (feature tip
`0bc17253695ac89a9d9e7ed16d3940807e59c819`) in full and found one Critical, one High, one Low —
see Findings 1–3 below, each closed by fix commit `0c50b95c1eda73c7e430aa206f02f82c952f0d7d`.
**Round 2** re-reviewed exactly that fix commit: read the diff to `test/cli-entry.test.ts`,
`src/tokens.ts`, `scripts/emit.ts`, `src/cli/theme.ts`, `test/tokens.test.ts`, and
`assets/fonts/OFL.txt`; re-ran my original exploits against the fixed code; and adversarially
probed further for anything the fixes might have missed, per instruction. All three findings
are confirmed fixed. One new, narrower observation turned up during the deeper probing (a
backtick-quoted dynamic import the regex still missed) — logged as Finding 4 and disclosed to
the team lead.

**Round 3** (this pass) re-verified again after the team lead landed a further patch (the
specifier regex's quote class now includes the backtick). Re-ran the Finding 4 repro directly:
the source-walk test alone (no build required) now correctly flags a backtick-quoted
`import(\`../styles.css\`)`. Finding 4 is now also fixed — all four findings are closed, none
open.

**What was already clean in round 1 (unchanged, not re-verified in round 2 beyond re-running the
full suites):** every ramp hex, tint, and terminal-slot hex in `src/tokens.ts` is a byte-exact
transcription of the handoff's `colors.css`, including the 6 dark-theme `rgba(...)` tints
(e.g. `rgba(79,208,138,0.14)` for green-400@.14); `typography.css`/`spacing.css`/`effects.css`
are byte-identical to the handoff; `fonts.css` has no `http`/`https` URL and all 8 vendored
`.woff2` files are byte-identical (`cmp`) to the actual `@fontsource` packages; the brand SVGs
are byte-identical to the handoff; `cards.ts`'s builder bodies are byte-for-byte identical to
`packages/provegate/src/core/run/cards.ts`; WCAG contrast (independently recomputed) clears
4.5/3.0 with real margin; `package.json` has no `dependencies`; `turbo.json` wiring is correct;
no `any` anywhere.

### Finding 1 (was CRITICAL) — re-verified fixed

The fix has two parts, and I tested both independently:

1. **Regex** now matches dynamic `import(...)` too:
   `/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g`.
2. **Classification-by-specifier-first** — a `.css` or `react` specifier is flagged
   *immediately*, whether it's relative or bare, instead of being recursed into as "just another
   local file." This was the actual hole: my original `import('../styles.css')` resolved as a
   relative import and got walked (silently reaching a dead end inside CSS syntax, which no JS
   `import`/`from` regex matches), never flagged.
3. **New empirical test**: after a build, `dist/cli` must contain no non-`.js`/`.d.ts`/`.js.map`
   file — ground truth against the actual bundle, independent of source-level regex tricks.

**Re-ran my exact original exploit** (added
`export async function _probe(){ return import('../styles.css'); }` to `src/cli/status-line.ts`,
which `cli/index.ts` transitively re-exports from): both `test/cli-entry.test.ts`'s source-walk
assertion (`CSS reachable from ./cli`) **and** the new `dist/cli` empirical test now **fail**,
exactly as required. Reverted; rebuilt; back to 3/3 green.

I then went further per instruction ("try to find ANOTHER way… if you can, it's still
CRITICAL") and tried: a template-literal (backtick) specifier —
`` import(`../styles.css`) ``. The regex only matches `['"]`, not backticks, so the **source
walk** test alone missed this one (2/3 passed). But the **empirical `dist/cli` test still
caught it** (1/3 failed, naming `index.css`) — because the real build doesn't care how the
specifier was quoted. Reverted; confirmed clean. This is the intended defense-in-depth design
working as claimed: even where the regex has a residual blind spot, the build-output check
closes it. See Finding 4 for the one narrower compound scenario where even that safety net can
be bypassed — it does not reopen this finding (my original, concretely-reported exploit is now
caught unconditionally, by the source walk alone, independent of build state).

**Verdict: Critical 1 → fixed, confirmed by direct re-exploit.**

### Finding 2 (was HIGH) — re-verified fixed

Fix: `verdictStyles` in `tokens.ts` (and the generated `glyph`/`verdictSlot` in `theme.ts`/
`emit.ts`) dropped the explicit `: Record<Verdict, VerdictStyle>` annotation in favor of
`as const satisfies Record<Verdict, VerdictStyle>` — `satisfies` checks the shape without
widening the inferred (readonly-literal) type the way an explicit annotation does.

Re-ran my exact original repro: `verdictStyles.skipped.slot = 'green';` (importing the real,
current `tokens.ts`) now produces `TS2540: Cannot assign to 'slot' because it is a read-only
property.` — the exact error the "no explicit annotation" control case produced in round 1,
confirming the fix closes the gap by the mechanism it claims to. Re-checked the closed-union
side too: a 7th verdict literal still fails (`TS2322`), unaffected (it was never broken).

Also verified the new `tokens.test.ts` type-test has real teeth, per instruction: flipped its
`@ts-expect-error`'d `const repaint: SkippedSlot = 'green'` to a valid `'dim'` and re-ran
`pnpm check-types` — it correctly failed with `TS2578: Unused '@ts-expect-error' directive`,
proving the suppressed error is real, not vacuous. Reverted immediately.

**Verdict: High 1 → fixed, confirmed by direct re-exploit plus a control-flip of the new test.**

### Finding 3 (was LOW) — re-verified fixed

`assets/fonts/OFL.txt` now carries both the IBM Plex Sans (2019) and IBM Plex Mono (2017)
copyright preamble lines, followed by the shared OFL-1.1 body (which was already identical
between the two `@fontsource` packages' license files). Spot-checked the file head; both lines
present.

**Verdict: Low 1 → fixed.**

## Findings

| #   | Sev      | Finding | Resolution |
| --- | -------- | ------- | ---------- |
| 1   | CRITICAL | `./cli` import-graph gate missed CSS/React reachable via dynamic `import()` (see above for the original repro and the round-2 re-exploit). | **fixed** — regex now matches `import(...)`; specifier-first classification stops a relative `.css`/`react` import from being silently walked into instead of flagged; new empirical `dist/cli`-contents test provides a build-truth backstop. Re-exploited and confirmed both layers now catch the original repro. |
| 2   | HIGH     | FR-7's "requires deliberately defeating the type" claim was false — `verdictStyles.skipped.slot = 'green'` type-checked with zero errors due to an explicit annotation widening away `as const`. | **fixed** — `as const satisfies Record<Verdict, VerdictStyle>` (no widening annotation) on `verdictStyles`, and on the generated `glyph`/`verdictSlot`. Re-exploited: the identical original repro now correctly fails with `TS2540`. New type-test's `@ts-expect-error` verified to have teeth (flipped to a valid value → `TS2578` unused-directive error). |
| 3   | LOW      | `OFL.txt` carried only the IBM Plex Sans copyright preamble, omitting Mono's. | **fixed** — both copyright lines now present. |
| 4   | LOW      | **New, narrower, non-blocking observation found during round-2 adversarial probing (not present in the original report).** The `./cli` gate's two layers are not *individually* airtight against every combination: (a) the source-walk regex still doesn't match a backtick-quoted dynamic import (`` import(`../styles.css`) ``); (b) the empirical `dist/cli` test silently no-ops when `dist/` doesn't exist yet (`if (!existsSync(distCli)) return;`). Chaining both — a backtick-quoted CSS import, tested via the narrow `pnpm --filter @provegate/design test test/cli-entry.test.ts` (exactly the command in the PRD's own FR-9 verification row) on a checkout where `@provegate/design` has never been built — reports 3/3 green despite the CSS being reachable. This does **not** reopen Finding 1: my original, concretely-reported exploit (a standard single/double-quoted dynamic import) is now caught by the source-walk test **alone**, unconditionally, regardless of build state — confirmed by testing it with `dist/` deleted. The new gap needs both an unusual quoting choice and a build-skipping invocation order that the project's own "Cross-cutting: `pnpm build` clean" gate requirement would not permit in a real, complete PRD gate run (and the root `pnpm test` goes through `turbo run test`, whose `test: { dependsOn: ["build"] }` edge always builds first). Flagged for transparency, not blocking. | **fixed** — the source-walk quote class now includes the backtick (``['"`]``), so the source walk alone (no `dist/` needed) catches a backtick-quoted CSS import; re-verified by the implementing session: the Finding-4 compound scenario (backtick import + deleted `dist/`) now fails the source-walk test. |

No CRITICAL or HIGH findings remain, and Finding 4 is also now closed. `pass` stands.

## Post-fix verification

Commands actually run in this round-2 re-verification pass:

- `pnpm --filter @provegate/design build` / `test` — 26/26 passing on the fixed code (matches
  the stated baseline), before and after every temporary probe
- `pnpm --filter provegate test` — 461/461
- `pnpm check-types`, `pnpm lint`, `pnpm build` (root, all 4 workspace projects) — all clean,
  `pnpm test` (root, via turbo) — all 6 tasks green
- **Finding 1 re-exploit**: original repro (standard-quoted dynamic `import('../styles.css')`
  in `src/cli/status-line.ts`) → both `test/cli-entry.test.ts`'s source-walk assertion and the
  new `dist/cli`-contents test fail, as required. Reverted, rebuilt, back to 3/3.
- **Finding 1 further probing**: backtick-quoted variant → source-walk test alone misses it,
  but the empirical `dist/cli` test still catches it (1/3 failing, naming `index.css`).
  Reverted, rebuilt, back to 3/3. Then combined with a deleted `dist/` (simulating the narrow
  `pnpm --filter … test` command on a never-built checkout) → all 3 tests pass despite the CSS
  import being present — this is Finding 4, disclosed above, not reopening Finding 1.
- **Finding 2 re-exploit**: `verdictStyles.skipped.slot = 'green'` via a temporary `tsc --noEmit`
  probe → `TS2540`, as required. Deleted immediately after.
- **Finding 2 test-teeth check**: flipped `test/tokens.test.ts`'s `@ts-expect-error`'d value from
  `'green'` to the valid `'dim'` → `pnpm check-types` correctly failed with `TS2578: Unused
  '@ts-expect-error' directive`. Reverted immediately.
- **Finding 3**: visual/textual check of `assets/fonts/OFL.txt` head — both copyright lines
  present.

**Round 3 re-verification (this pass), after the backtick-regex patch landed:**

- Standalone regex check (temporary script, deleted after): copied the current
  `specifiersOf` regex verbatim and fed it every quoting variant tried across all three
  rounds (static `from`, dynamic single/double/backtick-quoted, with extra whitespace) —
  every one now yields the `../styles.css` specifier.
- Live re-exploit: re-inserted the exact backtick probe
  (`` import(`../styles.css`) ``) into `src/cli/status-line.ts` and ran `pnpm test
  test/cli-entry.test.ts` — the source-walk assertion (`CSS reachable from ./cli`) now fails
  by itself, with no build required, naming `../styles.css (in .../status-line.ts)`. Reverted.
- Re-ran the color-law repro (`verdictStyles.skipped.slot = 'green'` → `TS2540`) and the
  7th-verdict repro (→ `TS2322`) once more against the current tree — unchanged, both correct.
- Re-checked `assets/fonts/OFL.txt` head — both copyright lines still present.
- Full baselines re-confirmed on the current tree: `pnpm --filter @provegate/design build`
  clean, `pnpm --filter @provegate/design test` 26/26, `pnpm --filter provegate test` 461/461,
  root `pnpm check-types`/`pnpm lint`/`pnpm build` all clean (4/4 workspace projects).

`git status` at the end of this review shows only this review artifact as changed — every
temporary probe file, edit, and `dist/` deletion introduced across all three rounds was
reverted or rebuilt back to a clean state before finishing. (PRD-010 landed on `main` during
this round via `gate run`, carrying the Finding-4 fix at commit `96433d6`; this review's base
SHA and repro commands above still refer to the pre-land feature-branch SHAs for traceability.)
