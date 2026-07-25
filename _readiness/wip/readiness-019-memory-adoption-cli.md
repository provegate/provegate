# Readiness Assessment: PRD-019 — Agent Memory Adoption CLI

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-019-memory-adoption-cli.md` |
| Score                  | 8.425/10 |
| Verdict                | PASS |
| Iteration              | 1 |
| Model Tier (Execution) | high |
| Model Tier (Audit)     | high |
| Scored by              | independent agent (different model family from the PRD author), via owner |
| Self-scored            | no |
| Date                   | 2026-07-25 |
| PRD Lint               | passed — `gate check PRD-019` exit 0 |
| State Record           | updated — PRD-019 shows `PASS · 8.425` |
| Dependency             | PRD-017 and PRD-018 must be Ship Verified before Phase 4 |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | high | Score band 8–8.9. The work itself is read-only and additive, but byte-stable JSON, deterministic tie-breaking, and a doctor that must diagnose partial installs without ever writing are easy to implement almost-correctly. |
| Phase 6 (Audit)     | high | The audit's job is to make doctor lie: find a broken wiring mode it reports green, or a repository state it silently mutates. Both are cheap to check and fatal if present. |

---

## Analysis

### 1. Technical Depth & Architecture

- **Read-only by construction is the right shape.** Doctor diagnoses and prints a repair;
  it never edits config, manifests, entrypoints, or scripts. That keeps the adopter's
  files under the adopter's control and keeps the command safe to run at any time.
- **Determinism replaces relevance.** Ranking is fully specified — watched-path overlap,
  then exact name/tag, then case-insensitive description/name tokens, then lexical slug —
  with a hard default of 20 and a validated range of 1–1000. There are no embeddings, no
  model call, no persistent index, and the PRD says so in the non-goals rather than
  leaving it implied. This is the correct trade for a local, offline, agent-agnostic tool.
- **The severity split is well chosen:** mandatory local reachability fails, absent literal
  CI reference only warns. Local Phase 7 manifest execution is the real close gate; CI
  layouts are user-defined, so failing on their absence would be a false negative for
  anyone with a different pipeline.
- **Verify-before-use** on records means recall cannot surface a record the validator would
  reject — recall and validation cannot disagree.

The depth ceiling is inherent: this PRD reports on a model PRD-017 defines and a loop
PRD-018 closes. That is a virtue for risk and a limit on how deep it can be.

### 2. Edge Cases & Failure Modes

Measured against the live repository:

| Claim under test | Method | Result |
| ---------------- | ------ | ------ |
| The doctor's entrypoint check is well-defined on the dogfood repo | inspected this repo's configured entrypoints | **gap** — `AGENTS.md` is a **symlink to `CLAUDE.md`**. Containment must reject escapes, not symlinks; and two entrypoints resolving to one file must not read as two independent passes. Neither case appears in the FR-2 matrix. See W1 |
| Adoption-guidance targets are pack-paired | checked FR-5's targets against the pack ledger | **gap** — `practices/NEXT_STEPS.md` and `practices/shims/**` are hash-paired with the shipped copies; editing them without `verify:pack-drift --reconcile` fails the bundle. The obligation is unstated. See W2 |
| `gate check PRD-019` passes | ran the lint | confirmed, exit 0 |

The PRD does enumerate a strong matrix on its own: fresh practices, existing
config/manifest, missing index/script/package-script/Phase-7 wiring, placeholder residue,
disabled memory, CI warning, Unicode and case behavior, Windows separators, absolute/`..`/
symlink-escape selectors, superseded and private exclusion, invalid records, and
byte-for-byte non-mutation proved by a before/after tree hash. The tree-hash check is the
strongest single assertion in the document — it makes "read-only" testable rather than
declarative.

### 3. Maintainability & DX

- Three commands, one question each: is it wired, what is relevant, and (deferred) is it
  being used. That decomposition survives contact with future features.
- Stable JSON shapes (`ok`, `checks[]`, `code`, `severity`, `detail`) let any agent build
  an adapter without vendor coupling — the same discipline the rest of the CLI follows.
- The stats deferral is recorded on the status board with an owner and a review date rather
  than dropped, so the decision is revisitable instead of forgotten.
- Minor surface gap: the PRD introduces a top-level `doctor` command but says nothing about
  bare `gate doctor` without `--memory`. See W3.

### 4. Migration & Rollback

- Purely additive: two read-only commands, no state file, no cache, no schema.
- Rollback removes the commands; every record stays readable Markdown.
- Dependencies are stated as Phase 4 preconditions, not as vague ordering.
- The one migration-shaped obligation is distribution: new shipped files must be registered
  in `pack-manifest.json`, and edited packed files must be reconciled in the drift ledger
  (W2).

---

## Scorecard

Class `infra` weights, per `prompts/phase-2-readiness-scorer.md`.

| #         | Dimension                | Weight | Score        | Notes |
| --------- | ------------------------ | ------ | ------------ | ----- |
| 1         | Clarity                  | 15%    | 8.5/10       | Six FRs with concrete Targets; the ranking rule, selector requirement, limit default and range, and JSON field names are all stated exactly enough to implement without asking. Docked only for leaving bare `gate doctor` undefined |
| 2         | Completeness             | 20%    | 8.0/10       | The partial-install and recall matrices are genuinely thorough, and non-mutation is made testable by tree hash. Docked for two cases measurement found missing: the symlinked entrypoint this very repo uses, and the pack-reconcile obligation created by editing shipped adoption files |
| 3         | Technical Depth          | 20%    | 8.0/10       | Deterministic ranking with an explicit tie-break, bounded output, verify-before-use, no persistent index. Appropriate rather than deep — it reports over a model two other PRDs define, which is the correct scope, not a flaw |
| 4         | Multi-Tenancy & Security | 10%    | 9.0/10       | No tenant surface. Read-only by construction, no network, no shell execution, selectors are data and never shell fragments, containment on path selectors, private records excluded from public results |
| 5         | Scope & Testability      | 15%    | 9.0/10       | The narrowest and best-bounded of the three. Non-goals name which PRD owns each exclusion, and every success metric is mechanically checkable — the before/after tree hash in particular converts a claim into a test |
| 6         | Migration & Rollback     | 20%    | 8.5/10       | Additive read-only surface, rollback is deletion, no state or data to migrate, dependencies stated as Phase 4 preconditions. Docked for the unstated pack-manifest/drift-reconcile obligation in FR-5 |
| **Total** | **Weighted**             |        | **8.425/10** | **PASS** |

Weighted sum:
`0.15×8.5 + 0.20×8.0 + 0.20×8.0 + 0.10×9.0 + 0.15×9.0 + 0.20×8.5`
`= 1.275 + 1.60 + 1.60 + 0.90 + 1.35 + 1.70 = 8.425`.

Hard caps — none triggered:

- **Security cap:** not triggered. No protected route, endpoint, or query path; the CLI is
  read-only and local.
- **Contract cap:** not triggered. No client→server payload or external schema.
- **Lint cap:** not triggered — `gate check PRD-019` exits 0.
- **ProveGate method caps:** no runtime dependency, no network or push path, and no method
  content outside the PRD-017 addendum.

---

## Missing Pieces (watch items)

1. **W1 — the symlinked entrypoint.** This repository's `AGENTS.md` is a symlink to
   `CLAUDE.md`, and it is a configured agent entrypoint. Doctor must treat an in-repo
   symlink as valid (containment rejects *escapes*, not symlinks) and must not report two
   entrypoints resolving to one file as two independent passes. Add both to the FR-2
   matrix; the dogfood repo is the fixture, so this is free coverage.
2. **W2 — pack reconcile and manifest registration.** FR-5 edits `practices/NEXT_STEPS.md`
   and `practices/shims/**`, which are hash-paired with their shipped copies. The plan must
   include registering any new shipped file in `pack-manifest.json`, running
   `node scripts/verify/verify-pack-drift.mjs --reconcile`, and reading its per-pair output.
   Without it, Phase 5 hits a red gate with no documented escape.
3. **W3 — define the bare command.** Specify what `gate doctor` without `--memory` does.
   House style is usage plus exit 1 (`gate renew`, `gate release`); pick it deliberately so
   the command surface is not half-defined the moment a second doctor mode appears.
4. **W4 — say plainly that ranking is deterministic, not relevant.** Determinism is proved;
   relevance is not evaluated anywhere, by design. State that as an accepted consequence so
   Phase 6 does not relitigate a non-goal, and keep the conservative default of 20.

---

## Iteration History

| # | Date       | Score | Verdict | Key Changes |
| - | ---------- | ----- | ------- | ----------- |
| 1 | 2026-07-25 | 8.425 | PASS    | First independent scoring of the split adoption-CLI scope. Measured the entrypoint and distribution claims against the live repo: the symlinked `AGENTS.md` entrypoint and the pack-reconcile obligation are both uncovered |

---

## Project-Specific Checklist

- [x] Zero runtime dependencies; no telemetry, network, embeddings, or persistent index.
- [x] Read-only: no entrypoint, config, manifest, or state edits.
- [x] Human-only push and owner-only acceptance unchanged.
- [x] Memory-disabled repositories refuse with remediation rather than misbehaving.
- [x] Deterministic, bounded output with stable JSON field names.
- [x] Stats deferral recorded on the board with an owner and review date.
- [ ] W1/W2 folded into Phase 3 tasks.
- [ ] PRD-017 and PRD-018 Ship Verified before Phase 4 entry.

---

## Verdict

**PASS — 8.425/10.** Scored independently: a different model family from the PRD author,
with no authoring involvement.

The best-bounded PRD of the three. It is read-only, additive, and rolls back by deletion,
and it makes its central claim testable instead of asserting it — a before/after tree hash
is what turns "doctor never mutates" into a gate. The two gaps measurement found are both
small and both live in this repository already: a symlinked entrypoint the matrix does not
mention, and a pack-reconcile obligation the plan does not name.

Phase 3 may begin now; Phase 4 waits on PRD-017 and PRD-018 Ship Verified.
