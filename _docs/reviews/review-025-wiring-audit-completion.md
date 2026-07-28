# Independent Review: PRD-025 — Wiring Audit Completion

> **PRD:** PRD-025
> **Verdict:** pass
> **Reviewer:** Codex (gpt-5.x) via the `/codex` skill — read-only, not the author or the implementing session
> **Tool/Model:** codex CLI 0.145.0, model_reasoning_effort=high; orchestrated by Claude Fable 5, which implemented the work and re-verified every finding before acting on it
> **Base SHA:** 9bd2f684ba6d26d550ff88e613f4b02c1f5fa2ce
> **Diff range:** 9bd2f68..dddf115
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (one independent reviewer, six rounds; the final adjudication verdict is quoted verbatim below)
> **Rounds:** 6 — every finding reproduced or reconstructed before acceptance; one finding rejected, and the rejection was put back to the reviewer and upheld rather than self-declared

## Independence

The reviewer is a different model family from the implementer and read only the diff and
the repository. The implementing session wrote the fixes between rounds and never scored
its own round: each round's brief required reconstructing the previous round's
counterexamples rather than reading the fix descriptions, and the closing round was an
adjudication in which the implementer's proposed rejection of a finding was judged — and
could have been refused — by the reviewer.

## Round history

All findings are **closed or adjudicated**; the counts above are the final state.

- **Round 1 — 2 critical, 4 advisory.** (P1) the under-scriptsDir key test was a bare
  lexical prefix, so `scripts/verify/../outside/verify-foo.mjs` passed it, and a
  `./`-prefixed configured value rejected ordinary invocations; fixed by normalizing both
  sides alike and refusing traversal segments outright. (P1) hook entries were `stat`'d
  after only the directory was containment-checked, so an entry symlinked outside the
  repository could wire a check from external content; fixed with `lstat` plus per-entry
  realpath containment. Advisory: an unparseable bundle was reported as `bundle:0`
  (surface-read claim it had not earned — `bundleMembers` now returns `null` and the
  report omits a refused surface); a directory named `verify-cache.mjs` became a
  candidate; most deny rows exercised helpers rather than `auditWiring` and the
  YAML-comment pair was missing; the shipped bundle was never a fixture despite the task
  file claiming it (an honest gap the review caught — the fixture now asserts its ten
  members, and the out-of-package read it adds is recorded for PRD-036's census).
- **Round 2 — 1 critical, 5 advisory; every round-1 closure reconstructed and upheld.**
  (P1) registration had collapsed to basenames, so a nested
  `scripts/verify/nested/verify-foo.mjs` invocation made the top-level candidate look
  registered; fixed — registration is by scriptsDir-relative FILE, the basename stays
  the surface key. Advisory: `scriptsDir: "."` built the false prefix `./`; contained
  hook symlink targets (which git executes) were skipped along with external ones;
  a dangling verify-named symlink crashed candidate selection; the real-bundle turbo
  input (judged in round 3 as adequately dispositioned to PRD-036, whose census
  serializes behind PRD-024's `turbo.json` edit); and `gate check --wiring` discarded
  `report.surfaces` — now printed on success and failure (a one-line `cli.ts` edit
  outside the Conflict Surface, recorded in the task file's Deferrals).
- **Round 3 — 0 critical, 3 advisory; all round-2 closures reconstructed and upheld,
  the PRD-036 disposition judged adequate.** Interior-dot spellings of `scriptsDir`
  broke the prefix test; a verify body chaining two checks registered only the first
  (the `break`); a verify-named symlink to a contained regular file evaded
  wire-or-delete entirely. All three fixed with deny/control pairs.
- **Round 4 — 1 critical.** The `.`-scriptsDir special case made the prefix empty, so
  an absolute `node /tmp/verify-foo.mjs` derived a key and a same-basename local hook
  could false-green the audit. Fixed: absolute and drive-qualified normalized paths are
  refused before the prefix is consulted.
- **Round 5 — internally contradictory** ("one P1 remains" beside a `Critical: 0`
  verdict line): `node \verify-foo.mjs` read as a Windows-rooted path. The implementer
  proposed rejecting it — FR-3(b) declares the scanner "the minimal POSIX word-splitting
  subset and nothing more", under which a leading backslash escapes the next character
  exactly as `sh` does, and git executes hooks under `sh` on every platform; the
  cmd.exe rooted-path reading imports semantics the grammar deliberately does not
  model, and the uniform-backslash divergence is disclosed in the FR itself.
- **Round 6 — adjudication.** The rejection rationale was judged against the spec by
  the reviewer, with refusal available. Verbatim verdict: **"REJECTION UPHELD —
  Critical: 0 — FR-3(b) explicitly applies its POSIX-style scanner to both surfaces,
  where `\v` becomes `v`; the cmd.exe rooted-path interpretation is outside that
  declared grammar, so the implementation conforms to spec."**

## Verification evidence

1168 package tests green (baseline 1110 + 58 across the port and the six rounds);
`pnpm check-types`, `pnpm lint`, `pnpm build`, `pnpm verify:gates-wired` (13 registered,
12 on disk — the replaced script still agrees while both exist) all green in the
worktree. W4 mutation checks: the dash rule, the shell-comment rule and the bundle
ambiguity refusal were each reverted in isolation and produced exactly their paired
fixtures' failures — 2, 3 and 1 targeted reds — then restored to green.

## Verdict rationale

Six rounds converged monotonically outward: the grammar core produced no finding after
round 1, and every later round's defects sat one adjacency further from it — path
identity, link semantics, spelling normalization, then a special case of a special case.
Every fix shipped with a deny/control pair able to fail on its own cause, and the one
disputed finding was settled by the reviewer against the spec's own declared grammar
rather than by the implementer's assertion. Nothing blocks.
