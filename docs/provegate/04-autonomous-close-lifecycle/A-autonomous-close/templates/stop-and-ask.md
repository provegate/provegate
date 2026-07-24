<!--
Universal stop-and-ask checkpoints — wave 3, part A.
Paste into the bootstrap doc (02 practice 05) so every agent inherits it.
These apply to EVERY task, on top of any item-specific "do not" list.
-->

## Universal stop-and-ask checkpoints

An autonomous agent must STOP and ask the human before any of:

- **Destructive git** — force-push, `reset --hard`, branch deletion.
- **Deploy / publish** — any deploy, release, store-submit, or build-minute-consuming
  command (CI trigger, package publish, app-store upload, infra apply).
- **Bypassing hooks** — `--no-verify` or otherwise skipping pre-commit/commit-msg gates.
- **Lowering security posture** — weakening encryption, privacy, auth, or a permission check.
- **New dependency** — adding any dependency not named in the spec.
- **Out-of-scope files** — touching files outside the spec's documented scope / Conflict Surface.
- **Secrets / env** — modifying secrets or `.env.*` beyond what the spec specifies.
- **Unspecified design question** — a design decision the spec doesn't answer.

Plus, always STOP if:
- the current branch is a protected base (`main` / `master` / `staging`); or
- another active lock or status-board row already names this work-item.

On a blocker, surface the error verbatim — never paper over it with an `any` cast, an
`eslint-disable`, or a `|| true`. Push to remote is never an agent action (see
`A-autonomous-close/SPEC.md §2`).
