# Readiness Assessment: PRD-025 — Wiring Audit Completion

> **Iteration 1 (Codex, independent) — 6.28/10, ITERATE.** The lowest of the three split
> items, and the two blocking findings are design errors rather than gaps: a
> **repository-local ledger and decision record were made hard requirements of shipped
> package code** that runs in every adopter repo, and the ledger's own state machine
> contradicts the classification the split forces on it.

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-025-wiring-audit-completion.md`  |
| Score                  | 6.28/10                                        |
| Verdict                | ITERATE — seven [P1] items; the matching grammar is still not lexically closed, and the ledger has no coherent lifecycle across the split |
| Iteration              | 1                                              |
| Model Tier (Execution) | do not assign — score < 8                      |
| Model Tier (Audit)     | high (on a PASS)                               |
| Scored by              | **Codex (gpt-5.x) via the `/codex` skill — independent, different model family, did not write the PRD** |
| Self-scored            | **no**                                         |
| Date                   | 2026-07-27                                     |
| PRD Lint               | no structural defect observed — all six FRs carry Targets and runnable rows, DO NOT exists, Open Questions is `(none)`, no placeholder remains. The exact CLI wrapper was not executed: `check` reaches `findRecord`, which calls `writeState` (`cli.ts:483`, `cli.ts:1224`), and the sandbox is read-only |
| State Record           | updated — `gate status` re-run after saving    |

<!-- Verdict values: PASS | ITERATE | REJECT. The Score row and Verdict row are parsed
by the state builder — keep the `| Score |` and `| Verdict |` labels intact. -->

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Execution (Phase 4) | do not assign | score below the PASS band |
| Audit (Phase 6)     | high | shipped gate semantics plus a public config surface |

---

## Analysis

### Findings

**[P1] A — FR-4 is enumerated, not closed.** It lists interpreters and deny flags but never
defines lexical tokenization, quoting, escaping, or option arity. The existing code splits
commands and tokens on delimiters and whitespace only (`wiring.ts:130`, `wiring.ts:229`), so
"not inside a quoted string" is ambiguous: `node "scripts/verify/verify-foo.mjs"` is a real
executing positional argument, while an eval payload is already distinguished by
`-e`/`--eval`. The bundle half is equally open — "parse the declared member list
structurally" does not say which identifier, array syntax, quoting, comments, or spreads
are accepted, nor what rejection looks like. **This does not close iteration-6 finding U;
it renames it.**

**[P1] B — FR-2 ports the on-disk set without a falsifiable file-to-registration
predicate.** `verifyScriptPattern` is explicitly a regex over **package-script names**
(`types.ts:107`); it cannot select an unregistered filename. The old script selects
filenames separately and then does an unsafe basename substring search across every script
body (`verify-gates-wired.mjs:59`). The PRD says to retain `verifyScriptPattern` but never
states how an on-disk filename proves registration by a `verify:*` entry whose body
actually executes it — so a non-verify body, or an `echo`, remains a possible false
registration.

**[P1] C — a repository-local ledger and decision record become hard requirements of
shipped code.** `gate check --wiring` calls `auditWiring` for **every adopter**
(`cli.ts:633`). FR-1 and FR-5 make that function require `scripts/verify/script-classes.json`
and `_brain/adr/ADR-0002-…`, while the only new configuration covers scripts, hooks and
bundle paths. `gate init --practices` creates an ADR directory but its `PACK_MAP` installs
neither file (`init.ts:137`, `init.ts:183`). A fresh adopter therefore fails as
"unclassified" or "missing decision record" — and skipping the files when absent would
violate FR-5's own unclassified rule. The ledger needs an explicit decision: repository-only
behind config, or adopter-facing with provisioning.

**[P1] D — the forced `method-pending` classification contradicts the state machine, and
nothing clears it.** `method` means the superseding CLI surface exists; `method-pending`
means it does not. But `gate check --wiring` **already exists**, so
`verify-gates-wired.mjs` cannot honestly be pending at this PRD's close — while classing it
`method` makes this deliberately no-deletion PRD red. After PRD-026 deletes the three
scripts, FR-5 says their entries become stale, yet PRD-026's forward targets and Conflict
Surface contain neither `script-classes.json` nor the ADR. **The split guarantees a later
red gate unless one PRD owns the transition explicitly.** The JSON shape, the owner and date
field names, and the review date for the three entries are also unspecified.

**[P1] E — the ledger deny tests can pass for the wrong reason.** ADR-0002 does not exist
yet; the repository holds ADR-0001 only. FR-1 requires absence or an unparseable table to
fail. FR-5 then asks only that unclassified, stale, expired, and malformed-pending fixtures
"fail", without requiring a valid matching baseline or the exact distinguishing issue — so
every one of them can be red solely because the ADR is absent. The paired-positive
requirement this PRD does state applies only to FR-4's matcher, not the ledger. This is
`assert-absent-needs-an-independent-cause` arriving in the FR that does not cite it.

**[P1] F — FR-6 requires an out-of-scope edit.** Its Targets include
`test/changeset-entry.test.ts`, the Conflict Surface omits it, and the PRD's own DO NOT
forbids unrecorded out-of-scope edits. PRD-021 currently claims that exact file
(`prd-021:1110`). Serializing behind PRD-021 resolves concurrency, not ownership.

**[P1] G — the released-config rollback is invalid for adopters.** The rollback says to
remove `wiring` from the config modules and, after release, issue a patch note. Config
validation **rejects every unknown key** (`validate.ts:133`), so an adopter who set
`wiring.hooksDir` could no longer load their config. A post-release revert must keep
accepting the deprecated block or prescribe its removal as a migration step.

**[P2] H — the hardcoded-path metric is mislabelled.** It says the shipped audit currently
holds two hardcoded repository paths; the hooks and bundle literals are in the **repository
script**, not the shipped audit, and that script hardcodes the verify directory separately.
The measured current value is zero or three depending on the subject, not two.

**[P2] I — path validation is lexical only.** The validator's own comment says lexical
checks must be paired with a runtime resolver for symlink escapes (`validate.ts:263`). A
repo-relative hooks directory symlinked outside the repository would still be read. Add
runtime containment and a symlink-escape fixture for all three configured read paths.

### What Codex confirmed

The live surface delta is exactly three kinds — hooks, bundle, non-verify script bodies —
and `auditWiring` reads manifest commands and CI `run:` text only. The zero-current-impact
claim is correct: no hook names a verify check and all ten current `verify:*` scripts have
an explicit CI step. Keeping CI at `run:` text is the correct narrowing. The three config
keys, their defaults, and the need for a minor changeset are right. **This PRD deletes
nothing and its floor command `pnpm verify:gates-wired` still exists after it — iteration-6
finding T was carried to the correct successor.** FR-4's deny cases and their positive
controls are materially better than the predecessor's open-ended matcher. The declared
Memory Inputs are active and indexed. No runtime dependency, network call, push path,
protected route, or client-to-server contract is introduced.

---

## Scorecard

Class `infra` weights, per `packages/provegate/prompts/phase-2-readiness-scorer.md`.

| #         | Dimension                | Weight | Score      | Notes |
| --------- | ------------------------ | ------ | ---------- | ----- |
| 1         | Clarity                  | 15%    | 6.5/10     | Targets and commands are explicit, but the token grammar, bundle grammar, ledger schema, and pending dates are undecided. |
| 2         | Completeness             | 20%    | 6.0/10     | Adopter provisioning and the post-PRD-026 ledger transition are missing. |
| 3         | Technical Depth          | 20%    | 6.5/10     | The surface-versus-predicate distinction is understood; both the file-registration and command predicates remain incomplete. |
| 4         | Multi-Tenancy & Security | 10%    | 8.0/10     | No tenant, auth, or network surface; configured read paths lack runtime symlink containment. |
| 5         | Scope & Testability      | 15%    | 6.0/10     | Every FR has a row, but ledger negatives can pass through an absent ADR and one required test is outside the Conflict Surface. |
| 6         | Migration & Rollback     | 20%    | 5.5/10     | Delete-last ordering is sound; successor cleanup and released-config rollback are not coherent. |
| **Total** | **Weighted**             |        | **6.28/10** | **ITERATE** |

Weighted sum:
`0.15×6.5 + 0.20×6.0 + 0.20×6.5 + 0.10×8.0 + 0.15×6.0 + 0.20×5.5`
= `0.975 + 1.200 + 1.300 + 0.800 + 0.900 + 1.100 = 6.275` → 6.28.

Hard caps: none tripped. Security, contract, runtime-dependency, push-path and
method-content caps checked explicitly. The lint cap is not independently cleared for a
future PASS because the CLI wrapper could not run read-only, but no lint failure caused
this ITERATE.

---

## Missing Pieces (watch items — binding on Phase 3 and Phase 6)

- Define exact lexical grammars for interpreter commands, registered script bodies, and the
  bundle member declaration.
- Decide whether the class ledger is repository-only or adopter-facing, and add the
  matching opt-in, config, or provisioning contract.
- Specify **one** ledger lifecycle across PRD-025 and PRD-026: schema, field names, dates,
  row deletion, and decision-record synchronization, with one PRD owning the transition.
- Make every negative fixture mutate a single valid green baseline and assert the specific
  issue it introduces.
- Claim the missing Conflict Surface path, add runtime symlink containment, correct the
  hardcoded-path measurement, and make the released-config rollback backward-compatible.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 1   | 2026-07-27 | 6.28  | ITERATE | **First independent round on the split-out PRD, and the lowest of the three.** Seven [P1]s. Two are design errors the split created rather than carried: **(C)** the repository-local ledger and decision record became hard requirements of `auditWiring`, which `gate check --wiring` runs for every adopter, so a fresh adopter fails as unclassified or missing-record and `gate init --practices` installs neither file; **(D)** the `method-pending` classification the split forced is contradicted by the state machine — `gate check --wiring` already exists, so the replacement is not pending — and PRD-026's forward targets contain neither the ledger nor the ADR, so the gate goes red after the deletion regardless. **(A)** the "closed grammar" written to answer iteration-6 finding U is enumerated but not lexically closed: no tokenization, quoting, escaping, or option arity, and the bundle rule says "parse structurally" without saying what it accepts. **(B)** `verifyScriptPattern` is a regex over script *names* and cannot select an unregistered *filename*, so the on-disk direction has no falsifiable predicate. **(E)** every ledger deny fixture can be red because ADR-0002 is simply absent. **(F)** FR-6 targets a test the Conflict Surface omits and PRD-021 claims. **(G)** the released-config rollback would break an adopter's config load, because validation rejects unknown keys. Confirmed: the three-surface delta, the zero-current-impact claim, the CI narrowing, the config keys, and that finding T was carried to the correct successor — this PRD's floor command survives it. |

---

## Verdict

**ITERATE — 6.28/10, iteration 1, scored independently by Codex.**

Two findings are load-bearing and they are the same shape: **a repository-local artifact
was wired into shipped, adopter-facing code without deciding whose artifact it is.** The
ledger is the right idea and it currently has no home. Resolving C and D together — who owns
the ledger, is it adopter-facing, and which PRD owns its transition through the deletion —
is the work that unblocks this item, and it is a design decision rather than a
specification gap.
