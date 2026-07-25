# provegate

## 0.2.0

### Minor Changes

- The work-item lifecycle, parallel-agent isolation, and the practices layer.

  - **Lifecycle commands are real.** `gate init` scaffolds the workflow tree and starter
    configs (never overwriting; `--dry-run` composes). `gate new <slug>` creates the next
    work item from the shipped template, resolving concurrent id allocation instead of
    colliding. `gate open PRD-XXX` claims the item's Conflict Surface as a lease and
    refuses on overlap at claim time — naming the holder, phase, and remaining TTL —
    with `--steal` for a stale lease and `--hours=N` for the term. `gate renew` refreshes
    a lease idempotently, re-validating a surface edited since the claim rather than
    grandfathering it; `gate release` drops one under the claim mutex (`--force` to
    release someone else's, and it names them).
  - **Worktree lifecycle.** `gate open --worktree` provisions an isolated checkout in the
    same atomic step as the claim — claim and checkout succeed or fail together, and it
    refuses rather than hand back a tree whose PRD, layout config, or gate policy differs
    from the one just claimed. `gate run` then merges from the claimed checkout, guards
    against branch drift by pinning the verified commit, and tears the tree down afterwards
    under the same mutex; a dirty or reclaimed tree is never force-removed.
  - **The practices layer.** `gate init --practices` additively installs the practice layer
    that grew around the workflow: `_brain/` agent memory (protocol, indexed seed
    learnings, record templates), the `AGENT_BOOTSTRAP.md` / `STATUS.md` templates, a
    base-branch commit guard and pre-commit secret scanner, and a zero-dependency
    `scripts/verify/` check library. It only creates files — no `git config`, no dependency
    install, no edits to an existing `package.json`, and it never writes an agent
    entrypoint. The manual wiring is printed, never performed.
  - **Single-package repos are first-class.** No monorepo required: "workspace" means the
    git repo root, `gate init` never creates `apps/`/`packages/`, and gate commands are
    plain strings, so nothing assumes pnpm or turbo.
  - **Restrained terminal output.** Green means a gate that actually passed, blue means a
    human decision. Under `NO_COLOR` or a non-TTY every card and table is byte-identical
    to the coloured version — glyphs carry the meaning and widths are computed on plain
    text, so `grep` still works.
  - **Conflict detection hardened.** Overlap is decided from the item's declared surface
    rather than a caller override, malformed or one-sided leases fail closed instead of
    being laundered into a plain claim, and lease identity is captured before the gate
    chain runs so a rival's refresh can never redirect a merge or a teardown.

  Still no runtime dependencies, no telemetry, no network calls, and no code path that
  pushes to a remote.

## 0.1.0

### Minor Changes

- First public surface: the gated-workflow engine (config, state, locks, gates,
  safety-allowlisted runner with local no-ff merge + auto-revert), the `gate` /
  `provegate` CLI (`init`, `status`, `queue`, `check`, `run`, `land`, and the
  permanent `push` refusal), the method package (prompts, templates, schemas,
  example gates, METHOD.md), and the quickstart. No runtime dependencies, no
  telemetry, no network calls, no code path that pushes.
