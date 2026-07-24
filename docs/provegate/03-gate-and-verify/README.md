# 03 — §11 per-FR gate + verify:* library (wave 2)

The workflow machinery that makes "gated" real. Two halves:

- **A — the §11 per-FR machine-checkable gate** (`A-fr-gate/`): each Functional
  Requirement carries a runnable command; a parser extracts them, a safety filter refuses
  anything that isn't a plain allowlisted command, a runner executes each and the phase
  passes only when every command exits 0. This is the single biggest differentiator vs. a
  vanilla PRD template.
- **B — the verify:* invariant library** (`B-verify-library/`): a catalog of executable
  invariant checks, the **reusable patterns** behind them (the real gold), and the wiring
  model that keeps the library honest (`gates-wired` meta-gate, `verify:workflow`
  registry, husky, CI).

Grounded against the Emofy implementation (real scripts, real regex/flags), then
genericized. Product/domain-specific checks are listed in `B-verify-library/CATALOG.md`
under DROP.

## Read in order
1. `A-fr-gate/SPEC.md` — the gate format, parser, safety filter, runner, gate contract,
   failure modes, and the improvements provegate should make over Emofy.
2. `B-verify-library/patterns.md` — the six reusable check patterns. Read this before the
   catalog; the catalog is instances of these patterns.
3. `B-verify-library/CATALOG.md` — the universal checks to extract + the domain checks to drop.
4. `B-verify-library/wiring.md` — how checks register into gates/CI, and the meta-gate.

## Depends on
Wave 1 (`_brain`, `02` practices). The §11 gate's failure modes are already pre-seeded as
`_brain` learnings; the review-artifact and durable-artifacts checks were introduced in
`02` practices 01 and 07 — this wave specifies their runnable form. Three more seeds are
emitted here (see below).

## New seed learnings emitted
In `../01-brain-memory-protocol/seed-learnings/`:
- `notes-column-runs-commands` — the §11 parser runs backtick commands in ANY table
  column, not just the Command column. Real hazard; provegate should scope the parser.
- `gate-wire-or-delete` — a check script that isn't registered in any gate/CI surface is
  dead; a meta-gate must enforce wire-or-delete both directions.
- `known-red-ledger-must-expire` — an acknowledged-failure allowlist must fail on stale or
  unknown entries, or it silently becomes a permanent bypass.
- `unparseable-command-must-fail-loudly` — the runner must never silently drop a command it
  cannot classify as runnable; report or fail (closes the partially-dropped-span case).
