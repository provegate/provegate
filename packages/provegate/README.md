# provegate

ProveGate (prove + gate): prove it, then let it propagate.

Gates autonomous AI coding on machine-checkable evidence: seven phases where every autonomous
boundary is a verification command's exit code or an independent cross-model reviewer's
structured verdict — never the implementing agent's own judgment. Nothing pushes to a remote
without a human.

> **Pre-1.0.** Every command below is real — no stubs, no placeholders. The surface can
> still change between minor versions. See the
> [repository](https://github.com/provegate/provegate) for status.

```sh
npm install -D provegate
npx gate init
```

```
$ gate push
No. Push is yours.
```

New here? [QUICKSTART.md](QUICKSTART.md) walks install → first gated close
(hotfix-class) → handoff card in one sitting.

## Commands

- `gate init [--dry-run] [--practices]` — scaffold the workflow tree (`_prds/`, `_readiness/`,
  `_tasks/`, `_docs/` in `wip`/`completed`/`deferred` states, plus the state and locks
  directories) and two starter configs. It never overwrites: an existing file is reported
  skipped and left byte-untouched, so re-running is safe. `--practices` additively installs
  the practice layer (see below).
- `gate new <slug> [--class=X] [--template=path]` — create the next work item from the shipped
  template. Concurrent invocations race for the id and resolve it, rather than colliding.
- `gate open PRD-XXX [--steal] [--worktree] [--hours=N]` — claim the item's Conflict Surface as
  a lease. Overlap with a live claim refuses here, at claim time rather than at merge time,
  naming the holder (agent · phase · remaining TTL). `--worktree` also provisions an isolated
  checkout in the same atomic step — claim and checkout succeed or fail together, and a
  branch collision rolls the lease back. `--steal` takes over a stale lease and says whose.
- `gate renew PRD-XXX [--hours=N]` — extend your lease. The refresh re-parses and re-validates
  the surface, so a surface edited since the claim is re-checked, never grandfathered.
- `gate release PRD-XXX [--force]` — drop a lease under the claim mutex instead of hand-editing
  `_state/locks/`. Releasing someone else's lease needs `--force` and names them.
- `gate status` — rebuild workflow state from the artifact tree and print one line per work
  item plus panel metrics. Writes the snapshot (default `_state/prds.json`).
- `gate queue [--json]` — the scheduling view: READY (sorted by readiness score), IN-FLIGHT
  (active lock leases, stale-flagged), BLOCKED, IN-REVIEW, plus conflict-surface overlap
  warnings between READY items.
- `gate check PRD-XXX` / `gate check --wiring` — readiness lint (structural + manifest
  hard caps) and the wire-or-delete audit.
- `gate run [--dry-run] [--from-phase=…] PRD-XXX` — the deterministic close: manifest gate
  chain (floor + diff-conditional class defaults), §11 commands through the safety
  allowlist, review-artifact schema gate, durable-artifacts gate, operator-acceptance
  guard, archive, local no-ff merge with post-merge gates and auto-revert. Under a
  `--worktree` lease it merges from the claimed checkout and tears it down afterwards (a
  dirty tree is never force-removed). A nested non-dry-run invocation refuses
  (`PROVEGATE_RUN_ACTIVE` sentinel).
- `gate land PRD-XXX` — merge step only.
- `gate push` — refuses, exit 1. The runner has no code path that pushes to a remote.
  User-gate commands are safety-checked before shell execution (no metachars, allowlisted
  prefixes only, `git push` refused inside §11 rows too); the safety gate defends against
  accidents and artifact-content injection — the spec itself is human-approved upstream.

The state snapshot is regenerable from the artifact tree (the artifacts are the source of
truth). Concurrent `status`/`queue` invocations are safe: last write wins and the next run
rebuilds from artifacts. From a linked git worktree, the snapshot is checkout-local; lock
leases always live on the main checkout.

No monorepo required — `gate` is repo-layout-agnostic. "Workspace" throughout means your git
repo root, `gate init` never creates `apps/`/`packages/` or a `pnpm-workspace.yaml`, and the
gate commands you configure are plain strings, so nothing assumes pnpm or turbo.

Output is colour-restrained by design: green means a gate that actually passed, blue means a
human decision. Under `NO_COLOR` or a non-TTY every card and table is byte-identical to the
coloured version — the glyphs (`✓ ✗ ⚠ !`) carry the meaning, and column widths are computed on
plain text so `grep PRD-001` keeps working.

## Configuration

Optional `workflow.config.json` at the repo root; every field falls back to a default.
Objects merge recursively; arrays and scalars replace wholesale. Unknown keys and wrong
types fail loud with path-tagged errors.

| Field              | Default (excerpt)                                      | Controls                                 |
| ------------------ | ------------------------------------------------------ | ---------------------------------------- |
| `dirs.artifacts`   | `_prds`/`_readiness`/`_tasks`/`_docs` + prefixes       | artifact tree layout                     |
| `dirs.states`      | `["wip", "completed", "deferred"]`                     | lifecycle subdirectories                 |
| `dirs.stateFile`   | `_state/prds.json`                                     | snapshot location                        |
| `dirs.locksDir`    | `_state/locks`                                         | lease directory (main checkout)          |
| `idPattern`        | `{ "prefix": "PRD", "width": 3 }`                      | id shape (`PRD-001`)                     |
| `statusVocab`      | 12 canonical statuses + aliases + role sets            | lifecycle vocabulary and queue semantics |
| `branches`         | base `main`, protected bases, direct-commit allowlists | branch policy                            |
| `commands`         | `pnpm check-types` / `lint` / `test` / `build`         | floor-gate command lines                 |
| `owners`           | `["owner", "operator"]`                                | acceptance-signing identities (roles)    |
| `worktree.dir`     | `.worktrees`                                           | linked-worktree location                 |
| `executionPhases`  | `["Phase 2b", "Phase 3", "Phase 4", "Maintenance"]`    | which phases claim conflict surfaces     |
| `sharedAppendOnly` | `package.json`, `pnpm-lock.yaml`, …                    | manifests exempt from ownership overlap  |

## The method assets

The package ships the method itself, not just the tooling: [`METHOD.md`](METHOD.md)
(the spec — gate rule, phases, classes, calibration principle), `prompts/` (the seven
phase protocols + orchestration + knowledge upkeep + Cursor/Codex adapters, placeholder
tokens per `prompts/PLACEHOLDERS.md`), `templates/` (artifact templates byte-compatible
with the gate parsers — drift is a red test in this repo), and `examples/` (gate-plugin
gallery: route-guard-coverage, doc-drift).

## The practices layer

`gate init --practices` installs the practice layer that grew around the workflow, additively:
`_brain/` (agent-agnostic memory — the protocol, an indexed store of seed learnings, record
templates), the `AGENT_BOOTSTRAP.md` and `STATUS.md` templates, `.githooks/` + `scripts/` (a
base-branch commit guard and a pre-commit secret scanner), and `scripts/verify/` (a
zero-dependency check library that exits green on a fresh install).

The pack only creates files. It runs no `git config`, installs no dependencies, edits no
existing `package.json`, and never writes an agent entrypoint (`CLAUDE.md`, `AGENTS.md`) — the
shims are yours to paste. The remaining wiring is printed after install, and also lives in
`practices/NEXT_STEPS.md`. `--dry-run` composes.

## Gates manifest

Optional `gates.manifest.json` at the repo root — gate membership and policy, split from
`workflow.config.json` (shape/vocabulary) because it churns per project:

| Field              | Default                                  | Controls                                    |
| ------------------ | ---------------------------------------- | ------------------------------------------- |
| `phases`           | `{"4": [checkTypes, lint, build, test]}` | command chain per phase                     |
| `classDefaults`    | `{}`                                     | per-class extra gates, `when.diffMatches`   |
| `hardCaps`         | `[]`                                     | targets-conditional required-evidence rules |
| `postMerge`        | `[checkTypes, build]`                    | gates re-run on base after the local merge  |
| `wiringExceptions` | `{}`                                     | shrink-only wire-or-delete exceptions       |

Gate metrics append to a local JSONL (default `_state/prd-metrics.jsonl`, gitignored) —
yours to keep or share; nothing is ever sent anywhere.

Programmatic API: `import { loadConfig, loadManifest, buildGateChain, runChain, lintPrd, auditWiring, mergeToLocalBase, buildState, buildQueue, validateLock, findConflicts, globToRegExp } from 'provegate'` — fully typed, zero runtime dependencies.

MIT. No telemetry, no accounts, no network calls. Zero runtime dependencies.
