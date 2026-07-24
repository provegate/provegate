# §11 per-FR machine-checkable gate — SPEC (wave 2)

The mechanism that turns "gate passes when the check returns 0" into something real: every
Functional Requirement (FR) in a spec carries at least one **runnable verification
command**, and a phase cannot pass until every one of them exits 0 in a real environment.

Grounded against Emofy's `scripts/prd-command-safety.mjs` (parser + safety SSOT),
`scripts/prd-autorun.mjs` (runner), and `scripts/verify-prd-ready.mjs` (static lint).

---

## 1. Invariant

> Each FR declares ≥1 runnable command. The parser extracts only plain, allowlisted
> commands from a well-marked location; the runner executes each; the phase passes **only
> when every command exits 0**. A command that isn't safely parseable makes the runner
> **STOP and hand back** — it never silently skips and never false-greens.

The two non-negotiables: (a) an unimplemented FR must not be able to pass (absence is a
failure, §5); (b) arbitrary shell must not be executable from a spec file (safety, §3).

---

## 2. Spec format — where the command lives

The per-FR command is a **markdown table row** whose first cell is `FR-<digits>`, carrying
the command as a backtick code-span:

```markdown
## 11. Verification Commands

| FR   | Command / Check              | Scope | Notes |
| ---- | ---------------------------- | ----- | ----- |
| FR-1 | `npm run test -- auth.spec`  |       |       |
| FR-2 | `node scripts/check-x.mjs`   |       |       |
```

Rules (enforced by the static lint, §4):
- Every FR declared in the requirements section (Emofy: bold `**FR-N**` in §4) must have
  ≥1 covered §11 row.
- A row is *covered* only if it starts with `| FR-N` **and** contains a runnable command
  (a backtick span starting with an allowlisted token, §3).
- Below the table: baseline commands every change runs (type-check, lint, test, build) and
  any **hard-cap** named tests (see `02` practice 08 — a named required test that forces
  ITERATE regardless of score).

See `templates/prd-section-11.md` and `templates/prd-sections-aux.md`.

---

## 3. Parser + safety filter (the core)

Both the runner and the static lint must call **one shared module** so they cannot drift.
(Cautionary note: the originating implementation shared only the safety dry-run; its
per-FR *coverage* check used a second, locally duplicated prefix regex that had already
drifted — case-insensitive where the parser is case-sensitive, so an upper-cased runner
name counted as covered at readiness but was dropped at run time. Provegate must derive
coverage from the shared parser's output, not from a second regex.) Two functions:

### `parseVerificationCommands(content)`
1. Slice the §11 section: match the heading `^##\s+.*Verification Commands.*$` (case-insensitive,
   multiline), take everything up to the next `^##\s+`. Only this body is scanned.
2. Per line, skip unless it matches `^\s*\|\s*FR-\d+\b` — **only `| FR-N` table rows**.
3. Extract **every** backtick span on the row: `/`([^`]+)`/g`.
4. Keep a span as a command only if it matches the **runnable-prefix allowlist**:
   `RUNNABLE_PREFIX = /^(npm |node |tsx |vitest |playwright |psql |curl |test |grep )/`
   (Emofy uses `pnpm`; provegate substitutes its own exec/test tools).
5. Dedupe by literal command string.

### `isSafeCommand(cmd)` — returns false (→ runner STOPs) when:
- the command contains any of `` ` ``, `$`, `>`, `<`, `$(`, or `git push`
  (`/[`$><]|\$\(|\bgit\s+push\b/`); **or**
- splitting on `&&`, `||`, `;`, **or a single `|`** yields any segment that is **not**
  runnable-prefixed. (A single `|` is deliberately treated as a shell pipe.)

Why the allowlist + segment rule is the whole safety story: a spec file is untrusted input
to the runner. Only commands that start with a known tool and chain only known tools can
run; anything else is refused, not executed.

---

## 4. Static lint at readiness (Phase 2, before any execution)

`verify:prd-ready` dry-runs the same parser so problems surface *before* the runner:
- FR set = the requirements declared in §4; each must have a covered §11 row, else
  `FR-N: no Verification Command row in §11 with a runnable backticked command`.
- It runs `isSafeCommand` over every §11 command and flags any unsafe one as "the runner
  would STOP here" — so an unsafe command fails readiness at Phase 2, not at execution.
- Keep ALL prefix checks reading the one shared allowlist. (The origin system grew a
  *third* copy in a coarse section-level scan that had lost `test ` and `grep ` — a §11
  composed only of `test -f`/`grep` rows false-failed readiness there.)

This is the "shift-left" half: the gate that will run the commands, and the gate that
admits the spec into execution, share the parser.

---

## 5. Runner + gate contract (Phase 5)

- `parseVerificationCommands(spec)` → the Phase-5 command set.
- Per command: if `!isSafeCommand` → **STOP + hand back** ("unsafe command refused"); else
  execute (`execSync`, inherit stdio, repo root). **Pass = exit 0.** Any non-zero throw →
  record FAILED, STOP + hand back, **worktree left intact** for the human.
- **Empty per-FR set is itself a failure:** if a phase parses zero runnable `| FR-N`
  commands → STOP ("no runnable §11 commands parsed — spec gap"). A spec cannot pass by
  having no checks.
- Gate-contract wording (put in `WORKFLOW.md`): *"Phase 5 passes only when every spec §11
  FR command exits 0 in a real environment; `verify:prd-ready` dry-runs §11 safety at
  Phase 2."*
- The runner never pushes; on success it merges to a **local** integration branch and
  prints "ready to push — run `git push` yourself" (see `02` practice 02).

---

## 6. Failure modes (why the design holds)

| Failure mode | How the mechanism handles it |
|---|---|
| **Missing file → false green** | `test -f` / `grep pattern missingfile` exits non-zero → the runner throws → STOP. `\|\| true` masking is blocked because `true` isn't runnable-prefixed → the whole command is refused as unsafe. (seed `false-green-on-missing-file`) |
| **`\|` in a grep pattern** | `isSafeCommand` splits on a single `\|` and treats it as a pipe → the pattern's second half isn't runnable-prefixed → refused. Author must avoid `\|` alternation in a §11 grep (use separate rows or an assert script). (seed `grep-token-anchors-real-impl`) |
| **Negation (`! grep …`)** | `! ` fails the runnable-prefix allowlist → the span is silently dropped and never counted as coverage. Content-negation is *inexpressible* in a §11 row → the author points the FR at a dedicated assert-absent script. (Carve-out: *file* absence IS expressible in-row as `test ! -f path` — the `test ` prefix is allowlisted.) (seed `absence-must-be-asserted`) |
| **Backtick command in the Notes column** | The parser extracts backtick spans from the *entire* row, so a runnable command placed in Scope/Notes **also executes**. Real hazard, unguarded in Emofy. (seed `notes-column-runs-commands`) |

---

## 7. Improvements provegate should make over Emofy

1. **Scope the parser to the Command column only.** Emofy runs backtick commands from any
   column of the FR row (§6, last row). provegate should parse the command from a single
   designated column (e.g. the 2nd cell), so a backticked example in Notes can't become a
   gate command. (seed `notes-column-runs-commands`)
2. **Emit an explicit "0 commands parsed" reason at readiness too**, not only at run time,
   so a spec-gap is caught in Phase 2.
3. **Document the `|`-is-a-pipe and negation-is-inexpressible constraints in the spec
   template itself**, next to the §11 table, so authors don't discover them at run time.
4. **Never silently drop an unclassifiable span.** Count every backtick span on an FR row;
   any span that is neither classified runnable nor annotated as non-command fails the
   readiness lint (or is at minimum reported per-row). The "zero commands parsed" guard
   catches the fully-empty case; this closes the partially-dropped one. (seed
   `unparseable-command-must-fail-loudly`)

---

## 8. De-emofy notes

- `pnpm` → provegate's package runner; replace the `RUNNABLE_PREFIX` allowlist with
  provegate's real exec/test tools (`npm`/`node`/`pytest`/`go test`/…). The allowlist is
  the security boundary — keep it tight.
- Drop the `ENFORCE_FROM_PRD = 248` floor (Emofy changelog), the `test-hardening`-class
  skip if provegate doesn't have classes yet, and the Turkish template prose.
- The FR marker (`**FR-N**` in requirements, `| FR-N` in §11) is a clean generic convention
  — keep it, or pick your own marker, but keep parser and lint reading the **same** marker
  from the **same** shared module.
