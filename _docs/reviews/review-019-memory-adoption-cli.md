# Independent Review: PRD-019 — Agent Memory Adoption CLI

> **PRD:** PRD-019
> **Verdict:** pass
> **Reviewer:** codex CLI session (independent of the implementing agent)
> **Tool/Model:** OpenAI Codex CLI 0.145.0, reasoning effort high — a different model family from the implementer (Claude Opus 5)
> **Base SHA:** 1624a10e71feafbab1b639ae2458e38cecf02d61
> **Diff range:** 1624a10..HEAD
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single cross-model reviewer)

**The severity counts are OUTSTANDING findings**, which is what the schema means and what
the merge gate reads. Found and remediated in this review: **6 blocking defects** (4 rated
`routine`, 2 `plausible`) and **8 test defects**. None is open.

## How this review was run

One round, and deliberately not a defect hunt. PRD-018's review ran twenty-six adversarial
rounds and produced a measured, non-terminating yield: each remediation was competent and
each created the next round's work at a comparable rate. That artifact records the numbers.

So PRD-019 was reviewed the way PRD-018 was finally decided — as a **readiness assessment**.
The reviewer was given the six guarantees this work item must provide, told to rate every
break by realistic likelihood (`routine` / `plausible` / `adversarial`), asked separately to
hunt tests that do not test what they name, and required to label every claim with a
confidence level and return a close decision rather than a list.

It returned **DO NOT CLOSE**. Every blocking defect it named is now fixed, and this artifact
records what they were, because three of the six were introduced by the implementing agent
during this same session and that is the useful part.

## Findings

Ranked most-severe first. All fixed; each carries a mutation-checked regression unless noted.

- **critical** · `src/cli.ts:762`, `src/core/run/worktree.ts:668` — **the lease fix did not
  release the lease.** `worktreeStamps` sets `file` to a BASENAME; `unlinkSync` resolved it
  against the process cwd, hit `ENOENT`, and the "already gone counts as released" branch
  reported success while the lease survived — so the handoff card said `lease released` and
  the next overlapping claim was refused. Likelihood **routine**: every worktree close.
  Fixed by carrying `leasePath` separately; a relative lease path is now refused by name
  rather than treated as success.
- **critical** · `src/core/memory/doctor.ts:289` — **the doctor reported green on an install
  whose validator does not exist.** It checked that the package-script KEY was defined and
  never that the script's body resolved, so `"verify:brain": "node x"` with no `x` passed
  while Phase 7 would fail at the shell — a doctor disagreeing with the gate it exists to
  predict. Likelihood **routine**. The check now resolves the runner's target with or
  without a file extension; keying on `.mjs` let `node x` through, which was the exact shape
  the shipped fixture used.
- **critical** · `src/core/memory/find.ts:139` — **recall returned partial results from an
  unclean store.** `store.issues` and `store.unreadable` were ignored, so a dangling pointer
  produced hits that read as a complete answer. Likelihood **routine**. It refuses now and
  names the repair.
- **critical** · `src/core/memory/doctor.ts:116` — **path handling disagreed with the gates
  in two directions.** Raw configured paths were passed to `resolve` while the config
  validator and store loader both accept backslash spellings, and `escapesRoot` hard-coded
  `/` so a contained Windows entrypoint read as outside the repository. Likelihood
  **routine** on Windows, **plausible** for a portable shared config. Both canonicalize now.
- **major** · `src/core/memory/find.ts` — **selector containment was lexical only**, so an
  in-repository symlink pointing at an external directory was accepted. Likelihood
  **plausible**. Checked on the filesystem now — but only for paths that EXIST, because a
  selector may legitimately name a file the branch is about to create, and refusing that
  would refuse correct work.
- **major** · `src/core/memory/find.ts:260` — **`localeCompare` is locale-dependent**, which
  is the one thing "the same bytes on any machine" cannot tolerate: under some collations
  two slugs compare equal and the store's own order survives. Likelihood **plausible**.
  Ordering is by code point now.

### Test defects found in the same pass

- The "complete install" fixtures in `memory.test.ts` and `practices-pack.test.ts` were
  themselves broken installs — `"verify:brain": "node x"` with no `x` — so the baseline
  every partial-install row measured against was two things wrong, not zero.
- A test named "every mandatory check" exercised two of seven. It now runs all seven.
- The worktree lease tests passed an ABSOLUTE path where production passes a basename: a
  fixture modelling a state production cannot reach, and the reason the lease defect
  survived five mutation-checked regressions.
- A Unicode claim searched its non-ASCII record by the record's ASCII slug, proving nothing
  about the query path. It also exposed a real defect: the tokenizer split on `[a-z0-9]`,
  shattering `ağacı` into `a` and `ac`, so any query containing a lone `a` matched. The
  tokenizer splits on Unicode letters now.
- The unsafe-selector test omitted the symlink-escape and Windows UNC cases it was written
  for.
- The docs tests proved "read-only" and "local-only" with substring denylists over one file
  each. They still do — the honest limit is now stated in the test, and the tree-hash
  non-mutation test carries the strong evidence.

## Two findings kept as decisions rather than fixes

- **Turkish case folding is out of scope, deliberately.** `'AĞACI'.toLowerCase()` is
  `'ağaci'` under JavaScript's locale-independent fold and `'ağacı'` under a Turkish one. A
  locale-aware fold would make results machine-dependent, which is the property this command
  exists to guarantee. The miss is documented and asserted rather than papered over.
- **The byte-stability claim is asserted at the SOURCE, not behaviourally.** Whether
  `localeCompare` and code-point ordering differ depends on the locale the suite runs under,
  so no portable behavioural assertion can distinguish them — a behavioural test there is
  green by luck, and mutation-checking confirmed it. The claim is pinned against the source
  and paired with the docs promise, matching the CALL rather than the word so the comment
  naming the hazard survives.

Both are captured as `_brain` records, which is why this PRD's `## Memory Outputs` no longer
reads `none`.

## Guarantee assessment after remediation

| # | Guarantee | Status |
| --- | --- | --- |
| 1 | The doctor never writes, on either path | holds — tree-hash before/after, passing and failing |
| 2 | No false green about an install | holds — all seven mandatory checks fail on absence; validator bodies resolved |
| 3 | The doctor does not disagree with the gates | holds — real loader, parser and config validator; paths canonicalized |
| 4 | Recall is deterministic and local | holds — code-point ordering, unclean store refuses, no network/embedding/index |
| 5 | Additive | holds — no gate registered, nothing enabled, memory-disabled repo unchanged |
| 6 | No correct work refused | holds — the two overshoots found (Windows paths, escaping-symlink strictness) are fixed |

## Scope note

One change in this diff is outside PRD-019's subject and is an owner-approved scope
deviation: the worktree-close lease release in `run/worktree.ts`. It is here because this
PRD's own close leaks the same lease, and because the fix belongs where the teardown already
happens. Its Conflict Surface was extended and re-claimed so the fix could carry a
regression instead of a promise. It retires the `Worktree close leaks its lease` deferral.

## Residual

One recorded deferral, owned and dated: an **absolute** in-repository symlink is refused by
config containment wherever the workspace root itself sits behind a link — macOS
`/var → /private/var` is the everyday case. The relative form, which is what this repository
ships, is unaffected. The fix is in `core/config/**`, outside this work item's surface.

**This `pass` follows a `DO NOT CLOSE` that was answered**, not a round that found nothing.
Six blocking defects were named and all six are closed with mutation-checked regressions;
898 tests and the full floor are green. No confirming assessment was re-run against the
remediated code, and a later reader should weigh the verdict knowing that.
