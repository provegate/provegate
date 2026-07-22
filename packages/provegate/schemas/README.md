# schemas/

JSON Schemas for the workflow's state artifacts. These document shape; runtime validation is
hand-rolled in `src/core/` (zero dependencies by design), and value-level constraints (id
pattern, status vocabulary, directory names, owner allowlist) derive from `workflow.config.json`
at runtime — the patterns/enums in the schema files show the defaults.

| Schema                    | Contract for                                                   | Runtime gate                      |
| ------------------------- | -------------------------------------------------------------- | --------------------------------- |
| `agent-lock.schema.json`  | lock leases in `_state/locks/*.json`                           | `validateLock` (core/locks)       |
| `prd-state.schema.json`   | the generated state snapshot (default `_state/prds.json`)      | produced by `buildState`          |
| `acceptances.schema.json` | operator-acceptance ledger (default `_state/acceptances.json`) | arrives with the runner (Phase C) |

**Id width note:** ids are zero-padded to `idPattern.width` (default 3 → `PRD-001`…`PRD-999`).
A number that exceeds the width does not parse and its artifacts become invisible to state —
by design, so a typo cannot mint a phantom record. When a project approaches width exhaustion,
bump `idPattern.width` in `workflow.config.json` (existing artifacts must be renamed to the
new width in the same change).

A fourth schema (review-metadata) is written alongside the review chain in roadmap Phase C.
