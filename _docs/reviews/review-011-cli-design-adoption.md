# Independent Review: PRD-011 — CLI Design Adoption

> **PRD:** PRD-011
> **Verdict:** fail
> **Reviewer:** Sonnet 5 (independent Phase 6 session)
> **Base SHA:** `b417972429601a6ed22358159e11fc5876f94d25`
> **Critical:** 0
> **High:** 2
> **Medium:** 1
> **Quorum:** 1/1 pass (single independent reviewer)

## Summary

Reviewed the feature commit `d4a76bb` (the unrelated `445762b` PRD-012 draft edit on
the branch tip is out of scope, per instruction) against `main` tip `b417972`. Read every
changed file in full, cross-referenced the PRD's own cited specimen
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

**What is broken:** two Functional Requirements with their own named acceptance criteria and
verification-table rows are substantially unimplemented, and one explicit DO-NOT boundary was
crossed. None of these are "the runtime breaks" bugs — every command still runs, refuses
correctly, and exits with the right code — but the PRD's own stated deliverables, checked
against material it explicitly cites, are not what shipped. See Findings 1–3.

## Findings

| #   | Sev    | Finding | Resolution |
| --- | ------ | ------- | ---------- |
| 1   | HIGH   | **FR-6 / User Story 2's acceptance criteria are not met: the `gate open` overlap refusal never names the lease holder's agent, phase, or remaining TTL.** The team's framing ("I did NOT add a new `ClaimResult` field — the refusal renders from the existing `conflicts: PathConflict[]`") undersells the effect: `PathConflict` is `{a, b, shared}` — it carries which two PRDs conflict and on which shared paths, nothing about who holds the blocking lease, their phase, or its TTL. For the common case (a *valid*, non-stale foreign lease blocking a claim), `ClaimResult.staleBlockers` is empty too (it's only populated on the stale-blocker branch) — so the CLI has **no reachable field** carrying agent/phase/TTL for this case. **Repro (executed):** built the CLI, claimed `PRD-001` over `src/auth/**`, then attempted `gate open PRD-002` over an overlapping path. Actual output: `[open] REFUSED — PRD-002 not claimed:\n  ✗ surface overlap with PRD-001: <shared paths>\n  → resolve: narrow PRD-002's Conflict Surface, or --steal if a blocking lease is stale`. Compare to the PRD's own cited specimen (`cli-static-specimens.dc.html:97-102`): `[open] REFUSED — conflict surface overlaps an active lease` / `! PRD-002 (add-oauth) owns  src/auth/**` / `    PRD-004 (sso)       wants src/auth/oauth/callback.ts` / `lease held by agent-2 · phase 4 · ttl 38m` / `→ resolve: ...`. The shipped output has no owns/wants breakdown and, critically, **no lease-holder/phase/TTL line at all** — the exact information User Story 2 says a claimant needs "to narrow my Conflict Surface without reading lock files by hand." | unfixed — needs either the additive `ClaimResult` field the PRD's own M1 proposed (agent/phase/expiresAt on the blocking lease, non-breaking per FR-6's own "additive only" rule), or equivalent data threaded through some other additive path; the current "no new field" simplification silently drops a whole acceptance criterion |
| 2   | HIGH   | **FR-8's `--help` rebuild is largely unimplemented.** The diff to `usage()` adds exactly two lines (a blank line + the closing tagline). Everything else FR-8 names is missing, checked against the PRD's own cited specimen (`cli-static-specimens.dc.html:107-127`): (a) no wordmark+version line — the specimen shows `provegate · prove it, then let it propagate              v1.2.0` (version right-aligned on the header); the shipped text is `ProveGate — prove it, then let it propagate.` with no version anywhere in `--help` output (version only via the separate `--version` flag); (b) no `USAGE`/`COMMANDS` bare-uppercase section headers — shipped text still uses the pre-existing `Usage: gate <command> [options]   (also available as: provegate)` and `Commands:`/`Options:` (title-case, colon-suffixed, plus an `Options:` section the specimen doesn't have); (c) the specimen colors each command name green (`<span style="color:#4fd08a">init</span>`, etc.) — the shipped `Commands:` list has zero coloring on any command name (verified: `usage()` is a static string array, never passed through `paint()`). Verified with `node dist/cli.js --help` directly. FR-8's own verification-table row is literally `node packages/provegate/dist/cli.js --help` / "help matches the specimen" — it does not. | unfixed — FR-8 needs the wordmark+version line, `USAGE`/`COMMANDS` headers, and colored command names actually built, not just the closing tagline appended to the pre-existing help text |
| 3   | MEDIUM | **`apps/docs/content/docs/cli.mdx` was edited despite the PRD's own explicit DO-NOT and Out-of-Scope listing it by name**, and despite it not appearing in the PRD's declared Conflict Surface (which lists `cli-output.mdx`, not `cli.mdx`). PRD text: "DO NOT touch `packages/design/**` or `apps/docs/content/docs/cli.mdx` — other PRDs own them" (§12) and "Out of Scope: ... `apps/docs/content/docs/cli.mdx`" (§8). The diff (`git diff b417972..d4a76bb -- apps/docs/content/docs/cli.mdx`) shows the `gate status` example block rewritten from the old one-line-per-record format to the new aligned table. The change itself is factually correct and arguably necessary (the old example is now stale), but it crosses a boundary the PRD itself drew — this file is explicitly claimed by PRD-008/009's conflict surfaces, and editing it outside a declared surface is exactly the kind of undeclared cross-boundary edit this project's conflict-surface discipline exists to prevent. | unfixed — either fold this doc fix into a properly-scoped follow-up that declares `cli.mdx` in its Conflict Surface, or get explicit owner sign-off that this specific line-item edit is an accepted exception |

No CRITICAL findings — the three explicitly-named auto-fail categories (runtime dependency
leak, card text drift, NO_COLOR escape leak) were tested hardest and found clean, with evidence
stronger than what the shipped test suite alone establishes. The two HIGH findings are not
crashes or safety violations — every affected command still runs and exits correctly — but they
represent two full Functional Requirements (each with its own named acceptance criteria and
verification-table row) that were not substantially built, verified directly against material
the PRD itself cites as the target. I'm marking this `fail` on that basis: a "pass" here would
sign off on FR-6's User Story 2 and FR-8 as delivered when a live run of the actual CLI shows
they mostly are not.

## Post-fix verification

No fixes were applied — review only, per instructions. Commands actually run:

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
- Temporary test workspaces (`mkdtemp` dirs) and bootstrap scripts were removed; `_state/prds.json`
  picked up a stray `generatedAt` timestamp bump from running `gate status`/`check` in the repo
  root during testing and was reverted with `git checkout --`.

`git status` at the end of this review shows only this review artifact as new/changed.
