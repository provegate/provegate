# Independent Review: PRD-013 — Landing Page (`apps/web`)

> **PRD:** PRD-013
> **Verdict:** pass
> **Reviewer:** Sonnet 5 (independent Phase 6 session)
> **Base SHA:** `d9506fcbf1e5b4e7c189682fbd83722074095eb8`
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single independent reviewer)

## Summary

**Round 1** reviewed `git diff d9506fc..5562327` in full and found one Critical (the egress
scanner's denylist+CSS model missing a broad class of real third-party fetches), marked `fail`.
**Round 2** re-reviewed fix commit `6f2c10d`: re-ran both original repros against the new
fetch-shape-detecting scanner — both were caught — but, per the explicit instruction to keep
trying to beat the new model, found **two further fetch shapes that still slipped through** (a
`wss://` WebSocket URL, and any template-literal/backtick-quoted URL in the JS patterns). Kept
`fail`. **Round 3** (this pass) re-reviewed fix commit `484f476` (`git diff 6f2c10d..484f476`,
scanner only): re-ran round 2's exact two bypasses — both now caught — then tried **12 further
adversarial shapes** (plain `ws://`, mixed-case `WSS://`, backtick-quoted URLs inside
`sendBeacon`/`importScripts`/`EventSource`/XHR-`.open()`, a mixed-quote XHR call, an unquoted
external CSS `url()`) to see if anything else slips past. **Everything is now caught** except the
one thing that's supposed to be missed (string-concatenation, the scanner's own honestly-declared
blind spot, re-confirmed still correctly un-flagged). Verdict → `pass`, Critical → 0.

Read every changed file in all three rounds in full. Built the app
(`pnpm --filter web build`), ran the real egress scanner against the real build output, and
adversarially probed it by injecting realistic-shaped violations directly into the built
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

**All three rounds' findings are now closed.** Round 1's fix replaced the denylist+CSS-only model
with a fetch-shape detector. Round 2 found the scheme alternation didn't accept `wss:`/`ws:` and
the JS quote-match didn't accept backticks. Round 3's fix widened `URL_RE`/`isExternal`'s scheme
alternation from `(?:https?:)?` to `(?:[a-z][a-z0-9+.-]*:)?` (any scheme, still requiring `//`,
so `data:`/`mailto:`/`blob:` without `//` correctly stay unflagged) and widened every JS
quote-match from `["']` to include a backtick. I re-ran round 2's exact three bypasses
(`wss://` WebSocket, backtick `fetch`, backtick `.src=`) — all three now fail the scanner,
naming the host. I then tried 12 more shapes looking for anything still uncovered: plain `ws://`,
mixed-case `WSS://`, backtick-quoted URLs inside `sendBeacon`/`importScripts`/`EventSource`/XHR
`.open()`, a mixed-quote XHR call (`'GET', \`https://...\``), and an unquoted external CSS
`url()`. **Every one is now caught.** The only case that still passes clean is
string-concatenation (`fetch('https://' + host + '/x')`) — which is correct: that's the
scanner's own honestly-declared, accepted blind spot ("a URL assembled at RUNTIME... cannot be
seen"), not a defect, and it isn't in scope per the instruction.

## Findings

| #   | Sev      | Finding | Resolution |
| --- | -------- | ------- | ---------- |
| 1   | CRITICAL | `check-static-egress.mjs`'s "no external origin" gate missed real third-party fetch shapes across three successive tightenings: round 1 (denylist+CSS-only — a plain `fetch()`/`<script src>`/`<link href>` to any non-denylisted host was invisible), round 2 (`wss://` scheme and backtick-quoted URLs still invisible after the round-1 fix). | **fixed** — `URL_RE`/`isExternal` now accept any URL scheme (not just `http(s):`), and every JS quote-match accepts backticks alongside `'`/`"`. Re-exploited: round 2's three exact bypasses (`wss://` WebSocket, backtick `fetch`, backtick `.src=`) now all fail the scanner correctly. Pushed further with 12 more adversarial shapes (plain `ws://`, mixed-case `WSS://`, backtick inside `sendBeacon`/`importScripts`/`EventSource`/XHR `.open()`, a mixed-quote XHR call, an unquoted external CSS `url()`) — all caught. Only the scanner's own declared, accepted blind spot (runtime string-concatenation) still passes clean, correctly. |

No other findings. The three other explicitly-named auto-critical categories — the fictional CLI
surface reaching the page, a fabricated metric, and a raw hex — were each checked against the
real built output (not just source or a jsdom render) and found genuinely clean in round 1,
unaffected by the scanner-only changes in rounds 2 and 3.

## Post-fix verification

**Round 1** (no fixes existed yet — review only):

- `pnpm --filter web build` — clean
- `pnpm --filter web test` — 16/16
- `node scripts/check-static-egress.mjs` — clean on the real, unmodified build
- Finding 1's two original repros (temporary edits to files under `.next`, build artifacts,
  reverted with a byte-for-byte `diff` check after each): a non-denylisted `fetch()` URL in a
  real built `.js` file, and a `<link rel=preconnect>` + `<script src>` pair in the real built
  `index.html` — both reported clean, i.e. the gate missed them.
- `grep`-based verification of the built output (not just source) for `gate.toml`/`gate ledger`,
  `PROVEN`/`VIOLATED`, fabricated version/download/star patterns, raw hex — all clean or
  correctly attributed to framework/vendor boilerplate.
- `node dist/cli.js push`/`check PRD-013` — as expected. Hygiene scan clean.

**Round 2** (re-verification of fix commit `6f2c10d`):

- `pnpm --filter web build` — clean; `node scripts/check-static-egress.mjs` — clean on the honest
  rebuilt output
- **Repro 1 re-run** (temporary edit to `apps/web/.next/required-server-files.js`, reverted with
  a byte-for-byte `diff` check): the identical `fetch('https://example-not-in-denylist.io/...')`
  injection now correctly fails the scanner (exit 1, host named).
- **Repro 2 re-run** (temporary edit to `apps/web/.next/server/app/index.html`, reverted with a
  byte-for-byte `diff` check): the identical `<link preconnect>` + `<script src>` injection now
  correctly fails, both hosts named.
- **New adversarial round** (temporary edits to the same `.js` file, each isolated and reverted
  individually with a `diff` check): tried 10 further shapes. 8 caught (protocol-relative
  `<script src>`, protocol-relative embedded `<img>` string, `sendBeacon`, `.src=`/`.href=`
  assignment, `EventSource`, XHR `.open()` with a protocol-relative URL, and string concatenation
  correctly *not* caught as the accepted blind spot). 2 not caught — isolated and reproduced
  individually: `new WebSocket('wss://...')` (clean, exit 0) and two separate template-literal
  cases, `` fetch(`https://...`) `` and `` el.src = `https://...` `` (both clean, exit 0). These
  are Finding 1's still-open remainder.
- `pnpm --filter web test` — 16/16; `pnpm --filter @provegate/design test` — 43/43 (includes the
  PhasePipeline fix landed since PRD-012's review); `pnpm --filter provegate test` — 481/481;
  `pnpm check-types`, `pnpm lint`, `pnpm build` (root, all workspace projects) — all clean
- `_state/prds.json` and `apps/web/next-env.d.ts` picked up incidental changes from running
  builds/checks locally in both rounds and were reverted with `git checkout --` each time

**Round 3** (re-verification of fix commit `484f476`):

- `pnpm --filter web build` — clean; `node scripts/check-static-egress.mjs` — clean on the honest
  rebuilt output
- **Round 2's three bypasses, re-run verbatim** (temporary edits to
  `apps/web/.next/required-server-files.js`, each isolated and reverted individually with a
  byte-for-byte `diff` check): `new WebSocket('wss://evil-websocket.example.com/socket')` → now
  exit 1, host named. `` fetch(`https://evil-template-literal.example.com/collect`) `` → now
  exit 1. `` img.src = `https://evil-template-src.example.com/pixel.gif` `` → now exit 1. All
  three fixed.
- **12 further adversarial shapes tried** (same temp-edit-and-revert method): plain
  `ws://evil-plain-ws.example.com` → caught; backtick `` sendBeacon(`https://...`) `` → caught;
  backtick `` importScripts(`https://...`) `` → caught; backtick-both-args
  `` xhr.open(`GET`, `https://...`) `` → caught; mixed-quote
  `xhr.open('GET', \`https://...\`)` → caught; mixed-case `new WebSocket('WSS://...')` → caught;
  backtick `` new EventSource(`https://...`) `` → caught; an unquoted external CSS
  `url(https://evil-css-plain.example.com/bg.png)` → caught. String-concatenation
  (`fetch('https://' + host + '/x')`) re-confirmed still correctly *not* caught (the accepted,
  declared blind spot — not a regression).
- `pnpm --filter web test` — 16/16; `pnpm --filter @provegate/design test` — 43/43;
  `pnpm --filter provegate test` — 481/481; `pnpm check-types`, `pnpm lint`, `pnpm build` (root,
  all workspace projects) — all clean
- `_state/prds.json` again picked up an incidental timestamp change from local builds/checks and
  was reverted with `git checkout --`; `_tasks/wip/tasks-013-landing-page.md` carries the team
  lead's own in-flight ledger entry for this round, left untouched (not this review's to revert)

`git status` at the end of this review shows only this review artifact as new/changed (aside from
the team lead's own in-flight task-ledger edit, noted above, which this review did not make and
did not revert). All temporary probe edits across all three rounds (always to build artifacts
under `.next`, never to tracked source) were reverted and verified byte-identical to their
pre-probe state before finishing.
