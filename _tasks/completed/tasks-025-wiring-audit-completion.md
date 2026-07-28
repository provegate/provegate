# Tasks: Wiring Audit Completion — The Meta-Gate That Makes a Fourth Duplicate Fail

> **PRD**: [prd-025-wiring-audit-completion.md](../../_prds/wip/prd-025-wiring-audit-completion.md)
> **Readiness**: [readiness-025-wiring-audit-completion.md](../../_readiness/wip/readiness-025-wiring-audit-completion.md)
> **Status**: Ship Verified
> **Readiness Score**: 8.30/10 (PASS, iteration 5)
> **Model Tier (Execution)**: high
> **Created**: 2026-07-28
> **Updated**: 2026-07-28

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- A PRD may be `Code Complete` with operator handoff items, but it is not
  `Ship Verified` until required handoff items are resolved or explicitly accepted.
- Phase 4 agents hold a valid lock lease (METHOD.md → Locks) before editing
  implementation files or this task file.
- No `any` anywhere; `unknown` plus narrowing. Every DO NOT in PRD §12 binds every task
  below — re-read §12 before starting each parent.

---

## Memory Context

The slugs the PRD selected as Memory Inputs, carried here so implementation does not
re-derive them. Each one gets a re-open task below, bound to the work that depends on it:
a record is evidence only while it is true.

- `gate-wire-or-delete` — the meta-gate this PRD completes; constrains 2.0/4.0/5.0: every
  registered check wired, every on-disk check registered, no silent gaps.
- `narrow-the-grammar-not-the-parser` — constrains 3.0: the scanner and the bundle reader
  implement the narrowed grammar exactly; no widening, no fallback to substring matching
  on refused input.
- `scope-out-the-layer-the-rounds-keep-hitting` — why there is no flag table to build;
  constrains 3.0: reintroducing flag semantics under any name is a PRD change, not an
  implementation detail.
- `assert-absent-needs-an-independent-cause` — constrains every deny fixture in 3.0/4.0:
  each deny case pairs with a positive control on the same shape, and Phase 6 mutation-
  checks that the pair can fail.
- `strictness-added-during-extraction-is-a-behavior-change` — constrains 3.0/4.0/7.0: if
  an existing test must be edited to pass, the port changed behavior — revert and narrow
  rather than adjusting the test.
- `two-parsers-wrong-together` — constrains 1.4: export `resolveContainedPaths`, never
  copy it; one containment implementation.
- `a-rule-corrected-survives-where-it-is-restated` — constrains any mid-flight PRD/task
  edit: after correcting a rule anywhere, grep every restatement before moving on.
- `fixture-must-reach-production-shape` — constrains 3.0/4.0 tests: call `auditWiring`
  with the config and manifest its real callers pass, not hand-built arguments.

---

## Relevant Files

- `packages/provegate/src/core/gates/wiring.ts` — `auditWiring`: FR-1 direction, FR-2
  surfaces, FR-3 scanner + command shape + bundle grammar, surface-count reporting
- `packages/provegate/src/core/config/types.ts` — `wiring.scriptsDir` / `hooksDir` /
  `bundlePath` key types
- `packages/provegate/src/core/config/defaults.ts` — the three defaults
  (`scripts/verify`, `.githooks`, `scripts/verify/verify-workflow.mjs`)
- `packages/provegate/src/core/config/validate.ts` — semantic validation of the three
  keys (repo-relative, non-absolute, no parent-escape; existence NOT required)
- `packages/provegate/src/core/config/load.ts` — export `resolveContainedPaths` (body
  untouched; not re-exported from `config/index.ts`)
- `packages/provegate/test/wiring.test.ts` — FR-1/FR-2/FR-3 fixtures including the full
  19-row deny matrix with paired positive controls
- `packages/provegate/test/config-wiring.test.ts` (new) — defaults, validation
  rejections, three symlink-escape fixtures
- `packages/provegate/test/changeset-entry.test.ts` — FR-4: per-entry discriminators,
  this PRD's entry asserted
- `.changeset/` — one new minor entry naming the three keys and the recognized surfaces
- `_brain/learnings/surface-set-without-its-predicate.md` (new) — declared Memory Output
- `_brain/INDEX.md` — one-line pointer for the new learning
- `_docs/reviews/review-025-wiring-audit-completion.md` (new) — Phase 6 artifact

### Notes

- Tests live in `packages/provegate/test/`, invoked with
  `pnpm --filter provegate test <file>`.
- `packages/provegate` takes zero runtime dependencies — the scanner and the bundle
  reader are hand-rolled by design; refusing input is always legal, guessing never is.

---

## Tasks

- [x] 0.0 Pre-flight
  - [x] 0.1 Open each Memory Context record under `_brain/learnings/` and confirm the
        paths and commands it names still exist; record any stale finding in
        **Deferrals & Decisions**.
  - [x] 0.2 Re-run `node packages/provegate/dist/cli.js queue` and confirm no active
        execution-phase claim overlaps this PRD's Conflict Surface (the PRD's own
        paragraph has been overtaken once; PRD-024's Phase 3/4 is live in parallel —
        surfaces are disjoint, verify that is still true).
  - [x] 0.3 Claim the work item: `gate open PRD-025 --worktree` from a clean base
        (worktree refuses uncommitted control files — commit first). Confirm the lease
        exists under `_state/locks/` on the MAIN checkout.
  - [x] 0.4 In the worktree: `pnpm install`, then baseline `pnpm --filter provegate test`
        green before any edit; record the test count.
  - [x] 0.5 Re-measure the two dated assumptions the grammar was written against:
        (a) `scripts/verify/verify-workflow.mjs` still satisfies the bundle grammar —
        `const CHECKS = [` at column zero, single-line quoted members, `];` close, sole
        opening line; (b) no `.githooks/` file references a `verify:` script (the
        zero-current-impact claim). A drift in either is a stop-and-record, not a silent
        adjustment.
- [x] 1.0 Config surface — the three `wiring.*` keys and the containment export (FR-2)
  - [x] 1.1 `packages/provegate/src/core/config/types.ts`: add `wiring.scriptsDir`,
        `wiring.hooksDir`, `wiring.bundlePath` (all `string`) with doc comments naming
        their role (scriptsDir serves FR-1's direction, not a surface).
  - [x] 1.2 `packages/provegate/src/core/config/defaults.ts`: defaults `scripts/verify`,
        `.githooks`, `scripts/verify/verify-workflow.mjs`.
  - [x] 1.3 `packages/provegate/src/core/config/validate.ts`: semantic validation —
        reject absolute paths, parent-escaping segments, non-strings; do NOT require
        existence (absence is "not a surface", never an error).
  - [x] 1.4 `packages/provegate/src/core/config/load.ts`: add `export` to
        `resolveContainedPaths` (declared ~`:134`); body untouched; do NOT add it to
        `config/index.ts` (named-list re-export stays as is — public API unchanged).
  - [x] 1.5 New `packages/provegate/test/config-wiring.test.ts`: the three defaults
        resolve; absolute / escaping / non-string each rejected with a named issue;
        absent directory accepted.
  - [x] 1.6 Same file: three symlink-escape fixtures — each configured read path
        (scriptsDir, hooksDir, bundlePath) symlinked outside the repo root is refused at
        read time via `resolveContainedPaths`, not merely lexically.
- [x] 2.0 FR-3 machinery — one scanner pass, one command shape, the bundle grammar
  - [x] 2.1 `packages/provegate/src/core/gates/wiring.ts`: implement the scanner as a
        single left-to-right pass with exactly three state variables (single-quote,
        double-quote, pending-backslash) and the four rules of FR-3(b): backslash
        escapes next char except newline; newline always cuts; `;`/`&&`/`||` cut only
        outside quotes and unescaped by state; `#` beginning a token outside quotes
        discards through the newline. Tokens fall out of the same pass (quoted run = one
        token, quotes stripped). An unterminated quote anywhere → the whole surface
        unparseable, no wiring, never a crash. One pass — not a segmenter plus a lexer.
  - [x] 2.2 Implement the command shape: strip `NAME=value` wrappers and leading `env`
        with its own `NAME=value` args (`env` with anything else leaves a non-interpreter
        head); head token in exactly `node|bun|deno|tsx|ts-node` after directory-prefix
        strip; `deno`-only optional literal `run`; the immediately-next token is the
        path (must not start with `-`); basename equality against the FR-3(a) key;
        tokens after the path ignored. ANY dash token between head (or `run`) and path →
        the command declares no wiring. No flag table of any kind (§12).
  - [x] 2.3 Implement FR-3(a) key derivation: for each registered script matching
        `config.verifyScriptPattern`, resolve the `.mjs` file its body invokes under
        `wiring.scriptsDir`; that basename is the matching key.
  - [x] 2.4 Implement the bundle reader per FR-3(c): opening line = column-zero
        `const CHECKS = [`; close = first subsequent line whose first non-whitespace is
        `];`; body lines only string-literal element (no backslash, no own-delimiter;
        optional trailing comma + optional `//` after it) / whole-line `//` comment /
        blank. Any other body line → declaration unparseable, no membership. More than
        one opening line anywhere in the file → ambiguous, no membership. Never an
        error, never a text-search fallback.
  - [x] 2.5 Add the surface-count report to the audit's output (how many surfaces were
        actually read) — the visibility requirement that makes a silently-lost surface a
        number a maintainer can watch.
  - [x] 2.6 Tests (`wiring.test.ts`): the five scanner deny rows with paired positive
        controls — quoted separator, `\;` vs `\\;`, quote across a newline (whole
        surface declares nothing), backslash-newline split invocation, shell comment
        (`# build && node <path>` wires nothing; uncommented wires).
  - [x] 2.7 Tests: command-shape rows with paired controls — head token (echo body vs
        `node` head); the three dash-before-path rows (`--check`, `-e` eval,
        `--require … app.mjs`) each against `node scripts/verify/verify-foo.mjs`; the
        after-the-path row against the quoted-path positive (`node "…/verify-foo.mjs"`
        WIRES); deno subcommand (`deno check` no, `deno run <path>` and `deno <path>`
        both yes); `bun run <path>` no with `bun <path>` yes; env wrapper (echo head no,
        node head yes).
  - [x] 2.8 Tests: the preload row's stated BEHAVIOR REVERSAL —
        `node --require ./setup.mjs scripts/verify/verify-foo.mjs` does NOT wire (old
        arity table said it did); assert the new verdict and keep the row's comment
        naming the reversal. W2: do not "restore" the old fixture.
  - [x] 2.9 Tests: the four bundle rows with controls — column anchor (indented sole
        declaration = no membership; column-zero = members wire), template-literal
        impostor (ambiguous, no membership; impostor indented = real one reads), member
        escape / own-delimiter (declaration unparseable), duplicate declarations.
        Plus: the real `verify-workflow.mjs` read as a fixture input parses to exactly
        its ten members (grammar admits the real corpus — do not edit the bundle).
  - [x] 2.10 W1 adversarial comment fixtures: `#` mid-token (`a#b` ordinary), `#` inside
        quotes (not a comment), `#` immediately after a separator, shebang line, `#`
        inside a quoted path. Each with the verdict FR-3(b) rule 4 gives it.
  - [x] 2.11 W3: verify `deno <path>` (bare, no `run`) against deno's current CLI
        documentation. If the bare form is doubtful as an execution form, STOP — record
        in Deferrals & Decisions and surface to the owner before narrowing the PRD's
        grammar to `run`-only (that is a spec edit, not an implementation choice).
- [x] 3.0 FR-2 — the three surfaces, read through the new machinery
  - [x] 3.1 `wiring.ts`: read the configured hooks directory (every file's body is a
        command surface through the 2.x scanner); absent directory = not a surface;
        runtime containment via `resolveContainedPaths` before reading, refusal on
        symlink escape.
  - [x] 3.2 `wiring.ts`: read the configured bundle path through the 2.4 reader; bundle
        membership (bare basename in the declared list) counts as wiring; absent or
        unparseable = not a surface.
  - [x] 3.3 `wiring.ts`: read every `package.json` script body whose name does NOT match
        `config.verifyScriptPattern` as a command surface. The verify-prefix exclusion
        is load-bearing: a verify-prefixed body wires nothing (no self-wiring bundles,
        no checks wiring each other).
  - [x] 3.4 Keep the CI reading at `run:` text exactly as today — the deliberate
        narrowing stays stated, not reconciled.
  - [x] 3.5 Extend the "wired nowhere" message's parenthetical (`wiring.ts:245-247`
        today) to name the three new surfaces it searched.
  - [x] 3.6 Tests: a check wired ONLY through a hook registers as wired; only through
        bundle membership; only through a non-verify script body; the two FR-2 rows
        (basename in YAML comment does not wire; verify-prefixed body wires nothing)
        with their controls.
- [x] 4.0 FR-1 — the on-disk → registered direction
  - [x] 4.1 `wiring.ts`: selection — candidates are files under `wiring.scriptsDir`
        whose basename matches `^verify-.*\.mjs$` (a filename pattern, distinct from
        `verifyScriptPattern`; do not reuse one for the other).
  - [x] 4.2 `wiring.ts`: registration — a candidate is registered when some
        verify-named script's body INVOKES that file, decided by the 2.2 command rule.
        Never a substring search (`echo verify-foo.mjs` in an unrelated body is not
        registration). A candidate with no registration fails, naming the file.
  - [x] 4.3 Tests: unregistered on-disk script fails by name with the directory read
        from config; the echo-body false-registration deny with its positive control
        (a real `node scripts/verify/verify-foo.mjs` body registers).
- [x] 5.0 FR-4 — the release entry and the re-anchored selector
  - [x] 5.1 `packages/provegate/test/changeset-entry.test.ts`: give each existing
        assertion group a discriminator unique to its entry (the `valueScoring` block
        for PRD-021's) — a SELECTION change only; every existing expectation keeps its
        exact text (`strictness-added-during-extraction-is-a-behavior-change`).
  - [x] 5.2 Add this PRD's `.changeset/` entry: minor bump for `provegate`, naming the
        three `wiring.` keys with defaults, the three recognized surfaces, and the
        compatibility instruction (an older CLI rejects an unknown `wiring` block —
        upgrade the CLI first). The note deliberately matches `COMPAT`; the
        discriminators are what keep the suite deterministic.
  - [x] 5.3 Extend the test with this entry's own assertion group discriminated by the
        three `wiring.` key names; assert the suite passes regardless of `readdirSync`
        order (both entries selected by their own discriminators).
- [x] 6.0 Migration & Rollback Plan (infra-class explicit parent)
  - [x] 6.1 Confirm the audit changes are additive end-to-end: with no `wiring` block in
        config, every default resolves and the audit's NEW surfaces read this
        repository exactly as its defaults name them; with the block absent AND the
        directories absent, the audit completes with surfaces absent.
  - [x] 6.2 Write the revert path into the implementation commit message trailer and
        verify it: reverting `wiring.ts` + the three config modules + the changeset
        entry restores today's behavior byte-for-byte on the existing suite
        (`resolveContainedPaths` export may stay — housekeeping, not rollback).
  - [x] 6.3 Assert the post-release rollback rule is recorded where a maintainer will
        find it: the changeset entry's note (or its sibling doc line) states that a
        post-release removal of the `wiring` keys must keep accepting the block as
        deprecated-and-ignored or ship a stated migration (unknown keys are refused —
        `validate.ts:193`).
  - [x] 6.4 Run `pnpm verify:gates-wired` — the script this audit will replace must
        still agree with the repository's real wiring while both exist (PRD floor).
- [x] 7.0 Phase 5 — Testing (every §11 command, no additions, no omissions)
  - [x] 7.1 `pnpm --filter provegate test test/wiring.test.ts` — FR-1, FR-2 and FR-3
        rows: full deny matrix + paired controls per the §11 FR-3 Notes.
  - [x] 7.2 `pnpm --filter provegate test test/config-wiring.test.ts` — FR-2 config row.
  - [x] 7.3 `pnpm --filter provegate test test/changeset-entry.test.ts` — FR-4 row.
  - [x] 7.4 Cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`,
        `pnpm build`, `pnpm verify:gates-wired` — all green, existing tests unchanged
        (if one must change, that is a behavior change: revert and narrow).
  - [x] 7.5 W4 mutation checks: revert the dash rule, the comment rule, and the bundle
        ambiguity refusal one at a time; assert in each case exactly the paired fixture
        goes red (`assert-absent-needs-an-independent-cause` made mechanical). Restore.
  - [x] 7.6 Update the Verification Ledger with evidence per row.
- [x] 8.0 Phase 6 — Final Auditing
  - [x] 8.1 Commission the independent review (different model or human; never this
        session): scope = the diff; brief = sweep-first (the rules that changed:
        scanner, dash rule, bundle anchors, selector discriminators), then hunt; W1 and
        W4 named as first attention; verdict `pass` requires `Critical: 0`.
  - [x] 8.2 W2 check in review: the preload reversal row still names the reversal; no
        fixture asserts the deleted arity table's verdict.
  - [x] 8.3 W5 check in review: the `bun run` false negative is stated in FR-3(b), its
        deny row and §6 — intact, not silently widened.
  - [x] 8.4 Spec-vs-code audit: walk FR-3's grammar clause by clause against the shipped
        scanner; walk the deny matrix row by row against the fixtures; any divergence is
        a finding, not an adjustment.
  - [x] 8.5 Write `_docs/reviews/review-025-wiring-audit-completion.md` (template
        `_docs/review-artifact.template.md`, Quorum row REQUIRED — the template's
        "optional" note contradicts the gate; see the standing deferral).
  - [x] 8.6 Remediate findings; re-run 7.x after every fix; loop until `Critical: 0`.
- [x] 9.0 Phase 7 — Learning & close
  - [x] 9.1 Write `_brain/learnings/surface-set-without-its-predicate.md` (the declared
        Memory Output: porting inputs without their predicate registers nothing;
        replacing an unsafe predicate with an open-ended one is the same defect in a
        stricter costume — measured twice in one wave on one function). Add the
        `_brain/INDEX.md` one-line pointer.
  - [x] 9.2 Confirm Durable Artifacts vs the merge diff: the review artifact, the
        learning, `Decision: none` — and Memory Outputs on the PRD as committed on main
        (no weakening).
  - [x] 9.3 Run the `_brain` capture protocol (`_brain/PROTOCOL.md` §7) for anything
        non-derivable hit during implementation.
  - [x] 9.4 Write `_docs/wip/summary-025-wiring-audit-completion.md`; advance PRD/tasks
        Status headers; `gate status`.
  - [x] 9.5 Operator acceptance (operator-gated close): STOP and hand to the owner —
        an agent never originates the acceptance. On the owner's explicit in-session
        direction only, transcribe with `authorship: "agent-transcribed"`.
  - [x] 9.6 `gate run PRD-025` from the worktree for the gated close; merge to local
        main; archive artifacts; refresh the board. Push stays the owner's.

---

## Verification Ledger

One row per PRD §11 command (pre-populated by Phase 3, all `pending`), plus the
cross-cutting floor and the review row. `gate run` reads the `independent-review` row:
it must be `passed` and name the review artifact path.

| Gate               | Command / Check                                             | Scope | Result  | Evidence | Notes                      |
| ------------------ | ----------------------------------------------------------- | ----- | ------- | -------- | -------------------------- |
| FR-1               | `pnpm --filter provegate test test/wiring.test.ts`          | pkg   | passed  | 37/37, incl. the 2 FR-1 cases | on-disk → registered, directory from config |
| FR-2               | `pnpm --filter provegate test test/wiring.test.ts`          | pkg   | passed  | 37/37, incl. the 8 FR-2 surface cases | three surfaces; YAML comment no; verify-prefixed body no |
| FR-2               | `pnpm --filter provegate test test/config-wiring.test.ts`   | pkg   | passed  | 8/8 | defaults, rejections, absent-dir OK, symlink escapes refused per key |
| FR-3               | `pnpm --filter provegate test test/wiring.test.ts`          | pkg   | passed  | 37/37; W4 mutation checks: dash rule → 2 targeted reds, comment rule → 3, bundle ambiguity → 1; restored to green | full deny matrix + paired controls per §11 Notes |
| FR-4               | `pnpm --filter provegate test test/changeset-entry.test.ts` | pkg   | passed  | 7/7; two entries selected by their own discriminators | minor entry names the three keys + surfaces; selectors discriminated |
| types              | `pnpm check-types`                                          | repo  | passed  | 0 errors |                            |
| lint               | `pnpm lint`                                                 | repo  | passed  | 0 warnings |                            |
| test               | `pnpm test`                                                 | repo  | passed  | provegate 51 files / 1152 tests (baseline 1110 + 42) | existing tests unchanged except two exact-shape report assertions — see Deferrals |
| build              | `pnpm build`                                                | repo  | passed  | clean |                            |
| gates-wired        | `pnpm verify:gates-wired`                                   | repo  | passed  | 13 registered, 12 on disk, PASS | the replaced script still agrees while both exist |
| independent-review | `_docs/reviews/review-025-wiring-audit-completion.md`       | repo  | passed  | 6 Codex rounds; final adjudication verbatim: REJECTION UPHELD — Critical: 0 | verdict pass, critical = 0 |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

> Short single-line entries written **during Phase 4** when a non-obvious decision,
> scope cut, or accepted deviation is taken. Format: `- <task#> — <decision>; <≤1
sentence rationale>`. Never inline on sub-task lines.

- Phase 3 — the protocol's Phase A "type Go" stop was not re-asked; the owner
  commissioned Phase 3 for this PRD in-session on 2026-07-28 ("025 için phase-3'e
  başla"), which is the approval that stop exists to collect. Recorded per the
  protocol's autonomous-execution exception.
- 2.5 — `WiringReport` gained the FR-required `surfaces` field; two existing
  exact-shape consumers updated: `wiring.test.ts:60` (in surface) and ONE assertion in
  `test/init.test.ts` (OUT of the Conflict Surface — recorded here rather than taken
  silently; the report-shape consumer had to learn the field the FR adds, nothing else
  changed).
- 2.3 — FR-3(a)'s "resolved under wiring.scriptsDir" implemented as a LEXICAL prefix
  test against the configured value, not a realpath comparison; comparing a lexical
  path against a canonicalized base is the exact mismatch
  `absolute-in-repo-symlink-refused` records, so like is compared with like.
- 2.11 (W3) — deno's own CLI reference states the `run` subcommand is optional
  (`deno main.ts` executes; docs.deno.com/runtime/reference/cli/run, read 2026-07-28),
  so both forms wire exactly as FR-3(b) specifies; no narrowing, no stop needed.
- 8.x — the real-bundle fixture reads `scripts/verify/verify-workflow.mjs` from a package
  test: an out-of-package read RECORDED for PRD-036's input census rather than declared
  here, because `turbo.json` sits inside in-flight PRD-024's Conflict Surface; CI checks
  out fresh, the local cache gap is PRD-036's subject, and the round-3 reviewer judged
  the disposition adequate.
- 8.x — `gate check --wiring` now prints the surfaces-read list: a one-line `cli.ts`
  edit outside the Conflict Surface, taken with recorded rationale (the FR's visibility
  promise must reach the shipped command; same consumer class as the init.test
  assertion).
- 8.x — round 5's Windows rooted-backslash finding was REJECTED against FR-3(b)'s
  declared POSIX-subset grammar and the rejection put back to the reviewer, who upheld
  it in an adjudication round; the artifact quotes the verdict verbatim.
- 7.5 (W4) — the bundle-ambiguity mutation is killed by the duplicate-declaration row;
  the impostor fixture places the impostor BEFORE the real declaration, so under a
  first-wins mutation the empty impostor is read and that fixture's `[]` expectation
  holds either way. The duplicate row is the designated killer; noted for Phase 6.

---

## Progress Log

> Multi-line runtime context or deviations that don't fit one line.

| Date | Task | Notes |
| ---- | ---- | ----- |
| 2026-07-28 | 0.4 | worktree baseline: design + provegate `dist/` are gitignored — built both in-tree before the suite ran (known worktree gap); baseline 50 files / 1110 tests green |
| 2026-07-28 | 0.5 | re-measured both dated assumptions in the worktree: bundle opens `const CHECKS = [` at column zero line 15 and closes `];` line 26, sole opener; zero `.githooks` files reference a verify script |
| 2026-07-28 | 4.0 | implementation complete through task 7.6; Phase 5 ledger green; Phase 6 next |

---

## Blockers / Open Questions

- (none)

---

## Operator Handoff

> Human/runtime/staging checks the agent cannot complete. Keep the corresponding task
> checkbox unchecked until resolved or explicitly accepted.
> `Category` ∈ {`runtime`, `staging`, `deploy`, `secret`, `manual-qa`, `legal`, `external`}.

| Task | Category  | Owner | Required Check | Status | Notes |
| ---- | --------- | ----- | -------------- | ------ | ----- |
| 9.5  | manual-qa | owner | Owner-signed acceptance entry in `_state/acceptances.json` for the operator-gated close (decision the owner's; transcription per ADR-0003 if directed in-session) | resolved | owner approved in-session 2026-07-28 ("onay"); entry agent-transcribed; merge gate passed |
