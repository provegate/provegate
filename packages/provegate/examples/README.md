# examples/

Gate-plugin gallery. Domain gates are **user plugins by design** — the package never
ships project-specific checks; these two genericized patterns show the shape:

- `route-guard-coverage/` — every route file must have a deny-path guard test
  (pair with a manifest hard cap so the PRD names the test before scoring)
- `doc-drift/` — watched source prefixes must move with their declared docs

Each example is a zero-dependency node script + the `gates.manifest.json` wiring
snippet. Copy into your repo, adapt the patterns at the top, wire it — and
`gate check --wiring` will keep it wired.
