# Readiness Assessment: PRD-022 — Control-Artifact Revalidation Beyond the Claim

## Quick Meta

| Field                  | Value |
| ---------------------- | ----- |
| PRD                    | `_prds/wip/prd-022-control-artifact-revalidation.md` |
| Score                  | 9.10/10 |
| Verdict                | PASS |
| Iteration              | 4 |
| Model Tier (Execution) | high |
| Model Tier (Audit)     | high |
| Scored by              | independent agent (GPT-5.6 Terra) |
| Self-scored            | no |
| Date                   | 2026-07-25 |
| PRD Lint               | passed — `node packages/provegate/dist/cli.js check PRD-022` exit 0 |
| State Record           | updated — `gate status` recorded PASS · 9.10 |
| Dependency             | PRD-018 must be Ship Verified before Phase 4; PRD-022's shared surfaces require explicit sequencing |

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Phase 4 (Execution) | high | The design spans CLI orchestration, worktree provenance, byte-preserving extraction, real-git integration testing, and method documentation. |
| Phase 6 (Audit)     | high | Audit the claim-path byte contract and run/land side-effect boundary with the real-git fixture. |

---

## Analysis

### 1. Technical Depth & Architecture

The central current-state claim is only partly accurate. `open.ts` does invoke
`snapshotsNotMatchingRef()` and `snapshotsMissingFrom()` in its **reused-worktree**
path, but those helpers live in `run/worktree.ts` and merely return a list of mismatched
`ArtifactSnapshot`s. They are not the claim-path decision primitive. `open.ts` constructs
`requiredArtifacts` locally (the PRD plus the control files present locally or on the
base), deduplicates the two helper outputs locally, and formats the refusal locally.
Fresh worktree provisioning has a separate `snapshotsNotMatchingRef()` refusal in
`createWorktree()` with different text.

This is material rather than nomenclature. A later `gate run`/`gate land` has no
`requiredArtifacts` snapshot persisted in the lease. FR-1 does not say whether
revalidation reconstructs the union of local/base control-file presence, validates the
current checkout's parsed config/manifest bytes, or uses a claimed-time snapshot. An
implementation cannot prove additions, deletions, and local edits have the intended
meaning without that contract.

The named runtime seams are also wrong. Both `gate run` and `gate land` enter through
`runRun()` in `packages/provegate/src/cli.ts`; `gate land` is `runRun(...,
{ mergeOnly: true })`. `chain.ts` builds and executes generic gates and `merge.ts`
performs the eventual local merge, but neither receives the worktree lease context or
is the first shared command boundary. A check inserted before `runChain()` in `runRun()`,
after fail-closed worktree-stamp parsing, can precede phase commands, archive, and merge.
FR-2/FR-3 do not name that target.

PRD-018 FR-6 accurately states the residual: only a new claim in `open.ts` revalidates
control artifacts, while a continued worktree's `gate run`/`gate land` does not. Its
claimed PRD-022 boundary matches that residual. The PRD-018 text does not, however,
supply the missing runtime snapshot contract for this PRD.

### 2. Edge Cases & Failure Modes

The desired order is achievable at the actual CLI seam: verify before `runChain()` so no
Phase 4/5 command and no chain metric/state row is written, and before the later archive
and `mergeToLocalBase()` calls. The current PRD fails to bind that seam or to require a
real CLI/worktree fixture proving it. `chain.test.ts` exercises `runChain()` directly
with temporary non-git roots; `merge.test.ts` calls `mergeToLocalBase()` directly. Neither
can establish that `gate run` or `gate land` rejects a stamped worktree before their
respective boundary.

“Same message” is not presently a single thing. The reuse refusal in `open.ts` begins
`claim rolled back: the checkout at ...`, while `createWorktree()` emits
`these workflow artifacts are missing or uncommitted ...`. FR-1 simultaneously requires
a shared formatted refusal and byte-identical claim behavior without choosing which
existing message is canonical or naming every call site whose bytes must remain fixed.

The stated non-worktree boundary is sensible, but the matching case’s “same stdout as
before this PRD” is not a mechanically obtainable baseline unless the fixture captures a
pre-change binary/result. Tests should assert the unchanged observable contract instead
(successful exit, no refusal text, and the expected command/merge behavior).

### 3. Maintainability & DX

All five FR rows have runnable, allowlisted `pnpm` commands, their named test files
exist, and the commands passed in this checkout. The lint passed. This is insufficient
coverage: `content-launch.test.ts` does not read `apps/docs/content/docs/method.mdx`, so
the FR-5 row cannot prove the new method-boundary wording. A direct content assertion is
needed.

The Conflict Surface silently understates a real overlap with PRD-018: both PRDs claim
`open.ts`, `chain.ts`, `merge.ts`, their associated tests, and the method docs. Calling
`open.ts` and `method.mdx` “not claimed exclusively” is not a coordination mechanism;
PRD-018 still lists them in its surface. The declared ordering is a preference, not a
machine-enforced prerequisite. PRD-021 has no equivalent direct source/test collision
with PRD-022’s declared surface; its root-file claim loss in `declaredGlobs` is real but
does not hide a PRD-022 root-file write.

### 4. Migration & Rollback

The rollback is plausibly simple once the runtime location is correct: revert the
shared command-boundary check and retain a behavior-preserving extraction. There is no
data migration or deployment ordering beyond PRD-018's control-artifact introduction.
However, rollback and normal behavior remain underspecified until FR-1 declares how a
missing local control artifact versus a newly present base artifact is compared. The
implementation must preserve the base-ref pinning model and avoid reloading a different
policy after the comparison.

### 5. Iteration 2 Assessment

The iteration-1 analysis above is retained for reference. The revision resolves four of
its five watch items with source-backed corrections.

**W1 — resolved.** FR-1 now matches `open.ts`: `mainForRefs` identifies the main
checkout; `baseRefName` resolves one base revision for worktree claims; the PRD snapshot
is initially required; and each control file is added when present either locally or on
the pinned base. The snapshot hashes `configSourceFor(root)` /
`manifestSourceFor(root)` bytes already parsed by the loaders. Its union-presence,
local-deletion, base-addition, and PRD-exclusion rules are correct. Unparseable config or
manifest fails before comparison through `loadConfig()` / `loadManifest()`, as intended.

**W2 — resolved for execution side effects.** `main()` dispatches both `run` and `land`
to `cli.ts::runRun`; land passes `{ mergeOnly: true }`. `worktreeStamps()` and its
malformed-lease refusal occur before `runChain()`, while phase commands and metric
appends are in `runChain()` and archive/`mergeToLocalBase()` are later. The new seam is
therefore upstream of every phase command, chain metric, archive, and merge. `--dry-run`
returns before stamps, which FR-4 accurately preserves. `findRecord()` does write the
checkout-local `_state/prds.json` snapshot first, so the PRD's phrase “every chain state
write” must not be widened to every state write.

**W3 — resolved.** The quoted reuse core matches `open.ts:787`; it follows the preserved
`claim rolled back: ` prefix and ends with the merge-or-rebase remedy. The separate
`createWorktree()` initial-provisioning refusal really begins `these workflow artifacts
are missing or uncommitted ...`; it is a different case and need not be unified.

**W4 — partially resolved.** A new `test/revalidate.test.ts` is a feasible home: it can
reuse `cli-state.test.ts`'s built-`dist/cli.js` subprocess pattern and `open.test.ts`'s
real-git worktree setup, and it can directly read `method.mdx`. But the file does not
exist. The allowlisted `pnpm --filter provegate test test/revalidate.test.ts` command
therefore exits 1 (“No test files found”) for FR-1, FR-2, FR-4, and FR-5. `open.test.ts`
for FR-3 passes. The contract requires runnable commands, not merely plausible future
ones.

**W5 — resolved.** PRD-018's actual Conflict Surface claims `chain.ts`, `merge.ts`,
their tests, root config/manifest, and `method.mdx`; it does not claim `open.ts`,
`worktree.ts`, `cli.ts`, or `revalidate.test.ts`. Thus `method.mdx` is the sole direct
overlap. PRD-021 claims none of PRD-022's five paths. The exclusive method-doc claim and
Ship-Verified prerequisite are now a real serialization mechanism.

New issue: `cli.ts` currently imports the run API from `core/run/index.ts`, whose
explicit worktree export list lacks the proposed primitive. The PRD must name a concrete
primitive and either add that barrel file to Scope/Conflict Surface or explicitly use a
direct `worktree.ts` import; otherwise the implementation must invent an unclaimed API
change.

### 6. Iteration 3 Assessment

**W4 remaining — resolved.** The missing future test file is not a defect in a PRD for
creating that file. FR-4 now gives an implementer a constructible fixture: a temporary
git repository, committed config/manifest and workflow artifacts, a built-CLI
`gate open --worktree` claim, a base-side manifest commit, and independent evidence.
`node ` is allowlisted in `DEFAULT_CONFIG.commands.allowedPrefixes`; `runOpen()` forwards
`--worktree` to `claimPrd()`; and the existing built-CLI and real-git fixture patterns
make that construction workable. The marker is inspectable in the linked worktree, the
metrics JSONL is inspectable at its configured state path, and the archive/merge claims
are independently inspectable with `git log`. `test/revalidate.test.ts` correctly does
not exist yet.

**W6 — not resolved.** The barrel requirement is now correct: every current runtime
import in `cli.ts` is from `./core/run/index.js`, `run/index.ts` is the appropriate
public re-export point, and both callers can supply the named arguments. `open.ts` has
`baseRefName`, `wtNames.relPath`, and `wtNames.branch` at the reuse call; `runRun()` has
`root`, `config`, and stamped `worktree`/`branch`. But the proposed signature does not
make the byte-identical claim safe. `extra?: ArtifactSnapshot[]` does not state that
extras are retained first in today's `[PRD, config, manifest]` order, nor how duplicates
between extras and derived controls are removed before the two comparator outputs are
combined. Those choices control the ordered `<list>` in FR-3's preserved refusal.
The primitive must explicitly define ordered input union and final deduplication, or
the extractor may change a promised message while satisfying the types.

**W7 — resolved.** `runRun()` loads config/manifest, then `findRecord()` invokes
`buildState()` and `writeState()` before `worktreeStamps()`. The PRD now acknowledges
that checkout-local derived snapshot and narrows the promise to no phase command and no
chain metric row. That is honest for the stated boundary; it does not misleadingly
promise zero state writes.

**New W8 — malformed policy can preempt the malformed-lease refusal.** In current
`runRun()`, `loadManifest(config, root)` runs before both `findRecord()` and
`worktreeStamps()`. A malformed `gates.manifest.json` therefore throws before the
FR-2 seam, contrary to FR-2/DO NOT's statement that an unreadable lease “still refuses
first.” The spec needs an explicit ordering decision and implementation design: either
move/guard manifest loading so the malformed stamped lease is checked first, or narrow
the promise and test the actual precedence. The revalidation primitive also needs a
specified source for the already-parsed manifest bytes at its call boundary.

---

### 7. Iteration 4 Assessment

**W6 — resolved.** FR-1 now reproduces the existing reuse construction in the only
order that affects the observable refusal: claim-only `extra` (the PRD blob), then
`CONFIG_FILENAME`, then `MANIFEST_FILENAME`; comparator output from
`snapshotsNotMatchingRef(...)` precedes output from `snapshotsMissingFrom(...)`; and
the combined list is reduced by first occurrence. This is exactly the construction in
`open.ts:772-778`, including its
`.filter((rel, i, all) => all.indexOf(rel) === i)` semantics. The PRD also correctly
keeps `extra` caller-supplied, so `run` and `land` cannot accidentally introduce the
PRD blob into their checks. An extraction following this contract preserves the
reuse-path core's joined artifact-list bytes.

**W8 — resolved.** The revised precedence is the current one, not an aspirational
lease-first order. `runRun()` calls `loadConfig()` and `loadManifest()` at
`cli.ts:627-628`; only after the dry-run return does it call `worktreeStamps()` at
`cli.ts:676`, and the proposed drift check is immediately before `runChain()` at
`cli.ts:692`. Thus an unparseable checkout control file remains a loader error, a
malformed lease remains the next refusal, and drift is third. The claimed deletion
case is real: `loadManifest()` explicitly returns `defaultManifest(config)` when
`gates.manifest.json` is absent (`manifest.ts:261-268`), so deleting the local manifest
does not itself fail loading and must be caught by the revalidation comparison against
the base-side blob.

No new consequential issue found. The PRD's primitive contract, caller inputs,
precedence, fixture construction, byte-preserving claim assertion, and rollback are
coherent with the current source. The proposed test file is deliberately new and is
therefore evaluated as a specification rather than as an existing working-tree file.

---

## Scorecard

Class `infra` weights from `packages/provegate/prompts/phase-2-readiness-scorer.md`;
no repository-root `gates.manifest.json` exists, so no class-specific manifest override
is available.

| #         | Dimension                | Weight | Score    | Notes |
| --------- | ------------------------ | ------ | -------- | ----- |
| 1         | Clarity                  | 15%    | 9.0/10   | Concrete symbols, ordered-union/dedup semantics, exact refusal ownership, runnable commands, and no open questions let an implementer proceed without inventing behavior. |
| 2         | Completeness             | 20%    | 9.0/10   | Covers base additions, local deletion, local parse failure, malformed lease, recovery, dry-run, unstamped leases, and read-only boundaries. |
| 3         | Technical Depth          | 20%    | 9.0/10   | Pins a base revision, preserves parsed-byte provenance, isolates the shared seam, and exactly preserves existing comparator ordering. |
| 4         | Multi-Tenancy & Security | 10%    | 9.0/10   | No tenant or protected API surface is involved; fail-closed behavior and explicit existing-error precedence avoid weakening safety. |
| 5         | Scope & Testability      | 15%    | 9.5/10   | The built-CLI, real-git fixture uses independent marker, metric, archive, merge, and direct-document evidence. |
| 6         | Migration & Rollback     | 20%    | 9.0/10   | PRD-018 Ship-Verified ordering, behavior-preserving extraction, and a two-call-site revert are explicit; no data migration exists. |
| **Total** | **Weighted**             |        | **9.10/10** | **PASS** |

Weighted sum:
`0.15×9.0 + 0.20×9.0 + 0.20×9.0 + 0.10×9.0 + 0.15×9.5 + 0.20×9.0`
= `1.35 + 1.80 + 1.80 + 0.90 + 1.425 + 1.80 = 9.075`, rounded to **9.10**.

Hard caps checked:

- **Security cap:** not triggered — no protected route, endpoint, or query path is added or touched.
- **Contract cap:** not triggered — no new client→server payload is introduced.
- **Lint cap:** not triggered — `node packages/provegate/dist/cli.js check PRD-022` exited 0.
- **ProveGate method caps:** no runtime dependency, network/telemetry path, or push path is specified.

---

## Missing Pieces (watch items)

None. W6 and W8 are resolved, and this re-score found no remaining consequence-level
ambiguity to turn into a watch item.

---

## Iteration History

| # | Date       | Score    | Verdict | Key Changes |
| - | ---------- | -------- | ------- | ----------- |
| 1 | 2026-07-25 | 6.33/10  | ITERATE | Initial independent scoring. Lint and stated commands pass, but measured runtime ownership is `cli.ts::runRun`, not the named `chain.ts`/`merge.ts` seams; snapshot provenance and integration proof are unspecified. |
| 2 | 2026-07-25 | 7.43/10  | ITERATE | W1, W2, W3, and W5 resolved: derivation, shared CLI seam, canonical refusal, and exclusive method-doc overlap now match source. W4 is partial because the new fixture is absent and four FR commands fail; the primitive export path and state-write wording remain unspecified. |
| 3 | 2026-07-25 | 7.55/10 | ITERATE | W4 and W7 resolved: the new test is specified well enough to create, and the earlier derived-state write is honestly bounded. W6 remains because `extra` ordering/dedup cannot guarantee byte-identical refusal text; new W8 finds manifest parsing currently precedes the promised malformed-lease check. |
| 4 | 2026-07-25 | 9.10/10 | PASS | W6 now exactly specifies `extra → config → manifest`, comparator ordering, and first-occurrence final dedup, preserving the claim refusal bytes. W8 now reports actual loader → lease → drift precedence, including the real absent-manifest `defaultManifest()` deletion path. No new consequential issue found. |

---

## Project-Specific Checklist

- [x] Used `infra` weights; no root `gates.manifest.json` exists to override them.
- [x] Ran the required lint via built CLI; it exited 0.
- [x] Verified PRD-018 FR-6 accurately defers the continued-worktree residual to PRD-022.
- [x] Verified the FR-1 derivation against `open.ts`: main root, pinned base ref, union-presence control files, and parsed source bytes all match.
- [x] Verified `gate run` and `gate land` both dispatch to `cli.ts::runRun`; dry-run returns before stamps, while phase metrics/archive/merge occur after the proposed seam.
- [x] Verified FR-3's quoted reuse core and the distinct `createWorktree()` provisioning refusal against source.
- [x] Verified `cli-state.test.ts` supplies the built-CLI fixture pattern, `worktree.test.ts` supplies the real-git claim pattern, and `open.test.ts` confirms the live CLI's `open` path; the new fixture is sufficiently specified to create.
- [x] Verified `node ` is in the allowed command prefixes, and marker file, metrics rows, and branch/base logs are independently inspectable evidence.
- [x] Verified every present `cli.ts` run import comes from `./core/run/index.js`, `run/index.ts` is the correct re-export surface, the proposed caller variables are available, and FR-1 now specifies ordered union plus first-occurrence deduplication.
- [x] Verified `findRecord()` writes `_state/prds.json` before `worktreeStamps()` and that the PRD bounds its promise to phase commands and metrics.
- [x] Verified `loadManifest()` executes before `worktreeStamps()` and the revised PRD correctly preserves that loader-first ordering before malformed-lease and drift refusals.
- [x] Verified only `method.mdx` overlaps PRD-018's actual Conflict Surface; PRD-021 has no direct overlap.
- [x] Confirmed no runtime dependency, network/telemetry, remote push, protected route, or payload contract is in scope.
- [x] Verified W6 against `open.ts:772-778`: `requiredArtifacts` is ordered PRD/config/manifest, comparator results are ordered base/checkout, and `.filter((rel, i, all) => all.indexOf(rel) === i)` keeps first occurrences.
- [x] Verified W8 against `cli.ts:627-628`, `cli.ts:676`, and `cli.ts:692`: loaders precede lease parsing, which precedes the inserted drift check; no ordering change is promised.
- [x] Verified `loadManifest()` returns `defaultManifest(config)` when the manifest path is absent, so a locally deleted manifest remains a genuine revalidation scenario.

---

## Verdict

**PASS — 9.10/10.** W6 makes the extraction's ordered artifact input, comparator output,
and first-occurrence reduction identical to the current reuse path, so FR-3's
byte-preserving promise is implementable. W8 accurately preserves existing loader →
malformed-lease → drift precedence, and the absent-manifest fallback proves the deletion
fixture exercises a real gap. No hard cap is triggered and no new consequential issue
was found; proceed to Phase 3 after the stated PRD-018 Ship-Verified prerequisite.
