# Independent Review: PRD-034 — Prompt Store Reconciliation

> **PRD:** PRD-034
> **Verdict:** pass
> **Reviewer:** independent Codex sessions — did not write the PRD, the readiness scores, or the implementation
> **Tool/Model:** GPT-5 via codex-cli 0.145.0, read-only sandbox, high reasoning effort; final sessions `019fad50-492b-7c33-a36d-69318823260a` (round 4) and `019fad56-e455-7933-8110-c0763b78ebce` (round 5)
> **Base SHA:** 9789381b7b8c6bb31f4acb79496ec41e722291c7
> **Diff range:** 9789381..9f25db2 (five commits: bf942eb, 080ec4a, 5d5ac9c, 311c99d, 9f25db2)
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass
> **Rounds:** 5 — round 1 GATE: FAIL (six [P1]); round 2 GATE: FAIL (two new [P1], four round-1 closures confirmed); round 3 GATE: FAIL (two new [P1], both round-2 closures confirmed); round 4 GATE: PASS Critical: 0 with two [P2] advisories; round 5 GATE: PASS, both advisory closures confirmed genuine, no findings

## Independence

The reviewer is a sequence of separate Codex sessions with no implementation context:
the PRD was authored by the owner and orchestrating sessions, readiness was scored by
eight fresh Codex scorers across nine iterations, and the implementation was written by
the Claude session that transcribed this artifact from the reviewer's verbatim round
outputs (retained in scratchpad transcripts). Every verdict line and every finding
below is the reviewer's. Each round received the full branch diff as data plus the
normative spec paths, and read the repository itself in a read-only sandbox; rounds 2–5
were explicitly instructed to verify prior closures rather than trust the changelog —
`a-rule-corrected-survives-where-it-is-restated` briefed as sweep, not hunt.

## Findings

Ranked most-severe first. All are **closed**; the counts above are the post-fix state.
Every closure was re-verified by a later round.

- **[P1] round 1 · `reconcilePrompts` — realpath-ENOENT collapsed to `missing`, bypassing
  containment.** A dangling leaf symlink to outside, or a missing leaf beneath an
  outside-pointing symlinked parent, reported a normal `missing` finding instead of
  failing closed. Fixed (080ec4a): on ENOENT the nearest existing ancestor must
  realpath inside the repository and a dangling link fails closed; two fixtures added.
- **[P1] round 2 · the round-1 fix missed the dangling INTERMEDIATE symlink.** A dangling
  parent link made every child read as absent (lstat follows parent links), so the
  leaf-only lstat check climbed past the link and still reported `missing`. Fixed
  (5d5ac9c): `danglingOnChain` walks the whole chain — the deepest component lstat sees
  but realpath cannot resolve fails the run closed; dangling-parent fixture added.
- **[P1] round 3 · TOCTOU in the read + an ENOENT branch that skipped the chain.** The
  read reopened the mutable planned path after validation, and a read-time ENOENT was
  classified `missing` without the containment chain. Fixed (311c99d): the read targets
  the validated realpath and a mid-run vanish fails closed naming the concurrent
  change. The residual swap-of-resolved-target race is the adversarial
  concurrent-writer class the PRD-022 deferral records — accepted with the same
  posture, recorded in the task file's Deferrals & Decisions.
- **[P1] round 1 · `--assert-ci-order` matched comment lines.** The hygiene-job comment
  quoting the build command satisfied the assertion — deleting the real build step
  stayed green. Fixed (080ec4a): only `run:` lines count; mutation-probed red.
- **[P1] round 2 · the run-line fix admitted same-line compounds.** Equal indexes
  (`buildAt === aggregateAt`) passed, so `run: pnpm verify:workflow; pnpm --filter
  provegate build` — aggregate first — returned PASS. Fixed (5d5ac9c): strictly
  earlier required; mutation-probed red.
- **[P1] round 3 · substring presence is not execution.** `run: echo '…build'` and
  `run: false && …build` satisfied the matcher. Fixed (311c99d): exact one-command
  run lines only; both mutations probed red.
- **[P2] round 4 · trimmed exact-match could still match inside a `run: |` block
  scalar.** Fixed (9f25db2): the matcher pins step-level indentation (exactly 8
  spaces); block content sits deeper and cannot match. Round 5 confirmed the live
  workflow passes and block-scalar, reversed-order and compound mutations fail.
- **[P1] round 1 · `NEXT_STEPS.md` claimed every generated file carries a version
  banner** — false for the two deliberately unbannered paths (the codex snippet and
  `prompts/PLACEHOLDERS.md`, state model Revision 2). Fixed (080ec4a): reworded to
  name both and the `unattributable` consequence.
- **[P1] round 1 · the CLI help under-described the check and its test asserted mere
  flag presence.** Fixed (080ec4a): help names `--prompts: prompt-store staleness
  check`; the test pins the full phrase and asserts no nothing-detects claim.
- **[P1] round 1 · the expiry-boundary suppression fixture lacked the
  independent-cause proof** (`assert-absent-needs-an-independent-cause`). Fixed
  (080ec4a): the bare evaluation is asserted failing before the boundary
  suppressions.
- **[P1] round 1 · the current-tree CLI test used containment, not equality** — extra
  output, duplicate summaries or stray `path: current` lines would have passed.
  Fixed (080ec4a): stdout is asserted equal to exactly the one summary line, stderr
  empty.
- **[P2] round 4 · containment compared case-sensitively** — on a case-insensitive
  volume an in-repository symlink target spelled with different casing was refused as
  an escape (a false refusal, not a hole). Fixed (9f25db2): `volumeIsCaseInsensitive`
  exported from `config/load.ts` (one probe implementation, not re-exported publicly)
  and both containment sites case-fold on insensitive volumes. Round 5 confirmed
  case-sensitive volumes keep exact containment (identity fold).

## Six-surface prose audit

Round 1 inspected all six shipped surfaces directly and found two defective
(`NEXT_STEPS.md`'s banner over-claim; the CLI help under-description) — both fixed.
Round 2 re-ran the sweep and reported the six surfaces consistent: `storeReadme()`,
the `gate init --prompts` printed output, `practices/NEXT_STEPS.md`, the `prompts.ts`
module header, the CLI help, and the `runCheck` usage line each name
`gate check --prompts` as the detector, none claims nothing detects staleness, and the
one-way/no-auto-repair truths survive.

## Verdict rationale

Round 4 reached Critical: 0 after three remediation rounds whose findings each
verifiably closed, and its two advisory findings were fixed and independently
confirmed genuine in round 5 with no new defects. The reconciliation core's read-error
and containment contract now fails closed on every probed escape (dangling leaf,
dangling parent, outside parent, mid-run mutation), and the CI-order gate survives
four mutation probes. The one accepted residue (swap-of-resolved-target race) is
recorded with its PRD-022 precedent rather than silently carried.
