# provegate

ProveGate (prove + gate): prove it, then let it propagate.

Gates autonomous AI coding on machine-checkable evidence: seven phases where every autonomous
boundary is a verification command's exit code or an independent cross-model reviewer's
structured verdict — never the implementing agent's own judgment. Nothing pushes to a remote
without a human.

> **Pre-release.** Method extraction is in progress; `status`, `queue`, `check`, `run`, and
> `land` are real — the runner core is live. See the
> [repository](https://github.com/provegate/provegate) for status.

```sh
npm install -D provegate
```

```
$ gate push
No. Push is yours.
```

## Commands

- `gate status` — rebuild workflow state from the artifact tree and print one line per work
  item plus panel metrics. Writes the snapshot (default `_state/prds.json`).
- `gate queue [--json]` — the scheduling view: READY (sorted by readiness score), IN-FLIGHT
  (active lock leases, stale-flagged), BLOCKED, IN-REVIEW, plus conflict-surface overlap
  warnings between READY items.
- `gate run [--dry-run] [--from-phase=…] PRD-XXX` — the deterministic close: manifest gate
  chain (floor + diff-conditional class defaults), §11 commands through the safety
  allowlist, review-artifact schema gate, durable-artifacts gate, operator-acceptance
  guard, archive, local no-ff merge with post-merge gates and auto-revert. A nested
  non-dry-run invocation refuses (`PROVEGATE_RUN_ACTIVE` sentinel).
- `gate land PRD-XXX` — merge step only.
- `gate check PRD-XXX` / `gate check --wiring` — readiness lint (structural + manifest
  hard caps) and the wire-or-delete audit.
- `init` / `new` / `open` — not implemented yet; each exits 1 naming its roadmap phase.
- `gate push` — refuses, exit 1. The runner has no code path that pushes to a remote.
  User-gate commands are safety-checked before shell execution (no metachars, allowlisted
  prefixes only, `git push` refused inside §11 rows too); the safety gate defends against
  accidents and artifact-content injection — the spec itself is human-approved upstream.

The state snapshot is regenerable from the artifact tree (the artifacts are the source of
truth). Concurrent `status`/`queue` invocations are safe: last write wins and the next run
rebuilds from artifacts. From a linked git worktree, the snapshot is checkout-local; lock
leases always live on the main checkout.

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
