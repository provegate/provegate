# Reusable verify:* patterns (read this first)

The Emofy verify library is ~130 scripts, but they are instances of **six reusable
patterns**. The patterns are more valuable than any single check — port these and you can
generate the checks provegate actually needs. Each check in `CATALOG.md` is tagged with the
pattern(s) it uses.

---

## P1 — Generated-SSOT freshness (regenerate + byte-compare)

A committed artifact is *derived* from a source of truth. The check regenerates it from the
source and compares to the committed copy **on a normalized form that excludes volatile
fields** (e.g. a generation timestamp) — a literal byte-compare of a file containing a
timestamp is stale on every rebuild. Any real drift fails.

- **Shape:** `normalize(regenerate(source)) === normalize(readCommitted()) || fail`.
- **Use for:** a state JSON derived from spec files; a status board's metric cells; any
  generated table/index.
- **Why:** derived content rots silently. Making the check *recompute and compare* means the
  committed copy can never lie.
- **Emofy instances:** `verify:prd-state`, `verify:status-panel`.

## P2 — Baseline ratchet (shrink-only)

For a metric you want to drive toward zero but can't fix all at once (import cycles, lint
debt, `any` count), store a baseline number/set; the check fails if the current value
**exceeds** the baseline; the `--update` flag may only **lower** it, never raise it.

- **Shape:** `current <= baseline || fail`; `update` writes `min(current, baseline)`. One
  bootstrap exception: the very first run (no baseline file yet) records the status quo.
- **Use for:** cycles, type-debt, boundary violations, bundle size.
- **Why:** a hard "must be zero" blocks all work on day one; a ratchet locks in progress and
  prevents regression without demanding a big-bang fix.
- **Emofy instances:** `verify:no-cycles`, `verify:package-cycles`, `verify:domain-boundaries`
  (the *mechanism* is reusable even though Emofy's domain model isn't). Give it a
  `--self-test`.

## P3 — Meta-gate: wire-or-delete

A check that checks the checks, both directions: every **registered** gate (in the package
manifest) must appear in at least one executing gate/CI surface, **and** every check script
on disk must be registered as a gate. Orphans fail both ways. Acknowledged exceptions live
in a shrink-only allowlist. (A CI step referencing a *deleted* check fails at CI runtime on
its own — that direction needs no meta-gate.)

- **Shape:** `registered ⊆ wired  AND  scripts_on_disk ⊆ registered (modulo allowlist) || fail`.
- **Why:** a gate library rots into dead registered checks (never executed) and unregistered
  orphan scripts (never wired). This is the discipline that keeps the whole library honest.
- **Emofy instance:** `verify:gates-wired`. (seed `gate-wire-or-delete`)

## P4 — Known-red ledger (auditable temporary failures)

The gate-runner-of-runners partitions failures: an acknowledged-red manifest lists checks
allowed to fail *for now* (with a reason). But the manifest itself is policed — a **stale**
entry (the check now passes), an **unknown** entry, or an **invalid** one **fails the run**.

- **Shape:** run all; a red in the ledger is downgraded; a ledger entry that's stale/unknown
  fails.
- **Why:** teams need a pressure valve for temporary reds, but an unpoliced allowlist becomes
  a permanent bypass. Policing staleness forces entries to be removed once fixed.
- **Emofy instance:** `verify:workflow` + its `known-red-verifies.json`. (seed
  `known-red-ledger-must-expire`)

## P5 — Declared-and-checked (intent in the diff)

The spec declares up front the paths/artifacts a change must touch; a check confirms the
merge diff actually touched them.

- **Shape:** `declared_paths ⊆ changed_paths(diff) || fail`.
- **Use for:** durable artifacts (docs land with code), owned-path conflict surfaces.
- **Why:** turns "we'll document it" into a gate. (See `02` practice 07.)
- **Emofy instances:** `verify:durable-artifacts`, `verify:path-conflicts`.

## P6 — Owner-gated waiver

Any override of a gate is a structured, schema-validated record whose `owner` must be on an
allowlist; the gate consumes the waiver only if valid. This is the human-in-the-loop escape
hatch, made auditable.

- **Shape:** `blocked unless valid_waiver(item) && owner ∈ allowlist`.
- **Why:** every gate needs a legitimate override path, but overrides must be attributable and
  bounded — not a silent `--force`.
- **Emofy instance:** `verify:acceptances` + `acceptance-owners.json`.

---

## Cross-cutting rules for any check
- **A check is a shared module, not a copy.** If two gates read the same format (e.g. the
  parser and the readiness lint both read §11), they import one module so they can't drift.
  The origin system proves the rule by violating it: its §11 prefix list existed in three
  copies, one case-insensitive and one missing two tokens — each a live false-green or
  false-red.
- **Every check exits non-zero on failure and 0 on pass — nothing else.** No "warn and
  continue" for a gate (warnings are for advisory rules like commit scope).
- **Absence is a failure, not a skip** (the §11 lesson generalizes to every check).
