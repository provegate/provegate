---
'provegate': minor
---

Add `gate doctor --memory` and `gate memory find` — two read-only commands for repositories
that have adopted the closed-loop memory contract.

`gate doctor --memory [--json]` diagnoses whether a memory install is actually reachable:
config containment, store root and index, record validation, at least one configured
entrypoint carrying the index pointer, validator presence and package-script wiring, and
Phase 7 reachability. Each check has a stable id to grep or branch on. Mandatory failures
exit 1; CI reachability and unfilled placeholders warn, because a workflow layout is
user-defined and absence there proves nothing. It never edits config, manifests,
entrypoints, scripts, or state — on the failing path as well as the passing one.

`gate memory find [--query] [--paths] [--tag] [--limit] [--json]` is deterministic local
recall: watched-path overlap, then exact name or tag, then description and name tokens,
with the slug as a final tie-break, so the same question returns the same bytes on any
machine. No embedding, no persistent index, no model, no network. Deterministic rather than
relevant — it augments the always-loaded index rather than replacing it, and every hit
carries the reasons it matched.

Both are additive. A repository with memory disabled sees no behaviour change: `find`
refuses with remediation rather than returning an empty list, and every pre-existing command
is untouched. Zero runtime dependencies, as before.
