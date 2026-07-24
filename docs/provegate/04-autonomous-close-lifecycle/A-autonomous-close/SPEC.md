# Autonomous Close boundary — SPEC (wave 3)

## 1. The autonomy cut

> Phases 1–3 keep their human gates (spec approval and "Go"; Phase 2 exits on its scored
> readiness PASS verdict). Phases 4–7 **plus the local integration-branch merge and
> cleanup** run autonomously via a deterministic orchestration runner. The runner **never pushes** — push to remote (which triggers
> CI/deploy) is always the human's decision, made from the handoff card the runner prints.

Autonomy is safe **only because each phase boundary is a machine-checkable gate** (a check's
exit code or an independent reviewer's verdict — never the implementing agent's own
judgment). If any gate fails, the runner **stops and hands back** to the human with the
worktree intact.

| Step | Gate | On fail |
|------|------|---------|
| Phases 4–7 | the per-phase gates (`03`) | STOP, worktree intact |
| → Merge to local integration | all gates green + operator gate (§3) | STOP |
| → Cleanup | — | runs only after the merge is verified |
| → **Push to remote** | — | **human only** |

**Resume contract.** STOP is half the story — the handoff card names the re-entry: the
runner accepts `--from-phase=<4..7|merge>` so a human can fix the blocker and resume from
the failed gate without re-running green phases. Every STOP message should print the exact
resume command.

## 2. How "push is always human" is enforced

**By omission + policy, not an active block.** The autonomous runner contains **no `git
push` code path anywhere**; its terminal steps are release-the-lock then print a handoff
card. There is nothing to disable because there is nothing to push with. (seed
`push-is-human-by-omission` — the design principle: don't guard the push, simply never give
the autonomous path the ability.) Document it redundantly so no future edit adds one.

## 3. The operator gate (the auditable human override)

### The verification ledger (vocabulary the gate reads)

Each task's verification runs are recorded in a **ledger** with a closed result set:
`passed | failed | partial | skipped | operator | blocked`. Rules:
- **Executed, not listed:** a command merely listed but never run is never `passed` — the
  ledger records executions, not intentions.
- **`[x]` means completed-as-written** — never "deferred" or "operator-owned"; those keep
  the box unchecked and use the ledger result instead.
- `skipped` is valid only for review-optional classes, with a recorded justification
  (`03/B/wiring.md` class gates); rows on declared high-risk surfaces may only be
  `passed | failed` — no skip.
- `operator` = requires a human, browser session, staging, DB credentials, or a runtime
  environment. `blocked` = an external dependency prevents the run.

### Operator rows

Some work genuinely can't be checked by an agent — that is an **operator row** (ledger
result `operator`): it stays unchecked in the task file's "Operator Handoff" section and is
counted into the state record as `operatorHandoffCount`.

**Merge gate rule:** if `operatorHandoffCount === 0` → pass; else the merge passes **only if
a valid acceptance waiver exists** for the item; otherwise **STOP**.

**Declared up front:** the spec carries an `Autonomous Close: eligible | operator-gated`
line. `eligible` *asserts* zero operator rows — declared-eligible with rows > 0 fails at
the **state gate** (early), not first at the merge. A hedged or template-placeholder value
normalizes to the safer reading (`operator-gated` / null), never to `eligible`.

### Acceptance waiver store
A committed JSON store (`templates/acceptances.schema.json`): each entry requires
`item, owner, items, reason, date, method`. Valid iff `owner` ∈ an **allowlist**, `items`
non-empty, `reason` length ≥ 5, and `date` parses as a real date. Note the shape-vs-policy
split: the schema validates *shape* (non-empty strings); the ≥ 5 reason length and
date-parseability are *policy*, enforced by the gates. Use **one** allowlist loader as the
SSOT — don't hardcode the owner set in a second place (an origin-system bug worth not
copying).

### Recording a sign-off (`accept`)
An owner-gated CLI: `accept <item> --owner <name> --items <ids|all> --reason "<why>" [--yes]`.
It **refuses to self-accept**: if not a TTY and no `--yes`, it dies —
*"operator acceptance must be a deliberate human action; an autonomous agent must not
self-accept."* Interactive mode requires typing the item id to confirm. It records
`method: interactive | --yes`. (seed `operator-acceptance-no-self-accept`)

## 4. Merge-to-local flow + auto-revert

The merge step (see `05/SPEC.md §6` for the parallel-serialization view):
1. Run **from the feature worktree**, not the base checkout.
2. Find the checkout that has the integration branch out; ensure it's clean (auto-reset only
   coordination-only dirt — the status board, the state dir, plans, and the artifact-tier
   wip/scratch dir; anything else aborts).
3. `git merge --no-ff <branch> -m "chore(workflow): land <item> via the runner"` into local
   integration (one explicit, deterministic merge commit per item).
4. **Post-merge gate:** type-check + build; on failure `git reset --hard HEAD~1`
   (auto-revert, worktree left intact) and STOP.
5. Release the lock, print the handoff card: diffstat, ahead/behind vs the remote, per-gate
   ✓/✗, operator-row count, and **"→ ready to push — run `git push` yourself."**

**Gate metrics (observability, never a gate).** The runner appends every gate result as a
JSONL line to a metrics file on the **main checkout** (so it survives worktree cleanup):
item, phase, command, result, duration. Explicitly *not* a ship gate — it exists so gate
flakiness and slow phases are measurable, and it must never block a close.

## 5. Ordering invariant

- **Learning (phase 7) runs BEFORE the merge** — durable docs (`_brain` learnings, ADRs,
  review artifact) land in the *same* merge as the code (see `02` practice 07, `03` durable
  artifacts).
- **Cleanup runs AFTER the merge is verified** — a failed merge must never destroy the
  worktree. (seed `cleanup-after-verified-merge`)

## 6. Universal stop-and-ask checkpoints

An autonomous agent stops and asks the human before any of:
- destructive git (force-push, `reset --hard`, branch deletion);
- any deploy / publish / store-submit / build-minute-consuming command;
- bypassing hooks (`--no-verify`);
- lowering encryption, privacy, or auth posture;
- adding a dependency not named in the spec;
- touching files outside the spec's documented scope;
- modifying secrets or `.env.*` beyond what the spec specifies;
- a design question not answered by the spec.

Also: if the current branch is a protected base, or another active lock/board row already
names this item — STOP and notify. Put this list in the bootstrap doc (`02` practice 05) so
every agent inherits it.

## 7. De-emofy notes

Strip the phase *count* if provegate's workflow differs, product/personal owner tokens, the
EAS/Expo commands in the stop-and-ask list (→ generic "deploy/publish/build"), and
gstack-specific human safeguards. Keep verbatim: the "autonomous through local merge, push
is always human" cut, the "phase boundary = machine-checkable gate, never self-declared"
rule, the operator-row/acceptance-waiver mechanism, and the ordering invariant. Unify the
owner-allowlist loader (don't hardcode it twice).
