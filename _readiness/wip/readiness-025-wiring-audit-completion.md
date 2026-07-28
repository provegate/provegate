# Readiness Assessment: PRD-025 — Wiring Audit Completion

> **Iteration 3 (Claude Fable 5, independent) — 7.23/10, ITERATE.** The document is
> unchanged since iteration 2; this round re-verified its three [P1]s against live source
> and all three stand — the grammar is still missing its segmentation and arity layers,
> the quoted-path contradiction is still in the §11 row, and all three ledger remnants
> are still in the text. What improved is the environment: PRD-021 shipped, so
> `test/changeset-entry.test.ts` now exists on main and every contention note naming
> PRD-021 is resolved by its close.
>
> <details><summary>Iteration 2 (7.00 ITERATE)</summary>
>
> **Iteration 2 (Codex, independent) — 7.00/10, ITERATE.** Up 0.72, the largest single-round
> gain in this wave. B, D, F and G closed outright and the ledger relocation resolved the
> architectural finding. What remains: the grammar is on its **third attempt and still not
> closed** — command segmentation and interpreter option arity are missing — and the PRD
> now **contradicts itself** on the one case it went out of its way to state.
>
> <details><summary>Iteration 1 (6.28 ITERATE)</summary>
>
> **Iteration 1 (Codex, independent) — 6.28/10, ITERATE.** The lowest of the three split
> items, and the two blocking findings are design errors rather than gaps: a
> **repository-local ledger and decision record were made hard requirements of shipped
> package code** that runs in every adopter repo, and the ledger's own state machine
> contradicts the classification the split forces on it.

> </details>
> </details>

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-025-wiring-audit-completion.md`  |
| Score                  | 7.23/10                                        |
| Verdict                | ITERATE — three [P1] items, all confirmed on the unchanged document: the grammar still lacks command segmentation and interpreter option arity, the §11 row still contradicts FR-3's quoted-path consequence, and the three ledger remnants still stand; plus the containment helper FR-2 needs is private in a file outside the Conflict Surface |
| Iteration              | 3                                              |
| Model Tier (Execution) | do not assign — score < 8                      |
| Model Tier (Audit)     | high (on a PASS)                               |
| Scored by              | **Claude Fable 5 — independent session, did not write the PRD (author sessions were Claude Opus 5)** |
| Self-scored            | **no**                                         |
| Date                   | 2026-07-28                                     |
| PRD Lint               | passed — `gate check PRD-025` exit 0, run live (no sandbox) |
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

Rewritten at iteration 3 — earlier lists are superseded where they conflict. (The ledger
lifecycle items moved to PRD-026 with the ledger itself. This line deliberately does not
begin with the word "Updated": the state builder's `getMetaValue` captures a bare
`Updated …` line at column zero as the record's date — see the deferral filed 2026-07-28.)

- Add the two missing grammar layers: how a hook file or script body is segmented into
  commands (production's quote-blind `split(/[\n;]|&&|\|\|/)` is the thing being
  replaced, so the segmentation rule must be stated, not inherited), and interpreter
  option arity (a `VALUE_FLAGS`-equivalent for interpreters, closed and in source).
  Close the bundle grammar on escapes and multiple `CHECKS` declarations.
- Resolve the quoted-path contradiction one way and make the §11 FR-3 row agree with
  FR-3(b)'s stated consequence.
- Sweep the three ledger remnants: Implementation Scope, Rollback, and the hard-caps deny
  line.
- Bring the containment seam into scope: export the `load.ts` helper and add the file to
  Targets and the Conflict Surface, or specify the intended seam explicitly.
- Sweep "two hardcoded paths" in Goals and FR-2 prose (the metric row's three is
  correct); refresh the two obsolete PRD-021 contention notes.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 3   | 2026-07-28 | 7.23  | ITERATE | **Confirmation round on an unchanged document — the three [P1]s re-verified against live source rather than carried on faith; all three stand.** Dimension scores (infra weights): Clarity 6.5, Completeness 7.0, Tech Depth 7.5, Multi-Tenancy 8.0, Scope & Testability 7.0, Migration & Rollback 7.5 → 7.225. **(A, CONFIRMED OPEN, both halves)** Command segmentation: production still splits every surface on `/[\n;]|&&|\|\|/` **including inside quotes** (`wiring.ts:231`), and FR-3's four layers begin at tokenizing *a command* — nothing says how a hook file or a script body becomes commands in the first place. Option arity: layer 4 still consumes a value only in the `--flag=value` form, so `node --require verify-foo.mjs app.mjs` falsely wires `verify-foo.mjs` as the first non-dash token — and `VALUE_FLAGS` (`wiring.ts:109-118`) is the in-package precedent proving arity handling is real, cited by iteration 2 and still unanswered. The bundle grammar is still silent on string escapes and on multiple `CHECKS` declarations. **(M, CONFIRMED)** FR-3(b) states the consequence plainly — `node "scripts/verify/verify-foo.mjs"` **does** wire, because the lexer strips quotes — while the §11 FR-3 row requires "the echo, syntax-check, eval, and quoted-string forms" **not** to wire. Opposite expectations for the implementer and the test author, in the same document, and the §11 row is the one the runner executes. **(N, CONFIRMED, all three sites)** Implementation Scope still assigns `auditWiring` "ledger check, decision-record comparison"; Rollback still says "delete the ledger file"; the hard-caps deny line still demands "an unclassified script" fixture — three normative remnants of a ledger this PRD relocated to PRD-026. **(P2, upgraded toward blocking)** the containment helper FR-2's symlink rule needs is **private in `config/load.ts`** — measured: not among that module's exports — and `load.ts` is in neither Targets nor the Conflict Surface, so as written the FR forces either an out-of-surface edit its own DO NOT forbids or a second copy of the containment logic, which is `two-parsers-wrong-together` waiting to happen. Export the helper and claim the file, or name the seam. **(P2)** "two hardcoded paths" survives in Goals and FR-2 prose where the Success Metrics row correctly says three — `a-rule-corrected-survives-where-it-is-restated`, in the document that does not cite it. **(environment, POSITIVE)** PRD-021 is Ship Verified as of 2026-07-27: `test/changeset-entry.test.ts` exists on main, so FR-4 extends an existing file rather than creating one, and both "serialize behind PRD-021" notes are obsolete — `gate queue` re-run this round shows no active conflict (PRD-030 is in-flight on a disjoint surface). **Citation drift, cosmetic:** the unknown-key refusal now sits at `validate.ts:193`, the lexical-containment comment at `:454` — PRD-021's `valueScoring` block moved them. **Confirmed exact this round:** `types.ts:107`, `wiring.ts:130-133` and `:229-236`, `verify-gates-wired.mjs:49-52` substring rule and its registration `.includes`, the capability table in §1, and the zero-current-impact claim — no `.githooks` file references a verify script today. |
| 2   | 2026-07-27 | 7.00  | ITERATE | **Second independent round, on the iteration-1 remediation plus the owner's ledger relocation. Largest single-round gain in this wave: +0.72.** B, D, F, G **CLOSED**; C, E, H, I **PARTIALLY CLOSED**; A **OPEN**. **(A, still open)** the four-layer grammar defines a lexer but not the layer *above* it: nothing says how a hook file or script body is **segmented into commands**, which production currently does with `text.split(/[\n;]|&&|\|\|/)` — including separators inside quotes (`wiring.ts:229`). Interpreter **option arity** is also missing, and the package-manager parser already demonstrates why it is needed via `VALUE_FLAGS` (`wiring.ts:108,157`): `node --require verify-foo.mjs app.mjs` would falsely wire `verify-foo`. The bundle grammar permits string literals and comments without defining escapes, comment placement, or multiple `CHECKS` declarations. **(M) the PRD contradicts itself on its own headline case**: the grammar states that a quoted script path **does** wire, and FR-3's verification row requires quoted-string forms **not** to wire — opposite expectations for the implementer and the test author, in the same edit. **(N) the ledger did not fully leave**: Implementation Scope still assigns `auditWiring` the ledger check and decision-record comparison, Rollback still says to delete the ledger file, and the deny-test requirement still demands an unclassified-script fixture. Left as-is, adopter-facing ledger enforcement returns to `auditWiring`. P2s: the symlink containment helper that would actually work is private in `config/load.ts`, which is outside Targets and the Conflict Surface, while the exported `containedPath` is write-oriented and checks the parent rather than a final symlink; and "two hardcoded paths" survives in Goals and FR-2 prose where the corrected metric says three. |
| 1   | 2026-07-27 | 6.28  | ITERATE | **First independent round on the split-out PRD, and the lowest of the three.** Seven [P1]s. Two are design errors the split created rather than carried: **(C)** the repository-local ledger and decision record became hard requirements of `auditWiring`, which `gate check --wiring` runs for every adopter, so a fresh adopter fails as unclassified or missing-record and `gate init --practices` installs neither file; **(D)** the `method-pending` classification the split forced is contradicted by the state machine — `gate check --wiring` already exists, so the replacement is not pending — and PRD-026's forward targets contain neither the ledger nor the ADR, so the gate goes red after the deletion regardless. **(A)** the "closed grammar" written to answer iteration-6 finding U is enumerated but not lexically closed: no tokenization, quoting, escaping, or option arity, and the bundle rule says "parse structurally" without saying what it accepts. **(B)** `verifyScriptPattern` is a regex over script *names* and cannot select an unregistered *filename*, so the on-disk direction has no falsifiable predicate. **(E)** every ledger deny fixture can be red because ADR-0002 is simply absent. **(F)** FR-6 targets a test the Conflict Surface omits and PRD-021 claims. **(G)** the released-config rollback would break an adopter's config load, because validation rejects unknown keys. Confirmed: the three-surface delta, the zero-current-impact claim, the CI narrowing, the config keys, and that finding T was carried to the correct successor — this PRD's floor command survives it. |

---

## Verdict

**ITERATE — 7.23/10, iteration 3, scored independently by Claude Fable 5.**

The design questions are settled — the ledger has a home (PRD-026), the surface-versus-
predicate distinction is understood, and the four-layer grammar is the right shape. What
remains is finishing the grammar (segmentation and arity are exactly the two layers the
in-package `packageScriptOf` already demonstrates the need for), resolving one internal
contradiction, and sweeping three remnants plus one scope omission. All of it is
specification work with a known answer; nothing awaits an owner decision. One focused
remediation round, re-scored independently, should clear this.

*(Iteration 1 verdict, for history: ITERATE 6.28 — the ledger-ownership design error.
Resolved by the owner's relocation decision; no longer describes the document.)*
