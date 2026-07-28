# Summary: PRD-025 — Wiring Audit Completion

> **PRD**: [prd-025-wiring-audit-completion.md](../../_prds/wip/prd-025-wiring-audit-completion.md)
> **Tasks**: [tasks-025-wiring-audit-completion.md](../../_tasks/wip/tasks-025-wiring-audit-completion.md)
> **Review**: [review-025-wiring-audit-completion.md](../reviews/review-025-wiring-audit-completion.md)
> **Ship Readiness**: Operator Verification
> **Date**: 2026-07-28

## What shipped

The wiring audit stopped being partial. `auditWiring` now audits the direction and the
three surfaces only the doomed repository script had — on-disk→registered, git hooks,
the bundle's declared membership, non-verify script bodies — and reads them through the
narrowed grammar the owner directed on 2026-07-28: one scanner pass (three state
variables, four rules), a command shape with **no flag semantics** (any dash token
before the path refuses; deno alone takes an optional literal `run`), and a line- and
column-anchored bundle grammar the real bundle satisfies unmodified. Three public
config keys (`wiring.scriptsDir` / `hooksDir` / `bundlePath`) ship with lexical
validation plus runtime containment through the exported `resolveContainedPaths` —
one containment implementation, never a copy. `WiringReport.surfaces` and the
`gate check --wiring` output make a silently-lost surface a visible number. A minor
changeset names the keys, the surfaces, and both compatibility directions; the
changeset test now selects each entry by its own discriminator so `readdirSync` order
decides nothing.

## Evidence

1168 package tests (baseline 1110 + 58), all floor gates green,
`verify:gates-wired` still agreeing with the audit while both exist. Phase 6: six
independent Codex rounds — 4 critical and 12 advisory findings across rounds 1–4, all
closed with deny/control pairs; round 5's contradictory finding was formally rejected
against FR-3(b)'s declared POSIX-subset grammar and the rejection **upheld by the
reviewer** in an adjudication round ("REJECTION UPHELD — Critical: 0"). W4 mutation
checks: the dash rule, the comment rule and the bundle-ambiguity refusal each fail
exactly their paired fixtures when reverted.

## Deliberately not done

No deletion of any script, packed twin, `PACK_MAP` entry or exceptions file — all
PRD-026, which this PRD exists to make safe. The real-bundle fixture's out-of-package
read is recorded for PRD-036's input census (its `turbo.json` edit sits inside
in-flight PRD-024's Conflict Surface). `bun run <path>` stays a stated false negative;
widening the deno-only subcommand exception is a code change with a test.

## Close state

Operator-gated: awaiting the owner's acceptance entry for task 9.5, then
`gate run PRD-025` from the worktree. Push is the owner's.
