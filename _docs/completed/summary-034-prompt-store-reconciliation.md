# Summary: PRD-034 — Prompt Store Reconciliation

> **PRD**: [prd-034-prompt-store-reconciliation.md](../../_prds/wip/prd-034-prompt-store-reconciliation.md)
> **Status**: Code Complete — Phase 6 pass (Critical: 0, five rounds); awaiting the operator-gated close
> **Class**: infra · **Autonomous Close**: operator-gated
> **Branch**: `prd-034-prompt-store-reconciliation` (five commits: bf942eb, 080ec4a, 5d5ac9c, 311c99d, 9f25db2)
> **Date**: 2026-07-29

## What shipped

- **`reconcilePrompts(config, root)`** (`core/run/prompts.ts`): recomputes the generated
  set — `generatedPaths()` from the installed package and the current config, the
  installer's own pure function — and compares bytes per planned path. No walk, no
  stored state, no writes. Classification total in five arms
  (`current`/`stale`/`modified`/`missing`/`unattributable`); the banner is attribution
  only; findings carry one canonical POSIX spelling. The read-error and containment
  contract fails closed on every probed escape: EISDIR-class read failures, leaf
  symlink outside, dangling leaf, dangling PARENT (whole-chain `danglingOnChain`),
  outside-pointing parent with a missing leaf, and mid-run mutation (the read targets
  the validated realpath; a vanish after resolution names the concurrent change).
  Containment is volume-aware via the config resolver's own probe.
- **`prompts.exceptions[]`** (config surface): the recorded local exception —
  `{ path, reason, owner, expires }`, rejection-only path contract, UTC calendar expiry
  valid THROUGH the named day, byte-wise duplicate refusal. Validity enforced at every
  config load (disabled included); evaluation only on an enabled run. Suppression is
  scoped to `modified` alone and never authorizes a write. `prompts.dir` refuses
  backslashes at load — the one named behavior change, with its migration in the
  changeset.
- **`gate check --prompts`** (FR-3): per-finding lines only for non-`current`, exactly
  one summary line with all six counts, exit 0 iff nothing falls outside
  `current`/`excepted`; the stale section prints both versions and the model's T2
  remedy verbatim; the disabled note is a verbatim-tested production surface carrying
  both T6 consequences; an enabled config with an absent store fails naming the
  directory.
- **The shared evaluator + preflight** (`evaluatePromptReconciliation`,
  `promptsCheckPreflight`, `PROMPTS_DISABLED_NOTE`): one implementation of the verdict,
  the report lines, the disabled note and the absent-store failure, consumed by the CLI
  and the packed twin alike (`two-parsers-wrong-together` applied to the branches
  around the primitive, not only the primitive).
- **Pack layer** (FR-5): `practices/verify/verify-prompts.mjs` imports the primitive,
  evaluator and preflight from the installed package and opens no file itself; named in
  `PACK_MAP`, the packed `verify-workflow.mjs` CHECKS, `test/pack-manifest.json` and a
  `NEXT_STEPS.md` row. Drift ledger: one new pair plus the reconciled workflow pair,
  both notes updated.
- **Repo layer** (FR-4): `scripts/verify/verify-prompts.mjs` executes the built CLI
  (dormant here until PRD-032 enables prompts) and carries `--assert-ci-order`: the
  hygiene JOB's own step list must run the provegate build strictly before the
  aggregate, matched as exact step-level run lines (indentation pinned) — four
  mutation probes red (comment quote, same-line compound, echo-wrap, `false &&`).
  Registered as `verify:prompts`, a CHECKS member, and two hygiene-job steps; the
  hygiene job gains the build step and the stale "only built-CLI surface" comment in
  the verify job was corrected.
- **The six-surface restatement sweep** (FR-3): `storeReadme()`, the `gate init
  --prompts` output, `practices/NEXT_STEPS.md`, the `prompts.ts` module header, the
  CLI help and the `runCheck` usage line each name `gate check --prompts` as the
  detector; no surface claims nothing detects staleness; the one-way/no-auto-repair
  truths survive. Held by production-surface tests and audited directly by the
  reviewer in two rounds.
- **The fixture matrix** (FR-6): 57 tests in `test/prompts-integrity.test.ts` — the
  five classes, the same-version values-change case, both unbannered paths, stripped
  banners, the three limit pins as NO-finding assertions (T4 removed adapter, T5
  renamed tree with the adapter-staleness consequence, limit-6 unplanned files), six
  containment fixtures, the full exception matrix with independent-cause proofs, the
  verbatim disabled note, both migration scenarios (pre-034 additive install;
  backslash-dir procedure end-to-end), and the packed twin executed as a module.

## Honest scope notes

- **Inherited PRD-029 defect, recorded not fixed:** `gate new` cannot instantiate a
  RENDERED template — `instantiateTemplate` anchors on the literal
  `# {{ID_PREFIX}}-XXX: ` line, which rendering substitutes away, so every
  `templates.prd` that `promptsConfigBlock` hands an adopter fails the anchor. Outside
  this PRD's Conflict Surface (`core/run/new.ts` / method content). The migration
  fixture pins resolution honestly via error-class discrimination (anchor-drift error
  proves the moved bytes were read; the abandoned spelling ENOENTs) with a control
  fixture. **Needs an owner decision: the STATUS deferral board is at its 15-row cap.**
- **Accepted TOCTOU residue:** the swap-of-resolved-target race between `realpathSync`
  and the read is the adversarial concurrent-writer class the PRD-022 deferral
  records; same posture taken, recorded in the task file.
- Out-of-surface files touched, each recorded in Deferrals & Decisions: the
  `script-classes.json` + ADR-0004 classification rows (gate-demanded mechanical
  registration), the `practices-pack.test.ts` production-shape fixture fix (the packed
  bundle now needs a resolvable `provegate`, which every real adopter has), and the
  changeset-read turbo-input gap shared with `changeset-entry.test.ts` (precedent
  followed, recorded).

## Verification

- §11 rows: classification 16 · api-export 1 · exception 16 · command 13 · packed 5 ·
  whole matrix 57/57 · `verify:prompts` dormant-note exit 0 · `--assert-ci-order` PASS
  (+ four mutation probes red) · `verify:workflow` PASS · `verify:pack-drift` PASS.
- Floor: check-types 5/5 · lint 4/4 · test 7/7 (1330 package tests, 55 files) ·
  build 4/4.
- Migration & rollback (infra): single-commit initial landing plus reviewed fix stack;
  rollback prova in a scratch worktree returned `verify:workflow`, `verify:pack-drift`
  and the pack test to green pre-PRD state.
- Phase 6: five independent Codex rounds — 6 → 2 → 2 [P1] found and closed, two [P2]
  advisories closed post-verdict and confirmed; final **Critical: 0**, Quorum 1/1
  pass. Artifact: `_docs/reviews/review-034-prompt-store-reconciliation.md`.

## Memory

- Output: `_brain/learnings/recompute-beats-recorded-state.md` + INDEX pointer.
- Inputs applied as declared; the five review rounds were themselves
  `a-rule-corrected-survives-where-it-is-restated` in action — three of the eight
  post-round-1 findings were created by the previous round's fix.
