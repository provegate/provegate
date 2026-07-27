# examples/

Gate-plugin gallery. Domain gates are **user plugins by design** — the package never
ships project-specific checks; these two genericized patterns show the shape:

- `route-guard-coverage/` — every route file must have a deny-path guard test
  (pair with a manifest hard cap so the PRD names the test before scoring)
- `doc-drift/` — watched source prefixes must move with their declared docs

## Manifest cookbook

Two complete `gates.manifest.json` files, each with a README annotating every key with the
failure that key catches:

- [`manifests/single-package/`](manifests/single-package/README.md) — one package at the
  root, npm scripts; declares no script you must write first
- [`manifests/monorepo/`](manifests/monorepo/README.md) — a workspace plus one domain
  gate: a path-scoped class default that runs `route-guard-coverage`, and a hard cap that
  makes the PRD name its deny test

Start there if you are filling an empty manifest; `gate init` writes one with no phase
commands, and a manifest with no commands makes `gate run` honestly green and worthless.

## Gate plugins

Each example is a zero-dependency node script + the `gates.manifest.json` wiring
snippet. Copy into your repo, adapt the patterns at the top, wire it — and
`gate check --wiring` will keep it wired.
