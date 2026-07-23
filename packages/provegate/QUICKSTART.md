# Quickstart — your first gated close

The lightest path through the method: a **hotfix-class** item, from install to the
handoff card. Feature-class ceremony comes later, when you want it; below trivial
size, the honest answer is printed in METHOD.md — don't use the workflow.

## 1. Install and scaffold

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

Running agents in parallel? Add `--worktree` and the claim also provisions an
isolated checkout — one atomic step. Commit the PRD and the control files first:
the checkout is cut from your base branch, so anything uncommitted (or edited
since the last commit) would not be in it. The command refuses rather than hand
you a checkout whose PRD, layout config, or gate policy differs from the one it
just claimed.

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

```
→ READY TO PUSH — run `git push` yourself (the runner never pushes)
```

## Where to go next

- `METHOD.md` — the method spec (classes, gates, locks, deferral governance)
- `prompts/PLACEHOLDERS.md` — adapt the prompts to your project
- `gates.manifest.json` — add your own gates (`examples/` shows two patterns)
- `gate check --wiring` — keeps every gate you add wired or honestly excepted
