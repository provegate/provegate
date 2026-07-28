# provegate _brain — index

> One-line pointers only. Detail lives in each file. Keep hooks short — 120 characters of hook text, enforced.
> Never inline a record body here. Grouped by section; add sections as needed.

## Workflow gotchas

- [false green on missing file](learnings/false-green-on-missing-file.md) — a grep-a-file gate check must exit 1 when the file is absent, not skip
- [absence must be asserted](learnings/absence-must-be-asserted.md) — "must NOT exist" needs an explicit assert-absent, not a negative grep
- [grep token anchors real impl](learnings/grep-token-anchors-real-impl.md) — per-FR grep must match the real symbol; `|` alternation is unsafe, anchor it
- [fresh worktree env gap](learnings/fresh-worktree-env-gap.md) — a fresh worktree/checkout doesn't inherit root .env*; copy before env-dependent gates
- [new package postmerge install](learnings/new-package-postmerge-install.md) — a throwaway baseline checkout skips install → false missing-module errors
- [durable artifact must commit](learnings/durable-artifact-must-commit.md) — review/ADR artifacts left untracked fail the close gate
- [verify check phase placement](learnings/verify-check-phase-placement.md) — an invariant check registered in the wrong phase explodes late, not at the gate
- [shipped content needs a delivery gate](learnings/shipped-content-needs-a-delivery-gate.md) — packaging is not delivering; no artifact-checking gate can detect content that ships and never installs
- [derive the requirement from the consumer](learnings/derive-the-requirement-from-the-consumer.md) — a required-input set taken from the catalogue demands answers that cannot change the output
- [scope out the layer the rounds keep hitting](learnings/scope-out-the-layer-the-rounds-keep-hitting.md) — defects clustering in one layer are a scope error reported as design errors
- [score band prescribes the action](learnings/score-band-prescribes-the-action.md) — read the band's required action; a flat trajectory in one band means the wrong action is being applied
- [score must equal weighted sum](learnings/score-must-equal-weighted-sum.md) — machine-check declared score == Σ(dims×weights) or authors round up to pass
- [guard destructive by target host](learnings/guard-destructive-by-target-host.md) — gate destructive data ops by target host, not NODE_ENV; even in dry-run
- [notes column runs commands](learnings/notes-column-runs-commands.md) — a per-FR parser reading the whole row runs backtick commands in Notes too; scope to the Command column
- [known-red ledger must expire](learnings/known-red-ledger-must-expire.md) — an acknowledged-failure allowlist must fail on stale/unknown entries or it becomes a permanent bypass
- [unparseable command must fail loudly](learnings/unparseable-command-must-fail-loudly.md) — a runner must never silently drop a command it can't classify as runnable; report or fail
- [adr section blank line reads empty](learnings/adr-section-blank-line-reads-empty.md) — `$` under `/m` ends the capture at the first newline, so a blank line after `## Context` reads as empty
- [narrow the grammar not the parser](learnings/narrow-the-grammar-not-the-parser.md) — a hand-rolled Markdown reader never reaches renderer parity; restrict what the document may contain instead
- [state model before mechanism](learnings/state-model-before-mechanism.md) — unwritten state transitions give one new counterexample per round; flat score trajectory is the tell

## Orchestration & close gotchas

- [append-only manifest union driver](learnings/append-only-manifest-union-driver.md) — union-merge only TRUE append-only files; modify-in-place shared files are subtracted, never unioned
- [locks on main not worktree](learnings/locks-on-main-not-worktree.md) — write locks to the main checkout, not the ephemeral worktree, or teardown orphans the claim
- [conflict check independent of override](learnings/conflict-check-independent-of-override.md) — pre-start overlap check reads the item's declared surface, never a caller override
- [no completed/done status alias](learnings/no-completed-done-status-alias.md) — "Completed"/"Done" self-declares the terminal state and inverts gate order; reject it
- [operator acceptance no self-accept](learnings/operator-acceptance-no-self-accept.md) — an agent must never self-accept operator rows; TTY/--yes + owner allowlist
- [operator row must be a table row](learnings/operator-row-must-be-a-table-row.md) — a checkbox-bullet operator row counts as 0 rows; the merge gate passes without the acceptance
- [two parsers wrong together](learnings/two-parsers-wrong-together.md) — a corpus proves agreement, not correctness; bind each claim to behaviour
- [fixture must reach production shape](learnings/fixture-must-reach-production-shape.md) — a regression called with cleaner arguments than production cannot detect the defect
- [pin the claim the test cannot hold](learnings/pin-the-claim-the-test-cannot-hold.md) — locale/platform properties: assert at the source and say why, a behavioural test is green by luck
- [cleanup after verified merge](learnings/cleanup-after-verified-merge.md) — learning lands before merge; teardown only after the merge is verified
- [assert absent needs an independent cause](learnings/assert-absent-needs-an-independent-cause.md) — a negative assertion is vacuous when the scenario also removes what would have created the artifact
- [strictness added during extraction is a behavior change](learnings/strictness-added-during-extraction-is-a-behavior-change.md) — a "safer" guard added while sharing logic relocates a decision the callers already owned
- [evidence pattern satisfied by the template](learnings/evidence-pattern-satisfied-by-the-template.md) — a required-line gate can be satisfied by the placeholder in the template the same tool ships
- [docs outlive the gate they promise](learnings/docs-outlive-the-gate-they-promise.md) — a shipped check described as future work; the stale direction is the inverse of the intuitive one
- [a rule corrected survives where it is restated](learnings/a-rule-corrected-survives-where-it-is-restated.md) — five rounds, five defects, every one created by the previous fix; brief the reviewer to sweep, not to hunt

## Project gotchas

- [turbo cache masks out-of-input reads](learnings/turbo-cache-masks-out-of-input-reads.md) — a test reading paths outside its turbo inputs replays stale green from cache

## Conventions

- [memory index vs detail](learnings/memory-index-vs-detail.md) — INDEX = always-loaded one-liners; detail in files; never store what code already records
- [gate wire-or-delete](learnings/gate-wire-or-delete.md) — meta-gate: every registered check wired to an executing surface, every on-disk check registered
- [push is human by omission](learnings/push-is-human-by-omission.md) — give the autonomous runner no push code path at all; enforce by omission, not a block

## ADRs

- [ADR-0002 agent protocol delivery](adr/ADR-0002-agent-protocol-delivery.md) — protocols reach agents as a one-way rendered store; pointer-only adapters; enumerated tokens, not a template language
- [ADR-0001 closed-loop agent memory](adr/ADR-0001-closed-loop-agent-memory.md) — declared PRD inputs, watch-triggered review, base-ref weakening proof, Phase 7 capture
