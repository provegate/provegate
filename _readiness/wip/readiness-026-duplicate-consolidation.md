# Readiness Assessment: PRD-026 — Duplicate Consolidation

> **Iteration 2 (Codex, independent) — 6.54/10, DOWN 0.31.** D, F, G and H closed, but the
> **new FR-8 — the class ledger, written in one pass — carries five of the seven [P1]s.**
> The pattern this wave keeps producing is now unmistakable: remediated material improves,
> newly written material regresses.
>
> <details><summary>Iteration 1 (6.85 ITERATE)</summary>
>
> **Iteration 1 (Codex, independent) — 6.85/10, ITERATE.** The strongest of the three split
> items on technical depth, and the highest score. Its blocking finding is the mirror of
> PRD-025's: **the split left the class ledger and decision record out of the forward
> deletion**, so PRD-025's surviving audit goes red the moment this PRD lands. Two
> reviewers found that seam independently, from opposite sides.

> </details>

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-026-duplicate-consolidation.md`  |
| Score                  | 6.54/10                                        |
| Verdict                | ITERATE — seven [P1] items, five of them in the newly written FR-8. The ledger arrived unwired, with a self-contradictory two-store transaction and an impossible rollback state |
| Iteration              | 2                                              |
| Model Tier (Execution) | do not assign — score < 8                      |
| Model Tier (Audit)     | high (on a PASS)                               |
| Scored by              | **Codex (gpt-5.x) via the `/codex` skill — independent, different model family, did not write the PRD** |
| Self-scored            | **no**                                         |
| Date                   | 2026-07-27                                     |
| PRD Lint               | passed — `lintPrd` green by direct invocation against the live config, manifest, PRD and memory store. The CLI wrapper hit `EPERM` refreshing `_state/prds.json` under the read-only sandbox |
| State Record           | updated — `gate status` re-run after saving    |

<!-- Verdict values: PASS | ITERATE | REJECT. The Score row and Verdict row are parsed
by the state builder — keep the `| Score |` and `| Verdict |` labels intact. -->

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Execution (Phase 4) | do not assign | score below the PASS band |
| Audit (Phase 6)     | high | irreversible deletions across a published package plus an adopter migration |

---

## Analysis

### Findings

**[P1] A — the split omitted PRD-025's ledger and decision record from the forward
deletion.** PRD-025 requires every script to appear in `script-classes.json`, treats an
entry whose script disappears as **stale**, and mechanically compares the ledger against
the decision record's table. This PRD deletes three scripts and targets neither store. Its
own rollback acknowledges both must be restored, which exposes the missing forward half. As
written, **PRD-025's surviving audit goes red immediately after this PRD lands.** Remove the
three rows from both stores inside the deletion commit, add both files to Targets and the
Conflict Surface, and add a semantic test.

**[P1] B — forward CI replacement is incomplete and the manifest wiring is not executable
from the specification.** CI currently runs the three aliases being deleted
(`ci.yml:64-77`, `package.json:32-36`). FR-4 says only to *add* a built-CLI sweep; it never
removes those steps, though the rollback says to restore them. It also never enumerates the
exact manifest phase or sweep commands, while claiming every manifest command resolves to a
`package.json` script — a direct `node …/dist/cli.js check --…` does not. State the exact
phase-4 command list, explicitly replace the three CI steps, and run the surviving
`gate check --wiring` against the resulting repository.

**[P1] C — FR-1 ports the review surface without its selection and binding predicates.**
The deleted script selects Markdown basenames starting `review-` and excludes templates
(`verify-review-artifact.mjs:10-12`). The package validator checks PRD identity only when
`expectedId` is supplied, and `validateReviewArtifactFile` defaults it away
(`review.ts:89-95, 124-134`). FR-1 says "every record" and tests only pass-with-criticals,
so an implementation could scan the wrong files or accept a valid review **for the wrong
PRD**. Specify candidate selection, recursion, template handling, the filename-to-expected-id
derivation, and the matching deny cases.

**[P1] D — the exceptions migration proves schema loading, not a valid wiring state, and
the conversion rule is measurably wrong.** `validateManifest` accepts any object of
non-empty strings (`manifest.ts:247-256`), while `auditWiring` additionally rejects
exceptions for scripts that are **already wired** and for scripts that do not exist
(`wiring.ts:238-255`). The reviewer executed the PRD's own five-survivor mapping: manifest
validation returned no issues, and `auditWiring` then rejected **all five as stale**,
because in this repository they are wired. The conversion must drop removed **and
already-wired** entries, map only still-unwired survivors, and be proved through
`auditWiring` rather than `loadManifest`.

**[P1] E — six is not the complete document count under FR-6's own boundary.** The six
listed documents are real, but an exact-token search also matches `STATUS.md:71,75,77`,
leaving **seven** live Markdown files once the source snapshot and per-work-item artifacts
are excluded. Six is defensible only if `STATUS.md`'s historical activity section is
explicitly excluded — PRD-021 already sets that precedent (`prd-021:539-546`). As written,
the count, the targets, and the test boundary disagree.

**[P1] F — the Conflict Surface rests on a false `sharedAppendOnly` assumption.** The PRD
excludes `AGENT_BOOTSTRAP.md` and `_prds/README.md` as "shared". The default shared set is
the exact paths `README.md`, `CLAUDE.md`, `AGENTS.md` (`defaults.ts:95`), and conflict
subtraction uses exact canonical-string membership (`conflicts.ts:63-69, 93-97`). Neither
target is shared; both must be claimed. FR-7 also targets
`test/changeset-entry.test.ts`, which the Conflict Surface omits.

**[P1] G — FR-5's pack-manifest verification row names the wrong test.** The shipped-file
allowlist is loaded and compared against `npm pack` by `test/pack.test.ts:35-45`. The row
runs `test/practices-pack.test.ts`, which exercises installed pack behavior, not the
allowlist. The floor would eventually catch it, but the per-FR evidence cannot fail for its
stated reason. Add `test/pack.test.ts` to FR-5's targets and rows.

**[P2] H — the "two parsers to one" metric is too broad.** The package already has two
Durable Artifacts readers, `declaredArtifacts` and `declaredArtifactsStrict`
(`durable.ts:12-13, 40-46`), whose split is a recorded deferral. Deleting the script leaves
one shared **token extractor**, not one section reader. Narrow the metric or acknowledge
the retained split.

**[P2] I — "non-empty justification" is only a length check.** `manifest.ts:251` accepts
whitespace. If "justify or drop" is meant semantically, require trimmed non-empty text and
add a whitespace case; otherwise describe the actual contract.

### What Codex confirmed

`initWorkspace(config, root, { extra: planPractices(...) })` is the real production pair,
writes use the exclusive-create flag, and removed map paths appear in **neither** report
list — the corrected assertion is right. Both positive controls independently exercise the
skipped and created branches. Root bundle arithmetic is **8 → 5** and packed is **6 → 3**.
Exactly four installer-map entries, four drift-ledger pairs, and four pack-manifest rows
accompany the packed deletion. The packed exceptions file holds eight names: three removed,
five survivors. The five-step migration is consistently numbered, and the fresh-versus-existing
adopter distinction is correct. All six documents FR-6 names genuinely contain deleted-check
references — the issue is completeness, not false positives. **No §11 row invokes a script
this PRD deletes**, and `pnpm verify:workflow` survives.

---

## Scorecard

Class `infra` weights, per `packages/provegate/prompts/phase-2-readiness-scorer.md`.

| #         | Dimension                | Weight | Score      | Notes |
| --------- | ------------------------ | ------ | ---------- | ----- |
| 1         | Clarity                  | 15%    | 6.5/10     | Most targets are precise; forward ledger cleanup, CI replacement, manifest commands, and the review-sweep predicates are underspecified. |
| 2         | Completeness             | 20%    | 6.5/10     | Strong carry-over, but PRD-025's ledger contract, one live document, and the existing CI steps are missing from the forward change. |
| 3         | Technical Depth          | 20%    | 7.3/10     | The installer and executor analysis is excellent; the exception fixture stops at manifest loading instead of the executing audit. |
| 4         | Multi-Tenancy & Security | 10%    | 9.0/10     | No tenant, auth, protected-route, network, dependency, payload, or push surface. |
| 5         | Scope & Testability      | 15%    | 6.2/10     | Positive controls are well designed, but one row names the wrong test and the review sweep can pass with a weakened predicate. |
| 6         | Migration & Rollback     | 20%    | 6.4/10     | Manual migration is honestly stated; exception conversion is not semantically valid for wired survivors and the forward/rollback surfaces are asymmetric. |
| **Total** | **Weighted**             |        | **6.85/10** | **ITERATE** |

Weighted sum:
`0.15×6.5 + 0.20×6.5 + 0.20×7.3 + 0.10×9.0 + 0.15×6.2 + 0.20×6.4`
= `0.975 + 1.300 + 1.460 + 0.900 + 0.930 + 1.280 = 6.845` → 6.85.

Hard caps: none tripped. Security, contract, runtime-dependency, push-path, network and
method-content caps checked explicitly; the lint cap is waived for the read-only round with
`lintPrd` green by direct invocation.

---

## Missing Pieces (watch items — binding on Phase 3 and Phase 6)

- Include PRD-025's class ledger and decision record in the forward deletion contract, with
  one PRD owning the transition.
- Specify the exact CI removals, manifest commands and phases, and execute the surviving
  wiring audit against the post-change repository.
- Close the review sweep's file-selection and expected-id predicates.
- Run the exception conversion through `auditWiring`, dropping already-wired survivors.
- Reconcile the document count and boundary, and complete Conflict Surface ownership.
- Point FR-5 at `test/pack.test.ts` and narrow the parser metric.

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 2   | 2026-07-27 | 6.54  | ITERATE | **Second independent round. The score went DOWN 0.31, and the cause is isolated: the newly written FR-8 carries five of the seven [P1]s.** D (exception conversion), F (conflict surface), G (pack test) and H (parser metric) **CLOSED**; A, B, C, E **PARTIALLY CLOSED**; I **OPEN**. **FR-8's defects:** **(O)** the ledger check is an **unwired gate** — FR-8 says it is "wired like any other" and names no executing surface, FR-4's enumerated manifest does not contain it, and `auditWiring` rejects an unwired `verify:` script (`wiring.ts:238-247`). Adding it to the root bundle makes the final count **six**, contradicting FR-3's five in three places. **(P)** the two-store transaction contradicts itself: the deleted scripts are "never written" to the ledger **and** the deletion commit "removes their rows from both stores". Both cannot hold. ADR-0002 is also absent from FR-8's Targets while Implementation Scope says it changes — and Codex **verified** that adding it makes `lintPrd` fail, because `adr-section-blank-line-reads-empty` watches `_brain/adr/**` and the PRD declares no disposition for it. **(Q)** the rollback assigns an impossible state: it restores the three scripts as `method-pending` while explicitly keeping the package-side sweeps, so the replacement exists and pending is false, while `method` fails by its own rule. It also still cites "PRD-025's ledger" and "PRD-025 FR-1" after ownership moved. **(R)** FR-8's only verification row runs the live check, which cannot perform the mutate-one-green-baseline fixtures it requires. **Outside FR-8:** **(S)** FR-4's "enumerated" manifest is **byte-identical to the current `gates.manifest.json:3-10`**, so the promised replacement is a no-op — and it contradicts User Story 3, which says the manifest names the sweeps. **(T)** FR-1's `^review-.*\.md$` accepts `review-x.template.md`; the deleted script excludes templates separately (`verify-review-artifact.mjs:10-12`), so the PRD cannot satisfy its own template deny case. **(U)** the FR-6 boundary is still unreconciled — metric seven, Implementation Scope six, acceptance criterion omitting the STATUS exclusion — and three further historical documents were found that the exclusion predicate does not name. |
| 1   | 2026-07-27 | 6.85  | ITERATE | **First independent round on the split-out PRD; the highest of the three and the strongest on technical depth.** Seven [P1]s. The blocking one is a seam the split created: **(A)** PRD-025's ledger treats an entry whose script disappears as stale and compares itself to the decision record, but this PRD deletes three scripts and targets neither store — so PRD-025's audit goes red the moment this lands. Its own rollback names both files, which is how the missing forward half was found. Two reviewers found this seam independently from opposite sides. Also: **(B)** FR-4 adds a CLI sweep without removing the three CI steps it replaces, and never enumerates the manifest commands, while claiming all of them resolve to package scripts — a direct `node dist/cli.js` invocation does not; **(C)** FR-1 says "every review record" without the selection or expected-id predicates the deleted script had, so a valid review for the *wrong* PRD could pass; **(D)** the exception conversion was executed by the reviewer and **all five survivors were rejected as stale**, because `auditWiring` also refuses exceptions for already-wired scripts — the rule must drop wired survivors and be proved through the audit, not the loader; **(E)** an exact-token search finds a **seventh** live document, `STATUS.md`, unless its historical section is explicitly excluded as PRD-021 already does; **(F)** the two paths excluded as "shared append-only" are not in the default shared set, which is matched by exact canonical string; **(G)** FR-5's row names `practices-pack.test.ts` where the allowlist is actually asserted by `pack.test.ts`. Confirmed: the executor pair, both positive controls, the 8→5 and 6→3 arithmetic, the four-way pack pairing, the eight-name exceptions file, the five-step migration, and that no row invokes a script this PRD deletes. |

---

## Verdict

**ITERATE — 6.85/10, iteration 1, scored independently by Codex.**

The repaired contracts carried over correctly — the executor-based fixture, the positive
controls, the five-step migration and the corrected arithmetic all survived independent
verification. What remains is one split seam shared with PRD-025 and a set of predicates
that were named but not closed. Finding D is the most valuable of the round because it was
**executed rather than reasoned**: the documented conversion produces a manifest the loader
accepts and the audit rejects, which no amount of reading would have shown.
