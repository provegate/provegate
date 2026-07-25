# Readiness Assessment: PRD-019 — Agent Memory Adoption CLI

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-019-memory-adoption-cli.md` |
| Score                  | 8.58/10 |
| Verdict                | PASS |
| Iteration              | 2 |
| Model Tier (Execution) | high |
| Model Tier (Audit)     | high |
| Scored by              | independent agent (gpt-5.6, different model family from the PRD author), via owner |
| Self-scored            | no |
| Date                   | 2026-07-25 |
| PRD Lint               | passed — `gate check PRD-019` exit 0 |
| State Record           | pending — not regenerated during this read-only re-score |
| Dependency             | PRD-017 and PRD-018 must be Ship Verified before Phase 4 |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | high | Score band 8–8.9. Byte-stable JSON, deterministic tie-breaking, containment around real paths/symlinks, and a doctor that must never write are easy to implement almost-correctly. |
| Phase 6 (Audit)     | high | Audit must make doctor lie: construct broken local wiring, symlink escapes, and repository states it silently mutates; it must also verify that shipped-pack guidance follows the actual pack ledger contract. |

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
PRD-018 closes. That is a virtue for risk and a limit on how deep it can be. W4 is now
properly closed: §7 says ranking is deterministic, explicitly not a relevance guarantee,
and directs Phase 6 to audit determinism and bounds rather than a declared non-goal.

### 2. Edge Cases & Failure Modes

Measured against the live repository:

| Claim under test | Method | Result |
| ---------------- | ------ | ------ |
| The dog's configured entrypoints include a symlink | `ls -la AGENTS.md CLAUDE.md` | **confirmed** — `AGENTS.md -> CLAUDE.md`; FR-2 now explicitly requires valid contained symlinks, deduplication by resolved file, and rejection of external escapes. W1 resolved. |
| `gate renew` and `gate release` establish the bare-command style | invoked each without arguments and read `src/cli.ts` | **confirmed** — each writes its stated usage to stderr and exits 1; FR-1 adopts that defined behavior for bare `gate doctor`. W3 resolved. |
| Adoption-guidance targets are hash-paired with shipped copies | read `scripts/verify/pack-drift-ledger.json` and verifier | **false** — `NEXT_STEPS.md` and all three shims are ledger `packOnly`, not `pairs`; the verifier says pack-only files have no repository counterpart. FR-5's registration obligation is real, but its paired-copy/reconcile rationale is not. W2 remains open; see W5. |
| `gate check PRD-019` passes | ran `node packages/provegate/dist/cli.js check PRD-019` | **confirmed**, exit 0 |

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
- The bare-command surface is no longer implicit: FR-1 specifies usage plus exit 1 and
  cites a measured house style. W3 resolved.

### 4. Migration & Rollback

- Purely additive: two read-only commands, no state file, no cache, no schema.
- Rollback removes the commands; every record stays readable Markdown.
- Dependencies are stated as Phase 4 preconditions, not as vague ordering.
- The one migration-shaped obligation is distribution: newly shipped files must be
  registered in `pack-manifest.json`. However, FR-5 incorrectly calls its existing
  `NEXT_STEPS`/shim targets hash-paired and mandates pair reconciliation, though the live
  ledger classifies them as pack-only. That inaccurate operational instruction remains a
  real rollback/deployment risk (W2/W5).

---

## Scorecard

Class `infra` weights, per `prompts/phase-2-readiness-scorer.md`.

| #         | Dimension                | Weight | Score        | Notes |
| --------- | ------------------------ | ------ | ------------ | ----- |
| 1         | Clarity                  | 15%    | 8.6/10       | Six FRs have concrete Targets; ranking, selectors, bounds, JSON fields, symlink semantics, and bare-doctor behavior are executable without clarification. Docked for the false pack-pair claim in FR-5 |
| 2         | Completeness             | 20%    | 8.4/10       | The matrices are thorough and tree hashing makes non-mutation testable. Docked because the FR-5 distribution workflow misclassifies pack-only content as reconciled pairs, leaving its actual verification obligation ambiguous |
| 3         | Technical Depth          | 20%    | 8.4/10       | Deterministic ranking, explicit tie-breaks, bounds, verify-before-use, and no persistent index are appropriate. §7 now correctly accepts determinism rather than relevance; docked only for the incorrect pack-drift model in the adoption architecture |
| 4         | Multi-Tenancy & Security | 10%    | 9.0/10       | No tenant surface. Read-only by construction, no network, no shell execution, selectors are data and never shell fragments, containment on path selectors, private records excluded from public results |
| 5         | Scope & Testability      | 15%    | 9.0/10       | The narrowest and best-bounded of the three. Non-goals name which PRD owns each exclusion, and every success metric is mechanically checkable — the before/after tree hash in particular converts a claim into a test |
| 6         | Migration & Rollback     | 20%    | 8.4/10       | Additive read-only surface, rollback is deletion, and dependencies are Phase 4 preconditions. Docked because FR-5 prescribes reconciliation for documents that have no counterpart and does not state the valid pack-only verification path |
| **Total** | **Weighted**             |        | **8.58/10** | **PASS** |

Weighted sum:
`0.15×8.6 + 0.20×8.4 + 0.20×8.4 + 0.10×9.0 + 0.15×9.0 + 0.20×8.4`
`= 1.29 + 1.68 + 1.68 + 0.90 + 1.35 + 1.68 = 8.58`.

Hard caps — none triggered:

- **Security cap:** not triggered. No protected route, endpoint, or query path; the CLI is
  read-only and local.
- **Contract cap:** not triggered. No client→server payload or external schema.
- **Lint cap:** not triggered — `gate check PRD-019` exits 0.
- **ProveGate method caps:** no runtime dependency, no network or push path, and no method
  content outside the PRD-017 addendum.

---

## Missing Pieces (watch items)

1. **W1 — RESOLVED: symlinked entrypoint.** FR-2 explicitly covers a contained symlink,
   resolved-file deduplication, and an escaping target. The measured `AGENTS.md -> CLAUDE.md`
   fixture makes this executable.
2. **W2 — NOT RESOLVED: pack reconcile and manifest registration.** FR-5 names the
   distribution obligation, but its claim that `NEXT_STEPS.md` and `shims/**` are
   hash-paired is false. Correct it to distinguish registration of new packed files from
   verification of existing pack-only files; do not present pair reconciliation as their
   counterpart check.
3. **W3 — RESOLVED: bare command.** FR-1 specifies usage plus exit 1, matching the
   measured `gate renew` and `gate release` behavior.
4. **W4 — RESOLVED: determinism, not relevance.** §7 records the intended trade and
   constrains Phase 6's audit accordingly.
5. **W5 — false pack-drift claim.** The ledger lists `NEXT_STEPS.md` and every shim in
   `packOnly[]`; `verify-pack-drift.mjs` explicitly says those have no counterpart.
   Replace FR-5's “hash-paired” assertion and specify a non-mutating verification command
   appropriate to pack-only files. `--reconcile` writes the ledger and is not evidence that
   these files were paired.

---

## Iteration History

| # | Date       | Score | Verdict | Key Changes |
| - | ---------- | ----- | ------- | ----------- |
| 1 | 2026-07-25 | 8.425 | PASS    | First independent scoring of the split adoption-CLI scope. Measured the entrypoint and distribution claims against the live repo: the symlinked `AGENTS.md` entrypoint and the pack-reconcile obligation are both uncovered |
| 2 | 2026-07-25 | 8.58 | PASS | Independent re-score. W1/W3/W4 verified resolved; W2 remains because FR-5's pack-pair claim is false in the live ledger, recorded separately as W5 |

---

## Project-Specific Checklist

- [x] Zero runtime dependencies; no telemetry, network, embeddings, or persistent index.
- [x] Read-only: no entrypoint, config, manifest, or state edits.
- [x] Human-only push and owner-only acceptance unchanged.
- [x] Memory-disabled repositories refuse with remediation rather than misbehaving.
- [x] Deterministic, bounded output with stable JSON field names.
- [x] Stats deferral recorded on the board with an owner and review date.
- [x] W1, W3, and W4 verified against the PRD and repository.
- [ ] W2/W5: correct FR-5 to the live pack-only ledger contract.
- [ ] PRD-017 and PRD-018 Ship Verified before Phase 4 entry.

---

## Verdict

**PASS — 8.58/10.** Scored independently by gpt-5.6, a different model family from the
PRD author, with no authoring involvement.

The amended symlink matrix, bare-command rule, and determinism trade all survive
measurement. The report remains PASS because the sole active issue is narrow and does not
trip a hard cap: FR-5 describes a distribution workflow from a false premise. The live
ledger classifies its `NEXT_STEPS` and shim targets as pack-only, so pair reconciliation is
not their counterpart check. Correct W2/W5 before task generation if the workflow is to be
implemented literally.

Phase 3 may begin now; Phase 4 waits on PRD-017 and PRD-018 Ship Verified.
