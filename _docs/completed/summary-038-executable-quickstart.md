# Summary: PRD-038 — The Quickstart Executes, or It Fails

> **PRD**: [prd-038-executable-quickstart.md](../../_prds/wip/prd-038-executable-quickstart.md)
> **Status**: Ship Verified — landed on local main; push stays the owner call
> **Class**: infra · **Autonomous Close**: eligible
> **Branch**: `prd-038-executable-quickstart`
> **Date**: 2026-07-29

## What shipped

- `QUICKSTART.md`'s canonical path is a tagged, executed fixture: the `qs:scenario`
  region (HTML-comment markers; the doc is plain Markdown), `qs:skip` on the
  worktree alternative (bound through blank lines to the immediately next fence),
  and the e2e harness that extracts at run time (no command copy), runs
  hermetically to the handoff card, and pins the three measured chain stops as
  exact-string negative fixtures.
- Hermeticity: tarball install with every npm/npx child locked by a scratch
  `.npmrc` (unreachable registry, scratch cache), `npm_config_*`/`NPM_CONFIG_*` and
  all `GIT_CONFIG*`/`PROVEGATE_*` scrubbed, HOME/XDG/TMP remapped, `git remote`
  asserted empty at every step, shared `cleanupScratch` proven by a deterministic
  permission plant.
- The docs twin converges to the same 8-command sequence (plain `npx gate init`;
  the `--practices` recommendation in its own optional section) and
  `verify:quickstart-parity` — a root script, both marker syntaxes, skip-exclusion
  identical to the harness — holds the two documents to one sequence, wired as a
  `verify:workflow` CHECKS member (landed after the owner's stale-lease steal).
- ADR-0004 gains the repo-rule row; the class ledger agrees; the
  `quickstart-is-a-fixture` learning + INDEX pointer land.

## Verification

Red-first (10/14 failed unmarked); 16/16 e2e; parity 8 commands with a
divergence probe; rollback prova (HEAD~1 lacks the set); floor green (1289
package tests); three-round independent review, `Critical: 0`, incl. the
reviewer's judgment on the three recorded out-of-surface decisions.
