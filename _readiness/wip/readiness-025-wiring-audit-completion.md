# Readiness Assessment: PRD-025 — Wiring Audit Completion

> **Iteration 4 (Codex, independent) — 7.08/10, ITERATE, DOWN 0.15.** First round on the
> remediated document, by a scorer who wrote neither it nor the remediation. Every
> iteration-3 closure held — quoted-path, ledger remnants, containment seam, three paths,
> FR-4's selector diagnosis, all CLOSED with citations — and the score still fell,
> because the round went a layer deeper into the grammar and found three [P1]s there:
> Layer 4 is finite but incoherent across its five interpreters (`deno run script.mjs`
> is not recognized at all), Layer 0's wording disagrees with Layer 1's escape state on
> three boundary cases, and the bundle's "top-level" is undefined over the surrounding
> JavaScript. **The grammar has now produced new defects in four consecutive rounds** —
> the shape `scope-out-the-layer-the-rounds-keep-hitting` names.
>
> <details><summary>Iteration 3 (7.23 ITERATE)</summary>
>
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
> </details>

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-025-wiring-audit-completion.md`  |
| Score                  | 7.08/10                                        |
| Verdict                | ITERATE — three [P1] items, all in the command and bundle grammars: Layer 4 loses interpreter-specific semantics (deno's `run` form unrecognized, `ts-node -c` collision, one wrong flag name), Layer 0 and Layer 1 disagree on escape boundaries, and the bundle's "top-level" is undefined over the surrounding JavaScript |
| Iteration              | 4                                              |
| Model Tier (Execution) | do not assign — score < 8                      |
| Model Tier (Audit)     | high (on a PASS)                               |
| Scored by              | **Codex (gpt-5.x) via the `/codex` skill — independent, different model family; wrote neither the PRD nor its 2026-07-28 remediation** |
| Self-scored            | **no**                                         |
| Date                   | 2026-07-28                                     |
| PRD Lint               | Codex did not run the CLI (read-only round; `gate check` writes `_state/`) and said so; the orchestrating session ran `gate check PRD-025` exit 0 on the same document earlier the same day |
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

Rewritten at iteration 4 — earlier lists are superseded where they conflict. (This line
deliberately does not begin with the word "Updated": the state builder's `getMetaValue`
captures a bare `Updated …` line at column zero as the record's date — deferral filed
2026-07-28.)

- **Owner decision first:** four consecutive rounds have found new grammar defects, each
  one level deeper (enumerate → lexer → segmentation+arity → per-interpreter semantics).
  Choose the structural exit before another wording round — radical narrowing (wrappers
  + interpreter + bare-or-quoted path, `deno run` named explicitly, everything else
  no-wiring, residual stated) or an owner-approved grammar design artifact the PRD binds
  to, the PRD-030 state-model way.
- If iterating in place: make Layer 4 per-interpreter (per-head flag semantics, or an
  honest global-approximation statement with per-interpreter deny controls); recognize
  `deno run`; fix the `-c` rationale for `ts-node` (`--cwdMode` executes); correct the
  bun `--tsconfig` row (`--tsconfig-override`).
- Reconcile Layer 0's wording with Layer 1's escape state on the three boundary cases
  (`\\;`, backslash-newline, a quote legitimately spanning a newline) and add each to
  the deny matrix with its positive control.
- Define the bundle's outer lexical grammar — how the scanner treats strings, template
  literals, regexes, comments, and nested blocks around `CHECKS` — and add impostor
  fixtures (the declaration text inside a string or comment must not count).
- P2 sweep: reframe the Layer-0 divergence example as the future-hybrid consequence
  rather than current production behavior; make the introduction's "the audit and the
  ledger must be complete" sentence self-marking about the ledger living in PRD-026.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 4   | 2026-07-28 | 7.08  | ITERATE | **First independent round on the remediated document (Codex; wrote neither the PRD nor the remediation): 6.28 → 7.00 → 7.23 → 7.08, down 0.15 — every iteration-3 closure HELD and the round still fell, because it went one layer deeper into the grammar.** Dimensions: Clarity 6.5, Completeness 6.5, Tech Depth 6.0, Multi-Tenancy 8.5, Scope & Testability 7.0, Migration & Rollback 8.5 → 7.075. The [P1]s, each re-verified in the PRD text by the orchestrating session before recording (the two external-doc claims accepted on the reviewer's citations): **(A) Layer 4 is finite but not coherent across the five heads its own Layer 3 accepts.** Two global tables applied per-head lose interpreter semantics: `deno run script.mjs` — deno's documented standard form — is unrecognized, because Layer 4 reads the first non-dash token and takes `run` as the script path; `-c` sits in the global non-executing list on a rationale naming node, deno and bun while `ts-node -c` (`--cwdMode`) executes its entrypoint and `ts-node` is on the head list; the arity table attributes `--tsconfig` to bun, whose runtime flag is `--tsconfig-override`; and a flag valid for one head is silently valid for every head (`node --config cfg path.mjs` can wire though node has no `--config`). The `node --require` defect itself is fixed with a valid positive control; the deny matrix has no per-interpreter controls able to expose the above. **(B) Layer 0 is not self-consistent with Layer 1's escape state**, on three boundary cases: `\\;` (the first backslash escapes the second, so the separator is unescaped under Layer 1 while "preceded by a backslash" under Layer 0's wording); backslash-newline (Layer 1 escapes it, Layer 0 cuts every newline unconditionally — the "unquoted" qualifier binds only to `;`/`&&`/`||`); and a quote legitimately spanning a newline (surface-level quote state terminated, yet the newline cut fragments it with no initial-state rule for either fragment). The deny matrix covers quoted `&&` and unterminated quotes, none of these. **(C) The bundle's two new refusal rules are explicit and "top-level" is still undefined over the surrounding JavaScript** — the real bundle carries imports, functions, strings and template literals around `CHECKS` (`verify-workflow.mjs:1-87`), and nothing specifies how a zero-dependency scanner distinguishes a declaration from the same text inside a string, template, regex, comment or nested block. **P2s:** the Layer-0 divergence example is framed as production's current behavior when it is the consequence of the future hybrid (today's audit reads manifest commands and CI `run:` text only — no hooks — `wiring.ts:214-223`); and the introduction's "the audit and the ledger must be complete" is the one non-history ledger mention that does not mark the ledger as elsewhere (clarified twenty lines later, so a wording item, not a scope leak). **CLOSED with citations:** the quoted-path rule at every restatement (FR-3(b), deny matrix, §6 Gherkin, §11); all three ledger remnants; the containment seam (`resolveContainedPaths` private at `load.ts:134`, `config/index.ts` named-list export, `containedPath`'s `dirname`-based write orientation at `init.ts:230-264`); the three-hardcoded-paths count at every normative site (`verify-gates-wired.mjs:36,40,60`); the PRD-021 contention refresh; and FR-4's selector diagnosis (`changeset-entry.test.ts:41-44` unsorted `readdirSync`, `COMPAT` at `:58`, three `.find`s at `:82,90,96`) with the discriminator requirement judged sufficient if implemented as specified. **Pattern, recorded for the owner rather than buried: the grammar has produced new defects in four consecutive rounds** — enumerate → lexer → segmentation+arity → per-interpreter semantics — each round's fix correct and each opening the next level. That is the shape `scope-out-the-layer-the-rounds-keep-hitting` and `state-model-before-mechanism` name. Before a fifth wording round, weigh two structural exits: narrow the accepted grammar radically (wrappers + interpreter + bare-or-quoted path, deno's subcommand named explicitly, everything else no-wiring — the residual honestly stated), or land the grammar as an owner-approved design artifact the way PRD-030's state model was, and let the PRD bind to it. |
| 3   | 2026-07-28 | 7.23  | ITERATE | **Confirmation round on an unchanged document — the three [P1]s re-verified against live source rather than carried on faith; all three stand.** Dimension scores (infra weights): Clarity 6.5, Completeness 7.0, Tech Depth 7.5, Multi-Tenancy 8.0, Scope & Testability 7.0, Migration & Rollback 7.5 → 7.225. **(A, CONFIRMED OPEN, both halves)** Command segmentation: production still splits every surface on `/[\n;]|&&|\|\|/` **including inside quotes** (`wiring.ts:231`), and FR-3's four layers begin at tokenizing *a command* — nothing says how a hook file or a script body becomes commands in the first place. Option arity: layer 4 still consumes a value only in the `--flag=value` form, so `node --require verify-foo.mjs app.mjs` falsely wires `verify-foo.mjs` as the first non-dash token — and `VALUE_FLAGS` (`wiring.ts:109-118`) is the in-package precedent proving arity handling is real, cited by iteration 2 and still unanswered. The bundle grammar is still silent on string escapes and on multiple `CHECKS` declarations. **(M, CONFIRMED)** FR-3(b) states the consequence plainly — `node "scripts/verify/verify-foo.mjs"` **does** wire, because the lexer strips quotes — while the §11 FR-3 row requires "the echo, syntax-check, eval, and quoted-string forms" **not** to wire. Opposite expectations for the implementer and the test author, in the same document, and the §11 row is the one the runner executes. **(N, CONFIRMED, all three sites)** Implementation Scope still assigns `auditWiring` "ledger check, decision-record comparison"; Rollback still says "delete the ledger file"; the hard-caps deny line still demands "an unclassified script" fixture — three normative remnants of a ledger this PRD relocated to PRD-026. **(P2, upgraded toward blocking)** the containment helper FR-2's symlink rule needs is **private in `config/load.ts`** — measured: not among that module's exports — and `load.ts` is in neither Targets nor the Conflict Surface, so as written the FR forces either an out-of-surface edit its own DO NOT forbids or a second copy of the containment logic, which is `two-parsers-wrong-together` waiting to happen. Export the helper and claim the file, or name the seam. **(P2)** "two hardcoded paths" survives in Goals and FR-2 prose where the Success Metrics row correctly says three — `a-rule-corrected-survives-where-it-is-restated`, in the document that does not cite it. **(environment, POSITIVE)** PRD-021 is Ship Verified as of 2026-07-27: `test/changeset-entry.test.ts` exists on main, so FR-4 extends an existing file rather than creating one, and both "serialize behind PRD-021" notes are obsolete — `gate queue` re-run this round shows no active conflict (PRD-030 is in-flight on a disjoint surface). **Citation drift, cosmetic:** the unknown-key refusal now sits at `validate.ts:193`, the lexical-containment comment at `:454` — PRD-021's `valueScoring` block moved them. **Confirmed exact this round:** `types.ts:107`, `wiring.ts:130-133` and `:229-236`, `verify-gates-wired.mjs:49-52` substring rule and its registration `.includes`, the capability table in §1, and the zero-current-impact claim — no `.githooks` file references a verify script today. |
| 2   | 2026-07-27 | 7.00  | ITERATE | **Second independent round, on the iteration-1 remediation plus the owner's ledger relocation. Largest single-round gain in this wave: +0.72.** B, D, F, G **CLOSED**; C, E, H, I **PARTIALLY CLOSED**; A **OPEN**. **(A, still open)** the four-layer grammar defines a lexer but not the layer *above* it: nothing says how a hook file or script body is **segmented into commands**, which production currently does with `text.split(/[\n;]|&&|\|\|/)` — including separators inside quotes (`wiring.ts:229`). Interpreter **option arity** is also missing, and the package-manager parser already demonstrates why it is needed via `VALUE_FLAGS` (`wiring.ts:108,157`): `node --require verify-foo.mjs app.mjs` would falsely wire `verify-foo`. The bundle grammar permits string literals and comments without defining escapes, comment placement, or multiple `CHECKS` declarations. **(M) the PRD contradicts itself on its own headline case**: the grammar states that a quoted script path **does** wire, and FR-3's verification row requires quoted-string forms **not** to wire — opposite expectations for the implementer and the test author, in the same edit. **(N) the ledger did not fully leave**: Implementation Scope still assigns `auditWiring` the ledger check and decision-record comparison, Rollback still says to delete the ledger file, and the deny-test requirement still demands an unclassified-script fixture. Left as-is, adopter-facing ledger enforcement returns to `auditWiring`. P2s: the symlink containment helper that would actually work is private in `config/load.ts`, which is outside Targets and the Conflict Surface, while the exported `containedPath` is write-oriented and checks the parent rather than a final symlink; and "two hardcoded paths" survives in Goals and FR-2 prose where the corrected metric says three. |
| 1   | 2026-07-27 | 6.28  | ITERATE | **First independent round on the split-out PRD, and the lowest of the three.** Seven [P1]s. Two are design errors the split created rather than carried: **(C)** the repository-local ledger and decision record became hard requirements of `auditWiring`, which `gate check --wiring` runs for every adopter, so a fresh adopter fails as unclassified or missing-record and `gate init --practices` installs neither file; **(D)** the `method-pending` classification the split forced is contradicted by the state machine — `gate check --wiring` already exists, so the replacement is not pending — and PRD-026's forward targets contain neither the ledger nor the ADR, so the gate goes red after the deletion regardless. **(A)** the "closed grammar" written to answer iteration-6 finding U is enumerated but not lexically closed: no tokenization, quoting, escaping, or option arity, and the bundle rule says "parse structurally" without saying what it accepts. **(B)** `verifyScriptPattern` is a regex over script *names* and cannot select an unregistered *filename*, so the on-disk direction has no falsifiable predicate. **(E)** every ledger deny fixture can be red because ADR-0002 is simply absent. **(F)** FR-6 targets a test the Conflict Surface omits and PRD-021 claims. **(G)** the released-config rollback would break an adopter's config load, because validation rejects unknown keys. Confirmed: the three-surface delta, the zero-current-impact claim, the CI narrowing, the config keys, and that finding T was carried to the correct successor — this PRD's floor command survives it. |

---

## Verdict

**ITERATE — 7.08/10, iteration 4, scored independently by Codex.**

Every closure from the remediation held; the score fell anyway because the round went a
layer deeper and the grammar produced new defects for the fourth consecutive round. That
trajectory — enumerate, then lexer, then segmentation and arity, then per-interpreter
semantics — is the measured signature of a scope error being reported as a sequence of
specification errors (`scope-out-the-layer-the-rounds-keep-hitting`). Iteration 3's "one
focused remediation round should clear this" was wrong, and the honest correction is
structural, not another wording pass: the owner should either narrow the accepted
grammar radically or extract it into an approved design artifact before this PRD is
re-scored. Everything outside the grammar is done.

*(Iteration 1 verdict, for history: ITERATE 6.28 — the ledger-ownership design error.
Resolved by the owner's relocation decision; no longer describes the document.)*
