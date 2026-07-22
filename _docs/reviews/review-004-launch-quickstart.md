# Independent Review: PRD-004 — Launch Surface

> **PRD:** PRD-004
> **Verdict:** pass
> **Reviewer:** codex (OpenAI Codex CLI, model gpt-5.6-sol, reasoning high)
> **Base SHA:** `3b8acc5902`
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single cross-model reviewer over four rounds; this artifact is
> the first validated by the runtime quorum arithmetic that PRD-004 itself shipped —
> the PRD-003 deferral, closed and immediately self-applied)

## Summary

Brief: quorum arithmetic boundaries, init write-path safety, wiring-skip evasion,
figure-to-source fidelity, do-not-say completeness. Four rounds:

**Round 1: fail — 3 critical + 5 P2.** All three criticals were real. (1) Quorum
counts were unbounded digit strings — `5404319552844595/9007199254740993 pass` is
below 3/5 but rounded into a pass through float precision; the core panel gate was
bypassable. (2) `gate init` trusted config-controlled paths: absolute, `..`, and
symlinked paths could write outside the repository, and the exists-then-write
sequence could truncate a file in a race — a direct violation of its never-overwrite
guarantee. (3) The case study attributed the 3-of-19 cross-model figure to platform
data when it belongs to the external Refute-or-Promote study — false provenance on
the launch evidence, precisely the failure mode the method claims to gate. P2s:
`\b` accepted contradictory quorum tails (`3/5 pass/2/5 fail`), repo shape could
evade the wiring audit, the whitepaper page carried unverified competitor mechanics
(barred by PRD §12), evidence pages were wholly exempt from percentage linting, and
the docs quickstart page escaped the lint set.

**Round 2: fail — 0 critical, 3 P2 + 1 P3.** Verified all round-1 fixes sound;
found the wiring grammar still missed `pnpm run X`/`npm test` forms, the evidence
lint checked only claim-phrases (a fabricated "17% of fixes" would pass), the
case-study intro still claimed everything was platform data, and the containment
check misread contained names like `..cache` as escapes.

**Round 3: fail — 0 critical, 1 P2.** Confirmed the grammar/tracing/caveat/
containment fixes; caught equals-attached selectors (`--filter=pkg`,
`--workspace=pkg`) bypassing the cross-package scope-out.

**Round 4: pass — 0 findings.** All selector forms scoped out with regression
coverage; no merge-blocking regressions. (Reviewer sandbox blocks vitest — EPERM;
test execution evidence is the implementing side's ledger: 330/330 green.)

## Disposition of findings

| # | Sev | Finding | Resolution |
| - | --- | ------- | ---------- |
| 1 | P1 | quorum safe-integer bypass | counts capped at 3 digits; boundary test with the exact exploit pair |
| 2 | P1 | init path escape + truncate race | whole-plan containment (absolute/`..`/symlink) before any write; atomic `wx` creation; refused plan writes nothing |
| 3 | P1 | 3-of-19 false provenance | re-attributed to the external study, "not our platform data" |
| 4 | P2 | quorum tail smuggling | tail must be end-of-value or ` (`-opened annotation |
| 5 | P2 | wiring shape evasion | package-manager grammar parsed for real; package-absent repos flag every script-invoking form; starter manifest ships explicit empty floors |
| 6 | P2 | competitor mechanics on whitepaper page | category-scope statement + editorial rule; no named-tool internals |
| 7 | P2 | evidence percentage exemption | every `%` figure must trace verbatim to the research source |
| 8 | P2 | missing pages + Unicode hyphens | quickstart/index linted; U+2010–U+2015/U+2212 normalized |
| 9 | P2 | wiring grammar gaps (r2) | `packageScriptOf()` with 20 grammar regression cases |
| 10 | P2 | claim-phrase-only tracing (r2) | all-figure tracing, "17% of fixes" fixture |
| 11 | P2 | case-study intro contradiction (r2) | external-evidence exception named up front |
| 12 | P3 | `..cache` false escape (r2) | exact `..`-segment boundary check, both call sites |
| 13 | P2 | attached selectors (r3) | `--filter=`/`-F=`/`--workspace=`/`-w=` scoped out, 3 regression cases |

## Reviewer's note

The meta-pattern repeated: the launch surface whose whole argument is "agent claims
are not evidence" shipped, in draft, a misattributed figure and prohibited
competitor claims — and the cross-model gate caught both before merge. The gates do
not care whose launch it is.
