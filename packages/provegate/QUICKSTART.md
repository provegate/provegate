# Quickstart — your first gated close

The lightest path through the method: a **hotfix-class** item, from install to the
handoff card. Feature-class ceremony comes later, when you want it; below trivial
size, the honest answer is printed in METHOD.md — don't use the workflow.

## 1. Install and scaffold

<!-- qs:scenario -->

```sh
npm install -D provegate
npx gate init
```

`gate init` creates the artifact tree (`_prds/`, `_readiness/`, `_tasks/`, `_docs/`
with `wip/completed/deferred` states), the state and locks directories, and two
starter configs (`workflow.config.json`, `gates.manifest.json`). It never overwrites
anything — re-run it any time. Check the result:

```sh
npx gate status
```

## 2. Write the spec (Phase 1)

Create the item — id allocation, template, dates all handled:

```sh
npx gate new fix-login-timeout --class=hotfix
```

That writes `_prds/wip/prd-001-fix-login-timeout.md` from the shipped template. Fill
the hotfix skeleton: the repro in §1, one or two FRs with `**Targets:**` paths, the
smallest §11 table that proves the fix — the failing command that now passes, plus
your test command. Replace the example `## Conflict Surface` globs with the paths you
will actually touch, then claim them:

```sh
npx gate open PRD-001
```

Overlap with another active claim refuses here — at claim time, not merge time.

A lease lasts 12h. Running long? `npx gate renew PRD-001 --hours=6` extends it —
renew before it goes stale, so a rival's `--steal` never gets the chance. Done
early, or abandoning the work? `npx gate release PRD-001` drops the lease cleanly
(no hand-editing `_state/locks/`); releasing someone else's lease needs `--force`
and names them.

Running agents in parallel? Add `--worktree` and the claim also provisions an
isolated checkout — one atomic step. Commit the PRD and the control files first:
the checkout is cut from your base branch, so anything uncommitted (or edited
since the last commit) would not be in it. The command refuses rather than hand
you a checkout whose PRD, layout config, or gate policy differs from the one it
just claimed.

<!-- qs:skip -->
```sh
git add _prds/ workflow.config.json gates.manifest.json
git commit -m "docs(prd): prd-001 draft"
npx gate open PRD-001 --worktree
# claimed PRD-001 — worktree: .worktrees/prd-001-fix-login-timeout (branch feat/prd-001-fix-login-timeout)
```

Each agent works in its own tree with the lease already held; `gate run` later
merges from the worktree and cleans it up (a dirty tree is never force-removed).
Claim and checkout succeed or fail together — a branch collision rolls the lease
back. Keep `Autonomous Close: operator-gated` until you trust the gates. Then lint it:

```sh
npx gate check PRD-001
```

Fix what it reports. This is the same lint the runner trusts — a PRD that passes here
is executable by an agent.

## 3. Score and plan (Phases 2–3)

Paste `node_modules/provegate/prompts/phase-2-readiness-scorer.md` into your agent
with the PRD. Hotfix class: Migration is waived, the deny-path hard cap still bites if
you touched anything guarded. You want PASS (≥ 8, no caps tripped) — the verdict is
binary; don't negotiate tenths.

Then `prompts/phase-3-task-generator.md` → the task file (repro → fix → verify → doc →
quality gate skeleton), saved to `_tasks/wip/tasks-001-fix-login-timeout.md`. You
approve the plan. That's the last human gate before the machines take over.

## 4. Implement and prove (Phases 4–7)

Your agent follows `prompts/phase-4-implementation.md` on a feature branch: fix,
inline gates after every step, the regression test written next to the fix. Phase 5 is
`prompts/phase-5-testing.md`: run every §11 command for real — a listed-but-not-run
command is never passed. Phase 6: an agent that did not write the code reviews the
diff (`prompts/phase-6-final-auditing.md`) and saves the verdict artifact from
`templates/review-template.md`. Phase 7: update the docs your PRD declared.

## 5. Close (the runner)

```sh
npx gate run --dry-run PRD-001   # see the whole plan first
npx gate run PRD-001
```

The runner executes the gate chain — floor gates, your §11 commands (safety-checked),
the review-artifact schema, the durable-docs diff check, the operator gate — then
archives the artifacts and merges the branch into your local base with post-merge
verification and auto-revert. It ends with a handoff card whose last line is the whole
philosophy:

```text
→ READY TO PUSH — run `git push` yourself (the runner never pushes)
```

<!-- /qs:scenario -->

## Single-package repos

`gate` is **repo-layout-agnostic** — no monorepo required. "Workspace" throughout
means your git repo root, and `gate init` scaffolds only the workflow tree
(`_prds/`, `_tasks/`, …); it never creates `apps/`/`packages/` or a
`pnpm-workspace.yaml`. The one thing to configure is which gate commands run —
and nothing in it assumes pnpm or turbo.

`gate init` writes an **empty** `gates.manifest.json` (it starts honest — no gates
until you wire your own). Add your commands to that file: `phases."4"` is the floor
the gated run executes, `postMerge` runs after the local merge.

```json
{
  "phases": {
    "4": ["npm run check-types", "npm run lint", "npm run test", "npm run build"]
  },
  "postMerge": ["npm run check-types", "npm run build"]
}
```

The commands are plain strings, so any **allowlisted** invocation works —
`npm`, `npx`, `yarn`, `bun`, `node`, `tsx`, `vitest`; no pnpm/turbo assumed. A
direct toolchain via `npx` is fine — `npx tsc --noEmit`, `npx eslint .`,
`npx vitest run`. (Bare `tsc`/`eslint` are not allowlisted by default; use `npx …`
or add the prefix to `commands.allowedPrefixes` in `workflow.config.json`.) Run
`gate check --wiring` to confirm every gate is wired or honestly excepted.

## The practices layer (optional, recommended)

```sh
gate init --practices
```

Installs the proven practice layer around the workflow tree, additively — **nothing is
ever overwritten** (existing files are reported as skipped, byte-untouched):

- `_brain/` — agent-agnostic memory: the canonical protocol, an indexed store of 21
  seed learnings (workflow gotchas any gated project hits), record templates.
- `AGENT_BOOTSTRAP.md` + `STATUS.md` — the canonical agent entrypoint template and the
  cross-agent status board (fill the `{{PLACEHOLDER}}`s).
- `.githooks/` + `scripts/` — a base-branch commit guard (base branches merge-only for
  source), a pre-commit secret scanner, and a commitlint config (written only when
  absent).
- `scripts/verify/` — a zero-dependency check library (`verify-workflow` bundle,
  known-red ledger, wire-or-delete meta-gate, review-artifact/durable-artifacts/
  deferral checks) that exits green immediately on a fresh install.

The pack never mutates state beyond creating files: no `git config`, no dependency
install, no edits to an existing `package.json`, and it never creates or edits agent
entrypoints (`CLAUDE.md`, `AGENTS.md`) — paste the shims from
`node_modules/provegate/practices/shims/` yourself. The remaining manual wiring is
printed after install (also in `practices/NEXT_STEPS.md`). `--dry-run` composes.

### Check the install, and search what you have recorded

Once the pack is wired and `memory.enabled` is on, two read-only commands answer the two
questions you will actually have:

```sh
gate doctor --memory        # is this install reachable?
gate memory find --query=caching
```

`doctor` reports whether the store, index, records, entrypoint pointer, validator and
Phase 7 wiring are reachable. Run it AFTER the manual wiring above, not before — it reports
what is true now. Mandatory failures exit 1; CI reachability and unfilled `{{TOKEN}}`
placeholders only warn, because a workflow layout is yours and this tool cannot prove
absence. It never edits anything, on the failing path as well as the passing one.

`memory find` is deterministic local recall — no embedding, no index, no model, no network.
It ranks by watched-path overlap, then exact name or tag, then description tokens, so the
same question returns the same bytes on any machine. It augments `_brain/INDEX.md`; it does
not replace reading it.

## Where to go next

- `METHOD.md` — the method spec (classes, gates, locks, deferral governance)
- `prompts/PLACEHOLDERS.md` — adapt the prompts to your project
- [`examples/manifests/`](examples/README.md#manifest-cookbook) — the **manifest cookbook**: a complete `gates.manifest.json` for a
  single-package repo and for a monorepo, each key annotated with the failure it catches
- `gates.manifest.json` — add your own gates (`examples/` shows two plugin patterns)
- `gate check --wiring` — keeps every gate you add wired or honestly excepted
