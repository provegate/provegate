# Readiness Assessment: PRD-019 — Agent Memory Adoption CLI

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-019-memory-adoption-cli.md` |
| Score                  | 8.985/10 |
| Verdict                | PASS |
| Iteration              | 4 |
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
| Phase 4 (Execution) | high | Score band 8–8.9. Byte-stable JSON, deterministic tie-breaking, containment around real paths/symlinks, and a doctor that must never write are easy to implement almost-correctly. Scope must not claim a ledger file that the PRD says remains unchanged. |
| Phase 6 (Audit)     | high | Audit must make doctor lie: construct broken local wiring, symlink escapes, and repository states it silently mutates; it must also verify that any newly packed file is in both the tarball manifest and the proper ledger category. |

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
| The dogfood configured entrypoints include a symlink | `ls -la AGENTS.md CLAUDE.md` | **confirmed** — `AGENTS.md -> CLAUDE.md`; FR-2 explicitly requires valid contained symlinks, deduplication by resolved file, and rejection of external escapes. W1 resolved. |
| `gate renew` and `gate release` establish the bare-command style | invoked each without arguments and read `src/cli.ts` | **confirmed** — each writes its stated usage to stderr and exits 1; FR-1 adopts that defined behavior for bare `gate doctor`. W3 resolved. |
| FR-5's existing practices targets are ledger pack-only entries | read `scripts/verify/pack-drift-ledger.json` and verifier | **confirmed** — `NEXT_STEPS.md` and all three shims are bare `packOnly[]` names with no hash or counterpart; the verifier expressly identifies them as adopter-side content. W2 resolved. |
| An undeclared packed file is rejected by name | read the verifier's packed-file loop and ran `pnpm verify:pack-drift` | **confirmed** — the loop fails a file neither in `PACK_MAP` nor `packOnly[]`, naming its path in the error. The current repository passes. W5 resolved. |
| The pack test compares the allowlist with npm's actual tarball | read and ran `test/pack.test.ts` | **confirmed** — it runs `npm pack --dry-run --json`, compares both extra and missing paths against `pack-manifest.json`, and passed 9 tests. |
| FR-5's scoped files require a ledger edit | compared its targets with the ledger | **false** — all scoped practices targets are already declared; FR-5 now accurately makes registration conditional and promises no ledger change. W6 resolved. |
| The ledger belongs in implementation targets and Conflict Surface | compared FR-5's unchanged-ledger scope with FR-6 and §10 | **over-claimed** — it remains a read-only verification input, but is not a planned write or conflict path. W7. |
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
- The one migration-shaped obligation is distribution: a newly shipped packed file must
  be registered in `pack-manifest.json` and either paired or named in `packOnly[]`.
  FR-5 now correctly distinguishes read-only proof (`pnpm verify:pack-drift` and
  `test/pack.test.ts`) from `--reconcile`, which writes the ledger.
- FR-5 now correctly makes registration conditional: all currently scoped practices
  targets already appear in `packOnly[]`, so the ledger remains unchanged. This closes W6.
- FR-6 and the Conflict Surface nevertheless list the ledger. It is a legitimate
  read-only verification input, but not a planned implementation or conflict path under
  this scope; listing it there overstates the mutation surface (W7).

---

## Scorecard

Class `infra` weights, per `prompts/phase-2-readiness-scorer.md`.

| #         | Dimension                | Weight | Score        | Notes |
| --------- | ------------------------ | ------ | ------------ | ----- |
| 1         | Clarity                  | 15%    | 8.9/10       | Six FRs have concrete Targets; ranking, selectors, bounds, JSON fields, symlink semantics, bare-doctor behavior, and conditional pack-only registration are executable. Docked only for the ledger's over-broad target/surface listing |
| 2         | Completeness             | 20%    | 9.0/10       | The matrices are thorough, tree hashing makes non-mutation testable, and distribution now distinguishes the manifest, ledger, and read-only proof. The remaining gap is a scope declaration, not behavior |
| 3         | Technical Depth          | 20%    | 9.0/10       | Deterministic ranking, explicit tie-breaks, bounds, verify-before-use, no persistent index, and a measured conditional pack-only contract are appropriate. Docked for an inaccurate conflict-surface boundary |
| 4         | Multi-Tenancy & Security | 10%    | 9.0/10       | No tenant surface. Read-only by construction, no network, no shell execution, selectors are data and never shell fragments, containment on path selectors, private records excluded from public results |
| 5         | Scope & Testability      | 15%    | 9.0/10       | The narrowest and best-bounded of the three. Non-goals name which PRD owns each exclusion, and every success metric is mechanically checkable — the before/after tree hash in particular converts a claim into a test |
| 6         | Migration & Rollback     | 20%    | 9.0/10       | Additive read-only surface, rollback is deletion, dependencies are Phase 4 preconditions, and conditional pack-only registration is measured. Docked only for claiming an unchanged ledger as a conflict path |
| **Total** | **Weighted**             |        | **8.985/10** | **PASS** |

Weighted sum:
`0.15×8.9 + 0.20×9.0 + 0.20×9.0 + 0.10×9.0 + 0.15×9.0 + 0.20×9.0`
`= 1.335 + 1.80 + 1.80 + 0.90 + 1.35 + 1.80 = 8.985`.

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
2. **W2 — RESOLVED: pack reconcile and manifest registration.** FR-5 now accurately
   identifies `NEXT_STEPS.md` and the shims as hashless `packOnly[]` entries, distinguishes
   registration from reconciliation, and requires new packed files to be manifest-listed
   and either paired or declared pack-only.
3. **W3 — RESOLVED: bare command.** FR-1 specifies usage plus exit 1, matching the
   measured `gate renew` and `gate release` behavior.
4. **W4 — RESOLVED: determinism, not relevance.** §7 records the intended trade and
   constrains Phase 6's audit accordingly.
5. **W5 — RESOLVED: pack-drift proof.** FR-5 names the two read-only sources of evidence:
   `pnpm verify:pack-drift` rejects a packed file that is neither paired nor declared
   pack-only, and `test/pack.test.ts` compares the explicit manifest against
   `npm pack --dry-run`. It correctly calls `--reconcile` a ledger-writing maintenance
   action, not proof.
6. **W6 — RESOLVED: conditional ledger registration.** FR-5 now correctly states that
   its existing practices targets are already declared, leaves the ledger unchanged, and
   requires a ledger entry only if implementation adds a genuinely new packed file.
7. **W7 — ledger conflict-surface over-claim.** FR-6 Targets and the Conflict Surface
   list `scripts/verify/pack-drift-ledger.json`, though FR-5 says it remains unchanged.
   Keep it only as a read-only verification input, or remove it from implementation
   Targets and the Conflict Surface.

---

## Iteration History

| # | Date       | Score | Verdict | Key Changes |
| - | ---------- | ----- | ------- | ----------- |
| 1 | 2026-07-25 | 8.425 | PASS    | First independent scoring of the split adoption-CLI scope. Measured the entrypoint and distribution claims against the live repo: the symlinked `AGENTS.md` entrypoint and the pack-reconcile obligation are both uncovered |
| 2 | 2026-07-25 | 8.58 | PASS | Independent re-score. W1/W3/W4 verified resolved; W2 remains because FR-5's pack-pair claim is false in the live ledger, recorded separately as W5 |
| 3 | 2026-07-25 | 8.815 | PASS | Independent re-score. W2/W5 verified resolved against the ledger, verifier, and pack test; W6 records an unnamed claimed `packOnly` addition |
| 4 | 2026-07-25 | 8.985 | PASS | Narrow independent re-score. W6 resolved: existing practices targets are already pack-only; W7 records the unchanged ledger's over-broad Targets/Conflict Surface listing |

---

## Project-Specific Checklist

- [x] Zero runtime dependencies; no telemetry, network, embeddings, or persistent index.
- [x] Read-only: no entrypoint, config, manifest, or state edits.
- [x] Human-only push and owner-only acceptance unchanged.
- [x] Memory-disabled repositories refuse with remediation rather than misbehaving.
- [x] Deterministic, bounded output with stable JSON field names.
- [x] Stats deferral recorded on the board with an owner and review date.
- [x] W1–W6 verified against the PRD and repository.
- [ ] W7: remove the unchanged ledger from implementation Targets and Conflict Surface, or label it a verification-only input.
- [ ] PRD-017 and PRD-018 Ship Verified before Phase 4 entry.

---

## Verdict

**PASS — 8.985/10.** Scored independently by gpt-5.6, a different model family from the
PRD author, with no authoring involvement.

The amended symlink matrix, bare-command rule, determinism trade, and FR-5 conditional
pack-only contract all survive measurement. The report remains PASS because the only
active issue is narrow and does not trip a hard cap: the unchanged ledger is over-claimed
as an implementation target and conflict path. Resolve W7 before task generation if the
declared surface is to match the actual work.

Phase 3 may begin now; Phase 4 waits on PRD-017 and PRD-018 Ship Verified.
