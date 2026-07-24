# Independent Review: PRD-011 — CLI Design Adoption

> **PRD:** PRD-011
> **Verdict:** pass
> **Reviewer:** Sonnet 5 (independent Phase 6 session)
> **Base SHA:** `b417972429601a6ed22358159e11fc5876f94d25`
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single independent reviewer)

## Summary

**Round 1** reviewed the feature commit `d4a76bb` (the unrelated `445762b` PRD-012 draft edit
on the branch tip was out of scope) against `main` tip `b417972`, found 0 Critical / 2 High /
1 Medium, and marked it `fail` — not because any of the three explicitly-named auto-critical
categories were violated (they weren't), but because two Functional Requirements with their own
named acceptance criteria were substantially unbuilt, plus one explicit DO-NOT boundary was
crossed. **Round 2** (this pass) re-reviewed fix commit `d2af65b`, re-ran the exact repros from
round 1 against the fixed code, and re-verified the clean areas. All three findings are
confirmed fixed by direct re-exploit, not just re-reading the diff.

Read every changed file in both rounds in full, cross-referenced the PRD's own cited specimen
(`docs/design/design_handoff_provegate/reference/cli-static-specimens.dc.html`), and built +
ran the actual CLI to empirically verify every attack surface in the brief rather than trusting
the shipped tests' framing.

**None of the three explicitly-named auto-critical categories are violated** — verified hard:

- **Zero runtime deps (FR-1):** `package.json`'s `dependencies` key is absent entirely
  (not just empty). `dist/cli.js` and `dist/index.js` contain **zero** occurrences of the
  string `@provegate/design` (`grep -c` on the built files, not just the two `from`/`require`
  patterns `pack.test.ts` checks). `npm pack --dry-run` produces the expected 42-file tarball.
  Nothing makes design a runtime dependency.
- **Card byte-identity (FR-4):** traced `colorCard`'s chained `.replace()` calls exhaustively —
  each targets an independent character class, `paint()` only wraps a substring in escape
  codes and never touches surrounding text, and the `NO_COLOR`/non-TTY path returns the
  builder's string completely untouched before any replace runs. I could not construct a case
  (embedded glyph in a warning, a `READY TO PUSH` substring in an unrelated line) that changes
  the *underlying* text — worst case is a cosmetic mis-coloring of an incidental character,
  never a text corruption, confirmed by direct comparison of `cards.ts` (design's copy) against
  `packages/provegate/src/core/run/cards.ts`'s pre-adoption content (now a pure re-export,
  unchanged text).
- **NO_COLOR/strip-identity (FR-9):** the shipped `no-color.test.ts` only ever sees `colorTier`
  resolve to `'none'` (piped stdout in a spawned test has no real TTY), so the strip-identity
  property is exercised only at the `paint()` unit level, never through a real colored CLI run —
  exactly the gap the brief flagged. I closed that gap myself: wrote a bootstrap script that
  forces `process.stdout.isTTY = true` + `COLORTERM=truecolor` *before* importing `dist/cli.js`,
  producing **genuine** ANSI escapes (confirmed present, e.g. `38;2;79;208;138` = proof-green on
  a real `PASS` readiness verdict, `38;2;99;182;194` = plan-cyan on a real `--dry-run` header),
  and diffed the stripped output against a separate `NO_COLOR=1` run for `status` (with an
  actual readiness verdict present), `queue`, `run --dry-run`, the `gate open` overlap refusal,
  and `push`. All five are byte-identical once stripped. No escape leak anywhere.

**Round 1 findings, all re-verified fixed in round 2:**

### Finding 1 (was HIGH, FR-6) — re-verified fixed

Fix: a new additive `BlockerLease { prd, agent, phase, expiresAt, stale }` and a `blockers:
BlockerLease[]` field on `ClaimResult` (`open.ts`), populated in both refusal branches (valid-
and stale-blocker), exported through `core/run/index.ts`. `cli.ts`'s refusal now prints
`    lease held by <agent> · <phase> · <ttl>` per blocker, with the TTL rendered via the
existing `formatLeaseRemaining` (stale ones painted stale-amber), and the resolve hint now only
mentions `--steal` when a blocker is actually stale (a genuine improvement over the round-1
text, which advertised `--steal` unconditionally even when no blocker could ever be stolen).

**Re-ran my exact original repro**: built a two-PRD workspace, claimed `PRD-001` over
`src/auth/**` as `agent-2`, then ran `gate open PRD-002` over an overlapping path. Actual
output now: `[open] REFUSED — PRD-002 not claimed:` / `  ✗ surface overlap with PRD-001: ...`
/ `    lease held by agent-2 · Phase 2b · 12h 0m left` / `  → resolve: narrow PRD-002's Conflict
Surface`. The agent, phase, and remaining TTL are present — the exact three fields User Story 2
required and the original repro showed missing. `existing.conflicts`/`.issues` are untouched
(additive-only, confirmed by reading the diff); `open.test.ts` gained a direct engine-level
assertion (`result.blockers` shape + a non-expired `expiresAt`).

### Finding 2 (was HIGH, FR-8) — re-verified fixed, with one flagged judgment call

Fix: `usage()` rebuilt with a wordmark + tagline and a right-aligned version
(`ProveGate · prove it, then let it propagate.` ... `v0.1.0`), bare-uppercase `USAGE` /
`COMMANDS` / `OPTIONS` section headers, and the closing tagline retained.

**Re-ran `node dist/cli.js --help` directly** — confirmed the wordmark+version line, all three
uppercase headers, and the closing line are present, matching the specimen's structure. Also
confirmed the output carries **zero** ANSI escapes under any condition (`usage()` never calls
`paint()` at all now), so FR-9's NO_COLOR/strip-identity guarantee holds trivially for `--help`
— nothing to strip, always identical.

**Deliberate, disclosed deviation**: command names are not painted green, where the specimen
mock shows them in green. The team's stated reasoning — PRD-010's own color law ("GREEN IS
EARNED... no decorative green, no green headings") would be violated by coloring a command name
in a listing, since a name being *available* is not "work that passed a machine check" — is
correct and is explicitly written into PRD-011's own DO-NOT list ("DO NOT color anything green
that did not pass a machine check or an operator verdict. No decorative green..."). I agree the
written law overrides the mock here; this is not a defect. Minor, non-blocking notes found
during re-verification (not raised as findings, since they're cosmetic and don't affect any
tested acceptance criterion): the `new`/`open` help lines dropped mention of the still-fully-
functional `--template=` flag and the `gate open PRD-XXX` example prefix; `push`'s line lost its
parentheses relative to the specimen's `(refused — push is yours)`. None of these affect
correctness or any acceptance criterion.

### Finding 3 (was MEDIUM) — re-verified fixed

`apps/docs/content/docs/cli.mdx` is reverted; `git diff main -- apps/docs/content/docs/cli.mdx`
is empty. The now-stale `gate status` example in that file (still showing the pre-adoption
one-line-per-record format) is intentionally left as-is, honoring the PRD's own DO-NOT — the
team recorded the drift as a follow-up in the task ledger's Deferrals for whoever next owns that
file's conflict surface.

## Findings

| #   | Sev  | Finding | Resolution |
| --- | ---- | ------- | ---------- |
| 1   | HIGH | `gate open` overlap refusal never named the lease holder's agent, phase, or TTL (FR-6 / User Story 2). | **fixed** — additive `ClaimResult.blockers: BlockerLease[]`; re-exploited the exact original repro, holder detail now present in the refusal. |
| 2   | HIGH | `--help` rebuild (FR-8) was largely unimplemented — missing wordmark+version, `USAGE`/`COMMANDS` headers. | **fixed** — wordmark+right-aligned version and uppercase section headers now present, verified directly; command-name coloring deliberately and correctly omitted per the color law (see above). |
| 3   | MEDIUM | `cli.mdx` edited despite the PRD's own DO-NOT/Out-of-Scope naming it, and outside the declared Conflict Surface. | **fixed** — edit reverted; `git diff main -- cli.mdx` empty; the doc drift recorded as a follow-up instead. |

No CRITICAL, HIGH, or MEDIUM findings remain. `pass` stands.

## Post-fix verification

**Round 1** (no fixes existed yet — review only):

- `pnpm --filter provegate build` — clean
- `pnpm --filter provegate test` — 479/479 (brief cited 478; off by one, not investigated —
  negligible, all green either way)
- `pnpm --filter @provegate/design test` — 26/26
- `pnpm check-types`, `pnpm lint`, `pnpm build` (root, all 4 workspace projects) — all clean
- `grep -rn "\x1b\[" packages/provegate/src --include="*.ts" | grep -v core/ui/theme.ts` — no
  matches (no stray escapes)
- `node dist/cli.js push` — exits 1, `No. Push is yours.` (never-push invariant)
- `node dist/cli.js check PRD-011` — passes its own gate
- `grep -c "@provegate/design" dist/cli.js` and `dist/index.js` — 0 in both (stronger than the
  shipped test's `from`/`require` pattern check)
- `npm pack --dry-run --json` — 42 files, matches expectations
- **Finding 1 repro**: built a two-PRD workspace (`gate init`/`new`, hand-edited Conflict
  Surface sections), claimed one over `src/auth/**`, ran `gate open` on the second over an
  overlapping path — actual refusal text captured and compared line-by-line against the PRD's
  cited specimen; no agent/phase/TTL line present in either.
- **Finding 2 repro**: `node dist/cli.js --help`, diffed against
  `docs/design/design_handoff_provegate/reference/cli-static-specimens.dc.html:107-127`
  line-by-line.
- **NO_COLOR/strip-identity empirical closure** (temporary bootstrap scripts, deleted before
  finishing): forced `isTTY=true` + `COLORTERM=truecolor` on a fresh `dist/cli.js` import,
  captured real colored output for `status` (with a real `PASS · 8.5` readiness verdict
  injected via a hand-written `_readiness/wip/` fixture), `queue`, `run --dry-run`, the `gate
  open` overlap refusal, and `push`; stripped ANSI from each and diffed byte-for-byte against
  the same command under `NO_COLOR=1` — identical in all five cases. This closes the coverage
  gap the brief flagged in `no-color.test.ts` (piped-stdout tests can never exercise a real
  colored path) without finding a defect.

**Round 2** (re-verification of fix commit `d2af65b`):

- `pnpm --filter provegate build` — clean
- `pnpm --filter provegate test` — 481/481 (matches the stated post-fix baseline)
- `pnpm --filter @provegate/design test` — 26/26
- `pnpm check-types`, `pnpm lint`, `pnpm build` (root, all 4 workspace projects) — all clean
- `grep -c "@provegate/design" dist/cli.js dist/index.js` — 0 in both, re-confirmed on the fresh
  build; `dependencies` still absent from `package.json`
- **Finding 1 re-exploit**: re-ran the identical original repro (two-PRD overlap, `PRD-001`
  claimed by `agent-2` over `src/auth/**`, `gate open PRD-002` over an overlapping path) —
  refusal now reads `lease held by agent-2 · Phase 2b · 12h 0m left`, confirming the agent,
  phase, and TTL are present.
- **Finding 2 re-exploit**: re-ran `node dist/cli.js --help` — wordmark + right-aligned
  `v0.1.0`, `USAGE`/`COMMANDS`/`OPTIONS` headers, and the closing tagline all present; confirmed
  zero ANSI escapes in the output (`usage()` never calls `paint()`).
- **Finding 3 re-verification**: `git diff main -- apps/docs/content/docs/cli.mdx` — empty.
- Temporary test workspaces (`mkdtemp` dirs) and bootstrap scripts from both rounds were
  removed; `_state/prds.json` picked up a stray `generatedAt` timestamp bump from running
  `gate status`/`check` in the repo root during testing (both rounds) and was reverted with
  `git checkout --` each time.

`git status` at the end of this review shows only this review artifact as new/changed.
