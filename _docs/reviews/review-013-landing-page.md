# Independent Review: PRD-013 — Landing Page (`apps/web`)

> **PRD:** PRD-013
> **Verdict:** fail
> **Reviewer:** Sonnet 5 (independent Phase 6 session)
> **Base SHA:** `d9506fcbf1e5b4e7c189682fbd83722074095eb8`
> **Critical:** 1
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single independent reviewer)

## Summary

Reviewed `git diff d9506fc..5562327` in full: `layout.tsx`, `page.tsx`, `sections/index.tsx`
(all 12 sections), `sections/content.ts`, `sections/reveal.tsx`, `globals.css`,
`scripts/check-static-egress.mjs`, and all three test files. Built the app
(`pnpm --filter web build`), ran the real egress scanner against the real build output, and
then adversarially probed it by injecting realistic-shaped violations directly into the built
`.next` output to test whether it would actually catch them — per the empirical-gate
instruction, not trusting the scanner's own header comment's claim of coverage.

**Copy discipline, no fictional CLI surface, colour law, token-only styling — all confirmed
clean, checked against the actual built output, not just source or jsdom renders.** Grepped the
real built HTML/JS for `gate.toml`/`gate ledger` (none), `PROVEN`/`VIOLATED` (none), a fabricated
version/download/star pattern (none). The three proof stats in `content.ts` are verbatim against
the design brief (`22.58%`, `80+ agents`... `unanimously endorsed an OpenSSL padding-oracle
vulnerability that does not exist... One executed test killed it`, and the METR
`24%/20%/19%` figures) — the `content-web.test.ts` banned-vocabulary regex
(`/\d+%\s*faster\b/i`, `/\d+%\s*fewer\b/i`) correctly distinguishes the approved METR citation
(which never uses the words "faster"/"fewer") from a banned marketing claim. `CommandRef`
renders the real ten commands plus `push` (rendered separately, human-blue, "the one it refuses"
— matches the CLI's own treatment, not a fabrication). Every design primitive (`Button`,
`CodeBlock`, `EvidenceTable`, `GateLine`, `HandoffCard`, `Icon`, `PhasePipeline`, `VerdictBadge`)
is imported from `@provegate/design/react`; none is reimplemented in `apps/web`. `Proof()`
renders the proof stat and the `LIMITS` list in the same component — adjacency confirmed by
reading the JSX, not just by the test's string-matching. Reduced-motion handling in `globals.css`
is correct: the `no-preference` branch adds the transition, the `reduce` branch forces
`opacity: 1; transform: none; transition: none`; `overflow-x: hidden` on `body`; a
`:focus-visible` ring wired to `box-shadow: var(--pg-ring)` — I initially suspected this was a
typo for `--pg-focus-ring` (a serious a11y regression, since that would resolve to nothing) but
verified `--pg-ring` is itself a real, separate, pre-composed box-shadow-value token defined in
`packages/design/src/tokens/effects.css` (`0 0 0 3px color-mix(...)`) built on top of
`--pg-focus-ring` — correct usage, not a bug. I want to flag this near-miss explicitly since it's
exactly the kind of thing that looks wrong on a first read; a second check against the actual
token source clears it. Grepped every hex match found across the entire built output (3 files) —
all three trace to Next.js's own framework-generated error pages (`--next-error-*`, not authored
by this PRD) or the design package's own generated `colors.css` (legitimately hex at its root
definition, bundled in wholesale) — neither is an `apps/web`-authored violation.

**What's broken: `scripts/check-static-egress.mjs` (FR-7) does not actually detect a real
third-party fetch unless it happens to match one of nine hardcoded hostnames or uses CSS
`url()`/`@import` syntax.** See Finding 1. I proved this is not a theoretical concern by
injecting two realistic-shaped violations directly into the real built output and re-running the
real scanner — both were reported "clean." The stated acceptance criterion is "A build-output
scan finds no external origin" (not "no origin from a nine-item allowlist of known offenders"),
and the header comment's own claim ("What it flags... any reference to a known font-CDN or
analytics host, anywhere in the build") undersells the gap: the scanner's *general* URL check
(not tied to the denylist) only fires inside `.css` files. A `<script src="https://...">`, a
`<link rel="preconnect" href="https://...">`, or a JS `fetch(...)`/`XMLHttpRequest` call to any
host not on the nine-item list is invisible to it, in any file type, current build or future.

## Findings

| #   | Sev      | Finding | Resolution |
| --- | -------- | ------- | ---------- |
| 1   | CRITICAL | **`check-static-egress.mjs`'s "no external origin" gate has a broad, unacknowledged blind spot: any third-party URL that isn't one of 9 specific hardcoded hostnames, and isn't expressed as CSS `url()`/`@import`, is completely invisible to it — in any file, including the real, static, already-built HTML/JS.** The script's own header comment states a narrower, honestly-scoped blind spot ("a URL assembled at RUNTIME... cannot be seen by a static scan") — this finding is a *different, larger* gap: a plainly-present, non-runtime-assembled, static URL is *also* missed, as long as it's outside the denylist and outside CSS syntax. **Repro 1 (executed, then reverted):** built the app (`pnpm --filter web build`), appended `` fetch('https://example-not-in-denylist.io/collect?x=1') `` as a literal string to a real file in the built output (`apps/web/.next/required-server-files.js`), and re-ran `node scripts/check-static-egress.mjs` — it printed `[egress] clean` and exited 0. **Repro 2 (executed, then reverted):** injected `<link rel="preconnect" href="https://a-font-cdn-not-on-the-denylist.example.com"><script src="https://widgets.some-random-service.com/embed.js"></script>` directly before `</head>` in the real built `apps/web/.next/server/app/index.html`, re-ran the scanner — again `[egress] clean`, exit 0. Both are exactly the shape a real, accidental regression would take (a hardcoded `<script src>` for a chat widget or analytics snippet, a `<link rel=preconnect>` for a font host, an npm package's own telemetry `fetch()` bundled into a JS chunk) — not a contrived edge case. The *current* build is genuinely clean (verified: baseline scan before and after each probe reports clean with the probe removed), so nothing is live-broken today, but the FR-7 deliverable — the mechanism meant to make the no-telemetry principle "observable, not just asserted" (User Story 2) — does not actually make that observation for the large majority of possible third-party fetch shapes. | **fixed** — the scanner was rewritten from a denylist+CSS model to a **fetch-shape** detector: it flags an external-origin URL in any fetch context — HTML `<script src>` / `<link href>` / media `src|data`; CSS `url()` / `@import`; JS `fetch()`/`sendBeacon()`/`WebSocket()`/`EventSource()`/`importScripts()`/`XMLHttpRequest.open()` and `.src=`/`.href=` assignments; plus embedded HTML shapes in RSC payloads. "External" = any `https?://host` (or protocol-relative `//host`) whose host isn't our own origin, so framework doc-URL strings (never in a fetch shape) are correctly ignored. **Both reviewer repros now fail the scanner** (verified: the `fetch('https://example…')` injection → exit 1; the `<link preconnect>` + `<script src>` injection → both hosts flagged), the clean build still passes. |

No other findings. The three other explicitly-named auto-critical categories — the fictional CLI
surface reaching the page, a fabricated metric, and a raw hex — were each checked against the
real built output (not just source or a jsdom render) and found genuinely clean.

## Post-fix verification

No fixes were applied — review only, per instructions. Commands actually run:

- `pnpm --filter web build` — clean
- `pnpm --filter web test` — 16/16 (matches stated baseline)
- `pnpm --filter @provegate/design test` — 43/43 (matches stated baseline, includes the
  PhasePipeline fix landed since PRD-012's review)
- `pnpm --filter provegate test` — 481/481
- `pnpm check-types`, `pnpm lint` (root, all workspace projects) — clean
- `node scripts/check-static-egress.mjs` — clean on the real, unmodified build
- **Finding 1, repro 1** (temporary edit to a file under `.next`, a build artifact, reverted with
  a byte-for-byte `diff` check afterward): injected a non-denylisted `fetch()` URL into
  `apps/web/.next/required-server-files.js` — scanner still reported clean. Reverted; re-ran
  clean.
- **Finding 1, repro 2** (temporary edit to `apps/web/.next/server/app/index.html`, reverted with
  a byte-for-byte `diff` check afterward): injected a `<link rel=preconnect>` + `<script src>` to
  two different non-denylisted hosts directly before `</head>` — scanner still reported clean.
  Reverted; re-ran clean.
- `grep`-based verification of the built output (not just source) for: `gate.toml`/`gate ledger`
  (none), `PROVEN`/`VIOLATED` (none), fabricated version/download/star patterns (none), raw hex
  (3 matches found, all traced to Next.js's own framework error-page boilerplate or the design
  package's own bundled token definitions — neither authored by this PRD)
- `node dist/cli.js push` — exits 1, `No. Push is yours.`
- `node dist/cli.js check PRD-013` — passes its own gate
- Hygiene scan (`emofy`/`rayvaz` in `apps/web/app`) — clean
- `_state/prds.json` and `apps/web/next-env.d.ts` picked up incidental changes from running
  builds/checks locally and were reverted with `git checkout --`

`git status` at the end of this review shows only this review artifact as new/changed.
