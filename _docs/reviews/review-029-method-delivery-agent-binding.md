# Independent Review: PRD-029 — Method Delivery, One-Way Protocol Install

> **PRD:** PRD-029
> **Verdict:** pass
> **Reviewer:** independent Claude session (`readiness-5`), own brief — NOT the implementing session
> **Tool/Model:** Claude Opus 5; Codex (gpt-5.x) invoked read-only and hit its 570s timeout before a verdict, so the independence here is the session's, with three of Codex's four leads confirmed by its own reproduction and one rejected
> **Base SHA:** e75fa39a0c5280de793f18c647514e0cb1672f6b
> **Diff range:** e75fa39a0c52..9d8eb40
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single independent reviewer, two rounds — round 1 fail w/ 1 critical, round 2 pass 0/0/0)
> **Rounds:** 2 — round 1 returned `fail` with Critical 1; every finding below was remediated and re-verified against the built CLI

## Findings

Ranked most-severe first. All were raised in round 1 and are **closed**; the counts above are
the round-2 state that this verdict attests to.

- **critical** · `src/core/config/validate.ts:88` — `prompts.adapters` membership was never validated, so a typo wrote 11 store protocols, zero adapters, and exited 0 while reporting success. Fixed: refused by name in `validateResolvedConfig`, listing the known set.
- **major** · `src/core/config/validate.ts:296-315` — `prompts.dir` never joined the lexical path rules, so `~/store` was accepted and the printed reinstall set expanded to the adopter's home directory. Fixed: added to `configuredPaths`.
- **major** · `src/cli.ts:166-179` — the containment diagnostic was swallowed and misreported as "prompts is not enabled". Fixed: the catch branches on `issues.length`.
- **major** · `test/prompts.test.ts:149-166` — the collision guard's test could not fail on a case-insensitive volume. Fixed: `assertNoCollision` called directly, mutation-checked.
- **minor** · `src/core/run/prompts.ts` — a config-backed key in `values` escaped `unused`. Fixed.
- **minor** · `src/core/run/prompts.ts` — `{{A{B}}` matched neither candidate class. Fixed, then the fix overshot (below) and was narrowed.
- **minor** · `src/core/run/init.ts:255` — `initWorkspace`'s comment asserted an invariant PRD-029 broke. Fixed.
- **minor** · `src/core/run/prompts.ts` — the Codex snippet carries no banner. **Not changed**: FR-6 specifies exactly a heading and a table, and changing it would put the code outside the spec that was scored. Recorded in the task file's Deferrals.

## Round 1 — verdict `fail`, Critical 1

Every finding was reproduced by the reviewer, not inferred, and re-reproduced here before
remediation. The reviewer also reported that Codex hit its 570s timeout before emitting a
verdict, and declined to present it as a completed independent pass — three of its four leads
were confirmed by the reviewer's own reproduction and one was rejected.

### C1 (critical) — `prompts.adapters` membership was never validated
`validate.ts` declared `adapters: strArr`, which enforces the shape and not the membership,
and `renderAdapters` looped the configured names with three `if` branches and no `else`.
Reproduced with the likeliest real typo:

```
adapters: ["bogus","claude"]  →  exit 0, 11 store protocols written, ZERO adapters
```

The command printed its success summary and its "generated set — this is the reinstall unit"
block, and told the adopter nothing. It defeated the PRD's primary goal and its first success
metric: the store landed, the agent binding did not, on routine input, failing open.

**Fixed** — `validateResolvedConfig` refuses an adapter outside `KNOWN_ADAPTERS`, by name and
listing the known set. An empty list stays legal. Regression in `config.test.ts`.

### M1 (major) — `prompts.dir` never joined the lexical path rules
`unsafeRelPath` was applied to `memory.*` and to every `dirs.*` path; `prompts.dir` got the
filesystem half and none of the lexical half. `resolveContainedPaths` skips absolute entries
with the comment *"lexical rules own these"* — true of its original caller, false of the new
one.

The consequence is the sharpest finding of the round. `prompts.dir: "~/store"` was accepted, a
literal `./~` directory was created, and the command then printed:

```
[init] generated set — this is the reinstall unit:
    ~/store/prompts/...
[init] ... delete EVERY path above — not just the store directory — and run this again.
```

Those paths are shell-expandable. An adopter following the documented one-way reinstall
procedure literally — the procedure this PRD's whole safety story rests on — would delete
`~/store` in their **home directory**. `memory` rejects that exact shape because it was a
recorded finding in this repository.

**Fixed** — `prompts.dir` added to the `configuredPaths` list, whose own comment already said
*"containment is a property of a configured path, not of which feature happens to own it."*
The rule had been generalised once; the new path had not joined it. Regression covers `~/`,
`..`, a drive prefix and an absolute path.

### M2 (major) — the containment diagnostic was swallowed and misreported
`runInit` wrapped the config load in `catch { return DEFAULT_CONFIG }`. `promptsPathContained`
produced the correct `ConfigIssue`; the catch discarded it, `--prompts` then read `enabled` off
the fallback default, and the adopter was told **"prompts is not enabled"** about a config that
enables it. They would edit the wrong thing.

**Fixed** — the catch now distinguishes a discovery failure from a validation failure, using
the fact that the first carries no `issues` and the second carries one per problem.

### M3 (major) — the collision guard had no effective test
The test wrote `a-template.md` and `A-Template.md` into a temp package. On a case-insensitive
volume — where this was written — the two collapse into one file, no collision occurs, and the
only real assertion sat in a `catch` that never ran. `assertNoCollision` was exported and
imported by nothing. Measured: `touch a-template.md; touch A-Template.md` → 1 file.

**Fixed** — the guard is called directly with constructed `PlannedFile`s differing only by case,
and again only by NFC/NFD. Filesystem-free and platform-independent. **Mutation-checked**:
removing `.normalize('NFC').toLowerCase()` fails it.

### m1–m4 (minor)
- **m1** — a config-backed key placed in `values` was silently ignored and escaped `unused`,
  because such a token IS consumed by the corpus. **Fixed**: diagnosed by name with the config
  field that supplies it.
- **m2** — `{{A{B}}` matched neither candidate class and was emitted untouched. **Fixed**, then
  **the fix overshot** (below).
- **m3** — `initWorkspace`'s comment still asserted *"`extra` IS the practices plan and nothing
  else populates it"*, which PRD-029 made false. **Fixed**: the comment now records that `extra`
  is no longer sufficient to infer the flag.
- **m4** — the Codex snippet is the only generated artifact without a banner. **Not changed**:
  FR-6 specifies exactly a heading and a table, and adding one would put the code outside the
  spec that was scored. Recorded in Deferrals instead.

## Two overshoots in the remediation itself, both caught by the suite

Recorded because they are the finding, not an incident. Both are
`strictness-added-during-extraction-is-a-behavior-change`, committed inside the fixes for
review findings, by the session that had just been shown that record.

1. **The m2 regex spanned two adjacent valid tokens.** `{{CMD_CHECK_TYPES}} + {{CMD_TEST}}`
   matched as one malformed candidate, refusing four files of the shipped corpus. A guard for
   an adversarial input broke routine ones. Fixed by forbidding `}` before the inner `{`; the
   reason is now in the pattern's own comment.
2. **The M2 fix broke `gate init` in a bare directory** — the command's whole purpose — because
   `ConfigError` covers a missing config as well as an invalid one. Fixed by branching on
   `issues.length`, which is where the distinction actually lives.

## Round 2 — verdict `pass`, Critical 0

All four blocking findings fixed and re-verified against the **built** CLI:

```
adapters:["claude"]   → prompts.adapters[0]: unknown adapter 'claude' — known adapters are …
dir:"~/store"         → prompts.dir: must not start with ~/ (home-relative)
dir:"../victim"       → prompts.dir: must not contain a `..` segment
bare directory        → still scaffolds (the M2 overshoot, closed)
```

`pnpm test` 1093 passed / 50 files, `check-types` 5/5, `lint` 4/4, `build` 4/4,
`verify:workflow` PASS.

## Checked and found correct (round 1, unchanged by remediation)

- **§12 sweep clean**: no `any`, no `eslint-disable`, no `@ts-ignore`, no `|| true`; no network,
  no push path, no runtime dependency; no file under `prompts/` touched except
  `PLACEHOLDERS.md`; no preflight, receipt, ledger, doctor, sync or exceptions anywhere.
- The render is pure — no clock, no env, no writes.
- The nine required values are exactly the nine the spec names, derived from the corpus;
  `empty: allowed` is exactly `DOMAIN_CHECKS, ENV_NOTES`.
- A refused run writes nothing, through the real CLI; `--dry-run --prompts` writes nothing.
- The reinstall unit is real, with dedicated tests for both the wrong and the right procedure.
- The ORDERING test discriminates — breaking activation-last inverts `report.created`.
- The `load.ts` extraction preserved `memoryPathsContained` exactly. The reviewer's M1 was about
  what the **new caller lacked**, not drift in the old one, and it accepted the extraction proof
  as sound for what it proved while naming what it did not.

## Rejected

- Codex's lead that two enumerated tokens render together despite a declared refusal — a
  misreading. FR-4 refuses *interacting legal values across* two tokens, not their coexistence,
  and this PRD ships zero enumerated tokens.
- The reviewer's own CRLF `bannerFor` hypothesis — refuted: no shipped file begins with `---`,
  none contains CR, and the `.mdc` is assembled by `renderAdapters` and never passes through
  `bannerFor`.
- The reviewer's own config-backed empty-string hypothesis — refuted: all seven config-backed
  fields are `str`, whose arm rejects empty, so the path is unreachable through a real config.
